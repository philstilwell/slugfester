#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/calibration/v4.2.21.17.25/hard-route-independent-judgments";
const manifest = JSON.parse(await readFile(`${ROOT}/execution-manifest.json`, "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
assertV4(manifest.status === "frozen-ten-hard-route-independent-judgment-contexts-authorized" && manifest.authorization.modelContexts, "hard-route independent judgment execution unauthorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assertV4(!(await exists(future)), `future output exists: ${future}`);
await access(codex);
await access(authSource);

function run(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", timedOut = false, forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
    child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut }); });
  });
}

const tail = (value, maximum = 10000) => value.length <= maximum ? value : value.slice(-maximum);
let activeContexts = 0;
let maximumObservedConcurrency = 0;
async function runContext(context, contextIndex) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v1725-${context.debateNumber}-${context.reviewerPass.toLowerCase()}-`));
  const codexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v1725-home-${context.debateNumber}-${context.reviewerPass.toLowerCase()}-`));
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let record;
  activeContexts += 1;
  maximumObservedConcurrency = Math.max(maximumObservedConcurrency, activeContexts);
  try {
    for (const [source, target] of [[manifest.modelInputs.manual, "manual.md"], [context.sourcePacket, "source-packet.json"], [context.judgmentPacket, "judgment-packet.json"], [context.schema, "schema.json"]]) await copyFile(source, path.join(temporary, target));
    await copyFile(authSource, path.join(codexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: codexHome };
    for (const key of ["OPENAI_API_KEY", "OPENAI_ORG_ID", "CODEX_API_KEY"]) delete env[key];
    const prompt = `Read manual.md, source-packet.json, judgment-packet.json, and schema.json; read nothing else. Act only as isolated independent performance Judge ${context.reviewerPass} for Debate ${context.debateNumber}. Judge every locked move exactly once. The score-blind inventory, chronology, source evidence, routes, sections, and propositions are immutable. Use only legal earlier-opposing targets exposed by the schema. Apply the response-component, partial-answer, burden-relevance, charity, confidence, and strict burden-residual anchors. Do not calculate scores, name a winner, claim audio review, alter candidate selection, or write Overall Commentary, AI Extension, or publication prose. The other independent judgment is unavailable. Return exactly one schema-conforming JSON object.`;
    process.stdout.write(`[v4.2.21.17.25-judgment] starting index ${contextIndex} ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber} Pass ${context.reviewerPass}\n`);
    const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort="${manifest.model.reasoningEffort}"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env }, manifest.executionPolicy.timeoutMsPerContext);
    const resultExists = await exists(path.join(temporary, "result.json"));
    const base = { contextIndex, debateNumber: context.debateNumber, reviewerPass: context.reviewerPass, reviewerRole: context.reviewerRole, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, authentication: "ChatGPT subscription", apiKeysRemoved: true, copiedInputBytes: context.copiedInputBytes, lockedInventorySha256: context.lockedInventoryCanonicalSha256, meteredApiCostUsd: 0, transcriptionCostUsd: 0, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
      record = { ...base, status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed", accepted: false, judgmentWritten: false, stdoutTail: tail(invocation.stdout), stderrTail: tail(invocation.stderr) };
    } else {
      await mkdir(path.dirname(context.judgmentOutput), { recursive: true });
      await copyFile(path.join(temporary, "result.json"), context.judgmentOutput);
      const validation = await run(process.execPath, ["scripts/validate-v42211725-hard-route-independent-judgment.mjs", context.judgmentOutput, manifest.preparation, context.debateNumber, context.reviewerPass, "--write"], { cwd: process.cwd(), env: process.env }, 180000);
      const valid = validation.code === 0 && validation.signal === null && !validation.timedOut;
      record = { ...base, status: valid ? "completed-valid" : "output-validation-failed", accepted: valid, judgmentWritten: true, judgmentSha256: sha256(await readFile(context.judgmentOutput)), validationSummary: valid ? JSON.parse(validation.stdout) : null, validatorStdoutTail: valid ? null : tail(validation.stdout), validatorStderrTail: valid ? null : tail(validation.stderr), rawOutputSha256: valid ? sha256(await readFile(context.rawOutput)) : null, validationSha256: valid ? sha256(await readFile(context.validationOutput)) : null, provenanceSha256: valid ? sha256(await readFile(context.provenanceOutput)) : null };
    }
  } catch (error) {
    record = { contextIndex, debateNumber: context.debateNumber, reviewerPass: context.reviewerPass, reviewerRole: context.reviewerRole, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, authentication: "ChatGPT subscription", apiKeysRemoved: true, copiedInputBytes: context.copiedInputBytes, lockedInventorySha256: context.lockedInventoryCanonicalSha256, meteredApiCostUsd: 0, transcriptionCostUsd: 0, status: "runner-error", accepted: false, judgmentWritten: await exists(context.judgmentOutput), error: tail(error?.stack ?? String(error)) };
  } finally {
    activeContexts -= 1;
    await rm(temporary, { recursive: true, force: true });
    await rm(codexHome, { recursive: true, force: true });
  }
  process.stdout.write(`[v4.2.21.17.25-judgment] Debate ${context.debateNumber} Pass ${context.reviewerPass} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
  return record;
}

async function runPool(indexes, maximumConcurrency) {
  const queue = [...indexes];
  const completed = [];
  async function worker() {
    while (queue.length) {
      const index = queue.shift();
      completed.push(await runContext(manifest.contexts[index], index));
    }
  }
  await Promise.all(Array.from({ length: Math.min(maximumConcurrency, indexes.length) }, worker));
  return completed.sort((a, b) => a.contextIndex - b.contextIndex);
}

const gateStartedAt = new Date().toISOString();
const gateStarted = Date.now();
const results = [];
const rampPhases = [];
let expansionAuthorized = true;
for (const phase of manifest.executionPolicy.rampPhases) {
  if (!expansionAuthorized) {
    rampPhases.push({ ...phase, attemptedContextIndexes: [], validContextIndexes: [], passed: false, skippedBecausePriorRampFailed: true });
    continue;
  }
  const phaseResults = await runPool(phase.contextIndexes, manifest.executionPolicy.maximumConcurrency);
  results.push(...phaseResults);
  const validContextIndexes = phaseResults.filter((result) => result.accepted).map((result) => result.contextIndex);
  const passed = validContextIndexes.length === phase.contextIndexes.length;
  rampPhases.push({ ...phase, attemptedContextIndexes: phaseResults.map((result) => result.contextIndex), validContextIndexes, passed, skippedBecausePriorRampFailed: false });
  if (phase.expansionRequiresAllValid && !passed) expansionAuthorized = false;
}
results.sort((a, b) => a.contextIndex - b.contextIndex);
const validContexts = results.filter((result) => result.accepted).length;
const unattemptedContextIndexes = manifest.contexts.map((_, index) => index).filter((index) => !results.some((result) => result.contextIndex === index));
const passed = results.length === 10 && validContexts === 10;
const execution = {
  schemaVersion: "4.2.21.17.25-hard-route-independent-judgment-model-execution",
  protocolId: manifest.protocolId,
  status: passed ? "ten-hard-route-independent-judgment-contexts-passed" : "hard-route-independent-judgment-gate-complete-with-failure",
  gateStartedAt,
  gateCompletedAt: new Date().toISOString(),
  contextsPlanned: 10,
  contextsAttempted: results.length,
  unattemptedContextIndexes,
  validContexts,
  invalidContexts: results.length - validContexts,
  attempts: results.length,
  retries: 0,
  maximumObservedConcurrency,
  wallElapsedMs: Date.now() - gateStarted,
  aggregateModelElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0),
  rampPhases,
  results,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
  scoresDerived: 0,
  authorization: { deterministicAnalysis: true, retry: false, semanticCorrection: false, disagreementExtraction: false, audioVerification: false, adjudication: false, scoreDerivation: false },
};
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: execution.status, contextsAttempted: execution.contextsAttempted, unattemptedContextIndexes, validContexts, invalidContexts: execution.invalidContexts, wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)), aggregateModelElapsedMinutes: Number((execution.aggregateModelElapsedMs / 60000).toFixed(2)), retries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoresDerived: 0 }, null, 2));
