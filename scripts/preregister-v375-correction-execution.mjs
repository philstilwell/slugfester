#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { V375_DEBATES, V375_ROOT, assert } from "./lib/v375-correction.mjs";
import { V375_EXECUTION_MANIFEST } from "./lib/v375-execution.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), frozenIndex = process.argv.indexOf("--frozen-at"), frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : new Date().toISOString();
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be ISO");
const read = (file) => readFile(path.resolve(root, file), "utf8");
if (shouldWrite) {
  try { await access(path.resolve(root, V375_EXECUTION_MANIFEST)); throw new Error(`${V375_EXECUTION_MANIFEST} already exists; execution preregistration is immutable`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}

const developmentPath = `${V375_ROOT}/development-manifest.json`, developmentText = await read(developmentPath), development = JSON.parse(developmentText);
assert(development.status === "frozen-packet-development-model-execution-blocked" && !development.developmentState.modelExecutionAuthorized, "development lock invalid");
for (const [file, digest] of Object.entries(development.sourceHashes)) assert(sha256(await read(file)) === digest, `development source hash mismatch: ${file}`);
const dryPath = `${V375_ROOT}/execution-dry-fixture.json`, dryText = await read(dryPath), dry = JSON.parse(dryText);
assert(dry.passed && dry.modelContextsExecuted === 0 && dry.syntheticDisputedBundles === 3 && dry.twoVoteResolutions === 3 && dry.diagnosticAndBurdenBranchesVerified, "execution dry fixture invalid");

const initialContexts = { "pass-a": {}, "pass-b": {} }, outputs = { initial: { "pass-a": {}, "pass-b": {} } };
for (const reviewerPass of ["pass-a", "pass-b"]) for (const debateNumber of V375_DEBATES) {
  const source = development.contexts[reviewerPass][debateNumber], output = `${V375_ROOT}/outputs/${reviewerPass}/debate-${debateNumber}.json`;
  initialContexts[reviewerPass][debateNumber] = { debateNumber, reviewerPass, packet: source.packet, packetSha256: source.packetSha256, schema: source.schema, schemaSha256: source.schemaSha256, output, bundleCount: source.bundleCount };
  outputs.initial[reviewerPass][debateNumber] = output;
}

const executionSources = [
  "scripts/lib/v375-execution.mjs", "scripts/validate-v375-correction-output.mjs", "scripts/test-v375-correction-execution-tooling.mjs",
  "scripts/extract-v375-correction-disagreements.mjs", "scripts/analyze-v375-correction-smoke.mjs", "scripts/run-v375-correction-smoke.mjs",
  "scripts/preregister-v375-correction-execution.mjs", "scripts/validate-v375-correction-execution-lock.mjs", "scripts/validate-v375-correction-smoke.mjs"
];
const sourceFiles = [...new Set([developmentPath, ...Object.keys(development.sourceHashes), dryPath, ...executionSources])];
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async (file) => [file, sha256(await read(file))])));
const manifest = {
  schemaVersion: "3.7.5-correction-execution-manifest",
  protocolId: development.protocolId,
  status: "frozen-before-model-execution",
  frozenAt,
  root: V375_ROOT,
  calibrationOnly: true,
  AIOnly: true,
  exposedCorrectionCases: true,
  correctionSmokeExecutionAuthorized: true,
  authorizationScope: "Exactly six initial correction contexts and at most one isolated dispute-only adjudication context per sampled debate, solely for the exposed v3.7.5 correction smoke.",
  developmentLock: { path: developmentPath, sha256: sha256(developmentText), remainsImmutableAndModelExecutionBlocked: true, narrowLaterExecutionAuthorization: true },
  workflowVersion: development.workflowVersion,
  rubricVersion: development.rubricVersion,
  model: development.model,
  debateNumbers: V375_DEBATES,
  modelInputs: { workflow: "docs/assessment-workflow-v3.7.5.md", rubric: "docs/reassessment-rubric-v3.7.5.md", manual: `${V375_ROOT}/smoke-manual.md` },
  sealedOptionMap: development.sealedOptionMap,
  isolation: { twoInitialContextsPerDebate: true, thirdContextOnlyForDisputedBundles: true, candidateOriginsUnavailable: true, otherPassOutputsUnavailable: true, developmentReferencesUnavailable: true, independentClaim: "isolated-context judgments; not statistical independence" },
  consensusPolicy: { finalSemanticTupleRequiresMatchingVotes: 2, thirdPassReceivesOnlyDisputedBundles: true, thirdPassCannotAddCandidateTuples: true, thirdPassTupleSelectedByNeitherInitialPassRemainsUnresolved: true, scoresDerivedOnlyAfterAdjudication: true },
  audioPolicy: { mediumConfidenceMovesRequireAudioVerification: true, sampledMediumConfidenceMoves: 0, sampledHighConfidenceMovesOnly: true },
  executionPolicy: { initialContexts: 6, adjudicationContextsMaximum: 3, attemptsPerContext: 1, modelOutputRetriesMaximum: 0, preInferenceSchemaRejectionsMaximum: 0, sameRequestStreamRecoveriesMaximum: 0, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  thresholds: { validInitialContexts: development.frozenThresholds.validInitialContexts, atomicBundles: development.sample.atomicBundleCount, initialAtomicBundleAgreementsRequired: development.frozenThresholds.initialAtomicBundleAgreementsRequired, initialInvalidBundlesMaximum: development.frozenThresholds.initialInvalidBundlesMaximum, finalTwoVoteBundlesRequired: development.frozenThresholds.finalTwoVoteBundlesRequired, unresolvedBundlesMaximum: development.frozenThresholds.unresolvedBundlesMaximum, scoringFieldsMaximum: development.frozenThresholds.scoringFieldsMaximum },
  passMeaning: development.passMeaning,
  prohibitions: { correctedBenchmarkKey: true, largerModelBatch: true, heldOutAccess: true, numericalParticipantScoring: true, assessmentProse: true, productionMutation: true },
  executionDryFixture: { path: dryPath, sha256: sha256(dryText) },
  initialContexts,
  outputs,
  artifacts: { initialExecution: `${V375_ROOT}/initial-model-execution.json`, initialDisagreements: `${V375_ROOT}/initial-disagreements.json`, adjudicationOptionMap: `${V375_ROOT}/adjudication-option-map.json`, adjudicationExecution: `${V375_ROOT}/adjudication-model-execution.json`, analysis: `${V375_ROOT}/correction-smoke-analysis.json`, assessment: `${V375_ROOT}/execution-assessment.md` },
  sourceHashes
};
const outputText = `${JSON.stringify(manifest, null, 2)}\n`;
if (shouldWrite) { await mkdir(path.dirname(path.resolve(root, V375_EXECUTION_MANIFEST)), { recursive: true }); await writeFile(path.resolve(root, V375_EXECUTION_MANIFEST), outputText); }
console.log(outputText);
