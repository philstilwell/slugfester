#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/disagreement-extraction";
const planPath = `${root}/audio-work-item-source-hash-correction-plan.json`;
const activationPath = `${root}/audio-work-item-source-hash-correction-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const planBytes = await readFile(planPath);
const plan = JSON.parse(planBytes);
assertV4(
  plan.status === "frozen-bounded-source-hash-correction-ready-for-activation" &&
    plan.batchNumber === 4 &&
    plan.exactMutation?.writableFields === 1 &&
    plan.controls?.attemptsMaximum === 1 &&
    plan.controls?.retriesMaximum === 0 &&
    plan.controls?.mediaAccessAllowed === false &&
    plan.controls?.modelsAllowed === false &&
    plan.controls?.paidServicesAllowed === false,
  "Batch 4 audio work-item source-hash correction plan changed"
);
assertV4(
  sha256(await readFile(plan.authenticatedInput.path)) ===
    plan.authenticatedInput.sha256,
  "Batch 4 correction input changed before activation"
);
assertV4(
  sha256(await readFile(plan.exactMutation.targetPath)) ===
    plan.exactMutation.toSha256,
  "Batch 4 corrected tool source changed before activation"
);
if (shouldWrite) {
  assertV4(
    !(await exists(activationPath)),
    "Batch 4 audio work-item source-hash correction is already activated"
  );
}

const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-audio-work-item-source-hash-correction-activation",
  status: "active-for-exactly-one-deterministic-source-hash-correction-pass",
  batchNumber: 4,
  activatedFromCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  plan: {
    path: planPath,
    sha256: sha256(planBytes)
  },
  authenticatedInput: structuredClone(plan.authenticatedInput),
  exactMutation: structuredClone(plan.exactMutation),
  executionControls: structuredClone(plan.controls),
  executionCredential: sha256(
    Buffer.from(
      JSON.stringify({
        planSha256: sha256(planBytes),
        inputSha256: plan.authenticatedInput.sha256,
        targetPath: plan.exactMutation.targetPath,
        fromSha256: plan.exactMutation.fromSha256,
        toSha256: plan.exactMutation.toSha256,
        attemptsMaximum: 1
      })
    )
  )
};

if (shouldWrite) {
  await writeFile(activationPath, `${JSON.stringify(activation, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: activation.status,
      wroteArtifact: shouldWrite,
      writableFields: 1,
      attemptsMaximum: 1,
      mediaAccessAllowed: false,
      modelsAllowed: false,
      paidServicesAllowed: false,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
