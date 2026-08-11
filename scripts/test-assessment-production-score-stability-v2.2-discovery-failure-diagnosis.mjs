#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/score-stability-v2.2-validation-cohort/discovery";
const diagnosis = JSON.parse(await readFile(`${ROOT}/failure-diagnosis.json`));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  diagnosis.status,
  "v2.2-discovery-gate-failed-nonchronological-candidate-order-confirmed-no-further-action-authorized"
);
assert.equal(diagnosis.gateDisposition.acceptedAsPassed, false);
assert.equal(diagnosis.gateDisposition.contextsPlanned, 38);
assert.equal(diagnosis.gateDisposition.contextsAttempted, 38);
assert.equal(diagnosis.gateDisposition.contextsUnattempted, 0);
assert.equal(diagnosis.gateDisposition.validContexts, 37);
assert.equal(diagnosis.gateDisposition.invalidContexts, 1);
assert.equal(diagnosis.gateDisposition.retries, 0);
assert.equal(diagnosis.gateDisposition.timeoutExtensions, 0);
assert.equal(diagnosis.gateDisposition.semanticCorrections, 0);
assert.equal(diagnosis.gateDisposition.v213ScoreGatePreservedFailed, true);
assert.equal(diagnosis.gateDisposition.v22DiscoveryFailed, true);
assert.equal(diagnosis.gateDisposition.proposedV22PolicyPromoted, false);
assert.equal(diagnosis.failure.debateNumber, "177");
assert.equal(diagnosis.failure.chunkId, "chunk-001");
assert.equal(diagnosis.failure.priorCandidateId, "c007");
assert.equal(diagnosis.failure.failedCandidateId, "c008");
assert.equal(diagnosis.failure.modelTransportSucceeded, true);
assert.equal(diagnosis.failure.authentication, "ChatGPT subscription");
assert.equal(diagnosis.failure.timedOut, false);
assert.equal(diagnosis.failure.deterministicValidationPassed, false);
assert.equal(diagnosis.failure.semanticCorrectionPerformed, false);
assert.equal(diagnosis.failure.retryPerformed, false);
assert.equal(diagnosis.candidateOrderEvidence.candidateCount, 8);
assert.equal(diagnosis.candidateOrderEvidence.priorStartEvent, 699);
assert.equal(diagnosis.candidateOrderEvidence.priorEndEvent, 878);
assert.equal(diagnosis.candidateOrderEvidence.failedStartEvent, 679);
assert.equal(diagnosis.candidateOrderEvidence.failedEndEvent, 890);
assert.equal(diagnosis.candidateOrderEvidence.startRegressionEvents, 20);
assert.equal(
  diagnosis.candidateOrderEvidence.crossItemChronologyStructurallyEncoded,
  false
);
assert.equal(diagnosis.contractFinding.sourceHashesPassed, true);
assert.equal(diagnosis.contractFinding.outputConformedToTransportSchema, true);
assert.equal(
  diagnosis.contractFinding.deterministicValidatorCorrectlyRejectedOutput,
  true
);
assert.equal(diagnosis.contractFinding.compilerDefectDetected, false);
assert.equal(diagnosis.contractFinding.sourceDefectDetected, false);
assert.equal(diagnosis.contractFinding.authenticationDefectDetected, false);
assert.equal(diagnosis.contractFinding.timeoutDetected, false);
assert.equal(
  diagnosis.contractFinding.automaticCandidateReorderingPermitted,
  false
);
assert.equal(diagnosis.possibleFutureProtocolDirections.authorized, false);
assert.equal(diagnosis.totals.modelContextsThisDiagnosis, 0);
assert.equal(diagnosis.totals.retries, 0);
assert.equal(diagnosis.totals.timeoutExtensions, 0);
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
      failedChunk: diagnosis.failure.chunkId,
      failedCandidate: diagnosis.failure.failedCandidateId,
      priorStartEvent: diagnosis.candidateOrderEvidence.priorStartEvent,
      failedStartEvent: diagnosis.candidateOrderEvidence.failedStartEvent,
      startRegressionEvents:
        diagnosis.candidateOrderEvidence.startRegressionEvents,
      validContexts: diagnosis.gateDisposition.validContexts,
      invalidContexts: diagnosis.gateDisposition.invalidContexts,
      modelContextsThisDiagnosis: 0,
      retries: 0,
      scoresDerived: 0,
      nextAuthorizedAction: diagnosis.nextAuthorizedAction,
    },
    null,
    2
  )
);
