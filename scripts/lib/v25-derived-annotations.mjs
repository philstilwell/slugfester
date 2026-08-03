export const COVERAGE_LABELS = ["not-applicable", "full", "partial", "relevant-nonanswer", "substitution"];
export const BURDEN_LABELS = ["completes", "advances-central", "advances-sub-burden", "topical-peripheral", "unadopted-or-irrelevant"];
export const DEFECT_TYPES = ["none", "contradiction", "missing-premise", "ambiguity", "invalid-inference", "unsupported-comparison", "other"];

export function deriveCoverage(move, primitives) {
  if (move.interactionMode === "constructive") return "not-applicable";
  if (primitives.targetPreserved !== true) return "substitution";
  const contacts = primitives.componentContacts.map((item) => item.contact);
  const addressed = contacts.filter((value) => value === "addressed").length;
  if (addressed === contacts.length && contacts.length > 0) return "full";
  if (addressed > 0) return "partial";
  return primitives.relevantContraryMaterial === true ? "relevant-nonanswer" : "substitution";
}

export function deriveDiagnostic(primitives) {
  return primitives.defectType !== "none" && primitives.defectEvidence !== null && primitives.targetImpactExplicit === true && primitives.targetImpactEvidence !== null;
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

export function canonicalComponentContacts(contacts) {
  return JSON.stringify([...contacts].map((item) => `${item.componentId}:${item.contact}`).sort());
}
