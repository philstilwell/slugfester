#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const stageRoot =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/audio-verification";
const planPath = `${stageRoot}/cost-decimal-correction-plan.json`;
const activationPath = `${stageRoot}/cost-decimal-correction-activation.json`;
const outputPath = `${stageRoot}/cost-decimal-correction-validation.json`;
const costPath = `${stageRoot}/cost-control-analysis.json`;
const executionPath = `${stageRoot}/model-execution.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assertV4(!(await exists(outputPath)), "Batch 4 cost overlay already executed");
const [planBytes, activationBytes, costBytes, executionBytes] =
  await Promise.all([
    readFile(planPath),
    readFile(activationPath),
    readFile(costPath),
    readFile(executionPath)
  ]);
const plan = JSON.parse(planBytes);
const activation = JSON.parse(activationBytes);
const cost = JSON.parse(costBytes);
const execution = JSON.parse(executionBytes);
assertV4(
  activation.status ===
      "active-for-exactly-one-batch-04-exact-cost-normalization-overlay" &&
    activation.plan.sha256 === sha256(planBytes) &&
    activation.executionPolicy.attemptsMaximum === 1 &&
    activation.executionPolicy.retriesMaximum === 0 &&
    activation.executionPolicy.persistentProtectedWritesMaximum === 0 &&
    activation.authorization.audioAccess === false &&
    activation.authorization.modelExecution === false &&
    activation.authorization.paidService === false,
  "Batch 4 cost overlay activation changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}

const exactIntegerUnits =
  cost.totals.inputTokens * activation.exactOverlay.inputUnitsPerToken +
  cost.totals.outputTokens * activation.exactOverlay.outputUnitsPerToken;
const exactCostUsd = exactIntegerUnits / 10_000_000;
const normalizedSerializedCostUsd = Number(
  cost.costControl.usageDerivedEstimatedCostUsd.toFixed(7)
);
assertV4(
  exactIntegerUnits === activation.exactOverlay.exactIntegerUnits &&
    exactCostUsd === activation.exactOverlay.exactCostUsd &&
    cost.costControl.usageDerivedEstimatedCostUsd ===
      activation.exactOverlay.preservedSerializedCostUsd &&
    normalizedSerializedCostUsd === exactCostUsd &&
    execution.usageDerivedEstimatedCostUsd === exactCostUsd &&
    cost.costControl.approvedCapExceeded === false,
  "Batch 4 exact-cost normalization overlay failed"
);

const validation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-audio-cost-decimal-correction-validation",
  status: "passed-exact-integer-unit-and-seven-decimal-cost-overlay",
  batchNumber: 4,
  operation: activation.exactOverlay.operation,
  planSha256: sha256(planBytes),
  activationSha256: sha256(activationBytes),
  inputTokens: cost.totals.inputTokens,
  outputTokens: cost.totals.outputTokens,
  exactIntegerUnits,
  exactCostUsd,
  preservedSerializedCostUsd: cost.costControl.usageDerivedEstimatedCostUsd,
  normalizedSerializedCostUsd,
  normalizedValuesEqual: true,
  approvedMaximumCostUsd: cost.costControl.approvedMaximumCostUsd,
  approvedCapExceeded: false,
  mathematicalCostChanged: false,
  capDispositionChanged: false,
  attempts: 1,
  retries: 0,
  reruns: 0,
  persistentProtectedWrites: 0,
  audioFilesAccessed: 0,
  modelCalls: 0,
  paidCalls: 0,
  scoresDerived: 0,
  directIncrementalCostUsd: 0,
  sourceHashes: {
    [costPath]: sha256(costBytes),
    [executionPath]: sha256(executionBytes)
  },
  nextAuthorizedAction:
    "resume-batch-04-dispute-only-adjudication-preparation-under-standing-authorization"
};
await writeFile(outputPath, `${JSON.stringify(validation, null, 2)}\n`);
console.log(JSON.stringify(validation, null, 2));
