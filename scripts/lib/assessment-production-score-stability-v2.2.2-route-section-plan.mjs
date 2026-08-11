import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { assertV4, canonicalJson } from "./v4-lean-production.mjs";
import { CANDIDATE_SHARDED_INVENTORY } from "./assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";

export const V222_ROUTE_SECTION_PLAN = Object.freeze({
  routeSchemaVersion: "4.2.21.16.7-score-blind-inventory-routes",
  routeProtocolId: "v4.2.21.16.7-candidate-census-route-contract",
  routeReviewerRole: "score-blind-candidate-census-route-planner",
  sectionSchemaVersion: "4.2.21.16.7-score-blind-inventory-sections",
  sectionProtocolId: "v4.2.21.16.7-candidate-census-section-contract",
  sectionReviewerRole: "score-blind-candidate-census-section-planner",
  model: "5.6 Sol",
});

const ROUTE_KEYS = Object.freeze([
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
  "audit",
]);
const SECTION_KEYS = Object.freeze([
  "schemaVersion",
  "protocolId",
  "debateNumber",
  "debateId",
  "reviewerRole",
  "assessmentModel",
  "calibrationOnly",
  "candidateCensusCanonicalSha256",
  "fullCandidateTransportCanonicalSha256",
  "inventoryRoutesSha256",
  "isolation",
  "sections",
  "audit",
]);
const ROUTE_AUDIT_KEYS = Object.freeze([
  "completeCandidateCensusReviewed",
  "allCandidateIdsAndChronologyAvailable",
  "candidateEvidenceExcerptsDeferredToSideSelectors",
  "sectionsDeferred",
  "candidateSelectionDeferred",
  "ratingsUnavailable",
  "responseTopologyUnavailable",
  "otherJudgmentsUnavailable",
  "calculatedTotalsUnavailable",
  "winnerLabelsUnavailable",
]);
const SECTION_AUDIT_KEYS = Object.freeze([
  "inventoryRoutesImmutable",
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

const clone = (value) => structuredClone(value);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const v222InventoryRoutesSha256 = (routes) =>
  sha256(canonicalJson(routes));

function exactKeys(value, expected, label) {
  assertV4(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      isDeepStrictEqual(Object.keys(value).sort(), [...expected].sort()),
    `${label}: keys must be ${[...expected].sort().join(", ")}`
  );
}

function constAudit(keys) {
  return {
    type: "object",
    additionalProperties: false,
    required: [...keys],
    properties: Object.fromEntries(
      keys.map((key) => [key, { type: "boolean", const: true }])
    ),
  };
}

function trueAudit(keys) {
  return Object.fromEntries(keys.map((key) => [key, true]));
}

export function buildV222InventoryRouteSchema(planSchema) {
  const schema = clone(planSchema);
  assertV4(
    schema?.properties?.routes && schema?.properties?.sections,
    "candidate-census plan schema is unavailable"
  );
  schema.$id = "slugfester-v4221167-score-blind-inventory-routes";
  schema.title = "Slugfester v4.2.21.16.7 score-blind inventory routes";
  delete schema.properties.sections;
  schema.properties.schemaVersion.const =
    V222_ROUTE_SECTION_PLAN.routeSchemaVersion;
  schema.properties.protocolId.const = V222_ROUTE_SECTION_PLAN.routeProtocolId;
  schema.properties.reviewerRole.const =
    V222_ROUTE_SECTION_PLAN.routeReviewerRole;
  schema.properties.audit = constAudit(ROUTE_AUDIT_KEYS);
  schema.required = [...ROUTE_KEYS];
  return schema;
}

export function buildV222InventorySectionSchema(planSchema, routes) {
  const schema = clone(planSchema);
  assertV4(
    schema?.properties?.routes && schema?.properties?.sections,
    "candidate-census plan schema is unavailable"
  );
  schema.$id = "slugfester-v4221167-score-blind-inventory-sections";
  schema.title = "Slugfester v4.2.21.16.7 score-blind inventory sections";
  delete schema.properties.routes;
  schema.properties.schemaVersion.const =
    V222_ROUTE_SECTION_PLAN.sectionSchemaVersion;
  schema.properties.protocolId.const =
    V222_ROUTE_SECTION_PLAN.sectionProtocolId;
  schema.properties.reviewerRole.const =
    V222_ROUTE_SECTION_PLAN.sectionReviewerRole;
  schema.properties.inventoryRoutesSha256 = {
    type: "string",
    const: v222InventoryRoutesSha256(routes),
  };
  schema.properties.audit = constAudit(SECTION_AUDIT_KEYS);
  schema.required = [...SECTION_KEYS];
  return schema;
}

export function splitV222CandidateCensusPlan(plan) {
  return {
    routes: {
      schemaVersion: V222_ROUTE_SECTION_PLAN.routeSchemaVersion,
      protocolId: V222_ROUTE_SECTION_PLAN.routeProtocolId,
      debateNumber: plan.debateNumber,
      debateId: plan.debateId,
      reviewerRole: V222_ROUTE_SECTION_PLAN.routeReviewerRole,
      assessmentModel: plan.assessmentModel,
      calibrationOnly: plan.calibrationOnly,
      candidateCensusCanonicalSha256: plan.candidateCensusCanonicalSha256,
      fullCandidateTransportCanonicalSha256:
        plan.fullCandidateTransportCanonicalSha256,
      isolation: clone(plan.isolation),
      routes: clone(plan.routes),
      audit: trueAudit(ROUTE_AUDIT_KEYS),
    },
    sections: {
      schemaVersion: V222_ROUTE_SECTION_PLAN.sectionSchemaVersion,
      protocolId: V222_ROUTE_SECTION_PLAN.sectionProtocolId,
      debateNumber: plan.debateNumber,
      debateId: plan.debateId,
      reviewerRole: V222_ROUTE_SECTION_PLAN.sectionReviewerRole,
      assessmentModel: plan.assessmentModel,
      calibrationOnly: plan.calibrationOnly,
      candidateCensusCanonicalSha256: plan.candidateCensusCanonicalSha256,
      fullCandidateTransportCanonicalSha256:
        plan.fullCandidateTransportCanonicalSha256,
      inventoryRoutesSha256: v222InventoryRoutesSha256(plan.routes),
      isolation: clone(plan.isolation),
      sections: clone(plan.sections),
      audit: trueAudit(SECTION_AUDIT_KEYS),
    },
  };
}

export function composeV222CandidateCensusPlan(routeOutput, sectionOutput) {
  exactKeys(routeOutput, ROUTE_KEYS, "route output");
  exactKeys(sectionOutput, SECTION_KEYS, "section output");
  exactKeys(routeOutput.audit, ROUTE_AUDIT_KEYS, "route audit");
  exactKeys(sectionOutput.audit, SECTION_AUDIT_KEYS, "section audit");
  assertV4(
    routeOutput.schemaVersion === V222_ROUTE_SECTION_PLAN.routeSchemaVersion &&
      routeOutput.protocolId === V222_ROUTE_SECTION_PLAN.routeProtocolId &&
      routeOutput.reviewerRole === V222_ROUTE_SECTION_PLAN.routeReviewerRole &&
      sectionOutput.schemaVersion ===
        V222_ROUTE_SECTION_PLAN.sectionSchemaVersion &&
      sectionOutput.protocolId === V222_ROUTE_SECTION_PLAN.sectionProtocolId &&
      sectionOutput.reviewerRole ===
        V222_ROUTE_SECTION_PLAN.sectionReviewerRole &&
      routeOutput.assessmentModel === V222_ROUTE_SECTION_PLAN.model &&
      sectionOutput.assessmentModel === V222_ROUTE_SECTION_PLAN.model &&
      routeOutput.calibrationOnly === true &&
      sectionOutput.calibrationOnly === true &&
      Object.values(routeOutput.audit).every((value) => value === true) &&
      Object.values(sectionOutput.audit).every((value) => value === true) &&
      routeOutput.debateNumber === sectionOutput.debateNumber &&
      routeOutput.debateId === sectionOutput.debateId &&
      routeOutput.candidateCensusCanonicalSha256 ===
        sectionOutput.candidateCensusCanonicalSha256 &&
      routeOutput.fullCandidateTransportCanonicalSha256 ===
        sectionOutput.fullCandidateTransportCanonicalSha256 &&
      isDeepStrictEqual(routeOutput.isolation, sectionOutput.isolation) &&
      sectionOutput.inventoryRoutesSha256 ===
        v222InventoryRoutesSha256(routeOutput.routes),
    "route/section identity or binding mismatch"
  );
  return {
    schemaVersion: CANDIDATE_SHARDED_INVENTORY.planSchemaVersion,
    protocolId: CANDIDATE_SHARDED_INVENTORY.planProtocolId,
    debateNumber: routeOutput.debateNumber,
    debateId: routeOutput.debateId,
    reviewerRole: CANDIDATE_SHARDED_INVENTORY.planReviewerRole,
    assessmentModel: routeOutput.assessmentModel,
    calibrationOnly: true,
    candidateCensusCanonicalSha256:
      routeOutput.candidateCensusCanonicalSha256,
    fullCandidateTransportCanonicalSha256:
      routeOutput.fullCandidateTransportCanonicalSha256,
    isolation: clone(routeOutput.isolation),
    routes: clone(routeOutput.routes),
    sections: clone(sectionOutput.sections),
    audit: trueAudit(PLAN_AUDIT_KEYS),
  };
}
