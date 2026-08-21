#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_03_PUBLICATION_MODEL,
  POST_CANARY_BATCH_03_PUBLICATION_ROOT
} from "./lib/assessment-production-post-canary-batch-03-publication.mjs";
import { validatePostCanaryBatch03PublicationOutput } from "./lib/assessment-production-post-canary-batch-03-publication-validation.mjs";
import {
  POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_2_DEBATES,
  POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_2_PROTOCOL_ID,
  POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_2_ROOT
} from "./lib/assessment-production-post-canary-batch-03-publication-resumption-2.mjs";
import {
  POST_CANARY_BATCH_03_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch03StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-03-standing-authorization.mjs";
import {
  RECOVERY_AUTHORIZATION,
  loadAndValidateRecoveryAuthorization
} from "./lib/assessment-production-post-canary-batch-03-failure-recovery-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const ROOT = POST_CANARY_BATCH_03_PUBLICATION_ROOT;
const RESUMPTION_ROOT = POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_2_ROOT;
const MANIFEST = `${RESUMPTION_ROOT}/execution-preparation-manifest.json`;
const ORIGINAL_PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const RESUMPTION_1_ROOT = `${ROOT}/resumption-1`;
const RESUMPTION_1_PREPARATION = `${RESUMPTION_1_ROOT}/execution-preparation-manifest.json`;
const RESUMPTION_1_EXECUTION = `${RESUMPTION_1_ROOT}/model-execution.json`;
const RESUMPTION_1_ANALYSIS = `${RESUMPTION_1_ROOT}/analysis.json`;
const RESUMPTION_1_DIAGNOSIS = `${RESUMPTION_1_ROOT}/failure-diagnosis.json`;
const RESUMPTION_1_REPAIR_ROOT = `${RESUMPTION_1_ROOT}/repair-1`;
const RESUMPTION_1_REPAIR_PREPARATION = `${RESUMPTION_1_REPAIR_ROOT}/execution-preparation-manifest.json`;
const RESUMPTION_1_REPAIR_EXECUTION = `${RESUMPTION_1_REPAIR_ROOT}/model-execution.json`;
const RESUMPTION_1_REPAIR_ANALYSIS = `${RESUMPTION_1_REPAIR_ROOT}/analysis.json`;
const RESUMPTION_1_REPAIR_MERGE_AUDIT = `${RESUMPTION_1_REPAIR_ROOT}/merge-audit.json`;
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const ACCEPTED_OUTPUTS = Object.freeze({
  "124": `${ROOT}/repair-1/merged/debate-124.json`,
  "14": `${RESUMPTION_1_ROOT}/outputs/debate-14.json`,
  "58": `${RESUMPTION_1_REPAIR_ROOT}/merged/debate-58.json`,
  "150": `${RESUMPTION_1_REPAIR_ROOT}/merged/debate-150.json`
});
const ACCEPTED_VALIDATIONS = Object.freeze({
  "124": `${ROOT}/repair-1/complete-debate-validation.json`,
  "14": `${RESUMPTION_1_ROOT}/validations/debate-14.json`,
  "58": `${RESUMPTION_1_REPAIR_ROOT}/complete-validations/debate-58.json`,
  "150": `${RESUMPTION_1_REPAIR_ROOT}/complete-validations/debate-150.json`
});
const PACKETS = Object.freeze(
  Object.fromEntries(
    ["124", "14", "58", "150", ...POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_2_DEBATES].map(
      (debateNumber) => [debateNumber, `${ROOT}/packets/debate-${debateNumber}.json`]
    )
  )
);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const prettyJsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const readJson = async (file) => JSON.parse(await readFile(path.resolve(file)));
const standingAuthorization = await loadAndValidatePostCanaryBatch03StandingAuthorization();
const recoveryAuthorization = await loadAndValidateRecoveryAuthorization();
const originalPreparation = await readJson(ORIGINAL_PREPARATION);
const resumption1Preparation = await readJson(RESUMPTION_1_PREPARATION);
const resumption1Execution = await readJson(RESUMPTION_1_EXECUTION);
const resumption1Analysis = await readJson(RESUMPTION_1_ANALYSIS);
const resumption1Diagnosis = await readJson(RESUMPTION_1_DIAGNOSIS);
const repairPreparation = await readJson(RESUMPTION_1_REPAIR_PREPARATION);
const repairExecution = await readJson(RESUMPTION_1_REPAIR_EXECUTION);
const repairAnalysis = await readJson(RESUMPTION_1_REPAIR_ANALYSIS);
const repairMergeAudit = await readJson(RESUMPTION_1_REPAIR_MERGE_AUDIT);

assertV4(
  originalPreparation.status ===
      "frozen-ten-post-canary-batch-03-score-locked-publication-contexts-prepared-not-activated" &&
    originalPreparation.contexts?.length === 10 &&
    originalPreparation.totals?.moves === 200 &&
    originalPreparation.model?.label === "5.6 Sol" &&
    originalPreparation.model?.reasoningEffort === "low" &&
    originalPreparation.model?.authentication === "ChatGPT subscription",
  "the original Batch 3 publication preparation changed"
);
assertV4(
  resumption1Preparation.status ===
      "frozen-nine-untouched-post-canary-batch-03-publication-resumption-contexts-prepared-under-failure-recovery-standing-authorization" &&
    resumption1Execution.status ===
      "post-canary-batch-03-publication-resumption-complete-with-failure" &&
    resumption1Execution.contextsPlanned === 9 &&
    resumption1Execution.contextsAttempted === 3 &&
    resumption1Execution.contextsUnattempted === 6 &&
    resumption1Execution.validContexts === 1 &&
    resumption1Execution.invalidContexts === 2 &&
    resumption1Execution.retries === 0 &&
    resumption1Execution.timeoutExtensions === 0 &&
    resumption1Analysis.status ===
      "post-canary-batch-03-publication-resumption-failed-validation" &&
    resumption1Diagnosis.status ===
      "diagnosed-batch-03-publication-resumption-five-field-validation-failures" &&
    canonicalJson(resumption1Diagnosis.preservedGate.unattemptedDebates) ===
      canonicalJson(POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_2_DEBATES),
  "the six-context resumption boundary changed"
);
assertV4(
  repairPreparation.status ===
      "frozen-three-isolated-five-field-batch-03-publication-resumption-repair-contexts-prepared-under-failure-recovery-standing-authorization" &&
    repairExecution.status ===
      "batch-03-publication-resumption-three-context-repair-gate-passed" &&
    repairExecution.contextsAttempted === 3 &&
    repairExecution.validContexts === 3 &&
    repairExecution.invalidContexts === 0 &&
    repairExecution.retries === 0 &&
    repairAnalysis.status ===
      "batch-03-publication-resumption-bounded-repair-and-complete-cohort-validation-passed" &&
    repairAnalysis.gate?.correctedFieldCount === 5 &&
    repairAnalysis.gate?.immutableFieldsChanged === 0 &&
    repairAnalysis.gate?.completeCohortValidationPassed === true &&
    repairMergeAudit.authorizedFieldsChanged === 5 &&
    repairMergeAudit.immutableFieldsChanged === 0,
  "the accepted publication-resumption repair boundary changed"
);

const accepted = {};
let acceptedMoves = 0;
for (const debateNumber of ["124", "14", "58", "150"]) {
  const [outputBytes, output, packet, validation] = await Promise.all([
    readFile(path.resolve(ACCEPTED_OUTPUTS[debateNumber])),
    readJson(ACCEPTED_OUTPUTS[debateNumber]),
    readJson(PACKETS[debateNumber]),
    readJson(ACCEPTED_VALIDATIONS[debateNumber])
  ]);
  const replay = validatePostCanaryBatch03PublicationOutput(output, packet);
  assertV4(
    replay.status === "passed" &&
      replay.lockedScoresUnchanged === true &&
      replay.calculatedScoresAuthoredByModel === 0,
    `Debate ${debateNumber}: accepted output failed replay`
  );
  const recordedDigest =
    validation.mergedOutputSha256 ?? validation.repairOutputSha256 ?? validation.outputSha256;
  assertV4(
    !recordedDigest || recordedDigest === sha256(outputBytes),
    `Debate ${debateNumber}: accepted output digest changed`
  );
  acceptedMoves += replay.moves;
  accepted[debateNumber] = {
    debateNumber,
    output: ACCEPTED_OUTPUTS[debateNumber],
    outputSha256: sha256(outputBytes),
    packet: PACKETS[debateNumber],
    validation: ACCEPTED_VALIDATIONS[debateNumber],
    replay
  };
}
assertV4(acceptedMoves === 80, "the accepted four-debate move total changed");

for (const [file, digest] of Object.entries(originalPreparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `${file}: original frozen publication source drifted`
  );
}

const contexts = [];
for (let index = 0; index < POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_2_DEBATES.length; index += 1) {
  const debateNumber = POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_2_DEBATES[index];
  const source = originalPreparation.contexts.find((context) => context.debateNumber === debateNumber);
  const first = resumption1Preparation.contexts.find((context) => context.debateNumber === debateNumber);
  assertV4(
    source && source.contextIndex === index + 4 &&
      first && first.contextIndex === index + 3 && first.originalContextIndex === source.contextIndex,
    `Debate ${debateNumber}: frozen context order changed`
  );
  for (const file of [
    source.rawOutput,
    source.validation,
    source.provenance,
    first.rawOutput,
    first.validation,
    first.provenance
  ]) {
    assertV4(!(await exists(file)), `Debate ${debateNumber}: unattempted artifact exists: ${file}`);
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
      `Debate ${debateNumber}: frozen source drifted: ${file}`
    );
  }
  contexts.push({
    ...structuredClone(source),
    contextIndex: index,
    originalContextIndex: source.contextIndex,
    firstResumptionContextIndex: first.contextIndex,
    originalUnattemptedOutput: source.rawOutput,
    firstResumptionUnattemptedOutput: first.rawOutput,
    rawOutput: `${RESUMPTION_ROOT}/outputs/debate-${debateNumber}.json`,
    output: `${RESUMPTION_ROOT}/outputs/debate-${debateNumber}.json`,
    validation: `${RESUMPTION_ROOT}/validations/debate-${debateNumber}.json`,
    provenance: `${RESUMPTION_ROOT}/provenance/debate-${debateNumber}.json`
  });
}
const resumptionMoves = contexts.reduce((sum, context) => sum + context.moves, 0);
const resumptionSections = contexts.reduce((sum, context) => sum + context.sections, 0);
const resumptionAudioVerifiedMoves = contexts.reduce(
  (sum, context) => sum + context.audioVerifiedMoves,
  0
);
assertV4(
  contexts.length === 6 &&
    resumptionMoves === 120 &&
    resumptionSections === 32 &&
    resumptionAudioVerifiedMoves === 3,
  "the six-context resumption coverage changed"
);

const ACTIVATION = `${RESUMPTION_ROOT}/execution-activation.json`;
const EXECUTION = `${RESUMPTION_ROOT}/model-execution.json`;
const ANALYSIS = `${RESUMPTION_ROOT}/analysis.json`;
const futureOutputs = [
  ...contexts.flatMap((context) => [context.rawOutput, context.validation, context.provenance]),
  ACTIVATION,
  EXECUTION,
  ANALYSIS
];
const staticSources = [
  ORIGINAL_PREPARATION,
  RESUMPTION_1_PREPARATION,
  RESUMPTION_1_EXECUTION,
  RESUMPTION_1_ANALYSIS,
  RESUMPTION_1_DIAGNOSIS,
  RESUMPTION_1_REPAIR_PREPARATION,
  RESUMPTION_1_REPAIR_EXECUTION,
  RESUMPTION_1_REPAIR_ANALYSIS,
  RESUMPTION_1_REPAIR_MERGE_AUDIT,
  ...Object.values(ACCEPTED_OUTPUTS),
  ...Object.values(ACCEPTED_VALIDATIONS),
  ...Object.values(PACKETS),
  POST_CANARY_BATCH_03_STANDING_AUTHORIZATION,
  RECOVERY_AUTHORIZATION,
  "scripts/lib/assessment-production-post-canary-batch-03-publication-resumption-2.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-standing-authorization.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-failure-recovery-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-03-publication-resumption-2.mjs",
  "scripts/test-assessment-production-post-canary-batch-03-publication-resumption-2-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-03-publication-resumption-2.mjs",
  "scripts/run-assessment-production-post-canary-batch-03-publication-resumption-2.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-03-publication-resumption-2.mjs"
];
const sourceHashes = structuredClone(originalPreparation.sourceHashes);
for (const file of [...new Set(staticSources)]) {
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
  ]) sourceHashes[file] = digest;
}
for (const file of [MANIFEST, ...futureOutputs]) {
  assertV4(!(await exists(file)), `${file} already exists`);
}
for (const file of futureOutputs) {
  assertV4(!Object.hasOwn(sourceHashes, file), `future output hash included: ${file}`);
}

const rampPhases = [
  { phase: "resumption-2-operational-one", maximumParallelContexts: 1, contextIndexes: [0], expansionRequiresAllValid: true },
  { phase: "resumption-2-ramp-two", maximumParallelContexts: 2, contextIndexes: [1, 2], expansionRequiresAllValid: true },
  { phase: "resumption-2-steady-two", maximumParallelContexts: 2, contextIndexes: [3, 4, 5], expansionRequiresAllValid: false }
];
const stopRules = {
  acceptedFourDebateCohortFailureBlocks: true,
  sourceHashMismatchBlocks: true,
  packetOrSchemaHashMismatchBlocks: true,
  localCanonicalSourceHashMismatchBlocks: true,
  attemptedContextReuseBlocks: true,
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
  automaticRetryBlocks: true,
  timeoutExtensionBlocks: true,
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
    "1.0-assessment-production-post-canary-batch-03-publication-resumption-2-execution-preparation-manifest",
  protocolId: POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_2_PROTOCOL_ID,
  status:
    "frozen-six-untouched-post-canary-batch-03-publication-resumption-2-contexts-prepared-under-standing-authorizations",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  AIOnly: true,
  userAuthorization: {
    instruction: recoveryAuthorization.record.userAuthorization.instruction,
    standingAuthorization: POST_CANARY_BATCH_03_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
    failureRecoveryStandingAuthorization: RECOVERY_AUTHORIZATION,
    failureRecoveryStandingAuthorizationSha256: recoveryAuthorization.sha256,
    directIncrementalCostUsdMaximum: 0,
    contextsPrepared: 6,
    existingPacketsReused: 6,
    packetsGenerated: 0,
    publicationModelExecution: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  model: structuredClone(POST_CANARY_BATCH_03_PUBLICATION_MODEL),
  costEstimate: {
    authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    contexts: 6,
    expectedParallelWallMinutes: [15, 30],
    expectedAggregateModelMinutes: [25, 45],
    absoluteGateTimeoutMinutes: 90,
    estimateBasis: "six-remaining-contexts-scaled-from-frozen-ten-context-plan"
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
    resumption1Preparation: RESUMPTION_1_PREPARATION,
    resumption1Execution: RESUMPTION_1_EXECUTION,
    resumption1Analysis: RESUMPTION_1_ANALYSIS,
    resumption1Diagnosis: RESUMPTION_1_DIAGNOSIS,
    resumption1RepairPreparation: RESUMPTION_1_REPAIR_PREPARATION,
    resumption1RepairExecution: RESUMPTION_1_REPAIR_EXECUTION,
    resumption1RepairAnalysis: RESUMPTION_1_REPAIR_ANALYSIS,
    resumption1RepairMergeAudit: RESUMPTION_1_REPAIR_MERGE_AUDIT,
    standingAuthorization: POST_CANARY_BATCH_03_STANDING_AUTHORIZATION,
    failureRecoveryStandingAuthorization: RECOVERY_AUTHORIZATION
  },
  modelInputs: structuredClone(originalPreparation.modelInputs),
  sourceHashes,
  acceptedOutputs: accepted,
  contexts,
  isolation: {
    oneDebatePerContext: true,
    separateFreshModelContextPerDebateRequired: true,
    onlyFrozenModelInputsAvailable: true,
    originalPacketsAndSchemasReusedByteForByte: true,
    participantJudgmentWasScoreBlind: true,
    scoresImmutable: true,
    legacyAssessmentsUnavailable: true,
    otherDebateOutputsUnavailable: true,
    acceptedOutputsUnavailableToResumptionModels: true,
    rankingsAndWinnerComparisonsUnavailable: true
  },
  publicationContract: structuredClone(originalPreparation.publicationContract),
  transport: {
    maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)),
    provenCeilingBytes: originalPreparation.transport.provenCeilingBytes,
    runtimeWordSentenceQuotationAndNoveltyValidationRequired: true
  },
  executionPolicy: {
    contexts: 6,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    correctionContextsMaximum: 0,
    timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0,
    absoluteGateTimeoutMs: 5400000,
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
    acceptedFourDebateCohortReplayedAtFreeze: true,
    sixOriginalPacketsAndSchemasReusedByteForByte: true,
    sixLocalCanonicalSourceChainsReplayedAtFreeze: true,
    originalAndFirstResumptionArtifactPathsAbsentAtFreeze: true,
    completeTenDebateValidationRequiredAfterResumption: true,
    lockedScoresUnchanged: true,
    modelAuthoredScores: 0
  },
  acceptanceContract: {
    resumptionValidContextsRequired: 6,
    cohortValidDebatesRequired: 10,
    resumptionMovesRequired: 120,
    cohortMovesRequired: 200,
    resumptionCritiquesRequired: 120,
    cohortCritiquesRequired: 200,
    resumptionExactSourceQuotesRequired: 12,
    cohortExactSourceQuotesRequired: 20,
    resumptionOverallCommentarySidesRequired: 12,
    cohortOverallCommentarySidesRequired: 20,
    resumptionAIExtensionSidesRequired: 12,
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
    failureRecoveryStandingAuthorizationPermitsActivation: true,
    modelContexts: false,
    deterministicOutputValidation: false,
    deterministicCohortAnalysis: false,
    retry: false,
    timeoutExtension: false,
    correctionModelExecution: false,
    publicationCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  totals: {
    acceptedDebates: 4,
    acceptedMoves: 80,
    resumptionContexts: 6,
    resumptionMoves,
    resumptionSections,
    resumptionAudioVerifiedMoves,
    cohortDebates: 10,
    cohortMoves: 200,
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
    "activate-and-execute-exactly-six-frozen-batch-03-publication-resumption-2-contexts-under-standing-authorizations"
};

if (shouldWrite) {
  await mkdir(path.resolve(RESUMPTION_ROOT), { recursive: true });
  await writeFile(path.resolve(MANIFEST), prettyJsonBytes(manifest));
}
console.log(JSON.stringify({
  status: shouldWrite ? manifest.status : "preview",
  debates: contexts.map((context) => context.debateNumber),
  contexts: 6,
  resumptionMoves,
  acceptedMoves,
  cohortMoves: 200,
  existingPacketsReused: 6,
  packetsGenerated: 0,
  model: manifest.model,
  schedulerRamp: [1, 2],
  attemptsPerContext: 1,
  retriesMaximum: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction
}, null, 2));
