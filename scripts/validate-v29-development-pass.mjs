#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  BURDEN_ADJUSTMENTS, BURDEN_TIERS, DEFECT_TYPES, OBJECT_CHANGE_TYPES, SCOPE_RELATIONS,
  deriveDiagnostic, deriveReframe, equal, validateSpan,
} from "./lib/v29-semantics.mjs";

const passArgument = process.argv[2];
if (!passArgument) throw new Error("Usage: node scripts/validate-v29-development-pass.mjs <pass-or-key.json>");
const root = process.cwd();
const directory = "docs/calibration/v2.9/development/attempt-1";
const inputPath = `${directory}/challenge-input.json`;
const schemaPath = `${directory}/challenge-annotation-schema.json`;
const practicePath = `${directory}/practice-fixture.json`;
const workflowPath = "docs/assessment-workflow-v2.9.md";
const rubricPath = "docs/reassessment-rubric-v2.9.md";
const manualPath = `${directory}/annotation-manual.md`;
const candidateAPath = `${directory}/key-candidate-a.json`;
const candidateBPath = `${directory}/key-candidate-b.json`;
const baseInputs = [workflowPath, rubricPath, manualPath, schemaPath, inputPath, practicePath];
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
const labels = ["A", "B", "KEY-A", "KEY-B", "KEY"];
exactKeys(pass, ["schemaVersion", "workflowVersion", "rubricVersion", "pass", "model", "calibrationOnly", "completedAt", "isolation", "source", "annotations", "audit"], "pass");
assert(pass.schemaVersion === "2.9-development-challenge-pass" && pass.workflowVersion === input.workflowVersion && pass.rubricVersion === input.rubricVersion && labels.includes(pass.pass) && pass.model === "5.6 Sol" && pass.calibrationOnly === true, "pass identity invalid");
const expectedMethod = pass.pass === "KEY" ? "fresh-isolated-v2.9-key-adjudication" : pass.pass.startsWith("KEY-") ? "fresh-isolated-v2.9-key-candidate" : "fresh-isolated-v2.9-development-challenge";
const expectedInputs = pass.pass === "KEY" ? [...baseInputs, candidateAPath, candidateBPath] : baseInputs;
exactKeys(pass.isolation, ["method", "allowedInputs", "priorKeysUnavailable", "blindPassesUnavailable", "legacyMaterialUnavailable", "numericalScoresUnavailable", "statement"], "isolation");
assert(pass.isolation.method === expectedMethod && pass.isolation.priorKeysUnavailable === true && pass.isolation.blindPassesUnavailable === true && pass.isolation.legacyMaterialUnavailable === true && pass.isolation.numericalScoresUnavailable === true && equal([...pass.isolation.allowedInputs].sort(), [...expectedInputs].sort()) && pass.isolation.statement.trim().length >= 50, "pass isolation invalid");
exactKeys(pass.source, ["inputPath", "inputSha256", "workflowSha256", "rubricSha256", "manualSha256", "schemaSha256"], "source");
assert(pass.source.inputPath === inputPath && pass.source.inputSha256 === sha256(inputText) && pass.source.workflowSha256 === sha256(workflowText) && pass.source.rubricSha256 === sha256(rubricText) && pass.source.manualSha256 === sha256(manualText) && pass.source.schemaSha256 === sha256(schemaText), "pass source hash mismatch");
assert(pass.annotations.length === input.caseCount, "pass annotation count mismatch");

const annotationKeys = ["caseId", "moveId", "originalTargetContact", "targetEvidence", "connectedExample", "connectionEvidence", "exclusiveObjectSubstitution", "objectChangeType", "substitutionEvidence", "scopeRelation", "scopeEvidence", "burdenAdjustment", "burdenEvidence", "componentContacts", "relevantContraryMaterial", "contraryEvidence", "defectType", "defectCue", "consequenceStated", "consequenceCue", "malformedDemandExplained", "malformedDemandCue", "replacementDemandStated", "replacementDemandCue", "burdenContact", "rationale"];
const seen = new Set();
for (const [index, annotation] of pass.annotations.entries()) {
  const label = `annotations[${index}]`;
  exactKeys(annotation, annotationKeys, label);
  assert(!seen.has(annotation.caseId), `${label}: duplicate case`); seen.add(annotation.caseId);
  const challengeCase = byId.get(annotation.caseId);
  assert(challengeCase && challengeCase.moveId === annotation.moveId, `${label}: unknown case or move`);
  const excerpt = challengeCase.sourceExcerpt;
  assert(typeof annotation.originalTargetContact === "boolean" && typeof annotation.connectedExample === "boolean" && typeof annotation.exclusiveObjectSubstitution === "boolean", `${label}: target booleans invalid`);
  assert(annotation.originalTargetContact ? validateSpan(excerpt, annotation.targetEvidence) : annotation.targetEvidence === null, `${label}: target evidence invalid`);
  assert(annotation.connectedExample ? validateSpan(excerpt, annotation.connectionEvidence) : annotation.connectionEvidence === null, `${label}: connection evidence invalid`);
  if (annotation.exclusiveObjectSubstitution) assert(annotation.originalTargetContact === false && OBJECT_CHANGE_TYPES.includes(annotation.objectChangeType) && validateSpan(excerpt, annotation.substitutionEvidence), `${label}: exclusive substitution invalid`);
  else assert(annotation.objectChangeType === null && annotation.substitutionEvidence === null, `${label}: substitution defaults invalid`);
  assert(SCOPE_RELATIONS.includes(annotation.scopeRelation) && BURDEN_ADJUSTMENTS.includes(annotation.burdenAdjustment), `${label}: scope or burden adjustment invalid`);
  assert(annotation.scopeRelation === "same" ? annotation.scopeEvidence === null : annotation.originalTargetContact && validateSpan(excerpt, annotation.scopeEvidence), `${label}: scope evidence invalid`);
  assert(annotation.burdenAdjustment === "retained" ? annotation.burdenEvidence === null : validateSpan(excerpt, annotation.burdenEvidence), `${label}: burden evidence invalid`);
  const expectedIds = challengeCase.targetPacket.indispensableComponents.map((item) => item.id);
  const actualIds = annotation.componentContacts.map((item) => item.componentId);
  assert(equal(expectedIds, actualIds) && new Set(actualIds).size === actualIds.length, `${label}: component set or order mismatch`);
  for (const contact of annotation.componentContacts) {
    exactKeys(contact, ["componentId", "contacted", "evidence"], `${label}.component`);
    assert(typeof contact.contacted === "boolean" && (contact.contacted ? annotation.originalTargetContact && validateSpan(excerpt, contact.evidence) : contact.evidence === null), `${label}: component contact invalid`);
  }
  if (annotation.exclusiveObjectSubstitution || !annotation.originalTargetContact) assert(annotation.componentContacts.every((item) => !item.contacted), `${label}: component contact without original-target contact`);
  if (annotation.componentContacts.some((item) => item.contacted)) assert(annotation.relevantContraryMaterial === false, `${label}: component/contrary conflict`);
  assert(annotation.relevantContraryMaterial ? annotation.originalTargetContact && annotation.componentContacts.every((item) => !item.contacted) && validateSpan(excerpt, annotation.contraryEvidence) : annotation.contraryEvidence === null, `${label}: contrary evidence invalid`);
  assert(DEFECT_TYPES.includes(annotation.defectType), `${label}: defect invalid`);
  assert(annotation.defectType === "none" ? annotation.defectCue === null : annotation.originalTargetContact && validateSpan(excerpt, annotation.defectCue), `${label}: defect cue invalid`);
  assert(annotation.consequenceStated ? annotation.defectType !== "none" && validateSpan(excerpt, annotation.consequenceCue) : annotation.consequenceCue === null, `${label}: consequence cue invalid`);
  assert(annotation.malformedDemandExplained ? validateSpan(excerpt, annotation.malformedDemandCue) : annotation.malformedDemandCue === null, `${label}: malformed-demand cue invalid`);
  assert(annotation.replacementDemandStated ? validateSpan(excerpt, annotation.replacementDemandCue) : annotation.replacementDemandCue === null, `${label}: replacement-demand cue invalid`);
  exactKeys(annotation.burdenContact, ["tier", "bridgeId", "evidence"], `${label}.burdenContact`);
  assert(BURDEN_TIERS.includes(annotation.burdenContact.tier), `${label}: burden tier invalid`);
  if (annotation.burdenContact.tier === "none") assert(annotation.burdenContact.bridgeId === null && annotation.burdenContact.evidence === null, `${label}: none burden contact invalid`);
  else {
    const bridge = challengeCase.burdenContext.route?.bridges.find((item) => item.id === annotation.burdenContact.bridgeId);
    assert(challengeCase.burdenContext.burdenPacket.eligibleBridgeIds.includes(annotation.burdenContact.bridgeId) && bridge?.tier === annotation.burdenContact.tier && validateSpan(excerpt, annotation.burdenContact.evidence), `${label}: burden contact invalid`);
  }
  assert(annotation.rationale.trim().length >= 60, `${label}: rationale too short`);
}
assert(seen.size === input.caseCount, "pass missing cases");
const nonDefaultCounts = {
  originalTargetContacts: pass.annotations.filter((item) => item.originalTargetContact).length,
  connectedExamples: pass.annotations.filter((item) => item.connectedExample).length,
  exclusiveSubstitutions: pass.annotations.filter((item) => item.exclusiveObjectSubstitution).length,
  componentContacts: pass.annotations.flatMap((item) => item.componentContacts).filter((item) => item.contacted).length,
  defectCandidates: pass.annotations.filter((item) => item.defectType !== "none").length,
  diagnosticPositives: pass.annotations.filter(deriveDiagnostic).length,
  reframePositives: pass.annotations.filter(deriveReframe).length,
  burdenContacts: pass.annotations.filter((item) => item.burdenContact.tier !== "none").length,
  uniqueRationales: new Set(pass.annotations.map((item) => item.rationale.trim())).size,
};
const completionFloors = { originalTargetContacts:15, connectedExamples:3, exclusiveSubstitutions:3, componentContacts:20, defectCandidates:6, diagnosticPositives:3, reframePositives:3, burdenContacts:10, uniqueRationales:20 };
for (const [name, floor] of Object.entries(completionFloors)) assert(nonDefaultCounts[name] >= floor, `pass semantic completion failed: ${name} ${nonDefaultCounts[name]} < ${floor}`);
exactKeys(pass.audit, ["caseCount", "allCasesAnnotatedOnce", "componentSetErrors", "evidenceErrors", "derivedFieldsPresent", "scoreFieldsPresent", "nonDefaultCounts"], "audit");
assert(pass.audit.caseCount === input.caseCount && pass.audit.allCasesAnnotatedOnce === true && pass.audit.componentSetErrors === 0 && pass.audit.evidenceErrors === 0 && pass.audit.derivedFieldsPresent === false && pass.audit.scoreFieldsPresent === false && equal(pass.audit.nonDefaultCounts, nonDefaultCounts), "pass audit invalid");
console.log(JSON.stringify({ status: "passed", kind: pass.pass === "KEY" ? "adjudicated-key" : pass.pass.startsWith("KEY-") ? "key-candidate" : "annotation-pass", pass: pass.pass, caseCount: input.caseCount, passSha256: sha256(passText), nonDefaultCounts }, null, 2));

