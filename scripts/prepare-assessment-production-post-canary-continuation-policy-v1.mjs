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

const ROOT = "docs/assessment-production/post-canary-continuation-v1/continuation-policy-v1";
const OVERLAY = `${ROOT}/effective-source-overlay.json`;
const POLICY = `${ROOT}/selection-policy.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const FUTURE_SELECTION = "docs/assessment-production/post-canary-continuation-v1/batch-01/selection.json";
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const CORPUS_AUDIT = "docs/calibration/v2.1/corpus-transcript-audit.json";
const WORKFLOW = "docs/assessment-production-workflow.md";
const SCORE_POLICY = "docs/assessment-production/score-stability-policy-v2.2-proposal.md";
const SCORE_PROMOTION = "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const CANARY_SELECTION = "docs/assessment-production/production-checkpoint-v2.2-1/selection.json";
const CANARY_EXECUTION = "docs/assessment-production/production-checkpoint-v2.2-1/production-mutation/dependent-pilot-analysis-remedy/execution.json";
const PRIOR_PREPARATION = "docs/assessment-production/post-canary-continuation-v1/preparation-manifest.json";
const PRIOR_ANALYSIS = "docs/assessment-production/post-canary-continuation-v1/analysis.json";
const REPAIR_ACTIVATION = "docs/assessment-production/post-canary-continuation-v1/source-normalization-repair/execution-activation.json";
const REPAIR_EXECUTION = "docs/assessment-production/post-canary-continuation-v1/source-normalization-repair/execution.json";
const REPAIR_88 = "docs/assessment-production/post-canary-continuation-v1/source-normalization-repair/debate-088-repair-record.json";
const REPAIR_127 = "docs/assessment-production/post-canary-continuation-v1/source-normalization-repair/debate-127-repair-record.json";
const REPAIR_167 = "docs/assessment-production/source-repairs/debate-167-empty-event-normalization.json";
const SCRIPT = "scripts/prepare-assessment-production-post-canary-continuation-policy-v1.mjs";
const TEST = "scripts/test-assessment-production-post-canary-continuation-policy-v1.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const serializedJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const wordCount = (value) => value.split(/\s+/).filter(Boolean).length;

if (shouldWrite) {
  for (const file of [OVERLAY, POLICY, ANALYSIS]) assertV4(!(await exists(file)), `${file}: immutable artifact already exists`);
}
assertV4(!(await exists(FUTURE_SELECTION)), "future batch selection already exists");

const controlPaths = [
  PRODUCTION_MANIFEST,
  CORPUS_AUDIT,
  WORKFLOW,
  SCORE_POLICY,
  SCORE_PROMOTION,
  CANARY_SELECTION,
  CANARY_EXECUTION,
  PRIOR_PREPARATION,
  PRIOR_ANALYSIS,
  REPAIR_ACTIVATION,
  REPAIR_EXECUTION,
  REPAIR_88,
  REPAIR_127,
  REPAIR_167,
  SCRIPT,
  TEST
];
const controlEntries = await Promise.all(controlPaths.map(async (file) => [file, await readFile(file)]));
const controlBytes = Object.fromEntries(controlEntries);
const sourceHashes = Object.fromEntries(controlEntries.map(([file, bytes]) => [file, sha256(bytes)]));
const manifest = JSON.parse(controlBytes[PRODUCTION_MANIFEST]);
const corpusAudit = JSON.parse(controlBytes[CORPUS_AUDIT]);
const promotion = JSON.parse(controlBytes[SCORE_PROMOTION]);
const canarySelection = JSON.parse(controlBytes[CANARY_SELECTION]);
const canaryExecution = JSON.parse(controlBytes[CANARY_EXECUTION]);
const priorPreparation = JSON.parse(controlBytes[PRIOR_PREPARATION]);
const priorAnalysis = JSON.parse(controlBytes[PRIOR_ANALYSIS]);
const repairActivation = JSON.parse(controlBytes[REPAIR_ACTIVATION]);
const repairExecution = JSON.parse(controlBytes[REPAIR_EXECUTION]);
const repair88 = JSON.parse(controlBytes[REPAIR_88]);
const repair127 = JSON.parse(controlBytes[REPAIR_127]);
const repair167 = JSON.parse(controlBytes[REPAIR_167]);

assertV4(
  manifest.schemaVersion === "1.0-adjudicated-consensus-production-manifest" &&
    manifest.items.length === 195 &&
    manifest.model.label === "5.6 Sol" &&
    manifest.model.reasoningEffort === "low" &&
    manifest.model.authentication === "ChatGPT subscription" &&
    promotion.status === "active-production-score-stability-policy-v2.2" &&
    promotion.activePolicy.version === "v2.2" &&
    promotion.activePolicy.normativeTextSha256 === sha256(controlBytes[SCORE_POLICY]) &&
    canarySelection.selected.length === 10 &&
    canaryExecution.status === "production-mutation-dependent-pilot-analysis-remedy-execution-passed" &&
    priorPreparation.status === "post-canary-continuation-plan-frozen-source-normalization-blockers-found" &&
    priorAnalysis.status === "post-canary-continuation-analysis-passed-with-two-source-normalization-blockers" &&
    repairActivation.status === "two-debate-source-normalization-repair-execution-activation-frozen-awaiting-separate-execution-authorization" &&
    repairExecution.status === "two-debate-source-normalization-repair-execution-passed" &&
    repair88.status === "source-normalization-repair-passed" &&
    repair127.status === "source-normalization-repair-passed" &&
    repair167.status === "debate-167-empty-derived-event-repair-passed",
  "post-canary repair or active production controls drifted"
);
assertV4(
  repairExecution.attempts === 1 &&
    repairExecution.retries === 0 &&
    repairExecution.validation.exactProjectedHashesPassed === true &&
    repairExecution.validation.corpusTranscriptValidatorPassed === true &&
    repairExecution.validation.completeRepositoryCheckPassed === true &&
    repairExecution.modelBoundary.modelContexts === 0,
  "two-debate source repair did not pass its frozen one-attempt gate"
);

const manifestByNumber = new Map(manifest.items.map((item) => [item.debateNumber, item]));
const canaryByNumber = new Map(canarySelection.selected.map((item) => [item.debateNumber, item]));
const overlaySpecs = [
  {
    debateNumber: "88",
    recordPath: REPAIR_88,
    record: repair88,
    effectiveHashes: repair88.after,
    reason: "remove one zero-duration derived event with no unique semantic content"
  },
  {
    debateNumber: "127",
    recordPath: REPAIR_127,
    record: repair127,
    effectiveHashes: repair127.after,
    reason: "remove one zero-duration derived event with no unique semantic content"
  },
  {
    debateNumber: "167",
    recordPath: REPAIR_167,
    record: repair167,
    effectiveHashes: {
      eventsSha256: repair167.sourceChainAfter.events.sha256,
      transcriptSha256: repair167.sourceChainAfter.transcript.sha256,
      manifestSha256: repair167.sourceChainAfter.manifest.sha256
    },
    reason: "remove one empty derived event with no semantic content"
  }
];

const overlays = [];
const effectiveByNumber = new Map(manifest.items.map((item) => [item.debateNumber, structuredClone(item.sourceChain)]));
for (const spec of overlaySpecs) {
  const item = manifestByNumber.get(spec.debateNumber);
  assertV4(item && item.debateId === spec.record.debateId && item.videoId === spec.record.videoId, `Debate ${spec.debateNumber}: repair identity drifted`);
  const effective = {
    ...structuredClone(item.sourceChain),
    transcriptSha256: spec.effectiveHashes.transcriptSha256,
    eventsSha256: spec.effectiveHashes.eventsSha256,
    manifestSha256: spec.effectiveHashes.manifestSha256
  };
  if (spec.debateNumber === "167") {
    const selected = canaryByNumber.get("167");
    assertV4(selected?.sourceChainOverlayApplied === true && canonicalJson(selected.sourceChain) === canonicalJson(effective), "Debate 167 canary overlay drifted");
  }
  effectiveByNumber.set(spec.debateNumber, effective);
  overlays.push({
    debateNumber: spec.debateNumber,
    debateId: item.debateId,
    videoId: item.videoId,
    repairRecord: { path: spec.recordPath, sha256: sourceHashes[spec.recordPath], status: spec.record.status },
    reason: spec.reason,
    originalSourceChain: structuredClone(item.sourceChain),
    effectiveSourceChain: effective,
    exactOverriddenFields: ["transcriptSha256", "eventsSha256", "manifestSha256"],
    pathsChanged: false,
    semanticContentRemoved: false
  });
}

const auditById = new Map(corpusAudit.entries.map((entry) => [entry.debateId, entry]));
const effectiveRecords = [];
const remainingRecords = [];
let originalHashMatches = 0;
let overlayHashMatches = 0;
const remainingNumbers = priorPreparation.corpusDisposition.remainingPendingDyadic;
const remainingSet = new Set(remainingNumbers);
let remainingEventCount = 0;
let remainingDurationMs = 0;
for (const item of manifest.items) {
  const effective = effectiveByNumber.get(item.debateNumber);
  const [transcriptBytes, eventsBytes, localManifestBytes] = await Promise.all([
    readFile(effective.transcript),
    readFile(effective.events),
    readFile(effective.manifest)
  ]);
  const actual = {
    transcriptSha256: sha256(transcriptBytes),
    eventsSha256: sha256(eventsBytes),
    manifestSha256: sha256(localManifestBytes)
  };
  assertV4(
    actual.transcriptSha256 === effective.transcriptSha256 &&
      actual.eventsSha256 === effective.eventsSha256 &&
      actual.manifestSha256 === effective.manifestSha256,
    `Debate ${item.debateNumber}: effective source hash mismatch`
  );
  for (const key of ["transcriptSha256", "eventsSha256", "manifestSha256"]) {
    if (actual[key] === item.sourceChain[key]) originalHashMatches += 1;
    else overlayHashMatches += 1;
  }
  const events = JSON.parse(eventsBytes);
  const localManifest = JSON.parse(localManifestBytes);
  const transcript = transcriptBytes.toString("utf8");
  assertV4(
    localManifest.normalizedEventsSha256 === actual.eventsSha256 &&
      localManifest.transcriptSha256 === actual.transcriptSha256 &&
      localManifest.eventCount === events.length &&
      (item.debateNumber === "167" || localManifest.wordCount === wordCount(transcript)),
    `Debate ${item.debateNumber}: effective local-manifest chain mismatch`
  );
  const auditEntry = auditById.get(item.debateId);
  assertV4(
    auditEntry?.normalizedEventsSha256 === actual.eventsSha256 &&
      auditEntry.transcriptSha256 === actual.transcriptSha256 &&
      auditEntry.eventCount === events.length &&
      auditEntry.wordCount === localManifest.wordCount,
    `Debate ${item.debateNumber}: corpus audit does not match effective source chain`
  );
  for (const [kind, fileKey, hashKey] of [
    ["transcript", "transcript", "transcriptSha256"],
    ["events", "events", "eventsSha256"],
    ["manifest", "manifest", "manifestSha256"]
  ]) {
    const record = { debateNumber: item.debateNumber, kind, path: effective[fileKey], sha256: actual[hashKey], approvedOverlay: ["88", "127", "167"].includes(item.debateNumber) };
    effectiveRecords.push(record);
    if (remainingSet.has(item.debateNumber)) remainingRecords.push(record);
  }
  if (remainingSet.has(item.debateNumber)) {
    const normalized = normalizeV418Events(events);
    assertV4(normalized.length > 0, `Debate ${item.debateNumber}: no canonical events`);
    remainingEventCount += normalized.length;
    remainingDurationMs += Math.max(...normalized.map((event) => event.startMs + event.durationMs));
  }
}
assertV4(originalHashMatches === 576 && overlayHashMatches === 9, "three-debate effective overlay count drifted");
assertV4(remainingNumbers.length === 164 && remainingRecords.length === 492, "remaining dyadic source census drifted");

const overlay = {
  schemaVersion: "1.0-assessment-production-post-canary-effective-source-overlay",
  protocolId: "assessment-production-post-canary-continuation-policy-v1",
  status: "three-debate-effective-source-overlay-frozen-and-verified",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  planningOnly: true,
  productionManifest: { path: PRODUCTION_MANIFEST, sha256: sourceHashes[PRODUCTION_MANIFEST], mutable: false },
  corpusAudit: { path: CORPUS_AUDIT, sha256: sourceHashes[CORPUS_AUDIT], matchesAllEffectiveTranscriptAndEventChains: true },
  mergeRule: "For Debate 88, 127, or 167 only, replace the three source-chain hash fields with the exact effective values below; preserve every path, extraction method, identity field, and all non-source metadata from the frozen production manifest.",
  overlays,
  verification: {
    corpusDebates: 195,
    effectiveSourceFilesExpected: 585,
    effectiveSourceFilesVerified: 585,
    originalManifestHashMatches: originalHashMatches,
    approvedOverlayHashMatches: overlayHashMatches,
    approvedOverlayDebates: ["88", "127", "167"],
    effectiveSourceRecordsSha256: sha256(serializedJson(effectiveRecords)),
    remainingPendingDyadicDebates: 164,
    remainingPendingSourceFilesVerified: remainingRecords.length,
    remainingEffectiveSourceRecordsSha256: sha256(serializedJson(remainingRecords)),
    remainingCanonicalEventDebatesPassed: 164,
    remainingCanonicalEventDebatesFailed: 0,
    remainingCanonicalEventCount: remainingEventCount,
    remainingDurationHours: Number((remainingDurationMs / 3_600_000).toFixed(3)),
    historicalManifestWordCountPreservedWithoutRecomputation: ["167"],
    sourceMutations: 0
  },
  authorization: { batchSelection: false, modelExecution: false, scoreDerivation: false, publicationReconstruction: false, productionMutation: false },
  nextAuthorizedAction: "freeze-post-canary-continuation-selection-policy-plan"
};
const overlayBytes = Buffer.from(serializedJson(overlay));

const batchSize = 10;
const campaignBatches = Math.ceil(remainingNumbers.length / batchSize);
const policy = {
  schemaVersion: "1.0-assessment-production-post-canary-continuation-selection-policy",
  protocolId: overlay.protocolId,
  status: "post-canary-full-campaign-selection-policy-frozen-awaiting-separate-first-batch-selection-decision",
  frozenAt,
  checkpointCommit: overlay.checkpointCommit,
  planningOnly: true,
  userAuthorization: {
    instruction: "Proceed with the next task at your discretion.",
    scopeInterpretation: "Prepare and freeze only the verified effective-source overlay and deterministic full-campaign selection policy. Do not materialize a batch selection, prepare model packets, execute models, derive scores, reconstruct publication prose, promote accepted calibration debates, or mutate production.",
    directIncrementalCostEstimateUsd: 0
  },
  effectiveSourceOverlay: { path: OVERLAY, bytes: overlayBytes.byteLength, sha256: sha256(overlayBytes), status: overlay.status },
  reconciledCorpus: {
    totalDebates: 195,
    publishedCanary: priorPreparation.corpusDisposition.publishedCanary,
    acceptedCalibrationPendingSeparatePromotion: priorPreparation.corpusDisposition.acceptedCalibrationPendingPromotion,
    excludedMultiSpeaker: priorPreparation.corpusDisposition.excludedMultiSpeaker,
    remainingPendingDyadic: remainingNumbers,
    counts: priorPreparation.corpusDisposition.counts
  },
  eligibilityPolicy: {
    includeExactlyRemainingPendingDyadicCensus: true,
    dyadicOnly: true,
    publishedCanaryExcluded: true,
    acceptedCalibrationExcludedPendingSeparatePromotion: true,
    multiSpeakerExcluded: true,
    priorFailedCanaryOrValidationObservationDoesNotExclude: true,
    reasonPriorObservationDoesNotExclude: "Fresh/disjoint isolation protected held-out validation and the first production canary; applying it to the full campaign would strand 125 still-pending dyadic debates.",
    priorFreshOnlyEligible: priorPreparation.continuationSelectionFinding.oldFreshOnlyEligible,
    priorFreshOnlyStranded: priorPreparation.continuationSelectionFinding.oldFreshOnlyStranded,
    sourceGateRequiresEffectiveOverlayHashReplay: true,
    canonicalEventsRequired: true,
    transcriptContentAccessDuringSelection: false,
    legacyAssessmentAccessDuringSelection: false,
    scoreAccessDuringSelection: false,
    winnerAccessDuringSelection: false,
    priorModelOutputAccessDuringSelection: false
  },
  deterministicOrdering: {
    materializeRanksInThisPlanningGate: false,
    materializedBatchMembers: [],
    rankDomain: "assessment-production-post-canary-continuation-v1",
    rankFormula: "SHA-256(rank domain | active v2.2 normative-text hash | v2.2 promotion-record hash | debate number | debate id), ascending; debate number ascending breaks a cryptographic tie",
    normativeTextSha256: sha256(controlBytes[SCORE_POLICY]),
    promotionRecordSha256: sha256(controlBytes[SCORE_PROMOTION]),
    immutableAfterFirstSelection: true,
    resultDependentReorderingAllowed: false
  },
  batchingPolicy: {
    firstPostCanaryBatchNumber: 1,
    productionSequenceOrdinal: 2,
    standardBatchSize: batchSize,
    remainingDebatesAtFreeze: remainingNumbers.length,
    plannedContinuationBatches: campaignBatches,
    plannedFullTenDebateBatches: Math.floor(remainingNumbers.length / batchSize),
    plannedFinalBatchSize: remainingNumbers.length % batchSize,
    finalBatchMayBeSmaller: true,
    selectFirstNFromStableRemainingRank: true,
    successfulProductionPublicationRequiredBeforeRemovingDebateFromRemainingPool: true,
    priorFailedOrIncompleteBatchMustResumeWithoutReplacement: true,
    replacementAfterSelectionAllowed: false,
    concurrentBatchesAllowed: false,
    nextBatchSelectionBeforePriorBatchPublicationAllowed: false
  },
  stageConcurrency: { discovery: 4, inventory: 2, judgments: 2, audio: 2, adjudication: 2, publication: 2 },
  activeControls: {
    scorePolicyVersion: promotion.activePolicy.version,
    scorePolicyPromotion: SCORE_PROMOTION,
    scorePolicyPromotionSha256: sourceHashes[SCORE_PROMOTION],
    scorePassesMaximumPerDebate: 1,
    assessmentModel: "5.6 Sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    scoreBlindnessRequired: true,
    roundedIntegerScoreTiesPermitted: true,
    modelAuthoredScoresAllowed: false,
    automaticScoreRerunAllowed: false
  },
  selectionExecutionContract: {
    requiresSeparateUserDecision: true,
    firstSelectionMayMaterializeAtMost: 10,
    mustRevalidateAllSelectedEffectiveSourceHashesAndCanonicalEvents: true,
    anySelectedSourceFailureBlocksWholeBatch: true,
    replacementsMaximum: 0,
    selectedBatchArtifactImmutable: true,
    noModelContexts: true,
    noPaidServices: true
  },
  stopRules: {
    selectionBeforeSeparateDecisionBlocks: true,
    overlayHashMismatchBlocks: true,
    productionManifestHashMismatchBlocks: true,
    corpusDispositionMismatchBlocks: true,
    sourceHashMismatchBlocksWholeSelectedBatch: true,
    canonicalEventFailureBlocksWholeSelectedBatch: true,
    priorObservationExclusionBlocks: true,
    resultDependentRankMutationBlocks: true,
    replacementSelectionBlocks: true,
    concurrentBatchSelectionBlocks: true,
    modelExecutionBlocks: true,
    scoreDerivationBlocks: true,
    publicationReconstructionBlocks: true,
    productionMutationBlocks: true,
    paidServiceUseBlocks: true
  },
  sourceHashes,
  totals: {
    planningArtifacts: 3,
    effectiveSourceFilesVerified: 585,
    remainingCanonicalDebatesPassed: 164,
    batchesSelected: 0,
    batchMembersMaterialized: 0,
    modelContexts: 0,
    scorePasses: 0,
    publicationContexts: 0,
    productionMutations: 0,
    meteredApiCostUsd: 0
  },
  authorization: {
    effectiveSourceOverlayPreparation: true,
    continuationSelectionPolicyPreparation: true,
    batchSelection: false,
    sourcePacketPreparation: false,
    modelExecution: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    acceptedCalibrationPromotion: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  futureArtifacts: { firstBatchSelection: FUTURE_SELECTION },
  nextAuthorizedAction: "user-decision-on-first-post-canary-production-batch-selection-preparation"
};
const policyBytes = Buffer.from(serializedJson(policy));
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-continuation-policy-analysis",
  protocolId: policy.protocolId,
  status: "post-repair-source-overlay-and-full-campaign-selection-policy-analysis-passed",
  analyzedAt: frozenAt,
  effectiveSourceOverlay: { path: OVERLAY, bytes: overlayBytes.byteLength, sha256: sha256(overlayBytes), status: overlay.status },
  selectionPolicy: { path: POLICY, bytes: policyBytes.byteLength, sha256: sha256(policyBytes), status: policy.status },
  finding: "The successful repairs for Debates 88 and 127 combine with the prior Debate 167 repair into a three-debate overlay that reconciles all 585 effective source files; all 164 remaining dyadic debates now pass canonical event validation.",
  policyDecision: "Use one stable score-blind hash order across every remaining dyadic debate, including debates observed in earlier failed or development gates; publish sequential batches of ten and a final batch of four, never replace a selected blocker, and do not select the next batch before the prior one publishes successfully.",
  decision: {
    effectiveSourceGatePassed: true,
    remainingCanonicalSourceGatePassed: true,
    completeCampaignEligibilityReconciled: true,
    priorFreshOnlyExclusionRetiredForProductionContinuation: true,
    batchSelectionAttempted: false,
    batchSelectionAuthorized: false,
    modelExecutionAuthorized: false,
    productionMutationAuthorized: false
  },
  modelBoundary: { assessmentModel: "5.6 Sol", reasoningEffort: "low", authentication: "ChatGPT subscription", scoreBlindnessRequired: true, modelContexts: 0, meteredApiCostUsd: 0 },
  nextAuthorizedAction: policy.nextAuthorizedAction
};

if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(OVERLAY, overlayBytes);
  await writeFile(POLICY, policyBytes);
  await writeFile(ANALYSIS, serializedJson(analysis));
}
console.log(JSON.stringify({
  status: shouldWrite ? policy.status : "preview",
  effectiveSourceFilesVerified: 585,
  approvedOverlayDebates: ["88", "127", "167"],
  remainingCanonicalDebatesPassed: 164,
  plannedContinuationBatches: campaignBatches,
  plannedFinalBatchSize: remainingNumbers.length % batchSize,
  batchesSelected: 0,
  modelContexts: 0,
  directCostUsd: 0,
  nextAuthorizedAction: policy.nextAuthorizedAction
}, null, 2));
