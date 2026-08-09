#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  auditDecomposedStrictSchema,
  buildDecomposedInventoryPlanSchema,
  buildDecomposedInventorySelectionSchema,
  candidateTransportCanonicalSha256,
  compileDecomposedInventory,
  composeDecomposedInventoryProposal,
  DECOMPOSED_INVENTORY,
  DECOMPOSED_INVENTORY_LIMITS,
  inventoryPlanSha256,
  splitSidePartitionedInventoryProposal,
  validateDecomposedInventoryPlan,
  validateDecomposedInventorySelection,
} from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";
import {
  convertLegacyProposalToSidePartitionedSelectionMap,
  convertUniqueSelectionMapToSidePartitionedSelectionMap,
} from "./lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs";

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
const SIDE_ROOT =
  `${VALIDATION_ROOT}/inventory-side-partitioned-selection-map-successor`;
const ROOT = `${VALIDATION_ROOT}/inventory-decomposed-plan-selection-development`;
const GUIDE = `${ROOT}/decomposed-inventory-guide.md`;
const OUTPUT = `${ROOT}/development-analysis.json`;
const PREPARATION = `${SIDE_ROOT}/preparation-manifest.json`;
const FAILURE_DIAGNOSIS = `${SIDE_ROOT}/failure-diagnosis.json`;
const COLUMNAR_GUIDE = `${RECOVERY_ROOT}/columnar-transport-guide.md`;
const SIDE_GUIDE =
  `${VALIDATION_ROOT}/inventory-side-partitioned-selection-map-development/side-partitioned-selection-map-guide.md`;
const LIBRARY =
  "scripts/lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";
const SIDE_LIBRARY =
  "scripts/lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs";
const SCRIPT =
  "scripts/develop-assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2-inventory-decomposed-plan-selection-development.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const compactBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);
const exists = (file) => access(file).then(() => true, () => false);
const clone = (value) => structuredClone(value);

if (shouldWrite) {
  assertV4(
    !(await exists(OUTPUT)),
    `${OUTPUT} already exists; development is immutable`
  );
}

const [preparationBytes, failureDiagnosisBytes, columnarGuideBytes, guideBytes] =
  await Promise.all([
    readFile(PREPARATION),
    readFile(FAILURE_DIAGNOSIS),
    readFile(COLUMNAR_GUIDE),
    readFile(GUIDE),
  ]);
const preparation = JSON.parse(preparationBytes);
const failureDiagnosis = JSON.parse(failureDiagnosisBytes);
assertV4(
  preparation.status ===
      "ten-fresh-side-partitioned-selection-map-v2-validation-inventory-contexts-prepared" &&
    preparation.contexts?.length === 10 &&
    preparation.totals?.candidates === 406 &&
    failureDiagnosis.status ===
      "side-partitioned-selection-map-successor-gate-failed-repeat-debate-137-timeout-confirmed-no-further-action-authorized" &&
    failureDiagnosis.failure?.debateNumber === "137" &&
    failureDiagnosis.repeatedTimeoutEvidence?.occurrences === 2 &&
    failureDiagnosis.gateDisposition?.validContexts === 9 &&
    failureDiagnosis.gateDisposition?.invalidContexts === 1 &&
    failureDiagnosis.gateDisposition?.acceptedAsPassed === false,
  "side-partitioned failure evidence is unavailable"
);
for (const [file, digest] of Object.entries(failureDiagnosis.sourceHashes)) {
  assertV4(
    sha256(await readFile(file)) === digest,
    `failure diagnosis source hash drift: ${file}`
  );
}

const manualBytes = await readFile(preparation.inputs.manual);
const contextsByDebate = new Map(
  preparation.contexts.map((context) => [context.debateNumber, context])
);

function fixedString(prefix, maximum, fill) {
  assertV4(prefix.length <= maximum, `${prefix}: fixed string prefix too long`);
  return `${prefix}${fill.repeat(maximum - prefix.length)}`;
}

function maximumPlanFixture({ legacySchema, candidateTransport, debateNumber }) {
  const routes = ["pro", "con"].map((side) => ({
    routeId: fixedString(`route-${side}-`, DECOMPOSED_INVENTORY_LIMITS.identifier, side === "pro" ? "p" : "c"),
    side,
    description: fixedString(
      `${side} route description `,
      DECOMPOSED_INVENTORY_LIMITS.routeDescription,
      side === "pro" ? "P" : "C"
    ),
    successCriteria: fixedString(
      `${side} route success criteria `,
      DECOMPOSED_INVENTORY_LIMITS.routeSuccessCriteria,
      side === "pro" ? "S" : "T"
    ),
    motionBridge: {
      bridgeId: fixedString(
        `${side}-motion-`,
        DECOMPOSED_INVENTORY_LIMITS.identifier,
        "m"
      ),
      tier: "motion",
      description: fixedString(
        `${side} motion bridge `,
        DECOMPOSED_INVENTORY_LIMITS.bridgeDescription,
        "M"
      ),
    },
    centralBridges: Array.from({ length: 4 }, (_, index) => ({
      bridgeId: fixedString(
        `${side}-central-${index}-`,
        DECOMPOSED_INVENTORY_LIMITS.identifier,
        String(index)
      ),
      tier: "central",
      description: fixedString(
        `${side} central bridge ${index} `,
        DECOMPOSED_INVENTORY_LIMITS.bridgeDescription,
        "C"
      ),
    })),
    subsidiaryBridges: Array.from({ length: 2 }, (_, index) => ({
      bridgeId: fixedString(
        `${side}-subsidiary-${index}-`,
        DECOMPOSED_INVENTORY_LIMITS.identifier,
        String(index)
      ),
      tier: "subsidiary",
      description: fixedString(
        `${side} subsidiary bridge ${index} `,
        DECOMPOSED_INVENTORY_LIMITS.bridgeDescription,
        "B"
      ),
    })),
  }));
  const weights = [17, 17, 17, 17, 16, 16];
  const sections = weights.map((weightPercent, index) => ({
    sectionId: fixedString(
      `section-${debateNumber}-${index}-`,
      DECOMPOSED_INVENTORY_LIMITS.identifier,
      String(index)
    ),
    title: fixedString(
      `Section ${index} `,
      DECOMPOSED_INVENTORY_LIMITS.title,
      "T"
    ),
    weightPercent,
    rationale: fixedString(
      `Section ${index} rationale `,
      DECOMPOSED_INVENTORY_LIMITS.sectionRationale,
      "R"
    ),
  }));
  return {
    schemaVersion: DECOMPOSED_INVENTORY.planSchemaVersion,
    protocolId: DECOMPOSED_INVENTORY.planProtocolId,
    debateNumber: legacySchema.properties.debateNumber.const,
    debateId: legacySchema.properties.debateId.const,
    reviewerRole: DECOMPOSED_INVENTORY.planReviewerRole,
    assessmentModel: DECOMPOSED_INVENTORY.model,
    calibrationOnly: true,
    candidateTransportCanonicalSha256:
      candidateTransportCanonicalSha256(candidateTransport),
    isolation: Object.fromEntries(
      Object.keys(legacySchema.properties.isolation.properties).map((key) => [
        key,
        key === "contaminationDetected" ? false : true,
      ])
    ),
    routes,
    sections,
    audit: {
      completeCandidateEvidenceBundleReviewed: true,
      candidateSelectionDeferred: true,
      ratingsUnavailable: true,
      responseTopologyUnavailable: true,
      otherJudgmentsUnavailable: true,
      calculatedTotalsUnavailable: true,
      winnerLabelsUnavailable: true,
    },
  };
}

const schemaRecords = [];
const schemaWrites = [];
for (const context of preparation.contexts) {
  const [legacySchemaBytes, transportBytes, packetBytes] = await Promise.all([
    readFile(context.priorSchema),
    readFile(context.modelCandidateTransport),
    readFile(context.packet),
  ]);
  const legacySchema = JSON.parse(legacySchemaBytes);
  const candidateTransport = JSON.parse(transportBytes);
  const planSchema = buildDecomposedInventoryPlanSchema({
    legacySchema,
    candidateTransport,
  });
  const maximumPlan = maximumPlanFixture({
    legacySchema,
    candidateTransport,
    debateNumber: context.debateNumber,
  });
  validateDecomposedInventoryPlan({
    plan: maximumPlan,
    legacySchema,
    candidateTransport,
  });
  const selectionSchema = buildDecomposedInventorySelectionSchema({
    legacySchema,
    candidateTransport,
    plan: maximumPlan,
  });
  const planAudit = auditDecomposedStrictSchema(planSchema);
  const selectionAudit = auditDecomposedStrictSchema(selectionSchema);
  assertV4(
    planAudit.nullableCandidateProperties === 0 &&
      selectionAudit.nullableCandidateProperties === context.candidates,
    `${context.debateNumber}: decomposed schema candidate count drifted`
  );
  const planSchemaBytes = compactBytes(planSchema);
  const selectionSchemaBytes = compactBytes(selectionSchema);
  const maximumPlanBytes = compactBytes(maximumPlan);
  const planCopiedInputBytes =
    manualBytes.length +
    columnarGuideBytes.length +
    guideBytes.length +
    packetBytes.length +
    transportBytes.length +
    planSchemaBytes.length;
  const maximumSelectionCopiedInputBytes =
    columnarGuideBytes.length +
    guideBytes.length +
    transportBytes.length +
    maximumPlanBytes.length +
    selectionSchemaBytes.length;
  assertV4(
    planCopiedInputBytes <= 115000 && maximumSelectionCopiedInputBytes <= 115000,
    `${context.debateNumber}: decomposed stage exceeds proven input ceiling`
  );
  const planSchemaPath = `${ROOT}/schemas/plans/debate-${context.debateNumber}.schema.json`;
  const selectionSchemaPath =
    `${ROOT}/schemas/maximum-plan-selection-prototypes/debate-${context.debateNumber}.schema.json`;
  schemaWrites.push(
    { file: planSchemaPath, bytes: planSchemaBytes },
    { file: selectionSchemaPath, bytes: selectionSchemaBytes }
  );
  schemaRecords.push({
    debateNumber: context.debateNumber,
    candidates: context.candidates,
    planSchema: planSchemaPath,
    planSchemaSha256: sha256(planSchemaBytes),
    planSchemaBytes: planSchemaBytes.length,
    selectionSchemaPrototype: selectionSchemaPath,
    selectionSchemaPrototypeSha256: sha256(selectionSchemaBytes),
    selectionSchemaPrototypeBytes: selectionSchemaBytes.length,
    maximumPlanOutputBytes: maximumPlanBytes.length,
    planCopiedInputBytes,
    maximumSelectionCopiedInputBytes,
    planStrictObjectsAudited: planAudit.objectsAudited,
    selectionStrictObjectsAudited: selectionAudit.objectsAudited,
    selectionNullableCandidateProperties:
      selectionAudit.nullableCandidateProperties,
    planMaximumSchemaTreeDepth: planAudit.maximumSchemaTreeDepth,
    selectionMaximumSchemaTreeDepth: selectionAudit.maximumSchemaTreeDepth,
    planTotalSchemaStringCharacters: planAudit.totalSchemaStringCharacters,
    selectionTotalSchemaStringCharacters:
      selectionAudit.totalSchemaStringCharacters,
    planContainsCandidateSelections: false,
    selectionContainsRoutesOrSections: false,
    selectionSectionIdsBoundToPlan: true,
  });
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
    preparation: `${UNIQUE_ROOT}/preparation-manifest.json`,
  },
  {
    label: "side-partitioned-successor-gate",
    kind: "side-map",
    execution: `${SIDE_ROOT}/model-execution.json`,
    preparation: PREPARATION,
  },
];
const regressionRecords = [];
const regressionSourceFiles = [];
for (const dataset of datasets) {
  const [executionBytes, sourcePreparationBytes] = await Promise.all([
    readFile(dataset.execution),
    readFile(dataset.preparation),
  ]);
  const execution = JSON.parse(executionBytes);
  const sourcePreparation = JSON.parse(sourcePreparationBytes);
  regressionSourceFiles.push(dataset.execution, dataset.preparation);
  for (const result of execution.results.filter((item) => item.accepted)) {
    const sourceContext = sourcePreparation.contexts[result.contextIndex];
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
    const candidateTransport = JSON.parse(transportBytes);
    const sideProposal =
      dataset.kind === "legacy"
        ? convertLegacyProposalToSidePartitionedSelectionMap({
            legacyProposal: sourceProposal,
            candidateTransport,
          })
        : dataset.kind === "unique-map"
          ? convertUniqueSelectionMapToSidePartitionedSelectionMap({
              uniqueProposal: sourceProposal,
              candidateTransport,
            })
          : sourceProposal;
    const legacySchema = JSON.parse(legacySchemaBytes);
    const { plan, selection } = splitSidePartitionedInventoryProposal({
      proposal: sideProposal,
      candidateTransport,
    });
    validateDecomposedInventoryPlan({ plan, legacySchema, candidateTransport });
    validateDecomposedInventorySelection({
      selection,
      plan,
      legacySchema,
      candidateTransport,
    });
    const compiled = compileDecomposedInventory({
      plan,
      selection,
      legacySchema,
      candidateTransport,
      evidenceBundle: JSON.parse(evidenceBundleBytes),
      eventsDocument: JSON.parse(eventsBytes),
    });
    assertV4(
      isDeepStrictEqual(compiled.proposal, sideProposal),
      `${dataset.label}/${result.debateNumber}: recomposed proposal drifted`
    );
    assertV4(
      isDeepStrictEqual(compiled.lockedInventory, JSON.parse(expectedLockedBytes)),
      `${dataset.label}/${result.debateNumber}: locked inventory drifted`
    );
    const sideProposalBytes = compactBytes(sideProposal);
    const planBytes = compactBytes(plan);
    const selectionBytes = compactBytes(selection);
    assertV4(
      planBytes.length < sideProposalBytes.length &&
        selectionBytes.length < sideProposalBytes.length,
      `${dataset.label}/${result.debateNumber}: a decomposed output is not smaller`
    );
    regressionRecords.push({
      dataset: dataset.label,
      debateNumber: result.debateNumber,
      sourceProposal: sourceContext.proposalOutput,
      sourceProposalSha256: sha256(proposalBytes),
      sideProposalBytes: sideProposalBytes.length,
      planOutputBytes: planBytes.length,
      selectionOutputBytes: selectionBytes.length,
      planReductionFraction: Number(
        (1 - planBytes.length / sideProposalBytes.length).toFixed(4)
      ),
      selectionReductionFraction: Number(
        (1 - selectionBytes.length / sideProposalBytes.length).toFixed(4)
      ),
      planBoundToCandidateTransport: true,
      selectionBoundToPlan: true,
      recomposedSideProposalIdentical: true,
      lockedInventoryCanonicallyIdentical: true,
      planSha256: inventoryPlanSha256(plan),
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
  regressionRecords.length === 22 &&
    regressionRecords.every(
      (record) =>
        record.recomposedSideProposalIdentical &&
        record.lockedInventoryCanonicallyIdentical
    ),
  "decomposed accepted-artifact regression coverage drifted"
);

const debate31Context = contextsByDebate.get("31");
const debate31Transport = JSON.parse(
  await readFile(debate31Context.modelCandidateTransport)
);
const failedDuplicateProposal = `${RECOVERY_ROOT}/inventory-proposals/debate-31.json`;
let duplicateRejected = false;
try {
  convertLegacyProposalToSidePartitionedSelectionMap({
    legacyProposal: JSON.parse(await readFile(failedDuplicateProposal)),
    candidateTransport: debate31Transport,
  });
} catch (error) {
  duplicateRejected = error.message.includes("duplicate candidate IDs");
}
assertV4(duplicateRejected, "failed Debate 31 duplicate was not rejected");

const failedCardinalityProposal = `${UNIQUE_ROOT}/inventory-proposals/debate-31.json`;
const invalidSideProposal = convertUniqueSelectionMapToSidePartitionedSelectionMap({
  uniqueProposal: JSON.parse(await readFile(failedCardinalityProposal)),
  candidateTransport: debate31Transport,
});
const invalidSplit = splitSidePartitionedInventoryProposal({
  proposal: invalidSideProposal,
  candidateTransport: debate31Transport,
});
let cardinalityRejected = false;
try {
  composeDecomposedInventoryProposal({
    ...invalidSplit,
    legacySchema: JSON.parse(await readFile(debate31Context.priorSchema)),
    candidateTransport: debate31Transport,
  });
} catch (error) {
  cardinalityRejected = error.message.includes("requires one or two selections");
}
assertV4(cardinalityRejected, "failed Debate 31 cardinality was not rejected");

const acceptedDebate86 = `${SIDE_ROOT}/inventory-proposals/debate-86.json`;
const debate86Context = contextsByDebate.get("86");
const debate86Transport = JSON.parse(
  await readFile(debate86Context.modelCandidateTransport)
);
const debate86LegacySchema = JSON.parse(await readFile(debate86Context.priorSchema));
const boundSplit = splitSidePartitionedInventoryProposal({
  proposal: JSON.parse(await readFile(acceptedDebate86)),
  candidateTransport: debate86Transport,
});
let planHashMismatchRejected = false;
try {
  composeDecomposedInventoryProposal({
    plan: boundSplit.plan,
    selection: { ...clone(boundSplit.selection), inventoryPlanSha256: "0".repeat(64) },
    legacySchema: debate86LegacySchema,
    candidateTransport: debate86Transport,
  });
} catch (error) {
  planHashMismatchRejected = error.message.includes("identity, binding");
}
assertV4(planHashMismatchRejected, "selection plan-hash mismatch was not rejected");

let postSelectionPlanMutationRejected = false;
const mutatedPlan = clone(boundSplit.plan);
mutatedPlan.sections[0].title = `${mutatedPlan.sections[0].title} changed`;
try {
  composeDecomposedInventoryProposal({
    plan: mutatedPlan,
    selection: boundSplit.selection,
    legacySchema: debate86LegacySchema,
    candidateTransport: debate86Transport,
  });
} catch (error) {
  postSelectionPlanMutationRejected = error.message.includes("identity, binding");
}
assertV4(
  postSelectionPlanMutationRejected,
  "post-selection plan mutation was not rejected"
);

let wrongSideRelocationRejected = false;
const relocatedSelection = clone(boundSplit.selection);
const relocatedCandidate = Object.keys(
  relocatedSelection.candidateSelectionsBySide.pro
)[0];
const relocatedValue =
  relocatedSelection.candidateSelectionsBySide.pro[relocatedCandidate];
delete relocatedSelection.candidateSelectionsBySide.pro[relocatedCandidate];
relocatedSelection.candidateSelectionsBySide.con[relocatedCandidate] =
  relocatedValue;
try {
  composeDecomposedInventoryProposal({
    plan: boundSplit.plan,
    selection: relocatedSelection,
    legacySchema: debate86LegacySchema,
    candidateTransport: debate86Transport,
  });
} catch (error) {
  wrongSideRelocationRejected = error.message.includes("keys must be");
}
assertV4(wrongSideRelocationRejected, "wrong-side relocation was not rejected");

assertV4(
  !(await exists(`${SIDE_ROOT}/inventory-proposals/debate-137.json`)) &&
    failureDiagnosis.failure?.proposalWritten === false &&
    failureDiagnosis.failure?.deterministicValidationReached === false,
  "Debate 137 timeout unexpectedly supplied semantic output"
);

const sourceFiles = [
  PREPARATION,
  FAILURE_DIAGNOSIS,
  COLUMNAR_GUIDE,
  SIDE_GUIDE,
  GUIDE,
  preparation.inputs.manual,
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-inventory-execution-workflow.md",
  `${SIDE_ROOT}/execution-manifest.json`,
  `${SIDE_ROOT}/model-execution.json`,
  `${RECOVERY_ROOT}/failure-diagnosis.json`,
  `${UNIQUE_ROOT}/failure-diagnosis.json`,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  SIDE_LIBRARY,
  LIBRARY,
  SCRIPT,
  TEST,
  failedDuplicateProposal,
  failedCardinalityProposal,
  acceptedDebate86,
  ...preparation.contexts.flatMap((context) => [
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
    "1.0-score-stability-v2-decomposed-plan-selection-inventory-development-analysis",
  protocolId:
    "assessment-production-score-stability-v2-decomposed-plan-selection-inventory-development",
  status:
    "decomposed-plan-selection-retired-regression-passed-successor-preparation-authorized",
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
    sidePartitionedSelectionSuccessorGatePreservedFailed: true,
    allFourAcceptedAsPassed: false,
    retriesPerformed: 0,
    semanticCorrectionsPerformed: 0,
    priorOutputsReusableForSuccessorAcceptance: false,
    currentCanaryReclassified: false,
    proposedPolicyPromoted: false,
  },
  design: {
    stages: ["inventory-plan", "candidate-selection"],
    freshIsolatedContextPerStage: true,
    plannerWritableDomains: ["routes", "sections"],
    plannerCandidateSelectionUnavailable: true,
    selectorWritableDomains: ["candidateSelectionsBySide"],
    selectorRoutesAndSectionsImmutable: true,
    selectorPlannerExecutionMetadataUnavailable: true,
    canonicalCandidateTransportHashBoundInBothStages: true,
    canonicalPlanHashBoundInSelectionStage: true,
    deterministicCompositionRequired: true,
    finalProposalSemantics:
      "side-partitioned candidate map with repository-owned side and chronology",
    candidateIdentityStructurallyUnique: true,
    duplicateCandidateSelectionRepresentable: false,
    wrongSideCandidateKeyRepresentable: false,
    orderWithinSideModelAuthored: false,
    positionCollisionRepresentable: false,
    selectionSectionIdsSchemaBoundToImmutablePlan: true,
    sectionSideCardinalitySchemaEnforcedAcrossCandidateProperties: false,
    sectionSideCardinalityDeterministicallyValidated: true,
    scoreFieldsAvailable: false,
    semanticCandidateDownselectionPerformed: false,
  },
  schemas: schemaRecords,
  regression: {
    datasets: datasets.map((dataset) => dataset.label),
    acceptedArtifactsTested: regressionRecords.length,
    records: regressionRecords,
    recomposedSideProposalsIdentical: regressionRecords.length,
    lockedInventoriesCanonicallyIdentical: regressionRecords.length,
    everyPlanOutputSmallerThanSourceProposal: true,
    everySelectionOutputSmallerThanSourceProposal: true,
    freshModelEvidenceUsed: false,
  },
  outputDecomposition: {
    minimumPlanReductionFraction: Math.min(
      ...regressionRecords.map((record) => record.planReductionFraction)
    ),
    minimumSelectionReductionFraction: Math.min(
      ...regressionRecords.map((record) => record.selectionReductionFraction)
    ),
    maximumPlanOutputBytesObserved: Math.max(
      ...regressionRecords.map((record) => record.planOutputBytes)
    ),
    maximumSelectionOutputBytesObserved: Math.max(
      ...regressionRecords.map((record) => record.selectionOutputBytes)
    ),
    eachStageOutputSmallerThanSourceProposal: true,
  },
  failureProbes: {
    failedDebate31DuplicateRejected: duplicateRejected,
    failedDebate31CardinalityRejected: cardinalityRejected,
    selectionPlanHashMismatchRejected: planHashMismatchRejected,
    postSelectionPlanMutationRejected,
    wrongSideCandidateRelocationRejected: wrongSideRelocationRejected,
    debate137TimeoutOccurrences: 2,
    debate137ProposalAvailable: false,
    debate137SemanticRepairAttempted: false,
  },
  stageInputBounds: {
    provenCeilingBytes: 115000,
    planMinimumCopiedInputBytes: Math.min(
      ...schemaRecords.map((record) => record.planCopiedInputBytes)
    ),
    planMaximumCopiedInputBytes: Math.max(
      ...schemaRecords.map((record) => record.planCopiedInputBytes)
    ),
    selectionMinimumMaximumBoundBytes: Math.min(
      ...schemaRecords.map((record) => record.maximumSelectionCopiedInputBytes)
    ),
    selectionMaximumCopiedInputBoundBytes: Math.max(
      ...schemaRecords.map((record) => record.maximumSelectionCopiedInputBytes)
    ),
    everyPlanStageWithinCeiling: true,
    everySelectionStageMaximumWithinCeiling: true,
    maximumPlanStringLengthsFrozen: clone(DECOMPOSED_INVENTORY_LIMITS),
  },
  sourceHashes,
  totals: {
    debates: schemaRecords.length,
    candidates: preparation.totals.candidates,
    acceptedRetiredOutputsReplayed: regressionRecords.length,
    failedOutputsProbed: 3,
    bindingTamperProbes: 3,
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
  for (const { file, bytes } of schemaWrites) {
    assertV4(!(await exists(file)), `${file} already exists; schema is immutable`);
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
      acceptedArtifactsReplayed:
        analysis.totals.acceptedRetiredOutputsReplayed,
      failedOutputsProbed: analysis.totals.failedOutputsProbed,
      bindingTamperProbes: analysis.totals.bindingTamperProbes,
      minimumPlanReductionFraction:
        analysis.outputDecomposition.minimumPlanReductionFraction,
      minimumSelectionReductionFraction:
        analysis.outputDecomposition.minimumSelectionReductionFraction,
      planMaximumCopiedInputBytes:
        analysis.stageInputBounds.planMaximumCopiedInputBytes,
      selectionMaximumCopiedInputBoundBytes:
        analysis.stageInputBounds.selectionMaximumCopiedInputBoundBytes,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorized: "successor-preparation",
      successorModelExecutionAuthorized: false,
    },
    null,
    2
  )
);
