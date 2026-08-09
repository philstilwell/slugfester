import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import {
  assertV4,
  canonicalJson,
  containsProhibitedCalculatedField,
} from "./v4-lean-production.mjs";
import {
  buildSidePartitionedSelectionMapSchema,
  compileSidePartitionedSelectionMapInventory,
  SIDE_PARTITIONED_SELECTION_MAP,
} from "./assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs";

export const DECOMPOSED_INVENTORY = Object.freeze({
  planSchemaVersion: "4.2.21.16.3-score-blind-inventory-plan",
  planProtocolId: "v4.2.21.16.3-decomposed-inventory-plan-contract",
  selectionSchemaVersion:
    "4.2.21.16.3-score-blind-inventory-selection-map",
  selectionProtocolId:
    "v4.2.21.16.3-decomposed-inventory-selection-contract",
  planReviewerRole: "score-blind-inventory-planner",
  selectionReviewerRole: "score-blind-inventory-selector",
  model: "5.6 Sol",
});

export const DECOMPOSED_INVENTORY_LIMITS = Object.freeze({
  identifier: 100,
  title: 120,
  routeDescription: 700,
  routeSuccessCriteria: 700,
  bridgeDescription: 400,
  sectionRationale: 500,
  proposition: 500,
});

const PLAN_KEYS = Object.freeze([
  "schemaVersion",
  "protocolId",
  "debateNumber",
  "debateId",
  "reviewerRole",
  "assessmentModel",
  "calibrationOnly",
  "candidateTransportCanonicalSha256",
  "isolation",
  "routes",
  "sections",
  "audit",
]);
const SELECTION_KEYS = Object.freeze([
  "schemaVersion",
  "protocolId",
  "debateNumber",
  "debateId",
  "reviewerRole",
  "assessmentModel",
  "calibrationOnly",
  "candidateTransportCanonicalSha256",
  "inventoryPlanSha256",
  "isolation",
  "candidateSelectionsBySide",
  "audit",
]);
const PLAN_AUDIT_KEYS = Object.freeze([
  "completeCandidateEvidenceBundleReviewed",
  "candidateSelectionDeferred",
  "ratingsUnavailable",
  "responseTopologyUnavailable",
  "otherJudgmentsUnavailable",
  "calculatedTotalsUnavailable",
  "winnerLabelsUnavailable",
]);
const SELECTION_AUDIT_KEYS = Object.freeze([
  "inventoryPlanImmutable",
  "everyCandidateKeyReviewed",
  "everySelectedCandidateUsedOnce",
  "ratingsUnavailable",
  "responseTopologyUnavailable",
  "otherJudgmentsUnavailable",
  "calculatedTotalsUnavailable",
  "winnerLabelsUnavailable",
]);
const SELECTION_ISOLATION = Object.freeze({
  legacyAssessmentsUnavailable: true,
  calculatedTotalsUnavailable: true,
  winnerLabelsUnavailable: true,
  otherJudgmentsUnavailable: true,
  assessmentProseUnavailable: true,
  otherDebatesUnavailable: true,
  inventoryPlanAvailable: true,
  inventoryPlanExecutionMetadataUnavailable: true,
  contaminationDetected: false,
});

const clone = (value) => structuredClone(value);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalSha256 = (value) => sha256(canonicalJson(value));

function exactKeys(value, expected, label) {
  assertV4(
    value && typeof value === "object" && !Array.isArray(value),
    `${label}: expected object`
  );
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  assertV4(
    isDeepStrictEqual(actual, sortedExpected),
    `${label}: keys must be ${sortedExpected.join(", ")}`
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

function constBooleanObject(keys, overrides = {}) {
  return {
    type: "object",
    additionalProperties: false,
    required: [...keys],
    properties: Object.fromEntries(
      keys.map((key) => [
        key,
        { type: "boolean", const: overrides[key] ?? true },
      ])
    ),
  };
}

function addMaximum(schema, maximum) {
  schema.maxLength = maximum;
  return schema;
}

function boundPlanSchema(schema) {
  const routes = schema.properties.routes.items.properties;
  addMaximum(routes.routeId, DECOMPOSED_INVENTORY_LIMITS.identifier);
  addMaximum(
    routes.description,
    DECOMPOSED_INVENTORY_LIMITS.routeDescription
  );
  addMaximum(
    routes.successCriteria,
    DECOMPOSED_INVENTORY_LIMITS.routeSuccessCriteria
  );
  for (const bridgeSchema of [
    routes.motionBridge,
    routes.centralBridges.items,
    routes.subsidiaryBridges.items,
  ]) {
    addMaximum(
      bridgeSchema.properties.bridgeId,
      DECOMPOSED_INVENTORY_LIMITS.identifier
    );
    addMaximum(
      bridgeSchema.properties.description,
      DECOMPOSED_INVENTORY_LIMITS.bridgeDescription
    );
  }
  const sections = schema.properties.sections.items.properties;
  addMaximum(sections.sectionId, DECOMPOSED_INVENTORY_LIMITS.identifier);
  addMaximum(sections.title, DECOMPOSED_INVENTORY_LIMITS.title);
  addMaximum(
    sections.rationale,
    DECOMPOSED_INVENTORY_LIMITS.sectionRationale
  );
}

function bindCommonIdentity(schema, legacySchema, candidateTransport, kind) {
  const isPlan = kind === "plan";
  schema.properties.schemaVersion.const = isPlan
    ? DECOMPOSED_INVENTORY.planSchemaVersion
    : DECOMPOSED_INVENTORY.selectionSchemaVersion;
  schema.properties.protocolId.const = isPlan
    ? DECOMPOSED_INVENTORY.planProtocolId
    : DECOMPOSED_INVENTORY.selectionProtocolId;
  schema.properties.debateNumber = clone(
    legacySchema.properties.debateNumber
  );
  schema.properties.debateId = clone(legacySchema.properties.debateId);
  schema.properties.reviewerRole = {
    type: "string",
    const: isPlan
      ? DECOMPOSED_INVENTORY.planReviewerRole
      : DECOMPOSED_INVENTORY.selectionReviewerRole,
  };
  schema.properties.assessmentModel = {
    type: "string",
    const: DECOMPOSED_INVENTORY.model,
  };
  schema.properties.calibrationOnly = { type: "boolean", const: true };
  schema.properties.candidateTransportCanonicalSha256 = {
    type: "string",
    const: canonicalSha256(candidateTransport),
  };
}

export function candidateTransportCanonicalSha256(candidateTransport) {
  return canonicalSha256(candidateTransport);
}

export function inventoryPlanSha256(plan) {
  return canonicalSha256(plan);
}

export function buildDecomposedInventoryPlanSchema({
  legacySchema,
  candidateTransport,
}) {
  const full = buildSidePartitionedSelectionMapSchema({
    legacySchema,
    candidateTransport,
  });
  delete full.properties.candidateSelectionsBySide;
  delete full.$defs;
  full.$id = "slugfester-v4221163-score-blind-inventory-plan";
  full.title = "Slugfester v4.2.21.16.3 score-blind inventory plan";
  full.required = [...PLAN_KEYS];
  full.properties.candidateTransportCanonicalSha256 = { type: "string" };
  full.properties.audit = constBooleanObject(PLAN_AUDIT_KEYS);
  bindCommonIdentity(full, legacySchema, candidateTransport, "plan");
  boundPlanSchema(full);
  return full;
}

export function buildDecomposedInventorySelectionSchema({
  legacySchema,
  candidateTransport,
  plan,
}) {
  validateDecomposedInventoryPlan({ plan, legacySchema, candidateTransport });
  const full = buildSidePartitionedSelectionMapSchema({
    legacySchema,
    candidateTransport,
  });
  const candidateSelectionsBySide = clone(
    full.properties.candidateSelectionsBySide
  );
  const candidateSelection = clone(full.$defs.candidateSelection);
  candidateSelection.properties.sectionId = {
    type: "string",
    enum: plan.sections.map((section) => section.sectionId),
  };
  addMaximum(
    candidateSelection.properties.moveId,
    DECOMPOSED_INVENTORY_LIMITS.identifier
  );
  addMaximum(
    candidateSelection.properties.proposition,
    DECOMPOSED_INVENTORY_LIMITS.proposition
  );
  full.$id = "slugfester-v4221163-score-blind-inventory-selection";
  full.title = "Slugfester v4.2.21.16.3 score-blind inventory selection";
  full.required = [...SELECTION_KEYS];
  full.properties = {
    schemaVersion: { type: "string" },
    protocolId: { type: "string" },
    debateNumber: { type: "string" },
    debateId: { type: "string" },
    reviewerRole: { type: "string" },
    assessmentModel: { type: "string" },
    calibrationOnly: { type: "boolean" },
    candidateTransportCanonicalSha256: { type: "string" },
    inventoryPlanSha256: {
      type: "string",
      const: inventoryPlanSha256(plan),
    },
    isolation: constBooleanObject(
      Object.keys(SELECTION_ISOLATION),
      SELECTION_ISOLATION
    ),
    candidateSelectionsBySide,
    audit: constBooleanObject(SELECTION_AUDIT_KEYS),
  };
  full.$defs = { candidateSelection };
  bindCommonIdentity(full, legacySchema, candidateTransport, "selection");
  return full;
}

function validateRoutePlan(routes) {
  assertV4(
    Array.isArray(routes) &&
      routes.length === 2 &&
      routes.map((route) => route.side).sort().join("|") === "con|pro",
    "inventory plan requires exactly one route per side"
  );
  const routeIds = new Set();
  const bridgeIds = new Set();
  for (const route of routes) {
    boundedString(
      route.routeId,
      1,
      DECOMPOSED_INVENTORY_LIMITS.identifier,
      "routeId"
    );
    assertV4(!routeIds.has(route.routeId), `${route.routeId}: duplicate route ID`);
    routeIds.add(route.routeId);
    boundedString(
      route.description,
      40,
      DECOMPOSED_INVENTORY_LIMITS.routeDescription,
      `${route.routeId}.description`
    );
    boundedString(
      route.successCriteria,
      40,
      DECOMPOSED_INVENTORY_LIMITS.routeSuccessCriteria,
      `${route.routeId}.successCriteria`
    );
    assertV4(
      route.motionBridge?.tier === "motion" &&
        Array.isArray(route.centralBridges) &&
        route.centralBridges.length >= 1 &&
        route.centralBridges.length <= 4 &&
        Array.isArray(route.subsidiaryBridges) &&
        route.subsidiaryBridges.length >= 1 &&
        route.subsidiaryBridges.length <= 2,
      `${route.routeId}: incomplete burden tiers`
    );
    const bridges = [
      route.motionBridge,
      ...route.centralBridges,
      ...route.subsidiaryBridges,
    ];
    for (const bridge of bridges) {
      boundedString(
        bridge.bridgeId,
        1,
        DECOMPOSED_INVENTORY_LIMITS.identifier,
        "bridgeId"
      );
      boundedString(
        bridge.description,
        25,
        DECOMPOSED_INVENTORY_LIMITS.bridgeDescription,
        `${bridge.bridgeId}.description`
      );
      assertV4(
        !bridgeIds.has(bridge.bridgeId),
        `${bridge.bridgeId}: duplicate bridge ID`
      );
      bridgeIds.add(bridge.bridgeId);
    }
  }
}

function validateSectionPlan(sections) {
  assertV4(
    Array.isArray(sections) && sections.length >= 4 && sections.length <= 6,
    "inventory plan requires four to six sections"
  );
  const sectionIds = new Set();
  let weight = 0;
  for (const section of sections) {
    exactKeys(
      section,
      ["sectionId", "title", "weightPercent", "rationale"],
      "inventory plan section"
    );
    boundedString(
      section.sectionId,
      1,
      DECOMPOSED_INVENTORY_LIMITS.identifier,
      "sectionId"
    );
    boundedString(
      section.title,
      3,
      DECOMPOSED_INVENTORY_LIMITS.title,
      `${section.sectionId}.title`
    );
    boundedString(
      section.rationale,
      40,
      DECOMPOSED_INVENTORY_LIMITS.sectionRationale,
      `${section.sectionId}.rationale`
    );
    assertV4(
      !sectionIds.has(section.sectionId),
      `${section.sectionId}: duplicate section ID`
    );
    sectionIds.add(section.sectionId);
    assertV4(
      Number.isInteger(section.weightPercent) &&
        section.weightPercent >= 1 &&
        section.weightPercent <= 97,
      `${section.sectionId}: invalid section weight`
    );
    weight += section.weightPercent;
  }
  assertV4(weight === 100, "inventory plan section weights must total 100");
}

export function validateDecomposedInventoryPlan({
  plan,
  legacySchema,
  candidateTransport,
}) {
  exactKeys(plan, PLAN_KEYS, "inventory plan");
  assertV4(
    plan.schemaVersion === DECOMPOSED_INVENTORY.planSchemaVersion &&
      plan.protocolId === DECOMPOSED_INVENTORY.planProtocolId &&
      plan.debateNumber === legacySchema.properties.debateNumber.const &&
      plan.debateId === legacySchema.properties.debateId.const &&
      plan.reviewerRole === DECOMPOSED_INVENTORY.planReviewerRole &&
      plan.assessmentModel === DECOMPOSED_INVENTORY.model &&
      plan.calibrationOnly === true &&
      plan.candidateTransportCanonicalSha256 ===
        canonicalSha256(candidateTransport) &&
      !containsProhibitedCalculatedField(plan),
    "inventory plan identity, binding, or score-blind boundary drifted"
  );
  exactKeys(
    plan.isolation,
    Object.keys(legacySchema.properties.isolation.properties),
    "inventory plan isolation"
  );
  assertV4(
    Object.entries(plan.isolation).every(
      ([key, value]) => value === (key === "contaminationDetected" ? false : true)
    ),
    "inventory plan isolation failed"
  );
  exactKeys(plan.audit, PLAN_AUDIT_KEYS, "inventory plan audit");
  assertV4(
    Object.values(plan.audit).every((value) => value === true),
    "inventory plan audit assertions must be true"
  );
  validateRoutePlan(plan.routes);
  validateSectionPlan(plan.sections);
  return { status: "passed", sections: plan.sections.length };
}

export function validateDecomposedInventorySelection({
  selection,
  plan,
  legacySchema,
  candidateTransport,
}) {
  validateDecomposedInventoryPlan({ plan, legacySchema, candidateTransport });
  exactKeys(selection, SELECTION_KEYS, "inventory selection");
  assertV4(
    selection.schemaVersion === DECOMPOSED_INVENTORY.selectionSchemaVersion &&
      selection.protocolId === DECOMPOSED_INVENTORY.selectionProtocolId &&
      selection.debateNumber === plan.debateNumber &&
      selection.debateId === plan.debateId &&
      selection.reviewerRole === DECOMPOSED_INVENTORY.selectionReviewerRole &&
      selection.assessmentModel === DECOMPOSED_INVENTORY.model &&
      selection.calibrationOnly === true &&
      selection.candidateTransportCanonicalSha256 ===
        canonicalSha256(candidateTransport) &&
      selection.inventoryPlanSha256 === inventoryPlanSha256(plan) &&
      !containsProhibitedCalculatedField(selection),
    "inventory selection identity, binding, or score-blind boundary drifted"
  );
  exactKeys(
    selection.isolation,
    Object.keys(SELECTION_ISOLATION),
    "inventory selection isolation"
  );
  assertV4(
    isDeepStrictEqual(selection.isolation, SELECTION_ISOLATION),
    "inventory selection isolation failed"
  );
  exactKeys(selection.audit, SELECTION_AUDIT_KEYS, "inventory selection audit");
  assertV4(
    Object.values(selection.audit).every((value) => value === true),
    "inventory selection audit assertions must be true"
  );
  const idIndex = candidateTransport.columnOrder.indexOf("qualifiedCandidateId");
  const sideIndex = candidateTransport.columnOrder.indexOf("side");
  assertV4(idIndex >= 0 && sideIndex >= 0, "candidate identity or side missing");
  const expected = { pro: [], con: [] };
  for (const row of candidateTransport.candidateRows) {
    expected[row[sideIndex]].push(row[idIndex]);
  }
  exactKeys(
    selection.candidateSelectionsBySide,
    ["pro", "con"],
    "candidate side maps"
  );
  const sectionIds = new Set(plan.sections.map((section) => section.sectionId));
  const grouped = new Map(
    [...sectionIds].flatMap((sectionId) =>
      ["pro", "con"].map((side) => [`${sectionId}/${side}`, 0])
    )
  );
  const moveIds = new Set();
  let selectedCount = 0;
  for (const side of ["pro", "con"]) {
    exactKeys(
      selection.candidateSelectionsBySide[side],
      expected[side],
      `${side} candidate selections`
    );
    for (const [candidateId, candidateSelection] of Object.entries(
      selection.candidateSelectionsBySide[side]
    )) {
      if (candidateSelection === null) continue;
      exactKeys(
        candidateSelection,
        ["sectionId", "moveId", "moveKind", "proposition"],
        candidateId
      );
      assertV4(
        sectionIds.has(candidateSelection.sectionId),
        `${candidateId}: section is not in the immutable plan`
      );
      boundedString(
        candidateSelection.moveId,
        1,
        DECOMPOSED_INVENTORY_LIMITS.identifier,
        `${candidateId}.moveId`
      );
      boundedString(
        candidateSelection.proposition,
        25,
        DECOMPOSED_INVENTORY_LIMITS.proposition,
        `${candidateId}.proposition`
      );
      assertV4(
        ["constructive", "reply"].includes(candidateSelection.moveKind),
        `${candidateId}: invalid move kind`
      );
      assertV4(
        !moveIds.has(candidateSelection.moveId),
        `${candidateSelection.moveId}: duplicate move ID`
      );
      moveIds.add(candidateSelection.moveId);
      const groupKey = `${candidateSelection.sectionId}/${side}`;
      grouped.set(groupKey, grouped.get(groupKey) + 1);
      selectedCount += 1;
    }
  }
  assertV4(
    selectedCount >= 8 && selectedCount <= 24,
    "inventory selection requires 8..24 candidates"
  );
  for (const [group, count] of grouped) {
    assertV4(count >= 1 && count <= 2, `${group}: requires one or two selections`);
  }
  return { status: "passed", selectedCandidates: selectedCount };
}

export function splitSidePartitionedInventoryProposal({
  proposal,
  candidateTransport,
}) {
  const transportSha = canonicalSha256(candidateTransport);
  const plan = {
    schemaVersion: DECOMPOSED_INVENTORY.planSchemaVersion,
    protocolId: DECOMPOSED_INVENTORY.planProtocolId,
    debateNumber: proposal.debateNumber,
    debateId: proposal.debateId,
    reviewerRole: DECOMPOSED_INVENTORY.planReviewerRole,
    assessmentModel: proposal.assessmentModel,
    calibrationOnly: proposal.calibrationOnly,
    candidateTransportCanonicalSha256: transportSha,
    isolation: clone(proposal.isolation),
    routes: clone(proposal.routes),
    sections: clone(proposal.sections),
    audit: {
      completeCandidateEvidenceBundleReviewed:
        proposal.audit.completeCandidateEvidenceBundleReviewed,
      candidateSelectionDeferred: true,
      ratingsUnavailable: proposal.audit.ratingsUnavailable,
      responseTopologyUnavailable: proposal.audit.responseTopologyUnavailable,
      otherJudgmentsUnavailable: proposal.audit.otherJudgmentsUnavailable,
      calculatedTotalsUnavailable: proposal.audit.calculatedTotalsUnavailable,
      winnerLabelsUnavailable: proposal.audit.winnerLabelsUnavailable,
    },
  };
  const selection = {
    schemaVersion: DECOMPOSED_INVENTORY.selectionSchemaVersion,
    protocolId: DECOMPOSED_INVENTORY.selectionProtocolId,
    debateNumber: proposal.debateNumber,
    debateId: proposal.debateId,
    reviewerRole: DECOMPOSED_INVENTORY.selectionReviewerRole,
    assessmentModel: proposal.assessmentModel,
    calibrationOnly: proposal.calibrationOnly,
    candidateTransportCanonicalSha256: transportSha,
    inventoryPlanSha256: inventoryPlanSha256(plan),
    isolation: clone(SELECTION_ISOLATION),
    candidateSelectionsBySide: clone(proposal.candidateSelectionsBySide),
    audit: {
      inventoryPlanImmutable: true,
      everyCandidateKeyReviewed: true,
      everySelectedCandidateUsedOnce:
        proposal.audit.everySelectedCandidateUsedOnce,
      ratingsUnavailable: proposal.audit.ratingsUnavailable,
      responseTopologyUnavailable: proposal.audit.responseTopologyUnavailable,
      otherJudgmentsUnavailable: proposal.audit.otherJudgmentsUnavailable,
      calculatedTotalsUnavailable: proposal.audit.calculatedTotalsUnavailable,
      winnerLabelsUnavailable: proposal.audit.winnerLabelsUnavailable,
    },
  };
  return { plan, selection };
}

export function composeDecomposedInventoryProposal({
  plan,
  selection,
  legacySchema,
  candidateTransport,
}) {
  validateDecomposedInventorySelection({
    selection,
    plan,
    legacySchema,
    candidateTransport,
  });
  return {
    schemaVersion: SIDE_PARTITIONED_SELECTION_MAP.schemaVersion,
    protocolId: SIDE_PARTITIONED_SELECTION_MAP.protocolId,
    debateNumber: plan.debateNumber,
    debateId: plan.debateId,
    reviewerRole: "score-blind-inventory-curator",
    assessmentModel: plan.assessmentModel,
    calibrationOnly: plan.calibrationOnly,
    isolation: clone(plan.isolation),
    routes: clone(plan.routes),
    sections: clone(plan.sections),
    candidateSelectionsBySide: clone(selection.candidateSelectionsBySide),
    audit: {
      completeCandidateEvidenceBundleReviewed:
        plan.audit.completeCandidateEvidenceBundleReviewed,
      everySelectedCandidateUsedOnce:
        selection.audit.everySelectedCandidateUsedOnce,
      ratingsUnavailable: plan.audit.ratingsUnavailable,
      responseTopologyUnavailable: plan.audit.responseTopologyUnavailable,
      otherJudgmentsUnavailable: plan.audit.otherJudgmentsUnavailable,
      calculatedTotalsUnavailable: plan.audit.calculatedTotalsUnavailable,
      winnerLabelsUnavailable: plan.audit.winnerLabelsUnavailable,
    },
  };
}

export function compileDecomposedInventory({
  plan,
  selection,
  legacySchema,
  candidateTransport,
  evidenceBundle,
  eventsDocument,
}) {
  const proposal = composeDecomposedInventoryProposal({
    plan,
    selection,
    legacySchema,
    candidateTransport,
  });
  return {
    proposal,
    ...compileSidePartitionedSelectionMapInventory({
      proposal,
      candidateTransport,
      legacySchema,
      evidenceBundle,
      eventsDocument,
    }),
  };
}

export function auditDecomposedStrictSchema(schema) {
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
