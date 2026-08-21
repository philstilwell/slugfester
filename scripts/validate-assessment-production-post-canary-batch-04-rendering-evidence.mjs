#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_04_RENDERING_ORDER,
  POST_CANARY_BATCH_04_RENDERING_PROTOCOL_ID,
  POST_CANARY_BATCH_04_RENDERING_ROOT,
  validatePostCanaryBatch04RenderingPacket,
  validatePostCanaryBatch04RenderingViewportEvidence
} from "./lib/assessment-production-post-canary-batch-04-rendering-verification.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const PREPARATION = `${POST_CANARY_BATCH_04_RENDERING_ROOT}/preparation-manifest.json`;
const ACTIVATION = `${POST_CANARY_BATCH_04_RENDERING_ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparationBytes = await readFile(path.resolve(PREPARATION));
const activationBytes = await readFile(path.resolve(ACTIVATION));
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);

assertV4(
  preparation.protocolId === POST_CANARY_BATCH_04_RENDERING_PROTOCOL_ID &&
    activation.protocolId === POST_CANARY_BATCH_04_RENDERING_PROTOCOL_ID &&
    activation.status ===
      "frozen-post-canary-batch-04-rendering-verification-authorized" &&
    activation.preparation.sha256 === sha256(preparationBytes) &&
    activation.executionNavigation.algorithm === "sha256-utf8-canonical-json" &&
    activation.executionNavigation.token ===
      sha256(canonicalJson(activation.executionNavigation.input)) &&
    /^[a-f0-9]{64}$/.test(activation.executionNavigation.token) &&
    activation.executionNavigation.keyboardMeasuredDeadlineMilliseconds ===
      15000 &&
    activation.executionNavigation.adaptiveRegenerationPermitted === false &&
    activation.authorization.oneAttemptPerViewport === true &&
    activation.authorization.retry === false &&
    activation.authorization.timeoutExtension === false &&
    activation.authorization.modelExecution === false &&
    activation.authorization.paidServices === false &&
    activation.authorization.productionMutation === false &&
    canonicalJson(activation.packetHashes) ===
      canonicalJson(
        Object.fromEntries(
          preparation.packets.map((row) => [row.path, row.sha256])
        )
      ),
  "valid Batch 4 rendering activation required"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `activated source hash mismatch: ${file}`
  );
}
for (const [file, digest] of Object.entries(activation.toolHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `activated tool hash mismatch: ${file}`
  );
}

const results = [];
for (const debateNumber of POST_CANARY_BATCH_04_RENDERING_ORDER) {
  const row = preparation.packets.find(
    (candidate) => candidate.debateNumber === debateNumber
  );
  assertV4(row, `${debateNumber}: Batch 4 rendering packet row missing`);
  const packetBytes = await readFile(path.resolve(row.path));
  assertV4(sha256(packetBytes) === row.sha256, `${debateNumber}: packet changed`);
  const packet = validatePostCanaryBatch04RenderingPacket(
    JSON.parse(packetBytes)
  );
  for (const viewportName of ["desktop", "mobile"]) {
    const viewport = packet.viewports[viewportName];
    const evidence = JSON.parse(
      await readFile(path.resolve(viewport.evidence.result), "utf8")
    );
    validatePostCanaryBatch04RenderingViewportEvidence({
      packet,
      viewportName,
      activationNavigationToken: activation.executionNavigation.token,
      evidence
    });
    for (const key of ["collapsed", "open"]) {
      const screenshot = evidence.screenshots[key];
      assertV4(
        sha256(await readFile(path.resolve(screenshot.path))) === screenshot.sha256,
        `${debateNumber}/${viewportName}: ${key} screenshot hash mismatch`
      );
    }
    results.push(evidence);
  }
}
assertV4(
  results.length === 20 &&
    results.every((result) => result.status === "passed-rendering-viewport") &&
    results.every((result) => Object.values(result.checks).every(Boolean)) &&
    results.every((result) =>
      Object.values(result.runtime.counts).every((count) => count === 0)
    ) &&
    results.every((result) =>
      Object.values(result.mutations).every((changed) => changed === false)
    ) &&
    results.every(
      (result) =>
        result.browser.keyboardNavigation.initialPageNavigateCalls === 1 &&
        result.browser.keyboardNavigation.runtimeLocationAssignCalls === 1 &&
        result.browser.keyboardNavigation.tabsClosed === 1
    ),
  "complete passing Batch 4 rendering evidence required"
);

console.log(
  JSON.stringify(
    {
      schemaVersion:
        "1.0-assessment-production-post-canary-batch-04-rendering-evidence-audit",
      protocolId: POST_CANARY_BATCH_04_RENDERING_PROTOCOL_ID,
      status: "ten-debate-batch-04-rendering-evidence-passed",
      debates: 10,
      sections: 53,
      moves: 203,
      viewportResults: results.length,
      screenshots: results.length * 2,
      validJpegScreenshots: results.length * 2,
      nonblankScreenshots: results.length * 2,
      dimensionMatchedScreenshots: results.length * 2,
      collapsedOpenPairsWithDifferentHashes: results.length,
      requiredBooleanChecks: results.length * 38,
      rawAccordionStateObservations: results.length * 5,
      exactViewportPhaseChecks: results.length * 3,
      browserDocumentLoads: results.length * 4,
      diagnosticBootstrapLoads: results.length * 2,
      measuredCandidateLoads: results.length * 2,
      pointerInteractionTests: results.length,
      keyboardEnterTests: results.length,
      keyboardSpaceTests: results.length,
      keyboardInitialPageNavigateCalls: results.length,
      keyboardRuntimeLocationAssignCalls: results.length,
      browserSurfaces: 2,
      runtimeFailures: 0,
      failedRequests: 0,
      horizontalOverflowFailures: 0,
      retries: 0,
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
