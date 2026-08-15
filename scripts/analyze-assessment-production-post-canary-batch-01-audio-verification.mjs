#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { evaluateAttributionTranscript } from "./lib/v416-audio-verification.mjs";

const shouldWrite = process.argv.includes("--write");
const stageRoot =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/audio-verification";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const [manifest, execution] = await Promise.all(
  ["execution-manifest.json", "model-execution.json"].map((file) =>
    readFile(`${stageRoot}/${file}`, "utf8").then(JSON.parse)
  )
);
assert(
  manifest.status ===
    "frozen-three-post-canary-batch-01-paid-known-speaker-diarizations-authorized",
  "Batch 1 audio activation unavailable"
);
assert(execution.retries === 0, "retries are prohibited");
assert(execution.scoresDerived === 0, "score boundary crossed");
assert(execution.judgmentModelContexts === 0, "judgment model boundary crossed");
assert(execution.adjudicationModelContexts === 0, "adjudication model boundary crossed");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
for (const [file, digest] of Object.entries(manifest.executionToolHashes)) {
  assert(sha256(await readFile(file)) === digest, `execution tool hash mismatch: ${file}`);
}

const moves = [];
for (const call of manifest.calls) {
  const result = execution.results.find(
    (item) => item.debateNumber === call.debateNumber && item.moveId === call.moveId
  );
  assert(result, `${call.debateNumber}:${call.moveId}: execution result missing`);
  let deterministicEvidence = null;
  if (result.status === "completed") {
    const transcriptBytes = await readFile(call.transcriptPath);
    assert(
      sha256(transcriptBytes) === result.transcriptSha256,
      `${call.moveId}: transcript hash mismatch`
    );
    deterministicEvidence = evaluateAttributionTranscript(
      JSON.parse(transcriptBytes),
      {
        moveId: call.moveId,
        expectedSpeaker: call.expectedSpeaker,
        verificationExcerpt: call.verificationExcerpt
      },
      manifest.thresholds
    );
  }
  moves.push({
    debateNumber: call.debateNumber,
    debateId: call.debateId,
    moveId: call.moveId,
    expectedSpeaker: call.expectedSpeaker,
    trigger: call.trigger,
    status: deterministicEvidence?.status ?? "unresolved",
    resolvedSpeaker:
      deterministicEvidence?.status === "verified" ? call.expectedSpeaker : null,
    clip: {
      path: call.clipPath,
      sha256: call.clipSha256,
      durationSeconds: call.durationSeconds
    },
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
const passed = verified === moves.length;
const debates = [...new Set(moves.map((move) => move.debateNumber))].map(
  (debateNumber) => ({
    debateNumber,
    debateId: moves.find((move) => move.debateNumber === debateNumber).debateId,
    moves: moves.filter((move) => move.debateNumber === debateNumber)
  })
);
const authorization = {
  adjudicationPacketPreparation: false,
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
  ? "passed-all-three-post-canary-batch-01-confidence-moves-audio-verified"
  : "post-canary-batch-01-audio-verification-unresolved";
const audit = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-audio-verification-audit",
  protocolId: manifest.protocolId,
  status,
  productionCanary: false,
  batchNumber: 1,
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
    retries: 0,
    corrections: 0,
    clipMinutes: manifest.costEstimate.clipMinutes,
    estimatedProcessingExposureUsd: execution.estimatedProcessingExposureUsd,
    actualBilledCostUsdAvailable: execution.actualBilledCostUsdAvailable,
    maximumAuthorizedCostUsd: execution.maximumAuthorizedCostUsd,
    meteredJudgmentModelApiCostUsd: 0,
    judgmentModelContexts: 0,
    adjudicationModelContexts: 0,
    scoresDerived: 0,
    publicationReconstructions: 0,
    productionMutations: 0,
    nextBatchSelections: 0,
    audioPlaybackCalls: 0
  },
  authorization
};
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-audio-verification-analysis",
  protocolId: manifest.protocolId,
  status,
  productionCanary: false,
  batchNumber: 1,
  stagingOnly: true,
  gate: {
    passed,
    requiredMoves: moves.length,
    verified,
    unresolved,
    deterministicThresholdsApplied: true,
    measuredReferenceDurationContractApplied: true,
    knownSpeakerNamesApplied: true,
    locallySavedTranscripts: moves.every((move) =>
      move.transcript.path.startsWith("output/transcribe/")
    )
  },
  costs: {
    paidDiarizationCallsAttempted: execution.attempts,
    paidDiarizationCallsCompleted: execution.callsCompleted,
    retries: 0,
    estimatedProcessingExposureUsd: execution.estimatedProcessingExposureUsd,
    actualBilledCostUsdAvailable: execution.actualBilledCostUsdAvailable,
    maximumAuthorizedCostUsd: execution.maximumAuthorizedCostUsd,
    ChatGPTSubscriptionApplicable: false,
    meteredJudgmentModelApiCostUsd: 0
  },
  judgmentModelBoundary: manifest.judgmentModelBoundary,
  authorization,
  nextAuthorizedAction: passed
    ? "user-approval-required-before-batch-01-dispute-only-adjudication-packet-preparation"
    : "user-approval-required-before-batch-01-audio-verification-failure-diagnosis"
};

if (shouldWrite) {
  await writeFile(manifest.artifacts.audit, `${JSON.stringify(audit, null, 2)}\n`);
  await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({
  status,
  verified,
  unresolved,
  excerptRecalls: moves.map((move) => ({
    debateNumber: move.debateNumber,
    moveId: move.moveId,
    fullClipRecall: move.deterministicEvidence?.fullClipExcerptRecall ?? null,
    expectedSpeakerRecall: move.deterministicEvidence?.expectedSpeakerExcerptRecall ?? null,
    margin: move.deterministicEvidence?.expectedSpeakerRecallMargin ?? null,
    expectedSpeakerDurationSeconds:
      move.deterministicEvidence?.expectedSpeakerDurationSeconds ?? null
  })),
  paidDiarizationCallsAttempted: execution.attempts,
  retries: 0,
  estimatedProcessingExposureUsd: execution.estimatedProcessingExposureUsd,
  judgmentModelContexts: 0,
  adjudicationModelContexts: 0,
  scoresDerived: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
