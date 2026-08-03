#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  CONTACT_OPERATIONS, DEFECT_TYPES, IMPACT_MODES, OBJECT_CHANGE_TYPES, TARGET_BURDEN_RELATIONS, TARGET_SCOPE_RELATIONS,
  canonicalBridges, deriveBurdenRelation, deriveCoverage, deriveDiagnostic, deriveReframe, deriveSubstitutionCause,
  deriveTargetDisposition, diagnosticObjectEligible, equal,
} from "./lib/v28-semantics.mjs";

const passArgument = process.argv[2];
if (!passArgument) throw new Error("Usage: node scripts/validate-v28-development-pass.mjs <pass.json>");
const root = process.cwd();
const inputPath = "docs/calibration/v2.8/development/challenge-input.json";
const schemaPath = "docs/calibration/v2.8/development/challenge-annotation-schema.json";
const workflowPath = "docs/assessment-workflow-v2.8.md";
const rubricPath = "docs/reassessment-rubric-v2.8.md";
const manualPath = "docs/calibration/v2.8/development/annotation-manual.md";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const exactKeys = (value, keys, label) => {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be object`);
  assert(equal(Object.keys(value).sort(), [...keys].sort()), `${label} keys differ`);
};
const [passText, inputText, schemaText, workflowText, rubricText, manualText] = await Promise.all([
  readFile(path.resolve(root, passArgument), "utf8"), readFile(path.resolve(root, inputPath), "utf8"),
  readFile(path.resolve(root, schemaPath), "utf8"), readFile(path.resolve(root, workflowPath), "utf8"),
  readFile(path.resolve(root, rubricPath), "utf8"), readFile(path.resolve(root, manualPath), "utf8"),
]);
JSON.parse(schemaText);
const pass = JSON.parse(passText);
const input = JSON.parse(inputText);
const byId = new Map(input.cases.map((item) => [item.caseId, item]));
exactKeys(pass, ["schemaVersion", "workflowVersion", "rubricVersion", "pass", "model", "calibrationOnly", "completedAt", "isolation", "source", "annotations", "audit"], "pass");
assert(pass.schemaVersion === "2.8-development-challenge-pass" && pass.workflowVersion === input.workflowVersion && pass.rubricVersion === input.rubricVersion && ["A", "B"].includes(pass.pass) && pass.model === "5.6 Sol" && pass.calibrationOnly === true, "pass identity invalid");
const allowedInputs = [workflowPath, rubricPath, manualPath, schemaPath, inputPath];
exactKeys(pass.isolation, ["method", "allowedInputs", "keyUnavailable", "otherPassUnavailable", "legacyMaterialUnavailable", "numericalScoresUnavailable", "statement"], "isolation");
assert(pass.isolation.method === "fresh-isolated-v2.8-development-challenge" && pass.isolation.keyUnavailable === true && pass.isolation.otherPassUnavailable === true && pass.isolation.legacyMaterialUnavailable === true && pass.isolation.numericalScoresUnavailable === true && equal([...pass.isolation.allowedInputs].sort(), [...allowedInputs].sort()) && pass.isolation.statement.trim().length >= 40, "pass isolation invalid");
exactKeys(pass.source, ["inputPath", "inputSha256", "workflowSha256", "rubricSha256", "manualSha256", "schemaSha256"], "source");
assert(pass.source.inputPath === inputPath && pass.source.inputSha256 === sha256(inputText) && pass.source.workflowSha256 === sha256(workflowText) && pass.source.rubricSha256 === sha256(rubricText) && pass.source.manualSha256 === sha256(manualText) && pass.source.schemaSha256 === sha256(schemaText), "pass source hash mismatch");
assert(pass.annotations.length === input.caseCount, "pass annotation count mismatch");
const seen = new Set();
for (const [index, annotation] of pass.annotations.entries()) {
  const label = `annotations[${index}]`;
  exactKeys(annotation, ["caseId", "moveId", "targetObjectRelation", "objectChangeType", "targetScopeRelation", "targetBurdenRelation", "componentOperations", "relevantContraryMaterial", "derivedTargetDisposition", "derivedSubstitutionCause", "derivedTargetCoverage", "defectType", "defectObject", "impactMode", "derivedDiagnostic", "malformedDemandExplained", "replacementDemandStated", "derivedReframe", "contactedBridges", "derivedBurdenRelation", "rationale"], label);
  assert(!seen.has(annotation.caseId), `${label}: duplicate case`); seen.add(annotation.caseId);
  const challengeCase = byId.get(annotation.caseId);
  assert(challengeCase && annotation.moveId === challengeCase.moveId, `${label}: unknown case or move`);
  assert(["same", "changed"].includes(annotation.targetObjectRelation) && TARGET_SCOPE_RELATIONS.includes(annotation.targetScopeRelation) && TARGET_BURDEN_RELATIONS.includes(annotation.targetBurdenRelation), `${label}: target primitive invalid`);
  if (annotation.targetObjectRelation === "changed") assert(OBJECT_CHANGE_TYPES.includes(annotation.objectChangeType), `${label}: change type required`); else assert(annotation.objectChangeType === null, `${label}: same object change type must be null`);
  const expectedIds = challengeCase.targetPacket.indispensableComponents.map((item) => item.id).sort();
  const actualIds = annotation.componentOperations.map((item) => item.componentId).sort();
  const disposition = deriveTargetDisposition(annotation);
  if (disposition === "substituted") assert(annotation.componentOperations.length === 0 && annotation.relevantContraryMaterial === false, `${label}: substituted component applicability invalid`);
  else {
    assert(equal(expectedIds, actualIds) && new Set(actualIds).size === actualIds.length, `${label}: component set mismatch`);
    for (const item of annotation.componentOperations) assert(item.operation === null || CONTACT_OPERATIONS.includes(item.operation), `${label}: operation invalid`);
    if (annotation.componentOperations.some((item) => item.operation !== null)) assert(annotation.relevantContraryMaterial === false, `${label}: contact/contrary conflict`);
    if (annotation.targetScopeRelation !== "same") assert(annotation.componentOperations.some((item) => ["qualifies", "distinguishes"].includes(item.operation)), `${label}: scope change lacks qualifying operation`);
  }
  assert(annotation.derivedTargetDisposition === disposition && annotation.derivedSubstitutionCause === deriveSubstitutionCause(annotation) && annotation.derivedTargetCoverage === deriveCoverage(annotation), `${label}: target derivation invalid`);
  assert(DEFECT_TYPES.includes(annotation.defectType) && IMPACT_MODES.includes(annotation.impactMode) && diagnosticObjectEligible(annotation.defectType, annotation.defectObject, challengeCase.targetPacket), `${label}: diagnostic eligibility invalid`);
  if (disposition === "substituted" || annotation.defectType === "none") assert(annotation.defectType === "none" && annotation.defectObject === null && annotation.impactMode === "none", `${label}: diagnostic applicability invalid`);
  assert(annotation.derivedDiagnostic === deriveDiagnostic(annotation) && annotation.derivedReframe === deriveReframe(annotation), `${label}: diagnostic/reframe derivation invalid`);
  const bridgeKeys = canonicalBridges(annotation.contactedBridges);
  assert(new Set(bridgeKeys).size === bridgeKeys.length && annotation.derivedBurdenRelation === deriveBurdenRelation(challengeCase, annotation.contactedBridges), `${label}: burden derivation invalid`);
  assert(annotation.rationale.trim().length >= 60, `${label}: rationale too short`);
}
assert(seen.size === input.caseCount, "pass missing cases");
exactKeys(pass.audit, ["caseCount", "allCasesAnnotatedOnce", "componentSetErrors", "derivationErrors", "diagnosticEligibilityErrors", "scoreFieldsPresent"], "audit");
assert(pass.audit.caseCount === input.caseCount && pass.audit.allCasesAnnotatedOnce === true && pass.audit.componentSetErrors === 0 && pass.audit.derivationErrors === 0 && pass.audit.diagnosticEligibilityErrors === 0 && pass.audit.scoreFieldsPresent === false, "pass audit invalid");
console.log(JSON.stringify({ status: "passed", kind: "annotation-pass", pass: pass.pass, caseCount: input.caseCount, passSha256: sha256(passText) }, null, 2));
