import { assertV4, containsProhibitedCalculatedField, V4_RESPONSE_RANGES } from "./v4-lean-production.mjs";
import { lexicalTokens, normalizeV418Events } from "./v418-source-integrity.mjs";
import {
  compileV42181PrimaryOutput,
  makeV42181PrimarySchema,
  validateV42181PrimaryOutput,
  validateV42181SourceLedger
} from "./v42181-fresh-direct-three.mjs";

export const V4219_ROOT = "docs/calibration/v4.2.19/primary-recovery";
export const V4219_PROTOCOL_ID = "v4.2.19-primary-recovery";
export const V4219_PACKET_VERSION = "4.2.19-recovery-source-packet";
export const V4219_OUTPUT_VERSION = "4.2.19-recovery-primary-judgment";
export const V4219_COMPILED_VERSION = "4.2.19-recovery-compiled-primary";
export const V4219_DIRECT_ROUTE_LIMITS = Object.freeze({
  sourceLedgerEventsMaximum: 1800,
  compactCopiedInputBytesMaximum: 150000
});
export const V4219_EVIDENCE_LIMITS = Object.freeze({
  cueMinimumTokens: 6,
  cueMaximumTokens: 20,
  cueMaximumCharacters: 180,
  excerptMinimumTokens: 12,
  excerptMaximumTokens: 90,
  excerptMaximumCharacters: 450
});

const clone = (value) => structuredClone(value);

function exactKeys(value, keys, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertV4(actual.length === expected.length && actual.every((key, index) => key === expected[index]), `${label}: keys must be ${expected.join(", ")}`);
}

function toV42181Packet(packet) {
  return { ...clone(packet), schemaVersion: "4.2.18.1-fresh-direct-source-packet", protocolId: "v4.2.18.1-corrected-fresh-direct-three" };
}

function toV42181Output(output) {
  return { ...clone(output), schemaVersion: "4.2.18.1-fresh-direct-primary-output", protocolId: "v4.2.18.1-corrected-fresh-direct-three" };
}

function orderedMoves(moves) {
  return [...moves].sort((left, right) => left.sourceSpan.startEvent - right.sourceSpan.startEvent
    || left.sourceSpan.endEvent - right.sourceSpan.endEvent
    || left.moveId.localeCompare(right.moveId));
}

function transcriptTokenSpans(text) {
  const matches = text.matchAll(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g);
  return [...matches].map((match) => ({ start: match.index, end: match.index + match[0].length }));
}

function normalizedSpanText(events, startEvent, endEvent) {
  return events.slice(startEvent, endEvent + 1).map((event) => event.text).join(" ").replace(/\s+/g, " ").trim();
}

export function compileV4219EvidenceExcerpt(sourceSpan, eventsDocument) {
  const events = normalizeV418Events(eventsDocument);
  exactKeys(sourceSpan, ["startEvent", "endEvent", "evidenceCue"], "sourceSpan");
  const { startEvent, endEvent } = sourceSpan;
  assertV4(Number.isInteger(startEvent) && Number.isInteger(endEvent) && startEvent >= 0 && startEvent <= endEvent && endEvent < events.length, "sourceSpan: invalid event range");
  assertV4(typeof sourceSpan.evidenceCue === "string", "sourceSpan.evidenceCue: expected string");
  const cue = sourceSpan.evidenceCue.replace(/\s+/g, " ").trim();
  const cueTokens = lexicalTokens(cue).length;
  assertV4(cue.length <= V4219_EVIDENCE_LIMITS.cueMaximumCharacters, `sourceSpan.evidenceCue: exceeds ${V4219_EVIDENCE_LIMITS.cueMaximumCharacters} characters`);
  assertV4(cueTokens >= V4219_EVIDENCE_LIMITS.cueMinimumTokens && cueTokens <= V4219_EVIDENCE_LIMITS.cueMaximumTokens, `sourceSpan.evidenceCue: token count outside ${V4219_EVIDENCE_LIMITS.cueMinimumTokens}..${V4219_EVIDENCE_LIMITS.cueMaximumTokens}`);

  const spanText = normalizedSpanText(events, startEvent, endEvent);
  const cueStart = spanText.toLocaleLowerCase("en-US").indexOf(cue.toLocaleLowerCase("en-US"));
  assertV4(cueStart >= 0, "sourceSpan.evidenceCue: exact cue is absent from the selected event span");
  const cueEnd = cueStart + cue.length;
  const tokens = transcriptTokenSpans(spanText);
  const firstCueToken = tokens.findIndex((token) => token.start === cueStart);
  let lastCueToken = -1;
  for (let index = 0; index < tokens.length; index += 1) if (tokens[index].end === cueEnd) lastCueToken = index;
  assertV4(firstCueToken >= 0 && lastCueToken >= firstCueToken, "sourceSpan.evidenceCue: cue must begin and end at lexical-token boundaries");

  let left = firstCueToken;
  let right = lastCueToken;
  const excerptAt = (candidateLeft, candidateRight) => spanText.slice(tokens[candidateLeft].start, tokens[candidateRight].end);
  assertV4(excerptAt(left, right).length <= V4219_EVIDENCE_LIMITS.excerptMaximumCharacters, "sourceSpan.evidenceCue: cue cannot fit the excerpt character ceiling");
  let takeLeft = true;
  while (right - left + 1 < V4219_EVIDENCE_LIMITS.excerptMaximumTokens) {
    const candidates = takeLeft ? [left - 1, right + 1] : [right + 1, left - 1];
    let expanded = false;
    for (const candidate of candidates) {
      const candidateLeft = candidate < left ? candidate : left;
      const candidateRight = candidate > right ? candidate : right;
      if (candidateLeft < 0 || candidateRight >= tokens.length) continue;
      if (candidateRight - candidateLeft + 1 > V4219_EVIDENCE_LIMITS.excerptMaximumTokens) continue;
      if (excerptAt(candidateLeft, candidateRight).length > V4219_EVIDENCE_LIMITS.excerptMaximumCharacters) continue;
      left = candidateLeft;
      right = candidateRight;
      expanded = true;
      takeLeft = !takeLeft;
      break;
    }
    if (!expanded) break;
  }
  const excerpt = excerptAt(left, right);
  const tokenCount = lexicalTokens(excerpt).length;
  assertV4(tokenCount >= V4219_EVIDENCE_LIMITS.excerptMinimumTokens, `sourceSpan: selected event span cannot supply ${V4219_EVIDENCE_LIMITS.excerptMinimumTokens} evidence tokens`);
  assertV4(excerpt.toLocaleLowerCase("en-US").includes(cue.toLocaleLowerCase("en-US")), "sourceSpan: compiled excerpt does not retain the exact evidence cue");
  return {
    excerpt,
    characterCount: excerpt.length,
    tokenCount,
    cueCharacterCount: cue.length,
    cueTokenCount: cueTokens,
    sourceExact: true,
    wholeWordBoundaries: true
  };
}

export function deriveV4219ResponseClass(move) {
  const response = move.response;
  if (move.moveKind === "constructive") return "constructive-opening";
  assertV4(!(response.diagnosticConsequenceExplicit && response.replacementDemandAnswered), `${move.moveId}: diagnostic-defeat and justified-reframe findings are mutually exclusive`);
  const contacted = response.components.filter((component) => component.contacted).length;
  if (response.diagnosticConsequenceExplicit) return "diagnostic-defeat";
  if (response.replacementDemandAnswered) return "justified-reframe";
  if (contacted > 0 && contacted === response.components.length) return "full-answer";
  if (contacted > 0) return "partial-answer";
  if (response.issueBearingContraryMaterial) return "relevant-nonanswer";
  return "nonanswer";
}

export function mapV4219Responsiveness(responseClass, withinClassValue) {
  const range = V4_RESPONSE_RANGES[responseClass];
  assertV4(range, `unknown response class: ${responseClass}`);
  assertV4(Number.isInteger(withinClassValue) && withinClassValue >= 0 && withinClassValue <= 100, "responsivenessWithinClass.value must be an integer from 0 through 100");
  return range[0] + Math.round((range[1] - range[0]) * withinClassValue / 100);
}

export function classifyV4219PrimaryRoute({ sourceLedgerEvents, compactCopiedInputBytes }) {
  assertV4(Number.isInteger(sourceLedgerEvents) && sourceLedgerEvents > 0, "sourceLedgerEvents must be a positive integer");
  assertV4(Number.isInteger(compactCopiedInputBytes) && compactCopiedInputBytes > 0, "compactCopiedInputBytes must be a positive integer");
  const exceeded = [];
  if (sourceLedgerEvents > V4219_DIRECT_ROUTE_LIMITS.sourceLedgerEventsMaximum) exceeded.push("source-ledger-events");
  if (compactCopiedInputBytes > V4219_DIRECT_ROUTE_LIMITS.compactCopiedInputBytesMaximum) exceeded.push("compact-copied-input-bytes");
  return {
    route: exceeded.length === 0 ? "direct" : "partition",
    sourceLedgerEvents,
    compactCopiedInputBytes,
    limits: clone(V4219_DIRECT_ROUTE_LIMITS),
    exceeded,
    durationUsedForRouting: false
  };
}

export function makeV4219PrimarySchema() {
  const schema = makeV42181PrimarySchema();
  schema.$id = "slugfester-v4219-primary-recovery";
  schema.title = "Slugfester v4.2.19 deterministic primary-recovery judgment";
  schema.properties.schemaVersion.const = V4219_OUTPUT_VERSION;
  schema.properties.protocolId.const = V4219_PROTOCOL_ID;
  const move = schema.properties.moves.items;
  const sourceSpan = move.properties.sourceSpan;
  sourceSpan.required = ["startEvent", "endEvent", "evidenceCue"];
  delete sourceSpan.properties.excerpt;
  sourceSpan.properties.evidenceCue = {
    type: "string",
    minLength: 12,
    maxLength: V4219_EVIDENCE_LIMITS.cueMaximumCharacters,
    description: "An exact 6-to-20-token source phrase beginning and ending at lexical-token boundaries; the repository expands it into the final evidence excerpt."
  };
  const response = move.properties.response;
  response.required = response.required.filter((key) => key !== "class");
  delete response.properties.class;
  response.required.push("responsivenessWithinClass");
  response.properties.responsivenessWithinClass = {
    type: "object",
    additionalProperties: false,
    required: ["value", "rationale"],
    properties: {
      value: { type: "integer", minimum: 0, maximum: 100, description: "Quality position within the response class that the repository will derive; this is not an absolute responsiveness score." },
      rationale: { type: "string", minLength: 40 }
    }
  };
  const ratings = move.properties.ratings;
  ratings.required = ratings.required.filter((key) => key !== "responsiveness");
  delete ratings.properties.responsiveness;
  return schema;
}

function assertV4219RawContract(output) {
  assertV4(output?.schemaVersion === V4219_OUTPUT_VERSION && output?.protocolId === V4219_PROTOCOL_ID, "v4.2.19 primary output identity mismatch");
  assertV4(!containsProhibitedCalculatedField(output), "v4.2.19 raw output contains a prohibited calculated field");
  assertV4(Array.isArray(output.moves), "v4.2.19 output.moves must be an array");
  for (const [index, move] of output.moves.entries()) {
    const label = `moves[${index}]`;
    exactKeys(move.sourceSpan, ["startEvent", "endEvent", "evidenceCue"], `${label}.sourceSpan`);
    exactKeys(move.response, ["decisiveTargetIds", "components", "issueBearingContraryMaterial", "diagnosticConsequenceExplicit", "replacementDemandAnswered", "rationale", "responsivenessWithinClass"], `${label}.response`);
    exactKeys(move.response.responsivenessWithinClass, ["value", "rationale"], `${label}.response.responsivenessWithinClass`);
    exactKeys(move.ratings, ["logicalCoherence", "evidenceWarrant", "relevanceBurden", "representationalCharity"], `${label}.ratings`);
    assertV4(["issueBearingContraryMaterial", "diagnosticConsequenceExplicit", "replacementDemandAnswered"].every((key) => typeof move.response[key] === "boolean"), `${label}.response: semantic flags must be boolean`);
    assertV4(Number.isInteger(move.response.responsivenessWithinClass.value) && move.response.responsivenessWithinClass.value >= 0 && move.response.responsivenessWithinClass.value <= 100, `${label}.response.responsivenessWithinClass.value: invalid value`);
    assertV4(typeof move.response.responsivenessWithinClass.rationale === "string" && move.response.responsivenessWithinClass.rationale.length >= 40, `${label}.response.responsivenessWithinClass.rationale: too short`);
    assertV4(!(move.response.diagnosticConsequenceExplicit && move.response.replacementDemandAnswered), `${move.moveId}: diagnostic-defeat and justified-reframe findings are mutually exclusive`);
  }
}

export function canonicalizeV4219PrimaryOutput(output, eventsDocument) {
  assertV4219RawContract(output);
  const events = normalizeV418Events(eventsDocument);
  const moves = orderedMoves(output.moves).map((move) => {
    const evidence = compileV4219EvidenceExcerpt(move.sourceSpan, events);
    const responseClass = deriveV4219ResponseClass(move);
    const { responsivenessWithinClass, ...responseFindings } = move.response;
    return {
      ...clone(move),
      sourceSpan: { startEvent: move.sourceSpan.startEvent, endEvent: move.sourceSpan.endEvent, excerpt: evidence.excerpt },
      response: { class: responseClass, ...clone(responseFindings) },
      ratings: {
        ...clone(move.ratings),
        responsiveness: {
          value: mapV4219Responsiveness(responseClass, responsivenessWithinClass.value),
          rationale: responsivenessWithinClass.rationale
        }
      }
    };
  });
  return toV42181Output({ ...clone(output), moves });
}

export function validateV4219PrimaryOutput(output, packet, eventsDocument, eventsFileBytes, sourceLedgerBytes) {
  assertV4(packet?.schemaVersion === V4219_PACKET_VERSION && packet?.protocolId === V4219_PROTOCOL_ID, "v4.2.19 source packet identity mismatch");
  const normalized = canonicalizeV4219PrimaryOutput(output, eventsDocument);
  const validation = validateV42181PrimaryOutput(normalized, toV42181Packet(packet), eventsDocument, eventsFileBytes, sourceLedgerBytes);
  const orderedIds = orderedMoves(output.moves).map((move) => move.moveId);
  const inputIds = output.moves.map((move) => move.moveId);
  const compiledEvidence = normalized.moves.map((move) => ({ moveId: move.moveId, characters: move.sourceSpan.excerpt.length, tokens: lexicalTokens(move.sourceSpan.excerpt).length }));
  return {
    ...validation,
    schemaVersion: V4219_OUTPUT_VERSION,
    protocolId: V4219_PROTOCOL_ID,
    deterministicRecovery: {
      status: "passed",
      repositoryOwnedChronology: true,
      chronologyReordered: inputIds.some((moveId, index) => moveId !== orderedIds[index]),
      replyTargetsValidatedAfterOrdering: true,
      repositoryOwnedEvidenceCompilation: true,
      evidenceCueRetained: true,
      compiledEvidence,
      repositoryDerivedResponseClass: true,
      modelAuthoredAbsoluteResponsiveness: false,
      withinClassMappingApplied: true
    }
  };
}

export function compileV4219PrimaryOutput(output, packet, eventsDocument) {
  assertV4(packet?.schemaVersion === V4219_PACKET_VERSION && packet?.protocolId === V4219_PROTOCOL_ID, "v4.2.19 source packet identity mismatch");
  const compiled = compileV42181PrimaryOutput(canonicalizeV4219PrimaryOutput(output, eventsDocument), toV42181Packet(packet), eventsDocument);
  return { ...compiled, schemaVersion: V4219_COMPILED_VERSION, protocolId: V4219_PROTOCOL_ID };
}

export { validateV42181SourceLedger as validateV4219SourceLedger };
