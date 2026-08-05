#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V4212_ROOT } from "./lib/v4212-lean-integrated-primary.mjs";

const shouldWrite = process.argv.includes("--write"), frozenIndex = process.argv.indexOf("--frozen-at"), frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO timestamp");
const manifestPath = `${V4212_ROOT}/execution-manifest.json`, executionPath = `${V4212_ROOT}/model-execution.json`, analysisPath = `${V4212_ROOT}/analysis.json`;
if (shouldWrite) for (const file of [manifestPath, executionPath, analysisPath]) await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);
const preparation = JSON.parse(await readFile(`${V4212_ROOT}/preparation-manifest.json`, "utf8"));
assertV4(preparation.status === "prepared-one-lean-integrated-primary" && preparation.totals.inputReductionFraction >= 0.2, "v4.2.12 preparation invalid");
const sourceFiles = [
  "docs/assessment-workflow-v4.2.12.md",
  ...Object.values(preparation.inputs),
  ...Object.values(preparation.validationInputs),
  ...Object.values(preparation.source),
  `${V4212_ROOT}/preparation-manifest.json`,
  "docs/calibration/v4.2.9.2/adaptive-long-context-continuation/analysis.json",
  "docs/calibration/v4.2.10/integrated-long-context-primary/model-execution.json",
  "docs/calibration/v4.2.5/conservative-excerpt-smoke/model-execution.json",
  "docs/calibration/v4.2.6/conservative-excerpt-retired-completion/model-execution.json",
  "docs/calibration/v4.2.8/correction-aware-retired-continuation/model-execution.json",
  "docs/calibration/v4.2.11/lean-structural-correction/model-execution.json",
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v385-transport.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v41-lean-production.mjs",
  "scripts/lib/v417-fresh-validation.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v419-schema-bounded-source.mjs",
  "scripts/lib/v42-compact-transport.mjs",
  "scripts/lib/v421-compact-fresh.mjs",
  "scripts/lib/v422-chronology-first.mjs",
  "scripts/lib/v423-chronology-fresh.mjs",
  "scripts/lib/v424-screened-chronology-fresh.mjs",
  "scripts/lib/v425-conservative-excerpt.mjs",
  "scripts/lib/v426-retired-completion.mjs",
  "scripts/lib/v429-long-context-partition.mjs",
  "scripts/lib/v4212-lean-integrated-primary.mjs",
  "scripts/build-v4212-lean-integrated-primary.mjs",
  "scripts/test-v4212-lean-integrated-primary.mjs",
  "scripts/preregister-v4212-lean-integrated-primary.mjs",
  "scripts/run-v4212-lean-integrated-primary.mjs",
  "scripts/analyze-v4212-lean-integrated-primary.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex"), sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
const manifest = {
  schemaVersion: "4.2.12-lean-integrated-primary-execution-manifest",
  protocolId: preparation.protocolId,
  status: "frozen-one-lean-integrated-primary-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  developmentOnly: true,
  AIOnly: true,
  model: preparation.model,
  inputs: preparation.inputs,
  validationInputs: preparation.validationInputs,
  source: preparation.source,
  outputs: preparation.outputs,
  sparseContext: preparation.sparseContext,
  isolation: { freshTemporaryCodexHome: true, freshSourceDirectory: true, fullTranscriptUnavailable: true, priorIntegratedOutputUnavailable: true, goldFixtureUnavailable: true, otherJudgmentsUnavailable: true, legacyUnavailable: true, scoresUnavailable: true },
  executionPolicy: { contexts: 1, attempts: 1, retries: 0, timeoutMs: preparation.policy.timeoutMs, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  authorization: { modelExecution: true, fullValidation: true, runtimeProjection: true, scoring: false, productionMutation: false },
  artifacts: { execution: executionPath, analysis: analysisPath },
  futureOutputPathsExcludedFromSourceHashes: [...Object.values(preparation.outputs), executionPath, analysisPath],
  sourceHashes
};
if (shouldWrite) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", debateNumber: "99", attempts: 1, retries: 0, timeoutMinutes: preparation.policy.timeoutMs / 60000, inputBytes: preparation.totals.copiedInputBytes, inputReductionFraction: preparation.totals.inputReductionFraction, meteredApiCostUsdMaximum: 0 }, null, 2));
