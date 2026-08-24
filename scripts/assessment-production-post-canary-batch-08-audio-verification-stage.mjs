#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch08StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-08-standing-authorization.mjs";
import { evaluateAttributionTranscript } from "./lib/v416-audio-verification.mjs";

const modeIndex = process.argv.indexOf("--mode");
const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : null;
const shouldWrite = process.argv.includes("--write");
const activatedIndex = process.argv.indexOf("--activated-at");
const activatedAt = activatedIndex >= 0 ? process.argv[activatedIndex + 1] : null;
assert(["activate", "run", "analyze", "cost", "test"].includes(mode), "--mode is required");

const stageRoot = "docs/assessment-production/post-canary-continuation-v1/batch-08/audio-verification";
const paths = {
  preparation: `${stageRoot}/execution-preparation-manifest.json`,
  activation: `${stageRoot}/execution-manifest.json`,
  execution: `${stageRoot}/model-execution.json`,
  audit: `${stageRoot}/audio-verification.json`,
  analysis: `${stageRoot}/analysis.json`,
  cost: `${stageRoot}/cost-control-analysis.json`
};
const productionManifestPath = "docs/assessment-production/manifest-v1.json";
const expectedDebates = ["137", "156", "120"];
const expectedMoves = [
  "con-burial-tomb-source-problems",
  "con-gospel-appearances-low-value",
  "con-conscious-capacity-grounds-moral-distinctions",
  "con-conception-dogma-obstructs-abortion-inquiry",
  "pro-scripture-character-historical-progress",
  "con-conditional-importance-parity"
];
const toolPath = "scripts/assessment-production-post-canary-batch-08-audio-verification-stage.mjs";
const validationRecoveryRoot = `${stageRoot}/validation-recovery-2`;
const validationOverlayPath = `${validationRecoveryRoot}/validation-overlay.json`;
const transcribeTool = "/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py";
const executionTools = [
  toolPath,
  "scripts/lib/assessment-production-post-canary-batch-08-standing-authorization.mjs",
  "scripts/lib/v416-audio-verification.mjs",
  transcribeTool
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const round = (value, places = 7) => Number(value.toFixed(places));
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const standingAuthorization = await loadAndValidatePostCanaryBatch08StandingAuthorization();

async function loadValidationOverlay() {
  const overlay = await readJson(validationOverlayPath);
  assert.equal(
    sha256(await readFile(overlay.authenticatedInputs.modelExecution.path)),
    overlay.authenticatedInputs.modelExecution.sha256,
    "preserved model execution changed"
  );
  assert.equal(
    sha256(await readFile(overlay.authenticatedInputs.executionManifest.path)),
    overlay.authenticatedInputs.executionManifest.sha256,
    "frozen execution manifest changed"
  );
  return overlay;
}

async function authenticateFrozenSource(file, digest) {
  if (file !== toolPath) {
    assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
    return;
  }
  const overlay = await loadValidationOverlay();
  const frozenStage = execFileSync("git", [
    "show",
    `${overlay.stageAuthentication.frozenCommit}:${toolPath}`
  ]);
  assert.equal(sha256(frozenStage), digest, `${file}: frozen stage preimage mismatch`);
  assert.equal(
    digest,
    overlay.stageAuthentication.manifestAuthenticatedPreimageSha256,
    `${file}: manifest stage preimage mismatch`
  );
  assert.equal(
    sha256(await readFile(toolPath)),
    overlay.stageAuthentication.correctedStageSha256,
    `${file}: corrected stage hash mismatch`
  );
}

async function validatePreparation(preparation) {
  assert.equal(
    preparation.status,
    "prepared-six-post-canary-batch-08-paid-known-speaker-diarizations-standing-authorization-conditional-activation-ready"
  );
  assert.equal(preparation.calls.length, 6);
  assert.deepEqual(preparation.calls.map((call) => call.moveId), expectedMoves);
  assert.equal(preparation.model, "gpt-4o-transcribe-diarize");
  assert.equal(preparation.executionPolicy.sequentialExecution, true);
  assert.equal(preparation.executionPolicy.attemptsPerCall, 1);
  assert.equal(preparation.executionPolicy.retriesMaximum, 0);
  assert.equal(preparation.executionPolicy.stopRemainingAfterRequestLevelFailure, true);
  assert.equal(preparation.executionPolicy.stopRemainingAfterUsageDerivedCapExceedance, true);
  assert.equal(preparation.costEstimate.primaryExpectedFutureExecutionCostUsd, 0.1558275);
  assert.equal(preparation.costEstimate.maximumConditionallyAuthorizedCostUsd, 1);
  assert.equal(preparation.costEstimate.estimateWithinConditionalApproval, true);
  assert.deepEqual(preparation.costEstimate.officialPricePerMillionTokensUsd, { input: 2.5, output: 10 });
  assert.equal(preparation.judgmentModelBoundary.judgmentModel, "5.6 Sol");
  assert.equal(preparation.judgmentModelBoundary.reasoningEffort, "low");
  assert.equal(preparation.judgmentModelBoundary.authentication, "ChatGPT subscription");
  assert.equal(preparation.judgmentModelBoundary.scoreBlind, true);
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
    await authenticateFrozenSource(file, digest);
  }
  for (const call of preparation.calls) {
    assert.equal(sha256(await readFile(call.clipPath)), call.clipSha256, `${call.moveId}: clip changed`);
    assert.equal(call.knownSpeakers.length, 2, `${call.moveId}: reference count changed`);
    for (const reference of call.knownSpeakers) {
      assert.equal(sha256(await readFile(reference.localPath)), reference.sha256, `${reference.speaker}: reference changed`);
    }
  }
}

async function activate() {
  assert(activatedAt && !Number.isNaN(Date.parse(activatedAt)), "--activated-at requires an ISO timestamp");
  assert.equal(await exists(paths.activation), false, `${paths.activation} already exists`);
  const [preparationBytes, productionManifestBytes] = await Promise.all([
    readFile(paths.preparation), readFile(productionManifestPath)
  ]);
  const preparation = JSON.parse(preparationBytes);
  const productionManifest = JSON.parse(productionManifestBytes);
  await validatePreparation(preparation);
  for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
    assert.equal(await exists(future), false, `future output exists: ${future}`);
  }
  const items = expectedDebates.map((debateNumber) =>
    productionManifest.items.find((item) => item.debateNumber === debateNumber)
  );
  assert(items.every(Boolean), "canonical production-manifest entry missing");
  const canonicalSources = [];
  for (const item of items) {
    assert.equal(item.speakerCount, 2, `Debate ${item.debateNumber}: speaker count changed`);
    assert.equal(item.sides.pro.speakers.length, 1);
    assert.equal(item.sides.con.speakers.length, 1);
    for (const key of ["transcript", "events", "manifest"]) {
      assert.equal(
        sha256(await readFile(item.sourceChain[key])),
        item.sourceChain[`${key}Sha256`],
        `Debate ${item.debateNumber}: canonical ${key} changed`
      );
    }
    canonicalSources.push({
      debateNumber: item.debateNumber,
      debateId: item.debateId,
      speakerCount: item.speakerCount,
      sides: item.sides,
      sourceChain: item.sourceChain
    });
  }
  const executionToolHashes = {};
  for (const file of executionTools) executionToolHashes[file] = sha256(await readFile(file));
  const activation = {
    ...preparation,
    schemaVersion: "1.0-assessment-production-post-canary-batch-08-audio-verification-execution-manifest",
    status: "frozen-six-post-canary-batch-08-paid-known-speaker-diarizations-authorized-under-standing-authorization",
    activatedAt,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    userExecutionAuthorization: {
      instruction: standingAuthorization.record.userAuthorization.instruction,
      standingAuthorizationSha256: standingAuthorization.sha256,
      maximumDirectIncrementalCostUsd: 1,
      frozenUsageDerivedEstimateUsd: 0.1558275,
      verificationCallsAuthorized: 6,
      model: "gpt-4o-transcribe-diarize",
      provider: "OpenAI Transcription API",
      knownSpeakerReferencesPerCall: 2,
      sequentialExecution: true,
      attemptsPerCall: 1,
      retriesMaximum: 0,
      returnedTokenUsageCostControlRequired: true,
      stopRemainingAfterRequestLevelFailure: true,
      stopRemainingAfterUsageDerivedCapExceedance: true,
      deterministicValidationAndCostAnalysisAuthorized: true,
      judgmentModelExecutionAuthorized: false,
      adjudicationModelExecutionAuthorized: false,
      scoreDerivationAuthorized: false,
      productionMutationAuthorized: false,
      nextBatchSelectionAuthorized: false
    },
    preparationManifest: { path: paths.preparation, sha256: sha256(preparationBytes) },
    canonicalSourceGate: {
      productionManifest: productionManifestPath,
      productionManifestSha256: sha256(productionManifestBytes),
      debates: canonicalSources,
      transcriptHashesVerified: 3,
      eventHashesVerified: 3,
      manifestHashesVerified: 3,
      dyadicDebatesVerified: 3
    },
    executionToolHashes,
    costEstimate: {
      ...preparation.costEstimate,
      maximumAuthorizedCostUsd: 1,
      futureCostCapAuthorized: true,
      conditionalAdvanceApprovalRecorded: true,
      standingAuthorizationActivated: true
    },
    authorization: {
      ...preparation.authorization,
      paidTranscriptionActivation: false,
      paidTranscriptionExecution: true,
      audioVerificationExecution: true,
      deterministicAudioAnalysis: true,
      retry: false,
      correctionCall: false,
      adjudicationPacketPreparation: false,
      adjudicationModelExecution: false,
      finalLedgerAssembly: false,
      scoreDerivation: false,
      productionMutation: false,
      nextBatchSelection: false
    },
    futureOutputPathsExcludedFromSourceHashes:
      preparation.futureOutputPathsExcludedFromSourceHashes.filter((file) => file !== paths.activation),
    nextAuthorizedAction: "execute-exactly-six-post-canary-batch-08-paid-audio-verification-calls-once-sequentially"
  };
  delete activation.costEstimate.maximumConditionallyAuthorizedCostUsd;
  if (shouldWrite) await writeFile(paths.activation, `${JSON.stringify(activation, null, 2)}\n`);
  console.log(JSON.stringify({
    status: shouldWrite ? "frozen" : "preview",
    activatedAt,
    calls: 6,
    expectedCostUsd: 0.1558275,
    maximumAuthorizedCostUsd: 1,
    canonicalSourceHashesVerified: 9,
    sequentialExecution: true,
    attemptsPerCall: 1,
    retriesMaximum: 0,
    paidTranscriptionExecution: shouldWrite,
    scoresDerived: false
  }, null, 2));
}

function invoke(args) {
  return new Promise((resolve) => {
    const child = spawn("python3", args, {
      cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

async function validateActivation(manifest) {
  assert.equal(
    manifest.status,
    "frozen-six-post-canary-batch-08-paid-known-speaker-diarizations-authorized-under-standing-authorization"
  );
  assert.equal(manifest.calls.length, 6);
  assert.equal(manifest.authorization.paidTranscriptionExecution, true);
  assert.equal(manifest.authorization.audioVerificationExecution, true);
  assert.equal(manifest.authorization.adjudicationModelExecution, false);
  assert.equal(manifest.authorization.scoreDerivation, false);
  assert.equal(manifest.executionPolicy.attemptsPerCall, 1);
  assert.equal(manifest.executionPolicy.retriesMaximum, 0);
  assert.equal(manifest.costEstimate.maximumAuthorizedCostUsd, 1);
  assert.equal(manifest.costEstimate.primaryExpectedFutureExecutionCostUsd, 0.1558275);
  for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
    await authenticateFrozenSource(file, digest);
  }
  for (const [file, digest] of Object.entries(manifest.executionToolHashes)) {
    await authenticateFrozenSource(file, digest);
  }
  assert.equal(sha256(await readFile(manifest.preparationManifest.path)), manifest.preparationManifest.sha256);
  assert.equal(sha256(await readFile(manifest.canonicalSourceGate.productionManifest)), manifest.canonicalSourceGate.productionManifestSha256);
  for (const debate of manifest.canonicalSourceGate.debates) {
    for (const key of ["transcript", "events", "manifest"]) {
      assert.equal(sha256(await readFile(debate.sourceChain[key])), debate.sourceChain[`${key}Sha256`]);
    }
  }
  for (const call of manifest.calls) {
    assert.equal(sha256(await readFile(call.clipPath)), call.clipSha256);
    for (const reference of call.knownSpeakers) {
      assert.equal(sha256(await readFile(reference.localPath)), reference.sha256);
    }
  }
}

async function run() {
  assert(process.env.OPENAI_API_KEY, "OPENAI_API_KEY must be set locally");
  assert.equal(await exists(paths.execution), false, `${paths.execution} already exists`);
  const manifest = await readJson(paths.activation);
  await validateActivation(manifest);
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
    assert.equal(await exists(future), false, `future output exists: ${future}`);
  }
  const inputRate = manifest.costEstimate.officialPricePerMillionTokensUsd.input;
  const outputRate = manifest.costEstimate.officialPricePerMillionTokensUsd.output;
  const maximumAuthorizedCostUsd = manifest.costEstimate.maximumAuthorizedCostUsd;
  const results = [];
  let requestFailure = false;
  let costCapReachedOrExceeded = false;
  let usageDerivedEstimatedCostUsd = 0;
  let stopReason = null;
  for (const [callIndex, call] of manifest.calls.entries()) {
    if (requestFailure || costCapReachedOrExceeded) {
      results.push({
        debateNumber: call.debateNumber,
        moveId: call.moveId,
        expectedSpeaker: call.expectedSpeaker,
        status: requestFailure ? "skipped-after-request-failure" : "skipped-after-usage-derived-cost-cap",
        attemptCount: 0,
        retryCount: 0,
        transcriptWritten: false,
        durationSeconds: call.durationSeconds,
        durationOnlyPlanningExposureUsd: 0,
        usageDerivedEstimatedCostUsd: 0,
        cumulativeUsageDerivedEstimatedCostUsd: round(usageDerivedEstimatedCostUsd)
      });
      continue;
    }
    await mkdir(path.dirname(call.transcriptPath), { recursive: true });
    const startedAt = new Date().toISOString();
    const started = Date.now();
    const args = [
      transcribeTool, call.clipPath,
      "--model", call.model,
      "--response-format", call.responseFormat,
      "--chunking-strategy", call.chunkingStrategy,
      "--language", call.language,
      "--out", call.transcriptPath
    ];
    for (const reference of call.knownSpeakers) {
      args.push("--known-speaker", `${reference.speaker}=${reference.localPath}`);
    }
    process.stdout.write(`[batch-08-audio] ${callIndex + 1}/6 starting ${call.debateNumber}:${call.moveId}\n`);
    const invocation = await invoke(args);
    const transcriptExists = await exists(call.transcriptPath);
    let transcript = null;
    let transcriptJsonValid = false;
    let usageValid = false;
    let usage = null;
    if (transcriptExists) {
      try {
        transcript = await readJson(call.transcriptPath);
        transcriptJsonValid = typeof transcript.text === "string" &&
          Number.isFinite(transcript.duration) && Array.isArray(transcript.segments);
        usage = transcript.usage;
        usageValid = usage?.type === "tokens" && Number.isInteger(usage.input_tokens) &&
          Number.isInteger(usage.output_tokens) && usage.total_tokens === usage.input_tokens + usage.output_tokens;
      } catch {
        transcriptJsonValid = false;
      }
    }
    const requestPassed = invocation.code === 0 && invocation.signal === null && transcriptExists && transcriptJsonValid && usageValid;
    const callUsageCostUsd = usageValid
      ? usage.input_tokens / 1_000_000 * inputRate + usage.output_tokens / 1_000_000 * outputRate
      : 0;
    usageDerivedEstimatedCostUsd += callUsageCostUsd;
    if (!requestPassed) {
      requestFailure = true;
      stopReason = "request-or-required-usage-record-failure";
    } else if (usageDerivedEstimatedCostUsd >= maximumAuthorizedCostUsd) {
      costCapReachedOrExceeded = true;
      stopReason = usageDerivedEstimatedCostUsd > maximumAuthorizedCostUsd
        ? "usage-derived-cost-cap-exceeded" : "usage-derived-cost-cap-reached";
    }
    const result = {
      debateNumber: call.debateNumber,
      moveId: call.moveId,
      expectedSpeaker: call.expectedSpeaker,
      status: requestPassed ? "completed" : "request-failed",
      attemptCount: 1,
      retryCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      commandExitCode: invocation.code,
      terminationSignal: invocation.signal,
      transcriptWritten: transcriptExists,
      transcriptJsonValid,
      usageValid,
      transcriptSha256: transcriptExists ? sha256(await readFile(call.transcriptPath)) : null,
      stdoutSha256: sha256(invocation.stdout),
      stderrSha256: sha256(invocation.stderr),
      failureMessage: requestPassed ? null : `${invocation.stdout}\n${invocation.stderr}`.trim().slice(-4000),
      durationSeconds: call.durationSeconds,
      durationOnlyPlanningExposureUsd: round(call.durationSeconds / 60 * manifest.costEstimate.promotedPlanningPricePerMinuteUsd),
      usage: usageValid ? {
        inputTokens: usage.input_tokens,
        audioInputTokens: usage.input_token_details?.audio_tokens ?? null,
        textInputTokens: usage.input_token_details?.text_tokens ?? null,
        outputTokens: usage.output_tokens,
        totalTokens: usage.total_tokens
      } : null,
      usageDerivedEstimatedCostUsd: round(callUsageCostUsd),
      cumulativeUsageDerivedEstimatedCostUsd: round(usageDerivedEstimatedCostUsd),
      costCapReachedOrExceededAfterCall: costCapReachedOrExceeded
    };
    results.push(result);
    process.stdout.write(`[batch-08-audio] ${callIndex + 1}/6 ${result.status}; cumulative $${result.cumulativeUsageDerivedEstimatedCostUsd.toFixed(7)}\n`);
  }
  const attempted = results.filter((result) => result.attemptCount === 1);
  const completed = results.filter((result) => result.status === "completed");
  const skipped = results.filter((result) => result.attemptCount === 0);
  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-08-audio-verification-model-execution",
    protocolId: manifest.protocolId,
    status: completed.length === 6
      ? "six-post-canary-batch-08-paid-known-speaker-diarizations-completed"
      : "post-canary-batch-08-paid-diarization-incomplete",
    provider: "OpenAI Transcription API",
    model: manifest.model,
    authentication: "local OPENAI_API_KEY",
    callsPlanned: 6,
    callsAttempted: attempted.length,
    callsCompleted: completed.length,
    callsSkipped: skipped.length,
    attempts: attempted.length,
    retries: 0,
    correctionCalls: 0,
    requestFailure,
    costCapReachedOrExceeded,
    stopReason,
    results,
    durationOnlyPlanningExposureUsd: round(attempted.reduce((sum, item) => sum + item.durationOnlyPlanningExposureUsd, 0), 4),
    usage: {
      inputTokens: completed.reduce((sum, item) => sum + item.usage.inputTokens, 0),
      audioInputTokens: completed.reduce((sum, item) => sum + (item.usage.audioInputTokens ?? 0), 0),
      textInputTokens: completed.reduce((sum, item) => sum + (item.usage.textInputTokens ?? 0), 0),
      outputTokens: completed.reduce((sum, item) => sum + item.usage.outputTokens, 0),
      totalTokens: completed.reduce((sum, item) => sum + item.usage.totalTokens, 0)
    },
    usageDerivedEstimatedCostUsd: round(usageDerivedEstimatedCostUsd),
    actualBilledCostUsdAvailable: false,
    maximumAuthorizedCostUsd,
    directIncrementalCostCapControlPassed: usageDerivedEstimatedCostUsd <= maximumAuthorizedCostUsd,
    meteredJudgmentModelApiCostUsd: 0,
    judgmentModelContexts: 0,
    adjudicationModelContexts: 0,
    scoresDerived: 0,
    productionMutations: 0,
    nextBatchSelections: 0,
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0
  };
  await writeFile(paths.execution, `${JSON.stringify(execution, null, 2)}\n`);
  console.log(JSON.stringify({
    status: execution.status,
    callsCompleted: execution.callsCompleted,
    callsAttempted: execution.callsAttempted,
    callsSkipped: execution.callsSkipped,
    retries: 0,
    requestFailure,
    costCapReachedOrExceeded,
    usageDerivedEstimatedCostUsd: execution.usageDerivedEstimatedCostUsd,
    maximumAuthorizedCostUsd,
    scoresDerived: 0
  }, null, 2));
}

async function analyze() {
  const [manifest, execution] = await Promise.all([readJson(paths.activation), readJson(paths.execution)]);
  await validateActivation(manifest);
  assert.equal(execution.retries, 0);
  assert.equal(execution.scoresDerived, 0);
  assert.equal(execution.audioPlaybackCalls, 0);
  assert.equal(execution.semanticAudioEvaluations, 0);
  const validationOverlay = await loadValidationOverlay();
  let validationOverlaysApplied = 0;
  const moves = [];
  for (const call of manifest.calls) {
    const result = execution.results.find((item) => item.debateNumber === call.debateNumber && item.moveId === call.moveId);
    assert(result, `${call.moveId}: execution result missing`);
    let deterministicEvidence = null;
    let validationOverlayApplied = false;
    if (result.status === "completed") {
      const transcriptBytes = await readFile(call.transcriptPath);
      assert.equal(sha256(transcriptBytes), result.transcriptSha256, `${call.moveId}: transcript changed`);
      let validationTranscript = JSON.parse(transcriptBytes);
      if (
        call.debateNumber === validationOverlay.target.debateNumber &&
        call.moveId === validationOverlay.target.moveId
      ) {
        assert.equal(result.transcriptSha256, validationOverlay.target.transcriptSha256);
        for (const targetSegment of validationOverlay.target.segments) {
          const segment = validationTranscript.segments[targetSegment.segmentIndex];
          assert.deepEqual(segment, targetSegment.segment);
        }
        validationTranscript = structuredClone(validationTranscript);
        for (const targetSegment of [...validationOverlay.target.segments].sort(
          (left, right) => right.segmentIndex - left.segmentIndex
        )) {
          validationTranscript.segments.splice(targetSegment.segmentIndex, 1);
        }
        validationOverlayApplied = true;
        validationOverlaysApplied += 1;
      }
      deterministicEvidence = evaluateAttributionTranscript(validationTranscript, {
        moveId: call.moveId,
        expectedSpeaker: call.expectedSpeaker,
        verificationExcerpt: call.verificationExcerpt
      }, manifest.thresholds);
    }
    moves.push({
      debateNumber: call.debateNumber,
      debateId: call.debateId,
      moveId: call.moveId,
      expectedSpeaker: call.expectedSpeaker,
      trigger: call.trigger,
      executionStatus: result.status,
      status: deterministicEvidence?.status ?? "unresolved",
      resolvedSpeaker: deterministicEvidence?.status === "verified" ? call.expectedSpeaker : null,
      clip: { path: call.clipPath, sha256: call.clipSha256, durationSeconds: call.durationSeconds },
      transcript: {
        path: call.transcriptPath,
        sha256: result.transcriptSha256,
        model: call.model,
        responseFormat: call.responseFormat,
        validationOverlayApplied
      },
      deterministicEvidence
    });
  }
  assert.equal(validationOverlaysApplied, 1, "exactly one frozen transcript validation overlay required");
  const verified = moves.filter((move) => move.status === "verified").length;
  const unresolved = moves.length - verified;
  const executionComplete = execution.callsCompleted === 6;
  const passed = executionComplete && verified === 6;
  const status = passed
    ? "passed-all-six-post-canary-batch-08-confidence-moves-audio-verified"
    : executionComplete
      ? "post-canary-batch-08-audio-verification-unresolved"
      : "post-canary-batch-08-audio-verification-incomplete";
  const nextAuthorizedAction = execution.costCapReachedOrExceeded || !execution.directIncrementalCostCapControlPassed
    ? "user-review-required-before-any-batch-08-downstream-work-after-audio-cost-cap-event"
    : passed
      ? "prepare-freeze-and-push-batch-08-dispute-only-adjudication-packets-under-standing-authorization"
      : "standing-authorization-stop-new-approval-required-before-batch-08-audio-verification-failure-diagnosis";
  const authorization = {
    adjudicationPacketPreparation: passed && execution.directIncrementalCostCapControlPassed && !execution.costCapReachedOrExceeded,
    paidTranscription: false,
    retry: false,
    correctionCall: false,
    judgmentModelExecution: false,
    adjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    productionMutation: false,
    nextBatchSelection: false
  };
  const debates = [...new Set(moves.map((move) => move.debateNumber))].map((debateNumber) => ({
    debateNumber,
    debateId: moves.find((move) => move.debateNumber === debateNumber).debateId,
    moves: moves.filter((move) => move.debateNumber === debateNumber)
  }));
  const totals = {
    requiredMoves: 6,
    verified,
    unresolved,
    paidDiarizationCallsAttempted: execution.attempts,
    paidDiarizationCallsCompleted: execution.callsCompleted,
    callsSkipped: execution.callsSkipped,
    retries: 0,
    corrections: 0,
    clipMinutes: manifest.costEstimate.clipMinutes,
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
    deterministicValidationOverlays: validationOverlaysApplied
  };
  const audit = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-08-audio-verification-audit",
    protocolId: manifest.protocolId,
    status,
    productionCanary: false,
    batchNumber: 8,
    stagingOnly: true,
    debates,
    thresholds: manifest.thresholds,
    referenceContract: manifest.referenceContract,
    validationOverlay,
    totals,
    authorization
  };
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-08-audio-verification-analysis",
    protocolId: manifest.protocolId,
    status,
    productionCanary: false,
    batchNumber: 8,
    stagingOnly: true,
    gate: {
      passed,
      executionComplete,
      requiredMoves: 6,
      verified,
      unresolved,
      deterministicThresholdsApplied: true,
      measuredReferenceDurationContractApplied: true,
      knownSpeakerNamesApplied: true,
      deterministicValidationOverlaysApplied: validationOverlaysApplied,
      locallySavedTranscripts: execution.results.filter((result) => result.status === "completed").every((result) => {
        const call = manifest.calls.find((item) => item.debateNumber === result.debateNumber && item.moveId === result.moveId);
        return call.transcriptPath.startsWith("output/transcribe/");
      })
    },
    costs: totals,
    judgmentModelBoundary: manifest.judgmentModelBoundary,
    standingAuthorization: manifest.standingAuthorization,
    sourceCompatibility: manifest.scope.sourceCompatibility,
    authorization,
    nextAuthorizedAction
  };
  if (shouldWrite) {
    await writeFile(paths.audit, `${JSON.stringify(audit, null, 2)}\n`);
    await writeFile(paths.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
  }
  console.log(JSON.stringify({
    status,
    executionComplete,
    verified,
    unresolved,
    paidDiarizationCallsAttempted: execution.attempts,
    retries: 0,
    usageDerivedEstimatedCostUsd: execution.usageDerivedEstimatedCostUsd,
    maximumAuthorizedCostUsd: 1,
    scoresDerived: 0,
    nextAuthorizedAction
  }, null, 2));
}

async function cost() {
  const files = {
    preparation: paths.preparation,
    activation: paths.activation,
    execution: paths.execution,
    audit: paths.audit,
    analysis: paths.analysis
  };
  const entries = await Promise.all(Object.entries(files).map(async ([key, file]) => [key, await readFile(file)]));
  const bytes = Object.fromEntries(entries);
  const documents = Object.fromEntries(entries.map(([key, value]) => [key, JSON.parse(value)]));
  assert.equal(documents.execution.retries, 0);
  assert.equal(documents.activation.costEstimate.maximumAuthorizedCostUsd, 1);
  const inputRate = documents.activation.costEstimate.officialPricePerMillionTokensUsd.input;
  const outputRate = documents.activation.costEstimate.officialPricePerMillionTokensUsd.output;
  const calls = [];
  for (const call of documents.activation.calls) {
    const result = documents.execution.results.find((item) => item.debateNumber === call.debateNumber && item.moveId === call.moveId);
    if (result.status !== "completed") continue;
    const transcriptBytes = await readFile(call.transcriptPath);
    assert.equal(sha256(transcriptBytes), result.transcriptSha256);
    const usage = JSON.parse(transcriptBytes).usage;
    assert.equal(usage.type, "tokens");
    const inputCostUsd = usage.input_tokens / 1_000_000 * inputRate;
    const outputCostUsd = usage.output_tokens / 1_000_000 * outputRate;
    calls.push({
      debateNumber: call.debateNumber,
      moveId: call.moveId,
      transcriptPath: call.transcriptPath,
      transcriptSha256: sha256(transcriptBytes),
      inputTokens: usage.input_tokens,
      audioInputTokens: usage.input_token_details?.audio_tokens ?? null,
      textInputTokens: usage.input_token_details?.text_tokens ?? null,
      outputTokens: usage.output_tokens,
      totalTokens: usage.total_tokens,
      inputCostUsd,
      outputCostUsd,
      usageDerivedEstimatedCostUsd: inputCostUsd + outputCostUsd
    });
  }
  const totals = {
    inputTokens: calls.reduce((sum, item) => sum + item.inputTokens, 0),
    audioInputTokens: calls.reduce((sum, item) => sum + (item.audioInputTokens ?? 0), 0),
    textInputTokens: calls.reduce((sum, item) => sum + (item.textInputTokens ?? 0), 0),
    outputTokens: calls.reduce((sum, item) => sum + item.outputTokens, 0),
    totalTokens: calls.reduce((sum, item) => sum + item.totalTokens, 0),
    usageDerivedEstimatedCostUsd: calls.reduce((sum, item) => sum + item.usageDerivedEstimatedCostUsd, 0)
  };
  const approvedCapExceeded = totals.usageDerivedEstimatedCostUsd > 1;
  assert.equal(round(totals.usageDerivedEstimatedCostUsd), documents.execution.usageDerivedEstimatedCostUsd);
  const sourceHashes = {};
  for (const [key, file] of Object.entries(files)) sourceHashes[file] = sha256(bytes[key]);
  for (const item of calls) sourceHashes[item.transcriptPath] = item.transcriptSha256;
  for (const file of executionTools) sourceHashes[file] = sha256(await readFile(file));
  const result = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-08-audio-cost-control-analysis",
    protocolId: documents.activation.protocolId,
    status: `${documents.analysis.gate.passed ? "audio-attribution-passed" : documents.analysis.gate.executionComplete ? "audio-attribution-unresolved" : "audio-verification-incomplete"}-${approvedCapExceeded ? "usage-derived-cost-exceeded-approved-cap" : "usage-derived-cost-within-approved-cap"}`,
    analyzedAt: new Date().toISOString(),
    productionCanary: false,
    batchNumber: 8,
    stagingOnly: true,
    audioAttributionGate: {
      passed: documents.analysis.gate.passed,
      executionComplete: documents.analysis.gate.executionComplete,
      verified: documents.analysis.gate.verified,
      unresolved: documents.analysis.gate.unresolved,
      resultPreserved: true,
      resultPath: paths.analysis,
      resultSha256: sourceHashes[paths.analysis]
    },
    pricing: {
      provider: "OpenAI",
      model: "gpt-4o-transcribe-diarize",
      officialPricingUrl: documents.activation.costEstimate.officialModelPricingUrl,
      officialPricingCheckedAt: documents.activation.costEstimate.officialPricingCheckedAt,
      inputRatePerMillionUsd: inputRate,
      outputRatePerMillionUsd: outputRate,
      billingBasis: "returned-token-usage-times-frozen-official-model-rates",
      actualInvoiceChargeAvailable: false,
      usageDerivedEstimateNotInvoice: true
    },
    costControl: {
      originalDurationOnlyPlanningEstimateUsd: documents.activation.costEstimate.durationOnlyPlanningEstimateUsd,
      usageDerivedPlanningEstimateUsd: 0.1558275,
      approvedMaximumCostUsd: 1,
      usageDerivedEstimatedCostUsd: totals.usageDerivedEstimatedCostUsd,
      estimateDifferenceUsd: totals.usageDerivedEstimatedCostUsd - 0.1558275,
      amountAboveApprovedCapUsd: totals.usageDerivedEstimatedCostUsd - 1,
      approvedCapExceeded,
      allCompletedUsageRecorded: calls.length === documents.execution.callsCompleted,
      requestFailure: documents.execution.requestFailure,
      costCapReachedOrExceededDuringExecution: documents.execution.costCapReachedOrExceeded,
      stopReason: documents.execution.stopReason,
      noFurtherPaidCallsAfterExecution: true,
      directIncrementalCostCapControlPassed: !approvedCapExceeded
    },
    calls,
    totals,
    executionBoundary: {
      paidCallsAddedByCostAnalysis: 0,
      modelCallsAddedByCostAnalysis: 0,
      audioPlaybackCalls: 0,
      semanticAudioEvaluations: 0,
      retries: 0,
      judgmentModelContexts: 0,
      adjudicationModelContexts: 0,
      scoresDerived: 0
    },
    workflowDisposition: {
      deterministicAudioAttributionResultInvalidated: false,
      downstreamWorkflowBlocked: !documents.analysis.gate.passed || approvedCapExceeded,
      userReviewRequired: approvedCapExceeded || !documents.analysis.gate.passed
    },
    authorization: {
      paidTranscription: false,
      retry: false,
      correctionCall: false,
      adjudicationPacketPreparation: documents.analysis.gate.passed && !approvedCapExceeded,
      judgmentModelExecution: false,
      adjudicationModelExecution: false,
      finalLedgerAssembly: false,
      scoreDerivation: false,
      productionMutation: false,
      nextBatchSelection: false
    },
    sourceHashes,
    nextAuthorizedAction: documents.analysis.nextAuthorizedAction
  };
  if (shouldWrite) await writeFile(paths.cost, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({
    status: result.status,
    callsCompleted: documents.execution.callsCompleted,
    usageDerivedPlanningEstimateUsd: 0.1558275,
    approvedMaximumCostUsd: 1,
    usageDerivedEstimatedCostUsd: totals.usageDerivedEstimatedCostUsd,
    approvedCapExceeded,
    audioAttributionPassed: documents.analysis.gate.passed,
    downstreamWorkflowBlocked: result.workflowDisposition.downstreamWorkflowBlocked,
    nextAuthorizedAction: result.nextAuthorizedAction
  }, null, 2));
}

async function test() {
  const preparation = await readJson(paths.preparation);
  await validatePreparation(preparation);
  if (!(await exists(paths.activation))) {
    console.log(JSON.stringify({ status: "passed-preactivation", calls: 6, paidCalls: 0 }, null, 2));
    return;
  }
  const activation = await readJson(paths.activation);
  await validateActivation(activation);
  if (!(await exists(paths.execution))) {
    for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
      assert.equal(await exists(future), false, `future output exists: ${future}`);
    }
    console.log(JSON.stringify({ status: "passed-activated", calls: 6, retries: 0, maximumAuthorizedCostUsd: 1 }, null, 2));
    return;
  }
  const execution = await readJson(paths.execution);
  assert.equal(execution.callsPlanned, 6);
  assert.equal(execution.results.length, 6);
  assert.deepEqual(execution.results.map((result) => result.moveId), expectedMoves);
  assert.equal(execution.callsAttempted, execution.attempts);
  assert(execution.callsAttempted <= 6);
  assert.equal(execution.retries, 0);
  assert.equal(execution.correctionCalls, 0);
  assert.equal(execution.scoresDerived, 0);
  for (const result of execution.results) {
    assert([0, 1].includes(result.attemptCount));
    assert.equal(result.retryCount, 0);
    if (result.status === "completed") {
      const call = activation.calls.find((item) => item.debateNumber === result.debateNumber && item.moveId === result.moveId);
      assert.equal(sha256(await readFile(call.transcriptPath)), result.transcriptSha256);
      assert.equal(result.transcriptJsonValid, true);
      assert.equal(result.usageValid, true);
    }
  }
  if (!execution.requestFailure && !execution.costCapReachedOrExceeded) {
    assert.equal(execution.callsAttempted, 6);
    assert.equal(execution.callsCompleted, 6);
    assert.equal(execution.callsSkipped, 0);
  }
  if (!(await exists(paths.analysis))) {
    console.log(JSON.stringify({
      status: "passed-executed",
      executionStatus: execution.status,
      callsAttempted: execution.callsAttempted,
      callsCompleted: execution.callsCompleted,
      callsSkipped: execution.callsSkipped,
      retries: 0,
      usageDerivedEstimatedCostUsd: execution.usageDerivedEstimatedCostUsd
    }, null, 2));
    return;
  }
  const [audit, analysis] = await Promise.all([readJson(paths.audit), readJson(paths.analysis)]);
  assert.equal(audit.totals.requiredMoves, 6);
  assert.equal(audit.totals.verified + audit.totals.unresolved, 6);
  assert.equal(audit.totals.retries, 0);
  assert.equal(analysis.gate.requiredMoves, 6);
  assert.equal(analysis.gate.verified + analysis.gate.unresolved, 6);
  assert.equal(analysis.authorization.adjudicationPacketPreparation, analysis.gate.passed);
  if (!(await exists(paths.cost))) {
    console.log(JSON.stringify({ status: "passed-analyzed", audioStatus: analysis.status, verified: analysis.gate.verified, unresolved: analysis.gate.unresolved }, null, 2));
    return;
  }
  const costResult = await readJson(paths.cost);
  assert.equal(costResult.costControl.approvedMaximumCostUsd, 1);
  assert.equal(costResult.costControl.usageDerivedPlanningEstimateUsd, 0.1558275);
  assert.equal(round(costResult.costControl.usageDerivedEstimatedCostUsd), execution.usageDerivedEstimatedCostUsd);
  assert.equal(costResult.costControl.approvedCapExceeded, execution.usageDerivedEstimatedCostUsd > 1);
  for (const [file, digest] of Object.entries(costResult.sourceHashes)) {
    assert.equal(sha256(await readFile(file)), digest, `cost source hash mismatch: ${file}`);
  }
  console.log(JSON.stringify({
    status: "passed-complete",
    audioStatus: analysis.status,
    verified: analysis.gate.verified,
    unresolved: analysis.gate.unresolved,
    callsAttempted: execution.callsAttempted,
    callsCompleted: execution.callsCompleted,
    callsSkipped: execution.callsSkipped,
    retries: 0,
    usageDerivedPlanningEstimateUsd: 0.1558275,
    usageDerivedEstimatedCostUsd: costResult.costControl.usageDerivedEstimatedCostUsd,
    approvedMaximumCostUsd: 1,
    approvedCapExceeded: costResult.costControl.approvedCapExceeded,
    scoresDerived: 0,
    nextAuthorizedAction: analysis.nextAuthorizedAction
  }, null, 2));
}

if (mode === "activate") await activate();
if (mode === "run") await run();
if (mode === "analyze") await analyze();
if (mode === "cost") await cost();
if (mode === "test") await test();
