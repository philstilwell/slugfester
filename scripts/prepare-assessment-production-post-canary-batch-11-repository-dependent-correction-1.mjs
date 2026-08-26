#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import { calculateV2Ledger } from "./lib/reassessment-scoring.mjs";
import {
  BATCH_11_LEGACY_V2_FIXTURE_PATH,
  BATCH_11_PILOT_OUTPUT_PATHS,
  BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_PROTOCOL_ID,
  BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT,
  BATCH_11_REPOSITORY_DEPENDENT_WRITABLE_PATHS,
  BATCH_11_SCORING_TEST_PATH,
  buildBatch11FixtureBackedScoringTest,
  jsonLeafChanges,
  loadBatch11LegacyV2Fixture,
  outputLock,
  runIsolatedBatch11PilotAnalysis,
  runIsolatedBatch11ScoringFixtureTest
} from "./lib/assessment-production-post-canary-batch-11-repository-dependent-correction-1.mjs";
import {
  POST_CANARY_BATCH_11_GENERATED_SEO_CORRECTION_ROOT
} from "./lib/assessment-production-post-canary-batch-11-generated-seo-correction.mjs";
import {
  serializedJson,
  sha256
} from "./lib/assessment-production-post-canary-batch-11-production-publication.mjs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const frozenAtIndex = args.indexOf("--frozen-at");
const requestedFrozenAt = frozenAtIndex >= 0 ? args[frozenAtIndex + 1] : null;
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
const executionPath = `${BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT}/execution.json`;
const analysisPath = `${BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT}/analysis.json`;
const seoPlanPath = `${POST_CANARY_BATCH_11_GENERATED_SEO_CORRECTION_ROOT}/correction-plan.json`;
const seoActivationPath = `${POST_CANARY_BATCH_11_GENERATED_SEO_CORRECTION_ROOT}/execution-activation.json`;
const seoExecutionPath = `${POST_CANARY_BATCH_11_GENERATED_SEO_CORRECTION_ROOT}/execution.json`;
const seoAnalysisPath = `${POST_CANARY_BATCH_11_GENERATED_SEO_CORRECTION_ROOT}/analysis.json`;
const existing = (await exists(planPath)) ? await readJson(planPath) : null;
const frozenAt = existing?.frozenAt ?? requestedFrozenAt;
assertV4(
  typeof frozenAt === "string" && !Number.isNaN(Date.parse(frozenAt)),
  "stable --frozen-at ISO timestamp required"
);
assertV4(
  !(await exists(activationPath)) &&
    !(await exists(executionPath)) &&
    !(await exists(analysisPath)) &&
    !(await exists(seoExecutionPath)) &&
    !(await exists(seoAnalysisPath)),
  "Batch 11 repository-dependent correction already activated or completed"
);

const [seoPlan, seoActivation] = await Promise.all([
  readJson(seoPlanPath),
  readJson(seoActivationPath)
]);
assertV4(
  seoPlan.status ===
      "frozen-batch-11-generated-seo-derivative-correction-plan-prepared" &&
    seoActivation.status ===
      "frozen-batch-11-generated-seo-correction-pass-activated" &&
    seoActivation.plan.sha256 === sha256(await readBytes(seoPlanPath)),
  "spent Batch 11 generated-SEO activation required"
);
for (const record of seoPlan.inventory) {
  const current = await readBytes(record.path);
  const written = seoPlan.executionContract.writeOnlyProposedPaths.includes(
    record.path
  );
  assertV4(
    sha256(current) ===
      (written ? record.proposedSha256 : record.baselineSha256),
    `${record.path}: post-failure generated state changed`
  );
}
for (const lock of [
  seoPlan.productionMutation.productionDebates,
  ...seoPlan.productionMutation.productionLedgers,
  seoPlan.productionMutation.references,
  seoPlan.productionMutation.validator,
  seoPlan.generator
]) {
  assertV4(
    sha256(await readBytes(lock.path)) === lock.sha256,
    `${lock.path}: protected production state changed after SEO failure`
  );
}

const scoringFailure = spawnSync(
  process.execPath,
  [BATCH_11_SCORING_TEST_PATH],
  { cwd: root, encoding: "utf8", maxBuffer: 100 * 1024 * 1024 }
);
assertV4(
  scoringFailure.status !== 0 &&
    `${scoringFailure.stdout}${scoringFailure.stderr}`.includes(
      "sections must not be empty"
    ),
  "expected the legacy-v2 scoring fixture selection failure"
);
const pilotFailure = spawnSync(
  process.execPath,
  ["scripts/analyze-v2.1-pilot.mjs", "--check"],
  { cwd: root, encoding: "utf8", maxBuffer: 100 * 1024 * 1024 }
);
assertV4(
  pilotFailure.status !== 0 &&
    `${pilotFailure.stdout}${pilotFailure.stderr}`.includes(
      "Stale pilot analysis"
    ),
  "expected the Debate 01 dependent pilot-analysis staleness"
);

const mutationManifest = await readJson(
  seoPlan.productionMutation.manifest.path
);
const fixtureBytes = loadBatch11LegacyV2Fixture(
  root,
  mutationManifest.baselineCommit
);
const fixture = JSON.parse(fixtureBytes.toString("utf8"));
assertV4(
  fixture.debateId === "craig-oconnor-god-debate-2026" &&
    Array.isArray(fixture.sections) &&
    fixture.sections.length > 0 &&
    `${JSON.stringify(calculateV2Ledger(fixture), null, 2)}\n` ===
      fixtureBytes.toString("utf8"),
  "recovered legacy-v2 scoring fixture is not exactly reproducible"
);
const scoringTestBytes = await readBytes(BATCH_11_SCORING_TEST_PATH);
const proposedScoringTest = buildBatch11FixtureBackedScoringTest(
  scoringTestBytes.toString("utf8")
);
const scoringPreview = await runIsolatedBatch11ScoringFixtureTest({
  repositoryRoot: root,
  testSource: proposedScoringTest,
  fixtureBytes
});
assertV4(
  scoringPreview.status === 0,
  `isolated fixture-backed scoring test failed: ${scoringPreview.stderr || scoringPreview.stdout}`
);

const baselinePilotOutputs = await Promise.all(
  BATCH_11_PILOT_OUTPUT_PATHS.map(lockFile)
);
const pilotPreview = await runIsolatedBatch11PilotAnalysis(root);
for (const output of pilotPreview.outputs) {
  const baseline = baselinePilotOutputs.find(
    (record) => record.path === output.path
  );
  assertV4(
    baseline && baseline.sha256 !== output.sha256,
    `${output.path}: proposed pilot correction must differ from stale baseline`
  );
}
const beforePilot = await readJson(BATCH_11_PILOT_OUTPUT_PATHS[0]);
const proposedPilotJson = pilotPreview.outputs.find((output) =>
  output.path.endsWith(".json")
);
const afterPilot = JSON.parse(proposedPilotJson.content.toString("utf8"));
const pilotLeafChanges = jsonLeafChanges(beforePilot, afterPilot);
const debate01Prefixes = [
  "/legacyBenchmarkComparison/",
  ...beforePilot.debates
    .map((debate, index) =>
      debate.debateNumber === "01" ? `/debates/${index}/` : null
    )
    .filter(Boolean)
];
assertV4(
  pilotLeafChanges.length > 0 &&
    pilotLeafChanges.every((change) =>
      debate01Prefixes.some((prefix) => change.pointer.startsWith(prefix))
    ),
  "pilot correction changed outside Debate 01 and aggregate comparison"
);

const toolPaths = [
  "scripts/lib/assessment-production-post-canary-batch-11-repository-dependent-correction-1.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-11-repository-dependent-correction-1.mjs",
  "scripts/test-assessment-production-post-canary-batch-11-repository-dependent-correction-1-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-11-repository-dependent-correction-1.mjs",
  "scripts/test-assessment-production-post-canary-batch-11-repository-dependent-correction-1-activation.mjs",
  "scripts/run-assessment-production-post-canary-batch-11-repository-dependent-correction-1.mjs"
];
const proposedOutputs = [
  {
    path: BATCH_11_LEGACY_V2_FIXTURE_PATH,
    sha256: sha256(fixtureBytes),
    bytes: fixtureBytes.length,
    role: "stable-legacy-v2-test-fixture"
  },
  {
    path: BATCH_11_SCORING_TEST_PATH,
    sha256: sha256(proposedScoringTest),
    bytes: Buffer.byteLength(proposedScoringTest),
    role: "fixture-backed-test-route"
  },
  ...pilotPreview.outputs.map((output) => ({
    ...outputLock(output),
    role: "deterministic-pilot-analysis"
  }))
];
const plan = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-11-repository-dependent-correction-1-plan",
  protocolId: BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_PROTOCOL_ID,
  status: "frozen-batch-11-four-file-repository-dependent-correction-prepared",
  frozenAt,
  batchNumber: 11,
  directIncrementalCostCapUsd: 0,
  failureDiagnosis: {
    consumedSeoActivation: await lockFile(seoActivationPath),
    isolatedSeoGeneratorRunsConsumed: 1,
    generatedDerivativeWritesCompleted: 12,
    repositoryValidationRunsConsumed: 1,
    scoringTestFailure: "production ledger no longer supplies a legacy-v2 fixture",
    pilotAnalysisFailure: "Debate 01 calibration-dependent outputs are stale",
    productionOrScoreDefect: false,
    generatedSeoDefect: false,
    omittedDeterministicDependencies: true
  },
  preservedState: {
    seoPlan: await lockFile(seoPlanPath),
    productionDebates: seoPlan.productionMutation.productionDebates,
    productionLedgers: seoPlan.productionMutation.productionLedgers,
    references: seoPlan.productionMutation.references,
    validator: seoPlan.productionMutation.validator,
    generator: seoPlan.generator,
    generatedOutputs: await Promise.all(
      seoPlan.inventory.map(async (record) => ({
        ...(await lockFile(record.path)),
        role: seoPlan.executionContract.writeOnlyProposedPaths.includes(
          record.path
        )
          ? "accepted-batch-11-derivative"
          : "preserved-unrelated-derivative"
      }))
    )
  },
  baselines: {
    scoringTest: {
      path: BATCH_11_SCORING_TEST_PATH,
      sha256: sha256(scoringTestBytes),
      bytes: scoringTestBytes.length
    },
    pilotOutputs: baselinePilotOutputs,
    fixtureSourceRevision: mutationManifest.baselineCommit,
    fixtureSourcePath:
      "docs/assessment-ledgers/craig-oconnor-god-debate-2026.json"
  },
  isolatedPreparationPreview: {
    scoringTestRuns: 1,
    scoringTestExitCode: scoringPreview.status,
    scoringTestStdoutSha256: sha256(scoringPreview.stdout),
    scoringTestStderrSha256: sha256(scoringPreview.stderr),
    pilotGeneratorRuns: 1,
    pilotStdoutSha256: sha256(pilotPreview.stdout),
    pilotStderrSha256: sha256(pilotPreview.stderr),
    pilotJsonLeafChanges: pilotLeafChanges,
    temporaryFilesCleaned: true,
    proposedOutputs
  },
  correctionContract: {
    attemptsMaximum: 1,
    retriesMaximum: 0,
    rerunsMaximum: 0,
    recursiveCorrectionsMaximum: 0,
    completeRepositoryValidationRuns: 1,
    productionMutationReruns: 0,
    seoGeneratorWriteRuns: 0,
    scorePasses: 0,
    writablePathsMaximum: 4,
    writablePaths: BATCH_11_REPOSITORY_DEPENDENT_WRITABLE_PATHS,
    preserveOtherPaths: true,
    completeValidationCommand: "npm run check"
  },
  preparationTools: await Promise.all(toolPaths.map(lockFile)),
  authorization: {
    boundedDeterministicRecovery: true,
    correctionPreparation: true,
    correctionExecution: false,
    productionMutationRerun: false,
    seoGeneratorWrite: false,
    scorePass: false,
    modelExecution: false,
    paidServiceUse: false,
    nextBatchSelection: false
  },
  outputPaths: {
    activation: activationPath,
    execution: executionPath,
    analysis: analysisPath,
    seoExecution: seoExecutionPath,
    seoAnalysis: seoAnalysisPath
  },
  nextAuthorizedAction:
    "activate-and-execute-one-batch-11-four-file-repository-dependent-correction"
};
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-11-repository-dependent-correction-1-preparation-analysis",
  protocolId: BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_PROTOCOL_ID,
  status: "batch-11-repository-dependent-correction-plan-freeze-passed",
  analyzedAt: frozenAt,
  plan: { path: planPath, sha256: sha256(serializedJson(plan)) },
  checks: {
    spentSeoPassAuthenticated: true,
    all380GeneratedOutputsPreserved: true,
    scoringFixturePreviewPassed: true,
    pilotAnalysisPreviewPassed: true,
    exactlyFourProposedOutputs: true,
    productionMutationReruns: 0,
    seoGeneratorWriteRuns: 0,
    persistentWrites: 0,
    completeRepositoryValidationRuns: 0
  },
  totals: {
    preparationPreviewRuns: 2,
    proposedWrites: 4,
    modelContexts: 0,
    paidServices: 0,
    directIncrementalCostUsd: 0
  },
  nextAuthorizedAction: plan.nextAuthorizedAction
};

if (write) {
  await mkdir(resolve(BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT), {
    recursive: true
  });
  await writeFile(resolve(planPath), serializedJson(plan));
  await writeFile(resolve(preparationAnalysisPath), serializedJson(analysis));
}
console.log(
  serializedJson({
    status: analysis.status,
    write,
    proposedWrites: 4,
    scoringFixturePreviewPassed: true,
    pilotAnalysisPreviewPassed: true,
    directIncrementalCostUsd: 0
  })
);
