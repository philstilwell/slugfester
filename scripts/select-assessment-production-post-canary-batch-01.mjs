#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-01";
const SELECTION = `${ROOT}/selection.json`;
const ANALYSIS = `${ROOT}/selection-analysis.json`;
const POLICY = "docs/assessment-production/post-canary-continuation-v1/continuation-policy-v1/selection-policy.json";
const POLICY_ANALYSIS = "docs/assessment-production/post-canary-continuation-v1/continuation-policy-v1/analysis.json";
const OVERLAY = "docs/assessment-production/post-canary-continuation-v1/continuation-policy-v1/effective-source-overlay.json";
const MANIFEST = "docs/assessment-production/manifest-v1.json";
const WORKFLOW = "docs/assessment-production-workflow.md";
const SCORE_POLICY = "docs/assessment-production/score-stability-policy-v2.2-proposal.md";
const SCORE_PROMOTION = "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const SCRIPT = "scripts/select-assessment-production-post-canary-batch-01.mjs";
const TEST = "scripts/test-assessment-production-post-canary-batch-01-selection.mjs";
const FUTURE_SOURCE_PREPARATION = `${ROOT}/source-preparation/preparation-manifest.json`;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const serializedJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

if (shouldWrite) for (const file of [SELECTION, ANALYSIS]) assertV4(!(await exists(file)), `${file}: immutable selection artifact already exists`);
assertV4(!(await exists(FUTURE_SOURCE_PREPARATION)), "source preparation already exists before batch selection");

const controlPaths = [POLICY, POLICY_ANALYSIS, OVERLAY, MANIFEST, WORKFLOW, SCORE_POLICY, SCORE_PROMOTION, SCRIPT, TEST];
const controlEntries = await Promise.all(controlPaths.map(async (file) => [file, await readFile(file)]));
const controlBytes = Object.fromEntries(controlEntries);
const sourceHashes = Object.fromEntries(controlEntries.map(([file, bytes]) => [file, sha256(bytes)]));
const policy = JSON.parse(controlBytes[POLICY]);
const policyAnalysis = JSON.parse(controlBytes[POLICY_ANALYSIS]);
const overlay = JSON.parse(controlBytes[OVERLAY]);
const manifest = JSON.parse(controlBytes[MANIFEST]);
const promotion = JSON.parse(controlBytes[SCORE_PROMOTION]);

assertV4(
  policy.status === "post-canary-full-campaign-selection-policy-frozen-awaiting-separate-first-batch-selection-decision" &&
    policyAnalysis.status === "post-repair-source-overlay-and-full-campaign-selection-policy-analysis-passed" &&
    policy.effectiveSourceOverlay.sha256 === sha256(controlBytes[OVERLAY]) &&
    overlay.status === "three-debate-effective-source-overlay-frozen-and-verified" &&
    overlay.verification.effectiveSourceFilesVerified === 585 &&
    overlay.verification.remainingCanonicalEventDebatesPassed === 164 &&
    policy.reconciledCorpus.remainingPendingDyadic.length === 164 &&
    policy.batchingPolicy.standardBatchSize === 10 &&
    policy.batchingPolicy.firstPostCanaryBatchNumber === 1 &&
    policy.deterministicOrdering.materializeRanksInThisPlanningGate === false &&
    policy.selectionExecutionContract.requiresSeparateUserDecision === true &&
    policy.authorization.batchSelection === false &&
    promotion.status === "active-production-score-stability-policy-v2.2" &&
    promotion.activePolicy.version === "v2.2" &&
    sha256(controlBytes[SCORE_POLICY]) === policy.deterministicOrdering.normativeTextSha256 &&
    sha256(controlBytes[SCORE_PROMOTION]) === policy.deterministicOrdering.promotionRecordSha256,
  "first post-canary batch selection is not authorized by the frozen policy"
);
for (const [file, expected] of Object.entries(policy.sourceHashes)) assertV4(sha256(await readFile(file)) === expected, `${file}: frozen continuation-policy source drifted`);

const manifestByNumber = new Map(manifest.items.map((item) => [item.debateNumber, item]));
const overlayByNumber = new Map(overlay.overlays.map((item) => [item.debateNumber, item.effectiveSourceChain]));
const rankDomain = policy.deterministicOrdering.rankDomain;
const ranked = policy.reconciledCorpus.remainingPendingDyadic.map((debateNumber) => {
  const item = manifestByNumber.get(debateNumber);
  assertV4(item?.speakerCount === 2 && item.disposition === "pending-reassessment" && item.acceptedCalibration === null, `Debate ${debateNumber}: eligibility drifted`);
  return {
    debateNumber,
    debateId: item.debateId,
    rankSha256: sha256(`${rankDomain}|${policy.deterministicOrdering.normativeTextSha256}|${policy.deterministicOrdering.promotionRecordSha256}|${item.debateNumber}|${item.debateId}`)
  };
}).sort((left, right) => left.rankSha256.localeCompare(right.rankSha256) || left.debateNumber.localeCompare(right.debateNumber));
assertV4(ranked.length === 164 && new Set(ranked.map((item) => item.rankSha256)).size === 164, "stable remaining-debate rank is invalid");

const selected = [];
let totalEvents = 0;
let totalDurationMs = 0;
for (const rankedItem of ranked.slice(0, policy.batchingPolicy.standardBatchSize)) {
  const item = manifestByNumber.get(rankedItem.debateNumber);
  const sourceChain = structuredClone(overlayByNumber.get(item.debateNumber) ?? item.sourceChain);
  const [transcriptBytes, eventsBytes, manifestBytes] = await Promise.all([
    readFile(sourceChain.transcript),
    readFile(sourceChain.events),
    readFile(sourceChain.manifest)
  ]);
  assertV4(
    sha256(transcriptBytes) === sourceChain.transcriptSha256 &&
      sha256(eventsBytes) === sourceChain.eventsSha256 &&
      sha256(manifestBytes) === sourceChain.manifestSha256,
    `Debate ${item.debateNumber}: selected effective source hash mismatch`
  );
  const events = normalizeV418Events(JSON.parse(eventsBytes));
  assertV4(events.length > 0, `Debate ${item.debateNumber}: selected source has no canonical events`);
  const localManifest = JSON.parse(manifestBytes);
  assertV4(
    localManifest.normalizedEventsSha256 === sourceChain.eventsSha256 &&
      localManifest.transcriptSha256 === sourceChain.transcriptSha256 &&
      localManifest.eventCount === events.length,
    `Debate ${item.debateNumber}: selected local-manifest chain mismatch`
  );
  const durationMs = Math.max(...events.map((event) => event.startMs + event.durationMs));
  totalEvents += events.length;
  totalDurationMs += durationMs;
  sourceHashes[sourceChain.transcript] = sha256(transcriptBytes);
  sourceHashes[sourceChain.events] = sha256(eventsBytes);
  sourceHashes[sourceChain.manifest] = sha256(manifestBytes);
  selected.push({
    debateNumber: item.debateNumber,
    debateId: item.debateId,
    videoId: item.videoId,
    motion: item.motion,
    sides: structuredClone(item.sides),
    speakerCount: item.speakerCount,
    rankSha256: rankedItem.rankSha256,
    eventCount: events.length,
    durationSeconds: Number((durationMs / 1000).toFixed(3)),
    sourceChain,
    sourceChainOverlayApplied: overlayByNumber.has(item.debateNumber),
    sourceGate: {
      transcriptPresentAndHashMatched: true,
      eventsPresentAndHashMatched: true,
      localManifestPresentAndHashMatched: true,
      localManifestHashChainPassed: true,
      canonicalEventProjectionNonempty: true
    }
  });
}
assertV4(selected.length === 10 && new Set(selected.map((item) => item.debateNumber)).size === 10, "first post-canary batch did not select ten unique debates");

const selection = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-selection",
  protocolId: "assessment-production-post-canary-batch-01",
  status: "first-post-canary-ten-debate-batch-selection-frozen-source-gate-passed",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  branch: "main",
  productionContinuation: true,
  developmentValidationOnly: false,
  stagingOnly: true,
  batchNumber: 1,
  productionSequenceOrdinal: 2,
  userAuthorization: {
    instruction: "Let's do that. Continue.",
    scopeInterpretation: "Materialize and source-validate only the first ten-debate post-canary batch under the frozen continuation policy. Do not prepare source or model packets, execute models, derive scores, reconstruct publication prose, promote accepted calibration debates, or mutate production.",
    directIncrementalCostEstimateUsd: 0
  },
  policyLocks: {
    selectionPolicy: { path: POLICY, bytes: controlBytes[POLICY].byteLength, sha256: sha256(controlBytes[POLICY]), status: policy.status },
    policyAnalysis: { path: POLICY_ANALYSIS, bytes: controlBytes[POLICY_ANALYSIS].byteLength, sha256: sha256(controlBytes[POLICY_ANALYSIS]), status: policyAnalysis.status },
    effectiveSourceOverlay: { path: OVERLAY, bytes: controlBytes[OVERLAY].byteLength, sha256: sha256(controlBytes[OVERLAY]), status: overlay.status }
  },
  eligibility: {
    censusSize: 164,
    rankedCensusSize: ranked.length,
    fullRankedCensusSha256: sha256(serializedJson(ranked)),
    selectedCount: selected.length,
    remainingUnselectedCount: ranked.length - selected.length,
    dyadicOnly: true,
    acceptedCalibrationExcluded: true,
    publishedCanaryExcluded: true,
    multiSpeakerExcluded: true,
    priorObservationExcluded: false
  },
  deterministicOrdering: {
    rankDomain,
    rankFormula: policy.deterministicOrdering.rankFormula,
    normativeTextSha256: policy.deterministicOrdering.normativeTextSha256,
    promotionRecordSha256: policy.deterministicOrdering.promotionRecordSha256,
    firstTenSelectedWithoutReplacement: true,
    replacementsAllowed: false,
    resultDependentOrdering: false
  },
  selected,
  sourceGate: {
    selectedDebatesChecked: 10,
    selectedSourceFilesChecked: 30,
    selectedSourceFilesHashMatched: 30,
    canonicalEventDebatesPassed: 10,
    canonicalEventDebatesFailed: 0,
    overlayDebatesSelected: selected.filter((item) => item.sourceChainOverlayApplied).map((item) => item.debateNumber),
    transcriptContentSemanticallyInspected: false,
    legacyAssessmentAccessed: false,
    scoreAccessed: false,
    winnerAccessed: false,
    priorModelOutputAccessed: false
  },
  modelBoundary: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    scoreBlind: true,
    apiKeysRemovedWhenModelsEventuallyRun: true,
    roundedIntegerScoreTiesPermitted: true,
    modelContextsExecuted: 0
  },
  stageConcurrency: structuredClone(policy.stageConcurrency),
  stopRules: {
    selectionHashMismatchBlocks: true,
    policyOrOverlayHashMismatchBlocks: true,
    sourceHashMismatchBlocksWholeBatch: true,
    canonicalEventFailureBlocksWholeBatch: true,
    speakerCountAmbiguityBlocksWholeBatch: true,
    replacementSelectionBlocks: true,
    sourcePacketPreparationBeforeSeparateDecisionBlocks: true,
    modelExecutionBlocks: true,
    scoreDerivationBlocks: true,
    publicationReconstructionBlocks: true,
    acceptedCalibrationPromotionBlocks: true,
    productionMutationBlocks: true,
    concurrentBatchSelectionBlocks: true,
    paidServiceUseBlocks: true
  },
  sourceHashes,
  totals: {
    selectedDebates: selected.length,
    eventCount: totalEvents,
    durationHours: Number((totalDurationMs / 3_600_000).toFixed(3)),
    sourcePacketsPrepared: 0,
    modelContexts: 0,
    scorePasses: 0,
    publicationContexts: 0,
    productionMutations: 0,
    meteredApiCostUsd: 0
  },
  authorization: {
    batchSelectionPreparation: true,
    batchSelection: true,
    sourcePacketPreparation: false,
    discoveryModelExecution: false,
    inventoryModelExecution: false,
    independentJudgmentModelExecution: false,
    audioModelExecution: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    acceptedCalibrationPromotion: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  futureArtifacts: { sourcePreparation: FUTURE_SOURCE_PREPARATION },
  nextAuthorizedAction: "user-decision-on-first-post-canary-batch-source-packet-preparation"
};
const selectionBytes = Buffer.from(serializedJson(selection));
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-selection-analysis",
  protocolId: selection.protocolId,
  status: "first-post-canary-batch-selection-analysis-passed-awaiting-source-packet-preparation-decision",
  analyzedAt: frozenAt,
  selection: { path: SELECTION, bytes: selectionBytes.byteLength, sha256: sha256(selectionBytes), status: selection.status },
  selectedDebates: selected.map(({ debateNumber, debateId, rankSha256 }) => ({ debateNumber, debateId, rankSha256 })),
  finding: "The frozen full-campaign policy deterministically selected ten unique pending dyadic debates; all thirty effective source files and all ten canonical event chains passed without replacement.",
  decision: {
    deterministicSelectionPassed: true,
    selectedSourceGatePassed: true,
    replacementsUsed: 0,
    sourcePacketPreparationAttempted: false,
    modelExecutionAttempted: false,
    productionMutationAttempted: false
  },
  nextAuthorizedAction: selection.nextAuthorizedAction
};

if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(SELECTION, selectionBytes);
  await writeFile(ANALYSIS, serializedJson(analysis));
}
console.log(JSON.stringify({
  status: shouldWrite ? selection.status : "preview",
  selectedDebates: selected.map((item) => item.debateNumber),
  selectedSourceFiles: 30,
  canonicalEventDebatesPassed: 10,
  replacements: 0,
  sourcePacketsPrepared: 0,
  modelContexts: 0,
  directCostUsd: 0,
  nextAuthorizedAction: selection.nextAuthorizedAction
}, null, 2));
