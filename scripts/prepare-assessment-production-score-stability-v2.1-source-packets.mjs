#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildProductionCanarySourcePacket } from "./lib/assessment-production-canary-packets.mjs";
import { makeV422112DiscoverySchema } from "./lib/v422112-simplified-discovery.mjs";
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
  "docs/assessment-production/score-stability-v2.1-validation-cohort";
const ROOT = `${VALIDATION_ROOT}/source-preparation`;
const PROTOCOL_ID =
  "assessment-production-score-stability-v2.1-fresh-validation-source-preparation";
const CACHE_VERSION = "assessment-production-score-stability-v2.1-fresh-validation";
const CACHE_LEDGER_ROOT = `.assessment-cache/compact-ledgers/${CACHE_VERSION}`;
const CACHE_PARTITION_ROOT = `.assessment-cache/partition-ledgers/${CACHE_VERSION}`;
const MASTER_MANIFEST = `${VALIDATION_ROOT}/validation-manifest.json`;
const SELECTION = `${VALIDATION_ROOT}/selection.json`;
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const PACKET_WORKFLOW = "docs/assessment-production-canary-packet-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const DISCOVERY_MANUAL =
  "docs/calibration/v4.2.21.12/simplified-partition-discovery/manual.md";
const CANDIDATE_SHARDED_GUIDE =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-candidate-sharded-development/candidate-sharded-inventory-guide.md";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const SCRIPT =
  "scripts/prepare-assessment-production-score-stability-v2.1-source-packets.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.1-source-packets.mjs";
const SOURCE_FILES = [
  MASTER_MANIFEST,
  SELECTION,
  PRODUCTION_MANIFEST,
  PRODUCTION_WORKFLOW,
  PACKET_WORKFLOW,
  READINESS_WORKFLOW,
  DISCOVERY_MANUAL,
  CANDIDATE_SHARDED_GUIDE,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/lib/v422112-simplified-discovery.mjs",
  "scripts/lib/v424-source-classification.mjs",
  "scripts/lib/assessment-production-canary-packets.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs",
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

const [masterBytes, selectionBytes, productionManifestBytes, manualBytes] =
  await Promise.all([
    readFile(MASTER_MANIFEST),
    readFile(SELECTION),
    readFile(PRODUCTION_MANIFEST),
    readFile(DISCOVERY_MANUAL),
  ]);
const master = JSON.parse(masterBytes);
const selection = JSON.parse(selectionBytes);
const productionManifest = JSON.parse(productionManifestBytes);
assertV4(
  master.status ===
      "frozen-fresh-disjoint-ten-debate-score-stability-v2.1-validation" &&
    master.authorization.sourcePreparationPacketAndSchemaPreparation === true &&
    master.authorization.discoveryExecutionManifestPreparation === false &&
    master.authorization.discoveryModelExecution === false &&
    master.authorization.inventoryModelExecution === false &&
    master.authorization.independentJudgmentModelExecution === false &&
    master.authorization.paidTranscription === false &&
    master.authorization.scoreDerivation === false &&
    master.authorization.policyPromotion === false &&
    master.authorization.productionMutation === false,
  "v2.1 validation manifest does not authorize source preparation"
);
assertV4(
  master.model.label === "5.6 Sol" &&
    master.model.slug === "gpt-5.6-sol" &&
    master.model.reasoningEffort === "low" &&
    master.model.authentication === "ChatGPT subscription" &&
    master.currentCanaryDisposition.reclassified === false &&
    master.priorV2ValidationDisposition.gatesPassed === 0 &&
    master.proposedPolicy.version === "v2.1-proposal" &&
    master.proposedPolicy.everyIntegerRoundedTieAccepted === true &&
    master.proposedPolicy.promoted === false,
  "frozen model or failed-canary/policy disposition drifted"
);
assertV4(
  selection.status ===
      "fresh-disjoint-v2.1-ten-debate-cohort-source-gate-passed" &&
    selection.selected.length === 10 &&
    selection.authorization.candidateShardedPreparation === true &&
    selection.authorization.discoveryModelExecution === false &&
    selection.authorization.paidTranscription === false,
  "v2.1 cohort selection drifted"
);
assertV4(
  productionManifest.status ===
      "frozen-cohort-pending-ten-debate-canary-selection" &&
    productionManifest.model.slug === "gpt-5.6-sol" &&
    productionManifest.model.reasoningEffort === "low" &&
    productionManifest.model.authentication === "ChatGPT subscription",
  "production corpus manifest drifted"
);
assertV4(
  master.cohort.debates.length === 10 &&
    master.cohort.debates.every((debate, index) => {
      const selected = selection.selected[index];
      return (
        debate.debateNumber === selected.debateNumber &&
        debate.debateId === selected.debateId &&
        debate.videoId === selected.videoId &&
        debate.eventCount === selected.eventCount
      );
    }),
  "validation manifest cohort drifted from selection"
);
for (const [file, digest] of Object.entries(master.sourceHashes)) {
  await verifiedBytes(file, digest, `master source ${file}`);
}
if (shouldWrite) {
  await Promise.all([
    mustNotExist(ROOT),
    mustNotExist(CACHE_LEDGER_ROOT),
    mustNotExist(CACHE_PARTITION_ROOT),
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
    transportRoute: "partitioned-discovery",
  };
  validateV42219PartitionPlan(plan, built.sourceLedgerBytes);
  const planPath = `${ROOT}/plans/debate-${selected.debateNumber}.json`;
  const planBytes = jsonBytes(plan);
  const packet = structuredClone(built.packet);
  packet.schemaVersion =
    "1.0-score-stability-v2.1-validation-score-blind-source-packet";
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
    const chunkLedgerPath =
      `${CACHE_PARTITION_ROOT}/debate-${selected.debateNumber}/${chunk.chunkId}.jsonl`;
    const schemaPath =
      `${ROOT}/schemas/debate-${selected.debateNumber}-${chunk.chunkId}.schema.json`;
    const schema = makeV422112DiscoverySchema({ packet, chunk });
    const span = schema.properties.candidates.items.properties.sourceSpan.properties;
    const speakerAllowlist =
      schema.properties.candidates.items.properties.speaker.enum;
    assertV4(
      span.startEvent.minimum === chunk.coreStartEvent &&
        span.startEvent.maximum === chunk.coreEndEvent &&
        span.endEvent.minimum === chunk.contextStartEvent &&
        span.endEvent.maximum === chunk.contextEndEvent,
      `${selected.debateNumber}/${chunk.chunkId}: ownership schema mismatch`
    );
    assertV4(
      speakerAllowlist.length === 2 &&
        speakerAllowlist.every((speaker) => speakers.includes(speaker)),
      `${selected.debateNumber}/${chunk.chunkId}: speaker allowlist mismatch`
    );
    const schemaBytes = jsonBytes(schema);
    pendingWrites.push(
      { file: chunkLedgerPath, bytes: chunkBytes },
      { file: schemaPath, bytes: schemaBytes }
    );
    chunks.push({
      ...chunk,
      chunkLedgerPath,
      chunkLedgerSha256: sha256(chunkBytes),
      schemaPath,
      schemaSha256: sha256(schemaBytes),
      schemaOwnershipBoundsEnforced: true,
      schemaSpeakerAllowlistEnforced: true,
      copiedInputBytes:
        manualBytes.length +
        packetBytes.length +
        schemaBytes.length +
        chunkBytes.length,
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
    "1.0-score-stability-v2.1-fresh-validation-source-preparation",
  protocolId: PROTOCOL_ID,
  status: shouldWrite
    ? "fresh-ten-debate-v2.1-validation-source-and-discovery-packets-prepared"
    : "preview",
  preparedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  currentCanaryDisposition: structuredClone(master.currentCanaryDisposition),
  priorV2ValidationDisposition: structuredClone(
    master.priorV2ValidationDisposition
  ),
  proposedPolicy: {
    version: master.proposedPolicy.version,
    everyIntegerRoundedTieAccepted: true,
    promoted: false,
  },
  candidateShardedInventory: structuredClone(master.candidateShardedInventory),
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
    candidateEndAvailableContextBounds: true,
    deterministicValidatorRetained: true,
    frozenDyadicSpeakerAllowlist: true,
    stagingOnlyCalibrationFlagRequired: true,
  },
  model: {
    ...structuredClone(master.model),
    meteredApiCostUsdMaximum: 0,
  },
  inputs: {
    validationManifest: MASTER_MANIFEST,
    selection: SELECTION,
    productionManifest: PRODUCTION_MANIFEST,
    productionWorkflow: PRODUCTION_WORKFLOW,
    packetWorkflow: PACKET_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW,
    discoveryManual: DISCOVERY_MANUAL,
    candidateShardedGuide: CANDIDATE_SHARDED_GUIDE,
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
    copiedDiscoveryInputBytes: allChunks.reduce(
      (sum, chunk) => sum + chunk.copiedInputBytes,
      0
    ),
    maximumCopiedInputBytes: Math.max(
      ...allChunks.map((chunk) => chunk.copiedInputBytes)
    ),
    ownershipBoundedSchemas: allChunks.filter(
      (chunk) => chunk.schemaOwnershipBoundsEnforced
    ).length,
    speakerAllowlistedSchemas: allChunks.filter(
      (chunk) => chunk.schemaSpeakerAllowlistEnforced
    ).length,
    modelContextsExecuted: 0,
    audioCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  stopRules: structuredClone(master.stopRules),
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
      currentCanaryStillFailed: true,
      priorV2ValidationPassed: false,
      proposedPolicyPromoted: false,
      modelExecutionAuthorized: false,
      nextAuthorized: "discovery-execution-manifest-preparation-only",
    },
    null,
    2
  )
);
