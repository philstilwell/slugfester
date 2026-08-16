#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { POST_CANARY_BATCH_01_PUBLICATION_MODEL } from "./lib/assessment-production-post-canary-batch-01-publication.mjs";
import {
  POST_CANARY_BATCH_01_RESUMPTION_REPAIR_BASE_OUTPUTS,
  POST_CANARY_BATCH_01_RESUMPTION_REPAIR_FIELDS,
  POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PACKET_VERSION,
  POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PARTITIONS,
  POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PUBLICATION_PACKETS,
  POST_CANARY_BATCH_01_RESUMPTION_REPAIR_ROOT,
  buildResumptionRepairSchema,
  parseResumptionRepairField
} from "./lib/assessment-production-post-canary-batch-01-publication-resumption-repair.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const ROOT = POST_CANARY_BATCH_01_RESUMPTION_REPAIR_ROOT;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const MANUAL = `${ROOT}/manual.md`;
const RESUMPTION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/publication-reconstruction/resumption-1";
const DIAGNOSIS = `${RESUMPTION_ROOT}/failure-diagnosis.json`;
const FAILED_EXECUTION = `${RESUMPTION_ROOT}/model-execution.json`;
const FAILED_ANALYSIS = `${RESUMPTION_ROOT}/analysis.json`;
const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/publication-reconstruction";
const ACCEPTED_COHORT_OUTPUTS = Object.freeze({
  "31": `${PUBLICATION_ROOT}/repair-1/merged/debate-31.json`,
  "94": `${RESUMPTION_ROOT}/outputs/debate-94.json`,
  "52": `${RESUMPTION_ROOT}/outputs/debate-52.json`,
  "146": `${RESUMPTION_ROOT}/outputs/debate-146.json`,
  "175": `${RESUMPTION_ROOT}/outputs/debate-175.json`,
  "75": `${RESUMPTION_ROOT}/outputs/debate-75.json`,
  "72": `${RESUMPTION_ROOT}/outputs/debate-72.json`,
  "195": `${RESUMPTION_ROOT}/outputs/debate-195.json`
});
const COHORT_PUBLICATION_PACKETS = Object.freeze(
  Object.fromEntries(
    ["31", "94", "52", "146", "91", "175", "75", "72", "13", "195"].map(
      (debateNumber) => [
        debateNumber,
        `${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`
      ]
    )
  )
);
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const OUTPUT_CONTRACT =
  "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
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
  DIAGNOSIS,
  FAILED_EXECUTION,
  FAILED_ANALYSIS,
  ...Object.values(POST_CANARY_BATCH_01_RESUMPTION_REPAIR_BASE_OUTPUTS),
  ...Object.values(POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PUBLICATION_PACKETS),
  ...Object.values(ACCEPTED_COHORT_OUTPUTS),
  ...Object.values(COHORT_PUBLICATION_PACKETS),
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-publication-resumption.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-publication-resumption-repair.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-01-publication-resumption-repair.mjs",
  "scripts/test-assessment-production-post-canary-batch-01-publication-resumption-repair-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-01-publication-resumption-repair.mjs",
  "scripts/run-assessment-production-post-canary-batch-01-publication-resumption-repair.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-01-publication-resumption-repair.mjs"
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const prettyJsonBytes = (value) =>
  Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) =>
  access(path.resolve(file)).then(
    () => true,
    () => false
  );
const wordCount = (value) =>
  String(value).trim().split(/\s+/).filter(Boolean).length;

const inputFiles = [
  DIAGNOSIS,
  FAILED_EXECUTION,
  FAILED_ANALYSIS,
  PRODUCTION_WORKFLOW,
  READINESS_WORKFLOW,
  OUTPUT_CONTRACT,
  MANUAL,
  ...Object.values(POST_CANARY_BATCH_01_RESUMPTION_REPAIR_BASE_OUTPUTS),
  ...Object.values(POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PUBLICATION_PACKETS)
];
const bytesByFile = Object.fromEntries(
  await Promise.all(
    inputFiles.map(async (file) => [file, await readFile(path.resolve(file))])
  )
);
const parsed = (file) => JSON.parse(bytesByFile[file]);
const diagnosis = parsed(DIAGNOSIS);
const execution = parsed(FAILED_EXECUTION);
const analysis = parsed(FAILED_ANALYSIS);
const baseOutputs = Object.fromEntries(
  Object.entries(POST_CANARY_BATCH_01_RESUMPTION_REPAIR_BASE_OUTPUTS).map(
    ([debateNumber, file]) => [debateNumber, parsed(file)]
  )
);
const publicationPackets = Object.fromEntries(
  Object.entries(POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PUBLICATION_PACKETS).map(
    ([debateNumber, file]) => [debateNumber, parsed(file)]
  )
);

assertV4(
  diagnosis.status ===
      "diagnosed-batch-01-publication-resumption-four-field-validation-failures" &&
    diagnosis.failureBoundary?.failedFieldCount === 4 &&
    diagnosis.failureBoundary?.affectedDebates === 2 &&
    canonicalJson(diagnosis.preservedGate?.failedDebates) ===
      canonicalJson(["91", "13"]) &&
    diagnosis.diagnosticReplay?.persistedCorrectedOutputs === 0 &&
    diagnosis.diagnosticReplay?.originalOutputBytesChanged === false &&
    diagnosis.prospectiveRecoveryOnly?.currentlyAuthorized === false &&
    diagnosis.prospectiveRecoveryOnly?.repairPacketsPrepared === 0 &&
    diagnosis.prospectiveRecoveryOnly?.proposedRepairPacketCount === 3,
  "the frozen publication-resumption failure diagnosis changed"
);
assertV4(
  canonicalJson(
    diagnosis.prospectiveRecoveryOnly.proposedRepairPackets.map(
      ({ debateNumber, writableFields }) => ({ debateNumber, writableFields })
    )
  ) === canonicalJson(POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PARTITIONS),
  "the diagnosed three-packet repair partition changed"
);
for (const [file, digest] of Object.entries(diagnosis.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `${file}: diagnosed source drifted`
  );
}
assertV4(
  execution.status ===
      "post-canary-batch-01-publication-resumption-complete-with-failure" &&
    execution.contextsAttempted === 9 &&
    execution.validContexts === 7 &&
    execution.invalidContexts === 2 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 &&
    execution.modelAuthoredScores === 0 &&
    analysis.status ===
      "post-canary-batch-01-publication-resumption-failed-validation" &&
    analysis.authorization?.repairPacketPreparation === false &&
    analysis.authorization?.repairModelExecution === false &&
    analysis.totals?.cohortDebates === 8 &&
    analysis.totals?.cohortMoves === 147,
  "the preserved failed resumption gate changed"
);

const failureByField = new Map(
  diagnosis.failureBoundary.failedFields.map((entry) => [entry.path, entry])
);
const contexts = [];
const generated = [];
for (
  let packetIndex = 0;
  packetIndex < POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PARTITIONS.length;
  packetIndex += 1
) {
  const partition = POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PARTITIONS[packetIndex];
  const { debateNumber, writableFields } = partition;
  const baseOutput = baseOutputs[debateNumber];
  const publicationPacket = publicationPackets[debateNumber];
  assertV4(
    baseOutput.debateNumber === debateNumber &&
      publicationPacket.debateNumber === debateNumber &&
      baseOutput.debateId === publicationPacket.debateId,
    `Debate ${debateNumber}: repair inputs do not align`
  );
  const corrections = writableFields.map((field) => {
    const diagnosed = failureByField.get(field);
    const parsedField = parseResumptionRepairField(field);
    assertV4(diagnosed, `${field}: diagnosed failure missing`);
    if (parsedField.type === "representative-quote") {
      const originalQuote = baseOutput.representativeQuotes[parsedField.side];
      const move = publicationPacket.moves.find(
        ({ moveId }) => moveId === originalQuote.sourceMoveId
      );
      assertV4(
        debateNumber === "91" &&
          parsedField.side === "con" &&
          move?.side === "con" &&
          move.quoteEligible === true &&
          move.sourceExcerpt.includes(originalQuote.text) === false &&
          wordCount(originalQuote.text) === diagnosed.outputWords,
        `${field}: quote failure no longer matches its diagnosis`
      );
      return {
        field,
        repairType: "representative-quote",
        side: parsedField.side,
        sourceMoveId: originalQuote.sourceMoveId,
        originalText: originalQuote.text,
        originalWords: diagnosed.outputWords,
        originalContext: originalQuote.context,
        quoteEligible: move.quoteEligible,
        sourceExcerpt: move.sourceExcerpt,
        sourceSpan: move.sourceSpan,
        targetWords: [6, 14],
        acceptanceWords: [3, 18],
        defect:
          "the original text is not an exact source substring because two transcript tokens were omitted"
      };
    }
    const originalCritique = baseOutput.moveProse[parsedField.moveId]?.critique;
    const move = publicationPacket.moves.find(
      ({ moveId }) => moveId === parsedField.moveId
    );
    assertV4(
      move &&
        originalCritique &&
        wordCount(originalCritique) === diagnosed.words &&
        originalCritique.length === diagnosed.characters &&
        diagnosed.words > 130 &&
        diagnosed.characters >= 880,
      `${field}: critique failure no longer matches its diagnosis`
    );
    return {
      field,
      repairType: "critique",
      moveId: parsedField.moveId,
      originalCritique,
      originalWords: diagnosed.words,
      originalCharacters: diagnosed.characters,
      excessWordsAboveAcceptanceMaximum:
        diagnosed.excessWordsAboveAcceptanceMaximum,
      lockedMove: move
    };
  });
  const packet = {
    schemaVersion: POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PACKET_VERSION,
    protocolId: POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PROTOCOL_ID,
    packetIndex,
    productionCanary: false,
    batchNumber: 1,
    stagingOnly: true,
    debateNumber,
    debateId: publicationPacket.debateId,
    repairType:
      corrections[0].repairType === "representative-quote"
        ? "representative-quote-exactness"
        : "critique-word-boundary",
    immutableBaseOutput:
      POST_CANARY_BATCH_01_RESUMPTION_REPAIR_BASE_OUTPUTS[debateNumber],
    publicationPacket:
      POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PUBLICATION_PACKETS[debateNumber],
    participantJudgmentWasScoreBlind: true,
    scoresRepositoryOwnedAndImmutable: true,
    constraints: {
      writableFields,
      writableFieldCount: writableFields.length,
      maximumWritableFields: 2,
      scoreFieldsUnavailableAsOutputs: true,
      identityStructureMovesTagsOverallCommentaryAndAIExtensionImmutable: true,
      preserveAdjudicatedSubstanceAndLockedScoreBand: true,
      quoteTargetWords: [6, 14],
      quoteAcceptanceWords: [3, 18],
      quoteMustBeExactEligibleSourceSubstring: true,
      critiqueLabels: [
        "Strongest feature:",
        "Principal limitation:",
        "Live burden:",
        "Locked score:"
      ],
      critiqueTargetWords: [112, 118],
      critiqueAcceptanceWords: [105, 130],
      critiquePreferredMinimumCharacters: 900,
      critiqueAcceptanceMinimumCharacters: 880,
      critiqueExactSentenceCount: 4,
      terminalPunctuation: true,
      unexpectedCJKHangulKanaAndReplacementCharactersRejected: true
    },
    corrections
  };
  const schema = buildResumptionRepairSchema(packet);
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
    repairType: packet.repairType,
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
  contexts.length === 3 &&
    canonicalJson(contexts.map(({ debateNumber }) => debateNumber)) ===
      canonicalJson(["91", "13", "13"]) &&
    canonicalJson(contexts.map(({ writableFieldCount }) => writableFieldCount)) ===
      canonicalJson([1, 2, 1]) &&
    new Set(contexts.flatMap(({ writableFields }) => writableFields)).size === 4 &&
    canonicalJson(contexts.flatMap(({ writableFields }) => writableFields)) ===
      canonicalJson(POST_CANARY_BATCH_01_RESUMPTION_REPAIR_FIELDS),
  "exactly three isolated contexts covering four disjoint fields are required"
);

const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const MERGED_OUTPUTS = {
  "91": `${ROOT}/merged/debate-91.json`,
  "13": `${ROOT}/merged/debate-13.json`
};
const COMPLETE_VALIDATIONS = {
  "91": `${ROOT}/complete-validations/debate-91.json`,
  "13": `${ROOT}/complete-validations/debate-13.json`
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
    phase: "repair-operational-canary-one",
    maximumParallelContexts: 1,
    contextIndexes: [0],
    expansionRequiresAllValid: true
  },
  {
    phase: "repair-ramp-two",
    maximumParallelContexts: 2,
    contextIndexes: [1, 2],
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
  immutableFieldMutationBlocks: true,
  invalidOutputBlocksAtFrozenRampBoundary: true,
  timeoutBlocksAtFrozenRampBoundary: true,
  automaticRetryBlocks: true,
  timeoutExtensionBlocks: true,
  recursiveCorrectionBlocks: true,
  publicationModelExecutionBlocks: true,
  paidServiceBlocks: true,
  mergeBeforeSeparateExecutionApprovalBlocks: true,
  publicationCompilationBlocks: true,
  publicationFinalizationBlocks: true,
  renderingVerificationBlocks: true,
  productionMutationBlocks: true,
  nextBatchSelectionBlocks: true
};

const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-publication-resumption-repair-execution-preparation-manifest",
  protocolId: POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PROTOCOL_ID,
  status:
    "frozen-three-isolated-four-field-batch-01-publication-resumption-repair-contexts-prepared-not-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 1,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  userAuthorization: {
    instruction:
      "I approve preparation, validation, freezing, committing, and pushing of exactly three Batch 1 score-locked publication-resumption repair packets covering the four diagnosed fields and their execution-preparation manifest only, with a direct incremental cost cap of $0. Use one single-field Debate 91 quote packet and two Debate 13 critique packets partitioned 2+1. Preserve every other field unchanged. Do not execute repair or publication models, use paid services, merge repairs, compile or finalize publication, mutate production, or select the next batch.",
    directIncrementalCostUsdMaximum: 0,
    contextsPrepared: 3,
    writableFieldsPrepared: 4,
    repairModelExecution: false,
    publicationModelExecution: false,
    paidServices: false,
    repairMerge: false,
    publicationCompilation: false,
    publicationFinalization: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  model: structuredClone(POST_CANARY_BATCH_01_PUBLICATION_MODEL),
  costEstimate: {
    authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    contexts: 3,
    expectedParallelWallMinutes: [3, 8],
    expectedAggregateModelMinutes: [3, 10],
    absoluteGateTimeoutMinutes: 24,
    estimateBasis: {
      source:
        "docs/assessment-production/post-canary-continuation-v1/batch-01/publication-reconstruction/repair-1/model-execution.json",
      historicalContexts: 7,
      historicalWallMinutes: 5.25,
      scalingRule:
        "scaled-from-seven-context-batch-01-publication-repair-with-contingency"
    }
  },
  inputs: {
    productionWorkflow: PRODUCTION_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW,
    outputContract: OUTPUT_CONTRACT,
    manual: MANUAL,
    diagnosis: DIAGNOSIS,
    failedExecution: FAILED_EXECUTION,
    failedAnalysis: FAILED_ANALYSIS,
    immutableBaseOutputs: POST_CANARY_BATCH_01_RESUMPTION_REPAIR_BASE_OUTPUTS,
    publicationPackets: POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PUBLICATION_PACKETS,
    acceptedCohortOutputs: ACCEPTED_COHORT_OUTPUTS,
    cohortPublicationPackets: COHORT_PUBLICATION_PACKETS
  },
  contexts,
  modelInputs: {
    productionWorkflow: PRODUCTION_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW,
    outputContract: OUTPUT_CONTRACT,
    manual: MANUAL
  },
  isolation: {
    freshTemporaryWorkingDirectoryPerContext: true,
    freshTemporaryCodexHomePerContext: true,
    subscriptionAuthFileOnly: true,
    otherRepairPacketsUnavailable: true,
    otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true,
    APIKeysRemoved: true
  },
  repairContract: {
    packets: 3,
    debates: 2,
    writableFields: 4,
    maximumWritableFieldsPerPacket: 2,
    partition: POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PARTITIONS,
    allOtherFieldsImmutable: true,
    scoresRepositoryOwnedAndImmutable: true,
    modelAuthoredScoresMaximum: 0,
    recursiveRepairMaximum: 0
  },
  executionEnvironment: {
    codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], {
      encoding: "utf8"
    }).trim(),
    shell: false
  },
  executionPolicy: {
    contexts: 3,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    recursiveCorrectionContextsMaximum: 0,
    timeoutMsPerContext: 480000,
    absoluteGateTimeoutMs: 1440000,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    rampPhases,
    firstRealContextOperationalCanary: true,
    stopBeforeExpansionOnRampFailure: true,
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
    repairOutputSchemaValidated: true,
    exactWritableFieldSetValidated: true,
    quoteExactEligibleSourceSubstringValidated: true,
    critiqueWordCharacterSentenceLabelAndPunctuationValidated: true,
    completeDebateValidationRequiredAfterMerge: true,
    completeTenDebateCohortReplayRequiredAfterMerge: true,
    immutableFieldDiffRequiredAfterMerge: true,
    modelAuthoredScoresRejected: true
  },
  stopRules,
  authorization: {
    executionActivationPreparation: true,
    repairModelContexts: false,
    repairModelExecution: false,
    deterministicRepairOutputValidation: false,
    deterministicMergeAndCompleteValidation: false,
    deterministicCohortReplay: false,
    deterministicAnalysis: false,
    retry: false,
    timeoutExtension: false,
    recursiveCorrectionModelExecution: false,
    publicationModelExecution: false,
    publicationCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  totals: {
    debates: 2,
    contexts: 3,
    writableFields: 4,
    modelContextsExecuted: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0,
    repairMerges: 0,
    publicationCompilationPasses: 0,
    paidServiceCallsThisStage: 0,
    directIncrementalCostUsd: 0
  },
  artifacts: {
    activation: ACTIVATION,
    execution: EXECUTION,
    analysis: ANALYSIS,
    mergedOutputs: MERGED_OUTPUTS,
    completeValidations: COMPLETE_VALIDATIONS,
    mergeAudit: MERGE_AUDIT
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes,
  nextAuthorizedAction:
    "user-approval-required-before-activation-and-execution-of-exactly-three-frozen-batch-01-publication-resumption-repair-contexts"
};

if (shouldWrite) {
  for (const [file, bytes] of generated) {
    await mkdir(path.dirname(path.resolve(file)), { recursive: true });
    await writeFile(path.resolve(file), bytes);
  }
  await writeFile(path.resolve(MANIFEST), prettyJsonBytes(manifest));
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? manifest.status : "preview",
      debates: ["91", "13"],
      contexts: 3,
      writableFields: 4,
      packetPartition: contexts.map(({ debateNumber, writableFieldCount }) => ({
        debateNumber,
        writableFieldCount
      })),
      model: manifest.model,
      modelContextsExecuted: 0,
      repairMerges: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: manifest.nextAuthorizedAction
    },
    null,
    2
  )
);
