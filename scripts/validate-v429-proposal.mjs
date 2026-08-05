#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { validateV429Proposal } from "./lib/v429-long-context-partition.mjs";

const [outputPath, preparationPath, chunkId] = process.argv.slice(2);
if (!outputPath || !preparationPath || !chunkId) throw new Error("usage: validate-v429-proposal.mjs OUTPUT PREPARATION CHUNK_ID");
const preparation = JSON.parse(await readFile(preparationPath, "utf8"));
const chunk = preparation.chunks.find((item) => item.chunkId === chunkId);
if (!chunk) throw new Error(`unknown chunk ${chunkId}`);
const [output, packet, eventsBytes, chunkBytes, fullLedgerBytes] = await Promise.all([
  readFile(outputPath, "utf8").then(JSON.parse),
  readFile(preparation.source.packet, "utf8").then(JSON.parse),
  readFile(preparation.source.originalEvents),
  readFile(chunk.chunkPath),
  readFile(preparation.source.fullLedger)
]);
console.log(JSON.stringify(validateV429Proposal(output, packet, chunk, JSON.parse(eventsBytes), eventsBytes, chunkBytes, fullLedgerBytes), null, 2));
