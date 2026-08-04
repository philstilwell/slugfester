#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { V384_COVERAGE_ROOT, assert } from "./lib/v384-coverage-preparation.mjs";

const root = process.cwd();
const manifestPath = `${V384_COVERAGE_ROOT}/proposal-correction-02/execution-manifest.json`;
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => { try { await access(path.resolve(root, file)); return true; } catch { return false; } };
const manifest = await readJson(manifestPath);

assert(manifest.schemaVersion === "3.8.4-full-coverage-proposal-correction-02-execution-manifest" && manifest.status === "frozen-final-single-context-transport-correction-authorized", "correction 02 manifest identity invalid");
assert(manifest.correctionBasis.failedDebateNumber === "161" && manifest.correctionBasis.invalidatedAttempts.length === 2 && manifest.correctionBasis.failedArtifactsPreserved && !manifest.correctionBasis.failedArtifactsVisibleToCorrectionModel && !manifest.correctionBasis.validDebatesRerun, "correction 02 basis invalid");
assert(!manifest.correctionBasis.semanticPacketChanged && !manifest.correctionBasis.schemaChanged && !manifest.correctionBasis.sourceChanged && !manifest.correctionBasis.streamRecoveryThresholdChanged && manifest.correctionBasis.terminalAfterThisAttempt, "post-output contract changed");
for (const attempt of manifest.correctionBasis.invalidatedAttempts) {
  assert(attempt.streamRecoveries > attempt.streamRecoveryLimit && !attempt.downstreamReuseAuthorized, `${attempt.attempt}: invalidation missing`);
  assert(sha256(await read(attempt.rawOutput)) === attempt.rawSha256 && sha256(await read(attempt.enrichedOutput)) === attempt.enrichedSha256, `${attempt.attempt}: invalidated artifact hash mismatch`);
}
assert(manifest.model.label === "5.6 Sol" && manifest.model.slug === "gpt-5.6-sol" && manifest.model.reasoningEffort === "high", "correction 02 model invalid");
assert(manifest.authorization.freshCoverageProposalContexts === 1 && manifest.authorization.coverageProposalCorrectionModelExecution, "correction 02 authorization invalid");
for (const key of ["coverageReviewModelExecution", "coverageAdjudicationModelExecution", "audioVerification", "burdenContactModelExecution", "scoringModelExecution", "numericalParticipantScoring", "assessmentProse", "productionMutation", "all195Debates"]) assert(manifest.authorization[key] === false, `${key} must remain unauthorized`);
assert(manifest.proposalContext.debateNumber === "161" && manifest.isolation.temporaryCodexHome && manifest.isolation.freshSourceDirectory && manifest.isolation.fullTranscriptAndTimestampedEventsAvailable && !manifest.isolation.priorDebate161ProposalsAvailable && !manifest.isolation.Debates103And55OutputsAvailable && !manifest.isolation.legacyAssessmentAvailable && !manifest.isolation.seedProvisionalBurdenContactsAvailable && !manifest.isolation.scoresAvailable, "correction 02 isolation invalid");
assert(manifest.executionPolicy.attempts === 1 && manifest.executionPolicy.modelOutputRetriesMaximum === 0 && manifest.executionPolicy.sameRequestStreamRecoveriesMaximum === 2 && manifest.executionPolicy.perInvocationTimeoutMs === 3600000 && manifest.executionPolicy.boundedReadLinesMaximum === 400 && manifest.executionPolicy.provisionalJsonMessagesMaximum === 0 && manifest.executionPolicy.transportRecoveryMatchesRecorded, "correction 02 execution bounds invalid");
assert(manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0 && manifest.executionPolicy.transcriptionCostUsdMaximum === 0, "correction 02 authentication or cost invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert(!Object.hasOwn(manifest.sourceHashes, future) && !(await exists(future)), `correction 02 future output present or hashed: ${future}`);
for (const item of Object.values(manifest.preservedValidOutputs)) assert(sha256(await read(item.rawOutput)) === item.rawSha256 && sha256(await read(item.enrichedOutput)) === item.enrichedSha256, "preserved valid output mismatch");
assert(!manifest.stopRules.furtherAutomaticCorrectionAuthorized, "correction 02 is not terminal");

console.log(JSON.stringify({
  status: "passed",
  artifactIntegrityPassed: true,
  correctionContexts: 1,
  authorizedDebateNumber: "161",
  invalidatedAttemptsPreserved: 2,
  semanticInputsChanged: false,
  streamRecoveryThresholdChanged: false,
  boundedReadLinesMaximum: 400,
  attempts: 1,
  timeoutMinutes: 60,
  sameRequestStreamRecoveriesMaximum: 2,
  subscriptionAuthenticationRequired: true,
  maximumMeteredCostUsd: 0,
  maximumTranscriptionCostUsd: 0,
  furtherAutomaticCorrectionAuthorized: false,
  coverageReviewAuthorized: false,
  numericalScoringAuthorized: false,
  assessmentProseAuthorized: false
}, null, 2));
