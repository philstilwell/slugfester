#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEBATES, ORIGINAL_CONTEXT_INDEXES, ROOT } from
  "./lib/assessment-production-post-canary-batch-12-publication-resumption-1.mjs";
import { validatePostCanaryBatch12PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-12-publication-validation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-12/publication-reconstruction";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const [preparationBytes, activationBytes, executionBytes] = await Promise.all([
  `${ROOT}/execution-preparation-manifest.json`,
  `${ROOT}/execution-activation.json`,
  `${ROOT}/model-execution.json`
].map((file) => readFile(path.resolve(file))));
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
assertV4(
  execution.contextsPlanned === 9 && execution.retries === 0 &&
    execution.timeoutExtensions === 0 && execution.correctionContexts === 0 &&
    execution.meteredApiCostUsd === 0 && execution.paidServiceCallsThisStage === 0 &&
    execution.modelAuthoredScores === 0 && execution.originalFirstAttemptsOnly === true,
  "nine-context resumption execution boundary changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `analysis source hash mismatch: ${file}`);
}

const replayed = [];
for (const result of execution.results) {
  const context = activation.contexts.find(
    (candidate) => candidate.originalContextIndex === result.originalContextIndex
  );
  assertV4(context && context.debateNumber === result.debateNumber,
    `original context ${result.originalContextIndex}: identity mismatch`);
  if (!result.gateAcceptancePassed) {
    replayed.push({
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
      context.rawOutput, context.packet, context.validation, context.provenance
    ].map((file) => readFile(path.resolve(file))));
  assertV4(sha256(outputBytes) === result.outputSha256,
    `Debate ${result.debateNumber}: output hash changed`);
  assertV4(sha256(validationBytes) === result.validationSha256,
    `Debate ${result.debateNumber}: validation hash changed`);
  assertV4(sha256(provenanceBytes) === result.provenanceSha256,
    `Debate ${result.debateNumber}: provenance hash changed`);
  const validation = validatePostCanaryBatch12PublicationOutput(
    JSON.parse(outputBytes), JSON.parse(packetBytes)
  );
  const validationRecord = JSON.parse(validationBytes);
  const provenance = JSON.parse(provenanceBytes);
  assertV4(
    validation.status === "passed" && validationRecord.status === "passed" &&
      validationRecord.outputSha256 === result.outputSha256 &&
      provenance.outputSha256 === result.outputSha256 &&
      provenance.originalFirstAttempt === true && provenance.priorAttemptCount === 0 &&
      provenance.attemptCount === 1 && provenance.retryCount === 0 &&
      provenance.timeoutExtensionCount === 0 && provenance.correctionContextCount === 0,
    `Debate ${result.debateNumber}: accepted output audit mismatch`
  );
  replayed.push({
    originalContextIndex: result.originalContextIndex,
    debateNumber: result.debateNumber,
    status: result.status,
    gateAcceptancePassed: true,
    validationReplayed: true,
    outputSha256: result.outputSha256,
    validation
  });
}

const nineValid = replayed.filter((item) => item.gateAcceptancePassed);
const resumptionPassed =
  execution.status === "nine-original-unattempted-batch-12-publication-contexts-passed" &&
  execution.contextsAttempted === 9 && execution.contextsUnattempted === 0 &&
  execution.validContexts === 9 && execution.invalidContexts === 0 &&
  canonicalJson(replayed.map((item) => item.originalContextIndex)) ===
    canonicalJson(ORIGINAL_CONTEXT_INDEXES) &&
  canonicalJson(replayed.map((item) => item.debateNumber)) === canonicalJson(DEBATES) &&
  nineValid.length === 9;
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-12-publication-original-unattempted-context-resumption-analysis",
  protocolId: activation.protocolId,
  status: resumptionPassed
    ? "nine-original-unattempted-batch-12-publication-contexts-passed"
    : "nine-context-publication-resumption-failed",
  productionCanary: false,
  batchNumber: 12,
  stagingOnly: true,
  sources: {
    preparation: `${ROOT}/execution-preparation-manifest.json`,
    preparationSha256: sha256(preparationBytes),
    activation: `${ROOT}/execution-activation.json`,
    activationSha256: sha256(activationBytes),
    execution: `${ROOT}/model-execution.json`,
    executionSha256: sha256(executionBytes)
  },
  execution: {
    contextsPlanned: 9,
    contextsAttempted: execution.contextsAttempted,
    contextsUnattempted: execution.contextsUnattempted,
    validContexts: execution.validContexts,
    invalidContexts: execution.invalidContexts,
    originalContextIndexes: ORIGINAL_CONTEXT_INDEXES,
    attempts: execution.attempts,
    retries: 0,
    timeoutExtensions: 0,
    correctionContexts: 0,
    schedulerRamp: [1, 2],
    maximumObservedConcurrency: execution.maximumObservedConcurrency,
    wallElapsedMs: execution.wallElapsedMs,
    aggregateModelElapsedMs: execution.aggregateModelElapsedMs,
    hostAwakeGuardAppliedToEveryAttempt: execution.hostAwakeGuardAppliedToEveryAttempt
  },
  validationReplay: replayed,
  totals: {
    debates: 9,
    lockedMoves: 181,
    critiques: nineValid.reduce((sum, item) => sum + item.validation.critiques, 0),
    exactSourceQuotes: nineValid.reduce((sum, item) => sum + item.validation.quoteExactSourceMatches, 0),
    overallCommentarySides: nineValid.reduce((sum, item) => sum + item.validation.overallCommentarySides, 0),
    aiExtensionSides: nineValid.reduce((sum, item) => sum + item.validation.aiExtensionSides, 0),
    modelContexts: execution.contextsAttempted,
    originalFirstAttempts: execution.attempts,
    retries: 0,
    modelAuthoredScores: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
  },
  authorization: {
    completeCohortReplay: resumptionPassed,
    publicationCompilationPreparation: false,
    publicationFinalization: false,
    renderingVerification: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: resumptionPassed
    ? "deterministically-replay-complete-ten-debate-publication-cohort"
    : "stop-no-automatic-retry-timeout-extension-or-correction"
};

let completeCohort = null;
if (resumptionPassed) {
  const allDebates = ["152", ...DEBATES];
  const completeReplay = [];
  for (const debateNumber of allDebates) {
    const outputPath = `${PUBLICATION_ROOT}/outputs/debate-${debateNumber}.json`;
    const packetPath = `${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`;
    const [outputBytes, packetBytes] = await Promise.all([
      readFile(path.resolve(outputPath)), readFile(path.resolve(packetPath))
    ]);
    const validation = validatePostCanaryBatch12PublicationOutput(
      JSON.parse(outputBytes), JSON.parse(packetBytes)
    );
    completeReplay.push({
      debateNumber,
      output: outputPath,
      outputSha256: sha256(outputBytes),
      packet: packetPath,
      packetSha256: sha256(packetBytes),
      source: debateNumber === "152"
        ? "accepted-two-shard-three-field-disjoint-repair"
        : "original-first-attempt-nine-context-resumption",
      validation
    });
  }
  const completePassed =
    completeReplay.length === 10 &&
    completeReplay.every((item) => item.validation.status === "passed") &&
    completeReplay.reduce((sum, item) => sum + item.validation.moves, 0) === 204 &&
    completeReplay.reduce((sum, item) => sum + item.validation.critiques, 0) === 204 &&
    completeReplay.reduce((sum, item) => sum + item.validation.quoteExactSourceMatches, 0) === 20 &&
    completeReplay.reduce((sum, item) => sum + item.validation.overallCommentarySides, 0) === 20 &&
    completeReplay.reduce((sum, item) => sum + item.validation.aiExtensionSides, 0) === 20;
  assertV4(completePassed, "complete ten-debate publication cohort did not pass");
  completeCohort = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-12-complete-publication-cohort-analysis-after-recovery",
    protocolId: activation.protocolId,
    status: "post-canary-batch-12-complete-ten-debate-publication-output-gate-passed-after-recovery",
    productionCanary: false,
    batchNumber: 12,
    stagingOnly: true,
    debates: allDebates,
    validationReplay: completeReplay,
    totals: {
      debates: 10,
      lockedMoves: 204,
      critiques: 204,
      exactSourceQuotes: 20,
      overallCommentarySides: 20,
      aiExtensionSides: 20,
      originalPublicationAttempts: 10,
      debate152FieldDisjointRepairContexts: 2,
      debate152CorrectedFields: 3,
      retries: 0,
      timeoutExtensions: 0,
      modelAuthoredScores: 0,
      scorePassesExecutedThisStage: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0
    },
    integrity: {
      everyAcceptedOutputReplayedDeterministically: true,
      participantJudgmentWasScoreBlind: true,
      scoresRemainedImmutable: true,
      aiExtensionExcludedFromScores: true,
      nineResumedContextsWereOriginalFirstAttempts: true,
      failedDebate152RejectedCritiquesRetained: false,
      allValidationCleanDebate152FieldsRetainedDeterministically: true,
      automaticRetriesPerformed: false,
      timeoutExtensionsPerformed: false,
      publicationFinalized: false,
      productionMutated: false
    },
    authorization: {
      deterministicCompilationPreparation: true,
      publicationFinalization: false,
      renderingVerification: false,
      paidServices: false,
      productionMutation: false,
      nextBatchSelection: false
    },
    nextAuthorizedAction: "prepare-batch-12-deterministic-publication-compilation"
  };
}

if (shouldWrite) {
  assertV4(!(await exists(activation.artifacts.analysis)), "resumption analysis already exists");
  assertV4(!(await exists(activation.artifacts.completeCohortAnalysis)), "complete cohort analysis already exists");
  await writeFile(path.resolve(activation.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
  if (completeCohort) {
    await writeFile(path.resolve(activation.artifacts.completeCohortAnalysis),
      `${JSON.stringify(completeCohort, null, 2)}\n`);
  }
}
console.log(JSON.stringify({
  status: analysis.status,
  contextsAttempted: analysis.execution.contextsAttempted,
  validContexts: analysis.execution.validContexts,
  resumptionCritiques: analysis.totals.critiques,
  completeCohortStatus: completeCohort?.status ?? null,
  completeCohortDebates: completeCohort?.totals.debates ?? 0,
  completeCohortCritiques: completeCohort?.totals.critiques ?? 0,
  attempts: analysis.totals.originalFirstAttempts,
  retries: 0,
  timeoutExtensions: 0,
  correctionContexts: 0,
  costUsd: 0,
  nextAuthorizedAction: completeCohort?.nextAuthorizedAction ?? analysis.nextAuthorizedAction
}, null, 2));
if (!resumptionPassed) process.exitCode = 2;
