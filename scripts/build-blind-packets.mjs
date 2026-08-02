#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const manifestPath = path.resolve(
  process.argv[2] || "docs/calibration/v2.1/pilot-manifest.json"
);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const cacheRoot = path.resolve(".assessment-cache");
const packetDirectory = path.join(cacheRoot, "blind-packets-v2.1");
const committedManifestDirectory = path.resolve("docs/calibration/v2.1/source-manifests");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function videoIdFrom(url) {
  return new URL(url).searchParams.get("v");
}

await Promise.all([
  mkdir(packetDirectory, { recursive: true }),
  mkdir(committedManifestDirectory, { recursive: true })
]);

for (const debate of manifest.debates) {
  const videoId = videoIdFrom(debate.youtubeUrl);
  const captionDirectory = path.join(cacheRoot, "captions", videoId);
  const [eventsSource, captionManifestSource] = await Promise.all([
    readFile(path.join(captionDirectory, "events.json"), "utf8"),
    readFile(path.join(captionDirectory, "manifest.json"), "utf8")
  ]);
  const events = JSON.parse(eventsSource);
  const captionManifest = JSON.parse(captionManifestSource);
  const blindPacket = {
    schemaVersion: "2.1",
    workflowVersion: manifest.workflowVersion,
    debateId: debate.debateId,
    motionType: debate.motionType,
    motion: debate.motion,
    neutralSides: debate.neutralSides,
    prohibitedInputs: [
      "legacy scores",
      "legacy critiques",
      "legacy fallacy or bias tags",
      "legacy Overall Commentary"
    ],
    instructions:
      "Build the burden map and argument inventory from this transcript before viewing any prior assessment. Treat the neutral side labels as identifiers, not verdicts.",
    transcript: events
  };
  const blindPacketSource = `${JSON.stringify(blindPacket, null, 2)}\n`;
  const committedManifest = {
    ...captionManifest,
    debateId: debate.debateId,
    motionType: debate.motionType,
    crossCheck: debate.crossCheck,
    blindPacketSha256: sha256(blindPacketSource),
    blindPacketStorage: "Ignored local cache; it deliberately excludes all legacy assessment fields.",
    pilotSelectionManifest: path.relative(process.cwd(), manifestPath)
  };

  await Promise.all([
    writeFile(path.join(packetDirectory, `${debate.debateId}.json`), blindPacketSource),
    writeFile(
      path.join(committedManifestDirectory, `${debate.debateId}.json`),
      `${JSON.stringify(committedManifest, null, 2)}\n`
    )
  ]);
}

console.log(`Built ${manifest.debates.length} blind packets and committed source manifests.`);
