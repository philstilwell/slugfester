import { createHash } from "node:crypto";

import {
  assertV4,
  canonicalJson,
  deriveV4PrimaryScores
} from "./v4-lean-production.mjs";
import { canonicalizeV4220PrimaryOutput } from "./v4220-source-span-rendering.mjs";

export const CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/compatibility-remedy";
export const CHECKPOINT_V22_COMPATIBILITY_REMEDY_PROTOCOL_ID =
  "assessment-production-checkpoint-v2.2-1-compatibility-remedy";
export const CHECKPOINT_V22_SITE_LEDGER_ADAPTER_VERSION =
  "1.0-production-checkpoint-v2.2-site-ledger-adapter";
export const CHECKPOINT_V22_COMPATIBILITY_ORDER = Object.freeze([
  "50",
  "192",
  "129",
  "40",
  "25",
  "104",
  "22",
  "10",
  "167",
  "122"
]);

const clone = (value) => structuredClone(value);

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function serializedJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function scoredSnapshot(finalScores) {
  return {
    sections: clone(finalScores.sections),
    overall: clone(finalScores.overall),
    winner: finalScores.winner,
    winningMargin: finalScores.winningMargin
  };
}

function candidateMoves(candidate, sectionIndex, side) {
  return (candidate.sections?.[sectionIndex]?.exchanges ?? [])
    .map((exchange) => exchange?.[side])
    .filter(Boolean)
    .map((move) => ({
      moveId: move.ledgerMoveId,
      score: move.score
    }));
}

export function validateCheckpointV22CandidateAgainstScores(
  candidate,
  finalScores
) {
  assertV4(
    candidate?.id === finalScores.debateId &&
      candidate.number === finalScores.debateNumber &&
      candidate.assessmentModel === "5.6 Sol" &&
      candidate.assessmentRubric === "Slugfester Reassessment Rubric v2",
    `${finalScores.debateNumber}: publication candidate identity mismatch`
  );
  assertV4(
    candidate.score?.pro === finalScores.overall.pro.score &&
      candidate.score?.con === finalScores.overall.con.score &&
      candidate.overall?.pro?.score === finalScores.overall.pro.score &&
      candidate.overall?.con?.score === finalScores.overall.con.score,
    `${finalScores.debateNumber}: publication candidate overall scores changed`
  );
  assertV4(
    candidate.sections?.length === finalScores.sections.length,
    `${finalScores.debateNumber}: publication candidate section count changed`
  );
  let moveCount = 0;
  finalScores.sections.forEach((scoredSection, sectionIndex) => {
    const candidateSection = candidate.sections[sectionIndex];
    assertV4(
      candidateSection?.sectionId === scoredSection.sectionId &&
        candidateSection.title === scoredSection.title &&
        candidateSection.score?.pro === scoredSection.sides.pro.score &&
        candidateSection.score?.con === scoredSection.sides.con.score,
      `${finalScores.debateNumber}: section ${sectionIndex} identity or score changed`
    );
    for (const side of ["pro", "con"]) {
      const published = candidateMoves(candidate, sectionIndex, side);
      const scored = scoredSection.sides[side].moves.map((move) => ({
        moveId: move.moveId,
        score: move.score
      }));
      assertV4(
        canonicalJson(published) === canonicalJson(scored),
        `${finalScores.debateNumber}: section ${sectionIndex} ${side} move IDs, order, or scores changed`
      );
      moveCount += scored.length;
    }
  });
  return {
    status: "passed",
    debateNumber: finalScores.debateNumber,
    sections: finalScores.sections.length,
    moves: moveCount,
    model: candidate.assessmentModel,
    rubric: candidate.assessmentRubric,
    scoreProtocolId: finalScores.scoreProtocolId
  };
}

export function buildCheckpointV22SiteLedgerAdapter({
  finalLedgerDebate,
  scoreDebate,
  candidate,
  eventsDocument,
  sourceLocks
}) {
  assertV4(
    finalLedgerDebate?.debateNumber === scoreDebate?.debateNumber &&
      finalLedgerDebate.debateId === scoreDebate.debateId,
    "checkpoint final-ledger and score identities differ"
  );
  const scoringJudgment = canonicalizeV4220PrimaryOutput(
    finalLedgerDebate.finalJudgment,
    eventsDocument
  );
  const derived = deriveV4PrimaryScores(scoringJudgment);
  const { scoreProtocolId: _scoreProtocolId, ...storedFinalScores } =
    scoreDebate.final;
  assertV4(
    canonicalJson(derived) === canonicalJson(storedFinalScores),
    `${scoreDebate.debateNumber}: locked final score is not an exact repository replay`
  );
  const candidateValidation = validateCheckpointV22CandidateAgainstScores(
    candidate,
    {
      ...scoreDebate.final,
      debateNumber: scoreDebate.debateNumber,
      debateId: scoreDebate.debateId
    }
  );
  return {
    schemaVersion: CHECKPOINT_V22_SITE_LEDGER_ADAPTER_VERSION,
    protocolId: CHECKPOINT_V22_COMPATIBILITY_REMEDY_PROTOCOL_ID,
    status: "frozen-production-checkpoint-v2.2-site-ledger-adapter",
    productionCanary: true,
    debateNumber: scoreDebate.debateNumber,
    debateId: scoreDebate.debateId,
    model: "5.6 Sol",
    rubric: "Slugfester Reassessment Rubric v2",
    scoreProtocolId: scoreDebate.final.scoreProtocolId,
    sourceLocks: clone(sourceLocks),
    scoringJudgment,
    calculated: scoredSnapshot(scoreDebate.final),
    audit: {
      sections: candidateValidation.sections,
      moves: candidateValidation.moves,
      repositoryDerivedScores: true,
      modelAuthoredScores: 0,
      scoreChanges: 0,
      proseChanges: 0,
      syntheticReferences: 0,
      productionMutationPerformed: false
    }
  };
}

export function validateCheckpointV22SiteLedgerAdapter({
  adapter,
  candidate,
  expectedSourceLocks
}) {
  assertV4(
    adapter?.schemaVersion === CHECKPOINT_V22_SITE_LEDGER_ADAPTER_VERSION &&
      adapter.protocolId === CHECKPOINT_V22_COMPATIBILITY_REMEDY_PROTOCOL_ID &&
      adapter.status ===
        "frozen-production-checkpoint-v2.2-site-ledger-adapter" &&
      adapter.productionCanary === true &&
      adapter.model === "5.6 Sol" &&
      adapter.rubric === "Slugfester Reassessment Rubric v2" &&
      adapter.scoreProtocolId ===
        "assessment-production-checkpoint-v2.2-1-single-deterministic-score-pass",
    `${adapter?.debateNumber ?? "unknown"}: checkpoint site-ledger adapter identity mismatch`
  );
  assertV4(
    canonicalJson(adapter.sourceLocks) === canonicalJson(expectedSourceLocks),
    `${adapter.debateNumber}: checkpoint site-ledger source locks changed`
  );
  const replayed = deriveV4PrimaryScores(adapter.scoringJudgment);
  assertV4(
    replayed.debateNumber === adapter.debateNumber &&
      replayed.debateId === adapter.debateId,
    `${adapter.debateNumber}: checkpoint site-ledger scoring identity changed`
  );
  assertV4(
    canonicalJson(scoredSnapshot(replayed)) ===
      canonicalJson(adapter.calculated),
    `${adapter.debateNumber}: checkpoint site-ledger score replay changed`
  );
  const candidateValidation = validateCheckpointV22CandidateAgainstScores(
    candidate,
    {
      ...replayed,
      debateNumber: adapter.debateNumber,
      debateId: adapter.debateId,
      scoreProtocolId: adapter.scoreProtocolId
    }
  );
  assertV4(
    adapter.audit?.sections === candidateValidation.sections &&
      adapter.audit.moves === candidateValidation.moves &&
      adapter.audit.repositoryDerivedScores === true &&
      adapter.audit.modelAuthoredScores === 0 &&
      adapter.audit.scoreChanges === 0 &&
      adapter.audit.proseChanges === 0 &&
      adapter.audit.syntheticReferences === 0 &&
      adapter.audit.productionMutationPerformed === false,
    `${adapter.debateNumber}: checkpoint site-ledger adapter audit changed`
  );
  return {
    ...candidateValidation,
    adapterSha256: sha256(serializedJson(adapter)),
    repositoryScoreReplayPassed: true,
    productionMutationPerformed: false
  };
}
