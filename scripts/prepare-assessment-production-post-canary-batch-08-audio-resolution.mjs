#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";

const root = "docs/assessment-production/post-canary-continuation-v1/batch-08/audio-verification";
const outputPath = `${root}/resolution-plan.json`;
const toolPath = "scripts/prepare-assessment-production-post-canary-batch-08-audio-resolution.mjs";
const testPath = "scripts/test-assessment-production-post-canary-batch-08-audio-resolution.mjs";
const shouldWrite = process.argv.includes("--write");
const shouldValidate = process.argv.includes("--validate");
const preparedAtIndex = process.argv.indexOf("--prepared-at");
const preparedAt = preparedAtIndex >= 0 ? process.argv[preparedAtIndex + 1] : null;
assert(preparedAt && !Number.isNaN(Date.parse(preparedAt)), "--prepared-at requires an ISO timestamp");

const sourceLocks = Object.freeze({
  "docs/assessment-production/post-canary-continuation-v1/batch-08/continuation-standing-authorization.json": "2313fd2241e5245afab793f93f4c9f7c8a525c5fb614e122ba20904c31bf8d8b",
  [`${root}/execution-manifest.json`]: "bb5fa2011040e23f8d74a854b6a7c8b8331cd86c525ad2cf1a988b1a5889c809",
  [`${root}/model-execution.json`]: "7fef5148923c874872e9521223c9d32cdca34caa70ac23ed996771ddde36d0b0",
  [`${root}/audio-verification.json`]: "4bc49aa75667f52d1c1bd70a478bd874f973362604c2e7c0e4f2dda97b245219",
  [`${root}/analysis.json`]: "8b16fe73e5bd366812f6414affccd03726d0b503eb71caa3ae3a29179e888962",
  [`${root}/cost-control-analysis.json`]: "6e198b7eda4331f292f798d1e034472c5c5f838b09ea4bd9af7c1913757c93a3",
  [`${root}/failure-diagnosis.json`]: "94929a6c979dab21e8e8c421916e1fac572837eecc2220f0c27f576e0be87411",
  [`${root}/validation-recovery-2/validation-overlay.json`]: "daa54f60d57bac575423cc594973db0c43726abac7bcf821aa1c80ffc944cbf1",
  [`${root}/validation-recovery-2/execution.json`]: "c3d83ce3c0545da1445c7cfc434b36a8f3b35bfc967e0e028e54754109f53ac9",
  [`${root}/validation-recovery-2/analysis.json`]: "4c3aa4045ccfd6500890814ace424ba987187ccad2b3aa2e19f78559c94707f0",
  "scripts/lib/v416-audio-verification.mjs": "9f7c2a6dc40b33de092503350994b3198588c5e9b7aaf9d547365e81ceb138d7",
});

const thresholds = Object.freeze({
  minimumFullClipExcerptRecall: 0.8,
  minimumExpectedSpeakerExcerptRecall: 0.8,
  minimumExpectedSpeakerRecallMargin: 0.15,
  minimumExpectedSpeakerDurationSeconds: 5,
});
const unresolvedKeys = new Set([
  "156:con-conscious-capacity-grounds-moral-distinctions",
  "156:con-conception-dogma-obstructs-abortion-inquiry",
  "156:pro-scripture-character-historical-progress",
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const exists = (file) => access(file).then(() => true, () => false);
const lexicalTokensWithPositions = (value) => {
  const normalized = String(value ?? "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return [...normalized.matchAll(/[a-z0-9]+(?:'[a-z0-9]+)?/g)].map((match) => ({
    token: match[0], start: match.index, end: match.index + match[0].length,
  }));
};
const lexicalTokens = (value) => lexicalTokensWithPositions(value).map((item) => item.token);
const bagRecall = (referenceTokens, candidateTokens) => {
  const counts = new Map();
  for (const token of candidateTokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  let matched = 0;
  for (const token of referenceTokens) {
    const available = counts.get(token) ?? 0;
    if (available <= 0) continue;
    matched += 1;
    counts.set(token, available - 1);
  }
  return matched / referenceTokens.length;
};
const selectLongestExpectedSpeakerSequence = (call, transcript) => {
  const sourceTokens = lexicalTokensWithPositions(call.verificationExcerpt);
  const candidates = [];
  for (const [segmentIndex, segment] of transcript.segments.entries()) {
    if (segment.speaker !== call.expectedSpeaker || !String(segment.text ?? "").trim()) continue;
    const segmentTokens = lexicalTokens(segment.text);
    for (let length = 1; length <= Math.min(18, sourceTokens.length, segmentTokens.length); length += 1) {
      for (let sourceStart = 0; sourceStart + length <= sourceTokens.length; sourceStart += 1) {
        for (let segmentStart = 0; segmentStart + length <= segmentTokens.length; segmentStart += 1) {
          if (!sourceTokens.slice(sourceStart, sourceStart + length)
            .every((item, index) => item.token === segmentTokens[segmentStart + index])) continue;
          candidates.push({
            length,
            sourceStart,
            segmentIndex,
            segmentId: segment.id,
            segmentStart: segment.start,
            segmentEnd: segment.end,
            replacementValue: call.verificationExcerpt.slice(
              sourceTokens[sourceStart].start,
              sourceTokens[sourceStart + length - 1].end,
            ),
          });
        }
      }
    }
  }
  candidates.sort((left, right) =>
    right.length - left.length || left.sourceStart - right.sourceStart || left.segmentIndex - right.segmentIndex);
  assert(candidates.length > 0, `${call.moveId}: no source-exact expected-speaker sequence`);
  return candidates[0];
};

for (const [file, digest] of Object.entries(sourceLocks)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: frozen source changed`);
}
const [authorization, request, execution, audit, analysis, cost, diagnosis, structuralOverlay, structuralExecution] = await Promise.all([
  readJson("docs/assessment-production/post-canary-continuation-v1/batch-08/continuation-standing-authorization.json"),
  readJson(`${root}/execution-manifest.json`),
  readJson(`${root}/model-execution.json`),
  readJson(`${root}/audio-verification.json`),
  readJson(`${root}/analysis.json`),
  readJson(`${root}/cost-control-analysis.json`),
  readJson(`${root}/failure-diagnosis.json`),
  readJson(`${root}/validation-recovery-2/validation-overlay.json`),
  readJson(`${root}/validation-recovery-2/execution.json`),
]);
assert.equal(authorization.status, "frozen-active-batch-08-continuation-and-failure-recovery-standing-authorization");
assert.equal(diagnosis.attributionDiagnosis.unresolvedMoves, 3);
assert.equal(execution.callsCompleted, 6);
assert.equal(execution.retries, 0);
assert.equal(audit.totals.verified, 3);
assert.equal(audit.totals.unresolved, 3);
assert.equal(analysis.gate.passed, false);
assert.deepEqual(request.thresholds, thresholds);
assert.equal(structuralExecution.cohortReplayPassed, true);
assert.equal(structuralExecution.transcriptFilesChanged, false);
assert.deepEqual(structuralOverlay.target.segments.map((item) => item.segmentIndex), [33, 52]);
assert.equal(cost.costControl.usageDerivedEstimatedCostUsd, 0.156225);
assert.equal(cost.costControl.approvedCapExceeded, false);

const transcriptLocks = [];
const overlays = [];
for (const [callIndex, call] of request.calls.entries()) {
  const result = execution.results.find((item) => item.debateNumber === call.debateNumber && item.moveId === call.moveId);
  assert(result, `${call.moveId}: execution result missing`);
  assert.equal(result.status, "completed");
  assert.equal(result.attemptCount, 1);
  assert.equal(result.retryCount, 0);
  const transcriptBytes = await readFile(call.transcriptPath);
  assert.equal(sha256(transcriptBytes), result.transcriptSha256, `${call.moveId}: transcript changed`);
  transcriptLocks.push({
    callIndex,
    debateNumber: call.debateNumber,
    debateId: call.debateId,
    moveId: call.moveId,
    path: call.transcriptPath,
    sha256: result.transcriptSha256,
  });
  if (!unresolvedKeys.has(`${call.debateNumber}:${call.moveId}`)) continue;

  const transcript = JSON.parse(transcriptBytes);
  const selected = selectLongestExpectedSpeakerSequence(call, transcript);
  const replacementTokens = lexicalTokens(selected.replacementValue);
  const bySpeaker = new Map();
  for (const segment of transcript.segments) {
    const tokens = bySpeaker.get(segment.speaker) ?? [];
    tokens.push(...lexicalTokens(segment.text));
    bySpeaker.set(segment.speaker, tokens);
  }
  const recalls = [...bySpeaker.entries()].map(([speaker, tokens]) => ({
    speaker,
    recall: bagRecall(replacementTokens, tokens),
  })).sort((left, right) => right.recall - left.recall || left.speaker.localeCompare(right.speaker));
  const expectedRecall = recalls.find((item) => item.speaker === call.expectedSpeaker)?.recall ?? 0;
  const highestOther = recalls.find((item) => item.speaker !== call.expectedSpeaker) ?? { speaker: null, recall: 0 };
  const recallMargin = expectedRecall - highestOther.recall;
  assert(expectedRecall >= thresholds.minimumExpectedSpeakerExcerptRecall, `${call.moveId}: projected recall fails`);
  assert(recallMargin >= thresholds.minimumExpectedSpeakerRecallMargin, `${call.moveId}: projected margin fails`);
  const originalValueSha256 = sha256(call.verificationExcerpt);
  const replacementValueSha256 = sha256(selected.replacementValue);
  const delta = {
    targetDebateNumber: call.debateNumber,
    targetMoveId: call.moveId,
    field: "verificationExcerpt",
    originalValueSha256,
    replacementValueSha256,
    operation: "replace-only-transient-verification-reference",
  };
  overlays.push({
    operation: "replace-only-transient-verification-reference",
    targetCallIndex: callIndex,
    targetDebateNumber: call.debateNumber,
    targetDebateId: call.debateId,
    targetMoveId: call.moveId,
    field: "verificationExcerpt",
    expectedSpeaker: call.expectedSpeaker,
    originalValueSha256,
    originalLexicalTokenCount: lexicalTokens(call.verificationExcerpt).length,
    replacementValue: selected.replacementValue,
    replacementValueSha256,
    replacementLexicalTokenCount: selected.length,
    replacementStartCharacter: call.verificationExcerpt.indexOf(selected.replacementValue),
    replacementIsExactSubstringOfOriginal: call.verificationExcerpt.includes(selected.replacementValue),
    deterministicSelectionRule: "longest contiguous lexical sequence, capped at 18 tokens, shared by the frozen canonical verification reference and one preserved transcript segment labeled as the expected speaker; ties use earliest source position then earliest segment index",
    replacementSupport: {
      transcriptPath: call.transcriptPath,
      transcriptSha256: result.transcriptSha256,
      segmentIndex: selected.segmentIndex,
      segmentId: selected.segmentId,
      preservedSpeakerLabel: call.expectedSpeaker,
      start: selected.segmentStart,
      end: selected.segmentEnd,
    },
    nonauthoritativePlanningProjection: {
      expectedSpeakerExcerptRecall: expectedRecall,
      highestOtherSpeaker: highestOther.speaker,
      highestOtherSpeakerExcerptRecall: highestOther.recall,
      expectedSpeakerRecallMargin: recallMargin,
      frozenRecallChecksSatisfiedNumerically: true,
      semanticSpeakerIdentityProved: false,
    },
    deltaSha256: sha256(JSON.stringify(delta)),
    originalRequestWrite: false,
    originalTranscriptWrite: false,
    referenceAudioWrite: false,
    validatorWrite: false,
    thresholdWrite: false,
    correctionExecutedThisStage: false,
  });
}
assert.equal(transcriptLocks.length, 6);
assert.equal(overlays.length, 3);
assert.deepEqual(overlays.map((item) => `${item.targetDebateNumber}:${item.targetMoveId}`), [...unresolvedKeys]);

const deltaInventory = overlays.map((item) => ({
  targetDebateNumber: item.targetDebateNumber,
  targetMoveId: item.targetMoveId,
  field: item.field,
  originalValueSha256: item.originalValueSha256,
  replacementValueSha256: item.replacementValueSha256,
  operation: item.operation,
  deltaSha256: item.deltaSha256,
}));

const plan = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-08-audio-resolution-plan",
  protocolId: request.protocolId,
  status: "frozen-three-debate-156-transient-verification-reference-overlays-prepared-not-executed",
  preparedAt,
  checkpointCommit: "3ab62925d5ef94149fe3069227a4783a52731f7f",
  productionCanary: false,
  batchNumber: 8,
  stagingOnly: true,
  continuationAuthorization: {
    path: "docs/assessment-production/post-canary-continuation-v1/batch-08/continuation-standing-authorization.json",
    sha256: sourceLocks["docs/assessment-production/post-canary-continuation-v1/batch-08/continuation-standing-authorization.json"],
  },
  diagnosedScope: {
    preservedVerifiedMoves: 3,
    preservedUnresolvedMoves: 3,
    unresolvedMoveIds: overlays.map((item) => item.targetMoveId),
    diagnosisPath: `${root}/failure-diagnosis.json`,
    diagnosisSha256: sourceLocks[`${root}/failure-diagnosis.json`],
    soleFailedCheck: "expectedSpeakerExcerptRecovered",
  },
  sourceLocks,
  transcriptLocks,
  proposedReferenceOverlays: overlays,
  referenceDeltaInventorySha256: sha256(JSON.stringify(deltaInventory)),
  preservedStructuralValidationOverlay: {
    path: `${root}/validation-recovery-2/validation-overlay.json`,
    sha256: sourceLocks[`${root}/validation-recovery-2/validation-overlay.json`],
    targetMoveId: structuralOverlay.target.moveId,
    originalSegmentIndices: structuralOverlay.target.segments.map((item) => item.segmentIndex),
    mustBeAppliedBeforeAttributionValidation: true,
    persistentTranscriptWrite: false,
  },
  planningConclusion: {
    classification: "three-source-exact-expected-speaker-reference-overlays-deterministically-viable",
    activationEligibleOverlays: overlays.length,
    expectedSpeakerRecallProjectedAtOneForEveryOverlay: overlays.every((item) => item.nonauthoritativePlanningProjection.expectedSpeakerExcerptRecall === 1),
    everyProjectedRecallMarginPassesFrozenThreshold: true,
    semanticSpeakerIdentityIndependentlyProved: false,
    providerLabelCorrectnessEstablished: false,
    validatorDefectEstablished: false,
    thresholdDefectEstablished: false,
    acceptedResultChanged: false,
    correctionExecuted: false,
  },
  futureExecutionContract: {
    separateHashLockedActivationRequired: true,
    deterministicCorrectionPassesMaximum: 1,
    completeSixTranscriptCohortReplaysMaximum: 1,
    retriesMaximum: 0,
    rerunsMaximum: 0,
    automaticRepairsMaximum: 0,
    persistentSourceTranscriptReferenceValidatorOrThresholdWritesMaximum: 0,
    exactValidatorPath: "scripts/lib/v416-audio-verification.mjs",
    exactValidatorSha256: sourceLocks["scripts/lib/v416-audio-verification.mjs"],
    exactThresholds: thresholds,
    exactReferenceOverlayInventorySha256: sha256(JSON.stringify(deltaInventory)),
    allSixOriginalTranscriptsMustRemainByteIdentical: true,
    originalRequestExecutionAuditAnalysisCostAndCorrectionRecordsMustRemainByteIdentical: true,
    noAudioAccess: true,
    noModelOrPaidServiceCall: true,
    downstreamWorkOnlyAfterAllSixAttributionsVerify: true,
  },
  preservedPaidExecution: {
    callsAttempted: execution.callsAttempted,
    callsCompleted: execution.callsCompleted,
    retries: execution.retries,
    usageDerivedEstimatedCostUsd: execution.usageDerivedEstimatedCostUsd,
    aggregateAuthorizedMaximumUsd: authorization.costControls.aggregateBatchEightPaidAudioMaximumUsd,
    newPaidCallsThisStage: 0,
  },
  executionBoundary: {
    correctionPlansPrepared: 1,
    correctionPassesExecuted: 0,
    cohortReplaysExecuted: 0,
    audioAccesses: 0,
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0,
    modelOrApiCalls: 0,
    paidServiceCalls: 0,
    transcriptWrites: 0,
    referenceWrites: 0,
    validatorWrites: 0,
    thresholdChanges: 0,
    adjudications: 0,
    scoresDerived: 0,
    directIncrementalCostUsd: 0,
  },
  sourceHashes: {
    [toolPath]: sha256(await readFile(toolPath)),
    [testPath]: sha256(await readFile(testPath)),
  },
  nextAuthorizedAction: "prepare-hash-lock-and-activate-one-batch-08-deterministic-audio-resolution-pass-under-continuation-standing-authorization",
};

const bytes = `${JSON.stringify(plan, null, 2)}\n`;
if (shouldWrite) {
  assert(!(await exists(outputPath)), "resolution plan already exists");
  await writeFile(outputPath, bytes);
}
if (shouldValidate) assert.equal(await readFile(outputPath, "utf8"), bytes, "frozen resolution plan replay changed");
console.log(JSON.stringify({
  status: shouldWrite ? plan.status : shouldValidate ? "passed-frozen-batch-08-audio-resolution-plan" : "passed-batch-08-audio-resolution-preview",
  overlays: overlays.length,
  completeCohortSize: transcriptLocks.length,
  projectedExpectedSpeakerRecall: overlays.map((item) => item.nonauthoritativePlanningProjection.expectedSpeakerExcerptRecall),
  projectedRecallMargins: overlays.map((item) => item.nonauthoritativePlanningProjection.expectedSpeakerRecallMargin),
  modelOrApiCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  sha256: sha256(bytes),
  nextAuthorizedAction: plan.nextAuthorizedAction,
}, null, 2));
