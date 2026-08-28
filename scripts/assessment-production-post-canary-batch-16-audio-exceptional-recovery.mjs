#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { evaluateAttributionTranscript } from "./lib/v416-audio-verification.mjs";

const modeIndex = process.argv.indexOf("--mode");
const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : null;
const shouldWrite = process.argv.includes("--write");
const timestamp = (flag) => {
  const index = process.argv.indexOf(flag);
  const value = index >= 0 ? process.argv[index + 1] : null;
  assert(value && !Number.isNaN(Date.parse(value)), `${flag} requires an ISO timestamp`);
  return value;
};
assert(["prepare", "activate", "run", "analyze", "test"].includes(mode), "--mode is required");

const audioRoot = "docs/assessment-production/post-canary-continuation-v1/batch-16/audio-verification";
const root = `${audioRoot}/exceptional-paid-recovery`;
const outputRoot = "output/transcribe/assessment-production-post-canary-batch-16-audio-verification";
const toolPath = "scripts/assessment-production-post-canary-batch-16-audio-exceptional-recovery.mjs";
const transcribeTool = "/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py";
const paths = {
  originalManifest: `${audioRoot}/execution-manifest.json`,
  originalExecution: `${audioRoot}/model-execution.json`,
  originalAudit: `${audioRoot}/audio-verification.json`,
  originalAnalysis: `${audioRoot}/analysis.json`,
  originalCost: `${audioRoot}/cost-control-analysis.json`,
  standing: "docs/assessment-production/post-canary-continuation-v1/batch-16/standing-authorization.json",
  authorization: `${root}/exceptional-recovery-authorization.json`,
  preparation: `${root}/preparation-manifest.json`,
  activation: `${root}/execution-manifest.json`,
  execution: `${root}/model-execution.json`,
  recoveredAudit: `${root}/recovered-audio-verification.json`,
  analysis: `${root}/analysis.json`,
  cost: `${root}/cost-control-analysis.json`,
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const round = (value, places = 7) => Number(value.toFixed(places));
const primaryMoveIds = [
  "con-failed-predictions-selection-effect",
  "con-denial-of-brute-contingency",
  "pro-metaphysical-not-logical-impossibility",
  "con-hotel-finite-creation-constraint",
];
const originalPaidCostUsd = 0.25615;
const primaryEstimateUsd = 0.2080025;
const primaryCumulativeEstimateUsd = 0.4641525;
const longestFallbackEstimateUsd = 0.0752925;
const worstCaseCumulativeEstimateUsd = 0.539445;
const capUsd = 1;
const price = { input: 2.5, output: 10 };

function usageFrom(transcript) {
  const usage = transcript?.usage;
  const valid = usage?.type === "tokens" && Number.isInteger(usage.input_tokens) &&
    Number.isInteger(usage.output_tokens) && usage.total_tokens === usage.input_tokens + usage.output_tokens;
  return valid ? usage : null;
}

function transcriptValid(transcript) {
  return typeof transcript?.text === "string" && Number.isFinite(transcript.duration) &&
    Array.isArray(transcript.segments) && usageFrom(transcript) !== null;
}

function usageCost(usage) {
  return usage.input_tokens / 1_000_000 * price.input + usage.output_tokens / 1_000_000 * price.output;
}

function isTransportFailure(stderr) {
  return /(APIConnectionError|ReadError|Connection reset|ConnectError|RemoteProtocolError|timed?\s*out|timeout)/i.test(stderr);
}

function invoke(args) {
  return new Promise((resolve) => {
    const child = spawn("python3", args, { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

async function invokeTranscription(call, clipPath, transcriptPath) {
  await mkdir(path.dirname(transcriptPath), { recursive: true });
  assert.equal(await exists(transcriptPath), false, `future transcript already exists: ${transcriptPath}`);
  const args = [
    transcribeTool, clipPath,
    "--model", call.model,
    "--response-format", call.responseFormat,
    "--chunking-strategy", call.chunkingStrategy,
    "--language", call.language,
    "--out", transcriptPath,
  ];
  for (const reference of call.knownSpeakers) args.push("--known-speaker", `${reference.speaker}=${reference.localPath}`);
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const invocation = await invoke(args);
  const transcriptWritten = await exists(transcriptPath);
  let transcript = null;
  if (transcriptWritten) {
    try { transcript = await readJson(transcriptPath); } catch { transcript = null; }
  }
  const valid = invocation.code === 0 && invocation.signal === null && transcriptValid(transcript);
  const usage = transcript ? usageFrom(transcript) : null;
  return {
    status: valid ? "completed" : "request-failed",
    startedAt,
    completedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    commandExitCode: invocation.code,
    terminationSignal: invocation.signal,
    transcriptWritten,
    transcriptJsonValid: transcriptValid(transcript),
    usageValid: usage !== null,
    transcriptSha256: transcriptWritten ? sha256(await readFile(transcriptPath)) : null,
    transcriptPath,
    stdoutSha256: sha256(invocation.stdout),
    stderrSha256: sha256(invocation.stderr),
    failureMessage: valid ? null : `${invocation.stdout}\n${invocation.stderr}`.trim().slice(-6000),
    transportFailure: !valid && isTransportFailure(invocation.stderr),
    usage,
    usageDerivedEstimatedCostUsd: usage ? round(usageCost(usage)) : 0,
  };
}

async function prepare() {
  const preparedAt = timestamp("--prepared-at");
  if (shouldWrite) for (const file of [paths.authorization, paths.preparation]) assert.equal(await exists(file), false, `${file} already exists`);
  const sourceFiles = [paths.originalManifest, paths.originalExecution, paths.originalAudit, paths.originalAnalysis, paths.originalCost, paths.standing, toolPath, "scripts/lib/v416-audio-verification.mjs", transcribeTool];
  const [manifest, execution, audit, analysis, cost] = await Promise.all([
    readJson(paths.originalManifest), readJson(paths.originalExecution), readJson(paths.originalAudit), readJson(paths.originalAnalysis), readJson(paths.originalCost),
  ]);
  assert.equal(execution.status, "post-canary-batch-16-paid-diarization-incomplete");
  assert.equal(execution.usageDerivedEstimatedCostUsd, originalPaidCostUsd);
  assert.equal(audit.totals.verified, 5);
  assert.equal(audit.totals.unresolved, 5);
  assert.equal(analysis.gate.passed, false);
  assert.equal(cost.costControl.usageDerivedEstimatedCostUsd, originalPaidCostUsd);
  const originalResult = new Map(execution.results.map((item) => [item.moveId, item]));
  assert.equal(originalResult.get(primaryMoveIds[0]).status, "request-failed");
  for (const moveId of primaryMoveIds.slice(1)) assert.equal(originalResult.get(moveId).status, "skipped-after-request-failure");
  const calls = manifest.calls.filter((call) => primaryMoveIds.includes(call.moveId)).map((call) => {
    const exceptionalTranscriptPath = call.transcriptPath.replace(".transcript.json", ".exceptional-recovery.transcript.json");
    const recoveryMode = call.moveId === primaryMoveIds[0] ? "exceptional-replacement-after-preserved-transport-failure" : "original-first-attempt-after-preserved-skip";
    const item = { ...call, transcriptPath: exceptionalTranscriptPath, recoveryMode, priorResult: originalResult.get(call.moveId) };
    if (call.durationSeconds >= 180) {
      const boundarySeconds = call.moveId === primaryMoveIds[0] ? 103.1755 : 100.62;
      const shardRoot = `${outputRoot}/debate-${call.debateNumber}/recovery-shards/${call.moveId}`;
      item.transportFallback = {
        authorizedOnlyAfterThisPrimaryCallTransportFailure: true,
        maximumSubclips: 2,
        splitBoundarySeconds: boundarySeconds,
        coverage: [{ startSeconds: 0, endSeconds: boundarySeconds }, { startSeconds: boundarySeconds, endSeconds: call.durationSeconds }],
        parts: [1, 2].map((part) => ({
          part,
          clipPath: `${shardRoot}.part-${part}.mp3`,
          transcriptPath: `${shardRoot}.part-${part}.transcript.json`,
        })),
      };
    }
    return item;
  });
  assert.deepEqual(calls.map((call) => call.moveId), primaryMoveIds);
  for (const call of calls) {
    sourceFiles.push(call.clipPath, ...call.knownSpeakers.map((item) => item.localPath));
    if (call.transportFallback) sourceFiles.push(...call.transportFallback.parts.map((item) => item.clipPath));
  }
  const sourceHashes = {};
  for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
  for (const call of calls) {
    assert.equal(sourceHashes[call.clipPath], call.clipSha256, `${call.moveId}: clip hash changed`);
    for (const reference of call.knownSpeakers) assert.equal(sourceHashes[reference.localPath], reference.sha256, `${call.moveId}: reference changed`);
    if (call.transportFallback) {
      call.transportFallback.parts = call.transportFallback.parts.map((part) => ({ ...part, clipSha256: sourceHashes[part.clipPath] }));
    }
  }
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const authorization = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-16-exceptional-audio-recovery-authorization",
    status: "frozen-active-exceptional-batch-16-audio-recovery-authorization",
    batchNumber: 16,
    authorizedAt: preparedAt,
    checkpointCommit: head,
    preservedPriorGate: { completedPaidCalls: 6, deterministicallyVerified: 5, unresolvedCompleted: 1, failedPaidAttempts: 1, skippedWithoutAttempt: 3, usageDerivedEstimatedCostUsd: originalPaidCostUsd, evidenceChanged: false },
    authorizedRecovery: {
      exceptionalReplacementMoveId: primaryMoveIds[0],
      firstAttemptMoveIds: primaryMoveIds.slice(1),
      attemptsPerPrimaryCall: 1,
      primaryRetries: 0,
      oneTransportFallbackLevelMaximum: true,
      fallbackSubclipsMaximum: 2,
      attemptsPerFallbackSubclip: 1,
      fallbackRetries: 0,
      deterministicRecombination: true,
      debate144FreshIsolatedAttributionShardSeparatelyRequired: true,
      debate144SecondShardOnlyIfFirstInvalid: true,
      verifiedFieldsMutable: false,
      scorePassAuthorizedThisStage: false,
      nextBatchSelection: false,
    },
    costAuthorization: { capUsd, alreadyRecordedUsd: originalPaidCostUsd, incrementalPrimaryEstimateUsd: primaryEstimateUsd, cumulativePrimaryEstimateUsd: primaryCumulativeEstimateUsd, incrementalLongestFallbackEstimateUsd: longestFallbackEstimateUsd, worstCaseCumulativeEstimateUsd, withinCap: worstCaseCumulativeEstimateUsd <= capUsd },
  };
  const authorizationBytes = Buffer.from(`${JSON.stringify(authorization, null, 2)}\n`);
  const preparation = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-16-exceptional-paid-audio-recovery-preparation",
    status: "prepared-four-batch-16-exceptional-paid-audio-recovery-calls-not-active",
    preparedAt,
    checkpointCommit: head,
    batchNumber: 16,
    stagingOnly: true,
    authorization: { path: paths.authorization, sha256: sha256(authorizationBytes) },
    calls,
    executionPolicy: { sequential: true, attemptsPerPrimaryCall: 1, primaryRetries: 0, oneTransportFallbackEventMaximum: 1, maximumFallbackSubclips: 2, attemptsPerFallbackSubclip: 1, fallbackRetries: 0, stopAfterUnrecoveredFailure: true, successfulOriginalCallsRepeated: false },
    costEstimate: authorization.costAuthorization,
    pricePerMillionTokensUsd: price,
    sourceHashes,
    futureOutputPathsExcludedFromSourceHashes: [paths.activation, paths.execution, paths.recoveredAudit, paths.analysis, paths.cost, ...calls.map((call) => call.transcriptPath), ...calls.flatMap((call) => call.transportFallback?.parts.map((item) => item.transcriptPath) ?? [])],
  };
  if (shouldWrite) {
    await mkdir(root, { recursive: true });
    await writeFile(paths.authorization, authorizationBytes);
    await writeFile(paths.preparation, `${JSON.stringify(preparation, null, 2)}\n`);
  }
  console.log(JSON.stringify({ status: shouldWrite ? preparation.status : "preview", calls: 4, primaryEstimateUsd, cumulativePrimaryEstimateUsd: primaryCumulativeEstimateUsd, longestFallbackEstimateUsd, worstCaseCumulativeEstimateUsd, capUsd, withinCap: true, scoresDerived: 0 }, null, 2));
}

async function validatePreparation(preparation, expectedStatus = "prepared-four-batch-16-exceptional-paid-audio-recovery-calls-not-active") {
  assert.equal(preparation.status, expectedStatus);
  assert.deepEqual(preparation.calls.map((call) => call.moveId), primaryMoveIds);
  assert.equal(preparation.costEstimate.worstCaseCumulativeEstimateUsd, worstCaseCumulativeEstimateUsd);
  assert.equal(preparation.costEstimate.withinCap, true);
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
}

async function activate() {
  const activatedAt = timestamp("--activated-at");
  assert.equal(await exists(paths.activation), false, `${paths.activation} already exists`);
  const [preparationBytes, authorizationBytes] = await Promise.all([readFile(paths.preparation), readFile(paths.authorization)]);
  const preparation = JSON.parse(preparationBytes);
  await validatePreparation(preparation);
  assert.equal(preparation.authorization.sha256, sha256(authorizationBytes));
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const main = execFileSync("git", ["rev-parse", "main"], { encoding: "utf8" }).trim();
  const origin = execFileSync("git", ["rev-parse", "origin/main"], { encoding: "utf8" }).trim();
  assert.equal(head, main, "HEAD must equal local main before activation");
  assert.equal(head, origin, "HEAD must equal origin/main before activation");
  const activation = {
    ...preparation,
    schemaVersion: "1.0-assessment-production-post-canary-batch-16-exceptional-paid-audio-recovery-execution-manifest",
    status: "frozen-four-batch-16-exceptional-paid-audio-recovery-calls-active",
    activatedAt,
    checkpointCommit: head,
    preparationManifest: { path: paths.preparation, sha256: sha256(preparationBytes) },
    authorization: { path: paths.authorization, sha256: sha256(authorizationBytes) },
    executionTool: { path: toolPath, sha256: sha256(await readFile(toolPath)) },
  };
  if (shouldWrite) await writeFile(paths.activation, `${JSON.stringify(activation, null, 2)}\n`);
  console.log(JSON.stringify({ status: shouldWrite ? activation.status : "preview", calls: 4, attemptsMaximumBeforeConditionalFallback: 4, oneFallbackEventMaximum: 1, capUsd, worstCaseCumulativeEstimateUsd, paidExecutionActive: shouldWrite }, null, 2));
}

async function validateActivation(manifest) {
  assert.equal(manifest.status, "frozen-four-batch-16-exceptional-paid-audio-recovery-calls-active");
  await validatePreparation(manifest, "frozen-four-batch-16-exceptional-paid-audio-recovery-calls-active");
  assert.equal(sha256(await readFile(manifest.preparationManifest.path)), manifest.preparationManifest.sha256);
  assert.equal(sha256(await readFile(manifest.authorization.path)), manifest.authorization.sha256);
  assert.equal(sha256(await readFile(manifest.executionTool.path)), manifest.executionTool.sha256);
}

function combineTranscripts(transcripts, boundarySeconds, originalDurationSeconds) {
  const segments = [];
  for (const [partIndex, transcript] of transcripts.entries()) {
    const offset = partIndex === 0 ? 0 : boundarySeconds;
    for (const segment of transcript.segments) segments.push({ ...segment, id: `seg_${segments.length}`, start: Number(segment.start) + offset, end: Number(segment.end) + offset });
  }
  const usage = transcripts.map(usageFrom);
  const inputTokens = usage.reduce((sum, item) => sum + item.input_tokens, 0);
  const outputTokens = usage.reduce((sum, item) => sum + item.output_tokens, 0);
  return {
    text: transcripts.map((item) => item.text.trim()).filter(Boolean).join(" "),
    duration: originalDurationSeconds,
    segments,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      type: "tokens",
      input_token_details: {
        audio_tokens: usage.reduce((sum, item) => sum + (item.input_token_details?.audio_tokens ?? 0), 0),
        text_tokens: usage.reduce((sum, item) => sum + (item.input_token_details?.text_tokens ?? 0), 0),
      },
    },
  };
}

async function run() {
  assert(process.env.OPENAI_API_KEY, "OPENAI_API_KEY must be set locally");
  assert.equal(await exists(paths.execution), false, `${paths.execution} already exists`);
  const manifest = await readJson(paths.activation);
  await validateActivation(manifest);
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert.equal(await exists(future), false, `future output exists: ${future}`);
  let cumulativeCostUsd = originalPaidCostUsd;
  let fallbackEventUsed = false;
  let blocked = false;
  const results = [];
  for (const [index, call] of manifest.calls.entries()) {
    if (blocked) {
      results.push({ debateNumber: call.debateNumber, moveId: call.moveId, status: "skipped-after-unrecovered-exceptional-recovery-failure", primaryAttemptCount: 0, fallbackAttempts: 0 });
      continue;
    }
    process.stdout.write(`[batch-16-exceptional-audio] ${index + 1}/4 primary starting ${call.debateNumber}:${call.moveId}\n`);
    const primary = await invokeTranscription(call, call.clipPath, call.transcriptPath);
    cumulativeCostUsd = round(cumulativeCostUsd + primary.usageDerivedEstimatedCostUsd);
    let status = primary.status === "completed" ? "completed-primary" : "unrecovered-primary-failure";
    let finalTranscriptPath = primary.status === "completed" ? call.transcriptPath : null;
    let finalTranscriptSha256 = primary.status === "completed" ? primary.transcriptSha256 : null;
    const fallback = [];
    if (primary.status !== "completed" && primary.transportFailure && call.transportFallback && !fallbackEventUsed) {
      fallbackEventUsed = true;
      process.stdout.write(`[batch-16-exceptional-audio] transport failure; activating two-part frozen fallback for ${call.debateNumber}:${call.moveId}\n`);
      for (const part of call.transportFallback.parts) {
        if (fallback.some((item) => item.status !== "completed")) break;
        const partResult = await invokeTranscription(call, part.clipPath, part.transcriptPath);
        fallback.push({ part: part.part, clipPath: part.clipPath, ...partResult });
        cumulativeCostUsd = round(cumulativeCostUsd + partResult.usageDerivedEstimatedCostUsd);
      }
      if (fallback.length === 2 && fallback.every((item) => item.status === "completed")) {
        const transcripts = await Promise.all(fallback.map((item) => readJson(item.transcriptPath)));
        const combined = combineTranscripts(transcripts, call.transportFallback.splitBoundarySeconds, call.durationSeconds);
        await writeFile(call.transcriptPath, `${JSON.stringify(combined, null, 2)}\n`);
        status = "completed-via-two-part-transport-fallback";
        finalTranscriptPath = call.transcriptPath;
        finalTranscriptSha256 = sha256(await readFile(call.transcriptPath));
      } else {
        status = "unrecovered-fallback-failure";
      }
    }
    if (!finalTranscriptPath || cumulativeCostUsd > capUsd) blocked = true;
    results.push({
      debateNumber: call.debateNumber,
      debateId: call.debateId,
      moveId: call.moveId,
      expectedSpeaker: call.expectedSpeaker,
      recoveryMode: call.recoveryMode,
      status,
      primaryAttemptCount: 1,
      priorAttemptCount: call.priorResult.attemptCount,
      primary,
      fallbackActivated: fallback.length > 0,
      fallbackAttempts: fallback.length,
      fallback,
      finalTranscriptPath,
      finalTranscriptSha256,
      cumulativeUsageDerivedEstimatedCostUsd: cumulativeCostUsd,
      capExceeded: cumulativeCostUsd > capUsd,
    });
    process.stdout.write(`[batch-16-exceptional-audio] ${call.debateNumber}:${call.moveId} ${status}; cumulative $${cumulativeCostUsd.toFixed(7)}\n`);
  }
  const completed = results.filter((item) => item.finalTranscriptPath).length;
  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-16-exceptional-paid-audio-recovery-execution",
    status: completed === 4 && cumulativeCostUsd <= capUsd ? "batch-16-exceptional-paid-audio-recovery-execution-passed" : "batch-16-exceptional-paid-audio-recovery-execution-failed",
    batchNumber: 16,
    completedAt: new Date().toISOString(),
    callsRequired: 4,
    callsCompleted: completed,
    primaryAttempts: results.reduce((sum, item) => sum + (item.primaryAttemptCount ?? 0), 0),
    fallbackEventUsed,
    fallbackAttempts: results.reduce((sum, item) => sum + (item.fallbackAttempts ?? 0), 0),
    retriesBeyondAuthorizedLevels: 0,
    originalUsageDerivedEstimatedCostUsd: originalPaidCostUsd,
    additionalUsageDerivedEstimatedCostUsd: round(cumulativeCostUsd - originalPaidCostUsd),
    cumulativeUsageDerivedEstimatedCostUsd: cumulativeCostUsd,
    capUsd,
    capPassed: cumulativeCostUsd <= capUsd,
    results,
    scoresDerived: 0,
    nextBatchSelections: 0,
  };
  await writeFile(paths.execution, `${JSON.stringify(execution, null, 2)}\n`);
  console.log(JSON.stringify({ status: execution.status, callsCompleted: completed, primaryAttempts: execution.primaryAttempts, fallbackEventUsed, fallbackAttempts: execution.fallbackAttempts, additionalCostUsd: execution.additionalUsageDerivedEstimatedCostUsd, cumulativeCostUsd, capUsd, scoresDerived: 0 }, null, 2));
  if (execution.status.endsWith("failed")) process.exitCode = 1;
}

async function analyze() {
  const [manifest, execution, originalAudit] = await Promise.all([readJson(paths.activation), readJson(paths.execution), readJson(paths.originalAudit)]);
  await validateActivation(manifest);
  assert.equal(execution.status, "batch-16-exceptional-paid-audio-recovery-execution-passed");
  const recoveredMoves = [];
  for (const call of manifest.calls) {
    const result = execution.results.find((item) => item.moveId === call.moveId);
    assert(result?.finalTranscriptPath, `${call.moveId}: final transcript missing`);
    const bytes = await readFile(result.finalTranscriptPath);
    assert.equal(sha256(bytes), result.finalTranscriptSha256, `${call.moveId}: final transcript changed`);
    const deterministicEvidence = evaluateAttributionTranscript(JSON.parse(bytes), {
      moveId: call.moveId,
      expectedSpeaker: call.expectedSpeaker,
      verificationExcerpt: call.verificationExcerpt,
    }, manifest.thresholds);
    recoveredMoves.push({
      debateNumber: call.debateNumber,
      debateId: call.debateId,
      moveId: call.moveId,
      expectedSpeaker: call.expectedSpeaker,
      trigger: call.trigger,
      status: deterministicEvidence.status,
      resolvedSpeaker: deterministicEvidence.status === "verified" ? call.expectedSpeaker : null,
      clip: { path: call.clipPath, sha256: call.clipSha256, durationSeconds: call.durationSeconds },
      transcript: { path: result.finalTranscriptPath, sha256: result.finalTranscriptSha256, model: call.model, responseFormat: call.responseFormat, deterministicRecombinationApplied: result.status.includes("fallback") },
      deterministicEvidence,
    });
  }
  const preserved = originalAudit.debates.flatMap((debate) => debate.moves).filter((move) => move.debateNumber === "108" || move.debateNumber === "144");
  assert.equal(preserved.filter((move) => move.debateNumber === "108" && move.status === "verified").length, 5);
  assert.equal(preserved.filter((move) => move.debateNumber === "144" && move.status === "unresolved").length, 1);
  const moves = [...preserved, ...recoveredMoves];
  const verified = moves.filter((move) => move.status === "verified").length;
  const unresolved = moves.filter((move) => move.status !== "verified");
  const expectedOnlyDebate144Unresolved = unresolved.length === 1 && unresolved[0].debateNumber === "144" && unresolved[0].moveId === "pro-guidance-no-added-ontological-cost";
  const debates = [...new Set(moves.map((move) => move.debateNumber))].map((debateNumber) => ({ debateNumber, debateId: moves.find((move) => move.debateNumber === debateNumber).debateId, moves: moves.filter((move) => move.debateNumber === debateNumber) }));
  const audit = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-16-exceptional-recovered-audio-verification",
    status: expectedOnlyDebate144Unresolved ? "batch-16-paid-audio-recovery-passed-one-preserved-attribution-decision-pending" : "batch-16-paid-audio-recovery-has-unexpected-unresolved-fields",
    batchNumber: 16,
    preservedOriginalVerifiedMoves: 5,
    preservedOriginalUnresolvedCompletedMove: 1,
    debates,
    totals: { requiredMoves: 10, verified, unresolved: unresolved.length, paidPrimaryAttemptsThisRecovery: execution.primaryAttempts, paidFallbackAttemptsThisRecovery: execution.fallbackAttempts, originalUsageDerivedEstimatedCostUsd: originalPaidCostUsd, additionalUsageDerivedEstimatedCostUsd: execution.additionalUsageDerivedEstimatedCostUsd, cumulativeUsageDerivedEstimatedCostUsd: execution.cumulativeUsageDerivedEstimatedCostUsd, capUsd, capPassed: execution.capPassed, scoresDerived: 0 },
    authorization: { debate144AttributionRecoveryPreparation: expectedOnlyDebate144Unresolved, disputeAdjudicationPreparation: false, scoreDerivation: false, productionMutation: false, nextBatchSelection: false },
  };
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-16-exceptional-paid-audio-recovery-analysis",
    status: audit.status,
    batchNumber: 16,
    gate: { recoveredCallsComplete: execution.callsCompleted === 4, recoveredMovesVerified: recoveredMoves.filter((move) => move.status === "verified").length, recoveredMovesUnresolved: recoveredMoves.filter((move) => move.status !== "verified").map((move) => `${move.debateNumber}:${move.moveId}`), preservedDebate108Verified: 5, preservedDebate144Pending: expectedOnlyDebate144Unresolved, passedForDebate144AttributionRecovery: expectedOnlyDebate144Unresolved },
    costs: audit.totals,
    authorization: audit.authorization,
  };
  const cost = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-16-exceptional-paid-audio-recovery-cost-control",
    status: execution.capPassed ? "batch-16-exceptional-audio-recovery-cost-cap-passed" : "batch-16-exceptional-audio-recovery-cost-cap-failed",
    frozenEstimate: manifest.costEstimate,
    actual: { originalUsageDerivedEstimatedCostUsd: originalPaidCostUsd, additionalUsageDerivedEstimatedCostUsd: execution.additionalUsageDerivedEstimatedCostUsd, cumulativeUsageDerivedEstimatedCostUsd: execution.cumulativeUsageDerivedEstimatedCostUsd, actualBilledCostUsdAvailable: false, capUsd, capPassed: execution.capPassed },
  };
  if (shouldWrite) {
    await writeFile(paths.recoveredAudit, `${JSON.stringify(audit, null, 2)}\n`);
    await writeFile(paths.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
    await writeFile(paths.cost, `${JSON.stringify(cost, null, 2)}\n`);
  }
  console.log(JSON.stringify({ status: audit.status, verified, unresolved: unresolved.map((move) => `${move.debateNumber}:${move.moveId}`), recoveredMovesVerified: analysis.gate.recoveredMovesVerified, additionalCostUsd: execution.additionalUsageDerivedEstimatedCostUsd, cumulativeCostUsd: execution.cumulativeUsageDerivedEstimatedCostUsd, capPassed: execution.capPassed, debate144AttributionRecoveryAuthorized: expectedOnlyDebate144Unresolved, scoresDerived: 0 }, null, 2));
  if (!expectedOnlyDebate144Unresolved) process.exitCode = 1;
}

async function test() {
  const preparation = await readJson(paths.preparation);
  await validatePreparation(preparation);
  assert.equal(preparation.calls.length, 4);
  assert.equal(preparation.executionPolicy.attemptsPerPrimaryCall, 1);
  assert.equal(preparation.executionPolicy.primaryRetries, 0);
  assert.equal(preparation.executionPolicy.oneTransportFallbackEventMaximum, 1);
  assert.equal(preparation.executionPolicy.maximumFallbackSubclips, 2);
  assert.equal(preparation.costEstimate.withinCap, true);
  if (await exists(paths.activation)) await validateActivation(await readJson(paths.activation));
  if (await exists(paths.execution)) {
    const execution = await readJson(paths.execution);
    assert(execution.primaryAttempts <= 4);
    assert(execution.fallbackAttempts <= 2);
    assert.equal(execution.retriesBeyondAuthorizedLevels, 0);
  }
  console.log(JSON.stringify({ status: "passed", calls: 4, originalSuccessfulCallsRepeated: false, primaryAttemptsMaximum: 4, oneFallbackEventMaximum: 1, fallbackAttemptsMaximum: 2, worstCaseCumulativeEstimateUsd, capUsd, scoresDerived: 0 }, null, 2));
}

if (mode === "prepare") await prepare();
if (mode === "activate") await activate();
if (mode === "run") await run();
if (mode === "analyze") await analyze();
if (mode === "test") await test();
