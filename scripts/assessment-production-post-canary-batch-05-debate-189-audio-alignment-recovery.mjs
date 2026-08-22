#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { evaluateAttributionTranscript } from "./lib/v416-audio-verification.mjs";

const modeIndex = process.argv.indexOf("--mode");
const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : null;
const write = process.argv.includes("--write");
const timeIndex = process.argv.indexOf("--at");
const at = timeIndex >= 0 ? process.argv[timeIndex + 1] : null;
assert(["prepare", "activate", "run", "test"].includes(mode), "--mode is required");
if (["prepare", "activate"].includes(mode)) {
  assert(at && !Number.isNaN(Date.parse(at)), "--at requires an ISO timestamp");
}

const batchRoot = "docs/assessment-production/post-canary-continuation-v1/batch-05";
const stageRoot = `${batchRoot}/audio-verification`;
const recoveryRoot = `${stageRoot}/debate-189-timeline-alignment-recovery`;
const mediaRoot = "output/transcribe/assessment-production-post-canary-batch-05-audio-verification";
const paths = {
  plan: `${recoveryRoot}/plan.json`,
  activation: `${recoveryRoot}/execution-activation.json`,
  execution: `${recoveryRoot}/model-execution.json`,
  audit: `${recoveryRoot}/audio-verification.json`,
  analysis: `${recoveryRoot}/analysis.json`,
  cost: `${recoveryRoot}/cost-control-analysis.json`,
  request: `${stageRoot}/execution-manifest.json`,
  priorExecution: `${stageRoot}/model-execution.json`,
  priorAudit: `${stageRoot}/audio-verification.json`,
  priorAnalysis: `${stageRoot}/analysis.json`,
  priorCost: `${stageRoot}/cost-control-analysis.json`,
  diagnosis: `${stageRoot}/failure-diagnosis.json`,
  priorCorrectionPlan: `${stageRoot}/correction-plan.json`,
  candidateDiscovery: `${batchRoot}/source-preparation/discovery-outputs/debate-189-chunk-002.json`,
  canonicalEvents: ".assessment-cache/captions/3DHvNRK452c/events.json",
  canonicalTranscript: ".assessment-cache/captions/3DHvNRK452c/transcript.txt",
  canonicalManifest: ".assessment-cache/captions/3DHvNRK452c/manifest.json",
  clip: `${mediaRoot}/debate-189/clips/con-simple-laws-beneath-cell-complexity.mp3`,
  jamesReference: `${mediaRoot}/debate-189/references-correction-1/james-tour.mp3`,
  leeReference: `${mediaRoot}/debate-189/references-correction-1/lee-cronin.mp3`,
  correctionTranscript: `${mediaRoot}/debate-189/transcripts-correction-1/con-simple-laws-beneath-cell-complexity.transcript.json`
};
const toolPath = "scripts/assessment-production-post-canary-batch-05-debate-189-audio-alignment-recovery.mjs";
const validatorPath = "scripts/lib/v416-audio-verification.mjs";
const standingPath = `${batchRoot}/standing-authorization.json`;
const transcribeTool = "/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py";
const ffmpeg = "/opt/homebrew/bin/ffmpeg";
const ffprobe = "/opt/homebrew/bin/ffprobe";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const round = (value, places = 7) => Number(value.toFixed(places));
const lexicalTokens = (value) =>
  String(value ?? "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? [];
const bagRecall = (reference, candidate) => {
  const referenceTokens = lexicalTokens(reference);
  const counts = new Map();
  for (const token of lexicalTokens(candidate)) counts.set(token, (counts.get(token) ?? 0) + 1);
  let matched = 0;
  for (const token of referenceTokens) {
    const available = counts.get(token) ?? 0;
    if (available > 0) {
      matched += 1;
      counts.set(token, available - 1);
    }
  }
  return matched / referenceTokens.length;
};
const hashFiles = async (files) => {
  const result = {};
  for (const file of files) result[file] = sha256(await readFile(file));
  return result;
};
const probe = (file) => {
  const data = JSON.parse(execFileSync(ffprobe, [
    "-v", "error", "-select_streams", "a:0",
    "-show_entries", "format=duration:stream=channels,sample_rate", "-of", "json", file
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  return {
    durationSeconds: Number(data.format?.duration),
    channels: Number(data.streams?.[0]?.channels),
    sampleRateHz: Number(data.streams?.[0]?.sample_rate)
  };
};

const sourceFiles = [
  toolPath,
  validatorPath,
  standingPath,
  transcribeTool,
  paths.request,
  paths.priorExecution,
  paths.priorAudit,
  paths.priorAnalysis,
  paths.priorCost,
  paths.diagnosis,
  paths.priorCorrectionPlan,
  paths.candidateDiscovery,
  paths.canonicalEvents,
  paths.canonicalTranscript,
  paths.canonicalManifest,
  paths.clip,
  `${mediaRoot}/debate-189/references/james-tour.mp3`,
  `${mediaRoot}/debate-189/references/lee-cronin.mp3`
];

async function buildAlignment() {
  const [request, priorExecution, priorAudit, diagnosis, priorCorrectionPlan, discovery, events] = await Promise.all([
    readJson(paths.request),
    readJson(paths.priorExecution),
    readJson(paths.priorAudit),
    readJson(paths.diagnosis),
    readJson(paths.priorCorrectionPlan),
    readJson(paths.candidateDiscovery),
    readJson(paths.canonicalEvents)
  ]);
  assert.equal(diagnosis.status, "frozen-four-batch-05-audio-unresolved-diagnosed");
  assert.equal(priorCorrectionPlan.workflowDisposition.activationBlocked, true);
  assert.equal(priorExecution.callsCompleted, 6);
  assert.equal(priorExecution.retries, 0);
  assert.equal(priorAudit.totals.unresolved, 4);
  const callIndex = request.calls.findIndex((call) => call.debateNumber === "189");
  assert.equal(callIndex, 3);
  const call = request.calls[callIndex];
  const result = priorExecution.results[callIndex];
  assert.equal(call.moveId, "con-simple-laws-beneath-cell-complexity");
  assert.equal(result.transcriptSha256, "714acc24092d86ca243cb69107200dda7e87a05300364eb5a160184742be917e");
  assert.equal(sha256(await readFile(call.transcriptPath)), result.transcriptSha256);
  const transcript = await readJson(call.transcriptPath);
  const specs = [
    { candidateId: "c002-05", speaker: "James Tour", startEvent: 1228, endEvent: 1275 },
    { candidateId: "c002-06", speaker: "Lee Cronin", startEvent: 1276, endEvent: 1366 }
  ];
  const windows = [];
  for (const spec of specs) {
    const candidate = discovery.candidates.find((item) => item.candidateId === spec.candidateId);
    assert(candidate);
    assert.equal(candidate.speaker, spec.speaker);
    assert.equal(candidate.attributionConfidence, "high");
    assert.deepEqual(candidate.sourceWindow, { startEvent: spec.startEvent, endEvent: spec.endEvent });
    const canonicalText = events.slice(spec.startEvent, spec.endEvent + 1).map((event) => event.text).join(" ");
    const otherSpec = specs.find((item) => item.speaker !== spec.speaker);
    const otherCanonicalText = events.slice(otherSpec.startEvent, otherSpec.endEvent + 1)
      .map((event) => event.text).join(" ");
    const candidates = transcript.segments.map((segment, segmentIndex) => ({
      segmentIndex,
      segmentId: segment.id,
      segmentStart: segment.start,
      segmentEnd: segment.end,
      durationSeconds: segment.end - segment.start,
      preservedProviderLabel: segment.speaker,
      canonicalSpeakerRecall: bagRecall(segment.text, canonicalText),
      competingSpeakerRecall: bagRecall(segment.text, otherCanonicalText)
    })).map((item) => ({
      ...item,
      recallMargin: item.canonicalSpeakerRecall - item.competingSpeakerRecall
    })).filter((item) =>
      item.durationSeconds >= 8 && item.canonicalSpeakerRecall >= 0.9 && item.recallMargin >= 0.15
    ).sort((left, right) =>
      right.durationSeconds - left.durationSeconds ||
      right.canonicalSpeakerRecall - left.canonicalSpeakerRecall ||
      left.segmentStart - right.segmentStart ||
      left.segmentIndex - right.segmentIndex
    );
    assert(candidates.length > 0, `${spec.speaker}: no deterministic aligned segment`);
    const selected = candidates[0];
    const startSeconds = Number(((selected.segmentStart + selected.segmentEnd) / 2 - 4).toFixed(3));
    assert(startSeconds >= selected.segmentStart && startSeconds + 8 <= selected.segmentEnd);
    windows.push({
      speaker: spec.speaker,
      candidateId: spec.candidateId,
      canonicalSourceWindow: candidate.sourceWindow,
      canonicalAttributionConfidence: candidate.attributionConfidence,
      canonicalAttributionBasis: candidate.attributionBasis,
      deterministicSelectionRule: "longest-preserved-transcript-segment-of-at-least-eight-seconds-with-at-least-0.90-recall-to-one-high-attribution-canonical-candidate-span-and-at-least-0.15-recall-margin-over-the-other-span; ties-use-higher-recall-then-earlier-time-and-index",
      selectedTranscriptSegment: selected,
      clipRelativeStartSeconds: startSeconds,
      requestedDurationSeconds: 8,
      sourceClipPath: paths.clip,
      sourceClipSha256: call.clipSha256,
      outputPath: spec.speaker === "James Tour" ? paths.jamesReference : paths.leeReference
    });
  }
  assert.deepEqual(windows.map((item) => [item.speaker, item.selectedTranscriptSegment.segmentIndex, item.clipRelativeStartSeconds]), [
    ["James Tour", 16, 82.262],
    ["Lee Cronin", 38, 181.061]
  ]);
  return { request, priorExecution, priorAudit, diagnosis, priorCorrectionPlan, call, result, windows };
}

async function prepare() {
  for (const file of [paths.plan, paths.activation, paths.execution, paths.audit, paths.analysis, paths.cost]) {
    assert.equal(await exists(file), false, `${file} already exists`);
  }
  assert.equal(await exists(paths.jamesReference), false);
  assert.equal(await exists(paths.leeReference), false);
  assert.equal(await exists(paths.correctionTranscript), false);
  const alignment = await buildAlignment();
  const sourceHashes = await hashFiles(sourceFiles);
  const transcriptLocks = alignment.request.calls.map((call, callIndex) => ({
    callIndex,
    debateNumber: call.debateNumber,
    debateId: call.debateId,
    moveId: call.moveId,
    path: call.transcriptPath,
    sha256: alignment.priorExecution.results[callIndex].transcriptSha256
  }));
  for (const lock of transcriptLocks) assert.equal(sha256(await readFile(lock.path)), lock.sha256);
  const plan = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-189-audio-alignment-recovery-plan",
    protocolId: alignment.request.protocolId,
    status: "frozen-debate-189-two-reference-local-alignment-and-one-correction-call-ready",
    preparedAt: at,
    checkpointCommit: "0b707788a75d83c43b2e9e99109966e894527427",
    productionCanary: false,
    batchNumber: 5,
    correctionNumber: 1,
    userAuthorization: {
      instruction: "I approve/authorize the next step, interpreted as the exact bounded Debate 189 timeline-alignment and speaker-reference recovery quoted in the preceding assistant message.",
      additionalDirectIncrementalCostUsdMaximum: 0.15,
      expectedAdditionalUsageDerivedCostUsd: 0.07322,
      referenceWindowsAuthorized: 2,
      localFfmpegReferenceCreationAuthorized: true,
      audioPlaybackAuthorized: false,
      semanticAudioEvaluationAuthorized: false,
      correctionTranscriptionCallsAuthorized: 1,
      attemptsPerCall: 1,
      retriesMaximum: 0,
      timeoutExtensionsMaximum: 0,
      applyThreePriorFrozenOverlaysAfterCorrectionPass: true,
      completeSixResultReplayAfterCorrectionPass: true
    },
    alignmentBasis: {
      canonicalCandidateDiscovery: paths.candidateDiscovery,
      canonicalEvents: paths.canonicalEvents,
      preservedTranscript: alignment.call.transcriptPath,
      preservedTranscriptSha256: alignment.result.transcriptSha256,
      targetClip: paths.clip,
      targetClipSha256: alignment.call.clipSha256,
      canonicalYouTubeMillisecondsUsedForOriginalAlternateDeliveryReferences: true,
      correctedReferencesUseClipRelativeTextAlignment: true,
      semanticAudioEvaluationPerformed: false
    },
    referenceWindows: alignment.windows,
    correctionCall: {
      debateNumber: "189",
      debateId: alignment.call.debateId,
      moveId: alignment.call.moveId,
      expectedSpeaker: alignment.call.expectedSpeaker,
      verificationExcerpt: alignment.call.verificationExcerpt,
      clipPath: alignment.call.clipPath,
      clipSha256: alignment.call.clipSha256,
      durationSeconds: alignment.call.durationSeconds,
      transcriptPath: paths.correctionTranscript,
      model: "gpt-4o-transcribe-diarize",
      responseFormat: "diarized_json",
      chunkingStrategy: "auto",
      language: "en",
      knownSpeakerReferencePaths: [paths.jamesReference, paths.leeReference]
    },
    priorReferenceOverlayPlan: {
      path: paths.priorCorrectionPlan,
      sha256: sourceHashes[paths.priorCorrectionPlan],
      activationEligibleOverlays: 3,
      blockedOverlayReplacedByCorrectionCall: "189:con-simple-laws-beneath-cell-complexity"
    },
    transcriptLocks,
    exactThresholds: alignment.request.thresholds,
    executionPolicy: {
      referenceCreationPassesMaximum: 1,
      correctionCallsMaximum: 1,
      attemptsPerCall: 1,
      retriesMaximum: 0,
      rerunsMaximum: 0,
      timeoutExtensionsMaximum: 0,
      recursiveCorrectionsMaximum: 0,
      sequentialExecution: true,
      stopAfterRequestFailure: true,
      stopAfterAdditionalUsageDerivedCostAboveUsd: 0.15,
      originalTranscriptsReusableOnlyAsProtectedCohortInputs: true,
      failedCorrectionOutputReusable: false,
      originalAudioReferenceOrTranscriptWritesMaximum: 0,
      audioPlaybackCallsMaximum: 0,
      semanticAudioEvaluationsMaximum: 0,
      judgmentModelContextsMaximum: 0,
      scoresDerivedMaximum: 0
    },
    outputs: {
      activation: paths.activation,
      references: [paths.jamesReference, paths.leeReference],
      correctionTranscript: paths.correctionTranscript,
      execution: paths.execution,
      audit: paths.audit,
      analysis: paths.analysis,
      cost: paths.cost
    },
    sourceHashes,
    nextAction: "create-and-hash-lock-two-corrected-local-references-then-freeze-activation"
  };
  const bytes = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
  if (write) {
    await mkdir(recoveryRoot, { recursive: true });
    await writeFile(paths.plan, bytes);
  }
  console.log(JSON.stringify({
    status: plan.status,
    wrote: write,
    referenceWindows: plan.referenceWindows.map((item) => ({ speaker: item.speaker, startSeconds: item.clipRelativeStartSeconds, durationSeconds: 8 })),
    expectedAdditionalCostUsd: 0.07322,
    maximumAdditionalCostUsd: 0.15,
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0,
    paidCalls: 0,
    sha256: sha256(bytes),
    nextAction: plan.nextAction
  }, null, 2));
}

async function validatePlan(plan) {
  assert.equal(plan.status, "frozen-debate-189-two-reference-local-alignment-and-one-correction-call-ready");
  assert.equal(plan.referenceWindows.length, 2);
  assert.deepEqual(plan.referenceWindows.map((item) => [item.speaker, item.clipRelativeStartSeconds]), [
    ["James Tour", 82.262], ["Lee Cronin", 181.061]
  ]);
  assert.equal(plan.userAuthorization.additionalDirectIncrementalCostUsdMaximum, 0.15);
  assert.equal(plan.userAuthorization.correctionTranscriptionCallsAuthorized, 1);
  assert.equal(plan.executionPolicy.retriesMaximum, 0);
  assert.equal(plan.executionPolicy.timeoutExtensionsMaximum, 0);
  assert.equal(plan.executionPolicy.semanticAudioEvaluationsMaximum, 0);
  for (const [file, digest] of Object.entries(plan.sourceHashes)) {
    assert.equal(sha256(await readFile(file)), digest, `source changed: ${file}`);
  }
  for (const lock of plan.transcriptLocks) assert.equal(sha256(await readFile(lock.path)), lock.sha256);
}

async function activate() {
  assert.equal(await exists(paths.activation), false);
  for (const file of [paths.execution, paths.audit, paths.analysis, paths.cost, paths.correctionTranscript]) {
    assert.equal(await exists(file), false, `${file} already exists`);
  }
  const planBytes = await readFile(paths.plan);
  const plan = JSON.parse(planBytes);
  await validatePlan(plan);
  for (const reference of plan.referenceWindows) {
    assert.equal(await exists(reference.outputPath), false, `${reference.outputPath} already exists`);
    await mkdir(path.dirname(reference.outputPath), { recursive: true });
    execFileSync(ffmpeg, [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
      "-ss", String(reference.clipRelativeStartSeconds), "-i", reference.sourceClipPath,
      "-t", "8", "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", reference.outputPath
    ], { stdio: ["ignore", "pipe", "pipe"] });
  }
  const references = [];
  for (const reference of plan.referenceWindows) {
    const measured = probe(reference.outputPath);
    assert(measured.durationSeconds >= 7.99 && measured.durationSeconds <= 8.01);
    assert.equal(measured.channels, 1);
    assert.equal(measured.sampleRateHz, 16000);
    references.push({
      speaker: reference.speaker,
      localPath: reference.outputPath,
      sha256: sha256(await readFile(reference.outputPath)),
      actualDurationSeconds: measured.durationSeconds,
      clipRelativeStartSeconds: reference.clipRelativeStartSeconds,
      sourceClipPath: reference.sourceClipPath,
      sourceClipSha256: reference.sourceClipSha256
    });
  }
  const activation = {
    ...plan,
    schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-189-audio-alignment-recovery-activation",
    status: "frozen-active-for-two-corrected-references-and-one-debate-189-correction-call",
    activatedAt: at,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    plan: { path: paths.plan, sha256: sha256(planBytes) },
    correctedReferences: references,
    correctionCall: {
      ...plan.correctionCall,
      knownSpeakers: references.map(({ speaker, localPath, sha256: digest, actualDurationSeconds }) => ({
        speaker, localPath, sha256: digest, actualDurationSeconds
      }))
    },
    executionAuthorization: {
      correctionCallExecution: true,
      deterministicCorrectionValidation: true,
      threePriorOverlays: true,
      completeSixResultReplay: true,
      costAnalysis: true,
      commitAndPush: true,
      retry: false,
      timeoutExtension: false,
      recursiveCorrection: false,
      audioPlayback: false,
      semanticAudioEvaluation: false,
      judgmentModelExecution: false,
      adjudicationModelExecution: false,
      scoreDerivation: false,
      productionMutation: false,
      nextBatchSelection: false
    },
    nextAction: "execute-exactly-one-debate-189-correction-transcription-call"
  };
  if (write) await writeFile(paths.activation, `${JSON.stringify(activation, null, 2)}\n`);
  console.log(JSON.stringify({
    status: activation.status,
    wrote: write,
    correctedReferences: references.map((item) => ({ speaker: item.speaker, sha256: item.sha256, durationSeconds: item.actualDurationSeconds })),
    correctionCallsAuthorized: 1,
    expectedAdditionalCostUsd: 0.07322,
    maximumAdditionalCostUsd: 0.15,
    paidCalls: 0,
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0,
    nextAction: activation.nextAction
  }, null, 2));
}

function invoke(args) {
  return new Promise((resolve) => {
    const child = spawn("python3", args, { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

async function validateActivation(activation) {
  assert.equal(activation.status, "frozen-active-for-two-corrected-references-and-one-debate-189-correction-call");
  assert.equal(activation.correctedReferences.length, 2);
  assert.equal(activation.correctionCall.knownSpeakers.length, 2);
  assert.equal(activation.executionPolicy.correctionCallsMaximum, 1);
  assert.equal(activation.executionPolicy.retriesMaximum, 0);
  assert.equal(sha256(await readFile(activation.plan.path)), activation.plan.sha256);
  await validatePlan(await readJson(activation.plan.path));
  for (const reference of activation.correctedReferences) {
    assert.equal(sha256(await readFile(reference.localPath)), reference.sha256);
  }
}

async function run() {
  assert(process.env.OPENAI_API_KEY, "OPENAI_API_KEY must be set locally");
  for (const file of [paths.execution, paths.audit, paths.analysis, paths.cost, paths.correctionTranscript]) {
    assert.equal(await exists(file), false, `${file} already exists`);
  }
  const activation = await readJson(paths.activation);
  await validateActivation(activation);
  const call = activation.correctionCall;
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
  const invocation = await invoke(args);
  const transcriptExists = await exists(call.transcriptPath);
  let transcript = null;
  let transcriptJsonValid = false;
  let usageValid = false;
  if (transcriptExists) {
    try {
      transcript = await readJson(call.transcriptPath);
      transcriptJsonValid = typeof transcript.text === "string" && transcript.text.trim() &&
        Number.isFinite(transcript.duration) && Array.isArray(transcript.segments) && transcript.segments.length > 0;
      usageValid = transcript.usage?.type === "tokens" && Number.isInteger(transcript.usage.input_tokens) &&
        Number.isInteger(transcript.usage.output_tokens) &&
        transcript.usage.total_tokens === transcript.usage.input_tokens + transcript.usage.output_tokens;
    } catch {
      transcriptJsonValid = false;
    }
  }
  const requestPassed = invocation.code === 0 && invocation.signal === null && transcriptExists && transcriptJsonValid && usageValid;
  const additionalCostUsd = usageValid
    ? transcript.usage.input_tokens * 2.5 / 1_000_000 + transcript.usage.output_tokens * 10 / 1_000_000
    : 0;
  const costCapPassed = additionalCostUsd <= 0.15;
  let correctedEvidence = null;
  let correctionVerified = false;
  if (requestPassed && costCapPassed) {
    correctedEvidence = evaluateAttributionTranscript(transcript, {
      moveId: call.moveId,
      expectedSpeaker: call.expectedSpeaker,
      verificationExcerpt: call.verificationExcerpt
    }, activation.exactThresholds);
    correctionVerified = correctedEvidence.status === "verified";
  }
  const requestResult = {
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
    usage: usageValid ? {
      inputTokens: transcript.usage.input_tokens,
      audioInputTokens: transcript.usage.input_token_details?.audio_tokens ?? null,
      textInputTokens: transcript.usage.input_token_details?.text_tokens ?? null,
      outputTokens: transcript.usage.output_tokens,
      totalTokens: transcript.usage.total_tokens
    } : null,
    usageDerivedEstimatedCostUsd: round(additionalCostUsd),
    maximumAdditionalCostUsd: 0.15,
    costCapPassed,
    deterministicEvidence: correctedEvidence,
    correctionVerified
  };
  const priorRequest = await readJson(paths.request);
  const priorExecution = await readJson(paths.priorExecution);
  const priorPlan = await readJson(paths.priorCorrectionPlan);
  const moves = [];
  let overlaysApplied = 0;
  let replayComplete = false;
  if (requestPassed && costCapPassed && correctionVerified) {
    for (const [callIndex, cohortCall] of priorRequest.calls.entries()) {
      const lock = activation.transcriptLocks[callIndex];
      let cohortTranscript;
      let transcriptPath;
      let transcriptSha256;
      let verificationExcerpt = cohortCall.verificationExcerpt;
      let validationOverlay = null;
      if (cohortCall.debateNumber === "189") {
        cohortTranscript = transcript;
        transcriptPath = call.transcriptPath;
        transcriptSha256 = requestResult.transcriptSha256;
      } else {
        assert.equal(sha256(await readFile(lock.path)), lock.sha256);
        cohortTranscript = await readJson(lock.path);
        transcriptPath = lock.path;
        transcriptSha256 = lock.sha256;
        const overlay = priorPlan.proposedReferenceOverlays.find((item) =>
          item.targetDebateNumber === cohortCall.debateNumber &&
          item.targetMoveId === cohortCall.moveId && item.activationEligible
        );
        if (overlay) {
          verificationExcerpt = overlay.replacementValue;
          overlaysApplied += 1;
          validationOverlay = {
            operation: overlay.operation,
            originalValueSha256: overlay.originalValueSha256,
            replacementValueSha256: overlay.replacementValueSha256,
            deltaSha256: overlay.deltaSha256,
            persistentWrite: false
          };
        }
      }
      const evidence = evaluateAttributionTranscript(cohortTranscript, {
        moveId: cohortCall.moveId,
        expectedSpeaker: cohortCall.expectedSpeaker,
        verificationExcerpt
      }, activation.exactThresholds);
      moves.push({
        debateNumber: cohortCall.debateNumber,
        debateId: cohortCall.debateId,
        moveId: cohortCall.moveId,
        expectedSpeaker: cohortCall.expectedSpeaker,
        trigger: cohortCall.trigger,
        status: evidence.status,
        resolvedSpeaker: evidence.status === "verified" ? cohortCall.expectedSpeaker : null,
        transcript: { path: transcriptPath, sha256: transcriptSha256, persistentMutation: false },
        validationOverlay,
        deterministicEvidence: evidence
      });
    }
    assert.equal(overlaysApplied, 3);
    replayComplete = moves.length === 6;
  }
  const verified = moves.filter((item) => item.status === "verified").length;
  const gatePassed = requestPassed && costCapPassed && correctionVerified && replayComplete && verified === 6;
  const status = gatePassed
    ? "passed-all-six-batch-05-audio-attributions-after-debate-189-alignment-recovery"
    : requestPassed
      ? "batch-05-debate-189-alignment-recovery-unresolved-or-cost-blocked"
      : "batch-05-debate-189-alignment-recovery-request-failed";
  const nextAction = gatePassed
    ? "prepare-freeze-and-push-batch-05-dispute-only-adjudication-packets-under-standing-authorization"
    : "stop-new-user-approval-required-after-failed-bounded-debate-189-audio-recovery";
  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-189-audio-alignment-recovery-execution",
    protocolId: activation.protocolId,
    status,
    startedAt,
    completedAt: new Date().toISOString(),
    attempts: 1,
    correctionCalls: 1,
    retries: 0,
    reruns: 0,
    timeoutExtensions: 0,
    requestFailure: !requestPassed,
    additionalCostCapExceeded: !costCapPassed,
    requestResult,
    correctionVerified,
    overlaysApplied,
    replayComplete,
    verified: replayComplete ? verified : null,
    unresolved: replayComplete ? 6 - verified : null,
    gatePassed,
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0,
    judgmentModelContexts: 0,
    adjudicationModelContexts: 0,
    scoresDerived: 0,
    directIncrementalCostUsd: round(additionalCostUsd),
    nextAction
  };
  await writeFile(paths.execution, `${JSON.stringify(execution, null, 2)}\n`);
  if (replayComplete) {
    const debates = [...new Set(moves.map((item) => item.debateNumber))].map((debateNumber) => ({
      debateNumber,
      debateId: moves.find((item) => item.debateNumber === debateNumber).debateId,
      moves: moves.filter((item) => item.debateNumber === debateNumber)
    }));
    const audit = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-05-audio-alignment-recovery-audit",
      protocolId: activation.protocolId,
      status,
      productionCanary: false,
      batchNumber: 5,
      correctionNumber: 1,
      debates,
      thresholds: activation.exactThresholds,
      totals: {
        requiredMoves: 6,
        verified,
        unresolved: 6 - verified,
        preservedOriginalPaidCalls: priorExecution.callsCompleted,
        correctionPaidCalls: 1,
        retries: 0,
        overlaysApplied,
        preservedOriginalUsageDerivedCostUsd: priorExecution.usageDerivedEstimatedCostUsd,
        additionalUsageDerivedCostUsd: additionalCostUsd,
        cumulativeUsageDerivedCostUsd: priorExecution.usageDerivedEstimatedCostUsd + additionalCostUsd,
        scoresDerived: 0,
        audioPlaybackCalls: 0,
        semanticAudioEvaluations: 0
      }
    };
    const analysis = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-05-audio-alignment-recovery-analysis",
      protocolId: activation.protocolId,
      status,
      productionCanary: false,
      batchNumber: 5,
      gate: {
        passed: gatePassed,
        replayComplete,
        requiredMoves: 6,
        verified,
        unresolved: 6 - verified,
        correctedReferencesApplied: 2,
        correctionCalls: 1,
        priorOverlaysApplied: overlaysApplied,
        exactValidatorPreserved: true,
        thresholdsPreserved: true,
        originalTranscriptsPreserved: true,
        originalReferencesPreserved: true
      },
      standingAuthorizationResumedAfterPass: gatePassed,
      authorization: {
        adjudicationPacketPreparation: gatePassed,
        paidTranscription: false,
        retry: false,
        correctionCall: false,
        scoreDerivation: false,
        productionMutation: false,
        nextBatchSelection: false
      },
      nextAuthorizedAction: nextAction
    };
    const cost = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-05-audio-alignment-recovery-cost-analysis",
      protocolId: activation.protocolId,
      status: costCapPassed ? "additional-usage-derived-cost-within-approved-cap" : "additional-usage-derived-cost-exceeded-approved-cap",
      pricing: {
        inputRatePerMillionUsd: 2.5,
        outputRatePerMillionUsd: 10,
        billingBasis: "returned-token-usage-times-frozen-official-model-rates",
        actualInvoiceChargeAvailable: false
      },
      originalUsageDerivedCostUsd: priorExecution.usageDerivedEstimatedCostUsd,
      expectedAdditionalUsageDerivedCostUsd: 0.07322,
      maximumAdditionalCostUsd: 0.15,
      actualAdditionalUsageDerivedCostUsd: additionalCostUsd,
      cumulativeUsageDerivedCostUsd: priorExecution.usageDerivedEstimatedCostUsd + additionalCostUsd,
      additionalCostCapPassed: costCapPassed,
      correctionCalls: 1,
      retries: 0,
      paidCallsAddedByAnalysis: 0
    };
    await Promise.all([
      writeFile(paths.audit, `${JSON.stringify(audit, null, 2)}\n`),
      writeFile(paths.analysis, `${JSON.stringify(analysis, null, 2)}\n`),
      writeFile(paths.cost, `${JSON.stringify(cost, null, 2)}\n`)
    ]);
  }
  console.log(JSON.stringify({
    status,
    requestPassed,
    correctionVerified,
    correctionCalls: 1,
    retries: 0,
    additionalUsageDerivedCostUsd: round(additionalCostUsd),
    maximumAdditionalCostUsd: 0.15,
    costCapPassed,
    overlaysApplied,
    replayComplete,
    verified: replayComplete ? verified : null,
    unresolved: replayComplete ? 6 - verified : null,
    gatePassed,
    scoresDerived: 0,
    nextAction
  }, null, 2));
  if (!gatePassed) process.exitCode = 1;
}

async function test() {
  const plan = await readJson(paths.plan);
  await validatePlan(plan);
  if (!(await exists(paths.activation))) {
    console.log(JSON.stringify({ status: "passed-preactivation", referencesCreated: 0, paidCalls: 0 }, null, 2));
    return;
  }
  const activation = await readJson(paths.activation);
  await validateActivation(activation);
  if (!(await exists(paths.execution))) {
    assert.equal(await exists(paths.correctionTranscript), false);
    console.log(JSON.stringify({ status: "passed-activated", references: 2, correctionCalls: 0, retries: 0 }, null, 2));
    return;
  }
  const execution = await readJson(paths.execution);
  assert.equal(execution.attempts, 1);
  assert.equal(execution.correctionCalls, 1);
  assert.equal(execution.retries, 0);
  assert.equal(execution.reruns, 0);
  assert.equal(execution.timeoutExtensions, 0);
  assert.equal(execution.requestResult.attemptCount, 1);
  assert.equal(execution.requestResult.retryCount, 0);
  assert(execution.directIncrementalCostUsd <= 0.15);
  if (execution.requestResult.transcriptWritten) {
    assert.equal(sha256(await readFile(paths.correctionTranscript)), execution.requestResult.transcriptSha256);
  }
  if (execution.gatePassed) {
    assert.equal(execution.verified, 6);
    assert.equal(execution.unresolved, 0);
    assert.equal(execution.overlaysApplied, 3);
    const [audit, analysis, cost] = await Promise.all([readJson(paths.audit), readJson(paths.analysis), readJson(paths.cost)]);
    assert.equal(audit.totals.requiredMoves, 6);
    assert.equal(audit.totals.verified, 6);
    assert.equal(audit.totals.unresolved, 0);
    assert.equal(analysis.gate.passed, true);
    assert.equal(analysis.standingAuthorizationResumedAfterPass, true);
    assert.equal(cost.additionalCostCapPassed, true);
    assert.equal(cost.actualAdditionalUsageDerivedCostUsd, execution.requestResult.usageDerivedEstimatedCostUsd);
  }
  for (const lock of activation.transcriptLocks) assert.equal(sha256(await readFile(lock.path)), lock.sha256);
  for (const [file, digest] of Object.entries(plan.sourceHashes)) assert.equal(sha256(await readFile(file)), digest);
  console.log(JSON.stringify({
    status: execution.gatePassed ? "passed-complete" : "passed-preserved-failure",
    correctionCalls: 1,
    retries: 0,
    additionalUsageDerivedCostUsd: execution.directIncrementalCostUsd,
    maximumAdditionalCostUsd: 0.15,
    gatePassed: execution.gatePassed,
    verified: execution.verified,
    unresolved: execution.unresolved,
    standingAuthorizationResumed: execution.gatePassed
  }, null, 2));
}

if (mode === "prepare") await prepare();
if (mode === "activate") await activate();
if (mode === "run") await run();
if (mode === "test") await test();
