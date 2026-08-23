#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_07_PUBLICATION_MODEL, POST_CANARY_BATCH_07_PUBLICATION_ROOT } from
  "./lib/assessment-production-post-canary-batch-07-publication.mjs";
import { validatePostCanaryBatch07PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-07-publication-validation.mjs";
import { POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_4_DEBATES,
  POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_4_PROTOCOL_ID,
  POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_4_ROOT } from
  "./lib/assessment-production-post-canary-batch-07-publication-resumption-4.mjs";
import { POST_CANARY_BATCH_07_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch07StandingAuthorization } from
  "./lib/assessment-production-post-canary-batch-07-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--frozen-at");
const frozenAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");
const ROOT = POST_CANARY_BATCH_07_PUBLICATION_ROOT;
const RESUMPTION_ROOT = POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_4_ROOT;
const MANIFEST = `${RESUMPTION_ROOT}/execution-preparation-manifest.json`;
const ORIGINAL_PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const RESUMPTION_3_ROOT = `${ROOT}/resumption-3`;
const REPAIR_3_ROOT = `${RESUMPTION_3_ROOT}/repair-1`;
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED = ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"];
const ACCEPTED = Object.freeze([
  { debateNumber: "193", output: `${ROOT}/repair-1/merged/debate-193.json` },
  { debateNumber: "80", output: `${ROOT}/resumption-1/repair-1/merged/debate-80.json` },
  { debateNumber: "121", output: `${ROOT}/resumption-2/outputs/debate-121.json` },
  { debateNumber: "100", output: `${ROOT}/resumption-2/repair-1/merged/debate-100.json` },
  { debateNumber: "78", output: `${ROOT}/resumption-2/repair-1/merged/debate-78.json` },
  { debateNumber: "113", output: `${RESUMPTION_3_ROOT}/outputs/debate-113.json` },
  { debateNumber: "180", output: `${RESUMPTION_3_ROOT}/outputs/debate-180.json` },
  { debateNumber: "02", output: `${REPAIR_3_ROOT}/merged/debate-02.json` }
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const originalBytes = await readFile(path.resolve(ORIGINAL_PREPARATION));
const original = JSON.parse(originalBytes);
const standing = await loadAndValidatePostCanaryBatch07StandingAuthorization();
const execution3 = JSON.parse(await readFile(path.resolve(`${RESUMPTION_3_ROOT}/model-execution.json`), "utf8"));
const repair3 = JSON.parse(await readFile(path.resolve(`${REPAIR_3_ROOT}/analysis.json`), "utf8"));
assertV4(original.contexts?.length === 10 && standing.record.status ===
  "frozen-active-batch-07-complete-remaining-workflow-standing-authorization" &&
  execution3.contextsAttempted === 3 && execution3.contextsUnattempted === 2 &&
  canonicalJson(execution3.unattemptedContextIndexes) === canonicalJson([3, 4]) &&
  repair3.status === "batch-07-debate-02-single-field-repair-and-complete-validation-passed" &&
  repair3.gate?.immutableFieldsChanged === 0,
"the final two-context Batch 7 resumption boundary changed");
let acceptedMoves = 0;
const acceptedDebates = [];
for (const row of ACCEPTED) {
  const packet = `${ROOT}/packets/debate-${row.debateNumber}.json`;
  const outputBytes = await readFile(path.resolve(row.output));
  const validation = validatePostCanaryBatch07PublicationOutput(JSON.parse(outputBytes),
    JSON.parse(await readFile(path.resolve(packet), "utf8")));
  assertV4(validation.status === "passed", `accepted Debate ${row.debateNumber} no longer validates`);
  acceptedMoves += validation.moves;
  acceptedDebates.push({ ...row, packet, outputSha256: sha256(outputBytes),
    validationSummary: validation, lockedScoresUnchanged: true });
}
assertV4(acceptedMoves === 148, "the eight accepted debates no longer contain 148 moves");
const contexts = POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_4_DEBATES.map((debateNumber, contextIndex) => {
  const frozen = original.contexts.find((row) => row.debateNumber === debateNumber);
  assertV4(frozen, `missing frozen Debate ${debateNumber}`);
  return { ...structuredClone(frozen), contextIndex, originalContextIndex: frozen.contextIndex,
    rawOutput: `${RESUMPTION_ROOT}/outputs/debate-${debateNumber}.json`,
    output: `${RESUMPTION_ROOT}/outputs/debate-${debateNumber}.json`,
    validation: `${RESUMPTION_ROOT}/validations/debate-${debateNumber}.json`,
    provenance: `${RESUMPTION_ROOT}/provenance/debate-${debateNumber}.json` };
});
assertV4(contexts.reduce((sum, row) => sum + row.moves, 0) === 39,
  "the final two contexts no longer contain 39 moves");
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
const evidence = [ORIGINAL_PREPARATION, `${RESUMPTION_3_ROOT}/execution-preparation-manifest.json`,
  `${RESUMPTION_3_ROOT}/execution-activation.json`, `${RESUMPTION_3_ROOT}/model-execution.json`,
  `${RESUMPTION_3_ROOT}/analysis.json`, `${REPAIR_3_ROOT}/failure-diagnosis.json`,
  `${REPAIR_3_ROOT}/execution-preparation-manifest.json`, `${REPAIR_3_ROOT}/execution-activation.json`,
  `${REPAIR_3_ROOT}/model-execution.json`, `${REPAIR_3_ROOT}/analysis.json`,
  `${REPAIR_3_ROOT}/complete-debate-validation.json`, `${REPAIR_3_ROOT}/merge-audit.json`,
  POST_CANARY_BATCH_07_STANDING_AUTHORIZATION, ...Object.values(original.modelInputs).filter((value) => typeof value === "string"),
  ...acceptedDebates.flatMap((row) => [row.output, row.packet]),
  "scripts/lib/v4-lean-production.mjs", "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-07-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-07-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-07-publication-resumption-4.mjs",
  "scripts/lib/assessment-production-post-canary-batch-07-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-07-publication-resumption-4.mjs",
  "scripts/test-assessment-production-post-canary-batch-07-publication-resumption-4-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-07-publication-resumption-4.mjs",
  "scripts/run-assessment-production-post-canary-batch-07-publication-resumption-4.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-07-publication-resumption-4.mjs",
  ...contexts.flatMap((row) => [row.packet, row.schema, row.sourcePacket, row.transcript, row.events, row.localManifest])];
const sourceHashes = {};
for (const file of [...new Set(evidence)].sort())
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
const manifest = { schemaVersion:
    "1.0-assessment-production-post-canary-batch-07-publication-resumption-4-preparation",
  protocolId: POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_4_PROTOCOL_ID,
  status: "frozen-two-untouched-post-canary-batch-07-publication-resumption-4-contexts-prepared-not-authorized",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 7, stagingOnly: true, AIOnly: true,
  userAuthorization: { instruction: "Resume exactly untouched Debates 182 and 56 after accepted Debate 02 repair",
    directIncrementalCostUsdMaximum: 0, contextsPrepared: 2,
    attemptsPerContext: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0 },
  model: structuredClone(POST_CANARY_BATCH_07_PUBLICATION_MODEL),
  costEstimate: { authentication: "ChatGPT subscription", directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0, contexts: 2, expectedParallelWallMinutes: [5, 18],
    expectedAggregateModelMinutes: [8, 25], absoluteGateTimeoutMinutes: 30 },
  executionEnvironment: { codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(),
    authentication: "ChatGPT subscription", APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true, isolatedTemporaryWorkingDirectories: true },
  inputs: { originalPreparation: ORIGINAL_PREPARATION,
    resumption3Execution: `${RESUMPTION_3_ROOT}/model-execution.json`,
    debate02RepairAnalysis: `${REPAIR_3_ROOT}/analysis.json` },
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
  executionPolicy: { contexts: 2, attemptsPerContext: 1, retriesMaximum: 0,
    correctionContextsMaximum: 0, timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0, absoluteGateTimeoutMs: 1800000,
    copiedInputBytesMaximum: 400000, maximumParallelContexts: 2,
    schedulerRamp: [1, 2], rampPhases: [
      { phase: "resumption-operational-one", maximumParallelContexts: 1,
        contextIndexes: [0], expansionRequiresAllValid: true },
      { phase: "resumption-ramp-two", maximumParallelContexts: 2,
        contextIndexes: [1], expansionRequiresAllValid: true }],
    stopBeforeExpansionOnRampFailure: true, stopLaunchingAfterAnyFailure: true,
    deterministicInputOrder: true, authentication: "ChatGPT subscription",
    APIKeysRemoved: true, removedEnvironmentVariables: REMOVED,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0, separateActivationRequired: true },
  deterministicValidation: { acceptedEightDebatesReplayedAtFreeze: true,
    twoOriginalPacketsAndSchemasReusedByteForByte: true,
    twoLocalCanonicalSourceChainsReplayedAtFreeze: true,
    completeTenDebateValidationRequiredAfterResumption: true,
    exactSourceAndScoreReplayRequired: true, lockedScoresUnchanged: true,
    modelAuthoredScores: 0 },
  acceptanceContract: { resumptionValidContextsRequired: 2, cohortValidDebatesRequired: 10,
    resumptionMovesRequired: 39, cohortMovesRequired: 187,
    resumptionCritiquesRequired: 39, cohortCritiquesRequired: 187,
    resumptionExactSourceQuotesRequired: 4, cohortExactSourceQuotesRequired: 20,
    resumptionOverallCommentarySidesRequired: 4, cohortOverallCommentarySidesRequired: 20,
    resumptionAIExtensionSidesRequired: 4, cohortAIExtensionSidesRequired: 20,
    retriesMaximum: 0, timeoutExtensionsMaximum: 0, correctionContextsMaximum: 0,
    modelAuthoredScoresMaximum: 0, scorePassesExecutedThisStage: 0 },
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
  totals: { acceptedDebates: 8, acceptedMoves, resumptionContexts: 2,
    resumptionMoves: 39, cohortDebates: 10, cohortMoves: 187,
    modelContextsExecuted: 0, modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0, paidServiceCallsThisStage: 0,
    directIncrementalCostUsd: 0 },
  artifacts: { activation: ACTIVATION, execution: EXECUTION, analysis: ANALYSIS,
    resumptionOutputs: contexts.map((row) => row.rawOutput),
    resumptionValidations: contexts.map((row) => row.validation),
    resumptionProvenance: contexts.map((row) => row.provenance) },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  nextAuthorizedAction: "activate-and-execute-exactly-two-frozen-batch-07-publication-resumption-4-contexts" };
if (shouldWrite) {
  await mkdir(path.resolve(RESUMPTION_ROOT), { recursive: true });
  await writeFile(path.resolve(MANIFEST), pretty(manifest));
}
console.log(JSON.stringify({ status: shouldWrite ? manifest.status : "preview",
  debates: contexts.map((row) => row.debateNumber), contexts: 2,
  resumptionMoves: 39, acceptedDebateMoves: acceptedMoves, cohortMoves: 187,
  existingPacketsReused: 2, packetsGenerated: 0, model: manifest.model,
  schedulerRamp: [1, 2], attemptsPerContext: 1, retriesMaximum: 0,
  publicationModelContextsAuthorized: false, directIncrementalCostUsd: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
