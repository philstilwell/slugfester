import { referenceDefinitions, getReferenceDefinition } from "../../src/data/references.js";
import { canonicalizeV4220PrimaryOutput, renderV4220EvidenceWindow } from "./v4220-source-span-rendering.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";
import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";

export const V42211732_ROOT = "docs/calibration/v4.2.21.17.32/hard-route-publication-reconstruction";
export const V42211732_PROTOCOL_ID = "v4.2.21.17.32-hard-route-publication-reconstruction";
export const V42211732_OUTPUT_VERSION = "4.2.21.17.32-hard-route-publication-authoring";
export const V42211732_MODEL = Object.freeze({ label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription" });
export const V42211732_BYLINE = "Assessments made by 5.6 Sol. — Rubric: Slugfester Reassessment Rubric v2.";
export const V42211732_DISCLOSURE = "This section is an AI-generated contribution, not transcript content. Its wording is not attributable to either participant and it does not affect any participant score.";
export const V42211732_DEBATES = Object.freeze(["51", "63", "90", "153", "165"]);

const clone = (value) => structuredClone(value);
const str = (minLength = 1) => ({ type: "string", minLength });
const exactObject = (properties) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
const scoreBand = (value) => value >= 95 ? "exceptional 95–100" : value >= 85 ? "very strong 85–94" : value >= 75 ? "strong/competent 75–84" : value >= 65 ? "mixed 65–74" : value >= 50 ? "weak 50–64" : value >= 25 ? "very weak 25–49" : "non-performance 0–24";
const formatTime = (milliseconds) => `${Math.floor(milliseconds / 60000)}:${String(Math.floor((milliseconds % 60000) / 1000)).padStart(2, "0")}`;
const referenceUrl = (tag) => tag.type === "fallacy" ? `https://logfall.com/fallacies/${tag.slug}/` : `https://cogbias.site/biases/${tag.slug}/`;

export function v42211732ReferenceCatalog() {
  return Object.entries(referenceDefinitions).flatMap(([type, definitions]) => Object.entries(definitions).map(([slug, definition]) => ({ type, slug, label: definition.label, definition: definition.definition, url: definition.externalUrl })));
}

function tagSchema() {
  const catalog = v42211732ReferenceCatalog();
  return exactObject({
    label: str(),
    type: { type: "string", enum: ["fallacy", "bias"] },
    slug: { type: "string", enum: catalog.map((tag) => tag.slug) },
    context: str(40)
  });
}

function noveltySchema(moveIds) {
  return exactObject({
    classification: { type: "string", enum: ["extends", "repairs", "introduces"] },
    sourceMoveIds: { type: "array", uniqueItems: true, items: { type: "string", enum: moveIds } },
    explanation: str(40)
  });
}

function extensionItemSchema(moveIds) {
  return exactObject({ id: str(), text: str(80), novelty: noveltySchema(moveIds) });
}

export function buildV42211732PublicationSchema(packet) {
  const moveIds = packet.moves.map((move) => move.moveId);
  const moveProse = Object.fromEntries(packet.moves.map((move) => [move.moveId, exactObject({
    role: { type: "string", enum: ["Load-bearing constructive", "Supporting constructive", "Major direct reply", "Supporting reply", "Diagnostic challenge", "Concession or qualification"] },
    words: str(50),
    critique: str(700),
    tags: { type: "array", maxItems: 2, items: tagSchema() }
  })]));
  const quote = (side) => exactObject({
    sourceMoveId: { type: "string", enum: packet.moves.filter((move) => move.side === side && move.quoteEligible).map((move) => move.moveId) },
    text: str(12),
    context: str(60)
  });
  const blunder = exactObject({ text: str(50), tags: { type: "array", minItems: 1, maxItems: 2, items: tagSchema() } });
  const overallSide = exactObject({
    strengths: { type: "array", minItems: 3, maxItems: 6, items: str(30) },
    blunders: { type: "array", minItems: 1, maxItems: 4, items: blunder }
  });
  const extensionItem = extensionItemSchema(moveIds);
  const newArgument = exactObject({ id: str(), title: str(8), text: str(280), novelty: noveltySchema(moveIds) });
  const extensionSide = exactObject({
    thesis: extensionItem,
    premises: { type: "array", minItems: 4, maxItems: 6, items: extensionItem },
    conclusion: extensionItem,
    newArguments: { type: "array", minItems: 2, maxItems: 4, items: newArgument }
  });
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v42211732-publication-${packet.debateNumber}`,
    title: `Slugfester v4.2.21.17.32 publication authoring Debate ${packet.debateNumber}`,
    ...exactObject({
      schemaVersion: { type: "string", const: V42211732_OUTPUT_VERSION },
      protocolId: { type: "string", const: V42211732_PROTOCOL_ID },
      debateNumber: { type: "string", const: packet.debateNumber },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: V42211732_MODEL.label },
      calibrationOnly: { type: "boolean", const: true },
      completedAt: str(),
      summary: str(40),
      representativeQuotes: exactObject({ pro: quote("pro"), con: quote("con") }),
      moveProse: exactObject(moveProse),
      overallCommentary: exactObject({ pro: overallSide, con: overallSide }),
      aiExtension: exactObject({ aiGenerated: { type: "boolean", const: true }, disclaimer: { type: "string", const: V42211732_DISCLOSURE }, pro: extensionSide, con: extensionSide }),
      displayContract: exactObject({
        sectionTitle: { type: "string", const: "AI Extension" },
        placement: { type: "string", const: "immediately-after-overall-commentary" },
        defaultCollapsed: { type: "boolean", const: true },
        visualVariant: { type: "string", const: "ai-distinct" },
        byline: { type: "string", const: V42211732_BYLINE },
        prohibitedLanguageScanPassed: { type: "boolean", const: true }
      }),
      audit: exactObject({ lockedScoresUnchanged: { type: "boolean", const: true }, everyMoveAuthoredOnce: { type: "boolean", const: true }, legacyAssessmentUnavailable: { type: "boolean", const: true }, aiMaterialExcludedFromScores: { type: "boolean", const: true }, sourceOnlyQuoteSelection: { type: "boolean", const: true } })
    })
  };
}

export function buildV42211732PublicationPacket({ ledgerDebate, scoreDebate, sourcePacket, eventsDocument, production, audioVerifiedMoveIds }) {
  const raw = ledgerDebate.finalJudgment;
  const canonical = canonicalizeV4220PrimaryOutput(raw, eventsDocument);
  const canonicalById = new Map(canonical.moves.map((move) => [move.moveId, move]));
  const scoreByMoveId = new Map(scoreDebate.final.sections.flatMap((section) => ["pro", "con"].flatMap((side) => section.sides[side].moves.map((move) => [move.moveId, move.score]))));
  const rawById = new Map(raw.moves.map((move) => [move.moveId, move]));
  const moves = raw.moves.map((move) => {
    const startEvent = eventsDocument[move.sourceSpan.startEvent];
    const endEvent = eventsDocument[move.sourceSpan.endEvent];
    const finalScore = scoreByMoveId.get(move.moveId);
    const canonicalMove = canonicalById.get(move.moveId);
    assertV4(startEvent && endEvent && Number.isInteger(finalScore) && canonicalMove, `${move.moveId}: publication packet source missing`);
    const evidence = renderV4220EvidenceWindow(move, eventsDocument);
    const audioVerified = audioVerifiedMoveIds.has(move.moveId);
    return {
      moveId: move.moveId,
      sectionId: move.sectionId,
      side: move.side,
      speaker: move.speaker,
      moveKind: move.moveKind,
      proposition: move.proposition,
      importance: move.importance,
      finalScore,
      scoreBand: scoreBand(finalScore),
      displayTime: formatTime(startEvent.startMs),
      sourceSpan: { ...clone(move.sourceSpan), startMs: startEvent.startMs, endMs: endEvent.startMs + endEvent.durationMs },
      sourceExcerpt: evidence.excerpt,
      attributionConfidence: move.attributionConfidence,
      audioVerified,
      quoteEligible: move.attributionConfidence === "high" || audioVerified,
      burdenContact: clone(move.burdenContact),
      response: { class: canonicalMove.response.class, decisiveTargetIds: clone(move.response.decisiveTargetIds), components: clone(move.response.components), rationale: move.response.rationale, responsiveness: clone(canonicalMove.ratings.responsiveness) },
      precisionFindings: clone(move.precisionFindings),
      calibrationFindings: clone(move.calibrationFindings),
      charity: clone(move.charity),
      ratings: clone(move.ratings),
      evidenceBasis: move.evidenceBasis,
      assessmentConfidence: move.assessmentConfidence
    };
  });
  const sections = raw.sections.map((section) => {
    const sectionScore = scoreDebate.final.sections.find((item) => item.sectionId === section.sectionId);
    const sectionMoves = moves.filter((move) => move.sectionId === section.sectionId);
    const bySide = Object.fromEntries(["pro", "con"].map((side) => [side, sectionMoves.filter((move) => move.side === side).sort((left, right) => left.sourceSpan.startEvent - right.sourceSpan.startEvent)]));
    const displayRows = Array.from({ length: Math.max(bySide.pro.length, bySide.con.length) }, (_, index) => ({ pro: bySide.pro[index]?.moveId ?? null, con: bySide.con[index]?.moveId ?? null }));
    const startMs = Math.min(...sectionMoves.map((move) => move.sourceSpan.startMs));
    const endMs = Math.max(...sectionMoves.map((move) => move.sourceSpan.endMs));
    assertV4(sectionScore && bySide.pro.length >= 1 && bySide.con.length >= 1 && displayRows.length <= 3, `${section.sectionId}: publication section invalid`);
    return { ...clone(section), timebox: `${formatTime(startMs)}–${formatTime(endMs)}`, score: { pro: sectionScore.sides.pro.score, con: sectionScore.sides.con.score }, displayRows };
  });
  const transcriptHash = sourcePacket.sourceChain.transcriptSha256;
  const sourceNote = `Assessment based exclusively on the complete locally cached YouTube caption transcript and timestamped events (transcript SHA-256 ${transcriptHash}). Required below-high-confidence audio checks were completed before adjudication; representative quotations are exact strings from quote-eligible locked source spans.`;
  const scoringNote = "Scores are AI-generated estimates of argumentative performance under the locked adjudicated-consensus workflow. Repository code calculated every move, section, and overall result only after two isolated judgments, required audio review, and disputed-field adjudication closed.";
  const metadata = { title: production.title, label: production.label, date: "2026-08-08", duration: production.duration, youtubeUrl: production.youtubeUrl, motion: sourcePacket.motion, sourceNote, scoringNote };
  return {
    schemaVersion: "4.2.21.17.32-hard-route-publication-packet",
    protocolId: V42211732_PROTOCOL_ID,
    debateNumber: ledgerDebate.debateNumber,
    debateId: ledgerDebate.debateId,
    metadata,
    sides: clone(production.sides),
    routes: clone(raw.routes),
    sections,
    moves,
    calculatedScores: { overall: clone(scoreDebate.final.overall), winner: scoreDebate.final.winner },
    sourceChain: clone(sourcePacket.sourceChain),
    publicationBoundary: { participantJudgmentClosed: true, scoresLocked: true, modelAuthorsNoIdentityStructureOrScoreField: true, allLockedMovesMustReceiveProse: true, legacyAssessmentUnavailable: true, otherDebatesUnavailable: true, aiExtensionNeverScored: true },
    prohibitedInputs: ["legacy scores", "legacy critiques", "legacy tags", "legacy Overall Commentary", "legacy AI Extension", "rankings", "winner comparisons"]
  };
}

function exactKeys(value, expected, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  assertV4(canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort()), `${label}: keys mismatch`);
}

function validateTag(tag, label) {
  const reference = getReferenceDefinition(tag.type, tag.slug);
  assertV4(reference && reference.label === tag.label, `${label}: unknown or mislabeled reference`);
  const count = wordCount(tag.context);
  assertV4(count >= 8 && count <= 35, `${label}: tag context outside 8–35 words`);
}

export function validateV42211732PublicationOutput(output, packet) {
  const schema = buildV42211732PublicationSchema(packet);
  exactKeys(output, schema.required, "publication output");
  assertV4(output.schemaVersion === V42211732_OUTPUT_VERSION && output.protocolId === V42211732_PROTOCOL_ID && output.debateNumber === packet.debateNumber && output.debateId === packet.debateId, "publication identity mismatch");
  assertV4(output.assessmentModel === V42211732_MODEL.label && output.calibrationOnly === true && !Number.isNaN(Date.parse(output.completedAt)), "publication provenance mismatch");
  assertV4(wordCount(output.summary) >= 8 && wordCount(output.summary) <= 35, "publication summary outside 8–35 words");
  const moveById = new Map(packet.moves.map((move) => [move.moveId, move]));
  for (const side of ["pro", "con"]) {
    const quote = output.representativeQuotes[side];
    const move = moveById.get(quote.sourceMoveId);
    assertV4(move && move.side === side && move.quoteEligible, `${side}: quote source is not eligible`);
    assertV4(move.sourceExcerpt.includes(quote.text), `${side}: quote is not an exact source substring`);
    assertV4(wordCount(quote.text) >= 3 && wordCount(quote.text) <= 18, `${side}: quote outside 3–18 words`);
    assertV4(wordCount(quote.context) >= 12 && wordCount(quote.context) <= 55, `${side}: quote context outside 12–55 words`);
  }
  exactKeys(output.moveProse, packet.moves.map((move) => move.moveId), "moveProse");
  let critiques = 0, tags = 0;
  const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
  for (const move of packet.moves) {
    const prose = output.moveProse[move.moveId];
    assertV4(wordCount(prose.role) <= 5, `${move.moveId}: role exceeds five words`);
    assertV4(wordCount(prose.words) >= 8 && wordCount(prose.words) <= 55, `${move.moveId}: summary outside 8–55 words`);
    const critiqueCount = wordCount(prose.critique);
    assertV4(critiqueCount >= 105 && critiqueCount <= 130, `${move.moveId}: critique outside 105–130 words`);
    const sentences = String(prose.critique).trim().split(/(?<=[.!?])\s+/).filter(Boolean);
    assertV4(sentences.length === 4, `${move.moveId}: critique must contain exactly four sentences`);
    for (let index = 0; index < labels.length; index += 1) assertV4(sentences[index].toLowerCase().startsWith(labels[index]), `${move.moveId}: critique label/order mismatch`);
    prose.tags.forEach((tag, index) => validateTag(tag, `${move.moveId}.tags[${index}]`));
    critiques += 1; tags += prose.tags.length;
  }
  for (const side of ["pro", "con"]) {
    const overall = output.overallCommentary[side];
    assertV4(overall.strengths.length >= 3 && overall.strengths.length <= 6 && overall.blunders.length >= 1 && overall.blunders.length <= 4, `${side}: Overall Commentary counts invalid`);
    overall.strengths.forEach((item, index) => assertV4(wordCount(item) >= 6, `${side}.strengths[${index}]: too short`));
    overall.blunders.forEach((item, index) => {
      assertV4(wordCount(item.text) >= 8, `${side}.blunders[${index}]: too short`);
      assertV4(item.tags.length >= 1 && item.tags.length <= 2, `${side}.blunders[${index}]: reference count invalid`);
      item.tags.forEach((tag, tagIndex) => validateTag(tag, `${side}.blunders[${index}].tags[${tagIndex}]`));
      tags += item.tags.length;
    });
  }
  assertV4(output.aiExtension.aiGenerated === true && output.aiExtension.disclaimer === V42211732_DISCLOSURE, "AI Extension disclosure mismatch");
  let noveltyItems = 0, introducedItems = 0, newArguments = 0;
  for (const side of ["pro", "con"]) {
    const extension = output.aiExtension[side];
    assertV4(extension.premises.length >= 4 && extension.premises.length <= 6 && extension.newArguments.length >= 2 && extension.newArguments.length <= 4, `${side}: AI Extension counts invalid`);
    const items = [extension.thesis, ...extension.premises, extension.conclusion, ...extension.newArguments];
    const ids = new Set();
    for (const item of items) {
      assertV4(!ids.has(item.id), `${side}: duplicate AI Extension item ${item.id}`); ids.add(item.id);
      const novelty = item.novelty;
      assertV4(["extends", "repairs", "introduces"].includes(novelty.classification), `${item.id}: novelty class invalid`);
      assertV4(new Set(novelty.sourceMoveIds).size === novelty.sourceMoveIds.length && novelty.sourceMoveIds.every((moveId) => moveById.has(moveId)), `${item.id}: novelty move mapping invalid`);
      if (novelty.classification === "introduces") { assertV4(novelty.sourceMoveIds.length === 0, `${item.id}: introduced item has source moves`); introducedItems += 1; }
      else assertV4(novelty.sourceMoveIds.length >= 1, `${item.id}: extended/repaired item lacks source move`);
      noveltyItems += 1;
    }
    assertV4(wordCount(extension.thesis.text) >= 12, `${side}: thesis too short`);
    extension.premises.forEach((item, index) => assertV4(wordCount(item.text) >= 12, `${side}: premise ${index} too short`));
    assertV4(wordCount(extension.conclusion.text) >= 15, `${side}: conclusion too short`);
    for (const item of extension.newArguments) {
      const count = wordCount(item.text);
      assertV4(count >= 45 && count <= 130, `${item.id}: new argument outside 45–130 words`);
      newArguments += 1;
    }
    assertV4(extension.newArguments.some((item) => item.novelty.classification === "introduces"), `${side}: at least one genuinely introduced new argument required`);
  }
  assertV4(canonicalJson(output.displayContract) === canonicalJson({ sectionTitle: "AI Extension", placement: "immediately-after-overall-commentary", defaultCollapsed: true, visualVariant: "ai-distinct", byline: V42211732_BYLINE, prohibitedLanguageScanPassed: true }), "AI Extension display contract mismatch");
  assertV4(canonicalJson(output.audit) === canonicalJson({ lockedScoresUnchanged: true, everyMoveAuthoredOnce: true, legacyAssessmentUnavailable: true, aiMaterialExcludedFromScores: true, sourceOnlyQuoteSelection: true }), "publication audit mismatch");
  assertV4(displayedLanguagePasses(output), "prohibited publication language detected");
  return { status: "passed", debateNumber: packet.debateNumber, moves: packet.moves.length, critiques, tags, quoteExactSourceMatches: 2, noveltyItems, introducedItems, newArguments, calculatedScoresAuthoredByModel: 0 };
}

function mapTag(tag) {
  return { label: tag.label, type: tag.type, url: referenceUrl(tag), context: tag.context };
}

function mapExtensionSide(side) {
  return { finalArgument: { thesis: side.thesis.text, premises: side.premises.map((item) => item.text), conclusion: side.conclusion.text }, newArguments: side.newArguments.map((item) => ({ title: item.title, text: item.text })) };
}

export function compileV42211732PublicationPreview(output, packet) {
  validateV42211732PublicationOutput(output, packet);
  const moveById = new Map(packet.moves.map((move) => [move.moveId, move]));
  const argument = (moveId) => {
    if (!moveId) return null;
    const move = moveById.get(moveId), prose = output.moveProse[moveId];
    return { ledgerMoveId: moveId, time: move.displayTime, role: prose.role, words: prose.words, score: move.finalScore, critique: prose.critique, tags: prose.tags.map(mapTag) };
  };
  const overall = Object.fromEntries(["pro", "con"].map((side) => [side, {
    score: packet.calculatedScores.overall[side].score,
    strengths: clone(output.overallCommentary[side].strengths),
    blunders: output.overallCommentary[side].blunders.map((item) => ({ text: item.text, links: item.tags.map((tag) => ({ label: tag.label, url: referenceUrl(tag) })) }))
  }]));
  return {
    id: `calibration-v42211732-${packet.debateNumber}`,
    number: packet.debateNumber,
    assessmentModel: V42211732_MODEL.label,
    assessmentRubric: "Slugfester Reassessment Rubric v2",
    ...clone(packet.metadata),
    summary: output.summary,
    quotes: Object.fromEntries(["pro", "con"].map((side) => [side, { text: output.representativeQuotes[side].text, context: output.representativeQuotes[side].context }])),
    sides: clone(packet.sides),
    score: { pro: packet.calculatedScores.overall.pro.score, con: packet.calculatedScores.overall.con.score },
    sections: packet.sections.map((section) => ({ sectionId: section.sectionId, title: section.title, timebox: section.timebox, score: clone(section.score), exchanges: section.displayRows.map((row) => ({ pro: argument(row.pro), con: argument(row.con) })) })),
    overall,
    logicalExtension: { pro: mapExtensionSide(output.aiExtension.pro), con: mapExtensionSide(output.aiExtension.con) },
    calibration: { calibrationOnly: true, protocolId: output.protocolId, sourceDebateId: packet.debateId, displayContract: clone(output.displayContract), noveltyMap: { pro: clone(output.aiExtension.pro), con: clone(output.aiExtension.con) }, modelOutputCompletedAt: output.completedAt }
  };
}
