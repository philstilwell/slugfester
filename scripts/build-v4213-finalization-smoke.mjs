#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";

const ROOT = "docs/calibration/v4.2.13/compact-finalization-smoke", shouldWrite = process.argv.includes("--write");
const [correctionAnalysis, integratedAnalysis, priorManifest] = await Promise.all([
  readFile("docs/calibration/v4.2.11/lean-structural-correction/analysis.json", "utf8").then(JSON.parse),
  readFile("docs/calibration/v4.2.12/lean-integrated-long-context-primary/analysis.json", "utf8").then(JSON.parse),
  readFile("docs/calibration/v3.8.8/reconstruction/post-debate-55-continuation/execution-manifest.json", "utf8").then(JSON.parse)
]);
assertV4(correctionAnalysis.authorization.baseRuntimeOptimization && integratedAnalysis.status === "lean-integrated-primary-failed", "v4.2.13 finalization optimization unavailable");
const context = priorManifest.contexts.find((item) => item.debateNumber === "103"); assertV4(context, "retired Debate 103 reconstruction context unavailable");
execFileSync(process.execPath, ["scripts/validate-v388-reconstruction-output.mjs", "docs/calibration/v3.8.8/reconstruction/outputs/debate-103.json", context.packet], { stdio: "pipe" });
const inputs = { workflow: "docs/assessment-workflow-v4.0.md", rubric: "docs/reassessment-rubric-v3.8.4.md", manual: `${ROOT}/manual.md`, packet: context.packet, schema: context.schema };
const inputBytes = (await Promise.all(Object.values(inputs).map((file) => stat(file).then((entry) => entry.size)))).reduce((sum, value) => sum + value, 0), output = `${ROOT}/output.json`;
if (shouldWrite) for (const future of [output, `${ROOT}/execution-manifest.json`, `${ROOT}/model-execution.json`, `${ROOT}/analysis.json`]) await access(future).then(() => { throw new Error(`${future} already exists`); }, () => true);
const preparation = { schemaVersion: "4.2.13-compact-finalization-preparation", protocolId: "v4.2.13-compact-finalization-smoke", status: shouldWrite ? "prepared-one-retired-finalization-smoke" : "preview", developmentOnly: true, AIOnly: true, debateNumber: "103", model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 }, inputs, validationInputs: { priorValidOutput: "docs/calibration/v3.8.8/reconstruction/outputs/debate-103.json", correctionAnalysis: "docs/calibration/v4.2.11/lean-structural-correction/analysis.json", integratedAnalysis: "docs/calibration/v4.2.12/lean-integrated-long-context-primary/analysis.json" }, sourceBoundary: { fullSourcePacketDelivered: true, packetMoves: 25, rawTranscriptDuplicated: false, rawEventsDuplicated: false, participantJudgmentAlreadyClosed: true }, output, policy: { oneAttempt: true, retries: 0, timeoutMs: 600000, runtimeThresholdMinutes: 4.5, scoresLockedFromPacket: true, scoresDerived: false, productionMutation: false }, totals: { inputBytes, modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, authorization: { executionManifest: false, modelExecution: false, threeDebateFinalizationGatePreparation: false, scoring: false, productionMutation: false } };
if (shouldWrite) { await mkdir(ROOT, { recursive: true }); await writeFile(`${ROOT}/preparation-manifest.json`, `${JSON.stringify(preparation, null, 2)}\n`); }
console.log(JSON.stringify({ status: preparation.status, debateNumber: "103", inputBytes, priorFixtureValidated: true, runtimeThresholdMinutes: 4.5, scoresDerived: 0, meteredApiCostUsdMaximum: 0 }, null, 2));
