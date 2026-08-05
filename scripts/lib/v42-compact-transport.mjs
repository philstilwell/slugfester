import { createHash } from "node:crypto";
import { assertV4, canonicalJson } from "./v41-lean-production.mjs";
import {
  V419_MODEL,
  compileV419PrimaryOutput,
  makeV419PrimarySchema,
  validateV419PrimaryOutput
} from "./v419-schema-bounded-source.mjs";
import { normalizeV418Events } from "./v418-source-integrity.mjs";

export const V42_ROOT = "docs/calibration/v4.2/compact-transport-smoke";
export const V42_PROTOCOL_ID = "v4.2-compact-primary-input-transport-smoke";
export const V42_PACKET_VERSION = "4.2-compact-transport-source-packet";
export const V42_OUTPUT_VERSION = "4.2-compact-transport-primary-output";
export const V42_MODEL = V419_MODEL;
const clone = (value) => structuredClone(value);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function buildV42SourceLedger(eventsDocument) {
  const events = normalizeV418Events(eventsDocument);
  return `${events.map((event, index) => JSON.stringify([index, event.startMs, event.durationMs, event.text])).join("\n")}\n`;
}

export function validateV42SourceLedger(ledgerBytes, eventsDocument, expectedSha256 = null) {
  const events = normalizeV418Events(eventsDocument);
  if (expectedSha256 !== null) assertV4(sha256(ledgerBytes) === expectedSha256, "v4.2 compact source-ledger hash mismatch");
  const text = Buffer.isBuffer(ledgerBytes) ? ledgerBytes.toString("utf8") : String(ledgerBytes);
  assertV4(text.endsWith("\n"), "v4.2 compact source ledger must end with newline");
  const lines = text.slice(0, -1).split("\n");
  assertV4(lines.length === events.length, "v4.2 compact source-ledger event count mismatch");
  const replay = lines.map((line, index) => {
    const row = JSON.parse(line);
    assertV4(Array.isArray(row) && row.length === 4 && row[0] === index, `v4.2 source-ledger row ${index} invalid`);
    return { startMs: row[1], durationMs: row[2], text: row[3] };
  });
  assertV4(canonicalJson(replay) === canonicalJson(events), "v4.2 compact source ledger does not replay to original events");
  return { status: "passed", eventCount: events.length, sourceLedgerSha256: sha256(ledgerBytes), replayExact: true };
}

export function makeV42PrimarySchema() {
  const schema = makeV419PrimarySchema();
  schema.$id = "slugfester-v42-compact-transport-primary";
  schema.title = "Slugfester v4.2 compact-transport primary judgment";
  schema.properties.schemaVersion.const = V42_OUTPUT_VERSION;
  schema.properties.protocolId.const = V42_PROTOCOL_ID;
  return schema;
}

function toV419Packet(packet) {
  return { ...clone(packet), schemaVersion: "4.1.9-schema-bounded-source-only-packet", protocolId: "v4.1.9-schema-bounded-source-fresh-six-validation" };
}

function toV419Output(output) {
  return { ...clone(output), schemaVersion: "4.1.9-schema-bounded-primary-output", protocolId: "v4.1.9-schema-bounded-source-fresh-six-validation" };
}

export function compileV42PrimaryOutput(output, packet, eventsDocument) {
  const compiled = compileV419PrimaryOutput(toV419Output(output), toV419Packet(packet), eventsDocument);
  return { ...compiled, schemaVersion: V42_OUTPUT_VERSION, protocolId: V42_PROTOCOL_ID };
}

export function validateV42PrimaryOutput(output, packet, eventsDocument, eventsFileBytes, sourceLedgerBytes) {
  assertV4(packet?.schemaVersion === V42_PACKET_VERSION && packet?.protocolId === V42_PROTOCOL_ID, "v4.2 source packet identity mismatch");
  assertV4(output?.schemaVersion === V42_OUTPUT_VERSION && output?.protocolId === V42_PROTOCOL_ID, "v4.2 primary output identity mismatch");
  const ledger = validateV42SourceLedger(sourceLedgerBytes, eventsDocument, packet.transportChain.sourceLedgerSha256);
  const validation = validateV419PrimaryOutput(toV419Output(output), toV419Packet(packet), eventsDocument, eventsFileBytes);
  return { ...validation, schemaVersion: V42_OUTPUT_VERSION, protocolId: V42_PROTOCOL_ID, compactTransport: { ...ledger, plainTranscriptDeliveredToModel: false, originalEventsDeliveredToModel: false } };
}
