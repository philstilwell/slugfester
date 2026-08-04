#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert, sha256 } from "./lib/v36-decision-cards.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.6.3/schema-smoke-correction", shouldWrite = process.argv.includes("--write");
const outputPath = `${gateRoot}/gate-manifest.json`, frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : new Date().toISOString();
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be an ISO timestamp");
const read = (file) => readFile(path.resolve(root, file), "utf8");
if (shouldWrite) {
  try { await access(path.resolve(root, outputPath)); throw new Error(`${outputPath} already exists; preregistration is immutable`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const priorManifestPath = "docs/calibration/v3.6.2/schema-smoke/gate-manifest.json", priorAnalysisPath = "docs/calibration/v3.6.2/schema-smoke/smoke-analysis.json";
const priorManifestText = await read(priorManifestPath), priorAnalysisText = await read(priorAnalysisPath), prior = JSON.parse(priorAnalysisText);
assert(!prior.passed && prior.results.contextsCompleted === 4 && prior.results.validOutputCount === 2 && !prior.decision.retiredSemanticCardTestPreregistrationAuthorized, "v3.6.2 failure state invalid");
const v36 = "docs/calibration/v3.6/decision-card-development", packetRoot = "docs/calibration/v3.6.2/schema-smoke/packets";
const families = {
  target: { schema: `${gateRoot}/schemas/target-component-example.schema.json`, packet: `${packetRoot}/target.json` },
  diagnostic: { schema: `${v36}/schemas/diagnostic.schema.json`, packet: `${packetRoot}/diagnostic.json` },
  reframe: { schema: `${v36}/schemas/reframe.schema.json`, packet: `${packetRoot}/reframe.json` },
  burden: { schema: `${v36}/schemas/burden-conflict.schema.json`, packet: `${packetRoot}/burden.json` }
};
for (const definition of Object.values(families)) {
  definition.schemaSha256 = sha256(await read(definition.schema));
  definition.packetSha256 = sha256(await read(definition.packet));
}
const sources = [
  "docs/assessment-workflow-v3.6.3.md", "docs/reassessment-rubric-v3.6.3.md", `${gateRoot}/correction-manual.md`,
  ...Object.values(families).flatMap((item) => [item.schema, item.packet]), `${v36}/synthetic-fixtures.json`, "scripts/lib/v36-decision-cards.mjs",
  "scripts/test-v363-schema-smoke.mjs", "scripts/validate-v363-smoke-output.mjs", "scripts/preregister-v363-schema-smoke.mjs",
  "scripts/run-v363-schema-smoke.mjs", "scripts/analyze-v363-schema-smoke.mjs", "scripts/validate-v363-schema-smoke.mjs"
];
const sourceHashes = Object.fromEntries(await Promise.all([...new Set(sources)].map(async (file) => [file, sha256(await read(file))])));
const dryPath = `${gateRoot}/dry-fixture.json`, dryText = await read(dryPath), dry = JSON.parse(dryText);
assert(dry.passed && dry.regressionCasesRejected === 2 && dry.modelContextsExecuted === 0, "v3.6.3 dry fixture failed");
const outputs = Object.fromEntries(Object.keys(families).map((family) => [family, `${gateRoot}/outputs/${family}.json`]));
const manifest = {
  schemaVersion: "3.6.3-schema-smoke-manifest", gateId: "v3.6.3-schema-smoke-correction", status: "frozen-before-correction-smoke", frozenAt,
  workflowVersion: "Slugfester Schema-Smoke Correction Workflow v3.6.3", rubricVersion: "Slugfester Reassessment Rubric v3.6.3",
  calibrationOnly: true, purpose: "target-nullability-and-unique-substring-correction-smoke", independentModelAccuracyTest: false,
  model: { label: "5.6 Terra", slug: "gpt-5.6-terra", reasoningEffort: "high", authentication: "ChatGPT subscription", plannedContexts: 4 },
  executionPolicy: { isolatedEphemeralContexts: true, attemptsPerContext: 1, modelOutputRetriesMaximum: 0, preInferenceSchemaRejectionsMaximum: 0, APIKeysRemoved: true, meteredApiCostUsdMaximum: 0 },
  priorV362: { manifestPath: priorManifestPath, manifestSha256: sha256(priorManifestText), analysisPath: priorAnalysisPath, analysisSha256: sha256(priorAnalysisText), outcome: "failed-two-of-four-valid" },
  families, sourceHashes, dryFixture: { path: dryPath, sha256: sha256(dryText) },
  thresholds: { contextsCompleted: 4, validOutputCount: 4, preInferenceSchemaRejectionsMaximum: 0, modelOutputRetriesMaximum: 0, scoringFieldsMaximum: 0, meteredApiCostUsdMaximum: 0 },
  outputs, executionResultPath: `${gateRoot}/model-execution.json`, analysisPath: `${gateRoot}/smoke-analysis.json`,
  heldOutMaterialOpened: false, numericalScoringAuthorized: false, productionMutationAuthorized: false
};
const outputText = `${JSON.stringify(manifest, null, 2)}\n`;
if (shouldWrite) { await mkdir(path.dirname(path.resolve(root, outputPath)), { recursive: true }); await writeFile(path.resolve(root, outputPath), outputText); }
console.log(outputText);
