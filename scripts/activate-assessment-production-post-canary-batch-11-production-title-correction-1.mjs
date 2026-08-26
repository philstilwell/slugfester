#!/usr/bin/env node

import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  buildBatch11TitleCorrectedCompatibilityLibrary,
  buildBatch11TitleCorrectedProductionSource,
  serializedJson,
  sha256
} from "./lib/assessment-production-post-canary-batch-11-production-title-correction-1.mjs";

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

const correctionRoot =
  "docs/assessment-production/post-canary-continuation-v1/batch-11/production-publication/title-correction-1";
const preparationPath = `${correctionRoot}/preparation.json`;
const activationPath = `${correctionRoot}/execution-activation.json`;
const executionPath = `${correctionRoot}/execution.json`;
const existing = (await exists(activationPath))
  ? await readJson(activationPath)
  : null;
const activatedAt = existing?.activatedAt ?? requestedActivatedAt;
assertV4(
  typeof activatedAt === "string" && !Number.isNaN(Date.parse(activatedAt)),
  "stable --activated-at ISO timestamp required"
);
assertV4(!(await exists(executionPath)), "Batch 11 title correction already executed");

const preparationBytes = await readBytes(preparationPath);
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.status ===
      "frozen-batch-11-production-title-correction-1-prepared" &&
    preparation.executionDiscipline.attempts === 1 &&
    preparation.executionDiscipline.retries === 0 &&
    preparation.correction.semanticFieldsChanged === 1 &&
    preparation.correction.scoreChanges === 0 &&
    preparation.correction.ledgerChanges === 0,
  "frozen Batch 11 title-correction preparation required"
);
for (const lock of [
  preparation.inputs.productionDebates,
  preparation.inputs.compatibilityLibrary,
  ...preparation.preparationTools,
  ...preparation.inputs.productionLedgerOutputs
]) {
  assertV4(
    sha256(await readBytes(lock.path)) === lock.sha256,
    `${lock.path}: title-correction source changed before activation`
  );
}
const proposedDebates = buildBatch11TitleCorrectedProductionSource(
  (await readBytes(preparation.inputs.productionDebates.path)).toString("utf8")
);
const proposedLibrary = buildBatch11TitleCorrectedCompatibilityLibrary(
  (await readBytes(preparation.inputs.compatibilityLibrary.path)).toString(
    "utf8"
  )
);
assertV4(
  sha256(proposedDebates) ===
      preparation.proposedOutputs.productionDebates.sha256 &&
    sha256(proposedLibrary) ===
      preparation.proposedOutputs.compatibilityLibrary.sha256,
  "Batch 11 title-correction proposed outputs changed"
);

const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-11-production-title-correction-1-activation",
  status: "frozen-batch-11-production-title-correction-1-activated",
  activatedAt,
  batchNumber: 11,
  directIncrementalCostCapUsd: 0,
  preparation: {
    path: preparationPath,
    sha256: sha256(preparationBytes),
    bytes: preparationBytes.length
  },
  executionTools: await Promise.all(
    [
      "scripts/lib/assessment-production-post-canary-batch-11-production-title-correction-1.mjs",
      "scripts/run-assessment-production-post-canary-batch-11-production-title-correction-1.mjs"
    ].map(lockFile)
  ),
  frozenOutputs: preparation.proposedOutputs,
  executionDiscipline: preparation.executionDiscipline,
  authorization: {
    correctionAttempt: true,
    productionDebateTitleWrite: true,
    exactCompatibilityAliasWrite: true,
    scoreChange: false,
    ledgerChange: false,
    retry: false,
    modelExecution: false,
    paidServices: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    "execute-one-batch-11-production-title-correction-1-attempt-no-retries"
};

if (write) {
  assertV4(!existing, "Batch 11 title correction already activated");
  await writeFile(resolve(activationPath), serializedJson(activation));
}
console.log(
  serializedJson({
    status: activation.status,
    write,
    attempts: 1,
    retries: 0,
    semanticFields: 1,
    scoreChanges: 0,
    ledgerChanges: 0
  })
);
