import {
  POST_CANARY_BATCH_04_PUBLICATION_FINALIZATION_ORDER
} from "./assessment-production-post-canary-batch-04-publication-finalization.mjs";
import {
  POST_CANARY_BATCH_04_PUBLICATION_BYLINE,
  POST_CANARY_BATCH_04_PUBLICATION_MODEL
} from "./assessment-production-post-canary-batch-04-publication.mjs";
import {
  CHECKPOINT_V22_RENDERING_REMEDY_V9_IMAGE_CONTRACT,
  CHECKPOINT_V22_RENDERING_REMEDY_V9_REQUIRED_BOOLEAN_CHECKS,
  CHECKPOINT_V22_RENDERING_REMEDY_V9_VIEWPORTS
} from "./assessment-production-checkpoint-v2.2-rendering-verification-remedy-v9.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_04_RENDERING_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/rendering-verification";
export const POST_CANARY_BATCH_04_RENDERING_PROTOCOL_ID =
  "assessment-production-post-canary-batch-04-rendering-verification";
export const POST_CANARY_BATCH_04_RENDERING_PORT = 4200;
export const POST_CANARY_BATCH_04_RENDERING_ORDER =
  POST_CANARY_BATCH_04_PUBLICATION_FINALIZATION_ORDER;
export const POST_CANARY_BATCH_04_RENDERING_MODEL =
  POST_CANARY_BATCH_04_PUBLICATION_MODEL;
export const POST_CANARY_BATCH_04_RENDERING_BYLINE =
  POST_CANARY_BATCH_04_PUBLICATION_BYLINE;
export const POST_CANARY_BATCH_04_RENDERING_IMAGE_CONTRACT =
  CHECKPOINT_V22_RENDERING_REMEDY_V9_IMAGE_CONTRACT;
export const POST_CANARY_BATCH_04_RENDERING_REQUIRED_BOOLEAN_CHECKS =
  CHECKPOINT_V22_RENDERING_REMEDY_V9_REQUIRED_BOOLEAN_CHECKS;
export const POST_CANARY_BATCH_04_RENDERING_VIEWPORTS =
  CHECKPOINT_V22_RENDERING_REMEDY_V9_VIEWPORTS;

function evidencePaths(debateNumber, viewportName) {
  const root = `${POST_CANARY_BATCH_04_RENDERING_ROOT}/evidence/debate-${debateNumber}`;
  return {
    result: `${root}/${viewportName}.json`,
    collapsedScreenshot: `${root}/${viewportName}-collapsed.jpg`,
    openScreenshot: `${root}/${viewportName}-open.jpg`
  };
}

export function buildPostCanaryBatch04RenderingPacket({
  auditRow,
  candidate,
  provenance,
  previewPath,
  previewSha256,
  provenTransport
}) {
  assertV4(
    auditRow &&
      candidate.number === auditRow.debateNumber &&
      candidate.id === auditRow.debateId &&
      provenance.debateNumber === auditRow.debateNumber &&
      provenance.debateId === auditRow.debateId &&
      provenance.model.label === POST_CANARY_BATCH_04_RENDERING_MODEL.label &&
      provenance.model.reasoningEffort ===
        POST_CANARY_BATCH_04_RENDERING_MODEL.reasoningEffort &&
      provenance.model.authentication ===
        POST_CANARY_BATCH_04_RENDERING_MODEL.authentication &&
      provenance.model.independentModelPassesWereIsolated === true &&
      provenance.model.participantJudgmentWasScoreBlind === true &&
      provenance.model.integerRoundedScoreTiesPermitted === true &&
      provenance.displayContract.byline === POST_CANARY_BATCH_04_RENDERING_BYLINE &&
      provenance.displayContract.defaultCollapsed === true,
    `${auditRow?.debateNumber ?? "unknown"}: Batch 4 finalization provenance changed`
  );
  const newArguments = {
    pro: candidate.logicalExtension.pro.newArguments.length,
    con: candidate.logicalExtension.con.newArguments.length
  };
  const packet = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-04-rendering-verification-packet",
    protocolId: POST_CANARY_BATCH_04_RENDERING_PROTOCOL_ID,
    status: "frozen-batch-04-rendering-verification-packet",
    productionCanary: false,
    batchNumber: 4,
    stagingOnly: true,
    debateNumber: auditRow.debateNumber,
    debateId: auditRow.debateId,
    candidate: {
      path: auditRow.finalCandidate,
      sha256: auditRow.finalCandidateSha256,
      score: structuredClone(candidate.score),
      sections: candidate.sections.length,
      moves: auditRow.validation.moves,
      aiExtensionSides: 2,
      strengthenedFinalArguments: 2,
      newArguments
    },
    provenance: {
      path: auditRow.provenance,
      sha256: auditRow.provenanceSha256,
      assessmentModel: provenance.model.label,
      reasoningEffort: provenance.model.reasoningEffort,
      authentication: provenance.model.authentication,
      independentModelPassesWereIsolated:
        provenance.model.independentModelPassesWereIsolated,
      participantJudgmentWasScoreBlind:
        provenance.model.participantJudgmentWasScoreBlind,
      integerRoundedScoreTiesPermitted:
        provenance.model.integerRoundedScoreTiesPermitted
    },
    preview: {
      path: previewPath,
      sha256: previewSha256,
      url:
        `http://127.0.0.1:${POST_CANARY_BATCH_04_RENDERING_PORT}/` +
        `${previewPath}?debate=${auditRow.debateNumber}`,
      localOnly: true,
      noindex: true
    },
    expectedDisplay: {
      byline: POST_CANARY_BATCH_04_RENDERING_BYLINE,
      stagingBannerPrefix: "Publication staging preview:",
      stagingBannerRequiredText: "validated post-canary Batch 4 candidate only",
      overallHeading: "Overall commentary",
      aiExtensionHeading: "AI Extension",
      disclosurePrefix: "This section is an AI-generated contribution",
      nativeElement: "details",
      defaultCollapsed: true,
      prohibitedText: ["unassailable"]
    },
    viewports: Object.fromEntries(
      Object.entries(POST_CANARY_BATCH_04_RENDERING_VIEWPORTS).map(
        ([name, viewport]) => [
          name,
          {
            targetCssViewport: structuredClone(viewport.targetCssViewport),
            pointerControllerInput: structuredClone(
              viewport.pointerControllerInput
            ),
            keyboardControllerInput: structuredClone(
              viewport.keyboardControllerInput
            ),
            expectedDevicePixelRatio: viewport.expectedDevicePixelRatio,
            expectedScreenshotPixels: structuredClone(
              viewport.expectedScreenshotPixels
            ),
            evidence: evidencePaths(auditRow.debateNumber, name)
          }
        ]
      )
    ),
    requiredBooleanChecks: [
      ...POST_CANARY_BATCH_04_RENDERING_REQUIRED_BOOLEAN_CHECKS
    ],
    zeroCountChecks: [
      "consoleErrors",
      "consoleWarnings",
      "pageErrors",
      "failedRequests"
    ],
    interactionOrder: [
      "verify-frozen-sources-packet-image-analyzer-and-navigation-token",
      "set-in-app-pointer-viewport",
      "open-fresh-in-app-pointer-tab",
      "load-activation-tokenized-http-diagnostic-bootstrap",
      "enable-zero-tolerance-pointer-runtime-diagnostics",
      "navigate-to-activation-tokenized-pointer-candidate-url",
      "wait-frozen-post-load-settle",
      "assert-content-layout-and-exact-pointer-css-viewport",
      "capture-and-analyze-collapsed-direct-cdp-jpeg",
      "open-by-direct-cdp-pointer-event-and-observe-native-state",
      "capture-and-analyze-open-direct-cdp-jpeg",
      "settle-read-pointer-runtime-diagnostics-and-close-tab",
      "set-extension-keyboard-viewport",
      "open-fresh-extension-keyboard-tab",
      "load-bootstrap-once-with-controller-page-navigate",
      "enable-zero-tolerance-keyboard-runtime-diagnostics",
      "navigate-measured-document-with-runtime-location-assign",
      "poll-exact-url-and-complete-ready-state-within-frozen-deadline",
      "wait-frozen-post-load-settle",
      "focus-native-summary-after-direct-readiness-observation",
      "open-with-supported-enter-press-and-observe-native-state",
      "close-with-supported-space-press-and-observe-native-state",
      "settle-read-keyboard-runtime-diagnostics-and-close-tab",
      "persist-evidence-only-if-every-gate-passes"
    ],
    mutationBoundary: {
      candidateWritable: false,
      participantScoresWritable: false,
      displayCopyWritable: false,
      applicationCodeWritable: false,
      stylesheetWritable: false,
      productionDataWritable: false,
      rankingDataWritable: false,
      productionLedgersWritable: false,
      compatibilityRemediesWritable: false,
      nextBatchSelectionWritable: false
    },
    transportProvenance: {
      ...structuredClone(provenTransport),
      priorCandidateEvidenceReusePermitted: false
    },
    runnerPolicy: {
      controller: "split-Chromium-fresh-keyboard-location-assign-transport",
      browserFamily: "Chromium",
      pointerSurface: "Codex In-app Chromium browser",
      keyboardSurface: "Google Chrome via ChatGPT browser extension",
      bothSurfacesMustReportSameChromeMajorVersion: true,
      diagnosticBootstrapPath:
        "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v6/synthetic/preflight.html",
      diagnosticBootstrapLoadsPerViewport: 2,
      measuredCandidateLoadsPerViewport: 2,
      freshTabPerInteractionPhase: true,
      reloadPermitted: false,
      stateAuthority: "native-details-open-property",
      openAttributeCorroborationRequired: true,
      contentVisibilityGate: "element-from-point-hit-test-after-summary-scroll",
      contentClientRectsUse: "diagnostic-only-never-gating",
      activationNavigationTokenRequired: true,
      activationNavigationTokenPattern: "^[a-f0-9]{64}$",
      pointerMethod: "in-app-CDP-Input.dispatchMouseEvent-at-summary-center",
      keyboardMethod: "extension-locator.press-after-direct-readiness-and-focus",
      chromiumVersionMethod: "Runtime.evaluate:navigator.userAgent",
      diagnosticSettleMilliseconds: 3000,
      postLoadSettleMilliseconds: 1000,
      pointerScreenshotMethod: "in-app-CDP-Page.captureScreenshot",
      screenshotParameters: {
        format: "jpeg",
        quality: 85,
        fromSurface: true,
        captureBeyondViewport: false
      },
      imageAnalysisContractPath:
        "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v6/synthetic/image-analysis-contract.json",
      imageAnalyzerPath: POST_CANARY_BATCH_04_RENDERING_IMAGE_CONTRACT.analyzerPath,
      imageAnalyzerSha256:
        POST_CANARY_BATCH_04_RENDERING_IMAGE_CONTRACT.analyzerSha256,
      imageContract: structuredClone(
        POST_CANARY_BATCH_04_RENDERING_IMAGE_CONTRACT
      ),
      signatureExtractionMethod: "contract-derived-byte-count",
      screenshotPixelDimensionContract:
        "rounded-pointer-css-viewport-times-device-pixel-ratio",
      pointerControllerInputDoesNotEqualPhysicalScreenshotPixels: true,
      screenshotPairHashesMustDiffer: true,
      invalidScreenshotPersistence: "none",
      failedViewportEvidencePersistence: "none",
      candidatePersistenceBeforeAllGatesPass: false,
      navigationContractPath:
        "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v9/synthetic/fresh-keyboard-navigation-contract.json",
      keyboardBootstrapMethod: "Page.navigate-once-per-fresh-keyboard-tab",
      keyboardMeasuredNavigationMethod:
        "Runtime.evaluate-location.assign-with-exact-url-readyState-poll",
      keyboardMeasuredNavigationDeadlineMilliseconds: 15000,
      keyboardExactUrlRequired: true,
      keyboardReadyStateRequired: "complete",
      keyboardReadyStatePollMilliseconds: 50,
      keyboardControllerSecondLoadSignalRequired: false,
      freshKeyboardTabPerViewport: true,
      measuredKeyboardDocumentsPerTab: 1,
      retryPermitted: false,
      timeoutExtensionPermitted: false,
      adaptiveViewportCalibrationPermitted: false,
      adaptiveTransportSwitchPermitted: false,
      adaptiveNavigationRegenerationPermitted: false
    }
  };
  return validatePostCanaryBatch04RenderingPacket(packet);
}

export function validatePostCanaryBatch04RenderingPacket(packet) {
  assertV4(
    packet?.schemaVersion ===
        "1.0-assessment-production-post-canary-batch-04-rendering-verification-packet" &&
      packet.protocolId === POST_CANARY_BATCH_04_RENDERING_PROTOCOL_ID &&
      packet.status === "frozen-batch-04-rendering-verification-packet" &&
      packet.productionCanary === false &&
      packet.batchNumber === 4 &&
      packet.stagingOnly === true &&
      POST_CANARY_BATCH_04_RENDERING_ORDER.includes(packet.debateNumber) &&
      packet.preview.url.startsWith(
        `http://127.0.0.1:${POST_CANARY_BATCH_04_RENDERING_PORT}/`
      ) &&
      canonicalJson(packet.requiredBooleanChecks) ===
        canonicalJson(POST_CANARY_BATCH_04_RENDERING_REQUIRED_BOOLEAN_CHECKS) &&
      packet.expectedDisplay.byline === POST_CANARY_BATCH_04_RENDERING_BYLINE &&
      packet.expectedDisplay.defaultCollapsed === true &&
      packet.provenance.assessmentModel ===
        POST_CANARY_BATCH_04_RENDERING_MODEL.label &&
      packet.provenance.reasoningEffort ===
        POST_CANARY_BATCH_04_RENDERING_MODEL.reasoningEffort &&
      packet.provenance.authentication ===
        POST_CANARY_BATCH_04_RENDERING_MODEL.authentication &&
      packet.provenance.independentModelPassesWereIsolated === true &&
      packet.provenance.participantJudgmentWasScoreBlind === true &&
      packet.provenance.integerRoundedScoreTiesPermitted === true &&
      packet.candidate.aiExtensionSides === 2 &&
      packet.candidate.strengthenedFinalArguments === 2 &&
      packet.candidate.newArguments.pro >= 2 &&
      packet.candidate.newArguments.con >= 2 &&
      packet.transportProvenance.priorCandidateEvidenceReusePermitted === false &&
      packet.runnerPolicy.controller ===
        "split-Chromium-fresh-keyboard-location-assign-transport" &&
      packet.runnerPolicy.pointerSurface === "Codex In-app Chromium browser" &&
      packet.runnerPolicy.keyboardSurface ===
        "Google Chrome via ChatGPT browser extension" &&
      packet.runnerPolicy.keyboardMeasuredNavigationDeadlineMilliseconds ===
        15000 &&
      packet.runnerPolicy.keyboardControllerSecondLoadSignalRequired === false &&
      packet.runnerPolicy.retryPermitted === false &&
      packet.runnerPolicy.timeoutExtensionPermitted === false &&
      packet.runnerPolicy.adaptiveTransportSwitchPermitted === false &&
      Object.values(packet.mutationBoundary).every((value) => value === false),
    `${packet?.debateNumber ?? "unknown"}: invalid Batch 4 rendering packet`
  );
  for (const [name, expected] of Object.entries(
    POST_CANARY_BATCH_04_RENDERING_VIEWPORTS
  )) {
    const viewport = packet.viewports[name];
    assertV4(
      canonicalJson(viewport.targetCssViewport) ===
          canonicalJson(expected.targetCssViewport) &&
        canonicalJson(viewport.pointerControllerInput) ===
          canonicalJson(expected.pointerControllerInput) &&
        canonicalJson(viewport.keyboardControllerInput) ===
          canonicalJson(expected.keyboardControllerInput) &&
        viewport.expectedDevicePixelRatio === expected.expectedDevicePixelRatio &&
        canonicalJson(viewport.expectedScreenshotPixels) ===
          canonicalJson(expected.expectedScreenshotPixels) &&
        viewport.evidence.result ===
          `${POST_CANARY_BATCH_04_RENDERING_ROOT}/evidence/debate-${packet.debateNumber}/${name}.json`,
      `${packet.debateNumber}: invalid ${name} Batch 4 viewport`
    );
  }
  return packet;
}

function chromeMajor(userAgent) {
  return /Chrome\/(\d+)/.exec(userAgent ?? "")?.[1] ?? null;
}

function imagePasses(image, viewport) {
  const transport = image?.transport;
  const contract = POST_CANARY_BATCH_04_RENDERING_IMAGE_CONTRACT;
  return (
    typeof image?.path === "string" &&
    /^[a-f0-9]{64}$/.test(image.sha256) &&
    transport?.format === contract.format &&
    transport.signatureBytesInspected === contract.signatureBytes &&
    transport.signatureHex === contract.signatureHex &&
    transport.byteLength >= contract.minimumByteLength &&
    transport.uniqueColors >= contract.minimumUniqueColors &&
    transport.entropy >= contract.minimumEntropy &&
    transport.pixelWidth === viewport.expectedScreenshotPixels.width &&
    transport.pixelHeight === viewport.expectedScreenshotPixels.height
  );
}

export function validatePostCanaryBatch04RenderingViewportEvidence({
  packet,
  viewportName,
  activationNavigationToken,
  evidence
}) {
  validatePostCanaryBatch04RenderingPacket(packet);
  const viewport = packet.viewports[viewportName];
  const pointerMajor = chromeMajor(evidence?.browser?.pointerUserAgent);
  const keyboardMajor = chromeMajor(evidence?.browser?.keyboardUserAgent);
  const states = evidence?.rawAccordionStates ?? {};
  const navigation = evidence?.browser?.keyboardNavigation ?? {};
  assertV4(
    viewport &&
      evidence?.schemaVersion ===
        "1.0-assessment-production-post-canary-batch-04-rendering-viewport-evidence" &&
      evidence.protocolId === packet.protocolId &&
      evidence.status === "passed-rendering-viewport" &&
      evidence.debateNumber === packet.debateNumber &&
      evidence.debateId === packet.debateId &&
      evidence.viewportName === viewportName &&
      evidence.navigationToken === activationNavigationToken &&
      canonicalJson(evidence.viewport.targetCssViewport) ===
        canonicalJson(viewport.targetCssViewport) &&
      canonicalJson(evidence.viewport.pointerControllerInput) ===
        canonicalJson(viewport.pointerControllerInput) &&
      canonicalJson(evidence.viewport.keyboardControllerInput) ===
        canonicalJson(viewport.keyboardControllerInput) &&
      evidence.viewport.expectedDevicePixelRatio ===
        viewport.expectedDevicePixelRatio &&
      canonicalJson(evidence.viewport.expectedScreenshotPixels) ===
        canonicalJson(viewport.expectedScreenshotPixels) &&
      evidence.url === packet.preview.url &&
      evidence.browser.name ===
        "split-Chromium-fresh-keyboard-location-assign-transport" &&
      evidence.browser.pointerSurface === packet.runnerPolicy.pointerSurface &&
      evidence.browser.keyboardSurface === packet.runnerPolicy.keyboardSurface &&
      pointerMajor !== null &&
      pointerMajor === keyboardMajor &&
      navigation.tabRequests === 1 &&
      navigation.tabsClosed === 1 &&
      navigation.initialPageNavigateCalls === 1 &&
      navigation.runtimeLocationAssignCalls === 1 &&
      navigation.navigationUrls?.length === 2 &&
      navigation.navigationUrls[0].method === "Page.navigate" &&
      navigation.navigationUrls[1].method ===
        "Runtime.evaluate-location.assign-exact-url-readyState-poll" &&
      evidence.screenshots.collapsed.path ===
        viewport.evidence.collapsedScreenshot &&
      evidence.screenshots.open.path === viewport.evidence.openScreenshot &&
      imagePasses(evidence.screenshots.collapsed, viewport) &&
      imagePasses(evidence.screenshots.open, viewport) &&
      evidence.screenshots.collapsed.sha256 !== evidence.screenshots.open.sha256 &&
      canonicalJson(Object.keys(evidence.checks)) ===
        canonicalJson(packet.requiredBooleanChecks) &&
      Object.values(evidence.checks).every((value) => value === true) &&
      states.pointerFresh.detailsOpen === false &&
      states.pointerOpen.detailsOpen === true &&
      states.keyboardFresh.detailsOpen === false &&
      states.keyboardAfterEnter.detailsOpen === true &&
      states.keyboardAfterSpace.detailsOpen === false &&
      evidence.metrics.pointerFreshLoad.actualInnerWidth ===
        viewport.targetCssViewport.width &&
      evidence.metrics.pointerFreshLoad.actualInnerHeight ===
        viewport.targetCssViewport.height &&
      evidence.metrics.pointerOpen.actualInnerWidth ===
        viewport.targetCssViewport.width &&
      evidence.metrics.pointerOpen.actualInnerHeight ===
        viewport.targetCssViewport.height &&
      evidence.metrics.keyboardFreshLoad.actualInnerWidth ===
        viewport.targetCssViewport.width &&
      evidence.metrics.keyboardFreshLoad.actualInnerHeight ===
        viewport.targetCssViewport.height &&
      packet.zeroCountChecks.every((key) => evidence.runtime.counts[key] === 0) &&
      Object.values(evidence.mutations).every((changed) => changed === false),
    `${packet?.debateNumber ?? "unknown"}: invalid ${viewportName} Batch 4 rendering evidence`
  );
  return evidence;
}
