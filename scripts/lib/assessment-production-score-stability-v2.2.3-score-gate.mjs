import {
  assertV4,
  canonicalJson,
  deriveV4PrimaryScores,
} from "./v4-lean-production.mjs";
import { canonicalizeV4220PrimaryOutput } from "./v4220-source-span-rendering.mjs";
import {
  evaluateProposedV21WinnerStability,
  numericStabilityPassed,
  PROPOSED_V21_SCORE_STABILITY_THRESHOLDS,
} from "./assessment-production-score-stability-policy-v2.1.mjs";

export const V223_SCORE_ROOT =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort/score-pass";
export const V223_CALCULATED_SCORES_VERSION =
  "1.0-score-stability-v2.2.3-adjudicated-calculated-scores";
export const V223_SCORE_STABILITY_THRESHOLDS =
  PROPOSED_V21_SCORE_STABILITY_THRESHOLDS;

const winner = (pro, con) =>
  pro === con ? "tie" : pro > con ? "pro" : "con";

function deriveRawScores(raw, eventsDocument) {
  const canonical = canonicalizeV4220PrimaryOutput(raw, eventsDocument);
  const scores = deriveV4PrimaryScores(canonical);
  return {
    ...scores,
    scoreProtocolId:
      "assessment-production-score-stability-v2.2.3-single-deterministic-score-pass",
  };
}
function outsideRange(value, left, right) {
  const minimum = Math.min(left, right);
  const maximum = Math.max(left, right);
  return value < minimum
    ? minimum - value
    : value > maximum
      ? value - maximum
      : 0;
}

export function evaluateV223ScoreStability(
  debates,
  thresholds = V223_SCORE_STABILITY_THRESHOLDS
) {
  assertV4(
    Array.isArray(debates) && debates.length === 10,
    "ten scored v2.2.3 debates required"
  );
  assertV4(
    canonicalJson(thresholds) ===
      canonicalJson(V223_SCORE_STABILITY_THRESHOLDS),
    "v2.2.3 prospective thresholds changed"
  );
  const sideRows = debates.flatMap((debate) =>
    ["pro", "con"].map((side) => {
      const passA = debate.passA.overall[side].score;
      const passB = debate.passB.overall[side].score;
      const final = debate.final.overall[side].score;
      return {
        debateNumber: debate.debateNumber,
        side,
        passA,
        passB,
        final,
        absoluteDistanceFromPassA: Math.abs(final - passA),
        absoluteDistanceFromPassB: Math.abs(final - passB),
        outsideInitialRange: outsideRange(final, passA, passB),
      };
    })
  );
  const absoluteDistances = sideRows.flatMap((row) => [
    row.absoluteDistanceFromPassA,
    row.absoluteDistanceFromPassB,
  ]);
  const numeric = {
    sideRows,
    scoreBoundsPassed: sideRows.every((row) =>
      [row.passA, row.passB, row.final].every(
        (score) => Number.isInteger(score) && score >= 0 && score <= 100
      )
    ),
    meanAbsoluteDistanceToInitialPasses: Number(
      (
        absoluteDistances.reduce((sum, value) => sum + value, 0) /
        absoluteDistances.length
      ).toFixed(2)
    ),
    maximumAbsoluteDistanceToEitherInitialPass: Math.max(
      ...absoluteDistances
    ),
    maximumOutsideInitialRange: Math.max(
      ...sideRows.map((row) => row.outsideInitialRange)
    ),
    thresholds: structuredClone(thresholds),
  };
  const winnerStability = evaluateProposedV21WinnerStability(debates);
  const numericPassed = numericStabilityPassed(numeric);
  return {
    ...numeric,
    numericPassed,
    winnerStability,
    integerRoundedTieCollapseAllowed: true,
    unroundedDirectionDiagnosticOnly: true,
    acceptancePassed: numericPassed && winnerStability.passed,
  };
}

export function deriveV223Scores(
  ledger,
  debateInputs,
  productionReferences,
  { finalLedgerSha256, productionReferenceSha256 }
) {
  assertV4(
    ledger?.status === "passed-v2.2.3-deterministic-final-ledger-assembly" &&
      ledger.authorization.scoreDerivation &&
      ledger.authorization.scorePassesMaximum === 1 &&
      ledger.audit.calculatedScores === 0,
    "validated v2.2.3 adjudicated final ledger required for scoring"
  );
  assertV4(
    Array.isArray(debateInputs) && debateInputs.length === 10,
    "ten v2.2.3 score inputs required"
  );
  const finalByDebate = new Map(
    ledger.debates.map((debate) => [debate.debateNumber, debate])
  );
  const referenceByDebate = new Map(
    productionReferences.map((reference) => [reference.debateNumber, reference])
  );
  const debates = debateInputs.map((input) => {
    const debateNumber = input.primaryA.debateNumber;
    const finalLedgerDebate = finalByDebate.get(debateNumber);
    assertV4(
      finalLedgerDebate,
      `${debateNumber}: v2.2.3 final ledger debate missing`
    );
    const passA = deriveRawScores(input.primaryA, input.eventsDocument);
    const passB = deriveRawScores(input.primaryB, input.eventsDocument);
    const final = deriveRawScores(
      finalLedgerDebate.finalJudgment,
      input.eventsDocument
    );
    const production = referenceByDebate.get(debateNumber);
    assertV4(
      production,
      `${debateNumber}: production diagnostic reference missing`
    );
    const initialWinnersAgree = passA.winner === passB.winner;
    return {
      debateNumber,
      debateId: input.primaryA.debateId,
      passA,
      passB,
      final,
      consensus: {
        initialWinnersAgree,
        initialWinner: initialWinnersAgree ? passA.winner : null,
        finalPreservesV21WinnerRule: null,
      },
      productionReferenceDiagnosticOnly: {
        scores: { pro: production.pro, con: production.con },
        winner: winner(production.pro, production.con),
        finalDeltas: {
          pro: final.overall.pro.score - production.pro,
          con: final.overall.con.score - production.con,
        },
        finalWinnerMatches:
          final.winner === winner(production.pro, production.con),
        acceptanceGateInput: false,
      },
    };
  });
  const stability = evaluateV223ScoreStability(debates);
  const stabilityByDebate = new Map(
    stability.winnerStability.rows.map((row) => [row.debateNumber, row])
  );
  for (const debate of debates) {
    debate.consensus.finalPreservesV21WinnerRule =
      stabilityByDebate.get(debate.debateNumber).proposedV21WinnerStabilityPassed;
  }
  return {
    schemaVersion: V223_CALCULATED_SCORES_VERSION,
    protocolId: ledger.protocolId,
    status: stability.acceptancePassed
      ? "v2.2.3-single-score-pass-stability-gate-passed"
      : "v2.2.3-single-score-pass-stability-gate-failed",
    productionCanary: false,
    stagingOnly: true,
    developmentValidationOnly: true,
    sources: { finalLedgerSha256, productionReferenceSha256 },
    formulaBoundary: {
      scoringPasses: 1,
      rawJudgmentsScoredInPass: 30,
      finalJudgmentsEvaluatedFromPass: 10,
      initialPassScoresUsedForPostAdjudicationStabilityDiagnosticsOnly: true,
      modelCalculatedScores: false,
      scoresDerivedOnlyAfterAdjudicatedLedgerLock: true,
      moveFormula: "repository v4.1 deterministic seven-dimension formula",
      responseFormula:
        "repository mapping from adjudicated response class and within-class position",
      sectionFormula: "importance-weighted move mean",
      overallFormula:
        "section-weighted mean plus eligible burden-completion adjustment, rounded and bounded 0-100",
    },
    acceptanceRule: {
      prospective: true,
      policy: "score-stability-policy-v2.1-proposal",
      productionScoresDiagnosticOnly: true,
      agreedInitialProOrConMayCollapseToIntegerRoundedTie: true,
      agreedInitialOppositeSideReversalAllowed: false,
      agreedInitialTieMustRemainTie: true,
      unroundedDirectionDiagnosticOnly: true,
      ...structuredClone(V223_SCORE_STABILITY_THRESHOLDS),
      postResultTuningAllowed: false,
      automaticRerunAllowed: false,
    },
    debates,
    stability,
    totals: {
      debates: 10,
      finalSides: 20,
      scoringPasses: 1,
      modelContexts: 0,
      retries: 0,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      acceptancePassed: stability.acceptancePassed,
    },
    authorization: {
      scoreAnalysis: true,
      scoreRerun: false,
      readinessDecision: false,
      policyPromotion: false,
      publicationPacketPreparation: false,
      publicationModelExecution: false,
      productionMutation: false,
      remainingProductionBatches: false,
    },
  };
}

export function validateV223Scores(
  scores,
  ledger,
  debateInputs,
  productionReferences,
  hashes
) {
  const expected = deriveV223Scores(
    ledger,
    debateInputs,
    productionReferences,
    hashes
  );
  assertV4(
    canonicalJson(scores) === canonicalJson(expected),
    "v2.2.3 calculated scores differ from deterministic replay"
  );
  return {
    status: "passed",
    debates: scores.debates.length,
    finalSides: scores.totals.finalSides,
    scoringPasses: scores.totals.scoringPasses,
    allowedIntegerRoundedTieCollapses:
      scores.stability.winnerStability.allowedIntegerRoundedTieCollapses,
    publishedOppositeSideReversals:
      scores.stability.winnerStability.publishedOppositeSideReversals,
    numericPassed: scores.stability.numericPassed,
    winnerStabilityPassed: scores.stability.winnerStability.passed,
    acceptancePassed: scores.totals.acceptancePassed,
  };
}
