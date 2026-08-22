#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_RENDERING_REQUIRED_BOOLEAN_CHECKS,
  validatePostCanaryBatch05RenderingViewportEvidence
} from "./lib/assessment-production-post-canary-batch-05-rendering-verification.mjs";
import {
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ACTIVATION,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PREPARATION,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PROTOCOL_ID,
  loadPostCanaryBatch05RenderingResumption1Packets,
  sha256Batch05RenderingResumption1,
  validatePostCanaryBatch05RenderingResumption1Plan
} from "./lib/assessment-production-post-canary-batch-05-rendering-resumption-1.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const sha256 = sha256Batch05RenderingResumption1;
const [preparationBytes, activationBytes] = await Promise.all([
  readFile(path.resolve(POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PREPARATION)),
  readFile(path.resolve(POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_ACTIVATION))
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
    activation.executionNavigation.algorithm === "sha256-utf8-canonical-json" &&
    activation.executionNavigation.token ===
      sha256(canonicalJson(activation.executionNavigation.input)) &&
    /^[a-f0-9]{64}$/.test(activation.executionNavigation.token) &&
    activation.executionNavigation.priorActivationTokenReusePermitted === false &&
    activation.authorization.replacementViewportAttempt === true &&
    activation.authorization.remainingViewportAttempts === true &&
    activation.authorization.totalViewportAttemptsMaximum === 20 &&
    activation.authorization.retryAfterResumption === false &&
    activation.authorization.timeoutExtension === false &&
    activation.authorization.modelExecution === false &&
    activation.authorization.paidServices === false &&
    activation.authorization.productionMutation === false,
  "valid frozen Batch 5 rendering resumption-1 activation required"
);
validatePostCanaryBatch05RenderingResumption1Plan(activation.viewportPlan);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: activated resumption source changed`);
}
for (const [file, digest] of Object.entries(activation.inheritedSourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: inherited rendering source changed`);
}
for (const [file, digest] of Object.entries(activation.toolHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: activated rendering tool changed`);
}

const packets = await loadPostCanaryBatch05RenderingResumption1Packets(preparation);
const results = [];
for (const planRow of activation.viewportPlan) {
  const packet = packets.get(planRow.debateNumber);
  const viewport = packet.viewports[planRow.viewportName];
  const evidenceBytes = await readFile(path.resolve(viewport.evidence.result));
  const evidence = JSON.parse(evidenceBytes);
  validatePostCanaryBatch05RenderingViewportEvidence({
    packet,
    viewportName: planRow.viewportName,
    activationNavigationToken: activation.executionNavigation.token,
    evidence
  });
  for (const name of ["collapsed", "open"]) {
    const screenshot = evidence.screenshots[name];
    assertV4(
      sha256(await readFile(path.resolve(screenshot.path))) === screenshot.sha256,
      `${planRow.debateNumber}/${planRow.viewportName}: ${name} screenshot changed`
    );
  }
  results.push({ ...evidence, attemptClassification: planRow.attemptClassification });
}

assertV4(
  results.length === 20 &&
    results.every((result) => result.status === "passed-rendering-viewport") &&
    results.every(
      (result) =>
        canonicalJson(Object.keys(result.checks)) ===
          canonicalJson(POST_CANARY_BATCH_05_RENDERING_REQUIRED_BOOLEAN_CHECKS) &&
        Object.values(result.checks).every(Boolean)
    ) &&
    results.every((result) =>
      Object.values(result.runtime.counts).every((count) => count === 0)
    ) &&
    results.every((result) =>
      Object.values(result.mutations).every((changed) => changed === false)
    ) &&
    results.filter(
      (result) =>
        result.attemptClassification ===
        "authorized-replacement-of-bootstrap-only-attempt"
    ).length === 1,
  "complete passing Batch 5 rendering resumption-1 evidence required"
);

console.log(
  JSON.stringify(
    {
      schemaVersion:
        "1.0-assessment-production-post-canary-batch-05-rendering-resumption-1-evidence-audit",
      protocolId: POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PROTOCOL_ID,
      status: "ten-debate-batch-05-rendering-resumption-1-evidence-passed",
      debates: 10,
      sections: 49,
      moves: 187,
      viewportResults: 20,
      replacementViewportAttempts: 1,
      firstViewportAttempts: 19,
      screenshots: 40,
      validJpegScreenshots: 40,
      nonblankScreenshots: 40,
      dimensionMatchedScreenshots: 40,
      collapsedOpenPairsWithDifferentHashes: 20,
      requiredBooleanChecks: 760,
      rawAccordionStateObservations: 100,
      exactViewportPhaseChecks: 60,
      browserDocumentLoads: 80,
      diagnosticBootstrapLoads: 40,
      measuredCandidateLoads: 40,
      pointerInteractionTests: 20,
      keyboardEnterTests: 20,
      keyboardSpaceTests: 20,
      keyboardInitialPageNavigateCalls: 20,
      keyboardRuntimeLocationAssignCalls: 20,
      runtimeFailures: 0,
      failedRequests: 0,
      horizontalOverflowFailures: 0,
      retriesAfterResumption: 0,
      timeoutExtensions: 0,
      modelContexts: 0,
      paidServiceCalls: 0,
      directCostUsd: 0,
      productionMutationPerformed: false
    },
    null,
    2
  )
);
