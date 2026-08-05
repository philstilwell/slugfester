#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { V4_LEAN_ROOT, assertV4 } from "./lib/v4-lean-production.mjs";

const root = process.cwd();
const preflightRoot = `${V4_LEAN_ROOT}/schema-preflight`;
const manifest = JSON.parse(await readFile(path.resolve(root, `${preflightRoot}/execution-manifest.json`), "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(manifest.status === "frozen-one-synthetic-context-authorized" && manifest.syntheticOnly && manifest.authorization.syntheticSchemaPreflightModelExecution && !manifest.authorization.debatePrimaryModelExecution, "schema preflight unauthorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(path.resolve(root, file))) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
  try { await access(path.resolve(root, future)); throw new Error(`future output already exists: ${future}`); } catch (error) { if (error.code !== "ENOENT") throw error; }
}
await access(codex); await access(authSource);

function run(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = ""; let timedOut = false; let forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); });
    child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
    child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut }); });
  });
}

const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-v4-lean-preflight-"));
const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), "slugfester-v4-lean-home-preflight-"));
const startedAt = new Date().toISOString(); const started = Date.now();
let record;
try {
  for (const [source, target] of [[manifest.inputs.workflowBase, "workflow-base.md"], [manifest.inputs.workflow, "workflow.md"], [manifest.inputs.rubricBase, "rubric-base.md"], [manifest.inputs.rubric, "rubric.md"], [manifest.inputs.manual, "manual.md"], [manifest.inputs.packet, "packet.json"], [manifest.inputs.schema, "schema.json"], [manifest.inputs.transcript, "transcript.txt"], [manifest.inputs.events, "events.json"]]) await copyFile(path.resolve(root, source), path.join(temporary, target));
  await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
  const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
  delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
  const prompt = "Read workflow-base.md, workflow.md, rubric-base.md, rubric.md, manual.md, packet.json, schema.json, transcript.txt, and events.json completely and no other files. The v4.0.1 amendment files govern any conflict with the base files. Act only as the synthetic isolated v4.0.1 primary judge. Use exactly four sections, select all eight substantive events as eight chronological moves, include one move per side in each section, and exercise the structural contracts without calculating totals or writing publication prose. Do not supply precision/clarity or epistemic-calibration scalar values; repository code derives them from the required closed findings. Return exactly one schema-conforming JSON object and no commentary.";
  const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
  const base = { model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, terminationSignal: invocation.signal, commandExitCode: invocation.code, subscriptionAuthenticated: true, apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
  if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) record = { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, deterministicValidationPassed: false };
  else {
    await copyFile(path.join(temporary, "result.json"), path.resolve(root, manifest.artifacts.output));
    const validation = await run(process.execPath, ["scripts/validate-v4-lean-primary-output.mjs", manifest.artifacts.output, manifest.inputs.packet], { cwd: root, env: process.env }, 120000);
    record = { ...base, status: validation.code === 0 ? "endpoint-preflight-passed" : "output-validation-failed", outputWritten: true, outputSha256: sha256(await readFile(path.resolve(root, manifest.artifacts.output))), deterministicValidationPassed: validation.code === 0, validationExitCode: validation.code, validationSummary: validation.code === 0 ? JSON.parse(validation.stdout) : null, validationMessage: validation.code === 0 ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-6000) };
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
  await rm(temporaryCodexHome, { recursive: true, force: true });
}
const execution = { schemaVersion: "4.0.1-lean-schema-preflight-execution", protocolId: manifest.protocolId, status: record.deterministicValidationPassed ? "endpoint-preflight-passed" : "failed", validSyntheticContexts: record.deterministicValidationPassed ? 1 : 0, attempts: 1, retries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, result: record, authorization: { retiredPrimaryPreparation: record.deterministicValidationPassed, retiredPrimaryModelExecution: false, scoreDerivation: false, productionMutation: false } };
await writeFile(path.resolve(root, manifest.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
assertV4(record.deterministicValidationPassed, "v4.0 exact-schema endpoint preflight failed");
console.log(JSON.stringify({ status: execution.status, validSyntheticContexts: 1, attempts: 1, retries: 0, elapsedMinutes: Number((record.elapsedMs / 60000).toFixed(2)), meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
