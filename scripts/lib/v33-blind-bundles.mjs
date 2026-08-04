import {
  applyCompoundField, assert, canonicalEvidenceChoice, canonicalJson, compoundFields, decisionCard, defaultAnnotation,
  deriveDiagnostic, deriveReframe, derivedTuple, equal, isDefaultSemantic, sameSemantic,
  scoringBands, semanticValue, sha256, validateAnnotation, validateCompoundValue
} from "./v32-risk-adjudication.mjs";

export const V33_WORKFLOW = "Slugfester Anonymous Bundled Adjudication Workflow v3.3";
export const V33_RUBRIC = "Slugfester Reassessment Rubric v3.3";
export const V33_MODELS = { terra: "5.6 Terra", sol: "5.6 Sol" };
export const V33_MODEL_SLUGS = { terra: "gpt-5.6-terra", sol: "gpt-5.6-sol" };
export const V33_ALLOWED_INPUTS = ["workflow.md", "rubric.md", "manual.md", "schema.json", "blind-packet.json"];

const DEFECTS = ["none", "attribution-error", "contradiction", "ambiguity", "scope-mismatch", "unsupported-comparison", "missing-premise", "invalid-inference", "evidential-insufficiency", "irrelevance"];
const SCOPES = ["same", "narrowed", "strengthened", "modality-shift"];
const BURDEN_ADJUSTMENTS = ["retained", "reassigned", "replaced"];
const TARGET_FIELDS = new Set(["targetContact", "connectedExample", "scope", "relevantContraryMaterial"]);

export function allowedSemanticValues(fieldPath, challengeCase) {
  if (["targetContact", "connectedExample", "relevantContraryMaterial", "consequence", "malformedDemand", "replacementDemand"].includes(fieldPath) || fieldPath.startsWith("componentContact.")) return [false, true];
  if (fieldPath === "scope") return SCOPES;
  if (fieldPath === "burdenAdjustment") return BURDEN_ADJUSTMENTS;
  if (fieldPath === "defect") return DEFECTS;
  if (fieldPath === "burdenContact") {
    const bridges = challengeCase.burdenContext.route?.bridges ?? [];
    return [{ tier: "none", bridgeId: null }, ...challengeCase.burdenContext.burdenPacket.eligibleBridgeIds.map((bridgeId) => {
      const bridge = bridges.find((item) => item.id === bridgeId);
      assert(bridge, `${challengeCase.caseId}: eligible bridge ${bridgeId} missing from route`);
      return { tier: bridge.tier, bridgeId };
    })];
  }
  throw new Error(`unknown semantic field ${fieldPath}`);
}

export function bundleKind(fieldPath) {
  if (TARGET_FIELDS.has(fieldPath) || fieldPath.startsWith("componentContact.")) return "targeting-coverage";
  if (["defect", "consequence"].includes(fieldPath)) return "diagnostic";
  if (["malformedDemand", "replacementDemand"].includes(fieldPath)) return "reframe";
  if (fieldPath === "burdenAdjustment") return "burden-adjustment";
  if (fieldPath === "burdenContact") return "burden-contact";
  throw new Error(`unknown bundle for ${fieldPath}`);
}

export function routedFields(challengeCase, annotationA, annotationB) {
  const fieldsB = new Map(compoundFields(annotationB));
  const selected = [];
  for (const [fieldPath, candidateA] of compoundFields(annotationA)) {
    const candidateB = fieldsB.get(fieldPath);
    const conflict = !sameSemantic(fieldPath, candidateA, candidateB);
    const fragile = TARGET_FIELDS.has(fieldPath) || fieldPath.startsWith("componentContact.") || ["defect", "consequence", "malformedDemand", "replacementDemand"].includes(fieldPath);
    if (conflict || fragile) selected.push({ fieldPath, conflict, candidateA, candidateB });
  }
  return selected;
}

export function decisionPacket(fieldPath, challengeCase, ordinal) {
  const card = decisionCard(fieldPath, challengeCase);
  return {
    decisionId: `${challengeCase.caseId}::${fieldPath}`,
    caseId: challengeCase.caseId,
    ordinal,
    fieldPath,
    question: card.positiveRule,
    defaultRule: card.default,
    nearMisses: card.nearMisses,
    allowedSemanticJson: allowedSemanticValues(fieldPath, challengeCase).map(canonicalJson),
    evidenceRule: "Return null for the default semantic value. Otherwise copy one exact, complete supporting substring from sourceExcerpt; offsets are computed later by deterministic code."
  };
}

export function compoundFromBlindDecision(fieldPath, semantic, evidenceText, challengeCase, label = fieldPath) {
  const allowed = allowedSemanticValues(fieldPath, challengeCase).map(canonicalJson);
  assert(allowed.includes(canonicalJson(semantic)), `${label}: semantic value is not allowed`);
  const probe = fieldPath === "burdenContact" ? { ...semantic, evidence: null } : { value: semantic, evidence: null };
  const isDefault = isDefaultSemantic(fieldPath, probe);
  assert(isDefault ? evidenceText === null : typeof evidenceText === "string" && evidenceText.length > 0, `${label}: evidence/default mismatch`);
  let evidence = null;
  if (!isDefault) {
    const startChar = challengeCase.sourceExcerpt.indexOf(evidenceText);
    assert(startChar >= 0, `${label}: evidenceText is not an exact sourceExcerpt substring`);
    evidence = { startChar, endChar: startChar + evidenceText.length, text: evidenceText };
  }
  const compound = fieldPath === "burdenContact" ? { ...semantic, evidence } : { value: semantic, evidence };
  validateCompoundValue(fieldPath, compound, challengeCase, label);
  return compound;
}

export function validateBlindAdjudication(adjudication, packet, modelKey) {
  const exactKeys = (value, keys, label) => assert(value && typeof value === "object" && !Array.isArray(value) && equal(Object.keys(value).sort(), [...keys].sort()), `${label}: keys differ`);
  exactKeys(adjudication, ["schemaVersion", "workflowVersion", "rubricVersion", "model", "debateId", "debateNumber", "isolationStatement", "bundles", "audit"], "adjudication");
  assert(adjudication.schemaVersion === "3.3-blind-bundle-adjudication", "adjudication schemaVersion invalid");
  assert(adjudication.workflowVersion === V33_WORKFLOW && adjudication.rubricVersion === V33_RUBRIC, "adjudication workflow/rubric invalid");
  assert(adjudication.model === V33_MODELS[modelKey], `adjudication model must be ${V33_MODELS[modelKey]}`);
  assert(adjudication.debateId === packet.debateId && adjudication.debateNumber === packet.debateNumber, "adjudication debate identity invalid");
  assert(typeof adjudication.isolationStatement === "string" && adjudication.isolationStatement.length >= 50, "isolationStatement too short");
  const packetBundles = packet.bundles;
  assert(Array.isArray(adjudication.bundles) && adjudication.bundles.length === packetBundles.length, "bundle count mismatch");
  const caseById = new Map(packet.cases.map((item) => [item.lockedCase.caseId, item.lockedCase]));
  const decisions = [];
  for (let bundleIndex = 0; bundleIndex < packetBundles.length; bundleIndex += 1) {
    const expectedBundle = packetBundles[bundleIndex], actualBundle = adjudication.bundles[bundleIndex];
    exactKeys(actualBundle, ["bundleId", "decisions"], `${expectedBundle.bundleId}.bundle`);
    assert(actualBundle.bundleId === expectedBundle.bundleId, `${expectedBundle.bundleId}: bundle order/id mismatch`);
    assert(Array.isArray(actualBundle.decisions) && actualBundle.decisions.length === expectedBundle.decisions.length, `${expectedBundle.bundleId}: decision count mismatch`);
    for (let index = 0; index < expectedBundle.decisions.length; index += 1) {
      const expected = expectedBundle.decisions[index], actual = actualBundle.decisions[index];
      const label = `${expected.decisionId}`;
      exactKeys(actual, ["decisionId", "fieldPath", "semanticJson", "evidenceText", "rationale"], label);
      assert(actual.decisionId === expected.decisionId && actual.fieldPath === expected.fieldPath, `${label}: decision identity/order mismatch`);
      assert(expected.allowedSemanticJson.includes(actual.semanticJson), `${label}: semanticJson not allowlisted or not canonical`);
      assert(typeof actual.rationale === "string" && actual.rationale.trim().length >= 20, `${label}: rationale too short`);
      const semantic = JSON.parse(actual.semanticJson);
      const compound = compoundFromBlindDecision(actual.fieldPath, semantic, actual.evidenceText, caseById.get(expected.caseId), label);
      decisions.push({ ...actual, caseId: expected.caseId, bundleId: expectedBundle.bundleId, compound });
    }
  }
  assert(adjudication.audit?.bundleCount === packet.bundleCount && adjudication.audit?.decisionCount === packet.decisionCount, "adjudication audit counts invalid");
  exactKeys(adjudication.audit, ["bundleCount", "decisionCount", "allDecisionsMadeOnce", "candidateDataSeen", "scoresSeen"], "adjudication.audit");
  assert(adjudication.audit?.allDecisionsMadeOnce === true && adjudication.audit?.candidateDataSeen === false && adjudication.audit?.scoresSeen === false, "adjudication isolation audit invalid");
  assert(new Set(decisions.map((item) => item.decisionId)).size === decisions.length, "duplicate decisionId");
  return decisions;
}

export function validateBundledAnnotation(annotation, challengeCase, label) {
  validateAnnotation(annotation, challengeCase, label);
  return annotation;
}

export {
  applyCompoundField, assert, canonicalEvidenceChoice, canonicalJson, compoundFields, defaultAnnotation, deriveDiagnostic,
  deriveReframe, derivedTuple, equal, sameSemantic, scoringBands, semanticValue, sha256,
  validateAnnotation
};
