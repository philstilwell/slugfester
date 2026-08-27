#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEBATES, ORIGINAL_CONTEXT_INDEXES, PROTOCOL_ID, ROOT } from
  "./lib/assessment-production-post-canary-batch-14-publication-resumption-2.mjs";
import { validatePostCanaryBatch14PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-14-publication-validation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--frozen-at");
const frozenAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-14/publication-reconstruction";
const ORIGINAL_PREPARATION = `${PUBLICATION_ROOT}/execution-preparation-manifest.json`;
const ORIGINAL_ACTIVATION = `${PUBLICATION_ROOT}/execution-activation.json`;
const ORIGINAL_EXECUTION = `${PUBLICATION_ROOT}/model-execution.json`;
const ORIGINAL_ANALYSIS = `${PUBLICATION_ROOT}/analysis.json`;
const DEBATE_53_ANALYSIS =
  `${PUBLICATION_ROOT}/failure-recovery/critique-repair-level-2/analysis.json`;
const RESUMPTION_1_ROOT = `${PUBLICATION_ROOT}/failure-recovery/original-unattempted-context-resumption-1`;
const RESUMPTION_1_EXECUTION = `${RESUMPTION_1_ROOT}/model-execution.json`;
const RESUMPTION_1_ANALYSIS = `${RESUMPTION_1_ROOT}/analysis.json`;
const DEBATES_110_133_REPAIR_ANALYSIS = `${RESUMPTION_1_ROOT}/critique-repair-level-2/analysis.json`;
const ACCEPTED_DEBATES = Object.freeze(["53", "69", "110", "133"]);
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const CAFFEINATE = "/usr/bin/caffeinate";

const [originalPreparationBytes, originalActivationBytes, originalExecutionBytes,
  originalAnalysisBytes, debate53AnalysisBytes, resumption1ExecutionBytes,
  resumption1AnalysisBytes, debates110133RepairAnalysisBytes] =
  await Promise.all([
    ORIGINAL_PREPARATION, ORIGINAL_ACTIVATION, ORIGINAL_EXECUTION,
    ORIGINAL_ANALYSIS, DEBATE_53_ANALYSIS, RESUMPTION_1_EXECUTION,
    RESUMPTION_1_ANALYSIS, DEBATES_110_133_REPAIR_ANALYSIS
  ].map((file) => readFile(path.resolve(file))));
const originalPreparation = JSON.parse(originalPreparationBytes);
const originalActivation = JSON.parse(originalActivationBytes);
const originalExecution = JSON.parse(originalExecutionBytes);
const originalAnalysis = JSON.parse(originalAnalysisBytes);
const debate53Analysis = JSON.parse(debate53AnalysisBytes);
const resumption1Execution = JSON.parse(resumption1ExecutionBytes);
const resumption1Analysis = JSON.parse(resumption1AnalysisBytes);
const debates110133RepairAnalysis = JSON.parse(debates110133RepairAnalysisBytes);

assertV4(
  originalPreparation.contexts?.length === 10 &&
    originalActivation.contexts?.length === 10 &&
    originalExecution.status === "post-canary-batch-14-publication-gate-complete-with-failure" &&
    originalExecution.contextsAttempted === 1 &&
    originalExecution.results?.length === 1 &&
    originalExecution.results[0].contextIndex === 0 &&
    originalExecution.results[0].debateNumber === "53" &&
    originalExecution.results[0].status === "output-validation-failed" &&
    originalExecution.results[0].outputWritten === true &&
    originalExecution.results[0].gateAcceptancePassed === false &&
    canonicalJson(originalExecution.unattemptedContextIndexes) ===
      canonicalJson([1, 2, 3, 4, 5, 6, 7, 8, 9]) &&
    originalAnalysis.status === "post-canary-batch-14-publication-output-gate-failed",
  "original publication failure boundary changed"
);
for (const [file, digest] of Object.entries(originalActivation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `original frozen source drifted: ${file}`);
}
assertV4(
  debate53Analysis.status ===
    "debate-53-two-level-field-disjoint-publication-recovery-passed-awaiting-nine-context-resumption" &&
    debate53Analysis.recoveryLevel === 2 &&
    debate53Analysis.retries === 0 &&
    debate53Analysis.validation?.status === "passed" &&
    debate53Analysis.validation?.moves === 20,
  "accepted Debate 53 recovery changed"
);
assertV4(
    resumption1Execution.status === "nine-context-publication-resumption-stopped-with-failure" &&
    resumption1Execution.contextsAttempted === 3 &&
    resumption1Execution.contextsUnattempted === 6 &&
    resumption1Execution.validContexts === 1 &&
    resumption1Execution.invalidContexts === 2 &&
    resumption1Execution.results?.[0]?.originalContextIndex === 1 &&
    resumption1Execution.results?.[0]?.debateNumber === "69" &&
    resumption1Execution.results?.[0]?.status === "completed-valid" &&
    resumption1Execution.results?.[1]?.debateNumber === "110" &&
    resumption1Execution.results?.[1]?.status === "output-validation-failed" &&
    resumption1Execution.results?.[2]?.debateNumber === "133" &&
    resumption1Execution.results?.[2]?.status === "output-validation-failed" &&
    canonicalJson(resumption1Execution.unattemptedOriginalContextIndexes) ===
      canonicalJson(ORIGINAL_CONTEXT_INDEXES) &&
    resumption1Execution.retries === 0 &&
    resumption1Analysis.status === "nine-context-publication-resumption-failed",
  "first publication resumption boundary changed"
);
assertV4(
  debates110133RepairAnalysis.status ===
    "debates-110-and-133-two-level-field-disjoint-publication-recovery-passed-awaiting-six-context-resumption" &&
    debates110133RepairAnalysis.recoveryLevel === 2 &&
    debates110133RepairAnalysis.critiques === 19 &&
    debates110133RepairAnalysis.attemptsAcrossRecoveryLevels === 14 &&
    debates110133RepairAnalysis.retries === 0,
  "accepted Debates 110 and 133 recovery changed"
);
const acceptedOutputs = [];
for (const debateNumber of ACCEPTED_DEBATES) {
  const outputPath = `${PUBLICATION_ROOT}/outputs/debate-${debateNumber}.json`;
  const packetPath = `${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`;
  const outputBytes = await readFile(path.resolve(outputPath));
  const packetBytes = await readFile(path.resolve(packetPath));
  const validation = validatePostCanaryBatch14PublicationOutput(
    JSON.parse(outputBytes), JSON.parse(packetBytes)
  );
  assertV4(validation.status === "passed", `accepted Debate ${debateNumber} no longer validates`);
  acceptedOutputs.push({ debateNumber, outputPath, outputBytes, packetPath, packetBytes, validation });
}

const contexts = ORIGINAL_CONTEXT_INDEXES.map((originalContextIndex, resumptionIndex) => {
  const original = originalPreparation.contexts[originalContextIndex];
  assertV4(
    original.contextIndex === originalContextIndex &&
      original.debateNumber === DEBATES[resumptionIndex],
    `original context ${originalContextIndex} identity changed`
  );
  return {
    ...structuredClone(original),
    resumptionIndex,
    originalContextIndex,
    priorAttemptCount: 0,
    thisIsOriginalFirstAttempt: true
  };
});
assertV4(
  contexts.reduce((sum, context) => sum + context.moves, 0) === 112 &&
    contexts.reduce((sum, context) => sum + context.sections, 0) === 31 &&
    contexts.reduce((sum, context) => sum + context.audioVerifiedMoves, 0) === 8,
  "six-context publication coverage changed"
);
for (const context of contexts) {
  assertV4(!(await exists(context.rawOutput)),
    `original unattempted context now has output: Debate ${context.debateNumber}`);
  assertV4(!(await exists(context.validation)),
    `original unattempted context now has validation: Debate ${context.debateNumber}`);
  assertV4(!(await exists(context.provenance)),
    `original unattempted context now has provenance: Debate ${context.debateNumber}`);
}

const sourceScripts = [
  "scripts/lib/assessment-production-post-canary-batch-14-publication-resumption-2.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-14-publication-resumption-2.mjs",
  "scripts/activate-assessment-production-post-canary-batch-14-publication-resumption-2.mjs",
  "scripts/run-assessment-production-post-canary-batch-14-publication-resumption-2.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-14-publication-resumption-2.mjs",
  "scripts/lib/assessment-production-post-canary-batch-14-publication-validation.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "src/data/references.js"
];
const sourceFiles = [
  ORIGINAL_PREPARATION, ORIGINAL_ACTIVATION, ORIGINAL_EXECUTION, ORIGINAL_ANALYSIS,
  DEBATE_53_ANALYSIS, RESUMPTION_1_EXECUTION, RESUMPTION_1_ANALYSIS,
  DEBATES_110_133_REPAIR_ANALYSIS,
  ...acceptedOutputs.flatMap((item) => [item.outputPath, item.packetPath]),
  originalPreparation.modelInputs.productionWorkflow,
  originalPreparation.modelInputs.readinessWorkflow,
  originalPreparation.modelInputs.outputContract,
  originalPreparation.modelInputs.manual,
  originalPreparation.modelInputs.referenceCatalog,
  ...contexts.flatMap((context) => [context.packet, context.schema]),
  ...sourceScripts
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
sourceHashes[CAFFEINATE] = sha256(await readFile(CAFFEINATE));
const futureOutputs = [
  `${ROOT}/execution-activation.json`, `${ROOT}/model-execution.json`,
  `${ROOT}/analysis.json`, `${ROOT}/complete-cohort-analysis.json`,
  ...contexts.flatMap((context) => [context.rawOutput, context.validation, context.provenance])
];
for (const file of [MANIFEST, ...futureOutputs]) {
  assertV4(!(await exists(file)), `future output exists: ${file}`);
}

const rampPhases = [
  { phase: "operational-one", maximumParallelContexts: 1,
    originalContextIndexes: [4], expansionRequiresAllValid: true },
  { phase: "ramp-two", maximumParallelContexts: 2,
    originalContextIndexes: [5, 6], expansionRequiresAllValid: true },
  { phase: "steady-two", maximumParallelContexts: 2,
    originalContextIndexes: [7, 8, 9], expansionRequiresAllValid: false }
];
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-original-unattempted-context-resumption-preparation",
  protocolId: PROTOCOL_ID,
  status: "frozen-six-original-unattempted-batch-14-publication-contexts-prepared-not-activated",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false,
  batchNumber: 14,
  stagingOnly: true,
  userAuthorization: {
    source: "Batch 14 complete-workflow standing authorization",
    resolvedScope: "resume only the six original publication contexts still unattempted after Debates 110 and 133 failed the first resumption ramp and passed bounded two-level field-disjoint critique recovery",
    originalContextIndexes: ORIGINAL_CONTEXT_INDEXES,
    debates: DEBATES,
    directIncrementalCostUsdMaximum: 0
  },
  acceptedPriorDebates: acceptedOutputs.map((item) => ({
    debateNumber: item.debateNumber,
    output: item.outputPath,
    outputSha256: sha256(item.outputBytes),
    packet: item.packetPath,
    packetSha256: sha256(item.packetBytes),
    source: item.debateNumber === "53" ? "accepted-two-level-eleven-critique-recovery" : ["110", "133"].includes(item.debateNumber) ? "accepted-two-level-nineteen-critique-recovery" : "accepted-original-first-attempt-resumption-1",
    validation: item.validation
  })),
  acceptedDebate53Recovery: {
    analysis: DEBATE_53_ANALYSIS,
    analysisSha256: sha256(debate53AnalysisBytes),
    status: debate53Analysis.status
  },
  acceptedDebates110And133Recovery: {
    analysis: DEBATES_110_133_REPAIR_ANALYSIS,
    analysisSha256: sha256(debates110133RepairAnalysisBytes),
    status: debates110133RepairAnalysis.status
  },
  previousResumptionBoundary: {
    execution: RESUMPTION_1_EXECUTION,
    executionSha256: sha256(resumption1ExecutionBytes),
    analysis: RESUMPTION_1_ANALYSIS,
    analysisSha256: sha256(resumption1AnalysisBytes),
    attemptedOriginalContextIndexes: [1, 2, 3],
    unattemptedOriginalContextIndexes: ORIGINAL_CONTEXT_INDEXES
  },
  originalFailureBoundary: {
    preparation: ORIGINAL_PREPARATION,
    preparationSha256: sha256(originalPreparationBytes),
    activation: ORIGINAL_ACTIVATION,
    activationSha256: sha256(originalActivationBytes),
    execution: ORIGINAL_EXECUTION,
    executionSha256: sha256(originalExecutionBytes),
    analysis: ORIGINAL_ANALYSIS,
    analysisSha256: sha256(originalAnalysisBytes),
    attemptedOriginalContextIndexes: [0],
    unattemptedOriginalContextIndexes: [1, 2, 3, 4, 5, 6, 7, 8, 9]
  },
  model: structuredClone(originalPreparation.model),
  modelInputs: structuredClone(originalPreparation.modelInputs),
  contexts,
  isolation: {
    oneDebatePerContext: true,
    separateFreshModelContextPerDebateRequired: true,
    onlyFrozenModelInputsAvailable: true,
    priorAcceptedDebateOutputsUnavailable: true,
    otherDebateOutputsUnavailable: true,
    legacyAssessmentsUnavailable: true,
    rankingsAndWinnerComparisonsUnavailable: true,
    participantJudgmentClosed: true,
    participantJudgmentWasScoreBlind: true,
    scoresAvailableOnlyAsImmutablePacketFields: true,
    thisStageContainsOnlyOriginalFirstAttempts: true
  },
  executionEnvironment: {
    codexPath: originalPreparation.executionEnvironment.codexPath,
    codexCliVersion: originalPreparation.executionEnvironment.codexCliVersion,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true,
    isolatedTemporaryWorkingDirectories: true,
    hostAwakeGuard: { path: CAFFEINATE, sha256: sourceHashes[CAFFEINATE], args: ["-dimsu"] }
  },
  executionPolicy: {
    contexts: 6,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0,
    correctionContextsMaximum: 0,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    rampPhases,
    stopBeforeExpansionOnRampFailure: true,
    continueIndependentContextsWithinStartedSteadyPhaseAfterFailure: true,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    removedEnvironmentVariables: originalPreparation.executionPolicy.removedEnvironmentVariables,
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    separateActivationRequired: true
  },
  stopRules: {
    stopOnSourceHashMismatch: true,
    stopOnTransportFailureAtRampBoundary: true,
    stopOnTimeoutAtRampBoundary: true,
    stopOnValidationFailureAtRampBoundary: true,
    noAutomaticRetry: true,
    noTimeoutExtension: true,
    noAutomaticCorrection: true,
    noPaidServices: true,
    stopBeforeBatch15: true
  },
  sourceHashes,
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  artifacts: {
    activation: `${ROOT}/execution-activation.json`,
    execution: `${ROOT}/model-execution.json`,
    analysis: `${ROOT}/analysis.json`,
    completeCohortAnalysis: `${ROOT}/complete-cohort-analysis.json`
  },
  totals: {
    debates: 6,
    contexts: 6,
    moves: 112,
    sections: 31,
    quoteEligibleMoves: 112,
    audioVerifiedMoves: 8,
    maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)),
    priorAttemptedContextsIncluded: 0,
    modelContextsExecuted: 0,
    modelAuthoredScores: 0,
    paidServiceCallsThisStage: 0,
    directIncrementalCostUsd: 0
  },
  authorization: {
    preparation: true,
    activation: true,
    modelExecution: true,
    deterministicValidationAndCompleteCohortReplay: true,
    retries: false,
    timeoutExtensions: false,
    correctionContexts: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "commit-and-push-frozen-six-context-resumption-then-activate"
};
if (shouldWrite) {
  await mkdir(path.resolve(ROOT), { recursive: true });
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? manifest.status : "preview",
  originalContextIndexes: ORIGINAL_CONTEXT_INDEXES,
  debates: DEBATES,
  moves: 112,
  schedulerRamp: [1, 2],
  attemptsPerContext: 1,
  retriesMaximum: 0,
  timeoutExtensionsMaximum: 0,
  correctionContextsMaximum: 0,
  directIncrementalCostUsdMaximum: 0
}, null, 2));
