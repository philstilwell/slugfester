#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";

const root = "docs/assessment-production/post-canary-continuation-v1/batch-08/audio-verification";
const planPath = `${root}/resolution-plan.json`;
const activationPath = `${root}/resolution-execution-activation.json`;
const preparePath = "scripts/prepare-assessment-production-post-canary-batch-08-audio-resolution-execution.mjs";
const activatePath = "scripts/activate-assessment-production-post-canary-batch-08-audio-resolution.mjs";
const runnerPath = "scripts/run-assessment-production-post-canary-batch-08-audio-resolution.mjs";
const testPath = "scripts/test-assessment-production-post-canary-batch-08-audio-resolution-activation.mjs";
const shouldWrite = process.argv.includes("--write");
const shouldValidate = process.argv.includes("--validate");
const preparedAtIndex = process.argv.indexOf("--prepared-at");
const preparedAt = preparedAtIndex >= 0 ? process.argv[preparedAtIndex + 1] : null;
assert(preparedAt && !Number.isNaN(Date.parse(preparedAt)), "--prepared-at requires an ISO timestamp");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const planBytes = await readFile(planPath);
const plan = JSON.parse(planBytes);
assert.equal(sha256(planBytes), "1b9768f88bf563234664817289d53a49aca4340b6eddbc0d5437febf24ae9082");
assert.equal(plan.status, "frozen-three-debate-156-transient-verification-reference-overlays-prepared-not-executed");
assert.equal(plan.proposedReferenceOverlays.length, 3);
assert.equal(plan.transcriptLocks.length, 6);

const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const origin = execFileSync("git", ["rev-parse", "origin/main"], { encoding: "utf8" }).trim();
assert.equal(head, "bf86dc34bfc90a481545a790973309b61410deda");
assert.equal(origin, head);

const sourceHashes = {
  ...plan.sourceLocks,
  [planPath]: sha256(planBytes),
  [preparePath]: sha256(await readFile(preparePath)),
  [activatePath]: sha256(await readFile(activatePath)),
  [runnerPath]: sha256(await readFile(runnerPath)),
  [testPath]: sha256(await readFile(testPath)),
};
for (const [file, digest] of Object.entries(sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash changed`);
}

const activation = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-08-audio-resolution-execution-activation",
  protocolId: plan.protocolId,
  status: "frozen-batch-08-audio-resolution-execution-prepared-not-active",
  preparedAt,
  activatedAt: null,
  checkpointCommit: head,
  productionCanary: false,
  batchNumber: 8,
  stagingOnly: true,
  continuationAuthorization: plan.continuationAuthorization,
  resolutionPlan: { path: planPath, sha256: sha256(planBytes) },
  sourceHashes,
  transcriptLocks: plan.transcriptLocks,
  referenceOverlays: plan.proposedReferenceOverlays,
  referenceDeltaInventorySha256: plan.referenceDeltaInventorySha256,
  structuralValidationOverlay: plan.preservedStructuralValidationOverlay,
  exactValidator: {
    path: plan.futureExecutionContract.exactValidatorPath,
    sha256: plan.futureExecutionContract.exactValidatorSha256,
  },
  exactThresholds: plan.futureExecutionContract.exactThresholds,
  executionPolicy: {
    deterministicPassesMaximum: 1,
    completeSixTranscriptCohortReplaysMaximum: 1,
    retriesMaximum: 0,
    rerunsMaximum: 0,
    automaticRepairsMaximum: 0,
    persistentProtectedWritesMaximum: 0,
    audioAccessAllowed: false,
    modelOrApiCallsAllowed: false,
    paidServiceUseAllowed: false,
  },
  outputs: {
    execution: `${root}/resolution-execution/execution.json`,
    audit: `${root}/resolution-execution/audio-verification.json`,
    analysis: `${root}/resolution-execution/analysis.json`,
    cost: `${root}/resolution-execution/cost-control-analysis.json`,
  },
  authorization: {
    correctionExecution: false,
    completeCohortReplay: false,
    audioAccess: false,
    modelOrApiCalls: false,
    paidServiceUse: false,
    downstreamAdjudicationPreparation: false,
  },
  nextAuthorizedAction: "activate-one-frozen-batch-08-deterministic-audio-resolution-pass-under-continuation-standing-authorization",
};

for (const output of Object.values(activation.outputs)) assert(!(await exists(output)), `future output already exists: ${output}`);
const bytes = `${JSON.stringify(activation, null, 2)}\n`;
if (shouldWrite) {
  assert(!(await exists(activationPath)), "activation already exists");
  await writeFile(activationPath, bytes);
}
if (shouldValidate) assert.equal(await readFile(activationPath, "utf8"), bytes, "inactive activation replay changed");
console.log(JSON.stringify({
  status: shouldWrite ? activation.status : shouldValidate ? "passed-frozen-batch-08-audio-resolution-execution-preparation" : "passed-batch-08-audio-resolution-execution-preview",
  contexts: 0,
  deterministicPassesMaximum: 1,
  completeCohortSize: 6,
  referenceOverlays: 3,
  audioAccesses: 0,
  modelOrApiCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  sha256: sha256(bytes),
  nextAuthorizedAction: activation.nextAuthorizedAction,
}, null, 2));
