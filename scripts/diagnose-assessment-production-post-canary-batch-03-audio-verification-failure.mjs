#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";

const ROOT = process.cwd();
const STAGE_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-03/audio-verification";
const OUTPUT_PATH = `${STAGE_ROOT}/failure-diagnosis.json`;
const TOOL_PATH =
  "scripts/diagnose-assessment-production-post-canary-batch-03-audio-verification-failure.mjs";

const EVIDENCE = Object.freeze({
  request: {
    path: `${STAGE_ROOT}/execution-manifest.json`,
    sha256: "8795fdf28daea01ed7a09d73bdd9f97144e57b77acc589a7ee44317aacb0ce08",
  },
  execution: {
    path: `${STAGE_ROOT}/model-execution.json`,
    sha256: "dcd4da54457a8423bc7c5981b54dfab65aade52f1ccef10c59f8f1a81863e484",
  },
  validationAudit: {
    path: `${STAGE_ROOT}/audio-verification.json`,
    sha256: "c1f4418803d468801b3731361ebff701f2d4c1a8ca4dc374332d14dedbe4a523",
  },
  validationAnalysis: {
    path: `${STAGE_ROOT}/analysis.json`,
    sha256: "f3e185fc66438cb054f2ea2d9005c6460cf5d57cf6167e93a114cc77d41ed989",
  },
  cost: {
    path: `${STAGE_ROOT}/cost-control-analysis.json`,
    sha256: "bb6fd4702e3401dd97694e20744d3eaf05de51b691ccd691d9b1a588b888afd8",
  },
});

const VALIDATORS = Object.freeze({
  attributionLibrary: {
    path: "scripts/lib/v416-audio-verification.mjs",
    sha256: "9f7c2a6dc40b33de092503350994b3198588c5e9b7aaf9d547365e81ceb138d7",
  },
  attributionAnalyzer: {
    path: "scripts/analyze-assessment-production-post-canary-batch-03-audio-verification.mjs",
    sha256: "5fab747b3f999d577a8d0e520ec631373c8bb2468330faef7aa29ced10ef602c",
  },
  costAnalyzer: {
    path: "scripts/analyze-assessment-production-post-canary-batch-03-audio-cost-control.mjs",
    sha256: "df86e69a5aebb2de57bdc0ddfc54a1a1f5f1eb03c4411313c1b014e4f2a2bdc1",
  },
  cohortTest: {
    path: "scripts/test-assessment-production-post-canary-batch-03-audio-verification.mjs",
    sha256: "42ca4e0963ce42dac02e84f61309cab63bf30d86a9c82a0608e5aa531b238c47",
  },
});

const EXPECTED = Object.freeze({
  checkpointCommit: "a84922345aa760f3a3c6f97f788fb8b02cc8a9c3",
  protocolId: "assessment-production-post-canary-batch-03-decomposed-consensus",
  status: "post-canary-batch-03-audio-verification-unresolved",
  executionStatus:
    "eight-post-canary-batch-03-paid-known-speaker-diarizations-completed",
  thresholds: {
    minimumFullClipExcerptRecall: 0.8,
    minimumExpectedSpeakerExcerptRecall: 0.8,
    minimumExpectedSpeakerRecallMargin: 0.15,
    minimumExpectedSpeakerDurationSeconds: 5,
  },
  unresolved: [
    {
      debateNumber: "124",
      debateId: "harris-peterson-god-atheism-bible-2018",
      moveId: "pro-rational-instruction-behavioral-limit",
      expectedSpeaker: "Jordan Peterson",
      transcriptPath:
        "output/transcribe/assessment-production-post-canary-batch-03-audio-verification/debate-124/transcripts/pro-rational-instruction-behavioral-limit.transcript.json",
      transcriptSha256: "2534981c9101fac0f5a8695928bc8167953a037eec173467c0226de8a4a3db3d",
      fullClipExcerptRecall: 0.9142857142857143,
      expectedSpeakerExcerptRecall: 0.6571428571428571,
      highestOtherSpeaker: "Sam Harris",
      highestOtherSpeakerExcerptRecall: 0.38571428571428573,
      expectedSpeakerRecallMargin: 0.2714285714285714,
      expectedSpeakerDurationSeconds: 26.35,
      checks: {
        fullClipExcerptRecovered: true,
        expectedSpeakerExcerptRecovered: false,
        expectedSpeakerRecallDistinct: true,
        expectedSpeakerDurationSufficient: true,
      },
    },
    {
      debateNumber: "58",
      debateId: "dillahunty-slick-secular-humanism-christianity-2016",
      moveId: "pro-logic-presupposition-suffices",
      expectedSpeaker: "Matt Dillahunty",
      transcriptPath:
        "output/transcribe/assessment-production-post-canary-batch-03-audio-verification/debate-58/transcripts/pro-logic-presupposition-suffices.transcript.json",
      transcriptSha256: "6aca9be1794e534daf2dc5116ef8441104f2160d9b821b9f22b6c542a40112a5",
      fullClipExcerptRecall: 0.9436619718309859,
      expectedSpeakerExcerptRecall: 0.7746478873239436,
      highestOtherSpeaker: "Matt Slick",
      highestOtherSpeakerExcerptRecall: 0.5070422535211268,
      expectedSpeakerRecallMargin: 0.2676056338028169,
      expectedSpeakerDurationSeconds: 20.7,
      checks: {
        fullClipExcerptRecovered: true,
        expectedSpeakerExcerptRecovered: false,
        expectedSpeakerRecallDistinct: true,
        expectedSpeakerDurationSufficient: true,
      },
    },
    {
      debateNumber: "157",
      debateId: "dillahunty-howitt-christianity-true-2023",
      moveId: "con-reason-incarnation-access-gap",
      expectedSpeaker: "Matt Dillahunty",
      transcriptPath:
        "output/transcribe/assessment-production-post-canary-batch-03-audio-verification/debate-157/transcripts/con-reason-incarnation-access-gap.transcript.json",
      transcriptSha256: "abcd04a42e445e4851c828661010a4deaa540a928e83e15502a062ae7eaef85f",
      fullClipExcerptRecall: 0.9473684210526315,
      expectedSpeakerExcerptRecall: 0.4868421052631579,
      highestOtherSpeaker: "Lewis Howitt (PerspectivePhilosophy)",
      highestOtherSpeakerExcerptRecall: 0.75,
      expectedSpeakerRecallMargin: -0.2631578947368421,
      expectedSpeakerDurationSeconds: 35.75,
      checks: {
        fullClipExcerptRecovered: true,
        expectedSpeakerExcerptRecovered: false,
        expectedSpeakerRecallDistinct: false,
        expectedSpeakerDurationSufficient: true,
      },
    },
  ],
  usage: {
    inputTokens: 12817,
    outputTokens: 21319,
    inputRatePerMillionUsd: 2.5,
    outputRatePerMillionUsd: 10,
    exactCostUnitsPerTenMillionDollars: 2452325,
    exactCostUsd: 0.2452325,
    serializedAggregateCostUsd: 0.24523250000000002,
    approvedMaximumCostUsd: 1,
  },
});

function absolute(relativePath) {
  return `${ROOT}/${relativePath}`;
}

function sha256File(relativePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(absolute(relativePath)))
    .digest("hex");
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

function locateMove(audit, target) {
  const matches = audit.debates
    .flatMap((debate) => debate.moves)
    .filter(
      (move) =>
        move.debateNumber === target.debateNumber && move.moveId === target.moveId,
    );
  assertEqual(matches.length, 1, `${target.moveId} audit match count`);
  return matches[0];
}

function buildDiagnosis() {
  for (const [role, source] of Object.entries(EVIDENCE)) {
    assertEqual(sha256File(source.path), source.sha256, `${role} evidence hash`);
  }
  for (const [role, source] of Object.entries(VALIDATORS)) {
    assertEqual(sha256File(source.path), source.sha256, `${role} validator hash`);
  }

  const request = readJson(EVIDENCE.request.path);
  const execution = readJson(EVIDENCE.execution.path);
  const audit = readJson(EVIDENCE.validationAudit.path);
  const analysis = readJson(EVIDENCE.validationAnalysis.path);
  const cost = readJson(EVIDENCE.cost.path);

  assertEqual(request.protocolId, EXPECTED.protocolId, "request protocol");
  assertEqual(execution.protocolId, EXPECTED.protocolId, "execution protocol");
  assertEqual(audit.protocolId, EXPECTED.protocolId, "audit protocol");
  assertEqual(analysis.protocolId, EXPECTED.protocolId, "analysis protocol");
  assertEqual(cost.protocolId, EXPECTED.protocolId, "cost protocol");
  assertEqual(execution.status, EXPECTED.executionStatus, "execution status");
  assertEqual(audit.status, EXPECTED.status, "audit status");
  assertEqual(analysis.status, EXPECTED.status, "analysis status");
  assertDeepEqual(audit.thresholds, EXPECTED.thresholds, "frozen thresholds");
  assertEqual(execution.callsPlanned, 8, "planned call count");
  assertEqual(execution.callsAttempted, 8, "attempted call count");
  assertEqual(execution.callsCompleted, 8, "completed call count");
  assertEqual(execution.callsSkipped, 0, "skipped call count");
  assertEqual(execution.retries, 0, "retry count");
  assertEqual(execution.correctionCalls, 0, "correction call count");
  assertEqual(execution.requestFailure, false, "request failure");
  assertEqual(execution.costCapReachedOrExceeded, false, "execution cost cap event");
  assertEqual(audit.totals.requiredMoves, 8, "required move count");
  assertEqual(audit.totals.verified, 5, "verified move count");
  assertEqual(audit.totals.unresolved, 3, "unresolved move count");
  assertEqual(analysis.gate.passed, false, "audio gate disposition");
  assertEqual(analysis.gate.verified, 5, "analysis verified count");
  assertEqual(analysis.gate.unresolved, 3, "analysis unresolved count");

  const diagnosedMoves = EXPECTED.unresolved.map((target) => {
    assertEqual(sha256File(target.transcriptPath), target.transcriptSha256, `${target.moveId} transcript hash`);
    const call = request.calls.find(
      (item) =>
        item.debateNumber === target.debateNumber && item.moveId === target.moveId,
    );
    const result = execution.results.find(
      (item) =>
        item.debateNumber === target.debateNumber && item.moveId === target.moveId,
    );
    assert(call, `${target.moveId} request call missing`);
    assert(result, `${target.moveId} execution result missing`);
    assertEqual(call.debateId, target.debateId, `${target.moveId} request debate`);
    assertEqual(call.expectedSpeaker, target.expectedSpeaker, `${target.moveId} request speaker`);
    assertEqual(call.transcriptPath, target.transcriptPath, `${target.moveId} request transcript`);
    assertEqual(result.status, "completed", `${target.moveId} execution status`);
    assertEqual(result.attemptCount, 1, `${target.moveId} attempt count`);
    assertEqual(result.retryCount, 0, `${target.moveId} retry count`);
    assertEqual(result.transcriptSha256, target.transcriptSha256, `${target.moveId} execution transcript hash`);

    const move = locateMove(audit, target);
    assertEqual(move.status, "unresolved", `${target.moveId} audit status`);
    assertEqual(move.resolvedSpeaker, null, `${target.moveId} resolved speaker`);
    assertEqual(move.expectedSpeaker, target.expectedSpeaker, `${target.moveId} audit speaker`);
    assertEqual(move.transcript.path, target.transcriptPath, `${target.moveId} audit transcript path`);
    assertEqual(move.transcript.sha256, target.transcriptSha256, `${target.moveId} audit transcript hash`);
    for (const key of [
      "fullClipExcerptRecall",
      "expectedSpeakerExcerptRecall",
      "highestOtherSpeaker",
      "highestOtherSpeakerExcerptRecall",
      "expectedSpeakerRecallMargin",
      "expectedSpeakerDurationSeconds",
    ]) {
      assertEqual(move.deterministicEvidence[key], target[key], `${target.moveId} ${key}`);
    }
    assertDeepEqual(move.deterministicEvidence.checks, target.checks, `${target.moveId} checks`);

    const failedChecks = Object.entries(target.checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name);
    return {
      debateNumber: target.debateNumber,
      debateId: target.debateId,
      moveId: target.moveId,
      expectedSpeaker: target.expectedSpeaker,
      transcriptPath: target.transcriptPath,
      transcriptSha256: target.transcriptSha256,
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
          (
            EXPECTED.thresholds.minimumExpectedSpeakerExcerptRecall -
            target.expectedSpeakerExcerptRecall
          ).toFixed(15),
        ),
        expectedSpeakerRecallMarginShortfall: target.checks.expectedSpeakerRecallDistinct
          ? 0
          : Number(
              (
                EXPECTED.thresholds.minimumExpectedSpeakerRecallMargin -
                target.expectedSpeakerRecallMargin
              ).toFixed(15),
            ),
      },
      classification:
        failedChecks.length === 1
          ? "expected-speaker-excerpt-recall-below-frozen-threshold"
          : "expected-speaker-excerpt-recall-and-distinctness-margin-below-frozen-threshold",
    };
  });

  const unresolvedMoveIds = audit.debates
    .flatMap((debate) => debate.moves)
    .filter((move) => move.status === "unresolved")
    .map((move) => move.moveId);
  assertDeepEqual(
    unresolvedMoveIds,
    EXPECTED.unresolved.map((item) => item.moveId),
    "exact unresolved move order",
  );

  const exactCostUnits =
    EXPECTED.usage.inputTokens * 25 + EXPECTED.usage.outputTokens * 100;
  const exactCostUsd = exactCostUnits / 10_000_000;
  const serializedAggregateCostUsd = cost.costControl.usageDerivedEstimatedCostUsd;
  assertEqual(execution.usage.inputTokens, EXPECTED.usage.inputTokens, "execution input tokens");
  assertEqual(execution.usage.outputTokens, EXPECTED.usage.outputTokens, "execution output tokens");
  assertEqual(cost.pricing.inputRatePerMillionUsd, EXPECTED.usage.inputRatePerMillionUsd, "input rate");
  assertEqual(cost.pricing.outputRatePerMillionUsd, EXPECTED.usage.outputRatePerMillionUsd, "output rate");
  assertEqual(exactCostUnits, EXPECTED.usage.exactCostUnitsPerTenMillionDollars, "exact cost units");
  assertEqual(exactCostUsd, EXPECTED.usage.exactCostUsd, "exact usage-derived cost");
  assertEqual(execution.usageDerivedEstimatedCostUsd, EXPECTED.usage.exactCostUsd, "execution cost");
  assertEqual(serializedAggregateCostUsd, EXPECTED.usage.serializedAggregateCostUsd, "serialized cost aggregate");
  assertEqual(Number(serializedAggregateCostUsd.toFixed(7)), exactCostUsd, "seven-place cost normalization");
  assertEqual(cost.costControl.approvedMaximumCostUsd, EXPECTED.usage.approvedMaximumCostUsd, "approved cap");
  assertEqual(cost.costControl.approvedCapExceeded, false, "approved cap disposition");
  assertEqual(cost.costControl.directIncrementalCostCapControlPassed, true, "cost control disposition");

  return {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-03-audio-verification-failure-diagnosis",
    protocolId: EXPECTED.protocolId,
    status: "frozen-three-batch-03-audio-unresolved-and-cost-decimal-mismatch-diagnosed",
    diagnosedAt: "2026-08-20T22:12:01Z",
    checkpointCommit: EXPECTED.checkpointCommit,
    sourceCheckpointCommit: EXPECTED.checkpointCommit,
    productionCanary: false,
    batchNumber: 3,
    stagingOnly: true,
    userAuthorization: {
      instruction:
        "I approve deterministic diagnosis, validation, freezing, committing, and pushing of the three preserved Batch 3 audio-verification unresolved results and the cost-control decimal mismatch only, with a direct incremental cost cap of $0. Use only preserved request, transcript, execution, validation, and cost records. Do not access or play audio, execute or retry models, use paid services, alter transcripts or thresholds, repair results, adjudicate, derive scores, or begin downstream work.",
      maximumDirectIncrementalCostUsd: 0,
      deterministicDiagnosisAuthorized: true,
      deterministicValidationAuthorized: true,
      freezingAuthorized: true,
      commitAndPushAuthorized: true,
      transcriptOrThresholdMutationAuthorized: false,
      repairAuthorized: false,
      adjudicationAuthorized: false,
      modelExecutionAuthorized: false,
      paidServiceAuthorized: false,
    },
    evidenceBoundary: {
      authorizedRecords: Object.fromEntries(
        Object.entries(EVIDENCE).map(([role, source]) => [role, { ...source }]),
      ),
      authorizedRecordCount: Object.keys(EVIDENCE).length,
      validatorRecords: Object.fromEntries(
        Object.entries(VALIDATORS).map(([role, source]) => [role, { ...source }]),
      ),
      validatorRecordCount: Object.keys(VALIDATORS).length,
      transcriptRecords: EXPECTED.unresolved.map((item) => ({
        debateNumber: item.debateNumber,
        moveId: item.moveId,
        path: item.transcriptPath,
        sha256: item.transcriptSha256,
      })),
      transcriptRecordCount: EXPECTED.unresolved.length,
      transcriptBytesHashVerified: true,
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
    attributionDiagnosis: {
      classification: "three-completed-calls-failed-unchanged-deterministic-attribution-thresholds",
      requiredMoves: 8,
      verifiedMoves: 5,
      unresolvedMoves: 3,
      frozenThresholds: EXPECTED.thresholds,
      unresolved: diagnosedMoves,
      allFullClipExcerptChecksPassed: diagnosedMoves.every(
        (item) => item.deterministicEvidence.checks.fullClipExcerptRecovered,
      ),
      allExpectedSpeakerDurationChecksPassed: diagnosedMoves.every(
        (item) => item.deterministicEvidence.checks.expectedSpeakerDurationSufficient,
      ),
      expectedSpeakerExcerptRecallFailures: diagnosedMoves.filter(
        (item) => !item.deterministicEvidence.checks.expectedSpeakerExcerptRecovered,
      ).length,
      expectedSpeakerRecallDistinctnessFailures: diagnosedMoves.filter(
        (item) => !item.deterministicEvidence.checks.expectedSpeakerRecallDistinct,
      ).length,
      transcriptOrSpeakerSemanticAccuracyDetermined: false,
      providerCauseDetermined: false,
      correctionApproachDetermined: false,
      scopeConclusion:
        "The preserved records establish exactly which frozen threshold checks failed. They do not establish whether the transcript wording or speaker labels are semantically correct, why the provider produced them, or what correction should be used.",
    },
    costControlDiagnosis: {
      classification:
        "binary-floating-point-serialization-mismatch-after-unrounded-per-call-aggregation",
      inputTokens: EXPECTED.usage.inputTokens,
      outputTokens: EXPECTED.usage.outputTokens,
      inputRatePerMillionUsd: EXPECTED.usage.inputRatePerMillionUsd,
      outputRatePerMillionUsd: EXPECTED.usage.outputRatePerMillionUsd,
      exactCostRepresentation: {
        unit: "one-ten-millionth-us-dollar",
        integerUnits: exactCostUnits,
        exactDecimalUsd: exactCostUsd,
      },
      executionRecordUsd: execution.usageDerivedEstimatedCostUsd,
      costRecordSerializedAggregateUsd: serializedAggregateCostUsd,
      binaryFloatingPointDifferenceUsd: serializedAggregateCostUsd - exactCostUsd,
      sevenDecimalPlacesEqual: Number(serializedAggregateCostUsd.toFixed(7)) === exactCostUsd,
      strictEqualityEqual: Object.is(serializedAggregateCostUsd, exactCostUsd),
      testMismatchEstablished: true,
      mathematicalCostChanged: false,
      approvedCapUsd: EXPECTED.usage.approvedMaximumCostUsd,
      approvedCapExceeded: false,
      capDispositionChanged: false,
      actualInvoiceChargeAvailable: false,
      repairOrNormalizationPerformed: false,
      scopeConclusion:
        "The cost analyzer accepted the rounded aggregate against the execution total, then stored the unrounded binary floating-point aggregate. The cohort test compares that stored value to the execution total with strict equality. The mismatch is representational and does not change the exact usage-derived estimate or the approved-cap result.",
    },
    preservedStopDisposition: {
      audioVerificationGatePassed: false,
      unresolvedResultsPreserved: 3,
      transcriptFilesPreservedByteIdentically: true,
      thresholdsPreserved: true,
      costRecordPreserved: true,
      costTestFailurePreserved: true,
      repairPerformed: false,
      validationResumed: false,
      adjudicationStarted: false,
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
      thresholdChanges: 0,
      repairs: 0,
      adjudications: 0,
      scoresDerived: 0,
      downstreamStagesBegun: 0,
    },
    authorization: {
      audioVerificationCorrectionPreparation: false,
      audioVerificationCorrectionExecution: false,
      costControlCorrectionPreparation: false,
      costControlCorrectionExecution: false,
      transcriptMutation: false,
      thresholdMutation: false,
      audioAccess: false,
      transcriptionOrModelExecution: false,
      paidServiceUse: false,
      cohortValidationResumption: false,
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
      validatorHashesLocked: true,
      exactThreeUnresolvedMovesLocked: true,
      costMismatchLocked: true,
      diagnosisToolPath: TOOL_PATH,
      diagnosisToolSha256: sha256File(TOOL_PATH),
    },
    nextAuthorizedAction:
      "user-approval-required-before-any-batch-03-audio-verification-or-cost-control-correction-preparation-or-cohort-validation-resumption",
  };
}

const diagnosis = buildDiagnosis();
const rendered = `${JSON.stringify(diagnosis, null, 2)}\n`;
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
