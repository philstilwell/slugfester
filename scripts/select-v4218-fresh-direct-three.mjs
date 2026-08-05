#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V424_TOPIC_FAMILIES, classifyV424Motion } from "./lib/v424-source-classification.mjs";
import { V4218_ROOT } from "./lib/v4218-fresh-direct-three.mjs";

const shouldWrite = process.argv.includes("--write"), frozenIndex = process.argv.indexOf("--frozen-at"), frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at requires an ISO timestamp");
const poolPath = "docs/calibration/v3.8/held-out-burden-contact-integration-gate/metadata-eligible-pool.json";
const priorSamplePaths = [
  "docs/calibration/v4.1.7/fresh-six-gate/source-only-sample.json",
  "docs/calibration/v4.1.8/source-integrity-fresh-six-gate/source-only-sample.json",
  "docs/calibration/v4.1.9/schema-bounded-fresh-six-gate/source-only-sample.json",
  "docs/calibration/v4.2.1/compact-fresh-six-gate/source-only-sample.json",
  "docs/calibration/v4.2.3/chronology-first-fresh-six-gate/source-only-sample.json",
  "docs/calibration/v4.2.4/screened-chronology-fresh-six-gate/source-only-sample.json"
];
const workflowPath = "docs/assessment-workflow-v4.2.18.md", classifierPath = "scripts/lib/v424-source-classification.mjs", scriptPath = "scripts/select-v4218-fresh-direct-three.mjs", outputPath = `${V4218_ROOT}/source-only-sample.json`, salt = "slugfester-v4.2.18-fresh-direct-three-source-only";
const sha256 = (value) => createHash("sha256").update(value).digest("hex"), exists = async (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite && await exists(outputPath)) throw new Error(`${outputPath} already exists`);
const [poolText, authorizationText, ...priorTexts] = await Promise.all([poolPath, "docs/calibration/v4.2.17/no-truncation-finalization-gate/analysis.json", ...priorSamplePaths].map((file) => readFile(file, "utf8")));
const pool = JSON.parse(poolText), authorization = JSON.parse(authorizationText), priorSamples = priorTexts.map(JSON.parse);
if (!pool.dyadicOnly || pool.legacyAssessmentContentAccessed || pool.candidateRanksInspected || pool.audit.missingTranscriptChainCount !== 0) throw new Error("source-only pool boundary invalid");
if (!authorization.authorization.newDisjointFreshJudgmentGatePreparation) throw new Error("v4.2.18 selection unauthorized");
if (priorSamples.some((sample) => sample.selectionBoundary?.legacyAssessmentContentAccessed)) throw new Error("prior sample boundary invalid");
const developmentIds = ["craig-malpass-kalam-nothing-2026", "woodford-edwards-rational-belief-god-2023", "craig-millican-does-god-exist-2011"];
const priorFreshIds = priorSamples.flatMap((sample) => sample.debates.map((debate) => debate.debateId));
const exclusions = new Set([...pool.retiredDebateIds, ...developmentIds, ...priorFreshIds]);
const candidates = [];
for (const debate of pool.eligibleDyadic) {
  if (exclusions.has(debate.debateId)) continue;
  const manifestPath = `.assessment-cache/captions/${debate.videoId}/manifest.json`, manifestText = await readFile(manifestPath, "utf8"), manifest = JSON.parse(manifestText);
  if (manifest.videoId !== debate.videoId || !Number.isFinite(manifest.durationSeconds) || manifest.durationSeconds <= 0 || manifest.durationSeconds >= 5400) continue;
  const family = classifyV424Motion(debate.motion), selectionRankSha256 = sha256(`${salt}:${family}:${debate.debateId}`);
  candidates.push({ ...debate, family, durationSeconds: manifest.durationSeconds, durationBand: "direct-under-90", captionKind: manifest.track?.kind === "asr" ? "auto" : "human", manifestPath, manifestSha256: sha256(manifestText), selectionRankSha256 });
}
candidates.sort((a, b) => a.selectionRankSha256.localeCompare(b.selectionRankSha256) || a.debateId.localeCompare(b.debateId));
let best = null;
for (let i = 0; i < candidates.length - 2; i += 1) for (let j = i + 1; j < candidates.length - 1; j += 1) for (let k = j + 1; k < candidates.length; k += 1) {
  const selected = [candidates[i], candidates[j], candidates[k]];
  if (new Set(selected.map((item) => item.family)).size !== 3) continue;
  const aggregateRank = i + j + k, tie = selected.map((item) => item.debateId).sort().join("|");
  if (!best || aggregateRank < best.aggregateRank || aggregateRank === best.aggregateRank && tie < best.tie) best = { selected, aggregateRank, tie };
}
if (!best) throw new Error("no disjoint three-family direct-lane tuple");
const selected = best.selected.sort((a, b) => a.number.localeCompare(b.number));
const sourceHashes = { [poolPath]: sha256(poolText), "docs/calibration/v4.2.17/no-truncation-finalization-gate/analysis.json": sha256(authorizationText), [workflowPath]: sha256(await readFile(workflowPath)), [classifierPath]: sha256(await readFile(classifierPath)), [scriptPath]: sha256(await readFile(scriptPath)) };
for (const [index, priorPath] of priorSamplePaths.entries()) sourceHashes[priorPath] = sha256(priorTexts[index]);
for (const debate of selected) sourceHashes[debate.manifestPath] = debate.manifestSha256;
const artifact = { schemaVersion: "4.2.18-fresh-direct-three-sample", protocolId: "v4.2.18-fresh-direct-three", status: "frozen-pending-motion-only-screening", frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), selectionBoundary: { dyadicOnly: true, maximumDurationSecondsExclusive: 5400, topicFamilies: V424_TOPIC_FAMILIES, distinctFamilyMinimum: 3, fixedSalt: salt, rankingInput: "classified motion family and debate ID only", selectionMethod: "minimum aggregate global hash-rank triple with three distinct topic families, then debate-ID tie", transcriptContentAccessed: false, audioAccessed: false, legacyAssessmentContentAccessed: false, legacyScoresAccessed: false, legacyWinnersAccessed: false, legacyCritiquesAccessed: false, candidateRanksInspectedBeforeAlgorithmFreeze: false }, exclusions: { poolRetiredDebates: pool.retiredDebateIds.length, developmentDebates: developmentIds, priorFreshSampleDebates: priorFreshIds.length, excludedDebateIds: [...exclusions].sort() }, eligibleAfterExclusionsAndDuration: candidates.length, tupleOptimization: { aggregateGlobalRank: best.aggregateRank, tie: best.tie }, debates: selected.map(({ manifestSha256, ...debate }) => debate), audit: { debates: selected.length, distinctTopicFamilies: new Set(selected.map((debate) => debate.family)).size, distinctDebateIds: new Set(selected.map((debate) => debate.debateId)).size, priorFreshGateOverlap: selected.filter((debate) => priorFreshIds.includes(debate.debateId)).length, maximumDurationSeconds: Math.max(...selected.map((debate) => debate.durationSeconds)), localTranscriptChainsPresent: selected.filter((debate) => debate.transcriptChainPresentAtSelection).length, legacyAssessmentFields: 0 }, authorization: { motionOnlySemanticScreening: true, compactSourcePacketPreparation: false, primaryModelExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false }, sourceHashes };
if (shouldWrite) { await mkdir(V4218_ROOT, { recursive: true }); await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`); }
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", debates: selected.map((debate) => ({ number: debate.number, debateId: debate.debateId, family: debate.family, durationMinutes: Number((debate.durationSeconds / 60).toFixed(1)), captionKind: debate.captionKind })), eligibleAfterExclusionsAndDuration: candidates.length, aggregateGlobalRank: best.aggregateRank, priorFreshGateOverlap: 0, transcriptContentAccessed: false, legacyAssessmentContentAccessed: false }, null, 2));
