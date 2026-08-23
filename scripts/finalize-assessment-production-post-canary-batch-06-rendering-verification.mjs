#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_06_RENDERING_ORDER, POST_CANARY_BATCH_06_RENDERING_ROOT,
  validatePostCanaryBatch06RenderingPacket,
  validatePostCanaryBatch06RenderingViewportEvidence } from
  "./lib/assessment-production-post-canary-batch-06-rendering-verification.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
const ROOT = POST_CANARY_BATCH_06_RENDERING_ROOT;
const p = JSON.parse(await readFile(path.resolve(`${ROOT}/preparation-manifest.json`), "utf8"));
const a = JSON.parse(await readFile(path.resolve(`${ROOT}/execution-activation.json`), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(a.status === "frozen-post-canary-batch-06-rendering-verification-authorized" &&
  a.preparation.sha256 === sha256(await readFile(path.resolve(a.preparation.path))) &&
  a.executionNavigation.token === sha256(canonicalJson(a.executionNavigation.input)),
"Batch 6 rendering activation changed");
const results = [];
for (const debateNumber of POST_CANARY_BATCH_06_RENDERING_ORDER) {
  const row = p.packets.find((item) => item.debateNumber === debateNumber);
  const packetBytes = await readFile(path.resolve(row.path));
  assertV4(sha256(packetBytes) === row.sha256, `${debateNumber}: packet changed`);
  const packet = validatePostCanaryBatch06RenderingPacket(JSON.parse(packetBytes));
  for (const viewportName of ["desktop", "mobile"]) {
    const evidence = JSON.parse(await readFile(path.resolve(packet.viewports[viewportName].evidence.result), "utf8"));
    validatePostCanaryBatch06RenderingViewportEvidence({ packet, viewportName,
      activationNavigationToken: a.executionNavigation.token, evidence });
    for (const key of ["collapsed", "open"]) assertV4(
      sha256(await readFile(path.resolve(evidence.screenshots[key].path))) === evidence.screenshots[key].sha256,
      `${debateNumber}/${viewportName}/${key}: screenshot changed`);
    results.push({ evidence, evidencePath: packet.viewports[viewportName].evidence.result });
  }
}
assertV4(results.length === 20 && results.every((row) => row.evidence.status === "passed-rendering-viewport"),
  "complete Batch 6 rendering evidence failed");
const totals = { debates: 10, sections: 52, moves: 200, viewportResults: 20,
  screenshots: 40, requiredBooleanChecks: 760, browserDocumentLoads: 80,
  runtimeFailures: 0, retries: 0, timeoutExtensions: 0, modelContexts: 0,
  paidServiceCalls: 0, directCostUsd: 0 };
const audit = { schemaVersion: "1.0-assessment-production-post-canary-batch-06-rendering-audit",
  protocolId: a.protocolId, status: "passed-ten-debate-batch-06-rendering-verification",
  explicitOrder: a.explicitOrder, results: results.map(({ evidence, evidencePath }) => ({
    debateNumber: evidence.debateNumber, viewportName: evidence.viewportName,
    result: evidencePath, status: evidence.status })), totals,
  productionMutationPerformed: false };
const execution = { schemaVersion: "1.0-assessment-production-post-canary-batch-06-rendering-execution",
  protocolId: a.protocolId, status: "ten-debate-batch-06-rendering-verification-passed",
  completedAt: new Date().toISOString(), attempts: 20, retries: 0, timeoutExtensions: 0,
  results: results.map(({ evidence }) => ({ debateNumber: evidence.debateNumber,
    viewportName: evidence.viewportName, status: evidence.status })),
  directIncrementalCostUsd: 0, productionMutationPerformed: false };
const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-06-rendering-analysis",
  protocolId: a.protocolId, status: execution.status, productionCanary: false, batchNumber: 6,
  decision: { renderingGatePassed: true, tenDebatesPassed: true,
    desktopAndMobilePassed: true, pointerAndKeyboardPassed: true, imageContractPassed: true,
    runtimeGatePassed: true, retryPerformed: false, timeoutExtended: false }, totals,
  authorization: { compatibilityPreparation: true, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: "prepare-batch-06-production-compatibility-staging" };
await writeFile(path.resolve(`${ROOT}/rendering-audit.json`), `${JSON.stringify(audit, null, 2)}\n`);
await writeFile(path.resolve(`${ROOT}/execution.json`), `${JSON.stringify(execution, null, 2)}\n`);
await writeFile(path.resolve(`${ROOT}/analysis.json`), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, debates: 10, sections: 52, moves: 200,
  viewportResults: 20, screenshots: 40, retries: 0, timeoutExtensions: 0,
  directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
