#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { canonicalJson } from "./lib/v4-lean-production.mjs";

const root =
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v4";
const activationPath = `${root}/execution-activation.json`;
const executionPath = `${root}/execution.json`;
const analysisPath = `${root}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

const [activationBytes, execution, analysis] = await Promise.all([
  readFile(path.resolve(activationPath)),
  parse(executionPath),
  parse(analysisPath)
]);
const activation = JSON.parse(activationBytes);

assert.equal(
  activation.status,
  "fourth-replacement-rendering-verification-execution-authorized-and-frozen"
);
assert.equal(
  sha256(canonicalJson(activation.executionNavigation.input)),
  activation.executionNavigation.token
);
assert.equal(execution.activation.sha256, sha256(activationBytes));
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assert.equal(sha256(await readFile(path.resolve(file))), digest, file);
}
for (const [file, digest] of Object.entries(activation.packetHashes)) {
  assert.equal(sha256(await readFile(path.resolve(file))), digest, file);
}

const failedStatus =
  "fourth-replacement-rendering-verification-failed-closed-on-first-viewport-cdp-screenshot-deadline";
assert.equal(execution.status, failedStatus);
assert.equal(analysis.status, failedStatus);
assert.equal(execution.sourceAndPacketGate.sourceHashesReplayed, 142);
assert.equal(execution.sourceAndPacketGate.sourceHashFailures, 0);
assert.equal(execution.sourceAndPacketGate.packetsReplayed, 10);
assert.equal(execution.sourceAndPacketGate.packetHashFailures, 0);
assert.equal(execution.attemptedDebates, 1);
assert.equal(execution.attemptedViewportResults, 1);
assert.equal(execution.finalizedViewportResults, 0);
assert.equal(execution.failedViewportResults, 1);
assert.equal(execution.unattemptedViewportResults, 19);
assert.equal(execution.screenshotRequests, 1);
assert.equal(execution.completedScreenshots, 0);
assert.equal(execution.preservedScreenshots, 0);
assert.equal(execution.viewportRetries, 0);
assert.equal(execution.candidateNavigationRetries, 0);
assert.equal(execution.modelContexts, 0);
assert.equal(execution.directCostUsd, 0);
assert.equal(execution.attemptedFailure.debateNumber, "50");
assert.equal(execution.attemptedFailure.viewport, "desktop");
assert.equal(execution.attemptedFailure.measuredCandidateHttpStatus, 200);
assert.equal(execution.attemptedFailure.directRuntimeReadinessCompleted, true);
assert.equal(execution.attemptedFailure.pointerInteractionAttempted, false);
assert.equal(execution.attemptedFailure.keyboardPhaseAttempted, false);
assert.equal(execution.attemptedFailure.screenshotBytesReturned, false);
assert.equal(execution.attemptedFailure.screenshotPersisted, false);
assert.match(execution.attemptedFailure.error, /Page\.captureScreenshot/);
assert.match(execution.attemptedFailure.error, /3000ms/);
assert.equal(execution.cleanup.browserTabsRemaining, 0);
assert.equal(execution.cleanup.viewportOverrideReset, true);
assert.equal(execution.cleanup.localServerStopped, true);
assert.equal(execution.cleanup.localServerPortClosed, true);
assert.equal(execution.cleanup.evidenceRootCreated, false);
assert.equal(execution.renderingVerificationPassed, false);
assert.equal(execution.renderingContentRegressionEstablished, false);
assert.equal(execution.productionMutationPerformed, false);

assert.equal(analysis.gate.attemptedViewportResults, 1);
assert.equal(analysis.gate.finalizedViewportResultsPassed, 0);
assert.equal(analysis.gate.completedScreenshots, 0);
assert.equal(analysis.gate.validScreenshotsPreserved, 0);
assert.equal(analysis.gate.browserEvidenceCaptureContractPassed, false);
assert.equal(analysis.decision.failedClosed, true);
assert.equal(analysis.decision.retryPerformed, false);
assert.equal(analysis.decision.timeoutExtended, false);
assert.equal(analysis.decision.renderingGatePassed, false);
assert.equal(analysis.decision.productionMutationRemainsBlocked, true);
assert.equal(analysis.authorization.retry, false);
assert.equal(analysis.authorization.timeoutExtension, false);
assert.equal(analysis.authorization.alternativeCaptureMethod, false);
assert.equal(analysis.authorization.renderingRepair, false);
assert.equal(analysis.authorization.productionMutation, false);
assert.equal(
  analysis.nextAuthorizedAction,
  "user-decision-on-rendering-verification-remedy-v5-plan-preparation"
);

assert.equal(await exists(`${root}/evidence`), false);
assert.equal(await exists(`${root}/rendering-audit.json`), false);

console.log(JSON.stringify({
  status: "remedy-v4-rendering-failure-audit-passed",
  attemptedViewportResults: execution.attemptedViewportResults,
  finalizedViewportResults: execution.finalizedViewportResults,
  completedScreenshots: execution.completedScreenshots,
  failedViewportResults: execution.failedViewportResults,
  unattemptedViewportResults: execution.unattemptedViewportResults,
  modelContexts: execution.modelContexts,
  directCostUsd: execution.directCostUsd,
  productionMutationPerformed: execution.productionMutationPerformed
}, null, 2));
