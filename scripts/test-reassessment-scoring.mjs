#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  calculateV2Ledger,
  calculateV21Ledger,
  calculateV22Ledger,
  V21_RUBRIC,
  V21_WORKFLOW,
  V22_RUBRIC,
  V22_WORKFLOW
} from "./lib/reassessment-scoring.mjs";

function dimensions(value) {
  return {
    logicalCoherence: value,
    evidenceWarrant: value,
    responsiveness: value,
    relevanceBurden: value,
    precisionClarity: value,
    calibrationCharity: value
  };
}

function move(id, importance, passAValue, passBValue, adjudicationValue = null) {
  return {
    id,
    timestamp: "00:01",
    sourceSpan: { start: "00:01", end: "00:12" },
    sourceExcerpt: `Source excerpt for ${id} `.repeat(8).trim(),
    quoteKind: "quote",
    speakerAttributionConfidence: "high",
    audioChecked: true,
    burdenIds: [id.startsWith("pro") ? "pro-primary" : "con-primary"],
    respondsToIds: [],
    importance,
    passA: { dimensions: dimensions(passAValue), rationale: "Locked Pass A rationale." },
    passB: { dimensions: dimensions(passBValue), rationale: "Locked Pass B rationale." },
    ...(adjudicationValue === null
      ? {}
      : {
          adjudication: {
            dimensions: dimensions(adjudicationValue),
            rationale: "Threshold-triggered adjudication rationale."
          }
        })
  };
}

const fixture = {
  schemaVersion: "2.1",
  workflowVersion: V21_WORKFLOW,
  rubricVersion: V21_RUBRIC,
  calibrationOnly: true,
  debateId: "scoring-fixture",
  model: "5.6 Sol",
  sourceManifest: "fixture-source.json",
  blindPacketSha256: "a".repeat(64),
  assessmentPasses: {
    passA: {
      model: "5.6 Sol",
      completedAt: "2026-08-02T10:00:00.000Z",
      contextIsolation: "Fixture A"
    },
    passB: {
      model: "5.6 Sol",
      completedAt: "2026-08-02T11:00:00.000Z",
      contextIsolation: "Fixture B"
    }
  },
  passIndependence: { level: "test-fixture" },
  burdens: [
    {
      id: "pro-primary",
      side: "pro",
      description: "Pro burden",
      successCriteria: "Advance pro burden"
    },
    {
      id: "con-primary",
      side: "con",
      description: "Con burden",
      successCriteria: "Advance con burden"
    }
  ],
  sectionWeightsLockedBeforeScoring: true,
  moveImportanceLockedBeforeScoring: true,
  sections: [
    {
      id: "section-one",
      title: "Section one",
      weightPercent: 60,
      weightRationale: "Locked at sixty percent.",
      sides: {
        pro: { moves: [move("pro-one", 3, 80, 80), move("pro-two", 1, 60, 60)] },
        con: { moves: [move("con-one", 1, 70, 70)] }
      }
    },
    {
      id: "section-two",
      title: "Section two",
      weightPercent: 40,
      weightRationale: "Locked at forty percent.",
      sides: {
        pro: { moves: [move("pro-three", 1, 70, 70)] },
        con: { moves: [move("con-two", 1, 65, 74, 70)] }
      }
    }
  ],
  burdenCompletionAdjustment: {
    pro: {
      passA: { value: 1, rationale: "Pass A pro adjustment." },
      passB: { value: -1, rationale: "Pass B pro adjustment." }
    },
    con: {
      passA: { value: -1, rationale: "Pass A con adjustment." },
      passB: { value: 2, rationale: "Pass B con adjustment." },
      adjudication: { value: 0, rationale: "Con adjustment adjudication." }
    }
  },
  tagReview: { performedAfterScoring: true, candidates: [] },
  aiExtensionReview: { performedAfterAssessment: true, noveltyMap: [] }
};

fixture.sections[0].sides.con.moves[0].passB.dimensions.logicalCoherence = 78;

const calculated = calculateV21Ledger(fixture);
assert.equal(calculated.sections[0].sides.pro.score, 75, "importance-weighted section score");
assert.equal(calculated.sections[1].sides.pro.score, 70, "single-move section score");
assert.equal(calculated.sections[0].sides.con.moves[0].requiresAdjudication, false, "delta 8 is below trigger");
assert.equal(calculated.sections[1].sides.con.moves[0].requiresAdjudication, true, "delta 9 triggers");
assert.equal(calculated.agreementAudit.adjudicationCount, 1, "move adjudication count");
assert.equal(calculated.burdenCompletionAdjustment.pro.requiresAdjudication, false, "adjustment delta 2 is below trigger");
assert.equal(calculated.burdenCompletionAdjustment.con.requiresAdjudication, true, "adjustment delta 3 triggers");
assert.equal(calculated.agreementAudit.adjustmentAdjudicationCount, 1, "adjustment adjudication count");
assert.equal(calculated.overall.pro.weightedSectionMean, 73, "section-weighted mean");
assert.equal(calculated.overall.pro.score, 73, "final burden-adjusted overall");
assert.deepEqual(calculated.overall.pro.confidenceRange, { low: 70, high: 76 }, "agreement range");

const v22Fixture = structuredClone(fixture);
v22Fixture.schemaVersion = "2.2";
v22Fixture.workflowVersion = V22_WORKFLOW;
v22Fixture.rubricVersion = V22_RUBRIC;
v22Fixture.inventorySha256 = "b".repeat(64);
v22Fixture.audioVerificationSha256 = "c".repeat(64);
v22Fixture.passASha256 = "d".repeat(64);
v22Fixture.passBSha256 = "e".repeat(64);
for (const assessmentPass of Object.values(v22Fixture.assessmentPasses)) {
  assessmentPass.schemaValidated = true;
}
for (const section of v22Fixture.sections) {
  for (const side of ["pro", "con"]) {
    for (const scoredMove of section.sides[side].moves) {
      scoredMove.passA.responseClass = "full-direct-answer";
      scoredMove.passB.responseClass = "full-direct-answer";
      if (scoredMove.adjudication) scoredMove.adjudication.responseClass = "full-direct-answer";
    }
  }
}
v22Fixture.sections[0].sides.pro.moves[0].speakerAttributionConfidence = "medium";
v22Fixture.sections[0].sides.pro.moves[0].audioVerification = {
  status: "verified",
  path: "docs/calibration/v2.2/fixture-audio.json",
  sha256: "f".repeat(64),
  resolvedSpeaker: "Fixture speaker"
};
v22Fixture.sections[0].sides.pro.moves[0].speaker = "Fixture speaker";

function eligibleAdjustment(value, consequence) {
  return {
    value,
    rationale: `Distinct debate-wide consequence: ${consequence}.`,
    eligibility: {
      distinctDebateWideConsequence: true,
      affectsBurdenCompletion: true,
      notAlreadyScored: true,
      relatedMoveIds: ["pro-one"],
      distinctConsequence: consequence
    }
  };
}

function excludedAdjustment(rationale = "No distinct consequence survives the exclusion review.") {
  return {
    value: 0,
    rationale,
    eligibility: {
      distinctDebateWideConsequence: false,
      affectsBurdenCompletion: false,
      notAlreadyScored: false,
      relatedMoveIds: [],
      distinctConsequence: "none"
    }
  };
}

v22Fixture.burdenCompletionAdjustment.pro = {
  passA: eligibleAdjustment(1, "shared consequence"),
  passB: eligibleAdjustment(-1, "shared consequence")
};
v22Fixture.burdenCompletionAdjustment.con = {
  passA: eligibleAdjustment(-1, "pass disagreement"),
  passB: eligibleAdjustment(2, "pass disagreement"),
  adjudication: excludedAdjustment("Adjudication finds the cited consequence already scored.")
};
const calculatedV22 = calculateV22Ledger(v22Fixture);
assert.equal(calculatedV22.overall.pro.burdenCompletionAdjustment, 0, "opposed eligible adjustments resolve to zero");
assert.equal(calculatedV22.overall.con.burdenCompletionAdjustment, 0, "adjudicated exclusion resolves to zero");
assert.equal(calculatedV22.agreementAudit.mediumOrLowAudioVerificationRate, 1, "medium-confidence audio gate");

const duplicateAdjustmentFixture = structuredClone(v22Fixture);
duplicateAdjustmentFixture.burdenCompletionAdjustment.pro.passA = excludedAdjustment();
duplicateAdjustmentFixture.burdenCompletionAdjustment.pro.passA.value = 1;
assert.throws(
  () => calculateV22Ledger(duplicateAdjustmentFixture),
  /ineligible for a nonzero burden adjustment/,
  "ineligible nonzero adjustments are rejected"
);

const v2Source = await readFile(
  new URL("../docs/assessment-ledgers/craig-oconnor-god-debate-2026.json", import.meta.url),
  "utf8"
);
assert.equal(
  `${JSON.stringify(calculateV2Ledger(JSON.parse(v2Source)), null, 2)}\n`,
  v2Source,
  "legacy v2 ledger remains exactly reproducible"
);

console.log("Validated v2 compatibility, v2.1 thresholds, and v2.2 audio/adjustment controls.");
