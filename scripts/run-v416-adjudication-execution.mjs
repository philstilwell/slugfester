#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V416_ADJUDICATION_ROOT } from "./lib/v416-adjudication.mjs";

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.resolve(root, `${V416_ADJUDICATION_ROOT}/execution-manifest.json`), "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (file) => readFile(path.resolve(root, file));
assertV4(manifest.status === "frozen-three-context-adjudication-authorized" && manifest.authorization.adjudicationModelExecution && !manifest.authorization.scoreDerivation && manifest.executionPolicy.failFastAfterFirstInvalidContext, "adjudication execution unauthorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await bytes(file)) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assertV4(!(await access(path.resolve(root, future)).then(() => true, () => false)), `future output already exists: ${future}`);
await access(codex); await access(authSource);

function run(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = ""; let timedOut = false; let forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); });
    child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
    child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut }); });
  });
}

const results = [];
for (const context of manifest.contexts) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v416-adjudication-${context.debateNumber}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v416-home-adjudication-${context.debateNumber}-`));
  const startedAt = new Date().toISOString(); const started = Date.now(); let record;
  try {
    for (const [source, target] of [[manifest.inputs.rubricBase, "rubric-v40.md"], [manifest.inputs.rubricBounded, "rubric-v41.md"], [manifest.inputs.manual, "manual.md"], [context.packet, "packet.json"], [context.schema, "schema.json"]]) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
    delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
    const prompt = `Read rubric-v40.md, rubric-v41.md, manual.md, packet.json, and schema.json completely and no other files. Act only as the isolated high-effort dispute adjudicator for Debate ${context.debateNumber}. Candidate numbers are anonymous and their ordering carries no signal. Decide every disputed move exactly once and in packet order. For each non-null response pair and charity pair, choose exactly candidate 1 or 2 and keep the pair indivisible. Choose candidate 1 or 2 for every listed scoring field; keep relevance/burden values with their supplied burden contacts and apply the closed precision and calibration mappings exactly. Decide each burden-adjustment side exactly once under the all-three eligibility and duplicate-exclusion rule. Never invent, average, interpolate, repair, rewrite, or mix candidates. Nondisputed fields, pass identities, initial rationales, full initial outputs, other debates, legacy assessments, calculated scores, winner labels, and publication prose are unavailable. Return exactly one schema-conforming JSON object with concise decision rationales and no commentary, scores, participant critique, Overall Commentary, or AI Extension.`;
    process.stdout.write(`\n[v4.1.6-adjudication] starting ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber}\n`);
    const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
    const transportEvents = extractTransportEvents(invocation.stderr);
    const transportClassification = classifyTransportEventCount(transportEvents.length, manifest.executionPolicy.recoverableStreamEventsNormalMaximum, manifest.executionPolicy.recoverableStreamEventsHardMaximum);
    const base = { debateNumber: context.debateNumber, debateId: context.debateId, disputedMoves: context.disputedMoves, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, terminationSignal: invocation.signal, commandExitCode: invocation.code, authentication: "ChatGPT subscription", apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0, recoverableStreamEvents: transportEvents.length, transportClassification, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) record = { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, gateAcceptancePassed: false };
    else {
      await mkdir(path.dirname(path.resolve(root, context.output)), { recursive: true });
      await copyFile(path.join(temporary, "result.json"), path.resolve(root, context.output));
      const validation = await run(process.execPath, ["scripts/validate-v416-adjudication-output.mjs", context.output, context.packet], { cwd: root, env: process.env }, 120000);
      const valid = validation.code === 0 && transportClassification !== "invalid";
      record = { ...base, status: valid ? transportEvents.length > 0 ? "completed-valid-recovered" : "completed-valid-transport-clean" : validation.code !== 0 ? "output-validation-failed" : "transport-event-limit-exceeded", outputWritten: true, outputSha256: sha256(await bytes(context.output)), deterministicValidationPassed: validation.code === 0, gateAcceptancePassed: valid, validationExitCode: validation.code, validationSummary: validation.code === 0 ? JSON.parse(validation.stdout) : null, validationMessage: validation.code === 0 ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-6000) };
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
  results.push(record);
  if (!record.gateAcceptancePassed) break;
}
const passed = results.length === manifest.contexts.length && results.every((item) => item.gateAcceptancePassed);
const execution = { schemaVersion: "4.1.6-dispute-only-adjudication-model-execution", protocolId: manifest.protocolId, status: passed ? "adjudication-execution-passed" : "adjudication-execution-failed-fast", contextsPlanned: manifest.contexts.length, contextsAttempted: results.length, contextsSkipped: manifest.contexts.length - results.length, validContexts: results.filter((item) => item.gateAcceptancePassed).length, disputedMovesDecided: results.reduce((sum, item) => sum + (item.gateAcceptancePassed ? item.disputedMoves : 0), 0), attempts: results.length, retries: 0, totalElapsedMs: results.reduce((sum, item) => sum + item.elapsedMs, 0), meanElapsedMs: results.length ? Math.round(results.reduce((sum, item) => sum + item.elapsedMs, 0) / results.length) : null, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0, results, authorization: { adjudicationAnalysis: passed, finalLedgerAssembly: false, scoreDerivation: false, furtherAutomaticRetry: false, publicationFinalization: false, productionMutation: false } };
await writeFile(path.resolve(root, manifest.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
assertV4(passed && execution.disputedMovesDecided === manifest.population.disputedMoves, "adjudication execution failed; downstream work remains blocked");
console.log(JSON.stringify({ status: execution.status, validContexts: execution.validContexts, disputedMovesDecided: execution.disputedMovesDecided, attempts: execution.attempts, retries: 0, totalElapsedMinutes: Number((execution.totalElapsedMs / 60000).toFixed(2)), meanElapsedMinutes: Number((execution.meanElapsedMs / 60000).toFixed(2)), adjudicationAnalysisAuthorized: execution.authorization.adjudicationAnalysis, finalLedgerAssemblyAuthorized: false, scoreDerivationAuthorized: false, meteredApiCostUsd: 0 }, null, 2));
