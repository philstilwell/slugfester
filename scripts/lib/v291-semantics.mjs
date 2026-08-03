export const DEFECT_TYPES = ["none", "attribution-error", "contradiction", "ambiguity", "scope-mismatch", "unsupported-comparison", "missing-premise", "invalid-inference", "evidential-insufficiency", "irrelevance"];
export const SCOPE_RELATIONS = ["same", "narrowed", "strengthened", "modality-shift"];
export const BURDEN_ADJUSTMENTS = ["retained", "reassigned", "replaced"];
export const BURDEN_TIERS = ["none", "subsidiary", "central", "motion"];
export const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
export function validateSpan(excerpt, span) {
  if (!span || !Number.isInteger(span.startChar) || !Number.isInteger(span.endChar)) return false;
  return span.startChar >= 0 && span.endChar > span.startChar && span.endChar <= excerpt.length && excerpt.slice(span.startChar, span.endChar) === span.text;
}
export const deriveTargetDisposition = (annotation) => annotation.originalTargetContact ? "preserved" : "unaddressed";
export function deriveCoverage(annotation) {
  const contacted = annotation.componentContacts.filter((item) => item.contacted).length;
  if (contacted === annotation.componentContacts.length && contacted > 0) return "full";
  if (contacted > 0) return "partial";
  return annotation.originalTargetContact || annotation.relevantContraryMaterial ? "relevant-nonanswer" : "nonanswer";
}
export const deriveDiagnostic = (annotation) => annotation.defectType !== "none" && annotation.consequenceStated === true;
export const deriveReframe = (annotation) => annotation.malformedDemandExplained === true && annotation.replacementDemandStated === true;
export function deriveBurdenRelevance(challengeCase, annotation) {
  const packet = challengeCase.burdenContext.burdenPacket;
  if (!challengeCase.burdenContext.route || packet.primaryRouteId === null) return "unadopted-or-irrelevant";
  if (annotation.burdenContact.tier === "none") return "topical-peripheral";
  if (annotation.burdenContact.tier === "subsidiary") return "advances-sub-burden";
  if (annotation.burdenContact.tier === "central") return "advances-central";
  return "completes";
}
export function derivedTuple(challengeCase, annotation) {
  return { targetDisposition: deriveTargetDisposition(annotation), scopeRelation: annotation.scopeRelation, burdenAdjustment: annotation.burdenAdjustment, coverage: deriveCoverage(annotation), diagnostic: deriveDiagnostic(annotation), reframe: deriveReframe(annotation), burdenRelevance: deriveBurdenRelevance(challengeCase, annotation) };
}
export function cohenKappa(pairs) {
  if (pairs.length === 0) return null;
  const labels = [...new Set(pairs.flat())];
  const observed = pairs.filter(([left, right]) => left === right).length / pairs.length;
  let expected = 0;
  for (const label of labels) expected += pairs.filter(([left]) => left === label).length / pairs.length * pairs.filter(([, right]) => right === label).length / pairs.length;
  return expected === 1 ? null : (observed - expected) / (1 - expected);
}

