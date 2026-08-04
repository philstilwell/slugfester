#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { assert } from "./lib/v384-coverage-preparation.mjs";
const root = process.cwd();
const manifestPath = "docs/calibration/v3.8.8/coverage-independent-review/execution-manifest.json";
const read = (file) => readFile(path.resolve(root, file), "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => { try { await access(path.resolve(root, file)); return true; } catch { return false; } };
const manifest = JSON.parse(await read(manifestPath));
assert(manifest.schemaVersion === "3.8.8-independent-coverage-review-execution-manifest" && manifest.status === "frozen-three-context-review-execution-authorized", "review manifest identity invalid");
assert(manifest.model.label === "5.6 Sol" && manifest.model.slug === "gpt-5.6-sol" && manifest.model.reasoningEffort === "high", "review model invalid");
assert(manifest.authorization.independentCoverageReviewContexts === 3 && manifest.authorization.coverageReviewModelExecution && manifest.authorization.deterministicDisagreementExtractionAfterPass, "review authorization invalid");
for (const key of ["coverageAdjudicationModelExecution", "audioVerification", "sectionAndWeightLocking", "burdenContactModelExecution", "scoringModelExecution", "numericalParticipantScoring", "assessmentProse", "productionMutation", "tenDebateGate", "all195Debates"]) assert(manifest.authorization[key] === false, `${key} must remain unauthorized`);
assert(manifest.isolation.temporaryCodexHomePerContext && manifest.isolation.freshSourceDirectoryPerContext && manifest.isolation.fullTranscriptAndTimestampedEventsAvailable && !manifest.isolation.proposalPrivateMappingAvailableToModel && !manifest.isolation.proposalSemanticFieldsAvailableToModel && !manifest.isolation.stableMoveIdsAvailableToModel && !manifest.isolation.otherReviewOutputsAvailableToModel && !manifest.isolation.legacyAssessmentAvailable && !manifest.isolation.scoresAvailable && !manifest.isolation.winnerAvailable, "review isolation invalid");
assert(manifest.executionPolicy.contexts === 3 && manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.modelOutputRetriesMaximum === 0 && manifest.executionPolicy.sequentialExecution && manifest.executionPolicy.perInvocationTimeoutMs === 3600000, "review execution bounds invalid");
assert(manifest.executionPolicy.recoverableStreamEventsNormalMaximum === 2 && manifest.executionPolicy.recoverableStreamEventsHardMaximum === 8 && manifest.executionPolicy.transportEventsExtractedFromStderrOnly && manifest.executionPolicy.transportEventLinesRecorded && manifest.executionPolicy.stdoutAndStderrHashesRecorded, "review transport policy invalid");
assert(manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0 && manifest.executionPolicy.transcriptionCostUsdMaximum === 0, "review authentication or cost invalid");
assert(manifest.acceptanceRule.validReviewContextsRequired === 3 && manifest.acceptanceRule.closedSchemaAndDeterministicValidationRequired && manifest.acceptanceRule.completeTranscriptAuditRequired && manifest.acceptanceRule.modelScoreFieldsMaximum === 0 && manifest.acceptanceRule.reviewDisagreementDoesNotInvalidateContext && manifest.acceptanceRule.reviewerMissingMovesPermitted, "review acceptance rule invalid");
for (const [debateNumber, context] of Object.entries(manifest.reviewContexts)) {
  assert(context.debateNumber === debateNumber, `${debateNumber}: context identity invalid`);
  const packet = JSON.parse(await read(context.packet));
  const mapping = JSON.parse(await read(context.privateMapping));
  const serialized = JSON.stringify(packet);
  assert(mapping.mappingEntries.every((entry) => !serialized.includes(entry.stableRef)), `${debateNumber}: stable move ID leaked to packet`);
  assert(packet.candidates.every((candidate) => JSON.stringify(Object.keys(candidate).sort()) === JSON.stringify(["atomicExcerpt", "candidateRef", "contextWindow", "sourceSpan"])), `${debateNumber}: candidate proposal field leaked`);
}
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert(!Object.hasOwn(manifest.sourceHashes, future) && !(await exists(future)), `future output present or hashed: ${future}`);
assert(manifest.stopRules.anyInvalidReviewBlocksDisagreementExtraction && manifest.stopRules.anyReviewOutputVisibleToAnotherContextInvalidatesStage && manifest.stopRules.adjudicationRequiresSeparateCommittedLock && manifest.stopRules.scoringRemainsBlocked && !manifest.stopRules.furtherAutomaticRetryAuthorized, "review stop rule invalid");
console.log(JSON.stringify({ status: "passed", reviewLockIntegrityPassed: true, authorizedReviewContexts: 3, debateNumbers: Object.keys(manifest.reviewContexts), candidateCounts: manifest.upstream.candidateCounts, proposalPrivateMappingsVisibleToModel: false, proposalSemanticFieldsVisibleToModel: false, stableMoveIdsVisibleToModel: false, attemptsPerContext: 1, timeoutMinutesPerContext: 60, recoverableStreamEventsHardMaximum: 8, maximumMeteredCostUsd: 0, maximumTranscriptionCostUsd: 0, adjudicationModelExecutionAuthorized: false, scoringAuthorized: false, assessmentProseAuthorized: false }, null, 2));
