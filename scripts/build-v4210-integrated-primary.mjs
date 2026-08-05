#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { parseLedger } from "./lib/v429-long-context-partition.mjs";

const ROOT = "docs/calibration/v4.2.10/integrated-long-context-primary";
const shouldWrite = process.argv.includes("--write");
const compilerRoot = "docs/calibration/v4.2.9.3/partition-compiler-recovery";
const compiler = JSON.parse(await readFile(`${compilerRoot}/analysis.json`, "utf8"));
assertV4(compiler.status === "partition-compiler-recovery-passed-integrated-primary-preparation-authorized" && compiler.authorization.integratedPrimaryPreparation, "v4.2.9.3 authorization unavailable");
const packetPath = "docs/calibration/v4.2.6/conservative-excerpt-retired-completion/packets/debate-99.json";
const packet = JSON.parse(await readFile(packetPath, "utf8"));
const fullLedgerBytes = await readFile(packet.transportChain.sourceLedgerPath);
const fullRows = parseLedger(fullLedgerBytes);
const candidates = [];
for (const output of compiler.outputs) {
  const proposal = JSON.parse(await readFile(output.derivedOutput, "utf8"));
  for (const candidate of proposal.candidates) candidates.push({ chunkId: output.chunk.chunkId, qualifiedCandidateId: `${output.chunk.chunkId}:${candidate.candidateId}`, ...candidate });
}
assertV4(candidates.length === compiler.candidates.total, "candidate bundle count mismatch");
const included = new Set();
for (const candidate of candidates) for (let event = Math.max(0, candidate.sourceSpan.startEvent - 12); event <= Math.min(fullRows.length - 1, candidate.sourceSpan.endEvent + 12); event += 1) included.add(event);
const selectedEventIds = [...included].sort((left, right) => left - right);
const sparseRows = selectedEventIds.map((eventId) => fullRows[eventId]);
const ranges = [];
for (const eventId of selectedEventIds) {
  const prior = ranges.at(-1);
  if (prior && prior.endEvent + 1 === eventId) prior.endEvent = eventId;
  else ranges.push({ startEvent: eventId, endEvent: eventId });
}
const bundlePath = `${ROOT}/candidate-bundle.json`, sparsePath = `${ROOT}/candidate-context-ledger.jsonl`;
if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(bundlePath, `${JSON.stringify({ schemaVersion: "4.2.10-candidate-bundle", debateNumber: "99", completeSourceDiscovery: compiler.sourceCoverage, candidateCount: candidates.length, candidates }, null, 2)}\n`);
  await writeFile(sparsePath, Buffer.from(sparseRows.map(JSON.stringify).join("\n") + "\n"));
}
const inputs = { rubricBase: "docs/reassessment-rubric-v4.0.md", rubricDerivedScores: "docs/reassessment-rubric-v4.0.1.md", rubricBounded: "docs/reassessment-rubric-v4.1.md", manual: `${ROOT}/manual.md`, schema: "docs/calibration/v4.2.6/conservative-excerpt-retired-completion/schema.json", packet: packetPath, candidateBundle: bundlePath, candidateContextLedger: sparsePath };
const inputBytes = (await Promise.all(Object.values(inputs).map((file) => stat(file).then((entry) => entry.size)))).reduce((sum, bytes) => sum + bytes, 0);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = { schemaVersion: "4.2.10-integrated-primary-preparation", protocolId: "v4.2.10-integrated-long-context-primary", status: shouldWrite ? "prepared-one-integrated-long-context-primary" : "preview", developmentOnly: true, AIOnly: true, debateNumber: "99", model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 }, source: { compilerAnalysis: `${compilerRoot}/analysis.json`, compilerOutputs: compiler.outputs.map((output) => output.derivedOutput), fullLedger: packet.transportChain.sourceLedgerPath, originalEvents: packet.sourceChain.eventsPath }, inputs, sparseContext: { originalEvents: packet.eventCount, deliveredEvents: sparseRows.length, deliveredFraction: Number((sparseRows.length / packet.eventCount).toFixed(4)), contiguousRanges: ranges, allCandidateSpansIncluded: candidates.every((candidate) => { for (let event = candidate.sourceSpan.startEvent; event <= candidate.sourceSpan.endEvent; event += 1) if (!included.has(event)) return false; return true; }), sparseLedgerSha256: sha256(Buffer.from(sparseRows.map(JSON.stringify).join("\n") + "\n")) }, output: `${ROOT}/primary-output.json`, compiledOutput: `${ROOT}/primary-compiled.json`, policy: { oneAttempt: true, retries: 0, timeoutMs: 1200000, scoreDerivationAuthorized: false, distributedTranscriptCoverage: true, fullLedgerDeliveredToIntegratedJudge: false }, totals: { candidates: candidates.length, copiedInputBytes: inputBytes, modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, authorization: { executionManifest: false, integratedPrimaryExecution: false, validation: true, scoring: false, productionMutation: false } };
if (shouldWrite) await writeFile(`${ROOT}/preparation-manifest.json`, `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, candidates: candidates.length, sparseEvents: sparseRows.length, originalEvents: packet.eventCount, sparseDeliveredFraction: preparation.sparseContext.deliveredFraction, copiedInputKilobytes: Math.round(inputBytes / 1000), modelContextsExecuted: 0, meteredApiCostUsdMaximum: 0 }, null, 2));
