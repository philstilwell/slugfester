#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { V388_CONSENSUS_ROOT, V388_DEBATE_NUMBERS, assert } from "./lib/v388-coverage-consensus.mjs";

const root = process.cwd();
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [analysis, inventory, primaryExecution, conditionalManifest, conditionalExecution, audio] = await Promise.all([
  readJson(`${V388_CONSENSUS_ROOT}/coverage-consensus-analysis.json`),
  readJson(`${V388_CONSENSUS_ROOT}/final-coverage-inventory.json`),
  readJson(`${V388_CONSENSUS_ROOT}/adjudication/model-execution.json`),
  readJson(`${V388_CONSENSUS_ROOT}/conditional-adjudication/execution-manifest.json`),
  readJson(`${V388_CONSENSUS_ROOT}/conditional-adjudication/model-execution.json`),
  readJson(`${V388_CONSENSUS_ROOT}/audio-verification.json`)
]);
for (const [file, digest] of Object.entries(conditionalManifest.sourceHashes)) assert(sha256(await readBytes(file)) === digest, `conditional source hash mismatch: ${file}`);
assert(primaryExecution.validOutputContexts === 3 && primaryExecution.results.every((item) => item.gateAcceptancePassed && item.retryCount === 0 && item.transportClassification !== "invalid"), "primary adjudication execution invalid");
assert(conditionalExecution.validOutputContexts === 1 && conditionalExecution.totalRetries === 0 && conditionalExecution.results.every((item) => item.gateAcceptancePassed && item.transportClassification !== "invalid"), "conditional adjudication execution invalid");
assert(audio.records.length === 1 && audio.records.every((record) => record.status === "verified"), "audio verification incomplete");
for (const record of audio.records) assert(record.clip.sha256 === sha256(await readBytes(record.clip.path)) && record.transcription.sha256 === sha256(await readBytes(record.transcription.path)), "audio verification hash mismatch");
assert(analysis.coverageConsensusPassed && analysis.status === "coverage-consensus-passed" && inventory.status === "locked-score-free-coverage-inventory", "coverage consensus did not pass");
assert(inventory.debateCount === 3 && inventory.debates.length === 3 && inventory.selectedMoveCount === 81, "final inventory count invalid");
assert(analysis.totals.originalComparisonFields === 566 && analysis.totals.conditionalFieldsRecovered === 6 && analysis.totals.finalTwoVoteSupportedFields === 572 && analysis.totals.unresolvedFields === 0, "final field universe invalid");
assert(analysis.totals.selectedMoves === 81 && analysis.totals.representedBridges === 30 && analysis.totals.consequentialOmissions === 0 && analysis.totals.requiredAudioVerifications === 1 && analysis.totals.completedAudioVerifications === 1, "coverage totals invalid");
assert(analysis.totals.primaryAdjudicationContexts === 3 && analysis.totals.conditionalAdjudicationContexts === 1 && analysis.totals.scoringFields === 0 && analysis.totals.meteredApiCostUsd === 0 && analysis.totals.transcriptionCostUsd === 0, "execution or cost totals invalid");
for (const debateNumber of V388_DEBATE_NUMBERS) {
  const resolved = await readJson(`${V388_CONSENSUS_ROOT}/resolved/debate-${debateNumber}.json`);
  const inventoryDebate = inventory.debates.find((item) => item.debateNumber === debateNumber);
  assert(inventoryDebate && canonicalSubset(resolved, inventoryDebate), `${debateNumber}: final inventory differs from resolved debate`);
  assert(resolved.moves.length <= 28 && resolved.bridgeCoverage.length === 10 && resolved.materialConcessionAudit.length === 2, `${debateNumber}: resolved coverage counts invalid`);
  assert(resolved.fieldResolutions.every((field) => field.finalVotes >= 2), `${debateNumber}: field lacks two-vote support`);
  const moveIds = new Set(resolved.moves.map((move) => move.moveId));
  assert(moveIds.size === resolved.moves.length, `${debateNumber}: duplicate move ID`);
  for (const side of ["pro", "con"]) {
    const sideMoves = resolved.moves.filter((move) => move.side === side);
    assert(sideMoves.length >= 4 && sideMoves.some((move) => move.selectionRole === "load-bearing-constructive") && sideMoves.some((move) => move.selectionRole === "major-direct-reply"), `${debateNumber}.${side}: coverage roles invalid`);
  }
  for (const move of resolved.moves) for (const target of move.respondsToRefs) assert(moveIds.has(target) && target !== move.moveId, `${debateNumber}.${move.moveId}: invalid response target`);
  for (const bridge of resolved.bridgeCoverage) assert(bridge.status === "represented" && bridge.moveRefs.length > 0 && bridge.moveRefs.every((ref) => moveIds.has(ref)) && bridge.moveRefs.some((ref) => resolved.moves.find((move) => move.moveId === ref).side === bridge.side), `${debateNumber}.${bridge.bridgeId}: bridge evidence invalid`);
  for (const audit of resolved.materialConcessionAudit) for (const ref of audit.moveRefs) assert(moveIds.has(ref) && resolved.moves.find((move) => move.moveId === ref).side === audit.side && resolved.moves.find((move) => move.moveId === ref).selectionRole === "material-concession", `${debateNumber}.${audit.side}: concession evidence invalid`);
  assert(!containsScoreField(resolved), `${debateNumber}: score field present`);
}
assert(!containsScoreField(inventory) && !containsScoreField(analysis), "score field present in final artifact");
assert(analysis.decision.sectionAndWeightLockPreregistrationAuthorized && !analysis.decision.sectionAndWeightModelExecutionAuthorized && !analysis.decision.burdenContactModelExecutionAuthorized && !analysis.decision.numericalParticipantScoringAuthorized && !analysis.decision.assessmentProseAuthorized && !analysis.decision.productionMutationAuthorized && !analysis.decision.tenDebateGateAuthorized && !analysis.decision.all195DebatesAuthorized, "authorization boundary invalid");
console.log(JSON.stringify({ status: "passed", coverageConsensusPassed: true, debates: 3, selectedMoves: 81, finalTwoVoteSupportedFields: 572, unresolvedFields: 0, representedBridges: 30, audioVerificationRate: "1/1", adjudicationContexts: 4, scoringFields: 0, meteredApiCostUsd: 0, sectionAndWeightLockPreregistrationAuthorized: true, sectionAndWeightModelExecutionAuthorized: false, scoringAuthorized: false }, null, 2));

function canonicalSubset(resolved, inventoryDebate) {
  return JSON.stringify({ debateNumber: resolved.debateNumber, debateId: resolved.debateId, motion: resolved.motion, sides: resolved.sides, routes: resolved.routes, moves: resolved.moves, bridgeCoverage: resolved.bridgeCoverage, materialConcessionAudit: resolved.materialConcessionAudit }) === JSON.stringify(inventoryDebate);
}
