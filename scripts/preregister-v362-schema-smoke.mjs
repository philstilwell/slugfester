#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert, sha256 } from "./lib/v36-decision-cards.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.6.2/schema-smoke", shouldWrite = process.argv.includes("--write");
const outputPath = `${gateRoot}/gate-manifest.json`, frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : new Date().toISOString();
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be an ISO timestamp");
const read = (file) => readFile(path.resolve(root, file), "utf8");
if (shouldWrite) {
  try { await access(path.resolve(root, outputPath)); throw new Error(`${outputPath} already exists; preregistration is immutable`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const priorPath = "docs/calibration/v3.6.1/decision-card-development/gate-manifest.json", priorAnalysisPath = "docs/calibration/v3.6.1/decision-card-development/fixture-analysis.json";
const priorText = await read(priorPath), priorAnalysisText = await read(priorAnalysisPath), priorAnalysis = JSON.parse(priorAnalysisText);
assert(priorAnalysis.passed && priorAnalysis.decision.remoteSchemaSmokeTestPreregistrationAuthorized, "v3.6.1 did not authorize smoke preregistration");
const families = {
  target: { schema: "docs/calibration/v3.6/decision-card-development/schemas/target-component-example.schema.json", packet: `${gateRoot}/packets/target.json` },
  diagnostic: { schema: "docs/calibration/v3.6/decision-card-development/schemas/diagnostic.schema.json", packet: `${gateRoot}/packets/diagnostic.json` },
  reframe: { schema: "docs/calibration/v3.6/decision-card-development/schemas/reframe.schema.json", packet: `${gateRoot}/packets/reframe.json` },
  burden: { schema: "docs/calibration/v3.6/decision-card-development/schemas/burden-conflict.schema.json", packet: `${gateRoot}/packets/burden.json` }
};
for (const definition of Object.values(families)) {
  definition.schemaSha256 = sha256(await read(definition.schema));
  definition.packetSha256 = sha256(await read(definition.packet));
}
const decisionSources = [
  "docs/assessment-workflow-v3.6.2.md", "docs/reassessment-rubric-v3.6.2.md", `${gateRoot}/smoke-manual.md`,
  ...Object.values(families).flatMap((item) => [item.schema, item.packet]),
  "docs/calibration/v3.6/decision-card-development/synthetic-fixtures.json", "scripts/lib/v36-decision-cards.mjs",
  "scripts/test-v362-schema-smoke.mjs", "scripts/validate-v362-smoke-output.mjs", "scripts/preregister-v362-schema-smoke.mjs",
  "scripts/run-v362-schema-smoke.mjs", "scripts/analyze-v362-schema-smoke.mjs", "scripts/validate-v362-schema-smoke.mjs"
];
const sourceHashes = Object.fromEntries(await Promise.all([...new Set(decisionSources)].map(async (file) => [file, sha256(await read(file))])));
const dryPath = `${gateRoot}/dry-fixture.json`, dryText = await read(dryPath), dry = JSON.parse(dryText);
assert(dry.passed && dry.modelContextsExecuted === 0 && dry.cards.length === 4, "local dry fixture did not pass");
const outputs = Object.fromEntries(Object.keys(families).map((family) => [family, `${gateRoot}/outputs/${family}.json`]));
const manifest = {
  schemaVersion: "3.6.2-schema-smoke-manifest", gateId: "v3.6.2-schema-smoke", status: "frozen-before-remote-smoke", frozenAt,
  workflowVersion: "Slugfester Decision-Card Schema Smoke Workflow v3.6.2", rubricVersion: "Slugfester Reassessment Rubric v3.6.2",
  calibrationOnly: true, purpose: "transport-schema-and-deterministic-validator-compatibility", independentModelAccuracyTest: false,
  model: { label: "5.6 Terra", slug: "gpt-5.6-terra", reasoningEffort: "high", authentication: "ChatGPT subscription", plannedContexts: 4 },
  executionPolicy: { isolatedEphemeralContexts: true, attemptsPerContext: 1, modelOutputRetriesMaximum: 0, preInferenceSchemaRejectionsMaximum: 0, APIKeysRemoved: true, meteredApiCostUsdMaximum: 0 },
  priorV361: { manifestPath: priorPath, manifestSha256: sha256(priorText), analysisPath: priorAnalysisPath, analysisSha256: sha256(priorAnalysisText), fixtureGatePassed: true },
  families, sourceHashes, dryFixture: { path: dryPath, sha256: sha256(dryText) },
  thresholds: { contextsCompleted: 4, validOutputCount: 4, preInferenceSchemaRejectionsMaximum: 0, modelOutputRetriesMaximum: 0, scoringFieldsMaximum: 0, meteredApiCostUsdMaximum: 0 },
  outputs, executionResultPath: `${gateRoot}/model-execution.json`, analysisPath: `${gateRoot}/smoke-analysis.json`,
  heldOutMaterialOpened: false, numericalScoringAuthorized: false, productionMutationAuthorized: false
};
const outputText = `${JSON.stringify(manifest, null, 2)}\n`;
if (shouldWrite) { await mkdir(path.dirname(path.resolve(root, outputPath)), { recursive: true }); await writeFile(path.resolve(root, outputPath), outputText); }
console.log(outputText);
