#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V429_CHUNKS, V429_MODEL, V429_PROTOCOL_ID, V429_ROOT, makeV429ProposalSchema, parseLedger, validateV429ChunkLedger } from "./lib/v429-long-context-partition.mjs";

const shouldWrite = process.argv.includes("--write");
const priorRoot = "docs/calibration/v4.2.8/correction-aware-retired-continuation";
const [analysis, execution, packet, fullLedgerBytes] = await Promise.all([
  readFile(`${priorRoot}/primary-analysis.json`, "utf8").then(JSON.parse),
  readFile(`${priorRoot}/model-execution.json`, "utf8").then(JSON.parse),
  readFile("docs/calibration/v4.2.6/conservative-excerpt-retired-completion/packets/debate-99.json", "utf8").then(JSON.parse),
  readFile(".assessment-cache/compact-ledgers/v4.2.4/debate-99.jsonl")
]);
assertV4(analysis.status === "retired-primary-continuation-blocked-noncorrectable-failure", "v4.2.8 timeout analysis unavailable");
const failed = execution.results.find((result) => result.debateNumber === "99");
assertV4(failed?.status === "timed-out" && failed.rawOutputWritten === false && failed.attemptCount === 1 && failed.retryCount === 0, "Debate 99 timeout record unavailable");

const fullRows = parseLedger(fullLedgerBytes);
const chunks = [];
for (const chunk of V429_CHUNKS) {
  const chunkPath = `${V429_ROOT}/chunks/${chunk.chunkId}.jsonl`;
  const rows = fullRows.slice(chunk.startEvent, chunk.endEvent + 1);
  const bytes = Buffer.from(rows.map(JSON.stringify).join("\n") + "\n");
  if (shouldWrite) {
    await mkdir(`${V429_ROOT}/chunks`, { recursive: true });
    await writeFile(chunkPath, bytes);
  }
  const validation = validateV429ChunkLedger(bytes, fullLedgerBytes, chunk);
  chunks.push({ ...chunk, chunkPath, chunkSha256: createHash("sha256").update(bytes).digest("hex"), rows: validation.rows, bytes: validation.bytes, rawOutput: `${V429_ROOT}/proposals/${chunk.chunkId}.json` });
}
assertV4(chunks[0].startEvent === 0 && chunks.at(-1).endEvent === packet.eventCount - 1 && chunks[0].endEvent >= chunks[1].startEvent, "v4.2.9 chunks do not provide overlapping complete coverage");

const schemaPath = `${V429_ROOT}/schema.json`;
if (shouldWrite) {
  await mkdir(V429_ROOT, { recursive: true });
  await writeFile(schemaPath, `${JSON.stringify(makeV429ProposalSchema(), null, 2)}\n`);
}
const preparation = {
  schemaVersion: "4.2.9-long-context-partition-preparation",
  protocolId: V429_PROTOCOL_ID,
  status: shouldWrite ? "prepared-two-overlapping-score-blind-chunks" : "preview",
  developmentOnly: true,
  AIOnly: true,
  debateNumber: "99",
  model: { ...V429_MODEL, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  source: { packet: "docs/calibration/v4.2.6/conservative-excerpt-retired-completion/packets/debate-99.json", fullLedger: packet.transportChain.sourceLedgerPath, originalEvents: packet.sourceChain.eventsPath, v428Execution: `${priorRoot}/model-execution.json`, v428Analysis: `${priorRoot}/primary-analysis.json` },
  modelInputs: { selectionRubric: "docs/reassessment-rubric-v4.1.md", manual: `${V429_ROOT}/manual.md`, schema: schemaPath, packet: "docs/calibration/v4.2.6/conservative-excerpt-retired-completion/packets/debate-99.json" },
  chunks,
  coverage: { originalEvents: packet.eventCount, jointlyCoveredEvents: packet.eventCount, overlapStartEvent: chunks[1].startEvent, overlapEndEvent: chunks[0].endEvent, overlapEvents: chunks[0].endEvent - chunks[1].startEvent + 1, complete: true },
  policy: { scoreBlindSourceDiscoveryOnly: true, contexts: 2, attemptsPerContext: 1, retriesMaximum: 0, timeoutMs: 900000, finalSelectionDeferred: true, scoresAuthorized: false },
  authorization: { executionManifest: false, twoProposalContexts: false, mergePreparation: false, scoreDerivation: false, productionMutation: false }
};
if (shouldWrite) await writeFile(`${V429_ROOT}/preparation-manifest.json`, `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, debateNumber: "99", chunks: chunks.map(({ chunkId, startEvent, endEvent, rows, bytes }) => ({ chunkId, startEvent, endEvent, rows, bytes })), overlapEvents: preparation.coverage.overlapEvents, completeCoverage: true, scoresAuthorized: false, meteredApiCostUsdMaximum: 0 }, null, 2));
