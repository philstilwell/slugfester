import { extractV42211726Disagreements } from "./v42211726-hard-route-disagreement.mjs";

export const ASSESSMENT_PRODUCTION_CHECKPOINT_V22_DISAGREEMENT_ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/disagreement-extraction";
export const ASSESSMENT_PRODUCTION_CHECKPOINT_V22_DISAGREEMENT_PROTOCOL_ID =
  "assessment-production-checkpoint-v2.2-1-decomposed-consensus";

export function extractAssessmentProductionCheckpointV22Disagreements(
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
      "1.0-production-checkpoint-v2.2-deterministic-disagreements",
    protocolId:
      ASSESSMENT_PRODUCTION_CHECKPOINT_V22_DISAGREEMENT_PROTOCOL_ID,
    audit: {
      ...extracted.audit,
      frozenProductionCheckpointV22IndependentJudgmentPairCompared: true,
      audioWorkItemsPrepared: false,
      audioAccessed: false,
    },
  };
}
