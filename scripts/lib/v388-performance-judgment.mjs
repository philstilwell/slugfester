import { readFile } from "node:fs/promises";
import path from "node:path";
import { combineCalibrationCharity, scoreDimensions } from "./reassessment-scoring.mjs";

export const V388_PERFORMANCE_ROOT = "docs/calibration/v3.8.8/performance-judgment-consensus";
export const V388_PERFORMANCE_DEBATES = Object.freeze(["55", "103", "161"]);
export const V388_PERFORMANCE_PASSES = Object.freeze(["A", "B"]);
export const V388_RATING_KEYS = Object.freeze([
  "logicalCoherence",
  "evidenceWarrant",
  "responsiveness",
  "relevanceBurden",
  "precisionClarity",
  "epistemicCalibration",
  "representationalCharity"
]);
export const V388_RESPONSE_CLASSES = Object.freeze([
  "constructive-opening",
  "full-answer",
  "partial-answer",
  "diagnostic-defeat",
  "relevant-nonanswer",
  "justified-reframe",
  "nonanswer"
]);
export const V388_RESPONSE_RANGES = Object.freeze({
  "constructive-opening": Object.freeze([0, 100]),
  "full-answer": Object.freeze([80, 100]),
  "diagnostic-defeat": Object.freeze([80, 100]),
  "justified-reframe": Object.freeze([80, 100]),
  "partial-answer": Object.freeze([55, 79]),
  "relevant-nonanswer": Object.freeze([40, 69]),
  nonanswer: Object.freeze([0, 39])
});
export const V388_BURDEN_RANGES = Object.freeze({
  motion: Object.freeze([90, 100]),
  central: Object.freeze([75, 89]),
  subsidiary: Object.freeze([55, 74]),
  none: Object.freeze([0, 54])
});
export const V388_SCALAR_DISPUTE_THRESHOLD = 5;
export const V388_DIAGNOSTIC_MOVE_DELTA_THRESHOLD = 4;

export function assertV388(condition, message) {
  if (!condition) throw new Error(message);
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function containsProhibitedDerivedField(value, trail = []) {
  if (Array.isArray(value)) return value.some((item, index) => containsProhibitedDerivedField(item, [...trail, index]));
  if (!value || typeof value !== "object") return false;
  const prohibited = /^(moveScore|sectionScore|sectionScores|overall|overallScore|winner|winnerLabel|critique|overallCommentary|aiExtension|finalScore|total)$/i;
  return Object.entries(value).some(([key, item]) => prohibited.test(key) || containsProhibitedDerivedField(item, [...trail, key]));
}

export function makeV388PerformanceSchema() {
  const rating = {
    type: "object",
    additionalProperties: false,
    required: ["value", "rationale"],
    properties: {
      value: { type: "integer", minimum: 0, maximum: 100 },
      rationale: { type: "string", minLength: 40 }
    }
  };
  const burdenContact = {
    anyOf: [
      { type: "null" },
      {
        type: "object",
        additionalProperties: false,
        required: ["polarity", "tier", "bridgeId"],
        properties: {
          polarity: { type: "string", enum: ["support", "attack"] },
          tier: { type: "string", enum: ["motion", "central", "subsidiary"] },
          bridgeId: { type: "string", minLength: 1 }
        }
      }
    ]
  };
  const eligibility = {
    type: "object",
    additionalProperties: false,
    required: ["distinctDebateWideConsequence", "affectsBurdenCompletion", "notAlreadyScored", "affectedBurdenIds", "completionCriterion", "relatedMoveIds", "distinctConsequence", "alreadyCapturedBy", "counterfactual"],
    properties: {
      distinctDebateWideConsequence: { type: "boolean" },
      affectsBurdenCompletion: { type: "boolean" },
      notAlreadyScored: { type: "boolean" },
      affectedBurdenIds: { type: "array", items: { type: "string", minLength: 1 } },
      completionCriterion: { type: "string", minLength: 1 },
      relatedMoveIds: { type: "array", items: { type: "string", minLength: 1 } },
      distinctConsequence: { type: "string", minLength: 1 },
      alreadyCapturedBy: { type: "array", items: { type: "string", minLength: 1 } },
      counterfactual: { type: "string", minLength: 1 }
    }
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-v388-performance-judgment-pass",
    title: "Slugfester v3.8.8 shared performance judgment pass",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "debateNumber", "debateId", "pass", "reviewerRole", "assessmentModel", "calibrationOnly", "isolation", "moveJudgments", "burdenCompletionAdjustment", "audit"],
    properties: {
      schemaVersion: { type: "string", const: "3.8.8-performance-judgment-output" },
      protocolId: { type: "string", const: "v3.8.8-performance-judgment-consensus" },
      debateNumber: { type: "string", minLength: 1 },
      debateId: { type: "string", minLength: 1 },
      pass: { type: "string", enum: ["A", "B"] },
      reviewerRole: { type: "string", const: "performance-judge" },
      assessmentModel: { type: "string", const: "5.6 Sol" },
      calibrationOnly: { type: "boolean", const: true },
      isolation: {
        type: "object",
        additionalProperties: false,
        required: ["otherPassUnavailable", "legacyAssessmentsUnavailable", "calculatedTotalsUnavailable", "winnerLabelsUnavailable", "assessmentProseUnavailable", "contaminationDetected"],
        properties: {
          otherPassUnavailable: { type: "boolean", const: true },
          legacyAssessmentsUnavailable: { type: "boolean", const: true },
          calculatedTotalsUnavailable: { type: "boolean", const: true },
          winnerLabelsUnavailable: { type: "boolean", const: true },
          assessmentProseUnavailable: { type: "boolean", const: true },
          contaminationDetected: { type: "boolean", const: false }
        }
      },
      moveJudgments: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["moveId", "sectionId", "side", "speaker", "sourceSpan", "lockedBurdenContact", "response", "ratings", "charityTested", "evidenceBasis", "assessmentConfidence"],
          properties: {
            moveId: { type: "string", minLength: 1 },
            sectionId: { type: "string", minLength: 1 },
            side: { type: "string", enum: ["pro", "con"] },
            speaker: { type: "string", minLength: 1 },
            sourceSpan: {
              type: "object",
              additionalProperties: false,
              required: ["startEvent", "endEvent", "startMs", "endMs"],
              properties: {
                startEvent: { type: "integer", minimum: 0 },
                endEvent: { type: "integer", minimum: 0 },
                startMs: { type: "integer", minimum: 0 },
                endMs: { type: "integer", minimum: 1 }
              }
            },
            lockedBurdenContact: burdenContact,
            response: {
              type: "object",
              additionalProperties: false,
              required: ["class", "decisiveTargetIds", "contactedComponents", "totalComponents", "contactedComponentSummary", "missedComponentSummary", "rationale"],
              properties: {
                class: { type: "string", enum: V388_RESPONSE_CLASSES },
                decisiveTargetIds: { type: "array", items: { type: "string", minLength: 1 } },
                contactedComponents: { type: "integer", minimum: 0 },
                totalComponents: { type: "integer", minimum: 0 },
                contactedComponentSummary: { type: "string" },
                missedComponentSummary: { type: "string" },
                rationale: { type: "string", minLength: 60 }
              }
            },
            ratings: {
              type: "object",
              additionalProperties: false,
              required: V388_RATING_KEYS,
              properties: Object.fromEntries(V388_RATING_KEYS.map((key) => [key, rating]))
            },
            charityTested: { type: "boolean" },
            evidenceBasis: { type: "string", minLength: 40 },
            assessmentConfidence: { type: "string", enum: ["high", "medium", "low"] }
          }
        }
      },
      burdenCompletionAdjustment: {
        type: "object",
        additionalProperties: false,
        required: ["pro", "con"],
        properties: Object.fromEntries(["pro", "con"].map((side) => [side, {
          type: "object",
          additionalProperties: false,
          required: ["value", "rationale", "eligibility"],
          properties: {
            value: { type: "integer", minimum: -5, maximum: 5 },
            rationale: { type: "string", minLength: 40 },
            eligibility
          }
        }]))
      },
      audit: {
        type: "object",
        additionalProperties: false,
        required: ["moveCount", "allMovesJudgedOnce", "lockedFieldsCopied", "responseAnchorsApplied", "burdenAnchorsApplied", "charityAnchorApplied", "burdenExclusionRuleApplied", "calculatedTotalsAbsent"],
        properties: {
          moveCount: { type: "integer", minimum: 1 },
          allMovesJudgedOnce: { type: "boolean", const: true },
          lockedFieldsCopied: { type: "boolean", const: true },
          responseAnchorsApplied: { type: "boolean", const: true },
          burdenAnchorsApplied: { type: "boolean", const: true },
          charityAnchorApplied: { type: "boolean", const: true },
          burdenExclusionRuleApplied: { type: "boolean", const: true },
          calculatedTotalsAbsent: { type: "boolean", const: true }
        }
      }
    }
  };
}

function assertObjectShape(object, allowedKeys, label) {
  assertV388(object && typeof object === "object" && !Array.isArray(object), `${label}: expected object`);
  const unexpected = Object.keys(object).filter((key) => !allowedKeys.includes(key));
  assertV388(unexpected.length === 0, `${label}: unexpected keys ${unexpected.join(", ")}`);
}

function assertString(value, minimum, label) {
  assertV388(typeof value === "string" && value.trim().length >= minimum, `${label}: string shorter than ${minimum}`);
}

function assertRating(rating, label) {
  assertObjectShape(rating, ["value", "rationale"], label);
  assertV388(Number.isInteger(rating.value) && rating.value >= 0 && rating.value <= 100, `${label}: value outside 0..100`);
  assertString(rating.rationale, 40, `${label}.rationale`);
}

function responseTuple(response) {
  return {
    class: response.class,
    decisiveTargetIds: [...response.decisiveTargetIds].sort(),
    contactedComponents: response.contactedComponents,
    totalComponents: response.totalComponents
  };
}

export function performanceResponseTuple(response) {
  return responseTuple(response);
}

export function validateV388PerformanceOutput(output, packet, expectedPass) {
  const schema = makeV388PerformanceSchema();
  assertObjectShape(output, schema.required, "output");
  assertV388(output.schemaVersion === "3.8.8-performance-judgment-output", "schemaVersion mismatch");
  assertV388(output.protocolId === "v3.8.8-performance-judgment-consensus", "protocolId mismatch");
  assertV388(output.debateNumber === packet.debateNumber && output.debateId === packet.debateId, "debate identity mismatch");
  assertV388(output.pass === expectedPass && V388_PERFORMANCE_PASSES.includes(output.pass), "pass mismatch");
  assertV388(output.reviewerRole === "performance-judge" && output.assessmentModel === "5.6 Sol" && output.calibrationOnly === true, "reviewer boundary mismatch");
  assertV388(!containsProhibitedDerivedField(output), "model output contains a prohibited derived score or prose field");
  assertObjectShape(output.isolation, Object.keys(schema.properties.isolation.properties), "isolation");
  for (const [key, definition] of Object.entries(schema.properties.isolation.properties)) assertV388(output.isolation[key] === definition.const, `isolation.${key} mismatch`);
  assertV388(Array.isArray(output.moveJudgments) && output.moveJudgments.length === packet.moves.length, "move count mismatch");
  const moveIds = new Set(packet.moves.map((move) => move.moveId));
  const bridgeIds = new Set(packet.routes.flatMap((route) => route.bridges.map((bridge) => bridge.bridgeId)));
  for (let index = 0; index < packet.moves.length; index += 1) {
    const locked = packet.moves[index];
    const judgment = output.moveJudgments[index];
    const label = `moveJudgments[${index}]`;
    assertObjectShape(judgment, ["moveId", "sectionId", "side", "speaker", "sourceSpan", "lockedBurdenContact", "response", "ratings", "charityTested", "evidenceBasis", "assessmentConfidence"], label);
    for (const key of ["moveId", "sectionId", "side", "speaker"]) assertV388(judgment[key] === locked[key], `${label}.${key} differs from lock`);
    assertV388(canonicalJson(judgment.sourceSpan) === canonicalJson(locked.sourceSpan), `${label}.sourceSpan differs from lock`);
    assertV388(canonicalJson(judgment.lockedBurdenContact) === canonicalJson(locked.lockedBurdenContact), `${label}.lockedBurdenContact differs from lock`);
    const response = judgment.response;
    assertObjectShape(response, ["class", "decisiveTargetIds", "contactedComponents", "totalComponents", "contactedComponentSummary", "missedComponentSummary", "rationale"], `${label}.response`);
    assertV388(V388_RESPONSE_CLASSES.includes(response.class), `${label}: unknown response class`);
    assertV388(Array.isArray(response.decisiveTargetIds) && new Set(response.decisiveTargetIds).size === response.decisiveTargetIds.length, `${label}: target IDs must be unique`);
    assertV388(response.decisiveTargetIds.every((id) => locked.allowedResponseTargetIds.includes(id)), `${label}: target outside locked response links`);
    assertV388(Number.isInteger(response.contactedComponents) && Number.isInteger(response.totalComponents), `${label}: response component counts must be integers`);
    assertV388(response.contactedComponents >= 0 && response.totalComponents >= 0 && response.contactedComponents <= response.totalComponents, `${label}: invalid response component counts`);
    assertString(response.rationale, 60, `${label}.response.rationale`);
    const constructive = response.class === "constructive-opening";
    if (constructive) {
      assertV388(locked.moveKind === "constructive", `${label}: only a constructive move may be constructive-opening`);
      assertV388(response.decisiveTargetIds.length === 0 && response.contactedComponents === 0 && response.totalComponents === 0, `${label}: constructive-opening must have an empty response tuple`);
      assertV388(response.contactedComponentSummary === "" && response.missedComponentSummary === "", `${label}: constructive-opening component summaries must be empty`);
    } else {
      assertV388(locked.moveKind !== "constructive", `${label}: constructive move assigned a responsive class`);
      assertV388(response.decisiveTargetIds.length >= 1 && response.totalComponents >= 1, `${label}: responsive class requires a locked target and at least one component`);
    }
    if (response.class === "full-answer") {
      assertV388(response.contactedComponents === response.totalComponents, `${label}: full answer must contact every indispensable component`);
      assertString(response.contactedComponentSummary, 12, `${label}.contactedComponentSummary`);
      assertV388(response.missedComponentSummary === "", `${label}: full answer cannot name a missed component`);
    }
    if (response.class === "partial-answer") {
      assertV388(response.totalComponents >= 2 && response.contactedComponents >= 1 && response.contactedComponents < response.totalComponents, `${label}: partial answer must contact some but not all of at least two components`);
      assertString(response.contactedComponentSummary, 12, `${label}.contactedComponentSummary`);
      assertString(response.missedComponentSummary, 12, `${label}.missedComponentSummary`);
    }
    if (["relevant-nonanswer", "nonanswer"].includes(response.class)) {
      assertV388(response.contactedComponents === 0, `${label}: nonanswer class cannot contact an indispensable component`);
      assertV388(response.contactedComponentSummary === "", `${label}: nonanswer contact summary must be empty`);
      assertString(response.missedComponentSummary, 12, `${label}.missedComponentSummary`);
    }
    if (["diagnostic-defeat", "justified-reframe"].includes(response.class)) {
      assertV388(response.contactedComponents >= 1, `${label}: diagnostic defeat or justified reframe must identify contact`);
      assertString(response.contactedComponentSummary, 12, `${label}.contactedComponentSummary`);
    }
    assertObjectShape(judgment.ratings, V388_RATING_KEYS, `${label}.ratings`);
    for (const key of V388_RATING_KEYS) assertRating(judgment.ratings[key], `${label}.ratings.${key}`);
    const responseValue = judgment.ratings.responsiveness.value;
    const responseRange = V388_RESPONSE_RANGES[response.class];
    assertV388(responseValue >= responseRange[0] && responseValue <= responseRange[1], `${label}: responsiveness outside class band`);
    const burdenTier = judgment.lockedBurdenContact?.tier ?? "none";
    const burdenRange = V388_BURDEN_RANGES[burdenTier];
    const burdenValue = judgment.ratings.relevanceBurden.value;
    assertV388(burdenValue >= burdenRange[0] && burdenValue <= burdenRange[1], `${label}: relevance/burden outside locked tier band`);
    assertV388(typeof judgment.charityTested === "boolean", `${label}: charityTested must be boolean`);
    if (!judgment.charityTested) {
      assertV388(judgment.ratings.representationalCharity.value === 75, `${label}: untested charity must equal 75`);
      assertV388(/not tested/i.test(judgment.ratings.representationalCharity.rationale), `${label}: untested charity rationale must say not tested`);
    } else assertV388(!/not tested/i.test(judgment.ratings.representationalCharity.rationale), `${label}: tested charity rationale contradicts flag`);
    assertString(judgment.evidenceBasis, 40, `${label}.evidenceBasis`);
    assertV388(["high", "medium", "low"].includes(judgment.assessmentConfidence), `${label}: invalid assessment confidence`);
  }
  assertV388(new Set(output.moveJudgments.map((move) => move.moveId)).size === packet.moves.length, "move judgments must be unique");
  assertObjectShape(output.burdenCompletionAdjustment, ["pro", "con"], "burdenCompletionAdjustment");
  for (const side of ["pro", "con"]) validateAdjustment(output.burdenCompletionAdjustment[side], side, moveIds, bridgeIds);
  assertObjectShape(output.audit, Object.keys(schema.properties.audit.properties), "audit");
  assertV388(output.audit.moveCount === packet.moves.length, "audit moveCount mismatch");
  for (const [key, definition] of Object.entries(schema.properties.audit.properties)) if (key !== "moveCount") assertV388(output.audit[key] === definition.const, `audit.${key} mismatch`);
  return { status: "passed", debateNumber: packet.debateNumber, pass: expectedPass, moves: packet.moves.length, scoreFields: 0, calculatedTotals: 0 };
}

function validateAdjustment(adjustment, side, moveIds, bridgeIds) {
  const label = `burdenCompletionAdjustment.${side}`;
  assertObjectShape(adjustment, ["value", "rationale", "eligibility"], label);
  assertV388(Number.isInteger(adjustment.value) && adjustment.value >= -5 && adjustment.value <= 5, `${label}: value outside -5..5`);
  assertString(adjustment.rationale, 40, `${label}.rationale`);
  const eligibility = adjustment.eligibility;
  const keys = ["distinctDebateWideConsequence", "affectsBurdenCompletion", "notAlreadyScored", "affectedBurdenIds", "completionCriterion", "relatedMoveIds", "distinctConsequence", "alreadyCapturedBy", "counterfactual"];
  assertObjectShape(eligibility, keys, `${label}.eligibility`);
  for (const key of ["distinctDebateWideConsequence", "affectsBurdenCompletion", "notAlreadyScored"]) assertV388(typeof eligibility[key] === "boolean", `${label}.${key} must be boolean`);
  for (const key of ["affectedBurdenIds", "relatedMoveIds", "alreadyCapturedBy"]) assertV388(Array.isArray(eligibility[key]) && new Set(eligibility[key]).size === eligibility[key].length, `${label}.${key} must be a unique array`);
  assertV388(eligibility.affectedBurdenIds.every((id) => bridgeIds.has(id)), `${label}: unknown affected burden ID`);
  assertV388(eligibility.relatedMoveIds.every((id) => moveIds.has(id)), `${label}: unknown related move ID`);
  for (const key of ["completionCriterion", "distinctConsequence", "counterfactual"]) assertString(eligibility[key], 1, `${label}.${key}`);
  if (eligibility.alreadyCapturedBy.length > 0 || !eligibility.notAlreadyScored) assertV388(adjustment.value === 0, `${label}: duplicate capture forces zero`);
  if (adjustment.value !== 0) {
    assertV388(eligibility.distinctDebateWideConsequence && eligibility.affectsBurdenCompletion && eligibility.notAlreadyScored, `${label}: nonzero value fails all-three eligibility test`);
    assertV388(eligibility.affectedBurdenIds.length > 0 && eligibility.relatedMoveIds.length > 0 && eligibility.alreadyCapturedBy.length === 0, `${label}: nonzero value lacks named burden/move evidence or contains duplicate capture`);
    for (const key of ["completionCriterion", "distinctConsequence", "counterfactual"]) assertString(eligibility[key], 30, `${label}.${key}`);
  }
}

function flatRatings(judgment) {
  return Object.fromEntries(V388_RATING_KEYS.map((key) => [key, judgment.ratings[key].value]));
}

export function diagnosticMoveScore(judgment) {
  const ratings = flatRatings(judgment);
  const calibrationCharity = combineCalibrationCharity({ epistemicCalibration: ratings.epistemicCalibration, representationalCharity: ratings.representationalCharity });
  return scoreDimensions({ logicalCoherence: ratings.logicalCoherence, evidenceWarrant: ratings.evidenceWarrant, responsiveness: ratings.responsiveness, relevanceBurden: ratings.relevanceBurden, precisionClarity: ratings.precisionClarity, calibrationCharity }, "v3.8.8 diagnostic raw judgments");
}

export function extractV388MoveDisagreement(judgmentA, judgmentB) {
  const responseMismatch = canonicalJson(responseTuple(judgmentA.response)) !== canonicalJson(responseTuple(judgmentB.response));
  const charityTestedMismatch = judgmentA.charityTested !== judgmentB.charityTested;
  const unequalRatingKeys = V388_RATING_KEYS.filter((key) => judgmentA.ratings[key].value !== judgmentB.ratings[key].value);
  const materialRatingKeys = unequalRatingKeys.filter((key) => Math.abs(judgmentA.ratings[key].value - judgmentB.ratings[key].value) > V388_SCALAR_DISPUTE_THRESHOLD);
  const diagnosticDelta = Math.abs(diagnosticMoveScore(judgmentA) - diagnosticMoveScore(judgmentB));
  const diagnosticTrigger = diagnosticDelta > V388_DIAGNOSTIC_MOVE_DELTA_THRESHOLD;
  return {
    responseMismatch,
    charityTestedMismatch,
    materialRatingKeys,
    diagnosticDelta,
    diagnosticTrigger,
    exposedRatingKeys: diagnosticTrigger ? unequalRatingKeys : materialRatingKeys,
    disputed: responseMismatch || charityTestedMismatch || materialRatingKeys.length > 0 || diagnosticTrigger
  };
}

export async function readJson(relativePath, root = process.cwd()) {
  return JSON.parse(await readFile(path.resolve(root, relativePath), "utf8"));
}
