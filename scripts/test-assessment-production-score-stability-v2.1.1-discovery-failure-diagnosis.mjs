#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/score-stability-v2.1.1-validation-cohort/discovery";
const diagnosis = JSON.parse(await readFile(`${ROOT}/failure-diagnosis.json`));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  diagnosis.status,
  "v2.1.1-discovery-gate-failed-start-dependent-locked-lookahead-capacity-confirmed-no-further-action-authorized"
);
assert.equal(diagnosis.gateDisposition.acceptedAsPassed, false);
assert.equal(diagnosis.gateDisposition.contextsPlanned, 42);
assert.equal(diagnosis.gateDisposition.contextsAttempted, 42);
assert.equal(diagnosis.gateDisposition.contextsUnattempted, 0);
assert.equal(diagnosis.gateDisposition.validContexts, 41);
assert.equal(diagnosis.gateDisposition.invalidContexts, 1);
assert.equal(diagnosis.gateDisposition.retries, 0);
assert.equal(diagnosis.gateDisposition.timeoutExtensions, 0);
assert.equal(diagnosis.gateDisposition.semanticCorrections, 0);
assert.equal(diagnosis.gateDisposition.v1CanaryPreservedFailed, true);
assert.equal(diagnosis.gateDisposition.v2ValidationPreservedFailed, true);
assert.equal(diagnosis.gateDisposition.v21DiscoveryPreservedFailed, true);
assert.equal(diagnosis.gateDisposition.v211DiscoveryFailed, true);
assert.equal(diagnosis.gateDisposition.proposedV21PolicyPromoted, false);
assert.equal(diagnosis.failure.debateNumber, "140");
assert.equal(diagnosis.failure.chunkId, "chunk-001");
assert.equal(diagnosis.failure.candidateId, "c010");
assert.equal(diagnosis.failure.modelTransportSucceeded, true);
assert.equal(diagnosis.failure.authentication, "ChatGPT subscription");
assert.equal(diagnosis.failure.timedOut, false);
assert.equal(diagnosis.failure.deterministicValidationPassed, false);
assert.equal(diagnosis.failure.semanticCorrectionPerformed, false);
assert.equal(diagnosis.failure.retryPerformed, false);
assert.equal(diagnosis.sourceWindowEvidence.startEvent, 794);
assert.equal(diagnosis.sourceWindowEvidence.coreEndEvent, 859);
assert.equal(diagnosis.sourceWindowEvidence.contextEndEvent, 899);
assert.equal(diagnosis.sourceWindowEvidence.suffixEventCount, 106);
assert.equal(diagnosis.sourceWindowEvidence.availableLexicalTokens, 589);
assert.equal(diagnosis.sourceWindowEvidence.requestedLexicalTokens, 648);
assert.equal(diagnosis.sourceWindowEvidence.excessLexicalTokens, 59);
assert.equal(
  diagnosis.sourceWindowEvidence.schemaMinimumRequestedLexicalTokens,
  12
);
assert.equal(
  diagnosis.sourceWindowEvidence.schemaMaximumRequestedLexicalTokens,
  4962
);
assert.equal(diagnosis.sourceWindowEvidence.modelAuthoredEndEvent, false);
assert.equal(
  diagnosis.sourceWindowEvidence.repositoryMaterializationRejected,
  true
);
assert.equal(diagnosis.contractFinding.tokenMinimumStructurallyEncoded, true);
assert.equal(diagnosis.contractFinding.modelAuthoredEndEventProhibited, true);
assert.equal(
  diagnosis.contractFinding.tokenRequestMaximumConditionalOnSelectedStart,
  false
);
assert.equal(
  diagnosis.contractFinding.deterministicValidatorCorrectlyRejectedOutput,
  true
);
assert.equal(diagnosis.contractFinding.preregisteredResidualRiskOccurred, true);
assert.equal(diagnosis.contractFinding.thresholdRelaxationPermitted, false);
assert.equal(
  diagnosis.contractFinding.automaticTokenRequestClampingPermitted,
  false
);
assert.equal(diagnosis.contractFinding.automaticSpanTruncationPermitted, false);
assert.equal(diagnosis.possibleFutureProtocolDirection.authorized, false);
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
      failedCandidate: diagnosis.failure.candidateId,
      availableLexicalTokens:
        diagnosis.sourceWindowEvidence.availableLexicalTokens,
      requestedLexicalTokens:
        diagnosis.sourceWindowEvidence.requestedLexicalTokens,
      excessLexicalTokens: diagnosis.sourceWindowEvidence.excessLexicalTokens,
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
