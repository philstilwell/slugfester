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

const ROOT = "docs/calibration/v4.2.21.17.13/replacement-held-out-five";
const OUTPUT = `${ROOT}/source-only-sample.json`;
const POOL = "docs/calibration/v3.8/held-out-burden-contact-integration-gate/metadata-eligible-pool.json";
const PREVIOUS_SAMPLE = "docs/calibration/v4.2.21.17.9/new-held-out-five/source-only-sample.json";
const FAILURE = "docs/calibration/v4.2.21.17.12/discovery-ownership-hardening/failure-analysis.json";
const sharedInputs = [
  "docs/reassessment-rubric-v4.0.md",
  "docs/reassessment-rubric-v4.0.1.md",
  "docs/reassessment-rubric-v4.1.md",
  "docs/calibration/v4.2.20/source-span-rendering/manual.md",
  "docs/calibration/v4.2.20/source-span-rendering/primary.schema.json",
];
const sourceCodePaths = [
  "docs/assessment-workflow-v4.2.21.17.13.md",
  "scripts/lib/v4219-primary-recovery.mjs",
  "scripts/lib/v4220-source-classification.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/select-v42211713-replacement-held-out-five.mjs",
  "scripts/screen-v42211713-replacement-held-out-five.mjs",
  "scripts/test-v42211713-replacement-held-out-five.mjs",
];
if (shouldWrite) await access(path.resolve(OUTPUT)).then(() => { throw new Error(`${OUTPUT} already exists`); }, () => true);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [poolText, previousText, failureText] = await Promise.all([POOL, PREVIOUS_SAMPLE, FAILURE].map((file) => readFile(path.resolve(file), "utf8")));
const pool = JSON.parse(poolText);
const previous = JSON.parse(previousText);
const failure = JSON.parse(failureText);
if (!pool.dyadicOnly || pool.legacyAssessmentContentAccessed || pool.candidateRanksInspected || pool.audit.missingTranscriptChainCount !== 0) throw new Error("source-only pool boundary invalid");
if (failure.evidenceDisposition.reuseForCleanHeldOutGate || failure.evidenceDisposition.retiredDebateNumbers.length !== 5) throw new Error("failed sample retirement unavailable");

const developmentIds = [
  "craig-malpass-kalam-nothing-2026",
  "woodford-edwards-rational-belief-god-2023",
  "craig-millican-does-god-exist-2011",
  "hawkins-folley-free-will-idealism-2026",
  "ehrman-licona-who-wrote-gospels-2025",
  "white-ally-sin-salvation-quran-bible-2013",
];
const failedIds = previous.debates.map((debate) => debate.debateId);
const failedNumbers = new Set(failure.evidenceDisposition.retiredDebateNumbers);
if (!previous.debates.every((debate) => failedNumbers.has(debate.number))) throw new Error("failed debate identity mismatch");
const exclusions = new Set([
  ...pool.retiredDebateIds,
  ...previous.exclusions.excludedDebateIds,
  ...developmentIds,
  ...failedIds,
]);
const sharedInputBytes = (await Promise.all(sharedInputs.map((file) => stat(path.resolve(file)).then((entry) => entry.size)))).reduce((sum, value) => sum + value, 0);
const salt = "slugfester-v4.2.21.17.13-replacement-held-out-five";
const durationBin = (seconds) => seconds < 3600 ? "under-60-minutes" : seconds < 5400 ? "60-to-89-minutes" : "90-minutes-or-more";
const partitionSeverity = (debate) => {
  const ratio = Math.max(debate.sourceLedgerEvents / 1800, debate.compactCopiedInputBytes / 150000);
  return ratio < 1.35 ? "near-direct-ceiling" : ratio < 2 ? "moderate-partition" : "heavy-partition";
};

const measured = [];
const sourceRejected = [];
for (const debate of pool.eligibleDyadic) {
  if (exclusions.has(debate.debateId)) continue;
  const base = `.assessment-cache/captions/${debate.videoId}`;
  const transcriptPath = `${base}/transcript.txt`;
  const eventsPath = `${base}/events.json`;
  const manifestPath = `${base}/manifest.json`;
  const sourceLedgerPath = `.assessment-cache/compact-ledgers/v4.2.21.17.13/debate-${debate.number}.jsonl`;
  const [transcriptBytes, eventsBytes, manifestBytes] = await Promise.all([transcriptPath, eventsPath, manifestPath].map((file) => readFile(path.resolve(file))));
  let built;
  try {
    built = buildV4220SourcePacket({ debate, transcriptPath, eventsPath, manifestPath, sourceLedgerPath, transcriptBytes, eventsBytes, manifestBytes });
  } catch (error) {
    sourceRejected.push({ debateId: debate.debateId, number: debate.number, reason: error.message });
    continue;
  }
  const compactCopiedInputBytes = sharedInputBytes + built.packetBytes.length + built.sourceLedgerBytes.length;
  const route = classifyV4219PrimaryRoute({ sourceLedgerEvents: built.packet.eventCount, compactCopiedInputBytes });
  const sourceManifest = JSON.parse(manifestBytes);
  const family = classifyV4220Motion(debate.motion);
  const row = {
    ...debate,
    family,
    durationSeconds: sourceManifest.durationSeconds,
    durationBin: durationBin(sourceManifest.durationSeconds),
    captionKind: sourceManifest.track?.kind === "asr" ? "auto" : "human",
    sourceLedgerEvents: built.packet.eventCount,
    sourceLedgerBytes: built.sourceLedgerBytes.length,
    packetBytes: built.packetBytes.length,
    sharedInputBytes,
    compactCopiedInputBytes,
    route: route.route,
    routeExceeded: route.exceeded,
    partitionSeverity: null,
    transcriptSha256: sha256(transcriptBytes),
    eventsSha256: sha256(eventsBytes),
    manifestSha256: sha256(manifestBytes),
    selectionRankSha256: sha256(`${salt}:${route.route}:${family}:${debate.debateId}`),
  };
  if (row.route === "partition") row.partitionSeverity = partitionSeverity(row);
  measured.push(row);
}

const direct = measured.filter((debate) => debate.route === "direct").sort((a, b) => a.selectionRankSha256.localeCompare(b.selectionRankSha256) || a.debateId.localeCompare(b.debateId));
const partition = measured.filter((debate) => debate.route === "partition").sort((a, b) => a.selectionRankSha256.localeCompare(b.selectionRankSha256) || a.debateId.localeCompare(b.debateId));
if (direct.length < 2 || partition.length < 3) throw new Error("replacement route strata unavailable");
const directRank = new Map(direct.map((debate, index) => [debate.debateId, index]));
const partitionRank = new Map(partition.map((debate, index) => [debate.debateId, index]));
let best = null;
for (let d1 = 0; d1 < direct.length - 1; d1 += 1) for (let d2 = d1 + 1; d2 < direct.length; d2 += 1) {
  for (let a = 0; a < partition.length - 2; a += 1) for (let b = a + 1; b < partition.length - 1; b += 1) for (let c = b + 1; c < partition.length; c += 1) {
    const selected = [direct[d1], direct[d2], partition[a], partition[b], partition[c]];
    const metrics = {
      distinctFamilies: new Set(selected.map((debate) => debate.family)).size,
      distinctDurationBins: new Set(selected.map((debate) => debate.durationBin)).size,
      distinctCaptionKinds: new Set(selected.map((debate) => debate.captionKind)).size,
      distinctSpeakers: new Set(selected.flatMap((debate) => [...debate.sides.pro.speakers, ...debate.sides.con.speakers])).size,
      distinctPartitionSeverityBins: new Set(selected.filter((debate) => debate.route === "partition").map((debate) => debate.partitionSeverity)).size,
      aggregateRank: directRank.get(direct[d1].debateId) + directRank.get(direct[d2].debateId) + partitionRank.get(partition[a].debateId) + partitionRank.get(partition[b].debateId) + partitionRank.get(partition[c].debateId),
      tie: selected.map((debate) => debate.debateId).sort().join("|"),
    };
    if (metrics.distinctFamilies < 4) continue;
    const descending = ["distinctFamilies", "distinctDurationBins", "distinctCaptionKinds", "distinctSpeakers", "distinctPartitionSeverityBins"];
    let better = !best;
    if (best) {
      better = false;
      for (const key of descending) {
        if (metrics[key] === best.metrics[key]) continue;
        better = metrics[key] > best.metrics[key];
        break;
      }
      if (descending.every((key) => metrics[key] === best.metrics[key])) {
        better = metrics.aggregateRank < best.metrics.aggregateRank
          || (metrics.aggregateRank === best.metrics.aggregateRank && metrics.tie < best.metrics.tie);
      }
    }
    if (better) best = { selected, metrics };
  }
}
if (!best) throw new Error("no eligible replacement five tuple");
const selected = best.selected.sort((left, right) => Number(left.number) - Number(right.number));

const sourceHashes = {
  [POOL]: sha256(poolText),
  [PREVIOUS_SAMPLE]: sha256(previousText),
  [FAILURE]: sha256(failureText),
};
for (const file of sourceCodePaths) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
for (const debate of selected) {
  for (const [name, digest] of [["transcript.txt", debate.transcriptSha256], ["events.json", debate.eventsSha256], ["manifest.json", debate.manifestSha256]]) {
    sourceHashes[`.assessment-cache/captions/${debate.videoId}/${name}`] = digest;
  }
}

const artifact = {
  schemaVersion: "4.2.21.17.13-replacement-route-stratified-held-out-five-sample",
  protocolId: "v4.2.21.17.13-replacement-held-out-five",
  status: "frozen-pending-route-metadata-screening",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  selectionBoundary: {
    dyadicOnly: true,
    exactRouteMix: { direct: 2, partition: 3 },
    failedFiveExcluded: failedIds.sort(),
    developmentDebatesExcluded: developmentIds,
    topicFamilies: V4220_TOPIC_FAMILIES,
    distinctFamilyMinimum: 4,
    fixedSalt: salt,
    rankingInput: "route, corrected motion family, and debate ID only",
    sourceFilesMechanicallyHashedAndMeasured: true,
    transcriptContentSemanticallyInspected: false,
    audioAccessed: false,
    legacyAssessmentContentAccessed: false,
    priorJudgmentsAccessed: false,
  },
  exclusions: {
    poolRetiredDebates: pool.retiredDebateIds.length,
    priorAndDevelopmentAndFailedDebates: exclusions.size,
    failedDebateIds: failedIds.sort(),
    excludedDebateIds: [...exclusions].sort(),
  },
  routingAudit: {
    measuredAfterSourceValidation: measured.length,
    sourceRejected,
    directEligible: direct.length,
    partitionEligible: partition.length,
    sharedInputPaths: sharedInputs,
    sharedInputBytes,
  },
  tupleOptimization: best.metrics,
  debates: selected.map(({ transcriptSha256, eventsSha256, manifestSha256, ...debate }) => debate),
  audit: {
    debates: 5,
    direct: 2,
    partition: 3,
    distinctTopicFamilies: new Set(selected.map((debate) => debate.family)).size,
    distinctDurationBins: new Set(selected.map((debate) => debate.durationBin)).size,
    distinctCaptionKinds: new Set(selected.map((debate) => debate.captionKind)).size,
    distinctSpeakers: new Set(selected.flatMap((debate) => [...debate.sides.pro.speakers, ...debate.sides.con.speakers])).size,
    distinctPartitionSeverityBins: new Set(selected.filter((debate) => debate.route === "partition").map((debate) => debate.partitionSeverity)).size,
    failedFiveOverlap: selected.filter((debate) => failedIds.includes(debate.debateId)).length,
    localTranscriptChainsPresent: 5,
    legacyAssessmentFields: 0,
  },
  authorization: {
    routeMetadataScreening: true,
    sourcePacketPreparation: false,
    modelExecution: false,
    audioExecution: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    all195Debates: false,
  },
  sourceHashes,
};
if (shouldWrite) {
  await mkdir(path.resolve(ROOT), { recursive: true });
  await writeFile(path.resolve(OUTPUT), `${JSON.stringify(artifact, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? "frozen" : "preview",
  debates: selected.map((debate) => ({
    number: debate.number,
    debateId: debate.debateId,
    family: debate.family,
    route: debate.route,
    durationMinutes: Number((debate.durationSeconds / 60).toFixed(1)),
    durationBin: debate.durationBin,
    captionKind: debate.captionKind,
    partitionSeverity: debate.partitionSeverity,
  })),
  tupleOptimization: best.metrics,
  failedFiveOverlap: artifact.audit.failedFiveOverlap,
  semanticTranscriptInspection: false,
  nextAuthorized: "route-metadata-screening",
}, null, 2));
