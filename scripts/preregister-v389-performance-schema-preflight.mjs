#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V389_PERFORMANCE_ROOT, assertV389, readJson } from "./lib/v389-performance-judgment.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at must be an ISO timestamp");
const preflightRoot = `${V389_PERFORMANCE_ROOT}/schema-preflight`;
const manifestPath = `${preflightRoot}/execution-manifest.json`;
const packetPath = `${preflightRoot}/synthetic-packet.json`;
const schemaPath = `${V389_PERFORMANCE_ROOT}/performance-judgment-schema.json`;
if (shouldWrite) {
  try { await access(path.resolve(root, manifestPath)); throw new Error(`${manifestPath} already exists`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const syntheticPacket = {
  schemaVersion: "3.8.9-performance-schema-synthetic-preflight-packet",
  debateNumber: "schema-preflight",
  debateId: "schema-preflight-no-debate-content",
  routes: [],
  moves: [{
    moveId: "schema-preflight-constructive-01",
    sectionId: "section-01",
    side: "pro",
    speaker: "Synthetic Speaker",
    sourceSpan: { startEvent: 0, endEvent: 0, startMs: 0, endMs: 1 },
    lockedBurdenContact: null,
    allowedResponseTargetIds: [],
    moveKind: "constructive"
  }]
};
if (shouldWrite) {
  await mkdir(path.resolve(root, preflightRoot), { recursive: true });
  await writeFile(path.resolve(root, packetPath), `${JSON.stringify(syntheticPacket, null, 2)}\n`);
}
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceFiles = [schemaPath, packetPath, "scripts/lib/v389-performance-judgment.mjs", "scripts/validate-v389-performance-judgment-output.mjs", "scripts/preregister-v389-performance-schema-preflight.mjs", "scripts/validate-v389-performance-schema-preflight-lock.mjs", "scripts/run-v389-performance-schema-preflight.mjs"];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await bytes(file));
const output = `${preflightRoot}/output.json`;
const execution = `${preflightRoot}/model-execution.json`;
const manifest = {
  schemaVersion: "3.8.9-performance-schema-endpoint-preflight-manifest",
  protocolId: "v3.8.9-performance-judgment-consensus",
  status: "frozen-one-synthetic-context-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  purpose: "Prove endpoint acceptance and packet-aware validity of the exact shared schema before any real debate context.",
  syntheticOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low" },
  input: { schema: schemaPath, schemaSha256: sourceHashes[schemaPath], packet: packetPath, debateTranscriptAvailable: false, debateJudgmentAuthorized: false },
  authorization: { syntheticSchemaPreflightContexts: 1, syntheticSchemaPreflightModelExecution: true, debatePerformanceModelExecution: false, scoreDerivation: false, numericalParticipantScoring: false, assessmentProse: false, furtherAutomaticRetry: false },
  executionPolicy: { contexts: 1, attempts: 1, retriesMaximum: 0, perInvocationTimeoutMs: 600000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  acceptanceRule: { endpointExitCode: 0, outputWritten: true, exactSharedSchemaUsed: true, packetAwareValidationRequired: true, validSyntheticMoves: 1, debateJudgmentsMaximum: 0 },
  artifacts: { output, execution },
  futureOutputPathsExcludedFromSourceHashes: [output, execution],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", syntheticContexts: 1, exactSharedSchema: true, debateJudgmentsAuthorized: false, maximumMeteredCostUsd: 0, scoreDerivationAuthorized: false }, null, 2));
