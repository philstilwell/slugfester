#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert, validateAuditOutput, V371_DEBATES, V371_INITIAL_PASSES, V371_ROOT } from "./lib/v371-gold-audit.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const contexts = [];
let decisionCount = 0;
for (const reviewerPass of V371_INITIAL_PASSES) for (const debateNumber of V371_DEBATES) {
  const packetPath = `${V371_ROOT}/packets/${reviewerPass}/debate-${debateNumber}.json`;
  const schemaPath = `${V371_ROOT}/schemas/${reviewerPass}/debate-${debateNumber}.schema.json`;
  const [packet, schema] = await Promise.all([readJson(packetPath), readJson(schemaPath)]);
  const fixture = {
    schemaVersion: "3.7.1-audit-output",
    debateNumber,
    reviewerPass,
    decisions: packet.decisions.map((decision) => ({
      auditId: decision.auditId,
      optionId: decision.candidates[0].optionId,
      evidenceText: decision.sourceExcerpt,
      rationale: "The selected anonymous option best satisfies the positive field rule; the default and competing exclusions do not fit the exact response language."
    }))
  };
  validateAuditOutput(fixture, packet, schema);
  contexts.push({ reviewerPass, debateNumber, decisionCount: fixture.decisions.length });
  decisionCount += fixture.decisions.length;
}
assert(decisionCount === 28, "two-pass dry decision count must be 28");
const result = { schemaVersion: "3.7.1-audit-dry-fixture", passed: true, contextCount: contexts.length, distinctDisputedFieldCount: decisionCount / 2, modelContextsExecuted: 0, contexts };
const outputText = `${JSON.stringify(result, null, 2)}\n`;
if (shouldWrite) { await mkdir(path.resolve(root, V371_ROOT), { recursive: true }); await writeFile(path.resolve(root, V371_ROOT, "dry-fixture.json"), outputText); }
console.log(outputText);
