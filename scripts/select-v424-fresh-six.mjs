#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V424_TOPIC_FAMILIES as families, classifyV424Motion } from "./lib/v424-source-classification.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at requires an ISO timestamp");
const poolPath = "docs/calibration/v3.8/held-out-burden-contact-integration-gate/metadata-eligible-pool.json";
const priorSamplePaths = [
  "docs/calibration/v4.1.7/fresh-six-gate/source-only-sample.json",
  "docs/calibration/v4.1.8/source-integrity-fresh-six-gate/source-only-sample.json",
  "docs/calibration/v4.1.9/schema-bounded-fresh-six-gate/source-only-sample.json",
  "docs/calibration/v4.2.1/compact-fresh-six-gate/source-only-sample.json",
  "docs/calibration/v4.2.3/chronology-first-fresh-six-gate/source-only-sample.json"
];
const priorScreeningPath = "docs/calibration/v4.2.3/chronology-first-fresh-six-gate/sample-screening.json";
const workflowPath = "docs/assessment-workflow-v4.2.4.md";
const classifierPath = "scripts/lib/v424-source-classification.mjs";
const scriptPath = "scripts/select-v424-fresh-six.mjs";
const outputPath = "docs/calibration/v4.2.4/screened-chronology-fresh-six-gate/source-only-sample.json";
const salt = "slugfester-v4.2.4-screened-chronology-fresh-six-source-only";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => access(path.resolve(root, file)).then(() => true, () => false);
if (shouldWrite && await exists(outputPath)) throw new Error(`${outputPath} already exists`);

const [poolText, screeningText, ...priorSampleTexts] = await Promise.all([poolPath, priorScreeningPath, ...priorSamplePaths].map((file) => readFile(path.resolve(root, file), "utf8")));
const pool = JSON.parse(poolText);
const screening = JSON.parse(screeningText);
const priorSamples = priorSampleTexts.map(JSON.parse);
if (!pool.dyadicOnly || pool.legacyAssessmentContentAccessed || pool.candidateRanksInspected || pool.audit.missingTranscriptChainCount !== 0) throw new Error("source-only eligible pool boundary invalid");
if (screening.status !== "sample-rejected-before-packet-preparation" || !screening.disposition.revisedSourceOnlySelectorAuthorized) throw new Error("v4.2.3 screening did not authorize replacement selection");
if (priorSamples.some((sample) => sample.status !== "frozen-before-legacy-score-access" || sample.selectionBoundary.legacyAssessmentContentAccessed)) throw new Error("prior source-only exclusion sample invalid");

const v416DevelopmentIds = ["craig-malpass-kalam-nothing-2026", "woodford-edwards-rational-belief-god-2023", "craig-millican-does-god-exist-2011"];
const priorVersionNames = ["v417", "v418", "v419", "v421", "v423"];
const priorIdsByVersion = Object.fromEntries(priorVersionNames.map((version, index) => [version, priorSamples[index].debates.map((debate) => debate.debateId)]));
const priorFreshIds = Object.values(priorIdsByVersion).flat();
const exclusions = new Set([...pool.retiredDebateIds, ...v416DevelopmentIds, ...priorFreshIds]);
const durationBand = (seconds) => seconds < 5400 ? "short-under-90" : seconds <= 7200 ? "medium-90-through-120" : "long-over-120";
const candidates = [];
for (const debate of pool.eligibleDyadic) {
  if (exclusions.has(debate.debateId)) continue;
  const manifestPath = `.assessment-cache/captions/${debate.videoId}/manifest.json`;
  const manifestText = await readFile(path.resolve(root, manifestPath), "utf8");
  const manifest = JSON.parse(manifestText);
  if (manifest.videoId !== debate.videoId || !Number.isFinite(manifest.durationSeconds) || manifest.durationSeconds <= 0) throw new Error(`${debate.debateId}: local manifest invalid`);
  const family = classifyV424Motion(debate.motion);
  candidates.push({ ...debate, family, durationSeconds: manifest.durationSeconds, durationBand: durationBand(manifest.durationSeconds), manifestPath, manifestSha256: sha256(manifestText), selectionRankSha256: sha256(`${salt}:${family}:${debate.debateId}`) });
}
const byFamily = new Map(families.map((family) => [family, candidates.filter((candidate) => candidate.family === family).sort((a, b) => a.selectionRankSha256.localeCompare(b.selectionRankSha256))]));
for (const family of families) if (!byFamily.get(family)?.length) throw new Error(`${family}: no eligible candidate`);
let states = new Map([["0,0,0", { selected: [], aggregateRank: 0, familyOrderTie: "" }]]);
for (const family of families) {
  const next = new Map();
  for (const state of states.values()) for (const [rank, candidate] of byFamily.get(family).entries()) {
    const shortCount = state.selected.filter((item) => item.durationBand === "short-under-90").length + (candidate.durationBand === "short-under-90" ? 1 : 0);
    const mediumCount = state.selected.filter((item) => item.durationBand === "medium-90-through-120").length + (candidate.durationBand === "medium-90-through-120" ? 1 : 0);
    const longCount = state.selected.filter((item) => item.durationBand === "long-over-120").length + (candidate.durationBand === "long-over-120" ? 1 : 0);
    if (longCount > 3) continue;
    const selected = [...state.selected, candidate];
    const aggregateRank = state.aggregateRank + rank;
    const familyOrderTie = selected.map((item) => item.debateId).join("|");
    const key = `${shortCount},${mediumCount},${longCount}`;
    const existing = next.get(key);
    if (!existing || aggregateRank < existing.aggregateRank || aggregateRank === existing.aggregateRank && familyOrderTie < existing.familyOrderTie) next.set(key, { selected, aggregateRank, familyOrderTie });
  }
  states = next;
}
const eligibleStates = [...states.entries()].filter(([key]) => { const [shortCount, mediumCount, longCount] = key.split(",").map(Number); return shortCount >= 1 && mediumCount >= 1 && longCount >= 1 && longCount <= 3; }).map(([, state]) => state);
const best = eligibleStates.sort((a, b) => a.aggregateRank - b.aggregateRank || a.familyOrderTie.localeCompare(b.familyOrderTie))[0];
if (!best) throw new Error("no topic-complete tuple satisfies duration stratification");
const selected = best.selected;
const bandCounts = Object.fromEntries(["short-under-90", "medium-90-through-120", "long-over-120"].map((band) => [band, selected.filter((candidate) => candidate.durationBand === band).length]));
if (new Set(selected.map((candidate) => candidate.debateId)).size !== 6 || Object.values(bandCounts).some((count) => count < 1) || bandCounts["long-over-120"] > 3) throw new Error("v4.2.4 sample invariants failed");
if (selected.some((candidate) => priorFreshIds.includes(candidate.debateId))) throw new Error("v4.2.4 sample overlaps a prior fresh gate");

const sourceHashes = { [poolPath]: sha256(poolText), [priorScreeningPath]: sha256(screeningText), [workflowPath]: sha256(await readFile(path.resolve(root, workflowPath))), [classifierPath]: sha256(await readFile(path.resolve(root, classifierPath))), [scriptPath]: sha256(await readFile(path.resolve(root, scriptPath))) };
for (const [index, priorPath] of priorSamplePaths.entries()) sourceHashes[priorPath] = sha256(priorSampleTexts[index]);
for (const debate of selected) sourceHashes[debate.manifestPath] = debate.manifestSha256;
const artifact = {
  schemaVersion: "4.2.4-screened-chronology-fresh-six-sample",
  protocolId: "v4.2.4-screened-chronology-first-compact-fresh-six-validation",
  status: "frozen-pending-source-only-semantic-screening",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  selectionBoundary: { dyadicOnly: true, topicFamilies: families, durationRequirement: "at least one under 90 minutes, at least one from 90 through 120 minutes, at least one over 120 minutes, and no more than three over 120 minutes", fixedSalt: salt, rankingInput: "family and debate ID only", selectionMethod: "dynamic programming minimizing aggregate within-family hash rank, then family-order debate-ID tie", correctedClassifier: "evil/hiddenness before mind/agency; no bare soul token", legacyAssessmentContentAccessed: false, legacyScoresAccessed: false, legacyWinnersAccessed: false, legacyCritiquesAccessed: false, candidateRanksInspectedBeforeAlgorithmFreeze: false },
  exclusions: { priorCalibrationIdsFromPool: pool.retiredDebateIds.length, v416DevelopmentDebates: ["55", "103", "161"], v417DiagnosticDebates: priorSamples[0].debates.map((debate) => debate.number), v418DiagnosticDebates: priorSamples[1].debates.map((debate) => debate.number), v419DiagnosticDebates: priorSamples[2].debates.map((debate) => debate.number), v421DiagnosticDebates: priorSamples[3].debates.map((debate) => debate.number), v423RejectedSelectionDebates: priorSamples[4].debates.map((debate) => debate.number), excludedDebateIds: [...exclusions].sort() },
  eligibleAfterExclusions: candidates.length,
  tupleOptimization: { aggregateFamilyRank: best.aggregateRank, familyOrderTie: best.familyOrderTie, durationBandCounts: bandCounts },
  debates: selected.map(({ manifestSha256, ...debate }) => debate),
  audit: { debates: selected.length, distinctTopicFamilies: new Set(selected.map((debate) => debate.family)).size, distinctDebateIds: new Set(selected.map((debate) => debate.debateId)).size, priorFreshGateOverlap: selected.filter((debate) => priorFreshIds.includes(debate.debateId)).length, durationBandCounts: bandCounts, minimumDurationSeconds: Math.min(...selected.map((debate) => debate.durationSeconds)), maximumDurationSeconds: Math.max(...selected.map((debate) => debate.durationSeconds)), localTranscriptChainsPresent: selected.filter((debate) => debate.transcriptChainPresentAtSelection).length, legacyAssessmentFields: 0 },
  authorization: { sourceOnlySemanticScreening: true, compactChronologySourcePacketPreparation: false, primaryModelExecution: false, legacyComparison: false, paidTranscription: false, productionMutation: false, heldOutGate: false, all195Debates: false },
  sourceHashes
};
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(root, outputPath)), { recursive: true });
  await writeFile(path.resolve(root, outputPath), `${JSON.stringify(artifact, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", debates: selected.map((debate) => ({ number: debate.number, debateId: debate.debateId, family: debate.family, durationBand: debate.durationBand, durationMinutes: Number((debate.durationSeconds / 60).toFixed(1)) })), aggregateFamilyRank: best.aggregateRank, durationBandCounts: bandCounts, minimumDurationMinutes: Number((artifact.audit.minimumDurationSeconds / 60).toFixed(1)), maximumDurationMinutes: Number((artifact.audit.maximumDurationSeconds / 60).toFixed(1)), priorFreshGateOverlap: 0, legacyAssessmentContentAccessed: false, sourceOnlySemanticScreeningRequired: true }, null, 2));
