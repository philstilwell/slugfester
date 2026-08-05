#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V415_PASS_B_ROOT } from "./lib/v415-triggered-consensus.mjs";

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.resolve(root, `${V415_PASS_B_ROOT}/schema-preflight/execution-manifest.json`), "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(manifest.status === "frozen-one-synthetic-pass-b-context-authorized" && manifest.authorization.syntheticPassBModelExecution && !manifest.authorization.debatePassBModelExecution, "Pass B preflight unauthorized");
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

const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-v415-pass-b-preflight-"));
const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), "slugfester-v415-home-pass-b-preflight-"));
const startedAt = new Date().toISOString(); const started = Date.now();
let record;
try {
  const copies = [["workflow", "workflow-v40.md"], ["workflowBounded", "workflow-v41.md"], ["workflowConsistency", "workflow-v413.md"], ["workflowBurdenTuple", "workflow-v414.md"], ["workflowTiming", "workflow-v415.md"], ["rubricBase", "rubric-v40.md"], ["rubricBounded", "rubric-v41.md"], ["manual", "manual.md"], ["packet", "packet.json"], ["schema", "schema.json"], ["transcript", "transcript.txt"], ["events", "events.json"]];
  for (const [key, target] of copies) await copyFile(path.resolve(root, manifest.inputs[key]), path.join(temporary, target));
  await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
  const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
  delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
  const prompt = "Read workflow-v40.md, workflow-v41.md, workflow-v413.md, workflow-v414.md, workflow-v415.md, rubric-v40.md, rubric-v41.md, manual.md, packet.json, schema.json, transcript.txt, and events.json completely and no other files. Act only as the isolated synthetic Sol/high triggered Pass B judge. Judge all locked moves independently and in lockedMoveOrder. Primary judgments, ratings, totals, triggers, comparator, control selection, legacy data, and other debates are unavailable. Run every response, burden-reference, rating-band, charity, and adjustment consistency check before submission. Return exactly one schema-conforming JSON object and no commentary.";
  const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
  const transportEvents = extractTransportEvents(invocation.stderr);
  const transportClassification = classifyTransportEventCount(transportEvents.length, 2, 8);
  const base = { model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, terminationSignal: invocation.signal, commandExitCode: invocation.code, subscriptionAuthenticated: true, apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, recoverableStreamEvents: transportEvents.length, transportClassification, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
  if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) record = { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, deterministicValidationPassed: false };
  else {
    await copyFile(path.join(temporary, "result.json"), path.resolve(root, manifest.artifacts.output));
    const validation = await run(process.execPath, ["scripts/validate-v415-pass-b-output.mjs", manifest.artifacts.output, manifest.inputs.packet, manifest.inputs.sourcePacket], { cwd: root, env: process.env }, 120000);
    const valid = validation.code === 0 && transportClassification !== "invalid";
    record = { ...base, status: valid ? `endpoint-preflight-passed-${transportClassification}` : validation.code !== 0 ? "output-validation-failed" : "transport-event-limit-exceeded", outputWritten: true, outputSha256: sha256(await readFile(path.resolve(root, manifest.artifacts.output))), deterministicValidationPassed: validation.code === 0, gateAcceptancePassed: valid, validationExitCode: validation.code, validationSummary: validation.code === 0 ? JSON.parse(validation.stdout) : null, validationMessage: validation.code === 0 ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-6000) };
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
  await rm(temporaryCodexHome, { recursive: true, force: true });
}
const passed = record.gateAcceptancePassed === true;
const execution = { schemaVersion: "4.1.5-triggered-pass-b-schema-preflight-execution", protocolId: manifest.protocolId, status: passed ? "endpoint-preflight-passed" : "failed", validSyntheticContexts: passed ? 1 : 0, attempts: 1, retries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, result: record, authorization: { debatePassBPreparation: passed, debatePassBModelExecution: false, disagreementExtraction: false, adjudication: false, productionMutation: false } };
await writeFile(path.resolve(root, manifest.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
assertV4(passed, "v4.1.5 triggered Pass B endpoint preflight failed");
console.log(JSON.stringify({ status: execution.status, validSyntheticContexts: execution.validSyntheticContexts, attempts: 1, retries: 0, elapsedMinutes: Number((record.elapsedMs / 60000).toFixed(2)), recoverableStreamEvents: record.recoverableStreamEvents, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
