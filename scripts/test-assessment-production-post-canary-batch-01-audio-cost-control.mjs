#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const path =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/audio-verification/cost-control-analysis.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const analysis = JSON.parse(await readFile(path, "utf8"));

assert.equal(
  analysis.status,
  "audio-attribution-passed-usage-derived-cost-estimate-exceeded-approved-cap"
);
assert.equal(analysis.audioAttributionGate.passed, true);
assert.equal(analysis.audioAttributionGate.verified, 3);
assert.equal(analysis.audioAttributionGate.unresolved, 0);
assert.equal(analysis.costControl.originalPlanningEstimateUsd, 0.0351);
assert.equal(analysis.costControl.approvedMaximumCostUsd, 0.1);
assert.equal(analysis.costControl.usageDerivedEstimatedCostUsd, 0.1190425);
assert.equal(analysis.costControl.amountAboveApprovedCapUsd, 0.01904249999999999);
assert.equal(analysis.costControl.approvedCapExceeded, true);
assert.equal(analysis.costControl.directIncrementalCostCapControlPassed, false);
assert.equal(analysis.totals.inputTokens, 6657);
assert.equal(analysis.totals.audioInputTokens, 6229);
assert.equal(analysis.totals.textInputTokens, 428);
assert.equal(analysis.totals.outputTokens, 10240);
assert.equal(analysis.totals.totalTokens, 16897);
assert.equal(analysis.calls.length, 3);
assert.equal(analysis.executionBoundary.paidCallsAddedByCostAnalysis, 0);
assert.equal(analysis.executionBoundary.modelCallsAddedByCostAnalysis, 0);
assert.equal(analysis.executionBoundary.audioPlaybackCalls, 0);
assert.equal(analysis.executionBoundary.retries, 0);
assert.equal(analysis.executionBoundary.judgmentModelContexts, 0);
assert.equal(analysis.executionBoundary.adjudicationModelContexts, 0);
assert.equal(analysis.executionBoundary.scoresDerived, 0);
assert.equal(analysis.workflowDisposition.downstreamWorkflowBlocked, true);
assert.equal(analysis.workflowDisposition.priorAnalysisNextAuthorizedActionSuperseded, true);
for (const value of Object.values(analysis.authorization)) assert.equal(value, false);
for (const [file, digest] of Object.entries(analysis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
}
assert.equal(
  analysis.nextAuthorizedAction,
  "user-review-required-before-any-batch-01-downstream-work-after-usage-derived-cost-cap-exceedance"
);
console.log(JSON.stringify({
  status: "passed",
  audioAttributionPassed: true,
  approvedCapUsd: analysis.costControl.approvedMaximumCostUsd,
  usageDerivedEstimatedCostUsd: analysis.costControl.usageDerivedEstimatedCostUsd,
  amountAboveApprovedCapUsd: analysis.costControl.amountAboveApprovedCapUsd,
  downstreamWorkflowBlocked: true
}, null, 2));
