#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V38_ROOT, canonicalJson, makeReviewPacket, makeReviewSchema, validateProposalOutput, validateReviewOutput } from "./lib/v38-source-preparation.mjs";

const shouldWrite = process.argv.includes("--write");
const debateNumber = "103";
const readJson = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const packetPath = `${V38_ROOT}/source-preparation/proposal/packets/debate-${debateNumber}.json`;
const schemaPath = `${V38_ROOT}/source-preparation/proposal/schemas/debate-${debateNumber}.schema.json`;
const eventsPath = `.assessment-cache/captions/g1TlLCSn_5o/events.json`;
const [packet, schema, events] = await Promise.all([readJson(packetPath), readJson(schemaPath), readJson(eventsPath)]);

const routes = ["pro", "con"].map((side) => ({
  routeId: packet.routeIdentities[side].routeId,
  side,
  description: `${side} synthetic route description states a complete position for mechanical validation only.`,
  successCriteria: `${side} synthetic success criteria identify observable completion conditions for tooling validation.`,
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
  schemaVersion: "3.8-source-proposal-output",
  debateNumber,
  debateId: packet.debateId,
  reviewerRole: "proposal",
  routes,
  moves: anchors.map((startEvent, index) => {
    const side = index % 2 === 0 ? "pro" : "con";
    return {
      moveId: `${packet.debateId}-candidate-${String(index + 1).padStart(2, "0")}`,
      startEvent,
      endEvent: startEvent + 5,
      speaker: packet.sides[side].speakers[0],
      side,
      proposition: `Synthetic candidate proposition ${index + 1} exists solely to verify the closed source-preparation contract.`,
      attributionConfidence: "high",
      attributionBasis: `Synthetic attribution basis ${index + 1} is deliberately long enough for mechanical schema validation only.`,
      provisionalBurdenContact: contacts[index],
      selectionRationale: `Synthetic selection rationale ${index + 1} verifies event coordinates, side balance, contact diversity, and prose-length constraints without acting as a substantive debate judgment.`
    };
  })
};
validateProposalOutput(proposal, packet, schema, events);

let sideImbalanceRejected = false;
try {
  const invalid = structuredClone(proposal);
  invalid.moves[1].side = "pro";
  invalid.moves[1].speaker = packet.sides.pro.speakers[0];
  validateProposalOutput(invalid, packet, schema, events);
} catch { sideImbalanceRejected = true; }

const reviewPacket = makeReviewPacket(packet, proposal, events);
const serializedReviewCandidates = canonicalJson(reviewPacket.candidates);
const proposalLabelLeakage = ["provisionalBurdenContact", "attributionConfidence", "attributionBasis", "selectionRationale", "Synthetic candidate proposition"].filter((text) => serializedReviewCandidates.includes(text));
const reviewSchema = makeReviewSchema(packet, reviewPacket);
const review = {
  schemaVersion: "3.8-source-review-output",
  debateNumber,
  debateId: packet.debateId,
  reviewerRole: "review",
  routeReviews: routes.map((route) => ({ side: route.side, routeAccepted: true, routeRationale: "The synthetic route is accepted solely to exercise the review contract and contains the required route structure.", bridgeReviews: route.bridges.map((bridge) => ({ bridgeId: bridge.bridgeId, accepted: true, rationale: "The synthetic bridge is accepted solely to exercise deterministic review validation." })) })),
  moveReviews: proposal.moves.map((move) => ({ moveId: move.moveId, candidateValid: true, speaker: move.speaker, side: move.side, attributionConfidence: move.attributionConfidence, attributionBasis: "The synthetic turn identity is accepted solely to exercise the attribution review fields.", provisionalBurdenContact: move.provisionalBurdenContact, rationale: "The synthetic candidate is accepted solely to exercise independent move validity, attribution, and provisional-contact review without producing a participant score." }))
};
validateReviewOutput(review, packet, proposal, reviewPacket, reviewSchema);

const fixture = {
  schemaVersion: "3.8-source-preparation-dry-fixture",
  passed: sideImbalanceRejected && proposalLabelLeakage.length === 0,
  modelContextsExecuted: 0,
  proposalSchemaClosedAndValidated: true,
  routeCount: proposal.routes.length,
  bridgeCount: proposal.routes.reduce((sum, item) => sum + item.bridges.length, 0),
  candidateMoveCount: proposal.moves.length,
  sideBalanceVerified: true,
  sideImbalanceRejected,
  contactCategoryDiversityVerified: true,
  timeQuartileSpreadVerified: true,
  reviewPacketProposalLabelLeakage: proposalLabelLeakage,
  reviewSchemaClosedAndValidated: true,
  scoreFieldsEmitted: 0
};
if (!fixture.passed) throw new Error("source-preparation dry fixture failed");
if (shouldWrite) await writeFile(path.resolve(`${V38_ROOT}/source-preparation-dry-fixture.json`), `${JSON.stringify(fixture, null, 2)}\n`);
console.log(JSON.stringify(fixture, null, 2));
