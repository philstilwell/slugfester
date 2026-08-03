export const CONTACT_OPERATIONS = ["accepts", "denies", "distinguishes", "qualifies", "explains", "undermines"];
export const DEFECT_TYPES = ["none", "contradiction", "missing-premise", "ambiguity", "invalid-inference", "unsupported-comparison", "irrelevance", "evidential-insufficiency", "scope-mismatch", "attribution-error"];
export const OBJECT_CHANGE_TYPES = ["subject", "referent", "comparison-class", "baseline", "question-type"];
export const TARGET_SCOPE_RELATIONS = ["same", "narrowed", "strengthened", "modality-shift"];
export const TARGET_BURDEN_RELATIONS = ["retained", "reassigned", "replaced"];
export const IMPACT_MODES = ["none", "verdict", "inferential-consequence"];

export const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export function canonicalDiagnosticObject(value) {
  return value === null ? null : `${value.objectType}:${value.objectId}`;
}

export function canonicalOperations(values) {
  return [...values].map((item) => `${item.componentId}:${item.operation ?? "none"}`).sort();
}

export function canonicalBridges(values) {
  return [...values].map((item) => `${item.bridgeId}:${item.contactMode}`).sort();
}

export function deriveTargetDisposition(primitives) {
  return primitives.targetObjectRelation === "changed" || primitives.targetBurdenRelation !== "retained" ? "substituted" : "preserved";
}

export function deriveSubstitutionCause(primitives) {
  if (primitives.targetObjectRelation === "changed") return "object-change";
  if (primitives.targetBurdenRelation === "reassigned") return "burden-reassignment";
  if (primitives.targetBurdenRelation === "replaced") return "burden-replacement";
  return "none";
}

export function deriveCoverage(primitives) {
  if (deriveTargetDisposition(primitives) === "substituted") return "substitution";
  const contacted = primitives.componentOperations.filter((item) => item.operation !== null).length;
  if (contacted === primitives.componentOperations.length && contacted > 0) return "full";
  if (contacted > 0) return "partial";
  return primitives.relevantContraryMaterial ? "relevant-nonanswer" : "nonanswer";
}

export function deriveDiagnostic(primitives) {
  return primitives.defectType !== "none" && primitives.defectObject !== null && primitives.impactMode === "inferential-consequence";
}

export function deriveReframe(primitives) {
  return primitives.malformedDemandExplained === true && primitives.replacementDemandStated === true;
}

export function deriveBurdenRelation(challengeCase, contactedBridges) {
  const route = challengeCase.burdenContext.route;
  const packet = challengeCase.burdenContext.burdenPacket;
  if (packet.primaryRouteId === null || route === null) return "unadopted-or-irrelevant";
  if (contactedBridges.length === 0) return "topical-peripheral";
  const ranks = { subsidiary: 1, central: 2, motion: 3 };
  let highest = "subsidiary";
  for (const contact of contactedBridges) {
    const bridge = route.bridges.find((item) => item.id === contact.bridgeId);
    if (!bridge) throw new Error(`${challengeCase.caseId}: unknown bridge ${contact.bridgeId}`);
    if (ranks[bridge.tier] > ranks[highest]) highest = bridge.tier;
  }
  return highest === "motion" ? "completes" : highest === "central" ? "advances-central" : "advances-sub-burden";
}

const permittedComponentKinds = {
  contradiction: new Set(["inference", "conclusion"]),
  "missing-premise": new Set(["inference", "burden", "conclusion"]),
  ambiguity: new Set(["fact-premise", "rule-comparison", "inference", "burden", "modality", "conclusion"]),
  "invalid-inference": new Set(["inference", "conclusion"]),
  "unsupported-comparison": new Set(["rule-comparison", "inference", "conclusion"]),
  irrelevance: new Set(["burden", "conclusion"]),
  "evidential-insufficiency": new Set(["fact-premise", "inference", "conclusion"]),
  "scope-mismatch": new Set(["rule-comparison", "burden", "modality", "conclusion"]),
  "attribution-error": new Set(["fact-premise", "rule-comparison", "inference", "burden", "modality", "conclusion"]),
};

export function diagnosticObjectEligible(defectType, defectObject, targetPacket) {
  if (defectType === "none") return defectObject === null;
  if (!defectObject || !targetPacket) return false;
  if (defectObject.objectType === "target-packet") return defectObject.objectId === targetPacket.id;
  if (defectObject.objectType !== "target-component") return false;
  const component = targetPacket.indispensableComponents.find((item) => item.id === defectObject.objectId);
  return Boolean(component && permittedComponentKinds[defectType]?.has(component.kind));
}

export function cohenKappa(pairs) {
  if (pairs.length === 0) return null;
  const labels = [...new Set(pairs.flat())];
  const observed = pairs.filter(([left, right]) => left === right).length / pairs.length;
  let expected = 0;
  for (const label of labels) {
    const leftRate = pairs.filter(([left]) => left === label).length / pairs.length;
    const rightRate = pairs.filter(([, right]) => right === label).length / pairs.length;
    expected += leftRate * rightRate;
  }
  return expected === 1 ? null : (observed - expected) / (1 - expected);
}
