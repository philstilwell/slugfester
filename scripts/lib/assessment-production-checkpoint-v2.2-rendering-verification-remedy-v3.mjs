import {
  CHECKPOINT_V22_RENDERING_REMEDY_V2_MODEL,
  CHECKPOINT_V22_RENDERING_REMEDY_V2_ORDER,
  CHECKPOINT_V22_RENDERING_REMEDY_V2_VIEWPORTS,
  validateCheckpointV22RenderingRemedyV2Packet
} from "./assessment-production-checkpoint-v2.2-rendering-verification-remedy-v2.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const CHECKPOINT_V22_RENDERING_REMEDY_V3_ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v3";
export const CHECKPOINT_V22_RENDERING_REMEDY_V3_PROTOCOL_ID =
  "assessment-production-checkpoint-v2.2-1-rendering-verification-remedy-v3";
export const CHECKPOINT_V22_RENDERING_REMEDY_V3_ORDER =
  CHECKPOINT_V22_RENDERING_REMEDY_V2_ORDER;
export const CHECKPOINT_V22_RENDERING_REMEDY_V3_MODEL =
  CHECKPOINT_V22_RENDERING_REMEDY_V2_MODEL;
export const CHECKPOINT_V22_RENDERING_REMEDY_V3_VIEWPORTS =
  CHECKPOINT_V22_RENDERING_REMEDY_V2_VIEWPORTS;
export const CHECKPOINT_V22_RENDERING_REMEDY_V3_PORT = 4191;
export const CHECKPOINT_V22_RENDERING_REMEDY_V3_REQUIRED_BOOLEAN_CHECKS =
  Object.freeze([
    "publicationStagingRoute",
    "noindex",
    "stagingBanner",
    "exactByline",
    "overallImmediatelyPrecedesAiExtension",
    "aiExtensionHeading",
    "nativeDetails",
    "pointerFreshDetailsClosed",
    "pointerFreshOpenAttributeAbsent",
    "pointerFreshContentNotHitTestVisible",
    "pointerOpen",
    "pointerOpenAttributePresent",
    "pointerContentHitTestVisible",
    "keyboardFreshDetailsClosed",
    "keyboardFreshOpenAttributeAbsent",
    "keyboardFreshContentNotHitTestVisible",
    "keyboardEnterOpen",
    "keyboardEnterOpenAttributePresent",
    "keyboardContentHitTestVisibleAfterEnter",
    "keyboardSpaceClosed",
    "keyboardSpaceOpenAttributeAbsent",
    "keyboardContentNotHitTestVisibleAfterSpace",
    "aiDisclosureVisibleWhenOpen",
    "twoStrengthenedFinalArguments",
    "newArgumentsForBothSides",
    "distinctFromOverallCommentary",
    "prohibitedUnassailableAbsent",
    "pointerActualViewportMatchesRequested",
    "openActualViewportMatchesRequested",
    "keyboardActualViewportMatchesRequested",
    "horizontalOverflowAbsent"
  ]);

function evidencePaths(debateNumber, viewportName) {
  const root =
    `${CHECKPOINT_V22_RENDERING_REMEDY_V3_ROOT}/evidence/debate-${debateNumber}`;
  return {
    result: `${root}/${viewportName}.json`,
    collapsedScreenshot: `${root}/${viewportName}-collapsed.png`,
    openScreenshot: `${root}/${viewportName}-open.png`
  };
}

export function buildCheckpointV22RenderingRemedyV3Packet({
  sourcePacket,
  sourcePacketPath,
  sourcePacketSha256,
  failedExecutionPath,
  failedAnalysisPath,
  syntheticBootstrapPath
}) {
  validateCheckpointV22RenderingRemedyV2Packet(sourcePacket);
  assertV4(
    /^[a-f0-9]{64}$/.test(sourcePacketSha256),
    `${sourcePacket?.debateNumber ?? "unknown"}: invalid remedy-v2 packet hash`
  );
  const packet = {
    ...structuredClone(sourcePacket),
    schemaVersion:
      "1.0-production-checkpoint-v2.2-rendering-remedy-v3-packet",
    protocolId: CHECKPOINT_V22_RENDERING_REMEDY_V3_PROTOCOL_ID,
    status: "frozen-third-replacement-rendering-verification-packet",
    preview: {
      ...structuredClone(sourcePacket.preview),
      url:
        `http://127.0.0.1:${CHECKPOINT_V22_RENDERING_REMEDY_V3_PORT}/` +
        `${sourcePacket.preview.path}?debate=${sourcePacket.debateNumber}`
    },
    viewports: Object.fromEntries(
      Object.entries(CHECKPOINT_V22_RENDERING_REMEDY_V3_VIEWPORTS).map(
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
      ...CHECKPOINT_V22_RENDERING_REMEDY_V3_REQUIRED_BOOLEAN_CHECKS
    ],
    interactionOrder: [
      "set-frozen-controller-input",
      "open-separate-fresh-pointer-tab",
      "load-activation-tokenized-diagnostic-bootstrap",
      "enable-zero-tolerance-runtime-diagnostics",
      "navigate-to-activation-tokenized-pointer-candidate-url",
      "scroll-summary-into-hit-test-view-without-changing-open-state",
      "serialize-pointer-fresh-details-open-open-attribute-hit-test-and-geometry",
      "assert-exact-pointer-css-viewport",
      "capture-collapsed-screenshot",
      "open-by-pointer-and-serialize-raw-open-state",
      "capture-open-screenshot",
      "settle-read-pointer-runtime-diagnostics-and-close-tab",
      "reapply-frozen-controller-input",
      "open-separate-fresh-keyboard-tab",
      "load-activation-tokenized-diagnostic-bootstrap",
      "enable-zero-tolerance-runtime-diagnostics",
      "navigate-to-activation-tokenized-keyboard-candidate-url",
      "scroll-summary-into-hit-test-view-without-changing-open-state",
      "serialize-keyboard-fresh-details-open-open-attribute-hit-test-and-geometry",
      "open-with-enter-and-serialize-raw-open-state",
      "close-with-space-and-serialize-raw-closed-state",
      "settle-read-keyboard-runtime-diagnostics-and-close-tab"
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
      controller: "Google Chrome via ChatGPT browser extension",
      browserFamily: "Chromium",
      viewportContract:
        "frozen-controller-input-plus-exact-observed-css-viewport",
      calibrationIsFrozenNotAdaptive: true,
      diagnosticBootstrapPath: syntheticBootstrapPath,
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
      activationTokenQueryKey: "renderingExecution",
      phaseQueryKey: "renderingPhase",
      viewportQueryKey: "renderingViewport",
      stageQueryKey: "renderingStage",
      pointerMethod: "locator.click",
      keyboardMethod: "locator.press",
      loadSignal: "load",
      elementWait: "attached-plus-positive-summary-client-rects",
      chromiumVersionMethod: "Runtime.evaluate:navigator.userAgent",
      diagnosticSettleMilliseconds: 3000,
      failedRequestIgnoreList: [],
      failedViewportEvidencePersistence: "none",
      freshLocalhostOrigin: true
    }
  };
  validateCheckpointV22RenderingRemedyV3Packet(packet);
  return packet;
}

export function validateCheckpointV22RenderingRemedyV3Packet(packet) {
  assertV4(
    packet.schemaVersion ===
        "1.0-production-checkpoint-v2.2-rendering-remedy-v3-packet" &&
      packet.protocolId === CHECKPOINT_V22_RENDERING_REMEDY_V3_PROTOCOL_ID &&
      packet.status ===
        "frozen-third-replacement-rendering-verification-packet" &&
      packet.productionCanary === true &&
      packet.stagingOnly === true &&
      CHECKPOINT_V22_RENDERING_REMEDY_V3_ORDER.includes(packet.debateNumber) &&
      packet.supersedes.protocolId ===
        "assessment-production-checkpoint-v2.2-1-rendering-verification-remedy-v2" &&
      /^[a-f0-9]{64}$/.test(packet.supersedes.packetSha256) &&
      packet.supersedes.priorEvidenceReusePermitted === false &&
      packet.preview.url.startsWith(
        `http://127.0.0.1:${CHECKPOINT_V22_RENDERING_REMEDY_V3_PORT}/`
      ) &&
      canonicalJson(packet.requiredBooleanChecks) ===
        canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V3_REQUIRED_BOOLEAN_CHECKS) &&
      packet.runnerPolicy.stateAuthority === "native-details-open-property" &&
      packet.runnerPolicy.openAttributeCorroborationRequired === true &&
      packet.runnerPolicy.contentVisibilityGate ===
        "element-from-point-hit-test-after-summary-scroll" &&
      packet.runnerPolicy.contentClientRectsUse ===
        "diagnostic-only-never-gating" &&
      packet.runnerPolicy.activationNavigationTokenRequired === true &&
      packet.runnerPolicy.freshTabPerInteractionPhase === true &&
      packet.runnerPolicy.reloadPermitted === false &&
      packet.runnerPolicy.failedRequestIgnoreList.length === 0 &&
      packet.runnerPolicy.failedViewportEvidencePersistence === "none" &&
      Object.values(packet.mutationBoundary).every((value) => value === false),
    `${packet?.debateNumber ?? "unknown"}: invalid remedy-v3 packet`
  );
  for (const [name, expected] of Object.entries(
    CHECKPOINT_V22_RENDERING_REMEDY_V3_VIEWPORTS
  )) {
    const viewport = packet.viewports[name];
    const root =
      `${CHECKPOINT_V22_RENDERING_REMEDY_V3_ROOT}/evidence/debate-${packet.debateNumber}`;
    assertV4(
      canonicalJson(viewport.targetCssViewport) ===
          canonicalJson(expected.targetCssViewport) &&
        canonicalJson(viewport.controllerInput) ===
          canonicalJson(expected.controllerInput) &&
        viewport.evidence.result === `${root}/${name}.json` &&
        viewport.evidence.collapsedScreenshot ===
          `${root}/${name}-collapsed.png` &&
        viewport.evidence.openScreenshot === `${root}/${name}-open.png`,
      `${packet.debateNumber}: invalid ${name} remedy-v3 viewport`
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

export function validateCheckpointV22RenderingRemedyV3ViewportEvidence({
  packet,
  viewportName,
  activationNavigationToken,
  evidence
}) {
  validateCheckpointV22RenderingRemedyV3Packet(packet);
  const viewport = packet.viewports[viewportName];
  const target = viewport?.targetCssViewport;
  const states = evidence.rawAccordionStates;
  assertV4(
    viewport &&
      /^[a-f0-9]{64}$/.test(activationNavigationToken) &&
      evidence.schemaVersion ===
        "1.0-production-checkpoint-v2.2-rendering-remedy-v3-viewport-evidence" &&
      evidence.protocolId === CHECKPOINT_V22_RENDERING_REMEDY_V3_PROTOCOL_ID &&
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
      /^[a-f0-9]{64}$/.test(evidence.screenshots.collapsed.sha256) &&
      evidence.screenshots.open.path === viewport.evidence.openScreenshot &&
      /^[a-f0-9]{64}$/.test(evidence.screenshots.open.sha256) &&
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
    `${packet?.debateNumber ?? "unknown"}: invalid ${viewportName} remedy-v3 evidence`
  );
  return evidence;
}
