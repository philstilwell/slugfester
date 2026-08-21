#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const stageRoot =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/audio-verification";
const planPath = `${stageRoot}/cost-decimal-correction-plan.json`;
const activationPath = `${stageRoot}/cost-decimal-correction-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const planBytes = await readFile(planPath);
const plan = JSON.parse(planBytes);
assertV4(
  plan.status ===
      "frozen-one-pass-exact-cost-normalization-overlay-ready-for-activation" &&
    plan.exactOverlay.exactIntegerUnits === 1144125 &&
    plan.exactOverlay.exactCostUsd === 0.1144125 &&
    plan.executionPolicy.attemptsMaximum === 1 &&
    plan.executionPolicy.retriesMaximum === 0 &&
    plan.executionPolicy.persistentProtectedWritesMaximum === 0 &&
    plan.executionPolicy.audioAccessAllowed === false &&
    plan.executionPolicy.paidServiceAllowed === false,
  "Batch 4 cost normalization plan changed"
);
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
if (shouldWrite) {
  assertV4(!(await exists(activationPath)), "correction already activated");
  assertV4(!(await exists(plan.outputs.validation)), "correction already executed");
}

const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-audio-cost-decimal-correction-activation",
  status: "active-for-exactly-one-batch-04-exact-cost-normalization-overlay",
  batchNumber: 4,
  activatedFromCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  plan: { path: planPath, sha256: sha256(planBytes) },
  exactOverlay: structuredClone(plan.exactOverlay),
  executionPolicy: structuredClone(plan.executionPolicy),
  sourceHashes: structuredClone(plan.sourceHashes),
  output: plan.outputs.validation,
  authorization: {
    deterministicCostOverlay: true,
    audioAccess: false,
    modelExecution: false,
    paidService: false,
    transcriptMutation: false,
    scoreDerivation: false
  }
};
if (shouldWrite) {
  await writeFile(activationPath, `${JSON.stringify(activation, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: activation.status,
      wroteArtifact: shouldWrite,
      attemptsMaximum: 1,
      audioAccess: false,
      paidService: false,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
