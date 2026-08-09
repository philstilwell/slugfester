#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import { auditSidePartitionedStrictSchema } from "./lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  !shouldWrite || (frozenAt && !Number.isNaN(Date.parse(frozenAt))),
  "--write requires --frozen-at with an ISO timestamp"
);

const VALIDATION_ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort";
const RECOVERY_ROOT = `${VALIDATION_ROOT}/inventory-columnar-recovery`;
const DEVELOPMENT_ROOT = `${VALIDATION_ROOT}/inventory-side-partitioned-selection-map-development`;
const UNIQUE_ROOT = `${VALIDATION_ROOT}/inventory-unique-selection-map-successor`;
const ROOT = `${VALIDATION_ROOT}/inventory-side-partitioned-selection-map-successor`;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const SOURCE_PREPARATION = `${UNIQUE_ROOT}/preparation-manifest.json`;
const FAILURE_DIAGNOSIS = `${UNIQUE_ROOT}/failure-diagnosis.json`;
const DEVELOPMENT_ANALYSIS = `${DEVELOPMENT_ROOT}/development-analysis.json`;
const COLUMNAR_GUIDE = `${RECOVERY_ROOT}/columnar-transport-guide.md`;
const SIDE_PARTITIONED_MAP_GUIDE =
  `${DEVELOPMENT_ROOT}/side-partitioned-selection-map-guide.md`;
const SCRIPT =
  "scripts/prepare-assessment-production-score-stability-v2-inventory-side-partitioned-selection-map-successor.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2-inventory-side-partitioned-selection-map-successor-preparation.mjs";
const PROTOCOL_ID =
  "assessment-production-score-stability-v2-fresh-validation-side-partitioned-selection-map-inventory-successor";

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
  failureDiagnosisBytes,
  developmentAnalysisBytes,
  columnarGuideBytes,
  sidePartitionedGuideBytes,
] = await Promise.all([
  readFile(SOURCE_PREPARATION),
  readFile(FAILURE_DIAGNOSIS),
  readFile(DEVELOPMENT_ANALYSIS),
  readFile(COLUMNAR_GUIDE),
  readFile(SIDE_PARTITIONED_MAP_GUIDE),
]);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
const failureDiagnosis = JSON.parse(failureDiagnosisBytes);
const development = JSON.parse(developmentAnalysisBytes);
for (const [file, digest] of Object.entries(development.sourceHashes)) {
  assertV4(
    sha256(await readFile(file)) === digest,
    `development source hash drift: ${file}`
  );
}
assertV4(
  sourcePreparation.status ===
      "ten-fresh-unique-selection-map-v2-validation-inventory-contexts-prepared" &&
    sourcePreparation.currentCanaryDisposition?.reclassified === false &&
    sourcePreparation.proposedPolicy?.promoted === false &&
    failureDiagnosis.status ===
      "unique-selection-map-successor-gate-failed-section-side-cardinality-confirmed-no-further-action-authorized" &&
    development.status ===
      "side-partitioned-order-free-map-retired-regression-passed-successor-preparation-authorized" &&
    development.authorization?.successorPreparation === true &&
    development.authorization?.successorModelExecution === false &&
    development.regression?.acceptedArtifactsTested === 13 &&
    development.regression?.failedDebate31DuplicateRejectedBeforeProjection ===
      true &&
    development.regression
      ?.failedDebate31CardinalityRejectedAfterOrderRemoval === true &&
    development.design?.duplicateCandidateSelectionRepresentable === false &&
    development.design?.wrongSideCandidateKeyRepresentable === false &&
    development.design?.positionCollisionRepresentable === false,
  "side-partitioned selection map development does not authorize successor preparation"
);

const manualBytes = await readFile(sourcePreparation.inputs.manual);
const schemaByDebate = new Map(
  development.schemas.map((record) => [record.debateNumber, record])
);
const contexts = [];
for (const original of sourcePreparation.contexts) {
  const schemaRecord = schemaByDebate.get(original.debateNumber);
  assertV4(schemaRecord, `${original.debateNumber}: successor schema unavailable`);
  const [packetBytes, transportBytes, schemaBytes] = await Promise.all([
    readFile(original.packet),
    readFile(original.modelCandidateTransport),
    readFile(schemaRecord.schema),
  ]);
  assertV4(
    sha256(schemaBytes) === schemaRecord.schemaSha256,
    `${original.debateNumber}: successor schema hash drifted`
  );
  const schemaAudit = auditSidePartitionedStrictSchema(
    JSON.parse(schemaBytes)
  );
  assertV4(
    schemaAudit.nullableCandidateProperties === original.candidates,
    `${original.debateNumber}: candidate property topology drifted`
  );
  const copiedInputBytes =
    manualBytes.length +
    columnarGuideBytes.length +
    sidePartitionedGuideBytes.length +
    packetBytes.length +
    transportBytes.length +
    schemaBytes.length;
  assertV4(
    copiedInputBytes === schemaRecord.copiedInputBytes &&
      copiedInputBytes <= 115000,
    `${original.debateNumber}: copied input calculation drifted`
  );
  const {
    schema: _priorSuccessorSchema,
    schemaSha256: _priorSuccessorSchemaSha256,
    schemaBytes: _priorSuccessorSchemaBytes,
    proposalOutput: _priorProposalOutput,
    lockedInventoryOutput: _priorLockedInventoryOutput,
    validationOutput: _priorValidationOutput,
    provenanceOutput: _priorProvenanceOutput,
    ...baseContext
  } = structuredClone(original);
  contexts.push({
    ...baseContext,
    schema: schemaRecord.schema,
    schemaSha256: schemaRecord.schemaSha256,
    schemaBytes: schemaRecord.schemaBytes,
    copiedInputBytes,
    candidateSelectionProperties: schemaRecord.nullableCandidateProperties,
    totalSchemaObjectProperties: schemaRecord.totalObjectProperties,
    proposalOutput: `${ROOT}/inventory-proposals/debate-${original.debateNumber}.json`,
    lockedInventoryOutput: `${ROOT}/locked-inventories/debate-${original.debateNumber}.json`,
    validationOutput: `${ROOT}/validations/debate-${original.debateNumber}.json`,
    provenanceOutput: `${ROOT}/provenance/debate-${original.debateNumber}.json`,
  });
}
assertV4(
  contexts.length === 10 &&
    contexts.reduce((sum, context) => sum + context.candidates, 0) === 406 &&
    contexts.every(
      (context) => context.candidateSelectionProperties === context.candidates
    ),
  "successor cohort totals drifted"
);

const sourceFiles = [
  SOURCE_PREPARATION,
  FAILURE_DIAGNOSIS,
  DEVELOPMENT_ANALYSIS,
  COLUMNAR_GUIDE,
  SIDE_PARTITIONED_MAP_GUIDE,
  sourcePreparation.inputs.manual,
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-inventory-workflow.md",
  "docs/assessment-production-canary-inventory-execution-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs",
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
    context.priorSchema,
    context.schema,
  ]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}
const futureOutputPaths = contexts.flatMap((context) => [
  context.proposalOutput,
  context.lockedInventoryOutput,
  context.validationOutput,
  context.provenanceOutput,
]);
for (const output of futureOutputPaths) {
  assertV4(!(await exists(output)), `future successor output already exists: ${output}`);
}

const preparation = {
  schemaVersion:
    "1.0-score-stability-v2-side-partitioned-selection-map-inventory-successor-preparation",
  protocolId: PROTOCOL_ID,
  status: shouldWrite
    ? "ten-fresh-side-partitioned-selection-map-v2-validation-inventory-contexts-prepared"
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
    priorValidOutputsReusableForSuccessorAcceptance: false,
    priorFailedOutputsReusableForSuccessorAcceptance: false,
    retriesPerformed: 0,
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
    failureDiagnosis: FAILURE_DIAGNOSIS,
    failureDiagnosisSha256: sha256(failureDiagnosisBytes),
    developmentAnalysis: DEVELOPMENT_ANALYSIS,
    developmentAnalysisSha256: sha256(developmentAnalysisBytes),
    manual: sourcePreparation.inputs.manual,
    manualSha256: sha256(manualBytes),
    columnarTransportGuide: COLUMNAR_GUIDE,
    columnarTransportGuideSha256: sha256(columnarGuideBytes),
    sidePartitionedSelectionMapGuide: SIDE_PARTITIONED_MAP_GUIDE,
    sidePartitionedSelectionMapGuideSha256: sha256(sidePartitionedGuideBytes),
  },
  sourceHashes,
  contexts,
  isolation: {
    oneDebatePerContext: true,
    fullTenContextFreshExecutionRequired: true,
    allPredecessorOutputsUnavailable: true,
    allPredecessorExecutionMetadataUnavailable: true,
    otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true,
    independentJudgmentsUnavailable: true,
    scoringRubricsUnavailable: true,
    ratingsScoresWinnersTagsAndPublicationProseUnavailable: true,
  },
  selectionTopology: {
    requiredNullablePropertyPerCandidate: true,
    everyCandidateKeyRequired: true,
    candidateIdentityStructurallyUnique: true,
    duplicateCandidateSelectionRepresentable: false,
    repositorySideStructurallyPartitioned: true,
    wrongSideCandidateKeyRepresentable: false,
    orderWithinSideModelAuthored: false,
    orderWithinSideRepositoryDerivedFromChronology: true,
    positionCollisionRepresentable: false,
    unsupportedUniqueItemsUsed: false,
    sectionSideCardinalityDeterministicallyValidated: true,
    chronologyRepositoryOwned: true,
    candidateSemanticDownselectionPerformed: false,
    preservedRegressionArtifacts:
      development.regression.acceptedArtifactsTested,
    preservedLockedInventoriesIdentical:
      development.regression.lockedInventoriesCanonicallyIdentical,
    failedDebate31DuplicateRejected:
      development.regression.failedDebate31DuplicateRejectedBeforeProjection,
    failedDebate31CardinalityRejectedAfterOrderRemoval:
      development.regression.failedDebate31CardinalityRejectedAfterOrderRemoval,
  },
  transport: {
    representation:
      "lossless columnar candidate evidence plus required nullable candidate properties partitioned under repository-owned pro and con maps",
    everyCandidateRetained: true,
    everyOriginalModelVisibleFieldRetained: true,
    parsedRoundTripIdentityVerified: true,
    semanticCandidateDownselectionPerformed: false,
    minimumCopiedInputBytes: Math.min(
      ...contexts.map((context) => context.copiedInputBytes)
    ),
    maximumCopiedInputBytes: Math.max(
      ...contexts.map((context) => context.copiedInputBytes)
    ),
    provenCeilingBytes: 115000,
    timeoutExtensionApplied: false,
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
    copiedInputBytes: contexts.reduce(
      (sum, context) => sum + context.copiedInputBytes,
      0
    ),
    maximumCopiedInputBytes: Math.max(
      ...contexts.map((context) => context.copiedInputBytes)
    ),
    modelContextsExecuted: 0,
    audioCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  stopRules: {
    ...structuredClone(sourcePreparation.stopRules),
    allThreeFailedGatesMustRemainPreserved: true,
    priorOutputsUnavailableToSuccessorModels: true,
    priorOutputsCannotCountTowardSuccessorAcceptance: true,
    allTenFreshContextsRequired: true,
    timeoutExtensionBlocks: true,
    duplicateCandidateSelectionBlocks: true,
    wrongSideCandidatePlacementBlocks: true,
    invalidSectionSideCardinalityBlocks: true,
  },
  authorization: {
    deterministicValidation: true,
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
      candidates: preparation.totals.candidates,
      maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes,
      duplicateCandidateSelectionRepresentable: false,
      fullFreshTenContextSuccessorRequired: true,
      priorOutputsReusable: false,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorized: "successor-execution-manifest",
      successorModelExecutionAuthorized: false,
    },
    null,
    2
  )
);
