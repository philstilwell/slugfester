import { createHash } from "node:crypto";

import { lexicalTokens, normalizeV418Events } from "./v418-source-integrity.mjs";
import { assertV4 } from "./v4-lean-production.mjs";
import {
  compileV422112CandidateBundle,
  validateV422112Discovery,
} from "./v422112-simplified-discovery.mjs";
import {
  V211_DISCOVERY_MODEL,
  buildV211TokenCountedChunkLedger,
  materializeV211SourceWindow,
} from "./assessment-production-score-stability-v2.1.1-discovery.mjs";

export const V212_DISCOVERY_PROTOCOL_ID =
  "assessment-production-score-stability-v2.1.2-bounded-end-discovery";
export const V212_DISCOVERY_OUTPUT_VERSION =
  "1.0-score-stability-v2.1.2-score-blind-chunk-discovery";
export const V212_DISCOVERY_BUNDLE_VERSION =
  "1.0-score-stability-v2.1.2-candidate-bundle";
export const V212_DISCOVERY_MODEL = V211_DISCOVERY_MODEL;
export const V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS = 12;

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
  assertV4(
    value && typeof value === "object" && !Array.isArray(value),
    `${label}: expected object`
  );
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

export const buildV212TokenCountedChunkLedger =
  buildV211TokenCountedChunkLedger;

export function makeV212DiscoverySchema({
  packet,
  chunk,
  candidatesMaximum = 10,
} = {}) {
  const allowedSpeakers = packet
    ? [
        ...new Set([
          ...(packet.sides?.pro?.speakers ?? []),
          ...(packet.sides?.con?.speakers ?? []),
        ]),
      ]
    : null;
  const sourceWindow = {
    type: "object",
    additionalProperties: false,
    required: ["startEvent", "endEvent"],
    properties: {
      startEvent: chunk
        ? {
            type: "integer",
            minimum: chunk.coreStartEvent,
            maximum: chunk.coreEndEvent,
          }
        : { type: "integer", minimum: 0 },
      endEvent: chunk
        ? {
            type: "integer",
            minimum: chunk.coreStartEvent,
            maximum: chunk.contextEndEvent,
          }
        : { type: "integer", minimum: 0 },
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
    $id: "slugfester-score-stability-v2.1.2-bounded-end-discovery",
    type: "object",
    additionalProperties: false,
    required: TOP_KEYS,
    properties: {
      schemaVersion: { type: "string", const: V212_DISCOVERY_OUTPUT_VERSION },
      protocolId: { type: "string", const: V212_DISCOVERY_PROTOCOL_ID },
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
      assessmentModel: { type: "string", const: V212_DISCOVERY_MODEL.label },
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

export function deriveV212SourceWindow(sourceWindow, { chunk, eventsDocument }) {
  exactKeys(sourceWindow, ["startEvent", "endEvent"], "bounded source window");
  const { startEvent, endEvent } = sourceWindow;
  assertV4(
    Number.isInteger(startEvent) &&
      startEvent >= chunk.coreStartEvent &&
      startEvent <= chunk.coreEndEvent,
    "source window start violates chunk ownership"
  );
  assertV4(
    Number.isInteger(endEvent) &&
      endEvent >= startEvent &&
      endEvent <= chunk.contextEndEvent,
    "source window end violates start order or locked lookahead"
  );
  const events = normalizedEvents(eventsDocument);
  const repositoryDerivedLexicalTokens = lexicalTokens(
    events
      .slice(startEvent, endEvent + 1)
      .map((event) => event.text)
      .join(" ")
  ).length;
  assertV4(
    repositoryDerivedLexicalTokens >= V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
    `source window has fewer than ${V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS} lexical tokens`
  );
  return {
    startEvent,
    endEvent,
    repositoryDerivedLexicalTokens,
    minimumLexicalTokens: V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
    modelAuthoredLexicalTokenCount: false,
    endBoundedByLockedContext: true,
  };
}

function toV422112CompatibilityOutput(output) {
  return {
    ...clone(output),
    schemaVersion: "4.2.21.12-score-blind-chunk-discovery",
    protocolId: "v4.2.21.12-simplified-partition-discovery",
    candidates: output.candidates.map((candidate) => {
      const compatible = clone(candidate);
      compatible.sourceSpan = clone(candidate.sourceWindow);
      delete compatible.sourceWindow;
      return compatible;
    }),
  };
}

export function validateV212Discovery(output, args) {
  exactKeys(output, TOP_KEYS, "v2.1.2 discovery output");
  assertV4(
    output.schemaVersion === V212_DISCOVERY_OUTPUT_VERSION &&
      output.protocolId === V212_DISCOVERY_PROTOCOL_ID,
    "v2.1.2 discovery output identity mismatch"
  );
  const derivedWindows = [];
  for (const [index, candidate] of output.candidates.entries()) {
    exactKeys(candidate, CANDIDATE_KEYS, `candidates[${index}]`);
    exactKeys(
      candidate.sourceWindow,
      ["startEvent", "endEvent"],
      `${candidate.candidateId}.sourceWindow`
    );
    derivedWindows.push({
      candidateId: candidate.candidateId,
      ...deriveV212SourceWindow(candidate.sourceWindow, args),
    });
  }
  const inherited = validateV422112Discovery(
    toV422112CompatibilityOutput(output),
    args
  );
  return {
    ...inherited,
    schemaVersion: V212_DISCOVERY_OUTPUT_VERSION,
    protocolId: V212_DISCOVERY_PROTOCOL_ID,
    derivedWindows,
    repositoryDerivedLexicalTokenCounts: true,
    modelAuthoredLexicalTokenCounts: false,
    modelAuthoredBoundedEndEvents: true,
    startDependentLockedLookaheadCapacityStructurallyBounded: true,
    minimumLexicalTokens: V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
  };
}

export function migrateV422112OutputToV212ForRegression(predecessorOutput) {
  return {
    ...clone(predecessorOutput),
    schemaVersion: V212_DISCOVERY_OUTPUT_VERSION,
    protocolId: V212_DISCOVERY_PROTOCOL_ID,
    candidates: predecessorOutput.candidates.map((candidate) => {
      const migrated = clone(candidate);
      migrated.sourceWindow = clone(candidate.sourceSpan);
      delete migrated.sourceSpan;
      return migrated;
    }),
  };
}

export function migrateV211OutputToV212ForRegression(
  predecessorOutput,
  { chunk, eventsDocument }
) {
  return {
    ...clone(predecessorOutput),
    schemaVersion: V212_DISCOVERY_OUTPUT_VERSION,
    protocolId: V212_DISCOVERY_PROTOCOL_ID,
    candidates: predecessorOutput.candidates.map((candidate) => {
      const migrated = clone(candidate);
      const materialized = materializeV211SourceWindow(
        candidate.sourceWindow,
        { chunk, eventsDocument }
      );
      migrated.sourceWindow = {
        startEvent: materialized.startEvent,
        endEvent: materialized.endEvent,
      };
      return migrated;
    }),
  };
}

export function compileV212CandidateBundle({ packet, plan, outputs }) {
  const compatibleOutputs = outputs.map(toV422112CompatibilityOutput);
  const predecessor = compileV422112CandidateBundle({
    packet,
    plan,
    outputs: compatibleOutputs,
  });
  return {
    ...predecessor,
    schemaVersion: V212_DISCOVERY_BUNDLE_VERSION,
    protocolId: V212_DISCOVERY_PROTOCOL_ID,
    completeSourceDiscovery: {
      ...predecessor.completeSourceDiscovery,
      repositoryDerivedLexicalTokenCounts: true,
      modelAuthoredLexicalTokenCounts: false,
      modelAuthoredBoundedEndEvents: true,
      startDependentLockedLookaheadCapacityStructurallyBounded: true,
      minimumLexicalTokens: V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
      boundaryContinuationRule:
        "a move beginning in lookbehind remains owned by the predecessor chunk",
    },
  };
}

export function hashV212Bytes(value) {
  return sha256(value);
}
