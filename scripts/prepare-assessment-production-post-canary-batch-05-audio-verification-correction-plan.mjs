#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const stageRoot = "docs/assessment-production/post-canary-continuation-v1/batch-05/audio-verification";
const outputPath = `${stageRoot}/correction-plan.json`;
const toolPath = "scripts/prepare-assessment-production-post-canary-batch-05-audio-verification-correction-plan.mjs";
const write = process.argv.includes("--write");
const validate = process.argv.includes("--validate");
const preparedIndex = process.argv.indexOf("--prepared-at");
const preparedAt = preparedIndex >= 0 ? process.argv[preparedIndex + 1] : null;
assert(preparedAt && !Number.isNaN(Date.parse(preparedAt)), "--prepared-at requires an ISO timestamp");

const sources = {
  request: [`${stageRoot}/execution-manifest.json`, "58df5bc0ec550e84e41ff1835d033a16a86400c961c4e1dbbff8ea8131deb444"],
  execution: [`${stageRoot}/model-execution.json`, "d0df7c12abd9a9da63b0c89dee33a5567a55283985ac2fb0b50f2148150c480e"],
  audit: [`${stageRoot}/audio-verification.json`, "5dc1acd3e56e91c9fe7bc9ce02daf8bdeffd0bdd2d5367e07babd7239d5ae26f"],
  analysis: [`${stageRoot}/analysis.json`, "378c3da31625fca292cb9bc105a9309f251c9005405a8a657d0712078f254eff"],
  cost: [`${stageRoot}/cost-control-analysis.json`, "50f3fff123cff0c765949e724392438a039aa27f4f919e78fa96d24dcc478d82"],
  diagnosis: [`${stageRoot}/failure-diagnosis.json`, "bdc8a8a5057df5aaec9f90dc2cb7148c2f373c9def43af162bbc3b2bae581d51"],
  attributionValidator: ["scripts/lib/v416-audio-verification.mjs", "9f7c2a6dc40b33de092503350994b3198588c5e9b7aaf9d547365e81ceb138d7"],
  routeDiscovery: ["docs/assessment-production/post-canary-continuation-v1/batch-05/disagreement-extraction/audio-source-transport-recovery-3/route-discovery.json", "8e3b0b79488e0fc9b9284a19cbf86d17b663f81ac69dcf3012d9384f623aab53"],
  audioRecoveryPlan: ["docs/assessment-production/post-canary-continuation-v1/batch-05/disagreement-extraction/audio-source-transport-recovery-3/correction-plan.json", "f0b80fc8e5106128cde4920204c2480eb54ac0bed467a77c1c5af3910b16b2f9"],
  audioRecoveryExecution: ["docs/assessment-production/post-canary-continuation-v1/batch-05/disagreement-extraction/audio-source-transport-recovery-3/execution.json", "016f5a3afc97a732cee9e07c6fde94551b30b4aa7c56467fd40039976fe69656"],
  audioSourcePreparation: ["docs/assessment-production/post-canary-continuation-v1/batch-05/disagreement-extraction/audio-source-preparation.json", "290a0904aa23717116138d35245204a81a66ae7cccec0809feb30f884bff3e7a"]
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const lexicalTokensWithPositions = (value) => {
  const normalized = String(value ?? "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return [...normalized.matchAll(/[a-z0-9]+(?:'[a-z0-9]+)?/g)].map((match) => ({
    token: match[0], start: match.index, end: match.index + match[0].length
  }));
};
const lexicalTokens = (value) => lexicalTokensWithPositions(value).map((item) => item.token);
const bagRecall = (reference, candidate) => {
  const counts = new Map();
  for (const token of candidate) counts.set(token, (counts.get(token) ?? 0) + 1);
  let matched = 0;
  for (const token of reference) {
    const available = counts.get(token) ?? 0;
    if (available > 0) {
      matched += 1;
      counts.set(token, available - 1);
    }
  }
  return matched / reference.length;
};
const select = (call, transcript) => {
  const sourceTokens = lexicalTokensWithPositions(call.verificationExcerpt);
  const candidates = [];
  for (const [segmentIndex, segment] of transcript.segments.entries()) {
    if (segment.speaker !== call.expectedSpeaker) continue;
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
              sourceTokens[sourceStart + length - 1].end
            )
          });
        }
      }
    }
  }
  candidates.sort((left, right) =>
    right.length - left.length || left.sourceStart - right.sourceStart || left.segmentIndex - right.segmentIndex
  );
  assert(candidates.length > 0, `${call.moveId}: no source-exact expected-speaker sequence`);
  return candidates[0];
};

for (const [role, [file, digest]] of Object.entries(sources)) {
  assert.equal(sha256(await readFile(file)), digest, `${role}: source changed`);
}
const [request, execution, audit, analysis, diagnosis, routeDiscovery, audioSourcePreparation] = await Promise.all([
  readJson(sources.request[0]),
  readJson(sources.execution[0]),
  readJson(sources.audit[0]),
  readJson(sources.analysis[0]),
  readJson(sources.diagnosis[0]),
  readJson(sources.routeDiscovery[0]),
  readJson(sources.audioSourcePreparation[0])
]);
assert.equal(diagnosis.status, "frozen-four-batch-05-audio-unresolved-diagnosed");
assert.equal(diagnosis.attributionDiagnosis.unresolvedMoves, 4);
assert.equal(audit.totals.verified, 2);
assert.equal(audit.totals.unresolved, 4);
assert.equal(analysis.gate.passed, false);
assert.equal(execution.callsCompleted, 6);
assert.equal(execution.retries, 0);

const unresolvedKeys = new Set(
  audit.debates.flatMap((debate) => debate.moves)
    .filter((move) => move.status === "unresolved")
    .map((move) => `${move.debateNumber}:${move.moveId}`)
);
const transcriptLocks = [];
for (const [callIndex, call] of request.calls.entries()) {
  const result = execution.results.find((item) => item.debateNumber === call.debateNumber && item.moveId === call.moveId);
  assert.equal(result.status, "completed");
  assert.equal(sha256(await readFile(call.transcriptPath)), result.transcriptSha256, `${call.moveId}: transcript changed`);
  transcriptLocks.push({
    callIndex,
    debateNumber: call.debateNumber,
    debateId: call.debateId,
    moveId: call.moveId,
    path: call.transcriptPath,
    sha256: result.transcriptSha256
  });
}

const candidates = [];
for (const [callIndex, call] of request.calls.entries()) {
  if (!unresolvedKeys.has(`${call.debateNumber}:${call.moveId}`)) continue;
  const transcript = await readJson(call.transcriptPath);
  const selected = select(call, transcript);
  const replacementTokens = lexicalTokens(selected.replacementValue);
  const bySpeaker = new Map();
  for (const segment of transcript.segments) {
    const tokens = bySpeaker.get(segment.speaker) ?? [];
    tokens.push(...lexicalTokens(segment.text));
    bySpeaker.set(segment.speaker, tokens);
  }
  const speakerRecall = [...bySpeaker.entries()]
    .map(([speaker, tokens]) => ({ speaker, recall: bagRecall(replacementTokens, tokens) }))
    .sort((left, right) => right.recall - left.recall || left.speaker.localeCompare(right.speaker));
  const expectedRecall = speakerRecall.find((item) => item.speaker === call.expectedSpeaker)?.recall ?? 0;
  const highestOther = speakerRecall.find((item) => item.speaker !== call.expectedSpeaker);
  const recallMargin = expectedRecall - highestOther.recall;
  const passesFrozenRecallChecks = expectedRecall >= 0.8 && recallMargin >= 0.15;
  const originalValueSha256 = sha256(call.verificationExcerpt);
  const replacementValueSha256 = sha256(selected.replacementValue);
  const delta = {
    targetDebateNumber: call.debateNumber,
    targetMoveId: call.moveId,
    field: "verificationExcerpt",
    originalValueSha256,
    replacementValueSha256,
    operation: "replace-only-transient-verification-reference"
  };
  candidates.push({
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
    deterministicSelectionRule: "longest contiguous lexical sequence, capped at 18 tokens, shared by the frozen source reference and one preserved segment labeled as the expected speaker; ties use earliest source position then earliest segment index",
    replacementSupport: {
      transcriptPath: call.transcriptPath,
      transcriptSha256: transcriptLocks[callIndex].sha256,
      segmentIndex: selected.segmentIndex,
      segmentId: selected.segmentId,
      preservedSpeakerLabel: call.expectedSpeaker,
      start: selected.segmentStart,
      end: selected.segmentEnd
    },
    nonauthoritativePlanningProjection: {
      expectedSpeakerExcerptRecall: expectedRecall,
      highestOtherSpeaker: highestOther.speaker,
      highestOtherSpeakerExcerptRecall: highestOther.recall,
      expectedSpeakerRecallMargin: recallMargin,
      frozenRecallChecksSatisfiedNumerically: passesFrozenRecallChecks,
      semanticSpeakerIdentityProved: false
    },
    activationEligible: passesFrozenRecallChecks,
    deltaSha256: sha256(JSON.stringify(delta)),
    originalRequestWrite: false,
    originalTranscriptWrite: false,
    validatorWrite: false,
    thresholdWrite: false,
    correctionExecutedThisStage: false
  });
}
assert.equal(candidates.length, 4);
assert.equal(candidates.filter((item) => item.activationEligible).length, 3);
const blocked = candidates.filter((item) => !item.activationEligible);
assert.deepEqual(blocked.map((item) => `${item.targetDebateNumber}:${item.targetMoveId}`), [
  "189:con-simple-laws-beneath-cell-complexity"
]);
assert.equal(blocked[0].replacementLexicalTokenCount, 2);
assert.equal(blocked[0].nonauthoritativePlanningProjection.expectedSpeakerExcerptRecall, 1);
assert.equal(blocked[0].nonauthoritativePlanningProjection.highestOtherSpeaker, "A");
assert.equal(blocked[0].nonauthoritativePlanningProjection.highestOtherSpeakerExcerptRecall, 1);
assert.equal(blocked[0].nonauthoritativePlanningProjection.expectedSpeakerRecallMargin, 0);

const debate189Source = audioSourcePreparation.sources.find((item) => item.debateNumber === "189");
assert.equal(routeDiscovery.youtubeMetadata.durationSeconds, 4816);
assert.equal(routeDiscovery.officialBroadcasterRoute.statedDuration, "01:48:00");
assert.equal(debate189Source.durationSeconds, 6480.64);
assert.equal(routeDiscovery.sourceEquivalence.clipWindowsRemainCanonicalYoutubeMilliseconds, true);
assert.equal(routeDiscovery.sourceEquivalence.audioDeliveryProviderChanged, true);

const plan = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-audio-verification-correction-plan",
  protocolId: request.protocolId,
  status: "blocked-before-activation-three-reference-overlays-viable-debate-189-reference-not-distinct",
  preparedAt,
  checkpointCommit: "32a884f0a6cdab73229c9ec98de0291a8532e46d",
  productionCanary: false,
  batchNumber: 5,
  stagingOnly: true,
  userAuthorization: {
    instruction: "I approve/authorize the next step, interpreted as deterministic diagnosis and automatic first bounded recovery only if every gate passes.",
    directIncrementalCostUsdMaximum: 0,
    planPreparationAuthorized: true,
    correctionExecutionAuthorizedOnlyIfCompleteFourMovePlanPasses: true,
    audioAccessAuthorized: false,
    modelOrApiCallsAuthorized: false,
    paidServiceAuthorized: false,
    sourceSpeakerTranscriptThresholdJudgmentOrScoreMutationAuthorized: false
  },
  sourceRecords: Object.fromEntries(Object.entries(sources).map(([role, [file, digest]]) => [role, { path: file, sha256: digest }])),
  transcriptLocks,
  proposedReferenceOverlays: candidates,
  preflight: {
    unresolvedTargets: 4,
    activationEligibleOverlays: 3,
    blockedOverlays: 1,
    allTargetsCoveredByPassingPlan: false,
    blockedTarget: {
      debateNumber: blocked[0].targetDebateNumber,
      moveId: blocked[0].targetMoveId,
      expectedSpeaker: blocked[0].expectedSpeaker,
      deterministicReason: "longest-source-exact-expected-speaker-sequence-is-two-tokens-and-has-zero-recall-margin-against-anonymous-speaker-A",
      transcriptSpeakerLabelsObserved: ["Lee Cronin", "A", "James Tour", "B"],
      anonymousSpeakerRelabelingAuthorized: false,
      semanticSpeakerIdentityProved: false
    },
    sourceTimelineRisk: {
      canonicalYoutubeDurationSeconds: 4816,
      alternateOfficialSourceDurationSeconds: 6480.64,
      durationDifferenceSeconds: 1664.64,
      deliveryProviderChanged: true,
      canonicalYoutubeClipMillisecondsAppliedWithoutReanchoring: true,
      alternateTimelineEquivalenceAuthenticated: false,
      classification: "alternate-delivery-timeline-equivalence-not-authenticated"
    },
    correctionExecutionWouldBeKnownIncomplete: true,
    activationPrepared: false,
    correctionExecuted: false,
    cohortReplayExecuted: false
  },
  controls: {
    transcriptsPreservedByteIdentically: true,
    originalRequestPreserved: true,
    sourceEvidencePreserved: true,
    validatorPreserved: true,
    thresholdsPreserved: true,
    acceptedResultsPreserved: true,
    audioFilesAccessed: 0,
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0,
    modelOrApiCalls: 0,
    paidServiceCalls: 0,
    retries: 0,
    reruns: 0,
    directIncrementalCostUsd: 0
  },
  sourceHashes: {
    [toolPath]: sha256(await readFile(toolPath)),
    ...Object.fromEntries(Object.values(sources).map(([file, digest]) => [file, digest])),
    ...Object.fromEntries(transcriptLocks.map((item) => [item.path, item.sha256]))
  },
  workflowDisposition: {
    activationBlocked: true,
    existingStandingAuthorizationCannotResolveBlockedSourceIdentityAndTimelineRisk: true,
    newUserApprovalRequired: true,
    nextAction: "obtain-approval-before-any-debate-189-source-timeline-or-speaker-identity-recovery"
  }
};
const planBytes = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
if (write) await writeFile(outputPath, planBytes);
if (validate) assert.equal(sha256(await readFile(outputPath)), sha256(planBytes), "correction plan changed");
console.log(JSON.stringify({
  status: plan.status,
  wrote: write,
  validated: validate,
  targets: 4,
  activationEligibleOverlays: 3,
  blockedOverlays: 1,
  blockedTarget: "189:con-simple-laws-beneath-cell-complexity",
  activationPrepared: false,
  correctionExecuted: false,
  audioFilesAccessed: 0,
  modelOrApiCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  sha256: sha256(planBytes),
  nextAction: plan.workflowDisposition.nextAction
}, null, 2));
