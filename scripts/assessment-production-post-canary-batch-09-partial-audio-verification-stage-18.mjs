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

const stageRoot = "docs/assessment-production/post-canary-continuation-v1/batch-09/audio-verification-partial-18";
const paths = {
  preparation: `${stageRoot}/execution-preparation-manifest.json`,
  activation: `${stageRoot}/execution-manifest.json`,
  execution: `${stageRoot}/model-execution.json`,
  audit: `${stageRoot}/audio-verification.json`,
  analysis: `${stageRoot}/analysis.json`,
  cost: `${stageRoot}/cost-control-analysis.json`
};
const toolPath = "scripts/assessment-production-post-canary-batch-09-partial-audio-verification-stage-18.mjs";
const transcribeTool = "/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const writeJson = async (file, value) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
};
const round = (value, places = 7) => Number(value.toFixed(places));

async function validatePreparation(preparation) {
  assert.equal(preparation.status, "prepared-two-available-batch-09-paid-known-speaker-diarizations-with-two-debate-183-blockers-conditional-activation-ready");
  assert.equal(preparation.calls.length, 2);
  assert.deepEqual(preparation.calls.map((call) => `${call.debateNumber}:${call.moveId}`), [
    "170:pro-suffering-christian-hope-response",
    "19:pro-c009-phenomenal-value-reality"
  ]);
  assert.equal(preparation.scope.partialResultsCannotAuthorizeAdjudication, true);
  assert.equal(preparation.scope.blockedMoveIds.length, 2);
  assert(preparation.costEstimate.primaryExpectedFutureExecutionCostUsd <= preparation.costEstimate.maximumConditionallyAuthorizedCostUsd);
  assert.equal(preparation.costEstimate.maximumConditionallyAuthorizedCostUsd, 1);
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) assert.equal(sha256(await readFile(file)), digest, `${file}: source hash mismatch`);
  for (const call of preparation.calls) {
    assert.equal(sha256(await readFile(call.clipPath)), call.clipSha256, `${call.moveId}: clip hash mismatch`);
    assert.equal(call.knownSpeakers.length, 2);
    for (const reference of call.knownSpeakers) assert.equal(sha256(await readFile(reference.localPath)), reference.sha256, `${reference.speaker}: reference hash mismatch`);
  }
}

async function validateActivation(activation) {
  assert.equal(activation.status, "active-for-exactly-two-available-batch-09-sequential-audio-verification-calls");
  assert.equal(activation.preparation.path, paths.preparation);
  assert.equal(sha256(await readFile(paths.preparation)), activation.preparation.sha256);
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
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-partial-audio-verification-18-execution-manifest",
    status: "active-for-exactly-two-available-batch-09-sequential-audio-verification-calls",
    activatedAt: shouldWrite ? new Date().toISOString() : null,
    checkpointCommit: process.env.GIT_COMMIT || null,
    batchNumber: 9,
    preparation: { path: paths.preparation, sha256: sha256(await readFile(paths.preparation)) },
    model: preparation.model,
    calls: preparation.calls,
    thresholds: preparation.thresholds,
    costEstimate: preparation.costEstimate,
    blockedDebate183: structuredClone(preparation.scope.blockedMoveIds),
    executionPolicy: structuredClone(preparation.executionPolicy),
    executionToolHashes: {
      [toolPath]: sha256(await readFile(toolPath)),
      "scripts/lib/v416-audio-verification.mjs": sha256(await readFile("scripts/lib/v416-audio-verification.mjs")),
      [transcribeTool]: sha256(await readFile(transcribeTool))
    },
    futureOutputPathsExcludedFromSourceHashes: [paths.execution, paths.audit, paths.analysis, paths.cost]
  };
  if (shouldWrite) await writeJson(paths.activation, activation);
  console.log(JSON.stringify({ status: activation.status, calls: activation.calls.length, estimatedCostUsd: activation.costEstimate.primaryExpectedFutureExecutionCostUsd }));
}

async function run() {
  assert(process.env.OPENAI_API_KEY, "OPENAI_API_KEY must be set locally");
  assert.equal(await exists(paths.execution), false, `${paths.execution} already exists`);
  const activation = await readJson(paths.activation);
  await validateActivation(activation);
  for (const file of activation.futureOutputPathsExcludedFromSourceHashes) assert.equal(await exists(file), false, `${file} already exists`);
  const inputRate = activation.costEstimate.officialPricePerMillionTokensUsd.input;
  const outputRate = activation.costEstimate.officialPricePerMillionTokensUsd.output;
  const maximumCost = activation.costEstimate.maximumConditionallyAuthorizedCostUsd;
  const results = [];
  let requestFailure = false;
  let costCapReachedOrExceeded = false;
  let cumulativeCostUsd = 0;
  for (const call of activation.calls) {
    if (requestFailure || costCapReachedOrExceeded) {
      results.push({
        debateNumber: call.debateNumber,
        moveId: call.moveId,
        expectedSpeaker: call.expectedSpeaker,
        status: requestFailure ? "skipped-after-request-failure" : "skipped-after-usage-derived-cost-cap",
        attemptCount: 0,
        retryCount: 0,
        transcriptWritten: false,
        durationSeconds: call.durationSeconds,
        usageDerivedEstimatedCostUsd: 0,
        cumulativeUsageDerivedEstimatedCostUsd: round(cumulativeCostUsd)
      });
      continue;
    }
    assert.equal(await exists(call.transcriptPath), false, `${call.transcriptPath} already exists`);
    await mkdir(path.dirname(call.transcriptPath), { recursive: true });
    const args = [
      transcribeTool,
      call.clipPath,
      "--model", call.model,
      "--response-format", call.responseFormat,
      "--chunking-strategy", call.chunkingStrategy,
      "--language", call.language,
      "--out", call.transcriptPath
    ];
    for (const reference of call.knownSpeakers) args.push("--known-speaker", `${reference.speaker}=${reference.localPath}`);
    const startedAt = new Date().toISOString();
    const started = Date.now();
    let stdout = "";
    let stderr = "";
    let commandExitCode = 0;
    let failureMessage = null;
    try {
      const result = await execFileAsync("python3", args, {
        timeout: activation.executionPolicy.requestTimeoutMs,
        maxBuffer: 16 * 1024 * 1024,
        env: process.env
      });
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
        usage = {
          inputTokens: raw.input_tokens,
          audioInputTokens: raw.input_token_details?.audio_tokens,
          textInputTokens: raw.input_token_details?.text_tokens,
          outputTokens: raw.output_tokens,
          totalTokens: raw.total_tokens
        };
        for (const value of Object.values(usage)) assert(Number.isFinite(value) && value >= 0, `${call.moveId}: usage invalid`);
      } catch (error) {
        failureMessage = failureMessage || error.message;
        requestFailure = true;
      }
    } else if (!requestFailure) {
      failureMessage = "transcript output missing";
      requestFailure = true;
    }
    const callCostUsd = usage
      ? (usage.inputTokens * inputRate + usage.outputTokens * outputRate) / 1_000_000
      : 0;
    cumulativeCostUsd += callCostUsd;
    costCapReachedOrExceeded = cumulativeCostUsd >= maximumCost;
    results.push({
      debateNumber: call.debateNumber,
      moveId: call.moveId,
      expectedSpeaker: call.expectedSpeaker,
      status: requestFailure ? "request-or-output-failure" : "completed",
      attemptCount: 1,
      retryCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      commandExitCode,
      transcriptWritten,
      transcriptJsonValid: Boolean(transcript),
      usageValid: Boolean(usage),
      transcriptSha256,
      stdoutSha256: sha256(stdout),
      stderrSha256: sha256(stderr),
      failureMessage,
      durationSeconds: call.durationSeconds,
      usage,
      usageDerivedEstimatedCostUsd: round(callCostUsd),
      cumulativeUsageDerivedEstimatedCostUsd: round(cumulativeCostUsd),
      costCapReachedOrExceededAfterCall: costCapReachedOrExceeded
    });
  }
  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-partial-audio-verification-18-model-execution",
    status: requestFailure
      ? "batch-09-partial-audio-verification-stopped-after-request-or-output-failure"
      : costCapReachedOrExceeded
        ? "batch-09-partial-audio-verification-stopped-after-usage-derived-cost-cap"
        : "batch-09-two-available-audio-verification-calls-completed",
    batchNumber: 9,
    activationSha256: sha256(await readFile(paths.activation)),
    executionPolicy: structuredClone(activation.executionPolicy),
    results,
    totals: {
      attemptedCalls: results.filter((result) => result.attemptCount === 1).length,
      completedCalls: results.filter((result) => result.status === "completed").length,
      skippedCalls: results.filter((result) => result.attemptCount === 0).length,
      retries: 0,
      usageDerivedEstimatedCostUsd: round(cumulativeCostUsd),
      maximumAuthorizedCostUsd: maximumCost
    }
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
    const executionResult = execution.results.find((result) => result.debateNumber === call.debateNumber && result.moveId === call.moveId);
    assert(executionResult, `${call.moveId}: execution result missing`);
    if (executionResult.status !== "completed") {
      verificationResults.push({
        debateNumber: call.debateNumber,
        moveId: call.moveId,
        expectedSpeaker: call.expectedSpeaker,
        status: "unresolved",
        reason: executionResult.status,
        transcriptPath: call.transcriptPath,
        transcriptSha256: executionResult.transcriptSha256,
        verification: null
      });
      continue;
    }
    const transcriptBytes = await readFile(call.transcriptPath);
    assert.equal(sha256(transcriptBytes), executionResult.transcriptSha256, `${call.moveId}: transcript changed`);
    const transcript = JSON.parse(transcriptBytes);
    const verification = evaluateAttributionTranscript(transcript, call, activation.thresholds);
    verificationResults.push({
      debateNumber: call.debateNumber,
      moveId: call.moveId,
      expectedSpeaker: call.expectedSpeaker,
      status: verification.status,
      transcriptPath: call.transcriptPath,
      transcriptSha256: executionResult.transcriptSha256,
      verification
    });
  }
  const verified = verificationResults.filter((result) => result.status === "verified").length;
  const unresolved = verificationResults.length - verified;
  const audit = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-partial-audio-verification-18-audit",
    status: unresolved === 0
      ? "verified-two-available-batch-09-audio-work-items-debate-183-remains-blocked"
      : "batch-09-partial-audio-verification-has-unresolved-available-work-item",
    batchNumber: 9,
    executionSha256: sha256(await readFile(paths.execution)),
    thresholds: activation.thresholds,
    results: verificationResults,
    blockedUnattemptedWorkItems: activation.blockedDebate183
  };
  const completed = execution.results.filter((result) => result.status === "completed");
  const totals = completed.reduce((acc, result) => {
    acc.inputTokens += result.usage.inputTokens;
    acc.audioInputTokens += result.usage.audioInputTokens;
    acc.textInputTokens += result.usage.textInputTokens;
    acc.outputTokens += result.usage.outputTokens;
    acc.totalTokens += result.usage.totalTokens;
    acc.usageDerivedEstimatedCostUsd += result.usageDerivedEstimatedCostUsd;
    return acc;
  }, { inputTokens: 0, audioInputTokens: 0, textInputTokens: 0, outputTokens: 0, totalTokens: 0, usageDerivedEstimatedCostUsd: 0 });
  totals.usageDerivedEstimatedCostUsd = round(totals.usageDerivedEstimatedCostUsd);
  const cost = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-partial-audio-verification-18-cost-control-analysis",
    status: totals.usageDerivedEstimatedCostUsd <= 1 ? "batch-09-partial-audio-verification-cost-within-standing-cap" : "batch-09-partial-audio-verification-cost-cap-exceeded",
    batchNumber: 9,
    pricing: activation.costEstimate.officialPricePerMillionTokensUsd,
    calls: completed.map((result) => ({
      debateNumber: result.debateNumber,
      moveId: result.moveId,
      transcriptPath: activation.calls.find((call) => call.debateNumber === result.debateNumber && call.moveId === result.moveId).transcriptPath,
      transcriptSha256: result.transcriptSha256,
      ...result.usage,
      usageDerivedEstimatedCostUsd: result.usageDerivedEstimatedCostUsd
    })),
    totals,
    maximumAuthorizedCostUsd: 1,
    withinAuthorizedCap: totals.usageDerivedEstimatedCostUsd <= 1
  };
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-partial-audio-verification-18-analysis",
    status: unresolved === 0
      ? "batch-09-two-available-audio-work-items-verified-debate-183-source-blocker-preserved"
      : "batch-09-partial-audio-verification-validation-failure-stop-required",
    batchNumber: 9,
    result: {
      availableCalls: 2,
      verified,
      unresolved,
      blockedUnattemptedDebate183Calls: 2,
      completeFourClipCohortPassed: false,
      adjudicationAuthorizedByThisPartialGate: false,
      usageDerivedEstimatedCostUsd: totals.usageDerivedEstimatedCostUsd
    },
    preservedControls: {
      sequential: true,
      attemptsPerCall: 1,
      retries: 0,
      audioPlaybackCalls: 0,
      modelContextsOtherThanFrozenTranscriptionCalls: 0,
      judgmentsChanged: false,
      scoresChanged: false,
      productionChanged: false
    },
    nextAuthorizedAction: unresolved === 0
      ? "pause-with-two-verified-clips-and-two-preserved-debate-183-source-blockers-before-adjudication"
      : "stop-on-partial-audio-verification-validation-failure"
  };
  if (shouldWrite) {
    await writeJson(paths.audit, audit);
    await writeJson(paths.cost, cost);
    await writeJson(paths.analysis, analysis);
  }
  console.log(JSON.stringify({ status: analysis.status, verified, unresolved, costUsd: totals.usageDerivedEstimatedCostUsd }));
  if (unresolved > 0) process.exitCode = 1;
}

async function test() {
  const preparation = await readJson(paths.preparation);
  await validatePreparation(preparation);
  if (await exists(paths.activation)) await validateActivation(await readJson(paths.activation));
  if (await exists(paths.execution)) {
    const execution = await readJson(paths.execution);
    assert.equal(execution.results.length, 2);
    assert.equal(execution.totals.retries, 0);
  }
  if (await exists(paths.analysis)) {
    const analysis = await readJson(paths.analysis);
    const audit = await readJson(paths.audit);
    const cost = await readJson(paths.cost);
    assert.equal(audit.results.length, 2);
    assert.equal(cost.maximumAuthorizedCostUsd, 1);
    assert.equal(cost.withinAuthorizedCap, true);
    assert.equal(analysis.result.completeFourClipCohortPassed, false);
    assert.equal(analysis.result.adjudicationAuthorizedByThisPartialGate, false);
  }
  console.log("batch-09-partial-audio-verification-stage-ok");
}

if (mode === "activate") await activate();
if (mode === "run") await run();
if (mode === "analyze") await analyze();
if (mode === "test") await test();
