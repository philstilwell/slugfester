#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_RECON_ROOT, assertV388Recon, readBytes, readJson, sha256 } from "./lib/v388-reconstruction.mjs";

const root = process.cwd(), write = process.argv.includes("--write");
const recoveryRoot = `${V388_RECON_ROOT}/schema-compatibility-recovery`;
const continuationRoot = `${V388_RECON_ROOT}/post-debate-55-continuation`;
const recoveryManifestPath = `${recoveryRoot}/execution-manifest.json`;
const recoveryExecutionPath = `${recoveryRoot}/model-execution.json`;
const validated55Path = `${V388_RECON_ROOT}/validated-outputs/debate-55.json`;
const mergeAudit55Path = `${V388_RECON_ROOT}/prose-correction/debate-55/merge-audit.json`;
const recoveryManifest = await readJson(root, recoveryManifestPath);
const recoveryExecution = await readJson(root, recoveryExecutionPath);
const mergeAudit55 = await readJson(root, mergeAudit55Path);
assertV388Recon(recoveryExecution.status === "failed-closed" && recoveryExecution.contextsAttempted === 1 && recoveryExecution.results[0].debateNumber === "55" && recoveryExecution.results[0].attemptCount === 1 && recoveryExecution.retries === 0, "prior stopped execution is not the expected Debate 55 attempt");
assertV388Recon(mergeAudit55.status === "passed-bounded-prose-recovery" && mergeAudit55.scoreFieldsChanged === 0 && mergeAudit55.unauthorizedFieldsChanged === 0, "Debate 55 bounded recovery did not pass");
execFileSync(process.execPath, ["scripts/validate-v388-reconstruction-output.mjs", validated55Path, `${V388_RECON_ROOT}/packets/debate-55.json`], { cwd: root, stdio: "pipe" });

const contexts = recoveryManifest.contexts.filter((context) => ["103", "161"].includes(context.debateNumber));
assertV388Recon(contexts.length === 2 && contexts.map((context) => context.debateNumber).join(",") === "103,161", "continuation context identity/order mismatch");
for (const context of contexts) {
  try { await access(path.resolve(root, context.output)); throw new Error(`${context.output}: future output already exists`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}

const sourceFiles = [
  "docs/assessment-workflow-v3.8.4.md", "docs/reassessment-rubric-v3.8.4.md", `${V388_RECON_ROOT}/manual.md`,
  recoveryManifestPath, recoveryExecutionPath, validated55Path, mergeAudit55Path,
  ...contexts.flatMap((context) => [context.packet, context.schema, context.transcript, context.events, context.sourceManifest]),
  "scripts/lib/v388-reconstruction.mjs", "scripts/run-v388-reconstruction.mjs", "scripts/validate-v388-reconstruction-output.mjs"
];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readBytes(root, file));
const manifest = {
  schemaVersion: "3.8.8-reconstruction-two-context-continuation-manifest",
  protocolId: recoveryManifest.protocolId,
  status: "frozen-two-context-post-debate-55-continuation-authorized",
  createdAt: new Date().toISOString(),
  recoveryOf: recoveryManifestPath,
  prerequisite: { debate55ValidatedOutput: validated55Path, debate55MergeAudit: mergeAudit55Path },
  model: recoveryManifest.model,
  executionPolicy: { contexts: 2, perInvocationTimeoutMs: recoveryManifest.executionPolicy.perInvocationTimeoutMs, retriesAuthorized: 0, APIKeysRemoved: true, ephemeralCodexHome: true, freshContextsNotRetries: true, critiqueTargetWords: "115-125", exactDisclosureRequired: true },
  sourceHashes,
  contexts,
  futureOutputs: contexts.map((context) => context.output),
  artifacts: { execution: `${continuationRoot}/model-execution.json`, audit: `${V388_RECON_ROOT}/audit.json` },
  cost: { meteredModelApiCostUsd: 0, additionalTranscriptionEstimatedCostUsd: 0, retryBillingRiskUsd: 0 },
  governance: { reason: "The original stopped-on-first-invalid execution never invoked Debates 103 or 161; these are their first model contexts.", automaticRetry: false, diagnosticOnly: true },
  authorization: { reconstructionModelExecution: true, deterministicAudit: true, calibrationPreview: false, productionMutation: false, tenDebateGate: false, all195Debates: false }
};
if (write) {
  await mkdir(path.resolve(root, continuationRoot), { recursive: true });
  await writeFile(path.resolve(root, `${continuationRoot}/execution-manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: "passed", contexts: contexts.map((context) => context.debateNumber), debate55PrerequisitePassed: true, freshContextsNotRetries: true, critiqueTargetWords: manifest.executionPolicy.critiqueTargetWords, meteredApiCostUsd: 0, additionalTranscriptionEstimatedCostUsd: 0, written: write }, null, 2));
