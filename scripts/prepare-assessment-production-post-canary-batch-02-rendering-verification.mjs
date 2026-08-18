#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_02_RENDERING_IMAGE_CONTRACT,
  POST_CANARY_BATCH_02_RENDERING_MODEL,
  POST_CANARY_BATCH_02_RENDERING_ORDER,
  POST_CANARY_BATCH_02_RENDERING_PORT,
  POST_CANARY_BATCH_02_RENDERING_PROTOCOL_ID,
  POST_CANARY_BATCH_02_RENDERING_REQUIRED_BOOLEAN_CHECKS,
  POST_CANARY_BATCH_02_RENDERING_ROOT,
  POST_CANARY_BATCH_02_RENDERING_VIEWPORTS,
  buildPostCanaryBatch02RenderingPacket
} from "./lib/assessment-production-post-canary-batch-02-rendering-verification.mjs";
import {
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION_INSTRUCTION,
  loadAndValidatePostCanaryBatch02StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-02-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const checkpointIndex = process.argv.indexOf("--checkpoint-commit");
const preparationPath = `${POST_CANARY_BATCH_02_RENDERING_ROOT}/preparation-manifest.json`;
const existingPreparation = await access(path.resolve(preparationPath))
  .then(() => readFile(path.resolve(preparationPath), "utf8").then(JSON.parse))
  .catch(() => null);
const frozenAt =
  frozenAtIndex >= 0
    ? process.argv[frozenAtIndex + 1]
    : existingPreparation?.frozenAt ?? new Date().toISOString();
const checkpointCommitInput =
  checkpointIndex >= 0
    ? process.argv[checkpointIndex + 1]
    : existingPreparation?.checkpointCommit ??
      execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
assertV4(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be ISO time");
const checkpointCommit = execFileSync(
  "git",
  ["rev-parse", "--verify", `${checkpointCommitInput}^{commit}`],
  { encoding: "utf8" }
).trim();
assertV4(/^[a-f0-9]{40}$/.test(checkpointCommit), "invalid checkpoint commit");

const FINALIZATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-02/publication-finalization";
const FINALIZATION_PREPARATION = `${FINALIZATION_ROOT}/preparation-manifest.json`;
const FINALIZATION_ACTIVATION = `${FINALIZATION_ROOT}/execution-activation.json`;
const FINALIZATION_EXECUTION = `${FINALIZATION_ROOT}/execution.json`;
const FINALIZATION_ANALYSIS = `${FINALIZATION_ROOT}/analysis.json`;
const FINALIZATION_COMPATIBILITY = `${FINALIZATION_ROOT}/compatibility-analysis.json`;
const FINALIZATION_AUDIT = `${FINALIZATION_ROOT}/output-bundle/finalization-audit.json`;
const PREVIEW = `${FINALIZATION_ROOT}/output-bundle/previews/index.html`;
const PROVEN_ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v9";
const PROVEN_ANALYSIS = `${PROVEN_ROOT}/analysis.json`;
const PROVEN_AUDIT = `${PROVEN_ROOT}/rendering-audit.json`;
const PROVEN_NAVIGATION =
  `${PROVEN_ROOT}/synthetic/fresh-keyboard-navigation-contract.json`;
const PROVEN_PREFLIGHT = `${PROVEN_ROOT}/synthetic/preflight-result.json`;
const PACKETS_ROOT = `${POST_CANARY_BATCH_02_RENDERING_ROOT}/packets`;
const EVIDENCE_ROOT = `${POST_CANARY_BATCH_02_RENDERING_ROOT}/evidence`;
const ACTIVATION = `${POST_CANARY_BATCH_02_RENDERING_ROOT}/execution-activation.json`;
const EXECUTION = `${POST_CANARY_BATCH_02_RENDERING_ROOT}/execution.json`;
const ANALYSIS = `${POST_CANARY_BATCH_02_RENDERING_ROOT}/analysis.json`;
const RENDERING_AUDIT = `${POST_CANARY_BATCH_02_RENDERING_ROOT}/rendering-audit.json`;
const IMAGE_ANALYZER = POST_CANARY_BATCH_02_RENDERING_IMAGE_CONTRACT.analyzerPath;
const IMAGE_MAGICK = "/opt/homebrew/bin/magick";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const exists = (file) =>
  access(path.resolve(file)).then(
    () => true,
    () => false
  );
const standingAuthorization =
  await loadAndValidatePostCanaryBatch02StandingAuthorization();

if (shouldWrite) {
  assertV4(
    !(await exists(preparationPath)) && !(await exists(PACKETS_ROOT)),
    "Batch 2 rendering preparation already exists; freeze is immutable"
  );
}

const [
  finalizationPreparation,
  finalizationActivation,
  finalizationExecution,
  finalizationAnalysis,
  compatibility,
  finalizationAudit,
  provenAnalysis,
  provenAudit,
  provenNavigation,
  provenPreflight,
  previewBytes
] = await Promise.all([
  parse(FINALIZATION_PREPARATION),
  parse(FINALIZATION_ACTIVATION),
  parse(FINALIZATION_EXECUTION),
  parse(FINALIZATION_ANALYSIS),
  parse(FINALIZATION_COMPATIBILITY),
  parse(FINALIZATION_AUDIT),
  parse(PROVEN_ANALYSIS),
  parse(PROVEN_AUDIT),
  parse(PROVEN_NAVIGATION),
  parse(PROVEN_PREFLIGHT),
  readFile(path.resolve(PREVIEW))
]);

assertV4(
  finalizationPreparation.status ===
      "frozen-post-canary-batch-02-publication-finalization-prepared-not-authorized" &&
    finalizationActivation.status ===
      "frozen-post-canary-batch-02-publication-finalization-authorized" &&
    finalizationExecution.status ===
      "ten-debate-batch-02-publication-finalization-passed" &&
    finalizationExecution.deterministicFinalizationPasses === 1 &&
    finalizationExecution.reruns === 0 &&
    finalizationAnalysis.status ===
      "ten-debate-batch-02-publication-finalization-passed" &&
    finalizationAnalysis.authorization.renderingVerificationPreparation === true &&
    finalizationAnalysis.authorization.renderingVerification === false &&
    compatibility.status === "batch-02-production-compatibility-boundary-recorded" &&
    compatibility.findings.length === 1 &&
    compatibility.findings[0].blocksRenderingVerification === false &&
    compatibility.findings[0].blocksProductionMutation === true &&
    finalizationAudit.status ===
      "passed-ten-debate-batch-02-publication-finalization" &&
    canonicalJson(finalizationAudit.explicitOrder) ===
      canonicalJson(POST_CANARY_BATCH_02_RENDERING_ORDER) &&
    finalizationAudit.rows.length === 10 &&
    finalizationAudit.totals.debates === 10 &&
    finalizationAudit.totals.sections === 51 &&
    finalizationAudit.totals.moves === 190 &&
    finalizationAudit.totals.deterministicFinalizationPasses === 1 &&
    finalizationAudit.totals.reruns === 0 &&
    finalizationAudit.totals.modelContexts === 0 &&
    finalizationAudit.totals.paidServiceCalls === 0 &&
    finalizationAudit.totals.directIncrementalCostUsd === 0,
  "passing Batch 2 publication finalization required"
);
assertV4(
  provenAnalysis.status === "ninth-replacement-rendering-verification-passed" &&
    provenAnalysis.decision.renderingGatePassed === true &&
    provenAnalysis.decision.tenDebatesPassed === true &&
    provenAnalysis.decision.desktopAndMobilePassed === true &&
    provenAnalysis.decision.pointerAndKeyboardPassed === true &&
    provenAnalysis.decision.imageContractPassed === true &&
    provenAnalysis.decision.runtimeGatePassed === true &&
    provenAnalysis.decision.retryPerformed === false &&
    provenAnalysis.decision.timeoutExtended === false &&
    provenAudit.status === "passed-ten-debate-remedy-v9-rendering-verification" &&
    provenAudit.totals.viewportResults === 20 &&
    provenAudit.totals.screenshots === 40 &&
    provenAudit.totals.requiredBooleanChecks === 760 &&
    provenAudit.totals.browserDocumentLoads === 80 &&
    provenAudit.totals.retries === 0 &&
    provenAudit.totals.timeoutExtensions === 0 &&
    provenAudit.totals.directCostUsd === 0 &&
    provenNavigation.status ===
      "fresh-keyboard-tab-location-assign-transport-selected" &&
    provenNavigation.navigation.deadlineMilliseconds === 15000 &&
    provenNavigation.navigation.retryPermitted === false &&
    provenNavigation.navigation.timeoutExtensionPermitted === false &&
    provenNavigation.requirements.priorPassingEvidenceReusePermitted === false &&
    provenPreflight.status ===
      "passed-twenty-viewport-fresh-keyboard-location-assign-synthetic-rehearsal" &&
    provenPreflight.executionDiscipline.candidatePagesLoaded === 0 &&
    provenPreflight.executionDiscipline.retryPerformed === false &&
    provenPreflight.executionDiscipline.timeoutExtended === false,
  "passing frozen v9 browser transport evidence required"
);

for (const [name, viewport] of Object.entries(
  POST_CANARY_BATCH_02_RENDERING_VIEWPORTS
)) {
  assertV4(
    canonicalJson(provenNavigation.viewports[name]) === canonicalJson(viewport),
    `${name}: proven rendering viewport contract changed`
  );
}

const previewSha256 = sha256(previewBytes);
const provenTransport = {
  status: "passed-ten-debate-v9-transport-reference-only",
  analysis: { path: PROVEN_ANALYSIS, sha256: sha256(await readFile(PROVEN_ANALYSIS)) },
  renderingAudit: { path: PROVEN_AUDIT, sha256: sha256(await readFile(PROVEN_AUDIT)) },
  freshKeyboardNavigationContract: {
    path: PROVEN_NAVIGATION,
    sha256: sha256(await readFile(PROVEN_NAVIGATION))
  },
  syntheticPreflight: {
    path: PROVEN_PREFLIGHT,
    sha256: sha256(await readFile(PROVEN_PREFLIGHT))
  },
  historicalCandidateEvidenceReused: false
};

const packetArtifacts = [];
for (const debateNumber of POST_CANARY_BATCH_02_RENDERING_ORDER) {
  const auditRow = finalizationAudit.rows.find(
    (row) => row.debateNumber === debateNumber
  );
  assertV4(auditRow, `${debateNumber}: finalization audit row missing`);
  const [candidateBytes, provenanceBytes] = await Promise.all([
    readFile(path.resolve(auditRow.finalCandidate)),
    readFile(path.resolve(auditRow.provenance))
  ]);
  assertV4(
    sha256(candidateBytes) === auditRow.finalCandidateSha256 &&
      sha256(provenanceBytes) === auditRow.provenanceSha256,
    `${debateNumber}: finalized candidate or provenance hash changed`
  );
  const packet = buildPostCanaryBatch02RenderingPacket({
    auditRow,
    candidate: JSON.parse(candidateBytes),
    provenance: JSON.parse(provenanceBytes),
    previewPath: PREVIEW,
    previewSha256,
    provenTransport
  });
  const outputPath = `${PACKETS_ROOT}/debate-${debateNumber}.json`;
  const serialized = `${JSON.stringify(packet, null, 2)}\n`;
  packetArtifacts.push({
    debateNumber,
    debateId: packet.debateId,
    path: outputPath,
    sha256: sha256(serialized),
    bytes: Buffer.byteLength(serialized),
    candidate: packet.candidate,
    serialized
  });
}

const directInputPaths = [
  FINALIZATION_PREPARATION,
  FINALIZATION_ACTIVATION,
  FINALIZATION_EXECUTION,
  FINALIZATION_ANALYSIS,
  FINALIZATION_COMPATIBILITY,
  FINALIZATION_AUDIT,
  PREVIEW,
  PROVEN_ANALYSIS,
  PROVEN_AUDIT,
  PROVEN_NAVIGATION,
  PROVEN_PREFLIGHT,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-production/manifest-v1.json",
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json",
  "docs/assessment-production/post-canary-continuation-v1/batch-02/selection.json",
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
  "src/app.js",
  "src/styles.css",
  "src/data/debates.js",
  "src/data/references.js",
  "scripts/validate-debates.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v6.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-browser-runner-v6.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v9.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-browser-runner-v9.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-navigation-fresh-tab-v9.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-publication-finalization.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-standing-authorization.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-rendering-verification.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-rendering-browser-runner.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-02-rendering-verification.mjs",
  "scripts/activate-assessment-production-post-canary-batch-02-rendering-verification.mjs",
  "scripts/finalize-assessment-production-post-canary-batch-02-rendering-verification.mjs",
  "scripts/test-assessment-production-post-canary-batch-02-rendering-verification-preparation.mjs",
  "scripts/validate-assessment-production-post-canary-batch-02-rendering-evidence.mjs",
  ...finalizationAudit.rows.flatMap((row) => [row.finalCandidate, row.provenance])
];
const sourceHashes = {};
for (const file of [...new Set(directInputPaths)]) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
assertV4(
  sourceHashes[IMAGE_ANALYZER] === undefined ||
    sourceHashes[IMAGE_ANALYZER] ===
      POST_CANARY_BATCH_02_RENDERING_IMAGE_CONTRACT.analyzerSha256,
  "frozen image analyzer source hash changed"
);
const toolHashes = {
  [IMAGE_ANALYZER]: sha256(await readFile(path.resolve(IMAGE_ANALYZER))),
  [IMAGE_MAGICK]: sha256(await readFile(IMAGE_MAGICK))
};
assertV4(
  toolHashes[IMAGE_ANALYZER] ===
    POST_CANARY_BATCH_02_RENDERING_IMAGE_CONTRACT.analyzerSha256,
  "frozen image analyzer changed"
);

const futureOutputPathsExcludedFromSourceHashes = [
  ACTIVATION,
  EXECUTION,
  ANALYSIS,
  RENDERING_AUDIT
];
for (const file of [...futureOutputPathsExcludedFromSourceHashes, EVIDENCE_ROOT]) {
  assertV4(!(await exists(file)), `future Batch 2 rendering output exists: ${file}`);
}

const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-02-rendering-verification-preparation",
  protocolId: POST_CANARY_BATCH_02_RENDERING_PROTOCOL_ID,
  status: "frozen-post-canary-batch-02-rendering-verification-prepared-not-authorized",
  frozenAt,
  checkpointCommit,
  productionCanary: false,
  batchNumber: 2,
  stagingOnly: true,
  userAuthorization: {
    instruction: POST_CANARY_BATCH_02_STANDING_AUTHORIZATION_INSTRUCTION,
    standingAuthorization: POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
    scopeInterpretation:
      "Prepare, validate, freeze, commit, and push the Batch 2 rendering-verification plan without opening a candidate page or taking screenshots.",
    directIncrementalCostUsdMaximum: 0,
    renderingVerificationPreparation: true,
    browserPreflight: false,
    candidateBrowserControl: false,
    screenshotCapture: false,
    renderingVerification: false,
    modelExecution: false,
    paidServices: false,
    renderingRepair: false,
    productionLedgerPublication: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  model: {
    ...POST_CANARY_BATCH_02_RENDERING_MODEL,
    independentModelPassesWereIsolated: true,
    participantJudgmentWasScoreBlind: true,
    integerRoundedScoreTiesPermitted: true,
    modelContextsPlannedThisStage: 0,
    modelExecutionPlanned: false
  },
  preservedControls: {
    exactModelLabel: "5.6 Sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    independentModelPassesWereIsolated: true,
    participantJudgmentWasScoreBlind: true,
    integerRoundedScoreTiesPermitted: true,
    debate172IntegerRoundedTiePreserved: true,
    scoresChanged: false,
    publicationFieldsChanged: false
  },
  costEstimate: {
    directIncrementalCostUsd: 0,
    meteredApiCostUsd: 0,
    modelContexts: 0,
    expectedFutureRenderingExecutionWallMinutes: [10, 25]
  },
  inputs: {
    finalizationPreparation: FINALIZATION_PREPARATION,
    finalizationActivation: FINALIZATION_ACTIVATION,
    finalizationExecution: FINALIZATION_EXECUTION,
    finalizationAnalysis: FINALIZATION_ANALYSIS,
    compatibilityAnalysis: FINALIZATION_COMPATIBILITY,
    finalizationAudit: FINALIZATION_AUDIT,
    localPreview: PREVIEW,
    provenTransport
  },
  explicitOrder: [...POST_CANARY_BATCH_02_RENDERING_ORDER],
  viewports: structuredClone(POST_CANARY_BATCH_02_RENDERING_VIEWPORTS),
  requiredBooleanChecks: [
    ...POST_CANARY_BATCH_02_RENDERING_REQUIRED_BOOLEAN_CHECKS
  ],
  packets: packetArtifacts.map(({ serialized, ...row }) => row),
  browserPlan: {
    controller: "split-Chromium-fresh-keyboard-location-assign-transport",
    pointerSurface: "Codex In-app Chromium browser",
    keyboardSurface: "Google Chrome via ChatGPT browser extension",
    localServer: {
      command: [
        "python3",
        "-m",
        "http.server",
        String(POST_CANARY_BATCH_02_RENDERING_PORT),
        "--bind",
        "127.0.0.1"
      ],
      workingDirectory: ".",
      port: POST_CANARY_BATCH_02_RENDERING_PORT,
      baseUrl: `http://127.0.0.1:${POST_CANARY_BATCH_02_RENDERING_PORT}`,
      externalNetworkNavigationPermitted: false
    },
    explicitDebateOrderRequired: true,
    viewportOrder: ["desktop", "mobile"],
    freshPointerAndKeyboardTabsPerViewport: true,
    oneViewportPerBrowserControlCall: true,
    pointerScreenshotMethod: "in-app-CDP-Page.captureScreenshot",
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
    },
    imageContract: structuredClone(POST_CANARY_BATCH_02_RENDERING_IMAGE_CONTRACT),
    navigationContract: PROVEN_NAVIGATION,
    provenTransportAnalysis: PROVEN_ANALYSIS,
    priorCandidateEvidenceReusePermitted: false
  },
  gateExpectations: {
    debates: 10,
    sections: 51,
    moves: 190,
    viewportResults: 20,
    desktopViewportResults: 10,
    mobileViewportResults: 10,
    passingViewportResults: 20,
    browserDocumentLoads: 80,
    diagnosticBootstrapLoads: 40,
    measuredCandidateLoads: 40,
    screenshots: 40,
    validJpegScreenshots: 40,
    nonblankScreenshots: 40,
    dimensionMatchedScreenshots: 40,
    collapsedOpenPairsWithDifferentHashes: 20,
    requiredBooleanChecksPerViewport: 38,
    requiredBooleanChecks: 760,
    rawAccordionStateObservations: 100,
    exactViewportPhaseChecks: 60,
    pointerInteractionTests: 20,
    keyboardEnterTests: 20,
    keyboardSpaceTests: 20,
    keyboardInitialPageNavigateCalls: 20,
    keyboardRuntimeLocationAssignCalls: 20,
    consoleErrors: 0,
    consoleWarnings: 0,
    pageErrors: 0,
    failedRequests: 0,
    horizontalOverflowFailures: 0,
    displayFieldsChanged: 0,
    participantScoresChanged: false,
    modelContexts: 0,
    paidServiceCalls: 0,
    directCostUsd: 0
  },
  failurePolicy: {
    sourceHashMismatchFailsEntireGate: true,
    packetHashMismatchFailsEntireGate: true,
    viewportOrderMismatchFailsEntireGate: true,
    anyBooleanCheckFailureFailsEntireGate: true,
    anyRuntimeDiagnosticFailsEntireGate: true,
    anyScreenshotFailureFailsEntireGate: true,
    anyKeyboardExactUrlOrReadyStateDeadlineFailsEntireGate: true,
    anySourceMutationFailsEntireGate: true,
    oneAttemptPerViewport: true,
    retryPermitted: false,
    timeoutExtensionPermitted: false,
    adaptiveViewportCalibrationPermitted: false,
    adaptiveTransportSwitchPermitted: false,
    adaptiveNavigationRegenerationPermitted: false,
    priorEvidenceReusePermitted: false,
    partialPassPromotionPermitted: false,
    renderingRepairPermitted: false,
    modelExecutionPermitted: false,
    paidServicesPermitted: false,
    productionLedgerPublicationPermitted: false,
    productionMutationPermitted: false,
    nextBatchSelectionPermitted: false
  },
  compatibilityBoundary: {
    renderingVerificationPermittedAfterSeparateActivation: true,
    productionMutationBlocked: true,
    validatorMigrationAuthorized: false,
    productionLedgerPublicationAuthorized: false,
    blockers: compatibility.findings.map((finding) => finding.id)
  },
  artifacts: {
    preparation: preparationPath,
    packetsRoot: PACKETS_ROOT,
    evidenceRoot: EVIDENCE_ROOT,
    activation: ACTIVATION,
    execution: EXECUTION,
    analysis: ANALYSIS,
    renderingAudit: RENDERING_AUDIT
  },
  futureOutputPathsExcludedFromSourceHashes,
  sourceHashes,
  toolHashes,
  authorization: {
    renderingVerificationPreparation: true,
    browserPreflight: false,
    executionActivation: false,
    candidateBrowserControl: false,
    screenshotCapture: false,
    renderingVerification: false,
    modelExecution: false,
    paidServices: false,
    renderingRepair: false,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  totals: {
    preparationManifests: 1,
    renderingPackets: 10,
    candidatePagesLoaded: 0,
    screenshotsCaptured: 0,
    viewportResults: 0,
    modelContexts: 0,
    paidServiceCalls: 0,
    productionMutations: 0,
    directIncrementalCostUsd: 0
  },
  nextAuthorizedAction:
    "activate-and-execute-frozen-batch-02-rendering-verification-under-standing-authorization"
};

if (shouldWrite) {
  await mkdir(path.resolve(PACKETS_ROOT), { recursive: true });
  for (const artifact of packetArtifacts) {
    const temporary = `${path.resolve(artifact.path)}.tmp`;
    await writeFile(temporary, artifact.serialized);
    await rename(temporary, path.resolve(artifact.path));
  }
  const temporary = `${path.resolve(preparationPath)}.tmp`;
  await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`);
  await rename(temporary, path.resolve(preparationPath));
}

console.log(JSON.stringify(manifest, null, 2));
