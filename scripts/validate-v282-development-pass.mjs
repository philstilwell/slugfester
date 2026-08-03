#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  CONTACT_OPERATIONS, DEFECT_TYPES, IMPACT_MODES, OBJECT_CHANGE_TYPES, TARGET_BURDEN_RELATIONS, TARGET_SCOPE_RELATIONS,
  canonicalBridges, deriveDiagnostic, deriveReframe, deriveTargetDisposition, diagnosticObjectEligible, equal, validateSpan,
} from "./lib/v282-semantics.mjs";

const passArgument = process.argv[2];
if (!passArgument) throw new Error("Usage: node scripts/validate-v282-development-pass.mjs <pass-or-key.json>");
const root = process.cwd();
const inputPath = "docs/calibration/v2.8/development/attempt-3/challenge-input.json";
const schemaPath = "docs/calibration/v2.8/development/attempt-3/challenge-annotation-schema.json";
const workflowPath = "docs/assessment-workflow-v2.8.2.md";
const rubricPath = "docs/reassessment-rubric-v2.8.2.md";
const manualPath = "docs/calibration/v2.8/development/attempt-3/annotation-manual.md";
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
assert(pass.schemaVersion === "2.8.2-development-challenge-pass" && pass.workflowVersion === input.workflowVersion && pass.rubricVersion === input.rubricVersion && ["A", "B", "KEY"].includes(pass.pass) && pass.model === "5.6 Sol" && pass.calibrationOnly === true, "pass identity invalid");
const allowedInputs = [workflowPath, rubricPath, manualPath, schemaPath, inputPath];
exactKeys(pass.isolation, ["method", "allowedInputs", "keyUnavailable", "otherPassUnavailable", "attemptOnePassesUnavailable", "legacyMaterialUnavailable", "numericalScoresUnavailable", "statement"], "isolation");
const expectedMethod = pass.pass === "KEY" ? "v2.8.1-independent-key-carried-forward-without-semantic-change" : "fresh-isolated-v2.8.2-development-challenge";
assert(pass.isolation.method === expectedMethod && pass.isolation.keyUnavailable === true && pass.isolation.otherPassUnavailable === true && pass.isolation.attemptOnePassesUnavailable === true && pass.isolation.legacyMaterialUnavailable === true && pass.isolation.numericalScoresUnavailable === true && equal([...pass.isolation.allowedInputs].sort(), [...allowedInputs].sort()) && pass.isolation.statement.trim().length >= 50, "pass isolation invalid");
exactKeys(pass.source, ["inputPath", "inputSha256", "workflowSha256", "rubricSha256", "manualSha256", "schemaSha256"], "source");
assert(pass.source.inputPath === inputPath && pass.source.inputSha256 === sha256(inputText) && pass.source.workflowSha256 === sha256(workflowText) && pass.source.rubricSha256 === sha256(rubricText) && pass.source.manualSha256 === sha256(manualText) && pass.source.schemaSha256 === sha256(schemaText), "pass source hash mismatch");
assert(pass.annotations.length === input.caseCount, "pass annotation count mismatch");
const annotationKeys = ["caseId", "moveId", "mappingBasis", "mappingEvidence", "targetObjectRelation", "objectChangeType", "targetScopeRelation", "scopeEvidence", "targetBurdenRelation", "burdenEvidence", "componentOperations", "relevantContraryMaterial", "contraryEvidence", "defectType", "defectObject", "diagnosticCue", "impactMode", "impactCue", "malformedDemandExplained", "malformedDemandCue", "replacementDemandStated", "replacementDemandCue", "contactedBridges", "rationale"];
const seen = new Set();
for (const [index, annotation] of pass.annotations.entries()) {
  const label = `annotations[${index}]`;
  exactKeys(annotation, annotationKeys, label);
  assert(!seen.has(annotation.caseId), `${label}: duplicate case`); seen.add(annotation.caseId);
  const challengeCase = byId.get(annotation.caseId);
  assert(challengeCase && annotation.moveId === challengeCase.moveId, `${label}: unknown case or move`);
  const excerpt = challengeCase.sourceExcerpt;
  assert(["same", "changed"].includes(annotation.targetObjectRelation) && TARGET_SCOPE_RELATIONS.includes(annotation.targetScopeRelation) && TARGET_BURDEN_RELATIONS.includes(annotation.targetBurdenRelation), `${label}: target primitive invalid`);
  if (annotation.mappingBasis === "direct") assert(annotation.targetObjectRelation === "same" && annotation.objectChangeType === null && annotation.mappingEvidence === null, `${label}: direct mapping invalid`);
  else if (annotation.mappingBasis === "connected-example") assert(annotation.targetObjectRelation === "same" && annotation.objectChangeType === null && validateSpan(excerpt, annotation.mappingEvidence), `${label}: connected-example mapping invalid`);
  else if (annotation.mappingBasis === "object-change") assert(annotation.targetObjectRelation === "changed" && OBJECT_CHANGE_TYPES.includes(annotation.objectChangeType) && validateSpan(excerpt, annotation.mappingEvidence), `${label}: object-change mapping invalid`);
  else throw new Error(`${label}: mapping basis invalid`);
  assert(annotation.targetScopeRelation === "same" ? annotation.scopeEvidence === null : validateSpan(excerpt, annotation.scopeEvidence), `${label}: scope evidence invalid`);
  assert(annotation.targetBurdenRelation === "retained" ? annotation.burdenEvidence === null : validateSpan(excerpt, annotation.burdenEvidence), `${label}: burden evidence invalid`);
  const expectedIds = challengeCase.targetPacket.indispensableComponents.map((item) => item.id);
  const actualIds = annotation.componentOperations.map((item) => item.componentId);
  assert(equal(expectedIds, actualIds) && new Set(actualIds).size === actualIds.length, `${label}: component set or order mismatch`);
  for (const item of annotation.componentOperations) {
    exactKeys(item, ["componentId", "operation", "evidence"], `${label}.component`);
    assert(item.operation === null ? item.evidence === null : CONTACT_OPERATIONS.includes(item.operation) && validateSpan(excerpt, item.evidence), `${label}: component operation/evidence invalid`);
  }
  const disposition = deriveTargetDisposition(annotation);
  if (disposition === "substituted") assert(annotation.componentOperations.every((item) => item.operation === null) && annotation.relevantContraryMaterial === false, `${label}: substituted component applicability invalid`);
  else if (annotation.targetScopeRelation !== "same") assert(annotation.componentOperations.some((item) => ["qualifies", "distinguishes"].includes(item.operation)), `${label}: scope change lacks qualifying operation`);
  if (annotation.componentOperations.some((item) => item.operation !== null)) assert(annotation.relevantContraryMaterial === false, `${label}: contact/contrary conflict`);
  assert(annotation.relevantContraryMaterial ? annotation.componentOperations.every((item) => item.operation === null) && validateSpan(excerpt, annotation.contraryEvidence) : annotation.contraryEvidence === null, `${label}: contrary evidence invalid`);
  assert(DEFECT_TYPES.includes(annotation.defectType) && IMPACT_MODES.includes(annotation.impactMode), `${label}: diagnostic primitive invalid`);
  if (disposition === "substituted" || annotation.defectType === "none") assert(annotation.defectType === "none" && annotation.defectObject === null && annotation.diagnosticCue === null && annotation.impactMode === "none" && annotation.impactCue === null, `${label}: diagnostic applicability invalid`);
  else assert(diagnosticObjectEligible(annotation.defectType, annotation.defectObject, challengeCase.targetPacket) && validateSpan(excerpt, annotation.diagnosticCue), `${label}: diagnostic object/cue invalid`);
  assert(annotation.impactMode === "none" ? annotation.impactCue === null : validateSpan(excerpt, annotation.impactCue), `${label}: impact cue invalid`);
  assert(annotation.malformedDemandExplained ? validateSpan(excerpt, annotation.malformedDemandCue) : annotation.malformedDemandCue === null, `${label}: malformed-demand cue invalid`);
  assert(annotation.replacementDemandStated ? validateSpan(excerpt, annotation.replacementDemandCue) : annotation.replacementDemandCue === null, `${label}: replacement-demand cue invalid`);
  const bridgeKeys = canonicalBridges(annotation.contactedBridges);
  assert(new Set(bridgeKeys).size === bridgeKeys.length, `${label}: duplicate bridge contact`);
  for (const contact of annotation.contactedBridges) {
    exactKeys(contact, ["bridgeId", "contactMode", "evidence"], `${label}.bridge`);
    assert(challengeCase.burdenContext.burdenPacket.eligibleBridgeIds.includes(contact.bridgeId) && ["supports", "attacks"].includes(contact.contactMode) && validateSpan(excerpt, contact.evidence), `${label}: bridge contact invalid`);
  }
  assert(annotation.rationale.trim().length >= 70, `${label}: rationale too short`);
}
assert(seen.size === input.caseCount, "pass missing cases");
const nonDefaultCounts = {
  objectChanges: pass.annotations.filter((item) => item.targetObjectRelation === "changed").length,
  connectedExamples: pass.annotations.filter((item) => item.mappingBasis === "connected-example").length,
  componentContacts: pass.annotations.flatMap((item) => item.componentOperations).filter((item) => item.operation !== null).length,
  diagnosticCandidates: pass.annotations.filter((item) => item.defectType !== "none").length,
  diagnosticPositives: pass.annotations.filter(deriveDiagnostic).length,
  reframePositives: pass.annotations.filter(deriveReframe).length,
  bridgeContacts: pass.annotations.flatMap((item) => item.contactedBridges).length,
  uniqueRationales: new Set(pass.annotations.map((item) => item.rationale.trim())).size,
};
const completionFloors = { objectChanges:3, connectedExamples:3, componentContacts:20, diagnosticCandidates:6, diagnosticPositives:3, reframePositives:3, bridgeContacts:10, uniqueRationales:20 };
for (const [name, floor] of Object.entries(completionFloors)) assert(nonDefaultCounts[name] >= floor, `pass semantic completion failed: ${name} ${nonDefaultCounts[name]} < ${floor}`);
exactKeys(pass.audit, ["caseCount", "allCasesAnnotatedOnce", "componentSetErrors", "evidenceErrors", "diagnosticEligibilityErrors", "derivedFieldsPresent", "scoreFieldsPresent", "nonDefaultCounts"], "audit");
assert(pass.audit.caseCount === input.caseCount && pass.audit.allCasesAnnotatedOnce === true && pass.audit.componentSetErrors === 0 && pass.audit.evidenceErrors === 0 && pass.audit.diagnosticEligibilityErrors === 0 && pass.audit.derivedFieldsPresent === false && pass.audit.scoreFieldsPresent === false && equal(pass.audit.nonDefaultCounts, nonDefaultCounts), "pass audit invalid");
console.log(JSON.stringify({ status: "passed", kind: pass.pass === "KEY" ? "independent-key" : "annotation-pass", pass: pass.pass, caseCount: input.caseCount, passSha256: sha256(passText) }, null, 2));

