#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { V213_DISPUTE_ADJ_ROOT } from "./lib/assessment-production-score-stability-v2.1.3-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);
const manifestPath = `${V213_DISPUTE_ADJ_ROOT}/execution-manifest.json`;
const executionPath = `${V213_DISPUTE_ADJ_ROOT}/model-execution.json`;
const analysisPath = `${V213_DISPUTE_ADJ_ROOT}/analysis.json`;
const exists = (file) => access(file).then(() => true, () => false);
if (shouldWrite) {
  for (const file of [manifestPath, executionPath, analysisPath]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

const preparation = JSON.parse(
  await readFile(`${V213_DISPUTE_ADJ_ROOT}/preparation-manifest.json`, "utf8")
);
const referenceExecutionPath =
  "docs/assessment-production/canary-v1-dispute-only-adjudication/model-execution.json";
const referenceExecution = JSON.parse(
  await readFile(referenceExecutionPath, "utf8")
);
assertV4(
  preparation.status ===
    "prepared-ten-isolated-v2.1.3-dispute-only-adjudication-contexts" &&
    preparation.authorization.executionManifest &&
    !preparation.authorization.adjudicationModelExecution &&
    preparation.totals.modelContextsExecuted === 0,
  "v2.1.3 adjudication preparation does not authorize an execution manifest"
);
assertV4(
  preparation.model.slug === "gpt-5.6-sol" &&
    preparation.model.reasoningEffort === "low" &&
    preparation.model.authentication === "ChatGPT subscription" &&
    preparation.model.meteredApiCostUsdMaximum === 0,
  "v2.1.3 adjudication model/authentication boundary changed"
);
assertV4(
  preparation.totals.maximumCopiedInputBytes <= 350000,
  "v2.1.3 adjudication context exceeds the frozen transport budget"
);
assertV4(
  referenceExecution.status ===
    "ten-isolated-production-canary-dispute-only-adjudication-contexts-passed" &&
    referenceExecution.validContexts === 10 &&
    referenceExecution.retries === 0 &&
    referenceExecution.scoresDerived === 0,
  "promoted production-canary adjudication evidence unavailable"
);

const cohortRoot =
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort";
const sourceFiles = [
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-score-stability-v2.1.3-dispute-only-adjudication-workflow.md",
  `${V213_DISPUTE_ADJ_ROOT}/preparation-manifest.json`,
  ...Object.values(preparation.inputs),
  `${cohortRoot}/independent-judgments/analysis.json`,
  `${cohortRoot}/disagreement-extraction/analysis.json`,
  `${cohortRoot}/audio-verification/analysis.json`,
  `${cohortRoot}/audio-attribution-adjudication/analysis.json`,
  referenceExecutionPath,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4221175-decomposed-adjudication.mjs",
  "scripts/lib/v42211728-hard-route-adjudication.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.3-dispute-adjudication.mjs",
  "scripts/build-assessment-production-score-stability-v2.1.3-dispute-adjudication-packets.mjs",
  "scripts/test-assessment-production-score-stability-v2.1.3-dispute-adjudication-packets.mjs",
  "scripts/validate-assessment-production-score-stability-v2.1.3-dispute-adjudication-output.mjs",
  "scripts/preregister-assessment-production-score-stability-v2.1.3-dispute-adjudication.mjs",
  "scripts/run-assessment-production-score-stability-v2.1.3-dispute-adjudication.mjs",
  "scripts/analyze-assessment-production-score-stability-v2.1.3-dispute-adjudication.mjs",
  "scripts/test-assessment-production-score-stability-v2.1.3-dispute-adjudication-gate.mjs",
  ...preparation.contexts.flatMap((context) => [
    context.packet,
    context.provenance,
    context.disputeSource,
    context.lockedInventory,
    context.sourcePacket,
    context.originalEvents,
    ...context.audioTranscriptInputs.map((item) => item.sourcePath)
  ])
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) {
  sourceHashes[file] = sha256(await readFile(file));
}

const rampPhases = [
  {
    phase: 1,
    name: "operational-one",
    contextIndexes: [0],
    expansionRequiresAllValid: true
  },
  {
    phase: 2,
    name: "ramp-two",
    contextIndexes: [1, 2],
    expansionRequiresAllValid: true
  },
  {
    phase: 3,
    name: "steady-two",
    contextIndexes: preparation.contexts.map((_, index) => index).slice(3),
    expansionRequiresAllValid: false
  }
];
const referenceWallMinutes = Number(
  (referenceExecution.wallElapsedMs / 60000).toFixed(2)
);
const referenceAggregateMinutes = Number(
  (referenceExecution.aggregateModelElapsedMs / 60000).toFixed(2)
);
const manifest = {
  schemaVersion:
    "1.0-score-stability-v2.1.3-dispute-only-adjudication-execution-manifest",
  protocolId: preparation.protocolId,
  status:
    "frozen-ten-isolated-v2.1.3-dispute-only-adjudication-contexts-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  stagingOnly: true,
  developmentValidationOnly: true,
  AIOnly: true,
  model: structuredClone(preparation.model),
  costEstimate: {
    authentication: "ChatGPT subscription",
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    expectedWallMinutes: [18, 40],
    expectedAggregateModelMinutes: [28, 65],
    absoluteGateTimeoutMinutes: 90,
    promotedCanaryWallMinutes: referenceWallMinutes,
    promotedCanaryAggregateMinutes: referenceAggregateMinutes
  },
  modelInputs: preparation.inputs,
  contexts: preparation.contexts,
  isolation: {
    freshTemporaryCodexHomePerContext: true,
    freshSourceDirectoryPerContext: true,
    oneDebatePerContext: true,
    disputedFieldsOnly: true,
    lockedLocalEvidenceOnly: true,
    rawVerifiedAudioTranscriptAvailableOnlyWhereRequired: true,
    provenanceFilesUnavailable: true,
    passIdentitiesUnavailable: true,
    initialRationalesUnavailable: true,
    nondisputedFieldsUnavailable: true,
    fullInitialOutputsUnavailable: true,
    calculatedScoresUnavailable: true,
    winnersUnavailable: true,
    legacyAssessmentsUnavailable: true,
    otherDebatesUnavailable: true,
    publicationProseUnavailable: true
  },
  executionPolicy: {
    contexts: preparation.contexts.length,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    maximumConcurrency: 2,
    rampPhases,
    stopBeforeExpansionOnRampFailure: true,
    continueIndependentContextsAfterSteadyPhaseFailure: true,
    timeoutMsPerContext: 900000,
    maximumMinutesPerContext: 12,
    maximumMeanMinutes: 9.5,
    maximumCopiedInputBytes: 350000,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    removedEnvironmentVariables: [
      "OPENAI_API_KEY",
      "OPENAI_ORG_ID",
      "OPENAI_PROJECT_ID",
      "OPENAI_BASE_URL",
      "AZURE_OPENAI_API_KEY",
      "CODEX_API_KEY"
    ],
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0
  },
  deterministicValidation: {
    exactCandidateSelectionOnly: true,
    dependencyPairsIndivisible: true,
    allDisputedFieldsDecidedOnce: true,
    importanceTreatedAsJudgmentField: true,
    nondisputedFieldsUntouched: true,
    candidateProvenanceRepositoryOnly: true,
    calculatedScores: 0
  },
  authorization: {
    adjudicationModelContexts: true,
    deterministicValidation: true,
    deterministicAnalysis: true,
    retry: false,
    correctionModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  stopRules: {
    sourceHashMismatchBlocks: true,
    preexistingOutputBlocks: true,
    invalidOutputPreserved: true,
    laterIndependentContextsContinueDuringSteadyPhase: true,
    retryAuthorized: false,
    correctionAuthorized: false,
    candidateValueRepairAuthorized: false,
    timingGatePreservedFromReference: true
  },
  artifacts: {
    execution: executionPath,
    analysis: analysisPath,
    outputs: preparation.contexts.map((context) => context.output)
  },
  futureOutputPathsExcludedFromSourceHashes: [
    ...preparation.contexts.map((context) => context.output),
    executionPath,
    analysisPath
  ],
  sourceHashes,
  nextAuthorizedAction:
    "execute-ramped-ten-v2.1.3-dispute-only-adjudication-contexts-once"
};
if (shouldWrite) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? "frozen" : "preview",
      debates: manifest.contexts.map((context) => context.debateNumber),
      contexts: manifest.contexts.length,
      disputedMoves: preparation.totals.disputedMoves,
      candidateSelections: preparation.totals.candidateSelections,
      audioTranscriptInputs: preparation.totals.audioVerifiedMoves,
      maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes,
      rampPhases,
      attemptsMaximum: manifest.contexts.length,
      retriesMaximum: 0,
      expectedWallMinutes: manifest.costEstimate.expectedWallMinutes,
      expectedAggregateModelMinutes:
        manifest.costEstimate.expectedAggregateModelMinutes,
      authentication: manifest.costEstimate.authentication,
      meteredApiCostUsdMaximum: 0,
      transcriptionCostUsdMaximum: 0,
      scoresDerived: 0
    },
    null,
    2
  )
);
