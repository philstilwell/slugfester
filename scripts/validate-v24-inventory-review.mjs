#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const [reviewArgument, gateArgument = "docs/calibration/v2.4/held-out-gate/gate-manifest.json"] = process.argv.slice(2);
if (!reviewArgument) {
  console.error("Usage: node scripts/validate-v24-inventory-review.mjs <review.json> [gate-manifest.json]");
  process.exit(1);
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function exactKeys(value, expected, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort()), `${label} keys differ from contract`);
}

const reviewSource = await readFile(path.resolve(reviewArgument), "utf8");
const review = JSON.parse(reviewSource);
const gateSource = await readFile(path.resolve(gateArgument), "utf8");
const gate = JSON.parse(gateSource);
const gateDebate = gate.sample.debates.find((debate) => debate.debateId === review.debateId);
assert(gateDebate, "review debate not in held-out sample");
exactKeys(review, ["schemaVersion", "workflowVersion", "gateId", "debateId", "debateNumber", "reviewedAt", "reviewerModel", "calibrationOnly", "isolation", "source", "findings", "repairs", "audit"], "review");
assert(review.schemaVersion === "2.4-inventory-review" && review.workflowVersion === gate.workflowVersion && review.gateId === gate.gateId, "review version mismatch");
assert(review.debateNumber === gateDebate.number && review.reviewerModel === "5.6 Sol" && review.calibrationOnly === true && !Number.isNaN(Date.parse(review.reviewedAt)), "review identity mismatch");
exactKeys(review.isolation, ["method", "legacyMaterialAccessed", "developmentExamplesAccessed", "annotationPassesAvailable", "statement"], "isolation");
assert(review.isolation.method === "fresh-independent-v2.4-inventory-review" && review.isolation.legacyMaterialAccessed === false && review.isolation.developmentExamplesAccessed === false && review.isolation.annotationPassesAvailable === false && review.isolation.statement.trim().length >= 40, "review isolation failed");
exactKeys(review.source, ["draftInventoryPath", "draftInventorySha256", "finalInventoryPath", "finalInventorySha256", "transcriptSha256", "eventsSha256", "manifestSha256", "workflowSha256", "inventorySchemaSha256", "gateManifestSha256"], "source");
const [draftSource, finalSource, transcriptSource, eventsSource, manifestSource, workflowSource, inventorySchemaSource] = await Promise.all([
  readFile(path.resolve(review.source.draftInventoryPath), "utf8"),
  readFile(path.resolve(review.source.finalInventoryPath), "utf8"),
  readFile(path.resolve(`.assessment-cache/captions/${gateDebate.videoId}/transcript.txt`), "utf8"),
  readFile(path.resolve(`.assessment-cache/captions/${gateDebate.videoId}/events.json`), "utf8"),
  readFile(path.resolve(`.assessment-cache/captions/${gateDebate.videoId}/manifest.json`), "utf8"),
  readFile(path.resolve("docs/assessment-workflow-v2.4.md"), "utf8"),
  readFile(path.resolve("docs/calibration/v2.4/atomic-inventory-schema.json"), "utf8"),
]);
assert(review.source.draftInventorySha256 === sha256(draftSource) && review.source.finalInventorySha256 === sha256(finalSource), "inventory hash mismatch");
assert(review.source.transcriptSha256 === sha256(transcriptSource) && review.source.eventsSha256 === sha256(eventsSource) && review.source.manifestSha256 === sha256(manifestSource), "caption source hash mismatch");
assert(review.source.workflowSha256 === sha256(workflowSource) && review.source.inventorySchemaSha256 === sha256(inventorySchemaSource) && review.source.gateManifestSha256 === sha256(gateSource), "contract hash mismatch");
const finalInventory = JSON.parse(finalSource);
assert(finalInventory.debateId === review.debateId, "final inventory identity mismatch");

assert(Array.isArray(review.findings) && Array.isArray(review.repairs), "findings and repairs must be arrays");
const findingIds = new Set();
for (const [index, finding] of review.findings.entries()) {
  exactKeys(finding, ["findingId", "category", "moveId", "description", "disposition"], `findings[${index}]`);
  assert(!findingIds.has(finding.findingId), `duplicate finding ${finding.findingId}`);
  findingIds.add(finding.findingId);
  assert(["source-fidelity", "atomicity", "target-packet", "burden", "sampling", "speaker-attribution"].includes(finding.category), `invalid finding category`);
  assert(finding.description.trim().length >= 20 && ["repaired", "not-a-violation"].includes(finding.disposition), `invalid finding ${finding.findingId}`);
}
const repairIds = new Set();
for (const [index, repair] of review.repairs.entries()) {
  exactKeys(repair, ["findingId", "change"], `repairs[${index}]`);
  assert(findingIds.has(repair.findingId) && !repairIds.has(repair.findingId) && repair.change.trim().length >= 20, `invalid repair ${repair.findingId}`);
  repairIds.add(repair.findingId);
}
for (const finding of review.findings.filter((item) => item.disposition === "repaired")) assert(repairIds.has(finding.findingId), `missing repair for ${finding.findingId}`);
exactKeys(review.audit, ["sourceFidelityViolations", "atomicityViolations", "targetPacketViolations", "burdenViolations", "samplingViolations", "speakerAttributionViolations", "unresolvedFindings", "finalInventoryValidatorPassed"], "audit");
for (const key of ["sourceFidelityViolations", "atomicityViolations", "targetPacketViolations", "burdenViolations", "samplingViolations", "speakerAttributionViolations", "unresolvedFindings"]) assert(review.audit[key] === 0, `${key} must be zero`);
assert(review.audit.finalInventoryValidatorPassed === true, "final inventory validator not recorded as passed");
console.log(JSON.stringify({ status: "passed", debateId: review.debateId, findingCount: review.findings.length, repairCount: review.repairs.length, reviewSha256: sha256(reviewSource) }, null, 2));
