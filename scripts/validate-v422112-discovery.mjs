#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { validateV422112Discovery } from "./lib/v422112-simplified-discovery.mjs";

const [outputPath, preparationPath, debateNumber, chunkId] = process.argv.slice(2);
assertV4(outputPath && preparationPath && debateNumber && chunkId, "usage: validate-v422112-discovery.mjs OUTPUT PREPARATION DEBATE_NUMBER CHUNK_ID");
const preparation = JSON.parse(await readFile(preparationPath, "utf8"));
const context = preparation.contexts.find((item) => item.debateNumber === debateNumber);
assertV4(context, `${debateNumber}: successor context missing`);
const chunk = context.chunks.find((item) => item.chunkId === chunkId);
assertV4(chunk, `${debateNumber}/${chunkId}: successor chunk missing`);
const [output, packet, plan, eventsBytes, chunkBytes, fullLedgerBytes] = await Promise.all([outputPath, context.packet, context.plan, context.originalEvents, chunk.chunkLedgerPath, context.fullLedger].map((file) => readFile(file)).map(async (promise, index) => index < 3 ? JSON.parse(await promise) : promise));
const validation = validateV422112Discovery(output, { packet, chunk, plan, eventsDocument: JSON.parse(eventsBytes), eventsBytes, chunkBytes, fullLedgerBytes });
console.log(JSON.stringify({ status: validation.status, debateNumber, chunkId, candidates: validation.candidates, localTargetIdsModelAuthored: validation.localTargetIdsModelAuthored, primaryAOwnsSelectedTargetTopology: validation.primaryAOwnsSelectedTargetTopology, scoresDerived: validation.scoresDerived }, null, 2));
