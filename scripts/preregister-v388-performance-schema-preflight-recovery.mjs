#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_PERFORMANCE_ROOT, assertV388, readJson } from "./lib/v388-performance-judgment.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at must be an ISO timestamp");
const recoveryRoot = `${V388_PERFORMANCE_ROOT}/schema-preflight-recovery`;
const manifestPath = `${recoveryRoot}/execution-manifest.json`;
if (shouldWrite) { try { await access(path.resolve(root, manifestPath)); throw new Error(`${manifestPath} already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
const auditPath = `${V388_PERFORMANCE_ROOT}/schema-preflight/audit.json`;
const packetPath = `${V388_PERFORMANCE_ROOT}/schema-preflight/synthetic-packet.json`;
const schemaPath = `${V388_PERFORMANCE_ROOT}/performance-judgment-schema.json`;
const audit = await readJson(auditPath);
assertV388(audit.status === "endpoint-schema-accepted-content-prompt-defect" && audit.endpoint.schemaAccepted && audit.deterministicValidation.defectCount === 1 && audit.authorization.correctedSyntheticPreflightRequiresSeparateLock, "preflight audit does not authorize corrected preflight construction");
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceFiles = [schemaPath, packetPath, auditPath, "scripts/lib/v388-performance-judgment.mjs", "scripts/validate-v388-performance-judgment-output.mjs", "scripts/preregister-v388-performance-schema-preflight-recovery.mjs", "scripts/validate-v388-performance-schema-preflight-recovery-lock.mjs", "scripts/run-v388-performance-schema-preflight-recovery.mjs"];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await bytes(file));
const output = `${recoveryRoot}/output.json`;
const execution = `${recoveryRoot}/model-execution.json`;
const manifest = {
  schemaVersion: "3.8.8-performance-schema-corrected-preflight-manifest",
  protocolId: "v3.8.8-performance-judgment-consensus",
  status: "frozen-one-corrected-synthetic-context-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  correction: { priorAudit: auditPath, exactSchemaAlreadyEndpointAccepted: true, onlyPromptChange: "Set null-contact relevance/burden to 50 instead of 75.", judgmentContractChanged: false },
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low" },
  input: { schema: schemaPath, schemaSha256: sourceHashes[schemaPath], packet: packetPath, debateTranscriptAvailable: false, debateJudgmentAuthorized: false },
  authorization: { correctedSyntheticContexts: 1, correctedSyntheticModelExecution: true, debatePerformanceModelExecution: false, scoreDerivation: false, numericalParticipantScoring: false, assessmentProse: false, furtherAutomaticRetry: false },
  executionPolicy: { contexts: 1, attempts: 1, retriesMaximum: 0, perInvocationTimeoutMs: 600000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  acceptanceRule: { endpointExitCode: 0, outputWritten: true, exactSharedSchemaUsed: true, packetAwareValidationRequired: true, validSyntheticMoves: 1, nullContactRelevanceBurdenRange: [0, 54], debateJudgmentsMaximum: 0 },
  artifacts: { output, execution },
  futureOutputPathsExcludedFromSourceHashes: [output, execution],
  sourceHashes
};
if (shouldWrite) { await mkdir(path.resolve(root, recoveryRoot), { recursive: true }); await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`); }
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", correctedSyntheticContexts: 1, exactSharedSchema: true, relevanceBurdenValue: 50, debateJudgmentsAuthorized: false, maximumMeteredCostUsd: 0 }, null, 2));
