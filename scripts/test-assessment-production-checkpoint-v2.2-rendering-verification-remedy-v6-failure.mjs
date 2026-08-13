#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  validateCheckpointV22RenderingRemedyV6Packet,
  validateCheckpointV22RenderingRemedyV6ViewportEvidence
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v6.mjs";
import { canonicalJson } from "./lib/v4-lean-production.mjs";

const root =
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v6";
const preparationPath = `${root}/preparation-manifest.json`;
const activationPath = `${root}/execution-activation.json`;
const executionPath = `${root}/execution.json`;
const analysisPath = `${root}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

const [preparation, activationBytes, execution, analysis] = await Promise.all([
  parse(preparationPath),
  readFile(path.resolve(activationPath)),
  parse(executionPath),
  parse(analysisPath)
]);
const activation = JSON.parse(activationBytes);

assert.equal(
  activation.status,
  "sixth-replacement-rendering-verification-execution-authorized-and-frozen"
);
assert.equal(
  sha256(canonicalJson(activation.executionNavigation.input)),
  activation.executionNavigation.token
);
assert.equal(execution.activation.sha256, sha256(activationBytes));
assert.equal(execution.preparation.sha256, sha256(await readFile(preparationPath)));
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assert.equal(sha256(await readFile(path.resolve(file))), digest, file);
}
for (const [file, digest] of Object.entries(activation.packetHashes)) {
  assert.equal(sha256(await readFile(path.resolve(file))), digest, file);
}

const failedStatus =
  "sixth-replacement-rendering-verification-failed-closed-after-eighteen-passing-viewports-on-debate-122-desktop-page-navigate-deadline";
assert.equal(execution.status, failedStatus);
assert.equal(analysis.status, failedStatus);
assert.equal(execution.sourceAndPacketGate.sourceHashesReplayed, 198);
assert.equal(execution.sourceAndPacketGate.sourceHashFailures, 0);
assert.equal(execution.sourceAndPacketGate.packetsReplayed, 10);
assert.equal(execution.sourceAndPacketGate.packetHashFailures, 0);
assert.equal(execution.attemptedDebates, 10);
assert.equal(execution.passingDebateEvidenceSets, 9);
assert.equal(execution.gatePromotedDebates, 0);
assert.equal(execution.attemptedViewportResults, 19);
assert.equal(execution.passingViewportEvidenceResults, 18);
assert.equal(execution.gatePromotedViewportResults, 0);
assert.equal(execution.failedViewportResults, 1);
assert.equal(execution.unattemptedViewportResults, 1);
assert.equal(execution.completedScreenshots, 36);
assert.equal(execution.frozenSignatureValidScreenshots, 36);
assert.equal(execution.validScreenshotsPreservedForAudit, 36);
assert.equal(execution.passingRequiredBooleanChecks, 684);
assert.equal(execution.rawAccordionStateObservations, 90);
assert.equal(execution.exactViewportPhaseChecksPassed, 54);
assert.equal(execution.viewportRetries, 0);
assert.equal(execution.candidateNavigationRetries, 0);
assert.equal(execution.timeoutExtensions, 0);
assert.equal(execution.modelContexts, 0);
assert.equal(execution.directCostUsd, 0);
assert.equal(execution.attemptedFailure.debateNumber, "122");
assert.equal(execution.attemptedFailure.viewport, "desktop");
assert.equal(execution.attemptedFailure.phase, "pointer");
assert.equal(
  execution.attemptedFailure.stage,
  "diagnostic-bootstrap-page-navigation"
);
assert.equal(execution.attemptedFailure.command, "Page.navigate");
assert.equal(execution.attemptedFailure.controllerCommandDeadlineMs, 10000);
assert.equal(execution.attemptedFailure.diagnosticBootstrapHttpResponseObserved, false);
assert.equal(execution.attemptedFailure.measuredCandidateNavigationAttempted, false);
assert.equal(execution.attemptedFailure.candidatePageLoaded, false);
assert.equal(execution.attemptedFailure.screenshotRequested, false);
assert.equal(execution.attemptedFailure.failedViewportEvidencePersisted, false);
assert.match(execution.attemptedFailure.error, /10000ms/);
assert.match(execution.attemptedFailure.error, /Page\.navigate/);
assert.equal(execution.failure.browserControllerNavigationFailureEstablished, true);
assert.equal(execution.failure.candidateRenderingDefectEstablished, false);
assert.equal(execution.failure.retryPerformed, false);
assert.equal(execution.failure.timeoutExtended, false);
assert.equal(execution.cleanup.browserTabsRemaining, 0);
assert.equal(execution.cleanup.viewportOverrideReset, true);
assert.equal(execution.cleanup.localServerStopped, true);
assert.equal(execution.cleanup.localServerPortClosed, true);
assert.equal(execution.cleanup.debate122EvidenceDirectoryCreated, false);
assert.equal(execution.renderingVerificationPassed, false);
assert.equal(execution.productionMutationPerformed, false);

const results = [];
for (const row of preparation.packets) {
  const packet = JSON.parse(await readFile(path.resolve(row.path), "utf8"));
  validateCheckpointV22RenderingRemedyV6Packet(packet);
  for (const viewportName of ["desktop", "mobile"]) {
    const viewport = packet.viewports[viewportName];
    if (!(await exists(viewport.evidence.result))) continue;
    const evidence = JSON.parse(
      await readFile(path.resolve(viewport.evidence.result), "utf8")
    );
    validateCheckpointV22RenderingRemedyV6ViewportEvidence({
      packet,
      viewportName,
      activationNavigationToken: activation.executionNavigation.token,
      evidence
    });
    for (const key of ["collapsed", "open"]) {
      const screenshot = evidence.screenshots[key];
      assert.equal(
        sha256(await readFile(path.resolve(screenshot.path))),
        screenshot.sha256,
        screenshot.path
      );
      assert.equal(screenshot.transport.signatureBytesInspected, 12);
      assert.equal(
        screenshot.transport.signatureHex,
        "ffd8ffe000104a4649460001"
      );
    }
    results.push(evidence);
  }
}
assert.equal(results.length, 18);
assert.deepEqual(
  [...new Set(results.map((result) => result.debateNumber))],
  execution.passingEvidence.debates
);
assert.ok(results.every((result) => result.status === "passed-rendering-viewport"));
assert.ok(results.every((result) => Object.values(result.checks).every(Boolean)));
assert.equal(
  results.reduce(
    (total, result) => total + Object.values(result.checks).filter(Boolean).length,
    0
  ),
  684
);
assert.ok(
  results.every((result) =>
    Object.values(result.runtime.counts).every((count) => count === 0)
  )
);
assert.ok(
  results.every((result) =>
    Object.values(result.mutations).every((changed) => changed === false)
  )
);

assert.equal(analysis.decision.failedClosed, true);
assert.equal(analysis.decision.retryPerformed, false);
assert.equal(analysis.decision.timeoutExtended, false);
assert.equal(analysis.decision.partialStatePromotionPermitted, false);
assert.equal(analysis.decision.renderingGatePassed, false);
assert.equal(analysis.decision.candidateRenderingDefectEstablished, false);
assert.equal(analysis.decision.browserControllerNavigationFailureEstablished, true);
assert.equal(analysis.decision.productionMutationRemainsBlocked, true);
assert.equal(analysis.authorization.retry, false);
assert.equal(analysis.authorization.automaticPassingEvidenceReuse, false);
assert.equal(analysis.authorization.renderingRepair, false);
assert.equal(analysis.authorization.productionMutation, false);
assert.equal(
  analysis.nextAuthorizedAction,
  "user-decision-on-rendering-verification-remedy-v7-plan-preparation"
);

assert.equal(await exists(`${root}/evidence/debate-122`), false);
assert.equal(await exists(`${root}/rendering-audit.json`), false);

console.log(JSON.stringify({
  status: "remedy-v6-rendering-failure-audit-passed",
  attemptedViewportResults: execution.attemptedViewportResults,
  passingViewportEvidenceResults: execution.passingViewportEvidenceResults,
  validScreenshotsPreservedForAudit:
    execution.validScreenshotsPreservedForAudit,
  failedViewportResults: execution.failedViewportResults,
  unattemptedViewportResults: execution.unattemptedViewportResults,
  browserControllerNavigationFailure:
    execution.browserControllerNavigationFailureEstablished,
  modelContexts: execution.modelContexts,
  directCostUsd: execution.directCostUsd,
  productionMutationPerformed: execution.productionMutationPerformed
}, null, 2));
