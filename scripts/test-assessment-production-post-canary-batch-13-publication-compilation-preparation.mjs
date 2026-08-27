#!/usr/bin/env node
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_13_PUBLICATION_COMPILATION_ORDER,
  POST_CANARY_BATCH_13_PUBLICATION_COMPILATION_ROOT,
  validatePostCanaryBatch13CompiledStagingRecord,
  compilePostCanaryBatch13PublicationStagingRecord } from
  "./lib/assessment-production-post-canary-batch-13-publication-compilation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
const ROOT = POST_CANARY_BATCH_13_PUBLICATION_COMPILATION_ROOT;
const m = JSON.parse(await readFile(path.resolve(`${ROOT}/preparation-manifest.json`), "utf8"));
const identity = JSON.parse(await readFile(path.resolve(m.artifacts.identitySnapshot), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(m.status === "frozen-post-canary-batch-13-deterministic-publication-compilation-prepared" &&
  canonicalJson(m.explicitOrder) === canonicalJson(POST_CANARY_BATCH_13_PUBLICATION_COMPILATION_ORDER) &&
  m.contexts?.length === 10 && m.contexts.reduce((sum, row) => sum + row.expectedMoves, 0) === 199 &&
  m.executionPolicy?.deterministicRepositoryCompilationPassesMaximum === 1 &&
  m.executionPolicy?.rerunsMaximum === 0 && m.executionPolicy?.modelContexts === 0 &&
  identity.rows?.length === 10 && identity.legacyScoresIncluded === false,
"Batch 13 compilation preparation changed");
let moves = 0;
for (const context of m.contexts) {
  const [outputBytes, packetBytes] = await Promise.all([
    readFile(path.resolve(context.publicationOutput)), readFile(path.resolve(context.publicationPacket))]);
  assertV4(sha256(outputBytes) === context.publicationOutputSha256 &&
    sha256(packetBytes) === context.publicationPacketSha256, `${context.debateNumber}: input hash changed`);
  const output = JSON.parse(outputBytes); const packet = JSON.parse(packetBytes);
  const row = identity.rows.find((item) => item.number === context.debateNumber);
  const compiled = compilePostCanaryBatch13PublicationStagingRecord({ output, packet, identity: row });
  const validation = validatePostCanaryBatch13CompiledStagingRecord({ compiled, output, packet, identity: row });
  moves += validation.moves;
}
assertV4(moves === 199, "compiled move replay changed");
for (const [file, digest] of Object.entries(m.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `${file}: source hash changed`);
for (const file of m.futureOutputPathsExcludedFromSourceHashes) assertV4(!(await exists(file)), `${file} exists`);
console.log(JSON.stringify({ status: "passed", debates: 10, moves, sourceHashes: Object.keys(m.sourceHashes).length,
  deterministicCompilationPasses: 0, directIncrementalCostUsd: 0 }, null, 2));
