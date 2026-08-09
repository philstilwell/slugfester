import { assertV4 } from "./v4-lean-production.mjs";
import {
  numericStabilityPassed as numericStabilityPassedV2,
  PROPOSED_V2_SCORE_STABILITY_THRESHOLDS,
} from "./assessment-production-score-stability-policy-v2.mjs";

export const PROPOSED_V21_SCORE_STABILITY_THRESHOLDS =
  PROPOSED_V2_SCORE_STABILITY_THRESHOLDS;

function adjustedTotal(overall) {
  return overall.weightedSectionMean + overall.burdenCompletionAdjustment;
}

function direction(pro, con) {
  return pro === con ? "tie" : pro > con ? "pro" : "con";
}

export function evaluateProposedV21WinnerStability(debates) {
  assertV4(
    Array.isArray(debates) && debates.length > 0,
    "scored debates required for proposed v2.1 evaluation"
  );
  const rows = debates.map((debate) => {
    const initialWinnersAgree = debate.passA.winner === debate.passB.winner;
    const initialWinner = initialWinnersAgree ? debate.passA.winner : null;
    const finalAdjustedPro = adjustedTotal(debate.final.overall.pro);
    const finalAdjustedCon = adjustedTotal(debate.final.overall.con);
    const finalUnroundedDirection = direction(
      finalAdjustedPro,
      finalAdjustedCon
    );
    const v1ExactRoundedWinnerPreserved =
      !initialWinnersAgree || debate.final.winner === initialWinner;
    let proposedV21WinnerStabilityPassed = true;
    if (initialWinner === "pro" || initialWinner === "con") {
      proposedV21WinnerStabilityPassed =
        debate.final.winner === initialWinner || debate.final.winner === "tie";
    } else if (initialWinner === "tie") {
      proposedV21WinnerStabilityPassed = debate.final.winner === "tie";
    }
    return {
      debateNumber: debate.debateNumber,
      initialWinnersAgree,
      initialWinner,
      finalRoundedWinner: debate.final.winner,
      finalAdjustedTotals: {
        pro: finalAdjustedPro,
        con: finalAdjustedCon,
      },
      finalUnroundedDirection,
      v1ExactRoundedWinnerPreserved,
      proposedV21WinnerStabilityPassed,
      allowedIntegerRoundedTieCollapse:
        initialWinnersAgree &&
        initialWinner !== "tie" &&
        debate.final.winner === "tie",
      publishedOppositeSideReversal:
        initialWinner !== null &&
        initialWinner !== "tie" &&
        debate.final.winner !== "tie" &&
        debate.final.winner !== initialWinner,
      unroundedOppositeSideDirection:
        initialWinner !== null &&
        initialWinner !== "tie" &&
        finalUnroundedDirection !== "tie" &&
        finalUnroundedDirection !== initialWinner,
    };
  });
  const agreed = rows.filter((row) => row.initialWinnersAgree);
  return {
    rows,
    agreedWinnerDebates: agreed.length,
    v1ExactRoundedWinnersPreserved: agreed.filter(
      (row) => row.v1ExactRoundedWinnerPreserved
    ).length,
    proposedV21WinnerStabilityPreserved: agreed.filter(
      (row) => row.proposedV21WinnerStabilityPassed
    ).length,
    allowedIntegerRoundedTieCollapses: rows
      .filter((row) => row.allowedIntegerRoundedTieCollapse)
      .map((row) => row.debateNumber),
    publishedOppositeSideReversals: rows
      .filter((row) => row.publishedOppositeSideReversal)
      .map((row) => row.debateNumber),
    unroundedOppositeSideDirections: rows
      .filter((row) => row.unroundedOppositeSideDirection)
      .map((row) => row.debateNumber),
    passed: agreed.every((row) => row.proposedV21WinnerStabilityPassed),
  };
}

export function numericStabilityPassed(stability) {
  return numericStabilityPassedV2(stability);
}
