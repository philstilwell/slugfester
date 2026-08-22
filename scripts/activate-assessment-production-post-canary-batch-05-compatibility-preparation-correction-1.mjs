#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-05/production-compatibility/preparation-validation-correction-1";
const PLAN = `${ROOT}/correction-plan.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const activatedAtIndex = process.argv.indexOf("--activated-at");
const activatedAt = activatedAtIndex >= 0 ? process.argv[activatedAtIndex + 1] : null;
if (!activatedAt || Number.isNaN(Date.parse(activatedAt))) throw new Error("--activated-at requires an ISO timestamp");
if (await exists(ACTIVATION)) throw new Error("correction-1 already activated");

const planBytes = await readFile(PLAN);
const plan = JSON.parse(planBytes);
if (
  plan.status !== "frozen-batch-05-compatibility-preparation-correction-1-prepared" ||
  plan.executionPolicy?.correctedValidationPassesMaximum !== 1 ||
  plan.executionPolicy?.retriesMaximum !== 0 ||
  plan.authorization?.deterministicHarnessCorrection !== true ||
  plan.authorization?.modelExecution !== false ||
  plan.authorization?.paidServices !== false
) throw new Error("invalid frozen correction-1 plan");
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  if (sha256(await readFile(file)) !== digest) throw new Error(`${file}: correction source drifted`);
}
for (const item of Object.values(plan.proposed)) {
  const bytes = await readFile(item.path);
  if (sha256(bytes) !== item.sha256 || bytes.length !== item.bytes) throw new Error(`${item.path}: proposed correction drifted`);
}
const activation = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-compatibility-preparation-correction-1-activation",
  status: "frozen-batch-05-compatibility-preparation-correction-1-authorized",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  plan: { path: PLAN, sha256: sha256(planBytes), bytes: planBytes.length },
  sourceHashes: plan.sourceHashes,
  proposed: plan.proposed,
  correctionScope: plan.correctionScope,
  executionPolicy: plan.executionPolicy,
  authorization: {
    deterministicHarnessCorrection: true,
    correctedValidationPass: true,
    compatibilityActivation: false,
    compatibilityExecution: false,
    modelExecution: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextRequiredAction: "execute-one-batch-05-compatibility-preparation-correction-1-validation-pass"
};
await writeFile(ACTIVATION, `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({ status: activation.status, correctedValidationPassesMaximum: 1, directIncrementalCostUsd: 0, nextRequiredAction: activation.nextRequiredAction }, null, 2));
