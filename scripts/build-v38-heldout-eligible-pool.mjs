#!/usr/bin/env node

import { access, readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const ROOT = "docs/calibration/v3.8/held-out-burden-contact-integration-gate";
const OUTPUT = `${ROOT}/metadata-eligible-pool.json`;
const SOURCE_POOL = "docs/calibration/v2.7/held-out-gates/metadata-eligible-pool.json";
const NON_USE_CATALOGS = new Set([
  path.resolve(SOURCE_POOL),
  path.resolve("docs/calibration/v2.1/corpus-transcript-audit.json")
]);
const createdAtIndex = process.argv.indexOf("--created-at");
const createdAt = createdAtIndex >= 0 ? process.argv[createdAtIndex + 1] : null;

if (!createdAt || Number.isNaN(Date.parse(createdAt))) {
  console.error("Usage: node scripts/build-v38-heldout-eligible-pool.mjs --created-at <ISO timestamp>");
  process.exit(1);
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const normalizeNumber = (value) => String(value).padStart(2, "0");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const item = path.join(directory, entry.name);
    if (item === path.resolve(ROOT)) continue;
    if (entry.isDirectory()) files.push(...await walk(item));
    else files.push(item);
  }
  return files;
}

function collectIdentities(value, retiredIds, retiredNumbers) {
  if (Array.isArray(value)) {
    for (const item of value) collectIdentities(item, retiredIds, retiredNumbers);
    return;
  }
  if (!value || typeof value !== "object") return;

  if (typeof value.debateId === "string") retiredIds.add(value.debateId);
  if (typeof value.debateNumber === "string" || typeof value.debateNumber === "number") {
    retiredNumbers.add(normalizeNumber(value.debateNumber));
  }
  if (Array.isArray(value.debateNumbers)) {
    for (const number of value.debateNumbers) retiredNumbers.add(normalizeNumber(number));
  }
  if (typeof value.debateId === "string" && (typeof value.number === "string" || typeof value.number === "number")) {
    retiredNumbers.add(normalizeNumber(value.number));
  }

  for (const child of Object.values(value)) collectIdentities(child, retiredIds, retiredNumbers);
}

const sourcePoolText = await readFile(path.resolve(SOURCE_POOL), "utf8");
const sourcePool = JSON.parse(sourcePoolText);
const retiredIds = new Set(sourcePool.retiredDebateIds);
const retiredNumbers = new Set();
const calibrationRoot = path.resolve("docs/calibration");
const priorJsonFiles = (await walk(calibrationRoot))
  .filter((file) => file.endsWith(".json"))
  .filter((file) => !NON_USE_CATALOGS.has(file));

for (const file of priorJsonFiles) {
  const match = path.basename(file).match(/^debate-(\d+)\.json$/);
  if (match) retiredNumbers.add(normalizeNumber(match[1]));
  let parsed;
  try {
    parsed = JSON.parse(await readFile(file, "utf8"));
  } catch {
    continue;
  }
  collectIdentities(parsed, retiredIds, retiredNumbers);
}

const benchmarkDirectory = path.resolve("docs/calibration/v2.1/benchmark-definitions");
for (const file of await readdir(benchmarkDirectory)) {
  if (file.endsWith(".json")) retiredIds.add(file.slice(0, -5));
}

const candidates = sourcePool.eligibleDyadic;
const eligibleDyadic = [];
const exclusions = [];

for (const candidate of candidates) {
  const number = normalizeNumber(candidate.number);
  let reason = null;
  if (retiredIds.has(candidate.debateId)) reason = "prior-calibration-debate-id";
  else if (retiredNumbers.has(number)) reason = "prior-calibration-debate-number";
  else if (candidate.speakerCount !== 2 || candidate.sides.pro.speakers.length !== 1 || candidate.sides.con.speakers.length !== 1) reason = "not-dyadic";
  else {
    const chain = ["transcript.txt", "events.json", "manifest.json"].map((name) => path.resolve(`.assessment-cache/captions/${candidate.videoId}/${name}`));
    try {
      await Promise.all(chain.map((file) => access(file)));
    } catch {
      reason = "local-transcript-chain-missing";
    }
  }

  if (reason) exclusions.push({ debateId: candidate.debateId, number, reason });
  else eligibleDyadic.push({ ...candidate, number, transcriptChainPresentAtSelection: true });
}

eligibleDyadic.sort((a, b) => a.debateId.localeCompare(b.debateId));
exclusions.sort((a, b) => a.debateId.localeCompare(b.debateId));

const artifact = {
  schemaVersion: "3.8-heldout-burden-contact-metadata-pool",
  createdAt,
  sourcePoolPath: SOURCE_POOL,
  sourcePoolSha256: sha256(sourcePoolText),
  selectionFields: ["debateId", "number", "videoId", "motion", "sides", "speakerCount", "transcriptChainPresentAtSelection"],
  transcriptContentAccessed: false,
  audioAccessed: false,
  legacyAssessmentContentAccessed: false,
  candidateRanksInspected: false,
  dyadicOnly: true,
  retiredDebateIds: [...retiredIds].sort(),
  retiredDebateNumbers: [...retiredNumbers].sort(),
  eligibleDyadic,
  exclusions,
  audit: {
    sourceCandidateCount: candidates.length,
    eligibleDyadicCount: eligibleDyadic.length,
    excludedCandidateCount: exclusions.length,
    missingTranscriptChainCount: exclusions.filter((item) => item.reason === "local-transcript-chain-missing").length,
    priorJsonFilesScanned: priorJsonFiles.length
  }
};

await writeFile(path.resolve(OUTPUT), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: "written", output: OUTPUT, audit: artifact.audit }, null, 2));
