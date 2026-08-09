import { isDeepStrictEqual } from "node:util";

import { assertV4 } from "./v4-lean-production.mjs";
import { compileV422116LockedInventory } from "./v422116-decomposed-consensus.mjs";

export const UNIQUE_SELECTION_MAP = Object.freeze({
  schemaVersion: "4.2.21.16.1-score-blind-unique-selection-map-proposal",
  protocolId: "v4.2.21.16.1-unique-selection-map-contract",
});

const clone = (value) => structuredClone(value);

function transportCandidates(candidateTransport) {
  const idIndex = candidateTransport.columnOrder.indexOf("qualifiedCandidateId");
  const sideIndex = candidateTransport.columnOrder.indexOf("side");
  assertV4(idIndex >= 0 && sideIndex >= 0, "candidate identity or side column missing");
  const candidates = candidateTransport.candidateRows.map((row) => ({
    qualifiedCandidateId: row[idIndex],
    side: row[sideIndex],
  }));
  assertV4(
    candidates.length === candidateTransport.candidateCount &&
      new Set(candidates.map((candidate) => candidate.qualifiedCandidateId)).size ===
        candidates.length &&
      candidates.every((candidate) => ["pro", "con"].includes(candidate.side)),
    "candidate transport identity set drifted"
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
    legacySchema.properties.sectionSelections.items.properties.proSelections.items
  );
  schema.required = [
    "sectionId",
    "orderWithinSide",
    "moveId",
    "moveKind",
    "proposition",
  ];
  delete schema.properties.qualifiedCandidateId;
  schema.properties = {
    sectionId: { type: "string", minLength: 1 },
    orderWithinSide: { type: "integer", minimum: 1, maximum: 2 },
    ...schema.properties,
  };
  return schema;
}

export function buildUniqueSelectionMapSchema({
  legacySchema,
  candidateTransport,
}) {
  const candidates = transportCandidates(candidateTransport);
  const schema = clone(legacySchema);
  schema.$id = "slugfester-v4221161-score-blind-unique-selection-map";
  schema.title =
    "Slugfester v4.2.21.16.1 score-blind unique selection map lock";
  schema.required = schema.required.map((field) =>
    field === "sectionSelections" ? "sections" : field
  );
  schema.required.splice(schema.required.indexOf("sections") + 1, 0, "candidateSelections");
  schema.properties.schemaVersion.const = UNIQUE_SELECTION_MAP.schemaVersion;
  schema.properties.protocolId.const = UNIQUE_SELECTION_MAP.protocolId;
  delete schema.properties.sectionSelections;
  schema.properties.sections = {
    type: "array",
    minItems: 4,
    maxItems: 6,
    items: sectionMetadataSchema(legacySchema),
  };
  const candidateProperties = Object.fromEntries(
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
  schema.properties.candidateSelections = {
    type: "object",
    additionalProperties: false,
    required: candidates.map((candidate) => candidate.qualifiedCandidateId),
    properties: candidateProperties,
  };
  schema.$defs = {
    candidateSelection: candidateSelectionSchema(legacySchema),
  };
  return schema;
}

function legacySelections(legacyProposal) {
  return legacyProposal.sectionSelections.flatMap((section, sectionIndex) =>
    ["proSelections", "conSelections"].flatMap((selectionKey) =>
      section[selectionKey].map((selection, selectionIndex) => ({
        sectionIndex,
        sectionId: section.sectionId,
        selectionKey,
        selectionIndex,
        ...clone(selection),
      }))
    )
  );
}

export function convertLegacyProposalToUniqueSelectionMap({
  legacyProposal,
  candidateTransport,
}) {
  const candidates = transportCandidates(candidateTransport);
  const candidateIds = candidates.map((candidate) => candidate.qualifiedCandidateId);
  const candidateIdSet = new Set(candidateIds);
  const selections = legacySelections(legacyProposal);
  const counts = new Map();
  for (const selection of selections) {
    assertV4(
      candidateIdSet.has(selection.qualifiedCandidateId),
      `unknown selected candidate: ${selection.qualifiedCandidateId}`
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
    `legacy proposal cannot enter unique selection map: duplicate candidate IDs: ${duplicates.join(", ")}`
  );
  const candidateSelections = Object.fromEntries(
    candidateIds.map((candidateId) => [candidateId, null])
  );
  for (const selection of selections) {
    candidateSelections[selection.qualifiedCandidateId] = {
      sectionId: selection.sectionId,
      orderWithinSide: selection.selectionIndex + 1,
      moveId: selection.moveId,
      moveKind: selection.moveKind,
      proposition: selection.proposition,
    };
  }
  return {
    schemaVersion: UNIQUE_SELECTION_MAP.schemaVersion,
    protocolId: UNIQUE_SELECTION_MAP.protocolId,
    debateNumber: legacyProposal.debateNumber,
    debateId: legacyProposal.debateId,
    reviewerRole: legacyProposal.reviewerRole,
    assessmentModel: legacyProposal.assessmentModel,
    calibrationOnly: legacyProposal.calibrationOnly,
    isolation: clone(legacyProposal.isolation),
    routes: clone(legacyProposal.routes),
    sections: legacyProposal.sectionSelections.map((section) => ({
      sectionId: section.sectionId,
      title: section.title,
      weightPercent: section.weightPercent,
      rationale: section.rationale,
    })),
    candidateSelections,
    audit: clone(legacyProposal.audit),
  };
}

export function projectUniqueSelectionMapToLegacyProposal({
  proposal,
  candidateTransport,
  legacySchema,
}) {
  assertV4(
    proposal.schemaVersion === UNIQUE_SELECTION_MAP.schemaVersion &&
      proposal.protocolId === UNIQUE_SELECTION_MAP.protocolId,
    "unique selection map identity drifted"
  );
  const candidates = transportCandidates(candidateTransport);
  const expectedIds = candidates.map((candidate) => candidate.qualifiedCandidateId);
  const actualIds = Object.keys(proposal.candidateSelections);
  assertV4(
    expectedIds.length === actualIds.length &&
      expectedIds.every((candidateId) => actualIds.includes(candidateId)),
    "candidate selection map must contain every candidate key exactly once"
  );
  assertV4(
    proposal.sections.length >= 4 && proposal.sections.length <= 6,
    "unique selection map requires four to six sections"
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
  const sideByCandidate = new Map(
    candidates.map((candidate) => [candidate.qualifiedCandidateId, candidate.side])
  );
  const grouped = new Map(
    sectionIds.map((sectionId) => [
      sectionId,
      { proSelections: [], conSelections: [] },
    ])
  );
  let selected = 0;
  for (const candidateId of expectedIds) {
    const selection = proposal.candidateSelections[candidateId];
    if (selection === null) continue;
    assertV4(
      selection &&
        typeof selection === "object" &&
        grouped.has(selection.sectionId) &&
        [1, 2].includes(selection.orderWithinSide),
      `${candidateId}: invalid selected-candidate placement`
    );
    const side = sideByCandidate.get(candidateId);
    const selectionKey = `${side}Selections`;
    grouped.get(selection.sectionId)[selectionKey].push({
      orderWithinSide: selection.orderWithinSide,
      qualifiedCandidateId: candidateId,
      moveId: selection.moveId,
      moveKind: selection.moveKind,
      proposition: selection.proposition,
    });
    selected += 1;
  }
  assertV4(selected >= 8 && selected <= 24, "selected move count must be 8–24");
  const sectionSelections = proposal.sections.map((section) => {
    const selections = grouped.get(section.sectionId);
    for (const selectionKey of ["proSelections", "conSelections"]) {
      assertV4(
        selections[selectionKey].length >= 1 &&
          selections[selectionKey].length <= 2 &&
          new Set(
            selections[selectionKey].map((selection) => selection.orderWithinSide)
          ).size === selections[selectionKey].length,
        `${section.sectionId}/${selectionKey}: requires unique positions for one or two selections`
      );
      selections[selectionKey].sort(
        (left, right) => left.orderWithinSide - right.orderWithinSide
      );
    }
    return {
      ...clone(section),
      proSelections: selections.proSelections.map(
        ({ orderWithinSide: _orderWithinSide, ...selection }) => selection
      ),
      conSelections: selections.conSelections.map(
        ({ orderWithinSide: _orderWithinSide, ...selection }) => selection
      ),
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

export function compileUniqueSelectionMapInventory({
  proposal,
  candidateTransport,
  legacySchema,
  evidenceBundle,
  eventsDocument,
}) {
  const projectedProposal = projectUniqueSelectionMapToLegacyProposal({
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

export function auditEndpointCompatibleStrictSchema(schema) {
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
      value.forEach((item, index) => visit(item, `${pointer}/${index}`, depth + 1));
    } else {
      for (const [key, item] of Object.entries(value)) {
        visit(item, `${pointer}/${key}`, depth + 1);
      }
    }
  }
  visit(schema);
  assertV4(
    nullableCandidateProperties > 0,
    "schema has no structurally unique candidate properties"
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
