#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
import {
  BATCH_13_DEPENDENT_PILOT_CORRECTION_PROTOCOL_ID,
  BATCH_13_DEPENDENT_PILOT_CORRECTION_ROOT,
  BATCH_13_DEPENDENT_PILOT_OUTPUT_PATHS,
  jsonLeafChanges,
  runIsolatedBatch13DependentPilotAnalysis
} from "./lib/assessment-production-post-canary-batch-13-dependent-pilot-analysis-correction.mjs";
import {
  POST_CANARY_BATCH_13_GENERATED_SEO_CORRECTION_ROOT
} from "./lib/assessment-production-post-canary-batch-13-generated-seo-correction.mjs";
import { serializedJson, sha256 } from "./lib/assessment-production-post-canary-batch-13-production-publication.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
assertV4(typeof frozenAt === "string" && !Number.isNaN(Date.parse(frozenAt)), "stable --frozen-at ISO timestamp required");
const root = process.cwd();
const resolve = (relativePath) => path.resolve(root, relativePath);
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readJson = (relativePath) => readFile(resolve(relativePath), "utf8").then(JSON.parse);
const exists = (relativePath) => access(resolve(relativePath)).then(() => true, () => false);
const lockFile = async (relativePath) => {
  const bytes = await readBytes(relativePath);
  return { path: relativePath, sha256: sha256(bytes), bytes: bytes.length };
};

const diagnosisPath = `${POST_CANARY_BATCH_13_GENERATED_SEO_CORRECTION_ROOT}/validation-failure-diagnosis.json`;
const seoPlanPath = `${POST_CANARY_BATCH_13_GENERATED_SEO_CORRECTION_ROOT}/correction-plan.json`;
const seoActivationPath = `${POST_CANARY_BATCH_13_GENERATED_SEO_CORRECTION_ROOT}/execution-activation.json`;
const planPath = `${BATCH_13_DEPENDENT_PILOT_CORRECTION_ROOT}/correction-plan.json`;
const analysisPath = `${BATCH_13_DEPENDENT_PILOT_CORRECTION_ROOT}/preparation-analysis.json`;
const activationPath = `${BATCH_13_DEPENDENT_PILOT_CORRECTION_ROOT}/execution-activation.json`;
const executionPath = `${BATCH_13_DEPENDENT_PILOT_CORRECTION_ROOT}/execution.json`;
const executionAnalysisPath = `${BATCH_13_DEPENDENT_PILOT_CORRECTION_ROOT}/analysis.json`;
const [diagnosis, seoPlan, seoActivation] = await Promise.all([
  readJson(diagnosisPath),
  readJson(seoPlanPath),
  readJson(seoActivationPath)
]);
assertV4(
  diagnosis.status === "frozen-batch-13-generated-seo-full-check-dependent-pilot-analysis-staleness-diagnosed" &&
    diagnosis.recoveryBoundary.writablePathsMaximum === 2 &&
    seoActivation.status === "frozen-batch-13-generated-seo-correction-pass-activated" &&
    seoActivation.plan.sha256 === sha256(await readBytes(seoPlanPath)),
  "accepted Batch 13 generated SEO validation-failure diagnosis required"
);
assertV4(!(await exists(seoPlan.outputPaths.execution)) && !(await exists(seoPlan.outputPaths.analysis)), "successful original SEO execution record unexpectedly exists");
for (const record of seoPlan.inventory) {
  const actual = await readBytes(record.path);
  const writable = seoPlan.executionContract.writeOnlyProposedPaths.includes(record.path);
  assertV4(sha256(actual) === (writable ? record.proposedSha256 : record.baselineSha256), `${record.path}: preserved generated output changed`);
}
for (const lock of [
  seoPlan.productionMutation.productionDebates,
  ...seoPlan.productionMutation.productionLedgers,
  seoPlan.productionMutation.references,
  seoPlan.productionMutation.validator,
  seoPlan.generator
]) {
  assertV4(sha256(await readBytes(lock.path)) === lock.sha256, `${lock.path}: protected production state changed`);
}

const baselineOutputs = await Promise.all(BATCH_13_DEPENDENT_PILOT_OUTPUT_PATHS.map(lockFile));
const isolated = await runIsolatedBatch13DependentPilotAnalysis(root);
assertV4(isolated.outputs.length === 2, "isolated pilot analysis must produce exactly two outputs");
for (const output of isolated.outputs) {
  const baseline = baselineOutputs.find((record) => record.path === output.path);
  assertV4(baseline && baseline.sha256 !== output.sha256, `${output.path}: projected correction must differ from stale baseline`);
}
const beforeReport = await readJson("docs/calibration/v2.1/pilot-analysis.json");
const proposedJson = isolated.outputs.find((record) => record.path.endsWith(".json"));
const afterReport = JSON.parse(proposedJson.content.toString("utf8"));
const changes = jsonLeafChanges(beforeReport, afterReport);
assertV4(changes.length > 0, "pilot JSON must have deterministic dependent changes");
const affectedNumbers = new Set(["34"]);
const permittedPrefixes = [
  "/legacyBenchmarkComparison/",
  ...beforeReport.debates
    .map((debate, index) => affectedNumbers.has(debate.debateNumber) ? `/debates/${index}/` : null)
    .filter(Boolean)
];
assertV4(
  changes.every((change) => permittedPrefixes.some((prefix) => change.pointer.startsWith(prefix))),
  "pilot JSON changed outside aggregate legacy comparison and Debate 34 row"
);

const toolPaths = [
  "scripts/lib/assessment-production-post-canary-batch-13-dependent-pilot-analysis-correction.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-13-dependent-pilot-analysis-correction.mjs",
  "scripts/test-assessment-production-post-canary-batch-13-dependent-pilot-analysis-correction-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-13-dependent-pilot-analysis-correction.mjs",
  "scripts/test-assessment-production-post-canary-batch-13-dependent-pilot-analysis-correction-activation.mjs",
  "scripts/run-assessment-production-post-canary-batch-13-dependent-pilot-analysis-correction.mjs"
];
const plan = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-13-dependent-pilot-analysis-correction-plan",
  protocolId: BATCH_13_DEPENDENT_PILOT_CORRECTION_PROTOCOL_ID,
  status: "frozen-batch-13-dependent-pilot-analysis-two-file-correction-plan-prepared",
  frozenAt,
  batchNumber: 13,
  directIncrementalCostCapUsd: 0,
  diagnosis: await lockFile(diagnosisPath),
  consumedSeoPass: {
    plan: await lockFile(seoPlanPath),
    activation: await lockFile(seoActivationPath),
    isolatedGeneratorRuns: 1,
    generatedDerivativeWrites: 12,
    repositoryValidationRuns: 1,
    successfulExecutionRecordWritten: false
  },
  protectedProduction: {
    debates: seoPlan.productionMutation.productionDebates,
    ledgers: seoPlan.productionMutation.productionLedgers,
    references: seoPlan.productionMutation.references,
    validator: seoPlan.productionMutation.validator,
    seoGenerator: seoPlan.generator,
    generatedOutputs: await Promise.all(seoPlan.inventory.map(async (record) => {
      const actual = await lockFile(record.path);
      return { ...actual, role: seoPlan.executionContract.writeOnlyProposedPaths.includes(record.path) ? "accepted-batch-13-derivative" : "preserved-unrelated-derivative" };
    }))
  },
  dependentGenerator: await lockFile("scripts/analyze-v2.1-pilot.mjs"),
  dependentInputs: await Promise.all(isolated.inputPaths.map(lockFile)),
  staleOutputs: baselineOutputs,
  isolatedPreparationPreview: {
    runs: 1,
    temporaryFilesCleaned: true,
    stdoutSha256: sha256(isolated.stdout),
    stderrSha256: sha256(isolated.stderr),
    proposedOutputs: isolated.outputs.map(({ content, ...record }) => record),
    jsonLeafChanges: changes,
    changedJsonLeafCount: changes.length,
    changedProductionScores: 0,
    changedPublicationCandidates: 0,
    changedLedgers: 0
  },
  correctionContract: {
    attemptsMaximum: 1,
    retriesMaximum: 0,
    rerunsMaximum: 0,
    recursiveCorrectionsMaximum: 0,
    dependentGeneratorRuns: 1,
    completeRepositoryValidationRuns: 1,
    productionMutationReruns: 0,
    seoGeneratorWriteRuns: 0,
    scorePasses: 0,
    writablePathsMaximum: 2,
    writablePaths: BATCH_13_DEPENDENT_PILOT_OUTPUT_PATHS,
    preserveOtherPaths: true,
    completeValidationCommand: "npm run check"
  },
  preparationTools: await Promise.all(toolPaths.map(lockFile)),
  authorization: {
    boundedFirstDeterministicRecovery: true,
    correctionPreparation: true,
    correctionExecution: false,
    productionMutationRerun: false,
    seoGeneratorWrite: false,
    scorePass: false,
    modelExecution: false,
    paidServiceUse: false,
    nextBatchSelection: false
  },
  outputPaths: { activation: activationPath, execution: executionPath, analysis: executionAnalysisPath },
  nextAuthorizedAction: "activate-and-execute-one-frozen-batch-13-dependent-pilot-analysis-correction"
};
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-13-dependent-pilot-analysis-correction-preparation-analysis",
  protocolId: BATCH_13_DEPENDENT_PILOT_CORRECTION_PROTOCOL_ID,
  status: "batch-13-dependent-pilot-analysis-correction-plan-freeze-passed",
  analyzedAt: frozenAt,
  plan: { path: planPath, sha256: sha256(serializedJson(plan)) },
  checks: {
    diagnosisAuthenticated: true,
    productionTransactionPreserved: true,
    all380GeneratedOutputsPreserved: true,
    isolatedPreviewPassed: true,
    exactlyTwoProposedOutputs: true,
    jsonChangeBoundaryPassed: true,
    persistentWrites: 0,
    completeRepositoryValidationRuns: 0
  },
  totals: { preparationPreviewRuns: 1, proposedWrites: 2, modelContexts: 0, paidServices: 0, directIncrementalCostUsd: 0 },
  nextAuthorizedAction: plan.nextAuthorizedAction
};
if (shouldWrite) {
  for (const outputPath of [planPath, analysisPath, activationPath, executionPath, executionAnalysisPath]) {
    assertV4(!(await exists(outputPath)), `${outputPath}: correction artifact already exists`);
  }
  await mkdir(resolve(BATCH_13_DEPENDENT_PILOT_CORRECTION_ROOT), { recursive: true });
  await writeFile(resolve(planPath), serializedJson(plan));
  await writeFile(resolve(analysisPath), serializedJson(analysis));
}
console.log(serializedJson({ status: analysis.status, write: shouldWrite, previewRuns: 1, proposedWrites: 2, jsonLeafChanges: changes.length, directIncrementalCostUsd: 0 }));
