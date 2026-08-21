#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch03PublicationOutput } from "./lib/assessment-production-post-canary-batch-03-publication-validation.mjs";
import { POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_2_ROOT } from "./lib/assessment-production-post-canary-batch-03-publication-resumption-2.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_2_ROOT;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const [preparationBytes, activationBytes, executionBytes] = await Promise.all([
  readFile(path.resolve(PREPARATION)),
  readFile(path.resolve(ACTIVATION)),
  readFile(path.resolve(EXECUTION))
]);
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);

if (shouldWrite) assertV4(!(await exists(ANALYSIS)), `${ANALYSIS} already exists`);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `resumption-2 analysis source hash mismatch: ${file}`
  );
}
assertV4(
  execution.contextsPlanned === 6 &&
    execution.contextsAttempted >= 1 &&
    execution.contextsAttempted <= 6 &&
    execution.contextsUnattempted === 6 - execution.contextsAttempted &&
    execution.attempts === execution.contextsAttempted &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 &&
    execution.meteredApiCostUsd === 0 &&
    execution.paidServiceCallsThisStage === 0 &&
    execution.modelAuthoredScores === 0 &&
    execution.scorePassesExecutedThisStage === 0,
  "the publication resumption-2 execution record changed"
);

const replayRows = [];
for (const result of execution.results) {
  const context = activation.contexts[result.contextIndex];
  assertV4(
    context &&
      context.debateNumber === result.debateNumber &&
      result.attemptCount === 1 &&
      result.retryCount === 0 &&
      result.timeoutExtensionCount === 0 &&
      result.correctionContextCount === 0,
    `context ${result.contextIndex}: execution identity changed`
  );
  if (!result.gateAcceptancePassed) {
    replayRows.push({
      contextIndex: result.contextIndex,
      debateNumber: result.debateNumber,
      status: result.status,
      gateAcceptancePassed: false,
      validationReplayed: false
    });
    continue;
  }
  const [outputBytes, packet] = await Promise.all([
    readFile(path.resolve(context.rawOutput)),
    readFile(path.resolve(context.packet), "utf8").then(JSON.parse)
  ]);
  assertV4(
    sha256(outputBytes) === result.outputSha256,
    `Debate ${result.debateNumber}: output hash changed`
  );
  const validation = validatePostCanaryBatch03PublicationOutput(
    JSON.parse(outputBytes),
    packet
  );
  replayRows.push({
    contextIndex: result.contextIndex,
    debateNumber: result.debateNumber,
    status: result.status,
    gateAcceptancePassed: true,
    validationReplayed: true,
    outputSha256: result.outputSha256,
    validation
  });
}

const cohortRows = [];
let cohortFailureMessage = null;
if (
  execution.contextsAttempted === 6 &&
  execution.validContexts === 6 &&
  execution.invalidContexts === 0 &&
  replayRows.every(({ validationReplayed }) => validationReplayed)
) {
  try {
    for (const accepted of Object.values(preparation.acceptedOutputs)) {
      const [outputBytes, packet] = await Promise.all([
        readFile(path.resolve(accepted.output)),
        readFile(path.resolve(accepted.packet), "utf8").then(JSON.parse)
      ]);
      assertV4(
        sha256(outputBytes) === accepted.outputSha256,
        `Debate ${accepted.debateNumber}: accepted output hash changed`
      );
      cohortRows.push({
        debateNumber: accepted.debateNumber,
        source: "accepted-prior-output",
        validation: validatePostCanaryBatch03PublicationOutput(
          JSON.parse(outputBytes),
          packet
        )
      });
    }
    for (const context of activation.contexts) {
      const [output, packet] = await Promise.all([
        readFile(path.resolve(context.rawOutput), "utf8").then(JSON.parse),
        readFile(path.resolve(context.packet), "utf8").then(JSON.parse)
      ]);
      cohortRows.push({
        debateNumber: context.debateNumber,
        source: "resumption-2-output",
        validation: validatePostCanaryBatch03PublicationOutput(output, packet)
      });
    }
  } catch (error) {
    cohortFailureMessage = (error.stack ?? error.message).slice(-10000);
  }
}

const totals = cohortRows.reduce(
  (sum, row) => ({
    debates: sum.debates + 1,
    moves: sum.moves + row.validation.moves,
    critiques: sum.critiques + row.validation.critiques,
    exactSourceQuotes: sum.exactSourceQuotes + row.validation.quoteExactSourceMatches,
    overallCommentarySides: sum.overallCommentarySides + row.validation.overallCommentarySides,
    aiExtensionSides: sum.aiExtensionSides + row.validation.aiExtensionSides,
    minimumCritiqueCharacters: Math.min(
      sum.minimumCritiqueCharacters,
      row.validation.minimumCritiqueCharacters
    ),
    modelAuthoredScores:
      sum.modelAuthoredScores + row.validation.calculatedScoresAuthoredByModel,
    lockedScoresUnchanged:
      sum.lockedScoresUnchanged && row.validation.lockedScoresUnchanged
  }),
  {
    debates: 0,
    moves: 0,
    critiques: 0,
    exactSourceQuotes: 0,
    overallCommentarySides: 0,
    aiExtensionSides: 0,
    minimumCritiqueCharacters: Infinity,
    modelAuthoredScores: 0,
    lockedScoresUnchanged: true
  }
);
const passed =
  execution.validContexts === 6 &&
  execution.invalidContexts === 0 &&
  totals.debates === 10 &&
  totals.moves === 200 &&
  totals.critiques === 200 &&
  totals.exactSourceQuotes === 20 &&
  totals.overallCommentarySides === 20 &&
  totals.aiExtensionSides === 20 &&
  totals.minimumCritiqueCharacters >= 880 &&
  totals.modelAuthoredScores === 0 &&
  totals.lockedScoresUnchanged === true;

const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-03-publication-resumption-2-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "batch-03-publication-resumption-2-and-complete-ten-debate-cohort-validation-passed"
    : "batch-03-publication-resumption-2-failed-validation",
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  sources: {
    preparation: PREPARATION,
    preparationSha256: sha256(preparationBytes),
    activation: ACTIVATION,
    activationSha256: sha256(activationBytes),
    execution: EXECUTION,
    executionSha256: sha256(executionBytes)
  },
  execution: {
    contextsPlanned: 6,
    contextsAttempted: execution.contextsAttempted,
    contextsUnattempted: execution.contextsUnattempted,
    validContexts: execution.validContexts,
    invalidContexts: execution.invalidContexts,
    attempts: execution.attempts,
    retries: 0,
    timeoutExtensions: 0,
    correctionContexts: 0,
    schedulerRamp: [1, 2],
    maximumObservedConcurrency: execution.maximumObservedConcurrency,
    wallElapsedMs: execution.wallElapsedMs,
    aggregateModelElapsedMs: execution.aggregateModelElapsedMs
  },
  validationReplay: replayRows,
  cohortValidation: {
    passed,
    rows: cohortRows,
    totals,
    failureMessage: cohortFailureMessage
  },
  integrity: {
    participantJudgmentWasScoreBlind: true,
    scoresRemainedImmutable: true,
    everyAcceptedOutputReplayedDeterministically: passed,
    aiExtensionExcludedFromScores: true,
    retriesPerformed: false,
    timeoutExtensionsPerformed: false,
    correctionContextsPerformed: false,
    publicationCompiled: false,
    publicationFinalized: false,
    productionMutated: false
  },
  totals: {
    acceptedPriorDebates: 4,
    resumptionModelContexts: execution.contextsAttempted,
    cohortDebates: totals.debates,
    cohortMoves: totals.moves,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0,
    paidServiceCalls: 0,
    publicationCompilationPasses: 0,
    publicationFinalizations: 0,
    productionMutations: 0,
    nextBatchSelections: 0,
    directIncrementalCostUsd: 0
  },
  authorization: {
    failureDiagnosis: !passed,
    publicationCompilationPreparation: passed,
    deterministicCompilation: false,
    repairPacketPreparation: false,
    retry: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: passed
    ? "prepare-batch-03-deterministic-publication-compilation-under-standing-authorization"
    : "diagnose-preserved-batch-03-publication-resumption-2-failure-under-failure-recovery-standing-authorization"
};

if (shouldWrite) {
  await writeFile(path.resolve(ANALYSIS), `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: analysis.status,
  contextsAttempted: analysis.execution.contextsAttempted,
  contextsUnattempted: analysis.execution.contextsUnattempted,
  validContexts: analysis.execution.validContexts,
  invalidContexts: analysis.execution.invalidContexts,
  cohortDebates: totals.debates,
  cohortMoves: totals.moves,
  retries: 0,
  timeoutExtensions: 0,
  correctionContexts: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
