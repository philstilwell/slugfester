#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assert, sha256 } from "./lib/v36-decision-cards.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.6.2/schema-smoke";
const manifestPath = `${gateRoot}/gate-manifest.json`, manifestText = await readFile(path.resolve(root, manifestPath), "utf8");
const manifest = JSON.parse(manifestText), codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const concurrency = Number(process.env.SLUGFESTER_MODEL_CONCURRENCY ?? 2);
assert(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 4, "SLUGFESTER_MODEL_CONCURRENCY must be 1-4");
assert(manifest.status === "frozen-before-remote-smoke" && manifest.gateId === "v3.6.2-schema-smoke", "manifest identity invalid");
assert(manifest.model.slug === "gpt-5.6-terra" && manifest.model.reasoningEffort === "high", "model lock invalid");
assert(manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.modelOutputRetriesMaximum === 0, "zero-retry policy invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  const text = await readFile(path.resolve(root, file), "utf8");
  assert(sha256(text) === digest, `decision-source hash mismatch: ${file}`);
}
const dryText = await readFile(path.resolve(root, manifest.dryFixture.path), "utf8");
assert(sha256(dryText) === manifest.dryFixture.sha256 && JSON.parse(dryText).passed, "dry fixture mismatch or failure");
await access(codex);
const authSource = path.join(os.homedir(), ".codex", "auth.json");
await access(authSource);

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); });
    child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
    child.on("error", (error) => resolve({ code: null, stdout, stderr, spawnError: error.message }));
    child.on("close", (code) => resolve({ code, stdout, stderr, spawnError: null }));
  });
}

async function pool(tasks) {
  let next = 0;
  const results = new Array(tasks.length);
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await tasks[index]();
    }
  });
  await Promise.all(workers);
  return results;
}

function countScoreFields(value) {
  if (!value || typeof value !== "object") return 0;
  return Object.entries(value).reduce((count, [key, child]) => count + (/^(score|scores|moveScore|sectionScore|overall|winner)$/i.test(key) ? 1 : 0) + countScoreFields(child), 0);
}

const schemaRejectionPattern = /(invalid[^\n]{0,80}(json )?schema|response[_ -]?format[^\n]{0,80}(invalid|unsupported|reject)|json schema[^\n]{0,80}(invalid|unsupported|reject))/i;
const streamRecoveryPattern = /(reconnect|resum(?:e|ing)|stream[^\n]{0,50}recover|retrying[^\n]{0,50}stream)/ig;

async function modelTask(family) {
  const definition = manifest.families[family], temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v362-${family}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v362-home-${family}-`));
  const startedAt = new Date().toISOString();
  try {
    const mappings = [
      ["docs/assessment-workflow-v3.6.2.md", "workflow.md"], ["docs/reassessment-rubric-v3.6.2.md", "rubric.md"],
      [`${gateRoot}/smoke-manual.md`, "manual.md"], [definition.schema, "schema.json"], [definition.packet, "packet.json"]
    ];
    for (const [source, target] of mappings) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
    delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
    process.stdout.write(`\n[v3.6.2] starting isolated ${family} schema smoke\n`);
    const invocation = await run(codex, [
      "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug,
      "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`,
      "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent",
      "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only",
      "--output-schema", "schema.json", "--output-last-message", "result.json",
      "Read workflow.md, rubric.md, manual.md, schema.json, and packet.json completely and no other files. Follow the manual. Return only one JSON object conforming exactly to schema.json. Do not emit scores or commentary outside the object."
    ], { cwd: temporary, env: environment });
    const combinedLog = `${invocation.stdout}\n${invocation.stderr}`;
    const preInferenceSchemaRejected = invocation.code !== 0 && schemaRejectionPattern.test(combinedLog);
    const sameRequestStreamRecoveries = [...combinedLog.matchAll(streamRecoveryPattern)].length;
    const base = {
      family, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort,
      attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), subscriptionAuthenticated: true,
      apiKeysRemoved: true, meteredApiCostUsd: 0, commandExitCode: invocation.code,
      preInferenceSchemaRejected, sameRequestStreamRecoveries, spawnError: invocation.spawnError
    };
    if (invocation.code !== 0) {
      process.stdout.write(`[v3.6.2] ${family} failed without retry\n`);
      return { ...base, status: preInferenceSchemaRejected ? "pre-inference-schema-rejected" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, scoringFieldCount: 0 };
    }
    const outputPath = path.resolve(root, manifest.outputs[family]);
    await mkdir(path.dirname(outputPath), { recursive: true });
    try {
      await copyFile(path.join(temporary, "result.json"), outputPath);
      const outputText = await readFile(outputPath, "utf8");
      const output = JSON.parse(outputText);
      const scoringFieldCount = countScoreFields(output);
      const validation = await run(process.execPath, ["scripts/validate-v362-smoke-output.mjs", manifest.outputs[family], definition.packet, family], { cwd: root, env: process.env });
      const deterministicValidationPassed = validation.code === 0;
      process.stdout.write(`[v3.6.2] ${family} ${deterministicValidationPassed ? "completed-valid" : "output-validation-failed"}\n`);
      return { ...base, status: deterministicValidationPassed ? "completed-valid" : "output-validation-failed", outputWritten: true, outputSha256: sha256(outputText), deterministicValidationPassed, scoringFieldCount, validationExitCode: validation.code };
    } catch (error) {
      process.stdout.write(`[v3.6.2] ${family} output could not be validated\n`);
      return { ...base, status: "output-validation-failed", outputWritten: false, deterministicValidationPassed: false, scoringFieldCount: 0, outputError: error.message };
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
}

const families = Object.keys(manifest.families), tasks = families.map((family) => () => modelTask(family));
const results = await pool(tasks);
const execution = {
  schemaVersion: "3.6.2-schema-smoke-execution", gateId: manifest.gateId, completedAt: new Date().toISOString(),
  authentication: "ChatGPT subscription auth copied into isolated temporary CODEX_HOME; API keys removed",
  model: manifest.model, contextsPlanned: tasks.length,
  contextsCompleted: results.filter((item) => item.commandExitCode === 0).length,
  contextsFailed: results.filter((item) => item.commandExitCode !== 0).length,
  validOutputCount: results.filter((item) => item.status === "completed-valid").length,
  preInferenceSchemaRejections: results.filter((item) => item.preInferenceSchemaRejected).length,
  totalAttempts: results.reduce((sum, item) => sum + item.attemptCount, 0),
  totalRetries: results.reduce((sum, item) => sum + item.retryCount, 0),
  sameRequestStreamRecoveries: results.reduce((sum, item) => sum + item.sameRequestStreamRecoveries, 0),
  scoringFieldCount: results.reduce((sum, item) => sum + item.scoringFieldCount, 0),
  meteredApiCostUsd: 0, results
};
await writeFile(path.resolve(root, manifest.executionResultPath), `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: "execution-recorded", gateId: manifest.gateId, contextsCompleted: execution.contextsCompleted, validOutputCount: execution.validOutputCount, preInferenceSchemaRejections: execution.preInferenceSchemaRejections, totalRetries: execution.totalRetries, meteredApiCostUsd: 0 }, null, 2));
