#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const stageRoot = "docs/assessment-production/post-canary-continuation-v1/batch-05/audio-verification";
const outputPath = `${stageRoot}/failure-diagnosis.json`;
const toolPath = "scripts/diagnose-assessment-production-post-canary-batch-05-audio-verification-failure.mjs";
const write = process.argv.includes("--write");
const validate = process.argv.includes("--validate");
const diagnosedIndex = process.argv.indexOf("--diagnosed-at");
const diagnosedAt = diagnosedIndex >= 0 ? process.argv[diagnosedIndex + 1] : null;
assert(diagnosedAt && !Number.isNaN(Date.parse(diagnosedAt)), "--diagnosed-at requires an ISO timestamp");

const evidence = {
  request: [`${stageRoot}/execution-manifest.json`, "58df5bc0ec550e84e41ff1835d033a16a86400c961c4e1dbbff8ea8131deb444"],
  execution: [`${stageRoot}/model-execution.json`, "d0df7c12abd9a9da63b0c89dee33a5567a55283985ac2fb0b50f2148150c480e"],
  validationAudit: [`${stageRoot}/audio-verification.json`, "5dc1acd3e56e91c9fe7bc9ce02daf8bdeffd0bdd2d5367e07babd7239d5ae26f"],
  validationAnalysis: [`${stageRoot}/analysis.json`, "378c3da31625fca292cb9bc105a9309f251c9005405a8a657d0712078f254eff"],
  cost: [`${stageRoot}/cost-control-analysis.json`, "50f3fff123cff0c765949e724392438a039aa27f4f919e78fa96d24dcc478d82"]
};
const validators = {
  attributionLibrary: ["scripts/lib/v416-audio-verification.mjs", "9f7c2a6dc40b33de092503350994b3198588c5e9b7aaf9d547365e81ceb138d7"],
  stageHarness: ["scripts/assessment-production-post-canary-batch-05-audio-verification-stage.mjs", "05025a20788a51bffdbc794b17661d9d043bbd3d357f74e4741186dc8cfff9b1"]
};
const expected = [
  {
    debateNumber: "158",
    debateId: "dillahunty-mclatchie-resurrection-evidence-2020",
    moveId: "con-unverified-resurrection-prior",
    expectedSpeaker: "Matt Dillahunty",
    transcriptPath: "output/transcribe/assessment-production-post-canary-batch-05-audio-verification/debate-158/transcripts/con-unverified-resurrection-prior.transcript.json",
    transcriptSha256: "24e404e3aac5f0daa4a55b676eb8978a1cd21465f2b0a757627847452ba7ea59",
    fullClipExcerptRecall: 0.961038961038961,
    expectedSpeakerExcerptRecall: 0.7662337662337663,
    highestOtherSpeaker: "Dr Jonathan McLatchie",
    highestOtherSpeakerExcerptRecall: 0.4935064935064935,
    expectedSpeakerRecallMargin: 0.27272727272727276,
    expectedSpeakerDurationSeconds: 80.1,
    checks: {
      fullClipExcerptRecovered: true,
      expectedSpeakerExcerptRecovered: false,
      expectedSpeakerRecallDistinct: true,
      expectedSpeakerDurationSufficient: true
    }
  },
  {
    debateNumber: "189",
    debateId: "tour-cronin-origin-of-life-2020",
    moveId: "con-simple-laws-beneath-cell-complexity",
    expectedSpeaker: "Lee Cronin",
    transcriptPath: "output/transcribe/assessment-production-post-canary-batch-05-audio-verification/debate-189/transcripts/con-simple-laws-beneath-cell-complexity.transcript.json",
    transcriptSha256: "714acc24092d86ca243cb69107200dda7e87a05300364eb5a160184742be917e",
    fullClipExcerptRecall: 0.948051948051948,
    expectedSpeakerExcerptRecall: 0.5324675324675324,
    highestOtherSpeaker: "A",
    highestOtherSpeakerExcerptRecall: 0.8701298701298701,
    expectedSpeakerRecallMargin: -0.33766233766233766,
    expectedSpeakerDurationSeconds: 121.55,
    checks: {
      fullClipExcerptRecovered: true,
      expectedSpeakerExcerptRecovered: false,
      expectedSpeakerRecallDistinct: false,
      expectedSpeakerDurationSufficient: true
    }
  },
  {
    debateNumber: "05",
    debateId: "dillahunty-ten-bruggencate-reasonable-god-2014",
    moveId: "con-logical-grounding-burden",
    expectedSpeaker: "Matt Dillahunty",
    transcriptPath: "output/transcribe/assessment-production-post-canary-batch-05-audio-verification/debate-05/transcripts/con-logical-grounding-burden.transcript.json",
    transcriptSha256: "c3b18268802569cf21f50920155165bc20d51fe1a097d26e3a3d4eebda33577a",
    fullClipExcerptRecall: 0.9518072289156626,
    expectedSpeakerExcerptRecall: 0.7469879518072289,
    highestOtherSpeaker: "Sye Ten Bruggencate",
    highestOtherSpeakerExcerptRecall: 0.6024096385542169,
    expectedSpeakerRecallMargin: 0.14457831325301196,
    expectedSpeakerDurationSeconds: 31.65,
    checks: {
      fullClipExcerptRecovered: true,
      expectedSpeakerExcerptRecovered: false,
      expectedSpeakerRecallDistinct: false,
      expectedSpeakerDurationSufficient: true
    }
  },
  {
    debateNumber: "05",
    debateId: "dillahunty-ten-bruggencate-reasonable-god-2014",
    moveId: "pro-logic-reflects-gods-thinking",
    expectedSpeaker: "Sye Ten Bruggencate",
    transcriptPath: "output/transcribe/assessment-production-post-canary-batch-05-audio-verification/debate-05/transcripts/pro-logic-reflects-gods-thinking.transcript.json",
    transcriptSha256: "9e7641bfd7e320d3077b05a5c9dc4c080ccb84573aee19b4788913542c5f4184",
    fullClipExcerptRecall: 0.9629629629629629,
    expectedSpeakerExcerptRecall: 0.7222222222222222,
    highestOtherSpeaker: "Matt Dillahunty",
    highestOtherSpeakerExcerptRecall: 0.37037037037037035,
    expectedSpeakerRecallMargin: 0.35185185185185186,
    expectedSpeakerDurationSeconds: 13.85,
    checks: {
      fullClipExcerptRecovered: true,
      expectedSpeakerExcerptRecovered: false,
      expectedSpeakerRecallDistinct: true,
      expectedSpeakerDurationSufficient: true
    }
  }
];
const thresholds = {
  minimumFullClipExcerptRecall: 0.8,
  minimumExpectedSpeakerExcerptRecall: 0.8,
  minimumExpectedSpeakerRecallMargin: 0.15,
  minimumExpectedSpeakerDurationSeconds: 5
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const locateMove = (audit, target) => {
  const matches = audit.debates.flatMap((debate) => debate.moves)
    .filter((move) => move.debateNumber === target.debateNumber && move.moveId === target.moveId);
  assert.equal(matches.length, 1, `${target.moveId}: audit match count`);
  return matches[0];
};

for (const [role, [file, digest]] of Object.entries({ ...evidence, ...validators })) {
  assert.equal(sha256(await readFile(file)), digest, `${role}: frozen hash changed`);
}
const request = await readJson(evidence.request[0]);
const execution = await readJson(evidence.execution[0]);
const audit = await readJson(evidence.validationAudit[0]);
const analysis = await readJson(evidence.validationAnalysis[0]);
const cost = await readJson(evidence.cost[0]);
assert.equal(execution.status, "six-post-canary-batch-05-paid-known-speaker-diarizations-completed");
assert.equal(audit.status, "post-canary-batch-05-audio-verification-unresolved");
assert.equal(analysis.status, "post-canary-batch-05-audio-verification-unresolved");
assert.deepEqual(audit.thresholds, thresholds);
assert.deepEqual(
  [execution.callsPlanned, execution.callsAttempted, execution.callsCompleted, execution.callsSkipped],
  [6, 6, 6, 0]
);
assert.equal(execution.retries, 0);
assert.equal(execution.correctionCalls, 0);
assert.equal(execution.requestFailure, false);
assert.equal(execution.costCapReachedOrExceeded, false);
assert.deepEqual([audit.totals.requiredMoves, audit.totals.verified, audit.totals.unresolved], [6, 2, 4]);
assert.deepEqual([analysis.gate.passed, analysis.gate.verified, analysis.gate.unresolved], [false, 2, 4]);

const unresolved = [];
for (const target of expected) {
  assert.equal(sha256(await readFile(target.transcriptPath)), target.transcriptSha256, `${target.moveId}: transcript changed`);
  const call = request.calls.find((item) => item.debateNumber === target.debateNumber && item.moveId === target.moveId);
  const result = execution.results.find((item) => item.debateNumber === target.debateNumber && item.moveId === target.moveId);
  const move = locateMove(audit, target);
  assert(call && result);
  assert.equal(call.debateId, target.debateId);
  assert.equal(call.expectedSpeaker, target.expectedSpeaker);
  assert.equal(call.transcriptPath, target.transcriptPath);
  assert.equal(result.status, "completed");
  assert.equal(result.attemptCount, 1);
  assert.equal(result.retryCount, 0);
  assert.equal(result.transcriptSha256, target.transcriptSha256);
  assert.equal(move.status, "unresolved");
  assert.equal(move.resolvedSpeaker, null);
  for (const key of [
    "fullClipExcerptRecall", "expectedSpeakerExcerptRecall", "highestOtherSpeaker",
    "highestOtherSpeakerExcerptRecall", "expectedSpeakerRecallMargin", "expectedSpeakerDurationSeconds"
  ]) assert.equal(move.deterministicEvidence[key], target[key], `${target.moveId}: ${key}`);
  assert.deepEqual(move.deterministicEvidence.checks, target.checks);
  const failedChecks = Object.entries(target.checks).filter(([, passed]) => !passed).map(([key]) => key);
  unresolved.push({
    debateNumber: target.debateNumber,
    debateId: target.debateId,
    moveId: target.moveId,
    expectedSpeaker: target.expectedSpeaker,
    transcript: { path: target.transcriptPath, sha256: target.transcriptSha256 },
    executionCompleted: true,
    attemptCount: 1,
    retryCount: 0,
    statusPreserved: "unresolved",
    resolvedSpeakerPreserved: null,
    deterministicEvidence: {
      ...target,
      debateNumber: undefined,
      debateId: undefined,
      moveId: undefined,
      expectedSpeaker: undefined,
      transcriptPath: undefined,
      transcriptSha256: undefined,
      failedChecks,
      expectedSpeakerExcerptRecallShortfall: Number((0.8 - target.expectedSpeakerExcerptRecall).toFixed(15)),
      expectedSpeakerRecallMarginShortfall: target.checks.expectedSpeakerRecallDistinct
        ? 0 : Number((0.15 - target.expectedSpeakerRecallMargin).toFixed(15))
    },
    classification: failedChecks.length === 1
      ? "expected-speaker-excerpt-recall-below-frozen-threshold"
      : "expected-speaker-excerpt-recall-and-distinctness-margin-below-frozen-threshold"
  });
}
assert.deepEqual(
  audit.debates.flatMap((debate) => debate.moves).filter((move) => move.status === "unresolved").map((move) => move.moveId),
  expected.map((item) => item.moveId)
);
const exactIntegerUnits = execution.usage.inputTokens * 25 + execution.usage.outputTokens * 100;
const exactCostUsd = exactIntegerUnits / 10_000_000;
assert.equal(exactIntegerUnits, 1757550);
assert.equal(exactCostUsd, 0.175755);
assert.equal(execution.usageDerivedEstimatedCostUsd, exactCostUsd);
assert.equal(Number(cost.costControl.usageDerivedEstimatedCostUsd.toFixed(7)), exactCostUsd);
assert.equal(cost.costControl.approvedCapExceeded, false);

const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-audio-verification-failure-diagnosis",
  protocolId: request.protocolId,
  status: "frozen-four-batch-05-audio-unresolved-diagnosed",
  diagnosedAt,
  checkpointCommit: "f330f49e1c1399f76a6846e3ac3f908abba6144f",
  productionCanary: false,
  batchNumber: 5,
  stagingOnly: true,
  userAuthorization: {
    instruction: "I approve/authorize the next step, interpreted as the quoted deterministic diagnosis and first bounded recovery scope in the preceding assistant message.",
    directIncrementalCostUsdMaximum: 0,
    deterministicDiagnosisAuthorized: true,
    firstBoundedRecoveryAfterPassingDiagnosisAuthorized: true,
    audioAccessAuthorized: false,
    modelOrApiCallsAuthorized: false,
    paidServiceAuthorized: false,
    transcriptOrThresholdMutationAuthorized: false,
    sourceJudgmentOrScoreMutationAuthorized: false
  },
  evidenceBoundary: {
    records: Object.fromEntries(Object.entries(evidence).map(([role, [file, digest]]) => [role, { path: file, sha256: digest }])),
    validators: Object.fromEntries(Object.entries(validators).map(([role, [file, digest]]) => [role, { path: file, sha256: digest }])),
    transcripts: expected.map((item) => ({ debateNumber: item.debateNumber, moveId: item.moveId, path: item.transcriptPath, sha256: item.transcriptSha256 })),
    transcriptHashesVerified: 4,
    transcriptTextIncludedInDiagnosis: false,
    transcriptTextSemanticallyEvaluated: false,
    audioFilesAccessed: 0,
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0,
    modelOrApiCalls: 0,
    paidServiceCalls: 0
  },
  executionRecord: {
    status: execution.status,
    callsPlanned: 6,
    callsAttempted: 6,
    callsCompleted: 6,
    callsSkipped: 0,
    retries: 0,
    correctionCalls: 0,
    requestFailure: false,
    costCapReachedOrExceeded: false,
    usage: execution.usage,
    usageDerivedEstimatedCostUsd: execution.usageDerivedEstimatedCostUsd,
    maximumAuthorizedCostUsd: 1
  },
  attributionDiagnosis: {
    classification: "four-completed-calls-failed-unchanged-deterministic-attribution-thresholds",
    requiredMoves: 6,
    verifiedMoves: 2,
    unresolvedMoves: 4,
    frozenThresholds: thresholds,
    unresolved,
    allFullClipExcerptChecksPassed: true,
    allExpectedSpeakerDurationChecksPassed: true,
    expectedSpeakerExcerptRecallFailures: 4,
    expectedSpeakerRecallDistinctnessFailures: 2,
    transcriptOrSpeakerSemanticAccuracyDetermined: false,
    providerCauseDetermined: false,
    correctionApproachDetermined: false,
    scopeConclusion: "The preserved records identify the exact failed threshold checks but do not establish semantic speaker accuracy or authorize changing transcripts, labels, thresholds, or accepted results."
  },
  costControlDiagnosis: {
    classification: "mathematically-equivalent-binary-floating-serialization-no-cap-failure",
    exactIntegerUnits,
    exactCostUsd,
    preservedSerializedAggregateUsd: cost.costControl.usageDerivedEstimatedCostUsd,
    normalizedSevenDecimalUsd: Number(cost.costControl.usageDerivedEstimatedCostUsd.toFixed(7)),
    approvedMaximumCostUsd: 1,
    approvedCapExceeded: false,
    correctionRequired: false
  },
  sourceHashes: {
    [toolPath]: sha256(await readFile(toolPath)),
    "docs/assessment-production/post-canary-continuation-v1/batch-05/standing-authorization.json": sha256(await readFile("docs/assessment-production/post-canary-continuation-v1/batch-05/standing-authorization.json")),
    ...Object.fromEntries(Object.values(evidence).map(([file, digest]) => [file, digest])),
    ...Object.fromEntries(Object.values(validators).map(([file, digest]) => [file, digest]))
  },
  workflowDisposition: {
    diagnosisPassed: true,
    audioResultChanged: false,
    downstreamWorkflowBlocked: true,
    firstBoundedDeterministicRecoveryMayBePreparedUnderUserAuthorization: true,
    nextAuthorizedAction: "prepare-hash-lock-validate-and-push-one-transient-reference-overlay-recovery-plan-for-the-four-unresolved-results"
  },
  directIncrementalCostUsd: 0
};
const diagnosisBytes = Buffer.from(`${JSON.stringify(diagnosis, null, 2)}\n`);
if (write) await writeFile(outputPath, diagnosisBytes);
if (validate) assert.equal(sha256(await readFile(outputPath)), sha256(diagnosisBytes), "frozen diagnosis changed");
console.log(JSON.stringify({
  status: diagnosis.status,
  wrote: write,
  validated: validate,
  unresolved: 4,
  failedExpectedSpeakerRecallChecks: 4,
  failedDistinctnessChecks: 2,
  transcriptHashesVerified: 4,
  audioAccesses: 0,
  modelOrApiCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  sha256: sha256(diagnosisBytes),
  nextAuthorizedAction: diagnosis.workflowDisposition.nextAuthorizedAction
}, null, 2));
