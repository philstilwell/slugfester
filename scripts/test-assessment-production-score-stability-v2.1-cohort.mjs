#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const SELECTION =
  "docs/assessment-production/score-stability-v2.1-validation-cohort/selection.json";
const selection = JSON.parse(await readFile(SELECTION, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  selection.status,
  "fresh-disjoint-v2.1-ten-debate-cohort-source-gate-passed"
);
assert.equal(selection.policy.version, "v2.1");
assert.equal(selection.policy.everyIntegerRoundedTieAccepted, true);
assert.equal(selection.policy.promoted, false);
assert.equal(selection.recoveryProtocol.candidateSharded, true);
assert.equal(
  selection.recoveryProtocol.priorFailedArtifactsReusableForAcceptance,
  false
);
assert.equal(
  selection.recoveryProtocol.priorFailedArtifactsReusableAsFreshModelInput,
  false
);
assert.equal(selection.selected.length, 10);
assert.equal(new Set(selection.selected.map((item) => item.debateNumber)).size, 10);
assert(selection.selectionPolicy.eligibleCandidateCount >= 10);
assert.equal(selection.selectionPolicy.dyadicOnly, true);
assert.equal(selection.selectionPolicy.acceptedCalibrationExcluded, true);
assert.equal(selection.selectionPolicy.productionCanaryExcluded, true);
assert.equal(selection.selectionPolicy.failedV2ValidationCohortExcluded, true);
assert.equal(
  selection.selectionPolicy.failedV2ValidationDebateNumbers.length,
  10
);
assert(
  selection.selected.every(
    (item) =>
      item.speakerCount === 2 &&
      !selection.selectionPolicy.observedDebateNumbers.includes(
        item.debateNumber
      ) &&
      Object.values(item.sourceGate).every(Boolean)
  )
);
for (const number of [
  ...selection.selectionPolicy.productionCanaryDebateNumbers,
  ...selection.selectionPolicy.failedV2ValidationDebateNumbers,
]) {
  assert.equal(
    selection.selected.some((item) => item.debateNumber === number),
    false,
    `Debate ${number}: observed debate was reselected`
  );
}
for (const [file, digest] of Object.entries(selection.sourceHashes)) {
  assert.equal(
    sha256(await readFile(file)),
    digest,
    `${file}: selection source hash drifted`
  );
}
assert.equal(selection.modelBoundary.label, "5.6 Sol");
assert.equal(selection.modelBoundary.slug, "gpt-5.6-sol");
assert.equal(selection.modelBoundary.reasoningEffort, "low");
assert.equal(selection.modelBoundary.authentication, "ChatGPT subscription");
assert.equal(selection.modelBoundary.scoreBlind, true);
assert.equal(selection.modelBoundary.modelContextsExecuted, 0);
assert.equal(selection.modelBoundary.retries, 0);
assert.equal(selection.modelBoundary.timeoutExtensions, 0);
assert.equal(selection.totals.sourceGateFailures, 0);
assert.equal(selection.totals.modelContexts, 0);
assert.equal(selection.totals.paidTranscriptionCalls, 0);
assert.equal(selection.totals.meteredApiCostUsd, 0);
assert.equal(selection.totals.scoresDerived, 0);
assert.equal(selection.authorization.candidateShardedPreparation, true);
for (const key of [
  "executionManifest",
  "discoveryModelExecution",
  "inventoryModelExecution",
  "independentJudgmentPacketPreparation",
  "independentJudgmentModelExecution",
  "retry",
  "timeoutExtension",
  "semanticCorrection",
  "paidTranscription",
  "scoreDerivation",
  "policyPromotion",
  "publicationPreparation",
  "productionMutation",
  "remainingProductionBatches",
]) {
  assert.equal(selection.authorization[key], false, `${key}: must be false`);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      selectedDebates: selection.selected.map((item) => item.debateNumber),
      sourceHashesVerified: Object.keys(selection.sourceHashes).length,
      durationHours: selection.totals.durationHours,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorized: "candidate-sharded-preparation-only",
    },
    null,
    2
  )
);
