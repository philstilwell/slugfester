#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEBATES, ORIGINAL_CONTEXT_INDEXES, PROTOCOL_ID, ROOT } from
  "./lib/assessment-production-post-canary-batch-10-publication-resumption-2.mjs";
import { validatePostCanaryBatch10PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-10-publication-validation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--frozen-at");
const frozenAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/publication-reconstruction";
const ORIGINAL_PREPARATION = `${PUBLICATION_ROOT}/execution-preparation-manifest.json`;
const RESUMPTION_1_ROOT = `${PUBLICATION_ROOT}/failure-recovery/original-unattempted-context-resumption-1`;
const RESUMPTION_1_EXECUTION = `${RESUMPTION_1_ROOT}/model-execution.json`;
const RESUMPTION_1_ANALYSIS = `${RESUMPTION_1_ROOT}/analysis.json`;
const DEBATE_107_CORRECTION_ROOT = `${RESUMPTION_1_ROOT}/debate-107-transport-correction-1`;
const DEBATE_107_CORRECTION_ANALYSIS = `${DEBATE_107_CORRECTION_ROOT}/analysis.json`;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const CAFFEINATE = "/usr/bin/caffeinate";
const ACCEPTED_DEBATES = ["21", "74", "107", "142"];

const [originalPreparationBytes, resumption1ExecutionBytes, resumption1AnalysisBytes,
  debate107CorrectionAnalysisBytes] = await Promise.all([
    ORIGINAL_PREPARATION, RESUMPTION_1_EXECUTION, RESUMPTION_1_ANALYSIS,
    DEBATE_107_CORRECTION_ANALYSIS
  ].map((file) => readFile(path.resolve(file))));
const originalPreparation = JSON.parse(originalPreparationBytes);
const resumption1Execution = JSON.parse(resumption1ExecutionBytes);
const resumption1Analysis = JSON.parse(resumption1AnalysisBytes);
const debate107CorrectionAnalysis = JSON.parse(debate107CorrectionAnalysisBytes);

assertV4(originalPreparation.contexts?.length === 10,
  "original ten-context preparation changed");
assertV4(
  resumption1Execution.status === "nine-context-publication-resumption-stopped-with-failure" &&
    resumption1Execution.contextsAttempted === 3 &&
    canonicalJson(resumption1Execution.results.map((item) => item.originalContextIndex)) ===
      canonicalJson([1, 2, 3]) &&
    canonicalJson(resumption1Execution.results.filter((item) => item.gateAcceptancePassed)
      .map((item) => item.originalContextIndex)) === canonicalJson([1, 3]) &&
    canonicalJson(resumption1Execution.unattemptedOriginalContextIndexes) ===
      canonicalJson(ORIGINAL_CONTEXT_INDEXES) &&
    resumption1Analysis.status === "nine-context-publication-resumption-failed",
  "prior original-context failure boundary changed"
);
assertV4(
  debate107CorrectionAnalysis.status ===
    "batch-10-debate-107-schema-corrected-three-field-publication-correction-passed-awaiting-six-context-resumption" &&
    debate107CorrectionAnalysis.gate?.completeDebate107Validated === true &&
    debate107CorrectionAnalysis.gate?.attempts === 1 &&
    debate107CorrectionAnalysis.gate?.retries === 0 &&
    debate107CorrectionAnalysis.gate?.timeoutExtensions === 0 &&
    debate107CorrectionAnalysis.gate?.furtherCorrections === 0,
  "accepted Debate 107 correction changed"
);

const accepted = [];
for (const debateNumber of ACCEPTED_DEBATES) {
  const output = `${PUBLICATION_ROOT}/outputs/debate-${debateNumber}.json`;
  const packet = `${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`;
  const [outputBytes, packetBytes] = await Promise.all([
    readFile(path.resolve(output)), readFile(path.resolve(packet))
  ]);
  const validation = validatePostCanaryBatch10PublicationOutput(
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
assertV4(contexts.reduce((sum, context) => sum + context.moves, 0) === 107 &&
  contexts.reduce((sum, context) => sum + context.sections, 0) === 31 &&
  contexts.reduce((sum, context) => sum + context.audioVerifiedMoves, 0) === 6,
"six-context publication coverage changed");
for (const context of contexts) {
  assertV4(!(await exists(context.rawOutput)),
    `untouched context now has output: Debate ${context.debateNumber}`);
  assertV4(!(await exists(context.validation)),
    `untouched context now has validation: Debate ${context.debateNumber}`);
  assertV4(!(await exists(context.provenance)),
    `untouched context now has provenance: Debate ${context.debateNumber}`);
}

const sourceScripts = [
  "scripts/lib/assessment-production-post-canary-batch-10-publication-resumption-2.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-10-publication-resumption-2.mjs",
  "scripts/activate-assessment-production-post-canary-batch-10-publication-resumption-2.mjs",
  "scripts/run-assessment-production-post-canary-batch-10-publication-resumption-2.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-10-publication-resumption-2.mjs",
  "scripts/lib/assessment-production-post-canary-batch-10-publication-validation.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "src/data/references.js"
];
const sourceFiles = [
  ORIGINAL_PREPARATION, RESUMPTION_1_EXECUTION, RESUMPTION_1_ANALYSIS,
  DEBATE_107_CORRECTION_ANALYSIS,
  `${DEBATE_107_CORRECTION_ROOT}/complete-validation-debate-107.json`,
  `${DEBATE_107_CORRECTION_ROOT}/merge-audit-debate-107.json`,
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
  schemaVersion: "1.0-assessment-production-post-canary-batch-10-publication-six-original-unattempted-context-resumption-preparation",
  protocolId: PROTOCOL_ID,
  status: "frozen-six-original-unattempted-batch-10-publication-contexts-prepared-not-activated",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false,
  batchNumber: 10,
  stagingOnly: true,
  userAuthorization: {
    source: "explicit user authorization after the schema-corrected Debate 107 repair",
    resolvedScope: "resume only the six original publication contexts never attempted",
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
    debate107CorrectionAnalysis: DEBATE_107_CORRECTION_ANALYSIS,
    debate107CorrectionAnalysisSha256: sha256(debate107CorrectionAnalysisBytes),
    attemptedOriginalContextIndexes: [0, 1, 2, 3],
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
    contexts: 6,
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
    stopBeforeBatch11: true
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
    debates: 6, contexts: 6, moves: 107, sections: 31, quoteEligibleMoves: 107,
    audioVerifiedMoves: 6,
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
  nextAuthorizedAction: "commit-and-push-frozen-six-context-resumption-then-activate"
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
  moves: 107,
  schedulerRamp: [2],
  attemptsPerContext: 1,
  retriesMaximum: 0,
  timeoutExtensionsMaximum: 0,
  correctionContextsMaximum: 0,
  directIncrementalCostUsdMaximum: 0
}, null, 2));
