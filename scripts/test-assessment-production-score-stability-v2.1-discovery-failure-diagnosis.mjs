#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/score-stability-v2.1-validation-cohort/discovery";
const diagnosis = JSON.parse(await readFile(`${ROOT}/failure-diagnosis.json`));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  diagnosis.status,
  "v2.1-discovery-gate-failed-cross-boundary-short-source-span-confirmed-no-further-action-authorized"
);
assert.equal(diagnosis.gateDisposition.acceptedAsPassed, false);
assert.equal(diagnosis.gateDisposition.contextsPlanned, 40);
assert.equal(diagnosis.gateDisposition.contextsAttempted, 40);
assert.equal(diagnosis.gateDisposition.contextsUnattempted, 0);
assert.equal(diagnosis.gateDisposition.validContexts, 39);
assert.equal(diagnosis.gateDisposition.invalidContexts, 1);
assert.equal(diagnosis.gateDisposition.retries, 0);
assert.equal(diagnosis.gateDisposition.timeoutExtensions, 0);
assert.equal(diagnosis.gateDisposition.priorV1GatePreservedFailed, true);
assert.equal(diagnosis.gateDisposition.priorV2GatePreservedFailed, true);
assert.equal(diagnosis.gateDisposition.proposedV21PolicyPromoted, false);
assert.equal(diagnosis.failure.debateNumber, "143");
assert.equal(diagnosis.failure.chunkId, "chunk-003");
assert.equal(diagnosis.failure.candidateId, "c003-01");
assert.equal(diagnosis.failure.modelTransportSucceeded, true);
assert.equal(diagnosis.failure.authentication, "ChatGPT subscription");
assert.equal(diagnosis.failure.timedOut, false);
assert.equal(diagnosis.failure.deterministicValidationPassed, false);
assert.equal(diagnosis.failure.semanticCorrectionPerformed, false);
assert.equal(diagnosis.failure.retryPerformed, false);
assert.equal(diagnosis.sourceSpanEvidence.startEvent, 1680);
assert.equal(diagnosis.sourceSpanEvidence.endEvent, 1681);
assert.equal(diagnosis.sourceSpanEvidence.coreStartEvent, 1680);
assert.equal(diagnosis.sourceSpanEvidence.lexicalTokenCount, 11);
assert.equal(diagnosis.sourceSpanEvidence.minimumLexicalTokenCount, 12);
assert.equal(diagnosis.sourceSpanEvidence.deficit, 1);
assert.equal(diagnosis.sourceSpanEvidence.candidateBeginsAtCoreBoundary, true);
assert.equal(diagnosis.sourceSpanEvidence.predecessorChunkAccepted, true);
assert.equal(
  diagnosis.sourceSpanEvidence.predecessorCandidateId,
  "c002-10"
);
assert.equal(
  diagnosis.sourceSpanEvidence.predecessorSpanContainsFailedSpan,
  true
);
assert.equal(
  diagnosis.contractFinding.sourceSpecificSchemaEncodedLexicalMinimum,
  false
);
assert.equal(
  diagnosis.contractFinding.reviewerManualDisclosedLexicalMinimum,
  false
);
assert.equal(
  diagnosis.contractFinding.deterministicValidatorCorrectlyRejectedOutput,
  true
);
assert.equal(diagnosis.contractFinding.thresholdRelaxationPermitted, false);
assert.equal(diagnosis.contractFinding.automaticSpanExpansionPermitted, false);
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
console.log(JSON.stringify({
  status: "passed",
  failedDebate: diagnosis.failure.debateNumber,
  failedChunk: diagnosis.failure.chunkId,
  failedCandidate: diagnosis.failure.candidateId,
  lexicalTokenCount: diagnosis.sourceSpanEvidence.lexicalTokenCount,
  requiredLexicalTokenCount:
    diagnosis.sourceSpanEvidence.minimumLexicalTokenCount,
  validContexts: diagnosis.gateDisposition.validContexts,
  invalidContexts: diagnosis.gateDisposition.invalidContexts,
  modelContextsThisDiagnosis: 0,
  retries: 0,
  scoresDerived: 0,
  nextAuthorizedAction: diagnosis.nextAuthorizedAction,
}, null, 2));
