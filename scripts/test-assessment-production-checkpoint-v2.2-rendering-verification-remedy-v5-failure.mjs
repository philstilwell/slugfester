#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { canonicalJson } from "./lib/v4-lean-production.mjs";

const root =
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v5";
const activationPath = `${root}/execution-activation.json`;
const executionPath = `${root}/execution.json`;
const analysisPath = `${root}/analysis.json`;
const runnerPath =
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-browser-runner-v5.mjs";
const contractPath =
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v5.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

const [activationBytes, execution, analysis, runner, contract] = await Promise.all([
  readFile(path.resolve(activationPath)),
  parse(executionPath),
  parse(analysisPath),
  readFile(path.resolve(runnerPath), "utf8"),
  readFile(path.resolve(contractPath), "utf8")
]);
const activation = JSON.parse(activationBytes);

assert.equal(
  activation.status,
  "fifth-replacement-rendering-verification-execution-authorized-and-frozen"
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
  "fifth-replacement-rendering-verification-failed-closed-on-first-viewport-jpeg-signature-contract-mismatch";
assert.equal(execution.status, failedStatus);
assert.equal(analysis.status, failedStatus);
assert.equal(execution.sourceAndPacketGate.sourceHashesReplayed, 168);
assert.equal(execution.sourceAndPacketGate.sourceHashFailures, 0);
assert.equal(execution.sourceAndPacketGate.packetsReplayed, 10);
assert.equal(execution.sourceAndPacketGate.packetHashFailures, 0);
assert.equal(execution.attemptedDebates, 1);
assert.equal(execution.attemptedViewportResults, 1);
assert.equal(execution.finalizedViewportResults, 0);
assert.equal(execution.failedViewportResults, 1);
assert.equal(execution.unattemptedViewportResults, 19);
assert.equal(execution.screenshotRequests, 2);
assert.equal(execution.completedScreenshots, 2);
assert.equal(execution.frozenSignatureValidScreenshots, 0);
assert.equal(execution.preservedScreenshots, 0);
assert.equal(execution.transientRequiredBooleanChecksPassed, 36);
assert.equal(execution.transientRequiredBooleanChecksExpected, 38);
assert.equal(execution.viewportRetries, 0);
assert.equal(execution.candidateNavigationRetries, 0);
assert.equal(execution.timeoutExtensions, 0);
assert.equal(execution.modelContexts, 0);
assert.equal(execution.directCostUsd, 0);
assert.equal(execution.attemptedFailure.debateNumber, "50");
assert.equal(execution.attemptedFailure.viewport, "desktop");
assert.deepEqual(execution.attemptedFailure.diagnosticBootstrapHttpStatuses, [200, 200]);
assert.deepEqual(execution.attemptedFailure.measuredCandidateHttpStatuses, [200, 200]);
assert.equal(execution.attemptedFailure.directRuntimeReadinessCompleted, true);
assert.equal(execution.attemptedFailure.pointerAndKeyboardInteractionsCompleted, true);
assert.equal(execution.attemptedFailure.runtimeCollectionCompleted, true);
assert.deepEqual(execution.attemptedFailure.failedBooleanChecks, [
  "collapsedScreenshotJpeg",
  "openScreenshotJpeg"
]);
for (const key of ["collapsedScreenshot", "openScreenshot"]) {
  const screenshot = execution.attemptedFailure[key];
  assert.equal(screenshot.format, "JPEG");
  assert.equal(screenshot.pixelWidth, 1152);
  assert.equal(screenshot.pixelHeight, 800);
  assert.ok(screenshot.byteLength >= 10000);
  assert.ok(screenshot.uniqueColors >= 16);
  assert.ok(screenshot.entropy >= 0.02);
  assert.match(screenshot.sha256, /^[a-f0-9]{64}$/);
  assert.equal(screenshot.recordedSignatureHex, "ffd8ffe000104a46");
  assert.equal(screenshot.persisted, false);
}
assert.notEqual(
  execution.attemptedFailure.collapsedScreenshot.sha256,
  execution.attemptedFailure.openScreenshot.sha256
);
assert.equal(
  execution.attemptedFailure.expectedSignatureHex,
  "ffd8ffe000104a4649460001"
);
assert.equal(execution.attemptedFailure.renderingContentRegressionEstablished, false);
assert.equal(execution.attemptedFailure.renderingHarnessContractFailureEstablished, true);
assert.match(runner, /signatureHex: bytes\.subarray\(0, 8\)\.toString\("hex"\)/);
assert.match(contract, /signatureHex: "ffd8ffe000104a4649460001"/);
assert.equal(execution.cleanup.browserTabsRemaining, 0);
assert.equal(execution.cleanup.viewportOverrideReset, true);
assert.equal(execution.cleanup.localServerStopped, true);
assert.equal(execution.cleanup.localServerPortClosed, true);
assert.equal(execution.cleanup.evidenceRootCreated, false);
assert.equal(execution.renderingVerificationPassed, false);
assert.equal(execution.renderingContentRegressionEstablished, false);
assert.equal(execution.renderingHarnessContractFailureEstablished, true);
assert.equal(execution.productionMutationPerformed, false);

assert.equal(analysis.gate.attemptedViewportResults, 1);
assert.equal(analysis.gate.finalizedViewportResultsPassed, 0);
assert.equal(analysis.gate.completedScreenshots, 2);
assert.equal(analysis.gate.frozenSignatureValidScreenshots, 0);
assert.equal(analysis.gate.validScreenshotsPreserved, 0);
assert.equal(analysis.gate.browserEvidenceCaptureContractPassed, false);
assert.equal(analysis.decision.failedClosed, true);
assert.equal(analysis.decision.retryPerformed, false);
assert.equal(analysis.decision.timeoutExtended, false);
assert.equal(analysis.decision.renderingGatePassed, false);
assert.equal(analysis.decision.candidateRenderingDefectEstablished, false);
assert.equal(analysis.decision.renderingHarnessContractFailureEstablished, true);
assert.equal(analysis.decision.automaticHarnessRepairPermitted, false);
assert.equal(analysis.decision.productionMutationRemainsBlocked, true);
assert.equal(analysis.authorization.retry, false);
assert.equal(analysis.authorization.harnessRepair, false);
assert.equal(analysis.authorization.renderingRepair, false);
assert.equal(analysis.authorization.productionMutation, false);
assert.equal(
  analysis.nextAuthorizedAction,
  "user-decision-on-rendering-verification-remedy-v6-plan-preparation"
);

assert.equal(await exists(`${root}/evidence`), false);
assert.equal(await exists(`${root}/rendering-audit.json`), false);

console.log(JSON.stringify({
  status: "remedy-v5-rendering-failure-audit-passed",
  attemptedViewportResults: execution.attemptedViewportResults,
  finalizedViewportResults: execution.finalizedViewportResults,
  completedScreenshots: execution.completedScreenshots,
  failedViewportResults: execution.failedViewportResults,
  unattemptedViewportResults: execution.unattemptedViewportResults,
  harnessContractFailure: execution.renderingHarnessContractFailureEstablished,
  modelContexts: execution.modelContexts,
  directCostUsd: execution.directCostUsd,
  productionMutationPerformed: execution.productionMutationPerformed
}, null, 2));
