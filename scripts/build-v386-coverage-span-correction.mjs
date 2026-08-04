#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert } from "./lib/v384-coverage-preparation.mjs";
import { eventExcerpt, normalizeWords } from "./lib/v381-source-preparation.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const base = "docs/calibration/v3.8.6/coverage-span-correction";
const rawPath = "docs/calibration/v3.8.5/coverage-transport-amendment/raw-output.json";
const packetPath = `${base}/correction-packet.json`;
const schemaPath = `${base}/correction-schema.json`;
const eventsPath = ".assessment-cache/captions/9JVRy7bR7zI/events.json";
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const [raw, events] = await Promise.all([readJson(rawPath), readJson(eventsPath)]);
const target = raw.additions.find((item) => item.localRef === "addition-01");
assert(target && target.startEvent === 280 && target.endEvent === 323, "unexpected correction target");
const originalWordCount = normalizeWords(eventExcerpt(events, target.startEvent, target.endEvent)).length;
assert(originalWordCount === 253, `expected 253-word failed span; found ${originalWordCount}`);
const windowStart = Math.max(0, target.startEvent - 8);
const windowEnd = Math.min(events.length - 1, target.endEvent + 8);
const packet = {
  schemaVersion: "3.8.6-coverage-span-correction-packet",
  protocolId: "v3.8.6-coverage-span-correction",
  debateNumber: raw.debateNumber,
  debateId: raw.debateId,
  target: {
    localRef: target.localRef, speaker: target.speaker, side: target.side,
    proposition: target.proposition, attributionBasis: target.attributionBasis,
    selectionRole: target.selectionRole, moveKind: target.moveKind,
    respondsToRefs: target.respondsToRefs, rationale: target.rationale,
    originalStartEvent: target.startEvent, originalEndEvent: target.endEvent,
    originalWordCount, requiredMinimumWords: 20, requiredMaximumWords: 220,
    requiredMaximumDurationMs: 150000
  },
  eventWindow: events.slice(windowStart, windowEnd + 1).map((event, offset) => ({
    event: windowStart + offset,
    startMs: event.startMs,
    endMs: event.startMs + event.durationMs,
    text: event.text
  })),
  correctionPolicy: {
    coordinatesOnly: true,
    mustRemainWithinOriginalSpan: true,
    semanticFieldsImmutable: true,
    chooseSmallestCoherentSpanThatSupportsImmutableProposition: true,
    scoresAndAssessmentProseProhibited: true
  }
};
const string = (extra = {}) => ({ type: "string", ...extra });
const integer = (extra = {}) => ({ type: "integer", ...extra });
const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "slugfester-v386-coverage-span-correction-161",
  type: "object", additionalProperties: false,
  required: ["schemaVersion", "debateNumber", "targetLocalRef", "startEvent", "endEvent", "rationale"],
  properties: {
    schemaVersion: string({ const: "3.8.6-coverage-span-correction-output" }),
    debateNumber: string({ const: "161" }),
    targetLocalRef: string({ const: "addition-01" }),
    startEvent: integer({ minimum: target.startEvent, maximum: target.endEvent }),
    endEvent: integer({ minimum: target.startEvent, maximum: target.endEvent }),
    rationale: string({ minLength: 80 })
  }
};
if (shouldWrite) {
  await mkdir(path.resolve(root, base), { recursive: true });
  await writeFile(path.resolve(root, packetPath), `${JSON.stringify(packet, null, 2)}\n`);
  await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(schema, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", packet: packetPath, schema: schemaPath, targetLocalRef: target.localRef, originalWordCount, eventWindowStart: windowStart, eventWindowEnd: windowEnd, modelContextsExecuted: 0 }, null, 2));
