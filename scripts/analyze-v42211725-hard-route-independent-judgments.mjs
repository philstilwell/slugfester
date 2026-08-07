#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/calibration/v4.2.21.17.25/hard-route-independent-judgments";
const shouldWrite = process.argv.includes("--write");
const manifest = JSON.parse(await readFile(`${ROOT}/execution-manifest.json`, "utf8"));
const execution = JSON.parse(await readFile(manifest.artifacts.execution, "utf8"));
assertV4(execution.contextsPlanned === 10 && execution.retries === 0 && execution.scoresDerived === 0, "hard-route execution crossed its preregistered boundary");

const contexts = [];
for (const result of execution.results) {
  if (!result.accepted) {
    contexts.push({ contextIndex: result.contextIndex, debateNumber: result.debateNumber, reviewerPass: result.reviewerPass, accepted: false, status: result.status, elapsedMs: result.elapsedMs, failure: result.timedOut ? "timeout" : result.validatorStderrTail ?? result.error ?? result.status });
    continue;
  }
  const context = manifest.contexts[result.contextIndex];
  const [raw, validation] = await Promise.all([context.rawOutput, context.validationOutput].map((file) => readFile(file, "utf8").then(JSON.parse)));
  contexts.push({ contextIndex: result.contextIndex, debateNumber: result.debateNumber, reviewerPass: result.reviewerPass, accepted: true, status: result.status, elapsedMs: result.elapsedMs, moves: raw.moves.length, judgmentSha256: result.judgmentSha256, rawOutputSha256: result.rawOutputSha256, lockedInventorySha256: result.lockedInventorySha256, mediumConfidenceMoves: validation.mediumConfidenceMoves, lowConfidenceMoves: validation.lowConfidenceMoves, belowHighConfidenceMoves: validation.belowHighConfidenceMoves, unchangedV4220ValidatorPassed: validation.unchangedV4220ValidatorPassed, semanticRepairPerformed: validation.semanticRepairPerformed, scoresDerived: validation.scoresDerived });
}
const debateNumbers = ["51", "63", "90", "153", "165"];
const pairs = [];
for (const debateNumber of debateNumbers) {
  const pair = contexts.filter((context) => context.debateNumber === debateNumber);
  const manifestPair = manifest.contexts.filter((context) => context.debateNumber === debateNumber);
  const inventory = JSON.parse(await readFile(manifestPair[0].lockedInventory, "utf8"));
  const repositoryBelowHighAttributionMoves = inventory.moves.filter((move) => move.attributionConfidence !== "high").map((move) => move.moveId);
  const judgmentBelowHighConfidenceMoves = [...new Set(pair.flatMap((context) => context.belowHighConfidenceMoves ?? []))].sort();
  const audioVerificationMoveIds = [...new Set([...repositoryBelowHighAttributionMoves, ...judgmentBelowHighConfidenceMoves])].sort();
  pairs.push({ debateNumber, contexts: pair.length, passes: pair.map((context) => context.reviewerPass).sort(), bothAccepted: pair.length === 2 && pair.every((context) => context.accepted), separateOutputHashes: pair.length === 2 && pair.every((context) => context.judgmentSha256) && pair[0].judgmentSha256 !== pair[1].judgmentSha256, sameLockedInventory: pair.length === 2 && pair[0].lockedInventorySha256 === pair[1].lockedInventorySha256, repositoryBelowHighAttributionMoves, judgmentBelowHighConfidenceMoves, audioVerificationMoveIds, audioVerificationRequiredBeforeAdjudication: audioVerificationMoveIds.length > 0 });
}
const passed = execution.status === "ten-hard-route-independent-judgment-contexts-passed" && execution.contextsAttempted === 10 && execution.validContexts === 10 && contexts.every((context) => context.accepted && context.unchangedV4220ValidatorPassed && context.semanticRepairPerformed === false && context.scoresDerived === 0) && pairs.every((pair) => pair.bothAccepted && pair.sameLockedInventory && pair.separateOutputHashes);
const analysis = {
  schemaVersion: "4.2.21.17.25-hard-route-independent-judgment-gate-analysis",
  protocolId: manifest.protocolId,
  status: passed ? "ten-hard-route-independent-judgments-passed-disagreement-extraction-authorized" : "hard-route-independent-judgment-gate-failed-analysis-only",
  calibrationOnly: true,
  AIOnly: true,
  execution: { contextsPlanned: 10, contextsAttempted: execution.contextsAttempted, validContexts: execution.validContexts, invalidContexts: execution.invalidContexts, unattemptedContextIndexes: execution.unattemptedContextIndexes, retries: 0, maximumObservedConcurrency: execution.maximumObservedConcurrency, wallElapsedMs: execution.wallElapsedMs, aggregateModelElapsedMs: execution.aggregateModelElapsedMs, meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoresDerived: 0 },
  contexts,
  pairs,
  acceptance: { tenValidContexts: execution.validContexts === 10, sameLockedInventoryEveryPair: pairs.every((pair) => pair.sameLockedInventory), separatePassOutputEveryPair: pairs.every((pair) => pair.separateOutputHashes), unchangedV4220ValidatorPasses: contexts.filter((context) => context.unchangedV4220ValidatorPassed).length, semanticRepairs: contexts.filter((context) => context.semanticRepairPerformed).length, scores: 0, passed },
  audioVerificationQueue: pairs.flatMap((pair) => pair.audioVerificationMoveIds.map((moveId) => ({ debateNumber: pair.debateNumber, moveId, requiredBeforeAdjudication: true }))),
  authorization: { disagreementExtraction: passed, audioVerificationPreparation: false, adjudicationPreparation: false, scoreDerivation: false, productionMutation: false, all195Debates: false },
};
if (shouldWrite) await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, execution: analysis.execution, pairs, acceptance: analysis.acceptance, audioVerificationQueueLength: analysis.audioVerificationQueue.length, authorization: analysis.authorization }, null, 2));
