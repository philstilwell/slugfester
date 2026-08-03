#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const [argument, gateArgument = "docs/calibration/v2.6/held-out-gate/gate-manifest.json"] = process.argv.slice(2);
if (!argument) { console.error("Usage: node scripts/validate-v26-third-review.mjs <third-review.json> [gate.json]"); process.exit(1); }
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exactKeys = (value, expected, label) => { assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be object`); assert(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort()), `${label} keys differ`); };
const source = await readFile(path.resolve(argument), "utf8"); const review = JSON.parse(source);
const gate = JSON.parse(await readFile(path.resolve(gateArgument), "utf8"));
const debate = gate.sample.debates.find((item) => item.debateId === review.debateId); assert(debate, "third review debate not preregistered");
exactKeys(review, ["schemaVersion", "workflowVersion", "gateId", "debateId", "debateNumber", "reviewedAt", "reviewerModel", "calibrationOnly", "isolation", "source", "triggerCategories", "findings", "repairs", "audit"], "third review");
assert(review.schemaVersion === "2.6-triggered-third-review" && review.workflowVersion === gate.workflowVersion && review.gateId === gate.gateId && review.debateNumber === debate.number && review.reviewerModel === "5.6 Sol" && review.calibrationOnly === true, "third review identity mismatch");
exactKeys(review.isolation, ["method", "legacyMaterialAccessed", "developmentExamplesAccessed", "annotationPassesAvailable", "statement"], "isolation");
assert(review.isolation.method === "fresh-triggered-v2.6-third-inventory-review" && review.isolation.legacyMaterialAccessed === false && review.isolation.developmentExamplesAccessed === false && review.isolation.annotationPassesAvailable === false && review.isolation.statement.trim().length >= 40, "third review isolation failed");
exactKeys(review.source, ["firstReviewPath", "firstReviewSha256", "reviewedInventoryPath", "reviewedInventorySha256", "finalInventoryPath", "finalInventorySha256", "transcriptSha256", "eventsSha256", "manifestSha256"], "source");
const sourceFiles = { firstReviewSha256: review.source.firstReviewPath, reviewedInventorySha256: review.source.reviewedInventoryPath, finalInventorySha256: review.source.finalInventoryPath, transcriptSha256: `.assessment-cache/captions/${debate.videoId}/transcript.txt`, eventsSha256: `.assessment-cache/captions/${debate.videoId}/events.json`, manifestSha256: `.assessment-cache/captions/${debate.videoId}/manifest.json` };
const loaded = {};
for (const [field, file] of Object.entries(sourceFiles)) { loaded[field] = await readFile(path.resolve(file), "utf8"); assert(review.source[field] === sha256(loaded[field]), `${field} mismatch`); }
const first = JSON.parse(loaded.firstReviewSha256);
assert(first.thirdReviewTrigger.required === true && JSON.stringify([...first.thirdReviewTrigger.categories].sort()) === JSON.stringify([...review.triggerCategories].sort()), "trigger categories mismatch");
const findings = new Set(); for (const item of review.findings) { exactKeys(item, ["findingId", "category", "moveId", "description", "disposition"], `finding ${item.findingId}`); assert(!findings.has(item.findingId), "duplicate finding"); findings.add(item.findingId); }
const repairs = new Set(); for (const item of review.repairs) { exactKeys(item, ["findingId", "change"], `repair ${item.findingId}`); assert(findings.has(item.findingId) && !repairs.has(item.findingId), "invalid repair"); repairs.add(item.findingId); }
for (const item of review.findings.filter((value) => value.disposition === "repaired")) assert(repairs.has(item.findingId), `missing repair ${item.findingId}`);
exactKeys(review.audit, ["triggeredIssuesRechecked", "sourceFidelityViolations", "atomicityViolations", "targetPacketViolations", "burdenRouteViolations", "componentGraphViolations", "componentOverlapViolations", "targetRecencyViolations", "samplingViolations", "speakerAttributionViolations", "unresolvedFindings", "finalInventoryValidatorPassed"], "audit");
for (const [key, value] of Object.entries(review.audit)) assert(["triggeredIssuesRechecked", "finalInventoryValidatorPassed"].includes(key) ? value === true : value === 0, `${key} audit failed`);
console.log(JSON.stringify({ status: "passed", debateId: review.debateId, triggerCategories: review.triggerCategories, findingCount: findings.size, repairCount: repairs.size, reviewSha256: sha256(source) }, null, 2));
