#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assert, sha256 } from "./lib/v36-decision-cards.mjs";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { V371_DEBATES, V371_INITIAL_PASSES, V371_MODEL, V371_ROOT } from "./lib/v371-gold-audit.mjs";

const root = process.cwd();
const manifestText = await readFile(path.resolve(root, V371_ROOT, "gate-manifest.json"), "utf8");
const manifest = JSON.parse(manifestText);
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const concurrency = Number(process.env.SLUGFESTER_MODEL_CONCURRENCY ?? 2);
assert(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 4, "SLUGFESTER_MODEL_CONCURRENCY must be 1-4");
assert(manifest.status === "frozen-before-model-execution" && manifest.executionPolicy.modelOutputRetriesMaximum === 0, "manifest or retry lock invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await readFile(path.resolve(root, file), "utf8")) === digest, `source hash mismatch: ${file}`);
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
    while (next < tasks.length) { const index = next++; results[index] = await tasks[index](); }
  });
  await Promise.all(workers);
  return results;
}

const schemaPattern = /(invalid[^\n]{0,80}(json )?schema|response[_ -]?format[^\n]{0,80}(invalid|unsupported|reject)|json schema[^\n]{0,80}(invalid|unsupported|reject))/i;
const streamPattern = /(reconnect|resum(?:e|ing)|stream[^\n]{0,50}recover|retrying[^\n]{0,50}stream)/ig;

async function modelTask({ debateNumber, reviewerPass, packet, schema, output }) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v371-${reviewerPass}-${debateNumber}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v371-home-${reviewerPass}-${debateNumber}-`));
  const startedAt = new Date().toISOString();
  try {
    for (const [source, target] of [
      ["docs/assessment-workflow-v3.7.1.md", "workflow.md"],
      ["docs/reassessment-rubric-v3.7.1.md", "rubric.md"],
      [`${V371_ROOT}/audit-manual.md`, "manual.md"],
      [schema, "schema.json"],
      [packet, "packet.json"]
    ]) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
    delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
    process.stdout.write(`\n[v3.7.1] starting ${V371_MODEL.label} Debate ${debateNumber} ${reviewerPass}\n`);
    const invocation = await run(codex, [
      "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", V371_MODEL.slug,
      "-c", `model_reasoning_effort=\"${V371_MODEL.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search",
      "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use",
      "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json",
      "Read workflow.md, rubric.md, manual.md, schema.json, and packet.json completely and no other files. Return exactly one schema-conforming audit output. Process every decision once and in order. Do not emit scores or commentary outside the JSON object."
    ], { cwd: temporary, env: environment });
    const log = `${invocation.stdout}\n${invocation.stderr}`;
    const base = {
      debateNumber, reviewerPass, model: V371_MODEL.label, modelSlug: V371_MODEL.slug, reasoningEffort: V371_MODEL.reasoningEffort,
      attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), subscriptionAuthenticated: true, apiKeysRemoved: true,
      meteredApiCostUsd: 0, commandExitCode: invocation.code, preInferenceSchemaRejected: invocation.code !== 0 && schemaPattern.test(log),
      sameRequestStreamRecoveries: [...log.matchAll(streamPattern)].length, spawnError: invocation.spawnError
    };
    if (invocation.code !== 0) return { ...base, status: base.preInferenceSchemaRejected ? "pre-inference-schema-rejected" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, scoringFieldCount: 0 };
    const outputPath = path.resolve(root, output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    try {
      await copyFile(path.join(temporary, "result.json"), outputPath);
      const outputText = await readFile(outputPath, "utf8"), parsed = JSON.parse(outputText);
      const validation = await run(process.execPath, ["scripts/validate-v371-audit-output.mjs", output, packet, schema], { cwd: root, env: process.env });
      const valid = validation.code === 0, scoringFieldCount = containsScoreField(parsed) ? 1 : 0;
      process.stdout.write(`[v3.7.1] Debate ${debateNumber} ${reviewerPass} ${valid ? "completed-valid" : "output-validation-failed"}\n`);
      return { ...base, status: valid ? "completed-valid" : "output-validation-failed", outputWritten: true, outputSha256: sha256(outputText), deterministicValidationPassed: valid, scoringFieldCount, decisionCount: Array.isArray(parsed.decisions) ? parsed.decisions.length : 0, validationExitCode: validation.code, validationMessage: valid ? null : validation.stderr.trim().slice(-1000) };
    } catch (error) {
      return { ...base, status: "output-validation-failed", outputWritten: false, deterministicValidationPassed: false, scoringFieldCount: 0, outputError: error.message };
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
}

function executionRecord(schemaVersion, startedAt, contexts, results) {
  return {
    schemaVersion, gateId: manifest.gateId, startedAt, completedAt: new Date().toISOString(),
    authentication: "ChatGPT subscription auth copied into isolated temporary CODEX_HOME; API keys removed",
    contextsPlanned: contexts.length, contextsCompleted: results.filter((item) => item.commandExitCode === 0).length,
    validOutputContexts: results.filter((item) => item.status === "completed-valid").length,
    preInferenceSchemaRejections: results.filter((item) => item.preInferenceSchemaRejected).length,
    totalAttempts: results.reduce((sum, item) => sum + item.attemptCount, 0), totalRetries: results.reduce((sum, item) => sum + item.retryCount, 0),
    sameRequestStreamRecoveries: results.reduce((sum, item) => sum + item.sameRequestStreamRecoveries, 0),
    scoringFieldCount: results.reduce((sum, item) => sum + item.scoringFieldCount, 0), meteredApiCostUsd: 0, transcriptionCostUsd: 0, results
  };
}

const initialContexts = V371_INITIAL_PASSES.flatMap((reviewerPass) => V371_DEBATES.map((debateNumber) => manifest.initialContexts[reviewerPass][debateNumber]));
const initialStartedAt = new Date().toISOString();
const initialResults = await pool(initialContexts.map((context) => () => modelTask(context)));
const initialExecution = executionRecord("3.7.1-initial-audit-execution", initialStartedAt, initialContexts, initialResults);
await writeFile(path.resolve(root, manifest.initialExecutionPath), `${JSON.stringify(initialExecution, null, 2)}\n`);

const extraction = await run(process.execPath, ["scripts/extract-v371-audit-disagreements.mjs", "--write"], { cwd: root, env: process.env });
assert(extraction.code === 0, `initial disagreement extraction failed: ${extraction.stderr}`);
const disagreement = JSON.parse(await readFile(path.resolve(root, manifest.initialDisagreementPath), "utf8"));
let adjudicationExecution;
if (!disagreement.allInitialValid) adjudicationExecution = executionRecord("3.7.1-adjudication-execution", new Date().toISOString(), [], []);
else {
  const adjudicationStartedAt = new Date().toISOString();
  const adjudicationResults = await pool(disagreement.adjudicationContexts.map((context) => () => modelTask({ ...context, reviewerPass: "pass-c" })));
  adjudicationExecution = executionRecord("3.7.1-adjudication-execution", adjudicationStartedAt, disagreement.adjudicationContexts.map((item) => ({ ...item, reviewerPass: "pass-c" })), adjudicationResults);
}
await writeFile(path.resolve(root, manifest.adjudicationExecutionPath), `${JSON.stringify(adjudicationExecution, null, 2)}\n`);
console.log(JSON.stringify({ status: "audit-execution-recorded", initialValidContexts: initialExecution.validOutputContexts, initialAgreements: disagreement.counts.agreements, initialDisagreements: disagreement.counts.disagreements, adjudicationContexts: adjudicationExecution.contextsPlanned, adjudicationValidContexts: adjudicationExecution.validOutputContexts, retries: initialExecution.totalRetries + adjudicationExecution.totalRetries, meteredApiCostUsd: 0 }, null, 2));
