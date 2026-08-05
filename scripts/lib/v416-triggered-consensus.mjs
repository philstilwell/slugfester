import { createHash } from "node:crypto";
import { projectV41ComputeHours, assertV4, canonicalJson } from "./v41-lean-production.mjs";
import {
  V415_PASS_B_PACKET_VERSION,
  V415_PASS_B_OUTPUT_VERSION,
  V415_PASS_B_PROTOCOL_ID,
  buildV415PassBPacket,
  makeV415PassBSchema,
  validateV415PassBOutput,
  validateV415PassBPacket
} from "./v415-triggered-consensus.mjs";

export const V416_PASS_B_ROOT = "docs/calibration/v4.1.6/lean-retired-gate/pass-b";
export const V416_PASS_B_PACKET_VERSION = "4.1.6-triggered-pass-b-packet";
export const V416_PASS_B_OUTPUT_VERSION = "4.1.6-triggered-pass-b-output";
export const V416_PASS_B_PROTOCOL_ID = "v4.1.6-triggered-pass-b-consensus";
export const V416_LOCKED_EVENTS_VERSION = "4.1.6-locked-event-ledger";
export const V416_EVENT_CONTEXT_ROWS = 2;

const clone = (value) => structuredClone(value);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function toV415Packet(packet) {
  return { ...clone(packet), schemaVersion: V415_PASS_B_PACKET_VERSION, protocolId: V415_PASS_B_PROTOCOL_ID };
}

function toV415Output(output) {
  return { ...clone(output), schemaVersion: V415_PASS_B_OUTPUT_VERSION, protocolId: V415_PASS_B_PROTOCOL_ID };
}

export function makeV416PassBSchema() {
  const schema = makeV415PassBSchema();
  schema.$id = "slugfester-v416-triggered-pass-b";
  schema.title = "Slugfester v4.1.6 triggered Pass B judgment";
  schema.properties.schemaVersion.const = V416_PASS_B_OUTPUT_VERSION;
  schema.properties.protocolId.const = V416_PASS_B_PROTOCOL_ID;
  return schema;
}

export function buildV416PassBPacket(primary, sourcePacket) {
  const packet = buildV415PassBPacket(primary, sourcePacket);
  packet.schemaVersion = V416_PASS_B_PACKET_VERSION;
  packet.protocolId = V416_PASS_B_PROTOCOL_ID;
  return packet;
}

export function validateV416PassBPacket(packet) {
  assertV4(packet?.schemaVersion === V416_PASS_B_PACKET_VERSION && packet?.protocolId === V416_PASS_B_PROTOCOL_ID, "v4.1.6 Pass B packet identity mismatch");
  return { ...validateV415PassBPacket(toV415Packet(packet)), schemaVersion: V416_PASS_B_PACKET_VERSION, protocolId: V416_PASS_B_PROTOCOL_ID };
}

export function validateV416PassBOutput(output, packet, sourcePacket) {
  validateV416PassBPacket(packet);
  assertV4(output?.schemaVersion === V416_PASS_B_OUTPUT_VERSION && output?.protocolId === V416_PASS_B_PROTOCOL_ID, "v4.1.6 Pass B output identity mismatch");
  const validation = validateV415PassBOutput(toV415Output(output), toV415Packet(packet), sourcePacket);
  return { ...validation, schemaVersion: V416_PASS_B_OUTPUT_VERSION, protocolId: V416_PASS_B_PROTOCOL_ID };
}

function lockedMovesById(packet) {
  return new Map(packet.lockedSections.flatMap((section) => [...section.proMoves, ...section.conMoves]).map((move) => [move.moveId, move]));
}

export function buildV416LockedEventLedger(packet, events, { contextRows = V416_EVENT_CONTEXT_ROWS } = {}) {
  validateV416PassBPacket(packet);
  assertV4(Array.isArray(events) && events.length === packet.eventCount, `${packet.debateNumber}: original event count mismatch`);
  assertV4(Number.isInteger(contextRows) && contextRows >= 0 && contextRows <= 4, "locked-event context rows invalid");
  const byId = lockedMovesById(packet);
  return {
    schemaVersion: V416_LOCKED_EVENTS_VERSION,
    protocolId: V416_PASS_B_PROTOCOL_ID,
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    contextRows,
    originalEventCount: events.length,
    originalEventsPath: packet.sourceChain.eventsPath,
    originalEventsSha256: packet.sourceChain.eventsSha256,
    completeTranscriptStillRequired: true,
    moves: packet.lockedMoveOrder.map((moveId) => {
      const move = byId.get(moveId);
      assertV4(move, `${packet.debateNumber}: locked event move missing: ${moveId}`);
      const start = move.sourceSpan.startEvent;
      const end = move.sourceSpan.endEvent;
      assertV4(Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end >= start && end < events.length, `${moveId}: source event range invalid`);
      const contextStartEvent = Math.max(0, start - contextRows);
      const contextEndEvent = Math.min(events.length - 1, end + contextRows);
      return {
        moveId,
        lockedStartEvent: start,
        lockedEndEvent: end,
        contextStartEvent,
        contextEndEvent,
        events: events.slice(contextStartEvent, contextEndEvent + 1).map((event, offset) => ({ eventIndex: contextStartEvent + offset, ...clone(event) }))
      };
    })
  };
}

export function validateV416LockedEventLedger(ledger, packet, events) {
  validateV416PassBPacket(packet);
  const keys = ["schemaVersion", "protocolId", "debateNumber", "debateId", "contextRows", "originalEventCount", "originalEventsPath", "originalEventsSha256", "completeTranscriptStillRequired", "moves"];
  assertV4(ledger && canonicalJson(Object.keys(ledger).sort()) === canonicalJson(keys.sort()), "locked-event ledger keys invalid");
  assertV4(ledger.schemaVersion === V416_LOCKED_EVENTS_VERSION && ledger.protocolId === V416_PASS_B_PROTOCOL_ID, "locked-event ledger identity mismatch");
  assertV4(ledger.debateNumber === packet.debateNumber && ledger.debateId === packet.debateId, "locked-event debate identity mismatch");
  assertV4(ledger.contextRows === V416_EVENT_CONTEXT_ROWS && ledger.completeTranscriptStillRequired === true, "locked-event source boundary invalid");
  assertV4(ledger.originalEventCount === events.length && ledger.originalEventCount === packet.eventCount, "locked-event original count mismatch");
  assertV4(ledger.originalEventsPath === packet.sourceChain.eventsPath && ledger.originalEventsSha256 === packet.sourceChain.eventsSha256, "locked-event source identity mismatch");
  const expected = buildV416LockedEventLedger(packet, events, { contextRows: ledger.contextRows });
  assertV4(canonicalJson(ledger) === canonicalJson(expected), "locked-event ledger differs from deterministic original-event derivation");
  const lockedRows = ledger.moves.reduce((sum, move) => sum + move.lockedEndEvent - move.lockedStartEvent + 1, 0);
  const deliveredRows = ledger.moves.reduce((sum, move) => sum + move.events.length, 0);
  return { status: "passed", debateNumber: packet.debateNumber, moves: ledger.moves.length, originalEventCount: events.length, lockedRows, deliveredRows, contextRows: ledger.contextRows, originalEventsHashLocked: Boolean(ledger.originalEventsSha256) };
}

function addTransportContingency(projection, hours) {
  const total = Number((projection.hours.total + hours).toFixed(2));
  return {
    ...projection,
    inputs: { ...projection.inputs, fixedTransportContingencyHours: hours },
    hours: { ...projection.hours, transportContingency: hours, total },
    centralTargetPassed: total <= 52,
    conservativeCeilingPassed: total <= 60
  };
}

export function evaluateV416PassBTiming(results, primaryRuntime, { fixedTransportContingencyHours = 2 } = {}) {
  assertV4(Array.isArray(results) && results.length === 3 && results.every((item) => item.gateAcceptancePassed === true && Number.isFinite(item.elapsedMs) && item.elapsedMs > 0 && Number.isInteger(item.recoverableStreamEvents) && item.recoverableStreamEvents >= 0), "three valid Pass B timing results required");
  assertV4(primaryRuntime?.runtimePassed === true && Number.isFinite(primaryRuntime.computePrimaryMinutesPerDebate) && Number.isFinite(primaryRuntime.conservativePrimaryMinutesPerDebate), "valid primary runtime required");
  const wallPassBMinutesPerDebate = results.reduce((sum, item) => sum + item.elapsedMs, 0) / 60000 / results.length;
  const clean = results.filter((item) => item.recoverableStreamEvents === 0);
  const recovered = results.filter((item) => item.recoverableStreamEvents > 0);
  const timingEligible = clean.length >= 2 && recovered.length <= 1;
  const computePassBMinutesPerDebate = timingEligible && recovered.length === 1 ? clean.reduce((sum, item) => sum + item.elapsedMs, 0) / 60000 / clean.length : wallPassBMinutesPerDebate;
  const conservativePassBMinutesPerDebate = Math.max(8.5, computePassBMinutesPerDebate * 1.25);
  const centralProjection = addTransportContingency(projectV41ComputeHours({ primaryMinutesPerDebate: primaryRuntime.computePrimaryMinutesPerDebate, passBMinutesPerEscalatedDebate: computePassBMinutesPerDebate }), fixedTransportContingencyHours);
  const conservativeProjection = addTransportContingency(projectV41ComputeHours({ primaryMinutesPerDebate: primaryRuntime.conservativePrimaryMinutesPerDebate, finalizationMinutesPerDebate: 5, escalationRate: 0.2, passBMinutesPerEscalatedDebate: conservativePassBMinutesPerDebate, adjudicationShareOfEscalations: 0.6, adjudicationMinutesPerAdjudicatedDebate: 6.5 }), fixedTransportContingencyHours);
  const runtimePassed = timingEligible && centralProjection.hours.total <= 52 && conservativeProjection.hours.total <= 60;
  return {
    wallPassBMinutesPerDebate: Number(wallPassBMinutesPerDebate.toFixed(2)),
    computePassBMinutesPerDebate: Number(computePassBMinutesPerDebate.toFixed(2)),
    conservativePassBMinutesPerDebate: Number(conservativePassBMinutesPerDebate.toFixed(2)),
    transportCleanContexts: clean.length,
    recoveredTransportContexts: recovered.length,
    recoveredTransportDebates: recovered.map((item) => item.debateNumber),
    timingEligible,
    fixedTransportContingencyHours,
    centralProjection,
    conservativeProjection,
    runtimePassed
  };
}

export function evaluateV416AdjudicationTiming(results, primaryRuntime, passBRuntime, { fixedTransportContingencyHours = 2 } = {}) {
  assertV4(Array.isArray(results) && results.length === 3 && results.every((item) => item.gateAcceptancePassed === true && Number.isFinite(item.elapsedMs) && item.elapsedMs > 0 && Number.isInteger(item.recoverableStreamEvents) && item.recoverableStreamEvents >= 0), "three valid adjudication timing results required");
  assertV4(primaryRuntime?.runtimePassed === true && passBRuntime?.runtimePassed === true, "valid primary and Pass B runtimes required");
  const primaryMinutes = primaryRuntime.centralProjection?.inputs?.primaryMinutesPerDebate;
  const conservativePrimaryMinutes = primaryRuntime.conservativeProjection?.inputs?.primaryMinutesPerDebate;
  const passBMinutes = passBRuntime.centralProjection?.inputs?.passBMinutesPerEscalatedDebate;
  const conservativePassBMinutes = passBRuntime.conservativeProjection?.inputs?.passBMinutesPerEscalatedDebate;
  assertV4([primaryMinutes, conservativePrimaryMinutes, passBMinutes, conservativePassBMinutes].every((value) => Number.isFinite(value) && value > 0), "projection inputs unavailable");
  const wallAdjudicationMinutesPerDebate = results.reduce((sum, item) => sum + item.elapsedMs, 0) / 60000 / results.length;
  const clean = results.filter((item) => item.recoverableStreamEvents === 0);
  const recovered = results.filter((item) => item.recoverableStreamEvents > 0);
  const timingEligible = clean.length >= 2 && recovered.length <= 1;
  const computeAdjudicationMinutesPerDebate = timingEligible && recovered.length === 1
    ? clean.reduce((sum, item) => sum + item.elapsedMs, 0) / 60000 / clean.length
    : wallAdjudicationMinutesPerDebate;
  const conservativeAdjudicationMinutesPerDebate = Math.max(6.5, computeAdjudicationMinutesPerDebate * 1.25);
  const centralProjection = addTransportContingency(projectV41ComputeHours({ primaryMinutesPerDebate: primaryMinutes, finalizationMinutesPerDebate: 4.25, escalationRate: 0.15, passBMinutesPerEscalatedDebate: passBMinutes, adjudicationShareOfEscalations: 1, adjudicationMinutesPerAdjudicatedDebate: computeAdjudicationMinutesPerDebate }), fixedTransportContingencyHours);
  const conservativeProjection = addTransportContingency(projectV41ComputeHours({ primaryMinutesPerDebate: conservativePrimaryMinutes, finalizationMinutesPerDebate: 5, escalationRate: 0.2, passBMinutesPerEscalatedDebate: conservativePassBMinutes, adjudicationShareOfEscalations: 1, adjudicationMinutesPerAdjudicatedDebate: conservativeAdjudicationMinutesPerDebate }), fixedTransportContingencyHours);
  const runtimePassed = timingEligible && centralProjection.hours.total <= 52 && conservativeProjection.hours.total <= 60;
  return {
    wallAdjudicationMinutesPerDebate: Number(wallAdjudicationMinutesPerDebate.toFixed(2)),
    computeAdjudicationMinutesPerDebate: Number(computeAdjudicationMinutesPerDebate.toFixed(2)),
    conservativeAdjudicationMinutesPerDebate: Number(conservativeAdjudicationMinutesPerDebate.toFixed(2)),
    observedAdjudicationShareOfEscalations: 1,
    projectedAdjudicationShareOfEscalations: 1,
    transportCleanContexts: clean.length,
    recoveredTransportContexts: recovered.length,
    recoveredTransportDebates: recovered.map((item) => item.debateNumber),
    timingEligible,
    fixedTransportContingencyHours,
    centralProjection,
    conservativeProjection,
    runtimePassed
  };
}

export function fileSha256(value) {
  return sha256(value);
}
