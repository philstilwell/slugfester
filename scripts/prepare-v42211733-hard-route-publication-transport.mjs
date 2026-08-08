#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V42211732_ROOT } from "./lib/v42211732-hard-route-publication.mjs";
import { V42211733_PROTOCOL_ID, V42211733_ROOT, validateOpenAIStructuredOutputSubset } from "./lib/v42211733-hard-route-publication-transport.mjs";

const oldExecutionPath = `${V42211732_ROOT}/model-execution.json`;
const oldAnalysisPath = `${V42211732_ROOT}/analysis.json`;
const preparationPath = `${V42211733_ROOT}/preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

function sanitizeSchema(value, audit) {
  if (Array.isArray(value)) return value.map((item) => sanitizeSchema(item, audit));
  if (!value || typeof value !== "object") return value;
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "uniqueItems") { audit.uniqueItemsRemoved += 1; continue; }
    result[key] = sanitizeSchema(child, audit);
  }
  return result;
}

assertV4(!(await exists(preparationPath)), `${preparationPath} already exists`);
const [oldPreparation, oldExecution, oldAnalysis] = await Promise.all([
  readFile(path.resolve(`${V42211732_ROOT}/preparation-manifest.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(oldExecutionPath), "utf8").then(JSON.parse),
  readFile(path.resolve(oldAnalysisPath), "utf8").then(JSON.parse)
]);
assertV4(oldExecution.status === "hard-route-publication-gate-complete-with-failure" && oldExecution.contextsAttempted === 1 && oldExecution.validContexts === 0 && oldExecution.results[0]?.failureMessage?.includes("invalid_json_schema") && oldExecution.results[0]?.failureMessage?.includes("uniqueItems"), "v17.32 failure is not the preregistered schema-subset defect");
assertV4(oldAnalysis.status === "hard-route-publication-gate-failed-validation" && oldAnalysis.authorization.deterministicCompilation === false, "v17.32 failure analysis mismatch");
assertV4(oldPreparation.totals.modelAuthoredScores === 0, "v17.32 score lock mismatch");

const contexts = [];
let totalRemoved = 0;
for (const oldContext of oldPreparation.contexts) {
  const packet = JSON.parse(await readFile(path.resolve(oldContext.packet), "utf8"));
  const oldSchema = JSON.parse(await readFile(path.resolve(oldContext.schema), "utf8"));
  const audit = { uniqueItemsRemoved: 0 };
  const schema = sanitizeSchema(oldSchema, audit);
  const preflight = validateOpenAIStructuredOutputSubset(schema);
  assertV4(audit.uniqueItemsRemoved > 0, `Debate ${oldContext.debateNumber}: no uniqueItems repair applied`);
  assertV4(preflight.status === "passed", `Debate ${oldContext.debateNumber}: unsupported schema keyword remains: ${preflight.unsupportedKeywords.join(", ")}`);
  const packetPath = `${V42211733_ROOT}/packets/debate-${oldContext.debateNumber}.json`;
  const schemaPath = `${V42211733_ROOT}/schemas/debate-${oldContext.debateNumber}.schema.json`;
  const outputPath = `${V42211733_ROOT}/outputs/debate-${oldContext.debateNumber}.json`;
  const compiledPath = `${V42211733_ROOT}/compiled/debate-${oldContext.debateNumber}.json`;
  await mkdir(path.resolve(path.dirname(packetPath)), { recursive: true });
  await mkdir(path.resolve(path.dirname(schemaPath)), { recursive: true });
  const packetDocument = `${JSON.stringify(packet, null, 2)}\n`;
  const schemaDocument = `${JSON.stringify(schema, null, 2)}\n`;
  await writeFile(path.resolve(packetPath), packetDocument);
  await writeFile(path.resolve(schemaPath), schemaDocument);
  const packetBytes = Buffer.byteLength(packetDocument);
  const schemaBytes = Buffer.byteLength(schemaDocument);
  contexts.push({ ...oldContext, packet: packetPath, schema: schemaPath, output: outputPath, compiled: compiledPath, packetBytes, schemaBytes, copiedInputBytes: packetBytes + schemaBytes + oldContext.copiedInputBytes - oldContext.packetBytes - oldContext.schemaBytes, schemaPreflight: preflight, uniqueItemsRemoved: audit.uniqueItemsRemoved });
  totalRemoved += audit.uniqueItemsRemoved;
}

const preparation = {
  schemaVersion: "4.2.21.17.33-hard-route-publication-transport-preparation",
  protocolId: V42211733_PROTOCOL_ID,
  status: "prepared-five-isolated-hard-route-publication-transport-contexts",
  preparedAt: new Date().toISOString(),
  calibrationOnly: true,
  AIOnly: true,
  model: oldPreparation.model,
  inheritedAuthoringProtocolId: oldPreparation.protocolId,
  inputs: oldPreparation.inputs,
  contexts,
  isolation: oldPreparation.isolation,
  policy: oldPreparation.policy,
  repair: { defect: "OpenAI structured-output subset rejects uniqueItems", transportSchemasOnly: true, uniqueItemsRemoved: totalRemoved, repositoryUniquenessValidationRetained: true, allSchemaPreflightsPassed: contexts.every((context) => context.schemaPreflight.status === "passed"), priorGateTreatedAsRetry: false },
  totals: { debates: contexts.length, moves: oldPreparation.totals.moves, sections: oldPreparation.totals.sections, maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)), modelContextsExecuted: 0, retries: 0, correctionContexts: 0, modelAuthoredScores: 0, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0 },
  authorization: { executionManifest: true, modelExecution: false, retry: false, correctionModelExecution: false, deterministicCompilation: false, renderingVerification: false, productionMutation: false, all195Debates: false }
};
await writeFile(path.resolve(preparationPath), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, contexts: contexts.length, moves: preparation.totals.moves, uniqueItemsRemoved: totalRemoved, allSchemaPreflightsPassed: preparation.repair.allSchemaPreflightsPassed, maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes, modelAuthoredScores: 0 }, null, 2));
