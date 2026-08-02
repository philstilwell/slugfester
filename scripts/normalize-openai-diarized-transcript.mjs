#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

function option(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function required(name) {
  const value = option(name);
  if (!value) throw new Error(`--${name} is required`);
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function timestamp(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

const videoId = required("video-id");
const debateId = required("debate-id");
const title = required("title");
const sourceUrl = required("source-url");
const audioSourceUrl = required("audio-source-url");
const chunkDirectory = path.resolve(required("chunk-dir"));
const chunkSeconds = Number(option("chunk-seconds", "1200"));
const channel = option("channel", "Unknown");
const model = option("model", "gpt-4o-transcribe-diarize");
const isDiarized = model.includes("diarize");
if (!Number.isFinite(chunkSeconds) || chunkSeconds <= 0) {
  throw new Error("--chunk-seconds must be a positive number");
}

const chunkFiles = (await readdir(chunkDirectory))
  .filter((name) => /^chunk-\d+\.json$/.test(name))
  .sort();
if (!chunkFiles.length) throw new Error(`No transcript chunks found in ${chunkDirectory}`);
for (const [index, fileName] of chunkFiles.entries()) {
  const chunkNumber = Number(fileName.match(/^chunk-(\d+)\.json$/)?.[1]);
  if (chunkNumber !== index) {
    throw new Error(
      `Transcript chunks must be contiguous from chunk-000.json; found ${fileName} at position ${index}`
    );
  }
}

const rawChunks = [];
const events = [];
for (const fileName of chunkFiles) {
  const raw = await readFile(path.join(chunkDirectory, fileName), "utf8");
  const chunk = JSON.parse(raw);
  if (!Array.isArray(chunk.segments) || !chunk.segments.length) {
    throw new Error(`${fileName} has no diarized segments`);
  }
  rawChunks.push({ fileName, sha256: sha256(raw), payload: chunk });
  const chunkNumber = Number(fileName.match(/^chunk-(\d+)\.json$/)[1]);
  const offsetSeconds = chunkNumber * chunkSeconds;
  for (const segment of chunk.segments) {
    const startSeconds = offsetSeconds + Number(segment.start || 0);
    const endSeconds = offsetSeconds + Number(segment.end || segment.start || 0);
    events.push({
      startMs: Math.round(startSeconds * 1000),
      durationMs: Math.max(0, Math.round((endSeconds - startSeconds) * 1000)),
      speaker: segment.speaker || "Unknown",
      text: String(segment.text || "").trim()
    });
  }
}

events.sort((a, b) => a.startMs - b.startMs);
const normalizedEvents = `${JSON.stringify(events, null, 2)}\n`;
const transcript = `${events
  .map(
    (event) =>
      `[${timestamp(event.startMs / 1000)}] [Speaker ${event.speaker}] ${event.text}`
  )
  .join("\n")}\n`;
const durationSeconds = Math.ceil(
  Math.max(...events.map((event) => (event.startMs + event.durationMs) / 1000))
);
const outputDirectory = path.resolve(".assessment-cache/captions", videoId);
const eventsPath = path.join(outputDirectory, "events.json");
const transcriptPath = path.join(outputDirectory, "transcript.txt");
const rawPath = path.join(outputDirectory, "openai-diarized-chunks.json");
const manifestPath = path.join(outputDirectory, "manifest.json");
const rawOutput = `${JSON.stringify(
  {
    schemaVersion: "1.0",
    model,
    chunkSeconds,
    chunks: rawChunks
  },
  null,
  2
)}\n`;
const retrievedAt = new Date().toISOString();
const manifest = {
  schemaVersion: "1.0",
  sourceUrl,
  audioSourceUrl,
  debateId,
  videoId,
  title,
  channel,
  durationSeconds,
  retrievedAt,
  extractionMethod:
    isDiarized
      ? "OpenAI Audio API diarized transcription of locally saved, speech-optimized audio chunks"
      : "OpenAI Audio API timestamped transcription of locally saved, speech-optimized audio chunks",
  model,
  chunkSeconds,
  track: {
    languageCode: "en",
    name: isDiarized
      ? "English (OpenAI diarized transcription)"
      : "English (OpenAI timestamped transcription)",
    kind: isDiarized ? "api-diarized" : "api-timestamped",
    isTranslatable: false
  },
  speakerLabelPolicy: isDiarized
    ? "Speaker IDs are anonymous within each independently processed chunk and require debate-level attribution review."
    : "The transcription model does not identify speakers; debate-level attribution review is required.",
  rawTranscriptSha256: sha256(rawOutput),
  normalizedEventsSha256: sha256(normalizedEvents),
  transcriptSha256: sha256(transcript),
  eventCount: events.length,
  wordCount: transcript.trim().split(/\s+/).length,
  storagePolicy:
    "Full audio and transcript text remain in ignored local storage; committed audit artifacts retain provenance, hashes, and counts only."
};

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(eventsPath, normalizedEvents),
  writeFile(transcriptPath, transcript),
  writeFile(rawPath, rawOutput),
  writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
]);

console.log(
  JSON.stringify(
    {
      debateId,
      videoId,
      chunks: chunkFiles.length,
      eventCount: manifest.eventCount,
      wordCount: manifest.wordCount,
      durationSeconds,
      outputDirectory
    },
    null,
    2
  )
);
