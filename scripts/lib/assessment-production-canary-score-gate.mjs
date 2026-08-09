import { assertV4, deriveV4PrimaryScores } from "./v4-lean-production.mjs";
import { canonicalizeV4220PrimaryOutput } from "./v4220-source-span-rendering.mjs";

export const PRODUCTION_CANARY_SCORE_ROOT =
  "docs/assessment-production/canary-v1-score-pass";
export const PRODUCTION_CANARY_CALCULATED_SCORES_VERSION =
  "1.0-production-canary-adjudicated-calculated-scores";
export const PRODUCTION_CANARY_SCORE_STABILITY_THRESHOLDS = Object.freeze({
  meanAbsoluteDistanceToInitialPassesMaximum: 4,
  maximumAbsoluteDistanceToEitherInitialPassMaximum: 8,
  maximumOutsideInitialRangeMaximum: 3,
});

const winner = (pro, con) =>
  pro === con ? "tie" : pro > con ? "pro" : "con";

function deriveRawScores(raw, eventsDocument) {
  const canonical = canonicalizeV4220PrimaryOutput(raw, eventsDocument);
  const scores = deriveV4PrimaryScores(canonical);
  return {
    ...scores,
    scoreProtocolId:
      "assessment-production-canary-v1-single-deterministic-score-pass",
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

export function evaluateProductionCanaryScoreStability(
  debates,
  thresholds = PRODUCTION_CANARY_SCORE_STABILITY_THRESHOLDS
) {
  assertV4(
    Array.isArray(debates) && debates.length === 10,
    "ten scored production-canary debates required"
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
  const meanAbsoluteDistanceToInitialPasses = Number(
    (
      absoluteDistances.reduce((sum, value) => sum + value, 0) /
      absoluteDistances.length
    ).toFixed(2)
  );
  const maximumAbsoluteDistanceToEitherInitialPass = Math.max(
    ...absoluteDistances
  );
  const maximumOutsideInitialRange = Math.max(
    ...sideRows.map((row) => row.outsideInitialRange)
  );
  const agreedWinnerDebates = debates.filter(
    (debate) => debate.passA.winner === debate.passB.winner
  );
  const agreedWinnersPreserved = agreedWinnerDebates.filter(
    (debate) => debate.final.winner === debate.passA.winner
  ).length;
  const scoreBoundsPassed = sideRows.every((row) =>
    [row.passA, row.passB, row.final].every(
      (score) => Number.isInteger(score) && score >= 0 && score <= 100
    )
  );
  const acceptancePassed =
    scoreBoundsPassed &&
    agreedWinnersPreserved === agreedWinnerDebates.length &&
    meanAbsoluteDistanceToInitialPasses <=
      thresholds.meanAbsoluteDistanceToInitialPassesMaximum &&
    maximumAbsoluteDistanceToEitherInitialPass <=
      thresholds.maximumAbsoluteDistanceToEitherInitialPassMaximum &&
    maximumOutsideInitialRange <=
      thresholds.maximumOutsideInitialRangeMaximum;
  return {
    sideRows,
    scoreBoundsPassed,
    agreedWinnerDebates: agreedWinnerDebates.length,
    agreedWinnersPreserved,
    meanAbsoluteDistanceToInitialPasses,
    maximumAbsoluteDistanceToEitherInitialPass,
    maximumOutsideInitialRange,
    thresholds: structuredClone(thresholds),
    acceptancePassed,
  };
}

export function deriveProductionCanaryScores(
  ledger,
  debateInputs,
  productionReferences,
  { finalLedgerSha256, productionReferenceSha256 }
) {
  assertV4(
    ledger?.status ===
      "passed-production-canary-deterministic-final-ledger-assembly" &&
      ledger.authorization.scoreDerivation &&
      ledger.authorization.scorePassesMaximum === 1 &&
      ledger.audit.calculatedScores === 0,
    "validated production-canary adjudicated final ledger required for scoring"
  );
  assertV4(
    Array.isArray(debateInputs) && debateInputs.length === 10,
    "ten production-canary score inputs required"
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
      `${debateNumber}: production-canary final ledger debate missing`
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
        finalPreservesAgreedWinner:
          !initialWinnersAgree || final.winner === passA.winner,
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
  const stability = evaluateProductionCanaryScoreStability(debates);
  return {
    schemaVersion: PRODUCTION_CANARY_CALCULATED_SCORES_VERSION,
    protocolId: ledger.protocolId,
    status: stability.acceptancePassed
      ? "production-canary-single-score-pass-stability-gate-passed"
      : "production-canary-single-score-pass-stability-gate-failed",
    productionCanary: true,
    stagingOnly: true,
    sources: { finalLedgerSha256, productionReferenceSha256 },
    formulaBoundary: {
      scoringPasses: 1,
      rawJudgmentsScoredInPass: 30,
      finalJudgmentsPublishedFromPass: 10,
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
      productionScoresDiagnosticOnly: true,
      agreedInitialWinnerMustBePreserved: true,
      ...structuredClone(PRODUCTION_CANARY_SCORE_STABILITY_THRESHOLDS),
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
      publicationPacketPreparation: false,
      publicationModelExecution: false,
      productionMutation: false,
      remainingProductionBatches: false,
    },
  };
}
