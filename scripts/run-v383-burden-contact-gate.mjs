#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { V383_DEBATES, V383_PASSES, assert } from "./lib/v383-burden-contact.mjs";
import { V383_EXECUTION_MANIFEST } from "./lib/v383-execution.mjs";
import { parseStructuredStreamRetries, validateStructuredStreamRetries } from "./lib/v382-source-transport.mjs";

const root = process.cwd();
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => { try { await access(path.resolve(root, file)); return true; } catch { return false; } };
const manifest = await readJson(V383_EXECUTION_MANIFEST);
const phaseLock = await readJson(manifest.phaseLock);
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const concurrency = Number(process.env.SLUGFESTER_MODEL_CONCURRENCY ?? 2);
assert(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 3, "SLUGFESTER_MODEL_CONCURRENCY must be 1-3");
assert(manifest.status === "frozen-classification-execution-authorized" && manifest.authorization.burdenContactClassificationInitialPasses === true, "v3.8.3 classification execution is not authorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
assert(!(await exists(manifest.artifacts.initialExecution)), "initial execution record already exists; frozen execution cannot be rerun");
for (const reviewerPass of V383_PASSES) for (const debateNumber of V383_DEBATES) assert(!(await exists(manifest.contexts[reviewerPass][debateNumber].output)), `${reviewerPass}.${debateNumber}: output already exists before frozen run`);
await access(codex);
await access(authSource);

function run(command, args, options = {}, timeoutMs = null) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", timedOut = false, forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); });
    child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
    const timer = timeoutMs === null ? null : setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeoutMs);
    child.on("error", (error) => resolve({ code: null, signal: null, stdout, stderr, timedOut, spawnError: error.message }));
    child.on("close", (code, signal) => {
      if (timer) clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      resolve({ code, signal, stdout, stderr, timedOut, spawnError: null });
    });
  });
}

async function pool(tasks) {
  let next = 0;
  const results = new Array(tasks.length);
  const workers = Array.from({ length: Math.min(concurrency, tasks.length || 1) }, async () => {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      results[index] = await tasks[index]();
    }
  });
  await Promise.all(workers);
  return results;
}

const schemaPattern = /(invalid[^\n]{0,80}(json )?schema|response[_ -]?format[^\n]{0,80}(invalid|unsupported|reject)|json schema[^\n]{0,80}(invalid|unsupported|reject))/i;
function stagePrompt(stage) {
  if (stage === "classification") return "Read workflow.md, rubric.md, manual.md, packet.json, transcript.txt, and events.json completely and no other files. Act only as one isolated burden-contact classifier. Process every bundle once and in order. Select exactly one complete anonymous option per move, cite one exact case-sensitive substring occurring once in the atomic excerpt, and apply exact proposition contact, compatibility, polarity, bridge specificity, and nearest exclusion. Return exactly one schema-conforming JSON object. Do not emit scores, participant assessments, Overall Commentary, AI Extension, or prose outside the JSON.";
  return "Read workflow.md, rubric.md, manual.md, packet.json, transcript.txt, and events.json completely and no other files. Act only as the isolated burden-contact adjudicator. Each packet bundle contains exactly the two semantic tuples selected by the initial classifiers for a disputed move. Select one supplied anonymous option per move, cite one exact case-sensitive substring occurring once in the atomic excerpt, and apply the invariant contact rules. Do not infer pass identity, add a third value, score participants, or write assessment prose. Return exactly one schema-conforming JSON object.";
}

async function modelTask(stage, context) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v383-${stage}-${context.reviewerPass}-${context.debateNumber}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v383-home-${stage}-${context.reviewerPass}-${context.debateNumber}-`));
  const startedAt = new Date().toISOString();
  const start = Date.now();
  try {
    const sources = [
      [manifest.modelInputs.workflow, "workflow.md"],
      [manifest.modelInputs.rubric, "rubric.md"],
      [manifest.modelInputs.manual, "manual.md"],
      [context.packet, "packet.json"],
      [context.schema, "schema.json"],
      [context.transcript, "transcript.txt"],
      [context.events, "events.json"]
    ];
    for (const [source, target] of sources) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
    delete environment.OPENAI_API_KEY;
    delete environment.OPENAI_ORG_ID;
    delete environment.CODEX_API_KEY;
    process.stdout.write(`\n[v3.8.3-classification] starting ${manifest.model.label} Debate ${context.debateNumber} ${context.reviewerPass}\n`);
    const invocation = await run(codex, [
      "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules",
      "--model", manifest.model.slug,
      "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`,
      "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies",
      "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", stagePrompt(stage)
    ], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
    const log = `${invocation.stdout}\n${invocation.stderr}`;
    const recoveryEvents = validateStructuredStreamRetries(parseStructuredStreamRetries(log));
    const base = {
      stage,
      debateNumber: context.debateNumber,
      reviewerPass: context.reviewerPass,
      model: manifest.model.label,
      modelSlug: manifest.model.slug,
      reasoningEffort: manifest.model.reasoningEffort,
      itemCount: context.itemCount,
      attemptCount: 1,
      retryCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - start,
      timeoutMs: manifest.executionPolicy.perInvocationTimeoutMs,
      timedOut: invocation.timedOut,
      terminationSignal: invocation.signal,
      subscriptionAuthenticated: true,
      apiKeysRemoved: true,
      meteredApiCostUsd: 0,
      commandExitCode: invocation.code,
      preInferenceSchemaRejected: invocation.code !== 0 && schemaPattern.test(log),
      sameRequestStreamRecoveries: recoveryEvents.length,
      structuredStreamRecoveryEvents: recoveryEvents,
      streamRecoveryLimit: manifest.executionPolicy.sameRequestStreamRecoveriesMaximumPerContext,
      spawnError: invocation.spawnError
    };
    if (invocation.timedOut || invocation.code !== 0) return { ...base, status: invocation.timedOut ? "timed-out" : base.preInferenceSchemaRejected ? "pre-inference-schema-rejected" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, semanticValidationPassed: false, transportPolicyPassed: recoveryEvents.length <= manifest.executionPolicy.sameRequestStreamRecoveriesMaximumPerContext, invalidItemCount: context.itemCount, scoringFieldCount: 0 };
    const outputPath = path.resolve(root, context.output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    try {
      await copyFile(path.join(temporary, "result.json"), outputPath);
      const outputText = await readFile(outputPath, "utf8");
      const parsed = JSON.parse(outputText);
      const validation = await run(process.execPath, ["scripts/validate-v383-burden-contact-output.mjs", context.output, context.packet, context.schema], { cwd: root, env: process.env });
      const schemaValid = validation.code === 0;
      const transportValid = recoveryEvents.length <= manifest.executionPolicy.sameRequestStreamRecoveriesMaximumPerContext;
      const valid = schemaValid && transportValid;
      process.stdout.write(`[v3.8.3-classification] Debate ${context.debateNumber} ${context.reviewerPass} ${valid ? "completed-valid" : transportValid ? "output-validation-failed" : "stream-recovery-limit-exceeded"}\n`);
      return { ...base, status: valid ? "completed-valid" : !transportValid ? "stream-recovery-limit-exceeded" : "output-validation-failed", outputWritten: true, outputSha256: sha256(outputText), deterministicValidationPassed: valid, semanticValidationPassed: schemaValid, transportPolicyPassed: transportValid, invalidItemCount: valid ? 0 : context.itemCount, scoringFieldCount: containsScoreField(parsed) ? 1 : 0, outputItemCount: Array.isArray(parsed.bundles) ? parsed.bundles.length : 0, validationExitCode: validation.code, validationMessage: valid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-2000) };
    } catch (error) {
      return { ...base, status: "output-validation-failed", outputWritten: false, deterministicValidationPassed: false, semanticValidationPassed: false, transportPolicyPassed: recoveryEvents.length <= manifest.executionPolicy.sameRequestStreamRecoveriesMaximumPerContext, invalidItemCount: context.itemCount, scoringFieldCount: 0, outputError: error.message };
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
}

function executionRecord(schemaVersion, stage, startedAt, contexts, results) {
  return {
    schemaVersion,
    protocolId: manifest.protocolId,
    stage,
    startedAt,
    completedAt: new Date().toISOString(),
    authentication: "ChatGPT subscription auth copied into isolated temporary CODEX_HOME; API keys removed",
    contextsPlanned: contexts.length,
    contextsCompleted: results.filter((item) => item.commandExitCode === 0).length,
    validOutputContexts: results.filter((item) => item.status === "completed-valid").length,
    timedOutContexts: results.filter((item) => item.timedOut).length,
    preInferenceSchemaRejections: results.filter((item) => item.preInferenceSchemaRejected).length,
    totalAttempts: results.reduce((sum, item) => sum + item.attemptCount, 0),
    totalRetries: results.reduce((sum, item) => sum + item.retryCount, 0),
    sameRequestStreamRecoveries: results.reduce((sum, item) => sum + item.sameRequestStreamRecoveries, 0),
    invalidItemCount: results.reduce((sum, item) => sum + item.invalidItemCount, 0),
    scoringFieldCount: results.reduce((sum, item) => sum + item.scoringFieldCount, 0),
    elapsedMs: results.reduce((sum, item) => sum + item.elapsedMs, 0),
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    results
  };
}

async function freezeAdjudicationPhaseLock(contexts) {
  const upstream = [manifest.artifacts.initialExecution, manifest.artifacts.initialDisagreements, manifest.artifacts.adjudicationOptionMap, ...V383_PASSES.flatMap((reviewerPass) => V383_DEBATES.map((debateNumber) => manifest.contexts[reviewerPass][debateNumber].output))];
  const upstreamHashes = {};
  for (const file of upstream) upstreamHashes[file] = sha256(await read(file));
  const lockedContexts = [];
  for (const context of contexts) {
    const modelVisibleFiles = [manifest.modelInputs.workflow, manifest.modelInputs.rubric, manifest.modelInputs.manual, context.packet, context.schema, context.transcript, context.events];
    const modelVisibleHashes = {};
    for (const file of modelVisibleFiles) modelVisibleHashes[file] = sha256(await read(file));
    lockedContexts.push({ reviewerPass: context.reviewerPass, debateNumber: context.debateNumber, modelVisibleFiles, modelVisibleHashes, outputExcludedFromLock: context.output });
  }
  const lock = { schemaVersion: "3.8.3-heldout-classification-adjudication-phase-lock", stage: "classification-adjudication", frozenAt: new Date().toISOString(), frozenBeforeStageModelExecution: true, everyModelVisibleFileHashed: true, completedUpstreamArtifactsHashed: true, futureOutputsExcluded: true, contexts: lockedContexts, upstreamHashes };
  await mkdir(path.dirname(path.resolve(root, manifest.artifacts.adjudicationPhaseLock)), { recursive: true });
  await writeFile(path.resolve(root, manifest.artifacts.adjudicationPhaseLock), `${JSON.stringify(lock, null, 2)}\n`);
}

for (const contextLock of phaseLock.contexts) for (const file of contextLock.modelVisibleFiles) assert(sha256(await read(file)) === contextLock.modelVisibleHashes[file], `${contextLock.reviewerPass}.${contextLock.debateNumber}: initial phase-lock hash mismatch for ${file}`);
const initialContexts = V383_PASSES.flatMap((reviewerPass) => V383_DEBATES.map((debateNumber) => ({ ...manifest.contexts[reviewerPass][debateNumber], reviewerPass, itemCount: 4 })));
const initialStartedAt = new Date().toISOString();
const initialResults = await pool(initialContexts.map((context) => () => modelTask("classification", context)));
const initialExecution = executionRecord("3.8.3-heldout-initial-classification-execution", "classification", initialStartedAt, initialContexts, initialResults);
await writeFile(path.resolve(root, manifest.artifacts.initialExecution), `${JSON.stringify(initialExecution, null, 2)}\n`);

const extraction = await run(process.execPath, ["scripts/extract-v383-burden-contact-disagreements.mjs", "--write"], { cwd: root, env: process.env });
assert(extraction.code === 0, `disagreement extraction failed: ${extraction.stderr}`);
const disagreements = await readJson(manifest.artifacts.initialDisagreements);
const adjudicationContexts = disagreements.adjudicationContexts;
assert(adjudicationContexts.length <= manifest.executionPolicy.adjudicationContextsMaximum, "adjudication context maximum exceeded");
await freezeAdjudicationPhaseLock(adjudicationContexts);
const adjudicationStartedAt = new Date().toISOString();
const adjudicationResults = disagreements.allInitialValid ? await pool(adjudicationContexts.map((context) => () => modelTask("classification-adjudication", context))) : [];
const adjudicationExecution = executionRecord("3.8.3-heldout-classification-adjudication-execution", "classification-adjudication", adjudicationStartedAt, adjudicationContexts, adjudicationResults);
await writeFile(path.resolve(root, manifest.artifacts.adjudicationExecution), `${JSON.stringify(adjudicationExecution, null, 2)}\n`);

const analysisRun = await run(process.execPath, ["scripts/analyze-v383-burden-contact-gate.mjs", "--write"], { cwd: root, env: process.env });
assert(analysisRun.code === 0, `classification analysis failed: ${analysisRun.stderr}`);
const analysis = await readJson(manifest.artifacts.analysis);
console.log(JSON.stringify({ status: "v3.8.3-heldout-classification-execution-recorded", passed: analysis.passed, initialValidContexts: initialExecution.validOutputContexts, initialAgreements: disagreements.counts.agreements, initialDisagreements: disagreements.counts.disagreements, adjudicationContexts: adjudicationExecution.contextsPlanned, adjudicationValidContexts: adjudicationExecution.validOutputContexts, totalRetries: initialExecution.totalRetries + adjudicationExecution.totalRetries, sameRequestStreamRecoveries: initialExecution.sameRequestStreamRecoveries + adjudicationExecution.sameRequestStreamRecoveries, numericalScoringAuthorized: false, assessmentProseAuthorized: false, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
