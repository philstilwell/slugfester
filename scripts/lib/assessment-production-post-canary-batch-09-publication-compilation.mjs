import {
  compileCheckpointV22PublicationStagingRecord
} from "./assessment-production-checkpoint-v2.2-publication-compilation.mjs";
import {
  POST_CANARY_BATCH_09_PUBLICATION_BYLINE,
  POST_CANARY_BATCH_09_PUBLICATION_DEBATES,
  toCheckpointV22PublicationOutput,
  toCheckpointV22PublicationPacket
} from "./assessment-production-post-canary-batch-09-publication.mjs";
import { validatePostCanaryBatch09PublicationOutput } from
  "./assessment-production-post-canary-batch-09-publication-validation.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_09_PUBLICATION_COMPILATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/deterministic-publication-compilation";
export const POST_CANARY_BATCH_09_PUBLICATION_COMPILATION_PROTOCOL_ID =
  "assessment-production-post-canary-batch-09-deterministic-publication-compilation";
export const POST_CANARY_BATCH_09_PUBLICATION_COMPILATION_ORDER = Object.freeze(
  [...POST_CANARY_BATCH_09_PUBLICATION_DEBATES]);

export function compilePostCanaryBatch09PublicationStagingRecord({ output, packet, identity }) {
  validatePostCanaryBatch09PublicationOutput(output, packet);
  const compiled = compileCheckpointV22PublicationStagingRecord({
    output: toCheckpointV22PublicationOutput(output),
    packet: toCheckpointV22PublicationPacket(packet), identity
  });
  compiled.stagingAudit.protocolId = POST_CANARY_BATCH_09_PUBLICATION_COMPILATION_PROTOCOL_ID;
  compiled.stagingAudit.productionCanary = false;
  compiled.stagingAudit.batchNumber = 9;
  return compiled;
}

export function validatePostCanaryBatch09CompiledStagingRecord({ compiled, output, packet, identity }) {
  const expected = compilePostCanaryBatch09PublicationStagingRecord({ output, packet, identity });
  assertV4(canonicalJson(compiled) === canonicalJson(expected),
    `${packet.debateNumber}: compiled staging record differs from deterministic replay`);
  const moves = compiled.sections.flatMap((section) => section.exchanges.flatMap((exchange) =>
    [exchange.pro, exchange.con].filter(Boolean)));
  const moveById = new Map(packet.moves.map((move) => [move.moveId, move]));
  assertV4(compiled.id === packet.debateId && compiled.number === packet.debateNumber &&
    compiled.assessmentModel === "5.6 Sol" &&
    compiled.assessmentRubric === "Slugfester Reassessment Rubric v2" &&
    compiled.stagingAudit.protocolId === POST_CANARY_BATCH_09_PUBLICATION_COMPILATION_PROTOCOL_ID &&
    compiled.stagingAudit.productionCanary === false && compiled.stagingAudit.batchNumber === 9 &&
    compiled.stagingAudit.displayContract.byline === POST_CANARY_BATCH_09_PUBLICATION_BYLINE &&
    compiled.stagingAudit.displayContract.defaultCollapsed === true &&
    compiled.stagingAudit.productionMutationPerformed === false &&
    moves.length === packet.moves.length && moves.every((move) =>
      move.score === moveById.get(move.ledgerMoveId)?.finalScore),
  `${packet.debateNumber}: compiled staging invariants failed`);
  return { status: "passed", debateNumber: packet.debateNumber,
    sections: compiled.sections.length, moves: moves.length, scoresLocked: true,
    scoresRecalculated: false, modelAuthoredScores: 0,
    aiExtensionIncluded: true, productionMutationPerformed: false };
}
