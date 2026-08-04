#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { V388_CONSENSUS_ROOT, assert } from "./lib/v388-coverage-consensus.mjs";

const root = process.cwd();
const manifestPath = `${V388_CONSENSUS_ROOT}/conditional-adjudication/execution-manifest.json`;
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => { try { await access(path.resolve(root, file)); return true; } catch { return false; } };
const manifest = await readJson(manifestPath);
assert(manifest.schemaVersion === "3.8.8-coverage-conditional-adjudication-execution-manifest" && manifest.status === "frozen-one-context-authorized", "conditional manifest identity invalid");
assert(manifest.model.slug === "gpt-5.6-sol" && manifest.model.reasoningEffort === "high", "conditional model invalid");
assert(manifest.authorization.modelContexts === 1 && manifest.authorization.conditionalAdjudicationModelExecution && manifest.authorization.deterministicConsensusMergeAfterPass, "conditional authorization invalid");
for (const key of ["sectionAndWeightLocking", "burdenContactModelExecution", "scoringModelExecution", "assessmentProse", "productionMutation", "tenDebateGate", "all195Debates"]) assert(manifest.authorization[key] === false, `${key} must remain unauthorized`);
assert(manifest.isolation.temporaryCodexHome && manifest.isolation.freshSourceDirectory && manifest.isolation.oneDisputedFieldOnly && manifest.isolation.anonymousOptionOrder && !manifest.isolation.privateOptionMapAvailableToModel && !manifest.isolation.earlierValidityDecisionAvailableToModel && !manifest.isolation.initialPassOutputsAvailableToModel && !manifest.isolation.undisputedFieldsAvailableToModel && !manifest.isolation.scoresAvailable && !manifest.isolation.winnerAvailable, "conditional isolation invalid");
assert(manifest.executionPolicy.contexts === 1 && manifest.executionPolicy.attempts === 1 && manifest.executionPolicy.retriesMaximum === 0 && manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0, "conditional execution policy invalid");
const packet = await readJson(manifest.modelInputs.packet);
assert(packet.disputedFields.length === 1 && packet.disputedFields[0].fieldName === "proposition" && packet.disputedFields[0].candidates.length === 2, "conditional packet invalid");
assert(!containsScoreField(packet) && !/proposalValue|reviewValue|proposalSnapshot|\"origin\"/.test(JSON.stringify(packet)), "conditional packet leakage detected");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await readBytes(file)) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert(!Object.hasOwn(manifest.sourceHashes, future) && !(await exists(future)), `future output present or hashed: ${future}`);
assert(manifest.stopRules.sourceHashMismatchBlocksExecution && manifest.stopRules.preexistingOutputBlocksExecution && manifest.stopRules.invalidOutputBlocksConsensusMerge && !manifest.stopRules.furtherAutomaticRetryAuthorized && manifest.stopRules.scoringRemainsBlocked, "conditional stop rules invalid");
console.log(JSON.stringify({ status: "passed", conditionalLockIntegrityPassed: true, modelContexts: 1, disputedFields: 1, passIdentityLeakage: 0, scoreFields: 0, maximumMeteredCostUsd: 0, scoringAuthorized: false }, null, 2));
