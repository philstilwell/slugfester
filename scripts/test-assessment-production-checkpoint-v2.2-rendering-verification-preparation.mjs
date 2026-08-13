#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_RENDERING_REQUIRED_BOOLEAN_CHECKS,
  CHECKPOINT_V22_RENDERING_VERIFICATION_ORDER,
  CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT,
  CHECKPOINT_V22_RENDERING_VERIFICATION_VIEWPORTS,
  validateCheckpointV22RenderingVerificationPacket
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const manifest = await parse(
  `${CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT}/preparation-manifest.json`
);

assert.equal(manifest.status, "rendering-verification-plan-prepared-and-frozen");
assert.deepEqual(manifest.explicitOrder, CHECKPOINT_V22_RENDERING_VERIFICATION_ORDER);
assert.deepEqual(manifest.viewports, CHECKPOINT_V22_RENDERING_VERIFICATION_VIEWPORTS);
assert.equal(manifest.packets.length, 10);
assert.equal(manifest.model.label, "5.6 Sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.equal(manifest.model.participantJudgmentWasScoreBlind, true);
assert.equal(manifest.model.modelExecutionPlanned, false);
assert.equal(manifest.costEstimate.directCostUsd, 0);
assert.equal(manifest.costEstimate.modelContexts, 0);
assert.deepEqual(manifest.costEstimate.expectedExecutionWallMinutes, [10, 25]);

assert.equal(manifest.browserPlan.controller, "Codex in-app Browser");
assert.equal(manifest.browserPlan.browserFamily, "Chromium");
assert.equal(manifest.browserPlan.localhostOnly, true);
assert.deepEqual(manifest.browserPlan.localServer.command, [
  "python3",
  "-m",
  "http.server",
  "4174",
  "--bind",
  "127.0.0.1"
]);
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
assert.equal(manifest.gateExpectations.consoleErrorMaximum, 0);
assert.equal(manifest.gateExpectations.consoleWarningMaximum, 0);
assert.equal(manifest.gateExpectations.pageErrorMaximum, 0);
assert.equal(manifest.gateExpectations.failedRequestMaximum, 0);
assert.equal(manifest.gateExpectations.horizontalOverflowMaximumPixels, 0);
assert.equal(manifest.gateExpectations.displayFieldsChanged, 0);
assert.equal(manifest.gateExpectations.participantScoresChanged, false);

assert.equal(manifest.failurePolicy.anyRequiredBooleanCheckFailureFailsEntireGate, true);
assert.equal(manifest.failurePolicy.anyNonzeroRuntimeCountFailsEntireGate, true);
assert.equal(manifest.failurePolicy.anyHorizontalOverflowFailsEntireGate, true);
assert.equal(manifest.failurePolicy.anyMissingOrHashInvalidScreenshotFailsEntireGate, true);
assert.equal(manifest.failurePolicy.renderingDefectStopsForDiagnosisOnly, true);
assert.equal(manifest.failurePolicy.automaticStyleRepairPermitted, false);
assert.equal(manifest.failurePolicy.automaticApplicationRepairPermitted, false);
assert.equal(manifest.failurePolicy.retryPermitted, false);
assert.equal(manifest.failurePolicy.partialPassPromotionPermitted, false);
assert.equal(manifest.failurePolicy.productionMutationPermitted, false);

assert.equal(manifest.compatibilityBoundary.renderingVerificationBlocked, false);
assert.equal(manifest.compatibilityBoundary.productionMutationBlocked, true);
assert.deepEqual(manifest.compatibilityBoundary.blockers, [
  "optional-overall-reference-links",
  "checkpoint-ledger-schema-adapter"
]);
assert.equal(manifest.authorization.renderingVerificationExecutionActivation, false);
assert.equal(manifest.authorization.browserControl, false);
assert.equal(manifest.authorization.screenshotCapture, false);
assert.equal(manifest.authorization.renderingVerification, false);
assert.equal(manifest.authorization.renderingRepair, false);
assert.equal(manifest.authorization.validatorMigration, false);
assert.equal(manifest.authorization.productionLedgerPublication, false);
assert.equal(manifest.authorization.productionMutation, false);
assert.equal(
  manifest.nextAuthorizedAction,
  "user-decision-on-rendering-verification-execution-activation"
);

let sections = 0;
let moves = 0;
let plannedEvidenceArtifacts = 0;
for (const item of manifest.packets) {
  const packetBytes = await readFile(path.resolve(item.path));
  assert.equal(sha256(packetBytes), item.sha256);
  assert.equal(packetBytes.length, item.bytes);
  const packet = JSON.parse(packetBytes);
  validateCheckpointV22RenderingVerificationPacket(packet);
  assert.equal(packet.debateNumber, item.debateNumber);
  assert.equal(packet.debateId, item.debateId);
  assert.deepEqual(
    packet.requiredBooleanChecks,
    CHECKPOINT_V22_RENDERING_REQUIRED_BOOLEAN_CHECKS
  );
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
  assert.equal(
    sha256(await readFile(path.resolve(file))),
    digest,
    `source hash mismatch: ${file}`
  );
}
for (const file of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(await exists(file), false, `future output unexpectedly exists: ${file}`);
}

const appSource = await readFile(path.resolve("src/app.js"), "utf8");
const styles = await readFile(path.resolve("src/styles.css"), "utf8");
assert.match(appSource, /export function renderPublicationStagingDebate\(/);
assert.match(appSource, /Publication staging preview:/);
assert.match(appSource, /<section class="overall"/);
assert.match(appSource, /<section class="logical-extension"/);
assert.match(appSource, /<details class="ai-extension-accordion">/);
assert.match(styles, /\.source-note\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/);
assert.match(styles, /\.logical-extension\s*\{[\s\S]*?background:/);
assert.match(styles, /\.ai-extension-accordion summary:focus-visible/);

console.log(JSON.stringify({
  status: "passed",
  planFrozen: true,
  debates: 10,
  sections,
  moves,
  viewportResultsPlanned: 20,
  screenshotsPlanned: 40,
  evidenceArtifactsPlanned: plannedEvidenceArtifacts,
  modelContexts: 0,
  directCostUsd: 0,
  renderingExecuted: false,
  renderingRepair: false,
  productionMutation: false
}, null, 2));
