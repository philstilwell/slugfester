#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { V389_PERFORMANCE_ROOT, assertV389 } from "./lib/v389-performance-judgment.mjs";

const root = process.cwd();
const preflightRoot = `${V389_PERFORMANCE_ROOT}/schema-preflight`;
const manifest = JSON.parse(await readFile(path.resolve(root, `${preflightRoot}/execution-manifest.json`), "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV389(manifest.status === "frozen-one-synthetic-context-authorized" && manifest.authorization.syntheticSchemaPreflightModelExecution && !manifest.authorization.debatePerformanceModelExecution, "schema preflight unauthorized");
for (const [relativePath, digest] of Object.entries(manifest.sourceHashes)) assertV389(sha256(await bytes(relativePath)) === digest, `source hash mismatch: ${relativePath}`);
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

const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-v389-schema-preflight-"));
const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), "slugfester-v389-home-schema-preflight-"));
const startedAt = new Date().toISOString();
const started = Date.now();
let result;
try {
  await copyFile(path.resolve(root, manifest.input.schema), path.join(temporary, "schema.json"));
  await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
  const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
  delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
  const prompt = `This is a synthetic structured-output schema preflight. Do not assess any real debate or person. Return exactly one schema-conforming JSON object with debateNumber "schema-preflight", debateId "schema-preflight-no-debate-content", pass "A", and one constructive move judgment: moveId "schema-preflight-constructive-01", sectionId "section-01", side "pro", speaker "Synthetic Speaker", sourceSpan startEvent 0 endEvent 0 startMs 0 endMs 1, null lockedBurdenContact, and a constructive-opening response with empty target IDs and zero component counts. Use 75 for all ratings except relevanceBurden, which must be 54 because null burden contact permits only 0 through 54. State that charity was not tested, set charityTested false, high confidence, and use zero adjustments for both sides with all eligibility booleans false, empty affected and related arrays, a nonempty alreadyCapturedBy list, and all audit affirmations true. Use sufficiently detailed rationales to satisfy every minimum length. Emit no commentary.`;
  const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
  const base = { startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, commandExitCode: invocation.code, terminationSignal: invocation.signal, timedOut: invocation.timedOut, subscriptionAuthenticated: true, apiKeysRemoved: true, attemptCount: 1, retryCount: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr), spawnError: invocation.spawnError };
  if (invocation.code !== 0 || invocation.signal !== null || invocation.timedOut) result = { ...base, status: "endpoint-preflight-failed", outputWritten: false, packetAwareValidationPassed: false };
  else {
    await copyFile(path.join(temporary, "result.json"), path.resolve(root, manifest.artifacts.output));
    const validation = await run(process.execPath, ["scripts/validate-v389-performance-judgment-output.mjs", manifest.artifacts.output, manifest.input.packet, "A"], { cwd: root, env: process.env });
    result = { ...base, status: validation.code === 0 ? "endpoint-preflight-passed" : "endpoint-accepted-output-validation-failed", outputWritten: true, outputSha256: sha256(await bytes(manifest.artifacts.output)), packetAwareValidationPassed: validation.code === 0, validationExitCode: validation.code, validationMessage: validation.code === 0 ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-4000), validationSummary: validation.code === 0 ? JSON.parse(validation.stdout) : null };
  }
} finally { await rm(temporary, { recursive: true, force: true }); await rm(temporaryCodexHome, { recursive: true, force: true }); }
const execution = { schemaVersion: "3.8.9-performance-schema-endpoint-preflight-execution", protocolId: manifest.protocolId, status: result.status, exactSharedSchemaSha256: manifest.input.schemaSha256, syntheticContexts: 1, validSyntheticContexts: result.packetAwareValidationPassed ? 1 : 0, debateJudgments: 0, attempts: 1, retries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, result };
await writeFile(path.resolve(root, manifest.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
assertV389(execution.validSyntheticContexts === 1, "schema endpoint preflight failed; debate execution remains blocked");
console.log(JSON.stringify({ status: "passed", exactSharedSchemaAcceptedByEndpoint: true, validSyntheticContexts: 1, debateJudgments: 0, meteredApiCostUsd: 0, sixContextRecoveryPreregistrationAuthorized: true, scoreDerivationAuthorized: false }, null, 2));
