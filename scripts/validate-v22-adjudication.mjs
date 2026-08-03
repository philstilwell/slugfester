#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  V21_ADJUSTMENT_DISAGREEMENT_THRESHOLD,
  V21_DIMENSION_DISAGREEMENT_THRESHOLD,
  V21_MOVE_DISAGREEMENT_THRESHOLD,
  V22_RUBRIC,
  V22_WORKFLOW,
  scoreDimensions
} from "./lib/reassessment-scoring.mjs";

const [adjudicationArgument, passAArgument, passBArgument, inventoryArgument] =
  process.argv.slice(2);
if (!adjudicationArgument || !passAArgument || !passBArgument || !inventoryArgument) {
  console.error(
    "Usage: node scripts/validate-v22-adjudication.mjs <adjudication.json> <pass-a.json> <pass-b.json> <inventory.json>"
  );
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function exactKeys(value, expected, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert(
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort()),
    `${label} keys differ from the adjudication contract`
  );
}

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

function validateEligibility(entry, label, moveIds) {
  exactKeys(entry, ["value", "rationale", "eligibility"], label);
  assert(Number.isInteger(entry.value) && entry.value >= -5 && entry.value <= 5, `${label}.value is invalid`);
  assert(typeof entry.rationale === "string" && entry.rationale.trim().length >= 20, `${label}.rationale is too short`);
  exactKeys(entry.eligibility, ["distinctDebateWideConsequence", "affectsBurdenCompletion", "notAlreadyScored", "relatedMoveIds", "distinctConsequence"], `${label}.eligibility`);
  const eligibility = entry.eligibility;
  for (const key of ["distinctDebateWideConsequence", "affectsBurdenCompletion", "notAlreadyScored"]) {
    assert(typeof eligibility[key] === "boolean", `${label}.eligibility.${key} must be boolean`);
  }
  assert(Array.isArray(eligibility.relatedMoveIds), `${label}.relatedMoveIds must be an array`);
  for (const moveId of eligibility.relatedMoveIds) assert(moveIds.has(moveId), `${label} references unknown move ${moveId}`);
  const eligible = eligibility.distinctDebateWideConsequence && eligibility.affectsBurdenCompletion && eligibility.notAlreadyScored && eligibility.relatedMoveIds.length > 0 && eligibility.distinctConsequence.trim().toLowerCase() !== "none";
  assert(entry.value === 0 ? !eligible : eligible, `${label} value conflicts with exclusion eligibility`);
}

const [adjudicationSource, passASource, passBSource, inventorySource] =
  await Promise.all(
    [adjudicationArgument, passAArgument, passBArgument, inventoryArgument].map((file) =>
      readFile(path.resolve(file), "utf8")
    )
  );
const adjudication = JSON.parse(adjudicationSource);
const passA = JSON.parse(passASource);
const passB = JSON.parse(passBSource);
const inventory = JSON.parse(inventorySource);

exactKeys(adjudication, ["schemaVersion", "workflowVersion", "rubricVersion", "debateId", "debateNumber", "model", "calibrationOnly", "adjudicatedAt", "isolation", "moveAdjudications", "burdenAdjustmentAdjudications", "audit"], "adjudication");
assert(adjudication.schemaVersion === "2.2-adjudication", "schemaVersion mismatch");
assert(adjudication.workflowVersion === V22_WORKFLOW, "workflowVersion mismatch");
assert(adjudication.rubricVersion === V22_RUBRIC, "rubricVersion mismatch");
assert(adjudication.debateId === passA.debateId && adjudication.debateId === passB.debateId && adjudication.debateId === inventory.debateId, "debateId mismatch");
assert(adjudication.debateNumber === inventory.debateNumber, "debateNumber mismatch");
assert(adjudication.model === "5.6 Sol" && adjudication.calibrationOnly === true, "model or calibration status mismatch");
assert(!Number.isNaN(Date.parse(adjudication.adjudicatedAt)), "adjudicatedAt is invalid");
exactKeys(adjudication.isolation, ["method", "legacyMaterialAvailable", "statement"], "isolation");
assert(adjudication.isolation.method === "fresh-adjudication-model-task", "isolation method mismatch");
assert(adjudication.isolation.legacyMaterialAvailable === false, "legacy material must be unavailable");

const inventoryMoveById = new Map(
  inventory.sections.flatMap((section) => section.moves).map((move) => [move.id, move])
);
const passBById = new Map(passB.moveScores.map((move) => [move.moveId, move]));
const expected = new Map();
for (const a of passA.moveScores) {
  const b = passBById.get(a.moveId);
  assert(b, `${a.moveId} is missing from Pass B`);
  const dimensionDeltas = Object.fromEntries(
    Object.keys(a.dimensions).map((key) => [key, Math.abs(a.dimensions[key] - b.dimensions[key])])
  );
  const maxDimensionDelta = Math.max(...Object.values(dimensionDeltas));
  const scoreDelta = Math.abs(a.moveScore - b.moveScore);
  if (
    maxDimensionDelta > V21_DIMENSION_DISAGREEMENT_THRESHOLD ||
    scoreDelta > V21_MOVE_DISAGREEMENT_THRESHOLD
  ) {
    expected.set(a.moveId, {
      a,
      b,
      maxDimensionDelta,
      scoreDelta,
      triggeredDimensions: Object.fromEntries(
        Object.entries(dimensionDeltas).filter(([, delta]) => delta > V21_DIMENSION_DISAGREEMENT_THRESHOLD)
      )
    });
  }
}

assert(Array.isArray(adjudication.moveAdjudications), "moveAdjudications must be an array");
assert(adjudication.moveAdjudications.length === expected.size, "move adjudication count mismatch");
const seen = new Set();
const ceilings = {"partial-direct-answer": 79, "relevant-counterargument": 69, "diagnostic-question": 74, "topic-shift-or-weaker-substitution": 49};
for (const [index, move] of adjudication.moveAdjudications.entries()) {
  const label = `moveAdjudications[${index}]`;
  exactKeys(move, ["moveId", "side", "passAScore", "passBScore", "scoreDelta", "maxDimensionDelta", "triggeredDimensions", "responseClass", "dimensions", "moveScore", "rationale"], label);
  assert(!seen.has(move.moveId), `${move.moveId} is duplicated`);
  seen.add(move.moveId);
  const trigger = expected.get(move.moveId);
  assert(trigger, `${move.moveId} did not trigger adjudication`);
  assert(move.side === inventoryMoveById.get(move.moveId).side, `${move.moveId} side mismatch`);
  assert(move.passAScore === trigger.a.moveScore && move.passBScore === trigger.b.moveScore, `${move.moveId} pass scores mismatch`);
  assert(move.scoreDelta === trigger.scoreDelta && move.maxDimensionDelta === trigger.maxDimensionDelta, `${move.moveId} deltas mismatch`);
  assert(JSON.stringify(move.triggeredDimensions) === JSON.stringify(trigger.triggeredDimensions), `${move.moveId} triggeredDimensions mismatch`);
  assert(scoreDimensions(move.dimensions, `${label}.dimensions`) === move.moveScore, `${move.moveId} final score mismatch`);
  if (ceilings[move.responseClass] !== undefined) assert(move.dimensions.responsiveness <= ceilings[move.responseClass], `${move.moveId} violates response-class ceiling`);
  assert(typeof move.rationale === "string" && move.rationale.trim().length >= 40, `${move.moveId} rationale is too short`);
}
assert([...expected.keys()].every((moveId) => seen.has(moveId)), "a triggered move is missing");

exactKeys(adjudication.burdenAdjustmentAdjudications, Object.keys(adjudication.burdenAdjustmentAdjudications), "burdenAdjustmentAdjudications");
const expectedAdjustmentSides = ["pro", "con"].filter(
  (side) =>
    Math.abs(
      passA.burdenCompletionAdjustment[side].value -
        passB.burdenCompletionAdjustment[side].value
    ) > V21_ADJUSTMENT_DISAGREEMENT_THRESHOLD
);
assert(
  JSON.stringify(Object.keys(adjudication.burdenAdjustmentAdjudications).sort()) ===
    JSON.stringify(expectedAdjustmentSides.sort()),
  "burden-adjustment adjudication side set mismatch"
);
for (const side of expectedAdjustmentSides) {
  validateEligibility(
    adjudication.burdenAdjustmentAdjudications[side],
    `burdenAdjustmentAdjudications.${side}`,
    new Set(inventoryMoveById.keys())
  );
}

exactKeys(adjudication.audit, ["passASha256", "passBSha256", "triggeredMoveCount", "resolvedMoveCount", "missingRequiredAdjudications", "nonTriggeredMovesAltered"], "audit");
assert(adjudication.audit.passASha256 === sha256(passASource), "audit.passASha256 mismatch");
assert(adjudication.audit.passBSha256 === sha256(passBSource), "audit.passBSha256 mismatch");
assert(adjudication.audit.triggeredMoveCount === expected.size, "audit.triggeredMoveCount mismatch");
assert(adjudication.audit.resolvedMoveCount === expected.size, "audit.resolvedMoveCount mismatch");
assert(adjudication.audit.missingRequiredAdjudications === 0, "audit reports missing adjudications");
assert(adjudication.audit.nonTriggeredMovesAltered === 0, "audit reports non-triggered alterations");

console.log(
  JSON.stringify(
    {
      status: "passed",
      debateId: adjudication.debateId,
      triggeredMoves: expected.size,
      adjustmentAdjudications: expectedAdjustmentSides.length,
      adjudicationSha256: sha256(adjudicationSource)
    },
    null,
    2
  )
);
