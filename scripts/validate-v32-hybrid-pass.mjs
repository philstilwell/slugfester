#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  V32_PASS_INPUTS, V32_PASS_MODELS, V32_RUBRIC, V32_WORKFLOW, assert, equal,
  passNonDefaultCounts, sha256, validateAnnotation
} from "./lib/v32-risk-adjudication.mjs";
import { exactKeys } from "./lib/v30-consensus.mjs";

const [passArgument, inputArgument] = process.argv.slice(2);
if (!passArgument || !inputArgument) throw new Error("Usage: node scripts/validate-v32-hybrid-pass.mjs <pass.json> <input.json>");
const root = process.cwd();
const gateRoot = "docs/calibration/v3.2/retired-three-debate-test";
const read = (file) => readFile(path.resolve(root, file), "utf8");
const [passText, inputText, workflowText, rubricText, manualText, schemaText] = await Promise.all([
  read(passArgument), read(inputArgument), read("docs/assessment-workflow-v3.2.md"), read("docs/reassessment-rubric-v3.2.md"),
  read(`${gateRoot}/annotation-manual.md`), read(`${gateRoot}/hybrid-pass-schema.json`)
]);
const pass = JSON.parse(passText), input = JSON.parse(inputText);
JSON.parse(schemaText);
const containsScoreKey = (value) => {
  if (!value || typeof value !== "object") return false;
  if (Object.keys(value).some((key) => /^(score|scores|moveScore|sectionScore|overall)$/i.test(key))) return true;
  return Object.values(value).some(containsScoreKey);
};
exactKeys(pass, ["schemaVersion", "workflowVersion", "rubricVersion", "pass", "model", "calibrationOnly", "completedAt", "isolation", "source", "annotations", "audit"], "pass");
assert(pass.schemaVersion === "3.2-hybrid-pass" && pass.workflowVersion === V32_WORKFLOW && pass.rubricVersion === V32_RUBRIC, "pass version mismatch");
assert(["A", "B"].includes(pass.pass) && pass.model === V32_PASS_MODELS[pass.pass] && pass.calibrationOnly === true && !Number.isNaN(Date.parse(pass.completedAt)), "pass identity invalid");
assert(pass.isolation.method === "fresh-ephemeral-v3.2-hybrid-pass" && equal([...pass.isolation.allowedInputs].sort(), [...V32_PASS_INPUTS].sort()), "pass isolation invalid");
for (const key of ["goldUnavailable", "otherPassUnavailable", "legacyMaterialUnavailable", "numericalScoresUnavailable"]) assert(pass.isolation[key] === true, `pass.isolation.${key} invalid`);
assert(pass.isolation.statement.trim().length >= 50, "pass isolation statement too short");
assert(pass.source.inputPath === "input.json" && pass.source.inputSha256 === sha256(inputText), "pass input source mismatch");
assert(pass.source.workflowSha256 === sha256(workflowText) && pass.source.rubricSha256 === sha256(rubricText) && pass.source.manualSha256 === sha256(manualText) && pass.source.schemaSha256 === sha256(schemaText), "pass source hash mismatch");
const caseById = new Map(input.cases.map((item) => [item.caseId, item]));
const seen = new Set();
for (const [index, annotation] of pass.annotations.entries()) {
  assert(!seen.has(annotation.caseId) && caseById.has(annotation.caseId), `annotations[${index}]: duplicate or unknown case`);
  seen.add(annotation.caseId);
  validateAnnotation(annotation, caseById.get(annotation.caseId), `annotations[${index}]`);
}
assert(seen.size === input.caseCount && pass.annotations.length === input.caseCount && !containsScoreKey(pass), "pass coverage or score exclusion failed");
const counts = passNonDefaultCounts(pass.annotations);
assert(pass.audit.caseCount === input.caseCount && pass.audit.allCasesAnnotatedOnce === true && pass.audit.componentSetErrors === 0 && pass.audit.evidenceErrors === 0 && pass.audit.derivedFieldsPresent === false && pass.audit.scoreFieldsPresent === false, "pass audit invalid");
assert(equal(pass.audit.nonDefaultCounts, counts), "pass non-default counts mismatch");
console.log(JSON.stringify({ status: "passed", pass: pass.pass, model: pass.model, debateId: input.debateId, caseCount: input.caseCount, passSha256: sha256(passText), nonDefaultCounts: counts }, null, 2));
