import { getReferenceDefinition } from "../../src/data/references.js";
import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import {
  buildPostCanaryBatch05PublicationSchema,
  POST_CANARY_BATCH_05_PUBLICATION_BYLINE,
  POST_CANARY_BATCH_05_PUBLICATION_DISCLOSURE,
  POST_CANARY_BATCH_05_PUBLICATION_MODEL,
  POST_CANARY_BATCH_05_PUBLICATION_OUTPUT_VERSION,
  POST_CANARY_BATCH_05_PUBLICATION_PROTOCOL_ID,
  POST_CANARY_BATCH_05_PUBLICATION_ROOT
} from "./assessment-production-post-canary-batch-05-publication.mjs";
import { validatePostCanaryBatch05PublicationOutput } from
  "./assessment-production-post-canary-batch-05-publication-validation.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_ROOT =
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/recovery-1`;
export const POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_PROTOCOL_ID =
  "assessment-production-post-canary-batch-05-publication-resumption-1-recovery-1";
export const POST_CANARY_BATCH_05_DEBATE_189_REPAIR_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-05-debate-189-publication-repair-packet";
export const POST_CANARY_BATCH_05_DEBATE_189_REPAIR_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-05-debate-189-publication-repair-output";
export const POST_CANARY_BATCH_05_DEBATE_109_SHARD_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-05-debate-109-publication-resumption-shard-packet";
export const POST_CANARY_BATCH_05_DEBATE_109_SHARD_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-05-debate-109-publication-resumption-shard-output";

const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const terminalPunctuationPresent = (value) =>
  /[.!?]["')\]]?$/.test(String(value).trim());
const unexpectedCharactersAbsent = (value) =>
  !/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(
    typeof value === "string" ? value : JSON.stringify(value)
  );

function exactKeys(value, expected, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value),
    `${label}: expected object`);
  assertV4(canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort()),
    `${label}: fields changed`);
}

function validateTag(tag, label) {
  exactKeys(tag, ["label", "type", "slug", "context"], label);
  const reference = getReferenceDefinition(tag.type, tag.slug);
  assertV4(reference && reference.label === tag.label, `${label}: unknown or mislabeled reference`);
  const count = wordCount(tag.context);
  assertV4(count >= 8 && count <= 35, `${label}: tag context outside 8–35 words`);
}

function validateCritique(critique, field) {
  const value = String(critique).trim();
  const words = wordCount(value);
  const sentences = value.split(/(?<=[.!?])\s+/).filter(Boolean);
  assertV4(words >= 105 && words <= 130, `${field}: critique outside 105–130 words`);
  assertV4(value.length >= 880, `${field}: critique shorter than 880 characters`);
  assertV4(sentences.length === 4, `${field}: critique must contain four sentences`);
  labels.forEach((label, index) => {
    assertV4(sentences[index].toLowerCase().startsWith(label),
      `${field}: critique label or order mismatch`);
    assertV4(terminalPunctuationPresent(sentences[index]),
      `${field}: critique sentence lacks terminal punctuation`);
  });
  assertV4(unexpectedCharactersAbsent(value), `${field}: critique has an unexpected character`);
  assertV4(displayedLanguagePasses(value), `${field}: critique has prohibited language`);
  return { words, characters: value.length, sentences: 4 };
}

export function buildDebate189RepairSchema(packet) {
  const properties = Object.fromEntries(packet.corrections.map(({ moveId }) => [
    moveId, { type: "string", minLength: 880 }
  ]));
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-batch-05-debate-189-publication-repair-${packet.packetIndex}`,
    title: `Batch 5 Debate 189 bounded publication repair ${packet.packetIndex}`,
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "protocolId", "packetIndex", "debateNumber", "debateId",
      "assessmentModel", "completedAt", "correctedCritiques"],
    properties: {
      schemaVersion: { type: "string", const: POST_CANARY_BATCH_05_DEBATE_189_REPAIR_OUTPUT_VERSION },
      protocolId: { type: "string", const: POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_PROTOCOL_ID },
      packetIndex: { type: "integer", const: packet.packetIndex },
      debateNumber: { type: "string", const: "189" },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: POST_CANARY_BATCH_05_PUBLICATION_MODEL.label },
      completedAt: { type: "string", minLength: 10 },
      correctedCritiques: {
        type: "object", additionalProperties: false,
        required: Object.keys(properties), properties
      }
    }
  };
}

export function validateDebate189RepairOutput(output, packet) {
  exactKeys(output, ["schemaVersion", "protocolId", "packetIndex", "debateNumber",
    "debateId", "assessmentModel", "completedAt", "correctedCritiques"], "repair output");
  assertV4(output.schemaVersion === POST_CANARY_BATCH_05_DEBATE_189_REPAIR_OUTPUT_VERSION &&
    output.protocolId === POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_PROTOCOL_ID &&
    output.packetIndex === packet.packetIndex && output.debateNumber === "189" &&
    output.debateId === packet.debateId &&
    output.assessmentModel === POST_CANARY_BATCH_05_PUBLICATION_MODEL.label &&
    !Number.isNaN(Date.parse(output.completedAt)),
  "repair output identity or provenance mismatch");
  const moveIds = packet.corrections.map(({ moveId }) => moveId);
  exactKeys(output.correctedCritiques, moveIds, "correctedCritiques");
  return {
    status: "passed", debateNumber: "189", packetIndex: packet.packetIndex,
    correctedFields: packet.corrections.map(({ field, moveId }) => ({
      field, moveId, ...validateCritique(output.correctedCritiques[moveId], field)
    })),
    modelAuthoredScores: 0
  };
}

export function buildDebate109ShardSchema(packet) {
  const original = buildPostCanaryBatch05PublicationSchema(packet.publicationPacket);
  const side = packet.side;
  const contentProperties = {
    ...(packet.includesSummary ? { summary: structuredClone(original.properties.summary) } : {}),
    representativeQuote: structuredClone(original.properties.representativeQuotes.properties[side]),
    moveProse: {
      type: "object", additionalProperties: false, required: packet.moveIds,
      properties: Object.fromEntries(packet.moveIds.map((moveId) => [
        moveId, structuredClone(original.properties.moveProse.properties[moveId])
      ]))
    },
    overallCommentary: structuredClone(original.properties.overallCommentary.properties[side]),
    aiExtension: structuredClone(original.properties.aiExtension.properties[side])
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-batch-05-debate-109-publication-resumption-${packet.shardId}`,
    title: `Batch 5 Debate 109 publication resumption ${packet.shardId}`,
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "protocolId", "contextIndex", "shardId", "side",
      "debateNumber", "debateId", "assessmentModel", "completedAt", "content"],
    properties: {
      schemaVersion: { type: "string", const: POST_CANARY_BATCH_05_DEBATE_109_SHARD_OUTPUT_VERSION },
      protocolId: { type: "string", const: POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_PROTOCOL_ID },
      contextIndex: { type: "integer", const: packet.contextIndex },
      shardId: { type: "string", const: packet.shardId },
      side: { type: "string", const: side },
      debateNumber: { type: "string", const: "109" },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: POST_CANARY_BATCH_05_PUBLICATION_MODEL.label },
      completedAt: { type: "string", minLength: 10 },
      content: {
        type: "object", additionalProperties: false,
        required: Object.keys(contentProperties), properties: contentProperties
      }
    }
  };
}

function validateMoveProse(prose, move, label) {
  exactKeys(prose, ["role", "words", "critique", "tags"], label);
  assertV4([
    "Load-bearing constructive", "Supporting constructive", "Major direct reply",
    "Supporting reply", "Diagnostic challenge", "Concession or qualification"
  ].includes(prose.role), `${label}: invalid role`);
  const summaryWords = wordCount(prose.words);
  assertV4(summaryWords >= 8 && summaryWords <= 55, `${label}: summary outside 8–55 words`);
  const critique = validateCritique(prose.critique, `${label}.critique`);
  assertV4(Array.isArray(prose.tags) && prose.tags.length <= 2, `${label}: too many tags`);
  prose.tags.forEach((tag, index) => validateTag(tag, `${label}.tags[${index}]`));
  assertV4(move, `${label}: locked move missing`);
  return { summaryWords, critique, tags: prose.tags.length };
}

function validateOverall(overall, side) {
  exactKeys(overall, ["strengths", "blunders"], `${side}.overallCommentary`);
  assertV4(overall.strengths.length >= 3 && overall.strengths.length <= 6 &&
    overall.blunders.length >= 1 && overall.blunders.length <= 4,
  `${side}: Overall Commentary counts invalid`);
  overall.strengths.forEach((item, index) =>
    assertV4(wordCount(item) >= 6, `${side}.strengths[${index}]: too short`));
  overall.blunders.forEach((item, index) => {
    exactKeys(item, ["text", "tags"], `${side}.blunders[${index}]`);
    assertV4(wordCount(item.text) >= 8, `${side}.blunders[${index}]: too short`);
    assertV4(Array.isArray(item.tags) && item.tags.length <= 2,
      `${side}.blunders[${index}]: too many tags`);
    item.tags.forEach((tag, tagIndex) =>
      validateTag(tag, `${side}.blunders[${index}].tags[${tagIndex}]`));
  });
}

function validateExtension(extension, side, moveById) {
  exactKeys(extension, ["thesis", "premises", "conclusion", "newArguments"],
    `${side}.aiExtension`);
  assertV4(extension.premises.length >= 4 && extension.premises.length <= 6 &&
    extension.newArguments.length >= 2 && extension.newArguments.length <= 4,
  `${side}: AI Extension counts invalid`);
  const items = [extension.thesis, ...extension.premises,
    extension.conclusion, ...extension.newArguments];
  const ids = new Set();
  for (const item of items) {
    assertV4(!ids.has(item.id), `${side}: duplicate AI Extension item ${item.id}`);
    ids.add(item.id);
    exactKeys(item.novelty, ["classification", "sourceMoveIds", "explanation"],
      `${item.id}.novelty`);
    assertV4(["extends", "repairs", "introduces"].includes(item.novelty.classification),
      `${item.id}: novelty class invalid`);
    assertV4(new Set(item.novelty.sourceMoveIds).size === item.novelty.sourceMoveIds.length &&
      item.novelty.sourceMoveIds.every((moveId) => moveById.has(moveId)),
    `${item.id}: novelty move mapping invalid`);
    assertV4(wordCount(item.novelty.explanation) >= 8,
      `${item.id}: novelty explanation too short`);
    if (item.novelty.classification === "introduces") {
      assertV4(item.novelty.sourceMoveIds.length === 0,
        `${item.id}: introduced item has source moves`);
    } else {
      assertV4(item.novelty.sourceMoveIds.length >= 1,
        `${item.id}: extended or repaired item lacks source move`);
    }
  }
  assertV4(wordCount(extension.thesis.text) >= 12, `${side}: thesis too short`);
  extension.premises.forEach((item, index) =>
    assertV4(wordCount(item.text) >= 12, `${side}: premise ${index} too short`));
  assertV4(wordCount(extension.conclusion.text) >= 15, `${side}: conclusion too short`);
  for (const item of extension.newArguments) {
    exactKeys(item, ["id", "title", "text", "novelty"], `${item.id}.newArgument`);
    const count = wordCount(item.text);
    assertV4(count >= 45 && count <= 130, `${item.id}: new argument outside 45–130 words`);
  }
  assertV4(extension.newArguments.some(({ novelty }) => novelty.classification === "introduces"),
    `${side}: at least one genuinely introduced new argument required`);
  return { items: items.length, newArguments: extension.newArguments.length };
}

export function validateDebate109ShardOutput(output, packet) {
  exactKeys(output, ["schemaVersion", "protocolId", "contextIndex", "shardId", "side",
    "debateNumber", "debateId", "assessmentModel", "completedAt", "content"],
  "shard output");
  assertV4(output.schemaVersion === POST_CANARY_BATCH_05_DEBATE_109_SHARD_OUTPUT_VERSION &&
    output.protocolId === POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_PROTOCOL_ID &&
    output.contextIndex === packet.contextIndex && output.shardId === packet.shardId &&
    output.side === packet.side && output.debateNumber === "109" &&
    output.debateId === packet.debateId &&
    output.assessmentModel === POST_CANARY_BATCH_05_PUBLICATION_MODEL.label &&
    !Number.isNaN(Date.parse(output.completedAt)),
  "shard output identity or provenance mismatch");
  const expectedContent = [
    ...(packet.includesSummary ? ["summary"] : []),
    "representativeQuote", "moveProse", "overallCommentary", "aiExtension"
  ];
  exactKeys(output.content, expectedContent, `${packet.shardId}.content`);
  if (packet.includesSummary) {
    const count = wordCount(output.content.summary);
    assertV4(count >= 8 && count <= 35, "publication summary outside 8–35 words");
  }
  const moveById = new Map(packet.publicationPacket.moves.map((move) => [move.moveId, move]));
  const quote = output.content.representativeQuote;
  exactKeys(quote, ["sourceMoveId", "text", "context"], `${packet.side} representative quote`);
  const quoteMove = moveById.get(quote.sourceMoveId);
  assertV4(quoteMove && quoteMove.side === packet.side && quoteMove.quoteEligible,
    `${packet.side}: quote source is not eligible`);
  assertV4(quoteMove.sourceExcerpt.includes(quote.text),
    `${packet.side}: quote is not an exact source substring`);
  assertV4(wordCount(quote.text) >= 3 && wordCount(quote.text) <= 18,
    `${packet.side}: quote outside 3–18 words`);
  assertV4(wordCount(quote.context) >= 12 && wordCount(quote.context) <= 55,
    `${packet.side}: quote context outside 12–55 words`);
  exactKeys(output.content.moveProse, packet.moveIds, `${packet.shardId}.moveProse`);
  let tags = 0;
  let minimumCritiqueCharacters = Infinity;
  for (const moveId of packet.moveIds) {
    const row = validateMoveProse(output.content.moveProse[moveId], moveById.get(moveId), moveId);
    tags += row.tags;
    minimumCritiqueCharacters = Math.min(minimumCritiqueCharacters, row.critique.characters);
  }
  validateOverall(output.content.overallCommentary, packet.side);
  const extension = validateExtension(output.content.aiExtension, packet.side, moveById);
  assertV4(unexpectedCharactersAbsent(output) && displayedLanguagePasses(output),
    `${packet.shardId}: prohibited or unexpected displayed language`);
  return {
    status: "passed", debateNumber: "109", contextIndex: packet.contextIndex,
    shardId: packet.shardId, side: packet.side,
    contentFields: packet.writableFields.length,
    moves: packet.moveIds.length, critiques: packet.moveIds.length,
    minimumCritiqueCharacters, tags, exactSourceQuotes: 1,
    overallCommentarySides: 1, aiExtensionSides: 1,
    noveltyItems: extension.items, newArguments: extension.newArguments,
    modelAuthoredScores: 0
  };
}

function withDebate189Markers(output, fields) {
  const copy = structuredClone(output);
  for (const field of fields) {
    const match = /^moveProse\.([^.]+)\.critique$/.exec(field);
    assertV4(match, `invalid Debate 189 repair field ${field}`);
    copy.moveProse[match[1]].critique = "__AUTHORIZED_REPAIR_FIELD__";
  }
  return copy;
}

export function mergeAndValidateRecovery({
  base189, repairOutputs189, repairPackets189,
  shardOutputs109, shardPackets109, publicationPacket189, publicationPacket109
}) {
  assertV4(repairOutputs189.length === 4 && repairPackets189.length === 4,
    "four Debate 189 repair packets required");
  assertV4(shardOutputs109.length === 2 && shardPackets109.length === 2,
    "two Debate 109 shard outputs required");
  const merged189 = structuredClone(base189);
  const transformations189 = [];
  const authorizedFields189 = repairPackets189.flatMap(({ corrections }) =>
    corrections.map(({ field }) => field));
  for (let index = 0; index < 4; index += 1) {
    const output = repairOutputs189[index];
    const packet = repairPackets189[index];
    validateDebate189RepairOutput(output, packet);
    for (const correction of packet.corrections) {
      const before = merged189.moveProse[correction.moveId].critique;
      const after = output.correctedCritiques[correction.moveId];
      merged189.moveProse[correction.moveId].critique = after;
      transformations189.push({ field: correction.field, packetIndex: index,
        operation: "replace-authorized-invalid-field", before, after });
    }
  }
  assertV4(new Set(authorizedFields189).size === 8 && transformations189.length === 8,
    "Debate 189 repair field coverage changed");
  assertV4(canonicalJson(withDebate189Markers(merged189, authorizedFields189)) ===
    canonicalJson(withDebate189Markers(base189, authorizedFields189)),
  "Debate 189 repair changed an unauthorized field");
  const validation189 = validatePostCanaryBatch05PublicationOutput(merged189, publicationPacket189);

  const bySide = new Map();
  const acceptedContentFields = [];
  for (let index = 0; index < 2; index += 1) {
    const output = shardOutputs109[index];
    const packet = shardPackets109[index];
    validateDebate109ShardOutput(output, packet);
    assertV4(!bySide.has(packet.side), `duplicate Debate 109 ${packet.side} shard`);
    bySide.set(packet.side, output);
    acceptedContentFields.push(...packet.writableFields);
  }
  const requiredFields109 = [
    "summary", "representativeQuotes.pro", "representativeQuotes.con",
    ...publicationPacket109.moves.map(({ moveId }) => `moveProse.${moveId}`),
    "overallCommentary.pro", "overallCommentary.con",
    "aiExtension.pro", "aiExtension.con"
  ];
  assertV4(acceptedContentFields.length === 26 &&
    new Set(acceptedContentFields).size === 26 &&
    canonicalJson([...acceptedContentFields].sort()) === canonicalJson([...requiredFields109].sort()),
  "Debate 109 shards do not decide every content field exactly once");
  const pro = bySide.get("pro");
  const con = bySide.get("con");
  assertV4(pro && con, "both Debate 109 side shards required");
  const mergedMoveProse = Object.fromEntries(publicationPacket109.moves.map(({ moveId, side }) => [
    moveId, bySide.get(side).content.moveProse[moveId]
  ]));
  const merged109 = {
    schemaVersion: POST_CANARY_BATCH_05_PUBLICATION_OUTPUT_VERSION,
    protocolId: POST_CANARY_BATCH_05_PUBLICATION_PROTOCOL_ID,
    debateNumber: "109",
    debateId: publicationPacket109.debateId,
    assessmentModel: POST_CANARY_BATCH_05_PUBLICATION_MODEL.label,
    completedAt: new Date(Math.max(Date.parse(pro.completedAt), Date.parse(con.completedAt))).toISOString(),
    productionCanary: false,
    stagingOnly: true,
    summary: pro.content.summary,
    representativeQuotes: {
      pro: pro.content.representativeQuote,
      con: con.content.representativeQuote
    },
    moveProse: mergedMoveProse,
    overallCommentary: {
      pro: pro.content.overallCommentary,
      con: con.content.overallCommentary
    },
    aiExtension: {
      aiGenerated: true,
      disclaimer: POST_CANARY_BATCH_05_PUBLICATION_DISCLOSURE,
      pro: pro.content.aiExtension,
      con: con.content.aiExtension
    },
    displayContract: {
      sectionTitle: "AI Extension",
      placement: "immediately-after-overall-commentary",
      defaultCollapsed: true,
      visualVariant: "ai-distinct",
      byline: POST_CANARY_BATCH_05_PUBLICATION_BYLINE,
      prohibitedLanguageScanPassed: true
    },
    audit: {
      lockedScoresUnchanged: true,
      everyMoveAuthoredOnce: true,
      legacyAssessmentUnavailable: true,
      otherDebatesUnavailable: true,
      aiMaterialExcludedFromScores: true,
      sourceOnlyQuoteSelection: true
    }
  };
  const validation109 = validatePostCanaryBatch05PublicationOutput(merged109, publicationPacket109);
  return {
    merged189, transformations189, validation189,
    merged109, acceptedContentFields109: acceptedContentFields,
    validation109
  };
}
