#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const write = process.argv.includes("--write");
const activatedAtIndex = process.argv.indexOf("--activated-at");
const activatedAt = activatedAtIndex >= 0 ? process.argv[activatedAtIndex + 1] : null;
assertV4(activatedAt && !Number.isNaN(Date.parse(activatedAt)), "--activated-at requires an ISO timestamp");
const root = "docs/assessment-production/post-canary-continuation-v1/batch-06/standing-authorization-preparation-correction-1";
const paths = { plan: `${root}/correction-plan.json`, preparationAnalysis: `${root}/preparation-analysis.json`, activation: `${root}/execution-activation.json` };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const lock = async (file) => { const bytes = await readFile(path.resolve(file)); return { path: file, sha256: sha256(bytes), bytes: bytes.length }; };
const [planBytes, analysisBytes] = await Promise.all([readFile(paths.plan), readFile(paths.preparationAnalysis)]);
const plan = JSON.parse(planBytes);
const analysis = JSON.parse(analysisBytes);
assertV4(
  plan.status === "frozen-batch-06-standing-authorization-preparation-correction-1-plan-prepared" &&
    analysis.status === "batch-06-standing-authorization-preparation-correction-1-plan-freeze-passed" &&
    analysis.plan.sha256 === sha256(planBytes) &&
    plan.executionContract.attemptsMaximum === 1 &&
    plan.executionContract.retriesMaximum === 0,
  "frozen correction-1 plan required"
);
for (const item of [...plan.originalSources, ...plan.toolLocks]) assertV4(sha256(await readFile(item.path)) === item.sha256, `${item.path}: frozen source changed`);
for (const item of plan.proposedSources) assertV4(sha256(await readFile(item.path)) === item.sha256, `${item.path}: frozen proposal changed`);
const activation = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-06-standing-authorization-preparation-correction-1-activation",
  protocolId: plan.protocolId,
  status: "frozen-batch-06-standing-authorization-preparation-correction-1-activated",
  activatedAt,
  directIncrementalCostUsd: 0,
  plan: await lock(paths.plan),
  preparationAnalysis: await lock(paths.preparationAnalysis),
  originalSources: plan.originalSources,
  proposedSources: plan.proposedSources,
  executionContract: plan.executionContract,
  outputPaths: plan.outputPaths,
  authorization: { boundedCorrectionExecution: true, standingAuthorizationPreparation: true, modelExecution: false, paidServiceUse: false, nextBatchSelection: false },
  nextAuthorizedAction: "execute-batch-06-standing-authorization-preparation-correction-1-once"
};
if (write) {
  assertV4(!(await exists(paths.activation)), "correction-1 activation already exists");
  await writeFile(path.resolve(paths.activation), `${JSON.stringify(activation, null, 2)}\n`);
}
console.log(JSON.stringify({ status: activation.status, write, proposedSources: 3, attemptsMaximum: 1, directIncrementalCostUsd: 0 }, null, 2));
