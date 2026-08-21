#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_04_PUBLICATION_MODEL
} from "./lib/assessment-production-post-canary-batch-04-publication.mjs";
import {
  POST_CANARY_BATCH_04_DEBATE_49_BASE_OUTPUT,
  POST_CANARY_BATCH_04_DEBATE_49_PUBLICATION_PACKET,
  POST_CANARY_BATCH_04_DEBATE_49_REPAIR_OUTPUT_VERSION,
  POST_CANARY_BATCH_04_DEBATE_49_REPAIR_PACKET_VERSION,
  POST_CANARY_BATCH_04_DEBATE_49_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_04_DEBATE_49_REPAIR_ROOT,
  buildDebate49RepairSchema,
  debate49RepairMoveId,
  mergeAndValidateDebate49Repairs
} from "./lib/assessment-production-post-canary-batch-04-publication-resumption-repair.mjs";
import {
  POST_CANARY_BATCH_04_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch04StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-04-standing-authorization.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp");

const RESUMPTION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/publication-reconstruction/resumption-1";
const ROOT = POST_CANARY_BATCH_04_DEBATE_49_REPAIR_ROOT;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const DIAGNOSIS = `${RESUMPTION_ROOT}/failure-diagnosis.json`;
const FAILED_EXECUTION = `${RESUMPTION_ROOT}/model-execution.json`;
const FAILED_ANALYSIS = `${RESUMPTION_ROOT}/analysis.json`;
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const OUTPUT_CONTRACT =
  "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
const MANUAL = `${ROOT}/manual.md`;
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED_API_ENVIRONMENT_VARIABLES = [
  "OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID",
  "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"
];
const STATIC_SOURCE_FILES = [
  PRODUCTION_WORKFLOW, READINESS_WORKFLOW, OUTPUT_CONTRACT, MANUAL,
  POST_CANARY_BATCH_04_STANDING_AUTHORIZATION, DIAGNOSIS,
  FAILED_EXECUTION, FAILED_ANALYSIS, POST_CANARY_BATCH_04_DEBATE_49_BASE_OUTPUT,
  POST_CANARY_BATCH_04_DEBATE_49_PUBLICATION_PACKET,
  `${ROOT}/preparation-harness-correction-1.json`,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-04-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-04-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-04-publication-resumption-repair.mjs",
  "scripts/lib/assessment-production-post-canary-batch-04-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-04-publication-resumption-repair.mjs",
  "scripts/test-assessment-production-post-canary-batch-04-publication-resumption-repair-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-04-publication-resumption-repair.mjs",
  "scripts/run-assessment-production-post-canary-batch-04-publication-resumption-repair.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-04-publication-resumption-repair.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const prettyJsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

const sourceFiles = [
  DIAGNOSIS, FAILED_EXECUTION, FAILED_ANALYSIS,
  POST_CANARY_BATCH_04_DEBATE_49_BASE_OUTPUT,
  POST_CANARY_BATCH_04_DEBATE_49_PUBLICATION_PACKET,
  PRODUCTION_WORKFLOW, READINESS_WORKFLOW, OUTPUT_CONTRACT, MANUAL,
  POST_CANARY_BATCH_04_STANDING_AUTHORIZATION
];
const bytesByFile = Object.fromEntries(
  await Promise.all(sourceFiles.map(async (file) => [file, await readFile(path.resolve(file))]))
);
const parsed = (file) => JSON.parse(bytesByFile[file]);
const diagnosis = parsed(DIAGNOSIS);
const execution = parsed(FAILED_EXECUTION);
const analysis = parsed(FAILED_ANALYSIS);
const baseOutput = parsed(POST_CANARY_BATCH_04_DEBATE_49_BASE_OUTPUT);
const publicationPacket = parsed(POST_CANARY_BATCH_04_DEBATE_49_PUBLICATION_PACKET);
const standing = await loadAndValidatePostCanaryBatch04StandingAuthorization();

assertV4(
  diagnosis.status ===
      "diagnosed-batch-04-debate-49-twenty-two-critique-word-overruns" &&
    diagnosis.failureBoundary?.failedFieldCount === 22 &&
    diagnosis.failureBoundary?.excessWordsTotal === 173 &&
    diagnosis.diagnosticReplay?.result?.status === "passed" &&
    diagnosis.diagnosticReplay?.originalOutputBytesChanged === false &&
    diagnosis.diagnosticReplay?.persistedCorrectedOutputs === 0 &&
    diagnosis.prospectiveRecoveryOnly?.minimumFieldDisjointRepairPacketCount === 11 &&
    diagnosis.authorization?.boundedFirstRecoveryApplies === true &&
    diagnosis.authorization?.repairPacketPreparation === true,
  "the frozen Debate 49 failure diagnosis changed"
);
for (const [file, digest] of Object.entries(diagnosis.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `${file}: diagnosed source drifted`);
}
assertV4(
  execution.contextsPlanned === 9 && execution.contextsAttempted === 3 &&
    execution.contextsUnattempted === 6 && execution.validContexts === 2 &&
    execution.invalidContexts === 1 && execution.attempts === 3 &&
    execution.retries === 0 && execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 &&
    analysis.status === "post-canary-batch-04-publication-resumption-failed-validation",
  "the preserved failed resumption gate changed"
);
assertV4(
  sha256(bytesByFile[POST_CANARY_BATCH_04_DEBATE_49_BASE_OUTPUT]) ===
      diagnosis.failedContext.outputSha256 &&
    sha256(bytesByFile[POST_CANARY_BATCH_04_DEBATE_49_BASE_OUTPUT]) ===
      diagnosis.artifacts.output.sha256 &&
    sha256(bytesByFile[POST_CANARY_BATCH_04_DEBATE_49_PUBLICATION_PACKET]) ===
      diagnosis.artifacts.packet.sha256 &&
    sha256(bytesByFile[FAILED_EXECUTION]) === diagnosis.artifacts.execution.sha256 &&
    sha256(bytesByFile[FAILED_ANALYSIS]) === diagnosis.artifacts.analysis.sha256,
  "a diagnosed Debate 49 artifact drifted"
);

const partitions = diagnosis.prospectiveRecoveryOnly.proposedRepairPartition;
const repairFields = diagnosis.failureBoundary.failedFields.map(({ path: field }) => field);
assertV4(partitions.length === 11 && partitions.every((fields) => fields.length === 2) &&
  canonicalJson(partitions.flat()) === canonicalJson(repairFields),
"the frozen 11-packet repair partition changed");
const failureByField = new Map(
  diagnosis.failureBoundary.failedFields.map((entry) => [entry.path, entry])
);
const contexts = [];
const generated = [];
const packets = [];
const syntheticRepairs = [];
for (let packetIndex = 0; packetIndex < partitions.length; packetIndex += 1) {
  const writableFields = partitions[packetIndex];
  const corrections = writableFields.map((field) => {
    const moveId = debate49RepairMoveId(field);
    const move = publicationPacket.moves.find((item) => item.moveId === moveId);
    const originalCritique = baseOutput.moveProse?.[moveId]?.critique;
    const diagnosed = failureByField.get(field);
    assertV4(move && originalCritique && diagnosed, `${field}: repair source missing`);
    assertV4(wordCount(originalCritique) === diagnosed.words &&
      originalCritique.length === diagnosed.characters && diagnosed.words > 130 &&
      diagnosed.characters >= 880, `${field}: repair defect changed`);
    return { field, moveId, originalCritique, originalWords: diagnosed.words,
      originalCharacters: diagnosed.characters,
      excessWordsAboveAcceptanceMaximum: diagnosed.excessWordsAboveAcceptanceMaximum,
      lockedMove: move };
  });
  const packet = {
    schemaVersion: POST_CANARY_BATCH_04_DEBATE_49_REPAIR_PACKET_VERSION,
    protocolId: POST_CANARY_BATCH_04_DEBATE_49_REPAIR_PROTOCOL_ID,
    packetIndex,
    productionCanary: false,
    batchNumber: 4,
    stagingOnly: true,
    debateNumber: "49",
    debateId: publicationPacket.debateId,
    repairType: "critique-word-boundary",
    immutableBaseOutput: POST_CANARY_BATCH_04_DEBATE_49_BASE_OUTPUT,
    publicationPacket: POST_CANARY_BATCH_04_DEBATE_49_PUBLICATION_PACKET,
    participantJudgmentWasScoreBlind: true,
    scoresRepositoryOwnedAndImmutable: true,
    constraints: {
      writableFields,
      labels: ["Strongest feature:", "Principal limitation:", "Live burden:", "Locked score:"],
      generationTargetWords: [112, 118],
      acceptanceWords: [105, 130],
      preferredMinimumCharacters: 900,
      acceptanceMinimumCharacters: 880,
      exactSentenceCount: 4,
      terminalPunctuation: true,
      unexpectedCJKHangulKanaAndReplacementCharactersRejected: true,
      preserveAdjudicatedSubstanceAndLockedScoreBand: true,
      scoresUnavailableAsOutputFields: true
    },
    corrections
  };
  const schema = buildDebate49RepairSchema(packet);
  const packetPath = `${ROOT}/packets/packet-${packetIndex}.json`;
  const schemaPath = `${ROOT}/schemas/packet-${packetIndex}.schema.json`;
  const packetBytes = prettyJsonBytes(packet);
  const schemaBytes = prettyJsonBytes(schema);
  const copiedInputBytes = bytesByFile[PRODUCTION_WORKFLOW].length +
    bytesByFile[READINESS_WORKFLOW].length + bytesByFile[OUTPUT_CONTRACT].length +
    bytesByFile[MANUAL].length + packetBytes.length + schemaBytes.length;
  const repairOutput = `${ROOT}/outputs/packet-${packetIndex}.json`;
  const validation = `${ROOT}/validations/packet-${packetIndex}.json`;
  const provenance = `${ROOT}/provenance/packet-${packetIndex}.json`;
  generated.push([packetPath, packetBytes], [schemaPath, schemaBytes]);
  packets.push(packet);
  contexts.push({ contextIndex: packetIndex, packetIndex, debateNumber: "49",
    debateId: publicationPacket.debateId, packet: packetPath,
    packetSha256: sha256(packetBytes), schema: schemaPath,
    schemaSha256: sha256(schemaBytes), writableFields,
    writableFieldCount: writableFields.length, packetBytes: packetBytes.length,
    schemaBytes: schemaBytes.length, copiedInputBytes, repairOutput, validation, provenance });
  const correctedCritiques = {};
  for (const correction of corrections) {
    const sentences = correction.originalCritique.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
    while (wordCount(sentences.join(" ")) > 130) {
      const tokens = sentences[1].split(/\s+/);
      assertV4(tokens.length > 6, `${correction.moveId}: synthetic shortening failed`);
      tokens.splice(tokens.length - 2, 1);
      sentences[1] = tokens.join(" ");
    }
    correctedCritiques[correction.moveId] = sentences.join(" ");
  }
  syntheticRepairs.push({ schemaVersion: POST_CANARY_BATCH_04_DEBATE_49_REPAIR_OUTPUT_VERSION,
    protocolId: POST_CANARY_BATCH_04_DEBATE_49_REPAIR_PROTOCOL_ID,
    packetIndex, debateNumber: "49", debateId: publicationPacket.debateId,
    assessmentModel: POST_CANARY_BATCH_04_PUBLICATION_MODEL.label,
    completedAt: frozenAt, correctedCritiques });
}
assertV4(contexts.length === 11 && contexts.every((context) => context.writableFieldCount === 2) &&
  new Set(contexts.flatMap((context) => context.writableFields)).size === 22,
"exactly eleven disjoint two-field contexts are required");
const syntheticMerge = mergeAndValidateDebate49Repairs({ baseOutput,
  repairs: syntheticRepairs, repairPackets: packets, publicationPacket, repairFields });
assertV4(syntheticMerge.fullValidation.status === "passed" &&
  syntheticMerge.fullValidation.moves === 24 &&
  syntheticMerge.fullValidation.lockedScoresUnchanged === true,
"synthetic repair merge failed complete Debate 49 validation");

const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const MERGED_OUTPUT = `${ROOT}/merged/debate-49.json`;
const COMPLETE_VALIDATION = `${ROOT}/complete-debate-validation.json`;
const MERGE_AUDIT = `${ROOT}/merge-audit.json`;
const futureOutputs = [
  ...contexts.flatMap((context) => [context.repairOutput, context.validation, context.provenance]),
  ACTIVATION, EXECUTION, ANALYSIS, MERGED_OUTPUT, COMPLETE_VALIDATION, MERGE_AUDIT
];
const sourceHashes = {};
for (const file of [...new Set(STATIC_SOURCE_FILES)].sort()) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
for (const context of contexts) {
  sourceHashes[context.packet] = context.packetSha256;
  sourceHashes[context.schema] = context.schemaSha256;
}
for (const file of [MANIFEST, ...generated.map(([file]) => file), ...futureOutputs]) {
  assertV4(!(await exists(file)), `${file} already exists`);
}
for (const file of futureOutputs) {
  assertV4(!Object.hasOwn(sourceHashes, file), `future output hash included: ${file}`);
}
const rampPhases = [
  { phase: "operational-canary-one", maximumParallelContexts: 1,
    contextIndexes: [0], expansionRequiresAllValid: true },
  { phase: "ramp-two", maximumParallelContexts: 2,
    contextIndexes: [1, 2], expansionRequiresAllValid: true },
  { phase: "steady-two", maximumParallelContexts: 2,
    contextIndexes: [3, 4, 5, 6, 7, 8, 9, 10], expansionRequiresAllValid: false }
];
const stopRules = Object.fromEntries([
  "sourceHashMismatchBlocks", "packetOrSchemaHashMismatchBlocks",
  "preexistingFutureOutputBlocks", "separateActivationRequired",
  "nonSubscriptionAuthenticationBlocks", "apiKeyVisibilityBlocks",
  "nonIsolatedContextBlocks", "otherRepairPacketVisibilityBlocks",
  "legacyAssessmentVisibilityBlocks", "otherDebateOrRankingVisibilityBlocks",
  "fieldSetExpansionBlocks", "scoreVisibilityOrAuthorshipBlocks",
  "adjudicatedSubstanceOrLockedScoreBandMutationBlocks",
  "invalidOutputBlocksAtFrozenRampBoundary", "timeoutBlocksAtFrozenRampBoundary",
  "automaticRetryBlocks", "timeoutExtensionBlocks", "recursiveCorrectionBlocks",
  "remainingSixContextExecutionBlocks", "paidServiceBlocks",
  "publicationFinalizationBlocks", "productionMutationBlocks", "nextBatchSelectionBlocks"
].map((key) => [key, true]));

const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-debate-49-publication-resumption-repair-execution-preparation-manifest",
  protocolId: POST_CANARY_BATCH_04_DEBATE_49_REPAIR_PROTOCOL_ID,
  status:
    "frozen-eleven-isolated-twenty-two-field-batch-04-debate-49-publication-resumption-repair-contexts-prepared-under-standing-authorization",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 4, stagingOnly: true,
  developmentValidationOnly: false, AIOnly: true,
  userAuthorization: {
    instruction: standing.record.userAuthorization.instruction,
    resolvedScope:
      "prepare, validate, freeze, activate, and execute eleven bounded Debate 49 publication-repair packets exposing exactly twenty-two diagnosed critique fields",
    standingAuthorizationApplied: true,
    standingAuthorizationSha256: standing.sha256,
    directIncrementalCostUsdMaximum: 0,
    contextsPrepared: 11,
    writableFieldsPrepared: 22,
    repairModelExecution: false,
    remainingSixContextExecution: false,
    paidServices: false, publicationFinalization: false,
    productionMutation: false, nextBatchSelection: false
  },
  model: structuredClone(POST_CANARY_BATCH_04_PUBLICATION_MODEL),
  costEstimate: {
    authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    contexts: 11,
    expectedParallelWallMinutes: [8, 25],
    expectedAggregateModelMinutes: [12, 40],
    absoluteGateTimeoutMinutes: 60,
    estimateBasis: {
      source:
        "docs/assessment-production/post-canary-continuation-v1/batch-04/publication-reconstruction/repair-1/model-execution.json",
      historicalContexts: 2,
      historicalWallMinutes: 1.53,
      scalingRule: "eleven-context-field-disjoint-repair-with-one-to-two-ramp-and-contingency"
    }
  },
  executionEnvironment: {
    codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(),
    authentication: "ChatGPT subscription", APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true, isolatedTemporaryWorkingDirectories: true
  },
  inputs: { productionWorkflow: PRODUCTION_WORKFLOW, readinessWorkflow: READINESS_WORKFLOW,
    outputContract: OUTPUT_CONTRACT, manual: MANUAL, diagnosis: DIAGNOSIS,
    failedExecution: FAILED_EXECUTION, failedAnalysis: FAILED_ANALYSIS,
    immutableBaseOutput: POST_CANARY_BATCH_04_DEBATE_49_BASE_OUTPUT,
    publicationPacket: POST_CANARY_BATCH_04_DEBATE_49_PUBLICATION_PACKET,
    standingAuthorization: POST_CANARY_BATCH_04_STANDING_AUTHORIZATION },
  modelInputs: { productionWorkflow: PRODUCTION_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW, outputContract: OUTPUT_CONTRACT,
    manual: MANUAL, filesPerContext: ["production-workflow.md", "readiness-workflow.md",
      "output-contract.md", "repair-manual.md", "packet.json", "schema.json"] },
  sourceHashes,
  contexts,
  isolation: { oneRepairPacketPerFreshContext: true,
    exactlyTwoCritiqueFieldsPerContext: true, onlyFrozenModelInputsAvailable: true,
    participantJudgmentClosed: true, participantJudgmentWasScoreBlind: true,
    scoresUnavailableAsOutputFields: true,
    lockedScoreBandsAvailableOnlyInsideImmutableMoveRecords: true,
    modelCannotAuthorIdentityStructureMoveSelectionOrScores: true,
    otherRepairPacketsUnavailable: true, otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true, rankingsAndWinnerComparisonsUnavailable: true },
  repairContract: { repairType: "critique-word-boundary", writableFields: repairFields,
    writableFieldsPerContextMaximum: 2, targetWords: [112, 118],
    acceptanceWords: [105, 130], preferredMinimumCharacters: 900,
    acceptanceMinimumCharacters: 880, exactSentenceCount: 4,
    orderedLabels: ["Strongest feature:", "Principal limitation:", "Live burden:", "Locked score:"],
    preserveAdjudicatedSubstanceAndLockedScoreBand: true,
    originalFailedOutputMustRemainUnchanged: true,
    completeDebateValidationRequiredAfterMerge: true,
    modelAuthoredScoresMaximum: 0 },
  executionPolicy: { contexts: 11, attemptsPerContext: 1, retriesMaximum: 0,
    timeoutExtensionsMaximum: 0, recursiveCorrectionContextsMaximum: 0,
    timeoutMsPerContext: 480000, absoluteGateTimeoutMs: 3600000,
    maximumParallelContexts: 2, schedulerRamp: [1, 2], rampPhases,
    firstRealContextOperationalCanary: true, stopBeforeExpansionOnRampFailure: true,
    continueIndependentContextsWithinStartedSteadyPhaseAfterFailure: true,
    deterministicInputOrder: true, authentication: "ChatGPT subscription",
    APIKeysRemoved: true, removedEnvironmentVariables: REMOVED_API_ENVIRONMENT_VARIABLES,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0, separateActivationRequired: true },
  deterministicValidation: { diagnosedSourceHashesReplayedAtFreeze: true,
    elevenBoundedFieldSchemasReproducedAtFreeze: true,
    originalCritiquesMatchDiagnosedCounts: true,
    completeOutputPassesAfterSyntheticInMemoryBoundaryRepair: true,
    exactFieldSetRequired: true,
    critiqueWordCharacterSentenceLabelAndPunctuationContractRequired: true,
    lockedScoresUnchanged: true, modelAuthoredScores: 0 },
  stopRules,
  authorization: { executionActivationPreparation: true,
    standingAuthorizationPermitsActivation: true, repairModelContexts: false,
    repairModelExecution: false, deterministicRepairOutputValidation: false,
    deterministicMergeAndCompleteValidation: false, deterministicAnalysis: false,
    retry: false, timeoutExtension: false, recursiveCorrectionModelExecution: false,
    remainingSixContextExecution: false, publicationFinalization: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false },
  totals: { debates: 1, contexts: 11, writableFields: 22,
    modelContextsExecuted: 0, modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0, paidServiceCallsThisStage: 0,
    directIncrementalCostUsd: 0 },
  artifacts: { activation: ACTIVATION, execution: EXECUTION, analysis: ANALYSIS,
    originalFailedOutput: POST_CANARY_BATCH_04_DEBATE_49_BASE_OUTPUT,
    repairOutputs: contexts.map((context) => context.repairOutput),
    validations: contexts.map((context) => context.validation),
    provenance: contexts.map((context) => context.provenance),
    mergedOutput: MERGED_OUTPUT, completeValidation: COMPLETE_VALIDATION,
    mergeAudit: MERGE_AUDIT },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  nextAuthorizedAction:
    "activate-and-execute-exactly-eleven-frozen-debate-49-publication-resumption-repair-contexts-under-standing-authorization"
};

if (shouldWrite) {
  for (const [file, bytes] of generated) {
    await mkdir(path.dirname(path.resolve(file)), { recursive: true });
    await writeFile(path.resolve(file), bytes);
  }
  await writeFile(path.resolve(MANIFEST), prettyJsonBytes(manifest));
}
console.log(JSON.stringify({
  status: shouldWrite ? manifest.status : "preview",
  debateNumber: "49", contexts: 11, writableFields: 22,
  writableFieldsPerContextMaximum: 2, model: manifest.model,
  schedulerRamp: [1, 2], attemptsPerContext: 1, retriesMaximum: 0,
  repairModelContextsAuthorized: false, remainingSixContextExecutionAuthorized: false,
  directIncrementalCostUsd: 0, nextAuthorizedAction: manifest.nextAuthorizedAction
}, null, 2));
