#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_14_RENDERING_ORDER,
  POST_CANARY_BATCH_14_RENDERING_ROOT,
  hashFile,
  sha256,
  validatePostCanaryBatch14RenderingEvidence,
  validatePostCanaryBatch14RenderingPacket
} from "./lib/assessment-production-post-canary-batch-14-rendering-verification.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const index = process.argv.indexOf("--completed-at");
const completedAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(completedAt && !Number.isNaN(Date.parse(completedAt)),
  "--completed-at requires ISO");
const ROOT = POST_CANARY_BATCH_14_RENDERING_ROOT;
const preparationPath = `${ROOT}/preparation-manifest.json`;
const activationPath = `${ROOT}/execution-activation.json`;
const [preparationBytes, activationBytes] = await Promise.all([
  readFile(path.resolve(preparationPath)), readFile(path.resolve(activationPath))
]);
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);
assertV4(activation.status ===
  "frozen-post-canary-batch-14-rendering-verification-authorized" &&
  activation.preparation.sha256 === sha256(preparationBytes) &&
  activation.executionNavigation.token ===
    sha256(canonicalJson(activation.executionNavigation.input)),
"Batch 14 rendering activation changed");

const results = [];
for (const debateNumber of POST_CANARY_BATCH_14_RENDERING_ORDER) {
  const packetRow = preparation.packets.find((row) => row.debateNumber === debateNumber);
  const packetBytes = await readFile(path.resolve(packetRow.path));
  assertV4(sha256(packetBytes) === packetRow.sha256, `${debateNumber}: packet changed`);
  const packet = validatePostCanaryBatch14RenderingPacket(JSON.parse(packetBytes));
  for (const viewportName of ["desktop", "mobile"]) {
    const evidencePath = packet.viewports[viewportName].evidence.result;
    const evidence = JSON.parse(await readFile(path.resolve(evidencePath), "utf8"));
    validatePostCanaryBatch14RenderingEvidence({ packet, viewportName,
      token: activation.executionNavigation.token, evidence });
    for (const screenshot of Object.values(evidence.screenshots)) {
      assertV4(await hashFile(screenshot.path) === screenshot.sha256,
        `${debateNumber}/${viewportName}: screenshot changed`);
    }
    results.push({ evidencePath, evidence });
  }
}
assertV4(results.length === 20 && results.every(({ evidence }) =>
  evidence.status === "passed-rendering-viewport" &&
  Object.values(evidence.checks).every(Boolean) &&
  evidence.runtime.consoleErrors.length === 0 &&
  evidence.runtime.pageErrors.length === 0 &&
  evidence.runtime.failedRequests.length === 0),
"complete passing Batch 14 rendering evidence required");

const totals = {
  debates: 10,
  sections: 52,
  moves: 190,
  viewportResults: 20,
  screenshots: 40,
  requiredBooleanChecks: 440,
  pointerInteractionTests: 20,
  keyboardEnterTests: 20,
  keyboardSpaceTests: 20,
  runtimeFailures: 0,
  horizontalOverflowFailures: 0,
  retries: 0,
  timeoutExtensions: 0,
  modelContexts: 0,
  paidServiceCalls: 0,
  directCostUsd: 0
};
const audit = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-14-rendering-audit",
  protocolId: activation.protocolId,
  status: "passed-ten-debate-batch-14-rendering-verification",
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
  schemaVersion: "1.0-assessment-production-post-canary-batch-14-rendering-execution",
  protocolId: activation.protocolId,
  status: "ten-debate-batch-14-rendering-verification-passed",
  completedAt,
  attempts: 20,
  retries: 0,
  timeoutExtensions: 0,
  results: results.map(({ evidence }) => ({ debateNumber: evidence.debateNumber,
    viewportName: evidence.viewportName, status: evidence.status })),
  directIncrementalCostUsd: 0,
  productionMutationPerformed: false
};
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-14-rendering-analysis",
  protocolId: activation.protocolId,
  status: execution.status,
  productionCanary: false,
  batchNumber: 14,
  decision: {
    renderingGatePassed: true,
    tenDebatesPassed: true,
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
  nextAuthorizedAction: "prepare-batch-14-production-compatibility-staging"
};
await writeFile(path.resolve(`${ROOT}/rendering-audit.json`),
  `${JSON.stringify(audit, null, 2)}\n`);
await writeFile(path.resolve(`${ROOT}/execution.json`),
  `${JSON.stringify(execution, null, 2)}\n`);
await writeFile(path.resolve(`${ROOT}/analysis.json`),
  `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, debates: 10,
  sections: 52, moves: 190, viewportResults: 20,
  screenshots: 40, retries: 0, timeoutExtensions: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));

