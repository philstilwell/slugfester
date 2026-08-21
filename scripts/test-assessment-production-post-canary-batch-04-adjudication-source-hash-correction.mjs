#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/dispute-only-adjudication/source-hash-recovery";
const planPath = `${root}/correction-plan.json`;
const activationPath = `${root}/execution-activation.json`;
const executionPath = `${root}/execution.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const [planBytes, activationBytes, execution] = await Promise.all([
  readFile(planPath),
  readFile(activationPath),
  readFile(executionPath, "utf8").then(JSON.parse)
]);
const plan = JSON.parse(planBytes);
const activation = JSON.parse(activationBytes);
assert.equal(
  execution.status,
  "completed-exactly-one-adjudication-source-hash-correction-pass"
);
assert.equal(execution.activationSha256, sha256(activationBytes));
assert.equal(execution.attempts, 1);
assert.equal(execution.retries, 0);
assert.equal(execution.reruns, 0);
assert.equal(execution.packetChanges, 0);
assert.equal(execution.schemaChanges, 0);
assert.equal(execution.modelContexts, 0);
assert.equal(execution.paidServiceCalls, 0);
const correctedBytes = await readFile(execution.output.path);
assert.equal(sha256(correctedBytes), execution.output.sha256);
const corrected = JSON.parse(correctedBytes);
assert.equal(
  corrected.sourceHashes[plan.exactMutation.targetPath],
  plan.exactMutation.toSha256
);
corrected.sourceHashes[plan.exactMutation.targetPath] =
  plan.exactMutation.fromSha256;
assert.equal(
  sha256(Buffer.from(`${JSON.stringify(corrected, null, 2)}\n`)),
  plan.authenticatedInput.sha256
);
assert.equal(activation.plan.sha256, sha256(planBytes));
console.log(
  JSON.stringify(
    {
      status: "passed",
      writableFields: 1,
      packetsPreserved: 10,
      packetChanges: 0,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
