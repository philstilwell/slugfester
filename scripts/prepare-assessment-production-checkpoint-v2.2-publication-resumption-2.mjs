#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CHECKPOINT_V22_PUBLICATION_MODEL, CHECKPOINT_V22_PUBLICATION_ROOT } from "./lib/assessment-production-checkpoint-v2.2-publication.mjs";
import { CHECKPOINT_V22_RESUMPTION_ROOT } from "./lib/assessment-production-checkpoint-v2.2-publication-resumption.mjs";
import { CHECKPOINT_V22_RESUMPTION_2_DEBATES, CHECKPOINT_V22_RESUMPTION_2_PROTOCOL_ID, CHECKPOINT_V22_RESUMPTION_2_ROOT } from "./lib/assessment-production-checkpoint-v2.2-publication-resumption-2.mjs";
import { CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT } from "./lib/assessment-production-checkpoint-v2.2-debate-192-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const outputPath = `${CHECKPOINT_V22_RESUMPTION_2_ROOT}/preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(outputPath)), `${outputPath} already exists`);
const originalActivationPath = `${CHECKPOINT_V22_PUBLICATION_ROOT}/execution-activation.json`;
const resumption1DiagnosisPath = `${CHECKPOINT_V22_RESUMPTION_ROOT}/failure-diagnosis.json`;
const repair192AnalysisPath = `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/analysis.json`;
const acceptedDebates = [
  {
    debateNumber: "50",
    output: `${CHECKPOINT_V22_PUBLICATION_ROOT}/repair-1/merged/debate-50.json`,
    validation: `${CHECKPOINT_V22_PUBLICATION_ROOT}/repair-1/complete-debate-validation.json`,
    packet: `${CHECKPOINT_V22_PUBLICATION_ROOT}/packets/debate-50.json`,
    moves: 19
  },
  {
    debateNumber: "192",
    output: `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/merged/debate-192.json`,
    validation: `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/complete-debate-validation.json`,
    packet: `${CHECKPOINT_V22_PUBLICATION_ROOT}/packets/debate-192.json`,
    moves: 16
  }
];
const [originalActivation, diagnosis, repair192Analysis, ...acceptedValidations] = await Promise.all([
  originalActivationPath,
  resumption1DiagnosisPath,
  repair192AnalysisPath,
  ...acceptedDebates.map(({ validation }) => validation)
].map((file) => readFile(path.resolve(file), "utf8").then(JSON.parse)));
assertV4(
  originalActivation.status === "frozen-ten-production-checkpoint-v2.2-publication-contexts-authorized" &&
    diagnosis.rampDisposition.contextsUnattempted === 8 &&
    diagnosis.rampDisposition.unattemptedDebates.join("|") === CHECKPOINT_V22_RESUMPTION_2_DEBATES.join("|") &&
    repair192Analysis.status === "debate-192-four-packet-repair-and-complete-publication-validation-passed" &&
    repair192Analysis.authorization.eightContextResumptionPlanPreparation === true &&
    acceptedValidations.every((validation) => validation.status === "passed"),
  "eight-context resumption source state mismatch"
);
const contexts = CHECKPOINT_V22_RESUMPTION_2_DEBATES.map((debateNumber, contextIndex) => {
  const source = originalActivation.contexts.find((context) => context.debateNumber === debateNumber);
  assertV4(source && source.contextIndex === contextIndex + 2, `${debateNumber}: original untouched context mismatch`);
  return {
    ...source,
    contextIndex,
    originalContextIndex: source.contextIndex,
    rawOutput: `${CHECKPOINT_V22_RESUMPTION_2_ROOT}/outputs/debate-${debateNumber}.json`,
    validation: `${CHECKPOINT_V22_RESUMPTION_2_ROOT}/validations/debate-${debateNumber}.json`,
    provenance: `${CHECKPOINT_V22_RESUMPTION_2_ROOT}/provenance/debate-${debateNumber}.json`
  };
});
for (const context of contexts) {
  assertV4(!(await exists(context.output)), `${context.debateNumber}: original output path is no longer untouched`);
  assertV4(!(await exists(context.rawOutput)), `${context.debateNumber}: resumption-2 output already exists`);
}
const moves = contexts.reduce((sum, context) => sum + context.moves, 0);
assertV4(moves === 153, `eight-context move total changed: ${moves}`);
const preparation = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-resumption-2-preparation",
  protocolId: CHECKPOINT_V22_RESUMPTION_2_PROTOCOL_ID,
  status: "eight-untouched-production-checkpoint-v2.2-publication-contexts-prepared-and-frozen",
  preparedAt: new Date().toISOString(), productionCanary: true, stagingOnly: true, model: CHECKPOINT_V22_PUBLICATION_MODEL,
  inputs: {
    originalActivation: originalActivationPath,
    resumption1Diagnosis: resumption1DiagnosisPath,
    debate192RepairAnalysis: repair192AnalysisPath,
    debate192RepairMergeAudit: `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/merge-audit.json`,
    productionWorkflow: originalActivation.modelInputs.productionWorkflow,
    readinessWorkflow: originalActivation.modelInputs.readinessWorkflow,
    outputContract: originalActivation.modelInputs.outputContract,
    manual: originalActivation.modelInputs.manual,
    referenceCatalog: originalActivation.modelInputs.referenceCatalog
  },
  acceptedDebates,
  contexts,
  policy: {
    contexts: 8, attemptsPerContext: 1, retriesMaximum: 0, correctionContextsMaximum: 0, timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0, absoluteGateTimeoutMs: 7200000, copiedInputBytesMaximum: 400000, maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    rampPhases: [
      { phase: "resumption-2-operational-one", maximumParallelContexts: 1, contextIndexes: [0], expansionRequiresAllValid: true },
      { phase: "resumption-2-ramp-two", maximumParallelContexts: 2, contextIndexes: [1, 2], expansionRequiresAllValid: true },
      { phase: "resumption-2-steady-two", maximumParallelContexts: 2, contextIndexes: [3, 4, 5, 6, 7], expansionRequiresAllValid: false }
    ],
    stopBeforeExpansionOnRampFailure: true, continueIndependentContextsWithinStartedSteadyPhaseAfterFailure: true,
    deterministicInputOrder: true, authentication: "ChatGPT subscription", APIKeysRemoved: true,
    removedEnvironmentVariables: originalActivation.executionPolicy.removedEnvironmentVariables,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, separateActivationRequired: true
  },
  acceptanceContract: {
    resumptionValidContextsRequired: 8, cohortValidDebatesRequired: 10, resumptionMovesRequired: 153, cohortMovesRequired: 188,
    resumptionCritiquesRequired: 153, cohortCritiquesRequired: 188, resumptionExactSourceQuotesRequired: 16, cohortExactSourceQuotesRequired: 20,
    resumptionOverallCommentarySidesRequired: 16, cohortOverallCommentarySidesRequired: 20,
    resumptionAIExtensionSidesRequired: 16, cohortAIExtensionSidesRequired: 20, minimumCritiqueCharacters: 880, modelAuthoredScores: 0
  },
  totals: { contexts: 8, moves: 153, acceptedDebates: 2, acceptedMoves: 35, modelContextsExecuted: 0, modelAuthoredScores: 0, scorePassesExecutedThisStage: 0, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0 },
  authorization: { executionActivationPreparation: true, publicationModelExecution: false, retry: false, correctionModelExecution: false, deterministicCompilation: false, publicationFinalization: false, renderingVerification: false, productionMutation: false, remainingProductionBatches: false }
};
await mkdir(path.resolve(CHECKPOINT_V22_RESUMPTION_2_ROOT), { recursive: true });
await writeFile(path.resolve(outputPath), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, debates: contexts.map(({ debateNumber }) => debateNumber), acceptedDebates: acceptedDebates.map(({ debateNumber }) => debateNumber), contexts: 8, moves: 153, maximumParallelContexts: 2, attemptsPerContext: 1, retriesMaximum: 0, model: preparation.model, meteredApiCostUsdMaximum: 0, productionMutation: false }, null, 2));
