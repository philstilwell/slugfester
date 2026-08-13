#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_RENDERING_REMEDY_V8_IMAGE_CONTRACT,
  CHECKPOINT_V22_RENDERING_REMEDY_V8_ORDER,
  CHECKPOINT_V22_RENDERING_REMEDY_V8_PROTOCOL_ID,
  CHECKPOINT_V22_RENDERING_REMEDY_V8_ROOT,
  CHECKPOINT_V22_RENDERING_REMEDY_V8_VIEWPORTS,
  validateCheckpointV22RenderingRemedyV8Packet
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v8.mjs";
import { canonicalJson } from "./lib/v4-lean-production.mjs";

const preparationPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V8_ROOT}/preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const preparation = JSON.parse(await readFile(path.resolve(preparationPath), "utf8"));

assert.equal(preparation.protocolId, CHECKPOINT_V22_RENDERING_REMEDY_V8_PROTOCOL_ID);
assert.equal(
  preparation.status,
  "eighth-replacement-rendering-verification-plan-prepared-and-frozen"
);
assert.deepEqual(preparation.explicitOrder, [...CHECKPOINT_V22_RENDERING_REMEDY_V8_ORDER]);
assert.equal(preparation.packets.length, 10);
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.slug, "gpt-5.6-sol");
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");
assert.equal(preparation.model.participantJudgmentWasScoreBlind, true);
assert.equal(preparation.model.roundedIntegerScoreTiesPermitted, true);
assert.equal(preparation.model.modelExecutionPlanned, false);
assert.equal(
  canonicalJson(preparation.viewports),
  canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V8_VIEWPORTS)
);
assert.equal(preparation.browserPlan.pointerSurface, "Codex In-app Chromium browser");
assert.equal(
  preparation.browserPlan.keyboardSurface,
  "Google Chrome via ChatGPT browser extension"
);
assert.equal(preparation.browserPlan.bothSurfacesMustReportSameChromeMajorVersion, true);
assert.equal(preparation.browserPlan.freshPointerAndKeyboardTabsPerViewport, true);
assert.equal(preparation.browserPlan.pointerAndKeyboardUseSeparateChromiumSurfaces, true);
assert.equal(preparation.browserPlan.reloadPermitted, false);
assert.equal(
  preparation.browserPlan.screenshotContract.pixelContract,
  "rounded-pointer-css-viewport-times-device-pixel-ratio"
);
assert.equal(
  preparation.browserPlan.screenshotContract
    .pointerControllerInputNeedNotEqualPhysicalScreenshotPixels,
  true
);
assert.deepEqual(
  preparation.browserPlan.screenshotContract.imageContract,
  CHECKPOINT_V22_RENDERING_REMEDY_V8_IMAGE_CONTRACT
);
assert.equal(preparation.gateExpectations.debates, 10);
assert.equal(preparation.gateExpectations.sections, 51);
assert.equal(preparation.gateExpectations.moves, 188);
assert.equal(preparation.gateExpectations.viewportResults, 20);
assert.equal(preparation.gateExpectations.totalBrowserPageLoads, 80);
assert.equal(preparation.gateExpectations.screenshots, 40);
assert.equal(preparation.gateExpectations.requiredBooleanChecks, 760);
assert.equal(preparation.gateExpectations.modelContexts, 0);
assert.equal(preparation.gateExpectations.directCostUsd, 0);
assert.equal(preparation.failurePolicy.retryPermitted, false);
assert.equal(preparation.failurePolicy.timeoutExtensionPermitted, false);
assert.equal(preparation.failurePolicy.adaptiveViewportCalibrationPermitted, false);
assert.equal(preparation.failurePolicy.adaptiveTransportSwitchPermitted, false);
assert.equal(preparation.failurePolicy.priorEvidenceReusePermitted, false);
assert.equal(preparation.failurePolicy.partialPassPromotionPermitted, false);
assert.equal(preparation.failurePolicy.productionMutationPermitted, false);
assert.equal(preparation.authorization.remedyV8PlanPreparation, true);
assert.equal(preparation.authorization.syntheticBrowserPreflight, true);
assert.equal(preparation.authorization.candidateBrowserControl, false);
assert.equal(preparation.authorization.screenshotCapture, false);
assert.equal(preparation.authorization.executionActivation, false);
assert.equal(preparation.authorization.modelExecution, false);
assert.equal(preparation.authorization.productionMutation, false);
assert.equal(
  preparation.nextAuthorizedAction,
  "user-decision-on-rendering-verification-remedy-v8-execution-activation"
);

for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(path.resolve(file))), digest, file);
}
assert.equal(
  sha256(await readFile(CHECKPOINT_V22_RENDERING_REMEDY_V8_IMAGE_CONTRACT.analyzerPath)),
  CHECKPOINT_V22_RENDERING_REMEDY_V8_IMAGE_CONTRACT.analyzerSha256
);
for (const row of preparation.packets) {
  const bytes = await readFile(path.resolve(row.path));
  assert.equal(sha256(bytes), row.sha256, row.path);
  assert.equal(bytes.length, row.bytes, row.path);
  const packet = validateCheckpointV22RenderingRemedyV8Packet(JSON.parse(bytes));
  assert.equal(packet.debateNumber, row.debateNumber);
  assert.equal(packet.provenance.assessmentModel, "5.6 Sol");
  assert.equal(packet.provenance.reasoningEffort, "low");
  assert.equal(packet.provenance.authentication, "ChatGPT subscription");
  assert.equal(packet.provenance.participantJudgmentWasScoreBlind, true);
  assert.equal(packet.runnerPolicy.retryPermitted, false);
  assert.equal(packet.runnerPolicy.timeoutExtensionPermitted, false);
  assert.equal(packet.runnerPolicy.adaptiveTransportSwitchPermitted, false);
  assert.equal(packet.supersedes.priorEvidenceReusePermitted, false);
}

const contract = JSON.parse(
  await readFile(path.resolve(preparation.inputs.hybridBrowserContract), "utf8")
);
const preflight = JSON.parse(
  await readFile(path.resolve(preparation.inputs.syntheticPreflightResult), "utf8")
);
assert.equal(contract.status, "split-chromium-rendering-and-keyboard-transport-selected");
assert.equal(contract.syntheticOnly, true);
assert.equal(contract.canaryCandidateLoaded, false);
assert.equal(contract.requirements.retryPermitted, false);
assert.equal(contract.requirements.timeoutExtensionPermitted, false);
assert.equal(contract.requirements.priorPassingEvidenceReusePermitted, false);
assert.equal(
  preflight.status,
  "passed-twenty-viewport-split-chromium-synthetic-rehearsal"
);
assert.equal(preflight.gate.viewportResults, 20);
assert.equal(preflight.gate.passingViewportResults, 20);
assert.equal(preflight.gate.requiredBooleanChecksPassed, 320);
assert.equal(preflight.gate.screenshots, 40);
assert.equal(preflight.gate.validJpegSignatures, 40);
assert.ok(Object.values(preflight.gate.runtimeCounts).every((value) => value === 0));
assert.equal(preflight.executionDiscipline.retryPerformed, false);
assert.equal(preflight.executionDiscipline.timeoutExtended, false);
assert.equal(preflight.executionDiscipline.candidatePagesLoaded, 0);
assert.equal(preflight.executionDiscipline.modelContexts, 0);
assert.equal(preflight.executionDiscipline.directCostUsd, 0);
assert.equal(preflight.screenshotsPreservedInRepository, 0);

for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(await exists(future), false, future);
}
assert.equal(await exists(preparation.artifacts.evidenceRoot), false);

const replay = JSON.parse(execFileSync(
  process.execPath,
  [
    "scripts/prepare-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v8.mjs",
    "--frozen-at",
    preparation.frozenAt,
    "--checkpoint-commit",
    preparation.checkpointCommit
  ],
  { cwd: process.cwd(), encoding: "utf8", maxBuffer: 40 * 1024 * 1024 }
));
assert.equal(canonicalJson(replay), canonicalJson(preparation));

console.log(JSON.stringify({
  status: "remedy-v8-rendering-preparation-passed",
  protocolId: preparation.protocolId,
  debates: preparation.packets.length,
  viewportResults: preparation.gateExpectations.viewportResults,
  screenshots: preparation.gateExpectations.screenshots,
  requiredBooleanChecks: preparation.gateExpectations.requiredBooleanChecks,
  modelContexts: preparation.gateExpectations.modelContexts,
  directCostUsd: preparation.gateExpectations.directCostUsd
}, null, 2));
