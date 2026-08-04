#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { V388_CONTACT_ROOT, assert } from "./lib/v388-burden-contact.mjs";

const root = process.cwd();
const recoveryRoot = `${V388_CONTACT_ROOT}/evidence-recovery`;
const manifest = JSON.parse(await readFile(path.resolve(root, `${recoveryRoot}/execution-manifest.json`), "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const readBytes = (file) => readFile(path.resolve(root, file));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assert(manifest.status === "frozen-one-context-authorized" && manifest.authorization.evidenceRecoveryModelExecution && !manifest.authorization.semanticClassificationChange && !manifest.stopRules.furtherAutomaticRetryAuthorized, "evidence recovery execution unauthorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await readBytes(file)) === digest, `source hash mismatch: ${file}`);
for (const output of manifest.futureOutputPathsExcludedFromSourceHashes) { try { await access(path.resolve(root, output)); throw new Error(`future output already exists: ${output}`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
await access(codex); await access(authSource);
const run = (command, args, options = {}, timeoutMs = null) => new Promise((resolve) => { const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] }); let stdout = "", stderr = "", timedOut = false, forceTimer = null; child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); }); child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); }); const timer = timeoutMs === null ? null : setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs); child.on("error", (error) => resolve({ code: null, signal: null, stdout, stderr, timedOut, spawnError: error.message })); child.on("close", (code, signal) => { if (timer) clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut, spawnError: null }); }); });
const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-v388-contact-evidence-recovery-"));
const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), "slugfester-v388-home-contact-evidence-recovery-"));
const startedAt = new Date().toISOString();
const started = Date.now();
let record;
try {
  for (const [source, target] of [[manifest.context.manual, "manual.md"], [manifest.context.packet, "packet.json"], [manifest.context.schema, "schema.json"]]) await copyFile(path.resolve(root, source), path.join(temporary, target));
  await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
  const environment = { ...process.env, CODEX_HOME: temporaryCodexHome }; delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
  const prompt = "Read manual.md, packet.json, and schema.json completely and no other files. Act only as the isolated evidence-recovery reviewer. Process both targets in packet order and supply for each one exact case-sensitive substring occurring once in its locked atomic excerpt that supports its immutable original rationale. Return exactly one final schema-conforming JSON object with no progress commentary. You cannot change or reconsider bundle identities, anonymous options, rationales, semantic classifications, any other field or move, any score, or any assessment prose.";
  const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
  const eventLines = extractTransportEvents(invocation.stderr);
  const transportClassification = classifyTransportEventCount(eventLines.length, manifest.executionPolicy.recoverableStreamEventsNormalMaximum, manifest.executionPolicy.recoverableStreamEventsHardMaximum);
  const base = { recoveryId: manifest.context.recoveryId, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, terminationSignal: invocation.signal, commandExitCode: invocation.code, subscriptionAuthenticated: true, apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, recoverableStreamEvents: eventLines.length, transportClassification, transportEventLines: eventLines, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr), spawnError: invocation.spawnError };
  if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) record = { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, gateAcceptancePassed: false };
  else {
    await copyFile(path.join(temporary, "result.json"), path.resolve(root, manifest.context.output));
    const validation = await run(process.execPath, ["scripts/validate-v388-contact-evidence-recovery.mjs", manifest.context.output, manifest.context.packet, manifest.context.schema], { cwd: root, env: process.env });
    const contentValid = validation.code === 0, transportValid = transportClassification !== "invalid";
    record = { ...base, status: contentValid && transportValid ? `completed-valid-${transportClassification}` : !transportValid ? "recoverable-stream-event-limit-exceeded" : "output-validation-failed", outputWritten: true, outputSha256: sha256(await readBytes(manifest.context.output)), deterministicValidationPassed: contentValid, gateAcceptancePassed: contentValid && transportValid, validationExitCode: validation.code, validationMessage: contentValid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-4000), validationSummary: contentValid ? JSON.parse(validation.stdout) : null };
  }
} finally { await rm(temporary, { recursive: true, force: true }); await rm(temporaryCodexHome, { recursive: true, force: true }); }
const execution = { schemaVersion: "3.8.8-burden-contact-evidence-recovery-model-execution", protocolId: manifest.protocolId, startedAt, completedAt: new Date().toISOString(), contextsPlanned: 1, validOutputContexts: record.gateAcceptancePassed ? 1 : 0, totalAttempts: 1, totalRetries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, results: [record] };
await writeFile(path.resolve(root, manifest.artifacts.modelExecution), `${JSON.stringify(execution, null, 2)}\n`);
assert(execution.validOutputContexts === 1, "evidence recovery failed; compilation remains blocked");
console.log(JSON.stringify({ status: "evidence-recovery-passed", contexts: 1, semanticChangesAuthorized: false, meteredApiCostUsd: 0, compilationAuthorized: true, scoringAuthorized: false }, null, 2));
