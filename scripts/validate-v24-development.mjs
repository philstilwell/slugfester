#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

function assert(condition, message) { if (!condition) throw new Error(message); }
const sourcePath = path.resolve("docs/calibration/v2.4/development/v2.3-disagreements.json");
const examplesPath = path.resolve("docs/calibration/v2.4/development/orthogonal-examples.json");
const [source, artifact, manual] = await Promise.all([
  readFile(sourcePath, "utf8").then(JSON.parse),
  readFile(examplesPath, "utf8").then(JSON.parse),
  readFile(path.resolve("docs/calibration/v2.4/development/annotation-manual.md"), "utf8"),
]);
assert(source.disagreementCount === 32 && source.examples.length === 32, "development source must contain all 32 disagreements");
assert(artifact.schemaVersion === "2.4-development-orthogonal-examples" && artifact.model === "5.6 Sol" && artifact.heldOutEligible === false, "development artifact identity mismatch");
assert(artifact.exampleCount === 32 && artifact.examples.length === 32, "orthogonal examples must contain all 32 disagreements");
const sourceById = new Map(source.examples.map((item) => [item.exampleId, item]));
const seen = new Set();
for (const item of artifact.examples) {
  assert(!seen.has(item.exampleId), `duplicate example ${item.exampleId}`); seen.add(item.exampleId);
  const original = sourceById.get(item.exampleId); assert(original, `unknown example ${item.exampleId}`);
  for (const field of ["debateId", "debateNumber", "moveId", "side", "speaker", "timestamp", "sourceExcerpt"]) assert(item[field] === original[field], `${item.exampleId}: ${field} not preserved`);
  assert(JSON.stringify(item.sourceSpan) === JSON.stringify(original.sourceSpan) && JSON.stringify(item.burdenIds) === JSON.stringify(original.burdenIds), `${item.exampleId}: source span or burdens not preserved`);
  const annotation = item.annotation;
  assert(["constructive", "responsive"].includes(annotation.interactionMode), `${item.exampleId}: invalid interactionMode`);
  if (annotation.interactionMode === "constructive") assert(annotation.targetCoverage === "not-applicable", `${item.exampleId}: constructive coverage invalid`);
  else assert(["full", "partial", "relevant-nonanswer", "substitution"].includes(annotation.targetCoverage), `${item.exampleId}: responsive coverage invalid`);
  assert(typeof annotation.diagnostic === "boolean" && typeof annotation.reframe === "boolean", `${item.exampleId}: mechanism flags invalid`);
  assert(["completes", "advances-central", "advances-sub-burden", "topical-peripheral", "unadopted-or-irrelevant"].includes(annotation.burdenRelation), `${item.exampleId}: burdenRelation invalid`);
  for (const field of ["targetRationale", "coverageRationale", "diagnosticRationale", "reframeRationale", "burdenRationale", "legacyCaution"]) assert(annotation[field]?.trim().length >= 40, `${item.exampleId}: ${field} too short`);
}
assert(manual.includes("Mechanism flags were decided independently of coverage") || manual.includes("mechanism flags were decided independently of coverage"), "manual lacks orthogonality self-audit");
assert(!/\b(?:score|points?)\s*[:=]\s*\d+/iu.test(JSON.stringify(artifact)), "numerical performance score detected");
console.log(JSON.stringify({ status: "passed", sourceDisagreements: source.examples.length, orthogonalExamples: artifact.examples.length, heldOutEligible: false }, null, 2));
