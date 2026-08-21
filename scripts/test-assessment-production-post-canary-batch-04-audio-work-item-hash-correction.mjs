#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/disagreement-extraction";
const diagnosisPath = `${root}/audio-work-item-source-hash-failure-diagnosis.json`;
const planPath = `${root}/audio-work-item-source-hash-correction-plan.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const [diagnosisBytes, plan] = await Promise.all([
  readFile(diagnosisPath),
  readFile(planPath, "utf8").then(JSON.parse)
]);
const diagnosis = JSON.parse(diagnosisBytes);

assert.equal(
  diagnosis.status,
  "diagnosed-preserved-one-byte-tool-source-hash-mismatch"
);
assert.equal(
  plan.status,
  "frozen-bounded-source-hash-correction-ready-for-activation"
);
assert.equal(plan.batchNumber, 4);
assert.equal(plan.diagnosis.path, diagnosisPath);
assert.equal(plan.diagnosis.sha256, sha256(diagnosisBytes));
assert.equal(
  plan.authenticatedInput.sha256,
  sha256(await readFile(plan.authenticatedInput.path))
);
assert.equal(plan.exactMutation.targetPath, diagnosis.cause.targetPath);
assert.equal(plan.exactMutation.fromSha256, diagnosis.cause.recordedSha256);
assert.equal(
  plan.exactMutation.toSha256,
  sha256(await readFile(plan.exactMutation.targetPath))
);
assert.equal(plan.exactMutation.writableFields, 1);
assert.equal(plan.controls.attemptsMaximum, 1);
assert.equal(plan.controls.retriesMaximum, 0);
assert.equal(plan.controls.rerunsMaximum, 0);
assert.equal(plan.controls.mediaAccessAllowed, false);
assert.equal(plan.controls.modelsAllowed, false);
assert.equal(plan.controls.paidServicesAllowed, false);
assert.equal(plan.controls.directIncrementalCostUsdMaximum, 0);
assert.equal(
  plan.requiredValidation.preservedWorkArtifactHash,
  diagnosis.protectedEvidence.workArtifactSha256
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      diagnosedFiles: 1,
      writableFields: 1,
      mediaAccessOccurred: false,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
