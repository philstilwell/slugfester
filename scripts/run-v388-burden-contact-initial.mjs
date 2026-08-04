#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { V388_CONTACT_ROOT, assert } from "./lib/v388-burden-contact.mjs";

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.resolve(root, `${V388_CONTACT_ROOT}/initial-execution-manifest.json`), "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const readBytes = (file) => readFile(path.resolve(root, file));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assert(manifest.status === "frozen-six-context-authorized" && manifest.authorization.initialBurdenContactModelExecution && !manifest.authorization.scoringModelExecution && !manifest.stopRules.furtherAutomaticRetryAuthorized, "initial contact execution unauthorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await readBytes(file)) === digest, `source hash mismatch: ${file}`);
for (const output of manifest.futureOutputPathsExcludedFromSourceHashes) { try { await access(path.resolve(root, output)); throw new Error(`future output already exists: ${output}`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
await access(codex); await access(authSource);

function run(command, args, options = {}, timeoutMs = null) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", timedOut = false, forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); });
    child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
    const timer = timeoutMs === null ? null : setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
    child.on("error", (error) => resolve({ code: null, signal: null, stdout, stderr, timedOut, spawnError: error.message }));
    child.on("close", (code, signal) => { if (timer) clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut, spawnError: null }); });
  });
}

const results = [];
for (const context of manifest.contexts) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v388-contact-${context.debateNumber}-${context.reviewerPass}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v388-home-contact-${context.debateNumber}-${context.reviewerPass}-`));
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let record;
  try {
    for (const [source, target] of [[manifest.modelInputs.workflow, "workflow.md"], [manifest.modelInputs.rubric, "rubric.md"], [manifest.modelInputs.manual, "manual.md"], [context.packet, "packet.json"], [context.schema, "schema.json"], [context.transcript, "transcript.txt"], [context.events, "events.json"]]) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
    delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
    const prompt = `Read workflow.md, rubric.md, manual.md, packet.json, schema.json, transcript.txt, and events.json completely and no other files. Act only as a fresh isolated burden-contact classifier for Debate ${context.debateNumber}. Process every packet bundle once and in order. Select exactly one anonymous complete tuple per move, cite one exact case-sensitive substring occurring once in the atomic excerpt, apply exact proposition contact, compatibility, polarity, bridge specificity, and the no-contact default, and exclude the nearest competitor. Return exactly one final schema-conforming JSON object with no progress commentary or provisional JSON. Do not infer unavailable inherited tuples or option mappings. Do not judge response quality, partial answers, logical quality, warrant, responsiveness, relevance scores, charity, calibration, participant performance, scores, totals, winner, burden adjustment, assessment prose, Overall Commentary, or AI Extension.`;
    process.stdout.write(`\n[v3.8.8-contact] starting ${manifest.model.label} Debate ${context.debateNumber} ${context.reviewerPass}\n`);
    const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
    const transportEventLines = extractTransportEvents(invocation.stderr);
    const transportClassification = classifyTransportEventCount(transportEventLines.length, manifest.executionPolicy.recoverableStreamEventsNormalMaximum, manifest.executionPolicy.recoverableStreamEventsHardMaximum);
    const base = { reviewerPass: context.reviewerPass, debateNumber: context.debateNumber, debateId: context.debateId, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, bundleCount: context.bundleCount, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, terminationSignal: invocation.signal, commandExitCode: invocation.code, subscriptionAuthenticated: true, apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, recoverableStreamEvents: transportEventLines.length, transportClassification, transportEventLines, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr), spawnError: invocation.spawnError };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) record = { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, gateAcceptancePassed: false };
    else {
      await mkdir(path.dirname(path.resolve(root, context.output)), { recursive: true });
      await copyFile(path.join(temporary, "result.json"), path.resolve(root, context.output));
      const validation = await run(process.execPath, ["scripts/validate-v388-burden-contact-output.mjs", context.output, context.packet, context.schema], { cwd: root, env: process.env });
      const contentValid = validation.code === 0;
      const transportValid = transportClassification !== "invalid";
      record = { ...base, status: contentValid && transportValid ? `completed-valid-${transportClassification}` : !transportValid ? "recoverable-stream-event-limit-exceeded" : "output-validation-failed", outputWritten: true, outputSha256: sha256(await readBytes(context.output)), deterministicValidationPassed: contentValid, gateAcceptancePassed: contentValid && transportValid, validationExitCode: validation.code, validationMessage: contentValid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-4000), validationSummary: contentValid ? JSON.parse(validation.stdout) : null };
    }
  } finally { await rm(temporary, { recursive: true, force: true }); await rm(temporaryCodexHome, { recursive: true, force: true }); }
  results.push(record);
}
const execution = { schemaVersion: "3.8.8-burden-contact-initial-model-execution", protocolId: manifest.protocolId, stage: manifest.stage, startedAt: results[0]?.startedAt ?? null, completedAt: new Date().toISOString(), contextsPlanned: 6, validOutputContexts: results.filter((item) => item.gateAcceptancePassed).length, totalBundles: results.reduce((sum, item) => sum + item.bundleCount, 0), totalAttempts: results.length, totalRetries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, results };
await writeFile(path.resolve(root, manifest.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
assert(execution.validOutputContexts === 6 && execution.totalBundles === 144, "initial contact execution failed; disagreement extraction remains blocked");
console.log(JSON.stringify({ status: "v3.8.8-burden-contact-initial-passed", validOutputContexts: 6, newMoves: 72, outputBundlesAcrossPasses: 144, inheritedTwoVoteTuples: 9, meteredApiCostUsd: 0, disagreementExtractionAuthorized: true, scoringAuthorized: false }, null, 2));
