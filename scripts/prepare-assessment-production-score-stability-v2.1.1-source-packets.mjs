#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildProductionCanarySourcePacket } from "./lib/assessment-production-canary-packets.mjs";
import {
  V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
  V211_DISCOVERY_MODEL,
  V211_DISCOVERY_PROTOCOL_ID,
  buildV211TokenCountedChunkLedger,
  makeV211DiscoverySchema,
} from "./lib/assessment-production-score-stability-v2.1.1-discovery.mjs";
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
  "docs/assessment-production/score-stability-v2.1.1-validation-cohort";
const ROOT = `${VALIDATION_ROOT}/source-preparation`;
const PROTOCOL_ID =
  "assessment-production-score-stability-v2.1.1-fresh-validation-source-preparation";
const CACHE_VERSION =
  "assessment-production-score-stability-v2.1.1-fresh-validation";
const CACHE_LEDGER_ROOT = `.assessment-cache/compact-ledgers/${CACHE_VERSION}`;
const CACHE_PARTITION_ROOT =
  `.assessment-cache/partition-ledgers/${CACHE_VERSION}`;
const CACHE_TOKEN_ROOT =
  `.assessment-cache/token-counted-partition-ledgers/${CACHE_VERSION}`;
const SELECTION = `${VALIDATION_ROOT}/selection.json`;
const SUCCESSOR_ANALYSIS =
  "docs/assessment-production/score-stability-v2.1.1-discovery-successor-development/development-analysis.json";
const DISCOVERY_MANUAL =
  "docs/assessment-production/score-stability-v2.1.1-discovery-successor-development/manual.md";
const PREDECESSOR_MANIFEST =
  "docs/assessment-production/score-stability-v2.1-validation-cohort/validation-manifest.json";
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
  "scripts/prepare-assessment-production-score-stability-v2.1.1-source-packets.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.1.1-source-packets.mjs";
const SOURCE_FILES = [
  SELECTION,
  SUCCESSOR_ANALYSIS,
  DISCOVERY_MANUAL,
  PREDECESSOR_MANIFEST,
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
  "scripts/lib/assessment-production-score-stability-v2.1.1-discovery.mjs",
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

const [selectionBytes, analysisBytes, predecessorBytes, productionBytes, manualBytes] =
  await Promise.all([
    readFile(SELECTION),
    readFile(SUCCESSOR_ANALYSIS),
    readFile(PREDECESSOR_MANIFEST),
    readFile(PRODUCTION_MANIFEST),
    readFile(DISCOVERY_MANUAL),
  ]);
const selection = JSON.parse(selectionBytes);
const analysis = JSON.parse(analysisBytes);
const predecessor = JSON.parse(predecessorBytes);
const productionManifest = JSON.parse(productionBytes);

assertV4(
  selection.status ===
      "fresh-disjoint-v2.1.1-ten-debate-cohort-source-gate-passed" &&
    selection.selected.length === 10 &&
    selection.authorization.freshSourcePreparation === true &&
    selection.authorization.discoveryExecutionManifestPreparation === false &&
    selection.authorization.discoveryModelExecution === false &&
    selection.nextAuthorizedAction ===
      "prepare-v2.1.1-source-packets-token-ledgers-and-schemas-model-free-only",
  "v2.1.1 selection does not authorize model-free source preparation"
);
assertV4(
  selection.modelBoundary.label === V211_DISCOVERY_MODEL.label &&
    selection.modelBoundary.slug === V211_DISCOVERY_MODEL.slug &&
    selection.modelBoundary.reasoningEffort ===
      V211_DISCOVERY_MODEL.reasoningEffort &&
    selection.modelBoundary.authentication ===
      V211_DISCOVERY_MODEL.authentication &&
    selection.modelBoundary.scoreBlind === true &&
    selection.modelBoundary.modelContextsExecuted === 0 &&
    selection.modelBoundary.retries === 0 &&
    selection.modelBoundary.timeoutExtensions === 0,
  "frozen v2.1.1 model or isolation boundary drifted"
);
assertV4(
  selection.policy.version === "v2.1-proposal" &&
    selection.policy.everyIntegerRoundedTieAccepted === true &&
    selection.policy.promoted === false &&
    selection.successorProtocol.minimumRequestedLexicalTokens ===
      V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS &&
    selection.successorProtocol.modelAuthoredEndEvent === false &&
    selection.successorProtocol.predecessorOwnershipRuleExplicit === true,
  "v2.1 proposal or successor source-window contract drifted"
);
assertV4(
  analysis.status ===
      "v2.1.1-repository-materialized-discovery-successor-model-free-regression-passed" &&
    analysis.failedGateDisposition.v1CanaryPreservedFailed === true &&
    analysis.failedGateDisposition.v2ValidationPreservedFailed === true &&
    analysis.failedGateDisposition.v21DiscoveryPreservedFailed === true &&
    analysis.failedGateDisposition.v21AcceptedAsPassed === false &&
    analysis.failedGateDisposition.v21PolicyPromoted === false &&
    analysis.successorContract.thresholdRelaxed === false &&
    analysis.successorContract.silentCandidateDeletion === false &&
    analysis.successorContract.automaticSemanticRepair === false,
  "failed-gate or successor-development disposition drifted"
);
assertV4(
  predecessor.stopRules.invalidModelOutputBlocks === true &&
    predecessor.stopRules.isolationFailureBlocks === true &&
    predecessor.stopRules.modelAuthoredScoreBlocks === true &&
    predecessor.stopRules.postResultPolicyChangeBlocks === true &&
    predecessor.stopRules.productionMutationBlocks === true &&
    predecessor.currentCanaryDisposition.reclassified === false &&
    predecessor.priorV2ValidationDisposition.gatesPassed === 0,
  "inherited stop rules or failed-canary disposition drifted"
);
assertV4(
  productionManifest.status ===
      "frozen-cohort-pending-ten-debate-canary-selection" &&
    productionManifest.model.slug === V211_DISCOVERY_MODEL.slug &&
    productionManifest.model.reasoningEffort ===
      V211_DISCOVERY_MODEL.reasoningEffort &&
    productionManifest.model.authentication ===
      V211_DISCOVERY_MODEL.authentication,
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
    transportRoute: "partitioned-repository-materialized-discovery",
  };
  validateV42219PartitionPlan(plan, built.sourceLedgerBytes);
  const planPath = `${ROOT}/plans/debate-${selected.debateNumber}.json`;
  const planBytes = jsonBytes(plan);
  const packet = structuredClone(built.packet);
  packet.schemaVersion =
    "1.0-score-stability-v2.1.1-validation-score-blind-source-packet";
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
    modelAuthoredEndEventProhibited: true,
    repositoryMaterializesSmallestInclusiveEndEvent: true,
    requestedLexicalTokensMinimum:
      V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
    requestedLexicalTokensMinimumEnforcedByOutputSchema: true,
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
    const tokenLedgerBytes = buildV211TokenCountedChunkLedger(chunkBytes);
    const chunkLedgerPath =
      `${CACHE_PARTITION_ROOT}/debate-${selected.debateNumber}/${chunk.chunkId}.jsonl`;
    const tokenLedgerPath =
      `${CACHE_TOKEN_ROOT}/debate-${selected.debateNumber}/${chunk.chunkId}.jsonl`;
    const schemaPath =
      `${ROOT}/schemas/debate-${selected.debateNumber}-${chunk.chunkId}.schema.json`;
    const schema = makeV211DiscoverySchema({
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
        sourceWindow.properties.requestedLexicalTokens.minimum ===
          V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
      `${selected.debateNumber}/${chunk.chunkId}: successor ownership schema mismatch`
    );
    assertV4(
      !Object.hasOwn(sourceWindow.properties, "endEvent") &&
        sourceWindow.additionalProperties === false,
      `${selected.debateNumber}/${chunk.chunkId}: schema permits model-authored end event`
    );
    assertNoPropertyNamed(schema, "endEvent");
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
      schemaMinimumRequestedLexicalTokensEnforced: true,
      schemaModelAuthoredEndEventProhibited: true,
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
    transportRoute: "partitioned-repository-materialized-discovery",
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
const futureOutputPaths = allChunks.map((chunk) => chunk.rawOutput);
const preparation = {
  schemaVersion:
    "1.0-score-stability-v2.1.1-fresh-validation-source-preparation",
  protocolId: PROTOCOL_ID,
  discoveryProtocolId: V211_DISCOVERY_PROTOCOL_ID,
  status: shouldWrite
    ? "fresh-ten-debate-v2.1.1-source-token-ledgers-and-discovery-packets-prepared"
    : "preview",
  preparedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  failedGateDisposition: structuredClone(analysis.failedGateDisposition),
  proposedPolicy: {
    version: selection.policy.version,
    everyIntegerRoundedTieAccepted: true,
    promoted: false,
  },
  successorContract: structuredClone(analysis.successorContract),
  residualRisks: structuredClone(analysis.residualRisks),
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
    repositoryMaterializedEndEvent: true,
    modelAuthoredEndEventProhibited: true,
    minimumRequestedLexicalTokens:
      V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
    minimumRequestedLexicalTokensSchemaEnforced: true,
    tokenCountedLedgerRequired: true,
    predecessorChunkOwnershipRuleExplicit: true,
    deterministicValidatorRetained: true,
    frozenDyadicSpeakerAllowlist: true,
    stagingOnlyCalibrationFlagRequired: true,
  },
  model: {
    ...structuredClone(V211_DISCOVERY_MODEL),
    scoreBlind: true,
    meteredApiCostUsdMaximum: 0,
  },
  inputs: {
    selection: SELECTION,
    successorAnalysis: SUCCESSOR_ANALYSIS,
    predecessorValidationManifest: PREDECESSOR_MANIFEST,
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
    tokenMinimumSchemas: allChunks.filter(
      (chunk) => chunk.schemaMinimumRequestedLexicalTokensEnforced
    ).length,
    modelEndEventProhibitingSchemas: allChunks.filter(
      (chunk) => chunk.schemaModelAuthoredEndEventProhibited
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
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  stopRules: structuredClone(predecessor.stopRules),
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
    "freeze-v2.1.1-discovery-execution-manifest-model-free-only",
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
      v1CanaryStillFailed: true,
      v2ValidationStillFailed: true,
      v21DiscoveryStillFailed: true,
      proposedPolicyPromoted: false,
      modelExecutionAuthorized: false,
      nextAuthorizedAction: preparation.nextAuthorizedAction,
    },
    null,
    2
  )
);
