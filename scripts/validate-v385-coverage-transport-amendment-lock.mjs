#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { assert } from "./lib/v384-coverage-preparation.mjs";

const root = process.cwd();
const manifestPath = "docs/calibration/v3.8.5/coverage-transport-amendment/execution-manifest.json";
const read = (file) => readFile(path.resolve(root, file), "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => { try { await access(path.resolve(root, file)); return true; } catch { return false; } };
const manifest = JSON.parse(await read(manifestPath));

assert(manifest.schemaVersion === "3.8.5-coverage-transport-amendment-execution-manifest" && manifest.status === "frozen-single-context-amendment-authorized", "amendment identity invalid");
assert(manifest.amendmentBasis.v384GateTerminatedWithoutPass && manifest.amendmentBasis.failedAttempts.length === 3 && manifest.amendmentBasis.failedArtifactsPreserved && !manifest.amendmentBasis.failedArtifactsVisibleToFreshModel && !manifest.amendmentBasis.failedArtifactsReclassified, "amendment basis invalid");
assert(!manifest.amendmentBasis.validDebatesRerun && !manifest.amendmentBasis.semanticPacketChanged && !manifest.amendmentBasis.schemaChanged && !manifest.amendmentBasis.sourceChanged && manifest.amendmentBasis.transportRuleChangedProspectively, "amendment boundary invalid");
for (const item of manifest.amendmentBasis.failedAttempts) {
  assert(item.status === "stream-recovery-limit-exceeded" && item.commandExitCode === 0 && item.validationExitCode === 0 && item.streamRecoveries > item.previousLimit && !item.downstreamReuseAuthorized, `${item.attempt}: failed attempt invalid`);
  assert(sha256(await read(item.rawOutput)) === item.rawSha256 && sha256(await read(item.enrichedOutput)) === item.enrichedSha256, `${item.attempt}: artifact hash mismatch`);
}
assert(manifest.model.label === "5.6 Sol" && manifest.model.slug === "gpt-5.6-sol" && manifest.model.reasoningEffort === "high", "model lock invalid");
assert(manifest.authorization.freshCoverageProposalContexts === 1 && manifest.authorization.coverageProposalModelExecution && manifest.authorization.coverageReviewPacketConstructionAfterPass, "authorization invalid");
for (const key of ["coverageReviewModelExecution", "coverageAdjudicationModelExecution", "audioVerification", "burdenContactModelExecution", "scoringModelExecution", "numericalParticipantScoring", "assessmentProse", "productionMutation", "all195Debates"]) assert(manifest.authorization[key] === false, `${key} must remain unauthorized`);
assert(manifest.proposalContext.debateNumber === "161" && manifest.isolation.temporaryCodexHome && manifest.isolation.freshSourceDirectory && manifest.isolation.fullTranscriptAndTimestampedEventsAvailable && !manifest.isolation.priorDebate161ProposalsAvailable && !manifest.isolation.Debates103And55OutputsAvailable && !manifest.isolation.legacyAssessmentAvailable && !manifest.isolation.seedProvisionalBurdenContactsAvailable && !manifest.isolation.scoresAvailable, "isolation invalid");
assert(manifest.executionPolicy.attempts === 1 && manifest.executionPolicy.modelOutputRetriesMaximum === 0 && manifest.executionPolicy.perInvocationTimeoutMs === 3600000, "execution bounds invalid");
assert(manifest.executionPolicy.recoverableStreamEventsNormalMaximum === 2 && manifest.executionPolicy.recoverableStreamEventsHardMaximum === 8 && manifest.executionPolicy.transportEventsExtractedFromStderrOnly && manifest.executionPolicy.transportEventLinesRecorded && manifest.executionPolicy.stdoutAndStderrHashesRecorded, "transport policy invalid");
assert(manifest.dryContract.stderrOnlyExtractionVerified && manifest.dryContract.genericResumeIgnored && JSON.stringify(manifest.dryContract.boundaryClassificationsVerified) === JSON.stringify([0, 2, 3, 8, 9]), "dry contract invalid");
assert(manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0 && manifest.executionPolicy.transcriptionCostUsdMaximum === 0, "authentication or cost invalid");
assert(Object.keys(manifest.preservedValidOutputs).join(",") === "55,103" || Object.keys(manifest.preservedValidOutputs).join(",") === "103,55", "preserved debates invalid");
for (const item of Object.values(manifest.preservedValidOutputs)) assert(item.status === "completed-valid" && sha256(await read(item.rawOutput)) === item.rawSha256 && sha256(await read(item.enrichedOutput)) === item.enrichedSha256, "preserved valid output mismatch");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert(!Object.hasOwn(manifest.sourceHashes, future) && !(await exists(future)), `future output present or hashed: ${future}`);
assert(!manifest.stopRules.furtherAutomaticRetryAuthorized && manifest.stopRules.transportCeilingMayNotChangeAfterOutput, "stop rule invalid");

console.log(JSON.stringify({ status: "passed", amendmentIntegrityPassed: true, authorizedDebateNumber: "161", freshContexts: 1, preservedValidDebates: 2, invalidatedPriorAttempts: 3, recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8, timeoutMinutes: 60, subscriptionAuthenticationRequired: true, maximumMeteredCostUsd: 0, maximumTranscriptionCostUsd: 0, reviewModelExecutionAuthorized: false, numericalScoringAuthorized: false, assessmentProseAuthorized: false }, null, 2));
