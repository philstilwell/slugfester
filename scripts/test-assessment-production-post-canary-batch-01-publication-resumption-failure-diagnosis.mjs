#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/publication-reconstruction/resumption-1";
const diagnosis = JSON.parse(
  await readFile(`${ROOT}/failure-diagnosis.json`, "utf8")
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  diagnosis.status,
  "diagnosed-batch-01-publication-resumption-four-field-validation-failures"
);
assert.equal(diagnosis.productionCanary, false);
assert.equal(diagnosis.batchNumber, 1);
assert.equal(diagnosis.stagingOnly, true);
assert.equal(diagnosis.userAuthorization.directIncrementalCostUsdMaximum, 0);
for (const key of [
  "repairPacketPreparation",
  "modelExecution",
  "retry",
  "paidServices",
  "publicationCompilation",
  "publicationFinalization",
  "productionMutation",
  "nextBatchSelection"
]) {
  assert.equal(diagnosis.userAuthorization[key], false, `${key} must be false`);
}
assert.equal(diagnosis.preservedGate.contextsPlanned, 9);
assert.equal(diagnosis.preservedGate.contextsAttempted, 9);
assert.equal(diagnosis.preservedGate.contextsValid, 7);
assert.equal(diagnosis.preservedGate.contextsInvalid, 2);
assert.equal(diagnosis.preservedGate.contextsUnattempted, 0);
assert.equal(diagnosis.preservedGate.validCohortDebates, 8);
assert.equal(diagnosis.preservedGate.validCohortMoves, 147);
assert.deepEqual(diagnosis.preservedGate.failedDebates, ["91", "13"]);
assert.equal(
  diagnosis.preservedGate.failuresErasedReclassifiedOrRepaired,
  false
);
assert.deepEqual(
  diagnosis.failedContexts.map(({ debateNumber }) => debateNumber),
  ["91", "13"]
);
for (const context of diagnosis.failedContexts) {
  assert.equal(context.model.label, "5.6 Sol");
  assert.equal(context.model.slug, "gpt-5.6-sol");
  assert.equal(context.model.reasoningEffort, "low");
  assert.equal(context.model.authentication, "ChatGPT subscription");
  assert.equal(context.scoreBlind, true);
  assert.equal(context.apiKeysRemoved, true);
  assert.equal(context.attemptCount, 1);
  assert.equal(context.retryCount, 0);
  assert.equal(context.timeoutExtensionCount, 0);
  assert.equal(context.correctionContextCount, 0);
  assert.equal(context.transportPassed, true);
  assert.equal(context.gateAcceptancePassed, false);
}
assert.equal(diagnosis.failureBoundary.failedFieldCount, 4);
assert.equal(diagnosis.failureBoundary.affectedDebates, 2);
assert.deepEqual(
  diagnosis.failureBoundary.failedFields.map(
    ({ debateNumber, path }) => `${debateNumber}:${path}`
  ),
  [
    "91:representativeQuotes.con.text",
    "13:moveProse.con-consolation-not-truth.critique",
    "13:moveProse.con-job-terrifying-submission.critique",
    "13:moveProse.pro-slavery-law-accommodation.critique"
  ]
);
const quoteFailure = diagnosis.failureBoundary.failedFields[0];
assert.equal(quoteFailure.outputWords, 14);
assert.equal(quoteFailure.exactDiagnosticSourceSubstringWords, 16);
assert.deepEqual(quoteFailure.acceptanceWords, [3, 18]);
assert.equal(quoteFailure.omittedSourceTokens, 2);
assert.equal(
  quoteFailure.originalValidationMessage,
  "con: quote is not an exact source substring"
);
const critiqueFailure = diagnosis.failureBoundary.failedFields[1];
assert.equal(critiqueFailure.words, 133);
assert.equal(critiqueFailure.characters, 1088);
assert.equal(critiqueFailure.sentences, 4);
assert.equal(critiqueFailure.excessWordsAboveAcceptanceMaximum, 3);
assert.equal(critiqueFailure.orderedLabelsPassed, true);
assert.equal(critiqueFailure.terminalPunctuationPassed, true);
assert.equal(
  critiqueFailure.originalValidationMessage,
  "con-consolation-not-truth: critique outside 105–130 words"
);
assert.deepEqual(
  diagnosis.failureBoundary.failedFields.slice(2).map(
    ({ words, excessWordsAboveAcceptanceMaximum }) => [
      words,
      excessWordsAboveAcceptanceMaximum
    ]
  ),
  [
    [131, 1],
    [131, 1]
  ]
);
for (const key of [
  "debate91AdditionalFailuresDetected",
  "debate13AdditionalFailuresDetected",
  "sourceFailureDetected",
  "identityFailureDetected",
  "isolationFailureDetected",
  "timeoutFailureDetected",
  "commandFailureDetected",
  "scoreBlindnessFailureDetected",
  "validatorFailureDetected"
]) {
  assert.equal(diagnosis.failureBoundary[key], false, `${key} must be false`);
}
assert.equal(diagnosis.diagnosticReplay.inMemoryOnly, true);
assert.equal(diagnosis.diagnosticReplay.persistedCorrectedOutputs, 0);
assert.equal(diagnosis.diagnosticReplay.originalOutputBytesChanged, false);
assert.equal(diagnosis.diagnosticReplay.debates.length, 2);
for (const replay of diagnosis.diagnosticReplay.debates) {
  assert.equal(replay.result.status, "passed");
  assert.equal(replay.result.quoteExactSourceMatches, 2);
  assert.equal(replay.result.overallCommentarySides, 2);
  assert.equal(replay.result.aiExtensionSides, 2);
  assert.equal(replay.result.calculatedScoresAuthoredByModel, 0);
  assert.equal(replay.result.lockedScoresUnchanged, true);
}
assert.equal(diagnosis.preservedControls.modelContextsExecutedForDiagnosis, 0);
assert.equal(diagnosis.preservedControls.retries, 0);
assert.equal(diagnosis.preservedControls.timeoutExtensions, 0);
assert.equal(diagnosis.preservedControls.correctionModelContexts, 0);
assert.equal(diagnosis.preservedControls.repairPacketsPrepared, 0);
assert.equal(diagnosis.preservedControls.paidServiceCalls, 0);
assert.equal(diagnosis.preservedControls.directIncrementalCostUsd, 0);
assert.equal(diagnosis.preservedControls.publicationCompilationPasses, 0);
assert.equal(diagnosis.preservedControls.publicationFinalized, false);
assert.equal(diagnosis.preservedControls.productionMutation, false);
assert.equal(diagnosis.preservedControls.nextBatchSelected, false);
assert.equal(diagnosis.prospectiveRecoveryOnly.currentlyAuthorized, false);
assert.equal(diagnosis.prospectiveRecoveryOnly.repairPacketsPrepared, 0);
assert.equal(diagnosis.prospectiveRecoveryOnly.proposedRepairPacketCount, 3);
assert.deepEqual(
  diagnosis.prospectiveRecoveryOnly.proposedRepairPackets.map(
    ({ debateNumber, writableFieldCount }) => [
      debateNumber,
      writableFieldCount
    ]
  ),
  [
    ["91", 1],
    ["13", 2],
    ["13", 1]
  ]
);
assert.equal(
  Object.values(diagnosis.authorization).every((value) => value === false),
  true
);
for (const [source, digest] of Object.entries(diagnosis.sourceHashes)) {
  assert.equal(
    sha256(await readFile(source)),
    digest,
    `source hash mismatch: ${source}`
  );
}
assert.equal(
  diagnosis.nextRequiredAction,
  "user-approval-required-before-preparation-of-three-batch-01-publication-resumption-repair-packets-covering-four-failed-fields-and-execution-preparation-manifest-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      failedDebates: ["91", "13"],
      failedFields: 4,
      hypotheticalFullReplaysPassed: 2,
      originalOutputsModified: false,
      repairPacketsPrepared: 0,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
