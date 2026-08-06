#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { canonicalJson } from "./lib/v4-lean-production.mjs";
import { buildV422110FixtureProposal, compileAndValidateV422110Primary, makeV422110PrimarySchema } from "./lib/v422110-structural-partition-primary.mjs";

const root = "docs/calibration/v4.2.20/source-span-rendering";
const preparation = JSON.parse(await readFile(`${root}/preparation-manifest.json`, "utf8"));
const context = preparation.contexts.find((item) => item.debateNumber === "27");
const [packet, output, eventsBytes, ledgerBytes] = await Promise.all([context.packet, context.rawOutput, context.originalEvents, context.sourceLedger].map((file) => readFile(file)).map(async (promise, index) => index < 2 ? JSON.parse(await promise) : promise));
const candidateBundle = {
  schemaVersion: "fixture-candidate-bundle",
  debateNumber: output.debateNumber,
  debateId: output.debateId,
  completeSourceDiscovery: { everyEventOwnedExactlyOnce: true, everyCoreReportedComplete: true, silentDeduplicationPerformed: false },
  candidates: output.moves.map((move) => ({ moveId: move.moveId, qualifiedCandidateId: `fixture:${move.moveId}`, side: move.side, speaker: move.speaker, moveKind: move.moveKind, sourceSpan: structuredClone(move.sourceSpan), attributionConfidence: move.attributionConfidence }))
};
const proposal = buildV422110FixtureProposal(output, candidateBundle);
const result = compileAndValidateV422110Primary(proposal, { packet, candidateBundle, eventsDocument: JSON.parse(eventsBytes), eventsBytes, fullLedgerBytes: ledgerBytes });
assert.equal(result.validation.structuralPartitionPrimary.status, "passed");
assert.equal(result.provenance.every((item) => item.immutableCandidateFieldsPreserved), true);
assert.equal(canonicalJson(result.output), canonicalJson(output));
const schema = makeV422110PrimarySchema({ packet, candidateBundle });
assert.equal(schema.properties.sectionJudgments.minItems, 4);
assert.equal(schema.properties.sectionJudgments.maxItems, 6);
assert.equal(schema.properties.sectionJudgments.items.properties.proSelections.minItems, 1);
assert.equal(schema.properties.sectionJudgments.items.properties.proSelections.maxItems, 2);
assert.equal(schema.properties.sectionJudgments.items.properties.conSelections.minItems, 1);
assert.equal(schema.properties.sectionJudgments.items.properties.conSelections.maxItems, 2);
assert.equal(Object.hasOwn(schema.properties.sectionJudgments.items.properties.proSelections.items.properties, "side"), false);
assert.equal(Object.hasOwn(schema.properties.sectionJudgments.items.properties.proSelections.items.properties, "sourceSpan"), false);
assert.ok(schema.properties.sectionJudgments.items.properties.proSelections.items.properties.qualifiedCandidateId.enum.every((id) => candidateBundle.candidates.find((candidate) => candidate.qualifiedCandidateId === id).side === "pro"));

const missingSide = structuredClone(proposal);
missingSide.sectionJudgments[0].proSelections = [];
assert.throws(() => compileAndValidateV422110Primary(missingSide, { packet, candidateBundle, eventsDocument: JSON.parse(eventsBytes), eventsBytes, fullLedgerBytes: ledgerBytes }), /one or two moves/);
const duplicate = structuredClone(proposal);
duplicate.sectionJudgments[1].proSelections[0].qualifiedCandidateId = duplicate.sectionJudgments[0].proSelections[0].qualifiedCandidateId;
assert.throws(() => compileAndValidateV422110Primary(duplicate, { packet, candidateBundle, eventsDocument: JSON.parse(eventsBytes), eventsBytes, fullLedgerBytes: ledgerBytes }), /selected more than once/);
const wrongSide = structuredClone(proposal);
wrongSide.sectionJudgments[0].proSelections[0].qualifiedCandidateId = wrongSide.sectionJudgments[0].conSelections[0].qualifiedCandidateId;
assert.throws(() => compileAndValidateV422110Primary(wrongSide, { packet, candidateBundle, eventsDocument: JSON.parse(eventsBytes), eventsBytes, fullLedgerBytes: ledgerBytes }), /wrong side container/);
const futureTarget = structuredClone(proposal);
const chronologicalMoves = output.moves;
const early = chronologicalMoves.find((move) => move.moveKind === "constructive");
const later = chronologicalMoves.find((move) => move.sourceSpan.startEvent > early.sourceSpan.startEvent && move.side !== early.side);
const earlyJudgment = futureTarget.sectionJudgments.flatMap((section) => [...section.proSelections, ...section.conSelections]).find((move) => move.moveId === early.moveId);
earlyJudgment.response.decisiveTargetIds = [later.moveId];
assert.throws(() => compileAndValidateV422110Primary(futureTarget, { packet, candidateBundle, eventsDocument: JSON.parse(eventsBytes), eventsBytes, fullLedgerBytes: ledgerBytes }), /constructive candidate cannot target/);

console.log(JSON.stringify({ status: "passed", replayDebate: output.debateNumber, sections: proposal.sectionJudgments.length, moves: result.output.moves.length, exactV4220OutputReplay: true, exactV4220ValidatorReused: true, structuralSideCounts: true, repositoryOwnedCandidateFields: true, duplicateSelectionHardFailure: true, wrongSideContainerHardFailure: true, futureTargetHardFailure: true, modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
