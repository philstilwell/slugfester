#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { V376_CASES, V376_DEBATES, V376_PASSES, V376_ROOT, assert } from "./lib/v376-burden-contact.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), outputPath = `${V376_ROOT}/development-manifest.json`, frozenIndex = process.argv.indexOf("--frozen-at"), frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : new Date().toISOString();
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be ISO");
const read = (file) => readFile(path.resolve(root, file), "utf8");
if (shouldWrite) {
  try { await access(path.resolve(root, outputPath)); throw new Error(`${outputPath} already exists; development preregistration is immutable`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const priorManifestPath = "docs/calibration/v3.7.5/taxonomy-priority-correction-smoke/execution-manifest.json", priorAnalysisPath = "docs/calibration/v3.7.5/taxonomy-priority-correction-smoke/correction-smoke-analysis.json", priorDiagnosticsPath = "docs/calibration/v3.7.5/taxonomy-priority-correction-smoke/failure-diagnostics.json";
const priorManifestText = await read(priorManifestPath), priorAnalysisText = await read(priorAnalysisPath), priorDiagnosticsText = await read(priorDiagnosticsPath), priorAnalysis = JSON.parse(priorAnalysisText), priorDiagnostics = JSON.parse(priorDiagnosticsText);
assert(!priorAnalysis.passed && !priorAnalysis.decision.correctedDisjointRepeatabilityTestPreregistrationAuthorized && priorDiagnostics.recommendation.nextStep.includes("v3.7.6"), "v3.7.5 failure does not authorize this design correction");
const dryPath = `${V376_ROOT}/dry-fixture.json`, dryText = await read(dryPath), dry = JSON.parse(dryText);
assert(dry.passed && dry.initialContextCount === 6 && dry.compositeCaseCount === 8 && dry.modelContextsExecuted === 0, "dry fixture invalid");
const mapPath = `${V376_ROOT}/sealed-option-map.json`, mapText = await read(mapPath);
const contexts = {};
for (const reviewerPass of V376_PASSES) {
  contexts[reviewerPass] = {};
  for (const debateNumber of V376_DEBATES) {
    const packet = `${V376_ROOT}/packets/${reviewerPass}/debate-${debateNumber}.json`, schema = `${V376_ROOT}/schemas/${reviewerPass}/debate-${debateNumber}.schema.json`, packetText = await read(packet), schemaText = await read(schema), parsed = JSON.parse(packetText);
    contexts[reviewerPass][debateNumber] = { packet, packetSha256: sha256(packetText), schema, schemaSha256: sha256(schemaText), bundleCount: parsed.bundles.length };
  }
}
const sourceFiles = [
  "docs/assessment-workflow-v3.7.6.md", "docs/reassessment-rubric-v3.7.6.md", `${V376_ROOT}/smoke-manual.md`, dryPath, mapPath,
  ...V376_PASSES.flatMap((pass) => V376_DEBATES.flatMap((debate) => [contexts[pass][debate].packet, contexts[pass][debate].schema])),
  "scripts/lib/v36-decision-cards.mjs", "scripts/lib/v37-retired-semantic.mjs", "scripts/lib/v372-atomic-bundles.mjs", "scripts/lib/v376-burden-contact.mjs",
  "scripts/build-v376-burden-contact-packets.mjs", "scripts/test-v376-burden-contact-packets.mjs", "scripts/preregister-v376-burden-contact-development.mjs", "scripts/validate-v376-burden-contact-development.mjs",
  "docs/calibration/v3.2/retired-three-debate-test/inputs/pageau-folley-logos-meaning-resurrection-2026.json",
  "docs/calibration/v3.2/retired-three-debate-test/inputs/koukl-oconnor-kanojia-nonbelief-harm-2025.json",
  "docs/calibration/v3.2/retired-three-debate-test/inputs/dennett-caruso-free-will-responsibility-2021.json",
  priorManifestPath, priorAnalysisPath, priorDiagnosticsPath
];
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async (file) => [file, sha256(await read(file))])));
const manifest = {
  schemaVersion: "3.7.6-burden-contact-development-manifest",
  protocolId: "v3.7.6-burden-contact-decomposition-smoke",
  status: "frozen-packet-development-model-execution-blocked",
  frozenAt,
  workflowVersion: "Slugfester Burden-Contact Decomposition Workflow v3.7.6",
  rubricVersion: "Slugfester Burden-Contact Decomposition Rubric v3.7.6",
  calibrationOnly: true,
  exposedDevelopmentCases: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  sample: { debateNumbers: V376_DEBATES, debateCount: 3, compositeCaseCount: V376_CASES.length, exposedFailureCases: 3, orthogonalCases: 5, allSpeakerAttributionConfidenceHigh: true },
  decomposition: { exactPropositionContactFirst: true, explicitNoContactCandidate: true, supportAttackPolarityExplicit: true, bridgeSelectedWithinValidComposite: true, genericSubsidiaryCatchAllProhibited: true, motionRequiresCompleteConclusion: true },
  designFixture: { warning: "Provisional AI-authored structural expectations are used only to dry-test candidate coverage; they are hidden from model contexts and are not a benchmark or ground truth." },
  plannedExecution: { initialContexts: 6, adjudicationContextsMaximum: 3, attemptsPerContext: 1, modelOutputRetriesMaximum: 0, sameRequestStreamRecoveriesMaximum: 0, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  frozenThresholds: { validInitialContexts: 6, initialCompositeAgreementsRequired: 8, initialInvalidBundlesMaximum: 0, finalTwoVoteBundlesRequired: 8, unresolvedBundlesMaximum: 0, scoringFieldsMaximum: 0 },
  passMeaning: "A pass may authorize separate preregistration of a case-disjoint burden-contact repeatability test only.",
  developmentState: { packetsBuilt: true, schemasBuilt: true, dryFixturePassed: true, executionRunnerImplemented: false, disagreementExtractorImplemented: false, adjudicationRunnerImplemented: false, analyzerImplemented: false, modelExecutionAuthorized: false },
  priorV375: { manifestPath: priorManifestPath, manifestSha256: sha256(priorManifestText), analysisPath: priorAnalysisPath, analysisSha256: sha256(priorAnalysisText), diagnosticsPath: priorDiagnosticsPath, diagnosticsSha256: sha256(priorDiagnosticsText), outcome: "mechanics-pass-perfect-initial-repeatability-fail" },
  sealedOptionMap: { path: mapPath, sha256: sha256(mapText), unavailableToModelContexts: true },
  contexts,
  dryFixture: { path: dryPath, sha256: sha256(dryText) },
  sourceHashes,
  prohibitions: { modelExecution: true, benchmarkMutation: true, largerModelBatch: true, heldOutAccess: true, numericalParticipantScoring: true, assessmentProse: true, productionMutation: true }
};
const text = `${JSON.stringify(manifest, null, 2)}\n`;
if (shouldWrite) { await mkdir(path.dirname(path.resolve(root, outputPath)), { recursive: true }); await writeFile(path.resolve(root, outputPath), text); }
console.log(text);
