#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT,
  CHECKPOINT_V22_RENDERING_REMEDY_V5_MODEL,
  CHECKPOINT_V22_RENDERING_REMEDY_V5_ORDER,
  CHECKPOINT_V22_RENDERING_REMEDY_V5_PORT,
  CHECKPOINT_V22_RENDERING_REMEDY_V5_PROTOCOL_ID,
  CHECKPOINT_V22_RENDERING_REMEDY_V5_REQUIRED_BOOLEAN_CHECKS,
  CHECKPOINT_V22_RENDERING_REMEDY_V5_ROOT,
  CHECKPOINT_V22_RENDERING_REMEDY_V5_VIEWPORTS,
  buildCheckpointV22RenderingRemedyV5Packet
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v5.mjs";
import {
  validateCheckpointV22RenderingRemedyV4Packet
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v4.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const checkpointIndex = process.argv.indexOf("--checkpoint-commit");
const preparationPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V5_ROOT}/preparation-manifest.json`;
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
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v4";
const priorPreparationPath = `${priorRoot}/preparation-manifest.json`;
const priorActivationPath = `${priorRoot}/execution-activation.json`;
const priorExecutionPath = `${priorRoot}/execution.json`;
const priorAnalysisPath = `${priorRoot}/analysis.json`;
const syntheticRoot = `${CHECKPOINT_V22_RENDERING_REMEDY_V5_ROOT}/synthetic`;
const syntheticFixturePath = `${syntheticRoot}/preflight.html`;
const transportDiagnosisPath = `${syntheticRoot}/screenshot-transport-diagnosis.json`;
const imageContractPath = `${syntheticRoot}/image-analysis-contract.json`;
const navigationContractPath = `${syntheticRoot}/navigation-contract.json`;
const viewportReplayPath = `${syntheticRoot}/viewport-calibration-replay.json`;
const syntheticPreflightPath = `${syntheticRoot}/preflight-result.json`;
const packetsRoot = `${CHECKPOINT_V22_RENDERING_REMEDY_V5_ROOT}/packets`;
const activationPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V5_ROOT}/execution-activation.json`;
const executionPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V5_ROOT}/execution.json`;
const analysisPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V5_ROOT}/analysis.json`;
const renderingAuditPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V5_ROOT}/rendering-audit.json`;
const evidenceRoot = `${CHECKPOINT_V22_RENDERING_REMEDY_V5_ROOT}/evidence`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

if (shouldWrite) {
  assertV4(
    !(await exists(preparationPath)) && !(await exists(packetsRoot)),
    "remedy-v5 preparation already exists; freeze is immutable"
  );
}

const inputPaths = [
  priorPreparationPath,
  priorActivationPath,
  priorExecutionPath,
  priorAnalysisPath,
  syntheticFixturePath,
  transportDiagnosisPath,
  imageContractPath,
  navigationContractPath,
  viewportReplayPath,
  syntheticPreflightPath
];
const inputBytes = Object.fromEntries(await Promise.all(
  inputPaths.map(async (file) => [file, await readFile(path.resolve(file))])
));
const priorPreparation = JSON.parse(inputBytes[priorPreparationPath]);
const priorActivation = JSON.parse(inputBytes[priorActivationPath]);
const priorExecution = JSON.parse(inputBytes[priorExecutionPath]);
const priorAnalysis = JSON.parse(inputBytes[priorAnalysisPath]);
const diagnosis = JSON.parse(inputBytes[transportDiagnosisPath]);
const imageContract = JSON.parse(inputBytes[imageContractPath]);
const navigation = JSON.parse(inputBytes[navigationContractPath]);
const viewportReplay = JSON.parse(inputBytes[viewportReplayPath]);
const preflight = JSON.parse(inputBytes[syntheticPreflightPath]);

assertV4(
  priorPreparation.status ===
      "fourth-replacement-rendering-verification-plan-prepared-and-frozen" &&
    priorActivation.status ===
      "fourth-replacement-rendering-verification-execution-authorized-and-frozen" &&
    priorActivation.preparation.path === priorPreparationPath &&
    priorActivation.preparation.sha256 === sha256(inputBytes[priorPreparationPath]) &&
    priorExecution.status ===
      "fourth-replacement-rendering-verification-failed-closed-on-first-viewport-cdp-screenshot-deadline" &&
    priorExecution.expectedDebates === 10 &&
    priorExecution.expectedViewportResults === 20 &&
    priorExecution.attemptedFailure.debateNumber === "50" &&
    priorExecution.attemptedFailure.viewport === "desktop" &&
    priorExecution.attemptedFailure.phase === "pointer" &&
    priorExecution.attemptedFailure.stage ===
      "capture-collapsed-direct-cdp-png" &&
    priorExecution.attemptedFailure.diagnosticBootstrapHttpStatus === 200 &&
    priorExecution.attemptedFailure.measuredCandidateHttpStatus === 200 &&
    priorExecution.attemptedFailure.directRuntimeReadinessCompleted === true &&
    priorExecution.attemptedFailure.pointerFreshStateObserved === true &&
    priorExecution.attemptedFailure.pointerFreshLayoutMeasured === true &&
    priorExecution.attemptedFailure.initialPublicationDomInspected === true &&
    priorExecution.attemptedFailure.pointerInteractionAttempted === false &&
    priorExecution.attemptedFailure.keyboardPhaseAttempted === false &&
    priorExecution.attemptedFailure.screenshotBytesReturned === false &&
    priorExecution.attemptedFailure.screenshotPersisted === false &&
    priorExecution.attemptedFailure.runtimeCollectionCompleted === false &&
    /Page\.captureScreenshot/.test(priorExecution.attemptedFailure.error) &&
    /3000ms/.test(priorExecution.attemptedFailure.error) &&
    priorExecution.finalizedViewportResults === 0 &&
    priorExecution.preservedScreenshots === 0 &&
    priorExecution.unattemptedViewportResults === 19 &&
    priorExecution.viewportRetries === 0 &&
    priorExecution.candidateNavigationRetries === 0 &&
    priorExecution.modelContexts === 0 &&
    priorExecution.directCostUsd === 0 &&
    priorExecution.renderingContentRegressionEstablished === false &&
    priorExecution.renderingRepairPerformed === false &&
    priorExecution.productionMutationPerformed === false &&
    priorExecution.cleanup.browserTabsClosed === true &&
    priorExecution.cleanup.browserTabsRemaining === 0 &&
    priorExecution.cleanup.viewportOverrideReset === true &&
    priorExecution.cleanup.localServerStopped === true &&
    priorExecution.cleanup.localServerPortClosed === true &&
    priorExecution.cleanup.failedViewportEvidencePersisted === false &&
    priorExecution.cleanup.invalidScreenshotEvidencePersisted === false &&
    priorExecution.cleanup.evidenceRootCreated === false &&
    priorAnalysis.status === priorExecution.status &&
    priorAnalysis.decision.failedClosed === true &&
    priorAnalysis.decision.retryPerformed === false &&
    priorAnalysis.decision.renderingGatePassed === false &&
    priorAnalysis.decision.timeoutExtended === false &&
    priorAnalysis.gate.activationSourceHashReplayPassedBeforeExecution === true &&
    priorAnalysis.gate.packetHashReplayPassedBeforeExecution === true &&
    priorAnalysis.gate.attemptedViewportResults === 1 &&
    priorAnalysis.gate.finalizedViewportResultsPassed === 0 &&
    priorAnalysis.gate.validScreenshotsPreserved === 0 &&
    priorAnalysis.gate.unattemptedViewportResults === 19 &&
    priorAnalysis.gate.renderingContentRegressionEstablished === false &&
    priorAnalysis.nextAuthorizedAction ===
      "user-decision-on-rendering-verification-remedy-v5-plan-preparation",
  "failed remedy-v4 audit required"
);
for (const [file, digest] of Object.entries(priorPreparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `remedy-v4 source hash mismatch: ${file}`
  );
}
assertV4(
  canonicalJson(priorPreparation.explicitOrder) ===
      canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V5_ORDER) &&
    priorPreparation.packets.length === 10 &&
    priorPreparation.gateExpectations.sections === 51 &&
    priorPreparation.gateExpectations.moves === 188 &&
    priorPreparation.model.label === CHECKPOINT_V22_RENDERING_REMEDY_V5_MODEL.label &&
    priorPreparation.model.reasoningEffort ===
      CHECKPOINT_V22_RENDERING_REMEDY_V5_MODEL.reasoningEffort &&
    priorPreparation.model.authentication ===
      CHECKPOINT_V22_RENDERING_REMEDY_V5_MODEL.authentication &&
    priorPreparation.model.participantJudgmentWasScoreBlind === true,
  "remedy-v4 frozen controls changed"
);

assertV4(
  diagnosis.status ===
      "direct-cdp-jpeg-quality-85-selected-after-candidate-png-command-deadline" &&
    diagnosis.syntheticOnly === true &&
    diagnosis.canaryCandidateLoaded === false &&
    diagnosis.failedRemedyV4Transport.method === "CDP Page.captureScreenshot" &&
    diagnosis.failedRemedyV4Transport.format === "png" &&
    diagnosis.failedRemedyV4Transport.attemptedCandidate ===
      "Debate 50 desktop" &&
    diagnosis.failedRemedyV4Transport.candidateHttpStatus === 200 &&
    diagnosis.failedRemedyV4Transport.deadlineMilliseconds === 3000 &&
    diagnosis.failedRemedyV4Transport.screenshotBytesReturned === false &&
    diagnosis.remedyV5Transport.method === "CDP Page.captureScreenshot" &&
    canonicalJson(diagnosis.remedyV5Transport.parameters) === canonicalJson({
      format: "jpeg",
      quality: 85,
      fromSurface: true,
      captureBeyondViewport: false
    }) &&
    diagnosis.remedyV5Transport.exactSignatureHex ===
      CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT.signatureHex &&
    diagnosis.remedyV5Transport.collapsedAndOpenHashesMustDiffer === true &&
    diagnosis.remedyV5Transport.candidatePersistenceBeforeAllGatesPass === false &&
    diagnosis.finalSyntheticCaptureMilliseconds.maximum < 3000 &&
    diagnosis.developmentIncidentsExcludedFromFrozenPreflight.length === 2 &&
    diagnosis.screenshotsPreservedInRepository === 0 &&
    diagnosis.productionMutationPerformed === false,
  "valid remedy-v5 transport diagnosis required"
);
assertV4(
  imageContract.status === "jpeg-screenshot-content-validity-contract-frozen" &&
    imageContract.syntheticOnly === true &&
    imageContract.analyzer.executable ===
      CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT.analyzerPath &&
    imageContract.analyzer.sha256 ===
      CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT.analyzerSha256 &&
    imageContract.perScreenshotRequirements.fileFormat ===
      CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT.format &&
    imageContract.perScreenshotRequirements.exactSignatureHex ===
      CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT.signatureHex &&
    imageContract.perScreenshotRequirements.minimumByteLength ===
      CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT.minimumByteLength &&
    imageContract.perScreenshotRequirements.minimumUniqueColors ===
      CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT.minimumUniqueColors &&
    imageContract.perScreenshotRequirements.minimumEntropy ===
      CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT.minimumEntropy &&
    imageContract.perViewportPairRequirements.collapsedAndOpenSha256MustDiffer === true &&
    imageContract.perViewportPairRequirements.bothScreenshotsMustPassBeforeEvidenceWrite === true &&
    imageContract.failurePolicy.analyzerHashMismatchFailsClosed === true &&
    imageContract.failurePolicy.invalidCandidateCapturePersistencePermitted === false &&
    imageContract.failurePolicy.retryPermitted === false &&
    imageContract.failurePolicy.timeoutExtensionPermitted === false &&
    imageContract.productionMutationPerformed === false &&
    sha256(await readFile(imageContract.analyzer.executable)) ===
      imageContract.analyzer.sha256,
  "frozen image analysis contract or analyzer changed"
);
assertV4(
  navigation.status === "activation-derived-navigation-contract-frozen" &&
    navigation.protocolId === CHECKPOINT_V22_RENDERING_REMEDY_V5_PROTOCOL_ID &&
    navigation.syntheticOnly === true &&
    navigation.canaryCandidateLoaded === false &&
    navigation.token.computedDuringActivation === true &&
    navigation.token.storedInActivation === true &&
    navigation.token.passedToRunner === true &&
    navigation.token.selfHashing === false &&
    navigation.requirements.allFourUrlsUniqueWithinViewport === true &&
    navigation.requirements.allUrlsUniqueAcrossViewports === true &&
    navigation.requirements.pointerAndKeyboardUseSeparateFreshTabs === true &&
    navigation.requirements.httpBootstrapBeforeRawDiagnostics === true &&
    navigation.requirements.reloadPermitted === false &&
    navigation.requirements.adaptiveNavigationRegenerationPermitted === false &&
    navigation.requirements.retryPermitted === false &&
    navigation.requirements.timeoutExtensionPermitted === false &&
    navigation.productionMutationPerformed === false,
  "valid remedy-v5 navigation contract required"
);
for (const [name, expected] of Object.entries(CHECKPOINT_V22_RENDERING_REMEDY_V5_VIEWPORTS)) {
  const replay = viewportReplay.viewports[name];
  const result = preflight.viewports[name];
  assertV4(
    canonicalJson(replay.targetCssViewport) === canonicalJson(expected.targetCssViewport) &&
      canonicalJson(replay.controllerInput) === canonicalJson(expected.controllerInput) &&
      replay.cssViewportExact === true &&
      replay.screenshotEqualsControllerInput === true &&
      replay.screenshotEqualsRoundedCssTimesDevicePixelRatio === true &&
      canonicalJson(result.targetCssViewport) === canonicalJson(expected.targetCssViewport) &&
      canonicalJson(result.controllerInput) === canonicalJson(expected.controllerInput) &&
      Object.values(result.checks).every(Boolean) &&
      result.collapsed.format === "JPEG" &&
      result.open.format === "JPEG" &&
      result.collapsed.signatureHex === CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT.signatureHex &&
      result.open.signatureHex === CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT.signatureHex &&
      result.collapsed.bytes >= CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT.minimumByteLength &&
      result.open.bytes >= CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT.minimumByteLength &&
      result.collapsed.uniqueColors >= CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT.minimumUniqueColors &&
      result.open.uniqueColors >= CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT.minimumUniqueColors &&
      result.collapsed.entropy >= CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT.minimumEntropy &&
      result.open.entropy >= CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT.minimumEntropy &&
      result.collapsed.sha256 !== result.open.sha256,
    `${name}: passing remedy-v5 synthetic viewport required`
  );
}
assertV4(
  viewportReplay.status ===
      "prior-passing-css-viewport-calibration-retained-and-jpeg-pixels-reconciled" &&
    viewportReplay.syntheticOnly === true &&
    viewportReplay.canaryCandidateLoaded === false &&
    viewportReplay.adaptiveCalibrationDuringExecution === false &&
    preflight.status ===
      "passed-direct-jpeg-capture-readiness-runtime-and-native-interaction-preflight" &&
    preflight.syntheticOnly === true &&
    preflight.canaryCandidateLoaded === false &&
    /^[a-f0-9]{64}$/.test(preflight.fixture.navigationToken) &&
    preflight.fixture.httpBootstrapBeforeRawDiagnostics === true &&
    preflight.runtimeCounts.consoleErrors === 0 &&
    preflight.runtimeCounts.consoleWarnings === 0 &&
    preflight.runtimeCounts.pageErrors === 0 &&
    preflight.runtimeCounts.failedRequests === 0 &&
    preflight.screenshotsPreservedInRepository === 0 &&
    preflight.productionMutationPerformed === false,
  "complete passing remedy-v5 synthetic preflight required"
);

const packets = [];
for (const debateNumber of CHECKPOINT_V22_RENDERING_REMEDY_V5_ORDER) {
  const sourceRow = priorPreparation.packets.find(
    (item) => item.debateNumber === debateNumber
  );
  assertV4(sourceRow, `${debateNumber}: remedy-v4 packet row missing`);
  const sourcePacketBytes = await readFile(path.resolve(sourceRow.path));
  assertV4(
    sha256(sourcePacketBytes) === sourceRow.sha256 &&
      sourcePacketBytes.length === sourceRow.bytes,
    `${debateNumber}: remedy-v4 packet changed`
  );
  const sourcePacket = JSON.parse(sourcePacketBytes);
  validateCheckpointV22RenderingRemedyV4Packet(sourcePacket);
  const packet = buildCheckpointV22RenderingRemedyV5Packet({
    sourcePacket,
    sourcePacketPath: sourceRow.path,
    sourcePacketSha256: sourceRow.sha256,
    failedExecutionPath: priorExecutionPath,
    failedAnalysisPath: priorAnalysisPath,
    syntheticBootstrapPath: syntheticFixturePath,
    imageAnalysisContractPath: imageContractPath
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
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-browser-runner-v5.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v5.mjs",
  "scripts/prepare-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v5.mjs",
  "scripts/preregister-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v5.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v5-preparation.mjs",
  "scripts/validate-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v5-evidence.mjs"
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
  assertV4(!(await exists(file)), `future remedy-v5 output already exists: ${file}`);
}
const plannedEvidencePaths = packets.flatMap((row) =>
  Object.values(row.packet.viewports).flatMap((viewport) => [
    viewport.evidence.result,
    viewport.evidence.collapsedScreenshot,
    viewport.evidence.openScreenshot
  ])
);

const manifest = {
  schemaVersion: "1.0-production-checkpoint-v2.2-rendering-remedy-v5-preparation",
  protocolId: CHECKPOINT_V22_RENDERING_REMEDY_V5_PROTOCOL_ID,
  status: "fifth-replacement-rendering-verification-plan-prepared-and-frozen",
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
    ...CHECKPOINT_V22_RENDERING_REMEDY_V5_MODEL,
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
    screenshotTransportDiagnosis: transportDiagnosisPath,
    imageAnalysisContract: imageContractPath,
    navigationContract: navigationContractPath,
    viewportCalibrationReplay: viewportReplayPath,
    syntheticPreflightResult: syntheticPreflightPath,
    browserRunner:
      "scripts/lib/assessment-production-checkpoint-v2.2-rendering-browser-runner-v5.mjs"
  },
  syntheticPreflight: {
    status: preflight.status,
    screenshotTransportDiagnosis: transportDiagnosisPath,
    screenshotTransportDiagnosisSha256: sha256(inputBytes[transportDiagnosisPath]),
    imageAnalysisContract: imageContractPath,
    imageAnalysisContractSha256: sha256(inputBytes[imageContractPath]),
    navigationContract: navigationContractPath,
    navigationContractSha256: sha256(inputBytes[navigationContractPath]),
    viewportCalibrationReplay: viewportReplayPath,
    viewportCalibrationReplaySha256: sha256(inputBytes[viewportReplayPath]),
    result: syntheticPreflightPath,
    resultSha256: sha256(inputBytes[syntheticPreflightPath]),
    controller: preflight.browser.name,
    userAgentVersion: preflight.browser.userAgentVersion,
    syntheticOnly: true,
    canaryCandidateLoaded: false,
    screenshotsPreservedInRepository: 0,
    viewportTargetsPassed: 2,
    directJpegScreenshotsPassed: 4,
    pointerAndKeyboardInteractionPhasesPassed: 4
  },
  explicitOrder: [...CHECKPOINT_V22_RENDERING_REMEDY_V5_ORDER],
  viewports: structuredClone(CHECKPOINT_V22_RENDERING_REMEDY_V5_VIEWPORTS),
  requiredBooleanChecks: [...CHECKPOINT_V22_RENDERING_REMEDY_V5_REQUIRED_BOOLEAN_CHECKS],
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
        String(CHECKPOINT_V22_RENDERING_REMEDY_V5_PORT),
        "--bind",
        "127.0.0.1"
      ],
      workingDirectory: ".",
      port: CHECKPOINT_V22_RENDERING_REMEDY_V5_PORT,
      baseUrl: `http://127.0.0.1:${CHECKPOINT_V22_RENDERING_REMEDY_V5_PORT}`,
      freshOriginRelativeToRemedyV4: true,
      externalNetworkNavigationPermitted: false
    },
    activationDerivedNavigationTokenRequired: true,
    navigationContract: navigationContractPath,
    viewportContract: {
      targetsAreCssPixels: true,
      controllerInputsAreFrozenOuterWindowPixels: true,
      adaptiveCalibrationDuringExecution: false,
      exactObservedInnerWidthAndHeightRequiredForEveryMeasuredPhase: true,
      screenshotPixelsMustEqualControllerInput: true,
      screenshotPixelsMustEqualRoundedCssViewportTimesDevicePixelRatio: true,
      overflowComparedToObservedInnerWidth: true
    },
    accordionStateContract: {
      stateAuthority: "native-details-open-property",
      openAttributeCorroborationRequired: true,
      contentVisibilityGate: "element-from-point-hit-test-after-summary-scroll",
      contentClientRectsUse: "diagnostic-only-never-gating",
      readinessMethod:
        "single-CDP-Runtime.evaluate-after-frozen-post-load-settle",
      postLoadSettleMilliseconds: 1000,
      pointerMethod:
        "CDP-Input.dispatchMouseEvent-at-serialized-summary-center",
      keyboardMethod:
        "locator.press-after-direct-CDP-readiness-and-focus",
      rawStatesSerializedPerViewport: [
        "pointerFresh",
        "pointerOpen",
        "keyboardFresh",
        "keyboardAfterEnter",
        "keyboardAfterSpace"
      ]
    },
    screenshotContract: {
      method: "CDP-Page.captureScreenshot",
      parameters: {
        format: "jpeg",
        quality: 85,
        fromSurface: true,
        captureBeyondViewport: false
      },
      analyzer: structuredClone(imageContract.analyzer),
      imageContract: structuredClone(CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT),
      collapsedAndOpenHashesMustDiffer: true,
      analysisOccursBeforePersistence: true,
      bothScreenshotsMustPassBeforeEvidenceWrite: true
    },
    diagnosticBootstrap: {
      path: syntheticFixturePath,
      purpose:
        "attach direct diagnostics on a unique HTTP document before candidate navigation",
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
    validJpegScreenshots: 40,
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
    anyPageLoadFailureFailsEntireGate: true,
    anyDirectReadinessFailureFailsEntireGate: true,
    anyActualViewportMismatchFailsEntireGate: true,
    anyRequiredBooleanCheckFailureFailsEntireGate: true,
    anyNativeOpenStateMismatchFailsEntireGate: true,
    anyOpenAttributeCorroborationMismatchFailsEntireGate: true,
    anyHitTestVisibilityMismatchFailsEntireGate: true,
    childClientRectCountCanNeverFailGate: true,
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
    adaptiveThresholdsPermitted: false,
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
    remedyV5PlanPreparation: true,
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
    "user-decision-on-rendering-verification-remedy-v5-execution-activation"
};

if (shouldWrite) {
  await mkdir(path.resolve(CHECKPOINT_V22_RENDERING_REMEDY_V5_ROOT), {
    recursive: true
  });
  const temporaryPackets = await mkdtemp(
    path.resolve(CHECKPOINT_V22_RENDERING_REMEDY_V5_ROOT, ".packets-")
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
