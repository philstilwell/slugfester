#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEBATES, ORIGINAL_CONTEXT_INDEXES, PROTOCOL_ID, ROOT } from
  "./lib/assessment-production-post-canary-batch-12-publication-resumption-2.mjs";
import { validatePostCanaryBatch12PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-12-publication-validation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--frozen-at");
const frozenAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-12/publication-reconstruction";
const ORIGINAL_PREPARATION = `${PUBLICATION_ROOT}/execution-preparation-manifest.json`;
const RESUMPTION_1_ROOT = `${PUBLICATION_ROOT}/failure-recovery/original-unattempted-context-resumption-1`;
const RESUMPTION_1_EXECUTION = `${RESUMPTION_1_ROOT}/model-execution.json`;
const RESUMPTION_1_ANALYSIS = `${RESUMPTION_1_ROOT}/analysis.json`;
const DEBATE_28_CORRECTION_ROOT = `${RESUMPTION_1_ROOT}/field-disjoint-repair-2`;
const DEBATE_28_CORRECTION_ANALYSIS = `${DEBATE_28_CORRECTION_ROOT}/analysis.json`;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const CAFFEINATE = "/usr/bin/caffeinate";
const ACCEPTED_DEBATES = ["152", "28"];

const [originalPreparationBytes, resumption1ExecutionBytes, resumption1AnalysisBytes,
  debate28CorrectionAnalysisBytes] = await Promise.all([
    ORIGINAL_PREPARATION, RESUMPTION_1_EXECUTION, RESUMPTION_1_ANALYSIS,
    DEBATE_28_CORRECTION_ANALYSIS
  ].map((file) => readFile(path.resolve(file))));
const originalPreparation = JSON.parse(originalPreparationBytes);
const resumption1Execution = JSON.parse(resumption1ExecutionBytes);
const resumption1Analysis = JSON.parse(resumption1AnalysisBytes);
const debate28CorrectionAnalysis = JSON.parse(debate28CorrectionAnalysisBytes);

assertV4(originalPreparation.contexts?.length === 10,
  "original ten-context preparation changed");
assertV4(
  resumption1Execution.status === "nine-context-publication-resumption-stopped-with-failure" &&
    resumption1Execution.contextsAttempted === 1 &&
    canonicalJson(resumption1Execution.results.map((item) => item.originalContextIndex)) ===
      canonicalJson([1]) &&
    canonicalJson(resumption1Execution.results.filter((item) => item.gateAcceptancePassed)
      .map((item) => item.originalContextIndex)) === canonicalJson([]) &&
    canonicalJson(resumption1Execution.unattemptedOriginalContextIndexes) ===
      canonicalJson(ORIGINAL_CONTEXT_INDEXES) &&
    resumption1Analysis.status === "nine-context-publication-resumption-failed",
  "prior original-context failure boundary changed"
);
assertV4(
  debate28CorrectionAnalysis.status ===
    "debate-28-field-disjoint-repair-level-2-passed-awaiting-eight-context-resumption" &&
    debate28CorrectionAnalysis.totals?.debatesRepaired === 1 &&
    debate28CorrectionAnalysis.totals?.correctedFieldsAccepted === 1 &&
    debate28CorrectionAnalysis.execution?.attempts === 1 &&
    debate28CorrectionAnalysis.execution?.retries === 0 &&
    debate28CorrectionAnalysis.execution?.timeoutExtensions === 0 &&
    debate28CorrectionAnalysis.execution?.furtherCorrectionContexts === 0,
  "accepted Debate 28 correction changed"
);

const accepted = [];
for (const debateNumber of ACCEPTED_DEBATES) {
  const output = `${PUBLICATION_ROOT}/outputs/debate-${debateNumber}.json`;
  const packet = `${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`;
  const [outputBytes, packetBytes] = await Promise.all([
    readFile(path.resolve(output)), readFile(path.resolve(packet))
  ]);
  const validation = validatePostCanaryBatch12PublicationOutput(
    JSON.parse(outputBytes), JSON.parse(packetBytes)
  );
  assertV4(validation.status === "passed",
    `accepted Debate ${debateNumber} output no longer validates`);
  accepted.push({ debateNumber, output, outputSha256: sha256(outputBytes), packet,
    packetSha256: sha256(packetBytes), validation });
}

const contexts = ORIGINAL_CONTEXT_INDEXES.map((originalContextIndex, resumptionIndex) => {
  const original = originalPreparation.contexts[originalContextIndex];
  assertV4(original.contextIndex === originalContextIndex &&
    original.debateNumber === DEBATES[resumptionIndex],
  `original context ${originalContextIndex} identity changed`);
  return { ...structuredClone(original), resumptionIndex, originalContextIndex,
    priorAttemptCount: 0, thisIsOriginalFirstAttempt: true };
});
assertV4(contexts.reduce((sum, context) => sum + context.moves, 0) === 157 &&
  contexts.reduce((sum, context) => sum + context.sections, 0) === 42 &&
  contexts.reduce((sum, context) => sum + context.audioVerifiedMoves, 0) === 3,
"eight-context publication coverage changed");
for (const context of contexts) {
  assertV4(!(await exists(context.rawOutput)),
    `untouched context now has output: Debate ${context.debateNumber}`);
  assertV4(!(await exists(context.validation)),
    `untouched context now has validation: Debate ${context.debateNumber}`);
  assertV4(!(await exists(context.provenance)),
    `untouched context now has provenance: Debate ${context.debateNumber}`);
}

const sourceScripts = [
  "scripts/lib/assessment-production-post-canary-batch-12-publication-resumption-2.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-12-publication-resumption-2.mjs",
  "scripts/activate-assessment-production-post-canary-batch-12-publication-resumption-2.mjs",
  "scripts/run-assessment-production-post-canary-batch-12-publication-resumption-2.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-12-publication-resumption-2.mjs",
  "scripts/lib/assessment-production-post-canary-batch-12-publication-validation.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "src/data/references.js"
];
const sourceFiles = [
  ORIGINAL_PREPARATION, RESUMPTION_1_EXECUTION, RESUMPTION_1_ANALYSIS,
  DEBATE_28_CORRECTION_ANALYSIS,
  `${DEBATE_28_CORRECTION_ROOT}/complete-validations/debate-28.json`,
  `${DEBATE_28_CORRECTION_ROOT}/merge-audits/debate-28.json`,
  originalPreparation.modelInputs.productionWorkflow,
  originalPreparation.modelInputs.readinessWorkflow,
  originalPreparation.modelInputs.outputContract,
  originalPreparation.modelInputs.manual,
  originalPreparation.modelInputs.referenceCatalog,
  ...accepted.flatMap((item) => [item.output, item.packet]),
  ...contexts.flatMap((context) => [context.packet, context.schema]),
  ...sourceScripts
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
sourceHashes[CAFFEINATE] = sha256(await readFile(CAFFEINATE));
const futureOutputs = [
  `${ROOT}/execution-activation.json`, `${ROOT}/model-execution.json`,
  `${ROOT}/analysis.json`, `${ROOT}/complete-cohort-analysis.json`,
  ...contexts.flatMap((context) => [context.rawOutput, context.validation, context.provenance])
];
for (const file of [MANIFEST, ...futureOutputs]) {
  assertV4(!(await exists(file)), `future output exists: ${file}`);
}

const rampPhases = [{ phase: "steady-two", maximumParallelContexts: 2,
  originalContextIndexes: ORIGINAL_CONTEXT_INDEXES, expansionRequiresAllValid: false }];
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-12-publication-eight-original-unattempted-context-resumption-preparation",
  protocolId: PROTOCOL_ID,
  status: "frozen-eight-original-unattempted-batch-12-publication-contexts-prepared-not-activated",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false,
  batchNumber: 12,
  stagingOnly: true,
  userAuthorization: {
    source: "Batch 12 complete-workflow standing authorization after the final permitted recovery level",
    resolvedScope: "resume only the eight original publication contexts never attempted",
    originalContextIndexes: ORIGINAL_CONTEXT_INDEXES,
    debates: DEBATES,
    directIncrementalCostUsdMaximum: 0
  },
  acceptedPublicationOutputs: accepted,
  priorFailureBoundary: {
    resumptionExecution: RESUMPTION_1_EXECUTION,
    resumptionExecutionSha256: sha256(resumption1ExecutionBytes),
    resumptionAnalysis: RESUMPTION_1_ANALYSIS,
    resumptionAnalysisSha256: sha256(resumption1AnalysisBytes),
    debate28CorrectionAnalysis: DEBATE_28_CORRECTION_ANALYSIS,
    debate28CorrectionAnalysisSha256: sha256(debate28CorrectionAnalysisBytes),
    attemptedOriginalContextIndexes: [0, 1],
    acceptedDebates: ACCEPTED_DEBATES,
    unattemptedOriginalContextIndexes: ORIGINAL_CONTEXT_INDEXES
  },
  model: structuredClone(originalPreparation.model),
  modelInputs: structuredClone(originalPreparation.modelInputs),
  contexts,
  isolation: {
    oneDebatePerContext: true,
    separateFreshModelContextPerDebateRequired: true,
    onlyFrozenModelInputsAvailable: true,
    acceptedAndFailedPublicationOutputsUnavailable: true,
    otherDebateOutputsUnavailable: true,
    legacyAssessmentsUnavailable: true,
    rankingsAndWinnerComparisonsUnavailable: true,
    participantJudgmentClosed: true,
    participantJudgmentWasScoreBlind: true,
    scoresAvailableOnlyAsImmutablePacketFields: true,
    thisStageContainsOnlyOriginalFirstAttempts: true
  },
  executionEnvironment: {
    ...structuredClone(originalPreparation.executionEnvironment),
    hostAwakeGuard: { path: CAFFEINATE, sha256: sourceHashes[CAFFEINATE], args: ["-dimsu"] }
  },
  executionPolicy: {
    contexts: 8,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0,
    correctionContextsMaximum: 0,
    maximumParallelContexts: 2,
    schedulerRamp: [2],
    rampPhases,
    continueIndependentContextsWithinStartedSteadyPhaseAfterFailure: true,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    removedEnvironmentVariables: originalPreparation.executionPolicy.removedEnvironmentVariables,
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    separateActivationRequired: true
  },
  stopRules: {
    stopOnSourceHashMismatch: true,
    noAutomaticRetry: true,
    noTimeoutExtension: true,
    noAutomaticCorrection: true,
    noPaidServices: true,
    stopBeforeBatch13: true
  },
  sourceHashes,
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  artifacts: {
    activation: `${ROOT}/execution-activation.json`,
    execution: `${ROOT}/model-execution.json`,
    analysis: `${ROOT}/analysis.json`,
    completeCohortAnalysis: `${ROOT}/complete-cohort-analysis.json`
  },
  totals: {
    debates: 8, contexts: 8, moves: 157, sections: 42, quoteEligibleMoves: 157,
    audioVerifiedMoves: 3,
    maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)),
    priorAttemptedContextsIncluded: 0, modelContextsExecuted: 0,
    modelAuthoredScores: 0, paidServiceCallsThisStage: 0, directIncrementalCostUsd: 0
  },
  authorization: {
    preparation: true, activation: true, modelExecution: true,
    deterministicValidationAndCompleteCohortReplay: true,
    retries: false, timeoutExtensions: false, correctionContexts: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false
  },
  nextAuthorizedAction: "commit-and-push-frozen-eight-context-resumption-then-activate"
};
assertV4(manifest.model.slug === "gpt-5.6-sol" &&
  manifest.model.reasoningEffort === "low" &&
  manifest.model.authentication === "ChatGPT subscription",
"authorized model settings changed");
if (shouldWrite) {
  await mkdir(path.resolve(ROOT), { recursive: true });
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? manifest.status : "preview",
  originalContextIndexes: ORIGINAL_CONTEXT_INDEXES,
  debates: DEBATES,
  moves: 157,
  schedulerRamp: [2],
  attemptsPerContext: 1,
  retriesMaximum: 0,
  timeoutExtensionsMaximum: 0,
  correctionContextsMaximum: 0,
  directIncrementalCostUsdMaximum: 0
}, null, 2));
