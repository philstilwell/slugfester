#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/disagreement-extraction";
const planPath = `${root}/audio-work-item-source-hash-correction-plan.json`;
const activationPath = `${root}/audio-work-item-source-hash-correction-activation.json`;
const executionPath = `${root}/audio-work-item-source-hash-correction-execution.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assertV4(
  !(await exists(executionPath)),
  "Batch 4 audio work-item source-hash correction already ran"
);
const [planBytes, activationBytes] = await Promise.all([
  readFile(planPath),
  readFile(activationPath)
]);
const plan = JSON.parse(planBytes);
const activation = JSON.parse(activationBytes);
assertV4(
  activation.status ===
      "active-for-exactly-one-deterministic-source-hash-correction-pass" &&
    activation.plan.path === planPath &&
    activation.plan.sha256 === sha256(planBytes) &&
    activation.authenticatedInput.sha256 === plan.authenticatedInput.sha256 &&
    activation.executionControls.attemptsMaximum === 1 &&
    activation.executionControls.retriesMaximum === 0 &&
    activation.executionControls.rerunsMaximum === 0 &&
    activation.executionControls.mediaAccessAllowed === false &&
    activation.executionControls.modelsAllowed === false &&
    activation.executionControls.paidServicesAllowed === false,
  "Batch 4 source-hash correction activation changed"
);

const preparationBytes = await readFile(plan.authenticatedInput.path);
assertV4(
  sha256(preparationBytes) === plan.authenticatedInput.sha256,
  "Batch 4 correction input changed after activation"
);
const preparation = JSON.parse(preparationBytes);
const targetPath = plan.exactMutation.targetPath;
assertV4(
  preparation.sourceHashes?.[targetPath] ===
      plan.exactMutation.fromSha256 &&
    sha256(await readFile(targetPath)) === plan.exactMutation.toSha256,
  "Batch 4 source-hash correction precondition changed"
);

preparation.sourceHashes[targetPath] = plan.exactMutation.toSha256;
const correctedBytes = Buffer.from(`${JSON.stringify(preparation, null, 2)}\n`);
await writeFile(plan.authenticatedInput.path, correctedBytes);

const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-audio-work-item-source-hash-correction-execution",
  status: "completed-exactly-one-deterministic-source-hash-correction-pass",
  batchNumber: 4,
  planSha256: sha256(planBytes),
  activationSha256: sha256(activationBytes),
  input: structuredClone(plan.authenticatedInput),
  output: {
    path: plan.authenticatedInput.path,
    sha256: sha256(correctedBytes)
  },
  exactMutation: structuredClone(plan.exactMutation),
  attempts: 1,
  retries: 0,
  reruns: 0,
  mediaFilesAccessed: 0,
  modelContexts: 0,
  paidServiceCalls: 0,
  scoresDerived: 0,
  directIncrementalCostUsd: 0
};
await writeFile(executionPath, `${JSON.stringify(execution, null, 2)}\n`);

console.log(JSON.stringify(execution, null, 2));
