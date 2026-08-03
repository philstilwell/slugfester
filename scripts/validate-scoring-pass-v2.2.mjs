#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  DIMENSION_WEIGHTS,
  V22_RUBRIC,
  V22_WORKFLOW,
  scoreDimensions
} from "./lib/reassessment-scoring.mjs";

const [passArgument, inventoryArgument, gateArgument] = process.argv.slice(2);
if (!passArgument || !inventoryArgument || !gateArgument) {
  console.error(
    "Usage: node scripts/validate-scoring-pass-v2.2.mjs <pass.json> <inventory.json> <gate-manifest.json>"
  );
  process.exit(1);
}

const passPath = path.resolve(passArgument);
const inventoryPath = path.resolve(inventoryArgument);
const gatePath = path.resolve(gateArgument);
const workspaceRoot = path.resolve(".");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

async function readSource(filePath) {
  return readFile(filePath, "utf8");
}

function exactKeys(value, expected, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  const observed = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assert(
    JSON.stringify(observed) === JSON.stringify(wanted),
    `${label} keys must be exactly [${wanted.join(", ")}]; found [${observed.join(", ")}]`
  );
}

function finiteInteger(value, label, minimum, maximum) {
  assert(Number.isInteger(value), `${label} must be an integer`);
  assert(value >= minimum && value <= maximum, `${label} must be ${minimum}–${maximum}`);
}

function digest(value, label) {
  assert(typeof value === "string" && /^[a-f0-9]{64}$/.test(value), `${label} must be a SHA-256 digest`);
}

function relative(filePath) {
  return path.relative(workspaceRoot, filePath).split(path.sep).join("/");
}

function inventoryMoves(inventory) {
  const result = [];
  for (const section of inventory.sections ?? []) {
    for (const move of section.moves ?? []) {
      result.push({ section, move });
    }
  }
  return result;
}

function validateEligibility(entry, label, moveIds) {
  exactKeys(entry, ["value", "rationale", "eligibility"], label);
  finiteInteger(entry.value, `${label}.value`, -5, 5);
  assert(typeof entry.rationale === "string" && entry.rationale.trim().length >= 20, `${label}.rationale is too short`);
  exactKeys(
    entry.eligibility,
    [
      "distinctDebateWideConsequence",
      "affectsBurdenCompletion",
      "notAlreadyScored",
      "relatedMoveIds",
      "distinctConsequence"
    ],
    `${label}.eligibility`
  );
  for (const key of [
    "distinctDebateWideConsequence",
    "affectsBurdenCompletion",
    "notAlreadyScored"
  ]) {
    assert(typeof entry.eligibility[key] === "boolean", `${label}.eligibility.${key} must be boolean`);
  }
  assert(Array.isArray(entry.eligibility.relatedMoveIds), `${label}.eligibility.relatedMoveIds must be an array`);
  assert(
    new Set(entry.eligibility.relatedMoveIds).size === entry.eligibility.relatedMoveIds.length,
    `${label}.eligibility.relatedMoveIds must be unique`
  );
  for (const moveId of entry.eligibility.relatedMoveIds) {
    assert(moveIds.has(moveId), `${label} references unknown move ${moveId}`);
  }
  assert(
    typeof entry.eligibility.distinctConsequence === "string" &&
      entry.eligibility.distinctConsequence.trim(),
    `${label}.eligibility.distinctConsequence is required`
  );
  const eligible =
    entry.eligibility.distinctDebateWideConsequence &&
    entry.eligibility.affectsBurdenCompletion &&
    entry.eligibility.notAlreadyScored &&
    entry.eligibility.relatedMoveIds.length > 0 &&
    entry.eligibility.distinctConsequence.trim().toLowerCase() !== "none";
  assert(entry.value === 0 ? !eligible : eligible, `${label} value conflicts with exclusion eligibility`);
}

const [passSource, inventorySource, gateSource] = await Promise.all([
  readSource(passPath),
  readSource(inventoryPath),
  readSource(gatePath)
]);
const scoringPass = JSON.parse(passSource);
const inventory = JSON.parse(inventorySource);
const gate = JSON.parse(gateSource);

exactKeys(
  scoringPass,
  [
    "schemaVersion",
    "workflowVersion",
    "rubricVersion",
    "gateId",
    "debateId",
    "debateNumber",
    "pass",
    "assessmentModel",
    "calibrationOnly",
    "completedAt",
    "isolation",
    "source",
    "dimensionWeights",
    "moveScores",
    "sectionScores",
    "burdenCompletionAdjustment",
    "overall",
    "calculationAudit"
  ],
  "pass"
);
assert(scoringPass.schemaVersion === "2.2-scoring-pass", "schemaVersion must be 2.2-scoring-pass");
assert(scoringPass.workflowVersion === V22_WORKFLOW, `workflowVersion must be ${V22_WORKFLOW}`);
assert(scoringPass.rubricVersion === V22_RUBRIC, `rubricVersion must be ${V22_RUBRIC}`);
assert(scoringPass.gateId === gate.gateId, "gateId must match the manifest");
assert(scoringPass.debateId === inventory.debateId, "debateId must match inventory");
assert(scoringPass.debateNumber === inventory.debateNumber, "debateNumber must match inventory");
assert(["A", "B"].includes(scoringPass.pass), "pass must be A or B");
assert(scoringPass.assessmentModel === "5.6 Sol", "assessmentModel must be 5.6 Sol");
assert(scoringPass.calibrationOnly === true, "calibrationOnly must be true");
assert(!Number.isNaN(Date.parse(scoringPass.completedAt)), "completedAt must be an ISO timestamp");

exactKeys(
  scoringPass.isolation,
  ["method", "allowedInputs", "prohibitedInputsConfirmed", "contaminationDetected", "statement"],
  "isolation"
);
assert(scoringPass.isolation.method === "fresh-isolated-model-task", "isolation.method is invalid");
assert(Array.isArray(scoringPass.isolation.allowedInputs), "isolation.allowedInputs must be an array");
assert(scoringPass.isolation.allowedInputs.length >= 7, "isolation.allowedInputs must record the complete allowlist");
assert(new Set(scoringPass.isolation.allowedInputs).size === scoringPass.isolation.allowedInputs.length, "isolation.allowedInputs must be unique");
assert(scoringPass.isolation.prohibitedInputsConfirmed === true, "prohibited inputs must be confirmed absent");
assert(scoringPass.isolation.contaminationDetected === false, "contaminated passes are invalid");
assert(scoringPass.isolation.statement.trim().length >= 40, "isolation.statement is too short");

exactKeys(
  scoringPass.source,
  [
    "videoId",
    "inventoryPath",
    "inventorySha256",
    "transcriptSha256",
    "eventsSha256",
    "captionManifestSha256",
    "audioVerificationPath",
    "audioVerificationSha256",
    "gateManifestSha256",
    "workflowSha256",
    "rubricSha256",
    "schemaSha256",
    "limitations"
  ],
  "source"
);
for (const key of [
  "inventorySha256",
  "transcriptSha256",
  "eventsSha256",
  "captionManifestSha256",
  "audioVerificationSha256",
  "gateManifestSha256",
  "workflowSha256",
  "rubricSha256",
  "schemaSha256"
]) {
  digest(scoringPass.source[key], `source.${key}`);
}
assert(scoringPass.source.inventoryPath === relative(inventoryPath), "source.inventoryPath must match the supplied inventory");
assert(scoringPass.source.inventorySha256 === sha256(inventorySource), "source.inventorySha256 mismatch");
assert(scoringPass.source.gateManifestSha256 === sha256(gateSource), "source.gateManifestSha256 mismatch");

const gateDebate = gate.sample.debates.find((debate) => debate.debateId === scoringPass.debateId);
assert(gateDebate, "debate is not registered in the gate");
assert(scoringPass.source.videoId === gateDebate.videoId, "source.videoId must match gate manifest");
const captionRoot = path.join(workspaceRoot, ".assessment-cache", "captions", gateDebate.videoId);
const audioVerificationPath = path.resolve(scoringPass.source.audioVerificationPath);
const [transcriptSource, eventsSource, captionManifestSource, audioVerificationSource, workflowSource, rubricSource, schemaSource] = await Promise.all([
  readSource(path.join(captionRoot, "transcript.txt")),
  readSource(path.join(captionRoot, "events.json")),
  readSource(path.join(captionRoot, "manifest.json")),
  readSource(audioVerificationPath),
  readSource(path.join(workspaceRoot, "docs", "assessment-workflow-v2.2.md")),
  readSource(path.join(workspaceRoot, "docs", "reassessment-rubric-v2.2.md")),
  readSource(path.join(workspaceRoot, "docs", "calibration", "v2.2", "scoring-pass-schema.json"))
]);
for (const [label, recorded, source] of [
  ["transcript", scoringPass.source.transcriptSha256, transcriptSource],
  ["events", scoringPass.source.eventsSha256, eventsSource],
  ["caption manifest", scoringPass.source.captionManifestSha256, captionManifestSource],
  ["audio verification", scoringPass.source.audioVerificationSha256, audioVerificationSource],
  ["workflow", scoringPass.source.workflowSha256, workflowSource],
  ["rubric", scoringPass.source.rubricSha256, rubricSource],
  ["schema", scoringPass.source.schemaSha256, schemaSource]
]) {
  assert(recorded === sha256(source), `${label} hash mismatch`);
}
assert(relative(audioVerificationPath) === scoringPass.source.audioVerificationPath, "source.audioVerificationPath must be workspace-relative");

exactKeys(scoringPass.dimensionWeights, Object.keys(DIMENSION_WEIGHTS), "dimensionWeights");
assert(JSON.stringify(scoringPass.dimensionWeights) === JSON.stringify(DIMENSION_WEIGHTS), "dimensionWeights differ from repository constants");

const lockedMoves = inventoryMoves(inventory);
const lockedMoveById = new Map(lockedMoves.map((entry) => [entry.move.id, entry]));
assert(lockedMoveById.size === lockedMoves.length, "inventory contains duplicate move IDs");
assert(Array.isArray(scoringPass.moveScores), "moveScores must be an array");
assert(scoringPass.moveScores.length === lockedMoves.length, "every inventory move must be scored exactly once");
const passMoveById = new Map();
const responseClasses = new Set([
  "constructive-opening",
  "full-direct-answer",
  "partial-direct-answer",
  "relevant-counterargument",
  "diagnostic-question",
  "justified-reframe",
  "topic-shift-or-weaker-substitution"
]);
const responsivenessCeilings = {
  "partial-direct-answer": 79,
  "relevant-counterargument": 69,
  "diagnostic-question": 74,
  "topic-shift-or-weaker-substitution": 49
};
for (const [index, scoredMove] of scoringPass.moveScores.entries()) {
  const label = `moveScores[${index}]`;
  exactKeys(
    scoredMove,
    ["moveId", "sectionId", "side", "importance", "timestamp", "sourceSpan", "responseClass", "dimensions", "moveScore", "evidenceBasis", "rationale", "assessmentConfidence"],
    label
  );
  assert(!passMoveById.has(scoredMove.moveId), `${label}.moveId is duplicated`);
  const locked = lockedMoveById.get(scoredMove.moveId);
  assert(locked, `${label}.moveId is not in the inventory`);
  assert(scoredMove.sectionId === locked.section.id, `${label}.sectionId mismatch`);
  assert(scoredMove.side === locked.move.side, `${label}.side mismatch`);
  assert(scoredMove.importance === locked.move.importance, `${label}.importance mismatch`);
  assert(scoredMove.timestamp === locked.move.timestamp, `${label}.timestamp mismatch`);
  assert(JSON.stringify(scoredMove.sourceSpan) === JSON.stringify(locked.move.sourceSpan), `${label}.sourceSpan mismatch`);
  assert(responseClasses.has(scoredMove.responseClass), `${label}.responseClass is invalid`);
  exactKeys(scoredMove.dimensions, Object.keys(DIMENSION_WEIGHTS), `${label}.dimensions`);
  for (const [key, value] of Object.entries(scoredMove.dimensions)) finiteInteger(value, `${label}.dimensions.${key}`, 0, 100);
  const ceiling = responsivenessCeilings[scoredMove.responseClass];
  if (ceiling !== undefined) {
    assert(scoredMove.dimensions.responsiveness <= ceiling, `${label} exceeds the ${scoredMove.responseClass} responsiveness ceiling of ${ceiling}`);
  }
  assert(scoredMove.moveScore === scoreDimensions(scoredMove.dimensions, `${label}.dimensions`), `${label}.moveScore mismatch`);
  assert(typeof scoredMove.evidenceBasis === "string" && scoredMove.evidenceBasis.trim().length >= 20, `${label}.evidenceBasis is too short`);
  assert(typeof scoredMove.rationale === "string" && scoredMove.rationale.trim().length >= 40, `${label}.rationale is too short`);
  assert(["high", "medium", "low"].includes(scoredMove.assessmentConfidence), `${label}.assessmentConfidence is invalid`);
  passMoveById.set(scoredMove.moveId, scoredMove);
}

const mediumOrLowMoves = lockedMoves.filter(({ move }) => ["medium", "low"].includes(move.speakerAttributionConfidence));
const audioVerification = JSON.parse(audioVerificationSource);
const audioByMoveId = new Map((audioVerification.moves ?? []).map((move) => [move.moveId, move]));
for (const { move } of mediumOrLowMoves) {
  assert(move.audioChecked === true, `${move.id} must have audioChecked true`);
  assert(move.audioVerification?.status === "verified", `${move.id} inventory verification status must be verified`);
  assert(audioByMoveId.get(move.id)?.status === "verified", `${move.id} is missing from the audio-verification audit`);
  assert(audioByMoveId.get(move.id)?.resolvedSpeaker === move.speaker, `${move.id} resolved speaker mismatch`);
}

assert(Array.isArray(scoringPass.sectionScores), "sectionScores must be an array");
assert(scoringPass.sectionScores.length === inventory.sections.length, "sectionScores count mismatch");
let sectionWeightTotal = 0;
for (const [index, lockedSection] of inventory.sections.entries()) {
  const section = scoringPass.sectionScores[index];
  const label = `sectionScores[${index}]`;
  exactKeys(section, ["sectionId", "weightPercent", "pro", "con"], label);
  assert(section.sectionId === lockedSection.id, `${label}.sectionId must preserve inventory order`);
  assert(section.weightPercent === lockedSection.weight, `${label}.weightPercent mismatch`);
  sectionWeightTotal += section.weightPercent;
  for (const side of ["pro", "con"]) {
    exactKeys(section[side], ["moveIds", "importanceTotal", "score"], `${label}.${side}`);
    const expectedMoves = lockedSection.moves.filter((move) => move.side === side);
    const expectedIds = expectedMoves.map((move) => move.id);
    assert(JSON.stringify(section[side].moveIds) === JSON.stringify(expectedIds), `${label}.${side}.moveIds must preserve inventory order`);
    const importanceTotal = expectedMoves.reduce((total, move) => total + move.importance, 0);
    assert(section[side].importanceTotal === importanceTotal, `${label}.${side}.importanceTotal mismatch`);
    const expectedScore = Math.round(
      expectedMoves.reduce((total, move) => total + passMoveById.get(move.id).moveScore * move.importance, 0) /
        importanceTotal
    );
    assert(section[side].score === expectedScore, `${label}.${side}.score mismatch`);
  }
}
assert(sectionWeightTotal === 100, "section weights must total 100");

exactKeys(scoringPass.burdenCompletionAdjustment, ["pro", "con"], "burdenCompletionAdjustment");
exactKeys(scoringPass.overall, ["pro", "con"], "overall");
const allMoveIds = new Set(lockedMoves.map(({ move }) => move.id));
for (const side of ["pro", "con"]) {
  validateEligibility(scoringPass.burdenCompletionAdjustment[side], `burdenCompletionAdjustment.${side}`, allMoveIds);
  exactKeys(scoringPass.overall[side], ["weightedSectionMean", "burdenCompletionAdjustment", "score"], `overall.${side}`);
  const weightedMean = Number(
    scoringPass.sectionScores
      .reduce((total, section) => total + section[side].score * (section.weightPercent / 100), 0)
      .toFixed(2)
  );
  assert(scoringPass.overall[side].weightedSectionMean === weightedMean, `overall.${side}.weightedSectionMean mismatch`);
  assert(
    scoringPass.overall[side].burdenCompletionAdjustment === scoringPass.burdenCompletionAdjustment[side].value,
    `overall.${side}.burdenCompletionAdjustment mismatch`
  );
  const expectedOverall = Math.max(
    0,
    Math.min(100, Math.round(weightedMean + scoringPass.burdenCompletionAdjustment[side].value))
  );
  assert(scoringPass.overall[side].score === expectedOverall, `overall.${side}.score mismatch`);
}

exactKeys(
  scoringPass.calculationAudit,
  ["moveCount", "sectionCount", "sectionWeightTotal", "allMoveScoresRecomputed", "allSectionScoresRecomputed", "allOverallScoresRecomputed"],
  "calculationAudit"
);
assert(scoringPass.calculationAudit.moveCount === lockedMoves.length, "calculationAudit.moveCount mismatch");
assert(scoringPass.calculationAudit.sectionCount === inventory.sections.length, "calculationAudit.sectionCount mismatch");
assert(scoringPass.calculationAudit.sectionWeightTotal === 100, "calculationAudit.sectionWeightTotal must be 100");
for (const key of ["allMoveScoresRecomputed", "allSectionScoresRecomputed", "allOverallScoresRecomputed"]) {
  assert(scoringPass.calculationAudit[key] === true, `calculationAudit.${key} must be true`);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      debateId: scoringPass.debateId,
      pass: scoringPass.pass,
      moves: lockedMoves.length,
      sections: inventory.sections.length,
      mediumOrLowAudioVerified: mediumOrLowMoves.length,
      schemaUniformity: "exact-v2.2-contract",
      passSha256: sha256(passSource)
    },
    null,
    2
  )
);
