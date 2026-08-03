import {
  applyCompoundField, assert, canonicalJson, compoundFields, deriveDiagnostic, deriveReframe, derivedTuple, equal,
  parseCanonicalJson, passNonDefaultCounts, scoringBands, sha256, validateAnnotation
} from "./v30-consensus.mjs";

export const V31_WORKFLOW = "Slugfester Focused AI Verification Workflow v3.1";
export const V31_RUBRIC = "Slugfester Reassessment Rubric v3.1";
export const V31_MODEL = "5.6 Sol";
export const V31_PASS_INPUTS = ["workflow.md", "rubric.md", "manual.md", "schema.json", "input.json"];
export const V31_VERIFY_INPUTS = ["workflow.md", "rubric.md", "manual.md", "schema.json", "field-packet.json"];
export const V31_FAMILIES = ["targeting-burden", "coverage", "diagnostic", "reframe"];

export function fieldFamily(fieldPath) {
  if (["targetContact", "connectedExample", "scope", "burdenAdjustment", "burdenContact"].includes(fieldPath)) return "targeting-burden";
  if (fieldPath.startsWith("componentContact.") || fieldPath === "relevantContraryMaterial") return "coverage";
  if (["defect", "consequence"].includes(fieldPath)) return "diagnostic";
  if (["malformedDemand", "replacementDemand"].includes(fieldPath)) return "reframe";
  throw new Error(`unknown field family for ${fieldPath}`);
}

export function semanticValue(fieldPath, compoundValue) {
  if (fieldPath === "burdenContact") return { tier: compoundValue.tier, bridgeId: compoundValue.bridgeId };
  return compoundValue.value;
}

export function sameSemantic(fieldPath, left, right) {
  return canonicalJson(semanticValue(fieldPath, left)) === canonicalJson(semanticValue(fieldPath, right));
}

export function isDefaultSemantic(fieldPath, value) {
  if (fieldPath === "scope") return value.value === "same";
  if (fieldPath === "burdenAdjustment") return value.value === "retained";
  if (fieldPath === "defect") return value.value === "none";
  if (fieldPath === "burdenContact") return value.tier === "none" && value.bridgeId === null;
  return value.value === false;
}

export function fieldPrompt(fieldPath, challengeCase) {
  if (fieldPath === "targetContact") return "Does exact response language bear on the locked target or an indispensable component? Default false.";
  if (fieldPath === "connectedExample") return "Does the response expressly connect another case, analogy, counterexample, or model to the target? Default false.";
  if (fieldPath === "scope") return "Relative to the contacted target, is scope same, narrowed, strengthened, or shifted in modality? Default same.";
  if (fieldPath === "burdenAdjustment") return "Is the same demand expressly reassigned, or is a materially different governing success condition expressly installed? Default retained.";
  if (fieldPath.startsWith("componentContact.")) {
    const componentId = fieldPath.slice("componentContact.".length);
    const component = challengeCase.targetPacket.indispensableComponents.find((item) => item.id === componentId);
    return `Does exact response language contact indispensable component ${componentId}: ${component?.text ?? "[missing component]"}? Default false; do not propagate contact from another component.`;
  }
  if (fieldPath === "relevantContraryMaterial") return "With no indispensable component contacted, does exact response language still supply relevant contrary material bearing on the target? Default false.";
  if (fieldPath === "defect") return "What eligible defect, if any, is expressly cued in the response? Choose the first clearly expressed defect; default none.";
  if (fieldPath === "consequence") return "Does a separate exact clause state what fails, does not follow, is not established, cannot carry the claimed weight, or must be limited because of the defect? Default false.";
  if (fieldPath === "malformedDemand") return "Does the response explain why the governing demand or framing is malformed? Default false.";
  if (fieldPath === "replacementDemand") return "Does the response state a replacement governing demand, rather than merely another topic or question? Default false.";
  if (fieldPath === "burdenContact") return `What is the highest expressly contacted eligible burden bridge? Eligible IDs: ${challengeCase.burdenContext.burdenPacket.eligibleBridgeIds.join(", ") || "none"}. Default tier none.`;
  throw new Error(`unknown prompt for ${fieldPath}`);
}

export function validateCompoundValue(fieldPath, value, challengeCase, label = fieldPath) {
  const annotation = defaultAnnotation(challengeCase);
  if (fieldPath.startsWith("componentContact.") && value.value === true) {
    annotation.originalTargetContact = true;
    annotation.targetEvidence = value.evidence;
  }
  if (["scope", "defect"].includes(fieldPath) && !isDefaultSemantic(fieldPath, value)) {
    annotation.originalTargetContact = true;
    annotation.targetEvidence = value.evidence;
  }
  if (fieldPath === "consequence" && value.value === true) {
    annotation.originalTargetContact = true;
    annotation.targetEvidence = value.evidence;
    // This eligible placeholder only lets the isolated consequence value pass
    // structural validation. The merged lock gets the independently verified
    // defect value.
    annotation.defectType = "missing-premise";
    annotation.defectCue = value.evidence;
  }
  if (fieldPath === "relevantContraryMaterial" && value.value === true) {
    annotation.originalTargetContact = true;
    annotation.targetEvidence = value.evidence;
  }
  applyCompoundField(annotation, fieldPath, value);
  try {
    validateAnnotation(annotation, challengeCase, label);
  } catch (error) {
    throw new Error(`${label}: invalid compound value: ${error.message}`);
  }
  return value;
}

export function defaultAnnotation(challengeCase) {
  return {
    caseId: challengeCase.caseId,
    moveId: challengeCase.moveId,
    originalTargetContact: false,
    targetEvidence: null,
    connectedExample: false,
    connectionEvidence: null,
    scopeRelation: "same",
    scopeEvidence: null,
    burdenAdjustment: "retained",
    burdenEvidence: null,
    componentContacts: challengeCase.targetPacket.indispensableComponents.map((item) => ({ componentId: item.id, contacted: false, evidence: null })),
    relevantContraryMaterial: false,
    contraryEvidence: null,
    defectType: "none",
    defectCue: null,
    consequenceStated: false,
    consequenceCue: null,
    malformedDemandExplained: false,
    malformedDemandCue: null,
    replacementDemandStated: false,
    replacementDemandCue: null,
    burdenContact: { tier: "none", bridgeId: null, evidence: null },
    rationale: "Focused verifier fields are combined and validated before the final semantic lock is constructed."
  };
}

export function canonicalEvidenceChoice(fieldPath, semantic, candidates) {
  const matching = candidates.filter((candidate) => sameSemantic(fieldPath, candidate, semantic));
  assert(matching.length > 0, `${fieldPath}: no AI source supports focused semantic value`);
  if (isDefaultSemantic(fieldPath, semantic)) return matching.find((candidate) => candidate.evidence === null) ?? matching[0];
  const withEvidence = matching.filter((candidate) => candidate.evidence && typeof candidate.evidence.text === "string");
  assert(withEvidence.length > 0, `${fieldPath}: focused nondefault lacks valid evidence candidate`);
  return withEvidence.sort((left, right) =>
    left.evidence.text.length - right.evidence.text.length ||
    left.evidence.startChar - right.evidence.startChar ||
    left.evidence.endChar - right.evidence.endChar ||
    canonicalJson(left).localeCompare(canonicalJson(right))
  )[0];
}

export {
  applyCompoundField, assert, canonicalJson, compoundFields, deriveDiagnostic, deriveReframe, derivedTuple, equal,
  parseCanonicalJson, passNonDefaultCounts, scoringBands, sha256, validateAnnotation
};
