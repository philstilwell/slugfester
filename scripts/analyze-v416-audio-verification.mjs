#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { evaluateAttributionTranscript, V416_AUDIO_PROTOCOL_ID, V416_AUDIO_SCHEMA_VERSION, V416_AUDIO_THRESHOLDS } from "./lib/v416-audio-verification.mjs";
import { V416_PASS_B_ROOT } from "./lib/v416-triggered-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const planPath = `${V416_PASS_B_ROOT}/audio-verification-plan.json`;
const [plan, execution, passBAnalysis] = await Promise.all([readJson(planPath), readJson(`${V416_PASS_B_ROOT}/audio-model-execution.json`), readJson(`${V416_PASS_B_ROOT}/analysis.json`)]);
assertV4(plan.schemaVersion === V416_AUDIO_SCHEMA_VERSION && plan.protocolId === V416_AUDIO_PROTOCOL_ID, "audio plan identity mismatch");
assertV4(execution.status === "passed-eight-one-attempt-diarization-calls" && execution.successfulCalls === 8 && execution.retries === 0 && execution.authorization.deterministicAudioAnalysis, "valid audio execution unavailable");
assertV4(passBAnalysis.status === "pass-b-passed-audio-verification-required", "Pass B analysis state invalid");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const fileSha256 = async (file) => sha256(await readFile(path.resolve(root, file)));
const executionByMove = new Map(execution.results.map((item) => [item.moveId, item]));
const debates = [];
for (const debate of plan.debates) {
  const moves = [];
  for (const move of debate.moves) {
    const run = executionByMove.get(move.moveId);
    assertV4(run && run.transcriptPath === move.transcriptPath, `${move.moveId}: execution record missing`);
    assertV4(await fileSha256(move.transcriptPath) === run.transcriptSha256, `${move.moveId}: transcript hash mismatch`);
    const transcript = await readJson(move.transcriptPath);
    const evaluation = evaluateAttributionTranscript(transcript, move, V416_AUDIO_THRESHOLDS);
    moves.push({
      moveId: move.moveId,
      expectedSpeaker: move.expectedSpeaker,
      resolvedSpeaker: evaluation.status === "verified" ? move.expectedSpeaker : null,
      status: evaluation.status,
      sourceSpan: move.sourceSpan,
      verificationExcerpt: move.verificationExcerpt,
      clip: { localPath: move.clipPath, sha256: move.clipSha256, durationSeconds: move.measuredDurationSeconds },
      transcript: { localPath: move.transcriptPath, sha256: run.transcriptSha256, model: plan.model.id, responseFormat: plan.model.responseFormat, durationSeconds: transcript.duration, segmentCount: transcript.segments.length },
      deterministicEvidence: evaluation
    });
  }
  debates.push({ debateNumber: debate.debateNumber, debateId: debate.debateId, sourceAudio: { localPath: debate.sourceAudio, sha256: debate.sourceAudioSha256 }, speakerReferences: debate.references, moves });
}
const allMoves = debates.flatMap((debate) => debate.moves);
const verified = allMoves.filter((move) => move.status === "verified").length;
const unresolved = allMoves.length - verified;
const passed = verified === 8 && unresolved === 0;
const audit = {
  schemaVersion: "4.1.6-pass-b-audio-verification-audit",
  protocolId: V416_AUDIO_PROTOCOL_ID,
  status: passed ? "passed-all-eight-medium-attribution-moves-audio-verified" : "failed-one-or-more-attributions-unresolved",
  trigger: plan.trigger,
  method: "gpt-4o-transcribe-diarize with two prior-audio-verified known-speaker references per debate; deterministic locked-excerpt recall is required in the expected speaker's segments",
  manualOverrideUsed: false,
  thresholds: V416_AUDIO_THRESHOLDS,
  debates,
  totals: { debates: debates.length, moves: allMoves.length, verified, unresolved, verificationRate: verified / allMoves.length },
  transcription: { model: plan.model.id, paidCalls: execution.attempts, retries: execution.retries, estimatedTranscribedMinutes: execution.estimatedTranscribedMinutes, estimatedRateUsdPerMinute: execution.estimatedRateUsdPerMinute, estimatedCostUsd: execution.estimatedCostUsd, maximumAuthorizedCostUsd: execution.maximumAuthorizedCostUsd, exactBilledCostAvailable: false, stayedWithinAuthorizedCostCap: execution.estimatedCostUsd <= execution.maximumAuthorizedCostUsd },
  authorization: { disagreementExtraction: passed, adjudicationModelExecution: false, scoreDerivation: false, publicationFinalization: false, productionMutation: false, heldOutGate: false, all195Debates: false }
};
const postAudio = {
  schemaVersion: "4.1.6-triggered-pass-b-post-audio-analysis",
  protocolId: V416_AUDIO_PROTOCOL_ID,
  status: passed ? "pass-b-and-audio-passed-ready-for-disagreement-extraction" : "blocked-unresolved-audio-attribution",
  inheritedPassBStatus: passBAnalysis.status,
  runtime: passBAnalysis.runtime,
  audioVerification: { audit: plan.outputs.audit, status: audit.status, pendingMoves: 8, verified, unresolved, estimatedCostUsd: execution.estimatedCostUsd },
  authorization: { disagreementExtraction: passed, adjudicationModelExecution: false, scoreDerivation: false, publicationFinalization: false, productionMutation: false, heldOutGate: false, all195Debates: false }
};
if (shouldWrite) {
  await writeFile(path.resolve(root, plan.outputs.audit), `${JSON.stringify(audit, null, 2)}\n`);
  await writeFile(path.resolve(root, plan.outputs.postAudioAnalysis), `${JSON.stringify(postAudio, null, 2)}\n`);
}
console.log(JSON.stringify({ status: audit.status, moves: allMoves.length, verified, unresolved, estimatedTranscribedMinutes: execution.estimatedTranscribedMinutes, estimatedCostUsd: execution.estimatedCostUsd, disagreementExtractionAuthorized: postAudio.authorization.disagreementExtraction }, null, 2));
if (!passed) process.exitCode = 1;
