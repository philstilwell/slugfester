#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert } from "./lib/v384-coverage-preparation.mjs";

const root = process.cwd();
const base = "docs/calibration/v3.8.7/coverage-batch-span-correction";
const manifestPath = `${base}/execution-manifest.json`;
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at must be an ISO timestamp");
if (shouldWrite) { try { await access(path.resolve(root, manifestPath)); throw new Error(`${manifestPath} already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const v385ManifestPath = "docs/calibration/v3.8.5/coverage-transport-amendment/execution-manifest.json";
const v385ExecutionPath = "docs/calibration/v3.8.5/coverage-transport-amendment/model-execution.json";
const v385RawPath = "docs/calibration/v3.8.5/coverage-transport-amendment/raw-output.json";
const v386ExecutionPath = "docs/calibration/v3.8.6/coverage-span-correction/model-execution.json";
const auditPath = `${base}/exhaustive-preflight.json`;
const packetPath = `${base}/correction-packet.json`;
const schemaPath = `${base}/correction-schema.json`;
const [v385Manifest, v385Execution, v386Execution, audit, packet] = await Promise.all([readJson(v385ManifestPath), readJson(v385ExecutionPath), readJson(v386ExecutionPath), readJson(auditPath), readJson(packetPath)]);
const targetRefs = ["addition-01", "addition-02", "addition-03", "addition-07"];
assert(v385Execution.result.transportClassification === "clean" && v385Execution.result.commandExitCode === 0, "v3.8.5 transport basis invalid");
assert(v386Execution.result.status === "complete-coverage-validation-failed" && v386Execution.result.noncoordinateMutationCount === 0 && v386Execution.result.correctedWordCount === 208, "v3.8.6 discovery record invalid");
assert(audit.auditMode === "collect-all-no-fail-fast" && audit.issueCount === 4 && audit.issues.every((item, index) => item.code === "span-word-count" && item.ref === targetRefs[index]), "exhaustive issue set invalid");
assert(canonical(packet.targetRefs) === canonical(targetRefs), "correction packet targets invalid");
function canonical(value) { return JSON.stringify(value); }
const sourceFiles = [
  `${base}/preregistration.md`, auditPath, packetPath, schemaPath,
  v385ManifestPath, v385ExecutionPath, v385RawPath, v386ExecutionPath,
  v385Manifest.proposalContext.packet, v385Manifest.proposalContext.schema, v385Manifest.proposalContext.events, v385Manifest.proposalContext.captionManifest,
  "scripts/lib/v36-decision-cards.mjs", "scripts/lib/v37-retired-semantic.mjs", "scripts/lib/v381-source-preparation.mjs", "scripts/lib/v384-coverage-preparation.mjs", "scripts/lib/v385-transport.mjs",
  "scripts/validate-v384-coverage-proposal.mjs", "scripts/audit-v385-coverage-proposal-exhaustive.mjs", "scripts/build-v387-coverage-batch-span-correction.mjs",
  "scripts/preregister-v387-coverage-batch-span-correction.mjs", "scripts/validate-v387-coverage-batch-span-correction-lock.mjs", "scripts/run-v387-coverage-batch-span-correction.mjs"
];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await read(file));
const outputs = { correctionOutput: `${base}/correction-output.json`, correctedRawOutput: `${base}/corrected-raw-output.json`, enrichedOutput: `${base}/enriched-output.json`, modelExecution: `${base}/model-execution.json` };
const artifact = {
  schemaVersion: "3.8.7-coverage-batch-span-correction-execution-manifest", protocolId: "v3.8.7-coverage-batch-span-correction", parentProtocolId: v385Manifest.protocolId,
  stage: "debate-161-exhaustive-batch-coordinate-correction", status: "frozen-single-context-batch-coordinate-correction-authorized",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(), calibrationOnly: true, AIOnly: true,
  correctionBasis: { sourceRawOutput: v385RawPath, sourceRawSha256: sha256(await read(v385RawPath)), exhaustivePreflight: auditPath, exhaustiveIssueCount: 4, exhaustiveIssueCode: "span-word-count", targetRefs, v386CorrectionUsedAsInput: false, fullDebateRerun: false, semanticReassessment: false },
  model: v385Manifest.model,
  modelContext: { packet: packetPath, schema: schemaPath, priorFullProposalAvailable: false, v386CorrectionAvailable: false, boundedLocalTimestampedWindowsOnly: true },
  mergeContext: { sourceRawOutput: v385RawPath, sourcePacket: v385Manifest.proposalContext.packet, sourceSchema: v385Manifest.proposalContext.schema, sourceEvents: v385Manifest.proposalContext.events, mutableFields: targetRefs.flatMap((ref) => [`${ref}.startEvent`, `${ref}.endEvent`]), allOtherFieldsImmutable: true },
  authorization: { freshBatchCoordinateCorrectionContexts: 1, batchCoordinateCorrectionModelExecution: true, deterministicMergeAndFullCoverageValidation: true, coverageReviewPacketConstructionAfterPass: true, coverageReviewModelExecution: false, coverageAdjudicationModelExecution: false, burdenContactModelExecution: false, scoringModelExecution: false, numericalParticipantScoring: false, assessmentProse: false, productionMutation: false, all195Debates: false },
  executionPolicy: { attempts: 1, modelOutputRetriesMaximum: 0, perInvocationTimeoutMs: 1200000, recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8, transportEventsExtractedFromStderrOnly: true, canonicalNoncoordinateIdentityRequired: true, completeCoverageRevalidationRequired: true, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  acceptanceRule: { exactTargetOrderRequired: targetRefs, eachCorrectedSpanWithinItsOriginalRequired: true, correctedSpanWordsMinimum: 20, correctedSpanWordsMaximum: 220, correctedSpanDurationMsMaximum: 150000, noncoordinateMutationCountMaximum: 0, completeCoverageValidatorExitCodeRequired: 0, recoverableStreamEventsHardMaximum: 8 },
  stopRules: { anySourceHashMismatchBlocksExecution: true, anyPreexistingOutputBlocksExecution: true, anyAcceptanceFailureBlocksReview: true, furtherAutomaticRetryAuthorized: false },
  outputs, futureOutputPathsExcludedFromSourceHashes: Object.values(outputs), sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, targetRefs, authorizedContexts: 1, semanticFieldsMutable: 0, coordinateFieldsMutable: 8, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 }, null, 2));
