import { getReferenceDefinition } from "../../src/data/references.js";
import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import {
  CHECKPOINT_V22_PUBLICATION_BYLINE,
  CHECKPOINT_V22_PUBLICATION_DISCLOSURE,
  CHECKPOINT_V22_PUBLICATION_MODEL,
  CHECKPOINT_V22_PUBLICATION_OUTPUT_VERSION,
  CHECKPOINT_V22_PUBLICATION_PROTOCOL_ID,
  buildCheckpointV22PublicationSchema
} from "./assessment-production-checkpoint-v2.2-publication.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

function exactKeys(value, expected, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  assertV4(
    canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort()),
    `${label}: keys mismatch`
  );
}

function validateTag(tag, label) {
  exactKeys(tag, ["label", "type", "slug", "context"], label);
  const reference = getReferenceDefinition(tag.type, tag.slug);
  assertV4(reference && reference.label === tag.label, `${label}: unknown or mislabeled reference`);
  const count = wordCount(tag.context);
  assertV4(count >= 8 && count <= 35, `${label}: tag context outside 8–35 words`);
}

function unexpectedCharactersAbsent(value) {
  const text = JSON.stringify(value);
  return !/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(text);
}

function terminalPunctuationPresent(value) {
  return /[.!?]["')\]]?$/.test(String(value).trim());
}

export function validateCheckpointV22PublicationOutput(output, packet) {
  const schema = buildCheckpointV22PublicationSchema(packet);
  exactKeys(output, schema.required, "publication output");
  assertV4(
    output.schemaVersion === CHECKPOINT_V22_PUBLICATION_OUTPUT_VERSION &&
      output.protocolId === CHECKPOINT_V22_PUBLICATION_PROTOCOL_ID &&
      output.debateNumber === packet.debateNumber &&
      output.debateId === packet.debateId,
    "publication identity mismatch"
  );
  assertV4(
    output.assessmentModel === CHECKPOINT_V22_PUBLICATION_MODEL.label &&
      output.productionCanary === true &&
      output.stagingOnly === true &&
      !Number.isNaN(Date.parse(output.completedAt)),
    "publication provenance mismatch"
  );
  const summaryWords = wordCount(output.summary);
  assertV4(summaryWords >= 8 && summaryWords <= 35, "publication summary outside 8–35 words");

  const moveById = new Map(packet.moves.map((move) => [move.moveId, move]));
  for (const side of ["pro", "con"]) {
    const quote = output.representativeQuotes[side];
    exactKeys(quote, ["sourceMoveId", "text", "context"], `${side} representative quote`);
    const move = moveById.get(quote.sourceMoveId);
    assertV4(move && move.side === side && move.quoteEligible, `${side}: quote source is not eligible`);
    assertV4(move.sourceExcerpt.includes(quote.text), `${side}: quote is not an exact source substring`);
    const quoteWords = wordCount(quote.text);
    const contextWords = wordCount(quote.context);
    assertV4(quoteWords >= 3 && quoteWords <= 18, `${side}: quote outside 3–18 words`);
    assertV4(contextWords >= 12 && contextWords <= 55, `${side}: quote context outside 12–55 words`);
  }

  exactKeys(output.moveProse, packet.moves.map((move) => move.moveId), "moveProse");
  let critiques = 0;
  let tags = 0;
  let minimumCritiqueCharacters = Infinity;
  const labels = [
    "strongest feature:",
    "principal limitation:",
    "live burden:",
    "locked score:"
  ];
  for (const move of packet.moves) {
    const prose = output.moveProse[move.moveId];
    exactKeys(prose, ["role", "words", "critique", "tags"], `${move.moveId}.prose`);
    assertV4(
      [
        "Load-bearing constructive",
        "Supporting constructive",
        "Major direct reply",
        "Supporting reply",
        "Diagnostic challenge",
        "Concession or qualification"
      ].includes(prose.role),
      `${move.moveId}: invalid role`
    );
    const summaryCount = wordCount(prose.words);
    assertV4(summaryCount >= 8 && summaryCount <= 55, `${move.moveId}: summary outside 8–55 words`);
    const critique = String(prose.critique).trim();
    const critiqueCount = wordCount(critique);
    assertV4(critiqueCount >= 105 && critiqueCount <= 130, `${move.moveId}: critique outside 105–130 words`);
    assertV4(critique.length >= 880, `${move.moveId}: critique shorter than 880 characters`);
    const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
    assertV4(sentences.length === 4, `${move.moveId}: critique must contain exactly four sentences`);
    for (let index = 0; index < labels.length; index += 1) {
      assertV4(
        sentences[index].toLowerCase().startsWith(labels[index]),
        `${move.moveId}: critique label or order mismatch`
      );
      assertV4(
        terminalPunctuationPresent(sentences[index]),
        `${move.moveId}: critique sentence lacks terminal punctuation`
      );
    }
    assertV4(Array.isArray(prose.tags) && prose.tags.length <= 2, `${move.moveId}: too many tags`);
    prose.tags.forEach((tag, index) => validateTag(tag, `${move.moveId}.tags[${index}]`));
    critiques += 1;
    tags += prose.tags.length;
    minimumCritiqueCharacters = Math.min(minimumCritiqueCharacters, critique.length);
  }

  let overallCommentarySides = 0;
  for (const side of ["pro", "con"]) {
    const overall = output.overallCommentary[side];
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
      assertV4(Array.isArray(item.tags) && item.tags.length <= 2, `${side}.blunders[${index}]: too many tags`);
      item.tags.forEach((tag, tagIndex) =>
        validateTag(tag, `${side}.blunders[${index}].tags[${tagIndex}]`)
      );
      tags += item.tags.length;
    });
    overallCommentarySides += 1;
  }

  assertV4(
    output.aiExtension.aiGenerated === true &&
      output.aiExtension.disclaimer === CHECKPOINT_V22_PUBLICATION_DISCLOSURE,
    "AI Extension disclosure mismatch"
  );
  let noveltyItems = 0;
  let introducedItems = 0;
  let newArguments = 0;
  let aiExtensionSides = 0;
  const allExtensionIds = new Set();
  for (const side of ["pro", "con"]) {
    const extension = output.aiExtension[side];
    exactKeys(extension, ["thesis", "premises", "conclusion", "newArguments"], `${side}.aiExtension`);
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
    for (const item of items) {
      assertV4(!allExtensionIds.has(item.id), `duplicate AI Extension item ${item.id}`);
      allExtensionIds.add(item.id);
      const novelty = item.novelty;
      exactKeys(novelty, ["classification", "sourceMoveIds", "explanation"], `${item.id}.novelty`);
      assertV4(
        ["extends", "repairs", "introduces"].includes(novelty.classification),
        `${item.id}: novelty class invalid`
      );
      assertV4(
        new Set(novelty.sourceMoveIds).size === novelty.sourceMoveIds.length &&
          novelty.sourceMoveIds.every((moveId) => moveById.has(moveId)),
        `${item.id}: novelty move mapping invalid`
      );
      assertV4(wordCount(novelty.explanation) >= 8, `${item.id}: novelty explanation too short`);
      if (novelty.classification === "introduces") {
        assertV4(novelty.sourceMoveIds.length === 0, `${item.id}: introduced item has source moves`);
        introducedItems += 1;
      } else {
        assertV4(novelty.sourceMoveIds.length >= 1, `${item.id}: extended or repaired item lacks source move`);
      }
      noveltyItems += 1;
    }
    assertV4(wordCount(extension.thesis.text) >= 12, `${side}: thesis too short`);
    extension.premises.forEach((item, index) =>
      assertV4(wordCount(item.text) >= 12, `${side}: premise ${index} too short`)
    );
    assertV4(wordCount(extension.conclusion.text) >= 15, `${side}: conclusion too short`);
    for (const item of extension.newArguments) {
      exactKeys(item, ["id", "title", "text", "novelty"], `${item.id}.newArgument`);
      const count = wordCount(item.text);
      assertV4(count >= 45 && count <= 130, `${item.id}: new argument outside 45–130 words`);
      newArguments += 1;
    }
    assertV4(
      extension.newArguments.some((item) => item.novelty.classification === "introduces"),
      `${side}: at least one genuinely introduced new argument required`
    );
    aiExtensionSides += 1;
  }

  assertV4(
    canonicalJson(output.displayContract) ===
      canonicalJson({
        sectionTitle: "AI Extension",
        placement: "immediately-after-overall-commentary",
        defaultCollapsed: true,
        visualVariant: "ai-distinct",
        byline: CHECKPOINT_V22_PUBLICATION_BYLINE,
        prohibitedLanguageScanPassed: true
      }),
    "AI Extension display contract mismatch"
  );
  assertV4(
    canonicalJson(output.audit) ===
      canonicalJson({
        lockedScoresUnchanged: true,
        everyMoveAuthoredOnce: true,
        legacyAssessmentUnavailable: true,
        otherDebatesUnavailable: true,
        aiMaterialExcludedFromScores: true,
        sourceOnlyQuoteSelection: true
      }),
    "publication audit mismatch"
  );
  assertV4(displayedLanguagePasses(output), "prohibited publication language detected");
  assertV4(unexpectedCharactersAbsent(output), "unexpected CJK, Hangul, Kana, or replacement character detected");

  return {
    status: "passed",
    debateNumber: packet.debateNumber,
    moves: packet.moves.length,
    critiques,
    minimumCritiqueCharacters,
    tags,
    quoteExactSourceMatches: 2,
    overallCommentarySides,
    noveltyItems,
    introducedItems,
    newArguments,
    aiExtensionSides,
    calculatedScoresAuthoredByModel: 0,
    lockedScoresUnchanged: true
  };
}
