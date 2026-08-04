#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V384_COVERAGE_MANUAL, V384_COVERAGE_ROOT, V384_GATE_MANIFEST, assert } from "./lib/v384-coverage-preparation.mjs";

const root = process.cwd();
const amendmentRoot = "docs/calibration/v3.8.5/coverage-transport-amendment";
const manifestPath = `${amendmentRoot}/execution-manifest.json`;
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
const correction01Root = `${V384_COVERAGE_ROOT}/proposal-correction-01`;
const correction02Root = `${V384_COVERAGE_ROOT}/proposal-correction-02`;
const correction01LockPath = `${correction01Root}/execution-manifest.json`;
const correction01ExecutionPath = `${correction01Root}/model-execution.json`;
const correction02LockPath = `${correction02Root}/execution-manifest.json`;
const correction02ExecutionPath = `${correction02Root}/model-execution.json`;
const [gate, originalLock, originalExecution, correction01Lock, correction01Execution, correction02Lock, correction02Execution] = await Promise.all([
  readJson(V384_GATE_MANIFEST), readJson(originalLockPath), readJson(originalExecutionPath), readJson(correction01LockPath), readJson(correction01ExecutionPath), readJson(correction02LockPath), readJson(correction02ExecutionPath)
]);
const originalResults = new Map(originalExecution.results.map((item) => [item.debateNumber, item]));
assert(originalResults.get("103")?.status === "completed-valid" && originalResults.get("55")?.status === "completed-valid", "preserved v3.8.4 outputs invalid");

const failedAttempts = [
  { attempt: "v3.8.4-original", lock: originalLockPath, execution: originalExecutionPath, context: originalLock.proposalContexts["161"], result: originalResults.get("161") },
  { attempt: "v3.8.4-correction-01", lock: correction01LockPath, execution: correction01ExecutionPath, context: correction01Lock.proposalContext, result: correction01Execution.result },
  { attempt: "v3.8.4-correction-02", lock: correction02LockPath, execution: correction02ExecutionPath, context: correction02Lock.proposalContext, result: correction02Execution.result }
].map(({ attempt, lock, execution, context, result }) => ({
  attempt, lock, execution, rawOutput: context.rawOutput, enrichedOutput: context.enrichedOutput,
  rawSha256: result.outputSha256, enrichedSha256: result.enrichedOutputSha256,
  status: result.status, commandExitCode: result.commandExitCode, validationExitCode: result.validationExitCode,
  streamRecoveries: result.sameRequestStreamRecoveries, previousLimit: result.streamRecoveryLimit,
  downstreamReuseAuthorized: false
}));
for (const item of failedAttempts) {
  assert(item.status === "stream-recovery-limit-exceeded" && item.commandExitCode === 0 && item.validationExitCode === 0 && item.streamRecoveries > item.previousLimit, `${item.attempt}: failure record invalid`);
  assert(sha256(await read(item.rawOutput)) === item.rawSha256 && sha256(await read(item.enrichedOutput)) === item.enrichedSha256, `${item.attempt}: failed artifact hash mismatch`);
}

const preservedValidOutputs = {};
for (const debateNumber of ["103", "55"]) {
  const context = originalLock.proposalContexts[debateNumber];
  const result = originalResults.get(debateNumber);
  preservedValidOutputs[debateNumber] = {
    rawOutput: context.rawOutput, enrichedOutput: context.enrichedOutput,
    rawSha256: result.outputSha256, enrichedSha256: result.enrichedOutputSha256,
    status: result.status, streamRecoveries: result.sameRequestStreamRecoveries
  };
}
for (const item of Object.values(preservedValidOutputs)) assert(sha256(await read(item.rawOutput)) === item.rawSha256 && sha256(await read(item.enrichedOutput)) === item.enrichedSha256, "preserved valid artifact hash mismatch");

const sourceContext = originalLock.proposalContexts["161"];
const proposalContext = {
  debateNumber: "161", packet: sourceContext.packet, schema: sourceContext.schema,
  transcript: sourceContext.transcript, events: sourceContext.events, captionManifest: sourceContext.captionManifest,
  rawOutput: `${amendmentRoot}/raw-output.json`, enrichedOutput: `${amendmentRoot}/enriched-output.json`
};
const sourceFiles = [
  `${amendmentRoot}/preregistration.md`, "docs/assessment-workflow-v3.8.4.md", "docs/reassessment-rubric-v3.8.4.md",
  V384_GATE_MANIFEST, V384_COVERAGE_MANUAL, originalLockPath, originalExecutionPath,
  correction01LockPath, correction01ExecutionPath, correction02LockPath, correction02ExecutionPath,
  proposalContext.packet, proposalContext.schema, proposalContext.transcript, proposalContext.events, proposalContext.captionManifest,
  gate.sample.debates.find((debate) => debate.debateNumber === "161").resolvedSeedInventoryPath,
  ...Object.values(preservedValidOutputs).flatMap((item) => [item.rawOutput, item.enrichedOutput]),
  ...failedAttempts.flatMap((item) => [item.rawOutput, item.enrichedOutput]),
  "scripts/lib/v384-coverage-preparation.mjs", "scripts/lib/v385-transport.mjs", "scripts/validate-v384-coverage-proposal.mjs",
  "scripts/test-v385-transport-amendment.mjs",
  "scripts/preregister-v385-coverage-transport-amendment.mjs", "scripts/validate-v385-coverage-transport-amendment-lock.mjs", "scripts/run-v385-coverage-transport-amendment.mjs"
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await read(file));
const futureOutputs = [proposalContext.rawOutput, proposalContext.enrichedOutput, `${amendmentRoot}/model-execution.json`];

const artifact = {
  schemaVersion: "3.8.5-coverage-transport-amendment-execution-manifest",
  protocolId: "v3.8.5-coverage-transport-amendment", parentProtocolId: gate.protocolId,
  stage: "fresh-debate-161-coverage-proposal", status: "frozen-single-context-amendment-authorized",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true, AIOnly: true,
  amendmentBasis: {
    v384GateTerminatedWithoutPass: true, failedAttempts, failedArtifactsPreserved: true,
    failedArtifactsVisibleToFreshModel: false, failedArtifactsReclassified: false,
    validDebatesRerun: false, semanticPacketChanged: false, schemaChanged: false, sourceChanged: false,
    transportRuleChangedProspectively: true
  },
  model: originalLock.model, modelInputs: originalLock.modelInputs, proposalContext, preservedValidOutputs,
  finalProposalInputMapAfterSuccessfulAmendment: {
    "103": preservedValidOutputs["103"].enrichedOutput,
    "55": preservedValidOutputs["55"].enrichedOutput,
    "161": proposalContext.enrichedOutput
  },
  authorization: {
    freshCoverageProposalContexts: 1, coverageProposalModelExecution: true,
    coverageReviewPacketConstructionAfterPass: true, coverageReviewModelExecution: false,
    coverageAdjudicationModelExecution: false, audioVerification: false, burdenContactModelExecution: false,
    scoringModelExecution: false, numericalParticipantScoring: false, assessmentProse: false,
    productionMutation: false, all195Debates: false
  },
  isolation: {
    temporaryCodexHome: true, freshSourceDirectory: true, fullTranscriptAndTimestampedEventsAvailable: true,
    priorDebate161ProposalsAvailable: false, Debates103And55OutputsAvailable: false,
    legacyAssessmentAvailable: false, seedProvisionalBurdenContactsAvailable: false, scoresAvailable: false
  },
  executionPolicy: {
    attempts: 1, modelOutputRetriesMaximum: 0, perInvocationTimeoutMs: 3600000,
    recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8,
    transportClassification: { clean: "0-2", recoveredDegraded: "3-8", invalid: ">8 or unrecovered" },
    transportEventsExtractedFromStderrOnly: true, transportEventLinesRecorded: true,
    stdoutAndStderrHashesRecorded: true, boundedReadLinesMaximum: 400, provisionalJsonMessagesMaximum: 0,
    authentication: "ChatGPT subscription", APIKeysRemoved: true,
    meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0
  },
  acceptanceRule: {
    normalCommandExitRequired: true, timeoutForbidden: true, terminationSignalForbidden: true,
    exactlyOneSchemaConformingFinalOutputRequired: true, deterministicCoverageValidationRequired: true,
    recoverableStreamEventsAtOrBelowHardMaximumRequired: true,
    independentCoverageReviewRequiredRegardlessOfTransportClassification: true
  },
  stopRules: {
    anySourceHashMismatchBlocksModelExecution: true, anyPreexistingFutureOutputBlocksModelExecution: true,
    anyAcceptanceFailureBlocksReviewPacketConstruction: true, furtherAutomaticRetryAuthorized: false,
    transportCeilingMayNotChangeAfterOutput: true
  },
  artifacts: {
    modelExecution: `${amendmentRoot}/model-execution.json`, rawOutput: proposalContext.rawOutput,
    enrichedOutput: proposalContext.enrichedOutput, coverageReviewLock: null,
    scoringArtifacts: null, assessmentArtifacts: null
  },
  dryContract: {
    command: "node scripts/test-v385-transport-amendment.mjs",
    stderrOnlyExtractionVerified: true, genericResumeIgnored: true,
    boundaryClassificationsVerified: [0, 2, 3, 8, 9]
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs, sourceHashes
};
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(root, manifestPath)), { recursive: true });
  await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(artifact, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, freshContextsAuthorized: 1, authorizedDebateNumber: "161", preservedValidDebates: ["103", "55"], previousFailedAttempts: 3, recoverableStreamEventsHardMaximum: 8, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 }, null, 2));
