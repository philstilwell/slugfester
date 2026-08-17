#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { canonicalJson, assertV4 } from "./lib/v4-lean-production.mjs";
import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const VALIDATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-02";
const SOURCE_PREPARATION =
  `${VALIDATION_ROOT}/source-preparation/preparation-manifest.json`;
const ROOT = `${VALIDATION_ROOT}/independent-judgments`;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const CANARY_ROOT =
  "docs/assessment-production/canary-v1-independent-judgments";
const CANARY_EXECUTION = `${CANARY_ROOT}/model-execution.json`;
const CANARY_ANALYSIS = `${CANARY_ROOT}/analysis.json`;
const EXECUTION_WORKFLOW =
  "docs/assessment-production-canary-independent-judgment-execution-workflow.md";
const SCRIPT =
  "scripts/preregister-assessment-production-post-canary-batch-02-independent-judgments.mjs";
const TEST =
  "scripts/test-assessment-production-post-canary-batch-02-independent-judgment-manifest.mjs";
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED_API_ENVIRONMENT_VARIABLES = [
  "OPENAI_API_KEY",
  "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID",
  "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY",
  "CODEX_API_KEY",
];
const EXPECTED_DEBATES = [
  "103",
  "172",
  "04",
  "136",
  "83",
  "66",
  "126",
  "99",
  "93",
  "101",
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const allBooleanLeavesTrue = (value) => {
  if (typeof value === "boolean") return value;
  if (!value || typeof value !== "object") return true;
  return Object.values(value).every(allBooleanLeavesTrue);
};
if (shouldWrite) {
  for (const file of [MANIFEST, ACTIVATION, EXECUTION, ANALYSIS]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

const [preparation, sourcePreparation, canaryExecution, canaryAnalysis] =
  await Promise.all([
    readFile(PREPARATION, "utf8").then(JSON.parse),
    readFile(SOURCE_PREPARATION, "utf8").then(JSON.parse),
    readFile(CANARY_EXECUTION, "utf8").then(JSON.parse),
    readFile(CANARY_ANALYSIS, "utf8").then(JSON.parse),
  ]);
assertV4(
  preparation.status ===
      "twenty-post-canary-batch-02-independent-judgment-contexts-prepared-and-frozen" &&
    preparation.developmentValidationOnly === false &&
    preparation.productionCanary === false &&
    preparation.batchNumber === 2 &&
    preparation.stagingOnly === true &&
    preparation.contexts.length === 20 &&
    preparation.totals.debates === 10 &&
    preparation.totals.uniqueMoves === 190 &&
    preparation.totals.movesJudgedAcrossPasses === 380 &&
    preparation.totals.maximumCopiedInputBytes <= 115000 &&
    preparation.totals.modelContextsExecuted === 0 &&
    preparation.totals.audioCalls === 0 &&
    preparation.totals.scoresDerived === 0 &&
    preparation.transport.identicalSchemaSubtreeInterningOnly === true &&
    preparation.transport
      .deterministicallyRedundantBurdenContactLabelsRemoved === true &&
    preparation.transport.validationKeywordsRemoved === 0 &&
    preparation.transport.validationKeywordsRelaxed === 0 &&
    preparation.transport.targetEnumsChanged === 0 &&
    preparation.authorization.independentJudgmentExecutionManifest === true &&
    preparation.authorization.independentJudgmentModelExecution === false &&
    preparation.authorization.retry === false &&
    preparation.authorization.timeoutExtension === false &&
    preparation.authorization.semanticCorrection === false &&
    preparation.authorization.disagreementExtraction === false &&
    preparation.authorization.paidTranscription === false &&
    preparation.authorization.unexpectedPaidService === false &&
    preparation.authorization.audioVerification === false &&
    preparation.authorization.adjudicationExecution === false &&
    preparation.authorization.scoreDerivation === false &&
    preparation.authorization.publicationFinalization === false &&
    preparation.authorization.publicationModelExecution === false &&
    preparation.authorization.productionMutation === false &&
    preparation.authorization.nextBatchSelection === false,
  "Batch 2 preparation does not authorize an execution-preparation manifest"
);
assertV4(
  preparation.model.label === "5.6 Sol" &&
    preparation.model.slug === "gpt-5.6-sol" &&
    preparation.model.reasoningEffort === "low" &&
    preparation.model.authentication === "ChatGPT subscription" &&
    preparation.model.scoreBlind === true &&
    preparation.model.roundedIntegerScoreTiesPermitted === true &&
    preparation.model.meteredApiCostUsdMaximum === 0,
  "model, authentication, score blindness, or cost boundary drifted"
);
assertV4(
  preparation.activePolicy.version === "v2.2" &&
    preparation.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie ===
      true &&
    preparation.activePolicy.scorePassesMaximum === 1,
  "the active v2.2 integer-rounded-tie policy drifted"
);
assertV4(
  preparation.validatedInventoryContract.planAndSideIsolationPreserved ===
      true &&
    preparation.validatedInventoryContract.scoreFieldsAvailable === false,
  "the Batch 2 gate disposition or score-blind inventory contract drifted"
);
assertV4(
  preparation.sourceCompatibility?.status ===
      "exact-source-zero-lexical-token-row-preserved-with-zero-count" &&
    preparation.sourceCompatibility?.sourceRowsInjected === 0 &&
    preparation.sourceCompatibility?.sourceRowsOmitted === 0 &&
    preparation.sourceCompatibility?.sourceRowsRewritten === 0 &&
    preparation.sourceCompatibility?.minimumCandidateLexicalTokensChanged ===
      false &&
    preparation.sourceCompatibility?.occurrences?.length === 1 &&
    preparation.sourceCompatibility?.occurrences[0]?.debateNumber === "99" &&
    canonicalJson(sourcePreparation.tokenLedgerCompatibility) ===
      canonicalJson(preparation.sourceCompatibility),
  "the Batch 2 exact-source compatibility boundary drifted"
);
assertV4(
  sourcePreparation.stopRules &&
    allBooleanLeavesTrue(sourcePreparation.stopRules),
  "source-preparation stop rules are unavailable"
);
assertV4(
  canaryExecution.status ===
      "twenty-production-canary-independent-judgment-contexts-passed" &&
    canaryExecution.validContexts === 20 &&
    canaryExecution.attempts === 20 &&
    canaryExecution.retries === 0 &&
    canaryExecution.maximumParallelContextsObserved === 2 &&
    canaryExecution.scoresDerived === 0 &&
    canaryAnalysis.status ===
      "twenty-production-canary-independent-judgments-passed-disagreement-extraction-authorized" &&
    canaryAnalysis.acceptance.passed === true &&
    canaryAnalysis.acceptance.semanticRepairs === 0 &&
    canaryAnalysis.acceptance.scores === 0,
  "the promoted twenty-context independent-judgment evidence is unavailable"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: preparation source drifted`);
}

const contexts = preparation.contexts.map((context, contextIndex) => ({
  contextIndex,
  ...structuredClone(context),
}));
assertV4(
  JSON.stringify([...new Set(contexts.map((context) => context.debateNumber))]) ===
    JSON.stringify(EXPECTED_DEBATES),
  "Batch 2 debate order drifted"
);
for (const debateNumber of EXPECTED_DEBATES) {
  const pair = contexts.filter((context) => context.debateNumber === debateNumber);
  assertV4(
    pair.length === 2 &&
      pair[0].reviewerPass === "A" &&
      pair[1].reviewerPass === "B" &&
      pair[0].lockedInventoryCanonicalSha256 ===
        pair[1].lockedInventoryCanonicalSha256 &&
      pair[0].sourcePacketSha256 === pair[1].sourcePacketSha256,
    `${debateNumber}: independent pair identity drifted`
  );
  const [ledgerBytes, originalEventsDocument] = await Promise.all([
    readFile(pair[0].fullLedger),
    readFile(pair[0].originalEvents, "utf8").then(JSON.parse),
  ]);
  const ledgerRows = ledgerBytes.toString("utf8").trimEnd().split("\n");
  const ledgerProjection = ledgerRows.map((line, index) => {
    const row = JSON.parse(line);
    assertV4(
      Array.isArray(row) && row.length === 4 && row[0] === index,
      `${debateNumber}: invalid canonical ledger row ${index}`
    );
    return { startMs: row[1], durationMs: row[2], text: row[3] };
  });
  const originalProjection = normalizeV418Events(originalEventsDocument).map(
    (event) => ({
      startMs: event.startMs,
      durationMs: event.durationMs,
      text: event.text,
    })
  );
  assertV4(
    canonicalJson(ledgerProjection) === canonicalJson(originalProjection),
    `${debateNumber}: canonical event projection drifted`
  );
}
for (const context of contexts) {
  for (const [file, digest] of [
    [context.lockedInventory, context.lockedInventorySha256],
    [context.sourcePacket, context.sourcePacketSha256],
    [context.originalTranscript, context.originalTranscriptSha256],
    [context.originalEvents, context.originalEventsSha256],
    [context.originalManifest, context.originalManifestSha256],
    [context.fullLedger, context.fullLedgerSha256],
    [context.judgmentPacket, context.judgmentPacketSha256],
    [context.schema, context.schemaSha256],
  ]) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: context source drifted`);
  }
}

const sourceFiles = [
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-independent-judgment-workflow.md",
  EXECUTION_WORKFLOW,
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  preparation.activePolicy.promotion,
  "docs/assessment-production/manifest-v1.json",
  preparation.inputs.manual,
  SOURCE_PREPARATION,
  PREPARATION,
  CANARY_EXECUTION,
  CANARY_ANALYSIS,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/assessment-production-score-stability-v2.2.3-compact-judgment-schema.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-02-independent-judgments.mjs",
  "scripts/test-assessment-production-post-canary-batch-02-independent-judgment-preparation.mjs",
  SCRIPT,
  TEST,
  ...Object.keys(preparation.sourceHashes),
  ...contexts.flatMap((context) => [
    context.lockedInventory,
    context.sourcePacket,
    context.originalTranscript,
    context.originalEvents,
    context.originalManifest,
    context.fullLedger,
    context.judgmentPacket,
    context.schema,
  ]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}
const futureOutputs = [
  ...contexts.flatMap((context) => [
    context.judgmentOutput,
    context.rawOutput,
    context.validationOutput,
    context.provenanceOutput,
  ]),
  EXECUTION,
  ANALYSIS,
  ACTIVATION,
];
for (const file of futureOutputs) {
  assertV4(!(await exists(file)), `future output already exists: ${file}`);
}
const codexCliVersion = execFileSync(CODEX_PATH, ["--version"], {
  encoding: "utf8",
}).trim();
const rampPhases = [
  {
    phase: "operational-canary-one",
    maximumParallelContexts: 1,
    contextIndexes: [0],
    expansionRequiresAllValid: true,
  },
  {
    phase: "ramp-two",
    maximumParallelContexts: 2,
    contextIndexes: [1, 2],
    expansionRequiresAllValid: true,
  },
  {
    phase: "steady-two",
    maximumParallelContexts: 2,
    contextIndexes: Array.from({ length: 17 }, (_, index) => index + 3),
    expansionRequiresAllValid: false,
  },
];
const stopRules = {
  ...structuredClone(sourcePreparation.stopRules),
  independentJudgmentPacketOrSchemaHashMismatchBlocks: true,
  independentJudgmentPairIdentityMismatchBlocks: true,
  independentJudgmentExecutionBeforeSeparateActivationBlocks: true,
  independentJudgmentExecutionPreparationHashMismatchBlocks: true,
  otherPassOrDebateVisibilityBlocks: true,
  legacyAssessmentOrScoreVisibilityBlocks: true,
  judgmentTimeoutBlocksAtFrozenRampBoundary: true,
  invalidJudgmentOutputBlocksAtFrozenRampBoundary: true,
  judgmentAudioAccessBlocks: true,
  disagreementExtractionBeforeAcceptedExecutionAnalysisBlocks: true,
};

const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-02-independent-judgment-execution-preparation-manifest",
  protocolId: preparation.protocolId,
  status:
    "frozen-twenty-post-canary-batch-02-independent-judgment-contexts-prepared-not-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: false,
  productionCanary: false,
  batchNumber: 2,
  stagingOnly: true,
  AIOnly: true,
  userAuthorization: structuredClone(preparation.userAuthorization),
  activePolicy: structuredClone(preparation.activePolicy),
  sourceCompatibility: structuredClone(preparation.sourceCompatibility),
  validatedInventoryContract: structuredClone(
    preparation.validatedInventoryContract
  ),
  model: {
    label: preparation.model.label,
    slug: preparation.model.slug,
    reasoningEffort: preparation.model.reasoningEffort,
    authentication: preparation.model.authentication,
    scoreBlind: true,
    roundedIntegerScoreTiesPermitted: true,
  },
  costEstimate: {
    authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    contexts: 20,
    expectedParallelWallMinutes: [50, 80],
    expectedAggregateModelMinutes: [90, 130],
    expectedAggregateComputeHours: [1.5, 2.17],
    absoluteGateTimeoutMinutes: 180,
    estimateBasis: {
      source: CANARY_EXECUTION,
      canaryContexts: canaryExecution.validContexts,
      canaryWallMinutes: Number(
        (canaryExecution.wallElapsedMs / 60000).toFixed(2)
      ),
      canaryAggregateModelMinutes: Number(
        (canaryExecution.modelWorkElapsedMs / 60000).toFixed(2)
      ),
      canaryMeanCopiedInputBytes: 100493,
      validationMeanCopiedInputBytes: preparation.totals.meanCopiedInputBytes,
      validationMovesAcrossPasses:
        preparation.totals.movesJudgedAcrossPasses,
      maximumConcurrency: 2,
    },
  },
  executionEnvironment: {
    codexPath: CODEX_PATH,
    codexCliVersion,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true,
    isolatedTemporaryWorkingDirectories: true,
  },
  modelInputs: {
    manual: preparation.inputs.manual,
    filesPerContext: [
      "manual.md",
      "source-packet.json",
      "judgment-packet.json",
      "schema.json",
    ],
  },
  preparation: PREPARATION,
  contexts,
  transport: structuredClone(preparation.transport),
  isolation: {
    freshTemporaryCodexHomePerContext: true,
    freshTemporaryWorkingDirectoryPerContext: true,
    oneDebateAndOnePassPerContext: true,
    onlyManualSourcePacketJudgmentPacketAndSchemaAvailable: true,
    passAAndPassBShareOnlySourceAndByteIdenticalLockedInventory: true,
    otherPassOutputUnavailable: true,
    otherDebateOutputsUnavailable: true,
    candidateSelectionUnavailable: true,
    failedProductionCanaryOutputsUnavailable: true,
    validationCohortOutputsUnavailable: true,
    legacyAssessmentsScoresWinnersTagsAndPublicationProseUnavailable: true,
  },
  executionPolicy: {
    contexts: 20,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutMsPerContext: 900000,
    timeoutExtensionsMaximum: 0,
    absoluteGateTimeoutMs: 10800000,
    copiedInputBytesMaximum: 115000,
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
    separateActivationRequired: true,
  },
  deterministicCompilation: structuredClone(
    preparation.deterministicCompilation
  ),
  canonicalEventProjection: {
    originalEventsHashLocked: true,
    projectedFields: ["startMs", "durationMs", "text"],
    optionalMetadataExcludedFromLedgerOnly: true,
    projectionReplayedBeforeValidation: true,
  },
  audioPolicy: structuredClone(preparation.audioPolicy),
  acceptanceContract: {
    validContextsRequired: 20,
    sameLockedInventoryPerPair: true,
    separatePassOutputsPerPair: true,
    unchangedV4220ValidatorPassesRequired: 20,
    canonicalEventProjectionReplaysRequired: 20,
    semanticRepairsMaximum: 0,
    modelAuthoredScoresMaximum: 0,
    scoresDerived: 0,
  },
  stopRules,
  authorization: {
    executionActivationPreparation: false,
    modelContexts: false,
    deterministicValidation: false,
    deterministicCompilation: false,
    deterministicAnalysis: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    disagreementExtraction: false,
    independentJudgmentModelExecution: false,
    paidTranscription: false,
    unexpectedPaidService: false,
    audioVerification: false,
    adjudicationExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationFinalization: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false,
  },
  artifacts: {
    activation: ACTIVATION,
    execution: EXECUTION,
    analysis: ANALYSIS,
    judgments: contexts.map((context) => context.judgmentOutput),
    rawOutputs: contexts.map((context) => context.rawOutput),
    validations: contexts.map((context) => context.validationOutput),
    provenance: contexts.map((context) => context.provenanceOutput),
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes,
  nextAuthorizedAction:
    "user-approval-required-before-batch-02-independent-judgment-execution-activation-or-any-judgment-model-execution",
};

if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? manifest.status : "preview",
      debates: EXPECTED_DEBATES,
      contexts: contexts.length,
      uniqueMoves: preparation.totals.uniqueMoves,
      movesJudgedAcrossPasses: preparation.totals.movesJudgedAcrossPasses,
      maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes,
      maximumParallelContexts: manifest.executionPolicy.maximumParallelContexts,
      schedulerRamp: manifest.executionPolicy.schedulerRamp,
      retriesMaximum: 0,
      timeoutExtensionsMaximum: 0,
      expectedParallelWallMinutes:
        manifest.costEstimate.expectedParallelWallMinutes,
      authentication: manifest.model.authentication,
      directIncrementalCostUsdMaximum: 0,
      modelContextsAuthorized: false,
      audioCalls: 0,
      scoresDerived: 0,
      nextAuthorizedAction: manifest.nextAuthorizedAction,
    },
    null,
    2
  )
);
