#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  V384_COVERAGE_EXECUTION_MANIFEST,
  V384_DEBATE_NUMBERS,
  assert
} from "./lib/v384-coverage-preparation.mjs";

const root = process.cwd();
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const concurrency = Number(process.env.SLUGFESTER_MODEL_CONCURRENCY ?? 2);
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 3, "SLUGFESTER_MODEL_CONCURRENCY must be 1-3");
const manifest = await readJson(V384_COVERAGE_EXECUTION_MANIFEST);
assert(manifest.status === "frozen-coverage-proposal-execution-authorized" && manifest.authorization.coverageProposalModelExecution === true, "v3.8.4 coverage proposal execution is not authorized");
assert(manifest.authorization.coverageReviewModelExecution === false && manifest.authorization.numericalParticipantScoring === false && manifest.authorization.assessmentProse === false, "downstream authorization boundary invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
await access(codex);
await access(authSource);

for (const context of Object.values(manifest.proposalContexts)) {
  for (const output of [context.rawOutput, context.enrichedOutput]) {
    try {
      await access(path.resolve(root, output));
      throw new Error(`future output already exists; correction requires a new lock: ${output}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

function run(command, args, options = {}, timeoutMs = null) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let forceTimer = null;
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
const streamPattern = /(reconnect|resum(?:e|ing)|stream[^\n]{0,50}recover|retrying[^\n]{0,50}stream)/ig;
const prompt = "Read workflow.md, rubric.md, manual.md, packet.json, transcript.txt, and events.json completely and no other files. Act only as the isolated coverage-proposer. Treat the eight seed moves as incomplete source anchors, not a truth key. Review the full transcript, decide every seed in order, add every missing assessment-relevant move in chronological order, account for all ten accepted bridges, and audit concessions for both sides. Use event coordinates and selected move references exactly as the packet and schema require. Return exactly one schema-conforming JSON object. Do not classify burden contact, assign sections or weights or importance, score participants, infer a winner, reconstruct legacy prose, write Overall Commentary, or write an AI Extension.";

async function modelTask(context) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v384-coverage-${context.debateNumber}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v384-home-coverage-${context.debateNumber}-`));
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
    process.stdout.write(`\n[v3.8.4-coverage] starting ${manifest.model.label} Debate ${context.debateNumber}\n`);
    const invocation = await run(codex, [
      "exec",
      "--ephemeral",
      "--skip-git-repo-check",
      "--ignore-user-config",
      "--ignore-rules",
      "--model",
      manifest.model.slug,
      "-c",
      `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`,
      "--disable", "plugins",
      "--disable", "remote_plugin",
      "--disable", "skill_search",
      "--disable", "apps",
      "--disable", "memories",
      "--disable", "multi_agent",
      "--disable", "browser_use",
      "--disable", "computer_use",
      "--disable", "workspace_dependencies",
      "--sandbox", "read-only",
      "--output-schema", "schema.json",
      "--output-last-message", "result.json",
      prompt
    ], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
    const log = `${invocation.stdout}\n${invocation.stderr}`;
    const recoveries = [...log.matchAll(streamPattern)].length;
    const base = {
      debateNumber: context.debateNumber,
      stage: "full-coverage-proposal",
      model: manifest.model.label,
      modelSlug: manifest.model.slug,
      reasoningEffort: manifest.model.reasoningEffort,
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
      transcriptionCostUsd: 0,
      commandExitCode: invocation.code,
      preInferenceSchemaRejected: invocation.code !== 0 && schemaPattern.test(log),
      sameRequestStreamRecoveries: recoveries,
      streamRecoveryLimit: manifest.executionPolicy.sameRequestStreamRecoveriesMaximumPerContext,
      spawnError: invocation.spawnError
    };
    if (invocation.timedOut || invocation.code !== 0) {
      return { ...base, status: invocation.timedOut ? "timed-out" : base.preInferenceSchemaRejected ? "pre-inference-schema-rejected" : "transport-failed", outputWritten: false, deterministicValidationPassed: false };
    }
    const rawPath = path.resolve(root, context.rawOutput);
    await mkdir(path.dirname(rawPath), { recursive: true });
    await copyFile(path.join(temporary, "result.json"), rawPath);
    const validation = await run(process.execPath, [
      "scripts/validate-v384-coverage-proposal.mjs",
      context.rawOutput,
      context.packet,
      context.schema,
      context.events,
      context.enrichedOutput
    ], { cwd: root, env: process.env });
    const schemaValid = validation.code === 0;
    const streamValid = recoveries <= manifest.executionPolicy.sameRequestStreamRecoveriesMaximumPerContext;
    const valid = schemaValid && streamValid;
    const rawText = await read(context.rawOutput);
    const enrichedText = schemaValid ? await read(context.enrichedOutput) : null;
    process.stdout.write(`[v3.8.4-coverage] Debate ${context.debateNumber} ${valid ? "completed-valid" : streamValid ? "output-validation-failed" : "stream-recovery-limit-exceeded"}\n`);
    return {
      ...base,
      status: valid ? "completed-valid" : !streamValid ? "stream-recovery-limit-exceeded" : "output-validation-failed",
      outputWritten: true,
      outputSha256: sha256(rawText),
      enrichedOutputWritten: schemaValid,
      enrichedOutputSha256: enrichedText === null ? null : sha256(enrichedText),
      deterministicValidationPassed: valid,
      validationExitCode: validation.code,
      validationMessage: valid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-3000)
    };
  } catch (error) {
    return {
      debateNumber: context.debateNumber,
      stage: "full-coverage-proposal",
      model: manifest.model.label,
      status: "execution-error",
      attemptCount: 1,
      retryCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - start,
      timedOut: false,
      subscriptionAuthenticated: true,
      apiKeysRemoved: true,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      outputWritten: false,
      deterministicValidationPassed: false,
      error: error.message
    };
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
}

const contexts = V384_DEBATE_NUMBERS.map((debateNumber) => manifest.proposalContexts[debateNumber]);
const startedAt = new Date().toISOString();
const results = await pool(contexts.map((context) => () => modelTask(context)));
const execution = {
  schemaVersion: "3.8.4-full-coverage-proposal-model-execution",
  protocolId: manifest.protocolId,
  stage: "full-coverage-proposal",
  startedAt,
  completedAt: new Date().toISOString(),
  authentication: "ChatGPT subscription auth copied into isolated temporary CODEX_HOME; API keys removed",
  contextsPlanned: contexts.length,
  validOutputContexts: results.filter((item) => item.status === "completed-valid").length,
  timedOutContexts: results.filter((item) => item.timedOut).length,
  preInferenceSchemaRejections: results.filter((item) => item.preInferenceSchemaRejected).length,
  totalAttempts: results.reduce((sum, item) => sum + item.attemptCount, 0),
  totalRetries: 0,
  sameRequestStreamRecoveries: results.reduce((sum, item) => sum + (item.sameRequestStreamRecoveries ?? 0), 0),
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
  results
};
await mkdir(path.dirname(path.resolve(root, manifest.artifacts.proposalExecution)), { recursive: true });
await writeFile(path.resolve(root, manifest.artifacts.proposalExecution), `${JSON.stringify(execution, null, 2)}\n`);
assert(execution.validOutputContexts === contexts.length, "not all coverage proposal contexts produced valid outputs; review packet construction is blocked");
console.log(JSON.stringify({
  status: "v3.8.4-full-coverage-proposals-recorded",
  validOutputContexts: execution.validOutputContexts,
  totalAttempts: execution.totalAttempts,
  totalRetries: execution.totalRetries,
  sameRequestStreamRecoveries: execution.sameRequestStreamRecoveries,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
  downstreamCoverageReviewAuthorized: false,
  scoringAuthorized: false,
  assessmentProseAuthorized: false
}, null, 2));
