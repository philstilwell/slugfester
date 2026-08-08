#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/assessment-production/canary-v1-independent-judgments";
const shouldWrite = process.argv.includes("--write");
const manifest = JSON.parse(await readFile(`${ROOT}/execution-manifest.json`, "utf8"));
const execution = JSON.parse(await readFile(manifest.artifacts.execution, "utf8"));
assertV4(
  execution.contextsPlanned === 20 &&
    execution.attempts === execution.contextsAttempted &&
    execution.retries === 0 &&
    execution.scoresDerived === 0,
  "independent-judgment execution crossed its frozen boundary"
);

const contexts = [];
for (const result of execution.results) {
  if (!result.accepted) {
    contexts.push({
      contextIndex: result.contextIndex,
      debateNumber: result.debateNumber,
      reviewerPass: result.reviewerPass,
      accepted: false,
      status: result.status,
      elapsedMs: result.elapsedMs,
      failure: result.timedOut ? "timeout" : result.validationMessage ?? result.error ?? result.status
    });
    continue;
  }
  const context = manifest.contexts[result.contextIndex];
  const [raw, validation] = await Promise.all([
    readFile(context.rawOutput, "utf8").then(JSON.parse),
    readFile(context.validationOutput, "utf8").then(JSON.parse)
  ]);
  contexts.push({
    contextIndex: result.contextIndex,
    debateNumber: result.debateNumber,
    reviewerPass: result.reviewerPass,
    accepted: true,
    status: result.status,
    elapsedMs: result.elapsedMs,
    moves: raw.moves.length,
    judgmentSha256: result.judgmentSha256,
    rawOutputSha256: result.rawOutputSha256,
    lockedInventorySha256: result.lockedInventorySha256,
    mediumConfidenceMoves: validation.mediumConfidenceMoves,
    lowConfidenceMoves: validation.lowConfidenceMoves,
    belowHighConfidenceMoves: validation.belowHighConfidenceMoves,
    originalEventHashVerified: validation.originalEventHashVerified,
    canonicalEventProjectionReplayed: validation.canonicalEventProjectionReplayed,
    unchangedV4220ValidatorPassed: validation.unchangedV4220ValidatorPassed,
    semanticRepairPerformed: validation.semanticRepairPerformed,
    scoresDerived: validation.scoresDerived
  });
}

const debateNumbers = [...new Set(manifest.contexts.map((context) => context.debateNumber))];
const pairs = [];
for (const debateNumber of debateNumbers) {
  const pair = contexts.filter((context) => context.debateNumber === debateNumber);
  const manifestPair = manifest.contexts.filter((context) => context.debateNumber === debateNumber);
  const inventory = JSON.parse(await readFile(manifestPair[0].lockedInventory, "utf8"));
  const repositoryBelowHighAttributionMoves = inventory.moves
    .filter((move) => move.attributionConfidence !== "high")
    .map((move) => move.moveId)
    .sort();
  const judgmentBelowHighConfidenceMoves = [
    ...new Set(pair.flatMap((context) => context.belowHighConfidenceMoves ?? []))
  ].sort();
  const audioVerificationMoveIds = [
    ...new Set([...repositoryBelowHighAttributionMoves, ...judgmentBelowHighConfidenceMoves])
  ].sort();
  pairs.push({
    debateNumber,
    contexts: pair.length,
    passes: pair.map((context) => context.reviewerPass).sort(),
    bothAccepted: pair.length === 2 && pair.every((context) => context.accepted),
    separateOutputHashes: pair.length === 2 &&
      pair.every((context) => context.judgmentSha256) &&
      pair[0].judgmentSha256 !== pair[1].judgmentSha256,
    sameLockedInventory: pair.length === 2 &&
      pair[0].lockedInventorySha256 === pair[1].lockedInventorySha256,
    repositoryBelowHighAttributionMoves,
    judgmentBelowHighConfidenceMoves,
    audioVerificationMoveIds,
    audioVerificationRequiredBeforeAdjudication: audioVerificationMoveIds.length > 0
  });
}

const passed =
  execution.status === "twenty-production-canary-independent-judgment-contexts-passed" &&
  execution.contextsAttempted === 20 &&
  execution.validContexts === 20 &&
  contexts.every((context) =>
    context.accepted &&
    context.originalEventHashVerified &&
    context.canonicalEventProjectionReplayed &&
    context.unchangedV4220ValidatorPassed &&
    context.semanticRepairPerformed === false &&
    context.scoresDerived === 0
  ) &&
  pairs.every((pair) => pair.bothAccepted && pair.sameLockedInventory && pair.separateOutputHashes);
const audioVerificationQueue = pairs.flatMap((pair) =>
  pair.audioVerificationMoveIds.map((moveId) => ({
    debateNumber: pair.debateNumber,
    moveId,
    requiredBeforeAdjudication: true
  }))
);
const analysis = {
  schemaVersion: "1.0-production-canary-independent-judgment-analysis",
  protocolId: manifest.protocolId,
  status: passed
    ? "twenty-production-canary-independent-judgments-passed-disagreement-extraction-authorized"
    : "production-canary-independent-judgment-gate-failed-analysis-only",
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  execution: {
    contextsPlanned: 20,
    contextsAttempted: execution.contextsAttempted,
    contextsUnattempted: execution.contextsUnattempted,
    validContexts: execution.validContexts,
    invalidContexts: execution.invalidContexts,
    retries: 0,
    schedulerRamp: execution.schedulerRamp,
    rampPhases: execution.rampPhases,
    maximumParallelContextsObserved: execution.maximumParallelContextsObserved,
    wallElapsedMs: execution.wallElapsedMs,
    modelWorkElapsedMs: execution.modelWorkElapsedMs,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    scoresDerived: 0
  },
  contexts,
  pairs,
  acceptance: {
    twentyValidContexts: execution.validContexts === 20,
    sameLockedInventoryEveryPair: pairs.every((pair) => pair.sameLockedInventory),
    separatePassOutputEveryPair: pairs.every((pair) => pair.separateOutputHashes),
    unchangedV4220ValidatorPasses: contexts.filter((context) => context.unchangedV4220ValidatorPassed).length,
    canonicalEventProjectionReplays: contexts.filter((context) => context.canonicalEventProjectionReplayed).length,
    semanticRepairs: contexts.filter((context) => context.semanticRepairPerformed).length,
    scores: 0,
    passed
  },
  audioPolicy: {
    selectedBelowHighAttributionMoveRequiresVerification: true,
    mediumConfidenceAlwaysRequiresVerification: true,
    queue: audioVerificationQueue,
    audioCallsThisStage: 0
  },
  totals: {
    debates: pairs.length,
    contexts: contexts.length,
    uniqueMoves: manifest.contexts.reduce((sum, context, index) =>
      sum + (index % 2 === 0 ? context.moves : 0), 0),
    movesJudgedAcrossPasses: contexts.reduce((sum, context) => sum + (context.moves ?? 0), 0),
    pendingAudioVerificationMoves: audioVerificationQueue.length,
    modelContextsExecuted: execution.contextsAttempted,
    audioCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0
  },
  authorization: {
    disagreementExtraction: passed,
    independentJudgmentModelExecution: false,
    audioVerificationPreparation: false,
    paidTranscription: false,
    adjudicationPreparation: false,
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
  pairs,
  acceptance: analysis.acceptance,
  audioVerificationQueueLength: audioVerificationQueue.length,
  authorization: analysis.authorization
}, null, 2));
