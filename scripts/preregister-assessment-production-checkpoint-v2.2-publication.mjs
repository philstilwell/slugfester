#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_PUBLICATION_DEBATES,
  CHECKPOINT_V22_PUBLICATION_ROOT
} from "./lib/assessment-production-checkpoint-v2.2-publication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const ROOT = CHECKPOINT_V22_PUBLICATION_ROOT;
const PACKET_PREPARATION = `${ROOT}/preparation-manifest.json`;
const EXECUTION_PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const HARD_ROUTE_EXECUTION_PLAN =
  "docs/calibration/v4.2.21.17.32/hard-route-publication-reconstruction/execution-manifest.json";
const SCRIPT =
  "scripts/preregister-assessment-production-checkpoint-v2.2-publication.mjs";
const TEST =
  "scripts/test-assessment-production-checkpoint-v2.2-publication-manifest.mjs";
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED_API_ENVIRONMENT_VARIABLES = [
  "OPENAI_API_KEY",
  "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID",
  "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY",
  "CODEX_API_KEY"
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

if (shouldWrite) {
  for (const file of [EXECUTION_PREPARATION, ACTIVATION, EXECUTION, ANALYSIS]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

const [packetPreparationBytes, hardRouteExecutionPlanBytes] = await Promise.all([
  readFile(path.resolve(PACKET_PREPARATION)),
  readFile(path.resolve(HARD_ROUTE_EXECUTION_PLAN))
]);
const preparation = JSON.parse(packetPreparationBytes);
const hardRouteExecutionPlan = JSON.parse(hardRouteExecutionPlanBytes);

assertV4(
  preparation.status ===
      "ten-production-checkpoint-v2.2-publication-contexts-prepared-and-frozen" &&
    preparation.developmentValidationOnly === false &&
    preparation.productionCanary === true &&
    preparation.stagingOnly === true &&
    preparation.contexts?.length === 10 &&
    preparation.totals?.debates === 10 &&
    preparation.totals?.contexts === 10 &&
    preparation.totals?.moves === 188 &&
    preparation.totals?.sections === 51 &&
    preparation.totals?.quoteEligibleMoves === 188 &&
    preparation.totals?.audioVerifiedMoves === 2 &&
    preparation.totals?.modelContextsExecuted === 0 &&
    preparation.totals?.modelAuthoredScores === 0 &&
    preparation.totals?.scorePassesExecutedThisStage === 0 &&
    preparation.totals?.meteredApiCostUsd === 0 &&
    preparation.authorization?.publicationExecutionManifestPreparation === true &&
    preparation.authorization?.publicationModelExecution === false &&
    preparation.authorization?.retry === false &&
    preparation.authorization?.correctionModelExecution === false &&
    preparation.authorization?.deterministicCompilation === false &&
    preparation.authorization?.publicationFinalization === false &&
    preparation.authorization?.renderingVerification === false &&
    preparation.authorization?.productionMutation === false &&
    preparation.authorization?.remainingProductionBatches === false &&
    preparation.nextAuthorizedAction ===
      "prepare-production-checkpoint-v2.2-publication-execution-manifest-model-free-only",
  "the packet preparation does not authorize a publication execution-preparation manifest"
);
assertV4(
  preparation.model?.label === "5.6 Sol" &&
    preparation.model?.slug === "gpt-5.6-sol" &&
    preparation.model?.reasoningEffort === "low" &&
    preparation.model?.authentication === "ChatGPT subscription" &&
    preparation.model?.meteredApiCostUsdMaximum === 0,
  "the publication model, authentication, or cost boundary changed"
);
assertV4(
  preparation.isolation?.oneDebatePerFutureContext === true &&
    preparation.isolation?.separateFreshModelContextPerDebateRequired === true &&
    preparation.isolation
      ?.onlyWorkflowOutputContractManualPacketCatalogAndSchemaAllowed === true &&
    preparation.isolation?.participantJudgmentClosed === true &&
    preparation.isolation?.participantJudgmentWasScoreBlind === true &&
    preparation.isolation
      ?.lockedScoresAvailableOnlyAsImmutableOwnDebateInputs === true &&
    preparation.isolation?.legacyAssessmentsUnavailable === true &&
    preparation.isolation?.otherDebatesUnavailable === true &&
    preparation.isolation?.failedProductionCanaryOutputsUnavailable === true &&
    preparation.isolation?.validationCohortOutputsUnavailable === true &&
    preparation.isolation?.rankingsUnavailable === true &&
    preparation.isolation?.winnerComparisonsUnavailable === true,
  "the frozen publication isolation boundary changed"
);
assertV4(
  hardRouteExecutionPlan.status ===
      "frozen-five-isolated-hard-route-publication-contexts-authorized" &&
    hardRouteExecutionPlan.executionPolicy?.maximumConcurrency === 2 &&
    hardRouteExecutionPlan.executionPolicy?.retriesMaximum === 0 &&
    hardRouteExecutionPlan.executionPolicy?.correctionContextsMaximum === 0 &&
    hardRouteExecutionPlan.executionPolicy?.maximumCopiedInputBytes === 400000 &&
    hardRouteExecutionPlan.costEstimate?.authentication === "ChatGPT subscription" &&
    hardRouteExecutionPlan.costEstimate?.meteredApiCostUsdMaximum === 0,
  "the proven hard-route publication execution plan is unavailable"
);

for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: source drifted`);
}

const contexts = preparation.contexts.map((context, contextIndex) => ({
  contextIndex,
  ...structuredClone(context),
  rawOutput: context.output,
  validation: `${ROOT}/validations/debate-${context.debateNumber}.json`,
  provenance: `${ROOT}/provenance/debate-${context.debateNumber}.json`
}));
assertV4(
  contexts.map((context) => context.debateNumber).join(",") ===
    CHECKPOINT_V22_PUBLICATION_DEBATES.join(","),
  "the publication debate order changed"
);
for (const context of contexts) {
  for (const [file, digest] of [
    [context.packet, context.packetSha256],
    [context.schema, context.schemaSha256],
    [context.sourcePacket, context.sourcePacketSha256],
    [context.transcript, context.transcriptSha256],
    [context.events, context.eventsSha256],
    [context.localManifest, context.localManifestSha256]
  ]) {
    assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: context source drifted`);
  }
  assertV4(
    context.copiedInputBytes <= preparation.transport.provenCeilingBytes,
    `${context.debateNumber}: copied-input ceiling exceeded`
  );
}

const sourceFiles = [
  ...Object.keys(preparation.sourceHashes),
  ...Object.values(preparation.inputs).filter(
    (value) => typeof value === "string" && !/^[a-f0-9]{64}$/.test(value)
  ),
  PACKET_PREPARATION,
  HARD_ROUTE_EXECUTION_PLAN,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4219-primary-recovery.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication.mjs",
  "scripts/prepare-assessment-production-checkpoint-v2.2-publication-packets.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-publication-preparation.mjs",
  SCRIPT,
  TEST,
  ...contexts.flatMap((context) => [
    context.packet,
    context.schema,
    context.sourcePacket,
    context.transcript,
    context.events,
    context.localManifest
  ])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}

const futureOutputs = [
  ...contexts.flatMap((context) => [
    context.rawOutput,
    context.validation,
    context.provenance,
    context.compiled
  ]),
  ACTIVATION,
  EXECUTION,
  ANALYSIS
];
for (const file of futureOutputs) {
  assertV4(!(await exists(file)), `future output already exists: ${file}`);
  assertV4(!Object.hasOwn(sourceHashes, file), `future output hash included: ${file}`);
}

const codexCliVersion = execFileSync(CODEX_PATH, ["--version"], {
  encoding: "utf8"
}).trim();
const rampPhases = [
  {
    phase: "operational-canary-one",
    maximumParallelContexts: 1,
    contextIndexes: [0],
    expansionRequiresAllValid: true
  },
  {
    phase: "ramp-two",
    maximumParallelContexts: 2,
    contextIndexes: [1, 2],
    expansionRequiresAllValid: true
  },
  {
    phase: "steady-two",
    maximumParallelContexts: 2,
    contextIndexes: Array.from({ length: 7 }, (_, index) => index + 3),
    expansionRequiresAllValid: false
  }
];
const stopRules = {
  sourceHashMismatchBlocks: true,
  packetOrSchemaHashMismatchBlocks: true,
  localCanonicalSourceHashMismatchBlocks: true,
  preexistingFutureOutputBlocks: true,
  publicationExecutionBeforeSeparateActivationBlocks: true,
  executionPreparationHashMismatchBlocks: true,
  nonSubscriptionAuthenticationBlocks: true,
  apiKeyVisibilityBlocks: true,
  legacyAssessmentVisibilityBlocks: true,
  otherDebateOrRankingVisibilityBlocks: true,
  mutableIdentityStructureMoveOrScoreFieldBlocks: true,
  modelAuthoredScoreBlocks: true,
  publicationTimeoutBlocksAtFrozenRampBoundary: true,
  invalidPublicationOutputBlocksAtFrozenRampBoundary: true,
  nonExactQuotationBlocks: true,
  critiqueIntegrityFailureBlocks: true,
  unexpectedCJKHangulOrReplacementCharacterBlocks: true,
  forcedOrUnknownReferenceTagBlocks: true,
  aiExtensionDisclosureOrNoveltyFailureBlocks: true,
  prohibitedLanguageBlocks: true,
  scoreMutationBlocks: true,
  automaticRetryBlocks: true,
  correctionContextBlocks: true,
  deterministicCompilationBeforeAcceptedAnalysisBlocks: true,
  publicationFinalizationBlocks: true,
  renderingVerificationBlocks: true,
  productionMutationBlocks: true,
  remainingProductionBatchesBlock: true
};

const manifest = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-publication-execution-preparation-manifest",
  protocolId: preparation.protocolId,
  status:
    "frozen-ten-production-checkpoint-v2.2-publication-contexts-prepared-not-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  developmentValidationOnly: false,
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  packetPreparation: PACKET_PREPARATION,
  packetPreparationSha256: sha256(packetPreparationBytes),
  model: {
    label: preparation.model.label,
    slug: preparation.model.slug,
    reasoningEffort: preparation.model.reasoningEffort,
    authentication: preparation.model.authentication
  },
  costEstimate: {
    authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    contexts: 10,
    expectedParallelWallMinutes: [24, 45],
    expectedAggregateModelMinutes: [42, 70],
    expectedAggregateComputeHours: [0.7, 1.17],
    absoluteGateTimeoutMinutes: 120,
    estimateBasis: {
      source: HARD_ROUTE_EXECUTION_PLAN,
      hardRouteContexts: hardRouteExecutionPlan.executionPolicy.contexts,
      hardRoutePlannedWallMinutes:
        hardRouteExecutionPlan.costEstimate.expectedWallMinutes,
      hardRoutePlannedAggregateModelMinutes:
        hardRouteExecutionPlan.costEstimate.expectedAggregateModelMinutes,
      hardRouteMeanCopiedInputBytes: 202770,
      checkpointContexts: 10,
      checkpointMeanCopiedInputBytes: preparation.totals.meanCopiedInputBytes,
      maximumConcurrency: 2,
      scalingRule: "two-times-five-context-plan-rounded-up-for-larger-mean-input"
    }
  },
  executionEnvironment: {
    codexPath: CODEX_PATH,
    codexCliVersion,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true,
    isolatedTemporaryWorkingDirectories: true
  },
  modelInputs: {
    productionWorkflow: preparation.inputs.productionWorkflow,
    readinessWorkflow: preparation.inputs.readinessWorkflow,
    outputContract: preparation.inputs.outputContract,
    manual: preparation.inputs.manual,
    referenceCatalog: preparation.inputs.referenceCatalog,
    filesPerContext: [
      "production-workflow.md",
      "readiness-workflow.md",
      "output-contract.md",
      "manual.md",
      "reference-catalog.json",
      "packet.json",
      "schema.json"
    ]
  },
  contexts,
  isolation: {
    freshTemporaryCodexHomePerContext: true,
    freshTemporaryWorkingDirectoryPerContext: true,
    oneDebatePerContext: true,
    onlyFrozenModelInputsAvailable: true,
    participantJudgmentClosed: true,
    participantJudgmentWasScoreBlind: true,
    ownDebateScoresAvailableOnlyAsImmutablePacketFields: true,
    otherDebateOutputsUnavailable: true,
    failedProductionCanaryOutputsUnavailable: true,
    validationCohortOutputsUnavailable: true,
    legacyAssessmentsUnavailable: true,
    rankingsAndWinnerComparisonsUnavailable: true,
    aiExtensionPostScoringOnly: true
  },
  executionPolicy: {
    contexts: 10,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    correctionContextsMaximum: 0,
    timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0,
    absoluteGateTimeoutMs: 7200000,
    copiedInputBytesMaximum: preparation.transport.provenCeilingBytes,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    rampPhases,
    firstRealContextOperationalCanary: true,
    stopBeforeExpansionOnRampFailure: true,
    continueIndependentContextsWithinStartedSteadyPhaseAfterFailure: true,
    deterministicInputOrder: true,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    removedEnvironmentVariables: REMOVED_API_ENVIRONMENT_VARIABLES,
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    separateActivationRequired: true
  },
  deterministicValidation: {
    everyLockedMoveAuthoredExactlyOnce: true,
    exactQuoteSubstringRequired: true,
    summaryWordContractRequired: true,
    critiqueWordCharacterSentenceAndLabelContractRequired: true,
    terminalPunctuationRequired: true,
    localReferenceCatalogOnly: true,
    emptyReferenceTagsAllowed: true,
    overallCommentaryMinimumsRequired: true,
    aiExtensionDisclosureAndNoveltyMapComplete: true,
    introducedArgumentPerSideRequired: true,
    exactAccordionDisplayContractRequired: true,
    prohibitedLanguageAbsent: true,
    lockedScoresUnchanged: true,
    modelAuthoredScores: 0
  },
  acceptanceContract: {
    validContextsRequired: 10,
    movesAuthoredRequired: 188,
    critiquesRequired: 188,
    exactSourceQuotesRequired: 20,
    overallCommentarySidesRequired: 20,
    aiExtensionSidesRequired: 20,
    semanticRepairsMaximum: 0,
    retriesMaximum: 0,
    correctionContextsMaximum: 0,
    modelAuthoredScoresMaximum: 0,
    scorePassesExecutedThisStage: 0
  },
  stopRules,
  authorization: {
    executionActivationPreparation: true,
    modelContexts: false,
    publicationModelExecution: false,
    deterministicValidation: false,
    deterministicAnalysis: false,
    retry: false,
    timeoutExtension: false,
    correctionModelExecution: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  artifacts: {
    activation: ACTIVATION,
    execution: EXECUTION,
    analysis: ANALYSIS,
    rawOutputs: contexts.map((context) => context.rawOutput),
    validations: contexts.map((context) => context.validation),
    provenance: contexts.map((context) => context.provenance),
    compiled: contexts.map((context) => context.compiled)
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes,
  nextAuthorizedAction:
    "prepare-separate-production-checkpoint-v2.2-publication-execution-activation-only"
};

if (shouldWrite) {
  await mkdir(path.resolve(ROOT), { recursive: true });
  await writeFile(path.resolve(EXECUTION_PREPARATION), `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: shouldWrite ? manifest.status : "preview",
      debates: CHECKPOINT_V22_PUBLICATION_DEBATES,
      contexts: contexts.length,
      moves: preparation.totals.moves,
      maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes,
      maximumParallelContexts: manifest.executionPolicy.maximumParallelContexts,
      schedulerRamp: manifest.executionPolicy.schedulerRamp,
      retriesMaximum: 0,
      correctionContextsMaximum: 0,
      expectedParallelWallMinutes: manifest.costEstimate.expectedParallelWallMinutes,
      authentication: manifest.model.authentication,
      directIncrementalCostUsdMaximum: 0,
      modelContextsAuthorized: false,
      productionMutationAuthorized: false,
      nextAuthorizedAction: manifest.nextAuthorizedAction
    },
    null,
    2
  )
);
