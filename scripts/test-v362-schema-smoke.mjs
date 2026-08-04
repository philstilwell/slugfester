#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assert, sha256, validateBurdenConflictCard, validateClosedSchema, validateDiagnosticCard,
  validateReframeCard, validateSchemaValue, validateTargetCard
} from "./lib/v36-decision-cards.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.6.2/schema-smoke", schemaRoot = "docs/calibration/v3.6/decision-card-development";
const shouldWrite = process.argv.includes("--write"), read = (file) => readFile(path.resolve(root, file), "utf8");
const synthetic = JSON.parse(await read(`${schemaRoot}/synthetic-fixtures.json`));
const fixture1 = synthetic.fixtures.find((item) => item.fixtureId === "target-diagnostic-reframe-positive");
const fixture4 = synthetic.fixtures.find((item) => item.fixtureId === "candidate-bound-burden-conflicts");
const definitions = {
  target: { schema: `${schemaRoot}/schemas/target-component-example.schema.json`, packet: `${gateRoot}/packets/target.json`, card: fixture1.cards.target },
  diagnostic: { schema: `${schemaRoot}/schemas/diagnostic.schema.json`, packet: `${gateRoot}/packets/diagnostic.json`, card: fixture1.cards.diagnostic },
  reframe: { schema: `${schemaRoot}/schemas/reframe.schema.json`, packet: `${gateRoot}/packets/reframe.json`, card: fixture1.cards.reframe },
  burden: { schema: `${schemaRoot}/schemas/burden-conflict.schema.json`, packet: `${gateRoot}/packets/burden.json`, card: fixture4.burdenPackets.find((item) => item.cardKey === "burdenAdjustment").card }
};
const cards = [];
for (const [family, definition] of Object.entries(definitions)) {
  const schemaText = await read(definition.schema), packetText = await read(definition.packet);
  const schema = validateClosedSchema(JSON.parse(schemaText), family), packet = JSON.parse(packetText);
  validateSchemaValue(schema, definition.card, family);
  assert(packet.blindness.expectedCardAbsent && packet.blindness.goldAbsent && packet.blindness.scoresAbsent && packet.blindness.legacyMaterialAbsent, `${family}: blindness flags invalid`);
  if (family === "target") validateTargetCard(definition.card, fixture1.challengeCase);
  else if (family === "diagnostic") validateDiagnosticCard(definition.card, fixture1.challengeCase);
  else if (family === "reframe") validateReframeCard(definition.card, fixture1.challengeCase);
  else {
    const burdenPacket = fixture4.burdenPackets.find((item) => item.cardKey === "burdenAdjustment");
    validateBurdenConflictCard(definition.card, { challengeCase: fixture4.challengeCase, fieldPath: burdenPacket.fieldPath, candidate1: burdenPacket.candidate1, candidate2: burdenPacket.candidate2 });
  }
  cards.push({ family, schemaSha256: sha256(schemaText), packetSha256: sha256(packetText), expectedCardLocallyValid: true });
}
const result = { schemaVersion: "3.6.2-local-smoke-fixture", builtAt: "2026-08-04T03:30:00.000Z", passed: cards.length === 4, modelContextsExecuted: 0, cards };
const outputText = `${JSON.stringify(result, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, `${gateRoot}/dry-fixture.json`), outputText);
console.log(outputText);
