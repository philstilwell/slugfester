#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_11_PUBLICATION_ROOT
} from "./lib/assessment-production-post-canary-batch-11-publication.mjs";
import {
  validatePostCanaryBatch11PublicationOutput
} from "./lib/assessment-production-post-canary-batch-11-publication-validation.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = POST_CANARY_BATCH_11_PUBLICATION_ROOT;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(() => true, () => false);

assertV4(!(await exists(ANALYSIS)), `${ANALYSIS} already exists`);
const [activationBytes, executionBytes] = await Promise.all([
  readFile(path.resolve(ACTIVATION)),
  readFile(path.resolve(EXECUTION))
]);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
assertV4(
  activation.status ===
      "frozen-ten-post-canary-batch-11-publication-contexts-authorized" &&
    activation.authorization?.deterministicAnalysis === true &&
    activation.authorization?.repairPacketPreparation === false &&
    activation.authorization?.publicationFinalization === false &&
    activation.authorization?.productionMutation === false &&
    execution.contextsPlanned === 10 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 &&
    execution.modelAuthoredScores === 0 &&
    execution.scorePassesExecutedThisStage === 0 &&
    execution.paidServiceCallsThisStage === 0,
  "Batch 11 publication analysis boundary changed"
);

const replayed = [];
for (const result of execution.results) {
  const context = activation.contexts[result.contextIndex];
  assertV4(
    context &&
      context.debateNumber === result.debateNumber &&
      context.debateId === result.debateId,
    `context ${result.contextIndex}: execution identity mismatch`
  );
  if (!result.gateAcceptancePassed) {
    replayed.push({
      contextIndex: result.contextIndex,
      debateNumber: result.debateNumber,
      status: result.status,
      gateAcceptancePassed: false,
      validationReplayed: false
    });
    continue;
  }
  const [outputBytes, packetBytes, validationBytes, provenanceBytes] =
    await Promise.all([
      readFile(path.resolve(context.rawOutput)),
      readFile(path.resolve(context.packet)),
      readFile(path.resolve(context.validation)),
      readFile(path.resolve(context.provenance))
    ]);
  assertV4(sha256(outputBytes) === result.outputSha256, `${result.debateNumber}: output hash mismatch`);
  assertV4(
    sha256(validationBytes) === result.validationSha256,
    `${result.debateNumber}: validation hash mismatch`
  );
  assertV4(
    sha256(provenanceBytes) === result.provenanceSha256,
    `${result.debateNumber}: provenance hash mismatch`
  );
  const validation = validatePostCanaryBatch11PublicationOutput(
    JSON.parse(outputBytes),
    JSON.parse(packetBytes)
  );
  const validationRecord = JSON.parse(validationBytes);
  const provenance = JSON.parse(provenanceBytes);
  assertV4(
    validationRecord.status === "passed" &&
      validationRecord.outputSha256 === result.outputSha256 &&
      validationRecord.validationSummary?.status === "passed" &&
      provenance.outputSha256 === result.outputSha256 &&
      provenance.attemptCount === 1 &&
      provenance.retryCount === 0 &&
      provenance.timeoutExtensionCount === 0 &&
      provenance.correctionContextCount === 0 &&
      provenance.modelAuthoredScores === 0,
    `${result.debateNumber}: accepted publication audit mismatch`
  );
  replayed.push({
    contextIndex: result.contextIndex,
    debateNumber: result.debateNumber,
    status: result.status,
    gateAcceptancePassed: true,
    validationReplayed: true,
    outputSha256: result.outputSha256,
    validation
  });
}

const valid = replayed.filter((item) => item.gateAcceptancePassed);
const passed =
  execution.status === "ten-post-canary-batch-11-publication-contexts-passed" &&
  execution.contextsAttempted === 10 &&
  execution.contextsUnattempted === 0 &&
  execution.validContexts === 10 &&
  execution.invalidContexts === 0 &&
  valid.length === 10 &&
  valid.reduce((sum, item) => sum + item.validation.critiques, 0) === 190 &&
  valid.reduce((sum, item) => sum + item.validation.quoteExactSourceMatches, 0) === 20 &&
  valid.reduce((sum, item) => sum + item.validation.overallCommentarySides, 0) === 20 &&
  valid.reduce((sum, item) => sum + item.validation.aiExtensionSides, 0) === 20;

const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-11-publication-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "post-canary-batch-11-publication-output-gate-passed"
    : "post-canary-batch-11-publication-output-gate-failed",
  productionCanary: false,
  batchNumber: 11,
  stagingOnly: true,
  developmentValidationOnly: false,
  sources: {
    activation: ACTIVATION,
    activationSha256: sha256(activationBytes),
    execution: EXECUTION,
    executionSha256: sha256(executionBytes)
  },
  execution: {
    contextsPlanned: execution.contextsPlanned,
    contextsAttempted: execution.contextsAttempted,
    contextsUnattempted: execution.contextsUnattempted,
    validContexts: execution.validContexts,
    invalidContexts: execution.invalidContexts,
    attempts: execution.attempts,
    retries: execution.retries,
    timeoutExtensions: execution.timeoutExtensions,
    correctionContexts: execution.correctionContexts,
    schedulerRamp: execution.schedulerRamp,
    maximumObservedConcurrency: execution.maximumObservedConcurrency,
    wallElapsedMs: execution.wallElapsedMs,
    aggregateModelElapsedMs: execution.aggregateModelElapsedMs
  },
  validationReplay: replayed,
  totals: {
    debates: 10,
    lockedMoves: 190,
    critiques: valid.reduce(
      (sum, item) => sum + item.validation.critiques,
      0
    ),
    exactSourceQuotes: valid.reduce(
      (sum, item) => sum + item.validation.quoteExactSourceMatches,
      0
    ),
    overallCommentarySides: valid.reduce(
      (sum, item) => sum + item.validation.overallCommentarySides,
      0
    ),
    aiExtensionSides: valid.reduce(
      (sum, item) => sum + item.validation.aiExtensionSides,
      0
    ),
    modelContexts: execution.contextsAttempted,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0,
    paidServiceCalls: 0,
    publicationRepairs: 0,
    publicationFinalizations: 0,
    productionMutations: 0,
    nextBatchSelections: 0,
    directIncrementalCostUsd: 0
  },
  integrity: {
    participantJudgmentWasScoreBlind: true,
    scoresRemainedImmutable: true,
    everyAcceptedOutputReplayedDeterministically: valid.every(
      (item) => item.validationReplayed
    ),
    aiExtensionExcludedFromScores: true,
    retriesPerformed: false,
    timeoutExtensionsPerformed: false,
    correctionContextsPerformed: false,
    publicationFinalized: false,
    productionMutated: false
  },
  authorization: {
    failureDiagnosis: !passed,
    repairPacketPreparation: false,
    repairModelExecution: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: passed
    ? "standing-authorization-permits-batch-11-publication-compilation-preparation"
    : "standing-authorization-permits-batch-11-publication-failure-diagnosis"
};
await writeFile(path.resolve(ANALYSIS), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      status: analysis.status,
      contextsAttempted: analysis.execution.contextsAttempted,
      validContexts: analysis.execution.validContexts,
      critiques: analysis.totals.critiques,
      exactSourceQuotes: analysis.totals.exactSourceQuotes,
      modelAuthoredScores: 0,
      retries: 0,
      timeoutExtensions: 0,
      publicationRepairs: 0,
      publicationFinalizations: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
