#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const gatePath = path.resolve(process.argv[2] ?? "docs/calibration/v2.6/held-out-gate/gate-manifest.json");
const gate = JSON.parse(await readFile(gatePath, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const debates = [];

for (const debate of gate.sample.debates) {
  const root = path.resolve(".assessment-cache/captions", debate.videoId);
  const [transcriptSource, eventsSource, manifestSource] = await Promise.all([
    readFile(path.join(root, "transcript.txt"), "utf8"),
    readFile(path.join(root, "events.json"), "utf8"),
    readFile(path.join(root, "manifest.json"), "utf8"),
  ]);
  const manifest = JSON.parse(manifestSource);
  const events = JSON.parse(eventsSource);
  const transcriptSha256 = sha256(transcriptSource);
  const eventsSha256 = sha256(eventsSource);
  if (manifest.videoId !== debate.videoId || manifest.transcriptSha256 !== transcriptSha256 || manifest.normalizedEventsSha256 !== eventsSha256 || manifest.eventCount !== events.length) throw new Error(`${debate.debateId}: invalid local source chain`);
  debates.push({
    debateId: debate.debateId,
    videoId: debate.videoId,
    sourceType: manifest.track?.kind === "human" ? "human-captions" : "auto-captions",
    wordCount: manifest.wordCount,
    eventCount: events.length,
    transcriptSha256,
    eventsSha256,
    manifestSha256: sha256(manifestSource),
  });
}

console.log(JSON.stringify({ status: "passed", debateCount: debates.length, paidTranscriptionCalls: 0, debates }, null, 2));
