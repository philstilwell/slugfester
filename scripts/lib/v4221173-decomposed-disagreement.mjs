import { assertV4, canonicalJson } from "./v4-lean-production.mjs";
import { extractV4221MoveDisagreement, v4221AdjustmentSemanticTuple } from "./v4221-pass-b-consensus.mjs";

export const V4221173_ROOT = "docs/calibration/v4.2.21.17.3/deterministic-disagreement-audio-prep";
export const V4221173_PROTOCOL_ID = "v4.2.21.17.3-decomposed-consensus";
export const V4221173_SCALAR_DISPUTE_THRESHOLD = 5;

const FIXED_MOVE_KEYS = Object.freeze([
  "moveId",
  "sectionId",
  "side",
  "speaker",
  "moveKind",
  "proposition",
  "sourceSpan",
  "attributionConfidence",
  "attributionBasis"
]);

const clone = (value) => structuredClone(value);
const pick = (object, keys) => Object.fromEntries(keys.map((key) => [key, clone(object[key])]));
const orderedMoves = (moves) => [...moves].sort((left, right) => left.sourceSpan.startEvent - right.sourceSpan.startEvent || left.sourceSpan.endEvent - right.sourceSpan.endEvent || left.moveId.localeCompare(right.moveId));

function lockedMoveTuple(move) {
  return pick(move, FIXED_MOVE_KEYS);
}

function rawLockedMoveTuple(move) {
  return pick(move, FIXED_MOVE_KEYS);
}

export function validateV4221173Pair(primaryA, primaryB, lockedInventory) {
  assertV4(primaryA.debateNumber === primaryB.debateNumber && primaryA.debateId === primaryB.debateId, "independent judgment debate identities differ");
  assertV4(primaryA.debateNumber === lockedInventory.debateNumber && primaryA.debateId === lockedInventory.debateId, "locked inventory debate identity differs from judgments");
  assertV4(canonicalJson(primaryA.routes) === canonicalJson(primaryB.routes) && canonicalJson(primaryA.routes) === canonicalJson(lockedInventory.routes), "locked routes differ");
  assertV4(canonicalJson(primaryA.sections) === canonicalJson(primaryB.sections) && canonicalJson(primaryA.sections) === canonicalJson(lockedInventory.sections), "locked sections differ");

  const movesA = orderedMoves(primaryA.moves);
  const movesB = orderedMoves(primaryB.moves);
  const lockedMoves = orderedMoves(lockedInventory.moves);
  const ids = (moves) => moves.map((move) => move.moveId);
  assertV4(canonicalJson(ids(movesA)) === canonicalJson(ids(movesB)) && canonicalJson(ids(movesA)) === canonicalJson(ids(lockedMoves)), "locked move population or chronology differs");
  for (let index = 0; index < movesA.length; index += 1) {
    const expected = lockedMoveTuple(lockedMoves[index]);
    assertV4(canonicalJson(rawLockedMoveTuple(movesA[index])) === canonicalJson(expected), `${movesA[index].moveId}: Pass A changed locked inventory content`);
    assertV4(canonicalJson(rawLockedMoveTuple(movesB[index])) === canonicalJson(expected), `${movesB[index].moveId}: Pass B changed locked inventory content`);
  }
  return { status: "passed", debateNumber: primaryA.debateNumber, moves: movesA.length, fixedMoveKeys: [...FIXED_MOVE_KEYS], importanceRepositoryLocked: false };
}

export function extractV4221173Disagreements(primaryA, primaryB, lockedInventory) {
  const validation = validateV4221173Pair(primaryA, primaryB, lockedInventory);
  const movesA = orderedMoves(primaryA.moves);
  const movesB = orderedMoves(primaryB.moves);
  const comparedMoves = movesA.map((moveA, index) => {
    const moveB = movesB[index];
    const base = extractV4221MoveDisagreement(moveA, moveB);
    const importanceMismatch = moveA.importance !== moveB.importance;
    return {
      ...base,
      triggers: {
        ...base.triggers,
        importanceMismatch,
        mediumConfidenceAudioRequired: moveA.assessmentConfidence !== "high" || moveB.assessmentConfidence !== "high",
        attributionAudioRequired: moveA.attributionConfidence !== "high" || moveB.attributionConfidence !== "high"
      },
      candidates: {
        importancePair: importanceMismatch ? { candidate1: { importance: moveA.importance }, candidate2: { importance: moveB.importance } } : null,
        ...base.candidates
      },
      disputed: base.disputed || importanceMismatch
    };
  });
  const burdenAdjustmentDisputes = ["pro", "con"]
    .filter((side) => canonicalJson(v4221AdjustmentSemanticTuple(primaryA.burdenCompletionAdjustment[side])) !== canonicalJson(v4221AdjustmentSemanticTuple(primaryB.burdenCompletionAdjustment[side])))
    .map((side) => ({
      side,
      candidate1: v4221AdjustmentSemanticTuple(primaryA.burdenCompletionAdjustment[side]),
      candidate2: v4221AdjustmentSemanticTuple(primaryB.burdenCompletionAdjustment[side])
    }));
  return {
    schemaVersion: "4.2.21.17.3-deterministic-disagreements",
    protocolId: V4221173_PROTOCOL_ID,
    debateNumber: primaryA.debateNumber,
    debateId: primaryA.debateId,
    moveDisputes: comparedMoves.filter((move) => move.disputed),
    nondisputedScalarMerges: comparedMoves.flatMap((move) => move.nondisputedScalarMerges.map((merge) => ({ moveId: move.moveId, ...merge }))),
    burdenAdjustmentDisputes,
    audioVerificationMoveIds: comparedMoves.filter((move) => move.triggers.mediumConfidenceAudioRequired || move.triggers.attributionAudioRequired).map((move) => move.moveId),
    audit: {
      pairValidation: validation,
      uniqueMovesCompared: comparedMoves.length,
      importanceComparedAsJudgmentField: true,
      mediumConfidenceFromEitherPassTriggersAudio: true,
      aggregateOrDiagnosticScoresComputed: 0,
      weightedScoresComputed: 0,
      scoreBasedDisputeTriggers: 0,
      rationaleWordingAloneCreatesDispute: false
    },
    scoreDerivationAuthorized: false
  };
}

export function buildV4221173AudioWorkItems(primaryA, primaryB, lockedInventory, events, sourcePacket) {
  const byA = new Map(primaryA.moves.map((move) => [move.moveId, move]));
  const byB = new Map(primaryB.moves.map((move) => [move.moveId, move]));
  return orderedMoves(lockedInventory.moves).filter((locked) => {
    const moveA = byA.get(locked.moveId);
    const moveB = byB.get(locked.moveId);
    return moveA.assessmentConfidence !== "high" || moveB.assessmentConfidence !== "high" || moveA.attributionConfidence !== "high" || moveB.attributionConfidence !== "high";
  }).map((locked) => {
    const moveA = byA.get(locked.moveId);
    const moveB = byB.get(locked.moveId);
    const start = events[locked.sourceSpan.startEvent];
    const end = events[locked.sourceSpan.endEvent];
    assertV4(start && end, `${locked.moveId}: audio source span is outside transcript events`);
    return {
      debateNumber: primaryA.debateNumber,
      debateId: primaryA.debateId,
      sourceVideoId: sourcePacket.sourceChain.localManifestPath.split("/").at(-2),
      moveId: locked.moveId,
      expectedSpeaker: locked.speaker,
      sourceSpan: clone(locked.sourceSpan),
      proposition: locked.proposition,
      verificationExcerpt: locked.finalSelectedEvidence.excerpt,
      clipWindow: {
        startMs: Math.max(0, start.startMs - 2500),
        endMs: end.startMs + end.durationMs + 2500,
        paddingMs: 2500
      },
      trigger: {
        passAAssessmentConfidence: moveA.assessmentConfidence,
        passBAssessmentConfidence: moveB.assessmentConfidence,
        passAAttributionConfidence: moveA.attributionConfidence,
        passBAttributionConfidence: moveB.attributionConfidence,
        eitherPassAssessmentBelowHigh: moveA.assessmentConfidence !== "high" || moveB.assessmentConfidence !== "high",
        eitherPassAttributionBelowHigh: moveA.attributionConfidence !== "high" || moveB.attributionConfidence !== "high"
      },
      sourceChain: clone(sourcePacket.sourceChain),
      evidenceOwnership: "repository-rendered-from-locked-source-span",
      audioVerificationRequiredBeforeAdjudication: true
    };
  });
}

export { FIXED_MOVE_KEYS as V4221173_FIXED_MOVE_KEYS };
