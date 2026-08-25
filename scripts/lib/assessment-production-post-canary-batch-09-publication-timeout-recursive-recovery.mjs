import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import { POST_CANARY_BATCH_09_PUBLICATION_MODEL } from "./assessment-production-post-canary-batch-09-publication.mjs";
import { POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_RECOVERY_ROOT as PARENT_ROOT, validatePublicationTimeoutRecoveryShardOutput } from "./assessment-production-post-canary-batch-09-publication-resumption-timeout-recovery.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_RECURSIVE_RECOVERY_ROOT = `${PARENT_ROOT}/correction-1`;
export const POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_RECURSIVE_RECOVERY_PROTOCOL_ID = "assessment-production-post-canary-batch-09-publication-resumption-timeout-recovery-correction-1";
export const POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_REPAIR_PACKET_VERSION = "1.0-assessment-production-post-canary-batch-09-publication-timeout-recursive-repair-packet";
export const POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_REPAIR_OUTPUT_VERSION = "1.0-assessment-production-post-canary-batch-09-publication-timeout-recursive-repair-output";
export const POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_REPAIR_PARTITIONS = Object.freeze([
  Object.freeze({ debateNumber: "166", baseContextIndex: 1, fields: Object.freeze(["moveProse.con-morality-c010-evolutionary-social-origin.critique", "moveProse.con-method-c10-evidence-over-faith.critique"]) }),
  Object.freeze({ debateNumber: "183", baseContextIndex: 2, fields: Object.freeze(["moveProse.pro-deliberative-indispensability.critique", "moveProse.pro-centrality-weighted-theory-cost.critique"]) }),
  Object.freeze({ debateNumber: "183", baseContextIndex: 2, fields: Object.freeze(["moveProse.pro-explanatory-not-contradictory-cost.critique"]) })
]);
const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const terminalPunctuationPresent = (value) => /[.!?]["')\]]?$/.test(String(value).trim());
const unexpectedCharactersAbsent = (value) => !/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(value);

export function repairMoveId(field) {
  const match = /^moveProse\.([^.]+)\.critique$/.exec(field);
  assertV4(match, `invalid repair field: ${field}`);
  return match[1];
}

export function buildPublicationTimeoutRecursiveRepairSchema(packet) {
  const properties = Object.fromEntries(packet.corrections.map(({ moveId }) => [moveId, { type: "string", minLength: 880 }]));
  return { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `slugfester-batch-09-publication-timeout-recursive-repair-${packet.packetIndex}`, title: `Batch 9 publication timeout recursive repair ${packet.packetIndex}`, type: "object", additionalProperties: false, required: ["schemaVersion", "protocolId", "packetIndex", "debateNumber", "debateId", "assessmentModel", "completedAt", "correctedCritiques"], properties: { schemaVersion: { type: "string", const: POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_REPAIR_OUTPUT_VERSION }, protocolId: { type: "string", const: POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_RECURSIVE_RECOVERY_PROTOCOL_ID }, packetIndex: { type: "integer", const: packet.packetIndex }, debateNumber: { type: "string", const: packet.debateNumber }, debateId: { type: "string", const: packet.debateId }, assessmentModel: { type: "string", const: POST_CANARY_BATCH_09_PUBLICATION_MODEL.label }, completedAt: { type: "string", minLength: 10 }, correctedCritiques: { type: "object", additionalProperties: false, required: Object.keys(properties), properties } } };
}

export function validatePublicationTimeoutRecursiveRepairOutput(output, packet) {
  const expectedTop = ["schemaVersion", "protocolId", "packetIndex", "debateNumber", "debateId", "assessmentModel", "completedAt", "correctedCritiques"];
  assertV4(output && typeof output === "object" && !Array.isArray(output) && canonicalJson(Object.keys(output).sort()) === canonicalJson(expectedTop.sort()), "repair output fields changed");
  assertV4(output.schemaVersion === POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_REPAIR_OUTPUT_VERSION && output.protocolId === POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_RECURSIVE_RECOVERY_PROTOCOL_ID && output.packetIndex === packet.packetIndex && output.debateNumber === packet.debateNumber && output.debateId === packet.debateId && output.assessmentModel === POST_CANARY_BATCH_09_PUBLICATION_MODEL.label && !Number.isNaN(Date.parse(output.completedAt)), "repair output identity or provenance mismatch");
  const expectedMoveIds = packet.corrections.map(({ moveId }) => moveId).sort();
  assertV4(output.correctedCritiques && canonicalJson(Object.keys(output.correctedCritiques).sort()) === canonicalJson(expectedMoveIds), "repair critique field set changed");
  const correctedFields = [];
  for (const correction of packet.corrections) {
    const critique = String(output.correctedCritiques[correction.moveId] ?? "").trim();
    const words = wordCount(critique); const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
    assertV4(words >= 105 && words <= 130, `${correction.moveId}: repaired critique outside 105–130 words`);
    assertV4(critique.length >= 880, `${correction.moveId}: repaired critique shorter than 880 characters`);
    assertV4(sentences.length === 4, `${correction.moveId}: repaired critique must contain four sentences`);
    labels.forEach((label, index) => { assertV4(sentences[index].toLowerCase().startsWith(label), `${correction.moveId}: repaired critique label or order mismatch`); assertV4(terminalPunctuationPresent(sentences[index]), `${correction.moveId}: repaired critique lacks terminal punctuation`); });
    assertV4(unexpectedCharactersAbsent(critique) && displayedLanguagePasses(critique), `${correction.moveId}: prohibited or unexpected displayed language`);
    correctedFields.push({ field: `moveProse.${correction.moveId}.critique`, words, characters: critique.length, sentences: 4 });
  }
  return { status: "passed", packetIndex: packet.packetIndex, debateNumber: packet.debateNumber, correctedFields, modelAuthoredScores: 0 };
}

function marked(output, fields) {
  const copy = structuredClone(output);
  for (const field of fields) copy.content.moveProse[repairMoveId(field)].critique = "__AUTHORIZED_REPAIR_FIELD__";
  return copy;
}

export function applyAndValidatePublicationTimeoutRecursiveRepairs({ baseOutputsByContext, repairOutputs, repairPackets, shardPacketsByContext }) {
  assertV4(repairOutputs.length === 3 && repairPackets.length === 3, "exactly three repair outputs and packets required");
  const correctedByContext = new Map([...baseOutputsByContext.entries()].map(([key, value]) => [key, structuredClone(value)]));
  const transformations = [];
  for (let index = 0; index < 3; index += 1) {
    const repair = repairOutputs[index]; const packet = repairPackets[index];
    validatePublicationTimeoutRecursiveRepairOutput(repair, packet);
    const corrected = correctedByContext.get(packet.baseContextIndex);
    assertV4(corrected && corrected.debateNumber === packet.debateNumber, `packet ${index}: immutable base mismatch`);
    for (const correction of packet.corrections) {
      const before = corrected.content.moveProse[correction.moveId].critique; const after = repair.correctedCritiques[correction.moveId];
      corrected.content.moveProse[correction.moveId].critique = after;
      transformations.push({ packetIndex: index, debateNumber: packet.debateNumber, baseContextIndex: packet.baseContextIndex, field: correction.field, operation: "replace-authorized-invalid-critique", before, after });
    }
  }
  for (const [contextIndex, base] of baseOutputsByContext) {
    const fields = POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_REPAIR_PARTITIONS.filter((row) => row.baseContextIndex === contextIndex).flatMap((row) => row.fields);
    const corrected = correctedByContext.get(contextIndex);
    assertV4(canonicalJson(marked(corrected, fields)) === canonicalJson(marked(base, fields)), `context ${contextIndex}: field outside five-field authorization changed`);
    validatePublicationTimeoutRecoveryShardOutput(corrected, shardPacketsByContext.get(contextIndex));
  }
  return { correctedByContext, transformations };
}
