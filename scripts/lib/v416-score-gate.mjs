import { assertV4, deriveV41PrimaryScores } from "./v41-lean-production.mjs";

export const V416_CALCULATED_SCORES_VERSION = "4.1.6-adjudicated-calculated-scores";

function winner(pro, con) {
  return pro === con ? "tie" : pro > con ? "pro" : "con";
}

export function compareV416Score(debateNumber, actual, comparator) {
  assertV4(actual?.debateNumber === debateNumber && comparator?.debateNumber === debateNumber, `${debateNumber}: score comparator identity mismatch`);
  const expected = { pro: comparator.overall.pro.final.score, con: comparator.overall.con.final.score };
  const observed = { pro: actual.overall.pro.score, con: actual.overall.con.score };
  const deltas = { pro: observed.pro - expected.pro, con: observed.con - expected.con };
  const expectedWinner = winner(expected.pro, expected.con);
  return {
    expected,
    actual: observed,
    deltas,
    absoluteDeltas: { pro: Math.abs(deltas.pro), con: Math.abs(deltas.con) },
    maximumAbsoluteDelta: Math.max(Math.abs(deltas.pro), Math.abs(deltas.con)),
    expectedWinner,
    actualWinner: actual.winner,
    winnerPreserved: actual.winner === expectedWinner,
    bothSidesWithinFive: Math.abs(deltas.pro) <= 5 && Math.abs(deltas.con) <= 5
  };
}

export function deriveV416Scores(ledger, comparatorArtifact, { finalLedgerSha256, comparatorSha256 }) {
  assertV4(ledger?.status === "passed-final-ledger-assembly" && ledger.authorization.scoreDerivation && ledger.audit.calculatedScores === 0, "validated final ledger required for scoring");
  const comparatorByDebate = new Map(comparatorArtifact.debates.map((debate) => [debate.debateNumber, debate]));
  const debates = ledger.debates.map((debate) => {
    const scores = deriveV41PrimaryScores(debate.finalJudgment);
    const comparator = compareV416Score(debate.debateNumber, scores, comparatorByDebate.get(debate.debateNumber));
    return { debateNumber: debate.debateNumber, debateId: debate.debateId, scores, comparator };
  });
  const winnerClassificationsPreserved = debates.filter((debate) => debate.comparator.winnerPreserved).length;
  const sidesWithinFive = debates.reduce((sum, debate) => sum + ["pro", "con"].filter((side) => debate.comparator.absoluteDeltas[side] <= 5).length, 0);
  const maximumAbsoluteDelta = Math.max(...debates.map((debate) => debate.comparator.maximumAbsoluteDelta));
  const acceptancePassed = winnerClassificationsPreserved === 3 && sidesWithinFive === 6;
  return {
    schemaVersion: V416_CALCULATED_SCORES_VERSION,
    protocolId: ledger.protocolId,
    status: acceptancePassed ? "retired-three-debate-score-gate-passed" : "retired-three-debate-score-gate-failed",
    sources: { finalLedgerSha256, comparatorSha256 },
    formulaBoundary: { singleDeterministicPass: true, modelCalculatedScores: false, scoresDerivedOnlyAfterAdjudicatedLedgerLock: true, moveFormula: "repository v4.1 deterministic formula", sectionFormula: "importance-weighted move mean", overallFormula: "section-weighted mean plus eligible burden-completion adjustment, rounded and bounded 0-100" },
    acceptanceRule: { winnerClassificationsRequired: 3, sidesWithinFiveRequired: 6, maximumAbsoluteSideDelta: 5, postResultTuningAllowed: false },
    debates,
    totals: { debates: 3, sides: 6, winnerClassificationsPreserved, sidesWithinFive, maximumAbsoluteDelta, acceptancePassed },
    authorization: { publicationFinalization: acceptancePassed, productionMutation: false, heldOutGate: false, all195Debates: false }
  };
}
