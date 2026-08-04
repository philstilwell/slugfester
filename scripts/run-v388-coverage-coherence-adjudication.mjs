#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { V388_CONSENSUS_ROOT, assert } from "./lib/v388-coverage-consensus.mjs";

const root = process.cwd();
const manifestPath = `${V388_CONSENSUS_ROOT}/coherence-adjudication/execution-manifest.json`;
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifest = await readJson(manifestPath);
assert(manifest.status === "frozen-one-context-authorized" && manifest.authorization.coherenceAdjudicationModelExecution && !manifest.authorization.scoringModelExecution && !manifest.stopRules.furtherAutomaticRetryAuthorized, "coherence execution not authorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await readBytes(file)) === digest, `source hash mismatch: ${file}`);
for (const output of manifest.futureOutputPathsExcludedFromSourceHashes) { try { await access(path.resolve(root, output)); throw new Error(`future output already exists: ${output}`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
await access(codex); await access(authSource);
function run(command, args, options = {}, timeoutMs = null) { return new Promise((resolve) => { const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] }); let stdout = "", stderr = "", timedOut = false, forceTimer = null; child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); }); child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); }); const timer = timeoutMs === null ? null : setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs); child.on("error", (error) => resolve({ code: null, signal: null, stdout, stderr, timedOut, spawnError: error.message })); child.on("close", (code, signal) => { if (timer) clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut, spawnError: null }); }); }); }
const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-v388-coherence-"));
const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), "slugfester-v388-home-coherence-"));
const startedAt = new Date().toISOString(), started = Date.now(); let record;
try {
  for (const [source, target] of [[manifest.modelInputs.workflow, "workflow.md"], [manifest.modelInputs.rubric, "rubric.md"], [manifest.modelInputs.manual, "manual.md"], [manifest.modelInputs.packet, "packet.json"], [manifest.modelInputs.schema, "schema.json"]]) await copyFile(path.resolve(root, source), path.join(temporary, target));
  await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
  const environment = { ...process.env, CODEX_HOME: temporaryCodexHome }; delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
  const prompt = "Read workflow.md, rubric.md, manual.md, packet.json, and schema.json completely and no other files. Act only as a fresh isolated coverage-coherence adjudicator. Decide the single atomic bundle and select exactly one supplied anonymous option as a whole. Do not infer pass identity, mix components, revisit candidate inclusion, add a third value, emit progress commentary, or emit provisional JSON. Return exactly one final schema-conforming JSON object. Do not classify burden contact, assign sections, weights, or importance, score participants, infer a winner, reconstruct prose, write Overall Commentary, or write an AI Extension.";
  process.stdout.write("\n[v3.8.8-coverage-coherence] starting 5.6 Sol Debate 103 (1 atomic bundle)\n");
  const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
  const transportEventLines = extractTransportEvents(invocation.stderr), transportClassification = classifyTransportEventCount(transportEventLines.length, manifest.executionPolicy.recoverableStreamEventsNormalMaximum, manifest.executionPolicy.recoverableStreamEventsHardMaximum);
  const base = { model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, atomicBundleCount: 1, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, terminationSignal: invocation.signal, commandExitCode: invocation.code, subscriptionAuthenticated: true, apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, recoverableStreamEvents: transportEventLines.length, transportClassification, transportEventLines, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr), spawnError: invocation.spawnError };
  if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) record = { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, gateAcceptancePassed: false };
  else {
    await copyFile(path.join(temporary, "result.json"), path.resolve(root, manifest.artifacts.output));
    const validation = await run(process.execPath, ["scripts/validate-v388-coverage-coherence-adjudication.mjs", manifest.artifacts.output, manifest.modelInputs.packet, manifest.modelInputs.schema], { cwd: root, env: process.env });
    const contentValid = validation.code === 0, transportValid = transportClassification !== "invalid";
    record = { ...base, status: contentValid && transportValid ? `completed-valid-${transportClassification}` : !transportValid ? "recoverable-stream-event-limit-exceeded" : "output-validation-failed", outputWritten: true, outputSha256: sha256(await readBytes(manifest.artifacts.output)), deterministicValidationPassed: contentValid, gateAcceptancePassed: contentValid && transportValid, validationExitCode: validation.code, validationMessage: contentValid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-4000), validationSummary: contentValid ? JSON.parse(validation.stdout) : null };
  }
} finally { await rm(temporary, { recursive: true, force: true }); await rm(temporaryCodexHome, { recursive: true, force: true }); }
const execution = { schemaVersion: "3.8.8-coverage-coherence-adjudication-model-execution", protocolId: manifest.protocolId, stage: manifest.stage, startedAt, completedAt: new Date().toISOString(), contextsPlanned: 1, validOutputContexts: record.gateAcceptancePassed ? 1 : 0, totalAttempts: 1, totalRetries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, results: [record] };
await writeFile(path.resolve(root, manifest.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
assert(record.gateAcceptancePassed, "coherence adjudication failed; consensus merge remains blocked");
console.log(JSON.stringify({ status: "v3.8.8-coverage-coherence-adjudication-passed", validOutputContexts: 1, atomicBundles: 1, transportClassification: record.transportClassification, meteredApiCostUsd: 0, deterministicConsensusMergeAuthorized: true, scoringAuthorized: false }, null, 2));
