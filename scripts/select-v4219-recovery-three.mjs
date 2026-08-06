#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { V42181_TOPIC_FAMILIES, classifyV42181Motion } from "./lib/v42181-source-classification.mjs";
import { V4219_ROOT, buildV4219SourcePacket, classifyV4219PrimaryRoute, makeV4219PrimarySchema, measureV4219CopiedInput } from "./lib/v4219-primary-recovery.mjs";

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
  "docs/calibration/v4.2.3/chronology-first-fresh-six-gate/source-only-sample.json",
  "docs/calibration/v4.2.4/screened-chronology-fresh-six-gate/source-only-sample.json",
  "docs/calibration/v4.2.18/fresh-direct-three/source-only-sample.json",
  "docs/calibration/v4.2.18.1/fresh-direct-three/source-only-sample.json"
];
const workflowPath = "docs/assessment-workflow-v4.2.19.md";
const classifierPath = "scripts/lib/v42181-source-classification.mjs";
const recoveryPath = "scripts/lib/v4219-primary-recovery.mjs";
const scriptPath = "scripts/select-v4219-recovery-three.mjs";
const manualPath = `${V4219_ROOT}/manual.md`;
const schemaPath = `${V4219_ROOT}/primary.schema.json`;
const outputPath = `${V4219_ROOT}/source-only-sample.json`;
const salt = "slugfester-v4.2.19-recovery-three-source-only";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite && await exists(outputPath)) throw new Error(`${outputPath} already exists`);
const [poolText, ...priorTexts] = await Promise.all([poolPath, ...priorSamplePaths].map((file) => readFile(file, "utf8")));
const pool = JSON.parse(poolText);
const priorSamples = priorTexts.map(JSON.parse);
if (!pool.dyadicOnly || pool.legacyAssessmentContentAccessed || pool.candidateRanksInspected || pool.audit.missingTranscriptChainCount !== 0) throw new Error("source-only pool boundary invalid");
const developmentIds = ["craig-malpass-kalam-nothing-2026", "woodford-edwards-rational-belief-god-2023", "craig-millican-does-god-exist-2011"];
const priorFreshIds = priorSamples.flatMap((sample) => sample.debates.map((debate) => debate.debateId));
const exclusions = new Set([...pool.retiredDebateIds, ...developmentIds, ...priorFreshIds]);
const sharedInputPaths = ["docs/reassessment-rubric-v4.0.md", "docs/reassessment-rubric-v4.0.1.md", "docs/reassessment-rubric-v4.1.md", manualPath, schemaPath];
const sharedInputBytes = (await Promise.all(sharedInputPaths.map((file) => stat(file).then((item) => item.size)))).reduce((sum, value) => sum + value, 0);
const measured = [];
const sourceRejected = [];
for (const debate of pool.eligibleDyadic) {
  if (exclusions.has(debate.debateId)) continue;
  const transcriptPath = `.assessment-cache/captions/${debate.videoId}/transcript.txt`;
  const eventsPath = `.assessment-cache/captions/${debate.videoId}/events.json`;
  const manifestPath = `.assessment-cache/captions/${debate.videoId}/manifest.json`;
  const sourceLedgerPath = `.assessment-cache/compact-ledgers/v4.2.19/debate-${debate.number}.jsonl`;
  const [transcriptBytes, eventsBytes, manifestBytes] = await Promise.all([transcriptPath, eventsPath, manifestPath].map((file) => readFile(file)));
  const manifest = JSON.parse(manifestBytes);
  let built;
  try {
    built = buildV4219SourcePacket({ debate, transcriptPath, eventsPath, manifestPath, sourceLedgerPath, transcriptBytes, eventsBytes, manifestBytes });
  } catch (error) {
    sourceRejected.push({ debateId: debate.debateId, number: debate.number, reason: error.message, transcriptSha256: sha256(transcriptBytes), eventsSha256: sha256(eventsBytes), manifestSha256: sha256(manifestBytes) });
    continue;
  }
  const measurement = measureV4219CopiedInput({ packetBytes: built.packetBytes, sourceLedgerBytes: built.sourceLedgerBytes, sharedInputBytes });
  const family = classifyV42181Motion(debate.motion);
  measured.push({
    ...debate,
    family,
    durationSeconds: manifest.durationSeconds,
    captionKind: manifest.track?.kind === "asr" ? "auto" : "human",
    sourceLedgerEvents: built.packet.eventCount,
    sourceLedgerBytes: built.sourceLedgerBytes.length,
    packetBytes: built.packetBytes.length,
    sharedInputBytes,
    compactCopiedInputBytes: measurement.compactCopiedInputBytes,
    route: measurement.route.route,
    routeExceeded: measurement.route.exceeded,
    transcriptSha256: sha256(transcriptBytes),
    eventsSha256: sha256(eventsBytes),
    manifestSha256: sha256(manifestBytes),
    selectionRankSha256: sha256(`${salt}:${family}:${debate.debateId}`)
  });
}
const candidates = measured.filter((debate) => debate.route === "direct");
candidates.sort((left, right) => left.selectionRankSha256.localeCompare(right.selectionRankSha256) || left.debateId.localeCompare(right.debateId));
let best = null;
for (let first = 0; first < candidates.length - 2; first += 1) for (let second = first + 1; second < candidates.length - 1; second += 1) for (let third = second + 1; third < candidates.length; third += 1) {
  const selected = [candidates[first], candidates[second], candidates[third]];
  if (new Set(selected.map((item) => item.family)).size !== 3) continue;
  const aggregateRank = first + second + third;
  const tie = selected.map((item) => item.debateId).sort().join("|");
  if (!best || aggregateRank < best.aggregateRank || aggregateRank === best.aggregateRank && tie < best.tie) best = { selected, aggregateRank, tie };
}
if (!best) throw new Error("no disjoint three-family tuple satisfies both direct-route ceilings");
const selected = best.selected.sort((left, right) => Number(left.number) - Number(right.number));
const measurementFingerprintRows = [
  ...measured.map((item) => ({ debateId: item.debateId, family: item.family, route: item.route, sourceLedgerEvents: item.sourceLedgerEvents, compactCopiedInputBytes: item.compactCopiedInputBytes, transcriptSha256: item.transcriptSha256, eventsSha256: item.eventsSha256, manifestSha256: item.manifestSha256 })),
  ...sourceRejected.map((item) => ({ ...item, route: "source-invalid" }))
].sort((left, right) => left.debateId.localeCompare(right.debateId));
const sourceHashes = {
  [poolPath]: sha256(poolText),
  [workflowPath]: sha256(await readFile(workflowPath)),
  [classifierPath]: sha256(await readFile(classifierPath)),
  [recoveryPath]: sha256(await readFile(recoveryPath)),
  [scriptPath]: sha256(await readFile(scriptPath)),
  [manualPath]: sha256(await readFile(manualPath)),
  [schemaPath]: sha256(await readFile(schemaPath))
};
for (const [index, priorPath] of priorSamplePaths.entries()) sourceHashes[priorPath] = sha256(priorTexts[index]);
for (const debate of selected) {
  sourceHashes[`.assessment-cache/captions/${debate.videoId}/transcript.txt`] = debate.transcriptSha256;
  sourceHashes[`.assessment-cache/captions/${debate.videoId}/events.json`] = debate.eventsSha256;
  sourceHashes[`.assessment-cache/captions/${debate.videoId}/manifest.json`] = debate.manifestSha256;
}
const artifact = {
  schemaVersion: "4.2.19-recovery-three-sample",
  protocolId: "v4.2.19-primary-recovery",
  status: "frozen-pending-motion-only-screening",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  selectionBoundary: {
    dyadicOnly: true,
    directRouteRequiresBothCeilings: true,
    durationUsedForRouting: false,
    topicFamilies: V42181_TOPIC_FAMILIES,
    distinctFamilyMinimum: 3,
    fixedSalt: salt,
    rankingInput: "classified motion family and debate ID only",
    selectionMethod: "minimum aggregate global hash-rank triple among contexts passing both direct-route ceilings, then debate-ID tie",
    sourceFilesMechanicallyHashedAndMeasured: true,
    transcriptContentExposedToSelectorModel: false,
    audioAccessed: false,
    legacyAssessmentContentAccessed: false,
    legacyScoresAccessed: false,
    legacyWinnersAccessed: false,
    legacyCritiquesAccessed: false,
    candidateRanksInspectedBeforeAlgorithmFreeze: false
  },
  exclusions: { poolRetiredDebates: pool.retiredDebateIds.length, developmentDebates: developmentIds, priorFreshAndRejectedSampleDebates: priorFreshIds.length, excludedDebateIds: [...exclusions].sort() },
  routingAudit: {
    candidatesAfterExclusions: measured.length + sourceRejected.length,
    measuredAfterSourceValidation: measured.length,
    sourceRejected,
    directEligible: candidates.length,
    partitionRouted: measured.length - candidates.length,
    measurementFingerprintSha256: sha256(JSON.stringify(measurementFingerprintRows)),
    sharedInputPaths,
    sharedInputBytes
  },
  tupleOptimization: { aggregateGlobalRank: best.aggregateRank, tie: best.tie },
  debates: selected.map(({ transcriptSha256, eventsSha256, manifestSha256, ...debate }) => debate),
  audit: { debates: selected.length, distinctTopicFamilies: new Set(selected.map((debate) => debate.family)).size, distinctDebateIds: new Set(selected.map((debate) => debate.debateId)).size, priorOrRejectedSampleOverlap: selected.filter((debate) => priorFreshIds.includes(debate.debateId)).length, allDirectByEventAndByteCeilings: selected.every((debate) => classifyV4219PrimaryRoute(debate).route === "direct"), localTranscriptChainsPresent: selected.filter((debate) => debate.transcriptChainPresentAtSelection).length, legacyAssessmentFields: 0 },
  authorization: { motionOnlySemanticScreening: true, compactSourcePacketPreparation: false, primaryModelExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false },
  sourceHashes
};
if (shouldWrite) {
  await mkdir(V4219_ROOT, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", debates: selected.map((debate) => ({ number: debate.number, debateId: debate.debateId, family: debate.family, durationMinutes: Number((debate.durationSeconds / 60).toFixed(1)), events: debate.sourceLedgerEvents, copiedInputKilobytes: Math.round(debate.compactCopiedInputBytes / 1000), route: debate.route })), candidatesAfterExclusions: measured.length + sourceRejected.length, measuredAfterSourceValidation: measured.length, sourceRejected: sourceRejected.length, directEligible: candidates.length, partitionRouted: measured.length - candidates.length, aggregateGlobalRank: best.aggregateRank, priorOrRejectedSampleOverlap: 0, transcriptContentExposedToSelectorModel: false, modelContextsExecuted: 0, meteredApiCostUsd: 0 }, null, 2));
