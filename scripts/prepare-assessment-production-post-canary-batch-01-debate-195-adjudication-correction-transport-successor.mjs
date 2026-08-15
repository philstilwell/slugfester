#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import {
  validatePostCanaryBatch01Debate195CorrectionPacket
} from "./lib/assessment-production-post-canary-batch-01-debate-195-adjudication-correction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const ADJ_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/dispute-only-adjudication";
const PREDECESSOR_ROOT = `${ADJ_ROOT}/correction-1`;
const ROOT = `${ADJ_ROOT}/correction-2`;
const packetPath = `${PREDECESSOR_ROOT}/packet.json`;
const manualPath = `${PREDECESSOR_ROOT}/manual.md`;
const predecessorSchemaPath = `${PREDECESSOR_ROOT}/schema.json`;
const predecessorPreparationPath =
  `${PREDECESSOR_ROOT}/execution-preparation-manifest.json`;
const predecessorActivationPath = `${PREDECESSOR_ROOT}/execution-activation.json`;
const predecessorExecutionPath = `${PREDECESSOR_ROOT}/model-execution.json`;
const predecessorValidationPath = `${PREDECESSOR_ROOT}/correction-validation.json`;
const predecessorAnalysisPath = `${PREDECESSOR_ROOT}/analysis.json`;
const diagnosisPath = `${PREDECESSOR_ROOT}/transport-failure-diagnosis.json`;
const schemaPath = `${ROOT}/schema.json`;
const manifestPath = `${ROOT}/execution-preparation-manifest.json`;
const activationPath = `${ROOT}/execution-activation.json`;
const outputPath = `${ROOT}/correction-output.json`;
const executionPath = `${ROOT}/model-execution.json`;
const validationPath = `${ROOT}/correction-validation.json`;
const analysisPath = `${ROOT}/analysis.json`;
const originalOutputPath = `${ADJ_ROOT}/outputs/debate-195.json`;
const activePolicyPath =
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const activeEvaluatorPath =
  "scripts/lib/assessment-production-score-stability-policy-active.mjs";
const activeEvaluatorTestPath =
  "scripts/test-assessment-production-score-stability-policy-active.mjs";
const preparationScriptPath =
  "scripts/prepare-assessment-production-post-canary-batch-01-debate-195-adjudication-correction-transport-successor.mjs";
const testScriptPath =
  "scripts/test-assessment-production-post-canary-batch-01-debate-195-adjudication-correction-transport-successor-preparation.mjs";
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const prerequisitePaths = [
  packetPath,
  manualPath,
  predecessorSchemaPath,
  predecessorPreparationPath,
  predecessorActivationPath,
  predecessorExecutionPath,
  predecessorValidationPath,
  predecessorAnalysisPath,
  diagnosisPath,
  originalOutputPath,
  activePolicyPath
];
const prerequisiteBytes = new Map(
  await Promise.all(
    prerequisitePaths.map(async (file) => [file, await readFile(file)])
  )
);
const readJson = (file) =>
  JSON.parse(prerequisiteBytes.get(file).toString("utf8"));
const packet = readJson(packetPath);
const predecessorSchema = readJson(predecessorSchemaPath);
const predecessorPreparation = readJson(predecessorPreparationPath);
const predecessorActivation = readJson(predecessorActivationPath);
const predecessorExecution = readJson(predecessorExecutionPath);
const predecessorValidation = readJson(predecessorValidationPath);
const predecessorAnalysis = readJson(predecessorAnalysisPath);
const diagnosis = readJson(diagnosisPath);
const originalOutput = readJson(originalOutputPath);
const activePolicy = readJson(activePolicyPath);
const packetBytes = prerequisiteBytes.get(packetPath);
const manualBytes = prerequisiteBytes.get(manualPath);
const predecessorSchemaBytes = prerequisiteBytes.get(predecessorSchemaPath);
const originalOutputBytes = prerequisiteBytes.get(originalOutputPath);

assertV4(
  diagnosis.status ===
      "debate-195-correction-response-schema-items-type-mismatch-confirmed-frozen-no-successor-authorized" &&
    diagnosis.nextAuthorizedAction ===
      "user-approval-required-before-preparation-of-any-transport-compatible-successor-schema-or-execution-preparation" &&
    diagnosis.diagnosis.failureClass ===
      "response-schema-array-items-boolean-rejected-by-structured-output-transport" &&
    diagnosis.diagnosis.prefixItemsCompatibilityDetermined === false &&
    diagnosis.preservation.correctionOutputWritten === false,
  "Debate 195 frozen transport diagnosis changed"
);
assertV4(
  diagnosis.preservation.frozenRequestSchemaSha256 ===
      sha256(predecessorSchemaBytes) &&
    predecessorActivation.contexts.length === 1 &&
    predecessorActivation.contexts[0].schemaSha256 ===
      sha256(predecessorSchemaBytes) &&
    predecessorPreparation.contexts[0].packetSha256 === sha256(packetBytes) &&
    predecessorActivation.contexts[0].packetSha256 === sha256(packetBytes),
  "Debate 195 frozen predecessor request changed"
);
assertV4(
  predecessorExecution.results.length === 1 &&
    predecessorExecution.results[0].status === "result-missing" &&
    predecessorExecution.results[0].attemptCount === 1 &&
    predecessorExecution.results[0].retryCount === 0 &&
    predecessorExecution.results[0].outputWritten === false &&
    predecessorValidation.status ===
      "correction-output-unavailable-transport-failure" &&
    predecessorValidation.outputAvailable === false &&
    predecessorAnalysis.gate.failureClass ===
      "transport-or-output-availability",
  "Debate 195 frozen predecessor error record changed"
);
assertV4(
  originalOutput.moveDecisions.length === 18 &&
    originalOutput.burdenAdjustmentDecisions.length === 0 &&
    sha256(originalOutputBytes) ===
      diagnosis.preservation.originalOutputSha256,
  "Debate 195 preserved original output changed"
);
assertV4(
  activePolicy.status === "active-production-score-stability-policy-v2.2" &&
    activePolicy.activePolicy.winnerRule.agreedProMayPublish.includes("tie") &&
    activePolicy.activePolicy.winnerRule.agreedConMayPublish.includes("tie") &&
    activePolicy.productionScoreControl.modelAuthoredScoresAllowed === false,
  "active v2.2 score or integer-rounded tie policy changed"
);

const packetValidation =
  validatePostCanaryBatch01Debate195CorrectionPacket(packet);
assertV4(
  packetValidation.status === "passed" &&
    packetValidation.burdenAdjustmentDisputes === 2 &&
    packetValidation.candidateSelections === 2 &&
    packetValidation.moveDecisions === 0 &&
    packetValidation.calculatedScores === 0,
  "Debate 195 frozen correction packet validation failed"
);

const predecessorDecisionSchema =
  predecessorSchema.properties.burdenAdjustmentDecisions;
assertV4(
  predecessorDecisionSchema.type === "array" &&
    predecessorDecisionSchema.minItems === 2 &&
    predecessorDecisionSchema.maxItems === 2 &&
    predecessorDecisionSchema.items === false &&
    predecessorDecisionSchema.prefixItems.length === 2 &&
    canonicalJson(
      predecessorDecisionSchema.prefixItems.map(
        (item) => item.properties.side.const
      )
    ) === canonicalJson(["pro", "con"]),
  "Debate 195 predecessor response schema changed"
);
const predecessorProItem = structuredClone(
  predecessorDecisionSchema.prefixItems[0]
);
const predecessorConItem = structuredClone(
  predecessorDecisionSchema.prefixItems[1]
);
delete predecessorProItem.properties.side;
delete predecessorConItem.properties.side;
assertV4(
  canonicalJson(predecessorProItem) === canonicalJson(predecessorConItem),
  "predecessor pro and con item contracts differ beyond side"
);

const schema = structuredClone(predecessorSchema);
const successorDecisionSchema = schema.properties.burdenAdjustmentDecisions;
const successorItemSchema = structuredClone(
  predecessorDecisionSchema.prefixItems[0]
);
successorItemSchema.properties.side = {
  type: "string",
  enum: ["pro", "con"]
};
delete successorDecisionSchema.prefixItems;
successorDecisionSchema.items = successorItemSchema;

assertV4(
  successorDecisionSchema.type === "array" &&
    successorDecisionSchema.minItems === 2 &&
    successorDecisionSchema.maxItems === 2 &&
    successorDecisionSchema.items &&
    typeof successorDecisionSchema.items === "object" &&
    !Array.isArray(successorDecisionSchema.items) &&
    !Object.hasOwn(successorDecisionSchema, "prefixItems") &&
    canonicalJson(successorDecisionSchema.items.properties.side.enum) ===
      canonicalJson(["pro", "con"]),
  "transport successor array schema is not object-valued"
);

const schemaBytes = Buffer.from(`${JSON.stringify(schema, null, 2)}\n`);
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
  predecessorPreparationPath,
  predecessorActivationPath,
  predecessorSchemaPath,
  packetPath,
  manualPath,
  predecessorExecutionPath,
  predecessorValidationPath,
  predecessorAnalysisPath,
  diagnosisPath,
  originalOutputPath,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-debate-195-adjudication-correction.mjs",
  "scripts/validate-assessment-production-post-canary-batch-01-debate-195-adjudication-correction-output.mjs",
  preparationScriptPath,
  testScriptPath,
  schemaPath
];
const generatedBytes = new Map([[schemaPath, schemaBytes]]);
const sourceHashes = {};
for (const file of sourcePaths) {
  sourceHashes[file] = sha256(
    generatedBytes.get(file) ?? prerequisiteBytes.get(file) ?? (await readFile(file))
  );
}

const originalMoveDecisionsSha256 = sha256(
  Buffer.from(canonicalJson(originalOutput.moveDecisions))
);
const contextCopiedInputBytes =
  manualBytes.length + packetBytes.length + schemaBytes.length;
const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction-transport-successor-execution-preparation-manifest",
  protocolId:
    "assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction",
  transportSuccessorId:
    "assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction-transport-successor-1",
  status:
    "frozen-one-score-blind-debate-195-burden-adjustment-transport-successor-context-prepared-not-authorized",
  frozenAt,
  activatedAt: null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 1,
  correctionNumber: 2,
  predecessorCorrectionNumber: 1,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  userAuthorization: {
    scope:
      "prepare, validate, freeze, commit, and push one transport-compatible successor response schema and its execution-preparation manifest, reusing the existing frozen Debate 195 packet unchanged",
    directIncrementalCostUsdMaximum: 0,
    packetPreparation: false,
    packetMutation: false,
    manualPreparation: false,
    modelExecution: false,
    correctionRetry: false,
    paidServices: false,
    outputMerge: false,
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
    promotionSha256: sourceHashes[activePolicyPath],
    evaluator: activeEvaluatorPath,
    evaluatorSha256: sourceHashes[activeEvaluatorPath],
    evaluatorTest: activeEvaluatorTestPath,
    evaluatorTestSha256: sourceHashes[activeEvaluatorTestPath],
    agreedWinningSideMayCollapseToIntegerRoundedTie: true,
    scoreCalculationAuthorizedThisStage: false
  },
  predecessorFailure: {
    diagnosis: diagnosisPath,
    diagnosisSha256: sourceHashes[diagnosisPath],
    schema: predecessorSchemaPath,
    schemaSha256: sourceHashes[predecessorSchemaPath],
    failureClass: diagnosis.diagnosis.failureClass,
    requestAttempts: diagnosis.preservedError.requestAttempts,
    retryCount: diagnosis.preservedError.retryCount,
    correctionOutputWritten: false,
    modelInferenceResultAvailable: false,
    preservedNotReclassified: true
  },
  preservedInputs: {
    packet: packetPath,
    packetSha256: sourceHashes[packetPath],
    packetReusedByteForByte: true,
    packetCopiedOrRewritten: false,
    manual: manualPath,
    manualSha256: sourceHashes[manualPath],
    manualReusedByteForByte: true,
    manualCopiedOrRewritten: false
  },
  preservedOriginal: {
    output: originalOutputPath,
    outputSha256: sourceHashes[originalOutputPath],
    moveDecisionCount: 18,
    moveDecisionsSha256: originalMoveDecisionsSha256,
    moveCandidateSelections: 41,
    burdenAdjustmentDecisionCount: 0,
    immutable: true,
    unavailableToCorrectionModel: true,
    mutationAuthorized: false
  },
  transportSuccessor: {
    schema: schemaPath,
    schemaSha256: sha256(schemaBytes),
    predecessorSchema: predecessorSchemaPath,
    predecessorSchemaSha256: sha256(predecessorSchemaBytes),
    diagnosedItemsObjectRequirementAddressed: true,
    arrayItemsValueType: "object",
    positionalKeywordOmitted: "prefixItems",
    positionalKeywordCompatibilityClaimed: false,
    minimumItems: 2,
    maximumItems: 2,
    itemSideEnum: ["pro", "con"],
    transportSchemaShapeChanged: true,
    semanticOutputContractChanged: false,
    deterministicSideOrderValidationRequired: true,
    staticValidationPassed: true,
    APITransportAcceptanceProven: false,
    modelExecutionRequiredForTransportProof: true
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
    transportSchemaItemsMustBeObject: true,
    deterministicValidatorEnforcesSideOrder: true,
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
    transportAcceptanceUnprovenUntilAuthorizedExecution: true,
    sourceHashMismatchBlocks: true,
    preexistingCorrectionOutputBlocks: true,
    invalidOutputPreserved: true,
    originalOutputRemainsPreserved: true,
    preservedMoveDecisionMutationProhibited: true,
    packetMutationProhibited: true,
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
    manual: manualPath,
    predecessorSchema: predecessorSchemaPath,
    schema: schemaPath,
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
    "user-approval-required-before-any-debate-195-transport-successor-activation-or-model-execution"
};

if (shouldWrite) {
  for (const file of [schemaPath, manifestPath, ...futureOutputs]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
  assertV4(
    !(await exists(`${ROOT}/packet.json`)) &&
      !(await exists(`${ROOT}/manual.md`)),
    "successor packet or manual copy already exists"
  );
  await mkdir(ROOT, { recursive: true });
  await writeFile(schemaPath, schemaBytes);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: shouldWrite ? "frozen-prepared-not-authorized" : "preview",
      debateNumber: "195",
      correctionNumber: 2,
      contexts: 1,
      packetReusedByteForByte: true,
      transportSchemaItemsValueType: "object",
      prefixItemsOmitted: true,
      transportAcceptanceProven: false,
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
