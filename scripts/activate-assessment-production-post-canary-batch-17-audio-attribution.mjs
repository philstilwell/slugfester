#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { MODEL, PROTOCOL_ID, ROOT, sha256 } from "./lib/assessment-production-post-canary-batch-17-audio-attribution.mjs";

const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--activated-at");
const activatedAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assert(activatedAt && !Number.isNaN(Date.parse(activatedAt)), "--activated-at requires an ISO timestamp");
const preparationPath = `${ROOT}/preparation-manifest.json`;
const authorizationPath = "docs/assessment-production/post-canary-continuation-v1/batch-17/audio-verification/audio-attribution-successor-authorization.json";
const manifestPath = `${ROOT}/execution-manifest.json`;
const futureOutputs = [`${ROOT}/model-execution.json`, `${ROOT}/analysis.json`, `${ROOT}/combined-audio-verification.json`];
const exists = (file) => access(file).then(() => true, () => false);
if (shouldWrite) for (const file of [manifestPath, ...futureOutputs]) assert(!(await exists(file)), `${file} already exists`);
const [preparationBytes, authorizationBytes] = await Promise.all([readFile(preparationPath), readFile(authorizationPath)]);
const preparation = JSON.parse(preparationBytes);
const authorization = JSON.parse(authorizationBytes);
assert.equal(preparation.status, "prepared-one-batch-17-audio-attribution-recovery-context-not-active");
assert.equal(authorization.status, "frozen-active-batch-17-audio-attribution-recovery-level-1-successor-authorization");
assert.equal(preparation.authorization.sha256, sha256(authorizationBytes));
assert.deepEqual(preparation.contexts.map((item) => [item.debateNumber, item.moveIds.length]), [["77", 1]]);
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const origin = execFileSync("git", ["rev-parse", "origin/main"], { encoding: "utf8" }).trim();
assert.equal(head, origin, "local main must equal origin/main before activation");
const sourceFiles = [
  authorizationPath,
  preparationPath,
  preparation.workflow,
  preparation.manual,
  ...preparation.contexts.flatMap((context) => [context.packet, context.schema, ...context.rawDiarizedTranscripts.map((item) => item.path)]),
  "scripts/lib/assessment-production-post-canary-batch-17-audio-attribution.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-17-audio-attribution.mjs",
  "scripts/test-assessment-production-post-canary-batch-17-audio-attribution.mjs",
  "scripts/activate-assessment-production-post-canary-batch-17-audio-attribution.mjs",
  "scripts/run-assessment-production-post-canary-batch-17-audio-attribution.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-17-audio-attribution.mjs",
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
const contexts = [];
for (const context of preparation.contexts) {
  let copiedInputBytes = (await readFile(preparation.workflow)).length + (await readFile(preparation.manual)).length + (await readFile(context.packet)).length + (await readFile(context.schema)).length;
  for (const transcript of context.rawDiarizedTranscripts) copiedInputBytes += (await readFile(transcript.path)).length;
  assert(copiedInputBytes <= 180000, `Debate ${context.debateNumber}: context input exceeds frozen ceiling`);
  contexts.push({ ...context, copiedInputBytes });
}
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-17-audio-attribution-execution-manifest",
  protocolId: PROTOCOL_ID,
  status: "frozen-one-batch-17-audio-attribution-recovery-context-active",
  activatedAt,
  checkpointCommit: head,
  productionCanary: false,
  batchNumber: 17,
  stagingOnly: true,
  AIOnly: true,
  model: MODEL,
  authorization: { path: authorizationPath, sha256: sha256(authorizationBytes) },
  workflow: preparation.workflow,
  manual: preparation.manual,
  contexts,
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, ratingsUnavailable: true, scoresUnavailable: true, legacyUnavailable: true, otherDebatesUnavailable: true, publicationProseUnavailable: true },
  executionPolicy: {
    contexts: 1,
    concurrency: 1,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    perInvocationTimeoutMs: 900000,
    authentication: MODEL.authentication,
    APIKeysRemoved: true,
    removedEnvironmentVariables: ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"],
    paidTranscriptionCalls: 0,
    directIncrementalCostUsdMaximum: 0,
    stderrTailRecordedOnFailure: true,
  },
  authorizationFlags: { modelExecution: true, deterministicValidation: true, deterministicAnalysis: true, retry: false, paidTranscription: false, scoreDerivation: false, productionMutation: false, nextBatchSelection: false },
  artifacts: { execution: futureOutputs[0], analysis: futureOutputs[1], combinedAudioGate: futureOutputs[2] },
  futureOutputPathsExcludedFromSourceHashes: [...futureOutputs, ...contexts.map((context) => context.output)],
  sourceHashes,
};
if (shouldWrite) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? manifest.status : "preview", contexts: 1, decisions: 1, copiedInputBytes: contexts.map((item) => ({ debateNumber: item.debateNumber, bytes: item.copiedInputBytes })), model: "5.6 Sol/low", authentication: MODEL.authentication, attemptsMaximum: 1, retriesMaximum: 0, paidTranscriptionCalls: 0, directIncrementalCostUsdMaximum: 0, scoresDerived: 0 }, null, 2));
