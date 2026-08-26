import {
  assertV4,
  canonicalJson,
  deriveV4PrimaryScores
} from "./v4-lean-production.mjs";
import { canonicalizeV4220PrimaryOutput } from "./v4220-source-span-rendering.mjs";
import {
  ACTIVE_SCORE_STABILITY_POLICY_PATH,
  ACTIVE_SCORE_STABILITY_POLICY_VERSION,
  ACTIVE_SCORE_STABILITY_THRESHOLDS,
  evaluateActiveProductionScoreStability
} from "./assessment-production-score-stability-policy-active.mjs";

export const POST_CANARY_BATCH_12_SCORE_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-12/score-pass";
export const POST_CANARY_BATCH_12_CALCULATED_SCORES_VERSION =
  "1.0-assessment-production-post-canary-batch-12-adjudicated-calculated-scores";
export const POST_CANARY_BATCH_12_SCORE_STABILITY_THRESHOLDS =
  ACTIVE_SCORE_STABILITY_THRESHOLDS;

const winner = (pro, con) =>
  pro === con ? "tie" : pro > con ? "pro" : "con";

function deriveRawScores(raw, eventsDocument) {
  const canonical = canonicalizeV4220PrimaryOutput(raw, eventsDocument);
  const scores = deriveV4PrimaryScores(canonical);
  return {
    ...scores,
    scoreProtocolId:
      "assessment-production-post-canary-batch-12-single-deterministic-score-pass"
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

export function evaluatePostCanaryBatch12ScoreStability(
  debates,
  thresholds = POST_CANARY_BATCH_12_SCORE_STABILITY_THRESHOLDS
) {
  assertV4(
    Array.isArray(debates) && debates.length === 10,
    "ten scored post-canary Batch 12 debates required"
  );
  assertV4(
    canonicalJson(thresholds) ===
      canonicalJson(POST_CANARY_BATCH_12_SCORE_STABILITY_THRESHOLDS),
    "post-canary Batch 12 active thresholds changed"
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
        outsideInitialRange: outsideRange(final, passA, passB)
      };
    })
  );
  const absoluteDistances = sideRows.flatMap((row) => [
    row.absoluteDistanceFromPassA,
    row.absoluteDistanceFromPassB
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
    maximumAbsoluteDistanceToEitherInitialPass: Math.max(...absoluteDistances),
    maximumOutsideInitialRange: Math.max(
      ...sideRows.map((row) => row.outsideInitialRange)
    ),
    thresholds: structuredClone(thresholds)
  };
  const active = evaluateActiveProductionScoreStability(debates, numeric);
  return {
    ...numeric,
    policyVersion: active.policyVersion,
    policyPath: active.policyPath,
    numericPassed: active.numericPassed,
    winnerStability: active.winnerStability,
    integerRoundedTieCollapseAllowed: true,
    agreedInitialTieDirectionUnconstrained: true,
    disagreedInitialWinnerDirectionUnconstrained: true,
    unroundedDirectionDiagnosticOnly: true,
    acceptancePassed: active.acceptancePassed
  };
}

export function derivePostCanaryBatch12Scores(
  ledger,
  debateInputs,
  productionReferences,
  { finalLedgerSha256, productionReferenceSha256, activePolicySha256 }
) {
  assertV4(
    ledger?.status ===
        "passed-post-canary-batch-12-deterministic-final-ledger-assembly" &&
      ledger.batchNumber === 12 &&
      ledger.audit.finalRawJudgments === 10 &&
      ledger.audit.calculatedScores === 0 &&
      ledger.authorization.scoreDerivation === false,
    "validated score-free post-canary Batch 12 final ledger required for scoring"
  );
  assertV4(
    Array.isArray(debateInputs) && debateInputs.length === 10,
    "ten post-canary Batch 12 score inputs required"
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
      `${debateNumber}: Batch 12 final-ledger debate missing`
    );
    const passA = deriveRawScores(input.primaryA, input.eventsDocument);
    const passB = deriveRawScores(input.primaryB, input.eventsDocument);
    const final = deriveRawScores(
      finalLedgerDebate.finalJudgment,
      input.eventsDocument
    );
    const production = referenceByDebate.get(debateNumber);
    assertV4(production, `${debateNumber}: production diagnostic reference missing`);
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
        finalPreservesActiveV22WinnerRule: null
      },
      productionReferenceDiagnosticOnly: {
        scores: { pro: production.pro, con: production.con },
        winner: winner(production.pro, production.con),
        finalDeltas: {
          pro: final.overall.pro.score - production.pro,
          con: final.overall.con.score - production.con
        },
        finalWinnerMatches:
          final.winner === winner(production.pro, production.con),
        acceptanceGateInput: false
      }
    };
  });
  const stability = evaluatePostCanaryBatch12ScoreStability(debates);
  const stabilityByDebate = new Map(
    stability.winnerStability.rows.map((row) => [row.debateNumber, row])
  );
  for (const debate of debates) {
    debate.consensus.finalPreservesActiveV22WinnerRule =
      stabilityByDebate.get(debate.debateNumber)
        .proposedV22WinnerStabilityPassed;
  }
  return {
    schemaVersion: POST_CANARY_BATCH_12_CALCULATED_SCORES_VERSION,
    protocolId: ledger.protocolId,
    status: stability.acceptancePassed
      ? "post-canary-batch-12-single-score-pass-stability-gate-passed"
      : "post-canary-batch-12-single-score-pass-stability-gate-failed",
    productionCanary: false,
    batchNumber: 12,
    stagingOnly: true,
    developmentValidationOnly: false,
    sources: {
      finalLedgerSha256,
      productionReferenceSha256,
      activePolicySha256
    },
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
        "section-weighted mean plus eligible burden-completion adjustment, rounded and bounded 0-100"
    },
    acceptanceRule: {
      prospective: true,
      policyVersion: ACTIVE_SCORE_STABILITY_POLICY_VERSION,
      policyPath: ACTIVE_SCORE_STABILITY_POLICY_PATH,
      productionScoresDiagnosticOnly: true,
      agreedInitialProOrConMayCollapseToIntegerRoundedTie: true,
      agreedInitialOppositeSideReversalAllowed: false,
      agreedInitialTieDirectionConstraint: "none",
      disagreedInitialWinnerDirectionConstraint: "none",
      unroundedDirectionDiagnosticOnly: true,
      ...structuredClone(POST_CANARY_BATCH_12_SCORE_STABILITY_THRESHOLDS),
      postResultTuningAllowed: false,
      automaticRerunAllowed: false
    },
    debates,
    stability,
    totals: {
      debates: 10,
      finalSides: 20,
      scoringPasses: 1,
      modelContexts: 0,
      retries: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      acceptancePassed: stability.acceptancePassed
    },
    authorization: {
      scoreAnalysis: true,
      scoreRerun: false,
      publicationPacketPreparation: false,
      publicationModelExecution: false,
      publicationFinalization: false,
      productionMutation: false,
      nextBatchSelection: false
    }
  };
}

export function validatePostCanaryBatch12Scores(
  scores,
  ledger,
  debateInputs,
  productionReferences,
  hashes
) {
  const expected = derivePostCanaryBatch12Scores(
    ledger,
    debateInputs,
    productionReferences,
    hashes
  );
  assertV4(
    canonicalJson(scores) === canonicalJson(expected),
    "post-canary Batch 12 calculated scores differ from deterministic replay"
  );
  return {
    status: "passed",
    debates: scores.debates.length,
    finalSides: scores.totals.finalSides,
    scoringPasses: scores.totals.scoringPasses,
    activePolicyVersion: scores.stability.policyVersion,
    allowedIntegerRoundedTieCollapses:
      scores.stability.winnerStability.allowedIntegerRoundedTieCollapses,
    allowedAgreedInitialTieDrifts:
      scores.stability.winnerStability.allowedAgreedInitialTieDrifts,
    publishedOppositeSideReversals:
      scores.stability.winnerStability.publishedOppositeSideReversals,
    numericPassed: scores.stability.numericPassed,
    winnerStabilityPassed: scores.stability.winnerStability.passed,
    acceptancePassed: scores.totals.acceptancePassed
  };
}
