#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V4171_AUDIO_ADJ_OUTPUT_VERSION, V4171_AUDIO_ADJ_PACKET_VERSION, V4171_AUDIO_ADJ_PROTOCOL_ID, V4171_AUDIO_ADJ_ROOT, makeV4171AudioAdjudicationSchema } from "./lib/v4171-audio-adjudication.mjs";
import { V417_PASS_B_ROOT } from "./lib/v417-triggered-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const [audit, plan, packet, amendment] = await Promise.all([
  readJson(`${V417_PASS_B_ROOT}/audio-verification.json`),
  readJson(`${V417_PASS_B_ROOT}/audio-verification-plan.json`),
  readJson(`${V417_PASS_B_ROOT}/packets/debate-91.json`),
  readJson(`${V417_PASS_B_ROOT}/audio-analysis-amendment.json`)
]);
assertV4(audit.status === "failed-one-or-more-attributions-unresolved" && audit.totals.verified === 10 && audit.totals.unresolved === 2, "two-field audio failure unavailable");
assertV4(amendment.status === "frozen-analysis-only-empty-boundary-elision", "audio analysis amendment unavailable");
const unresolved = audit.debates.flatMap((debate) => debate.moves).filter((move) => move.status === "unresolved");
assertV4(unresolved.map((move) => move.moveId).join(",") === "con-apriori-reply,con-measure-reply", "unexpected unresolved audio fields");
const lockedById = new Map(packet.lockedSections.flatMap((section) => [...section.proMoves, ...section.conMoves]).map((move) => [move.moveId, move]));
const planMoves = new Map(plan.debates.flatMap((debate) => debate.moves).map((move) => [move.moveId, move]));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const moves = [];
for (const unresolvedMove of unresolved) {
  const locked = lockedById.get(unresolvedMove.moveId); const planned = planMoves.get(unresolvedMove.moveId);
  assertV4(locked && planned && locked.speaker === unresolvedMove.expectedSpeaker, `${unresolvedMove.moveId}: locked attribution mismatch`);
  const bytes = await readFile(path.resolve(root, planned.transcriptPath)); const transcript = JSON.parse(bytes);
  assertV4(Array.isArray(transcript.segments) && transcript.segments.length > 0, `${unresolvedMove.moveId}: diarized transcript invalid`);
  moves.push({
    moveId: locked.moveId,
    expectedSpeaker: locked.speaker,
    proposition: locked.proposition,
    sourceSpan: locked.sourceSpan,
    deterministicFailure: unresolvedMove.deterministicEvidence,
    diarizedTranscriptPath: planned.transcriptPath,
    diarizedTranscriptSha256: sha256(bytes),
    diarizedTranscriptDurationSeconds: transcript.duration,
    diarizedSegmentCount: transcript.segments.length
  });
}
const adjudicationPacket = {
  schemaVersion: V4171_AUDIO_ADJ_PACKET_VERSION,
  protocolId: V4171_AUDIO_ADJ_PROTOCOL_ID,
  debateNumber: "91",
  debateId: packet.debateId,
  motion: packet.motion,
  sides: packet.sides,
  moves,
  evidenceBoundary: { rawAudioDerivedDiarizedTranscriptsRequired: true, knownSpeakerReferencesAlreadyApplied: true, deterministicFailureVisible: true, lockedPropositionsAndSpansVisible: true, ratingsUnavailable: true, scoresUnavailable: true, legacyUnavailable: true, otherDebatesUnavailable: true },
  decisionRule: { decideOnlyExpectedSpeakerAuthorshipOfCoreProposition: true, mixedSpeakerSpanMayStillVerify: true, verifiedRequiresHighConfidence: true, verifiedRequiresExpectedSpeakerSegmentEvidence: true, unresolvedBlocksDownstream: true, thresholdRelaxationAuthorized: false, manualOverrideAuthorized: false },
  outputIdentity: { schemaVersion: V4171_AUDIO_ADJ_OUTPUT_VERSION, protocolId: V4171_AUDIO_ADJ_PROTOCOL_ID }
};
const packetPath = `${V4171_AUDIO_ADJ_ROOT}/packet.json`;
const schemaPath = `${V4171_AUDIO_ADJ_ROOT}/schema.json`;
const outputPath = `${V4171_AUDIO_ADJ_ROOT}/output.json`;
const preparationPath = `${V4171_AUDIO_ADJ_ROOT}/preparation-manifest.json`;
const preparation = {
  schemaVersion: "4.1.7.1-audio-adjudication-preparation",
  protocolId: V4171_AUDIO_ADJ_PROTOCOL_ID,
  status: shouldWrite ? "prepared-one-debate-two-disputed-attributions" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high", authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  inputs: { workflow: "docs/assessment-workflow-v4.1.7.1.md", manual: `${V4171_AUDIO_ADJ_ROOT}/manual.md`, schema: schemaPath, packet: packetPath, rawDiarizedTranscripts: moves.map((move) => move.diarizedTranscriptPath) },
  output: outputPath,
  moves: moves.map((move) => ({ moveId: move.moveId, expectedSpeaker: move.expectedSpeaker, transcriptSha256: move.diarizedTranscriptSha256, segments: move.diarizedSegmentCount })),
  authorization: { modelExecution: false, deterministicValidation: true, paidTranscription: false, disagreementExtraction: false, scoreDerivation: false, legacyComparison: false, productionMutation: false }
};
if (shouldWrite) {
  await mkdir(path.resolve(root, V4171_AUDIO_ADJ_ROOT), { recursive: true });
  await writeFile(path.resolve(root, packetPath), `${JSON.stringify(adjudicationPacket, null, 2)}\n`);
  await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(makeV4171AudioAdjudicationSchema(), null, 2)}\n`);
  await writeFile(path.resolve(root, preparationPath), `${JSON.stringify(preparation, null, 2)}\n`);
}
console.log(JSON.stringify({ status: preparation.status, debateNumber: "91", disputedMoves: moves.length, diarizedSegments: moves.reduce((sum, move) => sum + move.diarizedSegmentCount, 0), modelContextsExecuted: 0, meteredApiCostUsd: 0, paidTranscriptionCostUsd: 0 }, null, 2));
