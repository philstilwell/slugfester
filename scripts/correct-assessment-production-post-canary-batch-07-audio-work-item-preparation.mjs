#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-07/disagreement-extraction";
const PREPARATION = `${ROOT}/audio-work-item-preparation.json`;
const WORK_ITEMS = `${ROOT}/audio-work-items.json`;
const PREPARATION_PREIMAGE_SHA256 =
  "b2e5b487d7f4c2b7b36e540396a9bc0b0b89ca12ca34fd135cf745f8bc84dc2f";
const WORK_ITEMS_SHA256 =
  "f6403146ed5fb0a3b3db4938d5b669e146f59f62d4e7395c789c02e07c0199c8";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const [preparationBytes, workItemsBytes] = await Promise.all([
  readFile(PREPARATION),
  readFile(WORK_ITEMS),
]);
assertV4(
  sha256(preparationBytes) === PREPARATION_PREIMAGE_SHA256,
  "Batch 7 audio work-item preparation preimage drifted"
);
assertV4(
  sha256(workItemsBytes) === WORK_ITEMS_SHA256,
  "Batch 7 audio work-item artifact drifted"
);
const preparation = JSON.parse(preparationBytes);
const workItems = JSON.parse(workItemsBytes);
assertV4(
  preparation.validation.exactAuthorizedMoveCount === 2 &&
    preparation.totals.moves === 5 &&
    preparation.sources.length === 3 &&
    preparation.validation.canonicalLocalTextAndMetadataChainsVerified === 3 &&
    preparation.validation.repositoryRenderedLockedExcerpts === 5 &&
    preparation.validation.repositoryRenderedTimestampWindows === 5 &&
    preparation.validation.expectedSpeakersLocked === 5 &&
    preparation.totals.mediaFilesAccessed === 0 &&
    preparation.totals.audioFilesPlayed === 0 &&
    preparation.totals.modelContexts === 0 &&
    preparation.totals.paidServiceCalls === 0 &&
    preparation.totals.scoresDerived === 0 &&
    workItems.moves.length === 5 &&
    workItems.mediaFilesAccessed === 0 &&
    workItems.modelOrApiCallsMade === 0,
  "Batch 7 audio work-item correction boundary drifted"
);

const corrected = structuredClone(preparation);
corrected.validation.exactAuthorizedMoveCount = 5;
const correctedBytes = Buffer.from(`${JSON.stringify(corrected, null, 2)}\n`);
assertV4(
  correctedBytes.length === preparationBytes.length,
  "one-digit reporting correction changed artifact byte length"
);
if (shouldWrite) await writeFile(PREPARATION, correctedBytes);

console.log(
  JSON.stringify(
    {
      status: shouldWrite
        ? "batch-07-audio-work-item-exact-move-count-corrected"
        : "preview",
      correctedField: "validation.exactAuthorizedMoveCount",
      preimageValue: 2,
      postimageValue: 5,
      preparationPreimageSha256: PREPARATION_PREIMAGE_SHA256,
      preparationPostimageSha256: sha256(correctedBytes),
      workItemsSha256: WORK_ITEMS_SHA256,
      mediaFilesAccessed: 0,
      audioFilesPlayed: 0,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
    },
    null,
    2
  )
);
