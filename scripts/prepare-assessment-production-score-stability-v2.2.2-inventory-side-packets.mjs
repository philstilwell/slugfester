#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
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
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const ROOT =
  "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor";
const SOURCE_PREPARATION = `${ROOT}/section-packet-preparation-manifest.json`;
const BASE_PREPARATION =
  "docs/assessment-production/score-stability-v2.2.1-validation-cohort/inventory-chronology-fallback/preparation-manifest.json";
const PLAN_ACTIVATION = `${ROOT}/section-execution-activation.json`;
const PLAN_EXECUTION = `${ROOT}/section-model-execution.json`;
const PLAN_ANALYSIS = `${ROOT}/plan-analysis.json`;
const MANIFEST = `${ROOT}/side-packet-preparation-manifest.json`;
const EXECUTION_PREPARATION = `${ROOT}/side-execution-preparation-manifest.json`;
const EXECUTION_ACTIVATION = `${ROOT}/side-execution-activation.json`;
const MODEL_EXECUTION = `${ROOT}/side-model-execution.json`;
const INVENTORY_ANALYSIS = `${ROOT}/inventory-analysis.json`;
const SCRIPT =
  "scripts/prepare-assessment-production-score-stability-v2.2.2-inventory-side-packets.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.2.2-inventory-side-packets.mjs";
const PROTOCOL_ID =
  "assessment-production-score-stability-v2.2.2-fresh-validation-route-section-plan-successor";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const prettyJsonBytes = (value) =>
  Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const compactJsonBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);
const exists = (file) => access(file).then(() => true, () => false);
async function mustNotExist(file) {
  assertV4(
    !(await exists(file)),
    `${file} already exists; exact side-packet preparation is immutable`
  );
}

function makeSidePacket({
  context,
  side,
  sideTransport,
  sideOutput,
  plan,
  planPath,
  planBytes,
  schemaPath,
  schemaBytes,
  sourcePacketBytes,
  sideTransportBytes,
  guide,
  guideBytes,
  manual,
  manualBytes,
}) {
  const copiedInputs = [
    {
      role: "inventory-source-packet",
      path: context.sourceContext.inventorySourcePacket,
      sha256: sha256(sourcePacketBytes),
      bytes: sourcePacketBytes.length,
    },
    {
      role: "immutable-candidate-census-plan",
      path: planPath,
      sha256: sha256(planBytes),
      canonicalSha256: candidateShardedInventoryPlanSha256(plan),
      bytes: planBytes.length,
    },
    {
      role: `${side}-complete-candidate-evidence-transport`,
      path: sideTransport,
      sha256: sha256(sideTransportBytes),
      bytes: sideTransportBytes.length,
    },
    {
      role: "chronology-fallback-inventory-guide",
      path: guide,
      sha256: sha256(guideBytes),
      bytes: guideBytes.length,
    },
    {
      role: "inventory-manual",
      path: manual,
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
      "1.0-score-stability-v2.2.2-chronology-fallback-side-selector-packet",
    protocolId: PROTOCOL_ID,
    sideSelectionProtocolId: CHRONOLOGY_FALLBACK_INVENTORY.protocolId,
    stage: `${side}-candidate-evidence-selection-with-chronology-fallback`,
    debateNumber: context.debateNumber,
    debateId: context.debateId,
    side,
    model: {
      label: "5.6 Sol",
      slug: "gpt-5.6-sol",
      reasoningEffort: "low",
      authentication: "ChatGPT subscription",
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
      failedV221PlanOutputsUnavailable: true,
      preferredMoveKindRequired: true,
      constructiveOrphanFallbackRequired: true,
      fallbackConditionRepositoryOwned: true,
      priorAndOtherJudgmentsUnavailable: true,
      legacyAssessmentsScoresWinnersTagsAndPublicationProseUnavailable: true,
    },
    immutablePlanCanonicalSha256:
      candidateShardedInventoryPlanSha256(plan),
    copiedInputs,
    copiedInputBytes: copiedInputs.reduce(
      (sum, input) => sum + input.bytes,
      0
    ),
    maximumCopiedInputBytes:
      V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
    writableDomains: ["candidateSelections"],
    output: sideOutput,
    attemptsMaximum: 1,
    retries: 0,
    timeoutExtensions: 0,
    modelExecutionAuthorized: false,
  };
}

const [
  sourcePreparationBytes,
  basePreparationBytes,
  planActivationBytes,
  planExecutionBytes,
  planAnalysisBytes,
] = await Promise.all([
  readFile(SOURCE_PREPARATION),
  readFile(BASE_PREPARATION),
  readFile(PLAN_ACTIVATION),
  readFile(PLAN_EXECUTION),
  readFile(PLAN_ANALYSIS),
]);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
const basePreparation = JSON.parse(basePreparationBytes);
const planActivation = JSON.parse(planActivationBytes);
const planExecution = JSON.parse(planExecutionBytes);
const planAnalysis = JSON.parse(planAnalysisBytes);
const guide = basePreparation.inputs.chronologyFallbackGuide;
const manual = basePreparation.inputs.inventoryManual;
const [guideBytes, manualBytes] = await Promise.all([
  readFile(guide),
  readFile(manual),
]);

assertV4(
  sourcePreparation.status ===
      "ten-exact-v2.2.2-section-packets-frozen-not-authorized" &&
    sourcePreparation.protocolId === PROTOCOL_ID &&
    sourcePreparation.contexts?.length === 10 &&
    sourcePreparation.totals?.exactSectionPacketsFrozen === 10 &&
    sourcePreparation.authorization?.sideSelectorModelExecution === false &&
    sourcePreparation.authorization?.independentJudgmentPacketPreparation ===
      false,
  "source preparation boundary drifted"
);
assertV4(
  basePreparation.sideSelectionProtocolId ===
      CHRONOLOGY_FALLBACK_INVENTORY.protocolId &&
    basePreparation.inventorySuccessorContract?.planAndSideIsolationPreserved ===
      true &&
    basePreparation.inventorySuccessorContract?.scoreFieldsAvailable === false,
  "unchanged side-selection contract drifted"
);
assertV4(
  planActivation.status ===
      "frozen-ten-v2.2.2-section-contexts-authorized" &&
    planExecution.status === "ten-v2.2.2-section-contexts-passed" &&
    planExecution.contextsAttempted === 10 &&
    planExecution.validContexts === 10 &&
    planExecution.invalidContexts === 0 &&
    planExecution.retries === 0 &&
    planExecution.timeoutExtensions === 0 &&
    planExecution.scoresDerived === 0 &&
    planAnalysis.status ===
      "v2.2.2-route-section-plan-gate-passed-exact-side-packet-preparation-authorized" &&
    planAnalysis.plans?.length === 10 &&
    planAnalysis.audit?.everySectionSchemaAndSemanticValidationPassed === true &&
    planAnalysis.audit?.everyPlanCanonicalHashReplayed === true &&
    planAnalysis.authorization?.exactSidePacketPreparation === true &&
    planAnalysis.authorization?.sideSelectorModelExecution === false &&
    planAnalysis.authorization?.independentJudgmentPacketPreparation ===
      false &&
    planAnalysis.authorization?.scoreDerivation === false &&
    planAnalysis.authorization?.productionMutation === false &&
    planAnalysis.nextAuthorizedAction ===
      "prepare-and-freeze-twenty-exact-v2.2.2-side-selector-packets-model-free-only",
  "accepted plan gate does not authorize exact side-packet preparation"
);
assertV4(
  planActivation.model?.label === "5.6 Sol" &&
    planActivation.model?.slug === "gpt-5.6-sol" &&
    planActivation.model?.reasoningEffort === "low" &&
    planActivation.model?.authentication === "ChatGPT subscription" &&
    planActivation.model?.scoreBlind === true,
  "plan gate model boundary drifted"
);
for (const [file, digest] of Object.entries(planAnalysis.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}
if (shouldWrite) await mustNotExist(MANIFEST);

const contexts = [];
const pendingWrites = [];
for (const context of sourcePreparation.contexts) {
  const source = context.sourceContext;
  const planRecord = planAnalysis.plans.find(
    (item) => item.debateNumber === context.debateNumber
  );
  const [
    planBytes,
    sourcePacketBytes,
    legacySchema,
    fullTransport,
    candidateCensus,
  ] = await Promise.all([
    readFile(planRecord.output),
    readFile(source.inventorySourcePacket),
    readFile(source.compilerSchema, "utf8").then(JSON.parse),
    readFile(source.fullCandidateTransport, "utf8").then(JSON.parse),
    readFile(source.candidateCensus, "utf8").then(JSON.parse),
  ]);
  const plan = JSON.parse(planBytes);
  assertV4(
    sha256(planBytes) === planRecord.outputSha256 &&
      planRecord.canonicalSha256 ===
        candidateShardedInventoryPlanSha256(plan),
    `${context.debateNumber}: accepted immutable plan drifted`
  );
  validateCandidateShardedInventoryPlan({
    plan,
    legacySchema,
    candidateTransport: fullTransport,
    candidateCensus,
  });

  for (const side of ["pro", "con"]) {
    const sideAsset = source.sideAssets.find((asset) => asset.side === side);
    assertV4(sideAsset, `${context.debateNumber}/${side}: side asset missing`);
    const sideTransportBytes = await readFile(sideAsset.transport);
    assertV4(
      sha256(sideTransportBytes) === sideAsset.transportSha256,
      `${context.debateNumber}/${side}: side transport drifted`
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
      `${ROOT}/schemas/sides/debate-${context.debateNumber}-${side}.schema.json`;
    const packetPath =
      `${ROOT}/packets/sides/debate-${context.debateNumber}-${side}.json`;
    const sideOutput =
      `${ROOT}/side-selections/debate-${context.debateNumber}-${side}.json`;
    const packet = makeSidePacket({
      context,
      side,
      sideTransport: sideAsset.transport,
      sideOutput,
      plan,
      planPath: planRecord.output,
      planBytes,
      schemaPath,
      schemaBytes,
      sourcePacketBytes,
      sideTransportBytes,
      guide,
      guideBytes,
      manual,
      manualBytes,
    });
    const packetBytes = prettyJsonBytes(packet);
    const candidateSelection = schema.$defs.candidateSelection;
    assertV4(
      schemaAudit.nullableCandidateProperties === sideAsset.candidates &&
        schema.properties.inventoryPlanSha256.const ===
          candidateShardedInventoryPlanSha256(plan) &&
        candidateSelection.required.includes("preferredMoveKind") &&
        candidateSelection.required.includes("orphanFallback") &&
        candidateSelection.properties.orphanFallback.properties.moveKind
          .const === "constructive" &&
        packet.copiedInputBytes <=
          V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes &&
        canonicalJson(JSON.parse(schemaBytes)) === canonicalJson(schema),
      `${context.debateNumber}/${side}: exact schema or packet boundary drifted`
    );
    for (const file of [schemaPath, packetPath, sideOutput]) {
      if (shouldWrite) await mustNotExist(file);
    }
    pendingWrites.push(
      { file: schemaPath, bytes: schemaBytes },
      { file: packetPath, bytes: packetBytes }
    );
    contexts.push({
      contextIndex: contexts.length,
      stage: `${side}-candidate-evidence-selection-with-chronology-fallback`,
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      family: source.family,
      sourceComplexityBand: source.sourceComplexityBand,
      side,
      candidates: sideAsset.candidates,
      immutablePlan: planRecord.output,
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
      output: sideOutput,
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
const candidatesTransported = contexts.reduce(
  (sum, context) => sum + context.candidates,
  0
);
assertV4(
  contexts.length === 20 &&
    contexts.filter((context) => context.side === "pro").length === 10 &&
    contexts.filter((context) => context.side === "con").length === 10 &&
    candidatesTransported === 361,
  "exact side-selector context totals drifted"
);

const sourceFiles = [
  ...Object.keys(planActivation.sourceHashes),
  SOURCE_PREPARATION,
  BASE_PREPARATION,
  PLAN_ACTIVATION,
  PLAN_EXECUTION,
  PLAN_ANALYSIS,
  guide,
  manual,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.2-inventory-preparation.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.2-inventory-chronology-fallback.mjs",
  SCRIPT,
  TEST,
  ...contexts.flatMap((context) => [
    context.immutablePlan,
    context.sideTransport,
    ...context.copiedInputs
      .filter((input) => input.role !== "strict-output-schema")
      .map((input) => input.path),
  ]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const futureOutputs = [
  EXECUTION_PREPARATION,
  EXECUTION_ACTIVATION,
  MODEL_EXECUTION,
  INVENTORY_ANALYSIS,
  ...contexts.map((context) => context.output),
  ...sourcePreparation.contexts.flatMap((context) => [
    `${ROOT}/inventory-proposals/debate-${context.debateNumber}.json`,
    `${ROOT}/locked-inventories/debate-${context.debateNumber}.json`,
    `${ROOT}/validations/debate-${context.debateNumber}.json`,
    `${ROOT}/provenance/debate-${context.debateNumber}.json`,
  ]),
];
for (const file of futureOutputs) {
  assertV4(!(await exists(file)), `future output already exists: ${file}`);
}

const manifest = {
  schemaVersion:
    "1.0-score-stability-v2.2.2-chronology-fallback-side-packet-preparation",
  protocolId: PROTOCOL_ID,
  sideSelectionProtocolId: CHRONOLOGY_FALLBACK_INVENTORY.protocolId,
  status:
    "twenty-exact-v2.2.2-side-selector-packets-frozen-not-authorized",
  frozenAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  failedGateDisposition: structuredClone(
    sourcePreparation.failedGateDisposition
  ),
  proposedPolicy: {
    ...structuredClone(sourcePreparation.proposedPolicy),
    promoted: false,
  },
  inventorySuccessorContract: structuredClone(
    basePreparation.inventorySuccessorContract
  ),
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    scoreBlind: true,
    apiKeysRemovedForAnyLaterExecution: true,
    meteredApiCostUsdMaximum: 0,
  },
  scheduling: {
    sideSelectorConcurrencyMaximum: 2,
    oneAttemptPerContext: true,
    retries: 0,
    timeoutExtensions: 0,
  },
  inputs: {
    sourcePreparation: SOURCE_PREPARATION,
    sourcePreparationSha256: sha256(sourcePreparationBytes),
    basePreparation: BASE_PREPARATION,
    basePreparationSha256: sha256(basePreparationBytes),
    planActivation: PLAN_ACTIVATION,
    planActivationSha256: sha256(planActivationBytes),
    planExecution: PLAN_EXECUTION,
    planExecutionSha256: sha256(planExecutionBytes),
    planAnalysis: PLAN_ANALYSIS,
    planAnalysisSha256: sha256(planAnalysisBytes),
    chronologyFallbackGuide: guide,
    chronologyFallbackGuideSha256: sha256(guideBytes),
    inventoryManual: manual,
    inventoryManualSha256: sha256(manualBytes),
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
    failedV221PlanOutputsUnavailable: true,
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
    exactSchemasExecutable: true,
    prototypeSchemasExecutable: false,
    preferredMoveKindRequiredInEveryNomination: true,
    constructiveOrphanFallbackRequiredInEveryNomination: true,
    fallbackConditionRepositoryOwned: true,
    fallbackAppliedOnlyToRetainedOrphanReply: true,
    maximumCopiedInputBytes: Math.max(
      ...contexts.map((context) => context.copiedInputBytes)
    ),
    provenCeilingBytes:
      V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
  },
  stopRules: {
    ...structuredClone(basePreparation.stopRules),
    sidePacketPreparationHashMismatchBlocks: true,
    acceptedPlanHashMismatchBlocks: true,
    exactSideSchemaHashMismatchBlocks: true,
    crossSideEvidenceContaminationBlocks: true,
    sideModelExecutionBeforeSeparateActivationBlocks: true,
    retryBlocks: true,
    timeoutExtensionBlocks: true,
  },
  totals: {
    debates: 10,
    exactSideSchemasFrozen: 20,
    exactSidePacketsFrozen: 20,
    proContexts: 10,
    conContexts: 10,
    candidatesTransported,
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
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes,
  authorization: {
    deterministicValidation: true,
    sideSelectorExecutionManifestPreparation: true,
    sideSelectorExecutionActivation: false,
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
    policyPromotion: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction:
    "prepare-v2.2.2-side-selector-execution-manifest-model-free-only",
};

if (shouldWrite) {
  for (const { file, bytes } of pendingWrites) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }
  await writeFile(MANIFEST, prettyJsonBytes(manifest));
}

console.log(
  JSON.stringify(
    {
      status: shouldWrite ? manifest.status : "preview",
      debates: 10,
      contexts: contexts.length,
      exactSideSchemasFrozen: contexts.length,
      exactSidePacketsFrozen: contexts.length,
      candidatesTransported,
      copiedInputBytes: {
        minimum: Math.min(
          ...contexts.map((context) => context.copiedInputBytes)
        ),
        maximum: manifest.exactBinding.maximumCopiedInputBytes,
        ceiling: manifest.exactBinding.provenCeilingBytes,
      },
      modelExecutionAuthorized: false,
      scoresDerived: 0,
      productionMutationAuthorized: false,
      nextAuthorizedAction: manifest.nextAuthorizedAction,
    },
    null,
    2
  )
);
