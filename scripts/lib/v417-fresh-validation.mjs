import { makeV4ControlSample } from "./v4-lean-production.mjs";
import { assertV4, deriveV41PrimaryScores, evaluateV41Escalation, makeV41PrimarySchema, projectV41ComputeHours, validateV41PrimaryOutput } from "./v41-lean-production.mjs";

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

function addTransportContingency(projection, hours) {
  const total = Number((projection.hours.total + hours).toFixed(2));
  return { ...projection, inputs: { ...projection.inputs, fixedTransportContingencyHours: hours }, hours: { ...projection.hours, transportContingency: hours, total }, centralTargetPassed: total <= 52, conservativeCeilingPassed: total <= 60 };
}

export function evaluateV417PrimaryTiming(results, { fixedTransportContingencyHours = 2 } = {}) {
  assertV4(Array.isArray(results) && results.length === 6 && results.every((item) => item.gateAcceptancePassed && Number.isFinite(item.elapsedMs) && item.elapsedMs > 0 && Number.isInteger(item.recoverableStreamEvents) && item.recoverableStreamEvents >= 0), "six valid primary timing results required");
  const wallPrimaryMinutesPerDebate = results.reduce((sum, item) => sum + item.elapsedMs, 0) / 60000 / results.length;
  const clean = results.filter((item) => item.recoverableStreamEvents === 0);
  const recovered = results.filter((item) => item.recoverableStreamEvents > 0);
  const timingEligible = clean.length >= 4 && recovered.length <= 2;
  const computePrimaryMinutesPerDebate = timingEligible && recovered.length ? clean.reduce((sum, item) => sum + item.elapsedMs, 0) / 60000 / clean.length : wallPrimaryMinutesPerDebate;
  const conservativePrimaryMinutesPerDebate = Math.max(7, computePrimaryMinutesPerDebate * 1.25);
  const centralProjection = addTransportContingency(projectV41ComputeHours({ primaryMinutesPerDebate: computePrimaryMinutesPerDebate, finalizationMinutesPerDebate: 4.25, escalationRate: 0.15, passBMinutesPerEscalatedDebate: 7.680461111111111, adjudicationShareOfEscalations: 1, adjudicationMinutesPerAdjudicatedDebate: 3.222983333333333 }), fixedTransportContingencyHours);
  const conservativeProjection = addTransportContingency(projectV41ComputeHours({ primaryMinutesPerDebate: conservativePrimaryMinutesPerDebate, finalizationMinutesPerDebate: 5, escalationRate: 0.2, passBMinutesPerEscalatedDebate: 9.60057638888889, adjudicationShareOfEscalations: 1, adjudicationMinutesPerAdjudicatedDebate: 6.5 }), fixedTransportContingencyHours);
  return { wallPrimaryMinutesPerDebate: Number(wallPrimaryMinutesPerDebate.toFixed(2)), computePrimaryMinutesPerDebate: Number(computePrimaryMinutesPerDebate.toFixed(2)), conservativePrimaryMinutesPerDebate: Number(conservativePrimaryMinutesPerDebate.toFixed(2)), transportCleanContexts: clean.length, recoveredTransportContexts: recovered.length, recoveredTransportDebates: recovered.map((item) => item.debateNumber), timingEligible, fixedTransportContingencyHours, centralProjection, conservativeProjection, runtimePassed: timingEligible && centralProjection.hours.total <= 52 && conservativeProjection.hours.total <= 60 };
}
