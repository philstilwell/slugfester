#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import {
  POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_ROOT,
  buildPostCanaryBatch01Debate195CorrectionPacket,
  makePostCanaryBatch01Debate195CorrectionSchema,
  validatePostCanaryBatch01Debate195CorrectionPacket
} from "./lib/assessment-production-post-canary-batch-01-debate-195-adjudication-correction.mjs";
import { validatePostCanaryBatch01DisputeAdjudicationOutput } from "./lib/assessment-production-post-canary-batch-01-dispute-adjudication.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const ADJ_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/dispute-only-adjudication";
const ROOT = POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_ROOT;
const packetPath = `${ROOT}/packet.json`;
const schemaPath = `${ROOT}/schema.json`;
const manualPath = `${ROOT}/manual.md`;
const manifestPath = `${ROOT}/execution-preparation-manifest.json`;
const activationPath = `${ROOT}/execution-activation.json`;
const outputPath = `${ROOT}/correction-output.json`;
const executionPath = `${ROOT}/model-execution.json`;
const validationPath = `${ROOT}/correction-validation.json`;
const analysisPath = `${ROOT}/analysis.json`;
const diagnosisPath = `${ADJ_ROOT}/failure-diagnosis.json`;
const originalPacketPath = `${ADJ_ROOT}/packets/debate-195.json`;
const originalOutputPath = `${ADJ_ROOT}/outputs/debate-195.json`;
const originalProvenancePath = `${ADJ_ROOT}/provenance/debate-195.json`;
const originalActivationPath = `${ADJ_ROOT}/execution-activation.json`;
const originalExecutionPath = `${ADJ_ROOT}/model-execution.json`;
const originalAnalysisPath = `${ADJ_ROOT}/analysis.json`;
const activePolicyPath =
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const activeEvaluatorPath =
  "scripts/lib/assessment-production-score-stability-policy-active.mjs";
const activeEvaluatorTestPath =
  "scripts/test-assessment-production-score-stability-policy-active.mjs";
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const [
  diagnosisBytes,
  originalPacketBytes,
  originalOutputBytes,
  originalActivationBytes,
  originalExecutionBytes,
  originalAnalysisBytes,
  activePolicyBytes
] = await Promise.all(
  [
    diagnosisPath,
    originalPacketPath,
    originalOutputPath,
    originalActivationPath,
    originalExecutionPath,
    originalAnalysisPath,
    activePolicyPath
  ].map((file) => readFile(file))
);
const diagnosis = JSON.parse(diagnosisBytes);
const originalPacket = JSON.parse(originalPacketBytes);
const originalOutput = JSON.parse(originalOutputBytes);
const originalActivation = JSON.parse(originalActivationBytes);
const originalExecution = JSON.parse(originalExecutionBytes);
const originalAnalysis = JSON.parse(originalAnalysisBytes);
const activePolicy = JSON.parse(activePolicyBytes);

assertV4(
  diagnosis.status ===
      "debate-195-required-burden-adjustment-decisions-omitted-confirmed-frozen-no-correction-authorized" &&
    diagnosis.debate.outputSha256 === sha256(originalOutputBytes) &&
    diagnosis.diagnosis.outputMoveDecisions === 18 &&
    diagnosis.diagnosis.outputMoveCandidateSelections === 41 &&
    diagnosis.diagnosis.requiredBurdenAdjustmentDecisions === 2 &&
    diagnosis.diagnosis.outputBurdenAdjustmentDecisions === 0 &&
    diagnosis.diagnosis.missingCandidateSelections === 2,
  "Debate 195 frozen failure diagnosis changed"
);
assertV4(
  originalAnalysis.status ===
      "post-canary-batch-01-dispute-only-adjudication-gate-failed-validation" &&
    originalAnalysis.gate.validContexts === 9 &&
    originalExecution.results.find((item) => item.debateNumber === "195")
      ?.gateAcceptancePassed === false &&
    originalActivation.contexts.find((item) => item.debateNumber === "195")
      ?.packetSha256 === sha256(originalPacketBytes),
  "Debate 195 failed adjudication gate changed"
);

let replayFailure = null;
try {
  validatePostCanaryBatch01DisputeAdjudicationOutput(
    originalOutput,
    originalPacket
  );
} catch (error) {
  replayFailure = error;
}
assertV4(
  replayFailure?.message === "burden adjustment decision count mismatch",
  "Debate 195 original validation failure changed"
);
assertV4(
  originalOutput.moveDecisions.length === 18 &&
    originalOutput.burdenAdjustmentDecisions.length === 0,
  "Debate 195 preserved decision boundary changed"
);
assertV4(
  activePolicy.status === "active-production-score-stability-policy-v2.2" &&
    activePolicy.activePolicy.winnerRule.agreedProMayPublish.includes("tie") &&
    activePolicy.activePolicy.winnerRule.agreedConMayPublish.includes("tie") &&
    activePolicy.productionScoreControl.modelAuthoredScoresAllowed === false,
  "active v2.2 score or integer-rounded tie policy changed"
);

const packet = buildPostCanaryBatch01Debate195CorrectionPacket(originalPacket);
const schema = makePostCanaryBatch01Debate195CorrectionSchema();
const packetValidation =
  validatePostCanaryBatch01Debate195CorrectionPacket(packet);
assertV4(
  packetValidation.status === "passed" &&
    packetValidation.burdenAdjustmentDisputes === 2 &&
    packetValidation.moveDecisions === 0 &&
    packetValidation.calculatedScores === 0,
  "Debate 195 correction packet validation failed"
);

const packetBytes = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
const schemaBytes = Buffer.from(`${JSON.stringify(schema, null, 2)}\n`);
const manualBytes = await readFile(manualPath);
const originalMoveDecisionsSha256 = sha256(
  Buffer.from(canonicalJson(originalOutput.moveDecisions))
);
const futureOutputs = [
  activationPath,
  outputPath,
  executionPath,
  validationPath,
  analysisPath
];

const sourcePaths = [
  "docs/assessment-production-workflow.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/assessment-production/manifest-v1.json",
  activePolicyPath,
  activeEvaluatorPath,
  activeEvaluatorTestPath,
  `${ADJ_ROOT}/preparation-manifest.json`,
  `${ADJ_ROOT}/execution-preparation-manifest.json`,
  originalActivationPath,
  originalExecutionPath,
  originalAnalysisPath,
  diagnosisPath,
  `${ADJ_ROOT}/adjudication.schema.json`,
  originalPacketPath,
  originalOutputPath,
  originalProvenancePath,
  manualPath,
  packetPath,
  schemaPath,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4221175-decomposed-adjudication.mjs",
  "scripts/lib/v42211728-hard-route-adjudication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-dispute-adjudication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-debate-195-adjudication-correction.mjs",
  "scripts/validate-assessment-production-post-canary-batch-01-debate-195-adjudication-correction-output.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-01-debate-195-adjudication-correction.mjs",
  "scripts/test-assessment-production-post-canary-batch-01-debate-195-adjudication-correction-preparation.mjs"
];
const generatedBytes = new Map([
  [packetPath, packetBytes],
  [schemaPath, schemaBytes]
]);
const sourceHashes = {};
for (const file of sourcePaths) {
  sourceHashes[file] = sha256(generatedBytes.get(file) ?? (await readFile(file)));
}

const contextCopiedInputBytes =
  manualBytes.length + packetBytes.length + schemaBytes.length;
const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction-execution-preparation-manifest",
  protocolId:
    "assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction",
  status:
    "frozen-one-score-blind-debate-195-burden-adjustment-correction-context-prepared-not-authorized",
  frozenAt,
  activatedAt: null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 1,
  correctionNumber: 1,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  userAuthorization: {
    scope:
      "prepare, validate, freeze, commit, and push exactly one score-blind Debate 195 burden-adjustment correction packet and its execution-preparation manifest only",
    burdenAdjustmentDisputes: 2,
    sides: ["pro", "con"],
    preserveMoveDecisions: 18,
    directIncrementalCostUsdMaximum: 0,
    modelExecution: false,
    paidServices: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    scoreBlind: true,
    roundedIntegerScoreTiesPermitted: true,
    meteredApiCostUsdMaximum: 0
  },
  activePolicy: {
    version: "v2.2",
    promotion: activePolicyPath,
    promotionSha256: sha256(activePolicyBytes),
    evaluator: activeEvaluatorPath,
    evaluatorSha256: sourceHashes[activeEvaluatorPath],
    evaluatorTest: activeEvaluatorTestPath,
    evaluatorTestSha256: sourceHashes[activeEvaluatorTestPath],
    agreedWinningSideMayCollapseToIntegerRoundedTie: true,
    scoreCalculationAuthorizedThisStage: false
  },
  preservedOriginal: {
    diagnosis: diagnosisPath,
    diagnosisSha256: sha256(diagnosisBytes),
    packet: originalPacketPath,
    packetSha256: sha256(originalPacketBytes),
    output: originalOutputPath,
    outputSha256: sha256(originalOutputBytes),
    provenance: originalProvenancePath,
    provenanceSha256: sourceHashes[originalProvenancePath],
    moveDecisionCount: 18,
    moveDecisionsSha256: originalMoveDecisionsSha256,
    moveCandidateSelections: 41,
    burdenAdjustmentDecisionCount: 0,
    gateAcceptancePassed: false,
    immutable: true,
    unavailableToCorrectionModel: true,
    mutationAuthorized: false
  },
  modelInputs: {
    manual: manualPath,
    packet: packetPath,
    schema: schemaPath
  },
  contexts: [
    {
      contextIndex: 0,
      debateNumber: "195",
      debateId: "russell-copleston-existence-of-god-1948",
      correctionType: "missing-burden-adjustment-decisions-only",
      packet: packetPath,
      packetSha256: sha256(packetBytes),
      schema: schemaPath,
      schemaSha256: sha256(schemaBytes),
      manual: manualPath,
      manualSha256: sha256(manualBytes),
      output: outputPath,
      burdenAdjustmentDisputes: 2,
      requiredSides: ["pro", "con"],
      candidateSelections: 2,
      moveDecisions: 0,
      audioTranscriptInputs: [],
      copiedInputBytes: contextCopiedInputBytes
    }
  ],
  isolation: {
    freshTemporaryCodexHome: true,
    freshSourceDirectory: true,
    oneDebateOneContext: true,
    burdenAdjustmentDisputesOnly: true,
    anonymousCandidatePairsOnly: true,
    lockedLocalEvidenceOnly: true,
    provenanceUnavailable: true,
    passIdentitiesUnavailable: true,
    initialRationalesUnavailable: true,
    preservedMoveDecisionsUnavailable: true,
    fullInitialOutputUnavailable: true,
    calculatedScoresUnavailable: true,
    winnersUnavailable: true,
    legacyAssessmentsUnavailable: true,
    otherDebatesUnavailable: true,
    publicationProseUnavailable: true
  },
  executionPolicy: {
    contexts: 1,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    recursiveCorrectionContextsMaximum: 0,
    maximumParallelContexts: 1,
    scheduler: "single-context",
    timeoutMsPerContext: 900000,
    maximumMinutesPerContext: 12,
    copiedInputBytesMaximum: 50000,
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
    preparationStageDirectIncrementalCostUsd: 0,
    futureContextAuthentication: "ChatGPT subscription",
    futureDirectIncrementalCostUsdMaximum: 0,
    paidServiceCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0
  },
  deterministicValidation: {
    exactPacketDisputes: 2,
    exactOutputDecisionsRequired: 2,
    requiredSideOrder: ["pro", "con"],
    transportSchemaMinimumItems: 2,
    transportSchemaMaximumItems: 2,
    exactCandidateSelectionOnly: true,
    preservedMoveDecisionsUntouched: true,
    calculatedScores: 0,
    deterministicMergeAuthorized: false
  },
  authorization: {
    executionActivation: false,
    correctionModelContext: false,
    adjudicationModelContext: false,
    judgmentModelContexts: false,
    deterministicCorrectionValidation: false,
    deterministicMerge: false,
    retry: false,
    timeoutExtension: false,
    recursiveCorrection: false,
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
    preexistingCorrectionOutputBlocks: true,
    invalidOutputPreserved: true,
    originalOutputRemainsPreserved: true,
    preservedMoveDecisionMutationProhibited: true,
    retryProhibited: true,
    timeoutExtensionProhibited: true,
    recursiveCorrectionProhibited: true,
    candidateValueRepairProhibited: true,
    judgmentModelExecutionProhibited: true,
    paidServiceUseProhibited: true,
    deterministicMergeProhibited: true,
    finalLedgerAssemblyProhibited: true,
    scoreDerivationProhibited: true,
    publicationReconstructionProhibited: true,
    productionMutationProhibited: true,
    nextBatchSelectionProhibited: true
  },
  artifacts: {
    packet: packetPath,
    schema: schemaPath,
    manual: manualPath,
    executionPreparation: manifestPath,
    activation: activationPath,
    correctionOutput: outputPath,
    execution: executionPath,
    validation: validationPath,
    analysis: analysisPath
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes,
  nextAuthorizedAction:
    "user-approval-required-before-exactly-one-debate-195-burden-adjustment-correction-context-activation-or-any-model-execution"
};

if (shouldWrite) {
  for (const file of [packetPath, schemaPath, manifestPath, ...futureOutputs]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
  await mkdir(ROOT, { recursive: true });
  await writeFile(packetPath, packetBytes);
  await writeFile(schemaPath, schemaBytes);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: shouldWrite ? "frozen-prepared-not-authorized" : "preview",
      debateNumber: "195",
      contexts: 1,
      burdenAdjustmentDisputes: 2,
      candidateSelections: 2,
      preservedMoveDecisions: 18,
      model: manifest.model,
      copiedInputBytes: contextCopiedInputBytes,
      attemptsPerContext: 1,
      retriesMaximum: 0,
      modelExecutionAuthorized: false,
      paidServicesAuthorized: false,
      scoresDerived: 0,
      directIncrementalCostUsdMaximum: 0,
      nextAuthorizedAction: manifest.nextAuthorizedAction
    },
    null,
    2
  )
);
