import {
  V4218_EXCERPT_MAXIMUM_CHARACTERS,
  V4218_MODEL,
  buildV4218SourceLedger,
  compileV4218PrimaryOutput,
  makeV4218PrimarySchema,
  validateV4218PrimaryOutput,
  validateV4218SourceLedger
} from "./v4218-fresh-direct-three.mjs";

export const V42181_ROOT = "docs/calibration/v4.2.18.1/fresh-direct-three";
export const V42181_PROTOCOL_ID = "v4.2.18.1-corrected-fresh-direct-three";
export const V42181_PACKET_VERSION = "4.2.18.1-fresh-direct-source-packet";
export const V42181_OUTPUT_VERSION = "4.2.18.1-fresh-direct-primary-output";
export const V42181_MODEL = V4218_MODEL;
export const V42181_EXCERPT_MAXIMUM_CHARACTERS = V4218_EXCERPT_MAXIMUM_CHARACTERS;
export { buildV4218SourceLedger as buildV42181SourceLedger, validateV4218SourceLedger as validateV42181SourceLedger };

const clone = (value) => structuredClone(value);
function toV4218Packet(packet) { return { ...clone(packet), schemaVersion: "4.2.18-fresh-direct-source-packet", protocolId: "v4.2.18-fresh-direct-three" }; }
function toV4218Output(output) { return { ...clone(output), schemaVersion: "4.2.18-fresh-direct-primary-output", protocolId: "v4.2.18-fresh-direct-three" }; }

export function makeV42181PrimarySchema() {
  const schema = makeV4218PrimarySchema();
  schema.$id = "slugfester-v42181-fresh-direct-primary";
  schema.title = "Slugfester v4.2.18.1 corrected fresh direct-lane primary judgment";
  schema.properties.schemaVersion.const = V42181_OUTPUT_VERSION;
  schema.properties.protocolId.const = V42181_PROTOCOL_ID;
  delete schema.properties.moves.items.properties.sourceSpan.properties.excerpt.maxLength;
  return schema;
}

export function compileV42181PrimaryOutput(output, packet, eventsDocument) {
  const compiled = compileV4218PrimaryOutput(toV4218Output(output), toV4218Packet(packet), eventsDocument);
  return { ...compiled, schemaVersion: V42181_OUTPUT_VERSION, protocolId: V42181_PROTOCOL_ID };
}

export function validateV42181PrimaryOutput(output, packet, eventsDocument, eventsFileBytes, sourceLedgerBytes) {
  if (packet?.schemaVersion !== V42181_PACKET_VERSION || packet?.protocolId !== V42181_PROTOCOL_ID) throw new Error("v4.2.18.1 packet identity mismatch");
  if (output?.schemaVersion !== V42181_OUTPUT_VERSION || output?.protocolId !== V42181_PROTOCOL_ID) throw new Error("v4.2.18.1 output identity mismatch");
  const validation = validateV4218PrimaryOutput(toV4218Output(output), toV4218Packet(packet), eventsDocument, eventsFileBytes, sourceLedgerBytes);
  return { ...validation, schemaVersion: V42181_OUTPUT_VERSION, protocolId: V42181_PROTOCOL_ID };
}
