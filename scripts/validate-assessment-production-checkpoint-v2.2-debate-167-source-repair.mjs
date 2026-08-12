#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";

const RECORD =
  "docs/assessment-production/source-repairs/debate-167-empty-event-normalization.json";
const record = JSON.parse(await readFile(RECORD, "utf8"));
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
assert.equal(record.status, "debate-167-empty-derived-event-repair-passed");
for (const [file, expected] of Object.entries(record.toolingHashes)) {
  assert.equal(
    sha256(await readFile(file)),
    expected,
    `${file}: source-repair tooling hash mismatch`
  );
}
const [eventsBytes, transcriptBytes, manifestBytes, rawBytes, productionBytes] =
  await Promise.all([
    readFile(record.sourceChainAfter.events.path),
    readFile(record.sourceChainAfter.transcript.path),
    readFile(record.sourceChainAfter.manifest.path),
    readFile(record.preservedSources.rawDiarizedChunks.path),
    readFile(record.preservedSources.frozenProductionManifest.path),
  ]);
const events = JSON.parse(eventsBytes);
const transcript = transcriptBytes.toString("utf8");
const manifest = JSON.parse(manifestBytes);
normalizeV418Events(events);
const transcriptLines = transcript.endsWith("\n")
  ? transcript.slice(0, -1).split("\n")
  : transcript.split("\n");
assert.equal(sha256(eventsBytes), record.sourceChainAfter.events.sha256);
assert.equal(events.length, record.sourceChainAfter.events.count);
assert.equal(
  sha256(transcriptBytes),
  record.sourceChainAfter.transcript.sha256
);
assert.equal(transcriptLines.length, record.sourceChainAfter.transcript.lines);
assert.equal(transcriptLines.length, events.length);
assert.equal(sha256(manifestBytes), record.sourceChainAfter.manifest.sha256);
assert.equal(manifest.normalizedEventsSha256, sha256(eventsBytes));
assert.equal(manifest.transcriptSha256, sha256(transcriptBytes));
assert.equal(manifest.eventCount, events.length);
assert.equal(
  sha256(rawBytes),
  record.preservedSources.rawDiarizedChunks.sha256
);
assert.equal(
  sha256(productionBytes),
  record.preservedSources.frozenProductionManifest.sha256
);
assert.equal(
  events.some(
    (event) =>
      typeof event.text !== "string" || event.text.trim().length === 0
  ),
  false
);
assert.equal(record.repair.attempts, 1);
assert.equal(record.repair.semanticContentRemoved, false);
assert.equal(record.authorization.selectionRecoveryPreparation, true);
assert.equal(record.authorization.replacementSelection, false);
assert.equal(record.authorization.modelExecution, false);
assert.equal(record.authorization.productionMutation, false);
console.log(
  JSON.stringify(
    {
      status: "passed",
      debateNumber: record.debateNumber,
      events: events.length,
      transcriptLines: transcriptLines.length,
      emptyEvents: 0,
      rawSourcePreserved: true,
      frozenProductionManifestPreserved: true,
      selectionRecoveryPreparationAuthorized: true,
    },
    null,
    2
  )
);
