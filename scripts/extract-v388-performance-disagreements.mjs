#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
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
const auditPath = `${recoveryRoot}/nonanswer-summary-normalization-audit.json`;
const outputPath = `${V388_PERFORMANCE_ROOT}/initial-disagreements.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const readJson = async (relativePath) => JSON.parse(await bytes(relativePath));
const exists = async (relativePath) => { try { await access(path.resolve(root, relativePath)); return true; } catch { return false; } };
const sorted = (values) => [...values].sort();

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

assertV388(!(await exists(outputPath)), `${outputPath} already exists`);
const recoveryAudit = await readJson(auditPath);
assertV388(recoveryAudit.status === "passed-post-hoc-representation-only-normalization", "representation recovery did not pass");
assertV388(!recoveryAudit.originalCleanGatePassed && recoveryAudit.rawOutputsPreserved && recoveryAudit.contexts === 6 && recoveryAudit.moveJudgments === 162 && recoveryAudit.normalizationCount === 21 && recoveryAudit.substantiveJudgmentFieldsChanged === 0 && recoveryAudit.unchangedPacketAwareValidatorPassedContexts === 6, "representation recovery boundary invalid");
assertV388(recoveryAudit.authorization.deterministicDisagreementExtraction && !recoveryAudit.authorization.adjudicationModelExecution && !recoveryAudit.authorization.scoreDerivation, "disagreement extraction not authorized or later stages prematurely authorized");

const debates = [];
let totalMoves = 0;
let disputedMoves = 0;
let responseTupleDisputes = 0;
let charityTestedDisputes = 0;
let ratingFieldDisputes = 0;
let diagnosticTriggerMoves = 0;
let burdenAdjustmentDisputes = 0;
let nondisputedUnequalScalarFields = 0;

for (const debateNumber of V388_PERFORMANCE_DEBATES) {
  const packetPath = `${V388_PERFORMANCE_ROOT}/packets/debate-${debateNumber}.json`;
  const passAPath = `${recoveryRoot}/normalized/outputs/debate-${debateNumber}-pass-a.json`;
  const passBPath = `${recoveryRoot}/normalized/outputs/debate-${debateNumber}-pass-b.json`;
  const [packet, passA, passB] = await Promise.all([readJson(packetPath), readJson(passAPath), readJson(passBPath)]);
  validateV388PerformanceOutput(passA, packet, "A");
  validateV388PerformanceOutput(passB, packet, "B");
  assertV388(passA.moveJudgments.length === passB.moveJudgments.length, `${debateNumber}: pass move counts differ`);

  const moveDisputes = [];
  const nondisputedScalarMerges = [];
  for (let index = 0; index < passA.moveJudgments.length; index += 1) {
    const judgmentA = passA.moveJudgments[index];
    const judgmentB = passB.moveJudgments[index];
    assertV388(judgmentA.moveId === judgmentB.moveId, `${debateNumber}:${index}: move identity differs`);
    const disagreement = extractV388MoveDisagreement(judgmentA, judgmentB);
    const unequalRatingKeys = V388_RATING_KEYS.filter((key) => judgmentA.ratings[key].value !== judgmentB.ratings[key].value);
    const exposed = new Set(disagreement.exposedRatingKeys);
    const nondisputedKeys = unequalRatingKeys.filter((key) => !exposed.has(key));
    for (const key of nondisputedKeys) {
      nondisputedScalarMerges.push({
        moveId: judgmentA.moveId,
        ratingKey: key,
        candidate1: judgmentA.ratings[key].value,
        candidate2: judgmentB.ratings[key].value,
        roundedMeanAfterAdjudication: Math.round((judgmentA.ratings[key].value + judgmentB.ratings[key].value) / 2),
      });
    }
    if (!disagreement.disputed) continue;

    const ratingCandidates = Object.fromEntries(disagreement.exposedRatingKeys.map((key) => [key, {
      candidate1: judgmentA.ratings[key].value,
      candidate2: judgmentB.ratings[key].value,
      absoluteDelta: Math.abs(judgmentA.ratings[key].value - judgmentB.ratings[key].value),
    }]));
    moveDisputes.push({
      moveIndex: index,
      moveId: judgmentA.moveId,
      sectionId: judgmentA.sectionId,
      side: judgmentA.side,
      speaker: judgmentA.speaker,
      sourceSpan: judgmentA.sourceSpan,
      triggers: {
        responseTupleMismatch: disagreement.responseMismatch,
        charityTestedMismatch: disagreement.charityTestedMismatch,
        materialRatingKeys: disagreement.materialRatingKeys,
        diagnosticMoveDelta: disagreement.diagnosticDelta,
        diagnosticTrigger: disagreement.diagnosticTrigger,
        exposedRatingKeys: disagreement.exposedRatingKeys,
      },
      disputedFields: {
        responseTuple: disagreement.responseMismatch ? {
          candidate1: performanceResponseTuple(judgmentA.response),
          candidate2: performanceResponseTuple(judgmentB.response),
        } : null,
        charityTested: disagreement.charityTestedMismatch ? {
          candidate1: judgmentA.charityTested,
          candidate2: judgmentB.charityTested,
        } : null,
        ratings: ratingCandidates,
      },
    });

    if (disagreement.responseMismatch) responseTupleDisputes += 1;
    if (disagreement.charityTestedMismatch) charityTestedDisputes += 1;
    if (disagreement.diagnosticTrigger) diagnosticTriggerMoves += 1;
    ratingFieldDisputes += disagreement.exposedRatingKeys.length;
  }

  const adjustmentDisputes = [];
  for (const side of ["pro", "con"]) {
    const tupleA = adjustmentSemanticTuple(passA.burdenCompletionAdjustment[side]);
    const tupleB = adjustmentSemanticTuple(passB.burdenCompletionAdjustment[side]);
    if (canonicalJson(tupleA) === canonicalJson(tupleB)) continue;
    adjustmentDisputes.push({
      side,
      candidate1SemanticTuple: tupleA,
      candidate2SemanticTuple: tupleB,
      candidate1FullRecord: passA.burdenCompletionAdjustment[side],
      candidate2FullRecord: passB.burdenCompletionAdjustment[side],
    });
  }

  totalMoves += passA.moveJudgments.length;
  disputedMoves += moveDisputes.length;
  burdenAdjustmentDisputes += adjustmentDisputes.length;
  nondisputedUnequalScalarFields += nondisputedScalarMerges.length;
  debates.push({
    debateNumber,
    debateId: packet.debateId,
    motion: packet.motion,
    packetPath,
    packetSha256: sha256(await bytes(packetPath)),
    passAPath,
    passASha256: sha256(await bytes(passAPath)),
    passBPath,
    passBSha256: sha256(await bytes(passBPath)),
    moveCount: passA.moveJudgments.length,
    disputedMoveCount: moveDisputes.length,
    responseTupleDisputeCount: moveDisputes.filter((item) => item.triggers.responseTupleMismatch).length,
    charityTestedDisputeCount: moveDisputes.filter((item) => item.triggers.charityTestedMismatch).length,
    ratingFieldDisputeCount: moveDisputes.reduce((sum, item) => sum + item.triggers.exposedRatingKeys.length, 0),
    diagnosticTriggerMoveCount: moveDisputes.filter((item) => item.triggers.diagnosticTrigger).length,
    burdenAdjustmentDisputeCount: adjustmentDisputes.length,
    nondisputedUnequalScalarFieldCount: nondisputedScalarMerges.length,
    moveDisputes,
    burdenAdjustmentDisputes: adjustmentDisputes,
    nondisputedScalarMerges,
  });
}

assertV388(totalMoves === 81, "disagreement extraction must cover 81 unique moves");
const output = {
  schemaVersion: "3.8.8-performance-initial-disagreements",
  protocolId: "v3.8.8-performance-judgment-consensus",
  status: "passed-deterministic-disagreement-extraction",
  evidenceBoundary: {
    originalCleanGatePassed: false,
    postHocRepresentationRecoveryUsed: true,
    substantiveJudgmentFieldsChangedByRecovery: 0,
    rawOutputsPreserved: true,
  },
  rules: {
    responseTupleMismatch: "dispute",
    charityTestedMismatch: "dispute",
    materialRatingDeltaGreaterThan: 5,
    diagnosticMoveDeltaGreaterThan: 4,
    diagnosticTriggerExposesAllUnequalRatings: true,
    adjustmentSemanticTupleMismatch: "dispute",
    rationaleWordingAlone: "not-a-dispute",
    nondisputedUnequalScalarResolution: "rounded mean after adjudication",
  },
  summary: {
    debates: debates.length,
    uniqueMoves: totalMoves,
    moveJudgmentsCompared: totalMoves * 2,
    disputedMoves,
    responseTupleDisputes,
    charityTestedDisputes,
    ratingFieldDisputes,
    diagnosticTriggerMoves,
    burdenAdjustmentDisputes,
    nondisputedUnequalScalarFields,
  },
  authorization: {
    prepareDisputeOnlyAdjudicationPackets: true,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    numericalParticipantScoring: false,
    assessmentProse: false,
    productionMutation: false,
    tenDebateGate: false,
    all195Debates: false,
  },
  debates,
};

await writeFile(path.resolve(root, outputPath), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ status: output.status, ...output.summary, prepareDisputeOnlyAdjudicationPackets: true, scoreDerivationAuthorized: false }, null, 2));
