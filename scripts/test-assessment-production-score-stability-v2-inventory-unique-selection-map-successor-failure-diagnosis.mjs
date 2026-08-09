#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-unique-selection-map-successor";
const diagnosis = JSON.parse(await readFile(`${ROOT}/failure-diagnosis.json`));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  diagnosis.status,
  "unique-selection-map-successor-gate-failed-section-side-cardinality-confirmed-no-further-action-authorized"
);
assert.equal(diagnosis.gateDisposition.acceptedAsPassed, false);
assert.equal(diagnosis.gateDisposition.contextsPlanned, 10);
assert.equal(diagnosis.gateDisposition.contextsAttempted, 3);
assert.equal(diagnosis.gateDisposition.contextsUnattempted, 7);
assert.equal(diagnosis.gateDisposition.validContexts, 2);
assert.equal(diagnosis.gateDisposition.invalidContexts, 1);
assert.equal(diagnosis.gateDisposition.retries, 0);
assert.equal(diagnosis.gateDisposition.predecessorTimeoutGatePreservedFailed, true);
assert.equal(diagnosis.gateDisposition.columnarRecoveryGatePreservedFailed, true);
assert.equal(
  diagnosis.gateDisposition.uniqueSelectionSuccessorGatePreservedFailed,
  true
);
assert.equal(diagnosis.failure.debateNumber, "31");
assert.equal(diagnosis.failure.status, "output-validation-failed");
assert.equal(diagnosis.failure.deterministicValidationPassed, false);
assert.equal(diagnosis.failure.semanticCorrectionPerformed, false);
assert.equal(diagnosis.failure.retryPerformed, false);
assert.equal(
  diagnosis.sectionSideEvidence.sectionId,
  "section-naturalistic-alternatives"
);
assert.equal(diagnosis.sectionSideEvidence.side, "pro");
assert.equal(diagnosis.sectionSideEvidence.selectedCount, 3);
assert.deepEqual(diagnosis.sectionSideEvidence.allowedSelectedCount, [1, 2]);
assert.deepEqual(diagnosis.sectionSideEvidence.orderWithinSideValues, [1, 2, 2]);
assert.equal(diagnosis.sectionSideEvidence.uniqueOrderWithinSideValues, 2);
assert.equal(
  diagnosis.sectionSideEvidence.repositorySideOfConLabeledCandidate,
  "pro"
);
assert.equal(
  diagnosis.sectionSideEvidence.modelMoveIdForConLabeledCandidate,
  "move-con-tradition-dating"
);
assert.equal(
  diagnosis.designFinding.uniqueSelectionMapPreventedDuplicateCandidateIdentity,
  true
);
assert.equal(diagnosis.designFinding.duplicateCandidateSelectionRepresentable, false);
assert.equal(
  diagnosis.designFinding.schemaEnforcedSectionSideCardinalityAcrossCandidateProperties,
  false
);
assert.equal(
  diagnosis.designFinding.changingOnlyTheRepeatedOrderWouldStillLeaveThreeProSelections,
  true
);
assert.equal(diagnosis.designFinding.automaticRepairPermitted, false);
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
      invalidSection: diagnosis.sectionSideEvidence.sectionId,
      invalidSide: diagnosis.sectionSideEvidence.side,
      selectedCount: diagnosis.sectionSideEvidence.selectedCount,
      orderWithinSideValues: diagnosis.sectionSideEvidence.orderWithinSideValues,
      failedGatesPreserved: 3,
      modelContextsThisDiagnosis: 0,
      retries: 0,
      scoresDerived: 0,
      nextAuthorizedAction: diagnosis.nextAuthorizedAction,
    },
    null,
    2
  )
);
