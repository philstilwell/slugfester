#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

import {
  buildAssessmentProductionPostCanaryBatch15AudioWorkItems
} from "./lib/assessment-production-post-canary-batch-15-audio-work-items.mjs";

const COHORT_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-15";
const JUDGMENT_ROOT = `${COHORT_ROOT}/independent-judgments`;
const ROOT = `${COHORT_ROOT}/disagreement-extraction`;
const workPath = `${ROOT}/audio-work-items.json`;
const preparationPath = `${ROOT}/audio-work-item-preparation.json`;
const EXPECTED_DEBATES = [
  "39",
  "48",
  "23",
  "162",
  "86",
  "159",
  "128",
  "98",
  "155",
  "178"
];
const EXPECTED_AUDIO = [
  "39:pro-exodus-minimal-migration",
  "159:con-dispute-determinism-rationality-link",
  "98:con-possibility-feasibility-gap"
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
  "prepared-and-frozen-three-post-canary-batch-15-local-audio-source-work-items-standing-authorization-active-for-audio-preparation"
);
assert.equal(
  work.status,
  "prepared-three-post-canary-batch-15-local-audio-source-work-items-standing-authorization-active-for-audio-preparation"
);
assert.equal(preparation.developmentValidationOnly, false);
assert.equal(preparation.productionCanary, false);
assert.equal(preparation.batchNumber, 15);
assert.equal(preparation.stagingOnly, true);
assert.equal(work.productionCanary, false);
assert.equal(work.batchNumber, 15);
assert.equal(work.stagingOnly, true);
assert.equal(preparation.userAuthorization.workItemsAuthorized, 3);
assert.equal(
  preparation.userAuthorization.directIncrementalCostUsdMaximum,
  0
);
assert.equal(preparation.userAuthorization.audioAccessAuthorizedForNextStage, true);
assert.equal(preparation.userAuthorization.audioDownloadAuthorizedForNextStage, true);
assert.equal(preparation.userAuthorization.audioPlaybackAuthorized, false);
assert.equal(preparation.workArtifact.path, workPath);
assert.equal(preparation.workArtifact.sha256, sha256(workBytes));
assert.equal(preparation.sources.length, 3);
assert.equal(preparation.totals.debates, 3);
assert.equal(preparation.totals.sourceVideoIds, 3);
assert.equal(preparation.totals.moves, 3);
assert.equal(work.moves.length, 3);
assert.deepEqual(work.moves.map(queueKey).sort(), [...EXPECTED_AUDIO].sort());
assert.equal(work.mediaFilesAccessed, 0);
assert.equal(work.audioFilesDownloaded, 0);
assert.equal(work.audioFilesPlayed, 0);
assert.equal(work.sourceAudioPrepared, false);
assert.equal(work.audioVerificationCompleted, false);
assert.equal(work.modelOrApiCallsMade, 0);
assert.equal(work.paidServiceCallsMade, 0);
assert.equal(work.scoresDerived, 0);
assert.equal(preparation.inputBoundary.mediaFilesAccessed, 0);
assert.equal(preparation.inputBoundary.networkAccessUsed, false);
assert.equal(preparation.inputBoundary.audioDownloaded, false);
assert.equal(preparation.inputBoundary.audioPlayed, false);
assert.equal(preparation.inputBoundary.audioClaimsMade, 0);
assert.equal(preparation.validation.exactAuthorizedMoveCount, 3);
assert.equal(
  preparation.validation.canonicalLocalTextAndMetadataChainsVerified,
  3
);
assert.equal(preparation.validation.repositoryRenderedLockedExcerpts, 3);
assert.equal(preparation.validation.repositoryRenderedTimestampWindows, 3);
assert.equal(preparation.validation.expectedSpeakersLocked, 3);
assert.equal(
  preparation.sourceCompatibility.status,
  "all-source-rows-have-positive-repository-lexical-token-count"
);
assert.equal(preparation.sourceCompatibility.sourceRowsInjected, 0);
assert.equal(preparation.sourceCompatibility.sourceRowsOmitted, 0);
assert.equal(preparation.sourceCompatibility.sourceRowsRewritten, 0);
assert.equal(
  preparation.sourceCompatibility.minimumCandidateLexicalTokensChanged,
  false
);
assert.equal(preparation.sourceCompatibility.occurrences.length, 0);
assert.equal(preparation.validation.mediaFilesAccessed, 0);
assert.equal(preparation.validation.audioClaimsMade, 0);
assert.equal(preparation.validation.modelOrApiCallsMade, 0);
assert.equal(preparation.validation.paidServiceCallsMade, 0);
assert.equal(preparation.validation.scoresDerived, 0);
assert.equal(preparation.totals.mediaFilesAccessed, 0);
assert.equal(preparation.totals.sourceDownloads, 0);
assert.equal(preparation.totals.sourceAudioFilesPrepared, 0);
assert.equal(preparation.totals.clipsPrepared, 0);
assert.equal(preparation.totals.audioFilesPlayed, 0);
assert.equal(preparation.totals.audioCalls, 0);
assert.equal(preparation.totals.paidServiceCalls, 0);
assert.equal(preparation.totals.paidTranscriptionCalls, 0);
assert.equal(preparation.totals.transcriptionCostUsd, 0);
assert.equal(preparation.totals.modelContexts, 0);
assert.equal(preparation.totals.meteredModelApiCostUsd, 0);
assert.equal(preparation.totals.directIncrementalCostUsd, 0);
assert.equal(preparation.totals.retries, 0);
assert.equal(preparation.totals.timeoutExtensions, 0);
assert.equal(preparation.totals.adjudicationContexts, 0);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.totals.publicationReconstructions, 0);
assert.equal(preparation.totals.productionMutations, 0);
assert.equal(preparation.totals.nextBatchSelections, 0);
assert.equal(preparation.activePolicy.version, "v2.2");
assert.equal(
  preparation.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie,
  true
);
assert.equal(preparation.activePolicy.scorePassesMaximum, 1);
assert.equal(preparation.validatedInventoryContract.scoreFieldsAvailable, false);
for (const authorization of [preparation.authorization, work.authorization]) {
  assert.equal(authorization.localAudioSourcePreparation, true);
  assert.equal(authorization.audioAccess, true);
  assert.equal(authorization.audioDownload, true);
  assert.equal(
    Object.entries(authorization)
      .filter(([key]) =>
        !["localAudioSourcePreparation", "audioAccess", "audioDownload"].includes(key)
      )
      .every(([, value]) => value === false),
    true
  );
}
assert.equal(
  preparation.nextAuthorizedAction,
  "prepare-local-batch-15-source-audio-and-three-frozen-clips-under-standing-authorization"
);

for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(
    sha256(await readFile(file)),
    digest,
    `source hash mismatch: ${file}`
  );
}

const replayed = [];
for (const debateNumber of EXPECTED_DEBATES) {
  const context = executionPreparation.contexts.find(
    (item) =>
      item.debateNumber === debateNumber && item.reviewerPass === "A"
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
    ...buildAssessmentProductionPostCanaryBatch15AudioWorkItems(
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
  assert.equal(
    item.evidenceOwnership,
    "repository-rendered-from-locked-source-span"
  );
  assert.equal("sourceAudio" in item, false);
  assert.equal("clipPath" in item, false);
  assert.equal("audioVerificationResult" in item, false);
}
assert.doesNotMatch(
  JSON.stringify(work),
  /\.(?:mp3|m4a|wav|aac|flac|ogg|opus|webm|mp4)\b/i
);

assert.deepEqual((await readdir(ROOT)).sort(), [
  "analysis.json",
  "audio-work-item-preparation.json",
  "audio-work-items.json",
  "disagreements"
]);
assert.deepEqual(
  (await readdir(`${ROOT}/disagreements`)).sort(),
  EXPECTED_DEBATES.map((debate) => `debate-${debate}.json`).sort()
);

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
      audioFilesPlayed: 0,
      audioCalls: 0,
      modelContexts: 0,
      paidServiceCalls: 0,
      adjudicationContexts: 0,
      scoresDerived: 0,
      publicationReconstructions: 0,
      productionMutations: 0,
      nextBatchSelections: 0,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
