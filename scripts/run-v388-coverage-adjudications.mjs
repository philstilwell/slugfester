#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { V388_CONSENSUS_ROOT, assert } from "./lib/v388-coverage-consensus.mjs";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";

const root = process.cwd();
const manifestPath = `${V388_CONSENSUS_ROOT}/adjudication/execution-manifest.json`;
const dryRun = process.argv.includes("--dry-run");
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const readBytes = (file) => readFile(path.resolve(root, file));
const read = async (file) => (await readBytes(file)).toString("utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifest = JSON.parse(await read(manifestPath));
assert(manifest.status === "frozen-three-context-adjudication-authorized" && manifest.authorization.coverageAdjudicationModelExecution && manifest.authorization.coverageAdjudicationContexts === 3, "coverage adjudication execution not authorized");
assert(!manifest.authorization.scoringModelExecution && !manifest.authorization.assessmentProse && !manifest.stopRules.furtherAutomaticRetryAuthorized, "downstream or retry boundary invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await readBytes(file)) === digest, `source hash mismatch: ${file}`);
for (const output of manifest.futureOutputPathsExcludedFromSourceHashes) { try { await access(path.resolve(root, output)); throw new Error(`future output already exists: ${output}`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
await access(codex); await access(authSource);
if (dryRun) { console.log(JSON.stringify({ status: "passed-dry-run", modelContextsExecuted: 0, adjudicationContextsPlanned: 3, debateNumbers: Object.keys(manifest.adjudicationContexts), disputedFields: manifest.upstream.disagreements, privateOptionMapsInModelContexts: 0, initialPassOutputsInModelContexts: 0, undisputedFieldsInModelContexts: 0, otherAdjudicationOutputsInModelContexts: 0, subscriptionAuthenticationAvailable: true, APIKeysWillBeRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2)); process.exit(0); }

function run(command, args, options = {}, timeoutMs = null) { return new Promise((resolve) => { const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] }); let stdout = "", stderr = "", timedOut = false, forceTimer = null; child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); }); child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); }); const timer = timeoutMs === null ? null : setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs); child.on("error", (error) => resolve({ code: null, signal: null, stdout, stderr, timedOut, spawnError: error.message })); child.on("close", (code, signal) => { if (timer) clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut, spawnError: null }); }); }); }
const results = [];
for (const debateNumber of Object.keys(manifest.adjudicationContexts)) {
  const context = manifest.adjudicationContexts[debateNumber];
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v388-adjudication-${debateNumber}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v388-home-adjudication-${debateNumber}-`));
  const startedAt = new Date().toISOString(); const start = Date.now(); let result;
  try {
    const sources = [[manifest.modelInputs.workflow, "workflow.md"], [manifest.modelInputs.rubric, "rubric.md"], [manifest.modelInputs.manual, "manual.md"], [context.packet, "packet.json"], [context.schema, "schema.json"]];
    for (const [source, target] of sources) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome }; delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
    const prompt = `Read workflow.md, rubric.md, manual.md, packet.json, and schema.json completely and no other files. Act only as a fresh isolated dispute-only coverage adjudicator for Debate ${debateNumber}. Decide every disputed field in packet order and select exactly one supplied anonymous option. Do not infer pass identity, add a third value, merge options, alter undisputed fields, emit progress commentary, or emit provisional JSON. Return exactly one final schema-conforming JSON object. Do not classify burden contact, assign sections, weights, or importance, score participants, infer a winner, reconstruct prose, write Overall Commentary, or write an AI Extension.`;
    process.stdout.write(`\n[v3.8.8-coverage-adjudication] starting ${manifest.model.label} Debate ${debateNumber} (${context.fieldCount} fields)\n`);
    const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
    const transportEventLines = extractTransportEvents(invocation.stderr); const transportClassification = classifyTransportEventCount(transportEventLines.length, manifest.executionPolicy.recoverableStreamEventsNormalMaximum, manifest.executionPolicy.recoverableStreamEventsHardMaximum);
    const base = { debateNumber, fieldCount: context.fieldCount, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - start, timeoutMs: manifest.executionPolicy.perInvocationTimeoutMs, timedOut: invocation.timedOut, terminationSignal: invocation.signal, commandExitCode: invocation.code, subscriptionAuthenticated: true, apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, recoverableStreamEvents: transportEventLines.length, transportClassification, transportEventLines, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr), spawnError: invocation.spawnError };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) result = { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, gateAcceptancePassed: false };
    else {
      await mkdir(path.dirname(path.resolve(root, context.output)), { recursive: true }); await copyFile(path.join(temporary, "result.json"), path.resolve(root, context.output));
      const validation = await run(process.execPath, ["scripts/validate-v388-coverage-adjudication.mjs", context.output, context.packet, context.schema], { cwd: root, env: process.env });
      const contentValid = validation.code === 0; const transportValid = transportClassification !== "invalid"; const valid = contentValid && transportValid;
      result = { ...base, status: valid ? `completed-valid-${transportClassification}` : !transportValid ? "recoverable-stream-event-limit-exceeded" : "output-validation-failed", outputWritten: true, outputSha256: sha256(await readBytes(context.output)), deterministicValidationPassed: contentValid, gateAcceptancePassed: valid, validationExitCode: validation.code, validationMessage: valid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-4000), validationSummary: contentValid ? JSON.parse(validation.stdout) : null };
    }
  } catch (error) { result = { debateNumber, fieldCount: context.fieldCount, model: manifest.model.label, status: "execution-error", attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - start, timedOut: false, subscriptionAuthenticated: true, apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, outputWritten: false, deterministicValidationPassed: false, gateAcceptancePassed: false, error: error.message }; }
  finally { await rm(temporary, { recursive: true, force: true }); await rm(temporaryCodexHome, { recursive: true, force: true }); }
  results.push(result);
}
const execution = { schemaVersion: "3.8.8-coverage-adjudication-model-execution", protocolId: manifest.protocolId, stage: manifest.stage, startedAt: results[0]?.startedAt ?? null, completedAt: new Date().toISOString(), contextsPlanned: 3, validOutputContexts: results.filter((item) => item.gateAcceptancePassed).length, totalAttempts: results.length, totalRetries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, results };
await writeFile(path.resolve(root, manifest.artifacts.adjudicationExecution), `${JSON.stringify(execution, null, 2)}\n`);
assert(execution.validOutputContexts === 3, "v3.8.8 coverage adjudication failed; consensus merge remains blocked");
console.log(JSON.stringify({ status: "v3.8.8-coverage-adjudication-passed", validOutputContexts: 3, debateNumbers: results.map((item) => item.debateNumber), disputedFields: Object.fromEntries(results.map((item) => [item.debateNumber, item.fieldCount])), transportClassifications: Object.fromEntries(results.map((item) => [item.debateNumber, item.transportClassification])), meteredApiCostUsd: 0, transcriptionCostUsd: 0, deterministicConsensusMergeAuthorized: true, scoringAuthorized: false, assessmentProseAuthorized: false }, null, 2));
