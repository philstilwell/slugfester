#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const input = process.argv[2];
const outIndex = process.argv.indexOf("--out");
const outputRoot = path.resolve(outIndex >= 0 ? process.argv[outIndex + 1] : ".assessment-cache/captions");

if (!input || (outIndex >= 0 && !process.argv[outIndex + 1])) {
  console.error("Usage: node scripts/acquire-youtube-captions.mjs <youtube-url-or-id> [--out directory]");
  process.exit(1);
}

function videoIdFrom(value) {
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  const url = new URL(value);
  if (url.hostname === "youtu.be") return url.pathname.slice(1);
  return url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).at(-1);
}

function decodeEntities(value) {
  const named = { amp: "&", apos: "'", quot: '"', lt: "<", gt: ">", nbsp: " " };
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name] ?? match);
}

function stripMarkup(value) {
  return decodeEntities(value.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

function parseAttributes(value) {
  return Object.fromEntries(
    [...value.matchAll(/([:\w-]+)="([^"]*)"/g)].map((match) => [match[1], decodeEntities(match[2])])
  );
}

function parseCaptionXml(xml) {
  const events = [];
  for (const match of xml.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const attrs = parseAttributes(match[1]);
    const text = stripMarkup(match[2]);
    if (!text) continue;
    events.push({
      startMs: Math.round(Number(attrs.start || 0) * 1000),
      durationMs: Math.round(Number(attrs.dur || 0) * 1000),
      text
    });
  }
  if (events.length) return events;

  for (const match of xml.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)) {
    const attrs = parseAttributes(match[1]);
    const text = stripMarkup(match[2]);
    if (!text) continue;
    events.push({
      startMs: Number(attrs.t || 0),
      durationMs: Number(attrs.d || 0),
      text
    });
  }
  return events;
}

function timestamp(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "accept-language": "en-US,en;q=0.9",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36",
      ...options.headers
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

const videoId = videoIdFrom(input);
if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error(`Could not resolve a YouTube video ID from ${input}`);

const sourceUrl = `https://www.youtube.com/watch?v=${videoId}`;
const watchHtml = await fetchText(sourceUrl);
const apiKey = watchHtml.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
if (!apiKey) throw new Error("Could not locate YouTube's public player API key");

const playerResponse = JSON.parse(
  await fetchText(`https://www.youtube.com/youtubei/v1/player?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: "20.10.38",
          androidSdkVersion: 30,
          hl: "en",
          gl: "US"
        }
      },
      videoId
    })
  })
);

const tracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
if (!tracks.length) throw new Error(`No public caption tracks were available for ${videoId}`);
const isEnglishTrack = (candidate) => /^en(?:-|$)/i.test(candidate.languageCode || "");
const track =
  tracks.find((candidate) => isEnglishTrack(candidate) && candidate.kind !== "asr") ||
  tracks.find(isEnglishTrack) ||
  tracks[0];
const captionUrl = new URL(track.baseUrl);
captionUrl.searchParams.set("fmt", "srv3");
const rawXml = await fetchText(captionUrl);
const events = parseCaptionXml(rawXml);
if (!events.length) throw new Error(`Caption XML for ${videoId} contained no readable events`);

const normalizedJson = `${JSON.stringify(events, null, 2)}\n`;
const transcript = `${events.map((event) => `[${timestamp(event.startMs)}] ${event.text}`).join("\n")}\n`;
const outputDirectory = path.join(outputRoot, videoId);
await mkdir(outputDirectory, { recursive: true });

const manifest = {
  schemaVersion: "1.0",
  sourceUrl,
  videoId,
  title: playerResponse.videoDetails?.title || "",
  channel: playerResponse.videoDetails?.author || "",
  durationSeconds: Number(playerResponse.videoDetails?.lengthSeconds || 0),
  retrievedAt: new Date().toISOString(),
  extractionMethod: "YouTube public Innertube Android player captions; srv3 XML normalized locally",
  track: {
    languageCode: track.languageCode,
    name: track.name?.simpleText || track.name?.runs?.map((run) => run.text).join("") || "",
    kind: track.kind || "human",
    isTranslatable: Boolean(track.isTranslatable)
  },
  rawCaptionSha256: sha256(rawXml),
  normalizedEventsSha256: sha256(normalizedJson),
  transcriptSha256: sha256(transcript),
  eventCount: events.length,
  wordCount: transcript.split(/\s+/).filter(Boolean).length,
  storagePolicy: "Caption text remains in ignored local cache; committed calibration artifacts retain hashes and short excerpts only."
};

await Promise.all([
  writeFile(path.join(outputDirectory, "captions.srv3.xml"), rawXml),
  writeFile(path.join(outputDirectory, "events.json"), normalizedJson),
  writeFile(path.join(outputDirectory, "transcript.txt"), transcript),
  writeFile(path.join(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`)
]);

console.log(JSON.stringify({ outputDirectory, ...manifest }, null, 2));
