#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/dispute-only-adjudication/correction-1";
const preparationPath = `${ROOT}/execution-preparation-manifest.json`;
const activationPath = `${ROOT}/execution-activation.json`;
const schemaPath = `${ROOT}/schema.json`;
const executionPath = `${ROOT}/model-execution.json`;
const validationPath = `${ROOT}/correction-validation.json`;
const analysisPath = `${ROOT}/analysis.json`;
const diagnosisPath = `${ROOT}/transport-failure-diagnosis.json`;
const generatorPath =
  "scripts/diagnose-assessment-production-post-canary-batch-01-debate-195-correction-transport-failure.mjs";
const testPath =
  "scripts/test-assessment-production-post-canary-batch-01-debate-195-correction-transport-failure-diagnosis.mjs";
const evidencePaths = [
  preparationPath,
  activationPath,
  schemaPath,
  executionPath,
  validationPath,
  analysisPath
];
const implementationPaths = [generatorPath, testPath];
const sourcePaths = [...evidencePaths, ...implementationPaths];
const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt =
  frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : new Date().toISOString();
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert(frozenAt, "--frozen-at requires an ISO timestamp");
assert.equal(
  Number.isNaN(Date.parse(frozenAt)),
  false,
  "frozenAt must be an ISO timestamp"
);

const bytesByPath = new Map(
  await Promise.all(sourcePaths.map(async (file) => [file, await readFile(file)]))
);
const readJson = (file) => JSON.parse(bytesByPath.get(file).toString("utf8"));
const preparation = readJson(preparationPath);
const activation = readJson(activationPath);
const schema = readJson(schemaPath);
const execution = readJson(executionPath);
const validation = readJson(validationPath);
const analysis = readJson(analysisPath);
const context = activation.contexts[0];
const result = execution.results[0];
const decisionsSchema = schema.properties.burdenAdjustmentDecisions;
const apiErrorMessage =
  "Invalid schema for response_format 'codex_output_schema': In context=('properties', 'burdenAdjustmentDecisions'), array schema items is not an object.";
const errorEmissionCount = result.failureMessage.split(apiErrorMessage).length - 1;

assert.equal(preparation.contexts.length, 1);
assert.equal(activation.contexts.length, 1);
assert.equal(execution.results.length, 1);
assert.equal(context.debateNumber, "195");
assert.equal(context.debateId, "russell-copleston-existence-of-god-1948");
assert.equal(context.schema, schemaPath);
assert.equal(context.schemaSha256, sha256(bytesByPath.get(schemaPath)));
assert.equal(
  activation.sourceHashes[schemaPath],
  sha256(bytesByPath.get(schemaPath))
);
assert.equal(
  activation.preparationManifest.path,
  preparationPath
);
assert.equal(
  activation.preparationManifest.sha256,
  sha256(bytesByPath.get(preparationPath))
);
assert.equal(activation.model.label, "5.6 Sol");
assert.equal(activation.model.slug, "gpt-5.6-sol");
assert.equal(activation.model.reasoningEffort, "low");
assert.equal(activation.model.authentication, "ChatGPT subscription");
assert.equal(activation.model.scoreBlind, true);
assert.equal(activation.model.roundedIntegerScoreTiesPermitted, true);
assert.equal(activation.executionPolicy.contexts, 1);
assert.equal(activation.executionPolicy.attemptsPerContext, 1);
assert.equal(activation.executionPolicy.retriesMaximum, 0);
assert.equal(activation.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(activation.executionPolicy.recursiveCorrectionContextsMaximum, 0);
assert.equal(activation.executionPolicy.APIKeysRemoved, true);
assert.equal(activation.executionPolicy.meteredApiCostUsdMaximum, 0);

assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.equal(decisionsSchema.type, "array");
assert.equal(decisionsSchema.minItems, 2);
assert.equal(decisionsSchema.maxItems, 2);
assert.equal(decisionsSchema.prefixItems.length, 2);
assert.deepEqual(
  decisionsSchema.prefixItems.map((item) => item.properties.side.const),
  ["pro", "con"]
);
assert.equal(decisionsSchema.items, false);
assert.equal(typeof decisionsSchema.items, "boolean");

assert.equal(result.status, "result-missing");
assert.equal(result.gateAcceptancePassed, false);
assert.equal(result.outputWritten, false);
assert.equal(result.attemptCount, 1);
assert.equal(result.retryCount, 0);
assert.equal(result.timeoutExtensionCount, 0);
assert.equal(result.recursiveCorrectionCount, 0);
assert.equal(result.timedOut, false);
assert.equal(result.commandExitCode, 1);
assert.equal(result.terminationSignal, null);
assert.equal(result.model, "5.6 Sol");
assert.equal(result.modelSlug, "gpt-5.6-sol");
assert.equal(result.reasoningEffort, "low");
assert.equal(result.authentication, "ChatGPT subscription");
assert.equal(result.apiKeysRemoved, true);
assert.equal(result.scoreBlind, true);
assert.equal(result.paidServiceCalls, 0);
assert.equal(result.meteredApiCostUsd, 0);
assert.equal(execution.contextsPlanned, 1);
assert.equal(execution.contextsAttempted, 1);
assert.equal(execution.attempts, 1);
assert.equal(execution.retries, 0);
assert.equal(execution.timeoutExtensions, 0);
assert.equal(execution.recursiveCorrections, 0);
assert.equal(execution.deterministicMerges, 0);
assert.equal(execution.scoresDerived, 0);
assert.equal(execution.paidServiceCalls, 0);
assert.equal(execution.directIncrementalCostUsd, 0);
assert.equal(errorEmissionCount, 2);
assert(result.failureMessage.includes('"type": "invalid_request_error"'));
assert(result.failureMessage.includes('"code": "invalid_json_schema"'));
assert(result.failureMessage.includes('"param": "text.format.schema"'));
assert(result.failureMessage.includes('"status": 400'));
assert.equal(validation.validationMessage, result.failureMessage);
assert.equal(validation.status, "correction-output-unavailable-transport-failure");
assert.equal(validation.outputAvailable, false);
assert.equal(validation.outputSha256, null);
assert.equal(validation.gateAcceptancePassed, false);
assert.equal(validation.preservedMoveDecisions, 18);
assert.equal(validation.originalOutputUnchanged, true);
assert.equal(validation.deterministicMergeAuthorized, false);
assert.equal(validation.scoresDerived, 0);
assert.equal(
  analysis.status,
  "debate-195-burden-adjustment-correction-gate-failed"
);
assert.equal(analysis.gate.failureClass, "transport-or-output-availability");
assert.equal(analysis.gate.requiredContexts, 1);
assert.equal(analysis.gate.validContexts, 0);
assert.equal(analysis.gate.requiredBurdenAdjustmentDecisions, 2);
assert.equal(analysis.gate.burdenAdjustmentDecisions, 0);
assert.equal(analysis.gate.requiredCandidateSelections, 2);
assert.equal(analysis.gate.candidateSelections, 0);
assert.equal(analysis.gate.preservedMoveDecisions, 18);
assert.equal(analysis.gate.originalOutputUnchanged, true);
assert.equal(analysis.gate.preservedMoveDecisionsUnchanged, true);
assert.equal(analysis.preservation.correctionMerged, false);
assert.equal(analysis.preservation.finalLedgerAssembled, false);
assert.equal(analysis.totals.correctionModelContexts, 1);
assert.equal(analysis.totals.adjudicationModelContexts, 0);
assert.equal(analysis.totals.judgmentModelContexts, 0);
assert.equal(analysis.totals.paidServiceCalls, 0);
assert.equal(analysis.totals.retries, 0);
assert.equal(analysis.totals.timeoutExtensions, 0);
assert.equal(analysis.totals.recursiveCorrections, 0);
assert.equal(analysis.totals.deterministicMerges, 0);
assert.equal(analysis.totals.finalLedgersAssembled, 0);
assert.equal(analysis.totals.scoresDerived, 0);
assert.equal(analysis.totals.publicationReconstructions, 0);
assert.equal(analysis.totals.productionMutations, 0);
assert.equal(analysis.totals.nextBatchSelections, 0);
assert.equal(analysis.totals.directIncrementalCostUsd, 0);

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-debate-195-correction-transport-failure-diagnosis",
  protocolId:
    "assessment-production-post-canary-batch-01-debate-195-correction-transport-failure-diagnosis",
  status:
    "debate-195-correction-response-schema-items-type-mismatch-confirmed-frozen-no-successor-authorized",
  frozenAt,
  productionCanary: false,
  batchNumber: 1,
  correctionNumber: 1,
  stagingOnly: true,
  developmentValidationOnly: false,
  userAuthorization: {
    scope:
      "deterministic diagnosis, validation, freezing, committing, and pushing of the Debate 195 correction transport failure only",
    evidenceBoundary: "preserved request and error records only",
    directIncrementalCostUsdMaximum: 0,
    replacementPacketPreparation: false,
    replacementSchemaPreparation: false,
    modelExecution: false,
    retry: false,
    paidServices: false,
    outputMerge: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  preservedRequest: {
    preparationManifestPath: preparationPath,
    preparationManifestSha256: sha256(bytesByPath.get(preparationPath)),
    activationPath,
    activationSha256: sha256(bytesByPath.get(activationPath)),
    schemaPath,
    schemaSha256: sha256(bytesByPath.get(schemaPath)),
    contextCount: 1,
    debateNumber: context.debateNumber,
    debateId: context.debateId,
    burdenAdjustmentDecisionsRequired: 2,
    requiredSides: ["pro", "con"],
    model: activation.model.label,
    modelSlug: activation.model.slug,
    reasoningEffort: activation.model.reasoningEffort,
    authentication: activation.model.authentication,
    scoreBlind: activation.model.scoreBlind,
    roundedIntegerScoreTiesPermitted:
      activation.model.roundedIntegerScoreTiesPermitted,
    attemptsPerContext: activation.executionPolicy.attemptsPerContext,
    retriesMaximum: activation.executionPolicy.retriesMaximum,
    timeoutExtensionsMaximum:
      activation.executionPolicy.timeoutExtensionsMaximum,
    recursiveCorrectionContextsMaximum:
      activation.executionPolicy.recursiveCorrectionContextsMaximum,
    apiKeysRemoved: activation.executionPolicy.APIKeysRemoved,
    meteredApiCostUsdMaximum:
      activation.executionPolicy.meteredApiCostUsdMaximum,
    responseSchema: {
      declaredDialect: schema.$schema,
      arrayPropertyPath: "properties.burdenAdjustmentDecisions",
      type: decisionsSchema.type,
      minimumItems: decisionsSchema.minItems,
      maximumItems: decisionsSchema.maxItems,
      positionalSchemas: decisionsSchema.prefixItems.length,
      positionalSides: decisionsSchema.prefixItems.map(
        (item) => item.properties.side.const
      ),
      itemsValue: decisionsSchema.items,
      itemsValueType: typeof decisionsSchema.items
    }
  },
  preservedError: {
    executionPath,
    executionSha256: sha256(bytesByPath.get(executionPath)),
    validationPath,
    validationSha256: sha256(bytesByPath.get(validationPath)),
    analysisPath,
    analysisSha256: sha256(bytesByPath.get(analysisPath)),
    resultStatus: result.status,
    commandExitCode: result.commandExitCode,
    terminationSignal: result.terminationSignal,
    timedOut: result.timedOut,
    outputWritten: result.outputWritten,
    gateAcceptancePassed: result.gateAcceptancePassed,
    requestAttempts: result.attemptCount,
    retryCount: result.retryCount,
    timeoutExtensionCount: result.timeoutExtensionCount,
    recursiveCorrectionCount: result.recursiveCorrectionCount,
    apiErrorType: "invalid_request_error",
    apiErrorCode: "invalid_json_schema",
    httpStatus: 400,
    apiErrorParameter: "text.format.schema",
    apiErrorMessage,
    errorEmissionCountInSingleAttemptLog: errorEmissionCount,
    sameFailureTextCopiedIntoValidationRecord: true
  },
  diagnosis: {
    failureClass:
      "response-schema-array-items-boolean-rejected-by-structured-output-transport",
    immediateCause:
      "The frozen burdenAdjustmentDecisions array set items to the Boolean false, while the preserved API error says this transport requires array schema items to be an object.",
    requestRejectedBeforeCorrectionOutput: true,
    correctionOutputAvailable: false,
    modelInferenceResultAvailable: false,
    packetSpecificTwoDecisionConstraintEvaluatedByModel: false,
    prefixItemsCompatibilityDetermined: false,
    duplicateErrorEmissionsRepresentAdditionalAttempts: false,
    schemaMutationRequiredToCompleteDiagnosis: false,
    successorSchemaPrepared: false,
    replacementPacketPrepared: false,
    modelJudgmentFailureDetected: false,
    authenticationFailureDetected: false,
    timeoutFailureDetected: false,
    sourceFailureDetected: false,
    candidateSelectionFailureDetected: false,
    deterministicOutputValidatorFailureDetected: false
  },
  preservation: {
    frozenRequestSchemaUnchanged: true,
    frozenRequestSchemaSha256: context.schemaSha256,
    originalOutputUnchangedAccordingToPreservedRecords:
      validation.originalOutputUnchanged,
    originalOutputSha256: validation.originalOutputSha256,
    preservedMoveDecisions: validation.preservedMoveDecisions,
    preservedMoveDecisionsUnchangedAccordingToPreservedRecords:
      analysis.gate.preservedMoveDecisionsUnchanged,
    preservedMoveDecisionsSha256: validation.preservedMoveDecisionsSha256,
    correctionOutputWritten: false,
    retryAttempted: false,
    replacementPrepared: false,
    correctionMerged: false,
    finalLedgerAssembled: false,
    scoresDerived: 0,
    publicationReconstructions: 0,
    productionMutations: 0,
    nextBatchSelections: 0
  },
  sourceHashes: Object.fromEntries(
    sourcePaths.map((file) => [file, sha256(bytesByPath.get(file))])
  ),
  evidenceSources: evidencePaths,
  implementationSources: implementationPaths,
  costs: {
    diagnosisModelContexts: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0,
    scoresDerived: 0
  },
  authorization: {
    successorPacketPreparation: false,
    successorSchemaPreparation: false,
    successorExecutionPreparation: false,
    correctionModelExecution: false,
    adjudicationModelExecution: false,
    judgmentModelExecution: false,
    retry: false,
    timeoutExtension: false,
    recursiveCorrection: false,
    paidServices: false,
    outputMerge: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    "user-approval-required-before-preparation-of-any-transport-compatible-successor-schema-or-execution-preparation"
};

if (shouldWrite) {
  await writeFile(diagnosisPath, `${JSON.stringify(diagnosis, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: diagnosis.status,
      debateNumber: "195",
      failureClass: diagnosis.diagnosis.failureClass,
      requestAttempts: diagnosis.preservedError.requestAttempts,
      errorEmissionsInSingleAttemptLog:
        diagnosis.preservedError.errorEmissionCountInSingleAttemptLog,
      correctionOutputAvailable: false,
      successorPrepared: false,
      diagnosisModelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: diagnosis.nextAuthorizedAction
    },
    null,
    2
  )
);
