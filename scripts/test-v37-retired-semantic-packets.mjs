#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expectedCard, loadV37Sources, semanticAssertions, validateV37Batch, V37_FAMILIES, V37_GATE_ROOT } from "./lib/v37-retired-semantic.mjs";
import { sha256 } from "./lib/v36-decision-cards.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), read = (file) => readFile(path.resolve(root, file), "utf8");
const { fixtures } = await loadV37Sources(root), families = [];
let cardCount = 0, semanticAssertionCount = 0;
for (const family of V37_FAMILIES) {
  const packetText = await read(`${V37_GATE_ROOT}/packets/${family}.json`), packet = JSON.parse(packetText);
  const schemaText = await read(`${V37_GATE_ROOT}/schemas/${family}.schema.json`), schema = JSON.parse(schemaText);
  const cards = packet.cases.map((item) => expectedCard(family, fixtures.get(item.caseId), item));
  const batch = { schemaVersion: "3.7-family-card-batch", family, cards };
  await validateV37Batch(root, batch, packet, schema, family);
  const assertions = cards.reduce((sum, card) => sum + semanticAssertions(family, card).length, 0);
  cardCount += cards.length; semanticAssertionCount += assertions;
  families.push({ family, cardCount: cards.length, semanticAssertionCount: assertions, packetSha256: sha256(packetText), schemaSha256: sha256(schemaText), expectedBatchLocallyValid: true });
}
const result = {
  schemaVersion: "3.7-local-retired-semantic-fixture", builtAt: "2026-08-04T04:10:00.000Z",
  passed: cardCount === 11 && semanticAssertionCount === 45, modelContextsExecuted: 0, cardCount, semanticAssertionCount, families
};
const outputText = `${JSON.stringify(result, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, `${V37_GATE_ROOT}/dry-fixture.json`), outputText);
console.log(outputText);
