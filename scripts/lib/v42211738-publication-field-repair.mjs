import { assertV4 } from "./v4-lean-production.mjs";
import { validateV42211736PublicationOutput } from "./v42211736-hard-route-publication-integrity.mjs";
import { normalizeV42211737PublicationOutput } from "./v42211737-hard-route-publication-normalization.mjs";

export const V42211738_ROOT = "docs/calibration/v4.2.21.17.38/publication-field-repair";
export const V42211738_PROTOCOL_ID = "v4.2.21.17.38-publication-field-repair";
export const V42211738_OUTPUT_VERSION = "4.2.21.17.38-publication-field-repair-output";
const wordCount = (value) => String(value ?? "").trim().split(/\s+/).filter(Boolean).length;
const unexpectedScript = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u;

export function validateV42211738RepairOutput(repair, packet) {
  assertV4(repair.schemaVersion === V42211738_OUTPUT_VERSION && repair.protocolId === V42211738_PROTOCOL_ID && repair.debateNumber === packet.debateNumber && repair.assessmentModel === "5.6 Sol" && !Number.isNaN(Date.parse(repair.completedAt)), "repair identity mismatch");
  if (packet.repairType === "critique-word-boundary") {
    const expected = packet.corrections.map((item) => item.moveId).sort();
    assertV4(Object.keys(repair.correctedCritiques ?? {}).sort().join("|") === expected.join("|") && !repair.correctedConQuote, "critique repair field set mismatch");
    for (const moveId of expected) {
      const critique = repair.correctedCritiques[moveId].trim();
      const words = wordCount(critique);
      const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
      assertV4(words >= 105 && words <= 130 && critique.length >= 880 && /[.!?]$/u.test(critique) && sentences.length === 4, `${moveId}: repaired critique structural mismatch`);
      ["strongest feature:", "principal limitation:", "live burden:", "locked score:"].forEach((label, index) => assertV4(sentences[index].toLowerCase().startsWith(label), `${moveId}: repaired critique label mismatch`));
      assertV4(!unexpectedScript.test(critique) && !critique.includes("�"), `${moveId}: repaired critique script artifact`);
    }
  } else {
    assertV4(packet.repairType === "representative-quote-exactness" && !repair.correctedCritiques && repair.correctedConQuote, "quote repair field set mismatch");
    const candidate = packet.eligibleSources.find((item) => item.moveId === repair.correctedConQuote.sourceMoveId);
    const words = wordCount(repair.correctedConQuote.text);
    assertV4(candidate && words >= 3 && words <= 18 && candidate.sourceExcerpt.includes(repair.correctedConQuote.text), "corrected con quote is not an eligible exact source substring");
  }
  return { status: "passed", debateNumber: packet.debateNumber, correctedFields: packet.repairType === "critique-word-boundary" ? packet.corrections.length : 1, modelAuthoredScores: 0 };
}

export function mergeV42211738Repair({ baseOutput, repair, repairPacket, publicationPacket }) {
  validateV42211738RepairOutput(repair, repairPacket);
  const merged = structuredClone(baseOutput);
  const transformations = [];
  if (repairPacket.repairType === "critique-word-boundary") {
    for (const item of repairPacket.corrections) {
      const before = merged.moveProse[item.moveId].critique;
      const after = repair.correctedCritiques[item.moveId];
      merged.moveProse[item.moveId].critique = after;
      transformations.push({ field: `moveProse.${item.moveId}.critique`, operation: "replace-invalid-field", before, after });
    }
  } else {
    const before = structuredClone(merged.representativeQuotes.con);
    merged.representativeQuotes.con = { ...merged.representativeQuotes.con, ...repair.correctedConQuote };
    transformations.push({ field: "representativeQuotes.con", operation: "replace-invalid-field", before, after: structuredClone(merged.representativeQuotes.con) });
  }
  const normalized = normalizeV42211737PublicationOutput(merged, publicationPacket);
  const validation = validateV42211736PublicationOutput(normalized.output, publicationPacket);
  return { output: normalized.output, repairTransformations: transformations, quoteNormalizations: normalized.transformations, validation };
}

