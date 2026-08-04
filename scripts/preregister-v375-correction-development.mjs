#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { V375_BUNDLES, V375_DEBATES, V375_PASSES, V375_ROOT, assert } from "./lib/v375-correction.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), outputPath = `${V375_ROOT}/development-manifest.json`;
const frozenIndex = process.argv.indexOf("--frozen-at"), frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : new Date().toISOString();
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be ISO");
const read = (file) => readFile(path.resolve(root, file), "utf8");
if (shouldWrite) {
  try { await access(path.resolve(root, outputPath)); throw new Error(`${outputPath} already exists; development preregistration is immutable`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const priorManifestPath = "docs/calibration/v3.7.4/disjoint-retired-atomic-bundle-test/gate-manifest.json", priorAnalysisPath = "docs/calibration/v3.7.4/disjoint-retired-atomic-bundle-test/test-analysis.json", priorDiagnosticsPath = "docs/calibration/v3.7.4/disjoint-retired-atomic-bundle-test/failure-diagnostics.json";
const priorManifestText = await read(priorManifestPath), priorAnalysisText = await read(priorAnalysisPath), priorDiagnosticsText = await read(priorDiagnosticsPath), priorAnalysis = JSON.parse(priorAnalysisText), priorDiagnostics = JSON.parse(priorDiagnosticsText);
assert(!priorAnalysis.passed && !priorAnalysis.decision.largerRetiredWorkflowGateDesignAuthorized && priorDiagnostics.recommendation.nextStep.includes("v3.7.5"), "v3.7.4 failure does not support this correction development");
const dryPath = `${V375_ROOT}/dry-fixture.json`, dryText = await read(dryPath), dry = JSON.parse(dryText);
assert(dry.passed && dry.initialContextCount === 6 && dry.atomicBundleCount === 8 && dry.modelContextsExecuted === 0, "dry fixture invalid");
const mapPath = `${V375_ROOT}/sealed-option-map.json`, mapText = await read(mapPath);
const contexts = {};
for (const reviewerPass of V375_PASSES) {
  contexts[reviewerPass] = {};
  for (const debateNumber of V375_DEBATES) {
    const packet = `${V375_ROOT}/packets/${reviewerPass}/debate-${debateNumber}.json`, schema = `${V375_ROOT}/schemas/${reviewerPass}/debate-${debateNumber}.schema.json`, packetText = await read(packet), schemaText = await read(schema), parsed = JSON.parse(packetText);
    contexts[reviewerPass][debateNumber] = { packet, packetSha256: sha256(packetText), schema, schemaSha256: sha256(schemaText), bundleCount: parsed.bundles.length };
  }
}
const sourceFiles = [
  "docs/assessment-workflow-v3.7.5.md", "docs/reassessment-rubric-v3.7.5.md", `${V375_ROOT}/smoke-manual.md`, dryPath, mapPath,
  ...V375_PASSES.flatMap((pass) => V375_DEBATES.flatMap((debate) => [contexts[pass][debate].packet, contexts[pass][debate].schema])),
  "scripts/lib/v36-decision-cards.mjs", "scripts/lib/v37-retired-semantic.mjs", "scripts/lib/v372-atomic-bundles.mjs", "scripts/lib/v375-correction.mjs",
  "scripts/build-v375-correction-packets.mjs", "scripts/test-v375-correction-packets.mjs", "scripts/preregister-v375-correction-development.mjs", "scripts/validate-v375-correction-development.mjs",
  "docs/calibration/v3.2/retired-three-debate-test/inputs/pageau-folley-logos-meaning-resurrection-2026.json",
  "docs/calibration/v3.2/retired-three-debate-test/inputs/koukl-oconnor-kanojia-nonbelief-harm-2025.json",
  "docs/calibration/v3.2/retired-three-debate-test/inputs/dennett-caruso-free-will-responsibility-2021.json",
  "docs/calibration/v3.6.1/decision-card-development/retired-fixtures.json", priorManifestPath, priorAnalysisPath, priorDiagnosticsPath
];
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async (file) => [file, sha256(await read(file))])));
const manifest = {
  schemaVersion: "3.7.5-correction-development-manifest",
  protocolId: "v3.7.5-taxonomy-priority-correction-smoke",
  status: "frozen-packet-development-model-execution-blocked",
  frozenAt,
  workflowVersion: "Slugfester Taxonomy-and-Priority Correction Workflow v3.7.5",
  rubricVersion: "Slugfester Taxonomy-and-Priority Correction Rubric v3.7.5",
  calibrationOnly: true,
  exposedCorrectionCases: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  sample: { debateNumbers: V375_DEBATES, debateCount: 3, atomicBundleCount: V375_BUNDLES.length, diagnosticBundles: 4, burdenBundles: 4, allSpeakerAttributionConfidenceHigh: true },
  correctionTargets: { diagnosticLabelPrecedence: true, burdenRoutePriority: true, thresholdLowering: false },
  developmentReference: { warning: "Development references combine retired fixtures and prior two-vote AI resolutions; they are not human ground truth and are unavailable to model contexts.", diagnostic: "v3.6.1 retired normalized fixtures", burden62: "v3.7.4 two-initial-vote resolution", burden154: "v3.2 retired key", burden18507: "v3.7.4 adjudicated two-vote resolution", burden18505: "v3.7.3 two-initial-vote resolution" },
  plannedExecution: { initialContexts: 6, adjudicationContextsMaximum: 3, attemptsPerContext: 1, modelOutputRetriesMaximum: 0, sameRequestStreamRecoveriesMaximum: 0, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  frozenThresholds: { validInitialContexts: 6, initialAtomicBundleAgreementsRequired: 8, initialInvalidBundlesMaximum: 0, finalTwoVoteBundlesRequired: 8, unresolvedBundlesMaximum: 0, scoringFieldsMaximum: 0 },
  passMeaning: "A pass may authorize separate preregistration of a corrected disjoint repeatability test only.",
  developmentState: { packetsBuilt: true, schemasBuilt: true, dryFixturePassed: true, executionRunnerImplemented: false, disagreementExtractorImplemented: false, adjudicationRunnerImplemented: false, analyzerImplemented: false, modelExecutionAuthorized: false },
  priorV374: { manifestPath: priorManifestPath, manifestSha256: sha256(priorManifestText), analysisPath: priorAnalysisPath, analysisSha256: sha256(priorAnalysisText), diagnosticsPath: priorDiagnosticsPath, diagnosticsSha256: sha256(priorDiagnosticsText), outcome: "mechanics-pass-semantic-repeatability-fail" },
  sealedOptionMap: { path: mapPath, sha256: sha256(mapText), unavailableToModelContexts: true },
  contexts,
  dryFixture: { path: dryPath, sha256: sha256(dryText) },
  sourceHashes,
  prohibitions: { modelExecution: true, correctedBenchmarkKey: true, largerModelBatch: true, heldOutAccess: true, numericalParticipantScoring: true, assessmentProse: true, productionMutation: true }
};
const text = `${JSON.stringify(manifest, null, 2)}\n`;
if (shouldWrite) { await mkdir(path.dirname(path.resolve(root, outputPath)), { recursive: true }); await writeFile(path.resolve(root, outputPath), text); }
console.log(text);
