#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEBATES, ORIGINAL_CONTEXT_INDEXES, PROTOCOL_ID, ROOT } from
  "./lib/assessment-production-post-canary-batch-13-publication-resumption-3.mjs";
import { validatePostCanaryBatch13PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-13-publication-validation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--frozen-at");
const frozenAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-13/publication-reconstruction";
const ORIGINAL_PREPARATION = `${PUBLICATION_ROOT}/execution-preparation-manifest.json`;
const ORIGINAL_ACTIVATION = `${PUBLICATION_ROOT}/execution-activation.json`;
const ORIGINAL_EXECUTION = `${PUBLICATION_ROOT}/model-execution.json`;
const ORIGINAL_ANALYSIS = `${PUBLICATION_ROOT}/analysis.json`;
const DEBATE_87_ANALYSIS =
  `${PUBLICATION_ROOT}/timeout-recovery/critique-repair/exceptional-atomic-recovery/analysis.json`;
const RESUMPTION_2_ROOT = `${PUBLICATION_ROOT}/original-unattempted-context-resumption-2`;
const RESUMPTION_2_EXECUTION = `${RESUMPTION_2_ROOT}/model-execution.json`;
const RESUMPTION_2_ANALYSIS = `${RESUMPTION_2_ROOT}/analysis.json`;
const DEBATE_20_REPAIR_ANALYSIS =
  `${PUBLICATION_ROOT}/original-unattempted-context-resumption-1/debate-20-field-disjoint-repair-1/analysis.json`;
const DEBATE_70_REPAIR_ANALYSIS = `${RESUMPTION_2_ROOT}/debate-70-field-disjoint-repair-1/analysis.json`;
const ACCEPTED_DEBATES = Object.freeze(["26", "190", "87", "20", "70"]);
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const CAFFEINATE = "/usr/bin/caffeinate";

const [originalPreparationBytes, originalActivationBytes, originalExecutionBytes,
  originalAnalysisBytes, debate87AnalysisBytes, resumption2ExecutionBytes,
  resumption2AnalysisBytes, debate20RepairAnalysisBytes, debate70RepairAnalysisBytes] =
  await Promise.all([
    ORIGINAL_PREPARATION, ORIGINAL_ACTIVATION, ORIGINAL_EXECUTION,
    ORIGINAL_ANALYSIS, DEBATE_87_ANALYSIS, RESUMPTION_2_EXECUTION,
    RESUMPTION_2_ANALYSIS, DEBATE_20_REPAIR_ANALYSIS, DEBATE_70_REPAIR_ANALYSIS
  ].map((file) => readFile(path.resolve(file))));
const originalPreparation = JSON.parse(originalPreparationBytes);
const originalActivation = JSON.parse(originalActivationBytes);
const originalExecution = JSON.parse(originalExecutionBytes);
const originalAnalysis = JSON.parse(originalAnalysisBytes);
const debate87Analysis = JSON.parse(debate87AnalysisBytes);
const resumption2Execution = JSON.parse(resumption2ExecutionBytes);
const resumption2Analysis = JSON.parse(resumption2AnalysisBytes);
const debate20RepairAnalysis = JSON.parse(debate20RepairAnalysisBytes);
const debate70RepairAnalysis = JSON.parse(debate70RepairAnalysisBytes);

assertV4(
  originalPreparation.contexts?.length === 10 &&
    originalActivation.contexts?.length === 10 &&
    originalExecution.status === "post-canary-batch-13-publication-gate-complete-with-failure" &&
    originalExecution.contextsAttempted === 3 &&
    originalExecution.results?.length === 3 &&
    originalExecution.results[0].contextIndex === 0 &&
    originalExecution.results[0].debateNumber === "26" &&
    originalExecution.results[0].status === "completed-valid" &&
    originalExecution.results[0].outputWritten === true &&
    originalExecution.results[0].gateAcceptancePassed === true &&
    originalExecution.results[1].contextIndex === 1 &&
    originalExecution.results[1].debateNumber === "190" &&
    originalExecution.results[1].status === "completed-valid" &&
    originalExecution.results[1].outputWritten === true &&
    originalExecution.results[1].gateAcceptancePassed === true &&
    originalExecution.results[2].contextIndex === 2 &&
    originalExecution.results[2].debateNumber === "87" &&
    originalExecution.results[2].status === "timed-out" &&
    originalExecution.results[2].outputWritten === false &&
    originalExecution.results[2].gateAcceptancePassed === false &&
    canonicalJson(originalExecution.unattemptedContextIndexes) ===
      canonicalJson([3, 4, 5, 6, 7, 8, 9]) &&
    originalAnalysis.status === "post-canary-batch-13-publication-output-gate-failed",
  "original publication failure boundary changed"
);
for (const [file, digest] of Object.entries(originalActivation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `original frozen source drifted: ${file}`);
}
assertV4(
  debate87Analysis.status ===
    "debate-87-exceptional-third-level-atomic-shard-recovery-passed-awaiting-seven-context-resumption" &&
    debate87Analysis.contextsThisLevel === 2 &&
    debate87Analysis.attemptsThisLevel === 2 &&
    debate87Analysis.retries === 0 &&
    debate87Analysis.scorePassRerun === false &&
    debate87Analysis.validation?.status === "passed" &&
    debate87Analysis.validation?.moves === 19,
  "accepted Debate 87 recovery changed"
);
assertV4(
  resumption2Execution.status === "six-context-publication-resumption-stopped-with-failure" &&
    resumption2Execution.contextsAttempted === 1 &&
    resumption2Execution.contextsUnattempted === 5 &&
    resumption2Execution.validContexts === 0 &&
    resumption2Execution.invalidContexts === 1 &&
    resumption2Execution.results?.[0]?.originalContextIndex === 4 &&
    resumption2Execution.results?.[0]?.debateNumber === "70" &&
    resumption2Execution.results?.[0]?.status === "output-validation-failed" &&
    canonicalJson(resumption2Execution.unattemptedOriginalContextIndexes) ===
      canonicalJson(ORIGINAL_CONTEXT_INDEXES) &&
    resumption2Execution.retries === 0 &&
    resumption2Analysis.status === "six-context-publication-resumption-failed",
  "second publication resumption boundary changed"
);
assertV4(
  debate20RepairAnalysis.status ===
    "debate-20-field-disjoint-repair-1-passed-awaiting-six-context-resumption" &&
    debate20RepairAnalysis.totals?.correctedFieldsAccepted === 2 &&
    debate20RepairAnalysis.execution?.contextsAttempted === 1 &&
    debate20RepairAnalysis.execution?.validContexts === 1 &&
    debate20RepairAnalysis.execution?.retries === 0,
  "accepted Debate 20 repair changed"
);
assertV4(
  debate70RepairAnalysis.status ===
    "debate-70-field-disjoint-repair-1-passed-awaiting-five-context-resumption" &&
    debate70RepairAnalysis.totals?.correctedFieldsAccepted === 5 &&
    debate70RepairAnalysis.execution?.contextsAttempted === 3 &&
    debate70RepairAnalysis.execution?.validContexts === 3 &&
    debate70RepairAnalysis.execution?.retries === 0,
  "accepted Debate 70 repair changed"
);
const acceptedOutputs = [];
for (const debateNumber of ACCEPTED_DEBATES) {
  const outputPath = `${PUBLICATION_ROOT}/outputs/debate-${debateNumber}.json`;
  const packetPath = `${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`;
  const outputBytes = await readFile(path.resolve(outputPath));
  const packetBytes = await readFile(path.resolve(packetPath));
  const validation = validatePostCanaryBatch13PublicationOutput(
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
  contexts.reduce((sum, context) => sum + context.moves, 0) === 102 &&
    contexts.reduce((sum, context) => sum + context.sections, 0) === 27 &&
    contexts.reduce((sum, context) => sum + context.audioVerifiedMoves, 0) === 7,
  "five-context publication coverage changed"
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
  "scripts/lib/assessment-production-post-canary-batch-13-publication-resumption-3.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-13-publication-resumption-3.mjs",
  "scripts/activate-assessment-production-post-canary-batch-13-publication-resumption-3.mjs",
  "scripts/run-assessment-production-post-canary-batch-13-publication-resumption-3.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-13-publication-resumption-3.mjs",
  "scripts/lib/assessment-production-post-canary-batch-13-publication-validation.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "src/data/references.js"
];
const sourceFiles = [
  ORIGINAL_PREPARATION, ORIGINAL_ACTIVATION, ORIGINAL_EXECUTION, ORIGINAL_ANALYSIS,
  DEBATE_87_ANALYSIS, RESUMPTION_2_EXECUTION, RESUMPTION_2_ANALYSIS,
  DEBATE_20_REPAIR_ANALYSIS, DEBATE_70_REPAIR_ANALYSIS,
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
    originalContextIndexes: [5], expansionRequiresAllValid: true },
  { phase: "ramp-two", maximumParallelContexts: 2,
    originalContextIndexes: [6, 7], expansionRequiresAllValid: true },
  { phase: "steady-two", maximumParallelContexts: 2,
    originalContextIndexes: [8, 9], expansionRequiresAllValid: false }
];
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-13-publication-original-unattempted-context-resumption-preparation",
  protocolId: PROTOCOL_ID,
  status: "frozen-five-original-unattempted-batch-13-publication-contexts-prepared-not-activated",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false,
  batchNumber: 13,
  stagingOnly: true,
  userAuthorization: {
    source: "Batch 13 complete-workflow standing authorization",
    resolvedScope: "resume only the five original publication contexts still unattempted after Debate 70 failed the second resumption ramp and passed its three-shard, five-field bounded repair",
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
    source: item.debateNumber === "87" ? "exceptional-third-level-atomic-shard-recovery" : item.debateNumber === "20" ? "one-shard-two-field-publication-repair" : item.debateNumber === "70" ? "three-shard-five-field-publication-repair" : "original-publication-first-attempt",
    validation: item.validation
  })),
  acceptedDebate87Recovery: {
    analysis: DEBATE_87_ANALYSIS,
    analysisSha256: sha256(debate87AnalysisBytes),
    status: debate87Analysis.status
  },
  acceptedDebate20Repair: {
    analysis: DEBATE_20_REPAIR_ANALYSIS,
    analysisSha256: sha256(debate20RepairAnalysisBytes),
    status: debate20RepairAnalysis.status
  },
  acceptedDebate70Repair: {
    analysis: DEBATE_70_REPAIR_ANALYSIS,
    analysisSha256: sha256(debate70RepairAnalysisBytes),
    status: debate70RepairAnalysis.status
  },
  previousResumptionBoundary: {
    execution: RESUMPTION_2_EXECUTION,
    executionSha256: sha256(resumption2ExecutionBytes),
    analysis: RESUMPTION_2_ANALYSIS,
    analysisSha256: sha256(resumption2AnalysisBytes),
    attemptedOriginalContextIndexes: [4],
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
    attemptedOriginalContextIndexes: [0, 1, 2],
    unattemptedOriginalContextIndexes: [3, 4, 5, 6, 7, 8, 9]
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
    contexts: 5,
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
    stopBeforeBatch14: true
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
    debates: 5,
    contexts: 5,
    moves: 102,
    sections: 27,
    quoteEligibleMoves: 102,
    audioVerifiedMoves: 7,
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
  nextAuthorizedAction: "commit-and-push-frozen-five-context-resumption-then-activate"
};
if (shouldWrite) {
  await mkdir(path.resolve(ROOT), { recursive: true });
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? manifest.status : "preview",
  originalContextIndexes: ORIGINAL_CONTEXT_INDEXES,
  debates: DEBATES,
  moves: 102,
  schedulerRamp: [1, 2],
  attemptsPerContext: 1,
  retriesMaximum: 0,
  timeoutExtensionsMaximum: 0,
  correctionContextsMaximum: 0,
  directIncrementalCostUsdMaximum: 0
}, null, 2));
