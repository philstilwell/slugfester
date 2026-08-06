#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { compileV42219CandidateBundle, parseV42219Ledger, serializeV42219Rows, validateV42219Discovery, V42219_ROOT } from "./lib/v42219-generalized-partition.mjs";

const shouldWrite = process.argv.includes("--write");
const manifest = JSON.parse(await readFile(`${V42219_ROOT}/discovery-execution-manifest.json`, "utf8"));
const execution = JSON.parse(await readFile(manifest.artifacts.execution, "utf8"));
assertV4(execution.status === "twelve-score-blind-discovery-contexts-passed" && execution.validContexts === manifest.contexts.length && execution.retries === 0, "all frozen discovery contexts must pass without retry");
const preparation = JSON.parse(await readFile(manifest.preparation, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const debates = [];
for (const context of preparation.contexts) {
  const [packet, plan, eventsBytes, fullLedgerBytes] = await Promise.all([context.packet, context.plan, context.originalEvents, context.fullLedger].map((file) => readFile(file)).map(async (promise, index) => index < 2 ? JSON.parse(await promise) : promise));
  const outputs = [];
  for (const chunk of context.chunks) {
    const [output, chunkBytes] = await Promise.all([readFile(chunk.rawOutput, "utf8").then(JSON.parse), readFile(chunk.chunkLedgerPath)]);
    validateV42219Discovery(output, { packet, chunk, plan, eventsDocument: JSON.parse(eventsBytes), eventsBytes, chunkBytes, fullLedgerBytes });
    outputs.push(output);
  }
  const bundle = compileV42219CandidateBundle({ packet, plan, outputs });
  const pro = bundle.candidates.filter((candidate) => candidate.side === "pro").length;
  const con = bundle.candidates.filter((candidate) => candidate.side === "con").length;
  assertV4(bundle.candidateCount >= manifest.compilationPolicy.candidateMinimumPerDebate && pro >= manifest.compilationPolicy.candidateMinimumPerSide && con >= manifest.compilationPolicy.candidateMinimumPerSide, `${context.debateNumber}: discovered candidate inventory cannot support the structural primary minimum`);
  const rows = parseV42219Ledger(fullLedgerBytes);
  const included = new Set();
  for (const candidate of bundle.candidates) for (let event = Math.max(0, candidate.sourceSpan.startEvent - manifest.compilationPolicy.sparseContextFlankEvents); event <= Math.min(rows.length - 1, candidate.sourceSpan.endEvent + manifest.compilationPolicy.sparseContextFlankEvents); event += 1) included.add(event);
  const sparseRows = [...included].sort((left, right) => left - right).map((event) => rows[event]);
  const sparseBytes = serializeV42219Rows(sparseRows);
  const bundlePath = `${V42219_ROOT}/candidate-bundles/debate-${context.debateNumber}.json`;
  const sparsePath = `${V42219_ROOT}/candidate-context/debate-${context.debateNumber}.jsonl`;
  if (shouldWrite) {
    await mkdir(path.dirname(bundlePath), { recursive: true });
    await mkdir(path.dirname(sparsePath), { recursive: true });
    await writeFile(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`);
    await writeFile(sparsePath, sparseBytes);
  }
  debates.push({ debateNumber: context.debateNumber, debateId: context.debateId, chunks: context.chunks.length, candidates: bundle.candidateCount, pro, con, constructive: bundle.candidates.filter((candidate) => candidate.moveKind === "constructive").length, reply: bundle.candidates.filter((candidate) => candidate.moveKind === "reply").length, mediumAttributionCandidates: bundle.candidates.filter((candidate) => candidate.attributionConfidence === "medium").length, lowAttributionCandidates: bundle.candidates.filter((candidate) => candidate.attributionConfidence === "low").length, bundlePath, bundleSha256: sha256(Buffer.from(`${JSON.stringify(bundle, null, 2)}\n`)), sparsePath, sparseEvents: sparseRows.length, sparseBytes: sparseBytes.length, sparseSha256: sha256(sparseBytes), candidateSpansIncluded: bundle.candidates.every((candidate) => { for (let event = candidate.sourceSpan.startEvent; event <= candidate.sourceSpan.endEvent; event += 1) if (!included.has(event)) return false; return true; }), semanticDeduplicationPerformed: false });
}
const analysis = { schemaVersion: "4.2.21.11-partition-discovery-analysis", protocolId: manifest.protocolId, status: "partition-discovery-passed-primary-a-preparation-authorized", calibrationOnly: true, AIOnly: true, debates, audit: { frozenContexts: manifest.contexts.length, validContexts: execution.validContexts, invalidContexts: execution.invalidContexts, retries: execution.retries, everySourceEventOwnedExactlyOnce: true, exactChunkReplay: true, repositoryDerivedMoveKind: true, silentSemanticDeduplication: false, candidateBundlesInventoryFeasible: true, scoresDerived: 0 }, totals: { candidates: debates.reduce((sum, debate) => sum + debate.candidates, 0), sparseEvents: debates.reduce((sum, debate) => sum + debate.sparseEvents, 0), totalElapsedMs: execution.totalElapsedMs, modelContextsExecuted: execution.contextsAttempted, meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoresDerived: 0 }, authorization: { primaryAPacketPreparation: true, primaryAModelExecution: false, passBModelExecution: false, audioExecution: false, adjudicationModelExecution: false, scoreDerivation: false, publicationFinalization: false, productionMutation: false, all195Debates: false } };
if (shouldWrite) await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, debates, totals: analysis.totals, primaryAPacketPreparationAuthorized: true }, null, 2));
