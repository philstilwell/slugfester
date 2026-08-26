#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, stat } from "node:fs/promises";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-bestaudio-recovery-8`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const plan = JSON.parse(await readFile(planPath, "utf8"));

assert.equal(
  plan.status,
  "frozen-one-shot-batch-10-three-source-current-bestaudio-official-ytdlp-2026-08-19-native-recovery-ready"
);
assert.equal(plan.batchNumber, 10);
assert.equal(plan.userAuthorization.instruction, "I authorize that.");
assert.equal(
  plan.userAuthorization.interpretation,
  "authorize-one-new-zero-cost-no-retry-attempt-per-missing-video-using-the-best-currently-exposed-audio-only-format-under-the-existing-batch-10-source-and-transcription-limits"
);
assert.equal(plan.userAuthorization.officialYtDlpNativeInvocationsAuthorized, 3);
assert.equal(plan.userAuthorization.logicalPublicSourceDownloadsAuthorized, 3);
assert.equal(plan.userAuthorization.currentBestAudioSelectionAuthorized, true);
assert.equal(plan.userAuthorization.runtimeFormatSelectionAuthorized, true);
assert.equal(plan.userAuthorization.separateFormatInventoryAuthorized, false);
assert.equal(plan.userAuthorization.sourceDownloadsMustBeSequential, true);
assert.equal(plan.userAuthorization.browserImpersonationAuthorized, true);
assert.equal(plan.userAuthorization.credentialUseAuthorized, false);
assert.equal(plan.userAuthorization.pluginUseAuthorized, false);
assert.equal(plan.userAuthorization.remoteComponentUseAuthorized, false);
assert.equal(plan.userAuthorization.freshDebate123AttemptAfterFormat139StopAuthorized, true);
assert.equal(plan.userAuthorization.automaticRetriesAuthorized, false);
assert.equal(plan.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(plan.userAuthorization.audioPlaybackAuthorized, false);
assert.equal(plan.userAuthorization.semanticAudioEvaluationAuthorized, false);
assert.equal(plan.userAuthorization.sequentialTranscriptionEstimateUsd, 0.1308768);
assert.equal(plan.userAuthorization.sequentialTranscriptionMaximumUsd, 1);

assert.equal(plan.protectedInvalidEvidence.length, 12);
for (const evidence of plan.protectedInvalidEvidence) {
  const bytes = await readFile(evidence.path);
  assert.equal(bytes.length, evidence.bytes);
  assert.equal((await stat(evidence.path)).size, evidence.bytes);
  assert.equal(sha256(bytes), evidence.sha256);
}

assert.equal(plan.exactCohort.sourceCount, 5);
assert.equal(plan.exactCohort.clipCount, 9);
assert.equal(plan.acceptedPrefixSources.length, 2);
assert.equal(plan.bestAudioSources.length, 3);
assert.deepEqual(
  plan.bestAudioSources.map((item) => item.sourceVideoId),
  ["8k9A7d2Wnjk", "h-I_9e5qxnc", "0IpKHdVLZb4"]
);
assert(plan.bestAudioSources.every(
  (item) => item.officialToolVersion === "2026.08.19" &&
    item.mode === "current-bestaudio-once" &&
    item.priorUnavailableFormatId === "139" &&
    item.formatSelector === "bestaudio" &&
    item.outputTemplate === "source.bestaudio8.%(ext)s" &&
    item.audioOnlyRequired === true &&
    item.positiveByteCountRequired === true &&
    item.formatInventoryInvocationAuthorized === false &&
    item.impersonateTarget === "Chrome-142:Macos-26" &&
    item.nodeJsRuntime === "/opt/homebrew/bin/node" &&
    item.pluginsEnabled === false &&
    item.remoteComponentsEnabled === false &&
    item.automaticRetriesAuthorized === false &&
    item.continuationAuthorized === false &&
    item.concurrentFragmentsMaximum === 1 &&
    item.nativeDownloadTimeoutMs === 1800000
));
assert.deepEqual(
  plan.exactCohort.sources.filter((item) => ["123", "147", "130"].includes(item.debateNumber))
    .map((item) => item.mode),
  ["current-bestaudio-once", "current-bestaudio-once", "current-bestaudio-once"]
);

const tool = plan.officialToolVerification;
assert.equal(tool.releaseTag, "2026.08.19");
assert.equal(tool.toolSha256, "0f192b7ec147ab6288885d6351d9ab67367640029b4377576ef46dd79cf7b202");
assert.equal(tool.checksumSha256, "a63701f30755cb4d9317950d69703e9d751d490cb1b7059e1bb501a353fe7dcb");
assert.equal(tool.checksumSignatureSha256, "8d6f9a7c84c57222e3650c61699185878a3468308de702993ce4f20b5f9cf199");
assert.equal(tool.signingKeySha256, "45d6b415928b5f3e228b461fa9e6d7eb56a824931c785ece00279a06c7a6d6e5");
assert.equal(tool.signingKeyFingerprint, "AC0CBBE6848D6A873464AF4E57CF65933B5A7581");
assert.equal(tool.checksumMatched, true);
assert.equal(tool.gpgSignatureVerified, true);
assert.equal(tool.githubAttestationAvailableForAsset, false);
for (const [file, digest] of [
  [tool.toolPath, tool.toolSha256],
  [tool.checksumPath, tool.checksumSha256],
  [tool.checksumSignaturePath, tool.checksumSignatureSha256],
  [tool.signingKeyPath, tool.signingKeySha256]
]) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: tool evidence changed`);
}
assert.equal(
  execFileSync(tool.toolPath, ["--version"], { encoding: "utf8" }).trim(),
  "2026.08.19"
);

assert.equal(plan.transportDiagnosis.priorMediaBytesReceived, 0);
assert.equal(
  plan.transportDiagnosis.requiredCorrection,
  "use-the-authorized-current-bestaudio-runtime-selector-in-one-checksum-and-gpg-verified-official-ytdlp-native-invocation-per-missing-video"
);
assert.equal(plan.executionPolicy.attemptsMaximum, 1);
assert.equal(plan.executionPolicy.officialYtDlpNativeInvocationsMaximum, 3);
assert.equal(plan.executionPolicy.runtimeFormatSelectionsMaximum, 3);
assert.equal(plan.executionPolicy.separateFormatInventoryInvocationsMaximum, 0);
assert.equal(plan.executionPolicy.publicSourceDownloadsMaximum, 3);
assert.equal(plan.executionPolicy.downloaderRetriesMaximum, 0);
assert.equal(plan.executionPolicy.fragmentRetriesMaximum, 0);
assert.equal(plan.executionPolicy.extractorRetriesMaximum, 0);
assert.equal(plan.executionPolicy.fileAccessRetriesMaximum, 0);
assert.equal(plan.executionPolicy.continuationMaximum, 0);
assert.equal(plan.executionPolicy.pluginsMaximum, 0);
assert.equal(plan.executionPolicy.remoteComponentsMaximum, 0);
assert.equal(plan.executionPolicy.credentialsMaximum, 0);
assert.equal(plan.executionPolicy.rerunsMaximum, 0);
assert.equal(plan.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(plan.executionPolicy.audioPlaybackCallsMaximum, 0);
assert.equal(plan.executionPolicy.semanticAudioEvaluationsMaximum, 0);
assert.equal(plan.executionPolicy.modelContextsMaximum, 0);
assert.equal(plan.executionPolicy.paidServiceCallsMaximum, 0);
assert.equal(plan.executionPolicy.directIncrementalCostUsdMaximum, 0);

for (const [file, digest] of Object.entries(plan.authenticatedInputs)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: input changed`);
}
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source changed`);
}
assert.equal(await exists(plan.outputs.executionPath), false);
assert.equal(await exists(plan.outputs.preparationPath), false);

if (await exists(activationPath)) {
  const activation = JSON.parse(await readFile(activationPath, "utf8"));
  assert.equal(
    activation.status,
    "active-for-exactly-one-batch-10-three-source-current-bestaudio-official-ytdlp-2026-08-19-native-recovery"
  );
  assert.equal(activation.plan.sha256, sha256(await readFile(planPath)));
  assert.deepEqual(activation.authenticatedInputs, plan.authenticatedInputs);
  assert.deepEqual(activation.sourceHashes, plan.sourceHashes);
  assert.equal(activation.activatedExecutionMaximum, 1);
}

console.log(JSON.stringify({
  status: "passed",
  sources: 5,
  clips: 9,
  currentBestAudioDownloads: 3,
  protectedInvalidFiles: 12,
  officialYtDlpVersion: "2026.08.19",
  impersonateTarget: "Chrome-142:Macos-26",
  activationPresent: await exists(activationPath),
  retries: 0,
  audioPlaybackCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
}, null, 2));
