#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { classifyV4219PrimaryRoute } from "./lib/v4219-primary-recovery.mjs";
import { buildV4220SourcePacket } from "./lib/v4220-source-span-rendering.mjs";
import { V4220_TOPIC_FAMILIES, classifyV4220Motion } from "./lib/v4220-source-classification.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at requires an ISO timestamp");
const root = "docs/calibration/v4.2.21.17.9/new-held-out-five";
const outputPath = `${root}/source-only-sample.json`;
if (shouldWrite) await access(path.resolve(outputPath)).then(() => { throw new Error(`${outputPath} already exists`); }, () => true);
const poolPath = "docs/calibration/v3.8/held-out-burden-contact-integration-gate/metadata-eligible-pool.json";
const priorSamplePaths = [
  "docs/calibration/v4.1.7/fresh-six-gate/source-only-sample.json",
  "docs/calibration/v4.1.8/source-integrity-fresh-six-gate/source-only-sample.json",
  "docs/calibration/v4.1.9/schema-bounded-fresh-six-gate/source-only-sample.json",
  "docs/calibration/v4.2.1/compact-fresh-six-gate/source-only-sample.json",
  "docs/calibration/v4.2.3/chronology-first-fresh-six-gate/source-only-sample.json",
  "docs/calibration/v4.2.4/screened-chronology-fresh-six-gate/source-only-sample.json",
  "docs/calibration/v4.2.18/fresh-direct-three/source-only-sample.json",
  "docs/calibration/v4.2.18.1/fresh-direct-three/source-only-sample.json",
  "docs/calibration/v4.2.19/primary-recovery/source-only-sample.json",
  "docs/calibration/v4.2.20/source-span-rendering/source-only-sample.json"
];
const sharedInputs = ["docs/reassessment-rubric-v4.0.md", "docs/reassessment-rubric-v4.0.1.md", "docs/reassessment-rubric-v4.1.md", "docs/calibration/v4.2.20/source-span-rendering/manual.md", "docs/calibration/v4.2.20/source-span-rendering/primary.schema.json"];
const sourceCodePaths = ["docs/assessment-workflow-v4.2.21.17.9.md", "scripts/lib/v4219-primary-recovery.mjs", "scripts/lib/v4220-source-classification.mjs", "scripts/lib/v4220-source-span-rendering.mjs", "scripts/select-v4221179-held-out-five.mjs", "scripts/screen-v4221179-held-out-five.mjs", "scripts/test-v4221179-held-out-five.mjs"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [poolText, ...priorTexts] = await Promise.all([poolPath, ...priorSamplePaths].map((file) => readFile(path.resolve(file), "utf8")));
const pool = JSON.parse(poolText);
if (!pool.dyadicOnly || pool.legacyAssessmentContentAccessed || pool.candidateRanksInspected || pool.audit.missingTranscriptChainCount !== 0) throw new Error("source-only pool boundary invalid");
const developmentIds = ["craig-malpass-kalam-nothing-2026", "woodford-edwards-rational-belief-god-2023", "craig-millican-does-god-exist-2011", "hawkins-folley-free-will-idealism-2026", "ehrman-licona-who-wrote-gospels-2025", "white-ally-sin-salvation-quran-bible-2013"];
const priorFreshIds = priorTexts.map(JSON.parse).flatMap((sample) => sample.debates.map((debate) => debate.debateId));
const exclusions = new Set([...pool.retiredDebateIds, ...developmentIds, ...priorFreshIds]);
const sharedInputBytes = (await Promise.all(sharedInputs.map((file) => stat(path.resolve(file)).then((entry) => entry.size)))).reduce((sum, value) => sum + value, 0);
const salt = "slugfester-v4.2.21.17.9-new-held-out-five";
const measured = [];
const sourceRejected = [];
const durationBin = (seconds) => seconds < 3600 ? "under-60-minutes" : seconds < 5400 ? "60-to-89-minutes" : "90-minutes-or-more";
const partitionSeverity = (debate) => {
  const ratio = Math.max(debate.sourceLedgerEvents / 1800, debate.compactCopiedInputBytes / 150000);
  return ratio < 1.35 ? "near-direct-ceiling" : ratio < 2 ? "moderate-partition" : "heavy-partition";
};

for (const debate of pool.eligibleDyadic) {
  if (exclusions.has(debate.debateId)) continue;
  const base = `.assessment-cache/captions/${debate.videoId}`;
  const transcriptPath = `${base}/transcript.txt`;
  const eventsPath = `${base}/events.json`;
  const manifestPath = `${base}/manifest.json`;
  const sourceLedgerPath = `.assessment-cache/compact-ledgers/v4.2.21.17.9/debate-${debate.number}.jsonl`;
  const [transcriptBytes, eventsBytes, manifestBytes] = await Promise.all([transcriptPath, eventsPath, manifestPath].map((file) => readFile(path.resolve(file))));
  let built;
  try {
    built = buildV4220SourcePacket({ debate, transcriptPath, eventsPath, manifestPath, sourceLedgerPath, transcriptBytes, eventsBytes, manifestBytes });
  } catch (error) {
    sourceRejected.push({ debateId: debate.debateId, number: debate.number, reason: error.message, transcriptSha256: sha256(transcriptBytes), eventsSha256: sha256(eventsBytes), manifestSha256: sha256(manifestBytes) });
    continue;
  }
  const compactCopiedInputBytes = sharedInputBytes + built.packetBytes.length + built.sourceLedgerBytes.length;
  const route = classifyV4219PrimaryRoute({ sourceLedgerEvents: built.packet.eventCount, compactCopiedInputBytes });
  const manifest = JSON.parse(manifestBytes);
  const row = { ...debate, family: classifyV4220Motion(debate.motion), durationSeconds: manifest.durationSeconds, durationBin: durationBin(manifest.durationSeconds), captionKind: manifest.track?.kind === "asr" ? "auto" : "human", sourceLedgerEvents: built.packet.eventCount, sourceLedgerBytes: built.sourceLedgerBytes.length, packetBytes: built.packetBytes.length, sharedInputBytes, compactCopiedInputBytes, route: route.route, routeExceeded: route.exceeded, partitionSeverity: null, transcriptSha256: sha256(transcriptBytes), eventsSha256: sha256(eventsBytes), manifestSha256: sha256(manifestBytes), selectionRankSha256: sha256(`${salt}:${route.route}:${classifyV4220Motion(debate.motion)}:${debate.debateId}`) };
  if (row.route === "partition") row.partitionSeverity = partitionSeverity(row);
  measured.push(row);
}

const directIds = new Set(["harris-oconnor-objective-morality-2024", "enoch-clarke-doane-moral-realism-objectivity-2026"]);
const direct = measured.filter((debate) => directIds.has(debate.debateId));
if (direct.length !== 2 || direct.some((debate) => debate.route !== "direct")) throw new Error("the two still-clean direct controls are unavailable");
const partition = measured.filter((debate) => debate.route === "partition").sort((a, b) => a.selectionRankSha256.localeCompare(b.selectionRankSha256) || a.debateId.localeCompare(b.debateId));
const rankById = new Map(partition.map((debate, index) => [debate.debateId, index]));
let best = null;
for (let a = 0; a < partition.length - 2; a += 1) for (let b = a + 1; b < partition.length - 1; b += 1) for (let c = b + 1; c < partition.length; c += 1) {
  const selected = [...direct, partition[a], partition[b], partition[c]];
  const metrics = { distinctFamilies: new Set(selected.map((debate) => debate.family)).size, distinctDurationBins: new Set(selected.map((debate) => debate.durationBin)).size, distinctCaptionKinds: new Set(selected.map((debate) => debate.captionKind)).size, distinctSpeakers: new Set(selected.flatMap((debate) => [...debate.sides.pro.speakers, ...debate.sides.con.speakers])).size, distinctPartitionSeverityBins: new Set(selected.filter((debate) => debate.route === "partition").map((debate) => debate.partitionSeverity)).size, aggregatePartitionRank: [partition[a], partition[b], partition[c]].reduce((sum, debate) => sum + rankById.get(debate.debateId), 0), tie: selected.map((debate) => debate.debateId).sort().join("|") };
  if (metrics.distinctFamilies < 4) continue;
  const keys = ["distinctFamilies", "distinctDurationBins", "distinctCaptionKinds", "distinctSpeakers", "distinctPartitionSeverityBins"];
  const better = !best || keys.some((key, index) => metrics[key] !== best.metrics[key] && keys.slice(0, index).every((prior) => metrics[prior] === best.metrics[prior]) && metrics[key] > best.metrics[key]) || keys.every((key) => metrics[key] === best.metrics[key]) && (metrics.aggregatePartitionRank < best.metrics.aggregatePartitionRank || metrics.aggregatePartitionRank === best.metrics.aggregatePartitionRank && metrics.tie < best.metrics.tie);
  if (better) best = { selected, metrics };
}
if (!best) throw new Error("no eligible three-partition complement for the direct controls");
const selected = best.selected.sort((left, right) => Number(left.number) - Number(right.number));
const sourceHashes = { [poolPath]: sha256(poolText) };
for (const file of sourceCodePaths) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
for (const [index, file] of priorSamplePaths.entries()) sourceHashes[file] = sha256(priorTexts[index]);
for (const debate of selected) for (const [name, digest] of [["transcript.txt", debate.transcriptSha256], ["events.json", debate.eventsSha256], ["manifest.json", debate.manifestSha256]]) sourceHashes[`.assessment-cache/captions/${debate.videoId}/${name}`] = digest;
const artifact = { schemaVersion: "4.2.21.17.9-new-route-stratified-held-out-five-sample", protocolId: "v4.2.21.17.9-decomposed-consensus-held-out", status: "frozen-pending-route-metadata-screening", frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), selectionBoundary: { dyadicOnly: true, exactRouteMix: { direct: 2, partition: 3 }, directControlsRetainedFromPriorMetadataOnlySample: [...directIds].sort(), developmentPartitionDebatesExcluded: developmentIds.slice(-3), topicFamilies: V4220_TOPIC_FAMILIES, distinctFamilyMinimum: 4, fixedSalt: salt, rankingInput: "route, corrected motion family, and debate ID only", sourceFilesMechanicallyHashedAndMeasured: true, transcriptContentSemanticallyInspected: false, audioAccessed: false, legacyAssessmentContentAccessed: false, priorJudgmentsAccessed: false }, exclusions: { poolRetiredDebates: pool.retiredDebateIds.length, developmentDebates: developmentIds, priorFreshAndRejectedSampleDebates: priorFreshIds.length, excludedDebateIds: [...exclusions].sort() }, routingAudit: { measuredAfterSourceValidation: measured.length, sourceRejected, directEligible: measured.filter((debate) => debate.route === "direct").length, partitionEligible: partition.length, sharedInputPaths: sharedInputs, sharedInputBytes }, tupleOptimization: best.metrics, debates: selected.map(({ transcriptSha256, eventsSha256, manifestSha256, ...debate }) => debate), audit: { debates: 5, direct: 2, partition: 3, distinctTopicFamilies: new Set(selected.map((debate) => debate.family)).size, distinctDurationBins: new Set(selected.map((debate) => debate.durationBin)).size, distinctCaptionKinds: new Set(selected.map((debate) => debate.captionKind)).size, distinctSpeakers: new Set(selected.flatMap((debate) => [...debate.sides.pro.speakers, ...debate.sides.con.speakers])).size, retiredPartitionThreeOverlap: selected.filter((debate) => developmentIds.slice(-3).includes(debate.debateId)).length, localTranscriptChainsPresent: 5, legacyAssessmentFields: 0 }, authorization: { routeMetadataScreening: true, sourcePacketPreparation: false, modelExecution: false, audioExecution: false, scoreDerivation: false, publicationFinalization: false, productionMutation: false, all195Debates: false }, sourceHashes };
if (shouldWrite) { await mkdir(path.resolve(root), { recursive: true }); await writeFile(path.resolve(outputPath), `${JSON.stringify(artifact, null, 2)}\n`); }
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", debates: selected.map((debate) => ({ number: debate.number, debateId: debate.debateId, family: debate.family, route: debate.route, durationMinutes: Number((debate.durationSeconds / 60).toFixed(1)), durationBin: debate.durationBin, captionKind: debate.captionKind, partitionSeverity: debate.partitionSeverity })), tupleOptimization: best.metrics, excludedRetiredPartitionOverlap: artifact.audit.retiredPartitionThreeOverlap, semanticTranscriptInspection: false, nextAuthorized: "route-metadata-screening" }, null, 2));
