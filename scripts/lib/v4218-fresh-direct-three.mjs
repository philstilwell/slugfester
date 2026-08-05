import { buildV424SourceLedger } from "./v424-screened-chronology-fresh.mjs";
import {
  V426_EXCERPT_MAXIMUM_CHARACTERS,
  V426_MODEL,
  compileV426PrimaryOutput,
  makeV426PrimarySchema,
  validateV426PrimaryOutput,
  validateV426SourceLedger
} from "./v426-retired-completion.mjs";

export const V4218_ROOT = "docs/calibration/v4.2.18/fresh-direct-three";
export const V4218_PROTOCOL_ID = "v4.2.18-fresh-direct-three";
export const V4218_PACKET_VERSION = "4.2.18-fresh-direct-source-packet";
export const V4218_OUTPUT_VERSION = "4.2.18-fresh-direct-primary-output";
export const V4218_MODEL = V426_MODEL;
export const V4218_EXCERPT_MAXIMUM_CHARACTERS = V426_EXCERPT_MAXIMUM_CHARACTERS;
export { buildV424SourceLedger as buildV4218SourceLedger, validateV426SourceLedger as validateV4218SourceLedger };

const clone = (value) => structuredClone(value);
function toV426Packet(packet) { return { ...clone(packet), schemaVersion: "4.2.6-conservative-excerpt-retired-source-packet", protocolId: "v4.2.6-conservative-excerpt-retired-completion" }; }
function toV426Output(output) { return { ...clone(output), schemaVersion: "4.2.6-conservative-excerpt-retired-primary-output", protocolId: "v4.2.6-conservative-excerpt-retired-completion" }; }

export function makeV4218PrimarySchema() {
  const schema = makeV426PrimarySchema();
  schema.$id = "slugfester-v4218-fresh-direct-primary";
  schema.title = "Slugfester v4.2.18 fresh direct-lane primary judgment";
  schema.properties.schemaVersion.const = V4218_OUTPUT_VERSION;
  schema.properties.protocolId.const = V4218_PROTOCOL_ID;
  return schema;
}

export function compileV4218PrimaryOutput(output, packet, eventsDocument) {
  const compiled = compileV426PrimaryOutput(toV426Output(output), toV426Packet(packet), eventsDocument);
  return { ...compiled, schemaVersion: V4218_OUTPUT_VERSION, protocolId: V4218_PROTOCOL_ID };
}

export function validateV4218PrimaryOutput(output, packet, eventsDocument, eventsFileBytes, sourceLedgerBytes) {
  if (packet?.schemaVersion !== V4218_PACKET_VERSION || packet?.protocolId !== V4218_PROTOCOL_ID) throw new Error("v4.2.18 packet identity mismatch");
  if (output?.schemaVersion !== V4218_OUTPUT_VERSION || output?.protocolId !== V4218_PROTOCOL_ID) throw new Error("v4.2.18 output identity mismatch");
  const validation = validateV426PrimaryOutput(toV426Output(output), toV426Packet(packet), eventsDocument, eventsFileBytes, sourceLedgerBytes);
  return { ...validation, schemaVersion: V4218_OUTPUT_VERSION, protocolId: V4218_PROTOCOL_ID };
}
