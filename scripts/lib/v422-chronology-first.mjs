import { assertV4 } from "./v41-lean-production.mjs";
import {
  V421_MODEL,
  compileV421PrimaryOutput,
  deriveV421PrimaryScores,
  evaluateV421Escalation,
  makeV421PrimarySchema,
  validateV421PrimaryOutput,
  validateV421SourceLedger
} from "./v421-compact-fresh.mjs";

export const V422_ROOT = "docs/calibration/v4.2.2/chronology-first-smoke";
export const V422_PROTOCOL_ID = "v4.2.2-chronology-first-compact-diagnostic";
export const V422_PACKET_VERSION = "4.2.2-chronology-first-compact-source-packet";
export const V422_OUTPUT_VERSION = "4.2.2-chronology-first-compact-primary-output";
export const V422_MODEL = V421_MODEL;
const clone = (value) => structuredClone(value);

export { validateV421SourceLedger as validateV422SourceLedger };

export function makeV422PrimarySchema() {
  const schema = makeV421PrimarySchema();
  schema.$id = "slugfester-v422-chronology-first-primary";
  schema.title = "Slugfester v4.2.2 chronology-first compact primary judgment";
  schema.properties.schemaVersion.const = V422_OUTPUT_VERSION;
  schema.properties.protocolId.const = V422_PROTOCOL_ID;
  const section = schema.properties.sections.items;
  const nestedMove = clone(section.properties.proMoves.items);
  delete section.properties.proMoves;
  delete section.properties.conMoves;
  section.required = section.required.filter((key) => key !== "proMoves" && key !== "conMoves");
  nestedMove.properties = {
    moveId: nestedMove.properties.moveId,
    sectionId: { type: "string", minLength: 1 },
    side: { type: "string", enum: ["pro", "con"] },
    ...Object.fromEntries(Object.entries(nestedMove.properties).filter(([key]) => key !== "moveId"))
  };
  nestedMove.required = ["moveId", "sectionId", "side", ...nestedMove.required.filter((key) => key !== "moveId")];
  schema.properties.moves = { type: "array", minItems: 8, maxItems: 24, items: nestedMove };
  schema.required = [...schema.required, "moves"];
  return schema;
}

function toV421Packet(packet) {
  return { ...clone(packet), schemaVersion: "4.2.1-compact-transport-source-packet", protocolId: "v4.2.1-compact-transport-fresh-six-validation" };
}

function moveWithoutPlacement(move) {
  const { sectionId, side, ...rest } = move;
  return rest;
}

export function toV421Output(output) {
  const { moves, ...rest } = clone(output);
  return {
    ...rest,
    schemaVersion: "4.2.1-compact-transport-primary-output",
    protocolId: "v4.2.1-compact-transport-fresh-six-validation",
    sections: output.sections.map((section) => ({
      ...clone(section),
      proMoves: moves.filter((move) => move.sectionId === section.sectionId && move.side === "pro").map(moveWithoutPlacement),
      conMoves: moves.filter((move) => move.sectionId === section.sectionId && move.side === "con").map(moveWithoutPlacement)
    }))
  };
}

export function compileV422PrimaryOutput(output, packet, eventsDocument) {
  const inherited = compileV421PrimaryOutput(toV421Output(output), toV421Packet(packet), eventsDocument);
  const compiledById = new Map(inherited.sections.flatMap((section) => [...section.proMoves, ...section.conMoves]).map((move) => [move.moveId, move]));
  return {
    ...clone(output),
    schemaVersion: V422_OUTPUT_VERSION,
    protocolId: V422_PROTOCOL_ID,
    moves: output.moves.map((move) => ({ ...clone(move), sourceSpan: clone(compiledById.get(move.moveId).sourceSpan) }))
  };
}

export function validateV422PrimaryOutput(output, packet, eventsDocument, eventsFileBytes, sourceLedgerBytes) {
  assertV4(packet?.schemaVersion === V422_PACKET_VERSION && packet?.protocolId === V422_PROTOCOL_ID, "v4.2.2 source packet identity mismatch");
  assertV4(output?.schemaVersion === V422_OUTPUT_VERSION && output?.protocolId === V422_PROTOCOL_ID, "v4.2.2 primary output identity mismatch");
  assertV4(Array.isArray(output.sections) && output.sections.length >= 4 && output.sections.length <= 6, "v4.2.2 section count outside 4..6");
  assertV4(Array.isArray(output.moves) && output.moves.length >= 8 && output.moves.length <= 24, "v4.2.2 move count outside 8..24");
  const sectionIds = new Set(output.sections.map((section) => section.sectionId));
  assertV4(sectionIds.size === output.sections.length, "v4.2.2 section IDs must be unique");
  const moveIds = new Set();
  const moveIndex = new Map();
  for (const [index, move] of output.moves.entries()) {
    assertV4(!moveIds.has(move.moveId), "v4.2.2 move IDs must be unique");
    moveIds.add(move.moveId);
    moveIndex.set(move.moveId, index);
    assertV4(sectionIds.has(move.sectionId) && ["pro", "con"].includes(move.side), `${move.moveId}: invalid section or side placement`);
    if (index > 0) {
      const prior = output.moves[index - 1];
      const ordered = prior.sourceSpan.startEvent < move.sourceSpan.startEvent || prior.sourceSpan.startEvent === move.sourceSpan.startEvent && (prior.sourceSpan.endEvent < move.sourceSpan.endEvent || prior.sourceSpan.endEvent === move.sourceSpan.endEvent && prior.moveId.localeCompare(move.moveId) <= 0);
      assertV4(ordered, `${move.moveId}: moves must be emitted in source chronology`);
    }
  }
  for (const [index, move] of output.moves.entries()) for (const targetId of move.response.decisiveTargetIds) assertV4(moveIndex.has(targetId) && moveIndex.get(targetId) < index, `${move.moveId}: reply target must already appear in moves`);
  for (const section of output.sections) for (const side of ["pro", "con"]) {
    const count = output.moves.filter((move) => move.sectionId === section.sectionId && move.side === side).length;
    assertV4(count >= 1 && count <= 2, `${section.sectionId}.${side}: requires one or two moves`);
  }
  validateV421SourceLedger(sourceLedgerBytes, eventsDocument, packet.transportChain.sourceLedgerSha256);
  const inherited = validateV421PrimaryOutput(toV421Output(output), toV421Packet(packet), eventsDocument, eventsFileBytes, sourceLedgerBytes);
  return { ...inherited, schemaVersion: V422_OUTPUT_VERSION, protocolId: V422_PROTOCOL_ID, chronologyFirst: { status: "passed", emittedMoves: output.moves.length, targetEdgesReferenceEarlierEmittedMoves: true, oneOrTwoMovesPerSidePerSection: true } };
}

export function deriveV422PrimaryScores(compiledOutput) {
  const scores = deriveV421PrimaryScores(toV421Output(compiledOutput));
  return { ...scores, protocolId: V422_PROTOCOL_ID };
}

export function evaluateV422Escalation({ primary, ...rest }) {
  return evaluateV421Escalation({ primary: toV421Output(primary), ...rest });
}
