#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const preparedIndex = process.argv.indexOf("--prepared-at");
const preparedAt =
  preparedIndex >= 0 ? process.argv[preparedIndex + 1] : null;
assertV4(
  !shouldWrite || (preparedAt && !Number.isNaN(Date.parse(preparedAt))),
  "--write requires --prepared-at with an ISO timestamp"
);

const ROOT = "docs/assessment-production/production-checkpoint-v2.2-1";
const FAILURE = `${ROOT}/selection-failure.json`;
const OUTPUT = `${ROOT}/source-repair-plan.json`;
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const EVENTS = ".assessment-cache/captions/L3FOgiASYY0/events.json";
const TRANSCRIPT = ".assessment-cache/captions/L3FOgiASYY0/transcript.txt";
const LOCAL_MANIFEST = ".assessment-cache/captions/L3FOgiASYY0/manifest.json";
const RAW =
  ".assessment-cache/captions/L3FOgiASYY0/openai-diarized-chunks.json";
const NORMALIZER = "scripts/lib/v418-source-integrity.mjs";
const SCRIPT =
  "scripts/prepare-assessment-production-checkpoint-v2.2-source-repair.mjs";
const REPAIR_SCRIPT =
  "scripts/repair-assessment-production-checkpoint-v2.2-debate-167-source.mjs";
const REPAIR_RECORD =
  "docs/assessment-production/source-repairs/debate-167-empty-event-normalization.json";
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

if (shouldWrite) {
  await access(path.resolve(OUTPUT)).then(
    () => {
      throw new Error(`${OUTPUT} already exists; repair plan is immutable`);
    },
    () => true
  );
}
const sourcePaths = [
  FAILURE,
  PRODUCTION_MANIFEST,
  EVENTS,
  TRANSCRIPT,
  LOCAL_MANIFEST,
  RAW,
  NORMALIZER,
  SCRIPT,
];
const entries = await Promise.all(
  sourcePaths.map(async (file) => [file, await readFile(path.resolve(file))])
);
const bytes = Object.fromEntries(entries);
const failure = JSON.parse(bytes[FAILURE]);
const productionManifest = JSON.parse(bytes[PRODUCTION_MANIFEST]);
const events = JSON.parse(bytes[EVENTS]);
const transcript = bytes[TRANSCRIPT].toString("utf8");
const localManifest = JSON.parse(bytes[LOCAL_MANIFEST]);
const raw = JSON.parse(bytes[RAW]);
const productionItem = productionManifest.items.find(
  (item) => item.debateNumber === "167"
);
assertV4(
  failure.status ===
      "production-checkpoint-v2.2-source-gate-failed-selection-not-frozen" &&
    failure.gate.sourceGateFailures.length === 1 &&
    failure.gate.sourceGateFailures[0].debateNumber === "167" &&
    failure.gate.sourceGateFailures[0].stage ===
      "canonical-event-validation" &&
    failure.gate.sourceGateFailures[0].message === "events[993]: empty text" &&
    failure.gate.replacementsPerformed === 0 &&
    failure.authorization.sourceRepairPlanPreparation &&
    !failure.authorization.sourceMutation &&
    !failure.authorization.replacementSelection &&
    !failure.authorization.modelExecution &&
    productionItem?.debateId === "craig-shook-existence-god-2008" &&
    productionItem.videoId === "L3FOgiASYY0" &&
    productionItem.sourceChain.events === EVENTS &&
    productionItem.sourceChain.transcript === TRANSCRIPT &&
    productionItem.sourceChain.manifest === LOCAL_MANIFEST,
  "exact Debate 167 source-gate failure boundary is unavailable"
);
assertV4(
  sha256(bytes[EVENTS]) === productionItem.sourceChain.eventsSha256 &&
    sha256(bytes[TRANSCRIPT]) === productionItem.sourceChain.transcriptSha256 &&
    sha256(bytes[LOCAL_MANIFEST]) ===
      productionItem.sourceChain.manifestSha256 &&
    sha256(bytes[RAW]) === localManifest.rawTranscriptSha256 &&
    localManifest.normalizedEventsSha256 === sha256(bytes[EVENTS]) &&
    localManifest.transcriptSha256 === sha256(bytes[TRANSCRIPT]) &&
    localManifest.eventCount === events.length,
  "Debate 167 frozen local source hashes changed before repair planning"
);

const emptyEvents = events
  .map((event, index) => ({ index, event }))
  .filter(
    ({ event }) =>
      typeof event.text !== "string" || event.text.trim().length === 0
  );
assertV4(
  emptyEvents.length === 1 &&
    emptyEvents[0].index === 993 &&
    emptyEvents[0].event.startMs === 4237634 &&
    emptyEvents[0].event.durationMs === 100 &&
    emptyEvents[0].event.speaker === "A" &&
    emptyEvents[0].event.text === "",
  "Debate 167 empty normalized event changed"
);
const invalidNontextEvents = events.filter(
  (event) =>
    !Number.isFinite(event.startMs) ||
    !Number.isFinite(event.durationMs) ||
    event.durationMs <= 0 ||
    typeof event.speaker !== "string" ||
    event.speaker.trim().length === 0
);
assertV4(
  invalidNontextEvents.length === 0,
  "Debate 167 has another normalized event defect"
);
const transcriptLines = transcript.endsWith("\n")
  ? transcript.slice(0, -1).split("\n")
  : transcript.split("\n");
assertV4(
  transcriptLines.length === events.length &&
    transcriptLines[993] === "[01:10:37] [Speaker A] ",
  "Debate 167 transcript/event empty-row correspondence changed"
);
const emptyRawSegments = [];
raw.chunks.forEach((chunk, chunkIndex) => {
  chunk.payload.segments.forEach((segment, segmentIndex) => {
    if (typeof segment.text !== "string" || segment.text.trim().length === 0) {
      emptyRawSegments.push({
        chunkIndex,
        segmentIndex,
        fileName: chunk.fileName,
        chunkSha256: chunk.sha256,
        id: segment.id,
        start: segment.start,
        end: segment.end,
        speaker: segment.speaker,
        text: segment.text,
      });
    }
  });
});
assertV4(
  emptyRawSegments.length === 1 &&
    emptyRawSegments[0].chunkIndex === 3 &&
    emptyRawSegments[0].segmentIndex === 175 &&
    emptyRawSegments[0].id === "seg_175" &&
    emptyRawSegments[0].start === 637.634 &&
    emptyRawSegments[0].end === 637.734 &&
    emptyRawSegments[0].text === "",
  "Debate 167 raw empty segment changed"
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
const plan = {
  schemaVersion: "1.0-production-checkpoint-v2.2-source-repair-plan",
  protocolId: failure.protocolId,
  status: "prepared-exact-debate-167-empty-derived-event-repair",
  preparedAt: shouldWrite ? preparedAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: false,
  productionCanary: true,
  stagingOnly: true,
  target: {
    debateNumber: "167",
    debateId: productionItem.debateId,
    videoId: productionItem.videoId,
    normalizedEventIndex: 993,
    transcriptLineNumber: 994,
    removedDerivedEvent: structuredClone(emptyEvents[0].event),
    correspondingRawSegment: emptyRawSegments[0],
  },
  diagnosis: {
    sourceFilesAndRecordedHashesMatchedBeforeCanonicalValidation: true,
    rawTranscriptionContainsOneContentlessSegment: true,
    normalizationPreservedThatSegmentAsOneContentlessEvent: true,
    transcriptRendererPreservedItAsOneContentlessSpeakerLine: true,
    otherEmptyNormalizedEvents: 0,
    otherStructuralEventDefects: 0,
    semanticContentLostByRemoval: false,
    replacementDebateRequired: false,
  },
  repair: {
    attemptsMaximum: 1,
    modelFree: true,
    paidServiceCalls: 0,
    rawDiarizedChunksMutationAllowed: false,
    frozenProductionManifestMutationAllowed: false,
    removeOnlyNormalizedEventIndex: 993,
    removeOnlyTranscriptLineNumber: 994,
    preserveEveryOtherEventByteValueAndOrder: true,
    preserveEveryOtherTranscriptLineValueAndOrder: true,
    updateLocalManifestFieldsOnly: [
      "normalizedEventsSha256",
      "transcriptSha256",
      "eventCount",
    ],
    preserveLocalManifestRawTranscriptSha256: true,
    writeCommittedSourceChainOverlay: REPAIR_RECORD,
    originalFailureArtifactMutationAllowed: false,
    replacementSelectionAllowed: false,
  },
  projected: {
    events: {
      path: EVENTS,
      beforeSha256: sha256(bytes[EVENTS]),
      afterSha256: sha256(repairedEventsBytes),
      beforeCount: events.length,
      afterCount: repairedEvents.length,
    },
    transcript: {
      path: TRANSCRIPT,
      beforeSha256: sha256(bytes[TRANSCRIPT]),
      afterSha256: sha256(repairedTranscriptBytes),
      beforeLineCount: transcriptLines.length,
      afterLineCount: repairedTranscriptLines.length,
    },
    localManifest: {
      path: LOCAL_MANIFEST,
      beforeSha256: sha256(bytes[LOCAL_MANIFEST]),
      afterSha256: sha256(repairedLocalManifestBytes),
      rawTranscriptSha256: localManifest.rawTranscriptSha256,
    },
    rawDiarizedChunks: {
      path: RAW,
      beforeAndAfterSha256: sha256(bytes[RAW]),
    },
    productionManifest: {
      path: PRODUCTION_MANIFEST,
      beforeAndAfterSha256: sha256(bytes[PRODUCTION_MANIFEST]),
    },
  },
  requiredPostRepairValidation: {
    exactProjectedHashes: true,
    canonicalEventValidation: true,
    transcriptLineCountEqualsEventCount: true,
    localManifestHashChainMatches: true,
    rawDiarizedChunksHashUnchanged: true,
    frozenProductionManifestHashUnchanged: true,
    committedSourceChainOverlayRequired: true,
    sameTenDebateDeterministicRankingRequired: true,
    noReplacementDebate: true,
  },
  sourceHashes: Object.fromEntries(
    entries.map(([file, value]) => [file, sha256(value)])
  ),
  authorization: {
    sourceRepairExecution: true,
    sourceRepairAttemptsMaximum: 1,
    committedSourceChainOverlay: true,
    selectionRecoveryPreparation: false,
    replacementSelection: false,
    sourcePacketPreparation: false,
    modelExecution: false,
    paidTranscription: false,
    scoreDerivation: false,
    publicationPacketPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction: "execute-exact-debate-167-source-repair-once-model-free-only",
  futureArtifacts: {
    repairScript: REPAIR_SCRIPT,
    repairRecord: REPAIR_RECORD,
  },
};
if (shouldWrite) {
  await writeFile(path.resolve(OUTPUT), `${JSON.stringify(plan, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? plan.status : "preview",
      target: plan.target,
      projected: plan.projected,
      semanticContentLostByRemoval: false,
      rawSourcePreserved: true,
      frozenProductionManifestPreserved: true,
      replacementSelectionAllowed: false,
      modelContexts: 0,
      directCostUsd: 0,
      nextAuthorized: plan.nextAuthorizedAction,
    },
    null,
    2
  )
);
