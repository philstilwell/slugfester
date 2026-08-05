import { combineCalibrationCharity, scoreDimensions } from "./reassessment-scoring.mjs";
import { V4_MODEL_RATING_KEYS, deriveEpistemicCalibration, derivePrecisionClarity } from "./v4-lean-production.mjs";
import { assertV4, canonicalJson } from "./v41-lean-production.mjs";

export const V416_SCALAR_DISPUTE_THRESHOLD = 5;
export const V416_DIAGNOSTIC_MOVE_DELTA_THRESHOLD = 4;
export const V416_SCORING_FIELD_KEYS = Object.freeze([...V4_MODEL_RATING_KEYS, "precisionClarity", "epistemicCalibration"]);

const sorted = (values) => [...values].sort();

export function flattenV416PrimaryMoves(primary) {
  return primary.sections.flatMap((section) => [
    ...section.proMoves.map((move) => ({ ...move, sectionId: section.sectionId, side: "pro" })),
    ...section.conMoves.map((move) => ({ ...move, sectionId: section.sectionId, side: "con" }))
  ]);
}

export function v416ResponseTuple(response) {
  return {
    class: response.class,
    decisiveTargetIds: sorted(response.decisiveTargetIds),
    contactedComponents: response.components.filter((component) => component.contacted).length,
    totalComponents: response.components.length,
    decisiveComponents: response.components.filter((component) => component.decisive).length,
    issueBearingContraryMaterial: response.issueBearingContraryMaterial,
    diagnosticConsequenceExplicit: response.diagnosticConsequenceExplicit,
    replacementDemandAnswered: response.replacementDemandAnswered
  };
}

export function v416ScoringFields(move) {
  return {
    ...Object.fromEntries(V4_MODEL_RATING_KEYS.map((key) => [key, move.ratings[key].value])),
    precisionClarity: derivePrecisionClarity(move.precisionFindings).value,
    epistemicCalibration: deriveEpistemicCalibration(move.calibrationFindings).value
  };
}

export function v416DiagnosticMoveScore(move) {
  const fields = v416ScoringFields(move);
  return scoreDimensions({
    logicalCoherence: fields.logicalCoherence,
    evidenceWarrant: fields.evidenceWarrant,
    responsiveness: fields.responsiveness,
    relevanceBurden: fields.relevanceBurden,
    precisionClarity: fields.precisionClarity,
    calibrationCharity: combineCalibrationCharity({ epistemicCalibration: fields.epistemicCalibration, representationalCharity: fields.representationalCharity })
  }, `${move.moveId}.diagnosticDimensions`);
}

export function extractV416MoveDisagreement(moveA, moveB) {
  assertV4(moveA.moveId === moveB.moveId, "move identity mismatch during disagreement extraction");
  const responseMismatch = canonicalJson(v416ResponseTuple(moveA.response)) !== canonicalJson(v416ResponseTuple(moveB.response));
  const charityStateMismatch = moveA.charity.tested !== moveB.charity.tested;
  const fieldsA = v416ScoringFields(moveA);
  const fieldsB = v416ScoringFields(moveB);
  const unequalScoringFieldKeys = V416_SCORING_FIELD_KEYS.filter((key) => fieldsA[key] !== fieldsB[key]);
  const materialScoringFieldKeys = unequalScoringFieldKeys.filter((key) => Math.abs(fieldsA[key] - fieldsB[key]) > V416_SCALAR_DISPUTE_THRESHOLD);
  const diagnosticScoreA = v416DiagnosticMoveScore(moveA);
  const diagnosticScoreB = v416DiagnosticMoveScore(moveB);
  const diagnosticDelta = Math.abs(diagnosticScoreA - diagnosticScoreB);
  const diagnosticTrigger = diagnosticDelta > V416_DIAGNOSTIC_MOVE_DELTA_THRESHOLD;
  const exposedScoringFieldKeys = diagnosticTrigger ? unequalScoringFieldKeys : materialScoringFieldKeys;
  return {
    responseMismatch,
    charityStateMismatch,
    fieldsA,
    fieldsB,
    unequalScoringFieldKeys,
    materialScoringFieldKeys,
    diagnosticScoreA,
    diagnosticScoreB,
    diagnosticDelta,
    diagnosticTrigger,
    exposedScoringFieldKeys,
    disputed: responseMismatch || charityStateMismatch || materialScoringFieldKeys.length > 0 || diagnosticTrigger
  };
}

export function v416AdjustmentSemanticTuple(adjustment) {
  return {
    value: adjustment.value,
    eligibility: {
      distinctDebateWideConsequence: adjustment.eligibility.distinctDebateWideConsequence,
      affectsBurdenCompletion: adjustment.eligibility.affectsBurdenCompletion,
      notAlreadyScored: adjustment.eligibility.notAlreadyScored,
      affectedBurdenIds: sorted(adjustment.eligibility.affectedBurdenIds),
      relatedMoveIds: sorted(adjustment.eligibility.relatedMoveIds),
      alreadyCapturedBy: sorted(adjustment.eligibility.alreadyCapturedBy)
    }
  };
}

export function scoringFieldCandidate(move, key) {
  const value = v416ScoringFields(move)[key];
  if (V4_MODEL_RATING_KEYS.includes(key)) return { value };
  if (key === "precisionClarity") {
    const { rationale, ...closedFindings } = move.precisionFindings;
    return { value, closedFindings };
  }
  if (key === "epistemicCalibration") {
    const { rationale, ...closedFindings } = move.calibrationFindings;
    return { value, closedFindings };
  }
  throw new Error(`unknown scoring field: ${key}`);
}
