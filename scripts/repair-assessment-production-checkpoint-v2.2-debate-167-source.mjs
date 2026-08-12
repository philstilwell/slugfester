#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const repairedIndex = process.argv.indexOf("--repaired-at");
const repairedAt =
  repairedIndex >= 0 ? process.argv[repairedIndex + 1] : null;
assertV4(
  repairedAt && !Number.isNaN(Date.parse(repairedAt)),
  "--repaired-at requires an ISO timestamp"
);
const PLAN =
  "docs/assessment-production/production-checkpoint-v2.2-1/source-repair-plan.json";
const RECORD =
  "docs/assessment-production/source-repairs/debate-167-empty-event-normalization.json";
const EXECUTOR =
  "scripts/repair-assessment-production-checkpoint-v2.2-debate-167-source.mjs";
const VALIDATOR =
  "scripts/validate-assessment-production-checkpoint-v2.2-debate-167-source-repair.mjs";
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
await access(path.resolve(RECORD)).then(
  () => {
    throw new Error(`${RECORD} already exists; source repair is single-attempt`);
  },
  () => true
);

const plan = JSON.parse(await readFile(path.resolve(PLAN), "utf8"));
assertV4(
  plan.status === "prepared-exact-debate-167-empty-derived-event-repair" &&
    plan.target.debateNumber === "167" &&
    plan.target.normalizedEventIndex === 993 &&
    plan.target.transcriptLineNumber === 994 &&
    plan.repair.attemptsMaximum === 1 &&
    plan.repair.modelFree &&
    !plan.repair.rawDiarizedChunksMutationAllowed &&
    !plan.repair.frozenProductionManifestMutationAllowed &&
    plan.repair.removeOnlyNormalizedEventIndex === 993 &&
    plan.repair.removeOnlyTranscriptLineNumber === 994 &&
    plan.authorization.sourceRepairExecution &&
    plan.authorization.sourceRepairAttemptsMaximum === 1 &&
    !plan.authorization.replacementSelection &&
    !plan.authorization.modelExecution &&
    !plan.authorization.productionMutation &&
    plan.nextAuthorizedAction ===
      "execute-exact-debate-167-source-repair-once-model-free-only",
  "frozen Debate 167 repair plan is unavailable"
);
for (const [file, expected] of Object.entries(plan.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === expected,
    `${file}: pre-repair source hash changed`
  );
}

const eventsPath = plan.projected.events.path;
const transcriptPath = plan.projected.transcript.path;
const localManifestPath = plan.projected.localManifest.path;
const rawPath = plan.projected.rawDiarizedChunks.path;
const productionManifestPath = plan.projected.productionManifest.path;
const [eventsBytes, transcriptBytes, localManifestBytes] = await Promise.all([
  readFile(path.resolve(eventsPath)),
  readFile(path.resolve(transcriptPath)),
  readFile(path.resolve(localManifestPath)),
]);
const events = JSON.parse(eventsBytes);
const transcript = transcriptBytes.toString("utf8");
const localManifest = JSON.parse(localManifestBytes);
assertV4(
  sha256(eventsBytes) === plan.projected.events.beforeSha256 &&
    sha256(transcriptBytes) === plan.projected.transcript.beforeSha256 &&
    sha256(localManifestBytes) === plan.projected.localManifest.beforeSha256 &&
    events.length === plan.projected.events.beforeCount,
  "Debate 167 local source changed after repair planning"
);
assertV4(
  JSON.stringify(events[993]) ===
      JSON.stringify(plan.target.removedDerivedEvent) &&
    events[993].text === "",
  "exact contentless event is no longer at index 993"
);
const transcriptLines = transcript.endsWith("\n")
  ? transcript.slice(0, -1).split("\n")
  : transcript.split("\n");
assertV4(
  transcriptLines.length === plan.projected.transcript.beforeLineCount &&
    transcriptLines[993] === "[01:10:37] [Speaker A] ",
  "exact contentless transcript line is no longer line 994"
);

const repairedEvents = events.filter((_, index) => index !== 993);
normalizeV418Events(repairedEvents);
const repairedTranscriptLines = transcriptLines.filter(
  (_, index) => index !== 993
);
const repairedEventsBytes = Buffer.from(
  `${JSON.stringify(repairedEvents, null, 2)}\n`
);
const repairedTranscriptBytes = Buffer.from(
  `${repairedTranscriptLines.join("\n")}\n`
);
const repairedLocalManifest = {
  ...structuredClone(localManifest),
  normalizedEventsSha256: sha256(repairedEventsBytes),
  transcriptSha256: sha256(repairedTranscriptBytes),
  eventCount: repairedEvents.length,
};
const repairedLocalManifestBytes = Buffer.from(
  `${JSON.stringify(repairedLocalManifest, null, 2)}\n`
);
assertV4(
  sha256(repairedEventsBytes) === plan.projected.events.afterSha256 &&
    sha256(repairedTranscriptBytes) === plan.projected.transcript.afterSha256 &&
    sha256(repairedLocalManifestBytes) ===
      plan.projected.localManifest.afterSha256 &&
    repairedEvents.length === plan.projected.events.afterCount &&
    repairedTranscriptLines.length ===
      plan.projected.transcript.afterLineCount &&
    repairedLocalManifest.rawTranscriptSha256 ===
      plan.projected.localManifest.rawTranscriptSha256,
  "computed Debate 167 repair differs from frozen projection"
);

await writeFile(path.resolve(eventsPath), repairedEventsBytes);
await writeFile(path.resolve(transcriptPath), repairedTranscriptBytes);
await writeFile(path.resolve(localManifestPath), repairedLocalManifestBytes);
const [writtenEvents, writtenTranscript, writtenManifest, rawBytes, productionBytes] =
  await Promise.all([
    readFile(path.resolve(eventsPath)),
    readFile(path.resolve(transcriptPath)),
    readFile(path.resolve(localManifestPath)),
    readFile(path.resolve(rawPath)),
    readFile(path.resolve(productionManifestPath)),
  ]);
normalizeV418Events(JSON.parse(writtenEvents));
assertV4(
  sha256(writtenEvents) === plan.projected.events.afterSha256 &&
    sha256(writtenTranscript) === plan.projected.transcript.afterSha256 &&
    sha256(writtenManifest) === plan.projected.localManifest.afterSha256 &&
    sha256(rawBytes) ===
      plan.projected.rawDiarizedChunks.beforeAndAfterSha256 &&
    sha256(productionBytes) ===
      plan.projected.productionManifest.beforeAndAfterSha256,
  "post-write Debate 167 repair validation failed"
);
const repairedManifestDocument = JSON.parse(writtenManifest);
assertV4(
  repairedManifestDocument.normalizedEventsSha256 === sha256(writtenEvents) &&
    repairedManifestDocument.transcriptSha256 === sha256(writtenTranscript) &&
    repairedManifestDocument.eventCount === repairedEvents.length,
  "repaired local manifest hash chain failed"
);

const recordSources = await Promise.all(
  [PLAN, EXECUTOR, VALIDATOR].map(async (file) => [
    file,
    sha256(await readFile(path.resolve(file))),
  ])
);
const record = {
  schemaVersion: "1.0-assessment-production-source-repair-record",
  status: "debate-167-empty-derived-event-repair-passed",
  repairedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  debateNumber: "167",
  debateId: plan.target.debateId,
  videoId: plan.target.videoId,
  repair: {
    attempts: 1,
    modelContexts: 0,
    paidServiceCalls: 0,
    directCostUsd: 0,
    removedNormalizedEventIndex: 993,
    removedTranscriptLineNumber: 994,
    removedDerivedEvent: structuredClone(plan.target.removedDerivedEvent),
    semanticContentRemoved: false,
    everyOtherEventValueAndOrderPreserved: true,
    everyOtherTranscriptLineValueAndOrderPreserved: true,
  },
  sourceChainBefore: {
    transcript: {
      path: transcriptPath,
      sha256: plan.projected.transcript.beforeSha256,
      lines: plan.projected.transcript.beforeLineCount,
    },
    events: {
      path: eventsPath,
      sha256: plan.projected.events.beforeSha256,
      count: plan.projected.events.beforeCount,
    },
    manifest: {
      path: localManifestPath,
      sha256: plan.projected.localManifest.beforeSha256,
    },
  },
  sourceChainAfter: {
    transcript: {
      path: transcriptPath,
      sha256: plan.projected.transcript.afterSha256,
      lines: plan.projected.transcript.afterLineCount,
    },
    events: {
      path: eventsPath,
      sha256: plan.projected.events.afterSha256,
      count: plan.projected.events.afterCount,
    },
    manifest: {
      path: localManifestPath,
      sha256: plan.projected.localManifest.afterSha256,
    },
    extractionMethod: localManifest.extractionMethod,
  },
  preservedSources: {
    rawDiarizedChunks: {
      path: rawPath,
      sha256: plan.projected.rawDiarizedChunks.beforeAndAfterSha256,
      mutated: false,
    },
    frozenProductionManifest: {
      path: productionManifestPath,
      sha256: plan.projected.productionManifest.beforeAndAfterSha256,
      mutated: false,
    },
    rawEmptySegment: structuredClone(plan.target.correspondingRawSegment),
  },
  validation: {
    exactProjectedHashesPassed: true,
    canonicalEventValidationPassed: true,
    transcriptLineCountEqualsEventCount: true,
    localManifestHashChainPassed: true,
    rawDiarizedChunksHashUnchanged: true,
    frozenProductionManifestHashUnchanged: true,
    repairReconstructibleFromRawSource: true,
  },
  toolingHashes: Object.fromEntries(recordSources),
  authorization: {
    selectionRecoveryPreparation: true,
    replacementSelection: false,
    sourcePacketPreparation: false,
    modelExecution: false,
    paidTranscription: false,
    scoreDerivation: false,
    publicationPacketPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction:
    "prepare-same-ranking-production-checkpoint-v2.2-selection-recovery-model-free-only",
};
await mkdir(path.dirname(path.resolve(RECORD)), { recursive: true });
await writeFile(path.resolve(RECORD), `${JSON.stringify(record, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      status: record.status,
      removedDerivedEvent: record.repair.removedDerivedEvent,
      semanticContentRemoved: false,
      rawSourcePreserved: true,
      frozenProductionManifestPreserved: true,
      repairedSourceChain: record.sourceChainAfter,
      modelContexts: 0,
      directCostUsd: 0,
      nextAuthorized: record.nextAuthorizedAction,
    },
    null,
    2
  )
);
