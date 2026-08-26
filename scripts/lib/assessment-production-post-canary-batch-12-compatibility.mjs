import { createHash } from "node:crypto";

import {
  assertV4,
  canonicalJson,
  deriveV4PrimaryScores
} from "./v4-lean-production.mjs";
import { canonicalizeV4220PrimaryOutput } from "./v4220-source-span-rendering.mjs";

export const POST_CANARY_BATCH_12_COMPATIBILITY_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-12/production-compatibility";
export const POST_CANARY_BATCH_12_COMPATIBILITY_PROTOCOL_ID =
  "assessment-production-post-canary-batch-12-production-compatibility";
export const POST_CANARY_BATCH_12_SITE_LEDGER_ADAPTER_VERSION =
  "1.0-assessment-production-post-canary-batch-12-site-ledger-adapter";
export const POST_CANARY_BATCH_12_COMPATIBILITY_ORDER = Object.freeze([
  "152",
  "28",
  "119",
  "116",
  "131",
  "07",
  "33",
  "15",
  "29",
  "11"
]);

const SCORE_PROTOCOL_ID =
  "assessment-production-post-canary-batch-12-single-deterministic-score-pass";
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

export function postCanaryBatch12SectionTitleMatches({
  debateNumber: _debateNumber,
  candidateSection,
  scoredSection
}) {
  return candidateSection?.title === scoredSection?.title;
}

export function validatePostCanaryBatch12CandidateAgainstScores(
  candidate,
  finalScores
) {
  assertV4(
    candidate?.id === finalScores.debateId &&
      candidate.number === finalScores.debateNumber &&
      candidate.assessmentModel === "5.6 Sol" &&
      candidate.assessmentRubric === "Slugfester Reassessment Rubric v2",
    `${finalScores.debateNumber}: Batch 12 publication candidate identity mismatch`
  );
  assertV4(
    candidate.score?.pro === finalScores.overall.pro.score &&
      candidate.score?.con === finalScores.overall.con.score &&
      candidate.overall?.pro?.score === finalScores.overall.pro.score &&
      candidate.overall?.con?.score === finalScores.overall.con.score,
    `${finalScores.debateNumber}: Batch 12 publication candidate overall scores changed`
  );
  assertV4(
    candidate.sections?.length === finalScores.sections.length,
    `${finalScores.debateNumber}: Batch 12 publication candidate section count changed`
  );
  let moveCount = 0;
  finalScores.sections.forEach((scoredSection, sectionIndex) => {
    const candidateSection = candidate.sections[sectionIndex];
    assertV4(
      candidateSection?.sectionId === scoredSection.sectionId &&
        postCanaryBatch12SectionTitleMatches({
          debateNumber: finalScores.debateNumber,
          candidateSection,
          scoredSection
        }) &&
        candidateSection.score?.pro === scoredSection.sides.pro.score &&
        candidateSection.score?.con === scoredSection.sides.con.score,
      `${finalScores.debateNumber}: Batch 12 section ${sectionIndex} identity or score changed`
    );
    for (const side of ["pro", "con"]) {
      const published = candidateMoves(candidate, sectionIndex, side);
      const scored = scoredSection.sides[side].moves.map((move) => ({
        moveId: move.moveId,
        score: move.score
      }));
      assertV4(
        canonicalJson(published) === canonicalJson(scored),
        `${finalScores.debateNumber}: Batch 12 section ${sectionIndex} ${side} move IDs, order, or scores changed`
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

export function buildPostCanaryBatch12SiteLedgerAdapter({
  finalLedgerDebate,
  scoreDebate,
  candidate,
  eventsDocument,
  sourceLocks
}) {
  assertV4(
    finalLedgerDebate?.debateNumber === scoreDebate?.debateNumber &&
      finalLedgerDebate.debateId === scoreDebate.debateId,
    "Batch 12 final-ledger and score identities differ"
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
    `${scoreDebate.debateNumber}: locked Batch 12 score is not an exact repository replay`
  );
  const candidateValidation =
    validatePostCanaryBatch12CandidateAgainstScores(candidate, {
      ...scoreDebate.final,
      debateNumber: scoreDebate.debateNumber,
      debateId: scoreDebate.debateId
    });
  return {
    schemaVersion: POST_CANARY_BATCH_12_SITE_LEDGER_ADAPTER_VERSION,
    protocolId: POST_CANARY_BATCH_12_COMPATIBILITY_PROTOCOL_ID,
    status: "frozen-post-canary-batch-12-site-ledger-adapter",
    productionCanary: false,
    batchNumber: 12,
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
      attributionChanges: 0,
      optionalReferenceBehaviorChanges: 0,
      productionMutationPerformed: false
    }
  };
}

export function validatePostCanaryBatch12SiteLedgerAdapter({
  adapter,
  candidate,
  expectedSourceLocks
}) {
  assertV4(
    adapter?.schemaVersion ===
        POST_CANARY_BATCH_12_SITE_LEDGER_ADAPTER_VERSION &&
      adapter.protocolId === POST_CANARY_BATCH_12_COMPATIBILITY_PROTOCOL_ID &&
      adapter.status ===
        "frozen-post-canary-batch-12-site-ledger-adapter" &&
      adapter.productionCanary === false &&
      adapter.batchNumber === 12 &&
      adapter.model === "5.6 Sol" &&
      adapter.rubric === "Slugfester Reassessment Rubric v2" &&
      adapter.scoreProtocolId === SCORE_PROTOCOL_ID,
    `${adapter?.debateNumber ?? "unknown"}: Batch 12 site-ledger adapter identity mismatch`
  );
  assertV4(
    canonicalJson(adapter.sourceLocks) === canonicalJson(expectedSourceLocks),
    `${adapter.debateNumber}: Batch 12 site-ledger source locks changed`
  );
  const replayed = deriveV4PrimaryScores(adapter.scoringJudgment);
  assertV4(
    replayed.debateNumber === adapter.debateNumber &&
      replayed.debateId === adapter.debateId,
    `${adapter.debateNumber}: Batch 12 site-ledger scoring identity changed`
  );
  assertV4(
    canonicalJson(scoredSnapshot(replayed)) === canonicalJson(adapter.calculated),
    `${adapter.debateNumber}: Batch 12 site-ledger score replay changed`
  );
  const candidateValidation =
    validatePostCanaryBatch12CandidateAgainstScores(candidate, {
      ...replayed,
      debateNumber: adapter.debateNumber,
      debateId: adapter.debateId,
      scoreProtocolId: adapter.scoreProtocolId
    });
  assertV4(
    adapter.audit?.sections === candidateValidation.sections &&
      adapter.audit.moves === candidateValidation.moves &&
      adapter.audit.repositoryDerivedScores === true &&
      adapter.audit.modelAuthoredScores === 0 &&
      adapter.audit.scoreChanges === 0 &&
      adapter.audit.proseChanges === 0 &&
      adapter.audit.attributionChanges === 0 &&
      adapter.audit.optionalReferenceBehaviorChanges === 0 &&
      adapter.audit.productionMutationPerformed === false,
    `${adapter.debateNumber}: Batch 12 site-ledger adapter audit changed`
  );
  return {
    ...candidateValidation,
    adapterSha256: sha256(serializedJson(adapter)),
    repositoryScoreReplayPassed: true,
    productionMutationPerformed: false
  };
}
