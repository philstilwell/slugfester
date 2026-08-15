#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import {
  POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_ROOT,
  validatePostCanaryBatch01Debate195CorrectionOutput
} from "./lib/assessment-production-post-canary-batch-01-debate-195-adjudication-correction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const ROOT = POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_ROOT;
const shouldWrite = process.argv.includes("--write");
const activationPath = `${ROOT}/execution-activation.json`;
const executionPath = `${ROOT}/model-execution.json`;
const validationPath = `${ROOT}/correction-validation.json`;
const analysisPath = `${ROOT}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const [activation, execution, validation] = await Promise.all(
  [activationPath, executionPath, validationPath].map((file) =>
    readFile(file, "utf8").then(JSON.parse)
  )
);
assertV4(
  activation.status ===
      "frozen-one-score-blind-debate-195-burden-adjustment-correction-context-authorized" &&
    activation.model.slug === "gpt-5.6-sol" &&
    activation.model.reasoningEffort === "low" &&
    activation.model.authentication === "ChatGPT subscription" &&
    activation.model.scoreBlind === true &&
    activation.authorization.correctionModelContext === true &&
    activation.authorization.deterministicMerge === false &&
    execution.contextsPlanned === 1 &&
    execution.contextsAttempted === 1 &&
    execution.attempts === 1 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.recursiveCorrections === 0 &&
    execution.deterministicMerges === 0 &&
    execution.judgmentModelContexts === 0 &&
    execution.paidServiceCalls === 0 &&
    execution.scoresDerived === 0,
  "Debate 195 correction execution is unavailable or crossed its boundary"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(file)) === digest,
    `source hash mismatch during correction analysis: ${file}`
  );
}

const context = activation.contexts[0];
const result = execution.results[0];
let replay = null;
let replayMessage = null;
if (result.outputWritten) {
  const [outputBytes, packet] = await Promise.all([
    readFile(context.output),
    readFile(context.packet, "utf8").then(JSON.parse)
  ]);
  try {
    replay = validatePostCanaryBatch01Debate195CorrectionOutput(
      JSON.parse(outputBytes),
      packet
    );
  } catch (error) {
    replayMessage = error.message;
  }
  assertV4(
    sha256(outputBytes) === result.outputSha256,
    "correction output hash changed before analysis"
  );
}

const originalOutputBytes = await readFile(
  activation.preservedOriginal.output
);
const originalOutput = JSON.parse(originalOutputBytes);
const originalOutputUnchanged =
  sha256(originalOutputBytes) === activation.preservedOriginal.outputSha256;
const preservedMoveDecisionsUnchanged =
  originalOutput.moveDecisions.length === 18 &&
  sha256(Buffer.from(canonicalJson(originalOutput.moveDecisions))) ===
    activation.preservedOriginal.moveDecisionsSha256;
const semanticPass =
  result.gateAcceptancePassed === true &&
  validation.gateAcceptancePassed === true &&
  replay?.status === "passed" &&
  replay.burdenAdjustmentDecisions === 2 &&
  replay.candidateSelections === 2 &&
  replay.preservedMoveDecisions === 18;
const timingPass =
  semanticPass &&
  result.elapsedMs <= activation.executionPolicy.timeoutMsPerContext &&
  result.elapsedMs / 60000 <=
    activation.executionPolicy.maximumMinutesPerContext;
const scoreBlindPass = semanticPass && replay.calculatedScores === 0;
const isolationPass =
  semanticPass &&
  result.model === "5.6 Sol" &&
  result.modelSlug === "gpt-5.6-sol" &&
  result.reasoningEffort === "low" &&
  result.authentication === "ChatGPT subscription" &&
  result.apiKeysRemoved === true &&
  result.scoreBlind === true &&
  result.attemptCount === 1 &&
  result.retryCount === 0 &&
  result.timeoutExtensionCount === 0 &&
  result.recursiveCorrectionCount === 0;
const preservationPass =
  originalOutputUnchanged &&
  preservedMoveDecisionsUnchanged &&
  validation.originalOutputUnchanged === true &&
  validation.deterministicMergeAuthorized === false &&
  execution.deterministicMerges === 0;
const passed =
  semanticPass &&
  timingPass &&
  scoreBlindPass &&
  isolationPass &&
  preservationPass;

const failureClass = passed
  ? null
  : !result.outputWritten
    ? "transport-or-output-availability"
    : !semanticPass
      ? "correction-output-validation"
      : !timingPass
        ? "timing"
        : !scoreBlindPass
          ? "score-blindness"
          : !isolationPass
            ? "isolation"
            : "preservation";

const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "debate-195-burden-adjustment-correction-gate-passed-awaiting-separate-deterministic-merge-approval"
    : "debate-195-burden-adjustment-correction-gate-failed",
  analyzedAt: new Date().toISOString(),
  productionCanary: false,
  batchNumber: 1,
  correctionNumber: 1,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  context: {
    contextIndex: 0,
    debateNumber: "195",
    debateId: context.debateId,
    status: result.status,
    accepted: result.gateAcceptancePassed,
    elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)),
    validationReplayed: replay?.status === "passed",
    validationReplayMessage: replayMessage,
    burdenAdjustmentDecisions:
      replay?.burdenAdjustmentDecisions ?? null,
    candidateSelections: replay?.candidateSelections ?? null,
    preservedMoveDecisions: 18,
    calculatedScores: replay?.calculatedScores ?? null,
    model: result.model,
    modelSlug: result.modelSlug,
    reasoningEffort: result.reasoningEffort,
    authentication: result.authentication,
    apiKeysRemoved: result.apiKeysRemoved,
    attemptCount: result.attemptCount,
    retryCount: result.retryCount,
    timeoutExtensionCount: result.timeoutExtensionCount,
    recursiveCorrectionCount: result.recursiveCorrectionCount
  },
  gate: {
    passed,
    semanticPass,
    timingPass,
    scoreBlindPass,
    isolationPass,
    preservationPass,
    failureClass,
    requiredContexts: 1,
    validContexts: passed ? 1 : 0,
    requiredBurdenAdjustmentDecisions: 2,
    burdenAdjustmentDecisions:
      replay?.burdenAdjustmentDecisions ?? 0,
    requiredCandidateSelections: 2,
    candidateSelections: replay?.candidateSelections ?? 0,
    preservedMoveDecisions: 18,
    originalOutputUnchanged,
    preservedMoveDecisionsUnchanged,
    attempts: 1,
    retries: 0,
    timeoutExtensions: 0,
    recursiveCorrections: 0,
    deterministicMerges: 0,
    scoresDerived: 0
  },
  evidenceBoundary: {
    burdenAdjustmentDisputesOnly: true,
    anonymousCandidatePairsOnly: true,
    provenanceUnavailableToModel: true,
    passIdentitiesUnavailable: true,
    initialRationalesUnavailable: true,
    preservedMoveDecisionsUnavailableToModel: true,
    fullInitialOutputUnavailableToModel: true,
    calculatedScoresUnavailable: true,
    winnerLabelsUnavailable: true,
    legacyAssessmentsUnavailable: true,
    otherDebatesUnavailable: true,
    publicationProseUnavailable: true,
    candidateValuesInvented: 0,
    calculatedScores: 0,
    judgmentModelContexts: 0
  },
  preservation: {
    originalOutputPath: activation.preservedOriginal.output,
    originalOutputSha256: sha256(originalOutputBytes),
    preservedMoveDecisionsSha256: sha256(
      Buffer.from(canonicalJson(originalOutput.moveDecisions))
    ),
    originalOutputUnchanged,
    preservedMoveDecisionsUnchanged,
    correctionMerged: false,
    finalLedgerAssembled: false
  },
  totals: {
    correctionModelContexts: 1,
    adjudicationModelContexts: 0,
    judgmentModelContexts: 0,
    paidServiceCalls: 0,
    retries: 0,
    timeoutExtensions: 0,
    recursiveCorrections: 0,
    deterministicMerges: 0,
    finalLedgersAssembled: 0,
    scoresDerived: 0,
    publicationReconstructions: 0,
    productionMutations: 0,
    nextBatchSelections: 0,
    directIncrementalCostUsd: 0
  },
  authorization: {
    correctionModelExecution: false,
    adjudicationModelExecution: false,
    judgmentModelExecution: false,
    retry: false,
    timeoutExtension: false,
    recursiveCorrection: false,
    deterministicMerge: false,
    paidServices: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: passed
    ? "user-approval-required-before-deterministic-debate-195-correction-merge-and-complete-adjudication-revalidation"
    : "user-approval-required-before-any-debate-195-correction-failure-diagnosis-or-downstream-work"
};

if (shouldWrite) {
  await writeFile(analysisPath, `${JSON.stringify(analysis, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: analysis.status,
      debateNumber: "195",
      validContexts: analysis.gate.validContexts,
      burdenAdjustmentDecisions:
        analysis.gate.burdenAdjustmentDecisions,
      candidateSelections: analysis.gate.candidateSelections,
      preservedMoveDecisions: 18,
      originalOutputUnchanged,
      preservedMoveDecisionsUnchanged,
      retries: 0,
      timeoutExtensions: 0,
      recursiveCorrections: 0,
      deterministicMerges: 0,
      paidServiceCalls: 0,
      scoresDerived: 0,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
