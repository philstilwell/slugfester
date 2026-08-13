import { CHECKPOINT_V22_PUBLICATION_ROOT } from "./assessment-production-checkpoint-v2.2-publication.mjs";
import {
  CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT
} from "./assessment-production-checkpoint-v2.2-debate-22-repair.mjs";
import { CHECKPOINT_V22_RESUMPTION_3_ROOT } from "./assessment-production-checkpoint-v2.2-publication-resumption-3.mjs";

export const CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT =
  `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/successor-1`;
export const CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_PROTOCOL_ID =
  "assessment-production-checkpoint-v2.2-1-debate-22-publication-repair-explicit-order-successor-1";
export const CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER = Object.freeze([
  "50",
  "192",
  "129",
  "40",
  "25",
  "104",
  "22",
  "10",
  "167",
  "122"
]);
export const CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_EXISTING_OUTPUTS = Object.freeze({
  "50": `${CHECKPOINT_V22_PUBLICATION_ROOT}/repair-1/merged/debate-50.json`,
  "192": `${CHECKPOINT_V22_PUBLICATION_ROOT}/resumption-1/repair-1/merged/debate-192.json`,
  "129": `${CHECKPOINT_V22_PUBLICATION_ROOT}/resumption-2/repair-1/merged/debate-129.json`,
  "40": `${CHECKPOINT_V22_RESUMPTION_3_ROOT}/outputs/debate-40.json`,
  "25": `${CHECKPOINT_V22_RESUMPTION_3_ROOT}/outputs/debate-25.json`,
  "104": `${CHECKPOINT_V22_RESUMPTION_3_ROOT}/outputs/debate-104.json`,
  "10": `${CHECKPOINT_V22_RESUMPTION_3_ROOT}/outputs/debate-10.json`,
  "167": `${CHECKPOINT_V22_RESUMPTION_3_ROOT}/outputs/debate-167.json`,
  "122": `${CHECKPOINT_V22_RESUMPTION_3_ROOT}/outputs/debate-122.json`
});
export const CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_PACKETS = Object.freeze(
  Object.fromEntries(
    CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER.map((debateNumber) => [
      debateNumber,
      `${CHECKPOINT_V22_PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`
    ])
  )
);
export const CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ARTIFACTS = Object.freeze({
  mergedOutput: `${CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT}/merged/debate-22.json`,
  completeDebateValidation: `${CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT}/complete-debate-validation.json`,
  mergeAudit: `${CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT}/merge-audit.json`,
  completeCohortValidation: `${CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT}/complete-cohort-validation.json`,
  execution: `${CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT}/execution.json`,
  analysis: `${CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT}/analysis.json`
});
