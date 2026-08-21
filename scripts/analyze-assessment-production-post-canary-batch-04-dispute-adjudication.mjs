#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import {
  POST_CANARY_BATCH_04_DISPUTE_ADJ_ROOT,
  validatePostCanaryBatch04DisputeAdjudicationOutput
} from "./lib/assessment-production-post-canary-batch-04-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const activationPath =
  `${POST_CANARY_BATCH_04_DISPUTE_ADJ_ROOT}/execution-activation.json`;
const executionPath =
  `${POST_CANARY_BATCH_04_DISPUTE_ADJ_ROOT}/model-execution.json`;
const preparationPath =
  `${POST_CANARY_BATCH_04_DISPUTE_ADJ_ROOT}/preparation-manifest.json`;
const analysisPath = `${POST_CANARY_BATCH_04_DISPUTE_ADJ_ROOT}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [activation, execution, preparation] = await Promise.all(
  [activationPath, executionPath, preparationPath].map((file) =>
    readFile(file, "utf8").then(JSON.parse)
  )
);

assertV4(
  activation.status ===
      "frozen-ten-post-canary-batch-04-dispute-only-adjudication-contexts-authorized" &&
    activation.productionCanary === false &&
    activation.batchNumber === 4 &&
    activation.stagingOnly === true &&
    activation.model.slug === "gpt-5.6-sol" &&
    activation.model.reasoningEffort === "low" &&
    activation.model.authentication === "ChatGPT subscription" &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.corrections === 0 &&
    execution.scoresDerived === 0 &&
    execution.judgmentModelContexts === 0 &&
    execution.paidServiceCalls === 0,
  "Batch 4 adjudication execution is unavailable or crossed its boundary"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(file)) === digest,
    `source hash mismatch during Batch 4 adjudication analysis: ${file}`
  );
}

const contexts = [];
for (const context of activation.contexts) {
  const result = execution.results.find(
    (item) => item.contextIndex === context.contextIndex
  );
  if (!result) {
    contexts.push({
      contextIndex: context.contextIndex,
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      status: "unattempted",
      accepted: false,
      validationReplayed: false,
      disputedMoves: null,
      candidateSelections: null,
      audioTranscriptInputs: context.audioTranscriptInputs.length,
      calculatedScores: null
    });
    continue;
  }
  let replay = null;
  if (result.gateAcceptancePassed) {
    const [outputBytes, packet] = await Promise.all([
      readFile(context.output),
      readFile(context.packet, "utf8").then(JSON.parse)
    ]);
    replay = validatePostCanaryBatch04DisputeAdjudicationOutput(
      JSON.parse(outputBytes),
      packet
    );
    assertV4(
      replay.status === "passed" &&
        sha256(outputBytes) === result.outputSha256,
      `${context.debateNumber}: adjudication replay mismatch`
    );
  }
  contexts.push({
    contextIndex: context.contextIndex,
    debateNumber: context.debateNumber,
    debateId: context.debateId,
    status: result.status,
    accepted: result.gateAcceptancePassed,
    elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)),
    validationReplayed: replay?.status === "passed",
    disputedMoves: replay?.disputedMoves ?? null,
    candidateSelections: replay?.candidateSelections ?? null,
    audioTranscriptInputs: result.audioTranscriptInputs.length,
    calculatedScores: replay?.calculatedScores ?? null,
    model: result.model,
    modelSlug: result.modelSlug,
    reasoningEffort: result.reasoningEffort,
    authentication: result.authentication,
    apiKeysRemoved: result.apiKeysRemoved,
    attemptCount: result.attemptCount,
    retryCount: result.retryCount
  });
}
const valid = contexts.filter((context) => context.accepted);
const maximumElapsedMinutes = valid.length
  ? Math.max(...valid.map((context) => context.elapsedMinutes))
  : null;
const meanElapsedMinutes = valid.length
  ? Number(
      (
        valid.reduce((sum, context) => sum + context.elapsedMinutes, 0) /
        valid.length
      ).toFixed(2)
    )
  : null;
const semanticPass =
  valid.length === 10 &&
  valid.reduce((sum, context) => sum + context.candidateSelections, 0) ===
    582 &&
  valid.reduce((sum, context) => sum + context.disputedMoves, 0) === 196;
const timingPass =
  semanticPass &&
  maximumElapsedMinutes <= activation.executionPolicy.maximumMinutesPerContext &&
  meanElapsedMinutes <= activation.executionPolicy.maximumMeanMinutes;
const scoreBlindPass =
  semanticPass && contexts.every((context) => context.calculatedScores === 0);
const isolationPass =
  semanticPass &&
  contexts.every(
    (context) =>
      context.model === "5.6 Sol" &&
      context.modelSlug === "gpt-5.6-sol" &&
      context.reasoningEffort === "low" &&
      context.authentication === "ChatGPT subscription" &&
      context.apiKeysRemoved === true &&
      context.attemptCount === 1 &&
      context.retryCount === 0
  );
const passed = semanticPass && timingPass && scoreBlindPass && isolationPass;
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-dispute-only-adjudication-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "post-canary-batch-04-dispute-only-adjudication-gate-passed-standing-authorization-active-for-final-ledger-assembly"
    : semanticPass
      ? timingPass
        ? scoreBlindPass
          ? "post-canary-batch-04-dispute-only-adjudication-gate-failed-isolation"
          : "post-canary-batch-04-dispute-only-adjudication-gate-failed-scoreblindness"
        : "post-canary-batch-04-dispute-only-adjudication-gate-failed-timing"
      : "post-canary-batch-04-dispute-only-adjudication-gate-failed-validation",
  analyzedAt: new Date().toISOString(),
  productionCanary: false,
  batchNumber: 4,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  contexts,
  gate: {
    semanticPass,
    timingPass,
    scoreBlindPass,
    isolationPass,
    validContexts: valid.length,
    requiredValidContexts: 10,
    disputedMovesDecided: valid.reduce(
      (sum, context) => sum + (context.disputedMoves ?? 0),
      0
    ),
    requiredDisputedMoves: 196,
    candidateSelections: valid.reduce(
      (sum, context) => sum + (context.candidateSelections ?? 0),
      0
    ),
    requiredCandidateSelections: 582,
    maximumElapsedMinutes,
    maximumAllowedMinutesPerContext:
      activation.executionPolicy.maximumMinutesPerContext,
    meanElapsedMinutes,
    maximumAllowedMeanMinutes: activation.executionPolicy.maximumMeanMinutes,
    attempts: execution.attempts,
    retries: 0,
    timeoutExtensions: 0,
    corrections: 0,
    scoresDerived: 0
  },
  evidenceBoundary: {
    provenanceFilesUnavailableToModel: true,
    passIdentitiesUnavailable: true,
    initialRationalesUnavailable: true,
    nondisputedFieldsUnavailable: true,
    rawVerifiedAudioTranscriptsSuppliedOnlyWhereRequired: true,
    audioTranscriptInputs: contexts.reduce(
      (sum, context) => sum + context.audioTranscriptInputs,
      0
    ),
    candidateValuesInvented: 0,
    calculatedScores: 0,
    judgmentModelContexts: 0
  },
  acceptedSourceBoundary: structuredClone(activation.acceptedSourceBoundary),
  totals: {
    adjudicationModelContexts: execution.contextsAttempted,
    judgmentModelContexts: 0,
    paidServiceCalls: 0,
    retries: 0,
    timeoutExtensions: 0,
    corrections: 0,
    scoresDerived: 0,
    publicationReconstructions: 0,
    productionMutations: 0,
    nextBatchSelections: 0,
    directIncrementalCostUsd: 0
  },
  authorization: {
    finalLedgerAssembly: false,
    scoreDerivation: false,
    judgmentModelExecution: false,
    adjudicationModelExecution: false,
    paidServices: false,
    publicationReconstruction: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: passed
    ? "standing-authorization-permits-batch-04-deterministic-final-ledger-assembly"
    : "new-user-approval-required-after-batch-04-adjudication-failure-before-downstream-work"
};
if (shouldWrite) {
  await writeFile(analysisPath, `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: analysis.status,
      validContexts: valid.length,
      disputedMovesDecided: analysis.gate.disputedMovesDecided,
      candidateSelections: analysis.gate.candidateSelections,
      maximumElapsedMinutes,
      meanElapsedMinutes,
      audioTranscriptInputs: analysis.evidenceBoundary.audioTranscriptInputs,
      retries: 0,
      scoresDerived: 0,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
