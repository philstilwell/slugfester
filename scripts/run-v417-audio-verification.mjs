#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V417_AUDIO_PROTOCOL_ID, V417_AUDIO_SCHEMA_VERSION } from "./lib/v417-audio-verification.mjs";
import { V417_PASS_B_ROOT } from "./lib/v417-triggered-consensus.mjs";

const root = process.cwd();
const planPath = `${V417_PASS_B_ROOT}/audio-verification-plan.json`;
const plan = await readJson(planPath);
assertV4(plan.schemaVersion === V417_AUDIO_SCHEMA_VERSION && plan.protocolId === V417_AUDIO_PROTOCOL_ID, "audio plan identity mismatch");
assertV4(plan.status === "frozen-twelve-move-known-speaker-diarization-plan" && plan.authorization.paidDiarization, "paid diarization is not authorized");
assertV4(plan.cost.estimateDisclosedBeforePaidExecution && plan.cost.estimatedCostUsd <= plan.cost.maximumAuthorizedCostUsd && plan.cost.maximumAuthorizedCostUsd === 0.3, "audio cost cap invalid");
assertV4(process.env.OPENAI_API_KEY, "OPENAI_API_KEY is not set");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const fileSha256 = async (file) => sha256(await readFile(path.resolve(root, file)));
const exists = async (file) => access(path.resolve(root, file)).then(() => true, () => false);
assertV4(!(await exists(plan.outputs.execution)), "audio execution artifact already exists");
for (const [file, hash] of Object.entries(plan.sourceHashes)) assertV4(await fileSha256(file) === hash, `audio source hash mismatch: ${file}`);
for (const debate of plan.debates) for (const move of debate.moves) assertV4(!(await exists(move.transcriptPath)), `${move.moveId}: transcript already exists`);

function runOne(debate, move) {
  const args = [plan.executionPolicy.helperPath, path.resolve(root, move.clipPath), "--model", plan.model.id, "--response-format", plan.model.responseFormat, "--chunking-strategy", plan.model.chunkingStrategy, "--language", plan.model.language, "--out", path.resolve(root, move.transcriptPath)];
  for (const reference of debate.references) args.push("--known-speaker", `${reference.speaker}=${path.resolve(root, reference.localPath)}`);
  return new Promise((resolve, reject) => {
    const startedAt = new Date().toISOString(); const started = Date.now();
    const child = spawn("python3", args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; }); child.stderr.on("data", (data) => { stderr += data; });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve({ startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, stdout: stdout.trim(), stderr: stderr.trim() }) : reject(new Error(`${move.moveId}: transcription exited ${code}: ${stderr.trim()}`)));
  });
}

const results = [];
let failure = null;
outer: for (const debate of plan.debates) {
  for (const move of debate.moves) {
    try {
      const timing = await runOne(debate, move);
      const transcript = await readJson(move.transcriptPath);
      assertV4(Array.isArray(transcript.segments) && transcript.segments.length > 0 && typeof transcript.text === "string", `${move.moveId}: invalid diarized response`);
      results.push({ debateNumber: debate.debateNumber, debateId: debate.debateId, moveId: move.moveId, transcriptPath: move.transcriptPath, transcriptSha256: await fileSha256(move.transcriptPath), durationSeconds: transcript.duration, segments: transcript.segments.length, attempt: 1, ...timing });
      console.log(JSON.stringify({ status: "transcribed", debateNumber: debate.debateNumber, moveId: move.moveId, durationSeconds: transcript.duration, segments: transcript.segments.length }));
    } catch (error) {
      failure = { debateNumber: debate.debateNumber, debateId: debate.debateId, moveId: move.moveId, message: error.message };
      break outer;
    }
  }
}
const requiredCalls = plan.debates.flatMap((debate) => debate.moves).length;
const passed = !failure && results.length === requiredCalls;
const execution = {
  schemaVersion: "4.1.7-pass-b-audio-model-execution",
  protocolId: V417_AUDIO_PROTOCOL_ID,
  status: passed ? "passed-twelve-one-attempt-diarization-calls" : "failed-fast-no-retry",
  plan: planPath,
  model: plan.model,
  attempts: results.length + (failure ? 1 : 0),
  successfulCalls: results.length,
  retries: 0,
  estimatedTranscribedMinutes: results.reduce((sum, item) => sum + item.durationSeconds / 60, 0),
  estimatedRateUsdPerMinute: plan.cost.estimatedRateUsdPerMinute,
  estimatedCostUsd: results.reduce((sum, item) => sum + item.durationSeconds / 60, 0) * plan.cost.estimatedRateUsdPerMinute,
  maximumAuthorizedCostUsd: plan.cost.maximumAuthorizedCostUsd,
  exactBilledCostAvailable: false,
  results,
  failure,
  authorization: { deterministicAudioAnalysis: passed, furtherPaidRetry: false, disagreementExtraction: false, adjudicationModelExecution: false, compressionAuditModelExecution: false, scoreDerivation: false, legacyComparison: false, productionMutation: false }
};
await writeFile(path.resolve(root, plan.outputs.execution), `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: execution.status, successfulCalls: results.length, attempts: execution.attempts, retries: 0, estimatedCostUsd: execution.estimatedCostUsd, deterministicAudioAnalysisAuthorized: execution.authorization.deterministicAudioAnalysis }, null, 2));
if (!passed) process.exitCode = 1;
