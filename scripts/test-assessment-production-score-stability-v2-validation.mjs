#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const manifestPath =
  "docs/assessment-production/score-stability-v2-validation-cohort/validation-manifest.json";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
assert.equal(
  manifest.status,
  "frozen-fresh-disjoint-ten-debate-score-stability-v2-validation"
);
assert.equal(manifest.currentCanaryDisposition.reclassified, false);
assert.equal(manifest.proposedPolicy.promoted, false);
assert.equal(manifest.cohort.debates.length, 10);
assert.equal(new Set(manifest.cohort.debates.map((item) => item.debateNumber)).size, 10);
assert.equal(manifest.model.slug, "gpt-5.6-sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.equal(manifest.scheduling.automaticRetriesMaximum, 0);
for (const [file, expected] of Object.entries(manifest.sourceHashes)) {
  const actual = createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
  assert.equal(actual, expected, `${file}: validation source hash mismatch`);
}
assert.equal(manifest.authorization.sourcePreparationPacketPreparation, true);
for (const [key, value] of Object.entries(manifest.authorization)) {
  if (key !== "sourcePreparationPacketPreparation") assert.equal(value, false);
}
assert.equal(manifest.costBoundary.paidTranscriptionAuthorized, false);
assert.equal(manifest.costBoundary.paidTranscriptionCostUsdMaximum, 0);
assert.equal(manifest.stopRules.postResultPolicyChangeBlocks, true);
assert.equal(manifest.stopRules.productionMutationBlocks, true);
console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: manifest.cohort.debates.map((item) => item.debateNumber),
      sourceHashesVerified: Object.keys(manifest.sourceHashes).length,
      currentCanaryReclassified: false,
      policyPromoted: false,
      modelExecutionAuthorized: false,
      paidTranscriptionAuthorized: false,
      nextAuthorized: "source-preparation-packet-preparation-only",
    },
    null,
    2
  )
);
