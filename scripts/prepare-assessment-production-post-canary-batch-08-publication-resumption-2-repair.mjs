#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_08_PUBLICATION_MODEL,
  POST_CANARY_BATCH_08_PUBLICATION_ROOT } from
  "./lib/assessment-production-post-canary-batch-08-publication.mjs";
import { POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch08StandingAuthorization } from
  "./lib/assessment-production-post-canary-batch-08-standing-authorization.mjs";
import { POST_CANARY_BATCH_08_DEBATE_120_REPAIR_OUTPUT_VERSION,
  POST_CANARY_BATCH_08_DEBATE_120_REPAIR_PACKET_VERSION,
  POST_CANARY_BATCH_08_DEBATE_120_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_08_DEBATE_120_REPAIR_ROOT,
  buildDebate120RepairSchema, debate120RepairMoveId,
  mergeAndValidateDebate120Repair, validateDebate120RepairOutput } from
  "./lib/assessment-production-post-canary-batch-08-publication-resumption-2-repair.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");
const ROOT = POST_CANARY_BATCH_08_DEBATE_120_REPAIR_ROOT;
const RESUMPTION_ROOT = path.dirname(ROOT);
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const DIAGNOSIS = `${ROOT}/failure-diagnosis.json`;
const BASE_OUTPUT = `${RESUMPTION_ROOT}/outputs/debate-120.json`;
const PUBLICATION_PACKET = `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/packets/debate-120.json`;
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const OUTPUT_CONTRACT = "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
const MANUAL = `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/repair-1/manual.md`;
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED = ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID",
  "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"];
const STATIC = [DIAGNOSIS, BASE_OUTPUT, PUBLICATION_PACKET, PRODUCTION_WORKFLOW,
  READINESS_WORKFLOW, OUTPUT_CONTRACT, MANUAL, POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
  `${RESUMPTION_ROOT}/execution-preparation-manifest.json`,
  `${RESUMPTION_ROOT}/execution-activation.json`, `${RESUMPTION_ROOT}/model-execution.json`,
  `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/repair-1/merged/debate-88.json`,
  `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/repair-1/complete-debate-validation.json`,
  "scripts/lib/v4-lean-production.mjs", "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-publication-resumption-2-repair.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-standing-authorization.mjs",
  "scripts/diagnose-assessment-production-post-canary-batch-08-publication-resumption-2-debate-120.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-08-publication-resumption-2-repair.mjs",
  "scripts/test-assessment-production-post-canary-batch-08-publication-resumption-2-repair-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-08-publication-resumption-2-repair.mjs",
  "scripts/run-assessment-production-post-canary-batch-08-publication-resumption-2-repair.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-08-publication-resumption-2-repair.mjs"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const diagnosis = JSON.parse(await readFile(path.resolve(DIAGNOSIS), "utf8"));
const baseOutput = JSON.parse(await readFile(path.resolve(BASE_OUTPUT), "utf8"));
const publicationPacket = JSON.parse(await readFile(path.resolve(PUBLICATION_PACKET), "utf8"));
await loadAndValidatePostCanaryBatch08StandingAuthorization();
assertV4(diagnosis.status === "frozen-diagnosed-batch-08-debate-120-three-field-publication-validation-failure" &&
  diagnosis.failedFieldCount === 3 && diagnosis.excessWordsTotal === 5 &&
  diagnosis.diagnosticReplay?.result?.status === "passed" &&
  diagnosis.minimumBoundedRepair?.packetCount === 2 &&
  diagnosis.preservedFields?.oneContextUnattempted === true,
"the frozen Debate 120 diagnosis changed");
for (const [file, digest] of Object.entries(diagnosis.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `${file}: diagnosed source drifted`);
const byField = new Map(diagnosis.failedFields.map((row) => [row.path, row]));
const contexts = []; const generated = []; const packets = []; const synthetic = [];
for (let packetIndex = 0; packetIndex < 2; packetIndex += 1) {
  const writableFields = diagnosis.minimumBoundedRepair.partition[packetIndex];
  const corrections = writableFields.map((field) => {
    const defect = byField.get(field);
    assertV4(defect, `${field}: diagnosed defect missing`);
    if (defect.type === "critique-word-boundary") {
      const moveId = debate120RepairMoveId(field);
      const originalCritique = baseOutput.moveProse[moveId].critique;
      const lockedMove = publicationPacket.moves.find((move) => move.moveId === moveId);
      assertV4(lockedMove && wordCount(originalCritique) === defect.words,
        `${field}: critique repair source changed`);
      return { field, type: defect.type, moveId, originalCritique,
        originalWords: defect.words, originalCharacters: defect.characters,
        excessWordsAboveAcceptanceMaximum: defect.excessWordsAboveAcceptanceMaximum,
        lockedMove };
    }
    assertV4(
      defect.type === "novelty-explanation-minimum-words" &&
      field === "aiExtension.pro.premises[3].novelty.explanation" &&
      baseOutput.aiExtension.pro.premises[3].id === defect.itemId &&
      baseOutput.aiExtension.pro.premises[3].novelty.explanation === defect.originalText,
      `${field}: novelty repair source changed`
    );
    const item = baseOutput.aiExtension.pro.premises[3];
    return { field, type: defect.type, itemId: defect.itemId, side: "pro",
      premiseIndex: 3, originalExplanation: defect.originalText,
      originalWords: defect.words, itemText: item.text,
      classification: item.novelty.classification,
      sourceMoveIds: item.novelty.sourceMoveIds };
  });
  const packet = { schemaVersion: POST_CANARY_BATCH_08_DEBATE_120_REPAIR_PACKET_VERSION,
    protocolId: POST_CANARY_BATCH_08_DEBATE_120_REPAIR_PROTOCOL_ID,
    contextIndex: packetIndex, packetIndex, productionCanary: false, batchNumber: 8,
    stagingOnly: true, debateNumber: "120", debateId: publicationPacket.debateId,
    repairType: packetIndex === 0 ? "critique-word-boundary" : "novelty-explanation-minimum-words",
    immutableRejectedOutput: BASE_OUTPUT,
    publicationPacket: PUBLICATION_PACKET, participantJudgmentWasScoreBlind: true,
    publicationIsScoreLocked: true, scoresRepositoryOwnedAndImmutable: true,
    constraints: { writableFields, writableFieldCount: writableFields.length, maximumWritableFields: 2,
      allOtherPublicationFieldsImmutable: true, scoreFieldsUnavailableAsOutputs: true,
      labels: ["Strongest feature:", "Principal limitation:", "Live burden:", "Locked score:"],
      generationTargetWords: [112, 118], acceptanceWords: [105, 130],
      preferredMinimumCharacters: 900, acceptanceMinimumCharacters: 880,
      exactSentenceCount: 4, terminalPunctuation: true,
      noveltyExplanationTargetWords: [10, 18], noveltyExplanationAcceptanceWords: [8, 35],
      preserveAdjudicatedSubstanceAndLockedScoreBand: true,
      recursiveRecoveryMaximum: 1 }, corrections };
  const schema = buildDebate120RepairSchema(packet);
  const packetPath = `${ROOT}/packets/packet-${packetIndex}.json`;
  const schemaPath = `${ROOT}/schemas/packet-${packetIndex}.schema.json`;
  const packetBytes = pretty(packet); const schemaBytes = pretty(schema);
  const output = `${ROOT}/outputs/packet-${packetIndex}.json`;
  const validation = `${ROOT}/validations/packet-${packetIndex}.json`;
  const provenance = `${ROOT}/provenance/packet-${packetIndex}.json`;
  contexts.push({ contextIndex: packetIndex, packetIndex, debateNumber: "120",
    debateId: packet.debateId, packet: packetPath, packetSha256: sha256(packetBytes),
    schema: schemaPath, schemaSha256: sha256(schemaBytes), writableFields,
    writableFieldCount: writableFields.length, packetBytes: packetBytes.length, schemaBytes: schemaBytes.length,
    copiedInputBytes: (await readFile(path.resolve(PRODUCTION_WORKFLOW))).length +
      (await readFile(path.resolve(READINESS_WORKFLOW))).length +
      (await readFile(path.resolve(OUTPUT_CONTRACT))).length +
      (await readFile(path.resolve(MANUAL))).length + packetBytes.length + schemaBytes.length,
    output, validation, provenance });
  generated.push([packetPath, packetBytes], [schemaPath, schemaBytes]); packets.push(packet);
  const correctedFields = {};
  for (const correction of corrections) {
    if (correction.type === "critique-word-boundary") {
      const sentences = correction.originalCritique.split(/(?<=[.!?])\s+/).filter(Boolean);
      while (wordCount(sentences.join(" ")) > 130) { const words = sentences[1].split(/\s+/);
        words.splice(words.length - 2, 1); sentences[1] = words.join(" "); }
      correctedFields[correction.field] = sentences.join(" ");
    } else {
      correctedFields[correction.field] =
        diagnosis.diagnosticReplay.hypotheticalNoveltyExplanationReplacement;
    }
  }
  const outputRecord = { schemaVersion: POST_CANARY_BATCH_08_DEBATE_120_REPAIR_OUTPUT_VERSION,
    protocolId: POST_CANARY_BATCH_08_DEBATE_120_REPAIR_PROTOCOL_ID,
    packetIndex, debateNumber: "120", debateId: packet.debateId,
    assessmentModel: POST_CANARY_BATCH_08_PUBLICATION_MODEL.label,
    completedAt: frozenAt, correctedFields };
  validateDebate120RepairOutput(outputRecord, packet); synthetic.push(outputRecord);
}
assertV4(contexts.length === 2 && new Set(contexts.flatMap((row) => row.writableFields)).size === 3,
  "the two-packet repair boundary changed");
const syntheticMerge = mergeAndValidateDebate120Repair({ baseOutput,
  repairOutputs: synthetic, repairPackets: packets, publicationPacket });
assertV4(syntheticMerge.fullValidation.status === "passed" &&
  syntheticMerge.fullValidation.moves === 19, "synthetic complete Debate 120 replay failed");
const futureOutputs = [`${ROOT}/execution-activation.json`, `${ROOT}/model-execution.json`,
  `${ROOT}/analysis.json`, ...contexts.flatMap((row) => [row.output, row.validation, row.provenance]),
  `${ROOT}/merged/debate-120.json`, `${ROOT}/complete-debate-validation.json`, `${ROOT}/merge-audit.json`];
for (const file of [MANIFEST, ...generated.map(([file]) => file), ...futureOutputs])
  assertV4(!(await exists(file)), `${file} already exists`);
const sourceHashes = {};
for (const file of [...new Set(STATIC)].sort()) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
for (const context of contexts) { sourceHashes[context.packet] = context.packetSha256;
  sourceHashes[context.schema] = context.schemaSha256; }
const manifest = { schemaVersion: "1.0-assessment-production-post-canary-batch-08-debate-120-repair-preparation",
  protocolId: POST_CANARY_BATCH_08_DEBATE_120_REPAIR_PROTOCOL_ID,
  status: "frozen-two-context-batch-08-debate-120-publication-repair-prepared-not-activated",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 8, stagingOnly: true, AIOnly: true,
  userAuthorization: { instruction: "The Batch 8 continuation and failure-recovery standing authorization permits two field-disjoint Debate 120 publication repair contexts covering three diagnosed fields.",
    directIncrementalCostUsdMaximum: 0 },
  model: structuredClone(POST_CANARY_BATCH_08_PUBLICATION_MODEL),
  costEstimate: { authentication: "ChatGPT subscription", contexts: 2,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    expectedWallMinutes: [3, 12], absoluteGateTimeoutMinutes: 25 },
  inputs: { diagnosis: DIAGNOSIS, immutableRejectedOutput: BASE_OUTPUT,
    publicationPacket: PUBLICATION_PACKET }, contexts,
  modelInputs: { productionWorkflow: PRODUCTION_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW, outputContract: OUTPUT_CONTRACT, manual: MANUAL },
  isolation: { freshTemporaryWorkingDirectoryPerContext: true,
    freshTemporaryCodexHomePerContext: true, subscriptionAuthFileOnly: true,
    otherRepairPacketUnavailable: true, otherDebatesUnavailable: true,
    acceptedCohortOutputsUnavailable: true, legacyAssessmentsUnavailable: true,
    APIKeysRemoved: true },
  repairContract: { contexts: 2, writableFields: 3, maximumWritableFieldsPerPacket: 2,
    allOtherFieldsImmutable: true, scoresRepositoryOwnedAndImmutable: true,
    recursiveRecoveryMaximum: 1, modelAuthoredScoresMaximum: 0 },
  executionEnvironment: { codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(), shell: false },
  executionPolicy: { contexts: 2, attemptsPerContext: 1, retriesMaximum: 0,
    timeoutExtensionsMaximum: 0, recursiveCorrectionContextsMaximum: 1,
    timeoutMsPerContext: 600000, absoluteGateTimeoutMs: 1500000,
    maximumParallelContexts: 1, schedulerRamp: [1],
    rampPhases: [{ phase: "repair-critique-fields", maximumParallelContexts: 1,
      contextIndexes: [0], expansionRequiresAllValid: true },
    { phase: "repair-novelty-field", maximumParallelContexts: 1,
      contextIndexes: [1], expansionRequiresAllValid: true }],
    authentication: "ChatGPT subscription", APIKeysRemoved: true,
    removedEnvironmentVariables: REMOVED, directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0, separateActivationRequired: true },
  stopRules: { sourceHashMismatchBlocks: true, packetOrSchemaHashMismatchBlocks: true,
    preexistingFutureOutputBlocks: true, nonSubscriptionAuthenticationBlocks: true,
    apiKeyVisibilityBlocks: true, nonIsolatedContextBlocks: true,
    fieldSetExpansionBlocks: true, immutableFieldMutationBlocks: true,
    invalidOutputBlocks: true, timeoutBlocks: true, automaticRetryBlocks: true,
    timeoutExtensionBlocks: true, recursiveCorrectionBlocks: true,
    scoreAuthorshipBlocks: true, paidServiceBlocks: true,
    productionMutationBlocks: true, nextBatchSelectionBlocks: true },
  sourceHashes, futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  artifacts: { preparation: MANIFEST, activation: futureOutputs[0],
    execution: futureOutputs[1], analysis: futureOutputs[2],
    mergedOutput: futureOutputs.at(-3), completeValidation: futureOutputs.at(-2),
    mergeAudit: futureOutputs.at(-1) },
  authorization: { executionActivationPreparation: true, repairModelExecution: false,
    deterministicMergeAndValidation: false, oneContextResumptionPreparation: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: "activate-and-execute-exactly-two-frozen-debate-120-repair-contexts" };
if (shouldWrite) { for (const [file, bytes] of generated) { await mkdir(path.dirname(path.resolve(file)), { recursive: true });
    await writeFile(path.resolve(file), bytes); }
  await writeFile(path.resolve(MANIFEST), pretty(manifest)); }
console.log(JSON.stringify({ status: manifest.status, contextsPrepared: 2,
  writableFieldsPrepared: 3, completeSyntheticReplay: "passed",
  attemptsPerContext: 1, retriesMaximum: 0, directIncrementalCostUsdMaximum: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
