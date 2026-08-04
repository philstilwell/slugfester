#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert, sha256 } from "./lib/v36-decision-cards.mjs";
import { V37_FAMILIES, V37_GATE_ROOT, V37_INPUT_PATHS, V37_MODELS, V37_RETIRED_FIXTURES } from "./lib/v37-retired-semantic.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), outputPath = `${V37_GATE_ROOT}/gate-manifest.json`;
const frozenAtIndex = process.argv.indexOf("--frozen-at"), frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : new Date().toISOString();
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be an ISO timestamp");
const read = (file) => readFile(path.resolve(root, file), "utf8");
if (shouldWrite) {
  try { await access(path.resolve(root, outputPath)); throw new Error(`${outputPath} already exists; preregistration is immutable`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const priorManifestPath = "docs/calibration/v3.6.3/schema-smoke-correction/gate-manifest.json", priorAnalysisPath = "docs/calibration/v3.6.3/schema-smoke-correction/smoke-analysis.json";
const priorManifestText = await read(priorManifestPath), priorAnalysisText = await read(priorAnalysisPath), prior = JSON.parse(priorAnalysisText);
assert(prior.passed && prior.decision.retiredSemanticCardTestPreregistrationAuthorized && !prior.decision.modelBatchAuthorized, "v3.6.3 authorization invalid");
const families = {};
for (const family of V37_FAMILIES) {
  const packet = `${V37_GATE_ROOT}/packets/${family}.json`, schema = `${V37_GATE_ROOT}/schemas/${family}.schema.json`;
  const packetText = await read(packet), schemaText = await read(schema), parsed = JSON.parse(packetText);
  families[family] = { packet, packetSha256: sha256(packetText), schema, schemaSha256: sha256(schemaText), cardCount: parsed.cases.length, caseIds: parsed.cases.map((item) => item.caseId) };
}
const sourceFiles = [
  "docs/assessment-workflow-v3.7.md", "docs/reassessment-rubric-v3.7.md", `${V37_GATE_ROOT}/test-manual.md`,
  ...V37_FAMILIES.flatMap((family) => [families[family].packet, families[family].schema]), ...V37_INPUT_PATHS, V37_RETIRED_FIXTURES,
  "scripts/lib/v36-decision-cards.mjs", "scripts/lib/v37-retired-semantic.mjs", "scripts/build-v37-retired-semantic-packets.mjs",
  "scripts/test-v37-retired-semantic-packets.mjs", "scripts/validate-v37-family-output.mjs", "scripts/preregister-v37-retired-semantic-test.mjs",
  "scripts/run-v37-retired-semantic-test.mjs", "scripts/analyze-v37-retired-semantic-test.mjs", "scripts/validate-v37-retired-semantic-test.mjs"
];
const sourceHashes = Object.fromEntries(await Promise.all([...new Set(sourceFiles)].map(async (file) => [file, sha256(await read(file))])));
const dryPath = `${V37_GATE_ROOT}/dry-fixture.json`, dryText = await read(dryPath), dry = JSON.parse(dryText);
assert(dry.passed && dry.cardCount === 11 && dry.semanticAssertionCount === 45 && dry.modelContextsExecuted === 0, "v3.7 dry fixture invalid");
const outputs = Object.fromEntries(V37_FAMILIES.map((family) => [family, Object.fromEntries(Object.keys(V37_MODELS).map((modelKey) => [modelKey, `${V37_GATE_ROOT}/outputs/${family}/${modelKey}.json`]))]));
const manifest = {
  schemaVersion: "3.7-retired-semantic-test-manifest", gateId: "v3.7-retired-semantic-card-test", status: "frozen-before-model-execution", frozenAt,
  workflowVersion: "Slugfester Retired Semantic-Card Test Workflow v3.7", rubricVersion: "Slugfester Reassessment Rubric v3.7",
  calibrationOnly: true, retiredGoldComparison: true, heldOutMaterialOpened: false, numericalScoringAuthorized: false, assessmentProseAuthorized: false, productionMutationAuthorized: false,
  models: V37_MODELS, modelKeys: Object.keys(V37_MODELS), families,
  sample: { debateCount: 3, familyPacketCount: 4, cardCount: 11, semanticAssertionCountPerModel: 45, targetAssertionCountPerModel: 26, nonTargetAssertionCountPerModel: 19, burdenAssertionCountPerModel: 4, includesMultiSpeakerRetiredCase: true, allSpeakerAttributionConfidenceHigh: true },
  isolation: { oneContextPerModelFamily: true, otherModelOutputsUnavailable: true, expectedCardsUnavailableUntilAllOutputsClose: true, independentClaim: "isolated-cross-model-and-cross-family-contexts; not statistical independence" },
  executionPolicy: { plannedContexts: 8, attemptsPerContext: 1, modelOutputRetriesMaximum: 0, preInferenceSchemaRejectionsMaximum: 0, sameRequestStreamRecoveriesMaximum: 0, APIKeysRemoved: true, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  thresholds: { completedContexts: 8, validOutputContexts: 8, semanticMatchesOverallPerModelMinimum: 41, targetMatchesPerModelMinimum: 23, nonTargetMatchesPerModelMinimum: 18, burdenMatchesPerModelMinimum: 4, crossModelAgreementMinimum: 41, terraMaximumMatchDeficitFromSol: 2, scoringFieldsMaximum: 0 },
  priorV363: { manifestPath: priorManifestPath, manifestSha256: sha256(priorManifestText), analysisPath: priorAnalysisPath, analysisSha256: sha256(priorAnalysisText), outcome: "structural-correction-pass" },
  sourceHashes, dryFixture: { path: dryPath, sha256: sha256(dryText) }, outputs,
  executionResultPath: `${V37_GATE_ROOT}/model-execution.json`, analysisPath: `${V37_GATE_ROOT}/semantic-analysis.json`
};
const outputText = `${JSON.stringify(manifest, null, 2)}\n`;
if (shouldWrite) { await mkdir(path.dirname(path.resolve(root, outputPath)), { recursive: true }); await writeFile(path.resolve(root, outputPath), outputText); }
console.log(outputText);
