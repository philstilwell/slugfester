#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { V374_BUNDLES, V374_CASE_IDS, V374_DEBATES, V374_MANIFEST, V374_MODEL, V374_PASSES, V374_ROOT, assert } from "./lib/v374-disjoint-atomic.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : new Date().toISOString();
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be ISO");
const read = (file) => readFile(path.resolve(root, file), "utf8");
if (shouldWrite) {
  try { await access(path.resolve(root, V374_MANIFEST)); throw new Error(`${V374_MANIFEST} already exists; preregistration is immutable`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const priorManifestPath = "docs/calibration/v3.7.3/atomic-bundle-correction-smoke/execution-manifest.json";
const priorAnalysisPath = "docs/calibration/v3.7.3/atomic-bundle-correction-smoke/correction-smoke-analysis.json";
const priorManifestText = await read(priorManifestPath);
const priorAnalysisText = await read(priorAnalysisPath);
const priorAnalysis = JSON.parse(priorAnalysisText);
assert(priorAnalysis.passed && priorAnalysis.decision.disjointRetiredAtomicBundleTestPreregistrationAuthorized, "v3.7.3 does not authorize this preregistration");
const dryPath = `${V374_ROOT}/dry-fixture.json`;
const dryText = await read(dryPath);
const dry = JSON.parse(dryText);
assert(dry.passed && dry.initialContextCount === 6 && dry.distinctBundleCount === 12 && dry.caseOverlapWithV373 === 0 && dry.adjudicationDisagreementBranchVerified, "v3.7.4 dry fixture invalid");
const mapPath = `${V374_ROOT}/sealed-atomic-option-map.json`;
const mapText = await read(mapPath);
const initialContexts = { "pass-a": {}, "pass-b": {} };
const outputs = { initial: { "pass-a": {}, "pass-b": {} } };
for (const reviewerPass of V374_PASSES) for (const debateNumber of V374_DEBATES) {
  const packet = `${V374_ROOT}/packets/${reviewerPass}/debate-${debateNumber}.json`;
  const schema = `${V374_ROOT}/schemas/${reviewerPass}/debate-${debateNumber}.schema.json`;
  const packetText = await read(packet);
  const schemaText = await read(schema);
  const parsed = JSON.parse(packetText);
  const output = `${V374_ROOT}/outputs/${reviewerPass}/debate-${debateNumber}.json`;
  initialContexts[reviewerPass][debateNumber] = { debateNumber, reviewerPass, packet, packetSha256: sha256(packetText), schema, schemaSha256: sha256(schemaText), output, bundleCount: parsed.bundles.length };
  outputs.initial[reviewerPass][debateNumber] = output;
}
const sourceInputs = [
  "docs/calibration/v3.2/retired-three-debate-test/inputs/pageau-folley-logos-meaning-resurrection-2026.json",
  "docs/calibration/v3.2/retired-three-debate-test/inputs/koukl-oconnor-kanojia-nonbelief-harm-2025.json",
  "docs/calibration/v3.2/retired-three-debate-test/inputs/dennett-caruso-free-will-responsibility-2021.json",
  "docs/calibration/v3.2/retired-three-debate-test/gold/pageau-folley-logos-meaning-resurrection-2026.json",
  "docs/calibration/v3.2/retired-three-debate-test/gold/koukl-oconnor-kanojia-nonbelief-harm-2025.json",
  "docs/calibration/v3.2/retired-three-debate-test/gold/dennett-caruso-free-will-responsibility-2021.json",
  "docs/calibration/v3.6.1/decision-card-development/retired-fixtures.json"
];
const toolSources = [
  "scripts/lib/v374-disjoint-atomic.mjs", "scripts/build-v374-disjoint-atomic-packets.mjs", "scripts/test-v374-disjoint-atomic-packets.mjs", "scripts/validate-v374-atomic-output.mjs",
  "scripts/extract-v374-disagreements.mjs", "scripts/run-v374-disjoint-atomic-test.mjs", "scripts/analyze-v374-disjoint-atomic-test.mjs", "scripts/preregister-v374-disjoint-atomic-test.mjs", "scripts/validate-v374-disjoint-atomic-test.mjs"
];
const sourceFiles = [
  "docs/assessment-workflow-v3.7.4.md", "docs/reassessment-rubric-v3.7.4.md", `${V374_ROOT}/test-manual.md`, dryPath, mapPath,
  ...V374_PASSES.flatMap((reviewerPass) => V374_DEBATES.flatMap((debateNumber) => [initialContexts[reviewerPass][debateNumber].packet, initialContexts[reviewerPass][debateNumber].schema])),
  ...sourceInputs, ...toolSources, "scripts/lib/v36-decision-cards.mjs", "scripts/lib/v37-retired-semantic.mjs", "scripts/lib/v372-atomic-bundles.mjs", priorManifestPath, priorAnalysisPath
];
const sourceHashes = Object.fromEntries(await Promise.all([...new Set(sourceFiles)].map(async (file) => [file, sha256(await read(file))])));
const familyCounts = Object.fromEntries(["target", "diagnostic", "reframe", "burden"].map((family) => [family, V374_BUNDLES.filter((item) => item.family === family).length]));
const manifest = {
  schemaVersion: "3.7.4-disjoint-retired-atomic-gate-manifest",
  gateId: "v3.7.4-disjoint-retired-atomic-bundle-test",
  status: "frozen-before-model-execution",
  frozenAt,
  root: V374_ROOT,
  workflowVersion: "Slugfester Disjoint Retired Atomic-Bundle Workflow v3.7.4",
  rubricVersion: "Slugfester Disjoint Retired Atomic-Bundle Rubric v3.7.4",
  calibrationOnly: true,
  AIOnly: true,
  retiredCaseTest: true,
  executionAuthorizedByThisPreregistration: true,
  model: V374_MODEL,
  debateNumbers: V374_DEBATES,
  caseIds: V374_CASE_IDS,
  sample: { debateCount: 3, caseCount: 5, atomicBundleCount: 12, bundlesPerDebate: 4, familyCounts, includesMultiSpeakerDebate: true, allSpeakerAttributionConfidenceHigh: true },
  disjointness: { caseIdOverlapWithV373: 0, bundleIdOverlapWithV373: 0, debateContainerOverlapWithV373: 3, limitation: "The retired source corpus contains exactly the same three debate containers; this is case- and bundle-disjoint, not debate-disjoint or held out." },
  isolation: { twoInitialContextsPerDebate: true, thirdContextOnlyForDisputedBundles: true, candidateOriginsUnavailable: true, otherPassOutputsUnavailable: true, retiredExpectationsUnavailable: true, independentClaim: "isolated-context judgments; not statistical independence" },
  consensusPolicy: { finalSemanticTupleRequiresMatchingVotes: 2, thirdPassReceivesOnlyDisputedBundles: true, thirdPassCannotAddCandidateTuples: true, thirdPassTupleSelectedByNeitherInitialPassRemainsUnresolved: true, scoresDerivedOnlyAfterAdjudication: true },
  audioPolicy: { mediumConfidenceMovesRequireAudioVerification: true, sampledMediumConfidenceMoves: 0, sampledHighConfidenceMovesOnly: true },
  executionPolicy: { initialContexts: 6, adjudicationContextsMaximum: 3, attemptsPerContext: 1, modelOutputRetriesMaximum: 0, preInferenceSchemaRejectionsMaximum: 0, sameRequestStreamRecoveriesMaximum: 0, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  thresholds: { validInitialContexts: 6, atomicBundles: 12, initialAtomicBundleAgreementsMinimum: 11, initialInvalidBundlesMaximum: 0, finalTwoVoteBundlesRequired: 12, unresolvedBundlesMaximum: 0, scoringFieldsMaximum: 0 },
  passMeaning: "A pass may authorize design of a larger retired workflow gate only.",
  prohibitions: { correctedBenchmarkKey: true, largerModelBatch: true, heldOutAccess: true, numericalParticipantScoring: true, assessmentProse: true, productionMutation: true },
  priorV373: { manifestPath: priorManifestPath, manifestSha256: sha256(priorManifestText), analysisPath: priorAnalysisPath, analysisSha256: sha256(priorAnalysisText), outcome: "correction-smoke-pass-disjoint-preregistration-authorized" },
  modelInputs: { workflow: "docs/assessment-workflow-v3.7.4.md", rubric: "docs/reassessment-rubric-v3.7.4.md", manual: `${V374_ROOT}/test-manual.md` },
  sealedOptionMap: { path: mapPath, sha256: sha256(mapText), unavailableToModelContexts: true },
  dryFixture: { path: dryPath, sha256: sha256(dryText) },
  initialContexts,
  outputs,
  artifacts: { initialExecution: `${V374_ROOT}/initial-model-execution.json`, initialDisagreements: `${V374_ROOT}/initial-disagreements.json`, adjudicationOptionMap: `${V374_ROOT}/adjudication-option-map.json`, adjudicationExecution: `${V374_ROOT}/adjudication-model-execution.json`, analysis: `${V374_ROOT}/test-analysis.json`, assessment: `${V374_ROOT}/workflow-assessment.md` },
  sourceHashes
};
const text = `${JSON.stringify(manifest, null, 2)}\n`;
if (shouldWrite) { await mkdir(path.dirname(path.resolve(root, V374_MANIFEST)), { recursive: true }); await writeFile(path.resolve(root, V374_MANIFEST), text); }
console.log(text);
