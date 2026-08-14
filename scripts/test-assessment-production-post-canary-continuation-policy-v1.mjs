#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";

const ROOT = "docs/assessment-production/post-canary-continuation-v1/continuation-policy-v1";
const OVERLAY = `${ROOT}/effective-source-overlay.json`;
const POLICY = `${ROOT}/selection-policy.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [overlayBytes, policyBytes, analysisBytes] = await Promise.all([readFile(OVERLAY), readFile(POLICY), readFile(ANALYSIS)]);
const overlay = JSON.parse(overlayBytes);
const policy = JSON.parse(policyBytes);
const analysis = JSON.parse(analysisBytes);
assert.equal(overlay.status, "three-debate-effective-source-overlay-frozen-and-verified");
assert.equal(policy.status, "post-canary-full-campaign-selection-policy-frozen-awaiting-separate-first-batch-selection-decision");
assert.equal(analysis.status, "post-repair-source-overlay-and-full-campaign-selection-policy-analysis-passed");
assert.equal(policy.effectiveSourceOverlay.sha256, sha256(overlayBytes));
assert.equal(analysis.effectiveSourceOverlay.sha256, sha256(overlayBytes));
assert.equal(analysis.selectionPolicy.sha256, sha256(policyBytes));
assert.deepEqual(overlay.overlays.map((item) => item.debateNumber), ["88", "127", "167"]);
assert.equal(overlay.overlays.every((item) => item.pathsChanged === false && item.semanticContentRemoved === false), true);
assert.equal(overlay.verification.corpusDebates, 195);
assert.equal(overlay.verification.effectiveSourceFilesVerified, 585);
assert.equal(overlay.verification.originalManifestHashMatches, 576);
assert.equal(overlay.verification.approvedOverlayHashMatches, 9);
assert.equal(overlay.verification.remainingPendingDyadicDebates, 164);
assert.equal(overlay.verification.remainingPendingSourceFilesVerified, 492);
assert.equal(overlay.verification.remainingCanonicalEventDebatesPassed, 164);
assert.equal(overlay.verification.remainingCanonicalEventDebatesFailed, 0);
assert.equal(overlay.verification.sourceMutations, 0);

const manifest = JSON.parse(await readFile(overlay.productionManifest.path));
const overlayByNumber = new Map(overlay.overlays.map((item) => [item.debateNumber, item.effectiveSourceChain]));
const remaining = new Set(policy.reconciledCorpus.remainingPendingDyadic);
let canonicalRemaining = 0;
let effectiveFiles = 0;
for (const item of manifest.items) {
  const source = overlayByNumber.get(item.debateNumber) ?? item.sourceChain;
  for (const [fileKey, hashKey] of [["transcript", "transcriptSha256"], ["events", "eventsSha256"], ["manifest", "manifestSha256"]]) {
    assert.equal(sha256(await readFile(source[fileKey])), source[hashKey], `Debate ${item.debateNumber}: ${fileKey} hash mismatch`);
    effectiveFiles += 1;
  }
  if (remaining.has(item.debateNumber)) {
    assert(normalizeV418Events(JSON.parse(await readFile(source.events))).length > 0);
    canonicalRemaining += 1;
  }
}
assert.equal(effectiveFiles, 585);
assert.equal(canonicalRemaining, 164);

assert.equal(policy.reconciledCorpus.totalDebates, 195);
assert.deepEqual(policy.reconciledCorpus.counts, { publishedCanary: 10, acceptedCalibrationPendingPromotion: 5, excludedMultiSpeaker: 16, remainingPendingDyadic: 164, total: 195 });
assert.equal(policy.eligibilityPolicy.includeExactlyRemainingPendingDyadicCensus, true);
assert.equal(policy.eligibilityPolicy.dyadicOnly, true);
assert.equal(policy.eligibilityPolicy.priorFailedCanaryOrValidationObservationDoesNotExclude, true);
assert.equal(policy.eligibilityPolicy.priorFreshOnlyEligible, 39);
assert.equal(policy.eligibilityPolicy.priorFreshOnlyStranded, 125);
for (const key of ["transcriptContentAccessDuringSelection", "legacyAssessmentAccessDuringSelection", "scoreAccessDuringSelection", "winnerAccessDuringSelection", "priorModelOutputAccessDuringSelection"]) assert.equal(policy.eligibilityPolicy[key], false);
assert.equal(policy.deterministicOrdering.materializeRanksInThisPlanningGate, false);
assert.deepEqual(policy.deterministicOrdering.materializedBatchMembers, []);
assert.equal(policy.deterministicOrdering.immutableAfterFirstSelection, true);
assert.equal(policy.deterministicOrdering.resultDependentReorderingAllowed, false);
assert.equal(policy.batchingPolicy.standardBatchSize, 10);
assert.equal(policy.batchingPolicy.remainingDebatesAtFreeze, 164);
assert.equal(policy.batchingPolicy.plannedContinuationBatches, 17);
assert.equal(policy.batchingPolicy.plannedFullTenDebateBatches, 16);
assert.equal(policy.batchingPolicy.plannedFinalBatchSize, 4);
assert.equal(policy.batchingPolicy.finalBatchMayBeSmaller, true);
assert.equal(policy.batchingPolicy.replacementAfterSelectionAllowed, false);
assert.equal(policy.batchingPolicy.concurrentBatchesAllowed, false);
assert.equal(policy.batchingPolicy.nextBatchSelectionBeforePriorBatchPublicationAllowed, false);
assert.deepEqual(policy.stageConcurrency, { discovery: 4, inventory: 2, judgments: 2, audio: 2, adjudication: 2, publication: 2 });
assert.equal(policy.activeControls.scorePolicyVersion, "v2.2");
assert.equal(policy.activeControls.scorePassesMaximumPerDebate, 1);
assert.equal(policy.activeControls.assessmentModel, "5.6 Sol");
assert.equal(policy.activeControls.reasoningEffort, "low");
assert.equal(policy.activeControls.authentication, "ChatGPT subscription");
assert.equal(policy.activeControls.scoreBlindnessRequired, true);
assert.equal(policy.activeControls.roundedIntegerScoreTiesPermitted, true);
assert.equal(policy.activeControls.modelAuthoredScoresAllowed, false);
assert.equal(policy.activeControls.automaticScoreRerunAllowed, false);
assert.equal(policy.selectionExecutionContract.requiresSeparateUserDecision, true);
assert.equal(policy.selectionExecutionContract.firstSelectionMayMaterializeAtMost, 10);
assert.equal(policy.selectionExecutionContract.replacementsMaximum, 0);
assert.equal(Object.values(policy.stopRules).every(Boolean), true);
assert.equal(policy.totals.batchesSelected, 0);
assert.equal(policy.totals.batchMembersMaterialized, 0);
assert.equal(policy.totals.modelContexts, 0);
assert.equal(policy.totals.meteredApiCostUsd, 0);
assert.equal(policy.authorization.effectiveSourceOverlayPreparation, true);
assert.equal(policy.authorization.continuationSelectionPolicyPreparation, true);
for (const key of ["batchSelection", "sourcePacketPreparation", "modelExecution", "scoreDerivation", "publicationReconstruction", "acceptedCalibrationPromotion", "productionMutation", "remainingProductionBatches"]) assert.equal(policy.authorization[key], false, `${key}: must remain unauthorized`);
for (const [file, expected] of Object.entries(policy.sourceHashes)) assert.equal(sha256(await readFile(file)), expected, `${file}: frozen source drifted`);
assert.equal(await exists(policy.futureArtifacts.firstBatchSelection), false);
assert.equal(analysis.decision.effectiveSourceGatePassed, true);
assert.equal(analysis.decision.remainingCanonicalSourceGatePassed, true);
assert.equal(analysis.decision.batchSelectionAttempted, false);
assert.equal(policy.nextAuthorizedAction, "user-decision-on-first-post-canary-production-batch-selection-preparation");

console.log(JSON.stringify({ status: "passed", effectiveSourceFiles: 585, overlayDebates: ["88", "127", "167"], canonicalRemainingDebates: 164, plannedBatches: 17, selectedBatches: 0, modelContexts: 0, directCostUsd: 0, nextAuthorizedAction: policy.nextAuthorizedAction }, null, 2));
