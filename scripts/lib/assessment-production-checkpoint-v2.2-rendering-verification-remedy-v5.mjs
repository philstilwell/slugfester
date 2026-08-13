import {
  CHECKPOINT_V22_RENDERING_REMEDY_V4_MODEL,
  CHECKPOINT_V22_RENDERING_REMEDY_V4_ORDER,
  CHECKPOINT_V22_RENDERING_REMEDY_V4_VIEWPORTS,
  validateCheckpointV22RenderingRemedyV4Packet
} from "./assessment-production-checkpoint-v2.2-rendering-verification-remedy-v4.mjs";
import {
  CHECKPOINT_V22_RENDERING_REMEDY_V3_REQUIRED_BOOLEAN_CHECKS
} from "./assessment-production-checkpoint-v2.2-rendering-verification-remedy-v3.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const CHECKPOINT_V22_RENDERING_REMEDY_V5_ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v5";
export const CHECKPOINT_V22_RENDERING_REMEDY_V5_PROTOCOL_ID =
  "assessment-production-checkpoint-v2.2-1-rendering-verification-remedy-v5";
export const CHECKPOINT_V22_RENDERING_REMEDY_V5_ORDER =
  CHECKPOINT_V22_RENDERING_REMEDY_V4_ORDER;
export const CHECKPOINT_V22_RENDERING_REMEDY_V5_MODEL =
  CHECKPOINT_V22_RENDERING_REMEDY_V4_MODEL;
export const CHECKPOINT_V22_RENDERING_REMEDY_V5_VIEWPORTS =
  CHECKPOINT_V22_RENDERING_REMEDY_V4_VIEWPORTS;
export const CHECKPOINT_V22_RENDERING_REMEDY_V5_PORT = 4193;
export const CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT = Object.freeze({
  analyzerPath: "/opt/homebrew/bin/magick",
  analyzerSha256:
    "3d794ccdf588ebd32a0a48a33b56cd753616341947e52907b5f31c61f47beb78",
  format: "JPEG",
  signatureHex: "ffd8ffe000104a4649460001",
  quality: 85,
  minimumByteLength: 10000,
  minimumUniqueColors: 16,
  minimumEntropy: 0.02
});
export const CHECKPOINT_V22_RENDERING_REMEDY_V5_REQUIRED_BOOLEAN_CHECKS =
  Object.freeze([
    ...CHECKPOINT_V22_RENDERING_REMEDY_V3_REQUIRED_BOOLEAN_CHECKS,
    "collapsedScreenshotJpeg",
    "openScreenshotJpeg",
    "collapsedScreenshotNonblank",
    "openScreenshotNonblank",
    "collapsedScreenshotDimensionsMatch",
    "openScreenshotDimensionsMatch",
    "collapsedOpenScreenshotsDiffer"
  ]);

function evidencePaths(debateNumber, viewportName) {
  const root =
    `${CHECKPOINT_V22_RENDERING_REMEDY_V5_ROOT}/evidence/debate-${debateNumber}`;
  return {
    result: `${root}/${viewportName}.json`,
    collapsedScreenshot: `${root}/${viewportName}-collapsed.jpg`,
    openScreenshot: `${root}/${viewportName}-open.jpg`
  };
}

export function buildCheckpointV22RenderingRemedyV5Packet({
  sourcePacket,
  sourcePacketPath,
  sourcePacketSha256,
  failedExecutionPath,
  failedAnalysisPath,
  syntheticBootstrapPath,
  imageAnalysisContractPath
}) {
  validateCheckpointV22RenderingRemedyV4Packet(sourcePacket);
  assertV4(
    /^[a-f0-9]{64}$/.test(sourcePacketSha256),
    `${sourcePacket?.debateNumber ?? "unknown"}: invalid remedy-v4 packet hash`
  );
  const packet = {
    ...structuredClone(sourcePacket),
    schemaVersion:
      "1.0-production-checkpoint-v2.2-rendering-remedy-v5-packet",
    protocolId: CHECKPOINT_V22_RENDERING_REMEDY_V5_PROTOCOL_ID,
    status: "frozen-fifth-replacement-rendering-verification-packet",
    preview: {
      ...structuredClone(sourcePacket.preview),
      url:
        `http://127.0.0.1:${CHECKPOINT_V22_RENDERING_REMEDY_V5_PORT}/` +
        `${sourcePacket.preview.path}?debate=${sourcePacket.debateNumber}`
    },
    viewports: Object.fromEntries(
      Object.entries(CHECKPOINT_V22_RENDERING_REMEDY_V5_VIEWPORTS).map(
        ([name, viewport]) => [
          name,
          {
            targetCssViewport: { ...viewport.targetCssViewport },
            controllerInput: { ...viewport.controllerInput },
            evidence: evidencePaths(sourcePacket.debateNumber, name)
          }
        ]
      )
    ),
    requiredBooleanChecks: [
      ...CHECKPOINT_V22_RENDERING_REMEDY_V5_REQUIRED_BOOLEAN_CHECKS
    ],
    interactionOrder: [
      "verify-frozen-image-analyzer-hash",
      "set-frozen-controller-input",
      "open-separate-fresh-pointer-tab",
      "load-activation-tokenized-http-diagnostic-bootstrap",
      "enable-zero-tolerance-runtime-diagnostics",
      "navigate-to-activation-tokenized-pointer-candidate-url",
      "wait-frozen-post-load-settle",
      "single-direct-runtime-readiness-scroll-and-state-observation",
      "assert-exact-pointer-css-viewport",
      "capture-collapsed-direct-cdp-jpeg-quality-85",
      "analyze-collapsed-jpeg-before-persistence",
      "open-by-direct-cdp-pointer-event",
      "serialize-raw-open-state",
      "capture-open-direct-cdp-jpeg-quality-85",
      "analyze-open-jpeg-and-assert-pair-difference-before-persistence",
      "settle-read-pointer-runtime-diagnostics-and-close-tab",
      "reapply-frozen-controller-input",
      "open-separate-fresh-keyboard-tab",
      "load-activation-tokenized-http-diagnostic-bootstrap",
      "enable-zero-tolerance-runtime-diagnostics",
      "navigate-to-activation-tokenized-keyboard-candidate-url",
      "wait-frozen-post-load-settle",
      "single-direct-runtime-readiness-focus-and-state-observation",
      "open-with-supported-enter-press-and-serialize-raw-state",
      "close-with-supported-space-press-and-serialize-raw-state",
      "settle-read-keyboard-runtime-diagnostics-and-close-tab",
      "persist-evidence-only-if-every-dom-runtime-mutation-and-image-gate-passes"
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
      controller: "Google Chrome via ChatGPT browser extension",
      browserFamily: "Chromium",
      diagnosticBootstrapPath: syntheticBootstrapPath,
      diagnosticBootstrapBeforeRawDiagnosticsRequired: true,
      readinessMethod:
        "single-CDP-Runtime.evaluate-after-frozen-post-load-settle",
      postLoadSettleMilliseconds: 1000,
      pointerMethod:
        "CDP-Input.dispatchMouseEvent-at-serialized-summary-center",
      keyboardMethod:
        "locator.press-after-direct-CDP-readiness-and-focus",
      screenshotMethod: "CDP-Page.captureScreenshot",
      screenshotParameters: {
        format: "jpeg",
        quality: 85,
        fromSurface: true,
        captureBeyondViewport: false
      },
      imageAnalysisContractPath,
      imageAnalyzerPath: CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT.analyzerPath,
      imageAnalyzerSha256:
        CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT.analyzerSha256,
      imageContract: structuredClone(CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT),
      screenshotPixelDimensionContract:
        "controller-input-and-rounded-css-viewport-times-device-pixel-ratio",
      screenshotPairHashesMustDiffer: true,
      failedViewportEvidencePersistence: "none",
      invalidScreenshotPersistence: "none",
      retryPermitted: false,
      timeoutExtensionPermitted: false
    }
  };
  validateCheckpointV22RenderingRemedyV5Packet(packet);
  return packet;
}

export function validateCheckpointV22RenderingRemedyV5Packet(packet) {
  assertV4(
    packet.schemaVersion ===
        "1.0-production-checkpoint-v2.2-rendering-remedy-v5-packet" &&
      packet.protocolId === CHECKPOINT_V22_RENDERING_REMEDY_V5_PROTOCOL_ID &&
      packet.status ===
        "frozen-fifth-replacement-rendering-verification-packet" &&
      packet.productionCanary === true &&
      packet.stagingOnly === true &&
      CHECKPOINT_V22_RENDERING_REMEDY_V5_ORDER.includes(packet.debateNumber) &&
      packet.supersedes.protocolId ===
        "assessment-production-checkpoint-v2.2-1-rendering-verification-remedy-v4" &&
      /^[a-f0-9]{64}$/.test(packet.supersedes.packetSha256) &&
      packet.supersedes.priorEvidenceReusePermitted === false &&
      packet.preview.url.startsWith(
        `http://127.0.0.1:${CHECKPOINT_V22_RENDERING_REMEDY_V5_PORT}/`
      ) &&
      canonicalJson(packet.requiredBooleanChecks) === canonicalJson(
        CHECKPOINT_V22_RENDERING_REMEDY_V5_REQUIRED_BOOLEAN_CHECKS
      ) &&
      packet.runnerPolicy.diagnosticBootstrapBeforeRawDiagnosticsRequired === true &&
      packet.runnerPolicy.screenshotMethod === "CDP-Page.captureScreenshot" &&
      canonicalJson(packet.runnerPolicy.screenshotParameters) === canonicalJson({
        format: "jpeg",
        quality: 85,
        fromSurface: true,
        captureBeyondViewport: false
      }) &&
      canonicalJson(packet.runnerPolicy.imageContract) ===
        canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT) &&
      packet.runnerPolicy.screenshotPairHashesMustDiffer === true &&
      packet.runnerPolicy.invalidScreenshotPersistence === "none" &&
      packet.runnerPolicy.retryPermitted === false &&
      packet.runnerPolicy.timeoutExtensionPermitted === false &&
      packet.runnerPolicy.reloadPermitted === false &&
      packet.runnerPolicy.failedViewportEvidencePersistence === "none" &&
      Object.values(packet.mutationBoundary).every((value) => value === false),
    `${packet?.debateNumber ?? "unknown"}: invalid remedy-v5 packet`
  );
  for (const [name, expected] of Object.entries(
    CHECKPOINT_V22_RENDERING_REMEDY_V5_VIEWPORTS
  )) {
    const viewport = packet.viewports[name];
    const root =
      `${CHECKPOINT_V22_RENDERING_REMEDY_V5_ROOT}/evidence/debate-${packet.debateNumber}`;
    assertV4(
      canonicalJson(viewport.targetCssViewport) ===
          canonicalJson(expected.targetCssViewport) &&
        canonicalJson(viewport.controllerInput) ===
          canonicalJson(expected.controllerInput) &&
        viewport.evidence.result === `${root}/${name}.json` &&
        viewport.evidence.collapsedScreenshot ===
          `${root}/${name}-collapsed.jpg` &&
        viewport.evidence.openScreenshot === `${root}/${name}-open.jpg`,
      `${packet.debateNumber}: invalid ${name} remedy-v5 viewport`
    );
  }
  return packet;
}

function metricPasses(metrics, target) {
  return (
    metrics.actualInnerWidth === target.width &&
    metrics.actualInnerHeight === target.height &&
    metrics.documentScrollWidth <= metrics.actualInnerWidth &&
    metrics.maximumElementRight <= metrics.actualInnerWidth
  );
}

function screenshotTransportPasses(screenshot, viewport, devicePixelRatio) {
  const transport = screenshot.transport;
  const contract = CHECKPOINT_V22_RENDERING_REMEDY_V5_IMAGE_CONTRACT;
  const target = viewport.targetCssViewport;
  const controller = viewport.controllerInput;
  return (
    /^[a-f0-9]{64}$/.test(screenshot.sha256) &&
    transport.format === contract.format &&
    transport.signatureHex === contract.signatureHex &&
    transport.byteLength >= contract.minimumByteLength &&
    transport.uniqueColors >= contract.minimumUniqueColors &&
    transport.entropy >= contract.minimumEntropy &&
    transport.pixelWidth === controller.width &&
    transport.pixelHeight === controller.height &&
    transport.pixelWidth === Math.round(target.width * devicePixelRatio) &&
    transport.pixelHeight === Math.round(target.height * devicePixelRatio)
  );
}

export function validateCheckpointV22RenderingRemedyV5ViewportEvidence({
  packet,
  viewportName,
  activationNavigationToken,
  evidence
}) {
  validateCheckpointV22RenderingRemedyV5Packet(packet);
  const viewport = packet.viewports[viewportName];
  const target = viewport?.targetCssViewport;
  const states = evidence.rawAccordionStates;
  const ratio = evidence.metrics.pointerFreshLoad.devicePixelRatio;
  assertV4(
    viewport &&
      /^[a-f0-9]{64}$/.test(activationNavigationToken) &&
      evidence.schemaVersion ===
        "1.0-production-checkpoint-v2.2-rendering-remedy-v5-viewport-evidence" &&
      evidence.protocolId === CHECKPOINT_V22_RENDERING_REMEDY_V5_PROTOCOL_ID &&
      evidence.status === "passed-rendering-viewport" &&
      evidence.debateNumber === packet.debateNumber &&
      evidence.debateId === packet.debateId &&
      evidence.viewportName === viewportName &&
      evidence.navigationToken === activationNavigationToken &&
      canonicalJson(evidence.viewport.targetCssViewport) === canonicalJson(target) &&
      canonicalJson(evidence.viewport.controllerInput) ===
        canonicalJson(viewport.controllerInput) &&
      evidence.url === packet.preview.url &&
      evidence.browser.name ===
        "Google Chrome via ChatGPT browser extension" &&
      evidence.browser.pointerUserAgent.includes("Chrome/") &&
      evidence.browser.keyboardUserAgent.includes("Chrome/") &&
      evidence.screenshots.collapsed.path ===
        viewport.evidence.collapsedScreenshot &&
      evidence.screenshots.open.path === viewport.evidence.openScreenshot &&
      screenshotTransportPasses(evidence.screenshots.collapsed, viewport, ratio) &&
      screenshotTransportPasses(evidence.screenshots.open, viewport, ratio) &&
      evidence.screenshots.collapsed.sha256 !== evidence.screenshots.open.sha256 &&
      canonicalJson(Object.keys(evidence.checks)) ===
        canonicalJson(packet.requiredBooleanChecks) &&
      Object.values(evidence.checks).every((value) => value === true) &&
      states.pointerFresh.detailsOpen === false &&
      states.pointerFresh.openAttributePresent === false &&
      states.pointerFresh.hitTestSample.withinViewport === true &&
      states.pointerFresh.hitTestSample.contentOrDescendantHit === false &&
      states.pointerOpen.detailsOpen === true &&
      states.pointerOpen.openAttributePresent === true &&
      states.pointerOpen.hitTestSample.withinViewport === true &&
      states.pointerOpen.hitTestSample.contentOrDescendantHit === true &&
      states.keyboardFresh.detailsOpen === false &&
      states.keyboardFresh.openAttributePresent === false &&
      states.keyboardFresh.hitTestSample.withinViewport === true &&
      states.keyboardFresh.hitTestSample.contentOrDescendantHit === false &&
      states.keyboardAfterEnter.detailsOpen === true &&
      states.keyboardAfterEnter.openAttributePresent === true &&
      states.keyboardAfterEnter.hitTestSample.withinViewport === true &&
      states.keyboardAfterEnter.hitTestSample.contentOrDescendantHit === true &&
      states.keyboardAfterSpace.detailsOpen === false &&
      states.keyboardAfterSpace.openAttributePresent === false &&
      states.keyboardAfterSpace.hitTestSample.withinViewport === true &&
      states.keyboardAfterSpace.hitTestSample.contentOrDescendantHit === false &&
      metricPasses(evidence.metrics.pointerFreshLoad, target) &&
      metricPasses(evidence.metrics.pointerOpen, target) &&
      metricPasses(evidence.metrics.keyboardFreshLoad, target) &&
      packet.zeroCountChecks.every((key) => evidence.runtime.counts[key] === 0) &&
      Object.values(evidence.mutations).every((changed) => changed === false),
    `${packet?.debateNumber ?? "unknown"}: invalid ${viewportName} remedy-v5 evidence`
  );
  return evidence;
}
