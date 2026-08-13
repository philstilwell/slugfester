#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_RENDERING_REMEDY_V1_ORDER,
  CHECKPOINT_V22_RENDERING_REMEDY_V1_PORT,
  CHECKPOINT_V22_RENDERING_REMEDY_V1_REQUIRED_BOOLEAN_CHECKS,
  CHECKPOINT_V22_RENDERING_REMEDY_V1_ROOT,
  CHECKPOINT_V22_RENDERING_REMEDY_V1_VIEWPORTS,
  validateCheckpointV22RenderingRemedyV1Packet
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v1.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const readBytes = (file) => readFile(path.resolve(file));
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const manifest = await parse(
  `${CHECKPOINT_V22_RENDERING_REMEDY_V1_ROOT}/preparation-manifest.json`
);
const preflight = await parse(manifest.inputs.syntheticPreflightResult);
const controllerDiagnosis = await parse(manifest.inputs.controllerSelectionDiagnosis);

assert.equal(
  manifest.status,
  "replacement-rendering-verification-remedy-plan-prepared-and-frozen"
);
assert.deepEqual(manifest.explicitOrder, CHECKPOINT_V22_RENDERING_REMEDY_V1_ORDER);
assert.deepEqual(manifest.viewports, CHECKPOINT_V22_RENDERING_REMEDY_V1_VIEWPORTS);
assert.equal(manifest.packets.length, 10);
assert.equal(manifest.model.label, "5.6 Sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.equal(manifest.model.participantJudgmentWasScoreBlind, true);
assert.equal(manifest.model.modelExecutionPlanned, false);
assert.equal(manifest.costEstimate.directCostUsd, 0);
assert.equal(manifest.costEstimate.modelContexts, 0);

assert.equal(preflight.status, "passed-synthetic-browser-runner-preflight");
assert.equal(preflight.syntheticOnly, true);
assert.equal(preflight.canaryCandidateLoaded, false);
assert.equal(preflight.screenshotsCaptured, 0);
assert.equal(preflight.browser.name, "Google Chrome via ChatGPT browser extension");
assert.match(preflight.browser.userAgent, /Chrome\/151\./);
assert.equal(preflight.serviceWorkerRequestObserved, false);
assert.equal(preflight.productionMutationPerformed, false);
assert.ok(Object.values(preflight.checks).every(Boolean));
assert.ok(Object.values(preflight.runtime.counts).every((count) => count === 0));
assert.equal(
  controllerDiagnosis.status,
  "in-app-controller-rejected-chrome-controller-selected"
);
assert.equal(controllerDiagnosis.developmentDiagnosticOnly, true);
assert.equal(controllerDiagnosis.syntheticOnly, true);
assert.equal(controllerDiagnosis.canaryCandidateLoaded, false);
assert.equal(controllerDiagnosis.screenshotsCaptured, 0);
assert.equal(controllerDiagnosis.rejectedController.name, "Codex In-app Browser");
assert.equal(
  controllerDiagnosis.rejectedController.nativeKeyboardStateTransitionsPassed,
  false
);
assert.equal(
  controllerDiagnosis.selectedController.name,
  "Google Chrome via ChatGPT browser extension"
);
assert.equal(
  controllerDiagnosis.selectedController.nativeKeyboardStateTransitionsPassed,
  true
);

assert.equal(
  manifest.browserPlan.controller,
  "Google Chrome via ChatGPT browser extension"
);
assert.equal(manifest.browserPlan.browserFamily, "Chromium");
assert.equal(
  manifest.browserPlan.controllerSelection.rejectedBecauseNativeKeyboardStateTransitionsFailed,
  true
);
assert.equal(
  manifest.browserPlan.controllerSelection.selectedBecauseNativeKeyboardStateTransitionsPassed,
  true
);
assert.equal(manifest.browserPlan.localhostOnly, true);
assert.equal(manifest.browserPlan.localServer.port, CHECKPOINT_V22_RENDERING_REMEDY_V1_PORT);
assert.deepEqual(manifest.browserPlan.localServer.command, [
  "python3",
  "-m",
  "http.server",
  String(CHECKPOINT_V22_RENDERING_REMEDY_V1_PORT),
  "--bind",
  "127.0.0.1"
]);
assert.equal(manifest.browserPlan.loadSignal, "load");
assert.equal(manifest.browserPlan.elementWait, "attached-plus-positive-client-rects");
assert.equal(
  manifest.browserPlan.chromiumVersionMethod,
  "Runtime.evaluate:navigator.userAgent"
);
assert.equal(manifest.browserPlan.diagnosticSettleMilliseconds, 3000);
assert.deepEqual(manifest.browserPlan.failedRequestIgnoreList, []);
assert.equal(manifest.browserPlan.failedViewportEvidencePersistence, "none");
assert.equal(manifest.browserPlan.serialExecution, true);
assert.equal(manifest.browserPlan.freshPagePerViewport, true);
assert.equal(manifest.browserPlan.browserTabsOpenedDuringExecutionMustClose, true);
assert.equal(manifest.browserPlan.localServerMustStopAfterExecution, true);

assert.equal(manifest.gateExpectations.debates, 10);
assert.equal(manifest.gateExpectations.sections, 51);
assert.equal(manifest.gateExpectations.moves, 188);
assert.equal(manifest.gateExpectations.pageLoads, 20);
assert.equal(manifest.gateExpectations.viewportResults, 20);
assert.equal(manifest.gateExpectations.screenshots, 40);
assert.equal(manifest.gateExpectations.pointerInteractionTests, 20);
assert.equal(manifest.gateExpectations.keyboardEnterTests, 20);
assert.equal(manifest.gateExpectations.keyboardSpaceTests, 20);
assert.equal(manifest.gateExpectations.failedRequestMaximum, 0);
assert.equal(manifest.gateExpectations.horizontalOverflowMaximumPixels, 0);
assert.equal(manifest.gateExpectations.participantScoresChanged, false);
assert.equal(manifest.gateExpectations.modelContexts, 0);

assert.equal(manifest.failurePolicy.anySourceHashMismatchFailsEntireGate, true);
assert.equal(manifest.failurePolicy.anyPacketHashMismatchFailsEntireGate, true);
assert.equal(manifest.failurePolicy.anyPageLoadFailureFailsEntireGate, true);
assert.equal(manifest.failurePolicy.anyRequiredBooleanCheckFailureFailsEntireGate, true);
assert.equal(manifest.failurePolicy.anyNonzeroRuntimeCountFailsEntireGate, true);
assert.equal(manifest.failurePolicy.anyHorizontalOverflowFailsEntireGate, true);
assert.equal(manifest.failurePolicy.anyMissingOrHashInvalidScreenshotFailsEntireGate, true);
assert.equal(manifest.failurePolicy.automaticStyleRepairPermitted, false);
assert.equal(manifest.failurePolicy.automaticApplicationRepairPermitted, false);
assert.equal(manifest.failurePolicy.retryPermitted, false);
assert.equal(manifest.failurePolicy.priorEvidenceReusePermitted, false);
assert.equal(manifest.failurePolicy.failedViewportArtifactsMustBeRemoved, true);
assert.equal(manifest.failurePolicy.partialPassPromotionPermitted, false);
assert.equal(manifest.failurePolicy.productionMutationPermitted, false);

assert.equal(manifest.compatibilityBoundary.productionMutationBlocked, true);
assert.equal(manifest.authorization.replacementRenderingVerificationActivation, false);
assert.equal(manifest.authorization.browserControl, false);
assert.equal(manifest.authorization.screenshotCapture, false);
assert.equal(manifest.authorization.replacementRenderingVerification, false);
assert.equal(manifest.authorization.renderingRepair, false);
assert.equal(manifest.authorization.validatorMigration, false);
assert.equal(manifest.authorization.productionLedgerPublication, false);
assert.equal(manifest.authorization.productionMutation, false);
assert.equal(
  manifest.nextAuthorizedAction,
  "user-decision-on-replacement-rendering-verification-execution-activation"
);

let sections = 0;
let moves = 0;
let plannedEvidenceArtifacts = 0;
for (const item of manifest.packets) {
  const packetBytes = await readBytes(item.path);
  assert.equal(sha256(packetBytes), item.sha256);
  assert.equal(packetBytes.length, item.bytes);
  const packet = JSON.parse(packetBytes);
  validateCheckpointV22RenderingRemedyV1Packet(packet);
  assert.equal(packet.debateNumber, item.debateNumber);
  assert.equal(packet.debateId, item.debateId);
  assert.deepEqual(
    packet.requiredBooleanChecks,
    CHECKPOINT_V22_RENDERING_REMEDY_V1_REQUIRED_BOOLEAN_CHECKS
  );
  assert.equal(sha256(await readBytes(packet.candidate.path)), packet.candidate.sha256);
  assert.equal(sha256(await readBytes(packet.provenance.path)), packet.provenance.sha256);
  assert.equal(sha256(await readBytes(packet.preview.path)), packet.preview.sha256);
  assert.equal(sha256(await readBytes(packet.supersedes.packet)), packet.supersedes.packetSha256);
  assert.equal(packet.supersedes.priorEvidenceReusePermitted, false);
  sections += packet.candidate.sections;
  moves += packet.candidate.moves;
  plannedEvidenceArtifacts += Object.values(packet.viewports).reduce(
    (sum, viewport) => sum + Object.keys(viewport.evidence).length,
    0
  );
}
assert.equal(sections, 51);
assert.equal(moves, 188);
assert.equal(plannedEvidenceArtifacts, 60);
assert.equal(manifest.artifacts.evidence.length, 60);

for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(sha256(await readBytes(file)), digest, `source hash mismatch: ${file}`);
}
for (const file of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(await exists(file), false, `future output unexpectedly exists: ${file}`);
}

console.log(JSON.stringify({
  status: "passed",
  planFrozen: true,
  syntheticPreflightPassed: true,
  canaryCandidatesLoadedDuringPreflight: 0,
  preflightScreenshots: 0,
  debates: 10,
  sections,
  moves,
  viewportResultsPlanned: 20,
  screenshotsPlanned: 40,
  evidenceArtifactsPlanned: plannedEvidenceArtifacts,
  modelContexts: 0,
  directCostUsd: 0,
  replacementRenderingExecuted: false,
  renderingRepair: false,
  productionMutation: false
}, null, 2));
