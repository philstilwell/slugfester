#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  COMPONENT_KINDS,
  CONTACT_OPERATIONS,
  DEFECT_TYPES,
  OBJECT_CHANGE_TYPES,
  TARGET_BURDEN_RELATIONS,
  TARGET_OBJECT_RELATIONS,
  TARGET_SCOPE_RELATIONS,
  canonicalOperationSet,
  deriveCoverage,
  deriveDiagnostic,
  deriveTargetDisposition,
  evidenceMatches,
  validateComponentGraph,
} from "./lib/v27-derived-annotations.mjs";

const sourcePath = path.resolve("docs/calibration/v2.7/development/v2.6-disagreement-source.json");
const examplesPath = path.resolve("docs/calibration/v2.7/development/orthogonal-target-diagnostic-examples.json");
const schemaPath = path.resolve("docs/calibration/v2.7/orthogonal-target-diagnostic-development-schema.json");
const EXPECTED_SOURCE_COUNTS = { caseCount: 15, targetRelation: 3, coverage: 5, defectType: 9, targetImpact: 7, diagnostic: 7, componentContact: 4, componentOperation: 8 };
const INTENTIONAL_CONTACT_REVISIONS = new Set(["173:173-m11", "192:m08"]);

function assert(condition, message) { if (!condition) throw new Error(message); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function exactKeys(value, expected, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert(same(Object.keys(value).sort(), [...expected].sort()), `${label} keys differ`);
}
function validSpan(span, label) {
  exactKeys(span, ["startMs", "endMs"], label);
  assert(Number.isInteger(span.startMs) && Number.isInteger(span.endMs) && span.startMs >= 0 && span.endMs > span.startMs, `${label} invalid`);
}
function evidenceIsValid(excerpt, item) { return item !== null && evidenceMatches(excerpt, item); }
function contactSignature(operations) {
  return JSON.stringify([...operations].map((item) => `${item.componentId}:${item.operation === null ? "not-addressed" : "addressed"}`).sort());
}

const [sourceText, examplesText, schemaText] = await Promise.all([sourcePath, examplesPath, schemaPath].map((file) => readFile(file, "utf8")));
const source = JSON.parse(sourceText);
const artifact = JSON.parse(examplesText);
JSON.parse(schemaText);

exactKeys(artifact, ["schemaVersion", "workflowVersion", "rubricVersion", "sourceGateId", "heldOutEligible", "retiredDebates", "cases", "audit"], "artifact");
assert(artifact.schemaVersion === "2.7-orthogonal-target-diagnostic-development", "schema version mismatch");
assert(artifact.workflowVersion === "Slugfester Reassessment Workflow v2.7", "workflow version mismatch");
assert(artifact.rubricVersion === "Slugfester Reassessment Rubric v2.7", "rubric version mismatch");
assert(artifact.sourceGateId === source.sourceGateId && artifact.heldOutEligible === false, "development identity mismatch");
assert(same(source.audit, EXPECTED_SOURCE_COUNTS), `source disagreement counts changed: ${JSON.stringify(source.audit)}`);
assert(same(artifact.retiredDebates, source.retiredDebates) && artifact.cases.length === 15, "retired debate set or case count mismatch");

const sourceById = new Map(source.cases.map((item) => [item.caseId, item]));
const seen = new Set();
let targetAxisEvidenceErrors = 0;
let componentEvidenceErrors = 0;
let diagnosticObjectErrors = 0;
let diagnosticEvidenceErrors = 0;
let derivationErrors = 0;
let stableContactRegressions = 0;

for (const [index, item] of artifact.cases.entries()) {
  const label = `cases[${index}]`;
  exactKeys(item, ["caseId", "debateId", "debateNumber", "moveId", "speaker", "interactionMode", "sourceSpan", "sourceExcerpt", "sourceExcerptSha256", "targetPacket", "provenance", "v26Disagreements", "finalCoverage", "finalDiagnostic", "rationale"], label);
  assert(!seen.has(item.caseId), `${label} duplicate caseId`); seen.add(item.caseId);
  const original = sourceById.get(item.caseId);
  assert(original, `${label} not present in extracted source`);
  const move = original.move;
  assert(item.debateId === original.debateId && item.debateNumber === original.debateNumber && item.moveId === move.moveId && item.speaker === move.speaker && item.interactionMode === move.interactionMode, `${label} identity mismatch`);
  validSpan(item.sourceSpan, `${label}.sourceSpan`);
  assert(same(item.sourceSpan, move.sourceSpan) && item.sourceExcerpt === move.sourceExcerpt && item.sourceExcerptSha256 === move.sourceExcerptSha256 && item.sourceExcerptSha256 === sha256(item.sourceExcerpt), `${label} source excerpt mismatch`);
  assert(same(item.provenance, original.provenance) && same(item.v26Disagreements, original.disagreements), `${label} provenance or disagreement mismatch`);
  for (const [digestField, pathField] of [["inventorySha256", "inventoryPath"], ["passASha256", "passAPath"], ["passBSha256", "passBPath"], ["lockSha256", "lockPath"]]) {
    assert(item.provenance[digestField] === sha256(await readFile(path.resolve(item.provenance[pathField]), "utf8")), `${label} ${digestField} mismatch`);
  }

  const constructive = item.interactionMode === "constructive";
  assert(same(item.targetPacket, move.targetPacket), `${label}.targetPacket changed from retired source`);
  if (constructive) assert(item.targetPacket === null, `${label} constructive target must be null`);
  else {
    const target = item.targetPacket;
    assert(target !== null, `${label} responsive move requires target`);
    exactKeys(target, ["id", "targetSpeaker", "sourceSpan", "sourceExcerpt", "sourceExcerptSha256", "claim", "targetRelationToMove", "interveningOpponentClaim", "exceptionRationale", "indispensableComponents", "selectionRationale"], `${label}.targetPacket`);
    validSpan(target.sourceSpan, `${label}.targetPacket.sourceSpan`);
    assert(target.sourceExcerptSha256 === sha256(target.sourceExcerpt), `${label} target excerpt digest mismatch`);
    if (target.targetRelationToMove === "immediate-opponent-claim") assert(target.interveningOpponentClaim === false && target.exceptionRationale === null, `${label} immediate target exception invalid`);
    else assert(target.targetRelationToMove === "earlier-load-bearing-claim" && target.interveningOpponentClaim === true && target.exceptionRationale?.trim().length >= 40, `${label} earlier target exception invalid`);
    for (const component of target.indispensableComponents) {
      exactKeys(component, ["id", "text", "kind", "dependsOn"], `${label}.component`);
      assert(COMPONENT_KINDS.includes(component.kind), `${label} invalid component kind`);
    }
    const graphErrors = validateComponentGraph(target.indispensableComponents);
    assert(graphErrors.length === 0, `${label} component graph invalid: ${graphErrors.join("; ")}`);
  }

  const coverage = item.finalCoverage;
  exactKeys(coverage, ["targetObjectRelation", "objectChangeType", "objectEvidence", "targetScopeRelation", "scopeEvidence", "targetBurdenRelation", "burdenEvidence", "componentOperations", "relevantContraryMaterial", "contraryEvidence", "derivedTargetDisposition", "derivedTargetCoverage"], `${label}.finalCoverage`);
  assert(TARGET_OBJECT_RELATIONS.includes(coverage.targetObjectRelation) && TARGET_SCOPE_RELATIONS.includes(coverage.targetScopeRelation) && TARGET_BURDEN_RELATIONS.includes(coverage.targetBurdenRelation), `${label} invalid target-axis label`);
  if (constructive) {
    assert(coverage.targetObjectRelation === "not-applicable" && coverage.targetScopeRelation === "not-applicable" && coverage.targetBurdenRelation === "not-applicable", `${label} constructive target axes invalid`);
    assert(coverage.objectChangeType === null && coverage.objectEvidence === null && coverage.scopeEvidence === null && coverage.burdenEvidence === null && coverage.componentOperations.length === 0 && coverage.relevantContraryMaterial === null && coverage.contraryEvidence === null, `${label} constructive coverage applicability invalid`);
  } else {
    if (coverage.targetObjectRelation === "changed") {
      if (!OBJECT_CHANGE_TYPES.includes(coverage.objectChangeType) || !evidenceIsValid(item.sourceExcerpt, coverage.objectEvidence)) targetAxisEvidenceErrors += 1;
    } else assert(coverage.targetObjectRelation === "same" && coverage.objectChangeType === null && coverage.objectEvidence === null, `${label} same-object consistency invalid`);
    if (coverage.targetScopeRelation === "same") assert(coverage.scopeEvidence === null, `${label} same-scope evidence must be null`);
    else if (!evidenceIsValid(item.sourceExcerpt, coverage.scopeEvidence)) targetAxisEvidenceErrors += 1;
    if (coverage.targetBurdenRelation === "retained") assert(coverage.burdenEvidence === null, `${label} retained-burden evidence must be null`);
    else if (!evidenceIsValid(item.sourceExcerpt, coverage.burdenEvidence)) targetAxisEvidenceErrors += 1;

    const substituted = deriveTargetDisposition(item, coverage) === "substituted";
    if (substituted) {
      assert(coverage.componentOperations.length === 0 && coverage.relevantContraryMaterial === false && coverage.contraryEvidence === null, `${label} substituted applicability invalid`);
    } else {
      const expectedIds = item.targetPacket.indispensableComponents.map((component) => component.id).sort();
      const actualIds = coverage.componentOperations.map((operation) => operation.componentId).sort();
      assert(same(expectedIds, actualIds), `${label} operation component set mismatch`);
      const used = new Set();
      for (const operation of coverage.componentOperations) {
        exactKeys(operation, ["componentId", "operation", "evidence"], `${label}.operation`);
        assert(!used.has(operation.componentId), `${label} duplicate component operation`); used.add(operation.componentId);
        assert(operation.operation === null || CONTACT_OPERATIONS.includes(operation.operation), `${label} invalid component operation`);
        assert((operation.operation === null) === (operation.evidence === null), `${label} operation/evidence consistency invalid`);
        if (!evidenceMatches(item.sourceExcerpt, operation.evidence)) componentEvidenceErrors += 1;
      }
      const anyContact = coverage.componentOperations.some((operation) => operation.operation !== null);
      assert(!anyContact || coverage.relevantContraryMaterial === false, `${label} contacted target cannot also use contrary-material escape`);
      assert(typeof coverage.relevantContraryMaterial === "boolean", `${label} responsive contrary-material flag invalid`);
      assert((coverage.relevantContraryMaterial === false) === (coverage.contraryEvidence === null), `${label} contrary evidence consistency invalid`);
      if (!evidenceMatches(item.sourceExcerpt, coverage.contraryEvidence)) componentEvidenceErrors += 1;
      if (coverage.targetScopeRelation !== "same") {
        assert(coverage.componentOperations.some((operation) => ["qualifies", "distinguishes"].includes(operation.operation)), `${label} scope change requires a qualifying or distinguishing component operation`);
      }
    }
  }
  if (deriveTargetDisposition(item, coverage) !== coverage.derivedTargetDisposition || deriveCoverage(item, coverage) !== coverage.derivedTargetCoverage) derivationErrors += 1;

  const diagnostic = item.finalDiagnostic;
  exactKeys(diagnostic, ["applicability", "defectType", "defectObject", "defectEvidence", "impactMode", "impactEvidence", "derivedDiagnostic"], `${label}.finalDiagnostic`);
  assert(DEFECT_TYPES.includes(diagnostic.defectType), `${label} invalid defect type`);
  if (constructive) {
    assert(diagnostic.applicability === "not-applicable" && diagnostic.defectType === "none" && diagnostic.defectObject === null && diagnostic.defectEvidence === null && diagnostic.impactMode === "not-applicable" && diagnostic.impactEvidence === null && diagnostic.derivedDiagnostic === false, `${label} constructive diagnostic applicability invalid`);
  } else {
    assert(diagnostic.applicability === "applicable", `${label} responsive diagnostic must be applicable`);
    if (diagnostic.defectType === "none") {
      assert(diagnostic.defectObject === null && diagnostic.defectEvidence === null && diagnostic.impactMode === "none" && diagnostic.impactEvidence === null, `${label} no-defect consistency invalid`);
    } else {
      assert(coverage.derivedTargetDisposition === "preserved", `${label} diagnostic defect cannot lock to a substituted target`);
      if (diagnostic.defectObject === null || !evidenceIsValid(item.sourceExcerpt, diagnostic.defectEvidence)) diagnosticEvidenceErrors += 1;
      else if (diagnostic.defectObject.objectType === "target-packet") {
        if (diagnostic.defectObject.objectId !== item.targetPacket.id) diagnosticObjectErrors += 1;
      } else if (diagnostic.defectObject.objectType === "target-component") {
        if (!item.targetPacket.indispensableComponents.some((component) => component.id === diagnostic.defectObject.objectId)) diagnosticObjectErrors += 1;
      } else diagnosticObjectErrors += 1;
      if (diagnostic.impactMode === "none") assert(diagnostic.impactEvidence === null, `${label} none impact evidence must be null`);
      else {
        assert(["verdict", "inferential-consequence"].includes(diagnostic.impactMode), `${label} invalid impact mode`);
        if (!evidenceIsValid(item.sourceExcerpt, diagnostic.impactEvidence)) diagnosticEvidenceErrors += 1;
      }
    }
  }
  if (deriveDiagnostic(item, diagnostic) !== diagnostic.derivedDiagnostic) derivationErrors += 1;

  const regressionKey = `${item.debateNumber}:${item.moveId}`;
  if (!INTENTIONAL_CONTACT_REVISIONS.has(regressionKey) && canonicalOperationSet(coverage.componentOperations) !== canonicalOperationSet(original.v26Lock.coveragePrimitives.componentOperations)) {
    const oldContact = contactSignature(original.v26Lock.coveragePrimitives.componentOperations);
    const newContact = contactSignature(coverage.componentOperations);
    if (oldContact !== newContact) stableContactRegressions += 1;
  }
  assert(item.rationale.trim().length >= 60, `${label} rationale too short`);
}

assert(seen.size === sourceById.size, "development source cases missing");
const expectedAudit = { caseCount: 15, sourceDisagreementCounts: source.audit, targetAxisEvidenceErrors, componentEvidenceErrors, diagnosticObjectErrors, diagnosticEvidenceErrors, derivationErrors, stableContactRegressions, heldOutContamination: 0 };
assert(same(artifact.audit, expectedAudit), `audit mismatch: ${JSON.stringify(expectedAudit)}`);
assert(targetAxisEvidenceErrors === 0 && componentEvidenceErrors === 0 && diagnosticObjectErrors === 0 && diagnosticEvidenceErrors === 0 && derivationErrors === 0 && stableContactRegressions === 0, "v2.7 development validation failed");

console.log(JSON.stringify({
  status: "passed",
  caseCount: artifact.cases.length,
  intentionalContactRevisions: [...INTENTIONAL_CONTACT_REVISIONS],
  sourceSha256: sha256(sourceText),
  examplesSha256: sha256(examplesText),
  schemaSha256: sha256(schemaText),
}, null, 2));
