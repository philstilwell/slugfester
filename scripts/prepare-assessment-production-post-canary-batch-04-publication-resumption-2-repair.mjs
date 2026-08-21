#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_04_PUBLICATION_MODEL } from "./lib/assessment-production-post-canary-batch-04-publication.mjs";
import {
  POST_CANARY_BATCH_04_RESUMPTION_2_REPAIR_OUTPUT_VERSION,
  POST_CANARY_BATCH_04_RESUMPTION_2_REPAIR_PACKET_VERSION,
  POST_CANARY_BATCH_04_RESUMPTION_2_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_04_RESUMPTION_2_REPAIR_ROOT,
  buildResumption2RepairSchema,
  mergeAndValidateSingleFieldRepair
} from "./lib/assessment-production-post-canary-batch-04-publication-resumption-2-repair.mjs";
import { POST_CANARY_BATCH_04_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch04StandingAuthorization } from "./lib/assessment-production-post-canary-batch-04-standing-authorization.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp");
const STAGE =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/publication-reconstruction/resumption-2";
const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/publication-reconstruction";
const ROOT = POST_CANARY_BATCH_04_RESUMPTION_2_REPAIR_ROOT;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const DIAGNOSIS = `${STAGE}/failure-diagnosis.json`;
const FAILED_EXECUTION = `${STAGE}/model-execution.json`;
const FAILED_ANALYSIS = `${STAGE}/analysis.json`;
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const OUTPUT_CONTRACT =
  "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
const MANUAL = `${ROOT}/manual.md`;
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const removedEnvironmentVariables = ["OPENAI_API_KEY", "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const [diagnosisBytes, executionBytes, analysisBytes] = await Promise.all([
  readFile(path.resolve(DIAGNOSIS)), readFile(path.resolve(FAILED_EXECUTION)),
  readFile(path.resolve(FAILED_ANALYSIS))]);
const diagnosis = JSON.parse(diagnosisBytes);
const execution = JSON.parse(executionBytes);
const analysis = JSON.parse(analysisBytes);
const standing = await loadAndValidatePostCanaryBatch04StandingAuthorization();
assertV4(diagnosis.status ===
  "diagnosed-batch-04-resumption-2-two-single-critique-validation-failures" &&
  diagnosis.failureBoundary?.failedFieldCount === 2 &&
  diagnosis.prospectiveRecoveryOnly?.minimumFieldDisjointRepairPacketCount === 2 &&
  diagnosis.authorization?.repairPacketPreparation === true &&
  execution.contextsAttempted === 6 && execution.validContexts === 4 &&
  execution.invalidContexts === 2 &&
  analysis.status === "post-canary-batch-04-publication-resumption-2-failed-validation",
"the two-field recovery boundary changed");
for (const [file, digest] of Object.entries(diagnosis.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `${file}: diagnosed source drifted`);
}
const contexts = []; const generated = []; const packets = []; const syntheticRepairs = [];
for (let packetIndex = 0; packetIndex < 2; packetIndex += 1) {
  const field = diagnosis.failureBoundary.failedFields[packetIndex];
  const debateNumber = field.debateNumber;
  const baseOutputPath = `${STAGE}/outputs/debate-${debateNumber}.json`;
  const publicationPacketPath = `${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`;
  const [baseOutputBytes, publicationPacketBytes] = await Promise.all([
    readFile(path.resolve(baseOutputPath)), readFile(path.resolve(publicationPacketPath))]);
  const baseOutput = JSON.parse(baseOutputBytes);
  const publicationPacket = JSON.parse(publicationPacketBytes);
  const originalCritique = baseOutput.moveProse[field.moveId].critique;
  const lockedMove = publicationPacket.moves.find((move) => move.moveId === field.moveId);
  assertV4(lockedMove && wordCount(originalCritique) === field.words &&
    originalCritique.length === field.characters,
  `Debate ${debateNumber}: diagnosed field changed`);
  const packet = { schemaVersion: POST_CANARY_BATCH_04_RESUMPTION_2_REPAIR_PACKET_VERSION,
    protocolId: POST_CANARY_BATCH_04_RESUMPTION_2_REPAIR_PROTOCOL_ID,
    packetIndex, productionCanary: false, batchNumber: 4, stagingOnly: true,
    debateNumber, debateId: publicationPacket.debateId,
    repairType: field.failureType, writableField: field.path,
    moveId: field.moveId, immutableBaseOutput: baseOutputPath,
    publicationPacket: publicationPacketPath,
    participantJudgmentWasScoreBlind: true, scoresRepositoryOwnedAndImmutable: true,
    constraints: { writableFields: [field.path], generationTargetWords: [112,118],
      acceptanceWords: [105,130], preferredMinimumCharacters: 900,
      acceptanceMinimumCharacters: 880, exactSentenceCount: 4,
      labels: ["Strongest feature:", "Principal limitation:", "Live burden:", "Locked score:"],
      terminalPunctuationMustBeValidatorRecognizable: true,
      preserveAdjudicatedSubstanceAndLockedScoreBand: true,
      scoresUnavailableAsOutputFields: true },
    correction: { ...field, originalCritique, lockedMove } };
  const schema = buildResumption2RepairSchema(packet);
  const packetPath = `${ROOT}/packets/packet-${packetIndex}.json`;
  const schemaPath = `${ROOT}/schemas/packet-${packetIndex}.schema.json`;
  const packetBytes = pretty(packet); const schemaBytes = pretty(schema);
  const copiedInputBytes = (await readFile(PRODUCTION_WORKFLOW)).length +
    (await readFile(READINESS_WORKFLOW)).length + (await readFile(OUTPUT_CONTRACT)).length +
    (await readFile(MANUAL)).length + packetBytes.length + schemaBytes.length;
  generated.push([packetPath, packetBytes], [schemaPath, schemaBytes]); packets.push(packet);
  contexts.push({ contextIndex: packetIndex, packetIndex, debateNumber,
    debateId: publicationPacket.debateId, packet: packetPath,
    packetSha256: sha256(packetBytes), schema: schemaPath,
    schemaSha256: sha256(schemaBytes), writableFields: [field.path],
    writableFieldCount: 1, packetBytes: packetBytes.length,
    schemaBytes: schemaBytes.length, copiedInputBytes,
    repairOutput: `${ROOT}/outputs/packet-${packetIndex}.json`,
    validation: `${ROOT}/validations/packet-${packetIndex}.json`,
    provenance: `${ROOT}/provenance/packet-${packetIndex}.json` });
  let correctedCritique = originalCritique;
  if (debateNumber === "03") {
    const sentences = correctedCritique.split(/(?<=[.!?])\s+/).filter(Boolean);
    while (wordCount(sentences.join(" ")) > 130) {
      const tokens = sentences[1].split(/\s+/); tokens.splice(tokens.length - 2, 1);
      sentences[1] = tokens.join(" ");
    }
    correctedCritique = sentences.join(" ");
  } else {
    correctedCritique = correctedCritique.replace(
      "desert.” Principal limitation:", "desert”. Principal limitation:");
  }
  const repair = { schemaVersion: POST_CANARY_BATCH_04_RESUMPTION_2_REPAIR_OUTPUT_VERSION,
    protocolId: POST_CANARY_BATCH_04_RESUMPTION_2_REPAIR_PROTOCOL_ID,
    packetIndex, debateNumber, debateId: publicationPacket.debateId,
    assessmentModel: POST_CANARY_BATCH_04_PUBLICATION_MODEL.label,
    completedAt: frozenAt, correctedCritique };
  const synthetic = mergeAndValidateSingleFieldRepair({ baseOutput, repair,
    repairPacket: packet, publicationPacket });
  assertV4(synthetic.fullValidation.status === "passed" &&
    synthetic.fullValidation.lockedScoresUnchanged === true,
  `Debate ${debateNumber}: synthetic repair failed`);
  syntheticRepairs.push({ debateNumber, validation: synthetic.fullValidation });
}
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const futureOutputs = [...contexts.flatMap((context) =>
  [context.repairOutput, context.validation, context.provenance]),
  ACTIVATION, EXECUTION, ANALYSIS,
  ...["03","185"].flatMap((n) => [`${ROOT}/merged/debate-${n}.json`,
    `${ROOT}/complete-validation-debate-${n}.json`, `${ROOT}/merge-audit-debate-${n}.json`])];
const staticSources = [PRODUCTION_WORKFLOW, READINESS_WORKFLOW, OUTPUT_CONTRACT, MANUAL,
  POST_CANARY_BATCH_04_STANDING_AUTHORIZATION, DIAGNOSIS, FAILED_EXECUTION, FAILED_ANALYSIS,
  ...Object.values(diagnosis.artifacts.debates).flatMap((row) =>
    [row.output.path, row.packet.path, row.validation.path, row.provenance.path]),
  "scripts/lib/v4-lean-production.mjs", "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-04-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-04-publication-resumption-2-repair.mjs",
  "scripts/lib/assessment-production-post-canary-batch-04-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-04-publication-resumption-2-repair.mjs",
  "scripts/test-assessment-production-post-canary-batch-04-publication-resumption-2-repair-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-04-publication-resumption-2-repair.mjs",
  "scripts/run-assessment-production-post-canary-batch-04-publication-resumption-2-repair.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-04-publication-resumption-2-repair.mjs"];
const sourceHashes = {};
for (const file of [...new Set(staticSources)]) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
for (const context of contexts) { sourceHashes[context.packet] = context.packetSha256;
  sourceHashes[context.schema] = context.schemaSha256; }
for (const file of [MANIFEST, ...generated.map(([file]) => file), ...futureOutputs]) {
  assertV4(!(await exists(file)), `${file} already exists`);
}
for (const file of futureOutputs) assertV4(!Object.hasOwn(sourceHashes, file),
  `future output hash included: ${file}`);
const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-publication-resumption-2-repair-execution-preparation-manifest",
  protocolId: POST_CANARY_BATCH_04_RESUMPTION_2_REPAIR_PROTOCOL_ID,
  status:
    "frozen-two-isolated-single-field-batch-04-publication-resumption-2-repair-contexts-prepared-under-standing-authorization",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 4, stagingOnly: true, AIOnly: true,
  userAuthorization: { instruction: standing.record.userAuthorization.instruction,
    standingAuthorization: POST_CANARY_BATCH_04_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standing.sha256,
    directIncrementalCostUsdMaximum: 0, contextsPrepared: 2,
    writableFieldsPrepared: 2, repairModelExecution: false,
    paidServices: false, publicationCompilation: false,
    productionMutation: false, nextBatchSelection: false },
  model: structuredClone(POST_CANARY_BATCH_04_PUBLICATION_MODEL),
  costEstimate: { authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    contexts: 2, expectedParallelWallMinutes: [2,8],
    expectedAggregateModelMinutes: [2,10], absoluteGateTimeoutMinutes: 20 },
  executionEnvironment: { codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(),
    authentication: "ChatGPT subscription", APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true, isolatedTemporaryWorkingDirectories: true },
  inputs: { productionWorkflow: PRODUCTION_WORKFLOW, readinessWorkflow: READINESS_WORKFLOW,
    outputContract: OUTPUT_CONTRACT, manual: MANUAL, diagnosis: DIAGNOSIS,
    failedExecution: FAILED_EXECUTION, failedAnalysis: FAILED_ANALYSIS,
    standingAuthorization: POST_CANARY_BATCH_04_STANDING_AUTHORIZATION },
  modelInputs: { productionWorkflow: PRODUCTION_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW, outputContract: OUTPUT_CONTRACT,
    manual: MANUAL },
  sourceHashes, contexts,
  isolation: { oneRepairPacketPerFreshContext: true, oneDebatePerContext: true,
    exactlyOneCritiqueFieldPerContext: true, onlyFrozenModelInputsAvailable: true,
    participantJudgmentWasScoreBlind: true, scoresUnavailableAsOutputFields: true,
    otherRepairPacketUnavailable: true, otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true },
  repairContract: { writableFields: diagnosis.failureBoundary.failedFields.map((field) => field.path),
    writableFieldsPerContextMaximum: 1, targetWords: [112,118],
    acceptanceWords: [105,130], acceptanceMinimumCharacters: 880,
    exactSentenceCount: 4, originalFailedOutputsMustRemainUnchanged: true,
    completeDebateValidationRequiredAfterMerge: true, modelAuthoredScoresMaximum: 0 },
  executionPolicy: { contexts: 2, attemptsPerContext: 1, retriesMaximum: 0,
    timeoutExtensionsMaximum: 0, recursiveCorrectionContextsMaximum: 0,
    timeoutMsPerContext: 480000, absoluteGateTimeoutMs: 1200000,
    maximumParallelContexts: 2, schedulerRamp: [1,2],
    rampPhases: [{ phase: "operational-one", maximumParallelContexts: 1,
      contextIndexes: [0], expansionRequiresAllValid: true },
      { phase: "ramp-two", maximumParallelContexts: 2,
        contextIndexes: [1], expansionRequiresAllValid: false }],
    authentication: "ChatGPT subscription", APIKeysRemoved: true,
    removedEnvironmentVariables, directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0, separateActivationRequired: true },
  deterministicValidation: { diagnosedSourceHashesReplayedAtFreeze: true,
    twoSingleFieldSchemasReproducedAtFreeze: true,
    completeOutputsPassAfterSyntheticInMemoryRepairs: true,
    exactFieldSetsRequired: true, lockedScoresUnchanged: true, modelAuthoredScores: 0 },
  stopRules: { sourceHashMismatchBlocks: true, packetOrSchemaHashMismatchBlocks: true,
    preexistingFutureOutputBlocks: true, separateActivationRequired: true,
    nonSubscriptionAuthenticationBlocks: true, nonIsolatedContextBlocks: true,
    otherDebateVisibilityBlocks: true, fieldSetExpansionBlocks: true,
    scoreVisibilityOrAuthorshipBlocks: true, invalidOutputBlocksAtFrozenRampBoundary: true,
    automaticRetryBlocks: true, timeoutExtensionBlocks: true,
    recursiveCorrectionBlocks: true, paidServiceBlocks: true,
    productionMutationBlocks: true, nextBatchSelectionBlocks: true },
  authorization: { executionActivationPreparation: true,
    standingAuthorizationPermitsActivation: true, repairModelContexts: false,
    repairModelExecution: false, deterministicMergeAndCompleteValidation: false,
    retry: false, timeoutExtension: false, recursiveCorrectionModelExecution: false,
    publicationCompilation: false, paidServices: false,
    productionMutation: false, nextBatchSelection: false },
  totals: { debates: 2, contexts: 2, writableFields: 2,
    modelContextsExecuted: 0, modelAuthoredScores: 0,
    paidServiceCallsThisStage: 0, directIncrementalCostUsd: 0 },
  artifacts: { activation: ACTIVATION, execution: EXECUTION, analysis: ANALYSIS,
    repairOutputs: contexts.map((context) => context.repairOutput),
    validations: contexts.map((context) => context.validation),
    provenance: contexts.map((context) => context.provenance),
    mergedOutputs: ["03","185"].map((n) => `${ROOT}/merged/debate-${n}.json`),
    completeValidations: ["03","185"].map((n) => `${ROOT}/complete-validation-debate-${n}.json`),
    mergeAudits: ["03","185"].map((n) => `${ROOT}/merge-audit-debate-${n}.json`) },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  syntheticRepairs,
  nextAuthorizedAction:
    "activate-and-execute-exactly-two-frozen-single-field-publication-repair-contexts-for-debates-03-and-185"
};
if (shouldWrite) {
  for (const [file, bytes] of generated) { await mkdir(path.dirname(path.resolve(file)), { recursive: true });
    await writeFile(path.resolve(file), bytes); }
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? manifest.status : "preview",
  debates: ["03","185"], contexts: 2, writableFields: 2,
  writableFieldsPerContextMaximum: 1, model: manifest.model,
  schedulerRamp: [1,2], attemptsPerContext: 1, retriesMaximum: 0,
  repairModelContextsAuthorized: false, directIncrementalCostUsd: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
