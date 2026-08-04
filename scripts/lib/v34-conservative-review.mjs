import {
  applyCompoundField, assert, canonicalEvidenceChoice, canonicalJson, compoundFields, deriveDiagnostic,
  deriveReframe, derivedTuple, equal, passNonDefaultCounts, sameSemantic, scoringBands, semanticValue,
  sha256, validateAnnotation
} from "./v32-risk-adjudication.mjs";

export const V34_WORKFLOW = "Slugfester Conservative Dual-Confirmation Workflow v3.4";
export const V34_RUBRIC = "Slugfester Reassessment Rubric v3.4";
export const V34_MODELS = { terra: "5.6 Terra", sol: "5.6 Sol" };
export const V34_MODEL_SLUGS = { terra: "gpt-5.6-terra", sol: "gpt-5.6-sol" };
export const V34_ALLOWED_INPUTS = ["workflow.md", "rubric.md", "manual.md", "schema.json", "review-packet.json"];

export const DEFECTS = ["none", "attribution-error", "contradiction", "ambiguity", "scope-mismatch", "unsupported-comparison", "missing-premise", "invalid-inference", "evidential-insufficiency", "irrelevance"];
export const SCOPES = ["same", "narrowed", "strengthened", "modality-shift"];
export const BURDEN_ADJUSTMENTS = ["retained", "reassigned", "replaced"];
export const CONTACT_MODES = ["none", "exact-proposition", "explicit-global-assent", "denial", "restriction", "distinction", "explanation", "warrant-challenge"];
export const EXAMPLE_CLASSIFICATIONS = ["none", "inside-locked-target", "distinct-connected-example"];
export const CONTRARY_CLASSIFICATIONS = ["none", "component-contact-precludes-contrary", "relevant-no-component"];
export const DUAL_OVERRIDE_ELIGIBLE = new Set(["targetContact", "connectedExample", "scope", "relevantContraryMaterial", "defect", "consequence", "malformedDemand", "replacementDemand"]);

export function isDualOverrideEligible(fieldPath) {
  return DUAL_OVERRIDE_ELIGIBLE.has(fieldPath) || fieldPath.startsWith("componentContact.");
}

function exactKeys(value, keys, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  assert(equal(Object.keys(value).sort(), [...keys].sort()), `${label}: keys differ`);
}

function validateSpan(span, sourceExcerpt, required, label) {
  if (!required) {
    assert(span === null, `${label}: expected null`);
    return;
  }
  exactKeys(span, ["startChar", "endChar", "text"], label);
  assert(Number.isInteger(span.startChar) && Number.isInteger(span.endChar) && span.startChar >= 0 && span.endChar > span.startChar, `${label}: invalid offsets`);
  assert(sourceExcerpt.slice(span.startChar, span.endChar) === span.text, `${label}: span is not an exact sourceExcerpt substring`);
}

function baseAnnotation(review) {
  return {
    caseId: review.caseId, moveId: review.moveId,
    originalTargetContact: review.originalTargetContact, targetEvidence: review.targetEvidence,
    connectedExample: review.connectedExample, connectionEvidence: review.connectionEvidence,
    scopeRelation: review.scopeRelation, scopeEvidence: review.scopeEvidence,
    burdenAdjustment: review.burdenAdjustment, burdenEvidence: review.burdenEvidence,
    componentContacts: review.componentReviews.map(({ componentId, contacted, evidence }) => ({ componentId, contacted, evidence })),
    relevantContraryMaterial: review.relevantContraryMaterial, contraryEvidence: review.contraryEvidence,
    defectType: review.defectType, defectCue: review.defectCue,
    consequenceStated: review.consequenceStated, consequenceCue: review.consequenceCue,
    malformedDemandExplained: review.malformedDemandExplained, malformedDemandCue: review.malformedDemandCue,
    replacementDemandStated: review.replacementDemandStated, replacementDemandCue: review.replacementDemandCue,
    burdenContact: review.burdenContact, rationale: review.rationale
  };
}

export function validateCaseReview(review, challengeCase, label) {
  exactKeys(review, [
    "caseId", "moveId", "originalTargetContact", "targetEvidence", "connectedExample", "connectionEvidence",
    "exampleClassification", "boundaryEvidence", "scopeRelation", "scopeEvidence", "burdenAdjustment", "burdenEvidence",
    "componentReviews", "relevantContraryMaterial", "contraryEvidence", "contraryClassification",
    "defectCuePresent", "defectType", "defectCue", "consequenceCuePresent", "consequenceStated", "consequenceCue",
    "consequenceClauseDistinct", "malformedDemandExplained", "malformedDemandCue", "replacementDemandStated",
    "replacementDemandCue", "burdenContact", "rationale"
  ], label);
  assert(review.caseId === challengeCase.caseId && review.moveId === challengeCase.moveId, `${label}: case identity mismatch`);
  assert(EXAMPLE_CLASSIFICATIONS.includes(review.exampleClassification), `${label}: exampleClassification invalid`);
  assert(CONTRARY_CLASSIFICATIONS.includes(review.contraryClassification), `${label}: contraryClassification invalid`);
  assert(DEFECTS.includes(review.defectType) && SCOPES.includes(review.scopeRelation) && BURDEN_ADJUSTMENTS.includes(review.burdenAdjustment), `${label}: enum invalid`);
  assert(typeof review.rationale === "string" && review.rationale.trim().length >= 60, `${label}: rationale too short`);

  const expectedComponents = challengeCase.targetPacket.indispensableComponents;
  assert(Array.isArray(review.componentReviews) && review.componentReviews.length === expectedComponents.length, `${label}: component count mismatch`);
  for (let index = 0; index < expectedComponents.length; index += 1) {
    const component = review.componentReviews[index], expected = expectedComponents[index];
    exactKeys(component, ["componentId", "contacted", "evidence", "contactMode", "licenseText"], `${label}.componentReviews[${index}]`);
    assert(component.componentId === expected.id && typeof component.contacted === "boolean" && CONTACT_MODES.includes(component.contactMode), `${label}: component identity/mode invalid`);
    assert(component.contacted === (component.contactMode !== "none"), `${label}: component contact/mode mismatch`);
    validateSpan(component.evidence, challengeCase.sourceExcerpt, component.contacted, `${label}.componentReviews[${index}].evidence`);
    validateSpan(component.licenseText, challengeCase.sourceExcerpt, component.contactMode === "explicit-global-assent", `${label}.componentReviews[${index}].licenseText`);
  }

  assert(review.connectedExample === (review.exampleClassification === "distinct-connected-example"), `${label}: connected-example boundary mismatch`);
  validateSpan(review.boundaryEvidence, challengeCase.sourceExcerpt, review.exampleClassification !== "none", `${label}.boundaryEvidence`);
  const anyComponent = review.componentReviews.some((item) => item.contacted);
  const expectedContrary = review.relevantContraryMaterial ? "relevant-no-component" : anyComponent ? "component-contact-precludes-contrary" : "none";
  assert(review.contraryClassification === expectedContrary, `${label}: contrary boundary mismatch`);

  assert(review.defectCuePresent === (review.defectType !== "none"), `${label}: defect stage mismatch`);
  assert(review.consequenceCuePresent === review.consequenceStated, `${label}: consequence stage mismatch`);
  assert(review.consequenceStated ? review.defectType !== "none" && review.consequenceClauseDistinct : review.consequenceClauseDistinct === false, `${label}: consequence dependency mismatch`);
  if (review.consequenceStated) {
    assert(review.defectCue && review.consequenceCue && review.defectCue.text !== review.consequenceCue.text, `${label}: consequence must cite a clause distinct from the defect cue`);
  }

  const annotation = baseAnnotation(review);
  validateAnnotation(annotation, challengeCase, label);
  return annotation;
}

function containsScoreKey(value) {
  if (!value || typeof value !== "object") return false;
  if (Object.keys(value).some((key) => /^(score|scores|moveScore|sectionScore|overall)$/i.test(key))) return true;
  return Object.values(value).some(containsScoreKey);
}

export function validateReviewArtifact(artifact, packet, modelKey, sourceTexts) {
  exactKeys(artifact, ["schemaVersion", "workflowVersion", "rubricVersion", "reviewerKey", "model", "calibrationOnly", "completedAt", "isolation", "source", "reviews", "audit"], "artifact");
  assert(artifact.schemaVersion === "3.4-isolated-review" && artifact.workflowVersion === V34_WORKFLOW && artifact.rubricVersion === V34_RUBRIC, "artifact identity invalid");
  assert(artifact.reviewerKey === modelKey && artifact.model === V34_MODELS[modelKey] && artifact.calibrationOnly === true && !Number.isNaN(Date.parse(artifact.completedAt)), "artifact reviewer identity invalid");
  exactKeys(artifact.isolation, ["method", "allowedInputs", "rawValuesUnavailable", "agreementStatusUnavailable", "goldUnavailable", "scoresUnavailable", "legacyMaterialUnavailable", "statement"], "artifact.isolation");
  assert(artifact.isolation.method === "fresh-ephemeral-v3.4-review" && equal([...artifact.isolation.allowedInputs].sort(), [...V34_ALLOWED_INPUTS].sort()), "artifact isolation method/input invalid");
  for (const key of ["rawValuesUnavailable", "agreementStatusUnavailable", "goldUnavailable", "scoresUnavailable", "legacyMaterialUnavailable"]) assert(artifact.isolation[key] === true, `artifact.isolation.${key} invalid`);
  assert(typeof artifact.isolation.statement === "string" && artifact.isolation.statement.trim().length >= 50, "artifact isolation statement too short");
  exactKeys(artifact.source, ["packetPath", "packetSha256", "workflowSha256", "rubricSha256", "manualSha256", "schemaSha256"], "artifact.source");
  assert(artifact.source.packetPath === "review-packet.json", "artifact packetPath invalid");
  for (const [key, text] of Object.entries(sourceTexts)) assert(artifact.source[key] === sha256(text), `artifact source ${key} mismatch`);
  assert(Array.isArray(artifact.reviews) && artifact.reviews.length === packet.caseCount && !containsScoreKey(artifact), "artifact review coverage or score exclusion failed");
  const caseById = new Map(packet.cases.map((item) => [item.caseId, item]));
  const annotations = [], seen = new Set();
  for (let index = 0; index < artifact.reviews.length; index += 1) {
    const review = artifact.reviews[index];
    assert(packet.cases[index].caseId === review.caseId && !seen.has(review.caseId), `reviews[${index}]: order or duplicate error`);
    seen.add(review.caseId);
    annotations.push(validateCaseReview(review, caseById.get(review.caseId), `reviews[${index}]`));
  }
  exactKeys(artifact.audit, ["caseCount", "allCasesReviewedOnce", "componentSetErrors", "evidenceErrors", "stagedDiagnosticErrors", "boundaryErrors", "derivedFieldsPresent", "scoreFieldsPresent"], "artifact.audit");
  assert(artifact.audit.caseCount === packet.caseCount && artifact.audit.allCasesReviewedOnce === true, "artifact audit coverage invalid");
  for (const key of ["componentSetErrors", "evidenceErrors", "stagedDiagnosticErrors", "boundaryErrors"]) assert(artifact.audit[key] === 0, `artifact.audit.${key} invalid`);
  assert(artifact.audit.derivedFieldsPresent === false && artifact.audit.scoreFieldsPresent === false, "artifact audit exclusion invalid");
  return annotations;
}

export function evidenceForReviewField(review, annotation, fieldPath) {
  if (fieldPath === "targetContact") return annotation.targetEvidence;
  if (fieldPath === "connectedExample") return annotation.connectionEvidence;
  if (fieldPath === "scope") return annotation.scopeEvidence;
  if (fieldPath === "burdenAdjustment") return annotation.burdenEvidence;
  if (fieldPath.startsWith("componentContact.")) return annotation.componentContacts.find((item) => item.componentId === fieldPath.slice("componentContact.".length)).evidence;
  if (fieldPath === "relevantContraryMaterial") return annotation.contraryEvidence;
  if (fieldPath === "defect") return annotation.defectCue;
  if (fieldPath === "consequence") return annotation.consequenceCue;
  if (fieldPath === "malformedDemand") return annotation.malformedDemandCue;
  if (fieldPath === "replacementDemand") return annotation.replacementDemandCue;
  if (fieldPath === "burdenContact") return annotation.burdenContact.evidence;
  throw new Error(`unknown review field ${fieldPath}`);
}

export {
  applyCompoundField, assert, canonicalEvidenceChoice, canonicalJson, compoundFields, deriveDiagnostic, deriveReframe,
  derivedTuple, equal, passNonDefaultCounts, sameSemantic, scoringBands, semanticValue, sha256, validateAnnotation
};
