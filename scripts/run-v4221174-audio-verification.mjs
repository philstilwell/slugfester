#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const stageRoot = "docs/calibration/v4.2.21.17.4/medium-confidence-audio-verification";
const manifest = JSON.parse(await readFile(`${stageRoot}/execution-manifest.json`, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(manifest.status === "frozen-two-paid-audio-transcriptions-authorized" && manifest.authorization.paidTranscriptionExecution && !manifest.authorization.scoreDerivation, "paid audio transcription is not authorized");
assertV4(process.env.OPENAI_API_KEY, "OPENAI_API_KEY must be set locally");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) await access(future).then(() => { throw new Error(`future output exists: ${future}`); }, () => true);

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

const results = [];
let commonRequestFailure = false;
for (const call of manifest.calls) {
  if (commonRequestFailure) {
    results.push({ moveId: call.moveId, status: "skipped-after-request-failure", attemptCount: 0, retryCount: 0, transcriptWritten: false, durationSeconds: call.durationSeconds, estimatedCostUsd: 0 });
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
  process.stdout.write(`[v4.2.21.17.4-audio] starting ${call.moveId}\n`);
  const invocation = await invoke(args);
  const transcriptExists = await access(call.transcriptPath).then(() => true, () => false);
  const passed = invocation.code === 0 && invocation.signal === null && transcriptExists;
  if (!passed) commonRequestFailure = true;
  const result = {
    moveId: call.moveId,
    status: passed ? "completed" : "request-failed",
    attemptCount: 1,
    retryCount: 0,
    startedAt,
    completedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    commandExitCode: invocation.code,
    terminationSignal: invocation.signal,
    transcriptWritten: transcriptExists,
    transcriptSha256: transcriptExists ? sha256(await readFile(call.transcriptPath)) : null,
    stdoutSha256: sha256(invocation.stdout),
    stderrSha256: sha256(invocation.stderr),
    failureMessage: passed ? null : `${invocation.stdout}\n${invocation.stderr}`.trim().slice(-4000),
    durationSeconds: call.durationSeconds,
    estimatedCostUsd: passed ? Number((call.durationSeconds / 60 * manifest.costEstimate.pricePerMinuteUsd).toFixed(6)) : 0
  };
  results.push(result);
  process.stdout.write(`[v4.2.21.17.4-audio] ${call.moveId} ${result.status}\n`);
}
const attempted = results.filter((result) => result.attemptCount === 1);
const completed = results.filter((result) => result.status === "completed");
const execution = {
  schemaVersion: "4.2.21.17.4-medium-confidence-audio-model-execution",
  protocolId: manifest.protocolId,
  status: completed.length === manifest.calls.length ? "two-paid-audio-transcriptions-completed" : "paid-audio-transcription-incomplete",
  callsPlanned: manifest.calls.length,
  callsAttempted: attempted.length,
  callsCompleted: completed.length,
  callsSkipped: results.filter((result) => result.attemptCount === 0).length,
  attempts: attempted.length,
  retries: 0,
  correctionCalls: 0,
  commonRequestFailure,
  results,
  estimatedSuccessfulProcessingCostUsd: Number(completed.reduce((sum, result) => sum + result.estimatedCostUsd, 0).toFixed(4)),
  maximumAuthorizedCostUsd: manifest.costEstimate.maximumAuthorizedCostUsd,
  meteredJudgmentModelApiCostUsd: 0,
  authorization: { deterministicAudioAnalysis: true, retry: false, correctionCall: false, adjudicationPacketPreparation: false, scoreDerivation: false }
};
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: execution.status, callsCompleted: execution.callsCompleted, callsAttempted: execution.callsAttempted, callsSkipped: execution.callsSkipped, retries: 0, estimatedSuccessfulProcessingCostUsd: execution.estimatedSuccessfulProcessingCostUsd, maximumAuthorizedCostUsd: execution.maximumAuthorizedCostUsd, judgmentModelApiCostUsd: 0, scoresDerived: 0 }, null, 2));
