import {
  applyCompoundField,
  assert,
  canonicalEvidenceChoice,
  canonicalJson,
  compoundFields,
  derivedTuple,
  sameSemantic,
  semanticValue,
  sha256,
  validateAnnotation
} from "./v34-conservative-review.mjs";

export const V35_WORKFLOW = "Slugfester Deterministic Semantic Compiler Workflow v3.5";
export const V35_RUBRIC = "Slugfester Reassessment Rubric v3.5";
export const V35_REVIEW_MODELS = { terra: "5.6 Terra", sol: "5.6 Sol" };
export const V35_THIRD_VALUE_FIELDS = new Set(["scope"]);
export const V35_SHARED_OVERRIDE_FIELDS = new Set([
  "targetContact", "connectedExample", "scope", "relevantContraryMaterial",
  "malformedDemand", "replacementDemand", "diagnosticBundle"
]);

const SCOPES = new Set(["same", "narrowed", "strengthened", "modality-shift"]);
const BURDEN_ADJUSTMENTS = new Set(["retained", "reassigned", "replaced"]);
const DEFECTS = new Set(["none", "attribution-error", "contradiction", "ambiguity", "scope-mismatch", "unsupported-comparison", "missing-premise", "invalid-inference", "evidential-insufficiency", "irrelevance"]);
const EXAMPLE_CLASSES = new Set(["none", "inside-locked-target", "distinct-connected-example"]);
const CONTACT_MODES = new Set(["none", "exact-proposition", "explicit-global-assent", "denial", "restriction", "distinction", "explanation", "warrant-challenge"]);
const BURDEN_TIERS = new Set(["none", "subsidiary", "central", "motion"]);

function newAudit() {
  return {
    evidenceTextsResolved: 0,
    offsetsDerived: 0,
    inactiveEvidenceDiscarded: 0,
    projectionChanges: [],
    discretionaryRepairs: 0,
    fallbacks: 0
  };
}

function exactEvidence(raw, excerpt, required, label, audit) {
  if (!required) {
    if (raw !== null && raw !== undefined) audit.inactiveEvidenceDiscarded += 1;
    return null;
  }
  const evidenceText = typeof raw === "string" ? raw : raw?.text;
  assert(typeof evidenceText === "string" && evidenceText.length > 0, `${label}: active evidence text missing`);
  const startChar = excerpt.indexOf(evidenceText);
  assert(startChar >= 0, `${label}: evidence text absent from sourceExcerpt`);
  assert(excerpt.indexOf(evidenceText, startChar + 1) === -1, `${label}: evidence text is not unique in sourceExcerpt`);
  audit.evidenceTextsResolved += 1;
  audit.offsetsDerived += 1;
  return { startChar, endChar: startChar + evidenceText.length, text: evidenceText };
}

function chooseEvidence(candidates, label) {
  const usable = candidates.filter((item) => item && typeof item.text === "string");
  assert(usable.length > 0, `${label}: derived positive lacks evidence`);
  return structuredClone(usable.sort((left, right) =>
    left.text.length - right.text.length ||
    left.startChar - right.startChar ||
    left.endChar - right.endChar ||
    canonicalJson(left).localeCompare(canonicalJson(right))
  )[0]);
}

function recordProjection(audit, fieldPath, from, to, rule) {
  if (canonicalJson(from) !== canonicalJson(to)) audit.projectionChanges.push({ fieldPath, from, to, rule });
}

export function projectAnnotation(proposal, challengeCase, audit = newAudit(), rationale = "The v3.5 compiler derives coupled fields mechanically from validated semantic proposals and exact evidence text.") {
  const annotation = structuredClone(proposal);
  const anyComponent = annotation.componentContacts.some((item) => item.contacted);
  const targetReasons = [
    annotation.originalTargetContact ? annotation.targetEvidence : null,
    ...annotation.componentContacts.filter((item) => item.contacted).map((item) => item.evidence),
    annotation.relevantContraryMaterial ? annotation.contraryEvidence : null,
    annotation.scopeRelation !== "same" ? annotation.scopeEvidence : null,
    annotation.defectType !== "none" ? annotation.defectCue : null
  ].filter(Boolean);
  const derivedTarget = targetReasons.length > 0;
  recordProjection(audit, "originalTargetContact", annotation.originalTargetContact, derivedTarget, "positive-target-bearing-proposal");
  annotation.originalTargetContact = derivedTarget;
  annotation.targetEvidence = derivedTarget ? chooseEvidence(targetReasons, `${annotation.caseId}.targetEvidence`) : null;

  if (anyComponent && annotation.relevantContraryMaterial) {
    recordProjection(audit, "relevantContraryMaterial", true, false, "component-contact-precludes-contrary");
    annotation.relevantContraryMaterial = false;
    annotation.contraryEvidence = null;
  } else if (!annotation.relevantContraryMaterial) annotation.contraryEvidence = null;

  if (annotation.defectType === "none" && annotation.consequenceStated) {
    recordProjection(audit, "consequenceStated", true, false, "none-defect-precludes-consequence");
    annotation.consequenceStated = false;
    annotation.consequenceCue = null;
  } else if (!annotation.consequenceStated) annotation.consequenceCue = null;

  if (!annotation.connectedExample) annotation.connectionEvidence = null;
  if (annotation.scopeRelation === "same") annotation.scopeEvidence = null;
  if (annotation.burdenAdjustment === "retained") annotation.burdenEvidence = null;
  if (!annotation.malformedDemandExplained) annotation.malformedDemandCue = null;
  if (!annotation.replacementDemandStated) annotation.replacementDemandCue = null;
  for (const component of annotation.componentContacts) if (!component.contacted) component.evidence = null;
  if (annotation.defectType === "none") annotation.defectCue = null;
  if (annotation.burdenContact.tier === "none") annotation.burdenContact = { tier: "none", bridgeId: null, evidence: null };
  annotation.rationale = rationale;
  validateAnnotation(annotation, challengeCase, `${annotation.caseId}.compiled`);
  return { annotation, audit, derived: derivedTuple(challengeCase, annotation) };
}

export function compileCaseReview(review, challengeCase) {
  const audit = newAudit();
  assert(review.caseId === challengeCase.caseId && review.moveId === challengeCase.moveId, `${review.caseId}: identity mismatch`);
  assert(EXAMPLE_CLASSES.has(review.exampleClassification), `${review.caseId}: invalid example classification`);
  assert(SCOPES.has(review.scopeRelation) && BURDEN_ADJUSTMENTS.has(review.burdenAdjustment) && DEFECTS.has(review.defectType), `${review.caseId}: invalid enum`);
  assert(typeof review.originalTargetContact === "boolean" && typeof review.connectedExample === "boolean", `${review.caseId}: invalid target booleans`);
  assert(review.connectedExample === (review.exampleClassification === "distinct-connected-example"), `${review.caseId}: duplicate connected-example field conflicts with classification`);

  const excerpt = challengeCase.sourceExcerpt;
  const expectedComponents = challengeCase.targetPacket.indispensableComponents;
  assert(Array.isArray(review.componentReviews) && review.componentReviews.length === expectedComponents.length, `${review.caseId}: component count mismatch`);
  const componentContacts = review.componentReviews.map((component, index) => {
    const expected = expectedComponents[index];
    assert(component.componentId === expected.id && CONTACT_MODES.has(component.contactMode), `${review.caseId}: component identity or mode invalid`);
    const contacted = component.contactMode !== "none";
    assert(component.contacted === contacted, `${review.caseId}.${component.componentId}: duplicate contact field conflicts with mode`);
    if (component.contactMode === "explicit-global-assent") exactEvidence(component.licenseText, excerpt, true, `${review.caseId}.${component.componentId}.licenseText`, audit);
    else exactEvidence(component.licenseText, excerpt, false, `${review.caseId}.${component.componentId}.licenseText`, audit);
    return { componentId: component.componentId, contacted, evidence: exactEvidence(component.evidence, excerpt, contacted, `${review.caseId}.${component.componentId}.evidence`, audit) };
  });

  const insideTarget = review.exampleClassification === "inside-locked-target";
  const distinctExample = review.exampleClassification === "distinct-connected-example";
  exactEvidence(review.boundaryEvidence, excerpt, insideTarget, `${review.caseId}.boundaryEvidence`, audit);
  const connectionEvidence = exactEvidence(review.connectionEvidence, excerpt, distinctExample, `${review.caseId}.connectionEvidence`, audit);

  const relevantContrary = review.contraryClassification === "relevant-no-component";
  assert(review.relevantContraryMaterial === relevantContrary, `${review.caseId}: duplicate contrary field conflicts with classification`);
  const anyComponent = componentContacts.some((item) => item.contacted);
  if (relevantContrary) assert(!anyComponent, `${review.caseId}: contrary proposal contacts a component`);
  if (review.contraryClassification === "component-contact-precludes-contrary") assert(anyComponent, `${review.caseId}: contrary exclusion lacks component contact`);
  if (review.contraryClassification === "none") assert(!anyComponent && !relevantContrary, `${review.caseId}: contrary none conflicts with component state`);

  const defectPresent = review.defectType !== "none";
  assert(review.defectCuePresent === defectPresent, `${review.caseId}: defect stage mismatch`);
  assert(review.consequenceCuePresent === review.consequenceStated, `${review.caseId}: consequence stage mismatch`);
  if (review.consequenceStated) assert(defectPresent && review.consequenceClauseDistinct, `${review.caseId}: positive consequence lacks staged defect or distinct clause`);
  else assert(review.consequenceClauseDistinct === false, `${review.caseId}: inactive consequence marked distinct`);

  const burdenContact = structuredClone(review.burdenContact);
  assert(BURDEN_TIERS.has(burdenContact.tier), `${review.caseId}: invalid burden tier`);
  if (burdenContact.tier === "none") {
    assert(burdenContact.bridgeId === null, `${review.caseId}: none burden contact has bridge`);
    burdenContact.evidence = exactEvidence(burdenContact.evidence, excerpt, false, `${review.caseId}.burdenContact.evidence`, audit);
  } else {
    const bridge = challengeCase.burdenContext.route?.bridges.find((item) => item.id === burdenContact.bridgeId);
    assert(challengeCase.burdenContext.burdenPacket.eligibleBridgeIds.includes(burdenContact.bridgeId) && bridge?.tier === burdenContact.tier, `${review.caseId}: burden bridge is ineligible or tier mismatched`);
    burdenContact.evidence = exactEvidence(burdenContact.evidence, excerpt, true, `${review.caseId}.burdenContact.evidence`, audit);
  }

  const proposal = {
    caseId: review.caseId,
    moveId: review.moveId,
    originalTargetContact: review.originalTargetContact,
    targetEvidence: exactEvidence(review.targetEvidence, excerpt, review.originalTargetContact, `${review.caseId}.targetEvidence`, audit),
    connectedExample: distinctExample,
    connectionEvidence,
    scopeRelation: review.scopeRelation,
    scopeEvidence: exactEvidence(review.scopeEvidence, excerpt, review.scopeRelation !== "same", `${review.caseId}.scopeEvidence`, audit),
    burdenAdjustment: review.burdenAdjustment,
    burdenEvidence: exactEvidence(review.burdenEvidence, excerpt, review.burdenAdjustment !== "retained", `${review.caseId}.burdenEvidence`, audit),
    componentContacts,
    relevantContraryMaterial: relevantContrary,
    contraryEvidence: exactEvidence(review.contraryEvidence, excerpt, relevantContrary, `${review.caseId}.contraryEvidence`, audit),
    defectType: review.defectType,
    defectCue: exactEvidence(review.defectCue, excerpt, defectPresent, `${review.caseId}.defectCue`, audit),
    consequenceStated: review.consequenceStated,
    consequenceCue: exactEvidence(review.consequenceCue, excerpt, review.consequenceStated, `${review.caseId}.consequenceCue`, audit),
    malformedDemandExplained: review.malformedDemandExplained,
    malformedDemandCue: exactEvidence(review.malformedDemandCue, excerpt, review.malformedDemandExplained, `${review.caseId}.malformedDemandCue`, audit),
    replacementDemandStated: review.replacementDemandStated,
    replacementDemandCue: exactEvidence(review.replacementDemandCue, excerpt, review.replacementDemandStated, `${review.caseId}.replacementDemandCue`, audit),
    burdenContact,
    rationale: "The v3.5 compiler derives a coherent annotation from the review's validated semantic proposals."
  };
  return projectAnnotation(proposal, challengeCase, audit);
}

export function compileReviewArtifact(sourceArtifact, challengeInput, reviewerKey) {
  assert(sourceArtifact.reviewerKey === reviewerKey && sourceArtifact.model === V35_REVIEW_MODELS[reviewerKey], `${reviewerKey}: reviewer identity mismatch`);
  assert(Array.isArray(sourceArtifact.reviews) && sourceArtifact.reviews.length === challengeInput.cases.length, `${reviewerKey}: review coverage mismatch`);
  const cases = sourceArtifact.reviews.map((review, index) => {
    assert(review.caseId === challengeInput.cases[index].caseId, `${reviewerKey}: review order mismatch`);
    const compiled = compileCaseReview(review, challengeInput.cases[index]);
    return { caseId: review.caseId, moveId: review.moveId, annotation: compiled.annotation, derived: compiled.derived, compilerAudit: compiled.audit };
  });
  return {
    cases,
    audit: {
      caseCount: cases.length,
      validCaseCount: cases.length,
      evidenceTextsResolved: cases.reduce((sum, item) => sum + item.compilerAudit.evidenceTextsResolved, 0),
      offsetsDerived: cases.reduce((sum, item) => sum + item.compilerAudit.offsetsDerived, 0),
      inactiveEvidenceDiscarded: cases.reduce((sum, item) => sum + item.compilerAudit.inactiveEvidenceDiscarded, 0),
      projectionChangeCount: cases.reduce((sum, item) => sum + item.compilerAudit.projectionChanges.length, 0),
      discretionaryRepairs: 0,
      fallbacks: 0
    }
  };
}

export function diagnosticBundle(annotation) {
  return {
    defectType: annotation.defectType,
    defectCue: structuredClone(annotation.defectCue),
    consequenceStated: annotation.consequenceStated,
    consequenceCue: structuredClone(annotation.consequenceCue)
  };
}

export function sameDiagnostic(left, right) {
  return left.defectType === right.defectType && left.consequenceStated === right.consequenceStated;
}

function applyDiagnostic(annotation, bundle) {
  annotation.defectType = bundle.defectType;
  annotation.defectCue = structuredClone(bundle.defectCue);
  annotation.consequenceStated = bundle.consequenceStated;
  annotation.consequenceCue = structuredClone(bundle.consequenceCue);
}

function sharedOverrideEligible(fieldPath) {
  return V35_SHARED_OVERRIDE_FIELDS.has(fieldPath) || fieldPath.startsWith("componentContact.");
}

function selectCompound(fieldPath, candidateA, candidateB, terraValue, solValue) {
  const rawAgreement = sameSemantic(fieldPath, candidateA, candidateB);
  if (!rawAgreement) {
    const matchesA = sameSemantic(fieldPath, terraValue, candidateA);
    const matchesB = sameSemantic(fieldPath, terraValue, candidateB);
    if (matchesA !== matchesB) return { value: matchesA ? candidateA : candidateB, disposition: matchesA ? "terra-conflict-A" : "terra-conflict-B", rawAgreement, unresolved: false };
    const thirdConverged = V35_THIRD_VALUE_FIELDS.has(fieldPath) && !matchesA && !matchesB && sameSemantic(fieldPath, terraValue, solValue);
    if (thirdConverged) return { value: canonicalEvidenceChoice(fieldPath, terraValue, [terraValue, solValue]), disposition: "dual-confirmed-third-value", rawAgreement, unresolved: false };
    return { value: candidateA, disposition: "unresolved-retain-A", rawAgreement, unresolved: true };
  }
  const alternative = !sameSemantic(fieldPath, terraValue, candidateA) && !sameSemantic(fieldPath, solValue, candidateA);
  if (alternative && sharedOverrideEligible(fieldPath) && sameSemantic(fieldPath, terraValue, solValue)) {
    return { value: canonicalEvidenceChoice(fieldPath, terraValue, [terraValue, solValue]), disposition: "dual-confirmed-shared-override", rawAgreement, unresolved: false };
  }
  return { value: candidateA, disposition: fieldPath === "burdenAdjustment" || fieldPath === "burdenContact" ? "shared-burden-lock" : "shared-retain", rawAgreement, unresolved: false };
}

function selectDiagnostic(candidateA, candidateB, terraValue, solValue) {
  const rawAgreement = sameDiagnostic(candidateA, candidateB);
  if (!rawAgreement) {
    const matchesA = sameDiagnostic(terraValue, candidateA), matchesB = sameDiagnostic(terraValue, candidateB);
    if (matchesA !== matchesB) return { value: matchesA ? candidateA : candidateB, disposition: matchesA ? "terra-conflict-A" : "terra-conflict-B", rawAgreement, unresolved: false };
    if (!matchesA && !matchesB && sameDiagnostic(terraValue, solValue)) return { value: terraValue, disposition: "dual-confirmed-third-value", rawAgreement, unresolved: false };
    return { value: candidateA, disposition: "unresolved-retain-A", rawAgreement, unresolved: true };
  }
  if (!sameDiagnostic(terraValue, candidateA) && sameDiagnostic(terraValue, solValue)) return { value: terraValue, disposition: "dual-confirmed-shared-override", rawAgreement, unresolved: false };
  return { value: candidateA, disposition: "shared-retain", rawAgreement, unresolved: false };
}

export function mergeCompiledCase(challengeCase, passA, passB, terra, sol) {
  validateAnnotation(passA, challengeCase, `${challengeCase.caseId}.rawA`);
  validateAnnotation(passB, challengeCase, `${challengeCase.caseId}.rawB`);
  validateAnnotation(terra, challengeCase, `${challengeCase.caseId}.terraCompiled`);
  validateAnnotation(sol, challengeCase, `${challengeCase.caseId}.solCompiled`);
  const result = structuredClone(passA);
  const maps = {
    B: new Map(compoundFields(passB)),
    T: new Map(compoundFields(terra)),
    S: new Map(compoundFields(sol))
  };
  const provenance = [];
  let unresolvedFields = 0;
  for (const [fieldPath, candidateA] of compoundFields(passA)) {
    if (fieldPath === "defect" || fieldPath === "consequence") continue;
    const selected = selectCompound(fieldPath, candidateA, maps.B.get(fieldPath), maps.T.get(fieldPath), maps.S.get(fieldPath));
    applyCompoundField(result, fieldPath, selected.value);
    if (selected.unresolved) unresolvedFields += 1;
    provenance.push({ fieldPath, disposition: selected.disposition, rawAgreement: selected.rawAgreement, terraSemantic: semanticValue(fieldPath, maps.T.get(fieldPath)), solSemantic: semanticValue(fieldPath, maps.S.get(fieldPath)) });
  }
  const diagnostics = {
    A: diagnosticBundle(passA), B: diagnosticBundle(passB), T: diagnosticBundle(terra), S: diagnosticBundle(sol)
  };
  const selectedDiagnostic = selectDiagnostic(diagnostics.A, diagnostics.B, diagnostics.T, diagnostics.S);
  applyDiagnostic(result, selectedDiagnostic.value);
  if (selectedDiagnostic.unresolved) unresolvedFields += 1;
  provenance.push({
    fieldPath: "diagnosticBundle",
    disposition: selectedDiagnostic.disposition,
    rawAgreement: selectedDiagnostic.rawAgreement,
    terraSemantic: { defectType: diagnostics.T.defectType, consequenceStated: diagnostics.T.consequenceStated },
    solSemantic: { defectType: diagnostics.S.defectType, consequenceStated: diagnostics.S.consequenceStated }
  });
  const compiled = projectAnnotation(result, challengeCase, newAudit(), "The v3.5 replay applies conservative field arbitration, an atomic diagnostic bundle, and deterministic coupled-field projection.");
  return { ...compiled, provenance, unresolvedFields };
}

export { assert, compoundFields, derivedTuple, sameSemantic, semanticValue, sha256, validateAnnotation };
