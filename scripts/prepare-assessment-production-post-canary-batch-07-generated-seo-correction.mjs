#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
import {
  POST_CANARY_BATCH_07_GENERATED_SEO_CORRECTION_PROTOCOL_ID,
  POST_CANARY_BATCH_07_GENERATED_SEO_CORRECTION_ROOT,
  POST_CANARY_BATCH_07_GENERATED_SEO_OUTPUT_COUNT,
  POST_CANARY_BATCH_07_GENERATOR_INPUT_PATHS,
  generatedInventoryDigest,
  runIsolatedBatch07SeoGenerator
} from "./lib/assessment-production-post-canary-batch-07-generated-seo-correction.mjs";
import {
  POST_CANARY_BATCH_07_PRODUCTION_PUBLICATION_ROOT,
  serializedJson,
  sha256
} from "./lib/assessment-production-post-canary-batch-07-production-publication.mjs";

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

const planPath = `${POST_CANARY_BATCH_07_GENERATED_SEO_CORRECTION_ROOT}/correction-plan.json`;
const preparationAnalysisPath = `${POST_CANARY_BATCH_07_GENERATED_SEO_CORRECTION_ROOT}/preparation-analysis.json`;
const activationPath = `${POST_CANARY_BATCH_07_GENERATED_SEO_CORRECTION_ROOT}/execution-activation.json`;
const executionPath = `${POST_CANARY_BATCH_07_GENERATED_SEO_CORRECTION_ROOT}/execution.json`;
const analysisPath = `${POST_CANARY_BATCH_07_GENERATED_SEO_CORRECTION_ROOT}/analysis.json`;
const existing = (await exists(planPath)) ? await readJson(planPath) : null;
const frozenAt = existing?.frozenAt ?? requestedFrozenAt;
assertV4(typeof frozenAt === "string" && !Number.isNaN(Date.parse(frozenAt)), "stable --frozen-at ISO timestamp required");

const productionPaths = {
  manifest: `${POST_CANARY_BATCH_07_PRODUCTION_PUBLICATION_ROOT}/mutation-manifest.json`,
  activation: `${POST_CANARY_BATCH_07_PRODUCTION_PUBLICATION_ROOT}/execution-activation.json`,
  execution: `${POST_CANARY_BATCH_07_PRODUCTION_PUBLICATION_ROOT}/execution.json`,
  analysis: `${POST_CANARY_BATCH_07_PRODUCTION_PUBLICATION_ROOT}/analysis.json`
};
const [mutationManifest, mutationActivation, mutationExecution, mutationAnalysis] = await Promise.all([
  readJson(productionPaths.manifest),
  readJson(productionPaths.activation),
  readJson(productionPaths.execution),
  readJson(productionPaths.analysis)
]);
assertV4(
  mutationExecution.status === "passed-batch-07-production-publication-mutation-awaiting-generated-derivative-correction" &&
    mutationExecution.totals?.mutationPasses === 1 &&
    mutationExecution.totals?.changedDebateRecords === 10 &&
    mutationExecution.totals?.generatedDerivativeWrites === 0 &&
    mutationAnalysis.status === "batch-07-production-publication-mutation-passed-pending-generated-derivative-correction" &&
    mutationAnalysis.decision?.atomicTransactionCommitPending === true,
  "passed one-time Batch 7 production mutation required"
);
assertV4(
  sha256(await readBytes(mutationManifest.productionBaseline.debates.path)) ===
    mutationExecution.productionDebates.afterSha256,
  "local production mutation changed before SEO comparison"
);
for (const debate of mutationManifest.debates) {
  assertV4(
    sha256(await readBytes(debate.productionLedgerPath)) === debate.stagedLedger.sha256,
    `${debate.debateNumber}: local production ledger changed before SEO comparison`
  );
}

const isolated = await runIsolatedBatch07SeoGenerator(root);
assertV4(isolated.outputs.length === POST_CANARY_BATCH_07_GENERATED_SEO_OUTPUT_COUNT, "isolated generator must produce exactly 380 outputs");
const inventory = [];
for (const proposed of isolated.outputs) {
  const baselineBytes = await readBytes(proposed.path);
  inventory.push({
    path: proposed.path,
    baselineSha256: sha256(baselineBytes),
    baselineBytes: baselineBytes.length,
    proposedSha256: proposed.sha256,
    proposedBytes: proposed.bytes,
    changed: sha256(baselineBytes) !== proposed.sha256
  });
}
const changed = inventory.filter((record) => record.changed);
const expectedChangedPaths = [
  ...mutationManifest.debates.map((debate) => `debate/${debate.debateId}/index.html`),
  "sitemap.xml",
  "src/data/debate-summaries.js"
].sort();
assertV4(
  changed.length === 12 &&
    canonicalJson(changed.map((record) => record.path).sort()) === canonicalJson(expectedChangedPaths),
  "isolated comparison must identify exactly the ten Batch 7 debate pages, sitemap, and debate summaries"
);

const toolPaths = [
  "scripts/lib/assessment-production-post-canary-batch-07-generated-seo-correction.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-07-generated-seo-correction.mjs",
  "scripts/test-assessment-production-post-canary-batch-07-generated-seo-correction-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-07-generated-seo-correction.mjs",
  "scripts/test-assessment-production-post-canary-batch-07-generated-seo-correction-activation.mjs",
  "scripts/run-assessment-production-post-canary-batch-07-generated-seo-correction.mjs"
];
const plan = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-07-generated-seo-correction-plan",
  protocolId: POST_CANARY_BATCH_07_GENERATED_SEO_CORRECTION_PROTOCOL_ID,
  status: "frozen-batch-07-generated-seo-derivative-correction-plan-prepared",
  frozenAt,
  productionCanary: false,
  batchNumber: 7,
  planningOnly: true,
  directIncrementalCostCapUsd: 0,
  productionMutation: {
    manifest: await lockFile(productionPaths.manifest),
    activation: await lockFile(productionPaths.activation),
    execution: await lockFile(productionPaths.execution),
    analysis: await lockFile(productionPaths.analysis),
    productionDebates: await lockFile(mutationManifest.productionBaseline.debates.path),
    productionLedgers: await Promise.all(mutationManifest.debates.map((debate) => lockFile(debate.productionLedgerPath))),
    references: await lockFile(mutationManifest.productionBaseline.references.path),
    validator: await lockFile(mutationManifest.validator.path)
  },
  generator: await lockFile("scripts/generate-seo-pages.mjs"),
  generatorInputs: await Promise.all(POST_CANARY_BATCH_07_GENERATOR_INPUT_PATHS.map(lockFile)),
  preparationTools: await Promise.all(toolPaths.map(lockFile)),
  isolatedPreparationComparison: {
    generatorRuns: 1,
    outputCount: isolated.outputs.length,
    pathSetSha256: isolated.pathSetSha256,
    inventorySha256: generatedInventoryDigest(inventory),
    stdoutSha256: sha256(isolated.stdout),
    stderrSha256: sha256(isolated.stderr),
    temporaryFilesCleaned: true
  },
  inventory,
  proposedWrites: changed,
  executionContract: {
    isolatedGeneratorRuns: 1,
    generatorAttempts: 1,
    repositoryValidationRuns: 1,
    retries: 0,
    reruns: 0,
    automaticRepairs: 0,
    productionMutationReruns: 0,
    rollbacks: 0,
    requiredOutputCount: 380,
    requiredPathSetSha256: isolated.pathSetSha256,
    requiredInventorySha256: generatedInventoryDigest(inventory),
    writeOnlyProposedPaths: expectedChangedPaths,
    preserveOtherGeneratedOutputs: 368,
    completeValidationCommand: "npm run check"
  },
  authorization: {
    correctionPlanPreparation: true,
    correctionActivation: false,
    isolatedGeneratorExecution: false,
    generatedDerivativeWrites: false,
    repositoryValidation: false,
    productionMutationRerun: false,
    rollback: false,
    scorePass: false,
    modelExecution: false,
    paidServices: false,
    nextBatchSelection: false
  },
  outputPaths: { activation: activationPath, execution: executionPath, analysis: analysisPath },
  nextAuthorizedAction: "activate-and-execute-one-frozen-batch-07-generated-seo-correction-pass-under-standing-authorization"
};
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-07-generated-seo-correction-preparation-analysis",
  protocolId: POST_CANARY_BATCH_07_GENERATED_SEO_CORRECTION_PROTOCOL_ID,
  status: "batch-07-generated-seo-correction-plan-freeze-passed",
  analyzedAt: frozenAt,
  plan: { path: planPath, sha256: sha256(serializedJson(plan)) },
  checks: {
    productionMutationAuthenticated: true,
    isolatedGeneratorRunCompleted: true,
    exactOutputCount: 380,
    exactChangedFiles: 12,
    unchangedGeneratedFiles: 368,
    generatedProductionFilesWritten: 0,
    repositoryValidationRuns: 0,
    temporaryFilesCleaned: true
  },
  totals: { isolatedGeneratorRuns: 1, proposedWrites: 12, models: 0, paidServices: 0, directIncrementalCostUsd: 0 },
  nextAuthorizedAction: plan.nextAuthorizedAction
};
if (write) {
  await mkdir(resolve(POST_CANARY_BATCH_07_GENERATED_SEO_CORRECTION_ROOT), { recursive: true });
  await writeFile(resolve(planPath), serializedJson(plan));
  await writeFile(resolve(preparationAnalysisPath), serializedJson(analysis));
}
console.log(serializedJson({ status: analysis.status, write, outputs: inventory.length, changed: changed.length, unchanged: inventory.length - changed.length, inventorySha256: plan.executionContract.requiredInventorySha256 }));
