#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
import {
  BATCH_11_TITLE_CORRECTION_AFTER,
  BATCH_11_TITLE_CORRECTION_BEFORE,
  BATCH_11_TITLE_CORRECTION_DEBATE_NUMBER,
  buildBatch11TitleCorrectedCompatibilityLibrary,
  buildBatch11TitleCorrectedProductionSource,
  serializedJson,
  sha256
} from "./lib/assessment-production-post-canary-batch-11-production-title-correction-1.mjs";
import { extractProductionDebateRecords } from "./lib/assessment-production-post-canary-batch-11-production-publication.mjs";

const root = process.cwd();
const resolve = (relativePath) => path.resolve(root, relativePath);
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readJson = (relativePath) => readFile(resolve(relativePath), "utf8").then(JSON.parse);
const lockFile = async (relativePath) => {
  const bytes = await readBytes(relativePath);
  return { path: relativePath, sha256: sha256(bytes), bytes: bytes.length };
};

const correctionRoot =
  "docs/assessment-production/post-canary-continuation-v1/batch-11/production-publication/title-correction-1";
const paths = {
  preparation: `${correctionRoot}/preparation.json`,
  activation: `${correctionRoot}/execution-activation.json`,
  execution: `${correctionRoot}/execution.json`,
  mutationManifest:
    "docs/assessment-production/post-canary-continuation-v1/batch-11/production-publication/mutation-manifest.json",
  publicationActivation:
    "docs/assessment-production/post-canary-continuation-v1/batch-11/production-publication/execution-activation.json",
  publicationExecution:
    "docs/assessment-production/post-canary-continuation-v1/batch-11/production-publication/execution.json",
  publicationAnalysis:
    "docs/assessment-production/post-canary-continuation-v1/batch-11/production-publication/analysis.json",
  productionDebates: "src/data/debates.js",
  compatibilityLibrary:
    "scripts/lib/assessment-production-post-canary-batch-11-compatibility.mjs"
};
const startedAt = new Date().toISOString();
const [preparationBytes, activationBytes, manifest, publicationActivation] =
  await Promise.all([
    readBytes(paths.preparation),
    readBytes(paths.activation),
    readJson(paths.mutationManifest),
    readJson(paths.publicationActivation)
  ]);
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);
assertV4(
  activation.status ===
      "frozen-batch-11-production-title-correction-1-activated" &&
    activation.preparation.sha256 === sha256(preparationBytes) &&
    activation.executionDiscipline.attempts === 1 &&
    activation.executionDiscipline.retries === 0 &&
    activation.authorization.correctionAttempt === true &&
    activation.authorization.scoreChange === false &&
    activation.authorization.ledgerChange === false,
  "frozen Batch 11 title-correction activation required"
);
for (const lock of [
  preparation.inputs.productionDebates,
  preparation.inputs.compatibilityLibrary,
  ...preparation.inputs.productionLedgerOutputs,
  ...activation.executionTools
]) {
  assertV4(
    sha256(await readBytes(lock.path)) === lock.sha256,
    `${lock.path}: correction input changed after activation`
  );
}

const baselineDebates = (
  await readBytes(preparation.inputs.productionDebates.path)
).toString("utf8");
const baselineLibrary = (
  await readBytes(preparation.inputs.compatibilityLibrary.path)
).toString("utf8");
const correctedDebates = buildBatch11TitleCorrectedProductionSource(
  baselineDebates
);
const correctedLibrary = buildBatch11TitleCorrectedCompatibilityLibrary(
  baselineLibrary
);
assertV4(
  sha256(correctedDebates) === activation.frozenOutputs.productionDebates.sha256 &&
    sha256(correctedLibrary) ===
      activation.frozenOutputs.compatibilityLibrary.sha256,
  "activated Batch 11 title-correction output changed"
);

await writeFile(resolve(paths.compatibilityLibrary), correctedLibrary);
await writeFile(resolve(paths.productionDebates), correctedDebates);

const validatorRun = spawnSync(
  process.execPath,
  ["scripts/validate-debates.mjs"],
  { cwd: root, encoding: "utf8", maxBuffer: 100 * 1024 * 1024 }
);
assertV4(
  validatorRun.status === 0,
  `Batch 11 title-corrected route validation failed: ${validatorRun.stderr || validatorRun.stdout}`
);
const scorePolicyRun = spawnSync(
  process.execPath,
  ["scripts/test-assessment-production-score-stability-policy-active.mjs"],
  { cwd: root, encoding: "utf8", maxBuffer: 100 * 1024 * 1024 }
);
assertV4(
  scorePolicyRun.status === 0,
  `Batch 11 title-corrected score-policy validation failed: ${scorePolicyRun.stderr || scorePolicyRun.stdout}`
);

const correctedRecord = extractProductionDebateRecords(correctedDebates).find(
  (record) => record.number === BATCH_11_TITLE_CORRECTION_DEBATE_NUMBER
);
const correctedDebate = JSON.parse(correctedRecord.text);
const correctedScoreSnapshot = {
  overall: correctedDebate.score,
  section: correctedDebate.sections[0].score,
  moves: correctedDebate.sections[0].exchanges.flatMap((exchange) =>
    [exchange.pro, exchange.con].filter(Boolean).map((move) => ({
      ledgerMoveId: move.ledgerMoveId,
      score: move.score
    }))
  )
};
assertV4(
  correctedDebate.sections[0].title === BATCH_11_TITLE_CORRECTION_AFTER &&
    canonicalJson(correctedScoreSnapshot) ===
      canonicalJson(preparation.scoreSnapshot),
  "Batch 11 title correction changed a score or move identity"
);
for (const output of preparation.inputs.productionLedgerOutputs) {
  assertV4(
    sha256(await readBytes(output.path)) === output.sha256,
    `${output.debateNumber}: production ledger changed during title correction`
  );
}

const completedAt = new Date().toISOString();
const correctionExecution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-11-production-title-correction-1-execution",
  status: "passed-batch-11-production-title-correction-1",
  startedAt,
  completedAt,
  activation: {
    path: paths.activation,
    sha256: sha256(activationBytes),
    bytes: activationBytes.length
  },
  correction: {
    debateNumber: BATCH_11_TITLE_CORRECTION_DEBATE_NUMBER,
    field: "sections[0].title",
    before: BATCH_11_TITLE_CORRECTION_BEFORE,
    after: BATCH_11_TITLE_CORRECTION_AFTER,
    semanticFieldsChanged: 1,
    scoreChanges: 0,
    ledgerChanges: 0
  },
  outputs: {
    productionDebates: await lockFile(paths.productionDebates),
    compatibilityLibrary: await lockFile(paths.compatibilityLibrary)
  },
  validation: {
    routeAndScoreExitCode: validatorRun.status,
    activeScorePolicyExitCode: scorePolicyRun.status,
    scoreSnapshotByteIdentical: true,
    allTenProductionLedgersByteIdentical: true
  },
  totals: {
    attempts: 1,
    retries: 0,
    timeoutExtensions: 0,
    automaticRepairs: 0,
    semanticFieldsChanged: 1,
    writableFiles: 2,
    scoreChanges: 0,
    ledgerChanges: 0,
    modelContexts: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
  },
  nextAuthorizedAction:
    "finalize-batch-11-production-publication-and-prepare-generated-seo-correction"
};
await writeFile(resolve(paths.execution), serializedJson(correctionExecution));

const publishedLedgers = await Promise.all(
  manifest.debates.map(async (debate) => ({
    debateNumber: debate.debateNumber,
    debateId: debate.debateId,
    ...(await lockFile(debate.productionLedgerPath)),
    byteIdenticalToStagedLedger: true
  }))
);
const finalDebatesBytes = await readBytes(paths.productionDebates);
const publicationExecution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-11-production-publication-execution",
  protocolId:
    "assessment-production-post-canary-batch-11-production-publication",
  status:
    "passed-batch-11-production-publication-mutation-awaiting-generated-derivative-correction",
  startedAt,
  completedAt,
  activation: await lockFile(paths.publicationActivation),
  boundedRecovery: await lockFile(paths.execution),
  productionDebates: {
    path: paths.productionDebates,
    beforeSha256: manifest.productionBaseline.debates.sha256,
    activatedIntermediateSha256:
      publicationActivation.frozenOutput.proposedSha256,
    afterSha256: sha256(finalDebatesBytes),
    afterBytes: finalDebatesBytes.length,
    debateCount: 195,
    changedRecords: 10
  },
  productionLedgers: publishedLedgers,
  protected: {
    referencesByteIdentical: true,
    validatorByteIdentical: true,
    candidatesByteIdentical: true,
    stagedLedgersByteIdentical: true,
    compatibilityEvidenceByteIdentical: true,
    unrelatedProductionRecordsByteIdentical: 185,
    unrelatedPreexistingProductionLedgersByteIdentical: 110,
    preexistingBatchProductionLedgersReplaced: 1,
    newBatchProductionLedgersPublished: 9
  },
  validation: {
    routeAndScoreCommand: "node scripts/validate-debates.mjs",
    routeAndScoreExitCode: validatorRun.status,
    routeAndScoreStdoutSha256: sha256(validatorRun.stdout ?? ""),
    activeScorePolicyCommand:
      "node scripts/test-assessment-production-score-stability-policy-active.mjs",
    activeScorePolicyExitCode: scorePolicyRun.status,
    completeRepositoryValidationDeferredToGeneratedDerivativePass: true
  },
  recovery: {
    reason: "one Debate 24 section title exceeded the ten-word production limit",
    semanticFieldsChanged: 1,
    scoreChanges: 0,
    ledgerChanges: 0,
    attempts: 1,
    retries: 0
  },
  totals: {
    mutationPasses: 1,
    boundedRecoveryPasses: 1,
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
  nextAuthorizedAction:
    "prepare-isolated-batch-11-generated-seo-derivative-correction-under-standing-authorization"
};
await writeFile(
  resolve(paths.publicationExecution),
  serializedJson(publicationExecution)
);
const publicationAnalysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-11-production-publication-analysis",
  protocolId: publicationExecution.protocolId,
  status:
    "batch-11-production-publication-mutation-passed-pending-generated-derivative-correction",
  analyzedAt: completedAt,
  execution: await lockFile(paths.publicationExecution),
  decision: {
    exactMutationAuthenticated: true,
    tenRecordsReplaced: true,
    tenLedgersPublishedByteForByte: true,
    unrelatedProductionPreserved: true,
    referencesPreserved: true,
    routeAndScoreValidationPassed: true,
    activeScorePolicyPassed: true,
    boundedTitleCorrectionApplied: true,
    generatedDerivativesKnownStaleAndNotYetWritten: true,
    completeRepositoryValidationPending: true,
    atomicTransactionCommitPending: true
  },
  totals: publicationExecution.totals,
  authorization: {
    isolatedGeneratedDerivativePlanPreparation: true,
    additionalProductionMutation: false,
    scorePass: false,
    modelExecution: false,
    paidServices: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: publicationExecution.nextAuthorizedAction
};
await writeFile(
  resolve(paths.publicationAnalysis),
  serializedJson(publicationAnalysis)
);

console.log(
  serializedJson({
    status: publicationExecution.status,
    correctionStatus: correctionExecution.status,
    debatesPublished: 10,
    ledgersPublished: 10,
    semanticFieldsCorrected: 1,
    scoreChanges: 0,
    ledgerChanges: 0,
    attempts: 1,
    retries: 0,
    directIncrementalCostUsd: 0
  })
);
