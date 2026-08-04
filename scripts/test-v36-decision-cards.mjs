#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { compoundFields, sameSemantic } from "./lib/v34-conservative-review.mjs";
import {
  V36_RUBRIC, V36_WORKFLOW, assert, sha256, validateBurdenConflictCard, validateClosedSchema,
  validateDiagnosticCard, validateReframeCard, validateSchemaValue, validateTargetCard
} from "./lib/v36-decision-cards.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.6/decision-card-development";
const shouldWrite = process.argv.includes("--write"), syntheticOnly = process.argv.includes("--synthetic-only");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const schemaPaths = {
  target: `${gateRoot}/schemas/target-component-example.schema.json`, diagnostic: `${gateRoot}/schemas/diagnostic.schema.json`,
  reframe: `${gateRoot}/schemas/reframe.schema.json`, burden: `${gateRoot}/schemas/burden-conflict.schema.json`
};
const schemas = Object.fromEntries(await Promise.all(Object.entries(schemaPaths).map(async ([key, file]) => [key, validateClosedSchema(JSON.parse(await read(file)), key)])));
const synthetic = JSON.parse(await read(`${gateRoot}/synthetic-fixtures.json`));
const fixtures = new Map(synthetic.fixtures.map((item) => [item.fixtureId, item]));
let validSyntheticCards = 0;
function validateCard(cardKey, card, challengeCase, burdenPacket = null) {
  if (cardKey === "target") { validateSchemaValue(schemas.target, card, card.caseId); validateTargetCard(card, challengeCase); }
  else if (cardKey === "diagnostic") { validateSchemaValue(schemas.diagnostic, card, card.caseId); validateDiagnosticCard(card, challengeCase); }
  else if (cardKey === "reframe") { validateSchemaValue(schemas.reframe, card, card.caseId); validateReframeCard(card, challengeCase); }
  else { validateSchemaValue(schemas.burden, card, card.caseId); validateBurdenConflictCard(card, { challengeCase, fieldPath: burdenPacket.fieldPath, candidate1: burdenPacket.candidate1, candidate2: burdenPacket.candidate2 }); }
}
for (const fixture of synthetic.fixtures) {
  for (const [cardKey, card] of Object.entries(fixture.cards)) { validateCard(cardKey, card, fixture.challengeCase); validSyntheticCards += 1; }
  for (const packet of fixture.burdenPackets) { validateCard("burden", packet.card, fixture.challengeCase, packet); validSyntheticCards += 1; }
}
function setPath(value, dottedPath, replacement) {
  const parts = dottedPath.split("."); let cursor = value;
  for (const part of parts.slice(0, -1)) cursor = cursor[Number.isInteger(Number(part)) ? Number(part) : part];
  const last = parts.at(-1); cursor[Number.isInteger(Number(last)) ? Number(last) : last] = replacement;
}
let rejectedInvalidMutations = 0;
for (const mutation of synthetic.invalidMutations) {
  const fixture = fixtures.get(mutation.baseFixtureId); let card, burdenPacket = null, validatorKey = mutation.cardKey;
  if (fixture.cards[mutation.cardKey]) card = structuredClone(fixture.cards[mutation.cardKey]);
  else { burdenPacket = fixture.burdenPackets.find((item) => item.cardKey === mutation.cardKey); card = structuredClone(burdenPacket.card); validatorKey = "burden"; }
  for (const change of mutation.changes) setPath(card, change.path, change.value);
  let message = null;
  try { validateCard(validatorKey, card, fixture.challengeCase, burdenPacket); } catch (error) { message = error.message; }
  assert(message?.includes(mutation.expectedError), `${mutation.fixtureId}: expected ${mutation.expectedError}, received ${message ?? "acceptance"}`);
  rejectedInvalidMutations += 1;
}
if (syntheticOnly) {
  console.log(JSON.stringify({ status: "passed", closedSchemas: Object.keys(schemas).length, validSyntheticCards, rejectedInvalidMutations }, null, 2));
  process.exit(0);
}

const manifestText = await read(`${gateRoot}/gate-manifest.json`), manifest = JSON.parse(manifestText);
assert(manifest.workflowVersion === V36_WORKFLOW && manifest.rubricVersion === V36_RUBRIC, "manifest identity invalid");
const retiredText = await read(manifest.outputs.retiredFixtures), retired = JSON.parse(retiredText);
assert(retired.sources.manifestSha256 === sha256(manifestText), "retired fixture provenance invalid");
let retiredFamilyCards = 0, retiredBurdenCards = 0, semanticAssertions = 0, semanticMatches = 0;
for (const debate of manifest.sample.debates) {
  const artifactDebate = retired.debates.find((item) => item.debateId === debate.debateId);
  const input = JSON.parse(await read(debate.sources.input.path)), gold = JSON.parse(await read(debate.sources.gold.path));
  const goldById = new Map(gold.annotations.map((item) => [item.caseId, item])), challengeById = new Map(input.cases.map((item) => [item.caseId, item]));
  for (const fixture of artifactDebate.cases) {
    const challengeCase = challengeById.get(fixture.caseId), expected = goldById.get(fixture.caseId);
    validateSchemaValue(schemas.target, fixture.targetCard, `${fixture.caseId}.target`);
    const target = validateTargetCard(fixture.targetCard, challengeCase).annotation;
    for (const [actual, wanted] of [[target.originalTargetContact, expected.originalTargetContact], [target.connectedExample, expected.connectedExample], [target.scopeRelation, expected.scopeRelation], [target.relevantContraryMaterial, expected.relevantContraryMaterial]]) { semanticAssertions += 1; if (actual === wanted) semanticMatches += 1; }
    for (let index = 0; index < target.componentContacts.length; index += 1) { semanticAssertions += 1; if (target.componentContacts[index].contacted === expected.componentContacts[index].contacted) semanticMatches += 1; }

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
const semanticMatchRate = semanticMatches / semanticAssertions;
const thresholds = manifest.thresholds;
const gates = {
  closedSchemaCount: Object.keys(schemas).length === thresholds.closedSchemaCount,
  validSyntheticCardCount: validSyntheticCards === thresholds.validSyntheticCardCount,
  rejectedInvalidMutationCount: rejectedInvalidMutations === thresholds.rejectedInvalidMutationCount,
  retiredFamilyCardCount: retiredFamilyCards === thresholds.retiredFamilyCardCount,
  retiredBurdenConflictCardCount: retiredBurdenCards === thresholds.retiredBurdenConflictCardCount,
  retiredSemanticMatchRate: semanticMatchRate === thresholds.retiredSemanticMatchRate,
  discretionaryRepairs: 0 <= thresholds.discretionaryRepairsMaximum,
  fallbackCases: 0 <= thresholds.fallbackCasesMaximum,
  modelContexts: 0 <= thresholds.modelContextsMaximum,
  scoringFields: 0 <= thresholds.scoringFieldsMaximum
};
const passed = Object.values(gates).every(Boolean);
const analysis = {
  schemaVersion: "3.6-decision-card-fixture-analysis", analyzedAt: manifest.frozenAt,
  status: passed ? "fixture-gate-pass" : "fixture-gate-fail",
  warning: "Retired expected cards are gold-derived validator fixtures, not independent model predictions or evidence of model accuracy.",
  sources: { manifestSha256: sha256(manifestText), retiredFixturesSha256: sha256(retiredText) },
  results: { closedSchemaCount: Object.keys(schemas).length, validSyntheticCards, rejectedInvalidMutations, retiredFamilyCards, retiredBurdenCards, semanticAssertions, semanticMatches, semanticMatchRate, modelContextsExecuted: 0, meteredApiCostUsd: 0 },
  gates, passed,
  decision: { remoteSchemaSmokeTestPreregistrationAuthorized: passed, modelBatchAuthorized: false, heldOutAccessAuthorized: false, numericalScoringAuthorized: false, productionMutationAuthorized: false }
};
const outputText = `${JSON.stringify(analysis, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, manifest.outputs.fixtureAnalysis), outputText);
else assert(await read(manifest.outputs.fixtureAnalysis) === outputText, "fixture analysis is stale or nondeterministic");
console.log(outputText);
