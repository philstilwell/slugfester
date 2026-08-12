import { buildV42211726AudioWorkItems } from "./v42211726-hard-route-disagreement.mjs";

import {
  ASSESSMENT_PRODUCTION_CHECKPOINT_V22_DISAGREEMENT_PROTOCOL_ID,
} from "./assessment-production-checkpoint-v2.2-disagreement.mjs";

export function buildAssessmentProductionCheckpointV22AudioWorkItems(
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
    protocolId:
      ASSESSMENT_PRODUCTION_CHECKPOINT_V22_DISAGREEMENT_PROTOCOL_ID,
  }));
}
