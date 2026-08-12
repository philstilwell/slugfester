import { buildV42211726AudioWorkItems } from "./v42211726-hard-route-disagreement.mjs";

import {
  ASSESSMENT_PRODUCTION_SCORE_STABILITY_V223_DISAGREEMENT_PROTOCOL_ID
} from "./assessment-production-score-stability-v2.2.3-disagreement.mjs";

export function buildAssessmentProductionScoreStabilityV223AudioWorkItems(
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
      ASSESSMENT_PRODUCTION_SCORE_STABILITY_V223_DISAGREEMENT_PROTOCOL_ID
  }));
}

