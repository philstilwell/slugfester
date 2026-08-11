#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  buildAssessmentProductionScoreStabilityV213AudioWorkItems
} from "./lib/assessment-production-score-stability-v2.1.3-audio-work-items.mjs";

const COHORT_ROOT =
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort";
const JUDGMENT_ROOT = `${COHORT_ROOT}/independent-judgments`;
const ROOT = `${COHORT_ROOT}/disagreement-extraction`;
const workPath = `${ROOT}/audio-work-items.json`;
const preparationPath = `${ROOT}/audio-work-item-preparation.json`;
const EXPECTED_DEBATES = [
  "142",
  "181",
  "92",
  "172",
  "78",
  "20",
  "108",
  "29",
  "119",
  "28"
];
const EXPECTED_AUDIO = [
  "181:con-miracle-judgment-depends-on-priors",
  "181:pro-paul-bodily-transformation",
  "92:con-grim-reaper-temporal-mirror",
  "78:con-reformation-had-reform-precursors",
  "78:con-uncertain-single-catholic-lineage"
];
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const queueKey = ({ debateNumber, moveId }) => `${debateNumber}:${moveId}`;

const [workBytes, preparation, executionPreparation] = await Promise.all([
  readFile(workPath),
  readFile(preparationPath, "utf8").then(JSON.parse),
  readFile(`${JUDGMENT_ROOT}/execution-preparation-manifest.json`, "utf8").then(
    JSON.parse
  )
]);
const work = JSON.parse(workBytes);

assert.equal(
  preparation.status,
  "prepared-and-frozen-five-v2.1.3-local-audio-source-work-items"
);
assert.equal(work.status, "prepared-five-v2.1.3-local-audio-source-work-items");
assert.equal(preparation.productionCanary, false);
assert.equal(preparation.stagingOnly, true);
assert.equal(preparation.developmentValidationOnly, true);
assert.equal(work.productionCanary, false);
assert.equal(work.stagingOnly, true);
assert.equal(preparation.workArtifact.path, workPath);
assert.equal(preparation.workArtifact.sha256, sha256(workBytes));
assert.equal(preparation.sources.length, 3);
assert.equal(preparation.totals.debates, 3);
assert.equal(preparation.totals.sourceVideoIds, 3);
assert.equal(preparation.totals.moves, 5);
assert.equal(work.moves.length, 5);
assert.deepEqual(work.moves.map(queueKey).sort(), [...EXPECTED_AUDIO].sort());
assert.equal(work.mediaFilesAccessed, 0);
assert.equal(work.sourceAudioPrepared, false);
assert.equal(work.audioVerificationCompleted, false);
assert.equal(work.modelOrApiCallsMade, 0);
assert.equal(work.scoresDerived, 0);
assert.equal(preparation.validation.canonicalLocalTranscriptChainsVerified, 3);
assert.equal(preparation.validation.repositoryRenderedLockedExcerpts, 5);
assert.equal(preparation.validation.repositoryRenderedTimestampWindows, 5);
assert.equal(preparation.validation.expectedSpeakersLocked, 5);
assert.equal(preparation.validation.mediaFilesAccessed, 0);
assert.equal(preparation.validation.audioClaimsMade, 0);
assert.equal(preparation.validation.scoresDerived, 0);
assert.equal(preparation.totals.sourceDownloads, 0);
assert.equal(preparation.totals.sourceAudioFilesPrepared, 0);
assert.equal(preparation.totals.clipsPrepared, 0);
assert.equal(preparation.totals.audioCalls, 0);
assert.equal(preparation.totals.paidTranscriptionCalls, 0);
assert.equal(preparation.totals.transcriptionCostUsd, 0);
assert.equal(preparation.totals.modelContexts, 0);
assert.equal(preparation.totals.meteredModelApiCostUsd, 0);
assert.equal(preparation.totals.retries, 0);
assert.equal(preparation.totals.timeoutExtensions, 0);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.proposedPolicy.everyIntegerRoundedTieAccepted, true);
assert.equal(preparation.proposedPolicy.promoted, false);
assert.equal(preparation.authorization.localAudioSourcePreparation, true);
assert.equal(preparation.authorization.paidTranscriptionExecution, false);
assert.equal(preparation.authorization.audioVerificationExecution, false);
assert.equal(preparation.authorization.adjudicationPacketPreparation, false);
assert.equal(preparation.authorization.scoreDerivation, false);
assert.equal(preparation.authorization.policyPromotion, false);
assert.equal(preparation.authorization.publicationFinalization, false);
assert.equal(preparation.authorization.productionMutation, false);
assert.equal(preparation.authorization.remainingProductionBatches, false);
assert.equal(
  preparation.nextAuthorizedAction,
  "prepare-five-v2.1.3-local-audio-sources-and-clips-model-free-only"
);

for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
}

const replayed = [];
for (const debateNumber of EXPECTED_DEBATES) {
  const context = executionPreparation.contexts.find(
    (item) => item.debateNumber === debateNumber && item.reviewerPass === "A"
  );
  const [primaryA, primaryB, lockedInventory, sourcePacket, events] =
    await Promise.all([
      readFile(
        `${JUDGMENT_ROOT}/raw-outputs/pass-a/debate-${debateNumber}.json`,
        "utf8"
      ).then(JSON.parse),
      readFile(
        `${JUDGMENT_ROOT}/raw-outputs/pass-b/debate-${debateNumber}.json`,
        "utf8"
      ).then(JSON.parse),
      readFile(context.lockedInventory, "utf8").then(JSON.parse),
      readFile(context.sourcePacket, "utf8").then(JSON.parse),
      readFile(context.originalEvents, "utf8").then(JSON.parse)
    ]);
  replayed.push(
    ...buildAssessmentProductionScoreStabilityV213AudioWorkItems(
      primaryA,
      primaryB,
      lockedInventory,
      events,
      sourcePacket
    )
  );
}
assert.deepEqual(work.moves, replayed, "deterministic audio work-item replay mismatch");

for (const item of work.moves) {
  assert.equal(item.audioVerificationRequiredBeforeAdjudication, true);
  assert(
    item.trigger.eitherPassAssessmentBelowHigh ||
      item.trigger.eitherPassAttributionBelowHigh
  );
  assert.equal(item.clipWindow.paddingMs, 2500);
  assert(item.clipWindow.endMs > item.clipWindow.startMs);
  assert(item.verificationExcerpt.length > 0);
  assert.equal(item.evidenceOwnership, "repository-rendered-from-locked-source-span");
  assert.equal("sourceAudio" in item, false);
  assert.equal("clipPath" in item, false);
  assert.equal("audioVerificationResult" in item, false);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: preparation.totals.debates,
      sourceVideoIds: preparation.totals.sourceVideoIds,
      moves: work.moves.length,
      plannedClipMinutes: preparation.totals.plannedClipMinutes,
      sourceHashesVerified: Object.keys(preparation.sourceHashes).length,
      deterministicWorkItemReplays: EXPECTED_DEBATES.length,
      mediaFilesAccessed: 0,
      sourceDownloads: 0,
      clipsPrepared: 0,
      audioCalls: 0,
      modelContexts: 0,
      scoresDerived: 0,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0
    },
    null,
    2
  )
);
