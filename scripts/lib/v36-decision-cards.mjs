import { defaultAnnotation } from "./v31-verification.mjs";
import { canonicalJson } from "./v34-conservative-review.mjs";
import { assert, projectAnnotation, sameSemantic, sha256 } from "./v35-semantic-compiler.mjs";

export const V36_WORKFLOW = "Slugfester Targeted Decision-Card Workflow v3.6";
export const V36_RUBRIC = "Slugfester Reassessment Rubric v3.6";
export const V36_SCHEMA_VERSION = "3.6-decision-card";

const CONTACT_MODES = new Set(["none", "exact-proposition", "explicit-global-assent", "denial", "restriction", "distinction", "explanation", "warrant-challenge"]);
const EXAMPLE_CLASSES = new Set(["none", "inside-locked-target", "distinct-connected-example"]);
const CONTRARY_CLASSES = new Set(["none", "component-contact-precludes-contrary", "relevant-no-component"]);
const SCOPES = new Set(["same", "narrowed", "strengthened", "modality-shift"]);
const DEFECTS = new Set(["none", "attribution-error", "contradiction", "ambiguity", "scope-mismatch", "unsupported-comparison", "missing-premise", "invalid-inference", "evidential-insufficiency", "irrelevance"]);
const DIAGNOSTIC_RELATIONS = new Set(["none", "because", "therefore", "contrastive", "explicit-negation", "scope-limitation"]);
const REFRAME_RELATIONS = new Set(["none", "because", "contrastive", "instead", "rather-than"]);
const BURDEN_QUALIFIERS = new Set(["default-retained", "default-no-contact", "explicit-reassignment", "explicit-replacement", "eligible-bridge-support", "eligible-bridge-attack", "insufficient"]);
const RELATION_PATTERNS = {
  because: /\bbecause\b/i,
  therefore: /\b(therefore|thus|so)\b/i,
  contrastive: /\b(but|yet)\b/i,
  "explicit-negation": /\b(not|cannot|can't|does not|doesn't)\b/i,
  "scope-limitation": /\b(only|at most|at least|limited|scope)\b/i,
  instead: /\binstead\b/i,
  "rather-than": /\brather than\b/i
};

function exactKeys(value, keys, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  assert(canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort()), `${label}: keys differ`);
}

function rationale(value, label) {
  assert(typeof value === "string" && value.trim().length >= 60, `${label}: rationale too short`);
}

function evidenceText(value, excerpt, required, label) {
  if (!required) {
    assert(value === null, `${label}: inactive evidence must be null`);
    return null;
  }
  assert(typeof value === "string" && value.length > 0, `${label}: active evidence text missing`);
  const startChar = excerpt.indexOf(value);
  assert(startChar >= 0, `${label}: evidence text absent from sourceExcerpt`);
  assert(excerpt.indexOf(value, startChar + 1) === -1, `${label}: evidence text is not unique in sourceExcerpt`);
  return { startChar, endChar: startChar + value.length, text: value };
}

function cardIdentity(card, challengeCase, family) {
  assert(card.schemaVersion === V36_SCHEMA_VERSION && card.family === family, `${challengeCase.caseId}.${family}: card identity invalid`);
  assert(card.caseId === challengeCase.caseId && card.moveId === challengeCase.moveId, `${challengeCase.caseId}.${family}: case identity mismatch`);
  rationale(card.rationale, `${challengeCase.caseId}.${family}`);
}

function relationEnvelope(relation, spans, maximumLength, label) {
  assert(relation.endChar - relation.startChar <= maximumLength, `${label}: relation text exceeds ${maximumLength} characters`);
  const minimum = Math.min(...spans.map((span) => span.startChar));
  const maximum = Math.max(...spans.map((span) => span.endChar));
  assert(relation.startChar <= minimum && relation.endChar >= maximum, `${label}: relation text must contain every active cue`);
}

function validateRelationCue(kind, link, relation, allowed, label) {
  assert(allowed.has(kind) && kind !== "none", `${label}: relation kind invalid or inactive`);
  assert(link.startChar >= relation.startChar && link.endChar <= relation.endChar, `${label}: link cue lies outside relation text`);
  assert(RELATION_PATTERNS[kind].test(link.text), `${label}: link cue does not express ${kind}`);
}

export function validateTargetCard(card, challengeCase) {
  exactKeys(card, ["schemaVersion", "family", "caseId", "moveId", "directTarget", "components", "example", "scope", "contrary", "rationale"], "targetCard");
  cardIdentity(card, challengeCase, "target-component-example");
  const excerpt = challengeCase.sourceExcerpt;
  exactKeys(card.directTarget, ["contact", "evidenceText"], `${card.caseId}.directTarget`);
  assert(typeof card.directTarget.contact === "boolean", `${card.caseId}: direct target contact invalid`);
  const directEvidence = evidenceText(card.directTarget.evidenceText, excerpt, card.directTarget.contact, `${card.caseId}.directTarget.evidenceText`);

  const expectedComponents = challengeCase.targetPacket.indispensableComponents;
  assert(Array.isArray(card.components) && card.components.length === expectedComponents.length, `${card.caseId}: component count mismatch`);
  const componentContacts = card.components.map((component, index) => {
    exactKeys(component, ["componentId", "contactMode", "evidenceText", "licenseText"], `${card.caseId}.components[${index}]`);
    assert(component.componentId === expectedComponents[index].id && CONTACT_MODES.has(component.contactMode), `${card.caseId}.components[${index}]: identity or mode invalid`);
    const contacted = component.contactMode !== "none";
    const evidence = evidenceText(component.evidenceText, excerpt, contacted, `${card.caseId}.${component.componentId}.evidenceText`);
    evidenceText(component.licenseText, excerpt, component.contactMode === "explicit-global-assent", `${card.caseId}.${component.componentId}.licenseText`);
    return { componentId: component.componentId, contacted, evidence };
  });
  const anyComponent = componentContacts.some((item) => item.contacted);

  exactKeys(card.example, ["classification", "evidenceText"], `${card.caseId}.example`);
  assert(EXAMPLE_CLASSES.has(card.example.classification), `${card.caseId}: example classification invalid`);
  const exampleActive = card.example.classification !== "none";
  const exampleEvidence = evidenceText(card.example.evidenceText, excerpt, exampleActive, `${card.caseId}.example.evidenceText`);

  exactKeys(card.scope, ["relation", "evidenceText"], `${card.caseId}.scope`);
  assert(SCOPES.has(card.scope.relation), `${card.caseId}: scope relation invalid`);
  const scopeEvidence = evidenceText(card.scope.evidenceText, excerpt, card.scope.relation !== "same", `${card.caseId}.scope.evidenceText`);

  exactKeys(card.contrary, ["classification", "evidenceText"], `${card.caseId}.contrary`);
  assert(CONTRARY_CLASSES.has(card.contrary.classification), `${card.caseId}: contrary classification invalid`);
  const relevantContrary = card.contrary.classification === "relevant-no-component";
  const contraryEvidence = evidenceText(card.contrary.evidenceText, excerpt, relevantContrary, `${card.caseId}.contrary.evidenceText`);
  if (relevantContrary) assert(!anyComponent, `${card.caseId}: relevant contrary material contacts a component`);
  if (card.contrary.classification === "component-contact-precludes-contrary") assert(anyComponent, `${card.caseId}: contrary exclusion lacks component contact`);
  if (card.contrary.classification === "none") assert(!anyComponent, `${card.caseId}: component contact requires contrary exclusion classification`);

  const proposal = defaultAnnotation(challengeCase);
  proposal.originalTargetContact = card.directTarget.contact;
  proposal.targetEvidence = directEvidence;
  proposal.componentContacts = componentContacts;
  proposal.connectedExample = card.example.classification === "distinct-connected-example";
  proposal.connectionEvidence = proposal.connectedExample ? exampleEvidence : null;
  proposal.scopeRelation = card.scope.relation;
  proposal.scopeEvidence = scopeEvidence;
  proposal.relevantContraryMaterial = relevantContrary;
  proposal.contraryEvidence = contraryEvidence;
  const compiled = projectAnnotation(proposal, challengeCase, undefined, "The v3.6 target decision card is compiled from exact evidence text and mechanically coupled semantic fields.");
  return { annotation: compiled.annotation, exampleClassification: card.example.classification, boundaryEvidence: card.example.classification === "inside-locked-target" ? exampleEvidence : null, compilerAudit: compiled.audit };
}

export function validateDiagnosticCard(card, challengeCase) {
  exactKeys(card, ["schemaVersion", "family", "caseId", "moveId", "defect", "consequence", "rationale"], "diagnosticCard");
  cardIdentity(card, challengeCase, "diagnostic");
  exactKeys(card.defect, ["cueText", "type"], `${card.caseId}.defect`);
  assert(DEFECTS.has(card.defect.type), `${card.caseId}: defect type invalid`);
  const defectActive = card.defect.type !== "none";
  const defectCue = evidenceText(card.defect.cueText, challengeCase.sourceExcerpt, defectActive, `${card.caseId}.defect.cueText`);

  exactKeys(card.consequence, ["cueText", "linkCueText", "relationText", "relationKind"], `${card.caseId}.consequence`);
  assert(DIAGNOSTIC_RELATIONS.has(card.consequence.relationKind), `${card.caseId}: diagnostic relation kind invalid`);
  const consequenceActive = card.consequence.cueText !== null;
  if (!consequenceActive) {
    evidenceText(card.consequence.cueText, challengeCase.sourceExcerpt, false, `${card.caseId}.consequence.cueText`);
    evidenceText(card.consequence.linkCueText, challengeCase.sourceExcerpt, false, `${card.caseId}.consequence.linkCueText`);
    evidenceText(card.consequence.relationText, challengeCase.sourceExcerpt, false, `${card.caseId}.consequence.relationText`);
    assert(card.consequence.relationKind === "none", `${card.caseId}: inactive consequence relation kind must be none`);
    return { defectType: card.defect.type, defectCue, consequenceStated: false, consequenceCue: null, linkCue: null, relationEvidence: null, relationKind: "none" };
  }
  assert(defectActive, `${card.caseId}: consequence requires a non-none defect`);
  const consequenceCue = evidenceText(card.consequence.cueText, challengeCase.sourceExcerpt, true, `${card.caseId}.consequence.cueText`);
  assert(defectCue.startChar !== consequenceCue.startChar || defectCue.endChar !== consequenceCue.endChar, `${card.caseId}: defect and consequence cues must be distinct`);
  const linkCue = evidenceText(card.consequence.linkCueText, challengeCase.sourceExcerpt, true, `${card.caseId}.consequence.linkCueText`);
  const relationEvidence = evidenceText(card.consequence.relationText, challengeCase.sourceExcerpt, true, `${card.caseId}.consequence.relationText`);
  relationEnvelope(relationEvidence, [defectCue, consequenceCue], 320, `${card.caseId}.consequence`);
  validateRelationCue(card.consequence.relationKind, linkCue, relationEvidence, DIAGNOSTIC_RELATIONS, `${card.caseId}.consequence`);
  return { defectType: card.defect.type, defectCue, consequenceStated: true, consequenceCue, linkCue, relationEvidence, relationKind: card.consequence.relationKind };
}

export function validateReframeCard(card, challengeCase) {
  exactKeys(card, ["schemaVersion", "family", "caseId", "moveId", "malformedCueText", "replacementCueText", "linkCueText", "relationText", "relationKind", "rationale"], "reframeCard");
  cardIdentity(card, challengeCase, "reframe");
  assert(REFRAME_RELATIONS.has(card.relationKind), `${card.caseId}: reframe relation kind invalid`);
  const malformedActive = card.malformedCueText !== null, replacementActive = card.replacementCueText !== null;
  const malformedCue = evidenceText(card.malformedCueText, challengeCase.sourceExcerpt, malformedActive, `${card.caseId}.malformedCueText`);
  const replacementCue = evidenceText(card.replacementCueText, challengeCase.sourceExcerpt, replacementActive, `${card.caseId}.replacementCueText`);
  if (!(malformedActive && replacementActive)) {
    evidenceText(card.linkCueText, challengeCase.sourceExcerpt, false, `${card.caseId}.linkCueText`);
    evidenceText(card.relationText, challengeCase.sourceExcerpt, false, `${card.caseId}.relationText`);
    assert(card.relationKind === "none", `${card.caseId}: incomplete reframe relation must be none`);
    return { malformedDemandExplained: malformedActive, malformedDemandCue: malformedCue, replacementDemandStated: replacementActive, replacementDemandCue: replacementCue, linkCue: null, relationEvidence: null, relationKind: "none" };
  }
  const linkCue = evidenceText(card.linkCueText, challengeCase.sourceExcerpt, true, `${card.caseId}.linkCueText`);
  const relationEvidence = evidenceText(card.relationText, challengeCase.sourceExcerpt, true, `${card.caseId}.relationText`);
  relationEnvelope(relationEvidence, [malformedCue, replacementCue], 400, `${card.caseId}.reframe`);
  validateRelationCue(card.relationKind, linkCue, relationEvidence, REFRAME_RELATIONS, `${card.caseId}.reframe`);
  return { malformedDemandExplained: true, malformedDemandCue: malformedCue, replacementDemandStated: true, replacementDemandCue: replacementCue, linkCue, relationEvidence, relationKind: card.relationKind };
}

export function validateBurdenConflictCard(card, packet) {
  exactKeys(card, ["schemaVersion", "family", "caseId", "moveId", "fieldPath", "candidateSelection", "qualifyingCue", "evidenceText", "rationale"], "burdenConflictCard");
  const challengeCase = packet.challengeCase;
  cardIdentity(card, challengeCase, "burden-conflict");
  assert(["burdenAdjustment", "burdenContact"].includes(card.fieldPath) && card.fieldPath === packet.fieldPath, `${card.caseId}: burden field path invalid`);
  assert(!sameSemantic(card.fieldPath, packet.candidate1, packet.candidate2), `${card.caseId}: burden packet candidates do not disagree`);
  assert(["candidate-1", "candidate-2", "neither"].includes(card.candidateSelection) && BURDEN_QUALIFIERS.has(card.qualifyingCue), `${card.caseId}: burden selection or qualifier invalid`);
  if (card.candidateSelection === "neither") {
    evidenceText(card.evidenceText, challengeCase.sourceExcerpt, false, `${card.caseId}.evidenceText`);
    assert(card.qualifyingCue === "insufficient", `${card.caseId}: neither requires insufficient qualifier`);
    return { selected: null, unresolved: true };
  }
  const selected = structuredClone(card.candidateSelection === "candidate-1" ? packet.candidate1 : packet.candidate2);
  if (card.fieldPath === "burdenAdjustment") {
    const value = selected.value;
    if (value === "retained") {
      evidenceText(card.evidenceText, challengeCase.sourceExcerpt, false, `${card.caseId}.evidenceText`);
      assert(card.qualifyingCue === "default-retained", `${card.caseId}: retained candidate requires default qualifier`);
      selected.evidence = null;
    } else {
      selected.evidence = evidenceText(card.evidenceText, challengeCase.sourceExcerpt, true, `${card.caseId}.evidenceText`);
      assert(card.qualifyingCue === (value === "reassigned" ? "explicit-reassignment" : "explicit-replacement"), `${card.caseId}: burden-adjustment qualifier mismatch`);
    }
  } else if (selected.tier === "none") {
    evidenceText(card.evidenceText, challengeCase.sourceExcerpt, false, `${card.caseId}.evidenceText`);
    assert(selected.bridgeId === null && card.qualifyingCue === "default-no-contact", `${card.caseId}: no-contact candidate invalid`);
    selected.evidence = null;
  } else {
    const bridge = challengeCase.burdenContext.route?.bridges.find((item) => item.id === selected.bridgeId);
    assert(challengeCase.burdenContext.burdenPacket.eligibleBridgeIds.includes(selected.bridgeId) && bridge?.tier === selected.tier, `${card.caseId}: selected burden bridge is ineligible`);
    assert(["eligible-bridge-support", "eligible-bridge-attack"].includes(card.qualifyingCue), `${card.caseId}: nondefault bridge qualifier invalid`);
    selected.evidence = evidenceText(card.evidenceText, challengeCase.sourceExcerpt, true, `${card.caseId}.evidenceText`);
  }
  return { selected, unresolved: false };
}

export function validateClosedSchema(schema, label = schema?.$id ?? "schema") {
  function visit(node, nodePath) {
    assert(node && typeof node === "object" && !Array.isArray(node), `${nodePath}: schema node invalid`);
    if (node.anyOf) {
      assert(Array.isArray(node.anyOf) && node.anyOf.length > 0, `${nodePath}: anyOf invalid`);
      node.anyOf.forEach((item, index) => visit(item, `${nodePath}.anyOf[${index}]`));
      return;
    }
    assert(typeof node.type === "string", `${nodePath}: explicit type missing`);
    if (node.type === "object") {
      assert(node.additionalProperties === false && node.properties && typeof node.properties === "object", `${nodePath}: object schema must be closed`);
      assert(canonicalJson([...node.required].sort()) === canonicalJson(Object.keys(node.properties).sort()), `${nodePath}: every property must be required`);
      for (const [key, child] of Object.entries(node.properties)) visit(child, `${nodePath}.${key}`);
    }
    if (node.type === "array") visit(node.items, `${nodePath}.items`);
  }
  visit(schema, label);
  return schema;
}

export function validateSchemaValue(schema, value, label = "value") {
  if (schema.anyOf) {
    const matches = schema.anyOf.filter((candidate) => {
      try { validateSchemaValue(candidate, value, label); return true; } catch { return false; }
    });
    assert(matches.length === 1, `${label}: value must match exactly one anyOf branch`);
    return value;
  }
  const typeMatches = {
    null: value === null,
    string: typeof value === "string",
    boolean: typeof value === "boolean",
    integer: Number.isInteger(value),
    number: typeof value === "number" && Number.isFinite(value),
    object: value && typeof value === "object" && !Array.isArray(value),
    array: Array.isArray(value)
  };
  assert(typeMatches[schema.type], `${label}: expected ${schema.type}`);
  if (Object.hasOwn(schema, "const")) assert(value === schema.const, `${label}: const mismatch`);
  if (schema.enum) assert(schema.enum.includes(value), `${label}: enum mismatch`);
  if (schema.type === "object") {
    const keys = Object.keys(value);
    for (const required of schema.required) assert(Object.hasOwn(value, required), `${label}.${required}: required property missing`);
    if (schema.additionalProperties === false) for (const key of keys) assert(Object.hasOwn(schema.properties, key), `${label}.${key}: additional property prohibited`);
    for (const [key, child] of Object.entries(schema.properties)) if (Object.hasOwn(value, key)) validateSchemaValue(child, value[key], `${label}.${key}`);
  }
  if (schema.type === "array") value.forEach((item, index) => validateSchemaValue(schema.items, item, `${label}[${index}]`));
  return value;
}

export { assert, canonicalJson, sha256 };
