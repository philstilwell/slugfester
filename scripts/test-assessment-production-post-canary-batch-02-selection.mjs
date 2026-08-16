#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";

import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-02";
const SELECTION = `${ROOT}/selection.json`;
const ANALYSIS = `${ROOT}/selection-analysis.json`;
const PRIOR_COMPLETION_COMMIT = "1e4408ccc6ef8b8586e66c8b95b566a6b1117fc1";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const serializedJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const exists = (file) => access(file).then(() => true, () => false);

const [selectionBytes, analysisBytes] = await Promise.all([readFile(SELECTION), readFile(ANALYSIS)]);
const selection = JSON.parse(selectionBytes);
const analysis = JSON.parse(analysisBytes);
assert.equal(selection.status, "second-post-canary-ten-debate-batch-selection-frozen-source-gate-passed");
assert.equal(analysis.status, "second-post-canary-batch-selection-analysis-passed-awaiting-source-packet-preparation-decision");
assert.equal(analysis.selection.sha256, sha256(selectionBytes));
assert.equal(selection.batchNumber, 2);
assert.equal(selection.productionSequenceOrdinal, 3);
assert.equal(selection.productionContinuation, true);
assert.equal(selection.developmentValidationOnly, false);
assert.equal(selection.stagingOnly, true);
assert.equal(selection.priorBatchPublicationPrerequisite.atomicPublicationCommit, PRIOR_COMPLETION_COMMIT);
assert.equal(selection.priorBatchPublicationPrerequisite.atomicPublicationCommitWasHead, true);
assert.equal(selection.priorBatchPublicationPrerequisite.atomicPublicationCommitWasPushedOriginMain, true);
assert.equal(selection.priorBatchPublicationPrerequisite.completeTransactionAccepted, true);
assert.equal(selection.priorBatchPublicationPrerequisite.fullRepositoryRegressionPassed, true);
execFileSync("git", ["merge-base", "--is-ancestor", PRIOR_COMPLETION_COMMIT, "HEAD"]);

assert.equal(selection.eligibility.frozenCensusSize, 164);
assert.equal(selection.eligibility.rankedCensusSize, 164);
assert.equal(selection.eligibility.previouslyPublishedAndRemovedCount, 10);
assert.equal(selection.eligibility.remainingBeforeBatchCount, 154);
assert.equal(selection.eligibility.selectedCount, 10);
assert.equal(selection.eligibility.remainingUnselectedCount, 144);
assert.equal(selection.eligibility.priorObservationExcluded, false);
assert.equal(selection.selected.length, 10);
assert.equal(new Set(selection.selected.map((item) => item.debateNumber)).size, 10);

const policy = JSON.parse(await readFile(selection.policyLocks.selectionPolicy.path));
const manifest = JSON.parse(await readFile("docs/assessment-production/manifest-v1.json"));
const priorSelection = JSON.parse(await readFile(selection.priorBatchPublicationPrerequisite.selection.path));
const priorCompletionExecutionBytes = await readFile(selection.priorBatchPublicationPrerequisite.completionExecution.path);
const priorCompletionAnalysisBytes = await readFile(selection.priorBatchPublicationPrerequisite.completionAnalysis.path);
const priorCompletionExecution = JSON.parse(priorCompletionExecutionBytes);
const priorCompletionAnalysis = JSON.parse(priorCompletionAnalysisBytes);
assert.equal(sha256(priorCompletionExecutionBytes), selection.priorBatchPublicationPrerequisite.completionExecution.sha256);
assert.equal(sha256(priorCompletionAnalysisBytes), selection.priorBatchPublicationPrerequisite.completionAnalysis.sha256);
assert.equal(priorCompletionExecution.validation.fullRepositoryRegressionPassed, true);
assert.equal(priorCompletionAnalysis.decision.batch01ProductionPublicationGatePassed, true);
assert.deepEqual(priorCompletionAnalysis.batch01ProductionPublication.debates, priorSelection.selected.map((item) => item.debateNumber));

const manifestByNumber = new Map(manifest.items.map((item) => [item.debateNumber, item]));
const ranked = policy.reconciledCorpus.remainingPendingDyadic.map((debateNumber) => {
  const item = manifestByNumber.get(debateNumber);
  return { debateNumber, debateId: item.debateId, rankSha256: sha256(`${selection.deterministicOrdering.rankDomain}|${selection.deterministicOrdering.normativeTextSha256}|${selection.deterministicOrdering.promotionRecordSha256}|${item.debateNumber}|${item.debateId}`) };
}).sort((left, right) => left.rankSha256.localeCompare(right.rankSha256) || left.debateNumber.localeCompare(right.debateNumber));
assert.equal(sha256(serializedJson(ranked)), selection.eligibility.fullRankedCensusSha256);
assert.equal(sha256(serializedJson(ranked.slice(10))), selection.eligibility.remainingBeforeBatchRankedSha256);
assert.deepEqual(priorSelection.selected.map((item) => item.debateNumber), ranked.slice(0, 10).map((item) => item.debateNumber));
assert.deepEqual(selection.selected.map((item) => item.debateNumber), ranked.slice(10, 20).map((item) => item.debateNumber));
assert.deepEqual(selection.selected.map((item) => item.rankOrdinal), [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
assert.deepEqual(selection.selected.map((item) => item.rankSha256), ranked.slice(10, 20).map((item) => item.rankSha256));

for (const item of selection.selected) {
  assert.equal(item.speakerCount, 2);
  assert.equal(Object.values(item.sourceGate).every(Boolean), true);
  assert.equal(sha256(await readFile(item.sourceChain.transcript)), item.sourceChain.transcriptSha256);
  assert.equal(sha256(await readFile(item.sourceChain.events)), item.sourceChain.eventsSha256);
  assert.equal(sha256(await readFile(item.sourceChain.manifest)), item.sourceChain.manifestSha256);
  assert.equal(normalizeV418Events(JSON.parse(await readFile(item.sourceChain.events))).length, item.eventCount);
}
assert.equal(selection.sourceGate.selectedDebatesChecked, 10);
assert.equal(selection.sourceGate.selectedSourceFilesChecked, 30);
assert.equal(selection.sourceGate.selectedSourceFilesHashMatched, 30);
assert.equal(selection.sourceGate.canonicalEventDebatesPassed, 10);
assert.equal(selection.sourceGate.canonicalEventDebatesFailed, 0);
for (const key of ["transcriptContentSemanticallyInspected", "legacyAssessmentAccessed", "scoreAccessed", "winnerAccessed", "priorModelOutputAccessed"]) assert.equal(selection.sourceGate[key], false);
assert.deepEqual(selection.deterministicOrdering.selectedRankOrdinals, [11, 20]);
assert.equal(selection.deterministicOrdering.firstTenRemainingSelectedWithoutReplacement, true);
assert.equal(selection.deterministicOrdering.priorPublishedBatchRemovedWithoutReplacement, true);
assert.equal(selection.deterministicOrdering.replacementsAllowed, false);
assert.equal(selection.deterministicOrdering.resultDependentOrdering, false);
assert.equal(selection.modelBoundary.label, "5.6 Sol");
assert.equal(selection.modelBoundary.reasoningEffort, "low");
assert.equal(selection.modelBoundary.authentication, "ChatGPT subscription");
assert.equal(selection.modelBoundary.scoreBlind, true);
assert.equal(selection.modelBoundary.roundedIntegerScoreTiesPermitted, true);
assert.equal(selection.modelBoundary.modelContextsExecuted, 0);
assert.deepEqual(selection.stageConcurrency, { discovery: 4, inventory: 2, judgments: 2, audio: 2, adjudication: 2, publication: 2 });
assert.equal(Object.values(selection.stopRules).every(Boolean), true);
assert.equal(selection.totals.selectedDebates, 10);
assert.equal(selection.totals.sourcePacketsPrepared, 0);
assert.equal(selection.totals.modelContexts, 0);
assert.equal(selection.totals.paidServiceCalls, 0);
assert.equal(selection.totals.directIncrementalCostUsd, 0);
assert.equal(selection.authorization.batchSelectionPreparation, true);
assert.equal(selection.authorization.batchSelection, true);
for (const key of ["sourcePacketPreparation", "discoveryModelExecution", "inventoryModelExecution", "independentJudgmentModelExecution", "audioModelExecution", "adjudicationModelExecution", "scoreDerivation", "publicationReconstruction", "acceptedCalibrationPromotion", "productionMutation", "nextBatchSelection"]) assert.equal(selection.authorization[key], false, `${key}: must remain unauthorized`);
for (const [file, expected] of Object.entries(selection.sourceHashes)) assert.equal(sha256(await readFile(file)), expected, `${file}: selection source drifted`);
assert.equal(await exists(selection.futureArtifacts.sourcePreparation), false);
assert.equal(analysis.decision.priorBatchPublicationPrerequisitePassed, true);
assert.equal(analysis.decision.deterministicSelectionPassed, true);
assert.equal(analysis.decision.selectedSourceGatePassed, true);
assert.equal(analysis.decision.replacementsUsed, 0);
assert.equal(analysis.decision.sourcePacketPreparationAttempted, false);
assert.equal(analysis.decision.modelExecutionAttempted, false);
assert.equal(analysis.decision.paidServiceUsed, false);
assert.equal(analysis.decision.productionMutationAttempted, false);
assert.equal(analysis.decision.nextBatchSelectionAttempted, false);
assert.equal(selection.nextAuthorizedAction, "user-decision-on-second-post-canary-batch-source-packet-preparation");

console.log(JSON.stringify({ status: "passed", selectedDebates: selection.selected.map((item) => item.debateNumber), selectedRankOrdinals: [11, 20], sourceFiles: 30, replacements: 0, sourcePacketsPrepared: 0, modelContexts: 0, paidServiceCalls: 0, directCostUsd: 0, nextAuthorizedAction: selection.nextAuthorizedAction }, null, 2));
