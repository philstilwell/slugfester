#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const ROOT =
  "docs/assessment-production/score-stability-v2.1-validation-cohort";
const MANIFEST = `${ROOT}/validation-manifest.json`;
const SELECTION = `${ROOT}/selection.json`;
const POLICY =
  "docs/assessment-production/score-stability-policy-v2.1-proposal.md";
const RECOVERY_ANALYSIS =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-candidate-sharded-development/development-analysis.json";
const FAILED_CANARY_DIAGNOSIS =
  "docs/assessment-production/canary-v1-score-pass/failure-diagnosis.json";
const SCRIPT =
  "scripts/preregister-assessment-production-score-stability-v2.1-validation.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.1-validation.mjs";

if (shouldWrite) {
  await access(MANIFEST).then(
    () => {
      throw new Error(`${MANIFEST} already exists; manifest is immutable`);
    },
    () => true
  );
}

const [selection, recoveryAnalysis, failedCanaryDiagnosis] = await Promise.all(
  [SELECTION, RECOVERY_ANALYSIS, FAILED_CANARY_DIAGNOSIS].map((file) =>
    readFile(file, "utf8").then(JSON.parse)
  )
);
assertV4(
  selection.status ===
      "fresh-disjoint-v2.1-ten-debate-cohort-source-gate-passed" &&
    selection.authorization.candidateShardedPreparation === true &&
    selection.authorization.executionManifest === false &&
    selection.authorization.discoveryModelExecution === false &&
    selection.authorization.inventoryModelExecution === false &&
    selection.authorization.paidTranscription === false &&
    recoveryAnalysis.status ===
      "candidate-sharded-retired-regression-and-adversarial-development-passed-fresh-disjoint-cohort-selection-authorized" &&
    recoveryAnalysis.failedGateDisposition.everyFailedGatePreservedFailed ===
      true &&
    recoveryAnalysis.failedGateDisposition.quarantinedFiles === 106 &&
    failedCanaryDiagnosis.status ===
      "confirmed-single-rounding-edge-winner-preservation-failure" &&
    failedCanaryDiagnosis.decision.canaryPassed === false,
  "fresh score-stability v2.1 validation manifest is not authorized"
);

const sourceFiles = [
  SELECTION,
  POLICY,
  RECOVERY_ANALYSIS,
  FAILED_CANARY_DIAGNOSIS,
  "docs/assessment-production-workflow.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/reassessment-rubric-v4.0.md",
  "docs/reassessment-rubric-v4.0.1.md",
  "docs/reassessment-rubric-v4.1.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/assessment-production/manifest-v1.json",
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-candidate-sharded-development/candidate-sharded-inventory-guide.md",
  "src/data/debates.js",
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/assessment-production-score-stability-policy-v2.1.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs",
  SCRIPT,
  TEST,
  ...selection.selected.flatMap((item) => [
    item.sourceChain.transcript,
    item.sourceChain.events,
    item.sourceChain.manifest,
  ]),
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}
for (const item of selection.selected) {
  assertV4(
    sourceHashes[item.sourceChain.transcript] ===
        item.sourceChain.transcriptSha256 &&
      sourceHashes[item.sourceChain.events] === item.sourceChain.eventsSha256 &&
      sourceHashes[item.sourceChain.manifest] ===
        item.sourceChain.manifestSha256,
    `Debate ${item.debateNumber}: selected source hash drifted`
  );
}

const manifest = {
  schemaVersion:
    "1.0-score-stability-v2.1-fresh-validation-master-manifest",
  protocolId: "assessment-production-score-stability-v2.1-fresh-validation",
  status:
    "frozen-fresh-disjoint-ten-debate-score-stability-v2.1-validation",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  currentCanaryDisposition: {
    version: "v1",
    status: "failed-under-frozen-exact-rounded-winner-rule",
    reclassified: false,
    rerunAuthorized: false,
  },
  priorV2ValidationDisposition: {
    status:
      "score-stability-v2-fresh-validation-failed-at-inventory-policy-not-promoted",
    gatesAttempted: 5,
    gatesPassed: 0,
    quarantinedFiles: 106,
    priorOutputsReusableForAcceptance: false,
    priorOutputsReusableAsFreshModelInput: false,
  },
  proposedPolicy: {
    version: "v2.1-proposal",
    path: POLICY,
    sha256: sourceHashes[POLICY],
    promoted: false,
    exactPublishedScoreFormulaUnchanged: true,
    everyIntegerRoundedTieAccepted: true,
    unroundedDirectionDiagnosticOnlyForRoundedTies: true,
    agreedNonTieWinnerRule:
      "final published integer winner may preserve the agreed side or collapse to tie but may not favor the opposite side",
    agreedTieRule: "final rounded winner must remain tie",
    meanAbsoluteDistanceToInitialPassesMaximum: 4,
    maximumAbsoluteDistanceToEitherInitialPassMaximum: 8,
    maximumOutsideInitialRangeMaximum: 3,
    postResultTuningAllowed: false,
    automaticRerunAllowed: false,
  },
  cohort: {
    selection: SELECTION,
    debates: selection.selected.map((item) => ({
      debateNumber: item.debateNumber,
      debateId: item.debateId,
      videoId: item.videoId,
      eventCount: item.eventCount,
      durationSeconds: item.durationSeconds,
      sourceChain: structuredClone(item.sourceChain),
    })),
    totals: structuredClone(selection.totals),
    disjointFromCalibrationCanaryAndFailedV2Validation: true,
    deterministicReplacementProhibited: true,
  },
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
  },
  isolation: {
    freshTemporaryCodexHomePerContext: true,
    APIKeysRemoved: true,
    oneDebatePerContext: true,
    candidateCensusPlannerIsolated: true,
    proAndConSelectorsMutuallyIsolated: true,
    oneDebatePerJudgmentContext: true,
    twoIndependentJudgmentsPerDebate: true,
    scoreBlindUntilFinalLedgerLock: true,
    legacyAssessmentsUnavailableToModels: true,
    otherDebatesUnavailableToModels: true,
    anonymousDisputedFieldAdjudication: true,
  },
  candidateShardedInventory: {
    contextsPerDebate: 3,
    stages: [
      "candidate-census-plan",
      "pro-candidate-evidence-selection",
      "con-candidate-evidence-selection",
    ],
    deterministicCardinalityRule:
      "priority-tier-then-chronology-retain-first-two-per-section-side",
    missingSectionSideCoverageFailsClosed: true,
    modelAuthoredScoresProhibited: true,
  },
  scheduling: {
    discoveryMaximumConcurrency: 4,
    inventoryMaximumConcurrency: 2,
    independentJudgmentMaximumConcurrency: 2,
    audioMaximumConcurrency: 2,
    adjudicationMaximumConcurrency: 2,
    publicationMaximumConcurrency: 2,
    attemptsPerContext: 1,
    automaticRetriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
  },
  costBoundary: {
    modelAuthentication: "ChatGPT subscription",
    meteredModelApiCostUsdMaximum: 0,
    paidTranscriptionAuthorized: false,
    paidTranscriptionCostUsdMaximum: 0,
    paidTranscriptionRequiresSeparateEstimateAndApproval: true,
  },
  stagePlan: [
    {
      stage: "source-preparation-packets-and-discovery-schemas",
      status: "authorized",
      modelExecution: false,
    },
    {
      stage: "discovery-execution",
      status: "blocked-pending-frozen-stage-manifest",
      modelExecution: true,
    },
    {
      stage: "candidate-sharded-inventory",
      status: "blocked-pending-discovery-gate",
      modelExecution: true,
    },
    {
      stage: "independent-judgments",
      status: "blocked-pending-inventory-gate",
      modelExecution: true,
    },
    {
      stage: "audio-verification",
      status: "blocked-pending-trigger-and-cost-boundary",
      modelExecution: false,
    },
    {
      stage: "dispute-only-adjudication",
      status: "blocked-pending-prior-gate",
      modelExecution: true,
    },
    {
      stage: "final-ledger-assembly",
      status: "blocked-pending-prior-gate",
      modelExecution: false,
    },
    {
      stage: "single-score-pass",
      status: "blocked-pending-final-ledger-lock",
      modelExecution: false,
    },
    {
      stage: "v2.1-readiness-decision",
      status: "blocked-pending-score-gate",
      modelExecution: false,
    },
  ],
  stopRules: {
    sourceHashMismatchBlocks: true,
    speakerCountAmbiguityBlocks: true,
    multiSpeakerFormatBlocks: true,
    invalidModelOutputBlocks: true,
    isolationFailureBlocks: true,
    missingSectionSideCoverageBlocks: true,
    belowHighConfidenceRequiresAudioVerification: true,
    unresolvedAudioBlocks: true,
    unresolvedDisputeBlocks: true,
    invalidFinalLedgerBlocks: true,
    modelAuthoredScoreBlocks: true,
    scorePolicyFailureBlocks: true,
    postResultPolicyChangeBlocks: true,
    publicationPreparationBeforeReadinessBlocks: true,
    productionMutationBlocks: true,
    remainingProductionBatchesBlock: true,
  },
  sourceHashes,
  authorization: {
    sourcePreparationPacketAndSchemaPreparation: true,
    discoveryExecutionManifestPreparation: false,
    discoveryModelExecution: false,
    inventoryPreparation: false,
    inventoryModelExecution: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    paidTranscription: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
};

if (shouldWrite) {
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? manifest.status : "preview",
      debates: manifest.cohort.debates.map((item) => item.debateNumber),
      eventCount: manifest.cohort.totals.eventCount,
      durationHours: manifest.cohort.totals.durationHours,
      sourceHashes: Object.keys(sourceHashes).length,
      model: manifest.model,
      modelExecutionAuthorized: false,
      paidTranscriptionAuthorized: false,
      nextAuthorized: "source-packet-and-discovery-schema-preparation-only",
    },
    null,
    2
  )
);
