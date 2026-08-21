import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import { validatePostCanaryBatch03PublicationOutput } from "./assessment-production-post-canary-batch-03-publication-validation.mjs";
import { POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_ROOT } from "./assessment-production-post-canary-batch-03-publication-resumption-3.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const DEBATE_27_PUBLICATION_REPAIR_ROOT =
  `${POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_ROOT}/repair-1`;
export const DEBATE_27_PUBLICATION_REPAIR_PROTOCOL_ID =
  "assessment-production-post-canary-batch-03-publication-resumption-3-debate-27-repair-1";
export const DEBATE_27_PUBLICATION_REPAIR_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-03-publication-resumption-3-debate-27-repair-packet";
export const DEBATE_27_PUBLICATION_REPAIR_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-03-publication-resumption-3-debate-27-repair-output";
export const DEBATE_27_PUBLICATION_REPAIR_PARTITIONS = Object.freeze([
  Object.freeze(["moveProse.pro-moral-argument-limited-conclusion.critique", "moveProse.con-conscious-moral-status-circular-grounding.critique"]),
  Object.freeze(["moveProse.con-evolved-dispositions-conditional-rules.critique", "moveProse.pro-logic-reason-naturalist-grounding.critique"]),
  Object.freeze(["moveProse.con-objective-logic-subjective-reasoning.critique", "moveProse.pro-evolution-self-reference-basic-belief.critique"]),
  Object.freeze(["moveProse.pro-disagreement-not-unreality.critique"])
]);
export const DEBATE_27_PUBLICATION_REPAIR_FIELDS = Object.freeze(DEBATE_27_PUBLICATION_REPAIR_PARTITIONS.flat());

const LABELS = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const terminalPunctuationPresent = (value) => /[.!?]["')\]]?$/.test(String(value).trim());
const unexpectedCharactersAbsent = (value) => !/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(value);

export function debate27RepairMoveId(field) {
  const match = /^moveProse\.([^.]+)\.critique$/.exec(field);
  assertV4(match, `invalid Debate 27 repair field: ${field}`);
  return match[1];
}

export function buildDebate27RepairSchema(packet) {
  const moveIds = packet.corrections.map(({ moveId }) => moveId);
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-batch-03-debate-27-publication-repair-${packet.packetIndex}`,
    title: `Slugfester Batch 3 Debate 27 bounded publication repair packet ${packet.packetIndex}`,
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "packetIndex", "debateNumber", "debateId", "assessmentModel", "completedAt", "correctedCritiques"],
    properties: {
      schemaVersion: { type: "string", const: DEBATE_27_PUBLICATION_REPAIR_OUTPUT_VERSION },
      protocolId: { type: "string", const: DEBATE_27_PUBLICATION_REPAIR_PROTOCOL_ID },
      packetIndex: { type: "integer", const: packet.packetIndex },
      debateNumber: { type: "string", const: "27" },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: "5.6 Sol" },
      completedAt: { type: "string", minLength: 10 },
      correctedCritiques: {
        type: "object",
        additionalProperties: false,
        required: moveIds,
        properties: Object.fromEntries(moveIds.map((moveId) => [moveId, { type: "string", minLength: 880 }]))
      }
    }
  };
}

export function validateDebate27RepairOutput(output, packet) {
  const expectedTop = ["schemaVersion", "protocolId", "packetIndex", "debateNumber", "debateId", "assessmentModel", "completedAt", "correctedCritiques"];
  assertV4(output && typeof output === "object" && !Array.isArray(output), "Debate 27 repair output must be an object");
  assertV4(canonicalJson(Object.keys(output).sort()) === canonicalJson(expectedTop.sort()), "Debate 27 repair output fields changed");
  assertV4(
    output.schemaVersion === DEBATE_27_PUBLICATION_REPAIR_OUTPUT_VERSION && output.protocolId === DEBATE_27_PUBLICATION_REPAIR_PROTOCOL_ID &&
      output.packetIndex === packet.packetIndex && output.debateNumber === "27" && output.debateId === packet.debateId &&
      output.assessmentModel === "5.6 Sol" && !Number.isNaN(Date.parse(output.completedAt)),
    "Debate 27 repair identity or provenance mismatch"
  );
  const expectedMoveIds = packet.corrections.map(({ moveId }) => moveId).sort();
  assertV4(output.correctedCritiques && canonicalJson(Object.keys(output.correctedCritiques).sort()) === canonicalJson(expectedMoveIds), "Debate 27 repair critique field set changed");
  const correctedFields = [];
  for (const correction of packet.corrections) {
    const critique = String(output.correctedCritiques[correction.moveId] ?? "").trim();
    const words = wordCount(critique);
    const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
    assertV4(words >= 105 && words <= 130, `${correction.moveId}: repaired critique outside 105–130 words`);
    assertV4(critique.length >= 880, `${correction.moveId}: repaired critique shorter than 880 characters`);
    assertV4(sentences.length === 4, `${correction.moveId}: repaired critique must contain four sentences`);
    LABELS.forEach((label, index) => {
      assertV4(sentences[index].toLowerCase().startsWith(label), `${correction.moveId}: repaired critique label or order mismatch`);
      assertV4(terminalPunctuationPresent(sentences[index]), `${correction.moveId}: repaired critique sentence lacks terminal punctuation`);
    });
    assertV4(unexpectedCharactersAbsent(critique), `${correction.moveId}: repaired critique has an unexpected character`);
    assertV4(displayedLanguagePasses(critique), `${correction.moveId}: repaired critique has prohibited language`);
    correctedFields.push({ field: `moveProse.${correction.moveId}.critique`, words, characters: critique.length, sentences: 4 });
  }
  return { status: "passed", debateNumber: "27", packetIndex: packet.packetIndex, correctedFields, modelAuthoredScores: 0 };
}

function withMarkers(output) {
  const copy = structuredClone(output);
  for (const field of DEBATE_27_PUBLICATION_REPAIR_FIELDS) copy.moveProse[debate27RepairMoveId(field)].critique = "__AUTHORIZED_REPAIR_FIELD__";
  return copy;
}

export function mergeAndValidateDebate27Repairs({ baseOutput, repairOutputs, repairPackets, publicationPacket }) {
  assertV4(repairOutputs.length === 4 && repairPackets.length === 4, "all four Debate 27 repair packets are required");
  const merged = structuredClone(baseOutput);
  const transformations = [];
  for (let index = 0; index < 4; index += 1) {
    const repair = repairOutputs[index];
    const packet = repairPackets[index];
    validateDebate27RepairOutput(repair, packet);
    for (const correction of packet.corrections) {
      const field = `moveProse.${correction.moveId}.critique`;
      transformations.push({ field, packetIndex: index, operation: "replace-authorized-invalid-critique", before: merged.moveProse[correction.moveId].critique, after: repair.correctedCritiques[correction.moveId] });
      merged.moveProse[correction.moveId].critique = repair.correctedCritiques[correction.moveId];
    }
  }
  assertV4(transformations.length === 7 && new Set(transformations.map(({ field }) => field)).size === 7, "exactly seven Debate 27 critiques must change once");
  assertV4(canonicalJson(withMarkers(merged)) === canonicalJson(withMarkers(baseOutput)), "Debate 27 repair changed a protected field");
  const fullValidation = validatePostCanaryBatch03PublicationOutput(merged, publicationPacket);
  return { merged, transformations, fullValidation };
}
