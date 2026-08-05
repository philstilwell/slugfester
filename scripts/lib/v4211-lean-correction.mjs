import { canonicalJson } from "./v41-lean-production.mjs";
import { makeV426PrimarySchema } from "./v426-retired-completion.mjs";
import { compileV427Correction, validateV427Correction } from "./v427-bounded-correction.mjs";

export const V4211_ROOT = "docs/calibration/v4.2.11/lean-structural-correction";
export const V4211_PROTOCOL_ID = "v4.2.11-lean-structural-correction";
export const V4211_OUTPUT_VERSION = "4.2.11-lean-section-placement-proposal";
const clone = (value) => structuredClone(value);
const canonicalSort = (left, right) => left.sourceSpan.startEvent - right.sourceSpan.startEvent || left.sourceSpan.endEvent - right.sourceSpan.endEvent || left.moveId.localeCompare(right.moveId);

export function makeV4211Schema() {
  const base = makeV426PrimarySchema();
  return { $schema: "https://json-schema.org/draft/2020-12/schema", $id: "slugfester-v4211-lean-correction", type: "object", additionalProperties: false, required: ["schemaVersion", "protocolId", "debateNumber", "sections", "placements"], properties: { schemaVersion: { type: "string", const: V4211_OUTPUT_VERSION }, protocolId: { type: "string", const: V4211_PROTOCOL_ID }, debateNumber: { type: "string", const: "106" }, sections: base.properties.sections, placements: { type: "array", minItems: 16, maxItems: 16, items: { type: "object", additionalProperties: false, required: ["moveId", "sectionId"], properties: { moveId: { type: "string", minLength: 1 }, sectionId: { type: "string", minLength: 1 } } } } } };
}

export function buildV4211LeanCandidate(candidate) {
  return { schemaVersion: "4.2.11-lean-correction-candidate", debateNumber: candidate.debateNumber, debateId: candidate.debateId, routes: candidate.routes, currentSections: candidate.sections, moves: [...candidate.moves].sort(canonicalSort).map((move) => ({ moveId: move.moveId, currentSectionId: move.sectionId, side: move.side, proposition: move.proposition, startEvent: move.sourceSpan.startEvent, endEvent: move.sourceSpan.endEvent, moveKind: move.moveKind, responseTargetIds: move.response.decisiveTargetIds, burdenContact: move.burdenContact, importance: move.importance })) };
}

export function applyAndValidateV4211(proposal, original, packet, eventsDocument, eventsBytes, ledgerBytes) {
  if (proposal.schemaVersion !== V4211_OUTPUT_VERSION || proposal.protocolId !== V4211_PROTOCOL_ID || proposal.debateNumber !== "106") throw new Error("v4.2.11 proposal identity mismatch");
  const canonicalMoves = [...original.moves].sort(canonicalSort), expectedIds = canonicalMoves.map((move) => move.moveId), actualIds = proposal.placements.map((placement) => placement.moveId);
  if (canonicalJson(actualIds) !== canonicalJson(expectedIds)) throw new Error("v4.2.11 placements must preserve the exact canonical move sequence");
  const sectionIds = proposal.sections.map((section) => section.sectionId);
  if (new Set(sectionIds).size !== sectionIds.length || proposal.sections.length < 4 || proposal.sections.length > 6 || proposal.sections.reduce((sum, section) => sum + section.weightPercent, 0) !== 100) throw new Error("v4.2.11 invalid section metadata");
  const sectionSet = new Set(sectionIds), placementMap = new Map(proposal.placements.map((placement) => [placement.moveId, placement.sectionId]));
  if (proposal.placements.some((placement) => !sectionSet.has(placement.sectionId))) throw new Error("v4.2.11 placement references unknown section");
  for (const sectionId of sectionIds) for (const side of ["pro", "con"]) { const count = canonicalMoves.filter((move) => move.side === side && placementMap.get(move.moveId) === sectionId).length; if (count < 1 || count > 2) throw new Error(`v4.2.11 ${sectionId}/${side} requires one or two moves`); }
  const corrected = clone(original); corrected.sections = clone(proposal.sections); corrected.moves = canonicalMoves.map((move) => ({ ...clone(move), sectionId: placementMap.get(move.moveId) }));
  const validation = validateV427Correction(corrected, original, packet, eventsDocument, eventsBytes, ledgerBytes);
  return { corrected, validation: { ...validation, leanCorrection: { status: "passed", emittedMutableFieldsOnly: true, fullSourceUnavailableToModel: true, ratingsUnavailableToModel: true } } };
}

export function compileV4211(corrected, packet, eventsDocument) { return compileV427Correction(corrected, packet, eventsDocument); }
