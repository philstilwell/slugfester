#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V41_LEAN_ROOT, V41_MODEL, V41_PROTOCOL_ID, assertV4, readJson } from "./lib/v41-lean-production.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const preflightRoot = `${V41_LEAN_ROOT}/schema-preflight`;
const manifestPath = `${preflightRoot}/execution-manifest.json`;
const outputPath = `${preflightRoot}/output.json`;
const executionPath = `${preflightRoot}/model-execution.json`;
if (shouldWrite) for (const future of [manifestPath, outputPath, executionPath]) {
  try { await access(path.resolve(root, future)); throw new Error(`${future} already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; }
}
const [preparation, fixture, packet] = await Promise.all([readJson(`${V41_LEAN_ROOT}/preparation-manifest.json`), readJson(`${V41_LEAN_ROOT}/dry-fixture.json`), readJson(`${preflightRoot}/packet.json`)]);
assertV4(preparation.status === "prepared-source-only-no-model-execution", "preparation boundary invalid");
assertV4(fixture.status === "passed" && fixture.computeProjection.central.centralTargetPassed && fixture.computeProjection.conservative.conservativeCeilingPassed, "deterministic fixture or compute budget failed");
assertV4(packet.debateNumber === "schema-preflight" && packet.eventCount === 8, "synthetic packet invalid");
const inputs = {
  workflowBase: "docs/assessment-workflow-v4.0.md",
  workflowDerivedScores: "docs/assessment-workflow-v4.0.1.md",
  workflow: "docs/assessment-workflow-v4.1.md",
  rubricBase: "docs/reassessment-rubric-v4.0.md",
  rubricDerivedScores: "docs/reassessment-rubric-v4.0.1.md",
  rubric: "docs/reassessment-rubric-v4.1.md",
  manual: `${V41_LEAN_ROOT}/manual.md`,
  packet: `${preflightRoot}/packet.json`,
  schema: `${V41_LEAN_ROOT}/schemas/primary.schema.json`,
  transcript: "docs/calibration/v4.0/lean-retired-gate/schema-preflight/transcript.txt",
  events: "docs/calibration/v4.0/lean-retired-gate/schema-preflight/events.json"
};
const sourceFiles = [...Object.values(inputs), `${V41_LEAN_ROOT}/preparation-manifest.json`, `${V41_LEAN_ROOT}/dry-fixture.json`, "scripts/lib/reassessment-scoring.mjs", "scripts/lib/v4-lean-production.mjs", "scripts/lib/v41-lean-production.mjs", "scripts/validate-v41-lean-primary-output.mjs", "scripts/preregister-v41-lean-schema-preflight.mjs", "scripts/run-v41-lean-schema-preflight.mjs"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));
const manifest = {
  schemaVersion: "4.1-bounded-schema-preflight-manifest",
  protocolId: V41_PROTOCOL_ID,
  status: "frozen-one-synthetic-context-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  syntheticOnly: true,
  model: { label: V41_MODEL.label, slug: V41_MODEL.slug, reasoningEffort: V41_MODEL.primaryReasoningEffort },
  inputs,
  executionPolicy: { contexts: 1, attempts: 1, retriesMaximum: 0, perInvocationTimeoutMs: 1200000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  authorization: { syntheticSchemaPreflightModelExecution: true, debatePrimaryModelExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false },
  artifacts: { output: outputPath, execution: executionPath },
  futureOutputPathsExcludedFromSourceHashes: [outputPath, executionPath],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, contexts: 1, attempts: 1, retries: 0, reasoningEffort: manifest.model.reasoningEffort, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 }, null, 2));
