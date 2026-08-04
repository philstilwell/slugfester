#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert, canonicalJson, sha256 } from "./lib/v36-decision-cards.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.6.2/schema-smoke", shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${gateRoot}/gate-manifest.json`), manifest = JSON.parse(manifestText);
const executionText = await read(manifest.executionResultPath), execution = JSON.parse(executionText);
assert(execution.gateId === manifest.gateId, "execution gate identity mismatch");

const synthetic = JSON.parse(await read("docs/calibration/v3.6/decision-card-development/synthetic-fixtures.json"));
const fixture1 = synthetic.fixtures.find((item) => item.fixtureId === "target-diagnostic-reframe-positive");
const fixture4 = synthetic.fixtures.find((item) => item.fixtureId === "candidate-bound-burden-conflicts");
const expected = {
  target: fixture1.cards.target,
  diagnostic: fixture1.cards.diagnostic,
  reframe: fixture1.cards.reframe,
  burden: fixture4.burdenPackets.find((item) => item.cardKey === "burdenAdjustment").card
};
const monitorPaths = {
  target: ["directTarget.contact", "components.0.contactMode", "components.1.contactMode", "example.classification", "scope.relation", "contrary.classification"],
  diagnostic: ["defect.type", "consequence.cueText", "consequence.relationKind"],
  reframe: ["malformedCueText", "replacementCueText", "relationKind"],
  burden: ["candidateSelection", "qualifyingCue"]
};
function get(value, fieldPath) {
  return fieldPath.split(".").reduce((current, key) => current?.[key], value);
}
const monitoring = [];
for (const family of Object.keys(manifest.families)) {
  const result = execution.results.find((item) => item.family === family);
  let output = null;
  if (result?.outputWritten) {
    try { output = JSON.parse(await read(manifest.outputs[family])); } catch { output = null; }
  }
  for (const fieldPath of monitorPaths[family]) {
    const expectedValue = get(expected[family], fieldPath), actualValue = get(output, fieldPath);
    monitoring.push({ family, fieldPath, matched: canonicalJson(actualValue) === canonicalJson(expectedValue) });
  }
}
const gates = {
  contextsCompleted: execution.contextsCompleted === manifest.thresholds.contextsCompleted,
  validOutputCount: execution.validOutputCount === manifest.thresholds.validOutputCount,
  preInferenceSchemaRejections: execution.preInferenceSchemaRejections <= manifest.thresholds.preInferenceSchemaRejectionsMaximum,
  modelOutputRetries: execution.totalRetries <= manifest.thresholds.modelOutputRetriesMaximum,
  scoringFields: execution.scoringFieldCount <= manifest.thresholds.scoringFieldsMaximum,
  meteredApiCost: execution.meteredApiCostUsd <= manifest.thresholds.meteredApiCostUsdMaximum
};
const passed = Object.values(gates).every(Boolean), semanticMatches = monitoring.filter((item) => item.matched).length;
const outputHashes = {};
for (const [family, outputPath] of Object.entries(manifest.outputs)) {
  try { outputHashes[family] = sha256(await read(outputPath)); } catch { outputHashes[family] = null; }
}
const analysis = {
  schemaVersion: "3.6.2-schema-smoke-analysis", analyzedAt: execution.completedAt, status: passed ? "schema-smoke-pass" : "schema-smoke-fail",
  warning: "Synthetic expected cards were opened only after all remote outputs closed. Their semantic comparison is monitoring only and does not contribute to the smoke gate.",
  sources: { manifestSha256: sha256(manifestText), executionSha256: sha256(executionText), outputSha256: outputHashes },
  results: {
    contextsPlanned: execution.contextsPlanned, contextsCompleted: execution.contextsCompleted, validOutputCount: execution.validOutputCount,
    preInferenceSchemaRejections: execution.preInferenceSchemaRejections, modelOutputRetries: execution.totalRetries,
    sameRequestStreamRecoveries: execution.sameRequestStreamRecoveries, scoringFields: execution.scoringFieldCount,
    meteredApiCostUsd: execution.meteredApiCostUsd, semanticMonitoringAssertions: monitoring.length,
    semanticMonitoringMatches: semanticMatches, semanticMonitoringMatchRate: monitoring.length ? semanticMatches / monitoring.length : 0
  },
  gates, passed, semanticMonitoring: monitoring,
  decision: {
    retiredSemanticCardTestPreregistrationAuthorized: passed, modelBatchAuthorized: false, heldOutAccessAuthorized: false,
    numericalScoringAuthorized: false, assessmentProseAuthorized: false, productionMutationAuthorized: false
  }
};
const outputText = `${JSON.stringify(analysis, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, manifest.analysisPath), outputText);
console.log(outputText);
