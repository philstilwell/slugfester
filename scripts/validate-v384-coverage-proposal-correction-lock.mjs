#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { V384_COVERAGE_ROOT, assert } from "./lib/v384-coverage-preparation.mjs";

const root = process.cwd();
const correctionRoot = `${V384_COVERAGE_ROOT}/proposal-correction-01`;
const manifestPath = `${correctionRoot}/execution-manifest.json`;
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => { try { await access(path.resolve(root, file)); return true; } catch { return false; } };
const manifest = await readJson(manifestPath);

assert(manifest.schemaVersion === "3.8.4-full-coverage-proposal-correction-01-execution-manifest" && manifest.status === "frozen-single-context-correction-authorized", "correction manifest identity invalid");
assert(manifest.stage === "full-coverage-proposal-correction-01" && manifest.calibrationOnly && manifest.AIOnly, "correction stage boundary invalid");
assert(manifest.correctionBasis.failedDebateNumber === "161" && manifest.correctionBasis.failedStatus === "stream-recovery-limit-exceeded", "correction basis changed");
assert(manifest.correctionBasis.deterministicSchemaValidationPassed && manifest.correctionBasis.observedSameRequestStreamRecoveries > manifest.correctionBasis.lockedSameRequestStreamRecoveryLimit, "transport failure basis invalid");
assert(manifest.correctionBasis.failedArtifactPreserved && !manifest.correctionBasis.failedArtifactVisibleToCorrectionModel && !manifest.correctionBasis.failedArtifactDownstreamReuseAuthorized && !manifest.correctionBasis.validDebatesRerun, "correction reuse boundary invalid");
assert(manifest.model.label === "5.6 Sol" && manifest.model.slug === "gpt-5.6-sol" && manifest.model.reasoningEffort === "high", "correction model lock invalid");
assert(manifest.authorization.freshCoverageProposalContexts === 1 && manifest.authorization.coverageProposalCorrectionModelExecution === true, "single correction context not authorized");
for (const key of ["coverageReviewModelExecution", "coverageAdjudicationModelExecution", "audioVerification", "burdenContactModelExecution", "scoringModelExecution", "numericalParticipantScoring", "assessmentProse", "productionMutation", "all195Debates"]) assert(manifest.authorization[key] === false, `${key} must remain unauthorized`);
assert(manifest.proposalContext.debateNumber === "161", "correction context identity invalid");
assert(manifest.isolation.temporaryCodexHome && manifest.isolation.freshSourceDirectory && manifest.isolation.fullTranscriptAndTimestampedEventsAvailable && !manifest.isolation.priorDebate161ProposalAvailable && !manifest.isolation.Debates103And55OutputsAvailable && !manifest.isolation.legacyAssessmentAvailable && !manifest.isolation.seedProvisionalBurdenContactsAvailable && !manifest.isolation.scoresAvailable, "correction isolation invalid");
assert(manifest.executionPolicy.attempts === 1 && manifest.executionPolicy.modelOutputRetriesMaximum === 0 && manifest.executionPolicy.sameRequestStreamRecoveriesMaximum === 2 && manifest.executionPolicy.perInvocationTimeoutMs === 3600000 && manifest.executionPolicy.timedOutContextsMaximum === 0, "correction execution bounds invalid");
assert(manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0 && manifest.executionPolicy.transcriptionCostUsdMaximum === 0, "correction authentication or cost lock invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
for (const preserved of Object.values(manifest.preservedValidOutputs)) {
  assert(sha256(await read(preserved.rawOutput)) === preserved.rawSha256 && sha256(await read(preserved.enrichedOutput)) === preserved.enrichedSha256, "preserved valid output hash mismatch");
}
assert(sha256(await read(manifest.invalidatedOutput.rawOutput)) === manifest.invalidatedOutput.rawSha256 && sha256(await read(manifest.invalidatedOutput.enrichedOutput)) === manifest.invalidatedOutput.enrichedSha256 && manifest.invalidatedOutput.downstreamReuseAuthorized === false, "invalidated output provenance mismatch");
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert(!Object.hasOwn(manifest.sourceHashes, future), `future output included in correction source hashes: ${future}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert(!(await exists(future)), `correction future output exists before execution: ${future}`);
assert(JSON.stringify(manifest.finalProposalInputMapAfterSuccessfulCorrection) === JSON.stringify({
  "103": manifest.preservedValidOutputs["103"].enrichedOutput,
  "55": manifest.preservedValidOutputs["55"].enrichedOutput,
  "161": manifest.proposalContext.enrichedOutput
}), "post-correction input map invalid");

console.log(JSON.stringify({
  status: "passed",
  artifactIntegrityPassed: true,
  correctionContexts: 1,
  authorizedDebateNumber: "161",
  preservedValidDebates: ["103", "55"],
  invalidArtifactPreserved: true,
  invalidArtifactVisibleToModel: false,
  invalidArtifactReusableDownstream: false,
  attempts: 1,
  timeoutMinutes: 60,
  sameRequestStreamRecoveriesMaximum: 2,
  subscriptionAuthenticationRequired: true,
  maximumMeteredCostUsd: 0,
  maximumTranscriptionCostUsd: 0,
  coverageReviewAuthorized: false,
  numericalScoringAuthorized: false,
  assessmentProseAuthorized: false,
  productionMutationAuthorized: false
}, null, 2));
