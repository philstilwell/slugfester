#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert, sha256 } from "./lib/v36-decision-cards.mjs";
import { V372_ROOT, V372_SPEC_PATH } from "./lib/v372-atomic-bundles.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), outputPath = `${V372_ROOT}/replay-manifest.json`;
const frozenIndex = process.argv.indexOf("--frozen-at"), frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : new Date().toISOString();
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be ISO");
const read = (file) => readFile(path.resolve(root, file), "utf8");
if (shouldWrite) {
  try { await access(path.resolve(root, outputPath)); throw new Error(`${outputPath} already exists; replay preregistration is immutable`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const fixturePath = `${V372_ROOT}/compiler-fixtures.json`, fixtureText = await read(fixturePath), fixture = JSON.parse(fixtureText);
assert(fixture.passed && fixture.fixtureCount === 8 && fixture.bundleSpecCoverage.bundles === 8 && fixture.bundleSpecCoverage.auditFields === 14, "compiler fixtures invalid");
const priorRoot = "docs/calibration/v3.7.1/gold-blind-benchmark-audit", priorManifestPath = `${priorRoot}/gate-manifest.json`, priorAnalysisPath = `${priorRoot}/audit-analysis.json`;
const priorManifestText = await read(priorManifestPath), priorAnalysisText = await read(priorAnalysisPath), priorAnalysis = JSON.parse(priorAnalysisText);
assert(!priorAnalysis.passed && priorAnalysis.results.final.fields === 14 && priorAnalysis.results.final.resolved === 14, "v3.7.1 provenance invalid");
const sourceFiles = [
  "docs/assessment-workflow-v3.7.2.md", "docs/reassessment-rubric-v3.7.2.md", `${V372_ROOT}/replay-manual.md`, V372_SPEC_PATH, fixturePath,
  "scripts/lib/v36-decision-cards.mjs", "scripts/lib/v371-gold-audit.mjs", "scripts/lib/v372-atomic-bundles.mjs", "scripts/test-v372-atomic-bundles.mjs",
  "scripts/preregister-v372-atomic-bundle-replay.mjs", "scripts/replay-v372-atomic-bundles.mjs", "scripts/validate-v372-atomic-bundle-replay.mjs",
  priorManifestPath, priorAnalysisPath, `${priorRoot}/sealed-option-map.json`, `${priorRoot}/adjudication-option-map.json`,
  `${priorRoot}/initial-model-execution.json`, `${priorRoot}/adjudication-model-execution.json`,
  ...["pass-a", "pass-b"].flatMap((pass) => ["62", "154", "185"].map((debate) => `${priorRoot}/outputs/${pass}/debate-${debate}.json`)),
  `${priorRoot}/outputs/pass-c/debate-154.json`, `${priorRoot}/outputs/pass-c/debate-185.json`
];
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async (file) => [file, sha256(await read(file))])));
const manifest = {
  schemaVersion: "3.7.2-atomic-bundle-replay-manifest",
  replayId: "v3.7.2-atomic-bundle-development-replay",
  status: "frozen-before-deterministic-replay",
  frozenAt,
  workflowVersion: "Slugfester Atomic-Bundle Compiler Workflow v3.7.2",
  rubricVersion: "Slugfester Atomic-Bundle Rubric v3.7.2",
  calibrationOnly: true,
  retrospectiveDevelopmentOnly: true,
  priorV371: { manifestPath: priorManifestPath, manifestSha256: sha256(priorManifestText), analysisPath: priorAnalysisPath, analysisSha256: sha256(priorAnalysisText), outcome: "benchmark-audit-fail-complete-two-vote-resolutions" },
  specification: { path: V372_SPEC_PATH, sha256: sha256(await read(V372_SPEC_PATH)), bundles: 8, auditFields: 14, independentScalars: 12, derivedWitnesses: 2 },
  fixtures: { path: fixturePath, sha256: sha256(fixtureText), passed: true },
  developmentAcceptance: { compiledInitialPasses: 2, bundleCoveragePerPass: 8, compiledFinalBundles: 8, validFinalBundles: 8, discretionaryRepairsMaximum: 0, modelContexts: 0, paidTranscriptionCalls: 0, meteredApiCostUsdMaximum: 0 },
  semanticInterpretation: { initialBundleAgreementIsDiagnosticOnly: true, noPostHocPromotionThreshold: true, resolvedValuesRemainUnauthorizedBenchmarkKey: true },
  prohibitions: { freshModelExecution: true, correctedBenchmarkKey: true, heldOutAccess: true, numericalParticipantScoring: true, assessmentProse: true, productionMutation: true },
  sourceHashes,
  replayPath: `${V372_ROOT}/replay-analysis.json`
};
const outputText = `${JSON.stringify(manifest, null, 2)}\n`;
if (shouldWrite) { await mkdir(path.dirname(path.resolve(root, outputPath)), { recursive: true }); await writeFile(path.resolve(root, outputPath), outputText); }
console.log(outputText);
