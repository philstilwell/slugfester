#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_RENDERING_VERIFICATION_ORDER,
  CHECKPOINT_V22_RENDERING_VERIFICATION_PROTOCOL_ID,
  CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT,
  validateCheckpointV22RenderingVerificationPacket,
  validateCheckpointV22RenderingViewportEvidence
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readBytes = (file) => readFile(path.resolve(file));
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const activationPath =
  `${CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT}/execution-activation.json`;
const [activation, execution, analysis, audit] = await Promise.all([
  parse(activationPath),
  parse(`${CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT}/execution.json`),
  parse(`${CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT}/analysis.json`),
  parse(`${CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT}/rendering-audit.json`)
]);

assert.equal(
  activation.status,
  "rendering-verification-execution-authorized-and-frozen"
);
assert.equal(activation.authorization.browserControl, true);
assert.equal(activation.authorization.screenshotCapture, true);
assert.equal(activation.authorization.renderingVerification, true);
assert.equal(activation.authorization.renderingRepair, false);
assert.equal(activation.authorization.retry, false);
assert.equal(activation.authorization.modelExecution, false);
assert.equal(activation.authorization.productionMutation, false);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assert.equal(sha256(await readBytes(file)), digest, `source hash mismatch: ${file}`);
}

assert.equal(execution.status, "ten-debate-rendering-verification-passed");
assert.equal(execution.failureMessage, null);
assert.equal(execution.pageLoads, 20);
assert.equal(execution.viewportResults, 20);
assert.equal(execution.screenshots, 40);
assert.equal(execution.modelContexts, 0);
assert.equal(execution.retries, 0);
assert.equal(execution.directCostUsd, 0);
assert.equal(execution.renderingRepairPerformed, false);
assert.equal(execution.productionMutationPerformed, false);
assert.equal(analysis.status, "ten-debate-rendering-verification-passed");
assert.equal(analysis.gate.debatesPassed, 10);
assert.equal(analysis.gate.viewportResultsPassed, 20);
assert.equal(analysis.gate.screenshotsPassed, 40);
assert.equal(analysis.gate.runtimeFailures, 0);
assert.equal(analysis.gate.horizontalOverflowFailures, 0);
assert.equal(analysis.authorization.compatibilityRemedyPlanPreparation, true);
assert.equal(analysis.authorization.productionMutation, false);
assert.equal(
  analysis.nextAuthorizedAction,
  "user-decision-on-compatibility-remedy-plan-preparation"
);

assert.equal(
  audit.schemaVersion,
  "1.0-production-checkpoint-v2.2-rendering-verification-audit"
);
assert.equal(audit.protocolId, CHECKPOINT_V22_RENDERING_VERIFICATION_PROTOCOL_ID);
assert.equal(audit.status, "passed-ten-debate-rendering-verification");
assert.deepEqual(audit.explicitOrder, CHECKPOINT_V22_RENDERING_VERIFICATION_ORDER);
assert.equal(audit.rows.length, 10);
assert.equal(audit.productionCanary, true);
assert.equal(audit.stagingOnly, true);
assert.equal(audit.renderingRepairPerformed, false);
assert.equal(audit.productionMutationPerformed, false);

let viewportResults = 0;
let screenshots = 0;
for (const debateNumber of CHECKPOINT_V22_RENDERING_VERIFICATION_ORDER) {
  const packetRow = activation.packets.find(
    (item) => item.debateNumber === debateNumber
  );
  const auditRow = audit.rows.find((item) => item.debateNumber === debateNumber);
  assert.ok(packetRow && auditRow, `${debateNumber}: rendering row missing`);
  const packetBytes = await readBytes(packetRow.path);
  assert.equal(sha256(packetBytes), packetRow.sha256);
  const packet = JSON.parse(packetBytes);
  validateCheckpointV22RenderingVerificationPacket(packet);
  assert.equal(auditRow.debateId, packet.debateId);

  for (const viewportName of ["desktop", "mobile"]) {
    const expectedPaths = packet.viewports[viewportName].evidence;
    const row = auditRow.viewports[viewportName];
    assert.equal(row.evidence, expectedPaths.result);
    const evidenceBytes = await readBytes(row.evidence);
    assert.equal(sha256(evidenceBytes), row.evidenceSha256);
    const evidence = JSON.parse(evidenceBytes);
    validateCheckpointV22RenderingViewportEvidence({
      packet,
      viewportName,
      evidence
    });
    for (const state of ["collapsed", "open"]) {
      const screenshot = evidence.screenshots[state];
      assert.equal(sha256(await readBytes(screenshot.path)), screenshot.sha256);
      assert.equal(row.screenshots[state].path, screenshot.path);
      assert.equal(row.screenshots[state].sha256, screenshot.sha256);
      screenshots += 1;
    }
    viewportResults += 1;
  }
}

assert.equal(viewportResults, 20);
assert.equal(screenshots, 40);
assert.deepEqual(audit.totals, {
  debates: 10,
  sections: 51,
  moves: 188,
  pageLoads: 20,
  viewportResults: 20,
  screenshots: 40,
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
  modelContexts: 0,
  retries: 0,
  directCostUsd: 0
});
assert.deepEqual(audit.compatibilityBoundary.blockers, [
  "optional-overall-reference-links",
  "checkpoint-ledger-schema-adapter"
]);
assert.equal(audit.compatibilityBoundary.productionMutationBlocked, true);

console.log(JSON.stringify({
  status: "passed",
  debates: 10,
  viewportResults,
  screenshots,
  consoleErrors: 0,
  consoleWarnings: 0,
  pageErrors: 0,
  failedRequests: 0,
  horizontalOverflowFailures: 0,
  displayFieldsChanged: 0,
  participantScoresChanged: false,
  modelContexts: 0,
  directCostUsd: 0,
  renderingRepair: false,
  productionMutation: false
}, null, 2));
