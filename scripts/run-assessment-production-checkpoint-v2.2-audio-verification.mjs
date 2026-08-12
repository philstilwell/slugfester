#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const stageRoot =
  "docs/assessment-production/production-checkpoint-v2.2-1/audio-verification";
const manifest = JSON.parse(
  await readFile(`${stageRoot}/execution-manifest.json`, "utf8")
);
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
assertV4(
  manifest.status ===
      "frozen-two-production-checkpoint-v2.2-paid-known-speaker-diarizations-authorized" &&
    manifest.costEstimate.explicitUserApprovalRecorded &&
    manifest.authorization.paidTranscriptionExecution &&
    !manifest.authorization.scoreDerivation,
  "production checkpoint v2.2 paid audio execution unauthorized"
);
assertV4(process.env.OPENAI_API_KEY, "OPENAI_API_KEY must be set locally");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output exists: ${future}`);
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
  process.stdout.write(
    `[checkpoint-v2.2-audio] starting ${call.debateNumber}:${call.moveId}\n`
  );
  const invocation = await invoke(args);
  const transcriptExists = await exists(call.transcriptPath);
  const passed =
    invocation.code === 0 && invocation.signal === null && transcriptExists;
  if (!passed) commonRequestFailure = true;
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
    transcriptSha256: transcriptExists
      ? sha256(await readFile(call.transcriptPath))
      : null,
    stdoutSha256: sha256(invocation.stdout),
    stderrSha256: sha256(invocation.stderr),
    failureMessage: passed
      ? null
      : `${invocation.stdout}\n${invocation.stderr}`.trim().slice(-4000),
    durationSeconds: call.durationSeconds,
    estimatedExposureUsd: Number(
      (call.durationSeconds / 60 *
        manifest.costEstimate.planningPricePerMinuteUsd).toFixed(6)
    )
  };
  results.push(result);
  process.stdout.write(
    `[checkpoint-v2.2-audio] ${call.debateNumber}:${call.moveId} ${result.status}\n`
  );
}

const attempted = results.filter((result) => result.attemptCount === 1);
const completed = results.filter((result) => result.status === "completed");
const execution = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-audio-verification-model-execution",
  protocolId: manifest.protocolId,
  status: completed.length === manifest.calls.length
    ? "two-production-checkpoint-v2.2-paid-known-speaker-diarizations-completed"
    : "production-checkpoint-v2.2-paid-diarization-incomplete",
  callsPlanned: manifest.calls.length,
  callsAttempted: attempted.length,
  callsCompleted: completed.length,
  callsSkipped: results.filter((result) => result.attemptCount === 0).length,
  attempts: attempted.length,
  retries: 0,
  correctionCalls: 0,
  commonRequestFailure,
  results,
  estimatedProcessingExposureUsd: Number(
    attempted
      .reduce((sum, result) => sum + result.estimatedExposureUsd, 0)
      .toFixed(4)
  ),
  maximumAuthorizedCostUsd: manifest.costEstimate.maximumAuthorizedCostUsd,
  meteredJudgmentModelApiCostUsd: 0,
  scoresDerived: 0,
  authorization: {
    deterministicAudioAnalysis: true,
    retry: false,
    correctionCall: false,
    adjudicationPacketPreparation: false,
    adjudicationModelExecution: false,
    scoreDerivation: false
  }
};
await writeFile(
  manifest.artifacts.execution,
  `${JSON.stringify(execution, null, 2)}\n`
);
console.log(
  JSON.stringify(
    {
      status: execution.status,
      callsCompleted: execution.callsCompleted,
      callsAttempted: execution.callsAttempted,
      callsSkipped: execution.callsSkipped,
      retries: 0,
      estimatedProcessingExposureUsd: execution.estimatedProcessingExposureUsd,
      maximumAuthorizedCostUsd: execution.maximumAuthorizedCostUsd,
      judgmentModelApiCostUsd: 0,
      scoresDerived: 0
    },
    null,
    2
  )
);
