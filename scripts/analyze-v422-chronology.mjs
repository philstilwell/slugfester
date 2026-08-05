#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, canonicalJson } from "./lib/v41-lean-production.mjs";
import { V422_ROOT, compileV422PrimaryOutput, validateV422PrimaryOutput } from "./lib/v422-chronology-first.mjs";

const shouldWrite = process.argv.includes("--write");
const [preparation, manifest, execution] = await Promise.all(["preparation-manifest.json", "execution-manifest.json", "model-execution.json"].map((file) => readFile(path.resolve(V422_ROOT, file), "utf8").then(JSON.parse)));
assertV4(execution.status === "chronology-smoke-execution-passed" && execution.validContexts === 1 && execution.retries === 0 && execution.authorization.analysis, "passed v4.2.2 chronology smoke unavailable");
const packet = JSON.parse(await readFile(manifest.context.packet, "utf8"));
const [rawOutput, compiledOutput, eventsBytes, ledgerBytes] = await Promise.all([readFile(manifest.context.rawOutput, "utf8").then(JSON.parse), readFile(manifest.context.compiledOutput, "utf8").then(JSON.parse), readFile(manifest.context.originalEvents), readFile(manifest.context.sourceLedger)]);
const eventsDocument = JSON.parse(eventsBytes);
const validation = validateV422PrimaryOutput(rawOutput, packet, eventsDocument, eventsBytes, ledgerBytes);
const replay = compileV422PrimaryOutput(rawOutput, packet, eventsDocument);
assertV4(canonicalJson(replay) === canonicalJson(compiledOutput), "v4.2.2 compiled output replay mismatch");
const passed = execution.result.elapsedMs <= manifest.executionPolicy.timeoutMs && validation.chronologyFirst.targetEdgesReferenceEarlierEmittedMoves && validation.compactTransport.replayExact;
const analysis = {
  schemaVersion: "4.2.2-chronology-first-smoke-analysis",
  protocolId: manifest.protocolId,
  status: passed ? "chronology-smoke-passed-new-fresh-gate-preparation-authorized" : "chronology-smoke-failed",
  developmentOnly: true,
  debateNumber: "07",
  validation,
  deterministicCompilationReplayPassed: true,
  runtime: { elapsedMs: execution.result.elapsedMs, elapsedMinutes: Number((execution.result.elapsedMs / 60000).toFixed(2)), timeoutMs: manifest.executionPolicy.timeoutMs, completedInsideTimeout: execution.result.elapsedMs <= manifest.executionPolicy.timeoutMs },
  transport: preparation.transport,
  topology: { nestedMoveArraysRemoved: true, chronologicalTopLevelMovesPassed: validation.chronologyFirst.status === "passed", targetEdgesReferenceEarlierEmittedMoves: validation.chronologyFirst.targetEdgesReferenceEarlierEmittedMoves, automaticRetargetingPerformed: false, failedV421OutputAvailableToJudge: false },
  comparisonToV421: { v421ElapsedMs: 254778, v421TransportClean: true, v421DeterministicValidationPassed: false, v421FailureClass: "future-target-cross-reference", v422CompletedValid: passed },
  totals: { attempts: 1, retries: 0, modelContexts: 1, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0, scoresDerived: 0, legacyComparatorsOpened: 0 },
  authorization: { newDisjointFreshGatePreparation: passed, newDisjointFreshGateModelExecution: false, scoreDerivation: false, legacyComparison: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(V422_ROOT, "analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, debateNumber: "07", elapsedMinutes: analysis.runtime.elapsedMinutes, chronologyFirstValidationPassed: analysis.topology.chronologicalTopLevelMovesPassed, targetEdgesReferenceEarlierEmittedMoves: analysis.topology.targetEdgesReferenceEarlierEmittedMoves, deterministicCompilationReplayPassed: true, newDisjointFreshGatePreparation: analysis.authorization.newDisjointFreshGatePreparation, scoreDerivationAuthorized: false, meteredApiCostUsd: 0 }, null, 2));
