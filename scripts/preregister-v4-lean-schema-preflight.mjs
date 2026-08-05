#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V4_LEAN_ROOT, assertV4, readJson } from "./lib/v4-lean-production.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const preflightRoot = `${V4_LEAN_ROOT}/schema-preflight`;
const syntheticSourceRoot = "docs/calibration/v4.0/lean-retired-gate/schema-preflight";
const manifestPath = `${preflightRoot}/execution-manifest.json`;
const outputPath = `${preflightRoot}/output.json`;
const executionPath = `${preflightRoot}/model-execution.json`;
if (shouldWrite) {
  for (const future of [manifestPath, outputPath, executionPath]) {
    try { await access(path.resolve(root, future)); throw new Error(`${future} already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}
const [preparation, fixture, packet] = await Promise.all([
  readJson(`${V4_LEAN_ROOT}/preparation-manifest.json`),
  readJson(`${V4_LEAN_ROOT}/dry-fixture.json`),
  readJson(`${preflightRoot}/packet.json`)
]);
assertV4(preparation.status === "prepared-source-only-no-model-execution" && preparation.totals.modelContextsExecuted === 0, "preparation boundary invalid");
assertV4(fixture.status === "passed" && fixture.computeProjection.centralTargetPassed, "deterministic fixture or compute budget failed");
assertV4(packet.debateNumber === "schema-preflight" && packet.eventCount === 8, "synthetic packet invalid");
const sourceFiles = [
  "docs/assessment-workflow-v4.0.md",
  "docs/assessment-workflow-v4.0.1.md",
  "docs/reassessment-rubric-v4.0.md",
  "docs/reassessment-rubric-v4.0.1.md",
  `${V4_LEAN_ROOT}/manual.md`,
  `${V4_LEAN_ROOT}/schemas/primary.schema.json`,
  `${preflightRoot}/packet.json`,
  `${syntheticSourceRoot}/transcript.txt`,
  `${syntheticSourceRoot}/events.json`,
  `${V4_LEAN_ROOT}/preparation-manifest.json`,
  `${V4_LEAN_ROOT}/dry-fixture.json`,
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/validate-v4-lean-primary-output.mjs",
  "scripts/preregister-v4-lean-schema-preflight.mjs",
  "scripts/run-v4-lean-schema-preflight.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));
const manifest = {
  schemaVersion: "4.0.1-lean-schema-preflight-manifest",
  protocolId: "v4.0.1-lean-risk-triggered-consensus",
  status: "frozen-one-synthetic-context-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  syntheticOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low" },
  inputs: { workflowBase: "docs/assessment-workflow-v4.0.md", workflow: "docs/assessment-workflow-v4.0.1.md", rubricBase: "docs/reassessment-rubric-v4.0.md", rubric: "docs/reassessment-rubric-v4.0.1.md", manual: `${V4_LEAN_ROOT}/manual.md`, packet: `${preflightRoot}/packet.json`, schema: `${V4_LEAN_ROOT}/schemas/primary.schema.json`, transcript: `${syntheticSourceRoot}/transcript.txt`, events: `${syntheticSourceRoot}/events.json` },
  executionPolicy: { contexts: 1, attempts: 1, retriesMaximum: 0, perInvocationTimeoutMs: 1800000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  authorization: { syntheticSchemaPreflightModelExecution: true, debatePrimaryModelExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false },
  artifacts: { output: outputPath, execution: executionPath },
  futureOutputPathsExcludedFromSourceHashes: [outputPath, executionPath],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, contexts: 1, attempts: 1, retries: 0, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 }, null, 2));
