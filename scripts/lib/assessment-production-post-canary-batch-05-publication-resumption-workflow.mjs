import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  buildPostCanaryBatch05PublicationSchema,
  POST_CANARY_BATCH_05_PUBLICATION_MODEL,
  POST_CANARY_BATCH_05_PUBLICATION_ROOT
} from "./assessment-production-post-canary-batch-05-publication.mjs";
import {
  validatePostCanaryBatch05PublicationOutput
} from "./assessment-production-post-canary-batch-05-publication-validation.mjs";
import {
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_DEBATES,
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_PROTOCOL_ID,
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_ROOT
} from "./assessment-production-post-canary-batch-05-publication-resumption.mjs";
import {
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch05StandingAuthorization
} from "./assessment-production-post-canary-batch-05-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

const ROOT = POST_CANARY_BATCH_05_PUBLICATION_ROOT;
const RESUMPTION_ROOT = POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_ROOT;
const MANIFEST = `${RESUMPTION_ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${RESUMPTION_ROOT}/execution-activation.json`;
const EXECUTION = `${RESUMPTION_ROOT}/model-execution.json`;
const ANALYSIS = `${RESUMPTION_ROOT}/analysis.json`;
const ORIGINAL_PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ORIGINAL_ACTIVATION = `${ROOT}/execution-activation.json`;
const ORIGINAL_EXECUTION = `${ROOT}/model-execution.json`;
const ORIGINAL_ANALYSIS = `${ROOT}/analysis.json`;
const FAILURE_DIAGNOSIS = `${ROOT}/failure-diagnosis.json`;
const REPAIR_PREPARATION = `${ROOT}/repair-1/execution-preparation-manifest.json`;
const REPAIR_ACTIVATION = `${ROOT}/repair-1/execution-activation.json`;
const REPAIR_EXECUTION = `${ROOT}/repair-1/model-execution.json`;
const REPAIR_ANALYSIS = `${ROOT}/repair-1/analysis.json`;
const REPAIR_VALIDATION = `${ROOT}/repair-1/complete-debate-validation.json`;
const REPAIR_MERGE_AUDIT = `${ROOT}/repair-1/merge-audit.json`;
const REPAIRED_DEBATE_64 = `${ROOT}/repair-1/merged/debate-64.json`;
const DEBATE_64_PACKET = `${ROOT}/packets/debate-64.json`;
const ACCEPTED_DEBATE_158 = `${ROOT}/outputs/debate-158.json`;
const DEBATE_158_PACKET = `${ROOT}/packets/debate-158.json`;
const ACCEPTED_DEBATE_158_VALIDATION = `${ROOT}/validations/debate-158.json`;
const ACCEPTED_DEBATE_158_PROVENANCE = `${ROOT}/provenance/debate-158.json`;
const ACCEPTED_DEBATE_46 = `${ROOT}/outputs/debate-46.json`;
const DEBATE_46_PACKET = `${ROOT}/packets/debate-46.json`;
const ACCEPTED_DEBATE_46_VALIDATION = `${ROOT}/validations/debate-46.json`;
const ACCEPTED_DEBATE_46_PROVENANCE = `${ROOT}/provenance/debate-46.json`;
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJsonBytes = async (file) => {
  const bytes = await readFile(path.resolve(file));
  return { bytes, value: JSON.parse(bytes) };
};

const staticSources = [
  "scripts/lib/assessment-production-post-canary-batch-05-standing-authorization.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication-resumption.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication-resumption-workflow.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-05-publication-resumption.mjs",
  "scripts/test-assessment-production-post-canary-batch-05-publication-resumption-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-05-publication-resumption.mjs",
  "scripts/run-assessment-production-post-canary-batch-05-publication-resumption.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-05-publication-resumption.mjs"
];

async function loadFrozenBoundary() {
  const files = [
    ORIGINAL_PREPARATION,
    ORIGINAL_ACTIVATION,
    ORIGINAL_EXECUTION,
    ORIGINAL_ANALYSIS,
    FAILURE_DIAGNOSIS,
    REPAIR_PREPARATION,
    REPAIR_ACTIVATION,
    REPAIR_EXECUTION,
    REPAIR_ANALYSIS,
    REPAIR_VALIDATION,
    REPAIR_MERGE_AUDIT,
    REPAIRED_DEBATE_64,
    DEBATE_64_PACKET,
    ACCEPTED_DEBATE_158,
    DEBATE_158_PACKET,
    ACCEPTED_DEBATE_158_VALIDATION,
    ACCEPTED_DEBATE_158_PROVENANCE,
    ACCEPTED_DEBATE_46,
    DEBATE_46_PACKET,
    ACCEPTED_DEBATE_46_VALIDATION,
    ACCEPTED_DEBATE_46_PROVENANCE
  ];
  const loaded = Object.fromEntries(
    await Promise.all(files.map(async (file) => [file, await readJsonBytes(file)]))
  );
  const value = (file) => loaded[file].value;
  return { loaded, value };
}

function assertOriginalAndRepairBoundary(value) {
  const originalPreparation = value(ORIGINAL_PREPARATION);
  const originalActivation = value(ORIGINAL_ACTIVATION);
  const originalExecution = value(ORIGINAL_EXECUTION);
  const originalAnalysis = value(ORIGINAL_ANALYSIS);
  const diagnosis = value(FAILURE_DIAGNOSIS);
  const repairPreparation = value(REPAIR_PREPARATION);
  const repairActivation = value(REPAIR_ACTIVATION);
  const repairExecution = value(REPAIR_EXECUTION);
  const repairAnalysis = value(REPAIR_ANALYSIS);
  const repairValidation = value(REPAIR_VALIDATION);
  const repairMergeAudit = value(REPAIR_MERGE_AUDIT);
  assertV4(
    originalPreparation.status ===
      "frozen-ten-post-canary-batch-05-score-locked-publication-contexts-prepared-not-activated" &&
      originalPreparation.contexts?.length === 10 &&
      originalPreparation.totals?.moves === 187 &&
      originalPreparation.model?.slug === "gpt-5.6-sol" &&
      originalPreparation.model?.reasoningEffort === "low" &&
      originalPreparation.model?.authentication === "ChatGPT subscription" &&
      originalActivation.status ===
        "frozen-ten-post-canary-batch-05-publication-contexts-authorized" &&
      originalActivation.contexts?.length === 10,
    "the original Batch 5 publication preparation changed"
  );
  assertV4(
    originalExecution.status ===
      "post-canary-batch-05-publication-gate-complete-with-failure" &&
      originalExecution.contextsPlanned === 10 &&
      originalExecution.contextsAttempted === 3 &&
      originalExecution.contextsUnattempted === 7 &&
      originalExecution.validContexts === 2 &&
      originalExecution.invalidContexts === 1 &&
      originalExecution.attempts === 3 &&
      originalExecution.retries === 0 &&
      originalExecution.timeoutExtensions === 0 &&
      originalExecution.correctionContexts === 0 &&
      originalAnalysis.status ===
        "post-canary-batch-05-publication-output-gate-failed" &&
      diagnosis.status ===
        "diagnosed-batch-05-debate-64-two-field-publication-validation-failure" &&
      diagnosis.rampDisposition?.contextsUnattempted === 7 &&
      canonicalJson(diagnosis.rampDisposition.unattemptedDebates) ===
        canonicalJson(POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_DEBATES),
    "the preserved seven-context Batch 5 publication boundary changed"
  );
  assertV4(
    repairPreparation.status ===
      "frozen-one-isolated-two-field-batch-05-debate-64-publication-repair-context-prepared-and-authorized" &&
      repairActivation.status ===
        "frozen-one-isolated-two-field-batch-05-debate-64-publication-repair-context-authorized" &&
      repairExecution.status ===
        "batch-05-debate-64-one-context-publication-repair-gate-passed" &&
      repairExecution.contextsAttempted === 1 &&
      repairExecution.validContexts === 1 &&
      repairExecution.attempts === 1 &&
      repairExecution.retries === 0 &&
      repairAnalysis.status ===
        "batch-05-debate-64-bounded-repair-and-complete-publication-validation-passed" &&
      repairAnalysis.authorization?.sevenContextResumptionManifestPreparation === true &&
      repairAnalysis.authorization?.sevenContextModelExecution === false &&
      repairValidation.status === "passed" &&
      repairValidation.validationSummary?.moves === 17 &&
      repairValidation.authorizedFieldsChanged === 2 &&
      repairValidation.immutableFieldsChanged === 0 &&
      repairValidation.lockedScoresUnchanged === true &&
      repairMergeAudit.status === "passed" &&
      repairMergeAudit.authorizedFieldsChanged === 2 &&
      repairMergeAudit.immutableFieldsChanged === 0,
    "the accepted Debate 64 repair boundary changed"
  );
}

export async function prepareBatch05PublicationResumption({ frozenAt, write }) {
  assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "frozenAt must be ISO");
  const standing = await loadAndValidatePostCanaryBatch05StandingAuthorization();
  const { loaded, value } = await loadFrozenBoundary();
  assertOriginalAndRepairBoundary(value);
  const originalPreparation = value(ORIGINAL_PREPARATION);
  const repaired = value(REPAIRED_DEBATE_64);
  const repairedPacket = value(DEBATE_64_PACKET);
  const repairedValidation = value(REPAIR_VALIDATION);
  assertV4(
    sha256(loaded[REPAIRED_DEBATE_64].bytes) ===
      repairedValidation.mergedOutputSha256 &&
      validatePostCanaryBatch05PublicationOutput(repaired, repairedPacket).status ===
        "passed",
    "the accepted Debate 64 output failed replay"
  );
  const originalExecution = value(ORIGINAL_EXECUTION);
  const acceptedDebates = [
    {
      debateNumber: "158", originalContextIndex: 0,
      output: ACCEPTED_DEBATE_158, packet: DEBATE_158_PACKET,
      validation: ACCEPTED_DEBATE_158_VALIDATION,
      provenance: ACCEPTED_DEBATE_158_PROVENANCE,
      repairContexts: 0, repairedFields: 0
    },
    {
      debateNumber: "46", originalContextIndex: 1,
      output: ACCEPTED_DEBATE_46, packet: DEBATE_46_PACKET,
      validation: ACCEPTED_DEBATE_46_VALIDATION,
      provenance: ACCEPTED_DEBATE_46_PROVENANCE,
      repairContexts: 0, repairedFields: 0
    },
    {
      debateNumber: "64", originalContextIndex: 2,
      output: REPAIRED_DEBATE_64, packet: DEBATE_64_PACKET,
      validation: REPAIR_VALIDATION, mergeAudit: REPAIR_MERGE_AUDIT,
      repairContexts: 1, repairedFields: 2
    }
  ].map((entry) => {
    const output = value(entry.output);
    const packet = value(entry.packet);
    const validation = validatePostCanaryBatch05PublicationOutput(output, packet);
    const originalResult = originalExecution.results.find(
      (result) => result.debateNumber === entry.debateNumber
    );
    if (entry.debateNumber !== "64") {
      assertV4(originalResult?.gateAcceptancePassed === true &&
        originalResult.outputSha256 === sha256(loaded[entry.output].bytes),
      `Debate ${entry.debateNumber}: accepted original output changed`);
    }
    return {
      ...entry,
      debateId: packet.debateId,
      moves: validation.moves,
      critiques: validation.critiques,
      exactSourceQuotes: validation.quoteExactSourceMatches,
      overallCommentarySides: validation.overallCommentarySides,
      aiExtensionSides: validation.aiExtensionSides,
      immutableFieldsChanged: 0,
      lockedScoresUnchanged: true
    };
  });
  for (const [file, digest] of Object.entries(originalPreparation.sourceHashes)) {
    assertV4(sha256(await readFile(path.resolve(file))) === digest,
      `${file}: original frozen publication source drifted`);
  }
  const contexts = [];
  for (let index = 0; index < POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_DEBATES.length; index += 1) {
    const debateNumber = POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_DEBATES[index];
    const source = originalPreparation.contexts.find(
      (context) => context.debateNumber === debateNumber
    );
    assertV4(source?.contextIndex === index + 3,
      `Debate ${debateNumber}: original frozen order changed`);
    for (const file of [source.rawOutput, source.validation, source.provenance]) {
      assertV4(!(await exists(file)), `unattempted artifact exists: ${file}`);
    }
    for (const [file, digest] of [
      [source.packet, source.packetSha256],
      [source.schema, source.schemaSha256],
      [source.sourcePacket, source.sourcePacketSha256],
      [source.transcript, source.transcriptSha256],
      [source.events, source.eventsSha256],
      [source.localManifest, source.localManifestSha256]
    ]) {
      assertV4(sha256(await readFile(path.resolve(file))) === digest,
        `Debate ${debateNumber}: frozen source drifted: ${file}`);
    }
    const output = `${RESUMPTION_ROOT}/outputs/debate-${debateNumber}.json`;
    contexts.push({
      ...structuredClone(source),
      contextIndex: index,
      originalContextIndex: source.contextIndex,
      originalUnattemptedOutput: source.rawOutput,
      originalUnattemptedValidation: source.validation,
      originalUnattemptedProvenance: source.provenance,
      rawOutput: output,
      output,
      validation: `${RESUMPTION_ROOT}/validations/debate-${debateNumber}.json`,
      provenance: `${RESUMPTION_ROOT}/provenance/debate-${debateNumber}.json`
    });
  }
  const sum = (field) => contexts.reduce((total, context) => total + context[field], 0);
  const resumptionMoves = sum("moves");
  const resumptionSections = sum("sections");
  const resumptionAudioVerifiedMoves = sum("audioVerifiedMoves");
  assertV4(
    contexts.length === 7 && resumptionMoves === 132 &&
      resumptionSections === 34 && resumptionAudioVerifiedMoves === 3,
    "the Batch 5 seven-context coverage changed"
  );
  const futureOutputs = [
    ...contexts.flatMap((context) => [
      context.rawOutput, context.validation, context.provenance
    ]),
    ACTIVATION, EXECUTION, ANALYSIS
  ];
  const sourceHashes = structuredClone(originalPreparation.sourceHashes);
  for (const file of [
    ORIGINAL_PREPARATION, ORIGINAL_ACTIVATION, ORIGINAL_EXECUTION,
    ORIGINAL_ANALYSIS, FAILURE_DIAGNOSIS, REPAIR_PREPARATION,
    REPAIR_ACTIVATION, REPAIR_EXECUTION, REPAIR_ANALYSIS,
    REPAIR_VALIDATION, REPAIR_MERGE_AUDIT, REPAIRED_DEBATE_64,
    DEBATE_64_PACKET, ACCEPTED_DEBATE_158, DEBATE_158_PACKET,
    ACCEPTED_DEBATE_158_VALIDATION, ACCEPTED_DEBATE_158_PROVENANCE,
    ACCEPTED_DEBATE_46, DEBATE_46_PACKET,
    ACCEPTED_DEBATE_46_VALIDATION, ACCEPTED_DEBATE_46_PROVENANCE,
    POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
    ...staticSources
  ]) {
    sourceHashes[file] = sha256(await readFile(path.resolve(file)));
  }
  for (const context of contexts) {
    for (const [file, digest] of [
      [context.packet, context.packetSha256], [context.schema, context.schemaSha256],
      [context.sourcePacket, context.sourcePacketSha256],
      [context.transcript, context.transcriptSha256], [context.events, context.eventsSha256],
      [context.localManifest, context.localManifestSha256]
    ]) sourceHashes[file] = digest;
  }
  for (const file of [MANIFEST, ...futureOutputs]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
  for (const file of futureOutputs) {
    assertV4(!Object.hasOwn(sourceHashes, file), `future output hash included: ${file}`);
  }
  const rampPhases = [
    { phase: "resumption-operational-one", maximumParallelContexts: 1,
      contextIndexes: [0], expansionRequiresAllValid: true },
    { phase: "resumption-ramp-two", maximumParallelContexts: 2,
      contextIndexes: [1, 2], expansionRequiresAllValid: true },
    { phase: "resumption-steady-two", maximumParallelContexts: 2,
      contextIndexes: [3, 4, 5, 6], expansionRequiresAllValid: false }
  ];
  const stopRules = Object.fromEntries([
    "acceptedDebate64RepairFailureBlocks", "sourceHashMismatchBlocks",
    "packetOrSchemaHashMismatchBlocks", "localCanonicalSourceHashMismatchBlocks",
    "originalUnattemptedArtifactPresenceBlocks", "preexistingResumptionOutputBlocks",
    "separateActivationRequired", "nonSubscriptionAuthenticationBlocks",
    "apiKeyVisibilityBlocks", "nonIsolatedContextBlocks",
    "legacyAssessmentVisibilityBlocks", "otherDebateOrRankingVisibilityBlocks",
    "mutableIdentityStructureMoveOrScoreFieldBlocks", "modelAuthoredScoreBlocks",
    "invalidOutputBlocksAtFrozenRampBoundary", "timeoutBlocksAtFrozenRampBoundary",
    "nonExactQuotationBlocks", "critiqueIntegrityFailureBlocks",
    "unexpectedCJKHangulOrReplacementCharacterBlocks", "forcedOrUnknownReferenceTagBlocks",
    "aiExtensionDisclosureOrNoveltyFailureBlocks", "prohibitedLanguageBlocks",
    "scoreMutationBlocks", "automaticRetryBlocks", "timeoutExtensionBlocks",
    "repairPacketPreparationBlocks", "correctionContextBlocks",
    "publicationCompilationBlocks", "publicationFinalizationBlocks",
    "renderingVerificationBlocks", "paidServiceBlocks", "productionMutationBlocks",
    "nextBatchSelectionBlocks"
  ].map((key) => [key, true]));
  const manifest = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-resumption-execution-preparation-manifest",
    protocolId: POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_PROTOCOL_ID,
    status: "frozen-seven-untouched-post-canary-batch-05-publication-resumption-contexts-prepared-under-standing-authorization",
    frozenAt,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    productionCanary: false,
    batchNumber: 5,
    stagingOnly: true,
    developmentValidationOnly: false,
    AIOnly: true,
    userAuthorization: {
      instruction: standing.record.userAuthorization.instruction,
      standingAuthorization: POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
      standingAuthorizationSha256: standing.sha256,
      directIncrementalCostUsdMaximum: 0,
      contextsPrepared: 7,
      existingPacketsReused: 7,
      packetsGenerated: 0,
      publicationModelExecution: false,
      paidServices: false,
      publicationCompilation: false,
      publicationFinalization: false,
      productionMutation: false,
      nextBatchSelection: false
    },
    model: structuredClone(POST_CANARY_BATCH_05_PUBLICATION_MODEL),
    costEstimate: {
      authentication: "ChatGPT subscription",
      directIncrementalCostUsdMaximum: 0,
      meteredApiCostUsdMaximum: 0,
      transcriptionCostUsdMaximum: 0,
      contexts: 7,
      expectedParallelWallMinutes: [14, 36],
      expectedAggregateModelMinutes: [24, 56],
      expectedAggregateComputeHours: [0.4, 0.94],
      absoluteGateTimeoutMinutes: 120,
      estimateBasis: {
        source: ORIGINAL_PREPARATION,
        originalTenContextExpectedParallelWallMinutes:
          originalPreparation.costEstimate.expectedParallelWallMinutes,
        originalTenContextExpectedAggregateModelMinutes:
          originalPreparation.costEstimate.expectedAggregateModelMinutes,
        scalingRule: "seven-tenths-of-frozen-ten-context-plan-rounded-outward"
      }
    },
    executionEnvironment: {
      codexPath: CODEX_PATH,
      codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(),
      authentication: "ChatGPT subscription",
      APIKeysRemoved: true,
      isolatedTemporaryCodexHomes: true,
      isolatedTemporaryWorkingDirectories: true
    },
    inputs: {
      originalPreparation: ORIGINAL_PREPARATION,
      originalActivation: ORIGINAL_ACTIVATION,
      originalExecution: ORIGINAL_EXECUTION,
      originalAnalysis: ORIGINAL_ANALYSIS,
      failureDiagnosis: FAILURE_DIAGNOSIS,
      repairPreparation: REPAIR_PREPARATION,
      repairActivation: REPAIR_ACTIVATION,
      repairExecution: REPAIR_EXECUTION,
      repairAnalysis: REPAIR_ANALYSIS,
      repairValidation: REPAIR_VALIDATION,
      repairMergeAudit: REPAIR_MERGE_AUDIT,
      repairedDebate64: REPAIRED_DEBATE_64,
      debate64Packet: DEBATE_64_PACKET,
      standingAuthorization: POST_CANARY_BATCH_05_STANDING_AUTHORIZATION
    },
    modelInputs: structuredClone(originalPreparation.modelInputs),
    sourceHashes,
    acceptedDebates,
    contexts,
    isolation: {
      oneDebatePerContext: true,
      separateFreshModelContextPerDebateRequired: true,
      onlyFrozenModelInputsAvailable: true,
      originalPacketsAndSchemasReusedByteForByte: true,
      participantJudgmentClosed: true,
      participantJudgmentWasScoreBlind: true,
      ownDebateScoresAvailableOnlyAsImmutablePacketFields: true,
      modelCannotAuthorIdentityStructureMoveSelectionOrScores: true,
      legacyAssessmentsUnavailable: true,
      otherDebateOutputsUnavailable: true,
      repairedDebate64OutputUnavailableToResumptionModels: true,
      failedOriginalDebate64OutputUnavailable: true,
      rankingsAndWinnerComparisonsUnavailable: true,
      aiExtensionPostScoringOnly: true
    },
    publicationContract: structuredClone(originalPreparation.publicationContract),
    transport: {
      maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)),
      provenCeilingBytes: originalPreparation.transport.provenCeilingBytes,
      critiqueMaximumCharacterConstraintAbsent: true,
      runtimeWordSentenceQuotationAndNoveltyValidationRequired: true
    },
    executionPolicy: {
      contexts: 7,
      attemptsPerContext: 1,
      retriesMaximum: 0,
      correctionContextsMaximum: 0,
      timeoutMsPerContext: 600000,
      timeoutExtensionsMaximum: 0,
      absoluteGateTimeoutMs: 7200000,
      copiedInputBytesMaximum: 400000,
      maximumParallelContexts: 2,
      schedulerRamp: [1, 2],
      rampPhases,
      firstResumptionContextOperationalCanary: true,
      stopBeforeExpansionOnRampFailure: true,
      continueIndependentContextsWithinStartedSteadyPhaseAfterFailure: true,
      deterministicInputOrder: true,
      authentication: "ChatGPT subscription",
      APIKeysRemoved: true,
      removedEnvironmentVariables: originalPreparation.executionPolicy.removedEnvironmentVariables,
      directIncrementalCostUsdMaximum: 0,
      meteredApiCostUsdMaximum: 0,
      transcriptionCostUsdMaximum: 0,
      separateActivationRequired: true
    },
    deterministicValidation: {
      originalFrozenSourceHashesReplayedAtFreeze: true,
      acceptedDebate64RepairReplayedAtFreeze: true,
      sevenOriginalPacketsAndSchemasReusedByteForByte: true,
      sevenLocalCanonicalSourceChainsReplayedAtFreeze: true,
      originalSevenOutputValidationAndProvenancePathsAbsentAtFreeze: true,
      completeTenDebateValidationRequiredAfterResumption: true,
      exactSourceAndScoreReplayRequired: true,
      critiqueWordCharacterSentenceAndLabelContractRequired: true,
      aiExtensionDisclosureAndNoveltyMapRequired: true,
      lockedScoresUnchanged: true,
      modelAuthoredScores: 0
    },
    acceptanceContract: {
      resumptionValidContextsRequired: 7,
      cohortValidDebatesRequired: 10,
      resumptionMovesRequired: 132,
      cohortMovesRequired: 187,
      resumptionCritiquesRequired: 132,
      cohortCritiquesRequired: 187,
      resumptionExactSourceQuotesRequired: 14,
      cohortExactSourceQuotesRequired: 20,
      resumptionOverallCommentarySidesRequired: 14,
      cohortOverallCommentarySidesRequired: 20,
      resumptionAIExtensionSidesRequired: 14,
      cohortAIExtensionSidesRequired: 20,
      minimumCritiqueCharacters: 880,
      retriesMaximum: 0,
      timeoutExtensionsMaximum: 0,
      correctionContextsMaximum: 0,
      modelAuthoredScoresMaximum: 0,
      scorePassesExecutedThisStage: 0
    },
    stopRules,
    authorization: {
      executionActivationPreparation: true,
      standingAuthorizationPermitsActivation: true,
      modelContexts: false,
      publicationModelExecution: false,
      deterministicOutputValidation: false,
      deterministicCohortAnalysis: false,
      retry: false,
      timeoutExtension: false,
      repairPacketPreparation: false,
      correctionModelExecution: false,
      publicationCompilation: false,
      publicationFinalization: false,
      renderingVerification: false,
      paidServices: false,
      productionMutation: false,
      nextBatchSelection: false
    },
    totals: {
      acceptedDebates: 3,
      acceptedMoves: 55,
      resumptionContexts: 7,
      resumptionMoves,
      resumptionSections,
      resumptionAudioVerifiedMoves,
      cohortDebates: 10,
      cohortMoves: 187,
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
      resumptionOutputs: contexts.map((context) => context.rawOutput),
      resumptionValidations: contexts.map((context) => context.validation),
      resumptionProvenance: contexts.map((context) => context.provenance)
    },
    futureOutputPathsExcludedFromSourceHashes: futureOutputs,
    nextAuthorizedAction:
      "activate-and-execute-exactly-seven-frozen-batch-05-publication-resumption-contexts-under-standing-authorization"
  };
  if (write) {
    await mkdir(path.resolve(RESUMPTION_ROOT), { recursive: true });
    await writeFile(path.resolve(MANIFEST), pretty(manifest));
  }
  return manifest;
}

export async function activateBatch05PublicationResumption({ activatedAt, write }) {
  assertV4(activatedAt && !Number.isNaN(Date.parse(activatedAt)), "activatedAt must be ISO");
  const standing = await loadAndValidatePostCanaryBatch05StandingAuthorization();
  assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
  const preparationBytes = await readFile(path.resolve(MANIFEST));
  const preparation = JSON.parse(preparationBytes);
  assertV4(
    preparation.protocolId === POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_PROTOCOL_ID &&
      preparation.status ===
        "frozen-seven-untouched-post-canary-batch-05-publication-resumption-contexts-prepared-under-standing-authorization" &&
      preparation.batchNumber === 5 && preparation.contexts?.length === 7 &&
      preparation.totals?.resumptionMoves === 132 && preparation.totals?.cohortMoves === 187 &&
      preparation.model?.slug === "gpt-5.6-sol" &&
      preparation.model?.reasoningEffort === "low" &&
      preparation.executionPolicy?.attemptsPerContext === 1 &&
      preparation.executionPolicy?.retriesMaximum === 0 &&
      preparation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
      preparation.executionPolicy?.maximumParallelContexts === 2 &&
      canonicalJson(preparation.executionPolicy?.schedulerRamp) === canonicalJson([1, 2]) &&
      preparation.authorization?.standingAuthorizationPermitsActivation === true &&
      preparation.authorization?.publicationModelExecution === false &&
      preparation.userAuthorization?.standingAuthorizationSha256 === standing.sha256 &&
      Object.values(preparation.stopRules).every(Boolean),
    "the Batch 5 publication resumption is not prepared"
  );
  assertV4(execFileSync(preparation.executionEnvironment.codexPath, ["--version"],
    { encoding: "utf8" }).trim() === preparation.executionEnvironment.codexCliVersion,
  "the frozen Codex command-line version changed");
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
    assertV4(sha256(await readFile(path.resolve(file))) === digest,
      `${file}: frozen resumption source drifted`);
  }
  for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
    if (future !== ACTIVATION) assertV4(!(await exists(future)), `future output exists: ${future}`);
  }
  const activation = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-resumption-execution-activation",
    protocolId: preparation.protocolId,
    status: "frozen-seven-untouched-post-canary-batch-05-publication-resumption-contexts-authorized-under-standing-authorization",
    activatedAt,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    productionCanary: false,
    batchNumber: 5,
    stagingOnly: true,
    AIOnly: true,
    userAuthorization: {
      instruction: standing.record.userAuthorization.instruction,
      standingAuthorization: POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
      standingAuthorizationSha256: standing.sha256,
      directIncrementalCostUsdMaximum: 0,
      publicationModelContexts: 7,
      attemptsPerContext: 1,
      retriesMaximum: 0,
      repairPacketPreparation: false,
      correctionModelExecution: false,
      paidServices: false,
      publicationCompilation: false,
      publicationFinalization: false,
      productionMutation: false,
      nextBatchSelection: false
    },
    preparationManifest: MANIFEST,
    preparationManifestSha256: sha256(preparationBytes),
    model: structuredClone(preparation.model),
    costBoundary: structuredClone(preparation.costEstimate),
    executionEnvironment: structuredClone(preparation.executionEnvironment),
    modelInputs: structuredClone(preparation.modelInputs),
    inputs: structuredClone(preparation.inputs),
    acceptedDebates: structuredClone(preparation.acceptedDebates),
    contexts: structuredClone(preparation.contexts),
    isolation: structuredClone(preparation.isolation),
    publicationContract: structuredClone(preparation.publicationContract),
    executionPolicy: structuredClone(preparation.executionPolicy),
    deterministicValidation: structuredClone(preparation.deterministicValidation),
    acceptanceContract: structuredClone(preparation.acceptanceContract),
    stopRules: structuredClone(preparation.stopRules),
    authorization: {
      modelContexts: true,
      publicationModelExecution: true,
      deterministicOutputValidation: true,
      deterministicCohortAnalysis: true,
      retry: false,
      timeoutExtension: false,
      repairPacketPreparation: false,
      correctionModelExecution: false,
      publicationCompilation: false,
      publicationFinalization: false,
      renderingVerification: false,
      paidServices: false,
      productionMutation: false,
      nextBatchSelection: false
    },
    artifacts: structuredClone(preparation.artifacts),
    futureOutputPathsExcludedFromSourceHashes:
      preparation.futureOutputPathsExcludedFromSourceHashes.filter((file) => file !== ACTIVATION),
    sourceHashes: structuredClone(preparation.sourceHashes),
    nextRequiredAction: "execute-the-seven-frozen-batch-05-publication-resumption-contexts-once"
  };
  if (write) await writeFile(path.resolve(ACTIVATION), pretty(activation));
  return activation;
}

function invokeCodex(codex, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(codex, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let forceTimer;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer);
      resolve({ code: null, signal: null, stdout, stderr, timedOut, error });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer);
      resolve({ code, signal, stdout, stderr, timedOut, error: null });
    });
  });
}

export async function runBatch05PublicationResumption() {
  const activation = JSON.parse(await readFile(path.resolve(ACTIVATION), "utf8"));
  const standing = await loadAndValidatePostCanaryBatch05StandingAuthorization();
  assertV4(
    activation.status ===
      "frozen-seven-untouched-post-canary-batch-05-publication-resumption-contexts-authorized-under-standing-authorization" &&
      activation.batchNumber === 5 && activation.contexts?.length === 7 &&
      activation.authorization?.publicationModelExecution === true &&
      activation.authorization?.deterministicCohortAnalysis === true &&
      activation.authorization?.retry === false &&
      activation.authorization?.repairPacketPreparation === false &&
      activation.authorization?.paidServices === false &&
      activation.userAuthorization?.standingAuthorizationSha256 === standing.sha256 &&
      activation.executionPolicy?.attemptsPerContext === 1 &&
      activation.executionPolicy?.retriesMaximum === 0 &&
      activation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
      activation.executionPolicy?.maximumParallelContexts === 2 &&
      canonicalJson(activation.executionPolicy?.schedulerRamp) === canonicalJson([1, 2]),
    "the Batch 5 publication resumption is not authorized"
  );
  for (const [file, digest] of Object.entries(activation.sourceHashes)) {
    assertV4(sha256(await readFile(path.resolve(file))) === digest,
      `resumption source hash mismatch: ${file}`);
  }
  for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
    assertV4(!(await exists(future)), `future resumption output exists: ${future}`);
  }
  const codex = activation.executionEnvironment.codexPath;
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  await access(codex); await access(authSource);
  let activeContexts = 0;
  let maximumObservedConcurrency = 0;
  async function runContext(context) {
    const temporary = await mkdtemp(path.join(os.tmpdir(), `batch-05-publication-resumption-${context.debateNumber}-`));
    const codexHome = await mkdtemp(path.join(os.tmpdir(), `batch-05-publication-resumption-home-${context.debateNumber}-`));
    const startedAt = new Date().toISOString();
    const started = Date.now();
    let record;
    activeContexts += 1;
    maximumObservedConcurrency = Math.max(maximumObservedConcurrency, activeContexts);
    try {
      const copies = [
        [activation.modelInputs.productionWorkflow, "production-workflow.md"],
        [activation.modelInputs.readinessWorkflow, "readiness-workflow.md"],
        [activation.modelInputs.outputContract, "output-contract.md"],
        [activation.modelInputs.manual, "manual.md"],
        [activation.modelInputs.referenceCatalog, "reference-catalog.json"],
        [context.packet, "packet.json"], [context.schema, "schema.json"]
      ];
      for (const [source, target] of copies) await copyFile(path.resolve(source), path.join(temporary, target));
      await copyFile(authSource, path.join(codexHome, "auth.json"));
      const env = { ...process.env, CODEX_HOME: codexHome };
      for (const key of activation.executionPolicy.removedEnvironmentVariables) delete env[key];
      const prompt = [
        "Read production-workflow.md, readiness-workflow.md, output-contract.md, manual.md, reference-catalog.json, packet.json, and schema.json completely and no other files.",
        `Act only as the isolated publication editor for Debate ${context.debateNumber}.`,
        "Participant judgment, adjudication, move selection, and every score are closed and repository-owned; participant judgment was score-blind.",
        "Author exactly the schema fields: an 18–28 word summary; source-exact representative quotes targeting 6–14 words; prose for every locked move; Overall Commentary; optional material-only local reference tags; and a balanced, separately disclosed AI Extension with globally unique item IDs and complete novelty mappings.",
        "Before returning, count every critique and revise it until it is 112–118 words; do not aim at the 130-word ceiling. Each critique must remain within 105–130 words, contain at least 880 characters, use exactly four ordered labeled sentences, and end every sentence with terminal punctuation.",
        "Never infer, emit, recalculate, or suggest changing a score; never change identity, structure, move selection, or source evidence; never consult legacy assessment material or other debates; never attribute AI material to a participant.",
        "Use no CJK, Hangul, Kana, replacement characters, or prohibited rational-invulnerability language. Return exactly one schema-conforming JSON object and nothing else."
      ].join(" ");
      process.stdout.write(`[batch-05-publication-resumption] starting index ${context.contextIndex} ${activation.model.label}/${activation.model.reasoningEffort} Debate ${context.debateNumber}\n`);
      const invocation = await invokeCodex(codex, [
        "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules",
        "--model", activation.model.slug, "-c", `model_reasoning_effort=\"${activation.model.reasoningEffort}\"`,
        "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search",
        "--disable", "apps", "--disable", "memories", "--disable", "multi_agent",
        "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies",
        "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt
      ], { cwd: temporary, env }, activation.executionPolicy.timeoutMsPerContext);
      const resultPath = path.join(temporary, "result.json");
      const resultExists = await exists(resultPath);
      const base = {
        contextIndex: context.contextIndex, originalContextIndex: context.originalContextIndex,
        debateNumber: context.debateNumber, debateId: context.debateId,
        model: activation.model.label, reasoningEffort: activation.model.reasoningEffort,
        attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, correctionContextCount: 0,
        startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started,
        timedOut: invocation.timedOut, commandExitCode: invocation.code,
        terminationSignal: invocation.signal, authentication: "ChatGPT subscription",
        apiKeysRemoved: true, isolatedTemporaryCodexHome: true,
        isolatedTemporaryWorkingDirectory: true, participantJudgmentWasScoreBlind: true,
        ownDebateScoresImmutable: true, copiedInputBytes: context.copiedInputBytes,
        meteredApiCostUsd: 0, paidServiceCallsThisStage: 0,
        modelAuthoredScores: 0, scorePassesExecutedThisStage: 0,
        stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr)
      };
      if (invocation.error || invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
        record = { ...base,
          status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed",
          gateAcceptancePassed: false, outputWritten: false,
          validationWritten: false, provenanceWritten: false,
          failureMessage: `${invocation.error?.stack ?? ""}\n${invocation.stdout}\n${invocation.stderr}`.trim().slice(-10000)
        };
      } else {
        const outputBytes = await readFile(resultPath);
        await mkdir(path.dirname(path.resolve(context.rawOutput)), { recursive: true });
        await writeFile(path.resolve(context.rawOutput), outputBytes);
        let validationSummary = null;
        let validationMessage = null;
        try {
          validationSummary = validatePostCanaryBatch05PublicationOutput(
            JSON.parse(outputBytes), JSON.parse(await readFile(path.resolve(context.packet), "utf8"))
          );
        } catch (error) { validationMessage = (error.stack ?? error.message).slice(-10000); }
        const accepted = validationSummary?.status === "passed";
        const validationRecord = {
          schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-resumption-validation",
          protocolId: activation.protocolId, status: accepted ? "passed" : "failed",
          contextIndex: context.contextIndex, originalContextIndex: context.originalContextIndex,
          debateNumber: context.debateNumber, debateId: context.debateId,
          outputSha256: sha256(outputBytes), validationSummary, validationMessage,
          modelAuthoredScores: 0, lockedScoresUnchanged: accepted ? true : null
        };
        const provenanceRecord = {
          schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-resumption-provenance",
          protocolId: activation.protocolId, contextIndex: context.contextIndex,
          originalContextIndex: context.originalContextIndex, debateNumber: context.debateNumber,
          debateId: context.debateId, model: activation.model,
          authentication: "ChatGPT subscription", reasoningEffort: "low",
          attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, correctionContextCount: 0,
          apiKeysRemoved: true, isolatedTemporaryCodexHome: true,
          isolatedTemporaryWorkingDirectory: true, participantJudgmentWasScoreBlind: true,
          ownDebateScoresImmutable: true,
          copiedInputs: Object.fromEntries(copies.map(([source, target]) => [target, { source, sha256: activation.sourceHashes[source] }])),
          outputSha256: sha256(outputBytes), modelAuthoredScores: 0,
          scorePassesExecutedThisStage: 0, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0
        };
        const validationBytes = Buffer.from(pretty(validationRecord));
        const provenanceBytes = Buffer.from(pretty(provenanceRecord));
        await mkdir(path.dirname(path.resolve(context.validation)), { recursive: true });
        await mkdir(path.dirname(path.resolve(context.provenance)), { recursive: true });
        await writeFile(path.resolve(context.validation), validationBytes);
        await writeFile(path.resolve(context.provenance), provenanceBytes);
        record = { ...base, status: accepted ? "completed-valid" : "output-validation-failed",
          gateAcceptancePassed: accepted, outputWritten: true, outputSha256: sha256(outputBytes),
          validationWritten: true, validationSha256: sha256(validationBytes),
          provenanceWritten: true, provenanceSha256: sha256(provenanceBytes),
          validationSummary, validationMessage };
      }
    } catch (error) {
      record = {
        contextIndex: context.contextIndex, originalContextIndex: context.originalContextIndex,
        debateNumber: context.debateNumber, debateId: context.debateId,
        model: "5.6 Sol", reasoningEffort: "low", attemptCount: 1, retryCount: 0,
        timeoutExtensionCount: 0, correctionContextCount: 0, startedAt,
        completedAt: new Date().toISOString(), elapsedMs: Date.now() - started,
        authentication: "ChatGPT subscription", apiKeysRemoved: true,
        participantJudgmentWasScoreBlind: true, ownDebateScoresImmutable: true,
        copiedInputBytes: context.copiedInputBytes, meteredApiCostUsd: 0,
        paidServiceCallsThisStage: 0, modelAuthoredScores: 0,
        status: "runner-error", gateAcceptancePassed: false,
        outputWritten: await exists(context.rawOutput), validationWritten: await exists(context.validation),
        provenanceWritten: await exists(context.provenance),
        failureMessage: (error.stack ?? String(error)).slice(-10000)
      };
    } finally {
      activeContexts -= 1;
      await rm(temporary, { recursive: true, force: true });
      await rm(codexHome, { recursive: true, force: true });
    }
    process.stdout.write(`[batch-05-publication-resumption] Debate ${context.debateNumber} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
    return record;
  }
  async function runPool(indexes, maximumConcurrency) {
    const queue = [...indexes]; const completed = [];
    async function worker() { while (queue.length) completed.push(await runContext(activation.contexts[queue.shift()])); }
    await Promise.all(Array.from({ length: Math.min(maximumConcurrency, indexes.length) }, () => worker()));
    return completed.sort((a, b) => a.contextIndex - b.contextIndex);
  }
  const gateStartedAt = new Date().toISOString();
  const gateStarted = Date.now();
  const results = [];
  const rampPhases = [];
  let expansionAuthorized = true;
  for (const phase of activation.executionPolicy.rampPhases) {
    if (!expansionAuthorized) {
      rampPhases.push({ ...phase, attemptedContextIndexes: [], validContextIndexes: [], passed: false, skippedBecausePriorRampFailed: true });
      continue;
    }
    const phaseResults = await runPool(phase.contextIndexes, phase.maximumParallelContexts);
    results.push(...phaseResults);
    const validContextIndexes = phaseResults.filter((result) => result.gateAcceptancePassed).map((result) => result.contextIndex);
    const passed = validContextIndexes.length === phase.contextIndexes.length;
    rampPhases.push({ ...phase, attemptedContextIndexes: phaseResults.map((r) => r.contextIndex), validContextIndexes, passed, skippedBecausePriorRampFailed: false });
    if (phase.expansionRequiresAllValid && !passed) expansionAuthorized = false;
  }
  results.sort((a, b) => a.contextIndex - b.contextIndex);
  const validContexts = results.filter((result) => result.gateAcceptancePassed).length;
  const unattemptedContextIndexes = activation.contexts.map((c) => c.contextIndex)
    .filter((index) => !results.some((result) => result.contextIndex === index));
  const passed = results.length === 7 && validContexts === 7;
  const wallElapsedMs = Date.now() - gateStarted;
  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-resumption-model-execution",
    protocolId: activation.protocolId,
    status: passed ? "seven-post-canary-batch-05-publication-resumption-contexts-passed" :
      "post-canary-batch-05-publication-resumption-complete-with-failure",
    gateStartedAt, gateCompletedAt: new Date().toISOString(), contextsPlanned: 7,
    contextsAttempted: results.length, contextsUnattempted: unattemptedContextIndexes.length,
    unattemptedContextIndexes, validContexts, invalidContexts: results.length - validContexts,
    attempts: results.length, retries: 0, timeoutExtensions: 0, correctionContexts: 0,
    maximumObservedConcurrency, schedulerRamp: [1, 2], wallElapsedMs,
    aggregateModelElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0),
    meanElapsedMs: results.length ? results.reduce((sum, result) => sum + result.elapsedMs, 0) / results.length : null,
    rampPhases, results, participantJudgmentWasScoreBlind: true,
    ownDebateScoresImmutable: true, acceptedDebate64RepairContexts: 1,
    acceptedDebate64RepairedFields: 2, meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0, modelAuthoredScores: 0, scorePassesExecutedThisStage: 0,
    authorization: { deterministicCohortAnalysis: true, retry: false,
      timeoutExtension: false, repairPacketPreparation: false,
      correctionModelExecution: false, publicationCompilation: false,
      publicationFinalization: false, productionMutation: false, nextBatchSelection: false }
  };
  await writeFile(path.resolve(activation.artifacts.execution), pretty(execution));
  return execution;
}

export async function analyzeBatch05PublicationResumption({ write }) {
  if (write) assertV4(!(await exists(ANALYSIS)), `${ANALYSIS} already exists`);
  const standing = await loadAndValidatePostCanaryBatch05StandingAuthorization();
  const [preparationBytes, activationBytes, executionBytes] = await Promise.all([
    readFile(path.resolve(MANIFEST)), readFile(path.resolve(ACTIVATION)), readFile(path.resolve(EXECUTION))
  ]);
  const activation = JSON.parse(activationBytes);
  const execution = JSON.parse(executionBytes);
  assertV4(
    activation.status ===
      "frozen-seven-untouched-post-canary-batch-05-publication-resumption-contexts-authorized-under-standing-authorization" &&
      activation.authorization?.deterministicCohortAnalysis === true &&
      activation.authorization?.repairPacketPreparation === false &&
      activation.authorization?.publicationCompilation === false &&
      activation.authorization?.paidServices === false &&
      execution.contextsPlanned === 7 && execution.contextsAttempted >= 1 &&
      execution.contextsAttempted <= 7 && execution.attempts === execution.contextsAttempted &&
      execution.retries === 0 && execution.timeoutExtensions === 0 &&
      execution.correctionContexts === 0 && execution.modelAuthoredScores === 0 &&
      execution.paidServiceCallsThisStage === 0 &&
      activation.userAuthorization?.standingAuthorizationSha256 === standing.sha256,
    "the Batch 5 publication resumption analysis boundary changed"
  );
  for (const [file, digest] of Object.entries(activation.sourceHashes)) {
    assertV4(sha256(await readFile(path.resolve(file))) === digest,
      `resumption analysis source hash mismatch: ${file}`);
  }
  const accepted = [];
  for (const acceptedDebate of activation.acceptedDebates) {
    const [outputBytes, packetBytes, validationRecord] = await Promise.all([
      readFile(path.resolve(acceptedDebate.output)),
      readFile(path.resolve(acceptedDebate.packet)),
      readFile(path.resolve(acceptedDebate.validation), "utf8").then(JSON.parse)
    ]);
    const validation = validatePostCanaryBatch05PublicationOutput(
      JSON.parse(outputBytes), JSON.parse(packetBytes)
    );
    assertV4(validation.status === "passed" && validation.lockedScoresUnchanged === true,
      `Debate ${acceptedDebate.debateNumber}: accepted output failed replay`);
    if (acceptedDebate.debateNumber === "64") {
      assertV4(
        sha256(outputBytes) === validationRecord.mergedOutputSha256 &&
          validationRecord.status === "passed" &&
          validationRecord.authorizedFieldsChanged === 2 &&
          validationRecord.immutableFieldsChanged === 0 &&
          validationRecord.lockedScoresUnchanged === true,
        "the accepted Debate 64 repair record changed"
      );
    } else {
      assertV4(validationRecord.status === "passed" &&
        validationRecord.outputSha256 === sha256(outputBytes),
      `Debate ${acceptedDebate.debateNumber}: accepted validation record changed`);
    }
    accepted.push({ debateNumber: acceptedDebate.debateNumber, validation });
  }
  const replayed = [];
  for (const result of execution.results) {
    const context = activation.contexts[result.contextIndex];
    assertV4(context?.debateNumber === result.debateNumber && context.debateId === result.debateId &&
      context.originalContextIndex === result.originalContextIndex,
    `context ${result.contextIndex}: resumption identity mismatch`);
    if (!result.gateAcceptancePassed) {
      replayed.push({ contextIndex: result.contextIndex, originalContextIndex: result.originalContextIndex,
        debateNumber: result.debateNumber, status: result.status,
        gateAcceptancePassed: false, validationReplayed: false });
      continue;
    }
    const [outputBytes, packetBytes, validationBytes, provenanceBytes] = await Promise.all([
      readFile(path.resolve(context.rawOutput)), readFile(path.resolve(context.packet)),
      readFile(path.resolve(context.validation)), readFile(path.resolve(context.provenance))
    ]);
    assertV4(sha256(outputBytes) === result.outputSha256 &&
      sha256(validationBytes) === result.validationSha256 &&
      sha256(provenanceBytes) === result.provenanceSha256,
    `Debate ${result.debateNumber}: accepted artifact hash mismatch`);
    const validation = validatePostCanaryBatch05PublicationOutput(JSON.parse(outputBytes), JSON.parse(packetBytes));
    const validationRecord = JSON.parse(validationBytes);
    const provenance = JSON.parse(provenanceBytes);
    assertV4(validationRecord.status === "passed" &&
      validationRecord.outputSha256 === result.outputSha256 &&
      provenance.outputSha256 === result.outputSha256 && provenance.attemptCount === 1 &&
      provenance.retryCount === 0 && provenance.timeoutExtensionCount === 0 &&
      provenance.correctionContextCount === 0 && provenance.modelAuthoredScores === 0,
    `Debate ${result.debateNumber}: accepted audit mismatch`);
    replayed.push({ contextIndex: result.contextIndex, originalContextIndex: result.originalContextIndex,
      debateNumber: result.debateNumber, status: result.status, gateAcceptancePassed: true,
      validationReplayed: true, outputSha256: result.outputSha256, validation });
  }
  const valid = replayed.filter((item) => item.gateAcceptancePassed);
  const sum = (items, field) => items.reduce((total, item) => total + item.validation[field], 0);
  const resumptionSemanticPass =
    execution.status === "seven-post-canary-batch-05-publication-resumption-contexts-passed" &&
    execution.contextsAttempted === 7 && execution.contextsUnattempted === 0 &&
    execution.validContexts === 7 && execution.invalidContexts === 0 && valid.length === 7 &&
    sum(valid, "moves") === activation.acceptanceContract.resumptionMovesRequired &&
    sum(valid, "critiques") === activation.acceptanceContract.resumptionCritiquesRequired &&
    sum(valid, "quoteExactSourceMatches") === activation.acceptanceContract.resumptionExactSourceQuotesRequired &&
    sum(valid, "overallCommentarySides") === activation.acceptanceContract.resumptionOverallCommentarySidesRequired &&
    sum(valid, "aiExtensionSides") === activation.acceptanceContract.resumptionAIExtensionSidesRequired;
  const cohort = [...accepted, ...valid];
  const cohortSemanticPass = resumptionSemanticPass &&
    cohort.length === activation.acceptanceContract.cohortValidDebatesRequired &&
    sum(cohort, "moves") === activation.acceptanceContract.cohortMovesRequired &&
    sum(cohort, "critiques") === activation.acceptanceContract.cohortCritiquesRequired &&
    sum(cohort, "quoteExactSourceMatches") === activation.acceptanceContract.cohortExactSourceQuotesRequired &&
    sum(cohort, "overallCommentarySides") === activation.acceptanceContract.cohortOverallCommentarySidesRequired &&
    sum(cohort, "aiExtensionSides") === activation.acceptanceContract.cohortAIExtensionSidesRequired &&
    cohort.every((item) => item.validation.minimumCritiqueCharacters >=
      activation.acceptanceContract.minimumCritiqueCharacters &&
      item.validation.calculatedScoresAuthoredByModel === 0 && item.validation.lockedScoresUnchanged === true);
  const timingPass = execution.results.every((result) =>
    result.elapsedMs <= activation.executionPolicy.timeoutMsPerContext && result.timedOut === false) &&
    execution.wallElapsedMs <= activation.executionPolicy.absoluteGateTimeoutMs;
  const passed = cohortSemanticPass && timingPass;
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-resumption-analysis",
    protocolId: activation.protocolId,
    status: passed ? "post-canary-batch-05-publication-resumption-output-gate-passed" :
      cohortSemanticPass ? "post-canary-batch-05-publication-resumption-failed-timing" :
        "post-canary-batch-05-publication-resumption-failed-validation",
    productionCanary: false, batchNumber: 5, stagingOnly: true,
    developmentValidationOnly: false,
    sources: { preparation: MANIFEST, preparationSha256: sha256(preparationBytes),
      activation: ACTIVATION, activationSha256: sha256(activationBytes),
      execution: EXECUTION, executionSha256: sha256(executionBytes),
      acceptedDebates: activation.acceptedDebates.map(({ debateNumber, output }) =>
        ({ debateNumber, output })) },
    acceptedDebates: activation.acceptedDebates.map((entry, index) => ({
      debateNumber: entry.debateNumber,
      status: entry.debateNumber === "64"
        ? "passed-repaired-and-complete-publication-validation"
        : "passed-original-publication-validation",
      validation: accepted[index].validation,
      repairContexts: entry.repairContexts,
      repairedFields: entry.repairedFields,
      immutableFieldsChanged: 0,
      lockedScoresUnchanged: true
    })),
    execution: { contextsPlanned: execution.contextsPlanned,
      contextsAttempted: execution.contextsAttempted, contextsUnattempted: execution.contextsUnattempted,
      validContexts: execution.validContexts, invalidContexts: execution.invalidContexts,
      attempts: execution.attempts, retries: execution.retries,
      timeoutExtensions: execution.timeoutExtensions, correctionContexts: execution.correctionContexts,
      schedulerRamp: execution.schedulerRamp, maximumObservedConcurrency: execution.maximumObservedConcurrency,
      wallElapsedMs: execution.wallElapsedMs, aggregateModelElapsedMs: execution.aggregateModelElapsedMs },
    validationReplay: replayed,
    gate: { resumptionSemanticPass, cohortSemanticPass, timingPass,
      resumptionValidContexts: valid.length, cohortValidDebates: cohort.length,
      cohortMoves: sum(cohort, "moves"), cohortCritiques: sum(cohort, "critiques"),
      cohortExactSourceQuotes: sum(cohort, "quoteExactSourceMatches"),
      cohortOverallCommentarySides: sum(cohort, "overallCommentarySides"),
      cohortAIExtensionSides: sum(cohort, "aiExtensionSides"),
      minimumCritiqueCharacters: cohort.length ? Math.min(...cohort.map((item) => item.validation.minimumCritiqueCharacters)) : null,
      retries: 0, timeoutExtensions: 0, correctionContexts: 0,
      modelAuthoredScores: 0, scorePassesExecutedThisStage: 0 },
    totals: { acceptedDebates: 3, acceptedRepairedDebates: 1, acceptedRepairContexts: 1,
      repairedFields: 2, resumptionModelContexts: execution.contextsAttempted,
      cohortDebates: cohort.length, cohortMoves: sum(cohort, "moves"),
      modelAuthoredScores: 0, scorePassesExecutedThisStage: 0, paidServiceCalls: 0,
      publicationCompilationPasses: 0, publicationFinalizations: 0,
      productionMutations: 0, nextBatchSelections: 0, directIncrementalCostUsd: 0 },
    integrity: { participantJudgmentWasScoreBlind: true, scoresRemainedImmutable: true,
      acceptedDebate64RepairReplayed: true,
      everyAcceptedResumptionOutputReplayedDeterministically: valid.every((item) => item.validationReplayed),
      aiExtensionExcludedFromScores: true, retriesPerformed: false,
      timeoutExtensionsPerformed: false, correctionContextsPerformed: false,
      publicationCompiled: false, publicationFinalized: false, productionMutated: false },
    authorization: { failureDiagnosis: !passed, repairPacketPreparation: !passed,
      repairModelExecution: false, publicationCompilationPreparation: passed,
      deterministicCompilation: false, publicationFinalization: false,
      renderingVerification: false, paidServices: false,
      productionMutation: false, nextBatchSelection: false },
    nextAuthorizedAction: passed ?
      "prepare-batch-05-publication-compilation-under-standing-authorization" :
      "diagnose-batch-05-publication-resumption-failure-under-standing-authorization"
  };
  if (write) await writeFile(path.resolve(ANALYSIS), pretty(analysis));
  return analysis;
}

export async function testBatch05PublicationResumptionPreparation() {
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  assert.equal(manifest.status,
    "frozen-seven-untouched-post-canary-batch-05-publication-resumption-contexts-prepared-under-standing-authorization");
  assert.equal(manifest.protocolId, POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_PROTOCOL_ID);
  assert.equal(manifest.batchNumber, 5);
  assert.deepEqual(manifest.model, { label: "5.6 Sol", slug: "gpt-5.6-sol",
    reasoningEffort: "low", authentication: "ChatGPT subscription" });
  assert.deepEqual(manifest.contexts.map((context) => context.debateNumber),
    POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_DEBATES);
  assert.deepEqual(manifest.contexts.map((context) => context.contextIndex), [0,1,2,3,4,5,6]);
  assert.deepEqual(manifest.contexts.map((context) => context.originalContextIndex), [3,4,5,6,7,8,9]);
  assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
  assert.equal(manifest.executionPolicy.retriesMaximum, 0);
  assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
  assert.equal(manifest.executionPolicy.maximumParallelContexts, 2);
  assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2]);
  assert.equal(Object.values(manifest.stopRules).every(Boolean), true);
  assert.equal(manifest.authorization.executionActivationPreparation, true);
  assert.equal(manifest.authorization.standingAuthorizationPermitsActivation, true);
  for (const [key, value] of Object.entries(manifest.authorization)) {
    if (!["executionActivationPreparation", "standingAuthorizationPermitsActivation"].includes(key)) {
      assert.equal(value, false, `${key}: must remain unauthorized`);
    }
  }
  assert.equal(manifest.totals.acceptedMoves, 55);
  assert.equal(manifest.totals.resumptionMoves, 132);
  assert.equal(manifest.totals.resumptionSections, 34);
  assert.equal(manifest.totals.resumptionAudioVerifiedMoves, 3);
  assert.equal(manifest.totals.cohortMoves, 187);
  for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
    assert.equal(sha256(await readFile(file)), digest, `${file}: source drift`);
  }
  for (const file of manifest.futureOutputPathsExcludedFromSourceHashes) {
    assert.equal(Object.hasOwn(manifest.sourceHashes, file), false);
    assert.equal(await exists(file), false, `${file}: future output exists`);
  }
  const original = JSON.parse(await readFile(manifest.inputs.originalPreparation, "utf8"));
  let moves = 0; let sections = 0; let audioVerifiedMoves = 0;
  for (const context of manifest.contexts) {
    const source = original.contexts[context.originalContextIndex];
    assert.equal(source.debateNumber, context.debateNumber);
    assert.equal(source.packet, context.packet);
    assert.equal(source.schema, context.schema);
    const [packetBytes, schemaBytes] = await Promise.all([
      readFile(context.packet), readFile(context.schema)
    ]);
    assert.equal(sha256(packetBytes), context.packetSha256);
    assert.equal(sha256(schemaBytes), context.schemaSha256);
    const packet = JSON.parse(packetBytes);
    assert.deepEqual(JSON.parse(schemaBytes), buildPostCanaryBatch05PublicationSchema(packet));
    assert(packet.moves.every((move) => Number.isInteger(move.finalScore)));
    assert(packet.moves.every((move) => move.sourceExcerptAudit.sourceExact));
    moves += context.moves; sections += context.sections;
    audioVerifiedMoves += context.audioVerifiedMoves;
  }
  assert.equal(moves, 132); assert.equal(sections, 34); assert.equal(audioVerifiedMoves, 3);
  const standing = await loadAndValidatePostCanaryBatch05StandingAuthorization();
  assert.equal(manifest.userAuthorization.standingAuthorizationSha256, standing.sha256);
  const acceptedDebate64 = manifest.acceptedDebates.find(({ debateNumber }) => debateNumber === "64");
  const [repairedBytes, packetBytes, record] = await Promise.all([
    readFile(acceptedDebate64.output), readFile(acceptedDebate64.packet),
    readFile(acceptedDebate64.validation, "utf8").then(JSON.parse)
  ]);
  const validation = validatePostCanaryBatch05PublicationOutput(JSON.parse(repairedBytes), JSON.parse(packetBytes));
  assert.equal(validation.status, "passed"); assert.equal(validation.moves, 17);
  assert.equal(validation.lockedScoresUnchanged, true);
  assert.equal(sha256(repairedBytes), record.mergedOutputSha256);
  return { status: "passed", acceptedDebates: 3, resumptionContexts: 7,
    resumptionMoves: 132, cohortDebates: 10, cohortMoves: 187,
    existingPacketsReused: 7, packetsGenerated: 0, modelContextsExecuted: 0,
    paidServiceCalls: 0, directIncrementalCostUsd: 0 };
}
