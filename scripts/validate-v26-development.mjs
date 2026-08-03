#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { COMPONENT_KINDS, CONTACT_OPERATIONS, SUBSTITUTION_TYPES, deriveCoverage, evidenceMatches, validateComponentGraph } from "./lib/v26-derived-annotations.mjs";

const sourcePath = path.resolve("docs/calibration/v2.6/development/v2.5-target-contact-disputes.json");
const examplesPath = path.resolve("docs/calibration/v2.6/development/target-contact-examples.json");
function assert(condition, message) { if (!condition) throw new Error(message); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function exactKeys(value, expected, label) { assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be object`); assert(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort()), `${label} keys differ`); }
const [source, examples, schema] = await Promise.all([sourcePath, examplesPath, path.resolve("docs/calibration/v2.6/target-contact-development-schema.json")].map((file) => readFile(file, "utf8")));
JSON.parse(schema); const raw = JSON.parse(source); const artifact = JSON.parse(examples);
exactKeys(artifact, ["schemaVersion", "workflowVersion", "rubricVersion", "sourceGateId", "heldOutEligible", "retiredDebates", "cases", "audit"], "artifact");
assert(artifact.schemaVersion === "2.6-target-contact-development" && artifact.workflowVersion === "Slugfester Reassessment Workflow v2.6" && artifact.rubricVersion === "Slugfester Reassessment Rubric v2.6" && artifact.sourceGateId === raw.sourceGateId && artifact.heldOutEligible === false, "development identity mismatch");
assert(JSON.stringify(artifact.retiredDebates) === JSON.stringify(raw.retiredDebates) && artifact.cases.length === 8, "retired set/case count mismatch");
const rawById = new Map(raw.cases.map((item) => [item.caseId, item])); const seen = new Set();
let graphErrors = 0; let operationEvidenceErrors = 0; let substitutionEvidenceErrors = 0; let derivationErrors = 0;
for (const [index, item] of artifact.cases.entries()) {
  const label = `cases[${index}]`; exactKeys(item, ["caseId", "debateId", "debateNumber", "moveId", "speaker", "sourceSpan", "sourceExcerpt", "sourceExcerptSha256", "provenance", "v25Disagreements", "targetPacket", "finalCoverage", "rationale"], label); assert(!seen.has(item.caseId), `${label} duplicate`); seen.add(item.caseId);
  const original = rawById.get(item.caseId); assert(original && item.debateId === original.debateId && item.debateNumber === original.debateNumber && item.moveId === original.moveId && item.speaker === original.speaker && item.sourceExcerpt === original.sourceExcerpt && item.sourceExcerptSha256 === sha256(item.sourceExcerpt), `${label} source mismatch`);
  assert(JSON.stringify(item.provenance) === JSON.stringify(original.provenance) && JSON.stringify(item.v25Disagreements) === JSON.stringify(original.disagreements), `${label} provenance/disagreement mismatch`);
  for (const [field, fileField] of [["inventorySha256", "inventoryPath"], ["passASha256", "passAPath"], ["passBSha256", "passBPath"], ["lockSha256", "lockPath"]]) assert(item.provenance[field] === sha256(await readFile(path.resolve(item.provenance[fileField]), "utf8")), `${label} ${field} mismatch`);
  const target = item.targetPacket; exactKeys(target, ["id", "targetSpeaker", "sourceSpan", "sourceExcerpt", "claim", "targetRelationToMove", "interveningOpponentClaim", "exceptionRationale", "indispensableComponents"], `${label}.targetPacket`); assert(target.id === original.targetPacketV25.id && target.targetSpeaker === original.targetPacketV25.targetSpeaker && target.sourceExcerpt === original.targetPacketV25.sourceExcerpt && target.claim === original.targetPacketV25.claim, `${label} target identity mismatch`);
  if (target.targetRelationToMove === "immediate-opponent-claim") assert(target.interveningOpponentClaim === false && target.exceptionRationale === null, `${label} immediate target exception invalid`); else assert(target.targetRelationToMove === "earlier-load-bearing-claim" && target.interveningOpponentClaim === true && target.exceptionRationale?.trim().length >= 40, `${label} earlier target exception invalid`);
  for (const component of target.indispensableComponents) { exactKeys(component, ["id", "text", "kind", "dependsOn"], `${label}.component`); assert(COMPONENT_KINDS.includes(component.kind), `${label} component kind invalid`); }
  const errors = validateComponentGraph(target.indispensableComponents); graphErrors += errors.length; assert(errors.length === 0, `${label} graph errors: ${errors.join("; ")}`);
  const coverage = item.finalCoverage; exactKeys(coverage, ["targetRelation", "substitutionType", "substitutionEvidence", "componentOperations", "relevantContraryMaterial", "contraryEvidence", "derivedTargetCoverage"], `${label}.finalCoverage`);
  if (coverage.targetRelation === "substituted") {
    assert(SUBSTITUTION_TYPES.includes(coverage.substitutionType) && coverage.componentOperations.length === 0 && coverage.relevantContraryMaterial === false && coverage.contraryEvidence === null, `${label} substituted applicability invalid`);
    if (!evidenceMatches(item.sourceExcerpt, coverage.substitutionEvidence)) substitutionEvidenceErrors += 1;
  } else {
    assert(coverage.targetRelation === "preserved" && coverage.substitutionType === null && coverage.substitutionEvidence === null, `${label} preserved relation invalid`);
    const expectedIds = target.indispensableComponents.map((component) => component.id).sort(); const actualIds = coverage.componentOperations.map((operation) => operation.componentId).sort(); assert(JSON.stringify(expectedIds) === JSON.stringify(actualIds), `${label} operation component set mismatch`);
    const used = new Set(); for (const operation of coverage.componentOperations) { exactKeys(operation, ["componentId", "operation", "evidence"], `${label}.operation`); assert(!used.has(operation.componentId), `${label} duplicate operation`); used.add(operation.componentId); assert(operation.operation === null || CONTACT_OPERATIONS.includes(operation.operation), `${label} invalid operation`); assert((operation.operation === null) === (operation.evidence === null), `${label} operation evidence consistency`); if (!evidenceMatches(item.sourceExcerpt, operation.evidence)) operationEvidenceErrors += 1; }
    const anyContact = coverage.componentOperations.some((operation) => operation.operation !== null); assert(!anyContact || coverage.relevantContraryMaterial === false, `${label} contrary material with contact`); assert((coverage.relevantContraryMaterial === false) === (coverage.contraryEvidence === null), `${label} contrary evidence consistency`); if (!evidenceMatches(item.sourceExcerpt, coverage.contraryEvidence)) operationEvidenceErrors += 1;
  }
  if (deriveCoverage({ interactionMode: "responsive" }, coverage) !== coverage.derivedTargetCoverage) derivationErrors += 1;
  assert(item.rationale.trim().length >= 60, `${label} rationale too short`);
}
assert(seen.size === rawById.size, "development cases missing");
const expectedAudit = { caseCount: 8, componentContactDisagreementCount: 10, coverageDisagreementCount: 6, targetRelationDisagreementCount: 3, operationEvidenceErrors, substitutionEvidenceErrors, graphErrors, derivationErrors, heldOutContamination: 0 };
assert(JSON.stringify(artifact.audit) === JSON.stringify(expectedAudit), `audit mismatch: ${JSON.stringify(expectedAudit)}`); assert(operationEvidenceErrors === 0 && substitutionEvidenceErrors === 0 && graphErrors === 0 && derivationErrors === 0, "development validation failed");
console.log(JSON.stringify({ status: "passed", caseCount: artifact.cases.length, componentContactDisagreementCount: 10, coverageDisagreementCount: 6, targetRelationDisagreementCount: 3, sourceSha256: sha256(source), examplesSha256: sha256(examples) }, null, 2));
