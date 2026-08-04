#!/usr/bin/env node

import assert from "node:assert/strict";
import { compileCaseReview, mergeCompiledCase, projectAnnotation } from "./lib/v35-semantic-compiler.mjs";
import { defaultAnnotation } from "./lib/v31-verification.mjs";

const excerpt = "I reject component alpha because it does not follow. Ask whether the evidence supports beta instead.";
const challengeCase = {
  caseId: "fixture-1",
  moveId: "move-1",
  sourceExcerpt: excerpt,
  targetPacket: { indispensableComponents: [{ id: "c1", text: "component alpha" }] },
  burdenContext: {
    route: { bridges: [{ id: "bridge-1", tier: "central" }] },
    burdenPacket: { eligibleBridgeIds: ["bridge-1"], primaryRouteId: "route-1" }
  }
};
const ev = (text) => ({ startChar: 999, endChar: 1000, text });
const review = {
  caseId: "fixture-1", moveId: "move-1", originalTargetContact: false, targetEvidence: null,
  connectedExample: false, connectionEvidence: null, exampleClassification: "inside-locked-target", boundaryEvidence: ev("component alpha"),
  scopeRelation: "same", scopeEvidence: null, burdenAdjustment: "retained", burdenEvidence: null,
  componentReviews: [{ componentId: "c1", contacted: true, evidence: ev("component alpha"), contactMode: "denial", licenseText: null }],
  relevantContraryMaterial: false, contraryEvidence: ev("evidence supports beta"), contraryClassification: "component-contact-precludes-contrary",
  defectCuePresent: true, defectType: "invalid-inference", defectCue: ev("does not follow"), consequenceCuePresent: false,
  consequenceStated: false, consequenceCue: null, consequenceClauseDistinct: false,
  malformedDemandExplained: false, malformedDemandCue: null, replacementDemandStated: true,
  replacementDemandCue: ev("Ask whether the evidence supports beta instead"),
  burdenContact: { tier: "none", bridgeId: null, evidence: null }, rationale: "A sufficiently long fixture rationale explains the decisive component, diagnostic, and replacement decisions in this case."
};

const compiled = compileCaseReview(review, challengeCase);
assert.equal(compiled.annotation.originalTargetContact, true);
assert.equal(compiled.annotation.targetEvidence.text, "component alpha");
assert.equal(compiled.annotation.targetEvidence.startChar, excerpt.indexOf("component alpha"));
assert.equal(compiled.annotation.connectedExample, false);
assert.equal(compiled.annotation.contraryEvidence, null);
assert.equal(compiled.audit.inactiveEvidenceDiscarded, 1);
assert.equal(compiled.audit.discretionaryRepairs, 0);

const contraryProposal = defaultAnnotation(challengeCase);
contraryProposal.relevantContraryMaterial = true;
contraryProposal.contraryEvidence = { startChar: 2, endChar: 8, text: "reject" };
const projected = projectAnnotation(contraryProposal, challengeCase);
assert.equal(projected.annotation.originalTargetContact, true);
assert.equal(projected.annotation.targetEvidence.text, "reject");

function annotation({ defectType = "none", consequenceStated = false, scopeRelation = "same" } = {}) {
  const value = defaultAnnotation(challengeCase);
  const span = (text) => ({ startChar: excerpt.indexOf(text), endChar: excerpt.indexOf(text) + text.length, text });
  value.originalTargetContact = true;
  value.targetEvidence = span("reject");
  value.scopeRelation = scopeRelation;
  value.scopeEvidence = scopeRelation === "same" ? null : span("reject");
  value.defectType = defectType;
  value.defectCue = defectType === "none" ? null : span("does not follow");
  value.consequenceStated = consequenceStated;
  value.consequenceCue = consequenceStated ? span("Ask whether the evidence supports beta") : null;
  value.rationale = "A complete synthetic annotation rationale exists solely to exercise the deterministic v3.5 compiler and merge invariants."
  return value;
}

const rawA = annotation();
const rawB = annotation({ defectType: "ambiguity", consequenceStated: true });
const terraThird = annotation({ defectType: "invalid-inference", consequenceStated: true });
const solThird = annotation({ defectType: "invalid-inference", consequenceStated: true });
const third = mergeCompiledCase(challengeCase, rawA, rawB, terraThird, solThird);
assert.equal(third.annotation.defectType, "invalid-inference");
assert.equal(third.annotation.consequenceStated, true);
assert.equal(third.unresolvedFields, 0);
assert.equal(third.provenance.find((item) => item.fieldPath === "diagnosticBundle").disposition, "dual-confirmed-third-value");

const solSplit = annotation({ defectType: "invalid-inference", consequenceStated: false });
const unresolved = mergeCompiledCase(challengeCase, rawA, rawB, terraThird, solSplit);
assert.equal(unresolved.annotation.defectType, "none");
assert.equal(unresolved.annotation.consequenceStated, false);
assert.equal(unresolved.unresolvedFields, 1);

const rawSharedBurden = annotation();
rawSharedBurden.burdenContact = { tier: "none", bridgeId: null, evidence: null };
const reviewBurden = annotation();
reviewBurden.burdenContact = { tier: "central", bridgeId: "bridge-1", evidence: { startChar: excerpt.indexOf("whether the evidence supports beta"), endChar: excerpt.indexOf("whether the evidence supports beta") + "whether the evidence supports beta".length, text: "whether the evidence supports beta" } };
const burdenLocked = mergeCompiledCase(challengeCase, rawSharedBurden, rawSharedBurden, reviewBurden, reviewBurden);
assert.equal(burdenLocked.annotation.burdenContact.tier, "none");
assert.equal(burdenLocked.provenance.find((item) => item.fieldPath === "burdenContact").disposition, "shared-burden-lock");

console.log(JSON.stringify({ status: "passed", fixtures: 5, discretionaryRepairs: 0, fallbacks: 0 }, null, 2));
