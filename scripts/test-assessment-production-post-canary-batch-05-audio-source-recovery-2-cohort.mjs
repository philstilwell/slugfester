#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-05/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-2`;
const diagnosisPath = `${recoveryRoot}/failure-diagnosis.json`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const analysisPath = `${recoveryRoot}/analysis.json`;
const preparationPath = `${root}/audio-source-preparation.json`;
const workPath = `${root}/audio-work-items.json`;
const ffprobe = "/opt/homebrew/bin/ffprobe";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [
  diagnosisBytes,
  planBytes,
  activationBytes,
  executionBytes,
  analysisBytes,
  preparationBytes,
  workBytes
] = await Promise.all([
  readFile(diagnosisPath),
  readFile(planPath),
  readFile(activationPath),
  readFile(executionPath),
  readFile(analysisPath),
  readFile(preparationPath),
  readFile(workPath)
]);
const plan = JSON.parse(planBytes);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
const analysis = JSON.parse(analysisBytes);
const preparation = JSON.parse(preparationBytes);
const work = JSON.parse(workBytes);

assert.equal(plan.diagnosis.sha256, sha256(diagnosisBytes));
assert.equal(activation.plan.sha256, sha256(planBytes));
assert.equal(execution.diagnosisSha256, sha256(diagnosisBytes));
assert.equal(execution.planSha256, sha256(planBytes));
assert.equal(execution.activationSha256, sha256(activationBytes));
assert.equal(execution.status, "completed-one-final-batch-05-audio-source-transport-recovery-2");
assert.equal(
  analysis.status,
  "accepted-complete-three-source-six-clip-batch-05-audio-cohort-after-final-hls-recovery"
);
assert.equal(analysis.execution.path, executionPath);
assert.equal(analysis.execution.sha256, sha256(executionBytes));
assert.equal(execution.outputs.audioSourcePreparation.path, preparationPath);
assert.equal(execution.outputs.audioSourcePreparation.sha256, sha256(preparationBytes));

assert.deepEqual(execution.state, {
  attempts: 1,
  debate189FinalDownloadCliInvocations: 1,
  debate189DownloadSucceeded: true,
  debate189NormalizedSourceInstalled: true,
  debate05DownloadCliInvocations: 1,
  debate05DownloadSucceeded: true,
  debate05NormalizedSourceInstalled: true,
  remainingClipsCreated: 3,
  completeCohortValidated: true,
  failedRecovery1PartialOutputsReused: 0,
  retries: 0,
  reruns: 0,
  automaticRepairs: 0,
  timeoutExtensions: 0,
  audioPlaybackCalls: 0,
  semanticAudioEvaluations: 0,
  modelContexts: 0,
  transcriptionCalls: 0,
  paidServiceCalls: 0,
  scoresDerived: 0,
  directIncrementalCostUsd: 0
});

assert.equal(
  preparation.status,
  "prepared-six-post-canary-batch-05-local-audio-clips-standing-authorization-active-for-audio-verification-preparation"
);
assert.equal(preparation.schemaVersion.includes("transport-recovery-2"), true);
assert.equal(preparation.batchNumber, 5);
assert.equal(preparation.productionCanary, false);
assert.equal(preparation.stagingOnly, true);
assert.equal(preparation.sources.length, 3);
assert.equal(preparation.clips.length, 6);
assert.equal(preparation.totals.sources, 3);
assert.equal(preparation.totals.sourceDownloads, 3);
assert.equal(preparation.totals.sourceAcquisitionAttempts, 5);
assert.equal(preparation.totals.clips, 6);
assert.equal(preparation.totals.audioVerificationCalls, 0);
assert.equal(preparation.totals.modelContexts, 0);
assert.equal(preparation.totals.directIncrementalCostUsd, 0);
assert.equal(preparation.totals.audioFilesPlayed, 0);
assert.equal(preparation.totals.semanticAudioEvaluations, 0);
assert.equal(preparation.totals.retries, 0);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.activePolicy.version, "v2.2");
assert.equal(preparation.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie, true);
assert.equal(preparation.activePolicy.scorePassesMaximum, 1);
assert.equal(preparation.validatedInventoryContract.scoreFieldsAvailable, false);
assert.equal(preparation.authorization.audioVerificationManifestPreparation, true);
assert.equal(preparation.authorization.audioVerificationCostEstimation, true);
assert.equal(preparation.authorization.paidTranscriptionExecution, false);
assert.equal(preparation.authorization.scoreDerivation, false);
assert.equal(preparation.authorization.productionMutation, false);
assert.equal(preparation.authorization.nextBatchSelection, false);
assert.equal(
  preparation.nextAuthorizedAction,
  "prepare-freeze-validate-and-push-batch-05-audio-verification-manifest-and-cost-estimate-under-standing-authorization"
);

assert.equal(preparation.recovery.diagnosis.sha256, sha256(diagnosisBytes));
assert.equal(preparation.recovery.plan.sha256, sha256(planBytes));
assert.equal(preparation.recovery.activation.sha256, sha256(activationBytes));
assert.equal(preparation.recovery.debate158ProtectedHashesPreserved, 4);
assert.equal(preparation.recovery.debate189TransportRecoveryAttempts, 2);
assert.equal(preparation.recovery.debate189FinalHlsAttempts, 1);
assert.equal(preparation.recovery.debate05OriginalAttempts, 1);
assert.equal(preparation.recovery.failedRecovery1PartialOutputsReused, 0);
assert.equal(preparation.recovery.ordinaryRetries, 0);
assert.equal(preparation.acquisitionPolicy.ordinaryPublicSourceAttemptsPerMissingVideoMaximum, 1);
assert.equal(preparation.acquisitionPolicy.debate189AuthorizedTransportRecoveryAttemptsMaximum, 2);
assert.equal(preparation.acquisitionPolicy.completeCohortPublicSourceAttemptsMaximum, 5);
assert.deepEqual(preparation.acquisitionPolicy.ytDlpRetryControls, {
  retries: 0,
  fragmentRetries: 0,
  extractorRetries: 0,
  fileAccessRetries: 0
});
assert.equal(preparation.acquisitionPolicy.debate189FinalRecoveryFormat, "best[protocol^=m3u8]");
assert.equal(preparation.acquisitionPolicy.debate189FinalRecoveryClients, "web_safari");
assert.equal(preparation.acquisitionPolicy.debate189FinalRecoveryDownloader, "m3u8:native");
assert.deepEqual(
  preparation.publicSourceAttemptAudit.map((item) => ({
    debateNumber: item.debateNumber,
    attempts: item.attempts,
    recoveryAttempts: item.authorizedTransportRecoveryAttempts,
    maximum: item.totalAttemptsMaximum,
    outcome: item.outcome
  })),
  [
    {
      debateNumber: "158",
      attempts: 1,
      recoveryAttempts: 0,
      maximum: 1,
      outcome: "success-before-preserved-failures"
    },
    {
      debateNumber: "189",
      attempts: 3,
      recoveryAttempts: 2,
      maximum: 3,
      outcome: "success-after-two-authorized-transport-recoveries"
    },
    {
      debateNumber: "05",
      attempts: 1,
      recoveryAttempts: 0,
      maximum: 1,
      outcome: "success"
    }
  ]
);
assert.equal(preparation.publicSourceAttemptAudit.reduce((sum, item) => sum + item.attempts, 0), 5);
assert.equal(preparation.executionBoundary.audioPlaybackCalls, 0);
assert.equal(preparation.executionBoundary.semanticAudioEvaluations, 0);
assert.equal(preparation.executionBoundary.transcriptionCalls, 0);
assert.equal(preparation.executionBoundary.modelOrApiCalls, 0);
assert.equal(preparation.executionBoundary.paidServiceCalls, 0);

for (const [file, digest] of Object.entries(preparation.inputHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `input hash changed: ${file}`);
}
for (const item of plan.protectedMedia.slice(0, 4)) {
  assert.equal(sha256(await readFile(item.path)), item.sha256, `${item.path}: protected hash changed`);
}
assert.equal(
  sha256(await readFile(plan.debate189Recovery.preservedInvalidEvidencePath)),
  plan.protectedMedia.at(-1).sha256
);

const probeAudio = (file) => {
  const probed = JSON.parse(execFileSync(ffprobe, [
    "-v", "error", "-select_streams", "a:0",
    "-show_entries", "format=duration,bit_rate:stream=channels,sample_rate,bit_rate",
    "-of", "json", file
  ], { encoding: "utf8" }));
  const stream = probed.streams?.[0] ?? {};
  return {
    durationSeconds: Number(probed.format?.duration),
    channels: Number(stream.channels),
    sampleRateHz: Number(stream.sample_rate),
    measuredBitRateBps: Number(stream.bit_rate ?? probed.format?.bit_rate)
  };
};

for (const source of preparation.sources) {
  assert.equal(sha256(await readFile(source.sourceAudio)), source.sourceAudioSha256);
  const measured = probeAudio(source.sourceAudio);
  assert.equal(measured.durationSeconds, source.durationSeconds);
  assert.equal(measured.channels, 1);
  assert.equal(measured.sampleRateHz, 16000);
  assert(measured.measuredBitRateBps > 0);
  const requiredEndMs = Math.max(
    ...work.moves.filter((move) => move.debateNumber === source.debateNumber)
      .map((move) => move.clipWindow.endMs)
  );
  assert(measured.durationSeconds * 1000 >= requiredEndMs);
}
for (const clip of preparation.clips) {
  assert.equal(sha256(await readFile(clip.clipPath)), clip.clipSha256);
  const measured = probeAudio(clip.clipPath);
  assert.equal(measured.durationSeconds, clip.durationSeconds);
  assert(Math.abs(clip.durationSeconds - clip.plannedDurationSeconds) <= 0.25);
  assert.equal(measured.channels, 1);
  assert.equal(measured.sampleRateHz, 16000);
  assert(measured.measuredBitRateBps > 0);
  assert.equal(clip.audioVerificationCompleted, false);
}
assert.deepEqual(
  preparation.clips.map((clip) => ({
    debateNumber: clip.debateNumber,
    sourceVideoId: clip.sourceVideoId,
    moveId: clip.moveId,
    expectedSpeaker: clip.expectedSpeaker,
    clipWindow: clip.clipWindow,
    trigger: clip.trigger
  })),
  work.moves.map((move) => ({
    debateNumber: move.debateNumber,
    sourceVideoId: move.sourceVideoId,
    moveId: move.moveId,
    expectedSpeaker: move.expectedSpeaker,
    clipWindow: move.clipWindow,
    trigger: move.trigger
  }))
);
for (const directory of [
  path.dirname(plan.debate189Recovery.finalSourcePath),
  path.dirname(plan.debate05OriginalRoute.finalSourcePath)
]) {
  assert(
    (await readdir(directory)).every(
      (entry) => !entry.includes("recovery-2.hls.") &&
        !entry.includes("source.download.") && !entry.endsWith(".normalized.mp3")
    ),
    `${directory}: temporary download residue remains`
  );
}
assert.equal(await exists(plan.debate189Recovery.preservedInvalidEvidencePath), true);
assert.equal(analysis.result.sourcesValidated, 3);
assert.equal(analysis.result.clipsValidated, 6);
assert.equal(analysis.result.retries, 0);
assert.equal(analysis.result.modelContexts, 0);
assert.equal(analysis.result.paidServiceCalls, 0);
assert.equal(analysis.result.directIncrementalCostUsd, 0);
assert.equal(analysis.standingAuthorizationResumed, true);

console.log(JSON.stringify({
  status: "passed",
  sources: 3,
  clips: 6,
  sourceAcquisitionAttempts: 5,
  debate189FinalDownloadCliInvocations: 1,
  debate05DownloadCliInvocations: 1,
  protectedEvidenceHashesVerified: 5,
  inputHashesVerified: Object.keys(preparation.inputHashes).length,
  retries: 0,
  audioPlaybackCalls: 0,
  semanticAudioEvaluations: 0,
  modelContexts: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
}, null, 2));
