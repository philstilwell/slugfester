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

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-10";
const SELECTION = `${ROOT}/selection.json`;
const ANALYSIS = `${ROOT}/selection-analysis.json`;
const POLICY = "docs/assessment-production/post-canary-continuation-v1/continuation-policy-v1/selection-policy.json";
const POLICY_ANALYSIS = "docs/assessment-production/post-canary-continuation-v1/continuation-policy-v1/analysis.json";
const OVERLAY = "docs/assessment-production/post-canary-continuation-v1/continuation-policy-v1/effective-source-overlay.json";
const MANIFEST = "docs/assessment-production/manifest-v1.json";
const WORKFLOW = "docs/assessment-production-workflow.md";
const SCORE_POLICY = "docs/assessment-production/score-stability-policy-v2.2-proposal.md";
const SCORE_PROMOTION = "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const PRIOR_SELECTION = "docs/assessment-production/post-canary-continuation-v1/batch-09/selection.json";
const PRIOR_SELECTION_ANALYSIS = "docs/assessment-production/post-canary-continuation-v1/batch-09/selection-analysis.json";
const PRIOR_MUTATION_MANIFEST = "docs/assessment-production/post-canary-continuation-v1/batch-09/production-publication/mutation-manifest.json";
const PRIOR_COMPLETION_EXECUTION = "docs/assessment-production/post-canary-continuation-v1/batch-09/production-publication/generated-seo-correction/execution.json";
const PRIOR_COMPLETION_ANALYSIS = "docs/assessment-production/post-canary-continuation-v1/batch-09/production-publication/generated-seo-correction/analysis.json";
const PRIOR_COMPLETION_COMMIT = "ad85204c0ac32190633fcf60d87267f36f298e76";
const SCRIPT = "scripts/select-assessment-production-post-canary-batch-10.mjs";
const TEST = "scripts/test-assessment-production-post-canary-batch-10-selection.mjs";
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
assertV4(!(await exists(FUTURE_SOURCE_PREPARATION)), "source preparation already exists before Batch 10 selection");

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
  PRIOR_MUTATION_MANIFEST,
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
const priorMutationManifest = JSON.parse(controlBytes[PRIOR_MUTATION_MANIFEST]);
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
  "Batch 10 selection is not compatible with the frozen continuation policy"
);
for (const [file, expected] of Object.entries(policy.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === expected, `${file}: frozen continuation-policy source drifted`);
}

const priorSelectedNumbers = priorSelection.selected.map((item) => item.debateNumber);
assertV4(
  priorSelection.status === "ninth-post-canary-ten-debate-batch-selection-frozen-source-gate-passed" &&
    priorSelection.protocolId === "assessment-production-post-canary-batch-09" &&
    priorSelection.productionSequenceOrdinal === 10 &&
    priorSelection.selected.length === 10 &&
    priorSelectionAnalysis.status === "ninth-post-canary-batch-selection-analysis-passed-awaiting-standing-authorization" &&
    priorSelectionAnalysis.selection.sha256 === sha256(controlBytes[PRIOR_SELECTION]) &&
    priorMutationManifest.status === "frozen-batch-09-production-publication-mutation-manifest-prepared" &&
    JSON.stringify(priorMutationManifest.explicitOrder) === JSON.stringify(priorSelectedNumbers) &&
    priorCompletionExecution.status === "passed-complete-batch-09-transaction-ready-for-atomic-commit" &&
    priorCompletionExecution.totals.isolatedGeneratorRuns === 1 &&
    priorCompletionExecution.totals.repositoryValidationRuns === 1 &&
    priorCompletionExecution.totals.retries === 0 &&
    priorCompletionExecution.totals.reruns === 0 &&
    priorCompletionExecution.totals.productionMutationReruns === 0 &&
    priorCompletionExecution.totals.scorePasses === 0 &&
    priorCompletionExecution.totals.modelContexts === 0 &&
    priorCompletionExecution.totals.paidServiceCalls === 0 &&
    priorCompletionExecution.validation.runs === 1 &&
    priorCompletionExecution.validation.exitCode === 0 &&
    priorCompletionExecution.validation.completeRepositoryRegressionPassed === true &&
    priorCompletionExecution.productionTransaction.debatesPublished === 10 &&
    priorCompletionExecution.productionTransaction.productionLedgerFiles === 10 &&
    priorCompletionExecution.productionTransaction.referencesByteIdentical === true &&
    priorCompletionExecution.productionTransaction.validatorByteIdentical === true &&
    priorCompletionExecution.totals.generatedDerivativeWrites === 12 &&
    priorCompletionExecution.totals.unchangedGeneratedOutputs === 368 &&
    priorCompletionAnalysis.status === "batch-09-production-publication-accepted-for-atomic-commit-after-generated-seo-correction" &&
    priorCompletionAnalysis.execution.sha256 === sha256(controlBytes[PRIOR_COMPLETION_EXECUTION]) &&
    priorCompletionAnalysis.decision.generatedSeoCorrectionGatePassed === true &&
    priorCompletionAnalysis.decision.batch09ProductionPublicationGatePassed === true &&
    priorCompletionAnalysis.decision.singleCorrectionPassAccepted === true &&
    priorCompletionAnalysis.decision.generatorOutputCountPassed === true &&
    priorCompletionAnalysis.decision.pathSetDigestPassed === true &&
    priorCompletionAnalysis.decision.inventoryDigestPassed === true &&
    priorCompletionAnalysis.decision.proposedDerivativeHashesPassed === true &&
    priorCompletionAnalysis.decision.other368GeneratedOutputsPreserved === true &&
    priorCompletionAnalysis.decision.completeRepositoryValidationPassed === true &&
    priorCompletionAnalysis.decision.completeTransactionAccepted === true &&
    priorCompletionAnalysis.decision.atomicCommitAndPushAuthorized === true &&
    priorCompletionAnalysis.decision.retryPerformed === false &&
    priorCompletionAnalysis.decision.rerunPerformed === false &&
    priorCompletionAnalysis.decision.productionMutationRerunPerformed === false &&
    priorCompletionAnalysis.decision.scorePassPerformed === false &&
    priorCompletionAnalysis.decision.modelExecutionPerformed === false &&
    priorCompletionAnalysis.decision.paidServiceUsed === false &&
    priorCompletionAnalysis.decision.nextBatchSelected === false,
  "Batch 9 has not satisfied the frozen successful-publication prerequisite"
);
assertV4(git("rev-parse", "--abbrev-ref", "HEAD") === "main", "Batch 10 selection must run on main");
assertV4(git("rev-parse", "HEAD") === PRIOR_COMPLETION_COMMIT, "Batch 10 selection checkpoint is not the exact Batch 9 publication commit");
assertV4(git("rev-parse", "origin/main") === PRIOR_COMPLETION_COMMIT, "Batch 9 publication commit is not the pushed origin/main checkpoint");
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
  JSON.stringify(priorSelectedNumbers) === JSON.stringify(ranked.slice(80, 90).map((item) => item.debateNumber)),
  "Batch 9 is not the immutable ninth rank slice"
);

const selected = [];
let totalEvents = 0;
let totalDurationMs = 0;
for (const [offset, rankedItem] of ranked.slice(90, 100).entries()) {
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
    rankOrdinal: offset + 91,
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
assertV4(selected.length === 10 && new Set(selected.map((item) => item.debateNumber)).size === 10, "Batch 10 did not select ten unique debates");

const checkpointCommit = git("rev-parse", "HEAD");
const selection = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-selection",
  protocolId: "assessment-production-post-canary-batch-10",
  status: "tenth-post-canary-ten-debate-batch-selection-frozen-source-gate-passed",
  frozenAt,
  checkpointCommit,
  branch: "main",
  productionContinuation: true,
  developmentValidationOnly: false,
  stagingOnly: true,
  batchNumber: 10,
  productionSequenceOrdinal: 11,
  userAuthorization: {
    instruction: "I authorize Batch 10.",
    scopeInterpretation: "Materialize and source-validate only the deterministic Batch 10 selection under the frozen continuation policy after authenticating successful Batch 9 publication. This selection pass prepares no source packets, executes no models, derives no scores, and performs no production mutation.",
    directIncrementalCostEstimateUsd: 0
  },
  policyLocks: {
    selectionPolicy: { path: POLICY, bytes: controlBytes[POLICY].byteLength, sha256: sha256(controlBytes[POLICY]), status: policy.status },
    policyAnalysis: { path: POLICY_ANALYSIS, bytes: controlBytes[POLICY_ANALYSIS].byteLength, sha256: sha256(controlBytes[POLICY_ANALYSIS]), status: policyAnalysis.status },
    effectiveSourceOverlay: { path: OVERLAY, bytes: controlBytes[OVERLAY].byteLength, sha256: sha256(controlBytes[OVERLAY]), status: overlay.status }
  },
  priorBatchPublicationPrerequisite: {
    required: true,
    batchNumber: 9,
    selection: { path: PRIOR_SELECTION, bytes: controlBytes[PRIOR_SELECTION].byteLength, sha256: sha256(controlBytes[PRIOR_SELECTION]), status: priorSelection.status },
    completionExecution: { path: PRIOR_COMPLETION_EXECUTION, bytes: controlBytes[PRIOR_COMPLETION_EXECUTION].byteLength, sha256: sha256(controlBytes[PRIOR_COMPLETION_EXECUTION]), status: priorCompletionExecution.status },
    completionAnalysis: { path: PRIOR_COMPLETION_ANALYSIS, bytes: controlBytes[PRIOR_COMPLETION_ANALYSIS].byteLength, sha256: sha256(controlBytes[PRIOR_COMPLETION_ANALYSIS]), status: priorCompletionAnalysis.status },
    mutationManifest: { path: PRIOR_MUTATION_MANIFEST, bytes: controlBytes[PRIOR_MUTATION_MANIFEST].byteLength, sha256: sha256(controlBytes[PRIOR_MUTATION_MANIFEST]), status: priorMutationManifest.status },
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
    previouslyPublishedAndRemovedCount: 90,
    remainingBeforeBatchCount: ranked.length - 90,
    remainingBeforeBatchRankedSha256: sha256(serializedJson(ranked.slice(90))),
    selectedCount: selected.length,
    remainingUnselectedCount: ranked.length - 100,
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
    selectedRankOrdinals: [91, 100],
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
  nextAuthorizedAction: "prepare-batch-10-standing-authorization-and-source-packets-under-user-authorization"
};
const selectionBytes = Buffer.from(serializedJson(selection));
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-selection-analysis",
  protocolId: selection.protocolId,
  status: "tenth-post-canary-batch-selection-analysis-passed-awaiting-standing-authorization",
  analyzedAt: frozenAt,
  selection: { path: SELECTION, bytes: selectionBytes.byteLength, sha256: sha256(selectionBytes), status: selection.status },
  priorBatchPublication: {
    batchNumber: 9,
    atomicCommit: PRIOR_COMPLETION_COMMIT,
    completionExecutionSha256: sha256(controlBytes[PRIOR_COMPLETION_EXECUTION]),
    completionAnalysisSha256: sha256(controlBytes[PRIOR_COMPLETION_ANALYSIS]),
    accepted: true
  },
  selectedDebates: selected.map(({ debateNumber, debateId, rankOrdinal, rankSha256 }) => ({ debateNumber, debateId, rankOrdinal, rankSha256 })),
  finding: "Successful Batch 9 production publication was authenticated at the pushed atomic commit. The immutable campaign rank then selected ordinals 91 through 100 as ten unique pending dyadic debates, and all thirty effective source files and ten canonical event chains passed without replacement.",
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
    selectedRankOrdinals: [91, 100],
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
