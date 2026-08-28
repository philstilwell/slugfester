#!/usr/bin/env node

import { access, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  POST_CANARY_BATCH_17_PRODUCTION_PUBLICATION_ORDER,
  POST_CANARY_BATCH_17_PRODUCTION_PUBLICATION_PROTOCOL_ID,
  POST_CANARY_BATCH_17_PRODUCTION_PUBLICATION_ROOT,
  extractProductionDebateRecords,
  inventoryDigest,
  serializedJson,
  sha256
} from "./lib/assessment-production-post-canary-batch-17-production-publication.mjs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const frozenAtIndex = args.indexOf("--frozen-at");
const requestedFrozenAt = frozenAtIndex >= 0 ? args[frozenAtIndex + 1] : null;
const root = process.cwd();
const resolve = (relativePath) => path.resolve(root, relativePath);
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readText = (relativePath) => readFile(resolve(relativePath), "utf8");
const readJson = (relativePath) => readText(relativePath).then(JSON.parse);
const exists = (relativePath) => access(resolve(relativePath)).then(() => true, () => false);
const lockFile = async (relativePath) => {
  const bytes = await readBytes(relativePath);
  return { path: relativePath, sha256: sha256(bytes), bytes: bytes.length };
};

const paths = {
  manifest: `${POST_CANARY_BATCH_17_PRODUCTION_PUBLICATION_ROOT}/mutation-manifest.json`,
  preparationAnalysis: `${POST_CANARY_BATCH_17_PRODUCTION_PUBLICATION_ROOT}/preparation-analysis.json`,
  activation: `${POST_CANARY_BATCH_17_PRODUCTION_PUBLICATION_ROOT}/execution-activation.json`,
  execution: `${POST_CANARY_BATCH_17_PRODUCTION_PUBLICATION_ROOT}/execution.json`,
  compatibilityRoot: "docs/assessment-production/post-canary-continuation-v1/batch-17/production-compatibility",
  finalizationRoot: "docs/assessment-production/post-canary-continuation-v1/batch-17/publication-finalization/output-bundle/final-candidates",
  productionDebates: "src/data/debates.js",
  references: "src/data/references.js",
  ledgers: "docs/assessment-ledgers",
  validator: "scripts/validate-debates.mjs",
  scorePolicy: "docs/assessment-production/score-stability-policy-v2.2-promotion.json",
  scorePolicyControl: "scripts/lib/assessment-production-score-stability-policy-active.mjs",
  scorePolicyTest: "scripts/test-assessment-production-score-stability-policy-active.mjs",
  standingAuthorization: "docs/assessment-production/post-canary-continuation-v1/batch-17/standing-authorization.json",
  preparationScript: "scripts/prepare-assessment-production-post-canary-batch-17-production-publication.mjs",
  preparationTest: "scripts/test-assessment-production-post-canary-batch-17-production-publication-preparation.mjs",
  library: "scripts/lib/assessment-production-post-canary-batch-17-production-publication.mjs",
  activationScript: "scripts/activate-assessment-production-post-canary-batch-17-production-publication.mjs",
  activationTest: "scripts/test-assessment-production-post-canary-batch-17-production-publication-activation.mjs",
  executionScript: "scripts/run-assessment-production-post-canary-batch-17-production-publication.mjs"
};

const existing = (await exists(paths.manifest)) ? await readJson(paths.manifest) : null;
const frozenAt = existing?.frozenAt ?? requestedFrozenAt;
assertV4(typeof frozenAt === "string" && !Number.isNaN(Date.parse(frozenAt)), "stable --frozen-at ISO timestamp required");

const compatibilityPaths = {
  analysis: `${paths.compatibilityRoot}/analysis.json`,
  execution: `${paths.compatibilityRoot}/execution.json`,
  activation: `${paths.compatibilityRoot}/execution-activation.json`,
  preparation: `${paths.compatibilityRoot}/preparation-manifest.json`
};
const [compatibilityAnalysis, compatibilityExecution, compatibilityActivation] = await Promise.all([
  readJson(compatibilityPaths.analysis),
  readJson(compatibilityPaths.execution),
  readJson(compatibilityPaths.activation)
]);
assertV4(
  compatibilityAnalysis.status === "batch-17-production-compatibility-passed" &&
    compatibilityAnalysis.decision?.compatibilityGatePassed === true &&
    compatibilityAnalysis.totals?.compatibilityPassesCompleted === 1 &&
    compatibilityAnalysis.totals?.productionMutations === 0 &&
    compatibilityAnalysis.nextAuthorizedAction === "prepare-batch-17-production-publication-mutation-manifest-under-standing-authorization",
  "accepted Batch 17 compatibility analysis required"
);
assertV4(
  compatibilityExecution.status === "batch-17-route-score-checkpoint-batch-01-through-batch-16-legacy-reference-validation-passed" &&
    compatibilityExecution.regressions?.fullRepositoryPassed === true &&
    compatibilityExecution.totals?.compatibilityPassesCompleted === 1,
  "accepted one-pass Batch 17 compatibility execution required"
);
assertV4(
  compatibilityActivation.status === "post-canary-batch-17-compatibility-execution-authorized-and-frozen" &&
    compatibilityActivation.packetHashes?.length === 4,
  "frozen Batch 17 compatibility activation required"
);
const productionDebatesBytes = await readBytes(paths.productionDebates);
const productionDebatesSource = productionDebatesBytes.toString("utf8");
const productionRecords = extractProductionDebateRecords(productionDebatesSource);
assertV4(productionRecords.length === 195, "expected 195 production debate records");
const productionByNumber = new Map(productionRecords.map((record) => [record.number, record]));

const ledgerNames = (await readdir(resolve(paths.ledgers)))
  .filter((name) => name.endsWith(".json"))
  .sort();
const ledgerInventory = await Promise.all(ledgerNames.map(async (name) => lockFile(`${paths.ledgers}/${name}`)));
assertV4(ledgerInventory.length === 170, "expected 170 existing production ledgers before Batch 17 publication");

const packetLocks = new Map(compatibilityActivation.packetHashes.map((record) => [record.debateNumber, record]));
const debates = [];
for (const debateNumber of POST_CANARY_BATCH_17_PRODUCTION_PUBLICATION_ORDER) {
  const packetLock = packetLocks.get(debateNumber);
  assertV4(packetLock, `${debateNumber}: compatibility packet lock missing`);
  const productionRecord = productionByNumber.get(debateNumber);
  assertV4(productionRecord?.id === packetLock.debateId, `${debateNumber}: current production identity mismatch`);
  const candidatePath = `${paths.finalizationRoot}/debate-${debateNumber}.json`;
  const candidate = await readJson(candidatePath);
  assertV4(candidate.number === debateNumber && candidate.id === packetLock.debateId, `${debateNumber}: candidate identity mismatch`);
  const productionLedgerExists = await exists(packetLock.productionLedgerPath);
  assertV4(
    productionLedgerExists === packetLock.productionLedgerBaseline.exists,
    `${debateNumber}: production ledger baseline existence changed`
  );
  const productionLedgerBaseline = productionLedgerExists
    ? { exists: true, ...(await lockFile(packetLock.productionLedgerPath)) }
    : {
        exists: false,
        path: packetLock.productionLedgerPath,
        sha256: null,
        bytes: 0
      };
  assertV4(
    productionLedgerBaseline.sha256 ===
      packetLock.productionLedgerBaseline.sha256,
    `${debateNumber}: production ledger baseline hash changed`
  );
  const candidateLock = await lockFile(candidatePath);
  const stagedLedgerLock = await lockFile(packetLock.stagedLedgerPath);
  const packetPath = packetLock.path;
  const packet = await readJson(packetPath);
  assertV4(
    stagedLedgerLock.sha256 === packetLock.stagedLedgerSha256 &&
      stagedLedgerLock.sha256 === packet.proposedAdapterSha256 &&
      candidateLock.sha256 === packet.sourceLocks.finalCandidateSha256 &&
      packet.futurePaths.productionLedger === packetLock.productionLedgerPath,
    `${debateNumber}: compatibility candidate/ledger chain changed`
  );
  debates.push({
    debateNumber,
    debateId: packetLock.debateId,
    productionRecordIndex: productionRecord.index,
    currentProductionRecordSha256: sha256(productionRecord.text),
    currentProductionRecordBytes: Buffer.byteLength(productionRecord.text),
    candidate: candidateLock,
    stagedLedger: stagedLedgerLock,
    compatibilityPacket: await lockFile(packetPath),
    productionLedgerPath: packetLock.productionLedgerPath,
    productionLedgerBaseline,
    candidateLedgerLinkPassed: true
  });
}
assertV4(
  debates.filter((debate) => debate.productionLedgerBaseline.exists).length === 0 &&
    debates.filter((debate) => !debate.productionLedgerBaseline.exists).length === 4,
  "expected four absent Batch 17 production ledgers"
);

const baselineCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const validatorLock = await lockFile(paths.validator);
assertV4(validatorLock.sha256 === compatibilityExecution.validator.appliedSha256, "accepted Batch 17 validator changed");
const referenceLock = await lockFile(paths.references);
assertV4(referenceLock.sha256 === compatibilityActivation.protectedProduction.references.sha256, "references changed after compatibility");
assertV4(sha256(productionDebatesBytes) === compatibilityActivation.protectedProduction.debates.sha256, "production debates changed after compatibility");
const compatibilityLedgerDigest = sha256(
  serializedJson(
    ledgerInventory.map(({ path: ledgerPath, sha256: ledgerSha256 }) => ({
      path: ledgerPath,
      sha256: ledgerSha256
    }))
  )
);
assertV4(
  compatibilityLedgerDigest ===
    compatibilityActivation.protectedProduction.productionLedgers.digest,
  "existing ledger inventory changed after compatibility"
);

const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-17-production-publication-mutation-manifest",
  protocolId: POST_CANARY_BATCH_17_PRODUCTION_PUBLICATION_PROTOCOL_ID,
  status: "frozen-batch-17-production-publication-mutation-manifest-prepared",
  frozenAt,
  baselineCommit,
  productionCanary: false,
  batchNumber: 17,
  preparationOnly: true,
  directIncrementalCostCapUsd: 0,
  explicitOrder: [...POST_CANARY_BATCH_17_PRODUCTION_PUBLICATION_ORDER],
  invariants: {
    assessmentModel: "5.6 Sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    completedModelPassesWereIsolated: true,
    scoreBlindnessPreserved: true,
    roundedIntegerScoreTiesPermitted: true,
    activeScoreStabilityPolicy: "v2.2",
    scorePassesAlreadyCompleted: 1,
    futureScorePassesAuthorized: 0,
    modelsInThisStage: 0,
    paidServicesInThisStage: 0
  },
  compatibilityAcceptance: {
    analysis: await lockFile(compatibilityPaths.analysis),
    execution: await lockFile(compatibilityPaths.execution),
    activation: await lockFile(compatibilityPaths.activation),
    preparation: await lockFile(compatibilityPaths.preparation),
    requiredGatePassed: true
  },
  validator: { ...validatorLock, rewriteAuthorized: false },
  scorePolicy: {
    promotion: await lockFile(paths.scorePolicy),
    activeControl: await lockFile(paths.scorePolicyControl),
    activeControlTest: await lockFile(paths.scorePolicyTest)
  },
  standingAuthorization: await lockFile(paths.standingAuthorization),
  productionBaseline: {
    debates: {
      path: paths.productionDebates,
      sha256: sha256(productionDebatesBytes),
      bytes: productionDebatesBytes.length,
      debateCount: productionRecords.length,
      exactBatchRecordsLocated: debates.length
    },
    references: { ...referenceLock, mustRemainByteIdentical: true },
    existingProductionLedgers: {
      directory: paths.ledgers,
      count: ledgerInventory.length,
      digestAlgorithm: "sha256 of sorted path<TAB>sha256<TAB>bytes<LF>",
      inventorySha256: inventoryDigest(ledgerInventory),
      compatibilityInventorySha256: compatibilityLedgerDigest,
      files: ledgerInventory,
      mustRemainByteIdenticalBeforeMutation: true,
      unrelatedFilesMustRemainByteIdenticalAfterMutation: true
    },
    batchProductionLedgersAbsent: debates.filter(
      (debate) => !debate.productionLedgerBaseline.exists
    ).length,
    batchProductionLedgersPresent: debates.filter(
      (debate) => debate.productionLedgerBaseline.exists
    ).length
  },
  debates,
  executionContract: {
    mutationPasses: 1,
    attemptsMaximum: 1,
    retriesMaximum: 0,
    rerunsMaximum: 0,
    automaticRepairs: false,
    rollback: false,
    requiredOrder: [
      "authenticate the frozen manifest and every locked input",
      "confirm the four absent Batch 17 production-ledger baselines and all 170 existing ledger hashes",
      "publish four production ledgers byte-for-byte from the staged ledgers",
      "replace exactly four Batch 17 records in src/data/debates.js with the finalized candidates",
      "keep src/data/references.js byte-identical",
      "run deterministic Batch 17 route and score validation",
      "freeze execution evidence before isolated generated-derivative comparison"
    ],
    exactProductionWrites: [paths.productionDebates, ...debates.map((debate) => debate.productionLedgerPath)],
    generatedDerivativeWrites: 0,
    models: 0,
    paidServices: 0,
    nextBatchSelection: false
  },
  preparationTools: await Promise.all([
    paths.library,
    paths.preparationScript,
    paths.preparationTest,
    paths.activationScript,
    paths.activationTest,
    paths.executionScript
  ].map(lockFile)),
  authorization: {
    mutationManifestPreparation: true,
    executionActivation: false,
    productionLedgerPublication: false,
    productionMutation: false,
    generatedDerivativeMutation: false,
    modelExecution: false,
    paidServices: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "activate-and-execute-one-frozen-batch-17-production-publication-mutation-pass-under-standing-authorization"
};
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-17-production-publication-preparation-analysis",
  protocolId: POST_CANARY_BATCH_17_PRODUCTION_PUBLICATION_PROTOCOL_ID,
  status: "batch-17-production-publication-mutation-manifest-freeze-passed",
  analyzedAt: frozenAt,
  manifest: { path: paths.manifest, sha256: sha256(serializedJson(manifest)) },
  checks: {
    compatibilityAccepted: true,
    validatorLocked: true,
    candidatesLocked: 4,
    stagedLedgersLocked: 4,
    exactProductionRecordsLocked: 4,
    existingProductionLedgersLocked: 170,
    referencesLocked: true,
    productionMutationPerformed: false
  },
  totals: { debates: 4, productionWritesPrepared: 5, scorePasses: 0, modelContexts: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 },
  nextAuthorizedAction: manifest.nextAuthorizedAction
};

if (write) {
  await mkdir(resolve(POST_CANARY_BATCH_17_PRODUCTION_PUBLICATION_ROOT), { recursive: true });
  await writeFile(resolve(paths.manifest), serializedJson(manifest));
  await writeFile(resolve(paths.preparationAnalysis), serializedJson(analysis));
}
console.log(serializedJson({ status: analysis.status, write, manifestSha256: analysis.manifest.sha256, debates: debates.length, existingProductionLedgers: ledgerInventory.length }));
