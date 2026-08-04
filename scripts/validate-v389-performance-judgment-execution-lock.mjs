#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { V389_PERFORMANCE_ROOT, assertV389, canonicalJson, containsProhibitedDerivedField, readJson } from "./lib/v389-performance-judgment.mjs";

const root = process.cwd();
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (relativePath) => { try { await access(path.resolve(root, relativePath)); return true; } catch { return false; } };
const manifest = await readJson(`${V389_PERFORMANCE_ROOT}/initial-execution-manifest.json`);
assertV389(manifest.schemaVersion === "3.8.9-performance-judgment-initial-execution-manifest" && manifest.status === "frozen-six-context-authorized", "performance execution manifest invalid");
assertV389(manifest.model.slug === "gpt-5.6-sol" && manifest.model.reasoningEffort === "high", "performance model lock invalid");
assertV389(manifest.population.debates === 3 && manifest.population.moves === 81 && manifest.population.highConfidenceAttributions === 81 && manifest.population.pendingAudioVerifications === 0, "performance population lock invalid");
assertV389(manifest.contexts.length === 6 && manifest.authorization.initialPerformanceContexts === 6 && manifest.authorization.initialPerformanceModelExecution === true && manifest.authorization.deterministicDisagreementExtractionAfterPass === true, "performance authorization invalid");
for (const key of ["performanceAdjudicationModelExecution", "scoreDerivation", "numericalParticipantScoring", "assessmentProse", "productionMutation", "tenDebateGate", "all195Debates"]) assertV389(manifest.authorization[key] === false, `${key} must remain unauthorized`);
assertV389(Object.values(manifest.isolation).every(Boolean), "performance isolation contract invalid");
assertV389(manifest.judgmentPolicy.responseTupleCompound && manifest.judgmentPolicy.untestedCharityExactly75 && manifest.judgmentPolicy.duplicateBurdenAdjustmentCaptureForcesZero && manifest.judgmentPolicy.modelCalculatedTotalsProhibited, "tightened judgment policy invalid");
assertV389(manifest.disagreementPolicy.responseTupleMismatchAlwaysDisputed && manifest.disagreementPolicy.charityTestedMismatchAlwaysDisputed && manifest.disagreementPolicy.thirdPassDisputedFieldsOnly && manifest.disagreementPolicy.finalSemanticChoiceRequiresVotes === 2, "disagreement policy invalid");
assertV389(manifest.audioPolicy.mediumConfidenceRequiresCompletedAudioVerification && manifest.audioPolicy.pendingAudioVerifications === 0, "audio policy invalid");
assertV389(manifest.executionPolicy.contexts === 6 && manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.retriesMaximum === 0 && manifest.executionPolicy.sequentialExecution && manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0 && manifest.executionPolicy.transcriptionCostUsdMaximum === 0, "execution policy invalid");
const identities = new Set();
const packetsByDebate = new Map();
let judgments = 0;
for (const context of manifest.contexts) {
  const packet = await readJson(context.packet);
  assertV389(packet.debateNumber === context.debateNumber && packet.debateId === context.debateId && packet.moves.length === context.moveCount && !containsProhibitedDerivedField(packet), `${context.pass}.${context.debateNumber}: packet invalid`);
  const prior = packetsByDebate.get(context.debateNumber);
  if (prior) assertV389(canonicalJson(packet) === prior, `${context.debateNumber}: pass packets differ`);
  else packetsByDebate.set(context.debateNumber, canonicalJson(packet));
  identities.add(`${context.pass}:${context.debateNumber}`);
  judgments += context.moveCount;
}
assertV389(identities.size === 6 && packetsByDebate.size === 3 && judgments === 162, "context identities or judgment total invalid");
assertV389(new Set(manifest.contexts.map((context) => context.schema)).size === 1, "all contexts must use one shared schema");
for (const [relativePath, digest] of Object.entries(manifest.sourceHashes)) assertV389(sha256(await bytes(relativePath)) === digest, `${relativePath}: source hash mismatch`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assertV389(!Object.hasOwn(manifest.sourceHashes, future) && !(await exists(future)), `${future}: future output present or hashed`);
assertV389(manifest.stopRules.sourceHashMismatchBlocksExecution && manifest.stopRules.preexistingOutputBlocksExecution && manifest.stopRules.invalidContextBlocksDisagreementExtraction && manifest.stopRules.pendingAudioBlocksExecution && !manifest.stopRules.furtherAutomaticRetryAuthorized && manifest.stopRules.adjudicationRequiresSeparatePhaseLock && manifest.stopRules.scoreDerivationRemainsBlocked && manifest.stopRules.assessmentProseRemainsBlocked, "stop rules invalid");
console.log(JSON.stringify({ status: "passed", executionLockIntegrityPassed: true, contexts: 6, debates: 3, moves: 81, moveJudgmentsAcrossPasses: 162, sharedSchemas: 1, pendingAudioVerifications: 0, maximumMeteredCostUsd: 0, scoreDerivationAuthorized: false, assessmentProseAuthorized: false }, null, 2));
