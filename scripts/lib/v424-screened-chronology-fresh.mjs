import {
  V423_MODEL,
  buildV423SourceLedger,
  compileV423PrimaryOutput,
  deriveV423PrimaryScores,
  evaluateV423Escalation,
  evaluateV423PrimaryTiming,
  makeV423PrimarySchema,
  selectV423ControlDebates,
  validateV423PrimaryOutput,
  validateV423SourceLedger
} from "./v423-chronology-fresh.mjs";

export const V424_ROOT = "docs/calibration/v4.2.4/screened-chronology-fresh-six-gate";
export const V424_PROTOCOL_ID = "v4.2.4-screened-chronology-first-compact-fresh-six-validation";
export const V424_PACKET_VERSION = "4.2.4-screened-chronology-first-compact-source-packet";
export const V424_OUTPUT_VERSION = "4.2.4-screened-chronology-first-compact-primary-output";
export const V424_MODEL = V423_MODEL;
const clone = (value) => structuredClone(value);

export { buildV423SourceLedger as buildV424SourceLedger, validateV423SourceLedger as validateV424SourceLedger };

export function makeV424PrimarySchema() {
  const schema = makeV423PrimarySchema();
  schema.$id = "slugfester-v424-screened-chronology-first-fresh-primary";
  schema.title = "Slugfester v4.2.4 screened chronology-first compact fresh-six primary judgment";
  schema.properties.schemaVersion.const = V424_OUTPUT_VERSION;
  schema.properties.protocolId.const = V424_PROTOCOL_ID;
  return schema;
}

function toV423Packet(packet) {
  return { ...clone(packet), schemaVersion: "4.2.3-chronology-first-compact-source-packet", protocolId: "v4.2.3-chronology-first-compact-fresh-six-validation" };
}

function toV423Output(output) {
  return { ...clone(output), schemaVersion: "4.2.3-chronology-first-compact-primary-output", protocolId: "v4.2.3-chronology-first-compact-fresh-six-validation" };
}

export function compileV424PrimaryOutput(output, packet, eventsDocument) {
  const compiled = compileV423PrimaryOutput(toV423Output(output), toV423Packet(packet), eventsDocument);
  return { ...compiled, schemaVersion: V424_OUTPUT_VERSION, protocolId: V424_PROTOCOL_ID };
}

export function validateV424PrimaryOutput(output, packet, eventsDocument, eventsFileBytes, sourceLedgerBytes) {
  if (packet?.schemaVersion !== V424_PACKET_VERSION || packet?.protocolId !== V424_PROTOCOL_ID) throw new Error("v4.2.4 source packet identity mismatch");
  if (output?.schemaVersion !== V424_OUTPUT_VERSION || output?.protocolId !== V424_PROTOCOL_ID) throw new Error("v4.2.4 primary output identity mismatch");
  const validation = validateV423PrimaryOutput(toV423Output(output), toV423Packet(packet), eventsDocument, eventsFileBytes, sourceLedgerBytes);
  return { ...validation, schemaVersion: V424_OUTPUT_VERSION, protocolId: V424_PROTOCOL_ID };
}

export function deriveV424PrimaryScores(compiledOutput) {
  const scores = deriveV423PrimaryScores(toV423Output(compiledOutput));
  return { ...scores, protocolId: V424_PROTOCOL_ID };
}

export function evaluateV424Escalation({ primary, ...rest }) {
  return evaluateV423Escalation({ primary: toV423Output(primary), ...rest });
}

export function evaluateV424PrimaryTiming(results, options) {
  return evaluateV423PrimaryTiming(results, options);
}

export function selectV424ControlDebates(debateIds) {
  return selectV423ControlDebates(debateIds);
}
