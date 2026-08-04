#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { V382_TRANSPORT_FIXTURE, assert } from "./lib/v382-source-preparation.mjs";
import { parseStructuredStreamRetries, validateStructuredStreamRetries } from "./lib/v382-source-transport.mjs";

const shouldWrite = process.argv.includes("--write");
const falsePositiveCases = [
  "A same-request subscription-stream reconnection is recorded separately.",
  "We can presume to tell God how we should reason.",
  "The moderator resumes the exchange after the question.",
  "stream recovery and retrying stream are ordinary semantic phrases here."
];
const exactWarning = "2026-08-04T08:58:15.849538Z WARN codex_core::responses_retry: stream disconnected - retrying sampling request (1/5 in 181ms)... turn_id=019fcbd6-c20b-7280-8b58-d448de9e1494 retries=1 max_retries=5 sampling_error=stream disconnected before completion: WebSocket protocol error: Connection reset without closing handshake";
const ignoredWarning = "2026-08-04T08:58:15.849538Z INFO codex_core::responses_retry: stream disconnected - retrying sampling request (1/5 in 181ms)... turn_id=not-a-warning retries=1 max_retries=5";
for (const item of falsePositiveCases) assert(parseStructuredStreamRetries(item).length === 0, `semantic false positive: ${item}`);
assert(parseStructuredStreamRetries(ignoredWarning).length === 0, "non-WARN diagnostic must be ignored");
const events = validateStructuredStreamRetries(parseStructuredStreamRetries(`${falsePositiveCases.join("\n")}\n${exactWarning}\n${ignoredWarning}`));
assert(events.length === 1, "exact structured warning must produce one event");
assert(events[0].turnId === "019fcbd6-c20b-7280-8b58-d448de9e1494" && events[0].retryOrdinal === 1 && events[0].retryMaximum === 5, "structured warning fields invalid");

const fixture = {
  schemaVersion: "3.8.2-structured-retry-detector-fixture",
  status: "passed",
  detectorScope: "Anchored WARN lines emitted by codex_core::responses_retry only",
  semanticFalsePositiveCases: falsePositiveCases.map((text) => ({ text, parsedEvents: 0 })),
  ignoredDiagnosticCase: { text: ignoredWarning, parsedEvents: 0 },
  exactStructuredWarning: { text: exactWarning, parsedEvents: events },
  assertions: {
    ordinaryReconnectionIgnored: true,
    presumeSubstringIgnored: true,
    resumesSubstringIgnored: true,
    semanticStreamPhrasesIgnored: true,
    nonWarningDiagnosticIgnored: true,
    exactWarningParsedOnce: true,
    turnIdAndRetryCountersParsed: true
  }
};
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(V382_TRANSPORT_FIXTURE)), { recursive: true });
  await writeFile(path.resolve(V382_TRANSPORT_FIXTURE), `${JSON.stringify(fixture, null, 2)}\n`);
}
console.log(JSON.stringify({ status: "passed", semanticFalsePositives: 0, structuredEvents: events.length, fixtureWritten: shouldWrite }, null, 2));
