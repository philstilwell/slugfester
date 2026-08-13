import {
  CHECKPOINT_V22_PUBLICATION_BYLINE,
  CHECKPOINT_V22_PUBLICATION_MODEL
} from "./assessment-production-checkpoint-v2.2-publication.mjs";
import {
  CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER
} from "./assessment-production-checkpoint-v2.2-publication-finalization.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification";
export const CHECKPOINT_V22_RENDERING_VERIFICATION_PROTOCOL_ID =
  "assessment-production-checkpoint-v2.2-1-rendering-verification";
export const CHECKPOINT_V22_RENDERING_VERIFICATION_ORDER =
  CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER;
export const CHECKPOINT_V22_RENDERING_VERIFICATION_BYLINE =
  CHECKPOINT_V22_PUBLICATION_BYLINE;
export const CHECKPOINT_V22_RENDERING_VERIFICATION_MODEL =
  CHECKPOINT_V22_PUBLICATION_MODEL;
export const CHECKPOINT_V22_RENDERING_VERIFICATION_VIEWPORTS = Object.freeze({
  desktop: Object.freeze({ width: 1440, height: 1000 }),
  mobile: Object.freeze({ width: 390, height: 844 })
});

export const CHECKPOINT_V22_RENDERING_REQUIRED_BOOLEAN_CHECKS = Object.freeze([
  "publicationStagingRoute",
  "noindex",
  "stagingBanner",
  "exactByline",
  "overallImmediatelyPrecedesAiExtension",
  "aiExtensionHeading",
  "nativeDetails",
  "defaultCollapsed",
  "pointerOpen",
  "keyboardEnterOpen",
  "keyboardSpaceClose",
  "aiDisclosureVisibleWhenOpen",
  "twoStrengthenedFinalArguments",
  "newArgumentsForBothSides",
  "distinctFromOverallCommentary",
  "prohibitedUnassailableAbsent",
  "horizontalOverflowAbsent"
]);

function evidencePaths(debateNumber, viewportName) {
  const root = `${CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT}/evidence/debate-${debateNumber}`;
  return {
    result: `${root}/${viewportName}.json`,
    collapsedScreenshot: `${root}/${viewportName}-collapsed.png`,
    openScreenshot: `${root}/${viewportName}-open.png`
  };
}

export function buildCheckpointV22RenderingVerificationPacket({
  auditRow,
  candidate,
  provenance,
  previewPath,
  previewSha256
}) {
  assertV4(
    auditRow &&
      candidate.number === auditRow.debateNumber &&
      candidate.id === auditRow.debateId &&
      provenance.debateNumber === auditRow.debateNumber &&
      provenance.debateId === auditRow.debateId &&
      provenance.model.label === CHECKPOINT_V22_RENDERING_VERIFICATION_MODEL.label &&
      provenance.model.reasoningEffort ===
        CHECKPOINT_V22_RENDERING_VERIFICATION_MODEL.reasoningEffort &&
      provenance.model.authentication ===
        CHECKPOINT_V22_RENDERING_VERIFICATION_MODEL.authentication &&
      provenance.model.participantJudgmentWasScoreBlind === true &&
      provenance.displayContract.byline ===
        CHECKPOINT_V22_RENDERING_VERIFICATION_BYLINE &&
      provenance.displayContract.defaultCollapsed === true,
    `${auditRow?.debateNumber ?? "unknown"}: finalization provenance changed`
  );
  const newArguments = {
    pro: candidate.logicalExtension.pro.newArguments.length,
    con: candidate.logicalExtension.con.newArguments.length
  };
  const packet = {
    schemaVersion:
      "1.0-production-checkpoint-v2.2-rendering-verification-packet",
    protocolId: CHECKPOINT_V22_RENDERING_VERIFICATION_PROTOCOL_ID,
    status: "frozen-rendering-verification-packet",
    productionCanary: true,
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
      participantJudgmentWasScoreBlind:
        provenance.model.participantJudgmentWasScoreBlind
    },
    preview: {
      path: previewPath,
      sha256: previewSha256,
      url:
        `http://127.0.0.1:4174/${previewPath}?debate=${auditRow.debateNumber}`,
      localOnly: true,
      noindex: true
    },
    expectedDisplay: {
      byline: CHECKPOINT_V22_RENDERING_VERIFICATION_BYLINE,
      stagingBannerPrefix: "Publication staging preview:",
      overallHeading: "Overall commentary",
      aiExtensionHeading: "AI Extension",
      disclosurePrefix: "This section is an AI-generated contribution",
      nativeElement: "details",
      defaultCollapsed: true,
      prohibitedText: ["unassailable"]
    },
    viewports: Object.fromEntries(
      Object.entries(CHECKPOINT_V22_RENDERING_VERIFICATION_VIEWPORTS).map(
        ([name, viewport]) => [
          name,
          {
            ...viewport,
            evidence: evidencePaths(auditRow.debateNumber, name)
          }
        ]
      )
    ),
    requiredBooleanChecks:
      CHECKPOINT_V22_RENDERING_REQUIRED_BOOLEAN_CHECKS,
    zeroCountChecks: [
      "consoleErrors",
      "consoleWarnings",
      "pageErrors",
      "failedRequests"
    ],
    interactionOrder: [
      "load-and-record-collapsed-state",
      "capture-collapsed-screenshot",
      "open-native-details-by-pointer",
      "record-open-state-and-capture-open-screenshot",
      "reload-and-confirm-default-collapsed",
      "focus-summary-and-open-with-enter",
      "close-with-space"
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
      compatibilityRemediesWritable: false
    }
  };
  validateCheckpointV22RenderingVerificationPacket(packet);
  return packet;
}

export function validateCheckpointV22RenderingVerificationPacket(packet) {
  assertV4(
    packet.schemaVersion ===
        "1.0-production-checkpoint-v2.2-rendering-verification-packet" &&
      packet.protocolId === CHECKPOINT_V22_RENDERING_VERIFICATION_PROTOCOL_ID &&
      packet.status === "frozen-rendering-verification-packet" &&
      packet.productionCanary === true &&
      packet.stagingOnly === true &&
      CHECKPOINT_V22_RENDERING_VERIFICATION_ORDER.includes(
        packet.debateNumber
      ) &&
      packet.preview.localOnly === true &&
      packet.preview.noindex === true &&
      packet.expectedDisplay.byline ===
        CHECKPOINT_V22_RENDERING_VERIFICATION_BYLINE &&
      packet.expectedDisplay.nativeElement === "details" &&
      packet.expectedDisplay.defaultCollapsed === true &&
      canonicalJson(packet.requiredBooleanChecks) ===
        canonicalJson(CHECKPOINT_V22_RENDERING_REQUIRED_BOOLEAN_CHECKS) &&
      packet.candidate.aiExtensionSides === 2 &&
      packet.candidate.strengthenedFinalArguments === 2 &&
      packet.candidate.newArguments.pro >= 2 &&
      packet.candidate.newArguments.con >= 2 &&
      Object.values(packet.mutationBoundary).every((value) => value === false),
    `${packet?.debateNumber ?? "unknown"}: invalid rendering packet`
  );
  for (const [name, expected] of Object.entries(
    CHECKPOINT_V22_RENDERING_VERIFICATION_VIEWPORTS
  )) {
    assertV4(
      packet.viewports[name].width === expected.width &&
        packet.viewports[name].height === expected.height &&
        packet.viewports[name].evidence.result.endsWith(`/${name}.json`) &&
        packet.viewports[name].evidence.collapsedScreenshot.endsWith(
          `/${name}-collapsed.png`
        ) &&
        packet.viewports[name].evidence.openScreenshot.endsWith(
          `/${name}-open.png`
        ),
      `${packet.debateNumber}: invalid ${name} viewport contract`
    );
  }
  return packet;
}

export function validateCheckpointV22RenderingViewportEvidence({
  packet,
  viewportName,
  evidence
}) {
  validateCheckpointV22RenderingVerificationPacket(packet);
  const expectedViewport = packet.viewports[viewportName];
  assertV4(expectedViewport, `${packet.debateNumber}: unknown viewport`);
  assertV4(
    evidence.schemaVersion ===
        "1.0-production-checkpoint-v2.2-rendering-viewport-evidence" &&
      evidence.protocolId === CHECKPOINT_V22_RENDERING_VERIFICATION_PROTOCOL_ID &&
      evidence.status === "passed-rendering-viewport" &&
      evidence.debateNumber === packet.debateNumber &&
      evidence.debateId === packet.debateId &&
      evidence.viewportName === viewportName &&
      evidence.viewport.width === expectedViewport.width &&
      evidence.viewport.height === expectedViewport.height &&
      evidence.url === packet.preview.url &&
      typeof evidence.browser.name === "string" &&
      evidence.browser.name.trim() &&
      typeof evidence.browser.version === "string" &&
      evidence.browser.version.trim() &&
      evidence.screenshots.collapsed.path ===
        expectedViewport.evidence.collapsedScreenshot &&
      /^[a-f0-9]{64}$/.test(evidence.screenshots.collapsed.sha256) &&
      evidence.screenshots.open.path ===
        expectedViewport.evidence.openScreenshot &&
      /^[a-f0-9]{64}$/.test(evidence.screenshots.open.sha256) &&
      Object.values(evidence.checks).every((value) => value === true) &&
      canonicalJson(Object.keys(evidence.checks)) ===
        canonicalJson(packet.requiredBooleanChecks) &&
      packet.zeroCountChecks.every((key) => evidence.runtime[key] === 0) &&
      evidence.metrics.documentScrollWidth <= evidence.viewport.width &&
      evidence.metrics.openDocumentScrollWidth <= evidence.viewport.width &&
      evidence.metrics.maximumElementRight <= evidence.viewport.width &&
      evidence.metrics.openMaximumElementRight <= evidence.viewport.width &&
      evidence.mutations.candidateChanged === false &&
      evidence.mutations.productionDataChanged === false &&
      evidence.mutations.applicationCodeChanged === false &&
      evidence.mutations.stylesheetChanged === false,
    `${packet.debateNumber}: invalid ${viewportName} rendering evidence`
  );
  return evidence;
}
