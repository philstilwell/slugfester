import { assertV4, canonicalJson } from "./v4-lean-production.mjs";
import {
  evaluateProposedV22WinnerStability,
  numericStabilityPassed,
  PROPOSED_V22_SCORE_STABILITY_THRESHOLDS,
} from "./assessment-production-score-stability-policy-v2.2.mjs";

export const ACTIVE_SCORE_STABILITY_POLICY_VERSION = "v2.2";
export const ACTIVE_SCORE_STABILITY_POLICY_PATH =
  "docs/assessment-production/score-stability-policy-v2.2-proposal.md";
export const ACTIVE_SCORE_STABILITY_THRESHOLDS =
  PROPOSED_V22_SCORE_STABILITY_THRESHOLDS;

export function evaluateActiveProductionScoreStability(debates, stability) {
  assertV4(
    Array.isArray(debates) && debates.length > 0,
    "one or more scored debates are required"
  );
  assertV4(
    stability &&
      canonicalJson(stability.thresholds) ===
        canonicalJson(ACTIVE_SCORE_STABILITY_THRESHOLDS),
    "active v2.2 numerical thresholds changed"
  );
  const winnerStability = evaluateProposedV22WinnerStability(debates);
  const numericPassed = numericStabilityPassed(stability);
  return {
    policyVersion: ACTIVE_SCORE_STABILITY_POLICY_VERSION,
    policyPath: ACTIVE_SCORE_STABILITY_POLICY_PATH,
    thresholds: structuredClone(ACTIVE_SCORE_STABILITY_THRESHOLDS),
    numericPassed,
    winnerStability,
    acceptancePassed: numericPassed && winnerStability.passed,
  };
}
