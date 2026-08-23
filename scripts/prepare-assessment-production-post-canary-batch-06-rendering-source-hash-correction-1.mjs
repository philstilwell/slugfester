#!/usr/bin/env node
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, assertV4 } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-06/rendering-verification";
const CORRECTION = `${ROOT}/preflight-source-hash-correction-1`;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const TARGET = "src/data/debates.js";
const PLAN = `${CORRECTION}/correction-plan.json`;
const PROPOSED_PREPARATION = `${CORRECTION}/proposed-preparation-manifest.json`;
const PROPOSED_ACTIVATION = `${CORRECTION}/proposed-execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const file of [PLAN, PROPOSED_PREPARATION, PROPOSED_ACTIVATION]) assertV4(!(await exists(file)), `${file} exists`);
const [preparationBytes, activationBytes, targetBytes] = await Promise.all([
  readFile(path.resolve(PREPARATION)), readFile(path.resolve(ACTIVATION)), readFile(path.resolve(TARGET))]);
const preparation = JSON.parse(preparationBytes); const activation = JSON.parse(activationBytes);
assertV4(preparation.status === "frozen-post-canary-batch-06-rendering-verification-prepared" &&
  activation.status === "frozen-post-canary-batch-06-rendering-verification-authorized" &&
  !(TARGET in preparation.sourceHashes) && !(TARGET in activation.sourceHashes) &&
  activation.preparation.sha256 === sha256(preparationBytes) &&
  activation.executionNavigation.input.preparationSha256 === sha256(preparationBytes) &&
  activation.executionNavigation.token === sha256(canonicalJson(activation.executionNavigation.input)),
"the exact missing rendering source-hash failure changed");
const proposedPreparation = structuredClone(preparation);
proposedPreparation.sourceHashes[TARGET] = sha256(targetBytes);
const proposedPreparationBytes = Buffer.from(`${JSON.stringify(proposedPreparation, null, 2)}\n`);
const proposedActivation = structuredClone(activation);
proposedActivation.sourceHashes[TARGET] = sha256(targetBytes);
proposedActivation.preparation.sha256 = sha256(proposedPreparationBytes);
proposedActivation.executionNavigation.input.preparationSha256 = sha256(proposedPreparationBytes);
proposedActivation.executionNavigation.token = sha256(canonicalJson(proposedActivation.executionNavigation.input));
const proposedActivationBytes = Buffer.from(`${JSON.stringify(proposedActivation, null, 2)}\n`);
const plan = { schemaVersion: "1.0-assessment-production-post-canary-batch-06-rendering-source-hash-correction-1-plan",
  status: "frozen-batch-06-rendering-source-hash-correction-1-prepared",
  classification: "execution-runner-required-production-baseline-hash-omitted-from-preparation-and-activation",
  original: { preparation: PREPARATION, preparationSha256: sha256(preparationBytes),
    activation: ACTIVATION, activationSha256: sha256(activationBytes) },
  correctionScope: { addedSourceHashField: `${TARGET}`, addedSourceHashValue: sha256(targetBytes),
    dependentPreparationHashUpdated: true, dependentNavigationTokenUpdated: true,
    otherFieldsChanged: false },
  proposed: { preparation: PROPOSED_PREPARATION, preparationSha256: sha256(proposedPreparationBytes),
    activation: PROPOSED_ACTIVATION, activationSha256: sha256(proposedActivationBytes) },
  executionPolicy: { attemptsMaximum: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0 },
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: "execute-one-batch-06-rendering-source-hash-correction-1-pass" };
if (shouldWrite) { await mkdir(path.resolve(CORRECTION), { recursive: true });
  await writeFile(path.resolve(PROPOSED_PREPARATION), proposedPreparationBytes);
  await writeFile(path.resolve(PROPOSED_ACTIVATION), proposedActivationBytes);
  await writeFile(path.resolve(PLAN), `${JSON.stringify(plan, null, 2)}\n`); }
console.log(JSON.stringify({ status: plan.status, addedSourceHash: TARGET,
  dependentHashesRegenerated: 2, attemptsMaximum: 1, directIncrementalCostUsd: 0,
  nextAuthorizedAction: plan.nextAuthorizedAction }, null, 2));
