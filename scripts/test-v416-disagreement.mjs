#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { extractV416MoveDisagreement, v416AdjustmentSemanticTuple, v416ResponseTuple } from "./lib/v416-disagreement.mjs";

function fixture() {
  return {
    moveId: "synthetic",
    response: { class: "partial-answer", decisiveTargetIds: ["a"], components: [{ contacted: true, decisive: true }], issueBearingContraryMaterial: false, diagnosticConsequenceExplicit: false, replacementDemandAnswered: false },
    precisionFindings: { propositionRecoverability: "complete", termStability: "stable", scopeStability: "stable", qualificationExplicitness: "explicit", rationale: "x" },
    calibrationFindings: { assertedForce: "plausibility", warrantFit: "matched", qualificationStatus: "explicit", uncertaintyAcknowledged: "yes", rationale: "x" },
    charity: { tested: true, alternative: "a", decisiveQualification: "b" },
    ratings: Object.fromEntries(["logicalCoherence", "evidenceWarrant", "responsiveness", "relevanceBurden", "representationalCharity"].map((key) => [key, { value: 80, rationale: "x" }]))
  };
}

const sameA = fixture();
const sameB = fixture();
assert.equal(extractV416MoveDisagreement(sameA, sameB).disputed, false);

const responseB = fixture();
responseB.response.class = "full-answer";
assert.equal(extractV416MoveDisagreement(sameA, responseB).responseMismatch, true);

const charityB = fixture();
charityB.charity.tested = false;
assert.equal(extractV416MoveDisagreement(sameA, charityB).charityStateMismatch, true);

const scalarB = fixture();
scalarB.ratings.logicalCoherence.value = 74;
assert.deepEqual(extractV416MoveDisagreement(sameA, scalarB).materialScoringFieldKeys, ["logicalCoherence"]);

const precisionB = fixture();
precisionB.precisionFindings.qualificationExplicitness = "missing";
assert(extractV416MoveDisagreement(sameA, precisionB).materialScoringFieldKeys.includes("precisionClarity"));

assert.deepEqual(v416ResponseTuple(sameA.response), { class: "partial-answer", decisiveTargetIds: ["a"], contactedComponents: 1, totalComponents: 1, decisiveComponents: 1, issueBearingContraryMaterial: false, diagnosticConsequenceExplicit: false, replacementDemandAnswered: false });
const adjustment = { value: 0, rationale: "ignored", eligibility: { distinctDebateWideConsequence: false, affectsBurdenCompletion: false, notAlreadyScored: false, affectedBurdenIds: [], relatedMoveIds: ["b", "a"], alreadyCapturedBy: ["ratings"] } };
assert.deepEqual(v416AdjustmentSemanticTuple(adjustment).eligibility.relatedMoveIds, ["a", "b"]);
console.log(JSON.stringify({ status: "passed", fixtures: 7, deterministicTriggersCovered: 5 }, null, 2));
