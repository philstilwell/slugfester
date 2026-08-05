import { makeV4ControlSample } from "./v4-lean-production.mjs";
import { assertV4, deriveV41PrimaryScores, evaluateV41Escalation, makeV41PrimarySchema, validateV41PrimaryOutput } from "./v41-lean-production.mjs";

export const V417_ROOT = "docs/calibration/v4.1.7/fresh-six-gate";
export const V417_PROTOCOL_ID = "v4.1.7-fresh-six-validation";
export const V417_PACKET_VERSION = "4.1.7-bounded-source-only-packet";
export const V417_OUTPUT_VERSION = "4.1.7-bounded-primary-output";
export const V417_MODEL = Object.freeze({ label: "5.6 Sol", slug: "gpt-5.6-sol", primaryReasoningEffort: "low", reviewReasoningEffort: "high" });

const clone = (value) => structuredClone(value);

function toV41Packet(packet) {
  return { ...clone(packet), schemaVersion: "4.1.5-bounded-source-only-packet", protocolId: "v4.1.5-bounded-lean-risk-triggered-consensus" };
}

function toV41Output(output) {
  return { ...clone(output), schemaVersion: "4.1.5-bounded-primary-output", protocolId: "v4.1.5-bounded-lean-risk-triggered-consensus" };
}

export function makeV417PrimarySchema() {
  const schema = makeV41PrimarySchema();
  schema.$id = "slugfester-v417-fresh-six-bounded-primary";
  schema.title = "Slugfester v4.1.7 fresh-six bounded primary judgment";
  schema.properties.schemaVersion.const = V417_OUTPUT_VERSION;
  schema.properties.protocolId.const = V417_PROTOCOL_ID;
  return schema;
}

export function validateV417PrimaryOutput(output, packet) {
  assertV4(packet?.schemaVersion === V417_PACKET_VERSION && packet?.protocolId === V417_PROTOCOL_ID, "v4.1.7 source packet identity mismatch");
  assertV4(output?.schemaVersion === V417_OUTPUT_VERSION && output?.protocolId === V417_PROTOCOL_ID, "v4.1.7 primary output identity mismatch");
  const validation = validateV41PrimaryOutput(toV41Output(output), toV41Packet(packet));
  return { ...validation, schemaVersion: V417_OUTPUT_VERSION, protocolId: V417_PROTOCOL_ID };
}

export function deriveV417PrimaryScores(output) {
  const scores = deriveV41PrimaryScores(toV41Output(output));
  return { ...scores, protocolId: V417_PROTOCOL_ID };
}

export function evaluateV417Escalation({ primary, ...rest }) {
  return evaluateV41Escalation({ primary: toV41Output(primary), ...rest });
}

export function selectV417ControlDebates(debateIds) {
  return makeV4ControlSample(debateIds, 0.1);
}
