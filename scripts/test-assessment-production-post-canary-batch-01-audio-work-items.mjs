#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

import {
  buildAssessmentProductionPostCanaryBatch01AudioWorkItems
} from "./lib/assessment-production-post-canary-batch-01-audio-work-items.mjs";

const COHORT_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01";
const JUDGMENT_ROOT = `${COHORT_ROOT}/independent-judgments`;
const ROOT = `${COHORT_ROOT}/disagreement-extraction`;
const workPath = `${ROOT}/audio-work-items.json`;
const preparationPath = `${ROOT}/audio-work-item-preparation.json`;
const EXPECTED_DEBATES = [
  "31",
  "94",
  "52",
  "146",
  "91",
  "175",
  "75",
  "72",
  "13",
  "195"
];
const EXPECTED_AUDIO = [
  "175:pro-isolated-tradition-genuine-interpretation",
  "75:con-boundary-intuitions-and-brute-universe",
  "13:con-job-terrifying-submission"
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
  "prepared-and-frozen-three-post-canary-batch-01-local-audio-source-work-items-awaiting-separate-audio-access-approval"
);
assert.equal(
  work.status,
  "prepared-three-post-canary-batch-01-local-audio-source-work-items-awaiting-separate-audio-access-approval"
);
assert.equal(preparation.developmentValidationOnly, false);
assert.equal(preparation.productionCanary, false);
assert.equal(preparation.batchNumber, 1);
assert.equal(preparation.stagingOnly, true);
assert.equal(work.productionCanary, false);
assert.equal(work.batchNumber, 1);
assert.equal(work.stagingOnly, true);
assert.equal(preparation.userAuthorization.workItemsAuthorized, 3);
assert.equal(
  preparation.userAuthorization.directIncrementalCostUsdMaximum,
  0
);
assert.equal(preparation.userAuthorization.audioAccessAuthorized, false);
assert.equal(preparation.userAuthorization.audioDownloadAuthorized, false);
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
assert.equal(
  Object.values(preparation.authorization).every((value) => value === false),
  true
);
assert.equal(Object.values(work.authorization).every((value) => value === false), true);
assert.equal(
  preparation.nextAuthorizedAction,
  "user-approval-required-before-batch-01-local-audio-source-and-clip-preparation"
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
    ...buildAssessmentProductionPostCanaryBatch01AudioWorkItems(
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
