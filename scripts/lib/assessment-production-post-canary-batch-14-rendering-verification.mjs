import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_14_PUBLICATION_FINALIZATION_ORDER
} from "./assessment-production-post-canary-batch-14-publication-finalization.mjs";
import {
  POST_CANARY_BATCH_14_PUBLICATION_BYLINE,
  POST_CANARY_BATCH_14_PUBLICATION_MODEL
} from "./assessment-production-post-canary-batch-14-publication.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_14_RENDERING_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-14/rendering-verification";
export const POST_CANARY_BATCH_14_RENDERING_PROTOCOL_ID =
  "assessment-production-post-canary-batch-14-rendering-verification";
export const POST_CANARY_BATCH_14_RENDERING_PORT = 4210;
export const POST_CANARY_BATCH_14_RENDERING_ORDER =
  POST_CANARY_BATCH_14_PUBLICATION_FINALIZATION_ORDER;
export const POST_CANARY_BATCH_14_RENDERING_BYLINE =
  POST_CANARY_BATCH_14_PUBLICATION_BYLINE;
export const POST_CANARY_BATCH_14_RENDERING_MODEL =
  POST_CANARY_BATCH_14_PUBLICATION_MODEL;
export const POST_CANARY_BATCH_14_RENDERING_VIEWPORTS = Object.freeze({
  desktop: Object.freeze({ width: 1440, height: 1000 }),
  mobile: Object.freeze({ width: 390, height: 844 })
});
export const POST_CANARY_BATCH_14_RENDERING_REQUIRED_CHECKS = Object.freeze([
  "exactViewport",
  "noHorizontalOverflow",
  "bylineExact",
  "stagingBannerExact",
  "overallHeadingPresent",
  "aiExtensionImmediatelyFollowsOverall",
  "aiContributionIdentified",
  "prohibitedTextAbsent",
  "visuallyDistinctAiExtension",
  "nativeDetailsElement",
  "defaultCollapsed",
  "strengthenedFinalArgumentsBothSides",
  "newArgumentsBothSides",
  "pointerOpened",
  "enterOpened",
  "spaceClosed",
  "collapsedScreenshotValid",
  "openScreenshotValid",
  "collapsedOpenScreenshotsDiffer",
  "noConsoleErrors",
  "noPageErrors",
  "noFailedRequests"
]);

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const hashFile = async (file) => sha256(await readFile(path.resolve(file)));

export function renderingEvidencePaths(debateNumber, viewportName) {
  const screenshots = `output/playwright/batch-14-rendering/debate-${debateNumber}`;
  return {
    result: `${POST_CANARY_BATCH_14_RENDERING_ROOT}/evidence/debate-${debateNumber}/${viewportName}.json`,
    collapsedScreenshot: `${screenshots}/${viewportName}-collapsed.jpg`,
    openScreenshot: `${screenshots}/${viewportName}-open.jpg`
  };
}

export function buildPostCanaryBatch14RenderingPacket({
  auditRow,
  candidate,
  provenance,
  previewPath,
  previewSha256
}) {
  assertV4(candidate.number === auditRow.debateNumber &&
    candidate.id === auditRow.debateId &&
    provenance.debateNumber === auditRow.debateNumber &&
    provenance.debateId === auditRow.debateId &&
    provenance.model.label === POST_CANARY_BATCH_14_RENDERING_MODEL.label &&
    provenance.model.reasoningEffort === POST_CANARY_BATCH_14_RENDERING_MODEL.reasoningEffort &&
    provenance.displayContract.byline === POST_CANARY_BATCH_14_RENDERING_BYLINE &&
    provenance.displayContract.defaultCollapsed === true,
  `${auditRow.debateNumber}: finalization provenance changed`);
  const packet = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-14-rendering-packet",
    protocolId: POST_CANARY_BATCH_14_RENDERING_PROTOCOL_ID,
    status: "frozen-batch-14-rendering-verification-packet",
    productionCanary: false,
    batchNumber: 14,
    stagingOnly: true,
    debateNumber: auditRow.debateNumber,
    debateId: auditRow.debateId,
    candidate: {
      path: auditRow.candidate,
      sha256: auditRow.candidateSha256,
      scores: structuredClone(candidate.score),
      sections: candidate.sections.length,
      moves: auditRow.validation.moves,
      strengthenedFinalArguments: 2,
      newArguments: {
        pro: candidate.logicalExtension.pro.newArguments.length,
        con: candidate.logicalExtension.con.newArguments.length
      }
    },
    provenance: {
      path: auditRow.provenance,
      sha256: auditRow.provenanceSha256,
      assessmentModel: provenance.model.label,
      reasoningEffort: provenance.model.reasoningEffort,
      authentication: provenance.model.authentication
    },
    preview: {
      path: previewPath,
      sha256: previewSha256,
      url: `http://127.0.0.1:${POST_CANARY_BATCH_14_RENDERING_PORT}/${previewPath}?debate=${auditRow.debateNumber}`,
      localOnly: true,
      noindex: true
    },
    expectedDisplay: {
      byline: POST_CANARY_BATCH_14_RENDERING_BYLINE,
      stagingBanner: "Publication staging preview: validated post-canary Batch 14 candidate only. This scorecard remains excluded from production data and rankings pending rendering and mutation authorization.",
      overallHeading: "Overall commentary",
      aiExtensionHeading: "AI Extension",
      disclosurePrefix: "This section is an AI-generated contribution",
      prohibitedText: ["unassailable"],
      nativeElement: "details",
      defaultCollapsed: true
    },
    viewports: Object.fromEntries(Object.entries(POST_CANARY_BATCH_14_RENDERING_VIEWPORTS)
      .map(([name, viewport]) => [name, {
        ...viewport,
        evidence: renderingEvidencePaths(auditRow.debateNumber, name)
      }])),
    requiredChecks: [...POST_CANARY_BATCH_14_RENDERING_REQUIRED_CHECKS],
    runnerPolicy: {
      controller: "playwright-cli",
      browserFamily: "Chromium",
      sessionName: "batch14-rendering",
      oneFreshPagePerViewport: true,
      attemptsPerViewport: 1,
      retriesMaximum: 0,
      timeoutExtensionsMaximum: 0,
      timeoutMsPerViewport: 15000,
      screenshotFormat: "jpeg",
      screenshotQuality: 85,
      screenshotFullPage: false,
      interactionOrder: [
        "observe-default-collapsed-state",
        "capture-collapsed-screenshot",
        "open-native-summary-with-pointer",
        "capture-open-screenshot",
        "close-with-pointer",
        "focus-native-summary",
        "open-with-enter",
        "close-with-space"
      ]
    },
    mutationBoundary: {
      candidateWritable: false,
      participantScoresWritable: false,
      displayCopyWritable: false,
      applicationCodeWritable: false,
      stylesheetWritable: false,
      productionDataWritable: false,
      rankingDataWritable: false,
      nextBatchSelectionWritable: false
    }
  };
  return validatePostCanaryBatch14RenderingPacket(packet);
}

export function validatePostCanaryBatch14RenderingPacket(packet) {
  assertV4(packet?.schemaVersion ===
    "1.0-assessment-production-post-canary-batch-14-rendering-packet" &&
    packet.protocolId === POST_CANARY_BATCH_14_RENDERING_PROTOCOL_ID &&
    packet.status === "frozen-batch-14-rendering-verification-packet" &&
    packet.batchNumber === 14 && packet.productionCanary === false &&
    packet.stagingOnly === true &&
    POST_CANARY_BATCH_14_RENDERING_ORDER.includes(packet.debateNumber) &&
    packet.preview.url.startsWith(`http://127.0.0.1:${POST_CANARY_BATCH_14_RENDERING_PORT}/`) &&
    packet.expectedDisplay.byline === POST_CANARY_BATCH_14_RENDERING_BYLINE &&
    packet.candidate.strengthenedFinalArguments === 2 &&
    packet.candidate.newArguments.pro >= 2 && packet.candidate.newArguments.con >= 2 &&
    canonicalJson(packet.requiredChecks) ===
      canonicalJson(POST_CANARY_BATCH_14_RENDERING_REQUIRED_CHECKS) &&
    packet.runnerPolicy.controller === "playwright-cli" &&
    packet.runnerPolicy.attemptsPerViewport === 1 &&
    packet.runnerPolicy.retriesMaximum === 0 &&
    packet.runnerPolicy.timeoutExtensionsMaximum === 0 &&
    Object.values(packet.mutationBoundary).every((value) => value === false),
  `${packet?.debateNumber ?? "unknown"}: invalid Batch 14 rendering packet`);
  for (const [name, viewport] of Object.entries(POST_CANARY_BATCH_14_RENDERING_VIEWPORTS)) {
    assertV4(canonicalJson({ width: packet.viewports[name].width,
      height: packet.viewports[name].height }) === canonicalJson(viewport),
    `${packet.debateNumber}: invalid ${name} viewport`);
  }
  return packet;
}

export function validatePostCanaryBatch14RenderingEvidence({ packet, viewportName, token, evidence }) {
  validatePostCanaryBatch14RenderingPacket(packet);
  const viewport = packet.viewports[viewportName];
  assertV4(evidence?.schemaVersion ===
    "1.0-assessment-production-post-canary-batch-14-rendering-evidence" &&
    evidence.protocolId === packet.protocolId &&
    evidence.status === "passed-rendering-viewport" &&
    evidence.debateNumber === packet.debateNumber &&
    evidence.debateId === packet.debateId && evidence.viewportName === viewportName &&
    evidence.navigationToken === token && evidence.url === packet.preview.url &&
    canonicalJson(evidence.viewport) === canonicalJson({ width: viewport.width, height: viewport.height }) &&
    evidence.browser.controller === "playwright-cli" &&
    /Chrome\//.test(evidence.browser.userAgent) &&
    canonicalJson(Object.keys(evidence.checks)) === canonicalJson(packet.requiredChecks) &&
    Object.values(evidence.checks).every(Boolean) &&
    evidence.runtime.consoleErrors.length === 0 &&
    evidence.runtime.pageErrors.length === 0 &&
    evidence.runtime.failedRequests.length === 0 &&
    evidence.rawStates.freshOpen === false &&
    evidence.rawStates.afterPointerOpen === true &&
    evidence.rawStates.afterEnter === true &&
    evidence.rawStates.afterSpace === false &&
    evidence.screenshots.collapsed.path === viewport.evidence.collapsedScreenshot &&
    evidence.screenshots.open.path === viewport.evidence.openScreenshot &&
    evidence.screenshots.collapsed.sha256 !== evidence.screenshots.open.sha256 &&
    evidence.screenshots.collapsed.width === viewport.width &&
    evidence.screenshots.collapsed.height === viewport.height &&
    evidence.screenshots.open.width === viewport.width &&
    evidence.screenshots.open.height === viewport.height &&
    evidence.screenshots.collapsed.byteLength >= 20000 &&
    evidence.screenshots.open.byteLength >= 20000 &&
    Object.values(evidence.mutations).every((value) => value === false),
  `${packet.debateNumber}/${viewportName}: invalid rendering evidence`);
  return evidence;
}

