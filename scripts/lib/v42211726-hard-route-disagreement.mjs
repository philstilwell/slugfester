import { buildV4221173AudioWorkItems, extractV4221173Disagreements } from "./v4221173-decomposed-disagreement.mjs";

export const V42211726_ROOT = "docs/calibration/v4.2.21.17.26/hard-route-disagreement-audio-prep";
export const V42211726_PROTOCOL_ID = "v4.2.21.17.26-hard-route-decomposed-consensus";

export function extractV42211726Disagreements(primaryA, primaryB, lockedInventory) {
  const extracted = extractV4221173Disagreements(primaryA, primaryB, lockedInventory);
  return {
    ...extracted,
    schemaVersion: "4.2.21.17.26-hard-route-deterministic-disagreements",
    protocolId: V42211726_PROTOCOL_ID,
    moveDisputes: extracted.moveDisputes.map((dispute) => {
      const triggers = { ...dispute.triggers, assessmentBelowHighAudioRequired: dispute.triggers.mediumConfidenceAudioRequired };
      delete triggers.mediumConfidenceAudioRequired;
      return { ...dispute, triggers };
    }),
    audit: {
      ...extracted.audit,
      eitherPassAssessmentBelowHighTriggersAudio: true,
      repositoryAttributionBelowHighTriggersAudio: true,
    },
  };
}

export function buildV42211726AudioWorkItems(primaryA, primaryB, lockedInventory, events, sourcePacket) {
  return buildV4221173AudioWorkItems(primaryA, primaryB, lockedInventory, events, sourcePacket).map((item) => ({ ...item, protocolId: V42211726_PROTOCOL_ID }));
}
