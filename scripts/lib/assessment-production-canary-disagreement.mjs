import {
  buildV42211726AudioWorkItems,
  extractV42211726Disagreements
} from "./v42211726-hard-route-disagreement.mjs";

export const ASSESSMENT_PRODUCTION_CANARY_DISAGREEMENT_ROOT =
  "docs/assessment-production/canary-v1-disagreement-audio-prep";
export const ASSESSMENT_PRODUCTION_CANARY_DISAGREEMENT_PROTOCOL_ID =
  "assessment-production-canary-v1-decomposed-consensus";

export function extractAssessmentProductionCanaryDisagreements(
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
    schemaVersion: "1.0-production-canary-deterministic-disagreements",
    protocolId: ASSESSMENT_PRODUCTION_CANARY_DISAGREEMENT_PROTOCOL_ID
  };
}

export function buildAssessmentProductionCanaryAudioWorkItems(
  primaryA,
  primaryB,
  lockedInventory,
  events,
  sourcePacket
) {
  return buildV42211726AudioWorkItems(
    primaryA,
    primaryB,
    lockedInventory,
    events,
    sourcePacket
  ).map((item) => ({
    ...item,
    protocolId: ASSESSMENT_PRODUCTION_CANARY_DISAGREEMENT_PROTOCOL_ID
  }));
}
