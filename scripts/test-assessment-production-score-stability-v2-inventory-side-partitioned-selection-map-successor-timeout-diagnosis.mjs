#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-side-partitioned-selection-map-successor";
const diagnosis = JSON.parse(
  await readFile(`${ROOT}/failure-diagnosis.json`, "utf8")
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  diagnosis.status,
  "side-partitioned-selection-map-successor-gate-failed-repeat-debate-137-timeout-confirmed-no-further-action-authorized"
);
assert.equal(diagnosis.gateDisposition.acceptedAsPassed, false);
assert.equal(diagnosis.gateDisposition.contextsPlanned, 10);
assert.equal(diagnosis.gateDisposition.contextsAttempted, 10);
assert.equal(diagnosis.gateDisposition.contextsUnattempted, 0);
assert.equal(diagnosis.gateDisposition.validContexts, 9);
assert.equal(diagnosis.gateDisposition.invalidContexts, 1);
assert.equal(diagnosis.gateDisposition.retries, 0);
assert.equal(
  diagnosis.gateDisposition.predecessorTimeoutGatePreservedFailed,
  true
);
assert.equal(
  diagnosis.gateDisposition.columnarRecoveryGatePreservedFailed,
  true
);
assert.equal(
  diagnosis.gateDisposition.uniqueSelectionSuccessorGatePreservedFailed,
  true
);
assert.equal(
  diagnosis.gateDisposition.sidePartitionedSelectionSuccessorGatePreservedFailed,
  true
);
assert.equal(diagnosis.failure.debateNumber, "137");
assert.equal(diagnosis.failure.status, "timed-out");
assert.equal(diagnosis.failure.elapsedMs, 600009);
assert.equal(diagnosis.failure.timeoutMsApplied, 600000);
assert.equal(diagnosis.failure.stdoutEmpty, true);
assert.equal(diagnosis.failure.proposalWritten, false);
assert.equal(diagnosis.failure.deterministicValidationReached, false);
assert.equal(diagnosis.failure.semanticCorrectionPerformed, false);
assert.equal(diagnosis.failure.retryPerformed, false);
assert.equal(diagnosis.repeatedTimeoutEvidence.occurrences, 2);
assert.equal(diagnosis.repeatedTimeoutEvidence.debateNumber, "137");
assert.equal(diagnosis.repeatedTimeoutEvidence.bothStdoutEmpty, true);
assert.equal(diagnosis.repeatedTimeoutEvidence.bothWithoutProposal, true);
assert.equal(diagnosis.repeatedTimeoutEvidence.original.elapsedMs, 600010);
assert.equal(
  diagnosis.repeatedTimeoutEvidence.sidePartitionedSuccessor.elapsedMs,
  600009
);
assert.equal(diagnosis.repeatedTimeoutEvidence.copiedInputReductionBytes, 5940);
assert.equal(diagnosis.designFinding.debate31PassedCurrentGate, true);
assert.equal(
  diagnosis.designFinding.sidePartitionedTopologyRemovedPriorDebate31FailureMode,
  true
);
assert.equal(diagnosis.designFinding.repeatedDebateSpecificTimeoutConfirmed, true);
assert.equal(diagnosis.designFinding.exactCauseEstablished, false);
assert.equal(diagnosis.designFinding.partialOutputAvailableForRepair, false);
assert.equal(diagnosis.designFinding.retryPermitted, false);
assert.equal(diagnosis.designFinding.timeoutExtensionPermitted, false);
assert.equal(diagnosis.possibleFutureProtocolDirection.authorized, false);
assert.equal(diagnosis.totals.modelContextsThisDiagnosis, 0);
assert.equal(diagnosis.totals.retries, 0);
assert.equal(diagnosis.totals.semanticCorrections, 0);
assert.equal(diagnosis.totals.scoresDerived, 0);
assert.equal(diagnosis.totals.meteredApiCostUsd, 0);
for (const [file, digest] of Object.entries(diagnosis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drift`);
}
for (const [key, authorized] of Object.entries(diagnosis.authorization)) {
  assert.equal(authorized, false, `${key}: must remain unauthorized`);
}
assert.equal(
  diagnosis.nextAuthorizedAction,
  "none-without-explicit-user-authorization"
);
console.log(
  JSON.stringify(
    {
      status: "passed",
      failedDebate: diagnosis.failure.debateNumber,
      repeatedTimeouts: diagnosis.repeatedTimeoutEvidence.occurrences,
      validContexts: diagnosis.gateDisposition.validContexts,
      failedGatesPreserved: 4,
      retries: 0,
      scoresDerived: 0,
      nextAuthorizedAction: diagnosis.nextAuthorizedAction,
    },
    null,
    2
  )
);
