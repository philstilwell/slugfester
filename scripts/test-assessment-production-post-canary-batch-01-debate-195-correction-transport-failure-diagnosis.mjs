#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/dispute-only-adjudication/correction-1";
const diagnosisPath = `${ROOT}/transport-failure-diagnosis.json`;
const outputPath = `${ROOT}/correction-output.json`;
const diagnosis = JSON.parse(await readFile(diagnosisPath, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  diagnosis.status,
  "debate-195-correction-response-schema-items-type-mismatch-confirmed-frozen-no-successor-authorized"
);
assert.equal(diagnosis.productionCanary, false);
assert.equal(diagnosis.batchNumber, 1);
assert.equal(diagnosis.correctionNumber, 1);
assert.equal(diagnosis.stagingOnly, true);
assert.equal(diagnosis.userAuthorization.evidenceBoundary, "preserved request and error records only");
assert.equal(diagnosis.userAuthorization.directIncrementalCostUsdMaximum, 0);
for (const key of [
  "replacementPacketPreparation",
  "replacementSchemaPreparation",
  "modelExecution",
  "retry",
  "paidServices",
  "outputMerge",
  "finalLedgerAssembly",
  "scoreDerivation",
  "publicationReconstruction",
  "productionMutation",
  "nextBatchSelection"
]) {
  assert.equal(diagnosis.userAuthorization[key], false, `${key} must be false`);
}

assert.equal(diagnosis.preservedRequest.contextCount, 1);
assert.equal(diagnosis.preservedRequest.debateNumber, "195");
assert.equal(
  diagnosis.preservedRequest.debateId,
  "russell-copleston-existence-of-god-1948"
);
assert.equal(diagnosis.preservedRequest.burdenAdjustmentDecisionsRequired, 2);
assert.deepEqual(diagnosis.preservedRequest.requiredSides, ["pro", "con"]);
assert.equal(diagnosis.preservedRequest.model, "5.6 Sol");
assert.equal(diagnosis.preservedRequest.modelSlug, "gpt-5.6-sol");
assert.equal(diagnosis.preservedRequest.reasoningEffort, "low");
assert.equal(diagnosis.preservedRequest.authentication, "ChatGPT subscription");
assert.equal(diagnosis.preservedRequest.scoreBlind, true);
assert.equal(diagnosis.preservedRequest.roundedIntegerScoreTiesPermitted, true);
assert.equal(diagnosis.preservedRequest.attemptsPerContext, 1);
assert.equal(diagnosis.preservedRequest.retriesMaximum, 0);
assert.equal(diagnosis.preservedRequest.timeoutExtensionsMaximum, 0);
assert.equal(diagnosis.preservedRequest.recursiveCorrectionContextsMaximum, 0);
assert.equal(diagnosis.preservedRequest.apiKeysRemoved, true);
assert.equal(diagnosis.preservedRequest.meteredApiCostUsdMaximum, 0);
assert.equal(
  diagnosis.preservedRequest.responseSchema.declaredDialect,
  "https://json-schema.org/draft/2020-12/schema"
);
assert.equal(
  diagnosis.preservedRequest.responseSchema.arrayPropertyPath,
  "properties.burdenAdjustmentDecisions"
);
assert.equal(diagnosis.preservedRequest.responseSchema.type, "array");
assert.equal(diagnosis.preservedRequest.responseSchema.minimumItems, 2);
assert.equal(diagnosis.preservedRequest.responseSchema.maximumItems, 2);
assert.equal(diagnosis.preservedRequest.responseSchema.positionalSchemas, 2);
assert.deepEqual(diagnosis.preservedRequest.responseSchema.positionalSides, [
  "pro",
  "con"
]);
assert.equal(diagnosis.preservedRequest.responseSchema.itemsValue, false);
assert.equal(diagnosis.preservedRequest.responseSchema.itemsValueType, "boolean");

assert.equal(diagnosis.preservedError.resultStatus, "result-missing");
assert.equal(diagnosis.preservedError.commandExitCode, 1);
assert.equal(diagnosis.preservedError.terminationSignal, null);
assert.equal(diagnosis.preservedError.timedOut, false);
assert.equal(diagnosis.preservedError.outputWritten, false);
assert.equal(diagnosis.preservedError.gateAcceptancePassed, false);
assert.equal(diagnosis.preservedError.requestAttempts, 1);
assert.equal(diagnosis.preservedError.retryCount, 0);
assert.equal(diagnosis.preservedError.timeoutExtensionCount, 0);
assert.equal(diagnosis.preservedError.recursiveCorrectionCount, 0);
assert.equal(diagnosis.preservedError.apiErrorType, "invalid_request_error");
assert.equal(diagnosis.preservedError.apiErrorCode, "invalid_json_schema");
assert.equal(diagnosis.preservedError.httpStatus, 400);
assert.equal(diagnosis.preservedError.apiErrorParameter, "text.format.schema");
assert.equal(
  diagnosis.preservedError.apiErrorMessage,
  "Invalid schema for response_format 'codex_output_schema': In context=('properties', 'burdenAdjustmentDecisions'), array schema items is not an object."
);
assert.equal(
  diagnosis.preservedError.errorEmissionCountInSingleAttemptLog,
  2
);
assert.equal(
  diagnosis.preservedError.sameFailureTextCopiedIntoValidationRecord,
  true
);

assert.equal(
  diagnosis.diagnosis.failureClass,
  "response-schema-array-items-boolean-rejected-by-structured-output-transport"
);
assert.match(diagnosis.diagnosis.immediateCause, /items to the Boolean false/);
for (const key of [
  "requestRejectedBeforeCorrectionOutput"
]) {
  assert.equal(diagnosis.diagnosis[key], true, `${key} must be true`);
}
for (const key of [
  "correctionOutputAvailable",
  "modelInferenceResultAvailable",
  "packetSpecificTwoDecisionConstraintEvaluatedByModel",
  "prefixItemsCompatibilityDetermined",
  "duplicateErrorEmissionsRepresentAdditionalAttempts",
  "schemaMutationRequiredToCompleteDiagnosis",
  "successorSchemaPrepared",
  "replacementPacketPrepared",
  "modelJudgmentFailureDetected",
  "authenticationFailureDetected",
  "timeoutFailureDetected",
  "sourceFailureDetected",
  "candidateSelectionFailureDetected",
  "deterministicOutputValidatorFailureDetected"
]) {
  assert.equal(diagnosis.diagnosis[key], false, `${key} must be false`);
}

assert.equal(diagnosis.preservation.frozenRequestSchemaUnchanged, true);
assert.equal(
  diagnosis.preservation.frozenRequestSchemaSha256,
  diagnosis.preservedRequest.schemaSha256
);
assert.equal(
  diagnosis.preservation.originalOutputUnchangedAccordingToPreservedRecords,
  true
);
assert.equal(diagnosis.preservation.preservedMoveDecisions, 18);
assert.equal(
  diagnosis.preservation.preservedMoveDecisionsUnchangedAccordingToPreservedRecords,
  true
);
assert.equal(diagnosis.preservation.correctionOutputWritten, false);
assert.equal(diagnosis.preservation.retryAttempted, false);
assert.equal(diagnosis.preservation.replacementPrepared, false);
assert.equal(diagnosis.preservation.correctionMerged, false);
assert.equal(diagnosis.preservation.finalLedgerAssembled, false);
assert.equal(diagnosis.preservation.scoresDerived, 0);
assert.equal(diagnosis.preservation.publicationReconstructions, 0);
assert.equal(diagnosis.preservation.productionMutations, 0);
assert.equal(diagnosis.preservation.nextBatchSelections, 0);

assert.equal(diagnosis.evidenceSources.length, 6);
assert.equal(diagnosis.implementationSources.length, 2);
for (const source of diagnosis.evidenceSources) {
  assert.equal(
    diagnosis.implementationSources.includes(source),
    false,
    `evidence source cannot be an implementation source: ${source}`
  );
}
for (const [source, digest] of Object.entries(diagnosis.sourceHashes)) {
  assert.equal(
    sha256(await readFile(source)),
    digest,
    `source hash mismatch: ${source}`
  );
}
assert.equal(diagnosis.costs.diagnosisModelContexts, 0);
assert.equal(diagnosis.costs.paidServiceCalls, 0);
assert.equal(diagnosis.costs.directIncrementalCostUsd, 0);
assert.equal(diagnosis.costs.scoresDerived, 0);
assert.equal(
  Object.values(diagnosis.authorization).every((value) => value === false),
  true
);
assert.equal(
  diagnosis.nextAuthorizedAction,
  "user-approval-required-before-preparation-of-any-transport-compatible-successor-schema-or-execution-preparation"
);

let correctionOutputExists = true;
try {
  await access(outputPath);
} catch {
  correctionOutputExists = false;
}
assert.equal(correctionOutputExists, false, "correction output must remain absent");

console.log(
  JSON.stringify(
    {
      status: "passed",
      debateNumber: "195",
      failureClass: diagnosis.diagnosis.failureClass,
      requestAttempts: 1,
      correctionOutputAvailable: false,
      successorPrepared: false,
      diagnosisModelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
