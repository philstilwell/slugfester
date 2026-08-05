#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { validateV429Proposal, validateV429ChunkLedger } from "./lib/v429-long-context-partition.mjs";
import { V4292_ROOT, makeV4292ProposalSchema } from "./lib/v4292-adaptive-partition.mjs";

const preparation = JSON.parse(await readFile(`${V4292_ROOT}/preparation-manifest.json`, "utf8"));
assertV4(preparation.status === "prepared-preserved-first-plus-two-smaller-continuations" && preparation.coverage.complete, "v4.2.9.2 preparation invalid");
const [schema, packet, eventsBytes, fullLedgerBytes, inherited, inheritedChunkBytes] = await Promise.all([
  readFile(preparation.modelInputs.schema, "utf8").then(JSON.parse),
  readFile(preparation.source.packet, "utf8").then(JSON.parse),
  readFile(preparation.source.originalEvents),
  readFile(preparation.source.fullLedger),
  readFile(preparation.inherited.derivedOutput, "utf8").then(JSON.parse),
  readFile(preparation.inherited.sourceChunk.chunkPath)
]);
assertV4(JSON.stringify(schema) === JSON.stringify(makeV4292ProposalSchema()), "v4.2.9.2 schema drift");
validateV429Proposal(inherited, packet, preparation.inherited.sourceChunk, JSON.parse(eventsBytes), eventsBytes, inheritedChunkBytes, fullLedgerBytes);
for (const chunk of preparation.chunks) {
  validateV429ChunkLedger(await readFile(chunk.chunkPath), fullLedgerBytes, chunk);
  await access(chunk.rawOutput).then(() => { throw new Error(`${chunk.rawOutput} already exists`); }, () => true);
}
console.log(JSON.stringify({ status: "passed", inheritedCandidatesValidated: inherited.candidates.length, explicitlyDerivedCandidateFields: preparation.inherited.changedCandidateIds.length, exactNewSourceSlices: 2, completeCoverage: true, futureOutputsAbsent: 2, scoresAuthorized: false }, null, 2));
