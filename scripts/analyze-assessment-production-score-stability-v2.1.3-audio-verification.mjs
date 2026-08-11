#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { evaluateAttributionTranscript } from "./lib/v416-audio-verification.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const stageRoot =
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort/audio-verification";
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const [manifest, execution] = await Promise.all(
  ["execution-manifest.json", "model-execution.json"].map((file) =>
    readFile(`${stageRoot}/${file}`, "utf8").then(JSON.parse)
  )
);
assertV4(
  manifest.status === "frozen-five-paid-known-speaker-diarizations-authorized" &&
    execution.retries === 0 && execution.scoresDerived === 0,
  "v2.1.3 audio execution unavailable or crossed its boundary"
);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}

const moves = [];
for (const call of manifest.calls) {
  const result = execution.results.find(
    (item) => item.debateNumber === call.debateNumber && item.moveId === call.moveId
  );
  assertV4(result, `${call.debateNumber}:${call.moveId}: execution result missing`);
  let deterministicEvidence = null;
  if (result.status === "completed") {
    const transcriptBytes = await readFile(call.transcriptPath);
    assertV4(sha256(transcriptBytes) === result.transcriptSha256, `${call.moveId}: transcript hash mismatch`);
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
    clip: { path: call.clipPath, sha256: call.clipSha256, durationSeconds: call.durationSeconds },
    transcript: { path: call.transcriptPath, sha256: result.transcriptSha256, model: call.model, responseFormat: call.responseFormat },
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
  adjudicationPacketPreparation: passed,
  audioFailureDiagnosis: !passed,
  paidTranscription: false,
  retry: false,
  correctionCall: false,
  adjudicationModelExecution: false,
  finalLedgerAssembly: false,
  scoreDerivation: false,
  policyPromotion: false,
  publicationFinalization: false,
  productionMutation: false,
  remainingProductionBatches: false
};
const status = passed
  ? "passed-all-five-v2.1.3-confidence-moves-audio-verified"
  : "v2.1.3-audio-verification-unresolved";
const audit = {
  schemaVersion: "1.0-score-stability-v2.1.3-audio-verification-audit",
  protocolId: manifest.protocolId,
  status,
  productionCanary: false,
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
    maximumAuthorizedCostUsd: execution.maximumAuthorizedCostUsd,
    meteredJudgmentModelApiCostUsd: 0,
    scoresDerived: 0
  },
  authorization
};
const analysis = {
  schemaVersion: "1.0-score-stability-v2.1.3-audio-verification-analysis",
  protocolId: manifest.protocolId,
  status,
  productionCanary: false,
  stagingOnly: true,
  gate: {
    passed,
    requiredMoves: moves.length,
    verified,
    unresolved,
    deterministicThresholdsApplied: true,
    measuredReferenceDurationContractApplied: true,
    knownSpeakerNamesApplied: true,
    locallySavedTranscripts: moves.every((move) => move.transcript.path.startsWith("output/transcribe/"))
  },
  costs: {
    paidDiarizationCallsAttempted: execution.attempts,
    paidDiarizationCallsCompleted: execution.callsCompleted,
    retries: 0,
    estimatedProcessingExposureUsd: execution.estimatedProcessingExposureUsd,
    maximumAuthorizedCostUsd: execution.maximumAuthorizedCostUsd,
    ChatGPTSubscriptionApplicable: false,
    meteredJudgmentModelApiCostUsd: 0
  },
  judgmentModelBoundary: manifest.judgmentModelBoundary,
  authorization,
  nextAuthorizedAction: passed
    ? "prepare-v2.1.3-dispute-only-adjudication-packets"
    : "diagnose-v2.1.3-audio-verification-failure-only"
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
    margin: move.deterministicEvidence?.expectedSpeakerRecallMargin ?? null
  })),
  paidDiarizationCallsAttempted: execution.attempts,
  retries: 0,
  estimatedProcessingExposureUsd: execution.estimatedProcessingExposureUsd,
  judgmentModelApiCostUsd: 0,
  scoresDerived: 0,
  nextAuthorized: analysis.nextAuthorizedAction
}, null, 2));
