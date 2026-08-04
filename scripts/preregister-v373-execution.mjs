#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert, sha256 } from "./lib/v36-decision-cards.mjs";
import { V373_DEBATES, V373_ROOT } from "./lib/v373-atomic-packets.mjs";
import { V373_EXECUTION_MANIFEST } from "./lib/v373-execution.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : new Date().toISOString();
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be an ISO timestamp");
const read = (file) => readFile(path.resolve(root, file), "utf8");
if (shouldWrite) {
  try {
    await access(path.resolve(root, V373_EXECUTION_MANIFEST));
    throw new Error(`${V373_EXECUTION_MANIFEST} already exists; execution preregistration is immutable`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const developmentPath = `${V373_ROOT}/development-manifest.json`;
const developmentText = await read(developmentPath);
const development = JSON.parse(developmentText);
assert(development.status === "frozen-packet-development-model-execution-blocked", "packet-development manifest identity invalid");
assert(development.dryFixture && !development.developmentState.modelExecutionAuthorized, "packet-development lock must remain intact");
for (const [file, digest] of Object.entries(development.sourceHashes)) {
  assert(sha256(await read(file)) === digest, `packet-development source hash mismatch: ${file}`);
}

const initialContexts = { "pass-a": {}, "pass-b": {} };
const outputs = { initial: { "pass-a": {}, "pass-b": {} } };
for (const reviewerPass of ["pass-a", "pass-b"]) for (const debateNumber of V373_DEBATES) {
  const source = development.contexts[reviewerPass][debateNumber];
  const output = `${V373_ROOT}/outputs/${reviewerPass}/debate-${debateNumber}.json`;
  initialContexts[reviewerPass][debateNumber] = {
    debateNumber,
    reviewerPass,
    packet: source.packet,
    packetSha256: source.packetSha256,
    schema: source.schema,
    schemaSha256: source.schemaSha256,
    output,
    bundleCount: source.bundleCount
  };
  outputs.initial[reviewerPass][debateNumber] = output;
}

const newExecutionSources = [
  "scripts/lib/v373-execution.mjs",
  "scripts/extract-v373-atomic-disagreements.mjs",
  "scripts/run-v373-atomic-correction-smoke.mjs",
  "scripts/analyze-v373-atomic-correction-smoke.mjs",
  "scripts/preregister-v373-execution.mjs",
  "scripts/validate-v373-atomic-correction-smoke.mjs"
];
const sourceFiles = [...new Set([developmentPath, ...Object.keys(development.sourceHashes), ...newExecutionSources])];
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async (file) => [file, sha256(await read(file))])));
const manifest = {
  schemaVersion: "3.7.3-atomic-correction-smoke-execution-manifest",
  protocolId: development.protocolId,
  status: "frozen-before-model-execution",
  frozenAt,
  root: V373_ROOT,
  calibrationOnly: true,
  AIOnly: true,
  exposedDevelopmentCases: true,
  correctionSmokeExecutionAuthorized: true,
  authorizationScope: "Exactly six initial atomic-bundle contexts and at most one isolated adjudication context per sampled debate, solely for the v3.7.3 correction smoke.",
  developmentLock: {
    path: developmentPath,
    sha256: sha256(developmentText),
    remainsImmutableAndModelExecutionBlocked: true,
    narrowLaterExecutionAuthorization: true
  },
  workflowVersion: development.workflowVersion,
  rubricVersion: development.rubricVersion,
  model: development.model,
  debateNumbers: V373_DEBATES,
  modelInputs: {
    workflow: "docs/assessment-workflow-v3.7.3.md",
    rubric: "docs/reassessment-rubric-v3.7.3.md",
    manual: `${V373_ROOT}/smoke-manual.md`
  },
  sealedOptionMap: development.sealedOptionMap,
  isolation: development.isolation,
  consensusPolicy: {
    finalSemanticTupleRequiresMatchingVotes: 2,
    thirdPassReceivesOnlyDisputedBundles: true,
    thirdPassCannotAddCandidateTuples: true,
    thirdPassTupleSelectedByNeitherInitialPassRemainsUnresolved: true,
    scoresDerivedOnlyAfterAdjudication: true
  },
  executionPolicy: {
    initialContexts: 6,
    adjudicationContextsMaximum: 3,
    attemptsPerContext: 1,
    modelOutputRetriesMaximum: 0,
    preInferenceSchemaRejectionsMaximum: 0,
    sameRequestStreamRecoveriesMaximum: 0,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0
  },
  thresholds: {
    validInitialContexts: development.frozenThresholds.validInitialContexts,
    atomicBundles: development.sample.atomicBundleCount,
    initialAtomicBundleAgreementsMinimum: development.frozenThresholds.initialAtomicBundleAgreementsMinimum,
    initialInvalidBundlesMaximum: development.frozenThresholds.initialInvalidBundlesMaximum,
    finalTwoVoteBundlesRequired: development.frozenThresholds.finalTwoVoteBundlesRequired,
    unresolvedBundlesMaximum: development.frozenThresholds.unresolvedBundlesMaximum,
    scoringFieldsMaximum: development.frozenThresholds.scoringFieldsMaximum
  },
  passMeaning: development.passMeaning,
  prohibitions: {
    correctedBenchmarkKey: true,
    broaderModelBatch: true,
    heldOutAccess: true,
    numericalParticipantScoring: true,
    assessmentProse: true,
    productionMutation: true
  },
  initialContexts,
  outputs,
  artifacts: {
    initialExecution: `${V373_ROOT}/initial-model-execution.json`,
    initialDisagreements: `${V373_ROOT}/initial-disagreements.json`,
    adjudicationOptionMap: `${V373_ROOT}/adjudication-option-map.json`,
    adjudicationExecution: `${V373_ROOT}/adjudication-model-execution.json`,
    analysis: `${V373_ROOT}/correction-smoke-analysis.json`,
    assessment: `${V373_ROOT}/execution-assessment.md`
  },
  sourceHashes
};
const outputText = `${JSON.stringify(manifest, null, 2)}\n`;
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(root, V373_EXECUTION_MANIFEST)), { recursive: true });
  await writeFile(path.resolve(root, V373_EXECUTION_MANIFEST), outputText);
}
console.log(outputText);
