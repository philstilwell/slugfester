#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_PERFORMANCE_ROOT, assertV388 } from "./lib/v388-performance-judgment.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const lockedCommit = "87d3f745";
const schemaPath = `${V388_PERFORMANCE_ROOT}/performance-judgment-schema.json`;
const failedExecutionPath = `${V388_PERFORMANCE_ROOT}/schema-recovery/model-execution.json`;
const oldBytes = execFileSync("git", ["show", `${lockedCommit}:${schemaPath}`], { cwd: root });
const newBytes = await readFile(path.resolve(root, schemaPath));
const oldSchema = JSON.parse(oldBytes.toString("utf8"));
const newSchema = JSON.parse(newBytes.toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const removals = [];

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
  for (const key of Object.keys(newValue)) {
    assertV388(Object.hasOwn(oldValue, key), `${pointer}/${key}: unexpected schema addition`);
    compare(oldValue[key], newValue[key], `${pointer}/${key}`);
  }
  for (const key of Object.keys(oldValue)) {
    if (Object.hasOwn(newValue, key)) continue;
    assertV388(key === "uniqueItems" && oldValue[key] === true, `${pointer}/${key}: unexpected schema removal`);
    removals.push({ path: `${pointer}/${key}`, value: true, enforcementAfterRemoval: "deterministic-packet-aware-validator" });
  }
}
compare(oldSchema, newSchema);
assertV388(removals.length === 7, `expected seven serialized uniqueItems removals, found ${removals.length}`);

const allowedKeywords = new Set(["$schema", "$id", "title", "type", "additionalProperties", "required", "properties", "items", "minItems", "minLength", "minimum", "maximum", "enum", "const", "anyOf"]);
let schemaNodes = 0;
function lintSchema(node, pointer = "") {
  assertV388(node && typeof node === "object" && !Array.isArray(node), `${pointer}: schema node must be an object`);
  schemaNodes += 1;
  for (const key of Object.keys(node)) assertV388(allowedKeywords.has(key), `${pointer}/${key}: keyword outside audited endpoint subset`);
  if (node.type === "object") {
    assertV388(node.additionalProperties === false, `${pointer}: object must set additionalProperties false`);
    assertV388(node.properties && typeof node.properties === "object", `${pointer}: object properties missing`);
    assertV388(Array.isArray(node.required) && JSON.stringify([...node.required].sort()) === JSON.stringify(Object.keys(node.properties).sort()), `${pointer}: every object property must be required`);
  }
  if (Object.hasOwn(node, "const")) assertV388(typeof node.type === "string" && typeof node.const === node.type, `${pointer}: const lacks matching explicit type`);
  if (Array.isArray(node.enum)) assertV388(typeof node.type === "string" && node.enum.every((value) => typeof value === node.type), `${pointer}: enum lacks matching explicit type`);
  if (node.properties) for (const [key, child] of Object.entries(node.properties)) lintSchema(child, `${pointer}/properties/${key}`);
  if (node.items) lintSchema(node.items, `${pointer}/items`);
  if (node.anyOf) for (let index = 0; index < node.anyOf.length; index += 1) lintSchema(node.anyOf[index], `${pointer}/anyOf/${index}`);
}
lintSchema(newSchema);
const failure = JSON.parse(await readFile(path.resolve(root, failedExecutionPath), "utf8"));
assertV388(failure.validOutputContexts === 0 && failure.moveJudgmentsAcrossPasses === 0 && failure.recoveryAttempts === 6 && failure.retriesWithinRecovery === 0 && failure.results.every((item) => item.status === "transport-failed" && item.outputWritten === false), "first recovery failure does not prove pre-inference rejection");
const audit = {
  schemaVersion: "3.8.8-performance-schema-keyword-recovery-audit",
  status: "passed-semantic-preserving-unsupported-keyword-removal",
  lockedRecoveryCommit: lockedCommit,
  officialDocumentation: "https://developers.openai.com/api/docs/guides/structured-outputs#supported-schemas",
  defect: "The structured-output endpoint does not permit uniqueItems; uniqueness remains a deterministic post-output invariant.",
  priorAttempts: { originalPreInferenceAttempts: 6, firstRecoveryPreInferenceAttempts: 6, totalPreInferenceAttempts: 12, validContexts: 0, moveJudgmentsGenerated: 0, outputFilesWritten: 0, retries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  repair: { oldSchemaSha256: sha256(oldBytes), newSchemaSha256: sha256(newBytes), removals, removalsOnly: true, removedKeysOnlyUniqueItems: true, existingValuesChanged: 0, addedKeys: 0, uniquenessStillDeterministicallyEnforced: true, semanticJudgmentContractChanged: false },
  supportedSubsetLint: { status: "passed", schemaNodes, allowedKeywords: [...allowedKeywords], unexpectedKeywords: 0, objectsMissingAdditionalPropertiesFalse: 0, objectsWithOptionalProperties: 0, constOrEnumNodesMissingExplicitType: 0 },
  authorization: { automaticRetry: false, oneContextEndpointPreflightRequiredBeforeAnyFurtherSixContextRun: true, scoreDerivation: false, assessmentProse: false }
};
if (shouldWrite) {
  await mkdir(path.resolve(root, V388_PERFORMANCE_ROOT), { recursive: true });
  await writeFile(path.resolve(root, `${V388_PERFORMANCE_ROOT}/schema-keyword-recovery-audit.json`), `${JSON.stringify(audit, null, 2)}\n`);
}
console.log(JSON.stringify({ status: "passed", uniqueItemsRemovals: removals.length, supportedSubsetSchemaNodes: schemaNodes, unexpectedKeywords: 0, semanticJudgmentContractChanged: false, priorValidContexts: 0, priorMoveJudgments: 0, oneContextEndpointPreflightRequired: true }, null, 2));
