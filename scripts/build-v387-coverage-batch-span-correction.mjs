#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert } from "./lib/v384-coverage-preparation.mjs";
import { eventExcerpt, normalizeWords } from "./lib/v381-source-preparation.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const base = "docs/calibration/v3.8.7/coverage-batch-span-correction";
const rawPath = "docs/calibration/v3.8.5/coverage-transport-amendment/raw-output.json";
const auditPath = `${base}/exhaustive-preflight.json`;
const eventsPath = ".assessment-cache/captions/9JVRy7bR7zI/events.json";
const packetPath = `${base}/correction-packet.json`;
const schemaPath = `${base}/correction-schema.json`;
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const [raw, audit, events] = await Promise.all([readJson(rawPath), readJson(auditPath), readJson(eventsPath)]);
const targetRefs = ["addition-01", "addition-02", "addition-03", "addition-07"];
assert(audit.issueCount === 4 && audit.issues.every((item, index) => item.code === "span-word-count" && item.ref === targetRefs[index]), "exhaustive preflight target set invalid");
const targets = targetRefs.map((ref) => {
  const move = raw.additions.find((item) => item.localRef === ref);
  const originalWordCount = normalizeWords(eventExcerpt(events, move.startEvent, move.endEvent)).length;
  const windowStart = Math.max(0, move.startEvent - 8);
  const windowEnd = Math.min(events.length - 1, move.endEvent + 8);
  return {
    localRef: ref, speaker: move.speaker, side: move.side, proposition: move.proposition,
    attributionBasis: move.attributionBasis, selectionRole: move.selectionRole, moveKind: move.moveKind,
    respondsToRefs: move.respondsToRefs, rationale: move.rationale,
    originalStartEvent: move.startEvent, originalEndEvent: move.endEvent, originalWordCount,
    requiredMinimumWords: 20, requiredMaximumWords: 220, requiredMaximumDurationMs: 150000,
    eventWindow: events.slice(windowStart, windowEnd + 1).map((event, offset) => ({ event: windowStart + offset, startMs: event.startMs, endMs: event.startMs + event.durationMs, text: event.text }))
  };
});
const packet = {
  schemaVersion: "3.8.7-coverage-batch-span-correction-packet", protocolId: "v3.8.7-coverage-batch-span-correction",
  debateNumber: raw.debateNumber, debateId: raw.debateId, targetRefs, targets,
  correctionPolicy: { coordinatesOnly: true, everyTargetRequiredInFixedOrder: true, mustRemainWithinEachOriginalSpan: true, semanticFieldsImmutable: true, chooseSmallestCoherentSpanThatSupportsEachImmutableProposition: true, scoresAndAssessmentProseProhibited: true }
};
const string = (extra = {}) => ({ type: "string", ...extra });
const integer = (extra = {}) => ({ type: "integer", ...extra });
const correction = { type: "object", additionalProperties: false, required: ["targetLocalRef", "startEvent", "endEvent", "rationale"], properties: { targetLocalRef: string({ enum: targetRefs }), startEvent: integer({ minimum: 0, maximum: events.length - 1 }), endEvent: integer({ minimum: 0, maximum: events.length - 1 }), rationale: string({ minLength: 80 }) } };
const schema = { $schema: "https://json-schema.org/draft/2020-12/schema", $id: "slugfester-v387-coverage-batch-span-correction-161", type: "object", additionalProperties: false, required: ["schemaVersion", "debateNumber", "corrections"], properties: { schemaVersion: string({ const: "3.8.7-coverage-batch-span-correction-output" }), debateNumber: string({ const: "161" }), corrections: { type: "array", minItems: 4, maxItems: 4, items: correction } } };
if (shouldWrite) { await mkdir(path.resolve(root, base), { recursive: true }); await writeFile(path.resolve(root, packetPath), `${JSON.stringify(packet, null, 2)}\n`); await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(schema, null, 2)}\n`); }
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", packet: packetPath, schema: schemaPath, targetRefs, originalWordCounts: Object.fromEntries(targets.map((target) => [target.localRef, target.originalWordCount])), modelContextsExecuted: 0 }, null, 2));
