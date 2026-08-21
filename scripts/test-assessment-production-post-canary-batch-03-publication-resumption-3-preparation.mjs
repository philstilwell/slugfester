#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_DEBATES, POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_ROOT } from "./lib/assessment-production-post-canary-batch-03-publication-resumption-3.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const manifest = JSON.parse(await readFile(path.resolve(`${POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_ROOT}/execution-preparation-manifest.json`), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(
  manifest.status === "frozen-five-unattempted-batch-03-publication-contexts-prepared-for-resumption" &&
    canonicalJson(manifest.contexts.map(({ debateNumber }) => debateNumber)) === canonicalJson(POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_DEBATES) &&
    Object.keys(manifest.acceptedOutputs).length === 5 &&
    manifest.model?.label === "5.6 Sol" && manifest.model?.reasoningEffort === "low" && manifest.model?.authentication === "ChatGPT subscription" &&
    manifest.executionPolicy?.attemptsPerContext === 1 && manifest.executionPolicy?.retriesMaximum === 0 && manifest.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    manifest.executionPolicy?.maximumParallelContexts === 2 && canonicalJson(manifest.executionPolicy?.schedulerRamp) === canonicalJson([1, 2]) &&
    manifest.authorization?.publicationModelExecution === false && Object.values(manifest.stopRules).every(Boolean),
  "the five-context publication resumption controls changed"
);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: frozen source drifted`);
for (const context of manifest.contexts) {
  assertV4(sha256(await readFile(path.resolve(context.packet))) === context.packetSha256, `Debate ${context.debateNumber}: packet changed`);
  assertV4(sha256(await readFile(path.resolve(context.schema))) === context.schemaSha256, `Debate ${context.debateNumber}: schema changed`);
}
assertV4(
  Object.values(manifest.acceptedOutputs).every((entry) => entry.replay?.status === "passed") &&
    Object.values(manifest.acceptedOutputs).reduce((sum, entry) => sum + entry.replay.moves, 0) === 103 &&
    manifest.deterministicValidation?.expectedMoves === 200 && manifest.deterministicValidation?.modelAuthoredScores === 0,
  "the accepted cohort or expected ten-debate totals changed"
);
console.log(JSON.stringify({ status: "passed", contexts: 5, debates: POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_DEBATES, acceptedBefore: 5, acceptedMovesBefore: 103, expectedMovesAfter: 200, schedulerRamp: [1, 2], directIncrementalCostUsd: 0 }, null, 2));
