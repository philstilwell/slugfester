import { assertV4 } from "./v4-lean-production.mjs";
import {
  numericStabilityPassed as numericStabilityPassedV21,
  PROPOSED_V21_SCORE_STABILITY_THRESHOLDS,
} from "./assessment-production-score-stability-policy-v2.1.mjs";

export const PROPOSED_V22_SCORE_STABILITY_THRESHOLDS =
  PROPOSED_V21_SCORE_STABILITY_THRESHOLDS;

function adjustedTotal(overall) {
  return overall.weightedSectionMean + overall.burdenCompletionAdjustment;
}

function direction(pro, con) {
  return pro === con ? "tie" : pro > con ? "pro" : "con";
}

export function evaluateProposedV22WinnerStability(debates) {
  assertV4(
    Array.isArray(debates) && debates.length > 0,
    "scored debates required for proposed v2.2 evaluation"
  );
  const rows = debates.map((debate) => {
    const initialWinnersAgree = debate.passA.winner === debate.passB.winner;
    const initialWinner = initialWinnersAgree ? debate.passA.winner : null;
    const agreedWinningSide =
      initialWinner === "pro" || initialWinner === "con"
        ? initialWinner
        : null;
    const finalAdjustedPro = adjustedTotal(debate.final.overall.pro);
    const finalAdjustedCon = adjustedTotal(debate.final.overall.con);
    const finalUnroundedDirection = direction(
      finalAdjustedPro,
      finalAdjustedCon
    );
    const v21WinnerStabilityPassed =
      !initialWinnersAgree ||
      (initialWinner === "tie"
        ? debate.final.winner === "tie"
        : debate.final.winner === initialWinner || debate.final.winner === "tie");
    const proposedV22WinnerStabilityPassed =
      agreedWinningSide === null ||
      debate.final.winner === agreedWinningSide ||
      debate.final.winner === "tie";
    return {
      debateNumber: debate.debateNumber,
      initialWinnersAgree,
      initialWinner,
      agreedWinningSide,
      finalRoundedWinner: debate.final.winner,
      finalAdjustedTotals: {
        pro: finalAdjustedPro,
        con: finalAdjustedCon,
      },
      finalUnroundedDirection,
      v21WinnerStabilityPassed,
      proposedV22WinnerStabilityPassed,
      allowedIntegerRoundedTieCollapse:
        agreedWinningSide !== null && debate.final.winner === "tie",
      allowedAgreedInitialTieDrift:
        initialWinner === "tie" && debate.final.winner !== "tie",
      publishedOppositeSideReversal:
        agreedWinningSide !== null &&
        debate.final.winner !== "tie" &&
        debate.final.winner !== agreedWinningSide,
      unroundedOppositeSideDirection:
        agreedWinningSide !== null &&
        finalUnroundedDirection !== "tie" &&
        finalUnroundedDirection !== agreedWinningSide,
    };
  });
  const agreedWinningSideRows = rows.filter(
    (row) => row.agreedWinningSide !== null
  );
  const agreedInitialTieRows = rows.filter(
    (row) => row.initialWinner === "tie"
  );
  return {
    rows,
    agreedWinningSideDebates: agreedWinningSideRows.length,
    agreedWinningSidesPreserved: agreedWinningSideRows.filter(
      (row) => row.proposedV22WinnerStabilityPassed
    ).length,
    agreedInitialTieDebates: agreedInitialTieRows.length,
    allowedIntegerRoundedTieCollapses: rows
      .filter((row) => row.allowedIntegerRoundedTieCollapse)
      .map((row) => row.debateNumber),
    allowedAgreedInitialTieDrifts: rows
      .filter((row) => row.allowedAgreedInitialTieDrift)
      .map((row) => row.debateNumber),
    publishedOppositeSideReversals: rows
      .filter((row) => row.publishedOppositeSideReversal)
      .map((row) => row.debateNumber),
    unroundedOppositeSideDirections: rows
      .filter((row) => row.unroundedOppositeSideDirection)
      .map((row) => row.debateNumber),
    passed: agreedWinningSideRows.every(
      (row) => row.proposedV22WinnerStabilityPassed
    ),
  };
}

export function numericStabilityPassed(stability) {
  return numericStabilityPassedV21(stability);
}
