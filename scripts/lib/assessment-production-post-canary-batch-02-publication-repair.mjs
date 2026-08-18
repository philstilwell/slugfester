import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import {
  POST_CANARY_BATCH_02_PUBLICATION_MODEL,
  POST_CANARY_BATCH_02_PUBLICATION_ROOT
} from "./assessment-production-post-canary-batch-02-publication.mjs";
import { validatePostCanaryBatch02PublicationOutput } from "./assessment-production-post-canary-batch-02-publication-validation.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_02_DEBATE_103_REPAIR_ROOT =
  `${POST_CANARY_BATCH_02_PUBLICATION_ROOT}/repair-1`;
export const POST_CANARY_BATCH_02_DEBATE_103_REPAIR_PROTOCOL_ID =
  "assessment-production-post-canary-batch-02-debate-103-publication-repair-1";
export const POST_CANARY_BATCH_02_DEBATE_103_REPAIR_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-02-debate-103-publication-repair-packet";
export const POST_CANARY_BATCH_02_DEBATE_103_REPAIR_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-02-debate-103-publication-repair-output";
export const POST_CANARY_BATCH_02_DEBATE_103_REPAIR_PARTITIONS = Object.freeze([
  Object.freeze([
    "moveProse.pro-rationality-evidential-standard.critique",
    "moveProse.pro-gratuitous-evil-divine-love.critique"
  ]),
  Object.freeze([
    "moveProse.pro-salvation-confusion-divine-love.critique",
    "moveProse.con-reason-designed-cognition.critique"
  ]),
  Object.freeze([
    "moveProse.con-life-permitting-fine-tuning.critique",
    "moveProse.con-objective-morality-grounded-in-god.critique"
  ]),
  Object.freeze([
    "moveProse.pro-evolution-cognitive-reliability.critique",
    "moveProse.con-truth-directed-designed-intelligence.critique"
  ]),
  Object.freeze([
    "moveProse.con-suffering-counterevidence-not-defeater.critique",
    "moveProse.pro-creator-evidence-classical-god-gap.critique"
  ]),
  Object.freeze([
    "moveProse.pro-evolution-moral-intuitions.critique",
    "moveProse.pro-divine-command-dilemma.critique"
  ]),
  Object.freeze([
    "moveProse.con-biblical-revelation-and-human-dignity.critique",
    "moveProse.con-euthyphro-divine-nature-resolution.critique"
  ]),
  Object.freeze([
    "moveProse.pro-history-does-not-establish-miracles.critique",
    "moveProse.con-guided-evolution-and-human-purpose.critique"
  ]),
  Object.freeze([
    "moveProse.pro-natural-selection-explains-complexity.critique"
  ])
]);
export const POST_CANARY_BATCH_02_DEBATE_103_REPAIR_FIELDS = Object.freeze(
  POST_CANARY_BATCH_02_DEBATE_103_REPAIR_PARTITIONS.flat()
);
export const POST_CANARY_BATCH_02_DEBATE_103_BASE_OUTPUT =
  `${POST_CANARY_BATCH_02_PUBLICATION_ROOT}/outputs/debate-103.json`;
export const POST_CANARY_BATCH_02_DEBATE_103_PUBLICATION_PACKET =
  `${POST_CANARY_BATCH_02_PUBLICATION_ROOT}/packets/debate-103.json`;

const labels = [
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

export function debate103RepairMoveId(field) {
  const match = /^moveProse\.([^.]+)\.critique$/.exec(field);
  assertV4(match, `invalid repair field: ${field}`);
  return match[1];
}

export function buildDebate103RepairSchema(packet) {
  const critiqueProperties = Object.fromEntries(
    packet.corrections.map(({ moveId }) => [
      moveId,
      { type: "string", minLength: 880 }
    ])
  );
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id:
      `slugfester-post-canary-batch-02-debate-103-publication-repair-${packet.packetIndex}`,
    title:
      `Slugfester post-canary Batch 2 Debate 103 bounded publication repair packet ${packet.packetIndex}`,
    type: "object",
    additionalProperties: false,
    required: [
      "schemaVersion",
      "protocolId",
      "packetIndex",
      "debateNumber",
      "debateId",
      "assessmentModel",
      "completedAt",
      "correctedCritiques"
    ],
    properties: {
      schemaVersion: {
        type: "string",
        const: POST_CANARY_BATCH_02_DEBATE_103_REPAIR_OUTPUT_VERSION
      },
      protocolId: {
        type: "string",
        const: POST_CANARY_BATCH_02_DEBATE_103_REPAIR_PROTOCOL_ID
      },
      packetIndex: { type: "integer", const: packet.packetIndex },
      debateNumber: { type: "string", const: "103" },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: {
        type: "string",
        const: POST_CANARY_BATCH_02_PUBLICATION_MODEL.label
      },
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

export function validateDebate103RepairOutput(repair, packet) {
  const expectedTop = [
    "schemaVersion",
    "protocolId",
    "packetIndex",
    "debateNumber",
    "debateId",
    "assessmentModel",
    "completedAt",
    "correctedCritiques"
  ];
  assertV4(
    repair && typeof repair === "object" && !Array.isArray(repair),
    "repair output must be an object"
  );
  assertV4(
    canonicalJson(Object.keys(repair).sort()) === canonicalJson(expectedTop.sort()),
    "repair output fields changed"
  );
  assertV4(
    repair.schemaVersion ===
      POST_CANARY_BATCH_02_DEBATE_103_REPAIR_OUTPUT_VERSION &&
      repair.protocolId === POST_CANARY_BATCH_02_DEBATE_103_REPAIR_PROTOCOL_ID &&
      repair.packetIndex === packet.packetIndex &&
      repair.debateNumber === "103" &&
      repair.debateId === packet.debateId &&
      repair.assessmentModel === POST_CANARY_BATCH_02_PUBLICATION_MODEL.label &&
      !Number.isNaN(Date.parse(repair.completedAt)),
    "repair output identity or provenance mismatch"
  );
  const expectedMoveIds = packet.corrections
    .map(({ moveId }) => moveId)
    .sort();
  assertV4(
    repair.correctedCritiques &&
      canonicalJson(Object.keys(repair.correctedCritiques).sort()) ===
        canonicalJson(expectedMoveIds),
    "repair critique field set changed"
  );
  const correctedFields = [];
  for (const correction of packet.corrections) {
    const critique = String(
      repair.correctedCritiques[correction.moveId] ?? ""
    ).trim();
    const words = wordCount(critique);
    const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
    assertV4(
      words >= 105 && words <= 130,
      `${correction.moveId}: repaired critique outside 105–130 words`
    );
    assertV4(
      critique.length >= 880,
      `${correction.moveId}: repaired critique shorter than 880 characters`
    );
    assertV4(
      sentences.length === 4,
      `${correction.moveId}: repaired critique must contain four sentences`
    );
    labels.forEach((label, index) => {
      assertV4(
        sentences[index].toLowerCase().startsWith(label),
        `${correction.moveId}: repaired critique label or order mismatch`
      );
      assertV4(
        terminalPunctuationPresent(sentences[index]),
        `${correction.moveId}: repaired critique sentence lacks terminal punctuation`
      );
    });
    assertV4(
      unexpectedCharactersAbsent(critique),
      `${correction.moveId}: repaired critique has an unexpected character`
    );
    assertV4(
      displayedLanguagePasses(critique),
      `${correction.moveId}: repaired critique has prohibited language`
    );
    correctedFields.push({
      field: `moveProse.${correction.moveId}.critique`,
      words,
      characters: critique.length,
      sentences: 4
    });
  }
  return {
    status: "passed",
    debateNumber: "103",
    packetIndex: packet.packetIndex,
    correctedFields,
    modelAuthoredScores: 0
  };
}

function withRepairMarkers(output) {
  const copy = structuredClone(output);
  for (const field of POST_CANARY_BATCH_02_DEBATE_103_REPAIR_FIELDS) {
    copy.moveProse[debate103RepairMoveId(field)].critique =
      "__AUTHORIZED_REPAIR_FIELD__";
  }
  return copy;
}

export function mergeAndValidateDebate103Repairs({
  baseOutput,
  repairs,
  repairPackets,
  publicationPacket
}) {
  assertV4(
    repairs.length === 9 && repairPackets.length === 9,
    "all nine Debate 103 repair packets are required for merge"
  );
  const merged = structuredClone(baseOutput);
  const transformations = [];
  for (let index = 0; index < 9; index += 1) {
    const repair = repairs[index];
    const packet = repairPackets[index];
    validateDebate103RepairOutput(repair, packet);
    for (const correction of packet.corrections) {
      const field = `moveProse.${correction.moveId}.critique`;
      const before = merged.moveProse[correction.moveId].critique;
      const after = repair.correctedCritiques[correction.moveId];
      merged.moveProse[correction.moveId].critique = after;
      transformations.push({
        field,
        packetIndex: index,
        operation: "replace-authorized-invalid-field",
        before,
        after
      });
    }
  }
  assertV4(
    canonicalJson(withRepairMarkers(merged)) ===
      canonicalJson(withRepairMarkers(baseOutput)),
    "repair merge changed a field outside the seventeen-field authorization"
  );
  const fullValidation = validatePostCanaryBatch02PublicationOutput(
    merged,
    publicationPacket
  );
  return { merged, transformations, fullValidation };
}
