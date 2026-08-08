#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/assessment-production/canary-v1-independent-judgments";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const MANIFEST = `${ROOT}/execution-manifest.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const EXECUTION_WORKFLOW = "docs/assessment-production-canary-independent-judgment-execution-workflow.md";
const RETIRED_EXECUTION = "docs/calibration/v4.2.21.17.25/hard-route-independent-judgments/model-execution.json";
const RETIRED_ANALYSIS = "docs/calibration/v4.2.21.17.25/hard-route-independent-judgments/analysis.json";
const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
if (shouldWrite) for (const file of [MANIFEST, EXECUTION, ANALYSIS]) {
  assertV4(!(await exists(file)), `${file} already exists; independent-judgment preregistration is immutable`);
}

const [preparation, retiredExecution, retiredAnalysis] = await Promise.all([
  readFile(PREPARATION, "utf8").then(JSON.parse),
  readFile(RETIRED_EXECUTION, "utf8").then(JSON.parse),
  readFile(RETIRED_ANALYSIS, "utf8").then(JSON.parse)
]);
assertV4(
  preparation.status === "twenty-production-canary-independent-judgment-contexts-prepared-and-frozen" &&
    preparation.productionCanary === true &&
    preparation.stagingOnly === true &&
    preparation.contexts.length === 20 &&
    preparation.totals.uniqueMoves === 186 &&
    preparation.totals.movesJudgedAcrossPasses === 372 &&
    preparation.totals.maximumCopiedInputBytes <= 115000 &&
    preparation.authorization.independentJudgmentExecutionManifest === true &&
    preparation.authorization.independentJudgmentModelExecution === false,
  "independent-judgment preparation does not authorize an execution manifest"
);
assertV4(
  preparation.model.label === "5.6 Sol" &&
    preparation.model.slug === "gpt-5.6-sol" &&
    preparation.model.reasoningEffort === "low" &&
    preparation.model.authentication === "ChatGPT subscription",
  "the frozen model or subscription identity changed"
);
assertV4(
  retiredExecution.status === "ten-hard-route-independent-judgment-contexts-passed" &&
    retiredExecution.validContexts === 10 &&
    retiredExecution.retries === 0 &&
    retiredExecution.maximumObservedConcurrency === 2 &&
    retiredAnalysis.status === "ten-hard-route-independent-judgments-passed-disagreement-extraction-authorized" &&
    retiredAnalysis.acceptance.passed === true,
  "the retired independent-judgment execution evidence is unavailable"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `preparation source hash mismatch: ${file}`);
}

const codexPath = "/Applications/ChatGPT.app/Contents/Resources/codex";
const codexCliVersion = execFileSync(codexPath, ["--version"], { encoding: "utf8" }).trim();
const runtimeFiles = [
  EXECUTION_WORKFLOW,
  "scripts/validate-assessment-production-canary-independent-judgment.mjs",
  "scripts/preregister-assessment-production-canary-independent-judgments.mjs",
  "scripts/run-assessment-production-canary-independent-judgments.mjs",
  "scripts/analyze-assessment-production-canary-independent-judgments.mjs",
  "scripts/test-assessment-production-canary-independent-judgment-gate.mjs"
];
const sourceFiles = [
  PREPARATION,
  RETIRED_EXECUTION,
  RETIRED_ANALYSIS,
  ...Object.keys(preparation.sourceHashes),
  ...runtimeFiles,
  ...preparation.contexts.flatMap((context) => [
    context.lockedInventory,
    context.sourcePacket,
    context.originalTranscript,
    context.originalEvents,
    context.originalManifest,
    context.fullLedger,
    context.judgmentPacket,
    context.schema
  ])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
const futureOutputPaths = [...new Set([
  ...preparation.contexts.flatMap((context) => [
    context.judgmentOutput,
    context.rawOutput,
    context.validationOutput,
    context.provenanceOutput
  ]),
  EXECUTION,
  ANALYSIS
])];
if (shouldWrite) for (const file of futureOutputPaths) {
  assertV4(!(await exists(file)), `future independent-judgment output already exists: ${file}`);
}

const rampPhases = [
  { phase: "operational-canary-one", maximumParallelContexts: 1, contextIndexes: [0], expansionRequiresAllValid: true },
  { phase: "ramp-two", maximumParallelContexts: 2, contextIndexes: [1, 2], expansionRequiresAllValid: true },
  { phase: "steady-two", maximumParallelContexts: 2, contextIndexes: Array.from({ length: 17 }, (_, index) => index + 3), expansionRequiresAllValid: false }
];
const retiredAggregateMinutes = retiredExecution.aggregateModelElapsedMs / 60000;
const retiredDurations = retiredExecution.results.map((result) => result.elapsedMs / 60000);
const manifest = {
  schemaVersion: "1.0-production-canary-independent-judgment-execution-manifest",
  protocolId: preparation.protocolId,
  status: "frozen-twenty-production-canary-independent-judgment-contexts-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  model: {
    label: preparation.model.label,
    slug: preparation.model.slug,
    reasoningEffort: preparation.model.reasoningEffort
  },
  costEstimate: {
    authentication: "ChatGPT subscription",
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    expectedParallelWallMinutes: [60, 105],
    expectedAggregateModelMinutes: [110, 185],
    expectedAggregateComputeHours: [1.83, 3.08],
    absoluteGateTimeoutMinutes: 180,
    estimateBasis: {
      retiredContexts: 10,
      retiredAggregateModelMinutes: Number(retiredAggregateMinutes.toFixed(2)),
      retiredMinimumContextMinutes: Number(Math.min(...retiredDurations).toFixed(2)),
      retiredMaximumContextMinutes: Number(Math.max(...retiredDurations).toFixed(2)),
      productionContexts: 20,
      maximumConcurrency: 2
    }
  },
  executionEnvironment: {
    codexPath,
    codexCliVersion,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true,
    isolatedTemporaryWorkingDirectories: true
  },
  modelInputs: { manual: preparation.inputs.manual },
  preparation: PREPARATION,
  contexts: preparation.contexts,
  retiredGateEvidence: {
    execution: RETIRED_EXECUTION,
    analysis: RETIRED_ANALYSIS,
    validContexts: retiredExecution.validContexts,
    retries: retiredExecution.retries,
    wallElapsedMs: retiredExecution.wallElapsedMs,
    aggregateModelElapsedMs: retiredExecution.aggregateModelElapsedMs,
    maximumObservedConcurrency: retiredExecution.maximumObservedConcurrency
  },
  isolation: {
    freshTemporaryCodexHomePerContext: true,
    freshTemporaryWorkingDirectoryPerContext: true,
    oneDebateAndOnePassPerContext: true,
    onlyManualSourcePacketJudgmentPacketAndSchemaAvailable: true,
    passAAndPassBShareOnlySourceAndByteIdenticalLockedInventory: true,
    otherPassOutputUnavailable: true,
    otherDebateOutputsUnavailable: true,
    candidateSelectionUnavailable: true,
    legacyAssessmentsScoresWinnersTagsAndPublicationProseUnavailable: true
  },
  executionPolicy: {
    contexts: 20,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutMsPerContext: 900000,
    absoluteGateTimeoutMs: 10800000,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    rampPhases,
    firstRealContextOperationalCanary: true,
    stopBeforeExpansionOnRampFailure: true,
    continueIndependentContextsWithinStartedSteadyPhaseAfterFailure: true,
    deterministicInputOrder: true,
    copiedInputBytesMaximum: 115000,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    removedEnvironmentVariables: [
      "OPENAI_API_KEY",
      "OPENAI_ORG_ID",
      "OPENAI_PROJECT_ID",
      "OPENAI_BASE_URL",
      "AZURE_OPENAI_API_KEY",
      "CODEX_API_KEY"
    ],
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0
  },
  deterministicCompilation: preparation.deterministicCompilation,
  canonicalEventProjection: {
    originalEventsHashLocked: true,
    projectedFields: ["startMs", "durationMs", "text"],
    optionalMetadataExcludedFromLedgerOnly: true,
    projectionReplayedBeforeValidation: true
  },
  audioPolicy: preparation.audioPolicy,
  acceptance: {
    validContextsRequired: 20,
    sameLockedInventoryPerPair: true,
    separatePassOutputsPerPair: true,
    unchangedV4220ValidatorPassesRequired: 20,
    semanticRepairs: 0,
    scores: 0
  },
  authorization: {
    modelContexts: true,
    deterministicValidation: true,
    deterministicCompilation: true,
    deterministicAnalysis: true,
    retry: false,
    semanticCorrection: false,
    disagreementExtraction: false,
    paidTranscription: false,
    audioVerification: false,
    adjudicationExecution: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  artifacts: {
    execution: EXECUTION,
    analysis: ANALYSIS,
    judgments: preparation.contexts.map((context) => context.judgmentOutput),
    rawOutputs: preparation.contexts.map((context) => context.rawOutput),
    validations: preparation.contexts.map((context) => context.validationOutput),
    provenance: preparation.contexts.map((context) => context.provenanceOutput)
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  sourceHashes
};
if (shouldWrite) await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  status: shouldWrite ? "frozen" : "preview",
  manifestStatus: manifest.status,
  contexts: manifest.contexts.map((context) => `${context.debateNumber}-${context.reviewerPass}`),
  rampPhases,
  attemptsMaximum: 20,
  retriesMaximum: 0,
  expectedParallelWallMinutes: manifest.costEstimate.expectedParallelWallMinutes,
  expectedAggregateComputeHours: manifest.costEstimate.expectedAggregateComputeHours,
  maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes,
  authentication: manifest.costEstimate.authentication,
  meteredApiCostUsdMaximum: 0,
  transcriptionCostUsdMaximum: 0,
  scoresDerived: 0
}, null, 2));
