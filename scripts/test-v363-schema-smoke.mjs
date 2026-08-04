#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assert, sha256, validateBurdenConflictCard, validateClosedSchema, validateDiagnosticCard,
  validateReframeCard, validateSchemaValue, validateTargetCard
} from "./lib/v36-decision-cards.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.6.3/schema-smoke-correction", v36 = "docs/calibration/v3.6/decision-card-development";
const shouldWrite = process.argv.includes("--write"), read = (file) => readFile(path.resolve(root, file), "utf8");
const synthetic = JSON.parse(await read(`${v36}/synthetic-fixtures.json`));
const fixture1 = synthetic.fixtures.find((item) => item.fixtureId === "target-diagnostic-reframe-positive");
const fixture4 = synthetic.fixtures.find((item) => item.fixtureId === "candidate-bound-burden-conflicts");
const definitions = {
  target: { schema: `${gateRoot}/schemas/target-component-example.schema.json`, card: fixture1.cards.target },
  diagnostic: { schema: `${v36}/schemas/diagnostic.schema.json`, card: fixture1.cards.diagnostic },
  reframe: { schema: `${v36}/schemas/reframe.schema.json`, card: fixture1.cards.reframe },
  burden: { schema: `${v36}/schemas/burden-conflict.schema.json`, card: fixture4.burdenPackets.find((item) => item.cardKey === "burdenAdjustment").card }
};
const cards = [];
for (const [family, definition] of Object.entries(definitions)) {
  const schemaText = await read(definition.schema), schema = validateClosedSchema(JSON.parse(schemaText), family);
  validateSchemaValue(schema, definition.card, family);
  if (family === "target") validateTargetCard(definition.card, fixture1.challengeCase);
  else if (family === "diagnostic") validateDiagnosticCard(definition.card, fixture1.challengeCase);
  else if (family === "reframe") validateReframeCard(definition.card, fixture1.challengeCase);
  else {
    const packet = fixture4.burdenPackets.find((item) => item.cardKey === "burdenAdjustment");
    validateBurdenConflictCard(definition.card, { challengeCase: fixture4.challengeCase, fieldPath: packet.fieldPath, candidate1: packet.candidate1, candidate2: packet.candidate2 });
  }
  cards.push({ family, schemaSha256: sha256(schemaText), expectedCardLocallyValid: true });
}
const invalidTarget = structuredClone(fixture1.cards.target);
invalidTarget.components[0].licenseText = "only";
let targetRegressionRejected = false;
try { validateSchemaValue(JSON.parse(await read(definitions.target.schema)), invalidTarget, "target-regression"); } catch { targetRegressionRejected = true; }
const invalidDiagnostic = structuredClone(fixture1.cards.diagnostic);
invalidDiagnostic.consequence.linkCueText = "so";
let diagnosticRegressionRejected = false;
try { validateDiagnosticCard(invalidDiagnostic, fixture1.challengeCase); } catch { diagnosticRegressionRejected = true; }
assert(targetRegressionRejected && diagnosticRegressionRejected, "v3.6.2 regressions were not rejected");
const result = {
  schemaVersion: "3.6.3-local-correction-fixture", builtAt: "2026-08-04T03:40:00.000Z", passed: cards.length === 4 && targetRegressionRejected && diagnosticRegressionRejected,
  modelContextsExecuted: 0, regressionCasesRejected: 2, cards
};
const outputText = `${JSON.stringify(result, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, `${gateRoot}/dry-fixture.json`), outputText);
console.log(outputText);
