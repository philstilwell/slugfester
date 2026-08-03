#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const [inventoryArgument, gateArgument = "docs/calibration/v2.4/held-out-gate/gate-manifest.json"] = process.argv.slice(2);
if (!inventoryArgument) {
  console.error("Usage: node scripts/validate-v24-atomic-inventory.mjs <inventory.json> [gate-manifest.json]");
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
function exactKeys(value, expected, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort()), `${label} keys differ from contract`);
}
function wordCount(value) {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}
function normalized(value) {
  return value.replace(/\s+/gu, " ").trim();
}
function assertExcerpt(events, span, excerpt, minimum, maximum, label) {
  assert(Number.isInteger(span.startMs) && Number.isInteger(span.endMs) && span.startMs >= 0 && span.endMs > span.startMs, `${label} invalid source span`);
  const count = wordCount(excerpt);
  assert(count >= minimum && count <= maximum, `${label} must contain ${minimum}-${maximum} words; found ${count}`);
  const local = events
    .filter((event) => event.startMs < span.endMs && event.startMs + event.durationMs > span.startMs)
    .map((event) => event.text)
    .join(" ");
  assert(normalized(local).includes(normalized(excerpt)), `${label} is not an exact normalized excerpt within its event span`);
}

const [inventorySource, gateSource] = await Promise.all([
  readFile(path.resolve(inventoryArgument), "utf8"),
  readFile(path.resolve(gateArgument), "utf8"),
]);
const inventory = JSON.parse(inventorySource);
const gate = JSON.parse(gateSource);
const gateDebate = gate.sample.debates.find((debate) => debate.debateId === inventory.debateId);
assert(gateDebate, "inventory debate is not in the preregistered sample");

exactKeys(inventory, ["schemaVersion", "workflowVersion", "rubricVersion", "gateId", "debateId", "debateNumber", "videoId", "motion", "sides", "burdens", "source", "inventoryProtocol", "moves", "audit"], "inventory");
assert(inventory.schemaVersion === "2.4-atomic-inventory", "schemaVersion mismatch");
assert(inventory.workflowVersion === gate.workflowVersion && inventory.rubricVersion === gate.rubricVersion && inventory.gateId === gate.gateId, "workflow, rubric, or gate mismatch");
assert(inventory.debateNumber === gateDebate.number && inventory.videoId === gateDebate.videoId && inventory.motion === gateDebate.motion, "debate identity mismatch");
assert(JSON.stringify(inventory.sides) === JSON.stringify(gateDebate.sides), "side mapping differs from manifest");

exactKeys(inventory.source, ["transcriptPath", "transcriptSha256", "eventsPath", "eventsSha256", "manifestPath", "manifestSha256", "limitations"], "source");
const [transcriptSource, eventsSource, manifestSource] = await Promise.all([
  readFile(path.resolve(inventory.source.transcriptPath), "utf8"),
  readFile(path.resolve(inventory.source.eventsPath), "utf8"),
  readFile(path.resolve(inventory.source.manifestPath), "utf8"),
]);
const events = JSON.parse(eventsSource);
const captionManifest = JSON.parse(manifestSource);
assert(inventory.source.transcriptSha256 === sha256(transcriptSource), "transcript hash mismatch");
assert(inventory.source.eventsSha256 === sha256(eventsSource), "events hash mismatch");
assert(inventory.source.manifestSha256 === sha256(manifestSource), "caption manifest hash mismatch");
assert(captionManifest.videoId === inventory.videoId && captionManifest.transcriptSha256 === inventory.source.transcriptSha256 && captionManifest.normalizedEventsSha256 === inventory.source.eventsSha256, "caption chain is inconsistent");

exactKeys(inventory.sides, ["pro", "con"], "sides");
for (const side of ["pro", "con"]) {
  exactKeys(inventory.sides[side], ["label", "speakers"], `sides.${side}`);
  assert(inventory.sides[side].speakers.length >= 1, `${side} needs a speaker`);
}

const burdenIds = new Set();
for (const [index, burden] of inventory.burdens.entries()) {
  exactKeys(burden, ["id", "side", "description", "successCriteria"], `burdens[${index}]`);
  assert(!burdenIds.has(burden.id), `duplicate burden ${burden.id}`);
  burdenIds.add(burden.id);
  assert(["pro", "con"].includes(burden.side) && burden.description.trim().length >= 20 && burden.successCriteria.trim().length >= 20, `invalid burden ${burden.id}`);
}
assert([...inventory.burdens].some((item) => item.side === "pro") && [...inventory.burdens].some((item) => item.side === "con"), "each side needs a burden");

exactKeys(inventory.inventoryProtocol, ["builtAt", "builderModel", "calibrationOnly", "legacyMaterialAccessed", "developmentExamplesAccessed", "singleSpeakerAtomicActs", "targetPacketsPrelocked", "burdenIdsPrelocked", "selectionStatement"], "inventoryProtocol");
assert(!Number.isNaN(Date.parse(inventory.inventoryProtocol.builtAt)), "builtAt is invalid");
assert(inventory.inventoryProtocol.builderModel === "5.6 Sol" && inventory.inventoryProtocol.calibrationOnly === true, "builder identity mismatch");
assert(inventory.inventoryProtocol.legacyMaterialAccessed === false && inventory.inventoryProtocol.developmentExamplesAccessed === false, "inventory builder accessed prohibited material");
assert(inventory.inventoryProtocol.singleSpeakerAtomicActs === true && inventory.inventoryProtocol.targetPacketsPrelocked === true && inventory.inventoryProtocol.burdenIdsPrelocked === true, "inventory protocol flags failed");
assert(inventory.inventoryProtocol.selectionStatement.trim().length >= 40, "selection statement too short");

assert(Array.isArray(inventory.moves) && inventory.moves.length === 12, "inventory must contain exactly 12 moves");
const moveIds = new Set();
const targetIds = new Set();
const counts = { pro: 0, con: 0, constructive: 0, responsive: 0, proConstructive: 0, conConstructive: 0 };
let priorStart = -1;
for (const [index, move] of inventory.moves.entries()) {
  const label = `moves[${index}]`;
  exactKeys(move, ["moveId", "side", "speaker", "timestamp", "sourceSpan", "sourceExcerpt", "sourceExcerptSha256", "quoteKind", "speakerAttributionConfidence", "audioChecked", "audioVerification", "burdenIds", "interactionMode", "targetPacket", "selectionRationale"], label);
  assert(!moveIds.has(move.moveId), `${label} duplicate moveId`);
  moveIds.add(move.moveId);
  assert(["pro", "con"].includes(move.side) && inventory.sides[move.side].speakers.includes(move.speaker), `${label} speaker/side mismatch`);
  assert(move.sourceSpan.startMs >= priorStart, `${label} is out of chronological order`);
  priorStart = move.sourceSpan.startMs;
  assertExcerpt(events, move.sourceSpan, move.sourceExcerpt, 30, 90, `${label}.sourceExcerpt`);
  assert(move.sourceExcerptSha256 === sha256(move.sourceExcerpt), `${label} sourceExcerpt hash mismatch`);
  assert(["constructive", "responsive"].includes(move.interactionMode), `${label} invalid interactionMode`);
  assert(move.selectionRationale.trim().length >= 40, `${label} selection rationale too short`);
  assert(Array.isArray(move.burdenIds) && move.burdenIds.length >= 1 && new Set(move.burdenIds).size === move.burdenIds.length, `${label} burdenIds invalid`);
  for (const burdenId of move.burdenIds) assert(burdenIds.has(burdenId), `${label} unknown burden ${burdenId}`);

  if (move.speakerAttributionConfidence === "high") {
    assert(move.quoteKind === "quote" || move.quoteKind === "audio-verified-quote", `${label} invalid quoteKind`);
    if (move.audioChecked) assert(move.quoteKind === "audio-verified-quote" && move.audioVerification, `${label} audioChecked needs verification`);
    else assert(move.quoteKind === "quote" && move.audioVerification === null, `${label} unchecked high-confidence move must have null audioVerification`);
  } else {
    assert(["medium", "low"].includes(move.speakerAttributionConfidence), `${label} invalid attribution confidence`);
    assert(move.audioChecked === true && move.quoteKind === "audio-verified-quote" && move.audioVerification, `${label} medium/low attribution requires audio verification`);
  }
  if (move.audioVerification) {
    exactKeys(move.audioVerification, ["status", "path", "sha256", "resolvedSpeaker"], `${label}.audioVerification`);
    const audioSource = await readFile(path.resolve(move.audioVerification.path));
    assert(move.audioVerification.status === "verified" && move.audioVerification.sha256 === sha256(audioSource) && move.audioVerification.resolvedSpeaker === move.speaker, `${label} audio verification mismatch`);
  }

  counts[move.side] += 1;
  counts[move.interactionMode] += 1;
  if (move.interactionMode === "constructive") {
    counts[`${move.side}Constructive`] += 1;
    assert(move.targetPacket === null, `${label} constructive move must not have a target`);
  } else {
    assert(move.targetPacket && typeof move.targetPacket === "object", `${label} responsive move requires a target packet`);
    const target = move.targetPacket;
    exactKeys(target, ["id", "targetSpeaker", "sourceSpan", "sourceExcerpt", "sourceExcerptSha256", "claim", "indispensableComponents", "selectionRationale"], `${label}.targetPacket`);
    assert(!targetIds.has(target.id), `${label} duplicate target packet id`);
    targetIds.add(target.id);
    const opponent = move.side === "pro" ? "con" : "pro";
    assert(inventory.sides[opponent].speakers.includes(target.targetSpeaker), `${label} targetSpeaker is not an opponent`);
    assert(target.sourceSpan.startMs < move.sourceSpan.startMs, `${label} target is not prior to the response`);
    assertExcerpt(events, target.sourceSpan, target.sourceExcerpt, 15, 90, `${label}.targetPacket.sourceExcerpt`);
    assert(target.sourceExcerptSha256 === sha256(target.sourceExcerpt), `${label} target excerpt hash mismatch`);
    assert(target.claim.trim().length >= 10 && target.selectionRationale.trim().length >= 40, `${label} target summary fields too short`);
    assert(Array.isArray(target.indispensableComponents) && target.indispensableComponents.length >= 1, `${label} target needs components`);
    const componentIds = new Set();
    for (const [componentIndex, component] of target.indispensableComponents.entries()) {
      exactKeys(component, ["id", "text"], `${label}.targetPacket.indispensableComponents[${componentIndex}]`);
      assert(!componentIds.has(component.id) && component.text.trim().length >= 5, `${label} target component invalid`);
      componentIds.add(component.id);
    }
  }
}

assert(counts.pro >= 4 && counts.con >= 4, "each side must have at least four moves");
assert(counts.constructive === 4 && counts.responsive === 8 && counts.proConstructive === 2 && counts.conConstructive === 2, "inventory mix must be two constructive moves per side and eight responsive moves");
exactKeys(inventory.audit, ["moveCount", "proMoveCount", "conMoveCount", "constructiveMoveCount", "responsiveMoveCount", "atomicityViolations", "targetPacketViolations", "unresolvedSpeakerAttributions", "excludedCandidates"], "audit");
assert(inventory.audit.moveCount === 12 && inventory.audit.proMoveCount === counts.pro && inventory.audit.conMoveCount === counts.con && inventory.audit.constructiveMoveCount === counts.constructive && inventory.audit.responsiveMoveCount === counts.responsive, "audit counts mismatch");
assert(inventory.audit.atomicityViolations === 0 && inventory.audit.targetPacketViolations === 0 && inventory.audit.unresolvedSpeakerAttributions === 0, "inventory hard-gate audit failed");
assert(Array.isArray(inventory.audit.excludedCandidates), "excludedCandidates must be an array");
for (const [index, item] of inventory.audit.excludedCandidates.entries()) {
  exactKeys(item, ["timestamp", "reason"], `audit.excludedCandidates[${index}]`);
  assert(item.reason.trim().length >= 10, `excludedCandidates[${index}] reason too short`);
}

console.log(JSON.stringify({ status: "passed", debateId: inventory.debateId, moveCount: 12, counts, inventorySha256: sha256(inventorySource) }, null, 2));
