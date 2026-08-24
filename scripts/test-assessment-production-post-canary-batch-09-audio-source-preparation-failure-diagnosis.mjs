#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction";
const diagnosisPath = `${root}/audio-source-preparation-failure-diagnosis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const diagnosis = JSON.parse(await readFile(diagnosisPath, "utf8"));

assert.equal(
  diagnosis.status,
  "preserved-batch-09-debate-170-public-source-partial-file-normalization-probe-failure-diagnosed"
);
assert.equal(diagnosis.batchNumber, 5);
assert.equal(diagnosis.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(diagnosis.userAuthorization.diagnosisAuthorized, true);
assert.equal(
  diagnosis.userAuthorization.secondPublicSourceDownloadAttemptAuthorized,
  true
);
assert.equal(diagnosis.failedInvocation.exitCode, 1);
assert.equal(diagnosis.failedInvocation.attemptsAtStage, 1);
assert.equal(diagnosis.failedInvocation.retries, 0);
assert.equal(diagnosis.failedInvocation.audioPlaybackCalls, 0);
assert.equal(diagnosis.failedInvocation.semanticAudioEvaluations, 0);
assert.equal(diagnosis.failedInvocation.transcriptionCalls, 0);
assert.equal(diagnosis.failedInvocation.paidServiceCalls, 0);
assert.equal(diagnosis.failure.debateNumber, "170");
assert.equal(diagnosis.failure.sourceVideoId, "HoTILnpd3q8");
assert.equal(
  diagnosis.failure.category,
  "partial-public-source-normalization-output-rejected-by-ffprobe"
);
assert.equal(diagnosis.failure.failedFileBytes, 354);
assert.equal(
  diagnosis.failure.failedFileSha256,
  "87965bd54bc175f5645aa773bd5a0a98c396524a0dd0c4e94463828c11ed2754"
);
assert.equal(diagnosis.failure.ffprobeExitStatus, 1);
assert.deepEqual(diagnosis.failure.ffprobeErrorMarkers, [
  "Failed to find two consecutive MPEG audio frames",
  "Invalid data found when processing input"
]);
assert.equal(diagnosis.failure.normalizedSourceValid, false);
assert.equal(diagnosis.failure.sourcePreparationRecordWritten, false);
assert.deepEqual(diagnosis.executionFrontier, {
  debate170PublicSourceAttemptConsumed: true,
  debate170ClipsCreated: 0,
  debate19PublicSourceAttemptConsumed: false,
  debate19ClipsCreated: 0,
  debate183PublicSourceAttemptConsumed: false,
  debate183ClipsCreated: 0,
  completeSourcesRequired: 3,
  completeClipsRequired: 4,
  completeSourcesAvailable: 0,
  completeClipsAvailable: 0
});
assert.equal(diagnosis.preservedFiles.length, 1);
for (const item of diagnosis.preservedFiles) {
  const [bytes, metadata] = await Promise.all([readFile(item.path), stat(item.path)]);
  assert.equal(metadata.size, item.bytes, `${item.path}: byte size changed`);
  assert.equal(sha256(bytes), item.sha256, `${item.path}: hash changed`);
}
for (const [file, digest] of Object.entries(diagnosis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash changed`);
}
assert.equal(
  await exists(`${root}/audio-source-preparation.json`),
  false,
  "failed preparation must not have a completion record"
);
assert.equal(
  diagnosis.diagnosis.additionalPublicSourceAttemptRequiredForRecovery,
  true
);
assert.equal(
  diagnosis.diagnosis.additionalAttemptOutsideCurrentOneAttemptSourceBoundary,
  true
);
assert.equal(diagnosis.authorization.correctionPreparation, true);
assert.equal(diagnosis.authorization.correctionExecution, false);
assert.equal(diagnosis.authorization.publicSourceDownload, false);
assert.equal(
  diagnosis.nextRequiredAction,
  "prepare-and-hash-lock-one-bounded-batch-09-debate-170-public-source-transport-correction"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      failureDebate: diagnosis.failure.debateNumber,
      failureCategory: diagnosis.failure.category,
      preservedFiles: diagnosis.preservedFiles.length,
      publicSourceAttemptsConsumed: 1,
      retries: 0,
      audioPlaybackCalls: 0,
      semanticAudioEvaluations: 0,
      transcriptionCalls: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      nextRequiredAction: diagnosis.nextRequiredAction
    },
    null,
    2
  )
);
