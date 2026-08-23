#!/usr/bin/env node
import { createHash } from "node:crypto";
import { access, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, assertV4 } from "./lib/v4-lean-production.mjs";
const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-06/rendering-verification";
const CORRECTION = `${ROOT}/preflight-source-hash-correction-1`;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const TARGET = "src/data/debates.js";
const PLAN = `${CORRECTION}/correction-plan.json`;
const PROPOSED_PREPARATION = `${CORRECTION}/proposed-preparation-manifest.json`;
const PROPOSED_ACTIVATION = `${CORRECTION}/proposed-execution-activation.json`;
const EXECUTION = `${CORRECTION}/execution.json`; const ANALYSIS = `${CORRECTION}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(EXECUTION)) && !(await exists(ANALYSIS)), "correction already executed");
const [planBytes, preparationBytes, activationBytes, proposedPreparationBytes,
  proposedActivationBytes, targetBytes] = await Promise.all([readFile(path.resolve(PLAN)),
  readFile(path.resolve(PREPARATION)), readFile(path.resolve(ACTIVATION)),
  readFile(path.resolve(PROPOSED_PREPARATION)), readFile(path.resolve(PROPOSED_ACTIVATION)),
  readFile(path.resolve(TARGET))]);
const plan = JSON.parse(planBytes);
assertV4(plan.status === "frozen-batch-06-rendering-source-hash-correction-1-prepared" &&
  sha256(preparationBytes) === plan.original.preparationSha256 &&
  sha256(activationBytes) === plan.original.activationSha256 &&
  sha256(proposedPreparationBytes) === plan.proposed.preparationSha256 &&
  sha256(proposedActivationBytes) === plan.proposed.activationSha256,
"correction authentication failed");
for (const [target, bytes] of [[PREPARATION, proposedPreparationBytes], [ACTIVATION, proposedActivationBytes]]) {
  const temporary = `${path.resolve(target)}.correction-1.tmp`;
  await writeFile(temporary, bytes); await rename(temporary, path.resolve(target));
}
const preparation = JSON.parse(await readFile(path.resolve(PREPARATION)));
const activation = JSON.parse(await readFile(path.resolve(ACTIVATION)));
const passed = preparation.sourceHashes[TARGET] === sha256(targetBytes) &&
  activation.sourceHashes[TARGET] === sha256(targetBytes) &&
  activation.preparation.sha256 === sha256(await readFile(path.resolve(PREPARATION))) &&
  activation.executionNavigation.input.preparationSha256 === activation.preparation.sha256 &&
  activation.executionNavigation.token === sha256(canonicalJson(activation.executionNavigation.input));
assertV4(passed, "corrected rendering source-hash validation failed");
const execution = { schemaVersion: "1.0-assessment-production-post-canary-batch-06-rendering-source-hash-correction-1-execution",
  status: "passed", attempts: 1, retries: 0, timeoutExtensions: 0,
  correctedFields: ["preparation.sourceHashes.src/data/debates.js",
    "activation.sourceHashes.src/data/debates.js", "activation.preparation.sha256",
    "activation.executionNavigation.input.preparationSha256", "activation.executionNavigation.token"],
  directIncrementalCostUsd: 0 };
const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-06-rendering-source-hash-correction-1-analysis",
  status: "batch-06-rendering-source-hash-correction-1-passed",
  protectedInputsChanged: false, viewportAttemptsConsumed: 0,
  nextAuthorizedAction: "execute-frozen-batch-06-rendering-verification" };
await writeFile(path.resolve(EXECUTION), `${JSON.stringify(execution, null, 2)}\n`);
await writeFile(path.resolve(ANALYSIS), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, attempts: 1, viewportAttemptsConsumed: 0,
  directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
