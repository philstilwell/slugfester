#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assert, canonicalJson, sha256 } from "./lib/v36-decision-cards.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.6.3/schema-smoke-correction", read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${gateRoot}/gate-manifest.json`), manifest = JSON.parse(manifestText);
assert(manifest.schemaVersion === "3.6.3-schema-smoke-manifest" && manifest.status === "frozen-before-correction-smoke", "manifest identity invalid");
assert(manifest.calibrationOnly && !manifest.independentModelAccuracyTest, "scope invalid");
assert(manifest.model.slug === "gpt-5.6-terra" && manifest.model.reasoningEffort === "high" && manifest.model.authentication === "ChatGPT subscription", "model/auth lock invalid");
assert(manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.modelOutputRetriesMaximum === 0 && manifest.executionPolicy.APIKeysRemoved, "execution policy invalid");
assert(!manifest.heldOutMaterialOpened && !manifest.numericalScoringAuthorized && !manifest.productionMutationAuthorized, "manifest over-authorizes work");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
assert(sha256(await read(manifest.priorV362.manifestPath)) === manifest.priorV362.manifestSha256, "v3.6.2 manifest hash mismatch");
assert(sha256(await read(manifest.priorV362.analysisPath)) === manifest.priorV362.analysisSha256, "v3.6.2 analysis hash mismatch");
const dryText = await read(manifest.dryFixture.path), dry = JSON.parse(dryText);
assert(sha256(dryText) === manifest.dryFixture.sha256 && dry.passed && dry.regressionCasesRejected === 2 && dry.modelContextsExecuted === 0, "dry fixture invalid");

const executionText = await read(manifest.executionResultPath), execution = JSON.parse(executionText);
assert(execution.schemaVersion === "3.6.3-schema-smoke-execution" && execution.gateId === manifest.gateId, "execution identity invalid");
assert(execution.authentication.includes("ChatGPT subscription") && execution.authentication.includes("API keys removed"), "execution auth invalid");
assert(execution.contextsPlanned === 4 && execution.totalAttempts === 4 && execution.totalRetries === 0 && execution.meteredApiCostUsd === 0, "execution counts/cost invalid");
assert(execution.results.length === 4 && new Set(execution.results.map((item) => item.family)).size === 4, "family coverage invalid");
for (const result of execution.results) {
  assert(result.attemptCount === 1 && result.retryCount === 0 && result.subscriptionAuthenticated && result.apiKeysRemoved && result.meteredApiCostUsd === 0, `${result.family}: execution invariant invalid`);
  if (result.status === "completed-valid") {
    const outputText = await read(manifest.outputs[result.family]);
    assert(result.outputWritten && result.deterministicValidationPassed && result.outputSha256 === sha256(outputText), `${result.family}: output provenance invalid`);
    execFileSync(process.execPath, ["scripts/validate-v363-smoke-output.mjs", manifest.outputs[result.family], manifest.families[result.family].packet, result.family], { cwd: root, stdio: "ignore" });
  }
}
assert(execution.contextsCompleted === execution.results.filter((item) => item.commandExitCode === 0).length, "contextsCompleted invalid");
assert(execution.validOutputCount === execution.results.filter((item) => item.status === "completed-valid").length, "validOutputCount invalid");
assert(execution.preInferenceSchemaRejections === execution.results.filter((item) => item.preInferenceSchemaRejected).length, "schema rejection count invalid");
assert(execution.scoringFieldCount === execution.results.reduce((sum, item) => sum + item.scoringFieldCount, 0), "scoring count invalid");

const analysisText = await read(manifest.analysisPath), analysis = JSON.parse(analysisText);
assert(analysis.schemaVersion === "3.6.3-schema-smoke-analysis" && analysis.sources.manifestSha256 === sha256(manifestText) && analysis.sources.executionSha256 === sha256(executionText), "analysis provenance invalid");
for (const [family, digest] of Object.entries(analysis.sources.outputSha256)) if (digest !== null) assert(digest === sha256(await read(manifest.outputs[family])), `${family}: output hash mismatch`);
const expectedGates = {
  contextsCompleted: execution.contextsCompleted === manifest.thresholds.contextsCompleted,
  validOutputCount: execution.validOutputCount === manifest.thresholds.validOutputCount,
  preInferenceSchemaRejections: execution.preInferenceSchemaRejections <= manifest.thresholds.preInferenceSchemaRejectionsMaximum,
  modelOutputRetries: execution.totalRetries <= manifest.thresholds.modelOutputRetriesMaximum,
  scoringFields: execution.scoringFieldCount <= manifest.thresholds.scoringFieldsMaximum,
  meteredApiCost: execution.meteredApiCostUsd <= manifest.thresholds.meteredApiCostUsdMaximum
};
assert(canonicalJson(analysis.gates) === canonicalJson(expectedGates), "analysis gates invalid");
assert(analysis.passed === Object.values(expectedGates).every(Boolean), "analysis pass formula invalid");
assert(analysis.results.semanticMonitoringAssertions === analysis.semanticMonitoring.length && analysis.results.semanticMonitoringMatches === analysis.semanticMonitoring.filter((item) => item.matched).length, "monitoring counts invalid");
assert(analysis.decision.retiredSemanticCardTestPreregistrationAuthorized === analysis.passed, "next-step authorization invalid");
assert(!analysis.decision.modelBatchAuthorized && !analysis.decision.heldOutAccessAuthorized && !analysis.decision.numericalScoringAuthorized && !analysis.decision.assessmentProseAuthorized && !analysis.decision.productionMutationAuthorized, "analysis over-authorizes work");
console.log(JSON.stringify({ status: "passed", artifactIntegrityPassed: true, correctionSmokePassed: analysis.passed, retiredSemanticCardTestPreregistrationAuthorized: analysis.decision.retiredSemanticCardTestPreregistrationAuthorized, modelBatchAuthorized: false, results: analysis.results, analysisSha256: sha256(analysisText) }, null, 2));
