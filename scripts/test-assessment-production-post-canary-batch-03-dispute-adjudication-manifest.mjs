#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication";
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const EXPECTED_DEBATES = ["124", "14", "58", "150", "157", "102", "09", "181", "138", "27"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const manifestBytes = await readFile(MANIFEST);
const manifest = JSON.parse(manifestBytes);
const preparationBytes = await readFile(manifest.preparation);
const preparation = JSON.parse(preparationBytes);

assert.equal(
  manifest.schemaVersion,
  "1.0-assessment-production-post-canary-batch-03-dispute-only-adjudication-execution-preparation-manifest"
);
assert.equal(
  manifest.status,
  "frozen-ten-post-canary-batch-03-dispute-only-adjudication-contexts-prepared-not-authorized"
);
assert.equal(manifest.productionCanary, false);
assert.equal(manifest.batchNumber, 3);
assert.equal(manifest.stagingOnly, true);
assert.equal(manifest.developmentValidationOnly, false);
assert.equal(manifest.preparationSha256, sha256(preparationBytes));
assert.deepEqual(
  manifest.contexts.map((item) => item.contextIndex),
  Array.from({ length: 10 }, (_, index) => index)
);
assert.deepEqual(manifest.contexts.map((item) => item.debateNumber), EXPECTED_DEBATES);
assert.equal(preparation.totals.disputedMoves, 190);
assert.equal(preparation.totals.candidateSelections, 586);
assert.equal(preparation.totals.audioVerifiedMoves, 8);
assert.equal(manifest.model.label, "5.6 Sol");
assert.equal(manifest.model.slug, "gpt-5.6-sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.equal(manifest.model.scoreBlind, true);
assert.equal(manifest.model.roundedIntegerScoreTiesPermitted, true);
assert.equal(manifest.activePolicy.version, "v2.2");
assert.equal(manifest.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie, true);
assert.equal(manifest.activePolicy.scorePassesMaximum, 1);
assert.equal(manifest.activePolicy.scoreCalculationAuthorizedThisStage, false);
assert.equal(manifest.acceptedSourceBoundary.allTwentyJudgmentsAccepted, true);
assert.equal(manifest.acceptedSourceBoundary.allEightAudioMovesVerified, true);
assert.equal(manifest.acceptedSourceBoundary.audioValidationOverlaysPreserved, 4);
assert.equal(manifest.acceptedSourceBoundary.additionalPaidCallsThisStage, 0);
assert.equal(manifest.userAuthorization.directIncrementalCostUsdMaximum, 0);

assert.equal(manifest.executionPolicy.contexts, 10);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.maximumParallelContexts, 2);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2]);
assert.deepEqual(
  manifest.executionPolicy.rampPhases.map((phase) => phase.contextIndexes),
  [[0], [1, 2], [3, 4, 5, 6, 7, 8, 9]]
);
assert.equal(manifest.executionPolicy.stopBeforeExpansionOnRampFailure, true);
assert.equal(manifest.executionPolicy.separateActivationRequired, true);
assert.equal(manifest.executionPolicy.APIKeysRemoved, true);
assert.deepEqual(manifest.executionPolicy.removedEnvironmentVariables, [
  "OPENAI_API_KEY",
  "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID",
  "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY",
  "CODEX_API_KEY"
]);
assert.equal(manifest.costEstimate.contexts, 10);
assert.equal(manifest.costEstimate.directIncrementalCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.transcriptionCostUsdMaximum, 0);
assert.deepEqual(manifest.costEstimate.expectedParallelWallMinutes, [18, 40]);
assert.equal(manifest.costEstimate.absoluteGateTimeoutMinutes, 90);

for (const value of Object.values(manifest.isolation)) assert.equal(value, true);
for (const value of Object.values(manifest.stopRules)) assert.equal(value, true);
for (const [key, value] of Object.entries(manifest.authorization)) {
  assert.equal(value, false, `${key}: must remain unauthorized`);
}
assert.equal(manifest.deterministicValidation.calculatedScores, 0);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
}
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(Object.hasOwn(manifest.sourceHashes, future), false);
  assert.equal(await exists(future), false, `future output already exists: ${future}`);
}
const sharedBytes = (
  await Promise.all(Object.values(manifest.modelInputs).map((file) => readFile(file)))
).reduce((sum, bytes) => sum + bytes.length, 0);
for (const context of manifest.contexts) {
  const packetBytes = await readFile(context.packet);
  const audioBytes = (
    await Promise.all(context.audioTranscriptInputs.map((item) => readFile(item.sourcePath)))
  ).reduce((sum, bytes) => sum + bytes.length, 0);
  assert.equal(sha256(packetBytes), context.packetSha256);
  assert.equal(
    context.copiedInputBytes,
    sharedBytes + packetBytes.length + audioBytes,
    `${context.debateNumber}: copied input accounting changed`
  );
  assert.equal(
    context.copiedInputBytes <= manifest.executionPolicy.copiedInputBytesMaximum,
    true
  );
}
assert.equal(
  manifest.nextAuthorizedAction,
  "standing-authorization-permits-batch-03-dispute-only-adjudication-activation-after-frozen-gate-passes"
);

console.log(JSON.stringify({
  status: "passed",
  contexts: 10,
  disputedMoves: 190,
  candidateSelections: 586,
  audioTranscriptInputs: 8,
  schedulerRamp: [1, 2],
  maximumParallelContexts: 2,
  attemptsPerContext: 1,
  retriesMaximum: 0,
  authentication: "ChatGPT subscription",
  directIncrementalCostUsdMaximum: 0,
  modelExecutionAuthorized: false,
  paidServicesAuthorized: false,
  finalLedgersAssembled: 0,
  scoresDerived: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction
}, null, 2));
