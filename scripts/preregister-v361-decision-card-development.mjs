#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert, sha256 } from "./lib/v36-decision-cards.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.6.1/decision-card-development", shouldWrite = process.argv.includes("--write");
const outputPath = `${gateRoot}/gate-manifest.json`, frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : new Date().toISOString();
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be an ISO timestamp");
const read = (file) => readFile(path.resolve(root, file), "utf8");
if (shouldWrite) {
  try { await access(path.resolve(root, outputPath)); throw new Error(`${outputPath} already exists; preregistration is immutable`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const priorRoot = "docs/calibration/v3.6/decision-card-development", priorManifestPath = `${priorRoot}/gate-manifest.json`;
const priorManifestText = await read(priorManifestPath), prior = JSON.parse(priorManifestText);
const decisionSources = [
  "docs/assessment-workflow-v3.6.1.md", "docs/reassessment-rubric-v3.6.1.md",
  `${priorRoot}/schemas/target-component-example.schema.json`, `${priorRoot}/schemas/diagnostic.schema.json`, `${priorRoot}/schemas/reframe.schema.json`, `${priorRoot}/schemas/burden-conflict.schema.json`,
  `${priorRoot}/synthetic-fixtures.json`, `${priorRoot}/retired-link-key.json`, `${priorRoot}/retired-fixtures.json`, `${priorRoot}/gate-failure.json`,
  "scripts/lib/v36-decision-cards.mjs", "scripts/lib/v361-evidence-context.mjs", "scripts/test-v361-evidence-context.mjs",
  "scripts/normalize-v361-retired-decision-fixtures.mjs", "scripts/test-v361-decision-cards.mjs", "scripts/validate-v361-decision-card-development.mjs"
];
const sourceHashes = Object.fromEntries(await Promise.all(decisionSources.map(async (file) => [file, sha256(await read(file))])));
const debates = [];
for (const debate of prior.sample.debates) {
  const sources = {};
  for (const [key, source] of Object.entries(debate.sources)) sources[key] = { path: source.path, sha256: sha256(await read(source.path)), ...(key === "gold" ? { developmentFixtureOnly: true } : {}) };
  debates.push({ debateId: debate.debateId, debateNumber: debate.debateNumber, role: debate.role, sources });
}
const manifest = {
  schemaVersion: "3.6.1-decision-card-development-manifest", gateId: "v3.6.1-decision-card-development", status: "frozen-before-normalization", frozenAt,
  workflowVersion: "Slugfester Targeted Decision-Card Workflow v3.6.1", rubricVersion: "Slugfester Reassessment Rubric v3.6.1",
  calibrationOnly: true, correction: "deterministic-unique-word-boundary-evidence-context", maximumEvidenceWindowCharacters: 160,
  retiredGoldUsedForValidatorFixtures: true, independentModelAccuracyTest: false,
  modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, heldOutMaterialOpened: false, numericalScoringAuthorized: false, productionMutationAuthorized: false,
  priorV36: { manifestPath: priorManifestPath, manifestSha256: sha256(priorManifestText), outcome: "failed-nonunique-retired-evidence" },
  sourceHashes, sample: { debateCount: debates.length, debates }, thresholds: prior.thresholds,
  outputs: { normalizedRetiredFixtures: `${gateRoot}/retired-fixtures.json`, fixtureAnalysis: `${gateRoot}/fixture-analysis.json` }
};
const outputText = `${JSON.stringify(manifest, null, 2)}\n`;
if (shouldWrite) { await mkdir(path.dirname(path.resolve(root, outputPath)), { recursive: true }); await writeFile(path.resolve(root, outputPath), outputText); }
console.log(outputText);
