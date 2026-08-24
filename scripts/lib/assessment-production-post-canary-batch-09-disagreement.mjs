import { extractV42211726Disagreements } from "./v42211726-hard-route-disagreement.mjs";

export const ASSESSMENT_PRODUCTION_POST_CANARY_BATCH_09_DISAGREEMENT_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction";
export const ASSESSMENT_PRODUCTION_POST_CANARY_BATCH_09_DISAGREEMENT_PROTOCOL_ID =
  "assessment-production-post-canary-batch-09-decomposed-consensus";

export function extractAssessmentProductionPostCanaryBatch09Disagreements(
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
      "1.0-assessment-production-post-canary-batch-09-deterministic-disagreements",
    protocolId:
      ASSESSMENT_PRODUCTION_POST_CANARY_BATCH_09_DISAGREEMENT_PROTOCOL_ID,
    audit: {
      ...extracted.audit,
      frozenPostCanaryBatch09IndependentJudgmentPairCompared: true,
      acceptedIndependentJudgmentOutputsOnly: true,
      audioWorkItemsPrepared: false,
      audioAccessed: false,
      adjudicationPrepared: false,
      adjudicationExecuted: false
    }
  };
}
