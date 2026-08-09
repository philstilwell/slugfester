#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  buildV211TokenCountedChunkLedger,
} from "./lib/assessment-production-score-stability-v2.1.1-discovery.mjs";

const ROOT =
  "docs/assessment-production/score-stability-v2.1.1-discovery-successor-development";
const analysis = JSON.parse(await readFile(`${ROOT}/development-analysis.json`));
const regression = JSON.parse(
  await readFile(`${ROOT}/retired-artifact-regression.json`)
);
const schemaBytes = await readFile(
  `${ROOT}/schemas/debate-143-chunk-003.schema.json`
);
const schema = JSON.parse(schemaBytes);
const tokenLedgerBytes = await readFile(
  `${ROOT}/token-ledgers/debate-143-chunk-003.jsonl`
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  analysis.status,
  "v2.1.1-repository-materialized-discovery-successor-model-free-regression-passed"
);
assert.equal(analysis.userAuthorization.modelExecutionAuthorizedByThisArtifact, false);
assert.equal(analysis.failedGateDisposition.v1CanaryPreservedFailed, true);
assert.equal(analysis.failedGateDisposition.v2ValidationPreservedFailed, true);
assert.equal(analysis.failedGateDisposition.v21DiscoveryPreservedFailed, true);
assert.equal(analysis.failedGateDisposition.v21AcceptedAsPassed, false);
assert.equal(
  analysis.failedGateDisposition.validV21OutputsAcceptedForSuccessorEvidence,
  false
);
assert.equal(analysis.failedGateDisposition.v21PolicyPromoted, false);
assert.deepEqual(analysis.successorContract.sourceSelectionShape, [
  "startEvent",
  "requestedLexicalTokens",
]);
assert.equal(analysis.successorContract.modelAuthoredEndEvent, false);
assert.equal(analysis.successorContract.modelAuthoredEvidenceText, false);
assert.equal(analysis.successorContract.minimumRequestedLexicalTokens, 12);
assert.equal(
  analysis.successorContract.minimumStructurallyEncodedInSchema,
  true
);
assert.equal(
  analysis.successorContract.repositoryMaterializesSmallestInclusiveEndEvent,
  true
);
assert.equal(analysis.successorContract.predecessorOwnershipRuleExplicit, true);
assert.equal(analysis.successorContract.thresholdRelaxed, false);
assert.equal(analysis.successorContract.silentCandidateDeletion, false);
assert.equal(analysis.successorContract.automaticSemanticRepair, false);

const sourceWindow =
  schema.properties.candidates.items.properties.sourceWindow;
assert.deepEqual(sourceWindow.required, [
  "startEvent",
  "requestedLexicalTokens",
]);
assert.equal(sourceWindow.properties.requestedLexicalTokens.minimum, 12);
assert.equal(Object.hasOwn(sourceWindow.properties, "endEvent"), false);
assert.equal(
  Object.hasOwn(schema.properties.candidates.items.properties, "sourceSpan"),
  false
);
assert.equal(sha256(schemaBytes), analysis.artifacts.schemaSha256);
assert.equal(sha256(tokenLedgerBytes), analysis.artifacts.tokenCountedLedgerSha256);
assert.equal(
  sha256(await readFile(`${ROOT}/retired-artifact-regression.json`)),
  analysis.artifacts.regressionSha256
);

const sourceChunk =
  ".assessment-cache/partition-ledgers/assessment-production-score-stability-v2.1-fresh-validation/debate-143/chunk-003.jsonl";
assert.deepEqual(
  tokenLedgerBytes,
  buildV211TokenCountedChunkLedger(await readFile(sourceChunk))
);
const tokenRows = tokenLedgerBytes
  .toString("utf8")
  .trim()
  .split("\n")
  .map(JSON.parse);
assert.equal(tokenRows.length, 900);
assert.equal(tokenRows[0][0], 1640);
assert.equal(tokenRows.at(-1)[0], 2539);
assert(tokenRows.every((row) => row.length === 5 && row[3] >= 1));

assert.equal(
  regression.status,
  "passed-39-valid-contexts-exactly-reconstructed-and-retired-short-window-rejected"
);
assert.equal(regression.failedV21GateReclassified, false);
assert.equal(regression.failedV21OutputsReusableForSuccessorAcceptance, false);
assert.equal(regression.totals.predecessorContexts, 40);
assert.equal(regression.totals.successorExactRegressionContexts, 39);
assert.equal(regression.totals.successorStructurallyRejectedContexts, 1);
assert.equal(regression.totals.acceptedCandidatesReplayed, 370);
assert.equal(regression.totals.exactSourceSpanReconstructions, 370);
assert.equal(regression.totals.rejectedCandidates, 1);
assert.equal(
  regression.frozenFailure.rejectedCandidate.requestedLexicalTokens,
  11
);
assert.equal(regression.frozenFailure.rejectedCandidate.minimumLexicalTokens, 12);
assert.equal(
  regression.frozenFailure.rejectedCandidate.rejectedBeforeSourceWindowMaterialization,
  true
);

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
  "prepare-disjoint-fresh-v2.1.1-validation-cohort-selection-only"
);

console.log(JSON.stringify({
  status: "passed",
  exactRegressionContexts: regression.totals.successorExactRegressionContexts,
  structurallyRejectedContexts:
    regression.totals.successorStructurallyRejectedContexts,
  exactSourceSpanReconstructions:
    regression.totals.exactSourceSpanReconstructions,
  failedCandidateRequestedTokens:
    regression.frozenFailure.rejectedCandidate.requestedLexicalTokens,
  minimumRequestedTokens:
    regression.frozenFailure.rejectedCandidate.minimumLexicalTokens,
  modelContexts: 0,
  retries: 0,
  scoresDerived: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction,
}, null, 2));
