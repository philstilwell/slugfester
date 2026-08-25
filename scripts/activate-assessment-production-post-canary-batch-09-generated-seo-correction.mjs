#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  POST_CANARY_BATCH_09_GENERATED_SEO_CORRECTION_PROTOCOL_ID,
  POST_CANARY_BATCH_09_GENERATED_SEO_CORRECTION_ROOT,
  generatedInventoryDigest,
  generatedPathSetDigest
} from "./lib/assessment-production-post-canary-batch-09-generated-seo-correction.mjs";
import { serializedJson, sha256 } from "./lib/assessment-production-post-canary-batch-09-production-publication.mjs";

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
const planPath = `${POST_CANARY_BATCH_09_GENERATED_SEO_CORRECTION_ROOT}/correction-plan.json`;
const preparationAnalysisPath = `${POST_CANARY_BATCH_09_GENERATED_SEO_CORRECTION_ROOT}/preparation-analysis.json`;
const activationPath = `${POST_CANARY_BATCH_09_GENERATED_SEO_CORRECTION_ROOT}/execution-activation.json`;
const existing = (await exists(activationPath)) ? await readJson(activationPath) : null;
const activatedAt = existing?.activatedAt ?? requestedActivatedAt;
assertV4(typeof activatedAt === "string" && !Number.isNaN(Date.parse(activatedAt)), "stable --activated-at ISO timestamp required");

const [plan, preparationAnalysis] = await Promise.all([readJson(planPath), readJson(preparationAnalysisPath)]);
assertV4(
  plan.protocolId === POST_CANARY_BATCH_09_GENERATED_SEO_CORRECTION_PROTOCOL_ID &&
    plan.status === "frozen-batch-09-generated-seo-derivative-correction-plan-prepared" &&
    plan.inventory?.length === 380 &&
    plan.proposedWrites?.length === 12 &&
    plan.executionContract?.isolatedGeneratorRuns === 1 &&
    plan.executionContract?.repositoryValidationRuns === 1,
  "frozen Batch 9 generated SEO plan required"
);
assertV4(
  preparationAnalysis.status === "batch-09-generated-seo-correction-plan-freeze-passed" &&
    preparationAnalysis.plan.sha256 === sha256(serializedJson(plan)),
  "accepted Batch 9 generated SEO preparation required"
);
assertV4(generatedPathSetDigest(plan.inventory) === plan.executionContract.requiredPathSetSha256, "frozen generated path set changed");
assertV4(generatedInventoryDigest(plan.inventory) === plan.executionContract.requiredInventorySha256, "frozen generated inventory changed");
for (const lock of [
  plan.productionMutation.manifest,
  plan.productionMutation.activation,
  plan.productionMutation.execution,
  plan.productionMutation.analysis,
  plan.productionMutation.productionDebates,
  ...plan.productionMutation.productionLedgers,
  plan.productionMutation.references,
  plan.productionMutation.validator,
  plan.generator,
  ...plan.generatorInputs,
  ...plan.preparationTools
]) {
  assertV4(sha256(await readBytes(lock.path)) === lock.sha256, `${lock.path}: frozen input changed`);
}
for (const record of plan.inventory) {
  const baseline = await readBytes(record.path);
  assertV4(sha256(baseline) === record.baselineSha256, `${record.path}: generated baseline changed before activation`);
}
const executionTools = await Promise.all([
  "scripts/lib/assessment-production-post-canary-batch-09-generated-seo-correction.mjs",
  "scripts/run-assessment-production-post-canary-batch-09-generated-seo-correction.mjs",
  "scripts/test-assessment-production-post-canary-batch-09-generated-seo-correction-activation.mjs",
  "scripts/generate-seo-pages.mjs"
].map(lockFile));
const activation = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-09-generated-seo-correction-execution-activation",
  protocolId: POST_CANARY_BATCH_09_GENERATED_SEO_CORRECTION_PROTOCOL_ID,
  status: "frozen-batch-09-generated-seo-correction-pass-activated",
  activatedAt,
  productionCanary: false,
  batchNumber: 9,
  directIncrementalCostCapUsd: 0,
  plan: await lockFile(planPath),
  preparationAnalysis: await lockFile(preparationAnalysisPath),
  executionTools,
  frozenEnumeration: {
    outputCount: 380,
    pathSetSha256: plan.executionContract.requiredPathSetSha256,
    inventorySha256: plan.executionContract.requiredInventorySha256,
    proposedWritePaths: plan.executionContract.writeOnlyProposedPaths,
    proposedWrites: plan.proposedWrites
  },
  executionDiscipline: {
    isolatedGeneratorRuns: 1,
    generatorAttempts: 1,
    repositoryValidationRuns: 1,
    retries: 0,
    reruns: 0,
    automaticRepairs: 0,
    productionMutationReruns: 0,
    rollbacks: 0,
    modelContexts: 0,
    paidServiceCalls: 0
  },
  authorization: {
    executionActivation: true,
    isolatedGeneratorExecution: true,
    exactTwelveGeneratedDerivativeWrites: true,
    completeRepositoryValidation: true,
    atomicTransactionCommitAndPush: true,
    additionalGeneratedWrites: false,
    productionMutationRerun: false,
    rollback: false,
    scorePass: false,
    modelExecution: false,
    paidServices: false,
    nextBatchSelection: false
  },
  outputPaths: { execution: plan.outputPaths.execution, analysis: plan.outputPaths.analysis },
  nextAuthorizedAction: "execute-one-frozen-batch-09-generated-seo-correction-and-validation-pass-no-reruns"
};
if (write) {
  await mkdir(resolve(POST_CANARY_BATCH_09_GENERATED_SEO_CORRECTION_ROOT), { recursive: true });
  await writeFile(resolve(activationPath), serializedJson(activation));
}
console.log(serializedJson({ status: activation.status, write, outputs: 380, proposedWrites: 12, repositoryValidationRuns: 1 }));
