import { createHash } from "node:crypto";
import { assertV4 } from "./v41-lean-production.mjs";
import { bagOfWordsRecall, lexicalTokens, normalizeV418Events, orderedTokenCoverage } from "./v418-source-integrity.mjs";

export const V429_ROOT = "docs/calibration/v4.2.9/long-context-partition";
export const V429_PROTOCOL_ID = "v4.2.9-long-context-partition-diagnostic";
export const V429_OUTPUT_VERSION = "4.2.9-long-context-chunk-proposal";
export const V429_MODEL = { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low" };
export const V429_CHUNKS = [
  { chunkId: "chunk-1", startEvent: 0, endEvent: 1758 },
  { chunkId: "chunk-2", startEvent: 1638, endEvent: 3396 }
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function parseLedger(bytes) {
  return bytes.toString("utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
}

export function makeV429ProposalSchema() {
  const response = {
    type: "object",
    additionalProperties: false,
    required: ["kind", "localTargetCandidateIds", "earlierTargetDescription"],
    properties: {
      kind: { type: "string", enum: ["constructive", "local-reply", "earlier-unselected-or-cross-chunk-reply"] },
      localTargetCandidateIds: { type: "array", maxItems: 3, items: { type: "string", minLength: 1 } },
      earlierTargetDescription: { type: "string" }
    }
  };
  const candidate = {
    type: "object",
    additionalProperties: false,
    required: ["candidateId", "side", "speaker", "moveKind", "proposition", "sourceSpan", "attributionConfidence", "attributionBasis", "loadBearingLevel", "loadBearingReason", "responseIntent", "contextSummary", "candidateConfidence"],
    properties: {
      candidateId: { type: "string", minLength: 1 },
      side: { type: "string", enum: ["pro", "con"] },
      speaker: { type: "string", minLength: 1 },
      moveKind: { type: "string", enum: ["constructive", "reply"] },
      proposition: { type: "string", minLength: 25 },
      sourceSpan: {
        type: "object",
        additionalProperties: false,
        required: ["startEvent", "endEvent", "excerpt"],
        properties: {
          startEvent: { type: "integer", minimum: 0 },
          endEvent: { type: "integer", minimum: 0 },
          excerpt: { type: "string", minLength: 30, maxLength: 450 }
        }
      },
      attributionConfidence: { type: "string", enum: ["high", "medium", "low"] },
      attributionBasis: { type: "string", minLength: 40 },
      loadBearingLevel: { type: "string", enum: ["motion", "central", "subsidiary"] },
      loadBearingReason: { type: "string", minLength: 60 },
      responseIntent: response,
      contextSummary: { type: "string", minLength: 80 },
      candidateConfidence: { type: "string", enum: ["high", "medium", "low"] }
    }
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-v429-long-context-chunk-proposal",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "debateNumber", "debateId", "chunkId", "chunkStartEvent", "chunkEndEvent", "reviewerRole", "assessmentModel", "calibrationOnly", "completeChunkReviewed", "candidates"],
    properties: {
      schemaVersion: { const: V429_OUTPUT_VERSION },
      protocolId: { const: V429_PROTOCOL_ID },
      debateNumber: { const: "99" },
      debateId: { const: "jones-jump-digital-physics-god-2019" },
      chunkId: { type: "string", enum: V429_CHUNKS.map((chunk) => chunk.chunkId) },
      chunkStartEvent: { type: "integer", minimum: 0 },
      chunkEndEvent: { type: "integer", minimum: 0 },
      reviewerRole: { const: "score-blind-chunk-proposer" },
      assessmentModel: { const: V429_MODEL.label },
      calibrationOnly: { const: true },
      completeChunkReviewed: { const: true },
      candidates: { type: "array", minItems: 4, maxItems: 12, items: candidate }
    }
  };
}

export function validateV429ChunkLedger(chunkBytes, fullLedgerBytes, chunk) {
  const full = parseLedger(fullLedgerBytes);
  const rows = parseLedger(chunkBytes);
  const expected = full.slice(chunk.startEvent, chunk.endEvent + 1);
  assertV4(rows.length === expected.length, `${chunk.chunkId}: chunk row count mismatch`);
  assertV4(sha256(Buffer.from(rows.map(JSON.stringify).join("\n") + "\n")) === sha256(Buffer.from(expected.map(JSON.stringify).join("\n") + "\n")), `${chunk.chunkId}: chunk rows differ from source ledger`);
  assertV4(rows[0][0] === chunk.startEvent && rows.at(-1)[0] === chunk.endEvent, `${chunk.chunkId}: boundary event mismatch`);
  return { chunkId: chunk.chunkId, startEvent: chunk.startEvent, endEvent: chunk.endEvent, rows: rows.length, bytes: chunkBytes.length, exactSourceSlice: true };
}

export function validateV429Proposal(output, packet, chunk, eventsDocument, eventsBytes, chunkBytes, fullLedgerBytes) {
  assertV4(output.schemaVersion === V429_OUTPUT_VERSION && output.protocolId === V429_PROTOCOL_ID, "v4.2.9 proposal identity mismatch");
  assertV4(output.debateNumber === packet.debateNumber && output.debateId === packet.debateId, "v4.2.9 debate identity mismatch");
  assertV4(output.chunkId === chunk.chunkId && output.chunkStartEvent === chunk.startEvent && output.chunkEndEvent === chunk.endEvent, "v4.2.9 chunk identity mismatch");
  assertV4(sha256(eventsBytes) === packet.sourceChain.eventsSha256, "v4.2.9 event hash mismatch");
  const chunkValidation = validateV429ChunkLedger(chunkBytes, fullLedgerBytes, chunk);
  const events = normalizeV418Events(eventsDocument);
  const candidateIds = new Set();
  let priorKey = null;
  const sourceIntegrity = [];
  for (const candidate of output.candidates) {
    assertV4(!candidateIds.has(candidate.candidateId), `${candidate.candidateId}: duplicate candidate ID`);
    assertV4(packet.sides[candidate.side].speakers.includes(candidate.speaker), `${candidate.candidateId}: speaker/side mismatch`);
    const { startEvent, endEvent, excerpt } = candidate.sourceSpan;
    assertV4(startEvent >= chunk.startEvent && endEvent <= chunk.endEvent && endEvent >= startEvent, `${candidate.candidateId}: source span outside chunk`);
    const key = [startEvent, endEvent, candidate.candidateId];
    if (priorKey) assertV4(priorKey[0] < key[0] || (priorKey[0] === key[0] && (priorKey[1] < key[1] || (priorKey[1] === key[1] && priorKey[2].localeCompare(key[2]) <= 0))), `${candidate.candidateId}: candidates not chronological`);
    const tokens = lexicalTokens(excerpt).length;
    assertV4(tokens >= 12 && tokens <= 100 && excerpt.length <= 450, `${candidate.candidateId}: excerpt bounds failed`);
    const spanText = events.slice(startEvent, endEvent + 1).map((event) => event.text).join(" ");
    const lexicalRecall = bagOfWordsRecall(excerpt, spanText);
    const orderedCoverage = orderedTokenCoverage(excerpt, spanText);
    assertV4(lexicalRecall >= 0.8 && orderedCoverage >= 0.8, `${candidate.candidateId}: excerpt source integrity failed`);
    const response = candidate.responseIntent;
    if (response.kind === "local-reply") {
      assertV4(candidate.moveKind === "reply" && response.localTargetCandidateIds.length > 0 && response.earlierTargetDescription === "", `${candidate.candidateId}: invalid local reply shape`);
      for (const target of response.localTargetCandidateIds) assertV4(candidateIds.has(target), `${candidate.candidateId}: local target must be earlier`);
    } else if (response.kind === "constructive") {
      assertV4(candidate.moveKind === "constructive" && response.localTargetCandidateIds.length === 0 && response.earlierTargetDescription === "", `${candidate.candidateId}: invalid constructive shape`);
    } else {
      assertV4(candidate.moveKind === "reply" && response.localTargetCandidateIds.length === 0 && response.earlierTargetDescription.length >= 30, `${candidate.candidateId}: invalid cross-chunk reply shape`);
    }
    candidateIds.add(candidate.candidateId);
    priorKey = key;
    sourceIntegrity.push({ candidateId: candidate.candidateId, startEvent, endEvent, characterCount: excerpt.length, tokenCount: tokens, lexicalRecall: Number(lexicalRecall.toFixed(6)), orderedCoverage: Number(orderedCoverage.toFixed(6)) });
  }
  return { status: "passed", debateNumber: output.debateNumber, chunk: chunkValidation, candidates: output.candidates.length, sourceIntegrity, scoresDerived: 0 };
}
