#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V416_ADJUDICATION_ROOT } from "./lib/v416-adjudication.mjs";

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.resolve(root, `${V416_ADJUDICATION_ROOT}/schema-preflight/execution-manifest.json`), "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(manifest.status === "frozen-one-context-exact-schema-preflight" && manifest.authorization.modelExecution && !manifest.authorization.adjudicationModelExecution, "adjudication preflight unauthorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(path.resolve(root, file))) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assertV4(!(await access(path.resolve(root, future)).then(() => true, () => false)), `future output already exists: ${future}`);

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

const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-v416-adjudication-preflight-"));
const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), "slugfester-v416-home-adjudication-preflight-"));
const startedAt = new Date().toISOString(); const started = Date.now(); let record;
try {
  for (const [source, target] of [[manifest.inputs.rubricBase, "rubric-v40.md"], [manifest.inputs.rubricBounded, "rubric-v41.md"], [manifest.inputs.manual, "manual.md"], [manifest.inputs.packet, "packet.json"], [manifest.inputs.schema, "schema.json"]]) await copyFile(path.resolve(root, source), path.join(temporary, target));
  await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
  const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
  delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
  const prompt = "Read rubric-v40.md, rubric-v41.md, manual.md, packet.json, and schema.json completely and no other files. Act only as the isolated dispute-only schema-preflight adjudicator. Candidate numbers are anonymous. Decide every listed move and burden-adjustment dispute exactly once and in packet order. Choose only candidate 1 or candidate 2, keep response and charity pairs indivisible, and choose every listed scoring field. Return exactly one schema-conforming JSON object with concise rationales and no calculated scores or publication prose.";
  const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.timeoutMs);
  const transportEvents = extractTransportEvents(invocation.stderr);
  const transportClassification = classifyTransportEventCount(transportEvents.length, 2, 8);
  const base = { model: manifest.model, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, authentication: "ChatGPT subscription", apiKeysRemoved: true, meteredApiCostUsd: 0, recoverableStreamEvents: transportEvents.length, transportClassification, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
  if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) record = { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", gateAcceptancePassed: false };
  else {
    await copyFile(path.join(temporary, "result.json"), path.resolve(root, manifest.outputs.output));
    const validation = await run(process.execPath, ["scripts/validate-v416-adjudication-output.mjs", manifest.outputs.output, manifest.inputs.packet], { cwd: root, env: process.env }, 120000);
    const valid = validation.code === 0 && transportClassification !== "invalid";
    record = { ...base, status: valid ? "completed-valid" : "validation-failed", outputSha256: sha256(await readFile(path.resolve(root, manifest.outputs.output))), deterministicValidationPassed: validation.code === 0, gateAcceptancePassed: valid, validationSummary: validation.code === 0 ? JSON.parse(validation.stdout) : null, validationMessage: validation.code === 0 ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-6000) };
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
  await rm(temporaryCodexHome, { recursive: true, force: true });
}
const execution = { schemaVersion: "4.1.6-adjudication-schema-preflight-execution", protocolId: manifest.protocolId, status: record.gateAcceptancePassed ? "endpoint-preflight-passed" : "endpoint-preflight-failed", validSyntheticContexts: record.gateAcceptancePassed ? 1 : 0, attempts: 1, retries: 0, result: record, authorization: { freezeThreeContextAdjudicationExecutionManifest: record.gateAcceptancePassed, adjudicationModelExecution: false, scoreDerivation: false, productionMutation: false } };
await writeFile(path.resolve(root, manifest.outputs.execution), `${JSON.stringify(execution, null, 2)}\n`);
assertV4(record.gateAcceptancePassed, "adjudication exact-schema preflight failed");
console.log(JSON.stringify({ status: execution.status, validSyntheticContexts: execution.validSyntheticContexts, attempts: 1, retries: 0, elapsedMinutes: Number((record.elapsedMs / 60000).toFixed(2)), freezeThreeContextAdjudicationExecutionManifest: true, meteredApiCostUsd: 0 }, null, 2));
