#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_DEBATE_64_BASE_OUTPUT,
  POST_CANARY_BATCH_05_DEBATE_64_PUBLICATION_PACKET,
  POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS,
  POST_CANARY_BATCH_05_DEBATE_64_REPAIR_PACKET_VERSION,
  POST_CANARY_BATCH_05_DEBATE_64_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_05_DEBATE_64_REPAIR_ROOT,
  buildDebate64RepairSchema
} from "./lib/assessment-production-post-canary-batch-05-publication-repair.mjs";
import {
  POST_CANARY_BATCH_05_PUBLICATION_MODEL,
  POST_CANARY_BATCH_05_PUBLICATION_ROOT
} from "./lib/assessment-production-post-canary-batch-05-publication.mjs";
import {
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch05StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-05-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const ROOT = POST_CANARY_BATCH_05_DEBATE_64_REPAIR_ROOT;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const PACKET = `${ROOT}/packets/packet-0.json`;
const SCHEMA = `${ROOT}/schemas/packet-0.schema.json`;
const MANUAL = `${ROOT}/manual.md`;
const DIAGNOSIS = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/failure-diagnosis.json`;
const FAILED_EXECUTION = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/model-execution.json`;
const FAILED_ANALYSIS = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/analysis.json`;
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const OUTPUT_CONTRACT =
  "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED_API_ENVIRONMENT_VARIABLES = [
  "OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"
];
const STATIC_SOURCE_FILES = [
  PRODUCTION_WORKFLOW, READINESS_WORKFLOW, OUTPUT_CONTRACT, MANUAL,
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION, DIAGNOSIS, FAILED_EXECUTION,
  FAILED_ANALYSIS, POST_CANARY_BATCH_05_DEBATE_64_BASE_OUTPUT,
  POST_CANARY_BATCH_05_DEBATE_64_PUBLICATION_PACKET,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication-repair.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-standing-authorization.mjs",
  "scripts/diagnose-assessment-production-post-canary-batch-05-publication-failure.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-05-publication-repair.mjs",
  "scripts/test-assessment-production-post-canary-batch-05-publication-repair-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-05-publication-repair.mjs",
  "scripts/run-assessment-production-post-canary-batch-05-publication-repair.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-05-publication-repair.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

const inputFiles = [
  DIAGNOSIS, FAILED_EXECUTION, FAILED_ANALYSIS,
  POST_CANARY_BATCH_05_DEBATE_64_BASE_OUTPUT,
  POST_CANARY_BATCH_05_DEBATE_64_PUBLICATION_PACKET,
  PRODUCTION_WORKFLOW, READINESS_WORKFLOW, OUTPUT_CONTRACT, MANUAL
];
const bytesByFile = Object.fromEntries(await Promise.all(
  inputFiles.map(async (file) => [file, await readFile(path.resolve(file))])
));
const parsed = (file) => JSON.parse(bytesByFile[file]);
const diagnosis = parsed(DIAGNOSIS);
const execution = parsed(FAILED_EXECUTION);
const analysis = parsed(FAILED_ANALYSIS);
const baseOutput = parsed(POST_CANARY_BATCH_05_DEBATE_64_BASE_OUTPUT);
const publicationPacket = parsed(POST_CANARY_BATCH_05_DEBATE_64_PUBLICATION_PACKET);
const standingAuthorization = await loadAndValidatePostCanaryBatch05StandingAuthorization();

assertV4(
  diagnosis.status === "diagnosed-batch-05-debate-64-two-field-publication-validation-failure" &&
    diagnosis.failureBoundary?.failedFieldCount === 2 &&
    canonicalJson(diagnosis.diagnosticReplay?.hypotheticalWritableFields) ===
      canonicalJson(POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS) &&
    diagnosis.diagnosticReplay?.result?.status === "passed" &&
    diagnosis.prospectiveRecoveryOnly?.explicitlyAuthorized === true &&
    diagnosis.prospectiveRecoveryOnly?.proposedRepairPacketCount === 1,
  "the frozen Debate 64 diagnosis changed"
);
assertV4(
  execution.contextsAttempted === 3 && execution.contextsUnattempted === 7 &&
    execution.validContexts === 2 && execution.invalidContexts === 1 &&
    execution.retries === 0 && execution.timeoutExtensions === 0 &&
    analysis.status === "post-canary-batch-05-publication-output-gate-failed",
  "the preserved failed publication gate changed"
);
assertV4(
  sha256(bytesByFile[POST_CANARY_BATCH_05_DEBATE_64_BASE_OUTPUT]) ===
      diagnosis.failedContext.outputSha256 &&
    sha256(bytesByFile[POST_CANARY_BATCH_05_DEBATE_64_PUBLICATION_PACKET]) ===
      diagnosis.artifacts.packet.sha256,
  "a diagnosed Debate 64 source artifact drifted"
);

const quote = baseOutput.representativeQuotes.con;
const quoteMove = publicationPacket.moves.find(({ moveId }) => moveId === quote.sourceMoveId);
const critiqueMove = publicationPacket.moves.find(
  ({ moveId }) => moveId === "con-first-cause-identification-gap"
);
const critique = baseOutput.moveProse[critiqueMove.moveId].critique;
const packet = {
  schemaVersion: POST_CANARY_BATCH_05_DEBATE_64_REPAIR_PACKET_VERSION,
  protocolId: POST_CANARY_BATCH_05_DEBATE_64_REPAIR_PROTOCOL_ID,
  packetIndex: 0,
  productionCanary: false,
  batchNumber: 5,
  stagingOnly: true,
  debateNumber: "64",
  debateId: publicationPacket.debateId,
  repairType: "representative-quote-exactness-and-critique-word-boundary",
  immutableBaseOutput: POST_CANARY_BATCH_05_DEBATE_64_BASE_OUTPUT,
  publicationPacket: POST_CANARY_BATCH_05_DEBATE_64_PUBLICATION_PACKET,
  participantJudgmentWasScoreBlind: true,
  publicationIsScoreLocked: true,
  scoresRepositoryOwnedAndImmutable: true,
  constraints: {
    writableFields: POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS,
    writableFieldCount: 2,
    maximumWritableFields: 2,
    allOtherPublicationFieldsImmutable: true,
    scoreFieldsUnavailableAsOutputs: true,
    quoteTargetWords: [6, 14], quoteAcceptanceWords: [3, 18],
    quoteMustBeExactEligibleSourceSubstring: true,
    critiqueLabels: ["Strongest feature:", "Principal limitation:", "Live burden:", "Locked score:"],
    critiqueTargetWords: [112, 118], critiqueAcceptanceWords: [105, 130],
    critiqueAcceptanceMinimumCharacters: 880, critiqueExactSentenceCount: 4,
    terminalPunctuation: true,
    unexpectedCJKHangulKanaAndReplacementCharactersRejected: true,
    preserveAdjudicatedSubstanceAndLockedScoreBand: true
  },
  corrections: [
    {
      field: POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS[0],
      repairType: "representative-quote", side: "con",
      sourceMoveId: quote.sourceMoveId, originalText: quote.text,
      originalContext: quote.context, quoteEligible: quoteMove.quoteEligible,
      sourceExcerpt: quoteMove.sourceExcerpt, sourceSpan: quoteMove.sourceSpan,
      defect: "the original text is a paraphrase rather than an exact source substring"
    },
    {
      field: POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS[1],
      repairType: "critique", moveId: critiqueMove.moveId,
      originalCritique: critique, originalWords: 131, originalCharacters: 976,
      excessWordsAboveAcceptanceMaximum: 1, lockedMove: critiqueMove,
      defect: "the original critique contains one word above the 130-word acceptance maximum"
    }
  ]
};
assertV4(quoteMove?.quoteEligible === true && !quoteMove.sourceExcerpt.includes(quote.text),
  "the quote defect changed");
assertV4(critique.trim().split(/\s+/).length === 131 && critique.length === 976,
  "the critique defect changed");
const schema = buildDebate64RepairSchema(packet);
const packetBytes = pretty(packet);
const schemaBytes = pretty(schema);
const context = {
  contextIndex: 0, packetIndex: 0, debateNumber: "64", debateId: packet.debateId,
  repairType: packet.repairType,
  packet: PACKET, packetSha256: sha256(packetBytes),
  schema: SCHEMA, schemaSha256: sha256(schemaBytes),
  writableFields: POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS,
  writableFieldCount: 2,
  packetBytes: packetBytes.length, schemaBytes: schemaBytes.length,
  copiedInputBytes: bytesByFile[PRODUCTION_WORKFLOW].length +
    bytesByFile[READINESS_WORKFLOW].length + bytesByFile[OUTPUT_CONTRACT].length +
    bytesByFile[MANUAL].length + packetBytes.length + schemaBytes.length,
  repairOutput: `${ROOT}/outputs/packet-0.json`,
  validation: `${ROOT}/validations/packet-0.json`,
  provenance: `${ROOT}/provenance/packet-0.json`
};
const futureOutputs = [
  `${ROOT}/execution-activation.json`, `${ROOT}/model-execution.json`, `${ROOT}/analysis.json`,
  context.repairOutput, context.validation, context.provenance,
  `${ROOT}/merged/debate-64.json`, `${ROOT}/complete-debate-validation.json`,
  `${ROOT}/merge-audit.json`
];
const sourceHashes = {};
for (const file of [...new Set(STATIC_SOURCE_FILES)].sort()) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
sourceHashes[PACKET] = context.packetSha256;
sourceHashes[SCHEMA] = context.schemaSha256;
for (const file of [MANIFEST, PACKET, SCHEMA, ...futureOutputs]) {
  assertV4(!(await exists(file)), `${file} already exists`);
}

const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-64-publication-repair-execution-preparation-manifest",
  protocolId: POST_CANARY_BATCH_05_DEBATE_64_REPAIR_PROTOCOL_ID,
  status: "frozen-one-isolated-two-field-batch-05-debate-64-publication-repair-context-prepared-and-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 5, stagingOnly: true, AIOnly: true,
  userAuthorization: diagnosis.userAuthorization,
  model: structuredClone(POST_CANARY_BATCH_05_PUBLICATION_MODEL),
  costEstimate: {
    authentication: "ChatGPT subscription", contexts: 1,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    expectedWallMinutes: [2, 8], absoluteGateTimeoutMinutes: 8
  },
  inputs: {
    productionWorkflow: PRODUCTION_WORKFLOW, readinessWorkflow: READINESS_WORKFLOW,
    outputContract: OUTPUT_CONTRACT, manual: MANUAL, diagnosis: DIAGNOSIS,
    failedExecution: FAILED_EXECUTION, failedAnalysis: FAILED_ANALYSIS,
    immutableBaseOutput: POST_CANARY_BATCH_05_DEBATE_64_BASE_OUTPUT,
    publicationPacket: POST_CANARY_BATCH_05_DEBATE_64_PUBLICATION_PACKET
  },
  contexts: [context],
  modelInputs: {
    productionWorkflow: PRODUCTION_WORKFLOW, readinessWorkflow: READINESS_WORKFLOW,
    outputContract: OUTPUT_CONTRACT, manual: MANUAL
  },
  isolation: {
    freshTemporaryWorkingDirectoryPerContext: true,
    freshTemporaryCodexHomePerContext: true,
    subscriptionAuthFileOnly: true, otherRepairPacketsUnavailable: true,
    otherDebatesUnavailable: true, legacyAssessmentsUnavailable: true,
    APIKeysRemoved: true
  },
  repairContract: {
    packets: 1, debates: 1, writableFields: 2, maximumWritableFieldsPerPacket: 2,
    allOtherFieldsImmutable: true, scoresRepositoryOwnedAndImmutable: true,
    modelAuthoredScoresMaximum: 0, recursiveRepairMaximum: 0
  },
  executionEnvironment: {
    codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(),
    shell: false
  },
  executionPolicy: {
    contexts: 1, attemptsPerContext: 1, retriesMaximum: 0,
    timeoutExtensionsMaximum: 0, recursiveCorrectionContextsMaximum: 0,
    timeoutMsPerContext: 480000, absoluteGateTimeoutMs: 480000,
    maximumParallelContexts: 1, schedulerRamp: [1],
    deterministicInputOrder: true, authentication: "ChatGPT subscription",
    APIKeysRemoved: true, removedEnvironmentVariables: REMOVED_API_ENVIRONMENT_VARIABLES,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    separateActivationRequired: true
  },
  stopRules: {
    sourceHashMismatchBlocks: true, packetOrSchemaHashMismatchBlocks: true,
    preexistingFutureOutputBlocks: true, separateActivationRequired: true,
    nonSubscriptionAuthenticationBlocks: true, apiKeyVisibilityBlocks: true,
    nonIsolatedContextBlocks: true, otherRepairPacketVisibilityBlocks: true,
    otherDebateOrLegacyAssessmentVisibilityBlocks: true, fieldSetExpansionBlocks: true,
    scoreVisibilityOrAuthorshipBlocks: true, immutableFieldMutationBlocks: true,
    invalidOutputBlocks: true, timeoutBlocks: true, automaticRetryBlocks: true,
    timeoutExtensionBlocks: true, recursiveCorrectionBlocks: true,
    paidServiceBlocks: true, productionMutationBlocks: true, nextBatchSelectionBlocks: true
  },
  sourceHashes,
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  artifacts: {
    preparation: MANIFEST, activation: futureOutputs[0], execution: futureOutputs[1],
    analysis: futureOutputs[2], mergedOutput: futureOutputs[6],
    completeValidation: futureOutputs[7], mergeAudit: futureOutputs[8]
  },
  authorization: {
    executionActivationPreparation: true, repairModelExecution: false,
    deterministicRepairOutputValidation: false, deterministicMergeAndCompleteValidation: false,
    sevenContextResumptionPreparation: false, paidServices: false,
    productionMutation: false, nextBatchSelection: false
  },
  nextAuthorizedAction: "activate-and-execute-exactly-one-frozen-debate-64-two-field-publication-repair-context"
};

if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(PACKET)), { recursive: true });
  await mkdir(path.dirname(path.resolve(SCHEMA)), { recursive: true });
  await writeFile(path.resolve(PACKET), packetBytes);
  await writeFile(path.resolve(SCHEMA), schemaBytes);
  await writeFile(path.resolve(MANIFEST), pretty(manifest));
}
console.log(JSON.stringify({
  status: manifest.status, contextsPrepared: 1, writableFieldsPrepared: 2,
  packetSha256: context.packetSha256, schemaSha256: context.schemaSha256,
  model: manifest.model, attemptsPerContext: 1, retriesMaximum: 0,
  directIncrementalCostUsdMaximum: 0, nextAuthorizedAction: manifest.nextAuthorizedAction
}, null, 2));
