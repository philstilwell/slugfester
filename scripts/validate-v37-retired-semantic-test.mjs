#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assert, canonicalJson, sha256 } from "./lib/v36-decision-cards.mjs";
import { V37_FAMILIES, V37_GATE_ROOT } from "./lib/v37-retired-semantic.mjs";

const root = process.cwd(), read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${V37_GATE_ROOT}/gate-manifest.json`), manifest = JSON.parse(manifestText);
assert(manifest.schemaVersion === "3.7-retired-semantic-test-manifest" && manifest.status === "frozen-before-model-execution", "manifest identity invalid");
assert(manifest.calibrationOnly && manifest.retiredGoldComparison && !manifest.heldOutMaterialOpened && !manifest.numericalScoringAuthorized && !manifest.assessmentProseAuthorized && !manifest.productionMutationAuthorized, "scope invalid");
assert(manifest.executionPolicy.plannedContexts === 8 && manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.modelOutputRetriesMaximum === 0 && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.authentication === "ChatGPT subscription", "execution policy invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
assert(sha256(await read(manifest.priorV363.manifestPath)) === manifest.priorV363.manifestSha256 && sha256(await read(manifest.priorV363.analysisPath)) === manifest.priorV363.analysisSha256, "v3.6.3 provenance invalid");
const dryText = await read(manifest.dryFixture.path), dry = JSON.parse(dryText);
assert(sha256(dryText) === manifest.dryFixture.sha256 && dry.passed && dry.cardCount === 11 && dry.semanticAssertionCount === 45, "dry fixture invalid");
const executionText = await read(manifest.executionResultPath), execution = JSON.parse(executionText);
assert(execution.schemaVersion === "3.7-retired-semantic-model-execution" && execution.gateId === manifest.gateId, "execution identity invalid");
assert(execution.contextsPlanned === 8 && execution.totalAttempts === 8 && execution.totalRetries === 0 && execution.meteredApiCostUsd === 0 && execution.transcriptionCostUsd === 0, "execution counts/cost invalid");
assert(execution.authentication.includes("ChatGPT subscription") && execution.authentication.includes("API keys removed"), "authentication provenance invalid");
assert(execution.results.length === 8 && new Set(execution.results.map((item) => `${item.family}::${item.modelKey}`)).size === 8, "execution coverage invalid");
for (const result of execution.results) {
  assert(result.attemptCount === 1 && result.retryCount === 0 && result.subscriptionAuthenticated && result.apiKeysRemoved && result.meteredApiCostUsd === 0, `${result.family}.${result.modelKey}: invariant invalid`);
  if (result.status === "completed-valid") {
    const outputText = await read(manifest.outputs[result.family][result.modelKey]);
    assert(result.outputWritten && result.deterministicValidationPassed && result.outputSha256 === sha256(outputText), `${result.family}.${result.modelKey}: output provenance invalid`);
    execFileSync(process.execPath, ["scripts/validate-v37-family-output.mjs", manifest.outputs[result.family][result.modelKey], manifest.families[result.family].packet, manifest.families[result.family].schema, result.family], { cwd: root, stdio: "ignore" });
  }
}
assert(execution.contextsCompleted === execution.results.filter((item) => item.commandExitCode === 0).length && execution.validOutputContexts === execution.results.filter((item) => item.status === "completed-valid").length, "execution result counts invalid");
assert(execution.preInferenceSchemaRejections === execution.results.filter((item) => item.preInferenceSchemaRejected).length && execution.scoringFieldCount === execution.results.reduce((sum, item) => sum + item.scoringFieldCount, 0), "rejection or scoring count invalid");
const analysisText = await read(manifest.analysisPath), analysis = JSON.parse(analysisText), threshold = manifest.thresholds;
assert(analysis.schemaVersion === "3.7-retired-semantic-analysis" && analysis.sources.manifestSha256 === sha256(manifestText) && analysis.sources.executionSha256 === sha256(executionText), "analysis provenance invalid");
for (const [modelKey, families] of Object.entries(analysis.sources.outputSha256)) for (const [family, digest] of Object.entries(families)) if (digest !== null) assert(digest === sha256(await read(manifest.outputs[family][modelKey])), `${family}.${modelKey}: analysis output hash invalid`);
const expectedStructural = {
  contextsCompleted: execution.contextsCompleted === threshold.completedContexts, validOutputContexts: execution.validOutputContexts === threshold.validOutputContexts,
  preInferenceSchemaRejections: execution.preInferenceSchemaRejections <= manifest.executionPolicy.preInferenceSchemaRejectionsMaximum,
  modelOutputRetries: execution.totalRetries <= manifest.executionPolicy.modelOutputRetriesMaximum,
  sameRequestStreamRecoveries: execution.sameRequestStreamRecoveries <= manifest.executionPolicy.sameRequestStreamRecoveriesMaximum,
  scoringFields: execution.scoringFieldCount <= threshold.scoringFieldsMaximum, meteredApiCost: execution.meteredApiCostUsd <= manifest.executionPolicy.meteredApiCostUsdMaximum,
  transcriptionCost: execution.transcriptionCostUsd <= manifest.executionPolicy.transcriptionCostUsdMaximum
};
assert(canonicalJson(analysis.gates.structural) === canonicalJson(expectedStructural), "structural gates invalid");
for (const modelKey of manifest.modelKeys) {
  const result = analysis.results.modelResults[modelKey], expected = {
    assertionCoverage: result.assertions === manifest.sample.semanticAssertionCountPerModel,
    overallMatches: result.matches >= threshold.semanticMatchesOverallPerModelMinimum,
    targetMatches: result.targetMatches >= threshold.targetMatchesPerModelMinimum,
    nonTargetMatches: result.nonTargetMatches >= threshold.nonTargetMatchesPerModelMinimum,
    burdenMatches: result.burdenMatches >= threshold.burdenMatchesPerModelMinimum
  };
  assert(canonicalJson(analysis.gates.models[modelKey]) === canonicalJson(expected), `${modelKey}: model gates invalid`);
}
const expectedComparison = {
  crossModelAssertionCoverage: analysis.results.crossModel.assertions === manifest.sample.semanticAssertionCountPerModel,
  crossModelAgreement: analysis.results.crossModel.agreements >= threshold.crossModelAgreementMinimum,
  terraMatchDeficit: analysis.results.modelResults.terra.matches >= analysis.results.modelResults.sol.matches - threshold.terraMaximumMatchDeficitFromSol
};
assert(canonicalJson(analysis.gates.comparison) === canonicalJson(expectedComparison), "comparison gates invalid");
const expectedPassed = Object.values(expectedStructural).every(Boolean) && manifest.modelKeys.every((key) => Object.values(analysis.gates.models[key]).every(Boolean)) && Object.values(expectedComparison).every(Boolean);
assert(analysis.passed === expectedPassed && analysis.decision.largerRetiredSemanticReplicationPreregistrationAuthorized === expectedPassed && analysis.decision.terraRoutineCardExtractionCandidate === expectedPassed, "pass or authorization formula invalid");
assert(!analysis.decision.modelBatchAuthorized && !analysis.decision.heldOutAccessAuthorized && !analysis.decision.numericalScoringAuthorized && !analysis.decision.assessmentProseAuthorized && !analysis.decision.productionMutationAuthorized, "analysis over-authorizes work");
console.log(JSON.stringify({ status: "passed", artifactIntegrityPassed: true, retiredSemanticTestPassed: analysis.passed, results: analysis.results, decision: analysis.decision, analysisSha256: sha256(analysisText) }, null, 2));
