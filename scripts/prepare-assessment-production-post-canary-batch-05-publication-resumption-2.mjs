#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  POST_CANARY_BATCH_05_PUBLICATION_MODEL,
  POST_CANARY_BATCH_05_PUBLICATION_ROOT
} from "./lib/assessment-production-post-canary-batch-05-publication.mjs";
import { validatePostCanaryBatch05PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-05-publication-validation.mjs";
import {
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_DEBATES,
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_PROTOCOL_ID,
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_ROOT
} from "./lib/assessment-production-post-canary-batch-05-publication-resumption-2.mjs";
import {
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch05StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-05-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const ROOT = POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_ROOT;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const ORIGINAL_PREPARATION = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/execution-preparation-manifest.json`;
const RESUMPTION_1_EXECUTION = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/model-execution.json`;
const CORRECTION_ANALYSIS = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/recovery-1/correction-2/analysis.json`;
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const acceptedDefinitions = [
  ["158", `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/outputs/debate-158.json`],
  ["46", `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/outputs/debate-46.json`],
  ["64", `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/repair-1/merged/debate-64.json`],
  ["132", `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/outputs/debate-132.json`],
  ["189", `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/recovery-1/correction-2/merged/debate-189.json`],
  ["109", `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/recovery-1/correction-2/merged/debate-109.json`]
];
const STATIC_SOURCE_FILES = [ORIGINAL_PREPARATION, RESUMPTION_1_EXECUTION,
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/analysis.json`,
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/failure-diagnosis.json`,
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/recovery-1/model-execution.json`,
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/recovery-1/analysis.json`,
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/recovery-1/correction-2/execution-preparation-manifest.json`,
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/recovery-1/correction-2/execution-activation.json`,
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/recovery-1/correction-2/model-execution.json`,
  CORRECTION_ANALYSIS, `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/reference-catalog.json`,
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/manual.md`,
  "docs/assessment-production-workflow.md", "docs/assessment-workflow-v4.2.21.17.41.md",
  "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  ...acceptedDefinitions.flatMap(([debateNumber, output]) => [output,
    `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`]),
  "scripts/lib/v4-lean-production.mjs", "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication-resumption-2.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-05-publication-resumption-2.mjs",
  "scripts/test-assessment-production-post-canary-batch-05-publication-resumption-2-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-05-publication-resumption-2.mjs",
  "scripts/run-assessment-production-post-canary-batch-05-publication-resumption-2.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-05-publication-resumption-2.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const standing = await loadAndValidatePostCanaryBatch05StandingAuthorization();
const originalBytes = await readFile(path.resolve(ORIGINAL_PREPARATION));
const original = JSON.parse(originalBytes);
const resumptionExecution = JSON.parse(await readFile(path.resolve(RESUMPTION_1_EXECUTION), "utf8"));
const correctionAnalysis = JSON.parse(await readFile(path.resolve(CORRECTION_ANALYSIS), "utf8"));
assertV4(original.status ===
  "frozen-ten-post-canary-batch-05-score-locked-publication-contexts-prepared-not-activated" &&
  original.contexts?.length === 10 && original.totals?.moves === 187 &&
  original.model?.slug === "gpt-5.6-sol" && original.model?.reasoningEffort === "low" &&
  original.model?.authentication === "ChatGPT subscription",
"the original frozen ten-context preparation changed");
assertV4(resumptionExecution.contextsPlanned === 7 && resumptionExecution.contextsAttempted === 3 &&
  resumptionExecution.contextsUnattempted === 4 &&
  canonicalJson(resumptionExecution.unattemptedContextIndexes) === canonicalJson([3, 4, 5, 6]) &&
  resumptionExecution.retries === 0 && resumptionExecution.timeoutExtensions === 0,
"the four unattempted resumption contexts changed");
assertV4(correctionAnalysis.status ===
  "batch-05-debate-109-correction-2-and-two-debate-complete-validation-passed" &&
  correctionAnalysis.gate?.debate189CompleteValidationPassed === true &&
  correctionAnalysis.gate?.debate109CompleteValidationPassed === true &&
  correctionAnalysis.authorization?.fourContextResumptionManifestPreparation === true,
"the accepted Debate 189 and 109 recovery boundary changed");

const acceptedDebates = [];
for (const [debateNumber, outputPath] of acceptedDefinitions) {
  const packetPath = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`;
  const [outputBytes, packetBytes] = await Promise.all([
    readFile(path.resolve(outputPath)), readFile(path.resolve(packetPath))
  ]);
  const validation = validatePostCanaryBatch05PublicationOutput(JSON.parse(outputBytes), JSON.parse(packetBytes));
  acceptedDebates.push({ debateNumber, debateId: JSON.parse(packetBytes).debateId,
    output: outputPath, outputSha256: sha256(outputBytes), packet: packetPath,
    packetSha256: sha256(packetBytes), moves: validation.moves,
    critiques: validation.critiques, exactSourceQuotes: validation.quoteExactSourceMatches,
    overallCommentarySides: validation.overallCommentarySides,
    aiExtensionSides: validation.aiExtensionSides, lockedScoresUnchanged: true });
}
assertV4(acceptedDebates.reduce((sum, row) => sum + row.moves, 0) === 112,
  "the six accepted debate move total changed");

const contexts = [];
for (let index = 0; index < POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_DEBATES.length; index += 1) {
  const debateNumber = POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_DEBATES[index];
  const source = original.contexts.find((row) => row.debateNumber === debateNumber);
  assertV4(source?.contextIndex === index + 6, `Debate ${debateNumber}: original order changed`);
  for (const file of [source.rawOutput, source.validation, source.provenance,
    `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/outputs/debate-${debateNumber}.json`,
    `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/validations/debate-${debateNumber}.json`,
    `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/provenance/debate-${debateNumber}.json`]) {
    assertV4(!(await exists(file)), `Debate ${debateNumber}: unattempted artifact exists: ${file}`);
  }
  for (const [file, digest] of [[source.packet, source.packetSha256],
    [source.schema, source.schemaSha256], [source.sourcePacket, source.sourcePacketSha256],
    [source.transcript, source.transcriptSha256], [source.events, source.eventsSha256],
    [source.localManifest, source.localManifestSha256]]) {
    assertV4(sha256(await readFile(path.resolve(file))) === digest,
      `Debate ${debateNumber}: frozen source drifted: ${file}`);
  }
  contexts.push({ ...structuredClone(source), contextIndex: index,
    originalContextIndex: source.contextIndex,
    originalUnattemptedOutput: source.rawOutput,
    originalUnattemptedValidation: source.validation,
    originalUnattemptedProvenance: source.provenance,
    rawOutput: `${ROOT}/outputs/debate-${debateNumber}.json`,
    output: `${ROOT}/outputs/debate-${debateNumber}.json`,
    validation: `${ROOT}/validations/debate-${debateNumber}.json`,
    provenance: `${ROOT}/provenance/debate-${debateNumber}.json` });
}
assertV4(contexts.reduce((sum, row) => sum + row.moves, 0) === 75,
  "the four-context move total changed");
const futureOutputs = [...contexts.flatMap((row) => [row.output, row.validation, row.provenance]),
  `${ROOT}/execution-activation.json`, `${ROOT}/model-execution.json`, `${ROOT}/analysis.json`,
  `${ROOT}/cohort-validation.json`];
for (const file of [MANIFEST, ...futureOutputs]) assertV4(!(await exists(file)), `${file} already exists`);
const sourceHashes = structuredClone(original.sourceHashes);
for (const file of [...new Set(STATIC_SOURCE_FILES)].sort()) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
for (const context of contexts) for (const [file, digest] of [
  [context.packet, context.packetSha256], [context.schema, context.schemaSha256],
  [context.sourcePacket, context.sourcePacketSha256], [context.transcript, context.transcriptSha256],
  [context.events, context.eventsSha256], [context.localManifest, context.localManifestSha256]
]) sourceHashes[file] = digest;
for (const file of futureOutputs) assertV4(!Object.hasOwn(sourceHashes, file),
  `future output hash included: ${file}`);
const manifest = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-resumption-2-preparation",
  protocolId: POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_PROTOCOL_ID,
  status: "frozen-four-unattempted-batch-05-publication-resumption-2-contexts-prepared-and-authorized",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 5, stagingOnly: true, AIOnly: true,
  userAuthorization: { instruction: standing.record.userAuthorization.instruction,
    standingAuthorization: POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standing.sha256, directIncrementalCostUsdMaximum: 0,
    contextsPrepared: 4, existingPacketsReused: 4, packetsGenerated: 0 },
  model: structuredClone(POST_CANARY_BATCH_05_PUBLICATION_MODEL),
  costEstimate: { authentication: "ChatGPT subscription", contexts: 4,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    expectedParallelWallMinutes: [8, 24], expectedAggregateModelMinutes: [12, 32],
    absoluteGateTimeoutMinutes: 40 },
  executionEnvironment: { codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(),
    authentication: "ChatGPT subscription", APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true, isolatedTemporaryWorkingDirectories: true },
  inputs: { originalPreparation: ORIGINAL_PREPARATION,
    resumption1Execution: RESUMPTION_1_EXECUTION, correctionAnalysis: CORRECTION_ANALYSIS,
    standingAuthorization: POST_CANARY_BATCH_05_STANDING_AUTHORIZATION },
  modelInputs: structuredClone(original.modelInputs),
  sourceHashes, acceptedDebates, contexts,
  isolation: { oneDebatePerContext: true, separateFreshModelContextPerDebateRequired: true,
    onlyFrozenModelInputsAvailable: true, originalPacketsAndSchemasReusedByteForByte: true,
    participantJudgmentClosed: true, participantJudgmentWasScoreBlind: true,
    ownDebateScoresAvailableOnlyAsImmutablePacketFields: true,
    legacyAssessmentsUnavailable: true, otherDebateOutputsUnavailable: true,
    acceptedOutputsUnavailableToModels: true },
  publicationContract: structuredClone(original.publicationContract),
  executionPolicy: { contexts: 4, attemptsPerContext: 1, retriesMaximum: 0,
    correctionContextsMaximum: 0, timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0, absoluteGateTimeoutMs: 2400000,
    copiedInputBytesMaximum: 400000, maximumParallelContexts: 2,
    schedulerRamp: [1, 2], rampPhases: [
      { phase: "resumption-2-operational-one", maximumParallelContexts: 1,
        contextIndexes: [0], expansionRequiresAllValid: true },
      { phase: "resumption-2-ramp-two", maximumParallelContexts: 2,
        contextIndexes: [1, 2], expansionRequiresAllValid: true },
      { phase: "resumption-2-final-one", maximumParallelContexts: 1,
        contextIndexes: [3], expansionRequiresAllValid: true }],
    authentication: "ChatGPT subscription", APIKeysRemoved: true,
    removedEnvironmentVariables: original.executionPolicy.removedEnvironmentVariables,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    separateActivationRequired: true },
  acceptanceContract: { resumptionValidContextsRequired: 4,
    cohortValidDebatesRequired: 10, resumptionMovesRequired: 75,
    cohortMovesRequired: 187, resumptionCritiquesRequired: 75,
    cohortCritiquesRequired: 187, resumptionExactSourceQuotesRequired: 8,
    cohortExactSourceQuotesRequired: 20, resumptionOverallCommentarySidesRequired: 8,
    cohortOverallCommentarySidesRequired: 20, resumptionAIExtensionSidesRequired: 8,
    cohortAIExtensionSidesRequired: 20, minimumCritiqueCharacters: 880,
    retriesMaximum: 0, timeoutExtensionsMaximum: 0,
    correctionContextsMaximum: 0, modelAuthoredScoresMaximum: 0 },
  stopRules: { sourceHashMismatchBlocks: true, packetOrSchemaHashMismatchBlocks: true,
    originalUnattemptedArtifactPresenceBlocks: true, preexistingFutureOutputBlocks: true,
    nonSubscriptionAuthenticationBlocks: true, apiKeyVisibilityBlocks: true,
    nonIsolatedContextBlocks: true, legacyAssessmentVisibilityBlocks: true,
    otherDebateVisibilityBlocks: true, identityMoveOrScoreMutationBlocks: true,
    invalidOutputBlocks: true, timeoutBlocks: true, automaticRetryBlocks: true,
    timeoutExtensionBlocks: true, repairOrCorrectionBlocks: true,
    paidServiceBlocks: true, productionMutationBlocks: true,
    nextBatchSelectionBlocks: true },
  authorization: { executionActivationPreparation: true, modelContexts: false,
    publicationModelExecution: false, deterministicOutputValidation: false,
    deterministicCohortReplay: false, retry: false, timeoutExtension: false,
    repairPacketPreparation: false, paidServices: false,
    publicationCompilation: false, productionMutation: false, nextBatchSelection: false },
  totals: { acceptedDebates: 6, acceptedMoves: 112, resumptionContexts: 4,
    resumptionMoves: 75, cohortDebates: 10, cohortMoves: 187,
    modelContextsExecuted: 0, modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0, paidServiceCallsThisStage: 0,
    directIncrementalCostUsd: 0 },
  artifacts: { activation: futureOutputs.at(-4), execution: futureOutputs.at(-3),
    analysis: futureOutputs.at(-2), cohortValidation: futureOutputs.at(-1),
    resumptionOutputs: contexts.map((row) => row.output),
    resumptionValidations: contexts.map((row) => row.validation),
    resumptionProvenance: contexts.map((row) => row.provenance) },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  nextAuthorizedAction: "activate-and-execute-exactly-four-unattempted-batch-05-publication-contexts" };
if (shouldWrite) { await mkdir(path.resolve(ROOT), { recursive: true });
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`); }
console.log(JSON.stringify({ status: manifest.status,
  debates: contexts.map((row) => row.debateNumber), contexts: 4,
  resumptionMoves: 75, acceptedMoves: 112, cohortMoves: 187,
  existingPacketsReused: 4, packetsGenerated: 0, model: manifest.model,
  schedulerRamp: [1, 2], attemptsPerContext: 1, retriesMaximum: 0,
  directIncrementalCostUsd: 0, nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
