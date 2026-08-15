#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/dispute-only-adjudication";
const diagnosisPath = `${ROOT}/failure-diagnosis.json`;
const diagnosis = JSON.parse(await readFile(diagnosisPath, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  diagnosis.status,
  "debate-195-required-burden-adjustment-decisions-omitted-confirmed-frozen-no-correction-authorized"
);
assert.equal(diagnosis.productionCanary, false);
assert.equal(diagnosis.batchNumber, 1);
assert.equal(diagnosis.stagingOnly, true);
assert.equal(diagnosis.debate.debateNumber, "195");
assert.equal(
  diagnosis.debate.debateId,
  "russell-copleston-existence-of-god-1948"
);
assert.equal(diagnosis.preservedGate.validContexts, 9);
assert.equal(diagnosis.preservedGate.requiredValidContexts, 10);
assert.equal(diagnosis.preservedGate.debate195Accepted, false);
assert.equal(diagnosis.preservedGate.erasedReclassifiedOrRepaired, false);
assert.equal(diagnosis.execution.model, "5.6 Sol");
assert.equal(diagnosis.execution.modelSlug, "gpt-5.6-sol");
assert.equal(diagnosis.execution.reasoningEffort, "low");
assert.equal(diagnosis.execution.authentication, "ChatGPT subscription");
assert.equal(diagnosis.execution.scoreBlind, true);
assert.equal(diagnosis.execution.apiKeysRemoved, true);
assert.equal(diagnosis.execution.attemptCount, 1);
assert.equal(diagnosis.execution.retryCount, 0);
assert.equal(diagnosis.execution.timeoutExtensionCount, 0);
assert.equal(diagnosis.execution.commandExitCode, 0);
assert.equal(diagnosis.execution.timedOut, false);
assert.equal(diagnosis.execution.gateAcceptancePassed, false);
assert.equal(
  diagnosis.execution.validationMessage,
  "burden adjustment decision count mismatch"
);
assert.equal(
  diagnosis.diagnosis.failureClass,
  "required-burden-adjustment-decisions-omitted-with-non-instance-specific-transport-cardinality"
);
assert.equal(diagnosis.diagnosis.packetDisputedMoves, 18);
assert.equal(diagnosis.diagnosis.outputMoveDecisions, 18);
assert.equal(diagnosis.diagnosis.moveDecisionIdsMatchInRequiredOrder, true);
assert.equal(diagnosis.diagnosis.requiredMoveCandidateSelections, 41);
assert.equal(diagnosis.diagnosis.outputMoveCandidateSelections, 41);
assert.equal(diagnosis.diagnosis.requiredBurdenAdjustmentDecisions, 2);
assert.deepEqual(diagnosis.diagnosis.requiredBurdenAdjustmentSides, [
  "pro",
  "con"
]);
assert.equal(diagnosis.diagnosis.outputBurdenAdjustmentDecisions, 0);
assert.equal(diagnosis.diagnosis.missingBurdenAdjustmentDecisions, 2);
assert.equal(diagnosis.diagnosis.requiredCandidateSelectionsTotal, 43);
assert.equal(diagnosis.diagnosis.presentCandidateSelectionsBeforeFailure, 41);
assert.equal(diagnosis.diagnosis.missingCandidateSelections, 2);
assert.equal(diagnosis.diagnosis.allMoveChecksPrecedingFailurePassed, true);
assert.equal(diagnosis.diagnosis.outputAuditFieldsPresentAndTrue, true);
assert.equal(diagnosis.diagnosis.transportInstructionRequiredEveryPair, true);
assert.equal(
  diagnosis.diagnosis.transportSchemaBurdenAdjustmentMinimumItems,
  0
);
assert.equal(
  diagnosis.diagnosis.transportSchemaBurdenAdjustmentMaximumItems,
  2
);
assert.equal(
  diagnosis.diagnosis.emptyBurdenAdjustmentArrayPermittedByTransportSchemaCardinality,
  true
);
assert.equal(
  diagnosis.diagnosis.exactPacketCardinalityEnforcedByDeterministicValidator,
  true
);
for (const key of [
  "sourceFailureDetected",
  "identityFailureDetected",
  "isolationFailureDetected",
  "timeoutFailureDetected",
  "commandFailureDetected",
  "scoreBlindnessFailureDetected",
  "validatorFailureDetected"
]) {
  assert.equal(diagnosis.diagnosis[key], false, `${key} must remain false`);
}
assert.equal(diagnosis.preservation.outputBytesChanged, false);
assert.equal(diagnosis.preservation.outputRevalidatedButNotAccepted, true);
assert.equal(diagnosis.preservation.retryAttempted, false);
assert.equal(diagnosis.preservation.repairAttempted, false);
assert.equal(diagnosis.preservation.modelContextsExecuted, 0);
assert.equal(diagnosis.preservation.paidServicesUsed, 0);
assert.equal(diagnosis.preservation.ledgersAssembled, 0);
assert.equal(diagnosis.preservation.scoresDerived, 0);
assert.equal(diagnosis.preservation.publicationReconstructions, 0);
assert.equal(diagnosis.preservation.productionMutations, 0);
assert.equal(diagnosis.preservation.nextBatchSelections, 0);
assert.equal(diagnosis.costs.directIncrementalCostUsd, 0);
assert.equal(diagnosis.costs.modelContexts, 0);
assert.equal(diagnosis.costs.paidServiceCalls, 0);
assert.equal(diagnosis.costs.scoresDerived, 0);
assert.equal(
  Object.values(diagnosis.authorization).every((value) => value === false),
  true
);
assert.equal(
  diagnosis.nextAuthorizedAction,
  "user-approval-required-before-any-debate-195-adjudication-correction-preparation-or-downstream-work"
);
for (const [source, digest] of Object.entries(diagnosis.sourceHashes)) {
  assert.equal(
    sha256(await readFile(source)),
    digest,
    `source hash mismatch: ${source}`
  );
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      debateNumber: "195",
      failureClass: diagnosis.diagnosis.failureClass,
      requiredBurdenAdjustmentDecisions: 2,
      outputBurdenAdjustmentDecisions: 0,
      originalOutputPreserved: true,
      modelContexts: 0,
      paidServiceCalls: 0,
      scoresDerived: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
