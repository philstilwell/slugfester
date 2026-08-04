#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { assertV388 } from "./lib/v388-performance-judgment.mjs";
import { V388_ADJUDICATION_ROOT } from "./lib/v388-performance-adjudication.mjs";

const root = process.cwd();
const manifestPath = `${V388_ADJUDICATION_ROOT}/execution-manifest.json`;
const manifest = JSON.parse(await readFile(path.resolve(root, manifestPath), "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const run = (command, args, options = {}, timeoutMs = null) => new Promise((resolve) => {
  const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "", timedOut = false, forceTimer = null;
  child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); });
  child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
  const timer = timeoutMs === null ? null : setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
  child.on("close", (code, signal) => { if (timer) clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut }); });
});

assertV388(manifest.status === "frozen-three-context-adjudication-authorized" && manifest.authorization.adjudicationModelExecution && !manifest.authorization.furtherAutomaticRetry && !manifest.authorization.scoreDerivation, "adjudication execution unauthorized");
for (const [relativePath, digest] of Object.entries(manifest.sourceHashes)) assertV388(sha256(await bytes(relativePath)) === digest, `${relativePath}: source hash mismatch`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) { try { await access(path.resolve(root, future)); throw new Error(`${future}: future output already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
await access(codex);
await access(authSource);

const results = [];
for (const context of manifest.contexts) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v388-adjudication-${context.debateNumber}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v388-home-adjudication-${context.debateNumber}-`));
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let record;
  try {
    for (const [source, target] of [[manifest.modelInputs.rubric, "rubric.md"], [manifest.modelInputs.manual, "manual.md"], [context.packet, "packet.json"], [context.schema, "schema.json"]]) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
    delete environment.OPENAI_API_KEY;
    delete environment.OPENAI_ORG_ID;
    delete environment.CODEX_API_KEY;
    const prompt = `Read rubric.md, manual.md, packet.json, and schema.json completely and no other files. Act only as the isolated dispute adjudicator for Debate ${context.debateNumber}. Candidate 1 and candidate 2 are anonymous and their ordering carries no signal. Decide every disputed move exactly once and in packet order. For each non-null response tuple or charity pair and for every listed rating key, choose exactly candidate 1 or candidate 2 from the supplied evidence and anchors; never invent, average, or revise a candidate. Treat a charity pair as indivisible. Decide each listed burden-adjustment side exactly once. Nondisputed performance fields, initial-pass rationales, full initial outputs, legacy assessments, calculated scores, winner labels, and publication prose are unavailable. Return exactly one schema-conforming JSON object with concise decision rationales, no progress commentary, no participant critique, no Overall Commentary, and no AI Extension.`;
    process.stdout.write(`\n[v3.8.8-adjudication] starting ${manifest.model.label} Debate ${context.debateNumber}\n`);
    const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
    const transportEventLines = extractTransportEvents(invocation.stderr);
    const transportClassification = classifyTransportEventCount(transportEventLines.length, manifest.executionPolicy.recoverableStreamEventsNormalMaximum, manifest.executionPolicy.recoverableStreamEventsHardMaximum);
    const base = { debateNumber: context.debateNumber, debateId: context.debateId, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, disputedMoves: context.disputedMoves, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, terminationSignal: invocation.signal, commandExitCode: invocation.code, authentication: "ChatGPT subscription", apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0, recoverableStreamEvents: transportEventLines.length, transportClassification, transportEventLines, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) record = { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, gateAcceptancePassed: false };
    else {
      await mkdir(path.dirname(path.resolve(root, context.output)), { recursive: true });
      await copyFile(path.join(temporary, "result.json"), path.resolve(root, context.output));
      const validation = await run(process.execPath, ["scripts/validate-v388-performance-adjudication-output.mjs", context.output, context.packet], { cwd: root, env: process.env });
      const contentValid = validation.code === 0;
      const transportValid = transportClassification !== "invalid";
      record = { ...base, status: contentValid && transportValid ? `completed-valid-${transportClassification}` : !transportValid ? "recoverable-stream-event-limit-exceeded" : "output-validation-failed", outputWritten: true, outputSha256: sha256(await bytes(context.output)), deterministicValidationPassed: contentValid, gateAcceptancePassed: contentValid && transportValid, validationExitCode: validation.code, validationMessage: contentValid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-6000), validationSummary: contentValid ? JSON.parse(validation.stdout) : null };
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
  results.push(record);
}

const execution = { schemaVersion: "3.8.8-performance-adjudication-model-execution", protocolId: manifest.protocolId, stage: manifest.stage, startedAt: results[0]?.startedAt ?? null, completedAt: new Date().toISOString(), contextsPlanned: 3, validContexts: results.filter((item) => item.gateAcceptancePassed).length, disputedMovesDecided: results.reduce((sum, item) => sum + (item.gateAcceptancePassed ? item.disputedMoves : 0), 0), attempts: results.length, retries: 0, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0, results };
await writeFile(path.resolve(root, manifest.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
assertV388(execution.validContexts === 3 && execution.disputedMovesDecided === 76, "adjudication execution failed; final ledger and scores remain blocked");
console.log(JSON.stringify({ status: "v3.8.8-performance-adjudication-passed", validContexts: 3, disputedMovesDecided: 76, retries: 0, meteredApiCostUsd: 0, finalLedgerAssemblyAuthorized: true, scoreDerivationAuthorized: false }, null, 2));
