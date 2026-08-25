#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/publication-reconstruction/resumption-1";
const DIAGNOSIS = `${ROOT}/timeout-failure-diagnosis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const diagnosis = JSON.parse(await readFile(DIAGNOSIS, "utf8"));
assert.equal(
  diagnosis.status,
  "frozen-diagnosed-one-content-timeout-and-three-host-sleep-interrupted-publication-contexts"
);
assert.equal(diagnosis.batchNumber, 9);
assert.equal(diagnosis.modelExecutionOccurred, true);
assert.equal(diagnosis.modelContextsAttempted, 9);
assert.equal(diagnosis.modelContextsAccepted, 5);
assert.equal(diagnosis.modelContextsFailed, 4);
assert.equal(diagnosis.retries, 0);
assert.equal(diagnosis.timeoutExtensions, 0);
assert.equal(diagnosis.paidServiceCalls, 0);
assert.equal(diagnosis.directIncrementalCostUsd, 0);

for (const [file, expected] of Object.entries(diagnosis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), expected, `${file}: source drift`);
}

const execution = JSON.parse(await readFile(diagnosis.inputs.execution, "utf8"));
assert.equal(execution.contextsAttempted, 9);
assert.equal(execution.validContexts, 5);
assert.equal(execution.invalidContexts, 4);
assert.equal(execution.attempts, 9);
assert.equal(execution.retries, 0);
assert.equal(execution.timeoutExtensions, 0);
assert.deepEqual(
  execution.results
    .filter((result) => result.gateAcceptancePassed)
    .map((result) => result.debateNumber),
  ["134", "19", "114", "89", "176"]
);
assert.deepEqual(
  execution.results
    .filter((result) => !result.gateAcceptancePassed)
    .map((result) => [result.debateNumber, result.status, result.outputWritten]),
  [
    ["166", "timed-out", false],
    ["183", "timed-out", false],
    ["112", "timed-out", false],
    ["17", "timed-out", false]
  ]
);

const resultByDebate = new Map(
  execution.results.map((result) => [result.debateNumber, result])
);
const overlaps = (result, interval) =>
  Date.parse(result.startedAt) < Date.parse(interval.endedAt) &&
  Date.parse(result.completedAt) > Date.parse(interval.startedAt);
const sleepIntervals = diagnosis.localPowerEvidence.intervals.filter(
  (interval) => interval.state === "sleep"
);
assert(
  Date.parse(resultByDebate.get("166").completedAt) <
    Date.parse(sleepIntervals[0].startedAt)
);
for (const debateNumber of ["183", "112", "17"]) {
  assert(
    sleepIntervals.some((interval) =>
      overlaps(resultByDebate.get(debateNumber), interval)
    ),
    `Debate ${debateNumber}: frozen host-sleep overlap missing`
  );
}
assert.equal(diagnosis.failureClasses.contentGenerationTimeout.contexts, 1);
assert.equal(diagnosis.failureClasses.hostSleepInterruption.contexts, 3);
assert.equal(
  diagnosis.stopRuleEvaluation.thirdFailureOfSameUnderlyingProblemReached,
  true
);
assert.equal(diagnosis.stopRuleEvaluation.automaticRecoveryAuthorized, false);
assert.equal(diagnosis.recoveryPrepared, false);
assert.equal(diagnosis.modelContextsExecutedDuringDiagnosis, 0);

console.log(
  JSON.stringify(
    {
      status: "passed",
      acceptedContexts: 5,
      contentGenerationTimeouts: 1,
      hostSleepInterruptedContexts: 3,
      recoveryPrepared: false,
      modelContextsExecutedDuringDiagnosis: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      stopRuleReached: "third-failure-of-same-underlying-host-sleep-problem"
    },
    null,
    2
  )
);
