#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  !shouldWrite || (frozenAt && !Number.isNaN(Date.parse(frozenAt))),
  "--write requires --frozen-at with an ISO timestamp"
);
const ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1";
const FAILURE = `${ROOT}/selection-failure.json`;
const REPAIR_PLAN = `${ROOT}/source-repair-plan.json`;
const REPAIR_RECORD =
  "docs/assessment-production/source-repairs/debate-167-empty-event-normalization.json";
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const PROMOTION =
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const NORMALIZER = "scripts/lib/v418-source-integrity.mjs";
const SCRIPT =
  "scripts/prepare-assessment-production-checkpoint-v2.2-selection-recovery.mjs";
const OUTPUT = `${ROOT}/selection-recovery-preparation.json`;
const FUTURE_SELECTION = `${ROOT}/selection.json`;
const FUTURE_EXECUTOR =
  "scripts/recover-assessment-production-checkpoint-v2.2-selection.mjs";
const FUTURE_TEST =
  "scripts/test-assessment-production-checkpoint-v2.2-selection-recovery.mjs";
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
if (shouldWrite) {
  await access(path.resolve(OUTPUT)).then(
    () => {
      throw new Error(`${OUTPUT} already exists; recovery preparation is immutable`);
    },
    () => true
  );
}

const basePaths = [
  FAILURE,
  REPAIR_PLAN,
  REPAIR_RECORD,
  PRODUCTION_MANIFEST,
  PROMOTION,
  NORMALIZER,
  SCRIPT,
];
const baseEntries = await Promise.all(
  basePaths.map(async (file) => [file, await readFile(path.resolve(file))])
);
const baseBytes = Object.fromEntries(baseEntries);
const failure = JSON.parse(baseBytes[FAILURE]);
const repairPlan = JSON.parse(baseBytes[REPAIR_PLAN]);
const repairRecord = JSON.parse(baseBytes[REPAIR_RECORD]);
const productionManifest = JSON.parse(baseBytes[PRODUCTION_MANIFEST]);
const promotion = JSON.parse(baseBytes[PROMOTION]);
assertV4(
  failure.status ===
      "production-checkpoint-v2.2-source-gate-failed-selection-not-frozen" &&
    failure.deterministicProspectiveSelection.length === 10 &&
    failure.gate.sourceGateFailures.length === 1 &&
    failure.gate.sourceGateFailures[0].debateNumber === "167" &&
    failure.gate.replacementsPerformed === 0 &&
    repairPlan.status === "prepared-exact-debate-167-empty-derived-event-repair" &&
    repairRecord.status === "debate-167-empty-derived-event-repair-passed" &&
    repairRecord.debateNumber === "167" &&
    repairRecord.repair.attempts === 1 &&
    !repairRecord.repair.semanticContentRemoved &&
    repairRecord.validation.canonicalEventValidationPassed &&
    repairRecord.validation.rawDiarizedChunksHashUnchanged &&
    repairRecord.validation.frozenProductionManifestHashUnchanged &&
    repairRecord.authorization.selectionRecoveryPreparation &&
    !repairRecord.authorization.replacementSelection &&
    !repairRecord.authorization.modelExecution &&
    promotion.status === "active-production-score-stability-policy-v2.2" &&
    promotion.activePolicy.version === "v2.2" &&
    promotion.authorization.productionCheckpointSelection &&
    !promotion.authorization.modelExecution &&
    sha256(baseBytes[PRODUCTION_MANIFEST]) ===
      repairRecord.preservedSources.frozenProductionManifest.sha256,
  "same-ranking production checkpoint recovery is unauthorized"
);
for (const [file, expected] of Object.entries(repairRecord.toolingHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === expected,
    `${file}: source-repair tooling hash changed`
  );
}

const manifestByNumber = new Map(
  productionManifest.items.map((item) => [item.debateNumber, item])
);
const prospectiveNumbers =
  failure.deterministicProspectiveSelection.map((item) => item.debateNumber);
assertV4(
  canonicalJson(prospectiveNumbers) ===
    canonicalJson(["50", "192", "129", "40", "25", "104", "22", "10", "167", "122"]),
  "original deterministic production checkpoint ranking changed"
);
const preparedSources = [];
const sourceEntries = [...baseEntries];
for (const ranked of failure.deterministicProspectiveSelection) {
  const item = manifestByNumber.get(ranked.debateNumber);
  assertV4(
    item &&
      item.debateId === ranked.debateId &&
      item.videoId === ranked.videoId &&
      item.speakerCount === 2 &&
      item.disposition === "pending-reassessment" &&
      item.acceptedCalibration === null,
    `Debate ${ranked.debateNumber}: frozen production identity changed`
  );
  const sourceChain =
    ranked.debateNumber === "167"
      ? {
          transcript: repairRecord.sourceChainAfter.transcript.path,
          transcriptSha256: repairRecord.sourceChainAfter.transcript.sha256,
          events: repairRecord.sourceChainAfter.events.path,
          eventsSha256: repairRecord.sourceChainAfter.events.sha256,
          manifest: repairRecord.sourceChainAfter.manifest.path,
          manifestSha256: repairRecord.sourceChainAfter.manifest.sha256,
          extractionMethod: repairRecord.sourceChainAfter.extractionMethod,
        }
      : structuredClone(item.sourceChain);
  const [transcriptBytes, eventsBytes, manifestBytes] = await Promise.all([
    readFile(path.resolve(sourceChain.transcript)),
    readFile(path.resolve(sourceChain.events)),
    readFile(path.resolve(sourceChain.manifest)),
  ]);
  assertV4(
    sha256(transcriptBytes) === sourceChain.transcriptSha256 &&
      sha256(eventsBytes) === sourceChain.eventsSha256 &&
      sha256(manifestBytes) === sourceChain.manifestSha256,
    `Debate ${ranked.debateNumber}: recovery source hash mismatch`
  );
  const events = normalizeV418Events(JSON.parse(eventsBytes));
  assertV4(events.length > 0, `Debate ${ranked.debateNumber}: no canonical events`);
  const durationMs = Math.max(
    ...events.map((event) => event.startMs + event.durationMs)
  );
  sourceEntries.push(
    [sourceChain.transcript, transcriptBytes],
    [sourceChain.events, eventsBytes],
    [sourceChain.manifest, manifestBytes]
  );
  preparedSources.push({
    debateNumber: ranked.debateNumber,
    debateId: ranked.debateId,
    videoId: ranked.videoId,
    rankSha256: ranked.rankSha256,
    sourceChain,
    sourceChainOverlayApplied: ranked.debateNumber === "167",
    eventCount: events.length,
    durationSeconds: Number((durationMs / 1000).toFixed(3)),
    sourceGate: {
      transcriptPresentAndHashMatched: true,
      eventsPresentAndHashMatched: true,
      localManifestPresentAndHashMatched: true,
      canonicalEventProjectionNonempty: true,
    },
  });
}
assertV4(
  preparedSources.length === 10 &&
    preparedSources.filter((item) => item.sourceChainOverlayApplied).length === 1 &&
    preparedSources.find((item) => item.debateNumber === "167")
      .sourceChainOverlayApplied &&
    preparedSources.every((item) =>
      Object.values(item.sourceGate).every(Boolean)
    ),
  "same-ranking recovery source gate failed"
);
const sourceHashes = {};
for (const [file, value] of sourceEntries) {
  sourceHashes[file] = sha256(value);
}
const preparation = {
  schemaVersion: "1.0-production-checkpoint-v2.2-selection-recovery-preparation",
  protocolId: failure.protocolId,
  status: "frozen-same-ranking-production-checkpoint-selection-recovery-prepared",
  frozenAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: false,
  productionCanary: true,
  stagingOnly: true,
  activePolicy: structuredClone(failure.activePolicy),
  recoveryBoundary: {
    originalFailure: FAILURE,
    originalFailureSha256: sourceHashes[FAILURE],
    sourceRepairPlan: REPAIR_PLAN,
    sourceRepairPlanSha256: sourceHashes[REPAIR_PLAN],
    sourceRepairRecord: REPAIR_RECORD,
    sourceRepairRecordSha256: sourceHashes[REPAIR_RECORD],
    deterministicRankingChanged: false,
    replacementDebatesAllowed: false,
    replacementDebatesUsed: 0,
    sourceChainOverlaysAllowed: 1,
    sourceChainOverlaysUsed: 1,
    overlayDebateNumbers: ["167"],
    frozenProductionManifestMutated: false,
    rawDiarizedTranscriptMutated: false,
  },
  prospectiveSelection: preparedSources,
  totals: {
    debates: 10,
    sourceGatePassed: 10,
    sourceGateFailed: 0,
    eventCount: preparedSources.reduce(
      (sum, item) => sum + item.eventCount,
      0
    ),
    durationHours: Number(
      (
        preparedSources.reduce(
          (sum, item) => sum + item.durationSeconds,
          0
        ) / 3600
      ).toFixed(3)
    ),
    modelContexts: 0,
    paidTranscriptionCalls: 0,
    meteredApiCostUsd: 0,
    scoresDerived: 0,
  },
  sourceHashes,
  authorization: {
    selectionRecoveryExecution: true,
    selectionRecoveryAttemptsMaximum: 1,
    checkpointManifestPreparation: false,
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
    "execute-same-ranking-production-checkpoint-v2.2-selection-recovery-once-model-free-only",
  artifacts: {
    selection: FUTURE_SELECTION,
    executor: FUTURE_EXECUTOR,
    test: FUTURE_TEST,
  },
};
if (shouldWrite) {
  await writeFile(
    path.resolve(OUTPUT),
    `${JSON.stringify(preparation, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? preparation.status : "preview",
      debates: preparation.prospectiveSelection.map(
        (item) => item.debateNumber
      ),
      sourceGatePassed: 10,
      sourceChainOverlaysUsed: 1,
      overlayDebateNumbers: ["167"],
      replacementDebatesUsed: 0,
      modelContexts: 0,
      directCostUsd: 0,
      nextAuthorized: preparation.nextAuthorizedAction,
    },
    null,
    2
  )
);
