#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DEBATE_27_PUBLICATION_REPAIR_FIELDS,
  DEBATE_27_PUBLICATION_REPAIR_OUTPUT_VERSION,
  DEBATE_27_PUBLICATION_REPAIR_PACKET_VERSION,
  DEBATE_27_PUBLICATION_REPAIR_PARTITIONS,
  DEBATE_27_PUBLICATION_REPAIR_PROTOCOL_ID,
  DEBATE_27_PUBLICATION_REPAIR_ROOT,
  buildDebate27RepairSchema,
  debate27RepairMoveId,
  mergeAndValidateDebate27Repairs
} from "./lib/assessment-production-post-canary-batch-03-publication-resumption-3-repair.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--frozen-at");
const frozenAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const ROOT = DEBATE_27_PUBLICATION_REPAIR_ROOT;
const PUBLICATION_ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction";
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const DIAGNOSIS = `${ROOT}/failure-diagnosis.json`;
const BASE_OUTPUT = `${PUBLICATION_ROOT}/resumption-3/outputs/debate-27.json`;
const PUBLICATION_PACKET = `${PUBLICATION_ROOT}/packets/debate-27.json`;
const WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS = "docs/assessment-workflow-v4.2.21.17.41.md";
const OUTPUT_CONTRACT = "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
const MANUAL = `${ROOT}/manual.md`;
const REFERENCE_CATALOG = `${PUBLICATION_ROOT}/reference-catalog.json`;
const STANDING_AUTHORIZATION = "docs/assessment-production/post-canary-continuation-v1/batch-03/standing-authorization.json";
const RECOVERY_AUTHORIZATION = "docs/assessment-production/post-canary-continuation-v1/batch-03/failure-recovery-standing-authorization.json";
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED_API_ENVIRONMENT_VARIABLES = ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"];
const acceptedOutputs = {
  "124": `${PUBLICATION_ROOT}/repair-1/merged/debate-124.json`,
  "14": `${PUBLICATION_ROOT}/resumption-1/outputs/debate-14.json`,
  "58": `${PUBLICATION_ROOT}/resumption-1/repair-1/merged/debate-58.json`,
  "150": `${PUBLICATION_ROOT}/resumption-1/repair-1/merged/debate-150.json`,
  "157": `${PUBLICATION_ROOT}/resumption-2/repair-1/resumption-1/merged/debate-157.json`,
  "102": `${PUBLICATION_ROOT}/resumption-3/outputs/debate-102.json`,
  "09": `${PUBLICATION_ROOT}/resumption-3/outputs/debate-09.json`,
  "181": `${PUBLICATION_ROOT}/resumption-3/outputs/debate-181.json`,
  "138": `${PUBLICATION_ROOT}/resumption-3/outputs/debate-138.json`
};
const scriptFiles = [
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-publication-resumption-3-repair.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-03-publication-resumption-3-repair.mjs",
  "scripts/test-assessment-production-post-canary-batch-03-publication-resumption-3-repair-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-03-publication-resumption-3-repair.mjs",
  "scripts/run-assessment-production-post-canary-batch-03-publication-resumption-3-repair.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-03-publication-resumption-3-repair.mjs"
];
const inputFiles = [DIAGNOSIS, BASE_OUTPUT, PUBLICATION_PACKET, WORKFLOW, READINESS, OUTPUT_CONTRACT, MANUAL, REFERENCE_CATALOG, STANDING_AUTHORIZATION, RECOVERY_AUTHORIZATION, ...scriptFiles, ...Object.values(acceptedOutputs)];
for (const debateNumber of Object.keys(acceptedOutputs)) inputFiles.push(`${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const bytesByFile = Object.fromEntries(await Promise.all([...new Set(inputFiles)].map(async (file) => [file, await readFile(path.resolve(file))])));
const parsed = (file) => JSON.parse(bytesByFile[file]);
const diagnosis = parsed(DIAGNOSIS);
const baseOutput = parsed(BASE_OUTPUT);
const publicationPacket = parsed(PUBLICATION_PACKET);
assertV4(
  diagnosis.status === "diagnosed-debate-27-seven-critique-word-overruns-only" && diagnosis.preservedFailure?.outputSha256 === sha256(bytesByFile[BASE_OUTPUT]) &&
    diagnosis.boundedRepairPlan?.repairContexts === 4 && canonicalJson(diagnosis.boundedRepairPlan?.partitions) === canonicalJson(DEBATE_27_PUBLICATION_REPAIR_PARTITIONS) &&
    diagnosis.deterministicReplay?.replay?.status === "passed" && diagnosis.deterministicReplay?.substitutionPersisted === false,
  "the frozen Debate 27 failure diagnosis changed"
);
const failureByField = new Map(diagnosis.preservedFailure.fields.map((entry) => [entry.path, entry]));
const contexts = [];
const generated = [];
for (let packetIndex = 0; packetIndex < 4; packetIndex += 1) {
  const writableFields = DEBATE_27_PUBLICATION_REPAIR_PARTITIONS[packetIndex];
  const corrections = writableFields.map((field) => {
    const moveId = debate27RepairMoveId(field);
    const originalCritique = baseOutput.moveProse?.[moveId]?.critique;
    const lockedMove = publicationPacket.moves.find((move) => move.moveId === moveId);
    const diagnosed = failureByField.get(field);
    assertV4(originalCritique && lockedMove && diagnosed, `${field}: repair source missing`);
    return { field, moveId, originalCritique, originalWords: diagnosed.words, originalCharacters: diagnosed.characters, excessWordsAboveAcceptanceMaximum: diagnosed.excessWordsAboveMaximum, lockedMove };
  });
  const packet = {
    schemaVersion: DEBATE_27_PUBLICATION_REPAIR_PACKET_VERSION,
    protocolId: DEBATE_27_PUBLICATION_REPAIR_PROTOCOL_ID,
    packetIndex,
    productionCanary: false,
    batchNumber: 3,
    stagingOnly: true,
    debateNumber: "27",
    debateId: publicationPacket.debateId,
    repairType: "critique-word-boundary",
    immutableBaseOutput: BASE_OUTPUT,
    publicationPacket: PUBLICATION_PACKET,
    participantJudgmentWasScoreBlind: true,
    scoresRepositoryOwnedAndImmutable: true,
    constraints: {
      writableFields,
      orderedLabels: ["Strongest feature:", "Principal limitation:", "Live burden:", "Locked score:"],
      generationTargetWords: [112, 118],
      acceptanceWords: [105, 130],
      preferredMinimumCharacters: 900,
      acceptanceMinimumCharacters: 880,
      exactSentenceCount: 4,
      terminalPunctuation: true,
      preserveAdjudicatedSubstanceAndLockedScoreBand: true,
      scoresUnavailableAsOutputFields: true
    },
    corrections
  };
  const schema = buildDebate27RepairSchema(packet);
  const packetPath = `${ROOT}/packets/packet-${packetIndex}.json`;
  const schemaPath = `${ROOT}/schemas/packet-${packetIndex}.schema.json`;
  const packetBytes = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  const schemaBytes = Buffer.from(`${JSON.stringify(schema, null, 2)}\n`);
  generated.push([packetPath, packetBytes], [schemaPath, schemaBytes]);
  contexts.push({
    contextIndex: packetIndex, packetIndex, debateNumber: "27", debateId: publicationPacket.debateId,
    packet: packetPath, packetSha256: sha256(packetBytes), schema: schemaPath, schemaSha256: sha256(schemaBytes),
    writableFields, writableFieldCount: writableFields.length,
    copiedInputBytes: bytesByFile[WORKFLOW].length + bytesByFile[READINESS].length + bytesByFile[OUTPUT_CONTRACT].length + bytesByFile[MANUAL].length + packetBytes.length + schemaBytes.length,
    repairOutput: `${ROOT}/outputs/packet-${packetIndex}.json`, validation: `${ROOT}/validations/packet-${packetIndex}.json`, provenance: `${ROOT}/provenance/packet-${packetIndex}.json`
  });
}
assertV4(contexts.length === 4 && contexts.every(({ writableFieldCount }) => writableFieldCount >= 1 && writableFieldCount <= 2) && new Set(contexts.flatMap(({ writableFields }) => writableFields)).size === 7, "the four bounded repair contexts changed");
const syntheticTemplate = baseOutput.moveProse["pro-evil-good-divine-ground"].critique;
const syntheticRepairs = contexts.map((context) => ({
  schemaVersion: DEBATE_27_PUBLICATION_REPAIR_OUTPUT_VERSION,
  protocolId: DEBATE_27_PUBLICATION_REPAIR_PROTOCOL_ID,
  packetIndex: context.packetIndex,
  debateNumber: "27",
  debateId: publicationPacket.debateId,
  assessmentModel: "5.6 Sol",
  completedAt: frozenAt,
  correctedCritiques: Object.fromEntries(DEBATE_27_PUBLICATION_REPAIR_PARTITIONS[context.packetIndex].map((field) => [debate27RepairMoveId(field), syntheticTemplate]))
}));
const syntheticMerge = mergeAndValidateDebate27Repairs({ baseOutput, repairOutputs: syntheticRepairs, repairPackets: generated.filter(([file]) => file.includes("/packets/")).map(([, bytes]) => JSON.parse(bytes)), publicationPacket });
assertV4(syntheticMerge.fullValidation.status === "passed" && syntheticMerge.transformations.length === 7, "the frozen merge rule does not clear the diagnosed boundary in memory");
const sourceHashes = Object.fromEntries(Object.entries(bytesByFile).sort(([left], [right]) => left.localeCompare(right)).map(([file, bytes]) => [file, sha256(bytes)]));
for (const context of contexts) { sourceHashes[context.packet] = context.packetSha256; sourceHashes[context.schema] = context.schemaSha256; }
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const MERGED_OUTPUT = `${ROOT}/merged/debate-27.json`;
const COMPLETE_VALIDATION = `${ROOT}/complete-debate-validation.json`;
const MERGE_AUDIT = `${ROOT}/merge-audit.json`;
const COHORT_REPLAY = `${ROOT}/ten-debate-cohort-replay.json`;
const futureOutputs = [ACTIVATION, EXECUTION, ANALYSIS, MERGED_OUTPUT, COMPLETE_VALIDATION, MERGE_AUDIT, COHORT_REPLAY, ...contexts.flatMap((context) => [context.repairOutput, context.validation, context.provenance])];
for (const file of [MANIFEST, ...generated.map(([file]) => file), ...futureOutputs]) assertV4(!(await exists(file)), `${file} already exists`);
const accepted = {};
for (const [debateNumber, output] of Object.entries(acceptedOutputs)) {
  const packet = `${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`;
  accepted[debateNumber] = { debateNumber, output, outputSha256: sha256(bytesByFile[output]), packet, packetSha256: sha256(bytesByFile[packet]) };
}
const rampPhases = [
  { phase: "repair-canary-one", maximumParallelContexts: 1, contextIndexes: [0], expansionRequiresAllValid: true },
  { phase: "repair-ramp-two", maximumParallelContexts: 2, contextIndexes: [1, 2], expansionRequiresAllValid: true },
  { phase: "repair-steady-one", maximumParallelContexts: 1, contextIndexes: [3], expansionRequiresAllValid: false }
];
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-27-publication-repair-execution-preparation-manifest",
  protocolId: DEBATE_27_PUBLICATION_REPAIR_PROTOCOL_ID,
  status: "frozen-four-bounded-seven-field-debate-27-publication-repair-contexts-prepared",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 3, stagingOnly: true,
  userAuthorization: { instruction: diagnosis.userAuthorization.instruction, resolvedScope: diagnosis.userAuthorization.resolvedScope, directIncrementalCostUsdMaximum: 0, contextsPrepared: 4, writableFieldsPrepared: 7, modelExecution: false },
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription" },
  costEstimate: { authentication: "ChatGPT subscription", contexts: 4, directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0, expectedWallMinutes: [3, 20], absoluteGateTimeoutMinutes: 60 },
  executionEnvironment: { codexPath: CODEX_PATH, codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(), authentication: "ChatGPT subscription", APIKeysRemoved: true, isolatedTemporaryCodexHomes: true, isolatedTemporaryWorkingDirectories: true },
  inputs: { diagnosis: DIAGNOSIS, immutableBaseOutput: BASE_OUTPUT, publicationPacket: PUBLICATION_PACKET, acceptedOutputs: accepted, standingAuthorization: STANDING_AUTHORIZATION, failureRecoveryStandingAuthorization: RECOVERY_AUTHORIZATION },
  modelInputs: { productionWorkflow: WORKFLOW, readinessWorkflow: READINESS, outputContract: OUTPUT_CONTRACT, manual: MANUAL, filesPerContext: ["production-workflow.md", "readiness-workflow.md", "output-contract.md", "repair-manual.md", "packet.json", "schema.json"], oneRepairPacketPerContext: true, acceptedOutputsUnavailable: true, otherRepairPacketsUnavailable: true, otherDebatesUnavailable: true },
  sourceHashes, contexts, acceptedOutputs: accepted,
  hashLocks: { diagnosis: { path: DIAGNOSIS, sha256: sourceHashes[DIAGNOSIS] }, packetsAndSchemas: contexts.map(({ packetIndex, packetSha256, schemaSha256 }) => ({ packetIndex, packetSha256, schemaSha256 })), validatorAndMergeRule: { path: "scripts/lib/assessment-production-post-canary-batch-03-publication-resumption-3-repair.mjs", sha256: sourceHashes["scripts/lib/assessment-production-post-canary-batch-03-publication-resumption-3-repair.mjs"], validatorExport: "validateDebate27RepairOutput", mergeExport: "mergeAndValidateDebate27Repairs" } },
  isolation: { oneRepairPacketPerFreshContext: true, atMostTwoWritableFieldsPerContext: true, onlyFrozenModelInputsAvailable: true, participantJudgmentClosedAndScoreBlind: true, scoresImmutable: true, acceptedOutputsUnavailable: true, otherRepairPacketsUnavailable: true, otherDebatesAndLegacyAssessmentsUnavailable: true },
  repairContract: { writableFields: DEBATE_27_PUBLICATION_REPAIR_FIELDS, partitions: DEBATE_27_PUBLICATION_REPAIR_PARTITIONS, writableFieldsPerContextMaximum: 2, targetWords: [112, 118], acceptanceWords: [105, 130], preferredMinimumCharacters: 900, acceptanceMinimumCharacters: 880, exactSentenceCount: 4, preserveAdjudicatedSubstanceAndLockedScoreBand: true, completeDebateAndTenDebateCohortValidationRequired: true, modelAuthoredScoresMaximum: 0 },
  executionPolicy: { contexts: 4, attemptsPerContext: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0, recursiveCorrectionContextsMaximum: 0, timeoutMsPerContext: 480000, absoluteGateTimeoutMs: 3600000, maximumParallelContexts: 2, schedulerRamp: [1, 2], rampPhases, stopBeforeExpansionOnRampFailure: true, continueIndependentContextsWithinStartedPhaseAfterFailure: true, authentication: "ChatGPT subscription", APIKeysRemoved: true, removedEnvironmentVariables: REMOVED_API_ENVIRONMENT_VARIABLES, directIncrementalCostUsdMaximum: 0, separateActivationRequired: true },
  deterministicValidation: { diagnosisAuthenticated: true, exactFourPacketPartitionReproduced: true, syntheticInMemoryMergePassed: true, syntheticSubstitutionPersisted: false, completeDebate27ValidationRequired: true, completeTenDebateCohortReplayRequired: true, expectedCohortDebates: 10, expectedCohortMoves: 200, modelAuthoredScores: 0 },
  stopRules: { anyFailedRepairOutputBlocks: true, sourceHashMismatchBlocks: true, preexistingOutputBlocks: true, fieldSetExpansionBlocks: true, protectedFieldChangeBlocks: true, retryBlocks: true, timeoutExtensionBlocks: true, recursiveRepairBlocks: true, paidServiceBlocks: true, productionMutationMismatchBlocks: true, batch4SelectionBlocks: true },
  authorization: { executionActivationPreparation: true, repairModelExecution: false, deterministicMergeAndCohortReplay: false, retry: false, paidServices: false, productionMutation: false, nextBatchSelection: false },
  artifacts: { activation: ACTIVATION, execution: EXECUTION, analysis: ANALYSIS, mergedOutput: MERGED_OUTPUT, completeValidation: COMPLETE_VALIDATION, mergeAudit: MERGE_AUDIT, cohortReplay: COHORT_REPLAY },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  totals: { debates: 1, contexts: 4, writableFields: 7, acceptedCohortDebates: 9, expectedCohortDebatesAfterMerge: 10, modelContextsExecuted: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 },
  nextAuthorizedAction: "activate-and-execute-exactly-four-frozen-bounded-debate-27-publication-repair-contexts"
};
if (shouldWrite) {
  for (const [file, bytes] of generated) { await mkdir(path.dirname(path.resolve(file)), { recursive: true }); await writeFile(path.resolve(file), bytes); }
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? manifest.status : "validated-preview", contexts: 4, partitions: [2, 2, 2, 1], writableFields: 7, model: manifest.model, schedulerRamp: [1, 2], directIncrementalCostUsd: 0, nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
