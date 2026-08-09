#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  auditDecomposedStrictSchema,
  candidateTransportCanonicalSha256,
} from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  !shouldWrite || (frozenAt && !Number.isNaN(Date.parse(frozenAt))),
  "--write requires --frozen-at with an ISO timestamp"
);

const VALIDATION_ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort";
const COLUMNAR_ROOT = `${VALIDATION_ROOT}/inventory-columnar-recovery`;
const SIDE_ROOT =
  `${VALIDATION_ROOT}/inventory-side-partitioned-selection-map-successor`;
const DEVELOPMENT_ROOT =
  `${VALIDATION_ROOT}/inventory-decomposed-plan-selection-development`;
const ROOT =
  `${VALIDATION_ROOT}/inventory-decomposed-plan-selection-successor`;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const SOURCE_PREPARATION = `${SIDE_ROOT}/preparation-manifest.json`;
const DEVELOPMENT_ANALYSIS = `${DEVELOPMENT_ROOT}/development-analysis.json`;
const DECOMPOSED_GUIDE = `${DEVELOPMENT_ROOT}/decomposed-inventory-guide.md`;
const COLUMNAR_GUIDE = `${COLUMNAR_ROOT}/columnar-transport-guide.md`;
const FAILED_GATE_EVIDENCE = {
  predecessorTimeout: `${COLUMNAR_ROOT}/timeout-diagnosis.json`,
  columnarRecovery: `${COLUMNAR_ROOT}/failure-diagnosis.json`,
  uniqueSelection:
    `${VALIDATION_ROOT}/inventory-unique-selection-map-successor/failure-diagnosis.json`,
  sidePartitioned: `${SIDE_ROOT}/failure-diagnosis.json`,
};
const SCRIPT =
  "scripts/prepare-assessment-production-score-stability-v2-inventory-decomposed-plan-selection-successor.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2-inventory-decomposed-plan-selection-successor-preparation.mjs";
const PROTOCOL_ID =
  "assessment-production-score-stability-v2-fresh-validation-decomposed-plan-selection-inventory-successor";
const CEILING_BYTES = 115000;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  assertV4(
    !(await exists(PREPARATION)),
    `${PREPARATION} already exists; successor preparation is immutable`
  );
}

const [
  sourcePreparationBytes,
  developmentAnalysisBytes,
  columnarGuideBytes,
  decomposedGuideBytes,
  predecessorTimeoutBytes,
  columnarFailureBytes,
  uniqueFailureBytes,
  sideFailureBytes,
] = await Promise.all([
  readFile(SOURCE_PREPARATION),
  readFile(DEVELOPMENT_ANALYSIS),
  readFile(COLUMNAR_GUIDE),
  readFile(DECOMPOSED_GUIDE),
  readFile(FAILED_GATE_EVIDENCE.predecessorTimeout),
  readFile(FAILED_GATE_EVIDENCE.columnarRecovery),
  readFile(FAILED_GATE_EVIDENCE.uniqueSelection),
  readFile(FAILED_GATE_EVIDENCE.sidePartitioned),
]);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
const development = JSON.parse(developmentAnalysisBytes);
const failedGates = {
  predecessorTimeout: JSON.parse(predecessorTimeoutBytes),
  columnarRecovery: JSON.parse(columnarFailureBytes),
  uniqueSelection: JSON.parse(uniqueFailureBytes),
  sidePartitioned: JSON.parse(sideFailureBytes),
};

for (const [file, digest] of Object.entries(development.sourceHashes)) {
  assertV4(
    sha256(await readFile(file)) === digest,
    `development source hash drift: ${file}`
  );
}
assertV4(
  sourcePreparation.status ===
      "ten-fresh-side-partitioned-selection-map-v2-validation-inventory-contexts-prepared" &&
    sourcePreparation.currentCanaryDisposition?.reclassified === false &&
    sourcePreparation.proposedPolicy?.promoted === false &&
    failedGates.predecessorTimeout.status ===
      "failed-inventory-gate-preserved-columnar-full-cohort-successor-preparation-authorized" &&
    failedGates.columnarRecovery.status ===
      "recovery-inventory-gate-failed-cross-section-duplicate-confirmed-no-further-action-authorized" &&
    failedGates.uniqueSelection.status ===
      "unique-selection-map-successor-gate-failed-section-side-cardinality-confirmed-no-further-action-authorized" &&
    failedGates.sidePartitioned.status ===
      "side-partitioned-selection-map-successor-gate-failed-repeat-debate-137-timeout-confirmed-no-further-action-authorized",
  "all four predecessor gates must remain frozen as failed"
);
assertV4(
  development.status ===
      "decomposed-plan-selection-retired-regression-passed-successor-preparation-authorized" &&
    development.authorization?.successorPreparation === true &&
    development.authorization?.successorExecutionManifest === false &&
    development.authorization?.successorModelExecution === false &&
    development.regression?.acceptedArtifactsTested === 22 &&
    development.regression?.recomposedSideProposalsIdentical === 22 &&
    development.regression?.lockedInventoriesCanonicallyIdentical === 22 &&
    development.regression?.freshModelEvidenceUsed === false &&
    development.totals?.failedOutputsProbed === 3 &&
    development.totals?.bindingTamperProbes === 3 &&
    development.failureProbes?.debate137TimeoutOccurrences === 2 &&
    development.failureProbes?.debate137ProposalAvailable === false &&
    development.failureProbes?.debate137SemanticRepairAttempted === false &&
    development.stageInputBounds?.everyPlanStageWithinCeiling === true &&
    development.stageInputBounds?.everySelectionStageMaximumWithinCeiling === true &&
    development.stageInputBounds?.provenCeilingBytes === CEILING_BYTES,
  "decomposed development does not authorize model-free successor preparation"
);

const manualBytes = await readFile(sourcePreparation.inputs.manual);
const schemaByDebate = new Map(
  development.schemas.map((record) => [record.debateNumber, record])
);
const contexts = [];
for (const original of sourcePreparation.contexts) {
  const schemaRecord = schemaByDebate.get(original.debateNumber);
  assertV4(schemaRecord, `${original.debateNumber}: decomposed schemas unavailable`);
  const [packetBytes, transportBytes, planSchemaBytes, prototypeBytes] =
    await Promise.all([
      readFile(original.packet),
      readFile(original.modelCandidateTransport),
      readFile(schemaRecord.planSchema),
      readFile(schemaRecord.selectionSchemaPrototype),
    ]);
  assertV4(
    sha256(planSchemaBytes) === schemaRecord.planSchemaSha256 &&
      sha256(prototypeBytes) === schemaRecord.selectionSchemaPrototypeSha256,
    `${original.debateNumber}: decomposed schema hash drifted`
  );
  const planSchema = JSON.parse(planSchemaBytes);
  const selectionPrototype = JSON.parse(prototypeBytes);
  const planAudit = auditDecomposedStrictSchema(planSchema);
  const selectionAudit = auditDecomposedStrictSchema(selectionPrototype);
  const canonicalTransportHash = candidateTransportCanonicalSha256(
    JSON.parse(transportBytes)
  );
  assertV4(
    !Object.hasOwn(planSchema.properties, "candidateSelectionsBySide") &&
      Object.hasOwn(planSchema.properties, "routes") &&
      Object.hasOwn(planSchema.properties, "sections") &&
      planSchema.properties.candidateTransportCanonicalSha256.const ===
        canonicalTransportHash &&
      !Object.hasOwn(selectionPrototype.properties, "routes") &&
      !Object.hasOwn(selectionPrototype.properties, "sections") &&
      Object.hasOwn(
        selectionPrototype.properties,
        "candidateSelectionsBySide"
      ) &&
      selectionPrototype.properties.candidateTransportCanonicalSha256.const ===
        canonicalTransportHash &&
      selectionAudit.nullableCandidateProperties === original.candidates,
    `${original.debateNumber}: decomposed writable-domain topology drifted`
  );
  const planCopiedInputBytes =
    manualBytes.length +
    columnarGuideBytes.length +
    decomposedGuideBytes.length +
    packetBytes.length +
    transportBytes.length +
    planSchemaBytes.length;
  const maximumSelectionCopiedInputBytes =
    columnarGuideBytes.length +
    decomposedGuideBytes.length +
    transportBytes.length +
    schemaRecord.maximumPlanOutputBytes +
    prototypeBytes.length;
  assertV4(
    planCopiedInputBytes === schemaRecord.planCopiedInputBytes &&
      maximumSelectionCopiedInputBytes ===
        schemaRecord.maximumSelectionCopiedInputBytes &&
      planCopiedInputBytes <= CEILING_BYTES &&
      maximumSelectionCopiedInputBytes <= CEILING_BYTES,
    `${original.debateNumber}: decomposed stage input bound drifted`
  );
  const {
    copiedInputBytes: _copiedInputBytes,
    candidateSelectionProperties: _candidateSelectionProperties,
    totalSchemaObjectProperties: _totalSchemaObjectProperties,
    schema: _schema,
    schemaSha256: _schemaSha256,
    schemaBytes: _schemaBytes,
    proposalOutput: _proposalOutput,
    lockedInventoryOutput: _lockedInventoryOutput,
    validationOutput: _validationOutput,
    provenanceOutput: _provenanceOutput,
    ...baseContext
  } = structuredClone(original);
  contexts.push({
    ...baseContext,
    candidateTransportCanonicalSha256: canonicalTransportHash,
    planSchema: schemaRecord.planSchema,
    planSchemaSha256: schemaRecord.planSchemaSha256,
    planSchemaBytes: schemaRecord.planSchemaBytes,
    planSchemaStrictObjectsAudited: planAudit.objectsAudited,
    developmentMaximumPlanSelectionSchemaPrototype:
      schemaRecord.selectionSchemaPrototype,
    developmentMaximumPlanSelectionSchemaPrototypeSha256:
      schemaRecord.selectionSchemaPrototypeSha256,
    developmentMaximumPlanSelectionSchemaPrototypeBytes:
      schemaRecord.selectionSchemaPrototypeBytes,
    selectionCandidateProperties: selectionAudit.nullableCandidateProperties,
    maximumPlanOutputBytes: schemaRecord.maximumPlanOutputBytes,
    planCopiedInputBytes,
    maximumSelectionCopiedInputBytes,
    planOutput: `${ROOT}/plans/debate-${original.debateNumber}.json`,
    selectionSchemaOutput:
      `${ROOT}/selection-schemas/debate-${original.debateNumber}.schema.json`,
    selectionOutput: `${ROOT}/selections/debate-${original.debateNumber}.json`,
    composedProposalOutput:
      `${ROOT}/inventory-proposals/debate-${original.debateNumber}.json`,
    lockedInventoryOutput:
      `${ROOT}/locked-inventories/debate-${original.debateNumber}.json`,
    validationOutput:
      `${ROOT}/validations/debate-${original.debateNumber}.json`,
    provenanceOutput:
      `${ROOT}/provenance/debate-${original.debateNumber}.json`,
  });
}
assertV4(
  contexts.length === 10 &&
    contexts.map((context) => context.debateNumber).join(",") ===
      "86,60,31,151,93,80,158,123,146,137" &&
    contexts.reduce((sum, context) => sum + context.candidates, 0) === 406 &&
    contexts.reduce((sum, context) => sum + context.proCandidates, 0) === 203 &&
    contexts.reduce((sum, context) => sum + context.conCandidates, 0) === 203,
  "decomposed successor cohort drifted"
);

const sourceFiles = [
  SOURCE_PREPARATION,
  DEVELOPMENT_ANALYSIS,
  COLUMNAR_GUIDE,
  DECOMPOSED_GUIDE,
  ...Object.values(FAILED_GATE_EVIDENCE),
  sourcePreparation.inputs.manual,
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-inventory-workflow.md",
  "docs/assessment-production-canary-inventory-execution-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  `${SIDE_ROOT}/execution-manifest.json`,
  `${SIDE_ROOT}/model-execution.json`,
  "scripts/develop-assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs",
  "scripts/test-assessment-production-score-stability-v2-inventory-decomposed-plan-selection-development.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  SCRIPT,
  TEST,
  ...contexts.flatMap((context) => [
    context.packet,
    context.discoveryCandidateBundle,
    context.discoverySparseContext,
    context.validatorCandidateEvidenceBundle,
    context.modelCandidateTransport,
    context.originalEvents,
    context.fullLedger,
    context.priorModelCandidateTransport,
    context.priorSchema,
    context.planSchema,
    context.developmentMaximumPlanSelectionSchemaPrototype,
  ]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}
const futureOutputPaths = [
  `${ROOT}/execution-manifest.json`,
  `${ROOT}/plan-model-execution.json`,
  `${ROOT}/selection-model-execution.json`,
  `${ROOT}/model-execution.json`,
  `${ROOT}/analysis.json`,
  ...contexts.flatMap((context) => [
    context.planOutput,
    context.selectionSchemaOutput,
    context.selectionOutput,
    context.composedProposalOutput,
    context.lockedInventoryOutput,
    context.validationOutput,
    context.provenanceOutput,
  ]),
];
for (const output of futureOutputPaths) {
  assertV4(!(await exists(output)), `future successor output already exists: ${output}`);
}

const preparation = {
  schemaVersion:
    "1.0-score-stability-v2-decomposed-plan-selection-inventory-successor-preparation",
  protocolId: PROTOCOL_ID,
  status: shouldWrite
    ? "ten-fresh-decomposed-plan-selection-v2-validation-inventory-contexts-prepared"
    : "preview",
  preparedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  failedGateDisposition: {
    predecessorTimeoutGatePreservedFailed: true,
    columnarRecoveryGatePreservedFailed: true,
    uniqueSelectionSuccessorGatePreservedFailed: true,
    sidePartitionedSelectionSuccessorGatePreservedFailed: true,
    allFourAcceptedAsPassed: false,
    priorValidOutputsReusableForSuccessorAcceptance: false,
    priorFailedOutputsReusableForSuccessorAcceptance: false,
    retriesPerformed: 0,
    timeoutExtensionsPerformed: 0,
    semanticCorrectionsPerformed: 0,
  },
  currentCanaryDisposition: structuredClone(
    sourcePreparation.currentCanaryDisposition
  ),
  proposedPolicy: {
    ...structuredClone(sourcePreparation.proposedPolicy),
    promoted: false,
  },
  model: structuredClone(sourcePreparation.model),
  inputs: {
    sourcePreparation: SOURCE_PREPARATION,
    sourcePreparationSha256: sha256(sourcePreparationBytes),
    developmentAnalysis: DEVELOPMENT_ANALYSIS,
    developmentAnalysisSha256: sha256(developmentAnalysisBytes),
    manual: sourcePreparation.inputs.manual,
    manualSha256: sha256(manualBytes),
    columnarTransportGuide: COLUMNAR_GUIDE,
    columnarTransportGuideSha256: sha256(columnarGuideBytes),
    decomposedInventoryGuide: DECOMPOSED_GUIDE,
    decomposedInventoryGuideSha256: sha256(decomposedGuideBytes),
    failedGateEvidence: Object.fromEntries(
      Object.entries(FAILED_GATE_EVIDENCE).map(([key, file]) => [
        key,
        { file, sha256: sourceHashes[file] },
      ])
    ),
  },
  sourceHashes,
  contexts,
  isolation: {
    oneDebatePerContext: true,
    freshTemporaryCodexHomePerStageContext: true,
    twentyFreshStageContextsRequired: true,
    planAndSelectionContextsShareNoSessionState: true,
    plannerReceivesOnlyManualGuidePacketTransportAndPlanSchema: true,
    selectorReceivesOnlyGuidesTransportFrozenPlanAndGeneratedSchema: true,
    selectorPlannerExecutionMetadataUnavailable: true,
    allPredecessorOutputsUnavailable: true,
    allPredecessorExecutionMetadataUnavailable: true,
    otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true,
    independentJudgmentsUnavailable: true,
    scoringRubricsUnavailable: true,
    ratingsScoresWinnersTagsAndPublicationProseUnavailable: true,
  },
  decomposedTopology: {
    stages: ["inventory-plan", "candidate-selection"],
    plannerWritableDomains: ["routes", "sections"],
    plannerCandidateSelectionUnavailable: true,
    selectorWritableDomains: ["candidateSelectionsBySide"],
    selectorRoutesAndSectionsImmutable: true,
    canonicalCandidateTransportHashBoundInBothStages: true,
    canonicalPlanHashBoundInSelectionStage: true,
    actualSelectionSchemaGeneratedOnlyAfterValidPlan: true,
    developmentSelectionSchemaPrototypesAreNotExecutionInputs: true,
    selectionSectionIdsSchemaBoundToImmutablePlan: true,
    deterministicCompositionRequired: true,
    candidateIdentityStructurallyUnique: true,
    duplicateCandidateSelectionRepresentable: false,
    wrongSideCandidateKeyRepresentable: false,
    orderWithinSideModelAuthored: false,
    positionCollisionRepresentable: false,
    sectionSideCardinalitySchemaEnforcedAcrossCandidateProperties: false,
    sectionSideCardinalityDeterministicallyValidated: true,
    chronologyRepositoryOwned: true,
    candidateSemanticDownselectionPerformed: false,
    scoreFieldsAvailable: false,
  },
  retiredRegressionEvidence: {
    acceptedArtifactsReplayed: 22,
    recomposedProposalsIdentical: 22,
    lockedInventoriesIdentical: 22,
    failedOutputsProbed: 3,
    bindingTamperProbes: 3,
    freshModelEvidenceUsed: false,
    eachStageOutputSmallerThanSourceProposal: true,
    minimumPlanReductionFraction:
      development.outputDecomposition.minimumPlanReductionFraction,
    minimumSelectionReductionFraction:
      development.outputDecomposition.minimumSelectionReductionFraction,
  },
  executionDesign: {
    stageOrder: ["all-inventory-plans", "all-candidate-selections"],
    stageContextsPlanned: 20,
    contextsPerStage: 10,
    attemptsPerStageContext: 1,
    retriesMaximum: 0,
    timeoutMsPerStageContext: 600000,
    timeoutExtensionApplied: false,
    maximumParallelContexts: 2,
    schedulerRampPerStage: [1, 2],
    eachRampPhaseMustPassBeforeExpansion: true,
    allPlansMustPassBeforeSelectionStageBegins: true,
    planFailureBlocksSelectionStage: true,
    selectionFailureBlocksCompositionAndAcceptance: true,
    deterministicInputOrder: true,
    authentication: "ChatGPT subscription",
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
  },
  transport: {
    representation: "lossless columnar candidate evidence",
    everyCandidateRetained: true,
    everyOriginalModelVisibleFieldRetained: true,
    parsedRoundTripIdentityVerified: true,
    semanticCandidateDownselectionPerformed: false,
    planMinimumCopiedInputBytes: Math.min(
      ...contexts.map((context) => context.planCopiedInputBytes)
    ),
    planMaximumCopiedInputBytes: Math.max(
      ...contexts.map((context) => context.planCopiedInputBytes)
    ),
    selectionMinimumMaximumBoundBytes: Math.min(
      ...contexts.map((context) => context.maximumSelectionCopiedInputBytes)
    ),
    selectionMaximumCopiedInputBoundBytes: Math.max(
      ...contexts.map((context) => context.maximumSelectionCopiedInputBytes)
    ),
    provenCeilingBytes: CEILING_BYTES,
  },
  deterministicCompilation: structuredClone(
    sourcePreparation.deterministicCompilation
  ),
  audioPolicy: structuredClone(sourcePreparation.audioPolicy),
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
    stageContextsPlanned: 20,
    planContextsExecuted: 0,
    selectionContextsExecuted: 0,
    modelContextsExecuted: 0,
    selectionSchemasGenerated: 0,
    inventoriesComposed: 0,
    audioCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  stopRules: {
    ...structuredClone(sourcePreparation.stopRules),
    allFourFailedGatesMustRemainPreserved: true,
    priorOutputsUnavailableToSuccessorModels: true,
    priorOutputsCannotCountTowardSuccessorAcceptance: true,
    allTwentyFreshStageContextsRequired: true,
    allTenFreshComposedInventoriesRequired: true,
    planFailureBlocksSelectorAndRampExpansion: true,
    selectionFailureBlocksCompositionAndAcceptance: true,
    planHashMismatchBlocks: true,
    postSelectionPlanMutationBlocks: true,
    candidateTransportHashMismatchBlocks: true,
    dynamicallyGeneratedSelectionSchemaRequired: true,
    developmentSelectionPrototypeAsExecutionInputBlocks: true,
    timeoutExtensionBlocks: true,
    retryBlocks: true,
    semanticCorrectionBlocks: true,
    duplicateCandidateSelectionBlocks: true,
    wrongSideCandidatePlacementBlocks: true,
    invalidSectionSideCardinalityBlocks: true,
  },
  authorization: {
    deterministicValidation: true,
    deterministicSelectionSchemaGeneration: true,
    successorExecutionManifest: true,
    successorModelExecution: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    priorOutputReuseForSuccessorAcceptance: false,
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
  nextAuthorizedAction: "successor-execution-manifest",
};

if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(PREPARATION, jsonBytes(preparation));
}
console.log(
  JSON.stringify(
    {
      status: preparation.status,
      debates: contexts.map((context) => context.debateNumber),
      contexts: contexts.length,
      stageContextsPlanned: preparation.totals.stageContextsPlanned,
      candidates: preparation.totals.candidates,
      planMaximumCopiedInputBytes:
        preparation.transport.planMaximumCopiedInputBytes,
      selectionMaximumCopiedInputBoundBytes:
        preparation.transport.selectionMaximumCopiedInputBoundBytes,
      failedGatesPreserved: 4,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorized: preparation.nextAuthorizedAction,
      successorModelExecutionAuthorized: false,
    },
    null,
    2
  )
);
