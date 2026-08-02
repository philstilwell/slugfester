#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { debates } from "../src/data/debates.js";

const pilotManifestPath = path.resolve(
  process.argv[2] || "docs/calibration/v2.1/pilot-manifest.json"
);
const outputDirectory = path.resolve("docs/calibration/v2.1/benchmark-definitions");
const cacheRoot = path.resolve(".assessment-cache/captions");
const pilot = JSON.parse(await readFile(pilotManifestPath, "utf8"));

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseTimestamp(value) {
  const parts = value.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) {
    throw new Error(`Invalid timestamp: ${value}`);
  }
  return parts.reduce((seconds, part) => seconds * 60 + part, 0);
}

function formatTimestamp(totalSeconds) {
  const wholeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const seconds = wholeSeconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function videoIdFrom(url) {
  return new URL(url).searchParams.get("v");
}

function selectExcerpt(events, timestamp, wordLimit = 90, stopTimestamp = null) {
  const startSeconds = parseTimestamp(timestamp);
  const explicitStopSeconds = stopTimestamp ? parseTimestamp(stopTimestamp) : null;
  const stopSeconds =
    explicitStopSeconds && explicitStopSeconds > startSeconds
      ? Math.min(startSeconds + 105, explicitStopSeconds)
      : startSeconds + 105;
  const selected = [];
  let wordCount = 0;
  let lastEventEndSeconds = startSeconds;
  for (const event of events) {
    const eventStartSeconds = event.startMs / 1000;
    const eventDurationSeconds = event.durationMs / 1000;
    if (eventStartSeconds + eventDurationSeconds < startSeconds) continue;
    if (eventStartSeconds >= stopSeconds) break;
    const words = event.text.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const remaining = wordLimit - wordCount;
    selected.push(words.slice(0, remaining).join(" "));
    wordCount += Math.min(words.length, remaining);
    lastEventEndSeconds = eventStartSeconds + eventDurationSeconds;
    if (wordCount >= wordLimit) break;
  }
  return {
    text: selected.join(" ").replace(/\s+/g, " ").trim(),
    start: timestamp,
    end: formatTimestamp(lastEventEndSeconds)
  };
}

function burdenFor(side, motion) {
  return {
    id: `${side}-primary`,
    side,
    type: "constructive-or-critical",
    description: `Advance the ${side} position on the locked motion: ${motion}`,
    successCriteria:
      "State a relevant claim, supply the needed inferential bridge or critical test, and calibrate the conclusion to the evidence presented in the sampled move."
  };
}

await mkdir(outputDirectory, { recursive: true });

for (const selectedDebate of pilot.debates) {
  const debate = debates.find((candidate) => candidate.id === selectedDebate.debateId);
  if (!debate) throw new Error(`Missing debate object: ${selectedDebate.debateId}`);
  const firstSection = debate.sections?.[0];
  const firstExchange = firstSection?.exchanges?.[0];
  if (!firstExchange?.pro || !firstExchange?.con) {
    throw new Error(`Missing first paired exchange: ${selectedDebate.debateId}`);
  }

  const videoId = videoIdFrom(selectedDebate.youtubeUrl);
  const events = JSON.parse(
    await readFile(path.join(cacheRoot, videoId, "events.json"), "utf8")
  );
  const sourceManifest = JSON.parse(
    await readFile(
      path.resolve(
        "docs/calibration/v2.1/source-manifests",
        `${selectedDebate.debateId}.json`
      ),
      "utf8"
    )
  );

  const moves = Object.fromEntries(
    ["pro", "con"].map((side) => {
      const legacyMove = firstExchange[side];
      const otherSide = side === "pro" ? "con" : "pro";
      const sourceSelection = selectExcerpt(
        events,
        legacyMove.time,
        90,
        firstExchange[otherSide].time
      );
      const sourceExcerpt = sourceSelection.text;
      if (!sourceExcerpt) {
        throw new Error(`No excerpt at ${legacyMove.time}: ${selectedDebate.debateId}`);
      }
      return [
        side,
        {
          id: `${selectedDebate.debateId}-${side}-benchmark-01`,
          side,
          timestamp: legacyMove.time,
          sourceSpan: { start: sourceSelection.start, end: sourceSelection.end },
          roleLabel: legacyMove.role,
          sourceExcerpt,
          sourceExcerptSha256: sha256(sourceExcerpt),
          sourceExcerptWordCount: sourceExcerpt.split(/\s+/).length,
          quoteKind: "quote",
          burdenIds: [`${side}-primary`],
          respondsToIds: [],
          importance: 3
        }
      ];
    })
  );

  const definition = {
    schemaVersion: "2.1-benchmark-definition",
    workflowVersion: pilot.workflowVersion,
    calibrationOnly: true,
    debateId: selectedDebate.debateId,
    debateNumber: selectedDebate.number,
    motionType: selectedDebate.motionType,
    motion: selectedDebate.motion,
    sides: {
      pro: { label: debate.sides.pro.name, speaker: debate.sides.pro.speaker },
      con: { label: debate.sides.con.name, speaker: debate.sides.con.speaker }
    },
    sourceManifest: `docs/calibration/v2.1/source-manifests/${selectedDebate.debateId}.json`,
    transcriptSha256: sourceManifest.transcriptSha256,
    selectionProtocol: {
      lockedBeforeScoring: true,
      rule: "Use the first paired move location in the existing scorecard as a stable benchmark; reveal no legacy score, critique, tag, section score, overall score, or commentary to either scoring pass.",
      limitation:
        "This tests score application on varied known moves, not blind argument discovery or complete-debate coverage. Existing role labels and move locations may still anchor selection."
    },
    section: {
      id: `${selectedDebate.debateId}-benchmark-section-01`,
      title: firstSection.title,
      weightPercent: 100,
      weightRationale: "The targeted pilot contains one preselected benchmark section, so it receives the entire within-pilot weight. This is not a production debate weight.",
      moves
    },
    burdens: [
      burdenFor("pro", selectedDebate.motion),
      burdenFor("con", selectedDebate.motion)
    ]
  };

  await writeFile(
    path.join(outputDirectory, `${selectedDebate.debateId}.json`),
    `${JSON.stringify(definition, null, 2)}\n`
  );
}

console.log(`Built ${pilot.debates.length} score-blind benchmark definitions.`);
