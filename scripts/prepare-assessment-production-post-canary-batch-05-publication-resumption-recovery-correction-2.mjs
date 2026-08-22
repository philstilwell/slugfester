#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_OUTPUT_VERSION,
  POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_PACKET_VERSION,
  POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_PROTOCOL_ID,
  POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_ROOT,
  buildDebate109Correction2Schema,
  correctionMoveId,
  mergeAndValidateDebate109Correction2,
  validateDebate109Correction2Output
} from "./lib/assessment-production-post-canary-batch-05-publication-resumption-recovery-correction-2.mjs";
import {
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_ROOT,
  mergeAndValidateRecovery
} from "./lib/assessment-production-post-canary-batch-05-publication-resumption-recovery.mjs";
import {
  POST_CANARY_BATCH_05_PUBLICATION_MODEL,
  POST_CANARY_BATCH_05_PUBLICATION_ROOT
} from "./lib/assessment-production-post-canary-batch-05-publication.mjs";
import {
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch05StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-05-standing-authorization.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const ROOT = POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_ROOT;
const RECOVERY_ROOT = POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_ROOT;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const DIAGNOSIS = `${ROOT}/failure-diagnosis.json`;
const FAILED_OUTPUT = `${RECOVERY_ROOT}/outputs/context-4.json`;
const FAILED_PACKET = `${RECOVERY_ROOT}/packets/context-4.json`;
const ACCEPTED_CON_OUTPUT = `${RECOVERY_ROOT}/outputs/context-5.json`;
const ACCEPTED_CON_PACKET = `${RECOVERY_ROOT}/packets/context-5.json`;
const BASE_189 = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/outputs/debate-189.json`;
const PUBLICATION_PACKET_189 = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/packets/debate-189.json`;
const PUBLICATION_PACKET_109 = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/packets/debate-109.json`;
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const OUTPUT_CONTRACT =
  "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
const MANUAL = `${ROOT}/manual.md`;
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED_API_ENVIRONMENT_VARIABLES = ["OPENAI_API_KEY", "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"];
const STATIC_SOURCE_FILES = [PRODUCTION_WORKFLOW, READINESS_WORKFLOW, OUTPUT_CONTRACT,
  MANUAL, POST_CANARY_BATCH_05_STANDING_AUTHORIZATION, DIAGNOSIS, FAILED_OUTPUT,
  FAILED_PACKET, ACCEPTED_CON_OUTPUT, ACCEPTED_CON_PACKET, BASE_189,
  PUBLICATION_PACKET_189, PUBLICATION_PACKET_109,
  `${RECOVERY_ROOT}/execution-activation.json`, `${RECOVERY_ROOT}/model-execution.json`,
  `${RECOVERY_ROOT}/analysis.json`,
  ...Array.from({ length: 4 }, (_, index) => `${RECOVERY_ROOT}/packets/context-${index}.json`),
  ...Array.from({ length: 4 }, (_, index) => `${RECOVERY_ROOT}/outputs/context-${index}.json`),
  "scripts/lib/v4-lean-production.mjs", "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication-resumption-recovery.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication-resumption-recovery-correction-2.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-standing-authorization.mjs",
  "scripts/diagnose-assessment-production-post-canary-batch-05-publication-resumption-recovery-correction-2.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-05-publication-resumption-recovery-correction-2.mjs",
  "scripts/test-assessment-production-post-canary-batch-05-publication-resumption-recovery-correction-2-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-05-publication-resumption-recovery-correction-2.mjs",
  "scripts/run-assessment-production-post-canary-batch-05-publication-resumption-recovery-correction-2.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-05-publication-resumption-recovery-correction-2.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const diagnosis = JSON.parse(await readFile(path.resolve(DIAGNOSIS), "utf8"));
const rejectedOutput = JSON.parse(await readFile(path.resolve(FAILED_OUTPUT), "utf8"));
const originalShardPacket = JSON.parse(await readFile(path.resolve(FAILED_PACKET), "utf8"));
const acceptedConOutput = JSON.parse(await readFile(path.resolve(ACCEPTED_CON_OUTPUT), "utf8"));
const acceptedConPacket = JSON.parse(await readFile(path.resolve(ACCEPTED_CON_PACKET), "utf8"));
const base189 = JSON.parse(await readFile(path.resolve(BASE_189), "utf8"));
const publicationPacket189 = JSON.parse(await readFile(path.resolve(PUBLICATION_PACKET_189), "utf8"));
const publicationPacket109 = JSON.parse(await readFile(path.resolve(PUBLICATION_PACKET_109), "utf8"));
await loadAndValidatePostCanaryBatch05StandingAuthorization();
assertV4(diagnosis.status ===
  "frozen-diagnosed-batch-05-debate-109-pro-shared-eight-critique-word-overruns" &&
  diagnosis.failedFieldCount === 8 && diagnosis.excessWordsTotal === 52 &&
  diagnosis.diagnosticReplay?.result?.status === "passed" &&
  diagnosis.minimumBoundedRecursiveRecovery?.explicitlyAuthorizedOneTimeException === true &&
  diagnosis.minimumBoundedRecursiveRecovery?.packetCount === 4 &&
  diagnosis.minimumBoundedRecursiveRecovery?.furtherRecursiveRecoveryMaximum === 0,
"the frozen correction-2 diagnosis changed");
for (const [file, digest] of Object.entries(diagnosis.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `${file}: diagnosed correction-2 source drifted`);
}

const failureByField = new Map(diagnosis.failedFields.map((row) => [row.path, row]));
const contexts = [];
const generated = [];
const packets = [];
const syntheticOutputs = [];
for (let packetIndex = 0; packetIndex < 4; packetIndex += 1) {
  const writableFields = diagnosis.minimumBoundedRecursiveRecovery.partition[packetIndex];
  const corrections = writableFields.map((field) => {
    const moveId = correctionMoveId(field);
    const originalCritique = rejectedOutput.content.moveProse[moveId].critique;
    const lockedMove = publicationPacket109.moves.find((move) => move.moveId === moveId);
    const defect = failureByField.get(field);
    assertV4(lockedMove && defect && wordCount(originalCritique) === defect.words,
      `${field}: correction-2 source changed`);
    return { field, moveId, originalCritique, originalWords: defect.words,
      originalCharacters: defect.characters,
      excessWordsAboveAcceptanceMaximum: defect.excessWordsAboveAcceptanceMaximum,
      lockedMove };
  });
  const packet = { schemaVersion: POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_PACKET_VERSION,
    protocolId: POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_PROTOCOL_ID,
    contextIndex: packetIndex, packetIndex, productionCanary: false, batchNumber: 5,
    stagingOnly: true, debateNumber: "109", debateId: originalShardPacket.debateId,
    shardId: "shard-01-pro-shared", repairType: "critique-word-boundary",
    immutableRejectedShardOutput: FAILED_OUTPUT, originalShardPacket: FAILED_PACKET,
    oneTimeRecursiveRecoveryException: true, participantJudgmentWasScoreBlind: true,
    publicationIsScoreLocked: true, scoresRepositoryOwnedAndImmutable: true,
    constraints: { writableFields, writableFieldCount: 2, maximumWritableFields: 2,
      allOtherShardFieldsImmutable: true, acceptedConShardImmutable: true,
      scoreFieldsUnavailableAsOutputs: true,
      labels: ["Strongest feature:", "Principal limitation:", "Live burden:", "Locked score:"],
      generationTargetWords: [112, 118], acceptanceWords: [105, 130],
      preferredMinimumCharacters: 900, acceptanceMinimumCharacters: 880,
      exactSentenceCount: 4, terminalPunctuation: true,
      preserveAdjudicatedSubstanceAndLockedScoreBand: true,
      furtherRecursiveRecoveryMaximum: 0 }, corrections };
  const schema = buildDebate109Correction2Schema(packet);
  const packetPath = `${ROOT}/packets/packet-${packetIndex}.json`;
  const schemaPath = `${ROOT}/schemas/packet-${packetIndex}.schema.json`;
  const packetBytes = pretty(packet);
  const schemaBytes = pretty(schema);
  const output = `${ROOT}/outputs/packet-${packetIndex}.json`;
  const validation = `${ROOT}/validations/packet-${packetIndex}.json`;
  const provenance = `${ROOT}/provenance/packet-${packetIndex}.json`;
  contexts.push({ contextIndex: packetIndex, packetIndex, debateNumber: "109",
    debateId: packet.debateId, shardId: packet.shardId,
    packet: packetPath, packetSha256: sha256(packetBytes),
    schema: schemaPath, schemaSha256: sha256(schemaBytes), writableFields,
    writableFieldCount: 2, packetBytes: packetBytes.length, schemaBytes: schemaBytes.length,
    copiedInputBytes: (await readFile(path.resolve(PRODUCTION_WORKFLOW))).length +
      (await readFile(path.resolve(READINESS_WORKFLOW))).length +
      (await readFile(path.resolve(OUTPUT_CONTRACT))).length +
      (await readFile(path.resolve(MANUAL))).length + packetBytes.length + schemaBytes.length,
    output, validation, provenance });
  generated.push([packetPath, packetBytes], [schemaPath, schemaBytes]);
  packets.push(packet);
  const correctedCritiques = {};
  for (const correction of corrections) {
    const sentences = correction.originalCritique.split(/(?<=[.!?])\s+/).filter(Boolean);
    while (wordCount(sentences.join(" ")) > 130) {
      const words = sentences[1].split(/\s+/);
      words.splice(words.length - 2, 1);
      sentences[1] = words.join(" ");
    }
    correctedCritiques[correction.moveId] = sentences.join(" ");
  }
  const synthetic = { schemaVersion: POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_OUTPUT_VERSION,
    protocolId: POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_PROTOCOL_ID,
    packetIndex, debateNumber: "109", debateId: packet.debateId,
    shardId: packet.shardId, assessmentModel: POST_CANARY_BATCH_05_PUBLICATION_MODEL.label,
    completedAt: frozenAt, correctedCritiques };
  validateDebate109Correction2Output(synthetic, packet);
  syntheticOutputs.push(synthetic);
}
assertV4(contexts.length === 4 && contexts.every((row) => row.writableFieldCount === 2) &&
  new Set(contexts.flatMap((row) => row.writableFields)).size === 8,
"exactly four field-disjoint two-field correction contexts are required");
const syntheticRepair = mergeAndValidateDebate109Correction2({ rejectedOutput,
  correctionOutputs: syntheticOutputs, correctionPackets: packets, originalShardPacket });
const repairOutputs189 = await Promise.all(Array.from({ length: 4 }, (_, index) =>
  readFile(path.resolve(`${RECOVERY_ROOT}/outputs/context-${index}.json`), "utf8").then(JSON.parse)));
const repairPackets189 = await Promise.all(Array.from({ length: 4 }, (_, index) =>
  readFile(path.resolve(`${RECOVERY_ROOT}/packets/context-${index}.json`), "utf8").then(JSON.parse)));
const completeSynthetic = mergeAndValidateRecovery({ base189,
  repairOutputs189, repairPackets189,
  shardOutputs109: [syntheticRepair.repaired, acceptedConOutput],
  shardPackets109: [originalShardPacket, acceptedConPacket],
  publicationPacket189, publicationPacket109 });
assertV4(syntheticRepair.shardValidation.status === "passed" &&
  completeSynthetic.validation189.status === "passed" &&
  completeSynthetic.validation109.status === "passed",
"the frozen correction-2 merge rules failed deterministic replay");

const futureOutputs = [`${ROOT}/execution-activation.json`, `${ROOT}/model-execution.json`,
  `${ROOT}/analysis.json`, ...contexts.flatMap((row) => [row.output, row.validation, row.provenance]),
  `${ROOT}/merged/repaired-pro-shared-shard.json`, `${ROOT}/merged/debate-189.json`,
  `${ROOT}/merged/debate-109.json`, `${ROOT}/complete-validation-debate-189.json`,
  `${ROOT}/complete-validation-debate-109.json`, `${ROOT}/merge-audit-debate-109-pro-shard.json`,
  `${ROOT}/merge-audit-complete-cohort.json`];
for (const file of [MANIFEST, ...generated.map(([file]) => file), ...futureOutputs]) {
  assertV4(!(await exists(file)), `${file} already exists`);
}
const sourceHashes = {};
for (const file of [...new Set(STATIC_SOURCE_FILES)].sort()) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
for (const context of contexts) {
  sourceHashes[context.packet] = context.packetSha256;
  sourceHashes[context.schema] = context.schemaSha256;
}
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-109-correction-2-preparation",
  protocolId: POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_PROTOCOL_ID,
  status: "frozen-four-context-batch-05-debate-109-pro-shared-correction-2-prepared-and-authorized",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 5, stagingOnly: true, AIOnly: true,
  userAuthorization: diagnosis.userAuthorization,
  standingAuthorization: POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  model: structuredClone(POST_CANARY_BATCH_05_PUBLICATION_MODEL),
  costEstimate: { authentication: "ChatGPT subscription", contexts: 4,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    expectedWallMinutes: [4, 20], absoluteGateTimeoutMinutes: 20 },
  inputs: { diagnosis: DIAGNOSIS, immutableRejectedShardOutput: FAILED_OUTPUT,
    originalProShardPacket: FAILED_PACKET, acceptedConOutput: ACCEPTED_CON_OUTPUT,
    acceptedConPacket: ACCEPTED_CON_PACKET, immutableDebate189Output: BASE_189,
    publicationPacket189: PUBLICATION_PACKET_189,
    publicationPacket109: PUBLICATION_PACKET_109 },
  contexts,
  modelInputs: { productionWorkflow: PRODUCTION_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW, outputContract: OUTPUT_CONTRACT, manual: MANUAL },
  isolation: { freshTemporaryWorkingDirectoryPerContext: true,
    freshTemporaryCodexHomePerContext: true, subscriptionAuthFileOnly: true,
    otherCorrectionPacketsUnavailable: true, otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true, APIKeysRemoved: true },
  correctionContract: { oneTimeRecursiveRecoveryException: true, contexts: 4,
    writableFields: 8, maximumWritableFieldsPerPacket: 2,
    immutableProShardFields: 5, acceptedConShardImmutable: true,
    furtherRecursiveRecoveryMaximum: 0, scoresRepositoryOwnedAndImmutable: true,
    modelAuthoredScoresMaximum: 0 },
  executionEnvironment: { codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(), shell: false },
  executionPolicy: { contexts: 4, attemptsPerContext: 1, retriesMaximum: 0,
    timeoutExtensionsMaximum: 0, recursiveCorrectionContextsMaximum: 0,
    timeoutMsPerContext: 600000, absoluteGateTimeoutMs: 1200000,
    maximumParallelContexts: 2, schedulerRamp: [1, 2],
    rampPhases: [{ phase: "correction-canary-one", maximumParallelContexts: 1,
      contextIndexes: [0], expansionRequiresAllValid: true },
    { phase: "correction-pair", maximumParallelContexts: 2,
      contextIndexes: [1, 2], expansionRequiresAllValid: true },
    { phase: "correction-final-one", maximumParallelContexts: 1,
      contextIndexes: [3], expansionRequiresAllValid: true }],
    authentication: "ChatGPT subscription", APIKeysRemoved: true,
    removedEnvironmentVariables: REMOVED_API_ENVIRONMENT_VARIABLES,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    separateActivationRequired: true },
  stopRules: { sourceHashMismatchBlocks: true, packetOrSchemaHashMismatchBlocks: true,
    preexistingFutureOutputBlocks: true, nonSubscriptionAuthenticationBlocks: true,
    apiKeyVisibilityBlocks: true, nonIsolatedContextBlocks: true,
    fieldSetExpansionBlocks: true, immutableFieldMutationBlocks: true,
    invalidOutputBlocks: true, timeoutBlocks: true, automaticRetryBlocks: true,
    timeoutExtensionBlocks: true, furtherRecursiveCorrectionBlocks: true,
    scoreAuthorshipBlocks: true, paidServiceBlocks: true,
    productionMutationBlocks: true, nextBatchSelectionBlocks: true },
  sourceHashes, futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  artifacts: { preparation: MANIFEST, activation: futureOutputs[0],
    execution: futureOutputs[1], analysis: futureOutputs[2],
    repairedProShard: futureOutputs.at(-7), merged189: futureOutputs.at(-6),
    merged109: futureOutputs.at(-5), validation189: futureOutputs.at(-4),
    validation109: futureOutputs.at(-3), proShardMergeAudit: futureOutputs.at(-2),
    completeMergeAudit: futureOutputs.at(-1) },
  authorization: { executionActivationPreparation: true, correctionModelExecution: false,
    deterministicMergeAndValidation: false, fourContextResumption: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: "activate-and-execute-exactly-four-frozen-debate-109-correction-2-contexts"
};
if (shouldWrite) {
  for (const [file, bytes] of generated) {
    await mkdir(path.dirname(path.resolve(file)), { recursive: true });
    await writeFile(path.resolve(file), bytes);
  }
  await writeFile(path.resolve(MANIFEST), pretty(manifest));
}
console.log(JSON.stringify({ status: manifest.status, contextsPrepared: 4,
  writableFieldsPrepared: 8, immutableProShardFields: 5,
  acceptedConShardPreserved: true, completeSyntheticReplay: "passed",
  attemptsPerContext: 1, retriesMaximum: 0, directIncrementalCostUsdMaximum: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
