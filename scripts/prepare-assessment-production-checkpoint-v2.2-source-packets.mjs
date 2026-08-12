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
  buildV212TokenCountedChunkLedger,
  makeV212DiscoverySchema,
} from "./lib/assessment-production-score-stability-v2.1.2-discovery.mjs";
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
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const CHECKPOINT_ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1";
const ROOT = `${CHECKPOINT_ROOT}/source-preparation`;
const PROTOCOL_ID =
  "assessment-production-checkpoint-v2.2-1-source-preparation";
const CACHE_VERSION = "production-checkpoint-v2.2-1";
const CACHE_LEDGER_ROOT = `.assessment-cache/compact-ledgers/${CACHE_VERSION}`;
const CACHE_PARTITION_ROOT =
  `.assessment-cache/partition-ledgers/${CACHE_VERSION}`;
const CACHE_TOKEN_ROOT =
  `.assessment-cache/token-counted-partition-ledgers/${CACHE_VERSION}`;
const MASTER = `${CHECKPOINT_ROOT}/master-manifest.json`;
const SELECTION = `${CHECKPOINT_ROOT}/selection.json`;
const REPAIR_RECORD =
  "docs/assessment-production/source-repairs/debate-167-empty-event-normalization.json";
const DISCOVERY_SUCCESSOR_ANALYSIS =
  "docs/assessment-production/score-stability-v2.1.2-discovery-successor-development/development-analysis.json";
const DISCOVERY_MANUAL =
  "docs/assessment-production/score-stability-v2.1.2-discovery-successor-development/manual.md";
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const PACKET_WORKFLOW =
  "docs/assessment-production-canary-packet-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const RUBRIC = "docs/reassessment-rubric-v2.1.md";
const POLICY =
  "docs/assessment-production/score-stability-policy-v2.2-proposal.md";
const PROMOTION =
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const ACTIVE_CONTROL =
  "scripts/lib/assessment-production-score-stability-policy-active.mjs";
const ACTIVE_CONTROL_TEST =
  "scripts/test-assessment-production-score-stability-policy-active.mjs";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const SCRIPT =
  "scripts/prepare-assessment-production-checkpoint-v2.2-source-packets.mjs";
const TEST =
  "scripts/test-assessment-production-checkpoint-v2.2-source-packets.mjs";
const SOURCE_FILES = [
  MASTER,
  SELECTION,
  REPAIR_RECORD,
  DISCOVERY_SUCCESSOR_ANALYSIS,
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
  SCRIPT,
  TEST,
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const sourceBand = (events) =>
  events <= 1800
    ? "direct-sized"
    : events <= 3600
      ? "partition-medium"
      : "partition-heavy";
const durationBand = (seconds) =>
  seconds < 3600
    ? "under-60-minutes"
    : seconds < 5400
      ? "60-to-89-minutes"
      : "90-minutes-or-more";
const captionKind = (source) =>
  source.track?.kind === "asr"
    ? "auto"
    : source.track?.kind?.startsWith("api-")
      ? "api"
      : "human";

async function mustNotExist(target) {
  await access(target).then(
    () => {
      throw new Error(`${target} already exists; preparation is immutable`);
    },
    () => true
  );
}

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

const [masterBytes, selectionBytes, discoveryAnalysisBytes, manualBytes] =
  await Promise.all([
    readFile(MASTER),
    readFile(SELECTION),
    readFile(DISCOVERY_SUCCESSOR_ANALYSIS),
    readFile(DISCOVERY_MANUAL),
  ]);
const master = JSON.parse(masterBytes);
const selection = JSON.parse(selectionBytes);
const discoveryAnalysis = JSON.parse(discoveryAnalysisBytes);

assertV4(
  master.status ===
      "frozen-production-checkpoint-v2.2-master-source-preparation-authorized" &&
    master.productionCanary === true &&
    master.developmentValidationOnly === false &&
    master.stagingOnly === true &&
    master.cohort.exactDebateCount === 10 &&
    master.cohort.exactSideCount === 20 &&
    master.authorization.sourcePreparation === true &&
    master.authorization.discoveryExecutionManifestPreparation === false &&
    master.authorization.discoveryModelExecution === false &&
    master.authorization.independentJudgmentPacketPreparation === false &&
    master.authorization.independentJudgmentModelExecution === false &&
    master.authorization.productionMutation === false &&
    master.nextAuthorizedAction ===
      "prepare-complete-production-checkpoint-v2.2-source-packets-model-free-only",
  "master manifest does not authorize model-free source preparation"
);
assertV4(
  master.model.label === V212_DISCOVERY_MODEL.label &&
    master.model.slug === V212_DISCOVERY_MODEL.slug &&
    master.model.reasoningEffort === V212_DISCOVERY_MODEL.reasoningEffort &&
    master.model.authentication === V212_DISCOVERY_MODEL.authentication &&
    master.model.scoreBlind === true &&
    master.model.apiKeysRemoved === true &&
    master.activeScoreStabilityPolicy.version === "v2.2" &&
    master.activeScoreStabilityPolicy.scorePassesMaximum === 1 &&
    master.activeScoreStabilityPolicy.modelAuthoredScoresAllowed === false &&
    master.activeScoreStabilityPolicy.automaticRerunAllowed === false &&
    Object.values(master.stopRules).every(Boolean),
  "frozen production model, policy, or stop-rule boundary drifted"
);
assertV4(
  selection.status ===
      "fresh-disjoint-ten-debate-production-checkpoint-v2.2-source-gate-passed-after-exact-source-repair" &&
    selection.selected.length === 10 &&
    sha256(selectionBytes) === master.cohort.selectionSha256,
  "production checkpoint selection drifted"
);
assertV4(
  discoveryAnalysis.status ===
      "v2.1.2-bounded-end-discovery-successor-model-free-dual-regression-passed" &&
    discoveryAnalysis.successorContract.minimumLexicalTokens ===
      V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS &&
    discoveryAnalysis.successorContract.repositoryDerivedLexicalTokenCount ===
      true &&
    discoveryAnalysis.successorContract.thresholdRelaxed === false &&
    discoveryAnalysis.successorContract.automaticTruncation === false &&
    discoveryAnalysis.successorContract.automaticSemanticRepair === false,
  "inherited bounded-end discovery contract drifted"
);
for (const [file, digest] of Object.entries(master.sourceHashes)) {
  await verifiedBytes(file, digest, `master source ${file}`);
}
if (shouldWrite) {
  await Promise.all([
    mustNotExist(ROOT),
    mustNotExist(CACHE_LEDGER_ROOT),
    mustNotExist(CACHE_PARTITION_ROOT),
    mustNotExist(CACHE_TOKEN_ROOT),
  ]);
}

const contexts = [];
const pendingWrites = [];
for (const selected of master.cohort.debates) {
  const speakers = [
    ...selected.sides.pro.speakers,
    ...selected.sides.con.speakers,
  ];
  assertV4(
    selected.sides.pro.speakers.length === 1 &&
      selected.sides.con.speakers.length === 1 &&
      new Set(speakers).size === 2,
    `${selected.debateNumber}: two frozen interlocutors required`
  );
  const transcriptPath = selected.sourceChain.transcript;
  const eventsPath = selected.sourceChain.events;
  const manifestPath = selected.sourceChain.manifest;
  const fullLedgerPath =
    `${CACHE_LEDGER_ROOT}/debate-${selected.debateNumber}.jsonl`;
  const [transcriptBytes, eventsBytes, manifestBytes] = await Promise.all([
    verifiedBytes(transcriptPath, selected.sourceChain.transcriptSha256),
    verifiedBytes(eventsPath, selected.sourceChain.eventsSha256),
    verifiedBytes(manifestPath, selected.sourceChain.manifestSha256),
  ]);
  const localManifest = JSON.parse(manifestBytes);
  const eventsDocument = JSON.parse(eventsBytes);
  assertV4(
    localManifest.videoId === selected.videoId &&
      localManifest.eventCount === selected.eventCount,
    `${selected.debateNumber}: frozen source identity mismatch`
  );
  const debate = {
    ...selected,
    family: classifyV424Motion(selected.motion),
    durationSeconds: localManifest.durationSeconds,
    durationBand: durationBand(localManifest.durationSeconds),
    captionKind: captionKind(localManifest),
    sourceEventCount: selected.eventCount,
    sourceComplexityBand: sourceBand(selected.eventCount),
  };
  const built = buildProductionCanarySourcePacket({
    debate,
    transcriptPath,
    eventsPath,
    manifestPath,
    sourceLedgerPath: fullLedgerPath,
    transcriptBytes,
    eventsBytes,
    manifestBytes,
  });
  assertV4(
    built.packet.eventCount === selected.eventCount,
    `${selected.debateNumber}: source event count drifted`
  );
  const plan = {
    ...planV42219Partition(built.sourceLedgerBytes),
    debateNumber: selected.debateNumber,
    debateId: selected.debateId,
    sourceComplexityBand: debate.sourceComplexityBand,
    transportRoute: "partitioned-bounded-end-discovery",
  };
  validateV42219PartitionPlan(plan, built.sourceLedgerBytes);
  assertV4(plan.chunks.length >= 2, `${selected.debateNumber}: partition drifted`);
  const planPath = `${ROOT}/plans/debate-${selected.debateNumber}.json`;
  const planBytes = jsonBytes(plan);
  const packet = structuredClone(built.packet);
  packet.schemaVersion =
    "1.0-production-checkpoint-v2.2-score-blind-source-packet";
  packet.protocolId = PROTOCOL_ID;
  packet.transportChain.partitionPlanPath = planPath;
  packet.transportChain.partitionPlanSha256 = sha256(planBytes);
  packet.transportChain.partitionChunks = plan.chunks.length;
  packet.transportChain.modelDeliveredLedgerFormat =
    "jsonl rows [eventIndex,startMs,durationMs,lexicalTokenCount,text]";
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
    productionCanary: true,
    developmentValidationOnly: false,
    legacyAssessmentsPriorJudgmentsScoresWinnersTagsAndPublicationProseUnavailable:
      true,
  };
  const packetPath = `${ROOT}/packets/debate-${selected.debateNumber}.json`;
  const packetBytes = jsonBytes(packet);
  const chunks = [];
  for (const chunk of plan.chunks) {
    const chunkBytes = buildV42219ChunkLedger(built.sourceLedgerBytes, chunk);
    validateV42219ChunkLedger(chunkBytes, built.sourceLedgerBytes, chunk);
    const tokenLedgerBytes = buildV212TokenCountedChunkLedger(chunkBytes);
    const chunkLedgerPath =
      `${CACHE_PARTITION_ROOT}/debate-${selected.debateNumber}/${chunk.chunkId}.jsonl`;
    const tokenLedgerPath =
      `${CACHE_TOKEN_ROOT}/debate-${selected.debateNumber}/${chunk.chunkId}.jsonl`;
    const schemaPath =
      `${ROOT}/schemas/debate-${selected.debateNumber}-${chunk.chunkId}.schema.json`;
    const schema = makeV212DiscoverySchema({
      packet,
      chunk,
      candidatesMaximum: plan.limits.candidatesPerChunkMaximum,
    });
    const candidate = schema.properties.candidates.items;
    const sourceWindow = candidate.properties.sourceWindow;
    assertV4(
      sourceWindow.properties.startEvent.minimum === chunk.coreStartEvent &&
        sourceWindow.properties.startEvent.maximum === chunk.coreEndEvent &&
        sourceWindow.properties.endEvent.minimum === chunk.coreStartEvent &&
        sourceWindow.properties.endEvent.maximum === chunk.contextEndEvent &&
        JSON.stringify(sourceWindow.required) ===
          JSON.stringify(["startEvent", "endEvent"]) &&
        sourceWindow.additionalProperties === false &&
        !Object.hasOwn(sourceWindow.properties, "requestedLexicalTokens"),
      `${selected.debateNumber}/${chunk.chunkId}: source-window bounds drifted`
    );
    assertNoPropertyNamed(schema, "requestedLexicalTokens");
    assertV4(
      JSON.stringify(candidate.properties.speaker.enum) ===
        JSON.stringify(speakers),
      `${selected.debateNumber}/${chunk.chunkId}: speaker allowlist mismatch`
    );
    const schemaBytes = jsonBytes(schema);
    pendingWrites.push(
      { file: chunkLedgerPath, bytes: chunkBytes },
      { file: tokenLedgerPath, bytes: tokenLedgerBytes },
      { file: schemaPath, bytes: schemaBytes }
    );
    chunks.push({
      ...chunk,
      chunkLedgerPath,
      chunkLedgerSha256: sha256(chunkBytes),
      tokenCountedLedgerPath: tokenLedgerPath,
      tokenCountedLedgerSha256: sha256(tokenLedgerBytes),
      tokenCountedLedgerRows: chunk.contextEvents,
      schemaPath,
      schemaSha256: sha256(schemaBytes),
      copiedInputBytes:
        manualBytes.length +
        packetBytes.length +
        schemaBytes.length +
        tokenLedgerBytes.length,
      rawOutput:
        `${ROOT}/discovery-outputs/debate-${selected.debateNumber}-${chunk.chunkId}.json`,
    });
  }
  pendingWrites.push(
    { file: fullLedgerPath, bytes: built.sourceLedgerBytes },
    { file: planPath, bytes: planBytes },
    { file: packetPath, bytes: packetBytes }
  );
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
const sourceHashes = {};
for (const file of [...new Set(SOURCE_FILES)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}
const preparation = {
  schemaVersion: "1.0-production-checkpoint-v2.2-source-preparation",
  protocolId: PROTOCOL_ID,
  discoveryProtocolId: V212_DISCOVERY_PROTOCOL_ID,
  status: shouldWrite
    ? "production-checkpoint-v2.2-ten-complete-score-blind-source-packets-prepared"
    : "preview",
  preparedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: false,
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  activePolicy: {
    version: master.activeScoreStabilityPolicy.version,
    promotion: master.activeScoreStabilityPolicy.promotion,
    promotionSha256: master.activeScoreStabilityPolicy.promotionSha256,
    scorePassesMaximum: 1,
    modelAuthoredScoresAllowed: false,
    automaticRerunAllowed: false,
  },
  inheritedDiscoverySuccessorContract: structuredClone(
    discoveryAnalysis.successorContract
  ),
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
  schemaHardening: {
    candidateStartOwnedCoreBounds: true,
    modelAuthoredEndEventRequired: true,
    modelAuthoredEndEventLockedContextBounds: true,
    repositoryDerivedLexicalTokenCount: true,
    minimumLexicalTokens: V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
    requestedLexicalTokensProhibited: true,
    tokenCountedLedgerRequired: true,
    predecessorChunkOwnershipRuleExplicit: true,
    deterministicValidatorRetained: true,
    frozenDyadicSpeakerAllowlist: true,
  },
  model: {
    ...structuredClone(V212_DISCOVERY_MODEL),
    authentication: "ChatGPT subscription",
    scoreBlind: true,
    apiKeysRemoved: true,
    modelContextsExecuted: 0,
    meteredApiCostUsdMaximum: 0,
  },
  isolation: structuredClone(master.isolation),
  inputs: {
    masterManifest: MASTER,
    selection: SELECTION,
    sourceRepairRecord: REPAIR_RECORD,
    discoverySuccessorAnalysis: DISCOVERY_SUCCESSOR_ANALYSIS,
    productionManifest: PRODUCTION_MANIFEST,
    productionWorkflow: PRODUCTION_WORKFLOW,
    packetWorkflow: PACKET_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW,
    rubric: RUBRIC,
    policy: POLICY,
    promotion: PROMOTION,
    activeScoreControl: ACTIVE_CONTROL,
    activeScoreControlTest: ACTIVE_CONTROL_TEST,
    discoveryManual: DISCOVERY_MANUAL,
  },
  sourceHashes,
  contexts,
  totals: {
    debates: contexts.length,
    sides: contexts.length * 2,
    sourceChainOverlays: contexts.filter(
      (context) => context.sourceChainOverlayApplied
    ).length,
    directSizedSources: contexts.filter(
      (context) => context.sourceComplexityBand === "direct-sized"
    ).length,
    partitionMediumSources: contexts.filter(
      (context) => context.sourceComplexityBand === "partition-medium"
    ).length,
    partitionHeavySources: contexts.filter(
      (context) => context.sourceComplexityBand === "partition-heavy"
    ).length,
    partitionedDiscoveryDebates: contexts.length,
    discoveryContexts: allChunks.length,
    sourceEvents: contexts.reduce(
      (sum, context) => sum + context.sourceEvents,
      0
    ),
    sourceLedgerBytes: contexts.reduce(
      (sum, context) => sum + context.sourceBytes,
      0
    ),
    tokenCountedLedgerRows: allChunks.reduce(
      (sum, chunk) => sum + chunk.tokenCountedLedgerRows,
      0
    ),
    copiedDiscoveryInputBytes: allChunks.reduce(
      (sum, chunk) => sum + chunk.copiedInputBytes,
      0
    ),
    maximumCopiedInputBytes: Math.max(
      ...allChunks.map((chunk) => chunk.copiedInputBytes)
    ),
    modelContextsExecuted: 0,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    audioCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  futureOutputPathsExcludedFromSourceHashes: allChunks.map(
    (chunk) => chunk.rawOutput
  ),
  stopRules: structuredClone(master.stopRules),
  stageBoundary: {
    sourcePreparation: "completed",
    discoveryExecutionManifestPreparation: "authorized",
    discoveryModelExecution: "not-authorized",
    inventoryPreparation: "not-authorized",
    inventoryModelExecution: "not-authorized",
    independentJudgmentPacketPreparation: "not-authorized",
    independentJudgmentModelExecution: "not-authorized",
    audioVerification: "not-authorized",
    adjudicationModelExecution: "not-authorized",
    scoreDerivation: "not-authorized",
    publicationPreparation: "not-authorized",
    productionMutation: "not-authorized",
    remainingProductionBatches: "not-authorized",
  },
  authorization: {
    deterministicValidation: true,
    discoveryExecutionManifestPreparation: true,
    discoveryModelExecution: false,
    inventoryPreparation: false,
    inventoryModelExecution: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    paidTranscription: false,
    audioVerification: false,
    adjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationPacketPreparation: false,
    publicationModelExecution: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction:
    "freeze-production-checkpoint-v2.2-discovery-execution-manifest-model-free-only",
};

if (shouldWrite) {
  for (const { file, bytes } of pendingWrites) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }
  await mkdir(ROOT, { recursive: true });
  await writeFile(PREPARATION, jsonBytes(preparation));
}
console.log(
  JSON.stringify(
    {
      status: preparation.status,
      debates: contexts.map((context) => ({
        debateNumber: context.debateNumber,
        sourceComplexityBand: context.sourceComplexityBand,
        sourceEvents: context.sourceEvents,
        chunks: context.chunks.length,
        maximumCopiedInputKilobytes: Math.round(
          Math.max(...context.chunks.map((chunk) => chunk.copiedInputBytes)) /
            1000
        ),
      })),
      totals: preparation.totals,
      modelExecutionAuthorized: false,
      nextAuthorizedAction: preparation.nextAuthorizedAction,
    },
    null,
    2
  )
);
