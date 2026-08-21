#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const stageRoot =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/audio-verification";
const planPath = `${stageRoot}/cost-decimal-correction-plan.json`;
const activationPath = `${stageRoot}/cost-decimal-correction-activation.json`;
const outputPath = `${stageRoot}/cost-decimal-correction-validation.json`;
const analysisPath = `${stageRoot}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const [planBytes, activationBytes, validation, analysis] = await Promise.all([
  readFile(planPath),
  readFile(activationPath),
  readFile(outputPath, "utf8").then(JSON.parse),
  readFile(analysisPath, "utf8").then(JSON.parse)
]);
const plan = JSON.parse(planBytes);
const activation = JSON.parse(activationBytes);
assert.equal(
  validation.status,
  "passed-exact-integer-unit-and-seven-decimal-cost-overlay"
);
assert.equal(validation.planSha256, sha256(planBytes));
assert.equal(validation.activationSha256, sha256(activationBytes));
assert.equal(validation.inputTokens, 6441);
assert.equal(validation.outputTokens, 9831);
assert.equal(validation.exactIntegerUnits, 1144125);
assert.equal(validation.exactCostUsd, 0.1144125);
assert.equal(validation.preservedSerializedCostUsd, 0.11441250000000001);
assert.equal(validation.normalizedSerializedCostUsd, 0.1144125);
assert.equal(validation.normalizedValuesEqual, true);
assert.equal(validation.approvedCapExceeded, false);
assert.equal(validation.mathematicalCostChanged, false);
assert.equal(validation.capDispositionChanged, false);
assert.equal(validation.attempts, 1);
assert.equal(validation.retries, 0);
assert.equal(validation.reruns, 0);
assert.equal(validation.persistentProtectedWrites, 0);
assert.equal(validation.audioFilesAccessed, 0);
assert.equal(validation.modelCalls, 0);
assert.equal(validation.paidCalls, 0);
assert.equal(validation.directIncrementalCostUsd, 0);
assert.equal(analysis.gate.passed, true);
assert.equal(analysis.gate.verified, 4);
assert.equal(analysis.gate.unresolved, 0);
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
}
for (const [file, digest] of Object.entries(validation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `validation source hash mismatch: ${file}`);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      verifiedMoves: 4,
      exactCostUsd: validation.exactCostUsd,
      approvedCapExceeded: false,
      correctionAttempts: 1,
      audioFilesAccessed: 0,
      paidCallsAdded: 0,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: validation.nextAuthorizedAction
    },
    null,
    2
  )
);
