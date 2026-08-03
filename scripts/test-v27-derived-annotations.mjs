#!/usr/bin/env node

import assert from "node:assert/strict";
import { deriveCoverage, deriveDiagnostic, deriveTargetDisposition } from "./lib/v27-derived-annotations.mjs";

const responsive = { interactionMode: "responsive" };
const constructive = { interactionMode: "constructive" };
const base = {
  targetObjectRelation: "same",
  targetScopeRelation: "same",
  targetBurdenRelation: "retained",
  componentOperations: [{ componentId: "c1", operation: null, evidence: null }],
  relevantContraryMaterial: false,
};

assert.equal(deriveTargetDisposition(responsive, base), "preserved");
assert.equal(deriveCoverage(responsive, base), "nonanswer", "zero contact is a nonanswer, not a substitution");
assert.equal(deriveCoverage(responsive, { ...base, relevantContraryMaterial: true }), "relevant-nonanswer");
assert.equal(deriveCoverage(responsive, { ...base, componentOperations: [{ componentId: "c1", operation: "qualifies", evidence: {} }], targetScopeRelation: "narrowed" }), "full", "scope changes remain component-annotatable");
assert.equal(deriveTargetDisposition(responsive, { ...base, targetObjectRelation: "changed" }), "substituted");
assert.equal(deriveCoverage(responsive, { ...base, targetObjectRelation: "changed" }), "substitution");
assert.equal(deriveTargetDisposition(responsive, { ...base, targetBurdenRelation: "replaced" }), "substituted");
assert.equal(deriveCoverage(constructive, base), "not-applicable");

const defect = { defectType: "missing-premise", defectObject: { objectType: "target-component", objectId: "c1" }, defectEvidence: {}, impactMode: "inferential-consequence", impactEvidence: {} };
assert.equal(deriveDiagnostic(responsive, defect), true);
assert.equal(deriveDiagnostic(responsive, { ...defect, impactMode: "verdict" }), false, "a verdict does not establish inferential consequence");
assert.equal(deriveDiagnostic(responsive, { ...defect, impactEvidence: null }), false);
assert.equal(deriveDiagnostic(constructive, defect), false, "constructive moves do not receive responsive diagnostics");

console.log(JSON.stringify({ status: "passed", assertions: 12 }, null, 2));
