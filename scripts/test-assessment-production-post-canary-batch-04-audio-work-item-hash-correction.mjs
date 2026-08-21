#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/disagreement-extraction";
const diagnosisPath = `${root}/audio-work-item-source-hash-failure-diagnosis.json`;
const planPath = `${root}/audio-work-item-source-hash-correction-plan.json`;
const activationPath = `${root}/audio-work-item-source-hash-correction-activation.json`;
const executionPath = `${root}/audio-work-item-source-hash-correction-execution.json`;
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

let executionValidated = false;
try {
  const [activationBytes, executionBytes] = await Promise.all([
    readFile(activationPath),
    readFile(executionPath)
  ]);
  const activation = JSON.parse(activationBytes);
  const execution = JSON.parse(executionBytes);
  assert.equal(
    activation.status,
    "active-for-exactly-one-deterministic-source-hash-correction-pass"
  );
  assert.equal(activation.plan.sha256, sha256(await readFile(planPath)));
  assert.equal(
    execution.status,
    "completed-exactly-one-deterministic-source-hash-correction-pass"
  );
  assert.equal(execution.activationSha256, sha256(activationBytes));
  assert.equal(execution.attempts, 1);
  assert.equal(execution.retries, 0);
  assert.equal(execution.reruns, 0);
  assert.equal(execution.mediaFilesAccessed, 0);
  assert.equal(execution.modelContexts, 0);
  assert.equal(execution.paidServiceCalls, 0);
  assert.equal(execution.directIncrementalCostUsd, 0);
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
  executionValidated = true;
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  assert.equal(
    plan.authenticatedInput.sha256,
    sha256(await readFile(plan.authenticatedInput.path))
  );
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      diagnosedFiles: 1,
      writableFields: 1,
      executionValidated,
      frozenPreimageReconstructed: executionValidated,
      correctionRerun: false,
      mediaAccessOccurred: false,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
