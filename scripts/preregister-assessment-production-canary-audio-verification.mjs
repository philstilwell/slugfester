#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V416_AUDIO_THRESHOLDS } from "./lib/v416-audio-verification.mjs";

const shouldWrite = process.argv.includes("--write");
const approvedIndex = process.argv.indexOf("--approved-at");
const approvedAt = approvedIndex >= 0 ? process.argv[approvedIndex + 1] : null;
if (shouldWrite) {
  assertV4(
    approvedAt && !Number.isNaN(Date.parse(approvedAt)),
    "--write requires --approved-at with the user-approval timestamp"
  );
}

const root = process.cwd();
const prepRoot = "docs/assessment-production/canary-v1-disagreement-audio-prep";
const stageRoot = "docs/assessment-production/canary-v1-audio-verification";
const mediaRoot = "output/transcribe/assessment-production-canary-v1-audio-verification";
const manifestPath = `${stageRoot}/execution-manifest.json`;
const executionPath = `${stageRoot}/model-execution.json`;
const auditPath = `${stageRoot}/audio-verification.json`;
const analysisPath = `${stageRoot}/analysis.json`;
const ffmpeg = "/opt/homebrew/bin/ffmpeg";
const ffprobe = "/opt/homebrew/bin/ffprobe";
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
if (shouldWrite) {
  for (const file of [manifestPath, executionPath, auditPath, analysisPath]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

const [analysis, sourcePreparation] = await Promise.all([
  readFile(`${prepRoot}/analysis.json`, "utf8").then(JSON.parse),
  readFile(`${prepRoot}/audio-source-preparation.json`, "utf8").then(JSON.parse)
]);
assertV4(
  analysis.authorization.audioSourcePreparation &&
    sourcePreparation.status ===
      "prepared-four-local-production-canary-audio-clips" &&
    sourcePreparation.authorization.audioVerificationManifest,
  "production-canary audio-verification manifest is unauthorized"
);

const sourceByDebate = new Map(
  sourcePreparation.sources.map((source) => [source.debateNumber, source])
);
const referenceSpecs = [
  { debateNumber: "05", speaker: "Sye Ten Bruggencate", startSeconds: 439.08 },
  { debateNumber: "05", speaker: "Matt Dillahunty", startSeconds: 1120.679 },
  { debateNumber: "130", speaker: "Mike Licona", startSeconds: 969.95 },
  { debateNumber: "130", speaker: "Richard Carrier", startSeconds: 2019.32 },
  { debateNumber: "152", speaker: "Stuart Knechtle", startSeconds: 304.139 },
  { debateNumber: "152", speaker: "Aron Ra", startSeconds: 927.959 }
];
const references = [];
for (const spec of referenceSpecs) {
  const source = sourceByDebate.get(spec.debateNumber);
  assertV4(source, `Debate ${spec.debateNumber}: normalized source unavailable`);
  const referenceDirectory = path.resolve(
    root,
    mediaRoot,
    `debate-${spec.debateNumber}`,
    "references"
  );
  await mkdir(referenceDirectory, { recursive: true });
  const safeSpeaker = spec.speaker.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const referencePath = path.join(referenceDirectory, `${safeSpeaker}.mp3`);
  execFileSync(ffmpeg, [
    "-nostdin",
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    String(spec.startSeconds),
    "-i",
    path.resolve(root, source.sourceAudio),
    "-t",
    "8",
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-b:a",
    "64k",
    referencePath
  ]);
  const actualDurationSeconds = Number(
    execFileSync(
      ffprobe,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "csv=p=0",
        referencePath
      ],
      { encoding: "utf8" }
    ).trim()
  );
  assertV4(
    actualDurationSeconds >= 1.2 && actualDurationSeconds <= 10,
    `${spec.speaker}: encoded reference duration outside API range`
  );
  references.push({
    debateNumber: spec.debateNumber,
    speaker: spec.speaker,
    startSeconds: spec.startSeconds,
    requestedDurationSeconds: 8,
    actualDurationSeconds,
    localPath: path.relative(root, referencePath),
    sha256: sha256(await readFile(referencePath))
  });
}

const calls = sourcePreparation.clips.map((clip) => ({
  debateNumber: clip.debateNumber,
  debateId: clip.debateId,
  moveId: clip.moveId,
  expectedSpeaker: clip.expectedSpeaker,
  proposition: clip.proposition,
  verificationExcerpt: clip.verificationExcerpt,
  trigger: clip.trigger,
  clipPath: clip.clipPath,
  clipSha256: clip.clipSha256,
  durationSeconds: clip.durationSeconds,
  transcriptPath:
    `${mediaRoot}/debate-${clip.debateNumber}/transcripts/${clip.moveId}.transcript.json`,
  model: "gpt-4o-transcribe-diarize",
  responseFormat: "diarized_json",
  chunkingStrategy: "auto",
  language: "en",
  knownSpeakers: references
    .filter((reference) => reference.debateNumber === clip.debateNumber)
    .map(({ speaker, localPath, sha256: digest, actualDurationSeconds }) => ({
      speaker,
      localPath,
      sha256: digest,
      actualDurationSeconds
    }))
}));
assertV4(
  calls.every((call) => call.knownSpeakers.length === 2),
  "every audio call requires exactly two same-debate speaker references"
);
for (const call of calls) {
  const clipBytes = await readFile(call.clipPath);
  assertV4(clipBytes.length < 25 * 1024 * 1024, `${call.moveId}: clip exceeds 25 MB`);
}

const planningPricePerMinuteUsd = 0.006;
const clipMinutes = calls.reduce((sum, call) => sum + call.durationSeconds, 0) / 60;
const expectedCostUsd = clipMinutes * planningPricePerMinuteUsd;
const sourceFiles = [
  "docs/assessment-production-canary-audio-verification-workflow.md",
  `${prepRoot}/analysis.json`,
  `${prepRoot}/audio-work-items.json`,
  `${prepRoot}/audio-source-preparation.json`,
  "scripts/lib/v416-audio-verification.mjs",
  "scripts/preregister-assessment-production-canary-audio-verification.mjs",
  "scripts/run-assessment-production-canary-audio-verification.mjs",
  "scripts/analyze-assessment-production-canary-audio-verification.mjs",
  "scripts/test-assessment-production-canary-audio-verification.mjs",
  "/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py",
  ...sourcePreparation.sources.map((source) => source.sourceAudio),
  ...calls.map((call) => call.clipPath),
  ...references.map((reference) => reference.localPath)
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) {
  sourceHashes[file] = sha256(await readFile(file));
}

const manifest = {
  schemaVersion: "1.0-production-canary-audio-verification-execution-manifest",
  protocolId: "assessment-production-canary-v1-audio-verification",
  status: shouldWrite
    ? "frozen-four-paid-known-speaker-diarizations-authorized"
    : "preview-four-paid-known-speaker-diarizations-pending-user-approval",
  approvedAt: shouldWrite ? approvedAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  model: "gpt-4o-transcribe-diarize",
  calls,
  thresholds: V416_AUDIO_THRESHOLDS,
  referenceContract: {
    requestedDurationSeconds: 8,
    acceptedRangeSeconds: [1.2, 10],
    measuredBeforeExecution: true,
    referencesPerDebate: 2,
    references
  },
  costEstimate: {
    planningPricePerMinuteUsd,
    clipMinutes: Number(clipMinutes.toFixed(4)),
    expectedCostUsd: Number(expectedCostUsd.toFixed(4)),
    maximumAuthorizedCostUsd: 0.15,
    ChatGPTSubscriptionApplicable: false,
    OpenAIApiBillingRequired: true,
    explicitUserApprovalRequired: true,
    explicitUserApprovalRecorded: shouldWrite
  },
  executionPolicy: {
    callsMaximum: 4,
    attemptsPerCall: 1,
    retriesMaximum: 0,
    sequentialExecution: true,
    stopRemainingAfterRequestLevelFailure: true,
    continueAfterCompletedButDeterministicallyUnresolvedTranscript: true,
    chunkingStrategy: "auto",
    responseFormat: "diarized_json",
    knownSpeakerReferencesPerCall: 2,
    transcriptsSavedLocally: true
  },
  judgmentModelBoundary: {
    judgmentModel: "5.6 Sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    judgmentModelCallsThisStage: 0,
    unchanged: true
  },
  authorization: {
    paidTranscriptionExecution: shouldWrite,
    deterministicAudioAnalysis: shouldWrite,
    retry: false,
    correctionCall: false,
    adjudicationPacketPreparation: false,
    adjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  stopRules: {
    sourceHashMismatchBlocks: true,
    preexistingTranscriptBlocks: true,
    failedTranscriptPreserved: true,
    requestFailureStopsRemaining: true,
    retryAuthorized: false,
    correctionAuthorized: false
  },
  artifacts: {
    execution: executionPath,
    audit: auditPath,
    analysis: analysisPath,
    transcripts: calls.map((call) => call.transcriptPath)
  },
  futureOutputPathsExcludedFromSourceHashes: [
    ...calls.map((call) => call.transcriptPath),
    executionPath,
    auditPath,
    analysisPath
  ],
  sourceHashes
};
assertV4(
  manifest.costEstimate.expectedCostUsd <=
    manifest.costEstimate.maximumAuthorizedCostUsd,
  "estimated transcription cost exceeds cap"
);
if (shouldWrite) {
  await mkdir(path.resolve(root, stageRoot), { recursive: true });
  await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? "frozen" : "preview-pending-user-approval",
      callsMaximum: 4,
      debates: [...new Set(calls.map((call) => call.debateNumber))],
      referenceDurationsSeconds: references.map(
        ({ debateNumber, speaker, actualDurationSeconds }) => ({
          debateNumber,
          speaker,
          seconds: actualDurationSeconds
        })
      ),
      clipMinutes: manifest.costEstimate.clipMinutes,
      model: manifest.model,
      expectedCostUsd: manifest.costEstimate.expectedCostUsd,
      maximumAuthorizedCostUsd: manifest.costEstimate.maximumAuthorizedCostUsd,
      ChatGPTSubscriptionApplicable: false,
      explicitUserApprovalRequired: true,
      retries: 0,
      transcriptsSavedLocally: true,
      judgmentModelBoundary: manifest.judgmentModelBoundary,
      scoreDerivationAuthorized: false
    },
    null,
    2
  )
);
