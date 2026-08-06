#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { compileAndValidateV422116Judgment } from "./lib/v422116-decomposed-consensus.mjs";

const V422117_ROOT = "docs/calibration/v4.2.21.17/independent-judgment-three";
const preparation = JSON.parse(await readFile(`${V422117_ROOT}/preparation-manifest.json`, "utf8"));
assert.equal(preparation.status, "retired-partition-three-independent-judgments-prepared");
assert.equal(preparation.contexts.length, 6);
assert(preparation.totals.maximumCopiedInputBytes <= 115000);

const long = (label) => `${label} is stated in enough detail to satisfy the closed fixture contract without adding a substantive assessment.`;
function syntheticJudgment(packet) {
  const moveJudgments = {};
  for (const [index, move] of packet.lockedInventory.moves.entries()) {
    const earlierOpponent = packet.lockedInventory.moves.slice(0, index).find((candidate) => candidate.side !== move.side);
    const response = move.moveKind === "constructive"
      ? { rationale: long("This locked move is constructive and therefore has no earlier selected argumentative target"), responsivenessWithinClass: { value: 50, rationale: long("The within-class fixture value is neutral for deterministic compiler validation") } }
      : { responseMode: "ordinary-primary-uncontacted", primaryComponent: { targetMoveId: earlierOpponent.moveId, text: "The earlier opposing move's principal inferential demand remains unanswered." }, additionalComponents: [], issueBearingContraryMaterial: false, rationale: long("The synthetic reply fixture identifies one legal earlier opposing target without claiming semantic contact"), responsivenessWithinClass: { value: 50, rationale: long("The within-class fixture value is neutral for deterministic compiler validation") } };
    moveJudgments[move.moveId] = {
      importance: 2,
      burdenContactCode: "bc-000",
      response,
      precisionFindings: { propositionRecoverability: "complete", termStability: "stable", scopeStability: "stable", qualificationExplicitness: "explicit", rationale: long("The fixture treats the already locked proposition as recoverable and stable") },
      calibrationFindings: { assertedForce: "plausibility", warrantFit: "matched", qualificationStatus: "explicit", uncertaintyAcknowledged: "yes", rationale: long("The fixture uses a conservative force and matched warrant solely for compiler replay") },
      charityAssessment: { mode: "not-tested", alternative: "", decisiveQualification: "", testedRatingValue: 75, ratingRationale: long("No alternative interpretation is tested in this deterministic compiler fixture") },
      ratings: { logicalCoherence: { value: 70, rationale: long("The synthetic direct rating is a validator fixture rather than a live assessment") }, evidenceWarrant: { value: 70, rationale: long("The synthetic evidence rating is a validator fixture rather than a live assessment") }, relevanceWithinTier: { value: 50, rationale: long("The within-tier value tests deterministic mapping into the no-contact range") } },
      evidenceBasis: long(`The source-exact locked excerpt for ${move.moveId} remains the repository-owned evidentiary basis`),
      assessmentConfidence: "high"
    };
  }
  const eligibility = { distinctDebateWideConsequence: false, affectsBurdenCompletion: false, notAlreadyScored: false, affectedBurdenIds: [], completionCriterion: "No distinct residual completion criterion is asserted in this deterministic fixture.", relatedMoveIds: [], distinctConsequence: "No distinct debate-wide consequence is asserted in this deterministic fixture.", alreadyCapturedBy: ["ordinary move-level fields"], counterfactual: "Removing the ordinary fields would not expose a separate residual consequence in this fixture." };
  return {
    schemaVersion: "4.2.21.16-independent-judgment",
    protocolId: "v4.2.21.16-decomposed-consensus-contract",
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    reviewerRole: packet.reviewerRole,
    assessmentModel: "5.6 Sol",
    calibrationOnly: true,
    lockedInventorySha256: packet.lockedInventorySha256,
    isolation: { legacyAssessmentsUnavailable: true, calculatedTotalsUnavailable: true, winnerLabelsUnavailable: true, otherIndependentJudgmentUnavailable: true, assessmentProseUnavailable: true, contaminationDetected: false },
    moveJudgments,
    burdenCompletionAdjustment: { pro: { eligibleValueCandidate: 0, rationale: long("The pro residual is excluded because ordinary fields already capture the fixture"), eligibility: structuredClone(eligibility) }, con: { eligibleValueCandidate: 0, rationale: long("The con residual is excluded because ordinary fields already capture the fixture"), eligibility: structuredClone(eligibility) } },
    audit: { sameLockedInventoryReviewed: true, everyLockedMoveJudgedOnce: true, candidateSelectionUnavailable: true, earlierOpposingTargetEnumsApplied: true, responseComponentsApplied: true, withinClassResponsivenessApplied: true, withinTierBurdenRelevanceApplied: true, closedPrecisionAnchorsApplied: true, closedCalibrationAnchorsApplied: true, charityAnchorApplied: true, strictBurdenExclusionRuleApplied: true, scoresNotDerived: true }
  };
}

const results = [];
for (const context of preparation.contexts) {
  for (const future of [context.judgmentOutput, context.rawOutput, context.validationOutput, context.provenanceOutput]) assert.equal(await access(future).then(() => true, () => false), false, `future judgment output already exists: ${future}`);
  const [packet, sourcePacket, eventsDocument, eventsBytes, sourceLedgerBytes] = await Promise.all([readFile(context.judgmentPacket, "utf8").then(JSON.parse), readFile(context.sourcePacket, "utf8").then(JSON.parse), readFile(context.originalEvents, "utf8").then(JSON.parse), readFile(context.originalEvents), readFile(context.fullLedger)]);
  const judgment = syntheticJudgment(packet);
  const compiled = compileAndValidateV422116Judgment(judgment, packet, { sourcePacket, eventsDocument, eventsBytes, sourceLedgerBytes });
  assert.equal(compiled.validation.status, "passed");
  assert.equal(compiled.provenance.semanticRepairPerformed, false);
  assert.equal(compiled.provenance.scoresDerived, 0);
  results.push({ debateNumber: context.debateNumber, reviewerPass: context.reviewerPass, moves: compiled.rawOutput.moves.length, lockedInventorySha256: packet.lockedInventorySha256, unchangedV4220ValidatorPassed: true });
}
for (const debateNumber of ["133", "178", "182"]) {
  const pair = results.filter((result) => result.debateNumber === debateNumber);
  assert.equal(pair.length, 2);
  assert.equal(pair[0].lockedInventorySha256, pair[1].lockedInventorySha256);
}
console.log(JSON.stringify({ status: "passed", contexts: results, sameLockedInventoryPerPair: true, exactMovePropertyCoverage: true, earlierOpposingTargetEnumsOnly: true, unchangedV4220ValidatorPassed: true, semanticRepairPerformed: false, futureJudgmentOutputsAbsent: true, modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
