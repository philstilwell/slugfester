#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-bestaudio-recovery-8`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const preparationPath = `${root}/audio-source-preparation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const [planBytes, activationBytes, executionBytes, preparationBytes] =
  await Promise.all([
    readFile(planPath),
    readFile(activationPath),
    readFile(executionPath),
    readFile(preparationPath)
  ]);
const plan = JSON.parse(planBytes);
const execution = JSON.parse(executionBytes);
const preparation = JSON.parse(preparationBytes);

assert.equal(
  execution.status,
  "completed-one-shot-batch-10-audio-source-bestaudio-recovery-8-and-cohort"
);
assert.equal(execution.planSha256, sha256(planBytes));
assert.equal(execution.activationSha256, sha256(activationBytes));
assert.equal(execution.failure, null);
assert.equal(execution.state.attempts, 1);
assert.equal(execution.state.officialYtDlpNativeInvocations, 3);
assert.equal(execution.state.runtimeFormatSelections, 3);
assert.equal(execution.state.separateFormatInventoryInvocations, 0);
assert.equal(execution.state.officialYtDlpVersion, "2026.08.19");
assert.equal(execution.state.impersonateTarget, "Chrome-142:Macos-26");
assert.equal(execution.state.pluginsUsed, 0);
assert.equal(execution.state.remoteComponentsUsed, 0);
assert.equal(execution.state.credentialsUsed, 0);
assert.equal(execution.state.continuedDownloads, 0);
assert.equal(execution.state.publicSourceDownloads, 3);
assert.equal(execution.state.localNormalizations, 3);
assert.equal(execution.state.acceptedExistingSourcesRevalidated, 2);
assert.equal(execution.state.sourcesInstalled, 5);
assert.equal(execution.state.clipsCreated, 9);
assert.equal(execution.state.completeCohortValidated, true);
assert.equal(execution.state.failedPartialOutputsReused, 0);
assert.equal(execution.state.retries, 0);
assert.equal(execution.state.reruns, 0);
assert.equal(execution.state.timeoutExtensions, 0);
assert.equal(execution.state.audioPlaybackCalls, 0);
assert.equal(execution.state.semanticAudioEvaluations, 0);
assert.equal(execution.state.modelContexts, 0);
assert.equal(execution.state.transcriptionCalls, 0);
assert.equal(execution.state.paidServiceCalls, 0);
assert.equal(execution.state.directIncrementalCostUsd, 0);
assert.equal(execution.protectedEvidencePreserved, true);

for (const evidence of plan.protectedInvalidEvidence) {
  const bytes = await readFile(evidence.path);
  assert.equal(sha256(bytes), evidence.sha256);
  assert.equal((await stat(evidence.path)).size, evidence.bytes);
}
assert.equal(preparation.recovery.failedPartialOutputsReused, 0);
assert.equal(preparation.recovery.acceptedPrefixOutputsRevalidated, 2);
assert.equal(preparation.recovery.additionalUserAuthorizedRecoveryUsed, true);
assert.equal(preparation.recovery.officialYtDlpCurrentBestAudioDownloads, 3);
assert.equal(preparation.recovery.officialYtDlpNativeInvocations, 3);
assert.equal(preparation.recovery.runtimeFormatSelections, 3);
assert.equal(preparation.recovery.separateFormatInventoryInvocations, 0);
assert.equal(preparation.recovery.officialYtDlpVersion, "2026.08.19");
assert.equal(
  preparation.recovery.officialYtDlpSha256,
  plan.officialToolVerification.toolSha256
);
assert.equal(preparation.recovery.impersonateTarget, "Chrome-142:Macos-26");
assert.equal(preparation.recovery.pluginsUsed, 0);
assert.equal(preparation.recovery.remoteComponentsUsed, 0);
assert.equal(preparation.recovery.credentialsUsed, 0);
assert.equal(preparation.recovery.continuedDownloads, 0);
assert.equal(preparation.recovery.planSha256, sha256(planBytes));
assert.equal(preparation.recovery.activationSha256, sha256(activationBytes));

const downloaded = preparation.sources.filter(
  (source) => source.acquisitionMode ===
    "downloaded-public-source-current-bestaudio-official-ytdlp-2026-08-19-native-chrome-impersonation"
);
assert.equal(downloaded.length, 3);
assert(downloaded.every((source) =>
  source.sourceFormatSelector === "bestaudio" &&
  typeof source.sourceFormatId === "string" && source.sourceFormatId.length > 0 &&
  typeof source.sourceProtocol === "string" && source.sourceProtocol.length > 0 &&
  typeof source.sourceExtension === "string" && source.sourceExtension.length > 0 &&
  typeof source.sourceAudioCodec === "string" && source.sourceAudioCodec.length > 0 &&
  source.downloadedSourceBytes > 0 &&
  source.downloadedAudioStreamCount >= 1 &&
  source.downloadedVideoStreamCount === 0 &&
  source.officialYtDlpVersion === "2026.08.19" &&
  source.officialYtDlpSha256 === plan.officialToolVerification.toolSha256 &&
  source.impersonateTarget === "Chrome-142:Macos-26" &&
  source.pluginsUsed === false &&
  source.remoteComponentsUsed === false &&
  source.credentialsUsed === false &&
  source.continuationUsed === false
));
assert.equal(
  preparation.acquisitionPolicy.acquisitionFormat,
  "frozen-youtube-current-bestaudio-selector-official-ytdlp-2026-08-19-native-chrome-impersonation"
);
assert.equal(preparation.acquisitionPolicy.officialTool.releaseTag, "2026.08.19");
assert.equal(
  preparation.acquisitionPolicy.officialTool.sha256,
  plan.officialToolVerification.toolSha256
);
assert.equal(preparation.acquisitionPolicy.officialTool.checksumMatched, true);
assert.equal(preparation.acquisitionPolicy.officialTool.gpgSignatureVerified, true);
assert.equal(
  preparation.acquisitionPolicy.officialTool.impersonateTarget,
  "Chrome-142:Macos-26"
);
assert.equal(preparation.acquisitionPolicy.plugins, false);
assert.equal(preparation.acquisitionPolicy.remoteComponents, false);
assert.equal(preparation.acquisitionPolicy.credentials, false);
assert.equal(preparation.acquisitionPolicy.continuation, false);
assert.equal(preparation.acquisitionPolicy.runtimeFormatSelector, "bestaudio");
assert.equal(preparation.acquisitionPolicy.separateFormatInventory, false);
assert.equal(preparation.acquisitionPolicy.audioOnlyRequired, true);
assert.equal(preparation.acquisitionPolicy.positiveByteCountRequired, true);

const baseValidation = execFileSync(
  "node",
  ["scripts/test-assessment-production-post-canary-batch-10-audio-sources.mjs"],
  { encoding: "utf8" }
);
const baseResult = JSON.parse(baseValidation);
assert.equal(baseResult.status, "passed");
assert.equal(baseResult.sources, 5);
assert.equal(baseResult.clips, 9);

console.log(JSON.stringify({
  status: "passed",
  sources: preparation.sources.length,
  clips: preparation.clips.length,
  clipMinutes: preparation.totals.clipMinutes,
  currentBestAudioDownloads: downloaded.length,
  retries: 0,
  audioPlaybackCalls: 0,
  semanticAudioEvaluations: 0,
  transcriptionCalls: 0,
  modelContexts: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
}, null, 2));
