#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_02_PUBLICATION_MODEL
} from "./lib/assessment-production-post-canary-batch-02-publication.mjs";
import { POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_ROOT } from "./lib/assessment-production-post-canary-batch-02-publication-resumption.mjs";
import {
  POST_CANARY_BATCH_02_DEBATE_172_BASE_OUTPUT,
  POST_CANARY_BATCH_02_DEBATE_172_PUBLICATION_PACKET,
  POST_CANARY_BATCH_02_DEBATE_172_REPAIR_FIELDS,
  POST_CANARY_BATCH_02_DEBATE_172_REPAIR_PACKET_VERSION,
  POST_CANARY_BATCH_02_DEBATE_172_REPAIR_PARTITIONS,
  POST_CANARY_BATCH_02_DEBATE_172_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_02_DEBATE_172_REPAIR_ROOT,
  buildDebate172RepairSchema,
  debate172RepairMoveId
} from "./lib/assessment-production-post-canary-batch-02-publication-resumption-repair.mjs";
import {
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch02StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-02-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const ROOT = POST_CANARY_BATCH_02_DEBATE_172_REPAIR_ROOT;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const DIAGNOSIS = `${POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_ROOT}/failure-diagnosis.json`;
const FAILED_EXECUTION = `${POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_ROOT}/model-execution.json`;
const FAILED_ANALYSIS = `${POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_ROOT}/analysis.json`;
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const OUTPUT_CONTRACT =
  "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
const MANUAL = `${ROOT}/manual.md`;
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED_API_ENVIRONMENT_VARIABLES = [
  "OPENAI_API_KEY",
  "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID",
  "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY",
  "CODEX_API_KEY"
];

const STATIC_SOURCE_FILES = [
  PRODUCTION_WORKFLOW,
  READINESS_WORKFLOW,
  OUTPUT_CONTRACT,
  MANUAL,
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
  DIAGNOSIS,
  FAILED_EXECUTION,
  FAILED_ANALYSIS,
  POST_CANARY_BATCH_02_DEBATE_172_BASE_OUTPUT,
  POST_CANARY_BATCH_02_DEBATE_172_PUBLICATION_PACKET,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-publication-resumption-repair.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-02-publication-resumption-repair.mjs",
  "scripts/test-assessment-production-post-canary-batch-02-publication-resumption-repair-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-02-publication-resumption-repair.mjs",
  "scripts/run-assessment-production-post-canary-batch-02-publication-resumption-repair.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-02-publication-resumption-repair.mjs"
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const prettyJsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) =>
  access(path.resolve(file)).then(() => true, () => false);
const wordCount = (value) =>
  String(value).trim().split(/\s+/).filter(Boolean).length;

const sourceFiles = [
  DIAGNOSIS,
  FAILED_EXECUTION,
  FAILED_ANALYSIS,
  POST_CANARY_BATCH_02_DEBATE_172_BASE_OUTPUT,
  POST_CANARY_BATCH_02_DEBATE_172_PUBLICATION_PACKET,
  PRODUCTION_WORKFLOW,
  READINESS_WORKFLOW,
  OUTPUT_CONTRACT,
  MANUAL,
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION
];
const bytesByFile = Object.fromEntries(
  await Promise.all(
    sourceFiles.map(async (file) => [file, await readFile(path.resolve(file))])
  )
);
const parsed = (file) => JSON.parse(bytesByFile[file]);
const diagnosis = parsed(DIAGNOSIS);
const execution = parsed(FAILED_EXECUTION);
const analysis = parsed(FAILED_ANALYSIS);
const baseOutput = parsed(POST_CANARY_BATCH_02_DEBATE_172_BASE_OUTPUT);
const publicationPacket = parsed(POST_CANARY_BATCH_02_DEBATE_172_PUBLICATION_PACKET);
const standingAuthorization =
  await loadAndValidatePostCanaryBatch02StandingAuthorization();

assertV4(
  diagnosis.status ===
      "diagnosed-batch-02-resumption-operational-canary-two-critique-word-overruns" &&
    diagnosis.failedContext?.debateNumber === "172" &&
    diagnosis.failedContext?.debateId === publicationPacket.debateId &&
    diagnosis.failureBoundary?.failedFieldCount === 2 &&
    diagnosis.failureBoundary?.excessWordsTotal === 3 &&
    diagnosis.diagnosticReplay?.result?.status === "passed" &&
    diagnosis.diagnosticReplay?.originalOutputModified === false &&
    diagnosis.diagnosticReplay?.persistedCorrectedOutput === false,
  "the frozen Debate 172 failure diagnosis changed"
);
assertV4(
  diagnosis.standingAuthorization?.path ===
      POST_CANARY_BATCH_02_STANDING_AUTHORIZATION &&
    diagnosis.standingAuthorization?.sha256 === standingAuthorization.sha256 &&
    diagnosis.authorization?.standingAuthorizationApplies === true &&
    diagnosis.authorization?.repairPacketPreparation === true,
  "the standing authorization is not attached to the diagnosis"
);
assertV4(
  execution.contextsPlanned === 9 &&
    execution.contextsAttempted === 1 &&
    execution.contextsUnattempted === 8 &&
    execution.validContexts === 0 &&
    execution.invalidContexts === 1 &&
    execution.attempts === 1 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 &&
    execution.results?.[0]?.debateNumber === "172" &&
    execution.results?.[0]?.gateAcceptancePassed === false &&
    analysis.status ===
      "post-canary-batch-02-publication-resumption-failed-validation",
  "the preserved failed publication gate changed"
);
assertV4(
  sha256(bytesByFile[POST_CANARY_BATCH_02_DEBATE_172_BASE_OUTPUT]) ===
      diagnosis.failedContext.outputSha256 &&
    sha256(bytesByFile[POST_CANARY_BATCH_02_DEBATE_172_BASE_OUTPUT]) ===
      diagnosis.artifacts.output.sha256 &&
    sha256(bytesByFile[POST_CANARY_BATCH_02_DEBATE_172_PUBLICATION_PACKET]) ===
      diagnosis.artifacts.packet.sha256 &&
    sha256(bytesByFile[FAILED_EXECUTION]) === diagnosis.artifacts.execution.sha256 &&
    sha256(bytesByFile[FAILED_ANALYSIS]) === diagnosis.artifacts.analysis.sha256,
  "a diagnosed Debate 172 source artifact drifted"
);
assertV4(
  canonicalJson(diagnosis.prospectiveRecoveryOnly.proposedRepairPartition) ===
      canonicalJson(POST_CANARY_BATCH_02_DEBATE_172_REPAIR_PARTITIONS) &&
    canonicalJson(diagnosis.diagnosticReplay.hypotheticalWritableFields) ===
      canonicalJson(POST_CANARY_BATCH_02_DEBATE_172_REPAIR_FIELDS),
  "the diagnosed repair partition changed"
);

const failureByField = new Map(
  diagnosis.failureBoundary.failedFields.map((entry) => [entry.path, entry])
);
const contexts = [];
const generated = [];
for (let packetIndex = 0; packetIndex < 1; packetIndex += 1) {
  const writableFields = POST_CANARY_BATCH_02_DEBATE_172_REPAIR_PARTITIONS[packetIndex];
  const corrections = writableFields.map((field) => {
    const moveId = debate172RepairMoveId(field);
    const move = publicationPacket.moves.find((item) => item.moveId === moveId);
    const originalCritique = baseOutput.moveProse?.[moveId]?.critique;
    const diagnosed = failureByField.get(field);
    assertV4(move && originalCritique && diagnosed, `${field}: repair source missing`);
    assertV4(
      wordCount(originalCritique) === diagnosed.words &&
        originalCritique.length === diagnosed.characters &&
        diagnosed.words > 130 &&
        diagnosed.characters >= 880,
      `${field}: repair defect no longer matches its diagnosis`
    );
    return {
      field,
      moveId,
      originalCritique,
      originalWords: diagnosed.words,
      originalCharacters: diagnosed.characters,
      excessWordsAboveAcceptanceMaximum:
        diagnosed.excessWordsAboveAcceptanceMaximum,
      lockedMove: move
    };
  });
  const packet = {
    schemaVersion: POST_CANARY_BATCH_02_DEBATE_172_REPAIR_PACKET_VERSION,
    protocolId: POST_CANARY_BATCH_02_DEBATE_172_REPAIR_PROTOCOL_ID,
    packetIndex,
    productionCanary: false,
    batchNumber: 2,
    stagingOnly: true,
    debateNumber: "172",
    debateId: publicationPacket.debateId,
    repairType: "critique-word-boundary",
    immutableBaseOutput: POST_CANARY_BATCH_02_DEBATE_172_BASE_OUTPUT,
    publicationPacket: POST_CANARY_BATCH_02_DEBATE_172_PUBLICATION_PACKET,
    participantJudgmentWasScoreBlind: true,
    scoresRepositoryOwnedAndImmutable: true,
    constraints: {
      writableFields,
      labels: [
        "Strongest feature:",
        "Principal limitation:",
        "Live burden:",
        "Locked score:"
      ],
      generationTargetWords: [112, 118],
      acceptanceWords: [105, 130],
      preferredMinimumCharacters: 900,
      acceptanceMinimumCharacters: 880,
      exactSentenceCount: 4,
      terminalPunctuation: true,
      unexpectedCJKHangulKanaAndReplacementCharactersRejected: true,
      preserveAdjudicatedSubstanceAndLockedScoreBand: true,
      scoresUnavailableAsOutputFields: true
    },
    corrections
  };
  const schema = buildDebate172RepairSchema(packet);
  const packetPath = `${ROOT}/packets/packet-${packetIndex}.json`;
  const schemaPath = `${ROOT}/schemas/packet-${packetIndex}.schema.json`;
  const repairOutput = `${ROOT}/outputs/packet-${packetIndex}.json`;
  const validation = `${ROOT}/validations/packet-${packetIndex}.json`;
  const provenance = `${ROOT}/provenance/packet-${packetIndex}.json`;
  const packetBytes = prettyJsonBytes(packet);
  const schemaBytes = prettyJsonBytes(schema);
  const copiedInputBytes =
    bytesByFile[PRODUCTION_WORKFLOW].length +
    bytesByFile[READINESS_WORKFLOW].length +
    bytesByFile[OUTPUT_CONTRACT].length +
    bytesByFile[MANUAL].length +
    packetBytes.length +
    schemaBytes.length;
  generated.push([packetPath, packetBytes], [schemaPath, schemaBytes]);
  contexts.push({
    contextIndex: packetIndex,
    packetIndex,
    debateNumber: "172",
    debateId: publicationPacket.debateId,
    packet: packetPath,
    packetSha256: sha256(packetBytes),
    schema: schemaPath,
    schemaSha256: sha256(schemaBytes),
    writableFields,
    writableFieldCount: writableFields.length,
    packetBytes: packetBytes.length,
    schemaBytes: schemaBytes.length,
    copiedInputBytes,
    repairOutput,
    validation,
    provenance
  });
}
assertV4(
  contexts.length === 1 &&
    contexts.every(
      (context) =>
        context.writableFieldCount >= 1 && context.writableFieldCount <= 2
    ) &&
    new Set(contexts.flatMap((context) => context.writableFields)).size === 2,
  "exactly one two-field repair context is required"
);

const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const MERGED_OUTPUT = `${ROOT}/merged/debate-172.json`;
const COMPLETE_VALIDATION = `${ROOT}/complete-debate-validation.json`;
const MERGE_AUDIT = `${ROOT}/merge-audit.json`;
const futureOutputs = [
  ...contexts.flatMap((context) => [
    context.repairOutput,
    context.validation,
    context.provenance
  ]),
  ACTIVATION,
  EXECUTION,
  ANALYSIS,
  MERGED_OUTPUT,
  COMPLETE_VALIDATION,
  MERGE_AUDIT
];

const sourceHashes = {};
for (const file of [...new Set(STATIC_SOURCE_FILES)].sort()) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
for (const context of contexts) {
  sourceHashes[context.packet] = context.packetSha256;
  sourceHashes[context.schema] = context.schemaSha256;
}
for (const file of [MANIFEST, ...generated.map(([file]) => file), ...futureOutputs]) {
  assertV4(!(await exists(file)), `${file} already exists`);
}
for (const file of futureOutputs) {
  assertV4(!Object.hasOwn(sourceHashes, file), `future output hash included: ${file}`);
}

const rampPhases = [
  {
    phase: "operational-canary-one",
    maximumParallelContexts: 1,
    contextIndexes: [0],
    expansionRequiresAllValid: true
  }
];
const stopRules = {
  sourceHashMismatchBlocks: true,
  packetOrSchemaHashMismatchBlocks: true,
  preexistingFutureOutputBlocks: true,
  separateActivationRequired: true,
  nonSubscriptionAuthenticationBlocks: true,
  apiKeyVisibilityBlocks: true,
  nonIsolatedContextBlocks: true,
  otherRepairPacketVisibilityBlocks: true,
  legacyAssessmentVisibilityBlocks: true,
  otherDebateOrRankingVisibilityBlocks: true,
  fieldSetExpansionBlocks: true,
  scoreVisibilityOrAuthorshipBlocks: true,
  adjudicatedSubstanceOrLockedScoreBandMutationBlocks: true,
  invalidOutputBlocksAtFrozenRampBoundary: true,
  timeoutBlocksAtFrozenRampBoundary: true,
  automaticRetryBlocks: true,
  timeoutExtensionBlocks: true,
  recursiveCorrectionBlocks: true,
  remainingEightContextExecutionBlocks: true,
  paidServiceBlocks: true,
  publicationFinalizationBlocks: true,
  renderingVerificationBlocks: true,
  productionMutationBlocks: true,
  nextBatchSelectionBlocks: true
};

const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-02-debate-172-publication-repair-execution-preparation-manifest",
  protocolId: POST_CANARY_BATCH_02_DEBATE_172_REPAIR_PROTOCOL_ID,
  status:
    "frozen-one-isolated-two-field-batch-02-debate-172-publication-repair-context-prepared-under-standing-authorization",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 2,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  userAuthorization: {
    instruction: standingAuthorization.record.userAuthorization.instruction,
    resolvedScope:
      "prepare, validate, freeze, activate, and execute exactly one bounded Debate 172 publication-repair packet exposing two critique fields",
    standingAuthorizationApplied: true,
    standingAuthorizationSha256: standingAuthorization.sha256,
    directIncrementalCostUsdMaximum: 0,
    contextsPrepared: 1,
    writableFieldsPrepared: 2,
    repairModelExecution: false,
    remainingEightContextExecution: false,
    paidServices: false,
    publicationFinalization: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  model: structuredClone(POST_CANARY_BATCH_02_PUBLICATION_MODEL),
  costEstimate: {
    authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    contexts: 1,
    expectedParallelWallMinutes: [2, 8],
    expectedAggregateModelMinutes: [2, 8],
    absoluteGateTimeoutMinutes: 8,
    estimateBasis: {
      source:
        "docs/assessment-production/production-checkpoint-v2.2-1/publication-reconstruction/resumption-3/repair-1/model-execution.json",
      historicalContexts: 7,
      historicalWallMinutes: 4.34,
      historicalAggregateModelMilliseconds: 436355,
      scalingRule: "one-context-upper-bound-within-the-frozen-eight-minute-timeout"
    }
  },
  executionEnvironment: {
    codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], {
      encoding: "utf8"
    }).trim(),
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true,
    isolatedTemporaryWorkingDirectories: true
  },
  inputs: {
    productionWorkflow: PRODUCTION_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW,
    outputContract: OUTPUT_CONTRACT,
    manual: MANUAL,
    diagnosis: DIAGNOSIS,
    failedExecution: FAILED_EXECUTION,
    failedAnalysis: FAILED_ANALYSIS,
    immutableBaseOutput: POST_CANARY_BATCH_02_DEBATE_172_BASE_OUTPUT,
    publicationPacket: POST_CANARY_BATCH_02_DEBATE_172_PUBLICATION_PACKET,
    standingAuthorization: POST_CANARY_BATCH_02_STANDING_AUTHORIZATION
  },
  modelInputs: {
    productionWorkflow: PRODUCTION_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW,
    outputContract: OUTPUT_CONTRACT,
    manual: MANUAL,
    filesPerContext: [
      "production-workflow.md",
      "readiness-workflow.md",
      "output-contract.md",
      "repair-manual.md",
      "packet.json",
      "schema.json"
    ]
  },
  sourceHashes,
  contexts,
  isolation: {
    oneRepairPacketPerFreshContext: true,
    oneOrTwoCritiqueFieldsPerContext: true,
    onlyFrozenModelInputsAvailable: true,
    participantJudgmentClosed: true,
    participantJudgmentWasScoreBlind: true,
    scoresUnavailableAsInputOrOutputFields: true,
    lockedScoreBandsAvailableOnlyInsideImmutableMoveRecords: true,
    modelCannotAuthorIdentityStructureMoveSelectionOrScores: true,
    otherRepairPacketsUnavailable: true,
    otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true,
    rankingsAndWinnerComparisonsUnavailable: true
  },
  repairContract: {
    repairType: "critique-word-boundary",
    writableFields: POST_CANARY_BATCH_02_DEBATE_172_REPAIR_FIELDS,
    writableFieldsPerContextMaximum: 2,
    targetWords: [112, 118],
    acceptanceWords: [105, 130],
    preferredMinimumCharacters: 900,
    acceptanceMinimumCharacters: 880,
    exactSentenceCount: 4,
    orderedLabels: [
      "Strongest feature:",
      "Principal limitation:",
      "Live burden:",
      "Locked score:"
    ],
    preserveAdjudicatedSubstanceAndLockedScoreBand: true,
    originalFailedOutputMustRemainUnchanged: true,
    completeDebateValidationRequiredAfterMerge: true,
    modelAuthoredScoresMaximum: 0
  },
  executionPolicy: {
    contexts: 1,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    recursiveCorrectionContextsMaximum: 0,
    timeoutMsPerContext: 480000,
    absoluteGateTimeoutMs: 480000,
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
    diagnosedSourceHashesReplayedAtFreeze: true,
    oneBoundedFieldSchemaReproducedAtFreeze: true,
    originalCritiquesMatchDiagnosedCounts: true,
    completeOutputPassesAfterSyntheticInMemoryBoundaryRepair: true,
    exactFieldSetRequired: true,
    critiqueWordCharacterSentenceLabelAndPunctuationContractRequired: true,
    prohibitedLanguageAbsent: true,
    lockedScoresUnchanged: true,
    modelAuthoredScores: 0
  },
  stopRules,
  authorization: {
    executionActivationPreparation: true,
    standingAuthorizationPermitsActivation: true,
    repairModelContexts: false,
    repairModelExecution: false,
    deterministicRepairOutputValidation: false,
    deterministicMergeAndCompleteValidation: false,
    deterministicAnalysis: false,
    retry: false,
    timeoutExtension: false,
    recursiveCorrectionModelExecution: false,
    remainingEightContextExecution: false,
    publicationFinalization: false,
    renderingVerification: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  totals: {
    debates: 1,
    contexts: 1,
    writableFields: 2,
    modelContextsExecuted: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0,
    paidServiceCallsThisStage: 0,
    directIncrementalCostUsd: 0
  },
  artifacts: {
    activation: ACTIVATION,
    execution: EXECUTION,
    analysis: ANALYSIS,
    originalFailedOutput: POST_CANARY_BATCH_02_DEBATE_172_BASE_OUTPUT,
    repairOutputs: contexts.map((context) => context.repairOutput),
    validations: contexts.map((context) => context.validation),
    provenance: contexts.map((context) => context.provenance),
    mergedOutput: MERGED_OUTPUT,
    completeValidation: COMPLETE_VALIDATION,
    mergeAudit: MERGE_AUDIT
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  nextAuthorizedAction:
    "activate-and-execute-exactly-one-frozen-debate-172-publication-repair-context-under-standing-authorization"
};

if (shouldWrite) {
  for (const [file, bytes] of generated) {
    await mkdir(path.dirname(path.resolve(file)), { recursive: true });
    await writeFile(path.resolve(file), bytes);
  }
  await writeFile(path.resolve(MANIFEST), prettyJsonBytes(manifest));
}

console.log(JSON.stringify({
  status: shouldWrite ? manifest.status : "preview",
  debateNumber: "172",
  contexts: 1,
  writableFields: 2,
  writableFieldsPerContextMaximum: 2,
  model: manifest.model,
  schedulerRamp: [1, 2],
  attemptsPerContext: 1,
  retriesMaximum: 0,
  repairModelContextsAuthorized: false,
  remainingEightContextExecutionAuthorized: false,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction
}, null, 2));
