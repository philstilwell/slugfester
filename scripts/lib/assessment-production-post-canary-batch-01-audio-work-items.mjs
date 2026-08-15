import { buildV42211726AudioWorkItems } from "./v42211726-hard-route-disagreement.mjs";

import {
  ASSESSMENT_PRODUCTION_POST_CANARY_BATCH_01_DISAGREEMENT_PROTOCOL_ID
} from "./assessment-production-post-canary-batch-01-disagreement.mjs";

export function buildAssessmentProductionPostCanaryBatch01AudioWorkItems(
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
      ASSESSMENT_PRODUCTION_POST_CANARY_BATCH_01_DISAGREEMENT_PROTOCOL_ID
  }));
}
