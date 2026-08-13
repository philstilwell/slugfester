#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  CHECKPOINT_V22_RENDERING_REMEDY_V2_MODEL,
  CHECKPOINT_V22_RENDERING_REMEDY_V2_ORDER,
  CHECKPOINT_V22_RENDERING_REMEDY_V2_PORT,
  CHECKPOINT_V22_RENDERING_REMEDY_V2_PROTOCOL_ID,
  CHECKPOINT_V22_RENDERING_REMEDY_V2_ROOT,
  CHECKPOINT_V22_RENDERING_REMEDY_V2_VIEWPORTS,
  buildCheckpointV22RenderingRemedyV2Packet
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v2.mjs";
import {
  validateCheckpointV22RenderingRemedyV1Packet
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v1.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const checkpointIndex = process.argv.indexOf("--checkpoint-commit");
const preparationPath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V2_ROOT}/preparation-manifest.json`;
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
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v1";
const priorPreparationPath = `${priorRoot}/preparation-manifest.json`;
const priorActivationPath = `${priorRoot}/execution-activation.json`;
const priorExecutionPath = `${priorRoot}/execution.json`;
const priorAnalysisPath = `${priorRoot}/analysis.json`;
const syntheticFixturePath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V2_ROOT}/synthetic/preflight.html`;
const exercisedSyntheticFixturePath =
  `${priorRoot}/synthetic/preflight.html`;
const calibrationPath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V2_ROOT}/synthetic/viewport-calibration.json`;
const syntheticPreflightPath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V2_ROOT}/synthetic/preflight-result.json`;
const controllerDiagnosisPath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V2_ROOT}/synthetic/controller-diagnosis.json`;
const packetsRoot = `${CHECKPOINT_V22_RENDERING_REMEDY_V2_ROOT}/packets`;
const activationPath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V2_ROOT}/execution-activation.json`;
const executionPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V2_ROOT}/execution.json`;
const analysisPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V2_ROOT}/analysis.json`;
const renderingAuditPath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V2_ROOT}/rendering-audit.json`;
const evidenceRoot = `${CHECKPOINT_V22_RENDERING_REMEDY_V2_ROOT}/evidence`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

if (shouldWrite) {
  assertV4(
    !(await exists(preparationPath)) && !(await exists(packetsRoot)),
    "remedy-v2 preparation already exists; freeze is immutable"
  );
}

const [
  priorPreparationBytes,
  priorActivationBytes,
  priorExecutionBytes,
  priorAnalysisBytes,
  fixtureBytes,
  calibrationBytes,
  preflightBytes,
  diagnosisBytes
] = await Promise.all([
  readFile(path.resolve(priorPreparationPath)),
  readFile(path.resolve(priorActivationPath)),
  readFile(path.resolve(priorExecutionPath)),
  readFile(path.resolve(priorAnalysisPath)),
  readFile(path.resolve(syntheticFixturePath)),
  readFile(path.resolve(calibrationPath)),
  readFile(path.resolve(syntheticPreflightPath)),
  readFile(path.resolve(controllerDiagnosisPath))
]);
const priorPreparation = JSON.parse(priorPreparationBytes);
const priorActivation = JSON.parse(priorActivationBytes);
const priorExecution = JSON.parse(priorExecutionBytes);
const priorAnalysis = JSON.parse(priorAnalysisBytes);
const calibration = JSON.parse(calibrationBytes);
const preflight = JSON.parse(preflightBytes);
const diagnosis = JSON.parse(diagnosisBytes);

assertV4(
  priorPreparation.status ===
      "replacement-rendering-verification-remedy-plan-prepared-and-frozen" &&
    priorActivation.status ===
      "replacement-rendering-verification-execution-authorized-and-frozen" &&
    priorExecution.status ===
      "replacement-rendering-verification-failed-closed-on-first-viewport" &&
    priorExecution.finalizedViewportResults === 0 &&
    priorExecution.preservedScreenshots === 0 &&
    priorExecution.retries === 0 &&
    priorExecution.modelContexts === 0 &&
    priorExecution.directCostUsd === 0 &&
    priorExecution.renderingContentRegressionEstablished === false &&
    priorExecution.renderingRepairPerformed === false &&
    priorExecution.productionMutationPerformed === false &&
    priorAnalysis.status ===
      "replacement-rendering-verification-failed-closed-on-browser-control-contract" &&
    priorAnalysis.decision.failedClosed === true &&
    priorAnalysis.decision.retryPerformed === false &&
    priorAnalysis.decision.renderingGatePassed === false &&
    priorAnalysis.gate.viewportResultsPassed === 0 &&
    priorAnalysis.gate.screenshotsPreserved === 0 &&
    priorAnalysis.gate.renderingContentRegressionEstablished === false &&
    priorAnalysis.nextAuthorizedAction ===
      "user-decision-on-rendering-verification-remedy-v2-plan-preparation",
  "remedy-v1 failed audit required"
);
for (const [file, digest] of Object.entries(priorPreparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `remedy-v1 source hash mismatch: ${file}`
  );
}
assertV4(
  canonicalJson(priorPreparation.explicitOrder) ===
      canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V2_ORDER) &&
    priorPreparation.packets.length === 10 &&
    priorPreparation.gateExpectations.sections === 51 &&
    priorPreparation.gateExpectations.moves === 188 &&
    priorPreparation.model.label === CHECKPOINT_V22_RENDERING_REMEDY_V2_MODEL.label &&
    priorPreparation.model.reasoningEffort ===
      CHECKPOINT_V22_RENDERING_REMEDY_V2_MODEL.reasoningEffort &&
    priorPreparation.model.authentication ===
      CHECKPOINT_V22_RENDERING_REMEDY_V2_MODEL.authentication &&
    priorPreparation.model.participantJudgmentWasScoreBlind === true,
  "remedy-v1 frozen controls changed"
);

assertV4(
  calibration.status ===
      "exact-css-viewport-controller-inputs-established-synthetically" &&
    calibration.syntheticOnly === true &&
    calibration.canaryCandidateLoaded === false &&
    calibration.screenshotsCaptured === 0 &&
    calibration.controller === "Google Chrome via ChatGPT browser extension" &&
    calibration.measurements.desktopUncalibrated.exactTargetMatch === false &&
    calibration.measurements.mobileUncalibrated.exactTargetMatch === false &&
    calibration.measurements.desktopCalibrated.exactTargetMatch === true &&
    calibration.measurements.mobileCalibrated.exactTargetMatch === true &&
    canonicalJson(calibration.measurements.desktopCalibrated.targetCssViewport) ===
      canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V2_VIEWPORTS.desktop.targetCssViewport) &&
    canonicalJson(calibration.measurements.desktopCalibrated.controllerInput) ===
      canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V2_VIEWPORTS.desktop.controllerInput) &&
    canonicalJson(calibration.measurements.mobileCalibrated.targetCssViewport) ===
      canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V2_VIEWPORTS.mobile.targetCssViewport) &&
    canonicalJson(calibration.measurements.mobileCalibrated.controllerInput) ===
      canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V2_VIEWPORTS.mobile.controllerInput) &&
    calibration.productionMutationPerformed === false,
  "passing synthetic viewport calibration required"
);
assertV4(
  preflight.status ===
      "passed-exact-viewport-and-clean-load-interaction-preflight" &&
    preflight.syntheticOnly === true &&
    preflight.canaryCandidateLoaded === false &&
    preflight.screenshotsCaptured === 0 &&
    preflight.exercisedFixturePath === exercisedSyntheticFixturePath &&
    preflight.frozenExecutionFixturePath === syntheticFixturePath &&
    preflight.frozenExecutionFixtureByteIdenticalToExercisedFixture === true &&
    sha256(fixtureBytes) ===
      sha256(await readFile(path.resolve(exercisedSyntheticFixturePath))) &&
    preflight.diagnosticBootstrap.reloads === 0 &&
    Object.values(preflight.runtimeCounts).every((count) => count === 0) &&
    Object.values(preflight.viewports.desktop.checks).every(Boolean) &&
    Object.values(preflight.viewports.mobile.checks).every(Boolean) &&
    preflight.productionMutationPerformed === false,
  "passing clean-load synthetic preflight required"
);
assertV4(
  diagnosis.status ===
      "chrome-controller-retained-with-frozen-css-viewport-calibration-and-clean-load-phases" &&
    diagnosis.syntheticOnly === true &&
    diagnosis.canaryCandidateLoaded === false &&
    diagnosis.screenshotsCaptured === 0 &&
    diagnosis.failedRemedyV1Contract.contentOrStylesheetRegressionEstablished === false &&
    diagnosis.remedyV2Contract.adaptiveCalibrationDuringExecution === false &&
    diagnosis.remedyV2Contract.exactObservedCssViewportRequired === true &&
    diagnosis.remedyV2Contract.pointerAndKeyboardUseSeparateFreshTabs === true &&
    diagnosis.remedyV2Contract.reloadUsed === false &&
    diagnosis.remedyV2Contract.failureStopsWithoutRetryOrEvidencePersistence === true &&
    diagnosis.productionMutationPerformed === false,
  "remedy-v2 controller diagnosis changed"
);

const packets = [];
for (const debateNumber of CHECKPOINT_V22_RENDERING_REMEDY_V2_ORDER) {
  const sourceRow = priorPreparation.packets.find(
    (item) => item.debateNumber === debateNumber
  );
  assertV4(sourceRow, `${debateNumber}: remedy-v1 packet row missing`);
  const sourcePacketBytes = await readFile(path.resolve(sourceRow.path));
  assertV4(
    sha256(sourcePacketBytes) === sourceRow.sha256 &&
      sourcePacketBytes.length === sourceRow.bytes,
    `${debateNumber}: remedy-v1 packet changed`
  );
  const sourcePacket = JSON.parse(sourcePacketBytes);
  validateCheckpointV22RenderingRemedyV1Packet(sourcePacket);
  const packet = buildCheckpointV22RenderingRemedyV2Packet({
    sourcePacket,
    sourcePacketPath: sourceRow.path,
    sourcePacketSha256: sourceRow.sha256,
    failedExecutionPath: priorExecutionPath,
    failedAnalysisPath: priorAnalysisPath,
    syntheticBootstrapPath: syntheticFixturePath
  });
  const packetPath = `${packetsRoot}/debate-${debateNumber}.json`;
  const packetBytes = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  packets.push({
    debateNumber,
    debateId: sourceRow.debateId,
    path: packetPath,
    sha256: sha256(packetBytes),
    bytes: packetBytes.length,
    packet,
    packetBytes
  });
}

const toolingPaths = [
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-browser-runner-v2.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v2.mjs",
  "scripts/prepare-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v2.mjs",
  "scripts/preregister-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v2.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v2-preparation.mjs",
  "scripts/validate-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v2-evidence.mjs"
];
const sourceFiles = [...new Set([
  ...Object.keys(priorPreparation.sourceHashes),
  priorPreparationPath,
  priorActivationPath,
  priorExecutionPath,
  priorAnalysisPath,
  ...priorPreparation.packets.map((item) => item.path),
  syntheticFixturePath,
  calibrationPath,
  syntheticPreflightPath,
  controllerDiagnosisPath,
  ...toolingPaths
])];
const sourceHashes = {};
for (const file of sourceFiles) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}

const futureOutputPaths = [
  activationPath,
  executionPath,
  analysisPath,
  renderingAuditPath,
  evidenceRoot
];
for (const file of futureOutputPaths) {
  assertV4(!(await exists(file)), `future remedy-v2 output already exists: ${file}`);
}

const plannedEvidencePaths = packets.flatMap((row) =>
  Object.values(row.packet.viewports).flatMap((viewport) => [
    viewport.evidence.result,
    viewport.evidence.collapsedScreenshot,
    viewport.evidence.openScreenshot
  ])
);
const manifest = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-rendering-remedy-v2-preparation",
  protocolId: CHECKPOINT_V22_RENDERING_REMEDY_V2_PROTOCOL_ID,
  status: "second-replacement-rendering-verification-plan-prepared-and-frozen",
  frozenAt,
  checkpointCommit,
  productionCanary: true,
  stagingOnly: true,
  supersedes: {
    protocolId: priorPreparation.protocolId,
    failedPreparation: priorPreparationPath,
    failedPreparationSha256: sha256(priorPreparationBytes),
    failedActivation: priorActivationPath,
    failedActivationSha256: sha256(priorActivationBytes),
    failedExecution: priorExecutionPath,
    failedExecutionSha256: sha256(priorExecutionBytes),
    failedAnalysis: priorAnalysisPath,
    failedAnalysisSha256: sha256(priorAnalysisBytes),
    priorEvidenceReusePermitted: false
  },
  model: {
    ...CHECKPOINT_V22_RENDERING_REMEDY_V2_MODEL,
    participantJudgmentWasScoreBlind: true,
    modelExecutionPlanned: false
  },
  costEstimate: {
    directCostUsd: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    modelContexts: 0,
    expectedExecutionWallMinutes: [10, 25]
  },
  inputs: {
    failedPreparation: priorPreparationPath,
    failedActivation: priorActivationPath,
    failedExecution: priorExecutionPath,
    failedAnalysis: priorAnalysisPath,
    syntheticFixture: syntheticFixturePath,
    exercisedSyntheticFixture: exercisedSyntheticFixturePath,
    viewportCalibration: calibrationPath,
    syntheticPreflightResult: syntheticPreflightPath,
    controllerDiagnosis: controllerDiagnosisPath,
    browserRunner:
      "scripts/lib/assessment-production-checkpoint-v2.2-rendering-browser-runner-v2.mjs"
  },
  syntheticPreflight: {
    status: preflight.status,
    calibration: calibrationPath,
    calibrationSha256: sha256(calibrationBytes),
    result: syntheticPreflightPath,
    resultSha256: sha256(preflightBytes),
    diagnosis: controllerDiagnosisPath,
    diagnosisSha256: sha256(diagnosisBytes),
    controller: preflight.browser.name,
    userAgent: preflight.browser.userAgent,
    syntheticOnly: true,
    canaryCandidateLoaded: false,
    screenshotsCaptured: 0,
    viewportTargetsPassed: 2,
    cleanLoadInteractionPhasesPassed: 4,
    runtimeCounts: preflight.runtimeCounts
  },
  explicitOrder: [...CHECKPOINT_V22_RENDERING_REMEDY_V2_ORDER],
  viewports: structuredClone(CHECKPOINT_V22_RENDERING_REMEDY_V2_VIEWPORTS),
  packets: packets.map(({ packet, packetBytes, ...row }) => row),
  browserPlan: {
    controller: "Google Chrome via ChatGPT browser extension",
    browserFamily: "Chromium",
    exactBrowserNameAndVersionRecordedAtExecution: true,
    localhostOnly: true,
    localServer: {
      command: [
        "python3",
        "-m",
        "http.server",
        String(CHECKPOINT_V22_RENDERING_REMEDY_V2_PORT),
        "--bind",
        "127.0.0.1"
      ],
      workingDirectory: ".",
      port: CHECKPOINT_V22_RENDERING_REMEDY_V2_PORT,
      baseUrl: `http://127.0.0.1:${CHECKPOINT_V22_RENDERING_REMEDY_V2_PORT}`,
      freshOriginRelativeToRemedyV1: true,
      externalNetworkNavigationPermitted: false
    },
    viewportContract: {
      targetsAreCssPixels: true,
      controllerInputsAreFrozenOuterWindowPixels: true,
      adaptiveCalibrationDuringExecution: false,
      exactObservedInnerWidthAndHeightRequiredForEveryMeasuredPhase: true,
      overflowComparedToObservedInnerWidth: true
    },
    diagnosticBootstrap: {
      path: syntheticFixturePath,
      purpose: "attach raw diagnostics on an HTTP document before candidate navigation",
      loadsPerViewport: 2,
      measuredAsCandidateLoad: false
    },
    serialExecution: true,
    iterateExplicitOrderArrayDirectly: true,
    viewportOrder: ["desktop", "mobile"],
    freshTabsPerViewport: 2,
    pointerAndKeyboardUseSeparateFreshTabs: true,
    reloadPermitted: false,
    screenshotsPerViewport: ["collapsed", "open"],
    browserTabsOpenedDuringExecutionMustClose: true,
    viewportOverrideMustResetAfterExecution: true,
    localServerMustStopAfterExecution: true
  },
  gateExpectations: {
    debates: 10,
    sections: 51,
    moves: 188,
    viewportResults: 20,
    diagnosticBootstrapLoads: 40,
    measuredCandidatePageLoads: 40,
    totalBrowserPageLoads: 80,
    screenshots: 40,
    pointerInteractionTests: 20,
    keyboardEnterTests: 20,
    keyboardSpaceTests: 20,
    pointerFreshLoadCollapsedChecks: 20,
    keyboardFreshLoadCollapsedChecks: 20,
    exactViewportPhaseChecks: 60,
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
    anyPageLoadFailureFailsEntireGate: true,
    anyActualViewportMismatchFailsEntireGate: true,
    anyRequiredBooleanCheckFailureFailsEntireGate: true,
    anyNonzeroRuntimeCountFailsEntireGate: true,
    anyHorizontalOverflowFailsEntireGate: true,
    anyMissingOrHashInvalidScreenshotFailsEntireGate: true,
    renderingDefectStopsForDiagnosisOnly: true,
    automaticStyleRepairPermitted: false,
    automaticApplicationRepairPermitted: false,
    retryPermitted: false,
    adaptiveViewportCalibrationPermitted: false,
    priorEvidenceReusePermitted: false,
    failedViewportArtifactsMustBeRemoved: true,
    partialPassPromotionPermitted: false,
    productionMutationPermitted: false
  },
  compatibilityBoundary: {
    renderingVerificationBlocked: false,
    productionMutationBlocked: true,
    validatorMigrationAuthorized: false,
    productionLedgerPublicationAuthorized: false,
    blockers: [
      "optional-overall-reference-links",
      "checkpoint-ledger-schema-adapter"
    ]
  },
  artifacts: {
    preparation: preparationPath,
    packetsRoot,
    packets: packets.map((row) => row.path),
    activation: activationPath,
    execution: executionPath,
    analysis: analysisPath,
    renderingAudit: renderingAuditPath,
    evidenceRoot,
    plannedEvidencePaths
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  sourceHashes,
  authorization: {
    remedyV2PlanPreparation: true,
    syntheticBrowserPreflight: true,
    candidateBrowserControl: false,
    screenshotCapture: false,
    executionActivation: false,
    renderingRepair: false,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction:
    "user-decision-on-rendering-verification-remedy-v2-execution-activation"
};

if (shouldWrite) {
  await mkdir(path.resolve(CHECKPOINT_V22_RENDERING_REMEDY_V2_ROOT), {
    recursive: true
  });
  const temporaryPackets = await mkdtemp(
    path.resolve(CHECKPOINT_V22_RENDERING_REMEDY_V2_ROOT, ".packets-")
  );
  try {
    for (const row of packets) {
      await writeFile(
        path.join(temporaryPackets, `debate-${row.debateNumber}.json`),
        row.packetBytes
      );
    }
    await rename(temporaryPackets, path.resolve(packetsRoot));
    const temporaryManifest = `${path.resolve(preparationPath)}.tmp`;
    await writeFile(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`);
    await rename(temporaryManifest, path.resolve(preparationPath));
  } catch (error) {
    await rm(temporaryPackets, { recursive: true, force: true });
    await rm(path.resolve(packetsRoot), { recursive: true, force: true });
    await rm(path.resolve(preparationPath), { force: true });
    throw error;
  }
}

console.log(JSON.stringify(manifest, null, 2));
