#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_RECOVERY_DEBATES as DEBATES,
  POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_RECOVERY_PROTOCOL_ID as PROTOCOL_ID,
  POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_RECOVERY_ROOT as ROOT,
  buildPublicationTimeoutRecoveryShardSchema
} from "./lib/assessment-production-post-canary-batch-09-publication-resumption-timeout-recovery.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifest = JSON.parse(await readFile(path.resolve(`${ROOT}/execution-preparation-manifest.json`)));
assertV4(manifest.protocolId === PROTOCOL_ID && manifest.status === "frozen-eight-context-batch-09-publication-timeout-recovery-prepared-not-activated" && manifest.batchNumber === 9 && manifest.contexts?.length === 8, "recovery preparation identity changed");
assertV4(manifest.model?.slug === "gpt-5.6-sol" && manifest.model?.reasoningEffort === "low" && manifest.model?.authentication === "ChatGPT subscription", "model controls changed");
assertV4(manifest.executionPolicy?.attemptsPerContext === 1 && manifest.executionPolicy?.retriesMaximum === 0 && manifest.executionPolicy?.timeoutExtensionsMaximum === 0 && manifest.executionPolicy?.recursiveCorrectionsMaximum === 0 && manifest.executionPolicy?.maximumParallelContexts === 2 && canonicalJson(manifest.executionPolicy?.schedulerRamp) === canonicalJson([1, 2]), "execution controls changed");
assertV4(manifest.executionEnvironment?.hostAwakeGuard?.path === "/usr/bin/caffeinate" && canonicalJson(manifest.executionEnvironment?.hostAwakeGuard?.args) === canonicalJson(["-dimsu"]), "host-awake guard changed");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === digest, `source hash mismatch: ${file}`);
for (const debateNumber of DEBATES) {
  const contexts = manifest.contexts.filter((row) => row.debateNumber === debateNumber);
  assertV4(contexts.length === 2 && canonicalJson(contexts.map((row) => row.side)) === canonicalJson(["pro", "con"]), `Debate ${debateNumber}: two side shards required`);
  const packetRows = [];
  for (const context of contexts) {
    const packetBytes = await readFile(path.resolve(context.packet));
    const schemaBytes = await readFile(path.resolve(context.schema));
    assertV4(sha256(packetBytes) === context.packetSha256 && sha256(schemaBytes) === context.schemaSha256, `context ${context.contextIndex}: packet or schema hash changed`);
    const packet = JSON.parse(packetBytes);
    assertV4(canonicalJson(buildPublicationTimeoutRecoveryShardSchema(packet)) === canonicalJson(JSON.parse(schemaBytes)), `context ${context.contextIndex}: schema does not reproduce`);
    assertV4(packet.originalFailedPartialOutputReusable === false && packet.publicationIsScoreLocked && packet.scoresRepositoryOwnedAndImmutable && packet.writableFieldCount === packet.writableFields.length, `context ${context.contextIndex}: packet controls changed`);
    packetRows.push(packet);
  }
  const publicationPacket = packetRows[0].publicationPacket;
  const required = ["summary", "representativeQuotes.pro", "representativeQuotes.con", ...publicationPacket.moves.map((move) => `moveProse.${move.moveId}`), "overallCommentary.pro", "overallCommentary.con", "aiExtension.pro", "aiExtension.con"];
  const actual = packetRows.flatMap((packet) => packet.writableFields);
  assertV4(actual.length === required.length && new Set(actual).size === required.length && canonicalJson([...actual].sort()) === canonicalJson([...required].sort()), `Debate ${debateNumber}: original fields not partitioned exactly once`);
}
console.log(JSON.stringify({ status: "passed", contexts: 8, debates: DEBATES, scoreLocked: true, fieldsDisjointAndComplete: true, hostAwakeGuardAuthenticated: true, attemptsPerContext: 1, retries: 0, directIncrementalCostUsdMaximum: 0 }, null, 2));
