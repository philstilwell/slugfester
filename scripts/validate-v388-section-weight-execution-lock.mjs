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
const manifest = await readJson(`${V388_SECTION_ROOT}/initial-execution-manifest.json`);
assert(manifest.schemaVersion === "3.8.8-section-weight-initial-execution-manifest" && manifest.status === "frozen-six-context-authorized", "section execution manifest invalid");
assert(manifest.model.slug === "gpt-5.6-sol" && manifest.model.reasoningEffort === "high", "section model invalid");
assert(manifest.contexts.length === 6 && manifest.authorization.initialSectionPlanContexts === 6 && manifest.authorization.initialSectionPlanModelExecution && manifest.authorization.deterministicPlanComparisonAfterPass, "section context authorization invalid");
for (const key of ["planAdjudicationModelExecution", "burdenContactModelExecution", "scoringModelExecution", "numericalParticipantScoring", "assessmentProse", "productionMutation", "tenDebateGate", "all195Debates"]) assert(manifest.authorization[key] === false, `${key} must remain unauthorized`);
assert(manifest.isolation.freshTemporaryCodexHomePerContext && manifest.isolation.freshSourceDirectoryPerContext && manifest.isolation.otherPlanUnavailable && manifest.isolation.otherDebatesUnavailable && manifest.isolation.legacyAssessmentUnavailable && manifest.isolation.burdenContactTuplesUnavailable && manifest.isolation.scoresUnavailable && manifest.isolation.winnerUnavailable, "section isolation invalid");
assert(manifest.executionPolicy.contexts === 6 && manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.retriesMaximum === 0 && manifest.executionPolicy.sequentialExecution && manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0, "section execution policy invalid");
const identities = new Set();
for (const context of manifest.contexts) {
  const packet = await readJson(context.packet);
  assert(!containsScoreField(packet) && packet.debateNumber === context.debateNumber && packet.moves.length === context.moveCount && packet.acceptedBridgeIds.length === context.bridgeCount, `${context.debateNumber}.${context.passId}: packet invalid`);
  identities.add(`${context.debateNumber}:${context.passId}`);
}
assert(identities.size === 6, "section context identities duplicate");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await readBytes(file)) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert(!Object.hasOwn(manifest.sourceHashes, future) && !(await exists(future)), `future output present or hashed: ${future}`);
assert(manifest.stopRules.sourceHashMismatchBlocksExecution && manifest.stopRules.preexistingOutputBlocksExecution && manifest.stopRules.invalidPlanBlocksComparison && !manifest.stopRules.furtherAutomaticRetryAuthorized && manifest.stopRules.planAdjudicationRequiresSeparatePhaseLock && manifest.stopRules.scoringRemainsBlocked, "section stop rules invalid");
console.log(JSON.stringify({ status: "passed", sectionPlanLockIntegrityPassed: true, contexts: 6, debates: 3, independentPlansPerDebate: 2, scoreFields: 0, maximumMeteredCostUsd: 0, scoringAuthorized: false }, null, 2));
