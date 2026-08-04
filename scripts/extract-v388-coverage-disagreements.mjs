#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateReviewOutput } from "./lib/v388-coverage-review.mjs";
import {
  V388_CONSENSUS_ROOT,
  V388_DEBATE_NUMBERS,
  V388_REVIEW_ROOT,
  assert,
  compareCoverageProposalAndReview,
  makeCoverageAdjudicationArtifacts
} from "./lib/v388-coverage-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const sourceEvents = {
  "55": ".assessment-cache/captions/zQBY5K-Ns2Y/events.json",
  "103": ".assessment-cache/captions/g1TlLCSn_5o/events.json",
  "161": ".assessment-cache/captions/9JVRy7bR7zI/events.json"
};
const audioPath = `${V388_CONSENSUS_ROOT}/audio-verification.json`;
const audioVerification = await readJson(audioPath);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const record of audioVerification.records) {
  const [clip, transcript] = await Promise.all([
    readFile(path.resolve(root, record.clip.path)),
    readFile(path.resolve(root, record.transcription.path))
  ]);
  assert(record.status === "verified" && record.boundaryResolution.confidenceAfterVerification === "high", `${record.debateNumber}:${record.subjectRef}: audio verification unresolved`);
  assert(record.clip.sha256 === sha256(clip) && record.transcription.sha256 === sha256(transcript), `${record.debateNumber}:${record.subjectRef}: audio verification hash mismatch`);
  assert(record.transcription.execution === "on-device" && record.transcription.apiUsed === false, `${record.debateNumber}:${record.subjectRef}: unexpected paid transcription path`);
}
const debates = {};
const adjudicationContexts = [];
const mediumLowSubjects = [];
const combinedMap = { schemaVersion: "3.8.8-coverage-adjudication-option-map-set", debates: {} };

for (let debateIndex = 0; debateIndex < V388_DEBATE_NUMBERS.length; debateIndex += 1) {
  const debateNumber = V388_DEBATE_NUMBERS[debateIndex];
  const packetPath = `${V388_REVIEW_ROOT}/packets/debate-${debateNumber}.json`;
  const mappingPath = `${V388_REVIEW_ROOT}/private-mappings/debate-${debateNumber}.json`;
  const reviewSchemaPath = `${V388_REVIEW_ROOT}/schemas/debate-${debateNumber}.schema.json`;
  const reviewPath = `${V388_REVIEW_ROOT}/outputs/debate-${debateNumber}.json`;
  const [packet, mapping, reviewSchema, review, events] = await Promise.all([
    readJson(packetPath), readJson(mappingPath), readJson(reviewSchemaPath), readJson(reviewPath), readJson(sourceEvents[debateNumber])
  ]);
  validateReviewOutput(review, packet, reviewSchema, events);
  for (const item of [...review.candidateReviews.map((entry) => ({ ref: entry.candidateRef, ...entry })), ...review.missingMoves.map((entry) => ({ ref: entry.missingRef, ...entry }))]) {
    if (item.attributionConfidence !== "high") mediumLowSubjects.push({ debateNumber, subjectRef: item.ref, speaker: item.speaker, side: item.side });
  }
  const comparisons = compareCoverageProposalAndReview({ packet, mapping, review, events, audioVerification });
  const artifacts = makeCoverageAdjudicationArtifacts(debateNumber, packet.debateId, comparisons, debateIndex * 11);
  const adjudicationPacket = `${V388_CONSENSUS_ROOT}/adjudication/packets/debate-${debateNumber}.json`;
  const adjudicationSchema = `${V388_CONSENSUS_ROOT}/adjudication/schemas/debate-${debateNumber}.schema.json`;
  const adjudicationOutput = `${V388_CONSENSUS_ROOT}/adjudication/outputs/debate-${debateNumber}.json`;
  if (shouldWrite && artifacts.packet.disputedFields.length > 0) {
    await mkdir(path.dirname(path.resolve(root, adjudicationPacket)), { recursive: true });
    await mkdir(path.dirname(path.resolve(root, adjudicationSchema)), { recursive: true });
    await writeFile(path.resolve(root, adjudicationPacket), `${JSON.stringify(artifacts.packet, null, 2)}\n`);
    await writeFile(path.resolve(root, adjudicationSchema), `${JSON.stringify(artifacts.schema, null, 2)}\n`);
  }
  combinedMap.debates[debateNumber] = artifacts.map;
  debates[debateNumber] = {
    debateId: packet.debateId,
    comparisonCount: comparisons.length,
    agreementCount: comparisons.filter((item) => item.agreed).length,
    disagreementCount: comparisons.filter((item) => !item.agreed).length,
    comparisonPolicy: {
      exactFields: ["valid", "speakerSide", "proposition", "attributionConfidence", "selectionRole", "moveKind", "respondsToRefs", "coverageStatus", "concession audit", "missing-move inclusion"],
      excludedWordingFields: ["attributionBasis", "rationale", "bridge rationale", "concession rationale"],
      referenceArraysComparedAsSets: true
    },
    comparisons,
    adjudicationPacket,
    adjudicationSchema,
    adjudicationOutput
  };
  if (artifacts.packet.disputedFields.length > 0) adjudicationContexts.push({
    debateNumber,
    reviewerRole: "coverage-adjudicator",
    packet: adjudicationPacket,
    schema: adjudicationSchema,
    output: adjudicationOutput,
    fieldCount: artifacts.packet.disputedFields.length
  });
}

const requiredAudioKeys = mediumLowSubjects.map((item) => `${item.debateNumber}:${item.subjectRef}`).sort();
const verifiedAudioKeys = audioVerification.records.map((item) => `${item.debateNumber}:${item.subjectRef}`).sort();
assert(JSON.stringify(requiredAudioKeys) === JSON.stringify(verifiedAudioKeys), "medium/low attribution audio coverage mismatch");
for (const item of mediumLowSubjects) {
  const record = audioVerification.records.find((entry) => entry.debateNumber === item.debateNumber && entry.subjectRef === item.subjectRef);
  assert(record.resolvedSpeaker === item.speaker && record.resolvedSide === item.side, `${item.debateNumber}:${item.subjectRef}: audio speaker resolution mismatch`);
}

const artifact = {
  schemaVersion: "3.8.8-coverage-initial-disagreements",
  allProposalAndReviewOutputsValid: true,
  audioVerificationSha256PinnedAtAdjudicationLock: true,
  debates,
  counts: {
    comparisonFields: Object.values(debates).reduce((sum, item) => sum + item.comparisonCount, 0),
    agreements: Object.values(debates).reduce((sum, item) => sum + item.agreementCount, 0),
    disagreements: Object.values(debates).reduce((sum, item) => sum + item.disagreementCount, 0),
    adjudicationContexts: adjudicationContexts.length,
    mediumOrLowAttributions: mediumLowSubjects.length,
    completedAudioVerifications: audioVerification.records.length
  },
  adjudicationContexts
};
if (shouldWrite) {
  await mkdir(path.resolve(root, V388_CONSENSUS_ROOT), { recursive: true });
  await writeFile(path.resolve(root, `${V388_CONSENSUS_ROOT}/initial-disagreements.json`), `${JSON.stringify(artifact, null, 2)}\n`);
  await writeFile(path.resolve(root, `${V388_CONSENSUS_ROOT}/adjudication-option-map.json`), `${JSON.stringify(combinedMap, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", ...artifact.counts, byDebate: Object.fromEntries(Object.entries(debates).map(([number, item]) => [number, { agreements: item.agreementCount, disagreements: item.disagreementCount }])) }, null, 2));
