#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { V382_EXECUTION_MANIFEST, V382_ROOT, assert } from "./lib/v382-source-preparation.mjs";
import { validateStructuredStreamRetries } from "./lib/v382-source-transport.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (file) => readFile(path.resolve(file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const exists = async (file) => { try { await access(path.resolve(file)); return true; } catch { return false; } };
const manifest = await readJson(V382_EXECUTION_MANIFEST);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
const [reuse, reviewLock, review, disagreements, map, adjudicationLock, adjudication, analysis, inventory] = await Promise.all([
  readJson(manifest.artifacts.proposalReuseValidation),
  readJson(manifest.artifacts.reviewLock),
  readJson(manifest.artifacts.reviewExecution),
  readJson(manifest.artifacts.initialDisagreements),
  readJson(manifest.artifacts.adjudicationOptionMap),
  readJson(manifest.artifacts.adjudicationLock),
  readJson(manifest.artifacts.adjudicationExecution),
  readJson(manifest.artifacts.analysis),
  readJson(manifest.artifacts.finalInventory)
]);
assert(reuse.status === "proposal-reuse-validated" && reuse.contextsValid === 3 && reuse.contexts.every((item) => item.rawValidatorPassed && item.enrichedReproductionMatched), "proposal reuse validation incomplete");
assert(review.validOutputContexts === 3, "review execution incomplete");
assert(adjudication.validOutputContexts === adjudication.contextsPlanned && adjudication.contextsPlanned === disagreements.counts.adjudicationContexts, "adjudication execution incomplete");
for (const record of [review, adjudication]) {
  assert(record.totalRetries === 0 && record.timedOutContexts === 0 && record.preInferenceSchemaRejections === 0 && record.invalidItemCount === 0 && record.scoringFieldCount === 0 && record.meteredApiCostUsd === 0 && record.transcriptionCostUsd === 0, `${record.stage}: execution controls failed`);
  for (const item of record.results) {
    validateStructuredStreamRetries(item.structuredStreamRecoveryEvents);
    assert(item.sameRequestStreamRecoveries === item.structuredStreamRecoveryEvents.length, `${record.stage}.${item.debateNumber}: stream event count mismatch`);
    assert(item.sameRequestStreamRecoveries <= manifest.executionPolicy.sameRequestStreamRecoveriesMaximumPerContext, `${record.stage}.${item.debateNumber}: stream recovery bound exceeded`);
  }
}
for (const lock of [reviewLock, adjudicationLock]) {
  assert(lock.frozenBeforeStageModelExecution && lock.futureOutputPathsExcluded && lock.allModelVisibleFilesHashed, `${lock.stage}: phase lock invalid`);
  for (const [file, digest] of Object.entries(lock.hashes)) assert(sha256(await read(file)) === digest, `${lock.stage}: phase-lock hash mismatch: ${file}`);
}
assert(Date.parse(reviewLock.frozenAt) <= Date.parse(review.startedAt) && Date.parse(adjudicationLock.frozenAt) <= Date.parse(adjudication.startedAt), "phase lock timing invalid");
assert(map.schemaVersion === "3.8.2-source-adjudication-option-map-set", "adjudication map invalid");
assert(analysis.totals.finalTwoVoteFields === analysis.totals.comparisonFields && analysis.totals.unresolvedFields === 0, "final source fields lack two-vote resolution");
assert(analysis.totals.scoringFields === 0 && analysis.totals.paidTranscriptionCalls === 0 && analysis.totals.meteredApiCostUsd === 0, "analysis scoring or cost prohibition failed");
assert(!analysis.decision.burdenContactClassificationModelExecutionAuthorized && !analysis.decision.numericalParticipantScoringAuthorized && !analysis.decision.assessmentProseAuthorized && !analysis.decision.productionMutationAuthorized, "downstream authorization expanded improperly");
assert(inventory.debateCount === 3, "final inventory debate count invalid");
if (analysis.sourcePreparationPassed) assert(inventory.status === "locked-source-inventory" && inventory.selectedMoveCount === 12 && analysis.totals.pendingAudioVerifications === 0, "passed continuation inventory invalid");
else assert(["awaiting-required-audio-verification", "source-preparation-failed"].includes(analysis.status), "incomplete continuation status invalid");
assert(!(await exists(`${V382_ROOT}/classification`)), "classification directory must not exist");
console.log(JSON.stringify({
  status: "passed",
  artifactIntegrityPassed: true,
  proposalReuseValidContexts: reuse.contextsValid,
  reviewValidContexts: review.validOutputContexts,
  initialPreparationAgreements: disagreements.counts.agreements,
  initialPreparationDisagreements: disagreements.counts.disagreements,
  adjudicationContexts: adjudication.contextsPlanned,
  finalTwoVoteFields: analysis.totals.finalTwoVoteFields,
  unresolvedFields: analysis.totals.unresolvedFields,
  requiredAudioVerifications: analysis.totals.requiredAudioVerifications,
  pendingAudioVerifications: analysis.totals.pendingAudioVerifications,
  selectedMoves: analysis.totals.selectedMoves,
  sourcePreparationPassed: analysis.sourcePreparationPassed,
  classificationPacketConstructionPreregistrationAuthorized: analysis.decision.classificationPacketConstructionPreregistrationAuthorized,
  classificationModelExecutionAuthorized: false,
  numericalScoringAuthorized: false,
  assessmentProseAuthorized: false,
  productionMutationAuthorized: false,
  meteredApiCostUsd: 0
}, null, 2));
