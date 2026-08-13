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
  CHECKPOINT_V22_RENDERING_REMEDY_V3_MODEL,
  CHECKPOINT_V22_RENDERING_REMEDY_V3_ORDER,
  CHECKPOINT_V22_RENDERING_REMEDY_V3_PORT,
  CHECKPOINT_V22_RENDERING_REMEDY_V3_PROTOCOL_ID,
  CHECKPOINT_V22_RENDERING_REMEDY_V3_ROOT,
  CHECKPOINT_V22_RENDERING_REMEDY_V3_VIEWPORTS,
  buildCheckpointV22RenderingRemedyV3Packet
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v3.mjs";
import {
  validateCheckpointV22RenderingRemedyV2Packet
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v2.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const checkpointIndex = process.argv.indexOf("--checkpoint-commit");
const preparationPath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V3_ROOT}/preparation-manifest.json`;
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
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v2";
const priorPreparationPath = `${priorRoot}/preparation-manifest.json`;
const priorActivationPath = `${priorRoot}/execution-activation.json`;
const priorExecutionPath = `${priorRoot}/execution.json`;
const priorAnalysisPath = `${priorRoot}/analysis.json`;
const syntheticRoot = `${CHECKPOINT_V22_RENDERING_REMEDY_V3_ROOT}/synthetic`;
const syntheticFixturePath = `${syntheticRoot}/preflight.html`;
const priorSyntheticFixturePath = `${priorRoot}/synthetic/preflight.html`;
const observerDiagnosisPath = `${syntheticRoot}/observer-diagnosis.json`;
const syntheticPreflightPath = `${syntheticRoot}/preflight-result.json`;
const navigationContractPath = `${syntheticRoot}/navigation-contract.json`;
const viewportReplayPath = `${syntheticRoot}/viewport-calibration-replay.json`;
const priorViewportCalibrationPath = `${priorRoot}/synthetic/viewport-calibration.json`;
const packetsRoot = `${CHECKPOINT_V22_RENDERING_REMEDY_V3_ROOT}/packets`;
const activationPath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V3_ROOT}/execution-activation.json`;
const executionPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V3_ROOT}/execution.json`;
const analysisPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V3_ROOT}/analysis.json`;
const renderingAuditPath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V3_ROOT}/rendering-audit.json`;
const evidenceRoot = `${CHECKPOINT_V22_RENDERING_REMEDY_V3_ROOT}/evidence`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

if (shouldWrite) {
  assertV4(
    !(await exists(preparationPath)) && !(await exists(packetsRoot)),
    "remedy-v3 preparation already exists; freeze is immutable"
  );
}

const inputPaths = [
  priorPreparationPath,
  priorActivationPath,
  priorExecutionPath,
  priorAnalysisPath,
  syntheticFixturePath,
  priorSyntheticFixturePath,
  observerDiagnosisPath,
  syntheticPreflightPath,
  navigationContractPath,
  viewportReplayPath,
  priorViewportCalibrationPath
];
const inputBytes = Object.fromEntries(await Promise.all(
  inputPaths.map(async (file) => [file, await readFile(path.resolve(file))])
));
const priorPreparation = JSON.parse(inputBytes[priorPreparationPath]);
const priorActivation = JSON.parse(inputBytes[priorActivationPath]);
const priorExecution = JSON.parse(inputBytes[priorExecutionPath]);
const priorAnalysis = JSON.parse(inputBytes[priorAnalysisPath]);
const diagnosis = JSON.parse(inputBytes[observerDiagnosisPath]);
const preflight = JSON.parse(inputBytes[syntheticPreflightPath]);
const navigation = JSON.parse(inputBytes[navigationContractPath]);
const viewportReplay = JSON.parse(inputBytes[viewportReplayPath]);
const priorCalibration = JSON.parse(inputBytes[priorViewportCalibrationPath]);

assertV4(
  priorPreparation.status ===
      "second-replacement-rendering-verification-plan-prepared-and-frozen" &&
    priorActivation.status ===
      "second-replacement-rendering-verification-execution-authorized-and-frozen" &&
    priorExecution.status ===
      "second-replacement-rendering-verification-failed-closed-on-first-viewport" &&
    priorExecution.attempted.debateNumber === "50" &&
    priorExecution.attempted.viewport === "desktop" &&
    priorExecution.observedResult.checks.pointerFreshLoadCollapsed === false &&
    priorExecution.observedResult.checks.keyboardFreshLoadCollapsed === true &&
    priorExecution.observedResult.checks.pointerActualViewportMatchesRequested === true &&
    priorExecution.observedResult.checks.openActualViewportMatchesRequested === true &&
    priorExecution.observedResult.checks.keyboardActualViewportMatchesRequested === true &&
    priorExecution.finalizedViewportResults === 0 &&
    priorExecution.preservedScreenshots === 0 &&
    priorExecution.unattemptedViewportResults === 19 &&
    priorExecution.retries === 0 &&
    priorExecution.modelContexts === 0 &&
    priorExecution.directCostUsd === 0 &&
    priorExecution.renderingContentRegressionEstablished === false &&
    priorExecution.renderingRepairPerformed === false &&
    priorExecution.productionMutationPerformed === false &&
    priorExecution.cleanup.failedViewportEvidencePersisted === false &&
    priorExecution.cleanup.evidenceRootCreated === false &&
    priorAnalysis.status ===
      "second-replacement-rendering-verification-failed-closed-on-pointer-fresh-load-state-contract" &&
    priorAnalysis.decision.failedClosed === true &&
    priorAnalysis.decision.retryPerformed === false &&
    priorAnalysis.decision.renderingGatePassed === false &&
    priorAnalysis.gate.viewportResultsPassed === 0 &&
    priorAnalysis.gate.screenshotsPreserved === 0 &&
    priorAnalysis.gate.renderingContentRegressionEstablished === false &&
    priorAnalysis.nextAuthorizedAction ===
      "user-decision-on-rendering-verification-remedy-v3-plan-preparation",
  "failed remedy-v2 audit required"
);
for (const [file, digest] of Object.entries(priorPreparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `remedy-v2 source hash mismatch: ${file}`
  );
}
assertV4(
  canonicalJson(priorPreparation.explicitOrder) ===
      canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V3_ORDER) &&
    priorPreparation.packets.length === 10 &&
    priorPreparation.gateExpectations.sections === 51 &&
    priorPreparation.gateExpectations.moves === 188 &&
    priorPreparation.model.label === CHECKPOINT_V22_RENDERING_REMEDY_V3_MODEL.label &&
    priorPreparation.model.reasoningEffort ===
      CHECKPOINT_V22_RENDERING_REMEDY_V3_MODEL.reasoningEffort &&
    priorPreparation.model.authentication ===
      CHECKPOINT_V22_RENDERING_REMEDY_V3_MODEL.authentication &&
    priorPreparation.model.participantJudgmentWasScoreBlind === true,
  "remedy-v2 frozen controls changed"
);

assertV4(
  sha256(inputBytes[syntheticFixturePath]) ===
      sha256(inputBytes[priorSyntheticFixturePath]) &&
    diagnosis.status === "remedy-v2-combined-geometry-observer-rejected" &&
    diagnosis.syntheticOnly === true &&
    diagnosis.canaryCandidateLoaded === false &&
    diagnosis.screenshotsCaptured === 0 &&
    diagnosis.failedRemedyV2Observer.detailsOpen === false &&
    diagnosis.failedRemedyV2Observer.openAttributePresent === false &&
    diagnosis.failedRemedyV2Observer.contentClientRectCount === 1 &&
    diagnosis.remedyV3Observer.contentVisibilityGate ===
      "element-from-point-hit-test-after-summary-scroll" &&
    diagnosis.remedyV3Observer.contentClientRectsUse ===
      "diagnostic-only-never-gating" &&
    Object.values(diagnosis.runtimeCounts).every((count) => count === 0) &&
    diagnosis.productionMutationPerformed === false,
  "valid remedy-v3 observer diagnosis required"
);
assertV4(
  preflight.status ===
      "passed-native-state-hit-test-and-tokenized-navigation-preflight" &&
    preflight.syntheticOnly === true &&
    preflight.canaryCandidateLoaded === false &&
    preflight.screenshotsCaptured === 0 &&
    /^[a-f0-9]{64}$/.test(preflight.fixture.navigationToken) &&
    preflight.fixture.reloads === 0 &&
    preflight.fixture.distinctPointerAndKeyboardUrlsPerViewport === true &&
    preflight.observerContract.stateAuthority === "native-details-open-property" &&
    preflight.observerContract.openAttributeCorroborationRequired === true &&
    preflight.observerContract.contentVisibilityGate ===
      "element-from-point-hit-test-after-summary-scroll" &&
    preflight.observerContract.contentClientRectsUse ===
      "diagnostic-only-never-gating" &&
    Object.values(preflight.viewports.desktop.checks).every(Boolean) &&
    Object.values(preflight.viewports.mobile.checks).every(Boolean) &&
    Object.values(preflight.runtimeCounts).every((count) => count === 0) &&
    preflight.productionMutationPerformed === false,
  "passing remedy-v3 synthetic preflight required"
);
assertV4(
  navigation.status === "activation-derived-navigation-contract-frozen" &&
    navigation.token.computedDuringActivation === true &&
    navigation.token.storedInActivation === true &&
    navigation.token.passedToRunner === true &&
    navigation.token.selfHashing === false &&
    navigation.requirements.allFourUrlsUniqueWithinViewport === true &&
    navigation.requirements.allUrlsUniqueAcrossViewports === true &&
    navigation.requirements.pointerAndKeyboardUseSeparateFreshTabs === true &&
    navigation.requirements.reloadPermitted === false &&
    navigation.requirements.retryPermitted === false &&
    navigation.productionMutationPerformed === false,
  "valid remedy-v3 navigation contract required"
);
assertV4(
  viewportReplay.status ===
      "prior-passing-viewport-calibration-retained-without-adaptation" &&
    viewportReplay.source === priorViewportCalibrationPath &&
    viewportReplay.adaptiveCalibrationDuringExecution === false &&
    viewportReplay.viewports.desktop.syntheticPreflightExactMatch === true &&
    viewportReplay.viewports.mobile.syntheticPreflightExactMatch === true &&
    priorCalibration.measurements.desktopCalibrated.exactTargetMatch === true &&
    priorCalibration.measurements.mobileCalibrated.exactTargetMatch === true &&
    canonicalJson(viewportReplay.viewports.desktop.targetCssViewport) ===
      canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V3_VIEWPORTS.desktop.targetCssViewport) &&
    canonicalJson(viewportReplay.viewports.desktop.controllerInput) ===
      canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V3_VIEWPORTS.desktop.controllerInput) &&
    canonicalJson(viewportReplay.viewports.mobile.targetCssViewport) ===
      canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V3_VIEWPORTS.mobile.targetCssViewport) &&
    canonicalJson(viewportReplay.viewports.mobile.controllerInput) ===
      canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V3_VIEWPORTS.mobile.controllerInput),
  "frozen exact viewport calibration replay required"
);

const packets = [];
for (const debateNumber of CHECKPOINT_V22_RENDERING_REMEDY_V3_ORDER) {
  const sourceRow = priorPreparation.packets.find(
    (item) => item.debateNumber === debateNumber
  );
  assertV4(sourceRow, `${debateNumber}: remedy-v2 packet row missing`);
  const sourcePacketBytes = await readFile(path.resolve(sourceRow.path));
  assertV4(
    sha256(sourcePacketBytes) === sourceRow.sha256 &&
      sourcePacketBytes.length === sourceRow.bytes,
    `${debateNumber}: remedy-v2 packet changed`
  );
  const sourcePacket = JSON.parse(sourcePacketBytes);
  validateCheckpointV22RenderingRemedyV2Packet(sourcePacket);
  const packet = buildCheckpointV22RenderingRemedyV3Packet({
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
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-browser-runner-v3.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v3.mjs",
  "scripts/prepare-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v3.mjs",
  "scripts/preregister-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v3.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v3-preparation.mjs",
  "scripts/validate-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v3-evidence.mjs"
];
const sourceFiles = [...new Set([
  ...Object.keys(priorPreparation.sourceHashes),
  priorPreparationPath,
  priorActivationPath,
  priorExecutionPath,
  priorAnalysisPath,
  ...priorPreparation.packets.map((item) => item.path),
  ...inputPaths.slice(4),
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
  assertV4(!(await exists(file)), `future remedy-v3 output already exists: ${file}`);
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
    "1.0-production-checkpoint-v2.2-rendering-remedy-v3-preparation",
  protocolId: CHECKPOINT_V22_RENDERING_REMEDY_V3_PROTOCOL_ID,
  status: "third-replacement-rendering-verification-plan-prepared-and-frozen",
  frozenAt,
  checkpointCommit,
  productionCanary: true,
  stagingOnly: true,
  supersedes: {
    protocolId: priorPreparation.protocolId,
    failedPreparation: priorPreparationPath,
    failedPreparationSha256: sha256(inputBytes[priorPreparationPath]),
    failedActivation: priorActivationPath,
    failedActivationSha256: sha256(inputBytes[priorActivationPath]),
    failedExecution: priorExecutionPath,
    failedExecutionSha256: sha256(inputBytes[priorExecutionPath]),
    failedAnalysis: priorAnalysisPath,
    failedAnalysisSha256: sha256(inputBytes[priorAnalysisPath]),
    priorEvidenceReusePermitted: false
  },
  model: {
    ...CHECKPOINT_V22_RENDERING_REMEDY_V3_MODEL,
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
    priorSyntheticFixture: priorSyntheticFixturePath,
    observerDiagnosis: observerDiagnosisPath,
    syntheticPreflightResult: syntheticPreflightPath,
    navigationContract: navigationContractPath,
    viewportCalibrationReplay: viewportReplayPath,
    priorViewportCalibration: priorViewportCalibrationPath,
    browserRunner:
      "scripts/lib/assessment-production-checkpoint-v2.2-rendering-browser-runner-v3.mjs"
  },
  syntheticPreflight: {
    status: preflight.status,
    observerDiagnosis: observerDiagnosisPath,
    observerDiagnosisSha256: sha256(inputBytes[observerDiagnosisPath]),
    result: syntheticPreflightPath,
    resultSha256: sha256(inputBytes[syntheticPreflightPath]),
    navigationContract: navigationContractPath,
    navigationContractSha256: sha256(inputBytes[navigationContractPath]),
    viewportCalibrationReplay: viewportReplayPath,
    viewportCalibrationReplaySha256: sha256(inputBytes[viewportReplayPath]),
    controller: preflight.browser.name,
    userAgent: preflight.browser.userAgent,
    syntheticOnly: true,
    canaryCandidateLoaded: false,
    screenshotsCaptured: 0,
    viewportTargetsPassed: 2,
    pointerAndKeyboardInteractionPhasesPassed: 4,
    runtimeCounts: preflight.runtimeCounts
  },
  explicitOrder: [...CHECKPOINT_V22_RENDERING_REMEDY_V3_ORDER],
  viewports: structuredClone(CHECKPOINT_V22_RENDERING_REMEDY_V3_VIEWPORTS),
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
        String(CHECKPOINT_V22_RENDERING_REMEDY_V3_PORT),
        "--bind",
        "127.0.0.1"
      ],
      workingDirectory: ".",
      port: CHECKPOINT_V22_RENDERING_REMEDY_V3_PORT,
      baseUrl: `http://127.0.0.1:${CHECKPOINT_V22_RENDERING_REMEDY_V3_PORT}`,
      freshOriginRelativeToRemedyV2: true,
      externalNetworkNavigationPermitted: false
    },
    activationDerivedNavigationTokenRequired: true,
    navigationContract: navigationContractPath,
    viewportContract: {
      targetsAreCssPixels: true,
      controllerInputsAreFrozenOuterWindowPixels: true,
      adaptiveCalibrationDuringExecution: false,
      exactObservedInnerWidthAndHeightRequiredForEveryMeasuredPhase: true,
      overflowComparedToObservedInnerWidth: true
    },
    accordionStateContract: {
      stateAuthority: "native-details-open-property",
      openAttributeCorroborationRequired: true,
      contentVisibilityGate: "element-from-point-hit-test-after-summary-scroll",
      contentClientRectsUse: "diagnostic-only-never-gating",
      rawStatesSerializedPerViewport: [
        "pointerFresh",
        "pointerOpen",
        "keyboardFresh",
        "keyboardAfterEnter",
        "keyboardAfterSpace"
      ]
    },
    diagnosticBootstrap: {
      path: syntheticFixturePath,
      purpose: "attach raw diagnostics on a unique HTTP document before candidate navigation",
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
    rawAccordionStateObservations: 100,
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
    anyNativeOpenStateMismatchFailsEntireGate: true,
    anyOpenAttributeCorroborationMismatchFailsEntireGate: true,
    anyHitTestVisibilityMismatchFailsEntireGate: true,
    childClientRectCountCanNeverFailGate: true,
    anyNonzeroRuntimeCountFailsEntireGate: true,
    anyHorizontalOverflowFailsEntireGate: true,
    anyMissingOrHashInvalidScreenshotFailsEntireGate: true,
    renderingDefectStopsForDiagnosisOnly: true,
    automaticStyleRepairPermitted: false,
    automaticApplicationRepairPermitted: false,
    retryPermitted: false,
    adaptiveViewportCalibrationPermitted: false,
    adaptiveNavigationRegenerationPermitted: false,
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
    remedyV3PlanPreparation: true,
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
    "user-decision-on-rendering-verification-remedy-v3-execution-activation"
};

if (shouldWrite) {
  await mkdir(path.resolve(CHECKPOINT_V22_RENDERING_REMEDY_V3_ROOT), {
    recursive: true
  });
  const temporaryPackets = await mkdtemp(
    path.resolve(CHECKPOINT_V22_RENDERING_REMEDY_V3_ROOT, ".packets-")
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
