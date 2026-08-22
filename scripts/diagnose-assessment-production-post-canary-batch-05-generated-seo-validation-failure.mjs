#!/usr/bin/env node

import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  POST_CANARY_BATCH_05_GENERATED_SEO_CORRECTION_ROOT
} from "./lib/assessment-production-post-canary-batch-05-generated-seo-correction.mjs";
import {
  serializedJson,
  sha256
} from "./lib/assessment-production-post-canary-batch-05-production-publication.mjs";

const shouldWrite = process.argv.includes("--write");
const diagnosedAtIndex = process.argv.indexOf("--diagnosed-at");
const diagnosedAt = diagnosedAtIndex >= 0 ? process.argv[diagnosedAtIndex + 1] : null;
assertV4(
  typeof diagnosedAt === "string" && !Number.isNaN(Date.parse(diagnosedAt)),
  "stable --diagnosed-at ISO timestamp required"
);

const root = process.cwd();
const resolve = (relativePath) => path.resolve(root, relativePath);
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readJson = (relativePath) => readFile(resolve(relativePath), "utf8").then(JSON.parse);
const exists = (relativePath) => access(resolve(relativePath)).then(() => true, () => false);
const lockFile = async (relativePath) => {
  const bytes = await readBytes(relativePath);
  return { path: relativePath, sha256: sha256(bytes), bytes: bytes.length };
};

const planPath = `${POST_CANARY_BATCH_05_GENERATED_SEO_CORRECTION_ROOT}/correction-plan.json`;
const activationPath = `${POST_CANARY_BATCH_05_GENERATED_SEO_CORRECTION_ROOT}/execution-activation.json`;
const diagnosisPath = `${POST_CANARY_BATCH_05_GENERATED_SEO_CORRECTION_ROOT}/validation-failure-diagnosis.json`;
const [plan, activation] = await Promise.all([readJson(planPath), readJson(activationPath)]);
assertV4(
  plan.status === "frozen-batch-05-generated-seo-derivative-correction-plan-prepared" &&
    activation.status === "frozen-batch-05-generated-seo-correction-pass-activated" &&
    activation.plan.sha256 === sha256(await readBytes(planPath)),
  "spent Batch 5 generated SEO activation required"
);
assertV4(!(await exists(plan.outputPaths.execution)), "successful execution record unexpectedly exists");
assertV4(!(await exists(plan.outputPaths.analysis)), "successful analysis record unexpectedly exists");

for (const record of plan.inventory) {
  const actual = await readBytes(record.path);
  const writable = plan.executionContract.writeOnlyProposedPaths.includes(record.path);
  const expected = writable ? record.proposedSha256 : record.baselineSha256;
  assertV4(sha256(actual) === expected, `${record.path}: preserved post-failure generated hash mismatch`);
}
for (const lock of [
  plan.productionMutation.productionDebates,
  ...plan.productionMutation.productionLedgers,
  plan.productionMutation.references,
  plan.productionMutation.validator,
  plan.generator
]) {
  assertV4(sha256(await readBytes(lock.path)) === lock.sha256, `${lock.path}: protected input changed`);
}

const mutationManifest = await readJson(plan.productionMutation.manifest.path);
const calibrationLedgerDirectory = "docs/calibration/v2.1/ledgers";
const calibrationLedgerPaths = (await readdir(resolve(calibrationLedgerDirectory)))
  .filter((name) => name.endsWith(".json"))
  .map((name) => `${calibrationLedgerDirectory}/${name}`)
  .sort();
const calibrationLedgers = await Promise.all(calibrationLedgerPaths.map(readJson));
const batchDebateIds = new Set(mutationManifest.debates.map((debate) => debate.debateId));
const affectedCalibrationDebates = calibrationLedgers
  .filter((ledger) => batchDebateIds.has(ledger.debateId))
  .map((ledger) => ({ debateNumber: ledger.debateNumber, debateId: ledger.debateId }))
  .sort((a, b) => Number(a.debateNumber) - Number(b.debateNumber));
assertV4(
  affectedCalibrationDebates.length === 2 &&
    affectedCalibrationDebates[0].debateNumber === "05" &&
    affectedCalibrationDebates[1].debateNumber === "189",
  "expected exactly Batch 5 Debates 05 and 189 to feed the legacy pilot analysis"
);

const dependentInputPaths = [
  "scripts/analyze-v2.1-pilot.mjs",
  "scripts/lib/reassessment-scoring.mjs",
  "docs/calibration/v2.1/pilot-manifest.json",
  ...calibrationLedgerPaths
];
const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-generated-seo-validation-failure-diagnosis",
  protocolId: "assessment-production-post-canary-batch-05-generated-seo-dependent-pilot-analysis-recovery",
  status: "frozen-batch-05-generated-seo-full-check-dependent-pilot-analysis-staleness-diagnosed",
  diagnosedAt,
  batchNumber: 4,
  directIncrementalCostUsd: 0,
  failedExecution: {
    command: "node scripts/run-assessment-production-post-canary-batch-05-generated-seo-correction.mjs",
    activation: await lockFile(activationPath),
    successfulExecutionRecordWritten: false,
    successfulAnalysisRecordWritten: false,
    isolatedGeneratorRunsConsumed: 1,
    generatedDerivativeWritesCompleted: 12,
    unchangedGeneratedOutputsVerified: 368,
    repositoryValidationRunsConsumed: 1,
    errorCategory: "deterministic-dependent-output-staleness",
    errorMessage: "complete repository validation failed: Stale pilot analysis: docs/calibration/v2.1/pilot-analysis.json, docs/calibration/v2.1/pilot-analysis.md"
  },
  preservedAcceptedState: {
    productionDebates: plan.productionMutation.productionDebates,
    productionLedgers: plan.productionMutation.productionLedgers,
    references: plan.productionMutation.references,
    validator: plan.productionMutation.validator,
    generator: plan.generator,
    generatedWrites: await Promise.all(plan.executionContract.writeOnlyProposedPaths.map(lockFile)),
    otherGeneratedOutputsPreserved: 368
  },
  rootCause: {
    finding: "The complete repository check recomputes the legacy v2.1 pilot report from current production debate scores. Batch 5 replaces two debates sampled by that report, so its two checked-in deterministic outputs became stale even though the frozen SEO output inventory passed.",
    affectedCalibrationDebates,
    dependentGenerator: await lockFile("scripts/analyze-v2.1-pilot.mjs"),
    staleOutputs: [
      await lockFile("docs/calibration/v2.1/pilot-analysis.json"),
      await lockFile("docs/calibration/v2.1/pilot-analysis.md")
    ],
    dependentInputs: await Promise.all(dependentInputPaths.map(lockFile)),
    productionOrScoreDefect: false,
    generatedSeoDefect: false,
    omittedDeterministicDependency: true
  },
  recoveryBoundary: {
    correctionType: "bounded-deterministic-dependent-output-correction",
    writablePathsMaximum: 2,
    writablePaths: [
      "docs/calibration/v2.1/pilot-analysis.json",
      "docs/calibration/v2.1/pilot-analysis.md"
    ],
    preserveCompletedProductionMutation: true,
    preserveTwelveAcceptedGeneratedDerivatives: true,
    rerunProductionMutation: false,
    rerunSeoGenerator: false,
    scorePass: false,
    modelExecution: false,
    paidServiceUse: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "prepare-and-freeze-one-bounded-batch-05-dependent-pilot-analysis-correction"
};

if (shouldWrite) {
  assertV4(!(await exists(diagnosisPath)), "failure diagnosis already exists");
  await mkdir(resolve(POST_CANARY_BATCH_05_GENERATED_SEO_CORRECTION_ROOT), { recursive: true });
  await writeFile(resolve(diagnosisPath), serializedJson(diagnosis));
}
console.log(serializedJson({
  status: diagnosis.status,
  write: shouldWrite,
  affectedCalibrationDebates,
  generatedWritesPreserved: 12,
  correctionWritablePathsMaximum: 2,
  directIncrementalCostUsd: 0
}));
