import {
  CHECKPOINT_V22_RENDERING_VERIFICATION_MODEL,
  CHECKPOINT_V22_RENDERING_VERIFICATION_ORDER
} from "./assessment-production-checkpoint-v2.2-rendering-verification.mjs";
import {
  validateCheckpointV22RenderingRemedyV1Packet
} from "./assessment-production-checkpoint-v2.2-rendering-verification-remedy-v1.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const CHECKPOINT_V22_RENDERING_REMEDY_V2_ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v2";
export const CHECKPOINT_V22_RENDERING_REMEDY_V2_PROTOCOL_ID =
  "assessment-production-checkpoint-v2.2-1-rendering-verification-remedy-v2";
export const CHECKPOINT_V22_RENDERING_REMEDY_V2_ORDER =
  CHECKPOINT_V22_RENDERING_VERIFICATION_ORDER;
export const CHECKPOINT_V22_RENDERING_REMEDY_V2_MODEL =
  CHECKPOINT_V22_RENDERING_VERIFICATION_MODEL;
export const CHECKPOINT_V22_RENDERING_REMEDY_V2_PORT = 4189;
export const CHECKPOINT_V22_RENDERING_REMEDY_V2_VIEWPORTS = Object.freeze({
  desktop: Object.freeze({
    targetCssViewport: Object.freeze({ width: 1440, height: 1000 }),
    controllerInput: Object.freeze({ width: 1152, height: 800 })
  }),
  mobile: Object.freeze({
    targetCssViewport: Object.freeze({ width: 390, height: 844 }),
    controllerInput: Object.freeze({ width: 312, height: 675 })
  })
});
export const CHECKPOINT_V22_RENDERING_REMEDY_V2_REQUIRED_BOOLEAN_CHECKS =
  Object.freeze([
    "publicationStagingRoute",
    "noindex",
    "stagingBanner",
    "exactByline",
    "overallImmediatelyPrecedesAiExtension",
    "aiExtensionHeading",
    "nativeDetails",
    "pointerFreshLoadCollapsed",
    "pointerOpen",
    "keyboardFreshLoadCollapsed",
    "keyboardEnterOpen",
    "keyboardSpaceClose",
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
    `${CHECKPOINT_V22_RENDERING_REMEDY_V2_ROOT}/evidence/debate-${debateNumber}`;
  return {
    result: `${root}/${viewportName}.json`,
    collapsedScreenshot: `${root}/${viewportName}-collapsed.png`,
    openScreenshot: `${root}/${viewportName}-open.png`
  };
}

export function buildCheckpointV22RenderingRemedyV2Packet({
  sourcePacket,
  sourcePacketPath,
  sourcePacketSha256,
  failedExecutionPath,
  failedAnalysisPath,
  syntheticBootstrapPath
}) {
  validateCheckpointV22RenderingRemedyV1Packet(sourcePacket);
  assertV4(
    sourcePacket.protocolId ===
        "assessment-production-checkpoint-v2.2-1-rendering-verification-remedy-v1" &&
      /^[a-f0-9]{64}$/.test(sourcePacketSha256),
    `${sourcePacket?.debateNumber ?? "unknown"}: invalid remedy-v1 packet`
  );
  const packet = {
    ...structuredClone(sourcePacket),
    schemaVersion:
      "1.0-production-checkpoint-v2.2-rendering-remedy-v2-packet",
    protocolId: CHECKPOINT_V22_RENDERING_REMEDY_V2_PROTOCOL_ID,
    status: "frozen-second-replacement-rendering-verification-packet",
    preview: {
      ...structuredClone(sourcePacket.preview),
      url:
        `http://127.0.0.1:${CHECKPOINT_V22_RENDERING_REMEDY_V2_PORT}/` +
        `${sourcePacket.preview.path}?debate=${sourcePacket.debateNumber}`
    },
    viewports: Object.fromEntries(
      Object.entries(CHECKPOINT_V22_RENDERING_REMEDY_V2_VIEWPORTS).map(
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
      ...CHECKPOINT_V22_RENDERING_REMEDY_V2_REQUIRED_BOOLEAN_CHECKS
    ],
    interactionOrder: [
      "set-frozen-controller-input-for-target-css-viewport",
      "open-fresh-pointer-tab",
      "load-synthetic-diagnostic-bootstrap",
      "enable-zero-tolerance-runtime-diagnostics",
      "navigate-to-candidate-with-pointer-phase-marker-and-wait-for-normal-load",
      "assert-observed-pointer-viewport-exactly-matches-target-css-viewport",
      "record-pointer-fresh-load-collapsed-state",
      "capture-collapsed-screenshot",
      "open-native-details-by-pointer",
      "record-open-state-viewport-and-layout-metrics",
      "capture-open-screenshot",
      "settle-read-pointer-runtime-diagnostics-and-close-tab",
      "reapply-frozen-controller-input",
      "open-separate-fresh-keyboard-tab",
      "load-synthetic-diagnostic-bootstrap",
      "enable-zero-tolerance-runtime-diagnostics",
      "navigate-to-candidate-with-keyboard-phase-marker-and-wait-for-normal-load",
      "assert-observed-keyboard-viewport-exactly-matches-target-css-viewport",
      "record-keyboard-fresh-load-collapsed-state",
      "focus-summary-and-open-with-enter",
      "close-with-space",
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
      sessionRestorationUsedToAssessDefaultCollapsed: false,
      phaseMarkers: ["renderingPhase=pointer", "renderingPhase=keyboard"],
      loadSignal: "load",
      elementWait: "attached-plus-positive-client-rects",
      chromiumVersionMethod: "Runtime.evaluate:navigator.userAgent",
      pointerMethod: "locator.click",
      keyboardMethod: "locator.press",
      diagnostics: [
        "Runtime.exceptionThrown",
        "Log.entryAdded",
        "Network.loadingFailed",
        "Network.responseReceived-status-greater-than-or-equal-to-400"
      ],
      diagnosticSettleMilliseconds: 3000,
      failedRequestIgnoreList: [],
      failedViewportEvidencePersistence: "none",
      freshLocalhostOrigin: true
    }
  };
  validateCheckpointV22RenderingRemedyV2Packet(packet);
  return packet;
}

export function validateCheckpointV22RenderingRemedyV2Packet(packet) {
  assertV4(
    packet.schemaVersion ===
        "1.0-production-checkpoint-v2.2-rendering-remedy-v2-packet" &&
      packet.protocolId === CHECKPOINT_V22_RENDERING_REMEDY_V2_PROTOCOL_ID &&
      packet.status ===
        "frozen-second-replacement-rendering-verification-packet" &&
      packet.productionCanary === true &&
      packet.stagingOnly === true &&
      CHECKPOINT_V22_RENDERING_REMEDY_V2_ORDER.includes(packet.debateNumber) &&
      packet.supersedes.protocolId ===
        "assessment-production-checkpoint-v2.2-1-rendering-verification-remedy-v1" &&
      /^[a-f0-9]{64}$/.test(packet.supersedes.packetSha256) &&
      packet.supersedes.priorEvidenceReusePermitted === false &&
      packet.preview.url.startsWith(
        `http://127.0.0.1:${CHECKPOINT_V22_RENDERING_REMEDY_V2_PORT}/`
      ) &&
      packet.preview.localOnly === true &&
      packet.preview.noindex === true &&
      canonicalJson(packet.requiredBooleanChecks) ===
        canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V2_REQUIRED_BOOLEAN_CHECKS) &&
      canonicalJson(packet.zeroCountChecks) ===
        canonicalJson([
          "consoleErrors",
          "consoleWarnings",
          "pageErrors",
          "failedRequests"
        ]) &&
      packet.runnerPolicy.viewportContract ===
        "frozen-controller-input-plus-exact-observed-css-viewport" &&
      packet.runnerPolicy.calibrationIsFrozenNotAdaptive === true &&
      packet.runnerPolicy.freshTabPerInteractionPhase === true &&
      packet.runnerPolicy.reloadPermitted === false &&
      packet.runnerPolicy.sessionRestorationUsedToAssessDefaultCollapsed === false &&
      packet.runnerPolicy.diagnosticBootstrapLoadsPerViewport === 2 &&
      packet.runnerPolicy.measuredCandidateLoadsPerViewport === 2 &&
      packet.runnerPolicy.failedRequestIgnoreList.length === 0 &&
      packet.runnerPolicy.failedViewportEvidencePersistence === "none" &&
      Object.values(packet.mutationBoundary).every((value) => value === false),
    `${packet?.debateNumber ?? "unknown"}: invalid remedy-v2 packet`
  );
  for (const [name, expected] of Object.entries(
    CHECKPOINT_V22_RENDERING_REMEDY_V2_VIEWPORTS
  )) {
    const viewport = packet.viewports[name];
    const evidenceRoot =
      `${CHECKPOINT_V22_RENDERING_REMEDY_V2_ROOT}/evidence/debate-${packet.debateNumber}`;
    assertV4(
      canonicalJson(viewport.targetCssViewport) ===
          canonicalJson(expected.targetCssViewport) &&
        canonicalJson(viewport.controllerInput) ===
          canonicalJson(expected.controllerInput) &&
        viewport.evidence.result === `${evidenceRoot}/${name}.json` &&
        viewport.evidence.collapsedScreenshot ===
          `${evidenceRoot}/${name}-collapsed.png` &&
        viewport.evidence.openScreenshot ===
          `${evidenceRoot}/${name}-open.png`,
      `${packet.debateNumber}: invalid ${name} remedy-v2 viewport contract`
    );
  }
  return packet;
}

function metricWithinViewport(metrics, viewport) {
  return (
    metrics.actualInnerWidth === viewport.width &&
    metrics.actualInnerHeight === viewport.height &&
    metrics.documentScrollWidth <= metrics.actualInnerWidth &&
    metrics.maximumElementRight <= metrics.actualInnerWidth
  );
}

export function validateCheckpointV22RenderingRemedyV2ViewportEvidence({
  packet,
  viewportName,
  evidence
}) {
  validateCheckpointV22RenderingRemedyV2Packet(packet);
  const viewport = packet.viewports[viewportName];
  const target = viewport?.targetCssViewport;
  assertV4(
    viewport &&
      evidence.schemaVersion ===
        "1.0-production-checkpoint-v2.2-rendering-remedy-v2-viewport-evidence" &&
      evidence.protocolId === CHECKPOINT_V22_RENDERING_REMEDY_V2_PROTOCOL_ID &&
      evidence.status === "passed-rendering-viewport" &&
      evidence.debateNumber === packet.debateNumber &&
      evidence.debateId === packet.debateId &&
      evidence.viewportName === viewportName &&
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
      evidence.accordionStates.pointerFreshLoadCollapsed === true &&
      evidence.accordionStates.pointerOpen === true &&
      evidence.accordionStates.keyboardFreshLoadCollapsed === true &&
      evidence.accordionStates.keyboardEnterOpen === true &&
      evidence.accordionStates.keyboardSpaceClose === true &&
      metricWithinViewport(evidence.metrics.pointerFreshLoad, target) &&
      metricWithinViewport(evidence.metrics.pointerOpen, target) &&
      metricWithinViewport(evidence.metrics.keyboardFreshLoad, target) &&
      packet.zeroCountChecks.every(
        (key) => evidence.runtime.counts[key] === 0
      ) &&
      Object.values(evidence.mutations).every((changed) => changed === false),
    `${packet?.debateNumber ?? "unknown"}: invalid ${viewportName} remedy-v2 evidence`
  );
  return evidence;
}
