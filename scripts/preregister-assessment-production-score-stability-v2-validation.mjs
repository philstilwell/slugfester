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
const root =
  "docs/assessment-production/score-stability-v2-validation-cohort";
const manifestPath = `${root}/validation-manifest.json`;
if (shouldWrite) {
  await access(manifestPath).then(
    () => {
      throw new Error(`${manifestPath} already exists`);
    },
    () => true
  );
}
const selectionPath = `${root}/selection.json`;
const policyPath =
  "docs/assessment-production/score-stability-policy-v2-proposal.md";
const retrospectiveAuditPath =
  "docs/assessment-production/score-stability-policy-v2-retrospective-audit.json";
const failedCanaryDiagnosisPath =
  "docs/assessment-production/canary-v1-score-pass/failure-diagnosis.json";
const [selection, retrospectiveAudit, failedCanaryDiagnosis] =
  await Promise.all(
    [selectionPath, retrospectiveAuditPath, failedCanaryDiagnosisPath].map(
      (file) => readFile(path.resolve(file), "utf8").then(JSON.parse)
    )
  );
assertV4(
  selection.status ===
    "fresh-disjoint-ten-debate-cohort-source-gate-passed" &&
    selection.authorization.freshValidationManifestPreparation &&
    !selection.authorization.inventoryModelExecution &&
    !selection.authorization.paidTranscription &&
    retrospectiveAudit.status ===
      "retrospective-diagnostic-supports-v2-fresh-validation-still-required" &&
    failedCanaryDiagnosis.status ===
      "confirmed-single-rounding-edge-winner-preservation-failure" &&
    !failedCanaryDiagnosis.decision.canaryPassed,
  "fresh score-stability-v2 validation manifest is not authorized"
);
const sourceFiles = [
  selectionPath,
  policyPath,
  retrospectiveAuditPath,
  failedCanaryDiagnosisPath,
  "docs/assessment-production-workflow.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/reassessment-rubric-v4.0.md",
  "docs/reassessment-rubric-v4.0.1.md",
  "docs/reassessment-rubric-v4.1.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/assessment-production/manifest-v1.json",
  "src/data/debates.js",
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/assessment-production-score-stability-policy-v2.mjs",
  "scripts/preregister-assessment-production-score-stability-v2-validation.mjs",
  "scripts/test-assessment-production-score-stability-v2-validation.mjs",
  ...selection.selected.flatMap((item) => [
    item.sourceChain.transcript,
    item.sourceChain.events,
    item.sourceChain.manifest,
  ]),
];
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
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
    "1.0-score-stability-v2-fresh-validation-master-manifest",
  protocolId: "assessment-production-score-stability-v2-fresh-validation",
  status:
    "frozen-fresh-disjoint-ten-debate-score-stability-v2-validation",
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
  proposedPolicy: {
    version: "v2-proposal",
    path: policyPath,
    sha256: sourceHashes[policyPath],
    promoted: false,
    exactPublishedScoreFormulaUnchanged: true,
    exactRoundedWinnerPreservationReplacedProspectively: true,
    agreedNonTieWinnerRule:
      "final unrounded adjusted total may tie but may not favor the opposite side",
    agreedTieRule: "final rounded winner must remain tie",
    meanAbsoluteDistanceToInitialPassesMaximum: 4,
    maximumAbsoluteDistanceToEitherInitialPassMaximum: 8,
    maximumOutsideInitialRangeMaximum: 3,
    postResultTuningAllowed: false,
    automaticRerunAllowed: false,
  },
  cohort: {
    selection: selectionPath,
    debates: selection.selected.map((item) => ({
      debateNumber: item.debateNumber,
      debateId: item.debateId,
      videoId: item.videoId,
      eventCount: item.eventCount,
      durationSeconds: item.durationSeconds,
      sourceChain: structuredClone(item.sourceChain),
    })),
    totals: structuredClone(selection.totals),
    disjointFromObservedCalibrationAndCanary: true,
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
    oneDebatePerJudgmentContext: true,
    twoIndependentJudgmentsPerDebate: true,
    scoreBlindUntilFinalLedgerLock: true,
    legacyAssessmentsUnavailableToModels: true,
    otherDebatesUnavailableToModels: true,
    anonymousDisputedFieldAdjudication: true,
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
  },
  costBoundary: {
    judgmentAuthentication: "ChatGPT subscription",
    meteredJudgmentApiCostUsdMaximum: 0,
    paidTranscriptionAuthorized: false,
    paidTranscriptionCostUsdMaximum: 0,
    paidTranscriptionRequiresSeparateEstimateAndApproval: true,
  },
  stagePlan: [
    {
      stage: "source-preparation-packets",
      status: "authorized",
      modelExecution: false,
    },
    {
      stage: "discovery-execution",
      status: "blocked-pending-frozen-stage-manifest",
      modelExecution: true,
    },
    {
      stage: "inventory",
      status: "blocked-pending-prior-gate",
      modelExecution: true,
    },
    {
      stage: "independent-judgments",
      status: "blocked-pending-prior-gate",
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
      stage: "v2-readiness-decision",
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
    sourcePreparationPacketPreparation: true,
    discoveryModelExecution: false,
    inventoryModelExecution: false,
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
  await writeFile(
    path.resolve(manifestPath),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
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
      paidTranscriptionAuthorized: false,
      modelExecutionAuthorized: false,
      nextAuthorized: "source-preparation-packet-preparation-only",
    },
    null,
    2
  )
);
