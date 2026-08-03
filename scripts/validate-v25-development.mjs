#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { deriveBurdenRelation, deriveCoverage, deriveDiagnostic, deriveReframe, evidenceMatches } from "./lib/v25-derived-annotations.mjs";

function assert(condition, message) { if (!condition) throw new Error(message); }
const source = JSON.parse(await readFile(path.resolve("docs/calibration/v2.5/development/v2.4-disputed-cases.json"), "utf8"));
const artifact = JSON.parse(await readFile(path.resolve("docs/calibration/v2.5/development/derived-examples.json"), "utf8"));
const manual = await readFile(path.resolve("docs/calibration/v2.5/development/annotation-manual.md"), "utf8");
assert(source.caseCount === 15 && source.disputedFieldCount === 24 && source.cases.length === 15, "development source count mismatch");
assert(artifact.schemaVersion === "2.5-development-derived-examples" && artifact.model === "5.6 Sol" && artifact.heldOutEligible === false && artifact.exampleCount === 15 && artifact.examples.length === 15, "development artifact identity mismatch");
const heldOut = new Set(["enoch-sampson-loeb-lutz-moral-realism-2024", "licona-carrier-resurrection-history-2010", "dennett-caruso-free-will-responsibility-2021"]);
const byId = new Map(source.cases.map((item) => [item.caseId, item])); const seen = new Set();
for (const item of artifact.examples) {
  assert(!seen.has(item.caseId), `duplicate ${item.caseId}`); seen.add(item.caseId);
  const original = byId.get(item.caseId); assert(original, `unknown ${item.caseId}`); assert(!heldOut.has(item.debateId), `${item.caseId} contaminates held-out sample`);
  for (const field of ["debateId", "debateNumber", "moveId", "side", "speaker", "timestamp", "sourceExcerpt", "interactionMode"]) assert(item[field] === original[field], `${item.caseId}: ${field} not preserved`);
  assert(JSON.stringify(item.sourceSpan) === JSON.stringify(original.sourceSpan) && JSON.stringify(item.targetPacket) === JSON.stringify(original.targetPacket), `${item.caseId}: source or target packet not preserved`);
  const move = { interactionMode: item.interactionMode, burdenPacket: item.burdenPacket };
  const inventory = { burdenRoutes: item.burdenRoutes };
  const { coveragePrimitives: coverage, diagnosticPrimitives: diagnostic, reframePrimitives: reframe, burdenPrimitives: burden } = item.annotation;
  for (const evidence of [diagnostic.defectEvidence, diagnostic.targetImpactEvidence, reframe.malformedDemandEvidence, reframe.replacementDemandEvidence]) assert(evidenceMatches(item.sourceExcerpt, evidence), `${item.caseId}: evidence offset mismatch`);
  assert(deriveCoverage(move, coverage) === coverage.derivedTargetCoverage && coverage.derivedTargetCoverage === original.locked.targetCoverage, `${item.caseId}: coverage derivation mismatch`);
  assert(deriveDiagnostic(diagnostic) === diagnostic.derivedDiagnostic && diagnostic.derivedDiagnostic === original.locked.diagnostic, `${item.caseId}: diagnostic derivation mismatch`);
  assert(deriveReframe(reframe) === reframe.derivedReframe && reframe.derivedReframe === original.locked.reframe, `${item.caseId}: reframe derivation mismatch`);
  assert(deriveBurdenRelation(inventory, move, burden) === burden.derivedBurdenRelation && burden.derivedBurdenRelation === original.locked.burdenRelation, `${item.caseId}: burden derivation mismatch`);
}
for (const phrase of ["sourceExcerpt.slice(startChar, endChar) === text", "Do not reason backward", "highest contacted tier derives the relation", "No score"]) assert(manual.includes(phrase), `manual missing required control: ${phrase}`);
console.log(JSON.stringify({ status: "passed", caseCount: source.caseCount, disputedFieldCount: source.disputedFieldCount, derivedExampleCount: artifact.examples.length, heldOutContamination: 0 }, null, 2));
