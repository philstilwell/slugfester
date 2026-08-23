#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_07_PUBLICATION_MODEL, POST_CANARY_BATCH_07_PUBLICATION_ROOT } from
  "./lib/assessment-production-post-canary-batch-07-publication.mjs";
import { POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_FIELD,
  POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_OUTPUT_VERSION,
  POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_PACKET_VERSION,
  POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_ROOT,
  buildDebate02PublicationRepairSchema, mergeAndValidateDebate02PublicationRepair,
  validateDebate02PublicationRepairOutput } from
  "./lib/assessment-production-post-canary-batch-07-debate-02-publication-repair.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--frozen-at");
const frozenAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");
const ROOT = POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_ROOT;
const RESUMPTION_ROOT = path.dirname(ROOT);
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const DIAGNOSIS = `${ROOT}/failure-diagnosis.json`;
const BASE_OUTPUT = `${RESUMPTION_ROOT}/outputs/debate-02.json`;
const PUBLICATION_PACKET = `${POST_CANARY_BATCH_07_PUBLICATION_ROOT}/packets/debate-02.json`;
const PACKET = `${ROOT}/packets/debate-02-repair-0.json`;
const SCHEMA = `${ROOT}/schemas/debate-02-repair-0.schema.json`;
const OUTPUT = `${ROOT}/outputs/debate-02-repair-0.json`;
const VALIDATION = `${ROOT}/validations/debate-02-repair-0.json`;
const PROVENANCE = `${ROOT}/provenance/debate-02-repair-0.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const MERGED = `${ROOT}/merged/debate-02.json`;
const COMPLETE_VALIDATION = `${ROOT}/complete-debate-validation.json`;
const MERGE_AUDIT = `${ROOT}/merge-audit.json`;
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const OUTPUT_CONTRACT = "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED = ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const diagnosisBytes = await readFile(path.resolve(DIAGNOSIS));
const baseBytes = await readFile(path.resolve(BASE_OUTPUT));
const publicationPacketBytes = await readFile(path.resolve(PUBLICATION_PACKET));
const diagnosis = JSON.parse(diagnosisBytes);
const baseOutput = JSON.parse(baseBytes);
const publicationPacket = JSON.parse(publicationPacketBytes);
assertV4(diagnosis.status ===
  "frozen-diagnosed-batch-07-debate-02-single-novelty-explanation-length-defect" &&
  diagnosis.conclusion?.confirmedOnlyReportedDefect === true &&
  diagnosis.conclusion?.writableFieldsRequired === 1 &&
  diagnosis.diagnosedField?.path === POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_FIELD &&
  diagnosis.deterministicReplay?.completeDebateValidation?.status === "passed" &&
  diagnosis.deterministicReplay?.immutableFieldsChanged === 0,
"the frozen Debate 02 diagnosis changed");
for (const [file, digest] of Object.entries(diagnosis.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `${file}: diagnosed source drifted`);
const lockedItem = structuredClone(baseOutput.aiExtension.con.premises[1]);
assertV4(lockedItem.id === "ai02-con-premise-2" &&
  lockedItem.novelty.explanation === diagnosis.diagnosedField.originalValue,
"the diagnosed Debate 02 item changed");
const packet = { schemaVersion: POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_PACKET_VERSION,
  protocolId: POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_PROTOCOL_ID,
  contextIndex: 0, packetIndex: 0, productionCanary: false, batchNumber: 7,
  stagingOnly: true, debateNumber: "02", debateId: publicationPacket.debateId,
  repairType: "ai-extension-novelty-explanation-length",
  immutableRejectedOutput: BASE_OUTPUT, publicationPacket: PUBLICATION_PACKET,
  participantJudgmentWasScoreBlind: true, publicationIsScoreLocked: true,
  scoresRepositoryOwnedAndUnavailable: true,
  writableField: POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_FIELD,
  lockedItem: { id: lockedItem.id, text: lockedItem.text,
    novelty: { classification: lockedItem.novelty.classification,
      sourceMoveIds: lockedItem.novelty.sourceMoveIds,
      originalExplanation: lockedItem.novelty.explanation } },
  constraints: { writableFieldCount: 1, maximumWritableFields: 1,
    allOtherPublicationFieldsImmutable: true, scoreFieldsUnavailableAsOutputs: true,
    minimumWords: 8, maximumWords: 35, minimumCharacters: 55,
    targetWords: [12, 20], terminalPunctuationRequired: true,
    preserveClassificationSourceMappingAndSubstance: true,
    recursiveRecoveryMaximum: 0 } };
const schema = buildDebate02PublicationRepairSchema(packet);
const packetBytes = pretty(packet);
const schemaBytes = pretty(schema);
const synthetic = { schemaVersion: POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_OUTPUT_VERSION,
  protocolId: POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_PROTOCOL_ID,
  debateNumber: "02", debateId: packet.debateId,
  assessmentModel: POST_CANARY_BATCH_07_PUBLICATION_MODEL.label,
  completedAt: frozenAt,
  correctedNoveltyExplanation:
    "This systematically extends the transcript's creator-to-Christianity nonentailment distinction." };
validateDebate02PublicationRepairOutput(synthetic, packet);
const replay = mergeAndValidateDebate02PublicationRepair({ baseOutput,
  repairOutput: synthetic, repairPacket: packet, publicationPacket });
assertV4(replay.fullValidation.status === "passed" && replay.fullValidation.moves === 21,
  "the frozen single-field synthetic replay failed");
const futureOutputs = [ACTIVATION, EXECUTION, ANALYSIS, OUTPUT, VALIDATION, PROVENANCE,
  MERGED, COMPLETE_VALIDATION, MERGE_AUDIT];
for (const file of [MANIFEST, PACKET, SCHEMA, ...futureOutputs])
  assertV4(!(await exists(file)), `${file} already exists`);
const staticFiles = [DIAGNOSIS, BASE_OUTPUT, PUBLICATION_PACKET, PRODUCTION_WORKFLOW,
  READINESS_WORKFLOW, OUTPUT_CONTRACT,
  `${RESUMPTION_ROOT}/execution-preparation-manifest.json`,
  `${RESUMPTION_ROOT}/execution-activation.json`, `${RESUMPTION_ROOT}/model-execution.json`,
  `${RESUMPTION_ROOT}/analysis.json`, `${RESUMPTION_ROOT}/validations/debate-02.json`,
  `${RESUMPTION_ROOT}/provenance/debate-02.json`,
  "scripts/lib/v4-lean-production.mjs", "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-07-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-07-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-07-debate-02-publication-repair.mjs",
  "scripts/diagnose-assessment-production-post-canary-batch-07-debate-02-publication-failure.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-07-debate-02-publication-repair.mjs",
  "scripts/test-assessment-production-post-canary-batch-07-debate-02-publication-repair-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-07-debate-02-publication-repair.mjs",
  "scripts/run-assessment-production-post-canary-batch-07-debate-02-publication-repair.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-07-debate-02-publication-repair.mjs"];
const sourceHashes = {};
for (const file of [...new Set(staticFiles)].sort())
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
sourceHashes[PACKET] = sha256(packetBytes);
sourceHashes[SCHEMA] = sha256(schemaBytes);
const context = { contextIndex: 0, packetIndex: 0, debateNumber: "02",
  debateId: packet.debateId, packet: PACKET, packetSha256: sha256(packetBytes),
  schema: SCHEMA, schemaSha256: sha256(schemaBytes),
  writableFields: [POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_FIELD],
  writableFieldCount: 1, packetBytes: packetBytes.length, schemaBytes: schemaBytes.length,
  output: OUTPUT, validation: VALIDATION, provenance: PROVENANCE };
const manifest = { schemaVersion:
    "1.0-assessment-production-post-canary-batch-07-debate-02-publication-repair-preparation",
  protocolId: POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_PROTOCOL_ID,
  status: "frozen-one-context-batch-07-debate-02-publication-repair-prepared-not-activated",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 7, stagingOnly: true, AIOnly: true,
  userAuthorization: diagnosis.userAuthorization,
  model: structuredClone(POST_CANARY_BATCH_07_PUBLICATION_MODEL),
  costEstimate: { authentication: "ChatGPT subscription", contexts: 1,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    expectedWallMinutes: [1, 6], absoluteGateTimeoutMinutes: 10 },
  inputs: { diagnosis: DIAGNOSIS, immutableRejectedOutput: BASE_OUTPUT,
    publicationPacket: PUBLICATION_PACKET }, context,
  modelInputs: { productionWorkflow: PRODUCTION_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW, outputContract: OUTPUT_CONTRACT },
  isolation: { freshTemporaryWorkingDirectory: true, freshTemporaryCodexHome: true,
    subscriptionAuthFileOnly: true, completeRejectedOutputUnavailableToModel: true,
    otherPublicationFieldsUnavailable: true, otherDebatesUnavailable: true,
    acceptedCohortOutputsUnavailable: true, legacyAssessmentsUnavailable: true,
    scoreFieldsUnavailable: true, APIKeysRemoved: true },
  repairContract: { contexts: 1, writableFields: 1, maximumWritableFieldsPerPacket: 1,
    writableField: POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_FIELD,
    allOtherFieldsImmutable: true, scoresRepositoryOwnedAndImmutable: true,
    recursiveRecoveryMaximum: 0, modelAuthoredScoresMaximum: 0 },
  executionEnvironment: { codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(), shell: false },
  executionPolicy: { contexts: 1, attemptsPerContext: 1, retriesMaximum: 0,
    timeoutExtensionsMaximum: 0, recursiveCorrectionContextsMaximum: 0,
    timeoutMsPerContext: 600000, absoluteGateTimeoutMs: 600000,
    maximumParallelContexts: 1, schedulerRamp: [1], authentication: "ChatGPT subscription",
    APIKeysRemoved: true, removedEnvironmentVariables: REMOVED,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    separateActivationRequired: true },
  stopRules: { sourceHashMismatchBlocks: true, packetOrSchemaHashMismatchBlocks: true,
    preexistingFutureOutputBlocks: true, nonSubscriptionAuthenticationBlocks: true,
    apiKeyVisibilityBlocks: true, nonIsolatedContextBlocks: true,
    fieldSetExpansionBlocks: true, immutableFieldMutationBlocks: true,
    invalidOutputBlocks: true, timeoutBlocks: true, automaticRetryBlocks: true,
    timeoutExtensionBlocks: true, recursiveCorrectionBlocks: true,
    scoreAuthorshipBlocks: true, paidServiceBlocks: true,
    productionMutationBlocks: true, nextBatchSelectionBlocks: true },
  sourceHashes, futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  artifacts: { preparation: MANIFEST, activation: ACTIVATION, execution: EXECUTION,
    analysis: ANALYSIS, mergedOutput: MERGED, completeValidation: COMPLETE_VALIDATION,
    mergeAudit: MERGE_AUDIT },
  authorization: { executionActivationPreparation: true, repairModelExecution: false,
    deterministicOutputValidation: false, deterministicMergeAndValidation: false,
    twoContextResumption: false, paidServices: false, productionMutation: false,
    nextBatchSelection: false },
  nextAuthorizedAction: "activate-and-execute-exactly-one-frozen-batch-07-debate-02-publication-repair-context" };
if (shouldWrite) {
  for (const [file, bytes] of [[PACKET, packetBytes], [SCHEMA, schemaBytes]]) {
    await mkdir(path.dirname(path.resolve(file)), { recursive: true });
    await writeFile(path.resolve(file), bytes);
  }
  await writeFile(path.resolve(MANIFEST), pretty(manifest));
}
console.log(JSON.stringify({ status: manifest.status, contextsPrepared: 1,
  debateNumber: "02", writableFieldsPrepared: 1,
  completeSyntheticReplay: "passed", attemptsPerContext: 1, retriesMaximum: 0,
  directIncrementalCostUsdMaximum: 0, nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
