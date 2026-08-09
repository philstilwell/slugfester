import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import {
  assertV4,
  canonicalJson,
  containsProhibitedCalculatedField,
} from "./v4-lean-production.mjs";
import {
  buildDecomposedInventoryPlanSchema,
  buildDecomposedInventorySelectionSchema,
  DECOMPOSED_INVENTORY,
  DECOMPOSED_INVENTORY_LIMITS,
  splitSidePartitionedInventoryProposal,
  validateDecomposedInventoryPlan,
} from "./assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";
import {
  compileSidePartitionedSelectionMapInventory,
  projectSidePartitionedSelectionMapToLegacyProposal,
  SIDE_PARTITIONED_SELECTION_MAP,
} from "./assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs";

export const CANDIDATE_SHARDED_INVENTORY = Object.freeze({
  planSchemaVersion: "4.2.21.16.5-score-blind-inventory-plan",
  planProtocolId: "v4.2.21.16.5-candidate-sharded-plan-contract",
  sideSelectionSchemaVersion:
    "4.2.21.16.5-score-blind-side-candidate-selection",
  sideSelectionProtocolId:
    "v4.2.21.16.5-candidate-sharded-side-selection-contract",
  planReviewerRole: "score-blind-candidate-census-inventory-planner",
  sideReviewerRole: (side) =>
    `score-blind-${side}-candidate-evidence-selector`,
  model: "5.6 Sol",
  priorityTiers: ["essential", "strong", "supporting"],
});

const PLAN_KEYS = Object.freeze([
  "schemaVersion",
  "protocolId",
  "debateNumber",
  "debateId",
  "reviewerRole",
  "assessmentModel",
  "calibrationOnly",
  "candidateCensusCanonicalSha256",
  "fullCandidateTransportCanonicalSha256",
  "isolation",
  "routes",
  "sections",
  "audit",
]);
const SIDE_SELECTION_KEYS = Object.freeze([
  "schemaVersion",
  "protocolId",
  "debateNumber",
  "debateId",
  "reviewerRole",
  "assessmentModel",
  "calibrationOnly",
  "side",
  "fullCandidateTransportCanonicalSha256",
  "sideCandidateTransportCanonicalSha256",
  "inventoryPlanSha256",
  "isolation",
  "candidateSelections",
  "audit",
]);
const PLAN_ISOLATION = Object.freeze({
  legacyAssessmentsUnavailable: true,
  calculatedTotalsUnavailable: true,
  winnerLabelsUnavailable: true,
  otherJudgmentsUnavailable: true,
  assessmentProseUnavailable: true,
  otherDebatesUnavailable: true,
  candidateEvidenceExcerptsUnavailable: true,
  contaminationDetected: false,
});
const SIDE_SELECTION_ISOLATION = Object.freeze({
  legacyAssessmentsUnavailable: true,
  calculatedTotalsUnavailable: true,
  winnerLabelsUnavailable: true,
  otherJudgmentsUnavailable: true,
  assessmentProseUnavailable: true,
  otherDebatesUnavailable: true,
  inventoryPlanAvailable: true,
  inventoryPlanExecutionMetadataUnavailable: true,
  otherSideCandidateEvidenceUnavailable: true,
  otherSideSelectorOutputUnavailable: true,
  contaminationDetected: false,
});
const PLAN_AUDIT_KEYS = Object.freeze([
  "completeCandidateCensusReviewed",
  "allCandidateIdsAndChronologyAvailable",
  "candidateEvidenceExcerptsDeferredToSideSelectors",
  "candidateSelectionDeferred",
  "ratingsUnavailable",
  "responseTopologyUnavailable",
  "otherJudgmentsUnavailable",
  "calculatedTotalsUnavailable",
  "winnerLabelsUnavailable",
]);
const SIDE_SELECTION_AUDIT_KEYS = Object.freeze([
  "inventoryPlanImmutable",
  "completeSideCandidateEvidenceReviewed",
  "everySideCandidateKeyReviewed",
  "otherSideSelectionUnavailable",
  "priorityTiersApplied",
  "repositoryCardinalityReductionDeferred",
  "ratingsUnavailable",
  "responseTopologyUnavailable",
  "otherJudgmentsUnavailable",
  "calculatedTotalsUnavailable",
  "winnerLabelsUnavailable",
]);
const CENSUS_OMITTED_COLUMNS = new Set([
  "candidateEvidence.excerpt",
  "candidateEvidence.sourceExact",
]);
const PRIORITY_ORDER = new Map(
  CANDIDATE_SHARDED_INVENTORY.priorityTiers.map((tier, index) => [tier, index])
);
const clone = (value) => structuredClone(value);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalSha256 = (value) => sha256(canonicalJson(value));

function exactKeys(value, expected, label) {
  assertV4(
    value && typeof value === "object" && !Array.isArray(value),
    `${label}: expected object`
  );
  assertV4(
    isDeepStrictEqual(Object.keys(value).sort(), [...expected].sort()),
    `${label}: keys must be ${[...expected].sort().join(", ")}`
  );
}

function boundedString(value, minimum, maximum, label) {
  assertV4(
    typeof value === "string" &&
      value.trim().length >= minimum &&
      value.length <= maximum,
    `${label}: string must contain ${minimum}..${maximum} characters`
  );
}

function constBooleanObject(values) {
  return {
    type: "object",
    additionalProperties: false,
    required: Object.keys(values),
    properties: Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        { type: "boolean", const: value },
      ])
    ),
  };
}

function candidateMetadata(candidateTransport) {
  const columns = [
    "qualifiedCandidateId",
    "side",
    "sourceSpan.startEvent",
    "sourceSpan.endEvent",
  ];
  const indexes = Object.fromEntries(
    columns.map((column) => [column, candidateTransport.columnOrder.indexOf(column)])
  );
  assertV4(
    Object.values(indexes).every((index) => index >= 0),
    "candidate identity, side, or chronology column missing"
  );
  const candidates = candidateTransport.candidateRows.map((row) => ({
    qualifiedCandidateId: row[indexes.qualifiedCandidateId],
    side: row[indexes.side],
    startEvent: row[indexes["sourceSpan.startEvent"]],
    endEvent: row[indexes["sourceSpan.endEvent"]],
  }));
  assertV4(
    candidates.length === candidateTransport.candidateCount &&
      new Set(candidates.map((candidate) => candidate.qualifiedCandidateId))
        .size === candidates.length &&
      candidates.every(
        (candidate) =>
          ["pro", "con"].includes(candidate.side) &&
          Number.isInteger(candidate.startEvent) &&
          Number.isInteger(candidate.endEvent) &&
          candidate.endEvent >= candidate.startEvent
      ),
    "candidate transport identity, side, or chronology drifted"
  );
  return candidates;
}

export function fullCandidateTransportCanonicalSha256(candidateTransport) {
  candidateMetadata(candidateTransport);
  return canonicalSha256(candidateTransport);
}

export function buildCandidateCensus(candidateTransport) {
  candidateMetadata(candidateTransport);
  const retainedIndexes = candidateTransport.columnOrder
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => !CENSUS_OMITTED_COLUMNS.has(column));
  const census = {
    schemaVersion: "1.0-score-blind-candidate-census",
    protocolId: "v4.2.21.16.5-candidate-census-transport",
    sourceTransportCanonicalSha256:
      fullCandidateTransportCanonicalSha256(candidateTransport),
    debateNumber: candidateTransport.debateNumber,
    debateId: candidateTransport.debateId,
    candidateCount: candidateTransport.candidateCount,
    completeSourceDiscovery: clone(candidateTransport.completeSourceDiscovery),
    censusPolicy: {
      everyCandidateRetained: true,
      semanticCandidateDownselectionPerformed: false,
      candidateOrderPreserved: true,
      fullEvidenceExcerptDeferredToSideSelectors: true,
      exactSourceFlagDeferredToSideSelectors: true,
      omittedColumns: [...CENSUS_OMITTED_COLUMNS],
    },
    columnOrder: retainedIndexes.map(({ column }) => column),
    candidateRows: candidateTransport.candidateRows.map((row) =>
      retainedIndexes.map(({ index }) => row[index])
    ),
  };
  assertV4(
    census.candidateRows.length === candidateTransport.candidateRows.length &&
      census.candidateRows.every(
        (row, index) =>
          row.length === census.columnOrder.length &&
          row[census.columnOrder.indexOf("qualifiedCandidateId")] ===
            candidateTransport.candidateRows[index][
              candidateTransport.columnOrder.indexOf("qualifiedCandidateId")
            ]
      ),
    "candidate census projection drifted"
  );
  return census;
}

export function candidateCensusCanonicalSha256(candidateCensus) {
  return canonicalSha256(candidateCensus);
}

export function buildSideCandidateEvidenceTransport(candidateTransport, side) {
  assertV4(["pro", "con"].includes(side), `invalid side: ${side}`);
  const candidates = candidateMetadata(candidateTransport);
  const sideIndex = candidateTransport.columnOrder.indexOf("side");
  const rows = candidateTransport.candidateRows.filter(
    (row) => row[sideIndex] === side
  );
  assertV4(
    rows.length === candidates.filter((candidate) => candidate.side === side).length &&
      rows.length > 0,
    `${side}: side candidate transport is empty or incomplete`
  );
  return {
    schemaVersion: "1.0-lossless-side-candidate-evidence-transport",
    protocolId: "v4.2.21.16.5-side-candidate-evidence-transport",
    sourceSchemaVersion: candidateTransport.schemaVersion,
    sourceTransportCanonicalSha256:
      fullCandidateTransportCanonicalSha256(candidateTransport),
    debateNumber: candidateTransport.debateNumber,
    debateId: candidateTransport.debateId,
    side,
    sourceCandidateCount: candidateTransport.candidateCount,
    candidateCount: rows.length,
    completeSourceDiscovery: {
      ...clone(candidateTransport.completeSourceDiscovery),
      everyCandidateRetained: false,
      everySideCandidateRetained: true,
    },
    transportPolicy: {
      everyCandidateForSideRetained: true,
      semanticCandidateDownselectionPerformed: false,
      everyOriginalModelVisibleFieldRetained: true,
      candidateOrderPreserved: true,
      otherSideCandidateEvidenceOmitted: true,
      omittedValidatorFieldsRestoredAfterSelection: true,
    },
    columnOrder: clone(candidateTransport.columnOrder),
    candidateRows: clone(rows),
  };
}

export function sideCandidateTransportCanonicalSha256(sideTransport) {
  return canonicalSha256(sideTransport);
}

function legacyIsolation(legacySchema) {
  return Object.fromEntries(
    Object.keys(legacySchema.properties.isolation.properties).map((key) => [
      key,
      key === "contaminationDetected" ? false : true,
    ])
  );
}

function toDecomposedPlan({
  plan,
  legacySchema,
  candidateTransport,
}) {
  return {
    schemaVersion: DECOMPOSED_INVENTORY.planSchemaVersion,
    protocolId: DECOMPOSED_INVENTORY.planProtocolId,
    debateNumber: plan.debateNumber,
    debateId: plan.debateId,
    reviewerRole: DECOMPOSED_INVENTORY.planReviewerRole,
    assessmentModel: plan.assessmentModel,
    calibrationOnly: plan.calibrationOnly,
    candidateTransportCanonicalSha256:
      fullCandidateTransportCanonicalSha256(candidateTransport),
    isolation: legacyIsolation(legacySchema),
    routes: clone(plan.routes),
    sections: clone(plan.sections),
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

export function candidateShardedInventoryPlanSha256(plan) {
  return canonicalSha256(plan);
}

export function buildCandidateShardedInventoryPlanSchema({
  legacySchema,
  candidateTransport,
  candidateCensus,
}) {
  assertV4(
    isDeepStrictEqual(candidateCensus, buildCandidateCensus(candidateTransport)),
    "candidate census is not the canonical full-cohort projection"
  );
  const schema = buildDecomposedInventoryPlanSchema({
    legacySchema,
    candidateTransport,
  });
  schema.$id = "slugfester-v4221165-score-blind-candidate-sharded-plan";
  schema.title = "Slugfester v4.2.21.16.5 candidate-sharded inventory plan";
  schema.required = [...PLAN_KEYS];
  delete schema.properties.candidateTransportCanonicalSha256;
  schema.properties = {
    schemaVersion: {
      type: "string",
      const: CANDIDATE_SHARDED_INVENTORY.planSchemaVersion,
    },
    protocolId: {
      type: "string",
      const: CANDIDATE_SHARDED_INVENTORY.planProtocolId,
    },
    debateNumber: clone(legacySchema.properties.debateNumber),
    debateId: clone(legacySchema.properties.debateId),
    reviewerRole: {
      type: "string",
      const: CANDIDATE_SHARDED_INVENTORY.planReviewerRole,
    },
    assessmentModel: {
      type: "string",
      const: CANDIDATE_SHARDED_INVENTORY.model,
    },
    calibrationOnly: { type: "boolean", const: true },
    candidateCensusCanonicalSha256: {
      type: "string",
      const: candidateCensusCanonicalSha256(candidateCensus),
    },
    fullCandidateTransportCanonicalSha256: {
      type: "string",
      const: fullCandidateTransportCanonicalSha256(candidateTransport),
    },
    isolation: constBooleanObject(PLAN_ISOLATION),
    routes: schema.properties.routes,
    sections: schema.properties.sections,
    audit: constBooleanObject(
      Object.fromEntries(PLAN_AUDIT_KEYS.map((key) => [key, true]))
    ),
  };
  return schema;
}

export function validateCandidateShardedInventoryPlan({
  plan,
  legacySchema,
  candidateTransport,
  candidateCensus,
}) {
  exactKeys(plan, PLAN_KEYS, "candidate-sharded inventory plan");
  assertV4(
    isDeepStrictEqual(candidateCensus, buildCandidateCensus(candidateTransport)) &&
      plan.schemaVersion === CANDIDATE_SHARDED_INVENTORY.planSchemaVersion &&
      plan.protocolId === CANDIDATE_SHARDED_INVENTORY.planProtocolId &&
      plan.debateNumber === legacySchema.properties.debateNumber.const &&
      plan.debateId === legacySchema.properties.debateId.const &&
      plan.reviewerRole === CANDIDATE_SHARDED_INVENTORY.planReviewerRole &&
      plan.assessmentModel === CANDIDATE_SHARDED_INVENTORY.model &&
      plan.calibrationOnly === true &&
      plan.candidateCensusCanonicalSha256 ===
        candidateCensusCanonicalSha256(candidateCensus) &&
      plan.fullCandidateTransportCanonicalSha256 ===
        fullCandidateTransportCanonicalSha256(candidateTransport) &&
      isDeepStrictEqual(plan.isolation, PLAN_ISOLATION) &&
      !containsProhibitedCalculatedField(plan),
    "candidate-sharded plan identity, binding, or isolation drifted"
  );
  exactKeys(plan.audit, PLAN_AUDIT_KEYS, "candidate-sharded plan audit");
  assertV4(
    Object.values(plan.audit).every((value) => value === true),
    "candidate-sharded plan audit assertions must be true"
  );
  validateDecomposedInventoryPlan({
    plan: toDecomposedPlan({ plan, legacySchema, candidateTransport }),
    legacySchema,
    candidateTransport,
  });
  return { status: "passed", sections: plan.sections.length };
}

export function buildCandidateShardedSideSelectionSchema({
  side,
  legacySchema,
  candidateTransport,
  sideCandidateTransport,
  candidateCensus,
  plan,
}) {
  validateCandidateShardedInventoryPlan({
    plan,
    legacySchema,
    candidateTransport,
    candidateCensus,
  });
  assertV4(
    isDeepStrictEqual(
      sideCandidateTransport,
      buildSideCandidateEvidenceTransport(candidateTransport, side)
    ),
    `${side}: noncanonical side candidate transport`
  );
  const decomposedPlan = toDecomposedPlan({
    plan,
    legacySchema,
    candidateTransport,
  });
  const full = buildDecomposedInventorySelectionSchema({
    legacySchema,
    candidateTransport,
    plan: decomposedPlan,
  });
  const candidateSelection = clone(full.$defs.candidateSelection);
  candidateSelection.required = [
    "sectionId",
    "priorityTier",
    "moveId",
    "moveKind",
    "proposition",
  ];
  candidateSelection.properties = {
    sectionId: candidateSelection.properties.sectionId,
    priorityTier: {
      type: "string",
      enum: [...CANDIDATE_SHARDED_INVENTORY.priorityTiers],
    },
    moveId: candidateSelection.properties.moveId,
    moveKind: candidateSelection.properties.moveKind,
    proposition: candidateSelection.properties.proposition,
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v4221165-score-blind-${side}-candidate-selection`,
    title: `Slugfester v4.2.21.16.5 ${side} candidate evidence selection`,
    type: "object",
    additionalProperties: false,
    required: [...SIDE_SELECTION_KEYS],
    properties: {
      schemaVersion: {
        type: "string",
        const: CANDIDATE_SHARDED_INVENTORY.sideSelectionSchemaVersion,
      },
      protocolId: {
        type: "string",
        const: CANDIDATE_SHARDED_INVENTORY.sideSelectionProtocolId,
      },
      debateNumber: clone(legacySchema.properties.debateNumber),
      debateId: clone(legacySchema.properties.debateId),
      reviewerRole: {
        type: "string",
        const: CANDIDATE_SHARDED_INVENTORY.sideReviewerRole(side),
      },
      assessmentModel: {
        type: "string",
        const: CANDIDATE_SHARDED_INVENTORY.model,
      },
      calibrationOnly: { type: "boolean", const: true },
      side: { type: "string", const: side },
      fullCandidateTransportCanonicalSha256: {
        type: "string",
        const: fullCandidateTransportCanonicalSha256(candidateTransport),
      },
      sideCandidateTransportCanonicalSha256: {
        type: "string",
        const: sideCandidateTransportCanonicalSha256(sideCandidateTransport),
      },
      inventoryPlanSha256: {
        type: "string",
        const: candidateShardedInventoryPlanSha256(plan),
      },
      isolation: constBooleanObject(SIDE_SELECTION_ISOLATION),
      candidateSelections:
        full.properties.candidateSelectionsBySide.properties[side],
      audit: constBooleanObject(
        Object.fromEntries(
          SIDE_SELECTION_AUDIT_KEYS.map((key) => [key, true])
        )
      ),
    },
    $defs: { candidateSelection },
  };
}

export function validateCandidateShardedSideSelection({
  sideSelection,
  side,
  plan,
  legacySchema,
  candidateTransport,
  sideCandidateTransport,
  candidateCensus,
}) {
  validateCandidateShardedInventoryPlan({
    plan,
    legacySchema,
    candidateTransport,
    candidateCensus,
  });
  exactKeys(
    sideSelection,
    SIDE_SELECTION_KEYS,
    `${side} candidate-sharded selection`
  );
  assertV4(
    ["pro", "con"].includes(side) &&
      sideSelection.schemaVersion ===
        CANDIDATE_SHARDED_INVENTORY.sideSelectionSchemaVersion &&
      sideSelection.protocolId ===
        CANDIDATE_SHARDED_INVENTORY.sideSelectionProtocolId &&
      sideSelection.debateNumber === plan.debateNumber &&
      sideSelection.debateId === plan.debateId &&
      sideSelection.reviewerRole ===
        CANDIDATE_SHARDED_INVENTORY.sideReviewerRole(side) &&
      sideSelection.assessmentModel === CANDIDATE_SHARDED_INVENTORY.model &&
      sideSelection.calibrationOnly === true &&
      sideSelection.side === side &&
      sideSelection.fullCandidateTransportCanonicalSha256 ===
        fullCandidateTransportCanonicalSha256(candidateTransport) &&
      isDeepStrictEqual(
        sideCandidateTransport,
        buildSideCandidateEvidenceTransport(candidateTransport, side)
      ) &&
      sideSelection.sideCandidateTransportCanonicalSha256 ===
        sideCandidateTransportCanonicalSha256(sideCandidateTransport) &&
      sideSelection.inventoryPlanSha256 ===
        candidateShardedInventoryPlanSha256(plan) &&
      isDeepStrictEqual(sideSelection.isolation, SIDE_SELECTION_ISOLATION) &&
      !containsProhibitedCalculatedField(sideSelection),
    `${side}: selection identity, binding, or isolation drifted`
  );
  exactKeys(
    sideSelection.audit,
    SIDE_SELECTION_AUDIT_KEYS,
    `${side} selection audit`
  );
  assertV4(
    Object.values(sideSelection.audit).every((value) => value === true),
    `${side}: selection audit assertions must be true`
  );
  const candidates = candidateMetadata(candidateTransport).filter(
    (candidate) => candidate.side === side
  );
  exactKeys(
    sideSelection.candidateSelections,
    candidates.map((candidate) => candidate.qualifiedCandidateId),
    `${side} candidate keys`
  );
  const sections = new Set(plan.sections.map((section) => section.sectionId));
  const coverage = new Map([...sections].map((sectionId) => [sectionId, 0]));
  const moveIds = new Set();
  let selectedCandidates = 0;
  for (const [candidateId, selection] of Object.entries(
    sideSelection.candidateSelections
  )) {
    if (selection === null) continue;
    exactKeys(
      selection,
      ["sectionId", "priorityTier", "moveId", "moveKind", "proposition"],
      candidateId
    );
    assertV4(
      sections.has(selection.sectionId) &&
        PRIORITY_ORDER.has(selection.priorityTier) &&
        ["constructive", "reply"].includes(selection.moveKind) &&
        !moveIds.has(selection.moveId),
      `${candidateId}: invalid section, priority, kind, or duplicate move ID`
    );
    boundedString(
      selection.moveId,
      1,
      DECOMPOSED_INVENTORY_LIMITS.identifier,
      `${candidateId}.moveId`
    );
    boundedString(
      selection.proposition,
      25,
      DECOMPOSED_INVENTORY_LIMITS.proposition,
      `${candidateId}.proposition`
    );
    moveIds.add(selection.moveId);
    coverage.set(selection.sectionId, coverage.get(selection.sectionId) + 1);
    selectedCandidates += 1;
  }
  for (const [sectionId, count] of coverage) {
    assertV4(
      count >= 1,
      `${side}/${sectionId}: at least one candidate must be nominated`
    );
  }
  assertV4(
    selectedCandidates >= plan.sections.length &&
      selectedCandidates <= candidates.length,
    `${side}: selected candidate count is invalid`
  );
  return { status: "passed", selectedCandidates };
}

function makePlanFromProposal({ proposal, candidateTransport, candidateCensus }) {
  return {
    schemaVersion: CANDIDATE_SHARDED_INVENTORY.planSchemaVersion,
    protocolId: CANDIDATE_SHARDED_INVENTORY.planProtocolId,
    debateNumber: proposal.debateNumber,
    debateId: proposal.debateId,
    reviewerRole: CANDIDATE_SHARDED_INVENTORY.planReviewerRole,
    assessmentModel: CANDIDATE_SHARDED_INVENTORY.model,
    calibrationOnly: true,
    candidateCensusCanonicalSha256:
      candidateCensusCanonicalSha256(candidateCensus),
    fullCandidateTransportCanonicalSha256:
      fullCandidateTransportCanonicalSha256(candidateTransport),
    isolation: clone(PLAN_ISOLATION),
    routes: clone(proposal.routes),
    sections: clone(proposal.sections),
    audit: Object.fromEntries(PLAN_AUDIT_KEYS.map((key) => [key, true])),
  };
}

function sideSelectionFromProposal({
  proposal,
  plan,
  candidateTransport,
  sideCandidateTransport,
  side,
}) {
  const candidates = candidateMetadata(candidateTransport).filter(
    (candidate) => candidate.side === side
  );
  const metadataById = new Map(
    candidates.map((candidate) => [candidate.qualifiedCandidateId, candidate])
  );
  const selectedBySection = new Map(
    plan.sections.map((section) => [section.sectionId, []])
  );
  for (const [candidateId, selection] of Object.entries(
    proposal.candidateSelectionsBySide[side]
  )) {
    if (selection !== null) {
      selectedBySection.get(selection.sectionId).push(candidateId);
    }
  }
  const tierByCandidate = new Map();
  for (const candidateIds of selectedBySection.values()) {
    candidateIds.sort((left, right) => {
      const leftCandidate = metadataById.get(left);
      const rightCandidate = metadataById.get(right);
      return (
        leftCandidate.startEvent - rightCandidate.startEvent ||
        leftCandidate.endEvent - rightCandidate.endEvent ||
        left.localeCompare(right)
      );
    });
    candidateIds.forEach((candidateId, index) => {
      tierByCandidate.set(
        candidateId,
        CANDIDATE_SHARDED_INVENTORY.priorityTiers[Math.min(index, 2)]
      );
    });
  }
  const candidateSelections = Object.fromEntries(
    candidates.map((candidate) => {
      const selection =
        proposal.candidateSelectionsBySide[side][candidate.qualifiedCandidateId];
      return [
        candidate.qualifiedCandidateId,
        selection === null
          ? null
          : {
              sectionId: selection.sectionId,
              priorityTier: tierByCandidate.get(candidate.qualifiedCandidateId),
              moveId: selection.moveId,
              moveKind: selection.moveKind,
              proposition: selection.proposition,
            },
      ];
    })
  );
  return {
    schemaVersion: CANDIDATE_SHARDED_INVENTORY.sideSelectionSchemaVersion,
    protocolId: CANDIDATE_SHARDED_INVENTORY.sideSelectionProtocolId,
    debateNumber: plan.debateNumber,
    debateId: plan.debateId,
    reviewerRole: CANDIDATE_SHARDED_INVENTORY.sideReviewerRole(side),
    assessmentModel: CANDIDATE_SHARDED_INVENTORY.model,
    calibrationOnly: true,
    side,
    fullCandidateTransportCanonicalSha256:
      fullCandidateTransportCanonicalSha256(candidateTransport),
    sideCandidateTransportCanonicalSha256:
      sideCandidateTransportCanonicalSha256(sideCandidateTransport),
    inventoryPlanSha256: candidateShardedInventoryPlanSha256(plan),
    isolation: clone(SIDE_SELECTION_ISOLATION),
    candidateSelections,
    audit: Object.fromEntries(
      SIDE_SELECTION_AUDIT_KEYS.map((key) => [key, true])
    ),
  };
}

export function splitSidePartitionedProposalToCandidateSharded({
  proposal,
  candidateTransport,
  legacySchema,
}) {
  candidateMetadata(candidateTransport);
  const candidateCensus = buildCandidateCensus(candidateTransport);
  const plan = makePlanFromProposal({
    proposal,
    candidateTransport,
    candidateCensus,
  });
  const sideCandidateTransports = Object.fromEntries(
    ["pro", "con"].map((side) => [
      side,
      buildSideCandidateEvidenceTransport(candidateTransport, side),
    ])
  );
  const sideSelections = Object.fromEntries(
    ["pro", "con"].map((side) => [
      side,
      sideSelectionFromProposal({
        proposal,
        plan,
        candidateTransport,
        sideCandidateTransport: sideCandidateTransports[side],
        side,
      }),
    ])
  );
  validateCandidateShardedInventoryPlan({
    plan,
    legacySchema,
    candidateTransport,
    candidateCensus,
  });
  for (const side of ["pro", "con"]) {
    validateCandidateShardedSideSelection({
      sideSelection: sideSelections[side],
      side,
      plan,
      legacySchema,
      candidateTransport,
      sideCandidateTransport: sideCandidateTransports[side],
      candidateCensus,
    });
  }
  return { candidateCensus, plan, sideCandidateTransports, sideSelections };
}

function reduceSideSelection({ sideSelection, side, plan, candidateTransport }) {
  const metadataById = new Map(
    candidateMetadata(candidateTransport).map((candidate) => [
      candidate.qualifiedCandidateId,
      candidate,
    ])
  );
  const grouped = new Map(
    plan.sections.map((section) => [section.sectionId, []])
  );
  for (const [candidateId, selection] of Object.entries(
    sideSelection.candidateSelections
  )) {
    if (selection !== null) grouped.get(selection.sectionId).push({ candidateId, selection });
  }
  const chosen = new Set();
  const reductions = [];
  for (const [sectionId, candidates] of grouped) {
    candidates.sort((left, right) => {
      const leftMetadata = metadataById.get(left.candidateId);
      const rightMetadata = metadataById.get(right.candidateId);
      return (
        PRIORITY_ORDER.get(left.selection.priorityTier) -
          PRIORITY_ORDER.get(right.selection.priorityTier) ||
        leftMetadata.startEvent - rightMetadata.startEvent ||
        leftMetadata.endEvent - rightMetadata.endEvent ||
        left.candidateId.localeCompare(right.candidateId)
      );
    });
    const selected = candidates.slice(0, 2);
    assertV4(selected.length >= 1, `${side}/${sectionId}: no selected candidate`);
    selected.forEach(({ candidateId }) => chosen.add(candidateId));
    reductions.push({
      sectionId,
      nominated: candidates.length,
      retained: selected.length,
      deterministicallyDeferred: Math.max(0, candidates.length - 2),
      retainedCandidateIds: selected.map(({ candidateId }) => candidateId),
      deferredCandidateIds: candidates.slice(2).map(({ candidateId }) => candidateId),
    });
  }
  const reducedMap = Object.fromEntries(
    Object.entries(sideSelection.candidateSelections).map(
      ([candidateId, selection]) => [
        candidateId,
        chosen.has(candidateId)
          ? {
              sectionId: selection.sectionId,
              moveId: selection.moveId,
              moveKind: selection.moveKind,
              proposition: selection.proposition,
            }
          : null,
      ]
    )
  );
  return { reducedMap, reductions };
}

export function composeCandidateShardedInventoryProposal({
  plan,
  sideSelections,
  legacySchema,
  candidateTransport,
  candidateCensus,
  sideCandidateTransports,
}) {
  validateCandidateShardedInventoryPlan({
    plan,
    legacySchema,
    candidateTransport,
    candidateCensus,
  });
  exactKeys(sideSelections, ["pro", "con"], "candidate-sharded side selections");
  exactKeys(
    sideCandidateTransports,
    ["pro", "con"],
    "candidate-sharded side transports"
  );
  const candidateSelectionsBySide = {};
  const reductionsBySide = {};
  for (const side of ["pro", "con"]) {
    validateCandidateShardedSideSelection({
      sideSelection: sideSelections[side],
      side,
      plan,
      legacySchema,
      candidateTransport,
      sideCandidateTransport: sideCandidateTransports[side],
      candidateCensus,
    });
    const reduced = reduceSideSelection({
      sideSelection: sideSelections[side],
      side,
      plan,
      candidateTransport,
    });
    candidateSelectionsBySide[side] = reduced.reducedMap;
    reductionsBySide[side] = reduced.reductions;
  }
  const moveIds = Object.values(candidateSelectionsBySide)
    .flatMap((sideMap) => Object.values(sideMap))
    .filter(Boolean)
    .map((selection) => selection.moveId);
  assertV4(
    new Set(moveIds).size === moveIds.length,
    "candidate-sharded selections contain a cross-side duplicate move ID"
  );
  const proposal = {
    schemaVersion: SIDE_PARTITIONED_SELECTION_MAP.schemaVersion,
    protocolId: SIDE_PARTITIONED_SELECTION_MAP.protocolId,
    debateNumber: plan.debateNumber,
    debateId: plan.debateId,
    reviewerRole: legacySchema.properties.reviewerRole.const,
    assessmentModel: CANDIDATE_SHARDED_INVENTORY.model,
    calibrationOnly: true,
    isolation: legacyIsolation(legacySchema),
    routes: clone(plan.routes),
    sections: clone(plan.sections),
    candidateSelectionsBySide,
    audit: {
      completeCandidateEvidenceBundleReviewed: true,
      everySelectedCandidateUsedOnce: true,
      ratingsUnavailable: true,
      responseTopologyUnavailable: true,
      otherJudgmentsUnavailable: true,
      calculatedTotalsUnavailable: true,
      winnerLabelsUnavailable: true,
    },
  };
  projectSidePartitionedSelectionMapToLegacyProposal({
    proposal,
    candidateTransport,
    legacySchema,
  });
  return {
    proposal,
    reduction: {
      rule: "priority-tier-then-chronology-retain-first-two-per-section-side",
      reductionsBySide,
      nominatedCandidates: Object.values(sideSelections).reduce(
        (sum, selection) =>
          sum +
          Object.values(selection.candidateSelections).filter(Boolean).length,
        0
      ),
      retainedCandidates: moveIds.length,
      deterministicallyDeferredCandidates:
        Object.values(reductionsBySide)
          .flat()
          .reduce((sum, row) => sum + row.deterministicallyDeferred, 0),
    },
  };
}

export function compileCandidateShardedInventory({
  plan,
  sideSelections,
  legacySchema,
  candidateTransport,
  candidateCensus,
  sideCandidateTransports,
  evidenceBundle,
  eventsDocument,
}) {
  const composed = composeCandidateShardedInventoryProposal({
    plan,
    sideSelections,
    legacySchema,
    candidateTransport,
    candidateCensus,
    sideCandidateTransports,
  });
  return {
    ...composed,
    ...compileSidePartitionedSelectionMapInventory({
      proposal: composed.proposal,
      candidateTransport,
      legacySchema,
      evidenceBundle,
      eventsDocument,
    }),
  };
}

export function candidateShardedPlanFromDecomposed({
  decomposedPlan,
  candidateTransport,
}) {
  const candidateCensus = buildCandidateCensus(candidateTransport);
  return makePlanFromProposal({
    proposal: {
      debateNumber: decomposedPlan.debateNumber,
      debateId: decomposedPlan.debateId,
      routes: decomposedPlan.routes,
      sections: decomposedPlan.sections,
    },
    candidateTransport,
    candidateCensus,
  });
}

export function candidateShardedFromSidePartitioned({
  proposal,
  candidateTransport,
  legacySchema,
}) {
  const split = splitSidePartitionedInventoryProposal({
    proposal,
    candidateTransport,
  });
  assertV4(
    split.plan.routes.length === proposal.routes.length &&
      split.selection.candidateSelectionsBySide,
    "side-partitioned proposal cannot enter candidate-sharded protocol"
  );
  return splitSidePartitionedProposalToCandidateSharded({
    proposal,
    candidateTransport,
    legacySchema,
  });
}
