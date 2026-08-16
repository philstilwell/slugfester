#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_01_RENDERING_IMAGE_CONTRACT,
  POST_CANARY_BATCH_01_RENDERING_ORDER,
  POST_CANARY_BATCH_01_RENDERING_PORT,
  POST_CANARY_BATCH_01_RENDERING_PROTOCOL_ID,
  POST_CANARY_BATCH_01_RENDERING_REQUIRED_BOOLEAN_CHECKS,
  POST_CANARY_BATCH_01_RENDERING_ROOT,
  POST_CANARY_BATCH_01_RENDERING_VIEWPORTS,
  validatePostCanaryBatch01RenderingPacket
} from "./lib/assessment-production-post-canary-batch-01-rendering-verification.mjs";
import { canonicalJson } from "./lib/v4-lean-production.mjs";

const PREPARATION = `${POST_CANARY_BATCH_01_RENDERING_ROOT}/preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(
    () => true,
    () => false
  );
const preparation = JSON.parse(await readFile(path.resolve(PREPARATION), "utf8"));

assert.equal(preparation.protocolId, POST_CANARY_BATCH_01_RENDERING_PROTOCOL_ID);
assert.equal(
  preparation.status,
  "frozen-post-canary-batch-01-rendering-verification-prepared-not-authorized"
);
assert.equal(preparation.productionCanary, false);
assert.equal(preparation.batchNumber, 1);
assert.equal(preparation.stagingOnly, true);
assert.deepEqual(preparation.explicitOrder, [...POST_CANARY_BATCH_01_RENDERING_ORDER]);
assert.equal(preparation.packets.length, 10);
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.slug, "gpt-5.6-sol");
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");
assert.equal(preparation.model.independentModelPassesWereIsolated, true);
assert.equal(preparation.model.participantJudgmentWasScoreBlind, true);
assert.equal(preparation.model.integerRoundedScoreTiesPermitted, true);
assert.equal(preparation.model.modelContextsPlannedThisStage, 0);
assert.equal(preparation.model.modelExecutionPlanned, false);
assert.equal(preparation.preservedControls.debate91IntegerRoundedTiePreserved, true);
assert.equal(preparation.preservedControls.scoresChanged, false);
assert.equal(preparation.preservedControls.publicationFieldsChanged, false);
assert.equal(
  canonicalJson(preparation.viewports),
  canonicalJson(POST_CANARY_BATCH_01_RENDERING_VIEWPORTS)
);
assert.equal(
  canonicalJson(preparation.requiredBooleanChecks),
  canonicalJson(POST_CANARY_BATCH_01_RENDERING_REQUIRED_BOOLEAN_CHECKS)
);
assert.equal(preparation.requiredBooleanChecks.length, 38);
assert.equal(
  preparation.browserPlan.controller,
  "split-Chromium-fresh-keyboard-location-assign-transport"
);
assert.equal(preparation.browserPlan.pointerSurface, "Codex In-app Chromium browser");
assert.equal(
  preparation.browserPlan.keyboardSurface,
  "Google Chrome via ChatGPT browser extension"
);
assert.equal(preparation.browserPlan.localServer.port, POST_CANARY_BATCH_01_RENDERING_PORT);
assert.deepEqual(preparation.browserPlan.viewportOrder, ["desktop", "mobile"]);
assert.equal(preparation.browserPlan.oneViewportPerBrowserControlCall, true);
assert.equal(preparation.browserPlan.keyboardNavigation.freshTabPerViewport, true);
assert.equal(
  preparation.browserPlan.keyboardNavigation.deadlineMilliseconds,
  15000
);
assert.equal(preparation.browserPlan.keyboardNavigation.retryPermitted, false);
assert.equal(
  preparation.browserPlan.keyboardNavigation.timeoutExtensionPermitted,
  false
);
assert.equal(preparation.browserPlan.priorCandidateEvidenceReusePermitted, false);
assert.equal(preparation.gateExpectations.debates, 10);
assert.equal(preparation.gateExpectations.sections, 50);
assert.equal(preparation.gateExpectations.moves, 177);
assert.equal(preparation.gateExpectations.viewportResults, 20);
assert.equal(preparation.gateExpectations.desktopViewportResults, 10);
assert.equal(preparation.gateExpectations.mobileViewportResults, 10);
assert.equal(preparation.gateExpectations.browserDocumentLoads, 80);
assert.equal(preparation.gateExpectations.screenshots, 40);
assert.equal(preparation.gateExpectations.requiredBooleanChecksPerViewport, 38);
assert.equal(preparation.gateExpectations.requiredBooleanChecks, 760);
assert.equal(preparation.gateExpectations.rawAccordionStateObservations, 100);
assert.equal(preparation.gateExpectations.exactViewportPhaseChecks, 60);
assert.equal(preparation.gateExpectations.consoleErrors, 0);
assert.equal(preparation.gateExpectations.consoleWarnings, 0);
assert.equal(preparation.gateExpectations.pageErrors, 0);
assert.equal(preparation.gateExpectations.failedRequests, 0);
assert.equal(preparation.gateExpectations.horizontalOverflowFailures, 0);
assert.equal(preparation.gateExpectations.modelContexts, 0);
assert.equal(preparation.gateExpectations.paidServiceCalls, 0);
assert.equal(preparation.gateExpectations.directCostUsd, 0);
assert.equal(preparation.failurePolicy.oneAttemptPerViewport, true);
assert.equal(preparation.failurePolicy.retryPermitted, false);
assert.equal(preparation.failurePolicy.timeoutExtensionPermitted, false);
assert.equal(preparation.failurePolicy.adaptiveViewportCalibrationPermitted, false);
assert.equal(preparation.failurePolicy.adaptiveTransportSwitchPermitted, false);
assert.equal(
  preparation.failurePolicy.adaptiveNavigationRegenerationPermitted,
  false
);
assert.equal(preparation.failurePolicy.priorEvidenceReusePermitted, false);
assert.equal(preparation.failurePolicy.partialPassPromotionPermitted, false);
assert.equal(preparation.failurePolicy.renderingRepairPermitted, false);
assert.equal(preparation.failurePolicy.modelExecutionPermitted, false);
assert.equal(preparation.failurePolicy.paidServicesPermitted, false);
assert.equal(preparation.failurePolicy.productionMutationPermitted, false);
assert.equal(preparation.authorization.renderingVerificationPreparation, true);
assert.equal(preparation.authorization.browserPreflight, false);
assert.equal(preparation.authorization.executionActivation, false);
assert.equal(preparation.authorization.candidateBrowserControl, false);
assert.equal(preparation.authorization.screenshotCapture, false);
assert.equal(preparation.authorization.renderingVerification, false);
assert.equal(preparation.authorization.modelExecution, false);
assert.equal(preparation.authorization.paidServices, false);
assert.equal(preparation.authorization.productionMutation, false);
assert.equal(
  preparation.nextAuthorizedAction,
  "user-approval-required-before-batch-01-rendering-verification-execution-activation"
);

for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(path.resolve(file))), digest, file);
}
for (const [file, digest] of Object.entries(preparation.toolHashes)) {
  assert.equal(sha256(await readFile(path.resolve(file))), digest, file);
}
assert.equal(
  preparation.toolHashes[POST_CANARY_BATCH_01_RENDERING_IMAGE_CONTRACT.analyzerPath],
  POST_CANARY_BATCH_01_RENDERING_IMAGE_CONTRACT.analyzerSha256
);

let sectionTotal = 0;
let moveTotal = 0;
for (const row of preparation.packets) {
  const bytes = await readFile(path.resolve(row.path));
  assert.equal(sha256(bytes), row.sha256, row.path);
  assert.equal(bytes.length, row.bytes, row.path);
  const packet = validatePostCanaryBatch01RenderingPacket(JSON.parse(bytes));
  assert.equal(packet.debateNumber, row.debateNumber);
  assert.equal(packet.candidate.path, row.candidate.path);
  assert.equal(packet.candidate.sha256, row.candidate.sha256);
  assert.equal(
    sha256(await readFile(path.resolve(packet.candidate.path))),
    packet.candidate.sha256
  );
  assert.equal(
    sha256(await readFile(path.resolve(packet.provenance.path))),
    packet.provenance.sha256
  );
  assert.equal(
    sha256(await readFile(path.resolve(packet.preview.path))),
    packet.preview.sha256
  );
  assert.equal(packet.preview.url.includes(`127.0.0.1:${POST_CANARY_BATCH_01_RENDERING_PORT}`), true);
  assert.equal(packet.transportProvenance.historicalCandidateEvidenceReused, false);
  assert.equal(packet.transportProvenance.priorCandidateEvidenceReusePermitted, false);
  assert.equal(packet.runnerPolicy.retryPermitted, false);
  assert.equal(packet.runnerPolicy.timeoutExtensionPermitted, false);
  sectionTotal += packet.candidate.sections;
  moveTotal += packet.candidate.moves;
}
assert.equal(sectionTotal, 50);
assert.equal(moveTotal, 177);

const previewHtml = await readFile(path.resolve(preparation.inputs.localPreview), "utf8");
assert.match(previewHtml, /validated post-canary Batch 1 candidate only/);
assert.match(previewHtml, /<meta name="robots" content="noindex,nofollow">/);
const activePolicy = JSON.parse(
  await readFile(
    path.resolve("docs/assessment-production/score-stability-policy-v2.2-promotion.json"),
    "utf8"
  )
);
assert.equal(activePolicy.status, "active-production-score-stability-policy-v2.2");

for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(await exists(future), false, future);
}
assert.equal(await exists(preparation.artifacts.evidenceRoot), false);
assert.equal(preparation.totals.candidatePagesLoaded, 0);
assert.equal(preparation.totals.screenshotsCaptured, 0);
assert.equal(preparation.totals.viewportResults, 0);
assert.equal(preparation.totals.modelContexts, 0);
assert.equal(preparation.totals.paidServiceCalls, 0);
assert.equal(preparation.totals.productionMutations, 0);
assert.equal(preparation.totals.directIncrementalCostUsd, 0);

console.log(
  JSON.stringify(
    {
      status: "post-canary-batch-01-rendering-preparation-passed",
      protocolId: preparation.protocolId,
      debates: preparation.packets.length,
      sections: sectionTotal,
      moves: moveTotal,
      viewportResultsPrepared: preparation.gateExpectations.viewportResults,
      screenshotsCaptured: 0,
      requiredBooleanChecksPrepared:
        preparation.gateExpectations.requiredBooleanChecks,
      modelContexts: 0,
      paidServiceCalls: 0,
      directCostUsd: 0,
      productionMutationPerformed: false
    },
    null,
    2
  )
);
