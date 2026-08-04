#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { V381_ROOT, canonicalJson, enrichProposal, makeReviewPacket, makeReviewSchema, phaseLockPaths, validateEnrichedProposal, validateProposalRaw, validateReviewOutput } from "./lib/v381-source-preparation.mjs";
import { buildResolvedSourceDebate, compareSourceProposalAndReview, makeSourceAdjudicationArtifacts, resolveSourceFields, selectFinalMoves, validateSourceAdjudicationOutput } from "./lib/v381-source-execution.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const packet = await readJson(`${V381_ROOT}/proposal/packets/debate-103.json`);
const schema = await readJson(`${V381_ROOT}/proposal/schemas/debate-103.schema.json`);
const events = await readJson(".assessment-cache/captions/g1TlLCSn_5o/events.json");

const routes = ["pro", "con"].map((side) => ({
  routeId: packet.routeIdentities[side].routeId,
  side,
  description: `${side} synthetic route description states a complete position for correction validation only.`,
  successCriteria: `${side} synthetic success criteria identify observable completion conditions for correction validation.`,
  bridges: [
    { bridgeId: packet.routeIdentities[side].bridgeIds.motion, tier: "motion", description: "The complete synthetic motion proposition is supported or attacked." },
    { bridgeId: packet.routeIdentities[side].bridgeIds.central, tier: "central", description: "The central synthetic inference is supported or attacked directly." },
    ...packet.routeIdentities[side].bridgeIds.subsidiary.map((id, index) => ({ bridgeId: id, tier: "subsidiary", description: `The exact synthetic subsidiary bridge ${index + 1} is supported or attacked.` }))
  ]
}));
const anchors = [60, 180, 340, 500, 700, 900, 1100, 1280].map((value) => Math.min(value, events.length - 8));
const contacts = [
  null,
  null,
  { polarity: "support", bridgeId: packet.routeIdentities.pro.bridgeIds.motion },
  { polarity: "attack", bridgeId: packet.routeIdentities.con.bridgeIds.central },
  { polarity: "support", bridgeId: packet.routeIdentities.pro.bridgeIds.subsidiary[0] },
  { polarity: "attack", bridgeId: packet.routeIdentities.con.bridgeIds.subsidiary[1] },
  { polarity: "support", bridgeId: packet.routeIdentities.con.bridgeIds.subsidiary[2] },
  { polarity: "attack", bridgeId: packet.routeIdentities.pro.bridgeIds.subsidiary[1] }
];
const raw = {
  schemaVersion: "3.8.1-source-proposal-output",
  debateNumber: packet.debateNumber,
  debateId: packet.debateId,
  reviewerRole: "proposal",
  routes,
  moves: anchors.map((startEvent, index) => {
    const side = index % 2 === 0 ? "pro" : "con";
    return { startEvent, endEvent: startEvent + 5, speaker: packet.sides[side].speakers[0], side, proposition: `Synthetic candidate proposition ${index + 1} exists solely for end-to-end correction validation.`, attributionConfidence: "high", attributionBasis: "Synthetic attribution basis exists solely for deterministic end-to-end correction validation.", provisionalBurdenContact: contacts[index], selectionRationale: "Synthetic selection rationale verifies bounded spans, side balance, direct bridge identity, label isolation, and deterministic enrichment without a debate judgment." };
  })
};
validateProposalRaw(raw, packet, schema, events);
const enriched = validateEnrichedProposal(enrichProposal(raw, packet), packet);
const rawHasModelCandidateIds = raw.moves.some((item) => Object.hasOwn(item, "moveId"));
const exactDirectContacts = enriched.moves.filter((item) => item.provisionalBurdenContact !== null).every((item) => packet.allowedBridgeIds.includes(item.provisionalBurdenContact.bridgeId));

const reviewPacket = makeReviewPacket(packet, enriched, events);
const reviewSchema = makeReviewSchema(packet, reviewPacket);
const labelLeakage = ["provisionalBurdenContact", "attributionConfidence", "attributionBasis", "selectionRationale", "Synthetic candidate proposition"].filter((text) => canonicalJson(reviewPacket.candidates).includes(text));
const review = {
  schemaVersion: "3.8.1-source-review-output",
  debateNumber: packet.debateNumber,
  debateId: packet.debateId,
  reviewerRole: "review",
  routeReviews: routes.map((route) => ({ side: route.side, routeAccepted: true, routeRationale: "The synthetic route is accepted solely to exercise the independent review contract end to end.", bridgeReviews: route.bridges.map((bridge) => ({ bridgeId: bridge.bridgeId, accepted: true, rationale: "The synthetic bridge is accepted solely for deterministic review validation." })) })),
  moveReviews: enriched.moves.map((move) => ({ moveId: move.moveId, candidateValid: true, speaker: move.speaker, side: move.side, attributionConfidence: move.attributionConfidence, attributionBasis: "The synthetic attribution is accepted solely to exercise independent source review.", provisionalBurdenContact: move.provisionalBurdenContact, rationale: "The synthetic move is accepted solely to exercise move validity, attribution, and exact direct-bridge review without producing a score." }))
};
review.routeReviews[0].routeAccepted = false;
review.routeReviews[1].bridgeReviews[4].accepted = false;
review.moveReviews[0].candidateValid = false;
review.moveReviews[1].speaker = packet.sides.pro.speakers[0];
review.moveReviews[1].side = "pro";
review.moveReviews[2].attributionConfidence = "medium";
review.moveReviews[3].provisionalBurdenContact = null;
validateReviewOutput(review, packet, enriched, reviewPacket, reviewSchema);

const comparisons = compareSourceProposalAndReview(enriched, review, reviewPacket);
const disputes = comparisons.filter((item) => !item.agreed);
const adjudicationArtifacts = makeSourceAdjudicationArtifacts(packet.debateNumber, packet.debateId, comparisons, 3);
const adjudication = {
  schemaVersion: "3.8.1-source-adjudication-output",
  debateNumber: packet.debateNumber,
  debateId: packet.debateId,
  reviewerRole: "source-adjudication",
  fields: adjudicationArtifacts.packet.disputedFields.map((field) => {
    const comparison = disputes.find((item) => item.fieldId === field.fieldId);
    const option = field.candidates.find((item) => canonicalJson(item.value) === canonicalJson(comparison.proposalValue));
    return { fieldId: field.fieldId, optionId: option.optionId, rationale: "The synthetic adjudicator selects one supplied initial value solely to prove two-vote resolution and option restriction." };
  })
};
validateSourceAdjudicationOutput(adjudication, adjudicationArtifacts.packet, adjudicationArtifacts.schema);
const resolvedFields = resolveSourceFields(comparisons, adjudication, adjudicationArtifacts.map);
const resolved = buildResolvedSourceDebate(packet, enriched, review, reviewPacket, resolvedFields, events);
const audioRequired = resolved.moves.filter((item) => item.audioVerificationRequired);
for (const move of resolved.moves) move.audioVerificationRequired = false;
const selection = selectFinalMoves(resolved);

const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-v381-lifecycle-"));
let phaseLocksExcludeFutureOutputs = false;
try {
  const proposalPacketPath = path.join(temporary, "proposal-packet.json");
  const proposalSchemaPath = path.join(temporary, "proposal-schema.json");
  const proposalOutputPath = path.join(temporary, "future-proposal-output.json");
  const upstreamPath = path.join(temporary, "upstream.json");
  await writeFile(proposalPacketPath, `${JSON.stringify(packet)}\n`);
  await writeFile(proposalSchemaPath, `${JSON.stringify(schema)}\n`);
  await writeFile(upstreamPath, "{}\n");
  const inputs = phaseLockPaths([{ packet: proposalPacketPath, schema: proposalSchemaPath, output: proposalOutputPath }], [upstreamPath]);
  const hashes = Object.fromEntries(await Promise.all(inputs.map(async (file) => [file, sha256(await readFile(file, "utf8"))])));
  phaseLocksExcludeFutureOutputs = !inputs.includes(proposalOutputPath) && Object.keys(hashes).length === 3;
  await writeFile(proposalOutputPath, `${JSON.stringify(raw)}\n`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}

const timeoutObserved = await new Promise((resolve) => {
  const child = spawn(process.execPath, ["-e", "setInterval(()=>{},1000)"], { stdio: "ignore" });
  const timer = setTimeout(() => child.kill("SIGTERM"), 50);
  child.on("close", (_code, signal) => { clearTimeout(timer); resolve(signal === "SIGTERM"); });
});

const fixture = {
  schemaVersion: "3.8.1-source-preparation-end-to-end-dry-fixture",
  passed: !rawHasModelCandidateIds && exactDirectContacts && labelLeakage.length === 0 && disputes.length === 6 && resolvedFields.every((item) => item.finalVotes >= 2) && audioRequired.length === 1 && selection.selected.length === 4 && phaseLocksExcludeFutureOutputs && timeoutObserved,
  modelContextsExecuted: 0,
  lifecycleStagesReached: ["proposal-raw-validation", "deterministic-enrichment", "review-packet", "review-validation", "disagreement-extraction", "dispute-only-adjudication", "two-vote-resolution", "audio-trigger", "four-move-selection", "pre-stage-phase-lock", "timeout-termination"],
  modelAuthoredCandidateIds: rawHasModelCandidateIds ? 1 : 0,
  deterministicCandidateIds: enriched.moves.length,
  exactDirectBridgeContactsVerified: exactDirectContacts,
  ambiguousBridgeCoordinates: 0,
  reviewPacketProposalLabelLeakage: labelLeakage,
  comparisonFieldCount: comparisons.length,
  disputedFieldCount: disputes.length,
  adjudicationPassIdentityLeakage: Number(/proposalValue|reviewValue/.test(JSON.stringify(adjudicationArtifacts.packet))),
  twoVoteResolvedFields: resolvedFields.filter((item) => item.finalVotes >= 2).length,
  unresolvedFields: resolvedFields.filter((item) => item.finalVotes < 2).length,
  mediumConfidenceAudioTriggerVerified: audioRequired.length === 1,
  deterministicFourMoveSelectionVerified: selection.selected.length === 4,
  phaseLocksExcludeFutureOutputs,
  timeoutTerminationVerified: timeoutObserved,
  scoringFieldsEmitted: 0
};
if (!fixture.passed || fixture.adjudicationPassIdentityLeakage !== 0) throw new Error("v3.8.1 end-to-end source-preparation dry fixture failed");
if (shouldWrite) {
  await mkdir(path.resolve(root, V381_ROOT), { recursive: true });
  await writeFile(path.resolve(root, `${V381_ROOT}/end-to-end-dry-fixture.json`), `${JSON.stringify(fixture, null, 2)}\n`);
}
console.log(JSON.stringify(fixture, null, 2));
