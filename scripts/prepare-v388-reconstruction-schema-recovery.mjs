#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V388_RECON_MODEL, V388_RECON_PROTOCOL, V388_RECON_ROOT,
  assertV388Recon, buildV388ReconstructionSchema, readBytes, readJson, sha256
} from "./lib/v388-reconstruction.mjs";

const root = process.cwd();
const write = process.argv.includes("--write");
const recoveryRoot = `${V388_RECON_ROOT}/schema-compatibility-recovery`;
const originalManifestPath = `${V388_RECON_ROOT}/execution-manifest.json`;
const failedExecutionPath = `${V388_RECON_ROOT}/model-execution.json`;
const originalManifest = await readJson(root, originalManifestPath);
const failedExecution = await readJson(root, failedExecutionPath);
assertV388Recon(failedExecution.status === "failed-closed" && failedExecution.contextsAttempted === 1 && failedExecution.validContexts === 0 && failedExecution.meteredApiCostUsd === 0, "failed execution provenance mismatch");
assertV388Recon(failedExecution.results[0].outputWritten === false && failedExecution.results[0].commandExitCode === 1, "failed attempt unexpectedly produced output");

const removeUniqueItems = (value, counter) => {
  if (Array.isArray(value)) return value.map((item) => removeUniqueItems(item, counter));
  if (!value || typeof value !== "object") return value;
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "uniqueItems") { counter.count += 1; continue; }
    output[key] = removeUniqueItems(item, counter);
  }
  return output;
};

const schemas = [], comparisons = [];
for (const context of originalManifest.contexts) {
  const packet = await readJson(root, context.packet);
  const originalSchema = await readJson(root, context.schema);
  const recoveredSchema = buildV388ReconstructionSchema({ debateNumber: packet.debateNumber, debateId: packet.debateId, sections: packet.sections }, packet.representativeQuotes);
  const counter = { count: 0 };
  const normalizedOriginal = removeUniqueItems(originalSchema, counter);
  assertV388Recon(JSON.stringify(normalizedOriginal) === JSON.stringify(recoveredSchema), `${context.debateNumber}: recovery changed more than unsupported uniqueItems keywords`);
  const recoveredPath = `${recoveryRoot}/schemas/debate-${context.debateNumber}.schema.json`;
  schemas.push({ debateNumber: context.debateNumber, path: recoveredPath, value: recoveredSchema });
  comparisons.push({ debateNumber: context.debateNumber, originalSchemaPath: context.schema, originalSha256: sha256(await readBytes(root, context.schema)), recoveredSchemaPath: recoveredPath, removedUniqueItemsKeywords: counter.count });
}
assertV388Recon(comparisons.reduce((sum, item) => sum + item.removedUniqueItemsKeywords, 0) === 24, "unexpected uniqueItems removal count");
if (write) for (const schema of schemas) {
  await mkdir(path.dirname(path.resolve(root, schema.path)), { recursive: true });
  await writeFile(path.resolve(root, schema.path), `${JSON.stringify(schema.value, null, 2)}\n`);
}

const audit = {
  schemaVersion: "3.8.8-reconstruction-schema-compatibility-recovery-audit",
  protocolId: V388_RECON_PROTOCOL,
  status: "passed-representation-only-schema-recovery",
  trigger: { endpointCode: "invalid_json_schema", unsupportedKeyword: "uniqueItems", inferenceStarted: false, outputWritten: false, meteredApiCostUsd: 0 },
  repair: { removedKeyword: "uniqueItems", occurrencesRemoved: 24, semanticUniquenessRuleRetainedInDeterministicValidator: true, allowedValuesChanged: false, scoreDataChanged: false, sourceDataChanged: false, proseGeneratedBeforeRecovery: false },
  comparisons,
  authorization: { automaticRetry: false, separatelyLockedRecovery: true, reconstructionModelExecution: false, productionMutation: false, tenDebateGate: false, all195Debates: false }
};
if (write) await writeFile(path.resolve(root, `${recoveryRoot}/audit.json`), `${JSON.stringify(audit, null, 2)}\n`);

const sourceHashes = {};
for (const relativePath of [
  "docs/assessment-workflow-v3.8.4.md", "docs/reassessment-rubric-v3.8.4.md",
  `${V388_RECON_ROOT}/preregistration.md`, `${V388_RECON_ROOT}/manual.md`, `${V388_RECON_ROOT}/quote-verification.json`,
  originalManifestPath, failedExecutionPath, `${recoveryRoot}/audit.json`,
  "scripts/lib/v388-reconstruction.mjs", "scripts/validate-v388-reconstruction-output.mjs", "scripts/run-v388-reconstruction.mjs",
  ...originalManifest.contexts.flatMap((context) => [context.packet, context.transcript, context.events, context.sourceManifest]),
  ...schemas.map((schema) => schema.path)
]) sourceHashes[relativePath] = sha256(await readBytes(root, relativePath));

const contexts = originalManifest.contexts.map((context) => ({ ...context, schema: schemas.find((schema) => schema.debateNumber === context.debateNumber).path }));
const manifest = {
  schemaVersion: "3.8.8-reconstruction-schema-recovery-execution-manifest",
  protocolId: V388_RECON_PROTOCOL,
  status: "frozen-schema-compatibility-recovery-authorized",
  createdAt: new Date().toISOString(),
  recoveryOf: { manifest: originalManifestPath, failedExecution: failedExecutionPath, failureStage: "endpoint-schema-validation-before-inference" },
  governance: { cleanV384GatePassPossible: false, diagnosticOnly: true, productionMutationAuthorized: false, tenDebateGateAuthorized: false, all195DebatesAuthorized: false },
  model: V388_RECON_MODEL,
  cost: { meteredModelApiCostUsd: 0, additionalTranscriptionEstimatedCostUsd: 0, retryBillingRiskUsd: 0 },
  executionPolicy: { contexts: 3, perInvocationTimeoutMs: 1200000, retriesAuthorized: 0, APIKeysRemoved: true, ephemeralCodexHome: true, compatibilityRecovery: true },
  sourceHashes,
  contexts,
  futureOutputs: contexts.map((context) => context.output),
  artifacts: { execution: `${recoveryRoot}/model-execution.json`, audit: `${V388_RECON_ROOT}/audit.json` },
  authorization: { reconstructionModelExecution: true, deterministicAudit: true, calibrationPreview: false, productionMutation: false, tenDebateGate: false, all195Debates: false }
};
if (write) await writeFile(path.resolve(root, `${recoveryRoot}/execution-manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: "passed-schema-compatibility-recovery-preparation", schemas: 3, uniqueItemsKeywordsRemoved: 24, inferenceInFailedAttempt: false, meteredApiCostUsd: 0, recoveryManifest: `${recoveryRoot}/execution-manifest.json`, written: write }, null, 2));
