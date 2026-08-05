import { assertV4 } from "./v41-lean-production.mjs";
import {
  deriveV419PrimaryScores,
  evaluateV419Escalation,
  evaluateV419PrimaryTiming,
  selectV419ControlDebates
} from "./v419-schema-bounded-source.mjs";
import {
  V42_MODEL,
  buildV42SourceLedger,
  compileV42PrimaryOutput,
  makeV42PrimarySchema,
  validateV42PrimaryOutput,
  validateV42SourceLedger
} from "./v42-compact-transport.mjs";

export const V421_ROOT = "docs/calibration/v4.2.1/compact-fresh-six-gate";
export const V421_PROTOCOL_ID = "v4.2.1-compact-transport-fresh-six-validation";
export const V421_PACKET_VERSION = "4.2.1-compact-transport-source-packet";
export const V421_OUTPUT_VERSION = "4.2.1-compact-transport-primary-output";
export const V421_MODEL = V42_MODEL;
const clone = (value) => structuredClone(value);

export { buildV42SourceLedger as buildV421SourceLedger, validateV42SourceLedger as validateV421SourceLedger };

export function makeV421PrimarySchema() {
  const schema = makeV42PrimarySchema();
  schema.$id = "slugfester-v421-compact-fresh-primary";
  schema.title = "Slugfester v4.2.1 compact-transport fresh-six primary judgment";
  schema.properties.schemaVersion.const = V421_OUTPUT_VERSION;
  schema.properties.protocolId.const = V421_PROTOCOL_ID;
  return schema;
}

function toV42Packet(packet) {
  return { ...clone(packet), schemaVersion: "4.2-compact-transport-source-packet", protocolId: "v4.2-compact-primary-input-transport-smoke" };
}

function toV42Output(output) {
  return { ...clone(output), schemaVersion: "4.2-compact-transport-primary-output", protocolId: "v4.2-compact-primary-input-transport-smoke" };
}

export function compileV421PrimaryOutput(output, packet, eventsDocument) {
  const compiled = compileV42PrimaryOutput(toV42Output(output), toV42Packet(packet), eventsDocument);
  return { ...compiled, schemaVersion: V421_OUTPUT_VERSION, protocolId: V421_PROTOCOL_ID };
}

export function validateV421PrimaryOutput(output, packet, eventsDocument, eventsFileBytes, sourceLedgerBytes) {
  assertV4(packet?.schemaVersion === V421_PACKET_VERSION && packet?.protocolId === V421_PROTOCOL_ID, "v4.2.1 source packet identity mismatch");
  assertV4(output?.schemaVersion === V421_OUTPUT_VERSION && output?.protocolId === V421_PROTOCOL_ID, "v4.2.1 primary output identity mismatch");
  const validation = validateV42PrimaryOutput(toV42Output(output), toV42Packet(packet), eventsDocument, eventsFileBytes, sourceLedgerBytes);
  return { ...validation, schemaVersion: V421_OUTPUT_VERSION, protocolId: V421_PROTOCOL_ID };
}

export function deriveV421PrimaryScores(compiledOutput) {
  const scores = deriveV419PrimaryScores(compiledOutput);
  return { ...scores, protocolId: V421_PROTOCOL_ID };
}

export function evaluateV421Escalation(args) {
  return evaluateV419Escalation(args);
}

export function evaluateV421PrimaryTiming(results, options) {
  return evaluateV419PrimaryTiming(results, options);
}

export function selectV421ControlDebates(debateIds) {
  return selectV419ControlDebates(debateIds);
}
