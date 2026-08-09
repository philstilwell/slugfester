#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const root = "docs/assessment-production/canary-v1-dispute-only-adjudication";
const manifestPath = `${root}/execution-manifest.json`;
const executionPath = `${root}/model-execution.json`;
const analysisPath = `${root}/analysis.json`;
const exists = (file) => access(file).then(() => true, () => false);
if (shouldWrite) {
  for (const file of [manifestPath, executionPath, analysisPath]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

const preparation = JSON.parse(
  await readFile(`${root}/preparation-manifest.json`, "utf8")
);
const referenceExecution = JSON.parse(
  await readFile(
    "docs/calibration/v4.2.21.17.28/hard-route-dispute-only-adjudication/model-execution.json",
    "utf8"
  )
);
assertV4(
  preparation.status ===
    "prepared-ten-isolated-production-canary-dispute-only-adjudication-contexts" &&
    preparation.authorization.executionManifest &&
    !preparation.authorization.adjudicationModelExecution &&
    preparation.totals.modelContextsExecuted === 0,
  "production-canary adjudication preparation does not authorize an execution manifest"
);
assertV4(
  preparation.model.slug === "gpt-5.6-sol" &&
    preparation.model.reasoningEffort === "low" &&
    preparation.model.authentication === "ChatGPT subscription" &&
    preparation.model.meteredApiCostUsdMaximum === 0,
  "production-canary adjudication model/authentication boundary changed"
);
assertV4(
  preparation.totals.maximumCopiedInputBytes <= 350000,
  "production-canary adjudication context exceeds the frozen transport budget"
);
assertV4(
  referenceExecution.status ===
    "five-isolated-hard-route-dispute-only-adjudication-contexts-passed" &&
    referenceExecution.validContexts === 5 &&
    referenceExecution.retries === 0 &&
    referenceExecution.scoresDerived === 0,
  "reference adjudication execution evidence unavailable"
);

const sourceFiles = [
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-dispute-only-adjudication-workflow.md",
  `${root}/preparation-manifest.json`,
  ...Object.values(preparation.inputs),
  "docs/assessment-production/canary-v1-independent-judgments/analysis.json",
  "docs/assessment-production/canary-v1-disagreement-audio-prep/analysis.json",
  "docs/assessment-production/canary-v1-audio-verification/analysis.json",
  "docs/assessment-production/canary-v1-audio-attribution-adjudication/analysis.json",
  "docs/calibration/v4.2.21.17.28/hard-route-dispute-only-adjudication/model-execution.json",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4221175-decomposed-adjudication.mjs",
  "scripts/lib/v42211728-hard-route-adjudication.mjs",
  "scripts/lib/assessment-production-canary-dispute-adjudication.mjs",
  "scripts/build-assessment-production-canary-dispute-adjudication-packets.mjs",
  "scripts/test-assessment-production-canary-dispute-adjudication-packets.mjs",
  "scripts/validate-assessment-production-canary-dispute-adjudication-output.mjs",
  "scripts/preregister-assessment-production-canary-dispute-adjudication.mjs",
  "scripts/run-assessment-production-canary-dispute-adjudication.mjs",
  "scripts/analyze-assessment-production-canary-dispute-adjudication.mjs",
  "scripts/test-assessment-production-canary-dispute-adjudication-gate.mjs",
  ...preparation.contexts.flatMap((context) => [
    context.packet,
    context.provenance,
    context.disputeSource,
    context.lockedInventory,
    context.sourcePacket,
    context.originalEvents,
    ...context.audioTranscriptInputs.map((item) => item.sourcePath),
  ]),
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) {
  sourceHashes[file] = sha256(await readFile(file));
}

const rampPhases = [
  { phase: 1, name: "operational-one", contextIndexes: [0], expansionRequiresAllValid: true },
  { phase: 2, name: "ramp-two", contextIndexes: [1, 2], expansionRequiresAllValid: true },
  {
    phase: 3,
    name: "steady-two",
    contextIndexes: preparation.contexts.map((_, index) => index).slice(3),
    expansionRequiresAllValid: false,
  },
];
const referenceAggregateMinutes = Number(
  (referenceExecution.aggregateModelElapsedMs / 60000).toFixed(2)
);
const manifest = {
  schemaVersion:
    "1.0-production-canary-dispute-only-adjudication-execution-manifest",
  protocolId: preparation.protocolId,
  status:
    "frozen-ten-isolated-production-canary-dispute-only-adjudication-contexts-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  model: structuredClone(preparation.model),
  costEstimate: {
    authentication: "ChatGPT subscription",
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    expectedWallMinutes: [18, 40],
    expectedAggregateModelMinutes: [28, 65],
    absoluteGateTimeoutMinutes: 90,
    fiveContextReferenceAggregateMinutes: referenceAggregateMinutes,
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
    publicationProseUnavailable: true,
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
      "CODEX_API_KEY",
    ],
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
  },
  deterministicValidation: {
    exactCandidateSelectionOnly: true,
    dependencyPairsIndivisible: true,
    allDisputedFieldsDecidedOnce: true,
    importanceTreatedAsJudgmentField: true,
    nondisputedFieldsUntouched: true,
    candidateProvenanceRepositoryOnly: true,
    calculatedScores: 0,
  },
  authorization: {
    adjudicationModelContexts: true,
    deterministicValidation: true,
    deterministicAnalysis: true,
    retry: false,
    correctionModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  stopRules: {
    sourceHashMismatchBlocks: true,
    preexistingOutputBlocks: true,
    invalidOutputPreserved: true,
    laterIndependentContextsContinueDuringSteadyPhase: true,
    retryAuthorized: false,
    correctionAuthorized: false,
    candidateValueRepairAuthorized: false,
    timingGatePreservedFromReference: true,
  },
  artifacts: {
    execution: executionPath,
    analysis: analysisPath,
    outputs: preparation.contexts.map((context) => context.output),
  },
  futureOutputPathsExcludedFromSourceHashes: [
    ...preparation.contexts.map((context) => context.output),
    executionPath,
    analysisPath,
  ],
  sourceHashes,
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
      scoresDerived: 0,
    },
    null,
    2
  )
);
