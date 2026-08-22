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
import {
  POST_CANARY_BATCH_06_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch06StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-06-standing-authorization.mjs";

const BATCH_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-06";
const ROOT = `${BATCH_ROOT}/inventory-candidate-sharded`;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const EXECUTION_PREPARATION = `${ROOT}/plan-execution-preparation-manifest.json`;
const VALIDATION = `${ROOT}/preparation-validation.json`;
const GUIDE = `${ROOT}/candidate-sharded-inventory-guide.md`;
const PLAN_ACTIVATION = `${ROOT}/plan-execution-activation.json`;
const PLAN_EXECUTION = `${ROOT}/plan-model-execution.json`;
const PLAN_ANALYSIS = `${ROOT}/plan-analysis.json`;
const SIDE_PACKET_PREPARATION = `${ROOT}/side-packet-preparation-manifest.json`;
const DISCOVERY_ANALYSIS = `${BATCH_ROOT}/discovery/analysis.json`;
const DISCOVERY_ACTIVATION = `${BATCH_ROOT}/discovery/execution-activation.json`;
const DISCOVERY_EXECUTION = `${BATCH_ROOT}/discovery/model-execution.json`;
const SOURCE_PREPARATION = `${BATCH_ROOT}/source-preparation/preparation-manifest.json`;
const SOURCE_PREPARATION_VALIDATION = `${BATCH_ROOT}/source-preparation/validation.json`;
const SELECTION = `${BATCH_ROOT}/selection.json`;
const SUCCESSOR_DEVELOPMENT =
  "docs/assessment-production/score-stability-v2.1.3-chronology-fallback-development/development-analysis.json";
const ACTIVE_POLICY =
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const RUBRIC = "docs/reassessment-rubric-v2.1.md";
const MANUAL =
  "docs/calibration/v4.2.21.16/decomposed-consensus-contract/inventory-manual.md";
const SCRIPT =
  "scripts/prepare-assessment-production-post-canary-batch-06-inventory.mjs";
const PROTOCOL_ID =
  "assessment-production-post-canary-batch-06-candidate-sharded-inventory";
const SOURCE_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-06-candidate-sharded-inventory-source-packet";
const SELECTED_DEBATES = [
  "73",
  "36",
  "38",
  "97",
  "141",
  "06",
  "168",
  "135",
  "143",
  "169",
];
const EXPECTED = {
  debates: 10,
  candidates: 376,
  proCandidates: 189,
  conCandidates: 187,
  belowHighAttributionCandidates: 5,
};
const REMOVED_API_ENVIRONMENT_VARIABLES = [
  "OPENAI_API_KEY",
  "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID",
  "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY",
  "CODEX_API_KEY",
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const prettyJsonBytes = (value) =>
  Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const compactJsonBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

function allBooleanLeavesTrue(value) {
  if (typeof value === "boolean") return value;
  if (!value || typeof value !== "object") return true;
  return Object.values(value).every(allBooleanLeavesTrue);
}

function buildInventorySourcePacket(sourcePacket) {
  assertV4(
    sourcePacket?.schemaVersion ===
      "1.0-assessment-production-post-canary-batch-06-score-blind-source-packet" &&
      sourcePacket.protocolId ===
        "assessment-production-post-canary-batch-06-source-preparation" &&
      sourcePacket.modelInputBoundary?.scoreBlindDiscoveryOnly === true &&
      sourcePacket.modelInputBoundary?.postCanaryProductionBatch === true &&
      sourcePacket.modelInputBoundary?.productionCanary === false &&
      sourcePacket.modelInputBoundary?.developmentValidationOnly === false &&
      sourcePacket.sides?.pro?.speakers?.length === 1 &&
      sourcePacket.sides?.con?.speakers?.length === 1,
    "Batch 6 source packet is unavailable or not dyadic"
  );
  return {
    ...structuredClone(sourcePacket),
    schemaVersion: SOURCE_PACKET_VERSION,
    protocolId: PROTOCOL_ID,
    modelInputBoundary: {
      candidateShardedInventoryOnly: true,
      chronologyFallbackRequired: true,
      postCanaryProductionBatch: true,
      productionCanary: false,
      developmentValidationOnly: false,
      stagingOnlyIntermediateOutput: true,
      scoreBlind: true,
      integerRoundedTiesPermitted: true,
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
      "1.0-assessment-production-post-canary-batch-06-candidate-census-plan-packet",
    protocolId: PROTOCOL_ID,
    stage: "candidate-census-plan",
    debateNumber,
    debateId,
    model: {
      label: "5.6 Sol",
      slug: "gpt-5.6-sol",
      reasoningEffort: "low",
      authentication: "ChatGPT subscription",
      scoreBlind: true,
      integerRoundedTiesPermitted: true,
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
        role: "candidate-sharded-inventory-guide",
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

async function hashFiles(files) {
  const hashes = {};
  for (const file of [...new Set(files)].sort()) {
    hashes[file] = sha256(await readFile(file));
  }
  return hashes;
}

async function buildFrozenArtifacts(frozenAt) {
  const standingAuthorization =
    await loadAndValidatePostCanaryBatch06StandingAuthorization();
  const [
    discoveryAnalysisBytes,
    discoveryActivationBytes,
    discoveryExecutionBytes,
    sourcePreparationBytes,
    sourcePreparationValidationBytes,
    selectionBytes,
    successorDevelopmentBytes,
    activePolicyBytes,
    guideBytes,
    manualBytes,
  ] = await Promise.all([
    readFile(DISCOVERY_ANALYSIS),
    readFile(DISCOVERY_ACTIVATION),
    readFile(DISCOVERY_EXECUTION),
    readFile(SOURCE_PREPARATION),
    readFile(SOURCE_PREPARATION_VALIDATION),
    readFile(SELECTION),
    readFile(SUCCESSOR_DEVELOPMENT),
    readFile(ACTIVE_POLICY),
    readFile(GUIDE),
    readFile(MANUAL),
  ]);
  const discoveryAnalysis = JSON.parse(discoveryAnalysisBytes);
  const discoveryExecution = JSON.parse(discoveryExecutionBytes);
  const sourcePreparation = JSON.parse(sourcePreparationBytes);
  const sourcePreparationValidation = JSON.parse(
    sourcePreparationValidationBytes
  );
  const selection = JSON.parse(selectionBytes);
  const successorDevelopment = JSON.parse(successorDevelopmentBytes);
  const activePolicy = JSON.parse(activePolicyBytes);

  assertV4(
    standingAuthorization.record.authorization
      .inventoryPreparationAndModelExecution === true &&
      standingAuthorization.record.costBoundary
        .subscriptionAndLocalDirectIncrementalCostUsdMaximum === 0 &&
      JSON.stringify(standingAuthorization.record.selectedDebates) ===
        JSON.stringify(SELECTED_DEBATES),
    "Batch 6 standing authorization does not cover exact inventory preparation and execution"
  );

  assertV4(
    discoveryAnalysis.status ===
      "post-canary-batch-06-discovery-passed-standing-authorization-active-for-inventory-preparation" &&
      discoveryAnalysis.productionContinuation === true &&
      discoveryAnalysis.productionCanary === false &&
      discoveryAnalysis.developmentValidationOnly === false &&
      discoveryAnalysis.stagingOnly === true &&
      discoveryAnalysis.audit?.validContexts === 39 &&
      discoveryAnalysis.audit?.invalidContexts === 0 &&
      discoveryAnalysis.audit?.candidateMinimumPassed === true &&
      discoveryAnalysis.audit?.allDiscoveredCandidatesTransported === true &&
      discoveryAnalysis.audit?.silentSemanticDeduplication === false &&
      discoveryAnalysis.audit?.automaticSemanticCorrection === false &&
      discoveryAnalysis.audit?.activePolicyVersion === "v2.2" &&
      discoveryAnalysis.audit?.integerRoundedTiesPermitted === true &&
      discoveryAnalysis.audit?.zeroLexicalTokenRowsPreservedWithCountZero ===
        true &&
      discoveryAnalysis.audit?.exactSourceRowsInjectedOmittedOrRewritten ===
        false &&
      discoveryAnalysis.totals?.debates === EXPECTED.debates &&
      discoveryAnalysis.totals?.candidates === EXPECTED.candidates &&
      discoveryAnalysis.totals?.pro === EXPECTED.proCandidates &&
      discoveryAnalysis.totals?.con === EXPECTED.conCandidates &&
      discoveryAnalysis.totals?.belowHighAttributionCandidates ===
        EXPECTED.belowHighAttributionCandidates &&
      discoveryAnalysis.totals?.modelContextsExecuted === 39 &&
      discoveryAnalysis.totals?.retries === 0 &&
      discoveryAnalysis.totals?.scoresDerived === 0 &&
      discoveryAnalysis.authorization?.inventoryPreparation === false &&
      discoveryAnalysis.authorization?.inventoryModelExecution === false &&
      discoveryAnalysis.authorization?.independentJudgmentModelExecution ===
        false &&
      discoveryAnalysis.authorization?.paidTranscription === false &&
      discoveryAnalysis.authorization?.productionMutation === false &&
      discoveryAnalysis.nextAuthorizedAction ===
        "prepare-freeze-and-activate-batch-06-candidate-census-planner-contexts-under-standing-authorization",
    "passed Batch 6 discovery boundary drifted"
  );
  assertV4(
    discoveryExecution.status ===
      "forty-one-post-canary-batch-06-discovery-contexts-passed" &&
      discoveryExecution.contextsAttempted === 39 &&
      discoveryExecution.validContexts === 39 &&
      discoveryExecution.invalidContexts === 0 &&
      discoveryExecution.retries === 0 &&
      discoveryExecution.timeoutExtensions === 0 &&
      discoveryExecution.authentication === "ChatGPT subscription" &&
      discoveryExecution.scoreBlind === true &&
      discoveryExecution.activePolicyVersion === "v2.2" &&
      discoveryExecution.integerRoundedTiesPermitted === true &&
      discoveryExecution.zeroLexicalTokenRowsPreservedWithCountZero === true &&
      discoveryExecution.exactSourceRowsInjectedOmittedOrRewritten === false &&
      discoveryExecution.meteredApiCostUsd === 0 &&
      discoveryExecution.transcriptionCostUsd === 0 &&
      discoveryExecution.scoresDerived === 0 &&
      discoveryExecution.productionMutations === 0,
    "Batch 6 discovery execution drifted"
  );
  assertV4(
      sourcePreparation.status ===
      "post-canary-batch-06-ten-complete-score-blind-source-packets-prepared-awaiting-validation" &&
      sourcePreparation.productionContinuation === true &&
      sourcePreparation.productionCanary !== true &&
      sourcePreparation.developmentValidationOnly === false &&
      sourcePreparation.contexts?.length === EXPECTED.debates &&
      sourcePreparation.model?.label === "5.6 Sol" &&
      sourcePreparation.model?.slug === "gpt-5.6-sol" &&
      sourcePreparation.model?.reasoningEffort === "low" &&
      sourcePreparation.model?.authentication === "ChatGPT subscription" &&
      sourcePreparation.model?.scoreBlind === true &&
      sourcePreparation.model?.roundedIntegerScoreTiesPermitted === true &&
      sourcePreparation.tokenLedgerCompatibility?.status ===
        "exact-source-zero-lexical-token-rows-preserved-with-zero-count" &&
      sourcePreparation.tokenLedgerCompatibility?.sourceRowsInjected === 0 &&
      sourcePreparation.tokenLedgerCompatibility?.sourceRowsOmitted === 0 &&
      sourcePreparation.tokenLedgerCompatibility?.sourceRowsRewritten === 0 &&
      sourcePreparation.tokenLedgerCompatibility
        ?.minimumCandidateLexicalTokensChanged === false &&
      sourcePreparation.tokenLedgerCompatibility?.occurrences?.length === 1 &&
      allBooleanLeavesTrue(sourcePreparation.stopRules),
    "Batch 6 source preparation or model boundary drifted"
  );
  assertV4(
    sourcePreparationValidation.status ===
      "post-canary-batch-06-score-blind-source-packet-validation-passed-frozen-under-standing-authorization" &&
      sourcePreparationValidation.checks?.allThirtyOriginalSourceHashesReplayed ===
        true &&
      sourcePreparationValidation.checks?.scoreBlindPacketKeyAuditPassed ===
        true &&
      sourcePreparationValidation.checks
        ?.activeV22PolicyAndTieRulePreserved === true &&
      sourcePreparationValidation.checks
        ?.exactZeroLexicalTokenHandlingReplayed === true &&
      sourcePreparationValidation.checks
        ?.exactSourceRowsInjectedOmittedOrRewritten === false &&
      sourcePreparationValidation.totals?.debates === EXPECTED.debates &&
      sourcePreparationValidation.totals?.scoresDerived === 0 &&
      sourcePreparationValidation.totals?.paidServiceCalls === 0,
    "Batch 6 source validation drifted"
  );
  assertV4(
    selection.status ===
      "fifth-post-canary-ten-debate-batch-selection-frozen-source-gate-passed" &&
      JSON.stringify(selection.selected.map((item) => item.debateNumber)) ===
        JSON.stringify(SELECTED_DEBATES) &&
      selection.authorization?.inventoryModelExecution === false &&
      selection.authorization?.independentJudgmentModelExecution === false &&
      selection.authorization?.scoreDerivation === false &&
      selection.authorization?.productionMutation === false,
    "Batch 6 frozen selection drifted"
  );
  assertV4(
    activePolicy.status === "active-production-score-stability-policy-v2.2" &&
      activePolicy.activePolicy?.version === "v2.2" &&
      activePolicy.activePolicy?.winnerRule?.agreedProMayPublish?.includes(
        "tie"
      ) &&
      activePolicy.activePolicy?.winnerRule?.agreedConMayPublish?.includes(
        "tie"
      ) &&
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

  const generated = new Map();
  const contexts = [];
  for (const discovered of discoveryAnalysis.debates) {
    const source = sourcePreparation.contexts.find(
      (context) => context.debateNumber === discovered.debateNumber
    );
    assertV4(
      source && source.debateId === discovered.debateId,
      `${discovered.debateNumber}: Batch 6 identity drifted`
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
        sha256(localManifestBytes) === source.originalManifestSha256,
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
        candidateBundle.completeSourceDiscovery?.modelAuthoredLexicalTokenCounts ===
          false &&
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
    validateV4221162InventoryCandidateTransport(
      objectTransport,
      evidenceBundle
    );
    const compilerSchema = makeV422116InventorySchema({
      evidenceBundle: objectTransport,
    });
    const compilerSchemaBytes = compactJsonBytes(compilerSchema);
    const compilerSchemaPath =
      `${ROOT}/schemas/compiler/debate-${discovered.debateNumber}.schema.json`;
    const fullTransport =
      buildV212LosslessColumnarCandidateTransport(objectTransport);
    validateV212LosslessColumnarCandidateTransport(
      fullTransport,
      objectTransport
    );
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
      legacySchema: compilerSchema,
      candidateTransport: fullTransport,
      candidateCensus,
    });
    const planSchemaAudit = auditDecomposedStrictSchema(planSchema);
    const planSchemaBytes = compactJsonBytes(planSchema);
    const planSchemaPath =
      `${ROOT}/schemas/plans/debate-${discovered.debateNumber}.schema.json`;
    const planOutput = `${ROOT}/plans/debate-${discovered.debateNumber}.json`;
    const maximumPlan = buildMaximumCandidateShardedPlanFixture({
      legacySchema: compilerSchema,
      candidateTransport: fullTransport,
    });
    validateCandidateShardedInventoryPlan({
      plan: maximumPlan,
      legacySchema: compilerSchema,
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
        legacySchema: compilerSchema,
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
        maximumPlanSchemaAudit.nullableCandidateProperties ===
          candidateCount &&
          maximumCopiedInputBytes <=
            V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
        `${discovered.debateNumber}/${side}: prototype or size bound drifted`
      );
      generated.set(sideTransportPath, sideTransportBytes);
      generated.set(maximumPlanSchemaPath, maximumPlanSchemaBytes);
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
        canonicalJson(JSON.parse(planSchemaBytes)) ===
          canonicalJson(planSchema),
      `${discovered.debateNumber}: planner packet drifted`
    );

    for (const [file, bytes] of [
      [inventorySourcePacketPath, inventorySourcePacketBytes],
      [evidenceBundlePath, evidenceBundleBytes],
      [fullTransportPath, fullTransportBytes],
      [candidateCensusPath, candidateCensusBytes],
      [compilerSchemaPath, compilerSchemaBytes],
      [planSchemaPath, planSchemaBytes],
      [planPacketPath, planPacketBytes],
    ]) {
      generated.set(file, bytes);
    }

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
      compilerSchema: compilerSchemaPath,
      compilerSchemaSha256: sha256(compilerSchemaBytes),
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
    JSON.stringify(contexts.map((context) => context.debateNumber)) ===
      JSON.stringify(SELECTED_DEBATES) &&
      contexts.length === EXPECTED.debates &&
      contexts.reduce((sum, context) => sum + context.candidates, 0) ===
        EXPECTED.candidates &&
      contexts.reduce((sum, context) => sum + context.proCandidates, 0) ===
        EXPECTED.proCandidates &&
      contexts.reduce((sum, context) => sum + context.conCandidates, 0) ===
        EXPECTED.conCandidates &&
      contexts.reduce(
        (sum, context) => sum + context.belowHighAttributionCandidates,
        0
      ) === EXPECTED.belowHighAttributionCandidates &&
      contexts.every(
        (context) =>
          context.proCandidates >= 4 &&
          context.conCandidates >= 4 &&
          context.exactPlannerPacketFrozen === true &&
          context.exactSidePacketsFrozen === false
      ),
    "Batch 6 totals or packet state drifted"
  );

  const sourceFiles = [
    DISCOVERY_ANALYSIS,
    DISCOVERY_ACTIVATION,
    DISCOVERY_EXECUTION,
    SOURCE_PREPARATION,
    SOURCE_PREPARATION_VALIDATION,
    SELECTION,
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
    "scripts/lib/assessment-production-post-canary-batch-06-standing-authorization.mjs",
    POST_CANARY_BATCH_06_STANDING_AUTHORIZATION,
    SCRIPT,
    ...contexts.flatMap((context) => [
      context.discoveryCandidateBundle,
      context.discoverySparseContext,
      context.originalTranscript,
      context.originalEvents,
      context.originalManifest,
      context.fullLedger,
    ]),
  ];
  const preparationSourceHashes = await hashFiles(sourceFiles);
  const futureInventoryOutputs = contexts.flatMap((context) => [
    context.planOutput,
    ...context.sideAssets.map((asset) => asset.output),
    context.inventoryProposalOutput,
    context.lockedInventoryOutput,
    context.validationOutput,
    context.provenanceOutput,
  ]);

  const preparation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-06-candidate-sharded-inventory-preparation",
    protocolId: PROTOCOL_ID,
    sideSelectionProtocolId: CHRONOLOGY_FALLBACK_INVENTORY.protocolId,
    status:
      "post-canary-batch-06-candidate-sharded-source-assets-and-ten-planner-packets-frozen",
    preparedAt: frozenAt,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    branch: "main",
    productionContinuation: true,
    productionCanary: false,
    developmentValidationOnly: false,
    stagingOnly: true,
    AIOnly: true,
    selectedDebates: SELECTED_DEBATES,
    userAuthorization: {
      scope:
        "prepare, freeze, activate, and execute the Batch 6 candidate-census and candidate-sharded side-selection workflow under the frozen standing authorization",
      standingAuthorization: POST_CANARY_BATCH_06_STANDING_AUTHORIZATION,
      standingAuthorizationSha256: standingAuthorization.sha256,
      thisArtifactActivatesModelExecution: false,
      directIncrementalCostCapUsd: 0,
      inventoryPacketPreparationAuthorized: true,
      executionPreparationManifestAuthorized: true,
      modelExecutionAuthorized: false,
      paidServicesAuthorized: false,
    },
    discoveryDisposition: {
      batch03DiscoveryPassed: true,
      batch03DiscoveryRetried: false,
      batch03DiscoveryCandidatesChangedDuringTransport: false,
      failedProductionCanaryOutputsUsedAsModelInput: false,
      validationCohortOutputsUsedAsModelInput: false,
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
    sourceCompatibility: structuredClone(
      sourcePreparation.tokenLedgerCompatibility
    ),
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
      roundedIntegerScoreTiesPermitted: true,
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
      discoveryActivation: DISCOVERY_ACTIVATION,
      discoveryActivationSha256: sha256(discoveryActivationBytes),
      discoveryExecution: DISCOVERY_EXECUTION,
      discoveryExecutionSha256: sha256(discoveryExecutionBytes),
      sourcePreparation: SOURCE_PREPARATION,
      sourcePreparationSha256: sha256(sourcePreparationBytes),
      sourcePreparationValidation: SOURCE_PREPARATION_VALIDATION,
      sourcePreparationValidationSha256: sha256(
        sourcePreparationValidationBytes
      ),
      frozenSelection: SELECTION,
      frozenSelectionSha256: sha256(selectionBytes),
      validatedSuccessorDevelopment: SUCCESSOR_DEVELOPMENT,
      validatedSuccessorDevelopmentSha256: sha256(successorDevelopmentBytes),
      candidateShardedGuide: GUIDE,
      candidateShardedGuideSha256: sha256(guideBytes),
      inventoryManual: MANUAL,
      inventoryManualSha256: sha256(manualBytes),
      standingAuthorization: POST_CANARY_BATCH_06_STANDING_AUTHORIZATION,
      standingAuthorizationSha256: standingAuthorization.sha256,
    },
    sourceHashes: preparationSourceHashes,
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
      discoveryBelowHighCandidates: EXPECTED.belowHighAttributionCandidates,
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
      candidates: EXPECTED.candidates,
      proCandidates: EXPECTED.proCandidates,
      conCandidates: EXPECTED.conCandidates,
      plannedModelContexts: 30,
      exactPlannerPacketsFrozen: 10,
      completeSideTransportsFrozen: 20,
      sideSchemaPrototypesFrozen: 20,
      exactSidePacketsFrozen: 0,
      modelContextsExecuted: 0,
      audioCalls: 0,
      transcriptionCalls: 0,
      retries: 0,
      timeoutExtensions: 0,
      semanticCorrections: 0,
      scoresDerived: 0,
      productionMutations: 0,
      directIncrementalCostUsd: 0,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
    },
    futureOutputPathsExcludedFromSourceHashes: futureInventoryOutputs,
    authorization: {
      deterministicValidation: true,
      candidateCensusPlanExecutionManifestPreparation: true,
      executionActivationPreparation: false,
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
      unexpectedPaidService: false,
      audioVerification: false,
      adjudicationModelExecution: false,
      scoreDerivation: false,
      publicationPreparation: false,
      publicationModelExecution: false,
      productionMutation: false,
      nextBatchSelection: false,
    },
    nextAuthorizedAction:
      "freeze-and-activate-batch-06-candidate-census-plan-execution-under-standing-authorization",
  };
  const preparationBytes = prettyJsonBytes(preparation);
  generated.set(PREPARATION, preparationBytes);

  const planContexts = [];
  for (const prepared of contexts) {
    const packetBytes = generated.get(prepared.planPacket);
    const packet = JSON.parse(packetBytes);
    assertV4(
      sha256(packetBytes) === prepared.planPacketSha256 &&
        packetBytes.length === prepared.planPacketBytes &&
        packet.protocolId === PROTOCOL_ID &&
        packet.debateNumber === prepared.debateNumber &&
        packet.copiedInputs.length === 5 &&
        packet.modelExecutionAuthorized === false,
      `${prepared.debateNumber}: frozen planner packet drifted`
    );
    planContexts.push({
      contextIndex: planContexts.length,
      stage: "candidate-census-plan",
      debateNumber: prepared.debateNumber,
      debateId: prepared.debateId,
      family: prepared.family,
      sourceComplexityBand: prepared.sourceComplexityBand,
      packet: prepared.planPacket,
      packetSha256: prepared.planPacketSha256,
      packetBytes: prepared.planPacketBytes,
      copiedInputs: structuredClone(packet.copiedInputs),
      copiedInputBytes: packet.copiedInputBytes,
      maximumCopiedInputBytes: packet.maximumCopiedInputBytes,
      writableDomains: structuredClone(packet.writableDomains),
      strictOutputSchema: prepared.planSchema,
      strictOutputSchemaSha256: prepared.planSchemaSha256,
      output: packet.output,
      attemptsMaximum: 1,
      retries: 0,
      timeoutExtensions: 0,
      modelExecutionAuthorized: false,
    });
  }

  async function bytesFor(file) {
    if (generated.has(file)) return generated.get(file);
    return readFile(file);
  }
  const executionSourceFiles = [
    ...Object.keys(preparationSourceHashes),
    PREPARATION,
    SCRIPT,
    ...planContexts.flatMap((context) => [
      context.packet,
      ...context.copiedInputs.map((input) => input.path),
    ]),
  ];
  const executionSourceHashes = {};
  for (const file of [...new Set(executionSourceFiles)].sort()) {
    executionSourceHashes[file] = sha256(await bytesFor(file));
  }
  const codexPath = "/Applications/ChatGPT.app/Contents/Resources/codex";
  const codexCliVersion = execFileSync(codexPath, ["--version"], {
    encoding: "utf8",
  }).trim();
  const maximumCopiedInputBytes = Math.max(
    ...planContexts.map((context) => context.copiedInputBytes)
  );
  const futurePlanOutputs = [
    ...planContexts.map((context) => context.output),
    PLAN_ACTIVATION,
    PLAN_EXECUTION,
    PLAN_ANALYSIS,
    SIDE_PACKET_PREPARATION,
  ];
  const executionPreparation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-06-candidate-census-plan-execution-preparation-manifest",
    protocolId: PROTOCOL_ID,
    status:
      "frozen-ten-post-canary-batch-06-candidate-census-plan-contexts-prepared-not-authorized",
    frozenAt,
    checkpointCommit: preparation.checkpointCommit,
    branch: "main",
    productionContinuation: true,
    productionCanary: false,
    developmentValidationOnly: false,
    stagingOnly: true,
    AIOnly: true,
    selectedDebates: SELECTED_DEBATES,
    userAuthorization: structuredClone(preparation.userAuthorization),
    activePolicy: structuredClone(preparation.activePolicy),
    sourceCompatibility: structuredClone(preparation.sourceCompatibility),
    validatedInventoryContract: structuredClone(
      preparation.validatedInventoryContract
    ),
    model: {
      label: "5.6 Sol",
      slug: "gpt-5.6-sol",
      reasoningEffort: "low",
      authentication: "ChatGPT subscription",
      scoreBlind: true,
      roundedIntegerScoreTiesPermitted: true,
    },
    costEstimate: {
      authentication: "ChatGPT subscription",
      directIncrementalCostUsdMaximum: 0,
      meteredApiCostUsdMaximum: 0,
      transcriptionCostUsdMaximum: 0,
      contexts: planContexts.length,
      expectedParallelWallMinutes: [5, 15],
      expectedAggregateModelMinutes: [9, 25],
      expectedAggregateComputeHours: [0.15, 0.42],
      absoluteStageTimeoutMinutes: 60,
      estimateBasis:
        `The promoted ten-context candidate-census planner used this contract at concurrency two. Batch 6 freezes the same ten-context shape with an observed maximum of ${maximumCopiedInputBytes.toLocaleString("en-US")} copied bytes, below the proven ${V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes.toLocaleString("en-US")}-byte ceiling. ChatGPT-subscription execution has no direct incremental API charge.`,
    },
    executionEnvironment: {
      codexPath,
      codexCliVersion,
      authentication: "ChatGPT subscription",
      APIKeysRemoved: true,
      isolatedTemporaryCodexHomes: true,
    },
    preparation: PREPARATION,
    preparationSha256: sha256(preparationBytes),
    contexts: planContexts,
    isolation: {
      freshTemporaryCodexHomePerContext: true,
      freshSourceDirectoryPerContext: true,
      oneDebatePerContext: true,
      onlyFivePacketDeclaredInputsCopied: true,
      candidateEvidenceExcerptsUnavailable: true,
      candidateSelectionUnavailable: true,
      failedProductionCanaryOutputsUnavailable: true,
      validationCohortOutputsUnavailable: true,
      otherContextsUnavailable: true,
      otherOutputsUnavailable: true,
      otherDebatesUnavailable: true,
      legacyAssessmentsUnavailable: true,
      priorJudgmentsUnavailable: true,
      ratingsScoresWinnersUnavailable: true,
      tagsAndPublicationProseUnavailable: true,
    },
    executionPolicy: {
      stage: "candidate-census-plan",
      contexts: planContexts.length,
      attemptsPerContext: 1,
      retriesMaximum: 0,
      timeoutMsPerContext: 600000,
      timeoutExtensionsMaximum: 0,
      absoluteStageTimeoutMs: 3600000,
      copiedInputBytesMaximum:
        V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
      observedMaximumCopiedInputBytes: maximumCopiedInputBytes,
      maximumParallelContexts: 2,
      schedulerRamp: [1, 2],
      rampOneServesAsOperationalCanary: true,
      eachRampPhaseMustPassBeforeExpansion: true,
      abortBeforeStartingAdditionalContextOnAnyFailure: true,
      allowAlreadyRunningIndependentContextToFinish: true,
      allTenPlansMustPassBeforeSidePacketPreparation: true,
      deterministicInputOrder: true,
      authentication: "ChatGPT subscription",
      APIKeysRemoved: true,
      removedEnvironmentVariables: REMOVED_API_ENVIRONMENT_VARIABLES,
      directIncrementalCostUsdMaximum: 0,
      meteredApiCostUsdMaximum: 0,
      transcriptionCostUsdMaximum: 0,
      separateActivationRequired: true,
    },
    acceptancePolicy: {
      exactContextCountRequired: 10,
      everyContextMustCompleteOnItsSingleAttempt: true,
      everyOutputMustValidateAgainstFrozenStrictSchema: true,
      everyOutputMustPassDeterministicSemanticValidation: true,
      writableDomainsLimitedToRoutesAndSections: true,
      immutablePlanCanonicalHashRequired: true,
      partialPlanGateAcceptance: false,
      automaticSemanticCorrection: false,
      exactSidePacketPreparationDeferredUntilAllPlansAccepted: true,
      scoresDerived: false,
    },
    stopRules: {
      ...structuredClone(preparation.stopRules),
      executionPreparationHashMismatchBlocks: true,
      activationHashMismatchBlocks: true,
      invalidPlannerOutputBlocksEntireInventoryGate: true,
      planTimeoutBlocksEntireInventoryGate: true,
      planContextFailureBlocksEntireInventoryGate: true,
      sidePacketFreezeBeforeTenAcceptedPlansBlocks: true,
      retryBlocks: true,
      timeoutExtensionBlocks: true,
    },
    totals: {
      debates: planContexts.length,
      planContextsPrepared: planContexts.length,
      planContextsAuthorized: 0,
      planContextsExecuted: 0,
      acceptedPlans: 0,
      exactSidePacketsFrozen: 0,
      modelContextsExecuted: 0,
      paidServiceCalls: 0,
      audioCalls: 0,
      transcriptionCalls: 0,
      retries: 0,
      timeoutExtensions: 0,
      semanticCorrections: 0,
      scoresDerived: 0,
      productionMutations: 0,
      directIncrementalCostUsd: 0,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
    },
    authorization: {
      deterministicValidation: true,
      executionActivationPreparation: false,
      planModelContexts: false,
      deterministicPlanValidation: false,
      planAnalysis: false,
      exactSidePacketPreparation: false,
      sideSelectorModelExecution: false,
      inventoryModelExecution: false,
      retry: false,
      timeoutExtension: false,
      semanticCorrection: false,
      independentJudgmentPacketPreparation: false,
      independentJudgmentModelExecution: false,
      paidTranscription: false,
      unexpectedPaidService: false,
      audioVerification: false,
      adjudicationModelExecution: false,
      scoreDerivation: false,
      publicationPreparation: false,
      publicationModelExecution: false,
      productionMutation: false,
      nextBatchSelection: false,
    },
    artifacts: {
      validation: VALIDATION,
      activation: PLAN_ACTIVATION,
      execution: PLAN_EXECUTION,
      analysis: PLAN_ANALYSIS,
      plans: planContexts.map((context) => context.output),
      laterSidePacketPreparation: SIDE_PACKET_PREPARATION,
    },
    futureOutputPathsExcludedFromSourceHashes: futurePlanOutputs,
    sourceHashes: executionSourceHashes,
    nextAuthorizedAction:
      "freeze-and-activate-batch-06-candidate-census-plan-execution-under-standing-authorization",
  };
  const executionPreparationBytes = prettyJsonBytes(executionPreparation);
  generated.set(EXECUTION_PREPARATION, executionPreparationBytes);

  const validation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-06-candidate-sharded-inventory-preparation-validation",
    protocolId: PROTOCOL_ID,
    status:
      "batch-06-candidate-sharded-inventory-packets-and-plan-execution-manifest-validation-passed-frozen-standing-authorization-active",
    validatedAt: frozenAt,
    preparation: {
      path: PREPARATION,
      sha256: sha256(preparationBytes),
      bytes: preparationBytes.length,
      status: preparation.status,
    },
    executionPreparation: {
      path: EXECUTION_PREPARATION,
      sha256: sha256(executionPreparationBytes),
      bytes: executionPreparationBytes.length,
      status: executionPreparation.status,
    },
    selectedDebates: SELECTED_DEBATES,
    checks: {
      exactDiscoveryCandidateReplay: true,
      everyDiscoveredCandidateRetained: true,
      exactCandidateOrderPreserved: true,
      exactSourceHashReplay: true,
      exactDyadicSpeakerAllowlistsPreserved: true,
      exactPlannerPacketsFrozen: true,
      completeSideTransportsFrozen: true,
      sidePrototypeSchemasNonExecutable: true,
      exactSidePacketsDeferredUntilAcceptedPlans: true,
      planContextsScoreBlind: true,
      fiveInputIsolationPreserved: true,
      activeV22PolicyAndRoundedTieRulePreserved: true,
      exactBelowHighAttributionCandidateCountRecordedAtDiscovery: true,
      exactZeroLexicalTokenSourceRowPreserved: true,
      allInheritedStopRulesPreserved: true,
      futureOutputsAbsent: true,
      zeroCostCapPreserved: true,
    },
    totals: structuredClone(executionPreparation.totals),
    authorization: structuredClone(executionPreparation.authorization),
    nextAuthorizedAction: executionPreparation.nextAuthorizedAction,
  };
  const validationBytes = prettyJsonBytes(validation);
  generated.set(VALIDATION, validationBytes);

  return {
    generated,
    preparation,
    executionPreparation,
    validation,
    futureOutputs: [...new Set([...futureInventoryOutputs, ...futurePlanOutputs])],
  };
}

async function freeze() {
  const shouldWrite = process.argv.includes("--write");
  const frozenIndex = process.argv.indexOf("--frozen-at");
  const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
  assertV4(
    frozenAt && !Number.isNaN(Date.parse(frozenAt)),
    "--frozen-at requires an ISO timestamp"
  );
  const built = await buildFrozenArtifacts(frozenAt);
  for (const file of built.generated.keys()) {
    if (file !== GUIDE) {
      assertV4(!(await exists(file)), `${file} already exists`);
    }
  }
  for (const future of built.futureOutputs) {
    assertV4(!(await exists(future)), `future output already exists: ${future}`);
  }
  if (shouldWrite) {
    for (const [file, bytes] of built.generated.entries()) {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes);
    }
  }
  console.log(
    JSON.stringify(
      {
        status: shouldWrite ? built.validation.status : "preview",
        debates: built.preparation.contexts.map((context) => ({
          debateNumber: context.debateNumber,
          candidates: context.candidates,
          proCandidates: context.proCandidates,
          conCandidates: context.conCandidates,
          planCopiedInputBytes: context.planCopiedInputBytes,
          maximumSidePrototypeCopiedInputBytes: Math.max(
            ...context.sideAssets.map(
              (asset) => asset.maximumPlanCopiedInputBytes
            )
          ),
        })),
        totals: built.preparation.totals,
        planExecutionPreparation: {
          contexts: built.executionPreparation.contexts.length,
          copiedInputBytesMinimum: Math.min(
            ...built.executionPreparation.contexts.map(
              (context) => context.copiedInputBytes
            )
          ),
          copiedInputBytesMaximum:
            built.executionPreparation.executionPolicy
              .observedMaximumCopiedInputBytes,
          copiedInputBytesCeiling:
            built.executionPreparation.executionPolicy.copiedInputBytesMaximum,
          maximumParallelContexts: 2,
          schedulerRamp: [1, 2],
          expectedParallelWallMinutes:
            built.executionPreparation.costEstimate.expectedParallelWallMinutes,
        },
        exactPlannerPacketsFrozen: 10,
        completeSideTransportsFrozen: 20,
        sidePrototypeSchemasFrozenNonExecutable: 20,
        exactSidePacketsDeferred: 20,
        modelExecutionAuthorized: false,
        paidServicesAuthorized: false,
        directIncrementalCostUsd: 0,
        scoresDerived: 0,
        productionMutations: 0,
        nextAuthorizedAction: built.validation.nextAuthorizedAction,
      },
      null,
      2
    )
  );
}

async function validateFrozen() {
  const [preparationBytes, executionPreparationBytes, validationBytes] =
    await Promise.all([
      readFile(PREPARATION),
      readFile(EXECUTION_PREPARATION),
      readFile(VALIDATION),
    ]);
  const preparation = JSON.parse(preparationBytes);
  const executionPreparation = JSON.parse(executionPreparationBytes);
  const validation = JSON.parse(validationBytes);
  assertV4(
    preparation.status ===
      "post-canary-batch-06-candidate-sharded-source-assets-and-ten-planner-packets-frozen" &&
      preparation.protocolId === PROTOCOL_ID &&
      preparation.productionContinuation === true &&
      preparation.productionCanary === false &&
      preparation.contexts.length === EXPECTED.debates &&
      JSON.stringify(preparation.selectedDebates) ===
        JSON.stringify(SELECTED_DEBATES) &&
      preparation.userAuthorization.standingAuthorization ===
        POST_CANARY_BATCH_06_STANDING_AUTHORIZATION &&
      preparation.userAuthorization.thisArtifactActivatesModelExecution ===
        false &&
      preparation.model.label === "5.6 Sol" &&
      preparation.model.slug === "gpt-5.6-sol" &&
      preparation.model.reasoningEffort === "low" &&
      preparation.model.authentication === "ChatGPT subscription" &&
      preparation.model.scoreBlind === true &&
      preparation.model.roundedIntegerScoreTiesPermitted === true &&
      preparation.totals.candidates === EXPECTED.candidates &&
      preparation.totals.proCandidates === EXPECTED.proCandidates &&
      preparation.totals.conCandidates === EXPECTED.conCandidates &&
      preparation.totals.exactPlannerPacketsFrozen === 10 &&
      preparation.totals.completeSideTransportsFrozen === 20 &&
      preparation.totals.sideSchemaPrototypesFrozen === 20 &&
      preparation.totals.exactSidePacketsFrozen === 0 &&
      preparation.totals.modelContextsExecuted === 0 &&
      preparation.totals.scoresDerived === 0 &&
      preparation.totals.productionMutations === 0 &&
      preparation.totals.directIncrementalCostUsd === 0 &&
      preparation.audioPolicy.discoveryBelowHighCandidates === EXPECTED.belowHighAttributionCandidates &&
      preparation.sourceCompatibility.status ===
        "exact-source-zero-lexical-token-rows-preserved-with-zero-count" &&
      preparation.sourceCompatibility.sourceRowsInjected === 0 &&
      preparation.sourceCompatibility.sourceRowsOmitted === 0 &&
      preparation.sourceCompatibility.sourceRowsRewritten === 0 &&
      preparation.sourceCompatibility.minimumCandidateLexicalTokensChanged ===
        false &&
      preparation.sourceCompatibility.occurrences.length === 1 &&
      preparation.audioPolicy.audioAccessedDuringPreparation === false &&
      preparation.authorization.executionActivationPreparation === false &&
      preparation.authorization.inventoryPlanModelExecution === false &&
      preparation.authorization.exactSidePacketPreparation === false &&
      preparation.authorization.inventoryModelExecution === false &&
      preparation.authorization.independentJudgmentModelExecution === false &&
      preparation.authorization.paidTranscription === false &&
      preparation.authorization.audioVerification === false &&
      preparation.authorization.scoreDerivation === false &&
      preparation.authorization.publicationModelExecution === false &&
      preparation.authorization.productionMutation === false &&
      allBooleanLeavesTrue(preparation.stopRules),
    "frozen Batch 6 inventory preparation is invalid"
  );
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
  }
  for (const context of preparation.contexts) {
    for (const [fileKey, hashKey, bytesKey] of [
      ["inventorySourcePacket", "inventorySourcePacketSha256", "inventorySourcePacketBytes"],
      ["validatorCandidateEvidenceBundle", "validatorCandidateEvidenceBundleSha256", "validatorCandidateEvidenceBundleBytes"],
      ["fullCandidateTransport", "fullCandidateTransportSha256", "fullCandidateTransportBytes"],
      ["candidateCensus", "candidateCensusSha256", "candidateCensusBytes"],
      ["planSchema", "planSchemaSha256", "planSchemaBytes"],
      ["planPacket", "planPacketSha256", "planPacketBytes"],
    ]) {
      const bytes = await readFile(context[fileKey]);
      assertV4(
        sha256(bytes) === context[hashKey] && bytes.length === context[bytesKey],
        `${context.debateNumber}/${fileKey}: frozen artifact drifted`
      );
    }
    const compilerBytes = await readFile(context.compilerSchema);
    assertV4(
      sha256(compilerBytes) === context.compilerSchemaSha256,
      `${context.debateNumber}: compiler schema drifted`
    );
    for (const side of context.sideAssets) {
      const [transportBytes, schemaBytes] = await Promise.all([
        readFile(side.transport),
        readFile(side.maximumPlanSchemaPrototype),
      ]);
      assertV4(
        sha256(transportBytes) === side.transportSha256 &&
          transportBytes.length === side.transportBytes &&
          sha256(schemaBytes) === side.maximumPlanSchemaPrototypeSha256 &&
          schemaBytes.length === side.maximumPlanSchemaPrototypeBytes &&
          side.prototypeExecutable === false &&
          side.exactPacketDeferredUntilAcceptedPlan === true &&
          !(await exists(side.output)),
        `${context.debateNumber}/${side.side}: side transport drifted`
      );
    }
    assertV4(!(await exists(context.planOutput)), `${context.debateNumber}: plan exists`);
  }

  assertV4(
    executionPreparation.status ===
      "frozen-ten-post-canary-batch-06-candidate-census-plan-contexts-prepared-not-authorized" &&
      executionPreparation.preparationSha256 === sha256(preparationBytes) &&
      executionPreparation.contexts.length === 10 &&
      executionPreparation.model.label === "5.6 Sol" &&
      executionPreparation.model.slug === "gpt-5.6-sol" &&
      executionPreparation.model.reasoningEffort === "low" &&
      executionPreparation.model.authentication === "ChatGPT subscription" &&
      executionPreparation.model.scoreBlind === true &&
      executionPreparation.model.roundedIntegerScoreTiesPermitted === true &&
      executionPreparation.sourceCompatibility.status ===
        "exact-source-zero-lexical-token-rows-preserved-with-zero-count" &&
      executionPreparation.sourceCompatibility.sourceRowsInjected === 0 &&
      executionPreparation.sourceCompatibility.sourceRowsOmitted === 0 &&
      executionPreparation.sourceCompatibility.sourceRowsRewritten === 0 &&
      executionPreparation.sourceCompatibility
        .minimumCandidateLexicalTokensChanged === false &&
      executionPreparation.sourceCompatibility.occurrences.length === 1 &&
      executionPreparation.executionPolicy.contexts === 10 &&
      executionPreparation.executionPolicy.attemptsPerContext === 1 &&
      executionPreparation.executionPolicy.retriesMaximum === 0 &&
      executionPreparation.executionPolicy.timeoutExtensionsMaximum === 0 &&
      executionPreparation.executionPolicy.maximumParallelContexts === 2 &&
      JSON.stringify(executionPreparation.executionPolicy.schedulerRamp) ===
        JSON.stringify([1, 2]) &&
      executionPreparation.executionPolicy.separateActivationRequired === true &&
      executionPreparation.executionPolicy.directIncrementalCostUsdMaximum ===
        0 &&
      executionPreparation.totals.planContextsPrepared === 10 &&
      executionPreparation.totals.planContextsAuthorized === 0 &&
      executionPreparation.totals.planContextsExecuted === 0 &&
      executionPreparation.totals.modelContextsExecuted === 0 &&
      executionPreparation.totals.paidServiceCalls === 0 &&
      executionPreparation.totals.scoresDerived === 0 &&
      executionPreparation.totals.productionMutations === 0 &&
      executionPreparation.authorization.executionActivationPreparation ===
        false &&
      executionPreparation.authorization.planModelContexts === false &&
      executionPreparation.authorization.inventoryModelExecution === false &&
      executionPreparation.authorization.independentJudgmentModelExecution ===
        false &&
      executionPreparation.authorization.paidTranscription === false &&
      executionPreparation.authorization.audioVerification === false &&
      executionPreparation.authorization.scoreDerivation === false &&
      executionPreparation.authorization.productionMutation === false &&
      allBooleanLeavesTrue(executionPreparation.stopRules),
    "frozen plan execution-preparation manifest is invalid"
  );
  for (const [file, digest] of Object.entries(executionPreparation.sourceHashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
  }
  for (const context of executionPreparation.contexts) {
    const packetBytes = await readFile(context.packet);
    const packet = JSON.parse(packetBytes);
    assertV4(
      sha256(packetBytes) === context.packetSha256 &&
        packetBytes.length === context.packetBytes &&
        packet.copiedInputs.length === 5 &&
        packet.copiedInputBytes === context.copiedInputBytes &&
        packet.modelExecutionAuthorized === false &&
        context.modelExecutionAuthorized === false &&
        context.attemptsMaximum === 1 &&
        context.retries === 0 &&
        context.timeoutExtensions === 0,
      `${context.debateNumber}: plan context drifted`
    );
    let copiedInputBytes = 0;
    for (const input of context.copiedInputs) {
      const bytes = await readFile(input.path);
      assertV4(
        sha256(bytes) === input.sha256 && bytes.length === input.bytes,
        `${context.debateNumber}/${input.role}: copied input drifted`
      );
      copiedInputBytes += bytes.length;
    }
    assertV4(
      copiedInputBytes === context.copiedInputBytes &&
        !(await exists(context.output)),
      `${context.debateNumber}: copied input total or future output drifted`
    );
  }
  for (const future of [
    ...preparation.futureOutputPathsExcludedFromSourceHashes,
    ...executionPreparation.futureOutputPathsExcludedFromSourceHashes,
  ]) {
    assertV4(!(await exists(future)), `future output exists: ${future}`);
  }
  assertV4(
    validation.status ===
      "batch-06-candidate-sharded-inventory-packets-and-plan-execution-manifest-validation-passed-frozen-standing-authorization-active" &&
      validation.preparation.sha256 === sha256(preparationBytes) &&
      validation.preparation.bytes === preparationBytes.length &&
      validation.executionPreparation.sha256 ===
        sha256(executionPreparationBytes) &&
      validation.executionPreparation.bytes ===
        executionPreparationBytes.length &&
      Object.values(validation.checks).every(Boolean) &&
      validation.totals.modelContextsExecuted === 0 &&
      validation.totals.paidServiceCalls === 0 &&
      validation.totals.scoresDerived === 0 &&
      validation.totals.productionMutations === 0 &&
      validation.authorization.executionActivationPreparation === false &&
      validation.authorization.planModelContexts === false &&
      validation.authorization.inventoryModelExecution === false,
    "frozen validation record is invalid"
  );
  console.log(
    JSON.stringify(
      {
        status: "passed-frozen-inventory-preparation",
        selectedDebates: SELECTED_DEBATES,
        candidates: EXPECTED.candidates,
        proCandidates: EXPECTED.proCandidates,
        conCandidates: EXPECTED.conCandidates,
        exactPlannerPacketsFrozen: 10,
        completeSideTransportsFrozen: 20,
        sidePrototypeSchemasFrozenNonExecutable: 20,
        exactSidePacketsDeferred: 20,
        planContextsPrepared: 10,
        observedMaximumCopiedInputBytes:
          executionPreparation.executionPolicy.observedMaximumCopiedInputBytes,
        modelContextsExecuted: 0,
        paidServiceCalls: 0,
        audioCalls: 0,
        scoresDerived: 0,
        productionMutations: 0,
        directIncrementalCostUsd: 0,
        nextAuthorizedAction: executionPreparation.nextAuthorizedAction,
      },
      null,
      2
    )
  );
}

const command = process.argv[2];
if (command === "freeze") await freeze();
else if (command === "validate") await validateFrozen();
else {
  throw new Error(
    "usage: prepare-assessment-production-post-canary-batch-06-inventory.mjs <freeze|validate>"
  );
}
