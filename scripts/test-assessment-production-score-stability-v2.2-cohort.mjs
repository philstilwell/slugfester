#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const selectionPath =
  "docs/assessment-production/score-stability-v2.2-validation-cohort/selection.json";
const manifestPath = "docs/assessment-production/manifest-v1.json";
const [selection, manifest] = await Promise.all(
  [selectionPath, manifestPath].map((file) => readFile(file, "utf8").then(JSON.parse))
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assert.equal(
  selection.status,
  "fresh-disjoint-v2.2-ten-debate-cohort-source-gate-passed"
);
for (const [file, expected] of Object.entries(selection.sourceHashes)) {
  assert.equal(
    sha256(await readFile(file)),
    expected,
    `${file}: v2.2 selection source hash mismatch`
  );
}
assert.equal(selection.selected.length, 10);
assert.equal(new Set(selection.selected.map((item) => item.debateNumber)).size, 10);
assert(selection.selected.every((item) => item.speakerCount === 2));
assert(
  selection.selected.every((item) =>
    Object.values(item.sourceGate).every(Boolean)
  )
);
const observed = new Set(selection.selectionPolicy.observedDebateNumbers);
assert(selection.selected.every((item) => !observed.has(item.debateNumber)));
const previousV213 = new Set(
  selection.selectionPolicy.priorValidationCohorts["v2.1.3"]
);
assert(selection.selected.every((item) => !previousV213.has(item.debateNumber)));

const policyHash = selection.policy.sha256;
const successorHash = selection.successorProtocol.sha256;
const expectedRank = manifest.items
  .filter(
    (item) =>
      item.speakerCount === 2 &&
      item.disposition === "pending-reassessment" &&
      item.acceptedCalibration === null &&
      !observed.has(item.debateNumber)
  )
  .map((item) => ({
    debateNumber: item.debateNumber,
    rankSha256: sha256(
      Buffer.from(
        `${policyHash}|${successorHash}|${item.debateNumber}|${item.debateId}`
      )
    ),
  }))
  .sort(
    (left, right) =>
      left.rankSha256.localeCompare(right.rankSha256) ||
      left.debateNumber.localeCompare(right.debateNumber)
  )
  .slice(0, 10);
assert.deepEqual(
  selection.selected.map(({ debateNumber, rankSha256 }) => ({
    debateNumber,
    rankSha256,
  })),
  expectedRank
);
assert.equal(selection.selectionPolicy.scoreAccessed, false);
assert.equal(selection.selectionPolicy.winnerAccessed, false);
assert.equal(selection.selectionPolicy.legacyAssessmentAccessed, false);
assert.equal(selection.modelBoundary.label, "5.6 Sol");
assert.equal(selection.modelBoundary.reasoningEffort, "low");
assert.equal(selection.modelBoundary.authentication, "ChatGPT subscription");
assert.equal(selection.modelBoundary.scoreBlind, true);
assert.equal(selection.totals.sourceGateFailures, 0);
assert.equal(selection.totals.modelContexts, 0);
assert.equal(selection.totals.paidTranscriptionCalls, 0);
assert.equal(selection.totals.scoresDerived, 0);
assert.equal(selection.authorization.freshSourcePreparation, true);
assert.equal(selection.authorization.discoveryModelExecution, false);
assert.equal(selection.authorization.paidTranscription, false);
assert.equal(selection.authorization.scoreDerivation, false);
assert.equal(selection.authorization.policyPromotion, false);
assert.equal(selection.authorization.productionMutation, false);
console.log(
  JSON.stringify(
    {
      status: "passed",
      selectedDebates: selection.selected.map((item) => item.debateNumber),
      eligibleCandidateCount: selection.selectionPolicy.eligibleCandidateCount,
      sourceGateFailures: 0,
      scoreAccessed: false,
      modelContexts: 0,
      nextAuthorizedAction: selection.nextAuthorizedAction,
    },
    null,
    2
  )
);
