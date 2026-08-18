#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_02_PUBLICATION_MODEL,
  POST_CANARY_BATCH_02_PUBLICATION_ROOT
} from "./lib/assessment-production-post-canary-batch-02-publication.mjs";
import {
  validatePostCanaryBatch02PublicationOutput
} from "./lib/assessment-production-post-canary-batch-02-publication-validation.mjs";
import {
  POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_DEBATES,
  POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_PROTOCOL_ID,
  POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_ROOT
} from "./lib/assessment-production-post-canary-batch-02-publication-resumption.mjs";
import {
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION_INSTRUCTION,
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

const ROOT = POST_CANARY_BATCH_02_PUBLICATION_ROOT;
const RESUMPTION_ROOT = POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_ROOT;
const MANIFEST = `${RESUMPTION_ROOT}/execution-preparation-manifest.json`;
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
const REPAIRED_DEBATE_103 = `${ROOT}/repair-1/merged/debate-103.json`;
const DEBATE_103_PACKET = `${ROOT}/packets/debate-103.json`;
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";

const standingAuthorization =
  await loadAndValidatePostCanaryBatch02StandingAuthorization();

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(() => true, () => false);
const prettyJsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const readJsonBytes = async (file) => {
  const bytes = await readFile(path.resolve(file));
  return { bytes, value: JSON.parse(bytes) };
};

const loaded = Object.fromEntries(
  await Promise.all(
    [
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
      REPAIRED_DEBATE_103,
      DEBATE_103_PACKET
    ].map(async (file) => [file, await readJsonBytes(file)])
  )
);
const value = (file) => loaded[file].value;
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
const repairedDebate103 = value(REPAIRED_DEBATE_103);
const debate103Packet = value(DEBATE_103_PACKET);

assertV4(
    originalPreparation.status ===
      "frozen-ten-post-canary-batch-02-score-locked-publication-contexts-prepared-not-authorized" &&
    originalPreparation.contexts?.length === 10 &&
    originalPreparation.totals?.moves === 190 &&
    originalPreparation.model?.label === "5.6 Sol" &&
    originalPreparation.model?.slug === "gpt-5.6-sol" &&
    originalPreparation.model?.reasoningEffort === "low" &&
    originalPreparation.model?.authentication === "ChatGPT subscription" &&
    originalActivation.status ===
      "frozen-ten-post-canary-batch-02-publication-contexts-authorized" &&
    originalActivation.contexts?.length === 10,
  "the original Batch 2 publication preparation changed"
);
assertV4(
  originalExecution.status ===
      "post-canary-batch-02-publication-gate-complete-with-failure" &&
    originalExecution.contextsPlanned === 10 &&
    originalExecution.contextsAttempted === 1 &&
    originalExecution.contextsUnattempted === 9 &&
    originalExecution.validContexts === 0 &&
    originalExecution.invalidContexts === 1 &&
    originalExecution.attempts === 1 &&
    originalExecution.retries === 0 &&
    originalExecution.timeoutExtensions === 0 &&
    originalExecution.correctionContexts === 0 &&
    originalAnalysis.status ===
      "post-canary-batch-02-publication-output-gate-failed" &&
    diagnosis.status ===
      "diagnosed-batch-02-operational-canary-seventeen-critique-word-overruns" &&
    diagnosis.rampDisposition?.contextsUnattempted === 9 &&
    canonicalJson(diagnosis.rampDisposition.unattemptedDebates) ===
      canonicalJson(POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_DEBATES),
  "the preserved nine-context publication failure boundary changed"
);
assertV4(
  repairPreparation.status ===
      "frozen-nine-isolated-seventeen-field-batch-02-debate-103-publication-repair-contexts-prepared-under-standing-authorization" &&
    repairActivation.status ===
      "frozen-nine-isolated-seventeen-field-batch-02-debate-103-publication-repair-contexts-authorized-under-standing-authorization" &&
    repairExecution.status ===
      "batch-02-debate-103-nine-context-publication-repair-gate-passed" &&
    repairExecution.contextsAttempted === 9 &&
    repairExecution.validContexts === 9 &&
    repairExecution.attempts === 9 &&
    repairExecution.retries === 0 &&
    repairAnalysis.status ===
      "batch-02-debate-103-bounded-repair-and-complete-publication-validation-passed" &&
    repairAnalysis.authorization?.nineContextResumptionManifestPreparation === true &&
    repairAnalysis.authorization?.nineContextModelExecution === false &&
    repairValidation.status === "passed" &&
    repairValidation.validationSummary?.moves === 17 &&
    repairValidation.authorizedFieldsChanged === 17 &&
    repairValidation.immutableFieldsChanged === 0 &&
    repairValidation.lockedScoresUnchanged === true &&
    repairMergeAudit.status === "passed" &&
    repairMergeAudit.authorizedFieldsChanged === 17 &&
    repairMergeAudit.immutableFieldsChanged === 0,
  "the accepted Debate 103 repair boundary changed"
);
assertV4(
  sha256(loaded[REPAIRED_DEBATE_103].bytes) ===
      repairValidation.mergedOutputSha256 &&
    validatePostCanaryBatch02PublicationOutput(
      repairedDebate103,
      debate103Packet
    ).status === "passed",
  "the repaired Debate 103 staging output failed replay"
);
for (const [file, digest] of Object.entries(originalPreparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `${file}: original frozen publication source drifted`
  );
}

const contexts = [];
for (
  let resumptionIndex = 0;
  resumptionIndex < POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_DEBATES.length;
  resumptionIndex += 1
) {
  const debateNumber =
    POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_DEBATES[resumptionIndex];
  const source = originalPreparation.contexts.find(
    (context) => context.debateNumber === debateNumber
  );
  assertV4(
    source && source.contextIndex === resumptionIndex + 1,
    `Debate ${debateNumber}: original frozen context order changed`
  );
  for (const file of [source.rawOutput, source.validation, source.provenance]) {
    assertV4(
      !(await exists(file)),
      `Debate ${debateNumber}: original unattempted artifact exists: ${file}`
    );
  }
  for (const [file, digest] of [
    [source.packet, source.packetSha256],
    [source.schema, source.schemaSha256],
    [source.sourcePacket, source.sourcePacketSha256],
    [source.transcript, source.transcriptSha256],
    [source.events, source.eventsSha256],
    [source.localManifest, source.localManifestSha256]
  ]) {
    assertV4(
      sha256(await readFile(path.resolve(file))) === digest,
      `Debate ${debateNumber}: frozen context source drifted: ${file}`
    );
  }
  const output = `${RESUMPTION_ROOT}/outputs/debate-${debateNumber}.json`;
  contexts.push({
    ...structuredClone(source),
    contextIndex: resumptionIndex,
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

const resumptionMoves = contexts.reduce((sum, context) => sum + context.moves, 0);
const resumptionSections = contexts.reduce(
  (sum, context) => sum + context.sections,
  0
);
const resumptionAudioVerifiedMoves = contexts.reduce(
  (sum, context) => sum + context.audioVerifiedMoves,
  0
);
assertV4(
  contexts.length === 9 &&
    resumptionMoves === 173 &&
    resumptionSections === 46 &&
    resumptionAudioVerifiedMoves === 10,
  "the nine-context resumption coverage changed"
);

const ACTIVATION = `${RESUMPTION_ROOT}/execution-activation.json`;
const EXECUTION = `${RESUMPTION_ROOT}/model-execution.json`;
const ANALYSIS = `${RESUMPTION_ROOT}/analysis.json`;
const futureOutputs = [
  ...contexts.flatMap((context) => [
    context.rawOutput,
    context.validation,
    context.provenance
  ]),
  ACTIVATION,
  EXECUTION,
  ANALYSIS
];
const newStaticSources = [
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
  REPAIRED_DEBATE_103,
  DEBATE_103_PACKET,
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
  "scripts/lib/assessment-production-post-canary-batch-02-standing-authorization.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-publication-resumption.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-02-publication-resumption.mjs",
  "scripts/test-assessment-production-post-canary-batch-02-publication-resumption-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-02-publication-resumption.mjs",
  "scripts/run-assessment-production-post-canary-batch-02-publication-resumption.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-02-publication-resumption.mjs"
];
const sourceHashes = structuredClone(originalPreparation.sourceHashes);
for (const file of newStaticSources) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
for (const context of contexts) {
  for (const [file, digest] of [
    [context.packet, context.packetSha256],
    [context.schema, context.schemaSha256],
    [context.sourcePacket, context.sourcePacketSha256],
    [context.transcript, context.transcriptSha256],
    [context.events, context.eventsSha256],
    [context.localManifest, context.localManifestSha256]
  ]) {
    sourceHashes[file] = digest;
  }
}
for (const file of [MANIFEST, ...futureOutputs]) {
  assertV4(!(await exists(file)), `${file} already exists`);
}
for (const file of futureOutputs) {
  assertV4(!Object.hasOwn(sourceHashes, file), `future output hash included: ${file}`);
}

const rampPhases = [
  {
    phase: "resumption-operational-one",
    maximumParallelContexts: 1,
    contextIndexes: [0],
    expansionRequiresAllValid: true
  },
  {
    phase: "resumption-ramp-two",
    maximumParallelContexts: 2,
    contextIndexes: [1, 2],
    expansionRequiresAllValid: true
  },
  {
    phase: "resumption-steady-two",
    maximumParallelContexts: 2,
    contextIndexes: [3, 4, 5, 6, 7, 8],
    expansionRequiresAllValid: false
  }
];
const stopRules = {
  acceptedDebate103RepairFailureBlocks: true,
  sourceHashMismatchBlocks: true,
  packetOrSchemaHashMismatchBlocks: true,
  localCanonicalSourceHashMismatchBlocks: true,
  originalUnattemptedArtifactPresenceBlocks: true,
  preexistingResumptionOutputBlocks: true,
  separateActivationRequired: true,
  nonSubscriptionAuthenticationBlocks: true,
  apiKeyVisibilityBlocks: true,
  nonIsolatedContextBlocks: true,
  legacyAssessmentVisibilityBlocks: true,
  otherDebateOrRankingVisibilityBlocks: true,
  mutableIdentityStructureMoveOrScoreFieldBlocks: true,
  modelAuthoredScoreBlocks: true,
  invalidOutputBlocksAtFrozenRampBoundary: true,
  timeoutBlocksAtFrozenRampBoundary: true,
  nonExactQuotationBlocks: true,
  critiqueIntegrityFailureBlocks: true,
  unexpectedCJKHangulOrReplacementCharacterBlocks: true,
  forcedOrUnknownReferenceTagBlocks: true,
  aiExtensionDisclosureOrNoveltyFailureBlocks: true,
  prohibitedLanguageBlocks: true,
  scoreMutationBlocks: true,
  automaticRetryBlocks: true,
  timeoutExtensionBlocks: true,
  repairPacketPreparationBlocks: true,
  correctionContextBlocks: true,
  publicationCompilationBlocks: true,
  publicationFinalizationBlocks: true,
  renderingVerificationBlocks: true,
  paidServiceBlocks: true,
  productionMutationBlocks: true,
  nextBatchSelectionBlocks: true
};

const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-02-publication-resumption-execution-preparation-manifest",
  protocolId: POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_PROTOCOL_ID,
  status:
    "frozen-nine-untouched-post-canary-batch-02-publication-resumption-contexts-prepared-under-standing-authorization",
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
    instruction: POST_CANARY_BATCH_02_STANDING_AUTHORIZATION_INSTRUCTION,
    standingAuthorization: POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
    directIncrementalCostUsdMaximum: 0,
    contextsPrepared: 9,
    existingPacketsReused: 9,
    packetsGenerated: 0,
    publicationModelExecution: false,
    paidServices: false,
    publicationCompilation: false,
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
    contexts: 9,
    expectedParallelWallMinutes: [22, 42],
    expectedAggregateModelMinutes: [38, 63],
    expectedAggregateComputeHours: [0.63, 1.05],
    absoluteGateTimeoutMinutes: 120,
    estimateBasis: {
      source: ORIGINAL_PREPARATION,
      originalTenContextExpectedParallelWallMinutes:
        originalPreparation.costEstimate.expectedParallelWallMinutes,
      originalTenContextExpectedAggregateModelMinutes:
        originalPreparation.costEstimate.expectedAggregateModelMinutes,
      scalingRule: "nine-tenths-of-frozen-ten-context-plan-rounded-outward"
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
    repairedDebate103: REPAIRED_DEBATE_103,
    debate103Packet: DEBATE_103_PACKET,
    standingAuthorization: POST_CANARY_BATCH_02_STANDING_AUTHORIZATION
  },
  modelInputs: structuredClone(originalPreparation.modelInputs),
  sourceHashes,
  acceptedDebate103: {
    debateNumber: "103",
    debateId: originalPreparation.contexts[0].debateId,
    originalContextIndex: 0,
    packet: DEBATE_103_PACKET,
    output: REPAIRED_DEBATE_103,
    validation: REPAIR_VALIDATION,
    mergeAudit: REPAIR_MERGE_AUDIT,
    moves: 17,
    critiques: 17,
    exactSourceQuotes: 2,
    overallCommentarySides: 2,
    aiExtensionSides: 2,
    repairContexts: 9,
    repairedFields: 17,
    immutableFieldsChanged: 0,
    lockedScoresUnchanged: true
  },
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
    repairedDebate103OutputUnavailableToResumptionModels: true,
    failedOriginalDebate103OutputUnavailable: true,
    rankingsAndWinnerComparisonsUnavailable: true,
    aiExtensionPostScoringOnly: true
  },
  publicationContract: structuredClone(originalPreparation.publicationContract),
  transport: {
    maximumCopiedInputBytes: Math.max(
      ...contexts.map((context) => context.copiedInputBytes)
    ),
    provenCeilingBytes: originalPreparation.transport.provenCeilingBytes,
    critiqueMaximumCharacterConstraintAbsent: true,
    runtimeWordSentenceQuotationAndNoveltyValidationRequired: true
  },
  executionPolicy: {
    contexts: 9,
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
    removedEnvironmentVariables:
      originalPreparation.executionPolicy.removedEnvironmentVariables,
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    separateActivationRequired: true
  },
  deterministicValidation: {
    originalFrozenSourceHashesReplayedAtFreeze: true,
    acceptedDebate103RepairReplayedAtFreeze: true,
    nineOriginalPacketsAndSchemasReusedByteForByte: true,
    nineLocalCanonicalSourceChainsReplayedAtFreeze: true,
    originalNineOutputValidationAndProvenancePathsAbsentAtFreeze: true,
    completeTenDebateValidationRequiredAfterResumption: true,
    exactSourceAndScoreReplayRequired: true,
    critiqueWordCharacterSentenceAndLabelContractRequired: true,
    aiExtensionDisclosureAndNoveltyMapRequired: true,
    lockedScoresUnchanged: true,
    modelAuthoredScores: 0
  },
  acceptanceContract: {
    resumptionValidContextsRequired: 9,
    cohortValidDebatesRequired: 10,
    resumptionMovesRequired: 173,
    cohortMovesRequired: 190,
    resumptionCritiquesRequired: 173,
    cohortCritiquesRequired: 190,
    resumptionExactSourceQuotesRequired: 18,
    cohortExactSourceQuotesRequired: 20,
    resumptionOverallCommentarySidesRequired: 18,
    cohortOverallCommentarySidesRequired: 20,
    resumptionAIExtensionSidesRequired: 18,
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
    acceptedDebates: 1,
    acceptedMoves: 17,
    resumptionContexts: 9,
    resumptionMoves,
    resumptionSections,
    resumptionAudioVerifiedMoves,
    cohortDebates: 10,
    cohortMoves: 190,
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
    "activate-and-execute-exactly-nine-frozen-batch-02-publication-resumption-contexts-under-standing-authorization"
};

if (shouldWrite) {
  await mkdir(path.resolve(RESUMPTION_ROOT), { recursive: true });
  await writeFile(path.resolve(MANIFEST), prettyJsonBytes(manifest));
}
console.log(JSON.stringify({
  status: shouldWrite ? manifest.status : "preview",
  debates: contexts.map((context) => context.debateNumber),
  contexts: 9,
  resumptionMoves,
  acceptedDebate103Moves: 17,
  cohortMoves: 190,
  existingPacketsReused: 9,
  packetsGenerated: 0,
  model: manifest.model,
  schedulerRamp: [1, 2],
  attemptsPerContext: 1,
  retriesMaximum: 0,
  publicationModelContextsAuthorizedByStandingRecord: true,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction
}, null, 2));
