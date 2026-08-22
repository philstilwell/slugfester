#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const correctionRoot = "docs/assessment-production/post-canary-continuation-v1/batch-06/standing-authorization-preparation-correction-1";
const paths = {
  plan: `${correctionRoot}/correction-plan.json`,
  activation: `${correctionRoot}/execution-activation.json`,
  execution: `${correctionRoot}/execution.json`,
  analysis: `${correctionRoot}/analysis.json`,
  standingAuthorization: "docs/assessment-production/post-canary-continuation-v1/batch-06/standing-authorization.json"
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const lock = async (file) => { const bytes = await readFile(path.resolve(file)); return { path: file, sha256: sha256(bytes), bytes: bytes.length }; };
const [planBytes, activationBytes] = await Promise.all([readFile(paths.plan), readFile(paths.activation)]);
const plan = JSON.parse(planBytes);
const activation = JSON.parse(activationBytes);
assertV4(
  activation.status === "frozen-batch-06-standing-authorization-preparation-correction-1-activated" &&
    activation.plan.sha256 === sha256(planBytes) &&
    activation.executionContract.attemptsMaximum === 1 &&
    activation.executionContract.retriesMaximum === 0 &&
    activation.executionContract.rerunsMaximum === 0,
  "frozen correction-1 activation required"
);
for (const item of activation.originalSources) assertV4(sha256(await readFile(item.path)) === item.sha256, `${item.path}: correction preimage changed`);
for (const item of activation.proposedSources) assertV4(sha256(await readFile(item.path)) === item.sha256, `${item.path}: correction proposal changed`);

const startedAt = new Date().toISOString();
for (const item of activation.proposedSources) await writeFile(path.resolve(item.target), await readFile(item.path));
for (const item of activation.proposedSources) assertV4(sha256(await readFile(item.target)) === item.sha256, `${item.target}: applied correction hash mismatch`);
const preparationRun = spawnSync(process.execPath, [
  "scripts/prepare-assessment-production-post-canary-batch-06-standing-authorization.mjs",
  "--write",
  "--authorized-at",
  plan.standingAuthorizationAuthorizedAt
], { encoding: "utf8" });
assertV4(preparationRun.status === 0, `corrected standing-authorization preparation failed: ${preparationRun.stderr || preparationRun.stdout}`);
const validationRun = spawnSync(process.execPath, ["scripts/test-assessment-production-post-canary-batch-06-standing-authorization.mjs"], { encoding: "utf8" });
assertV4(validationRun.status === 0, `corrected standing-authorization validation failed: ${validationRun.stderr || validationRun.stdout}`);
const standingAuthorization = JSON.parse(await readFile(paths.standingAuthorization));
assertV4(standingAuthorization.batchNumber === 6 && standingAuthorization.sourcePacketCommit === plan.sourcePacketCommit, "corrected standing authorization identity mismatch");
const completedAt = new Date().toISOString();
const execution = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-06-standing-authorization-preparation-correction-1-execution",
  protocolId: plan.protocolId,
  status: "passed-batch-06-standing-authorization-preparation-correction-1",
  startedAt,
  completedAt,
  activation: await lock(paths.activation),
  appliedSources: await Promise.all(activation.proposedSources.map((item) => lock(item.target))),
  standingAuthorization: await lock(paths.standingAuthorization),
  validation: { preparationPasses: 1, preparationExitCode: preparationRun.status, validationReplays: 1, validationExitCode: validationRun.status, stdoutSha256: sha256(validationRun.stdout), stderrSha256: sha256(validationRun.stderr) },
  totals: { attempts: 1, retries: 0, reruns: 0, timeoutExtensions: 0, rollbacks: 0, modelContexts: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 },
  nextAuthorizedAction: "commit-and-push-corrected-batch-06-standing-authorization-then-resume-discovery-preparation"
};
await writeFile(paths.execution, `${JSON.stringify(execution, null, 2)}\n`);
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-06-standing-authorization-preparation-correction-1-execution-analysis",
  protocolId: plan.protocolId,
  status: "batch-06-standing-authorization-preparation-correction-1-accepted",
  analyzedAt: completedAt,
  execution: await lock(paths.execution),
  decision: { correctionPassed: true, immutableSelectionPreserved: true, sourcePacketsPreserved: true, standingAuthorizationActivated: true, standingWorkflowMayResume: true, modelExecutionPerformed: false, paidServiceUsed: false },
  nextAuthorizedAction: execution.nextAuthorizedAction
};
await writeFile(paths.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: execution.status, standingAuthorization: standingAuthorization.status, selectedDebates: standingAuthorization.selectedDebates, discoveryContexts: standingAuthorization.sourcePreparation.frozenDiscoveryContexts, directIncrementalCostUsd: 0 }, null, 2));
