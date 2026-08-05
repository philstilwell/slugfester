#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, canonicalJson } from "./lib/v41-lean-production.mjs";
import { V42_ROOT, compileV42PrimaryOutput, validateV42PrimaryOutput } from "./lib/v42-compact-transport.mjs";

const shouldWrite = process.argv.includes("--write");
const [preparation, manifest, execution] = await Promise.all(["preparation-manifest.json", "execution-manifest.json", "model-execution.json"].map((file) => readFile(path.resolve(V42_ROOT, file), "utf8").then(JSON.parse)));
assertV4(execution.status === "transport-smoke-execution-passed" && execution.validContexts === 1 && execution.retries === 0 && execution.authorization.analysis, "passed v4.2 compact transport smoke unavailable");
const packet = JSON.parse(await readFile(manifest.context.packet, "utf8"));
const [rawOutput, compiledOutput, eventsBytes, ledgerBytes] = await Promise.all([readFile(manifest.context.rawOutput, "utf8").then(JSON.parse), readFile(manifest.context.compiledOutput, "utf8").then(JSON.parse), readFile(manifest.context.originalEvents), readFile(manifest.context.sourceLedger)]);
const eventsDocument = JSON.parse(eventsBytes);
const validation = validateV42PrimaryOutput(rawOutput, packet, eventsDocument, eventsBytes, ledgerBytes);
const replay = compileV42PrimaryOutput(rawOutput, packet, eventsDocument);
assertV4(canonicalJson(replay) === canonicalJson(compiledOutput), "v4.2 compact compiled output replay mismatch");
const passed = execution.result.elapsedMs <= manifest.executionPolicy.timeoutMs && preparation.transport.reductionShare > 0.4 && validation.compactTransport.replayExact;
const analysis = {
  schemaVersion: "4.2-compact-transport-smoke-analysis",
  protocolId: manifest.protocolId,
  status: passed ? "transport-smoke-passed-fresh-gate-preparation-authorized" : "transport-smoke-failed",
  developmentOnly: true,
  debateNumber: "180",
  validation,
  deterministicCompilationReplayPassed: true,
  runtime: { elapsedMs: execution.result.elapsedMs, elapsedMinutes: Number((execution.result.elapsedMs / 60000).toFixed(2)), timeoutMs: manifest.executionPolicy.timeoutMs, completedInsideTimeout: execution.result.elapsedMs <= manifest.executionPolicy.timeoutMs },
  transport: preparation.transport,
  comparisonToV419: { v419ElapsedMs: 1800096, v419TimedOut: true, v42Completed: true, copiedInputReductionShare: preparation.transport.reductionShare },
  totals: { attempts: 1, retries: 0, modelContexts: 1, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0, scoresDerived: 0, legacyComparatorsOpened: 0 },
  authorization: { newDisjointFreshGatePreparation: passed, newDisjointFreshGateModelExecution: false, scoreDerivation: false, legacyComparison: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(V42_ROOT, "analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, debateNumber: "180", elapsedMinutes: analysis.runtime.elapsedMinutes, sourceLedgerReplayExact: validation.compactTransport.replayExact, deterministicCompilationReplayPassed: true, inputReductionShare: preparation.transport.reductionShare, newDisjointFreshGatePreparation: analysis.authorization.newDisjointFreshGatePreparation, scoreDerivationAuthorized: false, meteredApiCostUsd: 0 }, null, 2));
