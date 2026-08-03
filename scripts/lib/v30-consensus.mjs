import { createHash } from "node:crypto";
import {
  BURDEN_ADJUSTMENTS,
  BURDEN_TIERS,
  DEFECT_TYPES,
  SCOPE_RELATIONS,
  deriveBurdenRelevance,
  deriveCoverage,
  deriveDiagnostic,
  deriveReframe,
  derivedTuple,
  equal,
  validateSpan
} from "./v291-semantics.mjs";

export const V30_WORKFLOW = "Slugfester Adjudicated Consensus Workflow v3.0";
export const V30_RUBRIC = "Slugfester Reassessment Rubric v3.0";
export const V30_MODEL = "5.6 Sol";
export const V30_PASS_INPUTS = ["workflow.md", "rubric.md", "manual.md", "schema.json", "input.json"];
export const V30_ADJUDICATION_INPUTS = ["workflow.md", "rubric.md", "manual.md", "schema.json", "dispute-packet.json"];

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const canonicalJson = (value) => JSON.stringify(value);
export const parseCanonicalJson = (value, label = "resolvedJson") => {
  assert(typeof value === "string", `${label} must be a JSON string`);
  const parsed = JSON.parse(value);
  assert(canonicalJson(parsed) === value, `${label} must use canonical compact JSON`);
  return parsed;
};
export const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
export const exactKeys = (value, keys, label) => {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert(equal(Object.keys(value).sort(), [...keys].sort()), `${label} keys differ`);
};

export const ANNOTATION_KEYS = [
  "caseId", "moveId", "originalTargetContact", "targetEvidence", "connectedExample",
  "connectionEvidence", "scopeRelation", "scopeEvidence", "burdenAdjustment",
  "burdenEvidence", "componentContacts", "relevantContraryMaterial", "contraryEvidence",
  "defectType", "defectCue", "consequenceStated", "consequenceCue",
  "malformedDemandExplained", "malformedDemandCue", "replacementDemandStated",
  "replacementDemandCue", "burdenContact", "rationale"
];

export function validateAnnotation(annotation, challengeCase, label = annotation?.caseId ?? "annotation") {
  exactKeys(annotation, ANNOTATION_KEYS, label);
  assert(annotation.caseId === challengeCase.caseId && annotation.moveId === challengeCase.moveId, `${label}: identity mismatch`);
  const excerpt = challengeCase.sourceExcerpt;
  assert(typeof annotation.originalTargetContact === "boolean" && typeof annotation.connectedExample === "boolean", `${label}: target booleans invalid`);
  assert(annotation.originalTargetContact ? validateSpan(excerpt, annotation.targetEvidence) : annotation.targetEvidence === null, `${label}: target evidence invalid`);
  assert(annotation.connectedExample ? validateSpan(excerpt, annotation.connectionEvidence) : annotation.connectionEvidence === null, `${label}: connection evidence invalid`);
  assert(SCOPE_RELATIONS.includes(annotation.scopeRelation) && BURDEN_ADJUSTMENTS.includes(annotation.burdenAdjustment), `${label}: scope or burden adjustment invalid`);
  assert(annotation.scopeRelation === "same" ? annotation.scopeEvidence === null : annotation.originalTargetContact && validateSpan(excerpt, annotation.scopeEvidence), `${label}: scope evidence invalid`);
  assert(annotation.burdenAdjustment === "retained" ? annotation.burdenEvidence === null : validateSpan(excerpt, annotation.burdenEvidence), `${label}: burden evidence invalid`);
  const expectedIds = challengeCase.targetPacket.indispensableComponents.map((item) => item.id);
  const actualIds = annotation.componentContacts.map((item) => item.componentId);
  assert(equal(expectedIds, actualIds) && new Set(actualIds).size === actualIds.length, `${label}: component set or order mismatch`);
  for (const contact of annotation.componentContacts) {
    exactKeys(contact, ["componentId", "contacted", "evidence"], `${label}.${contact.componentId}`);
    assert(typeof contact.contacted === "boolean", `${label}.${contact.componentId}: contacted invalid`);
    assert(contact.contacted ? annotation.originalTargetContact && validateSpan(excerpt, contact.evidence) : contact.evidence === null, `${label}.${contact.componentId}: evidence invalid`);
  }
  if (!annotation.originalTargetContact) assert(annotation.componentContacts.every((item) => !item.contacted), `${label}: component contact without target contact`);
  if (annotation.componentContacts.some((item) => item.contacted)) assert(annotation.relevantContraryMaterial === false, `${label}: component/contrary conflict`);
  assert(annotation.relevantContraryMaterial ? annotation.originalTargetContact && annotation.componentContacts.every((item) => !item.contacted) && validateSpan(excerpt, annotation.contraryEvidence) : annotation.contraryEvidence === null, `${label}: contrary material invalid`);
  assert(DEFECT_TYPES.includes(annotation.defectType), `${label}: defect invalid`);
  assert(annotation.defectType === "none" ? annotation.defectCue === null : annotation.originalTargetContact && validateSpan(excerpt, annotation.defectCue), `${label}: defect cue invalid`);
  assert(annotation.consequenceStated ? annotation.defectType !== "none" && validateSpan(excerpt, annotation.consequenceCue) : annotation.consequenceCue === null, `${label}: consequence invalid`);
  assert(annotation.malformedDemandExplained ? validateSpan(excerpt, annotation.malformedDemandCue) : annotation.malformedDemandCue === null, `${label}: malformed-demand cue invalid`);
  assert(annotation.replacementDemandStated ? validateSpan(excerpt, annotation.replacementDemandCue) : annotation.replacementDemandCue === null, `${label}: replacement-demand cue invalid`);
  exactKeys(annotation.burdenContact, ["tier", "bridgeId", "evidence"], `${label}.burdenContact`);
  assert(BURDEN_TIERS.includes(annotation.burdenContact.tier), `${label}: burden tier invalid`);
  if (annotation.burdenContact.tier === "none") {
    assert(annotation.burdenContact.bridgeId === null && annotation.burdenContact.evidence === null, `${label}: none burden contact invalid`);
  } else {
    const bridge = challengeCase.burdenContext.route?.bridges.find((item) => item.id === annotation.burdenContact.bridgeId);
    assert(challengeCase.burdenContext.burdenPacket.eligibleBridgeIds.includes(annotation.burdenContact.bridgeId), `${label}: ineligible burden bridge`);
    assert(bridge?.tier === annotation.burdenContact.tier && validateSpan(excerpt, annotation.burdenContact.evidence), `${label}: burden contact invalid`);
  }
  assert(typeof annotation.rationale === "string" && annotation.rationale.trim().length >= 60, `${label}: rationale too short`);
  return annotation;
}

export function passNonDefaultCounts(annotations) {
  return {
    originalTargetContacts: annotations.filter((item) => item.originalTargetContact).length,
    connectedExamples: annotations.filter((item) => item.connectedExample).length,
    componentContacts: annotations.flatMap((item) => item.componentContacts).filter((item) => item.contacted).length,
    defectCandidates: annotations.filter((item) => item.defectType !== "none").length,
    diagnosticPositives: annotations.filter(deriveDiagnostic).length,
    reframePositives: annotations.filter(deriveReframe).length,
    burdenContacts: annotations.filter((item) => item.burdenContact.tier !== "none").length,
    uniqueRationales: new Set(annotations.map((item) => item.rationale.trim())).size
  };
}

export function compoundFields(annotation) {
  return [
    ["targetContact", { value: annotation.originalTargetContact, evidence: annotation.targetEvidence }],
    ["connectedExample", { value: annotation.connectedExample, evidence: annotation.connectionEvidence }],
    ["scope", { value: annotation.scopeRelation, evidence: annotation.scopeEvidence }],
    ["burdenAdjustment", { value: annotation.burdenAdjustment, evidence: annotation.burdenEvidence }],
    ...annotation.componentContacts.map((item) => [`componentContact.${item.componentId}`, { value: item.contacted, evidence: item.evidence }]),
    ["relevantContraryMaterial", { value: annotation.relevantContraryMaterial, evidence: annotation.contraryEvidence }],
    ["defect", { value: annotation.defectType, evidence: annotation.defectCue }],
    ["consequence", { value: annotation.consequenceStated, evidence: annotation.consequenceCue }],
    ["malformedDemand", { value: annotation.malformedDemandExplained, evidence: annotation.malformedDemandCue }],
    ["replacementDemand", { value: annotation.replacementDemandStated, evidence: annotation.replacementDemandCue }],
    ["burdenContact", structuredClone(annotation.burdenContact)]
  ];
}

export function applyCompoundField(annotation, fieldPath, compoundValue) {
  if (fieldPath === "targetContact") [annotation.originalTargetContact, annotation.targetEvidence] = [compoundValue.value, compoundValue.evidence];
  else if (fieldPath === "connectedExample") [annotation.connectedExample, annotation.connectionEvidence] = [compoundValue.value, compoundValue.evidence];
  else if (fieldPath === "scope") [annotation.scopeRelation, annotation.scopeEvidence] = [compoundValue.value, compoundValue.evidence];
  else if (fieldPath === "burdenAdjustment") [annotation.burdenAdjustment, annotation.burdenEvidence] = [compoundValue.value, compoundValue.evidence];
  else if (fieldPath.startsWith("componentContact.")) {
    const componentId = fieldPath.slice("componentContact.".length);
    const component = annotation.componentContacts.find((item) => item.componentId === componentId);
    assert(component, `unknown component field ${fieldPath}`);
    [component.contacted, component.evidence] = [compoundValue.value, compoundValue.evidence];
  } else if (fieldPath === "relevantContraryMaterial") [annotation.relevantContraryMaterial, annotation.contraryEvidence] = [compoundValue.value, compoundValue.evidence];
  else if (fieldPath === "defect") [annotation.defectType, annotation.defectCue] = [compoundValue.value, compoundValue.evidence];
  else if (fieldPath === "consequence") [annotation.consequenceStated, annotation.consequenceCue] = [compoundValue.value, compoundValue.evidence];
  else if (fieldPath === "malformedDemand") [annotation.malformedDemandExplained, annotation.malformedDemandCue] = [compoundValue.value, compoundValue.evidence];
  else if (fieldPath === "replacementDemand") [annotation.replacementDemandStated, annotation.replacementDemandCue] = [compoundValue.value, compoundValue.evidence];
  else if (fieldPath === "burdenContact") annotation.burdenContact = structuredClone(compoundValue);
  else throw new Error(`unknown compound field ${fieldPath}`);
}

export function scoringBands(challengeCase, annotation) {
  const tuple = derivedTuple(challengeCase, annotation);
  let responsiveness;
  if (tuple.coverage === "full" || tuple.diagnostic || tuple.reframe) responsiveness = [80, 100];
  else if (tuple.coverage === "partial") responsiveness = [55, 79];
  else if (tuple.coverage === "relevant-nonanswer") responsiveness = [40, 69];
  else responsiveness = [0, 39];
  const burdenBands = {
    completes: [90, 100],
    "advances-central": [75, 89],
    "advances-sub-burden": [55, 74],
    "topical-peripheral": [25, 54],
    "unadopted-or-irrelevant": [0, 24]
  };
  return { derived: tuple, responsiveness, relevanceBurden: burdenBands[deriveBurdenRelevance(challengeCase, annotation)] };
}

export { deriveCoverage, deriveDiagnostic, deriveReframe, derivedTuple, equal };

