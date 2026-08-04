import { canonicalJson } from "./v36-decision-cards.mjs";
import { assert } from "./v371-gold-audit.mjs";

export const V372_ROOT = "docs/calibration/v3.7.2/atomic-bundle-replay";
export const V372_SPEC_PATH = `${V372_ROOT}/bundle-spec.json`;

function fieldObject(bundle, values) {
  return Object.fromEntries(bundle.inputs.map((input) => {
    assert(values.has(input.auditId), `${bundle.bundleId}.${input.auditId}: input missing`);
    return [input.fieldId, values.get(input.auditId)];
  }));
}

export function compileBundle(bundle, values, label = bundle.bundleId) {
  const fields = { ...bundle.fixedFields, ...fieldObject(bundle, values) };
  const derived = {}, issues = [];
  if (bundle.compiler === "target-components") {
    const componentValues = Object.entries(fields).filter(([key]) => key.startsWith("component.")).map(([, value]) => value);
    assert(componentValues.length > 0, `${label}: target bundle lacks components`);
    const anyContact = componentValues.some((value) => value !== "none");
    derived["contrary.classification"] = anyContact ? "component-contact-precludes-contrary" : "relevant-no-component";
  } else if (bundle.compiler === "reframe") {
    const malformed = fields["malformedDemand.explained"], replacement = fields["replacementDemand.stated"], relation = fields.relationKind;
    assert(typeof malformed === "boolean" && typeof replacement === "boolean" && typeof relation === "string", `${label}: reframe fields incomplete`);
    const relationActive = relation !== "none";
    if (relationActive !== (malformed && replacement)) issues.push("reframe-relation-activation-mismatch");
  } else if (bundle.compiler === "diagnostic-linked-consequence") {
    if (fields.consequenceStated !== true || fields["defect.type"] === "none" || fields["consequence.relationKind"] === "none") issues.push("linked-diagnostic-bundle-inactive");
  } else if (bundle.compiler === "diagnostic-defect-only") {
    if (fields.consequenceStated !== false || fields["defect.type"] === "none") issues.push("defect-only-bundle-invalid");
  } else assert(bundle.compiler === "singleton", `${label}: compiler type unsupported`);

  for (const witness of bundle.witnesses) {
    assert(values.has(witness.auditId), `${label}.${witness.auditId}: witness missing`);
    const expected = derived[witness.derivedFieldId], actual = values.get(witness.auditId);
    if (canonicalJson(actual) !== canonicalJson(expected)) issues.push(`derived-witness-mismatch:${witness.fieldId}`);
  }
  return {
    bundleId: bundle.bundleId,
    debateNumber: bundle.debateNumber,
    family: bundle.family,
    caseId: bundle.caseId,
    compiler: bundle.compiler,
    valid: issues.length === 0,
    issues,
    semanticTuple: { ...fields, ...derived },
    independentAuditIds: bundle.inputs.map((item) => item.auditId),
    witnessAuditIds: bundle.witnesses.map((item) => item.auditId),
    discretionaryRepairs: 0
  };
}

export function compileBundles(spec, values, label) {
  return spec.bundles.map((bundle) => compileBundle(bundle, values, `${label}.${bundle.bundleId}`));
}

export function compareBundlePasses(passA, passB) {
  assert(passA.length === passB.length, "bundle pass lengths differ");
  return passA.map((left, index) => {
    const right = passB[index];
    assert(left.bundleId === right.bundleId, `${left.bundleId}: bundle order mismatch`);
    const agreed = left.valid && right.valid && canonicalJson(left.semanticTuple) === canonicalJson(right.semanticTuple);
    return { bundleId: left.bundleId, debateNumber: left.debateNumber, family: left.family, passAValid: left.valid, passBValid: right.valid, agreed, passA: left.semanticTuple, passB: right.semanticTuple, passAIssues: left.issues, passBIssues: right.issues };
  });
}

export function auditCoverage(spec) {
  const independent = spec.bundles.flatMap((bundle) => bundle.inputs.map((item) => item.auditId));
  const witnesses = spec.bundles.flatMap((bundle) => bundle.witnesses.map((item) => item.auditId));
  const all = [...independent, ...witnesses];
  return { independent, witnesses, all, unique: new Set(all).size, duplicates: all.filter((item, index) => all.indexOf(item) !== index) };
}

export { assert, canonicalJson };
