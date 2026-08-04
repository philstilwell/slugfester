#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  assert, validateBurdenConflictCard, validateClosedSchema, validateDiagnosticCard,
  validateReframeCard, validateSchemaValue, validateTargetCard
} from "./lib/v36-decision-cards.mjs";

const [outputPath, packetPath, family] = process.argv.slice(2);
assert(outputPath && packetPath && ["target", "diagnostic", "reframe", "burden"].includes(family), "usage: validate-v362-smoke-output <output> <packet> <family>");
const root = process.cwd(), schemaRoot = "docs/calibration/v3.6/decision-card-development";
const read = (file) => readFile(path.resolve(root, file), "utf8");
const schemaPaths = { target: `${schemaRoot}/schemas/target-component-example.schema.json`, diagnostic: `${schemaRoot}/schemas/diagnostic.schema.json`, reframe: `${schemaRoot}/schemas/reframe.schema.json`, burden: `${schemaRoot}/schemas/burden-conflict.schema.json` };
const output = JSON.parse(await read(outputPath)), packet = JSON.parse(await read(packetPath));
const schema = validateClosedSchema(JSON.parse(await read(schemaPaths[family])), family);
validateSchemaValue(schema, output, `${family}.output`);
function containsScoreField(value) {
  if (!value || typeof value !== "object") return false;
  if (Object.keys(value).some((key) => /^(score|scores|moveScore|sectionScore|overall|winner)$/i.test(key))) return true;
  return Object.values(value).some(containsScoreField);
}
assert(!containsScoreField(output), `${family}: prohibited score field present`);
const synthetic = JSON.parse(await read(`${schemaRoot}/synthetic-fixtures.json`));
const fixture = synthetic.fixtures.find((item) => item.challengeCase.caseId === packet.case.caseId);
assert(fixture && fixture.challengeCase.sourceExcerpt === packet.case.sourceExcerpt, `${family}: packet does not match frozen synthetic case`);
let normalized;
if (family === "target") normalized = validateTargetCard(output, fixture.challengeCase);
else if (family === "diagnostic") normalized = validateDiagnosticCard(output, fixture.challengeCase);
else if (family === "reframe") normalized = validateReframeCard(output, fixture.challengeCase);
else {
  const burdenPacket = fixture.burdenPackets.find((item) => item.fieldPath === packet.fieldPath);
  normalized = validateBurdenConflictCard(output, { challengeCase: fixture.challengeCase, fieldPath: burdenPacket.fieldPath, candidate1: burdenPacket.candidate1, candidate2: burdenPacket.candidate2 });
}
console.log(JSON.stringify({ status: "passed", family, caseId: output.caseId, semanticValidation: true, unresolved: normalized.unresolved ?? false }, null, 2));
