import { readFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./v37-retired-semantic.mjs";
import { assert, canonicalJson, validateClosedSchema, validateSchemaValue } from "./v36-decision-cards.mjs";

export const V381_ROOT = "docs/calibration/v3.8.1/held-out-source-preparation-correction";
export const V38_GATE_ROOT = "docs/calibration/v3.8/held-out-burden-contact-integration-gate";
export const V38_GATE_MANIFEST = `${V38_GATE_ROOT}/gate-manifest.json`;
export const V38_SOURCE_AUDIT = `${V38_GATE_ROOT}/source-audit.json`;
export const V381_MANUAL = `${V381_ROOT}/source-preparation-manual.md`;
export const V381_EXECUTION_MANIFEST = `${V381_ROOT}/execution-manifest.json`;
export const V381_DEBATE_NUMBERS = ["103", "55", "161"];

export const readJson = async (root, file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
export const normalizeWords = (value) => String(value).toLowerCase().match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? [];
export const eventExcerpt = (events, startEvent, endEvent) => events.slice(startEvent, endEvent + 1).map((item) => item.text).join(" ").replace(/\s+/g, " ").trim();
export const contextExcerpt = (events, startEvent, endEvent, padding = 5) => eventExcerpt(events, Math.max(0, startEvent - padding), Math.min(events.length - 1, endEvent + padding));
export const routeId = (debateId, side) => `${debateId}-${side}-route-v381`;
export const bridgeId = (debateId, side, tier, index = 0) => `${debateId}-${side}-${tier}${tier === "subsidiary" ? `-${index + 1}` : ""}-v381`;
export const moveId = (debateId, index) => `${debateId}-candidate-${String(index + 1).padStart(2, "0")}-v381`;

const string = (extra = {}) => ({ type: "string", ...extra });
const integer = (extra = {}) => ({ type: "integer", ...extra });
const closedObject = (properties) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
const contactSchema = (bridgeIds) => ({ anyOf: [
  { type: "null" },
  closedObject({ polarity: string({ enum: ["support", "attack"] }), bridgeId: string({ enum: bridgeIds }) })
] });

export function proposalPacket(debate, source) {
  const routeIdentities = Object.fromEntries(["pro", "con"].map((side) => [side, {
    routeId: routeId(debate.debateId, side),
    bridgeIds: {
      motion: bridgeId(debate.debateId, side, "motion"),
      central: bridgeId(debate.debateId, side, "central"),
      subsidiary: [0, 1, 2].map((index) => bridgeId(debate.debateId, side, "subsidiary", index))
    }
  }]));
  const allowedBridgeIds = Object.values(routeIdentities).flatMap((route) => [route.bridgeIds.motion, route.bridgeIds.central, ...route.bridgeIds.subsidiary]);
  return {
    schemaVersion: "3.8.1-source-proposal-packet",
    debateNumber: debate.number,
    debateId: debate.debateId,
    motion: debate.motion,
    sides: debate.sides,
    durationSeconds: source.durationSeconds,
    eventCount: source.eventCount,
    requiredCandidateMoves: 8,
    requiredCandidatesPerSide: 4,
    requiredRouteShapePerSide: { motionBridges: 1, centralBridges: 1, subsidiaryBridges: 3 },
    routeIdentities,
    allowedBridgeIds,
    candidateIdPolicy: "Do not emit candidate IDs; IDs are derived deterministically from debate identity and array position after validation.",
    contactPolicy: "Use null or exactly {polarity, bridgeId}; bridgeId must be copied from allowedBridgeIds.",
    sourceFilesInContext: { transcript: "transcript.txt", events: "events.json" },
    prohibitedOutputs: ["candidate IDs", "scores", "participant assessments", "Overall Commentary", "AI Extension"]
  };
}

export function makeProposalSchema(packet) {
  const routeSchema = closedObject({
    routeId: string(), side: string({ enum: ["pro", "con"] }), description: string({ minLength: 40 }), successCriteria: string({ minLength: 40 }),
    bridges: { type: "array", minItems: 5, maxItems: 5, items: closedObject({ bridgeId: string({ enum: packet.allowedBridgeIds }), tier: string({ enum: ["motion", "central", "subsidiary"] }), description: string({ minLength: 30 }) }) }
  });
  const moveSchema = closedObject({
    startEvent: integer({ minimum: 0, maximum: packet.eventCount - 1 }), endEvent: integer({ minimum: 0, maximum: packet.eventCount - 1 }),
    speaker: string({ enum: [...packet.sides.pro.speakers, ...packet.sides.con.speakers] }), side: string({ enum: ["pro", "con"] }), proposition: string({ minLength: 30 }),
    attributionConfidence: string({ enum: ["high", "medium", "low"] }), attributionBasis: string({ minLength: 40 }), provisionalBurdenContact: contactSchema(packet.allowedBridgeIds), selectionRationale: string({ minLength: 80 })
  });
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v381-source-proposal-${packet.debateNumber}`,
    ...closedObject({
      schemaVersion: string({ const: "3.8.1-source-proposal-output" }), debateNumber: string({ const: packet.debateNumber }), debateId: string({ const: packet.debateId }), reviewerRole: string({ const: "proposal" }),
      routes: { type: "array", minItems: 2, maxItems: 2, items: routeSchema }, moves: { type: "array", minItems: 8, maxItems: 8, items: moveSchema }
    })
  };
}

function expectedRoute(packet, side) {
  return [
    { tier: "motion", bridgeId: packet.routeIdentities[side].bridgeIds.motion },
    { tier: "central", bridgeId: packet.routeIdentities[side].bridgeIds.central },
    ...packet.routeIdentities[side].bridgeIds.subsidiary.map((id) => ({ tier: "subsidiary", bridgeId: id }))
  ];
}

export function validateProposalRaw(output, packet, schema, events) {
  validateSchemaValue(validateClosedSchema(schema), output, `proposal.${packet.debateNumber}`);
  assert(output.schemaVersion === "3.8.1-source-proposal-output" && output.debateNumber === packet.debateNumber && output.debateId === packet.debateId && output.reviewerRole === "proposal", "proposal identity invalid");
  assert(output.routes.length === 2 && output.moves.length === 8 && !containsScoreField(output), "proposal count or score prohibition invalid");
  assert(!output.moves.some((move) => Object.hasOwn(move, "moveId")), "model-authored candidate ID prohibited");
  assert(canonicalJson(output.routes.map((item) => item.side).sort()) === canonicalJson(["con", "pro"]), "proposal must contain one route per side");
  for (const route of output.routes) {
    assert(route.routeId === packet.routeIdentities[route.side].routeId, `${route.side}: route ID invalid`);
    const expected = expectedRoute(packet, route.side);
    assert(route.bridges.length === expected.length, `${route.side}: bridge count invalid`);
    for (let index = 0; index < expected.length; index += 1) {
      assert(route.bridges[index].tier === expected[index].tier && route.bridges[index].bridgeId === expected[index].bridgeId, `${route.side}: bridge order or ID invalid at ${index}`);
    }
  }
  const speakersBySide = Object.fromEntries(["pro", "con"].map((side) => [side, new Set(packet.sides[side].speakers)]));
  const quartiles = new Set();
  for (const move of output.moves) {
    assert(speakersBySide[move.side].has(move.speaker), "proposal speaker-side mismatch");
    assert(move.startEvent >= 0 && move.endEvent < events.length && move.startEvent <= move.endEvent, "proposal event range invalid");
    const words = normalizeWords(eventExcerpt(events, move.startEvent, move.endEvent)).length;
    assert(words >= 25 && words <= 180, `proposal excerpt must contain 25-180 normalized words; found ${words}`);
    const startMs = events[move.startEvent].startMs, endMs = events[move.endEvent].startMs + events[move.endEvent].durationMs;
    assert(endMs > startMs && endMs - startMs <= 120000, "proposal event span duration invalid");
    quartiles.add(Math.min(3, Math.floor((startMs / (packet.durationSeconds * 1000)) * 4)));
    if (move.provisionalBurdenContact !== null) assert(packet.allowedBridgeIds.includes(move.provisionalBurdenContact.bridgeId), "proposal contact bridge invalid");
  }
  assert(output.moves.filter((item) => item.side === "pro").length === 4 && output.moves.filter((item) => item.side === "con").length === 4, "proposal must contain four moves per side");
  assert(quartiles.size >= 3, "proposal moves must span at least three time quartiles");
  const contacts = output.moves.map((item) => item.provisionalBurdenContact);
  assert(contacts.filter((item) => item === null).length >= 2, "proposal needs at least two provisional no-contact moves");
  assert(contacts.filter((item) => item?.polarity === "support").length >= 2, "proposal needs at least two provisional supports");
  assert(contacts.filter((item) => item?.polarity === "attack").length >= 2, "proposal needs at least two provisional attacks");
  const bridgeMap = new Map(output.routes.flatMap((route) => route.bridges.map((bridge) => [bridge.bridgeId, bridge])));
  const tiers = contacts.filter(Boolean).map((contact) => bridgeMap.get(contact.bridgeId)?.tier);
  assert(tiers.includes("motion") && tiers.includes("central") && tiers.filter((tier) => tier === "subsidiary").length >= 2, "proposal tier diversity invalid");
  return output;
}

export function enrichProposal(raw, packet) {
  return {
    schemaVersion: "3.8.1-source-proposal-enriched",
    debateNumber: raw.debateNumber,
    debateId: raw.debateId,
    reviewerRole: raw.reviewerRole,
    enrichment: { deterministic: true, semanticFieldsChanged: false, rule: "moveId = debateId + ordered array position" },
    routes: structuredClone(raw.routes),
    moves: raw.moves.map((move, index) => ({ moveId: moveId(packet.debateId, index), ...structuredClone(move) }))
  };
}

export function validateEnrichedProposal(proposal, packet) {
  assert(proposal.schemaVersion === "3.8.1-source-proposal-enriched" && proposal.debateNumber === packet.debateNumber && proposal.debateId === packet.debateId, "enriched proposal identity invalid");
  assert(proposal.moves.length === 8 && proposal.enrichment.deterministic && !proposal.enrichment.semanticFieldsChanged, "enriched proposal contract invalid");
  for (let index = 0; index < proposal.moves.length; index += 1) assert(proposal.moves[index].moveId === moveId(packet.debateId, index), "enriched move ID invalid");
  return proposal;
}

export function canonicalContact(contact, proposal) {
  if (contact === null) return null;
  const route = proposal.routes.find((item) => item.bridges.some((bridge) => bridge.bridgeId === contact.bridgeId));
  assert(route, `contact bridge absent: ${contact.bridgeId}`);
  const bridge = route.bridges.find((item) => item.bridgeId === contact.bridgeId);
  return { polarity: contact.polarity, tier: bridge.tier, bridgeId: bridge.bridgeId };
}

export function makeReviewPacket(packet, proposal, events) {
  validateEnrichedProposal(proposal, packet);
  return {
    schemaVersion: "3.8.1-source-review-packet",
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    motion: packet.motion,
    sides: packet.sides,
    routes: proposal.routes,
    allowedBridgeIds: packet.allowedBridgeIds,
    candidates: proposal.moves.map((move) => ({
      moveId: move.moveId,
      sourceSpan: { startEvent: move.startEvent, endEvent: move.endEvent, startMs: events[move.startEvent].startMs, endMs: events[move.endEvent].startMs + events[move.endEvent].durationMs },
      atomicExcerpt: eventExcerpt(events, move.startEvent, move.endEvent),
      contextWindow: contextExcerpt(events, move.startEvent, move.endEvent)
    })),
    sourceFilesInContext: packet.sourceFilesInContext,
    hiddenProposalFields: ["speaker", "side", "proposition", "attributionConfidence", "attributionBasis", "provisionalBurdenContact", "selectionRationale"],
    contactPolicy: packet.contactPolicy,
    prohibitedOutputs: packet.prohibitedOutputs
  };
}

export function makeReviewSchema(packet, reviewPacket) {
  const routeReviewSchema = closedObject({ side: string({ enum: ["pro", "con"] }), routeAccepted: { type: "boolean" }, routeRationale: string({ minLength: 80 }), bridgeReviews: { type: "array", minItems: 5, maxItems: 5, items: closedObject({ bridgeId: string({ enum: packet.allowedBridgeIds }), accepted: { type: "boolean" }, rationale: string({ minLength: 60 }) }) } });
  const moveReviewSchema = closedObject({ moveId: string({ enum: reviewPacket.candidates.map((item) => item.moveId) }), candidateValid: { type: "boolean" }, speaker: string({ enum: [...packet.sides.pro.speakers, ...packet.sides.con.speakers] }), side: string({ enum: ["pro", "con"] }), attributionConfidence: string({ enum: ["high", "medium", "low"] }), attributionBasis: string({ minLength: 40 }), provisionalBurdenContact: contactSchema(packet.allowedBridgeIds), rationale: string({ minLength: 100 }) });
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v381-source-review-${packet.debateNumber}`,
    ...closedObject({ schemaVersion: string({ const: "3.8.1-source-review-output" }), debateNumber: string({ const: packet.debateNumber }), debateId: string({ const: packet.debateId }), reviewerRole: string({ const: "review" }), routeReviews: { type: "array", minItems: 2, maxItems: 2, items: routeReviewSchema }, moveReviews: { type: "array", minItems: 8, maxItems: 8, items: moveReviewSchema } })
  };
}

export function validateReviewOutput(output, packet, proposal, reviewPacket, schema) {
  validateSchemaValue(validateClosedSchema(schema), output, `review.${packet.debateNumber}`);
  assert(output.schemaVersion === "3.8.1-source-review-output" && output.debateNumber === packet.debateNumber && output.debateId === packet.debateId && output.reviewerRole === "review", "review identity invalid");
  assert(output.routeReviews.length === 2 && output.moveReviews.length === 8 && !containsScoreField(output), "review count or score prohibition invalid");
  for (let index = 0; index < proposal.routes.length; index += 1) {
    const route = proposal.routes[index], review = output.routeReviews[index];
    assert(review.side === route.side && review.bridgeReviews.length === 5, `${route.side}: route review identity invalid`);
    for (let bridgeIndex = 0; bridgeIndex < route.bridges.length; bridgeIndex += 1) assert(review.bridgeReviews[bridgeIndex].bridgeId === route.bridges[bridgeIndex].bridgeId, `${route.side}: bridge review invalid at ${bridgeIndex}`);
  }
  for (let index = 0; index < reviewPacket.candidates.length; index += 1) {
    const candidate = reviewPacket.candidates[index], review = output.moveReviews[index];
    assert(review.moveId === candidate.moveId, `${candidate.moveId}: move review order invalid`);
    assert(packet.sides[review.side].speakers.includes(review.speaker), `${candidate.moveId}: reviewed speaker-side mismatch`);
    canonicalContact(review.provisionalBurdenContact, proposal);
  }
  return output;
}

export function phaseLockPaths(contexts, completedUpstream = []) {
  return [...new Set(contexts.flatMap((item) => [item.packet, item.schema]).concat(completedUpstream).filter(Boolean))];
}

export { assert, canonicalJson };
