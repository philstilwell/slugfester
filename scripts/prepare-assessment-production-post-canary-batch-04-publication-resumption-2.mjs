#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_04_PUBLICATION_MODEL,
  POST_CANARY_BATCH_04_PUBLICATION_ROOT
} from "./lib/assessment-production-post-canary-batch-04-publication.mjs";
import { validatePostCanaryBatch04PublicationOutput } from "./lib/assessment-production-post-canary-batch-04-publication-validation.mjs";
import {
  POST_CANARY_BATCH_04_PUBLICATION_RESUMPTION_2_DEBATES,
  POST_CANARY_BATCH_04_PUBLICATION_RESUMPTION_2_PROTOCOL_ID,
  POST_CANARY_BATCH_04_PUBLICATION_RESUMPTION_2_ROOT
} from "./lib/assessment-production-post-canary-batch-04-publication-resumption-2.mjs";
import {
  POST_CANARY_BATCH_04_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch04StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-04-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp");
const ROOT = POST_CANARY_BATCH_04_PUBLICATION_RESUMPTION_2_ROOT;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const ORIGINAL_PREPARATION = `${POST_CANARY_BATCH_04_PUBLICATION_ROOT}/execution-preparation-manifest.json`;
const RESUMPTION_1_ROOT = `${POST_CANARY_BATCH_04_PUBLICATION_ROOT}/resumption-1`;
const RESUMPTION_1_PREPARATION = `${RESUMPTION_1_ROOT}/execution-preparation-manifest.json`;
const RESUMPTION_1_ACTIVATION = `${RESUMPTION_1_ROOT}/execution-activation.json`;
const RESUMPTION_1_EXECUTION = `${RESUMPTION_1_ROOT}/model-execution.json`;
const RESUMPTION_1_ANALYSIS = `${RESUMPTION_1_ROOT}/analysis.json`;
const REPAIR_49_ROOT = `${RESUMPTION_1_ROOT}/repair-1`;
const REPAIR_49_ANALYSIS = `${REPAIR_49_ROOT}/analysis.json`;
const REPAIR_49_VALIDATION = `${REPAIR_49_ROOT}/complete-debate-validation.json`;
const REPAIR_49_MERGE_AUDIT = `${REPAIR_49_ROOT}/merge-audit.json`;
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const acceptedSources = [
  { debateNumber: "127",
    output: `${POST_CANARY_BATCH_04_PUBLICATION_ROOT}/repair-1/merged/debate-127.json`,
    packet: `${POST_CANARY_BATCH_04_PUBLICATION_ROOT}/packets/debate-127.json` },
  { debateNumber: "67", output: `${RESUMPTION_1_ROOT}/outputs/debate-67.json`,
    packet: `${POST_CANARY_BATCH_04_PUBLICATION_ROOT}/packets/debate-67.json` },
  { debateNumber: "85", output: `${RESUMPTION_1_ROOT}/outputs/debate-85.json`,
    packet: `${POST_CANARY_BATCH_04_PUBLICATION_ROOT}/packets/debate-85.json` },
  { debateNumber: "49", output: `${REPAIR_49_ROOT}/merged/debate-49.json`,
    packet: `${POST_CANARY_BATCH_04_PUBLICATION_ROOT}/packets/debate-49.json` }
];
const staticSources = [
  ORIGINAL_PREPARATION, RESUMPTION_1_PREPARATION, RESUMPTION_1_ACTIVATION,
  RESUMPTION_1_EXECUTION, RESUMPTION_1_ANALYSIS, REPAIR_49_ANALYSIS,
  REPAIR_49_VALIDATION, REPAIR_49_MERGE_AUDIT,
  ...acceptedSources.flatMap((source) => [source.output, source.packet]),
  POST_CANARY_BATCH_04_STANDING_AUTHORIZATION,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-04-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-04-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-04-publication-resumption-2.mjs",
  "scripts/lib/assessment-production-post-canary-batch-04-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-04-publication-resumption-2.mjs",
  "scripts/test-assessment-production-post-canary-batch-04-publication-resumption-2-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-04-publication-resumption-2.mjs",
  "scripts/run-assessment-production-post-canary-batch-04-publication-resumption-2.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-04-publication-resumption-2.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const readJson = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const standing = await loadAndValidatePostCanaryBatch04StandingAuthorization();
const [originalPreparation, r1Preparation, r1Activation, r1Execution,
  r1Analysis, repairAnalysis, repairValidation, repairMergeAudit] = await Promise.all([
  ORIGINAL_PREPARATION, RESUMPTION_1_PREPARATION, RESUMPTION_1_ACTIVATION,
  RESUMPTION_1_EXECUTION, RESUMPTION_1_ANALYSIS, REPAIR_49_ANALYSIS,
  REPAIR_49_VALIDATION, REPAIR_49_MERGE_AUDIT
].map(readJson));
assertV4(originalPreparation.contexts?.length === 10 &&
  originalPreparation.totals?.moves === 203 &&
  r1Preparation.contexts?.length === 9 &&
  r1Activation.contexts?.length === 9 &&
  r1Execution.status === "post-canary-batch-04-publication-resumption-complete-with-failure" &&
  r1Execution.contextsAttempted === 3 && r1Execution.validContexts === 2 &&
  r1Execution.invalidContexts === 1 && r1Execution.contextsUnattempted === 6 &&
  canonicalJson(r1Execution.unattemptedContextIndexes) === canonicalJson([3,4,5,6,7,8]) &&
  r1Analysis.status === "post-canary-batch-04-publication-resumption-failed-validation" &&
  repairAnalysis.status ===
    "batch-04-debate-49-bounded-resumption-repair-and-four-debate-cohort-validation-passed" &&
  repairAnalysis.authorization?.sixContextResumptionManifestPreparation === true &&
  repairAnalysis.authorization?.sixContextModelExecution === false &&
  repairValidation.status === "passed" && repairValidation.validationSummary?.moves === 24 &&
  repairValidation.authorizedFieldsChanged === 22 && repairValidation.immutableFieldsChanged === 0 &&
  repairMergeAudit.status === "passed",
"the accepted four-debate and six-unattempted boundary changed");

const acceptedCohort = [];
for (const source of acceptedSources) {
  const [outputBytes, packetBytes] = await Promise.all([
    readFile(path.resolve(source.output)), readFile(path.resolve(source.packet))
  ]);
  const validation = validatePostCanaryBatch04PublicationOutput(
    JSON.parse(outputBytes), JSON.parse(packetBytes));
  assertV4(validation.status === "passed" && validation.lockedScoresUnchanged === true,
    `accepted Debate ${source.debateNumber} failed replay`);
  acceptedCohort.push({ ...source, outputSha256: sha256(outputBytes),
    packetSha256: sha256(packetBytes), validation });
}
assertV4(acceptedCohort.reduce((sum, row) => sum + row.validation.moves, 0) === 85,
  "accepted four-debate move total changed");

const contexts = [];
for (let index = 0; index < POST_CANARY_BATCH_04_PUBLICATION_RESUMPTION_2_DEBATES.length; index += 1) {
  const debateNumber = POST_CANARY_BATCH_04_PUBLICATION_RESUMPTION_2_DEBATES[index];
  const source = originalPreparation.contexts.find((context) => context.debateNumber === debateNumber);
  const r1Source = r1Preparation.contexts.find((context) => context.debateNumber === debateNumber);
  assertV4(source?.contextIndex === index + 4 && r1Source?.contextIndex === index + 3 &&
    source.packet === r1Source.packet && source.schema === r1Source.schema,
  `Debate ${debateNumber}: original frozen context changed`);
  for (const file of [source.rawOutput, source.validation, source.provenance,
    r1Source.rawOutput, r1Source.validation, r1Source.provenance]) {
    assertV4(!(await exists(file)), `unattempted artifact exists: ${file}`);
  }
  for (const [file, digest] of [[source.packet, source.packetSha256],
    [source.schema, source.schemaSha256], [source.sourcePacket, source.sourcePacketSha256],
    [source.transcript, source.transcriptSha256], [source.events, source.eventsSha256],
    [source.localManifest, source.localManifestSha256]]) {
    assertV4(sha256(await readFile(path.resolve(file))) === digest,
      `Debate ${debateNumber}: frozen source drifted: ${file}`);
  }
  const output = `${ROOT}/outputs/debate-${debateNumber}.json`;
  contexts.push({ ...structuredClone(source), contextIndex: index,
    originalContextIndex: source.contextIndex, resumption1ContextIndex: r1Source.contextIndex,
    originalUnattemptedOutput: source.rawOutput,
    resumption1UnattemptedOutput: r1Source.rawOutput,
    rawOutput: output, output,
    validation: `${ROOT}/validations/debate-${debateNumber}.json`,
    provenance: `${ROOT}/provenance/debate-${debateNumber}.json` });
}
const sum = (field) => contexts.reduce((total, context) => total + context[field], 0);
assertV4(contexts.length === 6 && sum("moves") === 118 && sum("sections") === 31 &&
  sum("audioVerifiedMoves") === 3,
"the six-context resumption coverage changed");
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const futureOutputs = [...contexts.flatMap((context) =>
  [context.rawOutput, context.validation, context.provenance]), ACTIVATION, EXECUTION, ANALYSIS];
const sourceHashes = structuredClone(originalPreparation.sourceHashes);
for (const file of [...new Set(staticSources)]) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
for (const context of contexts) {
  for (const [file, digest] of [[context.packet, context.packetSha256],
    [context.schema, context.schemaSha256], [context.sourcePacket, context.sourcePacketSha256],
    [context.transcript, context.transcriptSha256], [context.events, context.eventsSha256],
    [context.localManifest, context.localManifestSha256]]) sourceHashes[file] = digest;
}
for (const file of [MANIFEST, ...futureOutputs]) assertV4(!(await exists(file)), `${file} already exists`);
for (const file of futureOutputs) assertV4(!Object.hasOwn(sourceHashes, file),
  `future output hash included: ${file}`);
const rampPhases = [
  { phase: "resumption-2-operational-one", maximumParallelContexts: 1,
    contextIndexes: [0], expansionRequiresAllValid: true },
  { phase: "resumption-2-ramp-two", maximumParallelContexts: 2,
    contextIndexes: [1,2], expansionRequiresAllValid: true },
  { phase: "resumption-2-steady-two", maximumParallelContexts: 2,
    contextIndexes: [3,4,5], expansionRequiresAllValid: false }
];
const stopRules = Object.fromEntries([
  "acceptedCohortFailureBlocks", "sourceHashMismatchBlocks",
  "packetOrSchemaHashMismatchBlocks", "originalUnattemptedArtifactPresenceBlocks",
  "preexistingResumptionOutputBlocks", "separateActivationRequired",
  "nonSubscriptionAuthenticationBlocks", "apiKeyVisibilityBlocks",
  "nonIsolatedContextBlocks", "legacyAssessmentVisibilityBlocks",
  "otherDebateOrRankingVisibilityBlocks", "mutableIdentityStructureMoveOrScoreFieldBlocks",
  "modelAuthoredScoreBlocks", "invalidOutputBlocksAtFrozenRampBoundary",
  "timeoutBlocksAtFrozenRampBoundary", "nonExactQuotationBlocks",
  "critiqueIntegrityFailureBlocks", "aiExtensionDisclosureOrNoveltyFailureBlocks",
  "prohibitedLanguageBlocks", "scoreMutationBlocks", "automaticRetryBlocks",
  "timeoutExtensionBlocks", "repairPacketPreparationBlocks",
  "publicationCompilationBlocks", "paidServiceBlocks", "productionMutationBlocks",
  "nextBatchSelectionBlocks"
].map((key) => [key, true]));
const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-publication-resumption-2-execution-preparation-manifest",
  protocolId: POST_CANARY_BATCH_04_PUBLICATION_RESUMPTION_2_PROTOCOL_ID,
  status:
    "frozen-six-untouched-post-canary-batch-04-publication-resumption-2-contexts-prepared-under-standing-authorization",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 4, stagingOnly: true, AIOnly: true,
  userAuthorization: { instruction: standing.record.userAuthorization.instruction,
    standingAuthorization: POST_CANARY_BATCH_04_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standing.sha256,
    directIncrementalCostUsdMaximum: 0, contextsPrepared: 6,
    existingPacketsReused: 6, packetsGenerated: 0,
    publicationModelExecution: false, paidServices: false,
    publicationCompilation: false, productionMutation: false, nextBatchSelection: false },
  model: structuredClone(POST_CANARY_BATCH_04_PUBLICATION_MODEL),
  costEstimate: { authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0, contexts: 6,
    expectedParallelWallMinutes: [12, 30], expectedAggregateModelMinutes: [24, 50],
    absoluteGateTimeoutMinutes: 90,
    estimateBasis: { source: RESUMPTION_1_EXECUTION,
      scalingRule: "six-untouched-contexts-with-frozen-one-to-two-ramp-and-contingency" } },
  executionEnvironment: { codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(),
    authentication: "ChatGPT subscription", APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true, isolatedTemporaryWorkingDirectories: true },
  inputs: { originalPreparation: ORIGINAL_PREPARATION,
    resumption1Preparation: RESUMPTION_1_PREPARATION,
    resumption1Activation: RESUMPTION_1_ACTIVATION,
    resumption1Execution: RESUMPTION_1_EXECUTION,
    resumption1Analysis: RESUMPTION_1_ANALYSIS,
    debate49RepairAnalysis: REPAIR_49_ANALYSIS,
    debate49RepairValidation: REPAIR_49_VALIDATION,
    debate49RepairMergeAudit: REPAIR_49_MERGE_AUDIT,
    standingAuthorization: POST_CANARY_BATCH_04_STANDING_AUTHORIZATION },
  modelInputs: structuredClone(originalPreparation.modelInputs),
  sourceHashes,
  acceptedCohort,
  contexts,
  isolation: { oneDebatePerContext: true, separateFreshModelContextPerDebateRequired: true,
    onlyFrozenModelInputsAvailable: true, originalPacketsAndSchemasReusedByteForByte: true,
    participantJudgmentClosed: true, participantJudgmentWasScoreBlind: true,
    ownDebateScoresAvailableOnlyAsImmutablePacketFields: true,
    modelCannotAuthorIdentityStructureMoveSelectionOrScores: true,
    legacyAssessmentsUnavailable: true, otherDebateOutputsUnavailable: true,
    acceptedCohortOutputsUnavailableToResumptionModels: true,
    rankingsAndWinnerComparisonsUnavailable: true, aiExtensionPostScoringOnly: true },
  publicationContract: structuredClone(originalPreparation.publicationContract),
  transport: { maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)),
    provenCeilingBytes: originalPreparation.transport.provenCeilingBytes,
    critiqueMaximumCharacterConstraintAbsent: true,
    runtimeWordSentenceQuotationAndNoveltyValidationRequired: true },
  executionPolicy: { contexts: 6, attemptsPerContext: 1, retriesMaximum: 0,
    correctionContextsMaximum: 0, timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0, absoluteGateTimeoutMs: 5400000,
    copiedInputBytesMaximum: 400000, maximumParallelContexts: 2,
    schedulerRamp: [1,2], rampPhases, stopBeforeExpansionOnRampFailure: true,
    continueIndependentContextsWithinStartedSteadyPhaseAfterFailure: true,
    deterministicInputOrder: true, authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    removedEnvironmentVariables: originalPreparation.executionPolicy.removedEnvironmentVariables,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0, separateActivationRequired: true },
  acceptanceContract: { resumptionValidContextsRequired: 6,
    cohortValidDebatesRequired: 10, resumptionMovesRequired: 118,
    cohortMovesRequired: 203, resumptionCritiquesRequired: 118,
    cohortCritiquesRequired: 203, resumptionExactSourceQuotesRequired: 12,
    cohortExactSourceQuotesRequired: 20, resumptionOverallCommentarySidesRequired: 12,
    cohortOverallCommentarySidesRequired: 20, resumptionAIExtensionSidesRequired: 12,
    cohortAIExtensionSidesRequired: 20, minimumCritiqueCharacters: 880,
    retriesMaximum: 0, timeoutExtensionsMaximum: 0,
    correctionContextsMaximum: 0, modelAuthoredScoresMaximum: 0 },
  stopRules,
  authorization: { executionActivationPreparation: true,
    standingAuthorizationPermitsActivation: true, modelContexts: false,
    publicationModelExecution: false, deterministicOutputValidation: false,
    deterministicCohortAnalysis: false, retry: false, timeoutExtension: false,
    repairPacketPreparation: false, publicationCompilation: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false },
  totals: { acceptedDebates: 4, acceptedMoves: 85,
    resumptionContexts: 6, resumptionMoves: 118,
    resumptionSections: 31, resumptionAudioVerifiedMoves: 3,
    cohortDebates: 10, cohortMoves: 203, modelContextsExecuted: 0,
    modelAuthoredScores: 0, paidServiceCallsThisStage: 0, directIncrementalCostUsd: 0 },
  artifacts: { activation: ACTIVATION, execution: EXECUTION, analysis: ANALYSIS,
    resumptionOutputs: contexts.map((context) => context.rawOutput),
    resumptionValidations: contexts.map((context) => context.validation),
    resumptionProvenance: contexts.map((context) => context.provenance) },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  nextAuthorizedAction:
    "activate-and-execute-exactly-six-frozen-batch-04-publication-resumption-2-contexts-under-standing-authorization"
};
if (shouldWrite) {
  await mkdir(path.resolve(ROOT), { recursive: true });
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? manifest.status : "preview",
  debates: contexts.map((context) => context.debateNumber), contexts: 6,
  resumptionMoves: 118, acceptedCohortMoves: 85, cohortMoves: 203,
  model: manifest.model, schedulerRamp: [1,2], attemptsPerContext: 1,
  retriesMaximum: 0, publicationModelContextsAuthorized: false,
  directIncrementalCostUsd: 0, nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
