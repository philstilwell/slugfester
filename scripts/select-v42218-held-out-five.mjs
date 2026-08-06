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
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) {
  throw new Error("--frozen-at requires an ISO timestamp");
}

const root = "docs/calibration/v4.2.21.8/held-out-five";
const outputPath = `${root}/source-only-sample.json`;
if (shouldWrite) {
  await access(path.resolve(outputPath)).then(
    () => {
      throw new Error(`${outputPath} already exists`);
    },
    () => true
  );
}
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
const sharedInputs = [
  "docs/reassessment-rubric-v4.0.md",
  "docs/reassessment-rubric-v4.0.1.md",
  "docs/reassessment-rubric-v4.1.md",
  "docs/calibration/v4.2.20/source-span-rendering/manual.md",
  "docs/calibration/v4.2.20/source-span-rendering/primary.schema.json"
];
const sourceCodePaths = [
  "docs/assessment-workflow-v4.2.21.8.md",
  "scripts/lib/v4219-primary-recovery.mjs",
  "scripts/lib/v4220-source-classification.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/select-v42218-held-out-five.mjs",
  "scripts/screen-v42218-held-out-five.mjs",
  "scripts/test-v42218-held-out-five.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [poolText, ...priorTexts] = await Promise.all(
  [poolPath, ...priorSamplePaths].map((file) => readFile(path.resolve(file), "utf8"))
);
const pool = JSON.parse(poolText);
if (
  !pool.dyadicOnly ||
  pool.legacyAssessmentContentAccessed ||
  pool.candidateRanksInspected ||
  pool.audit.missingTranscriptChainCount !== 0
) {
  throw new Error("source-only pool boundary invalid");
}
const priorSamples = priorTexts.map(JSON.parse);
const developmentIds = [
  "craig-malpass-kalam-nothing-2026",
  "woodford-edwards-rational-belief-god-2023",
  "craig-millican-does-god-exist-2011"
];
const priorFreshIds = priorSamples.flatMap((sample) =>
  sample.debates.map((debate) => debate.debateId)
);
const exclusions = new Set([...pool.retiredDebateIds, ...developmentIds, ...priorFreshIds]);
const sharedInputBytes = (
  await Promise.all(sharedInputs.map((file) => stat(path.resolve(file)).then((entry) => entry.size)))
).reduce((sum, value) => sum + value, 0);
const salt = "slugfester-v4.2.21.8-route-stratified-held-out-five";
const measured = [];
const sourceRejected = [];

function durationBin(seconds) {
  if (seconds < 3600) return "under-60-minutes";
  if (seconds < 5400) return "60-to-89-minutes";
  return "90-minutes-or-more";
}

function partitionSeverity(debate) {
  const ratio = Math.max(debate.sourceLedgerEvents / 1800, debate.compactCopiedInputBytes / 150000);
  if (ratio < 1.35) return "near-direct-ceiling";
  if (ratio < 2) return "moderate-partition";
  return "heavy-partition";
}

for (const debate of pool.eligibleDyadic) {
  if (exclusions.has(debate.debateId)) continue;
  const base = `.assessment-cache/captions/${debate.videoId}`;
  const transcriptPath = `${base}/transcript.txt`;
  const eventsPath = `${base}/events.json`;
  const manifestPath = `${base}/manifest.json`;
  const sourceLedgerPath = `.assessment-cache/compact-ledgers/v4.2.21.8/debate-${debate.number}.jsonl`;
  const [transcriptBytes, eventsBytes, manifestBytes] = await Promise.all(
    [transcriptPath, eventsPath, manifestPath].map((file) => readFile(path.resolve(file)))
  );
  let built;
  try {
    built = buildV4220SourcePacket({
      debate,
      transcriptPath,
      eventsPath,
      manifestPath,
      sourceLedgerPath,
      transcriptBytes,
      eventsBytes,
      manifestBytes
    });
  } catch (error) {
    sourceRejected.push({
      debateId: debate.debateId,
      number: debate.number,
      reason: error.message,
      transcriptSha256: sha256(transcriptBytes),
      eventsSha256: sha256(eventsBytes),
      manifestSha256: sha256(manifestBytes)
    });
    continue;
  }
  const compactCopiedInputBytes = sharedInputBytes + built.packetBytes.length + built.sourceLedgerBytes.length;
  const route = classifyV4219PrimaryRoute({
    sourceLedgerEvents: built.packet.eventCount,
    compactCopiedInputBytes
  });
  const family = classifyV4220Motion(debate.motion);
  const manifest = JSON.parse(manifestBytes);
  const captionKind = manifest.track?.kind === "asr" ? "auto" : "human";
  measured.push({
    ...debate,
    family,
    durationSeconds: manifest.durationSeconds,
    durationBin: durationBin(manifest.durationSeconds),
    captionKind,
    sourceLedgerEvents: built.packet.eventCount,
    sourceLedgerBytes: built.sourceLedgerBytes.length,
    packetBytes: built.packetBytes.length,
    sharedInputBytes,
    compactCopiedInputBytes,
    route: route.route,
    routeExceeded: route.exceeded,
    partitionSeverity: route.route === "partition" ? partitionSeverity({ sourceLedgerEvents: built.packet.eventCount, compactCopiedInputBytes }) : null,
    transcriptSha256: sha256(transcriptBytes),
    eventsSha256: sha256(eventsBytes),
    manifestSha256: sha256(manifestBytes),
    selectionRankSha256: sha256(`${salt}:${route.route}:${family}:${debate.debateId}`)
  });
}

const ranked = [...measured].sort(
  (left, right) =>
    left.selectionRankSha256.localeCompare(right.selectionRankSha256) ||
    left.debateId.localeCompare(right.debateId)
);
const rankById = new Map(ranked.map((debate, index) => [debate.debateId, index]));
const direct = ranked.filter((debate) => debate.route === "direct");
const partition = ranked.filter((debate) => debate.route === "partition");

function* pairs(values) {
  for (let first = 0; first < values.length - 1; first += 1) {
    for (let second = first + 1; second < values.length; second += 1) {
      yield [values[first], values[second]];
    }
  }
}

function* triples(values) {
  for (let first = 0; first < values.length - 2; first += 1) {
    for (let second = first + 1; second < values.length - 1; second += 1) {
      for (let third = second + 1; third < values.length; third += 1) {
        yield [values[first], values[second], values[third]];
      }
    }
  }
}

function tupleMetrics(selected) {
  return {
    distinctFamilies: new Set(selected.map((debate) => debate.family)).size,
    distinctDurationBins: new Set(selected.map((debate) => debate.durationBin)).size,
    distinctCaptionKinds: new Set(selected.map((debate) => debate.captionKind)).size,
    distinctSpeakers: new Set(
      selected.flatMap((debate) => [
        ...debate.sides.pro.speakers,
        ...debate.sides.con.speakers
      ])
    ).size,
    distinctPartitionSeverityBins: new Set(
      selected.filter((debate) => debate.route === "partition").map((debate) => debate.partitionSeverity)
    ).size,
    aggregateGlobalRank: selected.reduce((sum, debate) => sum + rankById.get(debate.debateId), 0),
    tie: selected.map((debate) => debate.debateId).sort().join("|")
  };
}

function better(left, right) {
  if (!right) return true;
  for (const key of [
    "distinctFamilies",
    "distinctDurationBins",
    "distinctCaptionKinds",
    "distinctSpeakers",
    "distinctPartitionSeverityBins"
  ]) {
    if (left[key] !== right[key]) return left[key] > right[key];
  }
  if (left.aggregateGlobalRank !== right.aggregateGlobalRank) {
    return left.aggregateGlobalRank < right.aggregateGlobalRank;
  }
  return left.tie < right.tie;
}

let best = null;
for (const directPair of pairs(direct)) {
  for (const partitionTriple of triples(partition)) {
    const selected = [...directPair, ...partitionTriple];
    const metrics = tupleMetrics(selected);
    if (metrics.distinctFamilies < 4) continue;
    if (better(metrics, best?.metrics)) best = { selected, metrics };
  }
}
if (!best) throw new Error("no disjoint two-direct three-partition held-out tuple");
const selected = best.selected.sort((left, right) => Number(left.number) - Number(right.number));
const fingerprintRows = [
  ...measured.map((debate) => ({
    debateId: debate.debateId,
    family: debate.family,
    route: debate.route,
    durationBin: debate.durationBin,
    captionKind: debate.captionKind,
    partitionSeverity: debate.partitionSeverity,
    sourceLedgerEvents: debate.sourceLedgerEvents,
    compactCopiedInputBytes: debate.compactCopiedInputBytes,
    transcriptSha256: debate.transcriptSha256,
    eventsSha256: debate.eventsSha256,
    manifestSha256: debate.manifestSha256
  })),
  ...sourceRejected.map((debate) => ({ ...debate, route: "source-invalid" }))
].sort((left, right) => left.debateId.localeCompare(right.debateId));
const sourceHashes = { [poolPath]: sha256(poolText) };
for (const file of sourceCodePaths) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
for (const [index, file] of priorSamplePaths.entries()) sourceHashes[file] = sha256(priorTexts[index]);
for (const debate of selected) {
  for (const [name, digest] of [
    ["transcript.txt", debate.transcriptSha256],
    ["events.json", debate.eventsSha256],
    ["manifest.json", debate.manifestSha256]
  ]) {
    sourceHashes[`.assessment-cache/captions/${debate.videoId}/${name}`] = digest;
  }
}
const artifact = {
  schemaVersion: "4.2.21.8-route-stratified-held-out-five-sample",
  protocolId: "v4.2.21-source-span-consensus",
  status: "frozen-pending-route-metadata-screening",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  selectionBoundary: {
    dyadicOnly: true,
    exactRouteMix: { direct: 2, partition: 3 },
    topicFamilies: V4220_TOPIC_FAMILIES,
    distinctFamilyMinimum: 4,
    durationBins: ["under-60-minutes", "60-to-89-minutes", "90-minutes-or-more"],
    captionKinds: ["auto", "human"],
    partitionSeverityBins: ["near-direct-ceiling", "moderate-partition", "heavy-partition"],
    optimizationPrecedence: [
      "distinct-topic-families-descending",
      "distinct-duration-bins-descending",
      "distinct-caption-kinds-descending",
      "distinct-speakers-descending",
      "distinct-partition-severity-bins-descending",
      "aggregate-salted-rank-ascending",
      "debate-id-tie-break"
    ],
    fixedSalt: salt,
    rankingInput: "route, corrected motion family, and debate ID only",
    sourceFilesMechanicallyHashedAndMeasured: true,
    transcriptContentSemanticallyInspected: false,
    audioAccessed: false,
    legacyAssessmentContentAccessed: false,
    candidateRanksInspectedBeforeAlgorithmFreeze: false
  },
  exclusions: {
    poolRetiredDebates: pool.retiredDebateIds.length,
    developmentDebates: developmentIds,
    priorFreshAndRejectedSampleDebates: priorFreshIds.length,
    excludedDebateIds: [...exclusions].sort()
  },
  routingAudit: {
    candidatesAfterExclusions: measured.length + sourceRejected.length,
    measuredAfterSourceValidation: measured.length,
    sourceRejected,
    directEligible: direct.length,
    partitionEligible: partition.length,
    measurementFingerprintSha256: sha256(JSON.stringify(fingerprintRows)),
    sharedInputPaths: sharedInputs,
    sharedInputBytes
  },
  tupleOptimization: best.metrics,
  debates: selected.map(
    ({ transcriptSha256, eventsSha256, manifestSha256, ...debate }) => debate
  ),
  audit: {
    debates: selected.length,
    direct: selected.filter((debate) => debate.route === "direct").length,
    partition: selected.filter((debate) => debate.route === "partition").length,
    distinctTopicFamilies: new Set(selected.map((debate) => debate.family)).size,
    distinctDurationBins: new Set(selected.map((debate) => debate.durationBin)).size,
    distinctCaptionKinds: new Set(selected.map((debate) => debate.captionKind)).size,
    distinctSpeakers: new Set(
      selected.flatMap((debate) => [
        ...debate.sides.pro.speakers,
        ...debate.sides.con.speakers
      ])
    ).size,
    priorOrRejectedSampleOverlap: selected.filter((debate) => priorFreshIds.includes(debate.debateId)).length,
    localTranscriptChainsPresent: selected.filter((debate) => debate.transcriptChainPresentAtSelection).length,
    legacyAssessmentFields: 0
  },
  authorization: {
    routeMetadataScreening: true,
    sourcePacketPreparation: false,
    partitionLaneDesign: false,
    primaryModelExecution: false,
    passBModelExecution: false,
    audioExecution: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    all195Debates: false
  },
  sourceHashes
};
if (shouldWrite) {
  await mkdir(path.resolve(root), { recursive: true });
  await writeFile(path.resolve(outputPath), `${JSON.stringify(artifact, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? "frozen" : "preview",
      debates: selected.map((debate) => ({
        number: debate.number,
        debateId: debate.debateId,
        family: debate.family,
        durationMinutes: Number((debate.durationSeconds / 60).toFixed(1)),
        durationBin: debate.durationBin,
        captionKind: debate.captionKind,
        events: debate.sourceLedgerEvents,
        copiedInputKilobytes: Math.round(debate.compactCopiedInputBytes / 1000),
        route: debate.route,
        partitionSeverity: debate.partitionSeverity
      })),
      routeMix: { direct: 2, partition: 3 },
      diversity: best.metrics,
      directEligible: direct.length,
      partitionEligible: partition.length,
      sourceRejected: sourceRejected.length,
      priorOrRejectedSampleOverlap: 0,
      modelContextsExecuted: 0,
      audioCalls: 0,
      scoresDerived: 0,
      meteredApiCostUsd: 0
    },
    null,
    2
  )
);
