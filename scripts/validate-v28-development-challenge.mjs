#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  CONTACT_OPERATIONS, DEFECT_TYPES, IMPACT_MODES, OBJECT_CHANGE_TYPES, TARGET_BURDEN_RELATIONS, TARGET_SCOPE_RELATIONS,
  canonicalBridges, canonicalDiagnosticObject, canonicalOperations, deriveBurdenRelation, deriveCoverage, deriveDiagnostic,
  deriveReframe, deriveSubstitutionCause, deriveTargetDisposition, diagnosticObjectEligible, equal,
} from "./lib/v28-semantics.mjs";

const passArgument = process.argv.find((argument) => argument.endsWith(".json") && !argument.endsWith("challenge-input.json") && !argument.endsWith("challenge-key.json")) ?? null;
if (passArgument) throw new Error("Use scripts/validate-v28-development-pass.mjs for a blind annotation pass; the input-key validator intentionally reads the hidden key.");
const root = process.cwd();
const inputPath = "docs/calibration/v2.8/development/challenge-input.json";
const keyPath = "docs/calibration/v2.8/development/challenge-key.json";
const schemaPath = "docs/calibration/v2.8/development/challenge-annotation-schema.json";
const workflowPath = "docs/assessment-workflow-v2.8.md";
const rubricPath = "docs/reassessment-rubric-v2.8.md";
const manualPath = "docs/calibration/v2.8/development/annotation-manual.md";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const exactKeys = (value, keys, label) => {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert(equal(Object.keys(value).sort(), [...keys].sort()), `${label} keys differ`);
};
const load = async (file) => {
  const text = await readFile(path.resolve(root, file), "utf8");
  return { text, value: JSON.parse(text) };
};

const [inputSource, keySource, schemaSource, workflowSource, rubricSource, manualSource] = await Promise.all([
  load(inputPath), load(keyPath), load(schemaPath), readFile(path.resolve(root, workflowPath), "utf8"),
  readFile(path.resolve(root, rubricPath), "utf8"), readFile(path.resolve(root, manualPath), "utf8"),
]);
const input = inputSource.value;
const key = keySource.value;
assert(input.schemaVersion === "2.8-development-challenge-input" && key.schemaVersion === "2.8-development-challenge-key", "challenge identity mismatch");
assert(input.workflowVersion === "Slugfester Reassessment Workflow v2.8" && input.rubricVersion === "Slugfester Reassessment Rubric v2.8", "challenge version mismatch");
assert(input.calibrationOnly === true && input.legacyMaterialIncluded === false && input.numericalScoresIncluded === false, "challenge contamination state invalid");
assert(input.caseCount === input.cases.length && key.caseCount === key.cases.length && input.caseCount === key.caseCount, "challenge case count mismatch");
assert(key.inputPath === inputPath && key.inputSha256 === sha256(inputSource.text), "challenge input hash mismatch");
const inputById = new Map(input.cases.map((item) => [item.caseId, item]));
const keyById = new Map(key.cases.map((item) => [item.caseId, item]));
assert(inputById.size === input.caseCount && keyById.size === key.caseCount, "duplicate challenge case");

for (const challengeCase of input.cases) {
  assert(challengeCase.sourceExcerptSha256 === sha256(challengeCase.sourceExcerpt), `${challengeCase.caseId}: source digest mismatch`);
  assert(challengeCase.targetPacket && challengeCase.targetPacket.id && challengeCase.targetPacket.indispensableComponents.length > 0, `${challengeCase.caseId}: target missing`);
  const keyCase = keyById.get(challengeCase.caseId);
  assert(keyCase, `${challengeCase.caseId}: key missing`);
  const [inventoryText, passAText, passBText, lockText] = await Promise.all([
    readFile(path.resolve(root, keyCase.provenance.inventoryPath), "utf8"),
    readFile(path.resolve(root, keyCase.provenance.passAPath), "utf8"),
    readFile(path.resolve(root, keyCase.provenance.passBPath), "utf8"),
    readFile(path.resolve(root, keyCase.provenance.lockPath), "utf8"),
  ]);
  assert(keyCase.provenance.inventorySha256 === sha256(inventoryText) && keyCase.provenance.passASha256 === sha256(passAText) && keyCase.provenance.passBSha256 === sha256(passBText) && keyCase.provenance.lockSha256 === sha256(lockText), `${challengeCase.caseId}: provenance hash mismatch`);
  const lock = JSON.parse(lockText);
  const final = lock.annotations.find((item) => item.moveId === challengeCase.moveId);
  assert(final, `${challengeCase.caseId}: lock move missing`);
  const expected = keyCase.expected;
  assert(expected.targetObjectRelation === final.coveragePrimitives.targetObjectRelation && expected.objectChangeType === final.coveragePrimitives.objectChangeType && expected.targetScopeRelation === final.coveragePrimitives.targetScopeRelation && expected.targetBurdenRelation === final.coveragePrimitives.targetBurdenRelation, `${challengeCase.caseId}: target key mismatch`);
  assert(equal(expected.componentOperations, canonicalOperations(final.coveragePrimitives.componentOperations)) && expected.derivedTargetCoverage === final.coveragePrimitives.derivedTargetCoverage, `${challengeCase.caseId}: coverage key mismatch`);
  let normalizedObject = canonicalDiagnosticObject(final.diagnosticPrimitives.defectObject);
  if (final.diagnosticPrimitives.defectType !== "none" && !diagnosticObjectEligible(final.diagnosticPrimitives.defectType, final.diagnosticPrimitives.defectObject, challengeCase.targetPacket)) normalizedObject = `target-packet:${challengeCase.targetPacket.id}`;
  assert(expected.defectType === final.diagnosticPrimitives.defectType && expected.defectObject === normalizedObject && expected.impactMode === final.diagnosticPrimitives.impactMode && expected.derivedDiagnostic === final.diagnosticPrimitives.derivedDiagnostic, `${challengeCase.caseId}: diagnostic key mismatch`);
}

for (const field of ["diagnosticPositiveCaseIds", "diagnosticNegativeCaseIds", "reframePositiveCaseIds", "reframeNegativeCaseIds"]) {
  assert(Array.isArray(key.rareFeatureAudit[field]) && new Set(key.rareFeatureAudit[field]).size === key.rareFeatureAudit[field].length, `${field} invalid`);
}
assert(key.rareFeatureAudit.diagnosticPositiveCaseIds.length >= 3 && key.rareFeatureAudit.diagnosticNegativeCaseIds.length >= 3 && key.rareFeatureAudit.reframePositiveCaseIds.length >= 3 && key.rareFeatureAudit.reframeNegativeCaseIds.length >= 3, "rare-feature challenge exposure insufficient");

console.log(JSON.stringify({ status: "passed", kind: "input-key", caseCount: input.caseCount, inputSha256: sha256(inputSource.text), keySha256: sha256(keySource.text) }, null, 2));
