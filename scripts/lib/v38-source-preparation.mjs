import { readFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./v37-retired-semantic.mjs";
import { assert, canonicalJson, validateClosedSchema, validateSchemaValue } from "./v36-decision-cards.mjs";

export const V38_ROOT = "docs/calibration/v3.8/held-out-burden-contact-integration-gate";
export const V38_GATE_MANIFEST = `${V38_ROOT}/gate-manifest.json`;
export const V38_SOURCE_AUDIT = `${V38_ROOT}/source-audit.json`;
export const V38_SOURCE_MANUAL = `${V38_ROOT}/source-preparation-manual.md`;
export const V38_DEBATE_NUMBERS = ["103", "55", "161"];

export const readV38Json = async (root, file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
export const normalizeWords = (value) => String(value).toLowerCase().match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? [];
export const eventExcerpt = (events, startEvent, endEvent) => events.slice(startEvent, endEvent + 1).map((item) => item.text).join(" ").replace(/\s+/g, " ").trim();
export const contextExcerpt = (events, startEvent, endEvent, padding = 5) => eventExcerpt(events, Math.max(0, startEvent - padding), Math.min(events.length - 1, endEvent + padding));

export function bridgeId(debateId, side, tier, index = 0) {
  return `${debateId}-${side}-${tier}${tier === "subsidiary" ? `-${index + 1}` : ""}-v38`;
}

export function routeId(debateId, side) {
  return `${debateId}-${side}-route-v38`;
}

const string = (extra = {}) => ({ type: "string", ...extra });
const integer = (extra = {}) => ({ type: "integer", ...extra });
const closedObject = (properties) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
const contactSchema = () => ({ anyOf: [
  { type: "null" },
  closedObject({ polarity: string({ enum: ["support", "attack"] }), targetSide: string({ enum: ["pro", "con"] }), tier: string({ enum: ["motion", "central", "subsidiary"] }), bridgeIndex: integer({ minimum: 0, maximum: 2 }) })
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
  return {
    schemaVersion: "3.8-source-proposal-packet",
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
    sourceFilesInContext: { transcript: "transcript.txt", events: "events.json" },
    prohibitedOutputs: ["scores", "participant assessments", "Overall Commentary", "AI Extension"]
  };
}

export function makeProposalSchema(packet) {
  const routeSchema = closedObject({
    routeId: string(), side: string({ enum: ["pro", "con"] }), description: string({ minLength: 40 }), successCriteria: string({ minLength: 40 }),
    bridges: { type: "array", minItems: 5, maxItems: 5, items: closedObject({ bridgeId: string(), tier: string({ enum: ["motion", "central", "subsidiary"] }), description: string({ minLength: 30 }) }) }
  });
  const moveSchema = closedObject({
    moveId: string(), startEvent: integer({ minimum: 0, maximum: packet.eventCount - 1 }), endEvent: integer({ minimum: 0, maximum: packet.eventCount - 1 }),
    speaker: string({ enum: [...packet.sides.pro.speakers, ...packet.sides.con.speakers] }), side: string({ enum: ["pro", "con"] }), proposition: string({ minLength: 30 }),
    attributionConfidence: string({ enum: ["high", "medium", "low"] }), attributionBasis: string({ minLength: 40 }), provisionalBurdenContact: contactSchema(), selectionRationale: string({ minLength: 80 })
  });
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v38-source-proposal-${packet.debateNumber}`,
    ...closedObject({
      schemaVersion: string({ const: "3.8-source-proposal-output" }), debateNumber: string({ const: packet.debateNumber }), debateId: string({ const: packet.debateId }), reviewerRole: string({ const: "proposal" }),
      routes: { type: "array", minItems: 2, maxItems: 2, items: routeSchema }, moves: { type: "array", minItems: 8, maxItems: 8, items: moveSchema }
    })
  };
}

export function routeBridgeMap(proposal) {
  return new Map(proposal.routes.flatMap((route) => route.bridges.map((bridge) => [bridge.bridgeId, { ...bridge, side: route.side, routeId: route.routeId }])));
}

export function contactToTuple(contact, proposal) {
  if (contact === null) return null;
  const route = proposal.routes.find((item) => item.side === contact.targetSide);
  assert(route, "contact target route absent");
  const candidates = route.bridges.filter((item) => item.tier === contact.tier);
  const bridge = candidates[contact.bridgeIndex];
  assert(bridge, `contact bridge coordinate absent: ${contact.targetSide}.${contact.tier}.${contact.bridgeIndex}`);
  return { polarity: contact.polarity, tier: contact.tier, bridgeId: bridge.bridgeId };
}

export function validateProposalOutput(output, packet, schema, events) {
  validateSchemaValue(validateClosedSchema(schema), output, `proposal.${packet.debateNumber}`);
  assert(output.schemaVersion === "3.8-source-proposal-output" && output.debateNumber === packet.debateNumber && output.debateId === packet.debateId && output.reviewerRole === "proposal", "proposal identity invalid");
  assert(output.routes.length === 2 && output.moves.length === 8 && !containsScoreField(output), "proposal count or score prohibition invalid");
  const sides = output.routes.map((item) => item.side).sort();
  assert(canonicalJson(sides) === canonicalJson(["con", "pro"]), "proposal must contain one route per side");
  for (const route of output.routes) {
    assert(route.routeId === packet.routeIdentities[route.side].routeId, `${route.side}: route ID invalid`);
    assert(route.description.trim().length >= 40 && route.successCriteria.trim().length >= 40, `${route.side}: route text too short`);
    assert(route.bridges.length === 5 && new Set(route.bridges.map((item) => item.bridgeId)).size === 5, `${route.side}: bridge count or identity duplication invalid`);
    const expected = [
      { tier: "motion", bridgeId: packet.routeIdentities[route.side].bridgeIds.motion },
      { tier: "central", bridgeId: packet.routeIdentities[route.side].bridgeIds.central },
      ...packet.routeIdentities[route.side].bridgeIds.subsidiary.map((id) => ({ tier: "subsidiary", bridgeId: id }))
    ];
    for (let index = 0; index < expected.length; index += 1) {
      assert(route.bridges[index].tier === expected[index].tier && route.bridges[index].bridgeId === expected[index].bridgeId, `${route.side}: bridge order or ID invalid at ${index}`);
      assert(route.bridges[index].description.trim().length >= 30, `${route.side}: bridge description too short`);
    }
  }
  const speakersBySide = Object.fromEntries(["pro", "con"].map((side) => [side, new Set(packet.sides[side].speakers)]));
  const moveIds = output.moves.map((item) => item.moveId);
  assert(new Set(moveIds).size === 8, "proposal move IDs not unique");
  const quartiles = new Set();
  for (let index = 0; index < output.moves.length; index += 1) {
    const move = output.moves[index], expectedId = `${packet.debateId}-candidate-${String(index + 1).padStart(2, "0")}`;
    assert(move.moveId === expectedId, `${expectedId}: move ID or order invalid`);
    assert(speakersBySide[move.side].has(move.speaker), `${move.moveId}: speaker-side mismatch`);
    assert(move.startEvent >= 0 && move.endEvent < events.length && move.startEvent <= move.endEvent, `${move.moveId}: event range invalid`);
    const excerpt = eventExcerpt(events, move.startEvent, move.endEvent), words = normalizeWords(excerpt).length;
    assert(words >= 25 && words <= 180, `${move.moveId}: excerpt must contain 25-180 normalized words; found ${words}`);
    const startMs = events[move.startEvent].startMs, endMs = events[move.endEvent].startMs + events[move.endEvent].durationMs;
    assert(endMs > startMs && endMs - startMs <= 120000, `${move.moveId}: event span duration invalid`);
    quartiles.add(Math.min(3, Math.floor((startMs / (packet.durationSeconds * 1000)) * 4)));
    contactToTuple(move.provisionalBurdenContact, output);
    assert(move.proposition.trim().length >= 30 && move.attributionBasis.trim().length >= 40 && move.selectionRationale.trim().length >= 80, `${move.moveId}: explanatory text too short`);
  }
  assert(output.moves.filter((item) => item.side === "pro").length === 4 && output.moves.filter((item) => item.side === "con").length === 4, "proposal must contain four moves per side");
  assert(quartiles.size >= 3, "proposal moves must span at least three time quartiles");
  const contacts = output.moves.map((item) => item.provisionalBurdenContact);
  assert(contacts.filter((item) => item === null).length >= 2, "proposal needs at least two provisional no-contact moves");
  assert(contacts.filter((item) => item?.polarity === "support").length >= 2, "proposal needs at least two provisional supports");
  assert(contacts.filter((item) => item?.polarity === "attack").length >= 2, "proposal needs at least two provisional attacks");
  assert(contacts.some((item) => item?.tier === "motion") && contacts.some((item) => item?.tier === "central") && contacts.filter((item) => item?.tier === "subsidiary").length >= 2, "proposal tier diversity invalid");
  return output;
}

export function makeReviewPacket(packet, proposal, events) {
  return {
    schemaVersion: "3.8-source-review-packet",
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    motion: packet.motion,
    sides: packet.sides,
    routes: proposal.routes,
    candidates: proposal.moves.map((move) => ({
      moveId: move.moveId,
      sourceSpan: {
        startEvent: move.startEvent,
        endEvent: move.endEvent,
        startMs: events[move.startEvent].startMs,
        endMs: events[move.endEvent].startMs + events[move.endEvent].durationMs
      },
      atomicExcerpt: eventExcerpt(events, move.startEvent, move.endEvent),
      contextWindow: contextExcerpt(events, move.startEvent, move.endEvent)
    })),
    sourceFilesInContext: packet.sourceFilesInContext,
    hiddenProposalFields: ["speaker", "side", "proposition", "attributionConfidence", "attributionBasis", "provisionalBurdenContact", "selectionRationale"],
    prohibitedOutputs: packet.prohibitedOutputs
  };
}

export function makeReviewSchema(packet, reviewPacket) {
  const routeReviewSchema = closedObject({ side: string({ enum: ["pro", "con"] }), routeAccepted: { type: "boolean" }, routeRationale: string({ minLength: 80 }), bridgeReviews: { type: "array", minItems: 5, maxItems: 5, items: closedObject({ bridgeId: string(), accepted: { type: "boolean" }, rationale: string({ minLength: 60 }) }) } });
  const moveReviewSchema = closedObject({ moveId: string({ enum: reviewPacket.candidates.map((item) => item.moveId) }), candidateValid: { type: "boolean" }, speaker: string({ enum: [...packet.sides.pro.speakers, ...packet.sides.con.speakers] }), side: string({ enum: ["pro", "con"] }), attributionConfidence: string({ enum: ["high", "medium", "low"] }), attributionBasis: string({ minLength: 40 }), provisionalBurdenContact: contactSchema(), rationale: string({ minLength: 100 }) });
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v38-source-review-${packet.debateNumber}`,
    ...closedObject({ schemaVersion: string({ const: "3.8-source-review-output" }), debateNumber: string({ const: packet.debateNumber }), debateId: string({ const: packet.debateId }), reviewerRole: string({ const: "review" }), routeReviews: { type: "array", minItems: 2, maxItems: 2, items: routeReviewSchema }, moveReviews: { type: "array", minItems: 8, maxItems: 8, items: moveReviewSchema } })
  };
}

export function validateReviewOutput(output, packet, proposal, reviewPacket, schema) {
  validateSchemaValue(validateClosedSchema(schema), output, `review.${packet.debateNumber}`);
  assert(output.schemaVersion === "3.8-source-review-output" && output.debateNumber === packet.debateNumber && output.debateId === packet.debateId && output.reviewerRole === "review", "review identity invalid");
  assert(output.routeReviews.length === 2 && output.moveReviews.length === 8 && !containsScoreField(output), "review count or score prohibition invalid");
  for (let index = 0; index < proposal.routes.length; index += 1) {
    const route = proposal.routes[index], review = output.routeReviews[index];
    assert(review.side === route.side && review.routeRationale.trim().length >= 80 && review.bridgeReviews.length === 5, `${route.side}: route review identity invalid`);
    for (let bridgeIndex = 0; bridgeIndex < route.bridges.length; bridgeIndex += 1) {
      assert(review.bridgeReviews[bridgeIndex].bridgeId === route.bridges[bridgeIndex].bridgeId && review.bridgeReviews[bridgeIndex].rationale.trim().length >= 60, `${route.side}: bridge review invalid at ${bridgeIndex}`);
    }
  }
  for (let index = 0; index < reviewPacket.candidates.length; index += 1) {
    const candidate = reviewPacket.candidates[index], review = output.moveReviews[index];
    assert(review.moveId === candidate.moveId && review.rationale.trim().length >= 100 && review.attributionBasis.trim().length >= 40, `${candidate.moveId}: move review invalid`);
    assert(packet.sides[review.side].speakers.includes(review.speaker), `${candidate.moveId}: reviewed speaker-side mismatch`);
    contactToTuple(review.provisionalBurdenContact, proposal);
  }
  return output;
}

export { assert, canonicalJson };
