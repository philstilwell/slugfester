#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V384_COVERAGE_MANUAL, V384_COVERAGE_ROOT, V384_GATE_MANIFEST, assert } from "./lib/v384-coverage-preparation.mjs";

const root = process.cwd();
const originalRoot = `${V384_COVERAGE_ROOT}/proposal`;
const correction01Root = `${V384_COVERAGE_ROOT}/proposal-correction-01`;
const correction02Root = `${V384_COVERAGE_ROOT}/proposal-correction-02`;
const manifestPath = `${correction02Root}/execution-manifest.json`;
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at must be an ISO timestamp");
if (shouldWrite) {
  try { await access(path.resolve(root, manifestPath)); throw new Error(`${manifestPath} already exists`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}

const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const originalLockPath = `${V384_COVERAGE_ROOT}/proposal-execution-manifest.json`;
const originalExecutionPath = `${V384_COVERAGE_ROOT}/proposal-model-execution.json`;
const correction01LockPath = `${correction01Root}/execution-manifest.json`;
const correction01ExecutionPath = `${correction01Root}/model-execution.json`;
const [gate, originalLock, originalExecution, correction01Lock, correction01Execution] = await Promise.all([
  readJson(V384_GATE_MANIFEST), readJson(originalLockPath), readJson(originalExecutionPath), readJson(correction01LockPath), readJson(correction01ExecutionPath)
]);
const originalResults = new Map(originalExecution.results.map((item) => [item.debateNumber, item]));
assert(originalResults.get("103")?.status === "completed-valid" && originalResults.get("55")?.status === "completed-valid", "preserved original outputs invalid");
assert(originalResults.get("161")?.status === "stream-recovery-limit-exceeded" && originalResults.get("161")?.validationExitCode === 0, "original Debate 161 failure invalid");
assert(correction01Execution.result.status === "stream-recovery-limit-exceeded" && correction01Execution.result.validationExitCode === 0 && correction01Execution.result.enrichedOutputWritten, "correction 01 failure invalid");
assert(correction01Execution.result.sameRequestStreamRecoveries > correction01Execution.result.streamRecoveryLimit, "correction 01 did not exceed stream limit");

const preservedValidOutputs = correction01Lock.preservedValidOutputs;
for (const item of Object.values(preservedValidOutputs)) {
  assert(sha256(await read(item.rawOutput)) === item.rawSha256 && sha256(await read(item.enrichedOutput)) === item.enrichedSha256, "preserved output hash mismatch");
}
const invalidatedAttempts = [
  {
    attempt: "original",
    executionRecord: originalExecutionPath,
    rawOutput: originalLock.proposalContexts["161"].rawOutput,
    enrichedOutput: originalLock.proposalContexts["161"].enrichedOutput,
    rawSha256: originalResults.get("161").outputSha256,
    enrichedSha256: originalResults.get("161").enrichedOutputSha256,
    streamRecoveries: originalResults.get("161").sameRequestStreamRecoveries,
    streamRecoveryLimit: originalResults.get("161").streamRecoveryLimit,
    downstreamReuseAuthorized: false
  },
  {
    attempt: "correction-01",
    executionRecord: correction01ExecutionPath,
    rawOutput: correction01Lock.proposalContext.rawOutput,
    enrichedOutput: correction01Lock.proposalContext.enrichedOutput,
    rawSha256: correction01Execution.result.outputSha256,
    enrichedSha256: correction01Execution.result.enrichedOutputSha256,
    streamRecoveries: correction01Execution.result.sameRequestStreamRecoveries,
    streamRecoveryLimit: correction01Execution.result.streamRecoveryLimit,
    downstreamReuseAuthorized: false
  }
];
for (const attempt of invalidatedAttempts) {
  assert(sha256(await read(attempt.rawOutput)) === attempt.rawSha256 && sha256(await read(attempt.enrichedOutput)) === attempt.enrichedSha256, `${attempt.attempt}: invalidated output hash mismatch`);
  assert(attempt.streamRecoveries > attempt.streamRecoveryLimit, `${attempt.attempt}: invalidation threshold not met`);
}

const sourceContext = originalLock.proposalContexts["161"];
const proposalContext = {
  debateNumber: "161",
  packet: sourceContext.packet,
  schema: sourceContext.schema,
  transcript: sourceContext.transcript,
  events: sourceContext.events,
  captionManifest: sourceContext.captionManifest,
  rawOutput: `${correction02Root}/raw-output.json`,
  enrichedOutput: `${correction02Root}/enriched-output.json`
};
const sourceFiles = [
  "docs/assessment-workflow-v3.8.4.md", "docs/reassessment-rubric-v3.8.4.md", V384_GATE_MANIFEST, V384_COVERAGE_MANUAL,
  originalLockPath, originalExecutionPath, correction01LockPath, correction01ExecutionPath,
  proposalContext.packet, proposalContext.schema, proposalContext.transcript, proposalContext.events, proposalContext.captionManifest,
  gate.sample.debates.find((debate) => debate.debateNumber === "161").resolvedSeedInventoryPath,
  ...Object.values(preservedValidOutputs).flatMap((item) => [item.rawOutput, item.enrichedOutput]),
  ...invalidatedAttempts.flatMap((item) => [item.rawOutput, item.enrichedOutput]),
  "scripts/lib/v36-decision-cards.mjs", "scripts/lib/v37-retired-semantic.mjs", "scripts/lib/v381-source-preparation.mjs", "scripts/lib/v384-coverage-preparation.mjs",
  "scripts/validate-v384-coverage-proposal.mjs", "scripts/preregister-v384-coverage-proposal-correction-02.mjs", "scripts/validate-v384-coverage-proposal-correction-02-lock.mjs", "scripts/run-v384-coverage-proposal-correction-02.mjs"
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await read(file));
const futureOutputs = [proposalContext.rawOutput, proposalContext.enrichedOutput, `${correction02Root}/model-execution.json`];
assert(futureOutputs.every((file) => !Object.hasOwn(sourceHashes, file)), "correction 02 future output leaked into source hashes");

const artifact = {
  schemaVersion: "3.8.4-full-coverage-proposal-correction-02-execution-manifest",
  protocolId: gate.protocolId,
  parentCorrectionManifest: correction01LockPath,
  parentCorrectionExecution: correction01ExecutionPath,
  stage: "full-coverage-proposal-correction-02",
  status: "frozen-final-single-context-transport-correction-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  correctionBasis: {
    failedDebateNumber: "161",
    invalidatedAttempts,
    failedArtifactsPreserved: true,
    failedArtifactsVisibleToCorrectionModel: false,
    validDebatesRerun: false,
    semanticPacketChanged: false,
    schemaChanged: false,
    sourceChanged: false,
    streamRecoveryThresholdChanged: false,
    operationalPromptChange: "No interim JSON; sequential bounded file reads; bounded tool output; explicit recovery-match capture.",
    terminalAfterThisAttempt: true
  },
  model: originalLock.model,
  modelInputs: originalLock.modelInputs,
  proposalContext,
  preservedValidOutputs,
  finalProposalInputMapAfterSuccessfulCorrection: {
    "103": preservedValidOutputs["103"].enrichedOutput,
    "55": preservedValidOutputs["55"].enrichedOutput,
    "161": proposalContext.enrichedOutput
  },
  authorization: {
    freshCoverageProposalContexts: 1,
    coverageProposalCorrectionModelExecution: true,
    coverageReviewModelExecution: false,
    coverageAdjudicationModelExecution: false,
    audioVerification: false,
    burdenContactModelExecution: false,
    scoringModelExecution: false,
    numericalParticipantScoring: false,
    assessmentProse: false,
    productionMutation: false,
    all195Debates: false
  },
  isolation: {
    temporaryCodexHome: true,
    freshSourceDirectory: true,
    fullTranscriptAndTimestampedEventsAvailable: true,
    priorDebate161ProposalsAvailable: false,
    Debates103And55OutputsAvailable: false,
    legacyAssessmentAvailable: false,
    seedProvisionalBurdenContactsAvailable: false,
    scoresAvailable: false
  },
  executionPolicy: {
    attempts: 1,
    modelOutputRetriesMaximum: 0,
    sameRequestStreamRecoveriesMaximum: 2,
    perInvocationTimeoutMs: 3600000,
    timedOutContextsMaximum: 0,
    boundedReadLinesMaximum: 400,
    provisionalJsonMessagesMaximum: 0,
    transportRecoveryMatchesRecorded: true,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0
  },
  stopRules: {
    anySourceHashMismatchBlocksModelExecution: true,
    anyPreexistingCorrectionOutputBlocksModelExecution: true,
    anyInvalidCorrectionBlocksReviewPacketConstruction: true,
    anyStreamRecoveryLimitExcessBlocksReviewPacketConstruction: true,
    furtherAutomaticCorrectionAuthorized: false
  },
  artifacts: {
    correctionExecution: `${correction02Root}/model-execution.json`,
    correctionRawOutput: proposalContext.rawOutput,
    correctionEnrichedOutput: proposalContext.enrichedOutput,
    coverageReviewLock: null,
    finalCoverageInventory: null,
    scoringArtifacts: null,
    assessmentArtifacts: null
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes
};
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(root, manifestPath)), { recursive: true });
  await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(artifact, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? "frozen" : "preview",
  manifest: manifestPath,
  authorizedDebateNumber: "161",
  freshContextsAuthorized: 1,
  priorFailedAttempts: invalidatedAttempts.length,
  semanticInputsChanged: false,
  streamRecoveryThresholdChanged: false,
  downstreamExecutionAuthorized: false,
  meteredApiCostUsdMaximum: 0,
  transcriptionCostUsdMaximum: 0
}, null, 2));
