#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { validateV42211732PublicationOutput } from "./lib/v42211732-hard-route-publication.mjs";
import { V42211733_ROOT, validateOpenAIStructuredOutputSubset } from "./lib/v42211733-hard-route-publication-transport.mjs";

const manifest = JSON.parse(await readFile(path.resolve(`${V42211733_ROOT}/execution-manifest.json`), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(manifest.status === "frozen-five-isolated-hard-route-publication-contexts-authorized" && manifest.authorization.publicationModelContexts && !manifest.authorization.deterministicCompilation && !manifest.authorization.productionMutation, "publication execution unauthorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assertV4(!(await exists(future)), `future output exists: ${future}`);
for (const context of manifest.contexts) validateOpenAIStructuredOutputSubset(JSON.parse(await readFile(path.resolve(context.schema), "utf8")));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
await access(codex);
await access(authSource);

function invoke(args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(codex, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", timedOut = false, forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
    child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut }); });
  });
}

let activeContexts = 0, maximumObservedConcurrency = 0;
async function runContext(context, contextIndex) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `v42211733-publication-${context.debateNumber}-`));
  const codexHome = await mkdtemp(path.join(os.tmpdir(), `v42211733-publication-home-${context.debateNumber}-`));
  const startedAt = new Date().toISOString(), started = Date.now();
  let record;
  activeContexts += 1;
  maximumObservedConcurrency = Math.max(maximumObservedConcurrency, activeContexts);
  try {
    const copies = [[manifest.modelInputs.workflow, "workflow.md"], [manifest.modelInputs.outputContract, "output-contract.md"], [manifest.modelInputs.manual, "manual.md"], [manifest.modelInputs.referenceCatalog, "reference-catalog.json"], [context.packet, "packet.json"], [context.schema, "schema.json"]];
    for (const [source, target] of copies) await copyFile(path.resolve(source), path.join(temporary, target));
    await copyFile(authSource, path.join(codexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: codexHome };
    for (const key of ["OPENAI_API_KEY", "OPENAI_ORG_ID", "CODEX_API_KEY"]) delete env[key];
    const prompt = `Read workflow.md, output-contract.md, manual.md, reference-catalog.json, packet.json, and schema.json completely and no other files. Act only as the isolated publication editor for Debate ${context.debateNumber}. Participant judgment and every score are closed and repository-owned. Author exactly the schema fields: source-exact representative quotes, prose for every locked move, Overall Commentary, post-scoring references, and a balanced separately disclosed AI Extension with complete novelty mappings. Write every critique in exactly four labeled sentences and 112–122 words. Use only exact local references. Never infer or emit a score, change identity or structure, consult legacy assessment material, or attribute AI material to a participant. Return exactly one schema-conforming JSON object and nothing else.`;
    process.stdout.write(`[v4.2.21.17.33-publication-transport] starting index ${contextIndex} ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber}\n`);
    const invocation = await invoke(["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort="${manifest.model.reasoningEffort}"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env }, manifest.executionPolicy.timeoutMsPerContext);
    const resultExists = await exists(path.join(temporary, "result.json"));
    const base = { contextIndex, debateNumber: context.debateNumber, debateId: context.debateId, model: manifest.model.label, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, authentication: "ChatGPT subscription", apiKeysRemoved: true, copiedInputBytes: context.copiedInputBytes, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0, modelAuthoredScores: 0, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
      const failureMessage = `${invocation.stdout}\n${invocation.stderr}`.trim().slice(-10000);
      const status = invocation.timedOut ? "timed-out" : failureMessage.includes("invalid_json_schema") ? "schema-rejected" : !resultExists ? "result-missing" : "transport-failed";
      record = { ...base, status, gateAcceptancePassed: false, outputWritten: false, failureMessage };
    }
    else {
      await mkdir(path.dirname(path.resolve(context.output)), { recursive: true });
      await copyFile(path.join(temporary, "result.json"), path.resolve(context.output));
      let validation = null, validationMessage = null;
      try { validation = validateV42211732PublicationOutput(JSON.parse(await readFile(path.resolve(context.output), "utf8")), JSON.parse(await readFile(path.resolve(context.packet), "utf8"))); }
      catch (error) { validationMessage = error.stack ?? error.message; }
      record = { ...base, status: validation?.status === "passed" ? "completed-valid" : "output-validation-failed", gateAcceptancePassed: validation?.status === "passed", outputWritten: true, outputSha256: sha256(await readFile(path.resolve(context.output))), validationSummary: validation, validationMessage: validationMessage?.slice(-10000) ?? null };
    }
  } catch (error) {
    record = { contextIndex, debateNumber: context.debateNumber, debateId: context.debateId, model: manifest.model.label, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, authentication: "ChatGPT subscription", apiKeysRemoved: true, copiedInputBytes: context.copiedInputBytes, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0, modelAuthoredScores: 0, status: "runner-error", gateAcceptancePassed: false, outputWritten: await exists(context.output), failureMessage: (error.stack ?? String(error)).slice(-10000) };
  } finally {
    activeContexts -= 1;
    await rm(temporary, { recursive: true, force: true });
    await rm(codexHome, { recursive: true, force: true });
  }
  process.stdout.write(`[v4.2.21.17.33-publication-transport] Debate ${context.debateNumber} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
  return record;
}

async function runPool(indexes, maximumConcurrency) {
  const queue = [...indexes], completed = [];
  async function worker() { while (queue.length) { const index = queue.shift(); completed.push(await runContext(manifest.contexts[index], index)); } }
  await Promise.all(Array.from({ length: Math.min(maximumConcurrency, indexes.length) }, worker));
  return completed.sort((left, right) => left.contextIndex - right.contextIndex);
}

const gateStartedAt = new Date().toISOString(), gateStarted = Date.now();
const results = [], rampPhases = [];
let expansionAuthorized = true;
for (const phase of manifest.executionPolicy.rampPhases) {
  if (!expansionAuthorized) { rampPhases.push({ ...phase, attemptedContextIndexes: [], validContextIndexes: [], passed: false, skippedBecausePriorRampFailed: true }); continue; }
  const phaseResults = await runPool(phase.contextIndexes, manifest.executionPolicy.maximumConcurrency);
  results.push(...phaseResults);
  const validContextIndexes = phaseResults.filter((result) => result.gateAcceptancePassed).map((result) => result.contextIndex);
  const passed = validContextIndexes.length === phase.contextIndexes.length;
  rampPhases.push({ ...phase, attemptedContextIndexes: phaseResults.map((result) => result.contextIndex), validContextIndexes, passed, skippedBecausePriorRampFailed: false });
  if (phase.expansionRequiresAllValid && !passed) expansionAuthorized = false;
}
results.sort((left, right) => left.contextIndex - right.contextIndex);
const validContexts = results.filter((result) => result.gateAcceptancePassed).length;
const unattemptedContextIndexes = manifest.contexts.map((_, index) => index).filter((index) => !results.some((result) => result.contextIndex === index));
const passed = results.length === 5 && validContexts === 5;
const execution = { schemaVersion: "4.2.21.17.33-hard-route-publication-transport-model-execution", protocolId: manifest.protocolId, status: passed ? "five-hard-route-publication-contexts-passed" : "hard-route-publication-gate-complete-with-failure", gateStartedAt, gateCompletedAt: new Date().toISOString(), contextsPlanned: 5, contextsAttempted: results.length, unattemptedContextIndexes, validContexts, invalidContexts: results.length - validContexts, attempts: results.length, retries: 0, correctionContexts: 0, maximumObservedConcurrency, wallElapsedMs: Date.now() - gateStarted, aggregateModelElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0), meanElapsedMs: results.length ? results.reduce((sum, result) => sum + result.elapsedMs, 0) / results.length : null, rampPhases, results, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0, modelAuthoredScores: 0, authorization: { deterministicAnalysis: true, retry: false, correctionModelExecution: false, deterministicCompilation: false, renderingVerification: false, readinessPromotion: false } };
await writeFile(path.resolve(manifest.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: execution.status, contextsAttempted: execution.contextsAttempted, unattemptedContextIndexes, validContexts, invalidContexts: execution.invalidContexts, wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)), aggregateModelElapsedMinutes: Number((execution.aggregateModelElapsedMs / 60000).toFixed(2)), retries: 0, correctionContexts: 0, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0, modelAuthoredScores: 0 }, null, 2));
