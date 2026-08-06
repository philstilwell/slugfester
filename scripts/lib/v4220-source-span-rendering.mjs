import { assertV4, containsProhibitedCalculatedField } from "./v4-lean-production.mjs";
import { lexicalTokens, normalizeV418Events } from "./v418-source-integrity.mjs";
import { compileV42181PrimaryOutput, makeV42181PrimarySchema, validateV42181PrimaryOutput, validateV42181SourceLedger } from "./v42181-fresh-direct-three.mjs";
import { V4219_EVIDENCE_LIMITS, V4219_MODEL, buildV4219SourcePacket, deriveV4219ResponseClass, mapV4219Responsiveness } from "./v4219-primary-recovery.mjs";

export const V4220_ROOT = "docs/calibration/v4.2.20/source-span-rendering";
export const V4220_PROTOCOL_ID = "v4.2.20-source-span-evidence-rendering";
export const V4220_PACKET_VERSION = "4.2.20-source-span-source-packet";
export const V4220_OUTPUT_VERSION = "4.2.20-source-span-primary-judgment";
export const V4220_COMPILED_VERSION = "4.2.20-source-span-compiled-primary";
export const V4220_MODEL = V4219_MODEL;
export const V4220_EVIDENCE_LIMITS = V4219_EVIDENCE_LIMITS;

const clone = (value) => structuredClone(value);
const STOPWORDS = new Set("a an and are as at be because been being but by can could did do does for from had has have he her hers him his how i if in into is it its may might more most must my no not of on one only or our should so some such than that the their them then there these they this those to too was we were what when where which who why will with would you your".split(" "));

function exactKeys(value, keys, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertV4(actual.length === expected.length && actual.every((key, index) => key === expected[index]), `${label}: keys must be ${expected.join(", ")}`);
}

function transcriptTokens(text) {
  return [...text.matchAll(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g)].map((match) => ({ value: lexicalTokens(match[0])[0], start: match.index, end: match.index + match[0].length }));
}

function normalizedSpanText(events, startEvent, endEvent) {
  return events.slice(startEvent, endEvent + 1).map((event) => event.text).join(" ").replace(/\s+/g, " ").trim();
}

function anchorWeights(move) {
  const weights = new Map();
  const add = (text, weight) => {
    for (const token of lexicalTokens(text)) if (token.length >= 3 && !STOPWORDS.has(token)) weights.set(token, Math.max(weights.get(token) ?? 0, weight));
  };
  add(move.proposition, 4);
  add(move.evidenceBasis, 2);
  add(move.response.rationale, 2);
  return weights;
}

function compareCandidate(left, right) {
  if (left.weightedOverlap !== right.weightedOverlap) return left.weightedOverlap - right.weightedOverlap;
  if (left.matchedAnchorTokens !== right.matchedAnchorTokens) return left.matchedAnchorTokens - right.matchedAnchorTokens;
  if (left.propositionOverlap !== right.propositionOverlap) return left.propositionOverlap - right.propositionOverlap;
  if (left.targetDistance !== right.targetDistance) return right.targetDistance - left.targetDistance;
  if (left.tokenCount !== right.tokenCount) return left.tokenCount - right.tokenCount;
  return right.startToken - left.startToken;
}

export function renderV4220EvidenceWindow(move, eventsDocument) {
  const events = normalizeV418Events(eventsDocument);
  exactKeys(move.sourceSpan, ["startEvent", "endEvent"], `${move.moveId}.sourceSpan`);
  const { startEvent, endEvent } = move.sourceSpan;
  assertV4(Number.isInteger(startEvent) && Number.isInteger(endEvent) && startEvent >= 0 && startEvent <= endEvent && endEvent < events.length, `${move.moveId}.sourceSpan: invalid event range`);
  const spanText = normalizedSpanText(events, startEvent, endEvent);
  const tokens = transcriptTokens(spanText);
  assertV4(tokens.length >= V4220_EVIDENCE_LIMITS.excerptMinimumTokens, `${move.moveId}.sourceSpan: fewer than ${V4220_EVIDENCE_LIMITS.excerptMinimumTokens} lexical tokens`);
  const weights = anchorWeights(move);
  const propositionTokens = new Set(lexicalTokens(move.proposition).filter((token) => token.length >= 3 && !STOPWORDS.has(token)));
  let best = null;
  for (let start = 0; start < tokens.length; start += 1) {
    const seen = new Set();
    let weightedOverlap = 0;
    let propositionOverlap = 0;
    for (let end = start; end < tokens.length && end - start + 1 <= V4220_EVIDENCE_LIMITS.excerptMaximumTokens; end += 1) {
      const characterCount = tokens[end].end - tokens[start].start;
      if (characterCount > V4220_EVIDENCE_LIMITS.excerptMaximumCharacters) break;
      const token = tokens[end].value;
      if (!seen.has(token)) {
        seen.add(token);
        weightedOverlap += weights.get(token) ?? 0;
        if (propositionTokens.has(token)) propositionOverlap += 1;
      }
      const tokenCount = end - start + 1;
      if (tokenCount < V4220_EVIDENCE_LIMITS.excerptMinimumTokens) continue;
      const candidate = { startToken: start, endToken: end, tokenCount, characterCount, weightedOverlap, matchedAnchorTokens: [...seen].filter((item) => weights.has(item)).length, propositionOverlap, targetDistance: Math.abs(380 - characterCount) };
      if (!best || compareCandidate(candidate, best) > 0) best = candidate;
    }
  }
  assertV4(best, `${move.moveId}.sourceSpan: no bounded evidence window available`);
  const excerpt = spanText.slice(tokens[best.startToken].start, tokens[best.endToken].end);
  assertV4(spanText.includes(excerpt), `${move.moveId}.sourceSpan: rendered evidence is not source-exact`);
  return { excerpt, characterCount: excerpt.length, tokenCount: lexicalTokens(excerpt).length, startToken: best.startToken, endToken: best.endToken, weightedOverlap: best.weightedOverlap, matchedAnchorTokens: best.matchedAnchorTokens, propositionOverlap: best.propositionOverlap, sourceExact: true, wholeWordBoundaries: true, deterministicTieBreak: "weighted-overlap, matched-anchor-count, proposition-overlap, distance-to-380-characters, token-count, earliest-start" };
}

function orderedMoves(moves) {
  return [...moves].sort((left, right) => left.sourceSpan.startEvent - right.sourceSpan.startEvent || left.sourceSpan.endEvent - right.sourceSpan.endEvent || left.moveId.localeCompare(right.moveId));
}

function toV42181Packet(packet) {
  return { ...clone(packet), schemaVersion: "4.2.18.1-fresh-direct-source-packet", protocolId: "v4.2.18.1-corrected-fresh-direct-three" };
}

function toV42181Output(output) {
  return { ...clone(output), schemaVersion: "4.2.18.1-fresh-direct-primary-output", protocolId: "v4.2.18.1-corrected-fresh-direct-three" };
}

export function buildV4220SourcePacket(args) {
  const built = buildV4219SourcePacket(args);
  const packet = clone(built.packet);
  packet.schemaVersion = V4220_PACKET_VERSION;
  packet.protocolId = V4220_PROTOCOL_ID;
  delete packet.modelInputBoundary.exactEvidenceCueRequired;
  delete packet.modelInputBoundary.evidenceCueTokenRange;
  delete packet.modelInputBoundary.evidenceCueMaximumCharacters;
  packet.modelInputBoundary.modelSelectsInclusiveEventSpanOnly = true;
  packet.modelInputBoundary.repositoryOwnedLexicalSalienceRendering = true;
  packet.modelInputBoundary.renderingAnchorFields = ["proposition", "evidenceBasis", "response.rationale"];
  const packetBytes = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  return { packet, packetBytes, sourceLedgerBytes: built.sourceLedgerBytes };
}

export function makeV4220PrimarySchema() {
  const schema = makeV42181PrimarySchema();
  schema.$id = "slugfester-v4220-source-span-primary";
  schema.title = "Slugfester v4.2.20 source-span evidence-rendering primary judgment";
  schema.properties.schemaVersion.const = V4220_OUTPUT_VERSION;
  schema.properties.protocolId.const = V4220_PROTOCOL_ID;
  const move = schema.properties.moves.items;
  const sourceSpan = move.properties.sourceSpan;
  sourceSpan.required = ["startEvent", "endEvent"];
  sourceSpan.properties = { startEvent: sourceSpan.properties.startEvent, endEvent: sourceSpan.properties.endEvent };
  const response = move.properties.response;
  response.required = response.required.filter((key) => key !== "class");
  delete response.properties.class;
  response.required.push("responsivenessWithinClass");
  response.properties.decisiveTargetIds.description = "IDs only of selected moves that occur earlier in source chronology; never target a later move.";
  response.properties.components.items.properties.targetMoveId.description = "The ID of an earlier selected target move named in decisiveTargetIds.";
  response.properties.responsivenessWithinClass = { type: "object", additionalProperties: false, required: ["value", "rationale"], properties: { value: { type: "integer", minimum: 0, maximum: 100, description: "Quality position within the response class that the repository derives." }, rationale: { type: "string", minLength: 40 } } };
  const ratings = move.properties.ratings;
  ratings.required = ratings.required.filter((key) => key !== "responsiveness");
  delete ratings.properties.responsiveness;
  return schema;
}

function assertRaw(output) {
  assertV4(output?.schemaVersion === V4220_OUTPUT_VERSION && output?.protocolId === V4220_PROTOCOL_ID, "v4.2.20 primary output identity mismatch");
  assertV4(!containsProhibitedCalculatedField(output), "v4.2.20 raw output contains a prohibited calculated field");
  assertV4(Array.isArray(output.moves), "v4.2.20 output.moves must be an array");
  for (const [index, move] of output.moves.entries()) {
    const label = `moves[${index}]`;
    exactKeys(move.sourceSpan, ["startEvent", "endEvent"], `${label}.sourceSpan`);
    exactKeys(move.response, ["decisiveTargetIds", "components", "issueBearingContraryMaterial", "diagnosticConsequenceExplicit", "replacementDemandAnswered", "rationale", "responsivenessWithinClass"], `${label}.response`);
    exactKeys(move.response.responsivenessWithinClass, ["value", "rationale"], `${label}.response.responsivenessWithinClass`);
    exactKeys(move.ratings, ["logicalCoherence", "evidenceWarrant", "relevanceBurden", "representationalCharity"], `${label}.ratings`);
    assertV4(["issueBearingContraryMaterial", "diagnosticConsequenceExplicit", "replacementDemandAnswered"].every((key) => typeof move.response[key] === "boolean"), `${label}.response: semantic flags must be boolean`);
    assertV4(Number.isInteger(move.response.responsivenessWithinClass.value) && move.response.responsivenessWithinClass.value >= 0 && move.response.responsivenessWithinClass.value <= 100, `${label}.response.responsivenessWithinClass.value: invalid value`);
    assertV4(typeof move.response.responsivenessWithinClass.rationale === "string" && move.response.responsivenessWithinClass.rationale.length >= 40, `${label}.response.responsivenessWithinClass.rationale: too short`);
    assertV4(!(move.response.diagnosticConsequenceExplicit && move.response.replacementDemandAnswered), `${move.moveId}: diagnostic-defeat and justified-reframe findings are mutually exclusive`);
  }
}

export function canonicalizeV4220PrimaryOutput(output, eventsDocument) {
  assertRaw(output);
  const events = normalizeV418Events(eventsDocument);
  const moves = orderedMoves(output.moves).map((move) => {
    const evidence = renderV4220EvidenceWindow(move, events);
    const responseClass = deriveV4219ResponseClass(move);
    const { responsivenessWithinClass, ...responseFindings } = move.response;
    return { ...clone(move), sourceSpan: { startEvent: move.sourceSpan.startEvent, endEvent: move.sourceSpan.endEvent, excerpt: evidence.excerpt }, response: { class: responseClass, ...clone(responseFindings) }, ratings: { ...clone(move.ratings), responsiveness: { value: mapV4219Responsiveness(responseClass, responsivenessWithinClass.value), rationale: responsivenessWithinClass.rationale } } };
  });
  return toV42181Output({ ...clone(output), moves });
}

export function validateV4220PrimaryOutput(output, packet, eventsDocument, eventsFileBytes, sourceLedgerBytes) {
  assertV4(packet?.schemaVersion === V4220_PACKET_VERSION && packet?.protocolId === V4220_PROTOCOL_ID, "v4.2.20 source packet identity mismatch");
  const normalized = canonicalizeV4220PrimaryOutput(output, eventsDocument);
  const validation = validateV42181PrimaryOutput(normalized, toV42181Packet(packet), eventsDocument, eventsFileBytes, sourceLedgerBytes);
  const renderedEvidence = orderedMoves(output.moves).map((move) => ({ moveId: move.moveId, ...renderV4220EvidenceWindow(move, eventsDocument) }));
  const inputIds = output.moves.map((move) => move.moveId);
  const orderedIds = orderedMoves(output.moves).map((move) => move.moveId);
  return { ...validation, schemaVersion: V4220_OUTPUT_VERSION, protocolId: V4220_PROTOCOL_ID, deterministicRecovery: { status: "passed", modelAuthoredEvidenceText: false, repositoryOwnedSourceSpanRendering: true, renderedEvidence, repositoryOwnedChronology: true, chronologyReordered: inputIds.some((moveId, index) => moveId !== orderedIds[index]), replyTargetsValidatedAfterOrdering: true, automaticTargetRepairPerformed: false, repositoryDerivedResponseClass: true, modelAuthoredAbsoluteResponsiveness: false, withinClassMappingApplied: true } };
}

export function compileV4220PrimaryOutput(output, packet, eventsDocument) {
  assertV4(packet?.schemaVersion === V4220_PACKET_VERSION && packet?.protocolId === V4220_PROTOCOL_ID, "v4.2.20 source packet identity mismatch");
  const compiled = compileV42181PrimaryOutput(canonicalizeV4220PrimaryOutput(output, eventsDocument), toV42181Packet(packet), eventsDocument);
  return { ...compiled, schemaVersion: V4220_COMPILED_VERSION, protocolId: V4220_PROTOCOL_ID };
}

export { validateV42181SourceLedger as validateV4220SourceLedger };
