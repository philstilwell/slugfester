#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V417_AUDIO_PROTOCOL_ID, V417_AUDIO_SCHEMA_VERSION, V417_AUDIO_THRESHOLDS, evaluateAttributionTranscriptV417 } from "./lib/v417-audio-verification.mjs";
import { V417_PASS_B_ROOT } from "./lib/v417-triggered-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const planPath = `${V417_PASS_B_ROOT}/audio-verification-plan.json`;
const amendmentPath = `${V417_PASS_B_ROOT}/audio-analysis-amendment.json`;
const [plan, execution, passBAnalysis, amendment] = await Promise.all([readJson(planPath), readJson(`${V417_PASS_B_ROOT}/audio-model-execution.json`), readJson(`${V417_PASS_B_ROOT}/analysis.json`), readJson(amendmentPath)]);
assertV4(plan.schemaVersion === V417_AUDIO_SCHEMA_VERSION && plan.protocolId === V417_AUDIO_PROTOCOL_ID, "audio plan identity mismatch");
assertV4(execution.status === "passed-twelve-one-attempt-diarization-calls" && execution.successfulCalls === 12 && execution.retries === 0 && execution.authorization.deterministicAudioAnalysis, "valid audio execution unavailable");
assertV4(passBAnalysis.status === "pass-b-passed-audio-verification-required", "Pass B analysis state invalid");
assertV4(amendment.status === "frozen-analysis-only-empty-boundary-elision" && amendment.authorization.deterministicAudioAnalysis && amendment.scope.rawTranscriptMutationAuthorized === false && amendment.scope.thresholdAlterationAuthorized === false, "audio analysis amendment unavailable");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const fileSha256 = async (file) => sha256(await readFile(path.resolve(root, file)));
for (const [file, hash] of Object.entries(amendment.sourceHashes)) assertV4(await fileSha256(file) === hash, `amended audio analysis source hash mismatch: ${file}`);
const executionByMove = new Map(execution.results.map((item) => [item.moveId, item]));
const debates = [];
for (const debate of plan.debates) {
  const moves = [];
  for (const move of debate.moves) {
    const run = executionByMove.get(move.moveId);
    assertV4(run && run.transcriptPath === move.transcriptPath, `${move.moveId}: execution record missing`);
    assertV4(await fileSha256(move.transcriptPath) === run.transcriptSha256, `${move.moveId}: transcript hash mismatch`);
    const transcript = await readJson(move.transcriptPath);
    const evaluation = evaluateAttributionTranscriptV417(transcript, move, V417_AUDIO_THRESHOLDS);
    moves.push({ moveId: move.moveId, expectedSpeaker: move.expectedSpeaker, resolvedSpeaker: evaluation.status === "verified" ? move.expectedSpeaker : null, status: evaluation.status, sourceSpan: move.sourceSpan, verificationExcerpt: move.verificationExcerpt, clip: { localPath: move.clipPath, sha256: move.clipSha256, durationSeconds: move.measuredDurationSeconds }, transcript: { localPath: move.transcriptPath, sha256: run.transcriptSha256, model: plan.model.id, responseFormat: plan.model.responseFormat, durationSeconds: transcript.duration, segmentCount: transcript.segments.length }, deterministicEvidence: evaluation });
  }
  debates.push({ debateNumber: debate.debateNumber, debateId: debate.debateId, sourceAudio: { localPath: debate.sourceAudio, sha256: debate.sourceAudioSha256 }, speakerReferences: debate.references, moves });
}
const allMoves = debates.flatMap((debate) => debate.moves);
const verified = allMoves.filter((move) => move.status === "verified").length;
const unresolved = allMoves.length - verified;
const passed = verified === 12 && unresolved === 0;
const audit = {
  schemaVersion: "4.1.7-pass-b-audio-verification-audit",
  protocolId: V417_AUDIO_PROTOCOL_ID,
  status: passed ? "passed-all-twelve-medium-low-attribution-moves-audio-verified" : "failed-one-or-more-attributions-unresolved",
  trigger: plan.trigger,
  method: "gpt-4o-transcribe-diarize with two locked high-confidence Pass B speaker references per debate; deterministic locked-excerpt recall is required in the expected speaker's segments",
  manualOverrideUsed: false,
  analysisAmendment: { path: amendmentPath, status: amendment.status, rawTranscriptMutationPerformed: false, ignoredEmptySegments: amendment.observedStructure.emptySegments, thresholdsAltered: false },
  thresholds: V417_AUDIO_THRESHOLDS,
  legacyBoundary: plan.legacyBoundary,
  debates,
  totals: { debates: debates.length, moves: allMoves.length, verified, unresolved, verificationRate: verified / allMoves.length },
  transcription: { model: plan.model.id, paidCalls: execution.attempts, retries: execution.retries, estimatedTranscribedMinutes: execution.estimatedTranscribedMinutes, estimatedRateUsdPerMinute: execution.estimatedRateUsdPerMinute, estimatedCostUsd: execution.estimatedCostUsd, maximumAuthorizedCostUsd: execution.maximumAuthorizedCostUsd, exactBilledCostAvailable: false, stayedWithinAuthorizedCostCap: execution.estimatedCostUsd <= execution.maximumAuthorizedCostUsd },
  authorization: { disagreementExtraction: passed, adjudicationModelExecution: false, compressionAuditModelExecution: false, scoreDerivation: false, legacyComparison: false, publicationFinalization: false, productionMutation: false, heldOutGate: false, all195Debates: false }
};
const postAudio = {
  schemaVersion: "4.1.7-fresh-six-triggered-pass-b-post-audio-analysis",
  protocolId: V417_AUDIO_PROTOCOL_ID,
  status: passed ? "pass-b-and-audio-passed-ready-for-disagreement-extraction" : "blocked-unresolved-audio-attribution",
  inheritedPassBStatus: passBAnalysis.status,
  runtime: passBAnalysis.runtime,
  legacyBoundary: plan.legacyBoundary,
  analysisAmendment: { path: amendmentPath, status: amendment.status },
  audioVerification: { audit: plan.outputs.audit, status: audit.status, pendingMoves: 12, verified, unresolved, estimatedCostUsd: execution.estimatedCostUsd },
  authorization: { disagreementExtraction: passed, adjudicationModelExecution: false, compressionAuditModelExecution: false, scoreDerivation: false, legacyComparison: false, publicationFinalization: false, productionMutation: false, heldOutGate: false, all195Debates: false }
};
if (shouldWrite) {
  await writeFile(path.resolve(root, plan.outputs.audit), `${JSON.stringify(audit, null, 2)}\n`);
  await writeFile(path.resolve(root, plan.outputs.postAudioAnalysis), `${JSON.stringify(postAudio, null, 2)}\n`);
}
console.log(JSON.stringify({ status: audit.status, moves: allMoves.length, verified, unresolved, estimatedTranscribedMinutes: execution.estimatedTranscribedMinutes, estimatedCostUsd: execution.estimatedCostUsd, disagreementExtractionAuthorized: postAudio.authorization.disagreementExtraction, legacyAccessed: false }, null, 2));
if (!passed) process.exitCode = 1;
