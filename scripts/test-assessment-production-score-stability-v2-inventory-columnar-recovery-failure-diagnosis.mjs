#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-columnar-recovery";
const diagnosis = JSON.parse(await readFile(`${ROOT}/failure-diagnosis.json`));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  diagnosis.status,
  "recovery-inventory-gate-failed-cross-section-duplicate-confirmed-no-further-action-authorized"
);
assert.equal(diagnosis.gateDisposition.acceptedAsPassed, false);
assert.equal(diagnosis.gateDisposition.contextsPlanned, 10);
assert.equal(diagnosis.gateDisposition.contextsAttempted, 3);
assert.equal(diagnosis.gateDisposition.contextsUnattempted, 7);
assert.equal(diagnosis.gateDisposition.validContexts, 2);
assert.equal(diagnosis.gateDisposition.invalidContexts, 1);
assert.equal(diagnosis.gateDisposition.retries, 0);
assert.equal(diagnosis.gateDisposition.priorTimeoutGatePreservedFailed, true);
assert.equal(diagnosis.gateDisposition.currentCanaryReclassified, false);
assert.equal(diagnosis.gateDisposition.proposedPolicyPromoted, false);
assert.equal(diagnosis.failure.debateNumber, "31");
assert.equal(diagnosis.failure.status, "output-validation-failed");
assert.equal(diagnosis.failure.deterministicValidationPassed, false);
assert.equal(diagnosis.failure.semanticCorrectionPerformed, false);
assert.equal(diagnosis.failure.retryPerformed, false);
assert.equal(
  diagnosis.duplicateEvidence.qualifiedCandidateId,
  "chunk-002:chunk-002-candidate-09"
);
assert.equal(diagnosis.duplicateEvidence.modelSelectionOccurrences, 2);
assert.equal(diagnosis.duplicateEvidence.transportOccurrences, 1);
assert.equal(
  diagnosis.duplicateEvidence.modelAuditClaimedEverySelectedCandidateUsedOnce,
  true
);
assert.equal(diagnosis.duplicateEvidence.auditContradictedByOutput, true);
assert.equal(diagnosis.designFinding.columnarTransportIntroducedDuplicate, false);
assert.equal(
  diagnosis.designFinding.deterministicCompilerCorrectlyRejectedDuplicate,
  true
);
assert.equal(diagnosis.designFinding.automaticDeduplicationPermitted, false);
assert.equal(diagnosis.possibleFutureProtocolDirection.authorized, false);
assert.equal(diagnosis.totals.modelContextsThisDiagnosis, 0);
assert.equal(diagnosis.totals.retries, 0);
assert.equal(diagnosis.totals.semanticCorrections, 0);
assert.equal(diagnosis.totals.scoresDerived, 0);
assert.equal(diagnosis.totals.meteredApiCostUsd, 0);
for (const [file, digest] of Object.entries(diagnosis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drift`);
}
for (const [key, authorized] of Object.entries(diagnosis.authorization)) {
  assert.equal(authorized, false, `${key}: must remain unauthorized`);
}
assert.equal(
  diagnosis.nextAuthorizedAction,
  "none-without-explicit-user-authorization"
);
console.log(
  JSON.stringify(
    {
      status: "passed",
      failedDebate: diagnosis.failure.debateNumber,
      duplicateCandidateId: diagnosis.duplicateEvidence.qualifiedCandidateId,
      modelSelectionOccurrences:
        diagnosis.duplicateEvidence.modelSelectionOccurrences,
      transportOccurrences: diagnosis.duplicateEvidence.transportOccurrences,
      priorGatesPreservedFailed: true,
      modelContextsThisDiagnosis: 0,
      retries: 0,
      scoresDerived: 0,
      nextAuthorizedAction: diagnosis.nextAuthorizedAction,
    },
    null,
    2
  )
);
