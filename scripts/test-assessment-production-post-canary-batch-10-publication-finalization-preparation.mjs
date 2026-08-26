#!/usr/bin/env node
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { buildPostCanaryBatch10PublicationFinalization,
  validatePostCanaryBatch10PublicationFinalCandidate,
  POST_CANARY_BATCH_10_PUBLICATION_FINALIZATION_ROOT } from
  "./lib/assessment-production-post-canary-batch-10-publication-finalization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";
const ROOT = POST_CANARY_BATCH_10_PUBLICATION_FINALIZATION_ROOT;
const m = JSON.parse(await readFile(path.resolve(`${ROOT}/preparation-manifest.json`), "utf8"));
const identity = JSON.parse(await readFile(path.resolve(
  "docs/assessment-production/post-canary-continuation-v1/batch-10/deterministic-publication-compilation/production-identity-snapshot.json"), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(m.status === "frozen-post-canary-batch-10-publication-finalization-prepared" &&
  m.contexts?.length === 10 && m.executionPolicy?.deterministicFinalizationPassesMaximum === 1 &&
  m.executionPolicy?.rerunsMaximum === 0 && m.finalizationPolicy?.displayFieldsChangedMaximum === 0,
"Batch 10 finalization preparation changed");
let moves = 0;
for (const context of m.contexts) {
  const [compiledBytes, outputBytes, packetBytes] = await Promise.all([
    readFile(path.resolve(context.compiledInput)), readFile(path.resolve(context.publicationOutput)),
    readFile(path.resolve(context.publicationPacket))]);
  const compiled = JSON.parse(compiledBytes); const output = JSON.parse(outputBytes); const packet = JSON.parse(packetBytes);
  const id = identity.rows.find((row) => row.number === context.debateNumber);
  const built = buildPostCanaryBatch10PublicationFinalization({ compiled,
    compiledPath: context.compiledInput, compiledSha256: sha256(compiledBytes), output, packet, identity: id });
  const validation = validatePostCanaryBatch10PublicationFinalCandidate({
    candidate: built.candidate, provenance: built.provenance, compiled, output, packet, identity: id });
  moves += validation.moves;
  assertV4(sha256(Buffer.from(`${JSON.stringify(built.candidate, null, 2)}\n`)) === context.expectedCandidateSha256,
    `${context.debateNumber}: candidate preview changed`);
}
assertV4(moves === 182, "finalization move count changed");
for (const [file, digest] of Object.entries(m.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `${file}: source hash changed`);
for (const file of m.futureOutputPathsExcludedFromSourceHashes) assertV4(!(await exists(file)), `${file} exists`);
console.log(JSON.stringify({ status: "passed", debates: 10, moves,
  deterministicFinalizationPasses: 0, directIncrementalCostUsd: 0 }, null, 2));

