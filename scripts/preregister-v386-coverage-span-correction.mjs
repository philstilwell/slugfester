#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert } from "./lib/v384-coverage-preparation.mjs";

const root = process.cwd();
const base = "docs/calibration/v3.8.6/coverage-span-correction";
const manifestPath = `${base}/execution-manifest.json`;
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
const v385ManifestPath = "docs/calibration/v3.8.5/coverage-transport-amendment/execution-manifest.json";
const v385ExecutionPath = "docs/calibration/v3.8.5/coverage-transport-amendment/model-execution.json";
const v385RawPath = "docs/calibration/v3.8.5/coverage-transport-amendment/raw-output.json";
const packetPath = `${base}/correction-packet.json`;
const schemaPath = `${base}/correction-schema.json`;
const [v385Manifest, v385Execution, packet] = await Promise.all([readJson(v385ManifestPath), readJson(v385ExecutionPath), readJson(packetPath)]);
assert(v385Execution.result.status === "output-validation-failed" && v385Execution.result.transportClassification === "clean" && v385Execution.result.recoverableStreamEvents === 0 && v385Execution.result.commandExitCode === 0 && v385Execution.result.validationExitCode === 1, "v3.8.5 failure basis invalid");
assert(v385Execution.result.validationMessage.includes("addition-01") && v385Execution.result.validationMessage.includes("found 253"), "v3.8.5 failure is not the frozen span defect");
assert(packet.target.localRef === "addition-01" && packet.target.originalWordCount === 253 && packet.target.requiredMaximumWords === 220, "correction packet invalid");
const sourceFiles = [
  `${base}/preregistration.md`, packetPath, schemaPath,
  v385ManifestPath, v385ExecutionPath, v385RawPath,
  v385Manifest.proposalContext.packet, v385Manifest.proposalContext.schema,
  v385Manifest.proposalContext.events, v385Manifest.proposalContext.captionManifest,
  "scripts/lib/v36-decision-cards.mjs", "scripts/lib/v37-retired-semantic.mjs",
  "scripts/lib/v381-source-preparation.mjs", "scripts/lib/v384-coverage-preparation.mjs", "scripts/lib/v385-transport.mjs",
  "scripts/validate-v384-coverage-proposal.mjs", "scripts/build-v386-coverage-span-correction.mjs",
  "scripts/preregister-v386-coverage-span-correction.mjs", "scripts/validate-v386-coverage-span-correction-lock.mjs",
  "scripts/run-v386-coverage-span-correction.mjs"
];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await read(file));
const outputs = {
  correctionOutput: `${base}/correction-output.json`, correctedRawOutput: `${base}/corrected-raw-output.json`,
  enrichedOutput: `${base}/enriched-output.json`, modelExecution: `${base}/model-execution.json`
};
const artifact = {
  schemaVersion: "3.8.6-coverage-span-correction-execution-manifest",
  protocolId: "v3.8.6-coverage-span-correction", parentProtocolId: v385Manifest.protocolId,
  stage: "debate-161-coordinate-only-correction", status: "frozen-single-context-coordinate-correction-authorized",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true, AIOnly: true,
  correctionBasis: {
    failedArtifact: v385RawPath, failedArtifactSha256: sha256(await read(v385RawPath)),
    failedExecution: v385ExecutionPath, targetLocalRef: "addition-01", originalWordCount: 253,
    soleFailure: "atomic source span exceeds 220 normalized words", v385TransportPassedClean: true,
    fullDebateRerun: false, semanticReassessment: false
  },
  model: v385Manifest.model,
  modelContext: { packet: packetPath, schema: schemaPath, priorFullProposalAvailable: false, localTimestampedWindowOnly: true },
  mergeContext: {
    sourceRawOutput: v385RawPath, sourcePacket: v385Manifest.proposalContext.packet,
    sourceSchema: v385Manifest.proposalContext.schema, sourceEvents: v385Manifest.proposalContext.events,
    immutableFields: "all fields except additions[localRef=addition-01].startEvent and .endEvent"
  },
  authorization: {
    freshCoordinateCorrectionContexts: 1, coordinateCorrectionModelExecution: true,
    deterministicMergeAndFullCoverageValidation: true, coverageReviewPacketConstructionAfterPass: true,
    coverageReviewModelExecution: false, coverageAdjudicationModelExecution: false,
    burdenContactModelExecution: false, scoringModelExecution: false, numericalParticipantScoring: false,
    assessmentProse: false, productionMutation: false, all195Debates: false
  },
  executionPolicy: {
    attempts: 1, modelOutputRetriesMaximum: 0, perInvocationTimeoutMs: 900000,
    recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8,
    transportEventsExtractedFromStderrOnly: true, canonicalNoncoordinateIdentityRequired: true,
    completeCoverageRevalidationRequired: true, authentication: "ChatGPT subscription", APIKeysRemoved: true,
    meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0
  },
  acceptanceRule: {
    normalCommandExitRequired: true, correctionSchemaRequired: true,
    correctedSpanWithinOriginalRequired: true, correctedSpanWordsMinimum: 20, correctedSpanWordsMaximum: 220,
    correctedSpanDurationMsMaximum: 150000, noncoordinateMutationCountMaximum: 0,
    completeCoverageValidatorExitCodeRequired: 0, recoverableStreamEventsHardMaximum: 8
  },
  stopRules: {
    anySourceHashMismatchBlocksExecution: true, anyPreexistingOutputBlocksExecution: true,
    anyAcceptanceFailureBlocksReview: true, furtherAutomaticRetryAuthorized: false
  },
  outputs,
  futureOutputPathsExcludedFromSourceHashes: Object.values(outputs),
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, targetLocalRef: "addition-01", authorizedContexts: 1, semanticFieldsMutable: 0, coordinateFieldsMutable: 2, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 }, null, 2));
