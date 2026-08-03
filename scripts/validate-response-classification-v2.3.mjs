#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const [passArgument, inventoryArgument, gateArgument] = process.argv.slice(2);
if (!passArgument || !inventoryArgument || !gateArgument) {
  console.error("Usage: node scripts/validate-response-classification-v2.3.mjs <classification-pass.json> <inventory.json> <gate-manifest.json>");
  process.exit(1);
}

const workspaceRoot = path.resolve(".");
const passPath = path.resolve(passArgument);
const inventoryPath = path.resolve(inventoryArgument);
const gatePath = path.resolve(gateArgument);
const workflowPath = path.join(workspaceRoot, "docs", "assessment-workflow-v2.3.md");
const rubricPath = path.join(workspaceRoot, "docs", "reassessment-rubric-v2.3.md");
const schemaPath = path.join(workspaceRoot, "docs", "calibration", "v2.3", "response-classification-schema.json");

function assert(condition, message) { if (!condition) throw new Error(message); }
function sha256(source) { return createHash("sha256").update(source).digest("hex"); }
function relative(filePath) { return path.relative(workspaceRoot, filePath).split(path.sep).join("/"); }
function exactKeys(value, expected, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort()), `${label} keys differ from the exact v2.3 contract`);
}
function digest(value, label) { assert(typeof value === "string" && /^[a-f0-9]{64}$/.test(value), `${label} must be a SHA-256 digest`); }

const [passSource, inventorySource, gateSource, workflowSource, rubricSource, schemaSource] = await Promise.all([
  readFile(passPath, "utf8"), readFile(inventoryPath, "utf8"), readFile(gatePath, "utf8"),
  readFile(workflowPath, "utf8"), readFile(rubricPath, "utf8"), readFile(schemaPath, "utf8")
]);
const classificationPass = JSON.parse(passSource);
const inventory = JSON.parse(inventorySource);
const gate = JSON.parse(gateSource);

exactKeys(classificationPass, ["schemaVersion", "workflowVersion", "rubricVersion", "gateId", "debateId", "debateNumber", "pass", "assessmentModel", "calibrationOnly", "completedAt", "isolation", "source", "classifications", "audit"], "pass");
assert(classificationPass.schemaVersion === "2.3-response-classification-pass", "schemaVersion mismatch");
assert(classificationPass.workflowVersion === gate.workflowVersion, "workflowVersion mismatch");
assert(classificationPass.rubricVersion === gate.rubricVersion, "rubricVersion mismatch");
assert(classificationPass.gateId === gate.gateId, "gateId mismatch");
assert(classificationPass.debateId === inventory.debateId, "debateId mismatch");
assert(classificationPass.debateNumber === inventory.debateNumber, "debateNumber mismatch");
assert(["A", "B"].includes(classificationPass.pass), "pass must be A or B");
assert(classificationPass.assessmentModel === "5.6 Sol", "assessmentModel must be 5.6 Sol");
assert(classificationPass.calibrationOnly === true, "calibrationOnly must be true");
assert(!Number.isNaN(Date.parse(classificationPass.completedAt)), "completedAt must be an ISO timestamp");

exactKeys(classificationPass.isolation, ["method", "allowedInputs", "prohibitedInputsConfirmed", "contaminationDetected", "statement"], "isolation");
assert(classificationPass.isolation.method === "fresh-isolated-classification-task", "isolation.method mismatch");
assert(classificationPass.isolation.prohibitedInputsConfirmed === true && classificationPass.isolation.contaminationDetected === false, "classification isolation failed");
assert(typeof classificationPass.isolation.statement === "string" && classificationPass.isolation.statement.trim().length >= 40, "isolation.statement is too short");

exactKeys(classificationPass.source, ["videoId", "inventoryPath", "inventorySha256", "transcriptSha256", "eventsSha256", "captionManifestSha256", "audioVerificationPath", "audioVerificationSha256", "gateManifestSha256", "workflowSha256", "rubricSha256", "schemaSha256", "limitations"], "source");
for (const key of ["inventorySha256", "transcriptSha256", "eventsSha256", "captionManifestSha256", "audioVerificationSha256", "gateManifestSha256", "workflowSha256", "rubricSha256", "schemaSha256"]) digest(classificationPass.source[key], `source.${key}`);
assert(classificationPass.source.inventoryPath === relative(inventoryPath), "inventoryPath mismatch");
assert(classificationPass.source.inventorySha256 === sha256(inventorySource), "inventory hash mismatch");
assert(classificationPass.source.gateManifestSha256 === sha256(gateSource), "gate hash mismatch");
assert(classificationPass.source.workflowSha256 === sha256(workflowSource), "workflow hash mismatch");
assert(classificationPass.source.rubricSha256 === sha256(rubricSource), "rubric hash mismatch");
assert(classificationPass.source.schemaSha256 === sha256(schemaSource), "schema hash mismatch");
const gateDebate = gate.sample.debates.find((entry) => entry.debateId === inventory.debateId);
assert(gateDebate && classificationPass.source.videoId === gateDebate.videoId, "videoId mismatch");
const captionRoot = path.join(workspaceRoot, ".assessment-cache", "captions", gateDebate.videoId);
const audioPath = path.resolve(classificationPass.source.audioVerificationPath);
const [transcriptSource, eventsSource, captionManifestSource, audioSource] = await Promise.all([
  readFile(path.join(captionRoot, "transcript.txt")), readFile(path.join(captionRoot, "events.json")),
  readFile(path.join(captionRoot, "manifest.json")), readFile(audioPath)
]);
for (const [label, actual, source] of [["transcript", classificationPass.source.transcriptSha256, transcriptSource], ["events", classificationPass.source.eventsSha256, eventsSource], ["captionManifest", classificationPass.source.captionManifestSha256, captionManifestSource], ["audioVerification", classificationPass.source.audioVerificationSha256, audioSource]]) assert(actual === sha256(source), `${label} hash mismatch`);
assert(relative(audioPath) === classificationPass.source.audioVerificationPath, "audioVerificationPath must be workspace-relative");
const expectedAllowlist = [relative(workflowPath), relative(rubricPath), relative(schemaPath), relative(gatePath), relative(inventoryPath), relative(audioPath), relative(path.join(captionRoot, "transcript.txt")), relative(path.join(captionRoot, "events.json")), relative(path.join(captionRoot, "manifest.json"))].sort();
assert(JSON.stringify([...classificationPass.isolation.allowedInputs].sort()) === JSON.stringify(expectedAllowlist), "isolation.allowedInputs must equal the exhaustive classification allowlist");

const responseClasses = new Set(["constructive-opening", "full-answer", "partial-answer", "diagnostic-defeat", "relevant-counterargument", "justified-reframe", "weaker-substitution"]);
const lockedEntries = inventory.sections.flatMap((section) => section.moves.map((move) => ({sectionId: section.id, move})));
const inventoryById = new Map(lockedEntries.map((entry) => [entry.move.id, entry]));
assert(inventoryById.size === lockedEntries.length, "inventory move IDs must be unique");
assert(Array.isArray(classificationPass.classifications) && classificationPass.classifications.length === lockedEntries.length, "every move must be classified exactly once");
const seen = new Set();
for (const [index, item] of classificationPass.classifications.entries()) {
  const label = `classifications[${index}]`;
  exactKeys(item, ["moveId", "sectionId", "side", "targetMoveIds", "responseClass", "compoundTarget", "indispensableComponents", "decisiveTargetSummary", "rationale", "confidence"], label);
  assert(!seen.has(item.moveId), `${label}.moveId is duplicated`); seen.add(item.moveId);
  const locked = inventoryById.get(item.moveId); assert(locked, `${label}.moveId is unknown`);
  assert(item.sectionId === locked.sectionId && item.side === locked.move.side, `${label} identity mismatch`);
  assert(responseClasses.has(item.responseClass), `${label}.responseClass is invalid`);
  assert(Array.isArray(item.targetMoveIds) && new Set(item.targetMoveIds).size === item.targetMoveIds.length, `${label}.targetMoveIds must be unique`);
  for (const targetId of item.targetMoveIds) { assert(targetId !== item.moveId, `${label} cannot target itself`); assert(inventoryById.has(targetId), `${label} target ${targetId} is unknown`); }
  assert(Array.isArray(item.indispensableComponents) && item.indispensableComponents.length >= 1, `${label}.indispensableComponents must not be empty`);
  assert(item.compoundTarget === (item.indispensableComponents.length > 1), `${label}.compoundTarget must reflect component count`);
  if (item.responseClass === "constructive-opening") assert(item.targetMoveIds.length === 0, `${label} constructive-opening must have no targetMoveIds`);
  assert(typeof item.decisiveTargetSummary === "string" && item.decisiveTargetSummary.trim().length >= 10, `${label}.decisiveTargetSummary is too short`);
  assert(typeof item.rationale === "string" && item.rationale.trim().length >= 40, `${label}.rationale is too short`);
  assert(["high", "medium", "low"].includes(item.confidence), `${label}.confidence is invalid`);
}
exactKeys(classificationPass.audit, ["moveCount", "scoreFieldsPresent", "allMovesClassifiedOnce"], "audit");
assert(classificationPass.audit.moveCount === lockedEntries.length && classificationPass.audit.scoreFieldsPresent === false && classificationPass.audit.allMovesClassifiedOnce === true, "classification audit mismatch");
assert(!/"(?:moveScore|dimensions|overall|sectionScores|burdenCompletionAdjustment)"\s*:/.test(passSource), "classification pass contains prohibited score fields");
console.log(JSON.stringify({status: "passed", debateId: inventory.debateId, pass: classificationPass.pass, moves: lockedEntries.length, schemaUniformity: "exact-v2.3-classification-contract", passSha256: sha256(passSource)}, null, 2));
