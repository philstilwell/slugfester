#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V4291_ROOT } from "./lib/v4291-schema-recovery.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V4291_ROOT}/execution-manifest.json`;
const executionPath = `${V4291_ROOT}/model-execution.json`;
const analysisPath = `${V4291_ROOT}/analysis.json`;
if (shouldWrite) for (const file of [manifestPath, executionPath, analysisPath]) await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);
const preparation = JSON.parse(await readFile(`${V4291_ROOT}/preparation-manifest.json`, "utf8"));
assertV4(preparation.status === "prepared-two-schema-recovery-chunks" && preparation.diagnosis.originalModelOutputs === 0, "v4.2.9.1 preparation invalid");
const sourceFiles = [
  "docs/assessment-workflow-v4.2.9.1.md",
  ...Object.values(preparation.modelInputs),
  preparation.source.fullLedger,
  preparation.source.originalEvents,
  preparation.source.priorPreparation,
  preparation.source.priorExecution,
  preparation.source.priorAnalysis,
  preparation.source.priorRejectedSchema,
  `${V4291_ROOT}/preparation-manifest.json`,
  ...preparation.chunks.map((chunk) => chunk.chunkPath),
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v41-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v429-long-context-partition.mjs",
  "scripts/lib/v4291-schema-recovery.mjs",
  "scripts/build-v4291-schema-recovery.mjs",
  "scripts/test-v4291-schema-recovery.mjs",
  "scripts/validate-v429-proposal.mjs",
  "scripts/preregister-v4291-schema-recovery.mjs",
  "scripts/run-v429-long-context-partition.mjs",
  "scripts/analyze-v4291-schema-recovery.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
const futureOutputs = [...preparation.chunks.map((chunk) => chunk.rawOutput), executionPath, analysisPath];
const manifest = {
  schemaVersion: "4.2.9.1-long-context-schema-recovery-execution-manifest",
  executionSchemaVersion: "4.2.9.1-long-context-schema-recovery-model-execution",
  protocolId: preparation.protocolId,
  proposalProtocolId: preparation.proposalProtocolId,
  stageLabel: "v4.2.9.1-schema-recovery",
  status: "frozen-two-schema-recovery-proposers-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  developmentOnly: true,
  AIOnly: true,
  debateNumber: "99",
  diagnosis: preparation.diagnosis,
  model: preparation.model,
  modelInputs: preparation.modelInputs,
  source: preparation.source,
  chunks: preparation.chunks,
  coverage: preparation.coverage,
  isolation: { freshTemporaryCodexHomePerChunk: true, freshSourceDirectoryPerChunk: true, otherChunkUnavailable: true, otherProposalUnavailable: true, v428TimeoutDetailsUnavailable: true, rejectedV429OutputsUnavailableBecauseNoneExist: true, legacyUnavailable: true, scoresUnavailable: true },
  executionPolicy: { contexts: 2, schemaRecoveryRequestsPerContext: 1, semanticRetries: 0, sequentialExecution: true, continueAfterLocalChunkFailure: true, timeoutMs: preparation.policy.timeoutMs, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  authorization: { twoProposalContexts: true, deterministicValidation: true, integratedPrimaryPreparation: false, scoreDerivation: false, productionMutation: false },
  artifacts: { execution: executionPath, analysis: analysisPath, proposals: preparation.chunks.map((chunk) => chunk.rawOutput) },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes
};
if (shouldWrite) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", debateNumber: "99", schemaRecoveryContexts: 2, priorRequestsRejectedBeforeInference: 2, semanticRetries: 0, timeoutMinutesPerChunk: preparation.policy.timeoutMs / 60000, meteredApiCostUsdMaximum: 0 }, null, 2));
