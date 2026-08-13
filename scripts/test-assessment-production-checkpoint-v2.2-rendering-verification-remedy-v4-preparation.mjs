#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_RENDERING_REMEDY_V4_IMAGE_CONTRACT,
  CHECKPOINT_V22_RENDERING_REMEDY_V4_ORDER,
  CHECKPOINT_V22_RENDERING_REMEDY_V4_PROTOCOL_ID,
  CHECKPOINT_V22_RENDERING_REMEDY_V4_REQUIRED_BOOLEAN_CHECKS,
  CHECKPOINT_V22_RENDERING_REMEDY_V4_ROOT,
  CHECKPOINT_V22_RENDERING_REMEDY_V4_VIEWPORTS,
  validateCheckpointV22RenderingRemedyV4Packet
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v4.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const preparationPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V4_ROOT}/preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const preparationBytes = await readFile(path.resolve(preparationPath));
const preparation = JSON.parse(preparationBytes);

assertV4(
  preparation.schemaVersion ===
      "1.0-production-checkpoint-v2.2-rendering-remedy-v4-preparation" &&
    preparation.protocolId === CHECKPOINT_V22_RENDERING_REMEDY_V4_PROTOCOL_ID &&
    preparation.status ===
      "fourth-replacement-rendering-verification-plan-prepared-and-frozen" &&
    preparation.productionCanary === true &&
    preparation.stagingOnly === true &&
    preparation.model.label === "5.6 Sol" &&
    preparation.model.slug === "gpt-5.6-sol" &&
    preparation.model.reasoningEffort === "low" &&
    preparation.model.authentication === "ChatGPT subscription" &&
    preparation.model.participantJudgmentWasScoreBlind === true &&
    preparation.model.modelExecutionPlanned === false &&
    preparation.costEstimate.directCostUsd === 0 &&
    preparation.costEstimate.modelContexts === 0 &&
    canonicalJson(preparation.explicitOrder) ===
      canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V4_ORDER) &&
    canonicalJson(preparation.viewports) ===
      canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V4_VIEWPORTS) &&
    canonicalJson(preparation.requiredBooleanChecks) ===
      canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V4_REQUIRED_BOOLEAN_CHECKS) &&
    preparation.packets.length === 10 &&
    preparation.gateExpectations.debates === 10 &&
    preparation.gateExpectations.sections === 51 &&
    preparation.gateExpectations.moves === 188 &&
    preparation.gateExpectations.viewportResults === 20 &&
    preparation.gateExpectations.measuredCandidatePageLoads === 40 &&
    preparation.gateExpectations.diagnosticBootstrapLoads === 40 &&
    preparation.gateExpectations.totalBrowserPageLoads === 80 &&
    preparation.gateExpectations.screenshots === 40 &&
    preparation.gateExpectations.validPngScreenshots === 40 &&
    preparation.gateExpectations.nonblankScreenshots === 40 &&
    preparation.gateExpectations.dimensionMatchedScreenshots === 40 &&
    preparation.gateExpectations.collapsedOpenPairsWithDifferentHashes === 20 &&
    preparation.gateExpectations.rawAccordionStateObservations === 100 &&
    preparation.gateExpectations.exactViewportPhaseChecks === 60 &&
    preparation.gateExpectations.requiredBooleanChecksPerViewport === 38 &&
    preparation.gateExpectations.requiredBooleanChecks === 760 &&
    preparation.failurePolicy.retryPermitted === false &&
    preparation.failurePolicy.adaptiveThresholdsPermitted === false &&
    preparation.failurePolicy.adaptiveViewportCalibrationPermitted === false &&
    preparation.failurePolicy.adaptiveNavigationRegenerationPermitted === false &&
    preparation.failurePolicy.priorEvidenceReusePermitted === false &&
    preparation.failurePolicy.childClientRectCountCanNeverFailGate === true &&
    preparation.failurePolicy.productionMutationPermitted === false &&
    preparation.browserPlan.activationDerivedNavigationTokenRequired === true &&
    preparation.browserPlan.pointerAndKeyboardUseSeparateFreshTabs === true &&
    preparation.browserPlan.reloadPermitted === false &&
    preparation.browserPlan.accordionStateContract.stateAuthority ===
      "native-details-open-property" &&
    preparation.browserPlan.accordionStateContract.readinessMethod ===
      "single-CDP-Runtime.evaluate-after-frozen-post-load-settle" &&
    preparation.browserPlan.accordionStateContract.pointerMethod ===
      "CDP-Input.dispatchMouseEvent-at-serialized-summary-center" &&
    preparation.browserPlan.accordionStateContract.keyboardMethod ===
      "locator.press-after-direct-CDP-readiness-and-focus" &&
    preparation.browserPlan.screenshotContract.method ===
      "CDP-Page.captureScreenshot" &&
    canonicalJson(preparation.browserPlan.screenshotContract.imageContract) ===
      canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V4_IMAGE_CONTRACT) &&
    preparation.browserPlan.viewportContract
      .exactObservedInnerWidthAndHeightRequiredForEveryMeasuredPhase === true &&
    preparation.compatibilityBoundary.productionMutationBlocked === true &&
    preparation.authorization.remedyV4PlanPreparation === true &&
    preparation.authorization.syntheticBrowserPreflight === true &&
    preparation.authorization.candidateBrowserControl === false &&
    preparation.authorization.screenshotCapture === false &&
    preparation.authorization.executionActivation === false &&
    preparation.authorization.modelExecution === false &&
    preparation.nextAuthorizedAction ===
      "user-decision-on-rendering-verification-remedy-v4-execution-activation",
  "invalid frozen remedy-v4 preparation"
);

for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `source hash mismatch: ${file}`
  );
}
assertV4(
  sha256(await readFile(CHECKPOINT_V22_RENDERING_REMEDY_V4_IMAGE_CONTRACT.analyzerPath)) ===
    CHECKPOINT_V22_RENDERING_REMEDY_V4_IMAGE_CONTRACT.analyzerSha256,
  "frozen image analyzer changed"
);
for (const row of preparation.packets) {
  const bytes = await readFile(path.resolve(row.path));
  assertV4(
    sha256(bytes) === row.sha256 && bytes.length === row.bytes,
    `${row.debateNumber}: packet hash mismatch`
  );
  const packet = JSON.parse(bytes);
  validateCheckpointV22RenderingRemedyV4Packet(packet);
  assertV4(
    packet.provenance.assessmentModel === "5.6 Sol" &&
      packet.provenance.reasoningEffort === "low" &&
      packet.provenance.authentication === "ChatGPT subscription" &&
      packet.provenance.participantJudgmentWasScoreBlind === true &&
      packet.runnerPolicy.stateAuthority === "native-details-open-property" &&
      packet.runnerPolicy.readinessMethod ===
        "single-CDP-Runtime.evaluate-after-frozen-post-load-settle" &&
      packet.runnerPolicy.screenshotMethod === "CDP-Page.captureScreenshot" &&
      packet.runnerPolicy.retryPermitted === false &&
      packet.runnerPolicy.reloadPermitted === false,
    `${row.debateNumber}: frozen model or browser boundary changed`
  );
}

const diagnosis = JSON.parse(
  await readFile(path.resolve(preparation.inputs.screenshotTransportDiagnosis), "utf8")
);
const imageContract = JSON.parse(
  await readFile(path.resolve(preparation.inputs.imageAnalysisContract), "utf8")
);
const navigation = JSON.parse(
  await readFile(path.resolve(preparation.inputs.navigationContract), "utf8")
);
const viewportReplay = JSON.parse(
  await readFile(path.resolve(preparation.inputs.viewportCalibrationReplay), "utf8")
);
const preflight = JSON.parse(
  await readFile(path.resolve(preparation.inputs.syntheticPreflightResult), "utf8")
);
assertV4(
  diagnosis.status ===
      "direct-cdp-png-transport-selected-after-high-level-blank-capture-failure" &&
    diagnosis.remedyV4Transport.method === "CDP Page.captureScreenshot" &&
    diagnosis.screenshotsPreservedInRepository === 0 &&
    imageContract.status === "screenshot-content-validity-contract-frozen" &&
    imageContract.analyzer.sha256 ===
      CHECKPOINT_V22_RENDERING_REMEDY_V4_IMAGE_CONTRACT.analyzerSha256 &&
    navigation.requirements.reloadPermitted === false &&
    navigation.requirements.retryPermitted === false &&
    navigation.token.computedDuringActivation === true &&
    viewportReplay.adaptiveCalibrationDuringExecution === false &&
    preflight.status ===
      "passed-direct-png-capture-readiness-and-native-interaction-preflight" &&
    Object.values(preflight.viewports.desktop.checks).every(Boolean) &&
    Object.values(preflight.viewports.mobile.checks).every(Boolean) &&
    preflight.screenshotsPreservedInRepository === 0,
  "synthetic remedy-v4 evidence is not passing"
);

for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output already exists: ${future}`);
}
assertV4(!(await exists(preparation.artifacts.evidenceRoot)), "evidence root exists");

const replay = JSON.parse(execFileSync(
  process.execPath,
  [
    "scripts/prepare-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v4.mjs",
    "--frozen-at",
    preparation.frozenAt,
    "--checkpoint-commit",
    preparation.checkpointCommit
  ],
  { cwd: process.cwd(), encoding: "utf8", maxBuffer: 30 * 1024 * 1024 }
));
assertV4(
  canonicalJson(replay) === canonicalJson(preparation),
  "remedy-v4 preparation replay mismatch"
);

console.log(JSON.stringify({
  status: "remedy-v4-rendering-preparation-passed",
  protocolId: preparation.protocolId,
  debates: preparation.packets.length,
  viewportResults: preparation.gateExpectations.viewportResults,
  screenshots: preparation.gateExpectations.screenshots,
  requiredBooleanChecks: preparation.gateExpectations.requiredBooleanChecks,
  modelContexts: preparation.gateExpectations.modelContexts,
  directCostUsd: preparation.gateExpectations.directCostUsd
}, null, 2));
