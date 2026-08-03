#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { COMPONENT_KINDS, evidenceMatches, validateComponentGraph } from "./lib/v27-derived-annotations.mjs";

const [inventoryArgument, gateArgument = "docs/calibration/v2.7/held-out-gates/gate-manifest.json"] = process.argv.slice(2);
if (!inventoryArgument) { console.error("Usage: node scripts/validate-v27-atomic-inventory.mjs <inventory.json> [gate.json]"); process.exit(1); }
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const exactKeys = (value, expected, label) => { assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be object`); assert(same(Object.keys(value).sort(), [...expected].sort()), `${label} keys differ`); };
const words = (value) => value.trim().split(/\s+/u).filter(Boolean).length;
const normalized = (value) => value.replace(/\s+/gu, " ").trim();
function assertExcerpt(events, span, excerpt, minimum, maximum, label) {
  assert(Number.isInteger(span.startMs) && Number.isInteger(span.endMs) && span.startMs >= 0 && span.endMs > span.startMs, `${label} invalid span`);
  assert(words(excerpt) >= minimum && words(excerpt) <= maximum, `${label} must contain ${minimum}-${maximum} words; found ${words(excerpt)}`);
  const local = events.filter((event) => event.startMs < span.endMs && event.startMs + event.durationMs > span.startMs).map((event) => event.text).join(" ");
  assert(normalized(local).includes(normalized(excerpt)), `${label} not exact within source events`);
}
function countBy(values) { const result = {}; for (const value of values) result[value] = (result[value] ?? 0) + 1; return result; }

const [inventoryText, gateText, schemaText] = await Promise.all([
  readFile(path.resolve(inventoryArgument), "utf8"),
  readFile(path.resolve(gateArgument), "utf8"),
  readFile(path.resolve("docs/calibration/v2.7/atomic-inventory-schema.json"), "utf8"),
]);
JSON.parse(schemaText);
const inventory = JSON.parse(inventoryText); const gate = JSON.parse(gateText);
const laneKey = inventory.lane === "dyadic" ? "dyadic" : inventory.lane === "multi-speaker" ? "multiSpeaker" : null;
assert(laneKey, "invalid lane"); const lane = gate.lanes?.[laneKey]; assert(lane, `gate missing ${laneKey} lane`);
const debate = lane.debates.find((item) => item.debateId === inventory.debateId); assert(debate, "debate not preregistered in lane");
exactKeys(inventory, ["schemaVersion", "workflowVersion", "rubricVersion", "gateId", "lane", "debateId", "debateNumber", "videoId", "motion", "sides", "burdenRoutes", "source", "inventoryProtocol", "moves", "audit"], "inventory");
assert(inventory.schemaVersion === "2.7-atomic-inventory" && inventory.workflowVersion === gate.workflowVersion && inventory.rubricVersion === gate.rubricVersion && inventory.gateId === lane.gateId && inventory.lane === lane.lane, "inventory version/lane mismatch");
assert(inventory.debateNumber === debate.number && inventory.videoId === debate.videoId && inventory.motion === debate.motion && same(inventory.sides, debate.sides), "inventory debate identity mismatch");
const speakers = [...inventory.sides.pro.speakers, ...inventory.sides.con.speakers]; assert(new Set(speakers).size === speakers.length, "speaker appears on both sides");
assert((inventory.lane === "dyadic" && speakers.length === 2 && inventory.sides.pro.speakers.length === 1 && inventory.sides.con.speakers.length === 1) || (inventory.lane === "multi-speaker" && [3, 4].includes(speakers.length)), "lane speaker-count mismatch");

exactKeys(inventory.source, ["transcriptPath", "transcriptSha256", "eventsPath", "eventsSha256", "manifestPath", "manifestSha256", "limitations"], "source");
const [transcriptText, eventsText, manifestText] = await Promise.all([inventory.source.transcriptPath, inventory.source.eventsPath, inventory.source.manifestPath].map((file) => readFile(path.resolve(file), "utf8")));
const events = JSON.parse(eventsText); const manifest = JSON.parse(manifestText);
assert(inventory.source.transcriptSha256 === sha256(transcriptText) && inventory.source.eventsSha256 === sha256(eventsText) && inventory.source.manifestSha256 === sha256(manifestText), "source hashes mismatch");
assert(manifest.videoId === inventory.videoId && manifest.transcriptSha256 === inventory.source.transcriptSha256 && manifest.normalizedEventsSha256 === inventory.source.eventsSha256, "source manifest chain mismatch");

const routes = new Map(); const bridges = new Map();
for (const [index, route] of inventory.burdenRoutes.entries()) {
  exactKeys(route, ["id", "side", "description", "successCriteria", "bridges"], `burdenRoutes[${index}]`); assert(!routes.has(route.id) && ["pro", "con"].includes(route.side), `invalid route ${route.id}`); routes.set(route.id, route);
  const tiers = new Set(); for (const bridge of route.bridges) { exactKeys(bridge, ["id", "tier", "description"], `bridge ${bridge.id}`); assert(!bridges.has(bridge.id), `duplicate bridge ${bridge.id}`); bridges.set(bridge.id, route.id); tiers.add(bridge.tier); }
  assert(["motion", "central", "subsidiary"].every((tier) => tiers.has(tier)), `${route.id} missing burden tier`);
}
exactKeys(inventory.inventoryProtocol, ["builtAt", "builderModel", "calibrationOnly", "legacyMaterialAccessed", "developmentExamplesAccessed", "singleSpeakerAtomicActs", "targetPacketsPrelocked", "burdenRoutesPrelocked", "componentGraphsPrelocked", "targetRecencyChecked", "targetSideLocked", "ownershipAdoptionChecked", "requiredIndependentSemanticReviews", "selectionStatement"], "inventoryProtocol");
const protocol = inventory.inventoryProtocol;
for (const key of ["calibrationOnly", "singleSpeakerAtomicActs", "targetPacketsPrelocked", "burdenRoutesPrelocked", "componentGraphsPrelocked", "targetRecencyChecked", "targetSideLocked", "ownershipAdoptionChecked"]) assert(protocol[key] === true, `protocol ${key} must be true`);
assert(protocol.builderModel === "5.6 Sol" && protocol.legacyMaterialAccessed === false && protocol.developmentExamplesAccessed === false, "protocol isolation failed");
assert(protocol.requiredIndependentSemanticReviews === (inventory.lane === "dyadic" ? 1 : 2), "lane review requirement mismatch");

const expectedMoveCount = inventory.lane === "dyadic" ? 12 : 16; const expectedResponsive = expectedMoveCount - 4;
assert(inventory.moves.length === expectedMoveCount, `lane requires ${expectedMoveCount} moves`);
const ids = new Set(); const targetIds = new Set(); let priorStart = -1;
const counts = { pro: 0, con: 0, constructive: 0, responsive: 0, proConstructive: 0, conConstructive: 0 };
const speakerMoves = []; const speakerConstructives = []; const speakerResponses = [];
for (const [index, move] of inventory.moves.entries()) {
  const label = `moves[${index}]`; exactKeys(move, ["moveId", "side", "speaker", "timestamp", "sourceSpan", "sourceExcerpt", "sourceExcerptSha256", "quoteKind", "speakerAttributionConfidence", "audioChecked", "audioVerification", "interactionMode", "targetPacket", "burdenPacket", "selectionRationale"], label);
  assert(!ids.has(move.moveId), `${label} duplicate moveId`); ids.add(move.moveId); assert(inventory.sides[move.side].speakers.includes(move.speaker), `${label} speaker not on side`); assert(move.sourceSpan.startMs >= priorStart, `${label} chronology violation`); priorStart = move.sourceSpan.startMs;
  assertExcerpt(events, move.sourceSpan, move.sourceExcerpt, 30, 90, `${label}.sourceExcerpt`); assert(move.sourceExcerptSha256 === sha256(move.sourceExcerpt) && move.selectionRationale.trim().length >= 40, `${label} source/rationale invalid`);
  if (move.speakerAttributionConfidence === "high" && !move.audioChecked) assert(move.quoteKind === "quote" && move.audioVerification === null, `${label} high-confidence source state invalid`);
  else assert(move.audioChecked === true && move.quoteKind === "audio-verified-quote" && move.audioVerification !== null, `${label} medium/low confidence requires audio verification`);
  if (move.audioVerification) { exactKeys(move.audioVerification, ["status", "path", "sha256", "resolvedSpeaker"], `${label}.audioVerification`); const bytes = await readFile(path.resolve(move.audioVerification.path)); assert(move.audioVerification.status === "verified" && move.audioVerification.sha256 === sha256(bytes) && move.audioVerification.resolvedSpeaker === move.speaker, `${label} audio verification mismatch`); }
  counts[move.side] += 1; counts[move.interactionMode] += 1; speakerMoves.push(move.speaker);
  if (move.interactionMode === "constructive") { counts[`${move.side}Constructive`] += 1; speakerConstructives.push(move.speaker); assert(move.targetPacket === null, `${label} constructive target must be null`); }
  else {
    speakerResponses.push(move.speaker); const target = move.targetPacket; assert(target, `${label} responsive target missing`);
    exactKeys(target, ["id", "targetSpeaker", "targetSide", "ownershipScope", "adoptionRecords", "sourceSpan", "sourceExcerpt", "sourceExcerptSha256", "claim", "targetRelationToMove", "interveningOpponentClaim", "exceptionRationale", "indispensableComponents", "selectionRationale"], `${label}.targetPacket`);
    assert(!targetIds.has(target.id), `${label} duplicate target id`); targetIds.add(target.id); const opponent = move.side === "pro" ? "con" : "pro";
    assert(target.targetSide === opponent && inventory.sides[opponent].speakers.includes(target.targetSpeaker) && target.sourceSpan.startMs < move.sourceSpan.startMs, `${label} target speaker/side/time invalid`);
    assertExcerpt(events, target.sourceSpan, target.sourceExcerpt, 15, 90, `${label}.targetExcerpt`); assert(target.sourceExcerptSha256 === sha256(target.sourceExcerpt), `${label} target digest mismatch`);
    if (target.targetRelationToMove === "immediate-opponent-claim") assert(target.interveningOpponentClaim === false && target.exceptionRationale === null, `${label} immediate target exception invalid`);
    else assert(target.targetRelationToMove === "earlier-load-bearing-claim" && target.interveningOpponentClaim === true && target.exceptionRationale?.trim().length >= 40, `${label} earlier target exception invalid`);
    if (target.ownershipScope === "speaker-only") assert(target.adoptionRecords.length === 0, `${label} speaker-only target has adoption records`);
    else {
      assert(inventory.lane === "multi-speaker" && target.adoptionRecords.length > 0, `${label} team adoption only allowed in multi-speaker lane`);
      for (const [adoptionIndex, adoption] of target.adoptionRecords.entries()) { const adoptionLabel = `${label}.adoptionRecords[${adoptionIndex}]`; exactKeys(adoption, ["adoptingSpeaker", "sourceSpan", "sourceExcerpt", "sourceExcerptSha256", "adoptionLanguage", "adoptionRationale"], adoptionLabel); assert(inventory.sides[opponent].speakers.includes(adoption.adoptingSpeaker) && adoption.adoptingSpeaker !== target.targetSpeaker, `${adoptionLabel} adopter invalid`); assert(adoption.sourceSpan.startMs >= target.sourceSpan.startMs && adoption.sourceSpan.endMs <= move.sourceSpan.startMs, `${adoptionLabel} chronology invalid`); assertExcerpt(events, adoption.sourceSpan, adoption.sourceExcerpt, 3, 90, `${adoptionLabel}.sourceExcerpt`); assert(adoption.sourceExcerptSha256 === sha256(adoption.sourceExcerpt) && evidenceMatches(adoption.sourceExcerpt, adoption.adoptionLanguage) && adoption.adoptionRationale.trim().length >= 40, `${adoptionLabel} evidence invalid`); }
    }
    for (const component of target.indispensableComponents) { exactKeys(component, ["id", "text", "kind", "dependsOn"], `${label}.component`); assert(COMPONENT_KINDS.includes(component.kind), `${label} component kind invalid`); }
    const graphErrors = validateComponentGraph(target.indispensableComponents); assert(graphErrors.length === 0, `${label} component graph invalid: ${graphErrors.join("; ")}`);
  }
  exactKeys(move.burdenPacket, ["primaryRouteId", "eligibleBridgeIds", "selectionRationale"], `${label}.burdenPacket`);
  if (move.burdenPacket.primaryRouteId === null) assert(move.burdenPacket.eligibleBridgeIds.length === 0, `${label} null route has bridges`);
  else { assert(routes.has(move.burdenPacket.primaryRouteId) && move.burdenPacket.eligibleBridgeIds.length > 0, `${label} burden route invalid`); for (const bridgeId of move.burdenPacket.eligibleBridgeIds) assert(bridges.get(bridgeId) === move.burdenPacket.primaryRouteId, `${label} bridge not eligible for route`); }
}
assert(counts.constructive === 4 && counts.responsive === expectedResponsive && counts.proConstructive === 2 && counts.conConstructive === 2, "constructive/responsive sampling failed");
assert(counts.pro >= (inventory.lane === "dyadic" ? 4 : 6) && counts.con >= (inventory.lane === "dyadic" ? 4 : 6), "side move minimum failed");
const moveCounts = countBy(speakerMoves); const constructiveCounts = countBy(speakerConstructives); const responseCounts = countBy(speakerResponses);
for (const speaker of speakers) { moveCounts[speaker] ??= 0; constructiveCounts[speaker] ??= 0; responseCounts[speaker] ??= 0; if (inventory.lane === "multi-speaker") assert(moveCounts[speaker] >= 3 && constructiveCounts[speaker] >= 1 && responseCounts[speaker] >= 2, `${speaker} fails multi-speaker sampling minimum`); }
exactKeys(inventory.audit, ["moveCount", "proMoveCount", "conMoveCount", "constructiveMoveCount", "responsiveMoveCount", "speakerMoveCounts", "speakerConstructiveCounts", "speakerResponsiveCounts", "atomicityViolations", "targetPacketViolations", "burdenRouteViolations", "componentGraphViolations", "componentOverlapViolations", "targetRecencyViolations", "targetSideViolations", "ownershipAdoptionViolations", "unresolvedSpeakerAttributions", "excludedCandidates"], "audit");
assert(inventory.audit.moveCount === expectedMoveCount && inventory.audit.proMoveCount === counts.pro && inventory.audit.conMoveCount === counts.con && inventory.audit.constructiveMoveCount === 4 && inventory.audit.responsiveMoveCount === expectedResponsive, "audit aggregate count mismatch");
assert(same(inventory.audit.speakerMoveCounts, moveCounts) && same(inventory.audit.speakerConstructiveCounts, constructiveCounts) && same(inventory.audit.speakerResponsiveCounts, responseCounts), "audit speaker counts mismatch");
for (const key of ["atomicityViolations", "targetPacketViolations", "burdenRouteViolations", "componentGraphViolations", "componentOverlapViolations", "targetRecencyViolations", "targetSideViolations", "ownershipAdoptionViolations", "unresolvedSpeakerAttributions"]) assert(inventory.audit[key] === 0, `${key} must be zero`);
console.log(JSON.stringify({ status: "passed", lane: inventory.lane, debateId: inventory.debateId, moveCount: expectedMoveCount, counts, speakerCounts: moveCounts, routeCount: routes.size, bridgeCount: bridges.size, inventorySha256: sha256(inventoryText) }, null, 2));
