import {
  V416_EVENT_CONTEXT_ROWS,
  V416_LOCKED_EVENTS_VERSION,
  V416_PASS_B_OUTPUT_VERSION,
  V416_PASS_B_PACKET_VERSION,
  V416_PASS_B_PROTOCOL_ID,
  buildV416LockedEventLedger,
  buildV416PassBPacket,
  evaluateV416PassBTiming,
  makeV416PassBSchema,
  validateV416LockedEventLedger,
  validateV416PassBOutput,
  validateV416PassBPacket
} from "./v416-triggered-consensus.mjs";
import { assertV4 } from "./v41-lean-production.mjs";

export const V417_PASS_B_ROOT = "docs/calibration/v4.1.7/fresh-six-gate/pass-b";
export const V417_PASS_B_PACKET_VERSION = "4.1.7-triggered-pass-b-packet";
export const V417_PASS_B_OUTPUT_VERSION = "4.1.7-triggered-pass-b-output";
export const V417_PASS_B_PROTOCOL_ID = "v4.1.7-fresh-six-triggered-pass-b";
export const V417_LOCKED_EVENTS_VERSION = "4.1.7-locked-event-ledger";
export const V417_EVENT_CONTEXT_ROWS = V416_EVENT_CONTEXT_ROWS;

const clone = (value) => structuredClone(value);

function toV416Packet(packet) {
  return { ...clone(packet), schemaVersion: V416_PASS_B_PACKET_VERSION, protocolId: V416_PASS_B_PROTOCOL_ID };
}

function toV416Output(output) {
  return { ...clone(output), schemaVersion: V416_PASS_B_OUTPUT_VERSION, protocolId: V416_PASS_B_PROTOCOL_ID };
}

function toV416Ledger(ledger) {
  return { ...clone(ledger), schemaVersion: V416_LOCKED_EVENTS_VERSION, protocolId: V416_PASS_B_PROTOCOL_ID };
}

export function makeV417PassBSchema() {
  const schema = makeV416PassBSchema();
  schema.$id = "slugfester-v417-fresh-six-triggered-pass-b";
  schema.title = "Slugfester v4.1.7 fresh-six triggered Pass B judgment";
  schema.properties.schemaVersion.const = V417_PASS_B_OUTPUT_VERSION;
  schema.properties.protocolId.const = V417_PASS_B_PROTOCOL_ID;
  return schema;
}

export function buildV417PassBPacket(primary, sourcePacket) {
  const packet = buildV416PassBPacket(primary, sourcePacket);
  packet.schemaVersion = V417_PASS_B_PACKET_VERSION;
  packet.protocolId = V417_PASS_B_PROTOCOL_ID;
  return packet;
}

export function validateV417PassBPacket(packet) {
  assertV4(packet?.schemaVersion === V417_PASS_B_PACKET_VERSION && packet?.protocolId === V417_PASS_B_PROTOCOL_ID, "v4.1.7 Pass B packet identity mismatch");
  const validation = validateV416PassBPacket(toV416Packet(packet));
  return { ...validation, schemaVersion: V417_PASS_B_PACKET_VERSION, protocolId: V417_PASS_B_PROTOCOL_ID };
}

export function validateV417PassBOutput(output, packet, sourcePacket) {
  validateV417PassBPacket(packet);
  assertV4(output?.schemaVersion === V417_PASS_B_OUTPUT_VERSION && output?.protocolId === V417_PASS_B_PROTOCOL_ID, "v4.1.7 Pass B output identity mismatch");
  const validation = validateV416PassBOutput(toV416Output(output), toV416Packet(packet), sourcePacket);
  return { ...validation, schemaVersion: V417_PASS_B_OUTPUT_VERSION, protocolId: V417_PASS_B_PROTOCOL_ID };
}

export function buildV417LockedEventLedger(packet, events) {
  validateV417PassBPacket(packet);
  const ledger = buildV416LockedEventLedger(toV416Packet(packet), events, { contextRows: V417_EVENT_CONTEXT_ROWS });
  ledger.schemaVersion = V417_LOCKED_EVENTS_VERSION;
  ledger.protocolId = V417_PASS_B_PROTOCOL_ID;
  return ledger;
}

export function validateV417LockedEventLedger(ledger, packet, events) {
  validateV417PassBPacket(packet);
  assertV4(ledger?.schemaVersion === V417_LOCKED_EVENTS_VERSION && ledger?.protocolId === V417_PASS_B_PROTOCOL_ID, "v4.1.7 locked-event ledger identity mismatch");
  const validation = validateV416LockedEventLedger(toV416Ledger(ledger), toV416Packet(packet), events);
  return { ...validation, schemaVersion: V417_LOCKED_EVENTS_VERSION, protocolId: V417_PASS_B_PROTOCOL_ID };
}

export function evaluateV417PassBTiming(results, primaryRuntime) {
  assertV4(Array.isArray(results) && results.length === 5, "five Pass B timing results required");
  const triplet = results.slice(0, 3);
  const base = evaluateV416PassBTiming(triplet, primaryRuntime);
  const wallPassBMinutesPerDebate = results.reduce((sum, item) => sum + item.elapsedMs, 0) / 60000 / results.length;
  const clean = results.filter((item) => item.gateAcceptancePassed === true && item.recoverableStreamEvents === 0);
  const recovered = results.filter((item) => item.gateAcceptancePassed === true && item.recoverableStreamEvents > 0);
  const allValid = results.every((item) => item.gateAcceptancePassed === true && Number.isFinite(item.elapsedMs) && item.elapsedMs > 0 && Number.isInteger(item.recoverableStreamEvents) && item.recoverableStreamEvents >= 0);
  const timingEligible = allValid && clean.length >= 3 && recovered.length <= 2;
  const computePassBMinutesPerDebate = timingEligible && recovered.length
    ? clean.reduce((sum, item) => sum + item.elapsedMs, 0) / 60000 / clean.length
    : wallPassBMinutesPerDebate;
  const conservativePassBMinutesPerDebate = Math.max(8.5, computePassBMinutesPerDebate * 1.25);
  const replacePassB = (projection, minutes) => {
    const oldMinutes = projection.inputs.passBMinutesPerEscalatedDebate;
    const debateCount = projection.inputs.debateCount;
    const escalationRate = projection.inputs.escalationRate;
    const delta = debateCount * escalationRate * (minutes - oldMinutes) / 60;
    const passB = debateCount * escalationRate * minutes / 60;
    const total = Number((projection.hours.total + delta).toFixed(2));
    return {
      ...projection,
      inputs: { ...projection.inputs, passBMinutesPerEscalatedDebate: minutes },
      hours: { ...projection.hours, passB: Number(passB.toFixed(2)), total },
      centralTargetPassed: total <= 52,
      conservativeCeilingPassed: total <= 60
    };
  };
  const centralProjection = replacePassB(base.centralProjection, computePassBMinutesPerDebate);
  const conservativeProjection = replacePassB(base.conservativeProjection, conservativePassBMinutesPerDebate);
  return {
    wallPassBMinutesPerDebate: Number(wallPassBMinutesPerDebate.toFixed(2)),
    computePassBMinutesPerDebate: Number(computePassBMinutesPerDebate.toFixed(2)),
    conservativePassBMinutesPerDebate: Number(conservativePassBMinutesPerDebate.toFixed(2)),
    transportCleanContexts: clean.length,
    recoveredTransportContexts: recovered.length,
    recoveredTransportDebates: recovered.map((item) => item.debateNumber),
    timingEligible,
    fixedTransportContingencyHours: base.fixedTransportContingencyHours,
    centralProjection,
    conservativeProjection,
    runtimePassed: timingEligible && centralProjection.hours.total <= 52 && conservativeProjection.hours.total <= 60
  };
}
