#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { V388_CONTACT_ROOT, assert, containsScoreField } from "./lib/v388-burden-contact.mjs";

const root = process.cwd();
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => { try { await access(path.resolve(root, file)); return true; } catch { return false; } };
const manifest = await readJson(`${V388_CONTACT_ROOT}/initial-execution-manifest.json`);
assert(manifest.schemaVersion === "3.8.8-burden-contact-initial-execution-manifest" && manifest.status === "frozen-six-context-authorized", "contact execution manifest invalid");
assert(manifest.model.slug === "gpt-5.6-sol" && manifest.model.reasoningEffort === "high", "contact model invalid");
assert(manifest.population.finalMoves === 81 && manifest.population.inheritedTwoVoteTuples === 9 && manifest.population.excludedPriorTuples === 3 && manifest.population.newMoves === 72 && manifest.population.candidatesPerNewMove === 21, "contact population invalid");
assert(manifest.contexts.length === 6 && manifest.authorization.initialBurdenContactContexts === 6 && manifest.authorization.initialBurdenContactModelExecution && manifest.authorization.deterministicDisagreementExtractionAfterPass, "contact authorization invalid");
for (const key of ["burdenContactAdjudicationModelExecution", "responseQualityModelExecution", "scoringModelExecution", "numericalParticipantScoring", "assessmentProse", "productionMutation", "tenDebateGate", "all195Debates"]) assert(manifest.authorization[key] === false, `${key} must remain unauthorized`);
assert(Object.values(manifest.isolation).every(Boolean), "contact context isolation invalid");
assert(manifest.classificationPolicy.completeCompositeTupleOnly && manifest.classificationPolicy.noContactPlusSupportAndAttackForTenBridges && manifest.classificationPolicy.anonymousOptionsCounterbalancedBetweenPasses && manifest.classificationPolicy.deterministicCompleteTupleComparison && manifest.classificationPolicy.finalTupleRequiresMatchingVotes === 2, "contact classification policy invalid");
assert(manifest.audioPolicy.mediumOrLowConfidenceRequiresCompletedAudioVerification && manifest.audioPolicy.finalMoveAttributionsHigh === 81 && manifest.audioPolicy.pendingAudioVerifications === 0, "contact audio policy invalid");
assert(manifest.executionPolicy.contexts === 6 && manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.retriesMaximum === 0 && manifest.executionPolicy.sequentialExecution && manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0 && manifest.executionPolicy.transcriptionCostUsdMaximum === 0, "contact execution policy invalid");
const identities = new Set();
let bundles = 0;
for (const context of manifest.contexts) {
  const packet = await readJson(context.packet);
  assert(packet.debateNumber === context.debateNumber && packet.debateId === context.debateId && packet.reviewerPass === context.reviewerPass && packet.bundles.length === context.bundleCount && packet.inheritedTuplesVisible === false && !containsScoreField(packet), `${context.reviewerPass}.${context.debateNumber}: contact packet invalid`);
  identities.add(`${context.reviewerPass}:${context.debateNumber}`);
  bundles += packet.bundles.length;
}
assert(identities.size === 6 && bundles === 144, "contact context identities or bundle total invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await readBytes(file)) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert(!Object.hasOwn(manifest.sourceHashes, future) && !(await exists(future)), `future output present or hashed: ${future}`);
assert(manifest.stopRules.sourceHashMismatchBlocksExecution && manifest.stopRules.preexistingOutputBlocksExecution && manifest.stopRules.invalidContextBlocksDisagreementExtraction && manifest.stopRules.pendingAudioBlocksExecution && !manifest.stopRules.furtherAutomaticRetryAuthorized && manifest.stopRules.adjudicationRequiresSeparatePhaseLock && manifest.stopRules.scoringRemainsBlocked, "contact stop rules invalid");
console.log(JSON.stringify({ status: "passed", burdenContactInitialLockIntegrityPassed: true, contexts: 6, newMoves: 72, outputBundlesAcrossPasses: 144, inheritedTwoVoteTuples: 9, pendingAudioVerifications: 0, scoreFields: 0, maximumMeteredCostUsd: 0, scoringAuthorized: false }, null, 2));
