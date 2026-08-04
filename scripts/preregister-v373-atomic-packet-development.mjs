#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert, sha256 } from "./lib/v36-decision-cards.mjs";
import { V373_DEBATES, V373_PASSES, V373_ROOT } from "./lib/v373-atomic-packets.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), outputPath = `${V373_ROOT}/development-manifest.json`;
const frozenIndex = process.argv.indexOf("--frozen-at"), frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : new Date().toISOString();
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be ISO");
const read = (file) => readFile(path.resolve(root, file), "utf8");
if (shouldWrite) {
  try { await access(path.resolve(root, outputPath)); throw new Error(`${outputPath} already exists; development preregistration is immutable`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const priorManifestPath = "docs/calibration/v3.7.2/atomic-bundle-replay/replay-manifest.json", priorReplayPath = "docs/calibration/v3.7.2/atomic-bundle-replay/replay-analysis.json";
const priorManifestText = await read(priorManifestPath), priorReplayText = await read(priorReplayPath), priorReplay = JSON.parse(priorReplayText);
assert(priorReplay.compilerPassed && priorReplay.decision.atomicPacketDevelopmentAuthorized && !priorReplay.decision.freshModelExecutionAuthorized, "v3.7.2 packet-development authority invalid");
const dryPath = `${V373_ROOT}/dry-fixture.json`, dryText = await read(dryPath), dry = JSON.parse(dryText);
assert(dry.passed && dry.initialContextCount === 6 && dry.distinctBundleCount === 8 && dry.modelContextsExecuted === 0, "v3.7.3 dry fixture invalid");
const optionMapPath = `${V373_ROOT}/sealed-atomic-option-map.json`, optionMapText = await read(optionMapPath);
const contexts = {};
for (const reviewerPass of V373_PASSES) {
  contexts[reviewerPass] = {};
  for (const debateNumber of V373_DEBATES) {
    const packet = `${V373_ROOT}/packets/${reviewerPass}/debate-${debateNumber}.json`, schema = `${V373_ROOT}/schemas/${reviewerPass}/debate-${debateNumber}.schema.json`;
    const packetText = await read(packet), schemaText = await read(schema), parsed = JSON.parse(packetText);
    contexts[reviewerPass][debateNumber] = { packet, packetSha256: sha256(packetText), schema, schemaSha256: sha256(schemaText), bundleCount: parsed.bundles.length };
  }
}
const sourceFiles = [
  "docs/assessment-workflow-v3.7.3.md", "docs/reassessment-rubric-v3.7.3.md", `${V373_ROOT}/smoke-manual.md`, dryPath, optionMapPath,
  ...V373_PASSES.flatMap((pass) => V373_DEBATES.flatMap((debate) => [contexts[pass][debate].packet, contexts[pass][debate].schema])),
  "scripts/lib/v36-decision-cards.mjs", "scripts/lib/v37-retired-semantic.mjs", "scripts/lib/v372-atomic-bundles.mjs", "scripts/lib/v373-atomic-packets.mjs",
  "scripts/build-v373-atomic-packets.mjs", "scripts/validate-v373-atomic-output.mjs", "scripts/test-v373-atomic-packets.mjs", "scripts/preregister-v373-atomic-packet-development.mjs",
  priorManifestPath, priorReplayPath
];
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async (file) => [file, sha256(await read(file))])));
const manifest = {
  schemaVersion: "3.7.3-atomic-packet-development-manifest",
  protocolId: "v3.7.3-exposed-atomic-bundle-correction-smoke",
  status: "frozen-packet-development-model-execution-blocked",
  frozenAt,
  workflowVersion: "Slugfester Atomic-Bundle Correction-Smoke Workflow v3.7.3",
  rubricVersion: "Slugfester Atomic-Bundle Correction-Smoke Rubric v3.7.3",
  calibrationOnly: true,
  exposedDevelopmentCases: true,
  correctionSmokeOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  sample: { debateNumbers: V373_DEBATES, debateCount: 3, atomicBundleCount: 8, includesMultiSpeakerDebate: true, allSpeakerAttributionConfidenceHigh: true },
  isolation: { twoInitialContextsPerDebate: true, thirdContextOnlyForDisputedBundles: true, candidateOriginsUnavailable: true, otherPassOutputsUnavailable: true, independentClaim: "isolated-context judgments; not statistical independence" },
  plannedExecution: { initialContexts: 6, adjudicationContextsMaximum: 3, attemptsPerContext: 1, modelOutputRetriesMaximum: 0, sameRequestStreamRecoveriesMaximum: 0, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  frozenThresholds: { validInitialContexts: 6, initialAtomicBundleAgreementsMinimum: 7, initialInvalidBundlesMaximum: 0, finalTwoVoteBundlesRequired: 8, unresolvedBundlesMaximum: 0, scoringFieldsMaximum: 0 },
  passMeaning: "A passing correction smoke may authorize preregistration of a disjoint retired atomic-bundle test only.",
  developmentState: { packetsBuilt: true, schemasBuilt: true, dryFixturePassed: true, executionRunnerImplemented: false, disagreementExtractorImplemented: false, adjudicationRunnerImplemented: false, analyzerImplemented: false, modelExecutionAuthorized: false },
  priorV372: { manifestPath: priorManifestPath, manifestSha256: sha256(priorManifestText), replayPath: priorReplayPath, replaySha256: sha256(priorReplayText), outcome: "compiler-pass-semantic-repeatability-fail" },
  sealedOptionMap: { path: optionMapPath, sha256: sha256(optionMapText), unavailableToModelContexts: true },
  contexts,
  dryFixture: { path: dryPath, sha256: sha256(dryText) },
  sourceHashes,
  prohibitions: { modelExecution: true, correctedBenchmarkKey: true, heldOutAccess: true, numericalParticipantScoring: true, assessmentProse: true, productionMutation: true }
};
const outputText = `${JSON.stringify(manifest, null, 2)}\n`;
if (shouldWrite) { await mkdir(path.dirname(path.resolve(root, outputPath)), { recursive: true }); await writeFile(path.resolve(root, outputPath), outputText); }
console.log(outputText);
