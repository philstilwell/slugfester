#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-05/production-compatibility/preparation-validation-correction-2";
const PLAN = `${ROOT}/correction-plan.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const activatedAtIndex = process.argv.indexOf("--activated-at");
const activatedAt = activatedAtIndex >= 0 ? process.argv[activatedAtIndex + 1] : null;
if (!activatedAt || Number.isNaN(Date.parse(activatedAt))) {
  throw new Error("--activated-at requires an ISO timestamp");
}
if (await exists(ACTIVATION)) throw new Error("correction-2 already activated");

const planBytes = await readFile(PLAN);
const plan = JSON.parse(planBytes);
if (
  plan.status !== "frozen-batch-05-compatibility-preparation-correction-2-prepared" ||
  plan.correctionScope?.writableFields !== 1 ||
  plan.correctionScope?.jsonPointer !== "/preparation/sha256" ||
  plan.executionPolicy?.correctedValidationPassesMaximum !== 1 ||
  plan.executionPolicy?.attemptsMaximum !== 1 ||
  plan.executionPolicy?.retriesMaximum !== 0 ||
  plan.executionPolicy?.rerunsMaximum !== 0 ||
  plan.authorization?.recursiveDeterministicHarnessCorrection !== true ||
  plan.authorization?.modelExecution !== false ||
  plan.authorization?.paidServices !== false
) {
  throw new Error("invalid frozen correction-2 plan");
}
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  if (sha256(await readFile(file)) !== digest) throw new Error(`${file}: correction source drifted`);
}
const proposedAnalysisBytes = await readFile(plan.proposed.analysis.path);
if (
  sha256(proposedAnalysisBytes) !== plan.proposed.analysis.sha256 ||
  proposedAnalysisBytes.length !== plan.proposed.analysis.bytes
) {
  throw new Error("proposed correction-2 analysis drifted");
}
const proposedAnalysis = JSON.parse(proposedAnalysisBytes);
if (
  proposedAnalysis.preparation?.sha256 !== plan.correctionScope.newSha256 ||
  plan.sourceHashes[plan.correctionScope.target] !== plan.correctionScope.oldSha256
) {
  throw new Error("correction-2 preimage or proposed hash is unauthenticated");
}

const activation = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2-activation",
  status: "frozen-batch-05-compatibility-preparation-correction-2-authorized",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  plan: { path: PLAN, sha256: sha256(planBytes), bytes: planBytes.length },
  diagnosis: plan.diagnosis,
  sourceHashes: plan.sourceHashes,
  proposed: plan.proposed,
  correctionScope: plan.correctionScope,
  executionPolicy: plan.executionPolicy,
  authorization: {
    recursiveDeterministicHarnessCorrection: true,
    correctedValidationPass: true,
    compatibilityActivation: false,
    compatibilityExecution: false,
    modelExecution: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextRequiredAction: "execute-one-batch-05-compatibility-preparation-correction-2-validation-pass"
};
await writeFile(ACTIVATION, `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({
  status: activation.status,
  correctedValidationPassesMaximum: 1,
  writableFields: 1,
  directIncrementalCostUsd: 0,
  nextRequiredAction: activation.nextRequiredAction
}, null, 2));
