#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V389_BURDEN_RANGES,
  V389_PERFORMANCE_DEBATES,
  V389_PERFORMANCE_PASSES,
  V389_PERFORMANCE_ROOT,
  canonicalJson,
  extractV389MoveDisagreement,
  makeV389PerformanceSchema,
  readJson,
  validateV389PerformanceOutput
} from "./lib/v389-performance-judgment.mjs";

const shouldWrite = process.argv.includes("--write");
const rationale = "This fixture rationale names the locked transcript feature and applies the relevant anchor without calculating or supplying any move, section, or overall participant score.";
const evidenceBasis = "The locked atomic excerpt, context window, and named response target provide the source basis for this deterministic contract fixture.";

function rating(value) {
  return { value, rationale };
}

function adjustment() {
  return {
    value: 0,
    rationale: "No distinct uncaptured debate-wide burden-completion consequence is asserted in this deterministic contract fixture.",
    eligibility: {
      distinctDebateWideConsequence: false,
      affectsBurdenCompletion: false,
      notAlreadyScored: false,
      affectedBurdenIds: [],
      completionCriterion: "None identified in the contract fixture.",
      relatedMoveIds: [],
      distinctConsequence: "None identified in the contract fixture.",
      alreadyCapturedBy: ["contract-fixture-no-adjustment"],
      counterfactual: "No score counterfactual is asserted in the contract fixture."
    }
  };
}

function fixtureOutput(packet, pass) {
  return {
    schemaVersion: "3.8.9-performance-judgment-output",
    protocolId: "v3.8.9-performance-judgment-consensus",
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    pass,
    reviewerRole: "performance-judge",
    assessmentModel: "5.6 Sol",
    calibrationOnly: true,
    isolation: {
      otherPassUnavailable: true,
      legacyAssessmentsUnavailable: true,
      calculatedTotalsUnavailable: true,
      winnerLabelsUnavailable: true,
      assessmentProseUnavailable: true,
      contaminationDetected: false
    },
    moveJudgments: packet.moves.map((move) => {
      const constructive = move.moveKind === "constructive";
      const tier = move.lockedBurdenContact?.tier ?? "none";
      const targetCount = move.allowedResponseTargetIds.length;
      return {
        moveId: move.moveId,
        sectionId: move.sectionId,
        side: move.side,
        speaker: move.speaker,
        sourceSpan: move.sourceSpan,
        lockedBurdenContact: move.lockedBurdenContact,
        response: constructive ? {
          class: "constructive-opening",
          decisiveTargetIds: [],
          contactedComponents: 0,
          totalComponents: 0,
          rationale
        } : {
          class: "full-answer",
          decisiveTargetIds: [...move.allowedResponseTargetIds],
          contactedComponents: Math.max(1, targetCount),
          totalComponents: Math.max(1, targetCount),
          rationale: "This fixture full answer directly contacts and addresses every indispensable component of each locked target proposition without importing later material."
        },
        ratings: {
          logicalCoherence: rating(75),
          evidenceWarrant: rating(75),
          responsiveness: rating(constructive ? 75 : 80),
          relevanceBurden: rating(V389_BURDEN_RANGES[tier][0]),
          precisionClarity: rating(75),
          epistemicCalibration: rating(75),
          representationalCharity: { value: 75, rationale: "Representational charity was not tested because this fixture makes no substantive judgment about a live alternative position." }
        },
        charityTested: false,
        evidenceBasis,
        assessmentConfidence: "high"
      };
    }),
    burdenCompletionAdjustment: { pro: adjustment(), con: adjustment() },
    audit: {
      moveCount: packet.moves.length,
      allMovesJudgedOnce: true,
      lockedFieldsCopied: true,
      responseAnchorsApplied: true,
      burdenAnchorsApplied: true,
      charityAnchorApplied: true,
      burdenExclusionRuleApplied: true,
      calculatedTotalsAbsent: true
    }
  };
}

const schema = await readJson(`${V389_PERFORMANCE_ROOT}/performance-judgment-schema.json`);
if (canonicalJson(schema) !== canonicalJson(makeV389PerformanceSchema())) throw new Error("stored shared schema differs from generator");
const reports = [];
for (const debateNumber of V389_PERFORMANCE_DEBATES) {
  const packet = await readJson(`${V389_PERFORMANCE_ROOT}/packets/debate-${debateNumber}.json`);
  for (const pass of V389_PERFORMANCE_PASSES) reports.push(validateV389PerformanceOutput(fixtureOutput(packet, pass), packet, pass));
}

const samplePacket = await readJson(`${V389_PERFORMANCE_ROOT}/packets/debate-55.json`);
const baseline = fixtureOutput(samplePacket, "A");
const responsiveIndex = baseline.moveJudgments.findIndex((move) => move.response.class === "full-answer");
const baseMove = baseline.moveJudgments[responsiveIndex];
const variantMove = structuredClone(baseMove);
variantMove.response.class = "partial-answer";
variantMove.response.totalComponents = 2;
variantMove.response.contactedComponents = 1;
variantMove.response.rationale = "This fixture partial answer contacts the target's first indispensable component but leaves the second indispensable component unanswered and therefore remains incomplete.";
variantMove.ratings.responsiveness.value = 70;
variantMove.charityTested = true;
variantMove.ratings.representationalCharity = { value: 80, rationale: "The fixture variant materially tests and accurately represents the live alternative's decisive qualification before criticism." };
const dispute = extractV389MoveDisagreement(baseMove, variantMove);
if (!dispute.responseMismatch || !dispute.charityTestedMismatch || !dispute.disputed) throw new Error("compound response or charity disagreement extraction failed");

const invalidDuplicate = structuredClone(baseline);
invalidDuplicate.burdenCompletionAdjustment.pro.value = 1;
let duplicateRejected = false;
try {
  validateV389PerformanceOutput(invalidDuplicate, samplePacket, "A");
} catch (error) {
  duplicateRejected = /duplicate capture forces zero/.test(error.message);
}
if (!duplicateRejected) throw new Error("burden-adjustment duplicate exclusion mutation was not rejected");

const invalidCharity = structuredClone(baseline);
invalidCharity.moveJudgments[0].ratings.representationalCharity.value = 76;
let charityRejected = false;
try {
  validateV389PerformanceOutput(invalidCharity, samplePacket, "A");
} catch (error) {
  charityRejected = /untested charity must equal 75/.test(error.message);
}
if (!charityRejected) throw new Error("untested-charity mutation was not rejected");

const fixture = {
  schemaVersion: "3.8.9-performance-judgment-tooling-dry-fixture",
  status: "passed",
  reports,
  mutationTests: { compoundResponseDisputeDetected: true, charityTestedDisputeDetected: true, duplicateAdjustmentRejected: true, untestedCharityValueRejected: true },
  totals: { contexts: 6, debates: 3, judgments: reports.reduce((sum, report) => sum + report.moves, 0), uniqueMoves: 81, sharedSchemas: 1, scoreFields: 0, calculatedTotals: 0, modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }
};
if (shouldWrite) {
  await mkdir(path.resolve(V389_PERFORMANCE_ROOT), { recursive: true });
  await writeFile(path.resolve(`${V389_PERFORMANCE_ROOT}/dry-fixture.json`), `${JSON.stringify(fixture, null, 2)}\n`);
}
console.log(JSON.stringify(fixture, null, 2));
