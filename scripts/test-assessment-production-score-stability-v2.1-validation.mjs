#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const MANIFEST =
  "docs/assessment-production/score-stability-v2.1-validation-cohort/validation-manifest.json";
const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  manifest.status,
  "frozen-fresh-disjoint-ten-debate-score-stability-v2.1-validation"
);
assert.equal(manifest.currentCanaryDisposition.reclassified, false);
assert.equal(manifest.currentCanaryDisposition.rerunAuthorized, false);
assert.equal(manifest.priorV2ValidationDisposition.gatesAttempted, 5);
assert.equal(manifest.priorV2ValidationDisposition.gatesPassed, 0);
assert.equal(manifest.priorV2ValidationDisposition.quarantinedFiles, 106);
assert.equal(
  manifest.priorV2ValidationDisposition.priorOutputsReusableForAcceptance,
  false
);
assert.equal(manifest.proposedPolicy.version, "v2.1-proposal");
assert.equal(manifest.proposedPolicy.everyIntegerRoundedTieAccepted, true);
assert.equal(manifest.proposedPolicy.promoted, false);
assert.equal(manifest.cohort.debates.length, 10);
assert.equal(
  new Set(manifest.cohort.debates.map((item) => item.debateNumber)).size,
  10
);
assert.equal(
  manifest.cohort.disjointFromCalibrationCanaryAndFailedV2Validation,
  true
);
assert.equal(manifest.model.label, "5.6 Sol");
assert.equal(manifest.model.slug, "gpt-5.6-sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.equal(manifest.scheduling.attemptsPerContext, 1);
assert.equal(manifest.scheduling.automaticRetriesMaximum, 0);
assert.equal(manifest.scheduling.timeoutExtensionsMaximum, 0);
assert.equal(manifest.candidateShardedInventory.contextsPerDebate, 3);
assert.deepEqual(manifest.candidateShardedInventory.stages, [
  "candidate-census-plan",
  "pro-candidate-evidence-selection",
  "con-candidate-evidence-selection",
]);
assert.equal(
  manifest.candidateShardedInventory.deterministicCardinalityRule,
  "priority-tier-then-chronology-retain-first-two-per-section-side"
);
assert.equal(manifest.costBoundary.meteredModelApiCostUsdMaximum, 0);
assert.equal(manifest.costBoundary.paidTranscriptionAuthorized, false);
assert.equal(manifest.costBoundary.paidTranscriptionCostUsdMaximum, 0);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(
    sha256(await readFile(file)),
    digest,
    `${file}: validation source hash drifted`
  );
}
assert.equal(
  manifest.authorization.sourcePreparationPacketAndSchemaPreparation,
  true
);
for (const [key, value] of Object.entries(manifest.authorization)) {
  if (key !== "sourcePreparationPacketAndSchemaPreparation") {
    assert.equal(value, false, `${key}: must be false`);
  }
}
for (const value of Object.values(manifest.stopRules)) {
  assert.equal(value, true);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: manifest.cohort.debates.map((item) => item.debateNumber),
      sourceHashesVerified: Object.keys(manifest.sourceHashes).length,
      currentCanaryReclassified: false,
      priorV2ValidationPassed: false,
      policyPromoted: false,
      modelExecutionAuthorized: false,
      paidTranscriptionAuthorized: false,
      nextAuthorized: "source-packet-and-discovery-schema-preparation-only",
    },
    null,
    2
  )
);
