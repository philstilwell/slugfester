#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const diagnosedIndex = process.argv.indexOf("--diagnosed-at");
const diagnosedAt = diagnosedIndex >= 0 ? process.argv[diagnosedIndex + 1] : null;
assertV4(
  !shouldWrite || (diagnosedAt && !Number.isNaN(Date.parse(diagnosedAt))),
  "--write requires --diagnosed-at with an ISO timestamp"
);

const ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-decomposed-plan-selection-successor";
const MANIFEST = `${ROOT}/execution-manifest.json`;
const PLAN_EXECUTION = `${ROOT}/plan-model-execution.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const DIAGNOSIS = `${ROOT}/failure-diagnosis.json`;
const SIDE_ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-side-partitioned-selection-map-successor";
const ORIGINAL_EXECUTION =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory/model-execution.json";
const SCRIPT =
  "scripts/diagnose-assessment-production-score-stability-v2-inventory-decomposed-plan-selection-successor-failure.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2-inventory-decomposed-plan-selection-successor-failure-diagnosis.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

if (shouldWrite) {
  assertV4(!(await exists(DIAGNOSIS)), `${DIAGNOSIS} already exists`);
}
const [manifest, planExecution, execution, sidePreparation, sideExecution, sideDiagnosis, originalExecution] =
  await Promise.all([
    readFile(MANIFEST, "utf8").then(JSON.parse),
    readFile(PLAN_EXECUTION, "utf8").then(JSON.parse),
    readFile(EXECUTION, "utf8").then(JSON.parse),
    readFile(`${SIDE_ROOT}/preparation-manifest.json`, "utf8").then(JSON.parse),
    readFile(`${SIDE_ROOT}/model-execution.json`, "utf8").then(JSON.parse),
    readFile(`${SIDE_ROOT}/failure-diagnosis.json`, "utf8").then(JSON.parse),
    readFile(ORIGINAL_EXECUTION, "utf8").then(JSON.parse),
  ]);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `manifest hash mismatch: ${file}`);
}
const failed = planExecution.results.filter((result) => !result.accepted);
assertV4(
  manifest.status ===
      "frozen-ten-fresh-decomposed-plan-selection-v2-validation-score-blind-inventory-successor-stage-contexts-authorized" &&
    execution.status ===
      "v2-validation-score-blind-inventory-decomposed-plan-selection-successor-complete-with-failure" &&
    planExecution.status === "inventory-plan-stage-failed" &&
    planExecution.contextsAttempted === 10 &&
    planExecution.validContexts === 8 &&
    planExecution.invalidContexts === 2 &&
    planExecution.retries === 0 &&
    failed.map((result) => result.debateNumber).join(",") === "93,137" &&
    failed.every(
      (result) =>
        result.status === "timed-out" &&
        result.timedOut === true &&
        result.timeoutMsApplied === 600000 &&
        result.stdoutTail === "" &&
        result.commandExitCode === null &&
        result.terminationSignal === "SIGTERM"
    ) &&
    execution.validSelections === 0 &&
    execution.selectionExecution === null &&
    execution.authorization?.failureDiagnosis === true &&
    execution.authorization?.retry === false &&
    execution.authorization?.independentJudgmentPacketPreparation === false,
  "failed decomposed plan gate evidence drifted"
);

const sideByDebate = new Map(
  sidePreparation.contexts.map((context) => [context.debateNumber, context])
);
const sideResultByDebate = new Map(
  sideExecution.results.map((result) => [result.debateNumber, result])
);
const original137 = originalExecution.results.find(
  (result) => result.debateNumber === "137"
);
assertV4(
  sideResultByDebate.get("93")?.accepted === true &&
    sideResultByDebate.get("137")?.status === "timed-out" &&
    original137?.status === "timed-out" &&
    sideDiagnosis.repeatedTimeoutEvidence?.occurrences === 2,
  "historical timeout comparison drifted"
);

function overlapMs(target, records) {
  const start = Date.parse(target.startedAt);
  const end = Date.parse(target.completedAt);
  const intervals = records
    .filter((record) => record !== target)
    .map((record) => [
      Math.max(start, Date.parse(record.startedAt)),
      Math.min(end, Date.parse(record.completedAt)),
    ])
    .filter(([left, right]) => right > left)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let current = null;
  for (const interval of intervals) {
    if (!current || interval[0] > current[1]) {
      if (current) total += current[1] - current[0];
      current = [...interval];
    } else current[1] = Math.max(current[1], interval[1]);
  }
  if (current) total += current[1] - current[0];
  return total;
}

const timeoutRecords = failed.map((result) => {
  const context = manifest.contexts[result.contextIndex];
  const priorContext = sideByDebate.get(result.debateNumber);
  const priorResult = sideResultByDebate.get(result.debateNumber);
  const overlap = overlapMs(result, planExecution.results);
  return {
    debateNumber: result.debateNumber,
    status: result.status,
    elapsedMs: result.elapsedMs,
    timeoutMs: result.timeoutMsApplied,
    copiedInputBytes: result.copiedInputBytes,
    priorSidePartitionedCopiedInputBytes: priorContext.copiedInputBytes,
    copiedInputReductionBytes:
      priorContext.copiedInputBytes - result.copiedInputBytes,
    copiedInputReductionFraction: Number(
      ((priorContext.copiedInputBytes - result.copiedInputBytes) /
        priorContext.copiedInputBytes).toFixed(4)
    ),
    candidates: context.candidates,
    stdoutEmpty: result.stdoutTail === "",
    resultAvailable: false,
    planAvailable: false,
    selectionSchemaAvailable: false,
    overlapWithOtherPlanContextsMs: overlap,
    executionWithoutOtherActivePlanContextsMs: Math.max(
      0,
      result.elapsedMs - overlap
    ),
    priorSidePartitionedDisposition: priorResult.status,
    priorSidePartitionedElapsedMs: priorResult.elapsedMs,
  };
});

const futureArtifacts = [
  manifest.artifacts.selectionExecution,
  manifest.artifacts.analysis,
  ...manifest.artifacts.selections,
  ...manifest.artifacts.proposals,
  ...manifest.artifacts.lockedInventories,
  ...manifest.artifacts.validations,
  ...manifest.artifacts.provenance,
];
for (const file of futureArtifacts) {
  assertV4(!(await exists(file)), `downstream artifact exists after failed plan gate: ${file}`);
}

const existingGeneratedArtifacts = [];
for (const file of [
  ...manifest.artifacts.plans,
  ...manifest.artifacts.selectionSchemas,
]) {
  if (await exists(file)) existingGeneratedArtifacts.push(file);
}
const sourceFiles = [
  MANIFEST,
  PLAN_EXECUTION,
  EXECUTION,
  `${SIDE_ROOT}/preparation-manifest.json`,
  `${SIDE_ROOT}/model-execution.json`,
  `${SIDE_ROOT}/failure-diagnosis.json`,
  ORIGINAL_EXECUTION,
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-inventory-execution-workflow.md",
  "scripts/lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection-successor-stage.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs",
  SCRIPT,
  TEST,
  ...existingGeneratedArtifacts,
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const diagnosis = {
  schemaVersion:
    "1.0-score-stability-v2-decomposed-plan-selection-inventory-successor-failure-diagnosis",
  protocolId: manifest.protocolId,
  status: shouldWrite
    ? "decomposed-plan-selection-successor-gate-failed-plan-timeouts-debates-93-137-no-further-action-authorized"
    : "preview",
  diagnosedAt: shouldWrite ? diagnosedAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  gateDisposition: {
    decomposedPlanSelectionSuccessorGatePreservedFailed: true,
    planStagePassed: false,
    selectionStageStarted: false,
    currentCanaryReclassified: false,
    proposedPolicyPromoted: false,
    priorValidPlansReusableForAcceptance: false,
    retriesPerformed: 0,
    timeoutExtensionsPerformed: 0,
    semanticCorrectionsPerformed: 0,
  },
  failure: {
    stage: "inventory-plan",
    contextsPlanned: 10,
    contextsAttempted: 10,
    validPlans: 8,
    invalidPlans: 2,
    failedDebates: ["93", "137"],
    failureMode: "silent-timeout-no-result",
    timeoutRecords,
    selectorContextsExecuted: 0,
    dynamicallyGeneratedSelectionSchemas: 8,
    composedInventories: 0,
  },
  repeatedTimeoutEvidence: {
    debate137Occurrences: 3,
    originalMonolithicElapsedMs: original137.elapsedMs,
    sidePartitionedElapsedMs: sideResultByDebate.get("137").elapsedMs,
    decomposedPlanElapsedMs: failed.find((result) => result.debateNumber === "137").elapsedMs,
    allThreeStdoutEmpty: true,
    allThreeWithoutProposalOrPlan: true,
    sameModel: "5.6 Sol",
    sameReasoningEffort: "low",
    sameAuthentication: "ChatGPT subscription",
    sameTimeoutMs: 600000,
    currentPlanCopiedInputBytes: 67270,
    originalCopiedInputBytes: 77966,
    reductionFromOriginalBytes: 10696,
    reductionFromOriginalFraction: 0.1372,
  },
  cohortDiagnostics: {
    validPlanElapsedMsMinimum: Math.min(
      ...planExecution.results.filter((result) => result.accepted).map((result) => result.elapsedMs)
    ),
    validPlanElapsedMsMaximum: Math.max(
      ...planExecution.results.filter((result) => result.accepted).map((result) => result.elapsedMs)
    ),
    failedDebatesHaveMaximumCopiedInputBytes: false,
    failedDebatesHaveMaximumCandidateCount: false,
    deterministicPacketSizeCauseEstablished: false,
    deterministicConcurrencyCauseEstablished: false,
    deterministicSchemaCauseEstablished: false,
    exactCause: "indeterminate-no-result-or-progress-output-before-timeout",
  },
  designFinding: {
    decomposedContractProducedEightValidPlans: true,
    decomposedContractSufficientToGuaranteeCompletion: false,
    debate93PreviouslyCompletedMonolithicSidePartitionedContract: true,
    debate93FirstObservedTimeout: true,
    debate137RepeatedDebateSpecificTimeoutConfirmed: true,
    selectionContractFreshExecutionEvaluated: false,
    failedOutputSemanticsEvaluated: false,
    partialFailedOutputAvailableForRepair: false,
    automaticRepairPermitted: false,
    retryPermitted: false,
    timeoutExtensionPermitted: false,
    exactCauseEstablished: false,
  },
  possibleFutureProtocolDirection: {
    authorized: false,
    description:
      "Any further work would require separate explicit authorization. A model-free investigation could test still smaller route-only and section-only plan contracts and execution observability, but the present evidence does not establish that task size, schema shape, or concurrency caused either timeout.",
    requirements: [
      "preserve all five failed gates without reclassification",
      "do not reuse the eight valid plans for successor acceptance",
      "do not retry Debates 93 or 137 or extend their timeouts",
      "complete model-free regression before any fresh execution",
      "freeze a new full-ten plan and selection gate before model calls",
      "obtain explicit user authorization before development or execution",
    ],
  },
  totals: {
    planContextsExecuted: 10,
    validPlans: 8,
    invalidPlans: 2,
    selectionContextsExecuted: 0,
    retries: 0,
    audioCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  sourceHashes,
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

if (shouldWrite) await writeFile(DIAGNOSIS, jsonBytes(diagnosis));
console.log(
  JSON.stringify(
    {
      status: diagnosis.status,
      failedDebates: diagnosis.failure.failedDebates,
      validPlans: diagnosis.failure.validPlans,
      selectorContextsExecuted: 0,
      debate137TimeoutOccurrences: 3,
      exactCause: diagnosis.cohortDiagnostics.exactCause,
      retries: 0,
      meteredApiCostUsd: 0,
      nextAuthorized: diagnosis.nextAuthorizedAction,
    },
    null,
    2
  )
);
