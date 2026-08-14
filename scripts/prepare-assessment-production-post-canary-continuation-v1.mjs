#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const ROOT = "docs/assessment-production/post-canary-continuation-v1";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const RUBRIC = "docs/reassessment-rubric-v2.1.md";
const POLICY = "docs/assessment-production/score-stability-policy-v2.2-proposal.md";
const PROMOTION = "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const ACTIVE_CONTROL = "scripts/lib/assessment-production-score-stability-policy-active.mjs";
const ACTIVE_CONTROL_TEST = "scripts/test-assessment-production-score-stability-policy-active.mjs";
const CANARY_INVENTORY = "docs/assessment-production/canary-v1-inventory/analysis.json";
const PROVEN_STOP_RULES = "docs/assessment-production/score-stability-v2.2.3-validation-cohort/independent-judgments/execution-activation.json";
const PRIOR_PRODUCTION_SELECTION = "docs/assessment-production/production-checkpoint-v2.2-1/selection.json";
const PRIOR_PRODUCTION_MASTER = "docs/assessment-production/production-checkpoint-v2.2-1/master-manifest.json";
const PRIOR_PRODUCTION_EXECUTION = "docs/assessment-production/production-checkpoint-v2.2-1/production-mutation/dependent-pilot-analysis-remedy/execution.json";
const PRIOR_PRODUCTION_ANALYSIS = "docs/assessment-production/production-checkpoint-v2.2-1/production-mutation/dependent-pilot-analysis-remedy/execution-analysis.json";
const DEBATE_167_REPAIR = "docs/assessment-production/source-repairs/debate-167-empty-event-normalization.json";
const SCORING = "scripts/lib/reassessment-scoring.mjs";
const DEBATE_VALIDATOR = "scripts/validate-debates.mjs";
const SCRIPT = "scripts/prepare-assessment-production-post-canary-continuation-v1.mjs";
const TEST = "scripts/test-assessment-production-post-canary-continuation-v1.mjs";
const PRIOR_VALIDATION_SELECTIONS = [
  "docs/assessment-production/score-stability-v2-validation-cohort/selection.json",
  "docs/assessment-production/score-stability-v2.1-validation-cohort/selection.json",
  "docs/assessment-production/score-stability-v2.1.1-validation-cohort/selection.json",
  "docs/assessment-production/score-stability-v2.1.2-validation-cohort/selection.json",
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort/selection.json",
  "docs/assessment-production/score-stability-v2.2-validation-cohort/selection.json"
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const serializedJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const exists = (file) => access(file).then(() => true, () => false);
if (shouldWrite) {
  assertV4(
    !(await exists(PREPARATION)) && !(await exists(ANALYSIS)),
    `${ROOT} already contains an immutable continuation result`
  );
}

const sourcePaths = [
  PRODUCTION_MANIFEST,
  WORKFLOW,
  READINESS_WORKFLOW,
  RUBRIC,
  POLICY,
  PROMOTION,
  ACTIVE_CONTROL,
  ACTIVE_CONTROL_TEST,
  CANARY_INVENTORY,
  PROVEN_STOP_RULES,
  PRIOR_PRODUCTION_SELECTION,
  PRIOR_PRODUCTION_MASTER,
  PRIOR_PRODUCTION_EXECUTION,
  PRIOR_PRODUCTION_ANALYSIS,
  DEBATE_167_REPAIR,
  SCORING,
  DEBATE_VALIDATOR,
  ...PRIOR_VALIDATION_SELECTIONS,
  SCRIPT,
  TEST
];
const sourceEntries = await Promise.all(
  sourcePaths.map(async (file) => [file, await readFile(file)])
);
const sourceBytes = Object.fromEntries(sourceEntries);
const sourceHashes = Object.fromEntries(
  sourceEntries.map(([file, bytes]) => [file, sha256(bytes)])
);
const productionManifest = JSON.parse(sourceBytes[PRODUCTION_MANIFEST]);
const promotion = JSON.parse(sourceBytes[PROMOTION]);
const failedCanaryInventory = JSON.parse(sourceBytes[CANARY_INVENTORY]);
const provenStopRules = JSON.parse(sourceBytes[PROVEN_STOP_RULES]);
const priorSelection = JSON.parse(sourceBytes[PRIOR_PRODUCTION_SELECTION]);
const priorMaster = JSON.parse(sourceBytes[PRIOR_PRODUCTION_MASTER]);
const priorExecution = JSON.parse(sourceBytes[PRIOR_PRODUCTION_EXECUTION]);
const priorAnalysis = JSON.parse(sourceBytes[PRIOR_PRODUCTION_ANALYSIS]);
const debate167Repair = JSON.parse(sourceBytes[DEBATE_167_REPAIR]);
const priorValidationSelections = PRIOR_VALIDATION_SELECTIONS.map((file) =>
  JSON.parse(sourceBytes[file])
);

assertV4(
  productionManifest.schemaVersion === "1.0-adjudicated-consensus-production-manifest" &&
    productionManifest.items.length === 195 &&
    productionManifest.scope.corpusDebates === 195 &&
    productionManifest.scope.dyadicProductionDebates === 179 &&
    productionManifest.scope.multiSpeakerExcluded === 16 &&
    productionManifest.scope.acceptedCalibrationDebates === 5 &&
    productionManifest.scope.pendingReassessments === 174 &&
    productionManifest.model.label === "5.6 Sol" &&
    productionManifest.model.reasoningEffort === "low" &&
    productionManifest.model.authentication === "ChatGPT subscription" &&
    promotion.status === "active-production-score-stability-policy-v2.2" &&
    promotion.activePolicy.normativeTextSha256 === sourceHashes[POLICY] &&
    promotion.productionScoreControl.librarySha256 === sourceHashes[ACTIVE_CONTROL] &&
    promotion.productionScoreControl.testSha256 === sourceHashes[ACTIVE_CONTROL_TEST] &&
    promotion.productionScoreControl.scoreCalculationPasses === 1 &&
    !promotion.productionScoreControl.modelAuthoredScoresAllowed &&
    !promotion.productionScoreControl.automaticRerunAllowed &&
    failedCanaryInventory.debates.length === 10 &&
    Object.values(provenStopRules.stopRules).every(Boolean) &&
    priorSelection.selected.length === 10 &&
    priorMaster.cohort.exactDebateCount === 10 &&
    priorExecution.status === "production-mutation-dependent-pilot-analysis-remedy-execution-passed" &&
    priorExecution.decision.allAcceptanceChecksPassed &&
    priorExecution.decision.productionMutationRetained &&
    priorAnalysis.status === "production-mutation-dependent-pilot-analysis-remedy-execution-analysis-passed" &&
    priorAnalysis.decision.canaryPassed &&
    debate167Repair.status === "debate-167-empty-derived-event-repair-passed",
  "post-canary continuation controls or completed canary evidence drifted"
);

const publishedCanaryNumbers = new Set(
  priorSelection.selected.map((item) => item.debateNumber)
);
const itemByNumber = new Map(
  productionManifest.items.map((item) => [item.debateNumber, item])
);
assertV4(
  publishedCanaryNumbers.size === 10 &&
    [...publishedCanaryNumbers].every((number) => itemByNumber.has(number)),
  "completed production canary debate set is invalid"
);

const dispositions = {
  publishedCanary: [],
  acceptedCalibrationPendingPromotion: [],
  excludedMultiSpeaker: [],
  remainingPendingDyadic: []
};
for (const item of productionManifest.items) {
  if (publishedCanaryNumbers.has(item.debateNumber)) {
    dispositions.publishedCanary.push(item.debateNumber);
  } else if (item.acceptedCalibration !== null) {
    dispositions.acceptedCalibrationPendingPromotion.push(item.debateNumber);
  } else if (item.speakerCount !== 2) {
    dispositions.excludedMultiSpeaker.push(item.debateNumber);
  } else {
    assertV4(
      item.disposition === "pending-reassessment" && item.acceptedCalibration === null,
      `Debate ${item.debateNumber}: unexpected continuation disposition`
    );
    dispositions.remainingPendingDyadic.push(item.debateNumber);
  }
}
assertV4(
  dispositions.publishedCanary.length === 10 &&
    dispositions.acceptedCalibrationPendingPromotion.length === 5 &&
    dispositions.excludedMultiSpeaker.length === 16 &&
    dispositions.remainingPendingDyadic.length === 164 &&
    Object.values(dispositions).reduce((sum, values) => sum + values.length, 0) === 195,
  "post-canary corpus disposition does not reconcile to 195 debates"
);

const prior167 = priorSelection.selected.find(
  (item) => item.debateNumber === "167"
);
assertV4(
  prior167?.sourceChainOverlayApplied === true,
  "Debate 167 approved source-chain overlay is missing"
);
const effectiveSourceRecords = [];
let originalManifestSourceHashMatches = 0;
let effectiveSourceHashMatches = 0;
for (const item of productionManifest.items) {
  const effective = item.debateNumber === "167" ? prior167.sourceChain : item.sourceChain;
  for (const [kind, fileKey, hashKey] of [
    ["transcript", "transcript", "transcriptSha256"],
    ["events", "events", "eventsSha256"],
    ["manifest", "manifest", "manifestSha256"]
  ]) {
    const bytes = await readFile(effective[fileKey]);
    const actualSha256 = sha256(bytes);
    if (actualSha256 === item.sourceChain[hashKey]) originalManifestSourceHashMatches += 1;
    assertV4(
      actualSha256 === effective[hashKey],
      `Debate ${item.debateNumber}: effective ${kind} hash mismatch`
    );
    effectiveSourceHashMatches += 1;
    effectiveSourceRecords.push({
      debateNumber: item.debateNumber,
      kind,
      path: effective[fileKey],
      sha256: actualSha256,
      approvedOverlay: item.debateNumber === "167"
    });
  }
}
assertV4(
  originalManifestSourceHashMatches === 582 &&
    effectiveSourceHashMatches === 585,
  "effective 195-debate source chain did not reconcile"
);

const acceptedCalibrationArtifacts = [];
for (const number of dispositions.acceptedCalibrationPendingPromotion) {
  const item = itemByNumber.get(number);
  const artifact = { debateNumber: number, debateId: item.debateId };
  for (const key of ["output", "compiled"]) {
    const file = item.acceptedCalibration[key];
    const expected = item.acceptedCalibration[`${key}Sha256`];
    const bytes = await readFile(file);
    assertV4(sha256(bytes) === expected, `Debate ${number}: ${key} artifact hash mismatch`);
    artifact[key] = { path: file, bytes: bytes.byteLength, sha256: expected };
  }
  acceptedCalibrationArtifacts.push(artifact);
}

const canaryLedgerLocks = new Map(
  priorExecution.productionLedgers.files.map((record) => [record.path, record])
);
for (const item of priorSelection.selected) {
  const ledgerPath = `docs/assessment-ledgers/${item.debateId}.json`;
  const lock = canaryLedgerLocks.get(ledgerPath);
  const bytes = await readFile(ledgerPath);
  assertV4(
    lock && bytes.byteLength === lock.bytes && sha256(bytes) === lock.sha256,
    `Debate ${item.debateNumber}: retained production ledger drifted`
  );
}

const canonicalEventFailures = [];
let canonicalEventPasses = 0;
let canonicalEventCount = 0;
let canonicalDurationMs = 0;
for (const number of dispositions.remainingPendingDyadic) {
  const item = itemByNumber.get(number);
  try {
    const events = normalizeV418Events(
      JSON.parse(await readFile(item.sourceChain.events))
    );
    assertV4(events.length > 0, "no canonical events");
    canonicalEventPasses += 1;
    canonicalEventCount += events.length;
    canonicalDurationMs += Math.max(
      ...events.map((event) => event.startMs + event.durationMs)
    );
  } catch (error) {
    canonicalEventFailures.push({
      debateNumber: item.debateNumber,
      debateId: item.debateId,
      videoId: item.videoId,
      stage: "canonical-event-validation",
      message: error.message,
      transcriptSha256: item.sourceChain.transcriptSha256,
      eventsSha256: item.sourceChain.eventsSha256,
      manifestSha256: item.sourceChain.manifestSha256
    });
  }
}
assertV4(
  canonicalEventPasses === 162 &&
    canonicalJson(canonicalEventFailures.map((item) => item.debateNumber)) ===
      canonicalJson(["88", "127"]),
  "remaining-corpus canonical source blocker set drifted"
);

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(child)));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}
const calibrationPaths = (await walkFiles("docs/calibration")).sort();
const calibrationObserved = new Set();
for (const file of calibrationPaths) {
  const match = file.match(/debate-(\d{1,3})/);
  if (!match) continue;
  const number = Number(match[1]);
  if (number >= 1 && number <= 195) {
    calibrationObserved.add(String(number).padStart(2, "0"));
  }
}
const oldFreshOnlyObserved = new Set([
  ...calibrationObserved,
  ...failedCanaryInventory.debates.map((item) => item.debateNumber),
  ...priorValidationSelections.flatMap((selection) =>
    selection.selected.map((item) => item.debateNumber)
  ),
  ...publishedCanaryNumbers
]);
const oldFreshOnlyEligible = dispositions.remainingPendingDyadic.filter(
  (number) => !oldFreshOnlyObserved.has(number)
);
assertV4(
  oldFreshOnlyEligible.length === 39 &&
    dispositions.remainingPendingDyadic.length - oldFreshOnlyEligible.length === 125,
  "old held-out selection rule impact drifted"
);

const preparation = {
  schemaVersion: "1.0-assessment-production-post-canary-continuation-preparation",
  protocolId: "assessment-production-post-canary-continuation-v1",
  status: "post-canary-continuation-plan-frozen-source-normalization-blockers-found",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  planningOnly: true,
  productionMutation: false,
  userAuthorization: {
    instruction: "Proceed with the next task at your discretion.",
    scopeInterpretation: "Prepare and freeze only the next model-free post-canary continuation gate; do not select a batch, repair sources, execute models, derive scores, reconstruct publication prose, or mutate production.",
    directIncrementalCostEstimateUsd: 0
  },
  completedCanary: {
    selection: PRIOR_PRODUCTION_SELECTION,
    selectionSha256: sourceHashes[PRIOR_PRODUCTION_SELECTION],
    execution: PRIOR_PRODUCTION_EXECUTION,
    executionSha256: sourceHashes[PRIOR_PRODUCTION_EXECUTION],
    analysis: PRIOR_PRODUCTION_ANALYSIS,
    analysisSha256: sourceHashes[PRIOR_PRODUCTION_ANALYSIS],
    debatesPublished: 10,
    productionLedgersRetainedAndExact: 10,
    acceptancePassed: true
  },
  corpusDisposition: {
    corpusDebates: 195,
    publishedCanary: dispositions.publishedCanary,
    acceptedCalibrationPendingPromotion: dispositions.acceptedCalibrationPendingPromotion,
    excludedMultiSpeaker: dispositions.excludedMultiSpeaker,
    remainingPendingDyadic: dispositions.remainingPendingDyadic,
    counts: {
      publishedCanary: 10,
      acceptedCalibrationPendingPromotion: 5,
      excludedMultiSpeaker: 16,
      remainingPendingDyadic: 164,
      total: 195
    }
  },
  effectiveSourceAudit: {
    sourceFilesExpected: 585,
    sourceFilesPresent: 585,
    originalManifestHashMatches: 582,
    approvedDebate167OverlayHashMatches: 3,
    effectiveHashMatches: 585,
    effectiveSourceRecordsSha256: sha256(serializedJson(effectiveSourceRecords)),
    remainingPendingSourceFilesExact: 492,
    transcriptContentSemanticallyInspected: false,
    eventStructureInspected: true
  },
  remainingCanonicalEventAudit: {
    debatesChecked: 164,
    passed: canonicalEventPasses,
    failed: canonicalEventFailures.length,
    passedEventCount: canonicalEventCount,
    passedDurationHours: Number((canonicalDurationMs / 3_600_000).toFixed(3)),
    failures: canonicalEventFailures,
    replacementsAllowed: false,
    replacementsPerformed: 0
  },
  acceptedCalibrationLane: {
    debates: acceptedCalibrationArtifacts,
    artifactsHashMatched: 10,
    productionPromotionPerformed: false,
    compatibilityPlanningPerformed: false,
    modelContexts: 0
  },
  continuationSelectionFinding: {
    batchSelected: false,
    reason: "The first checkpoint's fresh/disjoint held-out rule is a canary-validity control, not a complete-campaign disposition rule; applying it to the remaining campaign would leave already observed but still pending debates permanently unassigned.",
    remainingPendingDyadic: 164,
    oldFreshOnlyEligible: oldFreshOnlyEligible.length,
    oldFreshOnlyStranded: 125,
    calibrationArtifactPathInventorySha256: sha256(`${calibrationPaths.join("\n")}\n`),
    newFullCampaignSelectionPolicyRequired: true,
    selectionBeforeSourceBlockerDispositionForbidden: true
  },
  activeControls: {
    policyVersion: promotion.activePolicy.version,
    promotion: PROMOTION,
    promotionSha256: sourceHashes[PROMOTION],
    thresholds: structuredClone(promotion.activePolicy.thresholds),
    winnerRule: structuredClone(promotion.activePolicy.winnerRule),
    scorePassesMaximum: 1,
    modelAuthoredScoresAllowed: false,
    automaticScoreRerunAllowed: false,
    assessmentModel: "5.6 Sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    scoreBlindnessRequired: true,
    roundedIntegerScoreTiesPermitted: true
  },
  stopRules: {
    missingOrHashMismatchedSourceBlocks: true,
    invalidCanonicalEventBlocksAffectedDebate: true,
    sourceMutationBeforeSeparateActivationBlocks: true,
    replacementSelectionBeforeBlockerDispositionBlocks: true,
    continuationSelectionPolicyMutationAfterResultsBlocks: true,
    modelExecutionBlocks: true,
    scoreDerivationBlocks: true,
    publicationReconstructionBlocks: true,
    productionMutationBlocks: true,
    remainingProductionBatchExecutionBlocks: true,
    paidServiceUseBlocks: true
  },
  totals: {
    planningArtifacts: 2,
    corpusDebatesReconciled: 195,
    effectiveSourceFilesValidated: 585,
    canonicalSourceBlockers: 2,
    batchesSelected: 0,
    modelContexts: 0,
    scorePasses: 0,
    publicationContexts: 0,
    productionMutations: 0,
    paidTranscriptionCalls: 0,
    meteredApiCostUsd: 0
  },
  sourceHashes,
  authorization: {
    sourceRepairPlanPreparation: false,
    sourceRepairExecution: false,
    continuationSelectionPolicyPreparation: false,
    batchSelection: false,
    acceptedCalibrationCompatibilityPreparation: false,
    modelExecution: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction: "user-decision-on-two-debate-source-normalization-repair-plan-preparation"
};
const preparationBytes = serializedJson(preparation);
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-continuation-analysis",
  protocolId: preparation.protocolId,
  status: "post-canary-continuation-analysis-passed-with-two-source-normalization-blockers",
  analyzedAt: frozenAt,
  preparation: {
    path: PREPARATION,
    bytes: Buffer.byteLength(preparationBytes),
    sha256: sha256(preparationBytes),
    status: preparation.status
  },
  finding: "The passed ten-debate canary leaves a fully reconciled corpus of 10 published canary debates, 5 accepted calibration debates awaiting a separate promotion path, 16 excluded multi-speaker debates, and 164 pending dyadic reassessments. All 585 effective source files are present and hash-exact after honoring the approved Debate 167 overlay, but Debates 88 and 127 contain malformed event durations and fail canonical normalization.",
  campaignPolicyFinding: "The original fresh/disjoint held-out selector would admit only 39 of the 164 pending dyadic debates and strand 125. It must not be reused as the complete-campaign policy; a new frozen continuation selection policy is required after the two source blockers receive an explicit disposition.",
  decision: {
    canaryPassed: true,
    corpusDispositionReconciled: true,
    effectiveSourceHashesPassed: true,
    canonicalSourceGatePassed: false,
    batchSelectionPassed: false,
    batchSelectionAttempted: false,
    productionContinuationExecutionAuthorized: false,
    recommendedNextGate: "prepare a bounded, model-free source normalization repair plan for Debates 88 and 127"
  },
  modelBoundary: {
    assessmentModel: "5.6 Sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    scoreBlindnessRequired: true,
    modelContexts: 0,
    scorePasses: 0,
    publicationContexts: 0,
    meteredApiCostUsd: 0
  },
  nextAuthorizedAction: preparation.nextAuthorizedAction
};
const analysisBytes = serializedJson(analysis);

if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(PREPARATION, preparationBytes);
  await writeFile(ANALYSIS, analysisBytes);
}
console.log(JSON.stringify({
  status: shouldWrite ? preparation.status : "preview",
  disposition: preparation.corpusDisposition.counts,
  effectiveSourceFilesValidated: 585,
  canonicalEventPasses,
  canonicalEventFailures,
  oldFreshOnlyEligible: oldFreshOnlyEligible.length,
  oldFreshOnlyStranded: 125,
  batchesSelected: 0,
  modelContexts: 0,
  directCostUsd: 0,
  nextAuthorizedAction: preparation.nextAuthorizedAction
}, null, 2));
