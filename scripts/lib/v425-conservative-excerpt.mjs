import {
  V424_MODEL,
  compileV424PrimaryOutput,
  makeV424PrimarySchema,
  validateV424PrimaryOutput,
  validateV424SourceLedger
} from "./v424-screened-chronology-fresh.mjs";

export const V425_ROOT = "docs/calibration/v4.2.5/conservative-excerpt-smoke";
export const V425_PROTOCOL_ID = "v4.2.5-conservative-excerpt-compact-diagnostic";
export const V425_PACKET_VERSION = "4.2.5-conservative-excerpt-compact-source-packet";
export const V425_OUTPUT_VERSION = "4.2.5-conservative-excerpt-compact-primary-output";
export const V425_EXCERPT_MAXIMUM_CHARACTERS = 450;
export const V425_MODEL = V424_MODEL;
const clone = (value) => structuredClone(value);

export { validateV424SourceLedger as validateV425SourceLedger };

export function makeV425PrimarySchema() {
  const schema = makeV424PrimarySchema();
  schema.$id = "slugfester-v425-conservative-excerpt-primary";
  schema.title = "Slugfester v4.2.5 conservative-excerpt compact primary judgment";
  schema.properties.schemaVersion.const = V425_OUTPUT_VERSION;
  schema.properties.protocolId.const = V425_PROTOCOL_ID;
  schema.properties.moves.items.properties.sourceSpan.properties.excerpt.maxLength = V425_EXCERPT_MAXIMUM_CHARACTERS;
  return schema;
}

function toV424Packet(packet) {
  return { ...clone(packet), schemaVersion: "4.2.4-screened-chronology-first-compact-source-packet", protocolId: "v4.2.4-screened-chronology-first-compact-fresh-six-validation" };
}

function toV424Output(output) {
  return { ...clone(output), schemaVersion: "4.2.4-screened-chronology-first-compact-primary-output", protocolId: "v4.2.4-screened-chronology-first-compact-fresh-six-validation" };
}

export function compileV425PrimaryOutput(output, packet, eventsDocument) {
  const compiled = compileV424PrimaryOutput(toV424Output(output), toV424Packet(packet), eventsDocument);
  return { ...compiled, schemaVersion: V425_OUTPUT_VERSION, protocolId: V425_PROTOCOL_ID };
}

export function validateV425PrimaryOutput(output, packet, eventsDocument, eventsFileBytes, sourceLedgerBytes) {
  if (packet?.schemaVersion !== V425_PACKET_VERSION || packet?.protocolId !== V425_PROTOCOL_ID) throw new Error("v4.2.5 source packet identity mismatch");
  if (output?.schemaVersion !== V425_OUTPUT_VERSION || output?.protocolId !== V425_PROTOCOL_ID) throw new Error("v4.2.5 primary output identity mismatch");
  for (const move of output.moves ?? []) if (move.sourceSpan?.excerpt?.length > V425_EXCERPT_MAXIMUM_CHARACTERS) throw new Error(`${move.moveId}: excerpt exceeds ${V425_EXCERPT_MAXIMUM_CHARACTERS} characters`);
  const validation = validateV424PrimaryOutput(toV424Output(output), toV424Packet(packet), eventsDocument, eventsFileBytes, sourceLedgerBytes);
  return { ...validation, schemaVersion: V425_OUTPUT_VERSION, protocolId: V425_PROTOCOL_ID, conservativeExcerpt: { status: "passed", maximumCharacters: V425_EXCERPT_MAXIMUM_CHARACTERS, tokenRange: [12, 100], automaticTruncationPerformed: false } };
}
