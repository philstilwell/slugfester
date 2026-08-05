import { createHash } from "node:crypto";
import { assertV4 } from "./v41-lean-production.mjs";
import {
  V417_MODEL,
  evaluateV417PrimaryTiming,
  makeV417PrimarySchema,
  selectV417ControlDebates,
  validateV417PrimaryOutput
} from "./v417-fresh-validation.mjs";

export const V418_ROOT = "docs/calibration/v4.1.8/source-integrity-fresh-six-gate";
export const V418_PROTOCOL_ID = "v4.1.8-source-integrity-fresh-six-validation";
export const V418_PACKET_VERSION = "4.1.8-source-integrity-source-only-packet";
export const V418_OUTPUT_VERSION = "4.1.8-source-integrity-primary-output";
export const V418_MODEL = V417_MODEL;
export const V418_EXCERPT_MINIMUM_TOKENS = 12;
export const V418_EXCERPT_MAXIMUM_TOKENS = 90;
export const V418_MINIMUM_LEXICAL_RECALL = 0.8;
export const V418_MINIMUM_ORDERED_COVERAGE = 0.8;

const V417_PACKET_VERSION = "4.1.7-bounded-source-only-packet";
const V417_OUTPUT_VERSION = "4.1.7-bounded-primary-output";
const V417_PROTOCOL_ID = "v4.1.7-fresh-six-validation";
const clone = (value) => structuredClone(value);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function exactKeys(value, keys, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertV4(actual.length === expected.length && actual.every((key, index) => key === expected[index]), `${label}: keys must be ${expected.join(", ")}`);
}

export function normalizeV418Events(eventsDocument) {
  const events = Array.isArray(eventsDocument) ? eventsDocument : eventsDocument?.events;
  assertV4(Array.isArray(events) && events.length > 0, "timestamped event file is empty or malformed");
  for (const [index, event] of events.entries()) {
    assertV4(event && typeof event === "object" && !Array.isArray(event), `events[${index}]: expected object`);
    assertV4(Number.isInteger(event.startMs) && event.startMs >= 0, `events[${index}]: invalid startMs`);
    assertV4(Number.isInteger(event.durationMs) && event.durationMs > 0, `events[${index}]: invalid durationMs`);
    assertV4(typeof event.text === "string" && event.text.trim().length > 0, `events[${index}]: empty text`);
    if (index > 0) assertV4(event.startMs >= events[index - 1].startMs, `events[${index}]: start times are not monotonic`);
  }
  return events;
}

export function lexicalTokens(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? [];
}

export function bagOfWordsRecall(reference, candidate) {
  const referenceTokens = lexicalTokens(reference);
  const available = new Map();
  for (const token of lexicalTokens(candidate)) available.set(token, (available.get(token) ?? 0) + 1);
  let matched = 0;
  for (const token of referenceTokens) {
    const count = available.get(token) ?? 0;
    if (count > 0) {
      matched += 1;
      available.set(token, count - 1);
    }
  }
  return referenceTokens.length ? matched / referenceTokens.length : 0;
}

export function orderedTokenCoverage(reference, candidate) {
  const referenceTokens = lexicalTokens(reference);
  const candidateTokens = lexicalTokens(candidate);
  if (referenceTokens.length === 0) return 0;
  let previous = new Uint16Array(candidateTokens.length + 1);
  for (const referenceToken of referenceTokens) {
    const current = new Uint16Array(candidateTokens.length + 1);
    for (let index = 1; index <= candidateTokens.length; index += 1) {
      current[index] = referenceToken === candidateTokens[index - 1]
        ? previous[index - 1] + 1
        : Math.max(previous[index], current[index - 1]);
    }
    previous = current;
  }
  return previous[candidateTokens.length] / referenceTokens.length;
}

function flattenMoves(output) {
  return output.sections.flatMap((section) => [...section.proMoves, ...section.conMoves]);
}

function canonicalSourceSpan(sourceSpan, packet, events) {
  exactKeys(sourceSpan, ["startEvent", "endEvent", "excerpt"], "sourceSpan");
  assertV4(Number.isInteger(sourceSpan.startEvent) && Number.isInteger(sourceSpan.endEvent), "sourceSpan: event indices must be integers");
  assertV4(sourceSpan.startEvent >= 0 && sourceSpan.startEvent <= sourceSpan.endEvent && sourceSpan.endEvent < events.length, "sourceSpan: invalid event range");
  const startEvent = events[sourceSpan.startEvent];
  const endEvent = events[sourceSpan.endEvent];
  const durationMaximumMs = Math.round(packet.durationSeconds * 1000);
  const endMs = Math.min(durationMaximumMs, endEvent.startMs + endEvent.durationMs);
  assertV4(startEvent.startMs < endMs, "sourceSpan: canonical event time range is empty");
  return { ...sourceSpan, startMs: startEvent.startMs, endMs };
}

export function compileV418PrimaryOutput(output, packet, eventsDocument) {
  const events = normalizeV418Events(eventsDocument);
  return {
    ...clone(output),
    sections: output.sections.map((section) => ({
      ...section,
      proMoves: section.proMoves.map((move) => ({ ...move, sourceSpan: canonicalSourceSpan(move.sourceSpan, packet, events) })),
      conMoves: section.conMoves.map((move) => ({ ...move, sourceSpan: canonicalSourceSpan(move.sourceSpan, packet, events) }))
    }))
  };
}

function toV417Packet(packet) {
  return { ...clone(packet), schemaVersion: V417_PACKET_VERSION, protocolId: V417_PROTOCOL_ID };
}

export function toV417CompiledPrimary(compiledOutput) {
  return { ...clone(compiledOutput), schemaVersion: V417_OUTPUT_VERSION, protocolId: V417_PROTOCOL_ID };
}

export function makeV418PrimarySchema() {
  const schema = makeV417PrimarySchema();
  schema.$id = "slugfester-v418-source-integrity-primary";
  schema.title = "Slugfester v4.1.8 source-integrity primary judgment";
  schema.properties.schemaVersion.const = V418_OUTPUT_VERSION;
  schema.properties.protocolId.const = V418_PROTOCOL_ID;
  for (const sideKey of ["proMoves", "conMoves"]) {
    const sourceSpan = schema.properties.sections.items.properties[sideKey].items.properties.sourceSpan;
    sourceSpan.required = ["startEvent", "endEvent", "excerpt"];
    delete sourceSpan.properties.startMs;
    delete sourceSpan.properties.endMs;
  }
  return schema;
}

export function validateV418PrimaryOutput(output, packet, eventsDocument, eventsFileBytes) {
  assertV4(packet?.schemaVersion === V418_PACKET_VERSION && packet?.protocolId === V418_PROTOCOL_ID, "v4.1.8 source packet identity mismatch");
  assertV4(output?.schemaVersion === V418_OUTPUT_VERSION && output?.protocolId === V418_PROTOCOL_ID, "v4.1.8 primary output identity mismatch");
  assertV4(eventsFileBytes !== undefined && sha256(eventsFileBytes) === packet.sourceChain.eventsSha256, "v4.1.8 event file hash mismatch");
  const events = normalizeV418Events(eventsDocument);
  assertV4(events.length === packet.eventCount, "v4.1.8 event count mismatch");
  const compiled = compileV418PrimaryOutput(output, packet, events);
  const inherited = validateV417PrimaryOutput(toV417CompiledPrimary(compiled), toV417Packet(packet));
  const integrity = [];
  for (const move of flattenMoves(output)) {
    const { startEvent, endEvent, excerpt } = move.sourceSpan;
    const tokenCount = lexicalTokens(excerpt).length;
    assertV4(tokenCount >= V418_EXCERPT_MINIMUM_TOKENS && tokenCount <= V418_EXCERPT_MAXIMUM_TOKENS, `${move.moveId}: excerpt token count outside ${V418_EXCERPT_MINIMUM_TOKENS}..${V418_EXCERPT_MAXIMUM_TOKENS}`);
    const spanText = events.slice(startEvent, endEvent + 1).map((event) => event.text).join(" ");
    const lexicalRecall = bagOfWordsRecall(excerpt, spanText);
    const orderedCoverage = orderedTokenCoverage(excerpt, spanText);
    assertV4(lexicalRecall >= V418_MINIMUM_LEXICAL_RECALL, `${move.moveId}: excerpt lexical recall ${lexicalRecall.toFixed(3)} is below ${V418_MINIMUM_LEXICAL_RECALL}`);
    assertV4(orderedCoverage >= V418_MINIMUM_ORDERED_COVERAGE, `${move.moveId}: excerpt ordered coverage ${orderedCoverage.toFixed(3)} is below ${V418_MINIMUM_ORDERED_COVERAGE}`);
    integrity.push({ moveId: move.moveId, tokenCount, lexicalRecall: Number(lexicalRecall.toFixed(6)), orderedCoverage: Number(orderedCoverage.toFixed(6)) });
  }
  return {
    ...inherited,
    schemaVersion: V418_OUTPUT_VERSION,
    protocolId: V418_PROTOCOL_ID,
    sourceSpanIntegrity: {
      status: "passed",
      eventsHashVerified: true,
      eventCount: events.length,
      repositoryOwnedTimes: true,
      minimumLexicalRecall: V418_MINIMUM_LEXICAL_RECALL,
      minimumOrderedCoverage: V418_MINIMUM_ORDERED_COVERAGE,
      moves: integrity
    }
  };
}

export function selectV418ControlDebates(debateIds) {
  return selectV417ControlDebates(debateIds);
}

export function evaluateV418PrimaryTiming(results, options) {
  return evaluateV417PrimaryTiming(results, options);
}
