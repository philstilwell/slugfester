#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  !shouldWrite || (frozenAt && !Number.isNaN(Date.parse(frozenAt))),
  "--write requires --frozen-at with an ISO timestamp"
);

const VALIDATION_ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort";
const ROOT = `${VALIDATION_ROOT}/inventory-side-partitioned-selection-map-successor`;
const MANIFEST = `${ROOT}/execution-manifest.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const OUTPUT = `${ROOT}/failure-diagnosis.json`;
const ORIGINAL_EXECUTION = `${VALIDATION_ROOT}/inventory/model-execution.json`;
const ORIGINAL_PREPARATION = `${VALIDATION_ROOT}/inventory/preparation-manifest.json`;
const ORIGINAL_TIMEOUT_DIAGNOSIS =
  `${VALIDATION_ROOT}/inventory-columnar-recovery/timeout-diagnosis.json`;
const UNIQUE_SELECTION_FAILURE_DIAGNOSIS =
  `${VALIDATION_ROOT}/inventory-unique-selection-map-successor/failure-diagnosis.json`;
const SCRIPT =
  "scripts/diagnose-assessment-production-score-stability-v2-inventory-side-partitioned-selection-map-successor-timeout.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2-inventory-side-partitioned-selection-map-successor-timeout-diagnosis.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function overlapUnionMs(target, others) {
  const start = Date.parse(target.startedAt);
  const end = Date.parse(target.completedAt);
  const intersections = others
    .map((other) => [
      Math.max(start, Date.parse(other.startedAt)),
      Math.min(end, Date.parse(other.completedAt)),
    ])
    .filter(([left, right]) => right > left)
    .sort((left, right) => left[0] - right[0]);
  const merged = [];
  for (const interval of intersections) {
    const prior = merged.at(-1);
    if (!prior || interval[0] > prior[1]) merged.push([...interval]);
    else prior[1] = Math.max(prior[1], interval[1]);
  }
  return merged.reduce((sum, [left, right]) => sum + right - left, 0);
}

if (shouldWrite) {
  assertV4(
    !(await exists(OUTPUT)),
    `${OUTPUT} already exists; diagnosis is immutable`
  );
}

const [
  manifestBytes,
  executionBytes,
  preparationBytes,
  originalExecutionBytes,
  originalPreparationBytes,
  originalTimeoutDiagnosisBytes,
  uniqueSelectionFailureDiagnosisBytes,
] = await Promise.all([
  readFile(MANIFEST),
  readFile(EXECUTION),
  readFile(PREPARATION),
  readFile(ORIGINAL_EXECUTION),
  readFile(ORIGINAL_PREPARATION),
  readFile(ORIGINAL_TIMEOUT_DIAGNOSIS),
  readFile(UNIQUE_SELECTION_FAILURE_DIAGNOSIS),
]);
const manifest = JSON.parse(manifestBytes);
const execution = JSON.parse(executionBytes);
const preparation = JSON.parse(preparationBytes);
const originalExecution = JSON.parse(originalExecutionBytes);
const originalPreparation = JSON.parse(originalPreparationBytes);
const originalTimeoutDiagnosis = JSON.parse(originalTimeoutDiagnosisBytes);
const uniqueSelectionFailureDiagnosis = JSON.parse(
  uniqueSelectionFailureDiagnosisBytes
);

for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(
    sha256(await readFile(file)) === digest,
    `manifest source hash drift: ${file}`
  );
}
assertV4(
  manifest.status ===
      "frozen-ten-fresh-side-partitioned-selection-map-v2-validation-score-blind-inventory-successor-contexts-authorized" &&
    manifest.model?.label === "5.6 Sol" &&
    manifest.model?.slug === "gpt-5.6-sol" &&
    manifest.model?.reasoningEffort === "low" &&
    manifest.model?.authentication === "ChatGPT subscription" &&
    manifest.executionPolicy?.attemptsPerContext === 1 &&
    manifest.executionPolicy?.retriesMaximum === 0 &&
    manifest.executionPolicy?.timeoutMsPerContext === 600000 &&
    manifest.executionPolicy?.timeoutExtensionApplied === false &&
    manifest.priorFailedGateEvidence?.allThreeGatesPreservedAsFailed === true &&
    manifest.authorization?.failureDiagnosisOnGateFailure === true &&
    manifest.authorization?.retry === false,
  "frozen side-partitioned successor boundary drifted"
);
assertV4(
  execution.status ===
      "v2-validation-score-blind-inventory-side-partitioned-selection-map-successor-complete-with-failure" &&
    execution.contextsPlanned === 10 &&
    execution.contextsAttempted === 10 &&
    execution.contextsUnattempted === 0 &&
    execution.validContexts === 9 &&
    execution.invalidContexts === 1 &&
    execution.attempts === 10 &&
    execution.retries === 0 &&
    execution.rampPassed === false &&
    execution.rampPhases?.length === 3 &&
    execution.rampPhases[0]?.passed === true &&
    execution.rampPhases[1]?.passed === true &&
    execution.rampPhases[2]?.passed === false &&
    execution.authorization?.failureDiagnosis === true &&
    execution.authorization?.deterministicPassingAnalysis === false &&
    execution.authorization?.independentJudgmentPacketPreparation === false &&
    execution.scoresDerived === 0,
  "side-partitioned successor failure ledger drifted"
);
assertV4(
  originalExecution.status ===
      "v2-validation-score-blind-inventory-complete-with-failure" &&
    originalExecution.validContexts === 9 &&
    originalExecution.invalidContexts === 1 &&
    originalExecution.retries === 0 &&
    originalTimeoutDiagnosis.status ===
      "failed-inventory-gate-preserved-columnar-full-cohort-successor-preparation-authorized" &&
    uniqueSelectionFailureDiagnosis.status ===
      "unique-selection-map-successor-gate-failed-section-side-cardinality-confirmed-no-further-action-authorized",
  "prior failed-gate evidence drifted"
);

const currentFailures = execution.results.filter((result) => !result.accepted);
const currentValid = execution.results.filter((result) => result.accepted);
const originalFailures = originalExecution.results.filter(
  (result) => !result.accepted
);
assertV4(
  currentFailures.length === 1 && originalFailures.length === 1,
  "exactly one failure is required in each full-ten gate"
);
const currentFailure = currentFailures[0];
const originalFailure = originalFailures[0];
for (const [label, failure] of [
  ["current", currentFailure],
  ["original", originalFailure],
]) {
  assertV4(
    failure.debateNumber === "137" &&
      failure.status === "timed-out" &&
      failure.timedOut === true &&
      failure.elapsedMs >= 600000 &&
      failure.timeoutMsApplied === 600000 &&
      failure.attemptCount === 1 &&
      failure.retryCount === 0 &&
      failure.proposalWritten === false &&
      failure.stdoutSha256 === sha256(Buffer.alloc(0)) &&
      failure.terminationSignal === "SIGTERM",
    `${label} Debate 137 timeout record drifted`
  );
}

const currentContext = preparation.contexts.find(
  (context) => context.debateNumber === "137"
);
const originalContext = originalPreparation.contexts.find(
  (context) => context.debateNumber === "137"
);
assertV4(
  currentContext?.candidates === 43 && originalContext?.candidates === 43,
  "Debate 137 context drifted"
);
assertV4(
  !(await exists(currentContext.proposalOutput)) &&
    !(await exists(currentContext.lockedInventoryOutput)) &&
    !(await exists(currentContext.validationOutput)) &&
    !(await exists(currentContext.provenanceOutput)) &&
    !(await exists(`${ROOT}/analysis.json`)),
  "failed Debate 137 or passing analysis has a premature artifact"
);
for (const result of currentValid) {
  const context = preparation.contexts[result.contextIndex];
  assertV4(
    result.proposalSha256 === sha256(await readFile(context.proposalOutput)) &&
      result.lockedInventorySha256 ===
        sha256(await readFile(context.lockedInventoryOutput)) &&
      result.validationSha256 === sha256(await readFile(context.validationOutput)) &&
      result.provenanceSha256 === sha256(await readFile(context.provenanceOutput)),
    `${result.debateNumber}: preserved valid artifact hash drifted`
  );
}

const currentOverlapMs = overlapUnionMs(currentFailure, currentValid);
const currentValidElapsed = currentValid.map((result) => result.elapsedMs);
const sourceFiles = [
  MANIFEST,
  EXECUTION,
  PREPARATION,
  ORIGINAL_EXECUTION,
  ORIGINAL_PREPARATION,
  ORIGINAL_TIMEOUT_DIAGNOSIS,
  UNIQUE_SELECTION_FAILURE_DIAGNOSIS,
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-inventory-execution-workflow.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map-successor-stage.mjs",
  SCRIPT,
  TEST,
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const diagnosis = {
  schemaVersion:
    "1.0-score-stability-v2-side-partitioned-selection-map-inventory-successor-timeout-diagnosis",
  protocolId: manifest.protocolId,
  status:
    "side-partitioned-selection-map-successor-gate-failed-repeat-debate-137-timeout-confirmed-no-further-action-authorized",
  diagnosedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  gateDisposition: {
    execution: EXECUTION,
    executionSha256: sha256(executionBytes),
    status: execution.status,
    contextsPlanned: 10,
    contextsAttempted: 10,
    contextsUnattempted: 0,
    validContexts: 9,
    invalidContexts: 1,
    retries: 0,
    acceptedAsPassed: false,
    predecessorTimeoutGatePreservedFailed: true,
    columnarRecoveryGatePreservedFailed: true,
    uniqueSelectionSuccessorGatePreservedFailed: true,
    sidePartitionedSelectionSuccessorGatePreservedFailed: true,
    currentCanaryReclassified: false,
    proposedPolicyPromoted: false,
  },
  failure: {
    contextIndex: currentFailure.contextIndex,
    debateNumber: currentFailure.debateNumber,
    status: currentFailure.status,
    classification:
      "second-frozen-ten-minute-no-result-timeout-for-debate-137-after-lossless-columnar-and-side-partitioned-topology",
    elapsedMs: currentFailure.elapsedMs,
    timeoutMsApplied: currentFailure.timeoutMsApplied,
    terminationSignal: currentFailure.terminationSignal,
    stdoutEmpty: currentFailure.stdoutSha256 === sha256(Buffer.alloc(0)),
    resultWritten: false,
    proposalWritten: false,
    deterministicValidationReached: false,
    semanticCorrectionPerformed: false,
    retryPerformed: false,
  },
  repeatedTimeoutEvidence: {
    occurrences: 2,
    debateNumber: "137",
    sameModel: "5.6 Sol",
    sameReasoningEffort: "low",
    sameAuthentication: "ChatGPT subscription",
    sameTimeoutMs: 600000,
    bothStdoutEmpty: true,
    bothWithoutProposal: true,
    original: {
      execution: ORIGINAL_EXECUTION,
      executionSha256: sha256(originalExecutionBytes),
      elapsedMs: originalFailure.elapsedMs,
      copiedInputBytes: originalContext.copiedInputBytes,
      modelTransportBytes: originalContext.modelTransportBytes,
      schemaBytes: originalContext.schemaBytes,
      overlapWithOtherContextsMs:
        originalTimeoutDiagnosis.failedContext.overlapWithOtherContextsMs,
      executionWithoutOtherActiveContextsMs:
        originalTimeoutDiagnosis.failedContext.executionWithoutOtherActiveContextsMs,
    },
    sidePartitionedSuccessor: {
      execution: EXECUTION,
      executionSha256: sha256(executionBytes),
      elapsedMs: currentFailure.elapsedMs,
      copiedInputBytes: currentContext.copiedInputBytes,
      modelTransportBytes: currentContext.modelTransportBytes,
      schemaBytes: currentContext.schemaBytes,
      overlapWithOtherContextsMs: currentOverlapMs,
      executionWithoutOtherActiveContextsMs:
        currentFailure.elapsedMs - currentOverlapMs,
    },
    copiedInputReductionBytes:
      originalContext.copiedInputBytes - currentContext.copiedInputBytes,
    copiedInputReductionFraction: Number(
      (
        (originalContext.copiedInputBytes - currentContext.copiedInputBytes) /
        originalContext.copiedInputBytes
      ).toFixed(4)
    ),
  },
  cohortDiagnostics: {
    validContextElapsedMsMinimum: Math.min(...currentValidElapsed),
    validContextElapsedMsMedian: median(currentValidElapsed),
    validContextElapsedMsMaximum: Math.max(...currentValidElapsed),
    failedContextHasMaximumCandidateCount:
      currentContext.candidates ===
      Math.max(...preparation.contexts.map((context) => context.candidates)),
    failedContextHasMaximumCopiedInputBytes:
      currentContext.copiedInputBytes ===
      Math.max(...preparation.contexts.map((context) => context.copiedInputBytes)),
    failedContextHasMaximumSchemaBytes:
      currentContext.schemaBytes ===
      Math.max(...preparation.contexts.map((context) => context.schemaBytes)),
    deterministicPacketSizeCauseEstablished: false,
    deterministicConcurrencyCauseEstablished: false,
    exactCause: "indeterminate-no-result-or-progress-output-before-timeout",
  },
  designFinding: {
    sidePartitionedTopologyRemovedPriorDebate31FailureMode: true,
    debate31PassedCurrentGate: true,
    duplicateCandidateSelectionRepresentable: false,
    wrongSideCandidateKeyRepresentable: false,
    positionCollisionRepresentable: false,
    debate137OutputSemanticsEvaluated: false,
    losslessColumnarTransportSufficientToGuaranteeCompletion: false,
    sidePartitionedTopologySufficientToGuaranteeCompletion: false,
    repeatedDebateSpecificTimeoutConfirmed: true,
    exactCauseEstablished: false,
    partialOutputAvailableForRepair: false,
    automaticRepairPermitted: false,
    retryPermitted: false,
    timeoutExtensionPermitted: false,
  },
  possibleFutureProtocolDirection: {
    authorized: false,
    description:
      "A separately authorized model-free development stage would need to test whether Debate 137's inventory task can be decomposed into smaller isolated score-blind contracts while preserving identical inventory semantics, repository-owned chronology, deterministic compilation, and a full fresh ten-context acceptance gate.",
    requirements: [
      "no reuse of any output from the four failed gates for successor acceptance",
      "no timeout extension and no retry of a failed context",
      "new versioned contracts and deterministic composition",
      "model-free retired-artifact regression before fresh execution",
      "proof that side partition, candidate uniqueness, and repository ordering remain structural",
      "proof that section-side cardinality remains deterministic and fail closed",
      "new frozen full-ten execution manifest",
      "explicit user authorization before development or model execution",
    ],
  },
  sourceHashes,
  totals: {
    modelContextsThisDiagnosis: 0,
    audioCalls: 0,
    transcriptionCalls: 0,
    retries: 0,
    semanticCorrections: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  authorization: {
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    successorProtocolDevelopment: false,
    successorPreparation: false,
    successorExecutionManifest: false,
    successorModelExecution: false,
    deterministicPassingAnalysis: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    paidTranscription: false,
    audioVerification: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction: "none-without-explicit-user-authorization",
};

if (shouldWrite) await writeFile(OUTPUT, jsonBytes(diagnosis));
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? "frozen" : "preview",
      diagnosisStatus: diagnosis.status,
      failedDebate: diagnosis.failure.debateNumber,
      repeatedTimeouts: diagnosis.repeatedTimeoutEvidence.occurrences,
      validContexts: diagnosis.gateDisposition.validContexts,
      invalidContexts: diagnosis.gateDisposition.invalidContexts,
      failedGatesPreserved: 4,
      retries: 0,
      scoresDerived: 0,
      modelContextsThisDiagnosis: 0,
      nextAuthorizedAction: diagnosis.nextAuthorizedAction,
    },
    null,
    2
  )
);
