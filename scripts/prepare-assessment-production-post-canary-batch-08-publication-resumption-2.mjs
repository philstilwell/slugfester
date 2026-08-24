#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_08_PUBLICATION_MODEL, POST_CANARY_BATCH_08_PUBLICATION_ROOT } from
  "./lib/assessment-production-post-canary-batch-08-publication.mjs";
import { validatePostCanaryBatch08PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-08-publication-validation.mjs";
import { POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_2_DEBATES,
  POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_2_PROTOCOL_ID,
  POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_2_ROOT } from
  "./lib/assessment-production-post-canary-batch-08-publication-resumption-2.mjs";
import { POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch08StandingAuthorization } from
  "./lib/assessment-production-post-canary-batch-08-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");
const ROOT = POST_CANARY_BATCH_08_PUBLICATION_ROOT;
const RESUMPTION_ROOT = POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_2_ROOT;
const MANIFEST = `${RESUMPTION_ROOT}/execution-preparation-manifest.json`;
const ORIGINAL_PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const RESUMPTION_1_EXECUTION = `${ROOT}/resumption-1/model-execution.json`;
const RESUMPTION_1_ANALYSIS = `${ROOT}/resumption-1/analysis.json`;
const RESUMPTION_1_DIAGNOSIS = `${ROOT}/resumption-1/repair-1/failure-diagnosis.json`;
const REPAIR_1_ROOT = `${ROOT}/resumption-1/repair-1`;
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED = ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"];
const ACCEPTED = Object.freeze([
  { debateNumber: "88", output: `${ROOT}/repair-1/merged/debate-88.json`,
    validation: `${ROOT}/repair-1/complete-debate-validation.json` },
  { debateNumber: "194", output: `${ROOT}/resumption-1/outputs/debate-194.json`,
    validation: `${ROOT}/resumption-1/validations/debate-194.json` },
  { debateNumber: "137", output: `${ROOT}/resumption-1/outputs/debate-137.json`,
    validation: `${ROOT}/resumption-1/validations/debate-137.json` },
  { debateNumber: "08", output: `${REPAIR_1_ROOT}/merged/debate-08.json`,
    validation: `${REPAIR_1_ROOT}/complete-debate-validation.json` }
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const originalBytes = await readFile(path.resolve(ORIGINAL_PREPARATION));
const original = JSON.parse(originalBytes);
const standing = await loadAndValidatePostCanaryBatch08StandingAuthorization();
const execution1 = JSON.parse(await readFile(path.resolve(RESUMPTION_1_EXECUTION), "utf8"));
const analysis1 = JSON.parse(await readFile(path.resolve(RESUMPTION_1_ANALYSIS), "utf8"));
const diagnosis1 = JSON.parse(await readFile(path.resolve(RESUMPTION_1_DIAGNOSIS), "utf8"));
const repair1Analysis = JSON.parse(await readFile(path.resolve(`${REPAIR_1_ROOT}/analysis.json`), "utf8"));
assertV4(original.status ===
  "frozen-ten-post-canary-batch-08-score-locked-publication-contexts-prepared-not-activated" &&
  original.contexts?.length === 10 && standing.record.status ===
  "frozen-active-batch-08-complete-remaining-workflow-standing-authorization" &&
  execution1.contextsAttempted === 3 && execution1.contextsUnattempted === 6 &&
  canonicalJson(execution1.unattemptedContextIndexes) === canonicalJson([3, 4, 5, 6, 7, 8]) &&
  diagnosis1.preservedFields?.sixContextsUnattempted === true &&
  repair1Analysis.status ===
    "batch-08-debate-08-one-packet-repair-and-complete-validation-passed",
"the six-context Batch 8 resumption boundary changed");

let acceptedMoves = 0;
const acceptedDebates = [];
for (const accepted of ACCEPTED) {
  const outputBytes = await readFile(path.resolve(accepted.output));
  const packetPath = `${ROOT}/packets/debate-${accepted.debateNumber}.json`;
  const validation = validatePostCanaryBatch08PublicationOutput(JSON.parse(outputBytes),
    JSON.parse(await readFile(path.resolve(packetPath), "utf8")));
  assertV4(validation.status === "passed", `accepted Debate ${accepted.debateNumber} no longer validates`);
  acceptedMoves += validation.moves;
  acceptedDebates.push({ ...accepted, packet: packetPath, outputSha256: sha256(outputBytes),
    moves: validation.moves, critiques: validation.critiques,
    exactSourceQuotes: validation.quoteExactSourceMatches, overallCommentarySides: validation.overallCommentarySides,
    aiExtensionSides: validation.aiExtensionSides, lockedScoresUnchanged: true });
}
assertV4(acceptedMoves === 76, "the four accepted debates no longer contain 76 moves");

const contexts = POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_2_DEBATES.map((debateNumber, contextIndex) => {
  const frozen = original.contexts.find((row) => row.debateNumber === debateNumber);
  assertV4(frozen, `missing frozen Debate ${debateNumber} context`);
  return { ...structuredClone(frozen), contextIndex, originalContextIndex: frozen.contextIndex,
    rawOutput: `${RESUMPTION_ROOT}/outputs/debate-${debateNumber}.json`,
    output: `${RESUMPTION_ROOT}/outputs/debate-${debateNumber}.json`,
    validation: `${RESUMPTION_ROOT}/validations/debate-${debateNumber}.json`,
    provenance: `${RESUMPTION_ROOT}/provenance/debate-${debateNumber}.json` };
});
assertV4(contexts.reduce((sum, row) => sum + row.moves, 0) === 106,
  "the six untouched contexts no longer contain 106 moves");
for (const context of contexts) for (const [file, digest] of [
  [context.packet, context.packetSha256], [context.schema, context.schemaSha256],
  [context.sourcePacket, context.sourcePacketSha256], [context.transcript, context.transcriptSha256],
  [context.events, context.eventsSha256], [context.localManifest, context.localManifestSha256]
]) assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: frozen input drifted`);

const ACTIVATION = `${RESUMPTION_ROOT}/execution-activation.json`;
const EXECUTION = `${RESUMPTION_ROOT}/model-execution.json`;
const ANALYSIS = `${RESUMPTION_ROOT}/analysis.json`;
const futureOutputs = [...contexts.flatMap((row) => [row.rawOutput, row.validation, row.provenance]),
  ACTIVATION, EXECUTION, ANALYSIS];
for (const file of [MANIFEST, ...futureOutputs]) assertV4(!(await exists(file)), `${file} already exists`);
const staticFiles = [...new Set([ORIGINAL_PREPARATION, RESUMPTION_1_EXECUTION,
  RESUMPTION_1_ANALYSIS, RESUMPTION_1_DIAGNOSIS, `${REPAIR_1_ROOT}/analysis.json`,
  `${REPAIR_1_ROOT}/complete-debate-validation.json`, `${REPAIR_1_ROOT}/merge-audit.json`,
  POST_CANARY_BATCH_08_STANDING_AUTHORIZATION, ...Object.values(original.modelInputs).filter((value) => typeof value === "string"),
  ...acceptedDebates.flatMap((row) => [row.output, row.validation, row.packet]),
  "scripts/lib/v4-lean-production.mjs", "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-publication-resumption-2.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-08-publication-resumption-2.mjs",
  "scripts/test-assessment-production-post-canary-batch-08-publication-resumption-2-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-08-publication-resumption-2.mjs",
  "scripts/run-assessment-production-post-canary-batch-08-publication-resumption-2.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-08-publication-resumption-2.mjs",
  ...contexts.flatMap((row) => [row.packet, row.schema, row.sourcePacket, row.transcript, row.events, row.localManifest])])].sort();
const sourceHashes = {};
for (const file of staticFiles) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
const rampPhases = [
  { phase: "resumption-operational-one", maximumParallelContexts: 1,
    contextIndexes: [0], expansionRequiresAllValid: true },
  { phase: "resumption-ramp-two", maximumParallelContexts: 2,
    contextIndexes: [1, 2], expansionRequiresAllValid: true },
  { phase: "resumption-steady-two", maximumParallelContexts: 2,
    contextIndexes: [3, 4, 5], expansionRequiresAllValid: false }
];
const manifest = { schemaVersion:
    "1.0-assessment-production-post-canary-batch-08-publication-resumption-2-execution-preparation-manifest",
  protocolId: POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_2_PROTOCOL_ID,
  status: "frozen-six-untouched-post-canary-batch-08-publication-resumption-2-contexts-prepared-not-authorized",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 8, stagingOnly: true, AIOnly: true,
  userAuthorization: { instruction: "Resume exactly untouched Debates 65, 140, 156, 120, 118, and 145 after successful Debate 08 repair",
    directIncrementalCostUsdMaximum: 0, contextsPrepared: 6, attemptsPerContext: 1,
    retriesMaximum: 0, timeoutExtensionsMaximum: 0 },
  model: structuredClone(POST_CANARY_BATCH_08_PUBLICATION_MODEL),
  costEstimate: { authentication: "ChatGPT subscription", directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0, contexts: 6, expectedParallelWallMinutes: [12, 32],
    expectedAggregateModelMinutes: [24, 50], absoluteGateTimeoutMinutes: 90 },
  executionEnvironment: { codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(),
    authentication: "ChatGPT subscription", APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true, isolatedTemporaryWorkingDirectories: true },
  inputs: { originalPreparation: ORIGINAL_PREPARATION, resumption1Execution: RESUMPTION_1_EXECUTION,
    resumption1Analysis: RESUMPTION_1_ANALYSIS, resumption1Diagnosis: RESUMPTION_1_DIAGNOSIS,
    resumption1RepairAnalysis: `${REPAIR_1_ROOT}/analysis.json` },
  modelInputs: structuredClone(original.modelInputs), sourceHashes, acceptedDebates, contexts,
  isolation: { oneDebatePerContext: true, separateFreshModelContextPerDebateRequired: true,
    onlyFrozenModelInputsAvailable: true, originalPacketsAndSchemasReusedByteForByte: true,
    participantJudgmentClosed: true, participantJudgmentWasScoreBlind: true,
    ownDebateScoresAvailableOnlyAsImmutablePacketFields: true,
    modelCannotAuthorIdentityStructureMoveSelectionOrScores: true,
    legacyAssessmentsUnavailable: true, otherDebateOutputsUnavailable: true,
    acceptedCohortOutputsUnavailableToResumptionModels: true,
    rankingsAndWinnerComparisonsUnavailable: true, aiExtensionPostScoringOnly: true },
  publicationContract: structuredClone(original.publicationContract),
  transport: { maximumCopiedInputBytes: Math.max(...contexts.map((row) => row.copiedInputBytes)),
    provenCeilingBytes: original.transport.provenCeilingBytes,
    critiqueMaximumCharacterConstraintAbsent: true,
    runtimeWordSentenceQuotationAndNoveltyValidationRequired: true },
  executionPolicy: { contexts: 6, attemptsPerContext: 1, retriesMaximum: 0,
    correctionContextsMaximum: 0, timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0, absoluteGateTimeoutMs: 5400000,
    copiedInputBytesMaximum: 400000, maximumParallelContexts: 2,
    schedulerRamp: [1, 2], rampPhases, firstResumptionContextOperationalCanary: true,
    stopBeforeExpansionOnRampFailure: true, stopLaunchingAfterAnyFailure: true,
    deterministicInputOrder: true, authentication: "ChatGPT subscription",
    APIKeysRemoved: true, removedEnvironmentVariables: REMOVED,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0, separateActivationRequired: true },
  deterministicValidation: { acceptedFourDebatesReplayedAtFreeze: true,
    sixOriginalPacketsAndSchemasReusedByteForByte: true,
    sixLocalCanonicalSourceChainsReplayedAtFreeze: true,
    completeTenDebateValidationRequiredAfterResumption: true,
    exactSourceAndScoreReplayRequired: true, lockedScoresUnchanged: true,
    modelAuthoredScores: 0 },
  acceptanceContract: { resumptionValidContextsRequired: 6, cohortValidDebatesRequired: 10,
    resumptionMovesRequired: 106, cohortMovesRequired: 182,
    resumptionCritiquesRequired: 106, cohortCritiquesRequired: 182,
    resumptionExactSourceQuotesRequired: 12, cohortExactSourceQuotesRequired: 20,
    resumptionOverallCommentarySidesRequired: 12, cohortOverallCommentarySidesRequired: 20,
    resumptionAIExtensionSidesRequired: 12, cohortAIExtensionSidesRequired: 20,
    minimumCritiqueCharacters: 880, retriesMaximum: 0, timeoutExtensionsMaximum: 0,
    correctionContextsMaximum: 0, modelAuthoredScoresMaximum: 0, scorePassesExecutedThisStage: 0 },
  stopRules: { sourceHashMismatchBlocks: true, packetOrSchemaHashMismatchBlocks: true,
    preexistingResumptionOutputBlocks: true, separateActivationRequired: true,
    nonSubscriptionAuthenticationBlocks: true, apiKeyVisibilityBlocks: true,
    nonIsolatedContextBlocks: true, legacyAssessmentVisibilityBlocks: true,
    otherDebateOrRankingVisibilityBlocks: true,
    mutableIdentityStructureMoveOrScoreFieldBlocks: true, modelAuthoredScoreBlocks: true,
    invalidOutputBlocks: true, timeoutBlocks: true, automaticRetryBlocks: true,
    timeoutExtensionBlocks: true, repairPacketPreparationBlocks: true,
    correctionContextBlocks: true, paidServiceBlocks: true,
    productionMutationBlocks: true, nextBatchSelectionBlocks: true },
  authorization: { executionActivationPreparation: true, modelContexts: false,
    publicationModelExecution: false, deterministicOutputValidation: false,
    deterministicCohortAnalysis: false, retry: false, timeoutExtension: false,
    repairPacketPreparation: false, correctionModelExecution: false,
    publicationCompilation: false, publicationFinalization: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false },
  totals: { acceptedDebates: 4, acceptedMoves, resumptionContexts: 6,
    resumptionMoves: 106, cohortDebates: 10, cohortMoves: 182,
    modelContextsExecuted: 0, modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0, paidServiceCallsThisStage: 0,
    directIncrementalCostUsd: 0 },
  artifacts: { activation: ACTIVATION, execution: EXECUTION, analysis: ANALYSIS,
    resumptionOutputs: contexts.map((row) => row.rawOutput),
    resumptionValidations: contexts.map((row) => row.validation),
    resumptionProvenance: contexts.map((row) => row.provenance) },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  nextAuthorizedAction: "activate-and-execute-exactly-six-frozen-batch-08-publication-resumption-2-contexts" };
if (shouldWrite) {
  await mkdir(path.resolve(RESUMPTION_ROOT), { recursive: true });
  await writeFile(path.resolve(MANIFEST), pretty(manifest));
}
console.log(JSON.stringify({ status: shouldWrite ? manifest.status : "preview",
  debates: contexts.map((row) => row.debateNumber), contexts: 6,
  resumptionMoves: 106, acceptedDebateMoves: acceptedMoves, cohortMoves: 182,
  existingPacketsReused: 6, packetsGenerated: 0, model: manifest.model,
  schedulerRamp: [1, 2], attemptsPerContext: 1, retriesMaximum: 0,
  publicationModelContextsAuthorized: false, directIncrementalCostUsd: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
