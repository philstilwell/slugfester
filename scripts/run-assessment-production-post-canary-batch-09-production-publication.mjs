#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
import {
  POST_CANARY_BATCH_09_PRODUCTION_PUBLICATION_PROTOCOL_ID,
  POST_CANARY_BATCH_09_PRODUCTION_PUBLICATION_ROOT,
  buildProductionDebatesSource,
  extractProductionDebateRecords,
  inventoryDigest,
  serializedJson,
  sha256
} from "./lib/assessment-production-post-canary-batch-09-production-publication.mjs";

const root = process.cwd();
const resolve = (relativePath) => path.resolve(root, relativePath);
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readJson = (relativePath) => readFile(resolve(relativePath), "utf8").then(JSON.parse);
const lockFile = async (relativePath) => {
  const bytes = await readBytes(relativePath);
  return { path: relativePath, sha256: sha256(bytes), bytes: bytes.length };
};
const manifestPath = `${POST_CANARY_BATCH_09_PRODUCTION_PUBLICATION_ROOT}/mutation-manifest.json`;
const activationPath = `${POST_CANARY_BATCH_09_PRODUCTION_PUBLICATION_ROOT}/execution-activation.json`;
const executionPath = `${POST_CANARY_BATCH_09_PRODUCTION_PUBLICATION_ROOT}/execution.json`;
const analysisPath = `${POST_CANARY_BATCH_09_PRODUCTION_PUBLICATION_ROOT}/analysis.json`;
const startedAt = new Date().toISOString();
const [manifest, activation] = await Promise.all([readJson(manifestPath), readJson(activationPath)]);

assertV4(
  manifest.protocolId === POST_CANARY_BATCH_09_PRODUCTION_PUBLICATION_PROTOCOL_ID &&
    activation.status === "frozen-batch-09-production-publication-mutation-pass-activated" &&
    activation.executionDiscipline.attempts === 1 &&
    activation.executionDiscipline.retries === 0 &&
    activation.executionDiscipline.reruns === 0,
  "frozen Batch 9 production publication activation required"
);
assertV4(sha256(await readBytes(manifestPath)) === activation.manifest.sha256, "mutation manifest changed after activation");
for (const lock of activation.executionTools) {
  assertV4(sha256(await readBytes(lock.path)) === lock.sha256, `${lock.path}: execution tool changed after activation`);
}
for (const lock of [manifest.validator, manifest.productionBaseline.references, manifest.compatibilityAcceptance.analysis, manifest.compatibilityAcceptance.execution]) {
  assertV4(sha256(await readBytes(lock.path)) === lock.sha256, `${lock.path}: protected input changed`);
}
const baselineBytes = await readBytes(manifest.productionBaseline.debates.path);
assertV4(sha256(baselineBytes) === manifest.productionBaseline.debates.sha256, "production debates baseline changed");
for (const lock of manifest.productionBaseline.existingProductionLedgers.files) {
  assertV4(sha256(await readBytes(lock.path)) === lock.sha256, `${lock.path}: existing production ledger changed`);
}
assertV4(
  inventoryDigest(manifest.productionBaseline.existingProductionLedgers.files) === manifest.productionBaseline.existingProductionLedgers.inventorySha256,
  "production ledger baseline inventory changed"
);

const replacements = [];
const stagedBytesByNumber = new Map();
for (const debate of manifest.debates) {
  const candidateBytes = await readBytes(debate.candidate.path);
  const stagedBytes = await readBytes(debate.stagedLedger.path);
  assertV4(sha256(candidateBytes) === debate.candidate.sha256, `${debate.debateNumber}: candidate changed`);
  assertV4(sha256(stagedBytes) === debate.stagedLedger.sha256, `${debate.debateNumber}: staged ledger changed`);
  replacements.push({ ...debate, candidate: JSON.parse(candidateBytes) });
  stagedBytesByNumber.set(debate.debateNumber, stagedBytes);
}
const proposedSource = buildProductionDebatesSource({ baselineSource: baselineBytes.toString("utf8"), replacements });
assertV4(sha256(proposedSource) === activation.frozenOutput.proposedSha256, "proposed production source differs from activation");

for (const debate of manifest.debates) {
  await mkdir(path.dirname(resolve(debate.productionLedgerPath)), { recursive: true });
  await writeFile(resolve(debate.productionLedgerPath), stagedBytesByNumber.get(debate.debateNumber));
}
await writeFile(resolve(manifest.productionBaseline.debates.path), proposedSource);

const writtenBytes = await readBytes(manifest.productionBaseline.debates.path);
assertV4(sha256(writtenBytes) === activation.frozenOutput.proposedSha256, "written production debate source differs from activation");
const writtenRecords = extractProductionDebateRecords(writtenBytes.toString("utf8"));
const baselineRecords = extractProductionDebateRecords(baselineBytes.toString("utf8"));
assertV4(writtenRecords.length === 195, "production debate count changed");
const batchNumbers = new Set(manifest.explicitOrder);
let changedRecords = 0;
for (let index = 0; index < writtenRecords.length; index += 1) {
  const writtenRecord = writtenRecords[index];
  const baselineRecord = baselineRecords[index];
  if (batchNumbers.has(writtenRecord.number)) {
    changedRecords += 1;
    const candidate = replacements.find((entry) => entry.debateNumber === writtenRecord.number).candidate;
    assertV4(canonicalJson(JSON.parse(writtenRecord.text)) === canonicalJson(candidate), `${writtenRecord.number}: production candidate differs`);
  } else {
    assertV4(writtenRecord.text === baselineRecord.text, `${writtenRecord.number}: unrelated production record changed`);
  }
}
assertV4(changedRecords === 10, "exactly ten production records must change");
for (const debate of manifest.debates) {
  const published = await readBytes(debate.productionLedgerPath);
  assertV4(sha256(published) === debate.stagedLedger.sha256, `${debate.debateNumber}: published ledger differs from staged ledger`);
}
assertV4(sha256(await readBytes(manifest.productionBaseline.references.path)) === activation.frozenOutput.referencesSha256, "references changed during production mutation");

const validatorRun = spawnSync(process.execPath, ["scripts/validate-debates.mjs"], { cwd: root, encoding: "utf8" });
assertV4(validatorRun.status === 0, `production route validation failed: ${validatorRun.stderr || validatorRun.stdout}`);
const scorePolicyRun = spawnSync(process.execPath, ["scripts/test-assessment-production-score-stability-policy-active.mjs"], { cwd: root, encoding: "utf8" });
assertV4(scorePolicyRun.status === 0, `active score-policy validation failed: ${scorePolicyRun.stderr || scorePolicyRun.stdout}`);

const completedAt = new Date().toISOString();
const publishedLedgers = await Promise.all(manifest.debates.map(async (debate) => ({
  debateNumber: debate.debateNumber,
  debateId: debate.debateId,
  ...(await lockFile(debate.productionLedgerPath)),
  byteIdenticalToStagedLedger: true
})));
const execution = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-09-production-publication-execution",
  protocolId: POST_CANARY_BATCH_09_PRODUCTION_PUBLICATION_PROTOCOL_ID,
  status: "passed-batch-09-production-publication-mutation-awaiting-generated-derivative-correction",
  startedAt,
  completedAt,
  activation: await lockFile(activationPath),
  productionDebates: {
    path: manifest.productionBaseline.debates.path,
    beforeSha256: manifest.productionBaseline.debates.sha256,
    afterSha256: sha256(writtenBytes),
    afterBytes: writtenBytes.length,
    debateCount: writtenRecords.length,
    changedRecords
  },
  productionLedgers: publishedLedgers,
  protected: {
    referencesByteIdentical: true,
    validatorByteIdentical: sha256(await readBytes(manifest.validator.path)) === manifest.validator.sha256,
    candidatesByteIdentical: true,
    stagedLedgersByteIdentical: true,
    compatibilityEvidenceByteIdentical: true,
    unrelatedProductionRecordsByteIdentical: 185,
    preexistingProductionLedgersByteIdentical: 91
  },
  validation: {
    routeAndScoreCommand: "node scripts/validate-debates.mjs",
    routeAndScoreExitCode: validatorRun.status,
    routeAndScoreStdoutSha256: sha256(validatorRun.stdout),
    activeScorePolicyCommand: "node scripts/test-assessment-production-score-stability-policy-active.mjs",
    activeScorePolicyExitCode: scorePolicyRun.status,
    completeRepositoryValidationDeferredToGeneratedDerivativePass: true
  },
  totals: {
    mutationPasses: 1,
    productionDebatesFiles: 1,
    productionLedgerFiles: 10,
    changedDebateRecords: 10,
    scorePasses: 0,
    modelContexts: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0,
    retries: 0,
    reruns: 0,
    automaticRepairs: 0,
    rollbacks: 0,
    generatedDerivativeWrites: 0
  },
  nextAuthorizedAction: "prepare-isolated-batch-09-generated-seo-derivative-correction-under-standing-authorization"
};
await writeFile(resolve(executionPath), serializedJson(execution));
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-09-production-publication-analysis",
  protocolId: POST_CANARY_BATCH_09_PRODUCTION_PUBLICATION_PROTOCOL_ID,
  status: "batch-09-production-publication-mutation-passed-pending-generated-derivative-correction",
  analyzedAt: completedAt,
  execution: await lockFile(executionPath),
  decision: {
    exactMutationAuthenticated: true,
    tenRecordsReplaced: true,
    tenLedgersPublishedByteForByte: true,
    unrelatedProductionPreserved: true,
    referencesPreserved: true,
    routeAndScoreValidationPassed: true,
    activeScorePolicyPassed: true,
    generatedDerivativesKnownStaleAndNotYetWritten: true,
    completeRepositoryValidationPending: true,
    atomicTransactionCommitPending: true
  },
  totals: execution.totals,
  authorization: {
    isolatedGeneratedDerivativePlanPreparation: true,
    additionalProductionMutation: false,
    scorePass: false,
    modelExecution: false,
    paidServices: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: execution.nextAuthorizedAction
};
await writeFile(resolve(analysisPath), serializedJson(analysis));
console.log(serializedJson({ status: execution.status, debatesPublished: 10, ledgersPublished: 10, changedRecords, routeValidationPassed: true, directIncrementalCostUsd: 0 }));
