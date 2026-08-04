#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = "docs/calibration/v3.8/held-out-burden-contact-integration-gate";
const MANIFEST_PATH = `${ROOT}/gate-manifest.json`;
const AUTHORIZATION_PATH = `${ROOT}/source-access-authorization.json`;
const OUTPUT_PATH = `${ROOT}/source-audit.json`;
const shouldWrite = process.argv.includes("--write");
const accessedAtIndex = process.argv.indexOf("--accessed-at");
const accessedAt = accessedAtIndex >= 0 ? process.argv[accessedAtIndex + 1] : null;

if (!accessedAt || Number.isNaN(Date.parse(accessedAt))) {
  console.error("Usage: node scripts/prepare-v38-source-audit.mjs --accessed-at <ISO timestamp> [--write]");
  process.exit(1);
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const read = (file) => readFile(path.resolve(file), "utf8");
const manifestText = await read(MANIFEST_PATH);
const manifest = JSON.parse(manifestText);
const authorizationText = await read(AUTHORIZATION_PATH);
const authorization = JSON.parse(authorizationText);

assert(authorization.status === "source-access-and-preparation-authorized", "source access is not authorized");
assert(authorization.gateManifest.sha256 === sha256(manifestText), "authorization does not match gate manifest");

const debateSources = {};
for (const debate of manifest.sample.debates) {
  const sourceRoot = `.assessment-cache/captions/${debate.videoId}`;
  const transcriptPath = `${sourceRoot}/transcript.txt`;
  const eventsPath = `${sourceRoot}/events.json`;
  const localManifestPath = `${sourceRoot}/manifest.json`;
  const [transcriptText, eventsText, localManifestText] = await Promise.all([read(transcriptPath), read(eventsPath), read(localManifestPath)]);
  const localManifest = JSON.parse(localManifestText);
  const events = JSON.parse(eventsText);
  assert(localManifest.videoId === debate.videoId, `${debate.debateId}: video ID mismatch`);
  assert(localManifest.transcriptSha256 === sha256(transcriptText), `${debate.debateId}: transcript hash mismatch`);
  assert(localManifest.normalizedEventsSha256 === sha256(eventsText), `${debate.debateId}: events hash mismatch`);
  assert(localManifest.wordCount === transcriptText.trim().split(/\s+/).length, `${debate.debateId}: word-count mismatch`);
  assert(localManifest.eventCount === events.length, `${debate.debateId}: event-count mismatch`);
  assert(localManifest.track?.kind === "asr", `${debate.debateId}: selected source is not the preregistered ASR chain`);

  debateSources[debate.number] = {
    debateId: debate.debateId,
    videoId: debate.videoId,
    sourceUrl: localManifest.sourceUrl,
    sourceTitle: localManifest.title,
    channel: localManifest.channel,
    durationSeconds: localManifest.durationSeconds,
    extractionMethod: localManifest.extractionMethod,
    captionTrack: localManifest.track,
    transcriptPath,
    transcriptSha256: localManifest.transcriptSha256,
    eventsPath,
    eventsSha256: localManifest.normalizedEventsSha256,
    localManifestPath,
    localManifestSha256: sha256(localManifestText),
    wordCount: localManifest.wordCount,
    eventCount: localManifest.eventCount,
    limitations: [
      "The source is an auto-generated caption track and may contain wording, punctuation, and speaker-boundary errors.",
      "Speaker labels are not embedded in the caption events; attribution must be established from turn context and audio when confidence is not high.",
      "Short committed excerpts are evidence anchors; the complete ignored local transcript remains the assessment source."
    ]
  };
}

const audit = {
  schemaVersion: "3.8-heldout-burden-contact-source-audit",
  status: "passed-local-chain-hashes-heldout-content-opened-for-source-preparation",
  accessedAt,
  accessAuthorization: { path: AUTHORIZATION_PATH, sha256: sha256(authorizationText) },
  gateManifest: { path: MANIFEST_PATH, sha256: sha256(manifestText) },
  fullTranscriptContentAccessed: true,
  transcriptAccessScope: "Only the three preregistered dyadic debates, for source preparation and provenance validation.",
  debateSources,
  audit: {
    selectedDebates: manifest.sample.debateCount,
    localTranscriptChainsVerified: Object.keys(debateSources).length,
    localHashMismatches: 0,
    autoCaptionSources: Object.values(debateSources).filter((item) => item.captionTrack.kind === "asr").length,
    humanCaptionSources: Object.values(debateSources).filter((item) => item.captionTrack.kind !== "asr").length,
    totalWords: Object.values(debateSources).reduce((sum, item) => sum + item.wordCount, 0),
    totalEvents: Object.values(debateSources).reduce((sum, item) => sum + item.eventCount, 0),
    paidTranscriptionCalls: 0,
    transcriptionCostUsd: 0,
    meteredModelApiCostUsd: 0,
    speakerAttributionsAssessed: 0,
    audioVerificationsRequired: null,
    audioVerificationsCompleted: 0
  },
  nextState: {
    sourcePreparationModelExecutionAuthorized: true,
    burdenContactClassificationPassesAuthorized: false,
    numericalScoringAuthorized: false,
    assessmentProseAuthorized: false,
    productionMutationAuthorized: false
  }
};

if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(OUTPUT_PATH)), { recursive: true });
  await writeFile(path.resolve(OUTPUT_PATH), `${JSON.stringify(audit, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", output: OUTPUT_PATH, ...audit.audit }, null, 2));
