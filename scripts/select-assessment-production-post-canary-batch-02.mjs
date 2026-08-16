#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const shouldEmitArtifacts = process.argv.includes("--emit-artifacts");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
assertV4(!(shouldWrite && shouldEmitArtifacts), "--write and --emit-artifacts are mutually exclusive");

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-02";
const SELECTION = `${ROOT}/selection.json`;
const ANALYSIS = `${ROOT}/selection-analysis.json`;
const POLICY = "docs/assessment-production/post-canary-continuation-v1/continuation-policy-v1/selection-policy.json";
const POLICY_ANALYSIS = "docs/assessment-production/post-canary-continuation-v1/continuation-policy-v1/analysis.json";
const OVERLAY = "docs/assessment-production/post-canary-continuation-v1/continuation-policy-v1/effective-source-overlay.json";
const MANIFEST = "docs/assessment-production/manifest-v1.json";
const WORKFLOW = "docs/assessment-production-workflow.md";
const SCORE_POLICY = "docs/assessment-production/score-stability-policy-v2.2-proposal.md";
const SCORE_PROMOTION = "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const PRIOR_SELECTION = "docs/assessment-production/post-canary-continuation-v1/batch-01/selection.json";
const PRIOR_SELECTION_ANALYSIS = "docs/assessment-production/post-canary-continuation-v1/batch-01/selection-analysis.json";
const PRIOR_COMPLETION_EXECUTION = "docs/assessment-production/post-canary-continuation-v1/batch-01/production-publication/generated-seo-correction/correction-2/execution.json";
const PRIOR_COMPLETION_ANALYSIS = "docs/assessment-production/post-canary-continuation-v1/batch-01/production-publication/generated-seo-correction/correction-2/analysis.json";
const PRIOR_COMPLETION_COMMIT = "1e4408ccc6ef8b8586e66c8b95b566a6b1117fc1";
const SCRIPT = "scripts/select-assessment-production-post-canary-batch-02.mjs";
const TEST = "scripts/test-assessment-production-post-canary-batch-02-selection.mjs";
const FUTURE_SOURCE_PREPARATION = `${ROOT}/source-preparation/preparation-manifest.json`;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const serializedJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

if (shouldWrite) {
  for (const file of [SELECTION, ANALYSIS]) {
    assertV4(!(await exists(file)), `${file}: immutable selection artifact already exists`);
  }
}
assertV4(!(await exists(FUTURE_SOURCE_PREPARATION)), "source preparation already exists before Batch 2 selection");

const controlPaths = [
  POLICY,
  POLICY_ANALYSIS,
  OVERLAY,
  MANIFEST,
  WORKFLOW,
  SCORE_POLICY,
  SCORE_PROMOTION,
  PRIOR_SELECTION,
  PRIOR_SELECTION_ANALYSIS,
  PRIOR_COMPLETION_EXECUTION,
  PRIOR_COMPLETION_ANALYSIS,
  SCRIPT,
  TEST
];
const controlEntries = await Promise.all(controlPaths.map(async (file) => [file, await readFile(file)]));
const controlBytes = Object.fromEntries(controlEntries);
const sourceHashes = Object.fromEntries(controlEntries.map(([file, bytes]) => [file, sha256(bytes)]));
const policy = JSON.parse(controlBytes[POLICY]);
const policyAnalysis = JSON.parse(controlBytes[POLICY_ANALYSIS]);
const overlay = JSON.parse(controlBytes[OVERLAY]);
const manifest = JSON.parse(controlBytes[MANIFEST]);
const promotion = JSON.parse(controlBytes[SCORE_PROMOTION]);
const priorSelection = JSON.parse(controlBytes[PRIOR_SELECTION]);
const priorSelectionAnalysis = JSON.parse(controlBytes[PRIOR_SELECTION_ANALYSIS]);
const priorCompletionExecution = JSON.parse(controlBytes[PRIOR_COMPLETION_EXECUTION]);
const priorCompletionAnalysis = JSON.parse(controlBytes[PRIOR_COMPLETION_ANALYSIS]);

assertV4(
  policy.status === "post-canary-full-campaign-selection-policy-frozen-awaiting-separate-first-batch-selection-decision" &&
    policyAnalysis.status === "post-repair-source-overlay-and-full-campaign-selection-policy-analysis-passed" &&
    policy.effectiveSourceOverlay.sha256 === sha256(controlBytes[OVERLAY]) &&
    overlay.status === "three-debate-effective-source-overlay-frozen-and-verified" &&
    overlay.verification.effectiveSourceFilesVerified === 585 &&
    overlay.verification.remainingCanonicalEventDebatesPassed === 164 &&
    policy.reconciledCorpus.remainingPendingDyadic.length === 164 &&
    policy.batchingPolicy.standardBatchSize === 10 &&
    policy.batchingPolicy.nextBatchSelectionBeforePriorBatchPublicationAllowed === false &&
    policy.batchingPolicy.successfulProductionPublicationRequiredBeforeRemovingDebateFromRemainingPool === true &&
    policy.deterministicOrdering.resultDependentReorderingAllowed === false &&
    policy.selectionExecutionContract.noModelContexts === true &&
    policy.selectionExecutionContract.noPaidServices === true &&
    promotion.status === "active-production-score-stability-policy-v2.2" &&
    promotion.activePolicy.version === "v2.2" &&
    sha256(controlBytes[SCORE_POLICY]) === policy.deterministicOrdering.normativeTextSha256 &&
    sha256(controlBytes[SCORE_PROMOTION]) === policy.deterministicOrdering.promotionRecordSha256,
  "Batch 2 selection is not compatible with the frozen continuation policy"
);
for (const [file, expected] of Object.entries(policy.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === expected, `${file}: frozen continuation-policy source drifted`);
}

const priorSelectedNumbers = priorSelection.selected.map((item) => item.debateNumber);
assertV4(
  priorSelection.status === "first-post-canary-ten-debate-batch-selection-frozen-source-gate-passed" &&
    priorSelection.batchNumber === 1 &&
    priorSelection.selected.length === 10 &&
    priorSelectionAnalysis.status === "first-post-canary-batch-selection-analysis-passed-awaiting-source-packet-preparation-decision" &&
    priorSelectionAnalysis.selection.sha256 === sha256(controlBytes[PRIOR_SELECTION]) &&
    priorCompletionExecution.status === "passed-complete-batch-01-transaction-ready-for-atomic-commit" &&
    priorCompletionExecution.validation.completed === true &&
    priorCompletionExecution.validation.exitCode === 0 &&
    priorCompletionExecution.validation.fullRepositoryRegressionPassed === true &&
    priorCompletionExecution.acceptedTransaction.atomicCommitRequired === true &&
    priorCompletionAnalysis.status === "batch-01-production-publication-accepted-for-atomic-commit-after-generated-seo-correction-2" &&
    priorCompletionAnalysis.execution.sha256 === sha256(controlBytes[PRIOR_COMPLETION_EXECUTION]) &&
    priorCompletionAnalysis.decision.batch01ProductionPublicationGatePassed === true &&
    priorCompletionAnalysis.decision.completeTransactionAccepted === true &&
    priorCompletionAnalysis.validation.exitCode === 0 &&
    priorCompletionAnalysis.validation.fullRepositoryRegressionPassed === true &&
    JSON.stringify(priorCompletionAnalysis.batch01ProductionPublication.debates) === JSON.stringify(priorSelectedNumbers),
  "Batch 1 has not satisfied the frozen successful-publication prerequisite"
);
assertV4(git("rev-parse", "--abbrev-ref", "HEAD") === "main", "Batch 2 selection must run on main");
assertV4(git("rev-parse", "HEAD") === PRIOR_COMPLETION_COMMIT, "Batch 2 selection checkpoint is not the exact Batch 1 publication commit");
assertV4(git("rev-parse", "origin/main") === PRIOR_COMPLETION_COMMIT, "Batch 1 publication commit is not the pushed origin/main checkpoint");
execFileSync("git", ["merge-base", "--is-ancestor", PRIOR_COMPLETION_COMMIT, "HEAD"]);

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
assertV4(
  JSON.stringify(priorSelectedNumbers) === JSON.stringify(ranked.slice(0, 10).map((item) => item.debateNumber)),
  "Batch 1 is not the immutable first rank slice"
);

const selected = [];
let totalEvents = 0;
let totalDurationMs = 0;
for (const [offset, rankedItem] of ranked.slice(10, 20).entries()) {
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
    rankOrdinal: offset + 11,
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
assertV4(selected.length === 10 && new Set(selected.map((item) => item.debateNumber)).size === 10, "Batch 2 did not select ten unique debates");

const checkpointCommit = git("rev-parse", "HEAD");
const selection = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-selection",
  protocolId: "assessment-production-post-canary-batch-02",
  status: "second-post-canary-ten-debate-batch-selection-frozen-source-gate-passed",
  frozenAt,
  checkpointCommit,
  branch: "main",
  productionContinuation: true,
  developmentValidationOnly: false,
  stagingOnly: true,
  batchNumber: 2,
  productionSequenceOrdinal: 3,
  userAuthorization: {
    instruction: "I approve.",
    scopeInterpretation: "Materialize and source-validate only Batch 2 under the frozen continuation policy after authenticating successful Batch 1 publication. Do not prepare source or model packets, execute models, derive scores, reconstruct publication prose, mutate production, or select Batch 3.",
    directIncrementalCostEstimateUsd: 0
  },
  policyLocks: {
    selectionPolicy: { path: POLICY, bytes: controlBytes[POLICY].byteLength, sha256: sha256(controlBytes[POLICY]), status: policy.status },
    policyAnalysis: { path: POLICY_ANALYSIS, bytes: controlBytes[POLICY_ANALYSIS].byteLength, sha256: sha256(controlBytes[POLICY_ANALYSIS]), status: policyAnalysis.status },
    effectiveSourceOverlay: { path: OVERLAY, bytes: controlBytes[OVERLAY].byteLength, sha256: sha256(controlBytes[OVERLAY]), status: overlay.status }
  },
  priorBatchPublicationPrerequisite: {
    required: true,
    batchNumber: 1,
    selection: { path: PRIOR_SELECTION, bytes: controlBytes[PRIOR_SELECTION].byteLength, sha256: sha256(controlBytes[PRIOR_SELECTION]), status: priorSelection.status },
    completionExecution: { path: PRIOR_COMPLETION_EXECUTION, bytes: controlBytes[PRIOR_COMPLETION_EXECUTION].byteLength, sha256: sha256(controlBytes[PRIOR_COMPLETION_EXECUTION]), status: priorCompletionExecution.status },
    completionAnalysis: { path: PRIOR_COMPLETION_ANALYSIS, bytes: controlBytes[PRIOR_COMPLETION_ANALYSIS].byteLength, sha256: sha256(controlBytes[PRIOR_COMPLETION_ANALYSIS]), status: priorCompletionAnalysis.status },
    atomicPublicationCommit: PRIOR_COMPLETION_COMMIT,
    atomicPublicationCommitWasHead: checkpointCommit === PRIOR_COMPLETION_COMMIT,
    atomicPublicationCommitWasPushedOriginMain: true,
    completeTransactionAccepted: true,
    fullRepositoryRegressionPassed: true,
    publishedDebates: priorSelectedNumbers
  },
  eligibility: {
    frozenCensusSize: 164,
    rankedCensusSize: ranked.length,
    fullRankedCensusSha256: sha256(serializedJson(ranked)),
    previouslyPublishedAndRemovedCount: 10,
    remainingBeforeBatchCount: ranked.length - 10,
    remainingBeforeBatchRankedSha256: sha256(serializedJson(ranked.slice(10))),
    selectedCount: selected.length,
    remainingUnselectedCount: ranked.length - 20,
    dyadicOnly: true,
    acceptedCalibrationExcluded: true,
    publishedCanaryExcluded: true,
    publishedPriorContinuationBatchesExcluded: true,
    multiSpeakerExcluded: true,
    priorObservationExcluded: false
  },
  deterministicOrdering: {
    rankDomain,
    rankFormula: policy.deterministicOrdering.rankFormula,
    normativeTextSha256: policy.deterministicOrdering.normativeTextSha256,
    promotionRecordSha256: policy.deterministicOrdering.promotionRecordSha256,
    selectedRankOrdinals: [11, 20],
    firstTenRemainingSelectedWithoutReplacement: true,
    priorPublishedBatchRemovedWithoutReplacement: true,
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
    priorBatchPublicationFailureBlocks: true,
    priorBatchCommitOrPushMismatchBlocks: true,
    stableRankMismatchBlocks: true,
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
    nextBatchSelectionBlocks: true,
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
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
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
  nextAuthorizedAction: "user-decision-on-second-post-canary-batch-source-packet-preparation"
};
const selectionBytes = Buffer.from(serializedJson(selection));
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-selection-analysis",
  protocolId: selection.protocolId,
  status: "second-post-canary-batch-selection-analysis-passed-awaiting-source-packet-preparation-decision",
  analyzedAt: frozenAt,
  selection: { path: SELECTION, bytes: selectionBytes.byteLength, sha256: sha256(selectionBytes), status: selection.status },
  priorBatchPublication: {
    batchNumber: 1,
    atomicCommit: PRIOR_COMPLETION_COMMIT,
    completionExecutionSha256: sha256(controlBytes[PRIOR_COMPLETION_EXECUTION]),
    completionAnalysisSha256: sha256(controlBytes[PRIOR_COMPLETION_ANALYSIS]),
    accepted: true
  },
  selectedDebates: selected.map(({ debateNumber, debateId, rankOrdinal, rankSha256 }) => ({ debateNumber, debateId, rankOrdinal, rankSha256 })),
  finding: "Successful Batch 1 production publication was authenticated at the pushed atomic commit. The immutable campaign rank then selected ordinals 11 through 20 as ten unique pending dyadic debates, and all thirty effective source files and ten canonical event chains passed without replacement.",
  decision: {
    priorBatchPublicationPrerequisitePassed: true,
    deterministicSelectionPassed: true,
    selectedSourceGatePassed: true,
    replacementsUsed: 0,
    sourcePacketPreparationAttempted: false,
    modelExecutionAttempted: false,
    paidServiceUsed: false,
    productionMutationAttempted: false,
    nextBatchSelectionAttempted: false
  },
  nextAuthorizedAction: selection.nextAuthorizedAction
};
const analysisBytes = Buffer.from(serializedJson(analysis));

if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(SELECTION, selectionBytes);
  await writeFile(ANALYSIS, analysisBytes);
}
if (shouldEmitArtifacts) {
  console.log(JSON.stringify({
    selectionPath: SELECTION,
    selectionText: selectionBytes.toString("utf8"),
    analysisPath: ANALYSIS,
    analysisText: analysisBytes.toString("utf8")
  }));
} else {
  console.log(JSON.stringify({
    status: shouldWrite ? selection.status : "preview",
    priorBatchPublicationCommit: PRIOR_COMPLETION_COMMIT,
    selectedDebates: selected.map((item) => item.debateNumber),
    selectedRankOrdinals: [11, 20],
    selectedSourceFiles: 30,
    canonicalEventDebatesPassed: 10,
    replacements: 0,
    sourcePacketsPrepared: 0,
    modelContexts: 0,
    paidServiceCalls: 0,
    directCostUsd: 0,
    nextAuthorizedAction: selection.nextAuthorizedAction
  }, null, 2));
}
