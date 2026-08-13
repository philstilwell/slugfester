import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import {
  CHECKPOINT_V22_PUBLICATION_MODEL,
  CHECKPOINT_V22_PUBLICATION_ROOT
} from "./assessment-production-checkpoint-v2.2-publication.mjs";
import { validateCheckpointV22PublicationOutput } from "./assessment-production-checkpoint-v2.2-publication-validation.mjs";
import { CHECKPOINT_V22_RESUMPTION_3_ROOT } from "./assessment-production-checkpoint-v2.2-publication-resumption-3.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT = `${CHECKPOINT_V22_RESUMPTION_3_ROOT}/repair-1`;
export const CHECKPOINT_V22_DEBATE_22_REPAIR_PROTOCOL_ID = "assessment-production-checkpoint-v2.2-1-debate-22-publication-repair-1";
export const CHECKPOINT_V22_DEBATE_22_REPAIR_PACKET_VERSION = "1.0-production-checkpoint-v2.2-debate-22-publication-repair-packet";
export const CHECKPOINT_V22_DEBATE_22_REPAIR_OUTPUT_VERSION = "1.0-production-checkpoint-v2.2-debate-22-publication-repair-output";
export const CHECKPOINT_V22_DEBATE_22_REPAIR_PARTITIONS = Object.freeze([
  Object.freeze([
    "moveProse.pro-cosmic-planetary-fine-tuning.critique",
    "moveProse.pro-dna-specified-information-design.critique"
  ]),
  Object.freeze([
    "moveProse.pro-reason-mathematics-freedom.critique",
    "moveProse.con-autonomy-against-divine-permission.critique"
  ]),
  Object.freeze([
    "moveProse.con-divine-tyranny-against-moral-autonomy.critique",
    "moveProse.con-theistic-claimant-burden.critique"
  ]),
  Object.freeze([
    "moveProse.con-designer-christianity-gap.critique",
    "moveProse.con-secular-morality-and-religious-crime.critique"
  ]),
  Object.freeze([
    "moveProse.pro-wrongdoing-generic-theism-distinction.critique",
    "moveProse.con-evolution-parsimony-against-designer.critique"
  ]),
  Object.freeze([
    "moveProse.con-dna-design-underdetermination.critique",
    "moveProse.pro-resurrection-christian-evidence-bridge.critique"
  ]),
  Object.freeze(["moveProse.con-secular-sacrifice-without-reward.critique"])
]);
export const CHECKPOINT_V22_DEBATE_22_REPAIR_FIELDS = Object.freeze(
  CHECKPOINT_V22_DEBATE_22_REPAIR_PARTITIONS.flat()
);
export const CHECKPOINT_V22_DEBATE_22_BASE_OUTPUT = `${CHECKPOINT_V22_RESUMPTION_3_ROOT}/outputs/debate-22.json`;
export const CHECKPOINT_V22_DEBATE_22_PUBLICATION_PACKET = `${CHECKPOINT_V22_PUBLICATION_ROOT}/packets/debate-22.json`;
export const CHECKPOINT_V22_COMPLETE_COHORT_OUTPUTS = Object.freeze({
  "50": `${CHECKPOINT_V22_PUBLICATION_ROOT}/repair-1/merged/debate-50.json`,
  "192": `${CHECKPOINT_V22_PUBLICATION_ROOT}/resumption-1/repair-1/merged/debate-192.json`,
  "129": `${CHECKPOINT_V22_PUBLICATION_ROOT}/resumption-2/repair-1/merged/debate-129.json`,
  "40": `${CHECKPOINT_V22_RESUMPTION_3_ROOT}/outputs/debate-40.json`,
  "25": `${CHECKPOINT_V22_RESUMPTION_3_ROOT}/outputs/debate-25.json`,
  "104": `${CHECKPOINT_V22_RESUMPTION_3_ROOT}/outputs/debate-104.json`,
  "22": `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/merged/debate-22.json`,
  "10": `${CHECKPOINT_V22_RESUMPTION_3_ROOT}/outputs/debate-10.json`,
  "167": `${CHECKPOINT_V22_RESUMPTION_3_ROOT}/outputs/debate-167.json`,
  "122": `${CHECKPOINT_V22_RESUMPTION_3_ROOT}/outputs/debate-122.json`
});
export const CHECKPOINT_V22_COMPLETE_COHORT_PACKETS = Object.freeze(
  Object.fromEntries(
    Object.keys(CHECKPOINT_V22_COMPLETE_COHORT_OUTPUTS).map((debateNumber) => [
      debateNumber,
      `${CHECKPOINT_V22_PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`
    ])
  )
);

const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const terminalPunctuationPresent = (value) => /[.!?]["')\]]?$/.test(String(value).trim());
const unexpectedCharactersAbsent = (value) => !/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(value);

export function debate22RepairMoveId(field) {
  const match = /^moveProse\.([^.]+)\.critique$/.exec(field);
  assertV4(match, `invalid repair field: ${field}`);
  return match[1];
}

export function buildDebate22RepairSchema(packet) {
  const critiqueProperties = Object.fromEntries(
    packet.corrections.map(({ moveId }) => [moveId, { type: "string", minLength: 880 }])
  );
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-production-checkpoint-v2.2-debate-22-publication-repair-${packet.packetIndex}`,
    title: `Slugfester production checkpoint v2.2 Debate 22 bounded publication repair packet ${packet.packetIndex}`,
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "packetIndex", "debateNumber", "debateId", "assessmentModel", "completedAt", "correctedCritiques"],
    properties: {
      schemaVersion: { type: "string", const: CHECKPOINT_V22_DEBATE_22_REPAIR_OUTPUT_VERSION },
      protocolId: { type: "string", const: CHECKPOINT_V22_DEBATE_22_REPAIR_PROTOCOL_ID },
      packetIndex: { type: "integer", const: packet.packetIndex },
      debateNumber: { type: "string", const: "22" },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: CHECKPOINT_V22_PUBLICATION_MODEL.label },
      completedAt: { type: "string", minLength: 10 },
      correctedCritiques: {
        type: "object",
        additionalProperties: false,
        required: Object.keys(critiqueProperties),
        properties: critiqueProperties
      }
    }
  };
}

export function validateDebate22RepairOutput(repair, packet) {
  const expectedTop = ["schemaVersion", "protocolId", "packetIndex", "debateNumber", "debateId", "assessmentModel", "completedAt", "correctedCritiques"];
  assertV4(repair && typeof repair === "object" && !Array.isArray(repair), "repair output must be an object");
  assertV4(canonicalJson(Object.keys(repair).sort()) === canonicalJson(expectedTop.sort()), "repair output fields changed");
  assertV4(
    repair.schemaVersion === CHECKPOINT_V22_DEBATE_22_REPAIR_OUTPUT_VERSION &&
      repair.protocolId === CHECKPOINT_V22_DEBATE_22_REPAIR_PROTOCOL_ID &&
      repair.packetIndex === packet.packetIndex &&
      repair.debateNumber === "22" &&
      repair.debateId === packet.debateId &&
      repair.assessmentModel === CHECKPOINT_V22_PUBLICATION_MODEL.label &&
      !Number.isNaN(Date.parse(repair.completedAt)),
    "repair output identity or provenance mismatch"
  );
  const expectedMoveIds = packet.corrections.map(({ moveId }) => moveId).sort();
  assertV4(
    repair.correctedCritiques && canonicalJson(Object.keys(repair.correctedCritiques).sort()) === canonicalJson(expectedMoveIds),
    "repair critique field set changed"
  );
  const fields = [];
  for (const correction of packet.corrections) {
    const critique = String(repair.correctedCritiques[correction.moveId] ?? "").trim();
    const words = wordCount(critique);
    const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
    assertV4(words >= 105 && words <= 130, `${correction.moveId}: repaired critique outside 105–130 words`);
    assertV4(critique.length >= 880, `${correction.moveId}: repaired critique shorter than 880 characters`);
    assertV4(sentences.length === 4, `${correction.moveId}: repaired critique must contain four sentences`);
    labels.forEach((label, index) => {
      assertV4(sentences[index].toLowerCase().startsWith(label), `${correction.moveId}: repaired critique label or order mismatch`);
      assertV4(terminalPunctuationPresent(sentences[index]), `${correction.moveId}: repaired critique sentence lacks terminal punctuation`);
    });
    assertV4(unexpectedCharactersAbsent(critique), `${correction.moveId}: repaired critique has an unexpected character`);
    assertV4(displayedLanguagePasses(critique), `${correction.moveId}: repaired critique has prohibited language`);
    fields.push({ field: `moveProse.${correction.moveId}.critique`, words, characters: critique.length, sentences: 4 });
  }
  return { status: "passed", debateNumber: "22", packetIndex: packet.packetIndex, correctedFields: fields, modelAuthoredScores: 0 };
}

function withRepairMarkers(output) {
  const copy = structuredClone(output);
  for (const field of CHECKPOINT_V22_DEBATE_22_REPAIR_FIELDS) {
    copy.moveProse[debate22RepairMoveId(field)].critique = "__AUTHORIZED_REPAIR_FIELD__";
  }
  return copy;
}

export function mergeAndValidateDebate22Repairs({ baseOutput, repairs, repairPackets, publicationPacket }) {
  assertV4(repairs.length === 7 && repairPackets.length === 7, "all seven repair packets are required for merge");
  const merged = structuredClone(baseOutput);
  const transformations = [];
  for (let index = 0; index < 7; index += 1) {
    const repair = repairs[index];
    const packet = repairPackets[index];
    validateDebate22RepairOutput(repair, packet);
    for (const correction of packet.corrections) {
      const field = `moveProse.${correction.moveId}.critique`;
      const before = merged.moveProse[correction.moveId].critique;
      const after = repair.correctedCritiques[correction.moveId];
      merged.moveProse[correction.moveId].critique = after;
      transformations.push({ field, packetIndex: index, operation: "replace-authorized-invalid-field", before, after });
    }
  }
  assertV4(
    canonicalJson(withRepairMarkers(merged)) === canonicalJson(withRepairMarkers(baseOutput)),
    "repair merge changed a field outside the thirteen-field authorization"
  );
  const fullValidation = validateCheckpointV22PublicationOutput(merged, publicationPacket);
  return { merged, transformations, fullValidation };
}
