#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_DEBATES,
  POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_PROTOCOL_ID,
  POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_ROOT
} from "./lib/assessment-production-post-canary-batch-03-publication-resumption-3.mjs";
import { validatePostCanaryBatch03PublicationOutput } from "./lib/assessment-production-post-canary-batch-03-publication-validation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const ROOT = POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_ROOT;
const PUBLICATION_ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction";
const RESUMPTION_2_ROOT = `${PUBLICATION_ROOT}/resumption-2`;
const REPAIR_COMPLETION_ROOT = `${RESUMPTION_2_ROOT}/repair-1/resumption-1`;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const COHORT_REPLAY = `${ROOT}/ten-debate-cohort-replay.json`;
const FAILED_EXECUTION = `${RESUMPTION_2_ROOT}/model-execution.json`;
const RESUMPTION_2_PREPARATION = `${RESUMPTION_2_ROOT}/execution-preparation-manifest.json`;
const REPAIR_ANALYSIS = `${REPAIR_COMPLETION_ROOT}/analysis.json`;
const REFERENCE_CATALOG = `${PUBLICATION_ROOT}/reference-catalog.json`;
const MANUAL = `${PUBLICATION_ROOT}/manual.md`;
const WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS = "docs/assessment-workflow-v4.2.21.17.41.md";
const OUTPUT_CONTRACT = "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED_API_ENVIRONMENT_VARIABLES = ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"];
const acceptedOutputs = {
  "124": `${PUBLICATION_ROOT}/repair-1/merged/debate-124.json`,
  "14": `${PUBLICATION_ROOT}/resumption-1/outputs/debate-14.json`,
  "58": `${PUBLICATION_ROOT}/resumption-1/repair-1/merged/debate-58.json`,
  "150": `${PUBLICATION_ROOT}/resumption-1/repair-1/merged/debate-150.json`,
  "157": `${REPAIR_COMPLETION_ROOT}/merged/debate-157.json`
};
const scriptFiles = [
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-publication-resumption-3.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-03-publication-resumption-3.mjs",
  "scripts/test-assessment-production-post-canary-batch-03-publication-resumption-3-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-03-publication-resumption-3.mjs",
  "scripts/run-assessment-production-post-canary-batch-03-publication-resumption-3.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-03-publication-resumption-3.mjs"
];
const inputFiles = [
  FAILED_EXECUTION, RESUMPTION_2_PREPARATION, REPAIR_ANALYSIS, REFERENCE_CATALOG, MANUAL,
  WORKFLOW, READINESS, OUTPUT_CONTRACT, ...scriptFiles,
  ...Object.values(acceptedOutputs)
];
for (const debateNumber of [...Object.keys(acceptedOutputs), ...POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_DEBATES]) {
  inputFiles.push(`${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`);
}
for (const debateNumber of POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_DEBATES) {
  inputFiles.push(`${PUBLICATION_ROOT}/schemas/debate-${debateNumber}.schema.json`);
}
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const bytesByFile = Object.fromEntries(
  await Promise.all([...new Set(inputFiles)].map(async (file) => [file, await readFile(path.resolve(file))]))
);
const parsed = (file) => JSON.parse(bytesByFile[file]);
const failedExecution = parsed(FAILED_EXECUTION);
const priorPreparation = parsed(RESUMPTION_2_PREPARATION);
const repairAnalysis = parsed(REPAIR_ANALYSIS);
assertV4(
  failedExecution.contextsPlanned === 6 &&
    failedExecution.contextsAttempted === 1 &&
    failedExecution.contextsUnattempted === 5 &&
    canonicalJson(failedExecution.unattemptedContextIndexes) === canonicalJson([1, 2, 3, 4, 5]) &&
    failedExecution.results?.[0]?.debateNumber === "157" &&
    failedExecution.results?.[0]?.gateAcceptancePassed === false &&
    failedExecution.attempts === 1 && failedExecution.retries === 0 && failedExecution.timeoutExtensions === 0,
  "the preserved five-context publication resumption boundary changed"
);
assertV4(
  repairAnalysis.status === "batch-03-debate-157-correction-2-and-seven-context-repair-resumption-passed" &&
    repairAnalysis.gate?.completeDebate157ValidationPassed === true &&
    repairAnalysis.gate?.completeFiveDebateCohortReplayPassed === true &&
    repairAnalysis.gate?.cohort?.debates === 5 &&
    repairAnalysis.gate?.cohort?.moves === 103,
  "the accepted five-debate publication cohort changed"
);

const contexts = POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_DEBATES.map((debateNumber, contextIndex) => {
  const original = priorPreparation.contexts[contextIndex + 1];
  assertV4(original.debateNumber === debateNumber && original.originalContextIndex >= 0, `Debate ${debateNumber}: frozen context order changed`);
  return {
    contextIndex,
    originalContextIndex: original.contextIndex,
    originalPublicationContextIndex: original.originalContextIndex,
    debateNumber,
    debateId: original.debateId,
    packet: original.packet,
    packetSha256: sha256(bytesByFile[original.packet]),
    schema: original.schema,
    schemaSha256: sha256(bytesByFile[original.schema]),
    copiedInputBytes:
      bytesByFile[WORKFLOW].length + bytesByFile[READINESS].length + bytesByFile[OUTPUT_CONTRACT].length +
      bytesByFile[MANUAL].length + bytesByFile[REFERENCE_CATALOG].length + bytesByFile[original.packet].length + bytesByFile[original.schema].length,
    rawOutput: `${ROOT}/outputs/debate-${debateNumber}.json`,
    validation: `${ROOT}/validations/debate-${debateNumber}.json`,
    provenance: `${ROOT}/provenance/debate-${debateNumber}.json`
  };
});
const accepted = {};
for (const [debateNumber, output] of Object.entries(acceptedOutputs)) {
  const packet = `${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`;
  const validation = validatePostCanaryBatch03PublicationOutput(parsed(output), parsed(packet));
  accepted[debateNumber] = { debateNumber, output, outputSha256: sha256(bytesByFile[output]), packet, packetSha256: sha256(bytesByFile[packet]), replay: validation };
}
const sourceHashes = Object.fromEntries(
  Object.entries(bytesByFile).sort(([left], [right]) => left.localeCompare(right)).map(([file, bytes]) => [file, sha256(bytes)])
);
const futureOutputs = [ACTIVATION, EXECUTION, ANALYSIS, COHORT_REPLAY, ...contexts.flatMap((context) => [context.rawOutput, context.validation, context.provenance])];
for (const file of [MANIFEST, ...futureOutputs]) assertV4(!(await exists(file)), `${file} already exists`);
for (const context of contexts) assertV4(!(await exists(`${RESUMPTION_2_ROOT}/outputs/debate-${context.debateNumber}.json`)), `Debate ${context.debateNumber}: an original future output unexpectedly exists`);
const rampPhases = [
  { phase: "resumption-canary-one", maximumParallelContexts: 1, contextIndexes: [0], expansionRequiresAllValid: true },
  { phase: "resumption-ramp-two", maximumParallelContexts: 2, contextIndexes: [1, 2], expansionRequiresAllValid: true },
  { phase: "resumption-steady-two", maximumParallelContexts: 2, contextIndexes: [3, 4], expansionRequiresAllValid: false }
];
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-publication-resumption-3-execution-preparation-manifest",
  protocolId: POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_PROTOCOL_ID,
  status: "frozen-five-unattempted-batch-03-publication-contexts-prepared-for-resumption",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  userAuthorization: { standingAuthorizationApplied: true, failureRecoveryAuthorizationApplied: true, explicitDebate157RecoveryApplied: true, directIncrementalCostUsdMaximum: 0, contextsPrepared: 5, debates: POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_DEBATES, modelExecution: false },
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription" },
  costEstimate: { authentication: "ChatGPT subscription", contexts: 5, directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0, expectedWallMinutes: [5, 30], absoluteGateTimeoutMinutes: 60 },
  executionEnvironment: { codexPath: CODEX_PATH, codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(), authentication: "ChatGPT subscription", APIKeysRemoved: true, isolatedTemporaryCodexHomes: true, isolatedTemporaryWorkingDirectories: true },
  inputs: { failedResumption2Execution: FAILED_EXECUTION, failedResumption2Preparation: RESUMPTION_2_PREPARATION, acceptedDebate157RepairAnalysis: REPAIR_ANALYSIS, acceptedOutputs: accepted },
  modelInputs: {
    productionWorkflow: WORKFLOW,
    readinessWorkflow: READINESS,
    outputContract: OUTPUT_CONTRACT,
    manual: MANUAL,
    referenceCatalog: REFERENCE_CATALOG,
    filesPerContext: ["production-workflow.md", "readiness-workflow.md", "output-contract.md", "manual.md", "reference-catalog.json", "packet.json", "schema.json"],
    acceptedOutputsUnavailable: true,
    otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true
  },
  sourceHashes,
  contexts,
  acceptedOutputs: accepted,
  hashLocks: { fivePacketsAndSchemas: contexts.map(({ debateNumber, packetSha256, schemaSha256 }) => ({ debateNumber, packetSha256, schemaSha256 })), acceptedFiveOutputs: Object.values(accepted).map(({ debateNumber, outputSha256 }) => ({ debateNumber, outputSha256 })), validator: { path: "scripts/lib/assessment-production-post-canary-batch-03-publication-validation.mjs", sha256: sourceHashes["scripts/lib/assessment-production-post-canary-batch-03-publication-validation.mjs"] } },
  isolation: { oneDebatePerFreshContext: true, onlyOwnFrozenPacketSchemaAndSharedContractsAvailable: true, acceptedOutputsUnavailable: true, otherDebatesUnavailable: true, legacyAssessmentsUnavailable: true, participantJudgmentClosedAndScoreBlind: true, scoresImmutable: true },
  executionPolicy: { contexts: 5, attemptsPerContext: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0, correctionContextsMaximum: 0, timeoutMsPerContext: 600000, absoluteGateTimeoutMs: 3600000, maximumParallelContexts: 2, schedulerRamp: [1, 2], rampPhases, stopBeforeExpansionOnRampFailure: true, continueIndependentContextsWithinStartedSteadyPhaseAfterFailure: true, authentication: "ChatGPT subscription", APIKeysRemoved: true, removedEnvironmentVariables: REMOVED_API_ENVIRONMENT_VARIABLES, directIncrementalCostUsdMaximum: 0, separateActivationRequired: true },
  deterministicValidation: { priorUnattemptedIndexesAuthenticated: true, acceptedFiveDebateCohortReplayed: true, exactFrozenPacketAndSchemaBytesReused: true, fullTenDebateCohortReplayRequired: true, expectedDebates: 10, expectedMoves: 200, expectedCritiques: 200, expectedExactSourceQuotes: 20, expectedOverallCommentarySides: 20, expectedAiExtensionSides: 20, modelAuthoredScores: 0 },
  stopRules: { anyFailedModelOutputBlocks: true, sourceHashMismatchBlocks: true, preexistingOutputBlocks: true, packetOrSchemaMutationBlocks: true, scoreOrSourceChangeBlocks: true, retryBlocks: true, timeoutExtensionBlocks: true, repairPreparationBlocks: true, paidServiceBlocks: true, productionMutationBlocks: true, batch4SelectionBlocks: true },
  authorization: { executionActivationPreparation: true, publicationModelExecution: false, deterministicTenDebateCohortReplay: false, repairPreparation: false, retry: false, paidServices: false, productionMutation: false, nextBatchSelection: false },
  artifacts: { activation: ACTIVATION, execution: EXECUTION, analysis: ANALYSIS, cohortReplay: COHORT_REPLAY },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  totals: { acceptedDebatesBeforeResumption: 5, contexts: 5, expectedAcceptedDebatesAfterResumption: 10, modelContextsExecuted: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 },
  nextAuthorizedAction: "activate-and-execute-exactly-five-frozen-unattempted-batch-03-publication-contexts"
};
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(MANIFEST)), { recursive: true });
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? manifest.status : "validated-preview", debates: POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_DEBATES, contexts: 5, acceptedBefore: 5, model: manifest.model, schedulerRamp: [1, 2], directIncrementalCostUsd: 0, nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
