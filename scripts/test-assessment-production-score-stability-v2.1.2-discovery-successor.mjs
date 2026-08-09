#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { buildV212TokenCountedChunkLedger } from "./lib/assessment-production-score-stability-v2.1.2-discovery.mjs";

const ROOT =
  "docs/assessment-production/score-stability-v2.1.2-discovery-successor-development";
const analysis = JSON.parse(await readFile(`${ROOT}/development-analysis.json`));
const regression = JSON.parse(
  await readFile(`${ROOT}/retired-artifact-regression.json`)
);
const schema143Bytes = await readFile(
  `${ROOT}/schemas/debate-143-chunk-003.schema.json`
);
const schema140Bytes = await readFile(
  `${ROOT}/schemas/debate-140-chunk-001.schema.json`
);
const tokenLedger143Bytes = await readFile(
  `${ROOT}/token-ledgers/debate-143-chunk-003.jsonl`
);
const tokenLedger140Bytes = await readFile(
  `${ROOT}/token-ledgers/debate-140-chunk-001.jsonl`
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  analysis.status,
  "v2.1.2-bounded-end-discovery-successor-model-free-dual-regression-passed"
);
assert.equal(
  analysis.userAuthorization.modelExecutionAuthorizedByThisArtifact,
  false
);
assert.equal(analysis.failedGateDisposition.v1CanaryPreservedFailed, true);
assert.equal(analysis.failedGateDisposition.v2ValidationPreservedFailed, true);
assert.equal(analysis.failedGateDisposition.v21DiscoveryPreservedFailed, true);
assert.equal(analysis.failedGateDisposition.v211DiscoveryPreservedFailed, true);
assert.equal(
  analysis.failedGateDisposition.retiredOutputsAcceptedForSuccessorEvidence,
  false
);
assert.equal(analysis.failedGateDisposition.v21PolicyPromoted, false);
assert.deepEqual(analysis.successorContract.sourceSelectionShape, [
  "startEvent",
  "endEvent",
]);
assert.equal(analysis.successorContract.modelAuthoredEndEvent, true);
assert.equal(
  analysis.successorContract
    .modelAuthoredEndEventStructurallyBoundedByLockedContext,
  true
);
assert.equal(analysis.successorContract.modelAuthoredLexicalTokenCount, false);
assert.equal(analysis.successorContract.repositoryDerivedLexicalTokenCount, true);
assert.equal(analysis.successorContract.minimumLexicalTokens, 12);
assert.equal(analysis.successorContract.minimumDeterministicallyEnforced, true);
assert.equal(analysis.successorContract.requestedLexicalTokensRemoved, true);
assert.equal(
  analysis.successorContract.startDependentOverCapacityRequestUnrepresentable,
  true
);
assert.equal(analysis.successorContract.predecessorOwnershipRuleExplicit, true);
assert.equal(analysis.successorContract.thresholdRelaxed, false);
assert.equal(analysis.successorContract.silentCandidateDeletion, false);
assert.equal(analysis.successorContract.automaticTruncation, false);
assert.equal(analysis.successorContract.automaticSemanticRepair, false);

for (const [schemaBytes, coreStart, coreEnd, contextEnd] of [
  [schema143Bytes, 1680, 2499, 2539],
  [schema140Bytes, 0, 859, 899],
]) {
  const schema = JSON.parse(schemaBytes);
  const sourceWindow =
    schema.properties.candidates.items.properties.sourceWindow;
  assert.deepEqual(sourceWindow.required, ["startEvent", "endEvent"]);
  assert.equal(sourceWindow.properties.startEvent.minimum, coreStart);
  assert.equal(sourceWindow.properties.startEvent.maximum, coreEnd);
  assert.equal(sourceWindow.properties.endEvent.minimum, coreStart);
  assert.equal(sourceWindow.properties.endEvent.maximum, contextEnd);
  assert.equal(
    Object.hasOwn(sourceWindow.properties, "requestedLexicalTokens"),
    false
  );
  assert.equal(
    Object.hasOwn(schema.properties.candidates.items.properties, "sourceSpan"),
    false
  );
}
assert.equal(sha256(schema143Bytes), analysis.artifacts.v21FailureSchemaSha256);
assert.equal(sha256(schema140Bytes), analysis.artifacts.v211FailureSchemaSha256);
assert.equal(
  sha256(tokenLedger143Bytes),
  analysis.artifacts.v21FailureTokenCountedLedgerSha256
);
assert.equal(
  sha256(tokenLedger140Bytes),
  analysis.artifacts.v211FailureTokenCountedLedgerSha256
);
assert.deepEqual(
  tokenLedger143Bytes,
  buildV212TokenCountedChunkLedger(
    await readFile(
      ".assessment-cache/partition-ledgers/assessment-production-score-stability-v2.1-fresh-validation/debate-143/chunk-003.jsonl"
    )
  )
);
assert.deepEqual(
  tokenLedger140Bytes,
  buildV212TokenCountedChunkLedger(
    await readFile(
      ".assessment-cache/partition-ledgers/assessment-production-score-stability-v2.1.1-fresh-validation/debate-140/chunk-001.jsonl"
    )
  )
);

assert.equal(
  regression.status,
  "passed-dual-retired-gate-regression-both-failures-preserved-and-accepted-spans-exactly-reconstructed"
);
assert.equal(regression.failedV21GateReclassified, false);
assert.equal(regression.failedV211GateReclassified, false);
assert.equal(regression.retiredOutputsReusableForSuccessorAcceptance, false);
assert.equal(regression.totals.retiredContexts, 82);
assert.equal(regression.totals.retiredAcceptedContexts, 80);
assert.equal(regression.totals.retiredFailedContexts, 2);
assert.equal(regression.totals.successorExactRegressionContexts, 80);
assert.equal(regression.totals.successorRejectedFailureContexts, 2);
assert.equal(regression.totals.v21AcceptedCandidatesReplayed, 370);
assert.equal(regression.totals.v21ExactSourceSpanReconstructions, 370);
assert.equal(
  regression.frozenFailures.v21ShortWindow.rejectedCandidate
    .repositoryDerivedLexicalTokens,
  11
);
assert.equal(
  regression.frozenFailures.v21ShortWindow.rejectedCandidate
    .minimumLexicalTokens,
  12
);
assert.equal(
  regression.frozenFailures.v211OverCapacityRequest.rejectedCandidate
    .requestedLexicalTokens,
  648
);
assert.equal(
  regression.frozenFailures.v211OverCapacityRequest.rejectedCandidate
    .availableLexicalTokens,
  589
);
assert.equal(
  regression.frozenFailures.v211OverCapacityRequest.rejectedCandidate
    .excessLexicalTokens,
  59
);
assert.equal(
  regression.frozenFailures.v211OverCapacityRequest.rejectedCandidate
    .overCapacityRequestRepresentationAbsentFromSuccessor,
  true
);
assert.equal(regression.operationalProof.contextsChecked, 82);
assert(regression.operationalProof.maximumSchemaBytes < 10000);
assert(regression.operationalProof.maximumCopiedInputBytes <= 70000);
assert.equal(regression.operationalProof.passed, true);

for (const [file, digest] of Object.entries(analysis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drift`);
}
assert.equal(analysis.totals.modelContexts, 0);
assert.equal(analysis.totals.retries, 0);
assert.equal(analysis.totals.timeoutExtensions, 0);
assert.equal(analysis.totals.semanticCorrections, 0);
assert.equal(analysis.totals.scoresDerived, 0);
assert.equal(analysis.totals.meteredApiCostUsd, 0);
assert.equal(analysis.authorization.freshDisjointCohortSelection, true);
for (const [key, value] of Object.entries(analysis.authorization)) {
  if (key !== "freshDisjointCohortSelection") {
    assert.equal(value, false, `${key}: must remain unauthorized`);
  }
}
assert.equal(
  analysis.nextAuthorizedAction,
  "prepare-disjoint-fresh-v2.1.2-validation-cohort-selection-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      exactRegressionContexts:
        regression.totals.successorExactRegressionContexts,
      rejectedFailureContexts:
        regression.totals.successorRejectedFailureContexts,
      acceptedCandidatesReplayed:
        regression.totals.acceptedCandidatesReplayed,
      exactSourceSpanReconstructions:
        regression.totals.exactSourceSpanReconstructions,
      maximumSchemaBytes: regression.operationalProof.maximumSchemaBytes,
      maximumCopiedInputBytes:
        regression.operationalProof.maximumCopiedInputBytes,
      modelContexts: 0,
      retries: 0,
      scoresDerived: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
