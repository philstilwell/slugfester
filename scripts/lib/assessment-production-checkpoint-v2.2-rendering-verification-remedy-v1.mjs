import {
  CHECKPOINT_V22_RENDERING_REQUIRED_BOOLEAN_CHECKS,
  CHECKPOINT_V22_RENDERING_VERIFICATION_MODEL,
  CHECKPOINT_V22_RENDERING_VERIFICATION_ORDER,
  CHECKPOINT_V22_RENDERING_VERIFICATION_PROTOCOL_ID,
  CHECKPOINT_V22_RENDERING_VERIFICATION_VIEWPORTS,
  validateCheckpointV22RenderingVerificationPacket
} from "./assessment-production-checkpoint-v2.2-rendering-verification.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const CHECKPOINT_V22_RENDERING_REMEDY_V1_ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v1";
export const CHECKPOINT_V22_RENDERING_REMEDY_V1_PROTOCOL_ID =
  "assessment-production-checkpoint-v2.2-1-rendering-verification-remedy-v1";
export const CHECKPOINT_V22_RENDERING_REMEDY_V1_ORDER =
  CHECKPOINT_V22_RENDERING_VERIFICATION_ORDER;
export const CHECKPOINT_V22_RENDERING_REMEDY_V1_MODEL =
  CHECKPOINT_V22_RENDERING_VERIFICATION_MODEL;
export const CHECKPOINT_V22_RENDERING_REMEDY_V1_VIEWPORTS =
  CHECKPOINT_V22_RENDERING_VERIFICATION_VIEWPORTS;
export const CHECKPOINT_V22_RENDERING_REMEDY_V1_REQUIRED_BOOLEAN_CHECKS =
  CHECKPOINT_V22_RENDERING_REQUIRED_BOOLEAN_CHECKS;
export const CHECKPOINT_V22_RENDERING_REMEDY_V1_PORT = 4187;

function evidencePaths(debateNumber, viewportName) {
  const root =
    `${CHECKPOINT_V22_RENDERING_REMEDY_V1_ROOT}/evidence/debate-${debateNumber}`;
  return {
    result: `${root}/${viewportName}.json`,
    collapsedScreenshot: `${root}/${viewportName}-collapsed.png`,
    openScreenshot: `${root}/${viewportName}-open.png`
  };
}

export function buildCheckpointV22RenderingRemedyV1Packet({
  sourcePacket,
  sourcePacketPath,
  sourcePacketSha256,
  failedExecutionPath,
  failedAnalysisPath
}) {
  validateCheckpointV22RenderingVerificationPacket(sourcePacket);
  assertV4(
    sourcePacket.protocolId === CHECKPOINT_V22_RENDERING_VERIFICATION_PROTOCOL_ID &&
      /^[a-f0-9]{64}$/.test(sourcePacketSha256),
    `${sourcePacket?.debateNumber ?? "unknown"}: invalid superseded packet`
  );
  const packet = {
    ...structuredClone(sourcePacket),
    schemaVersion:
      "1.0-production-checkpoint-v2.2-rendering-remedy-v1-packet",
    protocolId: CHECKPOINT_V22_RENDERING_REMEDY_V1_PROTOCOL_ID,
    status: "frozen-replacement-rendering-verification-packet",
    supersedes: {
      protocolId: CHECKPOINT_V22_RENDERING_VERIFICATION_PROTOCOL_ID,
      packet: sourcePacketPath,
      packetSha256: sourcePacketSha256,
      failedExecution: failedExecutionPath,
      failedAnalysis: failedAnalysisPath,
      priorEvidenceReusePermitted: false
    },
    preview: {
      ...structuredClone(sourcePacket.preview),
      url:
        `http://127.0.0.1:${CHECKPOINT_V22_RENDERING_REMEDY_V1_PORT}/` +
        `${sourcePacket.preview.path}?debate=${sourcePacket.debateNumber}`
    },
    viewports: Object.fromEntries(
      Object.entries(CHECKPOINT_V22_RENDERING_REMEDY_V1_VIEWPORTS).map(
        ([name, viewport]) => [
          name,
          {
            ...viewport,
            evidence: evidencePaths(sourcePacket.debateNumber, name)
          }
        ]
      )
    ),
    interactionOrder: [
      "navigate-and-wait-for-normal-load",
      "wait-for-accordion-attached-and-assert-visible",
      "record-default-collapsed-state",
      "capture-collapsed-screenshot",
      "open-native-details-by-pointer",
      "record-open-state-and-capture-open-screenshot",
      "reload-and-wait-for-normal-load",
      "wait-for-accordion-attached-and-assert-visible-after-reload",
      "confirm-default-collapsed-after-reload",
      "focus-summary-and-open-with-enter",
      "close-with-space",
      "settle-and-read-zero-tolerance-runtime-diagnostics"
    ],
    runnerPolicy: {
      controller: "Google Chrome via ChatGPT browser extension",
      browserFamily: "Chromium",
      loadSignal: "load",
      elementWait: "attached-plus-positive-client-rects",
      chromiumVersionMethod: "Runtime.evaluate:navigator.userAgent",
      pointerMethod: "locator.click",
      keyboardMethod: "locator.press",
      keyboardStateTransitionsRequired: true,
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
  validateCheckpointV22RenderingRemedyV1Packet(packet);
  return packet;
}

export function validateCheckpointV22RenderingRemedyV1Packet(packet) {
  assertV4(
    packet.schemaVersion ===
        "1.0-production-checkpoint-v2.2-rendering-remedy-v1-packet" &&
      packet.protocolId === CHECKPOINT_V22_RENDERING_REMEDY_V1_PROTOCOL_ID &&
      packet.status === "frozen-replacement-rendering-verification-packet" &&
      packet.productionCanary === true &&
      packet.stagingOnly === true &&
      CHECKPOINT_V22_RENDERING_REMEDY_V1_ORDER.includes(packet.debateNumber) &&
      packet.supersedes.protocolId ===
        CHECKPOINT_V22_RENDERING_VERIFICATION_PROTOCOL_ID &&
      /^[a-f0-9]{64}$/.test(packet.supersedes.packetSha256) &&
      packet.supersedes.priorEvidenceReusePermitted === false &&
      packet.preview.url.startsWith(
        `http://127.0.0.1:${CHECKPOINT_V22_RENDERING_REMEDY_V1_PORT}/`
      ) &&
      packet.preview.localOnly === true &&
      packet.preview.noindex === true &&
      canonicalJson(packet.requiredBooleanChecks) ===
        canonicalJson(CHECKPOINT_V22_RENDERING_REMEDY_V1_REQUIRED_BOOLEAN_CHECKS) &&
      canonicalJson(packet.zeroCountChecks) === canonicalJson([
        "consoleErrors",
        "consoleWarnings",
        "pageErrors",
        "failedRequests"
      ]) &&
      packet.runnerPolicy.controller ===
        "Google Chrome via ChatGPT browser extension" &&
      packet.runnerPolicy.loadSignal === "load" &&
      packet.runnerPolicy.elementWait ===
        "attached-plus-positive-client-rects" &&
      packet.runnerPolicy.chromiumVersionMethod ===
        "Runtime.evaluate:navigator.userAgent" &&
      packet.runnerPolicy.keyboardStateTransitionsRequired === true &&
      packet.runnerPolicy.diagnosticSettleMilliseconds === 3000 &&
      packet.runnerPolicy.failedRequestIgnoreList.length === 0 &&
      packet.runnerPolicy.failedViewportEvidencePersistence === "none" &&
      packet.runnerPolicy.freshLocalhostOrigin === true &&
      Object.values(packet.mutationBoundary).every((value) => value === false),
    `${packet?.debateNumber ?? "unknown"}: invalid replacement rendering packet`
  );
  for (const [name, expected] of Object.entries(
    CHECKPOINT_V22_RENDERING_REMEDY_V1_VIEWPORTS
  )) {
    const viewport = packet.viewports[name];
    const evidenceRoot =
      `${CHECKPOINT_V22_RENDERING_REMEDY_V1_ROOT}/evidence/` +
      `debate-${packet.debateNumber}`;
    assertV4(
      viewport.width === expected.width &&
        viewport.height === expected.height &&
        viewport.evidence.result === `${evidenceRoot}/${name}.json` &&
        viewport.evidence.collapsedScreenshot ===
          `${evidenceRoot}/${name}-collapsed.png` &&
        viewport.evidence.openScreenshot ===
          `${evidenceRoot}/${name}-open.png`,
      `${packet.debateNumber}: invalid ${name} replacement viewport contract`
    );
  }
  return packet;
}

export function validateCheckpointV22RenderingRemedyV1ViewportEvidence({
  packet,
  viewportName,
  evidence
}) {
  validateCheckpointV22RenderingRemedyV1Packet(packet);
  const viewport = packet.viewports[viewportName];
  assertV4(
    viewport &&
      evidence.schemaVersion ===
        "1.0-production-checkpoint-v2.2-rendering-remedy-v1-viewport-evidence" &&
      evidence.protocolId === CHECKPOINT_V22_RENDERING_REMEDY_V1_PROTOCOL_ID &&
      evidence.status === "passed-rendering-viewport" &&
      evidence.debateNumber === packet.debateNumber &&
      evidence.debateId === packet.debateId &&
      evidence.viewportName === viewportName &&
      evidence.viewport.width === viewport.width &&
      evidence.viewport.height === viewport.height &&
      evidence.url === packet.preview.url &&
      evidence.browser.name === "Google Chrome via ChatGPT browser extension" &&
      typeof evidence.browser.version === "string" &&
      evidence.browser.version.includes("Chrome/") &&
      evidence.screenshots.collapsed.path ===
        viewport.evidence.collapsedScreenshot &&
      /^[a-f0-9]{64}$/.test(evidence.screenshots.collapsed.sha256) &&
      evidence.screenshots.open.path === viewport.evidence.openScreenshot &&
      /^[a-f0-9]{64}$/.test(evidence.screenshots.open.sha256) &&
      canonicalJson(Object.keys(evidence.checks)) ===
        canonicalJson(packet.requiredBooleanChecks) &&
      Object.values(evidence.checks).every((value) => value === true) &&
      packet.zeroCountChecks.every((key) => evidence.runtime.counts[key] === 0) &&
      evidence.metrics.documentScrollWidth <= evidence.viewport.width &&
      evidence.metrics.openDocumentScrollWidth <= evidence.viewport.width &&
      evidence.metrics.maximumElementRight <= evidence.viewport.width &&
      evidence.metrics.openMaximumElementRight <= evidence.viewport.width &&
      Object.values(evidence.mutations).every((changed) => changed === false),
    `${packet?.debateNumber ?? "unknown"}: invalid ${viewportName} replacement evidence`
  );
  return evidence;
}
