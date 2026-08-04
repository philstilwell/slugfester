import { combineCalibrationCharity, scoreDimensions } from "./reassessment-scoring.mjs";

export const V384_SCALAR_DISPUTE_THRESHOLD = 5;
export const V384_MOVE_TOTAL_DISPUTE_THRESHOLD = 4;

export const V384_RESPONSE_RANGES = Object.freeze({
  "constructive-opening": Object.freeze([0, 100]),
  "full-answer": Object.freeze([80, 100]),
  "diagnostic-defeat": Object.freeze([80, 100]),
  "justified-reframe": Object.freeze([80, 100]),
  "partial-answer": Object.freeze([55, 79]),
  "relevant-nonanswer": Object.freeze([40, 69]),
  nonanswer: Object.freeze([0, 39])
});

export const V384_BURDEN_RANGES = Object.freeze({
  motion: Object.freeze([90, 100]),
  central: Object.freeze([75, 89]),
  subsidiary: Object.freeze([55, 74]),
  none: Object.freeze([0, 54])
});

export const V384_RATING_KEYS = Object.freeze([
  "logicalCoherence",
  "evidenceWarrant",
  "responsiveness",
  "relevanceBurden",
  "precisionClarity",
  "epistemicCalibration",
  "representationalCharity"
]);

export function assertV384(condition, message) {
  if (!condition) throw new Error(message);
}

export function roundedMean(a, b) {
  assertV384(Number.isInteger(a) && Number.isInteger(b), "roundedMean inputs must be integers");
  return Math.round((a + b) / 2);
}

export function scalarRequiresDispute(a, b) {
  assertV384(Number.isInteger(a) && Number.isInteger(b), "scalar judgments must be integers");
  return Math.abs(a - b) > V384_SCALAR_DISPUTE_THRESHOLD;
}

export function responseRange(responseClass) {
  const range = V384_RESPONSE_RANGES[responseClass];
  assertV384(range, `unknown response class: ${responseClass}`);
  return range;
}

export function burdenRange(burdenContact) {
  const tier = burdenContact?.tier ?? "none";
  const range = V384_BURDEN_RANGES[tier];
  assertV384(range, `unknown burden tier: ${tier}`);
  return range;
}

export function ratingWithinRange(value, range) {
  return Number.isInteger(value) && value >= range[0] && value <= range[1];
}

export function diagnosticDimensions(ratings) {
  for (const key of V384_RATING_KEYS) {
    assertV384(Number.isInteger(ratings?.[key]), `${key} must be an integer`);
    assertV384(ratings[key] >= 0 && ratings[key] <= 100, `${key} must be from 0 to 100`);
  }
  const calibrationCharity = combineCalibrationCharity({
    epistemicCalibration: ratings.epistemicCalibration,
    representationalCharity: ratings.representationalCharity
  });
  return {
    logicalCoherence: ratings.logicalCoherence,
    evidenceWarrant: ratings.evidenceWarrant,
    responsiveness: ratings.responsiveness,
    relevanceBurden: ratings.relevanceBurden,
    precisionClarity: ratings.precisionClarity,
    calibrationCharity
  };
}

export function diagnosticMoveScore(ratings) {
  return scoreDimensions(diagnosticDimensions(ratings), "v3.8.4 diagnostic ratings");
}

export function unequalRatingKeys(ratingsA, ratingsB) {
  return V384_RATING_KEYS.filter((key) => ratingsA[key] !== ratingsB[key]);
}

export function extractMoveDisputeReasons(judgmentA, judgmentB) {
  const unequal = unequalRatingKeys(judgmentA.ratings, judgmentB.ratings);
  const responseClassMismatch = judgmentA.response.class !== judgmentB.response.class;
  const scalarThresholdKeys = unequal.filter((key) =>
    scalarRequiresDispute(judgmentA.ratings[key], judgmentB.ratings[key])
  );
  const diagnosticDelta = Math.abs(
    diagnosticMoveScore(judgmentA.ratings) - diagnosticMoveScore(judgmentB.ratings)
  );
  const moveTotalTrigger = diagnosticDelta > V384_MOVE_TOTAL_DISPUTE_THRESHOLD;
  return {
    responseClassMismatch,
    scalarThresholdKeys,
    diagnosticMoveScoreDelta: diagnosticDelta,
    moveTotalTrigger,
    exposedRatingKeys: moveTotalTrigger
      ? unequal
      : scalarThresholdKeys
  };
}

function normalizedStrings(values) {
  return [...values].map((value) => value.trim()).sort();
}

export function burdenAdjustmentSemanticTuple(adjustment) {
  const eligibility = adjustment.eligibility;
  return {
    value: adjustment.value,
    distinctDebateWideConsequence: eligibility.distinctDebateWideConsequence,
    affectsBurdenCompletion: eligibility.affectsBurdenCompletion,
    notAlreadyScored: eligibility.notAlreadyScored,
    affectedBurdenIds: normalizedStrings(eligibility.affectedBurdenIds),
    completionCriterion: eligibility.completionCriterion.trim(),
    relatedMoveIds: normalizedStrings(eligibility.relatedMoveIds),
    distinctConsequence: eligibility.distinctConsequence.trim(),
    alreadyCapturedBy: normalizedStrings(eligibility.alreadyCapturedBy),
    counterfactual: eligibility.counterfactual.trim()
  };
}

export function burdenAdjustmentRequiresDispute(adjustmentA, adjustmentB) {
  return JSON.stringify(burdenAdjustmentSemanticTuple(adjustmentA)) !==
    JSON.stringify(burdenAdjustmentSemanticTuple(adjustmentB));
}

export function v384DisplayedLanguagePasses(value) {
  const strings = [];
  function visit(node) {
    if (typeof node === "string") strings.push(node);
    else if (Array.isArray(node)) node.forEach(visit);
    else if (node && typeof node === "object") Object.values(node).forEach(visit);
  }
  visit(value);
  const displayed = strings.join("\n");
  return !/\bunassailable\b/i.test(displayed) &&
    !/immune to (?:rational )?objection/i.test(displayed) &&
    !/rational(?:ly)? invulnerable/i.test(displayed);
}
