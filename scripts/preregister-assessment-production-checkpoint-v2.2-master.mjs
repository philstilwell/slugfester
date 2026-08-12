#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);
const ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1";
const OUTPUT = `${ROOT}/master-manifest.json`;
const SELECTION = `${ROOT}/selection.json`;
const SELECTION_FAILURE = `${ROOT}/selection-failure.json`;
const REPAIR_RECORD =
  "docs/assessment-production/source-repairs/debate-167-empty-event-normalization.json";
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const RUBRIC = "docs/reassessment-rubric-v2.1.md";
const POLICY =
  "docs/assessment-production/score-stability-policy-v2.2-proposal.md";
const PROMOTION =
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const ACTIVE_CONTROL =
  "scripts/lib/assessment-production-score-stability-policy-active.mjs";
const ACTIVE_CONTROL_TEST =
  "scripts/test-assessment-production-score-stability-policy-active.mjs";
const SCRIPT =
  "scripts/preregister-assessment-production-checkpoint-v2.2-master.mjs";
const TEST = "scripts/test-assessment-production-checkpoint-v2.2-master.mjs";
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
if (shouldWrite) {
  await access(path.resolve(OUTPUT)).then(
    () => {
      throw new Error(`${OUTPUT} already exists; master manifest is immutable`);
    },
    () => true
  );
}

const sourcePaths = [
  SELECTION,
  SELECTION_FAILURE,
  REPAIR_RECORD,
  PRODUCTION_MANIFEST,
  WORKFLOW,
  READINESS_WORKFLOW,
  RUBRIC,
  POLICY,
  PROMOTION,
  ACTIVE_CONTROL,
  ACTIVE_CONTROL_TEST,
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  SCRIPT,
  TEST,
];
const sourceEntries = await Promise.all(
  sourcePaths.map(async (file) => [file, await readFile(path.resolve(file))])
);
const sourceBytes = Object.fromEntries(sourceEntries);
const selection = JSON.parse(sourceBytes[SELECTION]);
const selectionFailure = JSON.parse(sourceBytes[SELECTION_FAILURE]);
const repairRecord = JSON.parse(sourceBytes[REPAIR_RECORD]);
const productionManifest = JSON.parse(sourceBytes[PRODUCTION_MANIFEST]);
const promotion = JSON.parse(sourceBytes[PROMOTION]);
assertV4(
  selection.status ===
      "fresh-disjoint-ten-debate-production-checkpoint-v2.2-source-gate-passed-after-exact-source-repair" &&
    selection.productionCanary &&
    !selection.developmentValidationOnly &&
    selection.stagingOnly &&
    selection.selected.length === 10 &&
    selection.activePolicy.version === "v2.2" &&
    selection.recoveryBoundary.selectionRecoveryAttempts === 1 &&
    !selection.recoveryBoundary.deterministicRankingChanged &&
    selection.recoveryBoundary.replacementDebatesUsed === 0 &&
    selection.recoveryBoundary.sourceChainOverlaysUsed === 1 &&
    canonicalJson(selection.recoveryBoundary.overlayDebateNumbers) ===
      canonicalJson(["167"]) &&
    Object.values(selection.stopRules).every(Boolean) &&
    selection.authorization.checkpointManifestPreparation &&
    !selection.authorization.sourcePacketPreparation &&
    !selection.authorization.discoveryModelExecution &&
    !selection.authorization.productionMutation &&
    selectionFailure.status ===
      "production-checkpoint-v2.2-source-gate-failed-selection-not-frozen" &&
    repairRecord.status === "debate-167-empty-derived-event-repair-passed" &&
    promotion.status === "active-production-score-stability-policy-v2.2" &&
    promotion.activePolicy.version === "v2.2" &&
    promotion.activePolicy.normativeTextSha256 === sha256(sourceBytes[POLICY]) &&
    promotion.productionScoreControl.librarySha256 ===
      sha256(sourceBytes[ACTIVE_CONTROL]) &&
    promotion.productionScoreControl.testSha256 ===
      sha256(sourceBytes[ACTIVE_CONTROL_TEST]) &&
    productionManifest.model.label === "5.6 Sol" &&
    productionManifest.model.slug === "gpt-5.6-sol" &&
    productionManifest.model.reasoningEffort === "low" &&
    productionManifest.model.authentication === "ChatGPT subscription",
  "production checkpoint master manifest is unauthorized or source boundary drifted"
);
for (const [file, expected] of Object.entries(selection.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === expected,
    `${file}: selected production source hash changed`
  );
}

const sourceHashes = Object.fromEntries(
  sourceEntries.map(([file, value]) => [file, sha256(value)])
);
for (const item of selection.selected) {
  for (const [file, expected] of [
    [item.sourceChain.transcript, item.sourceChain.transcriptSha256],
    [item.sourceChain.events, item.sourceChain.eventsSha256],
    [item.sourceChain.manifest, item.sourceChain.manifestSha256],
  ]) {
    assertV4(
      sha256(await readFile(path.resolve(file))) === expected,
      `Debate ${item.debateNumber}: source hash changed before master freeze`
    );
    sourceHashes[file] = expected;
  }
}
const manifest = {
  schemaVersion: "1.0-production-checkpoint-v2.2-master-manifest",
  protocolId: "assessment-production-checkpoint-v2.2-1",
  status:
    "frozen-production-checkpoint-v2.2-master-source-preparation-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: false,
  productionCanary: true,
  stagingOnly: true,
  cohort: {
    selection: SELECTION,
    selectionSha256: sourceHashes[SELECTION],
    debates: selection.selected.map((item) => ({
      debateNumber: item.debateNumber,
      debateId: item.debateId,
      videoId: item.videoId,
      motion: item.motion,
      sides: structuredClone(item.sides),
      eventCount: item.eventCount,
      durationSeconds: item.durationSeconds,
      sourceChain: structuredClone(item.sourceChain),
      sourceChainOverlayApplied: item.sourceChainOverlayApplied,
    })),
    exactDebateCount: 10,
    exactSideCount: 20,
    totalEventCount: selection.totals.eventCount,
    totalDurationHours: selection.totals.durationHours,
  },
  activeScoreStabilityPolicy: {
    promotion: PROMOTION,
    promotionSha256: sourceHashes[PROMOTION],
    version: promotion.activePolicy.version,
    normativeText: POLICY,
    normativeTextSha256: sourceHashes[POLICY],
    thresholds: structuredClone(promotion.activePolicy.thresholds),
    winnerRule: structuredClone(promotion.activePolicy.winnerRule),
    controlLibrary: ACTIVE_CONTROL,
    controlLibrarySha256: sourceHashes[ACTIVE_CONTROL],
    controlTest: ACTIVE_CONTROL_TEST,
    controlTestSha256: sourceHashes[ACTIVE_CONTROL_TEST],
    scorePassesMaximum: 1,
    scoreDerivationAfterFinalLedgerLockOnly: true,
    modelAuthoredScoresAllowed: false,
    thresholdMutationAllowed: false,
    resultDependentPolicyChangeAllowed: false,
    automaticRerunAllowed: false,
  },
  model: {
    ...structuredClone(productionManifest.model),
    scoreBlind: true,
    apiKeysRemoved: true,
    meteredJudgmentApiCostUsdMaximum: 0,
  },
  isolation: {
    freshTemporaryCodexHomePerContext: true,
    freshTemporaryWorkingDirectoryPerContext: true,
    oneDebateAndOneOwnedTaskPerContext: true,
    otherPassOutputsUnavailable: true,
    otherDebateOutputsUnavailable: true,
    legacyAssessmentsScoresWinnersTagsAndPublicationProseUnavailable:
      true,
    scorePolicyAnalysisUnavailableToJudgmentModels: true,
    publicationContextsUnavailableUntilScoresLock: true,
  },
  scheduling: {
    stageConcurrency: structuredClone(
      productionManifest.scheduling.stageConcurrency
    ),
    operationalRampRequiredBeforeEachModelStage: true,
    projectedCampaignHours: productionManifest.scheduling.projected179Hours,
    targetCampaignHours: productionManifest.scheduling.targetHours,
    checkpointDurationHours: selection.totals.durationHours,
  },
  audioPolicy: {
    belowHighConfidenceRequiresVerification: true,
    mediumConfidenceAlwaysRequiresVerification: true,
    paidTranscriptionFallbackAllowedOnlyAfterEstimateAndExplicitApproval: true,
    paidTranscriptionCurrentlyAuthorized: false,
    unresolvedAudioBlocksAdjudicationAndScoring: true,
  },
  stopRules: structuredClone(selection.stopRules),
  recoveryBoundary: {
    originalSelectionFailure: SELECTION_FAILURE,
    originalSelectionFailureSha256: sourceHashes[SELECTION_FAILURE],
    sourceRepairRecord: REPAIR_RECORD,
    sourceRepairRecordSha256: sourceHashes[REPAIR_RECORD],
    originalFailurePreserved: true,
    replacementDebatesUsed: 0,
    sourceChainOverlaysUsed: 1,
    overlayDebateNumbers: ["167"],
    frozenProductionManifestMutated: false,
    rawDiarizedTranscriptMutated: false,
  },
  stageBoundary: {
    sourcePreparation: "authorized",
    discoveryExecutionManifestPreparation: "not-authorized",
    discoveryModelExecution: "not-authorized",
    inventoryPreparation: "not-authorized",
    inventoryModelExecution: "not-authorized",
    independentJudgmentPacketPreparation: "not-authorized",
    independentJudgmentModelExecution: "not-authorized",
    audioVerification: "not-authorized",
    adjudicationPreparation: "not-authorized",
    adjudicationModelExecution: "not-authorized",
    finalLedgerAssembly: "not-authorized",
    scoreDerivation: "not-authorized",
    publicationPacketPreparation: "not-authorized",
    publicationModelExecution: "not-authorized",
    productionMutation: "not-authorized",
    remainingProductionBatches: "not-authorized",
  },
  sourceHashes,
  authorization: {
    sourcePreparation: true,
    discoveryExecutionManifestPreparation: false,
    discoveryModelExecution: false,
    inventoryPreparation: false,
    inventoryModelExecution: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    paidTranscription: false,
    audioVerification: false,
    adjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationPacketPreparation: false,
    publicationModelExecution: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction:
    "prepare-complete-production-checkpoint-v2.2-source-packets-model-free-only",
};
if (shouldWrite) {
  await writeFile(path.resolve(OUTPUT), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? manifest.status : "preview",
      debates: manifest.cohort.debates.map((item) => item.debateNumber),
      activePolicy: manifest.activeScoreStabilityPolicy.version,
      sourceChainOverlays: manifest.recoveryBoundary.sourceChainOverlaysUsed,
      scorePassesMaximum: 1,
      modelContexts: 0,
      directCostUsd: 0,
      sourcePreparationAuthorized: true,
      modelExecutionAuthorized: false,
      productionMutationAuthorized: false,
      nextAuthorized: manifest.nextAuthorizedAction,
    },
    null,
    2
  )
);
