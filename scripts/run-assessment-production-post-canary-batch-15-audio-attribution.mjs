#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { MODEL, ROOT, sha256, validateOutput } from "./lib/assessment-production-post-canary-batch-15-audio-attribution.mjs";

const root = process.cwd();
const manifest = JSON.parse(await readFile(`${ROOT}/execution-manifest.json`, "utf8"));
assert.equal(manifest.status, "frozen-two-batch-15-audio-attribution-recovery-contexts-active");
assert.equal(manifest.model.label, MODEL.label);
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.paidTranscriptionCalls, 0);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) await access(future).then(() => { throw new Error(`future output already exists: ${future}`); }, () => true);

const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
await access(codex);
await access(authSource);
function run(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
    child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut }); });
  });
}

async function executeContext(context) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-b15-audio-adj-${context.debateNumber}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-b15-audio-home-${context.debateNumber}-`));
  const startedAt = new Date().toISOString();
  const started = Date.now();
  try {
    await copyFile(path.resolve(root, manifest.workflow), path.join(temporary, "workflow.md"));
    await copyFile(path.resolve(root, manifest.manual), path.join(temporary, "manual.md"));
    await copyFile(path.resolve(root, context.packet), path.join(temporary, "packet.json"));
    await copyFile(path.resolve(root, context.schema), path.join(temporary, "schema.json"));
    const transcriptNames = [];
    for (let index = 0; index < context.rawDiarizedTranscripts.length; index += 1) {
      const target = `audio-transcript-${index + 1}-${context.rawDiarizedTranscripts[index].moveId}.json`;
      transcriptNames.push(target);
      await copyFile(path.resolve(root, context.rawDiarizedTranscripts[index].path), path.join(temporary, target));
    }
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
    for (const key of manifest.executionPolicy.removedEnvironmentVariables) delete environment[key];
    const prompt = `Read workflow.md, manual.md, schema.json, packet.json, and ${transcriptNames.join(", ")} completely and no other files. Act only as the isolated 5.6 Sol/low audio-attribution adjudicator for Debate ${context.debateNumber}. Review every locked move in packet order, cite segment indexes from its corresponding transcript, and decide only expected-speaker authorship. Ratings, scores, legacy data, other debates, winners, and publication prose are unavailable. Return exactly one schema-conforming JSON object and no commentary.`;
    const invocation = await run(codex, [
      "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules",
      "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`,
      "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies",
      "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt,
    ], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
    const events = extractTransportEvents(invocation.stderr);
    const transportClassification = classifyTransportEventCount(events.length, 2, 8);
    const base = { debateNumber: context.debateNumber, debateId: context.debateId, moveIds: context.moveIds, model: manifest.model.label, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, terminationSignal: invocation.signal, commandExitCode: invocation.code, authentication: "ChatGPT subscription", apiKeysRemoved: true, directIncrementalCostUsd: 0, paidTranscriptionCalls: 0, recoverableStreamEvents: events.length, transportClassification, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr), stderrTail: invocation.stderr.trim().slice(-6000) || null };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) return { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, gateAcceptancePassed: false };
    const resultPath = path.join(temporary, "result.json");
    const resultBytes = await readFile(resultPath);
    await writeFile(context.output, resultBytes);
    let validation = null;
    let validationMessage = null;
    try {
      validation = await validateOutput(JSON.parse(resultBytes), JSON.parse(await readFile(context.packet)));
    } catch (error) {
      validationMessage = String(error?.stack ?? error).slice(-6000);
    }
    const valid = validation !== null && transportClassification !== "invalid";
    return { ...base, status: valid ? `completed-valid-${transportClassification}` : validation ? "transport-event-limit-exceeded" : "output-validation-failed", outputWritten: true, outputSha256: sha256(resultBytes), deterministicValidationPassed: validation !== null, gateAcceptancePassed: valid, validationSummary: validation, validationMessage };
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
}

const startedAt = new Date().toISOString();
const started = Date.now();
const results = [];
for (const context of manifest.contexts) {
  if (results.some((result) => !result.gateAcceptancePassed)) break;
  results.push(await executeContext(context));
}
const passed = results.every((item) => item.gateAcceptancePassed);
const execution = { schemaVersion: "1.0-assessment-production-post-canary-batch-15-audio-attribution-model-execution", protocolId: manifest.protocolId, status: passed ? "batch-15-audio-attribution-recovery-execution-passed" : "batch-15-audio-attribution-recovery-execution-failed", startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, contexts: 2, attempts: results.length, retries: 0, directIncrementalCostUsd: 0, paidTranscriptionCalls: 0, scoresDerived: 0, results, authorization: { analysis: passed, furtherRetry: false, paidTranscription: false, disputeAdjudicationPreparation: false, scoreDerivation: false, productionMutation: false, nextBatchSelection: false } };
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: execution.status, elapsedMinutes: Number((execution.elapsedMs / 60000).toFixed(2)), contexts: 2, attempts: results.length, retries: 0, valid: results.filter((item) => item.gateAcceptancePassed).length, directIncrementalCostUsd: 0, paidTranscriptionCalls: 0, scoresDerived: 0 }, null, 2));
assert(passed, "Batch 15 audio-attribution recovery execution failed; downstream work is blocked");
