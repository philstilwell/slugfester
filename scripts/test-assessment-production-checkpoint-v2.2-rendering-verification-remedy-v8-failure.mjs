#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { canonicalJson } from "./lib/v4-lean-production.mjs";

const root =
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v8";
const preparationPath = `${root}/preparation-manifest.json`;
const activationPath = `${root}/execution-activation.json`;
const executionPath = `${root}/execution.json`;
const analysisPath = `${root}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

const [preparationBytes, activationBytes, execution, analysis] =
  await Promise.all([
    readFile(path.resolve(preparationPath)),
    readFile(path.resolve(activationPath)),
    parse(executionPath),
    parse(analysisPath)
  ]);
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);

assert.equal(
  activation.status,
  "eighth-replacement-rendering-verification-execution-authorized-and-frozen"
);
assert.equal(
  sha256(canonicalJson(activation.executionNavigation.input)),
  activation.executionNavigation.token
);
assert.equal(execution.activation.sha256, sha256(activationBytes));
assert.equal(execution.preparation.sha256, sha256(preparationBytes));
assert.equal(execution.navigationToken, activation.executionNavigation.token);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assert.equal(sha256(await readFile(path.resolve(file))), digest, file);
}
for (const [file, digest] of Object.entries(activation.packetHashes)) {
  assert.equal(sha256(await readFile(path.resolve(file))), digest, file);
}

const failedStatus =
  "eighth-replacement-rendering-verification-failed-closed-on-first-viewport-keyboard-measured-load-observation-timeout";
assert.equal(execution.status, failedStatus);
assert.equal(analysis.status, failedStatus);
assert.equal(execution.sourceAndPacketGate.sourceHashesReplayed, 214);
assert.equal(execution.sourceAndPacketGate.sourceHashFailures, 0);
assert.equal(execution.sourceAndPacketGate.packetsReplayed, 10);
assert.equal(execution.sourceAndPacketGate.packetHashFailures, 0);
assert.equal(execution.attemptedDebates, 1);
assert.equal(execution.passingDebateEvidenceSets, 0);
assert.equal(execution.gatePromotedDebates, 0);
assert.equal(execution.attemptedViewportResults, 1);
assert.equal(execution.passingViewportEvidenceResults, 0);
assert.equal(execution.failedViewportResults, 1);
assert.equal(execution.unattemptedViewportResults, 19);
assert.equal(execution.viewportRetries, 0);
assert.equal(execution.candidateNavigationRetries, 0);
assert.equal(execution.timeoutExtensions, 0);
assert.equal(execution.modelContexts, 0);
assert.equal(execution.scorePasses, 0);
assert.equal(execution.directCostUsd, 0);

assert.equal(execution.attemptedFailure.debateNumber, "50");
assert.equal(execution.attemptedFailure.viewport, "desktop");
assert.equal(execution.attemptedFailure.phase, "keyboard");
assert.equal(
  execution.attemptedFailure.stage,
  "measured-candidate-page-navigation-or-load-observation"
);
assert.equal(execution.attemptedFailure.runnerLoadStateTimeoutMs, 15000);
assert.equal(execution.attemptedFailure.measuredCandidateHttpResponseObserved, true);
assert.equal(
  execution.attemptedFailure.measuredCandidateControllerLoadCompletionObserved,
  false
);
assert.match(execution.attemptedFailure.browserControlError, /Timed out waiting for load/);
assert.equal(execution.attemptedFailure.keyboardEnterAttempted, false);
assert.equal(execution.attemptedFailure.keyboardSpaceAttempted, false);
assert.equal(execution.attemptedFailure.failedViewportEvidencePersisted, false);

assert.equal(execution.phaseProgress.pointer.runtimeCollectionCompleted, true);
assert.equal(
  execution.phaseProgress.pointer.collapsedScreenshotCapturedAndAnalyzedInMemory,
  true
);
assert.equal(
  execution.phaseProgress.pointer.openScreenshotCapturedAndAnalyzedInMemory,
  true
);
assert.equal(
  execution.phaseProgress.keyboard.measuredCandidateHttpResponseObserved,
  true
);
assert.equal(
  execution.phaseProgress.keyboard.measuredCandidateControllerLoadCompleted,
  false
);
assert.equal(execution.localHttpObservation.totalRequestsObserved, 24);
assert.equal(execution.localHttpObservation.http200ResponsesObserved, 24);
assert.equal(execution.localHttpObservation.non200ResponsesObserved, 0);
assert.equal(execution.browserEvidence.pointerScreenshotRequests, 2);
assert.equal(execution.browserEvidence.persistedScreenshots, 0);
assert.equal(execution.browserEvidence.persistedViewportResults, 0);
assert.equal(execution.browserEvidence.requiredBooleanChecksAssembled, 0);
assert.equal(execution.browserEvidence.browserMajorVersionMatchEstablished, false);

assert.equal(
  execution.failure.browserControllerLoadObservationFailureEstablished,
  true
);
assert.equal(execution.failure.candidateRenderingDefectEstablished, false);
assert.equal(execution.failure.candidateHttpFailureEstablished, false);
assert.equal(execution.failure.retryPerformed, false);
assert.equal(execution.failure.timeoutExtended, false);
assert.equal(execution.cleanup.browserTabsRemaining, 0);
assert.equal(execution.cleanup.inAppViewportOverrideReset, true);
assert.equal(execution.cleanup.chromeViewportOverrideReset, true);
assert.equal(execution.cleanup.localServerStopped, true);
assert.equal(execution.cleanup.localServerPortClosed, true);
assert.equal(execution.cleanup.evidenceRootCreated, false);
assert.equal(execution.renderingVerificationPassed, false);
assert.equal(execution.productionMutationPerformed, false);

assert.equal(analysis.decision.failedClosed, true);
assert.equal(analysis.decision.retryPerformed, false);
assert.equal(analysis.decision.timeoutExtended, false);
assert.equal(analysis.decision.partialStatePromotionPermitted, false);
assert.equal(analysis.decision.renderingGatePassed, false);
assert.equal(analysis.decision.candidateRenderingDefectEstablished, false);
assert.equal(
  analysis.decision.browserControllerLoadObservationFailureEstablished,
  true
);
assert.equal(analysis.decision.productionMutationRemainsBlocked, true);
assert.equal(analysis.preservedControls.judgmentModel, "gpt-5.6-sol");
assert.equal(analysis.preservedControls.reasoningEffort, "low");
assert.equal(analysis.preservedControls.authentication, "chatgpt-subscription");
assert.equal(analysis.preservedControls.scoreBlindness, true);
assert.equal(analysis.preservedControls.roundedIntegerScoreTiesPermitted, true);
assert.equal(analysis.preservedControls.judgmentExecutionPerformed, false);
assert.equal(analysis.preservedControls.scoresReadOrChanged, false);
assert.equal(analysis.authorization.retry, false);
assert.equal(analysis.authorization.automaticPartialEvidenceReuse, false);
assert.equal(analysis.authorization.renderingRepair, false);
assert.equal(analysis.authorization.productionMutation, false);
assert.equal(
  analysis.nextAuthorizedAction,
  "user-decision-on-rendering-verification-remedy-v9-plan-preparation"
);

assert.equal(await exists(`${root}/evidence`), false);
assert.equal(await exists(`${root}/rendering-audit.json`), false);

console.log(JSON.stringify({
  status: "remedy-v8-rendering-failure-audit-passed",
  attemptedViewportResults: execution.attemptedViewportResults,
  passingViewportEvidenceResults: execution.passingViewportEvidenceResults,
  persistedScreenshots: execution.browserEvidence.persistedScreenshots,
  failedViewportResults: execution.failedViewportResults,
  unattemptedViewportResults: execution.unattemptedViewportResults,
  browserControllerLoadObservationFailure:
    execution.browserControllerLoadObservationFailureEstablished,
  modelContexts: execution.modelContexts,
  directCostUsd: execution.directCostUsd,
  productionMutationPerformed: execution.productionMutationPerformed
}, null, 2));
