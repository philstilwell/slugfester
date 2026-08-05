import {
  V425_EXCERPT_MAXIMUM_CHARACTERS,
  V425_MODEL,
  compileV425PrimaryOutput,
  makeV425PrimarySchema,
  validateV425PrimaryOutput,
  validateV425SourceLedger
} from "./v425-conservative-excerpt.mjs";
import { evaluateV424PrimaryTiming } from "./v424-screened-chronology-fresh.mjs";

export const V426_ROOT = "docs/calibration/v4.2.6/conservative-excerpt-retired-completion";
export const V426_PROTOCOL_ID = "v4.2.6-conservative-excerpt-retired-completion";
export const V426_PACKET_VERSION = "4.2.6-conservative-excerpt-retired-source-packet";
export const V426_OUTPUT_VERSION = "4.2.6-conservative-excerpt-retired-primary-output";
export const V426_MODEL = V425_MODEL;
export const V426_EXCERPT_MAXIMUM_CHARACTERS = V425_EXCERPT_MAXIMUM_CHARACTERS;
const clone = (value) => structuredClone(value);
export { validateV425SourceLedger as validateV426SourceLedger };

export function makeV426PrimarySchema() { const schema = makeV425PrimarySchema(); schema.$id = "slugfester-v426-retired-completion-primary"; schema.title = "Slugfester v4.2.6 conservative-excerpt retired-completion primary judgment"; schema.properties.schemaVersion.const = V426_OUTPUT_VERSION; schema.properties.protocolId.const = V426_PROTOCOL_ID; return schema; }
function toV425Packet(packet) { return { ...clone(packet), schemaVersion: "4.2.5-conservative-excerpt-compact-source-packet", protocolId: "v4.2.5-conservative-excerpt-compact-diagnostic" }; }
function toV425Output(output) { return { ...clone(output), schemaVersion: "4.2.5-conservative-excerpt-compact-primary-output", protocolId: "v4.2.5-conservative-excerpt-compact-diagnostic" }; }
export function compileV426PrimaryOutput(output, packet, eventsDocument) { const compiled = compileV425PrimaryOutput(toV425Output(output), toV425Packet(packet), eventsDocument); return { ...compiled, schemaVersion: V426_OUTPUT_VERSION, protocolId: V426_PROTOCOL_ID }; }
export function validateV426PrimaryOutput(output, packet, eventsDocument, eventsFileBytes, sourceLedgerBytes) { if (packet?.schemaVersion !== V426_PACKET_VERSION || packet?.protocolId !== V426_PROTOCOL_ID) throw new Error("v4.2.6 packet identity mismatch"); if (output?.schemaVersion !== V426_OUTPUT_VERSION || output?.protocolId !== V426_PROTOCOL_ID) throw new Error("v4.2.6 output identity mismatch"); const validation = validateV425PrimaryOutput(toV425Output(output), toV425Packet(packet), eventsDocument, eventsFileBytes, sourceLedgerBytes); return { ...validation, schemaVersion: V426_OUTPUT_VERSION, protocolId: V426_PROTOCOL_ID }; }
export function evaluateV426PrimaryTiming(results, options) { return evaluateV424PrimaryTiming(results, options); }
