#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/dispute-only-adjudication/source-hash-recovery";
const planPath = `${root}/correction-plan.json`;
const activationPath = `${root}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const planBytes = await readFile(planPath);
const plan = JSON.parse(planBytes);
assertV4(
  plan.status === "frozen-one-field-adjudication-source-hash-correction-ready" &&
    plan.exactMutation.writableFields === 1 &&
    plan.executionPolicy.attemptsMaximum === 1 &&
    plan.executionPolicy.retriesMaximum === 0 &&
    plan.executionPolicy.packetChangesMaximum === 0 &&
    plan.executionPolicy.modelContextsMaximum === 0 &&
    plan.executionPolicy.paidServiceCallsMaximum === 0,
  "Batch 4 adjudication source-hash correction plan changed"
);
assertV4(
  sha256(await readFile(plan.authenticatedInput.path)) ===
      plan.authenticatedInput.sha256 &&
    sha256(await readFile(plan.exactMutation.targetPath)) ===
      plan.exactMutation.toSha256,
  "Batch 4 correction input changed before activation"
);
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
if (shouldWrite) {
  assertV4(!(await exists(activationPath)), "correction already activated");
  assertV4(!(await exists(plan.outputs.execution)), "correction already executed");
}
const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-adjudication-source-hash-correction-activation",
  status: "active-for-exactly-one-adjudication-source-hash-correction-pass",
  batchNumber: 4,
  plan: { path: planPath, sha256: sha256(planBytes) },
  authenticatedInput: structuredClone(plan.authenticatedInput),
  exactMutation: structuredClone(plan.exactMutation),
  executionPolicy: structuredClone(plan.executionPolicy),
  sourceHashes: structuredClone(plan.sourceHashes),
  output: plan.outputs.execution
};
if (shouldWrite) {
  await writeFile(activationPath, `${JSON.stringify(activation, null, 2)}\n`);
}
console.log(JSON.stringify({ status: activation.status, wroteArtifact: shouldWrite }, null, 2));
