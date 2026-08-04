#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_DEBATE_NUMBERS, V388_MANUAL, V388_ROOT } from "./lib/v388-coverage-review.mjs";
import { assert } from "./lib/v384-coverage-preparation.mjs";

const root = process.cwd();
const manifestPath = `${V388_ROOT}/execution-manifest.json`;
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at must be an ISO timestamp");
if (shouldWrite) { try { await access(path.resolve(root, manifestPath)); throw new Error(`${manifestPath} already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const gatePath = "docs/calibration/v3.8.4/held-out-score-reconstruction-gate/gate-manifest.json";
const originalExecutionPath = "docs/calibration/v3.8.4/held-out-score-reconstruction-gate/coverage/proposal-model-execution.json";
const v387ExecutionPath = "docs/calibration/v3.8.7/coverage-batch-span-correction/model-execution.json";
const dryPath = `${V388_ROOT}/dry-fixture.json`;
const [gate, originalExecution, v387Execution, dry] = await Promise.all([readJson(gatePath), readJson(originalExecutionPath), readJson(v387ExecutionPath), readJson(dryPath)]);
const originalByDebate = new Map(originalExecution.results.map((item) => [item.debateNumber, item]));
assert(originalByDebate.get("103")?.status === "completed-valid" && originalByDebate.get("55")?.status === "completed-valid", "preserved proposal contexts invalid");
assert(v387Execution.result.status === "completed-valid-clean" && v387Execution.result.completeCoverageValidationPassed && v387Execution.result.noncoordinateMutationCount === 0, "Debate 161 final proposal invalid");
assert(dry.passed && dry.modelContextsExecuted === 0 && dry.proposalFieldsVisibleInReviewPackets === 0 && dry.stableMoveIdsVisibleInReviewPackets === 0 && dry.scoreFields === 0, "review dry fixture invalid");
const reviewContexts = {};
for (const debateNumber of V388_DEBATE_NUMBERS) {
  const debate = gate.sample.debates.find((item) => item.debateNumber === debateNumber);
  reviewContexts[debateNumber] = {
    debateNumber,
    packet: `${V388_ROOT}/packets/debate-${debateNumber}.json`,
    privateMapping: `${V388_ROOT}/private-mappings/debate-${debateNumber}.json`,
    schema: `${V388_ROOT}/schemas/debate-${debateNumber}.schema.json`,
    transcript: debate.transcript.path,
    events: debate.events.path,
    captionManifest: debate.captionManifest.path,
    output: `${V388_ROOT}/outputs/debate-${debateNumber}.json`
  };
}
const sourceFiles = [
  "docs/assessment-workflow-v3.8.4.md", "docs/reassessment-rubric-v3.8.4.md", gatePath,
  V388_MANUAL, dryPath, originalExecutionPath, v387ExecutionPath,
  "scripts/lib/v36-decision-cards.mjs", "scripts/lib/v37-retired-semantic.mjs", "scripts/lib/v381-source-preparation.mjs", "scripts/lib/v384-coverage-preparation.mjs", "scripts/lib/v385-transport.mjs", "scripts/lib/v388-coverage-review.mjs",
  "scripts/build-v388-coverage-review-packets.mjs", "scripts/test-v388-coverage-review-tooling.mjs", "scripts/validate-v388-coverage-review.mjs",
  "scripts/preregister-v388-coverage-review-execution.mjs", "scripts/validate-v388-coverage-review-execution-lock.mjs", "scripts/run-v388-coverage-reviews.mjs",
  ...Object.values(reviewContexts).flatMap((context) => [context.packet, context.privateMapping, context.schema, context.transcript, context.events, context.captionManifest])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await read(file));
const outputs = [...Object.values(reviewContexts).map((context) => context.output), `${V388_ROOT}/model-execution.json`];
const artifact = {
  schemaVersion: "3.8.8-independent-coverage-review-execution-manifest",
  protocolId: "v3.8.8-independent-coverage-review", parentProtocolId: gate.protocolId,
  stage: "independent-label-blind-full-coverage-review", status: "frozen-three-context-review-execution-authorized",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true, AIOnly: true, dyadicOnly: true,
  model: gate.model,
  modelInputs: { workflow: "docs/assessment-workflow-v3.8.4.md", rubric: "docs/reassessment-rubric-v3.8.4.md", manual: V388_MANUAL },
  reviewContexts,
  upstream: {
    preservedProposalDebates: ["103", "55"], correctedProposalDebate: "161",
    finalProposalValidationPassed: true, dryFixture: dryPath,
    candidateCounts: Object.fromEntries(dry.debates.map((item) => [item.debateNumber, item.candidateCount]))
  },
  authorization: {
    independentCoverageReviewContexts: 3, coverageReviewModelExecution: true,
    deterministicDisagreementExtractionAfterPass: true, coverageAdjudicationModelExecution: false,
    audioVerification: false, sectionAndWeightLocking: false, burdenContactModelExecution: false,
    scoringModelExecution: false, numericalParticipantScoring: false, assessmentProse: false,
    productionMutation: false, tenDebateGate: false, all195Debates: false
  },
  isolation: {
    temporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true,
    fullTranscriptAndTimestampedEventsAvailable: true, proposalPrivateMappingAvailableToModel: false,
    proposalSemanticFieldsAvailableToModel: false, stableMoveIdsAvailableToModel: false,
    otherReviewOutputsAvailableToModel: false, legacyAssessmentAvailable: false,
    scoresAvailable: false, winnerAvailable: false
  },
  executionPolicy: {
    contexts: 3, attemptsPerContext: 1, modelOutputRetriesMaximum: 0, sequentialExecution: true,
    perInvocationTimeoutMs: 3600000, boundedReadLinesMaximum: 400, provisionalJsonMessagesMaximum: 0,
    recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8,
    transportEventsExtractedFromStderrOnly: true, transportEventLinesRecorded: true,
    stdoutAndStderrHashesRecorded: true, authentication: "ChatGPT subscription", APIKeysRemoved: true,
    meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0
  },
  acceptanceRule: {
    validReviewContextsRequired: 3, normalCommandExitRequired: true, timeoutForbidden: true,
    closedSchemaAndDeterministicValidationRequired: true, completeTranscriptAuditRequired: true,
    modelScoreFieldsMaximum: 0, recoverableStreamEventsHardMaximum: 8,
    reviewDisagreementDoesNotInvalidateContext: true, reviewerMissingMovesPermitted: true
  },
  stopRules: {
    anySourceHashMismatchBlocksExecution: true, anyPreexistingOutputBlocksExecution: true,
    anyInvalidReviewBlocksDisagreementExtraction: true, anyReviewOutputVisibleToAnotherContextInvalidatesStage: true,
    adjudicationRequiresSeparateCommittedLock: true, scoringRemainsBlocked: true,
    furtherAutomaticRetryAuthorized: false
  },
  artifacts: { reviewExecution: `${V388_ROOT}/model-execution.json`, reviewOutputs: Object.fromEntries(V388_DEBATE_NUMBERS.map((debateNumber) => [debateNumber, reviewContexts[debateNumber].output])), disagreementArtifact: null, adjudicationLock: null, finalCoverageInventory: null },
  futureOutputPathsExcludedFromSourceHashes: outputs,
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, authorizedReviewContexts: 3, debateNumbers: V388_DEBATE_NUMBERS, candidateCounts: artifact.upstream.candidateCounts, proposalPrivateMappingsVisibleToModel: false, maximumMeteredCostUsd: 0, maximumTranscriptionCostUsd: 0, downstreamModelExecutionAuthorized: false }, null, 2));
