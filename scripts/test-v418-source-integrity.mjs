#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { readJson } from "./lib/v41-lean-production.mjs";
import {
  V418_OUTPUT_VERSION,
  V418_PACKET_VERSION,
  V418_PROTOCOL_ID,
  compileV418PrimaryOutput,
  lexicalTokens,
  makeV418PrimarySchema,
  validateV418PrimaryOutput
} from "./lib/v418-source-integrity.mjs";

const [oldPacket, oldOutput] = await Promise.all([
  readJson("docs/calibration/v4.1.7/fresh-six-gate/packets/debate-37.json"),
  readJson("docs/calibration/v4.1.7/fresh-six-gate/primary-outputs/debate-37.json")
]);
const packet = { ...oldPacket, schemaVersion: V418_PACKET_VERSION, protocolId: V418_PROTOCOL_ID };
const stripTimes = (move) => {
  const { startMs, endMs, ...sourceSpan } = move.sourceSpan;
  return { ...move, sourceSpan };
};
const output = {
  ...oldOutput,
  schemaVersion: V418_OUTPUT_VERSION,
  protocolId: V418_PROTOCOL_ID,
  sections: oldOutput.sections.map((section) => ({
    ...section,
    proMoves: section.proMoves.map(stripTimes),
    conMoves: section.conMoves.map(stripTimes)
  }))
};
const eventsBytes = await readFile(packet.sourceChain.eventsPath);
const events = JSON.parse(eventsBytes);
const normalizedEvents = Array.isArray(events) ? events : events.events;

const schema = makeV418PrimarySchema();
const spanSchema = schema.properties.sections.items.properties.proMoves.items.properties.sourceSpan;
assert.deepEqual(spanSchema.required, ["startEvent", "endEvent", "excerpt"]);
assert.equal("startMs" in spanSchema.properties, false);
assert.equal("endMs" in spanSchema.properties, false);

const validation = validateV418PrimaryOutput(output, packet, events, eventsBytes);
assert.equal(validation.status, "passed");
assert.equal(validation.sourceSpanIntegrity.repositoryOwnedTimes, true);
const compiled = compileV418PrimaryOutput(output, packet, events);
const rawMove = output.sections[0].proMoves[0];
const compiledMove = compiled.sections[0].proMoves[0];
assert.equal("startMs" in rawMove.sourceSpan, false);
assert.equal(compiledMove.sourceSpan.startMs, normalizedEvents[compiledMove.sourceSpan.startEvent].startMs);
assert.equal(compiledMove.sourceSpan.endMs, Math.min(Math.round(packet.durationSeconds * 1000), normalizedEvents[compiledMove.sourceSpan.endEvent].startMs + normalizedEvents[compiledMove.sourceSpan.endEvent].durationMs));

const wrongExcerpt = structuredClone(output);
wrongExcerpt.sections[0].proMoves[0].sourceSpan.excerpt = "This unrelated synthetic sentence supplies twelve tokens but appears nowhere inside the declared event range at all.";
assert.throws(() => validateV418PrimaryOutput(wrongExcerpt, packet, events, eventsBytes), /lexical recall/);

const wrongSpan = structuredClone(output);
const constructive = wrongSpan.sections.flatMap((section) => [...section.proMoves, ...section.conMoves]).find((move) => move.moveKind === "constructive" && move.sourceSpan.startEvent > 2);
constructive.sourceSpan.startEvent = 0;
constructive.sourceSpan.endEvent = 2;
assert.throws(() => validateV418PrimaryOutput(wrongSpan, packet, events, eventsBytes));

const truncation = structuredClone(output);
const trimmable = truncation.sections.flatMap((section) => [...section.proMoves, ...section.conMoves]).find((move) => move.moveKind === "constructive" && move.sourceSpan.endEvent > move.sourceSpan.startEvent + 2);
assert.ok(trimmable);
trimmable.sourceSpan.endEvent = trimmable.sourceSpan.startEvent;
assert.throws(() => validateV418PrimaryOutput(truncation, packet, events, eventsBytes), /lexical recall|ordered coverage/);

const shuffled = structuredClone(output);
const shuffledMove = shuffled.sections[0].proMoves[0];
shuffledMove.sourceSpan.excerpt = lexicalTokens(shuffledMove.sourceSpan.excerpt).reverse().join(" ");
assert.throws(() => validateV418PrimaryOutput(shuffled, packet, events, eventsBytes), /ordered coverage/);

const modelSuppliedTimes = structuredClone(output);
modelSuppliedTimes.sections[0].proMoves[0].sourceSpan.startMs = 0;
modelSuppliedTimes.sections[0].proMoves[0].sourceSpan.endMs = 1;
assert.throws(() => validateV418PrimaryOutput(modelSuppliedTimes, packet, events, eventsBytes), /keys must be/);

const changedBytes = Buffer.concat([eventsBytes, Buffer.from("\n")]);
assert.throws(() => validateV418PrimaryOutput(output, packet, events, changedBytes), /event file hash mismatch/);

console.log(JSON.stringify({
  status: "passed",
  baselineMoves: validation.moves,
  eventHashVerified: true,
  repositoryOwnedTimesVerified: true,
  mutationsRejected: ["wrong-excerpt", "wrong-span", "truncated-span", "shuffled-excerpt", "model-supplied-times", "event-hash"],
  modelContextsExecuted: 0,
  meteredApiCostUsd: 0
}, null, 2));
