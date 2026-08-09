import { isDeepStrictEqual } from "node:util";

import { assertV4 } from "./v4-lean-production.mjs";
import { compileV422116LockedInventory } from "./v422116-decomposed-consensus.mjs";

export const SIDE_PARTITIONED_SELECTION_MAP = Object.freeze({
  schemaVersion:
    "4.2.21.16.2-score-blind-side-partitioned-selection-map-proposal",
  protocolId: "v4.2.21.16.2-side-partitioned-selection-map-contract",
});

const clone = (value) => structuredClone(value);

function transportCandidates(candidateTransport) {
  const indexes = Object.fromEntries(
    [
      "qualifiedCandidateId",
      "side",
      "sourceSpan.startEvent",
      "sourceSpan.endEvent",
    ].map((column) => [column, candidateTransport.columnOrder.indexOf(column)])
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
      new Set(
        candidates.map((candidate) => candidate.qualifiedCandidateId)
      ).size === candidates.length &&
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

function sectionMetadataSchema(legacySchema) {
  const schema = clone(legacySchema.properties.sectionSelections.items);
  schema.required = schema.required.filter(
    (field) => !["proSelections", "conSelections"].includes(field)
  );
  delete schema.properties.proSelections;
  delete schema.properties.conSelections;
  return schema;
}

function candidateSelectionSchema(legacySchema) {
  const schema = clone(
    legacySchema.properties.sectionSelections.items.properties.proSelections
      .items
  );
  schema.required = ["sectionId", "moveId", "moveKind", "proposition"];
  delete schema.properties.qualifiedCandidateId;
  schema.properties = {
    sectionId: { type: "string", minLength: 1 },
    ...schema.properties,
  };
  return schema;
}

function sideCandidateMapSchema(candidates) {
  const properties = Object.fromEntries(
    candidates.map((candidate) => [
      candidate.qualifiedCandidateId,
      {
        anyOf: [
          { $ref: "#/$defs/candidateSelection" },
          { type: "null" },
        ],
      },
    ])
  );
  return {
    type: "object",
    additionalProperties: false,
    required: candidates.map((candidate) => candidate.qualifiedCandidateId),
    properties,
  };
}

export function buildSidePartitionedSelectionMapSchema({
  legacySchema,
  candidateTransport,
}) {
  const candidates = transportCandidates(candidateTransport);
  const schema = clone(legacySchema);
  schema.$id =
    "slugfester-v4221162-score-blind-side-partitioned-selection-map";
  schema.title =
    "Slugfester v4.2.21.16.2 score-blind side-partitioned selection map lock";
  schema.required = schema.required.map((field) =>
    field === "sectionSelections" ? "sections" : field
  );
  schema.required.splice(
    schema.required.indexOf("sections") + 1,
    0,
    "candidateSelectionsBySide"
  );
  schema.properties.schemaVersion.const =
    SIDE_PARTITIONED_SELECTION_MAP.schemaVersion;
  schema.properties.protocolId.const =
    SIDE_PARTITIONED_SELECTION_MAP.protocolId;
  delete schema.properties.sectionSelections;
  schema.properties.sections = {
    type: "array",
    minItems: 4,
    maxItems: 6,
    items: sectionMetadataSchema(legacySchema),
  };
  schema.properties.candidateSelectionsBySide = {
    type: "object",
    additionalProperties: false,
    required: ["pro", "con"],
    properties: {
      pro: sideCandidateMapSchema(
        candidates.filter((candidate) => candidate.side === "pro")
      ),
      con: sideCandidateMapSchema(
        candidates.filter((candidate) => candidate.side === "con")
      ),
    },
  };
  schema.$defs = {
    candidateSelection: candidateSelectionSchema(legacySchema),
  };
  return schema;
}

function legacySelections(legacyProposal) {
  return legacyProposal.sectionSelections.flatMap((section) =>
    ["proSelections", "conSelections"].flatMap((selectionKey) =>
      section[selectionKey].map((selection) => ({
        sectionId: section.sectionId,
        side: selectionKey === "proSelections" ? "pro" : "con",
        ...clone(selection),
      }))
    )
  );
}

function emptySideMaps(candidates) {
  return Object.fromEntries(
    ["pro", "con"].map((side) => [
      side,
      Object.fromEntries(
        candidates
          .filter((candidate) => candidate.side === side)
          .map((candidate) => [candidate.qualifiedCandidateId, null])
      ),
    ])
  );
}

function baseProposal(sourceProposal, candidateSelectionsBySide) {
  return {
    schemaVersion: SIDE_PARTITIONED_SELECTION_MAP.schemaVersion,
    protocolId: SIDE_PARTITIONED_SELECTION_MAP.protocolId,
    debateNumber: sourceProposal.debateNumber,
    debateId: sourceProposal.debateId,
    reviewerRole: sourceProposal.reviewerRole,
    assessmentModel: sourceProposal.assessmentModel,
    calibrationOnly: sourceProposal.calibrationOnly,
    isolation: clone(sourceProposal.isolation),
    routes: clone(sourceProposal.routes),
    sections: (sourceProposal.sections ?? sourceProposal.sectionSelections).map(
      (section) => ({
        sectionId: section.sectionId,
        title: section.title,
        weightPercent: section.weightPercent,
        rationale: section.rationale,
      })
    ),
    candidateSelectionsBySide,
    audit: clone(sourceProposal.audit),
  };
}

export function convertLegacyProposalToSidePartitionedSelectionMap({
  legacyProposal,
  candidateTransport,
}) {
  const candidates = transportCandidates(candidateTransport);
  const candidateById = new Map(
    candidates.map((candidate) => [candidate.qualifiedCandidateId, candidate])
  );
  const selections = legacySelections(legacyProposal);
  const counts = new Map();
  for (const selection of selections) {
    const candidate = candidateById.get(selection.qualifiedCandidateId);
    assertV4(
      candidate && candidate.side === selection.side,
      `unknown or wrong-side selected candidate: ${selection.qualifiedCandidateId}`
    );
    counts.set(
      selection.qualifiedCandidateId,
      (counts.get(selection.qualifiedCandidateId) ?? 0) + 1
    );
  }
  const duplicates = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([candidateId]) => candidateId);
  assertV4(
    duplicates.length === 0,
    `legacy proposal cannot enter side-partitioned selection map: duplicate candidate IDs: ${duplicates.join(", ")}`
  );
  const candidateSelectionsBySide = emptySideMaps(candidates);
  for (const selection of selections) {
    candidateSelectionsBySide[selection.side][selection.qualifiedCandidateId] = {
      sectionId: selection.sectionId,
      moveId: selection.moveId,
      moveKind: selection.moveKind,
      proposition: selection.proposition,
    };
  }
  return baseProposal(legacyProposal, candidateSelectionsBySide);
}

export function convertUniqueSelectionMapToSidePartitionedSelectionMap({
  uniqueProposal,
  candidateTransport,
}) {
  const candidates = transportCandidates(candidateTransport);
  const candidateIds = candidates.map(
    (candidate) => candidate.qualifiedCandidateId
  );
  assertV4(
    Object.keys(uniqueProposal.candidateSelections).length ===
        candidateIds.length &&
      candidateIds.every((candidateId) =>
        Object.hasOwn(uniqueProposal.candidateSelections, candidateId)
      ),
    "unique proposal candidate key set drifted"
  );
  const candidateSelectionsBySide = emptySideMaps(candidates);
  for (const candidate of candidates) {
    const selection =
      uniqueProposal.candidateSelections[candidate.qualifiedCandidateId];
    if (selection === null) continue;
    const {
      orderWithinSide: _repositoryDerivedOrder,
      ...orderFreeSelection
    } = selection;
    candidateSelectionsBySide[candidate.side][candidate.qualifiedCandidateId] =
      clone(orderFreeSelection);
  }
  return baseProposal(uniqueProposal, candidateSelectionsBySide);
}

function assertExactCandidateKeys(actual, expected, label) {
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = [...expected].sort();
  assertV4(
    isDeepStrictEqual(actualKeys, expectedKeys),
    `${label}: candidate key set drifted`
  );
}

export function projectSidePartitionedSelectionMapToLegacyProposal({
  proposal,
  candidateTransport,
  legacySchema,
}) {
  assertV4(
    proposal.schemaVersion === SIDE_PARTITIONED_SELECTION_MAP.schemaVersion &&
      proposal.protocolId === SIDE_PARTITIONED_SELECTION_MAP.protocolId,
    "side-partitioned selection map identity drifted"
  );
  const candidates = transportCandidates(candidateTransport);
  const candidateById = new Map(
    candidates.map((candidate) => [candidate.qualifiedCandidateId, candidate])
  );
  assertV4(
    proposal.candidateSelectionsBySide &&
      Object.keys(proposal.candidateSelectionsBySide).sort().join("|") ===
        "con|pro",
    "candidate selections must be partitioned into pro and con"
  );
  for (const side of ["pro", "con"]) {
    assertExactCandidateKeys(
      proposal.candidateSelectionsBySide[side],
      candidates
        .filter((candidate) => candidate.side === side)
        .map((candidate) => candidate.qualifiedCandidateId),
      side
    );
  }
  assertV4(
    proposal.sections.length >= 4 && proposal.sections.length <= 6,
    "side-partitioned selection map requires four to six sections"
  );
  const sectionIds = proposal.sections.map((section) => section.sectionId);
  assertV4(
    new Set(sectionIds).size === sectionIds.length &&
      proposal.sections.reduce(
        (sum, section) => sum + section.weightPercent,
        0
      ) === 100,
    "section IDs must be unique and weights must total 100"
  );
  const grouped = new Map(
    sectionIds.map((sectionId) => [
      sectionId,
      { proSelections: [], conSelections: [] },
    ])
  );
  let selected = 0;
  for (const side of ["pro", "con"]) {
    for (const [candidateId, selection] of Object.entries(
      proposal.candidateSelectionsBySide[side]
    )) {
      if (selection === null) continue;
      const candidate = candidateById.get(candidateId);
      assertV4(
        candidate?.side === side &&
          selection &&
          typeof selection === "object" &&
          grouped.has(selection.sectionId) &&
          !Object.hasOwn(selection, "orderWithinSide"),
        `${candidateId}: invalid side-partitioned selected-candidate placement`
      );
      grouped.get(selection.sectionId)[`${side}Selections`].push({
        qualifiedCandidateId: candidateId,
        moveId: selection.moveId,
        moveKind: selection.moveKind,
        proposition: selection.proposition,
      });
      selected += 1;
    }
  }
  assertV4(selected >= 8 && selected <= 24, "selected move count must be 8–24");
  const chronological = (left, right) => {
    const leftCandidate = candidateById.get(left.qualifiedCandidateId);
    const rightCandidate = candidateById.get(right.qualifiedCandidateId);
    return (
      leftCandidate.startEvent - rightCandidate.startEvent ||
      leftCandidate.endEvent - rightCandidate.endEvent ||
      left.moveId.localeCompare(right.moveId)
    );
  };
  const sectionSelections = proposal.sections.map((section) => {
    const selections = grouped.get(section.sectionId);
    for (const selectionKey of ["proSelections", "conSelections"]) {
      assertV4(
        selections[selectionKey].length >= 1 &&
          selections[selectionKey].length <= 2,
        `${section.sectionId}/${selectionKey}: requires one or two repository-side selections`
      );
      selections[selectionKey].sort(chronological);
    }
    return {
      ...clone(section),
      proSelections: selections.proSelections,
      conSelections: selections.conSelections,
    };
  });
  return {
    schemaVersion: legacySchema.properties.schemaVersion.const,
    protocolId: legacySchema.properties.protocolId.const,
    debateNumber: proposal.debateNumber,
    debateId: proposal.debateId,
    reviewerRole: proposal.reviewerRole,
    assessmentModel: proposal.assessmentModel,
    calibrationOnly: proposal.calibrationOnly,
    isolation: clone(proposal.isolation),
    routes: clone(proposal.routes),
    sectionSelections,
    audit: clone(proposal.audit),
  };
}

export function compileSidePartitionedSelectionMapInventory({
  proposal,
  candidateTransport,
  legacySchema,
  evidenceBundle,
  eventsDocument,
}) {
  const projectedProposal = projectSidePartitionedSelectionMapToLegacyProposal({
    proposal,
    candidateTransport,
    legacySchema,
  });
  const compiled = compileV422116LockedInventory(
    projectedProposal,
    evidenceBundle,
    eventsDocument
  );
  return { projectedProposal, ...compiled };
}

export function auditSidePartitionedStrictSchema(schema) {
  const forbiddenKeywords = new Set([
    "uniqueItems",
    "contains",
    "minContains",
    "maxContains",
    "propertyNames",
    "patternProperties",
    "minProperties",
    "maxProperties",
  ]);
  let objectsAudited = 0;
  let nullableCandidateProperties = 0;
  let totalObjectProperties = 0;
  let totalSchemaStringCharacters = 0;
  let maximumSchemaTreeDepth = 0;
  function visit(value, pointer = "", depth = 0) {
    if (!value || typeof value !== "object") return;
    maximumSchemaTreeDepth = Math.max(maximumSchemaTreeDepth, depth);
    for (const key of Object.keys(value)) {
      assertV4(
        !forbiddenKeywords.has(key),
        `${pointer || "/"}: endpoint-incompatible keyword ${key}`
      );
    }
    if (value.type === "object" && value.properties) {
      objectsAudited += 1;
      totalObjectProperties += Object.keys(value.properties).length;
      totalSchemaStringCharacters += Object.keys(value.properties).reduce(
        (sum, key) => sum + key.length,
        0
      );
      assertV4(
        value.additionalProperties === false &&
          Array.isArray(value.required) &&
          isDeepStrictEqual(
            [...value.required].sort(),
            Object.keys(value.properties).sort()
          ),
        `${pointer || "/"}: strict object properties must all be required`
      );
    }
    if (value.$defs) {
      totalSchemaStringCharacters += Object.keys(value.$defs).reduce(
        (sum, key) => sum + key.length,
        0
      );
    }
    if (Array.isArray(value.enum)) {
      totalSchemaStringCharacters += value.enum.reduce(
        (sum, item) => sum + (typeof item === "string" ? item.length : 0),
        0
      );
    }
    if (typeof value.const === "string") {
      totalSchemaStringCharacters += value.const.length;
    }
    if (
      Array.isArray(value.anyOf) &&
      value.anyOf.length === 2 &&
      value.anyOf.some((option) => option?.type === "null") &&
      value.anyOf.some(
        (option) => option?.$ref === "#/$defs/candidateSelection"
      )
    ) {
      nullableCandidateProperties += 1;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) =>
        visit(item, `${pointer}/${index}`, depth + 1)
      );
    } else {
      for (const [key, item] of Object.entries(value)) {
        visit(item, `${pointer}/${key}`, depth + 1);
      }
    }
  }
  visit(schema);
  assertV4(
    nullableCandidateProperties > 0,
    "schema has no side-partitioned nullable candidate properties"
  );
  assertV4(
    totalObjectProperties <= 5000 &&
      maximumSchemaTreeDepth <= 10 &&
      totalSchemaStringCharacters <= 120000,
    "schema exceeds current Structured Outputs size limits"
  );
  return {
    objectsAudited,
    nullableCandidateProperties,
    totalObjectProperties,
    maximumSchemaTreeDepth,
    totalSchemaStringCharacters,
  };
}
