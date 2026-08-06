#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V422116_ROOT } from "./lib/v422116-decomposed-consensus.mjs";

const shouldWrite = process.argv.includes("--write");
const manifest = JSON.parse(await readFile(`${V422116_ROOT}/inventory-execution-manifest.json`, "utf8"));
const execution = JSON.parse(await readFile(manifest.artifacts.execution, "utf8"));
assertV4(execution.contextsAttempted === 3 && execution.retries === 0 && execution.scoresDerived === 0, "inventory execution is incomplete or crossed its boundary");
const debates = [];
for (const result of execution.results) {
  const context = manifest.contexts.find((item) => item.debateNumber === result.debateNumber);
  if (!result.accepted) {
    debates.push({ debateNumber: result.debateNumber, status: result.status, elapsedMs: result.elapsedMs, accepted: false, failure: result.timedOut ? "timeout" : result.validationMessage ?? result.status });
    continue;
  }
  const [inventory, validation] = await Promise.all([context.lockedInventoryOutput, context.validationOutput].map((file) => readFile(file, "utf8").then(JSON.parse)));
  debates.push({ debateNumber: result.debateNumber, status: result.status, elapsedMs: result.elapsedMs, accepted: true, sections: inventory.sections.length, moves: inventory.moves.length, proMoves: inventory.moves.filter((move) => move.side === "pro").length, conMoves: inventory.moves.filter((move) => move.side === "con").length, replies: inventory.moves.filter((move) => move.moveKind === "reply").length, mediumOrLowAttributionMoves: inventory.moves.filter((move) => move.attributionConfidence !== "high").map((move) => move.moveId), finalEvidenceSourceExact: validation.finalEvidenceSourceExact, ratingsAbsent: validation.ratingsAbsent, responseTopologyAbsent: validation.responseTopologyAbsent });
}
const passed = execution.validContexts === 3 && debates.every((debate) => debate.accepted && debate.finalEvidenceSourceExact && debate.ratingsAbsent && debate.responseTopologyAbsent);
const analysis = {
  schemaVersion: "4.2.21.16.1-score-blind-inventory-gate-analysis",
  protocolId: manifest.protocolId,
  status: passed ? "retired-partition-three-inventory-gate-passed-independent-judgment-preparation-authorized" : "retired-partition-three-inventory-gate-failed-analysis-only",
  calibrationOnly: true,
  AIOnly: true,
  execution: { contextsPlanned: 3, contextsAttempted: 3, validContexts: execution.validContexts, invalidContexts: execution.invalidContexts, retries: 0, totalElapsedMs: execution.totalElapsedMs, meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoresDerived: 0 },
  debates,
  acceptance: { threeValidInventories: execution.validContexts === 3, threeDeterministicCompilations: debates.filter((debate) => debate.accepted).length === 3, semanticRepairs: 0, ratings: 0, responseTopology: 0, scores: 0, passed },
  interpretation: passed ? { scoreBlindCurationOperational: true, partitionTranscriptCoveragePreserved: true, monolithicCrossFieldFailuresEliminatedAtInventoryStage: true, sameLockedInventoryCanNowBePreparedForTwoIndependentJudgments: true } : { scoreBlindCurationOperational: false, independentJudgmentPreparationRecommended: false },
  authorization: { independentJudgmentPreparation: passed, independentJudgmentExecutionManifest: false, independentJudgmentModelExecution: false, disagreementExtraction: false, audioVerification: false, adjudication: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, execution: analysis.execution, debates, acceptance: analysis.acceptance, authorization: analysis.authorization }, null, 2));
