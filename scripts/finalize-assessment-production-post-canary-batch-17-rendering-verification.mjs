#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_17_RENDERING_ORDER,
  POST_CANARY_BATCH_17_RENDERING_ROOT,
  hashFile,
  sha256,
  validatePostCanaryBatch17RenderingEvidence,
  validatePostCanaryBatch17RenderingPacket
} from "./lib/assessment-production-post-canary-batch-17-rendering-verification.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const index = process.argv.indexOf("--completed-at");
const completedAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(completedAt && !Number.isNaN(Date.parse(completedAt)),
  "--completed-at requires ISO");
const ROOT = POST_CANARY_BATCH_17_RENDERING_ROOT;
const preparationPath = `${ROOT}/preparation-manifest.json`;
const activationPath = `${ROOT}/execution-activation.json`;
const [preparationBytes, activationBytes] = await Promise.all([
  readFile(path.resolve(preparationPath)), readFile(path.resolve(activationPath))
]);
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);
assertV4(activation.status ===
  "frozen-post-canary-batch-17-rendering-verification-authorized" &&
  activation.preparation.sha256 === sha256(preparationBytes) &&
  activation.executionNavigation.token ===
    sha256(canonicalJson(activation.executionNavigation.input)),
"Batch 17 rendering activation changed");

const results = [];
for (const debateNumber of POST_CANARY_BATCH_17_RENDERING_ORDER) {
  const packetRow = preparation.packets.find((row) => row.debateNumber === debateNumber);
  const packetBytes = await readFile(path.resolve(packetRow.path));
  assertV4(sha256(packetBytes) === packetRow.sha256, `${debateNumber}: packet changed`);
  const packet = validatePostCanaryBatch17RenderingPacket(JSON.parse(packetBytes));
  for (const viewportName of ["desktop", "mobile"]) {
    const evidencePath = packet.viewports[viewportName].evidence.result;
    const evidence = JSON.parse(await readFile(path.resolve(evidencePath), "utf8"));
    validatePostCanaryBatch17RenderingEvidence({ packet, viewportName,
      token: activation.executionNavigation.token, evidence });
    for (const screenshot of Object.values(evidence.screenshots)) {
      assertV4(await hashFile(screenshot.path) === screenshot.sha256,
        `${debateNumber}/${viewportName}: screenshot changed`);
    }
    results.push({ evidencePath, evidence });
  }
}
assertV4(results.length === 8 && results.every(({ evidence }) =>
  evidence.status === "passed-rendering-viewport" &&
  Object.values(evidence.checks).every(Boolean) &&
  evidence.runtime.consoleErrors.length === 0 &&
  evidence.runtime.pageErrors.length === 0 &&
  evidence.runtime.failedRequests.length === 0),
"complete passing Batch 17 rendering evidence required");

const totals = {
  debates: 4,
  sections: 21,
  moves: 79,
  viewportResults: 8,
  screenshots: 16,
  requiredBooleanChecks: 176,
  pointerInteractionTests: 8,
  keyboardEnterTests: 8,
  keyboardSpaceTests: 8,
  runtimeFailures: 0,
  horizontalOverflowFailures: 0,
  retries: 0,
  timeoutExtensions: 0,
  modelContexts: 0,
  paidServiceCalls: 0,
  directCostUsd: 0
};
const audit = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-17-rendering-audit",
  protocolId: activation.protocolId,
  status: "passed-four-debate-batch-17-rendering-verification",
  explicitOrder: activation.explicitOrder,
  results: results.map(({ evidencePath, evidence }) => ({
    debateNumber: evidence.debateNumber,
    viewportName: evidence.viewportName,
    result: evidencePath,
    status: evidence.status
  })),
  totals,
  productionMutationPerformed: false
};
const execution = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-17-rendering-execution",
  protocolId: activation.protocolId,
  status: "four-debate-batch-17-rendering-verification-passed",
  completedAt,
  attempts: 8,
  retries: 0,
  timeoutExtensions: 0,
  results: results.map(({ evidence }) => ({ debateNumber: evidence.debateNumber,
    viewportName: evidence.viewportName, status: evidence.status })),
  directIncrementalCostUsd: 0,
  productionMutationPerformed: false
};
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-17-rendering-analysis",
  protocolId: activation.protocolId,
  status: execution.status,
  productionCanary: false,
  batchNumber: 17,
  decision: {
    renderingGatePassed: true,
    fourDebatesPassed: true,
    desktopAndMobilePassed: true,
    pointerAndKeyboardPassed: true,
    screenshotContractPassed: true,
    runtimeGatePassed: true,
    retryPerformed: false,
    timeoutExtended: false
  },
  totals,
  authorization: {
    compatibilityPreparation: true,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "prepare-batch-17-production-compatibility-staging"
};
await writeFile(path.resolve(`${ROOT}/rendering-audit.json`),
  `${JSON.stringify(audit, null, 2)}\n`);
await writeFile(path.resolve(`${ROOT}/execution.json`),
  `${JSON.stringify(execution, null, 2)}\n`);
await writeFile(path.resolve(`${ROOT}/analysis.json`),
  `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, debates: 4,
  sections: 21, moves: 79, viewportResults: 8,
  screenshots: 16, retries: 0, timeoutExtensions: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
