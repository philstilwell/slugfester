#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import {
  V388_RECON_ROOT, assertV388Recon, readBytes, readJson, sha256
} from "./lib/v388-reconstruction.mjs";

const root = process.cwd();
const manifestPath = process.argv[2] ?? `${V388_RECON_ROOT}/execution-manifest.json`;
const manifest = await readJson(root, manifestPath);
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const run = (command, args, options = {}, timeoutMs = null) => new Promise((resolve) => {
  const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "", timedOut = false, forceTimer = null;
  child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); });
  child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
  const timer = timeoutMs === null ? null : setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
  child.on("close", (code, signal) => { if (timer) clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut }); });
});

assertV388Recon(["frozen-three-context-recovered-diagnostic-authorized", "frozen-schema-compatibility-recovery-authorized"].includes(manifest.status) && manifest.authorization.reconstructionModelExecution && manifest.executionPolicy.retriesAuthorized === 0, "reconstruction execution unauthorized");
for (const [relativePath, digest] of Object.entries(manifest.sourceHashes)) assertV388Recon(sha256(await readBytes(root, relativePath)) === digest, `${relativePath}: source hash mismatch`);
for (const future of manifest.futureOutputs) { try { await access(path.resolve(root, future)); throw new Error(`${future}: future output already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
await access(codex); await access(authSource);

const results = [];
for (const context of manifest.contexts) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v388-reconstruction-${context.debateNumber}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v388-home-reconstruction-${context.debateNumber}-`));
  const startedAt = new Date().toISOString(), started = Date.now();
  let record;
  try {
    for (const [source, target] of [
      ["docs/assessment-workflow-v3.8.4.md", "workflow.md"], ["docs/reassessment-rubric-v3.8.4.md", "rubric.md"],
      [`${V388_RECON_ROOT}/manual.md`, "manual.md"], [context.packet, "packet.json"], [context.schema, "schema.json"],
      [context.transcript, "transcript.txt"], [context.events, "events.json"], [context.sourceManifest, "source-manifest.json"]
    ]) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
    delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
    const prompt = `Read workflow.md, rubric.md, manual.md, packet.json, schema.json, transcript.txt, events.json, and source-manifest.json completely and no other files. Act only as the fresh isolated assessment reconstructor for Debate ${context.debateNumber}. Legacy scores, critiques, tags, prose, rankings, winner labels, and prior AI Extension material are unavailable. Preserve every locked identity and calculated score. Select representative final-ledger moves from every section for both sides, use only the locked verified quote text, and draft score-calibrated critiques, Overall Commentary, optional post-scoring tags, and the separately disclosed balanced AI Extension. Map every AI Extension thesis, premise, conclusion, and new argument to transcript moves or mark it introduced with an empty source list. Return exactly one final schema-conforming JSON object with no progress commentary or prose outside JSON.`;
    process.stdout.write(`\n[v3.8.8-reconstruction] starting ${manifest.model.label} Debate ${context.debateNumber}\n`);
    const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
    const transportEventLines = extractTransportEvents(invocation.stderr);
    const transportClassification = classifyTransportEventCount(transportEventLines.length, 3, 8);
    const base = { debateNumber: context.debateNumber, debateId: context.debateId, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, terminationSignal: invocation.signal, commandExitCode: invocation.code, authentication: "ChatGPT subscription", apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0, recoverableStreamEvents: transportEventLines.length, transportClassification, transportEventLines, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) record = { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, diagnosticAcceptancePassed: false };
    else {
      await mkdir(path.dirname(path.resolve(root, context.output)), { recursive: true });
      await copyFile(path.join(temporary, "result.json"), path.resolve(root, context.output));
      const validation = await run(process.execPath, ["scripts/validate-v388-reconstruction-output.mjs", context.output, context.packet], { cwd: root, env: process.env });
      const contentValid = validation.code === 0, transportValid = transportClassification !== "invalid";
      record = { ...base, status: contentValid && transportValid ? `completed-valid-${transportClassification}` : !transportValid ? "recoverable-stream-event-limit-exceeded" : "output-validation-failed", outputWritten: true, outputSha256: sha256(await readBytes(root, context.output)), deterministicValidationPassed: contentValid, diagnosticAcceptancePassed: contentValid && transportValid, validationExitCode: validation.code, validationMessage: contentValid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-8000), validationSummary: contentValid ? JSON.parse(validation.stdout) : null };
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
  results.push(record);
  if (!record.diagnosticAcceptancePassed) break;
}
const execution = { schemaVersion: "3.8.8-reconstruction-model-execution", protocolId: manifest.protocolId, status: results.length === 3 && results.every((r) => r.diagnosticAcceptancePassed) ? "passed-three-recovered-diagnostic-reconstructions" : "failed-closed", startedAt: results[0]?.startedAt ?? null, completedAt: new Date().toISOString(), contextsPlanned: 3, contextsAttempted: results.length, validContexts: results.filter((r) => r.diagnosticAcceptancePassed).length, attempts: results.length, retries: 0, meteredApiCostUsd: 0, additionalTranscriptionEstimatedCostUsd: manifest.cost.additionalTranscriptionEstimatedCostUsd, productionMutationAuthorized: false, results };
await writeFile(path.resolve(root, manifest.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
assertV388Recon(execution.validContexts === 3, "reconstruction diagnostic failed; audit and preview remain blocked");
console.log(JSON.stringify({ status: execution.status, validContexts: 3, retries: 0, meteredApiCostUsd: 0, deterministicAuditAuthorized: true, calibrationPreviewAuthorized: false }, null, 2));
