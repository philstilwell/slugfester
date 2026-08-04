#!/usr/bin/env node

import { spawn } from "node:child_process";
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { V33_MODELS, V33_MODEL_SLUGS, assert } from "./lib/v33-blind-bundles.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.3/retired-three-debate-test";
const manifest = JSON.parse(await readFile(path.resolve(root, gateRoot, "gate-manifest.json"), "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const concurrency = Number(process.env.SLUGFESTER_MODEL_CONCURRENCY ?? 3);
assert(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 4, "SLUGFESTER_MODEL_CONCURRENCY must be 1-4");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); });
    child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${command} exited ${code}\n${stdout.slice(-3000)}\n${stderr.slice(-3000)}`)));
  });
}

async function pool(tasks) {
  let next = 0;
  const results = new Array(tasks.length);
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (next < tasks.length) {
      const index = next++;
      try { results[index] = await tasks[index](); }
      catch (error) { results[index] = { status: "failed", error: error.message }; }
    }
  });
  await Promise.all(workers);
  return results;
}

async function modelTask({ debate, modelKey }) {
  const outputs = manifest.outputs[debate.debateId];
  const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-v33-"));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), "slugfester-v33-home-"));
  const startedAt = new Date().toISOString();
  try {
    const mappings = [
      ["docs/assessment-workflow-v3.3.md", "workflow.md"], ["docs/reassessment-rubric-v3.3.md", "rubric.md"],
      [`${gateRoot}/blind-adjudication-manual.md`, "manual.md"], [`${gateRoot}/blind-adjudication-schema.json`, "schema.json"],
      [outputs.blindPacket, "blind-packet.json"]
    ];
    for (const [source, target] of mappings) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(path.join(os.homedir(), ".codex", "auth.json"), path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
    delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
    process.stdout.write(`\n[v3.3] starting Debate ${debate.debateNumber} ${V33_MODELS[modelKey]} blind adjudication\n`);
    await run(codex, [
      "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", V33_MODEL_SLUGS[modelKey], "-c", "model_reasoning_effort=\"xhigh\"",
      "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent",
      "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only",
      "--output-schema", "schema.json", "--output-last-message", "result.json",
      `Read all five allowlisted files in this directory. Independently adjudicate every blind packet bundle and decision exactly once, in order, and return only the JSON required by schema.json. Use model label ${V33_MODELS[modelKey]}. Candidate values, raw model identities, agreement/conflict flags, gold, scores, and legacy assessments are unavailable. Decide de novo: first apply each field default, exact positive rule, and exclusions; then return one allowedSemanticJson string exactly. Use evidenceText null for the default and otherwise copy one exact complete sourceExcerpt substring. Enforce complete target/component/contrary/scope, defect/consequence, and malformed/replacement bundle coherence before returning. Set candidateDataSeen and scoresSeen false. Do not browse or inspect outside this directory.`
    ], { cwd: temporary, env: environment });
    await mkdir(path.dirname(path.resolve(root, outputs.adjudications[modelKey])), { recursive: true });
    await copyFile(path.join(temporary, "result.json"), path.resolve(root, outputs.adjudications[modelKey]));
    process.stdout.write(`[v3.3] completed Debate ${debate.debateNumber} ${V33_MODELS[modelKey]}\n`);
    return { status: "completed", debateId: debate.debateId, debateNumber: debate.debateNumber, modelKey, model: V33_MODELS[modelKey], attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), subscriptionAuthenticated: true, meteredApiCostUsd: 0 };
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
}

await run(process.execPath, ["scripts/test-v33-blind-bundles.mjs", "--write"], { cwd: root, env: process.env });
const fixture = JSON.parse(await readFile(path.resolve(root, manifest.dryFixtureResultPath), "utf8"));
assert(fixture.passed && fixture.modelSchemaOrInvariantRetries === 0, "dry fixture gate failed; model contexts prohibited");

const tasks = [];
for (const debate of manifest.sample.debates) for (const modelKey of Object.keys(V33_MODELS)) tasks.push(() => modelTask({ debate, modelKey }));
const results = await pool(tasks);
const failed = results.filter((item) => item.status !== "completed");
const execution = {
  schemaVersion: "3.3-model-execution", gateId: manifest.gateId, completedAt: new Date().toISOString(),
  authentication: "ChatGPT subscription auth copied into isolated temporary CODEX_HOME; API keys removed",
  contextsPlanned: tasks.length, contextsCompleted: results.length - failed.length, contextsFailed: failed.length,
  totalAttempts: results.length, totalRetries: 0, meteredApiCostUsd: 0, results
};
await writeFile(path.resolve(root, manifest.executionResultPath), `${JSON.stringify(execution, null, 2)}\n`);
assert(failed.length === 0, `${failed.length} model context(s) failed; no retries permitted`);

for (const debate of manifest.sample.debates) {
  const outputs = manifest.outputs[debate.debateId];
  for (const modelKey of Object.keys(V33_MODELS)) {
    await run(process.execPath, ["scripts/validate-v33-blind-adjudication.mjs", outputs.adjudications[modelKey], outputs.blindPacket, modelKey, debate.v32.passA.path, debate.v32.input.path], { cwd: root, env: process.env });
  }
}
await run(process.execPath, ["scripts/map-v33-blind-adjudications.mjs", "--write"], { cwd: root, env: process.env });
await run(process.execPath, ["scripts/merge-v33-blind-locks.mjs", "--write"], { cwd: root, env: process.env });
await run(process.execPath, ["scripts/analyze-v33-retired-blind-test.mjs", "--write"], { cwd: root, env: process.env });
await run(process.execPath, ["scripts/validate-v33-retired-blind-test.mjs"], { cwd: root, env: process.env });
console.log(JSON.stringify({ status: "complete", gateId: manifest.gateId, modelContextsExecuted: tasks.length, modelSchemaOrInvariantRetries: 0, meteredApiCostUsd: 0 }, null, 2));
