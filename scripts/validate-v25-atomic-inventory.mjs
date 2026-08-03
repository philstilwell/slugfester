#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const [inventoryArgument, gateArgument = "docs/calibration/v2.5/held-out-gate/gate-manifest.json"] = process.argv.slice(2);
if (!inventoryArgument) { console.error("Usage: node scripts/validate-v25-atomic-inventory.mjs <inventory.json> [gate.json]"); process.exit(1); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function exactKeys(value, expected, label) { assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`); assert(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort()), `${label} keys differ from contract`); }
function wordCount(value) { return value.trim().split(/\s+/u).filter(Boolean).length; }
function normalized(value) { return value.replace(/\s+/gu, " ").trim(); }
function assertExcerpt(events, span, excerpt, minimum, maximum, label) {
  assert(Number.isInteger(span.startMs) && Number.isInteger(span.endMs) && span.startMs >= 0 && span.endMs > span.startMs, `${label} invalid span`);
  const count = wordCount(excerpt); assert(count >= minimum && count <= maximum, `${label} must contain ${minimum}-${maximum} words; found ${count}`);
  const local = events.filter((event) => event.startMs < span.endMs && event.startMs + event.durationMs > span.startMs).map((event) => event.text).join(" ");
  assert(normalized(local).includes(normalized(excerpt)), `${label} is not an exact normalized excerpt within its span`);
}

const [inventorySource, gateSource] = await Promise.all([readFile(path.resolve(inventoryArgument), "utf8"), readFile(path.resolve(gateArgument), "utf8")]);
const inventory = JSON.parse(inventorySource); const gate = JSON.parse(gateSource); const gateDebate = gate.sample.debates.find((item) => item.debateId === inventory.debateId); assert(gateDebate, "debate not preregistered");
exactKeys(inventory, ["schemaVersion", "workflowVersion", "rubricVersion", "gateId", "debateId", "debateNumber", "videoId", "motion", "sides", "burdenRoutes", "source", "inventoryProtocol", "moves", "audit"], "inventory");
assert(inventory.schemaVersion === "2.5-atomic-inventory" && inventory.workflowVersion === gate.workflowVersion && inventory.rubricVersion === gate.rubricVersion && inventory.gateId === gate.gateId, "inventory version mismatch");
assert(inventory.debateNumber === gateDebate.number && inventory.videoId === gateDebate.videoId && inventory.motion === gateDebate.motion && JSON.stringify(inventory.sides) === JSON.stringify(gateDebate.sides), "inventory identity mismatch");
exactKeys(inventory.source, ["transcriptPath", "transcriptSha256", "eventsPath", "eventsSha256", "manifestPath", "manifestSha256", "limitations"], "source");
const [transcriptSource, eventsSource, manifestSource] = await Promise.all([readFile(path.resolve(inventory.source.transcriptPath), "utf8"), readFile(path.resolve(inventory.source.eventsPath), "utf8"), readFile(path.resolve(inventory.source.manifestPath), "utf8")]);
const events = JSON.parse(eventsSource); const manifest = JSON.parse(manifestSource);
assert(inventory.source.transcriptSha256 === sha256(transcriptSource) && inventory.source.eventsSha256 === sha256(eventsSource) && inventory.source.manifestSha256 === sha256(manifestSource), "source hash mismatch");
assert(manifest.videoId === inventory.videoId && manifest.transcriptSha256 === inventory.source.transcriptSha256 && manifest.normalizedEventsSha256 === inventory.source.eventsSha256, "caption chain mismatch");

const routes = new Map(); const bridgeToRoute = new Map();
for (const [index, route] of inventory.burdenRoutes.entries()) {
  exactKeys(route, ["id", "side", "description", "successCriteria", "bridges"], `burdenRoutes[${index}]`); assert(!routes.has(route.id), `duplicate route ${route.id}`); routes.set(route.id, route);
  assert(["pro", "con"].includes(route.side) && route.description.trim().length >= 20 && route.successCriteria.trim().length >= 20, `invalid route ${route.id}`);
  const tiers = new Set();
  for (const [bridgeIndex, bridge] of route.bridges.entries()) {
    exactKeys(bridge, ["id", "tier", "description"], `burdenRoutes[${index}].bridges[${bridgeIndex}]`); assert(!bridgeToRoute.has(bridge.id), `duplicate bridge ${bridge.id}`); bridgeToRoute.set(bridge.id, route.id); tiers.add(bridge.tier);
    assert(["motion", "central", "subsidiary"].includes(bridge.tier) && bridge.description.trim().length >= 20, `invalid bridge ${bridge.id}`);
  }
  assert(["motion", "central", "subsidiary"].every((tier) => tiers.has(tier)), `${route.id} must contain all three tiers`);
}
assert([...routes.values()].some((item) => item.side === "pro") && [...routes.values()].some((item) => item.side === "con"), "each side needs a burden route");
exactKeys(inventory.inventoryProtocol, ["builtAt", "builderModel", "calibrationOnly", "legacyMaterialAccessed", "developmentExamplesAccessed", "singleSpeakerAtomicActs", "targetPacketsPrelocked", "burdenRoutesPrelocked", "selectionStatement"], "inventoryProtocol");
assert(!Number.isNaN(Date.parse(inventory.inventoryProtocol.builtAt)) && inventory.inventoryProtocol.builderModel === "5.6 Sol" && inventory.inventoryProtocol.calibrationOnly === true, "inventory protocol identity failed");
assert(inventory.inventoryProtocol.legacyMaterialAccessed === false && inventory.inventoryProtocol.developmentExamplesAccessed === false && inventory.inventoryProtocol.singleSpeakerAtomicActs === true && inventory.inventoryProtocol.targetPacketsPrelocked === true && inventory.inventoryProtocol.burdenRoutesPrelocked === true, "inventory isolation/protocol failed");

assert(inventory.moves.length === 12, "inventory must contain 12 moves"); const moveIds = new Set(); const targetIds = new Set(); const counts = { pro: 0, con: 0, constructive: 0, responsive: 0, proConstructive: 0, conConstructive: 0 }; let priorStart = -1;
for (const [index, move] of inventory.moves.entries()) {
  const label = `moves[${index}]`; exactKeys(move, ["moveId", "side", "speaker", "timestamp", "sourceSpan", "sourceExcerpt", "sourceExcerptSha256", "quoteKind", "speakerAttributionConfidence", "audioChecked", "audioVerification", "interactionMode", "targetPacket", "burdenPacket", "selectionRationale"], label);
  assert(!moveIds.has(move.moveId), `${label} duplicate moveId`); moveIds.add(move.moveId); assert(inventory.sides[move.side]?.speakers.includes(move.speaker), `${label} speaker/side mismatch`); assert(move.sourceSpan.startMs >= priorStart, `${label} out of order`); priorStart = move.sourceSpan.startMs;
  assertExcerpt(events, move.sourceSpan, move.sourceExcerpt, 30, 90, `${label}.sourceExcerpt`); assert(move.sourceExcerptSha256 === sha256(move.sourceExcerpt), `${label} excerpt hash mismatch`); assert(move.selectionRationale.trim().length >= 40, `${label} rationale too short`);
  if (move.speakerAttributionConfidence === "high") { if (move.audioChecked) assert(move.quoteKind === "audio-verified-quote" && move.audioVerification, `${label} checked audio missing`); else assert(move.quoteKind === "quote" && move.audioVerification === null, `${label} unchecked high confidence invalid`); }
  else assert(["medium", "low"].includes(move.speakerAttributionConfidence) && move.audioChecked === true && move.quoteKind === "audio-verified-quote" && move.audioVerification, `${label} medium/low requires verification`);
  if (move.audioVerification) { exactKeys(move.audioVerification, ["status", "path", "sha256", "resolvedSpeaker"], `${label}.audioVerification`); const bytes = await readFile(path.resolve(move.audioVerification.path)); assert(move.audioVerification.status === "verified" && move.audioVerification.sha256 === sha256(bytes) && move.audioVerification.resolvedSpeaker === move.speaker, `${label} audio verification mismatch`); }
  counts[move.side] += 1; counts[move.interactionMode] += 1;
  if (move.interactionMode === "constructive") { counts[`${move.side}Constructive`] += 1; assert(move.targetPacket === null, `${label} constructive target must be null`); }
  else {
    const target = move.targetPacket; assert(target, `${label} responsive target missing`); exactKeys(target, ["id", "targetSpeaker", "sourceSpan", "sourceExcerpt", "sourceExcerptSha256", "claim", "indispensableComponents", "selectionRationale"], `${label}.targetPacket`); assert(!targetIds.has(target.id), `${label} duplicate target id`); targetIds.add(target.id);
    const opponent = move.side === "pro" ? "con" : "pro"; assert(inventory.sides[opponent].speakers.includes(target.targetSpeaker), `${label} target is not opponent`); assert(target.sourceSpan.startMs < move.sourceSpan.startMs, `${label} target is not prior`); assertExcerpt(events, target.sourceSpan, target.sourceExcerpt, 15, 90, `${label}.targetPacket.sourceExcerpt`); assert(target.sourceExcerptSha256 === sha256(target.sourceExcerpt), `${label} target hash mismatch`);
    const componentIds = new Set(); for (const component of target.indispensableComponents) { exactKeys(component, ["id", "text"], `${label}.component`); assert(!componentIds.has(component.id), `${label} duplicate component`); componentIds.add(component.id); }
  }
  exactKeys(move.burdenPacket, ["primaryRouteId", "eligibleBridgeIds", "selectionRationale"], `${label}.burdenPacket`); assert(move.burdenPacket.selectionRationale.trim().length >= 40, `${label} burden rationale too short`);
  if (move.burdenPacket.primaryRouteId === null) assert(move.burdenPacket.eligibleBridgeIds.length === 0, `${label} null route must have no eligible bridges`);
  else { const route = routes.get(move.burdenPacket.primaryRouteId); assert(route, `${label} unknown route`); assert(move.burdenPacket.eligibleBridgeIds.length >= 1 && new Set(move.burdenPacket.eligibleBridgeIds).size === move.burdenPacket.eligibleBridgeIds.length, `${label} eligible bridges invalid`); for (const bridgeId of move.burdenPacket.eligibleBridgeIds) assert(bridgeToRoute.get(bridgeId) === route.id, `${label} bridge not in primary route`); }
}
assert(counts.pro >= 4 && counts.con >= 4 && counts.constructive === 4 && counts.responsive === 8 && counts.proConstructive === 2 && counts.conConstructive === 2, "move sampling counts failed");
exactKeys(inventory.audit, ["moveCount", "proMoveCount", "conMoveCount", "constructiveMoveCount", "responsiveMoveCount", "atomicityViolations", "targetPacketViolations", "burdenRouteViolations", "unresolvedSpeakerAttributions", "excludedCandidates"], "audit");
assert(inventory.audit.moveCount === 12 && inventory.audit.proMoveCount === counts.pro && inventory.audit.conMoveCount === counts.con && inventory.audit.constructiveMoveCount === counts.constructive && inventory.audit.responsiveMoveCount === counts.responsive, "audit counts mismatch");
assert(inventory.audit.atomicityViolations === 0 && inventory.audit.targetPacketViolations === 0 && inventory.audit.burdenRouteViolations === 0 && inventory.audit.unresolvedSpeakerAttributions === 0, "inventory hard gate failed");
console.log(JSON.stringify({ status: "passed", debateId: inventory.debateId, moveCount: 12, counts, routeCount: routes.size, bridgeCount: bridgeToRoute.size, inventorySha256: sha256(inventorySource) }, null, 2));
