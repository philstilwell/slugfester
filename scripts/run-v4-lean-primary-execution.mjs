#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { V4_LEAN_ROOT, assertV4 } from "./lib/v4-lean-production.mjs";

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.resolve(root, `${V4_LEAN_ROOT}/primary-execution-manifest.json`), "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(manifest.status === "frozen-three-context-authorized" && manifest.authorization.primaryModelExecution && !manifest.authorization.passBModelExecution, "primary execution unauthorized");
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

const results = [];
for (const context of manifest.contexts) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v401-primary-${context.debateNumber}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v401-home-primary-${context.debateNumber}-`));
  const startedAt = new Date().toISOString(); const started = Date.now();
  let record;
  try {
    for (const [source, target] of [[manifest.modelInputs.workflowBase, "workflow-base.md"], [manifest.modelInputs.workflow, "workflow.md"], [manifest.modelInputs.rubricBase, "rubric-base.md"], [manifest.modelInputs.rubric, "rubric.md"], [manifest.modelInputs.manual, "manual.md"], [manifest.modelInputs.schema, "schema.json"], [context.packet, "packet.json"], [context.transcript, "transcript.txt"], [context.events, "events.json"]]) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
    delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
    const prompt = `Read workflow-base.md, workflow.md, rubric-base.md, rubric.md, manual.md, packet.json, schema.json, transcript.txt, and events.json completely and no other files. The v4.0.1 amendments govern conflicts. Act only as the fresh isolated integrated primary judge for Debate ${context.debateNumber}. Build a complete four-to-seven-section source-grounded inventory for both sides, apply every structural and scoring contract, and return exactly one schema-conforming JSON object. Do not calculate totals, identify a winner, write publication prose, or supply precision/clarity or epistemic-calibration scalar values. The control selection, prior structural locks, legacy assessments, prior scores, prior winners, and other debates are unavailable.`;
    process.stdout.write(`\n[v4.0.1-primary] starting ${manifest.model.label} Debate ${context.debateNumber}\n`);
    const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
    const events = extractTransportEvents(invocation.stderr);
    const transportClassification = classifyTransportEventCount(events.length, 2, 8);
    const base = { debateNumber: context.debateNumber, debateId: context.debateId, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, terminationSignal: invocation.signal, commandExitCode: invocation.code, subscriptionAuthenticated: true, apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, recoverableStreamEvents: events.length, transportClassification, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) record = { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, gateAcceptancePassed: false };
    else {
      await mkdir(path.dirname(path.resolve(root, context.output)), { recursive: true });
      await copyFile(path.join(temporary, "result.json"), path.resolve(root, context.output));
      const validation = await run(process.execPath, ["scripts/validate-v4-lean-primary-output.mjs", context.output, context.packet], { cwd: root, env: process.env }, 120000);
      const valid = validation.code === 0 && transportClassification !== "invalid";
      record = { ...base, status: valid ? `completed-valid-${transportClassification}` : validation.code !== 0 ? "output-validation-failed" : "transport-event-limit-exceeded", outputWritten: true, outputSha256: sha256(await readFile(path.resolve(root, context.output))), deterministicValidationPassed: validation.code === 0, gateAcceptancePassed: valid, validationExitCode: validation.code, validationSummary: validation.code === 0 ? JSON.parse(validation.stdout) : null, validationMessage: validation.code === 0 ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-6000) };
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
  results.push(record);
}
const execution = { schemaVersion: "4.0.1-lean-primary-model-execution", protocolId: manifest.protocolId, status: results.every((item) => item.gateAcceptancePassed) ? "primary-execution-passed" : "primary-execution-failed", contextsPlanned: 3, validContexts: results.filter((item) => item.gateAcceptancePassed).length, attempts: results.length, retries: 0, totalElapsedMs: results.reduce((sum, item) => sum + item.elapsedMs, 0), meteredApiCostUsd: 0, transcriptionCostUsd: 0, results, authorization: { primaryAnalysis: results.every((item) => item.gateAcceptancePassed), furtherAutomaticRetry: false, passBModelExecution: false, productionMutation: false } };
await writeFile(path.resolve(root, manifest.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
assertV4(execution.validContexts === 3, "one or more v4.0.1 primary contexts failed; analysis is blocked");
console.log(JSON.stringify({ status: execution.status, validContexts: 3, attempts: 3, retries: 0, totalElapsedMinutes: Number((execution.totalElapsedMs / 60000).toFixed(2)), meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
