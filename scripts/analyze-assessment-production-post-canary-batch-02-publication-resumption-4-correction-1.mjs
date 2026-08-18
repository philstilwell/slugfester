#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  validatePostCanaryBatch02PublicationOutput
} from "./lib/assessment-production-post-canary-batch-02-publication-validation.mjs";
import {
  POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_4_ROOT
} from "./lib/assessment-production-post-canary-batch-02-publication-resumption-4.mjs";
import {
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch02StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-02-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_4_ROOT;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(() => true, () => false);
const standingAuthorization =
  await loadAndValidatePostCanaryBatch02StandingAuthorization();

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
      "frozen-two-untouched-post-canary-batch-02-publication-resumption-4-contexts-authorized-under-standing-authorization" &&
    activation.authorization?.deterministicCohortAnalysis === true &&
    activation.authorization?.repairPacketPreparation === false &&
    activation.authorization?.publicationCompilation === false &&
    activation.authorization?.publicationFinalization === false &&
    activation.authorization?.paidServices === false &&
    activation.authorization?.productionMutation === false &&
    execution.contextsPlanned === 2 &&
    execution.contextsAttempted >= 1 &&
    execution.contextsAttempted <= 2 &&
    execution.attempts === execution.contextsAttempted &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 &&
    execution.modelAuthoredScores === 0 &&
    execution.scorePassesExecutedThisStage === 0 &&
    execution.paidServiceCallsThisStage === 0 &&
    activation.userAuthorization?.standingAuthorization ===
      POST_CANARY_BATCH_02_STANDING_AUTHORIZATION &&
    activation.userAuthorization?.standingAuthorizationSha256 ===
      standingAuthorization.sha256,
  "the Batch 2 publication resumption-4 analysis boundary changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `resumption analysis source hash mismatch: ${file}`
  );
}

const [acceptedOutputBytes, acceptedPacketBytes, acceptedValidationRecord] =
  await Promise.all([
    readFile(path.resolve(activation.acceptedDebate103.output)),
    readFile(path.resolve(activation.acceptedDebate103.packet)),
    readFile(
      path.resolve(activation.acceptedDebate103.validation),
      "utf8"
    ).then(JSON.parse)
  ]);
assertV4(
  sha256(acceptedOutputBytes) === acceptedValidationRecord.mergedOutputSha256 &&
    acceptedValidationRecord.status === "passed" &&
    acceptedValidationRecord.authorizedFieldsChanged === 17 &&
    acceptedValidationRecord.immutableFieldsChanged === 0 &&
    acceptedValidationRecord.lockedScoresUnchanged === true,
  "the accepted Debate 103 repair record changed"
);
const acceptedValidation = validatePostCanaryBatch02PublicationOutput(
  JSON.parse(acceptedOutputBytes),
  JSON.parse(acceptedPacketBytes)
);

const [accepted172OutputBytes, accepted172PacketBytes, accepted172ValidationRecord] =
  await Promise.all([
    readFile(path.resolve(activation.acceptedDebate172.output)),
    readFile(path.resolve(activation.acceptedDebate172.packet)),
    readFile(
      path.resolve(activation.acceptedDebate172.validation),
      "utf8"
    ).then(JSON.parse)
  ]);
assertV4(
  sha256(accepted172OutputBytes) ===
      accepted172ValidationRecord.mergedOutputSha256 &&
    accepted172ValidationRecord.status === "passed" &&
    accepted172ValidationRecord.authorizedFieldsChanged === 2 &&
    accepted172ValidationRecord.immutableFieldsChanged === 0 &&
    accepted172ValidationRecord.lockedScoresUnchanged === true,
  "the accepted Debate 172 repair record changed"
);
const accepted172Validation = validatePostCanaryBatch02PublicationOutput(
  JSON.parse(accepted172OutputBytes),
  JSON.parse(accepted172PacketBytes)
);

async function replayAccepted(key, expectedAuthorizedFields) {
  const accepted = activation[key] ?? preparation[key];
  const [outputBytes, packetBytes, validationRecord] = await Promise.all([
    readFile(path.resolve(accepted.output)),
    readFile(path.resolve(accepted.packet)),
    readFile(path.resolve(accepted.validation), "utf8").then(JSON.parse)
  ]);
  assertV4(
    sha256(outputBytes) ===
        (validationRecord.mergedOutputSha256 ?? validationRecord.outputSha256) &&
      validationRecord.status === "passed" &&
      (expectedAuthorizedFields === 0 ||
        validationRecord.authorizedFieldsChanged === expectedAuthorizedFields) &&
      (expectedAuthorizedFields === 0 ||
        validationRecord.immutableFieldsChanged === 0) &&
      (expectedAuthorizedFields === 0 ||
        validationRecord.lockedScoresUnchanged === true),
    `${key}: accepted publication record changed`
  );
  return validatePostCanaryBatch02PublicationOutput(
    JSON.parse(outputBytes),
    JSON.parse(packetBytes)
  );
}
const accepted04Validation = await replayAccepted("acceptedDebate04", 0);
const accepted136Validation = await replayAccepted("acceptedDebate136", 9);
const accepted83Validation = await replayAccepted("acceptedDebate83", 1);
const accepted66Validation = await replayAccepted("acceptedDebate66", 0);
const accepted126Validation = await replayAccepted("acceptedDebate126", 0);
const accepted99Validation = await replayAccepted("acceptedDebate99", 9);

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
  const validation = validatePostCanaryBatch02PublicationOutput(
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
    "two-post-canary-batch-02-publication-resumption-4-contexts-passed" &&
  execution.contextsAttempted === 2 &&
  execution.contextsUnattempted === 0 &&
  execution.validContexts === 2 &&
  execution.invalidContexts === 0 &&
  valid.length === 2 &&
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
  { debateNumber: "103", validation: acceptedValidation },
  { debateNumber: "172", validation: accepted172Validation },
  { debateNumber: "04", validation: accepted04Validation },
  { debateNumber: "136", validation: accepted136Validation },
  { debateNumber: "83", validation: accepted83Validation },
  { debateNumber: "66", validation: accepted66Validation },
  { debateNumber: "126", validation: accepted126Validation },
  { debateNumber: "99", validation: accepted99Validation },
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
    "1.0-assessment-production-post-canary-batch-02-publication-resumption-4-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "post-canary-batch-02-publication-resumption-4-output-gate-passed"
    : cohortSemanticPass
      ? "post-canary-batch-02-publication-resumption-4-failed-timing"
      : "post-canary-batch-02-publication-resumption-4-failed-validation",
  productionCanary: false,
  batchNumber: 2,
  stagingOnly: true,
  developmentValidationOnly: false,
  sources: {
    preparation: PREPARATION,
    preparationSha256: sha256(preparationBytes),
    activation: ACTIVATION,
    activationSha256: sha256(activationBytes),
    execution: EXECUTION,
    executionSha256: sha256(executionBytes),
    acceptedDebate103: activation.acceptedDebate103.output,
    acceptedDebate172: activation.acceptedDebate172.output,
    acceptedDebate04: activation.acceptedDebate04.output,
    acceptedDebate136: activation.acceptedDebate136.output,
    acceptedDebate83: activation.acceptedDebate83.output,
    acceptedDebate66: preparation.acceptedDebate66.output,
    acceptedDebate126: preparation.acceptedDebate126.output,
    acceptedDebate99: preparation.acceptedDebate99.output
  },
  acceptedDebate103: {
    status: "passed-repaired-and-complete-publication-validation",
    validation: acceptedValidation,
    repairContexts: 9,
    repairedFields: 17,
    immutableFieldsChanged: 0,
    lockedScoresUnchanged: true
  },
  acceptedDebate172: {
    status: "passed-repaired-and-complete-publication-validation",
    validation: accepted172Validation,
    repairContexts: 1,
    repairedFields: 2,
    immutableFieldsChanged: 0,
    lockedScoresUnchanged: true
  },
  acceptedDebate04: {
    status: "passed-original-resumption-2-output",
    validation: accepted04Validation,
    repairContexts: 0,
    repairedFields: 0,
    immutableFieldsChanged: 0,
    lockedScoresUnchanged: true
  },
  acceptedDebate136: {
    status: "passed-repaired-and-complete-publication-validation",
    validation: accepted136Validation,
    repairContexts: 5,
    repairedFields: 9,
    immutableFieldsChanged: 0,
    lockedScoresUnchanged: true
  },
  acceptedDebate83: {
    status: "passed-repaired-and-complete-publication-validation",
    validation: accepted83Validation,
    repairContexts: 1,
    repairedFields: 1,
    immutableFieldsChanged: 0,
    lockedScoresUnchanged: true
  },
  acceptedDebate66: {
    status: "passed-original-resumption-3-output",
    validation: accepted66Validation,
    repairContexts: 0,
    repairedFields: 0,
    immutableFieldsChanged: 0,
    lockedScoresUnchanged: true
  },
  acceptedDebate126: {
    status: "passed-original-resumption-3-output",
    validation: accepted126Validation,
    repairContexts: 0,
    repairedFields: 0,
    immutableFieldsChanged: 0,
    lockedScoresUnchanged: true
  },
  acceptedDebate99: {
    status: "passed-repaired-and-complete-publication-validation",
    validation: accepted99Validation,
    repairContexts: 5,
    repairedFields: 9,
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
    acceptedDebatesBeforeResumption: 8,
    acceptedRepairedDebates: 5,
    acceptedRepairContexts: 21,
    repairedFields: 38,
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
    acceptedDebate103RepairReplayed: true,
    acceptedDebate172RepairReplayed: true,
    acceptedDebate04Replayed: true,
    acceptedDebate136RepairReplayed: true,
    acceptedDebate83RepairReplayed: true,
    acceptedDebate66Replayed: true,
    acceptedDebate126Replayed: true,
    acceptedDebate99RepairReplayed: true,
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
    repairPacketPreparation: !passed,
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
    ? "prepare-batch-02-publication-compilation-under-standing-authorization"
    : "diagnose-batch-02-publication-resumption-4-failure-under-standing-authorization"
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
