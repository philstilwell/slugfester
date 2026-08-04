#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V36_RUBRIC, V36_WORKFLOW, assert, sha256 } from "./lib/v36-decision-cards.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.6/decision-card-development";
const outputPath = `${gateRoot}/gate-manifest.json`, shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : new Date().toISOString();
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be an ISO timestamp");
const read = (file) => readFile(path.resolve(root, file), "utf8");
if (shouldWrite) {
  try { await access(path.resolve(root, outputPath)); throw new Error(`${outputPath} already exists; preregistration is immutable`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}

const priorPath = "docs/calibration/v3.5/v34-six-review-replay/gate-manifest.json";
const priorText = await read(priorPath), prior = JSON.parse(priorText);
const decisionSources = [
  "docs/assessment-workflow-v3.6.md",
  "docs/reassessment-rubric-v3.6.md",
  `${gateRoot}/schemas/target-component-example.schema.json`,
  `${gateRoot}/schemas/diagnostic.schema.json`,
  `${gateRoot}/schemas/reframe.schema.json`,
  `${gateRoot}/schemas/burden-conflict.schema.json`,
  `${gateRoot}/synthetic-fixtures.json`,
  `${gateRoot}/retired-link-key.json`,
  "scripts/lib/v36-decision-cards.mjs",
  "scripts/build-v36-retired-decision-fixtures.mjs",
  "scripts/test-v36-decision-cards.mjs",
  "scripts/validate-v36-decision-card-development.mjs"
];
const sourceHashes = Object.fromEntries(await Promise.all(decisionSources.map(async (file) => [file, sha256(await read(file))])));
const debates = [];
for (const debate of prior.sample.debates) {
  const sources = {};
  for (const key of ["input", "passA", "passB"]) {
    const source = debate.fixtures[key];
    sources[key] = { path: source.path, sha256: sha256(await read(source.path)) };
  }
  sources.gold = { path: debate.gold.path, sha256: sha256(await read(debate.gold.path)), developmentFixtureOnly: true };
  debates.push({ debateId: debate.debateId, debateNumber: debate.debateNumber, role: debate.role, sources });
}
const manifest = {
  schemaVersion: "3.6-decision-card-development-manifest",
  gateId: "v3.6-decision-card-development",
  status: "frozen-before-fixture-build",
  frozenAt,
  workflowVersion: V36_WORKFLOW,
  rubricVersion: V36_RUBRIC,
  calibrationOnly: true,
  retiredGoldUsedForValidatorFixtures: true,
  independentModelAccuracyTest: false,
  modelContextsExecuted: 0,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
  heldOutMaterialOpened: false,
  numericalScoringAuthorized: false,
  productionMutationAuthorized: false,
  priorV35: { manifestPath: priorPath, manifestSha256: sha256(priorText), compilerPassed: true, semanticReady: false },
  sourceHashes,
  sample: { debateCount: debates.length, debates },
  thresholds: {
    closedSchemaCount: 4,
    validSyntheticCardCount: 11,
    rejectedInvalidMutationCount: 8,
    retiredFamilyCardCount: 39,
    retiredBurdenConflictCardCount: 2,
    retiredSemanticMatchRate: 1,
    discretionaryRepairsMaximum: 0,
    fallbackCasesMaximum: 0,
    modelContextsMaximum: 0,
    scoringFieldsMaximum: 0
  },
  outputs: {
    retiredFixtures: `${gateRoot}/retired-fixtures.json`,
    fixtureAnalysis: `${gateRoot}/fixture-analysis.json`
  }
};
const text = `${JSON.stringify(manifest, null, 2)}\n`;
if (shouldWrite) { await mkdir(path.dirname(path.resolve(root, outputPath)), { recursive: true }); await writeFile(path.resolve(root, outputPath), text); }
console.log(text);
