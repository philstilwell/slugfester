#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";

import {
  candidateShardedInventoryPlanSha256,
  validateCandidateShardedInventoryPlan,
} from "./lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";
import { auditDecomposedStrictSchema } from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";
import { V212_CANDIDATE_SHARDED_INVENTORY } from "./lib/assessment-production-score-stability-v2.1.2-inventory-preparation.mjs";
import {
  CHRONOLOGY_FALLBACK_INVENTORY,
  buildChronologyFallbackSideSelectionSchema,
} from "./lib/assessment-production-score-stability-v2.1.2-inventory-chronology-fallback.mjs";
import {
  POST_CANARY_BATCH_17_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch17StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-17-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-17/inventory-candidate-sharded";
const SOURCE_PREPARATION = `${ROOT}/preparation-manifest.json`;
const BATCH_SOURCE_PREPARATION =
  "docs/assessment-production/post-canary-continuation-v1/batch-17/source-preparation/preparation-manifest.json";
const PLAN_ACTIVATION = `${ROOT}/plan-execution-activation.json`;
const PLAN_EXECUTION = `${ROOT}/plan-model-execution.json`;
const PLAN_ANALYSIS = `${ROOT}/plan-analysis.json`;
const SIDE_PREPARATION = `${ROOT}/side-packet-preparation-manifest.json`;
const EXECUTION_PREPARATION = `${ROOT}/side-execution-preparation-manifest.json`;
const EXECUTION_ACTIVATION = `${ROOT}/side-execution-activation.json`;
const MODEL_EXECUTION = `${ROOT}/side-model-execution.json`;
const INVENTORY_ANALYSIS = `${ROOT}/inventory-analysis.json`;
const GUIDE = `${ROOT}/candidate-sharded-inventory-guide.md`;
const MANUAL =
  "docs/calibration/v4.2.21.16/decomposed-consensus-contract/inventory-manual.md";
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const ACTIVE_POLICY =
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const ACTIVE_SCORE_CONTROL =
  "scripts/lib/assessment-production-score-stability-policy-active.mjs";
const ACTIVE_SCORE_CONTROL_TEST =
  "scripts/test-assessment-production-score-stability-policy-active.mjs";
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const RUBRIC = "docs/reassessment-rubric-v2.1.md";
const SCRIPT =
  "scripts/prepare-assessment-production-post-canary-batch-17-inventory-side-packets.mjs";
const PLAN_RUNNER =
  "scripts/run-assessment-production-post-canary-batch-17-inventory-plans.mjs";
const PROTOCOL_ID =
  "assessment-production-post-canary-batch-17-candidate-sharded-inventory";
const DEBATES = ["77", "44", "171", "62"];
const EXPECTED_CANDIDATES = 153;
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
async function hashFiles(files) {
  const hashes = {};
  for (const file of [...new Set(files)].sort()) {
    hashes[file] = sha256(await readFile(file));
  }
  return hashes;
}

async function assertHashes(hashes, label) {
  for (const [file, digest] of Object.entries(hashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${label}/${file}: hash drifted`);
  }
}

function makeSidePacket({
  prepared,
  side,
  sideAsset,
  plan,
  planBytes,
  schemaPath,
  schemaBytes,
  sourcePacketBytes,
  sideTransportBytes,
  guideBytes,
  manualBytes,
}) {
  const copiedInputs = [
    {
      role: "inventory-source-packet",
      path: prepared.inventorySourcePacket,
      sha256: sha256(sourcePacketBytes),
      bytes: sourcePacketBytes.length,
    },
    {
      role: "immutable-candidate-census-plan",
      path: prepared.planOutput,
      sha256: sha256(planBytes),
      canonicalSha256: candidateShardedInventoryPlanSha256(plan),
      bytes: planBytes.length,
    },
    {
      role: `${side}-complete-candidate-evidence-transport`,
      path: sideAsset.transport,
      sha256: sha256(sideTransportBytes),
      bytes: sideTransportBytes.length,
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
      path: schemaPath,
      sha256: sha256(schemaBytes),
      bytes: schemaBytes.length,
    },
  ];
  return {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-17-chronology-fallback-side-selector-packet",
    protocolId: PROTOCOL_ID,
    sideSelectionProtocolId: CHRONOLOGY_FALLBACK_INVENTORY.protocolId,
    stage: `${side}-candidate-evidence-selection-with-chronology-fallback`,
    debateNumber: prepared.debateNumber,
    debateId: prepared.debateId,
    side,
    model: {
      label: "5.6 Sol",
      slug: "gpt-5.6-sol",
      reasoningEffort: "low",
      authentication: "ChatGPT subscription",
      scoreBlind: true,
      roundedIntegerScoreTiesPermitted: true,
    },
    isolation: {
      freshContextRequired: true,
      oneDebateOnly: true,
      oneSideOnly: true,
      scoreBlind: true,
      routesAndSectionsImmutable: true,
      otherSideCandidateEvidenceUnavailable: true,
      otherSideSelectorOutputUnavailable: true,
      plannerExecutionMetadataUnavailable: true,
      failedProductionCanaryOutputsUnavailable: true,
      validationCohortOutputsUnavailable: true,
      preferredMoveKindRequired: true,
      constructiveOrphanFallbackRequired: true,
      fallbackConditionRepositoryOwned: true,
      priorAndOtherJudgmentsUnavailable: true,
      legacyAssessmentsScoresWinnersTagsAndPublicationProseUnavailable: true,
    },
    immutablePlanCanonicalSha256: candidateShardedInventoryPlanSha256(plan),
    copiedInputs,
    copiedInputBytes: copiedInputs.reduce((sum, input) => sum + input.bytes, 0),
    maximumCopiedInputBytes:
      V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
    writableDomains: ["candidateSelections"],
    output: sideAsset.output,
    attemptsMaximum: 1,
    retries: 0,
    timeoutExtensions: 0,
    modelExecutionAuthorized: false,
  };
}

async function buildArtifacts({ frozenAt, checkpointCommit }) {
  const standingAuthorization =
    await loadAndValidatePostCanaryBatch17StandingAuthorization();
  const [
    sourcePreparationBytes,
    planActivationBytes,
    planExecutionBytes,
    planAnalysisBytes,
    guideBytes,
    manualBytes,
    productionManifestBytes,
    activePolicyBytes,
    batchSourcePreparationBytes,
  ] = await Promise.all([
    readFile(SOURCE_PREPARATION),
    readFile(PLAN_ACTIVATION),
    readFile(PLAN_EXECUTION),
    readFile(PLAN_ANALYSIS),
    readFile(GUIDE),
    readFile(MANUAL),
    readFile(PRODUCTION_MANIFEST),
    readFile(ACTIVE_POLICY),
    readFile(BATCH_SOURCE_PREPARATION),
  ]);
  const sourcePreparation = JSON.parse(sourcePreparationBytes);
  const planActivation = JSON.parse(planActivationBytes);
  const planExecution = JSON.parse(planExecutionBytes);
  const planAnalysis = JSON.parse(planAnalysisBytes);
  const productionManifest = JSON.parse(productionManifestBytes);
  const batchSourcePreparation = JSON.parse(batchSourcePreparationBytes);

  assertV4(
    sourcePreparation.schemaVersion ===
      "1.0-assessment-production-post-canary-batch-17-candidate-sharded-inventory-preparation" &&
      sourcePreparation.protocolId === PROTOCOL_ID &&
      sourcePreparation.sideSelectionProtocolId ===
        CHRONOLOGY_FALLBACK_INVENTORY.protocolId &&
      sourcePreparation.status ===
        "post-canary-batch-17-candidate-sharded-source-assets-and-four-planner-packets-frozen" &&
      sourcePreparation.productionContinuation === true &&
      sourcePreparation.productionCanary === false &&
      sourcePreparation.developmentValidationOnly === false &&
      sourcePreparation.stagingOnly === true &&
      sourcePreparation.AIOnly === true &&
      JSON.stringify(sourcePreparation.selectedDebates) === JSON.stringify(DEBATES) &&
      sourcePreparation.contexts.length === 4 &&
      sourcePreparation.totals.candidates === EXPECTED_CANDIDATES &&
      sourcePreparation.totals.proCandidates === 81 &&
      sourcePreparation.totals.conCandidates === 72 &&
      sourcePreparation.sourceCompatibility.status ===
        "all-source-rows-have-positive-repository-lexical-token-count" &&
      sourcePreparation.sourceCompatibility.sourceRowsInjected === 0 &&
      sourcePreparation.sourceCompatibility.sourceRowsOmitted === 0 &&
      sourcePreparation.sourceCompatibility.sourceRowsRewritten === 0 &&
      sourcePreparation.sourceCompatibility.minimumCandidateLexicalTokensChanged ===
        false &&
      sourcePreparation.sourceCompatibility.occurrences.length === 0 &&
      sourcePreparation.userAuthorization.standingAuthorization ===
        POST_CANARY_BATCH_17_STANDING_AUTHORIZATION &&
      sourcePreparation.userAuthorization.standingAuthorizationSha256 ===
        standingAuthorization.sha256 &&
      sourcePreparation.totals.exactSidePacketsFrozen === 0 &&
      sourcePreparation.totals.scoresDerived === 0 &&
      sourcePreparation.totals.productionMutations === 0 &&
      sourcePreparation.activePolicy.version === "v2.2" &&
      sourcePreparation.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie ===
        true &&
      sourcePreparation.activePolicy.agreedInitialTieImposesNoDirectionConstraint ===
        true &&
      sourcePreparation.activePolicy.numericalThresholdsChanged === false &&
      sourcePreparation.activePolicy.scorePassesMaximum === 1 &&
      sourcePreparation.validatedInventoryContract.planAndSideIsolationPreserved ===
        true &&
      sourcePreparation.validatedInventoryContract.fallbackConditionRepositoryOwned ===
        true &&
      sourcePreparation.validatedInventoryContract.fallbackAppliedOnlyToRetainedOrphanReply ===
        true &&
      sourcePreparation.validatedInventoryContract.scoreFieldsAvailable === false &&
      sourcePreparation.model.label === "5.6 Sol" &&
      sourcePreparation.model.slug === "gpt-5.6-sol" &&
      sourcePreparation.model.reasoningEffort === "low" &&
      sourcePreparation.model.authentication === "ChatGPT subscription" &&
      sourcePreparation.model.scoreBlind === true &&
      sourcePreparation.model.roundedIntegerScoreTiesPermitted === true &&
      allBooleanLeavesTrue(sourcePreparation.stopRules),
    "Batch 17 source preparation boundary drifted"
  );
  await assertHashes(sourcePreparation.sourceHashes, "source-preparation");
  assertV4(
      planActivation.status ===
      "frozen-four-post-canary-batch-17-candidate-census-plan-contexts-authorized" &&
      planExecution.status ===
        "four-post-canary-batch-17-candidate-census-plan-contexts-passed" &&
      planExecution.contextsPlanned === 4 &&
      planExecution.contextsAttempted === 4 &&
      planExecution.validContexts === 4 &&
      planExecution.invalidContexts === 0 &&
      planExecution.attempts === 4 &&
      planExecution.retries === 0 &&
      planExecution.timeoutExtensions === 0 &&
      planExecution.semanticCorrections === 0 &&
      planExecution.authentication === "ChatGPT subscription" &&
      planExecution.scoreBlind === true &&
      planExecution.integerRoundedTiesPermitted === true &&
      planExecution.directIncrementalCostUsd === 0 &&
      planExecution.meteredApiCostUsd === 0 &&
      planExecution.transcriptionCostUsd === 0 &&
      planExecution.audioCalls === 0 &&
      planExecution.scoresDerived === 0 &&
      planExecution.productionMutations === 0 &&
      planAnalysis.status ===
        "post-canary-batch-17-candidate-census-plan-gate-passed-standing-authorization-active-for-side-packet-preparation" &&
      planAnalysis.plans.length === 4 &&
      planAnalysis.audit.everyPlanSchemaAndSemanticValidationPassed === true &&
      planAnalysis.audit.everyPlanCanonicalHashReplayed === true &&
      planAnalysis.audit.everyPlanHasOneRoutePerSide === true &&
      planAnalysis.audit.everyPlanHasFourToSixSections === true &&
      planAnalysis.audit.everyPlanWeightsTotalOneHundred === true &&
      planAnalysis.audit.boundedFirstRecoveryUsed === undefined &&
      planAnalysis.audit.recoveredDebate === undefined &&
      planAnalysis.audit.minimumFieldDisjointShardCount === undefined &&
      planAnalysis.audit.originalFailedPartialOutputReused === undefined &&
      planAnalysis.audit.nineOriginalAcceptedPlansByteIdentical === undefined &&
      planAnalysis.audit.exactSourceRowsInjectedOmittedOrRewritten === false &&
      planAnalysis.audit.exactSidePacketsFrozen === 0 &&
      planAnalysis.audit.sideSelectorModelsExecuted === 0 &&
      planAnalysis.audit.judgmentModelsExecuted === 0 &&
      planAnalysis.audit.audioCalls === 0 &&
      planAnalysis.audit.scoresDerived === 0 &&
      planAnalysis.audit.productionMutations === 0 &&
      planAnalysis.authorization.exactSidePacketPreparation === false &&
      planAnalysis.authorization.sideSelectorExecutionManifestPreparation ===
        false &&
      planAnalysis.authorization.sideSelectorModelExecution === false &&
      planAnalysis.authorization.independentJudgmentModelExecution === false &&
      planAnalysis.authorization.paidTranscription === false &&
      planAnalysis.authorization.scoreDerivation === false &&
      planAnalysis.authorization.productionMutation === false &&
      planAnalysis.nextAuthorizedAction ===
        "prepare-freeze-and-activate-eight-exact-batch-17-side-selector-packets-under-standing-authorization",
    "accepted Batch 17 planner gate drifted"
  );
  assertV4(
    isDeepStrictEqual(
      planActivation.sourceCompatibility,
      sourcePreparation.sourceCompatibility
    ) &&
      isDeepStrictEqual(
        planAnalysis.sourceCompatibility,
        sourcePreparation.sourceCompatibility
      ),
    "Batch 17 source compatibility boundary drifted"
  );
  await assertHashes(planAnalysis.sourceHashes, "plan-analysis");
  assertV4(
    planActivation.model.label === "5.6 Sol" &&
      planActivation.model.slug === "gpt-5.6-sol" &&
      planActivation.model.reasoningEffort === "low" &&
      planActivation.model.authentication === "ChatGPT subscription" &&
      planActivation.model.scoreBlind === true &&
      planActivation.model.roundedIntegerScoreTiesPermitted === true,
    "planner model boundary drifted"
  );
  assertV4(
    productionManifest.schemaVersion ===
      "1.0-adjudicated-consensus-production-manifest" &&
      productionManifest.status ===
        "frozen-cohort-pending-ten-debate-canary-selection" &&
      sha256(batchSourcePreparationBytes) ===
        sourcePreparation.inputs.sourcePreparationSha256 &&
      batchSourcePreparation.sourceHashes[PRODUCTION_MANIFEST] ===
        sha256(productionManifestBytes) &&
      sourcePreparation.activePolicy.promotionSha256 === sha256(activePolicyBytes),
    "production manifest or active policy drifted"
  );

  const generated = new Map();
  const contexts = [];
  for (const prepared of sourcePreparation.contexts) {
    const planRecord = planAnalysis.plans.find(
      (item) => item.debateNumber === prepared.debateNumber
    );
    const [
      planBytes,
      sourcePacketBytes,
      legacySchema,
      fullTransport,
      candidateCensus,
    ] = await Promise.all([
      readFile(prepared.planOutput),
      readFile(prepared.inventorySourcePacket),
      readFile(prepared.compilerSchema, "utf8").then(JSON.parse),
      readFile(prepared.fullCandidateTransport, "utf8").then(JSON.parse),
      readFile(prepared.candidateCensus, "utf8").then(JSON.parse),
    ]);
    const plan = JSON.parse(planBytes);
    assertV4(
      planRecord &&
        planRecord.output === prepared.planOutput &&
        sha256(planBytes) === planRecord.outputSha256 &&
        candidateShardedInventoryPlanSha256(plan) ===
          planRecord.canonicalSha256 &&
        planRecord.routes === 2 &&
        planRecord.sections >= 4 &&
        planRecord.sections <= 6 &&
        planRecord.weightPercentTotal === 100,
      `${prepared.debateNumber}: immutable accepted plan drifted`
    );
    validateCandidateShardedInventoryPlan({
      plan,
      legacySchema,
      candidateTransport: fullTransport,
      candidateCensus,
    });
    for (const side of ["pro", "con"]) {
      const sideAsset = prepared.sideAssets.find((asset) => asset.side === side);
      assertV4(
        sideAsset &&
          sideAsset.exactSchemaDeferredUntilAcceptedPlan === true &&
          sideAsset.exactPacketDeferredUntilAcceptedPlan === true &&
          sideAsset.prototypeExecutable === false &&
          sideAsset.preferredMoveKindRequired === true &&
          sideAsset.constructiveOrphanFallbackRequired === true &&
          sideAsset.fallbackConditionRepositoryOwned === true,
        `${prepared.debateNumber}/${side}: frozen side asset drifted`
      );
      const sideTransportBytes = await readFile(sideAsset.transport);
      assertV4(
        sha256(sideTransportBytes) === sideAsset.transportSha256 &&
          sideTransportBytes.length === sideAsset.transportBytes,
        `${prepared.debateNumber}/${side}: side transport drifted`
      );
      const sideTransport = JSON.parse(sideTransportBytes);
      const schema = buildChronologyFallbackSideSelectionSchema({
        side,
        legacySchema,
        candidateTransport: fullTransport,
        sideCandidateTransport: sideTransport,
        candidateCensus,
        plan,
      });
      const schemaAudit = auditDecomposedStrictSchema(schema);
      const schemaBytes = compactJsonBytes(schema);
      const schemaPath =
        `${ROOT}/schemas/sides/debate-${prepared.debateNumber}-${side}.schema.json`;
      const packetPath =
        `${ROOT}/packets/sides/debate-${prepared.debateNumber}-${side}.json`;
      const packet = makeSidePacket({
        prepared,
        side,
        sideAsset,
        plan,
        planBytes,
        schemaPath,
        schemaBytes,
        sourcePacketBytes,
        sideTransportBytes,
        guideBytes,
        manualBytes,
      });
      const packetBytes = prettyJsonBytes(packet);
      const selection = schema.$defs.candidateSelection;
      const expectedSectionIds = plan.sections.map((section) => section.sectionId);
      assertV4(
        schemaAudit.nullableCandidateProperties === sideAsset.candidates &&
          schema.properties.inventoryPlanSha256.const ===
            candidateShardedInventoryPlanSha256(plan) &&
          isDeepStrictEqual(
            schema.$defs.candidateSelection.properties.sectionId.enum,
            expectedSectionIds
          ) &&
          selection.required.includes("preferredMoveKind") &&
          selection.required.includes("orphanFallback") &&
          selection.properties.orphanFallback.properties.moveKind.const ===
            "constructive" &&
          packet.copiedInputBytes <=
            V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes &&
          canonicalJson(JSON.parse(schemaBytes)) === canonicalJson(schema),
        `${prepared.debateNumber}/${side}: exact schema or packet drifted`
      );
      generated.set(schemaPath, schemaBytes);
      generated.set(packetPath, packetBytes);
      contexts.push({
        contextIndex: contexts.length,
        stage: `${side}-candidate-evidence-selection-with-chronology-fallback`,
        debateNumber: prepared.debateNumber,
        debateId: prepared.debateId,
        family: prepared.family,
        sourceComplexityBand: prepared.sourceComplexityBand,
        side,
        candidates: sideAsset.candidates,
        immutablePlan: prepared.planOutput,
        immutablePlanSha256: sha256(planBytes),
        immutablePlanCanonicalSha256:
          candidateShardedInventoryPlanSha256(plan),
        sideTransport: sideAsset.transport,
        sideTransportSha256: sha256(sideTransportBytes),
        exactSchema: schemaPath,
        exactSchemaSha256: sha256(schemaBytes),
        exactSchemaBytes: schemaBytes.length,
        packet: packetPath,
        packetSha256: sha256(packetBytes),
        packetBytes: packetBytes.length,
        copiedInputs: structuredClone(packet.copiedInputs),
        copiedInputBytes: packet.copiedInputBytes,
        output: sideAsset.output,
        attemptsMaximum: 1,
        retries: 0,
        timeoutExtensions: 0,
        modelExecutionAuthorized: false,
        preferredMoveKindRequired: true,
        constructiveOrphanFallbackRequired: true,
        fallbackConditionRepositoryOwned: true,
      });
    }
  }
  assertV4(
    contexts.length === 8 &&
      contexts.filter((context) => context.side === "pro").length === 4 &&
      contexts.filter((context) => context.side === "con").length === 4 &&
      contexts.reduce((sum, context) => sum + context.candidates, 0) ===
        EXPECTED_CANDIDATES &&
      isDeepStrictEqual(
        [...new Set(contexts.map((context) => context.debateNumber))],
        DEBATES
      ),
    "exact side-selector context totals drifted"
  );

  const sourceFiles = [
    ...Object.keys(planActivation.sourceHashes),
    ...Object.keys(planAnalysis.sourceHashes),
    SOURCE_PREPARATION,
    PLAN_ACTIVATION,
    PLAN_EXECUTION,
    PLAN_ANALYSIS,
    GUIDE,
    MANUAL,
    PRODUCTION_MANIFEST,
    BATCH_SOURCE_PREPARATION,
    ACTIVE_POLICY,
    ACTIVE_SCORE_CONTROL,
    ACTIVE_SCORE_CONTROL_TEST,
    PRODUCTION_WORKFLOW,
    READINESS_WORKFLOW,
    RUBRIC,
    "scripts/lib/reassessment-scoring.mjs",
    "scripts/validate-debates.mjs",
    "scripts/lib/v4-lean-production.mjs",
    "scripts/lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs",
    "scripts/lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs",
    "scripts/lib/assessment-production-score-stability-v2.1.2-inventory-preparation.mjs",
    "scripts/lib/assessment-production-score-stability-v2.1.2-inventory-chronology-fallback.mjs",
    "scripts/lib/assessment-production-post-canary-batch-17-standing-authorization.mjs",
    POST_CANARY_BATCH_17_STANDING_AUTHORIZATION,
    PLAN_RUNNER,
    SCRIPT,
    ...sourcePreparation.contexts.flatMap((context) => [
      context.planOutput,
      context.inventorySourcePacket,
      context.fullCandidateTransport,
      context.candidateCensus,
      context.compilerSchema,
      ...context.sideAssets.map((asset) => asset.transport),
    ]),
  ];
  const sourceHashes = await hashFiles(sourceFiles);
  const futureOutputs = [
    EXECUTION_ACTIVATION,
    MODEL_EXECUTION,
    INVENTORY_ANALYSIS,
    ...sourcePreparation.contexts.flatMap((context) => [
      ...context.sideAssets.map((asset) => asset.output),
      context.inventoryProposalOutput,
      context.lockedInventoryOutput,
      context.validationOutput,
      context.provenanceOutput,
    ]),
  ];
  for (const file of futureOutputs) {
    assertV4(!(await exists(file)), `future output already exists: ${file}`);
  }
  const maximumCopiedInputBytes = Math.max(
    ...contexts.map((context) => context.copiedInputBytes)
  );
  const minimumCopiedInputBytes = Math.min(
    ...contexts.map((context) => context.copiedInputBytes)
  );
  const standingScope =
    "prepare, freeze, activate, and execute exactly eight Batch 17 score-blind side-selector contexts under the frozen standing authorization";
  const sidePreparation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-17-chronology-fallback-side-packet-preparation",
    protocolId: PROTOCOL_ID,
    sideSelectionProtocolId: CHRONOLOGY_FALLBACK_INVENTORY.protocolId,
    status:
      "eight-exact-post-canary-batch-17-side-selector-packets-frozen-not-authorized",
    frozenAt,
    checkpointCommit,
    branch: "main",
    productionContinuation: true,
    developmentValidationOnly: false,
    productionCanary: false,
    stagingOnly: true,
    AIOnly: true,
    selectedDebates: DEBATES,
    userAuthorization: {
      scope: standingScope,
      standingAuthorization: POST_CANARY_BATCH_17_STANDING_AUTHORIZATION,
      standingAuthorizationSha256: standingAuthorization.sha256,
      thisArtifactActivatesModelExecution: false,
      directIncrementalCostCapUsd: 0,
      exactSidePacketPreparationAuthorized: true,
      sideSelectorExecutionPreparationManifestAuthorized: true,
      sideSelectorModelExecutionAuthorized: false,
      judgmentModelExecutionAuthorized: false,
      paidServicesAuthorized: false,
    },
    discoveryDisposition: structuredClone(sourcePreparation.discoveryDisposition),
    sourceCompatibility: structuredClone(sourcePreparation.sourceCompatibility),
    plannerGate: {
      activation: PLAN_ACTIVATION,
      activationSha256: sha256(planActivationBytes),
      execution: PLAN_EXECUTION,
      executionSha256: sha256(planExecutionBytes),
      analysis: PLAN_ANALYSIS,
      analysisSha256: sha256(planAnalysisBytes),
      fourAcceptedPlans: true,
      retries: 0,
      timeoutExtensions: 0,
      directIncrementalCostUsd: 0,
    },
    activePolicy: structuredClone(sourcePreparation.activePolicy),
    validatedInventoryContract: structuredClone(
      sourcePreparation.validatedInventoryContract
    ),
    model: {
      label: "5.6 Sol",
      slug: "gpt-5.6-sol",
      reasoningEffort: "low",
      authentication: "ChatGPT subscription",
      scoreBlind: true,
      roundedIntegerScoreTiesPermitted: true,
      apiKeysRemovedForAnyLaterExecution: true,
      meteredApiCostUsdMaximum: 0,
    },
    scheduling: {
      sideSelectorConcurrencyRamp: [1, 2],
      sideSelectorConcurrencyMaximum: 2,
      oneAttemptPerContext: true,
      retries: 0,
      timeoutExtensions: 0,
    },
    inputs: {
      sourcePreparation: SOURCE_PREPARATION,
      sourcePreparationSha256: sha256(sourcePreparationBytes),
      planActivation: PLAN_ACTIVATION,
      planActivationSha256: sha256(planActivationBytes),
      planExecution: PLAN_EXECUTION,
      planExecutionSha256: sha256(planExecutionBytes),
      planAnalysis: PLAN_ANALYSIS,
      planAnalysisSha256: sha256(planAnalysisBytes),
      candidateShardedGuide: GUIDE,
      candidateShardedGuideSha256: sha256(guideBytes),
      inventoryManual: MANUAL,
      inventoryManualSha256: sha256(manualBytes),
      productionManifest: PRODUCTION_MANIFEST,
      productionManifestSha256: sha256(productionManifestBytes),
      batchSourcePreparation: BATCH_SOURCE_PREPARATION,
      batchSourcePreparationSha256: sha256(batchSourcePreparationBytes),
      activePolicy: ACTIVE_POLICY,
      activePolicySha256: sha256(activePolicyBytes),
    },
    contexts,
    isolation: {
      oneDebatePerContext: true,
      oneSidePerContext: true,
      freshContextPerSide: true,
      scoreBlind: true,
      immutablePlanSharedAcrossSides: true,
      sideSelectorsMutuallyIsolated: true,
      otherSideCandidateEvidenceUnavailable: true,
      otherSideSelectorOutputUnavailable: true,
      plannerExecutionMetadataUnavailable: true,
      failedProductionCanaryOutputsUnavailable: true,
      validationCohortOutputsUnavailable: true,
      priorExecutionMetadataUnavailable: true,
      otherDebatesUnavailable: true,
      legacyAssessmentsUnavailable: true,
      independentJudgmentsUnavailable: true,
      ratingsScoresWinnersTagsAndPublicationProseUnavailable: true,
    },
    exactBinding: {
      everySchemaBindsAcceptedCanonicalPlanHash: true,
      everySchemaEnumeratesAcceptedPlanSectionIds: true,
      everySchemaBindsCorrespondingSideTransportHash: true,
      everyPacketContainsOnlyOneSideTransport: true,
      completeSideCandidateCohortRetained: true,
      semanticCandidateDownselectionPerformed: false,
      exactSchemasExecutableOnlyAfterSeparateActivation: true,
      prototypeSchemasExecutable: false,
      preferredMoveKindRequiredInEveryNomination: true,
      constructiveOrphanFallbackRequiredInEveryNomination: true,
      fallbackConditionRepositoryOwned: true,
      fallbackAppliedOnlyToRetainedOrphanReply: true,
      minimumCopiedInputBytes,
      maximumCopiedInputBytes,
      provenCeilingBytes:
        V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
    },
    stopRules: {
      ...structuredClone(planActivation.stopRules),
      sidePacketPreparationHashMismatchBlocks: true,
      acceptedPlanHashMismatchBlocks: true,
      exactSideSchemaHashMismatchBlocks: true,
      crossSideEvidenceContaminationBlocks: true,
      sideModelExecutionBeforeSeparateActivationBlocks: true,
      retryBlocks: true,
      timeoutExtensionBlocks: true,
    },
    totals: {
      debates: 4,
      exactSideSchemasFrozen: 8,
      exactSidePacketsFrozen: 8,
      proContexts: 4,
      conContexts: 4,
      candidatesTransported: EXPECTED_CANDIDATES,
      modelContextsExecuted: 0,
      sideSelectorModelContextsExecuted: 0,
      judgmentModelContextsExecuted: 0,
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
    futureOutputPathsExcludedFromSourceHashes: futureOutputs,
    sourceHashes,
    authorization: {
      deterministicValidation: true,
      sideSelectorExecutionManifestPreparation: true,
      sideSelectorExecutionActivation: false,
      sideSelectorModelExecution: false,
      inventoryCompilation: false,
      inventoryAnalysis: false,
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
    nextRequiredAction:
      "freeze-batch-17-side-selector-execution-preparation-manifest-model-free-only",
  };
  const sidePreparationBytes = prettyJsonBytes(sidePreparation);

  const executionContexts = contexts.map((context) => ({
    contextIndex: context.contextIndex,
    stage: context.stage,
    debateNumber: context.debateNumber,
    debateId: context.debateId,
    family: context.family,
    sourceComplexityBand: context.sourceComplexityBand,
    side: context.side,
    candidates: context.candidates,
    packet: context.packet,
    packetSha256: context.packetSha256,
    packetBytes: context.packetBytes,
    copiedInputs: structuredClone(context.copiedInputs),
    copiedInputBytes: context.copiedInputBytes,
    maximumCopiedInputBytes:
      V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
    writableDomains: ["candidateSelections"],
    strictOutputSchema: context.exactSchema,
    strictOutputSchemaSha256: context.exactSchemaSha256,
    immutablePlanCanonicalSha256: context.immutablePlanCanonicalSha256,
    output: context.output,
    attemptsMaximum: 1,
    retries: 0,
    timeoutExtensions: 0,
    modelExecutionAuthorized: false,
    preferredMoveKindRequired: true,
    constructiveOrphanFallbackRequired: true,
    fallbackConditionRepositoryOwned: true,
  }));
  const executionSourceFiles = [
    ...Object.keys(sourceHashes),
    SIDE_PREPARATION,
    ...contexts.flatMap((context) => [context.packet, context.exactSchema]),
  ];
  const executionSourceHashes = {};
  for (const file of [...new Set(executionSourceFiles)].sort()) {
    if (file === SIDE_PREPARATION) {
      executionSourceHashes[file] = sha256(sidePreparationBytes);
    } else if (generated.has(file)) {
      executionSourceHashes[file] = sha256(generated.get(file));
    } else {
      executionSourceHashes[file] = sha256(await readFile(file));
    }
  }
  const codexPath = "/Applications/ChatGPT.app/Contents/Resources/codex";
  const codexCliVersion = execFileSync(codexPath, ["--version"], {
    encoding: "utf8",
  }).trim();
  const executionPreparation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-17-side-selector-execution-preparation-manifest",
    protocolId: PROTOCOL_ID,
    sideSelectionProtocolId: CHRONOLOGY_FALLBACK_INVENTORY.protocolId,
    status:
      "frozen-eight-post-canary-batch-17-side-selector-contexts-prepared-not-authorized",
    frozenAt,
    checkpointCommit,
    branch: "main",
    productionContinuation: true,
    developmentValidationOnly: false,
    productionCanary: false,
    stagingOnly: true,
    AIOnly: true,
    selectedDebates: DEBATES,
    userAuthorization: {
      scope: standingScope,
      standingAuthorization: POST_CANARY_BATCH_17_STANDING_AUTHORIZATION,
      standingAuthorizationSha256: standingAuthorization.sha256,
      thisArtifactActivatesModelExecution: false,
      directIncrementalCostCapUsd: 0,
      sideSelectorExecutionPreparationManifestAuthorized: true,
      sideSelectorExecutionActivationAuthorized: false,
      sideSelectorModelExecutionAuthorized: false,
      judgmentModelExecutionAuthorized: false,
      paidServicesAuthorized: false,
    },
    activePolicy: structuredClone(sidePreparation.activePolicy),
    sourceCompatibility: structuredClone(sidePreparation.sourceCompatibility),
    validatedInventoryContract: structuredClone(
      sidePreparation.validatedInventoryContract
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
      contexts: 8,
      expectedParallelWallMinutes: [4, 12],
      expectedAggregateModelMinutes: [18, 40],
      expectedAggregateComputeHours: [0.3, 0.67],
      absoluteStageTimeoutMinutes: 120,
      estimateBasis:
        "The promoted side-selector gate established the one-side isolated context shape. Batch 17 freezes eight such contexts and records the exact packet sizes against the proven 115,000-byte input ceiling. ChatGPT-subscription execution has no direct incremental API charge.",
    },
    executionEnvironment: {
      codexPath,
      codexCliVersion,
      authentication: "ChatGPT subscription",
      APIKeysRemoved: true,
      isolatedTemporaryCodexHomes: true,
    },
    sidePacketPreparation: SIDE_PREPARATION,
    sidePacketPreparationSha256: sha256(sidePreparationBytes),
    contexts: executionContexts,
    isolation: structuredClone(sidePreparation.isolation),
    executionPolicy: {
      stage: "chronology-fallback-candidate-evidence-side-selection",
      contexts: 8,
      attemptsPerContext: 1,
      retriesMaximum: 0,
      timeoutMsPerContext: 600000,
      timeoutExtensionsMaximum: 0,
      absoluteStageTimeoutMs: 7200000,
      copiedInputBytesMaximum:
        V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
      observedMaximumCopiedInputBytes: maximumCopiedInputBytes,
      maximumParallelContexts: 2,
      schedulerRamp: [1, 2],
      rampOneServesAsOperationalCanary: true,
      eachRampPhaseMustPassBeforeExpansion: true,
      abortBeforeStartingAdditionalContextOnAnyFailure: true,
      allowAlreadyRunningIndependentContextToFinish: true,
      allEightSelectorsMustPassBeforeInventoryCompilation: true,
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
      exactContextCountRequired: 8,
      everyContextMustCompleteOnItsSingleAttempt: true,
      everyOutputMustValidateAgainstFrozenStrictSchema: true,
      everyOutputMustPassDeterministicSemanticValidation: true,
      writableDomainLimitedToCandidateSelections: true,
      immutablePlanAndSideTransportHashesRequired: true,
      preferredMoveKindRequiredInEveryNomination: true,
      constructiveOrphanFallbackRequiredInEveryNomination: true,
      fallbackConditionRepositoryOwned: true,
      fallbackAppliedOnlyToRetainedOrphanReply: true,
      missingSectionSideCoverageFailsClosed: true,
      partialSideSelectorGateAcceptance: false,
      automaticSemanticCorrection: false,
      inventoryCompilationDeferredUntilAllSelectorsAccepted: true,
      scoresDerived: false,
    },
    stopRules: {
      ...structuredClone(sidePreparation.stopRules),
      sideExecutionPreparationHashMismatchBlocks: true,
      activationHashMismatchBlocks: true,
      invalidSelectorOutputBlocksEntireInventoryGate: true,
      selectorTimeoutBlocksEntireInventoryGate: true,
      selectorContextFailureBlocksEntireInventoryGate: true,
      inventoryCompilationBeforeEightAcceptedSelectorsBlocks: true,
      retryBlocks: true,
      timeoutExtensionBlocks: true,
    },
    totals: {
      debates: 4,
      sideContextsPrepared: 8,
      sideContextsAuthorized: 0,
      sideContextsExecuted: 0,
      acceptedSideSelections: 0,
      candidatesTransported: EXPECTED_CANDIDATES,
      inventoryProposalsCompiled: 0,
      lockedInventoriesCompiled: 0,
      sideSelectorModelContextsExecuted: 0,
      judgmentModelContextsExecuted: 0,
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
      executionActivationPreparation: false,
      sideSelectorModelContexts: false,
      deterministicSideValidation: false,
      inventoryCompilation: false,
      inventoryAnalysis: false,
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
      activation: EXECUTION_ACTIVATION,
      execution: MODEL_EXECUTION,
      analysis: INVENTORY_ANALYSIS,
      sideSelections: executionContexts.map((context) => context.output),
    },
    futureOutputPathsExcludedFromSourceHashes: futureOutputs,
    sourceHashes: executionSourceHashes,
    nextAuthorizedAction:
      "freeze-and-activate-batch-17-side-selector-execution-under-standing-authorization",
  };
  const executionPreparationBytes = prettyJsonBytes(executionPreparation);
  return {
    generated,
    contexts,
    sidePreparation,
    sidePreparationBytes,
    executionPreparation,
    executionPreparationBytes,
    futureOutputs,
  };
}

async function prepare() {
  const shouldWrite = process.argv.includes("--write");
  const frozenIndex = process.argv.indexOf("--frozen-at");
  const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
  assertV4(
    frozenAt && !Number.isNaN(Date.parse(frozenAt)),
    "--frozen-at requires an ISO timestamp"
  );
  const checkpointCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const artifacts = await buildArtifacts({ frozenAt, checkpointCommit });
  const immutableOutputs = [
    SIDE_PREPARATION,
    EXECUTION_PREPARATION,
    ...artifacts.generated.keys(),
  ];
  for (const file of immutableOutputs) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
  if (shouldWrite) {
    for (const [file, bytes] of artifacts.generated) {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes);
    }
    await writeFile(SIDE_PREPARATION, artifacts.sidePreparationBytes);
    await writeFile(EXECUTION_PREPARATION, artifacts.executionPreparationBytes);
  }
  console.log(
    JSON.stringify(
      {
        status: shouldWrite
          ? artifacts.executionPreparation.status
          : "preview",
        debates: 4,
        contexts: 8,
        exactSideSchemasFrozen: shouldWrite ? 8 : 0,
        exactSidePacketsFrozen: shouldWrite ? 8 : 0,
        candidatesTransported: EXPECTED_CANDIDATES,
        copiedInputBytes: {
          minimum:
            artifacts.sidePreparation.exactBinding.minimumCopiedInputBytes,
          maximum:
            artifacts.sidePreparation.exactBinding.maximumCopiedInputBytes,
          ceiling:
            artifacts.sidePreparation.exactBinding.provenCeilingBytes,
        },
        modelContextsExecuted: 0,
        sideSelectorModelContextsAuthorized: false,
        judgmentModelContextsAuthorized: false,
        paidServiceCalls: 0,
        directIncrementalCostUsd: 0,
        scoresDerived: 0,
        productionMutations: 0,
        nextAuthorizedAction:
          artifacts.executionPreparation.nextAuthorizedAction,
      },
      null,
      2
    )
  );
}

async function validate() {
  const [sidePreparationBytes, executionPreparationBytes] = await Promise.all([
    readFile(SIDE_PREPARATION),
    readFile(EXECUTION_PREPARATION),
  ]);
  const sidePreparation = JSON.parse(sidePreparationBytes);
  const executionPreparation = JSON.parse(executionPreparationBytes);
  assertV4(
    sidePreparation.status ===
      "eight-exact-post-canary-batch-17-side-selector-packets-frozen-not-authorized" &&
      executionPreparation.status ===
        "frozen-eight-post-canary-batch-17-side-selector-contexts-prepared-not-authorized" &&
      sidePreparation.frozenAt === executionPreparation.frozenAt &&
      sidePreparation.checkpointCommit === executionPreparation.checkpointCommit,
    "stored side preparation boundary is invalid"
  );
  const expected = await buildArtifacts({
    frozenAt: sidePreparation.frozenAt,
    checkpointCommit: sidePreparation.checkpointCommit,
  });
  assertV4(
    isDeepStrictEqual(sidePreparation, expected.sidePreparation) &&
      isDeepStrictEqual(executionPreparation, expected.executionPreparation),
    "stored side preparation manifests do not replay exactly"
  );
  for (const [file, bytes] of expected.generated) {
    assertV4(
      (await readFile(file)).equals(bytes),
      `${file}: exact schema or packet bytes drifted`
    );
  }
  assertV4(
    sidePreparation.contexts.length === 8 &&
      executionPreparation.contexts.length === 8 &&
      sidePreparation.contexts.every(
        (context) => context.modelExecutionAuthorized === false
      ) &&
      executionPreparation.contexts.every(
        (context) => context.modelExecutionAuthorized === false
      ) &&
      sidePreparation.totals.candidatesTransported === EXPECTED_CANDIDATES &&
      executionPreparation.totals.candidatesTransported ===
        EXPECTED_CANDIDATES &&
      executionPreparation.sidePacketPreparationSha256 ===
        sha256(sidePreparationBytes) &&
      executionPreparation.authorization.executionActivationPreparation ===
        false &&
      sidePreparation.sourceCompatibility.status ===
        "all-source-rows-have-positive-repository-lexical-token-count" &&
      sidePreparation.sourceCompatibility.sourceRowsInjected === 0 &&
      sidePreparation.sourceCompatibility.sourceRowsOmitted === 0 &&
      sidePreparation.sourceCompatibility.sourceRowsRewritten === 0 &&
      sidePreparation.sourceCompatibility.minimumCandidateLexicalTokensChanged ===
        false &&
      sidePreparation.sourceCompatibility.occurrences.length === 0 &&
      isDeepStrictEqual(
        executionPreparation.sourceCompatibility,
        sidePreparation.sourceCompatibility
      ) &&
      executionPreparation.authorization.sideSelectorModelContexts === false &&
      executionPreparation.authorization.independentJudgmentModelExecution ===
        false &&
      executionPreparation.authorization.paidTranscription === false &&
      executionPreparation.authorization.unexpectedPaidService === false &&
      executionPreparation.authorization.audioVerification === false &&
      executionPreparation.authorization.scoreDerivation === false &&
      executionPreparation.authorization.publicationModelExecution === false &&
      executionPreparation.authorization.productionMutation === false &&
      executionPreparation.totals.sideContextsExecuted === 0 &&
      executionPreparation.totals.sideSelectorModelContextsExecuted === 0 &&
      executionPreparation.totals.judgmentModelContextsExecuted === 0 &&
      executionPreparation.totals.paidServiceCalls === 0 &&
      executionPreparation.totals.audioCalls === 0 &&
      executionPreparation.totals.scoresDerived === 0 &&
      executionPreparation.totals.productionMutations === 0 &&
      executionPreparation.totals.directIncrementalCostUsd === 0,
    "stored side preparation scope or zero-execution controls drifted"
  );
  await assertHashes(sidePreparation.sourceHashes, "side-preparation");
  await assertHashes(
    executionPreparation.sourceHashes,
    "side-execution-preparation"
  );
  for (const future of expected.futureOutputs) {
    assertV4(!(await exists(future)), `future output already exists: ${future}`);
  }
  console.log(
    JSON.stringify(
      {
        status: "passed-frozen-side-selector-preparation",
        debates: 4,
        contexts: 8,
        exactSideSchemasFrozen: 8,
        exactSidePacketsFrozen: 8,
        candidatesTransported: EXPECTED_CANDIDATES,
        maximumCopiedInputBytes:
          sidePreparation.exactBinding.maximumCopiedInputBytes,
        sideSelectorModelContextsAuthorized: false,
        modelContextsExecuted: 0,
        judgmentModelContextsExecuted: 0,
        paidServiceCalls: 0,
        audioCalls: 0,
        directIncrementalCostUsd: 0,
        scoresDerived: 0,
        productionMutations: 0,
        nextAuthorizedAction: executionPreparation.nextAuthorizedAction,
      },
      null,
      2
    )
  );
}

const command = process.argv[2];
if (command === "prepare") await prepare();
else if (command === "validate") await validate();
else {
  throw new Error(
    "usage: prepare-assessment-production-post-canary-batch-17-inventory-side-packets.mjs <prepare|validate>"
  );
}
