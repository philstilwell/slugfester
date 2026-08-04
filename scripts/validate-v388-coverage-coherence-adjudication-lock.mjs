#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { V388_CONSENSUS_ROOT, assert } from "./lib/v388-coverage-consensus.mjs";

const root = process.cwd();
const manifestPath = `${V388_CONSENSUS_ROOT}/coherence-adjudication/execution-manifest.json`;
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => { try { await access(path.resolve(root, file)); return true; } catch { return false; } };
const manifest = await readJson(manifestPath);
assert(manifest.schemaVersion === "3.8.8-coverage-coherence-adjudication-execution-manifest" && manifest.status === "frozen-one-context-authorized", "coherence manifest identity invalid");
assert(manifest.model.slug === "gpt-5.6-sol" && manifest.model.reasoningEffort === "high", "coherence model invalid");
assert(manifest.authorization.modelContexts === 1 && manifest.authorization.coherenceAdjudicationModelExecution && manifest.authorization.deterministicConsensusMergeAfterPass, "coherence authorization invalid");
for (const key of ["sectionAndWeightLocking", "burdenContactModelExecution", "scoringModelExecution", "assessmentProse", "productionMutation", "tenDebateGate", "all195Debates"]) assert(manifest.authorization[key] === false, `${key} must remain unauthorized`);
assert(manifest.isolation.temporaryCodexHome && manifest.isolation.freshSourceDirectory && manifest.isolation.oneAtomicBundleOnly && manifest.isolation.anonymousOptionOrder && !manifest.isolation.privateOptionMapAvailableToModel && !manifest.isolation.fieldwiseAdjudicationAvailableToModel && !manifest.isolation.initialPassOutputsAvailableToModel && !manifest.isolation.otherDebatesAvailableToModel && !manifest.isolation.scoresAvailable && !manifest.isolation.winnerAvailable, "coherence isolation invalid");
assert(manifest.executionPolicy.contexts === 1 && manifest.executionPolicy.attempts === 1 && manifest.executionPolicy.retriesMaximum === 0 && manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0, "coherence execution policy invalid");
const packet = await readJson(manifest.modelInputs.packet);
assert(packet.disputedBundles.length === 1 && packet.disputedBundles[0].candidates.length === 2, "coherence packet invalid");
assert(!containsScoreField(packet) && !/proposalValue|reviewValue|proposalSnapshot|\"origin\"/.test(JSON.stringify(packet)), "coherence packet leakage detected");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await readBytes(file)) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert(!Object.hasOwn(manifest.sourceHashes, future) && !(await exists(future)), `future output present or hashed: ${future}`);
assert(manifest.stopRules.sourceHashMismatchBlocksExecution && manifest.stopRules.preexistingOutputBlocksExecution && manifest.stopRules.invalidOutputBlocksConsensusMerge && manifest.stopRules.componentMixingForbidden && !manifest.stopRules.furtherAutomaticRetryAuthorized && manifest.stopRules.scoringRemainsBlocked, "coherence stop rules invalid");
console.log(JSON.stringify({ status: "passed", coherenceLockIntegrityPassed: true, modelContexts: 1, atomicBundles: 1, passIdentityLeakage: 0, scoreFields: 0, maximumMeteredCostUsd: 0, scoringAuthorized: false }, null, 2));
