#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_PERFORMANCE_ROOT, assertV388 } from "./lib/v388-performance-judgment.mjs";
import { V388_ADJUDICATION_ROOT } from "./lib/v388-performance-adjudication.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at must be an ISO timestamp");
const manifestPath = `${V388_ADJUDICATION_ROOT}/execution-manifest.json`;
if (shouldWrite) { try { await access(path.resolve(root, manifestPath)); throw new Error(`${manifestPath} already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
const preparationPath = `${V388_ADJUDICATION_ROOT}/preparation-audit.json`;
const preflightPath = `${V388_ADJUDICATION_ROOT}/schema-preflight/execution.json`;
const performancePreparation = JSON.parse(await readFile(path.resolve(root, `${V388_PERFORMANCE_ROOT}/preparation-manifest.json`), "utf8"));
const preparation = JSON.parse(await readFile(path.resolve(root, preparationPath), "utf8"));
const preflight = JSON.parse(await readFile(path.resolve(root, preflightPath), "utf8"));
assertV388(preparation.status === "passed-dispute-only-adjudication-preparation" && preparation.authorization.freezeAdjudicationExecutionManifest && !preparation.authorization.adjudicationModelExecution && !preparation.authorization.scoreDerivation, "adjudication preparation invalid");
assertV388(preflight.status === "passed-exact-schema-endpoint-and-packet-validation" && preflight.authorization.freezeThreeContextAdjudicationExecutionManifest && !preflight.authorization.adjudicationModelExecution, "adjudication endpoint preflight invalid");

const contexts = preparation.packetAudits.map((packet) => ({
  debateNumber: packet.debateNumber,
  debateId: packet.debateId,
  disputedMoves: packet.uniqueMoves,
  responseTupleChoices: packet.responseTupleChoices,
  charityPairChoices: packet.charityPairChoices,
  ratingChoices: packet.ratingChoices,
  burdenAdjustmentChoices: packet.burdenAdjustmentChoices,
  audioVerifiedDisputedMoves: packet.audioVerifiedDisputedMoves,
  packet: packet.packetPath,
  schema: preparation.sharedSchemaPath,
  output: `${V388_ADJUDICATION_ROOT}/outputs/debate-${packet.debateNumber}.json`,
}));
const execution = `${V388_ADJUDICATION_ROOT}/model-execution.json`;
const sourceFiles = [
  performancePreparation.inputs.rubricPath,
  performancePreparation.inputs.manualPath,
  `${V388_PERFORMANCE_ROOT}/initial-disagreements.json`,
  `${V388_PERFORMANCE_ROOT}/audio-verification.json`,
  preparationPath,
  preparation.sharedSchemaPath,
  preflightPath,
  ...contexts.map((context) => context.packet),
  "scripts/lib/v385-transport.mjs",
  "scripts/lib/v388-performance-judgment.mjs",
  "scripts/lib/v388-performance-adjudication.mjs",
  "scripts/validate-v388-performance-adjudication-output.mjs",
  "scripts/preregister-v388-performance-adjudication-execution.mjs",
  "scripts/validate-v388-performance-adjudication-execution-lock.mjs",
  "scripts/run-v388-performance-adjudication.mjs",
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));

const manifest = {
  schemaVersion: "3.8.8-performance-adjudication-execution-manifest",
  protocolId: "v3.8.8-performance-judgment-consensus",
  stage: "three-isolated-dispute-only-performance-adjudications",
  status: "frozen-three-context-adjudication-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  provenance: {
    originalCleanTwoPassGatePassed: false,
    postHocRepresentationRecoveryUsed: true,
    substantiveJudgmentFieldsChangedByRecovery: 0,
    independentPerformancePasses: 6,
    moveJudgmentsAcrossPasses: 162,
    disputedMoves: preparation.disputedMoves,
    exactAdjudicationSchemaEndpointAccepted: true,
    audioVerifiedMediumConfidenceMoves: 17,
    audioVerifiedDisputedMoves: preparation.audioVerifiedDisputedMoves,
    dependencyAddedCharityRatings: preparation.dependencyClosure.charityRatingsAddedToCloseFlagValueInvariant,
  },
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  modelInputs: { rubric: performancePreparation.inputs.rubricPath, manual: performancePreparation.inputs.manualPath, sharedSchema: preparation.sharedSchemaPath, disputeOnlyPackets: true, anonymousCandidateOrdering: true, audioDerivedTranscriptsEmbeddedWhereRequired: true },
  population: { contexts: 3, disputedMoves: preparation.disputedMoves, responseTupleChoices: preparation.responseTupleChoices, charityPairChoices: preparation.charityPairChoices, independentRatingChoices: preparation.ratingChoices, burdenAdjustmentChoices: preparation.burdenAdjustmentChoices },
  contexts,
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, oneDebatePerContext: true, initialPassIdentitiesUnavailable: true, initialPassRationalesUnavailable: true, fullInitialOutputsUnavailable: true, nondisputedPerformanceFieldsUnavailable: true, otherDebatesUnavailable: true, legacyAssessmentsUnavailable: true, calculatedScoresUnavailable: true, winnerLabelsUnavailable: true, assessmentProseUnavailable: true },
  executionPolicy: { contexts: 3, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, perInvocationTimeoutMs: 3600000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionApiCalls: 0, transcriptionCostUsdMaximum: 0, recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8 },
  acceptanceRule: { validContextsRequired: 3, disputedMovesDecidedExactlyOnce: preparation.disputedMoves, candidateValuesOnly: true, missingChoicesMaximum: 0, thirdValuesMaximum: 0, nondisputedFieldMutationsMaximum: 0, modelCalculatedScoresMaximum: 0, publicationProseFieldsMaximum: 0 },
  authorization: { adjudicationModelExecution: true, furtherAutomaticRetry: false, finalLedgerAssemblyAfterValidation: true, scoreDerivation: false, numericalParticipantScoring: false, assessmentProse: false, productionMutation: false, tenDebateGate: false, all195Debates: false },
  stopRules: { sourceHashMismatchBlocksExecution: true, preexistingOutputBlocksExecution: true, invalidContextBlocksFinalLedgerAssembly: true, automaticRetryAuthorized: false, scoresRemainBlockedUntilFinalLedgerValidation: true },
  artifacts: { execution, outputs: contexts.map((context) => context.output) },
  futureOutputPathsExcludedFromSourceHashes: [execution, ...contexts.map((context) => context.output)],
  sourceHashes,
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", contexts: 3, disputedMoves: preparation.disputedMoves, candidateChoices: preparation.responseTupleChoices + preparation.charityPairChoices + preparation.ratingChoices + preparation.burdenAdjustmentChoices, maximumMeteredApiCostUsd: 0, scoreDerivationAuthorized: false }, null, 2));
