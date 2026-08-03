#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { BURDEN_LABELS, CONTACT_OPERATIONS, COVERAGE_LABELS, DEFECT_TYPES, SUBSTITUTION_TYPES, canonicalBridgeSet, deriveBurdenRelation, deriveCoverage, deriveDiagnostic, deriveReframe, evidenceMatches } from "./lib/v26-derived-annotations.mjs";

const [argument, gateArgument = "docs/calibration/v2.6/held-out-gate/gate-manifest.json"] = process.argv.slice(2);
if (!argument) { console.error("Usage: node scripts/validate-v26-annotation-lock.mjs <lock.json> [gate.json]"); process.exit(1); }
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const exactKeys = (value, expected, label) => { assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be object`); assert(equal(Object.keys(value).sort(), [...expected].sort()), `${label} keys differ`); };

function validateFinal(inventory, move, final, label) {
  const coverage = final.coveragePrimitives;
  exactKeys(coverage, ["targetRelation", "substitutionType", "substitutionEvidence", "componentOperations", "relevantContraryMaterial", "contraryEvidence", "derivedTargetCoverage"], `${label}.coverage`);
  const expectedComponents = (move.targetPacket?.indispensableComponents ?? []).map((item) => item.id).sort(); const actualComponents = coverage.componentOperations.map((item) => item.componentId).sort(); const componentIds = new Set();
  for (const item of coverage.componentOperations) { exactKeys(item, ["componentId", "operation", "evidence"], `${label}.componentOperation`); assert(!componentIds.has(item.componentId), `${label} duplicate component`); componentIds.add(item.componentId); assert(item.operation === null || CONTACT_OPERATIONS.includes(item.operation), `${label} invalid operation`); assert(evidenceMatches(move.sourceExcerpt, item.evidence) && ((item.operation === null) === (item.evidence === null)), `${label} operation evidence invalid`); }
  assert(evidenceMatches(move.sourceExcerpt, coverage.substitutionEvidence) && evidenceMatches(move.sourceExcerpt, coverage.contraryEvidence), `${label} coverage evidence invalid`);
  if (move.interactionMode === "constructive") assert(coverage.targetRelation === "not-applicable" && coverage.substitutionType === null && coverage.substitutionEvidence === null && coverage.componentOperations.length === 0 && coverage.relevantContraryMaterial === null && coverage.contraryEvidence === null, `${label} constructive coverage invalid`);
  else if (coverage.targetRelation === "substituted") assert(SUBSTITUTION_TYPES.includes(coverage.substitutionType) && coverage.substitutionEvidence !== null && coverage.componentOperations.length === 0 && coverage.relevantContraryMaterial === false && coverage.contraryEvidence === null, `${label} substituted coverage invalid`);
  else {
    assert(coverage.targetRelation === "preserved" && coverage.substitutionType === null && coverage.substitutionEvidence === null && equal(expectedComponents, actualComponents), `${label} preserved coverage invalid`);
    const hasOperation = coverage.componentOperations.some((item) => item.operation !== null); assert(typeof coverage.relevantContraryMaterial === "boolean", `${label} contrary flag invalid`);
    if (hasOperation) assert(coverage.relevantContraryMaterial === false && coverage.contraryEvidence === null, `${label} contrary material with contact`); else assert((coverage.relevantContraryMaterial === true) === (coverage.contraryEvidence !== null), `${label} contrary evidence mismatch`);
  }
  assert(COVERAGE_LABELS.includes(coverage.derivedTargetCoverage) && deriveCoverage(move, coverage) === coverage.derivedTargetCoverage, `${label} coverage derivation invalid`);
  const diagnostic = final.diagnosticPrimitives; exactKeys(diagnostic, ["defectType", "defectEvidence", "targetImpactExplicit", "targetImpactEvidence", "derivedDiagnostic"], `${label}.diagnostic`);
  assert(DEFECT_TYPES.includes(diagnostic.defectType) && evidenceMatches(move.sourceExcerpt, diagnostic.defectEvidence) && evidenceMatches(move.sourceExcerpt, diagnostic.targetImpactEvidence) && ((diagnostic.defectType === "none") === (diagnostic.defectEvidence === null)) && ((diagnostic.targetImpactExplicit === false) === (diagnostic.targetImpactEvidence === null)) && deriveDiagnostic(diagnostic) === diagnostic.derivedDiagnostic, `${label} diagnostic invalid`);
  const reframe = final.reframePrimitives; exactKeys(reframe, ["malformedDemandExplained", "malformedDemandEvidence", "replacementDemandStated", "replacementDemandEvidence", "derivedReframe"], `${label}.reframe`);
  assert(evidenceMatches(move.sourceExcerpt, reframe.malformedDemandEvidence) && evidenceMatches(move.sourceExcerpt, reframe.replacementDemandEvidence) && ((reframe.malformedDemandExplained === false) === (reframe.malformedDemandEvidence === null)) && ((reframe.replacementDemandStated === false) === (reframe.replacementDemandEvidence === null)) && deriveReframe(reframe) === reframe.derivedReframe, `${label} reframe invalid`);
  const burden = final.burdenPrimitives; exactKeys(burden, ["contactedBridges", "derivedBurdenRelation"], `${label}.burden`); const bridges = new Set();
  for (const item of burden.contactedBridges) { exactKeys(item, ["bridgeId", "contactMode"], `${label}.bridgeContact`); assert(!bridges.has(item.bridgeId) && move.burdenPacket.eligibleBridgeIds.includes(item.bridgeId) && ["supports", "attacks"].includes(item.contactMode), `${label} bridge invalid`); bridges.add(item.bridgeId); }
  assert(BURDEN_LABELS.includes(burden.derivedBurdenRelation) && deriveBurdenRelation(inventory, move, burden) === burden.derivedBurdenRelation, `${label} burden derivation invalid`);
}

const lockSource = await readFile(path.resolve(argument), "utf8"); const lock = JSON.parse(lockSource);
const gate = JSON.parse(await readFile(path.resolve(gateArgument), "utf8")); const debate = gate.sample.debates.find((item) => item.debateId === lock.debateId); assert(debate, "lock debate not preregistered");
exactKeys(lock, ["schemaVersion", "workflowVersion", "rubricVersion", "gateId", "debateId", "debateNumber", "model", "calibrationOnly", "lockedAt", "isolation", "source", "annotations", "agreement", "audit"], "lock");
assert(lock.schemaVersion === "2.6-derived-annotation-lock" && lock.workflowVersion === gate.workflowVersion && lock.rubricVersion === gate.rubricVersion && lock.gateId === gate.gateId && lock.debateNumber === debate.number && lock.model === "5.6 Sol" && lock.calibrationOnly === true, "lock identity mismatch");
exactKeys(lock.isolation, ["method", "legacyMaterialAvailable", "numericalScoresAvailable", "statement"], "isolation"); assert(lock.isolation.method === "fresh-v2.6-primitive-adjudication-task" && lock.isolation.legacyMaterialAvailable === false && lock.isolation.numericalScoresAvailable === false && lock.isolation.statement.trim().length >= 40, "lock isolation failed");
exactKeys(lock.source, ["passAPath", "passASha256", "passBPath", "passBSha256", "inventoryPath", "inventorySha256"], "source");
const [aSource, bSource, inventorySource] = await Promise.all([lock.source.passAPath, lock.source.passBPath, lock.source.inventoryPath].map((file) => readFile(path.resolve(file), "utf8")));
assert(lock.source.passASha256 === sha256(aSource) && lock.source.passBSha256 === sha256(bSource) && lock.source.inventorySha256 === sha256(inventorySource), "lock source hash mismatch");
const a = JSON.parse(aSource); const b = JSON.parse(bSource); const inventory = JSON.parse(inventorySource);
assert(a.pass === "A" && b.pass === "B" && a.debateId === lock.debateId && b.debateId === lock.debateId && inventory.debateId === lock.debateId, "lock source identity mismatch");
const byA = new Map(a.annotations.map((item) => [item.moveId, item])); const byB = new Map(b.annotations.map((item) => [item.moveId, item])); const moves = new Map(inventory.moves.map((item) => [item.moveId, item]));
const agreement = { moveCount: 12, responsiveMoveCount: 8, componentContactAgreementCount: 0, componentContactJudgmentCount: 0, componentOperationAgreementCount: 0, componentOperationJudgmentCount: 0, targetRelationAgreementCount: 0, defectTypeAgreementCount: 0, targetImpactAgreementCount: 0, malformedDemandAgreementCount: 0, replacementDemandAgreementCount: 0, bridgeSetAgreementCount: 0, coverageAgreementCount: 0, responsiveCoverageAgreementCount: 0, diagnosticAgreementCount: 0, reframeAgreementCount: 0, burdenAgreementCount: 0, exactDerivedTupleAgreementCount: 0 };
const primitiveFields = ["targetRelation", "substitutionType", "substitutionEvidence", "componentOperations", "relevantContraryMaterial", "contraryEvidence", "defectType", "defectEvidence", "targetImpactExplicit", "targetImpactEvidence", "malformedDemandExplained", "malformedDemandEvidence", "replacementDemandStated", "replacementDemandEvidence", "contactedBridges"];
const getters = {
  targetRelation: (x) => x.coveragePrimitives.targetRelation, substitutionType: (x) => x.coveragePrimitives.substitutionType, substitutionEvidence: (x) => x.coveragePrimitives.substitutionEvidence, componentOperations: (x) => x.coveragePrimitives.componentOperations, relevantContraryMaterial: (x) => x.coveragePrimitives.relevantContraryMaterial, contraryEvidence: (x) => x.coveragePrimitives.contraryEvidence,
  defectType: (x) => x.diagnosticPrimitives.defectType, defectEvidence: (x) => x.diagnosticPrimitives.defectEvidence, targetImpactExplicit: (x) => x.diagnosticPrimitives.targetImpactExplicit, targetImpactEvidence: (x) => x.diagnosticPrimitives.targetImpactEvidence,
  malformedDemandExplained: (x) => x.reframePrimitives.malformedDemandExplained, malformedDemandEvidence: (x) => x.reframePrimitives.malformedDemandEvidence, replacementDemandStated: (x) => x.reframePrimitives.replacementDemandStated, replacementDemandEvidence: (x) => x.reframePrimitives.replacementDemandEvidence, contactedBridges: (x) => x.burdenPrimitives.contactedBridges,
};
let primitiveDisagreements = 0; const seen = new Set();
for (const [index, final] of lock.annotations.entries()) {
  const label = `annotations[${index}]`; exactKeys(final, ["moveId", "interactionMode", "targetPacketId", "primaryBurdenRouteId", "coveragePrimitives", "diagnosticPrimitives", "reframePrimitives", "burdenPrimitives", "fieldSources", "coverageRationale", "mechanismRationale", "burdenRationale"], label);
  assert(!seen.has(final.moveId), `${label} duplicate`); seen.add(final.moveId); const left = byA.get(final.moveId); const right = byB.get(final.moveId); const move = moves.get(final.moveId); assert(left && right && move, `${label} missing source`);
  assert(final.interactionMode === move.interactionMode && final.targetPacketId === (move.targetPacket?.id ?? null) && final.primaryBurdenRouteId === move.burdenPacket.primaryRouteId, `${label} changed inventory locks`);
  exactKeys(final.fieldSources, primitiveFields, `${label}.fieldSources`);
  for (const field of primitiveFields) { const l = getters[field](left); const r = getters[field](right); const f = getters[field](final); if (equal(l, r)) assert(final.fieldSources[field] === "agreement" && equal(f, l), `${label}.${field} changed agreement`); else { primitiveDisagreements += 1; assert(final.fieldSources[field] === "adjudication", `${label}.${field} not adjudicated`); } }
  if (move.interactionMode === "responsive") {
    if (left.coveragePrimitives.targetRelation === right.coveragePrimitives.targetRelation) agreement.targetRelationAgreementCount += 1;
    if (left.coveragePrimitives.derivedTargetCoverage === right.coveragePrimitives.derivedTargetCoverage) agreement.responsiveCoverageAgreementCount += 1;
    if (left.coveragePrimitives.targetRelation === "preserved" && right.coveragePrimitives.targetRelation === "preserved") {
      const leftOps = new Map(left.coveragePrimitives.componentOperations.map((item) => [item.componentId, item.operation])); const rightOps = new Map(right.coveragePrimitives.componentOperations.map((item) => [item.componentId, item.operation]));
      for (const component of move.targetPacket.indispensableComponents) { const l = leftOps.get(component.id); const r = rightOps.get(component.id); agreement.componentOperationJudgmentCount += 1; agreement.componentContactJudgmentCount += 1; if (l === r) agreement.componentOperationAgreementCount += 1; if ((l !== null) === (r !== null)) agreement.componentContactAgreementCount += 1; }
    }
  }
  if (left.diagnosticPrimitives.defectType === right.diagnosticPrimitives.defectType) agreement.defectTypeAgreementCount += 1;
  if (left.diagnosticPrimitives.targetImpactExplicit === right.diagnosticPrimitives.targetImpactExplicit) agreement.targetImpactAgreementCount += 1;
  if (left.reframePrimitives.malformedDemandExplained === right.reframePrimitives.malformedDemandExplained) agreement.malformedDemandAgreementCount += 1;
  if (left.reframePrimitives.replacementDemandStated === right.reframePrimitives.replacementDemandStated) agreement.replacementDemandAgreementCount += 1;
  if (canonicalBridgeSet(left.burdenPrimitives.contactedBridges) === canonicalBridgeSet(right.burdenPrimitives.contactedBridges)) agreement.bridgeSetAgreementCount += 1;
  if (left.coveragePrimitives.derivedTargetCoverage === right.coveragePrimitives.derivedTargetCoverage) agreement.coverageAgreementCount += 1;
  if (left.diagnosticPrimitives.derivedDiagnostic === right.diagnosticPrimitives.derivedDiagnostic) agreement.diagnosticAgreementCount += 1;
  if (left.reframePrimitives.derivedReframe === right.reframePrimitives.derivedReframe) agreement.reframeAgreementCount += 1;
  if (left.burdenPrimitives.derivedBurdenRelation === right.burdenPrimitives.derivedBurdenRelation) agreement.burdenAgreementCount += 1;
  const tuple = (x) => JSON.stringify([x.coveragePrimitives.derivedTargetCoverage, x.diagnosticPrimitives.derivedDiagnostic, x.reframePrimitives.derivedReframe, x.burdenPrimitives.derivedBurdenRelation]); if (tuple(left) === tuple(right)) agreement.exactDerivedTupleAgreementCount += 1;
  validateFinal(inventory, move, final, label); assert(final.coverageRationale.trim().length >= 40 && final.mechanismRationale.trim().length >= 40 && final.burdenRationale.trim().length >= 40, `${label} rationale too short`);
}
assert(seen.size === moves.size, "moves missing from lock"); exactKeys(lock.agreement, Object.keys(agreement), "agreement"); assert(equal(lock.agreement, agreement), "agreement counts mismatch");
exactKeys(lock.audit, ["primitiveDisagreementCount", "adjudicatedPrimitiveCount", "evidenceOffsetErrors", "derivationMismatches", "unresolvedDisagreements", "movesMissingFinalLock"], "audit");
assert(lock.audit.primitiveDisagreementCount === primitiveDisagreements && lock.audit.adjudicatedPrimitiveCount === primitiveDisagreements && lock.audit.evidenceOffsetErrors === 0 && lock.audit.derivationMismatches === 0 && lock.audit.unresolvedDisagreements === 0 && lock.audit.movesMissingFinalLock === 0, "lock audit mismatch");
console.log(JSON.stringify({ status: "passed", debateId: lock.debateId, ...agreement, primitiveDisagreementCount: primitiveDisagreements, lockSha256: sha256(lockSource) }, null, 2));
