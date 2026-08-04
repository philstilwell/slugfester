#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { sha256 } from "./lib/v388-reconstruction.mjs";

const root = process.cwd();
const manifestPath = process.argv[2] || "docs/calibration/v3.8.8/reconstruction/adversarial-audit/execution-manifest.json";
const manifest = JSON.parse(await readFile(path.resolve(root, manifestPath), "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const run = (command, args, options = {}, timeoutMs = null) => new Promise((resolve) => {
  const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "", timedOut = false, forceTimer = null;
  child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); });
  child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
  const timer = timeoutMs === null ? null : setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
    forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000);
  }, timeoutMs);
  child.on("close", (code, signal) => {
    if (timer) clearTimeout(timer);
    if (forceTimer) clearTimeout(forceTimer);
    resolve({ code, signal, stdout, stderr, timedOut });
  });
});

if (manifest.status !== "frozen-supplemental-audit-authorized" || !manifest.authorization.supplementalAuditModelExecution || manifest.authorization.reconstructionMutation || manifest.authorization.productionMutation || manifest.executionPolicy.retriesAuthorized !== 0) throw new Error("supplemental audit execution unauthorized");
for (const [relativePath, expected] of Object.entries(manifest.sourceHashes)) {
  if (sha256(await readFile(path.resolve(root, relativePath))) !== expected) throw new Error(`${relativePath}: source hash mismatch`);
}
for (const future of [...manifest.futureOutputs, manifest.artifacts.execution, manifest.artifacts.summary]) {
  try { await access(path.resolve(root, future)); throw new Error(`${future}: future artifact already exists`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
await access(codex);
await access(authSource);

const results = [];
for (const context of manifest.contexts) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v388-adversarial-${context.debateNumber}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v388-adversarial-home-${context.debateNumber}-`));
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let record;
  try {
    for (const [source, target] of [
      ["docs/assessment-workflow-v3.8.4.md", "workflow.md"],
      ["docs/reassessment-rubric-v3.8.4.md", "rubric.md"],
      ["docs/calibration/v3.8.8/reconstruction/adversarial-audit/manual.md", "manual.md"],
      ["docs/calibration/v3.8.8/reconstruction/adversarial-audit/schema.json", "schema.json"],
      [context.reconstruction, "reconstruction.json"],
      [context.packet, "packet.json"],
      [context.transcript, "transcript.txt"],
      [context.events, "events.json"],
      [context.sourceManifest, "source-manifest.json"]
    ]) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
    delete environment.OPENAI_API_KEY;
    delete environment.OPENAI_ORG_ID;
    delete environment.CODEX_API_KEY;
    const prompt = `Read workflow.md, rubric.md, manual.md, reconstruction.json, packet.json, transcript.txt, events.json, source-manifest.json, and schema.json completely and no other files. Act only as the isolated supplemental adversarial auditor for Debate ${context.debateNumber}. Do not edit, rescore, reconstruct, or write recommendations beyond concrete audit findings. Apply all ten checks in manual.md. Treat the locked calculated scores and quote records as immutable. Return exactly one schema-conforming JSON object, with completedAt set to the current time, no progress commentary, and no prose outside JSON.`;
    process.stdout.write(`\n[v3.8.8-adversarial-audit] starting ${manifest.model.label} Debate ${context.debateNumber}\n`);
    const invocation = await run(codex, [
      "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules",
      "--model", manifest.model.slug,
      "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`,
      "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search",
      "--disable", "apps", "--disable", "memories", "--disable", "multi_agent",
      "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies",
      "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt
    ], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
    const base = {
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      model: manifest.model.label,
      modelSlug: manifest.model.slug,
      reasoningEffort: manifest.model.reasoningEffort,
      attemptCount: 1,
      retryCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      timedOut: invocation.timedOut,
      terminationSignal: invocation.signal,
      commandExitCode: invocation.code,
      authentication: "ChatGPT subscription",
      apiKeysRemoved: true,
      meteredApiCostUsd: 0,
      transcriptionApiCalls: 0,
      transcriptionCostUsd: 0,
      stdoutSha256: sha256(invocation.stdout),
      stderrSha256: sha256(invocation.stderr)
    };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) {
      record = { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, deterministicValidationPassed: false };
    } else {
      await mkdir(path.dirname(path.resolve(root, context.output)), { recursive: true });
      await copyFile(path.join(temporary, "result.json"), path.resolve(root, context.output));
      const validation = await run(process.execPath, ["scripts/validate-v388-reconstruction-adversarial-audit.mjs", context.output, context.packet], { cwd: root, env: process.env });
      const valid = validation.code === 0;
      record = {
        ...base,
        status: valid ? "completed-valid" : "output-validation-failed",
        outputWritten: true,
        outputSha256: sha256(await readFile(path.resolve(root, context.output))),
        deterministicValidationPassed: valid,
        validationExitCode: validation.code,
        validationMessage: valid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-8000),
        validationSummary: valid ? JSON.parse(validation.stdout) : null
      };
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
  results.push(record);
  if (!record.deterministicValidationPassed) break;
}

const validContexts = results.filter((result) => result.deterministicValidationPassed).length;
const execution = {
  schemaVersion: "3.8.8-reconstruction-adversarial-audit-execution",
  protocolId: manifest.protocolId,
  status: validContexts === manifest.contexts.length ? "passed" : "failed-closed",
  startedAt: results[0]?.startedAt || null,
  completedAt: new Date().toISOString(),
  contextsPlanned: manifest.contexts.length,
  contextsAttempted: results.length,
  validContexts,
  attempts: results.length,
  retries: 0,
  authentication: "ChatGPT subscription",
  meteredModelApiCostUsd: 0,
  transcriptionApiCalls: 0,
  transcriptionCostUsd: 0,
  reconstructionMutationAuthorized: false,
  productionMutationAuthorized: false,
  results
};
await writeFile(path.resolve(root, manifest.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
if (validContexts !== manifest.contexts.length) throw new Error("supplemental adversarial audit failed closed");
console.log(JSON.stringify({ status: execution.status, validContexts, retries: 0, authentication: execution.authentication, meteredModelApiCostUsd: 0 }, null, 2));
