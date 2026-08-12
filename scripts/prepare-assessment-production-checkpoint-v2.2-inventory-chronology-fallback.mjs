#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";

import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
import {
  makeV422116InventorySchema,
  V422116_MODEL,
} from "./lib/v422116-decomposed-consensus.mjs";
import {
  buildV4221162InventoryCandidateTransport,
  validateV4221162InventoryCandidateTransport,
} from "./lib/v4221162-inventory-transport.mjs";
import { auditDecomposedStrictSchema } from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";
import {
  buildCandidateCensus,
  buildCandidateShardedInventoryPlanSchema,
  buildSideCandidateEvidenceTransport,
  validateCandidateShardedInventoryPlan,
} from "./lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";
import {
  V212_CANDIDATE_SHARDED_INVENTORY,
  V212_INVENTORY_COLUMN_ORDER,
  buildMaximumCandidateShardedPlanFixture,
  buildV212InventoryEvidenceBundle,
  buildV212LosslessColumnarCandidateTransport,
  decodeV212LosslessColumnarCandidateTransport,
  validateV212InventoryEvidenceBundle,
  validateV212LosslessColumnarCandidateTransport,
} from "./lib/assessment-production-score-stability-v2.1.2-inventory-preparation.mjs";
import {
  CHRONOLOGY_FALLBACK_INVENTORY,
  buildChronologyFallbackSideSelectionSchema,
} from "./lib/assessment-production-score-stability-v2.1.2-inventory-chronology-fallback.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const CHECKPOINT_ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1";
const ROOT = `${CHECKPOINT_ROOT}/inventory-chronology-fallback`;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const GUIDE = `${ROOT}/chronology-fallback-inventory-guide.md`;
const DISCOVERY_ANALYSIS = `${CHECKPOINT_ROOT}/discovery/analysis.json`;
const SOURCE_PREPARATION = `${CHECKPOINT_ROOT}/source-preparation/preparation-manifest.json`;
const MASTER_MANIFEST = `${CHECKPOINT_ROOT}/master-manifest.json`;
const SUCCESSOR_DEVELOPMENT =
  "docs/assessment-production/score-stability-v2.1.3-chronology-fallback-development/development-analysis.json";
const ACTIVE_POLICY =
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const RUBRIC = "docs/reassessment-rubric-v2.1.md";
const MANUAL =
  "docs/calibration/v4.2.21.16/decomposed-consensus-contract/inventory-manual.md";
const SCRIPT =
  "scripts/prepare-assessment-production-checkpoint-v2.2-inventory-chronology-fallback.mjs";
const TEST =
  "scripts/test-assessment-production-checkpoint-v2.2-inventory-chronology-fallback-preparation.mjs";
const PROTOCOL_ID =
  "assessment-production-checkpoint-v2.2-1-chronology-fallback-inventory";
const SOURCE_PACKET_VERSION =
  "1.0-production-checkpoint-v2.2-chronology-fallback-inventory-source-packet";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const prettyJsonBytes = (value) =>
  Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const compactJsonBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

async function mustNotExist(file) {
  assertV4(
    !(await exists(file)),
    `${file} already exists; inventory preparation is immutable`
  );
}

function buildInventorySourcePacket(sourcePacket) {
  assertV4(
    sourcePacket?.schemaVersion ===
      "1.0-production-checkpoint-v2.2-score-blind-source-packet" &&
      sourcePacket.protocolId ===
        "assessment-production-checkpoint-v2.2-1-source-preparation" &&
      sourcePacket.modelInputBoundary?.scoreBlindDiscoveryOnly === true &&
      sourcePacket.modelInputBoundary?.productionCanary === true &&
      sourcePacket.modelInputBoundary?.developmentValidationOnly === false,
    "production checkpoint source packet is unavailable"
  );
  return {
    ...structuredClone(sourcePacket),
    schemaVersion: SOURCE_PACKET_VERSION,
    protocolId: PROTOCOL_ID,
    modelInputBoundary: {
      candidateShardedInventoryOnly: true,
      chronologyFallbackRequired: true,
      productionCanary: true,
      developmentValidationOnly: false,
      stagingOnlyIntermediateOutput: true,
      scoreBlind: true,
      candidateCensusAvailableToPlanner: true,
      candidateEvidenceExcerptsUnavailableToPlanner: true,
      candidateSelectionUnavailableToPlanner: true,
      plannerWritableDomainsLimitedToRoutesAndSections: true,
      immutableAcceptedPlanRequiredBeforeSidePacketFreeze: true,
      completeSideCandidateEvidenceAvailableOnlyToCorrespondingSelector: true,
      otherSideCandidateEvidenceUnavailableToSelector: true,
      otherSideSelectorOutputUnavailableToSelector: true,
      inventoryPlanExecutionMetadataUnavailableToSelector: true,
      preferredMoveKindAndConstructiveFallbackRequiredFromSelector: true,
      fallbackConditionAppliedOnlyByRepository: true,
      failedProductionCanaryOutputsUnavailable: true,
      validationCohortOutputsUnavailable: true,
      legacyAssessmentsUnavailable: true,
      priorJudgmentsUnavailable: true,
      ratingsUnavailable: true,
      scoresAndCalculatedTotalsUnavailable: true,
      winnersTagsAndPublicationProseUnavailable: true,
      otherDebatesUnavailable: true,
    },
  };
}

function makePlanPacket({
  debateNumber,
  debateId,
  sourcePacket,
  sourcePacketBytes,
  candidateCensus,
  candidateCensusBytes,
  planSchema,
  planSchemaBytes,
  guideBytes,
  manualBytes,
  planOutput,
}) {
  const copiedInputBytes =
    sourcePacketBytes.length +
    candidateCensusBytes.length +
    planSchemaBytes.length +
    guideBytes.length +
    manualBytes.length;
  return {
    schemaVersion:
      "1.0-production-checkpoint-v2.2-candidate-census-plan-packet",
    protocolId: PROTOCOL_ID,
    stage: "candidate-census-plan",
    debateNumber,
    debateId,
    model: {
      label: "5.6 Sol",
      slug: "gpt-5.6-sol",
      reasoningEffort: "low",
      authentication: "ChatGPT subscription",
    },
    isolation: {
      freshContextRequired: true,
      oneDebateOnly: true,
      scoreBlind: true,
      candidateEvidenceExcerptsUnavailable: true,
      candidateSelectionUnavailable: true,
      priorAndOtherJudgmentsUnavailable: true,
      failedProductionCanaryOutputsUnavailable: true,
      validationCohortOutputsUnavailable: true,
      legacyAssessmentsScoresWinnersTagsAndPublicationProseUnavailable: true,
    },
    copiedInputs: [
      {
        role: "inventory-source-packet",
        path: sourcePacket,
        sha256: sha256(sourcePacketBytes),
        bytes: sourcePacketBytes.length,
      },
      {
        role: "complete-candidate-census",
        path: candidateCensus,
        sha256: sha256(candidateCensusBytes),
        bytes: candidateCensusBytes.length,
      },
      {
        role: "chronology-fallback-inventory-guide",
        path: GUIDE,
        sha256: sha256(guideBytes),
        bytes: guideBytes.length,
      },
      {
        role: "inventory-manual",
        path: MANUAL,
        sha256: sha256(manualBytes),
        bytes: manualBytes.length,
      },
      {
        role: "strict-output-schema",
        path: planSchema,
        sha256: sha256(planSchemaBytes),
        bytes: planSchemaBytes.length,
      },
    ],
    copiedInputBytes,
    maximumCopiedInputBytes:
      V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
    writableDomains: ["routes", "sections"],
    output: planOutput,
    attemptsMaximum: 1,
    retries: 0,
    timeoutExtensions: 0,
    modelExecutionAuthorized: false,
  };
}

const [
  discoveryAnalysisBytes,
  sourcePreparationBytes,
  masterManifestBytes,
  successorDevelopmentBytes,
  activePolicyBytes,
  guideBytes,
  manualBytes,
] = await Promise.all([
  readFile(DISCOVERY_ANALYSIS),
  readFile(SOURCE_PREPARATION),
  readFile(MASTER_MANIFEST),
  readFile(SUCCESSOR_DEVELOPMENT),
  readFile(ACTIVE_POLICY),
  readFile(GUIDE),
  readFile(MANUAL),
]);
const discoveryAnalysis = JSON.parse(discoveryAnalysisBytes);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
const masterManifest = JSON.parse(masterManifestBytes);
const successorDevelopment = JSON.parse(successorDevelopmentBytes);
const activePolicy = JSON.parse(activePolicyBytes);

assertV4(
  discoveryAnalysis.status ===
      "production-checkpoint-v2.2-discovery-passed-chronology-fallback-inventory-preparation-authorized" &&
    discoveryAnalysis.productionCanary === true &&
    discoveryAnalysis.developmentValidationOnly === false &&
    discoveryAnalysis.stagingOnly === true &&
    discoveryAnalysis.authorization?.chronologyFallbackInventoryPreparation ===
      true &&
    discoveryAnalysis.authorization?.inventoryExecutionActivation === false &&
    discoveryAnalysis.authorization?.inventoryModelExecution === false &&
    discoveryAnalysis.authorization?.independentJudgmentPacketPreparation ===
      false &&
    discoveryAnalysis.authorization?.scoreDerivation === false &&
    discoveryAnalysis.authorization?.productionMutation === false &&
    discoveryAnalysis.totals?.debates === 10 &&
    discoveryAnalysis.totals?.candidates === 332 &&
    discoveryAnalysis.totals?.pro === 175 &&
    discoveryAnalysis.totals?.con === 157 &&
    discoveryAnalysis.totals?.belowHighAttributionCandidates === 0 &&
    discoveryAnalysis.audit?.validContexts === 36 &&
    discoveryAnalysis.audit?.invalidContexts === 0 &&
    discoveryAnalysis.audit?.allDiscoveredCandidatesTransported === true &&
    discoveryAnalysis.audit?.silentSemanticDeduplication === false &&
    discoveryAnalysis.audit?.automaticSemanticCorrection === false &&
    discoveryAnalysis.audit?.failedCanaryV1Reclassified === false &&
    discoveryAnalysis.audit?.priorValidationCohortsReclassified === false &&
    discoveryAnalysis.audit?.activePolicyVersion === "v2.2" &&
    discoveryAnalysis.nextAuthorizedAction ===
      "prepare-production-checkpoint-v2.2-chronology-fallback-inventory-packets-model-free-only",
  "passed production checkpoint discovery does not authorize preparation"
);
assertV4(
  sourcePreparation.status ===
      "production-checkpoint-v2.2-ten-complete-score-blind-source-packets-prepared" &&
    sourcePreparation.productionCanary === true &&
    sourcePreparation.developmentValidationOnly === false &&
    sourcePreparation.contexts?.length === 10 &&
    sourcePreparation.model?.label === "5.6 Sol" &&
    sourcePreparation.model?.slug === "gpt-5.6-sol" &&
    sourcePreparation.model?.reasoningEffort === "low" &&
    sourcePreparation.model?.authentication === "ChatGPT subscription",
  "production source preparation or model boundary drifted"
);
assertV4(
  masterManifest.protocolId === "assessment-production-checkpoint-v2.2-1" &&
    masterManifest.productionCanary === true &&
    masterManifest.developmentValidationOnly === false &&
    masterManifest.stagingOnly === true &&
    masterManifest.cohort?.exactDebateCount === 10 &&
    masterManifest.model?.label === "5.6 Sol" &&
    masterManifest.model?.slug === "gpt-5.6-sol" &&
    masterManifest.model?.reasoningEffort === "low" &&
    masterManifest.model?.authentication === "ChatGPT subscription" &&
    masterManifest.scheduling?.stageConcurrency?.inventory === 2 &&
    masterManifest.activeScoreStabilityPolicy?.version === "v2.2" &&
    masterManifest.activeScoreStabilityPolicy?.scorePassesMaximum === 1,
  "production master boundary drifted"
);
assertV4(
  activePolicy.status === "active-production-score-stability-policy-v2.2" &&
    activePolicy.activePolicy?.version === "v2.2" &&
    activePolicy.activePolicy?.winnerRule?.agreedProMayPublish?.includes("tie") &&
    activePolicy.activePolicy?.winnerRule?.agreedConMayPublish?.includes("tie") &&
    activePolicy.productionScoreControl?.thresholdMutationAllowed === false &&
    activePolicy.productionScoreControl?.scoreCalculationPasses === 1,
  "active v2.2 score-stability policy drifted"
);
assertV4(
  successorDevelopment.status ===
      "chronology-fallback-successor-development-passed-fresh-disjoint-cohort-selection-authorized" &&
    successorDevelopment.successorContract?.protocolId ===
      CHRONOLOGY_FALLBACK_INVENTORY.protocolId &&
    successorDevelopment.successorContract?.planAndSideIsolationPreserved ===
      true &&
    successorDevelopment.successorContract?.scoreFieldsAvailable === false,
  "validated chronology-fallback contract drifted"
);
if (shouldWrite) await mustNotExist(PREPARATION);

const contexts = [];
const pendingWrites = [];
for (const discovered of discoveryAnalysis.debates) {
  const source = sourcePreparation.contexts.find(
    (context) => context.debateNumber === discovered.debateNumber
  );
  const production = masterManifest.cohort.debates.find(
    (debate) => debate.debateNumber === discovered.debateNumber
  );
  assertV4(
    source &&
      production &&
      source.debateId === discovered.debateId &&
      production.debateId === discovered.debateId &&
      production.sides?.pro?.speakers?.length === 1 &&
      production.sides?.con?.speakers?.length === 1,
    `${discovered.debateNumber}: checkpoint identity or dyadic boundary drifted`
  );

  const [
    candidateBundleBytes,
    sparseBytes,
    sourcePacketBytes,
    eventsBytes,
    ledgerBytes,
    transcriptBytes,
    localManifestBytes,
  ] = await Promise.all([
    readFile(discovered.bundlePath),
    readFile(discovered.sparsePath),
    readFile(source.packet),
    readFile(source.originalEvents),
    readFile(source.fullLedger),
    readFile(source.originalTranscript),
    readFile(source.originalManifest),
  ]);
  assertV4(
    sha256(candidateBundleBytes) === discovered.bundleSha256 &&
      sha256(sparseBytes) === discovered.sparseSha256 &&
      sha256(sourcePacketBytes) === source.packetSha256 &&
      sha256(eventsBytes) === source.originalEventsSha256 &&
      sha256(ledgerBytes) === source.fullLedgerSha256 &&
      sha256(transcriptBytes) === source.originalTranscriptSha256 &&
      sha256(localManifestBytes) === source.originalManifestSha256 &&
      sha256(transcriptBytes) === production.sourceChain.transcriptSha256 &&
      sha256(eventsBytes) === production.sourceChain.eventsSha256 &&
      sha256(localManifestBytes) === production.sourceChain.manifestSha256,
    `${discovered.debateNumber}: frozen source or discovery hash drifted`
  );

  const candidateBundle = JSON.parse(candidateBundleBytes);
  const sourcePacket = JSON.parse(sourcePacketBytes);
  const eventsDocument = JSON.parse(eventsBytes);
  assertV4(
    candidateBundle.candidateCount === discovered.candidates &&
      candidateBundle.candidates.length === discovered.candidates &&
      candidateBundle.completeSourceDiscovery
        ?.repositoryDerivedLexicalTokenCounts === true &&
      candidateBundle.completeSourceDiscovery
        ?.modelAuthoredLexicalTokenCounts === false &&
      candidateBundle.completeSourceDiscovery?.minimumLexicalTokens === 12,
    `${discovered.debateNumber}: candidate contract drifted`
  );

  const inventorySourcePacket = buildInventorySourcePacket(sourcePacket);
  const inventorySourcePacketBytes = prettyJsonBytes(inventorySourcePacket);
  const inventorySourcePacketPath =
    `${ROOT}/source-packets/debate-${discovered.debateNumber}.json`;
  const evidenceBundle = buildV212InventoryEvidenceBundle(
    candidateBundle,
    eventsDocument
  );
  validateV212InventoryEvidenceBundle(
    evidenceBundle,
    candidateBundle,
    eventsDocument
  );
  const evidenceBundleBytes = prettyJsonBytes(evidenceBundle);
  const evidenceBundlePath =
    `${ROOT}/candidate-evidence/debate-${discovered.debateNumber}.json`;
  const objectTransport =
    buildV4221162InventoryCandidateTransport(evidenceBundle);
  validateV4221162InventoryCandidateTransport(objectTransport, evidenceBundle);
  const legacySchema = makeV422116InventorySchema({
    evidenceBundle: objectTransport,
  });
  const legacySchemaBytes = compactJsonBytes(legacySchema);
  const legacySchemaPath =
    `${ROOT}/schemas/compiler/debate-${discovered.debateNumber}.schema.json`;
  const fullTransport =
    buildV212LosslessColumnarCandidateTransport(objectTransport);
  validateV212LosslessColumnarCandidateTransport(fullTransport, objectTransport);
  assertV4(
    isDeepStrictEqual(
      decodeV212LosslessColumnarCandidateTransport(fullTransport),
      objectTransport
    ),
    `${discovered.debateNumber}: candidate transport round trip drifted`
  );
  const fullTransportBytes = compactJsonBytes(fullTransport);
  const fullTransportPath =
    `${ROOT}/transports/full/debate-${discovered.debateNumber}.json`;
  const candidateCensus = buildCandidateCensus(fullTransport);
  const candidateCensusBytes = compactJsonBytes(candidateCensus);
  const candidateCensusPath =
    `${ROOT}/transports/census/debate-${discovered.debateNumber}.json`;
  const planSchema = buildCandidateShardedInventoryPlanSchema({
    legacySchema,
    candidateTransport: fullTransport,
    candidateCensus,
  });
  const planSchemaAudit = auditDecomposedStrictSchema(planSchema);
  const planSchemaBytes = compactJsonBytes(planSchema);
  const planSchemaPath =
    `${ROOT}/schemas/plans/debate-${discovered.debateNumber}.schema.json`;
  const planOutput = `${ROOT}/plans/debate-${discovered.debateNumber}.json`;

  const maximumPlan = buildMaximumCandidateShardedPlanFixture({
    legacySchema,
    candidateTransport: fullTransport,
  });
  validateCandidateShardedInventoryPlan({
    plan: maximumPlan,
    legacySchema,
    candidateTransport: fullTransport,
    candidateCensus,
  });
  const maximumPlanBytes = compactJsonBytes(maximumPlan);
  const sideAssets = [];
  for (const side of ["pro", "con"]) {
    const sideTransport = buildSideCandidateEvidenceTransport(
      fullTransport,
      side
    );
    const sideTransportBytes = compactJsonBytes(sideTransport);
    const sideTransportPath =
      `${ROOT}/transports/sides/debate-${discovered.debateNumber}-${side}.json`;
    const maximumPlanSchema = buildChronologyFallbackSideSelectionSchema({
      side,
      legacySchema,
      candidateTransport: fullTransport,
      sideCandidateTransport: sideTransport,
      candidateCensus,
      plan: maximumPlan,
    });
    const maximumPlanSchemaAudit =
      auditDecomposedStrictSchema(maximumPlanSchema);
    const maximumPlanSchemaBytes = compactJsonBytes(maximumPlanSchema);
    const maximumPlanSchemaPath =
      `${ROOT}/schemas/side-prototypes/maximum-plan-debate-${discovered.debateNumber}-${side}.schema.json`;
    const sideIndex = fullTransport.columnOrder.indexOf("side");
    const candidateCount = fullTransport.candidateRows.filter(
      (row) => row[sideIndex] === side
    ).length;
    const maximumCopiedInputBytes =
      manualBytes.length +
      guideBytes.length +
      inventorySourcePacketBytes.length +
      sideTransportBytes.length +
      maximumPlanBytes.length +
      maximumPlanSchemaBytes.length;
    assertV4(
      maximumPlanSchemaAudit.nullableCandidateProperties === candidateCount &&
        maximumCopiedInputBytes <=
          V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
      `${discovered.debateNumber}/${side}: prototype or size bound drifted`
    );
    pendingWrites.push(
      { file: sideTransportPath, bytes: sideTransportBytes },
      { file: maximumPlanSchemaPath, bytes: maximumPlanSchemaBytes }
    );
    sideAssets.push({
      side,
      candidates: candidateCount,
      transport: sideTransportPath,
      transportSha256: sha256(sideTransportBytes),
      transportBytes: sideTransportBytes.length,
      maximumPlanSchemaPrototype: maximumPlanSchemaPath,
      maximumPlanSchemaPrototypeSha256: sha256(maximumPlanSchemaBytes),
      maximumPlanSchemaPrototypeBytes: maximumPlanSchemaBytes.length,
      maximumPlanCopiedInputBytes: maximumCopiedInputBytes,
      preferredMoveKindRequired: true,
      constructiveOrphanFallbackRequired: true,
      fallbackConditionRepositoryOwned: true,
      exactSchemaDeferredUntilAcceptedPlan: true,
      exactPacketDeferredUntilAcceptedPlan: true,
      prototypeExecutable: false,
      output:
        `${ROOT}/side-selections/debate-${discovered.debateNumber}-${side}.json`,
    });
  }

  const planPacketPath =
    `${ROOT}/packets/plans/debate-${discovered.debateNumber}.json`;
  const planPacket = makePlanPacket({
    debateNumber: discovered.debateNumber,
    debateId: discovered.debateId,
    sourcePacket: inventorySourcePacketPath,
    sourcePacketBytes: inventorySourcePacketBytes,
    candidateCensus: candidateCensusPath,
    candidateCensusBytes,
    planSchema: planSchemaPath,
    planSchemaBytes,
    guideBytes,
    manualBytes,
    planOutput,
  });
  const planPacketBytes = prettyJsonBytes(planPacket);
  assertV4(
    planSchemaAudit.nullableCandidateProperties === 0 &&
      planPacket.copiedInputBytes <=
        V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes &&
      canonicalJson(JSON.parse(candidateCensusBytes)) ===
        canonicalJson(candidateCensus) &&
      canonicalJson(JSON.parse(planSchemaBytes)) === canonicalJson(planSchema),
    `${discovered.debateNumber}: planner packet drifted`
  );

  for (const file of [
    inventorySourcePacketPath,
    evidenceBundlePath,
    fullTransportPath,
    candidateCensusPath,
    legacySchemaPath,
    planSchemaPath,
    planPacketPath,
    ...sideAssets.flatMap((asset) => [
      asset.transport,
      asset.maximumPlanSchemaPrototype,
    ]),
  ]) {
    if (shouldWrite) await mustNotExist(file);
  }
  pendingWrites.push(
    { file: inventorySourcePacketPath, bytes: inventorySourcePacketBytes },
    { file: evidenceBundlePath, bytes: evidenceBundleBytes },
    { file: fullTransportPath, bytes: fullTransportBytes },
    { file: candidateCensusPath, bytes: candidateCensusBytes },
    { file: legacySchemaPath, bytes: legacySchemaBytes },
    { file: planSchemaPath, bytes: planSchemaBytes },
    { file: planPacketPath, bytes: planPacketBytes }
  );

  contexts.push({
    debateNumber: discovered.debateNumber,
    debateId: discovered.debateId,
    family: discovered.family,
    sourceComplexityBand: discovered.sourceComplexityBand,
    inventorySourcePacket: inventorySourcePacketPath,
    inventorySourcePacketSha256: sha256(inventorySourcePacketBytes),
    inventorySourcePacketBytes: inventorySourcePacketBytes.length,
    discoveryCandidateBundle: discovered.bundlePath,
    discoveryCandidateBundleSha256: sha256(candidateBundleBytes),
    discoverySparseContext: discovered.sparsePath,
    discoverySparseContextSha256: sha256(sparseBytes),
    validatorCandidateEvidenceBundle: evidenceBundlePath,
    validatorCandidateEvidenceBundleSha256: sha256(evidenceBundleBytes),
    validatorCandidateEvidenceBundleBytes: evidenceBundleBytes.length,
    fullCandidateTransport: fullTransportPath,
    fullCandidateTransportSha256: sha256(fullTransportBytes),
    fullCandidateTransportBytes: fullTransportBytes.length,
    candidateCensus: candidateCensusPath,
    candidateCensusSha256: sha256(candidateCensusBytes),
    candidateCensusBytes: candidateCensusBytes.length,
    compilerSchema: legacySchemaPath,
    compilerSchemaSha256: sha256(legacySchemaBytes),
    planSchema: planSchemaPath,
    planSchemaSha256: sha256(planSchemaBytes),
    planSchemaBytes: planSchemaBytes.length,
    planPacket: planPacketPath,
    planPacketSha256: sha256(planPacketBytes),
    planPacketBytes: planPacketBytes.length,
    planCopiedInputBytes: planPacket.copiedInputBytes,
    planOutput,
    sideAssets,
    originalTranscript: source.originalTranscript,
    originalTranscriptSha256: sha256(transcriptBytes),
    originalEvents: source.originalEvents,
    originalEventsSha256: sha256(eventsBytes),
    originalManifest: source.originalManifest,
    originalManifestSha256: sha256(localManifestBytes),
    fullLedger: source.fullLedger,
    fullLedgerSha256: sha256(ledgerBytes),
    candidates: fullTransport.candidateCount,
    proCandidates: sideAssets.find((asset) => asset.side === "pro").candidates,
    conCandidates: sideAssets.find((asset) => asset.side === "con").candidates,
    belowHighAttributionCandidates: evidenceBundle.candidates.filter(
      (candidate) => candidate.attributionConfidence !== "high"
    ).length,
    plannedContexts: 3,
    exactPlannerPacketFrozen: true,
    exactSidePacketsFrozen: false,
    inventoryProposalOutput:
      `${ROOT}/inventory-proposals/debate-${discovered.debateNumber}.json`,
    lockedInventoryOutput:
      `${ROOT}/locked-inventories/debate-${discovered.debateNumber}.json`,
    validationOutput:
      `${ROOT}/validations/debate-${discovered.debateNumber}.json`,
    provenanceOutput:
      `${ROOT}/provenance/debate-${discovered.debateNumber}.json`,
  });
}

assertV4(
  contexts.length === 10 &&
    contexts.reduce((sum, context) => sum + context.candidates, 0) === 332 &&
    contexts.reduce((sum, context) => sum + context.proCandidates, 0) ===
      175 &&
    contexts.reduce((sum, context) => sum + context.conCandidates, 0) ===
      157 &&
    contexts.reduce(
      (sum, context) => sum + context.belowHighAttributionCandidates,
      0
    ) === 0 &&
    contexts.every(
      (context) =>
        context.proCandidates >= 4 &&
        context.conCandidates >= 4 &&
        context.exactPlannerPacketFrozen === true &&
        context.exactSidePacketsFrozen === false
    ),
  "production checkpoint totals or packet state drifted"
);

const sourceFiles = [
  DISCOVERY_ANALYSIS,
  SOURCE_PREPARATION,
  MASTER_MANIFEST,
  SUCCESSOR_DEVELOPMENT,
  ACTIVE_POLICY,
  PRODUCTION_WORKFLOW,
  RUBRIC,
  MANUAL,
  GUIDE,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v422115-candidate-evidence-transport.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  "scripts/lib/v4221162-inventory-transport.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.2-discovery.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.2-inventory-preparation.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.2-inventory-chronology-fallback.mjs",
  SCRIPT,
  TEST,
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const futureOutputPaths = contexts.flatMap((context) => [
  context.planOutput,
  ...context.sideAssets.map((asset) => asset.output),
  context.inventoryProposalOutput,
  context.lockedInventoryOutput,
  context.validationOutput,
  context.provenanceOutput,
]);
assertV4(
  (await Promise.all(futureOutputPaths.map(exists))).every(
    (present) => present === false
  ),
  "future inventory model or compiled output already exists"
);

const preparation = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-chronology-fallback-inventory-preparation",
  protocolId: PROTOCOL_ID,
  sideSelectionProtocolId: CHRONOLOGY_FALLBACK_INVENTORY.protocolId,
  status: shouldWrite
    ? "production-checkpoint-v2.2-chronology-fallback-source-assets-and-ten-planner-packets-frozen"
    : "preview",
  preparedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  productionCanary: true,
  developmentValidationOnly: false,
  stagingOnly: true,
  AIOnly: true,
  gateDisposition: {
    failedProductionCanaryV1PreservedFailed: true,
    failedProductionCanaryV1OutputsUsedAsModelInput: false,
    priorValidationCohortsReclassified: false,
    priorValidationCohortOutputsUsedAsModelInput: false,
    checkpointDiscoveryPassed: true,
    checkpointDiscoveryRetried: false,
    checkpointDiscoveryCandidatesChangedDuringTransport: false,
  },
  activePolicy: {
    version: "v2.2",
    promotion: ACTIVE_POLICY,
    promotionSha256: sha256(activePolicyBytes),
    agreedWinningSideMayCollapseToIntegerRoundedTie: true,
    agreedInitialTieImposesNoDirectionConstraint: true,
    numericalThresholdsChanged: false,
    scorePassesMaximum: 1,
  },
  validatedInventoryContract: {
    protocolId: CHRONOLOGY_FALLBACK_INVENTORY.protocolId,
    planAndSideIsolationPreserved: true,
    fallbackConditionRepositoryOwned: true,
    fallbackAppliedOnlyToRetainedOrphanReply: true,
    validationCohortOutputsAvailableToModels: false,
    scoreFieldsAvailable: false,
  },
  model: {
    label: V422116_MODEL.label,
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    scoreBlind: true,
    apiKeysRemovedForAnyLaterExecution: true,
    meteredApiCostUsdMaximum: 0,
  },
  scheduling: {
    inventoryConcurrencyRamp: [1, 2],
    inventoryConcurrencyMaximum: 2,
    oneAttemptPerContext: true,
    retries: 0,
    timeoutExtensions: 0,
  },
  inputs: {
    discoveryAnalysis: DISCOVERY_ANALYSIS,
    discoveryAnalysisSha256: sha256(discoveryAnalysisBytes),
    sourcePreparation: SOURCE_PREPARATION,
    sourcePreparationSha256: sha256(sourcePreparationBytes),
    masterManifest: MASTER_MANIFEST,
    masterManifestSha256: sha256(masterManifestBytes),
    validatedSuccessorDevelopment: SUCCESSOR_DEVELOPMENT,
    validatedSuccessorDevelopmentSha256: sha256(successorDevelopmentBytes),
    chronologyFallbackGuide: GUIDE,
    chronologyFallbackGuideSha256: sha256(guideBytes),
    inventoryManual: MANUAL,
    inventoryManualSha256: sha256(manualBytes),
  },
  sourceHashes,
  contexts,
  stageDesign: {
    stages: [
      "candidate-census-plan",
      "pro-candidate-evidence-selection-with-chronology-fallback",
      "con-candidate-evidence-selection-with-chronology-fallback",
    ],
    contextsPerDebate: 3,
    totalContextsPlanned: 30,
    exactPlannerPacketsFrozen: 10,
    completeSideTransportsFrozen: 20,
    maximumPlanChronologyFallbackSchemaPrototypesFrozen: 20,
    exactSidePacketsFrozen: 0,
    exactSideSchemasFrozen: 0,
    exactSidePacketFreezeRequiresAcceptedImmutablePlan: true,
    separateModelFreeSidePacketCheckpointRequired: true,
    prototypeSchemasExecutable: false,
  },
  isolation: {
    oneDebatePerContext: true,
    oneFreshContextPerStage: true,
    scoreBlind: true,
    plannerCandidateEvidenceExcerptsUnavailable: true,
    plannerCandidateSelectionUnavailable: true,
    sideSelectorsMutuallyIsolated: true,
    otherSideCandidateEvidenceUnavailable: true,
    otherSideSelectorOutputUnavailable: true,
    failedProductionCanaryOutputsUnavailable: true,
    validationCohortOutputsUnavailable: true,
    priorExecutionMetadataUnavailable: true,
    otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true,
    independentJudgmentsUnavailable: true,
    ratingsScoresWinnersTagsAndPublicationProseUnavailable: true,
  },
  transport: {
    representation: "lossless compact JSON column order plus candidate rows",
    columnOrder: [...V212_INVENTORY_COLUMN_ORDER],
    everyDiscoveredCandidateRetained: true,
    candidateOrderPreserved: true,
    semanticCandidateDownselectionPerformed: false,
    semanticCandidateCorrectionPerformed: false,
    sourceSpanTruncationPerformed: false,
    sourceExactEvidenceGeneratedDeterministically: true,
    repositoryDerivedLexicalTokenContractPreserved: true,
    modelAuthoredLexicalTokenCounts: false,
    modelAuthoredBoundedEndEventsPreserved: true,
    maximumPlannerCopiedInputBytes: Math.max(
      ...contexts.map((context) => context.planCopiedInputBytes)
    ),
    maximumSidePrototypeCopiedInputBytes: Math.max(
      ...contexts.flatMap((context) =>
        context.sideAssets.map((asset) => asset.maximumPlanCopiedInputBytes)
      )
    ),
    provenCeilingBytes:
      V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
  },
  deterministicCompilation: {
    immutablePlanHashBoundInEveryExactSideSchema: true,
    sectionIdsEnumeratedFromAcceptedPlan: true,
    sideTransportHashBoundInCorrespondingSelector: true,
    chronologyRepositoryOwned: true,
    sourceEvidenceRepositoryRerendered: true,
    priorityThenChronologyReductionRequired: true,
    maximumTwoRetainedPerSectionSide: true,
    everyDeferredNominationAudited: true,
    preferredMoveKindModelAuthored: true,
    constructiveFallbackModelAuthored: true,
    fallbackRationaleModelAuthored: true,
    fallbackAppliedOnlyToRetainedOrphanReply: true,
    missingSectionSideCoverageFailsClosed: true,
    responseTopologyAbsent: true,
    ratingsAbsent: true,
    scoresAbsent: true,
    semanticRepair: false,
  },
  audioPolicy: {
    selectedBelowHighAttributionMoveRequiresLaterVerification: true,
    mediumConfidenceAlwaysRequiresLaterVerification: true,
    discoveryBelowHighCandidates: 0,
    audioAccessedDuringPreparation: false,
  },
  stopRules: {
    ...structuredClone(sourcePreparation.stopRules),
    preparationHashMismatchBlocks: true,
    invalidPlannerOutputBlocksEntireInventoryGate: true,
    sidePacketFreezeBeforeAcceptedPlanBlocks: true,
    exactSideSchemaHashMismatchBlocks: true,
    prototypeSchemaExecutionBlocks: true,
    crossSideEvidenceContaminationBlocks: true,
    missingConstructiveFallbackBlocks: true,
    nonconstructiveFallbackBlocks: true,
    unresolvedOrphanReplyBlocksEntireInventoryGate: true,
    retryBlocks: true,
    timeoutExtensionBlocks: true,
  },
  totals: {
    debates: contexts.length,
    candidates: contexts.reduce((sum, context) => sum + context.candidates, 0),
    proCandidates: contexts.reduce(
      (sum, context) => sum + context.proCandidates,
      0
    ),
    conCandidates: contexts.reduce(
      (sum, context) => sum + context.conCandidates,
      0
    ),
    plannedModelContexts: 30,
    exactPlannerPacketsFrozen: 10,
    exactSidePacketsFrozen: 0,
    modelContextsExecuted: 0,
    audioCalls: 0,
    transcriptionCalls: 0,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  authorization: {
    deterministicValidation: true,
    candidateCensusPlanExecutionManifestPreparation: true,
    candidateCensusPlanExecutionActivation: false,
    inventoryPlanModelExecution: false,
    exactSidePacketPreparation: false,
    sideSelectorModelExecution: false,
    inventoryModelExecution: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    paidTranscription: false,
    audioVerification: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction:
    "prepare-production-checkpoint-v2.2-candidate-census-plan-execution-manifest-model-free-only",
};

if (shouldWrite) {
  for (const { file, bytes } of pendingWrites) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }
  await writeFile(PREPARATION, prettyJsonBytes(preparation));
}
console.log(
  JSON.stringify(
    {
      status: preparation.status,
      debates: contexts.map((context) => ({
        debateNumber: context.debateNumber,
        candidates: context.candidates,
        proCandidates: context.proCandidates,
        conCandidates: context.conCandidates,
        planCopiedInputBytes: context.planCopiedInputBytes,
        maximumSideCopiedInputBytes: Math.max(
          ...context.sideAssets.map(
            (asset) => asset.maximumPlanCopiedInputBytes
          )
        ),
      })),
      totals: preparation.totals,
      exactPlannerPacketsFrozen: 10,
      exactSidePacketsDeferred: 20,
      chronologyFallbackSchemaPrototypesFrozen: 20,
      modelExecutionAuthorized: false,
      scoresDerived: 0,
      nextAuthorizedAction: preparation.nextAuthorizedAction,
    },
    null,
    2
  )
);
