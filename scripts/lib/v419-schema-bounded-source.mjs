import { createHash } from "node:crypto";
import { validateV417PrimaryOutput } from "./v417-fresh-validation.mjs";
import { assertV4 } from "./v41-lean-production.mjs";
import {
  V418_MODEL,
  V418_MINIMUM_LEXICAL_RECALL,
  V418_MINIMUM_ORDERED_COVERAGE,
  bagOfWordsRecall,
  compileV418PrimaryOutput,
  deriveV418PrimaryScores,
  evaluateV418Escalation,
  evaluateV418PrimaryTiming,
  lexicalTokens,
  makeV418PrimarySchema,
  normalizeV418Events,
  orderedTokenCoverage,
  selectV418ControlDebates,
  toV417CompiledPrimary
} from "./v418-source-integrity.mjs";

export const V419_ROOT = "docs/calibration/v4.1.9/schema-bounded-fresh-six-gate";
export const V419_PROTOCOL_ID = "v4.1.9-schema-bounded-source-fresh-six-validation";
export const V419_PACKET_VERSION = "4.1.9-schema-bounded-source-only-packet";
export const V419_OUTPUT_VERSION = "4.1.9-schema-bounded-primary-output";
export const V419_MODEL = V418_MODEL;
export const V419_EXCERPT_MINIMUM_TOKENS = 12;
export const V419_EXCERPT_MAXIMUM_TOKENS = 100;
export const V419_EXCERPT_MAXIMUM_CHARACTERS = 600;
export const V419_MINIMUM_LEXICAL_RECALL = V418_MINIMUM_LEXICAL_RECALL;
export const V419_MINIMUM_ORDERED_COVERAGE = V418_MINIMUM_ORDERED_COVERAGE;

const clone = (value) => structuredClone(value);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function exactKeys(value, keys, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertV4(actual.length === expected.length && actual.every((key, index) => key === expected[index]), `${label}: keys must be ${expected.join(", ")}`);
}

function toV417Packet(packet) {
  return { ...clone(packet), schemaVersion: "4.1.7-bounded-source-only-packet", protocolId: "v4.1.7-fresh-six-validation" };
}

export function makeV419PrimarySchema() {
  const schema = makeV418PrimarySchema();
  schema.$id = "slugfester-v419-schema-bounded-source-primary";
  schema.title = "Slugfester v4.1.9 schema-bounded source-integrity primary judgment";
  schema.properties.schemaVersion.const = V419_OUTPUT_VERSION;
  schema.properties.protocolId.const = V419_PROTOCOL_ID;
  for (const sideKey of ["proMoves", "conMoves"]) {
    schema.properties.sections.items.properties[sideKey].items.properties.sourceSpan.properties.excerpt.maxLength = V419_EXCERPT_MAXIMUM_CHARACTERS;
  }
  return schema;
}

export function compileV419PrimaryOutput(output, packet, eventsDocument) {
  return compileV418PrimaryOutput(output, packet, eventsDocument);
}

export function validateV419PrimaryOutput(output, packet, eventsDocument, eventsFileBytes) {
  assertV4(packet?.schemaVersion === V419_PACKET_VERSION && packet?.protocolId === V419_PROTOCOL_ID, "v4.1.9 source packet identity mismatch");
  assertV4(output?.schemaVersion === V419_OUTPUT_VERSION && output?.protocolId === V419_PROTOCOL_ID, "v4.1.9 primary output identity mismatch");
  assertV4(eventsFileBytes !== undefined && sha256(eventsFileBytes) === packet.sourceChain.eventsSha256, "v4.1.9 event file hash mismatch");
  const events = normalizeV418Events(eventsDocument);
  assertV4(events.length === packet.eventCount, "v4.1.9 event count mismatch");
  const compiled = compileV419PrimaryOutput(output, packet, events);
  const inherited = validateV417PrimaryOutput(toV417CompiledPrimary(compiled), toV417Packet(packet));
  const integrity = [];
  for (const move of output.sections.flatMap((section) => [...section.proMoves, ...section.conMoves])) {
    exactKeys(move.sourceSpan, ["startEvent", "endEvent", "excerpt"], `${move.moveId}.sourceSpan`);
    const { startEvent, endEvent, excerpt } = move.sourceSpan;
    assertV4(excerpt.length <= V419_EXCERPT_MAXIMUM_CHARACTERS, `${move.moveId}: excerpt exceeds ${V419_EXCERPT_MAXIMUM_CHARACTERS} characters`);
    const tokenCount = lexicalTokens(excerpt).length;
    assertV4(tokenCount >= V419_EXCERPT_MINIMUM_TOKENS && tokenCount <= V419_EXCERPT_MAXIMUM_TOKENS, `${move.moveId}: excerpt token count outside ${V419_EXCERPT_MINIMUM_TOKENS}..${V419_EXCERPT_MAXIMUM_TOKENS}`);
    const spanText = events.slice(startEvent, endEvent + 1).map((event) => event.text).join(" ");
    const lexicalRecall = bagOfWordsRecall(excerpt, spanText);
    const orderedCoverage = orderedTokenCoverage(excerpt, spanText);
    assertV4(lexicalRecall >= V419_MINIMUM_LEXICAL_RECALL, `${move.moveId}: excerpt lexical recall ${lexicalRecall.toFixed(3)} is below ${V419_MINIMUM_LEXICAL_RECALL}`);
    assertV4(orderedCoverage >= V419_MINIMUM_ORDERED_COVERAGE, `${move.moveId}: excerpt ordered coverage ${orderedCoverage.toFixed(3)} is below ${V419_MINIMUM_ORDERED_COVERAGE}`);
    integrity.push({ moveId: move.moveId, characterCount: excerpt.length, tokenCount, lexicalRecall: Number(lexicalRecall.toFixed(6)), orderedCoverage: Number(orderedCoverage.toFixed(6)) });
  }
  return {
    ...inherited,
    schemaVersion: V419_OUTPUT_VERSION,
    protocolId: V419_PROTOCOL_ID,
    sourceSpanIntegrity: {
      status: "passed",
      eventsHashVerified: true,
      eventCount: events.length,
      repositoryOwnedTimes: true,
      maximumCharacters: V419_EXCERPT_MAXIMUM_CHARACTERS,
      maximumTokens: V419_EXCERPT_MAXIMUM_TOKENS,
      minimumLexicalRecall: V419_MINIMUM_LEXICAL_RECALL,
      minimumOrderedCoverage: V419_MINIMUM_ORDERED_COVERAGE,
      moves: integrity
    }
  };
}

export function deriveV419PrimaryScores(compiledOutput) {
  const scores = deriveV418PrimaryScores(compiledOutput);
  return { ...scores, protocolId: V419_PROTOCOL_ID };
}

export function evaluateV419Escalation(args) {
  return evaluateV418Escalation(args);
}

export function evaluateV419PrimaryTiming(results, options) {
  return evaluateV418PrimaryTiming(results, options);
}

export function selectV419ControlDebates(debateIds) {
  return selectV418ControlDebates(debateIds);
}
