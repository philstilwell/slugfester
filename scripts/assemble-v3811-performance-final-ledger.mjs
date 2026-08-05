#!/usr/bin/env node

import { access, readFile, writeFile } from "node:fs/promises";
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
const readJson = async (relativePath) => JSON.parse(await readFile(path.resolve(root, relativePath), "utf8"));
const exists = async (relativePath) => { try { await access(path.resolve(root, relativePath)); return true; } catch { return false; } };
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
assertV3811(!(await exists(ledgerPath)), `${ledgerPath} already exists`);

const [disagreements, audioAudit, adjudicationExecution, adjudicationPreparation] = await Promise.all([
  readJson(`${V3811_PERFORMANCE_ROOT}/initial-disagreements.json`),
  readJson("docs/calibration/v3.8.8/performance-judgment-consensus/audio-verification.json"),
  readJson(`${V3811_ADJUDICATION_ROOT}/model-execution.json`),
  readJson(`${V3811_ADJUDICATION_ROOT}/preparation-audit.json`),
]);
assertV3811(adjudicationExecution.validContexts === adjudicationPreparation.contexts && adjudicationExecution.disputedMovesDecided === disagreements.summary.disputedMoves && adjudicationExecution.retries === 0 && adjudicationExecution.results.every((item) => item.gateAcceptancePassed), "adjudication execution does not authorize ledger assembly");
const audioMoveIds = new Set(audioAudit.debateAudits.flatMap((debate) => debate.moves.map((move) => move.moveId)));

const debates = [];
const resolutionCounts = { disputedMoves: 0, responseTupleAdjudications: 0, responseTupleAgreements: 0, charityPairAdjudications: 0, ratingAdjudications: 0, nondisputedUnequalRatingMeans: 0, equalRatingAgreements: 0, burdenAdjustmentAdjudications: 0 };

for (const debateNumber of V3811_PERFORMANCE_DEBATES) {
  const packetPath = `${V3811_PERFORMANCE_ROOT}/packets/debate-${debateNumber}.json`;
  const passAPath = `${initialOutputsRoot}/debate-${debateNumber}-pass-a.json`;
  const passBPath = `${initialOutputsRoot}/debate-${debateNumber}-pass-b.json`;
  const adjudicationPacketPath = `${V3811_ADJUDICATION_ROOT}/packets/debate-${debateNumber}.json`;
  const adjudicationOutputPath = `${V3811_ADJUDICATION_ROOT}/outputs/debate-${debateNumber}.json`;
  const [packet, passA, passB, adjudicationPacket, adjudicationOutput] = await Promise.all([readJson(packetPath), readJson(passAPath), readJson(passBPath), readJson(adjudicationPacketPath), readJson(adjudicationOutputPath)]);
  validateV3811PerformanceOutput(passA, packet, "A");
  validateV3811PerformanceOutput(passB, packet, "B");
  validateV3811AdjudicationOutput(adjudicationOutput, adjudicationPacket);
  const debateDisagreements = disagreements.debates.find((item) => item.debateNumber === debateNumber);
  const disputeMap = new Map(debateDisagreements.moveDisputes.map((item) => [item.moveId, item]));
  const decisionMap = new Map(adjudicationOutput.moveDecisions.map((item) => [item.moveId, item]));
  const moves = [];

  for (let index = 0; index < packet.moves.length; index += 1) {
    const locked = packet.moves[index];
    const judgmentA = passA.moveJudgments[index];
    const judgmentB = passB.moveJudgments[index];
    const dispute = disputeMap.get(locked.moveId) ?? null;
    const decision = decisionMap.get(locked.moveId) ?? null;
    assertV3811(Boolean(dispute) === Boolean(decision), `${debateNumber}:${locked.moveId}: dispute/decision presence mismatch`);
    if (decision) resolutionCounts.disputedMoves += 1;

    const tupleA = performanceResponseTuple(judgmentA.response);
    const tupleB = performanceResponseTuple(judgmentB.response);
    let response;
    let responseResolution;
    if (dispute?.disputedFields.responseTuple) {
      const chosen = decision.responseTupleChoice === 1 ? tupleA : tupleB;
      response = chosen;
      responseResolution = { method: "adjudicated-candidate", choice: decision.responseTupleChoice, candidate1: tupleA, candidate2: tupleB };
      resolutionCounts.responseTupleAdjudications += 1;
    } else {
      assertV3811(canonicalJson(tupleA) === canonicalJson(tupleB), `${debateNumber}:${locked.moveId}: undisputed response tuple differs`);
      response = tupleA;
      responseResolution = { method: "initial-agreement", choice: null, candidate1: tupleA, candidate2: tupleB };
      resolutionCounts.responseTupleAgreements += 1;
    }

    let charityTested;
    let charityPairResolution = null;
    const ratingResolutions = {};
    const ratings = {};
    const ratingChoiceMap = new Map((decision?.ratingChoices ?? []).map((item) => [item.ratingKey, item.choice]));
    if (dispute?.disputedFields.charityTested) {
      const choice = decision.charityPairChoice;
      const selected = choice === 1 ? judgmentA : judgmentB;
      charityTested = selected.charityTested;
      ratings.representationalCharity = selected.ratings.representationalCharity.value;
      charityPairResolution = {
        method: "adjudicated-compound-candidate",
        choice,
        candidate1: { charityTested: judgmentA.charityTested, representationalCharity: judgmentA.ratings.representationalCharity.value },
        candidate2: { charityTested: judgmentB.charityTested, representationalCharity: judgmentB.ratings.representationalCharity.value },
      };
      ratingResolutions.representationalCharity = { method: "adjudicated-charity-pair", choice, candidate1: judgmentA.ratings.representationalCharity.value, candidate2: judgmentB.ratings.representationalCharity.value };
      resolutionCounts.charityPairAdjudications += 1;
      resolutionCounts.ratingAdjudications += 1;
    } else {
      assertV3811(judgmentA.charityTested === judgmentB.charityTested, `${debateNumber}:${locked.moveId}: undisputed charity flag differs`);
      charityTested = judgmentA.charityTested;
    }

    for (const key of V3811_RATING_KEYS) {
      if (key === "representationalCharity" && charityPairResolution) continue;
      const valueA = judgmentA.ratings[key].value;
      const valueB = judgmentB.ratings[key].value;
      if (ratingChoiceMap.has(key)) {
        const choice = ratingChoiceMap.get(key);
        ratings[key] = choice === 1 ? valueA : valueB;
        ratingResolutions[key] = { method: "adjudicated-candidate", choice, candidate1: valueA, candidate2: valueB };
        resolutionCounts.ratingAdjudications += 1;
      } else if (valueA === valueB) {
        ratings[key] = valueA;
        ratingResolutions[key] = { method: "initial-agreement", choice: null, candidate1: valueA, candidate2: valueB };
        resolutionCounts.equalRatingAgreements += 1;
      } else {
        const exposed = new Set(dispute?.triggers.exposedRatingKeys ?? []);
        assertV3811(!exposed.has(key), `${debateNumber}:${locked.moveId}:${key}: disputed rating omitted from adjudication`);
        ratings[key] = Math.round((valueA + valueB) / 2);
        ratingResolutions[key] = { method: "rounded-mean-of-nondisputed-values", choice: null, candidate1: valueA, candidate2: valueB };
        resolutionCounts.nondisputedUnequalRatingMeans += 1;
      }
    }

    assertV3811(Object.keys(ratings).length === V3811_RATING_KEYS.length && Object.keys(ratingResolutions).length === V3811_RATING_KEYS.length, `${debateNumber}:${locked.moveId}: rating ledger incomplete`);
    const responseBand = V3811_RESPONSE_RANGES[response.class];
    assertV3811(ratings.responsiveness >= responseBand[0] && ratings.responsiveness <= responseBand[1], `${debateNumber}:${locked.moveId}: final responsiveness outside selected response band`);
    const burdenBand = V3811_BURDEN_RANGES[locked.lockedBurdenContact?.tier ?? "none"];
    assertV3811(ratings.relevanceBurden >= burdenBand[0] && ratings.relevanceBurden <= burdenBand[1], `${debateNumber}:${locked.moveId}: final relevance outside locked burden band`);
    if (!charityTested) assertV3811(ratings.representationalCharity === 75, `${debateNumber}:${locked.moveId}: untested final charity must equal 75`);

    moves.push({
      moveId: locked.moveId,
      moveIndex: index,
      sectionId: locked.sectionId,
      sectionTitle: locked.sectionTitle,
      sectionWeight: locked.sectionWeight,
      side: locked.side,
      speaker: locked.speaker,
      importance: locked.importance,
      selectionRole: locked.selectionRole,
      moveKind: locked.moveKind,
      proposition: locked.proposition,
      sourceSpan: locked.sourceSpan,
      lockedBurdenContact: locked.lockedBurdenContact,
      response,
      charityTested,
      ratings,
      confidenceEvidence: { passA: judgmentA.assessmentConfidence, passB: judgmentB.assessmentConfidence, audioVerified: audioMoveIds.has(locked.moveId) },
      resolution: { response: responseResolution, charityPair: charityPairResolution, ratings: ratingResolutions, adjudicationRationale: decision?.rationale ?? null },
    });
  }

  const adjustmentDecisionMap = new Map(adjudicationOutput.burdenAdjustmentDecisions.map((item) => [item.side, item]));
  const burdenCompletionAdjustment = {};
  const burdenAdjustmentResolution = {};
  for (const side of ["pro", "con"]) {
    const extracted = debateDisagreements.burdenAdjustmentDisputes.find((item) => item.side === side);
    if (extracted) {
      const choice = adjustmentDecisionMap.get(side).choice;
      burdenCompletionAdjustment[side] = choice === 1 ? extracted.candidate1FullRecord : extracted.candidate2FullRecord;
      burdenAdjustmentResolution[side] = { method: "adjudicated-complete-record", choice, candidate1: extracted.candidate1SemanticTuple, candidate2: extracted.candidate2SemanticTuple, adjudicationRationale: adjustmentDecisionMap.get(side).rationale };
      resolutionCounts.burdenAdjustmentAdjudications += 1;
    } else {
      assertV3811(canonicalJson(adjustmentSemanticTuple(passA.burdenCompletionAdjustment[side])) === canonicalJson(adjustmentSemanticTuple(passB.burdenCompletionAdjustment[side])), `${debateNumber}:${side}: undisputed adjustment semantics differ`);
      burdenCompletionAdjustment[side] = passA.burdenCompletionAdjustment[side];
      burdenAdjustmentResolution[side] = { method: "initial-semantic-agreement-candidate1-record", choice: null };
    }
  }

  debates.push({
    debateNumber,
    debateId: packet.debateId,
    motion: packet.motion,
    sides: packet.sides,
    sections: packet.sections,
    routes: packet.routes,
    moves,
    burdenCompletionAdjustment,
    burdenAdjustmentResolution,
  });
}

assertV3811(debates.length === 3 && debates.reduce((sum, debate) => sum + debate.moves.length, 0) === 81, "final ledger population invalid");
assertV3811(resolutionCounts.disputedMoves === disagreements.summary.disputedMoves && resolutionCounts.responseTupleAdjudications === disagreements.summary.responseTupleDisputes && resolutionCounts.responseTupleAgreements === 81 - disagreements.summary.responseTupleDisputes && resolutionCounts.charityPairAdjudications === disagreements.summary.charityTestedDisputes && resolutionCounts.ratingAdjudications === adjudicationPreparation.ratingChoices + adjudicationPreparation.charityPairChoices && resolutionCounts.nondisputedUnequalRatingMeans === disagreements.summary.nondisputedUnequalScalarFields - adjudicationPreparation.dependencyClosure.charityRatingsAddedToCloseFlagValueInvariant && resolutionCounts.equalRatingAgreements === 567 - resolutionCounts.ratingAdjudications - resolutionCounts.nondisputedUnequalRatingMeans && resolutionCounts.burdenAdjustmentAdjudications === disagreements.summary.burdenAdjustmentDisputes, `final ledger resolution counts invalid: ${canonicalJson(resolutionCounts)}`);

const ledger = {
  schemaVersion: "3.8.11-performance-final-consensus-ledger",
  protocolId: "v3.8.11-performance-judgment-consensus",
  status: "assembled-pending-independent-ledger-validation",
  evidenceBoundary: {
    originalCleanTwoPassGatePassed: true,
    postHocRepresentationRecoveryUsed: false,
    initialPerformanceAttempts: 6,
    initialPerformanceRetries: 0,
    independentPassJudgments: 162,
    isolatedAdjudicationContexts: 3,
    adjudicationRetries: 0,
    mediumConfidenceMovesAudioVerified: 17,
  },
  resolutionPolicy: {
    disputedSemanticFields: "selected candidate chosen by isolated adjudicator",
    charityFlagAndValue: "compound candidate",
    nondisputedUnequalScalars: "rounded arithmetic mean",
    equalScalars: "preserved exact agreement",
    thirdValuesInvented: 0,
  },
  summary: { debates: 3, uniqueMoves: 81, finalRatingFields: 567, ...resolutionCounts },
  authorization: {
    independentLedgerValidation: true,
    scoreDerivation: false,
    numericalParticipantScoring: false,
    assessmentProse: false,
    productionMutation: false,
    tenDebateGate: false,
    all195Debates: false,
  },
  debates,
};
await writeFile(path.resolve(root, ledgerPath), `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({ status: ledger.status, ...ledger.summary, independentLedgerValidationAuthorized: true, scoreDerivationAuthorized: false }, null, 2));
