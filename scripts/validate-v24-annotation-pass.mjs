#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const [passArgument, gateArgument = "docs/calibration/v2.4/held-out-gate/gate-manifest.json"] = process.argv.slice(2);
if (!passArgument) {
  console.error("Usage: node scripts/validate-v24-annotation-pass.mjs <pass.json> [gate-manifest.json]");
  process.exit(1);
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function exactKeys(value, expected, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort()), `${label} keys differ from contract`);
}

const passSource = await readFile(path.resolve(passArgument), "utf8");
const artifact = JSON.parse(passSource);
const gateSource = await readFile(path.resolve(gateArgument), "utf8");
const gate = JSON.parse(gateSource);
const debate = gate.sample.debates.find((item) => item.debateId === artifact.debateId);
assert(debate, "annotation debate is not in sample");
exactKeys(artifact, ["schemaVersion", "workflowVersion", "rubricVersion", "gateId", "debateId", "debateNumber", "pass", "model", "calibrationOnly", "completedAt", "isolation", "source", "annotations", "audit"], "annotation pass");
assert(artifact.schemaVersion === "2.4-annotation-pass" && artifact.workflowVersion === gate.workflowVersion && artifact.rubricVersion === gate.rubricVersion && artifact.gateId === gate.gateId, "annotation version mismatch");
assert(artifact.debateNumber === debate.number && ["A", "B"].includes(artifact.pass) && artifact.model === "5.6 Sol" && artifact.calibrationOnly === true && !Number.isNaN(Date.parse(artifact.completedAt)), "annotation identity mismatch");

const expectedInputs = [
  "docs/assessment-workflow-v2.4.md",
  "docs/reassessment-rubric-v2.4.md",
  "docs/calibration/v2.4/annotation-pass-schema.json",
  "docs/calibration/v2.4/held-out-gate/gate-manifest.json",
  "docs/calibration/v2.4/development/annotation-manual.md",
  "docs/calibration/v2.4/development/orthogonal-examples.json",
  `docs/calibration/v2.4/held-out-gate/inventories/${debate.debateId}.json`,
  `.assessment-cache/captions/${debate.videoId}/transcript.txt`,
  `.assessment-cache/captions/${debate.videoId}/events.json`,
  `.assessment-cache/captions/${debate.videoId}/manifest.json`,
];
exactKeys(artifact.isolation, ["method", "allowedInputs", "prohibitedInputsConfirmed", "contaminationDetected", "statement"], "isolation");
assert(artifact.isolation.method === "fresh-isolated-v2.4-annotation-task" && artifact.isolation.prohibitedInputsConfirmed === true && artifact.isolation.contaminationDetected === false && artifact.isolation.statement.trim().length >= 40, "annotation isolation failed");
assert(JSON.stringify([...artifact.isolation.allowedInputs].sort()) === JSON.stringify([...expectedInputs].sort()), "allowedInputs differs from exact ten-path allowlist");

exactKeys(artifact.source, ["videoId", "inventoryPath", "inventorySha256", "transcriptSha256", "eventsSha256", "manifestSha256", "gateManifestSha256", "workflowSha256", "rubricSha256", "schemaSha256", "developmentManualSha256", "developmentExamplesSha256", "limitations"], "source");
assert(artifact.source.videoId === debate.videoId && artifact.source.inventoryPath === expectedInputs[6], "annotation source identity mismatch");
const sourcePaths = {
  inventorySha256: expectedInputs[6],
  transcriptSha256: expectedInputs[7],
  eventsSha256: expectedInputs[8],
  manifestSha256: expectedInputs[9],
  gateManifestSha256: expectedInputs[3],
  workflowSha256: expectedInputs[0],
  rubricSha256: expectedInputs[1],
  schemaSha256: expectedInputs[2],
  developmentManualSha256: expectedInputs[4],
  developmentExamplesSha256: expectedInputs[5],
};
const loaded = {};
for (const [field, file] of Object.entries(sourcePaths)) {
  loaded[field] = await readFile(path.resolve(file), "utf8");
  assert(artifact.source[field] === sha256(loaded[field]), `${field} mismatch`);
}
assert(artifact.source.limitations.trim().length >= 1, "source limitations missing");
const inventory = JSON.parse(loaded.inventorySha256);
const inventoryById = new Map(inventory.moves.map((move) => [move.moveId, move]));
assert(Array.isArray(artifact.annotations) && artifact.annotations.length === 12, "pass must annotate 12 moves");
const seen = new Set();
for (const [index, annotation] of artifact.annotations.entries()) {
  const label = `annotations[${index}]`;
  exactKeys(annotation, ["moveId", "interactionMode", "targetPacketId", "targetCoverage", "mechanismFlags", "burdenRelation", "coverageRationale", "mechanismRationale", "burdenRationale", "confidence"], label);
  assert(!seen.has(annotation.moveId), `${label} duplicated`);
  seen.add(annotation.moveId);
  const move = inventoryById.get(annotation.moveId);
  assert(move, `${label} unknown move`);
  assert(annotation.interactionMode === move.interactionMode, `${label} changed locked interactionMode`);
  assert(annotation.targetPacketId === (move.targetPacket?.id ?? null), `${label} changed locked targetPacketId`);
  exactKeys(annotation.mechanismFlags, ["diagnostic", "reframe"], `${label}.mechanismFlags`);
  assert(typeof annotation.mechanismFlags.diagnostic === "boolean" && typeof annotation.mechanismFlags.reframe === "boolean", `${label} mechanism flags invalid`);
  assert(["completes", "advances-central", "advances-sub-burden", "topical-peripheral", "unadopted-or-irrelevant"].includes(annotation.burdenRelation), `${label} burdenRelation invalid`);
  if (move.interactionMode === "constructive") assert(annotation.targetCoverage === "not-applicable" && annotation.targetPacketId === null, `${label} constructive coverage invalid`);
  else assert(["full", "partial", "relevant-nonanswer", "substitution"].includes(annotation.targetCoverage) && annotation.targetPacketId, `${label} responsive coverage invalid`);
  assert(annotation.coverageRationale.trim().length >= 40 && annotation.mechanismRationale.trim().length >= 40 && annotation.burdenRationale.trim().length >= 40, `${label} rationale too short`);
  assert(["high", "medium", "low"].includes(annotation.confidence), `${label} confidence invalid`);
}
assert(seen.size === inventoryById.size, "not every inventory move was annotated once");
exactKeys(artifact.audit, ["moveCount", "allInteractionModesCopied", "allTargetPacketIdsCopied", "scoreFieldsPresent", "allMovesAnnotatedOnce"], "audit");
assert(artifact.audit.moveCount === 12 && artifact.audit.allInteractionModesCopied === true && artifact.audit.allTargetPacketIdsCopied === true && artifact.audit.scoreFieldsPresent === false && artifact.audit.allMovesAnnotatedOnce === true, "annotation audit failed");
console.log(JSON.stringify({ status: "passed", debateId: artifact.debateId, pass: artifact.pass, moveCount: 12, passSha256: sha256(passSource) }, null, 2));
