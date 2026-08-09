#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  auditSidePartitionedStrictSchema,
  buildSidePartitionedSelectionMapSchema,
  compileSidePartitionedSelectionMapInventory,
  convertLegacyProposalToSidePartitionedSelectionMap,
  convertUniqueSelectionMapToSidePartitionedSelectionMap,
  projectSidePartitionedSelectionMapToLegacyProposal,
} from "./lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs";
import { projectUniqueSelectionMapToLegacyProposal } from "./lib/assessment-production-score-stability-v2-inventory-unique-selection-map.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  !shouldWrite || (frozenAt && !Number.isNaN(Date.parse(frozenAt))),
  "--write requires --frozen-at with an ISO timestamp"
);

const VALIDATION_ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort";
const ORIGINAL_ROOT = `${VALIDATION_ROOT}/inventory`;
const RECOVERY_ROOT = `${VALIDATION_ROOT}/inventory-columnar-recovery`;
const UNIQUE_ROOT = `${VALIDATION_ROOT}/inventory-unique-selection-map-successor`;
const ROOT = `${VALIDATION_ROOT}/inventory-side-partitioned-selection-map-development`;
const GUIDE = `${ROOT}/side-partitioned-selection-map-guide.md`;
const OUTPUT = `${ROOT}/development-analysis.json`;
const UNIQUE_PREPARATION = `${UNIQUE_ROOT}/preparation-manifest.json`;
const UNIQUE_FAILURE_DIAGNOSIS = `${UNIQUE_ROOT}/failure-diagnosis.json`;
const COLUMNAR_GUIDE = `${RECOVERY_ROOT}/columnar-transport-guide.md`;
const LIBRARY =
  "scripts/lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs";
const UNIQUE_LIBRARY =
  "scripts/lib/assessment-production-score-stability-v2-inventory-unique-selection-map.mjs";
const SCRIPT =
  "scripts/develop-assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2-inventory-side-partitioned-selection-map-development.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const compactBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  assertV4(!(await exists(OUTPUT)), `${OUTPUT} already exists; development is immutable`);
}

const [
  uniquePreparationBytes,
  uniqueFailureDiagnosisBytes,
  columnarGuideBytes,
  guideBytes,
] = await Promise.all([
  readFile(UNIQUE_PREPARATION),
  readFile(UNIQUE_FAILURE_DIAGNOSIS),
  readFile(COLUMNAR_GUIDE),
  readFile(GUIDE),
]);
const uniquePreparation = JSON.parse(uniquePreparationBytes);
const uniqueFailureDiagnosis = JSON.parse(uniqueFailureDiagnosisBytes);
assertV4(
  uniquePreparation.status ===
      "ten-fresh-unique-selection-map-v2-validation-inventory-contexts-prepared" &&
    uniquePreparation.selectionTopology
      ?.duplicateCandidateSelectionRepresentable === false &&
    uniquePreparation.isolation?.fullTenContextFreshExecutionRequired === true &&
    uniqueFailureDiagnosis.status ===
      "unique-selection-map-successor-gate-failed-section-side-cardinality-confirmed-no-further-action-authorized" &&
    uniqueFailureDiagnosis.failure?.debateNumber === "31" &&
    uniqueFailureDiagnosis.sectionSideEvidence?.selectedCount === 3 &&
    isDeepStrictEqual(
      uniqueFailureDiagnosis.sectionSideEvidence?.orderWithinSideValues,
      [1, 2, 2]
    ) &&
    uniqueFailureDiagnosis.gateDisposition?.acceptedAsPassed === false,
  "failed unique-selection gate evidence is unavailable"
);

const manualBytes = await readFile(uniquePreparation.inputs.manual);
const contextsByDebate = new Map(
  uniquePreparation.contexts.map((context) => [context.debateNumber, context])
);
const schemaRecords = [];
const schemaWrites = [];
for (const context of uniquePreparation.contexts) {
  const [legacySchemaBytes, transportBytes, packetBytes] = await Promise.all([
    readFile(context.priorSchema),
    readFile(context.modelCandidateTransport),
    readFile(context.packet),
  ]);
  const candidateTransport = JSON.parse(transportBytes);
  const schema = buildSidePartitionedSelectionMapSchema({
    legacySchema: JSON.parse(legacySchemaBytes),
    candidateTransport,
  });
  const schemaAudit = auditSidePartitionedStrictSchema(schema);
  assertV4(
    schemaAudit.nullableCandidateProperties === context.candidates,
    `${context.debateNumber}: candidate property count drifted`
  );
  const schemaBytes = compactBytes(schema);
  assertV4(
    !schemaBytes.includes(Buffer.from('"uniqueItems"')) &&
      !schemaBytes.includes(Buffer.from('"orderWithinSide"')),
    `${context.debateNumber}: unsupported uniqueness or model-authored order returned`
  );
  const proKeys = Object.keys(
    schema.properties.candidateSelectionsBySide.properties.pro.properties
  );
  const conKeys = Object.keys(
    schema.properties.candidateSelectionsBySide.properties.con.properties
  );
  assertV4(
    proKeys.length === context.proCandidates &&
      conKeys.length === context.conCandidates &&
      proKeys.every((candidateId) => !conKeys.includes(candidateId)),
    `${context.debateNumber}: side partition drifted`
  );
  const schemaPath = `${ROOT}/schemas/debate-${context.debateNumber}.schema.json`;
  const copiedInputBytes =
    manualBytes.length +
    columnarGuideBytes.length +
    guideBytes.length +
    packetBytes.length +
    transportBytes.length +
    schemaBytes.length;
  assertV4(
    copiedInputBytes <= 115000,
    `${context.debateNumber}: side-partitioned input exceeds proven ceiling`
  );
  schemaWrites.push({ file: schemaPath, bytes: schemaBytes });
  schemaRecords.push({
    debateNumber: context.debateNumber,
    candidates: context.candidates,
    proCandidates: context.proCandidates,
    conCandidates: context.conCandidates,
    schema: schemaPath,
    schemaSha256: sha256(schemaBytes),
    schemaBytes: schemaBytes.length,
    copiedInputBytes,
    endpointStrictObjectsAudited: schemaAudit.objectsAudited,
    nullableCandidateProperties: schemaAudit.nullableCandidateProperties,
    totalObjectProperties: schemaAudit.totalObjectProperties,
    maximumSchemaTreeDepth: schemaAudit.maximumSchemaTreeDepth,
    totalSchemaStringCharacters: schemaAudit.totalSchemaStringCharacters,
    allCandidatePropertiesRequired: true,
    additionalCandidatePropertiesRejected: true,
    candidateIdentityStructurallyUnique: true,
    repositorySideStructurallyPartitioned: true,
    wrongSideCandidateKeyRepresentable: false,
    modelAuthoredOrderPresent: false,
  });
}

function normalizeLegacySelectionOrder(proposal) {
  const normalized = structuredClone(proposal);
  for (const section of normalized.sectionSelections) {
    for (const key of ["proSelections", "conSelections"]) {
      section[key].sort((left, right) =>
        left.qualifiedCandidateId.localeCompare(right.qualifiedCandidateId)
      );
    }
  }
  return normalized;
}

const datasets = [
  {
    label: "predecessor-timeout-gate",
    kind: "legacy",
    execution: `${ORIGINAL_ROOT}/model-execution.json`,
    preparation: `${ORIGINAL_ROOT}/preparation-manifest.json`,
  },
  {
    label: "columnar-recovery-gate",
    kind: "legacy",
    execution: `${RECOVERY_ROOT}/model-execution.json`,
    preparation: `${RECOVERY_ROOT}/preparation-manifest.json`,
  },
  {
    label: "unique-selection-successor-gate",
    kind: "unique-map",
    execution: `${UNIQUE_ROOT}/model-execution.json`,
    preparation: UNIQUE_PREPARATION,
  },
];
const regressionRecords = [];
const regressionSourceFiles = [];
for (const dataset of datasets) {
  const [executionBytes, preparationBytes] = await Promise.all([
    readFile(dataset.execution),
    readFile(dataset.preparation),
  ]);
  const execution = JSON.parse(executionBytes);
  const preparation = JSON.parse(preparationBytes);
  regressionSourceFiles.push(dataset.execution, dataset.preparation);
  for (const result of execution.results.filter((item) => item.accepted)) {
    const sourceContext = preparation.contexts[result.contextIndex];
    const context = contextsByDebate.get(result.debateNumber);
    assertV4(sourceContext && context, `${result.debateNumber}: context unavailable`);
    const [
      proposalBytes,
      expectedLockedBytes,
      legacySchemaBytes,
      transportBytes,
      evidenceBundleBytes,
      eventsBytes,
    ] = await Promise.all([
      readFile(sourceContext.proposalOutput),
      readFile(sourceContext.lockedInventoryOutput),
      readFile(context.priorSchema),
      readFile(context.modelCandidateTransport),
      readFile(context.validatorCandidateEvidenceBundle),
      readFile(context.originalEvents),
    ]);
    const sourceProposal = JSON.parse(proposalBytes);
    const legacySchema = JSON.parse(legacySchemaBytes);
    const candidateTransport = JSON.parse(transportBytes);
    const expectedLegacyProposal =
      dataset.kind === "legacy"
        ? sourceProposal
        : projectUniqueSelectionMapToLegacyProposal({
            proposal: sourceProposal,
            candidateTransport,
            legacySchema,
          });
    const sideProposal =
      dataset.kind === "legacy"
        ? convertLegacyProposalToSidePartitionedSelectionMap({
            legacyProposal: sourceProposal,
            candidateTransport,
          })
        : convertUniqueSelectionMapToSidePartitionedSelectionMap({
            uniqueProposal: sourceProposal,
            candidateTransport,
          });
    const compiled = compileSidePartitionedSelectionMapInventory({
      proposal: sideProposal,
      candidateTransport,
      legacySchema,
      evidenceBundle: JSON.parse(evidenceBundleBytes),
      eventsDocument: JSON.parse(eventsBytes),
    });
    assertV4(
      isDeepStrictEqual(
        normalizeLegacySelectionOrder(compiled.projectedProposal),
        normalizeLegacySelectionOrder(expectedLegacyProposal)
      ),
      `${dataset.label}/${result.debateNumber}: legacy selection membership drifted`
    );
    assertV4(
      isDeepStrictEqual(
        compiled.lockedInventory,
        JSON.parse(expectedLockedBytes)
      ),
      `${dataset.label}/${result.debateNumber}: locked inventory drifted`
    );
    const selectedCandidates = Object.values(
      sideProposal.candidateSelectionsBySide
    ).flatMap((sideMap) =>
      Object.values(sideMap).filter((selection) => selection !== null)
    ).length;
    regressionRecords.push({
      dataset: dataset.label,
      debateNumber: result.debateNumber,
      sourceProposal: sourceContext.proposalOutput,
      sourceProposalSha256: sha256(proposalBytes),
      selectedCandidates,
      legacySelectionMembershipIdentical: true,
      lockedInventoryCanonicallyIdentical: true,
      sidePartitionedProposalSha256: sha256(jsonBytes(sideProposal)),
    });
    regressionSourceFiles.push(
      sourceContext.proposalOutput,
      sourceContext.lockedInventoryOutput,
      context.priorSchema,
      context.modelCandidateTransport,
      context.validatorCandidateEvidenceBundle,
      context.originalEvents
    );
  }
}
assertV4(
  regressionRecords.length === 13 &&
    regressionRecords.every(
      (record) =>
        record.legacySelectionMembershipIdentical &&
        record.lockedInventoryCanonicallyIdentical
    ),
  "accepted-artifact regression coverage drifted"
);

const failedDuplicateProposal = `${RECOVERY_ROOT}/inventory-proposals/debate-31.json`;
let duplicateRejected = false;
let duplicateMessage = null;
try {
  convertLegacyProposalToSidePartitionedSelectionMap({
    legacyProposal: JSON.parse(await readFile(failedDuplicateProposal)),
    candidateTransport: JSON.parse(
      await readFile(contextsByDebate.get("31").modelCandidateTransport)
    ),
  });
} catch (error) {
  duplicateMessage = error.message;
  duplicateRejected = duplicateMessage.includes(
    "duplicate candidate IDs: chunk-002:chunk-002-candidate-09"
  );
}
assertV4(duplicateRejected, "failed Debate 31 duplicate was not rejected");

const failedCardinalityProposal = `${UNIQUE_ROOT}/inventory-proposals/debate-31.json`;
const debate31Context = contextsByDebate.get("31");
const debate31Transport = JSON.parse(
  await readFile(debate31Context.modelCandidateTransport)
);
const failedSideProposal =
  convertUniqueSelectionMapToSidePartitionedSelectionMap({
    uniqueProposal: JSON.parse(await readFile(failedCardinalityProposal)),
    candidateTransport: debate31Transport,
  });
let cardinalityRejected = false;
let cardinalityMessage = null;
try {
  projectSidePartitionedSelectionMapToLegacyProposal({
    proposal: failedSideProposal,
    candidateTransport: debate31Transport,
    legacySchema: JSON.parse(await readFile(debate31Context.priorSchema)),
  });
} catch (error) {
  cardinalityMessage = error.message;
  cardinalityRejected = cardinalityMessage.includes(
    "section-naturalistic-alternatives/proSelections: requires one or two repository-side selections"
  );
}
assertV4(
  cardinalityRejected,
  "failed Debate 31 section-side cardinality was not rejected"
);
assertV4(
  Object.hasOwn(
    failedSideProposal.candidateSelectionsBySide.pro,
    "chunk-002:chunk-002-candidate-10"
  ) &&
    !Object.hasOwn(
      failedSideProposal.candidateSelectionsBySide.con,
      "chunk-002:chunk-002-candidate-10"
    ) &&
    !JSON.stringify(failedSideProposal).includes("orderWithinSide"),
  "failed probe did not expose repository side or remove model order"
);

const sourceFiles = [
  UNIQUE_PREPARATION,
  UNIQUE_FAILURE_DIAGNOSIS,
  COLUMNAR_GUIDE,
  GUIDE,
  uniquePreparation.inputs.manual,
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-inventory-execution-workflow.md",
  `${RECOVERY_ROOT}/failure-diagnosis.json`,
  `${UNIQUE_ROOT}/execution-manifest.json`,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  UNIQUE_LIBRARY,
  LIBRARY,
  SCRIPT,
  TEST,
  failedDuplicateProposal,
  failedCardinalityProposal,
  ...uniquePreparation.contexts.flatMap((context) => [
    context.packet,
    context.modelCandidateTransport,
    context.validatorCandidateEvidenceBundle,
    context.originalEvents,
    context.priorSchema,
  ]),
  ...regressionSourceFiles,
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const analysis = {
  schemaVersion:
    "1.0-score-stability-v2-inventory-side-partitioned-selection-map-development-analysis",
  protocolId:
    "assessment-production-score-stability-v2-inventory-side-partitioned-selection-map-development",
  status:
    "side-partitioned-order-free-map-retired-regression-passed-successor-preparation-authorized",
  developedAt: shouldWrite ? frozenAt : null,
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
    allThreeAcceptedAsPassed: false,
    retriesPerformed: 0,
    semanticCorrectionsPerformed: 0,
    priorOutputsReusableForSuccessorAcceptance: false,
    currentCanaryReclassified: false,
    proposedPolicyPromoted: false,
  },
  design: {
    representation:
      "required nullable candidate properties nested under repository-owned pro and con maps",
    everyCandidateKeyRequired: true,
    unselectedCandidateValue: null,
    selectedCandidateValueFields: [
      "sectionId",
      "moveId",
      "moveKind",
      "proposition",
    ],
    candidateIdentityEncodedOnlyByUniqueObjectPropertyName: true,
    duplicateCandidateSelectionRepresentable: false,
    repositorySideEncodedByExclusiveParentMap: true,
    wrongSideCandidateKeyRepresentable: false,
    orderWithinSideModelAuthored: false,
    orderWithinSideRepositoryDerivedFromChronology: true,
    positionCollisionRepresentable: false,
    unsupportedUniqueItemsUsed: false,
    candidateMembershipClosedBySchema: true,
    sectionSideCardinalitySchemaEnforcedAcrossCandidateProperties: false,
    sectionSideCardinalityDeterministicallyValidated: true,
    semanticCandidateDownselectionPerformed: false,
  },
  schemas: schemaRecords,
  regression: {
    datasets: datasets.map((dataset) => dataset.label),
    acceptedArtifactsTested: regressionRecords.length,
    records: regressionRecords,
    legacySelectionMembershipIdentical: regressionRecords.length,
    lockedInventoriesCanonicallyIdentical: regressionRecords.length,
    failedDebate31DuplicateRejectedBeforeProjection: duplicateRejected,
    failedDebate31DuplicateMessage: duplicateMessage,
    failedDebate31CardinalityRejectedAfterOrderRemoval: cardinalityRejected,
    failedDebate31CardinalityMessage: cardinalityMessage,
    freshModelEvidenceUsed: false,
  },
  transport: {
    manual: uniquePreparation.inputs.manual,
    columnarTransportGuide: COLUMNAR_GUIDE,
    sidePartitionedSelectionMapGuide: GUIDE,
    minimumCopiedInputBytes: Math.min(
      ...schemaRecords.map((record) => record.copiedInputBytes)
    ),
    maximumCopiedInputBytes: Math.max(
      ...schemaRecords.map((record) => record.copiedInputBytes)
    ),
    provenCeilingBytes: 115000,
    everyContextWithinCeiling: true,
  },
  sourceHashes,
  totals: {
    debates: schemaRecords.length,
    candidates: uniquePreparation.totals.candidates,
    acceptedRetiredOutputsReplayed: regressionRecords.length,
    failedOutputsProbed: 2,
    modelContextsExecuted: 0,
    audioCalls: 0,
    transcriptionCalls: 0,
    retries: 0,
    semanticCorrections: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  authorization: {
    successorPreparation: true,
    successorExecutionManifest: false,
    successorModelExecution: false,
    retry: false,
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
  for (const { file, bytes } of schemaWrites) {
    assertV4(!(await exists(file)), `${file} already exists; schemas are immutable`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }
  await writeFile(OUTPUT, jsonBytes(analysis));
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? analysis.status : "preview",
      debates: analysis.totals.debates,
      candidates: analysis.totals.candidates,
      acceptedRetiredOutputsReplayed:
        analysis.totals.acceptedRetiredOutputsReplayed,
      failedOutputsProbed: analysis.totals.failedOutputsProbed,
      duplicateCandidateSelectionRepresentable: false,
      wrongSideCandidateKeyRepresentable: false,
      positionCollisionRepresentable: false,
      failedDebate31CardinalityRejected:
        analysis.regression.failedDebate31CardinalityRejectedAfterOrderRemoval,
      maximumCopiedInputBytes: analysis.transport.maximumCopiedInputBytes,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorized: "successor-preparation",
      successorModelExecutionAuthorized: false,
    },
    null,
    2
  )
);
