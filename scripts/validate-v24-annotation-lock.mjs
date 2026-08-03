#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const [lockArgument, gateArgument = "docs/calibration/v2.4/held-out-gate/gate-manifest.json"] = process.argv.slice(2);
if (!lockArgument) {
  console.error("Usage: node scripts/validate-v24-annotation-lock.mjs <lock.json> [gate-manifest.json]");
  process.exit(1);
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function exactKeys(value, expected, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort()), `${label} keys differ from contract`);
}
function tuple(annotation) {
  return JSON.stringify([annotation.targetCoverage, annotation.mechanismFlags.diagnostic, annotation.mechanismFlags.reframe, annotation.burdenRelation]);
}

const lockSource = await readFile(path.resolve(lockArgument), "utf8");
const lock = JSON.parse(lockSource);
const gate = JSON.parse(await readFile(path.resolve(gateArgument), "utf8"));
const debate = gate.sample.debates.find((item) => item.debateId === lock.debateId);
assert(debate, "lock debate is not in sample");
exactKeys(lock, ["schemaVersion", "workflowVersion", "rubricVersion", "gateId", "debateId", "debateNumber", "model", "calibrationOnly", "lockedAt", "isolation", "source", "annotations", "agreement", "audit"], "lock");
assert(lock.schemaVersion === "2.4-annotation-lock" && lock.workflowVersion === gate.workflowVersion && lock.rubricVersion === gate.rubricVersion && lock.gateId === gate.gateId, "lock version mismatch");
assert(lock.debateNumber === debate.number && lock.model === "5.6 Sol" && lock.calibrationOnly === true && !Number.isNaN(Date.parse(lock.lockedAt)), "lock identity mismatch");
exactKeys(lock.isolation, ["method", "legacyMaterialAvailable", "numericalScoresAvailable", "statement"], "isolation");
assert(lock.isolation.method === "fresh-v2.4-annotation-adjudication-task" && lock.isolation.legacyMaterialAvailable === false && lock.isolation.numericalScoresAvailable === false && lock.isolation.statement.trim().length >= 40, "lock isolation failed");
exactKeys(lock.source, ["passAPath", "passASha256", "passBPath", "passBSha256", "inventoryPath", "inventorySha256"], "source");
const [aSource, bSource, inventorySource] = await Promise.all([lock.source.passAPath, lock.source.passBPath, lock.source.inventoryPath].map((file) => readFile(path.resolve(file), "utf8")));
assert(lock.source.passASha256 === sha256(aSource) && lock.source.passBSha256 === sha256(bSource) && lock.source.inventorySha256 === sha256(inventorySource), "lock source hash mismatch");
const a = JSON.parse(aSource); const b = JSON.parse(bSource); const inventory = JSON.parse(inventorySource);
assert(a.debateId === lock.debateId && b.debateId === lock.debateId && inventory.debateId === lock.debateId && a.pass === "A" && b.pass === "B", "lock source identity mismatch");
const aById = new Map(a.annotations.map((item) => [item.moveId, item]));
const bById = new Map(b.annotations.map((item) => [item.moveId, item]));
const inventoryById = new Map(inventory.moves.map((move) => [move.moveId, move]));
assert(lock.annotations.length === 12, "lock must contain 12 annotations");
const agreement = { moveCount: 12, coverageAgreementCount: 0, diagnosticAgreementCount: 0, reframeAgreementCount: 0, burdenAgreementCount: 0, exactTupleAgreementCount: 0 };
let fieldDisagreementCount = 0;
const seen = new Set();
for (const [index, final] of lock.annotations.entries()) {
  const label = `annotations[${index}]`;
  exactKeys(final, ["moveId", "interactionMode", "targetPacketId", "targetCoverage", "diagnostic", "reframe", "burdenRelation", "fieldSources", "coverageRationale", "mechanismRationale", "burdenRationale"], label);
  assert(!seen.has(final.moveId), `${label} duplicated`); seen.add(final.moveId);
  const left = aById.get(final.moveId); const right = bById.get(final.moveId); const move = inventoryById.get(final.moveId);
  assert(left && right && move, `${label} missing source move`);
  assert(final.interactionMode === move.interactionMode && final.targetPacketId === (move.targetPacket?.id ?? null), `${label} changed inventory locks`);
  exactKeys(final.fieldSources, ["targetCoverage", "diagnostic", "reframe", "burdenRelation"], `${label}.fieldSources`);
  const fields = [
    ["targetCoverage", left.targetCoverage, right.targetCoverage, final.targetCoverage],
    ["diagnostic", left.mechanismFlags.diagnostic, right.mechanismFlags.diagnostic, final.diagnostic],
    ["reframe", left.mechanismFlags.reframe, right.mechanismFlags.reframe, final.reframe],
    ["burdenRelation", left.burdenRelation, right.burdenRelation, final.burdenRelation],
  ];
  for (const [field, leftValue, rightValue, finalValue] of fields) {
    const agreed = leftValue === rightValue;
    if (agreed) {
      agreement[`${field === "targetCoverage" ? "coverage" : field === "burdenRelation" ? "burden" : field}AgreementCount`] += 1;
      assert(final.fieldSources[field] === "agreement" && finalValue === leftValue, `${label}.${field} changed an agreement`);
    } else {
      fieldDisagreementCount += 1;
      assert(final.fieldSources[field] === "adjudication", `${label}.${field} disagreement not adjudicated`);
    }
  }
  if (tuple(left) === tuple(right)) agreement.exactTupleAgreementCount += 1;
  if (move.interactionMode === "constructive") assert(final.targetCoverage === "not-applicable", `${label} constructive coverage invalid`);
  else assert(["full", "partial", "relevant-nonanswer", "substitution"].includes(final.targetCoverage), `${label} responsive coverage invalid`);
  assert(typeof final.diagnostic === "boolean" && typeof final.reframe === "boolean", `${label} mechanism flags invalid`);
  assert(["completes", "advances-central", "advances-sub-burden", "topical-peripheral", "unadopted-or-irrelevant"].includes(final.burdenRelation), `${label} burden relation invalid`);
  assert(final.coverageRationale.trim().length >= 40 && final.mechanismRationale.trim().length >= 40 && final.burdenRationale.trim().length >= 40, `${label} rationale too short`);
}
assert(seen.size === inventoryById.size, "moves missing from lock");
exactKeys(lock.agreement, Object.keys(agreement), "agreement");
assert(JSON.stringify(lock.agreement) === JSON.stringify(agreement), "agreement counts mismatch");
exactKeys(lock.audit, ["fieldDisagreementCount", "adjudicatedFieldCount", "unresolvedDisagreements", "movesMissingFinalLock"], "audit");
assert(lock.audit.fieldDisagreementCount === fieldDisagreementCount && lock.audit.adjudicatedFieldCount === fieldDisagreementCount && lock.audit.unresolvedDisagreements === 0 && lock.audit.movesMissingFinalLock === 0, "lock audit mismatch");
console.log(JSON.stringify({ status: "passed", debateId: lock.debateId, ...agreement, fieldDisagreementCount, lockSha256: sha256(lockSource) }, null, 2));
