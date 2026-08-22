#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_RENDERING_ORDER,
  POST_CANARY_BATCH_05_RENDERING_PROTOCOL_ID,
  POST_CANARY_BATCH_05_RENDERING_ROOT
} from "./lib/assessment-production-post-canary-batch-05-rendering-verification.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const completedAtIndex = process.argv.indexOf("--completed-at");
const completedAt =
  completedAtIndex >= 0
    ? process.argv[completedAtIndex + 1]
    : new Date().toISOString();
assertV4(!Number.isNaN(Date.parse(completedAt)), "--completed-at must be ISO time");

const PREPARATION = `${POST_CANARY_BATCH_05_RENDERING_ROOT}/preparation-manifest.json`;
const ACTIVATION = `${POST_CANARY_BATCH_05_RENDERING_ROOT}/execution-activation.json`;
const EXECUTION = `${POST_CANARY_BATCH_05_RENDERING_ROOT}/execution.json`;
const ANALYSIS = `${POST_CANARY_BATCH_05_RENDERING_ROOT}/analysis.json`;
const RENDERING_AUDIT = `${POST_CANARY_BATCH_05_RENDERING_ROOT}/rendering-audit.json`;
const VALIDATOR =
  "scripts/validate-assessment-production-post-canary-batch-05-rendering-evidence.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(
    () => true,
    () => false
  );
const [preparationBytes, activationBytes] = await Promise.all([
  readFile(path.resolve(PREPARATION)),
  readFile(path.resolve(ACTIVATION))
]);
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);

assertV4(
  preparation.protocolId === POST_CANARY_BATCH_05_RENDERING_PROTOCOL_ID &&
    activation.protocolId === POST_CANARY_BATCH_05_RENDERING_PROTOCOL_ID &&
    activation.status ===
      "frozen-post-canary-batch-05-rendering-verification-authorized" &&
    activation.preparation.sha256 === sha256(preparationBytes) &&
    activation.authorization.renderingVerification === true &&
    activation.authorization.oneAttemptPerViewport === true &&
    activation.authorization.retry === false &&
    activation.authorization.timeoutExtension === false &&
    activation.authorization.modelExecution === false &&
    activation.authorization.paidServices === false &&
    activation.authorization.productionMutation === false,
  "valid frozen Batch 5 rendering activation required"
);
if (shouldWrite) {
  for (const output of [EXECUTION, ANALYSIS, RENDERING_AUDIT]) {
    assertV4(!(await exists(output)), `${output} already exists; finalization is one-pass`);
  }
}

const audit = JSON.parse(
  execFileSync(process.execPath, [VALIDATOR], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  })
);
assertV4(
  audit.status === "ten-debate-batch-05-rendering-evidence-passed" &&
    audit.debates === 10 &&
    audit.sections === 49 &&
    audit.moves === 187 &&
    audit.viewportResults === 20 &&
    audit.screenshots === 40 &&
    audit.requiredBooleanChecks === 760 &&
    audit.rawAccordionStateObservations === 100 &&
    audit.exactViewportPhaseChecks === 60 &&
    audit.browserDocumentLoads === 80 &&
    audit.runtimeFailures === 0 &&
    audit.failedRequests === 0 &&
    audit.horizontalOverflowFailures === 0 &&
    audit.retries === 0 &&
    audit.timeoutExtensions === 0 &&
    audit.modelContexts === 0 &&
    audit.paidServiceCalls === 0 &&
    audit.directCostUsd === 0 &&
    audit.productionMutationPerformed === false,
  "passing Batch 5 rendering evidence audit required"
);

const rows = [];
for (const debateNumber of POST_CANARY_BATCH_05_RENDERING_ORDER) {
  const packetRow = preparation.packets.find(
    (candidate) => candidate.debateNumber === debateNumber
  );
  assertV4(packetRow, `${debateNumber}: rendering packet row missing`);
  const packet = JSON.parse(await readFile(path.resolve(packetRow.path), "utf8"));
  const viewports = [];
  for (const viewportName of ["desktop", "mobile"]) {
    const evidencePath = packet.viewports[viewportName].evidence.result;
    const evidenceBytes = await readFile(path.resolve(evidencePath));
    const evidence = JSON.parse(evidenceBytes);
    viewports.push({
      name: viewportName,
      evidence: evidencePath,
      evidenceSha256: sha256(evidenceBytes),
      collapsedScreenshot: evidence.screenshots.collapsed.path,
      collapsedScreenshotSha256: evidence.screenshots.collapsed.sha256,
      openScreenshot: evidence.screenshots.open.path,
      openScreenshotSha256: evidence.screenshots.open.sha256,
      requiredBooleanChecksPassed: Object.values(evidence.checks).filter(Boolean).length,
      runtimeCounts: evidence.runtime.counts,
      horizontalOverflowPass: evidence.checks.horizontalOverflowAbsent
    });
  }
  rows.push({
    debateNumber,
    debateId: packet.debateId,
    packet: packetRow.path,
    packetSha256: packetRow.sha256,
    candidate: packet.candidate.path,
    candidateSha256: packet.candidate.sha256,
    sections: packet.candidate.sections,
    moves: packet.candidate.moves,
    viewports
  });
}

const renderingAudit = {
  ...audit,
  status: "passed-ten-debate-batch-05-rendering-verification",
  completedAt,
  explicitOrder: [...POST_CANARY_BATCH_05_RENDERING_ORDER],
  rows,
  totals: {
    debates: audit.debates,
    sections: audit.sections,
    moves: audit.moves,
    browserDocumentLoads: audit.browserDocumentLoads,
    diagnosticBootstrapLoads: audit.diagnosticBootstrapLoads,
    measuredCandidateLoads: audit.measuredCandidateLoads,
    viewportResults: audit.viewportResults,
    screenshots: audit.screenshots,
    validJpegScreenshots: audit.validJpegScreenshots,
    nonblankScreenshots: audit.nonblankScreenshots,
    dimensionMatchedScreenshots: audit.dimensionMatchedScreenshots,
    collapsedOpenPairsWithDifferentHashes:
      audit.collapsedOpenPairsWithDifferentHashes,
    requiredBooleanChecks: audit.requiredBooleanChecks,
    rawAccordionStateObservations: audit.rawAccordionStateObservations,
    exactViewportPhaseChecks: audit.exactViewportPhaseChecks,
    pointerInteractionTests: audit.pointerInteractionTests,
    keyboardEnterTests: audit.keyboardEnterTests,
    keyboardSpaceTests: audit.keyboardSpaceTests,
    keyboardInitialPageNavigateCalls: audit.keyboardInitialPageNavigateCalls,
    keyboardRuntimeLocationAssignCalls: audit.keyboardRuntimeLocationAssignCalls,
    consoleErrors: 0,
    consoleWarnings: 0,
    pageErrors: 0,
    failedRequests: audit.failedRequests,
    horizontalOverflowFailures: audit.horizontalOverflowFailures,
    displayFieldsChanged: 0,
    participantScoresChanged: false,
    modelContexts: audit.modelContexts,
    paidServiceCalls: audit.paidServiceCalls,
    retries: audit.retries,
    timeoutExtensions: audit.timeoutExtensions,
    directCostUsd: audit.directCostUsd
  },
  productionMutationPerformed: false,
  nextBatchSelectionPerformed: false
};
const renderingAuditBytes = Buffer.from(
  `${JSON.stringify(renderingAudit, null, 2)}\n`
);
const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-rendering-verification-execution",
  protocolId: POST_CANARY_BATCH_05_RENDERING_PROTOCOL_ID,
  status: "ten-debate-batch-05-rendering-verification-passed",
  completedAt,
  preparation: { path: PREPARATION, sha256: sha256(preparationBytes) },
  activation: { path: ACTIVATION, sha256: sha256(activationBytes) },
  renderingAudit: { path: RENDERING_AUDIT, sha256: sha256(renderingAuditBytes) },
  explicitOrder: [...POST_CANARY_BATCH_05_RENDERING_ORDER],
  browserEvidence: renderingAudit.totals,
  executionDiscipline: {
    viewportAttempts: 20,
    viewportRetries: 0,
    candidateNavigationRetries: 0,
    timeoutExtensions: 0,
    alternativeNavigationMethods: 0,
    partialPassPromotion: false,
    priorEvidenceReuse: false,
    modelContexts: 0,
    paidServiceCalls: 0,
    directCostUsd: 0
  },
  authorization: {
    retry: false,
    timeoutExtension: false,
    alternativeNavigationMethod: false,
    renderingRepair: false,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  productionMutationPerformed: false
};
const executionBytes = Buffer.from(`${JSON.stringify(execution, null, 2)}\n`);
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-rendering-verification-analysis",
  protocolId: POST_CANARY_BATCH_05_RENDERING_PROTOCOL_ID,
  status: "ten-debate-batch-05-rendering-verification-passed",
  analyzedAt: completedAt,
  execution: { path: EXECUTION, sha256: sha256(executionBytes) },
  renderingAudit: { path: RENDERING_AUDIT, sha256: sha256(renderingAuditBytes) },
  decision: {
    failedClosed: false,
    renderingGatePassed: true,
    tenDebatesPassed: true,
    desktopAndMobilePassed: true,
    pointerAndKeyboardPassed: true,
    imageContractPassed: true,
    runtimeGatePassed: true,
    sourceMutationDetected: false,
    retryPerformed: false,
    timeoutExtended: false,
    renderingRepairPerformed: false,
    validatorMigrationPerformed: false,
    productionMutationRemainsBlocked: true
  },
  compatibilityBoundary: preparation.compatibilityBoundary,
  authorization: {
    compatibilityRemedyPlanPreparation: true,
    compatibilityRemedyExecution: false,
    renderingRepair: false,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    "prepare-batch-05-production-compatibility-under-standing-authorization"
};

if (shouldWrite) {
  const writes = [
    [RENDERING_AUDIT, renderingAuditBytes],
    [EXECUTION, executionBytes],
    [ANALYSIS, Buffer.from(`${JSON.stringify(analysis, null, 2)}\n`)]
  ];
  for (const [file, bytes] of writes) {
    const temporary = `${path.resolve(file)}.tmp`;
    await writeFile(temporary, bytes);
    await rename(temporary, path.resolve(file));
  }
}

console.log(
  JSON.stringify(
    {
      status: analysis.status,
      completedAt,
      debates: audit.debates,
      viewportResults: audit.viewportResults,
      screenshots: audit.screenshots,
      requiredBooleanChecks: audit.requiredBooleanChecks,
      retries: 0,
      timeoutExtensions: 0,
      modelContexts: 0,
      paidServiceCalls: 0,
      directCostUsd: 0,
      productionMutationPerformed: false,
      nextAuthorizedAction: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
