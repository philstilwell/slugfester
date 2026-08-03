export const COVERAGE_LABELS = ["not-applicable", "full", "partial", "relevant-nonanswer", "nonanswer", "substitution"];
export const BURDEN_LABELS = ["completes", "advances-central", "advances-sub-burden", "topical-peripheral", "unadopted-or-irrelevant"];
export const DEFECT_TYPES = ["none", "contradiction", "missing-premise", "ambiguity", "invalid-inference", "unsupported-comparison", "irrelevance", "evidential-insufficiency", "scope-mismatch", "attribution-error"];
export const COMPONENT_KINDS = ["fact-premise", "rule-comparison", "inference", "burden", "modality", "conclusion"];
export const CONTACT_OPERATIONS = ["accepts", "denies", "distinguishes", "qualifies", "explains", "undermines"];
export const TARGET_OBJECT_RELATIONS = ["not-applicable", "same", "changed"];
export const TARGET_SCOPE_RELATIONS = ["not-applicable", "same", "narrowed", "strengthened", "modality-shift"];
export const TARGET_BURDEN_RELATIONS = ["not-applicable", "retained", "reassigned", "replaced"];
export const OBJECT_CHANGE_TYPES = ["subject", "referent", "comparison-class", "baseline", "question-type"];
export const IMPACT_MODES = ["not-applicable", "none", "verdict", "inferential-consequence"];
export const DIAGNOSTIC_OBJECT_TYPES = ["target-packet", "target-component"];

export function deriveComponentContact(operation) {
  return operation === null ? "not-addressed" : "addressed";
}

export function deriveTargetDisposition(move, primitives) {
  if (move.interactionMode === "constructive") return "not-applicable";
  return primitives.targetObjectRelation === "changed" || ["reassigned", "replaced"].includes(primitives.targetBurdenRelation) ? "substituted" : "preserved";
}

export function deriveCoverage(move, primitives) {
  if (move.interactionMode === "constructive") return "not-applicable";
  if (deriveTargetDisposition(move, primitives) === "substituted") return "substitution";
  const contacts = primitives.componentOperations.map((item) => deriveComponentContact(item.operation));
  const addressed = contacts.filter((value) => value === "addressed").length;
  if (addressed === contacts.length && contacts.length > 0) return "full";
  if (addressed > 0) return "partial";
  return primitives.relevantContraryMaterial === true ? "relevant-nonanswer" : "nonanswer";
}

export function deriveDiagnostic(move, primitives) {
  if (move.interactionMode === "constructive") return false;
  return primitives.defectType !== "none" && primitives.defectObject !== null && primitives.defectEvidence !== null && primitives.impactMode === "inferential-consequence" && primitives.impactEvidence !== null;
}

export function deriveReframe(primitives) {
  return primitives.malformedDemandExplained === true && primitives.malformedDemandEvidence !== null && primitives.replacementDemandStated === true && primitives.replacementDemandEvidence !== null;
}

export function deriveBurdenRelation(inventory, move, primitives) {
  const routeId = move.burdenPacket.primaryRouteId;
  if (routeId === null) return "unadopted-or-irrelevant";
  if (primitives.contactedBridges.length === 0) return "topical-peripheral";
  const route = inventory.burdenRoutes.find((item) => item.id === routeId);
  if (!route) throw new Error(`${move.moveId}: unknown burden route ${routeId}`);
  const tierRank = { subsidiary: 1, central: 2, motion: 3 };
  const highest = primitives.contactedBridges.reduce((best, contact) => {
    const bridge = route.bridges.find((item) => item.id === contact.bridgeId);
    if (!bridge) throw new Error(`${move.moveId}: unknown bridge ${contact.bridgeId}`);
    return tierRank[bridge.tier] > tierRank[best] ? bridge.tier : best;
  }, "subsidiary");
  return highest === "motion" ? "completes" : highest === "central" ? "advances-central" : "advances-sub-burden";
}

export function evidenceMatches(excerpt, evidence) {
  if (evidence === null) return true;
  return Number.isInteger(evidence.startChar) && Number.isInteger(evidence.endChar) && evidence.startChar >= 0 && evidence.endChar > evidence.startChar && excerpt.slice(evidence.startChar, evidence.endChar) === evidence.text;
}

export function canonicalBridgeSet(contacts) {
  return JSON.stringify([...contacts].map((item) => `${item.bridgeId}:${item.contactMode}`).sort());
}

export function canonicalOperationSet(operations) {
  return JSON.stringify([...operations].map((item) => `${item.componentId}:${item.operation ?? "none"}`).sort());
}

export function validateComponentGraph(components) {
  const ids = new Set(); const texts = new Set(); const errors = [];
  for (const component of components) {
    const normalized = component.text.replace(/\s+/gu, " ").trim().toLowerCase();
    if (ids.has(component.id)) errors.push(`duplicate component id ${component.id}`);
    if (texts.has(normalized)) errors.push(`duplicate component text ${component.id}`);
    ids.add(component.id); texts.add(normalized);
  }
  for (const component of components) for (const dependency of component.dependsOn) {
    if (!ids.has(dependency)) errors.push(`${component.id} depends on unknown ${dependency}`);
    if (dependency === component.id) errors.push(`${component.id} depends on itself`);
  }
  const byId = new Map(components.map((component) => [component.id, component])); const visiting = new Set(); const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) { errors.push(`component dependency cycle at ${id}`); return; }
    if (visited.has(id) || !byId.has(id)) return;
    visiting.add(id); for (const dependency of byId.get(id).dependsOn) visit(dependency); visiting.delete(id); visited.add(id);
  }
  for (const id of ids) visit(id);
  for (const component of components) if (["inference", "conclusion"].includes(component.kind) && component.dependsOn.length === 0) errors.push(`${component.id} ${component.kind} has no dependency`);
  return [...new Set(errors)];
}
