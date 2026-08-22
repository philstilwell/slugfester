#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const write = process.argv.includes("--write");
const diagnosedAtIndex = process.argv.indexOf("--diagnosed-at");
const diagnosedAt = diagnosedAtIndex >= 0 ? process.argv[diagnosedAtIndex + 1] : null;
assertV4(diagnosedAt && !Number.isNaN(Date.parse(diagnosedAt)), "--diagnosed-at requires an ISO timestamp");

const root = "docs/assessment-production/post-canary-continuation-v1/batch-06";
const correctionRoot = `${root}/standing-authorization-preparation-correction-1`;
const diagnosisPath = `${correctionRoot}/diagnosis.json`;
const standingAuthorizationPath = `${root}/standing-authorization.json`;
const paths = {
  selection: `${root}/selection.json`,
  selectionAnalysis: `${root}/selection-analysis.json`,
  sourcePreparation: `${root}/source-preparation/preparation-manifest.json`,
  sourceValidation: `${root}/source-preparation/validation.json`,
  instruction: `${root}/standing-authorization-instruction.txt`,
  library: "scripts/lib/assessment-production-post-canary-batch-06-standing-authorization.mjs",
  preparation: "scripts/prepare-assessment-production-post-canary-batch-06-standing-authorization.mjs",
  test: "scripts/test-assessment-production-post-canary-batch-06-standing-authorization.mjs",
  diagnosisScript: "scripts/diagnose-assessment-production-post-canary-batch-06-standing-authorization-failure.mjs"
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const lock = async (file) => {
  const bytes = await readFile(path.resolve(file));
  return { path: file, sha256: sha256(bytes), bytes: bytes.length };
};
const [selectionBytes, selectionAnalysisBytes, sourcePreparationBytes, sourceValidationBytes, preparationBytes] =
  await Promise.all([
    readFile(paths.selection),
    readFile(paths.selectionAnalysis),
    readFile(paths.sourcePreparation),
    readFile(paths.sourceValidation),
    readFile(paths.preparation)
  ]);
const selection = JSON.parse(selectionBytes);
const selectionAnalysis = JSON.parse(selectionAnalysisBytes);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
const sourceValidation = JSON.parse(sourceValidationBytes);
const preparationSource = preparationBytes.toString("utf8");
const requiredOrder = ["73", "36", "38", "97", "141", "06", "168", "135", "143", "169"];

assertV4(!(await exists(standingAuthorizationPath)), "standing authorization unexpectedly exists after the failed preparation");
assertV4(
  selection.status === "sixth-post-canary-ten-debate-batch-selection-frozen-source-gate-passed" &&
    selection.protocolId === "assessment-production-post-canary-batch-06" &&
    selection.batchNumber === 5 &&
    JSON.stringify(selection.selected.map((item) => item.debateNumber)) === JSON.stringify(requiredOrder) &&
    selectionAnalysis.status === "sixth-post-canary-batch-selection-analysis-passed-under-standing-authorization" &&
    selectionAnalysis.selection.sha256 === sha256(selectionBytes),
  "preserved Batch 6 selection metadata does not match the diagnosed stale-field shape"
);
assertV4(
  sourcePreparation.status === "post-canary-batch-06-ten-complete-score-blind-source-packets-prepared-awaiting-validation" &&
    sourcePreparation.totals.discoveryContexts === 39 &&
    sourcePreparation.totals.modelContextsExecuted === 0 &&
    sourceValidation.status === "post-canary-batch-06-score-blind-source-packet-validation-passed-frozen-under-standing-authorization" &&
    sourceValidation.totals.discoveryContexts === 39 &&
    sourceValidation.totals.modelContextsExecuted === 0,
  "accepted Batch 6 source-packet checkpoint changed"
);
assertV4(
  preparationSource.includes("selection.batchNumber === 6") &&
    preparationSource.includes("75c9b395c045518f064988c76987e0e2b5a72493"),
  "standing-authorization preparation preimage no longer contains the diagnosed assertions"
);

const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-06-standing-authorization-preparation-failure-diagnosis",
  protocolId: "assessment-production-post-canary-batch-06-standing-authorization-preparation-correction-1",
  status: "frozen-batch-06-standing-authorization-preparation-stale-selection-metadata-and-checkpoint-harness-diagnosed",
  diagnosedAt,
  directIncrementalCostUsd: 0,
  failedCommand: "node scripts/prepare-assessment-production-post-canary-batch-06-standing-authorization.mjs --write --authorized-at 2026-08-22T19:59:46.000Z",
  errorMessage: "the frozen Batch 6 selection or source-packet boundary changed",
  successfulStandingAuthorizationWritten: false,
  acceptedEvidence: {
    selection: await lock(paths.selection),
    selectionAnalysis: await lock(paths.selectionAnalysis),
    sourcePreparation: await lock(paths.sourcePreparation),
    sourceValidation: await lock(paths.sourceValidation),
    instruction: await lock(paths.instruction),
    selectedDebates: requiredOrder,
    discoveryContexts: 39,
    modelContextsExecuted: 0
  },
  rootCause: {
    staleSelectionField: {
      path: "/batchNumber",
      frozenValue: 5,
      authenticatedBatchIdentity: 6,
      finding: "The accepted selection artifact retained the inherited Batch 5 numeric literal even though its protocol, status, paths, rank slice, debate boundary, and analysis all authenticate Batch 6. Source preparation hash-locked that immutable artifact."
    },
    recoveryCheckpointHarness: {
      sourcePacketCommit: "75c9b395c045518f064988c76987e0e2b5a72493",
      finding: "The preparation harness requires the source-packet commit to remain exact HEAD. The mandated diagnosis, plan, and activation commits necessarily advance HEAD while preserving that commit as an ancestor, so recovery requires ancestor authentication plus HEAD/origin equality."
    },
    sourceOrContentDefect: false,
    modelFailure: false,
    paidServiceFailure: false
  },
  correctionBoundary: {
    level: 1,
    correctionType: "bounded-deterministic-validation-overlay-and-checkpoint-authentication-correction",
    writableFiles: [paths.library, paths.preparation, paths.test],
    selectionArtifactWritable: false,
    sourcePacketsWritable: false,
    schemasWritable: false,
    modelsAuthorizedInCorrection: 0,
    paidServicesAuthorizedInCorrection: 0,
    attemptsMaximum: 1,
    retriesMaximum: 0,
    rerunsMaximum: 0,
    rollback: false
  },
  sourceLocks: await Promise.all(Object.values(paths).map(lock)),
  nextAuthorizedAction: "prepare-and-hash-lock-batch-06-standing-authorization-preparation-correction-1"
};

if (write) {
  assertV4(!(await exists(diagnosisPath)), "diagnosis already exists");
  await mkdir(path.resolve(correctionRoot), { recursive: true });
  await writeFile(path.resolve(diagnosisPath), `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(JSON.stringify({ status: diagnosis.status, write, staleSelectionBatchNumber: 5, acceptedDiscoveryContexts: 39, writableFiles: 3, directIncrementalCostUsd: 0 }, null, 2));
