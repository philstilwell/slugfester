#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { debates } from "../src/data/debates.js";
import { debateSpeakerRoster, MULTI_SPEAKER_ROSTERS } from "./lib/debate-speaker-rosters.mjs";

const output = "docs/assessment-production/manifest-v1.json";
const createdAtIndex = process.argv.indexOf("--created-at");
const createdAt = createdAtIndex >= 0 ? process.argv[createdAtIndex + 1] : null;
if (!createdAt || Number.isNaN(Date.parse(createdAt))) throw new Error("Usage: node scripts/build-assessment-production-manifest.mjs --created-at <ISO timestamp>");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const parse = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const videoId = (url) => { const parsed = new URL(url); return parsed.hostname === "youtu.be" ? parsed.pathname.slice(1) : parsed.searchParams.get("v"); };
const sourcePaths = [
  "src/data/debates.js",
  "scripts/lib/debate-speaker-rosters.mjs",
  "docs/assessment-production-workflow.md",
  "docs/calibration/v2.1/corpus-transcript-audit.json",
  "docs/calibration/v4.2.21.17.40/hard-route-publication-finalization/merge-audit.json",
  "docs/calibration/v4.2.21.17.41/hard-route-publication-readiness/readiness-analysis.json"
];
const [corpusAudit, finalization] = await Promise.all([parse(sourcePaths[3]), parse(sourcePaths[4])]);
if (debates.length !== 195 || corpusAudit.entries.length !== 195 || corpusAudit.locallySavedTranscripts !== 195 || corpusAudit.unavailableTranscripts !== 0) throw new Error("195-debate local source corpus is incomplete");
if (finalization.status !== "passed-five-debate-publication-finalization" || finalization.outputs.length !== 5) throw new Error("v17.40 finalization evidence invalid");
const auditById = new Map(corpusAudit.entries.map((entry) => [entry.debateId, entry]));
const finalizedByNumber = new Map(finalization.outputs.map((entry) => [entry.debateNumber, entry]));
const items = [];
for (const debate of debates) {
  const source = auditById.get(debate.id);
  const roster = debateSpeakerRoster(debate);
  const speakers = [...roster.pro, ...roster.con];
  const count = new Set(speakers).size;
  const derivedVideoId = videoId(debate.youtubeUrl);
  if (!source || source.status !== "available" || source.videoId !== derivedVideoId) throw new Error(`${debate.id}: canonical transcript audit mismatch`);
  const [transcriptBytes, eventsBytes, manifestBytes] = await Promise.all([
    readFile(path.resolve(source.transcriptStorage)),
    readFile(path.resolve(source.eventsStorage)),
    readFile(path.resolve(`.assessment-cache/captions/${derivedVideoId}/manifest.json`))
  ]);
  if (sha256(transcriptBytes) !== source.transcriptSha256 || sha256(eventsBytes) !== source.normalizedEventsSha256) throw new Error(`${debate.id}: local transcript chain hash mismatch`);
  const multiSpeaker = Object.hasOwn(MULTI_SPEAKER_ROSTERS, debate.id);
  if (multiSpeaker !== (count >= 3)) throw new Error(`${debate.id}: speaker roster classification mismatch`);
  const finalized = finalizedByNumber.get(debate.number);
  const disposition = multiSpeaker ? "excluded-multi-speaker" : finalized ? "calibration-finalized-pending-production-promotion" : "pending-reassessment";
  items.push({
    debateNumber: debate.number,
    debateId: debate.id,
    videoId: derivedVideoId,
    motion: debate.motion,
    sides: { pro: { label: debate.sides.pro.name, speakers: roster.pro }, con: { label: debate.sides.con.name, speakers: roster.con } },
    speakerCount: count,
    disposition,
    sourceChain: { transcript: source.transcriptStorage, transcriptSha256: source.transcriptSha256, events: source.eventsStorage, eventsSha256: source.normalizedEventsSha256, manifest: `.assessment-cache/captions/${derivedVideoId}/manifest.json`, manifestSha256: sha256(manifestBytes), extractionMethod: source.extractionMethod },
    acceptedCalibration: finalized ? { output: finalized.output, outputSha256: finalized.outputSha256, compiled: finalized.compiled, compiledSha256: finalized.compiledSha256 } : null
  });
}
items.sort((left, right) => Number(left.debateNumber) - Number(right.debateNumber));
const production = items.filter((item) => item.disposition !== "excluded-multi-speaker");
const excluded = items.filter((item) => item.disposition === "excluded-multi-speaker");
const completed = production.filter((item) => item.acceptedCalibration);
const sourceHashes = {};
for (const file of sourcePaths) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
const manifest = {
  schemaVersion: "1.0-adjudicated-consensus-production-manifest",
  workflow: "Slugfester adjudicated-consensus production workflow",
  rubric: "Slugfester Reassessment Rubric v2",
  status: "frozen-cohort-pending-ten-debate-canary-selection",
  createdAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription" },
  scope: { corpusDebates: 195, dyadicProductionDebates: production.length, multiSpeakerExcluded: excluded.length, acceptedCalibrationDebates: completed.length, pendingReassessments: production.length - completed.length, firstCheckpointSize: 10 },
  scheduling: { projected179Hours: 44.05, targetHours: 50, headroomHours: 5.95, confidence: "medium", stageConcurrency: { discovery: 4, inventory: 2, independentJudgments: 2, audio: 2, adjudication: 2, publication: 2 } },
  items,
  sourceHashes,
  boundaries: { localTranscriptRequired: true, transcriptHashesVerified: 195, dyadicOnly: true, legacyAssessmentUnavailableToModels: true, twoIndependentSolPasses: true, deterministicDisagreementExtraction: true, disputedFieldOnlyAdjudication: true, mediumConfidenceAudioRequired: true, scoresAfterAdjudicationOnly: true, modelAuthoredScoresMaximum: 0, aiExtensionPostScoringOnly: true },
  authorization: { tenDebateCanarySelection: true, packetPreparation: false, modelExecution: false, paidTranscription: false, productionMutation: false, remainingProductionBatches: false }
};
if (production.length !== 179 || excluded.length !== 16 || completed.length !== 5 || manifest.scope.pendingReassessments !== 174) throw new Error("production corpus disposition mismatch");
await mkdir(path.dirname(path.resolve(output)), { recursive: true });
await writeFile(path.resolve(output), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, output, scope: manifest.scope, scheduling: manifest.scheduling, nextAuthorized: "deterministic-ten-debate-canary-selection" }, null, 2));
