#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const [lockArgument, passAArgument, passBArgument, inventoryArgument, gateArgument] = process.argv.slice(2);
if (!lockArgument || !passAArgument || !passBArgument || !inventoryArgument || !gateArgument) {
  console.error("Usage: node scripts/validate-v23-response-lock.mjs <lock.json> <classifier-a.json> <classifier-b.json> <inventory.json> <gate.json>"); process.exit(1);
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function sha256(source) { return createHash("sha256").update(source).digest("hex"); }
function exactKeys(value, expected, label) { assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`); assert(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort()), `${label} keys differ from the response-lock contract`); }
function fixed(value) { return Number(value.toFixed(4)); }
function kappa(a, b, labels) {
  const n = a.length; const observed = a.filter((value, index) => value === b[index]).length / n;
  const expected = labels.reduce((sum, label) => sum + (a.filter((value) => value === label).length / n) * (b.filter((value) => value === label).length / n), 0);
  return fixed((observed - expected) / (1 - expected));
}
const [lockSource, aSource, bSource, inventorySource, gateSource] = await Promise.all([lockArgument, passAArgument, passBArgument, inventoryArgument, gateArgument].map((file) => readFile(path.resolve(file), "utf8")));
const lock = JSON.parse(lockSource); const a = JSON.parse(aSource); const b = JSON.parse(bSource); const inventory = JSON.parse(inventorySource); const gate = JSON.parse(gateSource);
exactKeys(lock, ["schemaVersion", "workflowVersion", "rubricVersion", "gateId", "debateId", "debateNumber", "model", "calibrationOnly", "lockedAt", "isolation", "classifications", "agreement", "audit"], "lock");
assert(lock.schemaVersion === "2.3-response-lock" && lock.workflowVersion === gate.workflowVersion && lock.rubricVersion === gate.rubricVersion && lock.gateId === gate.gateId, "response-lock version mismatch");
assert(lock.debateId === inventory.debateId && lock.debateId === a.debateId && lock.debateId === b.debateId, "debateId mismatch");
assert(lock.debateNumber === inventory.debateNumber && lock.model === "5.6 Sol" && lock.calibrationOnly === true, "response-lock identity mismatch");
assert(!Number.isNaN(Date.parse(lock.lockedAt)), "lockedAt is invalid");
exactKeys(lock.isolation, ["method", "legacyMaterialAvailable", "numericalScoresAvailable", "statement"], "isolation");
assert(lock.isolation.method === "fresh-classification-adjudication-task" && lock.isolation.legacyMaterialAvailable === false && lock.isolation.numericalScoresAvailable === false, "response-lock isolation failed");
const inventoryEntries = inventory.sections.flatMap((section) => section.moves.map((move) => ({sectionId: section.id, move})));
const inventoryById = new Map(inventoryEntries.map((entry) => [entry.move.id, entry]));
const aById = new Map(a.classifications.map((item) => [item.moveId, item])); const bById = new Map(b.classifications.map((item) => [item.moveId, item]));
assert(lock.classifications.length === inventoryEntries.length, "lock must contain every move once");
const seen = new Set(); let classAgreements = 0; let targetDisagreements = 0; let adjudicatedCount = 0;
for (const [index, item] of lock.classifications.entries()) {
  const label = `classifications[${index}]`; exactKeys(item, ["moveId", "sectionId", "side", "targetMoveIds", "responseClass", "decisiveTargetSummary", "classificationSource", "rationale"], label);
  assert(!seen.has(item.moveId), `${label} duplicated`); seen.add(item.moveId);
  const inv = inventoryById.get(item.moveId); const ca = aById.get(item.moveId); const cb = bById.get(item.moveId); assert(inv && ca && cb, `${label} source move missing`);
  assert(item.sectionId === inv.sectionId && item.side === inv.move.side, `${label} identity mismatch`);
  const sameClass = ca.responseClass === cb.responseClass; const sameTargets = JSON.stringify([...ca.targetMoveIds].sort()) === JSON.stringify([...cb.targetMoveIds].sort());
  if (sameClass) classAgreements += 1; if (!sameTargets) targetDisagreements += 1;
  const needsAdjudication = !sameClass || !sameTargets;
  assert(item.classificationSource === (needsAdjudication ? "adjudication" : "agreement"), `${label}.classificationSource mismatch`);
  if (needsAdjudication) adjudicatedCount += 1;
  else { assert(item.responseClass === ca.responseClass, `${label} changed an agreed class`); assert(JSON.stringify([...item.targetMoveIds].sort()) === JSON.stringify([...ca.targetMoveIds].sort()), `${label} changed agreed targets`); }
  for (const targetId of item.targetMoveIds) assert(inventoryById.has(targetId), `${label} unknown target ${targetId}`);
  assert(typeof item.decisiveTargetSummary === "string" && item.decisiveTargetSummary.trim().length >= 10 && typeof item.rationale === "string" && item.rationale.trim().length >= 40, `${label} rationale fields too short`);
}
const labels = ["constructive-opening", "full-answer", "partial-answer", "diagnostic-defeat", "relevant-counterargument", "justified-reframe", "weaker-substitution"];
const aClasses = inventoryEntries.map(({move}) => aById.get(move.id).responseClass); const bClasses = inventoryEntries.map(({move}) => bById.get(move.id).responseClass);
const exactClassDisagreementCount = inventoryEntries.length - classAgreements;
const expectedAgreement = {moveCount: inventoryEntries.length, exactClassAgreementCount: classAgreements, exactClassDisagreementCount, exactClassAgreement: fixed(classAgreements / inventoryEntries.length), exactClassDisagreementRate: fixed(exactClassDisagreementCount / inventoryEntries.length), targetSetDisagreementCount: targetDisagreements, cohensKappa: kappa(aClasses, bClasses, labels)};
exactKeys(lock.agreement, Object.keys(expectedAgreement), "agreement");
assert(JSON.stringify(lock.agreement) === JSON.stringify(expectedAgreement), "agreement statistics mismatch");
exactKeys(lock.audit, ["classifierASha256", "classifierBSha256", "inventorySha256", "disagreementCountRequiringAdjudication", "adjudicatedCount", "unresolvedDisagreements", "movesMissingLock"], "audit");
assert(lock.audit.classifierASha256 === sha256(aSource) && lock.audit.classifierBSha256 === sha256(bSource) && lock.audit.inventorySha256 === sha256(inventorySource), "response-lock source hash mismatch");
assert(lock.audit.disagreementCountRequiringAdjudication === adjudicatedCount && lock.audit.adjudicatedCount === adjudicatedCount && lock.audit.unresolvedDisagreements === 0 && lock.audit.movesMissingLock === 0, "response-lock audit mismatch");
console.log(JSON.stringify({status: "passed", debateId: lock.debateId, ...expectedAgreement, adjudicatedCount, lockSha256: sha256(lockSource)}, null, 2));
