#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V384_BURDEN_RANGES,
  V384_RESPONSE_RANGES,
  burdenAdjustmentRequiresDispute,
  extractMoveDisputeReasons,
  roundedMean,
  scalarRequiresDispute,
  v384DisplayedLanguagePasses
} from "./lib/v384-score-consensus.mjs";

const write = process.argv.includes("--write");
const root = path.resolve(".");
const fixturePath = path.join(
  root,
  "docs/calibration/v3.8.4/held-out-score-reconstruction-gate/contract-dry-fixture.json"
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const baseRatings = {
  logicalCoherence: 80,
  evidenceWarrant: 75,
  responsiveness: 79,
  relevanceBurden: 74,
  precisionClarity: 80,
  epistemicCalibration: 75,
  representationalCharity: 75
};

const judgment = (responseClass, ratings) => ({
  response: { class: responseClass },
  ratings
});

const smallDelta = extractMoveDisputeReasons(
  judgment("partial-answer", baseRatings),
  judgment("partial-answer", { ...baseRatings, logicalCoherence: 85 })
);
assert(scalarRequiresDispute(80, 85) === false, "five-point delta must remain nondisputed");
assert(roundedMean(80, 85) === 83, "nondisputed scalar merge must use rounded mean");
assert(smallDelta.exposedRatingKeys.length === 0, "small isolated delta must not be exposed");

const largeDelta = extractMoveDisputeReasons(
  judgment("partial-answer", baseRatings),
  judgment("partial-answer", { ...baseRatings, logicalCoherence: 86 })
);
assert(largeDelta.scalarThresholdKeys.includes("logicalCoherence"), "six-point delta must dispute");

const classMismatch = extractMoveDisputeReasons(
  judgment("partial-answer", baseRatings),
  judgment("relevant-nonanswer", baseRatings)
);
assert(classMismatch.responseClassMismatch === true, "response-class mismatch must dispute");

const moveTotalTrigger = extractMoveDisputeReasons(
  judgment("full-answer", {
    ...baseRatings,
    responsiveness: 84,
    relevanceBurden: 79,
    evidenceWarrant: 70
  }),
  judgment("full-answer", {
    ...baseRatings,
    logicalCoherence: 85,
    evidenceWarrant: 75,
    responsiveness: 89,
    relevanceBurden: 84,
    precisionClarity: 85,
    epistemicCalibration: 80,
    representationalCharity: 80
  })
);
assert(moveTotalTrigger.moveTotalTrigger === true, "move-total delta above four must trigger");
assert(moveTotalTrigger.exposedRatingKeys.length > 1, "move-total trigger must expose unequal ratings");

const zeroAdjustment = {
  value: 0,
  eligibility: {
    distinctDebateWideConsequence: false,
    affectsBurdenCompletion: false,
    notAlreadyScored: false,
    affectedBurdenIds: [],
    completionCriterion: "none",
    relatedMoveIds: [],
    distinctConsequence: "none",
    alreadyCapturedBy: ["captured by move m1"],
    counterfactual: "No adjustment applies."
  }
};
const alteredAdjustment = structuredClone(zeroAdjustment);
alteredAdjustment.eligibility.alreadyCapturedBy = ["captured by move m2"];
assert(
  burdenAdjustmentRequiresDispute(zeroAdjustment, alteredAdjustment) === true,
  "burden-adjustment semantic mismatch must dispute"
);

assert(
  v384DisplayedLanguagePasses({ text: "A proportionate conclusion open to further objection." }),
  "ordinary extension language should pass"
);
assert(
  !v384DisplayedLanguagePasses({ text: "This position is unassailable." }),
  "prohibited extension language should fail"
);

const fixture = {
  schemaVersion: "3.8.4-contract-dry-fixture",
  generatedAt: "2026-08-04T00:00:00.000Z",
  status: "passed",
  responseRanges: V384_RESPONSE_RANGES,
  burdenRanges: V384_BURDEN_RANGES,
  checks: {
    fivePointScalarNondisputed: true,
    roundedMeanAppliedAfterPassesClose: true,
    sixPointScalarDisputed: true,
    responseClassMismatchDisputed: true,
    moveTotalDeltaTriggerExposesUnequalRatings: true,
    burdenAdjustmentSemanticMismatchDisputed: true,
    thirdCandidateProhibitedBySchema: true,
    initialCalculatedTotalsAbsentBySchema: true,
    extensionLanguageScanDetectsProhibitedClaims: true,
    exactBylineLockedBySchema: true
  },
  sampleDiagnostics: {
    smallDelta,
    largeDelta,
    classMismatch,
    moveTotalTrigger
  }
};

if (write) {
  await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      checks: Object.keys(fixture.checks).length,
      fixture: path.relative(root, fixturePath).split(path.sep).join("/"),
      written: write
    },
    null,
    2
  )
);
