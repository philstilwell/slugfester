#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/assessment-production/canary-v1-inventory";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const MANIFEST = `${ROOT}/execution-manifest.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const EXECUTION_WORKFLOW = "docs/assessment-production-canary-inventory-execution-workflow.md";
const RETIRED_EXECUTION = "docs/calibration/v4.2.21.17.24/hard-route-score-blind-inventory/model-execution.json";
const RETIRED_ANALYSIS = "docs/calibration/v4.2.21.17.24/hard-route-score-blind-inventory/analysis.json";
const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
if (shouldWrite) {
  for (const file of [MANIFEST, EXECUTION, ANALYSIS]) {
    assertV4(!(await exists(file)), `${file} already exists; inventory preregistration is immutable`);
  }
}

const [preparation, retiredExecution, retiredAnalysis] = await Promise.all([
  readFile(PREPARATION, "utf8").then(JSON.parse),
  readFile(RETIRED_EXECUTION, "utf8").then(JSON.parse),
  readFile(RETIRED_ANALYSIS, "utf8").then(JSON.parse)
]);
assertV4(
  preparation.status === "ten-production-canary-score-blind-inventory-contexts-prepared" &&
    preparation.productionCanary === true &&
    preparation.stagingOnly === true &&
    preparation.contexts.length === 10 &&
    preparation.totals.candidates === 322 &&
    preparation.transport.everyCandidateRetained === true &&
    preparation.transport.semanticCandidateDownselectionPerformed === false &&
    preparation.totals.maximumCopiedInputBytes <= 115000 &&
    preparation.authorization.inventoryExecutionManifest === true &&
    preparation.authorization.inventoryModelExecution === false,
  "inventory preparation does not authorize an execution manifest"
);
assertV4(
  preparation.model.label === "5.6 Sol" &&
    preparation.model.slug === "gpt-5.6-sol" &&
    preparation.model.reasoningEffort === "low" &&
    preparation.model.authentication === "ChatGPT subscription",
  "the frozen model or subscription identity changed"
);
assertV4(
  retiredExecution.status === "five-hard-route-score-blind-inventory-contexts-passed" &&
    retiredExecution.validContexts === 5 &&
    retiredExecution.retries === 0 &&
    retiredExecution.maximumParallelContextsObserved === 2 &&
    retiredAnalysis.status === "five-hard-route-score-blind-inventories-passed-independent-judgment-packet-preparation-authorized",
  "the retired inventory execution evidence is unavailable"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `preparation source hash mismatch: ${file}`);
}

const codexPath = "/Applications/ChatGPT.app/Contents/Resources/codex";
const codexCliVersion = execFileSync(codexPath, ["--version"], { encoding: "utf8" }).trim();
const sourceFiles = [
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-inventory-workflow.md",
  EXECUTION_WORKFLOW,
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-production/manifest-v1.json",
  "docs/assessment-production/canary-v1.json",
  PREPARATION,
  preparation.inputs.discoveryAnalysis,
  preparation.inputs.sourcePreparation,
  preparation.inputs.manual,
  RETIRED_EXECUTION,
  RETIRED_ANALYSIS,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v422115-candidate-evidence-transport.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  "scripts/lib/v4221162-inventory-transport.mjs",
  "scripts/validate-assessment-production-canary-inventory.mjs",
  "scripts/preregister-assessment-production-canary-inventory.mjs",
  "scripts/run-assessment-production-canary-inventory.mjs",
  "scripts/analyze-assessment-production-canary-inventory.mjs",
  "scripts/test-assessment-production-canary-inventory-preparation.mjs",
  "scripts/test-assessment-production-canary-inventory-gate.mjs",
  ...preparation.contexts.flatMap((context) => [
    context.packet,
    context.discoveryCandidateBundle,
    context.discoverySparseContext,
    context.validatorCandidateEvidenceBundle,
    context.modelCandidateTransport,
    context.originalEvents,
    context.fullLedger,
    context.schema
  ])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));

const futureOutputPaths = [
  ...preparation.contexts.flatMap((context) => [
    context.proposalOutput,
    context.lockedInventoryOutput,
    context.validationOutput,
    context.provenanceOutput
  ]),
  EXECUTION,
  ANALYSIS
];
if (shouldWrite) {
  for (const file of futureOutputPaths) {
    assertV4(!(await exists(file)), `future output already exists: ${file}`);
  }
}

const manifest = {
  schemaVersion: "1.0-production-canary-score-blind-inventory-execution-manifest",
  protocolId: preparation.protocolId,
  status: "frozen-ten-production-canary-score-blind-inventory-contexts-authorized",
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
    expectedParallelWallMinutes: [8, 18],
    expectedAggregateModelMinutes: [12, 30],
    expectedAggregateComputeHours: [0.2, 0.5],
    absoluteGateTimeoutMinutes: 60,
    estimateBasis: "The retired five-context hard-route inventory gate averaged 1.23 model-minutes per context and completed in 3.82 wall-minutes at concurrency two; this range adds headroom for ten varied production debates and larger candidate transports."
  },
  executionEnvironment: {
    codexPath,
    codexCliVersion,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true
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
    modelWorkElapsedMs: retiredExecution.modelWorkElapsedMs,
    maximumParallelContextsObserved: retiredExecution.maximumParallelContextsObserved
  },
  isolation: {
    freshTemporaryCodexHomePerContext: true,
    freshSourceDirectoryPerContext: true,
    oneDebatePerContext: true,
    completeCandidateTransportAvailable: true,
    fullValidatorEvidenceUnavailableToModel: true,
    otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true,
    independentJudgmentsUnavailable: true,
    ratingsScoresWinnersTagsAndPublicationProseUnavailable: true
  },
  executionPolicy: {
    contexts: 10,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutMsPerContext: 600000,
    absoluteGateTimeoutMs: 3600000,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    rampOneServesAsOperationalCanary: true,
    eachRampPhaseMustPassBeforeExpansion: true,
    abortBeforeNextRampPhaseOnFailure: true,
    continueIndependentContextsWithinStartedPhaseAfterFailure: true,
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
  audioPolicy: preparation.audioPolicy,
  acceptance: {
    validInventoriesRequired: 10,
    deterministicLockedInventoryCompilationsRequired: 10,
    everyCandidateAvailableDuringSelection: true,
    semanticRepairs: 0,
    ratings: 0,
    responseTopology: 0,
    scores: 0
  },
  authorization: {
    modelContexts: true,
    deterministicValidation: true,
    deterministicCompilation: true,
    analysis: true,
    retry: false,
    semanticCorrection: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
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
    proposals: preparation.contexts.map((context) => context.proposalOutput),
    lockedInventories: preparation.contexts.map((context) => context.lockedInventoryOutput),
    validations: preparation.contexts.map((context) => context.validationOutput),
    provenance: preparation.contexts.map((context) => context.provenanceOutput)
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  sourceHashes
};

if (shouldWrite) await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  status: shouldWrite ? "frozen" : "preview",
  debates: manifest.contexts.map((context) => context.debateNumber),
  contexts: manifest.contexts.length,
  schedulerRamp: manifest.executionPolicy.schedulerRamp,
  maximumParallelContexts: manifest.executionPolicy.maximumParallelContexts,
  operationalCanary: "first-real-context",
  expectedParallelWallMinutes: manifest.costEstimate.expectedParallelWallMinutes,
  expectedAggregateComputeHours: manifest.costEstimate.expectedAggregateComputeHours,
  authentication: manifest.costEstimate.authentication,
  meteredApiCostUsdMaximum: 0,
  transcriptionCostUsdMaximum: 0,
  modelContextsExecuted: 0,
  scoresDerived: 0,
  productionMutationAuthorized: false
}, null, 2));
