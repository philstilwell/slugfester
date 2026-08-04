#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { V38_DEBATE_NUMBERS, V38_GATE_MANIFEST, V38_ROOT, V38_SOURCE_AUDIT, assert, validateProposalOutput, validateReviewOutput } from "./lib/v38-source-preparation.mjs";
import { buildResolvedSourceDebate, resolveSourceFields, selectFinalMoves, validateSourceAdjudicationOutput } from "./lib/v38-source-execution.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const exists = async (file) => { try { await access(path.resolve(root, file)); return true; } catch { return false; } };
const [gate, sourceAudit, disagreements, optionMaps] = await Promise.all([readJson(V38_GATE_MANIFEST), readJson(V38_SOURCE_AUDIT), readJson(`${V38_ROOT}/source-preparation/initial-disagreements.json`), readJson(`${V38_ROOT}/source-preparation/adjudication-option-map.json`)]);
const audioPath = `${V38_ROOT}/source-preparation/audio-verification.json`;
const audio = await exists(audioPath) ? await readJson(audioPath) : { schemaVersion: "3.8-source-audio-verification", debates: {} };
const debateReports = [];
const finalDebates = [];
let pendingAudio = 0;

for (const debateNumber of V38_DEBATE_NUMBERS) {
  const proposalPacketPath = `${V38_ROOT}/source-preparation/proposal/packets/debate-${debateNumber}.json`;
  const proposalSchemaPath = `${V38_ROOT}/source-preparation/proposal/schemas/debate-${debateNumber}.schema.json`;
  const proposalPath = `${V38_ROOT}/source-preparation/proposal/outputs/debate-${debateNumber}.json`;
  const reviewPacketPath = `${V38_ROOT}/source-preparation/review/packets/debate-${debateNumber}.json`;
  const reviewSchemaPath = `${V38_ROOT}/source-preparation/review/schemas/debate-${debateNumber}.schema.json`;
  const reviewPath = `${V38_ROOT}/source-preparation/review/outputs/debate-${debateNumber}.json`;
  const source = sourceAudit.debateSources[debateNumber];
  const [proposalPacket, proposalSchema, proposal, reviewPacket, reviewSchema, review, events] = await Promise.all([readJson(proposalPacketPath), readJson(proposalSchemaPath), readJson(proposalPath), readJson(reviewPacketPath), readJson(reviewSchemaPath), readJson(reviewPath), readJson(source.eventsPath)]);
  validateProposalOutput(proposal, proposalPacket, proposalSchema, events);
  validateReviewOutput(review, proposalPacket, proposal, reviewPacket, reviewSchema);
  const debateDisagreements = disagreements.debates[debateNumber];
  let adjudicationOutput = { fields: [] }, adjudicationMap = optionMaps.debates[debateNumber];
  if (debateDisagreements.disagreementCount > 0) {
    const adjudicationPacketPath = debateDisagreements.adjudicationPacket, adjudicationSchemaPath = debateDisagreements.adjudicationSchema, adjudicationOutputPath = debateDisagreements.adjudicationOutput;
    const [adjudicationPacket, adjudicationSchema, output] = await Promise.all([readJson(adjudicationPacketPath), readJson(adjudicationSchemaPath), readJson(adjudicationOutputPath)]);
    validateSourceAdjudicationOutput(output, adjudicationPacket, adjudicationSchema);
    adjudicationOutput = output;
  }
  const resolvedFields = resolveSourceFields(debateDisagreements.comparisons, adjudicationOutput, adjudicationMap);
  const resolved = buildResolvedSourceDebate(proposalPacket, proposal, review, reviewPacket, resolvedFields, events);
  let debatePendingAudio = 0;
  for (const move of resolved.moves.filter((item) => item.audioVerificationRequired)) {
    const record = audio.debates?.[debateNumber]?.[move.moveId];
    if (!record) { pendingAudio += 1; debatePendingAudio += 1; continue; }
    assert(["confirmed", "corrected", "unresolved"].includes(record.result), `${move.moveId}: audio result invalid`);
    move.audioVerification = record;
    move.audioVerificationRequired = false;
    if (record.result === "unresolved") move.accepted = false;
    else {
      assert(proposalPacket.sides[record.side].speakers.includes(record.speaker), `${move.moveId}: audio speaker-side invalid`);
      move.speaker = record.speaker;
      move.side = record.side;
      move.attributionConfidence = "high";
    }
  }
  const selection = debatePendingAudio === 0 ? selectFinalMoves(resolved) : { eligibleMoveCount: 0, selected: [], combinationCount: 0 };
  const selectedMoveIds = selection.selected.map((item) => item.moveId);
  const resolvedPath = `${V38_ROOT}/source-preparation/resolved/debate-${debateNumber}.json`;
  if (shouldWrite) {
    await mkdir(path.dirname(path.resolve(root, resolvedPath)), { recursive: true });
    await writeFile(path.resolve(root, resolvedPath), `${JSON.stringify({ ...resolved, selectedMoveIds }, null, 2)}\n`);
  }
  finalDebates.push({ debateNumber, debateId: proposal.debateId, routes: resolved.routes, moves: selection.selected });
  debateReports.push({ debateNumber, debateId: proposal.debateId, comparisonFields: resolvedFields.length, initialAgreements: resolvedFields.filter((item) => item.agreed).length, initialDisagreements: resolvedFields.filter((item) => !item.agreed).length, finalTwoVoteFields: resolvedFields.filter((item) => item.finalVotes >= 2).length, unresolvedFields: resolvedFields.filter((item) => item.finalVotes < 2).length, proposedMoves: resolved.moves.length, acceptedMovesBeforeSelection: resolved.moves.filter((item) => item.accepted).length, audioVerificationsRequired: resolved.moves.filter((item) => item.audioVerification !== null || item.audioVerificationRequired).length, pendingAudio: debatePendingAudio, eligibleMovesAfterAudio: selection.eligibleMoveCount, validSelectionCombinations: selection.combinationCount, selectedMoves: selectedMoveIds.length });
}

const selectedMoves = finalDebates.flatMap((item) => item.moves);
const categories = {
  noContact: selectedMoves.filter((item) => item.provisionalBurdenContact === null).length,
  support: selectedMoves.filter((item) => item.provisionalBurdenContact?.polarity === "support").length,
  attack: selectedMoves.filter((item) => item.provisionalBurdenContact?.polarity === "attack").length,
  motion: selectedMoves.filter((item) => item.provisionalBurdenContact?.tier === "motion").length,
  central: selectedMoves.filter((item) => item.provisionalBurdenContact?.tier === "central").length,
  subsidiary: selectedMoves.filter((item) => item.provisionalBurdenContact?.tier === "subsidiary").length
};
const sourcePreparationPassed = pendingAudio === 0 && debateReports.every((item) => item.unresolvedFields === 0 && item.selectedMoves === 4) && selectedMoves.length === 12 && !containsScoreField(finalDebates);
const finalInventory = { schemaVersion: "3.8-heldout-source-inventory", status: sourcePreparationPassed ? "locked-source-inventory" : "source-inventory-incomplete", warning: "All provisional burden-contact values are AI source-preparation aids hidden from classification contexts; they are not truth keys.", debateCount: finalDebates.length, selectedMoveCount: selectedMoves.length, debates: finalDebates };
const analysis = {
  schemaVersion: "3.8-heldout-source-preparation-analysis",
  status: sourcePreparationPassed ? "source-preparation-passed" : pendingAudio > 0 ? "awaiting-required-audio-verification" : "source-preparation-failed",
  analyzedAt: new Date().toISOString(),
  sourcePreparationPassed,
  debateReports,
  totals: { debateCount: debateReports.length, comparisonFields: debateReports.reduce((sum, item) => sum + item.comparisonFields, 0), initialAgreements: debateReports.reduce((sum, item) => sum + item.initialAgreements, 0), initialDisagreements: debateReports.reduce((sum, item) => sum + item.initialDisagreements, 0), finalTwoVoteFields: debateReports.reduce((sum, item) => sum + item.finalTwoVoteFields, 0), unresolvedFields: debateReports.reduce((sum, item) => sum + item.unresolvedFields, 0), requiredAudioVerifications: debateReports.reduce((sum, item) => sum + item.audioVerificationsRequired, 0), pendingAudioVerifications: pendingAudio, selectedMoves: selectedMoves.length, provisionalCategoryCounts: categories, scoringFields: containsScoreField(finalDebates) ? 1 : 0, paidTranscriptionCalls: 0, meteredApiCostUsd: 0 },
  decision: { classificationPacketConstructionPreregistrationAuthorized: sourcePreparationPassed, burdenContactClassificationModelExecutionAuthorized: false, numericalParticipantScoringAuthorized: false, assessmentProseAuthorized: false, benchmarkMutationAuthorized: false, productionMutationAuthorized: false, all195DebatesAuthorized: false },
  artifacts: { finalInventory: `${V38_ROOT}/source-preparation/final-source-inventory.json`, audioVerification: audioPath },
  hashes: { gateManifestSha256: sha256(await read(V38_GATE_MANIFEST)), sourceAuditSha256: sha256(await read(V38_SOURCE_AUDIT)) }
};
if (shouldWrite) {
  await writeFile(path.resolve(root, analysis.artifacts.finalInventory), `${JSON.stringify(finalInventory, null, 2)}\n`);
  await writeFile(path.resolve(root, `${V38_ROOT}/source-preparation/source-preparation-analysis.json`), `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({ status: analysis.status, sourcePreparationPassed, pendingAudioVerifications: pendingAudio, selectedMoves: selectedMoves.length, provisionalCategoryCounts: categories, decision: analysis.decision }, null, 2));
