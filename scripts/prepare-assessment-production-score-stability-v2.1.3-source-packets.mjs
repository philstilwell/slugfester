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

const VALIDATION_ROOT =
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort";
const ROOT = `${VALIDATION_ROOT}/source-preparation`;
const PROTOCOL_ID =
  "assessment-production-score-stability-v2.1.3-fresh-validation-source-preparation";
const CACHE_VERSION =
  "assessment-production-score-stability-v2.1.3-fresh-validation";
const CACHE_LEDGER_ROOT = `.assessment-cache/compact-ledgers/${CACHE_VERSION}`;
const CACHE_PARTITION_ROOT =
  `.assessment-cache/partition-ledgers/${CACHE_VERSION}`;
const CACHE_TOKEN_ROOT =
  `.assessment-cache/token-counted-partition-ledgers/${CACHE_VERSION}`;
const SELECTION = `${VALIDATION_ROOT}/selection.json`;
const INVENTORY_SUCCESSOR_ANALYSIS =
  "docs/assessment-production/score-stability-v2.1.3-chronology-fallback-development/development-analysis.json";
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
  "docs/assessment-production/score-stability-policy-v2.1-proposal.md";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const SCRIPT =
  "scripts/prepare-assessment-production-score-stability-v2.1.3-source-packets.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.1.3-source-packets.mjs";
const SOURCE_FILES = [
  SELECTION,
  INVENTORY_SUCCESSOR_ANALYSIS,
  DISCOVERY_SUCCESSOR_ANALYSIS,
  DISCOVERY_MANUAL,
  PRODUCTION_MANIFEST,
  PRODUCTION_WORKFLOW,
  PACKET_WORKFLOW,
  READINESS_WORKFLOW,
  RUBRIC,
  POLICY,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/lib/v424-source-classification.mjs",
  "scripts/lib/assessment-production-canary-packets.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.2-discovery.mjs",
  SCRIPT,
  TEST,
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const durationBand = (seconds) =>
  seconds < 3600
    ? "under-60-minutes"
    : seconds < 5400
      ? "60-to-89-minutes"
      : "90-minutes-or-more";
const sourceBand = (events) =>
  events <= 1800
    ? "direct-sized"
    : events <= 3600
      ? "partition-medium"
      : "partition-heavy";
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

const [
  selectionBytes,
  inventoryAnalysisBytes,
  discoveryAnalysisBytes,
  productionBytes,
  manualBytes,
] = await Promise.all([
  readFile(SELECTION),
  readFile(INVENTORY_SUCCESSOR_ANALYSIS),
  readFile(DISCOVERY_SUCCESSOR_ANALYSIS),
  readFile(PRODUCTION_MANIFEST),
  readFile(DISCOVERY_MANUAL),
]);
const selection = JSON.parse(selectionBytes);
const inventoryAnalysis = JSON.parse(inventoryAnalysisBytes);
const discoveryAnalysis = JSON.parse(discoveryAnalysisBytes);
const productionManifest = JSON.parse(productionBytes);

assertV4(
  selection.status ===
      "fresh-disjoint-v2.1.3-ten-debate-cohort-source-gate-passed" &&
    selection.selected.length === 10 &&
    selection.authorization.freshSourcePreparation === true &&
    selection.authorization.discoveryExecutionManifestPreparation === false &&
    selection.authorization.discoveryModelExecution === false &&
    selection.nextAuthorizedAction ===
      "prepare-v2.1.3-source-packets-token-ledgers-and-schemas-model-free-only",
  "v2.1.3 selection does not authorize model-free source preparation"
);
assertV4(
  selection.modelBoundary.label === V212_DISCOVERY_MODEL.label &&
    selection.modelBoundary.slug === V212_DISCOVERY_MODEL.slug &&
    selection.modelBoundary.reasoningEffort ===
      V212_DISCOVERY_MODEL.reasoningEffort &&
    selection.modelBoundary.authentication ===
      V212_DISCOVERY_MODEL.authentication &&
    selection.modelBoundary.scoreBlind === true &&
    selection.modelBoundary.modelContextsExecuted === 0 &&
    selection.modelBoundary.retries === 0 &&
    selection.modelBoundary.timeoutExtensions === 0 &&
    Object.values(selection.stopRules).every(Boolean),
  "frozen v2.1.3 model, isolation, or stop-rule boundary drifted"
);
assertV4(
  selection.policy.version === "v2.1-proposal" &&
    selection.policy.everyIntegerRoundedTieAccepted === true &&
    selection.policy.promoted === false &&
    selection.successorProtocol.version === "v2.1.3-chronology-fallback" &&
    selection.successorProtocol.inheritedDiscoveryVersion ===
      "v2.1.2-bounded-end-discovery" &&
    selection.successorProtocol.predecessorGatePreservedFailed === true &&
    selection.successorProtocol.predecessorOutputsReusableForAcceptance ===
      false &&
    selection.successorProtocol.predecessorOutputsReusableAsFreshModelInput ===
      false,
  "v2.1 proposal or successor inventory boundary drifted"
);
assertV4(
  inventoryAnalysis.status ===
      "chronology-fallback-successor-development-passed-fresh-disjoint-cohort-selection-authorized" &&
    inventoryAnalysis.failedGateDisposition
      .currentV212InventoryGatePreservedFailed === true &&
    inventoryAnalysis.failedGateDisposition
      .v212FailedOutputsUsedForSuccessorAcceptance === false &&
    inventoryAnalysis.failedGateDisposition
      .v212FailedOutputsUsedAsFreshSuccessorModelInput === false &&
    inventoryAnalysis.successorContract.planAndSideIsolationPreserved === true &&
    inventoryAnalysis.successorContract.scoreFieldsAvailable === false &&
    inventoryAnalysis.totals.modelContextsExecuted === 0 &&
    inventoryAnalysis.totals.scoresDerived === 0,
  "inventory successor-development disposition drifted"
);
assertV4(
  discoveryAnalysis.status ===
      "v2.1.2-bounded-end-discovery-successor-model-free-dual-regression-passed" &&
    discoveryAnalysis.successorContract.minimumLexicalTokens ===
      V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS &&
    discoveryAnalysis.successorContract.repositoryDerivedLexicalTokenCount ===
      true &&
    discoveryAnalysis.successorContract
      .modelAuthoredEndEventStructurallyBoundedByLockedContext === true &&
    discoveryAnalysis.successorContract.requestedLexicalTokensRemoved === true &&
    JSON.stringify(discoveryAnalysis.successorContract.sourceSelectionShape) ===
      JSON.stringify(["startEvent", "endEvent"]) &&
    discoveryAnalysis.successorContract.predecessorOwnershipRuleExplicit ===
      true &&
    discoveryAnalysis.successorContract.thresholdRelaxed === false &&
    discoveryAnalysis.successorContract.silentCandidateDeletion === false &&
    discoveryAnalysis.successorContract.automaticTruncation === false &&
    discoveryAnalysis.successorContract.automaticSemanticRepair === false,
  "inherited v2.1.2 discovery contract drifted"
);
assertV4(
  productionManifest.status ===
      "frozen-cohort-pending-ten-debate-canary-selection" &&
    productionManifest.model.slug === V212_DISCOVERY_MODEL.slug &&
    productionManifest.model.reasoningEffort ===
      V212_DISCOVERY_MODEL.reasoningEffort &&
    productionManifest.model.authentication ===
      V212_DISCOVERY_MODEL.authentication,
  "production corpus manifest drifted"
);
for (const [file, digest] of Object.entries(selection.sourceHashes)) {
  await verifiedBytes(file, digest, `selection source ${file}`);
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
for (const selected of selection.selected) {
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
    verifiedBytes(
      transcriptPath,
      selected.sourceChain.transcriptSha256,
      `${selected.debateNumber} transcript`
    ),
    verifiedBytes(
      eventsPath,
      selected.sourceChain.eventsSha256,
      `${selected.debateNumber} events`
    ),
    verifiedBytes(
      manifestPath,
      selected.sourceChain.manifestSha256,
      `${selected.debateNumber} manifest`
    ),
  ]);
  const localManifest = JSON.parse(manifestBytes);
  const eventsDocument = JSON.parse(eventsBytes);
  assertV4(
    localManifest.videoId === selected.videoId,
    `${selected.debateNumber}: local manifest video ID mismatch`
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
    "1.0-score-stability-v2.1.3-validation-score-blind-source-packet";
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
    developmentValidationOnly: true,
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
      eventsDocument,
      candidatesMaximum: plan.limits.candidatesPerChunkMaximum,
    });
    const candidate = schema.properties.candidates.items;
    const sourceWindow = candidate.properties.sourceWindow;
    assertV4(
      sourceWindow.properties.startEvent.minimum === chunk.coreStartEvent &&
        sourceWindow.properties.startEvent.maximum === chunk.coreEndEvent &&
        sourceWindow.properties.endEvent.minimum === chunk.coreStartEvent &&
        sourceWindow.properties.endEvent.maximum === chunk.contextEndEvent,
      `${selected.debateNumber}/${chunk.chunkId}: ownership bounds drifted`
    );
    assertV4(
      JSON.stringify(sourceWindow.required) ===
        JSON.stringify(["startEvent", "endEvent"]) &&
        sourceWindow.additionalProperties === false &&
        !Object.hasOwn(sourceWindow.properties, "requestedLexicalTokens"),
      `${selected.debateNumber}/${chunk.chunkId}: source-window schema drifted`
    );
    assertNoPropertyNamed(schema, "requestedLexicalTokens");
    const speakerAllowlist = candidate.properties.speaker.enum;
    assertV4(
      speakerAllowlist.length === 2 &&
        speakerAllowlist.every((speaker) => speakers.includes(speaker)),
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
      schemaCandidateStartOwnershipBoundsEnforced: true,
      schemaModelAuthoredEndEventRequired: true,
      schemaEndEventLockedContextBoundsEnforced: true,
      schemaRequestedLexicalTokensProhibited: true,
      deterministicMinimumLexicalTokensRequired: true,
      schemaSpeakerAllowlistEnforced: true,
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
  schemaVersion:
    "1.0-score-stability-v2.1.3-fresh-validation-source-preparation",
  protocolId: PROTOCOL_ID,
  discoveryProtocolId: V212_DISCOVERY_PROTOCOL_ID,
  status: shouldWrite
    ? "fresh-ten-debate-v2.1.3-source-token-ledgers-and-discovery-packets-prepared"
    : "preview",
  preparedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  failedGateDisposition: structuredClone(
    inventoryAnalysis.failedGateDisposition
  ),
  proposedPolicy: {
    version: selection.policy.version,
    everyIntegerRoundedTieAccepted: true,
    promoted: false,
  },
  inventorySuccessorContract: structuredClone(
    inventoryAnalysis.successorContract
  ),
  discoverySuccessorContract: structuredClone(
    discoveryAnalysis.successorContract
  ),
  residualDiscoveryRisks: structuredClone(discoveryAnalysis.residualRisks),
  sourceBoundary: {
    transcriptContentSemanticallyInspectedByPreparation: false,
    mechanicalSourceParsingOnly: true,
    audioAccessed: false,
    legacyAssessmentContentAccessed: false,
    priorJudgmentsAccessed: false,
    scoresOrWinnersAccessed: false,
    publicationContentAccessed: false,
  },
  schemaHardening: {
    candidateStartOwnedCoreBounds: true,
    modelAuthoredEndEventRequired: true,
    modelAuthoredEndEventLockedContextBounds: true,
    repositoryDerivedLexicalTokenCount: true,
    minimumLexicalTokens: V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
    minimumLexicalTokensDeterministicallyEnforced: true,
    minimumLexicalTokensSchemaEnforced: false,
    requestedLexicalTokensProhibited: true,
    tokenCountedLedgerRequired: true,
    predecessorChunkOwnershipRuleExplicit: true,
    deterministicValidatorRetained: true,
    frozenDyadicSpeakerAllowlist: true,
    stagingOnlyCalibrationFlagRequired: true,
  },
  model: {
    ...structuredClone(V212_DISCOVERY_MODEL),
    scoreBlind: true,
    meteredApiCostUsdMaximum: 0,
  },
  inputs: {
    selection: SELECTION,
    inventorySuccessorAnalysis: INVENTORY_SUCCESSOR_ANALYSIS,
    discoverySuccessorAnalysis: DISCOVERY_SUCCESSOR_ANALYSIS,
    productionManifest: PRODUCTION_MANIFEST,
    productionWorkflow: PRODUCTION_WORKFLOW,
    packetWorkflow: PACKET_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW,
    rubric: RUBRIC,
    policy: POLICY,
    discoveryManual: DISCOVERY_MANUAL,
  },
  sourceHashes,
  contexts,
  totals: {
    debates: contexts.length,
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
    ownershipBoundedSchemas: allChunks.filter(
      (chunk) => chunk.schemaCandidateStartOwnershipBoundsEnforced
    ).length,
    boundedEndSchemas: allChunks.filter(
      (chunk) => chunk.schemaEndEventLockedContextBoundsEnforced
    ).length,
    modelEndEventRequiringSchemas: allChunks.filter(
      (chunk) => chunk.schemaModelAuthoredEndEventRequired
    ).length,
    requestedTokenProhibitingSchemas: allChunks.filter(
      (chunk) => chunk.schemaRequestedLexicalTokensProhibited
    ).length,
    deterministicTokenMinimumContexts: allChunks.filter(
      (chunk) => chunk.deterministicMinimumLexicalTokensRequired
    ).length,
    speakerAllowlistedSchemas: allChunks.filter(
      (chunk) => chunk.schemaSpeakerAllowlistEnforced
    ).length,
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
  stopRules: structuredClone(selection.stopRules),
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
    scoreDerivation: false,
    policyPromotion: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction:
    "freeze-v2.1.3-discovery-execution-manifest-model-free-only",
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
