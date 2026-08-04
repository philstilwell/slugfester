import {
  assert, canonicalJson, canonicalEvidenceChoice, compoundFields, defaultAnnotation, equal,
  isDefaultSemantic, parseCanonicalJson, sameSemantic, semanticValue, sha256,
  validateAnnotation, validateCompoundValue, applyCompoundField, deriveDiagnostic,
  deriveReframe, derivedTuple, scoringBands, passNonDefaultCounts
} from "./v31-verification.mjs";

export const V32_WORKFLOW = "Slugfester Hybrid Risk Adjudication Workflow v3.2";
export const V32_RUBRIC = "Slugfester Reassessment Rubric v3.2";
export const V32_PASS_MODELS = { A: "5.6 Terra", B: "5.6 Sol" };
export const V32_PASS_MODEL_SLUGS = { A: "gpt-5.6-terra", B: "gpt-5.6-sol" };
export const V32_ADJUDICATOR_MODEL = "5.6 Sol";
export const V32_ADJUDICATOR_MODEL_SLUG = "gpt-5.6-sol";
export const V32_PASS_INPUTS = ["workflow.md", "rubric.md", "manual.md", "schema.json", "input.json"];
export const V32_ADJUDICATION_INPUTS = ["workflow.md", "rubric.md", "manual.md", "schema.json", "dispute-packet.json"];

const STOP_WORDS = new Set([
  "about", "after", "again", "against", "also", "because", "been", "being", "between", "could", "does", "doing",
  "from", "have", "having", "into", "just", "more", "most", "other", "over", "same", "should", "some", "such",
  "than", "that", "their", "them", "then", "there", "these", "they", "this", "those", "through", "very", "what",
  "when", "where", "which", "while", "with", "would", "your"
]);

const SCOPE_CUE = /\b(possible|possibly|impossible|could|might|may|must|necessary|necessarily|certainty|certain|probab\w*|only|at least|at most|more than|less than|not whether|rather than)\b/i;
const DIAGNOSTIC_CUE = /\b(ambigu\w*|assum\w*|contradic\w*|confus\w*|does not follow|doesn't follow|not enough|insufficient|irrelevant|does not explain|doesn't explain|mistake|unsupported|no reason|wouldn't give|would not give|cannot establish|can't establish)\b/i;
const REFRAME_CUE = /\b(question is not|more (?:philosophically )?relevant question|instead|rather than|should ask|should be asking|different question|doesn't matter|does not matter|not whether|not the question|malformed|unfair framing)\b/i;

export function contentTokens(value) {
  return [...new Set(String(value).toLowerCase().match(/[a-z0-9]+/g) ?? [])]
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

export function componentOverlap(challengeCase, fieldPath) {
  const componentId = fieldPath.slice("componentContact.".length);
  const component = challengeCase.targetPacket.indispensableComponents.find((item) => item.id === componentId);
  assert(component, `missing component ${componentId}`);
  const response = new Set(contentTokens(challengeCase.sourceExcerpt));
  const tokens = contentTokens(component.text).filter((token) => response.has(token));
  return { count: tokens.length, tokens };
}

export function decisionCard(fieldPath, challengeCase) {
  if (fieldPath === "targetContact") return {
    default: "false", positiveRule: "Exact response language bears on the locked proposition or an indispensable component.",
    nearMisses: "Topic similarity, shared vocabulary, or an alternative position without contact is insufficient."
  };
  if (fieldPath === "connectedExample") return {
    default: "false", positiveRule: "A distinct case, analogy, counterexample, or model is expressly connected to the locked target.",
    nearMisses: "Named people already inside the target, a mere illustration, or another topic without an explicit connection is insufficient."
  };
  if (fieldPath === "scope") return {
    default: "same", positiveRule: "Change scope only for an explicit modality change or a narrower/stronger range of the same contacted proposition.",
    nearMisses: "A new topic, a more interesting question, redirection, or a different evaluative concern is not a scope change."
  };
  if (fieldPath === "burdenAdjustment") return {
    default: "retained", positiveRule: "Reassigned transfers the same demand; replaced installs a materially different governing success condition.",
    nearMisses: "A counterargument, request for support, subsidiary question, or narrower conclusion does not change the burden."
  };
  if (fieldPath.startsWith("componentContact.")) {
    const componentId = fieldPath.slice("componentContact.".length);
    const component = challengeCase.targetPacket.indispensableComponents.find((item) => item.id === componentId);
    return {
      default: "false", positiveRule: `The response grants, uses, denies, restricts, distinguishes, explains, questions, or challenges this exact proposition: ${component.text}`,
      nearMisses: "Word overlap, contact with a dependent component, or a nearby topic is insufficient; do not propagate contact."
    };
  }
  if (fieldPath === "relevantContraryMaterial") return {
    default: "false", positiveRule: "With no component contacted, exact response language still supplies contrary material bearing on the target.",
    nearMisses: "General opposition, a different topic, or material already counted as component contact is insufficient."
  };
  if (fieldPath === "defect") return {
    default: "none", positiveRule: "Choose the first expressly identified eligible defect under the rubric's ten-value taxonomy.",
    nearMisses: "A denial, contrary assertion, request for detail, example, or alternative question does not by itself identify an inferential defect."
  };
  if (fieldPath === "consequence") return {
    default: "false", positiveRule: "A separate clause states what fails, does not follow, is not established, does not explain, cannot carry the weight, or must be limited because of the defect.",
    nearMisses: "Restating a contrary conclusion or criticism without a defect-linked inferential limitation is insufficient."
  };
  if (fieldPath === "malformedDemand") return {
    default: "false", positiveRule: "The response explains why the governing demand or framing is malformed.",
    nearMisses: "Calling another question more interesting or merely changing subjects is insufficient."
  };
  if (fieldPath === "replacementDemand") return {
    default: "false", positiveRule: "The response states a replacement governing demand or success condition.",
    nearMisses: "Another topic, narrower claim, or unanswered question is insufficient without installing it as the governing demand."
  };
  if (fieldPath === "burdenContact") return {
    default: "tier none", positiveRule: `Choose the highest expressly supported or attacked eligible bridge: ${challengeCase.burdenContext.burdenPacket.eligibleBridgeIds.join(", ") || "none"}.`,
    nearMisses: "Topic contact alone is insufficient, but critical attack counts symmetrically with constructive support."
  };
  throw new Error(`unknown decision-card field ${fieldPath}`);
}

function directAgreementRisk(fieldPath, value, challengeCase, passA, passB) {
  const reasons = [];
  if (fieldPath === "connectedExample" && value.value === true) reasons.push("shared-positive-connected-example");
  if (fieldPath === "scope" && (value.value !== "same" || SCOPE_CUE.test(challengeCase.sourceExcerpt))) reasons.push(value.value !== "same" ? "shared-nondefault-scope" : "scope-cue-with-shared-default");
  if (fieldPath === "burdenAdjustment" && value.value !== "retained") reasons.push("shared-nondefault-burden-adjustment");
  if (fieldPath.startsWith("componentContact.")) {
    if (value.value === true) reasons.push("shared-positive-component-contact");
    else {
      const overlap = componentOverlap(challengeCase, fieldPath);
      if (overlap.count >= 1) reasons.push(`default-component-with-content-overlap:${overlap.tokens.join("+")}`);
    }
  }
  if (fieldPath === "relevantContraryMaterial") reasons.push(value.value === true ? "shared-positive-contrary-material" : "contrary-material-boundary");
  const diagnosticRisk = passA.defectType !== "none" || passB.defectType !== "none" || passA.consequenceStated || passB.consequenceStated || DIAGNOSTIC_CUE.test(challengeCase.sourceExcerpt);
  if (["defect", "consequence"].includes(fieldPath) && diagnosticRisk) reasons.push("diagnostic-risk-pair");
  const reframeRisk = passA.malformedDemandExplained || passB.malformedDemandExplained || passA.replacementDemandStated || passB.replacementDemandStated || REFRAME_CUE.test(challengeCase.sourceExcerpt);
  if (["malformedDemand", "replacementDemand"].includes(fieldPath) && reframeRisk) reasons.push("reframe-risk-pair");
  return reasons;
}

export function disputedFields(challengeCase, passA, passB) {
  const fieldsA = compoundFields(passA);
  const fieldsB = new Map(compoundFields(passB));
  const selected = new Map();
  for (const [fieldPath, candidateA] of fieldsA) {
    const candidateB = fieldsB.get(fieldPath);
    const conflict = !sameSemantic(fieldPath, candidateA, candidateB);
    const riskReasons = conflict ? ["a-b-semantic-conflict"] : directAgreementRisk(fieldPath, candidateA, challengeCase, passA, passB);
    if (conflict || riskReasons.length) selected.set(fieldPath, { triggerKind: conflict ? "semantic-conflict" : "high-risk-agreement", riskReasons });
  }
  const ensurePair = (left, right, reason) => {
    if (!selected.has(left) && !selected.has(right)) return;
    for (const fieldPath of [left, right]) if (!selected.has(fieldPath)) selected.set(fieldPath, { triggerKind: "dependency-companion", riskReasons: [reason] });
  };
  ensurePair("defect", "consequence", "diagnostic-dependency-companion");
  ensurePair("malformedDemand", "replacementDemand", "reframe-dependency-companion");
  return fieldsA.filter(([fieldPath]) => selected.has(fieldPath)).map(([fieldPath, candidateA]) => {
    const candidateB = fieldsB.get(fieldPath);
    const metadata = selected.get(fieldPath);
    return {
      fieldPath, ...metadata, question: decisionCard(fieldPath, challengeCase).positiveRule,
      card: decisionCard(fieldPath, challengeCase), candidateAJson: canonicalJson(candidateA), candidateBJson: canonicalJson(candidateB),
      candidateASemanticJson: canonicalJson(semanticValue(fieldPath, candidateA)), candidateBSemanticJson: canonicalJson(semanticValue(fieldPath, candidateB))
    };
  });
}

export function validateAdjudicatedValue(item, resolution, challengeCase, label) {
  const candidateA = parseCanonicalJson(item.candidateAJson, `${label}.candidateA`);
  const candidateB = parseCanonicalJson(item.candidateBJson, `${label}.candidateB`);
  const resolved = parseCanonicalJson(resolution.resolvedJson, `${label}.resolvedJson`);
  validateCompoundValue(item.fieldPath, resolved, challengeCase, label);
  if (item.triggerKind === "semantic-conflict") {
    assert(["A", "B"].includes(resolution.selection), `${label}: conflict must select A or B`);
    const selected = resolution.selection === "A" ? candidateA : candidateB;
    assert(canonicalJson(resolved) === canonicalJson(selected), `${label}: conflict resolution must copy the selected candidate exactly`);
  } else {
    assert(["retain", "override"].includes(resolution.selection), `${label}: risk agreement must retain or override`);
    assert(sameSemantic(item.fieldPath, candidateA, candidateB), `${label}: agreement candidates differ semantically`);
    if (resolution.selection === "retain") assert(sameSemantic(item.fieldPath, resolved, candidateA), `${label}: retain changed shared semantic value`);
    else assert(!sameSemantic(item.fieldPath, resolved, candidateA), `${label}: override did not change shared semantic value`);
  }
  return { candidateA, candidateB, resolved };
}

export {
  applyCompoundField, assert, canonicalEvidenceChoice, canonicalJson, compoundFields, defaultAnnotation,
  deriveDiagnostic, deriveReframe, derivedTuple, equal, isDefaultSemantic, parseCanonicalJson,
  passNonDefaultCounts, sameSemantic, scoringBands, semanticValue, sha256, validateAnnotation,
  validateCompoundValue
};
