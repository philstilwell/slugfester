import { readFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./v37-retired-semantic.mjs";
import { assert, canonicalJson, contactToTuple, eventExcerpt, contextExcerpt } from "./v38-source-preparation.mjs";
import { validateClosedSchema, validateSchemaValue } from "./v36-decision-cards.mjs";

export const V38_SOURCE_EXECUTION_MANIFEST = "docs/calibration/v3.8/held-out-burden-contact-integration-gate/source-execution-manifest.json";
export const readSourceJson = async (root, file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const same = (left, right) => canonicalJson(left) === canonicalJson(right);

function subjectContext(field, proposal, reviewPacket) {
  if (field.subjectType === "route") return { motion: reviewPacket.motion, route: proposal.routes.find((item) => item.side === field.subjectId) };
  if (field.subjectType === "bridge") {
    const route = proposal.routes.find((item) => item.bridges.some((bridge) => bridge.bridgeId === field.subjectId));
    return { motion: reviewPacket.motion, route: { routeId: route.routeId, side: route.side, description: route.description, successCriteria: route.successCriteria }, bridge: route.bridges.find((item) => item.bridgeId === field.subjectId) };
  }
  const candidate = reviewPacket.candidates.find((item) => item.moveId === field.subjectId);
  return { motion: reviewPacket.motion, routes: proposal.routes, candidate };
}

export function compareSourceProposalAndReview(proposal, review, reviewPacket) {
  assert(proposal.debateNumber === review.debateNumber && proposal.debateId === review.debateId, "source comparison identity mismatch");
  const fields = [];
  for (let routeIndex = 0; routeIndex < proposal.routes.length; routeIndex += 1) {
    const route = proposal.routes[routeIndex], routeReview = review.routeReviews[routeIndex];
    fields.push({ fieldId: `route:${route.side}:valid`, subjectType: "route", subjectId: route.side, fieldName: "valid", proposalValue: true, reviewValue: routeReview.routeAccepted });
    for (let bridgeIndex = 0; bridgeIndex < route.bridges.length; bridgeIndex += 1) {
      const bridge = route.bridges[bridgeIndex], bridgeReview = routeReview.bridgeReviews[bridgeIndex];
      fields.push({ fieldId: `bridge:${bridge.bridgeId}:valid`, subjectType: "bridge", subjectId: bridge.bridgeId, fieldName: "valid", proposalValue: true, reviewValue: bridgeReview.accepted });
    }
  }
  for (let moveIndex = 0; moveIndex < proposal.moves.length; moveIndex += 1) {
    const move = proposal.moves[moveIndex], moveReview = review.moveReviews[moveIndex];
    fields.push(
      { fieldId: `move:${move.moveId}:valid`, subjectType: "move", subjectId: move.moveId, fieldName: "valid", proposalValue: true, reviewValue: moveReview.candidateValid },
      { fieldId: `move:${move.moveId}:speakerSide`, subjectType: "move", subjectId: move.moveId, fieldName: "speakerSide", proposalValue: { speaker: move.speaker, side: move.side }, reviewValue: { speaker: moveReview.speaker, side: moveReview.side } },
      { fieldId: `move:${move.moveId}:attributionConfidence`, subjectType: "move", subjectId: move.moveId, fieldName: "attributionConfidence", proposalValue: move.attributionConfidence, reviewValue: moveReview.attributionConfidence },
      { fieldId: `move:${move.moveId}:provisionalBurdenContact`, subjectType: "move", subjectId: move.moveId, fieldName: "provisionalBurdenContact", proposalValue: contactToTuple(move.provisionalBurdenContact, proposal), reviewValue: contactToTuple(moveReview.provisionalBurdenContact, proposal) }
    );
  }
  return fields.map((field) => ({ ...field, agreed: same(field.proposalValue, field.reviewValue), context: subjectContext(field, proposal, reviewPacket) }));
}

export function makeSourceAdjudicationArtifacts(debateNumber, debateId, comparisons, rotationSeed = 0) {
  const disputes = comparisons.filter((item) => !item.agreed);
  const map = { schemaVersion: "3.8-source-adjudication-option-map", debateNumber, debateId, fields: [] };
  const disputedFields = disputes.map((dispute, index) => {
    const orderedValues = (rotationSeed + index) % 2 === 0 ? [dispute.proposalValue, dispute.reviewValue] : [dispute.reviewValue, dispute.proposalValue];
    const options = orderedValues.map((value, optionIndex) => ({ optionId: `option-${optionIndex + 1}`, value }));
    map.fields.push({ fieldId: dispute.fieldId, options });
    return { fieldId: dispute.fieldId, subjectType: dispute.subjectType, subjectId: dispute.subjectId, fieldName: dispute.fieldName, context: dispute.context, candidates: options };
  });
  const packet = { schemaVersion: "3.8-source-adjudication-packet", debateNumber, debateId, reviewerRole: "source-adjudication", disputedFields };
  const optionIds = ["option-1", "option-2"];
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v38-source-adjudication-${debateNumber}`,
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "debateNumber", "debateId", "reviewerRole", "fields"],
    properties: {
      schemaVersion: { type: "string", const: "3.8-source-adjudication-output" },
      debateNumber: { type: "string", const: debateNumber },
      debateId: { type: "string", const: debateId },
      reviewerRole: { type: "string", const: "source-adjudication" },
      fields: { type: "array", minItems: disputes.length, maxItems: disputes.length, items: { type: "object", additionalProperties: false, required: ["fieldId", "optionId", "rationale"], properties: { fieldId: { type: "string" }, optionId: { type: "string", enum: optionIds }, rationale: { type: "string", minLength: 100 } } } }
    }
  };
  return { packet, schema, map };
}

export function validateSourceAdjudicationOutput(output, packet, schema) {
  validateSchemaValue(validateClosedSchema(schema), output, `sourceAdjudication.${packet.debateNumber}`);
  assert(output.schemaVersion === "3.8-source-adjudication-output" && output.debateNumber === packet.debateNumber && output.debateId === packet.debateId && output.reviewerRole === "source-adjudication", "source adjudication identity invalid");
  assert(output.fields.length === packet.disputedFields.length && !containsScoreField(output), "source adjudication count or score prohibition invalid");
  for (let index = 0; index < packet.disputedFields.length; index += 1) {
    const expected = packet.disputedFields[index], actual = output.fields[index];
    assert(actual.fieldId === expected.fieldId && expected.candidates.some((item) => item.optionId === actual.optionId), `${expected.fieldId}: adjudication choice invalid`);
    assert(actual.rationale.trim().length >= 100, `${expected.fieldId}: adjudication rationale too short`);
  }
  return output;
}

export function adjudicatedSourceValue(map, fieldId, optionId) {
  const option = map.fields.find((item) => item.fieldId === fieldId)?.options.find((item) => item.optionId === optionId);
  assert(option, `${fieldId}.${optionId}: adjudication option missing`);
  return option.value;
}

export function resolveSourceFields(comparisons, adjudicationOutput, adjudicationMap) {
  const adjudicated = new Map((adjudicationOutput?.fields ?? []).map((item) => [item.fieldId, adjudicatedSourceValue(adjudicationMap, item.fieldId, item.optionId)]));
  return comparisons.map((field) => {
    const finalValue = field.agreed ? field.proposalValue : adjudicated.get(field.fieldId);
    assert(finalValue !== undefined, `${field.fieldId}: final value missing`);
    const votes = Number(same(finalValue, field.proposalValue)) + Number(same(finalValue, field.reviewValue)) + Number(!field.agreed && same(finalValue, adjudicated.get(field.fieldId)));
    assert(votes >= 2, `${field.fieldId}: two-vote resolution absent`);
    return { ...field, finalValue, finalVotes: votes };
  });
}

export function buildResolvedSourceDebate(packet, proposal, review, reviewPacket, resolvedFields, events) {
  const finalById = new Map(resolvedFields.map((item) => [item.fieldId, item]));
  const routes = proposal.routes.map((route) => ({
    ...route,
    accepted: finalById.get(`route:${route.side}:valid`).finalValue,
    bridges: route.bridges.map((bridge) => ({ ...bridge, accepted: finalById.get(`bridge:${bridge.bridgeId}:valid`).finalValue }))
  }));
  const moves = proposal.moves.map((move, index) => {
    const reviewMove = review.moveReviews[index];
    const speakerSide = finalById.get(`move:${move.moveId}:speakerSide`).finalValue;
    const confidenceField = finalById.get(`move:${move.moveId}:attributionConfidence`);
    const audioVerificationRequired = move.attributionConfidence !== "high" || reviewMove.attributionConfidence !== "high" || confidenceField.finalValue !== "high";
    const startMs = events[move.startEvent].startMs, endMs = events[move.endEvent].startMs + events[move.endEvent].durationMs;
    return {
      moveId: move.moveId,
      accepted: finalById.get(`move:${move.moveId}:valid`).finalValue,
      sourceSpan: { startEvent: move.startEvent, endEvent: move.endEvent, startMs, endMs },
      atomicExcerpt: eventExcerpt(events, move.startEvent, move.endEvent),
      contextWindow: contextExcerpt(events, move.startEvent, move.endEvent),
      proposition: move.proposition,
      speaker: speakerSide.speaker,
      side: speakerSide.side,
      attributionConfidence: confidenceField.finalValue,
      attributionBasis: { proposal: move.attributionBasis, review: reviewMove.attributionBasis },
      audioVerificationRequired,
      audioVerification: null,
      provisionalBurdenContact: finalById.get(`move:${move.moveId}:provisionalBurdenContact`).finalValue,
      provisionalLabelWarning: "AI source-preparation value used only for balanced case selection; hidden from classifiers and not a truth key."
    };
  });
  return { schemaVersion: "3.8-resolved-source-preparation", debateNumber: packet.debateNumber, debateId: packet.debateId, motion: packet.motion, sides: packet.sides, routes, moves };
}

function categoryKey(contact) { return contact === null ? "none" : contact.polarity; }
export function selectFinalMoves(resolvedDebate) {
  const acceptedBridgeIds = new Set(resolvedDebate.routes.filter((route) => route.accepted).flatMap((route) => route.bridges.filter((bridge) => bridge.accepted).map((bridge) => bridge.bridgeId)));
  const eligible = resolvedDebate.moves.filter((move) => move.accepted && !move.audioVerificationRequired && (move.provisionalBurdenContact === null || acceptedBridgeIds.has(move.provisionalBurdenContact.bridgeId)));
  const combinations = [];
  for (let a = 0; a < eligible.length; a += 1) for (let b = a + 1; b < eligible.length; b += 1) for (let c = b + 1; c < eligible.length; c += 1) for (let d = c + 1; d < eligible.length; d += 1) {
    const moves = [eligible[a], eligible[b], eligible[c], eligible[d]];
    if (moves.filter((item) => item.side === "pro").length !== 2 || moves.filter((item) => item.side === "con").length !== 2) continue;
    const categories = new Set(moves.map((item) => categoryKey(item.provisionalBurdenContact)));
    if (!["none", "support", "attack"].every((item) => categories.has(item))) continue;
    const tiers = new Set(moves.map((item) => item.provisionalBurdenContact?.tier).filter(Boolean));
    const times = moves.map((item) => item.sourceSpan.startMs);
    const tierScore = tiers.size;
    const spread = Math.max(...times) - Math.min(...times);
    combinations.push({ moves, tierScore, spread, key: moves.map((item) => item.moveId).join("|") });
  }
  combinations.sort((left, right) => right.tierScore - left.tierScore || right.spread - left.spread || left.key.localeCompare(right.key));
  return { eligibleMoveCount: eligible.length, selected: combinations[0]?.moves ?? [], combinationCount: combinations.length };
}
