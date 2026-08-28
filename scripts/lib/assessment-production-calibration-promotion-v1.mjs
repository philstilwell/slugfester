import { createHash } from "node:crypto";

import {
  assertV4,
  canonicalJson,
  deriveV4PrimaryScores
} from "./v4-lean-production.mjs";
import { canonicalizeV4220PrimaryOutput } from "./v4220-source-span-rendering.mjs";

export const CALIBRATION_PROMOTION_ROOT =
  "docs/assessment-production/calibration-promotion-v1";
export const CALIBRATION_PROMOTION_PROTOCOL_ID =
  "assessment-production-calibration-promotion-v1";
export const CALIBRATION_PROMOTION_SITE_LEDGER_ADAPTER_VERSION =
  "1.0-assessment-production-calibration-promotion-v1-site-ledger-adapter";
export const CALIBRATION_PROMOTION_SCORE_PROTOCOL_ID =
  "v4.2.21.17.30-hard-route-single-deterministic-score-pass";
export const CALIBRATION_PROMOTION_ORDER = Object.freeze([
  "51",
  "63",
  "90",
  "153",
  "165"
]);

const clone = (value) => structuredClone(value);

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function serializedJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function scoredSnapshot(scores) {
  return {
    sections: clone(scores.sections),
    overall: clone(scores.overall),
    winner: scores.winner,
    winningMargin: scores.winningMargin
  };
}

function candidateMoves(candidate, sectionIndex, side) {
  return (candidate.sections?.[sectionIndex]?.exchanges ?? [])
    .map((exchange) => exchange?.[side])
    .filter(Boolean)
    .map((move) => ({ moveId: move.ledgerMoveId, score: move.score }));
}

export function promoteFrozenCalibrationCandidate(compiled) {
  const promoted = clone(compiled);
  assertV4(
    promoted.calibration?.calibrationOnly === true &&
      promoted.id === `calibration-v42211732-${promoted.number}` &&
      typeof promoted.calibration.sourceDebateId === "string" &&
      promoted.calibration.displayContract?.byline ===
        "Assessments made by 5.6 Sol. — Rubric: Slugfester Reassessment Rubric v2.",
    `${promoted?.number ?? "unknown"}: frozen calibration boundary missing`
  );
  promoted.id = promoted.calibration.sourceDebateId;
  delete promoted.calibration;
  return promoted;
}

export function validateCalibrationPromotionCandidate(candidate, finalScores) {
  assertV4(
    candidate?.id === finalScores.debateId &&
      candidate.number === finalScores.debateNumber &&
      candidate.assessmentModel === "5.6 Sol" &&
      candidate.assessmentRubric === "Slugfester Reassessment Rubric v2" &&
      !("calibration" in candidate),
    `${finalScores.debateNumber}: promoted candidate identity or boundary changed`
  );
  assertV4(
    candidate.score?.pro === finalScores.overall.pro.score &&
      candidate.score?.con === finalScores.overall.con.score &&
      candidate.overall?.pro?.score === finalScores.overall.pro.score &&
      candidate.overall?.con?.score === finalScores.overall.con.score,
    `${finalScores.debateNumber}: promoted overall scores changed`
  );
  assertV4(
    candidate.sections?.length === finalScores.sections.length,
    `${finalScores.debateNumber}: promoted section count changed`
  );
  let moves = 0;
  finalScores.sections.forEach((section, sectionIndex) => {
    const published = candidate.sections[sectionIndex];
    assertV4(
      published?.sectionId === section.sectionId &&
        published.title === section.title &&
        published.score?.pro === section.sides.pro.score &&
        published.score?.con === section.sides.con.score,
      `${finalScores.debateNumber}: section ${sectionIndex} identity or score changed`
    );
    for (const side of ["pro", "con"]) {
      const expectedMoves = section.sides[side].moves.map((move) => ({
        moveId: move.moveId,
        score: move.score
      }));
      assertV4(
        canonicalJson(candidateMoves(candidate, sectionIndex, side)) ===
          canonicalJson(expectedMoves),
        `${finalScores.debateNumber}: section ${sectionIndex} ${side} moves changed`
      );
      moves += expectedMoves.length;
    }
  });
  assertV4(
    (candidate.logicalExtension?.sides?.pro || candidate.logicalExtension?.pro) &&
      (candidate.logicalExtension?.sides?.con || candidate.logicalExtension?.con),
    `${finalScores.debateNumber}: AI Extension missing`
  );
  return { sections: finalScores.sections.length, moves };
}

export function buildCalibrationPromotionSiteLedgerAdapter({
  finalLedgerDebate,
  scoreDebate,
  candidate,
  eventsDocument,
  sourceLocks
}) {
  assertV4(
    finalLedgerDebate?.debateNumber === scoreDebate?.debateNumber &&
      finalLedgerDebate.debateId === scoreDebate.debateId,
    "calibration final-ledger and score identities differ"
  );
  const scoringJudgment = canonicalizeV4220PrimaryOutput(
    finalLedgerDebate.finalJudgment,
    eventsDocument
  );
  const replayed = deriveV4PrimaryScores(scoringJudgment);
  const { scoreProtocolId: _scoreProtocolId, ...storedScores } = scoreDebate.final;
  assertV4(
    canonicalJson(replayed) === canonicalJson(storedScores),
    `${scoreDebate.debateNumber}: frozen score is not an exact repository replay`
  );
  const candidateAudit = validateCalibrationPromotionCandidate(candidate, {
    ...scoreDebate.final,
    debateNumber: scoreDebate.debateNumber,
    debateId: scoreDebate.debateId
  });
  return {
    schemaVersion: CALIBRATION_PROMOTION_SITE_LEDGER_ADAPTER_VERSION,
    protocolId: CALIBRATION_PROMOTION_PROTOCOL_ID,
    status: "frozen-calibration-promotion-site-ledger-adapter",
    productionCanary: false,
    calibrationPromotion: true,
    debateNumber: scoreDebate.debateNumber,
    debateId: scoreDebate.debateId,
    model: "5.6 Sol",
    rubric: "Slugfester Reassessment Rubric v2",
    scoreProtocolId: scoreDebate.final.scoreProtocolId,
    sourceLocks: clone(sourceLocks),
    scoringJudgment,
    calculated: scoredSnapshot(scoreDebate.final),
    audit: {
      sections: candidateAudit.sections,
      moves: candidateAudit.moves,
      repositoryDerivedScores: true,
      modelAuthoredScores: 0,
      scoreChanges: 0,
      proseChanges: 0,
      frozenCandidateFieldChanges: 0,
      removedCalibrationMetadataFields: 2,
      productionMutationPerformed: false
    }
  };
}

export function validateCalibrationPromotionSiteLedgerAdapter({
  adapter,
  candidate,
  expectedSourceLocks
}) {
  assertV4(
    adapter?.schemaVersion === CALIBRATION_PROMOTION_SITE_LEDGER_ADAPTER_VERSION &&
      adapter.protocolId === CALIBRATION_PROMOTION_PROTOCOL_ID &&
      adapter.status === "frozen-calibration-promotion-site-ledger-adapter" &&
      adapter.productionCanary === false &&
      adapter.calibrationPromotion === true &&
      adapter.model === "5.6 Sol" &&
      adapter.rubric === "Slugfester Reassessment Rubric v2" &&
      adapter.scoreProtocolId === CALIBRATION_PROMOTION_SCORE_PROTOCOL_ID,
    `${adapter?.debateNumber ?? "unknown"}: calibration-promotion adapter identity changed`
  );
  assertV4(
    canonicalJson(adapter.sourceLocks) === canonicalJson(expectedSourceLocks),
    `${adapter.debateNumber}: calibration-promotion source locks changed`
  );
  const replayed = deriveV4PrimaryScores(adapter.scoringJudgment);
  assertV4(
    replayed.debateNumber === adapter.debateNumber &&
      replayed.debateId === adapter.debateId &&
      canonicalJson(scoredSnapshot(replayed)) === canonicalJson(adapter.calculated),
    `${adapter.debateNumber}: calibration-promotion score replay changed`
  );
  const candidateAudit = validateCalibrationPromotionCandidate(candidate, {
    ...replayed,
    debateNumber: adapter.debateNumber,
    debateId: adapter.debateId,
    scoreProtocolId: adapter.scoreProtocolId
  });
  assertV4(
    adapter.audit?.sections === candidateAudit.sections &&
      adapter.audit.moves === candidateAudit.moves &&
      adapter.audit.repositoryDerivedScores === true &&
      adapter.audit.modelAuthoredScores === 0 &&
      adapter.audit.scoreChanges === 0 &&
      adapter.audit.proseChanges === 0 &&
      adapter.audit.frozenCandidateFieldChanges === 0 &&
      adapter.audit.removedCalibrationMetadataFields === 2 &&
      adapter.audit.productionMutationPerformed === false,
    `${adapter.debateNumber}: calibration-promotion adapter audit changed`
  );
  return {
    status: "passed",
    debateNumber: adapter.debateNumber,
    sections: candidateAudit.sections,
    moves: candidateAudit.moves,
    repositoryScoreReplayPassed: true,
    adapterSha256: sha256(serializedJson(adapter))
  };
}
