import {
  CHECKPOINT_V22_RENDERING_REMEDY_V8_IMAGE_CONTRACT,
  CHECKPOINT_V22_RENDERING_REMEDY_V8_MODEL,
  CHECKPOINT_V22_RENDERING_REMEDY_V8_ORDER,
  CHECKPOINT_V22_RENDERING_REMEDY_V8_REQUIRED_BOOLEAN_CHECKS,
  CHECKPOINT_V22_RENDERING_REMEDY_V8_VIEWPORTS,
  validateCheckpointV22RenderingRemedyV8Packet
} from "./assessment-production-checkpoint-v2.2-rendering-verification-remedy-v8.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const CHECKPOINT_V22_RENDERING_REMEDY_V9_ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v9";
export const CHECKPOINT_V22_RENDERING_REMEDY_V9_PROTOCOL_ID =
  "assessment-production-checkpoint-v2.2-1-rendering-verification-remedy-v9";
export const CHECKPOINT_V22_RENDERING_REMEDY_V9_PORT = 4197;
export const CHECKPOINT_V22_RENDERING_REMEDY_V9_ORDER =
  CHECKPOINT_V22_RENDERING_REMEDY_V8_ORDER;
export const CHECKPOINT_V22_RENDERING_REMEDY_V9_MODEL =
  CHECKPOINT_V22_RENDERING_REMEDY_V8_MODEL;
export const CHECKPOINT_V22_RENDERING_REMEDY_V9_IMAGE_CONTRACT =
  CHECKPOINT_V22_RENDERING_REMEDY_V8_IMAGE_CONTRACT;
export const CHECKPOINT_V22_RENDERING_REMEDY_V9_REQUIRED_BOOLEAN_CHECKS =
  CHECKPOINT_V22_RENDERING_REMEDY_V8_REQUIRED_BOOLEAN_CHECKS;
export const CHECKPOINT_V22_RENDERING_REMEDY_V9_VIEWPORTS =
  CHECKPOINT_V22_RENDERING_REMEDY_V8_VIEWPORTS;

function evidencePaths(debateNumber, viewportName) {
  const root =
    `${CHECKPOINT_V22_RENDERING_REMEDY_V9_ROOT}/evidence/debate-${debateNumber}`;
  return {
    result: `${root}/${viewportName}.json`,
    collapsedScreenshot: `${root}/${viewportName}-collapsed.jpg`,
    openScreenshot: `${root}/${viewportName}-open.jpg`
  };
}

export function buildCheckpointV22RenderingRemedyV9Packet({
  sourcePacket,
  sourcePacketPath,
  sourcePacketSha256,
  failedExecutionPath,
  failedAnalysisPath,
  syntheticPreflightPath,
  navigationContractPath
}) {
  validateCheckpointV22RenderingRemedyV8Packet(sourcePacket);
  assertV4(/^[a-f0-9]{64}$/.test(sourcePacketSha256), "invalid v8 packet hash");
  const packet = {
    ...structuredClone(sourcePacket),
    schemaVersion: "1.0-production-checkpoint-v2.2-rendering-remedy-v9-packet",
    protocolId: CHECKPOINT_V22_RENDERING_REMEDY_V9_PROTOCOL_ID,
    status: "frozen-ninth-replacement-rendering-verification-packet",
    preview: {
      ...structuredClone(sourcePacket.preview),
      url:
        `http://127.0.0.1:${CHECKPOINT_V22_RENDERING_REMEDY_V9_PORT}/` +
        `${sourcePacket.preview.path}?debate=${sourcePacket.debateNumber}`
    },
    viewports: Object.fromEntries(
      Object.entries(CHECKPOINT_V22_RENDERING_REMEDY_V9_VIEWPORTS).map(
        ([name, viewport]) => [
          name,
          {
            targetCssViewport: { ...viewport.targetCssViewport },
            pointerControllerInput: { ...viewport.pointerControllerInput },
            keyboardControllerInput: { ...viewport.keyboardControllerInput },
            expectedDevicePixelRatio: viewport.expectedDevicePixelRatio,
            expectedScreenshotPixels: { ...viewport.expectedScreenshotPixels },
            evidence: evidencePaths(sourcePacket.debateNumber, name)
          }
        ]
      )
    ),
    interactionOrder: [
      "verify-frozen-source-packet-image-analyzer-and-v9-navigation-hashes",
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
      "persist-v9-evidence-only-if-every-gate-passes"
    ],
    supersedes: {
      protocolId: sourcePacket.protocolId,
      packet: sourcePacketPath,
      packetSha256: sourcePacketSha256,
      failedExecution: failedExecutionPath,
      failedAnalysis: failedAnalysisPath,
      priorEvidenceReusePermitted: false
    },
    runnerPolicy: {
      ...structuredClone(sourcePacket.runnerPolicy),
      controller: "split-Chromium-fresh-keyboard-location-assign-transport",
      navigationContractPath,
      syntheticPreflightPath,
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
      diagnosticBootstrapLoadsPerViewport: 2,
      measuredCandidateLoadsPerViewport: 2,
      reloadPermitted: false,
      retryPermitted: false,
      timeoutExtensionPermitted: false,
      adaptiveNavigationRegenerationPermitted: false,
      adaptiveTransportSwitchPermitted: false,
      candidatePersistenceBeforeAllGatesPass: false
    }
  };
  return validateCheckpointV22RenderingRemedyV9Packet(packet);
}

export function validateCheckpointV22RenderingRemedyV9Packet(packet) {
  assertV4(
    packet?.schemaVersion ===
        "1.0-production-checkpoint-v2.2-rendering-remedy-v9-packet" &&
      packet.protocolId === CHECKPOINT_V22_RENDERING_REMEDY_V9_PROTOCOL_ID &&
      packet.status === "frozen-ninth-replacement-rendering-verification-packet" &&
      CHECKPOINT_V22_RENDERING_REMEDY_V9_ORDER.includes(packet.debateNumber) &&
      packet.productionCanary === true &&
      packet.stagingOnly === true &&
      packet.preview.url.startsWith(
        `http://127.0.0.1:${CHECKPOINT_V22_RENDERING_REMEDY_V9_PORT}/`
      ) &&
      canonicalJson(packet.requiredBooleanChecks) ===
        canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V9_REQUIRED_BOOLEAN_CHECKS) &&
      packet.provenance.assessmentModel === CHECKPOINT_V22_RENDERING_REMEDY_V9_MODEL.label &&
      packet.provenance.reasoningEffort ===
        CHECKPOINT_V22_RENDERING_REMEDY_V9_MODEL.reasoningEffort &&
      packet.provenance.authentication ===
        CHECKPOINT_V22_RENDERING_REMEDY_V9_MODEL.authentication &&
      packet.provenance.participantJudgmentWasScoreBlind === true &&
      packet.supersedes.priorEvidenceReusePermitted === false &&
      packet.runnerPolicy.controller ===
        "split-Chromium-fresh-keyboard-location-assign-transport" &&
      packet.runnerPolicy.pointerSurface === "Codex In-app Chromium browser" &&
      packet.runnerPolicy.keyboardSurface ===
        "Google Chrome via ChatGPT browser extension" &&
      packet.runnerPolicy.keyboardBootstrapMethod ===
        "Page.navigate-once-per-fresh-keyboard-tab" &&
      packet.runnerPolicy.keyboardMeasuredNavigationMethod ===
        "Runtime.evaluate-location.assign-with-exact-url-readyState-poll" &&
      packet.runnerPolicy.keyboardMeasuredNavigationDeadlineMilliseconds === 15000 &&
      packet.runnerPolicy.keyboardExactUrlRequired === true &&
      packet.runnerPolicy.keyboardReadyStateRequired === "complete" &&
      packet.runnerPolicy.keyboardControllerSecondLoadSignalRequired === false &&
      packet.runnerPolicy.freshKeyboardTabPerViewport === true &&
      packet.runnerPolicy.retryPermitted === false &&
      packet.runnerPolicy.timeoutExtensionPermitted === false &&
      packet.runnerPolicy.adaptiveTransportSwitchPermitted === false,
    `${packet?.debateNumber ?? "unknown"}: invalid remedy-v9 packet`
  );
  for (const [name, expected] of Object.entries(
    CHECKPOINT_V22_RENDERING_REMEDY_V9_VIEWPORTS
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
          `${CHECKPOINT_V22_RENDERING_REMEDY_V9_ROOT}/evidence/debate-${packet.debateNumber}/${name}.json`,
      `${packet.debateNumber}: invalid ${name} remedy-v9 viewport`
    );
  }
  assertV4(
    Object.values(packet.mutationBoundary).every((value) => value === false),
    `${packet.debateNumber}: remedy-v9 mutation boundary changed`
  );
  return packet;
}

function chromeMajor(userAgent) {
  return /Chrome\/(\d+)/.exec(userAgent ?? "")?.[1] ?? null;
}

function imagePasses(image, viewport) {
  const transport = image?.transport;
  const contract = CHECKPOINT_V22_RENDERING_REMEDY_V9_IMAGE_CONTRACT;
  return typeof image?.path === "string" &&
    /^[a-f0-9]{64}$/.test(image.sha256) &&
    transport?.format === contract.format &&
    transport.signatureBytesInspected === contract.signatureBytes &&
    transport.signatureHex === contract.signatureHex &&
    transport.byteLength >= contract.minimumByteLength &&
    transport.uniqueColors >= contract.minimumUniqueColors &&
    transport.entropy >= contract.minimumEntropy &&
    transport.pixelWidth === viewport.expectedScreenshotPixels.width &&
    transport.pixelHeight === viewport.expectedScreenshotPixels.height;
}

export function validateCheckpointV22RenderingRemedyV9ViewportEvidence({
  packet,
  viewportName,
  activationNavigationToken,
  evidence
}) {
  validateCheckpointV22RenderingRemedyV9Packet(packet);
  const viewport = packet.viewports[viewportName];
  const pointerMajor = chromeMajor(evidence?.browser?.pointerUserAgent);
  const keyboardMajor = chromeMajor(evidence?.browser?.keyboardUserAgent);
  const states = evidence?.rawAccordionStates ?? {};
  const navigation = evidence?.browser?.keyboardNavigation ?? {};
  assertV4(
    viewport &&
      evidence?.schemaVersion ===
        "1.0-production-checkpoint-v2.2-rendering-remedy-v9-viewport-evidence" &&
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
    `${packet?.debateNumber ?? "unknown"}: invalid ${viewportName} remedy-v9 evidence`
  );
  return evidence;
}
