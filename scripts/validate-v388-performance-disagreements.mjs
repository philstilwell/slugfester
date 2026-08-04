#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  V388_PERFORMANCE_DEBATES,
  V388_PERFORMANCE_ROOT,
  V388_RATING_KEYS,
  assertV388,
  canonicalJson,
  extractV388MoveDisagreement,
  performanceResponseTuple,
  validateV388PerformanceOutput,
} from "./lib/v388-performance-judgment.mjs";

const root = process.cwd();
const recoveryRoot = `${V388_PERFORMANCE_ROOT}/validated-recovery`;
const readJson = async (relativePath) => JSON.parse(await readFile(path.resolve(root, relativePath), "utf8"));
const sorted = (values) => [...values].sort();
const same = (actual, expected, label) => assertV388(canonicalJson(actual) === canonicalJson(expected), `${label} mismatch`);

function adjustmentSemanticTuple(adjustment) {
  return {
    value: adjustment.value,
    eligibility: {
      distinctDebateWideConsequence: adjustment.eligibility.distinctDebateWideConsequence,
      affectsBurdenCompletion: adjustment.eligibility.affectsBurdenCompletion,
      notAlreadyScored: adjustment.eligibility.notAlreadyScored,
      affectedBurdenIds: sorted(adjustment.eligibility.affectedBurdenIds),
      relatedMoveIds: sorted(adjustment.eligibility.relatedMoveIds),
      alreadyCapturedBy: sorted(adjustment.eligibility.alreadyCapturedBy),
    },
  };
}

const artifact = await readJson(`${V388_PERFORMANCE_ROOT}/initial-disagreements.json`);
assertV388(artifact.status === "passed-deterministic-disagreement-extraction", "disagreement artifact status invalid");
assertV388(!artifact.evidenceBoundary.originalCleanGatePassed && artifact.evidenceBoundary.postHocRepresentationRecoveryUsed && artifact.evidenceBoundary.substantiveJudgmentFieldsChangedByRecovery === 0 && artifact.evidenceBoundary.rawOutputsPreserved, "disagreement evidence boundary invalid");
assertV388(artifact.debates.length === 3 && artifact.authorization.prepareDisputeOnlyAdjudicationPackets && !artifact.authorization.adjudicationModelExecution && !artifact.authorization.scoreDerivation, "disagreement authorization invalid");

const totals = {
  uniqueMoves: 0,
  disputedMoves: 0,
  responseTupleDisputes: 0,
  charityTestedDisputes: 0,
  ratingFieldDisputes: 0,
  diagnosticTriggerMoves: 0,
  burdenAdjustmentDisputes: 0,
  nondisputedUnequalScalarFields: 0,
};

for (const debateNumber of V388_PERFORMANCE_DEBATES) {
  const record = artifact.debates.find((item) => item.debateNumber === debateNumber);
  assertV388(record, `${debateNumber}: missing disagreement record`);
  const [packet, passA, passB] = await Promise.all([readJson(record.packetPath), readJson(record.passAPath), readJson(record.passBPath)]);
  validateV388PerformanceOutput(passA, packet, "A");
  validateV388PerformanceOutput(passB, packet, "B");
  assertV388(record.moveCount === packet.moves.length && passA.moveJudgments.length === packet.moves.length && passB.moveJudgments.length === packet.moves.length, `${debateNumber}: move count mismatch`);

  const disputeMap = new Map(record.moveDisputes.map((item) => [item.moveId, item]));
  const mergeMap = new Map(record.nondisputedScalarMerges.map((item) => [`${item.moveId}:${item.ratingKey}`, item]));
  let expectedMoveDisputes = 0;
  let expectedMerges = 0;

  for (let index = 0; index < packet.moves.length; index += 1) {
    const judgmentA = passA.moveJudgments[index];
    const judgmentB = passB.moveJudgments[index];
    const disagreement = extractV388MoveDisagreement(judgmentA, judgmentB);
    const stored = disputeMap.get(judgmentA.moveId);
    assertV388(Boolean(stored) === disagreement.disputed, `${debateNumber}:${judgmentA.moveId}: dispute presence mismatch`);
    if (disagreement.disputed) {
      expectedMoveDisputes += 1;
      same(stored.triggers, {
        responseTupleMismatch: disagreement.responseMismatch,
        charityTestedMismatch: disagreement.charityTestedMismatch,
        materialRatingKeys: disagreement.materialRatingKeys,
        diagnosticMoveDelta: disagreement.diagnosticDelta,
        diagnosticTrigger: disagreement.diagnosticTrigger,
        exposedRatingKeys: disagreement.exposedRatingKeys,
      }, `${debateNumber}:${judgmentA.moveId}: triggers`);
      same(stored.disputedFields.responseTuple, disagreement.responseMismatch ? { candidate1: performanceResponseTuple(judgmentA.response), candidate2: performanceResponseTuple(judgmentB.response) } : null, `${debateNumber}:${judgmentA.moveId}: response candidates`);
      same(stored.disputedFields.charityTested, disagreement.charityTestedMismatch ? { candidate1: judgmentA.charityTested, candidate2: judgmentB.charityTested } : null, `${debateNumber}:${judgmentA.moveId}: charity candidates`);
      const ratingCandidates = Object.fromEntries(disagreement.exposedRatingKeys.map((key) => [key, { candidate1: judgmentA.ratings[key].value, candidate2: judgmentB.ratings[key].value, absoluteDelta: Math.abs(judgmentA.ratings[key].value - judgmentB.ratings[key].value) }]));
      same(stored.disputedFields.ratings, ratingCandidates, `${debateNumber}:${judgmentA.moveId}: rating candidates`);
      totals.responseTupleDisputes += Number(disagreement.responseMismatch);
      totals.charityTestedDisputes += Number(disagreement.charityTestedMismatch);
      totals.ratingFieldDisputes += disagreement.exposedRatingKeys.length;
      totals.diagnosticTriggerMoves += Number(disagreement.diagnosticTrigger);
    }

    const exposed = new Set(disagreement.exposedRatingKeys);
    for (const key of V388_RATING_KEYS) {
      const valueA = judgmentA.ratings[key].value;
      const valueB = judgmentB.ratings[key].value;
      const merge = mergeMap.get(`${judgmentA.moveId}:${key}`);
      const expected = valueA !== valueB && !exposed.has(key);
      assertV388(Boolean(merge) === expected, `${debateNumber}:${judgmentA.moveId}:${key}: nondisputed merge presence mismatch`);
      if (expected) {
        expectedMerges += 1;
        same(merge, { moveId: judgmentA.moveId, ratingKey: key, candidate1: valueA, candidate2: valueB, roundedMeanAfterAdjudication: Math.round((valueA + valueB) / 2) }, `${debateNumber}:${judgmentA.moveId}:${key}: nondisputed merge`);
      }
    }
  }

  assertV388(disputeMap.size === expectedMoveDisputes && mergeMap.size === expectedMerges, `${debateNumber}: unexpected duplicate or extra dispute entries`);
  const expectedAdjustmentDisputes = [];
  for (const side of ["pro", "con"]) {
    const tupleA = adjustmentSemanticTuple(passA.burdenCompletionAdjustment[side]);
    const tupleB = adjustmentSemanticTuple(passB.burdenCompletionAdjustment[side]);
    if (canonicalJson(tupleA) !== canonicalJson(tupleB)) expectedAdjustmentDisputes.push({ side, candidate1SemanticTuple: tupleA, candidate2SemanticTuple: tupleB, candidate1FullRecord: passA.burdenCompletionAdjustment[side], candidate2FullRecord: passB.burdenCompletionAdjustment[side] });
  }
  same(record.burdenAdjustmentDisputes, expectedAdjustmentDisputes, `${debateNumber}: burden adjustment disputes`);
  assertV388(record.disputedMoveCount === expectedMoveDisputes && record.nondisputedUnequalScalarFieldCount === expectedMerges && record.burdenAdjustmentDisputeCount === expectedAdjustmentDisputes.length, `${debateNumber}: stored counts mismatch`);

  totals.uniqueMoves += packet.moves.length;
  totals.disputedMoves += expectedMoveDisputes;
  totals.burdenAdjustmentDisputes += expectedAdjustmentDisputes.length;
  totals.nondisputedUnequalScalarFields += expectedMerges;
}

same(artifact.summary, { debates: 3, uniqueMoves: totals.uniqueMoves, moveJudgmentsCompared: totals.uniqueMoves * 2, disputedMoves: totals.disputedMoves, responseTupleDisputes: totals.responseTupleDisputes, charityTestedDisputes: totals.charityTestedDisputes, ratingFieldDisputes: totals.ratingFieldDisputes, diagnosticTriggerMoves: totals.diagnosticTriggerMoves, burdenAdjustmentDisputes: totals.burdenAdjustmentDisputes, nondisputedUnequalScalarFields: totals.nondisputedUnequalScalarFields }, "summary");
assertV388(totals.uniqueMoves === 81, "validator must cover 81 moves");
console.log(JSON.stringify({ status: "passed", deterministicDisagreementArtifactValidated: true, ...artifact.summary, scoreDerivationAuthorized: false }, null, 2));
