#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { validateV4217Prose, V4217_ROOT } from "./lib/v4217-finalization-gate.mjs";

const manifest = JSON.parse(await readFile(`${V4217_ROOT}/execution-manifest.json`, "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex", auth = path.join(os.homedir(), ".codex", "auth.json"), sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(manifest.status === "frozen-three-retired-no-truncation-contexts-authorized" && manifest.authorization.modelExecution && !manifest.authorization.proseMutation, "v4.2.17 unauthorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
for (const file of manifest.futureOutputPathsExcludedFromSourceHashes) await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);
await access(codex); await access(auth);
function run(command, args, options, timeoutMs) { return new Promise((resolve) => { const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] }); let stdout = "", stderr = "", timedOut = false, force = null; child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; }); const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); force = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs); child.on("close", (code, signal) => { clearTimeout(timer); if (force) clearTimeout(force); resolve({ code, signal, stdout, stderr, timedOut }); }); }); }
const results = [];
for (const context of manifest.contexts) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v4217-${context.debateNumber}-`)), home = await mkdtemp(path.join(os.tmpdir(), `slugfester-v4217-home-${context.debateNumber}-`)), startedAt = new Date().toISOString(), started = Date.now();
  let record;
  try {
    const names = { workflow: "workflow.md", rubric: "rubric.md", manual: "manual.md", packet: "packet.json", schema: "schema.json" };
    for (const [key, source] of Object.entries(context.inputs)) await copyFile(source, path.join(temporary, names[key]));
    await copyFile(auth, path.join(home, "auth.json"));
    const env = { ...process.env, CODEX_HOME: home }; delete env.OPENAI_API_KEY; delete env.OPENAI_ORG_ID; delete env.CODEX_API_KEY;
    const prompt = `Read workflow.md, rubric.md, manual.md, packet.json, and schema.json completely and no other files. Act only as the isolated finalization editor for retired Debate ${context.debateNumber}. Treat packet.json as the complete source packet and preserve every locked identity, move, quotation, section, and calculated score. Draft the complete scorecard, critiques in exactly the four labeled sentences required by the manual, Overall Commentary with empty tag arrays, and the separately disclosed balanced AI Extension. Set aiExtension.disclaimer exactly to: "This section is an AI-generated contribution, not transcript content. Its wording is not attributable to either participant and it does not affect any participant score." Return exactly one schema-conforming JSON object and no commentary.`;
    process.stdout.write(`[v4.2.17-finalization] starting 5.6 Sol/low Debate ${context.debateNumber}\n`);
    const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort="${manifest.model.reasoningEffort}"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env }, manifest.executionPolicy.timeoutMsPerDebate);
    const events = extractTransportEvents(invocation.stderr), transportClassification = classifyTransportEventCount(events.length, 3, 8), exists = await access(path.join(temporary, "result.json")).then(() => true, () => false), base = { debateNumber: context.debateNumber, debateId: context.debateId, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, model: manifest.model.label, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, recoverableStreamEvents: events.length, transportClassification, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, authentication: "ChatGPT subscription", apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !exists) record = { ...base, status: invocation.timedOut ? "timed-out" : !exists ? "result-missing" : "transport-failed", accepted: false, rawOutputWritten: false, validatedOutputWritten: false };
    else {
      await mkdir(path.dirname(context.rawOutput), { recursive: true }); await copyFile(path.join(temporary, "result.json"), context.rawOutput);
      try {
        const raw = JSON.parse(await readFile(context.rawOutput, "utf8")), localValidation = validateV4217Prose(raw);
        const validation = await run(process.execPath, ["scripts/validate-v388-reconstruction-output.mjs", context.rawOutput, context.inputs.packet], { cwd: process.cwd(), env: process.env }, 120000), contentValid = validation.code === 0, accepted = contentValid && transportClassification !== "invalid";
        if (contentValid) { await mkdir(path.dirname(context.validatedOutput), { recursive: true }); await writeFile(context.validatedOutput, `${JSON.stringify(raw, null, 2)}\n`); }
        record = { ...base, status: accepted ? "completed-valid-untouched" : !contentValid ? "raw-output-validation-failed" : "transport-event-limit-exceeded", accepted, rawOutputWritten: true, rawOutputSha256: sha256(await readFile(context.rawOutput)), validatedOutputWritten: contentValid, validatedOutputSha256: contentValid ? sha256(await readFile(context.validatedOutput)) : null, proseMutations: 0, localValidation, validationSummary: contentValid ? JSON.parse(validation.stdout) : null, validationMessage: contentValid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-8000) };
      } catch (error) { record = { ...base, status: "raw-output-validation-failed", accepted: false, rawOutputWritten: true, rawOutputSha256: sha256(await readFile(context.rawOutput)), validatedOutputWritten: false, proseMutations: 0, validationMessage: error.stack }; }
    }
  } finally { await rm(temporary, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
  results.push(record); process.stdout.write(`[v4.2.17-finalization] Debate ${context.debateNumber} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
}
const passed = results.length === 3 && results.every((result) => result.accepted), execution = { schemaVersion: "4.2.17-no-truncation-finalization-model-execution", protocolId: manifest.protocolId, status: passed ? "three-debate-no-truncation-execution-passed" : "three-debate-no-truncation-execution-failed", contexts: 3, attempts: 3, retries: 0, correctionContexts: 0, proseMutations: 0, validContexts: results.filter((result) => result.accepted).length, totalElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0), meanElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0) / results.length, results, meteredApiCostUsd: 0, transcriptionCostUsd: 0, authorization: { analysis: true, retry: false, correctionModelExecution: false, proseMutation: false, scoring: false } };
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: execution.status, validContexts: execution.validContexts, elapsedMinutesByDebate: Object.fromEntries(results.map((result) => [result.debateNumber, Number((result.elapsedMs / 60000).toFixed(2))])), meanElapsedMinutes: Number((execution.meanElapsedMs / 60000).toFixed(2)), correctionContexts: 0, proseMutations: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
