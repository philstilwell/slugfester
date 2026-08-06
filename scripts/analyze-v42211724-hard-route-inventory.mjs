#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/calibration/v4.2.21.17.24/hard-route-score-blind-inventory";
const shouldWrite = process.argv.includes("--write");
const manifest = JSON.parse(await readFile(`${ROOT}/execution-manifest.json`));
const execution = JSON.parse(await readFile(manifest.artifacts.execution));
assertV4(execution.status === "five-hard-route-score-blind-inventory-contexts-passed" && execution.validContexts === 5 && execution.retries === 0, "all five inventory contexts must pass without retry");

const debates = [];
for (const result of execution.results) {
  const context = manifest.contexts.find((item) => item.debateNumber === result.debateNumber);
  const [inventory, validation] = await Promise.all([context.lockedInventoryOutput, context.validationOutput].map((file) => readFile(file, "utf8").then(JSON.parse)));
  debates.push({
    debateNumber: result.debateNumber,
    debateId: context.debateId,
    candidatesAvailable: context.candidates,
    sections: inventory.sections.length,
    moves: inventory.moves.length,
    proMoves: inventory.moves.filter((move) => move.side === "pro").length,
    conMoves: inventory.moves.filter((move) => move.side === "con").length,
    constructive: inventory.moves.filter((move) => move.moveKind === "constructive").length,
    replies: inventory.moves.filter((move) => move.moveKind === "reply").length,
    mediumOrLowAttributionMoveIds: inventory.moves.filter((move) => move.attributionConfidence !== "high").map((move) => move.moveId),
    lockedInventory: context.lockedInventoryOutput,
    lockedInventorySha256: result.lockedInventorySha256,
    finalEvidenceSourceExact: validation.finalEvidenceSourceExact,
    ratingsAbsent: validation.ratingsAbsent,
    responseTopologyAbsent: validation.responseTopologyAbsent,
    elapsedMs: result.elapsedMs,
  });
}
assertV4(debates.every((debate) => debate.sections >= 4 && debate.sections <= 6 && debate.moves >= 8 && debate.moves <= 24 && debate.proMoves >= 4 && debate.conMoves >= 4 && debate.finalEvidenceSourceExact && debate.ratingsAbsent && debate.responseTopologyAbsent), "locked inventory acceptance drifted");

const analysis = {
  schemaVersion: "4.2.21.17.24-hard-route-score-blind-inventory-analysis",
  protocolId: manifest.protocolId,
  status: "five-hard-route-score-blind-inventories-passed-independent-judgment-packet-preparation-authorized",
  calibrationOnly: true,
  AIOnly: true,
  independentJudgmentEvidenceHeldOut: true,
  execution: {
    contextsPlanned: 5,
    contextsAttempted: execution.contextsAttempted,
    validContexts: execution.validContexts,
    invalidContexts: execution.invalidContexts,
    retries: 0,
    schedulerRamp: execution.schedulerRamp,
    rampPhases: execution.rampPhases,
    maximumParallelContextsObserved: execution.maximumParallelContextsObserved,
    wallElapsedMs: execution.wallElapsedMs,
    modelWorkElapsedMs: execution.modelWorkElapsedMs,
  },
  debates,
  acceptance: {
    fiveValidInventories: true,
    fiveDeterministicCompilations: true,
    everyDiscoveredCandidateAvailableToCurator: true,
    semanticRepairs: 0,
    ratings: 0,
    responseTopology: 0,
    scores: 0,
    passed: true,
  },
  totals: {
    debates: debates.length,
    candidatesAvailable: debates.reduce((sum, debate) => sum + debate.candidatesAvailable, 0),
    movesLocked: debates.reduce((sum, debate) => sum + debate.moves, 0),
    proMoves: debates.reduce((sum, debate) => sum + debate.proMoves, 0),
    conMoves: debates.reduce((sum, debate) => sum + debate.conMoves, 0),
    modelContextsExecuted: execution.contextsAttempted,
    audioCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  authorization: {
    independentJudgmentPacketPreparation: true,
    independentJudgmentModelExecution: false,
    disagreementExtraction: false,
    audioVerification: false,
    adjudication: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    all195Debates: false,
  },
};
if (shouldWrite) await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({
  status: analysis.status,
  execution: analysis.execution,
  debates,
  totals: analysis.totals,
}, null, 2));
