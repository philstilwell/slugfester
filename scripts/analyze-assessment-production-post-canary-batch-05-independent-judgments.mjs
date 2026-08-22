#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch05StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-05-standing-authorization.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-05/independent-judgments";
const shouldWrite = process.argv.includes("--write");
const activation = JSON.parse(
  await readFile(`${ROOT}/execution-activation.json`, "utf8")
);
const standingAuthorization =
  await loadAndValidatePostCanaryBatch05StandingAuthorization();
const execution = JSON.parse(
  await readFile(activation.artifacts.execution, "utf8")
);
assertV4(
  activation.status ===
      "frozen-twenty-post-canary-batch-05-independent-judgment-contexts-authorized" &&
    activation.developmentValidationOnly === false &&
    activation.productionCanary === false &&
    activation.batchNumber === 5 &&
    activation.authorization.deterministicAnalysis === true &&
    activation.authorization.disagreementExtraction === false &&
    activation.authorization.audioVerification === false &&
    activation.authorization.adjudicationExecution === false &&
    activation.authorization.scoreDerivation === false &&
    activation.authorization.publicationModelExecution === false &&
    activation.authorization.productionMutation === false &&
    activation.activePolicy.version === "v2.2" &&
    activation.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie ===
      true &&
    activation.activePolicy.agreedInitialTieImposesNoDirectionConstraint ===
      true &&
    activation.activePolicy.scorePassesMaximum === 1 &&
    activation.sourceCompatibility?.status ===
      "all-source-rows-have-positive-repository-lexical-token-count" &&
    activation.sourceCompatibility?.sourceRowsInjected === 0 &&
    activation.sourceCompatibility?.sourceRowsOmitted === 0 &&
    activation.sourceCompatibility?.sourceRowsRewritten === 0 &&
    activation.sourceCompatibility?.minimumCandidateLexicalTokensChanged ===
      false &&
    activation.sourceCompatibility?.occurrences?.length === 0 &&
    activation.userAuthorization?.standingAuthorization ===
      POST_CANARY_BATCH_05_STANDING_AUTHORIZATION &&
    activation.userAuthorization?.standingAuthorizationSha256 ===
      standingAuthorization.sha256 &&
    JSON.stringify(execution.sourceCompatibility) ===
      JSON.stringify(activation.sourceCompatibility) &&
    execution.contextsPlanned === 20 &&
    execution.attempts === execution.contextsAttempted &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.semanticCorrections === 0 &&
    execution.modelAuthoredScores === 0 &&
    execution.scoresDerived === 0,
  "Batch 5 judgment execution crossed its frozen boundary"
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
      failure: result.timedOut
        ? "timeout"
        : result.validationMessage ?? result.error ?? result.status,
    });
    continue;
  }
  const context = activation.contexts[result.contextIndex];
  const [raw, validation] = await Promise.all([
    readFile(context.rawOutput, "utf8").then(JSON.parse),
    readFile(context.validationOutput, "utf8").then(JSON.parse),
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
    preparedSourceHashesVerified: validation.preparedSourceHashesVerified,
    originalEventHashVerified: validation.originalEventHashVerified,
    canonicalEventProjectionReplayed:
      validation.canonicalEventProjectionReplayed,
    sourceCompatibilityPreserved:
      validation.sourceCompatibilityPreserved,
    unchangedV4220ValidatorPassed:
      validation.unchangedV4220ValidatorPassed,
    semanticRepairPerformed: validation.semanticRepairPerformed,
    modelAuthoredScores: validation.modelAuthoredScores,
    scoresDerived: validation.scoresDerived,
  });
}

const debateNumbers = [
  ...new Set(activation.contexts.map((context) => context.debateNumber)),
];
const pairs = [];
for (const debateNumber of debateNumbers) {
  const pair = contexts.filter(
    (context) => context.debateNumber === debateNumber
  );
  const manifestPair = activation.contexts.filter(
    (context) => context.debateNumber === debateNumber
  );
  const inventory = JSON.parse(
    await readFile(manifestPair[0].lockedInventory, "utf8")
  );
  const repositoryBelowHighAttributionMoves = inventory.moves
    .filter((move) => move.attributionConfidence !== "high")
    .map((move) => move.moveId)
    .sort();
  const judgmentBelowHighConfidenceMoves = [
    ...new Set(
      pair.flatMap((context) => context.belowHighConfidenceMoves ?? [])
    ),
  ].sort();
  const audioVerificationMoveIds = [
    ...new Set([
      ...repositoryBelowHighAttributionMoves,
      ...judgmentBelowHighConfidenceMoves,
    ]),
  ].sort();
  pairs.push({
    debateNumber,
    contexts: pair.length,
    passes: pair.map((context) => context.reviewerPass).sort(),
    bothAccepted:
      pair.length === 2 && pair.every((context) => context.accepted),
    separateOutputHashes:
      pair.length === 2 &&
      pair.every((context) => context.judgmentSha256) &&
      pair[0].judgmentSha256 !== pair[1].judgmentSha256,
    sameLockedInventory:
      pair.length === 2 &&
      pair[0].lockedInventorySha256 === pair[1].lockedInventorySha256,
    repositoryBelowHighAttributionMoves,
    judgmentBelowHighConfidenceMoves,
    audioVerificationMoveIds,
    audioVerificationRequiredBeforeAdjudication:
      audioVerificationMoveIds.length > 0,
  });
}

const passed =
  execution.status ===
    "twenty-post-canary-batch-05-independent-judgment-contexts-passed" &&
  execution.contextsAttempted === 20 &&
  execution.validContexts === 20 &&
  contexts.every(
    (context) =>
      context.accepted &&
      context.preparedSourceHashesVerified &&
      context.originalEventHashVerified &&
      context.canonicalEventProjectionReplayed &&
      context.sourceCompatibilityPreserved &&
      context.unchangedV4220ValidatorPassed &&
      context.semanticRepairPerformed === false &&
      context.modelAuthoredScores === 0 &&
      context.scoresDerived === 0
  ) &&
  pairs.every(
    (pair) =>
      pair.bothAccepted &&
      pair.sameLockedInventory &&
      pair.separateOutputHashes
  );
const audioVerificationQueue = pairs.flatMap((pair) =>
  pair.audioVerificationMoveIds.map((moveId) => ({
    debateNumber: pair.debateNumber,
    moveId,
    requiredBeforeAdjudication: true,
  }))
);
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-independent-judgment-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "twenty-post-canary-batch-05-independent-judgments-passed-standing-authorization-active-for-disagreement-extraction"
    : "post-canary-batch-05-independent-judgment-gate-failed-analysis-only",
  developmentValidationOnly: false,
  productionCanary: false,
  batchNumber: 5,
  stagingOnly: true,
  AIOnly: true,
  activePolicy: structuredClone(activation.activePolicy),
  sourceCompatibility: structuredClone(activation.sourceCompatibility),
  validatedInventoryContract: structuredClone(
    activation.validatedInventoryContract
  ),
  execution: {
    contextsPlanned: 20,
    contextsAttempted: execution.contextsAttempted,
    contextsUnattempted: execution.contextsUnattempted,
    validContexts: execution.validContexts,
    invalidContexts: execution.invalidContexts,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    schedulerRamp: execution.schedulerRamp,
    rampPhases: execution.rampPhases,
    maximumParallelContextsObserved:
      execution.maximumParallelContextsObserved,
    wallElapsedMs: execution.wallElapsedMs,
    modelWorkElapsedMs: execution.modelWorkElapsedMs,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    modelAuthoredScores: 0,
    scoresDerived: 0,
  },
  contexts,
  pairs,
  acceptance: {
    twentyValidContexts: execution.validContexts === 20,
    sameLockedInventoryEveryPair: pairs.every(
      (pair) => pair.sameLockedInventory
    ),
    separatePassOutputEveryPair: pairs.every(
      (pair) => pair.separateOutputHashes
    ),
    preparedSourceHashReplays: contexts.filter(
      (context) => context.preparedSourceHashesVerified
    ).length,
    unchangedV4220ValidatorPasses: contexts.filter(
      (context) => context.unchangedV4220ValidatorPassed
    ).length,
    canonicalEventProjectionReplays: contexts.filter(
      (context) => context.canonicalEventProjectionReplayed
    ).length,
    semanticRepairs: contexts.filter(
      (context) => context.semanticRepairPerformed
    ).length,
    modelAuthoredScores: 0,
    scores: 0,
    passed,
  },
  audioPolicy: {
    selectedBelowHighAttributionMoveRequiresVerification: true,
    mediumConfidenceAlwaysRequiresVerification: true,
    queue: audioVerificationQueue,
    queueCompiledDeterministicallyWithoutAudioAccess: true,
    audioCallsThisStage: 0,
  },
  totals: {
    debates: pairs.length,
    contexts: contexts.length,
    uniqueMoves: activation.contexts
      .filter((context) => context.reviewerPass === "A")
      .reduce((sum, context) => sum + context.moves, 0),
    movesJudgedAcrossPasses: contexts.reduce(
      (sum, context) => sum + (context.moves ?? 0),
      0
    ),
    pendingAudioVerificationMoves: audioVerificationQueue.length,
    modelContextsExecuted: execution.contextsAttempted,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    disagreementFieldsExtracted: 0,
    audioCalls: 0,
    adjudicationModelContexts: 0,
    modelAuthoredScores: 0,
    scoresDerived: 0,
    publicationModelContexts: 0,
    productionMutations: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  authorization: {
    disagreementExtraction: false,
    independentJudgmentModelExecution: false,
    audioVerificationPreparation: false,
    paidTranscription: false,
    unexpectedPaidService: false,
    adjudicationPreparation: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationFinalization: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false,
  },
  nextAuthorizedAction: passed
    ? "extract-freeze-and-analyze-batch-05-disagreements-under-standing-authorization"
    : "stop-post-canary-batch-05-independent-judgment-gate-for-audit",
};
if (shouldWrite) {
  await writeFile(
    activation.artifacts.analysis,
    `${JSON.stringify(analysis, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: analysis.status,
      execution: analysis.execution,
      acceptance: analysis.acceptance,
      audioVerificationQueueLength: audioVerificationQueue.length,
      disagreementFieldsExtracted: 0,
      authorization: analysis.authorization,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
