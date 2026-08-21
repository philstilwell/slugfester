#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/dispute-only-adjudication/source-hash-recovery";
const activationPath = `${root}/execution-activation.json`;
const executionPath = `${root}/execution.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assertV4(!(await exists(executionPath)), "correction already executed");
const activationBytes = await readFile(activationPath);
const activation = JSON.parse(activationBytes);
assertV4(
  activation.status ===
      "active-for-exactly-one-adjudication-source-hash-correction-pass" &&
    activation.executionPolicy.attemptsMaximum === 1 &&
    activation.executionPolicy.retriesMaximum === 0 &&
    activation.executionPolicy.packetChangesMaximum === 0 &&
    activation.executionPolicy.modelContextsMaximum === 0 &&
    activation.executionPolicy.paidServiceCallsMaximum === 0,
  "Batch 4 adjudication source-hash correction activation changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
const inputBytes = await readFile(activation.authenticatedInput.path);
assertV4(
  sha256(inputBytes) === activation.authenticatedInput.sha256,
  "authenticated preparation changed"
);
const preparation = JSON.parse(inputBytes);
assertV4(
  preparation.sourceHashes[activation.exactMutation.targetPath] ===
    activation.exactMutation.fromSha256,
  "frozen source-hash precondition changed"
);
preparation.sourceHashes[activation.exactMutation.targetPath] =
  activation.exactMutation.toSha256;
const outputBytes = Buffer.from(`${JSON.stringify(preparation, null, 2)}\n`);
await writeFile(activation.authenticatedInput.path, outputBytes);
const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-adjudication-source-hash-correction-execution",
  status: "completed-exactly-one-adjudication-source-hash-correction-pass",
  batchNumber: 4,
  activationSha256: sha256(activationBytes),
  input: structuredClone(activation.authenticatedInput),
  output: {
    path: activation.authenticatedInput.path,
    sha256: sha256(outputBytes)
  },
  exactMutation: structuredClone(activation.exactMutation),
  attempts: 1,
  retries: 0,
  reruns: 0,
  packetChanges: 0,
  schemaChanges: 0,
  modelContexts: 0,
  paidServiceCalls: 0,
  scoresDerived: 0,
  directIncrementalCostUsd: 0
};
await writeFile(executionPath, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify(execution, null, 2));
