import { wordCount } from "./v388-reconstruction.mjs";

export const V4214_ROOT = "docs/calibration/v4.2.14/bounded-finalization-correction";
export const V4214_PROTOCOL_ID = "v4.2.14-bounded-finalization-correction";
export const V4214_OUTPUT_VERSION = "4.2.14-bounded-prose-correction-proposal";
const clone = (value) => structuredClone(value);

export function findV4214Violations(output) {
  const quotes = ["pro", "con"].filter((side) => { const count = wordCount(output.scorecard.quotes[side].context); return count < 20 || count > 80; });
  const critiques = [];
  for (const section of output.scorecard.sections) for (const exchange of section.exchanges) for (const side of ["pro", "con"]) if (exchange[side]) { const count = wordCount(exchange[side].critique); if (count < 105 || count > 130) critiques.push(exchange[side].moveId); }
  const newArguments = [];
  for (const side of ["pro", "con"]) for (const item of output.aiExtension[side].newArguments) { const count = wordCount(item.text); if (count < 45 || count > 130) newArguments.push(`${side}:${item.id}`); }
  return { quotes, critiques, newArguments, total: quotes.length + critiques.length + newArguments.length };
}

export function buildV4214Packet(output, sourcePacket, violations) {
  const moveMap = new Map(sourcePacket.moves.map((move) => [move.moveId, move]));
  const compactMove = (move) => move ? ({ moveId: move.moveId, sectionId: move.sectionId, sectionTitle: move.sectionTitle, side: move.side, speaker: move.speaker, importance: move.importance, moveKind: move.moveKind, proposition: move.proposition, sourceSpan: move.sourceSpan, burdenContact: move.lockedBurdenContact, response: move.response, charityTested: move.charityTested, ratings: move.ratings }) : null;
  const argumentMap = new Map(); for (const section of output.scorecard.sections) for (const exchange of section.exchanges) for (const side of ["pro", "con"]) if (exchange[side]) argumentMap.set(exchange[side].moveId, { side, sectionId: section.sectionId, argument: exchange[side] });
  return {
    schemaVersion: "4.2.14-bounded-finalization-correction-packet",
    protocolId: V4214_PROTOCOL_ID,
    debateNumber: "103",
    immutableBoundary: { scores: true, identities: true, moveSelections: true, summaries: true, sections: true, overallCommentary: true, noveltyRecords: true, displayContract: true },
    quoteContexts: violations.quotes.map((side) => ({ side, targetWords: [20, 80], lockedQuote: sourcePacket.representativeQuotes[side], currentContext: output.scorecard.quotes[side].context, sourceMove: compactMove(moveMap.get(sourcePacket.representativeQuotes[side].sourceMoveId)) })),
    critiques: violations.critiques.map((moveId) => { const item = argumentMap.get(moveId); return { moveId, side: item.side, sectionId: item.sectionId, targetWords: [105, 130], currentSummary: item.argument.words, lockedScore: item.argument.score, currentCritique: item.argument.critique, sourceMove: compactMove(moveMap.get(moveId)) }; }),
    newArguments: violations.newArguments.map((key) => { const separator = key.indexOf(":"), side = key.slice(0, separator), id = key.slice(separator + 1), item = output.aiExtension[side].newArguments.find((entry) => entry.id === id); return { side, id, targetWords: [45, 130], title: item.title, currentText: item.text, lockedNovelty: item.novelty, sideContext: { thesis: output.aiExtension[side].thesis, premises: output.aiExtension[side].premises, conclusion: output.aiExtension[side].conclusion } }; })
  };
}

export function makeV4214Schema(violations) {
  const string = { type: "string", minLength: 1 };
  return { $schema: "https://json-schema.org/draft/2020-12/schema", $id: "slugfester-v4214-bounded-finalization-correction", type: "object", additionalProperties: false, required: ["schemaVersion", "protocolId", "debateNumber", "quoteContexts", "critiques", "newArguments"], properties: { schemaVersion: { type: "string", const: V4214_OUTPUT_VERSION }, protocolId: { type: "string", const: V4214_PROTOCOL_ID }, debateNumber: { type: "string", const: "103" }, quoteContexts: { type: "array", minItems: violations.quotes.length, maxItems: violations.quotes.length, items: { type: "object", additionalProperties: false, required: ["side", "text"], properties: { side: { type: "string", enum: violations.quotes }, text: string } } }, critiques: { type: "array", minItems: violations.critiques.length, maxItems: violations.critiques.length, items: { type: "object", additionalProperties: false, required: ["moveId", "text"], properties: { moveId: { type: "string", enum: violations.critiques }, text: string } } }, newArguments: { type: "array", minItems: violations.newArguments.length, maxItems: violations.newArguments.length, items: { type: "object", additionalProperties: false, required: ["side", "id", "text"], properties: { side: { type: "string", enum: ["pro", "con"] }, id: string, text: string } } } } };
}

function exactSet(actual, expected, label) { if (actual.length !== expected.length || new Set(actual).size !== actual.length || actual.some((value) => !expected.includes(value))) throw new Error(`v4.2.14 ${label} identity mismatch`); }
export function applyV4214Correction(proposal, original, violations) {
  if (proposal.schemaVersion !== V4214_OUTPUT_VERSION || proposal.protocolId !== V4214_PROTOCOL_ID || proposal.debateNumber !== "103") throw new Error("v4.2.14 proposal identity mismatch");
  exactSet(proposal.quoteContexts.map((item) => item.side), violations.quotes, "quote context"); exactSet(proposal.critiques.map((item) => item.moveId), violations.critiques, "critique"); exactSet(proposal.newArguments.map((item) => `${item.side}:${item.id}`), violations.newArguments, "new argument");
  for (const item of proposal.quoteContexts) { const count = wordCount(item.text); if (count < 20 || count > 80) throw new Error(`v4.2.14 ${item.side} quote context word count ${count}`); }
  for (const item of proposal.critiques) { const count = wordCount(item.text); if (count < 105 || count > 130) throw new Error(`v4.2.14 ${item.moveId} critique word count ${count}`); }
  for (const item of proposal.newArguments) { const count = wordCount(item.text); if (count < 45 || count > 130) throw new Error(`v4.2.14 ${item.side}:${item.id} new-argument word count ${count}`); }
  const corrected = clone(original); for (const item of proposal.quoteContexts) corrected.scorecard.quotes[item.side].context = item.text;
  const critiqueMap = new Map(proposal.critiques.map((item) => [item.moveId, item.text])); for (const section of corrected.scorecard.sections) for (const exchange of section.exchanges) for (const side of ["pro", "con"]) if (exchange[side] && critiqueMap.has(exchange[side].moveId)) exchange[side].critique = critiqueMap.get(exchange[side].moveId);
  const newMap = new Map(proposal.newArguments.map((item) => [`${item.side}:${item.id}`, item.text])); for (const side of ["pro", "con"]) for (const item of corrected.aiExtension[side].newArguments) if (newMap.has(`${side}:${item.id}`)) item.text = newMap.get(`${side}:${item.id}`);
  const remaining = findV4214Violations(corrected); if (remaining.total !== 0) throw new Error(`v4.2.14 correction left ${remaining.total} word-count violations`);
  return corrected;
}

export function buildV4214GoldProposal(current, priorValid, violations) {
  const priorArguments = new Map(); for (const section of priorValid.scorecard.sections) for (const exchange of section.exchanges) for (const side of ["pro", "con"]) if (exchange[side]) priorArguments.set(exchange[side].moveId, exchange[side]);
  return { schemaVersion: V4214_OUTPUT_VERSION, protocolId: V4214_PROTOCOL_ID, debateNumber: "103", quoteContexts: violations.quotes.map((side) => ({ side, text: priorValid.scorecard.quotes[side].context })), critiques: violations.critiques.map((moveId) => ({ moveId, text: priorArguments.get(moveId).critique })), newArguments: violations.newArguments.map((key) => { const separator = key.indexOf(":"), side = key.slice(0, separator), id = key.slice(separator + 1), index = current.aiExtension[side].newArguments.findIndex((item) => item.id === id); return { side, id, text: priorValid.aiExtension[side].newArguments[index].text }; }) };
}
