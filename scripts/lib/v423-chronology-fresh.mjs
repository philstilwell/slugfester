import {
  V422_MODEL,
  compileV422PrimaryOutput,
  deriveV422PrimaryScores,
  evaluateV422Escalation,
  makeV422PrimarySchema,
  validateV422PrimaryOutput,
  validateV422SourceLedger
} from "./v422-chronology-first.mjs";
import { buildV421SourceLedger, evaluateV421PrimaryTiming, selectV421ControlDebates } from "./v421-compact-fresh.mjs";

export const V423_ROOT = "docs/calibration/v4.2.3/chronology-first-fresh-six-gate";
export const V423_PROTOCOL_ID = "v4.2.3-chronology-first-compact-fresh-six-validation";
export const V423_PACKET_VERSION = "4.2.3-chronology-first-compact-source-packet";
export const V423_OUTPUT_VERSION = "4.2.3-chronology-first-compact-primary-output";
export const V423_MODEL = V422_MODEL;
const clone = (value) => structuredClone(value);

export { buildV421SourceLedger as buildV423SourceLedger, validateV422SourceLedger as validateV423SourceLedger };

export function makeV423PrimarySchema() {
  const schema = makeV422PrimarySchema();
  schema.$id = "slugfester-v423-chronology-first-fresh-primary";
  schema.title = "Slugfester v4.2.3 chronology-first compact fresh-six primary judgment";
  schema.properties.schemaVersion.const = V423_OUTPUT_VERSION;
  schema.properties.protocolId.const = V423_PROTOCOL_ID;
  return schema;
}

function toV422Packet(packet) {
  return { ...clone(packet), schemaVersion: "4.2.2-chronology-first-compact-source-packet", protocolId: "v4.2.2-chronology-first-compact-diagnostic" };
}

function toV422Output(output) {
  return { ...clone(output), schemaVersion: "4.2.2-chronology-first-compact-primary-output", protocolId: "v4.2.2-chronology-first-compact-diagnostic" };
}

export function compileV423PrimaryOutput(output, packet, eventsDocument) {
  const compiled = compileV422PrimaryOutput(toV422Output(output), toV422Packet(packet), eventsDocument);
  return { ...compiled, schemaVersion: V423_OUTPUT_VERSION, protocolId: V423_PROTOCOL_ID };
}

export function validateV423PrimaryOutput(output, packet, eventsDocument, eventsFileBytes, sourceLedgerBytes) {
  if (packet?.schemaVersion !== V423_PACKET_VERSION || packet?.protocolId !== V423_PROTOCOL_ID) throw new Error("v4.2.3 source packet identity mismatch");
  if (output?.schemaVersion !== V423_OUTPUT_VERSION || output?.protocolId !== V423_PROTOCOL_ID) throw new Error("v4.2.3 primary output identity mismatch");
  const validation = validateV422PrimaryOutput(toV422Output(output), toV422Packet(packet), eventsDocument, eventsFileBytes, sourceLedgerBytes);
  return { ...validation, schemaVersion: V423_OUTPUT_VERSION, protocolId: V423_PROTOCOL_ID };
}

export function deriveV423PrimaryScores(compiledOutput) {
  const scores = deriveV422PrimaryScores(toV422Output(compiledOutput));
  return { ...scores, protocolId: V423_PROTOCOL_ID };
}

export function evaluateV423Escalation({ primary, ...rest }) {
  return evaluateV422Escalation({ primary: toV422Output(primary), ...rest });
}

export function evaluateV423PrimaryTiming(results, options) {
  return evaluateV421PrimaryTiming(results, options);
}

export function selectV423ControlDebates(debateIds) {
  return selectV421ControlDebates(debateIds);
}
