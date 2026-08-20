#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const stageRoot = "docs/assessment-production/post-canary-continuation-v1/batch-03/audio-verification";
const activationPath = `${stageRoot}/execution-manifest.json`;
const manifest = JSON.parse(await readFile(activationPath, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const round = (value, places = 7) => Number(value.toFixed(places));

assert(manifest.status === "frozen-eight-post-canary-batch-03-paid-known-speaker-diarizations-authorized-under-standing-authorization", "Batch 3 paid audio execution is not frozen");
assert(manifest.calls.length === 8, "exactly eight calls required");
assert(manifest.model === "gpt-4o-transcribe-diarize", "model changed");
assert(manifest.authorization.paidTranscriptionExecution, "paid transcription unauthorized");
assert(manifest.authorization.audioVerificationExecution, "audio verification unauthorized");
assert(!manifest.authorization.adjudicationModelExecution, "adjudication model must remain unauthorized");
assert(!manifest.authorization.scoreDerivation, "score derivation must remain unauthorized");
assert(manifest.executionPolicy.sequentialExecution, "execution must remain sequential");
assert(manifest.executionPolicy.attemptsPerCall === 1, "one attempt per call required");
assert(manifest.executionPolicy.retriesMaximum === 0, "retries must remain disabled");
assert(manifest.executionPolicy.stopRemainingAfterRequestLevelFailure, "request failure stop changed");
assert(manifest.executionPolicy.stopRemainingAfterUsageDerivedCapExceedance, "cost stop changed");
assert(process.env.OPENAI_API_KEY, "OPENAI_API_KEY must be set locally");
assert(manifest.costEstimate.maximumAuthorizedCostUsd === 1, "approved cap changed");
assert(manifest.costEstimate.primaryExpectedFutureExecutionCostUsd === 0.2435025, "frozen estimate changed");
assert(manifest.costEstimate.officialPricePerMillionTokensUsd.input === 2.5, "input price changed");
assert(manifest.costEstimate.officialPricePerMillionTokensUsd.output === 10, "output price changed");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
for (const [file, digest] of Object.entries(manifest.executionToolHashes)) {
  assert(sha256(await readFile(file)) === digest, `execution tool hash mismatch: ${file}`);
}
assert(sha256(await readFile(manifest.preparationManifest.path)) === manifest.preparationManifest.sha256, "preparation manifest hash mismatch");
assert(sha256(await readFile(manifest.canonicalSourceGate.productionManifest)) === manifest.canonicalSourceGate.productionManifestSha256, "production manifest hash mismatch");
for (const debate of manifest.canonicalSourceGate.debates) {
  for (const key of ["transcript", "events", "manifest"]) {
    const file = debate.sourceChain[key];
    assert(sha256(await readFile(file)) === debate.sourceChain[`${key}Sha256`], `Debate ${debate.debateNumber}: canonical ${key} hash mismatch`);
  }
}
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assert(!(await exists(future)), `future output exists: ${future}`);
}
for (const call of manifest.calls) {
  assert(sha256(await readFile(call.clipPath)) === call.clipSha256, `${call.moveId}: clip hash mismatch`);
  assert(call.knownSpeakers.length === 2, `${call.moveId}: two known speakers required`);
  for (const reference of call.knownSpeakers) {
    assert(sha256(await readFile(reference.localPath)) === reference.sha256, `${call.moveId}: reference hash mismatch for ${reference.speaker}`);
  }
}

function invoke(args) {
  return new Promise((resolve) => {
    const child = spawn("python3", args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

const inputRate = manifest.costEstimate.officialPricePerMillionTokensUsd.input;
const outputRate = manifest.costEstimate.officialPricePerMillionTokensUsd.output;
const maximumAuthorizedCostUsd = manifest.costEstimate.maximumAuthorizedCostUsd;
const results = [];
let requestFailure = false;
let costCapReachedOrExceeded = false;
let usageDerivedEstimatedCostUsd = 0;
let stopReason = null;

for (const [callIndex, call] of manifest.calls.entries()) {
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
      durationOnlyPlanningExposureUsd: 0,
      usageDerivedEstimatedCostUsd: 0,
      cumulativeUsageDerivedEstimatedCostUsd: round(usageDerivedEstimatedCostUsd)
    });
    continue;
  }

  await mkdir(path.dirname(call.transcriptPath), { recursive: true });
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const args = [
    "/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py",
    call.clipPath,
    "--model", call.model,
    "--response-format", call.responseFormat,
    "--chunking-strategy", call.chunkingStrategy,
    "--language", call.language,
    "--out", call.transcriptPath
  ];
  for (const reference of call.knownSpeakers) args.push("--known-speaker", `${reference.speaker}=${reference.localPath}`);

  process.stdout.write(`[batch-03-audio] ${callIndex + 1}/8 starting ${call.debateNumber}:${call.moveId}\n`);
  const invocation = await invoke(args);
  const transcriptExists = await exists(call.transcriptPath);
  let transcript = null;
  let transcriptJsonValid = false;
  let usageValid = false;
  let usage = null;
  if (transcriptExists) {
    try {
      transcript = JSON.parse(await readFile(call.transcriptPath, "utf8"));
      transcriptJsonValid = typeof transcript.text === "string" && Number.isFinite(transcript.duration) && Array.isArray(transcript.segments);
      usage = transcript.usage;
      usageValid = usage?.type === "tokens" && Number.isInteger(usage.input_tokens) && Number.isInteger(usage.output_tokens) && usage.total_tokens === usage.input_tokens + usage.output_tokens;
    } catch {
      transcriptJsonValid = false;
      usageValid = false;
    }
  }
  const requestPassed = invocation.code === 0 && invocation.signal === null && transcriptExists && transcriptJsonValid && usageValid;
  const callUsageCostUsd = usageValid
    ? usage.input_tokens / 1_000_000 * inputRate + usage.output_tokens / 1_000_000 * outputRate
    : 0;
  usageDerivedEstimatedCostUsd += callUsageCostUsd;
  if (!requestPassed) {
    requestFailure = true;
    stopReason = "request-or-required-usage-record-failure";
  } else if (usageDerivedEstimatedCostUsd >= maximumAuthorizedCostUsd) {
    costCapReachedOrExceeded = true;
    stopReason = usageDerivedEstimatedCostUsd > maximumAuthorizedCostUsd
      ? "usage-derived-cost-cap-exceeded"
      : "usage-derived-cost-cap-reached";
  }
  const durationOnlyPlanningExposureUsd = call.durationSeconds / 60 * manifest.costEstimate.promotedPlanningPricePerMinuteUsd;
  const result = {
    debateNumber: call.debateNumber,
    moveId: call.moveId,
    expectedSpeaker: call.expectedSpeaker,
    status: requestPassed ? "completed" : "request-failed",
    attemptCount: 1,
    retryCount: 0,
    startedAt,
    completedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    commandExitCode: invocation.code,
    terminationSignal: invocation.signal,
    transcriptWritten: transcriptExists,
    transcriptJsonValid,
    usageValid,
    transcriptSha256: transcriptExists ? sha256(await readFile(call.transcriptPath)) : null,
    stdoutSha256: sha256(invocation.stdout),
    stderrSha256: sha256(invocation.stderr),
    failureMessage: requestPassed ? null : `${invocation.stdout}\n${invocation.stderr}`.trim().slice(-4000),
    durationSeconds: call.durationSeconds,
    durationOnlyPlanningExposureUsd: round(durationOnlyPlanningExposureUsd),
    usage: usageValid ? {
      inputTokens: usage.input_tokens,
      audioInputTokens: usage.input_token_details?.audio_tokens ?? null,
      textInputTokens: usage.input_token_details?.text_tokens ?? null,
      outputTokens: usage.output_tokens,
      totalTokens: usage.total_tokens
    } : null,
    usageDerivedEstimatedCostUsd: round(callUsageCostUsd),
    cumulativeUsageDerivedEstimatedCostUsd: round(usageDerivedEstimatedCostUsd),
    costCapReachedOrExceededAfterCall: costCapReachedOrExceeded
  };
  results.push(result);
  process.stdout.write(`[batch-03-audio] ${callIndex + 1}/8 ${call.debateNumber}:${call.moveId} ${result.status}; cumulative usage estimate $${result.cumulativeUsageDerivedEstimatedCostUsd.toFixed(7)}\n`);
}

const attempted = results.filter((result) => result.attemptCount === 1);
const completed = results.filter((result) => result.status === "completed");
const skipped = results.filter((result) => result.attemptCount === 0);
const inputTokens = completed.reduce((sum, result) => sum + result.usage.inputTokens, 0);
const audioInputTokens = completed.reduce((sum, result) => sum + (result.usage.audioInputTokens ?? 0), 0);
const textInputTokens = completed.reduce((sum, result) => sum + (result.usage.textInputTokens ?? 0), 0);
const outputTokens = completed.reduce((sum, result) => sum + result.usage.outputTokens, 0);
const totalTokens = completed.reduce((sum, result) => sum + result.usage.totalTokens, 0);
const durationOnlyPlanningExposureUsd = round(attempted.reduce((sum, result) => sum + result.durationOnlyPlanningExposureUsd, 0), 4);
const execution = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-audio-verification-model-execution",
  protocolId: manifest.protocolId,
  status: completed.length === manifest.calls.length
    ? "eight-post-canary-batch-03-paid-known-speaker-diarizations-completed"
    : "post-canary-batch-03-paid-diarization-incomplete",
  provider: "OpenAI Transcription API",
  model: manifest.model,
  authentication: "local OPENAI_API_KEY",
  callsPlanned: manifest.calls.length,
  callsAttempted: attempted.length,
  callsCompleted: completed.length,
  callsSkipped: skipped.length,
  attempts: attempted.length,
  retries: 0,
  correctionCalls: 0,
  requestFailure,
  costCapReachedOrExceeded,
  stopReason,
  results,
  durationOnlyPlanningExposureUsd,
  usage: { inputTokens, audioInputTokens, textInputTokens, outputTokens, totalTokens },
  usageDerivedEstimatedCostUsd: round(usageDerivedEstimatedCostUsd),
  actualBilledCostUsdAvailable: false,
  maximumAuthorizedCostUsd,
  directIncrementalCostCapControlPassed: usageDerivedEstimatedCostUsd <= maximumAuthorizedCostUsd,
  meteredJudgmentModelApiCostUsd: 0,
  judgmentModelContexts: 0,
  adjudicationModelContexts: 0,
  scoresDerived: 0,
  publicationReconstructions: 0,
  productionMutations: 0,
  nextBatchSelections: 0,
  audioPlaybackCalls: 0,
  semanticAudioEvaluations: 0,
  authorization: {
    deterministicAudioAnalysis: true,
    costAnalysis: true,
    retry: false,
    correctionCall: false,
    adjudicationPacketPreparation: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    nextBatchSelection: false
  }
};
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({
  status: execution.status,
  callsCompleted: execution.callsCompleted,
  callsAttempted: execution.callsAttempted,
  callsSkipped: execution.callsSkipped,
  retries: 0,
  requestFailure,
  costCapReachedOrExceeded,
  stopReason,
  durationOnlyPlanningExposureUsd,
  usageDerivedEstimatedCostUsd: execution.usageDerivedEstimatedCostUsd,
  maximumAuthorizedCostUsd,
  directIncrementalCostCapControlPassed: execution.directIncrementalCostCapControlPassed,
  judgmentModelContexts: 0,
  adjudicationModelContexts: 0,
  scoresDerived: 0
}, null, 2));
