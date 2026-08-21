import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import { validatePostCanaryBatch03PublicationOutput } from "./assessment-production-post-canary-batch-03-publication-validation.mjs";
import {
  POST_CANARY_BATCH_03_DEBATE_157_REPAIR_FIELDS,
  POST_CANARY_BATCH_03_DEBATE_157_REPAIR_ROOT,
  debate157RepairMoveId,
  validateDebate157RepairOutput
} from "./assessment-production-post-canary-batch-03-publication-resumption-2-repair.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const DEBATE_157_CORRECTION_2_ROOT =
  `${POST_CANARY_BATCH_03_DEBATE_157_REPAIR_ROOT}/correction-2`;
export const DEBATE_157_CORRECTION_2_PROTOCOL_ID =
  "assessment-production-post-canary-batch-03-publication-resumption-2-debate-157-repair-correction-2";
export const DEBATE_157_CORRECTION_2_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-03-debate-157-publication-repair-correction-2-packet";
export const DEBATE_157_CORRECTION_2_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-03-debate-157-publication-repair-correction-2-output";
export const DEBATE_157_CORRECTION_2_FIELDS = Object.freeze([
  "moveProse.pro-brute-cause-insufficient.critique",
  "moveProse.pro-logical-moments-trinity.critique"
]);

const LABELS = [
  "strongest feature:",
  "principal limitation:",
  "live burden:",
  "locked score:"
];
const terminalPunctuationPresent = (value) =>
  /[.!?]["')\]]?$/.test(String(value).trim());
const unexpectedCharactersAbsent = (value) =>
  !/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(
    value
  );

export function buildDebate157Correction2Schema(packet) {
  const moveIds = packet.corrections.map(({ moveId }) => moveId);
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-post-canary-batch-03-debate-157-publication-repair-correction-2",
    title: "Slugfester Batch 3 Debate 157 two-field publication repair correction-2",
    type: "object",
    additionalProperties: false,
    required: [
      "schemaVersion",
      "protocolId",
      "correctionId",
      "debateNumber",
      "debateId",
      "assessmentModel",
      "completedAt",
      "correctedCritiques"
    ],
    properties: {
      schemaVersion: { type: "string", const: DEBATE_157_CORRECTION_2_OUTPUT_VERSION },
      protocolId: { type: "string", const: DEBATE_157_CORRECTION_2_PROTOCOL_ID },
      correctionId: { type: "string", const: "correction-2" },
      debateNumber: { type: "string", const: "157" },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: "5.6 Sol" },
      completedAt: { type: "string", minLength: 10 },
      correctedCritiques: {
        type: "object",
        additionalProperties: false,
        required: moveIds,
        properties: Object.fromEntries(
          moveIds.map((moveId) => [moveId, { type: "string", minLength: 880 }])
        )
      }
    }
  };
}

export function validateDebate157Correction2Output(output, packet) {
  const expectedTop = [
    "schemaVersion",
    "protocolId",
    "correctionId",
    "debateNumber",
    "debateId",
    "assessmentModel",
    "completedAt",
    "correctedCritiques"
  ];
  assertV4(output && typeof output === "object" && !Array.isArray(output), "correction-2 output must be an object");
  assertV4(
    canonicalJson(Object.keys(output).sort()) === canonicalJson(expectedTop.sort()),
    "correction-2 output fields changed"
  );
  assertV4(
    output.schemaVersion === DEBATE_157_CORRECTION_2_OUTPUT_VERSION &&
      output.protocolId === DEBATE_157_CORRECTION_2_PROTOCOL_ID &&
      output.correctionId === "correction-2" &&
      output.debateNumber === "157" &&
      output.debateId === packet.debateId &&
      output.assessmentModel === "5.6 Sol" &&
      !Number.isNaN(Date.parse(output.completedAt)),
    "correction-2 output identity or provenance mismatch"
  );
  const expectedMoveIds = packet.corrections.map(({ moveId }) => moveId).sort();
  assertV4(
    output.correctedCritiques &&
      canonicalJson(Object.keys(output.correctedCritiques).sort()) === canonicalJson(expectedMoveIds),
    "correction-2 critique field set changed"
  );
  const correctedFields = [];
  for (const correction of packet.corrections) {
    const critique = String(output.correctedCritiques[correction.moveId] ?? "").trim();
    const words = wordCount(critique);
    const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
    assertV4(words >= 105 && words <= 130, `${correction.moveId}: corrected critique outside 105–130 words`);
    assertV4(critique.length >= 880, `${correction.moveId}: corrected critique shorter than 880 characters`);
    assertV4(sentences.length === 4, `${correction.moveId}: corrected critique must contain four sentences`);
    LABELS.forEach((label, index) => {
      assertV4(sentences[index].toLowerCase().startsWith(label), `${correction.moveId}: corrected critique label or order mismatch`);
      assertV4(terminalPunctuationPresent(sentences[index]), `${correction.moveId}: corrected critique sentence lacks terminal punctuation`);
    });
    assertV4(unexpectedCharactersAbsent(critique), `${correction.moveId}: corrected critique has an unexpected character`);
    assertV4(displayedLanguagePasses(critique), `${correction.moveId}: corrected critique has prohibited language`);
    correctedFields.push({
      field: `moveProse.${correction.moveId}.critique`,
      words,
      characters: critique.length,
      sentences: 4
    });
  }
  return {
    status: "passed",
    debateNumber: "157",
    correctionId: "correction-2",
    correctedFields,
    modelAuthoredScores: 0
  };
}

function withAuthorizedMarkers(output) {
  const copy = structuredClone(output);
  for (const field of POST_CANARY_BATCH_03_DEBATE_157_REPAIR_FIELDS) {
    copy.moveProse[debate157RepairMoveId(field)].critique = "__AUTHORIZED_REPAIR_FIELD__";
  }
  return copy;
}

export function mergeAcceptedDebate157CorrectionAndRepairs({
  baseOutput,
  correctionOutput,
  correctionPacket,
  remainingRepairOutputs,
  remainingRepairPackets,
  publicationPacket
}) {
  assertV4(
    remainingRepairOutputs.length === 7 && remainingRepairPackets.length === 7,
    "exactly seven resumed Debate 157 repair outputs are required"
  );
  validateDebate157Correction2Output(correctionOutput, correctionPacket);
  const merged = structuredClone(baseOutput);
  const transformations = [];
  for (const correction of correctionPacket.corrections) {
    const field = `moveProse.${correction.moveId}.critique`;
    transformations.push({
      field,
      acceptedSource: "correction-2",
      before: merged.moveProse[correction.moveId].critique,
      after: correctionOutput.correctedCritiques[correction.moveId]
    });
    merged.moveProse[correction.moveId].critique = correctionOutput.correctedCritiques[correction.moveId];
  }
  for (let index = 0; index < 7; index += 1) {
    const output = remainingRepairOutputs[index];
    const packet = remainingRepairPackets[index];
    validateDebate157RepairOutput(output, packet);
    for (const correction of packet.corrections) {
      const field = `moveProse.${correction.moveId}.critique`;
      transformations.push({
        field,
        acceptedSource: `repair-1-packet-${packet.packetIndex}`,
        before: merged.moveProse[correction.moveId].critique,
        after: output.correctedCritiques[correction.moveId]
      });
      merged.moveProse[correction.moveId].critique = output.correctedCritiques[correction.moveId];
    }
  }
  assertV4(transformations.length === 16, "exactly sixteen authorized critique fields must be merged");
  assertV4(
    new Set(transformations.map(({ field }) => field)).size === 16,
    "each authorized critique field must be merged exactly once"
  );
  assertV4(
    canonicalJson(withAuthorizedMarkers(merged)) === canonicalJson(withAuthorizedMarkers(baseOutput)),
    "the Debate 157 merge changed a protected field"
  );
  const fullValidation = validatePostCanaryBatch03PublicationOutput(merged, publicationPacket);
  return { merged, transformations, fullValidation };
}
