#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V429_ROOT, makeV429ProposalSchema, validateV429ChunkLedger } from "./lib/v429-long-context-partition.mjs";

const preparation = JSON.parse(await readFile(`${V429_ROOT}/preparation-manifest.json`, "utf8"));
assertV4(preparation.status === "prepared-two-overlapping-score-blind-chunks" && preparation.coverage.complete, "v4.2.9 preparation invalid");
const fullLedgerBytes = await readFile(preparation.source.fullLedger);
for (const chunk of preparation.chunks) {
  validateV429ChunkLedger(await readFile(chunk.chunkPath), fullLedgerBytes, chunk);
  await access(chunk.rawOutput).then(() => { throw new Error(`${chunk.rawOutput} already exists`); }, () => true);
}
const schema = JSON.parse(await readFile(preparation.modelInputs.schema, "utf8"));
assertV4(JSON.stringify(schema) === JSON.stringify(makeV429ProposalSchema()), "v4.2.9 schema drift");
assertV4(preparation.chunks[0].startEvent === 0 && preparation.chunks.at(-1).endEvent === preparation.coverage.originalEvents - 1, "v4.2.9 incomplete boundary coverage");
console.log(JSON.stringify({ status: "passed", chunks: 2, exactSourceSlices: 2, completeCoverage: true, overlapEvents: preparation.coverage.overlapEvents, futureOutputsAbsent: 2, scoresAuthorized: false }, null, 2));
