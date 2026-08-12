#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_PUBLICATION_MODEL,
  CHECKPOINT_V22_PUBLICATION_ROOT
} from "./lib/assessment-production-checkpoint-v2.2-publication.mjs";
import {
  CHECKPOINT_V22_RESUMPTION_DEBATES,
  CHECKPOINT_V22_RESUMPTION_PROTOCOL_ID,
  CHECKPOINT_V22_RESUMPTION_ROOT
} from "./lib/assessment-production-checkpoint-v2.2-publication-resumption.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = CHECKPOINT_V22_PUBLICATION_ROOT;
const preparationPath = `${CHECKPOINT_V22_RESUMPTION_ROOT}/preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(preparationPath)), `${preparationPath} already exists`);
const files = {
  originalPreparation: `${ROOT}/preparation-manifest.json`,
  originalActivation: `${ROOT}/execution-activation.json`,
  originalExecution: `${ROOT}/model-execution.json`,
  originalAnalysis: `${ROOT}/analysis.json`,
  failureDiagnosis: `${ROOT}/failure-diagnosis.json`,
  repairAnalysis: `${ROOT}/repair-1/analysis.json`,
  repairedDebate50: `${ROOT}/repair-1/merged/debate-50.json`,
  repairedDebate50Validation: `${ROOT}/repair-1/complete-debate-validation.json`,
  repairMergeAudit: `${ROOT}/repair-1/merge-audit.json`
};
const [originalPreparation, originalActivation, originalExecution, originalAnalysis, diagnosis, repairAnalysis, repairValidation] = await Promise.all([
  files.originalPreparation,
  files.originalActivation,
  files.originalExecution,
  files.originalAnalysis,
  files.failureDiagnosis,
  files.repairAnalysis,
  files.repairedDebate50Validation
].map((file) => readFile(path.resolve(file), "utf8").then(JSON.parse)));
assertV4(
  originalPreparation.status === "ten-production-checkpoint-v2.2-publication-contexts-prepared-and-frozen" &&
    originalActivation.status === "frozen-ten-production-checkpoint-v2.2-publication-contexts-authorized" &&
    originalExecution.contextsAttempted === 1 &&
    originalExecution.contextsUnattempted === 9 &&
    originalExecution.results.length === 1 &&
    originalExecution.results[0].contextIndex === 0 &&
    originalExecution.retries === 0 &&
    originalAnalysis.status === "production-checkpoint-v2.2-publication-gate-failed-validation" &&
    diagnosis.rampDisposition.contextsUnattempted === 9 &&
    repairAnalysis.status === "debate-50-bounded-repair-and-complete-publication-validation-passed" &&
    repairAnalysis.authorization.nineContextResumptionPlanPreparation === true &&
    repairValidation.status === "passed" &&
    repairValidation.validationSummary.moves === 19,
  "nine-context resumption source state mismatch"
);
assertV4(
  diagnosis.rampDisposition.unattemptedDebates.join("|") === CHECKPOINT_V22_RESUMPTION_DEBATES.join("|"),
  "unattempted debate order changed"
);

const contexts = CHECKPOINT_V22_RESUMPTION_DEBATES.map((debateNumber, resumptionIndex) => {
  const source = originalActivation.contexts.find((context) => context.debateNumber === debateNumber);
  assertV4(source && source.contextIndex === resumptionIndex + 1, `${debateNumber}: original context mismatch`);
  return {
    ...source,
    contextIndex: resumptionIndex,
    originalContextIndex: source.contextIndex,
    rawOutput: `${CHECKPOINT_V22_RESUMPTION_ROOT}/outputs/debate-${debateNumber}.json`,
    validation: `${CHECKPOINT_V22_RESUMPTION_ROOT}/validations/debate-${debateNumber}.json`,
    provenance: `${CHECKPOINT_V22_RESUMPTION_ROOT}/provenance/debate-${debateNumber}.json`
  };
});
for (const context of contexts) {
  assertV4(!(await exists(context.output)), `${context.debateNumber}: original unattempted output path is no longer empty`);
  assertV4(!(await exists(context.rawOutput)), `${context.debateNumber}: resumption output already exists`);
}
const moves = contexts.reduce((sum, context) => sum + context.moves, 0);
assertV4(moves === 169, `nine-context move total changed: ${moves}`);
const preparation = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-resumption-preparation",
  protocolId: CHECKPOINT_V22_RESUMPTION_PROTOCOL_ID,
  status: "nine-untouched-production-checkpoint-v2.2-publication-contexts-prepared-and-frozen",
  preparedAt: new Date().toISOString(),
  productionCanary: true,
  stagingOnly: true,
  model: CHECKPOINT_V22_PUBLICATION_MODEL,
  inputs: {
    ...files,
    productionWorkflow: originalActivation.modelInputs.productionWorkflow,
    readinessWorkflow: originalActivation.modelInputs.readinessWorkflow,
    outputContract: originalActivation.modelInputs.outputContract,
    manual: originalActivation.modelInputs.manual,
    referenceCatalog: originalActivation.modelInputs.referenceCatalog
  },
  acceptedDebate50: {
    debateNumber: "50",
    debateId: originalActivation.contexts[0].debateId,
    output: files.repairedDebate50,
    validation: files.repairedDebate50Validation,
    packet: originalActivation.contexts[0].packet,
    moves: 19
  },
  contexts,
  policy: {
    contexts: 9,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    correctionContextsMaximum: 0,
    timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0,
    absoluteGateTimeoutMs: 7200000,
    copiedInputBytesMaximum: 400000,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    rampPhases: [
      { phase: "resumption-operational-one", maximumParallelContexts: 1, contextIndexes: [0], expansionRequiresAllValid: true },
      { phase: "resumption-ramp-two", maximumParallelContexts: 2, contextIndexes: [1, 2], expansionRequiresAllValid: true },
      { phase: "resumption-steady-two", maximumParallelContexts: 2, contextIndexes: [3, 4, 5, 6, 7, 8], expansionRequiresAllValid: false }
    ],
    stopBeforeExpansionOnRampFailure: true,
    continueIndependentContextsWithinStartedSteadyPhaseAfterFailure: true,
    deterministicInputOrder: true,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    removedEnvironmentVariables: originalActivation.executionPolicy.removedEnvironmentVariables,
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    separateActivationRequired: true
  },
  acceptanceContract: {
    resumptionValidContextsRequired: 9,
    cohortValidDebatesRequired: 10,
    resumptionMovesRequired: 169,
    cohortMovesRequired: 188,
    resumptionCritiquesRequired: 169,
    cohortCritiquesRequired: 188,
    resumptionExactSourceQuotesRequired: 18,
    cohortExactSourceQuotesRequired: 20,
    resumptionOverallCommentarySidesRequired: 18,
    cohortOverallCommentarySidesRequired: 20,
    resumptionAIExtensionSidesRequired: 18,
    cohortAIExtensionSidesRequired: 20,
    minimumCritiqueCharacters: 880,
    modelAuthoredScores: 0
  },
  totals: {
    contexts: 9,
    moves: 169,
    modelContextsExecuted: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsdThisStage: 0
  },
  authorization: {
    executionActivationPreparation: true,
    publicationModelExecution: false,
    retry: false,
    correctionModelExecution: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  }
};
await mkdir(path.resolve(CHECKPOINT_V22_RESUMPTION_ROOT), { recursive: true });
await writeFile(path.resolve(preparationPath), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({
  status: preparation.status,
  debates: contexts.map(({ debateNumber }) => debateNumber),
  contexts: 9,
  moves: 169,
  maximumParallelContexts: 2,
  attemptsPerContext: 1,
  retriesMaximum: 0,
  model: preparation.model,
  meteredApiCostUsdMaximum: 0,
  productionMutation: false
}, null, 2));
