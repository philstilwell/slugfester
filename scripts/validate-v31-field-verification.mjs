#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  V31_FAMILIES, V31_MODEL, V31_RUBRIC, V31_VERIFY_INPUTS, V31_WORKFLOW, assert, equal,
  parseCanonicalJson, sha256, validateCompoundValue
} from "./lib/v31-verification.mjs";
import { exactKeys } from "./lib/v30-consensus.mjs";

const [verificationArgument, packetArgument] = process.argv.slice(2);
if (!verificationArgument || !packetArgument) throw new Error("Usage: node scripts/validate-v31-field-verification.mjs <verification.json> <field-packet.json>");
const root = process.cwd();
const gateRoot = "docs/calibration/v3.1/retired-three-debate-test";
const read = (file) => readFile(path.resolve(root, file), "utf8");
const [verificationText, packetText, workflowText, rubricText, manualText, schemaText] = await Promise.all([
  read(verificationArgument), read(packetArgument), read("docs/assessment-workflow-v3.1.md"), read("docs/reassessment-rubric-v3.1.md"),
  read(`${gateRoot}/verification-manual.md`), read(`${gateRoot}/field-verification-schema.json`)
]);
const verification = JSON.parse(verificationText);
const packet = JSON.parse(packetText);
JSON.parse(schemaText);
exactKeys(verification, ["schemaVersion", "workflowVersion", "rubricVersion", "model", "debateId", "debateNumber", "family", "completedAt", "isolation", "source", "judgments", "audit"], "verification");
assert(verification.schemaVersion === "3.1-field-family-verification" && verification.workflowVersion === V31_WORKFLOW && verification.rubricVersion === V31_RUBRIC && verification.model === V31_MODEL, "verification version mismatch");
assert(verification.debateId === packet.debateId && verification.debateNumber === packet.debateNumber && V31_FAMILIES.includes(verification.family) && verification.family === packet.family, "verification identity invalid");
assert(!Number.isNaN(Date.parse(verification.completedAt)), "verification completedAt invalid");
assert(verification.isolation.method === "fresh-ephemeral-v3.1-field-family-verification" && equal([...verification.isolation.allowedInputs].sort(), [...V31_VERIFY_INPUTS].sort()), "verification isolation invalid");
for (const key of ["goldUnavailable", "rawPassesUnavailable", "agreementStatusUnavailable", "otherFamiliesUnavailable", "legacyMaterialUnavailable", "numericalScoresUnavailable"]) assert(verification.isolation[key] === true, `verification.isolation.${key} invalid`);
assert(verification.isolation.statement.trim().length >= 50, "verification isolation statement too short");
assert(verification.source.fieldPacketPath === "field-packet.json" && verification.source.fieldPacketSha256 === sha256(packetText), "verification packet hash mismatch");
assert(verification.source.workflowSha256 === sha256(workflowText) && verification.source.rubricSha256 === sha256(rubricText) && verification.source.manualSha256 === sha256(manualText) && verification.source.schemaSha256 === sha256(schemaText), "verification source hash mismatch");
const expected = packet.cases.flatMap((item) => item.fields.map((field) => [`${item.caseId}::${field.fieldPath}`, { challengeCase: item.lockedCase, fieldPath: field.fieldPath }]));
const expectedMap = new Map(expected);
const seen = new Set();
for (const [index, judgment] of verification.judgments.entries()) {
  exactKeys(judgment, ["caseId", "fieldPath", "resolvedJson", "rationale"], `judgments[${index}]`);
  const key = `${judgment.caseId}::${judgment.fieldPath}`;
  assert(expectedMap.has(key) && !seen.has(key), `judgments[${index}]: unexpected or duplicate field`);
  seen.add(key);
  const expectedField = expectedMap.get(key);
  validateCompoundValue(judgment.fieldPath, parseCanonicalJson(judgment.resolvedJson, `judgments[${index}].resolvedJson`), expectedField.challengeCase, `judgments[${index}]`);
  assert(typeof judgment.rationale === "string" && judgment.rationale.trim().length >= 60, `judgments[${index}]: rationale too short`);
}
assert(seen.size === expectedMap.size && verification.judgments.length === packet.fieldCount, "verification field coverage mismatch");
assert(verification.audit.judgmentCount === packet.fieldCount && verification.audit.allFieldsJudgedOnce === true && verification.audit.unexpectedFieldsAdded === 0 && verification.audit.scoresPresent === false, "verification audit invalid");
console.log(JSON.stringify({ status: "passed", debateId: packet.debateId, family: packet.family, fieldCount: packet.fieldCount, verificationSha256: sha256(verificationText) }, null, 2));
