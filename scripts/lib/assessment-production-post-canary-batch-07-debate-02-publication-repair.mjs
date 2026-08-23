import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import { POST_CANARY_BATCH_07_PUBLICATION_MODEL } from
  "./assessment-production-post-canary-batch-07-publication.mjs";
import { validatePostCanaryBatch07PublicationOutput } from
  "./assessment-production-post-canary-batch-07-publication-validation.mjs";
import { POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_3_ROOT } from
  "./assessment-production-post-canary-batch-07-publication-resumption-3.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_ROOT =
  `${POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_3_ROOT}/repair-1`;
export const POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_PROTOCOL_ID =
  "assessment-production-post-canary-batch-07-debate-02-publication-repair-1";
export const POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-07-debate-02-publication-repair-packet";
export const POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-07-debate-02-publication-repair-output";
export const POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_FIELD =
  "aiExtension.con.premises[1].novelty.explanation";

export function buildDebate02PublicationRepairSchema(packet) {
  return { $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-batch-07-debate-02-publication-repair-1",
    title: "Batch 7 Debate 02 single-field publication repair",
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "protocolId", "debateNumber", "debateId",
      "assessmentModel", "completedAt", "correctedNoveltyExplanation"],
    properties: {
      schemaVersion: { type: "string", const: POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_OUTPUT_VERSION },
      protocolId: { type: "string", const: POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_PROTOCOL_ID },
      debateNumber: { type: "string", const: "02" },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: POST_CANARY_BATCH_07_PUBLICATION_MODEL.label },
      completedAt: { type: "string", minLength: 10 },
      correctedNoveltyExplanation: { type: "string", minLength: 55 }
    } };
}

export function validateDebate02PublicationRepairOutput(output, packet) {
  const expectedKeys = ["schemaVersion", "protocolId", "debateNumber", "debateId",
    "assessmentModel", "completedAt", "correctedNoveltyExplanation"];
  assertV4(output && typeof output === "object" && !Array.isArray(output) &&
    canonicalJson(Object.keys(output).sort()) === canonicalJson(expectedKeys.sort()),
  "Debate 02 repair output fields changed");
  assertV4(output.schemaVersion === POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_OUTPUT_VERSION &&
    output.protocolId === POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_PROTOCOL_ID &&
    output.debateNumber === "02" && output.debateId === packet.debateId &&
    output.assessmentModel === POST_CANARY_BATCH_07_PUBLICATION_MODEL.label &&
    !Number.isNaN(Date.parse(output.completedAt)), "Debate 02 repair identity changed");
  const explanation = String(output.correctedNoveltyExplanation ?? "").trim();
  const words = wordCount(explanation);
  assertV4(words >= 8 && words <= 35, "Debate 02 novelty explanation outside 8–35 words");
  assertV4(explanation.length >= 55, "Debate 02 novelty explanation shorter than 55 characters");
  assertV4(/[.!?]["')\]]?$/.test(explanation), "Debate 02 novelty explanation lacks terminal punctuation");
  assertV4(!/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(explanation),
    "Debate 02 novelty explanation contains unexpected characters");
  assertV4(displayedLanguagePasses(explanation), "Debate 02 novelty explanation contains prohibited language");
  return { status: "passed", debateNumber: "02", itemId: packet.lockedItem.id,
    correctedField: POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_FIELD,
    words, characters: explanation.length, modelAuthoredScores: 0 };
}

export function mergeAndValidateDebate02PublicationRepair({ baseOutput, repairOutput, repairPacket, publicationPacket }) {
  validateDebate02PublicationRepairOutput(repairOutput, repairPacket);
  const merged = structuredClone(baseOutput);
  const before = merged.aiExtension.con.premises[1].novelty.explanation;
  merged.aiExtension.con.premises[1].novelty.explanation = repairOutput.correctedNoveltyExplanation;
  const maskedBase = structuredClone(baseOutput);
  const maskedMerged = structuredClone(merged);
  maskedBase.aiExtension.con.premises[1].novelty.explanation = "__AUTHORIZED_REPAIR_FIELD__";
  maskedMerged.aiExtension.con.premises[1].novelty.explanation = "__AUTHORIZED_REPAIR_FIELD__";
  assertV4(canonicalJson(maskedBase) === canonicalJson(maskedMerged),
    "Debate 02 repair merge changed an unauthorized field");
  const fullValidation = validatePostCanaryBatch07PublicationOutput(merged, publicationPacket);
  return { merged, transformation: { field: POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_FIELD,
    operation: "replace-authorized-invalid-field", before,
    after: repairOutput.correctedNoveltyExplanation }, fullValidation };
}
