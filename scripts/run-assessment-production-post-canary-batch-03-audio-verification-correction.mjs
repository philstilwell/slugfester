#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";

import { evaluateAttributionTranscript } from "./lib/v416-audio-verification.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-03/audio-verification";
const ACTIVATION_PATH = `${ROOT}/correction-execution-activation.json`;
const HARNESS_PATH =
  "scripts/run-assessment-production-post-canary-batch-03-audio-verification-correction.mjs";
const checkOnly = process.argv.includes("--check");
const execute = process.argv.includes("--execute");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const hashFile = async (file) => sha256(await readFile(file));
const exists = (file) => access(file).then(() => true, () => false);
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(checkOnly !== execute, "pass exactly one of --check or --execute");

const activation = JSON.parse(await readFile(ACTIVATION_PATH, "utf8"));
assert(
  activation.schemaVersion ===
    "1.0-assessment-production-post-canary-batch-03-audio-verification-correction-execution-activation",
  "activation schema changed",
);
assert(
  activation.protocolId ===
    "assessment-production-post-canary-batch-03-decomposed-consensus" &&
    activation.productionCanary === false &&
    activation.batchNumber === 3 &&
    activation.correctionNumber === 1 &&
    activation.stagingOnly === true,
  "activation identity changed",
);
assert(
  activation.referenceOverlays.length === 3 &&
    activation.referenceOverlays.every(
      (overlay) =>
        overlay.operation ===
          "replace-only-transient-verification-reference" &&
        overlay.field === "verificationExcerpt" &&
        overlay.originalPersistentRecordWritesMaximum === 0,
    ),
  "reference overlay inventory changed",
);
assert(
  activation.referenceDeltaInventoryDigest ===
    "6bcbbc896cf586ca3fc2200da3619551170857a463b1d5c8245b8170f0c645c8",
  "reference delta inventory changed",
);
assert(
  activation.costOverlay.operation ===
    "validate-preserved-cost-using-exact-ten-millionth-dollar-integer-units-and-seven-decimal-normalization-overlay" &&
    activation.costOverlay.exactIntegerUnits === 2452325 &&
    activation.costOverlay.exactCostUsd === 0.2452325 &&
    activation.costOverlay.preservedSerializedCostUsd ===
      0.24523250000000002 &&
    activation.costOverlay.originalPersistentRecordWritesMaximum === 0 &&
    activation.costOverlay.deltaSha256 ===
      "49296f458e54c51db80382b7d426db0f13e9d3133c14683744fd5b0aba3adf95",
  "cost overlay changed",
);
assert(
  activation.completeCorrectionDigest ===
    "bcfe5e3bbd1807acb67f6199cb138c3cf637b079c0754ed6efc0974cbcbbba06",
  "complete correction digest changed",
);
assert(
  activation.executionPolicy.deterministicPassesMaximum === 1 &&
    activation.executionPolicy.attemptsMaximum === 1 &&
    activation.executionPolicy.retriesMaximum === 0 &&
    activation.executionPolicy.rerunsMaximum === 0 &&
    activation.executionPolicy.automaticRepairsMaximum === 0 &&
    activation.executionPolicy.recursiveCorrectionsMaximum === 0 &&
    activation.executionPolicy.exactEightTranscriptCohortReplayRequired ===
      true &&
    activation.executionPolicy.referenceOverlayApplicationsRequired === 3 &&
    activation.executionPolicy.costOverlayApplicationsRequired === 1 &&
    activation.executionPolicy.persistentProtectedWritesMaximum === 0,
  "execution limits changed",
);
assert(
  activation.executionPolicy.audioFileAccessAllowed === false &&
    activation.executionPolicy.semanticAudioEvaluationAllowed === false &&
    activation.executionPolicy.transcriptionOrOtherModelExecutionAllowed ===
      false &&
    activation.executionPolicy.paidServiceUseAllowed === false &&
    activation.executionPolicy.adjudicationAllowedDuringCorrection === false &&
    activation.executionPolicy.scoreDerivationAllowed === false &&
    activation.executionPolicy.publicationReconstructionAllowed === false &&
    activation.executionPolicy.productionMutationAllowed === false &&
    activation.executionPolicy.nextBatchSelectionAllowed === false,
  "forbidden execution capability enabled",
);
assert(
  activation.judgmentModelBoundary.label === "5.6 Sol" &&
    activation.judgmentModelBoundary.slug === "gpt-5.6-sol" &&
    activation.judgmentModelBoundary.reasoningEffort === "low" &&
    activation.judgmentModelBoundary.authentication ===
      "ChatGPT subscription" &&
    activation.judgmentModelBoundary.isolatedPassesPreserved === true &&
    activation.judgmentModelBoundary.scoreBlindnessPreserved === true &&
    activation.judgmentModelBoundary.integerRoundedTiesPermitted === true &&
    activation.judgmentModelBoundary.modelContextsThisStage === 0,
  "judgment-model boundary changed",
);
assert(
  (await hashFile(HARNESS_PATH)) === activation.executionHarness.sha256,
  "execution harness hash mismatch",
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assert((await hashFile(file)) === digest, `source hash mismatch: ${file}`);
}
assert(activation.transcriptLocks.length === 8, "exactly eight transcript locks required");
for (const lock of activation.transcriptLocks) {
  assert((await hashFile(lock.path)) === lock.sha256, `transcript hash mismatch: ${lock.moveId}`);
}
for (const output of Object.values(activation.outputs)) {
  assert(!(await exists(output)), `future correction output already exists: ${output}`);
}
for (const [file, digest] of Object.entries(
  activation.protectedPersistentSourceHashes,
)) {
  assert((await hashFile(file)) === digest, `protected source changed: ${file}`);
}

const plan = JSON.parse(await readFile(activation.records.plan.path, "utf8"));
const request = JSON.parse(await readFile(activation.records.request.path, "utf8"));
const priorExecution = JSON.parse(
  await readFile(activation.records.execution.path, "utf8"),
);
const priorAudit = JSON.parse(await readFile(activation.records.audit.path, "utf8"));
const priorAnalysis = JSON.parse(
  await readFile(activation.records.analysis.path, "utf8"),
);
const priorCost = JSON.parse(await readFile(activation.records.cost.path, "utf8"));

assert(
  plan.status ===
    "frozen-three-reference-and-cost-decimal-validation-overlay-plan-prepared" &&
    plan.referenceDeltaInventoryDigest ===
      activation.referenceDeltaInventoryDigest &&
    plan.proposedCostValidationOverlay.deltaSha256 ===
      activation.costOverlay.deltaSha256 &&
    plan.completeCorrectionDigest === activation.completeCorrectionDigest,
  "frozen correction plan changed",
);
assert(request.calls.length === 8, "frozen request call count changed");
assert(priorExecution.results.length === 8, "frozen execution result count changed");
assert(
  priorExecution.callsCompleted === 8 &&
    priorExecution.retries === 0 &&
    priorExecution.requestFailure === false,
  "prior execution boundary changed",
);
assert(
  priorAudit.totals.verified === 5 &&
    priorAudit.totals.unresolved === 3 &&
    priorAnalysis.gate.passed === false,
  "preserved audio result changed",
);
assert(
  priorCost.costControl.usageDerivedEstimatedCostUsd ===
    activation.costOverlay.preservedSerializedCostUsd &&
    priorCost.costControl.approvedCapExceeded === false,
  "preserved cost result changed",
);
assert(
  JSON.stringify(request.thresholds) ===
    JSON.stringify(activation.executionPolicy.exactThresholds),
  "frozen thresholds changed",
);

for (const overlay of activation.referenceOverlays) {
  const planned = plan.proposedReferenceOverlays.find(
    (item) => item.targetMoveId === overlay.moveId,
  );
  const call = request.calls[overlay.callIndex];
  assert(planned, `${overlay.moveId}: planned overlay missing`);
  assert(
    call.debateNumber === overlay.debateNumber &&
      call.debateId === overlay.debateId &&
      call.moveId === overlay.moveId &&
      call.expectedSpeaker === overlay.expectedSpeaker,
    `${overlay.moveId}: target route changed`,
  );
  assert(
    sha256(Buffer.from(call.verificationExcerpt)) ===
      overlay.originalValueSha256,
    `${overlay.moveId}: original reference hash changed`,
  );
  assert(
    call.verificationExcerpt.includes(overlay.replacementValue) &&
      sha256(Buffer.from(overlay.replacementValue)) ===
        overlay.replacementValueSha256,
    `${overlay.moveId}: replacement route changed`,
  );
  assert(
    planned.deltaSha256 === overlay.deltaSha256 &&
      planned.replacementValue === overlay.replacementValue &&
      planned.replacementValueSha256 === overlay.replacementValueSha256 &&
      planned.correctionExecutedThisStage === false,
    `${overlay.moveId}: plan delta changed`,
  );
}

if (checkOnly) {
  assert(
    activation.status ===
      "frozen-batch-03-audio-correction-execution-harness-prepared-not-authorized",
    "prepared activation status changed",
  );
  assert(
    Object.values(activation.authorization).every((value) => value === false),
    "prepared activation unexpectedly authorizes execution",
  );
  assert(activation.authorizedAt === null, "prepared activation has authorization time");
  assert(
    activation.userExecutionAuthorization === null,
    "prepared activation has execution authorization",
  );
  assert(
    activation.executionBoundary.executionHarnessesPrepared === 1 &&
      activation.executionBoundary.activationManifestsPrepared === 1 &&
      activation.executionBoundary.correctionPassesExecuted === 0 &&
      activation.executionBoundary.cohortValidationPassesExecuted === 0 &&
      activation.executionBoundary.persistentProtectedWrites === 0 &&
      activation.executionBoundary.audioAccesses === 0 &&
      activation.executionBoundary.modelOrApiCalls === 0 &&
      activation.executionBoundary.paidServiceCalls === 0 &&
      activation.executionBoundary.directIncrementalCostUsd === 0,
    "preparation boundary crossed",
  );
  console.log(
    JSON.stringify(
      {
        status: "passed-inactive-correction-harness",
        referenceOverlays: 3,
        costOverlays: 1,
        transcriptsLocked: 8,
        correctionsExecuted: 0,
        cohortReplays: 0,
        models: 0,
        paidServices: 0,
        directIncrementalCostUsd: 0,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

assert(
  activation.status ===
    "frozen-batch-03-audio-correction-deterministic-replay-authorized",
  "correction execution is not activated",
);
assert(
  activation.authorization.correctionExecution === true &&
    activation.authorization.cohortValidationResumption === true &&
    activation.authorization.deterministicAnalysis === true &&
    activation.authorization.resumeStandingAuthorizationAfterPass === true,
  "correction execution authorization missing",
);
for (const key of [
  "audioAccess",
  "transcriptionOrModelExecution",
  "paidServiceUse",
  "retry",
  "rerun",
  "automaticRepair",
  "recursiveCorrection",
  "adjudicationDuringCorrection",
  "finalLedgerAssemblyDuringCorrection",
  "scoreDerivation",
  "publicationReconstruction",
  "productionMutation",
  "nextBatchSelection",
]) {
  assert(activation.authorization[key] === false, `forbidden authorization enabled: ${key}`);
}
assert(
  activation.userExecutionAuthorization?.interpretedScope ===
    activation.executionAuthorizationTemplate.instruction,
  "exact interpreted execution authorization missing",
);
assert(
  activation.userExecutionAuthorization.correctionPasses === 1 &&
    activation.userExecutionAuthorization.cohortReplayPasses === 1 &&
    activation.userExecutionAuthorization.transcripts === 8 &&
    activation.userExecutionAuthorization.attempts === 1 &&
    activation.userExecutionAuthorization.retriesMaximum === 0 &&
    activation.userExecutionAuthorization.rerunsMaximum === 0 &&
    activation.userExecutionAuthorization.automaticRepairsMaximum === 0 &&
    activation.userExecutionAuthorization.recursiveCorrectionsMaximum === 0 &&
    activation.userExecutionAuthorization.directIncrementalCostUsdMaximum === 0,
  "execution authorization limits changed",
);

const startedAt = new Date().toISOString();
const started = Date.now();
const moves = [];
let referenceOverlayApplications = 0;
let costOverlayApplications = 0;
let completedValidations = 0;
let validationFailure = null;
let costValidation = null;

try {
  for (const [callIndex, call] of request.calls.entries()) {
    const lock = activation.transcriptLocks[callIndex];
    assert(
      lock.callIndex === callIndex &&
        lock.debateNumber === call.debateNumber &&
        lock.debateId === call.debateId &&
        lock.moveId === call.moveId &&
        lock.path === call.transcriptPath,
      `${call.moveId}: frozen call order changed`,
    );
    const result = priorExecution.results.find(
      (item) =>
        item.debateNumber === call.debateNumber && item.moveId === call.moveId,
    );
    assert(result?.status === "completed", `${call.moveId}: completed result missing`);
    assert(result.transcriptSha256 === lock.sha256, `${call.moveId}: result hash changed`);
    const transcriptBytes = await readFile(lock.path);
    assert(sha256(transcriptBytes) === lock.sha256, `${call.moveId}: transcript changed`);
    const transcript = JSON.parse(transcriptBytes);
    let verificationExcerpt = call.verificationExcerpt;
    let validationOverlay = null;
    const overlay = activation.referenceOverlays.find(
      (item) => item.moveId === call.moveId,
    );
    if (overlay) {
      assert(callIndex === overlay.callIndex, `${call.moveId}: overlay call index changed`);
      assert(
        sha256(Buffer.from(call.verificationExcerpt)) ===
          overlay.originalValueSha256 &&
          call.verificationExcerpt.includes(overlay.replacementValue),
        `${call.moveId}: overlay source changed`,
      );
      verificationExcerpt = overlay.replacementValue;
      referenceOverlayApplications += 1;
      validationOverlay = {
        correctionNumber: 1,
        operation: overlay.operation,
        field: overlay.field,
        originalValueSha256: overlay.originalValueSha256,
        replacementValueSha256: overlay.replacementValueSha256,
        replacementLexicalTokenCount: overlay.replacementLexicalTokenCount,
        deltaSha256: overlay.deltaSha256,
        persistentProtectedWrite: false,
      };
    }
    const deterministicEvidence = evaluateAttributionTranscript(
      transcript,
      {
        moveId: call.moveId,
        expectedSpeaker: call.expectedSpeaker,
        verificationExcerpt,
      },
      activation.executionPolicy.exactThresholds,
    );
    completedValidations += 1;
    moves.push({
      debateNumber: call.debateNumber,
      debateId: call.debateId,
      moveId: call.moveId,
      expectedSpeaker: call.expectedSpeaker,
      trigger: call.trigger,
      executionStatus: result.status,
      status: deterministicEvidence.status,
      resolvedSpeaker:
        deterministicEvidence.status === "verified" ? call.expectedSpeaker : null,
      clip: {
        path: call.clipPath,
        sha256: call.clipSha256,
        durationSeconds: call.durationSeconds,
        accessedThisPass: false,
      },
      transcript: {
        path: lock.path,
        sha256: lock.sha256,
        model: call.model,
        responseFormat: call.responseFormat,
        persistentMutation: false,
      },
      validationOverlay,
      deterministicEvidence,
    });
  }
  assert(referenceOverlayApplications === 3, "exactly three reference overlays required");

  const exactIntegerUnits =
    priorExecution.usage.inputTokens * 25 +
    priorExecution.usage.outputTokens * 100;
  const exactCostUsd = exactIntegerUnits / 10_000_000;
  const normalizedSerializedCostUsd = Number(
    priorCost.costControl.usageDerivedEstimatedCostUsd.toFixed(7),
  );
  assert(exactIntegerUnits === activation.costOverlay.exactIntegerUnits, "exact cost units changed");
  assert(exactCostUsd === activation.costOverlay.exactCostUsd, "exact cost changed");
  assert(normalizedSerializedCostUsd === exactCostUsd, "normalized cost comparison failed");
  assert(priorCost.costControl.approvedCapExceeded === false, "approved cap result changed");
  costOverlayApplications = 1;
  costValidation = {
    status: "passed-exact-integer-unit-and-seven-decimal-cost-overlay",
    operation: activation.costOverlay.operation,
    inputTokens: priorExecution.usage.inputTokens,
    outputTokens: priorExecution.usage.outputTokens,
    exactIntegerUnits,
    exactCostUsd,
    preservedSerializedCostUsd:
      priorCost.costControl.usageDerivedEstimatedCostUsd,
    normalizedSerializedCostUsd,
    normalizedValuesEqual: true,
    approvedMaximumCostUsd: priorCost.costControl.approvedMaximumCostUsd,
    approvedCapExceeded: false,
    mathematicalCostChanged: false,
    capDispositionChanged: false,
    persistentProtectedWrites: 0,
    deltaSha256: activation.costOverlay.deltaSha256,
  };

  for (const lock of activation.transcriptLocks) {
    assert((await hashFile(lock.path)) === lock.sha256, `transcript changed after replay: ${lock.moveId}`);
  }
  for (const [file, digest] of Object.entries(
    activation.protectedPersistentSourceHashes,
  )) {
    assert((await hashFile(file)) === digest, `protected source changed after replay: ${file}`);
  }
} catch (error) {
  validationFailure = error.stack ?? String(error);
}

const completedAt = new Date().toISOString();
const verified = moves.filter((move) => move.status === "verified").length;
const unresolved = moves.length - verified;
const replayCompleted =
  validationFailure === null && completedValidations === 8 && costOverlayApplications === 1;
const passed = replayCompleted && verified === 8 && costValidation?.normalizedValuesEqual === true;
const status = passed
  ? "passed-all-eight-batch-03-audio-attributions-and-cost-overlay-after-correction"
  : replayCompleted
    ? "batch-03-audio-correction-replay-unresolved"
    : "batch-03-audio-correction-validation-failed";
const nextAuthorizedAction = passed
  ? "prepare-freeze-and-push-batch-03-dispute-only-adjudication-packets-under-standing-authorization"
  : "new-user-approval-required-before-any-further-batch-03-audio-correction";

const executionRecord = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-03-audio-verification-correction-execution",
  protocolId: activation.protocolId,
  status,
  startedAt,
  completedAt,
  elapsedMs: Date.now() - started,
  productionCanary: false,
  batchNumber: 3,
  correctionNumber: 1,
  deterministicPassesAttempted: 1,
  deterministicPassesCompleted: replayCompleted ? 1 : 0,
  reruns: 0,
  retries: 0,
  automaticRepairs: 0,
  recursiveCorrections: 0,
  completedValidations,
  requiredValidations: 8,
  verified,
  unresolved: replayCompleted ? unresolved : null,
  referenceOverlayApplications,
  costOverlayApplications,
  persistentProtectedWrites: 0,
  validationFailure: validationFailure?.slice(-12000) ?? null,
  gateAcceptancePassed: passed,
  audioAccesses: 0,
  semanticAudioEvaluations: 0,
  transcriptionCalls: 0,
  modelOrApiCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  adjudications: 0,
  scoresDerived: 0,
  downstreamStagesBegun: 0,
  nextAuthorizedAction,
};

if (replayCompleted) {
  const debates = [...new Set(moves.map((move) => move.debateNumber))].map(
    (debateNumber) => ({
      debateNumber,
      debateId: moves.find((move) => move.debateNumber === debateNumber).debateId,
      moves: moves.filter((move) => move.debateNumber === debateNumber),
    }),
  );
  const authorization = {
    adjudicationPacketPreparation: passed,
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
    nextBatchSelection: false,
  };
  const audit = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-03-audio-verification-correction-audit",
    protocolId: activation.protocolId,
    status,
    productionCanary: false,
    batchNumber: 3,
    stagingOnly: true,
    corrections: activation.referenceOverlays.map((overlay) => ({
      operation: overlay.operation,
      targetDebateNumber: overlay.debateNumber,
      targetMoveId: overlay.moveId,
      field: overlay.field,
      deltaSha256: overlay.deltaSha256,
      transientOverlayApplications: 1,
      persistentProtectedWrites: 0,
    })),
    debates,
    thresholds: activation.executionPolicy.exactThresholds,
    referenceContract: request.referenceContract,
    totals: {
      requiredMoves: 8,
      verified,
      unresolved,
      preservedPaidDiarizationCalls: priorExecution.callsCompleted,
      preservedUsageDerivedEstimatedCostUsd:
        priorExecution.usageDerivedEstimatedCostUsd,
      directIncrementalCostUsdThisStage: 0,
      retries: 0,
      correctionPasses: 1,
      cohortReplayPasses: 1,
      referenceOverlayApplications,
      costOverlayApplications,
      judgmentModelContexts: 0,
      adjudicationModelContexts: 0,
      scoresDerived: 0,
      audioPlaybackCalls: 0,
      semanticAudioEvaluations: 0,
    },
    authorization,
  };
  const analysis = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-03-audio-verification-correction-analysis",
    protocolId: activation.protocolId,
    status,
    productionCanary: false,
    batchNumber: 3,
    stagingOnly: true,
    gate: {
      passed,
      replayComplete: true,
      requiredMoves: 8,
      verified,
      unresolved,
      costOverlayPassed: costValidation.normalizedValuesEqual,
      deterministicThresholdsApplied: true,
      exactValidatorPreserved: true,
      originalTranscriptsPreserved: true,
      protectedRecordsPreserved: true,
      referenceOverlayApplications,
      costOverlayApplications,
      persistentProtectedWrites: 0,
    },
    costs: {
      preservedUsageDerivedEstimatedCostUsd:
        priorExecution.usageDerivedEstimatedCostUsd,
      exactUsageDerivedEstimatedCostUsd: costValidation.exactCostUsd,
      approvedMaximumCostUsd: costValidation.approvedMaximumCostUsd,
      approvedCapExceeded: false,
      directIncrementalCostUsdThisStage: 0,
      paidServiceCallsThisStage: 0,
      modelOrApiCallsThisStage: 0,
    },
    judgmentModelBoundary: activation.judgmentModelBoundary,
    standingAuthorizationResumedAfterPass: passed,
    authorization,
    nextAuthorizedAction,
  };
  await Promise.all([
    writeFile(activation.outputs.audit, `${JSON.stringify(audit, null, 2)}\n`),
    writeFile(activation.outputs.analysis, `${JSON.stringify(analysis, null, 2)}\n`),
    writeFile(
      activation.outputs.costValidation,
      `${JSON.stringify(costValidation, null, 2)}\n`,
    ),
  ]);
}

await writeFile(
  activation.outputs.execution,
  `${JSON.stringify(executionRecord, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      status,
      replayCompleted,
      completedValidations,
      verified,
      unresolved: replayCompleted ? unresolved : null,
      referenceOverlayApplications,
      costOverlayApplications,
      persistentProtectedWrites: 0,
      retries: 0,
      reruns: 0,
      automaticRepairs: 0,
      recursiveCorrections: 0,
      audioAccesses: 0,
      modelOrApiCalls: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction,
    },
    null,
    2,
  ),
);

if (!passed) process.exitCode = 1;
