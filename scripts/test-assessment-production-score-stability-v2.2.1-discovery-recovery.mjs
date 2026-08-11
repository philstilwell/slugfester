#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/score-stability-v2.2.1-validation-cohort/discovery-mechanical-recovery";
const analysis = JSON.parse(await readFile(`${ROOT}/analysis.json`, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  analysis.status,
  "v2.2.1-discovery-mechanically-recovered-chronology-fallback-inventory-preparation-authorized"
);
assert.equal(analysis.sourceDiscoveryGateDisposition, "v2.2-failed-and-not-retried");
assert.equal(analysis.model.label, "5.6 Sol");
assert.equal(analysis.model.slug, "gpt-5.6-sol");
assert.equal(analysis.model.reasoningEffort, "low");
assert.equal(analysis.model.authentication, "ChatGPT subscription");
assert.equal(analysis.model.scoreBlind, true);
assert.equal(analysis.proposedScorePolicy.version, "v2.2-proposal");
assert.equal(analysis.proposedScorePolicy.promoted, false);
assert.equal(analysis.rawOutputBoundary.rawOutputsRewritten, false);
assert.equal(analysis.rawOutputBoundary.candidateFieldsModified, false);
assert.equal(analysis.rawOutputBoundary.semanticCorrectionPerformed, false);
assert.equal(analysis.rawOutputBoundary.retryPerformed, false);
assert.equal(analysis.rawOutputBoundary.sourceExecutionReclassified, false);
assert.equal(analysis.outputAudits.length, 38);
assert.equal(
  analysis.outputAudits.every(
    (output) =>
      output.recoveryValidationStatus === "passed" &&
      output.repositoryDerivedLexicalTokenCounts === true &&
      output.modelAuthoredLexicalTokenCounts === false &&
      output.modelAuthoredBoundedEndEvents === true &&
      output.candidateFieldsModified === false
  ),
  true
);
const canonicalized = analysis.outputAudits.filter(
  (output) => output.canonicalOrderingAppliedForValidation
);
assert.equal(canonicalized.length, 1);
assert.equal(canonicalized[0].debateNumber, "177");
assert.equal(canonicalized[0].chunkId, "chunk-001");
assert.equal(canonicalized[0].sourceExecutionAccepted, false);
assert.equal(analysis.debates.length, 10);
assert.equal(analysis.debates.every((debate) => debate.candidates >= 8), true);
assert.equal(analysis.debates.every((debate) => debate.pro >= 4), true);
assert.equal(analysis.debates.every((debate) => debate.con >= 4), true);
assert.equal(
  analysis.debates.every(
    (debate) =>
      debate.rawAndOrderedCompilationCanonicallyIdentical &&
      debate.candidateSpansIncluded
  ),
  true
);
for (const debate of analysis.debates) {
  assert.equal(sha256(await readFile(debate.bundlePath)), debate.bundleSha256);
  assert.equal(sha256(await readFile(debate.sparsePath)), debate.sparseSha256);
}
assert.equal(analysis.audit.sourceExecutionValid, 37);
assert.equal(analysis.audit.sourceExecutionInvalid, 1);
assert.equal(analysis.audit.recoveryValid, 38);
assert.equal(analysis.audit.orderingCanonicalizations, 1);
assert.equal(analysis.audit.predecessorV22DiscoveryGateReclassified, false);
assert.equal(analysis.audit.predecessorV213ScoreGateReclassified, false);
assert.equal(analysis.audit.proposedV22ScorePolicyPromoted, false);
assert.equal(analysis.totals.debates, 10);
assert.equal(analysis.totals.candidates, 361);
assert.equal(analysis.totals.pro, 181);
assert.equal(analysis.totals.con, 180);
assert.equal(analysis.totals.modelContextsExecutedByRecovery, 0);
assert.equal(analysis.totals.retries, 0);
assert.equal(analysis.totals.timeoutExtensions, 0);
assert.equal(analysis.totals.semanticCorrections, 0);
assert.equal(analysis.totals.scoresDerived, 0);
for (const [file, digest] of Object.entries(analysis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drift`);
}
assert.equal(analysis.authorization.chronologyFallbackInventoryPreparation, true);
for (const [key, value] of Object.entries(analysis.authorization)) {
  if (key !== "chronologyFallbackInventoryPreparation") {
    assert.equal(value, false, `${key}: must be false`);
  }
}
assert.equal(
  analysis.nextAuthorizedAction,
  "prepare-v2.2.1-chronology-fallback-inventory-packets-model-free-only"
);
console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: analysis.totals.debates,
      candidates: analysis.totals.candidates,
      pro: analysis.totals.pro,
      con: analysis.totals.con,
      recoveryValid: analysis.audit.recoveryValid,
      orderingCanonicalizations: analysis.audit.orderingCanonicalizations,
      modelContextsExecutedByRecovery: 0,
      scoresDerived: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
