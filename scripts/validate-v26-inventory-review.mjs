#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const [reviewArgument, gateArgument = "docs/calibration/v2.6/held-out-gate/gate-manifest.json"] = process.argv.slice(2);
if (!reviewArgument) { console.error("Usage: node scripts/validate-v26-inventory-review.mjs <review.json> [gate.json]"); process.exit(1); }
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exactKeys = (value, expected, label) => { assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be object`); assert(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort()), `${label} keys differ`); };
const reviewSource = await readFile(path.resolve(reviewArgument), "utf8");
const review = JSON.parse(reviewSource);
const gateSource = await readFile(path.resolve(gateArgument), "utf8");
const gate = JSON.parse(gateSource);
const debate = gate.sample.debates.find((item) => item.debateId === review.debateId);
assert(debate, "review debate not preregistered");

exactKeys(review, ["schemaVersion", "workflowVersion", "gateId", "debateId", "debateNumber", "reviewedAt", "reviewerModel", "calibrationOnly", "isolation", "source", "findings", "repairs", "thirdReviewTrigger", "audit"], "review");
assert(review.schemaVersion === "2.6-inventory-review" && review.workflowVersion === gate.workflowVersion && review.gateId === gate.gateId && review.debateNumber === debate.number && review.reviewerModel === "5.6 Sol" && review.calibrationOnly === true, "review identity mismatch");
exactKeys(review.isolation, ["method", "legacyMaterialAccessed", "developmentExamplesAccessed", "annotationPassesAvailable", "statement"], "isolation");
assert(review.isolation.method === "fresh-independent-v2.6-inventory-review" && review.isolation.legacyMaterialAccessed === false && review.isolation.developmentExamplesAccessed === false && review.isolation.annotationPassesAvailable === false && review.isolation.statement.trim().length >= 40, "review isolation failed");
exactKeys(review.source, ["draftInventoryPath", "draftInventorySha256", "reviewedInventoryPath", "reviewedInventorySha256", "transcriptSha256", "eventsSha256", "manifestSha256", "workflowSha256", "inventorySchemaSha256", "gateManifestSha256"], "source");
const sourceFiles = {
  draftInventorySha256: review.source.draftInventoryPath,
  reviewedInventorySha256: review.source.reviewedInventoryPath,
  transcriptSha256: `.assessment-cache/captions/${debate.videoId}/transcript.txt`,
  eventsSha256: `.assessment-cache/captions/${debate.videoId}/events.json`,
  manifestSha256: `.assessment-cache/captions/${debate.videoId}/manifest.json`,
  workflowSha256: "docs/assessment-workflow-v2.6.md",
  inventorySchemaSha256: "docs/calibration/v2.6/atomic-inventory-schema.json",
};
for (const [field, file] of Object.entries(sourceFiles)) assert(review.source[field] === sha256(await readFile(path.resolve(file), "utf8")), `${field} mismatch`);
assert(review.source.gateManifestSha256 === sha256(gateSource), "gateManifestSha256 mismatch");

const findings = new Map();
for (const finding of review.findings) { exactKeys(finding, ["findingId", "category", "moveId", "description", "disposition"], `finding ${finding.findingId}`); assert(!findings.has(finding.findingId), "duplicate finding"); findings.set(finding.findingId, finding); }
const triggerCategories = new Set(); const repairs = new Set();
for (const repair of review.repairs) { exactKeys(repair, ["findingId", "change", "triggerCategory"], `repair ${repair.findingId}`); assert(findings.has(repair.findingId) && !repairs.has(repair.findingId), "invalid repair"); repairs.add(repair.findingId); if (repair.triggerCategory !== null) triggerCategories.add(repair.triggerCategory); }
for (const finding of review.findings.filter((item) => item.disposition === "repaired")) assert(repairs.has(finding.findingId), `missing repair ${finding.findingId}`);
exactKeys(review.thirdReviewTrigger, ["required", "categories", "rationale"], "thirdReviewTrigger");
assert(review.thirdReviewTrigger.required === (triggerCategories.size > 0), "third review trigger boolean mismatch");
assert(JSON.stringify([...review.thirdReviewTrigger.categories].sort()) === JSON.stringify([...triggerCategories].sort()), "third review categories mismatch");
exactKeys(review.audit, ["sourceFidelityViolations", "atomicityViolations", "targetPacketViolations", "burdenRouteViolations", "componentGraphViolations", "componentOverlapViolations", "targetRecencyViolations", "samplingViolations", "speakerAttributionViolations", "unresolvedFindings", "reviewedInventoryValidatorPassed"], "audit");
for (const [key, value] of Object.entries(review.audit)) assert(key === "reviewedInventoryValidatorPassed" ? value === true : value === 0, `${key} audit failed`);
console.log(JSON.stringify({ status: "passed", debateId: review.debateId, findingCount: findings.size, repairCount: repairs.size, thirdReviewRequired: review.thirdReviewTrigger.required, triggerCategories: review.thirdReviewTrigger.categories, reviewSha256: sha256(reviewSource) }, null, 2));
