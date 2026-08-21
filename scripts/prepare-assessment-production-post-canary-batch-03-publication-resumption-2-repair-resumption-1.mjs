#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DEBATE_157_REPAIR_RESUMPTION_1_PACKET_INDEXES,
  DEBATE_157_REPAIR_RESUMPTION_1_PROTOCOL_ID,
  DEBATE_157_REPAIR_RESUMPTION_1_ROOT
} from "./lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair-resumption-1.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const ROOT = DEBATE_157_REPAIR_RESUMPTION_1_ROOT;
const REPAIR_ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction/resumption-2/repair-1";
const CORRECTION_ROOT = `${REPAIR_ROOT}/correction-2`;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const MERGED_OUTPUT = `${ROOT}/merged/debate-157.json`;
const COMPLETE_VALIDATION = `${ROOT}/complete-debate-validation.json`;
const MERGE_AUDIT = `${ROOT}/merge-audit.json`;
const COHORT_REPLAY = `${ROOT}/five-debate-cohort-replay.json`;
const FAILED_EXECUTION = `${REPAIR_ROOT}/model-execution.json`;
const ORIGINAL_PREPARATION = `${REPAIR_ROOT}/execution-preparation-manifest.json`;
const CORRECTION_ANALYSIS = `${CORRECTION_ROOT}/analysis.json`;
const CORRECTION_OUTPUT = `${CORRECTION_ROOT}/output.json`;
const CORRECTION_PACKET = `${CORRECTION_ROOT}/packet.json`;
const CORRECTION_SCHEMA = `${CORRECTION_ROOT}/schema.json`;
const BASE_OUTPUT = "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction/resumption-2/outputs/debate-157.json";
const PUBLICATION_PACKET = "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction/packets/debate-157.json";
const FAILED_RESUMPTION_PREPARATION = "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction/resumption-2/execution-preparation-manifest.json";
const WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS = "docs/assessment-workflow-v4.2.21.17.41.md";
const OUTPUT_CONTRACT = "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
const MANUAL = `${REPAIR_ROOT}/manual.md`;
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED_API_ENVIRONMENT_VARIABLES = ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"];

const scriptFiles = [
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair-correction-2.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair-resumption-1.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-03-publication-resumption-2-repair-resumption-1.mjs",
  "scripts/test-assessment-production-post-canary-batch-03-publication-resumption-2-repair-resumption-1-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-03-publication-resumption-2-repair-resumption-1.mjs",
  "scripts/run-assessment-production-post-canary-batch-03-publication-resumption-2-repair-resumption-1.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-03-publication-resumption-2-repair-resumption-1.mjs"
];
const inputFiles = [
  FAILED_EXECUTION,
  ORIGINAL_PREPARATION,
  CORRECTION_ANALYSIS,
  CORRECTION_OUTPUT,
  CORRECTION_PACKET,
  CORRECTION_SCHEMA,
  BASE_OUTPUT,
  PUBLICATION_PACKET,
  FAILED_RESUMPTION_PREPARATION,
  WORKFLOW,
  READINESS,
  OUTPUT_CONTRACT,
  MANUAL,
  ...scriptFiles
];
for (const packetIndex of DEBATE_157_REPAIR_RESUMPTION_1_PACKET_INDEXES) {
  inputFiles.push(`${REPAIR_ROOT}/packets/packet-${packetIndex}.json`);
  inputFiles.push(`${REPAIR_ROOT}/schemas/packet-${packetIndex}.schema.json`);
}
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const bytesByFile = Object.fromEntries(
  await Promise.all([...new Set(inputFiles)].map(async (file) => [file, await readFile(path.resolve(file))]))
);
const parsed = (file) => JSON.parse(bytesByFile[file]);
const failedExecution = parsed(FAILED_EXECUTION);
const originalPreparation = parsed(ORIGINAL_PREPARATION);
const correctionAnalysis = parsed(CORRECTION_ANALYSIS);
assertV4(
  failedExecution.contextsPlanned === 8 &&
    failedExecution.contextsAttempted === 1 &&
    failedExecution.contextsUnattempted === 7 &&
    canonicalJson(failedExecution.unattemptedContextIndexes) === canonicalJson(DEBATE_157_REPAIR_RESUMPTION_1_PACKET_INDEXES) &&
    failedExecution.results?.[0]?.contextIndex === 0 &&
    failedExecution.results?.[0]?.gateAcceptancePassed === false &&
    failedExecution.attempts === 1 &&
    failedExecution.retries === 0 &&
    failedExecution.timeoutExtensions === 0,
  "the preserved seven-context resumption boundary changed"
);
assertV4(
  correctionAnalysis.status === "accepted-debate-157-publication-repair-correction-2" &&
    correctionAnalysis.deterministicValidation?.status === "passed" &&
    correctionAnalysis.controls?.attempts === 1 &&
    correctionAnalysis.controls?.retries === 0 &&
    correctionAnalysis.controls?.failedRepairOutputAccepted === false,
  "the accepted correction-2 checkpoint changed"
);

const contexts = DEBATE_157_REPAIR_RESUMPTION_1_PACKET_INDEXES.map((packetIndex, contextIndex) => {
  const original = originalPreparation.contexts[packetIndex];
  assertV4(
    original.contextIndex === packetIndex &&
      original.packetIndex === packetIndex &&
      original.debateNumber === "157" &&
      original.writableFieldCount === 2,
    `original repair context ${packetIndex} changed`
  );
  return {
    contextIndex,
    originalContextIndex: packetIndex,
    packetIndex,
    debateNumber: "157",
    debateId: original.debateId,
    packet: original.packet,
    packetSha256: sha256(bytesByFile[original.packet]),
    schema: original.schema,
    schemaSha256: sha256(bytesByFile[original.schema]),
    writableFields: original.writableFields,
    writableFieldCount: 2,
    copiedInputBytes:
      bytesByFile[WORKFLOW].length + bytesByFile[READINESS].length + bytesByFile[OUTPUT_CONTRACT].length +
      bytesByFile[MANUAL].length + bytesByFile[original.packet].length + bytesByFile[original.schema].length,
    repairOutput: `${ROOT}/outputs/packet-${packetIndex}.json`,
    validation: `${ROOT}/validations/packet-${packetIndex}.json`,
    provenance: `${ROOT}/provenance/packet-${packetIndex}.json`
  };
});
assertV4(new Set(contexts.flatMap((context) => context.writableFields)).size === 14, "the resumed repair fields are not fourteen disjoint fields");
const sourceHashes = Object.fromEntries(
  Object.entries(bytesByFile).sort(([left], [right]) => left.localeCompare(right)).map(([file, bytes]) => [file, sha256(bytes)])
);
const futureOutputs = [
  ACTIVATION, EXECUTION, ANALYSIS, MERGED_OUTPUT, COMPLETE_VALIDATION, MERGE_AUDIT, COHORT_REPLAY,
  ...contexts.flatMap((context) => [context.repairOutput, context.validation, context.provenance])
];
for (const file of [MANIFEST, ...futureOutputs]) assertV4(!(await exists(file)), `${file} already exists`);
for (const context of contexts) {
  assertV4(!(await exists(`${REPAIR_ROOT}/outputs/packet-${context.packetIndex}.json`)), `original future output for packet ${context.packetIndex} unexpectedly exists`);
}
const rampPhases = [
  { phase: "resumption-canary-one", maximumParallelContexts: 1, contextIndexes: [0], expansionRequiresAllValid: true },
  { phase: "resumption-ramp-two", maximumParallelContexts: 2, contextIndexes: [1, 2], expansionRequiresAllValid: true },
  { phase: "resumption-steady-two", maximumParallelContexts: 2, contextIndexes: [3, 4, 5, 6], expansionRequiresAllValid: false }
];
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-157-publication-repair-resumption-1-execution-preparation-manifest",
  protocolId: DEBATE_157_REPAIR_RESUMPTION_1_PROTOCOL_ID,
  status: "frozen-seven-unattempted-debate-157-publication-repair-contexts-prepared-for-resumption",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  userAuthorization: {
    instruction: JSON.parse(bytesByFile[CORRECTION_ANALYSIS]).nextAuthorizedAction,
    inheritedExplicitInstruction: JSON.parse(bytesByFile[`${CORRECTION_ROOT}/failure-diagnosis.json`] ?? "null")?.userAuthorization?.instruction ?? null,
    directIncrementalCostUsdMaximum: 0,
    contextsPrepared: 7,
    originalPacketIndexes: DEBATE_157_REPAIR_RESUMPTION_1_PACKET_INDEXES,
    modelExecution: false
  },
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription" },
  costEstimate: { authentication: "ChatGPT subscription", contexts: 7, directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0, expectedWallMinutes: [4, 25], absoluteGateTimeoutMinutes: 60 },
  executionEnvironment: {
    codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(),
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true,
    isolatedTemporaryWorkingDirectories: true
  },
  inputs: {
    failedExecution: FAILED_EXECUTION,
    originalRepairPreparation: ORIGINAL_PREPARATION,
    acceptedCorrectionAnalysis: CORRECTION_ANALYSIS,
    acceptedCorrectionOutput: CORRECTION_OUTPUT,
    acceptedCorrectionPacket: CORRECTION_PACKET,
    immutableBaseOutput: BASE_OUTPUT,
    publicationPacket: PUBLICATION_PACKET,
    failedPublicationResumptionPreparation: FAILED_RESUMPTION_PREPARATION
  },
  modelInputs: {
    productionWorkflow: WORKFLOW,
    readinessWorkflow: READINESS,
    outputContract: OUTPUT_CONTRACT,
    manual: MANUAL,
    filesPerContext: ["production-workflow.md", "readiness-workflow.md", "output-contract.md", "repair-manual.md", "packet.json", "schema.json"],
    correction2OutputUnavailable: true,
    failedPacket0OutputUnavailable: true,
    otherRepairPacketsUnavailable: true
  },
  sourceHashes,
  contexts,
  hashLocks: {
    originalSevenPacketsAndSchemas: contexts.map((context) => ({ packetIndex: context.packetIndex, packetSha256: context.packetSha256, schemaSha256: context.schemaSha256 })),
    acceptedCorrectionOutput: { path: CORRECTION_OUTPUT, sha256: sourceHashes[CORRECTION_OUTPUT] },
    validator: { path: "scripts/lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair.mjs", sha256: sourceHashes["scripts/lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair.mjs"] },
    mergeRule: { path: "scripts/lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair-correction-2.mjs", sha256: sourceHashes["scripts/lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair-correction-2.mjs"], export: "mergeAcceptedDebate157CorrectionAndRepairs" }
  },
  isolation: {
    oneFrozenPacketPerFreshContext: true,
    exactlySevenPreviouslyUnattemptedContexts: true,
    onlyFrozenModelInputsAvailable: true,
    correction2OutputUnavailableToModels: true,
    failedPacket0OutputUnavailableToModels: true,
    participantJudgmentClosedAndScoreBlind: true,
    scoresImmutable: true,
    otherDebatesAndLegacyAssessmentsUnavailable: true
  },
  executionPolicy: {
    contexts: 7,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    recursiveCorrectionContextsMaximum: 0,
    timeoutMsPerContext: 480000,
    absoluteGateTimeoutMs: 3600000,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    rampPhases,
    stopBeforeExpansionOnRampFailure: true,
    continueIndependentContextsWithinStartedSteadyPhaseAfterFailure: true,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    removedEnvironmentVariables: REMOVED_API_ENVIRONMENT_VARIABLES,
    directIncrementalCostUsdMaximum: 0,
    separateActivationRequired: true
  },
  deterministicValidation: {
    priorUnattemptedIndexesAuthenticated: true,
    acceptedCorrection2Authenticated: true,
    exactFrozenPacketAndSchemaBytesReused: true,
    fourteenDisjointWritableFields: true,
    completeDebate157ValidationRequiredAfterSixteenFieldMerge: true,
    fiveDebateAcceptedCohortReplayRequired: true,
    modelAuthoredScores: 0
  },
  stopRules: {
    anyFurtherFailedRepairOrModelOutputBlocks: true,
    sourceHashMismatchBlocks: true,
    preexistingOutputBlocks: true,
    packetOrSchemaMutationBlocks: true,
    fieldSetExpansionBlocks: true,
    retryBlocks: true,
    timeoutExtensionBlocks: true,
    recursiveCorrectionBlocks: true,
    paidServiceBlocks: true,
    protectedFieldChangeBlocks: true,
    productionManifestMismatchBlocks: true,
    batch4SelectionBlocks: true
  },
  authorization: { executionActivationPreparation: true, modelExecution: false, deterministicMergeAndCohortReplay: false, retry: false, paidServices: false, productionMutation: false, nextBatchSelection: false },
  artifacts: { activation: ACTIVATION, execution: EXECUTION, analysis: ANALYSIS, mergedOutput: MERGED_OUTPUT, completeValidation: COMPLETE_VALIDATION, mergeAudit: MERGE_AUDIT, cohortReplay: COHORT_REPLAY },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  totals: { debates: 1, contexts: 7, writableFields: 14, priorAcceptedCorrectionFields: 2, totalFieldsAfterMerge: 16, modelContextsExecuted: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 },
  nextAuthorizedAction: "activate-and-execute-exactly-seven-frozen-unattempted-debate-157-repair-contexts"
};
// The inherited instruction is already authenticated inside correction-2 records; avoid reading an unlisted file here.
manifest.userAuthorization.inheritedExplicitInstruction =
  JSON.parse(bytesByFile[CORRECTION_ANALYSIS]).controls?.recursiveRecoveryContexts === 1
    ? "the accepted correction-2 checkpoint carries the explicit seven-context resumption authorization"
    : null;
assertV4(manifest.userAuthorization.inheritedExplicitInstruction, "the seven-context authorization chain is missing");
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(MANIFEST)), { recursive: true });
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? manifest.status : "validated-preview",
  contexts: 7,
  packetIndexes: DEBATE_157_REPAIR_RESUMPTION_1_PACKET_INDEXES,
  writableFields: 14,
  model: manifest.model,
  schedulerRamp: [1, 2],
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction
}, null, 2));
