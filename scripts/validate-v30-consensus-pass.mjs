#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  V30_MODEL, V30_PASS_INPUTS, V30_RUBRIC, V30_WORKFLOW, assert, equal, exactKeys,
  passNonDefaultCounts, sha256, validateAnnotation
} from "./lib/v30-consensus.mjs";

const passArgument = process.argv[2];
const inputArgument = process.argv[3];
if (!passArgument || !inputArgument) throw new Error("Usage: node scripts/validate-v30-consensus-pass.mjs <pass.json> <input.json>");
const root = process.cwd();
const gateRoot = "docs/calibration/v3.0/retired-three-debate-test";
const workflowPath = "docs/assessment-workflow-v3.0.md";
const rubricPath = "docs/reassessment-rubric-v3.0.md";
const manualPath = `${gateRoot}/annotation-manual.md`;
const schemaPath = `${gateRoot}/consensus-pass-schema.json`;
const read = (file) => readFile(path.resolve(root, file), "utf8");
const [passText, inputText, workflowText, rubricText, manualText, schemaText] = await Promise.all([
  read(passArgument), read(inputArgument), read(workflowPath), read(rubricPath), read(manualPath), read(schemaPath)
]);
const pass = JSON.parse(passText);
const input = JSON.parse(inputText);
JSON.parse(schemaText);
const containsScoreKey = (value) => {
  if (!value || typeof value !== "object") return false;
  if (Object.keys(value).some((key) => /^(score|scores|moveScore|sectionScore|overall)$/i.test(key))) return true;
  return Object.values(value).some(containsScoreKey);
};
exactKeys(pass, ["schemaVersion", "workflowVersion", "rubricVersion", "pass", "model", "calibrationOnly", "completedAt", "isolation", "source", "annotations", "audit"], "pass");
assert(pass.schemaVersion === "3.0-consensus-pass" && pass.workflowVersion === V30_WORKFLOW && pass.rubricVersion === V30_RUBRIC, "pass version mismatch");
assert(["A", "B"].includes(pass.pass) && pass.model === V30_MODEL && pass.calibrationOnly === true && !Number.isNaN(Date.parse(pass.completedAt)), "pass identity invalid");
exactKeys(pass.isolation, ["method", "allowedInputs", "goldUnavailable", "otherPassUnavailable", "legacyMaterialUnavailable", "numericalScoresUnavailable", "statement"], "pass.isolation");
assert(pass.isolation.method === "fresh-ephemeral-v3.0-consensus-pass", "pass isolation method invalid");
assert(equal([...pass.isolation.allowedInputs].sort(), [...V30_PASS_INPUTS].sort()), "pass input allowlist invalid");
assert(pass.isolation.goldUnavailable === true && pass.isolation.otherPassUnavailable === true && pass.isolation.legacyMaterialUnavailable === true && pass.isolation.numericalScoresUnavailable === true, "pass isolation flags invalid");
assert(pass.isolation.statement.trim().length >= 50, "pass isolation statement too short");
exactKeys(pass.source, ["inputPath", "inputSha256", "workflowSha256", "rubricSha256", "manualSha256", "schemaSha256"], "pass.source");
assert(pass.source.inputPath === "input.json" && pass.source.inputSha256 === sha256(inputText), "pass input source mismatch");
assert(pass.source.workflowSha256 === sha256(workflowText) && pass.source.rubricSha256 === sha256(rubricText) && pass.source.manualSha256 === sha256(manualText) && pass.source.schemaSha256 === sha256(schemaText), "pass source hash mismatch");
assert(input.debateId && pass.annotations.length === input.caseCount, "pass annotation count mismatch");
const caseById = new Map(input.cases.map((item) => [item.caseId, item]));
const seen = new Set();
for (const [index, annotation] of pass.annotations.entries()) {
  assert(!seen.has(annotation.caseId), `annotations[${index}]: duplicate case`);
  seen.add(annotation.caseId);
  const challengeCase = caseById.get(annotation.caseId);
  assert(challengeCase, `annotations[${index}]: unknown case`);
  validateAnnotation(annotation, challengeCase, `annotations[${index}]`);
}
assert(seen.size === input.caseCount && !containsScoreKey(pass), "pass coverage or score exclusion failed");
const counts = passNonDefaultCounts(pass.annotations);
exactKeys(pass.audit, ["caseCount", "allCasesAnnotatedOnce", "componentSetErrors", "evidenceErrors", "derivedFieldsPresent", "scoreFieldsPresent", "nonDefaultCounts"], "pass.audit");
assert(pass.audit.caseCount === input.caseCount && pass.audit.allCasesAnnotatedOnce === true && pass.audit.componentSetErrors === 0 && pass.audit.evidenceErrors === 0 && pass.audit.derivedFieldsPresent === false && pass.audit.scoreFieldsPresent === false, "pass audit flags invalid");
assert(equal(pass.audit.nonDefaultCounts, counts), "pass non-default count mismatch");
console.log(JSON.stringify({ status: "passed", pass: pass.pass, debateId: input.debateId, caseCount: input.caseCount, passSha256: sha256(passText), nonDefaultCounts: counts }, null, 2));

