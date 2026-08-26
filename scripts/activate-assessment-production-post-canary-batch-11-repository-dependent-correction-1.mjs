#!/usr/bin/env node

import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_PROTOCOL_ID,
  BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT
} from "./lib/assessment-production-post-canary-batch-11-repository-dependent-correction-1.mjs";
import {
  serializedJson,
  sha256
} from "./lib/assessment-production-post-canary-batch-11-production-publication.mjs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const activatedAtIndex = args.indexOf("--activated-at");
const requestedActivatedAt = activatedAtIndex >= 0 ? args[activatedAtIndex + 1] : null;
const root = process.cwd();
const resolve = (relativePath) => path.resolve(root, relativePath);
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readJson = (relativePath) => readFile(resolve(relativePath), "utf8").then(JSON.parse);
const exists = (relativePath) => access(resolve(relativePath)).then(() => true, () => false);
const lockFile = async (relativePath) => {
  const bytes = await readBytes(relativePath);
  return { path: relativePath, sha256: sha256(bytes), bytes: bytes.length };
};

const planPath = `${BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT}/correction-plan.json`;
const preparationAnalysisPath = `${BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT}/preparation-analysis.json`;
const activationPath = `${BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT}/execution-activation.json`;
const existing = (await exists(activationPath))
  ? await readJson(activationPath)
  : null;
const activatedAt = existing?.activatedAt ?? requestedActivatedAt;
assertV4(
  typeof activatedAt === "string" && !Number.isNaN(Date.parse(activatedAt)),
  "stable --activated-at ISO timestamp required"
);
const [plan, preparationAnalysis] = await Promise.all([
  readJson(planPath),
  readJson(preparationAnalysisPath)
]);
assertV4(
  plan.protocolId === BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_PROTOCOL_ID &&
    plan.status ===
      "frozen-batch-11-four-file-repository-dependent-correction-prepared" &&
    plan.correctionContract.attemptsMaximum === 1 &&
    plan.correctionContract.retriesMaximum === 0 &&
    plan.correctionContract.writablePaths.length === 4 &&
    preparationAnalysis.status ===
      "batch-11-repository-dependent-correction-plan-freeze-passed" &&
    preparationAnalysis.plan.sha256 === sha256(serializedJson(plan)),
  "frozen Batch 11 repository-dependent correction plan required"
);
for (const lock of [
  plan.preservedState.seoPlan,
  plan.preservedState.productionDebates,
  ...plan.preservedState.productionLedgers,
  plan.preservedState.references,
  plan.preservedState.validator,
  plan.preservedState.generator,
  ...plan.preservedState.generatedOutputs,
  ...plan.preparationTools
]) {
  assertV4(
    sha256(await readBytes(lock.path)) === lock.sha256,
    `${lock.path}: correction input changed before activation`
  );
}
const executionTools = await Promise.all(
  [
    "scripts/lib/assessment-production-post-canary-batch-11-repository-dependent-correction-1.mjs",
    "scripts/run-assessment-production-post-canary-batch-11-repository-dependent-correction-1.mjs",
    "scripts/test-assessment-production-post-canary-batch-11-repository-dependent-correction-1-activation.mjs"
  ].map(lockFile)
);
const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-11-repository-dependent-correction-1-activation",
  protocolId: BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_PROTOCOL_ID,
  status: "frozen-batch-11-repository-dependent-correction-1-activated",
  activatedAt,
  batchNumber: 11,
  directIncrementalCostCapUsd: 0,
  plan: await lockFile(planPath),
  preparationAnalysis: await lockFile(preparationAnalysisPath),
  executionTools,
  proposedOutputs: plan.isolatedPreparationPreview.proposedOutputs,
  executionDiscipline: {
    attempts: 1,
    retries: 0,
    reruns: 0,
    recursiveCorrections: 0,
    completeRepositoryValidationRuns: 1,
    productionMutationReruns: 0,
    seoGeneratorWriteRuns: 0,
    modelContexts: 0,
    paidServiceCalls: 0
  },
  authorization: {
    executionActivation: true,
    exactFourDependentWrites: true,
    completeRepositoryValidation: true,
    atomicCommitAndPush: true,
    additionalWrites: false,
    productionMutationRerun: false,
    seoGeneratorWrite: false,
    scorePass: false,
    modelExecution: false,
    paidServices: false,
    nextBatchSelection: false
  },
  outputPaths: plan.outputPaths,
  nextAuthorizedAction:
    "execute-one-batch-11-repository-dependent-correction-and-full-validation-pass"
};
if (write) {
  assertV4(!existing, "Batch 11 repository-dependent correction already activated");
  await writeFile(resolve(activationPath), serializedJson(activation));
}
console.log(
  serializedJson({
    status: activation.status,
    write,
    proposedWrites: 4,
    attempts: 1,
    retries: 0,
    completeRepositoryValidationRuns: 1
  })
);
