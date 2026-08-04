#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V384_COVERAGE_EXECUTION_MANIFEST,
  V384_COVERAGE_MANUAL,
  V384_COVERAGE_ROOT,
  V384_DEBATE_NUMBERS,
  V384_GATE_MANIFEST,
  assert
} from "./lib/v384-coverage-preparation.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at must be an ISO timestamp");
if (shouldWrite) {
  try {
    await access(path.resolve(root, V384_COVERAGE_EXECUTION_MANIFEST));
    throw new Error(`${V384_COVERAGE_EXECUTION_MANIFEST} already exists`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [gate, dry] = await Promise.all([
  readJson(V384_GATE_MANIFEST),
  readJson(`${V384_COVERAGE_ROOT}/proposal-dry-fixture.json`)
]);
assert(gate.status === "frozen-preregistration-construction-only", "v3.8.4 gate preregistration is not frozen");
assert(gate.authorization.deterministicPacketConstruction === true && gate.authorization.coverageProposalModelExecution === false, "parent construction boundary invalid");
assert(dry.passed === true && dry.modelContextsExecuted === 0 && dry.scoreFieldsEmitted === 0 && dry.futureOutputsExcludedFromPhaseLock === true && dry.timeoutTerminationVerified === true, "coverage proposal dry fixture invalid");

const proposalContexts = {};
for (const debateNumber of V384_DEBATE_NUMBERS) {
  const debate = gate.sample.debates.find((entry) => entry.debateNumber === debateNumber);
  assert(debate, `debate ${debateNumber}: sample entry missing`);
  proposalContexts[debateNumber] = {
    debateNumber,
    packet: `${V384_COVERAGE_ROOT}/proposal/packets/debate-${debateNumber}.json`,
    schema: `${V384_COVERAGE_ROOT}/proposal/schemas/debate-${debateNumber}.schema.json`,
    rawOutput: `${V384_COVERAGE_ROOT}/proposal/raw-outputs/debate-${debateNumber}.json`,
    enrichedOutput: `${V384_COVERAGE_ROOT}/proposal/enriched-outputs/debate-${debateNumber}.json`,
    transcript: debate.transcript.path,
    events: debate.events.path,
    captionManifest: debate.captionManifest.path
  };
}

const sourceFiles = [
  "docs/assessment-workflow-v3.8.4.md",
  "docs/reassessment-rubric-v3.8.4.md",
  V384_GATE_MANIFEST,
  V384_COVERAGE_MANUAL,
  `${V384_COVERAGE_ROOT}/proposal-dry-fixture.json`,
  ...Object.values(proposalContexts).flatMap((context) => [context.packet, context.schema, context.transcript, context.events, context.captionManifest]),
  ...gate.sample.debates.map((debate) => debate.resolvedSeedInventoryPath),
  "package.json",
  "scripts/lib/v36-decision-cards.mjs",
  "scripts/lib/v37-retired-semantic.mjs",
  "scripts/lib/v381-source-preparation.mjs",
  "scripts/lib/v384-coverage-preparation.mjs",
  "scripts/build-v384-coverage-proposal-packets.mjs",
  "scripts/validate-v384-coverage-proposal.mjs",
  "scripts/test-v384-coverage-proposal-tooling.mjs",
  "scripts/run-v384-coverage-proposals.mjs",
  "scripts/preregister-v384-coverage-proposal-execution.mjs",
  "scripts/validate-v384-coverage-proposal-execution-lock.mjs"
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await read(file));
const futureOutputs = [
  ...Object.values(proposalContexts).flatMap((context) => [context.rawOutput, context.enrichedOutput]),
  `${V384_COVERAGE_ROOT}/proposal-model-execution.json`
];
assert(futureOutputs.every((file) => !Object.hasOwn(sourceHashes, file)), "future output leaked into source hashes");

const checkpointCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const manifest = {
  schemaVersion: "3.8.4-full-coverage-proposal-execution-manifest",
  protocolId: "v3.8.4-heldout-score-reconstruction-gate",
  parentPreregistration: V384_GATE_MANIFEST,
  stage: "full-coverage-proposal",
  status: "frozen-coverage-proposal-execution-authorized",
  frozenAt,
  checkpointCommit,
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "high"
  },
  modelInputs: {
    workflow: "docs/assessment-workflow-v3.8.4.md",
    rubric: "docs/reassessment-rubric-v3.8.4.md",
    manual: V384_COVERAGE_MANUAL
  },
  debateNumbers: V384_DEBATE_NUMBERS,
  proposalContexts,
  authorization: {
    coverageProposalModelExecution: true,
    coverageReviewModelExecution: false,
    coverageAdjudicationModelExecution: false,
    audioVerification: false,
    burdenContactModelExecution: false,
    scoringModelExecution: false,
    scoreAdjudicationModelExecution: false,
    numericalParticipantScoring: false,
    assessmentProse: false,
    renderingClaim: false,
    benchmarkMutation: false,
    productionMutation: false,
    tenDebateGate: false,
    all195Debates: false
  },
  authorizationScope: "Exactly three isolated full-transcript coverage-proposal contexts: one each for Debates 103, 55, and 161. No review, adjudication, classification, scoring, prose, rendering, or production context is authorized by this lock.",
  isolation: {
    temporaryCodexHomePerContext: true,
    sourceDirectoryPerContext: true,
    fullTranscriptAndTimestampedEventsAvailable: true,
    priorCoverageProposalOutputsAvailable: false,
    legacyAssessmentAvailable: false,
    seedProvisionalBurdenContactsAvailable: false,
    scoringJudgmentsAvailable: false,
    scoresAvailable: false,
    modelAuthoredStableAdditionIds: false
  },
  executionPolicy: {
    attemptsPerContext: 1,
    modelOutputRetriesMaximum: 0,
    sameRequestStreamRecoveriesMaximumPerContext: 2,
    perInvocationTimeoutMs: 3600000,
    timedOutContextsMaximum: 0,
    concurrencyMinimum: 1,
    concurrencyMaximum: 3,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0
  },
  deterministicNormalization: {
    packetLocalAdditionRefsRequired: true,
    stableAdditionIdsModelAuthored: false,
    stableAdditionIdsDerivedAfterValidation: true,
    exactExcerptsDerivedFromEvents: true,
    sourceTimestampsDerivedFromEvents: true,
    semanticFieldsChanged: false
  },
  stopRules: {
    anyInvalidProposalBlocksReviewPacketConstruction: true,
    anyTimeoutBlocksReviewPacketConstruction: true,
    anySourceHashMismatchBlocksModelExecution: true,
    anyPreexistingFutureOutputBlocksModelExecution: true,
    anyModelScoreFieldInvalidatesContext: true,
    correctionRequiresNewCommittedPhaseLock: true
  },
  artifacts: {
    proposalExecution: `${V384_COVERAGE_ROOT}/proposal-model-execution.json`,
    proposalRawOutputs: Object.values(proposalContexts).map((context) => context.rawOutput),
    proposalEnrichedOutputs: Object.values(proposalContexts).map((context) => context.enrichedOutput),
    coverageReviewLock: null,
    coverageAdjudicationLock: null,
    finalCoverageInventory: null,
    scoringArtifacts: null,
    assessmentArtifacts: null
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes
};

if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(root, V384_COVERAGE_EXECUTION_MANIFEST)), { recursive: true });
  await writeFile(path.resolve(root, V384_COVERAGE_EXECUTION_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? "frozen" : "preview",
  manifest: V384_COVERAGE_EXECUTION_MANIFEST,
  contextCount: Object.keys(proposalContexts).length,
  sourceHashCount: Object.keys(sourceHashes).length,
  coverageProposalModelExecutionAuthorized: true,
  downstreamModelExecutionAuthorized: false,
  meteredApiCostUsdMaximum: 0,
  transcriptionCostUsdMaximum: 0
}, null, 2));
