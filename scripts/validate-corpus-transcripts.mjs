#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { publishedDebates } from "../src/data/debates.js";

const allowMissing = process.argv.includes("--allow-missing");

const auditPath = path.resolve(
  "docs/calibration/v2.1/corpus-transcript-audit.json"
);
const gatePath = path.resolve(
  "docs/calibration/v2.1/complete-gate/gate-manifest.json"
);

function fail(message) {
  throw new Error(message);
}

function videoIdFrom(url) {
  return new URL(url).searchParams.get("v");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

const audit = JSON.parse(await readFile(auditPath, "utf8"));
const gate = JSON.parse(await readFile(gatePath, "utf8"));
const errors = [];
const expected = new Map(
  publishedDebates.map((debate) => [
    debate.id,
    {
      debateNumber: debate.number,
      videoId: videoIdFrom(debate.youtubeUrl)
    }
  ])
);

if (audit.corpusDebates !== publishedDebates.length) {
  errors.push(
    `corpusDebates ${audit.corpusDebates} does not match ${publishedDebates.length}`
  );
}
if (!Array.isArray(audit.entries) || audit.entries.length !== expected.size) {
  errors.push(`audit must contain exactly ${expected.size} entries`);
}

const seenIds = new Set();
const seenVideoIds = new Set();
let available = 0;
let unavailable = 0;
let localHashesChecked = 0;

for (const entry of audit.entries || []) {
  if (seenIds.has(entry.debateId)) errors.push(`duplicate debateId ${entry.debateId}`);
  if (seenVideoIds.has(entry.videoId)) errors.push(`duplicate videoId ${entry.videoId}`);
  seenIds.add(entry.debateId);
  seenVideoIds.add(entry.videoId);

  const expectedEntry = expected.get(entry.debateId);
  if (!expectedEntry) {
    errors.push(`unknown debateId ${entry.debateId}`);
    continue;
  }
  if (entry.debateNumber !== expectedEntry.debateNumber) {
    errors.push(`${entry.debateId}: debate number mismatch`);
  }
  if (entry.videoId !== expectedEntry.videoId) {
    errors.push(`${entry.debateId}: video ID mismatch`);
  }

  if (entry.status === "available") {
    available += 1;
    const transcriptPath = `.assessment-cache/captions/${entry.videoId}/transcript.txt`;
    const eventsPath = `.assessment-cache/captions/${entry.videoId}/events.json`;
    if (entry.transcriptStorage !== transcriptPath) {
      errors.push(`${entry.debateId}: noncanonical transcript path`);
    }
    if (entry.eventsStorage !== eventsPath) {
      errors.push(`${entry.debateId}: noncanonical events path`);
    }
    for (const [label, value] of [
      ["transcriptSha256", entry.transcriptSha256],
      ["normalizedEventsSha256", entry.normalizedEventsSha256]
    ]) {
      if (!/^[a-f0-9]{64}$/.test(value || "")) {
        errors.push(`${entry.debateId}: invalid ${label}`);
      }
    }
    if (!Number.isInteger(entry.wordCount) || entry.wordCount <= 0) {
      errors.push(`${entry.debateId}: invalid wordCount`);
    }
    if (!Number.isInteger(entry.eventCount) || entry.eventCount <= 0) {
      errors.push(`${entry.debateId}: invalid eventCount`);
    }
    if (!entry.extractionMethod) {
      errors.push(`${entry.debateId}: missing extractionMethod`);
    }
    if (entry.track?.kind?.startsWith("api-")) {
      if (!entry.audioSourceUrl) {
        errors.push(`${entry.debateId}: API transcript lacks audioSourceUrl`);
      }
      if (!entry.model) errors.push(`${entry.debateId}: API transcript lacks model`);
    }

    const localTranscript = path.resolve(entry.transcriptStorage);
    const localEvents = path.resolve(entry.eventsStorage);
    if ((await exists(localTranscript)) && (await exists(localEvents))) {
      const [transcript, events] = await Promise.all([
        readFile(localTranscript),
        readFile(localEvents)
      ]);
      if (sha256(transcript) !== entry.transcriptSha256) {
        errors.push(`${entry.debateId}: local transcript hash mismatch`);
      }
      if (sha256(events) !== entry.normalizedEventsSha256) {
        errors.push(`${entry.debateId}: local events hash mismatch`);
      }
      localHashesChecked += 1;
    }
  } else if (entry.status === "unavailable") {
    unavailable += 1;
    if (!entry.error) errors.push(`${entry.debateId}: missing acquisition error`);
    if (entry.transcriptStorage || entry.transcriptSha256) {
      errors.push(`${entry.debateId}: unavailable entry claims transcript material`);
    }
  } else {
    errors.push(`${entry.debateId}: invalid status ${entry.status}`);
  }
}

if (available !== audit.locallySavedTranscripts) {
  errors.push("locallySavedTranscripts does not match entry count");
}
if (unavailable !== audit.unavailableTranscripts) {
  errors.push("unavailableTranscripts does not match entry count");
}
const expectedRate = Number((available / expected.size).toFixed(4));
if (audit.acquisitionRate !== expectedRate) {
  errors.push(`acquisitionRate must be ${expectedRate}`);
}
if (unavailable && !allowMissing) {
  errors.push(
    `${unavailable} corpus transcript(s) unavailable; rerun with --allow-missing only for an explicitly incomplete audit`
  );
}

const entryById = new Map((audit.entries || []).map((entry) => [entry.debateId, entry]));
for (const debate of gate.sample.debates) {
  const entry = entryById.get(debate.debateId);
  if (!entry || entry.status !== "available") {
    errors.push(`complete-gate debate lacks a transcript: ${debate.debateId}`);
  }
}

if (errors.length) fail(errors.join("\n"));

console.log(
  JSON.stringify(
    {
      corpusDebates: expected.size,
      available,
      unavailable,
      acquisitionRate: expectedRate,
      completeGateTranscripts: gate.sample.debates.length,
      localHashesChecked
    },
    null,
    2
  )
);
