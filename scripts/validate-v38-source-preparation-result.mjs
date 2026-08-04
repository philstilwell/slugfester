#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { V38_ROOT, assert } from "./lib/v38-source-preparation.mjs";
import { V38_SOURCE_EXECUTION_MANIFEST } from "./lib/v38-source-execution.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (file) => readFile(path.resolve(file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const exists = async (file) => { try { await access(path.resolve(file)); return true; } catch { return false; } };
const manifest = await readJson(V38_SOURCE_EXECUTION_MANIFEST);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
const [proposal, reviewLock, review, disagreements, adjudicationMap, adjudicationLock, adjudication, analysis, finalInventory] = await Promise.all([
  readJson(manifest.artifacts.proposalExecution), readJson(manifest.artifacts.reviewLock), readJson(manifest.artifacts.reviewExecution), readJson(manifest.artifacts.initialDisagreements), readJson(manifest.artifacts.adjudicationOptionMap), readJson(manifest.artifacts.adjudicationLock), readJson(manifest.artifacts.adjudicationExecution), readJson(manifest.artifacts.analysis), readJson(manifest.artifacts.finalInventory)
]);
assert(proposal.validOutputContexts === 3 && proposal.contextsPlanned === 3, "proposal execution incomplete");
assert(review.validOutputContexts === 3 && review.contextsPlanned === 3, "review execution incomplete");
assert(adjudication.validOutputContexts === adjudication.contextsPlanned && adjudication.contextsPlanned === disagreements.counts.adjudicationContexts, "adjudication execution incomplete");
for (const record of [proposal, review, adjudication]) {
  assert(record.totalRetries === 0 && record.preInferenceSchemaRejections === 0 && record.sameRequestStreamRecoveries === 0 && record.invalidItemCount === 0 && record.scoringFieldCount === 0 && record.meteredApiCostUsd === 0 && record.transcriptionCostUsd === 0, `${record.stage}: execution controls failed`);
}
assert(Date.parse(reviewLock.frozenAt) <= Date.parse(review.startedAt) && reviewLock.frozenBeforeStageModelExecution, "review phase was not frozen before execution");
assert(Date.parse(adjudicationLock.frozenAt) <= Date.parse(adjudication.startedAt) && adjudicationLock.frozenBeforeStageModelExecution, "adjudication phase was not frozen before execution");
for (const lock of [reviewLock, adjudicationLock]) for (const [file, digest] of Object.entries(lock.hashes)) assert(sha256(await read(file)) === digest, `${lock.stage}: phase-lock hash mismatch: ${file}`);
assert(adjudicationMap.schemaVersion === "3.8-source-adjudication-option-map-set", "adjudication option map invalid");
assert(analysis.totals.finalTwoVoteFields === analysis.totals.comparisonFields && analysis.totals.unresolvedFields === 0, "final source fields lack two-vote resolution");
assert(analysis.totals.scoringFields === 0 && analysis.totals.paidTranscriptionCalls === 0 && analysis.totals.meteredApiCostUsd === 0, "analysis cost or scoring prohibition failed");
assert(analysis.decision.burdenContactClassificationModelExecutionAuthorized === false && analysis.decision.numericalParticipantScoringAuthorized === false && analysis.decision.assessmentProseAuthorized === false && analysis.decision.productionMutationAuthorized === false, "downstream authorization expanded improperly");
assert(finalInventory.debateCount === 3, "final inventory debate count invalid");
if (analysis.sourcePreparationPassed) {
  assert(finalInventory.status === "locked-source-inventory" && finalInventory.selectedMoveCount === 12, "passed source preparation lacks twelve-move inventory");
  assert(analysis.totals.pendingAudioVerifications === 0, "passed source preparation has pending audio");
} else {
  assert(analysis.status === "awaiting-required-audio-verification" || analysis.status === "source-preparation-failed", "incomplete source status invalid");
}
assert(!(await exists(`${V38_ROOT}/source-preparation/outputs`)), "classification output directory must not exist");
console.log(JSON.stringify({ status: "passed", artifactIntegrityPassed: true, proposalValidContexts: proposal.validOutputContexts, reviewValidContexts: review.validOutputContexts, initialPreparationAgreements: disagreements.counts.agreements, initialPreparationDisagreements: disagreements.counts.disagreements, adjudicationContexts: adjudication.contextsPlanned, finalTwoVoteFields: analysis.totals.finalTwoVoteFields, unresolvedFields: analysis.totals.unresolvedFields, requiredAudioVerifications: analysis.totals.requiredAudioVerifications, pendingAudioVerifications: analysis.totals.pendingAudioVerifications, selectedMoves: analysis.totals.selectedMoves, sourcePreparationPassed: analysis.sourcePreparationPassed, classificationPacketConstructionPreregistrationAuthorized: analysis.decision.classificationPacketConstructionPreregistrationAuthorized, classificationModelExecutionAuthorized: false, numericalScoringAuthorized: false, assessmentProseAuthorized: false, productionMutationAuthorized: false, meteredApiCostUsd: 0 }, null, 2));
