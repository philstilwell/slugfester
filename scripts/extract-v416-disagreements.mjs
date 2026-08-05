#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V4_MODEL_RATING_KEYS } from "./lib/v4-lean-production.mjs";
import { V41_LEAN_DEBATES, V41_LEAN_ROOT, assertV4, canonicalJson, readJson, validateV41PrimaryOutput } from "./lib/v41-lean-production.mjs";
import { extractV416MoveDisagreement, flattenV416PrimaryMoves, scoringFieldCandidate, V416_DIAGNOSTIC_MOVE_DELTA_THRESHOLD, V416_SCALAR_DISPUTE_THRESHOLD, v416AdjustmentSemanticTuple, v416ResponseTuple } from "./lib/v416-disagreement.mjs";
import { V416_PASS_B_ROOT, validateV416PassBOutput } from "./lib/v416-triggered-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const outputPath = `${V416_PASS_B_ROOT}/disagreements.json`;
const exists = async (file) => access(path.resolve(root, file)).then(() => true, () => false);
assertV4(!shouldWrite || !(await exists(outputPath)), `${outputPath} already exists`);
const [postAudio, primaryExecution, passBExecution, passBPreparation] = await Promise.all([
  readJson(`${V416_PASS_B_ROOT}/post-audio-analysis.json`),
  readJson(`${V41_LEAN_ROOT}/primary-model-execution.json`),
  readJson(`${V416_PASS_B_ROOT}/model-execution.json`),
  readJson(`${V416_PASS_B_ROOT}/preparation-manifest.json`)
]);
assertV4(postAudio.status === "pass-b-and-audio-passed-ready-for-disagreement-extraction" && postAudio.authorization.disagreementExtraction, "post-audio state does not authorize disagreement extraction");
assertV4(primaryExecution.validContexts === 3 && primaryExecution.retries === 0, "valid primary execution unavailable");
assertV4(passBExecution.validContexts === 3 && passBExecution.retries === 0, "valid Pass B execution unavailable");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (file) => readFile(path.resolve(root, file));
const contextByDebate = new Map(passBPreparation.contexts.map((context) => [context.debateNumber, context]));

let uniqueMoves = 0;
let disputedMoves = 0;
let responseTupleDisputes = 0;
let charityStateDisputes = 0;
let scoringFieldDisputes = 0;
let diagnosticTriggerMoves = 0;
let burdenAdjustmentDisputes = 0;
let nondisputedUnequalRawScalars = 0;
const debates = [];
for (const debateNumber of V41_LEAN_DEBATES) {
  const context = contextByDebate.get(debateNumber);
  assertV4(context, `${debateNumber}: Pass B preparation context missing`);
  const primaryPath = context.primaryOutput;
  const passBPath = context.output;
  const [sourcePacket, passBPacket, primary, passB] = await Promise.all([readJson(context.sourcePacket), readJson(context.packet), readJson(primaryPath), readJson(passBPath)]);
  validateV41PrimaryOutput(primary, sourcePacket);
  validateV416PassBOutput(passB, passBPacket, sourcePacket);
  const primaryById = new Map(flattenV416PrimaryMoves(primary).map((move) => [move.moveId, move]));
  const passBById = new Map(passB.moveJudgments.map((move) => [move.moveId, move]));
  assertV4(primaryById.size === passBPacket.lockedMoveOrder.length && passBById.size === passBPacket.lockedMoveOrder.length, `${debateNumber}: move populations differ`);
  const moveDisputes = [];
  const nondisputedScalarMerges = [];
  for (const [moveIndex, moveId] of passBPacket.lockedMoveOrder.entries()) {
    const moveA = primaryById.get(moveId);
    const moveB = passBById.get(moveId);
    assertV4(moveA && moveB, `${debateNumber}:${moveId}: judgment missing`);
    const disagreement = extractV416MoveDisagreement(moveA, moveB);
    const exposed = new Set(disagreement.exposedScoringFieldKeys);
    for (const key of V4_MODEL_RATING_KEYS) {
      if (disagreement.fieldsA[key] === disagreement.fieldsB[key] || exposed.has(key)) continue;
      nondisputedScalarMerges.push({ moveId, ratingKey: key, candidate1: disagreement.fieldsA[key], candidate2: disagreement.fieldsB[key], roundedMeanAfterAdjudication: Math.round((disagreement.fieldsA[key] + disagreement.fieldsB[key]) / 2) });
    }
    if (!disagreement.disputed) continue;
    const scoringFields = Object.fromEntries(disagreement.exposedScoringFieldKeys.map((key) => [key, {
      candidate1: scoringFieldCandidate(moveA, key),
      candidate2: scoringFieldCandidate(moveB, key),
      absoluteDelta: Math.abs(disagreement.fieldsA[key] - disagreement.fieldsB[key])
    }]));
    moveDisputes.push({
      moveIndex,
      moveId,
      sectionId: moveA.sectionId,
      side: moveA.side,
      speaker: moveA.speaker,
      sourceSpan: moveA.sourceSpan,
      triggers: {
        responseTupleMismatch: disagreement.responseMismatch,
        charityStateMismatch: disagreement.charityStateMismatch,
        materialScoringFieldKeys: disagreement.materialScoringFieldKeys,
        diagnosticScores: { candidate1: disagreement.diagnosticScoreA, candidate2: disagreement.diagnosticScoreB },
        diagnosticMoveDelta: disagreement.diagnosticDelta,
        diagnosticTrigger: disagreement.diagnosticTrigger,
        exposedScoringFieldKeys: disagreement.exposedScoringFieldKeys
      },
      disputedFields: {
        responseTuple: disagreement.responseMismatch ? { candidate1: v416ResponseTuple(moveA.response), candidate2: v416ResponseTuple(moveB.response) } : null,
        charityState: disagreement.charityStateMismatch ? { candidate1: { charity: moveA.charity, representationalCharity: moveA.ratings.representationalCharity.value }, candidate2: { charity: moveB.charity, representationalCharity: moveB.ratings.representationalCharity.value } } : null,
        scoringFields
      }
    });
    responseTupleDisputes += Number(disagreement.responseMismatch);
    charityStateDisputes += Number(disagreement.charityStateMismatch);
    scoringFieldDisputes += disagreement.exposedScoringFieldKeys.length;
    diagnosticTriggerMoves += Number(disagreement.diagnosticTrigger);
  }
  const adjustmentDisputes = [];
  for (const side of ["pro", "con"]) {
    const tupleA = v416AdjustmentSemanticTuple(primary.burdenCompletionAdjustment[side]);
    const tupleB = v416AdjustmentSemanticTuple(passB.burdenCompletionAdjustment[side]);
    if (canonicalJson(tupleA) === canonicalJson(tupleB)) continue;
    adjustmentDisputes.push({ side, candidate1SemanticTuple: tupleA, candidate2SemanticTuple: tupleB, candidate1FullRecord: primary.burdenCompletionAdjustment[side], candidate2FullRecord: passB.burdenCompletionAdjustment[side] });
  }
  uniqueMoves += passBPacket.lockedMoveOrder.length;
  disputedMoves += moveDisputes.length;
  burdenAdjustmentDisputes += adjustmentDisputes.length;
  nondisputedUnequalRawScalars += nondisputedScalarMerges.length;
  debates.push({
    debateNumber,
    debateId: passBPacket.debateId,
    motion: passBPacket.motion,
    sourcePacketPath: context.sourcePacket,
    passBPacketPath: context.packet,
    primaryPath,
    primarySha256: sha256(await bytes(primaryPath)),
    passBPath,
    passBSha256: sha256(await bytes(passBPath)),
    moveCount: passBPacket.lockedMoveOrder.length,
    disputedMoveCount: moveDisputes.length,
    responseTupleDisputeCount: moveDisputes.filter((item) => item.triggers.responseTupleMismatch).length,
    charityStateDisputeCount: moveDisputes.filter((item) => item.triggers.charityStateMismatch).length,
    scoringFieldDisputeCount: moveDisputes.reduce((sum, item) => sum + item.triggers.exposedScoringFieldKeys.length, 0),
    diagnosticTriggerMoveCount: moveDisputes.filter((item) => item.triggers.diagnosticTrigger).length,
    burdenAdjustmentDisputeCount: adjustmentDisputes.length,
    nondisputedUnequalRawScalarCount: nondisputedScalarMerges.length,
    moveDisputes,
    burdenAdjustmentDisputes: adjustmentDisputes,
    nondisputedScalarMerges
  });
}
assertV4(uniqueMoves === 34, "disagreement extraction must cover 34 unique moves");
const output = {
  schemaVersion: "4.1.6-triggered-pass-b-disagreements",
  protocolId: "v4.1.6-triggered-pass-b-consensus",
  status: "passed-deterministic-disagreement-extraction",
  evidenceBoundary: { primaryContexts: 3, passBContexts: 3, primaryAttempts: primaryExecution.attempts, passBAttempts: passBExecution.attempts, totalRetries: primaryExecution.retries + passBExecution.retries, rawOutputsPreserved: true, audioVerificationPassed: true },
  rules: { responseTupleMismatch: "dispute", charityStateTestedMismatch: "dispute", scoringFieldDeltaGreaterThan: V416_SCALAR_DISPUTE_THRESHOLD, repositoryDerivedPrecisionAndCalibrationIncluded: true, diagnosticMoveDeltaGreaterThan: V416_DIAGNOSTIC_MOVE_DELTA_THRESHOLD, diagnosticTriggerExposesAllUnequalScoringFields: true, adjustmentSemanticTupleMismatch: "dispute", rationaleWordingAlone: "not-a-dispute", nondisputedUnequalRawScalarResolution: "rounded mean after adjudication" },
  summary: { debates: debates.length, uniqueMoves, moveJudgmentsCompared: uniqueMoves * 2, disputedMoves, responseTupleDisputes, charityStateDisputes, scoringFieldDisputes, diagnosticTriggerMoves, burdenAdjustmentDisputes, nondisputedUnequalRawScalars },
  authorization: { prepareDisputeOnlyAdjudicationPackets: true, adjudicationModelExecution: false, scoreDerivation: false, publicationFinalization: false, productionMutation: false, heldOutGate: false, all195Debates: false },
  debates
};
if (shouldWrite) await writeFile(path.resolve(root, outputPath), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ status: output.status, ...output.summary, prepareDisputeOnlyAdjudicationPackets: true, adjudicationModelExecutionAuthorized: false, scoreDerivationAuthorized: false }, null, 2));
