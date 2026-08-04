#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_CONSENSUS_ROOT, V388_DEBATE_NUMBERS, V388_REVIEW_ROOT, assert } from "./lib/v388-coverage-consensus.mjs";

const root = process.cwd();
const manifestPath = `${V388_CONSENSUS_ROOT}/adjudication/execution-manifest.json`;
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at must be an ISO timestamp");
if (shouldWrite) { try { await access(path.resolve(root, manifestPath)); throw new Error(`${manifestPath} already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const reviewManifestPath = `${V388_REVIEW_ROOT}/execution-manifest.json`;
const reviewExecutionPath = `${V388_REVIEW_ROOT}/model-execution.json`;
const disagreementPath = `${V388_CONSENSUS_ROOT}/initial-disagreements.json`;
const optionMapPath = `${V388_CONSENSUS_ROOT}/adjudication-option-map.json`;
const dryPath = `${V388_CONSENSUS_ROOT}/dry-fixture.json`;
const audioPath = `${V388_CONSENSUS_ROOT}/audio-verification.json`;
const manualPath = `${V388_CONSENSUS_ROOT}/adjudication-manual.md`;
const [reviewManifest, reviewExecution, disagreements, dry, audio] = await Promise.all([
  readJson(reviewManifestPath), readJson(reviewExecutionPath), readJson(disagreementPath), readJson(dryPath), readJson(audioPath)
]);
assert(reviewExecution.validOutputContexts === 3 && reviewExecution.results.every((item) => item.gateAcceptancePassed), "independent coverage reviews incomplete");
assert(disagreements.allProposalAndReviewOutputsValid && disagreements.counts.adjudicationContexts === 3 && disagreements.counts.disagreements > 0, "coverage disagreement extraction invalid");
assert(dry.passed && dry.modelContextsExecuted === 0 && dry.blindIdentityLeakage === 0 && dry.scoreFields === 0 && dry.resolvedFields === dry.comparisonFields, "coverage consensus dry fixture invalid");
assert(audio.status === "all-current-medium-or-low-attributions-verified" && audio.records.length === disagreements.counts.mediumOrLowAttributions && audio.records.every((item) => item.status === "verified"), "required audio verification incomplete");

const adjudicationContexts = {};
for (const context of disagreements.adjudicationContexts) adjudicationContexts[context.debateNumber] = { ...context };
assert(canonicalKeys(adjudicationContexts) === canonicalKeys(Object.fromEntries(V388_DEBATE_NUMBERS.map((number) => [number, null]))), "adjudication debate set invalid");
function canonicalKeys(value) { return JSON.stringify(Object.keys(value).sort()); }

const sourceFiles = [
  "docs/assessment-workflow-v3.8.4.md",
  "docs/reassessment-rubric-v3.8.4.md",
  reviewManifestPath,
  reviewExecutionPath,
  disagreementPath,
  optionMapPath,
  dryPath,
  audioPath,
  manualPath,
  "scripts/lib/v36-decision-cards.mjs",
  "scripts/lib/v37-retired-semantic.mjs",
  "scripts/lib/v381-source-preparation.mjs",
  "scripts/lib/v384-coverage-preparation.mjs",
  "scripts/lib/v385-transport.mjs",
  "scripts/lib/v388-coverage-review.mjs",
  "scripts/lib/v388-coverage-consensus.mjs",
  "scripts/extract-v388-coverage-disagreements.mjs",
  "scripts/test-v388-coverage-consensus-tooling.mjs",
  "scripts/validate-v388-coverage-adjudication.mjs",
  "scripts/preregister-v388-coverage-adjudication-execution.mjs",
  "scripts/validate-v388-coverage-adjudication-execution-lock.mjs",
  "scripts/run-v388-coverage-adjudications.mjs",
  ...V388_DEBATE_NUMBERS.flatMap((number) => [
    `${V388_REVIEW_ROOT}/outputs/debate-${number}.json`,
    `${V388_REVIEW_ROOT}/private-mappings/debate-${number}.json`,
    adjudicationContexts[number].packet,
    adjudicationContexts[number].schema
  ]),
  ...audio.records.flatMap((record) => [record.clip.path, record.transcription.path])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readBytes(file));
const futureOutputs = [...Object.values(adjudicationContexts).map((context) => context.output), `${V388_CONSENSUS_ROOT}/adjudication/model-execution.json`];
const artifact = {
  schemaVersion: "3.8.8-coverage-adjudication-execution-manifest",
  protocolId: "v3.8.8-coverage-consensus-adjudication",
  parentProtocolId: reviewManifest.protocolId,
  stage: "dispute-only-coverage-adjudication",
  status: "frozen-three-context-adjudication-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: reviewManifest.model,
  modelInputs: {
    workflow: "docs/assessment-workflow-v3.8.4.md",
    rubric: "docs/reassessment-rubric-v3.8.4.md",
    manual: manualPath
  },
  adjudicationContexts,
  upstream: {
    validIndependentReviewContexts: reviewExecution.validOutputContexts,
    comparisonFields: disagreements.counts.comparisonFields,
    agreements: disagreements.counts.agreements,
    disagreements: disagreements.counts.disagreements,
    disagreementFieldsByDebate: Object.fromEntries(V388_DEBATE_NUMBERS.map((number) => [number, disagreements.debates[number].disagreementCount])),
    audioVerificationsRequired: audio.records.length,
    audioVerificationsCompleted: audio.records.filter((item) => item.status === "verified").length,
    dryFixture: dryPath
  },
  authorization: {
    coverageAdjudicationContexts: 3,
    coverageAdjudicationModelExecution: true,
    deterministicConsensusMergeAfterPass: true,
    audioVerification: false,
    sectionAndWeightLocking: false,
    burdenContactModelExecution: false,
    scoringModelExecution: false,
    numericalParticipantScoring: false,
    assessmentProse: false,
    productionMutation: false,
    tenDebateGate: false,
    all195Debates: false
  },
  isolation: {
    temporaryCodexHomePerContext: true,
    freshSourceDirectoryPerContext: true,
    disputedFieldsOnly: true,
    anonymousOptionOrder: true,
    proposalAndReviewIdentitiesAvailableToModel: false,
    privateOptionMapAvailableToModel: false,
    initialDisagreementArtifactAvailableToModel: false,
    undisputedFieldsAvailableToModel: false,
    otherAdjudicationOutputsAvailableToModel: false,
    fullLegacyAssessmentAvailable: false,
    scoresAvailable: false,
    winnerAvailable: false
  },
  executionPolicy: {
    contexts: 3,
    attemptsPerContext: 1,
    modelOutputRetriesMaximum: 0,
    sequentialExecution: true,
    perInvocationTimeoutMs: 3600000,
    provisionalJsonMessagesMaximum: 0,
    recoverableStreamEventsNormalMaximum: 2,
    recoverableStreamEventsHardMaximum: 8,
    transportEventsExtractedFromStderrOnly: true,
    transportEventLinesRecorded: true,
    stdoutAndStderrHashesRecorded: true,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0
  },
  acceptanceRule: {
    validAdjudicationContextsRequired: 3,
    normalCommandExitRequired: true,
    timeoutForbidden: true,
    closedSchemaAndDeterministicValidationRequired: true,
    exactDisputedFieldCountRequired: true,
    suppliedOptionOnlyRequired: true,
    modelScoreFieldsMaximum: 0,
    recoverableStreamEventsHardMaximum: 8
  },
  stopRules: {
    anySourceHashMismatchBlocksExecution: true,
    anyPreexistingOutputBlocksExecution: true,
    anyInvalidAdjudicationBlocksConsensusMerge: true,
    anyAdjudicationOutputVisibleToAnotherContextInvalidatesStage: true,
    finalInventoryRequiresSeparateDeterministicMerge: true,
    scoringRemainsBlocked: true,
    furtherAutomaticRetryAuthorized: false
  },
  artifacts: {
    disagreementArtifact: disagreementPath,
    privateOptionMap: optionMapPath,
    audioVerification: audioPath,
    adjudicationExecution: `${V388_CONSENSUS_ROOT}/adjudication/model-execution.json`,
    adjudicationOutputs: Object.fromEntries(V388_DEBATE_NUMBERS.map((number) => [number, adjudicationContexts[number].output])),
    finalCoverageInventory: null
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, authorizedAdjudicationContexts: 3, debateNumbers: V388_DEBATE_NUMBERS, disputedFields: artifact.upstream.disagreements, disputedFieldsByDebate: artifact.upstream.disagreementFieldsByDebate, audioVerificationRate: `${artifact.upstream.audioVerificationsCompleted}/${artifact.upstream.audioVerificationsRequired}`, maximumMeteredCostUsd: 0, maximumTranscriptionCostUsd: 0, scoringAuthorized: false }, null, 2));
