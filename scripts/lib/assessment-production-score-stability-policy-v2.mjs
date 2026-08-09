import { assertV4 } from "./v4-lean-production.mjs";

export const PROPOSED_V2_SCORE_STABILITY_THRESHOLDS = Object.freeze({
  meanAbsoluteDistanceToInitialPassesMaximum: 4,
  maximumAbsoluteDistanceToEitherInitialPassMaximum: 8,
  maximumOutsideInitialRangeMaximum: 3,
});

function adjustedTotal(overall) {
  return overall.weightedSectionMean + overall.burdenCompletionAdjustment;
}

function direction(pro, con) {
  return pro === con ? "tie" : pro > con ? "pro" : "con";
}

export function evaluateProposedV2WinnerStability(debates) {
  assertV4(
    Array.isArray(debates) && debates.length > 0,
    "scored debates required for proposed v2 evaluation"
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
    let proposedV2WinnerStabilityPassed = true;
    if (initialWinner === "pro") {
      proposedV2WinnerStabilityPassed = finalAdjustedPro >= finalAdjustedCon;
    } else if (initialWinner === "con") {
      proposedV2WinnerStabilityPassed = finalAdjustedCon >= finalAdjustedPro;
    } else if (initialWinner === "tie") {
      proposedV2WinnerStabilityPassed = debate.final.winner === "tie";
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
      proposedV2WinnerStabilityPassed,
      allowedRoundedTieCollapse:
        initialWinnersAgree &&
        initialWinner !== "tie" &&
        debate.final.winner === "tie" &&
        proposedV2WinnerStabilityPassed,
      oppositeSideReversal:
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
    proposedV2WinnerStabilityPreserved: agreed.filter(
      (row) => row.proposedV2WinnerStabilityPassed
    ).length,
    allowedRoundedTieCollapses: rows.filter(
      (row) => row.allowedRoundedTieCollapse
    ).map((row) => row.debateNumber),
    oppositeSideReversals: rows.filter((row) => row.oppositeSideReversal).map(
      (row) => row.debateNumber
    ),
    passed: agreed.every((row) => row.proposedV2WinnerStabilityPassed),
  };
}

export function numericStabilityPassed(stability) {
  const thresholds = PROPOSED_V2_SCORE_STABILITY_THRESHOLDS;
  return (
    stability.scoreBoundsPassed &&
    stability.meanAbsoluteDistanceToInitialPasses <=
      thresholds.meanAbsoluteDistanceToInitialPassesMaximum &&
    stability.maximumAbsoluteDistanceToEitherInitialPass <=
      thresholds.maximumAbsoluteDistanceToEitherInitialPassMaximum &&
    stability.maximumOutsideInitialRange <=
      thresholds.maximumOutsideInitialRangeMaximum
  );
}
