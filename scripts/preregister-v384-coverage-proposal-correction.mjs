#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V384_COVERAGE_EXECUTION_MANIFEST,
  V384_COVERAGE_MANUAL,
  V384_COVERAGE_ROOT,
  V384_GATE_MANIFEST,
  assert
} from "./lib/v384-coverage-preparation.mjs";

const root = process.cwd();
const correctionRoot = `${V384_COVERAGE_ROOT}/proposal-correction-01`;
const correctionManifestPath = `${correctionRoot}/execution-manifest.json`;
const originalExecutionPath = `${V384_COVERAGE_ROOT}/proposal-model-execution.json`;
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at must be an ISO timestamp");
if (shouldWrite) {
  try { await access(path.resolve(root, correctionManifestPath)); throw new Error(`${correctionManifestPath} already exists`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}

const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [gate, originalLock, originalExecution] = await Promise.all([
  readJson(V384_GATE_MANIFEST),
  readJson(V384_COVERAGE_EXECUTION_MANIFEST),
  readJson(originalExecutionPath)
]);
assert(originalLock.status === "frozen-coverage-proposal-execution-authorized", "original coverage execution lock invalid");
assert(originalExecution.contextsPlanned === 3 && originalExecution.validOutputContexts === 2 && originalExecution.totalAttempts === 3 && originalExecution.totalRetries === 0, "original execution failure shape invalid");
const results = new Map(originalExecution.results.map((result) => [result.debateNumber, result]));
assert(results.get("103")?.status === "completed-valid" && results.get("55")?.status === "completed-valid", "valid original proposals changed");
assert(results.get("161")?.status === "stream-recovery-limit-exceeded" && results.get("161")?.commandExitCode === 0 && results.get("161")?.validationExitCode === 0 && results.get("161")?.enrichedOutputWritten === true, "Debate 161 correction basis invalid");
assert(results.get("161").sameRequestStreamRecoveries > results.get("161").streamRecoveryLimit, "Debate 161 did not exceed the frozen stream limit");

const originalContext = originalLock.proposalContexts["161"];
const context = {
  debateNumber: "161",
  packet: originalContext.packet,
  schema: originalContext.schema,
  transcript: originalContext.transcript,
  events: originalContext.events,
  captionManifest: originalContext.captionManifest,
  rawOutput: `${correctionRoot}/raw-output.json`,
  enrichedOutput: `${correctionRoot}/enriched-output.json`
};
const preservedOutputs = {
  "103": {
    rawOutput: originalLock.proposalContexts["103"].rawOutput,
    enrichedOutput: originalLock.proposalContexts["103"].enrichedOutput,
    rawSha256: results.get("103").outputSha256,
    enrichedSha256: results.get("103").enrichedOutputSha256
  },
  "55": {
    rawOutput: originalLock.proposalContexts["55"].rawOutput,
    enrichedOutput: originalLock.proposalContexts["55"].enrichedOutput,
    rawSha256: results.get("55").outputSha256,
    enrichedSha256: results.get("55").enrichedOutputSha256
  }
};
const invalidatedOutput = {
  rawOutput: originalContext.rawOutput,
  enrichedOutput: originalContext.enrichedOutput,
  rawSha256: results.get("161").outputSha256,
  enrichedSha256: results.get("161").enrichedOutputSha256,
  downstreamReuseAuthorized: false
};
for (const preserved of Object.values(preservedOutputs)) {
  assert(sha256(await read(preserved.rawOutput)) === preserved.rawSha256, `${preserved.rawOutput}: preserved raw hash mismatch`);
  assert(sha256(await read(preserved.enrichedOutput)) === preserved.enrichedSha256, `${preserved.enrichedOutput}: preserved enriched hash mismatch`);
}
assert(sha256(await read(invalidatedOutput.rawOutput)) === invalidatedOutput.rawSha256, "invalidated Debate 161 raw hash mismatch");
assert(sha256(await read(invalidatedOutput.enrichedOutput)) === invalidatedOutput.enrichedSha256, "invalidated Debate 161 enriched hash mismatch");

const sourceFiles = [
  "docs/assessment-workflow-v3.8.4.md",
  "docs/reassessment-rubric-v3.8.4.md",
  V384_GATE_MANIFEST,
  V384_COVERAGE_MANUAL,
  V384_COVERAGE_EXECUTION_MANIFEST,
  originalExecutionPath,
  context.packet,
  context.schema,
  context.transcript,
  context.events,
  context.captionManifest,
  gate.sample.debates.find((debate) => debate.debateNumber === "161").resolvedSeedInventoryPath,
  ...Object.values(preservedOutputs).flatMap((item) => [item.rawOutput, item.enrichedOutput]),
  invalidatedOutput.rawOutput,
  invalidatedOutput.enrichedOutput,
  "scripts/lib/v36-decision-cards.mjs",
  "scripts/lib/v37-retired-semantic.mjs",
  "scripts/lib/v381-source-preparation.mjs",
  "scripts/lib/v384-coverage-preparation.mjs",
  "scripts/validate-v384-coverage-proposal.mjs",
  "scripts/preregister-v384-coverage-proposal-correction.mjs",
  "scripts/validate-v384-coverage-proposal-correction-lock.mjs",
  "scripts/run-v384-coverage-proposal-correction.mjs"
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await read(file));
const futureOutputs = [context.rawOutput, context.enrichedOutput, `${correctionRoot}/model-execution.json`];
assert(futureOutputs.every((file) => !Object.hasOwn(sourceHashes, file)), "correction future output leaked into source hashes");

const artifact = {
  schemaVersion: "3.8.4-full-coverage-proposal-correction-01-execution-manifest",
  protocolId: gate.protocolId,
  parentExecutionManifest: V384_COVERAGE_EXECUTION_MANIFEST,
  parentExecutionRecord: originalExecutionPath,
  stage: "full-coverage-proposal-correction-01",
  status: "frozen-single-context-correction-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  correctionBasis: {
    failedDebateNumber: "161",
    failedStatus: results.get("161").status,
    deterministicSchemaValidationPassed: results.get("161").validationExitCode === 0,
    observedSameRequestStreamRecoveries: results.get("161").sameRequestStreamRecoveries,
    lockedSameRequestStreamRecoveryLimit: results.get("161").streamRecoveryLimit,
    failedArtifactPreserved: true,
    failedArtifactVisibleToCorrectionModel: false,
    failedArtifactDownstreamReuseAuthorized: false,
    validDebatesRerun: false
  },
  model: originalLock.model,
  modelInputs: originalLock.modelInputs,
  proposalContext: context,
  preservedValidOutputs: preservedOutputs,
  invalidatedOutput,
  finalProposalInputMapAfterSuccessfulCorrection: {
    "103": preservedOutputs["103"].enrichedOutput,
    "55": preservedOutputs["55"].enrichedOutput,
    "161": context.enrichedOutput
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
    priorDebate161ProposalAvailable: false,
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
    secondCorrectionRequiresAnotherCommittedLock: true
  },
  artifacts: {
    correctionExecution: `${correctionRoot}/model-execution.json`,
    correctionRawOutput: context.rawOutput,
    correctionEnrichedOutput: context.enrichedOutput,
    coverageReviewLock: null,
    finalCoverageInventory: null,
    scoringArtifacts: null,
    assessmentArtifacts: null
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes
};
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(root, correctionManifestPath)), { recursive: true });
  await writeFile(path.resolve(root, correctionManifestPath), `${JSON.stringify(artifact, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? "frozen" : "preview",
  correctionManifest: correctionManifestPath,
  authorizedDebateNumber: "161",
  freshContextsAuthorized: 1,
  validDebatesRerun: false,
  failedOutputVisibleToCorrectionModel: false,
  downstreamExecutionAuthorized: false,
  meteredApiCostUsdMaximum: 0,
  transcriptionCostUsdMaximum: 0
}, null, 2));
