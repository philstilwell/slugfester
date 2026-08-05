#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V3811_BURDEN_RANGES,
  V3811_PERFORMANCE_DEBATES,
  V3811_PERFORMANCE_ROOT,
  V3811_RATING_KEYS,
  V3811_RESPONSE_RANGES,
  assertV3811,
  canonicalJson,
  performanceResponseTuple,
  validateV3811PerformanceOutput,
} from "./lib/v3811-performance-judgment.mjs";
import { V3811_ADJUDICATION_ROOT, validateV3811AdjudicationOutput } from "./lib/v3811-performance-adjudication.mjs";

const root = process.cwd();
const initialOutputsRoot = `${V3811_PERFORMANCE_ROOT}/initial-outputs`;
const ledgerPath = `${V3811_PERFORMANCE_ROOT}/final-ledger.json`;
const validationPath = `${V3811_PERFORMANCE_ROOT}/final-ledger-validation.json`;
const readJson = async (relativePath) => JSON.parse(await readFile(path.resolve(root, relativePath), "utf8"));
const same = (actual, expected, label) => assertV3811(canonicalJson(actual) === canonicalJson(expected), `${label} mismatch`);
const sorted = (values) => [...values].sort();
const adjustmentSemanticTuple = (adjustment) => ({
  value: adjustment.value,
  eligibility: {
    distinctDebateWideConsequence: adjustment.eligibility.distinctDebateWideConsequence,
    affectsBurdenCompletion: adjustment.eligibility.affectsBurdenCompletion,
    notAlreadyScored: adjustment.eligibility.notAlreadyScored,
    affectedBurdenIds: sorted(adjustment.eligibility.affectedBurdenIds),
    relatedMoveIds: sorted(adjustment.eligibility.relatedMoveIds),
    alreadyCapturedBy: sorted(adjustment.eligibility.alreadyCapturedBy),
  },
});

const ledger = await readJson(ledgerPath);
const disagreements = await readJson(`${V3811_PERFORMANCE_ROOT}/initial-disagreements.json`);
const audioAudit = await readJson("docs/calibration/v3.8.8/performance-judgment-consensus/audio-verification.json");
const adjudicationPreparation = await readJson(`${V3811_ADJUDICATION_ROOT}/preparation-audit.json`);
assertV3811(ledger.status === "assembled-pending-independent-ledger-validation" && ledger.evidenceBoundary.originalCleanTwoPassGatePassed && !ledger.evidenceBoundary.postHocRepresentationRecoveryUsed && ledger.evidenceBoundary.initialPerformanceAttempts === 6 && ledger.evidenceBoundary.initialPerformanceRetries === 0 && ledger.evidenceBoundary.independentPassJudgments === 162 && ledger.evidenceBoundary.isolatedAdjudicationContexts === 3 && ledger.evidenceBoundary.adjudicationRetries === 0 && ledger.evidenceBoundary.mediumConfidenceMovesAudioVerified === 17, "ledger evidence boundary invalid");
assertV3811(ledger.authorization.independentLedgerValidation && !ledger.authorization.scoreDerivation && !ledger.authorization.numericalParticipantScoring && !ledger.authorization.assessmentProse && !ledger.authorization.productionMutation && !ledger.authorization.tenDebateGate && !ledger.authorization.all195Debates, "ledger authorization boundary invalid");
assertV3811(ledger.debates.length === 3, "ledger debate count invalid");
const audioMoveIds = new Set(audioAudit.debateAudits.flatMap((debate) => debate.moves.map((move) => move.moveId)));
const counts = { disputedMoves: 0, responseTupleAdjudications: 0, responseTupleAgreements: 0, charityPairAdjudications: 0, ratingAdjudications: 0, nondisputedUnequalRatingMeans: 0, equalRatingAgreements: 0, burdenAdjustmentAdjudications: 0 };
let movesChecked = 0;
let ratingFieldsChecked = 0;

for (const debateNumber of V3811_PERFORMANCE_DEBATES) {
  const finalDebate = ledger.debates.find((item) => item.debateNumber === debateNumber);
  assertV3811(finalDebate, `${debateNumber}: final debate missing`);
  const [packet, passA, passB, adjudicationPacket, adjudicationOutput] = await Promise.all([
    readJson(`${V3811_PERFORMANCE_ROOT}/packets/debate-${debateNumber}.json`),
    readJson(`${initialOutputsRoot}/debate-${debateNumber}-pass-a.json`),
    readJson(`${initialOutputsRoot}/debate-${debateNumber}-pass-b.json`),
    readJson(`${V3811_ADJUDICATION_ROOT}/packets/debate-${debateNumber}.json`),
    readJson(`${V3811_ADJUDICATION_ROOT}/outputs/debate-${debateNumber}.json`),
  ]);
  validateV3811PerformanceOutput(passA, packet, "A");
  validateV3811PerformanceOutput(passB, packet, "B");
  validateV3811AdjudicationOutput(adjudicationOutput, adjudicationPacket);
  same(finalDebate.sections, packet.sections, `${debateNumber}: sections`);
  same(finalDebate.routes, packet.routes, `${debateNumber}: routes`);
  const debateDisagreements = disagreements.debates.find((item) => item.debateNumber === debateNumber);
  const disputeMap = new Map(debateDisagreements.moveDisputes.map((item) => [item.moveId, item]));
  const decisionMap = new Map(adjudicationOutput.moveDecisions.map((item) => [item.moveId, item]));

  assertV3811(finalDebate.moves.length === packet.moves.length, `${debateNumber}: final move count mismatch`);
  for (let index = 0; index < packet.moves.length; index += 1) {
    const locked = packet.moves[index];
    const finalMove = finalDebate.moves[index];
    const judgmentA = passA.moveJudgments[index];
    const judgmentB = passB.moveJudgments[index];
    const dispute = disputeMap.get(locked.moveId) ?? null;
    const decision = decisionMap.get(locked.moveId) ?? null;
    assertV3811(Boolean(dispute) === Boolean(decision), `${debateNumber}:${locked.moveId}: dispute/decision mismatch`);
    if (decision) counts.disputedMoves += 1;
    for (const key of ["moveId", "sectionId", "sectionTitle", "sectionWeight", "side", "speaker", "importance", "selectionRole", "moveKind", "proposition"]) same(finalMove[key], locked[key], `${debateNumber}:${locked.moveId}:${key}`);
    same(finalMove.sourceSpan, locked.sourceSpan, `${debateNumber}:${locked.moveId}: source span`);
    same(finalMove.lockedBurdenContact, locked.lockedBurdenContact, `${debateNumber}:${locked.moveId}: burden contact`);
    same(finalMove.confidenceEvidence, { passA: judgmentA.assessmentConfidence, passB: judgmentB.assessmentConfidence, audioVerified: audioMoveIds.has(locked.moveId) }, `${debateNumber}:${locked.moveId}: confidence evidence`);

    const tupleA = performanceResponseTuple(judgmentA.response);
    const tupleB = performanceResponseTuple(judgmentB.response);
    if (finalMove.resolution.response.method === "adjudicated-candidate") {
      assertV3811(dispute?.disputedFields.responseTuple && decision.responseTupleChoice === finalMove.resolution.response.choice, `${debateNumber}:${locked.moveId}: invalid response adjudication provenance`);
      same(finalMove.response, decision.responseTupleChoice === 1 ? tupleA : tupleB, `${debateNumber}:${locked.moveId}: adjudicated response`);
      counts.responseTupleAdjudications += 1;
    } else {
      assertV3811(finalMove.resolution.response.method === "initial-agreement" && !dispute?.disputedFields.responseTuple, `${debateNumber}:${locked.moveId}: invalid response agreement provenance`);
      same(tupleA, tupleB, `${debateNumber}:${locked.moveId}: initial response agreement`);
      same(finalMove.response, tupleA, `${debateNumber}:${locked.moveId}: agreed response`);
      counts.responseTupleAgreements += 1;
    }

    const ratingChoiceMap = new Map((decision?.ratingChoices ?? []).map((item) => [item.ratingKey, item.choice]));
    if (finalMove.resolution.charityPair) {
      const choice = finalMove.resolution.charityPair.choice;
      assertV3811(dispute?.disputedFields.charityTested && decision.charityPairChoice === choice, `${debateNumber}:${locked.moveId}: invalid charity pair provenance`);
      const selected = choice === 1 ? judgmentA : judgmentB;
      assertV3811(finalMove.charityTested === selected.charityTested && finalMove.ratings.representationalCharity === selected.ratings.representationalCharity.value, `${debateNumber}:${locked.moveId}: charity pair value mismatch`);
      counts.charityPairAdjudications += 1;
    } else {
      assertV3811(judgmentA.charityTested === judgmentB.charityTested && finalMove.charityTested === judgmentA.charityTested, `${debateNumber}:${locked.moveId}: undisputed charity mismatch`);
    }

    for (const key of V3811_RATING_KEYS) {
      const valueA = judgmentA.ratings[key].value;
      const valueB = judgmentB.ratings[key].value;
      const resolution = finalMove.resolution.ratings[key];
      assertV3811(Number.isInteger(finalMove.ratings[key]) && finalMove.ratings[key] >= 0 && finalMove.ratings[key] <= 100, `${debateNumber}:${locked.moveId}:${key}: invalid final value`);
      if (resolution.method === "adjudicated-charity-pair") {
        assertV3811(key === "representationalCharity" && finalMove.resolution.charityPair && resolution.choice === finalMove.resolution.charityPair.choice, `${debateNumber}:${locked.moveId}:${key}: invalid charity rating resolution`);
        counts.ratingAdjudications += 1;
      } else if (resolution.method === "adjudicated-candidate") {
        assertV3811(ratingChoiceMap.get(key) === resolution.choice, `${debateNumber}:${locked.moveId}:${key}: missing adjudication choice`);
        assertV3811(finalMove.ratings[key] === (resolution.choice === 1 ? valueA : valueB), `${debateNumber}:${locked.moveId}:${key}: adjudicated value mismatch`);
        counts.ratingAdjudications += 1;
      } else if (resolution.method === "initial-agreement") {
        assertV3811(valueA === valueB && finalMove.ratings[key] === valueA && !ratingChoiceMap.has(key), `${debateNumber}:${locked.moveId}:${key}: false agreement`);
        counts.equalRatingAgreements += 1;
      } else {
        assertV3811(resolution.method === "rounded-mean-of-nondisputed-values" && valueA !== valueB && !ratingChoiceMap.has(key), `${debateNumber}:${locked.moveId}:${key}: invalid mean provenance`);
        assertV3811(finalMove.ratings[key] === Math.round((valueA + valueB) / 2), `${debateNumber}:${locked.moveId}:${key}: rounded mean mismatch`);
        const exposed = new Set(dispute?.triggers.exposedRatingKeys ?? []);
        assertV3811(!exposed.has(key) || (key === "representationalCharity" && dispute?.disputedFields.charityTested), `${debateNumber}:${locked.moveId}:${key}: disputed value improperly averaged`);
        counts.nondisputedUnequalRatingMeans += 1;
      }
      ratingFieldsChecked += 1;
    }

    const responseRange = V3811_RESPONSE_RANGES[finalMove.response.class];
    assertV3811(finalMove.ratings.responsiveness >= responseRange[0] && finalMove.ratings.responsiveness <= responseRange[1], `${debateNumber}:${locked.moveId}: final response band violation`);
    const burdenRange = V3811_BURDEN_RANGES[locked.lockedBurdenContact?.tier ?? "none"];
    assertV3811(finalMove.ratings.relevanceBurden >= burdenRange[0] && finalMove.ratings.relevanceBurden <= burdenRange[1], `${debateNumber}:${locked.moveId}: final burden band violation`);
    if (!finalMove.charityTested) assertV3811(finalMove.ratings.representationalCharity === 75, `${debateNumber}:${locked.moveId}: final untested charity violation`);
    movesChecked += 1;
  }

  for (const side of ["pro", "con"]) {
    const extracted = debateDisagreements.burdenAdjustmentDisputes.find((item) => item.side === side);
    const decision = adjudicationOutput.burdenAdjustmentDecisions.find((item) => item.side === side);
    if (extracted) {
      assertV3811(decision && finalDebate.burdenAdjustmentResolution[side].method === "adjudicated-complete-record" && finalDebate.burdenAdjustmentResolution[side].choice === decision.choice, `${debateNumber}:${side}: burden adjustment resolution missing`);
      same(finalDebate.burdenCompletionAdjustment[side], decision.choice === 1 ? extracted.candidate1FullRecord : extracted.candidate2FullRecord, `${debateNumber}:${side}: burden adjustment choice`);
      counts.burdenAdjustmentAdjudications += 1;
    } else {
      assertV3811(!decision && finalDebate.burdenAdjustmentResolution[side].method === "initial-semantic-agreement-candidate1-record", `${debateNumber}:${side}: unexpected burden adjustment adjudication`);
      same(finalDebate.burdenCompletionAdjustment[side], passA.burdenCompletionAdjustment[side], `${debateNumber}:${side}: agreed burden adjustment`);
      same(adjustmentSemanticTuple(passA.burdenCompletionAdjustment[side]), adjustmentSemanticTuple(passB.burdenCompletionAdjustment[side]), `${debateNumber}:${side}: initial burden adjustment semantic agreement`);
    }
  }
}

assertV3811(movesChecked === 81 && ratingFieldsChecked === 567, "ledger validator coverage incomplete");
same(ledger.summary, { debates: 3, uniqueMoves: 81, finalRatingFields: 567, ...counts }, "ledger summary");
assertV3811(counts.disputedMoves === disagreements.summary.disputedMoves && counts.responseTupleAdjudications === disagreements.summary.responseTupleDisputes && counts.responseTupleAgreements === 81 - disagreements.summary.responseTupleDisputes && counts.charityPairAdjudications === disagreements.summary.charityTestedDisputes && counts.ratingAdjudications === adjudicationPreparation.ratingChoices + adjudicationPreparation.charityPairChoices && counts.nondisputedUnequalRatingMeans === disagreements.summary.nondisputedUnequalScalarFields - adjudicationPreparation.dependencyClosure.charityRatingsAddedToCloseFlagValueInvariant && counts.equalRatingAgreements === 567 - counts.ratingAdjudications - counts.nondisputedUnequalRatingMeans && counts.burdenAdjustmentAdjudications === disagreements.summary.burdenAdjustmentDisputes, "ledger resolution totals invalid");
const validation = { schemaVersion: "3.8.11-performance-final-ledger-validation", protocolId: "v3.8.11-performance-judgment-consensus", status: "passed", finalLedgerValidated: true, ledgerPath, ledgerSha256: createHash("sha256").update(await readFile(path.resolve(root, ledgerPath))).digest("hex"), debates: 3, movesChecked, ratingFieldsChecked, ...counts, thirdValuesInvented: 0, authorization: { scoreDerivation: true, assessmentProse: false, productionMutation: false } };
await writeFile(path.resolve(root, validationPath), `${JSON.stringify(validation, null, 2)}\n`);
console.log(JSON.stringify({ ...validation, scoreDerivationAuthorized: true, assessmentProseAuthorized: false }, null, 2));
