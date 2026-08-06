#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/calibration/v4.2.21.17.17/transport-canary";
const manifest = JSON.parse(await readFile(`${ROOT}/canary-manifest.json`, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(manifest.status === "frozen-one-retired-transport-canary-authorized" && manifest.authorization.oneRetiredModelContext && manifest.retiredEvidenceOnly, "transport canary unauthorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
assertV4(sha256(await readFile(manifest.schema.path)) === manifest.schema.sha256, "canary schema hash mismatch");
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) await access(future).then(() => { throw new Error(`future output exists: ${future}`); }, () => true);

const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
await access(codex);
await access(authSource);
function run(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", timedOut = false, forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeoutMs);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      resolve({ code, signal, stdout, stderr, timedOut });
    });
  });
}

const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-transport-canary-"));
const codexHome = await mkdtemp(path.join(os.tmpdir(), "slugfester-transport-canary-home-"));
const startedAt = new Date().toISOString();
const started = Date.now();
let invocation;
let resultExists = false;
let validation = null;
try {
  for (const [source, target] of [
    [manifest.source.manual, "manual.md"],
    [manifest.source.packet, "packet.json"],
    [manifest.schema.path, "schema.json"],
    [manifest.source.chunkLedgerPath, "chunk-ledger.jsonl"],
  ]) await copyFile(source, path.join(temporary, target));
  await copyFile(authSource, path.join(codexHome, "auth.json"));
  const env = { ...process.env, CODEX_HOME: codexHome };
  for (const key of ["OPENAI_API_KEY", "OPENAI_ORG_ID", "CODEX_API_KEY"]) delete env[key];
  const prompt = `Read manual.md, packet.json, schema.json, and every line of chunk-ledger.jsonl; read nothing else. Act only as the retired transport-canary score-blind source-discovery reviewer for Debate ${manifest.source.debateNumber}, ${manifest.source.chunkId}. The owned core is events ${manifest.source.coreStartEvent} through ${manifest.source.coreEndEvent}; boundary context is events ${manifest.source.contextStartEvent} through ${manifest.source.contextEndEvent}. Review the entire context. Emit zero to ten chronological load-bearing candidates whose start event lies inside the core. Only the packet's frozen interlocutors may be candidates. Return exactly one schema-conforming JSON object; never emit ratings, scores, sections, a winner, or publication prose.`;
  invocation = await run(codex, [
    "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules",
    "--model", manifest.model.slug,
    "-c", `model_reasoning_effort="${manifest.model.reasoningEffort}"`,
    "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search",
    "--disable", "apps", "--disable", "memories", "--disable", "multi_agent",
    "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies",
    "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt,
  ], { cwd: temporary, env }, manifest.executionPolicy.timeoutMs);
  resultExists = await access(path.join(temporary, "result.json")).then(() => true, () => false);
  if (!invocation.timedOut && invocation.code === 0 && invocation.signal === null && resultExists) {
    await copyFile(path.join(temporary, "result.json"), manifest.artifacts.result);
    validation = await run(process.execPath, [
      "scripts/validate-v422112-discovery.mjs",
      manifest.artifacts.result,
      manifest.source.preparation,
      manifest.source.debateNumber,
      manifest.source.chunkId,
    ], { cwd: process.cwd(), env: process.env }, 120000);
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
  await rm(codexHome, { recursive: true, force: true });
}
const accepted = Boolean(validation && validation.code === 0);
const execution = {
  schemaVersion: "4.2.21.17.17-retired-transport-canary-execution",
  protocolId: manifest.protocolId,
  status: accepted ? "retired-transport-canary-passed" : "retired-transport-canary-failed",
  startedAt,
  completedAt: new Date().toISOString(),
  elapsedMs: Date.now() - started,
  attemptCount: 1,
  retryCount: 0,
  timedOut: invocation.timedOut,
  commandExitCode: invocation.code,
  terminationSignal: invocation.signal,
  resultExists,
  resultSha256: resultExists && !invocation.timedOut && invocation.code === 0 ? sha256(await readFile(manifest.artifacts.result)) : null,
  accepted,
  validationSummary: accepted ? JSON.parse(validation.stdout) : null,
  validationMessage: validation && validation.code !== 0 ? `${validation.stdout}\n${validation.stderr}`.trim().slice(-12000) : null,
  stdoutSha256: sha256(invocation.stdout),
  stderrSha256: sha256(invocation.stderr),
  stdoutTail: invocation.stdout.slice(-12000),
  stderrTail: invocation.stderr.slice(-12000),
  authentication: "ChatGPT subscription",
  apiKeysRemoved: true,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
  authorization: {
    rampedHeldOutLaunch: accepted,
    retry: false,
    scoreDerivation: false,
    productionMutation: false,
    all195Debates: false,
  },
};
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({
  status: execution.status,
  elapsedMinutes: Number((execution.elapsedMs / 60000).toFixed(2)),
  accepted,
  retries: 0,
  rampedHeldOutLaunchAuthorized: accepted,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
  scoresDerived: 0,
}, null, 2));
