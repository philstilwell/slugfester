#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V429_ROOT } from "./lib/v429-long-context-partition.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V429_ROOT}/execution-manifest.json`;
const executionPath = `${V429_ROOT}/model-execution.json`;
const analysisPath = `${V429_ROOT}/analysis.json`;
if (shouldWrite) for (const file of [manifestPath, executionPath, analysisPath]) await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);

const preparation = JSON.parse(await readFile(`${V429_ROOT}/preparation-manifest.json`, "utf8"));
assertV4(preparation.status === "prepared-two-overlapping-score-blind-chunks" && preparation.coverage.complete, "v4.2.9 preparation invalid");
const sourceFiles = [
  "docs/assessment-workflow-v4.2.9.md",
  ...Object.values(preparation.modelInputs),
  preparation.source.fullLedger,
  preparation.source.originalEvents,
  preparation.source.v428Execution,
  preparation.source.v428Analysis,
  `${V429_ROOT}/preparation-manifest.json`,
  ...preparation.chunks.map((chunk) => chunk.chunkPath),
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v41-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v429-long-context-partition.mjs",
  "scripts/build-v429-long-context-partition.mjs",
  "scripts/test-v429-long-context-partition.mjs",
  "scripts/validate-v429-proposal.mjs",
  "scripts/preregister-v429-long-context-partition.mjs",
  "scripts/run-v429-long-context-partition.mjs",
  "scripts/analyze-v429-long-context-partition.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
const futureOutputs = [...preparation.chunks.map((chunk) => chunk.rawOutput), executionPath, analysisPath];
const manifest = {
  schemaVersion: "4.2.9-long-context-partition-execution-manifest",
  protocolId: preparation.protocolId,
  status: "frozen-two-score-blind-chunk-proposers-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  developmentOnly: true,
  AIOnly: true,
  debateNumber: "99",
  model: preparation.model,
  modelInputs: preparation.modelInputs,
  source: preparation.source,
  chunks: preparation.chunks,
  coverage: preparation.coverage,
  isolation: { freshTemporaryCodexHomePerChunk: true, freshSourceDirectoryPerChunk: true, otherChunkUnavailable: true, otherProposalUnavailable: true, v428TimeoutDetailsUnavailable: true, legacyUnavailable: true, scoresUnavailable: true },
  executionPolicy: { contexts: 2, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, continueAfterLocalChunkFailure: true, timeoutMs: preparation.policy.timeoutMs, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  authorization: { twoProposalContexts: true, deterministicValidation: true, mergePreparation: false, scoreDerivation: false, productionMutation: false },
  artifacts: { execution: executionPath, analysis: analysisPath, proposals: preparation.chunks.map((chunk) => chunk.rawOutput) },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes
};
if (shouldWrite) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", debateNumber: "99", contexts: 2, attemptsPerContext: 1, retries: 0, timeoutMinutesPerChunk: preparation.policy.timeoutMs / 60000, completeCoverage: true, meteredApiCostUsdMaximum: 0 }, null, 2));
