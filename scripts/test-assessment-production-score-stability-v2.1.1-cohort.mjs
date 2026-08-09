#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";

const ROOT =
  "docs/assessment-production/score-stability-v2.1.1-validation-cohort";
const selection = JSON.parse(await readFile(`${ROOT}/selection.json`));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  selection.status,
  "fresh-disjoint-v2.1.1-ten-debate-cohort-source-gate-passed"
);
assert.equal(selection.developmentValidationOnly, true);
assert.equal(selection.productionCanary, false);
assert.equal(selection.stagingOnly, true);
assert.equal(selection.policy.everyIntegerRoundedTieAccepted, true);
assert.equal(selection.policy.promoted, false);
assert.equal(selection.successorProtocol.minimumRequestedLexicalTokens, 12);
assert.equal(selection.successorProtocol.modelAuthoredEndEvent, false);
assert.equal(selection.successorProtocol.predecessorOwnershipRuleExplicit, true);
assert.equal(
  selection.successorProtocol.retiredArtifactsReusableForAcceptance,
  false
);
assert.equal(
  selection.successorProtocol.retiredArtifactsReusableAsFreshModelInput,
  false
);
assert.equal(selection.selectionPolicy.cohortSize, 10);
assert.equal(selection.selectionPolicy.dyadicOnly, true);
assert.equal(selection.selectionPolicy.productionCanaryExcluded, true);
assert.equal(selection.selectionPolicy.failedV2ValidationCohortExcluded, true);
assert.equal(selection.selectionPolicy.failedV21ValidationCohortExcluded, true);
assert.equal(selection.selectionPolicy.replacementAfterSourceGateFailureAllowed, false);
assert.equal(selection.selectionPolicy.transcriptContentSemanticallyInspected, false);
assert.equal(selection.selectionPolicy.scoreAccessed, false);
assert.equal(selection.selectionPolicy.winnerAccessed, false);
assert.equal(selection.modelBoundary.label, "5.6 Sol");
assert.equal(selection.modelBoundary.reasoningEffort, "low");
assert.equal(selection.modelBoundary.authentication, "ChatGPT subscription");
assert.equal(selection.modelBoundary.scoreBlind, true);
assert.equal(selection.modelBoundary.modelContextsExecuted, 0);
assert.equal(selection.modelBoundary.retries, 0);
assert.equal(selection.modelBoundary.timeoutExtensions, 0);

assert.equal(selection.selected.length, 10);
assert.equal(
  new Set(selection.selected.map((item) => item.debateNumber)).size,
  10
);
const observed = new Set(selection.selectionPolicy.observedDebateNumbers);
assert(
  selection.selected.every(
    (item) =>
      item.speakerCount === 2 &&
      !observed.has(item.debateNumber) &&
      item.sourceGate.transcriptPresentAndHashMatched &&
      item.sourceGate.eventsPresentAndHashMatched &&
      item.sourceGate.localManifestPresentAndHashMatched &&
      item.sourceGate.canonicalEventProjectionNonempty
  )
);
for (const item of selection.selected) {
  const [transcriptBytes, eventsBytes, manifestBytes] = await Promise.all([
    readFile(item.sourceChain.transcript),
    readFile(item.sourceChain.events),
    readFile(item.sourceChain.manifest),
  ]);
  assert.equal(sha256(transcriptBytes), item.sourceChain.transcriptSha256);
  assert.equal(sha256(eventsBytes), item.sourceChain.eventsSha256);
  assert.equal(sha256(manifestBytes), item.sourceChain.manifestSha256);
  assert.equal(normalizeV418Events(JSON.parse(eventsBytes)).length, item.eventCount);
}
for (const [file, digest] of Object.entries(selection.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drift`);
}
assert.equal(selection.totals.debates, 10);
assert.equal(selection.totals.sourceGateFailures, 0);
assert.equal(selection.totals.modelContexts, 0);
assert.equal(selection.totals.paidTranscriptionCalls, 0);
assert.equal(selection.totals.meteredApiCostUsd, 0);
assert.equal(selection.totals.scoresDerived, 0);
assert.equal(selection.authorization.freshSourcePreparation, true);
for (const [key, value] of Object.entries(selection.authorization)) {
  if (key !== "freshSourcePreparation") {
    assert.equal(value, false, `${key}: must remain unauthorized`);
  }
}
assert.equal(
  selection.nextAuthorizedAction,
  "prepare-v2.1.1-source-packets-token-ledgers-and-schemas-model-free-only"
);

console.log(JSON.stringify({
  status: "passed",
  selectedDebates: selection.selected.map((item) => item.debateNumber),
  eventCount: selection.totals.eventCount,
  durationHours: selection.totals.durationHours,
  sourceGateFailures: 0,
  modelContexts: 0,
  scoresDerived: 0,
  nextAuthorizedAction: selection.nextAuthorizedAction,
}, null, 2));
