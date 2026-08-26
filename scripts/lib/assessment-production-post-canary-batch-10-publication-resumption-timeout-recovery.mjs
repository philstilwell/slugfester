import { getReferenceDefinition } from "../../src/data/references.js";
import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import {
  buildPostCanaryBatch10PublicationSchema,
  POST_CANARY_BATCH_10_PUBLICATION_BYLINE,
  POST_CANARY_BATCH_10_PUBLICATION_DISCLOSURE,
  POST_CANARY_BATCH_10_PUBLICATION_MODEL,
  POST_CANARY_BATCH_10_PUBLICATION_OUTPUT_VERSION,
  POST_CANARY_BATCH_10_PUBLICATION_PROTOCOL_ID,
  POST_CANARY_BATCH_10_PUBLICATION_ROOT
} from "./assessment-production-post-canary-batch-10-publication.mjs";
import { validatePostCanaryBatch10PublicationOutput } from
  "./assessment-production-post-canary-batch-10-publication-validation.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_10_PUBLICATION_TIMEOUT_RECOVERY_ROOT =
  `${POST_CANARY_BATCH_10_PUBLICATION_ROOT}/failure-recovery/debate-21-timeout-recovery-1`;
export const POST_CANARY_BATCH_10_PUBLICATION_TIMEOUT_RECOVERY_PROTOCOL_ID =
  "assessment-production-post-canary-batch-10-publication-debate-21-timeout-recovery-1";
export const POST_CANARY_BATCH_10_PUBLICATION_TIMEOUT_RECOVERY_DEBATES =
  Object.freeze(["21"]);
export const POST_CANARY_BATCH_10_PUBLICATION_TIMEOUT_SHARD_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-10-publication-timeout-recovery-shard-packet";
export const POST_CANARY_BATCH_10_PUBLICATION_TIMEOUT_SHARD_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-10-publication-timeout-recovery-shard-output";

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
    typeof value === "string" ? value : JSON.stringify(value)
  );

function exactKeys(value, expected, label) {
  assertV4(
    value && typeof value === "object" && !Array.isArray(value),
    `${label}: expected object`
  );
  assertV4(
    canonicalJson(Object.keys(value).sort()) ===
      canonicalJson([...expected].sort()),
    `${label}: fields changed`
  );
}

function validateTag(tag, label) {
  exactKeys(tag, ["label", "type", "slug", "context"], label);
  const reference = getReferenceDefinition(tag.type, tag.slug);
  assertV4(
    reference && reference.label === tag.label,
    `${label}: unknown or mislabeled reference`
  );
  const count = wordCount(tag.context);
  assertV4(count >= 8 && count <= 35, `${label}: context outside 8–35 words`);
}

function validateCritique(critique, field) {
  const value = String(critique).trim();
  const words = wordCount(value);
  const sentences = value.split(/(?<=[.!?])\s+/).filter(Boolean);
  assertV4(words >= 105 && words <= 130, `${field}: outside 105–130 words`);
  assertV4(value.length >= 880, `${field}: shorter than 880 characters`);
  assertV4(sentences.length === 4, `${field}: must contain four sentences`);
  labels.forEach((label, index) => {
    assertV4(
      sentences[index].toLowerCase().startsWith(label),
      `${field}: label or order mismatch`
    );
    assertV4(
      terminalPunctuationPresent(sentences[index]),
      `${field}: sentence lacks terminal punctuation`
    );
  });
  assertV4(unexpectedCharactersAbsent(value), `${field}: unexpected character`);
  assertV4(displayedLanguagePasses(value), `${field}: prohibited language`);
  return { words, characters: value.length, sentences: 4 };
}

function validateMoveProse(prose, move, label) {
  exactKeys(prose, ["role", "words", "critique", "tags"], label);
  assertV4(
    [
      "Load-bearing constructive",
      "Supporting constructive",
      "Major direct reply",
      "Supporting reply",
      "Diagnostic challenge",
      "Concession or qualification"
    ].includes(prose.role),
    `${label}: invalid role`
  );
  const summaryWords = wordCount(prose.words);
  assertV4(
    summaryWords >= 8 && summaryWords <= 55,
    `${label}: summary outside 8–55 words`
  );
  const critique = validateCritique(prose.critique, `${label}.critique`);
  assertV4(
    Array.isArray(prose.tags) && prose.tags.length <= 2,
    `${label}: too many tags`
  );
  prose.tags.forEach((tag, index) => validateTag(tag, `${label}.tags[${index}]`));
  assertV4(move, `${label}: locked move missing`);
  return { summaryWords, critique, tags: prose.tags.length };
}

function validateOverall(overall, side) {
  exactKeys(overall, ["strengths", "blunders"], `${side}.overallCommentary`);
  assertV4(
    overall.strengths.length >= 3 &&
      overall.strengths.length <= 6 &&
      overall.blunders.length >= 1 &&
      overall.blunders.length <= 4,
    `${side}: Overall Commentary counts invalid`
  );
  overall.strengths.forEach((item, index) =>
    assertV4(wordCount(item) >= 6, `${side}.strengths[${index}]: too short`)
  );
  overall.blunders.forEach((item, index) => {
    exactKeys(item, ["text", "tags"], `${side}.blunders[${index}]`);
    assertV4(wordCount(item.text) >= 8, `${side}.blunders[${index}]: too short`);
    assertV4(
      Array.isArray(item.tags) && item.tags.length <= 2,
      `${side}.blunders[${index}]: too many tags`
    );
    item.tags.forEach((tag, tagIndex) =>
      validateTag(tag, `${side}.blunders[${index}].tags[${tagIndex}]`)
    );
  });
}

function validateExtension(extension, side, moveById, debateNumber) {
  exactKeys(
    extension,
    ["thesis", "premises", "conclusion", "newArguments"],
    `${side}.aiExtension`
  );
  assertV4(
    extension.premises.length >= 4 &&
      extension.premises.length <= 6 &&
      extension.newArguments.length >= 2 &&
      extension.newArguments.length <= 4,
    `${side}: AI Extension counts invalid`
  );
  const items = [
    extension.thesis,
    ...extension.premises,
    extension.conclusion,
    ...extension.newArguments
  ];
  const ids = new Set();
  for (const item of items) {
    assertV4(!ids.has(item.id), `${side}: duplicate AI Extension item ${item.id}`);
    ids.add(item.id);
    assertV4(
      item.id.startsWith(`ai-${debateNumber}-${side}-`),
      `${item.id}: shard-safe AI item prefix required`
    );
    exactKeys(
      item.novelty,
      ["classification", "sourceMoveIds", "explanation"],
      `${item.id}.novelty`
    );
    assertV4(
      ["extends", "repairs", "introduces"].includes(
        item.novelty.classification
      ),
      `${item.id}: novelty class invalid`
    );
    assertV4(
      new Set(item.novelty.sourceMoveIds).size ===
        item.novelty.sourceMoveIds.length &&
        item.novelty.sourceMoveIds.every((moveId) => moveById.has(moveId)),
      `${item.id}: novelty move mapping invalid`
    );
    assertV4(
      wordCount(item.novelty.explanation) >= 8,
      `${item.id}: novelty explanation too short`
    );
    if (item.novelty.classification === "introduces") {
      assertV4(
        item.novelty.sourceMoveIds.length === 0,
        `${item.id}: introduced item has source moves`
      );
    } else {
      assertV4(
        item.novelty.sourceMoveIds.length >= 1,
        `${item.id}: extended or repaired item lacks source move`
      );
    }
  }
  assertV4(wordCount(extension.thesis.text) >= 12, `${side}: thesis too short`);
  extension.premises.forEach((item, index) =>
    assertV4(wordCount(item.text) >= 12, `${side}: premise ${index} too short`)
  );
  assertV4(
    wordCount(extension.conclusion.text) >= 15,
    `${side}: conclusion too short`
  );
  for (const item of extension.newArguments) {
    exactKeys(item, ["id", "title", "text", "novelty"], `${item.id}.newArgument`);
    const count = wordCount(item.text);
    assertV4(
      count >= 45 && count <= 130,
      `${item.id}: new argument outside 45–130 words`
    );
  }
  assertV4(
    extension.newArguments.some(
      ({ novelty }) => novelty.classification === "introduces"
    ),
    `${side}: at least one introduced new argument required`
  );
  return { items: items.length, newArguments: extension.newArguments.length };
}

export function buildPublicationTimeoutRecoveryShardSchema(packet) {
  const original = buildPostCanaryBatch10PublicationSchema(
    packet.publicationPacket
  );
  const side = packet.side;
  const contentProperties = {
    ...(packet.includesSummary
      ? { summary: structuredClone(original.properties.summary) }
      : {}),
    representativeQuote: structuredClone(
      original.properties.representativeQuotes.properties[side]
    ),
    moveProse: {
      type: "object",
      additionalProperties: false,
      required: packet.moveIds,
      properties: Object.fromEntries(
        packet.moveIds.map((moveId) => [
          moveId,
          structuredClone(original.properties.moveProse.properties[moveId])
        ])
      )
    },
    overallCommentary: structuredClone(
      original.properties.overallCommentary.properties[side]
    ),
    aiExtension: structuredClone(original.properties.aiExtension.properties[side])
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id:
      `slugfester-batch-10-publication-timeout-recovery-${packet.debateNumber}-${packet.shardId}`,
    title:
      `Batch 10 Debate ${packet.debateNumber} publication timeout recovery ${packet.shardId}`,
    type: "object",
    additionalProperties: false,
    required: [
      "schemaVersion",
      "protocolId",
      "contextIndex",
      "shardId",
      "side",
      "debateNumber",
      "debateId",
      "assessmentModel",
      "completedAt",
      "content"
    ],
    properties: {
      schemaVersion: {
        type: "string",
        const: POST_CANARY_BATCH_10_PUBLICATION_TIMEOUT_SHARD_OUTPUT_VERSION
      },
      protocolId: {
        type: "string",
        const: POST_CANARY_BATCH_10_PUBLICATION_TIMEOUT_RECOVERY_PROTOCOL_ID
      },
      contextIndex: { type: "integer", const: packet.contextIndex },
      shardId: { type: "string", const: packet.shardId },
      side: { type: "string", const: side },
      debateNumber: { type: "string", const: packet.debateNumber },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: {
        type: "string",
        const: POST_CANARY_BATCH_10_PUBLICATION_MODEL.label
      },
      completedAt: { type: "string", minLength: 10 },
      content: {
        type: "object",
        additionalProperties: false,
        required: Object.keys(contentProperties),
        properties: contentProperties
      }
    }
  };
}

export function validatePublicationTimeoutRecoveryShardOutput(output, packet) {
  exactKeys(
    output,
    [
      "schemaVersion",
      "protocolId",
      "contextIndex",
      "shardId",
      "side",
      "debateNumber",
      "debateId",
      "assessmentModel",
      "completedAt",
      "content"
    ],
    "shard output"
  );
  assertV4(
    output.schemaVersion ===
        POST_CANARY_BATCH_10_PUBLICATION_TIMEOUT_SHARD_OUTPUT_VERSION &&
      output.protocolId ===
        POST_CANARY_BATCH_10_PUBLICATION_TIMEOUT_RECOVERY_PROTOCOL_ID &&
      output.contextIndex === packet.contextIndex &&
      output.shardId === packet.shardId &&
      output.side === packet.side &&
      output.debateNumber === packet.debateNumber &&
      output.debateId === packet.debateId &&
      output.assessmentModel === POST_CANARY_BATCH_10_PUBLICATION_MODEL.label &&
      !Number.isNaN(Date.parse(output.completedAt)),
    "shard output identity or provenance mismatch"
  );
  const expectedContent = [
    ...(packet.includesSummary ? ["summary"] : []),
    "representativeQuote",
    "moveProse",
    "overallCommentary",
    "aiExtension"
  ];
  exactKeys(output.content, expectedContent, `${packet.shardId}.content`);
  if (packet.includesSummary) {
    const count = wordCount(output.content.summary);
    assertV4(count >= 8 && count <= 35, "summary outside 8–35 words");
  }
  const moveById = new Map(
    packet.publicationPacket.moves.map((move) => [move.moveId, move])
  );
  const quote = output.content.representativeQuote;
  exactKeys(
    quote,
    ["sourceMoveId", "text", "context"],
    `${packet.side}.representativeQuote`
  );
  const quoteMove = moveById.get(quote.sourceMoveId);
  assertV4(
    quoteMove && quoteMove.side === packet.side && quoteMove.quoteEligible,
    `${packet.side}: quote source is not eligible`
  );
  assertV4(
    quoteMove.sourceExcerpt.includes(quote.text),
    `${packet.side}: quote is not source-exact`
  );
  assertV4(
    wordCount(quote.text) >= 3 && wordCount(quote.text) <= 18,
    `${packet.side}: quote outside 3–18 words`
  );
  assertV4(
    wordCount(quote.context) >= 12 && wordCount(quote.context) <= 55,
    `${packet.side}: quote context outside 12–55 words`
  );
  exactKeys(output.content.moveProse, packet.moveIds, `${packet.shardId}.moveProse`);
  let tags = 0;
  let minimumCritiqueCharacters = Infinity;
  for (const moveId of packet.moveIds) {
    const row = validateMoveProse(
      output.content.moveProse[moveId],
      moveById.get(moveId),
      moveId
    );
    tags += row.tags;
    minimumCritiqueCharacters = Math.min(
      minimumCritiqueCharacters,
      row.critique.characters
    );
  }
  validateOverall(output.content.overallCommentary, packet.side);
  const extension = validateExtension(
    output.content.aiExtension,
    packet.side,
    moveById,
    packet.debateNumber
  );
  assertV4(
    unexpectedCharactersAbsent(output) &&
      displayedLanguagePasses(JSON.stringify(output)),
    `${packet.shardId}: prohibited or unexpected displayed language`
  );
  return {
    status: "passed",
    debateNumber: packet.debateNumber,
    contextIndex: packet.contextIndex,
    shardId: packet.shardId,
    side: packet.side,
    contentFields: packet.writableFields.length,
    moves: packet.moveIds.length,
    critiques: packet.moveIds.length,
    minimumCritiqueCharacters,
    tags,
    exactSourceQuotes: 1,
    overallCommentarySides: 1,
    aiExtensionSides: 1,
    noveltyItems: extension.items,
    newArguments: extension.newArguments,
    modelAuthoredScores: 0
  };
}

export function mergeAndValidatePublicationTimeoutRecoveryDebate({
  shardOutputs,
  shardPackets,
  publicationPacket
}) {
  assertV4(
    shardOutputs.length === 2 && shardPackets.length === 2,
    "two shard outputs and packets required"
  );
  const bySide = new Map();
  const acceptedContentFields = [];
  for (let index = 0; index < 2; index += 1) {
    const output = shardOutputs[index];
    const packet = shardPackets[index];
    validatePublicationTimeoutRecoveryShardOutput(output, packet);
    assertV4(
      packet.debateNumber === publicationPacket.debateNumber &&
        packet.debateId === publicationPacket.debateId,
      "shard and publication identities differ"
    );
    assertV4(!bySide.has(packet.side), `duplicate ${packet.side} shard`);
    bySide.set(packet.side, output);
    acceptedContentFields.push(...packet.writableFields);
  }
  const requiredFields = [
    "summary",
    "representativeQuotes.pro",
    "representativeQuotes.con",
    ...publicationPacket.moves.map(({ moveId }) => `moveProse.${moveId}`),
    "overallCommentary.pro",
    "overallCommentary.con",
    "aiExtension.pro",
    "aiExtension.con"
  ];
  assertV4(
    acceptedContentFields.length === requiredFields.length &&
      new Set(acceptedContentFields).size === requiredFields.length &&
      canonicalJson([...acceptedContentFields].sort()) ===
        canonicalJson([...requiredFields].sort()),
    `Debate ${publicationPacket.debateNumber}: shards do not decide every content field exactly once`
  );
  const pro = bySide.get("pro");
  const con = bySide.get("con");
  assertV4(pro && con, "both side shards required");
  const merged = {
    schemaVersion: POST_CANARY_BATCH_10_PUBLICATION_OUTPUT_VERSION,
    protocolId: POST_CANARY_BATCH_10_PUBLICATION_PROTOCOL_ID,
    debateNumber: publicationPacket.debateNumber,
    debateId: publicationPacket.debateId,
    assessmentModel: POST_CANARY_BATCH_10_PUBLICATION_MODEL.label,
    productionCanary: false,
    stagingOnly: true,
    completedAt: new Date(
      Math.max(Date.parse(pro.completedAt), Date.parse(con.completedAt))
    ).toISOString(),
    summary: pro.content.summary,
    representativeQuotes: {
      pro: pro.content.representativeQuote,
      con: con.content.representativeQuote
    },
    moveProse: Object.fromEntries(
      publicationPacket.moves.map(({ moveId, side }) => [
        moveId,
        bySide.get(side).content.moveProse[moveId]
      ])
    ),
    overallCommentary: {
      pro: pro.content.overallCommentary,
      con: con.content.overallCommentary
    },
    aiExtension: {
      aiGenerated: true,
      disclaimer: POST_CANARY_BATCH_10_PUBLICATION_DISCLOSURE,
      pro: pro.content.aiExtension,
      con: con.content.aiExtension
    },
    displayContract: {
      sectionTitle: "AI Extension",
      placement: "immediately-after-overall-commentary",
      defaultCollapsed: true,
      visualVariant: "ai-distinct",
      byline: POST_CANARY_BATCH_10_PUBLICATION_BYLINE,
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
  const validation = validatePostCanaryBatch10PublicationOutput(
    merged,
    publicationPacket
  );
  return { merged, acceptedContentFields, validation };
}
