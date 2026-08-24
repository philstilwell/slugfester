#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const stageRoot = "docs/assessment-production/post-canary-continuation-v1/batch-08/audio-verification";
const outputPath = `${stageRoot}/failure-diagnosis.json`;
const toolPath = "scripts/diagnose-assessment-production-post-canary-batch-08-audio-verification-failure.mjs";
const validationToolPath = "scripts/test-assessment-production-post-canary-batch-08-audio-verification-failure-diagnosis.mjs";
const write = process.argv.includes("--write");
const validate = process.argv.includes("--validate");

const evidence = Object.freeze({
  request: [`${stageRoot}/execution-manifest.json`, "bb5fa2011040e23f8d74a854b6a7c8b8331cd86c525ad2cf1a988b1a5889c809"],
  execution: [`${stageRoot}/model-execution.json`, "7fef5148923c874872e9521223c9d32cdca34caa70ac23ed996771ddde36d0b0"],
  validationAudit: [`${stageRoot}/audio-verification.json`, "4bc49aa75667f52d1c1bd70a478bd874f973362604c2e7c0e4f2dda97b245219"],
  validationAnalysis: [`${stageRoot}/analysis.json`, "8b16fe73e5bd366812f6414affccd03726d0b503eb71caa3ae3a29179e888962"],
  cost: [`${stageRoot}/cost-control-analysis.json`, "6e198b7eda4331f292f798d1e034472c5c5f838b09ea4bd9af7c1913757c93a3"],
  recoveryOneDiagnosis: [`${stageRoot}/validation-recovery-1/diagnosis.json`, "cdc745205e409b8e1e32c93bb606e793af906b2b748ed19411e55879d690ca83"],
  recoveryOnePlan: [`${stageRoot}/validation-recovery-1/correction-plan.json`, "5317bafa3f56c547ee073789bf42774dec976180a0f4109de5105f926a38b504"],
  recoveryOneOverlay: [`${stageRoot}/validation-recovery-1/validation-overlay.json`, "f0147d605869e5f839eec570c763cc794ad4056912362416b528f9247bfd603a"],
  recoveryOneExecution: [`${stageRoot}/validation-recovery-1/execution.json`, "8f3bd340492fbdc64f4dfd4f2b3b6844b93aa3721792c7809b7dfc5a5f6eee64"],
  recoveryOneAnalysis: [`${stageRoot}/validation-recovery-1/analysis.json`, "4d14d5a9204b3f642ec58eb817ebc4d13cdf47bf53fc3e23df4b965b029e52e2"],
  recoveryTwoDiagnosis: [`${stageRoot}/validation-recovery-2/diagnosis.json`, "59eb411a00eac767e3131df95766055a57d2c26db79a2086fd20b92118549b22"],
  recoveryTwoPlan: [`${stageRoot}/validation-recovery-2/correction-plan.json`, "f04d2cf1c0479f12337075b6eae5ef4a3c4c774ae88b5a19abb0cc8f009d44c3"],
  recoveryTwoOverlay: [`${stageRoot}/validation-recovery-2/validation-overlay.json`, "daa54f60d57bac575423cc594973db0c43726abac7bcf821aa1c80ffc944cbf1"],
  recoveryTwoExecution: [`${stageRoot}/validation-recovery-2/execution.json`, "c3d83ce3c0545da1445c7cfc434b36a8f3b35bfc967e0e028e54754109f53ac9"],
  recoveryTwoAnalysis: [`${stageRoot}/validation-recovery-2/analysis.json`, "4c3aa4045ccfd6500890814ace424ba987187ccad2b3aa2e19f78559c94707f0"],
});

const protectedControls = Object.freeze({
  standingAuthorization: ["docs/assessment-production/post-canary-continuation-v1/batch-08/standing-authorization.json", "ae02079b7d456a5d75c554348bbb496c5a7edc57dfb2e40536059d41b5bfccc9"],
  stageHarness: ["scripts/assessment-production-post-canary-batch-08-audio-verification-stage.mjs", "738880880d1879da2ac378affbc72f2da73c5857b891bd3e4f775f7a5fe9f739"],
  attributionValidator: ["scripts/lib/v416-audio-verification.mjs", "9f7c2a6dc40b33de092503350994b3198588c5e9b7aaf9d547365e81ceb138d7"],
});

const thresholds = Object.freeze({
  minimumFullClipExcerptRecall: 0.8,
  minimumExpectedSpeakerExcerptRecall: 0.8,
  minimumExpectedSpeakerRecallMargin: 0.15,
  minimumExpectedSpeakerDurationSeconds: 5,
});

const expected = Object.freeze([
  {
    debateNumber: "156",
    debateId: "harris-prager-religion-morality-public-reason-2014",
    moveId: "con-conscious-capacity-grounds-moral-distinctions",
    expectedSpeaker: "Sam Harris",
    transcriptPath: "output/transcribe/assessment-production-post-canary-batch-08-audio-verification/debate-156/transcripts/con-conscious-capacity-grounds-moral-distinctions.transcript.json",
    transcriptSha256: "5eb1d37866eb01a2801652efa1f987944355465be1e9df252deac45b3b5789b8",
    validationOverlayApplied: true,
    emptySegmentIndices: [33, 52],
    fullClipExcerptRecall: 0.9722222222222222,
    expectedSpeakerExcerptRecall: 0.7777777777777778,
    highestOtherSpeaker: "Dennis Prager",
    highestOtherSpeakerExcerptRecall: 0.5277777777777778,
    expectedSpeakerRecallMargin: 0.25,
    expectedSpeakerDurationSeconds: 94.15,
    checks: {
      fullClipExcerptRecovered: true,
      expectedSpeakerExcerptRecovered: false,
      expectedSpeakerRecallDistinct: true,
      expectedSpeakerDurationSufficient: true,
    },
  },
  {
    debateNumber: "156",
    debateId: "harris-prager-religion-morality-public-reason-2014",
    moveId: "con-conception-dogma-obstructs-abortion-inquiry",
    expectedSpeaker: "Sam Harris",
    transcriptPath: "output/transcribe/assessment-production-post-canary-batch-08-audio-verification/debate-156/transcripts/con-conception-dogma-obstructs-abortion-inquiry.transcript.json",
    transcriptSha256: "6d1e76a30025c363465a23f4c4fcc6ab510ad9f33c0da4b1347715bd777b202c",
    validationOverlayApplied: false,
    emptySegmentIndices: [],
    fullClipExcerptRecall: 0.9746835443037974,
    expectedSpeakerExcerptRecall: 0.7088607594936709,
    highestOtherSpeaker: "Dennis Prager",
    highestOtherSpeakerExcerptRecall: 0.34177215189873417,
    expectedSpeakerRecallMargin: 0.3670886075949367,
    expectedSpeakerDurationSeconds: 41.9,
    checks: {
      fullClipExcerptRecovered: true,
      expectedSpeakerExcerptRecovered: false,
      expectedSpeakerRecallDistinct: true,
      expectedSpeakerDurationSufficient: true,
    },
  },
  {
    debateNumber: "156",
    debateId: "harris-prager-religion-morality-public-reason-2014",
    moveId: "pro-scripture-character-historical-progress",
    expectedSpeaker: "Dennis Prager",
    transcriptPath: "output/transcribe/assessment-production-post-canary-batch-08-audio-verification/debate-156/transcripts/pro-scripture-character-historical-progress.transcript.json",
    transcriptSha256: "4fe08f1089392d6b821aca8aed7701d02e5c73556e4ade9903a391f0bb253c5b",
    validationOverlayApplied: false,
    emptySegmentIndices: [],
    fullClipExcerptRecall: 0.9871794871794872,
    expectedSpeakerExcerptRecall: 0.7948717948717948,
    highestOtherSpeaker: "Sam Harris",
    highestOtherSpeakerExcerptRecall: 0.28205128205128205,
    expectedSpeakerRecallMargin: 0.5128205128205128,
    expectedSpeakerDurationSeconds: 24.75,
    checks: {
      fullClipExcerptRecovered: true,
      expectedSpeakerExcerptRecovered: false,
      expectedSpeakerRecallDistinct: true,
      expectedSpeakerDurationSufficient: true,
    },
  },
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const locateMove = (audit, target) => {
  const matches = audit.debates.flatMap((debate) => debate.moves)
    .filter((move) => move.debateNumber === target.debateNumber && move.moveId === target.moveId);
  assert.equal(matches.length, 1, `${target.moveId}: audit match count`);
  return matches[0];
};

for (const [role, [file, digest]] of Object.entries({ ...evidence, ...protectedControls })) {
  assert.equal(sha256(await readFile(file)), digest, `${role}: frozen hash changed`);
}

const request = await readJson(evidence.request[0]);
const execution = await readJson(evidence.execution[0]);
const audit = await readJson(evidence.validationAudit[0]);
const analysis = await readJson(evidence.validationAnalysis[0]);
const cost = await readJson(evidence.cost[0]);
const recoveryOneExecution = await readJson(evidence.recoveryOneExecution[0]);
const recoveryTwoOverlay = await readJson(evidence.recoveryTwoOverlay[0]);
const recoveryTwoExecution = await readJson(evidence.recoveryTwoExecution[0]);
const recoveryTwoAnalysis = await readJson(evidence.recoveryTwoAnalysis[0]);

const protocolId = "assessment-production-post-canary-batch-08-decomposed-consensus";
for (const [label, record] of Object.entries({ request, execution, audit, analysis, cost })) {
  assert.equal(record.protocolId, protocolId, `${label}: protocol`);
}
assert.equal(execution.status, "six-post-canary-batch-08-paid-known-speaker-diarizations-completed");
assert.equal(audit.status, "post-canary-batch-08-audio-verification-unresolved");
assert.equal(analysis.status, "post-canary-batch-08-audio-verification-unresolved");
assert.deepEqual(audit.thresholds, thresholds);
assert.deepEqual(
  [execution.callsPlanned, execution.callsAttempted, execution.callsCompleted, execution.callsSkipped],
  [6, 6, 6, 0],
);
assert.equal(execution.retries, 0);
assert.equal(execution.correctionCalls, 0);
assert.equal(execution.requestFailure, false);
assert.equal(execution.costCapReachedOrExceeded, false);
assert.deepEqual([audit.totals.requiredMoves, audit.totals.verified, audit.totals.unresolved], [6, 3, 3]);
assert.deepEqual([analysis.gate.passed, analysis.gate.verified, analysis.gate.unresolved], [false, 3, 3]);

assert.equal(recoveryOneExecution.cohortReplayPassed, false);
assert.equal(recoveryTwoExecution.cohortReplayPassed, true);
assert.equal(recoveryTwoExecution.transcriptsValidated, 6);
assert.equal(recoveryTwoExecution.emptySegmentsOmittedFromInMemoryCopy, 2);
assert.equal(recoveryTwoExecution.transcriptFilesChanged, false);
assert.equal(recoveryTwoExecution.validatorThresholdsChanged, false);
assert.equal(recoveryTwoAnalysis.structuralCorrectionAccepted, true);
assert.equal(recoveryTwoAnalysis.transcriptsPreservedByteIdentically, true);
assert.equal(recoveryTwoAnalysis.failureCategory, "audio-attribution-threshold-unresolved");
assert.deepEqual(
  recoveryTwoOverlay.target.segments.map((item) => item.segmentIndex),
  [33, 52],
);

const unresolved = [];
for (const target of expected) {
  const transcriptBytes = await readFile(target.transcriptPath);
  assert.equal(sha256(transcriptBytes), target.transcriptSha256, `${target.moveId}: transcript changed`);
  const transcript = JSON.parse(transcriptBytes.toString("utf8"));
  const emptySegmentIndices = transcript.segments
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => typeof segment.text === "string" && segment.text.length === 0)
    .map(({ index }) => index);
  assert.deepEqual(emptySegmentIndices, target.emptySegmentIndices, `${target.moveId}: transcript structure changed`);

  const call = request.calls.find((item) => item.debateNumber === target.debateNumber && item.moveId === target.moveId);
  const result = execution.results.find((item) => item.debateNumber === target.debateNumber && item.moveId === target.moveId);
  const move = locateMove(audit, target);
  assert(call && result, `${target.moveId}: preserved request or execution result missing`);
  assert.equal(call.debateId, target.debateId);
  assert.equal(call.expectedSpeaker, target.expectedSpeaker);
  assert.equal(call.transcriptPath, target.transcriptPath);
  assert.equal(result.status, "completed");
  assert.equal(result.attemptCount, 1);
  assert.equal(result.retryCount, 0);
  assert.equal(result.transcriptSha256, target.transcriptSha256);
  assert.equal(move.status, "unresolved");
  assert.equal(move.resolvedSpeaker, null);
  assert.equal(move.transcript.validationOverlayApplied, target.validationOverlayApplied);
  for (const key of [
    "fullClipExcerptRecall",
    "expectedSpeakerExcerptRecall",
    "highestOtherSpeaker",
    "highestOtherSpeakerExcerptRecall",
    "expectedSpeakerRecallMargin",
    "expectedSpeakerDurationSeconds",
  ]) {
    assert.equal(move.deterministicEvidence[key], target[key], `${target.moveId}: ${key}`);
  }
  assert.deepEqual(move.deterministicEvidence.checks, target.checks);
  const failedChecks = Object.entries(target.checks).filter(([, passed]) => !passed).map(([key]) => key);
  assert.deepEqual(failedChecks, ["expectedSpeakerExcerptRecovered"]);
  unresolved.push({
    debateNumber: target.debateNumber,
    debateId: target.debateId,
    moveId: target.moveId,
    expectedSpeaker: target.expectedSpeaker,
    transcript: { path: target.transcriptPath, sha256: target.transcriptSha256 },
    transcriptStructure: {
      segmentCount: transcript.segments.length,
      emptySegmentIndices,
      validationOverlayApplied: target.validationOverlayApplied,
    },
    executionCompleted: true,
    attemptCount: 1,
    retryCount: 0,
    statusPreserved: "unresolved",
    resolvedSpeakerPreserved: null,
    deterministicEvidence: {
      fullClipExcerptRecall: target.fullClipExcerptRecall,
      expectedSpeakerExcerptRecall: target.expectedSpeakerExcerptRecall,
      highestOtherSpeaker: target.highestOtherSpeaker,
      highestOtherSpeakerExcerptRecall: target.highestOtherSpeakerExcerptRecall,
      expectedSpeakerRecallMargin: target.expectedSpeakerRecallMargin,
      expectedSpeakerDurationSeconds: target.expectedSpeakerDurationSeconds,
      checks: target.checks,
      failedChecks,
      expectedSpeakerExcerptRecallShortfall: Number(
        (thresholds.minimumExpectedSpeakerExcerptRecall - target.expectedSpeakerExcerptRecall).toFixed(15),
      ),
    },
    classification: "expected-speaker-excerpt-recall-below-frozen-threshold",
  });
}

assert.deepEqual(
  audit.debates.flatMap((debate) => debate.moves)
    .filter((move) => move.status === "unresolved")
    .map((move) => `${move.debateNumber}:${move.moveId}`),
  expected.map((item) => `${item.debateNumber}:${item.moveId}`),
);

const exactIntegerUnits = execution.usage.inputTokens * 25 + execution.usage.outputTokens * 100;
const exactCostUsd = exactIntegerUnits / 10_000_000;
assert.equal(exactIntegerUnits, 1562250);
assert.equal(exactCostUsd, 0.156225);
assert.equal(execution.usageDerivedEstimatedCostUsd, exactCostUsd);
assert.equal(Number(cost.costControl.usageDerivedEstimatedCostUsd.toFixed(7)), exactCostUsd);
assert.equal(cost.costControl.approvedCapExceeded, false);
assert.equal(cost.costControl.requestFailure, false);

const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-08-audio-verification-failure-diagnosis",
  protocolId,
  status: "frozen-three-batch-08-debate-156-audio-unresolved-diagnosed",
  diagnosedAt: "2026-08-24T11:53:51Z",
  checkpointCommit: "c04289a3a043ff0d03b2623448f5d8bc988bd556",
  productionCanary: false,
  batchNumber: 8,
  stagingOnly: true,
  userAuthorization: {
    instruction: "I approve deterministic diagnosis, validation, freezing, committing, and pushing of the three preserved Batch 8 Debate 156 audio-verification unresolved results only, with a direct incremental cost cap of $0. Use only the preserved requests, transcripts, execution, validation, correction, and cost records. Do not access or play audio; execute or retry models; use paid services; alter transcripts, references, validators, or thresholds; repair or merge results; adjudicate; derive scores; reconstruct publication; mutate production; or select Batch 9.",
    directIncrementalCostUsdMaximum: 0,
    deterministicDiagnosisAuthorized: true,
    deterministicValidationAuthorized: true,
    freezingAuthorized: true,
    commitAndPushAuthorized: true,
  },
  evidenceBoundary: {
    records: Object.fromEntries(Object.entries(evidence).map(([role, [path, digest]]) => [role, { path, sha256: digest }])),
    protectedControls: Object.fromEntries(Object.entries(protectedControls).map(([role, [path, digest]]) => [role, { path, sha256: digest }])),
    transcripts: expected.map((item) => ({
      debateNumber: item.debateNumber,
      moveId: item.moveId,
      path: item.transcriptPath,
      sha256: item.transcriptSha256,
    })),
    transcriptHashesVerified: 3,
    transcriptStructureInspectedOnly: true,
    transcriptTextIncludedInDiagnosis: false,
    transcriptTextSemanticallyEvaluated: false,
    audioFilesAccessed: 0,
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0,
    modelOrApiCalls: 0,
    paidServiceCalls: 0,
  },
  executionRecord: {
    status: execution.status,
    callsPlanned: execution.callsPlanned,
    callsAttempted: execution.callsAttempted,
    callsCompleted: execution.callsCompleted,
    callsSkipped: execution.callsSkipped,
    retries: execution.retries,
    correctionCalls: execution.correctionCalls,
    requestFailure: execution.requestFailure,
    costCapReachedOrExceeded: execution.costCapReachedOrExceeded,
    usage: execution.usage,
    usageDerivedEstimatedCostUsd: execution.usageDerivedEstimatedCostUsd,
    maximumAuthorizedCostUsd: execution.maximumAuthorizedCostUsd,
  },
  correctionRecord: {
    firstStructuralReplayPassed: false,
    finalStructuralReplayPassed: true,
    transcriptsValidated: 6,
    exactInMemoryOmissions: 2,
    originalTranscriptSegmentIndices: [33, 52],
    transcriptsPreservedByteIdentically: true,
    validatorThresholdsChanged: false,
    structuralFailureRemaining: false,
  },
  attributionDiagnosis: {
    classification: "three-completed-debate-156-calls-failed-only-expected-speaker-excerpt-recall-threshold",
    requiredMoves: 6,
    verifiedMoves: 3,
    unresolvedMoves: 3,
    frozenThresholds: thresholds,
    unresolved,
    allFullClipExcerptChecksPassed: true,
    allExpectedSpeakerRecallDistinctnessChecksPassed: true,
    allExpectedSpeakerDurationChecksPassed: true,
    expectedSpeakerExcerptRecallFailures: 3,
    transportFailures: 0,
    responseSchemaFailures: 0,
    requestFailures: 0,
    costCapFailures: 0,
    remainingTranscriptStructureFailures: 0,
    transcriptOrSpeakerSemanticAccuracyDetermined: false,
    providerCauseDetermined: false,
    correctionApproachDetermined: false,
    scopeConclusion: "The preserved records establish that each call completed and that exactly one unchanged deterministic check failed for each unresolved move: expected-speaker excerpt recall was below 0.80. They do not establish semantic speaker accuracy, provider cause, or an authorized correction.",
  },
  costControlDiagnosis: {
    classification: "usage-derived-cost-valid-and-within-approved-cap",
    exactIntegerUnits,
    exactCostUsd,
    preservedSerializedAggregateUsd: cost.costControl.usageDerivedEstimatedCostUsd,
    approvedMaximumCostUsd: cost.costControl.approvedMaximumCostUsd,
    approvedCapExceeded: false,
    requestFailure: false,
    actualInvoiceChargeAvailable: false,
    correctionRequired: false,
  },
  preservedStopDisposition: {
    audioVerificationGatePassed: false,
    unresolvedResultsPreserved: 3,
    verifiedResultsPreserved: 3,
    transcriptFilesPreservedByteIdentically: true,
    referencesPreservedByteIdentically: true,
    validatorsPreservedByteIdentically: true,
    thresholdsPreserved: true,
    repairPerformed: false,
    mergePerformed: false,
    adjudicationStarted: false,
    scoresDerived: false,
    publicationReconstructionStarted: false,
    productionMutationPerformed: false,
    batchNineSelected: false,
    downstreamWorkflowBlocked: true,
  },
  executionBoundary: {
    directIncrementalCostUsdMaximum: 0,
    directIncrementalCostUsdActual: 0,
    audioAccesses: 0,
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0,
    transcriptionCalls: 0,
    modelOrApiCalls: 0,
    paidServiceCalls: 0,
    retries: 0,
    transcriptMutations: 0,
    referenceMutations: 0,
    validatorMutations: 0,
    thresholdChanges: 0,
    repairs: 0,
    merges: 0,
    adjudications: 0,
    scoresDerived: 0,
    publicationContexts: 0,
    productionMutations: 0,
    nextBatchSelections: 0,
  },
  authorization: {
    correctionPreparation: false,
    correctionExecution: false,
    transcriptMutation: false,
    referenceMutation: false,
    validatorMutation: false,
    thresholdMutation: false,
    audioAccess: false,
    transcriptionOrModelExecution: false,
    paidServiceUse: false,
    resultMerge: false,
    adjudicationPacketPreparation: false,
    adjudication: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    nextBatchSelection: false,
  },
  freezing: {
    evidenceHashesLocked: true,
    transcriptHashesLocked: true,
    protectedControlHashesLocked: true,
    exactThreeUnresolvedMovesLocked: true,
    diagnosisToolPath: toolPath,
    diagnosisToolSha256: sha256(await readFile(toolPath)),
    validationToolPath,
    validationToolSha256: sha256(await readFile(validationToolPath)),
  },
  nextAuthorizedAction: "user-approval-required-before-any-batch-08-audio-verification-correction-preparation-result-merge-or-downstream-adjudication-work",
};

const diagnosisBytes = Buffer.from(`${JSON.stringify(diagnosis, null, 2)}\n`);
if (write) await writeFile(outputPath, diagnosisBytes);
if (validate) assert.equal(sha256(await readFile(outputPath)), sha256(diagnosisBytes), "frozen diagnosis changed");

console.log(JSON.stringify({
  status: diagnosis.status,
  wrote: write,
  validated: validate,
  unresolved: 3,
  failedExpectedSpeakerRecallChecks: 3,
  otherFailedAttributionChecks: 0,
  transcriptHashesVerified: 3,
  structuralReplayPassed: true,
  audioAccesses: 0,
  modelOrApiCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  sha256: sha256(diagnosisBytes),
  nextAuthorizedAction: diagnosis.nextAuthorizedAction,
}, null, 2));
