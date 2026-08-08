#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V424_TOPIC_FAMILIES, classifyV424Motion } from "./lib/v424-source-classification.mjs";

const manifestPath = "docs/assessment-production/manifest-v1.json";
const outputPath = "docs/assessment-production/canary-v1.json";
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
const shouldWrite = process.argv.includes("--write");
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at requires an ISO timestamp");
if (shouldWrite) await access(path.resolve(outputPath)).then(() => { throw new Error(`${outputPath} already exists`); }, () => true);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifestBytes = await readFile(path.resolve(manifestPath));
const manifest = JSON.parse(manifestBytes);
if (manifest.status !== "frozen-cohort-pending-ten-debate-canary-selection" || !manifest.authorization.tenDebateCanarySelection || manifest.authorization.modelExecution) throw new Error("production manifest does not authorize canary selection");

const salt = "slugfester-production-canary-v1";
const durationBand = (seconds) => seconds < 3600 ? "under-60-minutes" : seconds < 5400 ? "60-to-89-minutes" : "90-minutes-or-more";
const sourceBand = (events) => events <= 1800 ? "direct-sized" : events <= 3600 ? "partition-medium" : "partition-heavy";
const captionKind = (source) => source.track?.kind === "asr" ? "auto" : source.track?.kind?.startsWith("api-") ? "api" : "human";
const candidates = [];
for (const item of manifest.items.filter((entry) => entry.disposition === "pending-reassessment")) {
  const source = JSON.parse(await readFile(path.resolve(item.sourceChain.manifest), "utf8"));
  candidates.push({
    debateNumber: item.debateNumber,
    debateId: item.debateId,
    videoId: item.videoId,
    motion: item.motion,
    sides: item.sides,
    family: classifyV424Motion(item.motion),
    durationSeconds: source.durationSeconds,
    durationBand: durationBand(source.durationSeconds),
    captionKind: captionKind(source),
    sourceEventCount: source.eventCount,
    sourceComplexityBand: sourceBand(source.eventCount),
    sourceChain: item.sourceChain,
    selectionRankSha256: sha256(`${salt}:${item.debateId}`)
  });
}
if (candidates.length !== 174) throw new Error("pending production candidate count mismatch");

const targets = {
  family: Object.fromEntries(V424_TOPIC_FAMILIES.map((family) => [family, 1])),
  durationBand: { "under-60-minutes": 2, "60-to-89-minutes": 2, "90-minutes-or-more": 2 },
  sourceComplexityBand: { "direct-sized": 2, "partition-medium": 2, "partition-heavy": 2 },
  captionKind: { api: 1, human: 1, auto: 1 }
};
const weights = { family: 10000, captionKind: 9000, durationBand: 2200, sourceComplexityBand: 2200 };
const counts = Object.fromEntries(Object.keys(targets).map((dimension) => [dimension, {}]));
const selected = [];
const selectedIds = new Set();
const deficitGain = (candidate) => Object.entries(targets).reduce((sum, [dimension, categories]) => sum + ((counts[dimension][candidate[dimension]] ?? 0) < (categories[candidate[dimension]] ?? 0) ? weights[dimension] : 0), 0);
while (selected.length < 10) {
  const ranked = candidates.filter((candidate) => !selectedIds.has(candidate.debateId)).sort((left, right) => {
    const gain = deficitGain(right) - deficitGain(left);
    if (gain) return gain;
    const newSpeakersLeft = [...left.sides.pro.speakers, ...left.sides.con.speakers].filter((speaker) => !selected.some((item) => [...item.sides.pro.speakers, ...item.sides.con.speakers].includes(speaker))).length;
    const newSpeakersRight = [...right.sides.pro.speakers, ...right.sides.con.speakers].filter((speaker) => !selected.some((item) => [...item.sides.pro.speakers, ...item.sides.con.speakers].includes(speaker))).length;
    return newSpeakersRight - newSpeakersLeft || left.selectionRankSha256.localeCompare(right.selectionRankSha256) || left.debateId.localeCompare(right.debateId);
  });
  const next = ranked[0];
  if (!next) throw new Error("canary selection exhausted");
  selected.push(next);
  selectedIds.add(next.debateId);
  for (const dimension of Object.keys(targets)) counts[dimension][next[dimension]] = (counts[dimension][next[dimension]] ?? 0) + 1;
}
for (const [dimension, categories] of Object.entries(targets)) for (const [category, minimum] of Object.entries(categories)) if ((counts[dimension][category] ?? 0) < minimum) throw new Error(`canary coverage failed: ${dimension}.${category}`);
selected.sort((left, right) => Number(left.debateNumber) - Number(right.debateNumber));
const sourceHashes = { [manifestPath]: sha256(manifestBytes), "docs/assessment-production-workflow.md": sha256(await readFile(path.resolve("docs/assessment-production-workflow.md"))), "scripts/select-assessment-production-canary.mjs": sha256(await readFile(new URL(import.meta.url))) };
for (const item of selected) for (const [file, digest] of [[item.sourceChain.transcript, item.sourceChain.transcriptSha256], [item.sourceChain.events, item.sourceChain.eventsSha256], [item.sourceChain.manifest, item.sourceChain.manifestSha256]]) sourceHashes[file] = digest;
const artifact = {
  schemaVersion: "1.0-adjudicated-consensus-production-canary",
  status: "frozen-ten-debate-canary-pending-packet-preparation",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  selectionBoundary: { pendingDyadicOnly: true, candidateCount: 174, selectedCount: 10, fixedSalt: salt, transcriptContentSemanticallyInspected: false, audioAccessed: false, legacyAssessmentAccessed: false, scoreAccessed: false, winnerAccessed: false, rankingInputs: ["debateId", "motion-family", "duration-band", "caption-kind", "event-count-complexity-band", "speaker-diversity"] },
  coverageTargets: targets,
  observedCoverage: counts,
  debates: selected,
  sourceHashes,
  cost: { modelContexts: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { packetPreparation: true, executionManifest: false, modelExecution: false, paidTranscription: false, scoreDerivation: false, publication: false, productionMutation: false, remainingProductionBatches: false }
};
if (shouldWrite) await writeFile(path.resolve(outputPath), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? artifact.status : "preview", debates: selected.map(({ debateNumber, debateId, family, durationBand, captionKind, sourceComplexityBand }) => ({ debateNumber, debateId, family, durationBand, captionKind, sourceComplexityBand })), observedCoverage: counts, nextAuthorized: "canary-packet-preparation" }, null, 2));
