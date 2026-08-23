#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  validatePostCanaryBatch07PublicationOutput
} from "./lib/assessment-production-post-canary-batch-07-publication-validation.mjs";
import {
  POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_2_ROOT
} from "./lib/assessment-production-post-canary-batch-07-publication-resumption-2.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_2_ROOT;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(() => true, () => false);

if (shouldWrite) {
  assertV4(!(await exists(ANALYSIS)), `${ANALYSIS} already exists`);
}
const [preparationBytes, activationBytes, executionBytes] = await Promise.all([
  readFile(path.resolve(PREPARATION)),
  readFile(path.resolve(ACTIVATION)),
  readFile(path.resolve(EXECUTION))
]);
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
assertV4(
  activation.status ===
      "frozen-eight-untouched-post-canary-batch-07-publication-resumption-2-contexts-authorized" &&
    activation.authorization?.deterministicCohortAnalysis === true &&
    activation.authorization?.repairPacketPreparation === false &&
    activation.authorization?.publicationCompilation === false &&
    activation.authorization?.publicationFinalization === false &&
    activation.authorization?.paidServices === false &&
    activation.authorization?.productionMutation === false &&
    execution.contextsPlanned === 8 &&
    execution.contextsAttempted >= 1 &&
    execution.contextsAttempted <= 8 &&
    execution.attempts === execution.contextsAttempted &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 &&
    execution.modelAuthoredScores === 0 &&
    execution.scorePassesExecutedThisStage === 0 &&
    execution.paidServiceCallsThisStage === 0,
  "the Batch 7 publication resumption analysis boundary changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `resumption analysis source hash mismatch: ${file}`
  );
}

const [acceptedOutputBytes, acceptedPacketBytes, acceptedValidationRecord] =
  await Promise.all([
    readFile(path.resolve(activation.acceptedDebate193.output)),
    readFile(path.resolve(activation.acceptedDebate193.packet)),
    readFile(
      path.resolve(activation.acceptedDebate193.validation),
      "utf8"
    ).then(JSON.parse)
  ]);
assertV4(
  acceptedValidationRecord.status === "passed" &&
    acceptedValidationRecord.authorizedFieldsChanged === 2 &&
    acceptedValidationRecord.immutableFieldsChanged === 0 &&
    acceptedValidationRecord.lockedScoresUnchanged === true,
  "the accepted Debate 193 repair record changed"
);
const acceptedValidation = validatePostCanaryBatch07PublicationOutput(
  JSON.parse(acceptedOutputBytes),
  JSON.parse(acceptedPacketBytes)
);
const [accepted80OutputBytes, accepted80PacketBytes, accepted80ValidationRecord] =
  await Promise.all([
    readFile(path.resolve(activation.acceptedDebate80.output)),
    readFile(path.resolve(activation.acceptedDebate80.packet)),
    readFile(path.resolve(activation.acceptedDebate80.validation), "utf8").then(JSON.parse)
  ]);
assertV4(
  accepted80ValidationRecord.status === "passed" &&
    accepted80ValidationRecord.authorizedFieldsChanged === 5 &&
    accepted80ValidationRecord.immutableFieldsChanged === 0 &&
    accepted80ValidationRecord.lockedScoresUnchanged === true,
  "the accepted Debate 80 repair record changed"
);
const accepted80Validation = validatePostCanaryBatch07PublicationOutput(
  JSON.parse(accepted80OutputBytes),
  JSON.parse(accepted80PacketBytes)
);

const replayed = [];
for (const result of execution.results) {
  const context = activation.contexts[result.contextIndex];
  assertV4(
    context &&
      context.debateNumber === result.debateNumber &&
      context.debateId === result.debateId &&
      context.originalContextIndex === result.originalContextIndex,
    `context ${result.contextIndex}: resumption execution identity mismatch`
  );
  if (!result.gateAcceptancePassed) {
    replayed.push({
      contextIndex: result.contextIndex,
      originalContextIndex: result.originalContextIndex,
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
  assertV4(
    sha256(outputBytes) === result.outputSha256,
    `Debate ${result.debateNumber}: output hash mismatch`
  );
  assertV4(
    sha256(validationBytes) === result.validationSha256,
    `Debate ${result.debateNumber}: validation hash mismatch`
  );
  assertV4(
    sha256(provenanceBytes) === result.provenanceSha256,
    `Debate ${result.debateNumber}: provenance hash mismatch`
  );
  const validation = validatePostCanaryBatch07PublicationOutput(
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
    `Debate ${result.debateNumber}: accepted resumption audit mismatch`
  );
  replayed.push({
    contextIndex: result.contextIndex,
    originalContextIndex: result.originalContextIndex,
    debateNumber: result.debateNumber,
    status: result.status,
    gateAcceptancePassed: true,
    validationReplayed: true,
    outputSha256: result.outputSha256,
    validation
  });
}

const valid = replayed.filter((item) => item.gateAcceptancePassed);
const sum = (items, field) =>
  items.reduce((total, item) => total + item.validation[field], 0);
const resumptionSemanticPass =
  execution.status ===
    "eight-post-canary-batch-07-publication-resumption-2-contexts-passed" &&
  execution.contextsAttempted === 8 &&
  execution.contextsUnattempted === 0 &&
  execution.validContexts === 8 &&
  execution.invalidContexts === 0 &&
  valid.length === 8 &&
  sum(valid, "moves") ===
    activation.acceptanceContract.resumptionMovesRequired &&
  sum(valid, "critiques") ===
    activation.acceptanceContract.resumptionCritiquesRequired &&
  sum(valid, "quoteExactSourceMatches") ===
    activation.acceptanceContract.resumptionExactSourceQuotesRequired &&
  sum(valid, "overallCommentarySides") ===
    activation.acceptanceContract.resumptionOverallCommentarySidesRequired &&
  sum(valid, "aiExtensionSides") ===
    activation.acceptanceContract.resumptionAIExtensionSidesRequired;
const cohort = [
  { debateNumber: "193", validation: acceptedValidation },
  { debateNumber: "80", validation: accepted80Validation },
  ...valid
];
const cohortSemanticPass =
  resumptionSemanticPass &&
  cohort.length === activation.acceptanceContract.cohortValidDebatesRequired &&
  sum(cohort, "moves") === activation.acceptanceContract.cohortMovesRequired &&
  sum(cohort, "critiques") ===
    activation.acceptanceContract.cohortCritiquesRequired &&
  sum(cohort, "quoteExactSourceMatches") ===
    activation.acceptanceContract.cohortExactSourceQuotesRequired &&
  sum(cohort, "overallCommentarySides") ===
    activation.acceptanceContract.cohortOverallCommentarySidesRequired &&
  sum(cohort, "aiExtensionSides") ===
    activation.acceptanceContract.cohortAIExtensionSidesRequired &&
  cohort.every(
    (item) =>
      item.validation.minimumCritiqueCharacters >=
        activation.acceptanceContract.minimumCritiqueCharacters &&
      item.validation.calculatedScoresAuthoredByModel === 0 &&
      item.validation.lockedScoresUnchanged === true
  );
const timingPass =
  execution.results.every(
    (result) =>
      result.elapsedMs <= activation.executionPolicy.timeoutMsPerContext &&
      result.timedOut === false
  ) && execution.wallElapsedMs <= activation.executionPolicy.absoluteGateTimeoutMs;
const passed = cohortSemanticPass && timingPass;

const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-07-publication-resumption-2-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "post-canary-batch-07-publication-resumption-2-output-gate-passed"
    : cohortSemanticPass
      ? "post-canary-batch-07-publication-resumption-2-failed-timing"
      : "post-canary-batch-07-publication-resumption-2-failed-validation",
  productionCanary: false,
  batchNumber: 7,
  stagingOnly: true,
  developmentValidationOnly: false,
  sources: {
    preparation: PREPARATION,
    preparationSha256: sha256(preparationBytes),
    activation: ACTIVATION,
    activationSha256: sha256(activationBytes),
    execution: EXECUTION,
    executionSha256: sha256(executionBytes),
    acceptedDebate193: activation.acceptedDebate193.output,
    acceptedDebate80: activation.acceptedDebate80.output
  },
  acceptedDebate193: {
    status: "passed-repaired-and-complete-publication-validation",
    validation: acceptedValidation,
    repairContexts: 1,
    repairedFields: 2,
    immutableFieldsChanged: 0,
    lockedScoresUnchanged: true
  },
  acceptedDebate80: {
    status: "passed-repaired-and-complete-publication-validation",
    validation: accepted80Validation,
    repairContexts: 3,
    repairedFields: 5,
    immutableFieldsChanged: 0,
    lockedScoresUnchanged: true
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
  gate: {
    resumptionSemanticPass,
    cohortSemanticPass,
    timingPass,
    resumptionValidContexts: valid.length,
    cohortValidDebates: cohort.length,
    cohortMoves: sum(cohort, "moves"),
    cohortCritiques: sum(cohort, "critiques"),
    cohortExactSourceQuotes: sum(cohort, "quoteExactSourceMatches"),
    cohortOverallCommentarySides: sum(cohort, "overallCommentarySides"),
    cohortAIExtensionSides: sum(cohort, "aiExtensionSides"),
    minimumCritiqueCharacters: cohort.length
      ? Math.min(...cohort.map((item) => item.validation.minimumCritiqueCharacters))
      : null,
    retries: 0,
    timeoutExtensions: 0,
    correctionContexts: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0
  },
  totals: {
    acceptedRepairedDebates: 2,
    acceptedRepairContexts: 4,
    repairedFields: 7,
    resumptionModelContexts: execution.contextsAttempted,
    cohortDebates: cohort.length,
    cohortMoves: sum(cohort, "moves"),
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0,
    paidServiceCalls: 0,
    publicationCompilationPasses: 0,
    publicationFinalizations: 0,
    productionMutations: 0,
    nextBatchSelections: 0,
    directIncrementalCostUsd: 0
  },
  integrity: {
    participantJudgmentWasScoreBlind: true,
    scoresRemainedImmutable: true,
    acceptedDebate193RepairReplayed: true,
    acceptedDebate80RepairReplayed: true,
    everyAcceptedResumptionOutputReplayedDeterministically: valid.every(
      (item) => item.validationReplayed
    ),
    aiExtensionExcludedFromScores: true,
    retriesPerformed: false,
    timeoutExtensionsPerformed: false,
    correctionContextsPerformed: false,
    publicationCompiled: false,
    publicationFinalized: false,
    productionMutated: false
  },
  authorization: {
    failureDiagnosis: !passed,
    repairPacketPreparation: false,
    repairModelExecution: false,
    publicationCompilationPreparation: passed,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: passed
    ? "prepare-batch-07-publication-compilation-under-standing-authorization"
    : "diagnose-batch-07-publication-resumption-2-failure-under-standing-authorization"
};
if (shouldWrite) {
  await writeFile(path.resolve(ANALYSIS), `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: analysis.status,
  resumptionContextsAttempted: analysis.execution.contextsAttempted,
  validResumptionContexts: analysis.execution.validContexts,
  validCohortDebates: analysis.gate.cohortValidDebates,
  cohortMoves: analysis.gate.cohortMoves,
  cohortCritiques: analysis.gate.cohortCritiques,
  cohortExactSourceQuotes: analysis.gate.cohortExactSourceQuotes,
  retries: 0,
  timeoutExtensions: 0,
  repairPacketsPrepared: 0,
  publicationCompilationPasses: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
