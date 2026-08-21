#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { DEBATE_27_PUBLICATION_REPAIR_FIELDS, DEBATE_27_PUBLICATION_REPAIR_PARTITIONS, DEBATE_27_PUBLICATION_REPAIR_ROOT, buildDebate27RepairSchema } from "./lib/assessment-production-post-canary-batch-03-publication-resumption-3-repair.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const manifest = JSON.parse(await readFile(path.resolve(`${DEBATE_27_PUBLICATION_REPAIR_ROOT}/execution-preparation-manifest.json`), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(
  manifest.status === "frozen-four-bounded-seven-field-debate-27-publication-repair-contexts-prepared" && manifest.contexts?.length === 4 &&
    canonicalJson(manifest.repairContract?.partitions) === canonicalJson(DEBATE_27_PUBLICATION_REPAIR_PARTITIONS) &&
    canonicalJson(manifest.repairContract?.writableFields) === canonicalJson(DEBATE_27_PUBLICATION_REPAIR_FIELDS) &&
    manifest.contexts.every(({ writableFieldCount }) => writableFieldCount >= 1 && writableFieldCount <= 2) &&
    manifest.model?.label === "5.6 Sol" && manifest.model?.reasoningEffort === "low" && manifest.model?.authentication === "ChatGPT subscription" &&
    manifest.executionPolicy?.attemptsPerContext === 1 && manifest.executionPolicy?.retriesMaximum === 0 && manifest.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    manifest.executionPolicy?.maximumParallelContexts === 2 && canonicalJson(manifest.executionPolicy?.schedulerRamp) === canonicalJson([1, 2]) &&
    manifest.authorization?.repairModelExecution === false && Object.values(manifest.stopRules).every(Boolean),
  "the frozen Debate 27 repair controls changed"
);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: frozen repair source drifted`);
for (const context of manifest.contexts) {
  const packetBytes = await readFile(path.resolve(context.packet));
  const schemaBytes = await readFile(path.resolve(context.schema));
  assertV4(sha256(packetBytes) === context.packetSha256 && sha256(schemaBytes) === context.schemaSha256, `packet ${context.packetIndex}: hash changed`);
  assertV4(canonicalJson(JSON.parse(schemaBytes)) === canonicalJson(buildDebate27RepairSchema(JSON.parse(packetBytes))), `packet ${context.packetIndex}: schema no longer reproduces`);
}
assertV4(Object.keys(manifest.acceptedOutputs).length === 9 && manifest.deterministicValidation?.syntheticInMemoryMergePassed === true && manifest.deterministicValidation?.modelAuthoredScores === 0, "the accepted cohort or deterministic repair validation changed");
console.log(JSON.stringify({ status: "passed", contexts: 4, partitions: [2, 2, 2, 1], writableFields: 7, acceptedCohortDebates: 9, schedulerRamp: [1, 2], directIncrementalCostUsd: 0 }, null, 2));
