#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  DEBATE_157_REPAIR_RESUMPTION_1_PACKET_INDEXES,
  DEBATE_157_REPAIR_RESUMPTION_1_PROTOCOL_ID,
  DEBATE_157_REPAIR_RESUMPTION_1_ROOT
} from "./lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair-resumption-1.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const MANIFEST = `${DEBATE_157_REPAIR_RESUMPTION_1_ROOT}/execution-preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifest = JSON.parse(await readFile(path.resolve(MANIFEST), "utf8"));
assertV4(
  manifest.protocolId === DEBATE_157_REPAIR_RESUMPTION_1_PROTOCOL_ID &&
    manifest.status === "frozen-seven-unattempted-debate-157-publication-repair-contexts-prepared-for-resumption" &&
    manifest.contexts?.length === 7 &&
    canonicalJson(manifest.contexts.map(({ packetIndex }) => packetIndex)) === canonicalJson(DEBATE_157_REPAIR_RESUMPTION_1_PACKET_INDEXES) &&
    manifest.contexts.every((context) => context.writableFieldCount === 2) &&
    new Set(manifest.contexts.flatMap((context) => context.writableFields)).size === 14 &&
    manifest.model?.label === "5.6 Sol" &&
    manifest.model?.reasoningEffort === "low" &&
    manifest.model?.authentication === "ChatGPT subscription" &&
    manifest.executionPolicy?.attemptsPerContext === 1 &&
    manifest.executionPolicy?.retriesMaximum === 0 &&
    manifest.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    manifest.executionPolicy?.maximumParallelContexts === 2 &&
    canonicalJson(manifest.executionPolicy?.schedulerRamp) === canonicalJson([1, 2]) &&
    manifest.authorization?.modelExecution === false &&
    Object.values(manifest.stopRules).every(Boolean),
  "the seven-context repair resumption controls changed"
);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: frozen resumption source drifted`);
}
for (const context of manifest.contexts) {
  assertV4(sha256(await readFile(path.resolve(context.packet))) === context.packetSha256, `packet ${context.packetIndex} hash changed`);
  assertV4(sha256(await readFile(path.resolve(context.schema))) === context.schemaSha256, `schema ${context.packetIndex} hash changed`);
}
assertV4(
  manifest.isolation?.correction2OutputUnavailableToModels === true &&
    manifest.isolation?.failedPacket0OutputUnavailableToModels === true &&
    manifest.hashLocks?.originalSevenPacketsAndSchemas.length === 7 &&
    manifest.hashLocks?.acceptedCorrectionOutput.sha256 === manifest.sourceHashes[manifest.hashLocks.acceptedCorrectionOutput.path] &&
    manifest.hashLocks?.validator.sha256 === manifest.sourceHashes[manifest.hashLocks.validator.path] &&
    manifest.hashLocks?.mergeRule.sha256 === manifest.sourceHashes[manifest.hashLocks.mergeRule.path],
  "the resumption hash locks or isolation boundary changed"
);
console.log(JSON.stringify({ status: "passed", contexts: 7, packetIndexes: DEBATE_157_REPAIR_RESUMPTION_1_PACKET_INDEXES, writableFields: 14, schedulerRamp: [1, 2], directIncrementalCostUsd: 0 }, null, 2));
