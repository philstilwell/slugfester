#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { evaluateAttributionTranscript } from "./lib/v416-audio-verification.mjs";

const execFileAsync = promisify(execFile);
const modeIndex = process.argv.indexOf("--mode");
const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : null;
const shouldWrite = process.argv.includes("--write");
assert(["activate", "run", "analyze", "test"].includes(mode), "--mode activate|run|analyze|test is required");
const stageRoot = "docs/assessment-production/post-canary-continuation-v1/batch-09/audio-verification-debate-183-21";
const paths = { preparation: `${stageRoot}/execution-preparation-manifest.json`, activation: `${stageRoot}/execution-manifest.json`, execution: `${stageRoot}/model-execution.json`, audit: `${stageRoot}/audio-verification.json`, analysis: `${stageRoot}/analysis.json`, cost: `${stageRoot}/cost-control-analysis.json` };
const priorAuditPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/audio-verification-partial-18/audio-verification.json";
const priorCostPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/audio-verification-partial-18/cost-control-analysis.json";
const toolPath = "scripts/assessment-production-post-canary-batch-09-debate-183-audio-verification-stage-21.mjs";
const transcribeTool = "/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const writeJson = async (file, value) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`); };
const round = (value, places = 7) => Number(value.toFixed(places));

async function validatePreparation(preparation) {
  assert.equal(preparation.status, "prepared-exactly-two-batch-09-debate-183-paid-known-speaker-diarizations-conditional-activation-ready");
  assert.deepEqual(preparation.calls.map((call) => call.moveId), ["con-informed-deliberator-method", "con-foundational-anomaly-significance"]);
  assert.equal(preparation.calls.length, 2);
  assert.equal(preparation.costEstimate.primaryExpectedFutureIncrementalExecutionCostUsd, 0.13776);
  assert.equal(preparation.costEstimate.priorBatch9UsageDerivedCostUsd, 0.0907725);
  assert.equal(preparation.costEstimate.projectedCumulativeBatch9CostUsd, 0.2285325);
  assert(preparation.costEstimate.projectedCumulativeBatch9CostUsd <= preparation.costEstimate.maximumConditionallyAuthorizedCumulativeBatch9CostUsd);
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) assert.equal(sha256(await readFile(file)), digest, `${file}: source hash mismatch`);
  for (const call of preparation.calls) {
    assert.equal(sha256(await readFile(call.clipPath)), call.clipSha256, `${call.moveId}: clip hash mismatch`);
    assert.equal(call.knownSpeakers.length, 2);
    for (const reference of call.knownSpeakers) assert.equal(sha256(await readFile(reference.localPath)), reference.sha256, `${reference.speaker}: reference hash mismatch`);
  }
}

async function validateActivation(activation) {
  assert.equal(activation.status, "active-for-exactly-two-batch-09-debate-183-sequential-audio-verification-calls");
  assert.equal(activation.preparation.path, paths.preparation);
  assert.equal(activation.preparation.sha256, sha256(await readFile(paths.preparation)));
  const preparation = await readJson(paths.preparation);
  await validatePreparation(preparation);
  assert.deepEqual(activation.calls, preparation.calls);
  assert.deepEqual(activation.thresholds, preparation.thresholds);
  assert.deepEqual(activation.costEstimate, preparation.costEstimate);
  for (const [file, digest] of Object.entries(activation.executionToolHashes)) assert.equal(sha256(await readFile(file)), digest, `${file}: execution tool hash mismatch`);
}

async function activate() {
  const preparation = await readJson(paths.preparation);
  await validatePreparation(preparation);
  for (const file of [paths.activation, paths.execution, paths.audit, paths.analysis, paths.cost]) assert.equal(await exists(file), false, `${file} already exists`);
  const activation = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-audio-verification-21-execution-manifest",
    status: "active-for-exactly-two-batch-09-debate-183-sequential-audio-verification-calls",
    activatedAt: shouldWrite ? new Date().toISOString() : null,
    checkpointCommit: process.env.GIT_COMMIT || null,
    batchNumber: 9,
    preparation: { path: paths.preparation, sha256: sha256(await readFile(paths.preparation)) },
    model: preparation.model,
    calls: preparation.calls,
    thresholds: preparation.thresholds,
    costEstimate: preparation.costEstimate,
    executionPolicy: structuredClone(preparation.executionPolicy),
    executionToolHashes: { [toolPath]: sha256(await readFile(toolPath)), "scripts/lib/v416-audio-verification.mjs": sha256(await readFile("scripts/lib/v416-audio-verification.mjs")), [transcribeTool]: sha256(await readFile(transcribeTool)) },
    futureOutputPathsExcludedFromSourceHashes: [paths.execution, paths.audit, paths.analysis, paths.cost]
  };
  if (shouldWrite) await writeJson(paths.activation, activation);
  console.log(JSON.stringify({ status: activation.status, calls: activation.calls.length, estimatedIncrementalCostUsd: activation.costEstimate.primaryExpectedFutureIncrementalExecutionCostUsd, projectedCumulativeBatch9CostUsd: activation.costEstimate.projectedCumulativeBatch9CostUsd }));
}

async function run() {
  assert(process.env.OPENAI_API_KEY, "OPENAI_API_KEY must be set locally");
  assert.equal(await exists(paths.execution), false, `${paths.execution} already exists`);
  const activation = await readJson(paths.activation);
  await validateActivation(activation);
  for (const file of activation.futureOutputPathsExcludedFromSourceHashes) assert.equal(await exists(file), false, `${file} already exists`);
  const inputRate = activation.costEstimate.officialPricePerMillionTokensUsd.input;
  const outputRate = activation.costEstimate.officialPricePerMillionTokensUsd.output;
  const maximumCumulativeCost = activation.executionPolicy.cumulativeBatch9CostUsdMaximum;
  const priorCost = activation.costEstimate.priorBatch9UsageDerivedCostUsd;
  const results = [];
  let requestFailure = false;
  let costCapReachedOrExceeded = false;
  let incrementalCostUsd = 0;
  let cumulativeBatchCostUsd = priorCost;
  for (const call of activation.calls) {
    if (requestFailure || costCapReachedOrExceeded) {
      results.push({ debateNumber: call.debateNumber, moveId: call.moveId, expectedSpeaker: call.expectedSpeaker, status: requestFailure ? "skipped-after-request-failure" : "skipped-after-usage-derived-cumulative-cost-cap", attemptCount: 0, retryCount: 0, transcriptWritten: false, durationSeconds: call.durationSeconds, usageDerivedEstimatedCostUsd: 0, cumulativeBatch9UsageDerivedEstimatedCostUsd: round(cumulativeBatchCostUsd) });
      continue;
    }
    assert.equal(await exists(call.transcriptPath), false, `${call.transcriptPath} already exists`);
    await mkdir(path.dirname(call.transcriptPath), { recursive: true });
    const args = [transcribeTool, call.clipPath, "--model", call.model, "--response-format", call.responseFormat, "--chunking-strategy", call.chunkingStrategy, "--language", call.language, "--out", call.transcriptPath];
    for (const reference of call.knownSpeakers) args.push("--known-speaker", `${reference.speaker}=${reference.localPath}`);
    const startedAt = new Date().toISOString();
    const started = Date.now();
    let stdout = "";
    let stderr = "";
    let commandExitCode = 0;
    let failureMessage = null;
    try {
      const result = await execFileAsync("python3", args, { timeout: activation.executionPolicy.requestTimeoutMs, maxBuffer: 16 * 1024 * 1024, env: process.env });
      stdout = result.stdout || "";
      stderr = result.stderr || "";
    } catch (error) {
      stdout = error?.stdout || "";
      stderr = error?.stderr || "";
      commandExitCode = Number.isInteger(error?.code) ? error.code : 1;
      failureMessage = error?.message || String(error);
      requestFailure = true;
    }
    const transcriptWritten = await exists(call.transcriptPath);
    let transcript = null;
    let usage = null;
    let transcriptSha256 = null;
    if (transcriptWritten) {
      try {
        const transcriptBytes = await readFile(call.transcriptPath);
        transcriptSha256 = sha256(transcriptBytes);
        transcript = JSON.parse(transcriptBytes);
        const raw = transcript.usage;
        assert(raw && raw.type === "tokens", `${call.moveId}: token usage missing`);
        usage = { inputTokens: raw.input_tokens, audioInputTokens: raw.input_token_details?.audio_tokens, textInputTokens: raw.input_token_details?.text_tokens, outputTokens: raw.output_tokens, totalTokens: raw.total_tokens };
        for (const value of Object.values(usage)) assert(Number.isFinite(value) && value >= 0, `${call.moveId}: usage invalid`);
      } catch (error) { failureMessage = failureMessage || error.message; requestFailure = true; }
    } else if (!requestFailure) { failureMessage = "transcript output missing"; requestFailure = true; }
    const callCostUsd = usage ? (usage.inputTokens * inputRate + usage.outputTokens * outputRate) / 1_000_000 : 0;
    incrementalCostUsd += callCostUsd;
    cumulativeBatchCostUsd = priorCost + incrementalCostUsd;
    costCapReachedOrExceeded = cumulativeBatchCostUsd >= maximumCumulativeCost;
    results.push({ debateNumber: call.debateNumber, moveId: call.moveId, expectedSpeaker: call.expectedSpeaker, status: requestFailure ? "request-or-output-failure" : "completed", attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, commandExitCode, transcriptWritten, transcriptJsonValid: Boolean(transcript), usageValid: Boolean(usage), transcriptSha256, stdoutSha256: sha256(stdout), stderrSha256: sha256(stderr), failureMessage, durationSeconds: call.durationSeconds, usage, usageDerivedEstimatedCostUsd: round(callCostUsd), cumulativeBatch9UsageDerivedEstimatedCostUsd: round(cumulativeBatchCostUsd), cumulativeCostCapReachedOrExceededAfterCall: costCapReachedOrExceeded });
  }
  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-audio-verification-21-model-execution",
    status: requestFailure ? "batch-09-debate-183-audio-verification-stopped-after-request-or-output-failure" : costCapReachedOrExceeded ? "batch-09-debate-183-audio-verification-stopped-after-cumulative-cost-cap" : "batch-09-debate-183-two-audio-verification-calls-completed",
    batchNumber: 9,
    activationSha256: sha256(await readFile(paths.activation)),
    executionPolicy: structuredClone(activation.executionPolicy),
    results,
    totals: { attemptedCalls: results.filter((item) => item.attemptCount === 1).length, completedCalls: results.filter((item) => item.status === "completed").length, skippedCalls: results.filter((item) => item.attemptCount === 0).length, retries: 0, priorBatch9UsageDerivedCostUsd: priorCost, incrementalUsageDerivedEstimatedCostUsd: round(incrementalCostUsd), cumulativeBatch9UsageDerivedEstimatedCostUsd: round(cumulativeBatchCostUsd), maximumAuthorizedCumulativeBatch9CostUsd: maximumCumulativeCost }
  };
  if (shouldWrite) await writeJson(paths.execution, execution);
  console.log(JSON.stringify({ status: execution.status, ...execution.totals }));
  if (requestFailure) process.exitCode = 1;
}

async function analyze() {
  const activation = await readJson(paths.activation);
  await validateActivation(activation);
  const execution = await readJson(paths.execution);
  assert.equal(execution.results.length, 2);
  const verificationResults = [];
  for (const call of activation.calls) {
    const executed = execution.results.find((item) => item.moveId === call.moveId);
    assert(executed, `${call.moveId}: result missing`);
    if (executed.status !== "completed") {
      verificationResults.push({ debateNumber: call.debateNumber, moveId: call.moveId, expectedSpeaker: call.expectedSpeaker, status: "unresolved", reason: executed.status, transcriptPath: call.transcriptPath, transcriptSha256: executed.transcriptSha256, verification: null });
      continue;
    }
    const transcriptBytes = await readFile(call.transcriptPath);
    assert.equal(sha256(transcriptBytes), executed.transcriptSha256, `${call.moveId}: transcript changed`);
    const verification = evaluateAttributionTranscript(JSON.parse(transcriptBytes), call, activation.thresholds);
    verificationResults.push({ debateNumber: call.debateNumber, moveId: call.moveId, expectedSpeaker: call.expectedSpeaker, status: verification.status, transcriptPath: call.transcriptPath, transcriptSha256: executed.transcriptSha256, verification });
  }
  const verified = verificationResults.filter((item) => item.status === "verified").length;
  const unresolved = verificationResults.length - verified;
  const priorAudit = await readJson(priorAuditPath);
  const priorCost = await readJson(priorCostPath);
  assert(priorAudit.results.every((item) => item.status === "verified"));
  const completeFourClipCohortPassed = verified === 2 && unresolved === 0 && priorAudit.results.length === 2;
  const audit = { schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-audio-verification-21-audit", status: unresolved === 0 ? "verified-batch-09-debate-183-two-audio-work-items-complete-four-clip-cohort" : "batch-09-debate-183-audio-verification-has-unresolved-work-item", batchNumber: 9, executionSha256: sha256(await readFile(paths.execution)), thresholds: activation.thresholds, results: verificationResults, priorAcceptedResults: priorAudit.results.map(({ debateNumber, moveId, expectedSpeaker, status, transcriptSha256 }) => ({ debateNumber, moveId, expectedSpeaker, status, transcriptSha256 })) };
  const completed = execution.results.filter((item) => item.status === "completed");
  const incrementalTotals = completed.reduce((acc, item) => { acc.inputTokens += item.usage.inputTokens; acc.audioInputTokens += item.usage.audioInputTokens; acc.textInputTokens += item.usage.textInputTokens; acc.outputTokens += item.usage.outputTokens; acc.totalTokens += item.usage.totalTokens; acc.usageDerivedEstimatedCostUsd += item.usageDerivedEstimatedCostUsd; return acc; }, { inputTokens: 0, audioInputTokens: 0, textInputTokens: 0, outputTokens: 0, totalTokens: 0, usageDerivedEstimatedCostUsd: 0 });
  incrementalTotals.usageDerivedEstimatedCostUsd = round(incrementalTotals.usageDerivedEstimatedCostUsd);
  const cumulativeCostUsd = round(priorCost.totals.usageDerivedEstimatedCostUsd + incrementalTotals.usageDerivedEstimatedCostUsd);
  const cost = { schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-audio-verification-21-cost-control-analysis", status: cumulativeCostUsd <= 1 ? "batch-09-complete-audio-verification-cost-within-standing-cap" : "batch-09-complete-audio-verification-cost-cap-exceeded", batchNumber: 9, pricing: activation.costEstimate.officialPricePerMillionTokensUsd, calls: completed.map((item) => ({ debateNumber: item.debateNumber, moveId: item.moveId, transcriptPath: activation.calls.find((call) => call.moveId === item.moveId).transcriptPath, transcriptSha256: item.transcriptSha256, ...item.usage, usageDerivedEstimatedCostUsd: item.usageDerivedEstimatedCostUsd })), incrementalTotals, priorBatch9UsageDerivedCostUsd: priorCost.totals.usageDerivedEstimatedCostUsd, cumulativeBatch9UsageDerivedCostUsd: cumulativeCostUsd, maximumAuthorizedCumulativeBatch9CostUsd: 1, withinAuthorizedCap: cumulativeCostUsd <= 1 };
  const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-audio-verification-21-analysis", status: completeFourClipCohortPassed ? "batch-09-complete-four-clip-audio-verification-cohort-passed" : "batch-09-debate-183-audio-verification-validation-failure-stop-required", batchNumber: 9, result: { currentCalls: 2, verified, unresolved, priorAcceptedCalls: 2, completeFourClipCohortPassed, incrementalUsageDerivedCostUsd: incrementalTotals.usageDerivedEstimatedCostUsd, cumulativeBatch9UsageDerivedCostUsd: cumulativeCostUsd }, preservedControls: { sequential: true, attemptsPerCall: 1, retries: 0, audioPlaybackCalls: 0, modelContextsOtherThanFrozenTranscriptionCalls: 0, judgmentsChanged: false, scoresChanged: false, productionChanged: false }, nextAuthorizedAction: completeFourClipCohortPassed ? "resume-standing-authorized-dispute-only-adjudication-preparation" : "stop-on-audio-verification-validation-failure" };
  if (shouldWrite) { await writeJson(paths.audit, audit); await writeJson(paths.cost, cost); await writeJson(paths.analysis, analysis); }
  console.log(JSON.stringify({ status: analysis.status, verified, unresolved, incrementalCostUsd: incrementalTotals.usageDerivedEstimatedCostUsd, cumulativeBatch9CostUsd: cumulativeCostUsd }));
  if (!completeFourClipCohortPassed) process.exitCode = 1;
}

async function test() {
  await validatePreparation(await readJson(paths.preparation));
  if (await exists(paths.activation)) await validateActivation(await readJson(paths.activation));
  if (await exists(paths.execution)) { const execution = await readJson(paths.execution); assert.equal(execution.results.length, 2); assert.equal(execution.totals.retries, 0); }
  if (await exists(paths.analysis)) { const analysis = await readJson(paths.analysis); const audit = await readJson(paths.audit); const cost = await readJson(paths.cost); assert.equal(audit.results.length, 2); assert.equal(cost.withinAuthorizedCap, true); assert.equal(analysis.result.completeFourClipCohortPassed, true); }
  console.log("batch-09-debate-183-audio-verification-stage-ok");
}

if (mode === "activate") await activate();
if (mode === "run") await run();
if (mode === "analyze") await analyze();
if (mode === "test") await test();
