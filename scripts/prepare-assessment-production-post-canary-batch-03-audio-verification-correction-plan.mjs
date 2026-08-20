#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";

const ROOT = process.cwd();
const STAGE_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-03/audio-verification";
const OUTPUT_PATH = `${STAGE_ROOT}/correction-plan.json`;
const TOOL_PATH =
  "scripts/prepare-assessment-production-post-canary-batch-03-audio-verification-correction-plan.mjs";
const TEST_PATH =
  "scripts/test-assessment-production-post-canary-batch-03-audio-verification-correction-plan.mjs";

const SOURCE_LOCKS = Object.freeze({
  "docs/assessment-production/post-canary-continuation-v1/batch-03/standing-authorization.json":
    "7f46c90c1243062e6472f586a1e93db35b43f0b386acc19afb37b23f2adf237b",
  [`${STAGE_ROOT}/execution-preparation-manifest.json`]:
    "bd981bf2ae697e725e827b5222a8dd9c28891972f83bdc2aa649bdcfd9e6c838",
  [`${STAGE_ROOT}/execution-manifest.json`]:
    "8795fdf28daea01ed7a09d73bdd9f97144e57b77acc589a7ee44317aacb0ce08",
  [`${STAGE_ROOT}/model-execution.json`]:
    "dcd4da54457a8423bc7c5981b54dfab65aade52f1ccef10c59f8f1a81863e484",
  [`${STAGE_ROOT}/audio-verification.json`]:
    "c1f4418803d468801b3731361ebff701f2d4c1a8ca4dc374332d14dedbe4a523",
  [`${STAGE_ROOT}/analysis.json`]:
    "f3e185fc66438cb054f2ea2d9005c6460cf5d57cf6167e93a114cc77d41ed989",
  [`${STAGE_ROOT}/cost-control-analysis.json`]:
    "bb6fd4702e3401dd97694e20744d3eaf05de51b691ccd691d9b1a588b888afd8",
  [`${STAGE_ROOT}/failure-diagnosis.json`]:
    "9cb0682a5a730e07fdf2faef605ec89babcb0bae7fd65336826c70266beeed4e",
  "docs/assessment-production/post-canary-continuation-v1/batch-03/disagreement-extraction/audio-work-items.json":
    "c130d5b0410c73a9c4529c7d71b7f6ef99b2ae3c3902b58eb91a699a25089887",
  "docs/assessment-production/post-canary-continuation-v1/batch-03/inventory-candidate-sharded/locked-inventories/debate-124.json":
    "8c9aafa783079a98c65418f598fcd9a71fc9c952e6dd0ac13bc1e76badade657",
  "docs/assessment-production/post-canary-continuation-v1/batch-03/inventory-candidate-sharded/locked-inventories/debate-58.json":
    "b09a6f5565b2d6461b34e99eabecbc7b6257ca5ff670a9f36bf10a3991b351e3",
  "docs/assessment-production/post-canary-continuation-v1/batch-03/inventory-candidate-sharded/locked-inventories/debate-157.json":
    "7b1aae5e948542334547b8e81cef923ebb34920149795d7648771e28c832d413",
  "scripts/lib/v416-audio-verification.mjs":
    "9f7c2a6dc40b33de092503350994b3198588c5e9b7aaf9d547365e81ceb138d7",
  "scripts/analyze-assessment-production-post-canary-batch-03-audio-cost-control.mjs":
    "df86e69a5aebb2de57bdc0ddfc54a1a1f5f1eb03c4411313c1b014e4f2a2bdc1",
  "scripts/test-assessment-production-post-canary-batch-03-audio-verification.mjs":
    "42ca4e0963ce42dac02e84f61309cab63bf30d86a9c82a0608e5aa531b238c47",
  "scripts/diagnose-assessment-production-post-canary-batch-03-audio-verification-failure.mjs":
    "1164fea306596723a5f58922577bac35fdc314a89d9429132135a552eb3bfc18",
  "scripts/test-assessment-production-post-canary-batch-03-audio-verification-failure-diagnosis.mjs":
    "f9e6dec4bd0e0ff865ea5ef48e8ce5d8c0aba01cf9dbb0ee0d8af81652ec595a",
  "docs/assessment-production-workflow.md":
    "41a61ee605bc1dfd4f21a5738c709560a98c9598fe16c2b385d013cdbb43a3ee",
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json":
    "2a018107434edb8a31020e441a2088e2d259596d49bedd8ccc89eaee0880f666",
  "docs/assessment-production/manifest-v1.json":
    "1359a7b39718aaa85f914d27ad743efa50c60370ad0f6aec061423f7cd4f08ec",
});

const TRANSCRIPT_LOCKS = Object.freeze([
  [0, "124", "harris-peterson-god-atheism-bible-2018", "con-heuristics-fail-under-change", "output/transcribe/assessment-production-post-canary-batch-03-audio-verification/debate-124/transcripts/con-heuristics-fail-under-change.transcript.json", "3baf9294c825764051069481143b6d96820c12dd89eac651142e6ab811f97f67"],
  [1, "124", "harris-peterson-god-atheism-bible-2018", "pro-rational-instruction-behavioral-limit", "output/transcribe/assessment-production-post-canary-batch-03-audio-verification/debate-124/transcripts/pro-rational-instruction-behavioral-limit.transcript.json", "2534981c9101fac0f5a8695928bc8167953a037eec173467c0226de8a4a3db3d"],
  [2, "14", "jones-carrier-god-existence-2025", "pro-unconstrained-bubble-causal-gap", "output/transcribe/assessment-production-post-canary-batch-03-audio-verification/debate-14/transcripts/pro-unconstrained-bubble-causal-gap.transcript.json", "c8478207ff6ad484349faa25c24f392bb8b945dcd47f8bb07b12dda259e00425"],
  [3, "58", "dillahunty-slick-secular-humanism-christianity-2016", "pro-logic-presupposition-suffices", "output/transcribe/assessment-production-post-canary-batch-03-audio-verification/debate-58/transcripts/pro-logic-presupposition-suffices.transcript.json", "6aca9be1794e534daf2dc5116ef8441104f2160d9b821b9f22b6c542a40112a5"],
  [4, "150", "licona-dillahunty-resurrection-evidence-2017", "con-event-acceptance-not-causal-verdict", "output/transcribe/assessment-production-post-canary-batch-03-audio-verification/debate-150/transcripts/con-event-acceptance-not-causal-verdict.transcript.json", "5614753b1f06a9b0e1ed7262db5b5fb58c6751cd7e5d46b6056e4acf42d55440"],
  [5, "157", "dillahunty-howitt-christianity-true-2023", "con-reason-incarnation-access-gap", "output/transcribe/assessment-production-post-canary-batch-03-audio-verification/debate-157/transcripts/con-reason-incarnation-access-gap.transcript.json", "abcd04a42e445e4851c828661010a4deaa540a928e83e15502a062ae7eaef85f"],
  [6, "157", "dillahunty-howitt-christianity-true-2023", "pro-divine-doubt-self-knowledge", "output/transcribe/assessment-production-post-canary-batch-03-audio-verification/debate-157/transcripts/pro-divine-doubt-self-knowledge.transcript.json", "57d3ad38234e47cae53ae5f3f7214320ea0864f3c96265e159bc6275bdd1640c"],
  [7, "157", "dillahunty-howitt-christianity-true-2023", "pro-infer-divine-self-knowledge", "output/transcribe/assessment-production-post-canary-batch-03-audio-verification/debate-157/transcripts/pro-infer-divine-self-knowledge.transcript.json", "0f5f1f1540d258505fb76f41f52b3825e59a18d60bd7f35a190892532063d336"],
].map(([callIndex, debateNumber, debateId, moveId, path, sha256]) => ({
  callIndex,
  debateNumber,
  debateId,
  moveId,
  path,
  sha256,
})));

const PROPOSED_REFERENCES = Object.freeze([
  {
    callIndex: 1,
    debateNumber: "124",
    debateId: "harris-peterson-god-atheism-bible-2018",
    moveId: "pro-rational-instruction-behavioral-limit",
    expectedSpeaker: "Jordan Peterson",
    replacementValue:
      "works like those sorts of educational interventions to stop that kind of fundamental",
    replacementValueSha256:
      "65c6c755477d170e4258f39e332eb61220fe8b626dac71b8582a36be1660638d",
    replacementLexicalTokenCount: 13,
    replacementStartCharacter: 208,
    supportSegmentIndex: 31,
    supportSegmentId: "seg_31",
    supportSegmentStart: 15.650000000000002,
    supportSegmentEnd: 21.200000000000003,
    projectedHighestOtherSpeaker: "Sam Harris",
    projectedHighestOtherRecall: 0.15384615384615385,
    deltaSha256:
      "0b8b73a9982368b25c5427f018fa6a0ae9640c25afae233ea5d187d489ff5830",
  },
  {
    callIndex: 3,
    debateNumber: "58",
    debateId: "dillahunty-slick-secular-humanism-christianity-2016",
    moveId: "pro-logic-presupposition-suffices",
    expectedSpeaker: "Matt Dillahunty",
    replacementValue:
      "You can't then say, ah, yours is flawed because you can't give an account for this",
    replacementValueSha256:
      "7d99d63559f22ff52993f2f0b21e0be6c5565a475359722a4bb8bc7431b34aa3",
    replacementLexicalTokenCount: 16,
    replacementStartCharacter: 216,
    supportSegmentIndex: 17,
    supportSegmentId: "seg_17",
    supportSegmentStart: 18.496000000000002,
    supportSegmentEnd: 22.796,
    projectedHighestOtherSpeaker: "Matt Slick",
    projectedHighestOtherRecall: 0.75,
    deltaSha256:
      "1e4a96acc2abbe2229c8899770cc383973d541316a6d2c87ed221a4bbdd4648b",
  },
  {
    callIndex: 5,
    debateNumber: "157",
    debateId: "dillahunty-howitt-christianity-true-2023",
    moveId: "con-reason-incarnation-access-gap",
    expectedSpeaker: "Matt Dillahunty",
    replacementValue:
      "is God because God is his father and is human because his mother was human",
    replacementValueSha256:
      "27df976de99c17047fed24ec00f1c6b645911028da8b297823cd3e863376b17a",
    replacementLexicalTokenCount: 15,
    replacementStartCharacter: 9,
    supportSegmentIndex: 5,
    supportSegmentId: "seg_5",
    supportSegmentStart: 10.370000000000001,
    supportSegmentEnd: 21.42,
    projectedHighestOtherSpeaker: "Lewis Howitt (PerspectivePhilosophy)",
    projectedHighestOtherRecall: 0.6666666666666666,
    deltaSha256:
      "7c978694ebe51f744c5ea6449be07cd4e81d429ff716ae6ca8f523228b212fee",
  },
]);

const EXPECTED = Object.freeze({
  checkpointCommit: "681ee428214d2c413e11d470d85f800ef5004e2e",
  protocolId: "assessment-production-post-canary-batch-03-decomposed-consensus",
  thresholds: {
    minimumFullClipExcerptRecall: 0.8,
    minimumExpectedSpeakerExcerptRecall: 0.8,
    minimumExpectedSpeakerRecallMargin: 0.15,
    minimumExpectedSpeakerDurationSeconds: 5,
  },
  referenceDeltaInventoryDigest:
    "6bcbbc896cf586ca3fc2200da3619551170857a463b1d5c8245b8170f0c645c8",
  costDeltaSha256:
    "49296f458e54c51db80382b7d426db0f13e9d3133c14683744fd5b0aba3adf95",
  completeCorrectionDigest:
    "bcfe5e3bbd1807acb67f6199cb138c3cf637b079c0754ed6efc0974cbcbbba06",
});

function absolute(relativePath) {
  return `${ROOT}/${relativePath}`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256File(relativePath) {
  return sha256(fs.readFileSync(absolute(relativePath)));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, label) {
  assert(
    Object.is(actual, expected),
    `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}

function assertDeepEqual(actual, expected, label) {
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), label);
}

function lexicalTokensWithPositions(value) {
  const normalized = String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  return [...normalized.matchAll(/[a-z0-9]+(?:'[a-z0-9]+)?/g)].map((match) => ({
    token: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function lexicalTokens(value) {
  return lexicalTokensWithPositions(value).map((item) => item.token);
}

function bagRecall(referenceTokens, candidateTokens) {
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
}

function selectLongestSourceExactExpectedSpeakerSequence(call, transcript) {
  const sourceTokens = lexicalTokensWithPositions(call.verificationExcerpt);
  const candidates = [];
  for (const [segmentIndex, segment] of transcript.segments.entries()) {
    if (segment.speaker !== call.expectedSpeaker) continue;
    const segmentTokens = lexicalTokens(segment.text);
    for (let length = 1; length <= Math.min(18, sourceTokens.length, segmentTokens.length); length += 1) {
      for (let sourceStart = 0; sourceStart + length <= sourceTokens.length; sourceStart += 1) {
        for (let segmentStart = 0; segmentStart + length <= segmentTokens.length; segmentStart += 1) {
          const equal = sourceTokens
            .slice(sourceStart, sourceStart + length)
            .every((item, index) => item.token === segmentTokens[segmentStart + index]);
          if (!equal) continue;
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
  candidates.sort(
    (left, right) =>
      right.length - left.length ||
      left.sourceStart - right.sourceStart ||
      left.segmentIndex - right.segmentIndex,
  );
  assert(candidates.length > 0, `${call.moveId}: no source-exact expected-speaker sequence`);
  return candidates[0];
}

function buildPlan() {
  for (const [path, digest] of Object.entries(SOURCE_LOCKS)) {
    assertEqual(sha256File(path), digest, `source hash ${path}`);
  }
  for (const item of TRANSCRIPT_LOCKS) {
    assertEqual(sha256File(item.path), item.sha256, `transcript hash ${item.moveId}`);
  }

  const manifest = readJson(`${STAGE_ROOT}/execution-manifest.json`);
  const execution = readJson(`${STAGE_ROOT}/model-execution.json`);
  const audit = readJson(`${STAGE_ROOT}/audio-verification.json`);
  const analysis = readJson(`${STAGE_ROOT}/analysis.json`);
  const cost = readJson(`${STAGE_ROOT}/cost-control-analysis.json`);
  const diagnosis = readJson(`${STAGE_ROOT}/failure-diagnosis.json`);

  assertEqual(manifest.protocolId, EXPECTED.protocolId, "manifest protocol");
  assertEqual(execution.protocolId, EXPECTED.protocolId, "execution protocol");
  assertEqual(diagnosis.protocolId, EXPECTED.protocolId, "diagnosis protocol");
  assertDeepEqual(manifest.thresholds, EXPECTED.thresholds, "manifest thresholds");
  assertDeepEqual(audit.thresholds, EXPECTED.thresholds, "audit thresholds");
  assertEqual(execution.callsCompleted, 8, "completed calls");
  assertEqual(execution.retries, 0, "execution retries");
  assertEqual(audit.totals.verified, 5, "preserved verified count");
  assertEqual(audit.totals.unresolved, 3, "preserved unresolved count");
  assertEqual(analysis.gate.passed, false, "preserved gate result");
  assertEqual(diagnosis.attributionDiagnosis.unresolvedMoves, 3, "diagnosed unresolved count");

  const proposedReferenceOverlays = PROPOSED_REFERENCES.map((proposal) => {
    const call = manifest.calls[proposal.callIndex];
    assertEqual(call.debateNumber, proposal.debateNumber, `${proposal.moveId} call debate`);
    assertEqual(call.debateId, proposal.debateId, `${proposal.moveId} call debate ID`);
    assertEqual(call.moveId, proposal.moveId, `${proposal.moveId} call move`);
    assertEqual(call.expectedSpeaker, proposal.expectedSpeaker, `${proposal.moveId} speaker`);
    const transcriptLock = TRANSCRIPT_LOCKS[proposal.callIndex];
    assertEqual(transcriptLock.moveId, proposal.moveId, `${proposal.moveId} transcript lock`);
    const transcript = readJson(transcriptLock.path);
    const selected = selectLongestSourceExactExpectedSpeakerSequence(call, transcript);
    assertEqual(selected.replacementValue, proposal.replacementValue, `${proposal.moveId} selected replacement`);
    assertEqual(selected.length, proposal.replacementLexicalTokenCount, `${proposal.moveId} selected length`);
    assertEqual(selected.segmentIndex, proposal.supportSegmentIndex, `${proposal.moveId} segment index`);
    assertEqual(selected.segmentId, proposal.supportSegmentId, `${proposal.moveId} segment ID`);
    assertEqual(selected.segmentStart, proposal.supportSegmentStart, `${proposal.moveId} segment start`);
    assertEqual(selected.segmentEnd, proposal.supportSegmentEnd, `${proposal.moveId} segment end`);
    assertEqual(call.verificationExcerpt.indexOf(proposal.replacementValue), proposal.replacementStartCharacter, `${proposal.moveId} replacement offset`);
    assertEqual(sha256(proposal.replacementValue), proposal.replacementValueSha256, `${proposal.moveId} replacement hash`);

    const originalValueSha256 = sha256(call.verificationExcerpt);
    const delta = {
      targetDebateNumber: proposal.debateNumber,
      targetMoveId: proposal.moveId,
      field: "verificationExcerpt",
      originalValueSha256,
      replacementValueSha256: proposal.replacementValueSha256,
      operation: "replace-only-transient-verification-reference",
    };
    assertEqual(sha256(JSON.stringify(delta)), proposal.deltaSha256, `${proposal.moveId} delta hash`);

    const replacementTokens = lexicalTokens(proposal.replacementValue);
    const bySpeaker = new Map();
    for (const segment of transcript.segments) {
      const tokens = bySpeaker.get(segment.speaker) ?? [];
      tokens.push(...lexicalTokens(segment.text));
      bySpeaker.set(segment.speaker, tokens);
    }
    const speakerRecall = [...bySpeaker.entries()]
      .map(([speaker, tokens]) => ({ speaker, recall: bagRecall(replacementTokens, tokens) }))
      .sort((left, right) => right.recall - left.recall || left.speaker.localeCompare(right.speaker));
    const expectedRecall = speakerRecall.find((item) => item.speaker === proposal.expectedSpeaker)?.recall ?? 0;
    const highestOther = speakerRecall.find((item) => item.speaker !== proposal.expectedSpeaker);
    assertEqual(expectedRecall, 1, `${proposal.moveId} planning expected-speaker recall`);
    assertEqual(highestOther.speaker, proposal.projectedHighestOtherSpeaker, `${proposal.moveId} planning other speaker`);
    assertEqual(highestOther.recall, proposal.projectedHighestOtherRecall, `${proposal.moveId} planning other recall`);

    return {
      operation: "replace-only-transient-verification-reference",
      targetCallIndex: proposal.callIndex,
      targetDebateNumber: proposal.debateNumber,
      targetDebateId: proposal.debateId,
      targetMoveId: proposal.moveId,
      field: "verificationExcerpt",
      expectedSpeaker: proposal.expectedSpeaker,
      originalValueSha256,
      originalLexicalTokenCount: lexicalTokens(call.verificationExcerpt).length,
      replacementValue: proposal.replacementValue,
      replacementValueSha256: proposal.replacementValueSha256,
      replacementLexicalTokenCount: proposal.replacementLexicalTokenCount,
      replacementStartCharacter: proposal.replacementStartCharacter,
      replacementIsExactSubstringOfOriginal: call.verificationExcerpt.includes(proposal.replacementValue),
      deterministicSelectionRule:
        "longest contiguous lexical sequence, capped at 18 tokens, shared by the frozen source reference and one preserved segment labeled as the expected speaker; ties use earliest source position then earliest segment index",
      replacementSupport: {
        transcriptPath: transcriptLock.path,
        transcriptSha256: transcriptLock.sha256,
        segmentIndex: proposal.supportSegmentIndex,
        segmentId: proposal.supportSegmentId,
        preservedSpeakerLabel: proposal.expectedSpeaker,
        start: proposal.supportSegmentStart,
        end: proposal.supportSegmentEnd,
      },
      nonauthoritativePlanningProjection: {
        calculationPerformed: true,
        acceptedAttributionStatusChanged: false,
        validatorFunctionInvocations: 0,
        fullClipExcerptRecall: 1,
        expectedSpeakerExcerptRecall: expectedRecall,
        highestOtherSpeaker: highestOther.speaker,
        highestOtherSpeakerExcerptRecall: highestOther.recall,
        expectedSpeakerRecallMargin: expectedRecall - highestOther.recall,
        frozenThresholdsSatisfiedNumerically:
          expectedRecall >= EXPECTED.thresholds.minimumExpectedSpeakerExcerptRecall &&
          expectedRecall - highestOther.recall >= EXPECTED.thresholds.minimumExpectedSpeakerRecallMargin,
        semanticSpeakerIdentityProved: false,
      },
      deltaSha256: proposal.deltaSha256,
      originalRequestWrite: false,
      originalInventoryWrite: false,
      originalAudioWorkItemWrite: false,
      originalTranscriptWrite: false,
      validatorWrite: false,
      thresholdWrite: false,
      correctionExecutedThisStage: false,
    };
  });

  const referenceDeltas = proposedReferenceOverlays.map((item) => ({
    targetDebateNumber: item.targetDebateNumber,
    targetMoveId: item.targetMoveId,
    field: item.field,
    originalValueSha256: item.originalValueSha256,
    replacementValueSha256: item.replacementValueSha256,
    operation: item.operation,
    deltaSha256: item.deltaSha256,
  }));
  const inventoryDigestInput = referenceDeltas.map(({ deltaSha256, ...item }) => ({
    ...item,
    deltaSha256,
  }));
  assertEqual(
    sha256(JSON.stringify(inventoryDigestInput)),
    EXPECTED.referenceDeltaInventoryDigest,
    "reference delta inventory digest",
  );

  const costCorrection = {
    operation:
      "validate-preserved-cost-using-exact-ten-millionth-dollar-integer-units-and-seven-decimal-normalization-overlay",
    inputTokens: execution.usage.inputTokens,
    outputTokens: execution.usage.outputTokens,
    inputRatePerMillionUsd: cost.pricing.inputRatePerMillionUsd,
    outputRatePerMillionUsd: cost.pricing.outputRatePerMillionUsd,
    exactIntegerUnits: execution.usage.inputTokens * 25 + execution.usage.outputTokens * 100,
    exactCostUsd: execution.usageDerivedEstimatedCostUsd,
    preservedSerializedCostUsd: cost.costControl.usageDerivedEstimatedCostUsd,
  };
  assertEqual(costCorrection.exactIntegerUnits, 2452325, "cost exact units");
  assertEqual(costCorrection.exactCostUsd, 0.2452325, "exact cost");
  assertEqual(costCorrection.preservedSerializedCostUsd, 0.24523250000000002, "serialized cost");
  assertEqual(Number(costCorrection.preservedSerializedCostUsd.toFixed(7)), costCorrection.exactCostUsd, "cost normalized equality");
  assertEqual(sha256(JSON.stringify(costCorrection)), EXPECTED.costDeltaSha256, "cost delta hash");
  assertEqual(
    sha256(JSON.stringify({ deltas: referenceDeltas, cost: costCorrection })),
    EXPECTED.completeCorrectionDigest,
    "complete correction digest",
  );

  return {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-03-audio-verification-correction-plan",
    protocolId: EXPECTED.protocolId,
    status: "frozen-three-reference-and-cost-decimal-validation-overlay-plan-prepared",
    preparedAt: "2026-08-20T22:32:21Z",
    checkpointCommit: EXPECTED.checkpointCommit,
    productionCanary: false,
    batchNumber: 3,
    stagingOnly: true,
    userAuthorization: {
      instruction: "I approve.",
      interpretedScope:
        "Prepare, validate, freeze, commit, and push one bounded Batch 3 audio-verification and cost-control correction plan only, with a direct incremental cost cap of $0.",
      directIncrementalCostUsdMaximum: 0,
      correctionPlanPreparationAuthorized: true,
      executionHarnessPreparationAuthorized: false,
      correctionExecutionAuthorized: false,
      cohortReplayAuthorized: false,
      audioAccessAuthorized: false,
      modelExecutionAuthorized: false,
      paidServiceUseAuthorized: false,
    },
    sourceLocks: SOURCE_LOCKS,
    transcriptLocks: TRANSCRIPT_LOCKS,
    diagnosedScope: {
      preservedVerifiedMoves: 5,
      preservedUnresolvedMoves: 3,
      unresolvedMoveIds: PROPOSED_REFERENCES.map((item) => item.moveId),
      exactUsageDerivedEstimatedCostUsd: 0.2452325,
      preservedSerializedAggregateCostUsd: 0.24523250000000002,
      approvedMaximumCostUsd: 1,
      approvedCapExceeded: false,
      diagnosisPath: `${STAGE_ROOT}/failure-diagnosis.json`,
      diagnosisSha256: SOURCE_LOCKS[`${STAGE_ROOT}/failure-diagnosis.json`],
    },
    proposedReferenceOverlays,
    referenceDeltaInventoryDigest: EXPECTED.referenceDeltaInventoryDigest,
    proposedCostValidationOverlay: {
      ...costCorrection,
      normalizedSerializedCostUsd: Number(costCorrection.preservedSerializedCostUsd.toFixed(7)),
      normalizedValuesEqual: true,
      mathematicalCostChanged: false,
      capDispositionChanged: false,
      originalCostRecordWrite: false,
      originalCostAnalyzerWrite: false,
      originalCohortTestWrite: false,
      overlayExecutedThisStage: false,
      deltaSha256: EXPECTED.costDeltaSha256,
    },
    completeCorrectionDigest: EXPECTED.completeCorrectionDigest,
    planningConclusion: {
      classification:
        "three-speaker-mixed-source-references-and-one-binary-decimal-comparison-are-bounded-overlay-candidates",
      referenceBasis:
        "Each proposed reference is the deterministic longest source-exact sequence, capped at 18 lexical tokens, found in a preserved transcript segment already labeled as the expected speaker.",
      costBasis:
        "The exact returned-token cost is representable as 2,452,325 integer units of one ten-millionth dollar; seven-decimal normalization matches the preserved execution total without changing the charge estimate or cap result.",
      semanticSpeakerIdentityIndependentlyProved: false,
      providerLabelCorrectnessEstablished: false,
      validatorDefectEstablished: false,
      thresholdDefectEstablished: false,
      planningLexicalFeasibilityCalculationPerformed: true,
      acceptedResultChanged: false,
      correctionApproachFrozenForFuturePreparation: true,
    },
    futureExecutionContract: {
      separateExplicitUserApprovalRequired: true,
      executionHarnessMustBePreparedAndHashLockedBeforeExecution: true,
      activationManifestRequired: true,
      deterministicCorrectionPassesMaximum: 1,
      attemptsMaximum: 1,
      retriesMaximum: 0,
      rerunsMaximum: 0,
      automaticRepairsMaximum: 0,
      recursiveCorrectionsMaximum: 0,
      exactEightTranscriptCohortReplayRequired: true,
      originalCallOrderRequired: TRANSCRIPT_LOCKS.map(({ debateNumber, moveId }) => ({
        debateNumber,
        moveId,
      })),
      referenceOverlaysAllowedOnlyFor: proposedReferenceOverlays.map((item) => ({
        debateNumber: item.targetDebateNumber,
        moveId: item.targetMoveId,
        field: item.field,
        deltaSha256: item.deltaSha256,
      })),
      costOverlayAllowedOnlyFor: {
        field: "usageDerivedEstimatedCostUsd comparison",
        deltaSha256: EXPECTED.costDeltaSha256,
      },
      allOriginalTranscriptsMustRemainByteIdentical: true,
      originalRequestManifestMustRemainByteIdentical: true,
      lockedInventoriesMustRemainByteIdentical: true,
      audioWorkItemsMustRemainByteIdentical: true,
      originalExecutionAuditAnalysisAndCostRecordsMustRemainByteIdentical: true,
      exactValidatorPath: "scripts/lib/v416-audio-verification.mjs",
      exactValidatorSha256: SOURCE_LOCKS["scripts/lib/v416-audio-verification.mjs"],
      exactThresholds: EXPECTED.thresholds,
      audioAccessAllowed: false,
      semanticAudioEvaluationAllowed: false,
      transcriptionOrOtherModelExecutionAllowed: false,
      paidServiceUseAllowed: false,
      adjudicationAllowed: false,
      scoreDerivationAllowed: false,
      downstreamWorkAllowedBeforeReplayPasses: false,
    },
    futureAcceptanceRequirements: {
      allSourceAndTranscriptHashesMatch: true,
      exactReferenceDeltaInventoryAuthenticated: true,
      exactCostDeltaAuthenticated: true,
      onlyTransientValidationCopiesChanged: true,
      allProtectedFilesUnchangedBeforeAndAfter: true,
      unchangedValidatorHash: true,
      unchangedThresholds: true,
      exactlyOneCompleteEightTranscriptReplay: true,
      allEightAttributionResultsVerified: true,
      exactCostComparisonAccepted: true,
      noUnresolvedResult: true,
      noValidationException: true,
      noAudioAccess: true,
      noModelOrPaidServiceCall: true,
      directIncrementalCostUsd: 0,
    },
    stopRules: {
      sourceOrTranscriptHashMismatchBlocks: true,
      referenceDeltaMismatchBlocks: true,
      costDeltaMismatchBlocks: true,
      targetShapeMismatchBlocks: true,
      persistentProtectedFileWriteBlocks: true,
      validatorHashMismatchBlocks: true,
      thresholdMismatchBlocks: true,
      validationExceptionBlocks: true,
      unresolvedAttributionBlocks: true,
      audioAccessBlocks: true,
      modelOrPaidServiceCallBlocks: true,
      retryBlocks: true,
      rerunBlocks: true,
      automaticRepairBlocks: true,
      recursiveCorrectionBlocks: true,
      downstreamWorkBlocksUntilReplayPasses: true,
    },
    judgmentModelBoundary: {
      label: "5.6 Sol",
      slug: "gpt-5.6-sol",
      reasoningEffort: "low",
      authentication: "ChatGPT subscription",
      isolatedPassesPreserved: true,
      scoreBlindnessPreserved: true,
      integerRoundedTiesPermitted: true,
      modelContextsThisStage: 0,
      unchanged: true,
    },
    executionBoundary: {
      correctionPlansPrepared: 1,
      executionHarnessesPrepared: 0,
      activationManifestsPrepared: 0,
      correctionPassesExecuted: 0,
      cohortValidationPassesExecuted: 0,
      persistentSourceWrites: 0,
      persistentTranscriptWrites: 0,
      audioAccesses: 0,
      audioPlaybackCalls: 0,
      semanticAudioEvaluations: 0,
      transcriptionCalls: 0,
      modelOrApiCalls: 0,
      paidServiceCalls: 0,
      retries: 0,
      reruns: 0,
      adjudications: 0,
      scoresDerived: 0,
      downstreamStagesBegun: 0,
      directIncrementalCostUsd: 0,
    },
    preparationToolLocks: {
      [TOOL_PATH]: sha256File(TOOL_PATH),
      [TEST_PATH]: sha256File(TEST_PATH),
    },
    authorization: {
      executionHarnessPreparation: false,
      activationManifestPreparation: false,
      correctionExecution: false,
      cohortValidationResumption: false,
      audioAccess: false,
      transcriptionOrModelExecution: false,
      paidServiceUse: false,
      adjudicationPacketPreparation: false,
      adjudicationModelExecution: false,
      finalLedgerAssembly: false,
      scoreDerivation: false,
      publicationReconstruction: false,
      productionMutation: false,
      nextBatchSelection: false,
    },
    nextAuthorizedAction:
      "user-approval-required-before-preparing-the-exact-batch-03-audio-verification-correction-execution-harness-and-activation-manifest",
  };
}

const plan = buildPlan();
const rendered = `${JSON.stringify(plan, null, 2)}\n`;
const checkOnly = process.argv.includes("--check");
const write = process.argv.includes("--write");

assert(checkOnly !== write, "pass exactly one of --check or --write");

if (write) {
  fs.writeFileSync(absolute(OUTPUT_PATH), rendered);
  console.log(`wrote ${OUTPUT_PATH}`);
} else {
  assert(fs.existsSync(absolute(OUTPUT_PATH)), `${OUTPUT_PATH} is missing`);
  assertEqual(fs.readFileSync(absolute(OUTPUT_PATH), "utf8"), rendered, `${OUTPUT_PATH} replay`);
  console.log(`validated ${OUTPUT_PATH}`);
}
