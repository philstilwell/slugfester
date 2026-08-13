#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_RENDERING_REMEDY_V9_ORDER,
  CHECKPOINT_V22_RENDERING_REMEDY_V9_PROTOCOL_ID,
  CHECKPOINT_V22_RENDERING_REMEDY_V9_ROOT,
  validateCheckpointV22RenderingRemedyV9Packet,
  validateCheckpointV22RenderingRemedyV9ViewportEvidence
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification-remedy-v9.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const preparationPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V9_ROOT}/preparation-manifest.json`;
const activationPath = `${CHECKPOINT_V22_RENDERING_REMEDY_V9_ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparationBytes = await readFile(path.resolve(preparationPath));
const activationBytes = await readFile(path.resolve(activationPath));
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);

assertV4(
  preparation.protocolId === CHECKPOINT_V22_RENDERING_REMEDY_V9_PROTOCOL_ID &&
    activation.protocolId === CHECKPOINT_V22_RENDERING_REMEDY_V9_PROTOCOL_ID &&
    activation.status ===
      "ninth-replacement-rendering-verification-execution-authorized-and-frozen" &&
    activation.preparation.sha256 === sha256(preparationBytes) &&
    activation.executionNavigation.algorithm === "sha256-utf8-canonical-json" &&
    activation.executionNavigation.token ===
      sha256(canonicalJson(activation.executionNavigation.input)) &&
    /^[a-f0-9]{64}$/.test(activation.executionNavigation.token) &&
    activation.executionNavigation.keyboardMeasuredDeadlineMilliseconds === 15000 &&
    activation.executionNavigation.adaptiveRegenerationPermitted === false &&
    canonicalJson(activation.packetHashes) === canonicalJson(
      Object.fromEntries(preparation.packets.map((row) => [row.path, row.sha256]))
    ),
  "valid remedy-v9 activation required"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `activated source hash mismatch: ${file}`
  );
}

const results = [];
for (const debateNumber of CHECKPOINT_V22_RENDERING_REMEDY_V9_ORDER) {
  const row = preparation.packets.find(
    (candidate) => candidate.debateNumber === debateNumber
  );
  const packetBytes = await readFile(path.resolve(row.path));
  assertV4(sha256(packetBytes) === row.sha256, `${debateNumber}: packet changed`);
  const packet = validateCheckpointV22RenderingRemedyV9Packet(JSON.parse(packetBytes));
  for (const viewportName of ["desktop", "mobile"]) {
    const viewport = packet.viewports[viewportName];
    const evidence = JSON.parse(
      await readFile(path.resolve(viewport.evidence.result), "utf8")
    );
    validateCheckpointV22RenderingRemedyV9ViewportEvidence({
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
    results.every((result) =>
      result.browser.keyboardNavigation.initialPageNavigateCalls === 1 &&
      result.browser.keyboardNavigation.runtimeLocationAssignCalls === 1 &&
      result.browser.keyboardNavigation.tabsClosed === 1
    ),
  "complete passing remedy-v9 evidence required"
);

console.log(JSON.stringify({
  schemaVersion:
    "1.0-production-checkpoint-v2.2-rendering-remedy-v9-evidence-audit",
  protocolId: CHECKPOINT_V22_RENDERING_REMEDY_V9_PROTOCOL_ID,
  status: "ten-debate-remedy-v9-rendering-evidence-passed",
  debates: 10,
  viewportResults: results.length,
  screenshots: results.length * 2,
  validJpegScreenshots: results.length * 2,
  nonblankScreenshots: results.length * 2,
  dimensionMatchedScreenshots: results.length * 2,
  collapsedOpenPairsWithDifferentHashes: results.length,
  requiredBooleanChecks: results.length * 38,
  rawAccordionStateObservations: results.length * 5,
  exactViewportPhaseChecks: results.length * 3,
  keyboardInitialPageNavigateCalls: results.length,
  keyboardRuntimeLocationAssignCalls: results.length,
  browserSurfaces: 2,
  runtimeFailures: 0,
  failedRequests: 0,
  modelContexts: 0,
  directCostUsd: 0,
  productionMutationPerformed: false
}, null, 2));
