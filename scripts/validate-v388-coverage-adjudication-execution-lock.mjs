#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { V388_CONSENSUS_ROOT, assert } from "./lib/v388-coverage-consensus.mjs";

const root = process.cwd();
const manifestPath = `${V388_CONSENSUS_ROOT}/adjudication/execution-manifest.json`;
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => { try { await access(path.resolve(root, file)); return true; } catch { return false; } };
const manifest = await readJson(manifestPath);
assert(manifest.schemaVersion === "3.8.8-coverage-adjudication-execution-manifest" && manifest.status === "frozen-three-context-adjudication-authorized", "adjudication manifest identity invalid");
assert(manifest.model.label === "5.6 Sol" && manifest.model.slug === "gpt-5.6-sol" && manifest.model.reasoningEffort === "high", "adjudication model invalid");
assert(manifest.authorization.coverageAdjudicationContexts === 3 && manifest.authorization.coverageAdjudicationModelExecution && manifest.authorization.deterministicConsensusMergeAfterPass, "adjudication authorization invalid");
for (const key of ["audioVerification", "sectionAndWeightLocking", "burdenContactModelExecution", "scoringModelExecution", "numericalParticipantScoring", "assessmentProse", "productionMutation", "tenDebateGate", "all195Debates"]) assert(manifest.authorization[key] === false, `${key} must remain unauthorized`);
assert(manifest.upstream.validIndependentReviewContexts === 3 && manifest.upstream.comparisonFields === manifest.upstream.agreements + manifest.upstream.disagreements && manifest.upstream.audioVerificationsRequired === manifest.upstream.audioVerificationsCompleted, "adjudication upstream invalid");
assert(manifest.isolation.temporaryCodexHomePerContext && manifest.isolation.freshSourceDirectoryPerContext && manifest.isolation.disputedFieldsOnly && manifest.isolation.anonymousOptionOrder && !manifest.isolation.proposalAndReviewIdentitiesAvailableToModel && !manifest.isolation.privateOptionMapAvailableToModel && !manifest.isolation.initialDisagreementArtifactAvailableToModel && !manifest.isolation.undisputedFieldsAvailableToModel && !manifest.isolation.otherAdjudicationOutputsAvailableToModel && !manifest.isolation.fullLegacyAssessmentAvailable && !manifest.isolation.scoresAvailable && !manifest.isolation.winnerAvailable, "adjudication isolation invalid");
assert(manifest.executionPolicy.contexts === 3 && manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.modelOutputRetriesMaximum === 0 && manifest.executionPolicy.sequentialExecution && manifest.executionPolicy.perInvocationTimeoutMs === 3600000, "adjudication execution bounds invalid");
assert(manifest.executionPolicy.recoverableStreamEventsNormalMaximum === 2 && manifest.executionPolicy.recoverableStreamEventsHardMaximum === 8 && manifest.executionPolicy.transportEventsExtractedFromStderrOnly && manifest.executionPolicy.transportEventLinesRecorded && manifest.executionPolicy.stdoutAndStderrHashesRecorded, "adjudication transport policy invalid");
assert(manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0 && manifest.executionPolicy.transcriptionCostUsdMaximum === 0, "adjudication authentication or cost invalid");
assert(manifest.acceptanceRule.validAdjudicationContextsRequired === 3 && manifest.acceptanceRule.closedSchemaAndDeterministicValidationRequired && manifest.acceptanceRule.exactDisputedFieldCountRequired && manifest.acceptanceRule.suppliedOptionOnlyRequired && manifest.acceptanceRule.modelScoreFieldsMaximum === 0, "adjudication acceptance invalid");
for (const [debateNumber, context] of Object.entries(manifest.adjudicationContexts)) {
  assert(context.debateNumber === debateNumber && context.fieldCount === manifest.upstream.disagreementFieldsByDebate[debateNumber], `${debateNumber}: adjudication context count mismatch`);
  const packet = await readJson(context.packet);
  const serialized = JSON.stringify(packet);
  assert(packet.disputedFields.length === context.fieldCount && packet.disputedFields.every((field) => field.candidates.length === 2 && field.candidates[0].optionId === "option-1" && field.candidates[1].optionId === "option-2"), `${debateNumber}: disputed options invalid`);
  assert(!/proposalValue|reviewValue|proposalSnapshot|\"origin\"|-review-missing-/.test(serialized), `${debateNumber}: pass identity leakage`);
  assert(!containsScoreField(packet), `${debateNumber}: score field leaked to adjudication packet`);
}
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await readBytes(file)) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert(!Object.hasOwn(manifest.sourceHashes, future) && !(await exists(future)), `future output present or hashed: ${future}`);
assert(manifest.stopRules.anyInvalidAdjudicationBlocksConsensusMerge && manifest.stopRules.anyAdjudicationOutputVisibleToAnotherContextInvalidatesStage && manifest.stopRules.finalInventoryRequiresSeparateDeterministicMerge && manifest.stopRules.scoringRemainsBlocked && !manifest.stopRules.furtherAutomaticRetryAuthorized, "adjudication stop rule invalid");
console.log(JSON.stringify({ status: "passed", adjudicationLockIntegrityPassed: true, authorizedAdjudicationContexts: 3, debateNumbers: Object.keys(manifest.adjudicationContexts), disputedFields: manifest.upstream.disagreements, disputedFieldsByDebate: manifest.upstream.disagreementFieldsByDebate, passIdentityLeakage: 0, scoreFields: 0, audioVerificationRate: `${manifest.upstream.audioVerificationsCompleted}/${manifest.upstream.audioVerificationsRequired}`, attemptsPerContext: 1, timeoutMinutesPerContext: 60, recoverableStreamEventsHardMaximum: 8, maximumMeteredCostUsd: 0, maximumTranscriptionCostUsd: 0, scoringAuthorized: false, assessmentProseAuthorized: false }, null, 2));
