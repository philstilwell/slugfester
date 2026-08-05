#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V4217_ROOT } from "./lib/v4217-finalization-gate.mjs";

const shouldWrite = process.argv.includes("--write");
const [manifest, execution, baseline] = await Promise.all([readFile(`${V4217_ROOT}/execution-manifest.json`, "utf8").then(JSON.parse), readFile(`${V4217_ROOT}/model-execution.json`, "utf8").then(JSON.parse), readFile("docs/calibration/v4.2.11/lean-structural-correction/analysis.json", "utf8").then(JSON.parse)]);
assertV4(execution.authorization.analysis && execution.proseMutations === 0, "v4.2.17 analysis unauthorized");
const debates = [];
for (const context of manifest.contexts) {
  const result = execution.results.find((item) => item.debateNumber === context.debateNumber);
  let validation = null;
  if (result.accepted) validation = JSON.parse(execFileSync(process.execPath, ["scripts/validate-v388-reconstruction-output.mjs", context.validatedOutput, context.inputs.packet], { encoding: "utf8" }));
  debates.push({ debateNumber: context.debateNumber, accepted: result.accepted, elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)), transportClassification: result.transportClassification, proseMutations: result.proseMutations ?? 0, validation, failure: result.accepted ? null : { status: result.status, message: result.validationMessage } });
}
const valid = debates.every((debate) => debate.accepted), meanMinutes = execution.meanElapsedMs / 60000, maximumMinutes = Math.max(...execution.results.map((result) => result.elapsedMs / 60000)), runtimePassed = valid && maximumMinutes <= manifest.executionPolicy.maximumMinutesPerDebate && meanMinutes <= manifest.executionPolicy.maximumMeanMinutes;
const centralReplacementHours = meanMinutes * 195 / 60, conservativeReplacementHours = manifest.executionPolicy.maximumMinutesPerDebate * 195 / 60;
const projection = valid ? { observedMeanFinalizationMinutes: Number(meanMinutes.toFixed(2)), observedMaximumFinalizationMinutes: Number(maximumMinutes.toFixed(2)), centralFinalizationMinutes: Number(meanMinutes.toFixed(2)), conservativeFinalizationMinutes: manifest.executionPolicy.maximumMinutesPerDebate, central: { priorHours: baseline.projection.central.totalHours, replacementFinalizationHours: Number(centralReplacementHours.toFixed(2)), totalHours: Number((baseline.projection.central.totalHours - 13.81 + centralReplacementHours).toFixed(2)) }, conservative: { priorHours: baseline.projection.conservative.totalHours, replacementFinalizationHours: Number(conservativeReplacementHours.toFixed(2)), totalHours: Number((baseline.projection.conservative.totalHours - 16.25 + conservativeReplacementHours).toFixed(2)) } } : null;
const passed = runtimePassed && projection.central.totalHours <= 52 && projection.conservative.totalHours <= 60;
const analysis = { schemaVersion: "4.2.17-no-truncation-finalization-gate-analysis", protocolId: manifest.protocolId, status: !valid ? "no-truncation-finalization-gate-failed-validation" : passed ? "no-truncation-finalization-gate-passed-fresh-judgment-gate-preparation-authorized" : "no-truncation-finalization-gate-failed-runtime", developmentOnly: true, debates, runtimePassed, projection, totals: { debates: 3, modelContexts: 3, attempts: 3, retries: 0, correctionContexts: 0, validContexts: debates.filter((debate) => debate.accepted).length, proseMutations: 0, lockedHistoricalScoresCopied: valid, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, authorization: { newDisjointFreshJudgmentGatePreparation: passed, newDisjointFreshJudgmentGateExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false } };
if (shouldWrite) await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, validContexts: analysis.totals.validContexts, observedMeanMinutes: projection?.observedMeanFinalizationMinutes ?? null, observedMaximumMinutes: projection?.observedMaximumFinalizationMinutes ?? null, projected195CentralHours: projection?.central.totalHours ?? null, projected195ConservativeHours: projection?.conservative.totalHours ?? null, freshJudgmentGatePreparationAuthorized: passed, proseMutations: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
