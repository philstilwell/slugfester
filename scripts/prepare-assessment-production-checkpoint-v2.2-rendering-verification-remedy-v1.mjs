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
  CHECKPOINT_V22_RENDERING_REMEDY_V1_MODEL,
  CHECKPOINT_V22_RENDERING_REMEDY_V1_ORDER,
  CHECKPOINT_V22_RENDERING_REMEDY_V1_PORT,
  CHECKPOINT_V22_RENDERING_REMEDY_V1_PROTOCOL_ID,
  CHECKPOINT_V22_RENDERING_REMEDY_V1_ROOT,
  CHECKPOINT_V22_RENDERING_REMEDY_V1_VIEWPORTS,
  buildCheckpointV22RenderingRemedyV1Packet
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v1.mjs";
import {
  CHECKPOINT_V22_RENDERING_VERIFICATION_PROTOCOL_ID,
  validateCheckpointV22RenderingVerificationPacket
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt =
  frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : new Date().toISOString();
assertV4(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be an ISO timestamp");

const failedRoot =
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification";
const failedPreparationPath = `${failedRoot}/preparation-manifest.json`;
const failedActivationPath = `${failedRoot}/execution-activation.json`;
const failedExecutionPath = `${failedRoot}/execution.json`;
const failedAnalysisPath = `${failedRoot}/analysis.json`;
const syntheticFixturePath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V1_ROOT}/synthetic/preflight.html`;
const syntheticPreflightPath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V1_ROOT}/synthetic/preflight-result.json`;
const controllerDiagnosisPath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V1_ROOT}/synthetic/controller-selection-diagnosis.json`;
const preparationPath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V1_ROOT}/preparation-manifest.json`;
const packetsRoot = `${CHECKPOINT_V22_RENDERING_REMEDY_V1_ROOT}/packets`;
const activationPath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V1_ROOT}/execution-activation.json`;
const executionPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V1_ROOT}/execution.json`;
const analysisPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V1_ROOT}/analysis.json`;
const renderingAuditPath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V1_ROOT}/rendering-audit.json`;
const evidenceRoot = `${CHECKPOINT_V22_RENDERING_REMEDY_V1_ROOT}/evidence`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

assertV4(
  !(await exists(preparationPath)) && !(await exists(packetsRoot)),
  "replacement rendering preparation already exists; freeze is immutable"
);

const [
  failedPreparationBytes,
  failedActivation,
  failedExecution,
  failedAnalysis,
  preflightBytes,
  controllerDiagnosis
] =
  await Promise.all([
    readFile(path.resolve(failedPreparationPath)),
    parse(failedActivationPath),
    parse(failedExecutionPath),
    parse(failedAnalysisPath),
    readFile(path.resolve(syntheticPreflightPath)),
    parse(controllerDiagnosisPath)
  ]);
const failedPreparation = JSON.parse(failedPreparationBytes);
const preflight = JSON.parse(preflightBytes);

assertV4(
  failedPreparation.status === "rendering-verification-plan-prepared-and-frozen" &&
    failedPreparation.protocolId === CHECKPOINT_V22_RENDERING_VERIFICATION_PROTOCOL_ID &&
    failedActivation.status ===
      "rendering-verification-execution-authorized-and-frozen" &&
    failedExecution.status ===
      "ten-debate-rendering-verification-failed-closed-before-first-viewport-result" &&
    failedExecution.finalizedDebateResults === 0 &&
    failedExecution.finalizedViewportResults === 0 &&
    failedExecution.preservedScreenshots === 0 &&
    failedExecution.retriesOfFinalizedViewportResults === 0 &&
    failedExecution.modelContexts === 0 &&
    failedExecution.directCostUsd === 0 &&
    failedExecution.renderingRepairPerformed === false &&
    failedExecution.productionMutationPerformed === false &&
    failedAnalysis.status ===
      "rendering-verification-failed-closed-on-browser-control-process" &&
    failedAnalysis.decision.failedClosed === true &&
    failedAnalysis.decision.partialPassPromotionPermitted === false &&
    failedAnalysis.decision.renderingGatePassed === false &&
    failedAnalysis.gate.viewportResultsPassed === 0 &&
    failedAnalysis.gate.screenshotsPreserved === 0 &&
    failedAnalysis.gate.modelContexts === 0 &&
    failedAnalysis.nextAuthorizedAction ===
      "user-decision-on-rendering-verification-remedy-plan-preparation",
  "failed rendering-verification audit required"
);

for (const [file, digest] of Object.entries(failedPreparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `superseded preparation source hash mismatch: ${file}`
  );
}
assertV4(
  canonicalJson(failedPreparation.explicitOrder) ===
      canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V1_ORDER) &&
    failedPreparation.packets.length === 10 &&
    failedPreparation.gateExpectations.sections === 51 &&
    failedPreparation.gateExpectations.moves === 188 &&
    failedPreparation.gateExpectations.viewportResults === 20 &&
    failedPreparation.gateExpectations.screenshots === 40 &&
    failedPreparation.model.label === CHECKPOINT_V22_RENDERING_REMEDY_V1_MODEL.label &&
    failedPreparation.model.reasoningEffort ===
      CHECKPOINT_V22_RENDERING_REMEDY_V1_MODEL.reasoningEffort &&
    failedPreparation.model.authentication ===
      CHECKPOINT_V22_RENDERING_REMEDY_V1_MODEL.authentication &&
    failedPreparation.model.participantJudgmentWasScoreBlind === true &&
    failedPreparation.compatibilityBoundary.productionMutationBlocked === true,
  "superseded frozen plan changed"
);

assertV4(
  preflight.status === "passed-synthetic-browser-runner-preflight" &&
    preflight.syntheticOnly === true &&
    preflight.canaryCandidateLoaded === false &&
    preflight.screenshotsCaptured === 0 &&
    preflight.browser.name === "Google Chrome via ChatGPT browser extension" &&
    preflight.browser.userAgent.includes("Chrome/") &&
    Object.values(preflight.checks).every(Boolean) &&
    Object.values(preflight.runtime.counts).every((count) => count === 0) &&
    preflight.serviceWorkerRequestObserved === false &&
    preflight.productionMutationPerformed === false,
  "passing synthetic browser-runner preflight required"
);
assertV4(
  controllerDiagnosis.status ===
      "in-app-controller-rejected-chrome-controller-selected" &&
    controllerDiagnosis.developmentDiagnosticOnly === true &&
    controllerDiagnosis.syntheticOnly === true &&
    controllerDiagnosis.canaryCandidateLoaded === false &&
    controllerDiagnosis.screenshotsCaptured === 0 &&
    controllerDiagnosis.rejectedController.name === "Codex In-app Browser" &&
    controllerDiagnosis.rejectedController.nativeKeyboardStateTransitionsPassed ===
      false &&
    controllerDiagnosis.selectedController.name ===
      "Google Chrome via ChatGPT browser extension" &&
    controllerDiagnosis.selectedController.nativeKeyboardStateTransitionsPassed ===
      true &&
    controllerDiagnosis.productionMutationPerformed === false,
  "controller-selection diagnosis changed"
);

const packets = [];
for (const debateNumber of CHECKPOINT_V22_RENDERING_REMEDY_V1_ORDER) {
  const sourceRow = failedPreparation.packets.find(
    (item) => item.debateNumber === debateNumber
  );
  assertV4(sourceRow, `${debateNumber}: superseded packet row missing`);
  const sourcePacketBytes = await readFile(path.resolve(sourceRow.path));
  assertV4(
    sha256(sourcePacketBytes) === sourceRow.sha256 &&
      sourcePacketBytes.length === sourceRow.bytes,
    `${debateNumber}: superseded packet changed`
  );
  const sourcePacket = JSON.parse(sourcePacketBytes);
  validateCheckpointV22RenderingVerificationPacket(sourcePacket);
  const packet = buildCheckpointV22RenderingRemedyV1Packet({
    sourcePacket,
    sourcePacketPath: sourceRow.path,
    sourcePacketSha256: sourceRow.sha256,
    failedExecutionPath,
    failedAnalysisPath
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
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-browser-runner.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v1.mjs",
  "scripts/prepare-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v1.mjs",
  "scripts/preregister-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v1.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v1-preparation.mjs",
  "scripts/validate-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v1-evidence.mjs"
];
const sourceFiles = [...new Set([
  ...Object.keys(failedPreparation.sourceHashes),
  failedPreparationPath,
  failedActivationPath,
  failedExecutionPath,
  failedAnalysisPath,
  syntheticFixturePath,
  syntheticPreflightPath,
  controllerDiagnosisPath,
  ...failedPreparation.packets.map((item) => item.path),
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
  assertV4(
    !(await exists(file)),
    `future replacement rendering output already exists: ${file}`
  );
}

const manifest = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-rendering-verification-remedy-v1-preparation",
  protocolId: CHECKPOINT_V22_RENDERING_REMEDY_V1_PROTOCOL_ID,
  status: "replacement-rendering-verification-remedy-plan-prepared-and-frozen",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: true,
  stagingOnly: true,
  supersedes: {
    protocolId: CHECKPOINT_V22_RENDERING_VERIFICATION_PROTOCOL_ID,
    failedPreparation: failedPreparationPath,
    failedPreparationSha256: sha256(failedPreparationBytes),
    failedActivation: failedActivationPath,
    failedExecution: failedExecutionPath,
    failedAnalysis: failedAnalysisPath,
    priorEvidenceReusePermitted: false
  },
  model: {
    ...CHECKPOINT_V22_RENDERING_REMEDY_V1_MODEL,
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
    failedPreparation: failedPreparationPath,
    failedActivation: failedActivationPath,
    failedExecution: failedExecutionPath,
    failedAnalysis: failedAnalysisPath,
    syntheticFixture: syntheticFixturePath,
    syntheticPreflightResult: syntheticPreflightPath,
    controllerSelectionDiagnosis: controllerDiagnosisPath,
    browserRunner:
      "scripts/lib/assessment-production-checkpoint-v2.2-rendering-browser-runner.mjs"
  },
  syntheticPreflight: {
    status: preflight.status,
    result: syntheticPreflightPath,
    resultSha256: sha256(preflightBytes),
    controller: preflight.browser.name,
    userAgent: preflight.browser.userAgent,
    syntheticOnly: true,
    canaryCandidateLoaded: false,
    screenshotsCaptured: 0,
    serviceWorkerRequestObserved: false,
    runtimeCounts: preflight.runtime.counts
  },
  explicitOrder: CHECKPOINT_V22_RENDERING_REMEDY_V1_ORDER,
  viewports: CHECKPOINT_V22_RENDERING_REMEDY_V1_VIEWPORTS,
  packets: packets.map(({ packetBytes: _packetBytes, packet: _packet, ...row }) => row),
  browserPlan: {
    controller: "Google Chrome via ChatGPT browser extension",
    browserFamily: "Chromium",
    controllerSelection: {
      diagnosis: controllerDiagnosisPath,
      rejectedController: controllerDiagnosis.rejectedController.name,
      rejectedBecauseNativeKeyboardStateTransitionsFailed: true,
      selectedController: controllerDiagnosis.selectedController.name,
      selectedBecauseNativeKeyboardStateTransitionsPassed: true
    },
    exactBrowserNameAndVersionRecordedAtExecution: true,
    localhostOnly: true,
    localServer: {
      command: [
        "python3",
        "-m",
        "http.server",
        String(CHECKPOINT_V22_RENDERING_REMEDY_V1_PORT),
        "--bind",
        "127.0.0.1"
      ],
      workingDirectory: ".",
      port: CHECKPOINT_V22_RENDERING_REMEDY_V1_PORT,
      baseUrl: `http://127.0.0.1:${CHECKPOINT_V22_RENDERING_REMEDY_V1_PORT}`,
      freshOriginRelativeToFailedExecution: true,
      externalNetworkNavigationPermitted: false
    },
    loadSignal: "load",
    elementWait: "attached-plus-positive-client-rects",
    chromiumVersionMethod: "Runtime.evaluate:navigator.userAgent",
    diagnosticSettleMilliseconds: 3000,
    failedRequestIgnoreList: [],
    genuineFailedRequestTolerance: 0,
    failedViewportEvidencePersistence: "none",
    serialExecution: true,
    iterateExplicitOrderArrayDirectly: true,
    viewportOrder: ["desktop", "mobile"],
    freshPagePerViewport: true,
    screenshotsPerViewport: ["collapsed", "open"],
    browserTabsOpenedDuringExecutionMustClose: true,
    localServerMustStopAfterExecution: true
  },
  gateExpectations: {
    debates: 10,
    sections: 51,
    moves: 188,
    pageLoads: 20,
    viewportResults: 20,
    screenshots: 40,
    pointerInteractionTests: 20,
    keyboardEnterTests: 20,
    keyboardSpaceTests: 20,
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
    anyRequiredBooleanCheckFailureFailsEntireGate: true,
    anyNonzeroRuntimeCountFailsEntireGate: true,
    anyHorizontalOverflowFailsEntireGate: true,
    anyMissingOrHashInvalidScreenshotFailsEntireGate: true,
    renderingDefectStopsForDiagnosisOnly: true,
    automaticStyleRepairPermitted: false,
    automaticApplicationRepairPermitted: false,
    retryPermitted: false,
    priorEvidenceReusePermitted: false,
    failedViewportArtifactsMustBeRemoved: true,
    partialPassPromotionPermitted: false,
    productionMutationPermitted: false
  },
  compatibilityBoundary: structuredClone(failedPreparation.compatibilityBoundary),
  artifacts: {
    preparation: preparationPath,
    packetsRoot,
    packets: packets.map((item) => item.path),
    activation: activationPath,
    execution: executionPath,
    analysis: analysisPath,
    renderingAudit: renderingAuditPath,
    evidenceRoot,
    evidence: packets.flatMap((item) =>
      Object.values(item.packet.viewports).flatMap((viewport) =>
        Object.values(viewport.evidence)
      )
    )
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  sourceHashes,
  authorization: {
    replacementRenderingVerificationActivation: false,
    browserControl: false,
    screenshotCapture: false,
    replacementRenderingVerification: false,
    renderingRepair: false,
    compatibilityRemedyPlanPreparation: false,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction:
    "user-decision-on-replacement-rendering-verification-execution-activation"
};

if (shouldWrite) {
  const rootAbs = path.resolve(CHECKPOINT_V22_RENDERING_REMEDY_V1_ROOT);
  await mkdir(rootAbs, { recursive: true });
  const tempRoot = await mkdtemp(path.join(rootAbs, ".remedy-freeze-"));
  try {
    const tempPackets = path.join(tempRoot, "packets");
    await mkdir(tempPackets, { recursive: true });
    for (const item of packets) {
      await writeFile(
        path.join(tempPackets, `debate-${item.debateNumber}.json`),
        item.packetBytes
      );
    }
    await writeFile(
      path.join(tempRoot, "preparation-manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`
    );
    await rename(tempPackets, path.resolve(packetsRoot));
    await rename(
      path.join(tempRoot, "preparation-manifest.json"),
      path.resolve(preparationPath)
    );
    await rm(tempRoot, { recursive: true, force: true });
  } catch (error) {
    await rm(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

console.log(JSON.stringify({
  status: shouldWrite
    ? manifest.status
    : "replacement-rendering-verification-remedy-plan-preview",
  syntheticPreflightPassed: true,
  canaryCandidatesLoadedDuringPreflight: 0,
  debates: 10,
  viewportResults: 20,
  screenshotsPlanned: 40,
  modelContexts: 0,
  directCostUsd: 0,
  replacementRenderingExecuted: false,
  productionMutation: false,
  nextAuthorizedAction: manifest.nextAuthorizedAction
}, null, 2));
