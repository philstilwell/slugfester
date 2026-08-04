#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { V3811_PERFORMANCE_ROOT, assertV3811 } from "./lib/v3811-performance-judgment.mjs";

const root = process.cwd();
const preflightRoot = `${V3811_PERFORMANCE_ROOT}/schema-preflight`;
const manifest = JSON.parse(await readFile(path.resolve(root, `${preflightRoot}/execution-manifest.json`), "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV3811(manifest.status === "frozen-one-synthetic-context-authorized" && manifest.authorization.syntheticSchemaPreflightModelExecution && !manifest.authorization.debatePerformanceModelExecution, "schema preflight unauthorized");
for (const [relativePath, digest] of Object.entries(manifest.sourceHashes)) assertV3811(sha256(await bytes(relativePath)) === digest, `source hash mismatch: ${relativePath}`);
for (const output of manifest.futureOutputPathsExcludedFromSourceHashes) {
  try { await access(path.resolve(root, output)); throw new Error(`future preflight output already exists: ${output}`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
await access(codex); await access(authSource);

function run(command, args, options = {}, timeoutMs = null) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", timedOut = false;
    child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); });
    child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
    const timer = timeoutMs === null ? null : setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);
    child.on("error", (error) => resolve({ code: null, signal: null, stdout, stderr, timedOut, spawnError: error.message }));
    child.on("close", (code, signal) => { if (timer) clearTimeout(timer); resolve({ code, signal, stdout, stderr, timedOut, spawnError: null }); });
  });
}

const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-v3811-schema-preflight-"));
const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), "slugfester-v3811-home-schema-preflight-"));
const startedAt = new Date().toISOString();
const started = Date.now();
let result;
try {
  await copyFile(path.resolve(root, manifest.input.schema), path.join(temporary, "schema.json"));
  await copyFile(path.resolve(root, manifest.input.packet), path.join(temporary, "packet.json"));
  await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
  const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
  delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
  const prompt = `Read packet.json completely. This is a synthetic structured-output schema and validator preflight. Do not assess any real debate or person. Return exactly one schema-conforming JSON object with debateNumber "schema-preflight", debateId "schema-preflight-no-debate-content", pass "A", and exactly seven move judgments in packet order. Copy each moveId, sectionId, side, speaker, sourceSpan, and lockedBurdenContact exactly from packet.json. Use high confidence and give every rationale enough detail to exceed its minimum length.

Move 1 schema-preflight-constructive-01: constructive-opening, no target IDs, 0 contacted of 0 total, responsiveness 75, charityTested false and charity 75.
Move 2 schema-preflight-full-answer-02: full-answer targeting schema-preflight-constructive-01, 1 of 1, responsiveness 80, charityTested true and charity 80.
Move 3 schema-preflight-partial-answer-03: partial-answer targeting schema-preflight-constructive-01, 1 of 2, responsiveness 70, charityTested false and charity 75.
Move 4 schema-preflight-diagnostic-defeat-04: diagnostic-defeat targeting schema-preflight-constructive-01, 1 of 1, responsiveness 80, charityTested true and charity 80.
Move 5 schema-preflight-relevant-nonanswer-05: relevant-nonanswer targeting schema-preflight-constructive-01, 0 of 1, responsiveness 50, charityTested false and charity 75.
Move 6 schema-preflight-justified-reframe-06: justified-reframe targeting schema-preflight-constructive-01, 1 of 2, responsiveness 80, charityTested true and charity 80.
Move 7 schema-preflight-nonanswer-07: nonanswer targeting schema-preflight-constructive-01, 0 of 1, responsiveness 30, charityTested false and charity 75.

For every move use 75 for logicalCoherence, evidenceWarrant, precisionClarity, and epistemicCalibration; use relevanceBurden 54 because null contact permits 0 through 54. Use the specified responsiveness and charity values. Use zero burden adjustments for both sides with all eligibility booleans false, empty affected and related arrays, nonempty alreadyCapturedBy, and all audit affirmations true with moveCount 7. Emit no commentary.`;
  const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
  const base = { startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, commandExitCode: invocation.code, terminationSignal: invocation.signal, timedOut: invocation.timedOut, subscriptionAuthenticated: true, apiKeysRemoved: true, attemptCount: 1, retryCount: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr), spawnError: invocation.spawnError };
  if (invocation.code !== 0 || invocation.signal !== null || invocation.timedOut) result = { ...base, status: "endpoint-preflight-failed", outputWritten: false, packetAwareValidationPassed: false };
  else {
    await copyFile(path.join(temporary, "result.json"), path.resolve(root, manifest.artifacts.output));
    const validation = await run(process.execPath, ["scripts/validate-v3811-performance-judgment-output.mjs", manifest.artifacts.output, manifest.input.packet, "A"], { cwd: root, env: process.env });
    result = { ...base, status: validation.code === 0 ? "endpoint-preflight-passed" : "endpoint-accepted-output-validation-failed", outputWritten: true, outputSha256: sha256(await bytes(manifest.artifacts.output)), packetAwareValidationPassed: validation.code === 0, validationExitCode: validation.code, validationMessage: validation.code === 0 ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-4000), validationSummary: validation.code === 0 ? JSON.parse(validation.stdout) : null };
  }
} finally { await rm(temporary, { recursive: true, force: true }); await rm(temporaryCodexHome, { recursive: true, force: true }); }
const execution = { schemaVersion: "3.8.11-performance-schema-endpoint-preflight-execution", protocolId: manifest.protocolId, status: result.status, exactSharedSchemaSha256: manifest.input.schemaSha256, syntheticContexts: 1, syntheticMoves: 7, responseClassesExercised: 7, validSyntheticContexts: result.packetAwareValidationPassed ? 1 : 0, debateJudgments: 0, attempts: 1, retries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, result };
await writeFile(path.resolve(root, manifest.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
assertV3811(execution.validSyntheticContexts === 1, "schema endpoint preflight failed; debate execution remains blocked");
console.log(JSON.stringify({ status: "passed", exactSharedSchemaAcceptedByEndpoint: true, validSyntheticContexts: 1, syntheticMoves: 7, responseClassesExercised: 7, debateJudgments: 0, meteredApiCostUsd: 0, sixContextCleanPreregistrationAuthorized: true, scoreDerivationAuthorized: false }, null, 2));
