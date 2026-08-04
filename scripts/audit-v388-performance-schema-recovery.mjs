#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_PERFORMANCE_ROOT, assertV388 } from "./lib/v388-performance-judgment.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const lockedCommit = "50fe699c";
const schemaPath = `${V388_PERFORMANCE_ROOT}/performance-judgment-schema.json`;
const oldBytes = execFileSync("git", ["show", `${lockedCommit}:${schemaPath}`], { cwd: root });
const newBytes = await readFile(path.resolve(root, schemaPath));
const oldSchema = JSON.parse(oldBytes.toString("utf8"));
const newSchema = JSON.parse(newBytes.toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const additions = [];

function compare(oldValue, newValue, pointer = "") {
  if (Array.isArray(oldValue) || Array.isArray(newValue)) {
    assertV388(Array.isArray(oldValue) && Array.isArray(newValue) && oldValue.length === newValue.length, `${pointer}: schema array changed`);
    for (let index = 0; index < oldValue.length; index += 1) compare(oldValue[index], newValue[index], `${pointer}/${index}`);
    return;
  }
  if (oldValue === null || newValue === null || typeof oldValue !== "object" || typeof newValue !== "object") {
    assertV388(JSON.stringify(oldValue) === JSON.stringify(newValue), `${pointer}: existing schema value changed`);
    return;
  }
  for (const key of Object.keys(oldValue)) {
    assertV388(Object.hasOwn(newValue, key), `${pointer}/${key}: schema key removed`);
    compare(oldValue[key], newValue[key], `${pointer}/${key}`);
  }
  for (const key of Object.keys(newValue)) {
    if (Object.hasOwn(oldValue, key)) continue;
    assertV388(key === "type" && ["string", "boolean"].includes(newValue[key]), `${pointer}/${key}: unexpected schema addition`);
    const node = newValue;
    assertV388(Object.hasOwn(node, "const") || Array.isArray(node.enum), `${pointer}/${key}: added type does not constrain const/enum node`);
    const values = Object.hasOwn(node, "const") ? [node.const] : node.enum;
    assertV388(values.every((value) => typeof value === newValue[key]), `${pointer}/${key}: added type conflicts with existing values`);
    additions.push({ path: `${pointer}/${key}`, value: newValue[key], existingConstraint: Object.hasOwn(node, "const") ? "const" : "enum" });
  }
}
compare(oldSchema, newSchema);
assertV388(additions.length > 0, "schema recovery added no compatibility types");
const failure = JSON.parse(await readFile(path.resolve(root, `${V388_PERFORMANCE_ROOT}/initial-model-execution.json`), "utf8"));
assertV388(failure.validOutputContexts === 0 && failure.moveJudgmentsAcrossPasses === 0 && failure.totalAttempts === 6 && failure.totalRetries === 0 && failure.results.every((item) => item.status === "transport-failed" && item.outputWritten === false), "initial failure record does not prove pre-inference rejection");
const audit = {
  schemaVersion: "3.8.8-performance-schema-compatibility-recovery-audit",
  status: "passed-semantic-preserving-compatibility-repair",
  lockedExecutionCommit: lockedCommit,
  defect: "The structured-output endpoint requires an explicit scalar type on const and enum schema nodes.",
  initialExecution: { contextsAttempted: 6, validContexts: 0, moveJudgmentsGenerated: 0, outputFilesWritten: 0, retries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  repair: { oldSchemaSha256: sha256(oldBytes), newSchemaSha256: sha256(newBytes), additions, additionsOnly: true, addedKeysOnlyType: true, existingValuesChanged: 0, removedKeys: 0, semanticJudgmentContractChanged: false },
  authorization: { automaticRetry: false, separatelyLockedRecoveryRequired: true, scoreDerivation: false, assessmentProse: false }
};
if (shouldWrite) {
  await mkdir(path.resolve(root, V388_PERFORMANCE_ROOT), { recursive: true });
  await writeFile(path.resolve(root, `${V388_PERFORMANCE_ROOT}/schema-compatibility-recovery-audit.json`), `${JSON.stringify(audit, null, 2)}\n`);
}
console.log(JSON.stringify({ status: "passed", schemaTypeAdditions: additions.length, existingValuesChanged: 0, semanticJudgmentContractChanged: false, initialValidContexts: 0, initialMoveJudgments: 0, separatelyLockedRecoveryRequired: true }, null, 2));
