#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ANALYSIS =
  "docs/assessment-production/score-stability-v2.2.1-discovery-successor-development/development-analysis.json";
const analysis = JSON.parse(await readFile(ANALYSIS, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  analysis.status,
  "v2.2.1-order-invariant-bounded-end-discovery-successor-model-free-regression-passed"
);
assert.equal(analysis.predecessorGateDisposition.v22DiscoveryGate, "failed-and-not-retried");
assert.equal(analysis.predecessorGateDisposition.acceptedAsPassed, false);
assert.equal(analysis.predecessorGateDisposition.reclassified, false);
assert.equal(
  analysis.predecessorGateDisposition.rawOutputsUsedForDevelopmentEvidenceOnly,
  true
);
assert.equal(
  analysis.predecessorGateDisposition.proposedV22ScorePolicyPromoted,
  false
);
assert.equal(analysis.successorContract.rawOutputsRewritten, false);
assert.equal(analysis.successorContract.candidateFieldsModified, false);
assert.equal(
  analysis.successorContract.candidateArrayOrderRepositoryCanonicalizedBeforeValidation,
  true
);
assert.deepEqual(analysis.successorContract.canonicalOrderKey, [
  "sourceWindow.startEvent",
  "sourceWindow.endEvent",
  "candidateId",
]);
assert.deepEqual(analysis.successorContract.sourceWindowShapeUnchanged, [
  "startEvent",
  "endEvent",
]);
assert.equal(
  analysis.successorContract.repositoryDerivedLexicalTokenCount,
  true
);
assert.equal(analysis.successorContract.minimumLexicalTokens, 12);
assert.equal(analysis.successorContract.requestedLexicalTokensProhibited, true);
assert.equal(
  analysis.successorContract.modelAuthoredBoundedEndEventRequired,
  true
);
assert.equal(
  analysis.successorContract.allNonOrderingValidationRulesRetained,
  true
);
assert.equal(
  analysis.successorContract.candidateBundleCompilationOrderInvariant,
  true
);
assert.equal(analysis.successorContract.semanticCorrectionPerformed, false);
assert.equal(analysis.successorContract.retryPerformed, false);
assert.equal(analysis.successorContract.scoreFieldsAvailable, false);
assert.equal(analysis.rows.length, 38);
assert.equal(analysis.rows.filter((row) => row.strictAccepted).length, 37);
assert.equal(analysis.rows.filter((row) => row.successorAccepted).length, 38);
const recovered = analysis.rows.filter(
  (row) => row.canonicalOrderingAppliedForValidation
);
assert.equal(recovered.length, 1);
assert.equal(recovered[0].debateNumber, "177");
assert.equal(recovered[0].chunkId, "chunk-001");
assert.equal(recovered[0].sourceExecutionAccepted, false);
assert.equal(recovered[0].candidateFieldsModified, false);
assert.deepEqual(recovered[0].rawCandidateIds.slice(-2), ["c007", "c008"]);
assert.deepEqual(recovered[0].canonicalCandidateIds.slice(-2), ["c008", "c007"]);
assert.equal(analysis.debateBundles.length, 10);
assert.equal(
  analysis.debateBundles.every(
    (debate) => debate.rawAndOrderedCompilationCanonicallyIdentical
  ),
  true
);
assert.equal(analysis.positiveControl.reversedRawArrayStrictlyRejected, true);
assert.equal(analysis.positiveControl.reversedRawArraySuccessorAccepted, true);
assert.equal(
  analysis.positiveControl.canonicalOrderingAppliedForValidation,
  true
);
assert.equal(
  analysis.positiveControl.compiledBundleCanonicallyIdentical,
  true
);
assert.equal(analysis.negativeControls.length, 8);
assert.equal(
  analysis.negativeControls.every((control) => control.rejected),
  true
);
assert.equal(analysis.totals.v22RawOutputs, 38);
assert.equal(analysis.totals.strictAccepted, 37);
assert.equal(analysis.totals.strictRejected, 1);
assert.equal(analysis.totals.successorAccepted, 38);
assert.equal(analysis.totals.successorRejected, 0);
assert.equal(analysis.totals.orderingOnlyRecoveries, 1);
assert.equal(analysis.totals.modelContextsExecuted, 0);
assert.equal(analysis.totals.retries, 0);
assert.equal(analysis.totals.semanticCorrections, 0);
assert.equal(analysis.totals.scoresDerived, 0);
for (const [file, digest] of Object.entries(analysis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drift`);
}
assert.equal(
  analysis.authorization.preservedV22RawOutputMechanicalRecovery,
  true
);
for (const [key, value] of Object.entries(analysis.authorization)) {
  if (key !== "preservedV22RawOutputMechanicalRecovery") {
    assert.equal(value, false, `${key}: must be false`);
  }
}
assert.equal(
  analysis.nextAuthorizedAction,
  "mechanically-revalidate-and-compile-preserved-v2.2-raw-outputs-under-v2.2.1-model-free-only"
);
console.log(
  JSON.stringify(
    {
      status: "passed",
      rawOutputs: analysis.totals.v22RawOutputs,
      strictAccepted: analysis.totals.strictAccepted,
      successorAccepted: analysis.totals.successorAccepted,
      orderingOnlyRecoveries: analysis.totals.orderingOnlyRecoveries,
      negativeControlsRejected:
        analysis.totals.negativeControlsRejected,
      modelContextsExecuted: 0,
      retries: 0,
      scoresDerived: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
