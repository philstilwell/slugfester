#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildBatch07PublicationRepairSchema,
  POST_CANARY_BATCH_07_PUBLICATION_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_07_PUBLICATION_REPAIR_ROOT
} from "./lib/assessment-production-post-canary-batch-07-publication-repair.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const ROOT = POST_CANARY_BATCH_07_PUBLICATION_REPAIR_ROOT;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const manifest = JSON.parse(await readFile(path.resolve(MANIFEST), "utf8"));

assertV4(manifest.protocolId === POST_CANARY_BATCH_07_PUBLICATION_REPAIR_PROTOCOL_ID &&
  manifest.status === "frozen-one-context-batch-07-publication-repair-prepared-not-activated" &&
  manifest.contexts?.length === 1 && manifest.diagnosis?.failedFields === 2 &&
  manifest.repairContract?.writableFieldsMaximumPerPacket === 2 &&
  manifest.repairContract?.eachOriginalFieldAcceptedExactlyOnce === true &&
  manifest.model?.slug === "gpt-5.6-sol" && manifest.model?.reasoningEffort === "low" &&
  manifest.model?.authentication === "ChatGPT subscription" &&
  manifest.executionPolicy?.attemptsPerContext === 1 &&
  manifest.executionPolicy?.retriesMaximum === 0 &&
  manifest.executionPolicy?.timeoutExtensionsMaximum === 0 &&
  canonicalJson(manifest.executionPolicy?.schedulerRamp) === canonicalJson([1]) &&
  new Set(manifest.contexts.flatMap((row) => row.writableFields)).size === 2 &&
  manifest.contexts.every((row) => row.writableFieldCount >= 1 &&
    row.writableFieldCount <= 2 && row.copiedInputBytes <= 400000),
"Batch 7 repair preparation boundary changed");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `${file}: repair preparation source drifted`);
for (const context of manifest.contexts) {
  const packetBytes = await readFile(path.resolve(context.packet));
  const schemaBytes = await readFile(path.resolve(context.schema));
  const packet = JSON.parse(packetBytes);
  const schema = JSON.parse(schemaBytes);
  assertV4(sha256(packetBytes) === context.packetSha256 &&
    sha256(schemaBytes) === context.schemaSha256 &&
    canonicalJson(schema) === canonicalJson(buildBatch07PublicationRepairSchema(packet)) &&
    canonicalJson(packet.constraints.writableFields) === canonicalJson(context.writableFields),
  `${context.packetId}: packet or schema changed`);
}
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes)
  assertV4(!(await exists(future)), `future repair output exists: ${future}`);
console.log(JSON.stringify({ status: "passed-batch-07-publication-repair-preparation",
  contexts: 1, writableFields: 2, packetAndSchemaHashesPassed: 2,
  sourceHashesPassed: Object.keys(manifest.sourceHashes).length,
  futureOutputsAbsent: manifest.futureOutputPathsExcludedFromSourceHashes.length,
  directIncrementalCostUsd: 0 }, null, 2));
