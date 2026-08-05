#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V429_ROOT, validateV429ChunkLedger } from "./lib/v429-long-context-partition.mjs";

const root = process.cwd();
const manifest = JSON.parse(await readFile(`${V429_ROOT}/execution-manifest.json`, "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(manifest.status === "frozen-two-score-blind-chunk-proposers-authorized" && manifest.authorization.twoProposalContexts, "v4.2.9 execution unauthorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
const fullLedgerBytes = await readFile(manifest.source.fullLedger);
for (const chunk of manifest.chunks) validateV429ChunkLedger(await readFile(chunk.chunkPath), fullLedgerBytes, chunk);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) await access(future).then(() => { throw new Error(`future output exists: ${future}`); }, () => true);
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

const results = [];
for (const chunk of manifest.chunks) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v429-${chunk.chunkId}-`));
  const home = await mkdtemp(path.join(os.tmpdir(), `slugfester-v429-home-${chunk.chunkId}-`));
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let record;
  try {
    const copies = [
      [manifest.modelInputs.selectionRubric, "selection-rubric.md"],
      [manifest.modelInputs.manual, "manual.md"],
      [manifest.modelInputs.schema, "schema.json"],
      [manifest.modelInputs.packet, "packet.json"],
      [chunk.chunkPath, "chunk-ledger.jsonl"]
    ];
    for (const [source, target] of copies) await copyFile(source, path.join(temporary, target));
    await copyFile(authSource, path.join(home, "auth.json"));
    const env = { ...process.env, CODEX_HOME: home };
    delete env.OPENAI_API_KEY;
    delete env.OPENAI_ORG_ID;
    delete env.CODEX_API_KEY;
    const prompt = `Read selection-rubric.md, manual.md, packet.json, schema.json, and every line of chunk-ledger.jsonl; read nothing else. Act only as the score-blind v4.2.9 ${chunk.chunkId} proposer for Debate 99. The immutable chunk bounds are events ${chunk.startEvent} through ${chunk.endEvent}. Review the entire chunk and emit four to twelve load-bearing candidate moves in source chronology. Every excerpt must have 12 to 100 lexical tokens and no more than 450 characters; prefer at most 90 tokens and 425 characters. Do not rate, score, weight, select a winner, or add publication prose. Return exactly one schema-conforming JSON object.`;
    process.stdout.write(`[v4.2.9-partition] starting ${manifest.model.label}/${manifest.model.reasoningEffort} ${chunk.chunkId}\n`);
    const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort="${manifest.model.reasoningEffort}"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env }, manifest.executionPolicy.timeoutMs);
    const resultExists = await access(path.join(temporary, "result.json")).then(() => true, () => false);
    const base = { chunkId: chunk.chunkId, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, authentication: "ChatGPT subscription", apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
      record = { ...base, status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed", accepted: false, rawOutputWritten: false };
    } else {
      await mkdir(path.dirname(chunk.rawOutput), { recursive: true });
      await copyFile(path.join(temporary, "result.json"), chunk.rawOutput);
      const validation = await run(process.execPath, ["scripts/validate-v429-proposal.mjs", chunk.rawOutput, `${V429_ROOT}/preparation-manifest.json`, chunk.chunkId], { cwd: root, env: process.env }, 120000);
      const valid = validation.code === 0;
      record = { ...base, status: valid ? "completed-valid" : "output-validation-failed", accepted: valid, rawOutputWritten: true, rawOutputSha256: sha256(await readFile(chunk.rawOutput)), validationSummary: valid ? JSON.parse(validation.stdout) : null, validationMessage: valid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-6000) };
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  }
  results.push(record);
  process.stdout.write(`[v4.2.9-partition] ${chunk.chunkId} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
}

const validContexts = results.filter((result) => result.accepted).length;
const execution = { schemaVersion: "4.2.9-long-context-partition-model-execution", protocolId: manifest.protocolId, status: validContexts === 2 ? "two-chunk-proposals-passed" : "two-chunk-proposals-complete-with-failure", contextsPlanned: 2, contextsAttempted: results.length, validContexts, invalidContexts: results.length - validContexts, attempts: results.length, retries: 0, totalElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0), results, meteredApiCostUsd: 0, transcriptionCostUsd: 0, authorization: { analysis: true, retry: false, mergePreparation: false, scoreDerivation: false } };
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: execution.status, contextsAttempted: results.length, validContexts, invalidContexts: execution.invalidContexts, totalElapsedMinutes: Number((execution.totalElapsedMs / 60000).toFixed(2)), retries: 0, meteredApiCostUsd: 0 }, null, 2));
