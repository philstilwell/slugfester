import { extractV42211726Disagreements } from "./v42211726-hard-route-disagreement.mjs";

export const ASSESSMENT_PRODUCTION_SCORE_STABILITY_V213_DISAGREEMENT_ROOT =
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort/disagreement-extraction";
export const ASSESSMENT_PRODUCTION_SCORE_STABILITY_V213_DISAGREEMENT_PROTOCOL_ID =
  "assessment-production-score-stability-v2.1.3-decomposed-consensus";

export function extractAssessmentProductionScoreStabilityV213Disagreements(
  primaryA,
  primaryB,
  lockedInventory
) {
  const extracted = extractV42211726Disagreements(
    primaryA,
    primaryB,
    lockedInventory
  );
  return {
    ...extracted,
    schemaVersion:
      "1.0-score-stability-v2.1.3-deterministic-disagreements",
    protocolId:
      ASSESSMENT_PRODUCTION_SCORE_STABILITY_V213_DISAGREEMENT_PROTOCOL_ID,
    audit: {
      ...extracted.audit,
      frozenV213IndependentJudgmentPairCompared: true,
      audioWorkItemsPrepared: false,
      audioAccessed: false
    }
  };
}
