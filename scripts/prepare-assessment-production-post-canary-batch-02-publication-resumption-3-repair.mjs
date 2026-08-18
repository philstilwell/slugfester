#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_02_PUBLICATION_MODEL
} from "./lib/assessment-production-post-canary-batch-02-publication.mjs";
import { POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_3_ROOT } from "./lib/assessment-production-post-canary-batch-02-publication-resumption-3.mjs";
import {
  POST_CANARY_BATCH_02_RESUMPTION_3_BASE_OUTPUTS,
  POST_CANARY_BATCH_02_RESUMPTION_3_PUBLICATION_PACKETS,
  POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_FIELDS,
  POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_PACKET_VERSION,
  POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_PARTITIONS,
  POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_ROOT,
  buildResumption3RepairSchema,
  resumption3RepairMoveId
} from "./lib/assessment-production-post-canary-batch-02-publication-resumption-3-repair.mjs";
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

const ROOT = POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_ROOT;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const DIAGNOSIS = `${POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_3_ROOT}/failure-diagnosis.json`;
const FAILED_EXECUTION = `${POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_3_ROOT}/model-execution.json`;
const FAILED_ANALYSIS = `${POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_3_ROOT}/analysis.json`;
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
  ...Object.values(POST_CANARY_BATCH_02_RESUMPTION_3_BASE_OUTPUTS),
  ...Object.values(POST_CANARY_BATCH_02_RESUMPTION_3_PUBLICATION_PACKETS),
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-publication-resumption-3-repair.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-02-publication-resumption-3-repair.mjs",
  "scripts/test-assessment-production-post-canary-batch-02-publication-resumption-3-repair-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-02-publication-resumption-3-repair.mjs",
  "scripts/run-assessment-production-post-canary-batch-02-publication-resumption-3-repair.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-02-publication-resumption-3-repair.mjs"
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
  ...Object.values(POST_CANARY_BATCH_02_RESUMPTION_3_BASE_OUTPUTS),
  ...Object.values(POST_CANARY_BATCH_02_RESUMPTION_3_PUBLICATION_PACKETS),
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
const baseOutputs = Object.fromEntries(
  Object.entries(POST_CANARY_BATCH_02_RESUMPTION_3_BASE_OUTPUTS).map(
    ([debateNumber, file]) => [debateNumber, parsed(file)]
  )
);
const publicationPackets = Object.fromEntries(
  Object.entries(POST_CANARY_BATCH_02_RESUMPTION_3_PUBLICATION_PACKETS).map(
    ([debateNumber, file]) => [debateNumber, parsed(file)]
  )
);
const standingAuthorization =
  await loadAndValidatePostCanaryBatch02StandingAuthorization();

assertV4(
  diagnosis.status ===
      "diagnosed-batch-02-resumption-3-debate-99-nine-critique-word-overruns" &&
    diagnosis.failureBoundary?.failedDebateCount === 1 &&
    diagnosis.failureBoundary?.failedFieldCount === 9 &&
    diagnosis.failureBoundary?.unexpectedValidationCategories === 0 &&
    diagnosis.diagnosticReplay?.originalOutputModified === false &&
    diagnosis.diagnosticReplay?.persistedCorrectedOutputs === false &&
    diagnosis.diagnosticReplay?.completeDebatePassed?.status === "passed",
  "the frozen resumption-3 failure diagnosis changed"
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
  execution.contextsPlanned === 5 &&
    execution.contextsAttempted === 3 &&
    execution.contextsUnattempted === 2 &&
    execution.validContexts === 2 &&
    execution.invalidContexts === 1 &&
    execution.attempts === 3 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 &&
    execution.results?.filter((result) => !result.gateAcceptancePassed)
      .map((result) => result.debateNumber).join(",") === "99" &&
    analysis.status ===
      "post-canary-batch-02-publication-resumption-3-failed-validation",
  "the preserved failed publication gate changed"
);
assertV4(
  sha256(bytesByFile[POST_CANARY_BATCH_02_RESUMPTION_3_BASE_OUTPUTS["99"]]) ===
      diagnosis.failedContextArtifacts.output.sha256 &&
    sha256(bytesByFile[POST_CANARY_BATCH_02_RESUMPTION_3_PUBLICATION_PACKETS["99"]]) ===
      diagnosis.failedContextArtifacts.packet.sha256,
  "Debate 99: diagnosed source artifact drifted"
);
assertV4(
  sha256(bytesByFile[FAILED_EXECUTION]) ===
      diagnosis.coreArtifacts.execution.sha256 &&
    sha256(bytesByFile[FAILED_ANALYSIS]) ===
      diagnosis.coreArtifacts.analysis.sha256,
  "the diagnosed execution or analysis drifted"
);
assertV4(
  canonicalJson(diagnosis.prospectiveRecoveryOnly.proposedRepairPartition) ===
    canonicalJson(POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_PARTITIONS) &&
    canonicalJson(
      diagnosis.failureBoundary.failedFields.map(({ path: field }) => field)
    ) ===
      canonicalJson(POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_FIELDS),
  "the diagnosed repair partition changed"
);

const failureByField = new Map(
  diagnosis.failureBoundary.failedFields.map((entry) => [entry.path, entry])
);
const contexts = [];
const generated = [];
for (let packetIndex = 0; packetIndex < 5; packetIndex += 1) {
  const partition =
    POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_PARTITIONS[packetIndex];
  const { debateNumber, writableFields } = partition;
  const baseOutput = baseOutputs[debateNumber];
  const publicationPacket = publicationPackets[debateNumber];
  const corrections = writableFields.map((field) => {
    const moveId = resumption3RepairMoveId(field);
    const move = publicationPacket.moves.find((item) => item.moveId === moveId);
    const originalCritique = baseOutput.moveProse?.[moveId]?.critique;
    const diagnosed = failureByField.get(field);
    assertV4(move && originalCritique && diagnosed, `${field}: repair source missing`);
    assertV4(
      wordCount(originalCritique) === diagnosed.words &&
        originalCritique.length === diagnosed.characters &&
        (diagnosed.words < 105 || diagnosed.words > 130) &&
        diagnosed.characters >= 880,
      `${field}: repair defect no longer matches its diagnosis`
    );
    return {
      field,
      moveId,
      originalCritique,
      originalWords: diagnosed.words,
      originalCharacters: diagnosed.characters,
      wordsBelowAcceptanceMinimum: Math.max(0, 105 - diagnosed.words),
      wordsAboveAcceptanceMaximum: diagnosed.wordsAboveMaximum,
      lockedMove: move
    };
  });
  const packet = {
    schemaVersion: POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_PACKET_VERSION,
    protocolId: POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_PROTOCOL_ID,
    packetIndex,
    productionCanary: false,
    batchNumber: 2,
    stagingOnly: true,
    debateNumber,
    debateId: publicationPacket.debateId,
    repairType: "critique-word-boundary",
    immutableBaseOutput:
      POST_CANARY_BATCH_02_RESUMPTION_3_BASE_OUTPUTS[debateNumber],
    publicationPacket:
      POST_CANARY_BATCH_02_RESUMPTION_3_PUBLICATION_PACKETS[debateNumber],
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
  const schema = buildResumption3RepairSchema(packet);
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
    debateNumber,
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
  contexts.length === 5 &&
    contexts.every(
      (context) =>
        context.writableFieldCount >= 1 && context.writableFieldCount <= 2
    ) &&
    new Set(contexts.flatMap((context) => context.writableFields)).size === 9,
  "exactly five disjoint one-or-two-field repair contexts are required"
);

const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const MERGED_OUTPUTS = {
  "99": `${ROOT}/merged/debate-99.json`
};
const COMPLETE_VALIDATIONS = {
  "99": `${ROOT}/complete-debate-99-validation.json`
};
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
  ...Object.values(MERGED_OUTPUTS),
  ...Object.values(COMPLETE_VALIDATIONS),
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
    contextIndexes: [3, 4],
    expansionRequiresAllValid: false
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
  remainingTwoContextExecutionBlocks: true,
  paidServiceBlocks: true,
  publicationFinalizationBlocks: true,
  renderingVerificationBlocks: true,
  productionMutationBlocks: true,
  nextBatchSelectionBlocks: true
};

const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-02-publication-resumption-3-repair-execution-preparation-manifest",
  protocolId: POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_PROTOCOL_ID,
  status:
    "frozen-five-isolated-nine-field-batch-02-publication-resumption-3-repair-contexts-prepared-under-standing-authorization",
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
      "prepare, validate, freeze, activate, and execute exactly five bounded Debate 99 publication-repair packets exposing nine critique fields",
    standingAuthorizationApplied: true,
    standingAuthorizationSha256: standingAuthorization.sha256,
    directIncrementalCostUsdMaximum: 0,
    contextsPrepared: 5,
    writableFieldsPrepared: 9,
    repairModelExecution: false,
    remainingTwoContextExecution: false,
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
    contexts: 5,
    expectedParallelWallMinutes: [4, 12],
    expectedAggregateModelMinutes: [6, 16],
    absoluteGateTimeoutMinutes: 40,
    estimateBasis: {
      source:
        "docs/assessment-production/post-canary-continuation-v1/batch-02/publication-reconstruction/resumption-2/repair-1/model-execution.json",
      historicalContexts: 6,
      historicalWallMinutes: 2.85,
      scalingRule: "five-sixths-of-observed-six-context-repair-with-contingency"
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
    immutableBaseOutputs: POST_CANARY_BATCH_02_RESUMPTION_3_BASE_OUTPUTS,
    publicationPackets: POST_CANARY_BATCH_02_RESUMPTION_3_PUBLICATION_PACKETS,
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
    writableFields: POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_FIELDS,
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
    contexts: 5,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    recursiveCorrectionContextsMaximum: 0,
    timeoutMsPerContext: 480000,
    absoluteGateTimeoutMs: 2400000,
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
    fiveBoundedFieldSchemasReproducedAtFreeze: true,
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
    remainingTwoContextExecution: false,
    publicationFinalization: false,
    renderingVerification: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  totals: {
    debates: 1,
    contexts: 5,
    writableFields: 9,
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
    originalFailedOutputs: POST_CANARY_BATCH_02_RESUMPTION_3_BASE_OUTPUTS,
    repairOutputs: contexts.map((context) => context.repairOutput),
    validations: contexts.map((context) => context.validation),
    provenance: contexts.map((context) => context.provenance),
    mergedOutputs: MERGED_OUTPUTS,
    completeValidations: COMPLETE_VALIDATIONS,
    mergeAudit: MERGE_AUDIT
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  nextAuthorizedAction:
    "activate-and-execute-exactly-five-frozen-resumption-3-publication-repair-contexts-under-standing-authorization"
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
  debateNumbers: ["99"],
  contexts: 5,
  writableFields: 9,
  writableFieldsPerContextMaximum: 2,
  model: manifest.model,
  schedulerRamp: [1, 2],
  attemptsPerContext: 1,
  retriesMaximum: 0,
  repairModelContextsAuthorized: false,
  remainingTwoContextExecutionAuthorized: false,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction
}, null, 2));
