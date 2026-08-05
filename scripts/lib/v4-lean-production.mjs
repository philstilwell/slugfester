import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { combineCalibrationCharity, scoreDimensions } from "./reassessment-scoring.mjs";

export const V4_LEAN_ROOT = "docs/calibration/v4.0.1/lean-retired-gate";
export const V4_LEAN_DEBATES = Object.freeze(["55", "103", "161"]);
export const V4_RATING_KEYS = Object.freeze([
  "logicalCoherence",
  "evidenceWarrant",
  "responsiveness",
  "relevanceBurden",
  "precisionClarity",
  "epistemicCalibration",
  "representationalCharity"
]);
export const V4_MODEL_RATING_KEYS = Object.freeze([
  "logicalCoherence",
  "evidenceWarrant",
  "responsiveness",
  "relevanceBurden",
  "representationalCharity"
]);
export const V4_RESPONSE_CLASSES = Object.freeze([
  "constructive-opening",
  "full-answer",
  "partial-answer",
  "diagnostic-defeat",
  "relevant-nonanswer",
  "justified-reframe",
  "nonanswer"
]);
export const V4_RESPONSE_RANGES = Object.freeze({
  "constructive-opening": Object.freeze([0, 100]),
  "full-answer": Object.freeze([80, 100]),
  "diagnostic-defeat": Object.freeze([80, 100]),
  "justified-reframe": Object.freeze([80, 100]),
  "partial-answer": Object.freeze([55, 79]),
  "relevant-nonanswer": Object.freeze([40, 69]),
  nonanswer: Object.freeze([0, 39])
});
export const V4_BURDEN_RANGES = Object.freeze({
  motion: Object.freeze([90, 100]),
  central: Object.freeze([75, 89]),
  subsidiary: Object.freeze([55, 74]),
  none: Object.freeze([0, 54])
});
export const V4_SCORE_BAND_BOUNDARIES = Object.freeze([25, 50, 65, 75, 85, 95]);
export const V4_TRIGGER_POLICY = Object.freeze({
  controlSampleRate: 0.1,
  winnerMarginMaximum: 5,
  bandBoundaryDistanceMaximum: 2,
  highImportance: 3,
  targetEscalationRate: 0.15,
  operatingObjectiveFailureRate: 0.25
});
export const V4_COMPUTE_ASSUMPTIONS = Object.freeze({
  debateCount: 195,
  primaryMinutesPerDebate: 7.75,
  finalizationMinutesPerDebate: 4.25,
  escalationRate: 0.15,
  passBMinutesPerEscalatedDebate: 7.75,
  adjudicationShareOfEscalations: 0.5,
  adjudicationMinutesPerAdjudicatedDebate: 5.6,
  fixedAudioQaRenderingHours: 5
});

export function assertV4(condition, message) {
  if (!condition) throw new Error(message);
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function containsProhibitedCalculatedField(value) {
  if (Array.isArray(value)) return value.some(containsProhibitedCalculatedField);
  if (!value || typeof value !== "object") return false;
  const prohibited = /^(moveScore|sectionScore|sectionScores|overall|overallScore|winner|winnerLabel|confidenceRange|finalScore|total)$/i;
  return Object.entries(value).some(([key, item]) => prohibited.test(key) || containsProhibitedCalculatedField(item));
}

const ratingSchema = {
  type: "object",
  additionalProperties: false,
  required: ["value", "rationale"],
  properties: {
    value: { type: "integer", minimum: 0, maximum: 100 },
    rationale: { type: "string", minLength: 40 }
  }
};

const adjustmentEligibilitySchema = {
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

export function makeV4PrimarySchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-v401-lean-primary-judgment",
    title: "Slugfester v4.0.1 lean integrated primary judgment",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "debateNumber", "debateId", "reviewerRole", "assessmentModel", "calibrationOnly", "isolation", "routes", "sections", "moves", "burdenCompletionAdjustment", "audit"],
    properties: {
      schemaVersion: { type: "string", const: "4.0.1-lean-primary-output" },
      protocolId: { type: "string", const: "v4.0.1-lean-risk-triggered-consensus" },
      debateNumber: { type: "string", minLength: 1 },
      debateId: { type: "string", minLength: 1 },
      reviewerRole: { type: "string", const: "integrated-primary-judge" },
      assessmentModel: { type: "string", const: "5.6 Sol" },
      calibrationOnly: { type: "boolean", const: true },
      isolation: {
        type: "object",
        additionalProperties: false,
        required: ["legacyAssessmentsUnavailable", "calculatedTotalsUnavailable", "winnerLabelsUnavailable", "otherJudgmentsUnavailable", "assessmentProseUnavailable", "contaminationDetected"],
        properties: {
          legacyAssessmentsUnavailable: { type: "boolean", const: true },
          calculatedTotalsUnavailable: { type: "boolean", const: true },
          winnerLabelsUnavailable: { type: "boolean", const: true },
          otherJudgmentsUnavailable: { type: "boolean", const: true },
          assessmentProseUnavailable: { type: "boolean", const: true },
          contaminationDetected: { type: "boolean", const: false }
        }
      },
      routes: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["routeId", "side", "description", "successCriteria", "bridges"],
          properties: {
            routeId: { type: "string", minLength: 1 },
            side: { type: "string", enum: ["pro", "con"] },
            description: { type: "string", minLength: 40 },
            successCriteria: { type: "string", minLength: 40 },
            bridges: {
              type: "array",
              minItems: 3,
              maxItems: 7,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["bridgeId", "tier", "description"],
                properties: {
                  bridgeId: { type: "string", minLength: 1 },
                  tier: { type: "string", enum: ["motion", "central", "subsidiary"] },
                  description: { type: "string", minLength: 25 }
                }
              }
            }
          }
        }
      },
      sections: {
        type: "array",
        minItems: 4,
        maxItems: 7,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["sectionId", "title", "weightPercent", "rationale"],
          properties: {
            sectionId: { type: "string", minLength: 1 },
            title: { type: "string", minLength: 3 },
            weightPercent: { type: "integer", minimum: 1, maximum: 97 },
            rationale: { type: "string", minLength: 40 }
          }
        }
      },
      moves: {
        type: "array",
        minItems: 8,
        maxItems: 48,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["moveId", "sectionId", "side", "speaker", "moveKind", "proposition", "sourceSpan", "attributionConfidence", "attributionBasis", "importance", "burdenContact", "response", "precisionFindings", "calibrationFindings", "charity", "ratings", "evidenceBasis", "assessmentConfidence"],
          properties: {
            moveId: { type: "string", minLength: 1 },
            sectionId: { type: "string", minLength: 1 },
            side: { type: "string", enum: ["pro", "con"] },
            speaker: { type: "string", minLength: 1 },
            moveKind: { type: "string", enum: ["constructive", "reply"] },
            proposition: { type: "string", minLength: 25 },
            sourceSpan: {
              type: "object",
              additionalProperties: false,
              required: ["startEvent", "endEvent", "startMs", "endMs", "excerpt"],
              properties: {
                startEvent: { type: "integer", minimum: 0 },
                endEvent: { type: "integer", minimum: 0 },
                startMs: { type: "integer", minimum: 0 },
                endMs: { type: "integer", minimum: 1 },
                excerpt: { type: "string", minLength: 30 }
              }
            },
            attributionConfidence: { type: "string", enum: ["high", "medium", "low"] },
            attributionBasis: { type: "string", minLength: 40 },
            importance: { type: "integer", minimum: 1, maximum: 3 },
            burdenContact: {
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
            },
            response: {
              type: "object",
              additionalProperties: false,
              required: ["class", "decisiveTargetIds", "components", "issueBearingContraryMaterial", "diagnosticConsequenceExplicit", "replacementDemandAnswered", "rationale"],
              properties: {
                class: { type: "string", enum: V4_RESPONSE_CLASSES },
                decisiveTargetIds: { type: "array", items: { type: "string", minLength: 1 } },
                components: {
                  type: "array",
                  maxItems: 8,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["componentId", "targetMoveId", "text", "contacted", "decisive"],
                    properties: {
                      componentId: { type: "string", minLength: 1 },
                      targetMoveId: { type: "string", minLength: 1 },
                      text: { type: "string", minLength: 15 },
                      contacted: { type: "boolean" },
                      decisive: { type: "boolean" }
                    }
                  }
                },
                issueBearingContraryMaterial: { type: "boolean" },
                diagnosticConsequenceExplicit: { type: "boolean" },
                replacementDemandAnswered: { type: "boolean" },
                rationale: { type: "string", minLength: 60 }
              }
            },
            precisionFindings: {
              type: "object",
              additionalProperties: false,
              required: ["propositionRecoverability", "termStability", "scopeStability", "qualificationExplicitness", "rationale"],
              properties: {
                propositionRecoverability: { type: "string", enum: ["complete", "partial", "failed"] },
                termStability: { type: "string", enum: ["stable", "partly-unstable", "materially-unstable"] },
                scopeStability: { type: "string", enum: ["stable", "partly-unstable", "materially-unstable"] },
                qualificationExplicitness: { type: "string", enum: ["explicit", "not-needed", "implicit", "missing", "materially-misleading"] },
                rationale: { type: "string", minLength: 40 }
              }
            },
            calibrationFindings: {
              type: "object",
              additionalProperties: false,
              required: ["assertedForce", "warrantFit", "qualificationStatus", "uncertaintyAcknowledged", "rationale"],
              properties: {
                assertedForce: { type: "string", enum: ["question", "possibility", "plausibility", "probability", "strong-probability", "necessity", "certainty"] },
                warrantFit: { type: "string", enum: ["matched", "slightly-overstated", "materially-overstated", "radically-overstated"] },
                qualificationStatus: { type: "string", enum: ["explicit", "not-needed", "implicit", "missing"] },
                uncertaintyAcknowledged: { type: "string", enum: ["yes", "no", "not-needed"] },
                rationale: { type: "string", minLength: 40 }
              }
            },
            charity: {
              type: "object",
              additionalProperties: false,
              required: ["tested", "alternative", "decisiveQualification"],
              properties: {
                tested: { type: "boolean" },
                alternative: { type: "string" },
                decisiveQualification: { type: "string" }
              }
            },
            ratings: {
              type: "object",
              additionalProperties: false,
              required: V4_MODEL_RATING_KEYS,
              properties: Object.fromEntries(V4_MODEL_RATING_KEYS.map((key) => [key, ratingSchema]))
            },
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
            eligibility: adjustmentEligibilitySchema
          }
        }]))
      },
      audit: {
        type: "object",
        additionalProperties: false,
        required: ["completeTranscriptReviewed", "allLoadBearingLinesRepresented", "allMovesJudgedOnce", "sectionWeightsLockedBeforeRatings", "responseComponentsApplied", "closedPrecisionAnchorsApplied", "closedCalibrationAnchorsApplied", "charityAnchorApplied", "burdenExclusionRuleApplied", "calculatedTotalsAbsent"],
        properties: Object.fromEntries(["completeTranscriptReviewed", "allLoadBearingLinesRepresented", "allMovesJudgedOnce", "sectionWeightsLockedBeforeRatings", "responseComponentsApplied", "closedPrecisionAnchorsApplied", "closedCalibrationAnchorsApplied", "charityAnchorApplied", "burdenExclusionRuleApplied", "calculatedTotalsAbsent"].map((key) => [key, { type: "boolean", const: true }]))
      }
    }
  };
}

function assertObjectShape(object, allowedKeys, label) {
  assertV4(object && typeof object === "object" && !Array.isArray(object), `${label}: expected object`);
  const unexpected = Object.keys(object).filter((key) => !allowedKeys.includes(key));
  const missing = allowedKeys.filter((key) => !Object.hasOwn(object, key));
  assertV4(unexpected.length === 0, `${label}: unexpected keys ${unexpected.join(", ")}`);
  assertV4(missing.length === 0, `${label}: missing keys ${missing.join(", ")}`);
}

function assertString(value, minimum, label) {
  assertV4(typeof value === "string" && value.trim().length >= minimum, `${label}: string shorter than ${minimum}`);
}

function assertUniqueStrings(values, label) {
  assertV4(Array.isArray(values) && values.every((value) => typeof value === "string" && value.length > 0), `${label}: expected string array`);
  assertV4(new Set(values).size === values.length, `${label}: duplicate values`);
}

function assertRating(rating, label) {
  assertObjectShape(rating, ["value", "rationale"], label);
  assertV4(Number.isInteger(rating.value) && rating.value >= 0 && rating.value <= 100, `${label}: value outside 0..100`);
  assertString(rating.rationale, 40, `${label}.rationale`);
}

export function permittedPrecisionRange(findings) {
  if (findings.propositionRecoverability === "failed") return [0, 49];
  if (findings.termStability === "materially-unstable" || findings.scopeStability === "materially-unstable" || findings.qualificationExplicitness === "materially-misleading") return [50, 69];
  if (findings.propositionRecoverability === "partial" || findings.termStability === "partly-unstable" || findings.scopeStability === "partly-unstable" || findings.qualificationExplicitness === "missing") return [70, 79];
  if (findings.qualificationExplicitness === "implicit") return [80, 89];
  return [90, 100];
}

export function derivePrecisionClarity(findings) {
  const [minimum, maximum] = permittedPrecisionRange(findings);
  return { value: { 0: 35, 50: 60, 70: 75, 80: 85, 90: 95 }[minimum], range: [minimum, maximum] };
}

export function permittedCalibrationRange(findings) {
  if (findings.warrantFit === "radically-overstated") return [0, 49];
  if (findings.warrantFit === "materially-overstated") return [50, 69];
  if (findings.warrantFit === "slightly-overstated") return [70, 79];
  if (["explicit", "not-needed"].includes(findings.qualificationStatus) && ["yes", "not-needed"].includes(findings.uncertaintyAcknowledged)) return [90, 100];
  return [80, 89];
}

export function deriveEpistemicCalibration(findings) {
  const [minimum, maximum] = permittedCalibrationRange(findings);
  return { value: { 0: 35, 50: 60, 70: 75, 80: 85, 90: 95 }[minimum], range: [minimum, maximum] };
}

function validateAdjustment(adjustment, side, moveIds, bridgeIds) {
  const label = `burdenCompletionAdjustment.${side}`;
  assertObjectShape(adjustment, ["value", "rationale", "eligibility"], label);
  assertV4(Number.isInteger(adjustment.value) && adjustment.value >= -5 && adjustment.value <= 5, `${label}: value outside -5..5`);
  assertString(adjustment.rationale, 40, `${label}.rationale`);
  const eligibility = adjustment.eligibility;
  const keys = ["distinctDebateWideConsequence", "affectsBurdenCompletion", "notAlreadyScored", "affectedBurdenIds", "completionCriterion", "relatedMoveIds", "distinctConsequence", "alreadyCapturedBy", "counterfactual"];
  assertObjectShape(eligibility, keys, `${label}.eligibility`);
  for (const key of ["distinctDebateWideConsequence", "affectsBurdenCompletion", "notAlreadyScored"]) assertV4(typeof eligibility[key] === "boolean", `${label}.${key}: expected boolean`);
  for (const key of ["affectedBurdenIds", "relatedMoveIds", "alreadyCapturedBy"]) assertUniqueStrings(eligibility[key], `${label}.${key}`);
  assertV4(eligibility.affectedBurdenIds.every((id) => bridgeIds.has(id)), `${label}: unknown burden ID`);
  assertV4(eligibility.relatedMoveIds.every((id) => moveIds.has(id)), `${label}: unknown move ID`);
  for (const key of ["completionCriterion", "distinctConsequence", "counterfactual"]) assertString(eligibility[key], 1, `${label}.${key}`);
  if (eligibility.alreadyCapturedBy.length > 0 || !eligibility.notAlreadyScored) assertV4(adjustment.value === 0, `${label}: duplicate capture forces zero`);
  if (adjustment.value !== 0) {
    assertV4(eligibility.distinctDebateWideConsequence && eligibility.affectsBurdenCompletion && eligibility.notAlreadyScored, `${label}: nonzero adjustment fails eligibility`);
    assertV4(eligibility.affectedBurdenIds.length > 0 && eligibility.relatedMoveIds.length > 0 && eligibility.alreadyCapturedBy.length === 0, `${label}: nonzero adjustment lacks evidence or has duplicate capture`);
    for (const key of ["completionCriterion", "distinctConsequence", "counterfactual"]) assertString(eligibility[key], 30, `${label}.${key}`);
  }
}

export function validateV4PrimaryOutput(output, packet, { additionalAdjustmentBurdenIds = [] } = {}) {
  const schema = makeV4PrimarySchema();
  assertObjectShape(output, schema.required, "output");
  assertV4(output.schemaVersion === "4.0.1-lean-primary-output" && output.protocolId === "v4.0.1-lean-risk-triggered-consensus", "protocol identity mismatch");
  assertV4(output.debateNumber === packet.debateNumber && output.debateId === packet.debateId, "debate identity mismatch");
  assertV4(output.reviewerRole === "integrated-primary-judge" && output.assessmentModel === "5.6 Sol" && output.calibrationOnly === true, "reviewer boundary mismatch");
  assertV4(!containsProhibitedCalculatedField(output), "primary output contains a prohibited calculated field");
  assertObjectShape(output.isolation, Object.keys(schema.properties.isolation.properties), "isolation");
  for (const [key, definition] of Object.entries(schema.properties.isolation.properties)) assertV4(output.isolation[key] === definition.const, `isolation.${key} mismatch`);

  assertV4(Array.isArray(output.routes) && output.routes.length === 2, "exactly two routes required");
  const routeSides = output.routes.map((route) => route.side).sort();
  assertV4(canonicalJson(routeSides) === canonicalJson(["con", "pro"]), "one route per side required");
  const bridgeIds = new Set();
  for (const [index, route] of output.routes.entries()) {
    const label = `routes[${index}]`;
    assertObjectShape(route, ["routeId", "side", "description", "successCriteria", "bridges"], label);
    assertString(route.routeId, 1, `${label}.routeId`);
    assertString(route.description, 40, `${label}.description`);
    assertString(route.successCriteria, 40, `${label}.successCriteria`);
    assertV4(Array.isArray(route.bridges) && route.bridges.length >= 3 && route.bridges.length <= 7, `${label}: bridge count outside 3..7`);
    const tiers = route.bridges.map((bridge) => bridge.tier);
    assertV4(tiers.filter((tier) => tier === "motion").length === 1 && tiers.filter((tier) => tier === "central").length >= 1 && tiers.includes("subsidiary"), `${label}: route requires one motion, at least one central, and at least one subsidiary bridge`);
    for (const bridge of route.bridges) {
      assertObjectShape(bridge, ["bridgeId", "tier", "description"], `${label}.bridge`);
      assertV4(!bridgeIds.has(bridge.bridgeId), `${label}: duplicate bridge ID`);
      bridgeIds.add(bridge.bridgeId);
      assertString(bridge.description, 25, `${label}.bridge.description`);
    }
  }

  assertV4(Array.isArray(output.sections) && output.sections.length >= 4 && output.sections.length <= 7, "section count outside 4..7");
  const sectionIds = output.sections.map((section) => section.sectionId);
  assertUniqueStrings(sectionIds, "section IDs");
  assertV4(output.sections.reduce((sum, section) => sum + section.weightPercent, 0) === 100, "section weights must total 100");
  for (const [index, section] of output.sections.entries()) {
    assertObjectShape(section, ["sectionId", "title", "weightPercent", "rationale"], `sections[${index}]`);
    assertV4(Number.isInteger(section.weightPercent) && section.weightPercent >= 1, `sections[${index}]: invalid weight`);
    assertString(section.title, 3, `sections[${index}].title`);
    assertString(section.rationale, 40, `sections[${index}].rationale`);
  }

  assertV4(Array.isArray(output.moves) && output.moves.length >= 8 && output.moves.length <= 48, "move count outside 8..48");
  const moveIds = output.moves.map((move) => move.moveId);
  assertUniqueStrings(moveIds, "move IDs");
  const moveIndex = new Map(moveIds.map((id, index) => [id, index]));
  const speakersBySide = Object.fromEntries(["pro", "con"].map((side) => [side, new Set(packet.sides[side].speakers)]));
  for (const [index, move] of output.moves.entries()) {
    const label = `moves[${index}]`;
    const keys = ["moveId", "sectionId", "side", "speaker", "moveKind", "proposition", "sourceSpan", "attributionConfidence", "attributionBasis", "importance", "burdenContact", "response", "precisionFindings", "calibrationFindings", "charity", "ratings", "evidenceBasis", "assessmentConfidence"];
    assertObjectShape(move, keys, label);
    assertV4(sectionIds.includes(move.sectionId), `${label}: unknown section`);
    assertV4(["pro", "con"].includes(move.side) && speakersBySide[move.side].has(move.speaker), `${label}: speaker/side mismatch`);
    assertV4(["constructive", "reply"].includes(move.moveKind), `${label}: invalid move kind`);
    assertString(move.proposition, 25, `${label}.proposition`);
    assertObjectShape(move.sourceSpan, ["startEvent", "endEvent", "startMs", "endMs", "excerpt"], `${label}.sourceSpan`);
    assertV4(Number.isInteger(move.sourceSpan.startEvent) && Number.isInteger(move.sourceSpan.endEvent) && move.sourceSpan.startEvent >= 0 && move.sourceSpan.startEvent <= move.sourceSpan.endEvent && move.sourceSpan.endEvent < packet.eventCount, `${label}: invalid event span`);
    assertV4(Number.isInteger(move.sourceSpan.startMs) && Number.isInteger(move.sourceSpan.endMs) && move.sourceSpan.startMs >= 0 && move.sourceSpan.startMs < move.sourceSpan.endMs && move.sourceSpan.endMs <= packet.durationSeconds * 1000, `${label}: invalid time span`);
    assertString(move.sourceSpan.excerpt, 30, `${label}.sourceSpan.excerpt`);
    assertV4(["high", "medium", "low"].includes(move.attributionConfidence), `${label}: invalid attribution confidence`);
    assertString(move.attributionBasis, 40, `${label}.attributionBasis`);
    assertV4(Number.isInteger(move.importance) && move.importance >= 1 && move.importance <= 3, `${label}: invalid importance`);
    if (move.burdenContact !== null) {
      assertObjectShape(move.burdenContact, ["polarity", "tier", "bridgeId"], `${label}.burdenContact`);
      assertV4(bridgeIds.has(move.burdenContact.bridgeId), `${label}: unknown bridge ID`);
      const bridge = output.routes.flatMap((route) => route.bridges).find((item) => item.bridgeId === move.burdenContact.bridgeId);
      assertV4(bridge.tier === move.burdenContact.tier, `${label}: burden tier does not match bridge`);
    }

    const response = move.response;
    assertObjectShape(response, ["class", "decisiveTargetIds", "components", "issueBearingContraryMaterial", "diagnosticConsequenceExplicit", "replacementDemandAnswered", "rationale"], `${label}.response`);
    assertV4(V4_RESPONSE_CLASSES.includes(response.class), `${label}: invalid response class`);
    assertUniqueStrings(response.decisiveTargetIds, `${label}.response.decisiveTargetIds`);
    assertV4(Array.isArray(response.components) && response.components.length <= 8, `${label}: invalid component array`);
    assertString(response.rationale, 60, `${label}.response.rationale`);
    if (move.moveKind === "constructive") {
      assertV4(response.class === "constructive-opening" && response.decisiveTargetIds.length === 0 && response.components.length === 0, `${label}: constructive response tuple invalid`);
    } else {
      assertV4(response.class !== "constructive-opening" && response.decisiveTargetIds.length > 0 && response.components.length > 0, `${label}: reply requires targets and components`);
      for (const targetId of response.decisiveTargetIds) assertV4(moveIndex.has(targetId) && moveIndex.get(targetId) < index, `${label}: response target must be an earlier move`);
      const componentIds = response.components.map((component) => component.componentId);
      assertUniqueStrings(componentIds, `${label}.response.componentIds`);
      for (const component of response.components) {
        assertObjectShape(component, ["componentId", "targetMoveId", "text", "contacted", "decisive"], `${label}.response.component`);
        assertV4(response.decisiveTargetIds.includes(component.targetMoveId), `${label}: component target not selected`);
        assertString(component.text, 15, `${label}.response.component.text`);
        assertV4(typeof component.contacted === "boolean" && typeof component.decisive === "boolean", `${label}: component flags must be boolean`);
      }
      assertV4(response.components.some((component) => component.decisive), `${label}: at least one response component must be decisive`);
      const contacted = response.components.filter((component) => component.contacted).length;
      if (response.class === "full-answer") assertV4(contacted === response.components.length, `${label}: full answer must contact every component`);
      if (response.class === "partial-answer") assertV4(contacted > 0 && contacted < response.components.length, `${label}: partial answer must contact some but not all components`);
      if (response.class === "relevant-nonanswer") assertV4(contacted === 0 && response.issueBearingContraryMaterial, `${label}: relevant nonanswer structure invalid`);
      if (response.class === "nonanswer") assertV4(contacted === 0 && !response.issueBearingContraryMaterial, `${label}: nonanswer structure invalid`);
      if (response.class === "diagnostic-defeat") assertV4(contacted > 0 && response.diagnosticConsequenceExplicit, `${label}: diagnostic defeat lacks contact or consequence`);
      if (response.class === "justified-reframe") assertV4(contacted > 0 && response.replacementDemandAnswered, `${label}: justified reframe lacks contact or replacement answer`);
    }

    assertObjectShape(move.ratings, V4_MODEL_RATING_KEYS, `${label}.ratings`);
    for (const key of V4_MODEL_RATING_KEYS) assertRating(move.ratings[key], `${label}.ratings.${key}`);
    const responseRange = V4_RESPONSE_RANGES[response.class];
    assertV4(move.ratings.responsiveness.value >= responseRange[0] && move.ratings.responsiveness.value <= responseRange[1], `${label}: responsiveness outside derived class range`);
    const burdenRange = V4_BURDEN_RANGES[move.burdenContact?.tier ?? "none"];
    assertV4(move.ratings.relevanceBurden.value >= burdenRange[0] && move.ratings.relevanceBurden.value <= burdenRange[1], `${label}: relevance/burden outside contact range`);

    assertObjectShape(move.precisionFindings, ["propositionRecoverability", "termStability", "scopeStability", "qualificationExplicitness", "rationale"], `${label}.precisionFindings`);
    assertV4(["complete", "partial", "failed"].includes(move.precisionFindings.propositionRecoverability), `${label}: invalid proposition recoverability`);
    assertV4(["stable", "partly-unstable", "materially-unstable"].includes(move.precisionFindings.termStability), `${label}: invalid term stability`);
    assertV4(["stable", "partly-unstable", "materially-unstable"].includes(move.precisionFindings.scopeStability), `${label}: invalid scope stability`);
    assertV4(["explicit", "not-needed", "implicit", "missing", "materially-misleading"].includes(move.precisionFindings.qualificationExplicitness), `${label}: invalid qualification explicitness`);
    assertString(move.precisionFindings.rationale, 40, `${label}.precisionFindings.rationale`);
    assertObjectShape(move.calibrationFindings, ["assertedForce", "warrantFit", "qualificationStatus", "uncertaintyAcknowledged", "rationale"], `${label}.calibrationFindings`);
    assertV4(["question", "possibility", "plausibility", "probability", "strong-probability", "necessity", "certainty"].includes(move.calibrationFindings.assertedForce), `${label}: invalid asserted force`);
    assertV4(["matched", "slightly-overstated", "materially-overstated", "radically-overstated"].includes(move.calibrationFindings.warrantFit), `${label}: invalid warrant fit`);
    assertV4(["explicit", "not-needed", "implicit", "missing"].includes(move.calibrationFindings.qualificationStatus), `${label}: invalid calibration qualification status`);
    assertV4(["yes", "no", "not-needed"].includes(move.calibrationFindings.uncertaintyAcknowledged), `${label}: invalid uncertainty acknowledgment`);
    assertString(move.calibrationFindings.rationale, 40, `${label}.calibrationFindings.rationale`);
    assertObjectShape(move.charity, ["tested", "alternative", "decisiveQualification"], `${label}.charity`);
    if (move.charity.tested) {
      assertString(move.charity.alternative, 10, `${label}.charity.alternative`);
      assertString(move.charity.decisiveQualification, 10, `${label}.charity.decisiveQualification`);
    } else {
      assertV4(move.ratings.representationalCharity.value === 75, `${label}: untested charity must equal 75`);
      assertV4(move.charity.alternative === "" && move.charity.decisiveQualification === "", `${label}: untested charity descriptions must be empty`);
    }
    assertString(move.evidenceBasis, 40, `${label}.evidenceBasis`);
    assertV4(["high", "medium", "low"].includes(move.assessmentConfidence), `${label}: invalid assessment confidence`);
  }

  for (const sectionId of sectionIds) for (const side of ["pro", "con"]) assertV4(output.moves.some((move) => move.sectionId === sectionId && move.side === side), `${sectionId}: ${side} has no selected move`);
  const adjustmentBurdenIds = new Set([...bridgeIds, ...additionalAdjustmentBurdenIds]);
  for (const side of ["pro", "con"]) validateAdjustment(output.burdenCompletionAdjustment[side], side, new Set(moveIds), adjustmentBurdenIds);
  assertObjectShape(output.audit, Object.keys(schema.properties.audit.properties), "audit");
  for (const [key, definition] of Object.entries(schema.properties.audit.properties)) assertV4(output.audit[key] === definition.const, `audit.${key} mismatch`);
  return {
    status: "passed",
    debateNumber: output.debateNumber,
    moves: output.moves.length,
    sections: output.sections.length,
    mediumOrLowAttributionMoves: output.moves.filter((move) => move.attributionConfidence !== "high").map((move) => move.moveId),
    calculatedFields: 0
  };
}

function moveDimensions(move) {
  return {
    logicalCoherence: move.ratings.logicalCoherence.value,
    evidenceWarrant: move.ratings.evidenceWarrant.value,
    responsiveness: move.ratings.responsiveness.value,
    relevanceBurden: move.ratings.relevanceBurden.value,
    precisionClarity: derivePrecisionClarity(move.precisionFindings).value,
    calibrationCharity: combineCalibrationCharity({
      epistemicCalibration: deriveEpistemicCalibration(move.calibrationFindings).value,
      representationalCharity: move.ratings.representationalCharity.value
    })
  };
}

function importanceMean(moves) {
  const denominator = moves.reduce((sum, move) => sum + move.importance, 0);
  assertV4(denominator > 0, "importance denominator must be positive");
  return Math.round(moves.reduce((sum, move) => sum + move.score * move.importance, 0) / denominator);
}

export function deriveV4PrimaryScores(output) {
  const scoredMoves = output.moves.map((move) => ({ ...move, dimensions: moveDimensions(move), score: scoreDimensions(moveDimensions(move), move.moveId) }));
  const sections = output.sections.map((section) => ({
    sectionId: section.sectionId,
    title: section.title,
    weightPercent: section.weightPercent,
    sides: Object.fromEntries(["pro", "con"].map((side) => {
      const moves = scoredMoves.filter((move) => move.sectionId === section.sectionId && move.side === side);
      return [side, { score: importanceMean(moves), moves: moves.map((move) => ({ moveId: move.moveId, importance: move.importance, score: move.score })) }];
    }))
  }));
  const overall = Object.fromEntries(["pro", "con"].map((side) => {
    const weightedSectionMean = sections.reduce((sum, section) => sum + section.sides[side].score * section.weightPercent / 100, 0);
    const adjustment = output.burdenCompletionAdjustment[side].value;
    return [side, { weightedSectionMean: Number(weightedSectionMean.toFixed(2)), burdenCompletionAdjustment: adjustment, score: Math.max(0, Math.min(100, Math.round(weightedSectionMean + adjustment))) }];
  }));
  const winner = overall.pro.score === overall.con.score ? "tie" : overall.pro.score > overall.con.score ? "pro" : "con";
  return { protocolId: output.protocolId, debateNumber: output.debateNumber, debateId: output.debateId, sections, overall, winner, winningMargin: Math.abs(overall.pro.score - overall.con.score) };
}

export function makeV4ControlSample(debateIds, rate = V4_TRIGGER_POLICY.controlSampleRate) {
  assertV4(Array.isArray(debateIds) && debateIds.length > 0, "debate IDs required");
  const count = Math.max(1, Math.round(debateIds.length * rate));
  return [...debateIds]
    .map((debateId) => ({ debateId, digest: createHash("sha256").update(`slugfester-v4-control:${debateId}`).digest("hex") }))
    .sort((a, b) => a.digest.localeCompare(b.digest))
    .slice(0, count)
    .map((item) => item.debateId)
    .sort();
}

function nearScoreBandBoundary(score) {
  return V4_SCORE_BAND_BOUNDARIES.some((boundary) => Math.abs(score - boundary) <= V4_TRIGGER_POLICY.bandBoundaryDistanceMaximum);
}

export function evaluateV4Escalation({ primary, scores, controlSampleSelected = false, structuralWarnings = [], unresolvedAudioMoveIds = [] }) {
  const reasons = [];
  if (controlSampleSelected) reasons.push("frozen-control-sample");
  if (scores.winningMargin <= V4_TRIGGER_POLICY.winnerMarginMaximum) reasons.push("winner-margin-at-most-five");
  for (const side of ["pro", "con"]) if (nearScoreBandBoundary(scores.overall[side].score)) reasons.push(`${side}-score-near-band-boundary`);
  const uncertainHighImportanceMoves = primary.moves.filter((move) => move.importance === V4_TRIGGER_POLICY.highImportance && move.assessmentConfidence !== "high").map((move) => move.moveId);
  if (uncertainHighImportanceMoves.length) reasons.push("importance-three-confidence-below-high");
  if (["pro", "con"].some((side) => primary.burdenCompletionAdjustment[side].value !== 0)) reasons.push("nonzero-burden-completion-adjustment");
  if (structuralWarnings.length) reasons.push("semantic-integrity-warning");
  if (unresolvedAudioMoveIds.length) reasons.push("load-bearing-attribution-unresolved-after-audio");
  const audioVerificationMoveIds = primary.moves.filter((move) => move.attributionConfidence !== "high").map((move) => move.moveId);
  return {
    requiresSecondPass: reasons.length > 0,
    reasons: [...new Set(reasons)],
    uncertainHighImportanceMoves,
    requiresAudioVerification: audioVerificationMoveIds.length > 0,
    audioVerificationMoveIds,
    audioComplete: audioVerificationMoveIds.every((moveId) => !unresolvedAudioMoveIds.includes(moveId)),
    publicationBlocked: unresolvedAudioMoveIds.length > 0 || structuralWarnings.length > 0
  };
}

export function projectV4ComputeHours(overrides = {}) {
  const inputs = { ...V4_COMPUTE_ASSUMPTIONS, ...overrides };
  const escalatedDebates = inputs.debateCount * inputs.escalationRate;
  const adjudicatedDebates = escalatedDebates * inputs.adjudicationShareOfEscalations;
  const primary = inputs.debateCount * inputs.primaryMinutesPerDebate / 60;
  const finalization = inputs.debateCount * inputs.finalizationMinutesPerDebate / 60;
  const passB = escalatedDebates * inputs.passBMinutesPerEscalatedDebate / 60;
  const adjudication = adjudicatedDebates * inputs.adjudicationMinutesPerAdjudicatedDebate / 60;
  const total = primary + finalization + passB + adjudication + inputs.fixedAudioQaRenderingHours;
  return {
    inputs,
    hours: {
      primary: Number(primary.toFixed(2)),
      finalization: Number(finalization.toFixed(2)),
      passB: Number(passB.toFixed(2)),
      adjudication: Number(adjudication.toFixed(2)),
      audioQaRendering: inputs.fixedAudioQaRenderingHours,
      total: Number(total.toFixed(2))
    },
    centralTargetPassed: total <= 52,
    conservativeCeilingPassed: total <= 60
  };
}

export async function readJson(relativePath, root = process.cwd()) {
  return JSON.parse(await readFile(path.resolve(root, relativePath), "utf8"));
}
