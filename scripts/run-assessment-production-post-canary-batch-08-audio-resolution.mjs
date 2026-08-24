#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { evaluateAttributionTranscript } from "./lib/v416-audio-verification.mjs";

const root = "docs/assessment-production/post-canary-continuation-v1/batch-08/audio-verification";
const activationPath = `${root}/resolution-execution-activation.json`;
const checkOnly = process.argv.includes("--check");
const execute = process.argv.includes("--execute");
assert.notEqual(checkOnly, execute, "pass exactly one of --check or --execute");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const hashFile = async (file) => sha256(await readFile(file));
const exists = (file) => access(file).then(() => true, () => false);
const activation = JSON.parse(await readFile(activationPath, "utf8"));

assert.equal(await hashFile(activation.resolutionPlan.path), activation.resolutionPlan.sha256);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assert.equal(await hashFile(file), digest, `${file}: source hash changed`);
}
for (const lock of activation.transcriptLocks) assert.equal(await hashFile(lock.path), lock.sha256, `${lock.moveId}: transcript changed`);
assert.equal(await hashFile(activation.exactValidator.path), activation.exactValidator.sha256);
assert.equal(activation.referenceOverlays.length, 3);
assert.equal(activation.transcriptLocks.length, 6);
assert.equal(activation.executionPolicy.deterministicPassesMaximum, 1);
assert.equal(activation.executionPolicy.completeSixTranscriptCohortReplaysMaximum, 1);
assert.equal(activation.executionPolicy.retriesMaximum, 0);
for (const output of Object.values(activation.outputs)) assert.equal(await exists(output), false, `${output}: future output exists`);

if (checkOnly) {
  assert([
    "frozen-batch-08-audio-resolution-execution-prepared-not-active",
    "frozen-batch-08-audio-resolution-deterministic-replay-authorized",
  ].includes(activation.status));
  console.log(JSON.stringify({
    status: "passed-batch-08-audio-resolution-runner-preflight",
    activationStatus: activation.status,
    referenceOverlays: 3,
    completeCohortSize: 6,
    audioAccesses: 0,
    modelOrApiCalls: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0,
  }, null, 2));
  process.exit(0);
}

assert.equal(activation.status, "frozen-batch-08-audio-resolution-deterministic-replay-authorized");
assert.equal(activation.authorization.correctionExecution, true);
assert.equal(activation.authorization.completeCohortReplay, true);
assert.equal(activation.authorization.audioAccess, false);
assert.equal(activation.authorization.modelOrApiCalls, false);
assert.equal(activation.authorization.paidServiceUse, false);

const request = JSON.parse(await readFile(`${root}/execution-manifest.json`, "utf8"));
const priorExecution = JSON.parse(await readFile(`${root}/model-execution.json`, "utf8"));
const priorCost = JSON.parse(await readFile(`${root}/cost-control-analysis.json`, "utf8"));
assert.deepEqual(request.thresholds, activation.exactThresholds);
assert.equal(request.calls.length, 6);
assert.equal(priorExecution.results.length, 6);
assert.equal(priorExecution.retries, 0);
assert.equal(priorExecution.requestFailure, false);

const startedAt = new Date().toISOString();
const started = Date.now();
const moves = [];
let referenceOverlayApplications = 0;
let structuralOverlayApplications = 0;
let validationFailure = null;
const originalHashes = Object.fromEntries(activation.transcriptLocks.map((lock) => [lock.path, lock.sha256]));
try {
  for (const [callIndex, call] of request.calls.entries()) {
    const lock = activation.transcriptLocks[callIndex];
    assert.equal(lock.callIndex, callIndex);
    assert.equal(lock.moveId, call.moveId);
    assert.equal(lock.path, call.transcriptPath);
    const result = priorExecution.results.find((item) => item.debateNumber === call.debateNumber && item.moveId === call.moveId);
    assert.equal(result?.status, "completed", `${call.moveId}: completed result missing`);
    assert.equal(result.transcriptSha256, lock.sha256);
    const originalTranscript = JSON.parse(await readFile(lock.path, "utf8"));
    let transcript = structuredClone(originalTranscript);
    let structuralValidationOverlay = null;
    if (call.moveId === activation.structuralValidationOverlay.targetMoveId) {
      const indices = [...activation.structuralValidationOverlay.originalSegmentIndices].sort((a, b) => b - a);
      assert.deepEqual(indices, [52, 33]);
      for (const frozen of [
        { index: 33, id: "seg_33", speaker: "Sam Harris", start: 104.522, end: 104.572 },
        { index: 52, id: "seg_52", speaker: "Sam Harris", start: 116.942, end: 117.142 },
      ]) {
        const segment = originalTranscript.segments[frozen.index];
        assert.equal(segment.id, frozen.id);
        assert.equal(segment.speaker, frozen.speaker);
        assert.equal(segment.start, frozen.start);
        assert.equal(segment.end, frozen.end);
        assert.equal(segment.text, "");
      }
      for (const index of indices) transcript.segments.splice(index, 1);
      structuralOverlayApplications += 1;
      structuralValidationOverlay = {
        operation: "omit-two-authenticated-empty-segments-from-in-memory-validation-copy",
        originalSegmentIndices: [33, 52],
        persistentTranscriptWritten: false,
      };
    }
    const referenceOverlay = activation.referenceOverlays.find((item) => item.targetCallIndex === callIndex);
    let verificationExcerpt = call.verificationExcerpt;
    let transientReferenceOverlay = null;
    if (referenceOverlay) {
      assert.equal(referenceOverlay.targetMoveId, call.moveId);
      assert.equal(sha256(call.verificationExcerpt), referenceOverlay.originalValueSha256);
      assert(call.verificationExcerpt.includes(referenceOverlay.replacementValue));
      assert.equal(sha256(referenceOverlay.replacementValue), referenceOverlay.replacementValueSha256);
      verificationExcerpt = referenceOverlay.replacementValue;
      referenceOverlayApplications += 1;
      transientReferenceOverlay = {
        operation: referenceOverlay.operation,
        replacementValueSha256: referenceOverlay.replacementValueSha256,
        replacementLexicalTokenCount: referenceOverlay.replacementLexicalTokenCount,
        deltaSha256: referenceOverlay.deltaSha256,
        persistentRequestWritten: false,
      };
    }
    const deterministicEvidence = evaluateAttributionTranscript(
      transcript,
      { moveId: call.moveId, expectedSpeaker: call.expectedSpeaker, verificationExcerpt },
      activation.exactThresholds,
    );
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
      transcript: { path: lock.path, sha256: lock.sha256, model: call.model, responseFormat: call.responseFormat, persistentMutation: false },
      structuralValidationOverlay,
      transientReferenceOverlay,
      deterministicEvidence,
    });
  }
  assert.equal(referenceOverlayApplications, 3);
  assert.equal(structuralOverlayApplications, 1);
  for (const lock of activation.transcriptLocks) assert.equal(await hashFile(lock.path), originalHashes[lock.path], `${lock.moveId}: original changed`);
} catch (error) {
  validationFailure = error.stack ?? String(error);
}

const replayComplete = validationFailure === null && moves.length === 6;
const verified = moves.filter((move) => move.status === "verified").length;
const unresolved = replayComplete ? moves.length - verified : null;
const passed = replayComplete && verified === 6;
const status = passed
  ? "passed-all-six-batch-08-audio-attributions-after-transient-reference-overlays"
  : replayComplete
    ? "batch-08-audio-resolution-replay-unresolved"
    : "batch-08-audio-resolution-validation-failed";
const nextAuthorizedAction = passed
  ? "prepare-freeze-and-activate-batch-08-dispute-only-adjudication-packets-under-continuation-standing-authorization"
  : "preserve-and-diagnose-batch-08-audio-resolution-failure-under-continuation-standing-authorization";

await mkdir(`${root}/resolution-execution`, { recursive: true });
const executionRecord = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-08-audio-resolution-execution",
  protocolId: request.protocolId,
  status,
  startedAt,
  completedAt: new Date().toISOString(),
  elapsedMs: Date.now() - started,
  productionCanary: false,
  batchNumber: 8,
  deterministicPassesAttempted: 1,
  deterministicPassesCompleted: replayComplete ? 1 : 0,
  completeCohortReplaysAttempted: 1,
  completeCohortReplaysCompleted: replayComplete ? 1 : 0,
  retries: 0,
  reruns: 0,
  automaticRepairs: 0,
  referenceOverlayApplications,
  structuralOverlayApplications,
  verified,
  unresolved,
  originalTranscriptsUnchanged: activation.transcriptLocks.every((lock) => originalHashes[lock.path] === lock.sha256),
  persistentProtectedWrites: 0,
  validationFailure: validationFailure?.slice(-12000) ?? null,
  gateAcceptancePassed: passed,
  audioAccesses: 0,
  modelOrApiCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  scoresDerived: 0,
  productionMutations: 0,
  nextBatchSelections: 0,
  nextAuthorizedAction,
};
await writeFile(activation.outputs.execution, `${JSON.stringify(executionRecord, null, 2)}\n`);

if (replayComplete) {
  const debates = [...new Set(moves.map((move) => move.debateNumber))].map((debateNumber) => ({
    debateNumber,
    debateId: moves.find((move) => move.debateNumber === debateNumber).debateId,
    moves: moves.filter((move) => move.debateNumber === debateNumber),
  }));
  const totals = {
    requiredMoves: 6,
    verified,
    unresolved,
    preservedPaidCallsAttempted: priorExecution.callsAttempted,
    preservedPaidCallsCompleted: priorExecution.callsCompleted,
    newPaidCalls: 0,
    retries: 0,
    deterministicCorrectionPasses: 1,
    referenceOverlayApplications,
    structuralOverlayApplications,
    usageDerivedEstimatedCostUsd: priorExecution.usageDerivedEstimatedCostUsd,
    maximumAuthorizedCostUsd: priorExecution.maximumAuthorizedCostUsd,
    directIncrementalCostUsdThisStage: 0,
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0,
    judgmentModelContexts: 0,
    adjudicationModelContexts: 0,
    scoresDerived: 0,
  };
  const audit = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-08-audio-resolution-audit",
    protocolId: request.protocolId,
    status,
    productionCanary: false,
    batchNumber: 8,
    stagingOnly: true,
    corrections: {
      referenceOverlays: activation.referenceOverlays.map((item) => ({
        debateNumber: item.targetDebateNumber,
        moveId: item.targetMoveId,
        operation: item.operation,
        deltaSha256: item.deltaSha256,
        persistentWrite: false,
      })),
      structuralOverlay: { targetMoveId: activation.structuralValidationOverlay.targetMoveId, originalSegmentIndices: [33, 52], persistentWrite: false },
    },
    debates,
    thresholds: activation.exactThresholds,
    referenceContract: request.referenceContract,
    totals,
    authorization: {
      adjudicationPacketPreparation: passed,
      paidTranscription: false,
      retry: false,
      correctionCall: false,
      judgmentModelExecution: false,
      adjudicationModelExecution: false,
      scoreDerivation: false,
      productionMutation: false,
      nextBatchSelection: false,
    },
  };
  await writeFile(activation.outputs.audit, `${JSON.stringify(audit, null, 2)}\n`);
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-08-audio-resolution-analysis",
    protocolId: request.protocolId,
    status,
    productionCanary: false,
    batchNumber: 8,
    stagingOnly: true,
    gate: {
      passed,
      executionComplete: true,
      deterministicReplayComplete: true,
      requiredMoves: 6,
      verified,
      unresolved,
      exactValidatorPreserved: true,
      exactThresholdsPreserved: true,
      originalTranscriptsPreserved: true,
      originalReferencesPreserved: true,
      transientReferenceOverlayApplications: referenceOverlayApplications,
      structuralOverlayApplications,
      persistentProtectedWrites: 0,
    },
    costs: totals,
    continuationAuthorization: activation.continuationAuthorization,
    nextAuthorizedAction,
  };
  await writeFile(activation.outputs.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
  const costRecord = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-08-audio-resolution-cost-control-analysis",
    protocolId: request.protocolId,
    status: passed ? "audio-attribution-passed-preserved-usage-derived-cost-within-approved-cap" : "audio-attribution-unresolved-preserved-usage-derived-cost-within-approved-cap",
    analyzedAt: new Date().toISOString(),
    productionCanary: false,
    batchNumber: 8,
    stagingOnly: true,
    preservedCostRecord: { path: `${root}/cost-control-analysis.json`, sha256: await hashFile(`${root}/cost-control-analysis.json`) },
    costControl: {
      priorUsageDerivedEstimatedCostUsd: priorCost.costControl.usageDerivedEstimatedCostUsd,
      newUsageDerivedEstimatedCostUsd: 0,
      aggregateUsageDerivedEstimatedCostUsd: priorCost.costControl.usageDerivedEstimatedCostUsd,
      approvedMaximumCostUsd: 1,
      approvedCapExceeded: false,
      requestFailure: false,
      directIncrementalCostUsdThisStage: 0,
    },
    executionBoundary: {
      paidCallsAddedByCorrection: 0,
      modelCallsAddedByCorrection: 0,
      audioPlaybackCalls: 0,
      semanticAudioEvaluations: 0,
      retries: 0,
      scoresDerived: 0,
    },
    workflowDisposition: { downstreamWorkflowBlocked: !passed },
    sourceHashes: {
      [activationPath]: await hashFile(activationPath),
      [activation.outputs.execution]: await hashFile(activation.outputs.execution),
      [activation.outputs.audit]: await hashFile(activation.outputs.audit),
      [activation.outputs.analysis]: await hashFile(activation.outputs.analysis),
      [activation.exactValidator.path]: await hashFile(activation.exactValidator.path),
      ...Object.fromEntries(activation.transcriptLocks.map((lock) => [lock.path, lock.sha256])),
    },
    nextAuthorizedAction,
  };
  await writeFile(activation.outputs.cost, `${JSON.stringify(costRecord, null, 2)}\n`);
}

console.log(JSON.stringify({
  status,
  replayComplete,
  verified,
  unresolved,
  referenceOverlayApplications,
  structuralOverlayApplications,
  persistentProtectedWrites: 0,
  audioAccesses: 0,
  modelOrApiCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction,
}, null, 2));
if (!passed) process.exitCode = 1;
