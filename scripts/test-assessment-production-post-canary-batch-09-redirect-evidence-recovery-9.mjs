#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const validateExecution = process.argv.includes("--execution");
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-9`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const analysisPath = `${recoveryRoot}/analysis.json`;
const preparationPath = `${root}/audio-source-preparation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const planBytes = await readFile(planPath);
const plan = JSON.parse(planBytes);
assert.equal(
  plan.status,
  "frozen-one-final-batch-09-debate-170-redirect-evidence-and-three-source-recovery-9-ready"
);
assert.equal(plan.userAuthorization.finalDebate170RecoveryAttemptsAuthorized, 1);
assert.equal(plan.userAuthorization.retriesMaximum, 0);
assert.equal(plan.redirectEvidenceCorrection.priorMediaRedirectMode, "error");
assert.equal(plan.redirectEvidenceCorrection.correctedInitialMediaRedirectMode, "manual");
assert.equal(plan.redirectEvidenceCorrection.initialDebate170ResponseMustBeRedirect, true);
assert.equal(plan.redirectEvidenceCorrection.followPermittedOnlyAfterRedirectResponseObserved, true);
assert.equal(plan.redirectEvidenceCorrection.credentialsModeForEveryHop, "omit");
assert.equal(plan.redirectEvidenceCorrection.rawSignedUrlsPersisted, false);
assert.deepEqual(plan.exactExecution.sourceOrder, ["170", "19", "183"]);
assert.equal(plan.exactExecution.retries, 0);
assert.equal(plan.exactExecution.audioPlaybackCalls, 0);
assert.equal(plan.exactExecution.modelContexts, 0);
assert.equal(plan.exactExecution.paidServiceCalls, 0);
for (const [file, digest] of Object.entries(plan.authenticatedInputs)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: input hash changed`);
}
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash changed`);
}
const basePlan = JSON.parse(await readFile(plan.inheritedFrozenCohort.path, "utf8"));
assert.equal(
  sha256(JSON.stringify(basePlan.exactCohort)),
  plan.inheritedFrozenCohort.exactCohortSha256
);

if (await exists(activationPath)) {
  const activation = JSON.parse(await readFile(activationPath, "utf8"));
  assert.equal(
    activation.status,
    "active-for-exactly-one-final-batch-09-debate-170-redirect-evidence-and-three-source-recovery-9-pass"
  );
  assert.equal(activation.plan.sha256, sha256(planBytes));
  assert.deepEqual(activation.authenticatedInputs, plan.authenticatedInputs);
  assert.deepEqual(activation.sourceHashes, plan.sourceHashes);
  assert.equal(activation.initialDebate170ResponseMustBeRedirect, true);
  assert.equal(activation.retriesMaximum, 0);
}

if (!validateExecution) {
  assert.equal(await exists(executionPath), false);
  assert.equal(await exists(analysisPath), false);
  assert.equal(await exists(preparationPath), false);
} else {
  const executionBytes = await readFile(executionPath);
  const analysisBytes = await readFile(analysisPath);
  const preparationBytes = await readFile(preparationPath);
  const execution = JSON.parse(executionBytes);
  const analysis = JSON.parse(analysisBytes);
  const preparation = JSON.parse(preparationBytes);
  assert.equal(execution.planSha256, sha256(planBytes));
  assert.equal(execution.activationSha256, sha256(await readFile(activationPath)));
  assert.equal(execution.state.attempts, 1);
  assert.equal(execution.state.configBootstrapGets, 1);
  assert.equal(execution.state.playerMetadataPosts, 3);
  assert.equal(execution.state.mediaAttempts, 3);
  assert.equal(execution.state.sourcesInstalled, 3);
  assert.equal(execution.state.clipsCreated, 4);
  assert.equal(execution.state.retries, 0);
  assert.equal(execution.state.audioPlaybackCalls, 0);
  assert.equal(execution.state.paidServiceCalls, 0);
  const debate170 = execution.requestAudit.find((item) => item.debateNumber === "170");
  assert.ok(debate170);
  assert.ok(debate170.redirectEvidence.length >= 1);
  assert.ok(debate170.redirectEvidence[0].status >= 300);
  assert.ok(debate170.redirectEvidence[0].status <= 399);
  assert.equal(debate170.redirectRejectionProven, true);
  assert.equal(preparation.sources.length, 3);
  assert.equal(preparation.clips.length, 4);
  for (const source of preparation.sources) {
    assert.equal(sha256(await readFile(source.sourceAudio)), source.sourceAudioSha256);
    assert.equal(source.channels, 1);
    assert.equal(source.sampleRateHz, 16000);
  }
  for (const clip of preparation.clips) {
    assert.equal(sha256(await readFile(clip.clipPath)), clip.clipSha256);
    assert.equal(clip.channels, 1);
    assert.equal(clip.sampleRateHz, 16000);
  }
  const serialized = `${executionBytes}${analysisBytes}${preparationBytes}`;
  assert.equal(serialized.includes("googlevideo.com"), false);
  assert.equal(serialized.includes("AIza"), false);
  assert.equal(analysis.result.redirectRejectionProven, true);
  assert.equal(analysis.result.completeCohortValidated, true);
  assert.equal(analysis.result.audioPlaybackObservedSeconds, 0);
  assert.equal(analysis.directIncrementalCostUsd, 0);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      executionValidated: validateExecution,
      attempts: 1,
      retries: 0,
      audioPlaybackMaximumSeconds: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
