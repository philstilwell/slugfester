#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assert, sha256 } from "./lib/v36-decision-cards.mjs";
import { containsScoreField, V37_FAMILIES, V37_GATE_ROOT } from "./lib/v37-retired-semantic.mjs";

const root = process.cwd(), manifestText = await readFile(path.resolve(root, V37_GATE_ROOT, "gate-manifest.json"), "utf8"), manifest = JSON.parse(manifestText);
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex", concurrency = Number(process.env.SLUGFESTER_MODEL_CONCURRENCY ?? 2);
assert(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 4, "SLUGFESTER_MODEL_CONCURRENCY must be 1-4");
assert(manifest.status === "frozen-before-model-execution" && manifest.executionPolicy.modelOutputRetriesMaximum === 0, "manifest or zero-retry lock invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await readFile(path.resolve(root, file), "utf8")) === digest, `source hash mismatch: ${file}`);
const dryText = await readFile(path.resolve(root, manifest.dryFixture.path), "utf8");
assert(sha256(dryText) === manifest.dryFixture.sha256 && JSON.parse(dryText).passed, "dry fixture invalid");
await access(codex);
const authSource = path.join(os.homedir(), ".codex", "auth.json"); await access(authSource);
function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] }); let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); }); child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
    child.on("error", (error) => resolve({ code: null, stdout, stderr, spawnError: error.message })); child.on("close", (code) => resolve({ code, stdout, stderr, spawnError: null }));
  });
}
async function pool(tasks) {
  let next = 0; const results = new Array(tasks.length), workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (next < tasks.length) { const index = next++; results[index] = await tasks[index](); }
  });
  await Promise.all(workers); return results;
}
const schemaPattern = /(invalid[^\n]{0,80}(json )?schema|response[_ -]?format[^\n]{0,80}(invalid|unsupported|reject)|json schema[^\n]{0,80}(invalid|unsupported|reject))/i;
const streamPattern = /(reconnect|resum(?:e|ing)|stream[^\n]{0,50}recover|retrying[^\n]{0,50}stream)/ig;
async function modelTask(family, modelKey) {
  const definition = manifest.families[family], model = manifest.models[modelKey];
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v37-${family}-${modelKey}-`)), temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v37-home-${family}-${modelKey}-`));
  const startedAt = new Date().toISOString();
  try {
    for (const [source, target] of [["docs/assessment-workflow-v3.7.md", "workflow.md"], ["docs/reassessment-rubric-v3.7.md", "rubric.md"], [`${V37_GATE_ROOT}/test-manual.md`, "manual.md"], [definition.schema, "schema.json"], [definition.packet, "packet.json"]]) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome }; delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
    process.stdout.write(`\n[v3.7] starting ${model.label} ${family} isolated pass\n`);
    const invocation = await run(codex, [
      "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", model.slug, "-c", `model_reasoning_effort=\"${model.reasoningEffort}\"`,
      "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only",
      "--output-schema", "schema.json", "--output-last-message", "result.json",
      "Read workflow.md, rubric.md, manual.md, schema.json, and packet.json completely and no other files. Return exactly one schema-conforming JSON batch. Process every packet case once and in order. Do not emit scores or commentary outside the JSON object."
    ], { cwd: temporary, env: environment });
    const log = `${invocation.stdout}\n${invocation.stderr}`, base = {
      family, modelKey, model: model.label, modelSlug: model.slug, reasoningEffort: model.reasoningEffort, attemptCount: 1, retryCount: 0,
      startedAt, completedAt: new Date().toISOString(), subscriptionAuthenticated: true, apiKeysRemoved: true, meteredApiCostUsd: 0,
      commandExitCode: invocation.code, preInferenceSchemaRejected: invocation.code !== 0 && schemaPattern.test(log), sameRequestStreamRecoveries: [...log.matchAll(streamPattern)].length, spawnError: invocation.spawnError
    };
    if (invocation.code !== 0) return { ...base, status: base.preInferenceSchemaRejected ? "pre-inference-schema-rejected" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, scoringFieldCount: 0 };
    const outputPath = path.resolve(root, manifest.outputs[family][modelKey]); await mkdir(path.dirname(outputPath), { recursive: true });
    try {
      await copyFile(path.join(temporary, "result.json"), outputPath); const outputText = await readFile(outputPath, "utf8"), output = JSON.parse(outputText);
      const validation = await run(process.execPath, ["scripts/validate-v37-family-output.mjs", manifest.outputs[family][modelKey], definition.packet, definition.schema, family], { cwd: root, env: process.env });
      const valid = validation.code === 0, scoringFieldCount = containsScoreField(output) ? 1 : 0;
      process.stdout.write(`[v3.7] ${model.label} ${family} ${valid ? "completed-valid" : "output-validation-failed"}\n`);
      return { ...base, status: valid ? "completed-valid" : "output-validation-failed", outputWritten: true, outputSha256: sha256(outputText), deterministicValidationPassed: valid, scoringFieldCount, cardCount: Array.isArray(output.cards) ? output.cards.length : 0, validationExitCode: validation.code };
    } catch (error) { return { ...base, status: "output-validation-failed", outputWritten: false, deterministicValidationPassed: false, scoringFieldCount: 0, outputError: error.message }; }
  } finally { await rm(temporary, { recursive: true, force: true }); await rm(temporaryCodexHome, { recursive: true, force: true }); }
}
const tasks = [];
for (const family of V37_FAMILIES) for (const modelKey of manifest.modelKeys) tasks.push(() => modelTask(family, modelKey));
const results = await pool(tasks), execution = {
  schemaVersion: "3.7-retired-semantic-model-execution", gateId: manifest.gateId, completedAt: new Date().toISOString(),
  authentication: "ChatGPT subscription auth copied into isolated temporary CODEX_HOME; API keys removed", contextsPlanned: tasks.length,
  contextsCompleted: results.filter((item) => item.commandExitCode === 0).length, contextsFailed: results.filter((item) => item.commandExitCode !== 0).length,
  validOutputContexts: results.filter((item) => item.status === "completed-valid").length, preInferenceSchemaRejections: results.filter((item) => item.preInferenceSchemaRejected).length,
  totalAttempts: results.reduce((sum, item) => sum + item.attemptCount, 0), totalRetries: results.reduce((sum, item) => sum + item.retryCount, 0),
  sameRequestStreamRecoveries: results.reduce((sum, item) => sum + item.sameRequestStreamRecoveries, 0), scoringFieldCount: results.reduce((sum, item) => sum + item.scoringFieldCount, 0),
  meteredApiCostUsd: 0, transcriptionCostUsd: 0, results
};
await writeFile(path.resolve(root, manifest.executionResultPath), `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: "execution-recorded", contextsCompleted: execution.contextsCompleted, validOutputContexts: execution.validOutputContexts, retries: execution.totalRetries, meteredApiCostUsd: 0 }, null, 2));
