#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_07_PUBLICATION_MODEL, POST_CANARY_BATCH_07_PUBLICATION_ROOT } from
  "./lib/assessment-production-post-canary-batch-07-publication.mjs";
import { POST_CANARY_BATCH_07_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch07StandingAuthorization } from
  "./lib/assessment-production-post-canary-batch-07-standing-authorization.mjs";
import { POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_OUTPUT_VERSION,
  POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_PACKET_VERSION,
  POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_ROOT, buildResumption2RepairSchema,
  mergeAndValidateResumption2Repair, resumption2RepairMoveId,
  validateResumption2RepairOutput } from
  "./lib/assessment-production-post-canary-batch-07-publication-resumption-2-repair.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");
const ROOT = POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_ROOT;
const RESUMPTION_ROOT = path.dirname(ROOT);
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const DIAGNOSIS = `${RESUMPTION_ROOT}/failure-diagnosis.json`;
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const OUTPUT_CONTRACT = "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
const MANUAL = `${POST_CANARY_BATCH_07_PUBLICATION_ROOT}/repair-1/manual.md`;
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED = ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"];
const DEBATE_SPECS = Object.freeze([
  { debateNumber: "100", packetCount: 4, fieldCounts: [2, 2, 2, 1], expectedMoves: 19 },
  { debateNumber: "78", packetCount: 8, fieldCounts: [2, 2, 2, 2, 2, 2, 2, 1], expectedMoves: 17 }
]);
const WORKFLOW_SOURCES = [
  "scripts/lib/v4-lean-production.mjs", "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-07-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-07-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-07-publication-resumption-2.mjs",
  "scripts/lib/assessment-production-post-canary-batch-07-publication-resumption-2-repair.mjs",
  "scripts/lib/assessment-production-post-canary-batch-07-standing-authorization.mjs",
  "scripts/diagnose-assessment-production-post-canary-batch-07-publication-resumption-2-failures.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-07-publication-resumption-2-repair.mjs",
  "scripts/test-assessment-production-post-canary-batch-07-publication-resumption-2-repair-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-07-publication-resumption-2-repair.mjs",
  "scripts/run-assessment-production-post-canary-batch-07-publication-resumption-2-repair.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-07-publication-resumption-2-repair.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const diagnosis = JSON.parse(await readFile(path.resolve(DIAGNOSIS), "utf8"));
const standingAuthorization = await loadAndValidatePostCanaryBatch07StandingAuthorization();
assertV4(diagnosis.status ===
  "frozen-diagnosed-batch-07-debates-100-and-78-critique-overruns-stop-rule-triggered" &&
  canonicalJson(diagnosis.preservedExecution?.rejectedDebates) === canonicalJson(["100", "78"]) &&
  canonicalJson(diagnosis.preservedExecution?.unattemptedDebates) ===
    canonicalJson(["113", "180", "02", "182", "56"]) &&
  diagnosis.preservedExecution?.contextsUnattempted === 5,
"the frozen Batch 7 resumption-2 diagnosis changed");
for (const [file, digest] of Object.entries(diagnosis.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `${file}: diagnosed source drifted`);

const contexts = [];
const generated = [];
const syntheticByDebate = new Map();
const packetByDebate = new Map();
const debateInputs = {};
let contextIndex = 0;
for (const spec of DEBATE_SPECS) {
  const diagnosed = diagnosis.debates.find((row) => row.debateNumber === spec.debateNumber);
  assertV4(diagnosed?.failedFieldCount === spec.fieldCounts.reduce((sum, count) => sum + count, 0) &&
    diagnosed.minimumRepairPacketCountAtTwoFieldsMaximum === spec.packetCount,
  `Debate ${spec.debateNumber}: diagnosis or minimum partition changed`);
  const basePath = `${RESUMPTION_ROOT}/outputs/debate-${spec.debateNumber}.json`;
  const publicationPacketPath = `${POST_CANARY_BATCH_07_PUBLICATION_ROOT}/packets/debate-${spec.debateNumber}.json`;
  const baseOutput = JSON.parse(await readFile(path.resolve(basePath), "utf8"));
  const publicationPacket = JSON.parse(await readFile(path.resolve(publicationPacketPath), "utf8"));
  debateInputs[spec.debateNumber] = { immutableRejectedOutput: basePath,
    publicationPacket: publicationPacketPath, failedFields: diagnosed.failedFieldCount,
    repairPackets: spec.packetCount };
  const byField = new Map(diagnosed.failedFields.map((row) => [row.path, row]));
  const fields = diagnosed.failedFields.map((row) => row.path);
  const debatePackets = [];
  const syntheticOutputs = [];
  let offset = 0;
  for (let packetIndex = 0; packetIndex < spec.packetCount; packetIndex += 1) {
    const count = spec.fieldCounts[packetIndex];
    const writableFields = fields.slice(offset, offset + count);
    offset += count;
    const corrections = writableFields.map((field) => {
      const moveId = resumption2RepairMoveId(field);
      const defect = byField.get(field);
      const originalCritique = baseOutput.moveProse?.[moveId]?.critique;
      const lockedMove = publicationPacket.moves.find((move) => move.moveId === moveId);
      assertV4(lockedMove && defect && wordCount(originalCritique) === defect.words,
        `${field}: repair source changed`);
      return { field, moveId, originalCritique, originalWords: defect.words,
        originalCharacters: defect.characters,
        excessWordsAboveAcceptanceMaximum: defect.excessWordsAboveAcceptanceMaximum, lockedMove };
    });
    const packet = { schemaVersion: POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_PACKET_VERSION,
      protocolId: POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_PROTOCOL_ID,
      contextIndex, packetIndex, productionCanary: false, batchNumber: 7, stagingOnly: true,
      debateNumber: spec.debateNumber, debateId: publicationPacket.debateId,
      repairType: "critique-word-boundary", immutableRejectedOutput: basePath,
      publicationPacket: publicationPacketPath, participantJudgmentWasScoreBlind: true,
      publicationIsScoreLocked: true, scoresRepositoryOwnedAndImmutable: true,
      constraints: { writableFields, writableFieldCount: writableFields.length,
        maximumWritableFields: 2, allOtherPublicationFieldsImmutable: true,
        scoreFieldsUnavailableAsOutputs: true,
        labels: ["Strongest feature:", "Principal limitation:", "Live burden:", "Locked score:"],
        generationTargetWords: [112, 118], acceptanceWords: [105, 130],
        preferredMinimumCharacters: 900, acceptanceMinimumCharacters: 880,
        exactSentenceCount: 4, terminalPunctuation: true,
        preserveAdjudicatedSubstanceAndLockedScoreBand: true, recursiveRecoveryMaximum: 0 },
      corrections };
    const schema = buildResumption2RepairSchema(packet);
    const stem = `debate-${spec.debateNumber}-repair-${packetIndex}`;
    const packetPath = `${ROOT}/packets/${stem}.json`;
    const schemaPath = `${ROOT}/schemas/${stem}.schema.json`;
    const output = `${ROOT}/outputs/${stem}.json`;
    const validation = `${ROOT}/validations/${stem}.json`;
    const provenance = `${ROOT}/provenance/${stem}.json`;
    const packetBytes = pretty(packet);
    const schemaBytes = pretty(schema);
    contexts.push({ contextIndex, packetIndex, debateNumber: spec.debateNumber,
      debateId: packet.debateId, packet: packetPath, packetSha256: sha256(packetBytes),
      schema: schemaPath, schemaSha256: sha256(schemaBytes), writableFields,
      writableFieldCount: writableFields.length, packetBytes: packetBytes.length,
      schemaBytes: schemaBytes.length, output, validation, provenance });
    generated.push([packetPath, packetBytes], [schemaPath, schemaBytes]);
    debatePackets.push(packet);
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
    const synthetic = { schemaVersion: POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_OUTPUT_VERSION,
      protocolId: POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_PROTOCOL_ID,
      contextIndex, packetIndex, debateNumber: spec.debateNumber, debateId: packet.debateId,
      assessmentModel: POST_CANARY_BATCH_07_PUBLICATION_MODEL.label, completedAt: frozenAt,
      correctedCritiques };
    validateResumption2RepairOutput(synthetic, packet);
    syntheticOutputs.push(synthetic);
    contextIndex += 1;
  }
  assertV4(offset === fields.length, `Debate ${spec.debateNumber}: partition did not cover all fields`);
  const replay = mergeAndValidateResumption2Repair({ baseOutput,
    repairOutputs: syntheticOutputs, repairPackets: debatePackets, publicationPacket });
  assertV4(replay.fullValidation.status === "passed" && replay.fullValidation.moves === spec.expectedMoves,
    `Debate ${spec.debateNumber}: synthetic complete replay failed`);
  syntheticByDebate.set(spec.debateNumber, syntheticOutputs);
  packetByDebate.set(spec.debateNumber, debatePackets);
}
assertV4(contexts.length === 12 &&
  canonicalJson(contexts.map((row) => row.writableFieldCount)) ===
    canonicalJson([2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1]) &&
  new Set(contexts.flatMap((row) => row.writableFields)).size === 22,
"the authorized twelve-packet/22-field boundary changed");

const futureOutputs = [`${ROOT}/execution-activation.json`, `${ROOT}/model-execution.json`,
  `${ROOT}/analysis.json`, ...contexts.flatMap((row) => [row.output, row.validation, row.provenance]),
  `${ROOT}/merged/debate-100.json`, `${ROOT}/merged/debate-78.json`,
  `${ROOT}/complete-debate-validation.json`, `${ROOT}/merge-audit.json`];
for (const file of [MANIFEST, ...generated.map(([file]) => file), ...futureOutputs])
  assertV4(!(await exists(file)), `${file} already exists`);
const staticFiles = [...new Set([DIAGNOSIS, PRODUCTION_WORKFLOW, READINESS_WORKFLOW, OUTPUT_CONTRACT,
  MANUAL, POST_CANARY_BATCH_07_STANDING_AUTHORIZATION, ...Object.keys(diagnosis.sourceHashes),
  `${POST_CANARY_BATCH_07_PUBLICATION_ROOT}/repair-1/merged/debate-193.json`,
  `${POST_CANARY_BATCH_07_PUBLICATION_ROOT}/repair-1/complete-debate-validation.json`,
  `${POST_CANARY_BATCH_07_PUBLICATION_ROOT}/resumption-1/repair-1/merged/debate-80.json`,
  `${POST_CANARY_BATCH_07_PUBLICATION_ROOT}/resumption-1/repair-1/complete-debate-validation.json`,
  ...WORKFLOW_SOURCES])].sort();
const sourceHashes = {};
for (const file of staticFiles) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
for (const context of contexts) {
  sourceHashes[context.packet] = context.packetSha256;
  sourceHashes[context.schema] = context.schemaSha256;
}
const manifest = { schemaVersion:
    "1.0-assessment-production-post-canary-batch-07-publication-resumption-2-repair-preparation",
  protocolId: POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_PROTOCOL_ID,
  status: "frozen-twelve-context-batch-07-publication-resumption-2-repair-prepared-not-activated",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 7, stagingOnly: true, AIOnly: true,
  userAuthorization: { instruction: "Batch 7 Debate 100 and 78 third-failure stop-rule exception",
    debates: ["100", "78"], debate100Partition: [2, 2, 2, 1],
    debate78Partition: [2, 2, 2, 2, 2, 2, 2, 1], contexts: 12,
    attemptsPerContext: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0,
    directIncrementalCostUsdMaximum: 0 },
  standingAuthorization: { path: POST_CANARY_BATCH_07_STANDING_AUTHORIZATION,
    status: standingAuthorization.status },
  model: structuredClone(POST_CANARY_BATCH_07_PUBLICATION_MODEL),
  costEstimate: { authentication: "ChatGPT subscription", contexts: 12,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    expectedWallMinutes: [12, 48], absoluteGateTimeoutMinutes: 120 },
  inputs: { diagnosis: DIAGNOSIS, debates: debateInputs }, contexts,
  modelInputs: { productionWorkflow: PRODUCTION_WORKFLOW, readinessWorkflow: READINESS_WORKFLOW,
    outputContract: OUTPUT_CONTRACT, manual: MANUAL },
  isolation: { freshTemporaryWorkingDirectoryPerContext: true,
    freshTemporaryCodexHomePerContext: true, subscriptionAuthFileOnly: true,
    otherRepairPacketsUnavailable: true, otherDebatesUnavailable: true,
    acceptedCohortOutputsUnavailable: true, legacyAssessmentsUnavailable: true,
    rejectedCompleteOutputUnavailableToModel: true, APIKeysRemoved: true },
  repairContract: { contexts: 12, debates: { "100": { packets: 4, writableFields: 7 },
      "78": { packets: 8, writableFields: 15 } }, writableFields: 22,
    maximumWritableFieldsPerPacket: 2, eachFieldDecidedOnce: true,
    completeRejectedOutputsImmutableMergeBasesOnly: true, allOtherFieldsImmutable: true,
    scoresRepositoryOwnedAndImmutable: true, recursiveRecoveryMaximum: 0,
    modelAuthoredScoresMaximum: 0 },
  executionEnvironment: { codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(), shell: false },
  executionPolicy: { contexts: 12, attemptsPerContext: 1, retriesMaximum: 0,
    timeoutExtensionsMaximum: 0, recursiveCorrectionContextsMaximum: 0,
    timeoutMsPerContext: 600000, absoluteGateTimeoutMs: 7200000,
    maximumParallelContexts: 2, schedulerRamp: [1, 2],
    rampPhases: [
      { phase: "repair-operational-one", maximumParallelContexts: 1,
        contextIndexes: [0], expansionRequiresAllValid: true },
      { phase: "repair-ramp-two", maximumParallelContexts: 2,
        contextIndexes: [1, 2], expansionRequiresAllValid: true },
      { phase: "repair-steady-two", maximumParallelContexts: 2,
        contextIndexes: [3, 4, 5, 6, 7, 8, 9, 10, 11], expansionRequiresAllValid: false }
    ], stopLaunchingAfterAnyFailure: true, authentication: "ChatGPT subscription",
    APIKeysRemoved: true, removedEnvironmentVariables: REMOVED,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    separateActivationRequired: true },
  stopRules: { sourceHashMismatchBlocks: true, packetOrSchemaHashMismatchBlocks: true,
    preexistingFutureOutputBlocks: true, nonSubscriptionAuthenticationBlocks: true,
    apiKeyVisibilityBlocks: true, nonIsolatedContextBlocks: true,
    fieldSetExpansionBlocks: true, immutableFieldMutationBlocks: true,
    invalidOutputBlocks: true, timeoutBlocks: true, automaticRetryBlocks: true,
    timeoutExtensionBlocks: true, recursiveCorrectionBlocks: true, scoreAuthorshipBlocks: true,
    paidServiceBlocks: true, productionMutationBlocks: true, nextBatchSelectionBlocks: true },
  sourceHashes, futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  artifacts: { preparation: MANIFEST, activation: futureOutputs[0], execution: futureOutputs[1],
    analysis: futureOutputs[2], mergedOutputs: futureOutputs.slice(-4, -2),
    completeValidation: futureOutputs.at(-2), mergeAudit: futureOutputs.at(-1) },
  authorization: { executionActivationPreparation: true, repairModelExecution: false,
    deterministicOutputValidation: false, deterministicMergeAndValidation: false,
    fiveContextResumption: false, paidServices: false, productionMutation: false,
    nextBatchSelection: false },
  nextAuthorizedAction: "activate-and-execute-exactly-twelve-frozen-batch-07-publication-repair-contexts" };
if (shouldWrite) {
  for (const [file, bytes] of generated) {
    await mkdir(path.dirname(path.resolve(file)), { recursive: true });
    await writeFile(path.resolve(file), bytes);
  }
  await mkdir(path.resolve(ROOT), { recursive: true });
  await writeFile(path.resolve(MANIFEST), pretty(manifest));
}
console.log(JSON.stringify({ status: manifest.status, contextsPrepared: 12,
  debatesPrepared: { "100": 4, "78": 8 }, writableFieldsPrepared: 22,
  completeSyntheticReplays: ["100", "78"], attemptsPerContext: 1,
  retriesMaximum: 0, directIncrementalCostUsdMaximum: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
