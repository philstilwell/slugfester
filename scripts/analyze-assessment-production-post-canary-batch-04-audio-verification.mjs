#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { evaluateAttributionTranscript } from "./lib/v416-audio-verification.mjs";

const shouldWrite = process.argv.includes("--write");
const stageRoot = "docs/assessment-production/post-canary-continuation-v1/batch-04/audio-verification";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const [manifest, execution] = await Promise.all([
  "execution-manifest.json",
  "model-execution.json"
].map((file) => readFile(`${stageRoot}/${file}`, "utf8").then(JSON.parse)));

assert(manifest.status === "frozen-four-post-canary-batch-04-paid-known-speaker-diarizations-authorized-under-standing-authorization", "Batch 4 audio activation unavailable");
assert(manifest.calls.length === 4, "exactly four calls required");
assert(execution.retries === 0, "retries are prohibited");
assert(execution.scoresDerived === 0, "score boundary crossed");
assert(execution.judgmentModelContexts === 0, "judgment model boundary crossed");
assert(execution.adjudicationModelContexts === 0, "adjudication model boundary crossed");
assert(execution.audioPlaybackCalls === 0, "audio playback boundary crossed");
assert(execution.semanticAudioEvaluations === 0, "semantic audio boundary crossed");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
for (const [file, digest] of Object.entries(manifest.executionToolHashes)) {
  assert(sha256(await readFile(file)) === digest, `execution tool hash mismatch: ${file}`);
}

const moves = [];
for (const call of manifest.calls) {
  const result = execution.results.find((item) => item.debateNumber === call.debateNumber && item.moveId === call.moveId);
  assert(result, `${call.debateNumber}:${call.moveId}: execution result missing`);
  let deterministicEvidence = null;
  if (result.status === "completed") {
    const transcriptBytes = await readFile(call.transcriptPath);
    assert(sha256(transcriptBytes) === result.transcriptSha256, `${call.moveId}: transcript hash mismatch`);
    deterministicEvidence = evaluateAttributionTranscript(JSON.parse(transcriptBytes), {
      moveId: call.moveId,
      expectedSpeaker: call.expectedSpeaker,
      verificationExcerpt: call.verificationExcerpt
    }, manifest.thresholds);
  }
  moves.push({
    debateNumber: call.debateNumber,
    debateId: call.debateId,
    moveId: call.moveId,
    expectedSpeaker: call.expectedSpeaker,
    trigger: call.trigger,
    executionStatus: result.status,
    status: deterministicEvidence?.status ?? "unresolved",
    resolvedSpeaker: deterministicEvidence?.status === "verified" ? call.expectedSpeaker : null,
    clip: { path: call.clipPath, sha256: call.clipSha256, durationSeconds: call.durationSeconds },
    transcript: {
      path: call.transcriptPath,
      sha256: result.transcriptSha256,
      model: call.model,
      responseFormat: call.responseFormat
    },
    deterministicEvidence
  });
}

const verified = moves.filter((move) => move.status === "verified").length;
const unresolved = moves.length - verified;
const executionComplete = execution.callsCompleted === manifest.calls.length;
const passed = executionComplete && verified === moves.length;
const debates = [...new Set(moves.map((move) => move.debateNumber))].map((debateNumber) => ({
  debateNumber,
  debateId: moves.find((move) => move.debateNumber === debateNumber).debateId,
  moves: moves.filter((move) => move.debateNumber === debateNumber)
}));
const authorization = {
  adjudicationPacketPreparation:
    passed &&
    execution.directIncrementalCostCapControlPassed &&
    !execution.costCapReachedOrExceeded,
  audioFailureDiagnosis: false,
  paidTranscription: false,
  audioVerificationExecution: false,
  retry: false,
  correctionCall: false,
  judgmentModelExecution: false,
  adjudicationModelExecution: false,
  finalLedgerAssembly: false,
  scoreDerivation: false,
  publicationReconstruction: false,
  publicationModelExecution: false,
  productionMutation: false,
  nextBatchSelection: false
};
const status = passed
  ? "passed-all-four-post-canary-batch-04-confidence-moves-audio-verified"
  : executionComplete
    ? "post-canary-batch-04-audio-verification-unresolved"
    : "post-canary-batch-04-audio-verification-incomplete";
const nextAuthorizedAction = execution.costCapReachedOrExceeded || !execution.directIncrementalCostCapControlPassed
  ? "user-review-required-before-any-batch-04-downstream-work-after-audio-cost-cap-event"
  : passed
    ? "prepare-freeze-and-push-batch-04-dispute-only-adjudication-packets-under-standing-authorization"
    : "standing-authorization-stop-new-approval-required-before-batch-04-audio-verification-failure-diagnosis";

const audit = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-04-audio-verification-audit",
  protocolId: manifest.protocolId,
  status,
  productionCanary: false,
  batchNumber: 4,
  stagingOnly: true,
  debates,
  thresholds: manifest.thresholds,
  referenceContract: manifest.referenceContract,
  totals: {
    requiredMoves: moves.length,
    verified,
    unresolved,
    paidDiarizationCallsAttempted: execution.attempts,
    paidDiarizationCallsCompleted: execution.callsCompleted,
    callsSkipped: execution.callsSkipped,
    retries: 0,
    corrections: 0,
    clipMinutes: manifest.costEstimate.clipMinutes,
    durationOnlyPlanningExposureUsd: execution.durationOnlyPlanningExposureUsd,
    usageDerivedEstimatedCostUsd: execution.usageDerivedEstimatedCostUsd,
    actualBilledCostUsdAvailable: execution.actualBilledCostUsdAvailable,
    maximumAuthorizedCostUsd: execution.maximumAuthorizedCostUsd,
    directIncrementalCostCapControlPassed: execution.directIncrementalCostCapControlPassed,
    meteredJudgmentModelApiCostUsd: 0,
    judgmentModelContexts: 0,
    adjudicationModelContexts: 0,
    scoresDerived: 0,
    publicationReconstructions: 0,
    productionMutations: 0,
    nextBatchSelections: 0,
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0
  },
  authorization
};
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-04-audio-verification-analysis",
  protocolId: manifest.protocolId,
  status,
  productionCanary: false,
  batchNumber: 4,
  stagingOnly: true,
  gate: {
    passed,
    executionComplete,
    requiredMoves: moves.length,
    verified,
    unresolved,
    deterministicThresholdsApplied: true,
    measuredReferenceDurationContractApplied: true,
    knownSpeakerNamesApplied: true,
    locallySavedTranscripts: execution.results.filter((result) => result.status === "completed").every((result) => {
      const call = manifest.calls.find((item) => item.debateNumber === result.debateNumber && item.moveId === result.moveId);
      return call.transcriptPath.startsWith("output/transcribe/");
    })
  },
  costs: {
    paidDiarizationCallsAttempted: execution.attempts,
    paidDiarizationCallsCompleted: execution.callsCompleted,
    callsSkipped: execution.callsSkipped,
    retries: 0,
    durationOnlyPlanningExposureUsd: execution.durationOnlyPlanningExposureUsd,
    usageDerivedEstimatedCostUsd: execution.usageDerivedEstimatedCostUsd,
    actualBilledCostUsdAvailable: execution.actualBilledCostUsdAvailable,
    maximumAuthorizedCostUsd: execution.maximumAuthorizedCostUsd,
    directIncrementalCostCapControlPassed: execution.directIncrementalCostCapControlPassed,
    ChatGPTSubscriptionApplicable: false,
    meteredJudgmentModelApiCostUsd: 0
  },
  judgmentModelBoundary: manifest.judgmentModelBoundary,
  standingAuthorization: manifest.standingAuthorization,
  sourceCompatibility: manifest.scope.sourceCompatibility,
  authorization,
  nextAuthorizedAction
};

if (shouldWrite) {
  await writeFile(manifest.artifacts.audit, `${JSON.stringify(audit, null, 2)}\n`);
  await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({
  status,
  executionComplete,
  verified,
  unresolved,
  excerptRecalls: moves.map((move) => ({
    debateNumber: move.debateNumber,
    moveId: move.moveId,
    fullClipRecall: move.deterministicEvidence?.fullClipExcerptRecall ?? null,
    expectedSpeakerRecall: move.deterministicEvidence?.expectedSpeakerExcerptRecall ?? null,
    margin: move.deterministicEvidence?.expectedSpeakerRecallMargin ?? null,
    expectedSpeakerDurationSeconds: move.deterministicEvidence?.expectedSpeakerDurationSeconds ?? null
  })),
  paidDiarizationCallsAttempted: execution.attempts,
  retries: 0,
  usageDerivedEstimatedCostUsd: execution.usageDerivedEstimatedCostUsd,
  maximumAuthorizedCostUsd: execution.maximumAuthorizedCostUsd,
  directIncrementalCostCapControlPassed: execution.directIncrementalCostCapControlPassed,
  judgmentModelContexts: 0,
  adjudicationModelContexts: 0,
  scoresDerived: 0,
  nextAuthorizedAction
}, null, 2));
