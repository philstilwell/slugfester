#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { makeV422112DiscoverySchema } from "./lib/v422112-simplified-discovery.mjs";
import {
  buildV42219ChunkLedger,
  planV42219Partition,
  validateV42219ChunkLedger,
  validateV42219PartitionPlan
} from "./lib/v42219-generalized-partition.mjs";
import { buildProductionCanarySourcePacket } from "./lib/assessment-production-canary-packets.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = "docs/assessment-production/canary-v1-source-preparation";
const PROTOCOL_ID = "assessment-production-canary-v1-source-preparation";
const CANARY_PATH = "docs/assessment-production/canary-v1.json";
const PRODUCTION_MANIFEST_PATH = "docs/assessment-production/manifest-v1.json";
const PRODUCTION_WORKFLOW_PATH = "docs/assessment-production-workflow.md";
const PACKET_WORKFLOW_PATH = "docs/assessment-production-canary-packet-workflow.md";
const READINESS_WORKFLOW_PATH = "docs/assessment-workflow-v4.2.21.17.41.md";
const DISCOVERY_MANUAL_PATH = "docs/calibration/v4.2.21.12/simplified-partition-discovery/manual.md";
const PREPARATION_PATH = `${ROOT}/preparation-manifest.json`;
const CACHE_VERSION = "assessment-production-canary-v1";
const SOURCE_FILES = [
  CANARY_PATH,
  PRODUCTION_MANIFEST_PATH,
  PRODUCTION_WORKFLOW_PATH,
  PACKET_WORKFLOW_PATH,
  READINESS_WORKFLOW_PATH,
  DISCOVERY_MANUAL_PATH,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/lib/v422112-simplified-discovery.mjs",
  "scripts/lib/assessment-production-canary-packets.mjs",
  "scripts/prepare-assessment-production-canary-packets.mjs",
  "scripts/test-assessment-production-canary-packets.mjs"
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

async function mustNotExist(file) {
  await access(file).then(
    () => {
      throw new Error(`${file} already exists; packet preparation is immutable`);
    },
    () => true
  );
}

async function verifiedBytes(file, expectedHash, label = file) {
  const bytes = await readFile(file);
  assertV4(sha256(bytes) === expectedHash, `${label}: SHA-256 mismatch`);
  return bytes;
}

const [canaryBytes, productionManifestBytes, manualBytes] = await Promise.all([
  readFile(CANARY_PATH),
  readFile(PRODUCTION_MANIFEST_PATH),
  readFile(DISCOVERY_MANUAL_PATH)
]);
const canary = JSON.parse(canaryBytes);
const productionManifest = JSON.parse(productionManifestBytes);

assertV4(
  canary.status === "frozen-ten-debate-canary-pending-packet-preparation" &&
    canary.authorization?.packetPreparation === true,
  "the frozen canary does not authorize packet preparation"
);
assertV4(canary.debates?.length === 10, "the frozen canary must contain exactly ten debates");
assertV4(
  productionManifest.status === "frozen-cohort-pending-ten-debate-canary-selection" &&
    productionManifest.scope?.dyadicProductionDebates === 179 &&
    productionManifest.scope?.firstCheckpointSize === 10,
  "the production corpus manifest is not the expected frozen cohort"
);
assertV4(
  productionManifest.model?.label === "5.6 Sol" &&
    productionManifest.model?.authentication === "ChatGPT subscription",
  "the production model/subscription lock changed"
);

for (const [file, expectedHash] of Object.entries(canary.sourceHashes ?? {})) {
  await verifiedBytes(file, expectedHash, `canary source ${file}`);
}
if (shouldWrite) await mustNotExist(PREPARATION_PATH);

const contexts = [];
for (const debate of canary.debates) {
  const speakers = [...(debate.sides?.pro?.speakers ?? []), ...(debate.sides?.con?.speakers ?? [])];
  assertV4(
    debate.sides?.pro?.speakers?.length === 1 &&
      debate.sides?.con?.speakers?.length === 1 &&
      new Set(speakers).size === 2,
    `${debate.debateNumber}: production canary packets require exactly two frozen interlocutors`
  );

  const transcriptPath = debate.sourceChain.transcript;
  const eventsPath = debate.sourceChain.events;
  const manifestPath = debate.sourceChain.manifest;
  const fullLedgerPath = `.assessment-cache/compact-ledgers/${CACHE_VERSION}/debate-${debate.debateNumber}.jsonl`;
  const [transcriptBytes, eventsBytes, manifestBytes] = await Promise.all([
    verifiedBytes(transcriptPath, debate.sourceChain.transcriptSha256, `${debate.debateNumber} transcript`),
    verifiedBytes(eventsPath, debate.sourceChain.eventsSha256, `${debate.debateNumber} events`),
    verifiedBytes(manifestPath, debate.sourceChain.manifestSha256, `${debate.debateNumber} manifest`)
  ]);
  const localManifest = JSON.parse(manifestBytes);
  assertV4(localManifest.videoId === debate.videoId, `${debate.debateNumber}: local manifest video ID mismatch`);

  const built = buildProductionCanarySourcePacket({
    debate,
    transcriptPath,
    eventsPath,
    manifestPath,
    sourceLedgerPath: fullLedgerPath,
    transcriptBytes,
    eventsBytes,
    manifestBytes
  });
  assertV4(
    built.packet.eventCount === debate.sourceEventCount,
    `${debate.debateNumber}: frozen source event count changed`
  );

  const plan = {
    ...planV42219Partition(built.sourceLedgerBytes),
    debateNumber: debate.debateNumber,
    debateId: debate.debateId,
    sourceComplexityBand: debate.sourceComplexityBand,
    transportRoute: "partitioned-discovery"
  };
  validateV42219PartitionPlan(plan, built.sourceLedgerBytes);

  const planPath = `${ROOT}/plans/debate-${debate.debateNumber}.json`;
  const planBytes = jsonBytes(plan);
  const packet = structuredClone(built.packet);
  packet.schemaVersion = "1.0-production-canary-score-blind-source-packet";
  packet.protocolId = PROTOCOL_ID;
  packet.transportChain.partitionPlanPath = planPath;
  packet.transportChain.partitionPlanSha256 = sha256(planBytes);
  packet.transportChain.partitionChunks = plan.chunks.length;
  packet.modelInputBoundary = {
    distributedTranscriptCoverageRequired: true,
    completeChunkContextRequired: true,
    everySourceEventOwnedExactlyOnce: true,
    boundaryContextMayRepeat: true,
    candidateStartMustBeInOwnedCore: true,
    candidateStartOwnershipEnforcedByOutputSchema: true,
    candidateMayExtendIntoLockedLookahead: true,
    candidateEndContextBoundaryEnforcedByOutputSchema: true,
    frozenDyadicSpeakerAllowlistRequired: true,
    modelSuppliedSourceMillisecondsProhibited: true,
    modelAuthoredEvidenceTextProhibited: true,
    modelAuthoredTargetIdsProhibited: true,
    scoreBlindDiscoveryOnly: true,
    stagingOnlyIntermediateOutput: true,
    legacyAssessmentsPriorJudgmentsScoresWinnersTagsAndPublicationProseUnavailable: true
  };
  const packetPath = `${ROOT}/packets/debate-${debate.debateNumber}.json`;
  const packetBytes = jsonBytes(packet);

  const chunks = [];
  for (const chunk of plan.chunks) {
    const chunkBytes = buildV42219ChunkLedger(built.sourceLedgerBytes, chunk);
    validateV42219ChunkLedger(chunkBytes, built.sourceLedgerBytes, chunk);
    const chunkLedgerPath = `.assessment-cache/partition-ledgers/${CACHE_VERSION}/debate-${debate.debateNumber}/${chunk.chunkId}.jsonl`;
    const schemaPath = `${ROOT}/schemas/debate-${debate.debateNumber}-${chunk.chunkId}.schema.json`;
    const schema = makeV422112DiscoverySchema({ packet, chunk });
    const sourceSpan = schema.properties.candidates.items.properties.sourceSpan.properties;
    const speakerAllowlist = schema.properties.candidates.items.properties.speaker.enum;
    assertV4(
      sourceSpan.startEvent.minimum === chunk.coreStartEvent &&
        sourceSpan.startEvent.maximum === chunk.coreEndEvent &&
        sourceSpan.endEvent.minimum === chunk.contextStartEvent &&
        sourceSpan.endEvent.maximum === chunk.contextEndEvent,
      `${debate.debateNumber}/${chunk.chunkId}: chunk ownership schema mismatch`
    );
    assertV4(
      speakerAllowlist.length === 2 && speakerAllowlist.every((speaker) => speakers.includes(speaker)),
      `${debate.debateNumber}/${chunk.chunkId}: frozen speaker allowlist mismatch`
    );
    const schemaBytes = jsonBytes(schema);
    if (shouldWrite) {
      await mkdir(path.dirname(chunkLedgerPath), { recursive: true });
      await mkdir(path.dirname(schemaPath), { recursive: true });
      await writeFile(chunkLedgerPath, chunkBytes);
      await writeFile(schemaPath, schemaBytes);
    }
    chunks.push({
      ...chunk,
      chunkLedgerPath,
      chunkLedgerSha256: sha256(chunkBytes),
      schemaPath,
      schemaSha256: sha256(schemaBytes),
      schemaOwnershipBoundsEnforced: true,
      schemaSpeakerAllowlistEnforced: true,
      copiedInputBytes: manualBytes.length + packetBytes.length + schemaBytes.length + chunkBytes.length,
      rawOutput: `${ROOT}/discovery-outputs/debate-${debate.debateNumber}-${chunk.chunkId}.json`
    });
  }

  if (shouldWrite) {
    await mkdir(path.dirname(fullLedgerPath), { recursive: true });
    await mkdir(path.dirname(planPath), { recursive: true });
    await mkdir(path.dirname(packetPath), { recursive: true });
    await writeFile(fullLedgerPath, built.sourceLedgerBytes);
    await writeFile(planPath, planBytes);
    await writeFile(packetPath, packetBytes);
  }

  contexts.push({
    debateNumber: debate.debateNumber,
    debateId: debate.debateId,
    family: debate.family,
    durationBand: debate.durationBand,
    captionKind: debate.captionKind,
    sourceComplexityBand: debate.sourceComplexityBand,
    transportRoute: "partitioned-discovery",
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
    chunks
  });
}

const allChunks = contexts.flatMap((context) => context.chunks);
const sourceHashes = {};
for (const file of [...new Set(SOURCE_FILES)]) sourceHashes[file] = sha256(await readFile(file));
const futureOutputPaths = allChunks.map((chunk) => chunk.rawOutput);
const preparation = {
  schemaVersion: "1.0-production-canary-source-preparation",
  protocolId: PROTOCOL_ID,
  status: shouldWrite
    ? "ten-debate-production-canary-source-and-discovery-packets-prepared"
    : "preview",
  preparedAt: shouldWrite ? new Date().toISOString() : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  sourceBoundary: {
    transcriptContentSemanticallyInspectedByPreparation: false,
    mechanicalSourceParsingOnly: true,
    audioAccessed: false,
    legacyAssessmentContentAccessed: false,
    priorJudgmentsAccessed: false,
    scoresOrWinnersAccessed: false,
    publicationContentAccessed: false
  },
  schemaHardening: {
    candidateStartOwnedCoreBounds: true,
    candidateEndAvailableContextBounds: true,
    deterministicValidatorRetained: true,
    frozenDyadicSpeakerAllowlist: true,
    stagingOnlyCalibrationFlagRequired: true
  },
  model: {
    ...productionManifest.model,
    meteredApiCostUsdMaximum: 0
  },
  inputs: {
    canary: CANARY_PATH,
    productionManifest: PRODUCTION_MANIFEST_PATH,
    productionWorkflow: PRODUCTION_WORKFLOW_PATH,
    packetWorkflow: PACKET_WORKFLOW_PATH,
    readinessWorkflow: READINESS_WORKFLOW_PATH,
    discoveryManual: DISCOVERY_MANUAL_PATH
  },
  sourceHashes,
  contexts,
  totals: {
    debates: contexts.length,
    directSizedSources: contexts.filter((context) => context.sourceComplexityBand === "direct-sized").length,
    partitionMediumSources: contexts.filter((context) => context.sourceComplexityBand === "partition-medium").length,
    partitionHeavySources: contexts.filter((context) => context.sourceComplexityBand === "partition-heavy").length,
    partitionedDiscoveryDebates: contexts.length,
    discoveryContexts: allChunks.length,
    sourceEvents: contexts.reduce((sum, context) => sum + context.sourceEvents, 0),
    sourceLedgerBytes: contexts.reduce((sum, context) => sum + context.sourceBytes, 0),
    copiedDiscoveryInputBytes: allChunks.reduce((sum, chunk) => sum + chunk.copiedInputBytes, 0),
    maximumCopiedInputBytes: Math.max(...allChunks.map((chunk) => chunk.copiedInputBytes)),
    ownershipBoundedSchemas: allChunks.filter((chunk) => chunk.schemaOwnershipBoundsEnforced).length,
    speakerAllowlistedSchemas: allChunks.filter((chunk) => chunk.schemaSpeakerAllowlistEnforced).length,
    modelContextsExecuted: 0,
    audioCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  authorization: {
    deterministicValidation: true,
    discoveryExecutionManifest: true,
    discoveryModelExecution: false,
    paidTranscription: false,
    independentJudgmentExecution: false,
    audioVerification: false,
    adjudicationExecution: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  }
};

if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(PREPARATION_PATH, jsonBytes(preparation));
}

console.log(JSON.stringify({
  status: preparation.status,
  debates: contexts.map((context) => ({
    debateNumber: context.debateNumber,
    sourceComplexityBand: context.sourceComplexityBand,
    sourceEvents: context.sourceEvents,
    chunks: context.chunks.length,
    maximumCopiedInputKilobytes: Math.round(Math.max(...context.chunks.map((chunk) => chunk.copiedInputBytes)) / 1000)
  })),
  totals: preparation.totals,
  nextAuthorized: "discovery-execution-manifest",
  modelExecutionAuthorized: false,
  productionMutationAuthorized: false
}, null, 2));
