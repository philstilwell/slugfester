import { createHash } from "node:crypto";
import { assertV4 } from "./v4-lean-production.mjs";
import { lexicalTokens, normalizeV418Events } from "./v418-source-integrity.mjs";

export const V42219_ROOT = "docs/calibration/v4.2.21.9/generalized-partition";
export const V42219_PROTOCOL_ID = "v4.2.21.9-generalized-partition";
export const V42219_PLAN_VERSION = "4.2.21.9-partition-plan";
export const V42219_OUTPUT_VERSION = "4.2.21.9-score-blind-chunk-discovery";
export const V42219_BUNDLE_VERSION = "4.2.21.9-candidate-bundle";
export const V42219_MODEL = Object.freeze({ label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low" });
export const V42219_LIMITS = Object.freeze({
  contextEventsMaximum: 900,
  contextBytesMaximum: 70000,
  boundaryContextEvents: 40,
  candidatesPerChunkMaximum: 10
});

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const clone = (value) => structuredClone(value);

function exactKeys(value, keys, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertV4(actual.length === expected.length && actual.every((key, index) => key === expected[index]), `${label}: keys must be ${expected.join(", ")}`);
}

export function parseV42219Ledger(bytes) {
  assertV4(Buffer.isBuffer(bytes), "partition source ledger must be a buffer");
  const text = bytes.toString("utf8").trim();
  assertV4(text.length > 0, "partition source ledger is empty");
  const rows = text.split("\n").map(JSON.parse);
  for (const [index, row] of rows.entries()) {
    assertV4(Array.isArray(row) && row.length === 4 && row[0] === index, `ledger row ${index}: invalid event index or shape`);
  }
  return rows;
}

export function serializeV42219Rows(rows) {
  return Buffer.from(`${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function ledgerIndex(rows) {
  const lineBytes = rows.map((row) => Buffer.byteLength(`${JSON.stringify(row)}\n`));
  const prefix = [0];
  for (const bytes of lineBytes) prefix.push(prefix.at(-1) + bytes);
  return { lineBytes, prefix, rangeBytes: (start, end) => prefix[end + 1] - prefix[start] };
}

export function planV42219Partition(fullLedgerBytes, overrides = {}) {
  const limits = { ...V42219_LIMITS, ...overrides };
  for (const key of ["contextEventsMaximum", "contextBytesMaximum", "boundaryContextEvents", "candidatesPerChunkMaximum"]) {
    assertV4(Number.isInteger(limits[key]) && limits[key] >= 0, `${key}: expected non-negative integer`);
  }
  assertV4(limits.contextEventsMaximum >= 3 && limits.contextBytesMaximum > 0, "partition context limits are too small");
  assertV4(limits.boundaryContextEvents * 2 < limits.contextEventsMaximum, "boundary context must leave owned events");
  const rows = parseV42219Ledger(fullLedgerBytes);
  const index = ledgerIndex(rows);
  const chunks = [];
  let coreStartEvent = 0;
  while (coreStartEvent < rows.length) {
    const contextStartEvent = Math.max(0, coreStartEvent - limits.boundaryContextEvents);
    let accepted = null;
    for (let coreEndEvent = coreStartEvent; coreEndEvent < rows.length; coreEndEvent += 1) {
      const contextEndEvent = Math.min(rows.length - 1, coreEndEvent + limits.boundaryContextEvents);
      const contextEvents = contextEndEvent - contextStartEvent + 1;
      const contextBytes = index.rangeBytes(contextStartEvent, contextEndEvent);
      if (contextEvents > limits.contextEventsMaximum || contextBytes > limits.contextBytesMaximum) break;
      accepted = { coreEndEvent, contextEndEvent, contextEvents, contextBytes };
    }
    assertV4(accepted, `event ${coreStartEvent}: one owned event plus boundary context exceeds a partition ceiling`);
    const chunkId = `chunk-${String(chunks.length + 1).padStart(3, "0")}`;
    const contextRows = rows.slice(contextStartEvent, accepted.contextEndEvent + 1);
    chunks.push({
      chunkId,
      coreStartEvent,
      coreEndEvent: accepted.coreEndEvent,
      coreEvents: accepted.coreEndEvent - coreStartEvent + 1,
      contextStartEvent,
      contextEndEvent: accepted.contextEndEvent,
      contextEvents: accepted.contextEvents,
      contextBytes: accepted.contextBytes,
      contextSha256: sha256(serializeV42219Rows(contextRows))
    });
    coreStartEvent = accepted.coreEndEvent + 1;
  }
  const plan = {
    schemaVersion: V42219_PLAN_VERSION,
    protocolId: V42219_PROTOCOL_ID,
    ledgerEvents: rows.length,
    ledgerBytes: fullLedgerBytes.length,
    ledgerSha256: sha256(fullLedgerBytes),
    limits,
    chunks,
    coverage: {
      firstOwnedEvent: chunks[0].coreStartEvent,
      lastOwnedEvent: chunks.at(-1).coreEndEvent,
      everyEventOwnedExactlyOnce: true,
      boundaryContextMayRepeat: true,
      candidateOwnershipRule: "candidate sourceSpan.startEvent must be in exactly one chunk core"
    }
  };
  validateV42219PartitionPlan(plan, fullLedgerBytes);
  return plan;
}

export function validateV42219PartitionPlan(plan, fullLedgerBytes) {
  const rows = parseV42219Ledger(fullLedgerBytes);
  assertV4(plan?.schemaVersion === V42219_PLAN_VERSION && plan?.protocolId === V42219_PROTOCOL_ID, "partition plan identity mismatch");
  assertV4(plan.ledgerEvents === rows.length && plan.ledgerBytes === fullLedgerBytes.length && plan.ledgerSha256 === sha256(fullLedgerBytes), "partition plan source identity mismatch");
  assertV4(Array.isArray(plan.chunks) && plan.chunks.length > 1, "partition plan must contain more than one chunk");
  let nextOwned = 0;
  for (const [index, chunk] of plan.chunks.entries()) {
    assertV4(chunk.chunkId === `chunk-${String(index + 1).padStart(3, "0")}`, `${chunk.chunkId}: noncanonical chunk ID`);
    assertV4(chunk.coreStartEvent === nextOwned && chunk.coreEndEvent >= chunk.coreStartEvent, `${chunk.chunkId}: owned ranges are not contiguous`);
    assertV4(chunk.contextStartEvent === Math.max(0, chunk.coreStartEvent - plan.limits.boundaryContextEvents), `${chunk.chunkId}: invalid lookbehind boundary`);
    assertV4(chunk.contextStartEvent <= chunk.coreStartEvent && chunk.contextEndEvent >= chunk.coreEndEvent && chunk.contextEndEvent < rows.length, `${chunk.chunkId}: context does not contain its owned core`);
    assertV4(chunk.contextEndEvent <= Math.min(rows.length - 1, chunk.coreEndEvent + plan.limits.boundaryContextEvents), `${chunk.chunkId}: invalid lookahead boundary`);
    const bytes = serializeV42219Rows(rows.slice(chunk.contextStartEvent, chunk.contextEndEvent + 1));
    assertV4(chunk.coreEvents === chunk.coreEndEvent - chunk.coreStartEvent + 1 && chunk.contextEvents === chunk.contextEndEvent - chunk.contextStartEvent + 1, `${chunk.chunkId}: event counts do not replay`);
    assertV4(chunk.contextEvents <= plan.limits.contextEventsMaximum && bytes.length <= plan.limits.contextBytesMaximum, `${chunk.chunkId}: context ceiling exceeded`);
    assertV4(chunk.contextBytes === bytes.length && chunk.contextSha256 === sha256(bytes), `${chunk.chunkId}: context hash does not replay`);
    nextOwned = chunk.coreEndEvent + 1;
  }
  assertV4(nextOwned === rows.length, "partition plan does not own every source event exactly once");
  return { status: "passed", chunks: plan.chunks.length, ledgerEvents: rows.length, exactOwnedCoverage: true, contextCeilingsPassed: true };
}

export function buildV42219ChunkLedger(fullLedgerBytes, chunk) {
  const rows = parseV42219Ledger(fullLedgerBytes);
  const bytes = serializeV42219Rows(rows.slice(chunk.contextStartEvent, chunk.contextEndEvent + 1));
  assertV4(bytes.length === chunk.contextBytes && sha256(bytes) === chunk.contextSha256, `${chunk.chunkId}: generated context does not match plan`);
  return bytes;
}

export function validateV42219ChunkLedger(chunkBytes, fullLedgerBytes, chunk) {
  const fullRows = parseV42219Ledger(fullLedgerBytes);
  const rows = chunkBytes.toString("utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
  const expected = fullRows.slice(chunk.contextStartEvent, chunk.contextEndEvent + 1);
  assertV4(rows.length === expected.length, `${chunk.chunkId}: chunk row count mismatch`);
  const expectedBytes = serializeV42219Rows(expected);
  assertV4(chunkBytes.equals(expectedBytes) && sha256(chunkBytes) === chunk.contextSha256, `${chunk.chunkId}: chunk rows differ from the source ledger`);
  assertV4(rows[0][0] === chunk.contextStartEvent && rows.at(-1)[0] === chunk.contextEndEvent, `${chunk.chunkId}: chunk boundary mismatch`);
  return { status: "passed", chunkId: chunk.chunkId, rows: rows.length, bytes: chunkBytes.length, exactSourceSlice: true };
}

function constOrType(value, type) {
  return value === undefined ? { type } : { type, const: value };
}

export function makeV42219DiscoverySchema({ packet, chunk } = {}) {
  const responseIntent = {
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
    required: ["candidateId", "side", "speaker", "proposition", "sourceSpan", "attributionConfidence", "attributionBasis", "loadBearingLevel", "loadBearingReason", "responseIntent", "contextSummary", "candidateConfidence"],
    properties: {
      candidateId: { type: "string", minLength: 1 },
      side: { type: "string", enum: ["pro", "con"] },
      speaker: { type: "string", minLength: 1 },
      proposition: { type: "string", minLength: 25 },
      sourceSpan: { type: "object", additionalProperties: false, required: ["startEvent", "endEvent"], properties: { startEvent: { type: "integer", minimum: 0 }, endEvent: { type: "integer", minimum: 0 } } },
      attributionConfidence: { type: "string", enum: ["high", "medium", "low"] },
      attributionBasis: { type: "string", minLength: 40 },
      loadBearingLevel: { type: "string", enum: ["motion", "central", "subsidiary"] },
      loadBearingReason: { type: "string", minLength: 60 },
      responseIntent,
      contextSummary: { type: "string", minLength: 60 },
      candidateConfidence: { type: "string", enum: ["high", "medium", "low"] }
    }
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-v42219-score-blind-chunk-discovery",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "debateNumber", "debateId", "chunkId", "coreStartEvent", "coreEndEvent", "contextStartEvent", "contextEndEvent", "reviewerRole", "assessmentModel", "calibrationOnly", "completeCoreReviewed", "candidates"],
    properties: {
      schemaVersion: { type: "string", const: V42219_OUTPUT_VERSION },
      protocolId: { type: "string", const: V42219_PROTOCOL_ID },
      debateNumber: constOrType(packet?.debateNumber, "string"),
      debateId: constOrType(packet?.debateId, "string"),
      chunkId: constOrType(chunk?.chunkId, "string"),
      coreStartEvent: chunk ? { type: "integer", const: chunk.coreStartEvent } : { type: "integer", minimum: 0 },
      coreEndEvent: chunk ? { type: "integer", const: chunk.coreEndEvent } : { type: "integer", minimum: 0 },
      contextStartEvent: chunk ? { type: "integer", const: chunk.contextStartEvent } : { type: "integer", minimum: 0 },
      contextEndEvent: chunk ? { type: "integer", const: chunk.contextEndEvent } : { type: "integer", minimum: 0 },
      reviewerRole: { type: "string", const: "score-blind-source-discovery" },
      assessmentModel: { type: "string", const: V42219_MODEL.label },
      calibrationOnly: { type: "boolean", const: true },
      completeCoreReviewed: { type: "boolean", const: true },
      candidates: { type: "array", minItems: 0, maxItems: V42219_LIMITS.candidatesPerChunkMaximum, items: candidate }
    }
  };
}

export function validateV42219Discovery(output, { packet, chunk, plan, eventsDocument, eventsBytes, chunkBytes, fullLedgerBytes }) {
  exactKeys(output, ["schemaVersion", "protocolId", "debateNumber", "debateId", "chunkId", "coreStartEvent", "coreEndEvent", "contextStartEvent", "contextEndEvent", "reviewerRole", "assessmentModel", "calibrationOnly", "completeCoreReviewed", "candidates"], "discovery output");
  assertV4(output.schemaVersion === V42219_OUTPUT_VERSION && output.protocolId === V42219_PROTOCOL_ID, "discovery output identity mismatch");
  assertV4(output.debateNumber === packet.debateNumber && output.debateId === packet.debateId, "discovery debate identity mismatch");
  assertV4(output.chunkId === chunk.chunkId && output.coreStartEvent === chunk.coreStartEvent && output.coreEndEvent === chunk.coreEndEvent && output.contextStartEvent === chunk.contextStartEvent && output.contextEndEvent === chunk.contextEndEvent, `${chunk.chunkId}: discovery boundaries mismatch`);
  assertV4(output.reviewerRole === "score-blind-source-discovery" && output.assessmentModel === V42219_MODEL.label && output.calibrationOnly === true && output.completeCoreReviewed === true, `${chunk.chunkId}: discovery role or completion mismatch`);
  assertV4(Array.isArray(output.candidates) && output.candidates.length <= plan.limits.candidatesPerChunkMaximum, `${chunk.chunkId}: candidate count exceeds ceiling`);
  assertV4(createHash("sha256").update(eventsBytes).digest("hex") === packet.sourceChain.eventsSha256, `${chunk.chunkId}: event source hash mismatch`);
  validateV42219ChunkLedger(chunkBytes, fullLedgerBytes, chunk);
  const events = normalizeV418Events(eventsDocument);
  const candidates = new Map();
  let priorKey = null;
  for (const [index, candidate] of output.candidates.entries()) {
    const label = `${chunk.chunkId}.candidates[${index}]`;
    exactKeys(candidate, ["candidateId", "side", "speaker", "proposition", "sourceSpan", "attributionConfidence", "attributionBasis", "loadBearingLevel", "loadBearingReason", "responseIntent", "contextSummary", "candidateConfidence"], label);
    exactKeys(candidate.sourceSpan, ["startEvent", "endEvent"], `${label}.sourceSpan`);
    exactKeys(candidate.responseIntent, ["kind", "localTargetCandidateIds", "earlierTargetDescription"], `${label}.responseIntent`);
    assertV4(typeof candidate.candidateId === "string" && candidate.candidateId.length > 0 && !candidates.has(candidate.candidateId), `${label}: invalid or duplicate candidate ID`);
    assertV4(["pro", "con"].includes(candidate.side) && packet.sides[candidate.side].speakers.includes(candidate.speaker), `${candidate.candidateId}: speaker/side mismatch`);
    assertV4(typeof candidate.proposition === "string" && candidate.proposition.length >= 25, `${candidate.candidateId}: proposition too short`);
    assertV4(["high", "medium", "low"].includes(candidate.attributionConfidence) && ["high", "medium", "low"].includes(candidate.candidateConfidence), `${candidate.candidateId}: invalid confidence`);
    assertV4(["motion", "central", "subsidiary"].includes(candidate.loadBearingLevel), `${candidate.candidateId}: invalid load-bearing level`);
    assertV4(typeof candidate.attributionBasis === "string" && candidate.attributionBasis.length >= 40 && typeof candidate.loadBearingReason === "string" && candidate.loadBearingReason.length >= 60 && typeof candidate.contextSummary === "string" && candidate.contextSummary.length >= 60, `${candidate.candidateId}: explanation field too short`);
    const { startEvent, endEvent } = candidate.sourceSpan;
    assertV4(Number.isInteger(startEvent) && Number.isInteger(endEvent) && startEvent >= chunk.coreStartEvent && startEvent <= chunk.coreEndEvent && endEvent >= startEvent && endEvent <= chunk.contextEndEvent, `${candidate.candidateId}: source span violates start-event ownership or context boundary`);
    assertV4(lexicalTokens(events.slice(startEvent, endEvent + 1).map((event) => event.text).join(" ")).length >= 12, `${candidate.candidateId}: source span has fewer than 12 lexical tokens`);
    const key = [startEvent, endEvent, candidate.candidateId];
    if (priorKey) assertV4(priorKey[0] < key[0] || (priorKey[0] === key[0] && (priorKey[1] < key[1] || (priorKey[1] === key[1] && priorKey[2].localeCompare(key[2]) <= 0))), `${candidate.candidateId}: candidates are not chronological`);
    const intent = candidate.responseIntent;
    assertV4(["constructive", "local-reply", "earlier-unselected-or-cross-chunk-reply"].includes(intent.kind) && Array.isArray(intent.localTargetCandidateIds) && intent.localTargetCandidateIds.length <= 3 && typeof intent.earlierTargetDescription === "string", `${candidate.candidateId}: invalid response intent`);
    if (intent.kind === "constructive") {
      assertV4(intent.localTargetCandidateIds.length === 0 && intent.earlierTargetDescription === "", `${candidate.candidateId}: invalid constructive intent shape`);
    } else if (intent.kind === "local-reply") {
      assertV4(intent.localTargetCandidateIds.length > 0 && intent.earlierTargetDescription === "", `${candidate.candidateId}: invalid local-reply intent shape`);
      for (const targetId of intent.localTargetCandidateIds) {
        assertV4(candidates.has(targetId), `${candidate.candidateId}: local target must be an earlier candidate`);
        assertV4(candidates.get(targetId).side !== candidate.side, `${candidate.candidateId}: local target must be on the opposing side`);
      }
    } else {
      assertV4(intent.localTargetCandidateIds.length === 0 && intent.earlierTargetDescription.length >= 30, `${candidate.candidateId}: invalid cross-chunk reply intent shape`);
    }
    candidates.set(candidate.candidateId, candidate);
    priorKey = key;
  }
  return { status: "passed", chunkId: chunk.chunkId, candidates: output.candidates.length, exactSourceSlice: true, scoresDerived: 0 };
}

export function compileV42219CandidateBundle({ packet, plan, outputs }) {
  assertV4(outputs.length === plan.chunks.length, "one discovery output is required per planned chunk");
  const byChunk = new Map(outputs.map((output) => [output.chunkId, output]));
  assertV4(byChunk.size === outputs.length, "duplicate discovery chunk outputs");
  const candidates = [];
  for (const chunk of plan.chunks) {
    const output = byChunk.get(chunk.chunkId);
    assertV4(output, `${chunk.chunkId}: discovery output missing`);
    for (const candidate of output.candidates) {
      const qualifiedCandidateId = `${chunk.chunkId}:${candidate.candidateId}`;
      candidates.push({
        chunkId: chunk.chunkId,
        qualifiedCandidateId,
        side: candidate.side,
        speaker: candidate.speaker,
        moveKind: candidate.responseIntent.kind === "constructive" ? "constructive" : "reply",
        proposition: candidate.proposition,
        sourceSpan: clone(candidate.sourceSpan),
        attributionConfidence: candidate.attributionConfidence,
        attributionBasis: candidate.attributionBasis,
        loadBearingLevel: candidate.loadBearingLevel,
        loadBearingReason: candidate.loadBearingReason,
        responseIntent: { ...clone(candidate.responseIntent), localTargetCandidateIds: candidate.responseIntent.localTargetCandidateIds.map((target) => `${chunk.chunkId}:${target}`) },
        contextSummary: candidate.contextSummary,
        candidateConfidence: candidate.candidateConfidence
      });
    }
  }
  candidates.sort((left, right) => left.sourceSpan.startEvent - right.sourceSpan.startEvent || left.sourceSpan.endEvent - right.sourceSpan.endEvent || left.qualifiedCandidateId.localeCompare(right.qualifiedCandidateId));
  assertV4(new Set(candidates.map((candidate) => candidate.qualifiedCandidateId)).size === candidates.length, "qualified candidate IDs are not unique");
  return {
    schemaVersion: V42219_BUNDLE_VERSION,
    protocolId: V42219_PROTOCOL_ID,
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    completeSourceDiscovery: { chunks: plan.chunks.length, everyEventOwnedExactlyOnce: true, everyCoreReportedComplete: outputs.every((output) => output.completeCoreReviewed), silentDeduplicationPerformed: false },
    candidateCount: candidates.length,
    candidates
  };
}
