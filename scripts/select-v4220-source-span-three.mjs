#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { classifyV4219PrimaryRoute } from "./lib/v4219-primary-recovery.mjs";
import { V4220_ROOT, buildV4220SourcePacket } from "./lib/v4220-source-span-rendering.mjs";
import { V4220_TOPIC_FAMILIES, classifyV4220Motion } from "./lib/v4220-source-classification.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at requires an ISO timestamp");
const outputPath = `${V4220_ROOT}/source-only-sample.json`;
if (shouldWrite) await access(path.resolve(outputPath)).then(() => { throw new Error(`${outputPath} already exists`); }, () => true);
const poolPath = "docs/calibration/v3.8/held-out-burden-contact-integration-gate/metadata-eligible-pool.json";
const priorSamplePaths = ["docs/calibration/v4.1.7/fresh-six-gate/source-only-sample.json", "docs/calibration/v4.1.8/source-integrity-fresh-six-gate/source-only-sample.json", "docs/calibration/v4.1.9/schema-bounded-fresh-six-gate/source-only-sample.json", "docs/calibration/v4.2.1/compact-fresh-six-gate/source-only-sample.json", "docs/calibration/v4.2.3/chronology-first-fresh-six-gate/source-only-sample.json", "docs/calibration/v4.2.4/screened-chronology-fresh-six-gate/source-only-sample.json", "docs/calibration/v4.2.18/fresh-direct-three/source-only-sample.json", "docs/calibration/v4.2.18.1/fresh-direct-three/source-only-sample.json", "docs/calibration/v4.2.19/primary-recovery/source-only-sample.json"];
const sourceCodePaths = ["docs/assessment-workflow-v4.2.20.md", "scripts/lib/v4220-source-classification.mjs", "scripts/lib/v4220-source-span-rendering.mjs", "scripts/select-v4220-source-span-three.mjs", `${V4220_ROOT}/manual.md`, `${V4220_ROOT}/primary.schema.json`];
const inputs = ["docs/reassessment-rubric-v4.0.md", "docs/reassessment-rubric-v4.0.1.md", "docs/reassessment-rubric-v4.1.md", `${V4220_ROOT}/manual.md`, `${V4220_ROOT}/primary.schema.json`];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [poolText, ...priorTexts] = await Promise.all([poolPath, ...priorSamplePaths].map((file) => readFile(file, "utf8")));
const pool = JSON.parse(poolText);
if (!pool.dyadicOnly || pool.legacyAssessmentContentAccessed || pool.candidateRanksInspected || pool.audit.missingTranscriptChainCount !== 0) throw new Error("source-only pool boundary invalid");
const priorSamples = priorTexts.map(JSON.parse);
const developmentIds = ["craig-malpass-kalam-nothing-2026", "woodford-edwards-rational-belief-god-2023", "craig-millican-does-god-exist-2011"];
const priorFreshIds = priorSamples.flatMap((sample) => sample.debates.map((debate) => debate.debateId));
const exclusions = new Set([...pool.retiredDebateIds, ...developmentIds, ...priorFreshIds]);
const sharedInputBytes = (await Promise.all(inputs.map((file) => stat(file).then((item) => item.size)))).reduce((sum, value) => sum + value, 0);
const salt = "slugfester-v4.2.20-source-span-three";
const measured = [];
const sourceRejected = [];
for (const debate of pool.eligibleDyadic) {
  if (exclusions.has(debate.debateId)) continue;
  const base = `.assessment-cache/captions/${debate.videoId}`;
  const transcriptPath = `${base}/transcript.txt`, eventsPath = `${base}/events.json`, manifestPath = `${base}/manifest.json`, sourceLedgerPath = `.assessment-cache/compact-ledgers/v4.2.20/debate-${debate.number}.jsonl`;
  const [transcriptBytes, eventsBytes, manifestBytes] = await Promise.all([transcriptPath, eventsPath, manifestPath].map((file) => readFile(file)));
  let built;
  try { built = buildV4220SourcePacket({ debate, transcriptPath, eventsPath, manifestPath, sourceLedgerPath, transcriptBytes, eventsBytes, manifestBytes }); }
  catch (error) { sourceRejected.push({ debateId: debate.debateId, number: debate.number, reason: error.message, transcriptSha256: sha256(transcriptBytes), eventsSha256: sha256(eventsBytes), manifestSha256: sha256(manifestBytes) }); continue; }
  const compactCopiedInputBytes = sharedInputBytes + built.packetBytes.length + built.sourceLedgerBytes.length;
  const route = classifyV4219PrimaryRoute({ sourceLedgerEvents: built.packet.eventCount, compactCopiedInputBytes });
  const family = classifyV4220Motion(debate.motion);
  const manifest = JSON.parse(manifestBytes);
  measured.push({ ...debate, family, durationSeconds: manifest.durationSeconds, captionKind: manifest.track?.kind === "asr" ? "auto" : "human", sourceLedgerEvents: built.packet.eventCount, sourceLedgerBytes: built.sourceLedgerBytes.length, packetBytes: built.packetBytes.length, sharedInputBytes, compactCopiedInputBytes, route: route.route, routeExceeded: route.exceeded, transcriptSha256: sha256(transcriptBytes), eventsSha256: sha256(eventsBytes), manifestSha256: sha256(manifestBytes), selectionRankSha256: sha256(`${salt}:${family}:${debate.debateId}`) });
}
const candidates = measured.filter((debate) => debate.route === "direct").sort((left, right) => left.selectionRankSha256.localeCompare(right.selectionRankSha256) || left.debateId.localeCompare(right.debateId));
let best = null;
for (let first = 0; first < candidates.length - 2; first += 1) for (let second = first + 1; second < candidates.length - 1; second += 1) for (let third = second + 1; third < candidates.length; third += 1) {
  const selected = [candidates[first], candidates[second], candidates[third]];
  if (new Set(selected.map((item) => item.family)).size !== 3) continue;
  const aggregateRank = first + second + third, tie = selected.map((item) => item.debateId).sort().join("|");
  if (!best || aggregateRank < best.aggregateRank || aggregateRank === best.aggregateRank && tie < best.tie) best = { selected, aggregateRank, tie };
}
if (!best) throw new Error("no remaining disjoint three-family direct-lane tuple");
const selected = best.selected.sort((left, right) => Number(left.number) - Number(right.number));
const fingerprintRows = [...measured.map((item) => ({ debateId: item.debateId, family: item.family, route: item.route, sourceLedgerEvents: item.sourceLedgerEvents, compactCopiedInputBytes: item.compactCopiedInputBytes, transcriptSha256: item.transcriptSha256, eventsSha256: item.eventsSha256, manifestSha256: item.manifestSha256 })), ...sourceRejected.map((item) => ({ ...item, route: "source-invalid" }))].sort((left, right) => left.debateId.localeCompare(right.debateId));
const sourceHashes = { [poolPath]: sha256(poolText) };
for (const file of sourceCodePaths) sourceHashes[file] = sha256(await readFile(file));
for (const [index, file] of priorSamplePaths.entries()) sourceHashes[file] = sha256(priorTexts[index]);
for (const debate of selected) for (const [name, digest] of [["transcript.txt", debate.transcriptSha256], ["events.json", debate.eventsSha256], ["manifest.json", debate.manifestSha256]]) sourceHashes[`.assessment-cache/captions/${debate.videoId}/${name}`] = digest;
const artifact = { schemaVersion: "4.2.20-source-span-three-sample", protocolId: "v4.2.20-source-span-evidence-rendering", status: "frozen-pending-motion-route-screening", frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), selectionBoundary: { dyadicOnly: true, directRouteRequiresBothCeilings: true, durationUsedForRouting: false, topicFamilies: V4220_TOPIC_FAMILIES, distinctFamilyMinimum: 3, classifierPrecedence: ["evil-hiddenness", "morality-ethics", "resurrection-history", "mind-agency", "science-origins", "general-theism-religion"], fixedSalt: salt, rankingInput: "corrected motion family and debate ID only", sourceFilesMechanicallyHashedAndMeasured: true, transcriptContentExposedToSelectorModel: false, audioAccessed: false, legacyAssessmentContentAccessed: false, candidateRanksInspectedBeforeAlgorithmFreeze: false }, exclusions: { poolRetiredDebates: pool.retiredDebateIds.length, developmentDebates: developmentIds, priorFreshAndRejectedSampleDebates: priorFreshIds.length, excludedDebateIds: [...exclusions].sort() }, routingAudit: { candidatesAfterExclusions: measured.length + sourceRejected.length, measuredAfterSourceValidation: measured.length, sourceRejected, directEligible: candidates.length, partitionRouted: measured.length - candidates.length, measurementFingerprintSha256: sha256(JSON.stringify(fingerprintRows)), sharedInputPaths: inputs, sharedInputBytes }, tupleOptimization: { aggregateGlobalRank: best.aggregateRank, tie: best.tie }, debates: selected.map(({ transcriptSha256, eventsSha256, manifestSha256, ...debate }) => debate), audit: { debates: 3, distinctTopicFamilies: new Set(selected.map((debate) => debate.family)).size, priorOrRejectedSampleOverlap: selected.filter((debate) => priorFreshIds.includes(debate.debateId)).length, allDirectByEventAndByteCeilings: selected.every((debate) => classifyV4219PrimaryRoute(debate).route === "direct"), localTranscriptChainsPresent: selected.filter((debate) => debate.transcriptChainPresentAtSelection).length, legacyAssessmentFields: 0 }, authorization: { motionRouteScreening: true, compactSourcePacketPreparation: false, primaryModelExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false }, sourceHashes };
if (shouldWrite) { await mkdir(V4220_ROOT, { recursive: true }); await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`); }
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", debates: selected.map((debate) => ({ number: debate.number, debateId: debate.debateId, family: debate.family, durationMinutes: Number((debate.durationSeconds / 60).toFixed(1)), events: debate.sourceLedgerEvents, copiedInputKilobytes: Math.round(debate.compactCopiedInputBytes / 1000), route: debate.route })), directEligible: candidates.length, partitionRouted: measured.length - candidates.length, sourceRejected: sourceRejected.length, aggregateGlobalRank: best.aggregateRank, priorOrRejectedSampleOverlap: 0, modelContextsExecuted: 0, meteredApiCostUsd: 0 }, null, 2));
