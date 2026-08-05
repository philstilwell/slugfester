#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { readJson } from "./lib/v41-lean-production.mjs";
import {
  V419_EXCERPT_MAXIMUM_CHARACTERS,
  V419_OUTPUT_VERSION,
  V419_PACKET_VERSION,
  V419_PROTOCOL_ID,
  compileV419PrimaryOutput,
  makeV419PrimarySchema,
  validateV419PrimaryOutput
} from "./lib/v419-schema-bounded-source.mjs";

const [oldPacket, oldOutput] = await Promise.all([
  readJson("docs/calibration/v4.1.7/fresh-six-gate/packets/debate-37.json"),
  readJson("docs/calibration/v4.1.7/fresh-six-gate/primary-outputs/debate-37.json")
]);
const packet = { ...oldPacket, schemaVersion: V419_PACKET_VERSION, protocolId: V419_PROTOCOL_ID };
const stripTimes = (move) => {
  const { startMs, endMs, ...sourceSpan } = move.sourceSpan;
  return { ...move, sourceSpan };
};
const output = {
  ...oldOutput,
  schemaVersion: V419_OUTPUT_VERSION,
  protocolId: V419_PROTOCOL_ID,
  sections: oldOutput.sections.map((section) => ({ ...section, proMoves: section.proMoves.map(stripTimes), conMoves: section.conMoves.map(stripTimes) }))
};
const eventsBytes = await readFile(packet.sourceChain.eventsPath);
const eventsDocument = JSON.parse(eventsBytes);
const schema = makeV419PrimarySchema();
for (const sideKey of ["proMoves", "conMoves"]) {
  const span = schema.properties.sections.items.properties[sideKey].items.properties.sourceSpan;
  assert.equal(span.properties.excerpt.maxLength, V419_EXCERPT_MAXIMUM_CHARACTERS);
  assert.equal("startMs" in span.properties, false);
  assert.equal("endMs" in span.properties, false);
}
const validation = validateV419PrimaryOutput(output, packet, eventsDocument, eventsBytes);
assert.equal(validation.status, "passed");
const compiled = compileV419PrimaryOutput(output, packet, eventsDocument);
assert.equal("startMs" in output.sections[0].proMoves[0].sourceSpan, false);
assert.equal(Number.isInteger(compiled.sections[0].proMoves[0].sourceSpan.startMs), true);

const oversizedCharacters = structuredClone(output);
oversizedCharacters.sections[0].proMoves[0].sourceSpan.excerpt = "x".repeat(V419_EXCERPT_MAXIMUM_CHARACTERS + 1);
assert.throws(() => validateV419PrimaryOutput(oversizedCharacters, packet, eventsDocument, eventsBytes), /exceeds 600 characters/);

const oversizedTokens = structuredClone(output);
oversizedTokens.sections[0].proMoves[0].sourceSpan.excerpt = Array(101).fill("a").join(" ");
assert.throws(() => validateV419PrimaryOutput(oversizedTokens, packet, eventsDocument, eventsBytes), /token count outside 12\.\.100/);

const wrongExcerpt = structuredClone(output);
wrongExcerpt.sections[0].proMoves[0].sourceSpan.excerpt = "This unrelated synthetic sentence supplies twelve tokens but appears nowhere inside the declared event range at all.";
assert.throws(() => validateV419PrimaryOutput(wrongExcerpt, packet, eventsDocument, eventsBytes), /lexical recall/);

const modelTimes = structuredClone(output);
modelTimes.sections[0].proMoves[0].sourceSpan.startMs = 0;
assert.throws(() => validateV419PrimaryOutput(modelTimes, packet, eventsDocument, eventsBytes), /keys must be/);

console.log(JSON.stringify({
  status: "passed",
  baselineMoves: validation.moves,
  schemaMaximumCharacters: V419_EXCERPT_MAXIMUM_CHARACTERS,
  deterministicMaximumTokens: 100,
  repositoryOwnedTimesVerified: true,
  mutationsRejected: ["oversized-characters", "oversized-tokens", "wrong-excerpt", "model-supplied-times"],
  modelContextsExecuted: 0,
  meteredApiCostUsd: 0
}, null, 2));
