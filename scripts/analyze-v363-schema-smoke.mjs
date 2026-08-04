#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert, canonicalJson, sha256 } from "./lib/v36-decision-cards.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.6.3/schema-smoke-correction", shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${gateRoot}/gate-manifest.json`), manifest = JSON.parse(manifestText);
const executionText = await read(manifest.executionResultPath), execution = JSON.parse(executionText);
assert(execution.gateId === manifest.gateId, "execution identity mismatch");
const synthetic = JSON.parse(await read("docs/calibration/v3.6/decision-card-development/synthetic-fixtures.json"));
const fixture1 = synthetic.fixtures.find((item) => item.fixtureId === "target-diagnostic-reframe-positive");
const fixture4 = synthetic.fixtures.find((item) => item.fixtureId === "candidate-bound-burden-conflicts");
const expectedCards = { target: fixture1.cards.target, diagnostic: fixture1.cards.diagnostic, reframe: fixture1.cards.reframe, burden: fixture4.burdenPackets.find((item) => item.cardKey === "burdenAdjustment").card };
function summary(family, card) {
  if (!card) return {};
  if (family === "target") return { directTargetContact: card.directTarget.contact, c1Mode: card.components[0]?.contactMode, c2Mode: card.components[1]?.contactMode, exampleClassification: card.example.classification, scopeRelation: card.scope.relation, contraryClassification: card.contrary.classification };
  if (family === "diagnostic") return { defectType: card.defect.type, consequenceStated: card.consequence.cueText !== null, relationKind: card.consequence.relationKind };
  if (family === "reframe") return { malformedDemandExplained: card.malformedCueText !== null, replacementDemandStated: card.replacementCueText !== null, relationKind: card.relationKind };
  return { candidateSelection: card.candidateSelection, qualifyingCue: card.qualifyingCue };
}
const monitoring = [], outputHashes = {};
for (const family of Object.keys(manifest.families)) {
  let output = null, outputText = null;
  try { outputText = await read(manifest.outputs[family]); output = JSON.parse(outputText); } catch { output = null; }
  outputHashes[family] = outputText === null ? null : sha256(outputText);
  const expected = summary(family, expectedCards[family]), actual = summary(family, output);
  for (const [field, expectedValue] of Object.entries(expected)) monitoring.push({ family, field, matched: canonicalJson(actual[field]) === canonicalJson(expectedValue) });
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
const analysis = {
  schemaVersion: "3.6.3-schema-smoke-analysis", analyzedAt: execution.completedAt, status: passed ? "correction-smoke-pass" : "correction-smoke-fail",
  warning: "Expected synthetic cards were opened only after outputs closed. Derived semantic comparison is monitoring-only and does not contribute to the gate.",
  sources: { manifestSha256: sha256(manifestText), executionSha256: sha256(executionText), outputSha256: outputHashes },
  results: {
    contextsPlanned: execution.contextsPlanned, contextsCompleted: execution.contextsCompleted, validOutputCount: execution.validOutputCount,
    preInferenceSchemaRejections: execution.preInferenceSchemaRejections, modelOutputRetries: execution.totalRetries,
    sameRequestStreamRecoveries: execution.sameRequestStreamRecoveries, scoringFields: execution.scoringFieldCount, meteredApiCostUsd: execution.meteredApiCostUsd,
    semanticMonitoringAssertions: monitoring.length, semanticMonitoringMatches: semanticMatches, semanticMonitoringMatchRate: semanticMatches / monitoring.length
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
