import { getReferenceDefinition } from "../../src/data/references.js";

import {
  CHECKPOINT_V22_PUBLICATION_BYLINE,
  CHECKPOINT_V22_PUBLICATION_MODEL
} from "./assessment-production-checkpoint-v2.2-publication.mjs";
import { validateCheckpointV22PublicationOutput } from "./assessment-production-checkpoint-v2.2-publication-validation.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/deterministic-publication-compilation";
export const CHECKPOINT_V22_PUBLICATION_COMPILATION_PROTOCOL_ID =
  "assessment-production-checkpoint-v2.2-1-deterministic-publication-compilation";
export const CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER = Object.freeze([
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

function referenceUrl(tag) {
  const reference = getReferenceDefinition(tag.type, tag.slug);
  assertV4(reference && reference.label === tag.label, `unknown publication reference ${tag.type}:${tag.slug}`);
  return reference.externalUrl;
}

function mapTag(tag) {
  return {
    label: tag.label,
    type: tag.type,
    url: referenceUrl(tag),
    context: tag.context
  };
}

function mapExtensionSide(side) {
  return {
    finalArgument: {
      thesis: side.thesis.text,
      premises: side.premises.map((item) => item.text),
      conclusion: side.conclusion.text
    },
    newArguments: side.newArguments.map((item) => ({
      title: item.title,
      text: item.text
    }))
  };
}

export function compileCheckpointV22PublicationStagingRecord({ output, packet, identity }) {
  validateCheckpointV22PublicationOutput(output, packet);
  assertV4(
    identity &&
      identity.id === packet.debateId &&
      identity.number === packet.debateNumber &&
      Object.keys(identity).every((key) => ["id", "number", "topicCategory"].includes(key)),
    `${packet.debateNumber}: frozen production identity mismatch`
  );
  const moveById = new Map(packet.moves.map((move) => [move.moveId, move]));
  const argument = (moveId) => {
    if (!moveId) return null;
    const move = moveById.get(moveId);
    const prose = output.moveProse[moveId];
    assertV4(move && prose, `${packet.debateNumber}: missing compiled move ${moveId}`);
    return {
      ledgerMoveId: moveId,
      time: move.displayTime,
      role: prose.role,
      words: prose.words,
      score: move.finalScore,
      critique: prose.critique,
      tags: prose.tags.map(mapTag)
    };
  };
  const overall = Object.fromEntries(
    ["pro", "con"].map((side) => [
      side,
      {
        score: packet.calculatedScores.overall[side].score,
        strengths: clone(output.overallCommentary[side].strengths),
        blunders: output.overallCommentary[side].blunders.map((item) => ({
          text: item.text,
          links: item.tags.map((tag) => ({ label: tag.label, url: referenceUrl(tag) }))
        }))
      }
    ])
  );
  const record = {
    id: identity.id,
    number: identity.number,
    assessmentModel: CHECKPOINT_V22_PUBLICATION_MODEL.label,
    assessmentRubric: "Slugfester Reassessment Rubric v2",
    ...clone(packet.metadata),
    summary: output.summary,
    quotes: Object.fromEntries(
      ["pro", "con"].map((side) => [
        side,
        {
          text: output.representativeQuotes[side].text,
          context: output.representativeQuotes[side].context
        }
      ])
    ),
    sides: clone(packet.sides),
    score: {
      pro: packet.calculatedScores.overall.pro.score,
      con: packet.calculatedScores.overall.con.score
    },
    sections: packet.sections.map((section) => ({
      sectionId: section.sectionId,
      title: section.title,
      timebox: section.timebox,
      score: clone(section.score),
      exchanges: section.displayRows.map((row) => ({
        pro: argument(row.pro),
        con: argument(row.con)
      }))
    })),
    overall,
    logicalExtension: {
      pro: mapExtensionSide(output.aiExtension.pro),
      con: mapExtensionSide(output.aiExtension.con)
    },
    stagingAudit: {
      protocolId: CHECKPOINT_V22_PUBLICATION_COMPILATION_PROTOCOL_ID,
      productionCanary: true,
      stagingOnly: true,
      productionMutationPerformed: false,
      sourceDebateId: packet.debateId,
      sourceChain: clone(packet.sourceChain),
      calculatedWinner: packet.calculatedScores.winner,
      winningMargin: packet.calculatedScores.winningMargin,
      scoreProtocolId: packet.calculatedScores.scoreProtocolId,
      displayContract: clone(output.displayContract),
      noveltyMap: {
        pro: clone(output.aiExtension.pro),
        con: clone(output.aiExtension.con)
      },
      modelOutputCompletedAt: output.completedAt
    }
  };
  if (identity.topicCategory) record.topicCategory = identity.topicCategory;
  return record;
}

export function validateCheckpointV22CompiledStagingRecord({ compiled, output, packet, identity }) {
  const expected = compileCheckpointV22PublicationStagingRecord({ output, packet, identity });
  assertV4(
    canonicalJson(compiled) === canonicalJson(expected),
    `${packet.debateNumber}: compiled staging record differs from deterministic replay`
  );
  const moves = compiled.sections.flatMap((section) =>
    section.exchanges.flatMap((exchange) => [exchange.pro, exchange.con].filter(Boolean))
  );
  assertV4(
    compiled.id === packet.debateId &&
      compiled.number === packet.debateNumber &&
      compiled.assessmentModel === "5.6 Sol" &&
      compiled.assessmentRubric === "Slugfester Reassessment Rubric v2" &&
      compiled.stagingAudit.displayContract.byline === CHECKPOINT_V22_PUBLICATION_BYLINE &&
      compiled.stagingAudit.displayContract.defaultCollapsed === true &&
      compiled.stagingAudit.productionMutationPerformed === false &&
      moves.length === packet.moves.length &&
      moves.every((move) => move.score === moveByIdScore(packet, move.ledgerMoveId)),
    `${packet.debateNumber}: compiled staging invariants failed`
  );
  return {
    status: "passed",
    debateNumber: packet.debateNumber,
    sections: compiled.sections.length,
    moves: moves.length,
    scoresLocked: true,
    modelAuthoredScores: 0,
    aiExtensionIncluded: true,
    productionMutationPerformed: false
  };
}

function moveByIdScore(packet, moveId) {
  const move = packet.moves.find((item) => item.moveId === moveId);
  assertV4(move, `${packet.debateNumber}: unknown compiled move ${moveId}`);
  return move.finalScore;
}
