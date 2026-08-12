#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const recoveredIndex = process.argv.indexOf("--recovered-at");
const recoveredAt =
  recoveredIndex >= 0 ? process.argv[recoveredIndex + 1] : null;
assertV4(
  recoveredAt && !Number.isNaN(Date.parse(recoveredAt)),
  "--recovered-at requires an ISO timestamp"
);
const ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1";
const PREPARATION = `${ROOT}/selection-recovery-preparation.json`;
const FAILURE = `${ROOT}/selection-failure.json`;
const REPAIR_RECORD =
  "docs/assessment-production/source-repairs/debate-167-empty-event-normalization.json";
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const PROMOTION =
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const PROVEN_STOP_RULES =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort/independent-judgments/execution-activation.json";
const EXECUTOR =
  "scripts/recover-assessment-production-checkpoint-v2.2-selection.mjs";
const TEST =
  "scripts/test-assessment-production-checkpoint-v2.2-selection-recovery.mjs";
const OUTPUT = `${ROOT}/selection.json`;
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
await access(path.resolve(OUTPUT)).then(
  () => {
    throw new Error(`${OUTPUT} already exists; selection recovery is single-attempt`);
  },
  () => true
);

const basePaths = [
  PREPARATION,
  FAILURE,
  REPAIR_RECORD,
  PRODUCTION_MANIFEST,
  PROMOTION,
  PROVEN_STOP_RULES,
  EXECUTOR,
  TEST,
];
const baseEntries = await Promise.all(
  basePaths.map(async (file) => [file, await readFile(path.resolve(file))])
);
const baseBytes = Object.fromEntries(baseEntries);
const preparation = JSON.parse(baseBytes[PREPARATION]);
const failure = JSON.parse(baseBytes[FAILURE]);
const repairRecord = JSON.parse(baseBytes[REPAIR_RECORD]);
const productionManifest = JSON.parse(baseBytes[PRODUCTION_MANIFEST]);
const promotion = JSON.parse(baseBytes[PROMOTION]);
const stopActivation = JSON.parse(baseBytes[PROVEN_STOP_RULES]);
assertV4(
  preparation.status ===
      "frozen-same-ranking-production-checkpoint-selection-recovery-prepared" &&
    preparation.authorization.selectionRecoveryExecution &&
    preparation.authorization.selectionRecoveryAttemptsMaximum === 1 &&
    !preparation.authorization.replacementSelection &&
    !preparation.authorization.modelExecution &&
    !preparation.authorization.productionMutation &&
    preparation.recoveryBoundary.deterministicRankingChanged === false &&
    preparation.recoveryBoundary.replacementDebatesUsed === 0 &&
    preparation.recoveryBoundary.sourceChainOverlaysUsed === 1 &&
    canonicalJson(preparation.recoveryBoundary.overlayDebateNumbers) ===
      canonicalJson(["167"]) &&
    failure.status ===
      "production-checkpoint-v2.2-source-gate-failed-selection-not-frozen" &&
    repairRecord.status === "debate-167-empty-derived-event-repair-passed" &&
    promotion.status === "active-production-score-stability-policy-v2.2" &&
    stopActivation.status ===
      "frozen-twenty-v2.2.3-independent-judgment-contexts-authorized" &&
    Object.values(stopActivation.stopRules).every(Boolean),
  "frozen same-ranking selection recovery is unavailable"
);
for (const [file, expected] of Object.entries(preparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === expected,
    `${file}: selection-recovery preparation source hash changed`
  );
}
const originalNumbers =
  failure.deterministicProspectiveSelection.map((item) => item.debateNumber);
const recoveryNumbers =
  preparation.prospectiveSelection.map((item) => item.debateNumber);
assertV4(
  canonicalJson(originalNumbers) === canonicalJson(recoveryNumbers),
  "selection recovery changed deterministic ranking"
);

const manifestByNumber = new Map(
  productionManifest.items.map((item) => [item.debateNumber, item])
);
const selected = [];
const sourceEntries = [...baseEntries];
for (const prepared of preparation.prospectiveSelection) {
  const item = manifestByNumber.get(prepared.debateNumber);
  assertV4(
    item &&
      item.debateId === prepared.debateId &&
      item.videoId === prepared.videoId &&
      item.speakerCount === 2 &&
      item.disposition === "pending-reassessment" &&
      item.acceptedCalibration === null,
    `Debate ${prepared.debateNumber}: production identity changed`
  );
  const [transcriptBytes, eventsBytes, manifestBytes] = await Promise.all([
    readFile(path.resolve(prepared.sourceChain.transcript)),
    readFile(path.resolve(prepared.sourceChain.events)),
    readFile(path.resolve(prepared.sourceChain.manifest)),
  ]);
  assertV4(
    sha256(transcriptBytes) === prepared.sourceChain.transcriptSha256 &&
      sha256(eventsBytes) === prepared.sourceChain.eventsSha256 &&
      sha256(manifestBytes) === prepared.sourceChain.manifestSha256,
    `Debate ${prepared.debateNumber}: final selection source hash mismatch`
  );
  const events = normalizeV418Events(JSON.parse(eventsBytes));
  assertV4(
    events.length === prepared.eventCount,
    `Debate ${prepared.debateNumber}: final event count changed`
  );
  sourceEntries.push(
    [prepared.sourceChain.transcript, transcriptBytes],
    [prepared.sourceChain.events, eventsBytes],
    [prepared.sourceChain.manifest, manifestBytes]
  );
  selected.push({
    debateNumber: item.debateNumber,
    debateId: item.debateId,
    videoId: item.videoId,
    motion: item.motion,
    sides: structuredClone(item.sides),
    speakerCount: item.speakerCount,
    rankSha256: prepared.rankSha256,
    eventCount: prepared.eventCount,
    durationSeconds: prepared.durationSeconds,
    sourceChain: structuredClone(prepared.sourceChain),
    sourceChainOverlayApplied: prepared.sourceChainOverlayApplied,
    sourceGate: structuredClone(prepared.sourceGate),
  });
}
assertV4(
  selected.length === 10 &&
    new Set(selected.map((item) => item.debateNumber)).size === 10 &&
    selected.every(
      (item) =>
        item.speakerCount === 2 &&
        Object.values(item.sourceGate).every(Boolean)
    ) &&
    selected.filter((item) => item.sourceChainOverlayApplied).length === 1 &&
    selected.find((item) => item.debateNumber === "167")
      .sourceChainOverlayApplied,
  "recovered production checkpoint selection gate failed"
);
const sourceHashes = {};
for (const [file, value] of sourceEntries) {
  sourceHashes[file] = sha256(value);
}
const selection = {
  schemaVersion: "1.0-production-checkpoint-v2.2-selection",
  protocolId: preparation.protocolId,
  status:
    "fresh-disjoint-ten-debate-production-checkpoint-v2.2-source-gate-passed-after-exact-source-repair",
  frozenAt: preparation.frozenAt,
  recoveredAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: false,
  productionCanary: true,
  stagingOnly: true,
  activePolicy: {
    ...structuredClone(preparation.activePolicy),
    thresholds: structuredClone(promotion.activePolicy.thresholds),
    winnerRule: structuredClone(promotion.activePolicy.winnerRule),
  },
  recoveryBoundary: {
    originalFailure: FAILURE,
    originalFailureSha256: sourceHashes[FAILURE],
    recoveryPreparation: PREPARATION,
    recoveryPreparationSha256: sourceHashes[PREPARATION],
    sourceRepairRecord: REPAIR_RECORD,
    sourceRepairRecordSha256: sourceHashes[REPAIR_RECORD],
    selectionRecoveryAttempts: 1,
    deterministicRankingChanged: false,
    replacementDebatesAllowed: false,
    replacementDebatesUsed: 0,
    sourceChainOverlaysUsed: 1,
    overlayDebateNumbers: ["167"],
    frozenProductionManifestMutated: false,
    rawDiarizedTranscriptMutated: false,
  },
  selectionPolicy: {
    cohortSize: 10,
    dyadicOnly: true,
    pendingReassessmentOnly: true,
    acceptedCalibrationExcluded: true,
    failedV1CanaryExcluded: true,
    everyValidationCohortExcluded: true,
    originalDeterministicSelectionReplayedExactly: true,
    deterministicRank:
      "SHA-256(active v2.2 normative-text hash | v2.2 promotion-record hash | debate number | debate id), ascending",
    replacementAfterSourceGateFailureAllowed: false,
    transcriptContentSemanticallyInspected: false,
    legacyAssessmentAccessed: false,
    scoreAccessed: false,
    winnerAccessed: false,
  },
  modelBoundary: {
    ...structuredClone(productionManifest.model),
    scoreBlind: true,
    apiKeysRemoved: true,
    modelContextsExecuted: 0,
    retries: 0,
    timeoutExtensions: 0,
  },
  stopRules: structuredClone(stopActivation.stopRules),
  selected,
  sourceHashes,
  totals: {
    debates: 10,
    eventCount: preparation.totals.eventCount,
    durationHours: preparation.totals.durationHours,
    sourceGateFailuresAfterRepair: 0,
    sourceChainOverlays: 1,
    replacementDebates: 0,
    modelContexts: 0,
    paidTranscriptionCalls: 0,
    meteredApiCostUsd: 0,
    scoresDerived: 0,
  },
  historicalDisposition: {
    originalSourceGateFailurePreserved: true,
    failedV1CanaryReclassified: false,
    failedValidationCohortsReclassified: false,
  },
  authorization: {
    checkpointManifestPreparation: true,
    sourcePacketPreparation: false,
    discoveryModelExecution: false,
    inventoryModelExecution: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    paidTranscription: false,
    audioVerification: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    publicationPacketPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction:
    "prepare-and-freeze-production-checkpoint-v2.2-master-manifest-model-free-only",
};
await writeFile(path.resolve(OUTPUT), `${JSON.stringify(selection, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      status: selection.status,
      selectedDebates: selection.selected.map((item) => item.debateNumber),
      sourceGateFailuresAfterRepair: 0,
      sourceChainOverlays: 1,
      replacementDebates: 0,
      modelContexts: 0,
      scoresDerived: 0,
      nextAuthorized: selection.nextAuthorizedAction,
    },
    null,
    2
  )
);
