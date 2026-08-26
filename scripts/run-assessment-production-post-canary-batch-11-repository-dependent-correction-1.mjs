#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  BATCH_11_LEGACY_V2_FIXTURE_PATH,
  BATCH_11_PILOT_OUTPUT_PATHS,
  BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_PROTOCOL_ID,
  BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT,
  BATCH_11_SCORING_TEST_PATH,
  buildBatch11FixtureBackedScoringTest,
  loadBatch11LegacyV2Fixture,
  runIsolatedBatch11PilotAnalysis,
  runIsolatedBatch11ScoringFixtureTest
} from "./lib/assessment-production-post-canary-batch-11-repository-dependent-correction-1.mjs";
import {
  POST_CANARY_BATCH_11_GENERATED_SEO_CORRECTION_PROTOCOL_ID,
  POST_CANARY_BATCH_11_GENERATED_SEO_CORRECTION_ROOT
} from "./lib/assessment-production-post-canary-batch-11-generated-seo-correction.mjs";
import {
  serializedJson,
  sha256
} from "./lib/assessment-production-post-canary-batch-11-production-publication.mjs";

const root = process.cwd();
const resolve = (relativePath) => path.resolve(root, relativePath);
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readJson = (relativePath) => readFile(resolve(relativePath), "utf8").then(JSON.parse);
const lockFile = async (relativePath) => {
  const bytes = await readBytes(relativePath);
  return { path: relativePath, sha256: sha256(bytes), bytes: bytes.length };
};

const planPath = `${BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT}/correction-plan.json`;
const activationPath = `${BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT}/execution-activation.json`;
const executionPath = `${BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT}/execution.json`;
const analysisPath = `${BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT}/analysis.json`;
const seoPlanPath = `${POST_CANARY_BATCH_11_GENERATED_SEO_CORRECTION_ROOT}/correction-plan.json`;
const seoActivationPath = `${POST_CANARY_BATCH_11_GENERATED_SEO_CORRECTION_ROOT}/execution-activation.json`;
const seoExecutionPath = `${POST_CANARY_BATCH_11_GENERATED_SEO_CORRECTION_ROOT}/execution.json`;
const seoAnalysisPath = `${POST_CANARY_BATCH_11_GENERATED_SEO_CORRECTION_ROOT}/analysis.json`;
const startedAt = new Date().toISOString();
const [plan, activation, seoPlan, seoActivation] = await Promise.all([
  readJson(planPath),
  readJson(activationPath),
  readJson(seoPlanPath),
  readJson(seoActivationPath)
]);
assertV4(
  plan.protocolId === BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_PROTOCOL_ID &&
    activation.status ===
      "frozen-batch-11-repository-dependent-correction-1-activated" &&
    activation.plan.sha256 === sha256(await readBytes(planPath)) &&
    activation.executionDiscipline.attempts === 1 &&
    activation.executionDiscipline.retries === 0 &&
    activation.executionDiscipline.completeRepositoryValidationRuns === 1,
  "frozen Batch 11 repository-dependent correction activation required"
);
for (const lock of [
  ...activation.executionTools,
  plan.preservedState.productionDebates,
  ...plan.preservedState.productionLedgers,
  plan.preservedState.references,
  plan.preservedState.validator,
  plan.preservedState.generator,
  ...plan.preservedState.generatedOutputs
]) {
  assertV4(
    sha256(await readBytes(lock.path)) === lock.sha256,
    `${lock.path}: activated protected state changed`
  );
}

const fixtureBytes = loadBatch11LegacyV2Fixture(
  root,
  plan.baselines.fixtureSourceRevision
);
const proposedTestSource = buildBatch11FixtureBackedScoringTest(
  (await readBytes(plan.baselines.scoringTest.path)).toString("utf8")
);
const scoringPreview = await runIsolatedBatch11ScoringFixtureTest({
  repositoryRoot: root,
  testSource: proposedTestSource,
  fixtureBytes
});
assertV4(
  scoringPreview.status === 0,
  `fixture-backed scoring replay failed: ${scoringPreview.stderr || scoringPreview.stdout}`
);
const pilot = await runIsolatedBatch11PilotAnalysis(root);
const proposed = new Map([
  [BATCH_11_LEGACY_V2_FIXTURE_PATH, fixtureBytes],
  [BATCH_11_SCORING_TEST_PATH, Buffer.from(proposedTestSource)],
  ...pilot.outputs.map((output) => [output.path, output.content])
]);
assertV4(
  proposed.size === 4 &&
    activation.proposedOutputs.every((lock) => {
      const content = proposed.get(lock.path);
      return content && sha256(content) === lock.sha256 && content.length === lock.bytes;
    }),
  "Batch 11 repository-dependent outputs differ from activation"
);
for (const [relativePath, content] of proposed) {
  await mkdir(path.dirname(resolve(relativePath)), { recursive: true });
  await writeFile(resolve(relativePath), content);
}
for (const lock of activation.proposedOutputs) {
  assertV4(
    sha256(await readBytes(lock.path)) === lock.sha256,
    `${lock.path}: dependent output write differs from activation`
  );
}

const validationStartedAt = new Date().toISOString();
const validation = spawnSync("npm", ["run", "check"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 100 * 1024 * 1024
});
const validationCompletedAt = new Date().toISOString();
assertV4(
  validation.status === 0,
  `complete Batch 11 repository validation failed: ${validation.stderr || validation.stdout}`
);
for (const lock of [
  plan.preservedState.productionDebates,
  ...plan.preservedState.productionLedgers,
  plan.preservedState.references,
  plan.preservedState.validator,
  plan.preservedState.generator,
  ...plan.preservedState.generatedOutputs
]) {
  assertV4(
    sha256(await readBytes(lock.path)) === lock.sha256,
    `${lock.path}: protected state changed during dependent correction`
  );
}

const completedAt = new Date().toISOString();
const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-11-repository-dependent-correction-1-execution",
  protocolId: BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_PROTOCOL_ID,
  status: "passed-batch-11-repository-dependent-correction-1",
  startedAt,
  completedAt,
  activation: await lockFile(activationPath),
  writes: {
    exactFiles: await Promise.all(
      activation.proposedOutputs.map((output) => lockFile(output.path))
    ),
    scoringFixtureFiles: 2,
    calibrationAnalysisFiles: 2,
    otherPathsPreserved: true
  },
  validation: {
    command: "npm run check",
    runs: 1,
    startedAt: validationStartedAt,
    completedAt: validationCompletedAt,
    exitCode: validation.status,
    stdoutSha256: sha256(validation.stdout ?? ""),
    stderrSha256: sha256(validation.stderr ?? ""),
    completeRepositoryRegressionPassed: true
  },
  protected: {
    productionMutationPreserved: true,
    allTenProductionLedgersPreserved: true,
    all380GeneratedOutputsPreserved: true,
    twelveBatch11GeneratedWritesPreserved: true,
    scoreChanges: 0,
    ledgerChanges: 0
  },
  totals: {
    attempts: 1,
    retries: 0,
    reruns: 0,
    recursiveCorrections: 0,
    dependentWrites: 4,
    completeRepositoryValidationRuns: 1,
    productionMutationReruns: 0,
    seoGeneratorWriteRuns: 0,
    scorePasses: 0,
    modelContexts: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
  },
  nextAuthorizedAction:
    "finalize-batch-11-generated-seo-transaction-and-commit-push"
};
await writeFile(resolve(executionPath), serializedJson(execution));
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-11-repository-dependent-correction-1-analysis",
  protocolId: BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_PROTOCOL_ID,
  status: "batch-11-repository-dependent-correction-accepted",
  analyzedAt: completedAt,
  execution: await lockFile(executionPath),
  decision: {
    scoringFixtureCorrectionPassed: true,
    pilotAnalysisCorrectionPassed: true,
    exactFourWritesPassed: true,
    completeRepositoryValidationPassed: true,
    productionAndScoresPreserved: true,
    generatedSeoOutputsPreserved: true,
    atomicCommitAndPushAuthorized: true
  },
  totals: execution.totals,
  nextAuthorizedAction: execution.nextAuthorizedAction
};
await writeFile(resolve(analysisPath), serializedJson(analysis));

const seoExecution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-11-generated-seo-correction-execution",
  protocolId: POST_CANARY_BATCH_11_GENERATED_SEO_CORRECTION_PROTOCOL_ID,
  status: "passed-complete-batch-11-transaction-ready-for-atomic-commit",
  startedAt,
  completedAt,
  activation: await lockFile(seoActivationPath),
  boundedRecovery: await lockFile(executionPath),
  isolatedGeneration: {
    runs: 1,
    outputs: 380,
    pathSetSha256: seoPlan.executionContract.requiredPathSetSha256,
    inventorySha256: seoPlan.executionContract.requiredInventorySha256,
    temporaryFilesCleaned: true
  },
  writes: {
    exactGeneratedFiles: await Promise.all(
      seoPlan.proposedWrites.map((record) => lockFile(record.path))
    ),
    changedFiles: 12,
    unchangedGeneratedFiles: 368,
    otherGeneratedOutputsPreserved: true
  },
  validation: execution.validation,
  productionTransaction: {
    debatesPublished: 10,
    productionLedgerFiles: 10,
    productionDebates: seoPlan.productionMutation.productionDebates,
    productionLedgers: seoPlan.productionMutation.productionLedgers,
    referencesByteIdentical: true,
    validatorByteIdentical: true,
    generatorByteIdentical: true
  },
  dependentRecovery: {
    scoringFixtureFiles: 2,
    calibrationAnalysisFiles: 2,
    scoreChanges: 0,
    ledgerChanges: 0
  },
  totals: {
    isolatedGeneratorRuns: 1,
    repositoryValidationRuns: 2,
    generatedDerivativeWrites: 12,
    dependentCorrectionWrites: 4,
    unchangedGeneratedOutputs: 368,
    productionMutationReruns: 0,
    retries: 0,
    reruns: 0,
    automaticRepairs: 0,
    rollbacks: 0,
    scorePasses: 0,
    modelContexts: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
  },
  nextAuthorizedAction:
    "atomic-commit-and-push-complete-validated-batch-11-production-transaction-then-stop-before-batch-12-selection"
};
await writeFile(resolve(seoExecutionPath), serializedJson(seoExecution));
const seoAnalysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-11-generated-seo-correction-analysis",
  protocolId: POST_CANARY_BATCH_11_GENERATED_SEO_CORRECTION_PROTOCOL_ID,
  status:
    "batch-11-production-publication-accepted-for-atomic-commit-after-generated-seo-correction",
  analyzedAt: completedAt,
  execution: await lockFile(seoExecutionPath),
  decision: {
    generatedSeoCorrectionGatePassed: true,
    batch11ProductionPublicationGatePassed: true,
    boundedRepositoryDependentCorrectionPassed: true,
    generatorOutputCountPassed: true,
    pathSetDigestPassed: true,
    inventoryDigestPassed: true,
    other368GeneratedOutputsPreserved: true,
    completeRepositoryValidationPassed: true,
    completeTransactionAccepted: true,
    atomicCommitAndPushAuthorized: true,
    productionMutationRerunPerformed: false,
    seoGeneratorWriteRerunPerformed: false,
    scorePassPerformed: false,
    modelExecutionPerformed: false,
    paidServiceUsed: false,
    nextBatchSelected: false
  },
  result: {
    generatorRuns: 1,
    generatorOutputs: 380,
    affectedGeneratedFiles: 12,
    unchangedGeneratedFiles: 368,
    dependentCorrectionFiles: 4,
    repositoryValidationRuns: 2,
    finalRepositoryValidationExitCode: 0,
    fullRepositoryRegressionPassed: true
  },
  totals: seoExecution.totals,
  nextAuthorizedAction: seoExecution.nextAuthorizedAction
};
await writeFile(resolve(seoAnalysisPath), serializedJson(seoAnalysis));

console.log(
  serializedJson({
    status: seoExecution.status,
    recoveryStatus: execution.status,
    generatedOutputs: 380,
    generatedWrites: 12,
    dependentWrites: 4,
    finalRepositoryValidationPassed: true,
    productionMutationReruns: 0,
    seoGeneratorWriteRuns: 0,
    directIncrementalCostUsd: 0
  })
);
