#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_RENDERING_REMEDY_V8_IMAGE_CONTRACT,
  CHECKPOINT_V22_RENDERING_REMEDY_V8_MODEL,
  CHECKPOINT_V22_RENDERING_REMEDY_V8_ORDER,
  CHECKPOINT_V22_RENDERING_REMEDY_V8_PORT,
  CHECKPOINT_V22_RENDERING_REMEDY_V8_PROTOCOL_ID,
  CHECKPOINT_V22_RENDERING_REMEDY_V8_REQUIRED_BOOLEAN_CHECKS,
  CHECKPOINT_V22_RENDERING_REMEDY_V8_ROOT,
  CHECKPOINT_V22_RENDERING_REMEDY_V8_VIEWPORTS,
  buildCheckpointV22RenderingRemedyV8Packet
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v8.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const checkpointIndex = process.argv.indexOf("--checkpoint-commit");
const preparationPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V8_ROOT}/preparation-manifest.json`;
const existingPreparation = await access(path.resolve(preparationPath))
  .then(() => readFile(path.resolve(preparationPath), "utf8").then(JSON.parse))
  .catch(() => null);
const frozenAt = frozenAtIndex >= 0
  ? process.argv[frozenAtIndex + 1]
  : existingPreparation?.frozenAt ?? new Date().toISOString();
const checkpointCommit = checkpointIndex >= 0
  ? process.argv[checkpointIndex + 1]
  : existingPreparation?.checkpointCommit ??
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
assertV4(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be ISO time");
assertV4(/^[a-f0-9]{40}$/.test(checkpointCommit), "invalid checkpoint commit");

const priorRoot =
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v6";
const priorPreparationPath = `${priorRoot}/preparation-manifest.json`;
const priorActivationPath = `${priorRoot}/execution-activation.json`;
const priorExecutionPath = `${priorRoot}/execution.json`;
const priorAnalysisPath = `${priorRoot}/analysis.json`;
const failedV7PreparationPath =
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v7/preparation-analysis.json";
const hybridContractPath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V8_ROOT}/synthetic/hybrid-browser-contract.json`;
const syntheticPreflightPath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V8_ROOT}/synthetic/preflight-result.json`;
const packetsRoot = `${CHECKPOINT_V22_RENDERING_REMEDY_V8_ROOT}/packets`;
const activationPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V8_ROOT}/execution-activation.json`;
const executionPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V8_ROOT}/execution.json`;
const analysisPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V8_ROOT}/analysis.json`;
const renderingAuditPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V8_ROOT}/rendering-audit.json`;
const evidenceRoot = `${CHECKPOINT_V22_RENDERING_REMEDY_V8_ROOT}/evidence`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

if (shouldWrite) {
  assertV4(
    !(await exists(preparationPath)) && !(await exists(packetsRoot)),
    "remedy-v8 preparation already exists; freeze is immutable"
  );
}

const directInputPaths = [
  priorPreparationPath,
  priorActivationPath,
  priorExecutionPath,
  priorAnalysisPath,
  failedV7PreparationPath,
  "scripts/test-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v6-failure.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v7-preparation-failure.mjs",
  `${priorRoot}/synthetic/preflight.html`,
  `${priorRoot}/synthetic/image-analysis-contract.json`,
  hybridContractPath,
  syntheticPreflightPath,
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v8.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-synthetic-preflight-v8.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-browser-runner-v8.mjs",
  "scripts/prepare-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v8.mjs",
  "scripts/preregister-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v8.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v8-preparation.mjs",
  "scripts/validate-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v8-evidence.mjs"
];
const directBytes = Object.fromEntries(await Promise.all(
  directInputPaths.map(async (file) => [file, await readFile(path.resolve(file))])
));
const priorPreparation = JSON.parse(directBytes[priorPreparationPath]);
const priorActivation = JSON.parse(directBytes[priorActivationPath]);
const priorExecution = JSON.parse(directBytes[priorExecutionPath]);
const priorAnalysis = JSON.parse(directBytes[priorAnalysisPath]);
const failedV7 = JSON.parse(directBytes[failedV7PreparationPath]);
const hybridContract = JSON.parse(directBytes[hybridContractPath]);
const syntheticPreflight = JSON.parse(directBytes[syntheticPreflightPath]);

assertV4(
  priorPreparation.status ===
      "sixth-replacement-rendering-verification-plan-prepared-and-frozen" &&
    priorActivation.status ===
      "sixth-replacement-rendering-verification-execution-authorized-and-frozen" &&
    priorExecution.status ===
      "sixth-replacement-rendering-verification-failed-closed-after-eighteen-passing-viewports-on-debate-122-desktop-page-navigate-deadline" &&
    priorExecution.passingViewportEvidenceResults === 18 &&
    priorExecution.validScreenshotsPreservedForAudit === 36 &&
    priorExecution.browserControllerNavigationFailureEstablished === true &&
    priorExecution.candidateRenderingDefectEstablished === false &&
    priorExecution.viewportRetries === 0 &&
    priorExecution.timeoutExtensions === 0 &&
    priorExecution.modelContexts === 0 &&
    priorExecution.directCostUsd === 0 &&
    priorExecution.productionMutationPerformed === false &&
    priorAnalysis.decision.failedClosed === true &&
    priorAnalysis.decision.renderingGatePassed === false &&
    priorAnalysis.decision.candidateRenderingDefectEstablished === false &&
    priorAnalysis.nextAuthorizedAction ===
      "user-decision-on-rendering-verification-remedy-v7-plan-preparation",
  "failed remedy-v6 audit required"
);
assertV4(
  failedV7.status ===
      "seventh-replacement-rendering-verification-plan-not-frozen-after-synthetic-browser-control-deadline" &&
    failedV7.decision.failedClosed === true &&
    failedV7.decision.v7PlanFrozen === false &&
    failedV7.decision.v7PacketsCreated === 0 &&
    failedV7.scope.productionCandidatePagesLoaded === 0 &&
    failedV7.scope.judgmentModelsExecuted === 0 &&
    failedV7.scope.directCostUsd === 0 &&
    failedV7.nextAuthorizedAction ===
      "user-decision-on-rendering-verification-remedy-v8-plan-preparation",
  "failed remedy-v7 preparation audit required"
);
assertV4(
  hybridContract.status ===
      "split-chromium-rendering-and-keyboard-transport-selected" &&
    hybridContract.syntheticOnly === true &&
    hybridContract.canaryCandidateLoaded === false &&
    hybridContract.requirements.retryPermitted === false &&
    hybridContract.requirements.timeoutExtensionPermitted === false &&
    hybridContract.requirements.priorPassingEvidenceReusePermitted === false &&
    hybridContract.screenshotsPreservedInRepository === 0 &&
    hybridContract.productionMutationPerformed === false &&
    syntheticPreflight.status ===
      "passed-twenty-viewport-split-chromium-synthetic-rehearsal" &&
    syntheticPreflight.syntheticOnly === true &&
    syntheticPreflight.gate.viewportResults === 20 &&
    syntheticPreflight.gate.desktopViewportResults === 10 &&
    syntheticPreflight.gate.mobileViewportResults === 10 &&
    syntheticPreflight.gate.passingViewportResults === 20 &&
    syntheticPreflight.gate.requiredBooleanChecksPassed === 320 &&
    syntheticPreflight.gate.screenshots === 40 &&
    syntheticPreflight.gate.validJpegSignatures === 40 &&
    syntheticPreflight.gate.collapsedOpenPairsWithDifferentHashes === 20 &&
    Object.values(syntheticPreflight.gate.runtimeCounts).every((value) => value === 0) &&
    syntheticPreflight.executionDiscipline.retryPerformed === false &&
    syntheticPreflight.executionDiscipline.timeoutExtended === false &&
    syntheticPreflight.executionDiscipline.candidatePagesLoaded === 0 &&
    syntheticPreflight.executionDiscipline.modelContexts === 0 &&
    syntheticPreflight.executionDiscipline.directCostUsd === 0 &&
    syntheticPreflight.screenshotsPreservedInRepository === 0 &&
    syntheticPreflight.productionMutationPerformed === false,
  "passing remedy-v8 hybrid synthetic rehearsal required"
);
for (const [name, viewport] of Object.entries(CHECKPOINT_V22_RENDERING_REMEDY_V8_VIEWPORTS)) {
  assertV4(
    canonicalJson(hybridContract.viewports[name]) === canonicalJson(viewport),
    `${name}: remedy-v8 viewport contract changed`
  );
}

const sourceHashes = { ...priorPreparation.sourceHashes };
for (const [file, bytes] of Object.entries(directBytes)) {
  sourceHashes[file] = sha256(bytes);
}
for (const [file, digest] of Object.entries(sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `remedy-v8 source hash mismatch: ${file}`
  );
}
assertV4(
  sha256(await readFile(CHECKPOINT_V22_RENDERING_REMEDY_V8_IMAGE_CONTRACT.analyzerPath)) ===
    CHECKPOINT_V22_RENDERING_REMEDY_V8_IMAGE_CONTRACT.analyzerSha256,
  "frozen image analyzer changed"
);

const priorRowsByDebate = new Map(
  priorPreparation.packets.map((row) => [row.debateNumber, row])
);
const packetArtifacts = [];
for (const debateNumber of CHECKPOINT_V22_RENDERING_REMEDY_V8_ORDER) {
  const priorRow = priorRowsByDebate.get(debateNumber);
  assertV4(priorRow, `${debateNumber}: remedy-v6 packet row missing`);
  const sourcePacketBytes = await readFile(path.resolve(priorRow.path));
  assertV4(
    sha256(sourcePacketBytes) === priorRow.sha256,
    `${debateNumber}: remedy-v6 packet hash mismatch`
  );
  const packet = buildCheckpointV22RenderingRemedyV8Packet({
    sourcePacket: JSON.parse(sourcePacketBytes),
    sourcePacketPath: priorRow.path,
    sourcePacketSha256: priorRow.sha256,
    failedExecutionPath: priorExecutionPath,
    failedAnalysisPath: priorAnalysisPath,
    failedV7PreparationPath,
    syntheticPreflightPath,
    hybridContractPath
  });
  const outputPath = `${packetsRoot}/debate-${debateNumber}.json`;
  const serialized = `${JSON.stringify(packet, null, 2)}\n`;
  packetArtifacts.push({
    debateNumber,
    debateId: packet.debateId,
    path: outputPath,
    sha256: sha256(serialized),
    bytes: Buffer.byteLength(serialized),
    serialized
  });
}

const futureOutputPathsExcludedFromSourceHashes = [
  activationPath,
  executionPath,
  analysisPath,
  renderingAuditPath
];
const preparation = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-rendering-remedy-v8-preparation",
  protocolId: CHECKPOINT_V22_RENDERING_REMEDY_V8_PROTOCOL_ID,
  status: "eighth-replacement-rendering-verification-plan-prepared-and-frozen",
  frozenAt,
  checkpointCommit,
  productionCanary: true,
  stagingOnly: true,
  model: {
    ...CHECKPOINT_V22_RENDERING_REMEDY_V8_MODEL,
    participantJudgmentWasScoreBlind: true,
    roundedIntegerScoreTiesPermitted: true,
    modelExecutionPlanned: false
  },
  explicitOrder: [...CHECKPOINT_V22_RENDERING_REMEDY_V8_ORDER],
  viewports: structuredClone(CHECKPOINT_V22_RENDERING_REMEDY_V8_VIEWPORTS),
  requiredBooleanChecks: [...CHECKPOINT_V22_RENDERING_REMEDY_V8_REQUIRED_BOOLEAN_CHECKS],
  inputs: {
    priorPreparation: priorPreparationPath,
    priorActivation: priorActivationPath,
    failedExecution: priorExecutionPath,
    failedAnalysis: priorAnalysisPath,
    failedV7Preparation: failedV7PreparationPath,
    hybridBrowserContract: hybridContractPath,
    syntheticPreflightResult: syntheticPreflightPath
  },
  packets: packetArtifacts.map(({ serialized, ...row }) => row),
  browserPlan: {
    controller: "split-Chromium-rendering-and-keyboard-transport",
    browserFamily: "Chromium",
    pointerSurface: "Codex In-app Chromium browser",
    keyboardSurface: "Google Chrome via ChatGPT browser extension",
    exactBrowserNameAndVersionRecordedAtExecution: true,
    bothSurfacesMustReportSameChromeMajorVersion: true,
    localhostOnly: true,
    localServer: {
      command: ["python3", "-m", "http.server", String(CHECKPOINT_V22_RENDERING_REMEDY_V8_PORT), "--bind", "127.0.0.1"],
      workingDirectory: ".",
      port: CHECKPOINT_V22_RENDERING_REMEDY_V8_PORT,
      baseUrl: `http://127.0.0.1:${CHECKPOINT_V22_RENDERING_REMEDY_V8_PORT}`,
      externalNetworkNavigationPermitted: false
    },
    hybridContract: hybridContractPath,
    syntheticPreflight: syntheticPreflightPath,
    activationDerivedNavigationTokenRequired: true,
    serialExecution: true,
    iterateExplicitOrderArrayDirectly: true,
    viewportOrder: ["desktop", "mobile"],
    freshTabsPerViewport: 2,
    freshPointerAndKeyboardTabsPerViewport: true,
    pointerAndKeyboardUseSeparateChromiumSurfaces: true,
    pointerScreenshotsPerViewport: ["collapsed", "open"],
    pointerAndKeyboardRuntimeDiagnosticsRequired: true,
    nativeDetailsStateAuthority: true,
    reloadPermitted: false,
    screenshotContract: {
      method: "in-app-CDP-Page.captureScreenshot",
      parameters: { format: "jpeg", quality: 85, fromSurface: true, captureBeyondViewport: false },
      imageContract: structuredClone(CHECKPOINT_V22_RENDERING_REMEDY_V8_IMAGE_CONTRACT),
      pixelContract: "rounded-pointer-css-viewport-times-device-pixel-ratio",
      pointerControllerInputNeedNotEqualPhysicalScreenshotPixels: true,
      collapsedAndOpenHashesMustDiffer: true,
      analysisOccursBeforePersistence: true,
      bothScreenshotsMustPassBeforeEvidenceWrite: true
    },
    browserTabsOpenedDuringExecutionMustClose: true,
    bothViewportOverridesMustResetAfterExecution: true,
    localServerMustStopAfterExecution: true
  },
  gateExpectations: {
    debates: 10,
    sections: 51,
    moves: 188,
    viewportResults: 20,
    pointerDiagnosticBootstrapLoads: 20,
    pointerMeasuredCandidatePageLoads: 20,
    keyboardDiagnosticBootstrapLoads: 20,
    keyboardMeasuredCandidatePageLoads: 20,
    totalBrowserPageLoads: 80,
    screenshots: 40,
    validJpegScreenshots: 40,
    contractDerivedSignatureChecks: 40,
    signatureBytesInspectedPerScreenshot: 12,
    nonblankScreenshots: 40,
    dimensionMatchedScreenshots: 40,
    collapsedOpenPairsWithDifferentHashes: 20,
    pointerInteractionTests: 20,
    keyboardEnterTests: 20,
    keyboardSpaceTests: 20,
    rawAccordionStateObservations: 100,
    exactViewportPhaseChecks: 60,
    requiredBooleanChecksPerViewport: 38,
    requiredBooleanChecks: 760,
    consoleErrorMaximum: 0,
    consoleWarningMaximum: 0,
    pageErrorMaximum: 0,
    failedRequestMaximum: 0,
    horizontalOverflowMaximumPixels: 0,
    displayFieldsChanged: 0,
    participantScoresChanged: false,
    modelContexts: 0,
    directCostUsd: 0
  },
  failurePolicy: {
    anySourceHashMismatchFailsEntireGate: true,
    anyPacketHashMismatchFailsEntireGate: true,
    eitherBrowserSurfaceUnavailableFailsEntireGate: true,
    browserMajorVersionMismatchFailsEntireGate: true,
    anyPageLoadFailureFailsEntireGate: true,
    anyActualViewportMismatchFailsEntireGate: true,
    anyRequiredBooleanCheckFailureFailsEntireGate: true,
    anyNativeOpenStateMismatchFailsEntireGate: true,
    anyNonzeroRuntimeCountFailsEntireGate: true,
    anyHorizontalOverflowFailsEntireGate: true,
    anyInvalidJpegSignatureFailsEntireGate: true,
    anyBlankScreenshotFailsEntireGate: true,
    anyScreenshotDimensionMismatchFailsEntireGate: true,
    anyIdenticalCollapsedOpenScreenshotPairFailsEntireGate: true,
    anyMissingOrHashInvalidScreenshotFailsEntireGate: true,
    renderingDefectStopsForDiagnosisOnly: true,
    automaticStyleRepairPermitted: false,
    automaticApplicationRepairPermitted: false,
    retryPermitted: false,
    timeoutExtensionPermitted: false,
    adaptiveThresholdsPermitted: false,
    adaptiveViewportCalibrationPermitted: false,
    adaptiveTransportSwitchPermitted: false,
    adaptiveNavigationRegenerationPermitted: false,
    priorEvidenceReusePermitted: false,
    failedViewportArtifactsMustBeRemoved: true,
    partialPassPromotionPermitted: false,
    productionMutationPermitted: false
  },
  artifacts: {
    preparation: preparationPath,
    packetsRoot,
    evidenceRoot,
    activation: activationPath,
    execution: executionPath,
    analysis: analysisPath,
    renderingAudit: renderingAuditPath
  },
  futureOutputPathsExcludedFromSourceHashes,
  sourceHashes,
  authorization: {
    remedyV8PlanPreparation: true,
    syntheticBrowserPreflight: true,
    candidateBrowserControl: false,
    screenshotCapture: false,
    executionActivation: false,
    modelExecution: false,
    renderingRepair: false,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction:
    "user-decision-on-rendering-verification-remedy-v8-execution-activation"
};

if (shouldWrite) {
  await mkdir(path.resolve(packetsRoot), { recursive: true });
  for (const artifact of packetArtifacts) {
    await writeFile(path.resolve(artifact.path), artifact.serialized);
  }
  const temporary = `${path.resolve(preparationPath)}.tmp`;
  await writeFile(temporary, `${JSON.stringify(preparation, null, 2)}\n`);
  await rename(temporary, path.resolve(preparationPath));
}
console.log(JSON.stringify(preparation, null, 2));
