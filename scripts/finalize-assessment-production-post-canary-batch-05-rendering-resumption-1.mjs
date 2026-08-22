#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ACTIVATION,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ANALYSIS,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_AUDIT,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_EXECUTION,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_FAILURE,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PREPARATION,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PROTOCOL_ID,
  loadPostCanaryBatch05RenderingResumption1Packets,
  sha256Batch05RenderingResumption1,
  validatePostCanaryBatch05RenderingResumption1Plan
} from "./lib/assessment-production-post-canary-batch-05-rendering-resumption-1.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const completedAtIndex = process.argv.indexOf("--completed-at");
const completedAt =
  completedAtIndex >= 0
    ? process.argv[completedAtIndex + 1]
    : new Date().toISOString();
assertV4(!Number.isNaN(Date.parse(completedAt)), "--completed-at must be ISO time");

const VALIDATOR =
  "scripts/validate-assessment-production-post-canary-batch-05-rendering-resumption-1-evidence.mjs";
const sha256 = sha256Batch05RenderingResumption1;
const exists = (file) =>
  access(path.resolve(file)).then(
    () => true,
    () => false
  );
const [preparationBytes, activationBytes, failureBytes] = await Promise.all([
  readFile(path.resolve(POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PREPARATION)),
  readFile(path.resolve(POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ACTIVATION)),
  readFile(path.resolve(POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_FAILURE))
]);
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);

assertV4(
  preparation.protocolId ===
      POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PROTOCOL_ID &&
    activation.protocolId ===
      POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PROTOCOL_ID &&
    activation.status === "frozen-batch-05-rendering-resumption-1-authorized" &&
    activation.preparation.sha256 === sha256(preparationBytes) &&
    preparation.failureDiagnosis.sha256 === sha256(failureBytes) &&
    activation.authorization.replacementViewportAttempt === true &&
    activation.authorization.remainingViewportAttempts === true &&
    activation.authorization.retryAfterResumption === false &&
    activation.authorization.timeoutExtension === false &&
    activation.authorization.modelExecution === false &&
    activation.authorization.paidServices === false &&
    activation.authorization.productionMutation === false,
  "valid frozen Batch 5 rendering resumption-1 activation required"
);
validatePostCanaryBatch05RenderingResumption1Plan(activation.viewportPlan);
if (shouldWrite) {
  for (const output of [
    POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_EXECUTION,
    POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ANALYSIS,
    POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_AUDIT
  ]) {
    assertV4(!(await exists(output)), `${output} already exists; finalization is one-pass`);
  }
}

const evidenceAudit = JSON.parse(
  execFileSync(process.execPath, [VALIDATOR], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  })
);
assertV4(
  evidenceAudit.status ===
      "ten-debate-batch-05-rendering-resumption-1-evidence-passed" &&
    evidenceAudit.debates === 10 &&
    evidenceAudit.sections === 49 &&
    evidenceAudit.moves === 187 &&
    evidenceAudit.viewportResults === 20 &&
    evidenceAudit.replacementViewportAttempts === 1 &&
    evidenceAudit.firstViewportAttempts === 19 &&
    evidenceAudit.screenshots === 40 &&
    evidenceAudit.requiredBooleanChecks === 760 &&
    evidenceAudit.runtimeFailures === 0 &&
    evidenceAudit.failedRequests === 0 &&
    evidenceAudit.horizontalOverflowFailures === 0 &&
    evidenceAudit.retriesAfterResumption === 0 &&
    evidenceAudit.timeoutExtensions === 0 &&
    evidenceAudit.modelContexts === 0 &&
    evidenceAudit.paidServiceCalls === 0 &&
    evidenceAudit.directCostUsd === 0 &&
    evidenceAudit.productionMutationPerformed === false,
  "passing Batch 5 rendering resumption-1 evidence required"
);

const packets = await loadPostCanaryBatch05RenderingResumption1Packets(preparation);
const rows = [];
for (const debateNumber of preparation.originalGate
  ? preparation.packets.map((row) => row.debateNumber)
  : []) {
  const packetRow = preparation.packets.find((row) => row.debateNumber === debateNumber);
  const packet = packets.get(debateNumber);
  const viewports = [];
  for (const viewportName of ["desktop", "mobile"]) {
    const planRow = activation.viewportPlan.find(
      (row) => row.debateNumber === debateNumber && row.viewportName === viewportName
    );
    const evidencePath = packet.viewports[viewportName].evidence.result;
    const evidenceBytes = await readFile(path.resolve(evidencePath));
    const evidence = JSON.parse(evidenceBytes);
    viewports.push({
      name: viewportName,
      attemptClassification: planRow.attemptClassification,
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
assertV4(rows.length === 10, "ten Batch 5 rendering audit rows required");

const renderingAudit = {
  ...evidenceAudit,
  status: "passed-ten-debate-batch-05-rendering-resumption-1",
  completedAt,
  failureDiagnosis: {
    path: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_FAILURE,
    sha256: sha256(failureBytes)
  },
  explicitViewportOrder: structuredClone(activation.viewportPlan),
  rows,
  totals: {
    debates: 10,
    sections: 49,
    moves: 187,
    viewportResults: 20,
    replacementViewportAttempts: 1,
    firstViewportAttempts: 19,
    browserDocumentLoads: 80,
    diagnosticBootstrapLoads: 40,
    measuredCandidateLoads: 40,
    screenshots: 40,
    validJpegScreenshots: 40,
    nonblankScreenshots: 40,
    dimensionMatchedScreenshots: 40,
    collapsedOpenPairsWithDifferentHashes: 20,
    requiredBooleanChecks: 760,
    rawAccordionStateObservations: 100,
    exactViewportPhaseChecks: 60,
    pointerInteractionTests: 20,
    keyboardEnterTests: 20,
    keyboardSpaceTests: 20,
    consoleErrors: 0,
    consoleWarnings: 0,
    pageErrors: 0,
    failedRequests: 0,
    horizontalOverflowFailures: 0,
    displayFieldsChanged: 0,
    participantScoresChanged: false,
    retriesAfterResumption: 0,
    timeoutExtensions: 0,
    modelContexts: 0,
    paidServiceCalls: 0,
    directCostUsd: 0
  },
  productionMutationPerformed: false,
  nextBatchSelectionPerformed: false
};
const auditBytes = Buffer.from(`${JSON.stringify(renderingAudit, null, 2)}\n`);
const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-rendering-resumption-1-execution",
  protocolId: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PROTOCOL_ID,
  status: "ten-debate-batch-05-rendering-resumption-1-passed",
  completedAt,
  preparation: {
    path: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PREPARATION,
    sha256: sha256(preparationBytes)
  },
  activation: {
    path: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ACTIVATION,
    sha256: sha256(activationBytes)
  },
  renderingAudit: {
    path: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_AUDIT,
    sha256: sha256(auditBytes)
  },
  executionDiscipline: {
    viewportAttempts: 20,
    authorizedReplacementAttempts: 1,
    firstAttempts: 19,
    retriesAfterResumption: 0,
    timeoutExtensions: 0,
    alternativeTransports: 0,
    priorEvidenceReuse: false,
    modelContexts: 0,
    paidServiceCalls: 0,
    directCostUsd: 0
  },
  productionMutationPerformed: false
};
const executionBytes = Buffer.from(`${JSON.stringify(execution, null, 2)}\n`);
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-rendering-resumption-1-analysis",
  protocolId: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PROTOCOL_ID,
  status: "ten-debate-batch-05-rendering-resumption-1-passed",
  analyzedAt: completedAt,
  execution: {
    path: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_EXECUTION,
    sha256: sha256(executionBytes)
  },
  renderingAudit: {
    path: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_AUDIT,
    sha256: sha256(auditBytes)
  },
  decision: {
    failedClosed: false,
    bootstrapOnlyFailurePreserved: true,
    renderingGatePassed: true,
    tenDebatesPassed: true,
    desktopAndMobilePassed: true,
    pointerAndKeyboardPassed: true,
    imageContractPassed: true,
    runtimeGatePassed: true,
    authorizedReplacementAttempts: 1,
    retryAfterResumptionPerformed: false,
    timeoutExtended: false,
    sourceMutationDetected: false,
    productionMutationRemainsBlocked: true
  },
  compatibilityBoundary: structuredClone(preparation.compatibilityBoundary),
  authorization: {
    compatibilityPlanPreparation: true,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    "prepare-batch-05-production-compatibility-under-standing-authorization"
};

if (shouldWrite) {
  for (const [file, bytes] of [
    [POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_AUDIT, auditBytes],
    [POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_EXECUTION, executionBytes],
    [
      POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ANALYSIS,
      Buffer.from(`${JSON.stringify(analysis, null, 2)}\n`)
    ]
  ]) {
    await writeFile(path.resolve(file), bytes);
  }
}

console.log(
  JSON.stringify(
    {
      status: analysis.status,
      completedAt,
      debates: 10,
      viewportResults: 20,
      screenshots: 40,
      requiredBooleanChecks: 760,
      authorizedReplacementAttempts: 1,
      retriesAfterResumption: 0,
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
