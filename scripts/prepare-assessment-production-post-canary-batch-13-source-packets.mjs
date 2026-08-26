#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildProductionCanarySourcePacket } from "./lib/assessment-production-canary-packets.mjs";
import {
  V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
  V212_DISCOVERY_MODEL,
  V212_DISCOVERY_PROTOCOL_ID,
  makeV212DiscoverySchema,
} from "./lib/assessment-production-score-stability-v2.1.2-discovery.mjs";
import {
  buildBatch13TokenCountedChunkLedger,
  findBatch13ZeroLexicalTokenRows,
} from "./lib/assessment-production-post-canary-batch-13-source-preparation.mjs";
import {
  buildV42219ChunkLedger,
  planV42219Partition,
  validateV42219ChunkLedger,
  validateV42219PartitionPlan,
} from "./lib/v42219-generalized-partition.mjs";
import { classifyV424Motion } from "./lib/v424-source-classification.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const BATCH_ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-13";
const ROOT = `${BATCH_ROOT}/source-preparation`;
const PROTOCOL_ID = "assessment-production-post-canary-batch-13-source-preparation";
const CACHE_VERSION = "post-canary-continuation-v1-batch-13";
const CACHE_LEDGER_ROOT = `.assessment-cache/compact-ledgers/${CACHE_VERSION}`;
const CACHE_PARTITION_ROOT = `.assessment-cache/partition-ledgers/${CACHE_VERSION}`;
const CACHE_TOKEN_ROOT = `.assessment-cache/token-counted-partition-ledgers/${CACHE_VERSION}`;
const SELECTION = `${BATCH_ROOT}/selection.json`;
const SELECTION_ANALYSIS = `${BATCH_ROOT}/selection-analysis.json`;
const CONTINUATION_POLICY = "docs/assessment-production/post-canary-continuation-v1/continuation-policy-v1/selection-policy.json";
const CANARY_MASTER = "docs/assessment-production/production-checkpoint-v2.2-1/master-manifest.json";
const DISCOVERY_ANALYSIS = "docs/assessment-production/score-stability-v2.1.2-discovery-successor-development/development-analysis.json";
const DISCOVERY_MANUAL = "docs/assessment-production/score-stability-v2.1.2-discovery-successor-development/manual.md";
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const PACKET_WORKFLOW = "docs/assessment-production-canary-packet-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const RUBRIC = "docs/reassessment-rubric-v2.1.md";
const POLICY = "docs/assessment-production/score-stability-policy-v2.2-proposal.md";
const PROMOTION = "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const ACTIVE_CONTROL = "scripts/lib/assessment-production-score-stability-policy-active.mjs";
const ACTIVE_CONTROL_TEST = "scripts/test-assessment-production-score-stability-policy-active.mjs";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const VALIDATION = `${ROOT}/validation.json`;
const SCRIPT = "scripts/prepare-assessment-production-post-canary-batch-13-source-packets.mjs";
const TEST = "scripts/test-assessment-production-post-canary-batch-13-source-packets.mjs";
const REQUIRED_ORDER = ["26", "190", "87", "20", "70", "30", "37", "117", "111", "34"];
const CONTROL_FILES = [
  SELECTION,
  SELECTION_ANALYSIS,
  CONTINUATION_POLICY,
  CANARY_MASTER,
  DISCOVERY_ANALYSIS,
  DISCOVERY_MANUAL,
  PRODUCTION_MANIFEST,
  PRODUCTION_WORKFLOW,
  PACKET_WORKFLOW,
  READINESS_WORKFLOW,
  RUBRIC,
  POLICY,
  PROMOTION,
  ACTIVE_CONTROL,
  ACTIVE_CONTROL_TEST,
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/lib/v424-source-classification.mjs",
  "scripts/lib/assessment-production-canary-packets.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.1-discovery.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.2-discovery.mjs",
  "scripts/lib/assessment-production-post-canary-batch-13-source-preparation.mjs",
  SCRIPT,
  TEST,
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sourceBand = (events) => events <= 1800 ? "direct-sized" : events <= 3600 ? "partition-medium" : "partition-heavy";
const durationBand = (seconds) => seconds < 3600 ? "under-60-minutes" : seconds < 5400 ? "60-to-89-minutes" : "90-minutes-or-more";
const captionKind = (manifest) => manifest.track?.kind === "asr" ? "auto" : manifest.track?.kind?.startsWith("api-") ? "api" : "human";

async function verifiedBytes(file, expectedHash, label = file) {
  const bytes = await readFile(path.resolve(file));
  assertV4(sha256(bytes) === expectedHash, `${label}: SHA-256 mismatch`);
  return bytes;
}

function assertNoPropertyNamed(value, prohibited, location = "schema") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assertV4(key !== prohibited, `${location}.${key}: prohibited property`);
    assertNoPropertyNamed(child, prohibited, `${location}.${key}`);
  }
}

const controlEntries = await Promise.all(CONTROL_FILES.map(async (file) => [file, await readFile(file)]));
const controlBytes = Object.fromEntries(controlEntries);
const selectionBytes = controlBytes[SELECTION];
const selection = JSON.parse(selectionBytes);
const selectionAnalysis = JSON.parse(controlBytes[SELECTION_ANALYSIS]);
const continuationPolicy = JSON.parse(controlBytes[CONTINUATION_POLICY]);
const canaryMaster = JSON.parse(controlBytes[CANARY_MASTER]);
const discoveryAnalysis = JSON.parse(controlBytes[DISCOVERY_ANALYSIS]);
const promotion = JSON.parse(controlBytes[PROMOTION]);

assertV4(
  selection.status === "thirteenth-post-canary-ten-debate-batch-selection-frozen-source-gate-passed" &&
    selectionAnalysis.status === "thirteenth-post-canary-batch-selection-analysis-passed-awaiting-standing-authorization" &&
    selectionAnalysis.selection.sha256 === sha256(selectionBytes) &&
    selection.nextAuthorizedAction === "prepare-batch-13-standing-authorization-and-source-packets-under-user-authorization" &&
    JSON.stringify(selection.selected.map((item) => item.debateNumber)) === JSON.stringify(REQUIRED_ORDER),
  "Batch 13 frozen selection is not ready for its separately authorized source-packet step"
);
assertV4(
  selection.modelBoundary.label === V212_DISCOVERY_MODEL.label &&
    selection.modelBoundary.slug === V212_DISCOVERY_MODEL.slug &&
    selection.modelBoundary.reasoningEffort === V212_DISCOVERY_MODEL.reasoningEffort &&
    selection.modelBoundary.authentication === "ChatGPT subscription" &&
    selection.modelBoundary.scoreBlind === true &&
    selection.modelBoundary.roundedIntegerScoreTiesPermitted === true &&
    selection.modelBoundary.modelContextsExecuted === 0 &&
    Object.values(selection.stopRules).every(Boolean),
  "Batch 13 model boundary or stop rules drifted"
);
assertV4(
  continuationPolicy.status === "post-canary-full-campaign-selection-policy-frozen-awaiting-separate-first-batch-selection-decision" &&
    Object.values(continuationPolicy.stopRules).every(Boolean) &&
    promotion.status === "active-production-score-stability-policy-v2.2" &&
    promotion.activePolicy.version === "v2.2" &&
    promotion.productionScoreControl.scoreCalculationPasses === 1 &&
    promotion.productionScoreControl.modelAuthoredScoresAllowed === false &&
    promotion.productionScoreControl.automaticRerunAllowed === false &&
    sha256(controlBytes[POLICY]) === promotion.activePolicy.normativeTextSha256 &&
    sha256(controlBytes[ACTIVE_CONTROL]) === promotion.productionScoreControl.librarySha256 &&
    sha256(controlBytes[ACTIVE_CONTROL_TEST]) === promotion.productionScoreControl.testSha256,
  "Active v2.2 policy lock drifted"
);
assertV4(
  Object.values(canaryMaster.isolation).every(Boolean) &&
    Object.values(canaryMaster.stopRules).every(Boolean),
  "Promoted canary isolation or stop rules drifted"
);
assertV4(
  discoveryAnalysis.status === "v2.1.2-bounded-end-discovery-successor-model-free-dual-regression-passed" &&
    discoveryAnalysis.successorContract.minimumLexicalTokens === V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS &&
    discoveryAnalysis.successorContract.repositoryDerivedLexicalTokenCount === true &&
    discoveryAnalysis.successorContract.thresholdRelaxed === false &&
    discoveryAnalysis.successorContract.automaticTruncation === false &&
    discoveryAnalysis.successorContract.automaticSemanticRepair === false,
  "Inherited bounded-end discovery contract drifted"
);
for (const [file, digest] of Object.entries(selection.sourceHashes)) await verifiedBytes(file, digest, `selection source ${file}`);
if (shouldWrite) {
  for (const target of [ROOT, CACHE_LEDGER_ROOT, CACHE_PARTITION_ROOT, CACHE_TOKEN_ROOT]) {
    assertV4(!(await exists(target)), `${target}: immutable preparation target already exists`);
  }
}

const contexts = [];
const pendingWrites = [];
for (const selected of selection.selected) {
  const speakers = [...selected.sides.pro.speakers, ...selected.sides.con.speakers];
  assertV4(selected.speakerCount === 2 && selected.sides.pro.speakers.length === 1 && selected.sides.con.speakers.length === 1 && new Set(speakers).size === 2, `${selected.debateNumber}: exactly two frozen interlocutors required`);
  assertV4(Object.values(selected.sourceGate).every(Boolean), `${selected.debateNumber}: frozen source gate failed`);
  const transcriptPath = selected.sourceChain.transcript;
  const eventsPath = selected.sourceChain.events;
  const manifestPath = selected.sourceChain.manifest;
  const fullLedgerPath = `${CACHE_LEDGER_ROOT}/debate-${selected.debateNumber}.jsonl`;
  const [transcriptBytes, eventsBytes, manifestBytes] = await Promise.all([
    verifiedBytes(transcriptPath, selected.sourceChain.transcriptSha256),
    verifiedBytes(eventsPath, selected.sourceChain.eventsSha256),
    verifiedBytes(manifestPath, selected.sourceChain.manifestSha256),
  ]);
  const localManifest = JSON.parse(manifestBytes);
  assertV4(localManifest.videoId === selected.videoId && localManifest.eventCount === selected.eventCount && localManifest.transcriptSha256 === selected.sourceChain.transcriptSha256 && localManifest.normalizedEventsSha256 === selected.sourceChain.eventsSha256, `${selected.debateNumber}: local source chain drifted`);
  const debate = {
    ...selected,
    family: classifyV424Motion(selected.motion),
    durationBand: durationBand(selected.durationSeconds),
    captionKind: captionKind(localManifest),
    sourceEventCount: selected.eventCount,
    sourceComplexityBand: sourceBand(selected.eventCount),
  };
  const built = buildProductionCanarySourcePacket({ debate, transcriptPath, eventsPath, manifestPath, sourceLedgerPath: fullLedgerPath, transcriptBytes, eventsBytes, manifestBytes });
  const plan = {
    ...planV42219Partition(built.sourceLedgerBytes),
    debateNumber: selected.debateNumber,
    debateId: selected.debateId,
    sourceComplexityBand: debate.sourceComplexityBand,
    transportRoute: "partitioned-bounded-end-discovery",
  };
  validateV42219PartitionPlan(plan, built.sourceLedgerBytes);
  const planPath = `${ROOT}/plans/debate-${selected.debateNumber}.json`;
  const planBytes = jsonBytes(plan);
  const packet = structuredClone(built.packet);
  packet.schemaVersion = "1.0-assessment-production-post-canary-batch-13-score-blind-source-packet";
  packet.protocolId = PROTOCOL_ID;
  packet.transportChain.partitionPlanPath = planPath;
  packet.transportChain.partitionPlanSha256 = sha256(planBytes);
  packet.transportChain.partitionChunks = plan.chunks.length;
  packet.transportChain.modelDeliveredLedgerFormat = "jsonl rows [eventIndex,startMs,durationMs,lexicalTokenCount,text]";
  packet.modelInputBoundary = {
    distributedTranscriptCoverageRequired: true,
    completeChunkContextRequired: true,
    everySourceEventOwnedExactlyOnce: true,
    boundaryContextMayRepeat: true,
    candidateStartMustBeInOwnedCore: true,
    candidateStartOwnershipEnforcedByOutputSchema: true,
    candidateMayExtendIntoLockedLookahead: true,
    modelAuthoredEndEventRequired: true,
    modelAuthoredEndEventBoundedByLockedContext: true,
    repositoryDerivesInclusiveWindowLexicalTokenCount: true,
    exactNonemptySourceRowsWithZeroLexicalTokensPreservedWithCountZero: true,
    exactSourceTextNeverInjectedOmittedOrRewritten: true,
    minimumLexicalTokens: V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
    minimumLexicalTokensDeterministicallyEnforced: true,
    minimumLexicalTokensStructurallyEnforcedByOutputSchema: false,
    requestedLexicalTokensProhibited: true,
    tokenCountedChunkLedgerRequired: true,
    moveBeginningInLookbehindOwnedByPredecessorChunk: true,
    frozenDyadicSpeakerAllowlistRequired: true,
    modelSuppliedSourceMillisecondsProhibited: true,
    modelAuthoredEvidenceTextProhibited: true,
    modelAuthoredTargetIdsProhibited: true,
    scoreBlindDiscoveryOnly: true,
    stagingOnlyIntermediateOutput: true,
    calibrationOnlyFieldMeansStagingNotDevelopment: true,
    postCanaryProductionBatch: true,
    productionCanary: false,
    developmentValidationOnly: false,
    legacyAssessmentsPriorJudgmentsScoresWinnersTagsAndPublicationProseUnavailable: true,
  };
  const packetPath = `${ROOT}/packets/debate-${selected.debateNumber}.json`;
  const packetBytes = jsonBytes(packet);
  const chunks = [];
  for (const chunk of plan.chunks) {
    const chunkBytes = buildV42219ChunkLedger(built.sourceLedgerBytes, chunk);
    validateV42219ChunkLedger(chunkBytes, built.sourceLedgerBytes, chunk);
    const tokenLedgerBytes = buildBatch13TokenCountedChunkLedger(chunkBytes);
    const zeroLexicalTokenRows = findBatch13ZeroLexicalTokenRows(chunkBytes);
    const chunkLedgerPath = `${CACHE_PARTITION_ROOT}/debate-${selected.debateNumber}/${chunk.chunkId}.jsonl`;
    const tokenLedgerPath = `${CACHE_TOKEN_ROOT}/debate-${selected.debateNumber}/${chunk.chunkId}.jsonl`;
    const schemaPath = `${ROOT}/schemas/debate-${selected.debateNumber}-${chunk.chunkId}.schema.json`;
    const schema = makeV212DiscoverySchema({ packet, chunk, candidatesMaximum: plan.limits.candidatesPerChunkMaximum });
    const candidate = schema.properties.candidates.items;
    const sourceWindow = candidate.properties.sourceWindow;
    assertV4(sourceWindow.properties.startEvent.minimum === chunk.coreStartEvent && sourceWindow.properties.startEvent.maximum === chunk.coreEndEvent && sourceWindow.properties.endEvent.minimum === chunk.coreStartEvent && sourceWindow.properties.endEvent.maximum === chunk.contextEndEvent && !Object.hasOwn(sourceWindow.properties, "requestedLexicalTokens"), `${selected.debateNumber}/${chunk.chunkId}: source-window schema drifted`);
    assertNoPropertyNamed(schema, "requestedLexicalTokens");
    assertV4(JSON.stringify(candidate.properties.speaker.enum) === JSON.stringify(speakers), `${selected.debateNumber}/${chunk.chunkId}: frozen speaker allowlist mismatch`);
    const schemaBytes = jsonBytes(schema);
    pendingWrites.push({ file: chunkLedgerPath, bytes: chunkBytes }, { file: tokenLedgerPath, bytes: tokenLedgerBytes }, { file: schemaPath, bytes: schemaBytes });
    chunks.push({
      ...chunk,
      chunkLedgerPath,
      chunkLedgerSha256: sha256(chunkBytes),
      tokenCountedLedgerPath: tokenLedgerPath,
      tokenCountedLedgerSha256: sha256(tokenLedgerBytes),
      tokenCountedLedgerRows: chunk.contextEvents,
      zeroLexicalTokenRows: zeroLexicalTokenRows.map(({ eventIndex, startMs, durationMs, text }) => ({
        eventIndex,
        startMs,
        durationMs,
        textSha256: sha256(text),
      })),
      schemaPath,
      schemaSha256: sha256(schemaBytes),
      copiedInputBytes: controlBytes[DISCOVERY_MANUAL].length + packetBytes.length + schemaBytes.length + tokenLedgerBytes.length,
      futureRawOutput: `${ROOT}/discovery-outputs/debate-${selected.debateNumber}-${chunk.chunkId}.json`,
    });
  }
  pendingWrites.push({ file: fullLedgerPath, bytes: built.sourceLedgerBytes }, { file: planPath, bytes: planBytes }, { file: packetPath, bytes: packetBytes });
  contexts.push({
    debateNumber: selected.debateNumber,
    debateId: selected.debateId,
    family: debate.family,
    durationBand: debate.durationBand,
    captionKind: debate.captionKind,
    sourceComplexityBand: debate.sourceComplexityBand,
    sourceChainOverlayApplied: selected.sourceChainOverlayApplied,
    transportRoute: "partitioned-bounded-end-discovery",
    packet: packetPath,
    packetSha256: sha256(packetBytes),
    plan: planPath,
    planSha256: sha256(planBytes),
    fullLedger: fullLedgerPath,
    fullLedgerSha256: sha256(built.sourceLedgerBytes),
    originalTranscript: transcriptPath,
    originalTranscriptSha256: sha256(transcriptBytes),
    originalEvents: eventsPath,
    originalEventsSha256: sha256(eventsBytes),
    originalManifest: manifestPath,
    originalManifestSha256: sha256(manifestBytes),
    sourceProjection: built.sourceProjection,
    sourceEvents: built.packet.eventCount,
    sourceBytes: built.sourceLedgerBytes.length,
    chunks,
  });
}

const allChunks = contexts.flatMap((context) => context.chunks);
const zeroLexicalTokenOccurrences = contexts.flatMap((context) =>
  context.chunks.flatMap((chunk) =>
    chunk.zeroLexicalTokenRows.map((row) => ({ debateNumber: context.debateNumber, ...row })),
  ),
);
const sourceHashes = Object.fromEntries([...controlEntries].sort(([left], [right]) => left.localeCompare(right)).map(([file, bytes]) => [file, sha256(bytes)]));
const preparation = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-source-preparation",
  protocolId: PROTOCOL_ID,
  discoveryProtocolId: V212_DISCOVERY_PROTOCOL_ID,
  status: shouldWrite ? "post-canary-batch-13-ten-complete-score-blind-source-packets-prepared-awaiting-validation" : "preview",
  preparedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
  productionContinuation: true,
  developmentValidationOnly: false,
  stagingOnly: true,
  AIOnly: true,
  userAuthorization: {
    scope: "prepare, validate, freeze, commit, and push score-blind source packets for Batch 13 under the complete-workflow standing authorization",
    judgmentModelExecutionAuthorized: false,
    anyModelExecutionAuthorized: false,
    unexpectedPaidServiceAuthorized: false,
    directIncrementalCostEstimateUsd: 0,
  },
  activePolicy: {
    version: "v2.2",
    normativeText: POLICY,
    normativeTextSha256: promotion.activePolicy.normativeTextSha256,
    promotion: PROMOTION,
    promotionSha256: sha256(controlBytes[PROMOTION]),
    activeScoreControl: ACTIVE_CONTROL,
    activeScoreControlSha256: sha256(controlBytes[ACTIVE_CONTROL]),
    activeScoreControlTest: ACTIVE_CONTROL_TEST,
    activeScoreControlTestSha256: sha256(controlBytes[ACTIVE_CONTROL_TEST]),
    scorePassesMaximum: 1,
    modelAuthoredScoresAllowed: false,
    automaticRerunAllowed: false,
    roundedIntegerScoreTiesPermitted: true,
  },
  inheritedDiscoverySuccessorContract: structuredClone(discoveryAnalysis.successorContract),
  tokenLedgerCompatibility: {
    status: zeroLexicalTokenOccurrences.length === 0
      ? "all-source-rows-have-positive-repository-lexical-token-count"
      : "exact-source-zero-lexical-token-rows-preserved-with-zero-count",
    reason: zeroLexicalTokenOccurrences.length === 0
      ? "All selected canonical source rows contain at least one repository lexical token."
      : "One or more nonempty canonical caption rows contain only redaction material and therefore have zero repository lexical tokens.",
    policy: "Preserve every exact canonical row and text, record lexicalTokenCount as 0 when applicable, and continue to enforce the unchanged 12-token minimum on every inclusive candidate window.",
    sourceRowsInjected: 0,
    sourceRowsOmitted: 0,
    sourceRowsRewritten: 0,
    minimumCandidateLexicalTokensChanged: false,
    occurrences: zeroLexicalTokenOccurrences,
  },
  sourceBoundary: {
    transcriptContentSemanticallyInspectedByPreparation: false,
    mechanicalSourceParsingOnly: true,
    audioAccessed: false,
    legacyAssessmentContentAccessed: false,
    priorJudgmentsAccessed: false,
    scoresOrWinnersAccessed: false,
    scorePolicyAnalysisDeliveredToModels: false,
    publicationContentAccessed: false,
  },
  model: {
    ...structuredClone(V212_DISCOVERY_MODEL),
    authentication: "ChatGPT subscription",
    scoreBlind: true,
    apiKeysRemovedForFutureExecution: true,
    roundedIntegerScoreTiesPermitted: true,
    modelContextsExecuted: 0,
    meteredApiCostUsdMaximum: 0,
  },
  isolation: {
    ...structuredClone(canaryMaster.isolation),
    passAAndPassBUseFreshIsolatedContexts: true,
    passAAndPassBReceiveSameLockedScoreBlindPacket: true,
    passIdentityUnavailableToAdjudication: true,
  },
  stageConcurrency: structuredClone(selection.stageConcurrency),
  inputs: {
    selection: SELECTION,
    selectionAnalysis: SELECTION_ANALYSIS,
    continuationPolicy: CONTINUATION_POLICY,
    canaryMasterManifest: CANARY_MASTER,
    discoverySuccessorAnalysis: DISCOVERY_ANALYSIS,
    discoveryManual: DISCOVERY_MANUAL,
    productionManifest: PRODUCTION_MANIFEST,
    productionWorkflow: PRODUCTION_WORKFLOW,
    packetWorkflow: PACKET_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW,
    rubric: RUBRIC,
    policy: POLICY,
    promotion: PROMOTION,
    activeScoreControl: ACTIVE_CONTROL,
    activeScoreControlTest: ACTIVE_CONTROL_TEST,
  },
  sourceHashes,
  contexts,
  totals: {
    debates: contexts.length,
    sides: contexts.length * 2,
    sourceChainOverlays: contexts.filter((context) => context.sourceChainOverlayApplied).length,
    directSizedSources: contexts.filter((context) => context.sourceComplexityBand === "direct-sized").length,
    partitionMediumSources: contexts.filter((context) => context.sourceComplexityBand === "partition-medium").length,
    partitionHeavySources: contexts.filter((context) => context.sourceComplexityBand === "partition-heavy").length,
    discoveryContexts: allChunks.length,
    sourceEvents: contexts.reduce((sum, context) => sum + context.sourceEvents, 0),
    sourceLedgerBytes: contexts.reduce((sum, context) => sum + context.sourceBytes, 0),
    tokenCountedLedgerRows: allChunks.reduce((sum, chunk) => sum + chunk.tokenCountedLedgerRows, 0),
    zeroLexicalTokenRowOccurrences: zeroLexicalTokenOccurrences.length,
    copiedDiscoveryInputBytes: allChunks.reduce((sum, chunk) => sum + chunk.copiedInputBytes, 0),
    maximumCopiedInputBytes: Math.max(...allChunks.map((chunk) => chunk.copiedInputBytes)),
    modelContextsExecuted: 0,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    audioCalls: 0,
    judgmentPasses: 0,
    scoresDerived: 0,
    publicationContexts: 0,
    productionMutations: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  futureArtifactsExcludedFromSourceHashes: {
    validation: VALIDATION,
    discoveryOutputs: allChunks.map((chunk) => chunk.futureRawOutput),
  },
  stopRules: {
    batchSelection: structuredClone(selection.stopRules),
    continuationPolicy: structuredClone(continuationPolicy.stopRules),
    promotedCanary: structuredClone(canaryMaster.stopRules),
  },
  stageBoundary: {
    sourcePreparation: "completed",
    deterministicValidation: "authorized-model-free-only",
    discoveryExecutionManifestPreparation: "not-authorized",
    discoveryModelExecution: "not-authorized",
    inventoryPreparation: "not-authorized",
    inventoryModelExecution: "not-authorized",
    independentJudgmentPacketPreparation: "not-authorized",
    independentJudgmentModelExecution: "not-authorized",
    audioVerification: "not-authorized",
    adjudicationModelExecution: "not-authorized",
    scoreDerivation: "not-authorized",
    publicationPreparation: "not-authorized",
    publicationModelExecution: "not-authorized",
    productionMutation: "not-authorized",
    nextBatchSelection: "not-authorized",
  },
  authorization: {
    sourcePacketPreparation: true,
    deterministicValidation: true,
    discoveryExecutionManifestPreparation: false,
    discoveryModelExecution: false,
    inventoryPreparation: false,
    inventoryModelExecution: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    paidTranscription: false,
    unexpectedPaidService: false,
    audioVerification: false,
    adjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationPacketPreparation: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false,
  },
  nextAuthorizedAction: "run-batch-13-deterministic-source-packet-validation-model-free-only",
};

if (shouldWrite) {
  for (const { file, bytes } of pendingWrites) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }
  await mkdir(ROOT, { recursive: true });
  await writeFile(PREPARATION, jsonBytes(preparation));
}
console.log(JSON.stringify({
  status: preparation.status,
  debates: contexts.map((context) => ({ debateNumber: context.debateNumber, sourceEvents: context.sourceEvents, chunks: context.chunks.length, sourceComplexityBand: context.sourceComplexityBand })),
  totals: preparation.totals,
  modelExecutionAuthorized: false,
  directCostUsd: 0,
  nextAuthorizedAction: preparation.nextAuthorizedAction,
}, null, 2));
