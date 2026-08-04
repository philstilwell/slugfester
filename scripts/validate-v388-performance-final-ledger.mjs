#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  V388_BURDEN_RANGES,
  V388_PERFORMANCE_DEBATES,
  V388_PERFORMANCE_ROOT,
  V388_RATING_KEYS,
  V388_RESPONSE_RANGES,
  assertV388,
  canonicalJson,
  performanceResponseTuple,
  validateV388PerformanceOutput,
} from "./lib/v388-performance-judgment.mjs";
import { V388_ADJUDICATION_ROOT, validateV388AdjudicationOutput } from "./lib/v388-performance-adjudication.mjs";

const root = process.cwd();
const recoveryRoot = `${V388_PERFORMANCE_ROOT}/validated-recovery`;
const readJson = async (relativePath) => JSON.parse(await readFile(path.resolve(root, relativePath), "utf8"));
const same = (actual, expected, label) => assertV388(canonicalJson(actual) === canonicalJson(expected), `${label} mismatch`);

const ledger = await readJson(`${V388_PERFORMANCE_ROOT}/final-ledger.json`);
const disagreements = await readJson(`${V388_PERFORMANCE_ROOT}/initial-disagreements.json`);
const audioAudit = await readJson(`${V388_PERFORMANCE_ROOT}/audio-verification.json`);
assertV388(ledger.status === "assembled-pending-independent-ledger-validation" && ledger.evidenceBoundary.originalCleanTwoPassGatePassed === false && ledger.evidenceBoundary.postHocRepresentationRecoveryUsed && ledger.evidenceBoundary.substantiveJudgmentFieldsChangedByRecovery === 0 && ledger.evidenceBoundary.independentPassJudgments === 162 && ledger.evidenceBoundary.isolatedAdjudicationContexts === 3 && ledger.evidenceBoundary.adjudicationRetries === 0 && ledger.evidenceBoundary.mediumConfidenceMovesAudioVerified === 17, "ledger evidence boundary invalid");
assertV388(ledger.authorization.independentLedgerValidation && !ledger.authorization.scoreDerivation && !ledger.authorization.numericalParticipantScoring && !ledger.authorization.assessmentProse && !ledger.authorization.productionMutation && !ledger.authorization.tenDebateGate && !ledger.authorization.all195Debates, "ledger authorization boundary invalid");
assertV388(ledger.debates.length === 3, "ledger debate count invalid");
const audioMoveIds = new Set(audioAudit.debateAudits.flatMap((debate) => debate.moves.map((move) => move.moveId)));
const counts = { disputedMoves: 0, responseTupleAdjudications: 0, responseTupleAgreements: 0, charityPairAdjudications: 0, ratingAdjudications: 0, nondisputedUnequalRatingMeans: 0, equalRatingAgreements: 0, burdenAdjustmentAdjudications: 0 };
let movesChecked = 0;
let ratingFieldsChecked = 0;

for (const debateNumber of V388_PERFORMANCE_DEBATES) {
  const finalDebate = ledger.debates.find((item) => item.debateNumber === debateNumber);
  assertV388(finalDebate, `${debateNumber}: final debate missing`);
  const [packet, passA, passB, adjudicationPacket, adjudicationOutput] = await Promise.all([
    readJson(`${V388_PERFORMANCE_ROOT}/packets/debate-${debateNumber}.json`),
    readJson(`${recoveryRoot}/normalized/outputs/debate-${debateNumber}-pass-a.json`),
    readJson(`${recoveryRoot}/normalized/outputs/debate-${debateNumber}-pass-b.json`),
    readJson(`${V388_ADJUDICATION_ROOT}/packets/debate-${debateNumber}.json`),
    readJson(`${V388_ADJUDICATION_ROOT}/outputs/debate-${debateNumber}.json`),
  ]);
  validateV388PerformanceOutput(passA, packet, "A");
  validateV388PerformanceOutput(passB, packet, "B");
  validateV388AdjudicationOutput(adjudicationOutput, adjudicationPacket);
  same(finalDebate.sections, packet.sections, `${debateNumber}: sections`);
  same(finalDebate.routes, packet.routes, `${debateNumber}: routes`);
  const debateDisagreements = disagreements.debates.find((item) => item.debateNumber === debateNumber);
  const disputeMap = new Map(debateDisagreements.moveDisputes.map((item) => [item.moveId, item]));
  const decisionMap = new Map(adjudicationOutput.moveDecisions.map((item) => [item.moveId, item]));

  assertV388(finalDebate.moves.length === packet.moves.length, `${debateNumber}: final move count mismatch`);
  for (let index = 0; index < packet.moves.length; index += 1) {
    const locked = packet.moves[index];
    const finalMove = finalDebate.moves[index];
    const judgmentA = passA.moveJudgments[index];
    const judgmentB = passB.moveJudgments[index];
    const dispute = disputeMap.get(locked.moveId) ?? null;
    const decision = decisionMap.get(locked.moveId) ?? null;
    assertV388(Boolean(dispute) === Boolean(decision), `${debateNumber}:${locked.moveId}: dispute/decision mismatch`);
    if (decision) counts.disputedMoves += 1;
    for (const key of ["moveId", "sectionId", "sectionTitle", "sectionWeight", "side", "speaker", "importance", "selectionRole", "moveKind", "proposition"]) same(finalMove[key], locked[key], `${debateNumber}:${locked.moveId}:${key}`);
    same(finalMove.sourceSpan, locked.sourceSpan, `${debateNumber}:${locked.moveId}: source span`);
    same(finalMove.lockedBurdenContact, locked.lockedBurdenContact, `${debateNumber}:${locked.moveId}: burden contact`);
    same(finalMove.confidenceEvidence, { passA: judgmentA.assessmentConfidence, passB: judgmentB.assessmentConfidence, audioVerified: audioMoveIds.has(locked.moveId) }, `${debateNumber}:${locked.moveId}: confidence evidence`);

    const tupleA = performanceResponseTuple(judgmentA.response);
    const tupleB = performanceResponseTuple(judgmentB.response);
    if (finalMove.resolution.response.method === "adjudicated-candidate") {
      assertV388(dispute?.disputedFields.responseTuple && decision.responseTupleChoice === finalMove.resolution.response.choice, `${debateNumber}:${locked.moveId}: invalid response adjudication provenance`);
      same(finalMove.response, decision.responseTupleChoice === 1 ? tupleA : tupleB, `${debateNumber}:${locked.moveId}: adjudicated response`);
      counts.responseTupleAdjudications += 1;
    } else {
      assertV388(finalMove.resolution.response.method === "initial-agreement" && !dispute?.disputedFields.responseTuple, `${debateNumber}:${locked.moveId}: invalid response agreement provenance`);
      same(tupleA, tupleB, `${debateNumber}:${locked.moveId}: initial response agreement`);
      same(finalMove.response, tupleA, `${debateNumber}:${locked.moveId}: agreed response`);
      counts.responseTupleAgreements += 1;
    }

    const ratingChoiceMap = new Map((decision?.ratingChoices ?? []).map((item) => [item.ratingKey, item.choice]));
    if (finalMove.resolution.charityPair) {
      const choice = finalMove.resolution.charityPair.choice;
      assertV388(dispute?.disputedFields.charityTested && decision.charityPairChoice === choice, `${debateNumber}:${locked.moveId}: invalid charity pair provenance`);
      const selected = choice === 1 ? judgmentA : judgmentB;
      assertV388(finalMove.charityTested === selected.charityTested && finalMove.ratings.representationalCharity === selected.ratings.representationalCharity.value, `${debateNumber}:${locked.moveId}: charity pair value mismatch`);
      counts.charityPairAdjudications += 1;
    } else {
      assertV388(judgmentA.charityTested === judgmentB.charityTested && finalMove.charityTested === judgmentA.charityTested, `${debateNumber}:${locked.moveId}: undisputed charity mismatch`);
    }

    for (const key of V388_RATING_KEYS) {
      const valueA = judgmentA.ratings[key].value;
      const valueB = judgmentB.ratings[key].value;
      const resolution = finalMove.resolution.ratings[key];
      assertV388(Number.isInteger(finalMove.ratings[key]) && finalMove.ratings[key] >= 0 && finalMove.ratings[key] <= 100, `${debateNumber}:${locked.moveId}:${key}: invalid final value`);
      if (resolution.method === "adjudicated-charity-pair") {
        assertV388(key === "representationalCharity" && finalMove.resolution.charityPair && resolution.choice === finalMove.resolution.charityPair.choice, `${debateNumber}:${locked.moveId}:${key}: invalid charity rating resolution`);
        counts.ratingAdjudications += 1;
      } else if (resolution.method === "adjudicated-candidate") {
        assertV388(ratingChoiceMap.get(key) === resolution.choice, `${debateNumber}:${locked.moveId}:${key}: missing adjudication choice`);
        assertV388(finalMove.ratings[key] === (resolution.choice === 1 ? valueA : valueB), `${debateNumber}:${locked.moveId}:${key}: adjudicated value mismatch`);
        counts.ratingAdjudications += 1;
      } else if (resolution.method === "initial-agreement") {
        assertV388(valueA === valueB && finalMove.ratings[key] === valueA && !ratingChoiceMap.has(key), `${debateNumber}:${locked.moveId}:${key}: false agreement`);
        counts.equalRatingAgreements += 1;
      } else {
        assertV388(resolution.method === "rounded-mean-of-nondisputed-values" && valueA !== valueB && !ratingChoiceMap.has(key), `${debateNumber}:${locked.moveId}:${key}: invalid mean provenance`);
        assertV388(finalMove.ratings[key] === Math.round((valueA + valueB) / 2), `${debateNumber}:${locked.moveId}:${key}: rounded mean mismatch`);
        const exposed = new Set(dispute?.triggers.exposedRatingKeys ?? []);
        assertV388(!exposed.has(key) || (key === "representationalCharity" && dispute?.disputedFields.charityTested), `${debateNumber}:${locked.moveId}:${key}: disputed value improperly averaged`);
        counts.nondisputedUnequalRatingMeans += 1;
      }
      ratingFieldsChecked += 1;
    }

    const responseRange = V388_RESPONSE_RANGES[finalMove.response.class];
    assertV388(finalMove.ratings.responsiveness >= responseRange[0] && finalMove.ratings.responsiveness <= responseRange[1], `${debateNumber}:${locked.moveId}: final response band violation`);
    const burdenRange = V388_BURDEN_RANGES[locked.lockedBurdenContact?.tier ?? "none"];
    assertV388(finalMove.ratings.relevanceBurden >= burdenRange[0] && finalMove.ratings.relevanceBurden <= burdenRange[1], `${debateNumber}:${locked.moveId}: final burden band violation`);
    if (!finalMove.charityTested) assertV388(finalMove.ratings.representationalCharity === 75, `${debateNumber}:${locked.moveId}: final untested charity violation`);
    movesChecked += 1;
  }

  for (const side of ["pro", "con"]) {
    const extracted = debateDisagreements.burdenAdjustmentDisputes.find((item) => item.side === side);
    const decision = adjudicationOutput.burdenAdjustmentDecisions.find((item) => item.side === side);
    assertV388(extracted && decision && finalDebate.burdenAdjustmentResolution[side].choice === decision.choice, `${debateNumber}:${side}: burden adjustment resolution missing`);
    same(finalDebate.burdenCompletionAdjustment[side], decision.choice === 1 ? extracted.candidate1FullRecord : extracted.candidate2FullRecord, `${debateNumber}:${side}: burden adjustment choice`);
    counts.burdenAdjustmentAdjudications += 1;
  }
}

assertV388(movesChecked === 81 && ratingFieldsChecked === 567, "ledger validator coverage incomplete");
same(ledger.summary, { debates: 3, uniqueMoves: 81, finalRatingFields: 567, ...counts }, "ledger summary");
assertV388(counts.disputedMoves === 76 && counts.responseTupleAdjudications === 34 && counts.responseTupleAgreements === 47 && counts.charityPairAdjudications === 6 && counts.ratingAdjudications === 190 && counts.nondisputedUnequalRatingMeans === 297 && counts.equalRatingAgreements === 80 && counts.burdenAdjustmentAdjudications === 6, "ledger resolution totals invalid");
console.log(JSON.stringify({ status: "passed", finalLedgerValidated: true, debates: 3, movesChecked, ratingFieldsChecked, ...counts, thirdValuesInvented: 0, scoreDerivationAuthorized: true, assessmentProseAuthorized: false }, null, 2));
