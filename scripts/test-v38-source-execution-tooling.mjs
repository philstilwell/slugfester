#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V38_ROOT, makeReviewPacket } from "./lib/v38-source-preparation.mjs";
import { buildResolvedSourceDebate, compareSourceProposalAndReview, makeSourceAdjudicationArtifacts, resolveSourceFields, selectFinalMoves, validateSourceAdjudicationOutput } from "./lib/v38-source-execution.mjs";

const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const packet = await readJson(`${V38_ROOT}/source-preparation/proposal/packets/debate-103.json`);
const events = await readJson(".assessment-cache/captions/g1TlLCSn_5o/events.json");
const routes = ["pro", "con"].map((side) => ({
  routeId: packet.routeIdentities[side].routeId,
  side,
  description: `${side} synthetic route description states a complete position for execution tooling validation.`,
  successCriteria: `${side} synthetic success criteria identify observable completion conditions for execution tooling validation.`,
  bridges: [
    { bridgeId: packet.routeIdentities[side].bridgeIds.motion, tier: "motion", description: "The complete synthetic motion proposition is supported or attacked." },
    { bridgeId: packet.routeIdentities[side].bridgeIds.central, tier: "central", description: "The central synthetic inference is supported or attacked directly." },
    ...packet.routeIdentities[side].bridgeIds.subsidiary.map((bridgeId, index) => ({ bridgeId, tier: "subsidiary", description: `The proposition-specific synthetic subsidiary bridge ${index + 1} is supported or attacked.` }))
  ]
}));
const anchors = [60, 180, 340, 500, 700, 900, 1100, 1280].map((value) => Math.min(value, events.length - 8));
const contacts = [
  null,
  null,
  { polarity: "support", targetSide: "pro", tier: "motion", bridgeIndex: 0 },
  { polarity: "attack", targetSide: "con", tier: "central", bridgeIndex: 0 },
  { polarity: "support", targetSide: "pro", tier: "subsidiary", bridgeIndex: 0 },
  { polarity: "attack", targetSide: "con", tier: "subsidiary", bridgeIndex: 1 },
  { polarity: "support", targetSide: "con", tier: "subsidiary", bridgeIndex: 2 },
  { polarity: "attack", targetSide: "pro", tier: "subsidiary", bridgeIndex: 1 }
];
const proposal = {
  schemaVersion: "3.8-source-proposal-output", debateNumber: packet.debateNumber, debateId: packet.debateId, reviewerRole: "proposal", routes,
  moves: anchors.map((startEvent, index) => {
    const side = index % 2 === 0 ? "pro" : "con";
    return { moveId: `${packet.debateId}-candidate-${String(index + 1).padStart(2, "0")}`, startEvent, endEvent: startEvent + 5, speaker: packet.sides[side].speakers[0], side, proposition: `Synthetic execution candidate proposition ${index + 1} exists only for deterministic branch testing.`, attributionConfidence: "high", attributionBasis: "Synthetic high-confidence attribution basis exists only for deterministic branch testing.", provisionalBurdenContact: contacts[index], selectionRationale: "Synthetic selection rationale exists only to exercise execution branches without making a substantive judgment about the held-out debate." };
  })
};
const reviewPacket = makeReviewPacket(packet, proposal, events);
const review = {
  schemaVersion: "3.8-source-review-output", debateNumber: packet.debateNumber, debateId: packet.debateId, reviewerRole: "review",
  routeReviews: routes.map((route) => ({ side: route.side, routeAccepted: true, routeRationale: "The synthetic route is accepted solely to exercise the execution comparison contract.", bridgeReviews: route.bridges.map((bridge) => ({ bridgeId: bridge.bridgeId, accepted: true, rationale: "The synthetic bridge is accepted solely for execution comparison testing." })) })),
  moveReviews: proposal.moves.map((move) => ({ moveId: move.moveId, candidateValid: true, speaker: move.speaker, side: move.side, attributionConfidence: move.attributionConfidence, attributionBasis: "The synthetic attribution is accepted solely to exercise deterministic execution comparison.", provisionalBurdenContact: move.provisionalBurdenContact, rationale: "The synthetic move is accepted solely to exercise deterministic source-preparation comparison and adjudication branches without creating a score." }))
};
review.routeReviews[0].routeAccepted = false;
review.routeReviews[1].bridgeReviews[4].accepted = false;
review.moveReviews[0].candidateValid = false;
review.moveReviews[1].speaker = packet.sides.pro.speakers[0];
review.moveReviews[1].side = "pro";
review.moveReviews[2].attributionConfidence = "medium";
review.moveReviews[3].provisionalBurdenContact = null;

const comparisons = compareSourceProposalAndReview(proposal, review, reviewPacket);
const disputes = comparisons.filter((item) => !item.agreed);
const artifacts = makeSourceAdjudicationArtifacts(packet.debateNumber, packet.debateId, comparisons, 3);
const adjudication = {
  schemaVersion: "3.8-source-adjudication-output", debateNumber: packet.debateNumber, debateId: packet.debateId, reviewerRole: "source-adjudication",
  fields: artifacts.packet.disputedFields.map((field) => {
    const comparison = disputes.find((item) => item.fieldId === field.fieldId);
    const option = field.candidates.find((item) => JSON.stringify(item.value) === JSON.stringify(comparison.proposalValue));
    return { fieldId: field.fieldId, optionId: option.optionId, rationale: "The synthetic adjudicator selects one of the two initial values solely to verify two-vote resolution and candidate restriction." };
  })
};
validateSourceAdjudicationOutput(adjudication, artifacts.packet, artifacts.schema);
const resolvedFields = resolveSourceFields(comparisons, adjudication, artifacts.map);
const resolved = buildResolvedSourceDebate(packet, proposal, review, reviewPacket, resolvedFields, events);
const audioRequired = resolved.moves.filter((item) => item.audioVerificationRequired);
for (const move of resolved.moves) move.audioVerificationRequired = false;
const selection = selectFinalMoves(resolved);
const serializedPacket = JSON.stringify(artifacts.packet);
const fixture = {
  schemaVersion: "3.8-source-execution-dry-fixture",
  passed: disputes.length === 6 && audioRequired.length === 1 && selection.selected.length === 4,
  modelContextsExecuted: 0,
  comparisonFieldCount: comparisons.length,
  syntheticDisputedFieldCount: disputes.length,
  disputedKinds: [...new Set(disputes.map((item) => `${item.subjectType}.${item.fieldName}`))].sort(),
  adjudicationContextCount: 1,
  disputeOnlyFieldCount: artifacts.packet.disputedFields.length,
  initialPassIdentityLeakage: Number(/proposalValue|reviewValue|proposalRationale|reviewRationale/.test(serializedPacket)),
  thirdPassCandidateRestrictionVerified: true,
  twoVoteResolvedFields: resolvedFields.filter((item) => item.finalVotes >= 2).length,
  unresolvedFields: resolvedFields.filter((item) => item.finalVotes < 2).length,
  mediumConfidenceAudioTriggerVerified: audioRequired.length === 1,
  deterministicFourMoveSelectionVerified: selection.selected.length === 4,
  scoreFieldsEmitted: 0
};
if (!fixture.passed || fixture.initialPassIdentityLeakage !== 0 || fixture.unresolvedFields !== 0) throw new Error("source execution dry fixture failed");
if (shouldWrite) await writeFile(path.resolve(`${V38_ROOT}/source-execution-dry-fixture.json`), `${JSON.stringify(fixture, null, 2)}\n`);
console.log(JSON.stringify(fixture, null, 2));
