#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { V388_RECON_ROOT, assertV388Recon, readBytes, readJson, sha256 } from "./lib/v388-reconstruction.mjs";

const root = process.cwd(), debateNumber = process.argv[2];
assertV388Recon(debateNumber, "debate number required");
const correctionRoot = `${V388_RECON_ROOT}/prose-correction/debate-${debateNumber}`;
const manifest = await readJson(root, `${correctionRoot}/execution-manifest.json`);
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex", authSource = path.join(os.homedir(), ".codex", "auth.json");
const run = (command, args, options = {}, timeoutMs = null) => new Promise((resolve) => {
  const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] }); let stdout = "", stderr = "", timedOut = false;
  child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); }); child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
  const timer = timeoutMs === null ? null : setTimeout(() => { timedOut = true; child.kill("SIGTERM"); }, timeoutMs);
  child.on("close", (code, signal) => { if (timer) clearTimeout(timer); resolve({ code, signal, stdout, stderr, timedOut }); });
});
assertV388Recon(manifest.status === "frozen-critique-only-correction-authorized" && manifest.authorization.correctionModelExecution && manifest.executionPolicy.retriesAuthorized === 0, "correction execution unauthorized");
for (const [relativePath, digest] of Object.entries(manifest.sourceHashes)) assertV388Recon(sha256(await readBytes(root, relativePath)) === digest, `${relativePath}: source hash mismatch`);
for (const future of [manifest.output, manifest.artifacts.execution]) { try { await access(path.resolve(root, future)); throw new Error(`${future}: future artifact exists`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
await access(codex); await access(authSource);
const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v388-prose-correction-${debateNumber}-`));
const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v388-home-prose-correction-${debateNumber}-`));
const startedAt = new Date().toISOString(), started = Date.now(); let record;
try {
  for (const [source, target] of [[`${V388_RECON_ROOT}/prose-correction/manual.md`, "manual.md"], ["docs/reassessment-rubric-v3.8.4.md", "rubric.md"], [manifest.packet, "packet.json"], [manifest.schema, "schema.json"]]) await copyFile(path.resolve(root, source), path.join(temporary, target));
  await copyFile(authSource, path.join(temporaryCodexHome, "auth.json")); const environment = { ...process.env, CODEX_HOME: temporaryCodexHome }; delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
  const prompt = `Read manual.md, rubric.md, packet.json, and schema.json completely and no other files. Act only as the isolated critique correction editor for Debate ${debateNumber}. Correct each listed critique to 115-125 words while preserving its source-grounded verdict, locked score, strongest feature, principal limitation, live burden, and score-band explanation. Return exactly one schema-conforming JSON object. Do not emit scores, tags, winner language, Overall Commentary, AI Extension material, progress commentary, or any other field.`;
  const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
  const events = extractTransportEvents(invocation.stderr), transportClassification = classifyTransportEventCount(events.length, 3, 8);
  const base = { debateNumber, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, terminationSignal: invocation.signal, commandExitCode: invocation.code, authentication: "ChatGPT subscription", apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0, recoverableStreamEvents: events.length, transportClassification, transportEventLines: events, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
  if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) record = { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, deterministicValidationPassed: false };
  else {
    await copyFile(path.join(temporary, "result.json"), path.resolve(root, manifest.output));
    const validation = await run(process.execPath, ["scripts/validate-v388-reconstruction-prose-correction-output.mjs", manifest.output, manifest.packet], { cwd: root, env: process.env });
    const valid = validation.code === 0 && transportClassification !== "invalid";
    record = { ...base, status: valid ? `completed-valid-${transportClassification}` : "output-validation-failed", outputWritten: true, outputSha256: sha256(await readBytes(root, manifest.output)), deterministicValidationPassed: validation.code === 0, diagnosticAcceptancePassed: valid, validationMessage: validation.code === 0 ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-4000), validationSummary: validation.code === 0 ? JSON.parse(validation.stdout) : null };
  }
} finally { await rm(temporary, { recursive: true, force: true }); await rm(temporaryCodexHome, { recursive: true, force: true }); }
const execution = { schemaVersion: "3.8.8-reconstruction-prose-correction-model-execution", protocolId: manifest.protocolId, status: record.diagnosticAcceptancePassed ? "passed" : "failed-closed", completedAt: new Date().toISOString(), meteredApiCostUsd: 0, retries: 0, result: record };
await writeFile(path.resolve(root, manifest.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
assertV388Recon(record.diagnosticAcceptancePassed, "prose correction failed; merge remains blocked");
console.log(JSON.stringify({ status: "passed", debateNumber, correctedCritiques: record.validationSummary.correctedCritiques, meteredApiCostUsd: 0, deterministicMergeAuthorized: false }, null, 2));
