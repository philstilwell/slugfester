import { createHash } from "node:crypto";

import { lexicalTokens, normalizeV418Events } from "./v418-source-integrity.mjs";
import { assertV4 } from "./v4-lean-production.mjs";
import {
  compileV422112CandidateBundle,
  validateV422112Discovery,
} from "./v422112-simplified-discovery.mjs";

export const V211_DISCOVERY_PROTOCOL_ID =
  "assessment-production-score-stability-v2.1.1-repository-materialized-discovery";
export const V211_DISCOVERY_OUTPUT_VERSION =
  "1.0-score-stability-v2.1.1-score-blind-chunk-discovery";
export const V211_DISCOVERY_BUNDLE_VERSION =
  "1.0-score-stability-v2.1.1-candidate-bundle";
export const V211_DISCOVERY_MODEL = Object.freeze({
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription",
});
export const V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS = 12;

const TOP_KEYS = [
  "schemaVersion",
  "protocolId",
  "debateNumber",
  "debateId",
  "chunkId",
  "coreStartEvent",
  "coreEndEvent",
  "contextStartEvent",
  "contextEndEvent",
  "reviewerRole",
  "assessmentModel",
  "calibrationOnly",
  "completeCoreReviewed",
  "candidates",
];
const CANDIDATE_KEYS = [
  "candidateId",
  "side",
  "speaker",
  "proposition",
  "sourceWindow",
  "attributionConfidence",
  "attributionBasis",
  "loadBearingLevel",
  "loadBearingReason",
  "responseIntent",
  "contextSummary",
  "candidateConfidence",
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const clone = (value) => structuredClone(value);

function exactKeys(value, keys, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertV4(
    actual.length === expected.length &&
      actual.every((key, index) => key === expected[index]),
    `${label}: keys must be ${expected.join(", ")}`
  );
}

function constOrType(value, type) {
  return value === undefined ? { type } : { type, const: value };
}

function normalizedEvents(eventsDocument) {
  return normalizeV418Events(eventsDocument);
}

function maximumContextTokens(eventsDocument, chunk) {
  const events = normalizedEvents(eventsDocument);
  return lexicalTokens(
    events
      .slice(chunk.coreStartEvent, chunk.contextEndEvent + 1)
      .map((event) => event.text)
      .join(" ")
  ).length;
}

export function buildV211TokenCountedChunkLedger(chunkBytes) {
  assertV4(Buffer.isBuffer(chunkBytes), "token-counted chunk source must be a buffer");
  const sourceRows = chunkBytes
    .toString("utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map(JSON.parse);
  assertV4(sourceRows.length > 0, "token-counted chunk source is empty");
  const rows = sourceRows.map((row, index) => {
    assertV4(
      Array.isArray(row) &&
        row.length === 4 &&
        Number.isInteger(row[0]) &&
        Number.isInteger(row[1]) &&
        Number.isInteger(row[2]) &&
        typeof row[3] === "string",
      `token-counted ledger row ${index}: invalid source shape`
    );
    const tokenCount = lexicalTokens(row[3]).length;
    assertV4(tokenCount > 0, `token-counted ledger row ${row[0]}: no lexical tokens`);
    return [row[0], row[1], row[2], tokenCount, row[3]];
  });
  return Buffer.from(`${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

export function makeV211DiscoverySchema({
  packet,
  chunk,
  eventsDocument,
  candidatesMaximum = 10,
} = {}) {
  assertV4(
    !chunk || eventsDocument,
    "source-specific successor schema requires the event source"
  );
  const allowedSpeakers = packet
    ? [
        ...new Set([
          ...(packet.sides?.pro?.speakers ?? []),
          ...(packet.sides?.con?.speakers ?? []),
        ]),
      ]
    : null;
  const requestedMaximum = chunk
    ? maximumContextTokens(eventsDocument, chunk)
    : 100000;
  const sourceWindow = {
    type: "object",
    additionalProperties: false,
    required: ["startEvent", "requestedLexicalTokens"],
    properties: {
      startEvent: chunk
        ? {
            type: "integer",
            minimum: chunk.coreStartEvent,
            maximum: chunk.coreEndEvent,
          }
        : { type: "integer", minimum: 0 },
      requestedLexicalTokens: {
        type: "integer",
        minimum: V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
        maximum: requestedMaximum,
      },
    },
  };
  const responseIntent = {
    type: "object",
    additionalProperties: false,
    required: ["kind", "earlierTargetDescription"],
    properties: {
      kind: { type: "string", enum: ["constructive", "reply"] },
      earlierTargetDescription: { type: "string" },
    },
  };
  const candidate = {
    type: "object",
    additionalProperties: false,
    required: CANDIDATE_KEYS,
    properties: {
      candidateId: { type: "string", minLength: 1 },
      side: { type: "string", enum: ["pro", "con"] },
      speaker: allowedSpeakers?.length
        ? { type: "string", enum: allowedSpeakers }
        : { type: "string", minLength: 1 },
      proposition: { type: "string", minLength: 25 },
      sourceWindow,
      attributionConfidence: {
        type: "string",
        enum: ["high", "medium", "low"],
      },
      attributionBasis: { type: "string", minLength: 40 },
      loadBearingLevel: {
        type: "string",
        enum: ["motion", "central", "subsidiary"],
      },
      loadBearingReason: { type: "string", minLength: 60 },
      responseIntent,
      contextSummary: { type: "string", minLength: 60 },
      candidateConfidence: {
        type: "string",
        enum: ["high", "medium", "low"],
      },
    },
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-score-stability-v2.1.1-repository-materialized-discovery",
    type: "object",
    additionalProperties: false,
    required: TOP_KEYS,
    properties: {
      schemaVersion: { type: "string", const: V211_DISCOVERY_OUTPUT_VERSION },
      protocolId: { type: "string", const: V211_DISCOVERY_PROTOCOL_ID },
      debateNumber: constOrType(packet?.debateNumber, "string"),
      debateId: constOrType(packet?.debateId, "string"),
      chunkId: constOrType(chunk?.chunkId, "string"),
      coreStartEvent: chunk
        ? { type: "integer", const: chunk.coreStartEvent }
        : { type: "integer", minimum: 0 },
      coreEndEvent: chunk
        ? { type: "integer", const: chunk.coreEndEvent }
        : { type: "integer", minimum: 0 },
      contextStartEvent: chunk
        ? { type: "integer", const: chunk.contextStartEvent }
        : { type: "integer", minimum: 0 },
      contextEndEvent: chunk
        ? { type: "integer", const: chunk.contextEndEvent }
        : { type: "integer", minimum: 0 },
      reviewerRole: {
        type: "string",
        const: "score-blind-source-discovery",
      },
      assessmentModel: { type: "string", const: V211_DISCOVERY_MODEL.label },
      calibrationOnly: { type: "boolean", const: true },
      completeCoreReviewed: { type: "boolean", const: true },
      candidates: {
        type: "array",
        minItems: 0,
        maxItems: candidatesMaximum,
        items: candidate,
      },
    },
  };
}

export function materializeV211SourceWindow(sourceWindow, { chunk, eventsDocument }) {
  exactKeys(
    sourceWindow,
    ["startEvent", "requestedLexicalTokens"],
    "repository-materialized source window"
  );
  const { startEvent, requestedLexicalTokens } = sourceWindow;
  assertV4(
    Number.isInteger(startEvent) &&
      startEvent >= chunk.coreStartEvent &&
      startEvent <= chunk.coreEndEvent,
    "source window start violates chunk ownership"
  );
  assertV4(
    Number.isInteger(requestedLexicalTokens) &&
      requestedLexicalTokens >= V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
    `source window requests fewer than ${V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS} lexical tokens`
  );
  const events = normalizedEvents(eventsDocument);
  let materializedLexicalTokens = 0;
  let endEvent = null;
  for (let index = startEvent; index <= chunk.contextEndEvent; index += 1) {
    materializedLexicalTokens += lexicalTokens(events[index].text).length;
    if (materializedLexicalTokens >= requestedLexicalTokens) {
      endEvent = index;
      break;
    }
  }
  assertV4(
    endEvent !== null,
    "source window request exceeds the available locked lookahead"
  );
  return {
    startEvent,
    endEvent,
    requestedLexicalTokens,
    materializedLexicalTokens,
    repositoryMaterialized: true,
  };
}

function toV422112CompatibilityOutput(output, args) {
  return {
    ...clone(output),
    schemaVersion: "4.2.21.12-score-blind-chunk-discovery",
    protocolId: "v4.2.21.12-simplified-partition-discovery",
    candidates: output.candidates.map((candidate) => {
      const materialized = materializeV211SourceWindow(
        candidate.sourceWindow,
        args
      );
      const compatible = clone(candidate);
      delete compatible.sourceWindow;
      compatible.sourceSpan = {
        startEvent: materialized.startEvent,
        endEvent: materialized.endEvent,
      };
      return compatible;
    }),
  };
}

export function validateV211Discovery(output, args) {
  exactKeys(output, TOP_KEYS, "v2.1.1 discovery output");
  assertV4(
    output.schemaVersion === V211_DISCOVERY_OUTPUT_VERSION &&
      output.protocolId === V211_DISCOVERY_PROTOCOL_ID,
    "v2.1.1 discovery output identity mismatch"
  );
  for (const [index, candidate] of output.candidates.entries()) {
    exactKeys(candidate, CANDIDATE_KEYS, `candidates[${index}]`);
    exactKeys(
      candidate.sourceWindow,
      ["startEvent", "requestedLexicalTokens"],
      `${candidate.candidateId}.sourceWindow`
    );
    assertV4(
      Number.isInteger(candidate.sourceWindow.requestedLexicalTokens) &&
        candidate.sourceWindow.requestedLexicalTokens >=
          V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
      `${candidate.candidateId}: source window requests fewer than ${V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS} lexical tokens`
    );
  }
  const compatibilityOutput = toV422112CompatibilityOutput(output, args);
  const inherited = validateV422112Discovery(compatibilityOutput, args);
  const materializedWindows = output.candidates.map((candidate) => ({
    candidateId: candidate.candidateId,
    ...materializeV211SourceWindow(candidate.sourceWindow, args),
  }));
  return {
    ...inherited,
    schemaVersion: V211_DISCOVERY_OUTPUT_VERSION,
    protocolId: V211_DISCOVERY_PROTOCOL_ID,
    materializedWindows,
    repositoryMaterializedSourceWindows: true,
    modelAuthoredEndEvents: false,
    minimumLexicalTokens:
      V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
  };
}

export function migrateV422112OutputToV211ForRegression(
  predecessorOutput,
  eventsDocument
) {
  const events = normalizedEvents(eventsDocument);
  return {
    ...clone(predecessorOutput),
    schemaVersion: V211_DISCOVERY_OUTPUT_VERSION,
    protocolId: V211_DISCOVERY_PROTOCOL_ID,
    candidates: predecessorOutput.candidates.map((candidate) => {
      const migrated = clone(candidate);
      const requestedLexicalTokens = lexicalTokens(
        events
          .slice(candidate.sourceSpan.startEvent, candidate.sourceSpan.endEvent + 1)
          .map((event) => event.text)
          .join(" ")
      ).length;
      migrated.sourceWindow = {
        startEvent: candidate.sourceSpan.startEvent,
        requestedLexicalTokens,
      };
      delete migrated.sourceSpan;
      return migrated;
    }),
  };
}

export function compileV211CandidateBundle({
  packet,
  plan,
  outputs,
  eventsDocument,
}) {
  const compatibleOutputs = outputs.map((output) => {
    const chunk = plan.chunks.find((item) => item.chunkId === output.chunkId);
    assertV4(chunk, `${output.chunkId}: successor chunk missing from plan`);
    return toV422112CompatibilityOutput(output, { chunk, eventsDocument });
  });
  const predecessor = compileV422112CandidateBundle({
    packet,
    plan,
    outputs: compatibleOutputs,
  });
  return {
    ...predecessor,
    schemaVersion: V211_DISCOVERY_BUNDLE_VERSION,
    protocolId: V211_DISCOVERY_PROTOCOL_ID,
    completeSourceDiscovery: {
      ...predecessor.completeSourceDiscovery,
      repositoryMaterializedSourceWindows: true,
      modelAuthoredEndEvents: false,
      minimumLexicalTokens:
        V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
      boundaryContinuationRule:
        "a move beginning in lookbehind remains owned by the predecessor chunk",
    },
  };
}

export function hashV211Bytes(value) {
  return sha256(value);
}
