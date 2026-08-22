#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-05/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-1`;
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
  planBytes,
  activationBytes,
  executionBytes,
  analysisBytes,
  preparationBytes,
  workBytes
] = await Promise.all([
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

assert.equal(
  plan.status,
  "frozen-one-shot-batch-05-debate-189-public-source-transport-recovery-ready"
);
assert.equal(activation.plan.sha256, sha256(planBytes));
assert.equal(
  execution.status,
  "completed-one-shot-batch-05-audio-source-transport-recovery"
);
assert.equal(execution.planSha256, sha256(planBytes));
assert.equal(execution.activationSha256, sha256(activationBytes));
assert.equal(
  analysis.status,
  "accepted-complete-three-source-six-clip-batch-05-audio-cohort"
);
assert.equal(analysis.execution.path, executionPath);
assert.equal(analysis.execution.sha256, sha256(executionBytes));
assert.equal(execution.outputs.audioSourcePreparation.path, preparationPath);
assert.equal(execution.outputs.audioSourcePreparation.sha256, sha256(preparationBytes));

assert.equal(execution.state.attempts, 1);
assert.equal(execution.state.debate189AdditionalDownloadCliInvocations, 1);
assert.equal(execution.state.debate189DownloadSucceeded, true);
assert.equal(execution.state.debate189NormalizedSourceInstalled, true);
assert.equal(execution.state.debate05DownloadCliInvocations, 1);
assert.equal(execution.state.debate05DownloadSucceeded, true);
assert.equal(execution.state.debate05NormalizedSourceInstalled, true);
assert.equal(execution.state.remainingClipsCreated, 3);
assert.equal(execution.state.completeCohortValidated, true);
assert.equal(execution.state.retries, 0);
assert.equal(execution.state.reruns, 0);
assert.equal(execution.state.timeoutExtensions, 0);
assert.equal(execution.state.audioPlaybackCalls, 0);
assert.equal(execution.state.semanticAudioEvaluations, 0);
assert.equal(execution.state.modelContexts, 0);
assert.equal(execution.state.transcriptionCalls, 0);
assert.equal(execution.state.paidServiceCalls, 0);
assert.equal(execution.state.scoresDerived, 0);
assert.equal(execution.state.directIncrementalCostUsd, 0);

assert.equal(
  preparation.status,
  "prepared-six-post-canary-batch-05-local-audio-clips-standing-authorization-active-for-audio-verification-preparation"
);
assert.equal(preparation.schemaVersion.includes("transport-recovery"), true);
assert.equal(preparation.batchNumber, 5);
assert.equal(preparation.productionCanary, false);
assert.equal(preparation.stagingOnly, true);
assert.equal(preparation.developmentValidationOnly, false);
assert.equal(preparation.sources.length, 3);
assert.equal(preparation.clips.length, 6);
assert.equal(preparation.totals.sources, 3);
assert.equal(preparation.totals.sourceDownloads, 3);
assert.equal(preparation.totals.sourceAcquisitionAttempts, 4);
assert.equal(preparation.totals.existingNormalizedSources, 0);
assert.equal(preparation.totals.clips, 6);
assert.equal(preparation.totals.paidTranscriptionCalls, 0);
assert.equal(preparation.totals.transcriptionCostUsd, 0);
assert.equal(preparation.totals.audioVerificationCalls, 0);
assert.equal(preparation.totals.audioVerificationCompleted, 0);
assert.equal(preparation.totals.modelContexts, 0);
assert.equal(preparation.totals.meteredModelApiCostUsd, 0);
assert.equal(preparation.totals.directIncrementalCostUsd, 0);
assert.equal(preparation.totals.audioFilesPlayed, 0);
assert.equal(preparation.totals.semanticAudioEvaluations, 0);
assert.equal(preparation.totals.retries, 0);
assert.equal(preparation.totals.timeoutExtensions, 0);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.totals.productionMutations, 0);
assert.equal(preparation.totals.nextBatchSelections, 0);
assert.equal(preparation.activePolicy.version, "v2.2");
assert.equal(
  preparation.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie,
  true
);
assert.equal(preparation.activePolicy.scorePassesMaximum, 1);
assert.equal(preparation.validatedInventoryContract.scoreFieldsAvailable, false);
assert.equal(preparation.authorization.audioVerificationManifestPreparation, true);
assert.equal(preparation.authorization.audioVerificationCostEstimation, true);
assert.equal(preparation.authorization.paidTranscriptionExecution, false);
assert.equal(preparation.authorization.audioVerificationExecution, false);
assert.equal(preparation.authorization.adjudicationPacketPreparation, false);
assert.equal(preparation.authorization.scoreDerivation, false);
assert.equal(preparation.authorization.productionMutation, false);
assert.equal(preparation.authorization.nextBatchSelection, false);
assert.equal(
  preparation.nextAuthorizedAction,
  "prepare-freeze-validate-and-push-batch-05-audio-verification-manifest-and-cost-estimate-under-standing-authorization"
);

assert.equal(preparation.recovery.plan.sha256, sha256(planBytes));
assert.equal(preparation.recovery.activation.sha256, sha256(activationBytes));
assert.equal(preparation.recovery.debate158ProtectedHashesPreserved, 4);
assert.equal(preparation.recovery.debate189AdditionalAttempts, 1);
assert.equal(preparation.recovery.debate05OriginalAttempts, 1);
assert.equal(preparation.recovery.ordinaryRetries, 0);
assert.equal(preparation.recovery.reruns, 0);
assert.equal(
  preparation.recovery.diagnosedInvalidSource.sha256,
  "87965bd54bc175f5645aa773bd5a0a98c396524a0dd0c4e94463828c11ed2754"
);
assert.equal(preparation.recovery.diagnosedInvalidSource.bytes, 354);
assert.equal(
  sha256(await readFile(preparation.recovery.diagnosedInvalidSource.preservedEvidencePath)),
  preparation.recovery.diagnosedInvalidSource.sha256
);

assert.equal(
  preparation.acquisitionPolicy.ordinaryPublicSourceAttemptsPerMissingVideoMaximum,
  1
);
assert.equal(
  preparation.acquisitionPolicy.debate189AuthorizedTransportRecoveryAttemptsMaximum,
  1
);
assert.equal(preparation.acquisitionPolicy.completeCohortPublicSourceAttemptsMaximum, 4);
assert.deepEqual(preparation.acquisitionPolicy.ytDlpRetryControls, {
  retries: 0,
  fragmentRetries: 0,
  extractorRetries: 0,
  fileAccessRetries: 0
});
assert.equal(preparation.acquisitionPolicy.debate189RecoveryFormat, "bestaudio[ext=webm]/bestaudio");
assert.equal(preparation.acquisitionPolicy.debate189RecoveryClients, "android_vr,web_safari");
assert.equal(preparation.acquisitionPolicy.debate05OriginalFormat, "bestaudio/best");
assert.equal(preparation.acquisitionPolicy.debate05OriginalClients, "android,web");
assert.equal(preparation.acquisitionPolicy.paidServices, false);
assert.equal(preparation.acquisitionPolicy.transcription, false);
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
      outcome: "success-before-preserved-failure"
    },
    {
      debateNumber: "189",
      attempts: 2,
      recoveryAttempts: 1,
      maximum: 2,
      outcome: "success-after-one-authorized-transport-recovery"
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
assert.equal(
  preparation.publicSourceAttemptAudit.reduce((sum, item) => sum + item.attempts, 0),
  4
);
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

const probeDuration = (file) =>
  Number(
    execFileSync(
      ffprobe,
      ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
      { encoding: "utf8" }
    ).trim()
  );

for (const source of preparation.sources) {
  assert.equal(sha256(await readFile(source.sourceAudio)), source.sourceAudioSha256);
  const measured = probeDuration(source.sourceAudio);
  assert(Math.abs(measured - source.durationSeconds) <= 0.001);
  assert.equal(source.channels, 1);
  assert.equal(source.sampleRateHz, 16000);
  assert(source.measuredBitRateBps > 0);
  const requiredEndMs = Math.max(
    ...work.moves
      .filter((move) => move.debateNumber === source.debateNumber)
      .map((move) => move.clipWindow.endMs)
  );
  assert(measured * 1000 >= requiredEndMs);
}

for (const clip of preparation.clips) {
  assert.equal(sha256(await readFile(clip.clipPath)), clip.clipSha256);
  const measured = probeDuration(clip.clipPath);
  assert(Math.abs(measured - clip.durationSeconds) <= 0.001);
  assert(Math.abs(clip.durationSeconds - clip.plannedDurationSeconds) <= 0.25);
  assert.equal(clip.channels, 1);
  assert.equal(clip.sampleRateHz, 16000);
  assert(clip.measuredBitRateBps > 0);
  assert.equal(clip.targetBitrateKbps, 64);
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
      (entry) => !entry.includes("download.") && !entry.endsWith(".normalized.mp3")
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

console.log(
  JSON.stringify(
    {
      status: "passed",
      sources: 3,
      clips: 6,
      sourceAcquisitionAttempts: 4,
      debate189AdditionalDownloadCliInvocations: 1,
      debate05DownloadCliInvocations: 1,
      protectedEvidenceHashesVerified: 5,
      inputHashesVerified: Object.keys(preparation.inputHashes).length,
      retries: 0,
      audioPlaybackCalls: 0,
      semanticAudioEvaluations: 0,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
