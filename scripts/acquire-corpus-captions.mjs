#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { publishedDebates } from "../src/data/debates.js";

const concurrencyIndex = process.argv.indexOf("--concurrency");
const allowMissing = process.argv.includes("--allow-missing");
const concurrency = Number(
  concurrencyIndex >= 0 ? process.argv[concurrencyIndex + 1] : 6
);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 12) {
  throw new Error("--concurrency must be an integer from 1 to 12");
}

const cacheRoot = path.resolve(".assessment-cache/captions");
const localAuditPath = path.resolve(".assessment-cache/corpus-transcript-audit.json");
const committedAuditPath = path.resolve(
  "docs/calibration/v2.1/corpus-transcript-audit.json"
);

function videoIdFrom(url) {
  return new URL(url).searchParams.get("v");
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function acquire(debate) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [path.resolve("scripts/acquire-youtube-captions.mjs"), debate.youtubeUrl],
      { cwd: process.cwd(), stdio: ["ignore", "ignore", "pipe"] }
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      const errorMessage = [...stderr.matchAll(/^Error:\s+(.+)$/gm)].at(-1)?.[1];
      resolve({
        ok: code === 0,
        error: code === 0 ? null : errorMessage || `caption acquisition exited ${code}`
      });
    });
  });
}

const tasks = publishedDebates.map((debate) => ({
  debateId: debate.id,
  debateNumber: debate.number,
  youtubeUrl: debate.youtubeUrl,
  videoId: videoIdFrom(debate.youtubeUrl)
}));
const acquisitionResults = new Map();
let cursor = 0;

async function worker() {
  while (cursor < tasks.length) {
    const index = cursor;
    cursor += 1;
    const task = tasks[index];
    const directory = path.join(cacheRoot, task.videoId);
    const manifestPath = path.join(directory, "manifest.json");
    const transcriptPath = path.join(directory, "transcript.txt");
    const eventsPath = path.join(directory, "events.json");
    if (
      (await exists(manifestPath)) &&
      (await exists(transcriptPath)) &&
      (await exists(eventsPath))
    ) {
      acquisitionResults.set(task.debateId, { ok: true, status: "cached" });
      continue;
    }
    const result = await acquire(task);
    acquisitionResults.set(task.debateId, {
      ...result,
      status: result.ok ? "acquired" : "unavailable"
    });
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));

const entries = [];
for (const task of tasks) {
  const result = acquisitionResults.get(task.debateId);
  if (!result?.ok) {
    entries.push({
      debateNumber: task.debateNumber,
      debateId: task.debateId,
      videoId: task.videoId,
      status: "unavailable",
      error: result?.error || "unknown acquisition failure"
    });
    continue;
  }
  const manifest = JSON.parse(
    await readFile(path.join(cacheRoot, task.videoId, "manifest.json"), "utf8")
  );
  entries.push({
    debateNumber: task.debateNumber,
    debateId: task.debateId,
    videoId: task.videoId,
    status: "available",
    transcriptStorage: `.assessment-cache/captions/${task.videoId}/transcript.txt`,
    eventsStorage: `.assessment-cache/captions/${task.videoId}/events.json`,
    track: manifest.track,
    extractionMethod: manifest.extractionMethod,
    audioSourceUrl: manifest.audioSourceUrl || null,
    model: manifest.model || null,
    wordCount: manifest.wordCount,
    eventCount: manifest.eventCount,
    retrievedAt: manifest.retrievedAt,
    transcriptSha256: manifest.transcriptSha256,
    normalizedEventsSha256: manifest.normalizedEventsSha256
  });
}

const available = entries.filter((entry) => entry.status !== "unavailable");
const unavailable = entries.filter((entry) => entry.status === "unavailable");
const auditAsOf = available.map((entry) => entry.retrievedAt).sort().at(-1) || null;
const report = {
  schemaVersion: "1.0",
  workflowVersion: "Slugfester Reassessment Workflow v2.1",
  auditAsOf,
  corpusDebates: entries.length,
  locallySavedTranscripts: available.length,
  unavailableTranscripts: unavailable.length,
  acquisitionRate: entries.length ? Number((available.length / entries.length).toFixed(4)) : 0,
  storagePolicy:
    "Full transcripts and timestamped events remain in ignored local cache. This committed audit retains paths, metadata, and hashes but no full transcript text.",
  paidFallbackPolicy:
    "If public captions are absent or materially inadequate, estimate paid transcription cost and obtain approval before invoking an API.",
  entries
};

await Promise.all([
  mkdir(path.dirname(localAuditPath), { recursive: true }),
  mkdir(path.dirname(committedAuditPath), { recursive: true })
]);
const output = `${JSON.stringify(report, null, 2)}\n`;
await Promise.all([
  writeFile(localAuditPath, output),
  writeFile(committedAuditPath, output)
]);

console.log(
  JSON.stringify(
    {
      corpusDebates: report.corpusDebates,
      locallySavedTranscripts: report.locallySavedTranscripts,
      unavailableTranscripts: report.unavailableTranscripts,
      acquisitionRate: report.acquisitionRate,
      unavailable: unavailable.map(({ debateNumber, debateId, videoId, error }) => ({
        debateNumber,
        debateId,
        videoId,
        error
      }))
    },
    null,
    2
  )
);

if (unavailable.length && !allowMissing) process.exitCode = 2;
