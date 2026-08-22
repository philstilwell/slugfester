#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";

import { POST_CANARY_BATCH_06_DISPUTE_ADJ_ROOT } from "./lib/assessment-production-post-canary-batch-06-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);
const preparationPath = `${POST_CANARY_BATCH_06_DISPUTE_ADJ_ROOT}/preparation-manifest.json`;
const manifestPath = `${POST_CANARY_BATCH_06_DISPUTE_ADJ_ROOT}/execution-preparation-manifest.json`;
const activationPath = `${POST_CANARY_BATCH_06_DISPUTE_ADJ_ROOT}/execution-activation.json`;
const executionPath = `${POST_CANARY_BATCH_06_DISPUTE_ADJ_ROOT}/model-execution.json`;
const analysisPath = `${POST_CANARY_BATCH_06_DISPUTE_ADJ_ROOT}/analysis.json`;
const referenceExecutionPath =
  "docs/assessment-production/production-checkpoint-v2.2-1/dispute-only-adjudication/model-execution.json";
const activePolicyPath =
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const activeEvaluatorPath =
  "scripts/lib/assessment-production-score-stability-policy-active.mjs";
const activeEvaluatorTestPath =
  "scripts/test-assessment-production-score-stability-policy-active.mjs";
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

if (shouldWrite) {
  for (const file of [manifestPath, activationPath, executionPath, analysisPath]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}
const [preparationBytes, referenceExecutionBytes, activePolicyBytes] =
  await Promise.all([
    readFile(preparationPath),
    readFile(referenceExecutionPath),
    readFile(activePolicyPath)
  ]);
const preparation = JSON.parse(preparationBytes);
const referenceExecution = JSON.parse(referenceExecutionBytes);
const activePolicy = JSON.parse(activePolicyBytes);

assertV4(
  preparation.status ===
      "prepared-ten-isolated-post-canary-batch-06-dispute-only-adjudication-contexts" &&
    preparation.productionCanary === false &&
    preparation.batchNumber === 6 &&
    preparation.stagingOnly === true &&
    preparation.contexts.length === 10 &&
    preparation.totals.disputedMoves === 197 &&
    preparation.totals.candidateSelections === 609 &&
    preparation.totals.audioVerifiedMoves === 2 &&
    preparation.totals.modelContextsExecuted === 0 &&
    preparation.totals.finalLedgersAssembled === 0 &&
    preparation.totals.scoresDerived === 0 &&
    preparation.authorization.executionPreparationManifest === true &&
    preparation.authorization.adjudicationModelExecution === false,
  "Batch 6 adjudication packets are not ready for execution preparation"
);
assertV4(
  preparation.acceptedSourceBoundary.allTwentyJudgmentsAccepted === true &&
    preparation.acceptedSourceBoundary.allTwoAudioMovesVerified === true &&
    preparation.acceptedSourceBoundary.additionalPaidCallsThisStage === 0 &&
    preparation.userAuthorization.directIncrementalCostUsdMaximum === 0,
  "Batch 6 accepted source or cost boundary changed"
);
assertV4(
  preparation.model.label === "5.6 Sol" &&
    preparation.model.slug === "gpt-5.6-sol" &&
    preparation.model.reasoningEffort === "low" &&
    preparation.model.authentication === "ChatGPT subscription" &&
    preparation.model.scoreBlind === true &&
    preparation.model.roundedIntegerScoreTiesPermitted === true &&
    preparation.model.meteredApiCostUsdMaximum === 0,
  "Batch 6 adjudication model or score-blind boundary changed"
);
assertV4(
  preparation.totals.maximumCopiedInputBytes <= 400000,
  "Batch 6 context exceeds the frozen transport ceiling"
);
assertV4(
  activePolicy.status === "active-production-score-stability-policy-v2.2" &&
    activePolicy.activePolicy.version === "v2.2" &&
    activePolicy.activePolicy.winnerRule.agreedProMayPublish.includes("tie") &&
    activePolicy.activePolicy.winnerRule.agreedConMayPublish.includes("tie") &&
    activePolicy.productionScoreControl.scoreCalculationPasses === 1 &&
    activePolicy.productionScoreControl.modelAuthoredScoresAllowed === false,
  "active v2.2 score and integer-rounded tie policy changed"
);
assertV4(
  referenceExecution.status ===
      "ten-isolated-production-checkpoint-v2.2-dispute-only-adjudication-contexts-passed" &&
    referenceExecution.validContexts === 10 &&
    referenceExecution.retries === 0 &&
    referenceExecution.scoresDerived === 0,
  "promoted ten-context adjudication execution evidence is unavailable"
);

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
const sourceFiles = [
  ...Object.keys(preparation.sourceHashes),
  preparationPath,
  preparation.inputs.schema,
  referenceExecutionPath,
  activePolicyPath,
  activeEvaluatorPath,
  activeEvaluatorTestPath,
  "scripts/lib/assessment-production-post-canary-batch-06-dispute-adjudication.mjs",
  "scripts/build-assessment-production-post-canary-batch-06-dispute-adjudication-packets.mjs",
  "scripts/test-assessment-production-post-canary-batch-06-dispute-adjudication-packets.mjs",
  "scripts/validate-assessment-production-post-canary-batch-06-dispute-adjudication-output.mjs",
  "scripts/preregister-assessment-production-post-canary-batch-06-dispute-adjudication.mjs",
  "scripts/test-assessment-production-post-canary-batch-06-dispute-adjudication-manifest.mjs",
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
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) {
  sourceHashes[file] = sha256(await readFile(file));
}
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sourceHashes[file] === digest, `preparation source drifted: ${file}`);
}
for (const context of preparation.contexts) {
  assertV4(
    sourceHashes[context.packet] === context.packetSha256 &&
      sourceHashes[context.provenance] === context.provenanceSha256,
    `Debate ${context.debateNumber}: packet or provenance hash changed`
  );
}

const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-06-dispute-only-adjudication-execution-preparation-manifest",
  protocolId: preparation.protocolId,
  status:
    "frozen-ten-post-canary-batch-06-dispute-only-adjudication-contexts-prepared-not-authorized",
  frozenAt,
  activatedAt: null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 6,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  preparation: preparationPath,
  preparationSha256: sha256(preparationBytes),
  userAuthorization: structuredClone(preparation.userAuthorization),
  acceptedSourceBoundary: structuredClone(preparation.acceptedSourceBoundary),
  model: structuredClone(preparation.model),
  activePolicy: {
    version: "v2.2",
    promotion: activePolicyPath,
    promotionSha256: sha256(activePolicyBytes),
    evaluator: activeEvaluatorPath,
    evaluatorSha256: sourceHashes[activeEvaluatorPath],
    evaluatorTest: activeEvaluatorTestPath,
    evaluatorTestSha256: sourceHashes[activeEvaluatorTestPath],
    agreedWinningSideMayCollapseToIntegerRoundedTie: true,
    scorePassesMaximum: 1,
    scoreCalculationAuthorizedThisStage: false
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
    contexts: 10,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    rampPhases,
    firstRealContextOperationalCanary: true,
    stopBeforeExpansionOnRampFailure: true,
    continueIndependentContextsWithinStartedSteadyPhaseAfterFailure: true,
    timeoutMsPerContext: 900000,
    maximumMinutesPerContext: 12,
    maximumMeanMinutes: 9.5,
    absoluteGateTimeoutMs: 5400000,
    copiedInputBytesMaximum: 400000,
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
    transcriptionCostUsdMaximum: 0,
    separateActivationRequired: true
  },
  costEstimate: {
    contexts: 10,
    authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    expectedParallelWallMinutes: [18, 40],
    expectedAggregateModelMinutes: [28, 65],
    absoluteGateTimeoutMinutes: 90,
    preparationStageDirectIncrementalCostUsd: 0
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
    executionActivation: false,
    adjudicationModelContexts: false,
    judgmentModelContexts: false,
    deterministicValidation: false,
    deterministicAnalysis: false,
    retry: false,
    timeoutExtension: false,
    correctionModelExecution: false,
    paidServices: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  stopRules: {
    separateUserAuthorizationBeforeActivationRequired: true,
    sourceHashMismatchBlocks: true,
    preexistingOutputBlocks: true,
    invalidOutputPreserved: true,
    stopBeforeExpansionOnRampFailure: true,
    laterIndependentContextsContinueOnlyWithinStartedSteadyPhase: true,
    retryProhibited: true,
    timeoutExtensionProhibited: true,
    correctionModelProhibited: true,
    candidateValueRepairProhibited: true,
    judgmentModelExecutionProhibited: true,
    paidServiceUseProhibited: true,
    finalLedgerAssemblyProhibited: true,
    scoreDerivationProhibited: true,
    publicationReconstructionProhibited: true,
    productionMutationProhibited: true,
    nextBatchSelectionProhibited: true
  },
  artifacts: {
    packetPreparation: preparationPath,
    executionPreparation: manifestPath,
    activation: activationPath,
    execution: executionPath,
    analysis: analysisPath,
    outputs: preparation.contexts.map((context) => context.output)
  },
  futureOutputPathsExcludedFromSourceHashes: [
    activationPath,
    ...preparation.contexts.map((context) => context.output),
    executionPath,
    analysisPath
  ],
  sourceHashes,
  nextAuthorizedAction:
    "standing-authorization-permits-batch-06-dispute-only-adjudication-activation-after-frozen-gate-passes"
};

if (shouldWrite) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? "frozen-prepared-not-authorized" : "preview",
  debates: manifest.contexts.map((context) => context.debateNumber),
  contexts: manifest.contexts.length,
  disputedMoves: preparation.totals.disputedMoves,
  candidateSelections: preparation.totals.candidateSelections,
  audioTranscriptInputs: preparation.totals.audioVerifiedMoves,
  maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes,
  schedulerRamp: manifest.executionPolicy.schedulerRamp,
  attemptsMaximum: 10,
  retriesMaximum: 0,
  authentication: manifest.model.authentication,
  directIncrementalCostUsdMaximum: 0,
  modelExecutionAuthorized: false,
  finalLedgersAssembled: 0,
  scoresDerived: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction
}, null, 2));
