#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V41_LEAN_ROOT, assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V415_PASS_B_ROOT } from "./lib/v415-triggered-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const preflightRoot = `${V415_PASS_B_ROOT}/schema-preflight`;
const manifestPath = `${preflightRoot}/execution-manifest.json`;
const outputPath = `${preflightRoot}/output.json`;
const executionPath = `${preflightRoot}/model-execution.json`;
if (shouldWrite) for (const future of [manifestPath, outputPath, executionPath]) {
  try { await access(path.resolve(root, future)); throw new Error(`${future} already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; }
}
const [preparation, fixture] = await Promise.all([readJson(`${V415_PASS_B_ROOT}/preparation-manifest.json`), readJson(`${V415_PASS_B_ROOT}/dry-fixture.json`)]);
assertV4(preparation.status === "prepared-score-blind-pass-b-packets" && preparation.authorization.passBSchemaPreflight, "Pass B preparation boundary invalid");
assertV4(fixture.status === "passed" && fixture.mutationTests.wrongOrderRejected && fixture.mutationTests.leakedPrimaryJudgmentRejected, "Pass B fixture invalid");
const inputs = {
  workflow: "docs/assessment-workflow-v4.0.md",
  workflowBounded: "docs/assessment-workflow-v4.1.md",
  workflowConsistency: "docs/assessment-workflow-v4.1.3.md",
  workflowBurdenTuple: "docs/assessment-workflow-v4.1.4.md",
  workflowTiming: "docs/assessment-workflow-v4.1.5.md",
  rubricBase: "docs/reassessment-rubric-v4.0.md",
  rubricBounded: "docs/reassessment-rubric-v4.1.md",
  manual: `${V415_PASS_B_ROOT}/manual.md`,
  packet: `${preflightRoot}/packet.json`,
  schema: `${V415_PASS_B_ROOT}/schemas/pass-b.schema.json`,
  sourcePacket: `${V41_LEAN_ROOT}/schema-preflight/packet.json`,
  transcript: "docs/calibration/v4.0/lean-retired-gate/schema-preflight/transcript.txt",
  events: "docs/calibration/v4.0/lean-retired-gate/schema-preflight/events.json"
};
const sourceFiles = [...Object.values(inputs), `${V415_PASS_B_ROOT}/preparation-manifest.json`, `${V415_PASS_B_ROOT}/dry-fixture.json`, "scripts/lib/reassessment-scoring.mjs", "scripts/lib/v4-lean-production.mjs", "scripts/lib/v41-lean-production.mjs", "scripts/lib/v415-triggered-consensus.mjs", "scripts/validate-v415-pass-b-output.mjs", "scripts/preregister-v415-pass-b-schema-preflight.mjs", "scripts/run-v415-pass-b-schema-preflight.mjs"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));
const manifest = {
  schemaVersion: "4.1.5-triggered-pass-b-schema-preflight-manifest",
  protocolId: "v4.1.5-triggered-pass-b-consensus",
  status: "frozen-one-synthetic-pass-b-context-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  syntheticOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  inputs,
  executionPolicy: { contexts: 1, attempts: 1, retriesMaximum: 0, perInvocationTimeoutMs: 1200000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  authorization: { syntheticPassBModelExecution: true, debatePassBModelExecution: false, disagreementExtraction: false, adjudication: false, productionMutation: false },
  artifacts: { output: outputPath, execution: executionPath },
  futureOutputPathsExcludedFromSourceHashes: [outputPath, executionPath],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, contexts: 1, attempts: 1, retries: 0, reasoningEffort: "high", meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 }, null, 2));
