import { canonicalJson } from "./v41-lean-production.mjs";
import { compileV426PrimaryOutput, validateV426PrimaryOutput } from "./v426-retired-completion.mjs";

export const V427_ROOT = "docs/calibration/v4.2.7/bounded-primary-correction";
const clone = (value) => structuredClone(value);
const withoutPlacement = (move) => { const { sectionId, ...rest } = move; return rest; };

export function validateV427Correction(corrected, original, packet, eventsDocument, eventsBytes, ledgerBytes) {
  const originalTop = clone(original); const correctedTop = clone(corrected); delete originalTop.sections; delete originalTop.moves; delete correctedTop.sections; delete correctedTop.moves;
  if (canonicalJson(originalTop) !== canonicalJson(correctedTop)) throw new Error("v4.2.7 unauthorized top-level change");
  const originalById = new Map(original.moves.map((move) => [move.moveId, move]));
  if (corrected.moves.length !== original.moves.length || new Set(corrected.moves.map((move) => move.moveId)).size !== original.moves.length || corrected.moves.some((move) => !originalById.has(move.moveId))) throw new Error("v4.2.7 must preserve the exact move set");
  for (const move of corrected.moves) if (canonicalJson(withoutPlacement(move)) !== canonicalJson(withoutPlacement(originalById.get(move.moveId)))) throw new Error(`${move.moveId}: unauthorized move-content change`);
  const validation = validateV426PrimaryOutput(corrected, packet, eventsDocument, eventsBytes, ledgerBytes);
  return { ...validation, boundedCorrection: { status: "passed", exactMoveSetPreserved: true, moveContentImmutableExceptSectionId: true, sectionMetadataOnlyChanged: true } };
}

export function compileV427Correction(corrected, packet, eventsDocument) { return compileV426PrimaryOutput(corrected, packet, eventsDocument); }
