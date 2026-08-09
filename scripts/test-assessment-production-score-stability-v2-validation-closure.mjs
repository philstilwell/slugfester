#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort";
const analysis = JSON.parse(
  await readFile(path.resolve(`${ROOT}/validation-closure-analysis.json`), "utf8")
);
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

assert.equal(
  analysis.status,
  "score-stability-v2-fresh-validation-failed-at-inventory-policy-not-promoted"
);
assert.equal(analysis.v1CanaryDisposition.failedDebate, "64");
assert.deepEqual(analysis.v1CanaryDisposition.finalRoundedScores, {
  pro: 82,
  con: 82,
});
assert.equal(analysis.v1CanaryDisposition.reclassified, false);
assert.equal(analysis.proposedV2PolicyDisposition.promoted, false);
assert.equal(
  analysis.proposedV2PolicyDisposition.freshDisjointValidationCompleted,
  false
);
assert.equal(analysis.executionBoundary.modelLabel, "5.6 Sol");
assert.equal(analysis.executionBoundary.modelSlug, "gpt-5.6-sol");
assert.equal(analysis.executionBoundary.reasoningEffort, "low");
assert.equal(
  analysis.executionBoundary.authentication,
  "ChatGPT subscription"
);
assert.equal(analysis.executionBoundary.discoveryContextsExecuted, 45);
assert.equal(analysis.executionBoundary.inventoryContextsExecuted, 36);
assert.equal(analysis.executionBoundary.totalModelContextsExecuted, 81);
assert.equal(analysis.executionBoundary.retries, 0);
assert.equal(analysis.executionBoundary.closureModelContextsExecuted, 0);
assert.equal(analysis.inventoryCampaign.gatesAttempted, 5);
assert.equal(analysis.inventoryCampaign.completeTenDebateGatesPassed, 0);
assert.equal(analysis.inventoryCampaign.contextsAttempted, 36);
assert.equal(analysis.inventoryCampaign.locallyValidIntermediateContexts, 30);
assert.equal(analysis.inventoryCampaign.invalidContexts, 6);
assert.equal(analysis.inventoryCampaign.independentJudgmentContextsExecuted, 0);
assert.equal(analysis.inventoryCampaign.scoresDerived, 0);
assert.equal(analysis.inventoryCampaign.gates.length, 5);
for (const gate of analysis.inventoryCampaign.gates) {
  assert.equal(gate.completeTenDebateGatePassed, false);
  assert.equal(gate.validOutputsReusableForAcceptance, false);
  assert.equal(gate.retries, 0);
}
assert.equal(analysis.artifactQuarantine.files, 106);
assert.equal(
  analysis.artifactQuarantine.records.length,
  analysis.artifactQuarantine.files
);
assert.equal(
  new Set(analysis.artifactQuarantine.records.map((record) => record.file)).size,
  analysis.artifactQuarantine.files
);
for (const record of analysis.artifactQuarantine.records) {
  assert.equal(
    record.disposition,
    "preserved-evidence-only-not-reusable-for-acceptance"
  );
  assert.equal(sha256(await readFile(path.resolve(record.file))), record.sha256);
}
assert.equal(analysis.artifactQuarantine.reusableForFutureAcceptance, false);
assert.equal(analysis.artifactQuarantine.reusableAsFreshModelInput, false);
assert.equal(
  analysis.developmentDisposition.sufficientEvidenceForFreshSuccessorGate,
  false
);
assert.equal(analysis.conclusion.validationPassed, false);
assert.equal(analysis.conclusion.proposedPolicyPromoted, false);
assert.equal(analysis.conclusion.productionMutationAuthorized, false);
for (const [file, digest] of Object.entries(analysis.sourceHashes)) {
  assert.equal(
    sha256(await readFile(path.resolve(file))),
    digest,
    `${file}: source hash drift`
  );
}
for (const key of Object.keys(analysis.authorization)) {
  assert.equal(analysis.authorization[key], false, `${key}: must be false`);
}
for (const file of [
  `${ROOT}/independent-judgments`,
  `${ROOT}/disagreement-audio-prep`,
  `${ROOT}/dispute-only-adjudication`,
  `${ROOT}/final-ledger`,
  `${ROOT}/score-pass`,
  `${ROOT}/publication`,
]) {
  assert.equal(await exists(file), false, `${file}: prohibited downstream root`);
}
assert.equal(
  analysis.nextAuthorizedAction,
  "none-without-new-explicit-user-authorization"
);
console.log(
  JSON.stringify(
    {
      status: "passed",
      inventoryGatesAttempted: 5,
      completeTenDebateInventoryGatesPassed: 0,
      inventoryContextsExecuted: 36,
      locallyValidIntermediateContexts: 30,
      invalidContexts: 6,
      quarantinedArtifactFiles: analysis.artifactQuarantine.files,
      independentJudgmentContextsExecuted: 0,
      scoresDerived: 0,
      closureModelContextsExecuted: 0,
      meteredApiCostUsd: 0,
      proposedPolicyPromoted: false,
      nextAuthorized: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
