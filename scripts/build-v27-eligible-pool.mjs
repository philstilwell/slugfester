#!/usr/bin/env node

import { access, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { debates } from "../src/data/debates.js";
import { MULTI_SPEAKER_ROSTERS } from "./lib/debate-speaker-rosters.mjs";

const createdAtIndex = process.argv.indexOf("--created-at"); const createdAt = createdAtIndex >= 0 ? process.argv[createdAtIndex + 1] : null;
if (!createdAt) { console.error("Usage: node scripts/build-v27-eligible-pool.mjs --created-at <ISO timestamp>"); process.exit(1); }
const outputPath = path.resolve("docs/calibration/v2.7/held-out-gates/metadata-eligible-pool.json");
const multiSpeakers = MULTI_SPEAKER_ROSTERS;
function videoId(url) { const parsed = new URL(url); if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1); const value = parsed.searchParams.get("v"); if (!value) throw new Error(`cannot derive video ID from ${url}`); return value; }
const retired = new Set((await readdir(path.resolve("docs/calibration/v2.1/benchmark-definitions"))).filter((file) => file.endsWith(".json")).map((file) => file.slice(0, -5)));
for (const manifestPath of ["docs/calibration/v2.4/held-out-gate/gate-manifest.json", "docs/calibration/v2.5/held-out-gate/gate-manifest.json", "docs/calibration/v2.6/held-out-gate/gate-manifest.json"]) { const manifest = JSON.parse(await readFile(path.resolve(manifestPath), "utf8")); for (const item of manifest.sample.debates) retired.add(item.debateId); }
const eligibleDyadic = []; const eligibleMultiSpeaker = []; const exclusions = [];
for (const debate of debates) {
  const id = debate.id; const override = multiSpeakers[id]; const sideSpeakers = override ?? { pro: [debate.sides.pro.speaker], con: [debate.sides.con.speaker] }; const speakers = [...sideSpeakers.pro, ...sideSpeakers.con]; const idFromUrl = videoId(debate.youtubeUrl); const chainPaths = ["transcript.txt", "events.json", "manifest.json"].map((file) => path.resolve(`.assessment-cache/captions/${idFromUrl}/${file}`)); let chainPresent = true; try { await Promise.all(chainPaths.map((file) => access(file))); } catch { chainPresent = false; }
  const projected = { debateId: id, number: debate.number, videoId: idFromUrl, motion: debate.motion, sides: { pro: { label: debate.sides.pro.name, speakers: sideSpeakers.pro }, con: { label: debate.sides.con.name, speakers: sideSpeakers.con } }, speakerCount: new Set(speakers).size, transcriptChainPresentAtSelection: chainPresent };
  if (retired.has(id)) exclusions.push({ debateId: id, reason: "retired-prior-development-or-gate" });
  else if (!chainPresent) exclusions.push({ debateId: id, reason: "local-transcript-chain-missing" });
  else if (projected.speakerCount === 2 && sideSpeakers.pro.length === 1 && sideSpeakers.con.length === 1) eligibleDyadic.push(projected);
  else if ([3, 4].includes(projected.speakerCount)) eligibleMultiSpeaker.push(projected);
  else exclusions.push({ debateId: id, reason: "outside-v2.7-supported-speaker-count" });
}
eligibleDyadic.sort((a, b) => a.debateId.localeCompare(b.debateId)); eligibleMultiSpeaker.sort((a, b) => a.debateId.localeCompare(b.debateId)); exclusions.sort((a, b) => a.debateId.localeCompare(b.debateId));
const artifact = { schemaVersion: "2.7-metadata-only-eligible-pool", createdAt, sourceDataPath: "src/data/debates.js", selectionFields: ["debateId", "number", "videoId", "motion", "sides", "speakerCount", "transcriptChainPresentAtSelection"], transcriptContentAccessed: false, legacyAssessmentContentAccessed: false, retiredDebateIds: [...retired].sort(), eligibleDyadic, eligibleMultiSpeaker, exclusions, audit: { corpusDebateCount: debates.length, retiredDebateCount: retired.size, eligibleDyadicCount: eligibleDyadic.length, eligibleMultiSpeakerCount: eligibleMultiSpeaker.length, missingTranscriptChainCount: exclusions.filter((item) => item.reason === "local-transcript-chain-missing").length } };
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`); console.log(JSON.stringify({ status: "written", output: path.relative(process.cwd(), outputPath), audit: artifact.audit }, null, 2));
