#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { assert, canonicalJson, compareSemanticBatches, loadV37Sources, semanticAssertions, V37_FAMILIES, V37_GATE_ROOT } from "./lib/v37-retired-semantic.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${V37_GATE_ROOT}/gate-manifest.json`), manifest = JSON.parse(manifestText);
const executionText = await read(manifest.executionResultPath), execution = JSON.parse(executionText);
assert(execution.gateId === manifest.gateId && execution.results.length === 8, "execution identity or closure invalid");
const { fixtures } = await loadV37Sources(root), modelResults = {}, actualMaps = {}, outputHashes = {};
for (const modelKey of manifest.modelKeys) {
  const comparisons = []; actualMaps[modelKey] = new Map(); outputHashes[modelKey] = {};
  for (const family of V37_FAMILIES) {
    const packet = JSON.parse(await read(manifest.families[family].packet)), outputPath = manifest.outputs[family][modelKey];
    try {
      const outputText = await read(outputPath), output = JSON.parse(outputText); outputHashes[modelKey][family] = sha256(outputText);
      const familyComparisons = compareSemanticBatches(family, output.cards, packet.cases, fixtures); comparisons.push(...familyComparisons);
      for (let index = 0; index < packet.cases.length; index += 1) for (const assertion of semanticAssertions(family, output.cards[index])) actualMaps[modelKey].set(`${family}::${packet.cases[index].caseId}::${assertion.fieldPath}`, assertion.value);
    } catch { outputHashes[modelKey][family] = null; }
  }
  const target = comparisons.filter((item) => item.family === "target"), nonTarget = comparisons.filter((item) => item.family !== "target"), burden = comparisons.filter((item) => item.family === "burden");
  modelResults[modelKey] = {
    model: manifest.models[modelKey].label, assertions: comparisons.length, matches: comparisons.filter((item) => item.matched).length,
    matchRate: comparisons.length ? comparisons.filter((item) => item.matched).length / comparisons.length : 0,
    targetAssertions: target.length, targetMatches: target.filter((item) => item.matched).length,
    nonTargetAssertions: nonTarget.length, nonTargetMatches: nonTarget.filter((item) => item.matched).length,
    burdenAssertions: burden.length, burdenMatches: burden.filter((item) => item.matched).length,
    familyMatches: Object.fromEntries(V37_FAMILIES.map((family) => {
      const familyItems = comparisons.filter((item) => item.family === family);
      return [family, { assertions: familyItems.length, matches: familyItems.filter((item) => item.matched).length }];
    })),
    mismatches: comparisons.filter((item) => !item.matched)
  };
}
const keys = new Set([...actualMaps.terra.keys(), ...actualMaps.sol.keys()]), crossModelComparisons = [...keys].sort().map((key) => ({
  key, terra: actualMaps.terra.get(key), sol: actualMaps.sol.get(key), agreed: canonicalJson(actualMaps.terra.get(key)) === canonicalJson(actualMaps.sol.get(key))
}));
const crossModelAgreement = crossModelComparisons.filter((item) => item.agreed).length, threshold = manifest.thresholds;
const structuralGates = {
  contextsCompleted: execution.contextsCompleted === threshold.completedContexts,
  validOutputContexts: execution.validOutputContexts === threshold.validOutputContexts,
  preInferenceSchemaRejections: execution.preInferenceSchemaRejections <= manifest.executionPolicy.preInferenceSchemaRejectionsMaximum,
  modelOutputRetries: execution.totalRetries <= manifest.executionPolicy.modelOutputRetriesMaximum,
  sameRequestStreamRecoveries: execution.sameRequestStreamRecoveries <= manifest.executionPolicy.sameRequestStreamRecoveriesMaximum,
  scoringFields: execution.scoringFieldCount <= threshold.scoringFieldsMaximum,
  meteredApiCost: execution.meteredApiCostUsd <= manifest.executionPolicy.meteredApiCostUsdMaximum,
  transcriptionCost: execution.transcriptionCostUsd <= manifest.executionPolicy.transcriptionCostUsdMaximum
};
const modelGates = Object.fromEntries(manifest.modelKeys.map((modelKey) => [modelKey, {
  assertionCoverage: modelResults[modelKey].assertions === manifest.sample.semanticAssertionCountPerModel,
  overallMatches: modelResults[modelKey].matches >= threshold.semanticMatchesOverallPerModelMinimum,
  targetMatches: modelResults[modelKey].targetMatches >= threshold.targetMatchesPerModelMinimum,
  nonTargetMatches: modelResults[modelKey].nonTargetMatches >= threshold.nonTargetMatchesPerModelMinimum,
  burdenMatches: modelResults[modelKey].burdenMatches >= threshold.burdenMatchesPerModelMinimum
}]));
const comparisonGates = {
  crossModelAssertionCoverage: crossModelComparisons.length === manifest.sample.semanticAssertionCountPerModel,
  crossModelAgreement: crossModelAgreement >= threshold.crossModelAgreementMinimum,
  terraMatchDeficit: modelResults.terra.matches >= modelResults.sol.matches - threshold.terraMaximumMatchDeficitFromSol
};
const structuralPassed = Object.values(structuralGates).every(Boolean), terraPassed = Object.values(modelGates.terra).every(Boolean), solPassed = Object.values(modelGates.sol).every(Boolean);
const passed = structuralPassed && terraPassed && solPassed && Object.values(comparisonGates).every(Boolean);
const analysis = {
  schemaVersion: "3.7-retired-semantic-analysis", analyzedAt: execution.completedAt, status: passed ? "retired-semantic-test-pass" : "retired-semantic-test-fail",
  warning: "Expected cards are retired gold-derived development fixtures, not infallible ground truth. They were opened only after all eight isolated model contexts closed.",
  sources: { manifestSha256: sha256(manifestText), executionSha256: sha256(executionText), outputSha256: outputHashes },
  goldOpenedAfterAllOutputsClosed: true, evidenceBoundaryWordingScored: false, rationaleWordingScored: false,
  results: { modelResults, crossModel: { assertions: crossModelComparisons.length, agreements: crossModelAgreement, agreementRate: crossModelComparisons.length ? crossModelAgreement / crossModelComparisons.length : 0, disagreements: crossModelComparisons.filter((item) => !item.agreed) } },
  gates: { structural: structuralGates, models: modelGates, comparison: comparisonGates }, passed,
  decision: {
    largerRetiredSemanticReplicationPreregistrationAuthorized: passed,
    terraRoutineCardExtractionCandidate: passed,
    solOnlyRetiredReplicationPreregistrationAuthorized: structuralPassed && solPassed && !terraPassed,
    workflowCorrectionRequired: !structuralPassed || !solPassed || !comparisonGates.crossModelAgreement,
    modelBatchAuthorized: false, heldOutAccessAuthorized: false, numericalScoringAuthorized: false, assessmentProseAuthorized: false, productionMutationAuthorized: false
  }
};
const outputText = `${JSON.stringify(analysis, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, manifest.analysisPath), outputText);
console.log(outputText);
