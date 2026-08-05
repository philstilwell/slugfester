#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V4217_ROOT } from "./lib/v4217-finalization-gate.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO timestamp");
const manifestPath = `${V4217_ROOT}/execution-manifest.json`, executionPath = `${V4217_ROOT}/model-execution.json`, analysisPath = `${V4217_ROOT}/analysis.json`;
if (shouldWrite) for (const file of [manifestPath, executionPath, analysisPath]) await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);
const preparation = JSON.parse(await readFile(`${V4217_ROOT}/preparation-manifest.json`, "utf8"));
assertV4(preparation.status === "prepared-three-retired-no-truncation-contexts", "v4.2.17 preparation unavailable");
const sourceFiles = ["docs/assessment-workflow-v4.2.17.md", `${V4217_ROOT}/preparation-manifest.json`, ...preparation.contexts.flatMap((context) => [...Object.values(context.inputs), context.validationGold]), "docs/calibration/v4.2.16/three-debate-finalization-gate/analysis.json", "scripts/lib/v385-transport.mjs", "scripts/lib/v388-reconstruction.mjs", "scripts/lib/v41-lean-production.mjs", "scripts/lib/v4217-finalization-gate.mjs", "scripts/validate-v388-reconstruction-output.mjs", "scripts/build-v4217-finalization-gate.mjs", "scripts/test-v4217-finalization-gate.mjs", "scripts/preregister-v4217-finalization-gate.mjs", "scripts/run-v4217-finalization-gate.mjs", "scripts/analyze-v4217-finalization-gate.mjs", "src/data/references.js"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex"), sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
const manifest = { schemaVersion: "4.2.17-no-truncation-finalization-execution-manifest", protocolId: preparation.protocolId, status: "frozen-three-retired-no-truncation-contexts-authorized", frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), developmentOnly: true, AIOnly: true, model: preparation.model, contexts: preparation.contexts, sourceBoundary: preparation.sourceBoundary, executionPolicy: { contexts: 3, attemptsPerDebate: 1, retries: 0, correctionContexts: 0, deterministicProseMutation: false, tagsSchemaClosedEmpty: true, timeoutMsPerDebate: preparation.policy.timeoutMsPerDebate, maximumMinutesPerDebate: preparation.policy.maximumMinutesPerDebate, maximumMeanMinutes: preparation.policy.maximumMeanMinutes, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 }, isolation: { freshTemporaryCodexHomePerDebate: true, freshSourceDirectoryPerDebate: true, otherGateDebatesUnavailable: true, priorReconstructionsUnavailable: true, validationGoldUnavailable: true, legacyAssessmentsUnavailable: true, productionObjectsUnavailable: true }, authorization: { modelExecution: true, deterministicValidation: true, analysis: true, correctionModelExecution: false, proseMutation: false, scoring: false, productionMutation: false }, artifacts: { execution: executionPath, analysis: analysisPath }, futureOutputPathsExcludedFromSourceHashes: [...preparation.contexts.flatMap((context) => [context.rawOutput, context.validatedOutput]), executionPath, analysisPath], sourceHashes };
if (shouldWrite) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", debates: preparation.debates, contexts: 3, attempts: 3, retries: 0, correctionContexts: 0, proseMutations: 0, maximumMinutesPerDebate: preparation.policy.maximumMinutesPerDebate, maximumMeanMinutes: preparation.policy.maximumMeanMinutes, meteredApiCostUsdMaximum: 0 }, null, 2));
