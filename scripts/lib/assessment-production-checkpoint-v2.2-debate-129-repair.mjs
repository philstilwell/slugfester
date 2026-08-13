import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import { CHECKPOINT_V22_PUBLICATION_MODEL } from "./assessment-production-checkpoint-v2.2-publication.mjs";
import { validateCheckpointV22PublicationOutput } from "./assessment-production-checkpoint-v2.2-publication-validation.mjs";
import { CHECKPOINT_V22_RESUMPTION_2_ROOT } from "./assessment-production-checkpoint-v2.2-publication-resumption-2.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const CHECKPOINT_V22_DEBATE_129_REPAIR_ROOT = `${CHECKPOINT_V22_RESUMPTION_2_ROOT}/repair-1`;
export const CHECKPOINT_V22_DEBATE_129_REPAIR_PROTOCOL_ID = "assessment-production-checkpoint-v2.2-1-debate-129-publication-repair-1";
export const CHECKPOINT_V22_DEBATE_129_REPAIR_OUTPUT_VERSION = "1.0-production-checkpoint-v2.2-debate-129-publication-repair-output";
export const CHECKPOINT_V22_DEBATE_129_REPAIR_FIELDS = Object.freeze([
  "moveProse.pro-rational-acceptance-distinction.critique",
  "moveProse.con-content-conceptual-constraints.critique"
]);
const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];

export function debate129RepairMoveId(field) {
  const match = /^moveProse\.([^.]+)\.critique$/.exec(field);
  assertV4(match, `invalid repair field: ${field}`);
  return match[1];
}

export function buildDebate129RepairSchema(packet) {
  const fields = Object.fromEntries(packet.corrections.map(({ moveId }) => [moveId, { type: "string", minLength: 880 }]));
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-production-checkpoint-v2.2-debate-129-publication-repair-1",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "debateNumber", "debateId", "assessmentModel", "completedAt", "correctedCritiques"],
    properties: {
      schemaVersion: { type: "string", const: CHECKPOINT_V22_DEBATE_129_REPAIR_OUTPUT_VERSION },
      protocolId: { type: "string", const: CHECKPOINT_V22_DEBATE_129_REPAIR_PROTOCOL_ID },
      debateNumber: { type: "string", const: "129" },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: CHECKPOINT_V22_PUBLICATION_MODEL.label },
      completedAt: { type: "string", minLength: 10 },
      correctedCritiques: { type: "object", additionalProperties: false, required: Object.keys(fields), properties: fields }
    }
  };
}

export function validateDebate129RepairOutput(repair, packet) {
  const expectedTop = ["schemaVersion", "protocolId", "debateNumber", "debateId", "assessmentModel", "completedAt", "correctedCritiques"];
  assertV4(repair && typeof repair === "object" && !Array.isArray(repair), "repair output must be an object");
  assertV4(canonicalJson(Object.keys(repair).sort()) === canonicalJson(expectedTop.sort()), "repair output fields changed");
  assertV4(
    repair.schemaVersion === CHECKPOINT_V22_DEBATE_129_REPAIR_OUTPUT_VERSION &&
      repair.protocolId === CHECKPOINT_V22_DEBATE_129_REPAIR_PROTOCOL_ID &&
      repair.debateNumber === "129" && repair.debateId === packet.debateId &&
      repair.assessmentModel === CHECKPOINT_V22_PUBLICATION_MODEL.label && !Number.isNaN(Date.parse(repair.completedAt)),
    "repair identity or provenance mismatch"
  );
  const expectedMoveIds = packet.corrections.map(({ moveId }) => moveId).sort();
  assertV4(repair.correctedCritiques && canonicalJson(Object.keys(repair.correctedCritiques).sort()) === canonicalJson(expectedMoveIds), "repair critique field set changed");
  const correctedFields = [];
  for (const correction of packet.corrections) {
    const critique = String(repair.correctedCritiques[correction.moveId] ?? "").trim();
    const words = wordCount(critique), sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
    assertV4(words >= 105 && words <= 130, `${correction.moveId}: repaired critique outside 105–130 words`);
    assertV4(critique.length >= 880, `${correction.moveId}: repaired critique shorter than 880 characters`);
    assertV4(sentences.length === 4, `${correction.moveId}: repaired critique must contain four sentences`);
    labels.forEach((label, index) => {
      assertV4(sentences[index].toLowerCase().startsWith(label), `${correction.moveId}: repaired critique label or order mismatch`);
      assertV4(/[.!?]["')\]]?$/.test(sentences[index].trim()), `${correction.moveId}: repaired critique sentence lacks terminal punctuation`);
    });
    assertV4(!/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(critique), `${correction.moveId}: unexpected character`);
    assertV4(displayedLanguagePasses(critique), `${correction.moveId}: prohibited language`);
    correctedFields.push({ field: `moveProse.${correction.moveId}.critique`, words, characters: critique.length, sentences: 4 });
  }
  return { status: "passed", debateNumber: "129", correctedFields, modelAuthoredScores: 0 };
}

function marked(output) {
  const copy = structuredClone(output);
  for (const field of CHECKPOINT_V22_DEBATE_129_REPAIR_FIELDS) copy.moveProse[debate129RepairMoveId(field)].critique = "__AUTHORIZED_REPAIR_FIELD__";
  return copy;
}

export function mergeAndValidateDebate129Repair({ baseOutput, repair, repairPacket, publicationPacket }) {
  const repairValidation = validateDebate129RepairOutput(repair, repairPacket);
  const merged = structuredClone(baseOutput), transformations = [];
  for (const correction of repairPacket.corrections) {
    const field = `moveProse.${correction.moveId}.critique`, before = merged.moveProse[correction.moveId].critique, after = repair.correctedCritiques[correction.moveId];
    merged.moveProse[correction.moveId].critique = after;
    transformations.push({ field, operation: "replace-authorized-invalid-field", before, after });
  }
  assertV4(canonicalJson(marked(merged)) === canonicalJson(marked(baseOutput)), "repair changed a field outside the two-field authorization");
  return { merged, repairValidation, transformations, fullValidation: validateCheckpointV22PublicationOutput(merged, publicationPacket) };
}
