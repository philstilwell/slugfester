#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import { BATCH_13_DEPENDENT_PILOT_CORRECTION_PROTOCOL_ID, BATCH_13_DEPENDENT_PILOT_CORRECTION_ROOT } from "./lib/assessment-production-post-canary-batch-13-dependent-pilot-analysis-correction.mjs";
import { serializedJson, sha256 } from "./lib/assessment-production-post-canary-batch-13-production-publication.mjs";

const shouldWrite = process.argv.includes("--write");
const activatedAtIndex = process.argv.indexOf("--activated-at");
const activatedAt = activatedAtIndex >= 0 ? process.argv[activatedAtIndex + 1] : null;
assertV4(typeof activatedAt === "string" && !Number.isNaN(Date.parse(activatedAt)), "stable --activated-at ISO timestamp required");
const resolve = (relativePath) => path.resolve(process.cwd(), relativePath);
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readJson = (relativePath) => readFile(resolve(relativePath), "utf8").then(JSON.parse);
const exists = (relativePath) => access(resolve(relativePath)).then(() => true, () => false);
const lockFile = async (relativePath) => { const bytes = await readBytes(relativePath); return { path: relativePath, sha256: sha256(bytes), bytes: bytes.length }; };
const planPath = `${BATCH_13_DEPENDENT_PILOT_CORRECTION_ROOT}/correction-plan.json`;
const analysisPath = `${BATCH_13_DEPENDENT_PILOT_CORRECTION_ROOT}/preparation-analysis.json`;
const activationPath = `${BATCH_13_DEPENDENT_PILOT_CORRECTION_ROOT}/execution-activation.json`;
const [plan, analysis] = await Promise.all([readJson(planPath), readJson(analysisPath)]);
assertV4(
  plan.protocolId === BATCH_13_DEPENDENT_PILOT_CORRECTION_PROTOCOL_ID &&
    plan.status === "frozen-batch-13-dependent-pilot-analysis-two-file-correction-plan-prepared" &&
    analysis.status === "batch-13-dependent-pilot-analysis-correction-plan-freeze-passed" &&
    analysis.plan.sha256 === sha256(await readBytes(planPath)),
  "frozen Batch 13 dependent pilot correction plan required"
);
for (const lock of [...plan.dependentInputs, ...plan.preparationTools, plan.diagnosis]) {
  assertV4(sha256(await readBytes(lock.path)) === lock.sha256, `${lock.path}: frozen input changed`);
}
for (const lock of [...plan.protectedProduction.generatedOutputs, ...plan.staleOutputs]) {
  assertV4(sha256(await readBytes(lock.path)) === lock.sha256, `${lock.path}: frozen baseline changed`);
}
const activation = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-13-dependent-pilot-analysis-correction-activation",
  protocolId: BATCH_13_DEPENDENT_PILOT_CORRECTION_PROTOCOL_ID,
  status: "frozen-batch-13-dependent-pilot-analysis-correction-activated",
  activatedAt,
  batchNumber: 13,
  directIncrementalCostCapUsd: 0,
  plan: await lockFile(planPath),
  preparationAnalysis: await lockFile(analysisPath),
  correctionContract: structuredClone(plan.correctionContract),
  proposedOutputs: structuredClone(plan.isolatedPreparationPreview.proposedOutputs),
  authorization: {
    boundedDeterministicCorrectionExecution: true,
    exactTwoDependentWrites: true,
    oneCompleteRepositoryValidation: true,
    productionMutationRerun: false,
    seoGeneratorWrite: false,
    scorePass: false,
    modelExecution: false,
    paidServiceUse: false,
    nextBatchSelection: false
  },
  outputPaths: structuredClone(plan.outputPaths),
  nextAuthorizedAction: "execute-one-batch-13-dependent-pilot-analysis-correction-no-retries"
};
if (shouldWrite) {
  assertV4(!(await exists(activationPath)), "dependent pilot correction already activated");
  assertV4(!(await exists(plan.outputPaths.execution)), "dependent pilot correction already executed");
  await mkdir(resolve(BATCH_13_DEPENDENT_PILOT_CORRECTION_ROOT), { recursive: true });
  await writeFile(resolve(activationPath), serializedJson(activation));
}
console.log(serializedJson({ status: activation.status, write: shouldWrite, proposedWrites: 2, attemptsMaximum: 1, directIncrementalCostUsd: 0 }));
