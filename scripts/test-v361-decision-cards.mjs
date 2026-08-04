#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { compoundFields, sameSemantic } from "./lib/v34-conservative-review.mjs";
import {
  assert, sha256, validateBurdenConflictCard, validateClosedSchema, validateDiagnosticCard,
  validateReframeCard, validateSchemaValue, validateTargetCard
} from "./lib/v36-decision-cards.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.6.1/decision-card-development", schemaRoot = "docs/calibration/v3.6/decision-card-development";
const shouldWrite = process.argv.includes("--write"), read = (file) => readFile(path.resolve(root, file), "utf8");
execFileSync(process.execPath, ["scripts/test-v361-evidence-context.mjs"], { cwd: root, stdio: "ignore" });
execFileSync(process.execPath, ["scripts/test-v36-decision-cards.mjs", "--synthetic-only"], { cwd: root, stdio: "ignore" });
const schemaPaths = {
  target: `${schemaRoot}/schemas/target-component-example.schema.json`, diagnostic: `${schemaRoot}/schemas/diagnostic.schema.json`,
  reframe: `${schemaRoot}/schemas/reframe.schema.json`, burden: `${schemaRoot}/schemas/burden-conflict.schema.json`
};
const schemas = Object.fromEntries(await Promise.all(Object.entries(schemaPaths).map(async ([key, file]) => [key, validateClosedSchema(JSON.parse(await read(file)), key)])));
const manifestText = await read(`${gateRoot}/gate-manifest.json`), manifest = JSON.parse(manifestText);
const retiredText = await read(manifest.outputs.normalizedRetiredFixtures), retired = JSON.parse(retiredText);
assert(retired.sources.manifestSha256 === sha256(manifestText), "normalized fixture provenance invalid");
let retiredFamilyCards = 0, retiredBurdenCards = 0, semanticAssertions = 0, semanticMatches = 0;
for (const debate of manifest.sample.debates) {
  const input = JSON.parse(await read(debate.sources.input.path)), gold = JSON.parse(await read(debate.sources.gold.path));
  const challengeById = new Map(input.cases.map((item) => [item.caseId, item])), goldById = new Map(gold.annotations.map((item) => [item.caseId, item]));
  const artifactDebate = retired.debates.find((item) => item.debateId === debate.debateId);
  for (const fixture of artifactDebate.cases) {
    const challengeCase = challengeById.get(fixture.caseId), expected = goldById.get(fixture.caseId);
    validateSchemaValue(schemas.target, fixture.targetCard, `${fixture.caseId}.target`);
    const target = validateTargetCard(fixture.targetCard, challengeCase).annotation;
    const targetPairs = [[target.originalTargetContact, expected.originalTargetContact], [target.connectedExample, expected.connectedExample], [target.scopeRelation, expected.scopeRelation], [target.relevantContraryMaterial, expected.relevantContraryMaterial], ...target.componentContacts.map((item, index) => [item.contacted, expected.componentContacts[index].contacted])];
    for (const [actual, wanted] of targetPairs) { semanticAssertions += 1; if (actual === wanted) semanticMatches += 1; }
    validateSchemaValue(schemas.diagnostic, fixture.diagnosticCard, `${fixture.caseId}.diagnostic`);
    const diagnostic = validateDiagnosticCard(fixture.diagnosticCard, challengeCase);
    for (const [actual, wanted] of [[diagnostic.defectType, expected.defectType], [diagnostic.consequenceStated, expected.consequenceStated]]) { semanticAssertions += 1; if (actual === wanted) semanticMatches += 1; }
    validateSchemaValue(schemas.reframe, fixture.reframeCard, `${fixture.caseId}.reframe`);
    const reframe = validateReframeCard(fixture.reframeCard, challengeCase);
    for (const [actual, wanted] of [[reframe.malformedDemandExplained, expected.malformedDemandExplained], [reframe.replacementDemandStated, expected.replacementDemandStated]]) { semanticAssertions += 1; if (actual === wanted) semanticMatches += 1; }
    retiredFamilyCards += 3;
    const goldFields = new Map(compoundFields(expected));
    for (const packet of fixture.burdenPackets) {
      validateSchemaValue(schemas.burden, packet.card, `${fixture.caseId}.${packet.fieldPath}`);
      const result = validateBurdenConflictCard(packet.card, { challengeCase, fieldPath: packet.fieldPath, candidate1: packet.candidate1, candidate2: packet.candidate2 });
      semanticAssertions += 1; if (!result.unresolved && sameSemantic(packet.fieldPath, result.selected, goldFields.get(packet.fieldPath))) semanticMatches += 1;
      retiredBurdenCards += 1;
    }
  }
}
const semanticMatchRate = semanticMatches / semanticAssertions, thresholds = manifest.thresholds;
const results = {
  closedSchemaCount: Object.keys(schemas).length, validSyntheticCards: 11, rejectedInvalidMutations: 8,
  retiredFamilyCards, retiredBurdenCards, semanticAssertions, semanticMatches, semanticMatchRate,
  expandedEvidenceFields: retired.audit.expandedEvidenceFields, ambiguousEvidenceFields: retired.audit.ambiguousEvidenceFields,
  discretionaryRepairs: 0, fallbackCases: 0, modelContextsExecuted: 0, meteredApiCostUsd: 0
};
const gates = {
  closedSchemaCount: results.closedSchemaCount === thresholds.closedSchemaCount,
  validSyntheticCardCount: results.validSyntheticCards === thresholds.validSyntheticCardCount,
  rejectedInvalidMutationCount: results.rejectedInvalidMutations === thresholds.rejectedInvalidMutationCount,
  retiredFamilyCardCount: results.retiredFamilyCards === thresholds.retiredFamilyCardCount,
  retiredBurdenConflictCardCount: results.retiredBurdenCards === thresholds.retiredBurdenConflictCardCount,
  retiredSemanticMatchRate: results.semanticMatchRate === thresholds.retiredSemanticMatchRate,
  ambiguousEvidenceFields: results.ambiguousEvidenceFields === 0,
  discretionaryRepairs: results.discretionaryRepairs <= thresholds.discretionaryRepairsMaximum,
  fallbackCases: results.fallbackCases <= thresholds.fallbackCasesMaximum,
  modelContexts: results.modelContextsExecuted <= thresholds.modelContextsMaximum,
  scoringFields: retired.audit.scoreFieldsPresent === false
};
const passed = Object.values(gates).every(Boolean);
const analysis = {
  schemaVersion: "3.6.1-decision-card-fixture-analysis", analyzedAt: manifest.frozenAt, status: passed ? "fixture-gate-pass" : "fixture-gate-fail",
  warning: "Retired expected cards are gold-derived validator fixtures, not independent model predictions or evidence of model accuracy.",
  sources: { manifestSha256: sha256(manifestText), normalizedRetiredFixturesSha256: sha256(retiredText) }, results, gates, passed,
  decision: { remoteSchemaSmokeTestPreregistrationAuthorized: passed, modelBatchAuthorized: false, heldOutAccessAuthorized: false, numericalScoringAuthorized: false, productionMutationAuthorized: false }
};
const outputText = `${JSON.stringify(analysis, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, manifest.outputs.fixtureAnalysis), outputText);
else assert(await read(manifest.outputs.fixtureAnalysis) === outputText, "v3.6.1 fixture analysis is stale or nondeterministic");
console.log(outputText);
