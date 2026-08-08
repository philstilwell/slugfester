import { createHash } from "node:crypto";

import { normalizeV418Events } from "./v418-source-integrity.mjs";
import { assertV4 } from "./v4-lean-production.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const EVENT_KEYS = Object.freeze(["startMs", "durationMs", "text"]);

export function buildProductionCanarySourcePacket({
  debate,
  transcriptPath,
  eventsPath,
  manifestPath,
  sourceLedgerPath,
  transcriptBytes,
  eventsBytes,
  manifestBytes
}) {
  const manifest = JSON.parse(manifestBytes);
  const eventsDocument = JSON.parse(eventsBytes);
  const sourceEvents = normalizeV418Events(eventsDocument);
  assertV4(
    manifest.videoId === debate.videoId && manifest.eventCount === sourceEvents.length,
    `${debate.debateNumber}: local source identity mismatch`
  );
  assertV4(
    manifest.transcriptSha256 === sha256(transcriptBytes) &&
      manifest.normalizedEventsSha256 === sha256(eventsBytes),
    `${debate.debateNumber}: local source hash mismatch`
  );

  const projectedEvents = sourceEvents.map((event) => ({
    startMs: event.startMs,
    durationMs: event.durationMs,
    text: event.text
  }));
  const optionalMetadataOmitted = [
    ...new Set(sourceEvents.flatMap((event) => Object.keys(event).filter((key) => !EVENT_KEYS.includes(key))))
  ].sort();
  const sourceLedgerBytes = Buffer.from(
    `${projectedEvents
      .map((event, index) => JSON.stringify([index, event.startMs, event.durationMs, event.text]))
      .join("\n")}\n`
  );
  const replay = sourceLedgerBytes
    .toString("utf8")
    .trimEnd()
    .split("\n")
    .map((line, index) => {
      const row = JSON.parse(line);
      assertV4(
        Array.isArray(row) && row.length === 4 && row[0] === index,
        `${debate.debateNumber}: invalid compact ledger row ${index}`
      );
      return { startMs: row[1], durationMs: row[2], text: row[3] };
    });
  assertV4(
    JSON.stringify(replay) === JSON.stringify(projectedEvents),
    `${debate.debateNumber}: compact ledger does not replay to canonical event projection`
  );

  return {
    packet: {
      schemaVersion: "1.0-production-canary-score-blind-source-packet",
      protocolId: "assessment-production-canary-v1-source-preparation",
      debateNumber: debate.debateNumber,
      debateId: debate.debateId,
      motion: debate.motion,
      sides: debate.sides,
      durationSeconds: manifest.durationSeconds,
      eventCount: sourceEvents.length,
      sourceChain: {
        transcriptPath,
        transcriptSha256: sha256(transcriptBytes),
        eventsPath,
        eventsSha256: sha256(eventsBytes),
        localManifestPath: manifestPath,
        localManifestSha256: sha256(manifestBytes)
      },
      transportChain: {
        format: "jsonl rows [eventIndex,startMs,durationMs,text]",
        sourceLedgerPath,
        sourceLedgerSha256: sha256(sourceLedgerBytes),
        sourceLedgerBytes: sourceLedgerBytes.length,
        sourceLedgerEventCount: sourceEvents.length,
        replayExactToCanonicalEventProjection: true,
        originalEventsFileHashLocked: true,
        canonicalEventFields: [...EVENT_KEYS],
        optionalEventMetadataOmitted: optionalMetadataOmitted
      },
      modelInputBoundary: {}
    },
    sourceLedgerBytes,
    sourceProjection: {
      eventCount: projectedEvents.length,
      canonicalEventFields: [...EVENT_KEYS],
      optionalMetadataOmitted,
      exactReplay: true
    }
  };
}
