#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { auditDecomposedStrictSchema } from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";

const ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-route-section-selection-development";
const analysis = JSON.parse(await readFile(`${ROOT}/development-analysis.json`));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  analysis.status,
  "route-section-selection-retired-regression-passed-successor-preparation-not-authorized"
);
assert.equal(analysis.failedGateDisposition.allFiveFailedGatesPreserved, true);
assert.equal(analysis.failedGateDisposition.validFailedGatePlansReusableForAcceptance, false);
assert.deepEqual(analysis.design.stages, [
  "inventory-routes", "inventory-sections", "candidate-selection",
]);
assert.equal(analysis.design.finalInventorySemanticsChanged, false);
assert.equal(analysis.regression.acceptedRetiredArtifactsReplayed, 22);
assert.equal(analysis.regression.failedGateValidPlansReplayedAsEvidenceOnly, 8);
assert.equal(analysis.regression.recomposedPlansIdentical, 30);
assert.equal(analysis.regression.routeBindingTamperRejected, true);
assert.equal(analysis.regression.freshModelEvidenceUsed, false);
assert.equal(analysis.sizing.everyStageWithinCeiling, true);
assert(analysis.sizing.routeMaximumCopiedInputBytes <= 115000);
assert(analysis.sizing.sectionMaximumCopiedInputBytes <= 115000);
assert(analysis.sizing.selectionMaximumCopiedInputBytes <= 115000);
assert.equal(analysis.conclusion.strictThreeStageContractFeasible, true);
assert.equal(analysis.conclusion.guaranteesModelCompletion, false);
assert.equal(analysis.conclusion.sufficientEvidenceForFreshSuccessorGate, false);
for (const record of analysis.schemas) {
  const [routeBytes, sectionBytes] = await Promise.all([
    readFile(record.routeSchema),
    readFile(record.sectionSchemaPrototype),
  ]);
  assert.equal(sha256(routeBytes), record.routeSchemaSha256);
  assert.equal(sha256(sectionBytes), record.sectionSchemaPrototypeSha256);
  const route = JSON.parse(routeBytes);
  const section = JSON.parse(sectionBytes);
  auditDecomposedStrictSchema(route);
  auditDecomposedStrictSchema(section);
  assert.equal(Object.hasOwn(route.properties, "sections"), false);
  assert.equal(Object.hasOwn(route.properties, "routes"), true);
  assert.equal(Object.hasOwn(section.properties, "routes"), false);
  assert.equal(Object.hasOwn(section.properties, "sections"), true);
  assert.equal(Object.hasOwn(section.properties, "inventoryRoutesSha256"), true);
}
for (const [file, digest] of Object.entries(analysis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drift`);
}
for (const key of Object.keys(analysis.authorization)) {
  assert.equal(analysis.authorization[key], false, `${key}: must be false`);
}
assert.equal(analysis.nextAuthorizedAction, "none-without-explicit-user-authorization");
console.log(JSON.stringify({
  status: "passed",
  retiredArtifactsReplayed: 22,
  failedGatePlansReplayedAsEvidenceOnly: 8,
  recomposedPlansIdentical: 30,
  routeMaximumCopiedInputBytes: analysis.sizing.routeMaximumCopiedInputBytes,
  sectionMaximumCopiedInputBytes: analysis.sizing.sectionMaximumCopiedInputBytes,
  strictThreeStageContractFeasible: true,
  sufficientEvidenceForFreshSuccessorGate: false,
  modelContextsExecuted: 0,
  meteredApiCostUsd: 0,
  nextAuthorized: analysis.nextAuthorizedAction,
}, null, 2));
