#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_RENDERING_REMEDY_V9_IMAGE_CONTRACT,
  CHECKPOINT_V22_RENDERING_REMEDY_V9_MODEL,
  CHECKPOINT_V22_RENDERING_REMEDY_V9_ORDER,
  CHECKPOINT_V22_RENDERING_REMEDY_V9_PORT,
  CHECKPOINT_V22_RENDERING_REMEDY_V9_PROTOCOL_ID,
  CHECKPOINT_V22_RENDERING_REMEDY_V9_REQUIRED_BOOLEAN_CHECKS,
  CHECKPOINT_V22_RENDERING_REMEDY_V9_ROOT,
  CHECKPOINT_V22_RENDERING_REMEDY_V9_VIEWPORTS,
  buildCheckpointV22RenderingRemedyV9Packet
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v9.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const checkpointIndex = process.argv.indexOf("--checkpoint-commit");
const preparationPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V9_ROOT}/preparation-manifest.json`;
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
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v8";
const priorPreparationPath = `${priorRoot}/preparation-manifest.json`;
const priorActivationPath = `${priorRoot}/execution-activation.json`;
const priorExecutionPath = `${priorRoot}/execution.json`;
const priorAnalysisPath = `${priorRoot}/analysis.json`;
const priorFailureTestPath =
  "scripts/test-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v8-failure.mjs";
const navigationContractPath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V9_ROOT}/synthetic/fresh-keyboard-navigation-contract.json`;
const syntheticPreflightPath =
  `${CHECKPOINT_V22_RENDERING_REMEDY_V9_ROOT}/synthetic/preflight-result.json`;
const packetsRoot = `${CHECKPOINT_V22_RENDERING_REMEDY_V9_ROOT}/packets`;
const activationPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V9_ROOT}/execution-activation.json`;
const executionPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V9_ROOT}/execution.json`;
const analysisPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V9_ROOT}/analysis.json`;
const renderingAuditPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V9_ROOT}/rendering-audit.json`;
const evidenceRoot = `${CHECKPOINT_V22_RENDERING_REMEDY_V9_ROOT}/evidence`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

if (shouldWrite) {
  assertV4(
    !(await exists(preparationPath)) && !(await exists(packetsRoot)),
    "remedy-v9 preparation already exists; freeze is immutable"
  );
}

const directInputPaths = [
  priorPreparationPath,
  priorActivationPath,
  priorExecutionPath,
  priorAnalysisPath,
  priorFailureTestPath,
  navigationContractPath,
  syntheticPreflightPath,
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-navigation-fresh-tab-v9.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-synthetic-preflight-v9.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v9.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-browser-runner-v9.mjs",
  "scripts/prepare-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v9.mjs",
  "scripts/preregister-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v9.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v9-preparation.mjs",
  "scripts/validate-assessment-production-checkpoint-v2.2-rendering-verification-remedy-v9-evidence.mjs"
];
const directBytes = Object.fromEntries(await Promise.all(
  directInputPaths.map(async (file) => [file, await readFile(path.resolve(file))])
));
const priorPreparation = JSON.parse(directBytes[priorPreparationPath]);
const priorActivation = JSON.parse(directBytes[priorActivationPath]);
const priorExecution = JSON.parse(directBytes[priorExecutionPath]);
const priorAnalysis = JSON.parse(directBytes[priorAnalysisPath]);
const navigationContract = JSON.parse(directBytes[navigationContractPath]);
const syntheticPreflight = JSON.parse(directBytes[syntheticPreflightPath]);

assertV4(
  priorPreparation.status ===
      "eighth-replacement-rendering-verification-plan-prepared-and-frozen" &&
    priorActivation.status ===
      "eighth-replacement-rendering-verification-execution-authorized-and-frozen" &&
    priorExecution.status ===
      "eighth-replacement-rendering-verification-failed-closed-on-first-viewport-keyboard-measured-load-observation-timeout" &&
    priorExecution.attemptedViewportResults === 1 &&
    priorExecution.passingViewportEvidenceResults === 0 &&
    priorExecution.persistedScreenshots === undefined &&
    priorExecution.browserEvidence.persistedScreenshots === 0 &&
    priorExecution.browserControllerLoadObservationFailureEstablished === true &&
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
      "user-decision-on-rendering-verification-remedy-v9-plan-preparation",
  "failed remedy-v8 audit required"
);
assertV4(
  navigationContract.status ===
      "fresh-keyboard-tab-location-assign-transport-selected" &&
    navigationContract.syntheticOnly === true &&
    navigationContract.canaryCandidateLoaded === false &&
    navigationContract.navigation.initialPageNavigateCallsPerViewport === 1 &&
    navigationContract.navigation.runtimeLocationAssignCallsPerViewport === 1 &&
    navigationContract.navigation.deadlineMilliseconds === 15000 &&
    navigationContract.navigation.retryPermitted === false &&
    navigationContract.navigation.timeoutExtensionPermitted === false &&
    navigationContract.requirements.priorPassingEvidenceReusePermitted === false &&
    navigationContract.screenshotsPreservedInRepository === 0 &&
    navigationContract.productionMutationPerformed === false &&
    syntheticPreflight.status ===
      "passed-twenty-viewport-fresh-keyboard-location-assign-synthetic-rehearsal" &&
    syntheticPreflight.syntheticOnly === true &&
    syntheticPreflight.gate.viewportResults === 20 &&
    syntheticPreflight.gate.desktopViewportResults === 10 &&
    syntheticPreflight.gate.mobileViewportResults === 10 &&
    syntheticPreflight.gate.passingViewportResults === 20 &&
    syntheticPreflight.gate.requiredBooleanChecksPassed === 320 &&
    syntheticPreflight.gate.screenshots === 40 &&
    syntheticPreflight.gate.validJpegSignatures === 40 &&
    syntheticPreflight.gate.collapsedOpenPairsWithDifferentHashes === 20 &&
    syntheticPreflight.gate.initialPageNavigateCalls === 20 &&
    syntheticPreflight.gate.runtimeLocationAssignCalls === 20 &&
    syntheticPreflight.navigationTimingsMilliseconds
      .runtimeLocationAssignExactUrlReadyState.maximum < 15000 &&
    Object.values(syntheticPreflight.gate.runtimeCounts).every((value) => value === 0) &&
    syntheticPreflight.executionDiscipline.retryPerformed === false &&
    syntheticPreflight.executionDiscipline.timeoutExtended === false &&
    syntheticPreflight.executionDiscipline.candidatePagesLoaded === 0 &&
    syntheticPreflight.executionDiscipline.modelContexts === 0 &&
    syntheticPreflight.executionDiscipline.directCostUsd === 0 &&
    syntheticPreflight.screenshotsPreservedInRepository === 0 &&
    syntheticPreflight.productionMutationPerformed === false,
  "passing remedy-v9 synthetic rehearsal required"
);
for (const [name, viewport] of Object.entries(CHECKPOINT_V22_RENDERING_REMEDY_V9_VIEWPORTS)) {
  assertV4(
    canonicalJson(navigationContract.viewports[name]) === canonicalJson(viewport),
    `${name}: remedy-v9 viewport contract changed`
  );
}

const sourceHashes = { ...priorPreparation.sourceHashes };
for (const [file, bytes] of Object.entries(directBytes)) {
  sourceHashes[file] = sha256(bytes);
}
for (const [file, digest] of Object.entries(sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `remedy-v9 source hash mismatch: ${file}`
  );
}
assertV4(
  sha256(await readFile(CHECKPOINT_V22_RENDERING_REMEDY_V9_IMAGE_CONTRACT.analyzerPath)) ===
    CHECKPOINT_V22_RENDERING_REMEDY_V9_IMAGE_CONTRACT.analyzerSha256,
  "frozen image analyzer changed"
);

const priorRowsByDebate = new Map(
  priorPreparation.packets.map((row) => [row.debateNumber, row])
);
const packetArtifacts = [];
for (const debateNumber of CHECKPOINT_V22_RENDERING_REMEDY_V9_ORDER) {
  const priorRow = priorRowsByDebate.get(debateNumber);
  assertV4(priorRow, `${debateNumber}: remedy-v8 packet row missing`);
  const sourcePacketBytes = await readFile(path.resolve(priorRow.path));
  assertV4(
    sha256(sourcePacketBytes) === priorRow.sha256,
    `${debateNumber}: remedy-v8 packet hash mismatch`
  );
  const packet = buildCheckpointV22RenderingRemedyV9Packet({
    sourcePacket: JSON.parse(sourcePacketBytes),
    sourcePacketPath: priorRow.path,
    sourcePacketSha256: priorRow.sha256,
    failedExecutionPath: priorExecutionPath,
    failedAnalysisPath: priorAnalysisPath,
    syntheticPreflightPath,
    navigationContractPath
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
    "1.0-production-checkpoint-v2.2-rendering-remedy-v9-preparation",
  protocolId: CHECKPOINT_V22_RENDERING_REMEDY_V9_PROTOCOL_ID,
  status: "ninth-replacement-rendering-verification-plan-prepared-and-frozen",
  frozenAt,
  checkpointCommit,
  productionCanary: true,
  stagingOnly: true,
  model: {
    ...CHECKPOINT_V22_RENDERING_REMEDY_V9_MODEL,
    participantJudgmentWasScoreBlind: true,
    roundedIntegerScoreTiesPermitted: true,
    modelExecutionPlanned: false
  },
  explicitOrder: [...CHECKPOINT_V22_RENDERING_REMEDY_V9_ORDER],
  viewports: structuredClone(CHECKPOINT_V22_RENDERING_REMEDY_V9_VIEWPORTS),
  requiredBooleanChecks: [...CHECKPOINT_V22_RENDERING_REMEDY_V9_REQUIRED_BOOLEAN_CHECKS],
  inputs: {
    priorPreparation: priorPreparationPath,
    priorActivation: priorActivationPath,
    failedExecution: priorExecutionPath,
    failedAnalysis: priorAnalysisPath,
    priorFailureTest: priorFailureTestPath,
    freshKeyboardNavigationContract: navigationContractPath,
    syntheticPreflightResult: syntheticPreflightPath
  },
  packets: packetArtifacts.map(({ serialized, ...row }) => row),
  browserPlan: {
    ...structuredClone(priorPreparation.browserPlan),
    controller: "split-Chromium-fresh-keyboard-location-assign-transport",
    localServer: {
      command: ["python3", "-m", "http.server", String(CHECKPOINT_V22_RENDERING_REMEDY_V9_PORT), "--bind", "127.0.0.1"],
      workingDirectory: ".",
      port: CHECKPOINT_V22_RENDERING_REMEDY_V9_PORT,
      baseUrl: `http://127.0.0.1:${CHECKPOINT_V22_RENDERING_REMEDY_V9_PORT}`,
      externalNetworkNavigationPermitted: false
    },
    hybridContract: undefined,
    freshKeyboardNavigationContract: navigationContractPath,
    syntheticPreflight: syntheticPreflightPath,
    keyboardNavigation: {
      freshTabPerViewport: true,
      bootstrapMethod: "Page.navigate-once-per-fresh-keyboard-tab",
      measuredMethod:
        "Runtime.evaluate-location.assign-with-exact-url-readyState-poll",
      exactLoadedUrlRequired: true,
      requiredReadyState: "complete",
      pollMilliseconds: 50,
      deadlineMilliseconds: 15000,
      secondControllerLoadSignalRequired: false,
      retryPermitted: false,
      timeoutExtensionPermitted: false
    }
  },
  gateExpectations: {
    ...structuredClone(priorPreparation.gateExpectations),
    keyboardInitialPageNavigateCalls: 20,
    keyboardRuntimeLocationAssignCalls: 20,
    keyboardExactUrlReadyStatePasses: 20,
    keyboardNavigationDeadlineMilliseconds: 15000
  },
  failurePolicy: {
    ...structuredClone(priorPreparation.failurePolicy),
    anyKeyboardExactUrlOrReadyStateDeadlineFailsEntireGate: true,
    secondControllerLoadSignalRequired: false,
    retryPermitted: false,
    timeoutExtensionPermitted: false,
    adaptiveNavigationRegenerationPermitted: false,
    priorEvidenceReusePermitted: false,
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
    remedyV9PlanPreparation: true,
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
    "user-decision-on-rendering-verification-remedy-v9-execution-activation"
};
delete preparation.browserPlan.hybridContract;

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
