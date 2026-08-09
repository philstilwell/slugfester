#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import {
  V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
  V211_DISCOVERY_MODEL,
  V211_DISCOVERY_PROTOCOL_ID,
  buildV211TokenCountedChunkLedger,
} from "./lib/assessment-production-score-stability-v2.1.1-discovery.mjs";
import {
  validateV42219ChunkLedger,
  validateV42219PartitionPlan,
} from "./lib/v42219-generalized-partition.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const VALIDATION_ROOT =
  "docs/assessment-production/score-stability-v2.1.1-validation-cohort";
const PREPARATION =
  `${VALIDATION_ROOT}/source-preparation/preparation-manifest.json`;
const ROOT = `${VALIDATION_ROOT}/discovery`;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const PROTOCOL_ID =
  "assessment-production-score-stability-v2.1.1-fresh-validation-discovery";
const WORKFLOW = "docs/assessment-production-canary-discovery-workflow.md";
const SCRIPT =
  "scripts/preregister-assessment-production-score-stability-v2.1.1-discovery.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.1.1-discovery.mjs";
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED_API_ENVIRONMENT_VARIABLES = [
  "OPENAI_API_KEY",
  "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID",
  "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY",
  "CODEX_API_KEY",
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
if (shouldWrite) {
  for (const file of [MANIFEST, EXECUTION, ANALYSIS]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

const preparation = JSON.parse(await readFile(PREPARATION, "utf8"));
assertV4(
  preparation.status ===
      "fresh-ten-debate-v2.1.1-source-token-ledgers-and-discovery-packets-prepared" &&
    preparation.discoveryProtocolId === V211_DISCOVERY_PROTOCOL_ID &&
    preparation.developmentValidationOnly === true &&
    preparation.productionCanary === false &&
    preparation.stagingOnly === true &&
    preparation.contexts.length === 10 &&
    preparation.totals.discoveryContexts === 42 &&
    preparation.totals.ownershipBoundedSchemas === 42 &&
    preparation.totals.tokenMinimumSchemas === 42 &&
    preparation.totals.modelEndEventProhibitingSchemas === 42 &&
    preparation.totals.speakerAllowlistedSchemas === 42 &&
    preparation.failedGateDisposition.v1CanaryPreservedFailed === true &&
    preparation.failedGateDisposition.v2ValidationPreservedFailed === true &&
    preparation.failedGateDisposition.v21DiscoveryPreservedFailed === true &&
    preparation.failedGateDisposition.v21AcceptedAsPassed === false &&
    preparation.proposedPolicy.version === "v2.1-proposal" &&
    preparation.proposedPolicy.everyIntegerRoundedTieAccepted === true &&
    preparation.proposedPolicy.promoted === false &&
    preparation.authorization.discoveryExecutionManifestPreparation === true &&
    preparation.authorization.discoveryModelExecution === false &&
    preparation.authorization.retry === false &&
    preparation.authorization.timeoutExtension === false &&
    preparation.authorization.semanticCorrection === false &&
    preparation.authorization.paidTranscription === false &&
    preparation.authorization.scoreDerivation === false,
  "v2.1.1 source preparation does not authorize discovery-manifest preparation"
);
assertV4(
  preparation.model.label === V211_DISCOVERY_MODEL.label &&
    preparation.model.slug === V211_DISCOVERY_MODEL.slug &&
    preparation.model.reasoningEffort ===
      V211_DISCOVERY_MODEL.reasoningEffort &&
    preparation.model.authentication ===
      V211_DISCOVERY_MODEL.authentication &&
    preparation.model.scoreBlind === true &&
    preparation.model.meteredApiCostUsdMaximum === 0,
  "model, authentication, score-blindness, or cost boundary drifted"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}

const contexts = [];
for (const debate of preparation.contexts) {
  const [packetBytes, planBytes, fullLedgerBytes, eventsBytes] =
    await Promise.all([
      readFile(debate.packet),
      readFile(debate.plan),
      readFile(debate.fullLedger),
      readFile(debate.originalEvents),
    ]);
  assertV4(
    sha256(packetBytes) === debate.packetSha256 &&
      sha256(planBytes) === debate.planSha256 &&
      sha256(fullLedgerBytes) === debate.fullLedgerSha256 &&
      sha256(eventsBytes) === debate.originalEventsSha256,
    `${debate.debateNumber}: prepared source hash mismatch`
  );
  const packet = JSON.parse(packetBytes);
  assertV4(
    packet.modelInputBoundary.scoreBlindDiscoveryOnly === true &&
      packet.modelInputBoundary.developmentValidationOnly === true &&
      packet.modelInputBoundary.modelAuthoredEndEventProhibited === true &&
      packet.modelInputBoundary.repositoryMaterializesSmallestInclusiveEndEvent ===
        true &&
      packet.modelInputBoundary.requestedLexicalTokensMinimum ===
        V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS &&
      packet.modelInputBoundary.tokenCountedChunkLedgerRequired === true &&
      packet.modelInputBoundary
        .moveBeginningInLookbehindOwnedByPredecessorChunk === true &&
      packet.modelInputBoundary
        .legacyAssessmentsPriorJudgmentsScoresWinnersTagsAndPublicationProseUnavailable ===
        true,
    `${debate.debateNumber}: successor score-blind packet boundary drifted`
  );
  const plan = JSON.parse(planBytes);
  validateV42219PartitionPlan(plan, fullLedgerBytes);
  assertV4(
    plan.chunks.length === debate.chunks.length,
    `${debate.debateNumber}: chunk count mismatch`
  );
  for (const chunk of debate.chunks) {
    const [chunkBytes, tokenBytes, schemaBytes] = await Promise.all([
      readFile(chunk.chunkLedgerPath),
      readFile(chunk.tokenCountedLedgerPath),
      readFile(chunk.schemaPath),
    ]);
    validateV42219ChunkLedger(chunkBytes, fullLedgerBytes, chunk);
    assertV4(
      sha256(chunkBytes) === chunk.chunkLedgerSha256 &&
        sha256(tokenBytes) === chunk.tokenCountedLedgerSha256 &&
        buildV211TokenCountedChunkLedger(chunkBytes).equals(tokenBytes) &&
        sha256(schemaBytes) === chunk.schemaSha256,
      `${debate.debateNumber}/${chunk.chunkId}: prepared chunk drifted`
    );
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
      validationChunkLedgerPath: chunk.chunkLedgerPath,
      validationChunkLedgerSha256: chunk.chunkLedgerSha256,
      modelTokenCountedLedgerPath: chunk.tokenCountedLedgerPath,
      modelTokenCountedLedgerSha256: chunk.tokenCountedLedgerSha256,
      schemaPath: chunk.schemaPath,
      schemaSha256: chunk.schemaSha256,
      copiedInputBytes: chunk.copiedInputBytes,
      rawOutput: chunk.rawOutput,
    });
  }
}
assertV4(contexts.length === 42, "discovery must contain exactly 42 contexts");

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
  preparation.inputs.selection,
  preparation.inputs.successorAnalysis,
  preparation.inputs.predecessorValidationManifest,
  preparation.inputs.productionManifest,
  preparation.inputs.discoveryManual,
  preparation.inputs.policy,
  PREPARATION,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.1-discovery.mjs",
  SCRIPT,
  TEST,
  ...preparation.contexts.flatMap((debate) => [
    debate.packet,
    debate.plan,
    debate.fullLedger,
    debate.originalEvents,
    ...debate.chunks.flatMap((chunk) => [
      chunk.chunkLedgerPath,
      chunk.tokenCountedLedgerPath,
      chunk.schemaPath,
    ]),
  ]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}
const futureOutputs = [
  ...contexts.map((context) => context.rawOutput),
  ...bundlePaths,
  ...sparsePaths,
  EXECUTION,
  ANALYSIS,
];
for (const file of futureOutputs) {
  assertV4(!(await exists(file)), `future output already exists: ${file}`);
}
const codexCliVersion = execFileSync(CODEX_PATH, ["--version"], {
  encoding: "utf8",
}).trim();

const manifest = {
  schemaVersion:
    "1.0-score-stability-v2.1.1-discovery-execution-preparation-manifest",
  protocolId: PROTOCOL_ID,
  discoveryProtocolId: V211_DISCOVERY_PROTOCOL_ID,
  status:
    "frozen-forty-two-v2.1.1-validation-discovery-contexts-prepared-not-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  failedGateDisposition: structuredClone(preparation.failedGateDisposition),
  proposedPolicy: structuredClone(preparation.proposedPolicy),
  successorContract: structuredClone(preparation.successorContract),
  residualRisks: structuredClone(preparation.residualRisks),
  model: {
    label: preparation.model.label,
    slug: preparation.model.slug,
    reasoningEffort: preparation.model.reasoningEffort,
    authentication: preparation.model.authentication,
    scoreBlind: true,
  },
  costEstimate: {
    authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    contexts: 42,
    expectedParallelWallMinutes: [15, 30],
    expectedAggregateModelMinutes: [48, 90],
    expectedAggregateComputeHours: [0.8, 1.5],
    absoluteGateTimeoutMinutes: 135,
    estimateBasis:
      "Scaled from the frozen v2/v2.1 discovery estimates and this cohort's 42-context copied-input distribution; subscription use has no direct incremental API charge.",
  },
  executionEnvironment: {
    codexPath: CODEX_PATH,
    codexCliVersion,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true,
  },
  modelInputs: {
    manual: preparation.inputs.discoveryManual,
    ledgerKind: "repository-token-counted-chunk-ledger",
  },
  preparation: PREPARATION,
  contexts,
  isolation: {
    freshTemporaryCodexHomePerContext: true,
    freshSourceDirectoryPerContext: true,
    oneChunkPerContext: true,
    modelReceivesTokenCountedLedgerNotValidationLedger: true,
    otherChunksUnavailable: true,
    otherOutputsUnavailable: true,
    otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true,
    priorJudgmentsUnavailable: true,
    ratingsScoresWinnersUnavailable: true,
    tagsAndPublicationProseUnavailable: true,
  },
  executionPolicy: {
    contexts: contexts.length,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutMsPerContext: 300000,
    timeoutExtensionsMaximum: 0,
    absoluteGateTimeoutMs: 8100000,
    maximumParallelContexts: 4,
    schedulerRamp: [1, 2, 4],
    rampOneServesAsOperationalCanary: true,
    eachRampPhaseMustPassBeforeExpansion: true,
    abortBeforeNextRampPhaseOnFailure: true,
    continueIndependentSteadyStateContextsAfterFailure: true,
    deterministicInputOrder: true,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    removedEnvironmentVariables: REMOVED_API_ENVIRONMENT_VARIABLES,
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    separateActivationRequired: true,
  },
  compilationPolicy: {
    allContextsMustValidate: true,
    repositoryMaterializesAllSourceWindowEndEvents: true,
    modelAuthoredEndEventsAccepted: false,
    minimumRequestedLexicalTokens:
      V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
    allDiscoveredCandidatesTransported: true,
    silentSemanticDeduplication: false,
    automaticSemanticCorrection: false,
    repositoryDerivedMoveKindOnly: true,
    localTargetIdsAbsent: true,
    selectedTargetTopologyDeferredToCandidateShardedInventory: true,
    sparseContextFlankEvents: 12,
    sparseSourceRowsMayDeduplicate: true,
    candidateMinimumPerDebate: 8,
    candidateMinimumPerSide: 4,
    scoresDerived: false,
  },
  schemaHardening: structuredClone(preparation.schemaHardening),
  stopRules: structuredClone(preparation.stopRules),
  authorization: {
    executionActivationPreparation: true,
    modelContexts: false,
    deterministicValidation: false,
    deterministicCandidateCompilation: false,
    analysis: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    inventoryPreparation: false,
    inventoryModelExecution: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    paidTranscription: false,
    audioVerification: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  artifacts: {
    execution: EXECUTION,
    analysis: ANALYSIS,
    candidateBundles: bundlePaths,
    sparseContexts: sparsePaths,
    rawOutputs: contexts.map((context) => context.rawOutput),
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes,
  nextAuthorizedAction:
    "prepare-separate-v2.1.1-discovery-execution-activation-only",
};

if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? manifest.status : "preview",
      debates: preparation.contexts.map((debate) => debate.debateNumber),
      contexts: contexts.length,
      maximumParallelContexts: manifest.executionPolicy.maximumParallelContexts,
      schedulerRamp: manifest.executionPolicy.schedulerRamp,
      retriesMaximum: 0,
      timeoutExtensionsMaximum: 0,
      expectedParallelWallMinutes:
        manifest.costEstimate.expectedParallelWallMinutes,
      authentication: manifest.model.authentication,
      directIncrementalCostUsdMaximum: 0,
      modelContextsAuthorized: false,
      scoresDerived: 0,
      nextAuthorizedAction: manifest.nextAuthorizedAction,
    },
    null,
    2
  )
);
