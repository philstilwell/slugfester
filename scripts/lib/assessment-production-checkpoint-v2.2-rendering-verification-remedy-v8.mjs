import {
  CHECKPOINT_V22_RENDERING_REMEDY_V6_IMAGE_CONTRACT,
  CHECKPOINT_V22_RENDERING_REMEDY_V6_MODEL,
  CHECKPOINT_V22_RENDERING_REMEDY_V6_ORDER,
  CHECKPOINT_V22_RENDERING_REMEDY_V6_REQUIRED_BOOLEAN_CHECKS,
  validateCheckpointV22RenderingRemedyV6Packet
} from "./assessment-production-checkpoint-v2.2-rendering-verification-remedy-v6.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const CHECKPOINT_V22_RENDERING_REMEDY_V8_ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v8";
export const CHECKPOINT_V22_RENDERING_REMEDY_V8_PROTOCOL_ID =
  "assessment-production-checkpoint-v2.2-1-rendering-verification-remedy-v8";
export const CHECKPOINT_V22_RENDERING_REMEDY_V8_PORT = 4196;
export const CHECKPOINT_V22_RENDERING_REMEDY_V8_ORDER =
  CHECKPOINT_V22_RENDERING_REMEDY_V6_ORDER;
export const CHECKPOINT_V22_RENDERING_REMEDY_V8_MODEL =
  CHECKPOINT_V22_RENDERING_REMEDY_V6_MODEL;
export const CHECKPOINT_V22_RENDERING_REMEDY_V8_IMAGE_CONTRACT =
  CHECKPOINT_V22_RENDERING_REMEDY_V6_IMAGE_CONTRACT;
export const CHECKPOINT_V22_RENDERING_REMEDY_V8_REQUIRED_BOOLEAN_CHECKS =
  CHECKPOINT_V22_RENDERING_REMEDY_V6_REQUIRED_BOOLEAN_CHECKS;
export const CHECKPOINT_V22_RENDERING_REMEDY_V8_VIEWPORTS = Object.freeze({
  desktop: Object.freeze({
    targetCssViewport: Object.freeze({ width: 1440, height: 1000 }),
    pointerControllerInput: Object.freeze({ width: 1440, height: 1000 }),
    keyboardControllerInput: Object.freeze({ width: 1152, height: 800 }),
    expectedDevicePixelRatio: 2,
    expectedScreenshotPixels: Object.freeze({ width: 2880, height: 2000 })
  }),
  mobile: Object.freeze({
    targetCssViewport: Object.freeze({ width: 390, height: 844 }),
    pointerControllerInput: Object.freeze({ width: 390, height: 844 }),
    keyboardControllerInput: Object.freeze({ width: 312, height: 675 }),
    expectedDevicePixelRatio: 2,
    expectedScreenshotPixels: Object.freeze({ width: 780, height: 1688 })
  })
});

function evidencePaths(debateNumber, viewportName) {
  const root =
    `${CHECKPOINT_V22_RENDERING_REMEDY_V8_ROOT}/evidence/debate-${debateNumber}`;
  return {
    result: `${root}/${viewportName}.json`,
    collapsedScreenshot: `${root}/${viewportName}-collapsed.jpg`,
    openScreenshot: `${root}/${viewportName}-open.jpg`
  };
}

export function buildCheckpointV22RenderingRemedyV8Packet({
  sourcePacket,
  sourcePacketPath,
  sourcePacketSha256,
  failedExecutionPath,
  failedAnalysisPath,
  failedV7PreparationPath,
  syntheticPreflightPath,
  hybridContractPath
}) {
  validateCheckpointV22RenderingRemedyV6Packet(sourcePacket);
  assertV4(/^[a-f0-9]{64}$/.test(sourcePacketSha256), "invalid v6 packet hash");
  const packet = {
    ...structuredClone(sourcePacket),
    schemaVersion: "1.0-production-checkpoint-v2.2-rendering-remedy-v8-packet",
    protocolId: CHECKPOINT_V22_RENDERING_REMEDY_V8_PROTOCOL_ID,
    status: "frozen-eighth-replacement-rendering-verification-packet",
    preview: {
      ...structuredClone(sourcePacket.preview),
      url:
        `http://127.0.0.1:${CHECKPOINT_V22_RENDERING_REMEDY_V8_PORT}/` +
        `${sourcePacket.preview.path}?debate=${sourcePacket.debateNumber}`
    },
    viewports: Object.fromEntries(
      Object.entries(CHECKPOINT_V22_RENDERING_REMEDY_V8_VIEWPORTS).map(
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
      "verify-frozen-source-packet-and-image-analyzer-hashes",
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
      "load-activation-tokenized-http-diagnostic-bootstrap",
      "enable-zero-tolerance-keyboard-runtime-diagnostics",
      "navigate-to-activation-tokenized-keyboard-candidate-url",
      "wait-frozen-post-load-settle",
      "focus-native-summary-after-direct-readiness-observation",
      "open-with-supported-enter-press-and-observe-native-state",
      "close-with-supported-space-press-and-observe-native-state",
      "settle-read-keyboard-runtime-diagnostics-and-close-tab",
      "persist-v8-evidence-only-if-every-gate-passes"
    ],
    supersedes: {
      protocolId: sourcePacket.protocolId,
      packet: sourcePacketPath,
      packetSha256: sourcePacketSha256,
      failedExecution: failedExecutionPath,
      failedAnalysis: failedAnalysisPath,
      failedV7Preparation: failedV7PreparationPath,
      priorEvidenceReusePermitted: false
    },
    runnerPolicy: {
      controller: "split-Chromium-rendering-and-keyboard-transport",
      browserFamily: "Chromium",
      pointerSurface: "Codex In-app Chromium browser",
      keyboardSurface: "Google Chrome via ChatGPT browser extension",
      bothSurfacesMustReportSameChromeMajorVersion: true,
      hybridContractPath,
      syntheticPreflightPath,
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
      loadSignal: "load",
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
      imageAnalyzerPath: CHECKPOINT_V22_RENDERING_REMEDY_V8_IMAGE_CONTRACT.analyzerPath,
      imageAnalyzerSha256:
        CHECKPOINT_V22_RENDERING_REMEDY_V8_IMAGE_CONTRACT.analyzerSha256,
      imageContract: structuredClone(CHECKPOINT_V22_RENDERING_REMEDY_V8_IMAGE_CONTRACT),
      screenshotPixelDimensionContract:
        "rounded-pointer-css-viewport-times-device-pixel-ratio",
      pointerControllerInputDoesNotEqualPhysicalScreenshotPixels: true,
      screenshotPairHashesMustDiffer: true,
      invalidScreenshotPersistence: "none",
      failedViewportEvidencePersistence: "none",
      diagnosticBootstrapBeforeRawDiagnosticsRequired: true,
      signatureExtractionMethod: "contract-derived-byte-count",
      retryPermitted: false,
      timeoutExtensionPermitted: false,
      adaptiveViewportCalibrationPermitted: false,
      adaptiveTransportSwitchPermitted: false,
      candidatePersistenceBeforeAllGatesPass: false
    }
  };
  return validateCheckpointV22RenderingRemedyV8Packet(packet);
}

export function validateCheckpointV22RenderingRemedyV8Packet(packet) {
  assertV4(
    packet?.schemaVersion ===
        "1.0-production-checkpoint-v2.2-rendering-remedy-v8-packet" &&
      packet.protocolId === CHECKPOINT_V22_RENDERING_REMEDY_V8_PROTOCOL_ID &&
      packet.status === "frozen-eighth-replacement-rendering-verification-packet" &&
      CHECKPOINT_V22_RENDERING_REMEDY_V8_ORDER.includes(packet.debateNumber) &&
      packet.productionCanary === true &&
      packet.stagingOnly === true &&
      packet.preview.url.startsWith(
        `http://127.0.0.1:${CHECKPOINT_V22_RENDERING_REMEDY_V8_PORT}/`
      ) &&
      canonicalJson(packet.requiredBooleanChecks) ===
        canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V8_REQUIRED_BOOLEAN_CHECKS) &&
      packet.provenance.assessmentModel === CHECKPOINT_V22_RENDERING_REMEDY_V8_MODEL.label &&
      packet.provenance.reasoningEffort ===
        CHECKPOINT_V22_RENDERING_REMEDY_V8_MODEL.reasoningEffort &&
      packet.provenance.authentication ===
        CHECKPOINT_V22_RENDERING_REMEDY_V8_MODEL.authentication &&
      packet.provenance.participantJudgmentWasScoreBlind === true &&
      packet.supersedes.priorEvidenceReusePermitted === false &&
      packet.runnerPolicy.pointerSurface === "Codex In-app Chromium browser" &&
      packet.runnerPolicy.keyboardSurface ===
        "Google Chrome via ChatGPT browser extension" &&
      packet.runnerPolicy.retryPermitted === false &&
      packet.runnerPolicy.timeoutExtensionPermitted === false &&
      packet.runnerPolicy.adaptiveTransportSwitchPermitted === false &&
      packet.runnerPolicy.pointerControllerInputDoesNotEqualPhysicalScreenshotPixels ===
        true,
    `${packet?.debateNumber ?? "unknown"}: invalid remedy-v8 packet`
  );
  for (const [name, expected] of Object.entries(
    CHECKPOINT_V22_RENDERING_REMEDY_V8_VIEWPORTS
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
          `${CHECKPOINT_V22_RENDERING_REMEDY_V8_ROOT}/evidence/debate-${packet.debateNumber}/${name}.json`,
      `${packet.debateNumber}: invalid ${name} remedy-v8 viewport`
    );
  }
  assertV4(
    Object.values(packet.mutationBoundary).every((value) => value === false),
    `${packet.debateNumber}: remedy-v8 mutation boundary changed`
  );
  return packet;
}

function chromeMajor(userAgent) {
  return /Chrome\/(\d+)/.exec(userAgent ?? "")?.[1] ?? null;
}

function evidenceImagePasses(image, viewport) {
  const transport = image?.transport;
  const contract = CHECKPOINT_V22_RENDERING_REMEDY_V8_IMAGE_CONTRACT;
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

export function validateCheckpointV22RenderingRemedyV8ViewportEvidence({
  packet,
  viewportName,
  activationNavigationToken,
  evidence
}) {
  validateCheckpointV22RenderingRemedyV8Packet(packet);
  const viewport = packet.viewports[viewportName];
  const pointerMajor = chromeMajor(evidence?.browser?.pointerUserAgent);
  const keyboardMajor = chromeMajor(evidence?.browser?.keyboardUserAgent);
  const states = evidence?.rawAccordionStates ?? {};
  assertV4(
    viewport &&
      evidence?.schemaVersion ===
        "1.0-production-checkpoint-v2.2-rendering-remedy-v8-viewport-evidence" &&
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
        "split-Chromium-rendering-and-keyboard-transport" &&
      evidence.browser.pointerSurface === packet.runnerPolicy.pointerSurface &&
      evidence.browser.keyboardSurface === packet.runnerPolicy.keyboardSurface &&
      pointerMajor !== null &&
      pointerMajor === keyboardMajor &&
      evidence.screenshots.collapsed.path ===
        viewport.evidence.collapsedScreenshot &&
      evidence.screenshots.open.path === viewport.evidence.openScreenshot &&
      evidenceImagePasses(evidence.screenshots.collapsed, viewport) &&
      evidenceImagePasses(evidence.screenshots.open, viewport) &&
      evidence.screenshots.collapsed.sha256 !==
        evidence.screenshots.open.sha256 &&
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
      packet.zeroCountChecks.every(
        (key) => evidence.runtime.counts[key] === 0
      ) &&
      Object.values(evidence.mutations).every((changed) => changed === false),
    `${packet?.debateNumber ?? "unknown"}: invalid ${viewportName} remedy-v8 evidence`
  );
  return evidence;
}
