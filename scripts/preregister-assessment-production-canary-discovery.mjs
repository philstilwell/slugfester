#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  validateV42219ChunkLedger,
  validateV42219PartitionPlan
} from "./lib/v42219-generalized-partition.mjs";

const PREPARATION = "docs/assessment-production/canary-v1-source-preparation/preparation-manifest.json";
const ROOT = "docs/assessment-production/canary-v1-discovery";
const MANIFEST = `${ROOT}/execution-manifest.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const WORKFLOW = "docs/assessment-production-canary-discovery-workflow.md";
const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
if (shouldWrite) {
  for (const file of [MANIFEST, EXECUTION, ANALYSIS]) {
    assertV4(!(await exists(file)), `${file} already exists; discovery preregistration is immutable`);
  }
}

const preparation = JSON.parse(await readFile(PREPARATION, "utf8"));
assertV4(
  preparation.status === "ten-debate-production-canary-source-and-discovery-packets-prepared" &&
    preparation.productionCanary === true &&
    preparation.stagingOnly === true &&
    preparation.contexts.length === 10 &&
    preparation.totals.discoveryContexts === 36 &&
    preparation.totals.ownershipBoundedSchemas === 36 &&
    preparation.totals.speakerAllowlistedSchemas === 36 &&
    preparation.authorization.discoveryExecutionManifest === true &&
    preparation.authorization.discoveryModelExecution === false,
  "the production canary source preparation does not authorize a discovery execution manifest"
);
assertV4(
  preparation.model.label === "5.6 Sol" &&
    preparation.model.slug === "gpt-5.6-sol" &&
    preparation.model.reasoningEffort === "low" &&
    preparation.model.authentication === "ChatGPT subscription",
  "the frozen model or subscription identity changed"
);

for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `preparation source hash mismatch: ${file}`);
}

const contexts = [];
for (const debate of preparation.contexts) {
  const [packetBytes, planBytes, fullLedgerBytes, eventsBytes] = await Promise.all([
    readFile(debate.packet),
    readFile(debate.plan),
    readFile(debate.fullLedger),
    readFile(debate.originalEvents)
  ]);
  assertV4(sha256(packetBytes) === debate.packetSha256, `${debate.debateNumber}: packet hash mismatch`);
  assertV4(sha256(planBytes) === debate.planSha256, `${debate.debateNumber}: plan hash mismatch`);
  assertV4(sha256(fullLedgerBytes) === debate.fullLedgerSha256, `${debate.debateNumber}: ledger hash mismatch`);
  assertV4(sha256(eventsBytes) === debate.originalEventsSha256, `${debate.debateNumber}: event hash mismatch`);
  const plan = JSON.parse(planBytes);
  validateV42219PartitionPlan(plan, fullLedgerBytes);
  assertV4(plan.chunks.length === debate.chunks.length, `${debate.debateNumber}: chunk count mismatch`);
  for (const chunk of debate.chunks) {
    const [chunkBytes, schemaBytes] = await Promise.all([
      readFile(chunk.chunkLedgerPath),
      readFile(chunk.schemaPath)
    ]);
    validateV42219ChunkLedger(chunkBytes, fullLedgerBytes, chunk);
    assertV4(sha256(chunkBytes) === chunk.chunkLedgerSha256, `${debate.debateNumber}/${chunk.chunkId}: chunk hash mismatch`);
    assertV4(sha256(schemaBytes) === chunk.schemaSha256, `${debate.debateNumber}/${chunk.chunkId}: schema hash mismatch`);
    contexts.push({
      contextIndex: contexts.length,
      debateNumber: debate.debateNumber,
      debateId: debate.debateId,
      family: debate.family,
      sourceComplexityBand: debate.sourceComplexityBand,
      packet: debate.packet,
      plan: debate.plan,
      fullLedger: debate.fullLedger,
      originalEvents: debate.originalEvents,
      chunkId: chunk.chunkId,
      coreStartEvent: chunk.coreStartEvent,
      coreEndEvent: chunk.coreEndEvent,
      contextStartEvent: chunk.contextStartEvent,
      contextEndEvent: chunk.contextEndEvent,
      chunkLedgerPath: chunk.chunkLedgerPath,
      chunkLedgerSha256: chunk.chunkLedgerSha256,
      schemaPath: chunk.schemaPath,
      schemaSha256: chunk.schemaSha256,
      copiedInputBytes: chunk.copiedInputBytes,
      rawOutput: chunk.rawOutput
    });
  }
}
assertV4(contexts.length === 36, "the production canary must flatten to exactly 36 discovery contexts");

const bundlePaths = preparation.contexts.map(
  (debate) => `${ROOT}/candidate-bundles/debate-${debate.debateNumber}.json`
);
const sparsePaths = preparation.contexts.map(
  (debate) => `${ROOT}/candidate-context/debate-${debate.debateNumber}.jsonl`
);
const sourceFiles = [
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-packet-workflow.md",
  WORKFLOW,
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  PREPARATION,
  preparation.inputs.canary,
  preparation.inputs.productionManifest,
  preparation.inputs.discoveryManual,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/lib/v422112-simplified-discovery.mjs",
  "scripts/validate-v422112-discovery.mjs",
  "scripts/preregister-assessment-production-canary-discovery.mjs",
  "scripts/run-assessment-production-canary-discovery.mjs",
  "scripts/analyze-assessment-production-canary-discovery.mjs",
  "scripts/test-assessment-production-canary-discovery.mjs",
  ...preparation.contexts.flatMap((debate) => [
    debate.packet,
    debate.plan,
    debate.fullLedger,
    debate.originalEvents,
    ...debate.chunks.flatMap((chunk) => [chunk.chunkLedgerPath, chunk.schemaPath])
  ])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));

const futureOutputs = [
  ...contexts.map((context) => context.rawOutput),
  ...bundlePaths,
  ...sparsePaths,
  EXECUTION,
  ANALYSIS
];
if (shouldWrite) {
  for (const file of futureOutputs) assertV4(!(await exists(file)), `future output already exists: ${file}`);
}

const codexPath = "/Applications/ChatGPT.app/Contents/Resources/codex";
const codexCliVersion = execFileSync(codexPath, ["--version"], { encoding: "utf8" }).trim();
const manifest = {
  schemaVersion: "1.0-production-canary-discovery-execution-manifest",
  protocolId: "assessment-production-canary-v1-discovery",
  status: "frozen-thirty-six-production-canary-discovery-contexts-authorized",
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
    expectedParallelWallMinutes: [13, 25],
    expectedAggregateModelMinutes: [40, 75],
    expectedAggregateComputeHours: [0.67, 1.25],
    absoluteGateTimeoutMinutes: 120,
    estimateBasis: "Observed simplified-discovery contexts averaged approximately 1.34 model-minutes in the prior twenty-context hard-route run."
  },
  executionEnvironment: {
    codexPath,
    codexCliVersion,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true
  },
  modelInputs: { manual: preparation.inputs.discoveryManual },
  preparation: PREPARATION,
  contexts,
  isolation: {
    freshTemporaryCodexHomePerContext: true,
    freshSourceDirectoryPerContext: true,
    oneChunkPerContext: true,
    otherChunksUnavailable: true,
    otherOutputsUnavailable: true,
    otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true,
    priorJudgmentsUnavailable: true,
    ratingsScoresWinnersUnavailable: true,
    tagsAndPublicationProseUnavailable: true
  },
  executionPolicy: {
    contexts: contexts.length,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutMsPerContext: 300000,
    absoluteGateTimeoutMs: 7200000,
    maximumParallelContexts: 4,
    schedulerRamp: [1, 2, 4],
    rampOneServesAsOperationalCanary: true,
    eachRampPhaseMustPassBeforeExpansion: true,
    abortBeforeNextRampPhaseOnFailure: true,
    continueIndependentSteadyStateContextsAfterFailure: true,
    deterministicInputOrder: true,
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
  compilationPolicy: {
    allContextsMustValidate: true,
    allDiscoveredCandidatesTransported: true,
    silentSemanticDeduplication: false,
    repositoryDerivedMoveKindOnly: true,
    localTargetIdsAbsent: true,
    selectedTargetTopologyDeferredToInventoryLock: true,
    sparseContextFlankEvents: 12,
    sparseSourceRowsMayDeduplicate: true,
    candidateMinimumPerDebate: 8,
    candidateMinimumPerSide: 4,
    scoresDerived: false
  },
  schemaHardening: {
    candidateStartOwnedCoreBounds: true,
    candidateEndAvailableContextBounds: true,
    frozenDyadicSpeakerAllowlist: true,
    deterministicValidatorRetained: true,
    stagingOnlyCalibrationFlagRequired: true
  },
  authorization: {
    modelContexts: true,
    deterministicValidation: true,
    deterministicCandidateCompilation: true,
    analysis: true,
    retry: false,
    semanticCorrection: false,
    inventoryPacketPreparation: false,
    inventoryModelExecution: false,
    independentJudgmentExecution: false,
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
    candidateBundles: bundlePaths,
    sparseContexts: sparsePaths,
    rawOutputs: contexts.map((context) => context.rawOutput)
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes
};

if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(JSON.stringify({
  status: shouldWrite ? "frozen" : "preview",
  debates: preparation.contexts.map((debate) => debate.debateNumber),
  contexts: contexts.length,
  maximumParallelContexts: manifest.executionPolicy.maximumParallelContexts,
  schedulerRamp: manifest.executionPolicy.schedulerRamp,
  rampOneServesAsOperationalCanary: true,
  attemptsMaximum: contexts.length,
  retriesMaximum: 0,
  expectedParallelWallMinutes: manifest.costEstimate.expectedParallelWallMinutes,
  expectedAggregateComputeHours: manifest.costEstimate.expectedAggregateComputeHours,
  authentication: manifest.costEstimate.authentication,
  meteredApiCostUsdMaximum: 0,
  transcriptionCostUsdMaximum: 0,
  scoresDerived: 0,
  productionMutationAuthorized: false
}, null, 2));
