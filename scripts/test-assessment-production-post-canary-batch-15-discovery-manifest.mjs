#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";

import {
  V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
  V212_DISCOVERY_PROTOCOL_ID,
} from "./lib/assessment-production-score-stability-v2.1.2-discovery.mjs";
import { buildBatch15TokenCountedChunkLedger } from "./lib/assessment-production-post-canary-batch-15-source-preparation.mjs";
import {
  POST_CANARY_BATCH_15_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch15StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-15-standing-authorization.mjs";
import {
  validateV42219ChunkLedger,
  validateV42219PartitionPlan,
} from "./lib/v42219-generalized-partition.mjs";

const shouldWrite = process.argv.includes("--write");
const validatedIndex = process.argv.indexOf("--validated-at");
const validatedAt = validatedIndex >= 0 ? process.argv[validatedIndex + 1] : null;
if (shouldWrite) assert(validatedAt && !Number.isNaN(Date.parse(validatedAt)), "--validated-at requires an ISO timestamp");

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-15/discovery";
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const VALIDATION = `${ROOT}/execution-preparation-validation.json`;
const REQUIRED_ORDER = ["39", "48", "23", "162", "86", "159", "128", "98", "155", "178"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
function allLeavesTrue(value) {
  if (typeof value === "boolean") return value;
  return value && typeof value === "object" && Object.values(value).every(allLeavesTrue);
}

const manifestBytes = await readFile(MANIFEST);
const manifest = JSON.parse(manifestBytes);
const preparationBytes = await readFile(manifest.preparation);
const preparation = JSON.parse(preparationBytes);
const preparationValidationBytes = await readFile(manifest.preparationValidation);
const preparationValidation = JSON.parse(preparationValidationBytes);
const standingAuthorization =
  await loadAndValidatePostCanaryBatch15StandingAuthorization();
assert.equal(manifest.status, "frozen-thirty-nine-post-canary-batch-15-discovery-contexts-prepared-not-authorized");
assert.equal(manifest.discoveryProtocolId, V212_DISCOVERY_PROTOCOL_ID);
assert.equal(manifest.productionContinuation, true);
assert.equal(manifest.developmentValidationOnly, false);
assert.equal(manifest.productionCanary, false);
assert.equal(manifest.stagingOnly, true);
assert.equal(manifest.branch, "main");
assert.equal(manifest.activePolicy.version, "v2.2");
assert.equal(manifest.activePolicy.scorePassesMaximum, 1);
assert.equal(manifest.activePolicy.modelAuthoredScoresAllowed, false);
assert.equal(manifest.activePolicy.automaticRerunAllowed, false);
assert.equal(manifest.activePolicy.roundedIntegerScoreTiesPermitted, true);
assert.deepEqual(manifest.discoverySuccessorContract.sourceSelectionShape, ["startEvent", "endEvent"]);
assert.equal(manifest.discoverySuccessorContract.minimumLexicalTokens, V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS);
assert.equal(manifest.discoverySuccessorContract.repositoryDerivedLexicalTokenCount, true);
assert.equal(manifest.discoverySuccessorContract.requestedLexicalTokensRemoved, true);
assert.deepEqual(manifest.tokenLedgerCompatibility, preparation.tokenLedgerCompatibility);
assert.equal(manifest.tokenLedgerCompatibility.minimumCandidateLexicalTokensChanged, false);
assert.equal(manifest.tokenLedgerCompatibility.sourceRowsInjected, 0);
assert.equal(manifest.tokenLedgerCompatibility.sourceRowsOmitted, 0);
assert.equal(manifest.tokenLedgerCompatibility.sourceRowsRewritten, 0);
assert.equal(
  manifest.tokenLedgerCompatibility.status,
  "all-source-rows-have-positive-repository-lexical-token-count"
);
assert.equal(manifest.tokenLedgerCompatibility.occurrences.length, 0);
assert.equal(
  manifest.userAuthorization.standingAuthorization,
  POST_CANARY_BATCH_15_STANDING_AUTHORIZATION
);
assert.equal(
  manifest.userAuthorization.standingAuthorizationSha256,
  standingAuthorization.sha256
);
assert.equal(manifest.userAuthorization.thisArtifactActivatesModelExecution, false);
assert.equal(
  standingAuthorization.record.authorization.discoveryModelExecution,
  true
);
assert.deepEqual(manifest.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription",
  scoreBlind: true,
  roundedIntegerScoreTiesPermitted: true,
});
assert.equal(preparationValidation.preparationManifest.sha256, sha256(preparationBytes));
assert.equal(preparationValidation.decision.deterministicValidationPassed, true);
assert.equal(preparationValidation.decision.modelExecutionAttempted, false);
assert.equal(preparationValidation.totals.paidServiceCalls, 0);
assert.equal(manifest.contexts.length, 39);
assert.deepEqual(manifest.contexts.map((context) => context.contextIndex), Array.from({ length: 39 }, (_, index) => index));
assert.deepEqual([...new Set(manifest.contexts.map((context) => context.debateNumber))], REQUIRED_ORDER);
assert.equal(manifest.contexts.filter((context) => context.sourceChainOverlayApplied).length, 0);
assert.equal(manifest.executionPolicy.contexts, 39);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutMsPerContext, 300000);
assert.equal(manifest.executionPolicy.absoluteGateTimeoutMs, 7200000);
assert.equal(manifest.executionPolicy.copiedInputBytesMaximum, 82209);
assert.equal(preparation.totals.maximumCopiedInputBytes, 82209);
assert.equal(manifest.copiedInputBoundary.partitionContextBytesMaximum, 70000);
assert.equal(manifest.copiedInputBoundary.historicalValidationCopiedInputBytesMaximum, 70000);
assert.equal(manifest.copiedInputBoundary.frozenObservedCopiedInputBytesMaximum, 82209);
assert.equal(manifest.copiedInputBoundary.executionCopiedInputBytesMaximum, 82209);
assert.deepEqual(manifest.copiedInputBoundary.maximumContext, { debateNumber: "178", chunkId: "chunk-002" });
assert.equal(manifest.copiedInputBoundary.exactPreparedInputsHashLocked, true);
assert.equal(manifest.copiedInputBoundary.sourceOrPacketTruncationAllowed, false);
assert.equal(manifest.copiedInputBoundary.semanticRepartitionAllowed, false);
assert.equal(manifest.copiedInputBoundary.automaticSourceRepairAllowed, false);
assert.equal(manifest.copiedInputBoundary.ceilingSelectedBeforeModelResults, true);
assert.equal(manifest.executionPolicy.maximumParallelContexts, 4);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2, 4]);
assert.equal(manifest.executionPolicy.rampOneServesAsOperationalCanary, true);
assert.equal(manifest.executionPolicy.eachRampPhaseMustPassBeforeExpansion, true);
assert.equal(manifest.executionPolicy.separateActivationRequired, true);
assert.equal(manifest.executionPolicy.APIKeysRemoved, true);
assert.equal(manifest.costEstimate.contexts, 39);
assert.equal(manifest.costEstimate.directIncrementalCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.transcriptionCostUsdMaximum, 0);
assert.deepEqual(manifest.costEstimate.expectedParallelWallMinutes, [11, 26]);
assert.deepEqual(manifest.costEstimate.expectedAggregateModelMinutes, [35, 68]);
assert.equal(manifest.isolation.oneChunkPerContext, true);
assert.equal(manifest.isolation.exactCopiedFilesPerContext, 4);
assert.equal(manifest.isolation.modelReceivesTokenCountedLedgerNotValidationLedger, true);
assert.equal(manifest.isolation.otherChunksUnavailable, true);
assert.equal(manifest.isolation.otherOutputsUnavailable, true);
assert.equal(manifest.isolation.otherDebatesUnavailable, true);
assert.equal(manifest.isolation.ratingsScoresWinnersUnavailable, true);
assert.equal(manifest.isolation.scorePolicyAnalysisUnavailable, true);
assert.equal(manifest.isolation.pluginsAppsMemoriesSkillsBrowsingComputerUseAndMultiAgentUnavailable, true);
assert.equal(manifest.compilationPolicy.allContextsMustValidate, true);
assert.equal(manifest.compilationPolicy.modelAuthoredEndEventsRequired, true);
assert.equal(manifest.compilationPolicy.modelAuthoredEndEventsBoundedByLockedContext, true);
assert.equal(manifest.compilationPolicy.repositoryDerivesAllSourceWindowLexicalTokenCounts, true);
assert.equal(manifest.compilationPolicy.zeroLexicalTokenRowsPreservedWithCountZero, true);
assert.equal(manifest.compilationPolicy.exactSourceRowsInjectedOmittedOrRewritten, false);
assert.equal(manifest.compilationPolicy.minimumLexicalTokens, V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS);
assert.equal(manifest.compilationPolicy.minimumLexicalTokensDeterministicallyEnforced, true);
assert.equal(manifest.compilationPolicy.minimumLexicalTokensStructurallyEnforcedByTransportSchema, false);
assert.equal(manifest.compilationPolicy.requestedLexicalTokensAccepted, false);
assert.equal(manifest.compilationPolicy.silentSemanticDeduplication, false);
assert.equal(manifest.compilationPolicy.automaticSemanticCorrection, false);
assert.equal(manifest.compilationPolicy.scoresDerived, false);
assert.equal(Object.values(manifest.schemaHardening).every((value) => value === true || value === 12), true);
assert.equal(allLeavesTrue(manifest.stopRules), true);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: frozen source drift`);
}
for (const file of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(Object.hasOwn(manifest.sourceHashes, file), false);
  assert.equal(await exists(file), false, `${file}: unauthorized future output already exists`);
}
assert.equal(manifest.authorization.manifestPreparation, true);
assert.equal(manifest.authorization.deterministicValidation, true);
for (const [key, value] of Object.entries(manifest.authorization)) {
  if (!["manifestPreparation", "deterministicValidation"].includes(key)) assert.equal(value, false, `${key}: must remain unauthorized`);
}
assert.equal(manifest.stageBoundary.discoveryExecutionActivationPreparation, "standing-authorized-not-yet-frozen");
assert.equal(manifest.stageBoundary.discoveryModelExecution, "standing-authorized-after-frozen-activation");
assert.equal(manifest.totals.modelContextsExecuted, 0);
assert.equal(manifest.totals.attempts, 0);
assert.equal(manifest.totals.paidServiceCalls, 0);
assert.equal(manifest.totals.scoresDerived, 0);
assert.equal(manifest.totals.productionMutations, 0);
assert.equal(manifest.totals.directIncrementalCostUsd, 0);

const preparedByContext = new Map();
for (const debate of preparation.contexts) {
  const [planBytes, fullLedgerBytes] = await Promise.all([readFile(debate.plan), readFile(debate.fullLedger)]);
  const plan = JSON.parse(planBytes);
  validateV42219PartitionPlan(plan, fullLedgerBytes);
  assert.equal(plan.limits.contextBytesMaximum, 70000);
  for (const chunk of debate.chunks) preparedByContext.set(`${debate.debateNumber}/${chunk.chunkId}`, { chunk, fullLedgerBytes });
}
assert.equal(preparedByContext.size, 39);
for (const context of manifest.contexts) {
  assert.equal(context.copiedInputBytes <= manifest.executionPolicy.copiedInputBytesMaximum, true, `${context.debateNumber}/${context.chunkId}: copied-input ceiling exceeded`);
  const prepared = preparedByContext.get(`${context.debateNumber}/${context.chunkId}`);
  assert(prepared, `${context.debateNumber}/${context.chunkId}: absent from source preparation`);
  const [chunkBytes, tokenBytes, schemaBytes] = await Promise.all([
    readFile(context.validationChunkLedgerPath),
    readFile(context.modelTokenCountedLedgerPath),
    readFile(context.schemaPath),
  ]);
  assert.equal(validateV42219ChunkLedger(chunkBytes, prepared.fullLedgerBytes, prepared.chunk).status, "passed");
  assert.equal(sha256(chunkBytes), context.validationChunkLedgerSha256);
  assert.equal(sha256(tokenBytes), context.modelTokenCountedLedgerSha256);
  assert(buildBatch15TokenCountedChunkLedger(chunkBytes).equals(tokenBytes));
  assert.equal(sha256(schemaBytes), context.schemaSha256);
  const schema = JSON.parse(schemaBytes);
  const sourceWindow = schema.properties.candidates.items.properties.sourceWindow;
  assert.equal(sourceWindow.properties.startEvent.minimum, context.coreStartEvent);
  assert.equal(sourceWindow.properties.startEvent.maximum, context.coreEndEvent);
  assert.equal(sourceWindow.properties.endEvent.minimum, context.coreStartEvent);
  assert.equal(sourceWindow.properties.endEvent.maximum, context.contextEndEvent);
  assert.equal(Object.hasOwn(sourceWindow.properties, "requestedLexicalTokens"), false);
  assert.equal(schema.properties.assessmentModel.const, "5.6 Sol");
}
assert.equal(manifest.nextAuthorizedAction, "prepare-and-freeze-batch-15-discovery-execution-activation-under-standing-authorization");

const validation = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-discovery-execution-preparation-validation",
  protocolId: manifest.protocolId,
  status: "batch-15-discovery-execution-manifest-validation-passed-frozen-standing-authorization-active",
  validatedAt: shouldWrite ? validatedAt : null,
  executionPreparationManifest: {
    path: MANIFEST,
    bytes: manifestBytes.length,
    sha256: sha256(manifestBytes),
    status: manifest.status,
  },
  preparationManifestSha256: sha256(preparationBytes),
  preparationValidationSha256: sha256(preparationValidationBytes),
  selectedDebates: REQUIRED_ORDER,
  checks: {
    exactContextOrderReplayed: true,
    exactPreparedInputHashesReplayed: true,
    exactPartitionCoverageReplayed: true,
    exactTokenCountedLedgersReplayed: true,
    exactZeroLexicalTokenRowCompatibilityReplayed: true,
    exactChunkSchemasReplayed: true,
    copiedInputCeilingReplayed: true,
    scoreBlindBoundaryPreserved: true,
    modelAndAuthenticationPreserved: true,
    isolationPreserved: true,
    activeV22PolicyAndRoundedTieRulePreserved: true,
    allInheritedStopRulesPreserved: true,
    futureOutputsAbsent: true,
    zeroCostCapPreserved: true,
  },
  totals: {
    debates: 10,
    contextsPrepared: 39,
    modelContextsExecuted: 0,
    attempts: 0,
    paidServiceCalls: 0,
    scoresDerived: 0,
    productionMutations: 0,
    directIncrementalCostUsd: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  authorization: {
    executionActivationPreparation: false,
    modelExecution: false,
    paidService: false,
    inventoryModelExecution: false,
    judgmentModelExecution: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
  },
  nextAuthorizedAction: manifest.nextAuthorizedAction,
};
if (shouldWrite) {
  assert.equal(await exists(VALIDATION), false, `${VALIDATION}: immutable validation artifact already exists`);
  await writeFile(VALIDATION, `${JSON.stringify(validation, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: validation.status,
  selectedDebates: REQUIRED_ORDER,
  contextsPrepared: 39,
  exactContextOrder: true,
  exactTokenLedgerReplay: true,
  copiedInputBytesMaximum: 82209,
  maximumParallelContexts: 4,
  schedulerRamp: [1, 2, 4],
  retriesMaximum: 0,
  timeoutExtensionsMaximum: 0,
  expectedParallelWallMinutes: [11, 26],
  authentication: manifest.model.authentication,
  directIncrementalCostUsdMaximum: 0,
  modelContextsAuthorized: false,
  paidServicesAuthorized: false,
  nextAuthorizedAction: validation.nextAuthorizedAction,
}, null, 2));
