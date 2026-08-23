#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  POST_CANARY_BATCH_06_PRODUCTION_PUBLICATION_PROTOCOL_ID,
  POST_CANARY_BATCH_06_PRODUCTION_PUBLICATION_ROOT,
  buildProductionDebatesSource,
  extractProductionDebateRecords,
  inventoryDigest,
  serializedJson,
  sha256
} from "./lib/assessment-production-post-canary-batch-06-production-publication.mjs";

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

const manifestPath = `${POST_CANARY_BATCH_06_PRODUCTION_PUBLICATION_ROOT}/mutation-manifest.json`;
const preparationAnalysisPath = `${POST_CANARY_BATCH_06_PRODUCTION_PUBLICATION_ROOT}/preparation-analysis.json`;
const activationPath = `${POST_CANARY_BATCH_06_PRODUCTION_PUBLICATION_ROOT}/execution-activation.json`;
const executionPath = `${POST_CANARY_BATCH_06_PRODUCTION_PUBLICATION_ROOT}/execution.json`;
const analysisPath = `${POST_CANARY_BATCH_06_PRODUCTION_PUBLICATION_ROOT}/analysis.json`;
const existing = (await exists(activationPath)) ? await readJson(activationPath) : null;
const activatedAt = existing?.activatedAt ?? requestedActivatedAt;
assertV4(typeof activatedAt === "string" && !Number.isNaN(Date.parse(activatedAt)), "stable --activated-at ISO timestamp required");

const [manifest, preparationAnalysis] = await Promise.all([
  readJson(manifestPath),
  readJson(preparationAnalysisPath)
]);
assertV4(
  manifest.status === "frozen-batch-06-production-publication-mutation-manifest-prepared" &&
    manifest.protocolId === POST_CANARY_BATCH_06_PRODUCTION_PUBLICATION_PROTOCOL_ID &&
    manifest.debates?.length === 10 &&
    manifest.executionContract?.mutationPasses === 1 &&
    manifest.executionContract?.retriesMaximum === 0 &&
    manifest.executionContract?.rerunsMaximum === 0,
  "frozen Batch 6 production publication manifest required"
);
assertV4(
  preparationAnalysis.status === "batch-06-production-publication-mutation-manifest-freeze-passed" &&
    preparationAnalysis.manifest.sha256 === sha256(serializedJson(manifest)),
  "accepted Batch 6 production publication preparation required"
);

for (const lock of [
  manifest.validator,
  manifest.productionBaseline.references,
  manifest.compatibilityAcceptance.analysis,
  manifest.compatibilityAcceptance.execution,
  manifest.compatibilityAcceptance.activation,
  manifest.compatibilityAcceptance.preparation,
  manifest.scorePolicy.promotion,
  manifest.scorePolicy.activeControl,
  manifest.scorePolicy.activeControlTest,
  manifest.standingAuthorization,
  ...manifest.preparationTools
]) {
  assertV4(sha256(await readBytes(lock.path)) === lock.sha256, `${lock.path}: frozen source changed`);
}
const productionBytes = await readBytes(manifest.productionBaseline.debates.path);
assertV4(sha256(productionBytes) === manifest.productionBaseline.debates.sha256, "production debates baseline changed");
assertV4(
  inventoryDigest(manifest.productionBaseline.existingProductionLedgers.files) ===
    manifest.productionBaseline.existingProductionLedgers.inventorySha256,
  "frozen production ledger inventory record changed"
);
for (const lock of manifest.productionBaseline.existingProductionLedgers.files) {
  assertV4(
    sha256(await readBytes(lock.path)) === lock.sha256,
    `${lock.path}: existing production ledger changed`
  );
}

const replacements = [];
for (const debate of manifest.debates) {
  assertV4(!(await exists(debate.productionLedgerPath)), `${debate.debateNumber}: production ledger no longer absent`);
  const candidateBytes = await readBytes(debate.candidate.path);
  const stagedLedgerBytes = await readBytes(debate.stagedLedger.path);
  assertV4(sha256(candidateBytes) === debate.candidate.sha256, `${debate.debateNumber}: candidate changed`);
  assertV4(sha256(stagedLedgerBytes) === debate.stagedLedger.sha256, `${debate.debateNumber}: staged ledger changed`);
  replacements.push({ ...debate, candidate: JSON.parse(candidateBytes) });
}
const proposedSource = buildProductionDebatesSource({
  baselineSource: productionBytes.toString("utf8"),
  replacements
});
const proposedRecords = extractProductionDebateRecords(proposedSource);
const baselineRecords = extractProductionDebateRecords(productionBytes.toString("utf8"));
assertV4(proposedRecords.length === baselineRecords.length, "proposed production debate count changed");
const changedNumbers = proposedRecords
  .filter((record, index) => record.text !== baselineRecords[index].text)
  .map((record) => record.number);
assertV4(
  changedNumbers.length === 10 &&
    changedNumbers.every((number) => manifest.explicitOrder.includes(number)) &&
    manifest.explicitOrder.every((number) => changedNumbers.includes(number)),
  "proposed production source changes outside Batch 6"
);

const executionTools = await Promise.all([
  "scripts/lib/assessment-production-post-canary-batch-06-production-publication.mjs",
  "scripts/run-assessment-production-post-canary-batch-06-production-publication.mjs",
  "scripts/test-assessment-production-post-canary-batch-06-production-publication-activation.mjs",
  "scripts/validate-debates.mjs",
  "scripts/test-assessment-production-score-stability-policy-active.mjs"
].map(lockFile));
const activation = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-06-production-publication-execution-activation",
  protocolId: POST_CANARY_BATCH_06_PRODUCTION_PUBLICATION_PROTOCOL_ID,
  status: "frozen-batch-06-production-publication-mutation-pass-activated",
  activatedAt,
  productionCanary: false,
  batchNumber: 6,
  directIncrementalCostCapUsd: 0,
  manifest: await lockFile(manifestPath),
  preparationAnalysis: await lockFile(preparationAnalysisPath),
  executionTools,
  frozenOutput: {
    productionDebatesPath: manifest.productionBaseline.debates.path,
    proposedSha256: sha256(proposedSource),
    proposedBytes: Buffer.byteLength(proposedSource),
    changedDebateNumbers: [...manifest.explicitOrder],
    productionLedgerOutputs: manifest.debates.map((debate) => ({
      debateNumber: debate.debateNumber,
      path: debate.productionLedgerPath,
      sourcePath: debate.stagedLedger.path,
      sha256: debate.stagedLedger.sha256,
      bytes: debate.stagedLedger.bytes
    })),
    referencesSha256: manifest.productionBaseline.references.sha256
  },
  executionDiscipline: {
    attempts: 1,
    retries: 0,
    reruns: 0,
    automaticRepairs: 0,
    rollbacks: 0,
    scorePasses: 0,
    models: 0,
    paidServices: 0,
    generatedDerivativeWrites: 0,
    stopAfterEvidenceFreeze: true
  },
  outputPaths: { execution: executionPath, analysis: analysisPath },
  authorization: {
    executionActivation: true,
    productionLedgerPublication: true,
    productionMutation: true,
    validatorRewrite: false,
    candidateRewrite: false,
    stagedLedgerRewrite: false,
    compatibilityEvidenceRewrite: false,
    referenceRewrite: false,
    generatedDerivativeMutation: false,
    modelExecution: false,
    paidServices: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "execute-one-frozen-batch-06-production-publication-mutation-pass-no-reruns"
};
if (write) {
  await mkdir(resolve(POST_CANARY_BATCH_06_PRODUCTION_PUBLICATION_ROOT), { recursive: true });
  await writeFile(resolve(activationPath), serializedJson(activation));
}
console.log(serializedJson({ status: activation.status, write, proposedDebatesSha256: activation.frozenOutput.proposedSha256, productionLedgerOutputs: 10 }));
