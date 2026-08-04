#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { assert } from "./lib/v376d-burden-contact.mjs";
import { V376D_EXECUTION_MANIFEST } from "./lib/v376d-execution.mjs";

const root = process.cwd(), manifestText = await readFile(path.resolve(root, V376D_EXECUTION_MANIFEST), "utf8"), manifest = JSON.parse(manifestText), codex = "/Applications/ChatGPT.app/Contents/Resources/codex", concurrency = Number(process.env.SLUGFESTER_MODEL_CONCURRENCY ?? 2);
assert(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 3, "SLUGFESTER_MODEL_CONCURRENCY must be 1-3");
assert(manifest.status === "frozen-before-model-execution" && manifest.disjointTestExecutionAuthorized, "execution manifest does not authorize this test");
assert(manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.modelOutputRetriesMaximum === 0, "attempt policy invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await readFile(path.resolve(root, file), "utf8")) === digest, `source hash mismatch: ${file}`);
await access(codex); const authSource = path.join(os.homedir(), ".codex", "auth.json"); await access(authSource);

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] }); let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); }); child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
    child.on("error", (error) => resolve({ code: null, stdout, stderr, spawnError: error.message })); child.on("close", (code) => resolve({ code, stdout, stderr, spawnError: null }));
  });
}
async function pool(tasks) {
  let next = 0; const results = new Array(tasks.length);
  const workers = Array.from({ length: Math.min(concurrency, tasks.length || 1) }, async () => { while (next < tasks.length) { const index = next; next += 1; results[index] = await tasks[index](); } });
  await Promise.all(workers); return results;
}
const schemaPattern = /(invalid[^\n]{0,80}(json )?schema|response[_ -]?format[^\n]{0,80}(invalid|unsupported|reject)|json schema[^\n]{0,80}(invalid|unsupported|reject))/i, streamPattern = /(reconnect|resum(?:e|ing)|stream[^\n]{0,50}recover|retrying[^\n]{0,50}stream)/ig;

async function modelTask(context) {
  const { debateNumber, reviewerPass, packet, schema, output, bundleCount } = context, temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v376d-${reviewerPass}-${debateNumber}-`)), temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v376d-home-${reviewerPass}-${debateNumber}-`)), startedAt = new Date().toISOString();
  try {
    for (const [source, target] of [[manifest.modelInputs.workflow, "workflow.md"], [manifest.modelInputs.rubric, "rubric.md"], [manifest.modelInputs.manual, "manual.md"], [schema, "schema.json"], [packet, "packet.json"]]) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome }; delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
    process.stdout.write(`\n[v3.7.6-disjoint] starting ${manifest.model.label} Debate ${debateNumber} ${reviewerPass}\n`);
    const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", "Read workflow.md, rubric.md, manual.md, schema.json, and packet.json completely and no other files. Return exactly one schema-conforming burden-contact output. Process every composite case once and in order. Do not emit scores or commentary outside the JSON object."], { cwd: temporary, env: environment });
    const log = `${invocation.stdout}\n${invocation.stderr}`, base = { debateNumber, reviewerPass, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, bundleCount, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), subscriptionAuthenticated: true, apiKeysRemoved: true, meteredApiCostUsd: 0, commandExitCode: invocation.code, preInferenceSchemaRejected: invocation.code !== 0 && schemaPattern.test(log), sameRequestStreamRecoveries: [...log.matchAll(streamPattern)].length, spawnError: invocation.spawnError };
    if (invocation.code !== 0) return { ...base, status: base.preInferenceSchemaRejected ? "pre-inference-schema-rejected" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, invalidBundleCount: bundleCount, scoringFieldCount: 0 };
    const outputPath = path.resolve(root, output); await mkdir(path.dirname(outputPath), { recursive: true });
    try {
      await copyFile(path.join(temporary, "result.json"), outputPath);
      const outputText = await readFile(outputPath, "utf8"), parsed = JSON.parse(outputText), validation = await run(process.execPath, ["scripts/validate-v376d-burden-contact-output.mjs", output, packet, schema], { cwd: root, env: process.env }), valid = validation.code === 0;
      process.stdout.write(`[v3.7.6-disjoint] Debate ${debateNumber} ${reviewerPass} ${valid ? "completed-valid" : "output-validation-failed"}\n`);
      return { ...base, status: valid ? "completed-valid" : "output-validation-failed", outputWritten: true, outputSha256: sha256(outputText), deterministicValidationPassed: valid, invalidBundleCount: valid ? 0 : bundleCount, scoringFieldCount: containsScoreField(parsed) ? 1 : 0, outputBundleCount: Array.isArray(parsed.bundles) ? parsed.bundles.length : 0, validationExitCode: validation.code, validationMessage: valid ? null : validation.stderr.trim().slice(-1000) };
    } catch (error) { return { ...base, status: "output-validation-failed", outputWritten: false, deterministicValidationPassed: false, invalidBundleCount: bundleCount, scoringFieldCount: 0, outputError: error.message }; }
  } finally { await rm(temporary, { recursive: true, force: true }); await rm(temporaryCodexHome, { recursive: true, force: true }); }
}
function executionRecord(schemaVersion, startedAt, contexts, results) {
  return { schemaVersion, protocolId: manifest.protocolId, startedAt, completedAt: new Date().toISOString(), authentication: "ChatGPT subscription auth copied into isolated temporary CODEX_HOME; API keys removed", contextsPlanned: contexts.length, contextsCompleted: results.filter((item) => item.commandExitCode === 0).length, validOutputContexts: results.filter((item) => item.status === "completed-valid").length, preInferenceSchemaRejections: results.filter((item) => item.preInferenceSchemaRejected).length, totalAttempts: results.reduce((sum, item) => sum + item.attemptCount, 0), totalRetries: results.reduce((sum, item) => sum + item.retryCount, 0), sameRequestStreamRecoveries: results.reduce((sum, item) => sum + item.sameRequestStreamRecoveries, 0), invalidBundleCount: results.reduce((sum, item) => sum + item.invalidBundleCount, 0), scoringFieldCount: results.reduce((sum, item) => sum + item.scoringFieldCount, 0), meteredApiCostUsd: 0, transcriptionCostUsd: 0, results };
}
const initialContexts = ["pass-a", "pass-b"].flatMap((reviewerPass) => manifest.debateNumbers.map((debateNumber) => manifest.initialContexts[reviewerPass][debateNumber])), initialStartedAt = new Date().toISOString(), initialResults = await pool(initialContexts.map((context) => () => modelTask(context))), initialExecution = executionRecord("3.7.6-disjoint-initial-burden-contact-execution", initialStartedAt, initialContexts, initialResults);
await writeFile(path.resolve(root, manifest.artifacts.initialExecution), `${JSON.stringify(initialExecution, null, 2)}\n`);
const extraction = await run(process.execPath, ["scripts/extract-v376d-disagreements.mjs", "--write"], { cwd: root, env: process.env }); assert(extraction.code === 0, `disagreement extraction failed: ${extraction.stderr}`);
const disagreement = JSON.parse(await readFile(path.resolve(root, manifest.artifacts.initialDisagreements), "utf8")); let adjudicationExecution;
if (!disagreement.allInitialValid) adjudicationExecution = executionRecord("3.7.6-disjoint-adjudication-burden-contact-execution", new Date().toISOString(), [], []);
else { const adjudicationStartedAt = new Date().toISOString(), adjudicationResults = await pool(disagreement.adjudicationContexts.map((context) => () => modelTask(context))); adjudicationExecution = executionRecord("3.7.6-disjoint-adjudication-burden-contact-execution", adjudicationStartedAt, disagreement.adjudicationContexts, adjudicationResults); }
await writeFile(path.resolve(root, manifest.artifacts.adjudicationExecution), `${JSON.stringify(adjudicationExecution, null, 2)}\n`);
const analysisRun = await run(process.execPath, ["scripts/analyze-v376d-burden-contact-test.mjs", "--write"], { cwd: root, env: process.env }); assert(analysisRun.code === 0, `analysis failed: ${analysisRun.stderr}`);
const analysis = JSON.parse(await readFile(path.resolve(root, manifest.artifacts.analysis), "utf8"));
console.log(JSON.stringify({ status: "case-disjoint-burden-contact-execution-recorded", passed: analysis.passed, initialValidContexts: initialExecution.validOutputContexts, initialAgreements: disagreement.counts.agreements, initialDisagreements: disagreement.counts.disagreements, adjudicationContexts: adjudicationExecution.contextsPlanned, adjudicationValidContexts: adjudicationExecution.validOutputContexts, retries: initialExecution.totalRetries + adjudicationExecution.totalRetries, meteredApiCostUsd: 0 }, null, 2));
