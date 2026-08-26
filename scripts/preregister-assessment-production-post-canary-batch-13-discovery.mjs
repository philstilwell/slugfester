#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import {
  V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
  V212_DISCOVERY_MODEL,
  V212_DISCOVERY_PROTOCOL_ID,
} from "./lib/assessment-production-score-stability-v2.1.2-discovery.mjs";
import { buildBatch13TokenCountedChunkLedger } from "./lib/assessment-production-post-canary-batch-13-source-preparation.mjs";
import {
  POST_CANARY_BATCH_13_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch13StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-13-standing-authorization.mjs";
import {
  validateV42219ChunkLedger,
  validateV42219PartitionPlan,
} from "./lib/v42219-generalized-partition.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const BATCH_ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-13";
const PREPARATION = `${BATCH_ROOT}/source-preparation/preparation-manifest.json`;
const PREPARATION_VALIDATION = `${BATCH_ROOT}/source-preparation/validation.json`;
const ROOT = `${BATCH_ROOT}/discovery`;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const VALIDATION = `${ROOT}/execution-preparation-validation.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const PROTOCOL_ID = "assessment-production-post-canary-batch-13-discovery";
const WORKFLOW = "docs/assessment-production-canary-discovery-workflow.md";
const SCRIPT = "scripts/preregister-assessment-production-post-canary-batch-13-discovery.mjs";
const TEST = "scripts/test-assessment-production-post-canary-batch-13-discovery-manifest.mjs";
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REQUIRED_ORDER = ["26", "190", "87", "20", "70", "30", "37", "117", "111", "34"];
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
function allLeavesTrue(value) {
  if (typeof value === "boolean") return value;
  return value && typeof value === "object" && Object.values(value).every(allLeavesTrue);
}

const [preparationBytes, preparationValidationBytes] = await Promise.all([
  readFile(PREPARATION),
  readFile(PREPARATION_VALIDATION),
]);
const standingAuthorization =
  await loadAndValidatePostCanaryBatch13StandingAuthorization();
const preparation = JSON.parse(preparationBytes);
const preparationValidation = JSON.parse(preparationValidationBytes);
assertV4(
  preparation.status === "post-canary-batch-13-ten-complete-score-blind-source-packets-prepared-awaiting-validation" &&
    preparationValidation.status === "post-canary-batch-13-score-blind-source-packet-validation-passed-frozen-under-standing-authorization" &&
    preparationValidation.preparationManifest.sha256 === sha256(preparationBytes) &&
    preparation.discoveryProtocolId === V212_DISCOVERY_PROTOCOL_ID &&
    preparation.productionContinuation === true &&
    preparation.developmentValidationOnly === false &&
    preparation.stagingOnly === true &&
    preparation.contexts.length === 10 &&
    preparation.totals.discoveryContexts === 41 &&
    preparation.totals.maximumCopiedInputBytes === 65893 &&
    preparation.activePolicy.version === "v2.2" &&
    preparation.activePolicy.scorePassesMaximum === 1 &&
    preparation.activePolicy.modelAuthoredScoresAllowed === false &&
    preparation.activePolicy.automaticRerunAllowed === false &&
    preparation.activePolicy.roundedIntegerScoreTiesPermitted === true &&
    preparation.inheritedDiscoverySuccessorContract.minimumLexicalTokens === V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS &&
    preparation.inheritedDiscoverySuccessorContract.requestedLexicalTokensRemoved === true &&
    preparation.tokenLedgerCompatibility.minimumCandidateLexicalTokensChanged === false &&
    preparation.tokenLedgerCompatibility.sourceRowsInjected === 0 &&
    preparation.tokenLedgerCompatibility.sourceRowsOmitted === 0 &&
    preparation.tokenLedgerCompatibility.sourceRowsRewritten === 0 &&
    preparation.tokenLedgerCompatibility.status ===
      "all-source-rows-have-positive-repository-lexical-token-count" &&
    preparation.tokenLedgerCompatibility.occurrences.length === 0 &&
    preparation.authorization.discoveryExecutionManifestPreparation === false &&
    preparation.authorization.discoveryModelExecution === false &&
    preparation.authorization.paidTranscription === false &&
    preparation.authorization.unexpectedPaidService === false &&
    preparationValidation.authorization.modelExecution === false &&
    preparationValidation.authorization.unexpectedPaidService === false &&
    allLeavesTrue(preparation.stopRules),
  "validated Batch 13 source preparation is not frozen at the required authorization boundary"
);
assertV4(
  standingAuthorization.record.authorization.discoveryModelExecution === true &&
    standingAuthorization.record.costBoundary
      .subscriptionAndLocalDirectIncrementalCostUsdMaximum === 0 &&
    JSON.stringify(standingAuthorization.record.selectedDebates) ===
      JSON.stringify(REQUIRED_ORDER),
  "Batch 13 standing authorization does not cover exact discovery execution"
);
assertV4(
  JSON.stringify(preparation.contexts.map((debate) => debate.debateNumber)) === JSON.stringify(REQUIRED_ORDER),
  "Batch 13 debate order drifted"
);
assertV4(
  preparation.model.label === V212_DISCOVERY_MODEL.label &&
    preparation.model.slug === V212_DISCOVERY_MODEL.slug &&
    preparation.model.reasoningEffort === V212_DISCOVERY_MODEL.reasoningEffort &&
    preparation.model.authentication === "ChatGPT subscription" &&
    preparation.model.scoreBlind === true &&
    preparation.model.apiKeysRemovedForFutureExecution === true &&
    preparation.model.modelContextsExecuted === 0 &&
    preparation.model.meteredApiCostUsdMaximum === 0,
  "model, authentication, score-blindness, or cost boundary drifted"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source-preparation input drifted`);
}

const contexts = [];
for (const debate of preparation.contexts) {
  const [packetBytes, planBytes, fullLedgerBytes, eventsBytes] = await Promise.all([
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
      packet.modelInputBoundary.postCanaryProductionBatch === true &&
      packet.modelInputBoundary.productionCanary === false &&
      packet.modelInputBoundary.developmentValidationOnly === false &&
      packet.modelInputBoundary.calibrationOnlyFieldMeansStagingNotDevelopment === true &&
      packet.modelInputBoundary.modelAuthoredEndEventRequired === true &&
      packet.modelInputBoundary.modelAuthoredEndEventBoundedByLockedContext === true &&
      packet.modelInputBoundary.repositoryDerivesInclusiveWindowLexicalTokenCount === true &&
      packet.modelInputBoundary.exactNonemptySourceRowsWithZeroLexicalTokensPreservedWithCountZero === true &&
      packet.modelInputBoundary.exactSourceTextNeverInjectedOmittedOrRewritten === true &&
      packet.modelInputBoundary.minimumLexicalTokens === V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS &&
      packet.modelInputBoundary.minimumLexicalTokensDeterministicallyEnforced === true &&
      packet.modelInputBoundary.requestedLexicalTokensProhibited === true &&
      packet.modelInputBoundary.tokenCountedChunkLedgerRequired === true &&
      packet.modelInputBoundary.moveBeginningInLookbehindOwnedByPredecessorChunk === true &&
      packet.modelInputBoundary.legacyAssessmentsPriorJudgmentsScoresWinnersTagsAndPublicationProseUnavailable === true,
    `${debate.debateNumber}: score-blind packet boundary drifted`
  );
  const plan = JSON.parse(planBytes);
  validateV42219PartitionPlan(plan, fullLedgerBytes);
  assertV4(plan.limits.contextBytesMaximum === 70000 && plan.chunks.length === debate.chunks.length, `${debate.debateNumber}: partition contract drifted`);
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
        buildBatch13TokenCountedChunkLedger(chunkBytes).equals(tokenBytes) &&
        sha256(schemaBytes) === chunk.schemaSha256,
      `${debate.debateNumber}/${chunk.chunkId}: prepared chunk drifted`
    );
    contexts.push({
      contextIndex: contexts.length,
      debateNumber: debate.debateNumber,
      debateId: debate.debateId,
      family: debate.family,
      sourceComplexityBand: debate.sourceComplexityBand,
      sourceChainOverlayApplied: debate.sourceChainOverlayApplied,
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
      rawOutput: chunk.futureRawOutput,
    });
  }
}
assertV4(contexts.length === 41, "Batch 13 discovery must contain exactly 41 contexts");
const frozenObservedMaximumCopiedInputBytes = Math.max(...contexts.map((context) => context.copiedInputBytes));
assertV4(frozenObservedMaximumCopiedInputBytes === preparation.totals.maximumCopiedInputBytes, "copied-input maximum does not replay");
const maximumContext = contexts.find((context) => context.copiedInputBytes === frozenObservedMaximumCopiedInputBytes);
assertV4(maximumContext.debateNumber === "117" && maximumContext.chunkId === "chunk-002", "maximum copied-input context drifted");

const bundlePaths = preparation.contexts.map((debate) => `${ROOT}/candidate-bundles/debate-${debate.debateNumber}.json`);
const sparsePaths = preparation.contexts.map((debate) => `${ROOT}/candidate-context/debate-${debate.debateNumber}.jsonl`);
const sourceFiles = [
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-packet-workflow.md",
  WORKFLOW,
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  PREPARATION,
  PREPARATION_VALIDATION,
  ...Object.values(preparation.inputs),
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.2-discovery.mjs",
  "scripts/lib/assessment-production-post-canary-batch-13-source-preparation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-13-standing-authorization.mjs",
  POST_CANARY_BATCH_13_STANDING_AUTHORIZATION,
  SCRIPT,
  TEST,
  ...preparation.contexts.flatMap((debate) => [
    debate.packet,
    debate.plan,
    debate.fullLedger,
    debate.originalEvents,
    ...debate.chunks.flatMap((chunk) => [chunk.chunkLedgerPath, chunk.tokenCountedLedgerPath, chunk.schemaPath]),
  ]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) sourceHashes[file] = sha256(await readFile(file));
const futureOutputs = [
  ACTIVATION,
  EXECUTION,
  ANALYSIS,
  ...contexts.map((context) => context.rawOutput),
  ...bundlePaths,
  ...sparsePaths,
];
for (const file of [MANIFEST, VALIDATION, ...futureOutputs]) {
  if (shouldWrite || file !== MANIFEST) assertV4(!(await exists(file)), `future or immutable artifact already exists: ${file}`);
}
const codexCliVersion = execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim();

const schemaHardening = {
  candidateStartOwnedCoreBounds: true,
  modelAuthoredEndEventRequired: true,
  modelAuthoredEndEventLockedContextBounds: true,
  repositoryDerivedLexicalTokenCount: true,
  zeroLexicalTokenRowsPreservedWithCountZero: true,
  minimumLexicalTokens: V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
  requestedLexicalTokensProhibited: true,
  tokenCountedLedgerRequired: true,
  predecessorChunkOwnershipRuleExplicit: true,
  deterministicValidatorRetained: true,
  frozenDyadicSpeakerAllowlist: true,
};
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-discovery-execution-preparation-manifest",
  protocolId: PROTOCOL_ID,
  discoveryProtocolId: V212_DISCOVERY_PROTOCOL_ID,
  status: shouldWrite ? "frozen-forty-one-post-canary-batch-13-discovery-contexts-prepared-not-authorized" : "preview",
  frozenAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
  productionContinuation: true,
  developmentValidationOnly: false,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  userAuthorization: {
    scope: "standing-authorized Batch 13 discovery preparation and execution",
    standingAuthorization: POST_CANARY_BATCH_13_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
    thisArtifactActivatesModelExecution: false,
    anyModelExecutionAuthorized: false,
    paidServiceAuthorized: false,
    directIncrementalCostCapUsd: 0,
  },
  activePolicy: structuredClone(preparation.activePolicy),
  discoverySuccessorContract: structuredClone(preparation.inheritedDiscoverySuccessorContract),
  tokenLedgerCompatibility: structuredClone(preparation.tokenLedgerCompatibility),
  sourceBoundary: structuredClone(preparation.sourceBoundary),
  model: {
    label: preparation.model.label,
    slug: preparation.model.slug,
    reasoningEffort: preparation.model.reasoningEffort,
    authentication: preparation.model.authentication,
    scoreBlind: true,
    roundedIntegerScoreTiesPermitted: true,
  },
  costEstimate: {
    authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    contexts: contexts.length,
    expectedParallelWallMinutes: [14, 32],
    expectedAggregateModelMinutes: [43, 85],
    expectedAggregateComputeHours: [0.72, 1.42],
    absoluteGateTimeoutMinutes: 120,
    estimateBasis: "The exact 41-context Batch 13 input set is hash-locked with an observed maximum of 65,893 copied bytes; no input is truncated or repartitioned. The frozen 1→2→4 scheduler uses the subscription-backed route with a $0 direct incremental cost boundary.",
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
    exactFilesPerContext: 4,
  },
  preparation: PREPARATION,
  preparationValidation: PREPARATION_VALIDATION,
  contexts,
  isolation: {
    freshTemporaryCodexHomePerContext: true,
    freshSourceDirectoryPerContext: true,
    oneChunkPerContext: true,
    exactCopiedFilesPerContext: 4,
    modelReceivesTokenCountedLedgerNotValidationLedger: true,
    otherChunksUnavailable: true,
    otherOutputsUnavailable: true,
    otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true,
    priorJudgmentsUnavailable: true,
    ratingsScoresWinnersUnavailable: true,
    scorePolicyAnalysisUnavailable: true,
    tagsAndPublicationProseUnavailable: true,
    pluginsAppsMemoriesSkillsBrowsingComputerUseAndMultiAgentUnavailable: true,
  },
  copiedInputBoundary: {
    partitionContextBytesMaximum: 70000,
    historicalValidationCopiedInputBytesMaximum: 70000,
    frozenObservedCopiedInputBytesMaximum: frozenObservedMaximumCopiedInputBytes,
    executionCopiedInputBytesMaximum: frozenObservedMaximumCopiedInputBytes,
    maximumContext: { debateNumber: maximumContext.debateNumber, chunkId: maximumContext.chunkId },
    exactPreparedInputsHashLocked: true,
    sourceOrPacketTruncationAllowed: false,
    semanticRepartitionAllowed: false,
    automaticSourceRepairAllowed: false,
    ceilingSelectedBeforeModelResults: true,
  },
  executionPolicy: {
    contexts: contexts.length,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutMsPerContext: 300000,
    timeoutExtensionsMaximum: 0,
    absoluteGateTimeoutMs: 7200000,
    copiedInputBytesMaximum: frozenObservedMaximumCopiedInputBytes,
    maximumParallelContexts: preparation.stageConcurrency.discovery,
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
    modelAuthoredEndEventsRequired: true,
    modelAuthoredEndEventsBoundedByLockedContext: true,
    repositoryDerivesAllSourceWindowLexicalTokenCounts: true,
    zeroLexicalTokenRowsPreservedWithCountZero: true,
    exactSourceRowsInjectedOmittedOrRewritten: false,
    minimumLexicalTokens: V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
    minimumLexicalTokensDeterministicallyEnforced: true,
    minimumLexicalTokensStructurallyEnforcedByTransportSchema: false,
    requestedLexicalTokensAccepted: false,
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
  schemaHardening,
  stopRules: structuredClone(preparation.stopRules),
  stageBoundary: {
    discoveryExecutionManifestPreparation: "completed",
    discoveryExecutionManifestValidation: "authorized-model-free-only",
    discoveryExecutionActivationPreparation: "standing-authorized-not-yet-frozen",
    discoveryModelExecution: "standing-authorized-after-frozen-activation",
    inventoryPreparation: "standing-authorized-after-passing-discovery",
    inventoryModelExecution: "standing-authorized-after-frozen-activation",
    independentJudgmentPacketPreparation: "standing-authorized-after-passing-inventory",
    independentJudgmentModelExecution: "standing-authorized-after-frozen-activation",
    paidTranscription: "not-authorized",
    audioVerification: "conditionally-standing-authorized-after-frozen-estimate-at-or-below-usd-1",
    adjudicationModelExecution: "standing-authorized-after-frozen-activation",
    scoreDerivation: "standing-authorized-single-pass-after-final-ledgers",
    publicationPreparation: "standing-authorized-after-passing-score-pass",
    productionMutation: "standing-authorized-only-from-frozen-manifest",
    nextBatchSelection: "not-authorized",
  },
  authorization: {
    manifestPreparation: true,
    deterministicValidation: true,
    executionActivationPreparation: false,
    modelContexts: false,
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
    unexpectedPaidService: false,
    audioVerification: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationPreparation: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false,
  },
  artifacts: {
    validation: VALIDATION,
    activation: ACTIVATION,
    execution: EXECUTION,
    analysis: ANALYSIS,
    candidateBundles: bundlePaths,
    sparseContexts: sparsePaths,
    rawOutputs: contexts.map((context) => context.rawOutput),
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes,
  totals: {
    debates: preparation.contexts.length,
    contexts: contexts.length,
    modelContextsExecuted: 0,
    attempts: 0,
    paidServiceCalls: 0,
    scoresDerived: 0,
    productionMutations: 0,
    directIncrementalCostUsd: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  nextAuthorizedAction: "prepare-and-freeze-batch-13-discovery-execution-activation-under-standing-authorization",
};

if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: manifest.status,
  debates: REQUIRED_ORDER,
  contexts: contexts.length,
  copiedInputBytesMaximum: frozenObservedMaximumCopiedInputBytes,
  maximumParallelContexts: manifest.executionPolicy.maximumParallelContexts,
  schedulerRamp: manifest.executionPolicy.schedulerRamp,
  expectedParallelWallMinutes: manifest.costEstimate.expectedParallelWallMinutes,
  authentication: manifest.model.authentication,
  directIncrementalCostUsdMaximum: 0,
  modelContextsAuthorized: false,
  paidServicesAuthorized: false,
  nextAuthorizedAction: manifest.nextAuthorizedAction,
}, null, 2));
