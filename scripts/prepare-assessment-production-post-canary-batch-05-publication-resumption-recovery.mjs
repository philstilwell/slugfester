#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_DEBATE_109_SHARD_PACKET_VERSION,
  POST_CANARY_BATCH_05_DEBATE_109_SHARD_OUTPUT_VERSION,
  POST_CANARY_BATCH_05_DEBATE_189_REPAIR_PACKET_VERSION,
  POST_CANARY_BATCH_05_DEBATE_189_REPAIR_OUTPUT_VERSION,
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_PROTOCOL_ID,
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_ROOT,
  buildDebate109ShardSchema,
  buildDebate189RepairSchema,
  validateDebate189RepairOutput
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

const ROOT = POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_ROOT;
const RESUMPTION_ROOT = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1`;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const DIAGNOSIS = `${RESUMPTION_ROOT}/failure-diagnosis.json`;
const FAILED_EXECUTION = `${RESUMPTION_ROOT}/model-execution.json`;
const FAILED_ANALYSIS = `${RESUMPTION_ROOT}/analysis.json`;
const BASE_189 = `${RESUMPTION_ROOT}/outputs/debate-189.json`;
const PACKET_189 = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/packets/debate-189.json`;
const PACKET_109 = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/packets/debate-109.json`;
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const OUTPUT_CONTRACT =
  "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
const PUBLICATION_MANUAL = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/manual.md`;
const RECOVERY_MANUAL = `${ROOT}/manual.md`;
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED_API_ENVIRONMENT_VARIABLES = [
  "OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"
];
const STATIC_SOURCE_FILES = [
  PRODUCTION_WORKFLOW, READINESS_WORKFLOW, OUTPUT_CONTRACT, PUBLICATION_MANUAL,
  RECOVERY_MANUAL, POST_CANARY_BATCH_05_STANDING_AUTHORIZATION, DIAGNOSIS,
  FAILED_EXECUTION, FAILED_ANALYSIS, BASE_189, PACKET_189, PACKET_109,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication-resumption-recovery.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-standing-authorization.mjs",
  "scripts/diagnose-assessment-production-post-canary-batch-05-publication-resumption-failures.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-05-publication-resumption-recovery.mjs",
  "scripts/test-assessment-production-post-canary-batch-05-publication-resumption-recovery-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-05-publication-resumption-recovery.mjs",
  "scripts/run-assessment-production-post-canary-batch-05-publication-resumption-recovery.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-05-publication-resumption-recovery.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

const inputFiles = [DIAGNOSIS, FAILED_EXECUTION, FAILED_ANALYSIS, BASE_189,
  PACKET_189, PACKET_109, PRODUCTION_WORKFLOW, READINESS_WORKFLOW,
  OUTPUT_CONTRACT, PUBLICATION_MANUAL, RECOVERY_MANUAL];
const bytesByFile = Object.fromEntries(await Promise.all(
  inputFiles.map(async (file) => [file, await readFile(path.resolve(file))])
));
const parsed = (file) => JSON.parse(bytesByFile[file]);
const diagnosis = parsed(DIAGNOSIS);
const execution = parsed(FAILED_EXECUTION);
const analysis = parsed(FAILED_ANALYSIS);
const base189 = parsed(BASE_189);
const publicationPacket189 = parsed(PACKET_189);
const publicationPacket109 = parsed(PACKET_109);
await loadAndValidatePostCanaryBatch05StandingAuthorization();

assertV4(
  diagnosis.status === "frozen-diagnosed-batch-05-debate-189-validation-and-debate-109-timeout" &&
    diagnosis.debate189?.failedFieldCount === 8 &&
    diagnosis.debate189?.excessWordsTotal === 19 &&
    diagnosis.debate189?.diagnosticReplay?.result?.status === "passed" &&
    diagnosis.debate189?.minimumBoundedRepair?.packetCount === 4 &&
    diagnosis.debate109?.timedOut === true &&
    diagnosis.debate109?.failedPartialOutputReusable === false &&
    diagnosis.debate109?.minimumBoundedResumption?.shardCount === 2 &&
    diagnosis.debate109?.minimumBoundedResumption?.everyOriginalContentFieldAcceptedExactlyOnce === true,
  "the frozen recovery diagnosis changed"
);
assertV4(
  execution.contextsPlanned === 7 && execution.contextsAttempted === 3 &&
    execution.contextsUnattempted === 4 && execution.validContexts === 1 &&
    execution.invalidContexts === 2 && execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.status === "post-canary-batch-05-publication-resumption-complete-with-failure" &&
    analysis.status === "post-canary-batch-05-publication-resumption-failed-validation",
  "the preserved failed resumption gate changed"
);
for (const [file, digest] of Object.entries(diagnosis.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `${file}: diagnosed recovery source drifted`);
}
assertV4(sha256(bytesByFile[BASE_189]) === diagnosis.debate189.outputSha256,
  "the preserved Debate 189 output changed");

const contexts = [];
const generated = [];
const repairPackets189 = [];
const syntheticRepairs189 = [];
const failureByField = new Map(diagnosis.debate189.failedFields.map((row) => [row.path, row]));
for (let packetIndex = 0; packetIndex < 4; packetIndex += 1) {
  const writableFields = diagnosis.debate189.minimumBoundedRepair.partition[packetIndex];
  const corrections = writableFields.map((field) => {
    const match = /^moveProse\.([^.]+)\.critique$/.exec(field);
    assertV4(match, `${field}: invalid repair path`);
    const moveId = match[1];
    const lockedMove = publicationPacket189.moves.find((move) => move.moveId === moveId);
    const originalCritique = base189.moveProse?.[moveId]?.critique;
    const defect = failureByField.get(field);
    assertV4(lockedMove && originalCritique && defect && wordCount(originalCritique) === defect.words,
      `${field}: diagnosed repair source changed`);
    return { field, moveId, originalCritique, originalWords: defect.words,
      originalCharacters: defect.characters,
      excessWordsAboveAcceptanceMaximum: defect.excessWordsAboveAcceptanceMaximum,
      lockedMove };
  });
  const packet = {
    schemaVersion: POST_CANARY_BATCH_05_DEBATE_189_REPAIR_PACKET_VERSION,
    protocolId: POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_PROTOCOL_ID,
    contextIndex: packetIndex, packetIndex, productionCanary: false, batchNumber: 5,
    stagingOnly: true, debateNumber: "189", debateId: publicationPacket189.debateId,
    repairType: "critique-word-boundary",
    immutableBaseOutput: BASE_189, publicationPacket: PACKET_189,
    participantJudgmentWasScoreBlind: true, publicationIsScoreLocked: true,
    scoresRepositoryOwnedAndImmutable: true,
    constraints: {
      writableFields, writableFieldCount: 2, maximumWritableFields: 2,
      allOtherPublicationFieldsImmutable: true, scoreFieldsUnavailableAsOutputs: true,
      labels: ["Strongest feature:", "Principal limitation:", "Live burden:", "Locked score:"],
      generationTargetWords: [112, 118], acceptanceWords: [105, 130],
      preferredMinimumCharacters: 900, acceptanceMinimumCharacters: 880,
      exactSentenceCount: 4, terminalPunctuation: true,
      unexpectedCJKHangulKanaAndReplacementCharactersRejected: true,
      preserveAdjudicatedSubstanceAndLockedScoreBand: true
    },
    corrections
  };
  const schema = buildDebate189RepairSchema(packet);
  const packetPath = `${ROOT}/packets/context-${packetIndex}.json`;
  const schemaPath = `${ROOT}/schemas/context-${packetIndex}.schema.json`;
  const packetBytes = pretty(packet);
  const schemaBytes = pretty(schema);
  const output = `${ROOT}/outputs/context-${packetIndex}.json`;
  const validation = `${ROOT}/validations/context-${packetIndex}.json`;
  const provenance = `${ROOT}/provenance/context-${packetIndex}.json`;
  contexts.push({ contextIndex: packetIndex, contextType: "debate-189-two-field-repair",
    debateNumber: "189", debateId: packet.debateId, packetIndex,
    packet: packetPath, packetSha256: sha256(packetBytes),
    schema: schemaPath, schemaSha256: sha256(schemaBytes), writableFields,
    writableFieldCount: 2, packetBytes: packetBytes.length, schemaBytes: schemaBytes.length,
    copiedInputBytes: bytesByFile[PRODUCTION_WORKFLOW].length +
      bytesByFile[READINESS_WORKFLOW].length + bytesByFile[OUTPUT_CONTRACT].length +
      bytesByFile[PUBLICATION_MANUAL].length + bytesByFile[RECOVERY_MANUAL].length +
      packetBytes.length + schemaBytes.length, output, validation, provenance });
  generated.push([packetPath, packetBytes], [schemaPath, schemaBytes]);
  repairPackets189.push(packet);
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
  const synthetic = {
    schemaVersion: POST_CANARY_BATCH_05_DEBATE_189_REPAIR_OUTPUT_VERSION,
    protocolId: POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_PROTOCOL_ID,
    packetIndex, debateNumber: "189", debateId: packet.debateId,
    assessmentModel: POST_CANARY_BATCH_05_PUBLICATION_MODEL.label,
    completedAt: frozenAt, correctedCritiques
  };
  validateDebate189RepairOutput(synthetic, packet);
  syntheticRepairs189.push(synthetic);
}

const shardDefinitions = diagnosis.debate109.minimumBoundedResumption.shards;
for (let shardIndex = 0; shardIndex < 2; shardIndex += 1) {
  const definition = shardDefinitions[shardIndex];
  const contextIndex = 4 + shardIndex;
  const packet = {
    schemaVersion: POST_CANARY_BATCH_05_DEBATE_109_SHARD_PACKET_VERSION,
    protocolId: POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_PROTOCOL_ID,
    contextIndex, shardId: definition.shardId, side: definition.side,
    productionCanary: false, batchNumber: 5, stagingOnly: true,
    debateNumber: "109", debateId: publicationPacket109.debateId,
    resumptionType: "minimum-side-based-field-disjoint-publication-shard",
    originalPublicationPacketPath: PACKET_109,
    originalFailedPartialOutputReusable: false,
    participantJudgmentWasScoreBlind: true, publicationIsScoreLocked: true,
    scoresRepositoryOwnedAndImmutable: true,
    includesSummary: definition.side === "pro", moveIds: definition.moveIds,
    writableFields: definition.writableFields, writableFieldCount: 13,
    allOtherFieldsUnavailableAndImmutable: true,
    publicationPacket: publicationPacket109
  };
  assertV4(packet.moveIds.every((moveId) => publicationPacket109.moves
    .some((move) => move.moveId === moveId && move.side === packet.side)),
  `${definition.shardId}: side move partition changed`);
  const schema = buildDebate109ShardSchema(packet);
  const packetPath = `${ROOT}/packets/context-${contextIndex}.json`;
  const schemaPath = `${ROOT}/schemas/context-${contextIndex}.schema.json`;
  const packetBytes = pretty(packet);
  const schemaBytes = pretty(schema);
  const output = `${ROOT}/outputs/context-${contextIndex}.json`;
  const validation = `${ROOT}/validations/context-${contextIndex}.json`;
  const provenance = `${ROOT}/provenance/context-${contextIndex}.json`;
  contexts.push({ contextIndex, contextType: "debate-109-field-disjoint-resumption-shard",
    debateNumber: "109", debateId: packet.debateId, shardId: definition.shardId,
    side: definition.side, includesSummary: packet.includesSummary,
    packet: packetPath, packetSha256: sha256(packetBytes),
    schema: schemaPath, schemaSha256: sha256(schemaBytes),
    writableFields: definition.writableFields, writableFieldCount: 13,
    packetBytes: packetBytes.length, schemaBytes: schemaBytes.length,
    copiedInputBytes: bytesByFile[PRODUCTION_WORKFLOW].length +
      bytesByFile[READINESS_WORKFLOW].length + bytesByFile[OUTPUT_CONTRACT].length +
      bytesByFile[PUBLICATION_MANUAL].length + bytesByFile[RECOVERY_MANUAL].length +
      packetBytes.length + schemaBytes.length, output, validation, provenance });
  generated.push([packetPath, packetBytes], [schemaPath, schemaBytes]);
}

assertV4(contexts.length === 6 && contexts.slice(0, 4).every((row) => row.writableFieldCount === 2) &&
  contexts.slice(4).every((row) => row.writableFieldCount === 13),
"the six-context recovery boundary changed");
const repairFields = contexts.slice(0, 4).flatMap((row) => row.writableFields);
const shardFields = contexts.slice(4).flatMap((row) => row.writableFields);
assertV4(new Set(repairFields).size === 8 && new Set(shardFields).size === 26,
  "recovery fields are not disjoint");

const futureOutputs = [
  `${ROOT}/execution-activation.json`, `${ROOT}/model-execution.json`, `${ROOT}/analysis.json`,
  ...contexts.flatMap((row) => [row.output, row.validation, row.provenance]),
  `${ROOT}/merged/debate-189.json`, `${ROOT}/merged/debate-109.json`,
  `${ROOT}/complete-validation-debate-189.json`, `${ROOT}/complete-validation-debate-109.json`,
  `${ROOT}/merge-audit-debate-189.json`, `${ROOT}/merge-audit-debate-109.json`
];
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
const rampPhases = [
  { phase: "repair-canary-one", maximumParallelContexts: 1, contextIndexes: [0], expansionRequiresAllValid: true },
  { phase: "repair-pair", maximumParallelContexts: 2, contextIndexes: [1, 2], expansionRequiresAllValid: true },
  { phase: "repair-final-one", maximumParallelContexts: 1, contextIndexes: [3], expansionRequiresAllValid: true },
  { phase: "minimum-resumption-shards", maximumParallelContexts: 2, contextIndexes: [4, 5], expansionRequiresAllValid: true }
];
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-resumption-recovery-preparation",
  protocolId: POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_PROTOCOL_ID,
  status: "frozen-six-context-batch-05-publication-resumption-recovery-prepared-and-authorized",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 5, stagingOnly: true, AIOnly: true,
  userAuthorization: diagnosis.userAuthorization,
  standingAuthorization: POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  model: structuredClone(POST_CANARY_BATCH_05_PUBLICATION_MODEL),
  costEstimate: { authentication: "ChatGPT subscription", contexts: 6,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    expectedWallMinutes: [12, 40], absoluteGateTimeoutMinutes: 40 },
  inputs: { diagnosis: DIAGNOSIS, failedExecution: FAILED_EXECUTION,
    failedAnalysis: FAILED_ANALYSIS, immutableDebate189Output: BASE_189,
    publicationPacket189: PACKET_189, publicationPacket109: PACKET_109 },
  contexts,
  modelInputs: { productionWorkflow: PRODUCTION_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW, outputContract: OUTPUT_CONTRACT,
    publicationManual: PUBLICATION_MANUAL, recoveryManual: RECOVERY_MANUAL },
  isolation: { freshTemporaryWorkingDirectoryPerContext: true,
    freshTemporaryCodexHomePerContext: true, subscriptionAuthFileOnly: true,
    otherRecoveryContextsUnavailable: true, otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true, failedPartialOutputUnavailable: true,
    APIKeysRemoved: true },
  recoveryContract: { contexts: 6, debates: ["189", "109"],
    debate189RepairPackets: 4, debate189WritableFields: 8,
    maximumWritableFieldsPerRepairPacket: 2, debate109ResumptionShards: 2,
    debate109OriginalContentFields: 26, debate109WritableFieldsPerShard: 13,
    everyOriginalDebate109ContentFieldAcceptedExactlyOnce: true,
    originalFailedDebate109PartialOutputReusable: false,
    scoresRepositoryOwnedAndImmutable: true, modelAuthoredScoresMaximum: 0 },
  executionEnvironment: { codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(),
    shell: false },
  executionPolicy: { contexts: 6, attemptsPerContext: 1, retriesMaximum: 0,
    timeoutExtensionsMaximum: 0, recursiveCorrectionContextsMaximum: 0,
    timeoutMsPerContext: 600000, absoluteGateTimeoutMs: 2400000,
    maximumParallelContexts: 2, schedulerRamp: [1, 2], rampPhases,
    deterministicInputOrder: true, authentication: "ChatGPT subscription",
    APIKeysRemoved: true, removedEnvironmentVariables: REMOVED_API_ENVIRONMENT_VARIABLES,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    separateActivationRequired: true },
  stopRules: { sourceHashMismatchBlocks: true, packetOrSchemaHashMismatchBlocks: true,
    preexistingFutureOutputBlocks: true, nonSubscriptionAuthenticationBlocks: true,
    apiKeyVisibilityBlocks: true, nonIsolatedContextBlocks: true,
    fieldSetExpansionBlocks: true, scoreVisibilityOrAuthorshipBlocks: true,
    immutableFieldMutationBlocks: true, invalidOutputBlocks: true, timeoutBlocks: true,
    automaticRetryBlocks: true, timeoutExtensionBlocks: true,
    recursiveCorrectionBlocks: true, paidServiceBlocks: true,
    productionMutationBlocks: true, nextBatchSelectionBlocks: true },
  sourceHashes, futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  artifacts: { preparation: MANIFEST, activation: futureOutputs[0],
    execution: futureOutputs[1], analysis: futureOutputs[2],
    merged189: futureOutputs.at(-6), merged109: futureOutputs.at(-5),
    validation189: futureOutputs.at(-4), validation109: futureOutputs.at(-3),
    mergeAudit189: futureOutputs.at(-2), mergeAudit109: futureOutputs.at(-1) },
  authorization: { executionActivationPreparation: true, recoveryModelExecution: false,
    deterministicOutputValidation: false, deterministicMergeAndCompleteValidation: false,
    fourContextResumption: false, paidServices: false, productionMutation: false,
    nextBatchSelection: false },
  nextAuthorizedAction: "activate-and-execute-exactly-six-frozen-publication-resumption-recovery-contexts"
};

if (shouldWrite) {
  for (const [file, bytes] of generated) {
    await mkdir(path.dirname(path.resolve(file)), { recursive: true });
    await writeFile(path.resolve(file), bytes);
  }
  await writeFile(path.resolve(MANIFEST), pretty(manifest));
}
console.log(JSON.stringify({ status: manifest.status, contextsPrepared: 6,
  debate189RepairContexts: 4, debate109ResumptionShards: 2,
  debate189WritableFields: 8, debate109WritableFields: 26,
  schedulerRamp: [1, 2], attemptsPerContext: 1, retriesMaximum: 0,
  directIncrementalCostUsdMaximum: 0, nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
