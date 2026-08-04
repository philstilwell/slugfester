#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { V388_SECTION_ROOT, assert } from "./lib/v388-section-weight.mjs";

const root = process.cwd();
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => { try { await access(path.resolve(root, file)); return true; } catch { return false; } };
const manifest = await readJson(`${V388_SECTION_ROOT}/adjudication/execution-manifest.json`);
assert(manifest.schemaVersion === "3.8.8-section-weight-adjudication-execution-manifest" && manifest.status === "frozen-adjudication-contexts-authorized", "section adjudication manifest invalid");
assert(manifest.contexts.length === manifest.authorization.adjudicationContexts && manifest.contexts.length > 0 && manifest.authorization.planAdjudicationModelExecution && manifest.authorization.deterministicFinalPlanMergeAfterPass, "section adjudication authorization invalid");
for (const key of ["burdenContactModelExecution", "scoringModelExecution", "numericalParticipantScoring", "assessmentProse", "productionMutation", "tenDebateGate", "all195Debates"]) assert(manifest.authorization[key] === false, `${key} must remain unauthorized`);
assert(manifest.isolation.freshTemporaryCodexHomePerContext && manifest.isolation.freshSourceDirectoryPerContext && manifest.isolation.twoAnonymousWholePlansOnly && manifest.isolation.componentMixingForbidden && manifest.isolation.passIdentityUnavailable && manifest.isolation.privateOptionMapUnavailable && manifest.isolation.otherDebatesUnavailable && manifest.isolation.burdenContactTuplesUnavailable && manifest.isolation.scoresUnavailable && manifest.isolation.winnerUnavailable, "section adjudication isolation invalid");
assert(manifest.executionPolicy.contexts === manifest.contexts.length && manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.retriesMaximum === 0 && manifest.executionPolicy.sequentialExecution && manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0, "section adjudication execution policy invalid");
for (const context of manifest.contexts) { const packet = await readJson(context.packet); assert(packet.disputedPlans.length === 1 && packet.disputedPlans[0].candidates.length === 2 && !containsScoreField(packet) && !/\"origin\"|pass-a|pass-b/.test(JSON.stringify(packet)), `${context.debateNumber}: section adjudication packet invalid`); }
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await readBytes(file)) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert(!Object.hasOwn(manifest.sourceHashes, future) && !(await exists(future)), `future output present or hashed: ${future}`);
assert(manifest.stopRules.sourceHashMismatchBlocksExecution && manifest.stopRules.preexistingOutputBlocksExecution && manifest.stopRules.invalidAdjudicationBlocksFinalPlanMerge && !manifest.stopRules.furtherAutomaticRetryAuthorized && manifest.stopRules.scoringRemainsBlocked, "section adjudication stop rules invalid");
console.log(JSON.stringify({ status: "passed", sectionAdjudicationLockIntegrityPassed: true, contexts: manifest.contexts.length, wholePlanCandidatesPerContext: 2, componentMixing: 0, passIdentityLeakage: 0, scoreFields: 0, maximumMeteredCostUsd: 0, scoringAuthorized: false }, null, 2));
