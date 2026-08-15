#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const stageRoot =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/audio-verification";
const manifest = JSON.parse(
  await readFile(`${stageRoot}/execution-manifest.json`, "utf8")
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(
  manifest.status ===
    "frozen-three-post-canary-batch-01-paid-known-speaker-diarizations-authorized",
  "Batch 1 paid audio execution is not frozen"
);
assert(manifest.calls.length === 3, "exactly three calls required");
assert(manifest.model === "gpt-4o-transcribe-diarize", "model changed");
assert(manifest.authorization.paidTranscriptionExecution, "paid transcription unauthorized");
assert(manifest.authorization.audioVerificationExecution, "audio verification unauthorized");
assert(!manifest.authorization.adjudicationModelExecution, "adjudication model must remain unauthorized");
assert(!manifest.authorization.scoreDerivation, "score derivation must remain unauthorized");
assert(manifest.executionPolicy.sequentialExecution, "execution must remain sequential");
assert(manifest.executionPolicy.attemptsPerCall === 1, "one attempt per call required");
assert(manifest.executionPolicy.retriesMaximum === 0, "retries must remain disabled");
assert(process.env.OPENAI_API_KEY, "OPENAI_API_KEY must be set locally");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
for (const [file, digest] of Object.entries(manifest.executionToolHashes)) {
  assert(sha256(await readFile(file)) === digest, `execution tool hash mismatch: ${file}`);
}
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assert(!(await exists(future)), `future output exists: ${future}`);
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

const results = [];
let commonRequestFailure = false;
for (const call of manifest.calls) {
  if (commonRequestFailure) {
    results.push({
      debateNumber: call.debateNumber,
      moveId: call.moveId,
      expectedSpeaker: call.expectedSpeaker,
      status: "skipped-after-request-failure",
      attemptCount: 0,
      retryCount: 0,
      transcriptWritten: false,
      durationSeconds: call.durationSeconds,
      estimatedExposureUsd: 0
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
  for (const reference of call.knownSpeakers) {
    args.push("--known-speaker", `${reference.speaker}=${reference.localPath}`);
  }
  process.stdout.write(`[batch-01-audio] starting ${call.debateNumber}:${call.moveId}\n`);
  const invocation = await invoke(args);
  const transcriptExists = await exists(call.transcriptPath);
  let transcriptJsonValid = false;
  if (transcriptExists) {
    try {
      const parsed = JSON.parse(await readFile(call.transcriptPath, "utf8"));
      transcriptJsonValid =
        typeof parsed.text === "string" &&
        Number.isFinite(parsed.duration) &&
        Array.isArray(parsed.segments);
    } catch {
      transcriptJsonValid = false;
    }
  }
  const passed =
    invocation.code === 0 &&
    invocation.signal === null &&
    transcriptExists &&
    transcriptJsonValid;
  if (!passed) commonRequestFailure = true;
  const estimatedExposureUsd = Number(
    (call.durationSeconds / 60 * manifest.costEstimate.planningPricePerMinuteUsd).toFixed(6)
  );
  const result = {
    debateNumber: call.debateNumber,
    moveId: call.moveId,
    expectedSpeaker: call.expectedSpeaker,
    status: passed ? "completed" : "request-failed",
    attemptCount: 1,
    retryCount: 0,
    startedAt,
    completedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    commandExitCode: invocation.code,
    terminationSignal: invocation.signal,
    transcriptWritten: transcriptExists,
    transcriptJsonValid,
    transcriptSha256: transcriptExists ? sha256(await readFile(call.transcriptPath)) : null,
    stdoutSha256: sha256(invocation.stdout),
    stderrSha256: sha256(invocation.stderr),
    failureMessage: passed
      ? null
      : `${invocation.stdout}\n${invocation.stderr}`.trim().slice(-4000),
    durationSeconds: call.durationSeconds,
    estimatedExposureUsd
  };
  results.push(result);
  process.stdout.write(`[batch-01-audio] ${call.debateNumber}:${call.moveId} ${result.status}\n`);
}

const attempted = results.filter((result) => result.attemptCount === 1);
const completed = results.filter((result) => result.status === "completed");
const estimatedProcessingExposureUsd = Number(
  attempted.reduce((sum, result) => sum + result.estimatedExposureUsd, 0).toFixed(4)
);
assert(
  estimatedProcessingExposureUsd <= manifest.costEstimate.maximumAuthorizedCostUsd,
  "estimated processing exposure exceeded the approved cap"
);
const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-audio-verification-model-execution",
  protocolId: manifest.protocolId,
  status: completed.length === manifest.calls.length
    ? "three-post-canary-batch-01-paid-known-speaker-diarizations-completed"
    : "post-canary-batch-01-paid-diarization-incomplete",
  provider: "OpenAI Transcription API",
  model: manifest.model,
  authentication: "local OPENAI_API_KEY",
  callsPlanned: manifest.calls.length,
  callsAttempted: attempted.length,
  callsCompleted: completed.length,
  callsSkipped: results.filter((result) => result.attemptCount === 0).length,
  attempts: attempted.length,
  retries: 0,
  correctionCalls: 0,
  commonRequestFailure,
  results,
  estimatedProcessingExposureUsd,
  actualBilledCostUsdAvailable: false,
  maximumAuthorizedCostUsd: manifest.costEstimate.maximumAuthorizedCostUsd,
  meteredJudgmentModelApiCostUsd: 0,
  judgmentModelContexts: 0,
  adjudicationModelContexts: 0,
  scoresDerived: 0,
  publicationReconstructions: 0,
  productionMutations: 0,
  nextBatchSelections: 0,
  audioPlaybackCalls: 0,
  authorization: {
    deterministicAudioAnalysis: true,
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
  retries: execution.retries,
  estimatedProcessingExposureUsd,
  maximumAuthorizedCostUsd: execution.maximumAuthorizedCostUsd,
  judgmentModelContexts: 0,
  adjudicationModelContexts: 0,
  scoresDerived: 0
}, null, 2));
