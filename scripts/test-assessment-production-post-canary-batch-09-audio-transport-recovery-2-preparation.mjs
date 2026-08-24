#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction";
const planPath = `${root}/audio-source-transport-recovery-2/correction-plan.json`;
const activationPath =
  `${root}/audio-source-transport-recovery-2/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const plan = JSON.parse(await readFile(planPath, "utf8"));
assert.equal(
  plan.status,
  "frozen-one-shot-batch-09-debate-170-public-source-transport-recovery-2-ready"
);
assert.equal(plan.batchNumber, 9);
assert.equal(plan.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(plan.userAuthorization.recursiveTransportRecoveryAuthorized, true);
assert.equal(plan.userAuthorization.debate170AdditionalPublicSourceAttemptsAuthorized, 1);
assert.equal(plan.userAuthorization.debate19OriginalPublicSourceAttemptsAuthorized, 1);
assert.equal(plan.userAuthorization.debate183OriginalPublicSourceAttemptsAuthorized, 1);
assert.equal(plan.userAuthorization.audioPlaybackAuthorized, false);
assert.equal(plan.userAuthorization.semanticAudioEvaluationAuthorized, false);
assert.equal(plan.userAuthorization.modelExecutionAuthorized, false);
assert.equal(plan.userAuthorization.paidServicesAuthorized, false);
assert.equal(plan.protectedInvalidEvidence.bytes, 354);
assert.equal(
  plan.protectedInvalidEvidence.sha256,
  "87965bd54bc175f5645aa773bd5a0a98c396524a0dd0c4e94463828c11ed2754"
);
const invalidBytes = await readFile(plan.protectedInvalidEvidence.path);
assert.equal(sha256(invalidBytes), plan.protectedInvalidEvidence.sha256);
assert.equal((await stat(plan.protectedInvalidEvidence.path)).size, 354);
assert.equal(await exists(plan.protectedInvalidEvidence.preservedPath), true);
assert.equal(plan.exactCohort.sourceCount, 3);
assert.equal(plan.exactCohort.clipCount, 4);
assert.equal(plan.exactCohort.sources.length, 3);
assert.equal(plan.exactCohort.moves.length, 4);
assert.deepEqual(
  plan.exactCohort.sources.map((item) => item.sourceVideoId).sort(),
  ["HoTILnpd3q8", "_pprQXq1eCA", "2WrywAaDvvw"].sort()
);
assert.equal(plan.unattemptedOriginalSources.length, 2);
assert.equal(plan.debate170Recovery.maximumAdditionalCliInvocations, 1);
assert.equal(plan.debate170Recovery.retriesMaximum, 0);
assert.equal(
  plan.debate170Recovery.transport,
  "tv-android-vr-web-progressive-webm-http-chunk-transport"
);
assert(plan.debate170Recovery.ytDlpArguments.includes("--no-continue"));
assert(plan.debate170Recovery.ytDlpArguments.includes("--http-chunk-size"));
assert(plan.debate170Recovery.ytDlpArguments.includes("bestaudio[ext=webm]/bestaudio"));
assert.equal(plan.executionPolicy.attemptsMaximum, 1);
assert.equal(plan.executionPolicy.downloaderRetriesMaximum, 0);
assert.equal(plan.executionPolicy.rerunsMaximum, 0);
assert.equal(plan.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(plan.executionPolicy.audioPlaybackCallsMaximum, 0);
assert.equal(plan.executionPolicy.semanticAudioEvaluationsMaximum, 0);
assert.equal(plan.executionPolicy.modelContextsMaximum, 0);
assert.equal(plan.executionPolicy.paidServiceCallsMaximum, 0);
assert.equal(plan.executionPolicy.directIncrementalCostUsdMaximum, 0);
for (const [file, digest] of Object.entries(plan.authenticatedInputs)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: input hash changed`);
}
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash changed`);
}
assert.equal(await exists(plan.outputs.executionPath), false);
assert.equal(await exists(plan.outputs.preparationPath), false);

if (await exists(activationPath)) {
  const activation = JSON.parse(await readFile(activationPath, "utf8"));
  assert.equal(
    activation.status,
    "active-for-exactly-one-batch-09-debate-170-public-source-transport-recovery-2"
  );
  assert.equal(
    activation.plan.sha256,
    sha256(await readFile(planPath))
  );
  assert.deepEqual(activation.authenticatedInputs, plan.authenticatedInputs);
  assert.deepEqual(activation.sourceHashes, plan.sourceHashes);
  assert.equal(activation.activatedExecutionMaximum, 1);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      sources: 3,
      clips: 4,
      protectedInvalidFiles: 1,
      sourceHashesVerified: Object.keys(plan.sourceHashes).length,
      inputHashesVerified: Object.keys(plan.authenticatedInputs).length,
      activationPresent: await exists(activationPath),
      retries: 0,
      audioPlaybackCalls: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
