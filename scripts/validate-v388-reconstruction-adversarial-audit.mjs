#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) throw new Error("usage: validate-v388-reconstruction-adversarial-audit.mjs <output> <packet>");
const readJson = async (relativePath) => JSON.parse(await readFile(path.resolve(root, relativePath), "utf8"));
const [output, packet] = await Promise.all([readJson(outputPath), readJson(packetPath)]);
const checkIds = [
  "conclusion-bias", "duplicate-penalty", "asymmetric-burden", "missing-direct-replies",
  "score-prose-alignment", "quote-fidelity", "ai-attribution", "novelty-integrity",
  "charity", "unsupported-claims-or-tags"
];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(output.schemaVersion === "3.8.8-reconstruction-adversarial-audit" && output.protocolId === "v3.8.8-reconstruction-adversarial-audit", "protocol mismatch");
assert(output.debateNumber === packet.debateNumber && output.debateId === packet.debateId, "debate identity mismatch");
assert(output.assessmentModel === "5.6 Sol" && output.calibrationOnly === true && !Number.isNaN(Date.parse(output.completedAt)), "model/calibration/date mismatch");
assert(output.isolation.otherDebatesUnavailable === true && output.isolation.legacyAssessmentsUnavailable === true && output.isolation.editingUnavailable === true && output.isolation.contaminationDetected === false, "isolation assertion failed");
assert(output.checks.length === checkIds.length && new Set(output.checks.map((item) => item.checkId)).size === checkIds.length && checkIds.every((id) => output.checks.some((item) => item.checkId === id)), "audit check coverage mismatch");
const allMoveIds = new Set(packet.moves.map((move) => move.moveId));
for (const item of [...output.checks, ...output.concerns]) {
  assert(item.sourceMoveIds.every((moveId) => allMoveIds.has(moveId)), `${item.checkId}: unknown source move ID`);
}
const concernChecks = new Set(output.checks.filter((item) => item.status === "concern").map((item) => item.checkId));
assert(output.concerns.every((item) => concernChecks.has(item.checkId)), "concern lacks matching concern check");
if (output.verdict === "pass") assert(concernChecks.size === 0 && output.concerns.length === 0, "pass verdict contains concern");
else assert(output.verdict === "needs-review" && concernChecks.size > 0 && output.concerns.length > 0, "needs-review verdict lacks concern");
console.log(JSON.stringify({ status: "passed", debateNumber: output.debateNumber, verdict: output.verdict, checks: output.checks.length, concerns: output.concerns.length, high: output.concerns.filter((item) => item.severity === "high").length, medium: output.concerns.filter((item) => item.severity === "medium").length, low: output.concerns.filter((item) => item.severity === "low").length }, null, 2));
