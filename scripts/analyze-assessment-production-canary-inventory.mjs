#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/assessment-production/canary-v1-inventory";
const shouldWrite = process.argv.includes("--write");
const manifest = JSON.parse(await readFile(`${ROOT}/execution-manifest.json`, "utf8"));
const execution = JSON.parse(await readFile(manifest.artifacts.execution, "utf8"));
assertV4(
  execution.status === "ten-production-canary-score-blind-inventory-contexts-passed" &&
    execution.validContexts === 10 &&
    execution.invalidContexts === 0 &&
    execution.retries === 0 &&
    execution.rampPassed === true,
  "all ten inventory contexts must pass without retry before analysis"
);

const debates = [];
for (const result of execution.results) {
  const context = manifest.contexts[result.contextIndex];
  const [inventory, validation] = await Promise.all([
    readFile(context.lockedInventoryOutput, "utf8").then(JSON.parse),
    readFile(context.validationOutput, "utf8").then(JSON.parse)
  ]);
  debates.push({
    debateNumber: result.debateNumber,
    debateId: context.debateId,
    family: context.family,
    sourceComplexityBand: context.sourceComplexityBand,
    candidatesAvailable: context.candidates,
    sections: inventory.sections.length,
    moves: inventory.moves.length,
    proMoves: inventory.moves.filter((move) => move.side === "pro").length,
    conMoves: inventory.moves.filter((move) => move.side === "con").length,
    constructive: inventory.moves.filter((move) => move.moveKind === "constructive").length,
    replies: inventory.moves.filter((move) => move.moveKind === "reply").length,
    belowHighAttributionMoveIds: validation.belowHighAttributionMoveIds,
    belowHighAttributionMovesRequireAudioVerification: true,
    lockedInventory: context.lockedInventoryOutput,
    lockedInventorySha256: result.lockedInventorySha256,
    finalEvidenceSourceExact: validation.finalEvidenceSourceExact,
    ratingsAbsent: validation.ratingsAbsent,
    responseTopologyAbsent: validation.responseTopologyAbsent,
    elapsedMs: result.elapsedMs
  });
}
assertV4(
  debates.every((debate) =>
    debate.sections >= 4 &&
    debate.sections <= 6 &&
    debate.moves >= 8 &&
    debate.moves <= 24 &&
    debate.proMoves >= 4 &&
    debate.conMoves >= 4 &&
    debate.finalEvidenceSourceExact &&
    debate.ratingsAbsent &&
    debate.responseTopologyAbsent
  ),
  "locked inventory acceptance drifted"
);

const belowHighAttributionMoveIds = debates.flatMap((debate) =>
  debate.belowHighAttributionMoveIds.map((moveId) => ({ debateNumber: debate.debateNumber, moveId }))
);
const analysis = {
  schemaVersion: "1.0-production-canary-score-blind-inventory-analysis",
  protocolId: manifest.protocolId,
  status: "ten-production-canary-score-blind-inventories-passed-independent-judgment-packet-preparation-authorized",
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  independentJudgmentEvidenceHeldOut: true,
  execution: {
    contextsPlanned: 10,
    contextsAttempted: execution.contextsAttempted,
    validContexts: execution.validContexts,
    invalidContexts: execution.invalidContexts,
    retries: 0,
    schedulerRamp: execution.schedulerRamp,
    rampPhases: execution.rampPhases,
    maximumParallelContextsObserved: execution.maximumParallelContextsObserved,
    wallElapsedMs: execution.wallElapsedMs,
    modelWorkElapsedMs: execution.modelWorkElapsedMs
  },
  debates,
  acceptance: {
    tenValidInventories: true,
    tenDeterministicCompilations: true,
    everyDiscoveredCandidateAvailableToCurator: true,
    semanticRepairs: 0,
    ratings: 0,
    responseTopology: 0,
    scores: 0,
    passed: true
  },
  audioPolicy: {
    selectedBelowHighAttributionMoveRequiresVerification: true,
    mediumConfidenceAlwaysRequiresVerification: true,
    pendingVerificationMoves: belowHighAttributionMoveIds,
    audioCallsThisStage: 0
  },
  totals: {
    debates: debates.length,
    candidatesAvailable: debates.reduce((sum, debate) => sum + debate.candidatesAvailable, 0),
    movesLocked: debates.reduce((sum, debate) => sum + debate.moves, 0),
    proMoves: debates.reduce((sum, debate) => sum + debate.proMoves, 0),
    conMoves: debates.reduce((sum, debate) => sum + debate.conMoves, 0),
    pendingAudioVerificationMoves: belowHighAttributionMoveIds.length,
    modelContextsExecuted: execution.contextsAttempted,
    audioCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0
  },
  authorization: {
    independentJudgmentPacketPreparation: true,
    independentJudgmentModelExecution: false,
    disagreementExtraction: false,
    paidTranscription: false,
    audioVerification: false,
    adjudicationExecution: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  }
};

if (shouldWrite) await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({
  status: analysis.status,
  execution: analysis.execution,
  debates,
  totals: analysis.totals,
  nextAuthorized: "independent-judgment-packet-preparation",
  independentJudgmentModelExecutionAuthorized: false,
  scoresDerived: 0,
  productionMutationAuthorized: false
}, null, 2));
