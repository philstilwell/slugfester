#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { CONTACT_OPERATIONS, DEFECT_TYPES, SUBSTITUTION_TYPES, deriveBurdenRelation, deriveCoverage, deriveDiagnostic, deriveReframe, evidenceMatches } from "./lib/v26-derived-annotations.mjs";

const [passArgument, gateArgument = "docs/calibration/v2.6/held-out-gate/gate-manifest.json"] = process.argv.slice(2);
if (!passArgument) { console.error("Usage: node scripts/validate-v26-annotation-pass.mjs <pass.json> [gate.json]"); process.exit(1); }
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const exactKeys = (value, expected, label) => { assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be object`); assert(equal(Object.keys(value).sort(), [...expected].sort()), `${label} keys differ`); };

function validateCoverage(move, coverage, label) {
  exactKeys(coverage, ["targetRelation", "substitutionType", "substitutionEvidence", "componentOperations", "relevantContraryMaterial", "contraryEvidence", "derivedTargetCoverage"], `${label}.coverage`);
  const expectedComponents = (move.targetPacket?.indispensableComponents ?? []).map((item) => item.id).sort();
  const actualComponents = coverage.componentOperations.map((item) => item.componentId).sort();
  const seen = new Set();
  for (const item of coverage.componentOperations) {
    exactKeys(item, ["componentId", "operation", "evidence"], `${label}.componentOperation`);
    assert(!seen.has(item.componentId), `${label} duplicate component operation`); seen.add(item.componentId);
    assert(item.operation === null || CONTACT_OPERATIONS.includes(item.operation), `${label} invalid component operation`);
    assert(evidenceMatches(move.sourceExcerpt, item.evidence), `${label} component evidence offset mismatch`);
    assert((item.operation === null) === (item.evidence === null), `${label} component operation/evidence mismatch`);
  }
  assert(evidenceMatches(move.sourceExcerpt, coverage.substitutionEvidence) && evidenceMatches(move.sourceExcerpt, coverage.contraryEvidence), `${label} coverage evidence offset mismatch`);
  if (move.interactionMode === "constructive") {
    assert(coverage.targetRelation === "not-applicable" && coverage.substitutionType === null && coverage.substitutionEvidence === null && coverage.componentOperations.length === 0 && coverage.relevantContraryMaterial === null && coverage.contraryEvidence === null, `${label} constructive coverage invalid`);
  } else if (coverage.targetRelation === "substituted") {
    assert(SUBSTITUTION_TYPES.includes(coverage.substitutionType) && coverage.substitutionEvidence !== null && coverage.componentOperations.length === 0 && coverage.relevantContraryMaterial === false && coverage.contraryEvidence === null, `${label} substituted coverage invalid`);
  } else {
    assert(coverage.targetRelation === "preserved" && coverage.substitutionType === null && coverage.substitutionEvidence === null && equal(expectedComponents, actualComponents), `${label} preserved target/component mismatch`);
    const hasOperation = coverage.componentOperations.some((item) => item.operation !== null);
    assert(typeof coverage.relevantContraryMaterial === "boolean", `${label} contrary-material applicability invalid`);
    if (hasOperation) assert(coverage.relevantContraryMaterial === false && coverage.contraryEvidence === null, `${label} contrary material with component contact`);
    else assert((coverage.relevantContraryMaterial === true) === (coverage.contraryEvidence !== null), `${label} contrary material/evidence mismatch`);
  }
  assert(coverage.derivedTargetCoverage === deriveCoverage(move, coverage), `${label} coverage derivation mismatch`);
}

function validateMechanismAndBurden(inventory, move, annotation, label) {
  const diagnostic = annotation.diagnosticPrimitives;
  exactKeys(diagnostic, ["defectType", "defectEvidence", "targetImpactExplicit", "targetImpactEvidence", "derivedDiagnostic"], `${label}.diagnostic`);
  assert(DEFECT_TYPES.includes(diagnostic.defectType) && evidenceMatches(move.sourceExcerpt, diagnostic.defectEvidence) && evidenceMatches(move.sourceExcerpt, diagnostic.targetImpactEvidence), `${label} diagnostic evidence invalid`);
  assert((diagnostic.defectType === "none") === (diagnostic.defectEvidence === null) && (diagnostic.targetImpactExplicit === false) === (diagnostic.targetImpactEvidence === null), `${label} diagnostic primitive mismatch`);
  assert(diagnostic.derivedDiagnostic === deriveDiagnostic(diagnostic), `${label} diagnostic derivation mismatch`);
  const reframe = annotation.reframePrimitives;
  exactKeys(reframe, ["malformedDemandExplained", "malformedDemandEvidence", "replacementDemandStated", "replacementDemandEvidence", "derivedReframe"], `${label}.reframe`);
  assert(evidenceMatches(move.sourceExcerpt, reframe.malformedDemandEvidence) && evidenceMatches(move.sourceExcerpt, reframe.replacementDemandEvidence), `${label} reframe evidence invalid`);
  assert((reframe.malformedDemandExplained === false) === (reframe.malformedDemandEvidence === null) && (reframe.replacementDemandStated === false) === (reframe.replacementDemandEvidence === null), `${label} reframe primitive mismatch`);
  assert(reframe.derivedReframe === deriveReframe(reframe), `${label} reframe derivation mismatch`);
  const burden = annotation.burdenPrimitives;
  exactKeys(burden, ["contactedBridges", "derivedBurdenRelation"], `${label}.burden`);
  const contacted = new Set();
  for (const item of burden.contactedBridges) { exactKeys(item, ["bridgeId", "contactMode"], `${label}.bridgeContact`); assert(!contacted.has(item.bridgeId) && move.burdenPacket.eligibleBridgeIds.includes(item.bridgeId) && ["supports", "attacks"].includes(item.contactMode), `${label} ineligible/duplicate bridge`); contacted.add(item.bridgeId); }
  if (move.burdenPacket.primaryRouteId === null) assert(burden.contactedBridges.length === 0, `${label} null route has contacts`);
  assert(burden.derivedBurdenRelation === deriveBurdenRelation(inventory, move, burden), `${label} burden derivation mismatch`);
}

const passSource = await readFile(path.resolve(passArgument), "utf8"); const artifact = JSON.parse(passSource);
const gateSource = await readFile(path.resolve(gateArgument), "utf8"); const gate = JSON.parse(gateSource);
const debate = gate.sample.debates.find((item) => item.debateId === artifact.debateId); assert(debate, "annotation debate not preregistered");
exactKeys(artifact, ["schemaVersion", "workflowVersion", "rubricVersion", "gateId", "debateId", "debateNumber", "pass", "model", "calibrationOnly", "completedAt", "isolation", "source", "annotations", "audit"], "pass");
assert(artifact.schemaVersion === "2.6-derived-annotation-pass" && artifact.workflowVersion === gate.workflowVersion && artifact.rubricVersion === gate.rubricVersion && artifact.gateId === gate.gateId && artifact.debateNumber === debate.number && ["A", "B"].includes(artifact.pass) && artifact.model === "5.6 Sol" && artifact.calibrationOnly === true, "pass identity mismatch");
const expectedInputs = ["docs/assessment-workflow-v2.6.md", "docs/reassessment-rubric-v2.6.md", "docs/calibration/v2.6/annotation-pass-schema.json", "docs/calibration/v2.6/held-out-gate/gate-manifest.json", "docs/calibration/v2.6/development/annotation-manual.md", "docs/calibration/v2.6/development/target-contact-examples.json", `docs/calibration/v2.6/held-out-gate/inventories/${debate.debateId}.json`, `.assessment-cache/captions/${debate.videoId}/transcript.txt`, `.assessment-cache/captions/${debate.videoId}/events.json`, `.assessment-cache/captions/${debate.videoId}/manifest.json`];
exactKeys(artifact.isolation, ["method", "allowedInputs", "prohibitedInputsConfirmed", "contaminationDetected", "statement"], "isolation");
assert(artifact.isolation.method === "fresh-isolated-v2.6-derived-annotation-task" && artifact.isolation.prohibitedInputsConfirmed === true && artifact.isolation.contaminationDetected === false && equal([...artifact.isolation.allowedInputs].sort(), [...expectedInputs].sort()) && artifact.isolation.statement.trim().length >= 40, "isolation/allowlist failed");
exactKeys(artifact.source, ["videoId", "inventoryPath", "inventorySha256", "transcriptSha256", "eventsSha256", "manifestSha256", "gateManifestSha256", "workflowSha256", "rubricSha256", "schemaSha256", "developmentManualSha256", "developmentExamplesSha256", "limitations"], "source");
assert(artifact.source.videoId === debate.videoId && artifact.source.inventoryPath === expectedInputs[6], "source identity mismatch");
const mapping = { inventorySha256: expectedInputs[6], transcriptSha256: expectedInputs[7], eventsSha256: expectedInputs[8], manifestSha256: expectedInputs[9], gateManifestSha256: expectedInputs[3], workflowSha256: expectedInputs[0], rubricSha256: expectedInputs[1], schemaSha256: expectedInputs[2], developmentManualSha256: expectedInputs[4], developmentExamplesSha256: expectedInputs[5] };
const loaded = {};
for (const [field, file] of Object.entries(mapping)) { loaded[field] = await readFile(path.resolve(file), "utf8"); assert(artifact.source[field] === sha256(loaded[field]), `${field} mismatch`); }
const inventory = JSON.parse(loaded.inventorySha256); const byId = new Map(inventory.moves.map((move) => [move.moveId, move])); const seen = new Set();
assert(artifact.annotations.length === 12, "pass must contain 12 moves");
for (const [index, annotation] of artifact.annotations.entries()) {
  const label = `annotations[${index}]`;
  exactKeys(annotation, ["moveId", "interactionMode", "targetPacketId", "primaryBurdenRouteId", "coveragePrimitives", "diagnosticPrimitives", "reframePrimitives", "burdenPrimitives", "coverageRationale", "mechanismRationale", "burdenRationale", "confidence"], label);
  assert(!seen.has(annotation.moveId), `${label} duplicate`); seen.add(annotation.moveId); const move = byId.get(annotation.moveId); assert(move, `${label} unknown move`);
  assert(annotation.interactionMode === move.interactionMode && annotation.targetPacketId === (move.targetPacket?.id ?? null) && annotation.primaryBurdenRouteId === move.burdenPacket.primaryRouteId, `${label} changed inventory lock`);
  validateCoverage(move, annotation.coveragePrimitives, label); validateMechanismAndBurden(inventory, move, annotation, label);
  assert(annotation.coverageRationale.trim().length >= 40 && annotation.mechanismRationale.trim().length >= 40 && annotation.burdenRationale.trim().length >= 40 && ["high", "medium", "low"].includes(annotation.confidence), `${label} rationale/confidence invalid`);
}
assert(seen.size === byId.size, "not all moves annotated");
exactKeys(artifact.audit, ["moveCount", "allInventoryLocksCopied", "evidenceOffsetErrors", "derivationMismatches", "scoreFieldsPresent", "allMovesAnnotatedOnce"], "audit");
assert(artifact.audit.moveCount === 12 && artifact.audit.allInventoryLocksCopied === true && artifact.audit.evidenceOffsetErrors === 0 && artifact.audit.derivationMismatches === 0 && artifact.audit.scoreFieldsPresent === false && artifact.audit.allMovesAnnotatedOnce === true, "pass audit failed");
console.log(JSON.stringify({ status: "passed", debateId: artifact.debateId, pass: artifact.pass, moveCount: 12, passSha256: sha256(passSource) }, null, 2));
