#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { evaluateAttributionTranscript } from "./lib/v416-audio-verification.mjs";

const modeIndex = process.argv.indexOf("--mode");
const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : null;
const shouldWrite = process.argv.includes("--write");
assert(["prepare", "run", "test"].includes(mode), "--mode prepare|run|test is required");

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-14/audio-verification";
const paths = {
  activation: `${ROOT}/execution-manifest.json`,
  execution: `${ROOT}/model-execution.json`,
  failure: `${ROOT}/validation-failure.json`,
  preparation: `${ROOT}/validation-overlay-preparation.json`,
  overlayExecution: `${ROOT}/validation-overlay-execution.json`,
  audit: `${ROOT}/audio-verification.json`,
  analysis: `${ROOT}/analysis.json`,
};
const SCRIPT = "scripts/assessment-production-post-canary-batch-14-audio-validation-overlay.mjs";
const VALIDATOR = "scripts/lib/v416-audio-verification.mjs";
const EXPECTED_CALLS = 12;
const EXPECTED_OVERLAYS = 1;
const EXPECTED_FAILURE = "con-mortality-vulnerability-personhood: segment 36 text invalid";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const hashFile = async (file) => sha256(await readFile(file));
const emptyText = (segment) =>
  !segment || typeof segment.text !== "string" || segment.text.trim().length === 0;

async function loadFrozenRun() {
  const [activationBytes, executionBytes] = await Promise.all([
    readFile(paths.activation),
    readFile(paths.execution),
  ]);
  const activation = JSON.parse(activationBytes);
  const execution = JSON.parse(executionBytes);
  assert.equal(
    activation.status,
    "frozen-twelve-post-canary-batch-14-paid-known-speaker-diarizations-authorized-under-standing-authorization",
  );
  assert.equal(activation.calls.length, EXPECTED_CALLS);
  assert.equal(activation.executionPolicy.attemptsPerCall, 1);
  assert.equal(activation.executionPolicy.retriesMaximum, 0);
  assert.equal(execution.status, "twelve-post-canary-batch-14-paid-known-speaker-diarizations-completed");
  assert.equal(execution.callsCompleted, EXPECTED_CALLS);
  assert.equal(execution.callsAttempted, EXPECTED_CALLS);
  assert.equal(execution.retries, 0);
  assert.equal(execution.requestFailure, false);
  assert.equal(execution.costCapReachedOrExceeded, false);
  return { activation, activationBytes, execution, executionBytes };
}

async function inspectTranscripts(activation, execution) {
  const transcriptLocks = [];
  const targets = [];
  for (const [callIndex, call] of activation.calls.entries()) {
    const result = execution.results.find(
      (item) => item.debateNumber === call.debateNumber && item.moveId === call.moveId,
    );
    assert(result, `${call.moveId}: execution result missing`);
    assert.equal(result.status, "completed", `${call.moveId}: paid call incomplete`);
    assert.equal(result.attemptCount, 1, `${call.moveId}: paid attempt count changed`);
    assert.equal(result.retryCount, 0, `${call.moveId}: paid retry count changed`);
    const transcriptBytes = await readFile(call.transcriptPath);
    assert.equal(sha256(transcriptBytes), result.transcriptSha256, `${call.moveId}: transcript changed`);
    const transcript = JSON.parse(transcriptBytes);
    assert(Array.isArray(transcript.segments) && transcript.segments.length > 0);
    const invalid = transcript.segments
      .map((segment, segmentIndex) => ({ segment, segmentIndex }))
      .filter(({ segment }) => emptyText(segment));
    transcriptLocks.push({
      callIndex,
      debateNumber: call.debateNumber,
      debateId: call.debateId,
      moveId: call.moveId,
      path: call.transcriptPath,
      sha256: result.transcriptSha256,
      originalSegmentCount: transcript.segments.length,
      emptyTextSegments: invalid.length,
    });
    for (const { segment, segmentIndex } of invalid) {
      assert(segment && typeof segment.text === "string", `${call.moveId}: non-string segment text is outside this recovery`);
      assert.equal(segment.text, "", `${call.moveId}: whitespace-bearing segment is outside this recovery`);
      targets.push({
        callIndex,
        debateNumber: call.debateNumber,
        debateId: call.debateId,
        moveId: call.moveId,
        transcriptPath: call.transcriptPath,
        transcriptSha256: result.transcriptSha256,
        segmentIndex,
        segmentId: segment.id,
        segmentType: segment.type,
        speaker: segment.speaker,
        start: segment.start,
        end: segment.end,
        text: segment.text,
      });
    }
  }
  assert.equal(targets.length, EXPECTED_OVERLAYS, "exactly one empty provider segment is required");
  assert.equal(new Set(targets.map((target) => target.transcriptPath)).size, EXPECTED_OVERLAYS);
  return { transcriptLocks, targets };
}

async function prepare() {
  assert.equal(await exists(paths.audit), false, `${paths.audit} already exists`);
  assert.equal(await exists(paths.analysis), false, `${paths.analysis} already exists`);
  const { activation, activationBytes, execution, executionBytes } = await loadFrozenRun();
  const { transcriptLocks, targets } = await inspectTranscripts(activation, execution);
  const failure = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-14-audio-validation-failure",
    protocolId: activation.protocolId,
    status: "batch-14-audio-validation-failure-preserved-bounded-overlay-recovery-level-1-authorized",
    recordedAt: new Date().toISOString(),
    batchNumber: 14,
    failure: {
      analyzer: "scripts/assessment-production-post-canary-batch-14-audio-verification-stage.mjs",
      errorMessage: EXPECTED_FAILURE,
      classification: "completed-transport-with-response-schema-invalid-empty-segment-text",
      paidCallsCompleted: execution.callsCompleted,
      paidRetries: execution.retries,
      usageDerivedEstimatedCostUsd: execution.usageDerivedEstimatedCostUsd,
      emptyProviderSegments: targets.length,
      affectedTranscripts: targets.length,
    },
    targets,
    preservation: {
      paidOutputsPreservedByteIdentically: true,
      transcriptMutationAuthorized: false,
      paidRetryAuthorized: false,
      thresholdChangeAuthorized: false,
      speakerRelabelingAuthorized: false,
    },
  };
  const sourceHashes = {
    [paths.activation]: sha256(activationBytes),
    [paths.execution]: sha256(executionBytes),
    [SCRIPT]: await hashFile(SCRIPT),
    [VALIDATOR]: await hashFile(VALIDATOR),
  };
  for (const lock of transcriptLocks) sourceHashes[lock.path] = lock.sha256;
  const preparation = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-14-audio-validation-overlay-preparation",
    protocolId: activation.protocolId,
    status: "frozen-one-empty-segment-transient-validation-overlay-ready-for-one-bounded-replay",
    preparedAt: new Date().toISOString(),
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    batchNumber: 14,
    recoveryLevel: 1,
    maximumRecoveryLevels: 2,
    attemptsMaximum: 1,
    sourceHashes,
    transcriptLocks,
    targets,
    operation: "omit-exact-empty-text-segments-from-transient-validation-copies",
    contract: {
      originalTranscriptsRemainByteIdentical: true,
      persistentTranscriptWrites: 0,
      textFieldsAuthoredOrReplaced: 0,
      speakerLabelsChanged: 0,
      timingFieldsChanged: 0,
      usageFieldsChanged: 0,
      validatorChanged: false,
      thresholdsChanged: false,
      audioAccesses: 0,
      paidCalls: 0,
      paidRetries: 0,
      exactTwelveTranscriptReplayRequired: true,
    },
    authorization: {
      deterministicOverlayReplay: true,
      paidTranscription: false,
      retry: false,
      correctionCall: false,
      adjudicationPacketPreparation: false,
      adjudicationModelExecution: false,
      scoreDerivation: false,
      productionMutation: false,
      nextBatchSelection: false,
    },
    nextAuthorizedAction: "execute-one-batch-14-twelve-transcript-deterministic-overlay-replay",
  };
  if (shouldWrite) {
    await Promise.all([
      writeFile(paths.failure, `${JSON.stringify(failure, null, 2)}\n`),
      writeFile(paths.preparation, `${JSON.stringify(preparation, null, 2)}\n`),
    ]);
  }
  console.log(JSON.stringify({
    status: preparation.status,
    affectedTranscripts: targets.length,
    emptySegments: targets.length,
    recoveryLevel: 1,
    paidCalls: 0,
    paidRetries: 0,
    transcriptWrites: 0,
    nextAuthorizedAction: preparation.nextAuthorizedAction,
  }, null, 2));
}

async function run() {
  assert.equal(await exists(paths.overlayExecution), false, `${paths.overlayExecution} already exists`);
  assert.equal(await exists(paths.audit), false, `${paths.audit} already exists`);
  assert.equal(await exists(paths.analysis), false, `${paths.analysis} already exists`);
  const preparation = await readJson(paths.preparation);
  assert.equal(preparation.status, "frozen-one-empty-segment-transient-validation-overlay-ready-for-one-bounded-replay");
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
    assert.equal(await hashFile(file), digest, `source hash mismatch: ${file}`);
  }
  const { activation, execution } = await loadFrozenRun();
  const { targets } = await inspectTranscripts(activation, execution);
  assert.deepEqual(targets, preparation.targets, "overlay targets changed");
  const moves = [];
  let overlaysApplied = 0;
  for (const call of activation.calls) {
    const result = execution.results.find(
      (item) => item.debateNumber === call.debateNumber && item.moveId === call.moveId,
    );
    const transcriptBytes = await readFile(call.transcriptPath);
    const transcript = JSON.parse(transcriptBytes);
    const originalSegmentCount = transcript.segments.length;
    const validationTranscript = structuredClone(transcript);
    validationTranscript.segments = validationTranscript.segments.filter((segment) => !emptyText(segment));
    const omittedEmptySegments = originalSegmentCount - validationTranscript.segments.length;
    overlaysApplied += omittedEmptySegments;
    const deterministicEvidence = evaluateAttributionTranscript(validationTranscript, {
      moveId: call.moveId,
      expectedSpeaker: call.expectedSpeaker,
      verificationExcerpt: call.verificationExcerpt,
    }, activation.thresholds);
    moves.push({
      debateNumber: call.debateNumber,
      debateId: call.debateId,
      moveId: call.moveId,
      expectedSpeaker: call.expectedSpeaker,
      trigger: call.trigger,
      executionStatus: result.status,
      status: deterministicEvidence.status,
      resolvedSpeaker: deterministicEvidence.status === "verified" ? call.expectedSpeaker : null,
      clip: { path: call.clipPath, sha256: call.clipSha256, durationSeconds: call.durationSeconds },
      transcript: {
        path: call.transcriptPath,
        sha256: result.transcriptSha256,
        model: call.model,
        responseFormat: call.responseFormat,
        validationOverlayApplied: omittedEmptySegments > 0,
      },
      validationOverlay: {
        operation: "omit-exact-empty-text-segments-from-transient-validation-copy",
        omittedEmptySegments,
        originalSegmentCount,
        validationSegmentCount: validationTranscript.segments.length,
        persistentTranscriptWrites: 0,
      },
      deterministicEvidence,
    });
    assert.equal(sha256(await readFile(call.transcriptPath)), result.transcriptSha256, `${call.moveId}: original transcript changed`);
  }
  assert.equal(overlaysApplied, EXPECTED_OVERLAYS);
  const verified = moves.filter((move) => move.status === "verified").length;
  const unresolved = EXPECTED_CALLS - verified;
  const passed = verified === EXPECTED_CALLS;
  const status = passed
    ? "passed-all-twelve-post-canary-batch-14-confidence-moves-audio-verified-after-empty-segment-overlay"
    : "post-canary-batch-14-audio-verification-unresolved-after-empty-segment-overlays";
  const nextAuthorizedAction = passed
    ? "prepare-freeze-and-push-batch-14-dispute-only-adjudication-packets-under-standing-authorization"
    : "standing-authorization-stop-new-approval-required-before-batch-14-audio-verification-failure-diagnosis";
  const authorization = {
    adjudicationPacketPreparation: passed,
    paidTranscription: false,
    retry: false,
    correctionCall: false,
    judgmentModelExecution: false,
    adjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    productionMutation: false,
    nextBatchSelection: false,
  };
  const debates = [...new Set(moves.map((move) => move.debateNumber))].map((debateNumber) => ({
    debateNumber,
    debateId: moves.find((move) => move.debateNumber === debateNumber).debateId,
    moves: moves.filter((move) => move.debateNumber === debateNumber),
  }));
  const totals = {
    requiredMoves: EXPECTED_CALLS,
    verified,
    unresolved,
    paidDiarizationCallsAttempted: execution.attempts,
    paidDiarizationCallsCompleted: execution.callsCompleted,
    callsSkipped: execution.callsSkipped,
    retries: 0,
    corrections: EXPECTED_OVERLAYS,
    clipMinutes: activation.costEstimate.clipMinutes,
    durationOnlyPlanningExposureUsd: execution.durationOnlyPlanningExposureUsd,
    usageDerivedEstimatedCostUsd: execution.usageDerivedEstimatedCostUsd,
    actualBilledCostUsdAvailable: false,
    maximumAuthorizedCostUsd: execution.maximumAuthorizedCostUsd,
    directIncrementalCostCapControlPassed: execution.directIncrementalCostCapControlPassed,
    judgmentModelContexts: 0,
    adjudicationModelContexts: 0,
    scoresDerived: 0,
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0,
    deterministicValidationOverlays: EXPECTED_OVERLAYS,
  };
  const audit = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-14-audio-verification-audit",
    protocolId: activation.protocolId,
    status,
    productionCanary: false,
    batchNumber: 14,
    stagingOnly: true,
    recovery: {
      level: 1,
      attempts: 1,
      operation: preparation.operation,
      overlaysApplied,
      originalTranscriptsUnchanged: true,
      persistentTranscriptWrites: 0,
    },
    debates,
    thresholds: activation.thresholds,
    referenceContract: activation.referenceContract,
    totals,
    authorization,
  };
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-14-audio-verification-analysis",
    protocolId: activation.protocolId,
    status,
    productionCanary: false,
    batchNumber: 14,
    stagingOnly: true,
    gate: {
      passed,
      executionComplete: true,
      requiredMoves: EXPECTED_CALLS,
      verified,
      unresolved,
      deterministicThresholdsApplied: true,
      measuredReferenceDurationContractApplied: true,
      knownSpeakerNamesApplied: true,
      deterministicValidationOverlaysApplied: EXPECTED_OVERLAYS,
      locallySavedTranscripts: true,
    },
    recovery: audit.recovery,
    costs: totals,
    judgmentModelBoundary: activation.judgmentModelBoundary,
    standingAuthorization: activation.standingAuthorization,
    sourceCompatibility: activation.scope.sourceCompatibility,
    authorization,
    nextAuthorizedAction,
  };
  const overlayExecution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-14-audio-validation-overlay-execution",
    protocolId: activation.protocolId,
    status,
    executedAt: new Date().toISOString(),
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    recoveryLevel: 1,
    attempts: 1,
    overlaysApplied,
    transcriptsReplayed: EXPECTED_CALLS,
    originalTranscriptsUnchanged: true,
    persistentTranscriptWrites: 0,
    paidCalls: 0,
    retries: 0,
    verified,
    unresolved,
    passed,
    nextAuthorizedAction,
  };
  if (shouldWrite) {
    await Promise.all([
      writeFile(paths.overlayExecution, `${JSON.stringify(overlayExecution, null, 2)}\n`),
      writeFile(paths.audit, `${JSON.stringify(audit, null, 2)}\n`),
      writeFile(paths.analysis, `${JSON.stringify(analysis, null, 2)}\n`),
    ]);
  }
  console.log(JSON.stringify({
    status,
    transcriptsReplayed: EXPECTED_CALLS,
    overlaysApplied,
    verified,
    unresolved,
    originalTranscriptsUnchanged: true,
    paidCalls: 0,
    retries: 0,
    nextAuthorizedAction,
  }, null, 2));
  if (!passed) process.exitCode = 1;
}

async function test() {
  const preparation = await readJson(paths.preparation);
  assert.equal(preparation.targets.length, EXPECTED_OVERLAYS);
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
    assert.equal(await hashFile(file), digest, `source hash mismatch: ${file}`);
  }
  if (!(await exists(paths.overlayExecution))) {
    console.log(JSON.stringify({ status: "passed-prepared", overlays: EXPECTED_OVERLAYS, paidCalls: 0 }, null, 2));
    return;
  }
  const [execution, audit, analysis] = await Promise.all([
    readJson(paths.overlayExecution), readJson(paths.audit), readJson(paths.analysis),
  ]);
  assert.equal(execution.attempts, 1);
  assert.equal(execution.overlaysApplied, EXPECTED_OVERLAYS);
  assert.equal(execution.persistentTranscriptWrites, 0);
  assert.equal(execution.paidCalls, 0);
  assert.equal(audit.totals.requiredMoves, EXPECTED_CALLS);
  assert.equal(audit.totals.deterministicValidationOverlays, EXPECTED_OVERLAYS);
  assert.equal(analysis.gate.verified + analysis.gate.unresolved, EXPECTED_CALLS);
  assert.equal(analysis.gate.deterministicValidationOverlaysApplied, EXPECTED_OVERLAYS);
  console.log(JSON.stringify({
    status: "passed-complete",
    verified: analysis.gate.verified,
    unresolved: analysis.gate.unresolved,
    overlays: EXPECTED_OVERLAYS,
    paidCalls: 0,
    transcriptWrites: 0,
  }, null, 2));
}

if (mode === "prepare") await prepare();
if (mode === "run") await run();
if (mode === "test") await test();
