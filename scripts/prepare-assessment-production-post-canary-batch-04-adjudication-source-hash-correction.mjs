#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/dispute-only-adjudication";
const recoveryRoot = `${root}/source-hash-recovery`;
const preparationPath = `${root}/preparation-manifest.json`;
const targetPath =
  "scripts/validate-assessment-production-post-canary-batch-04-dispute-adjudication-output.mjs";
const diagnosisPath = `${recoveryRoot}/failure-diagnosis.json`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const toolFiles = [
  "scripts/prepare-assessment-production-post-canary-batch-04-adjudication-source-hash-correction.mjs",
  "scripts/activate-assessment-production-post-canary-batch-04-adjudication-source-hash-correction.mjs",
  "scripts/run-assessment-production-post-canary-batch-04-adjudication-source-hash-correction.mjs",
  "scripts/test-assessment-production-post-canary-batch-04-adjudication-source-hash-correction.mjs",
  "scripts/lib/v4-lean-production.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [preparationBytes, targetBytes] = await Promise.all([
  readFile(preparationPath),
  readFile(targetPath)
]);
const preparation = JSON.parse(preparationBytes);
const recordedSha256 = preparation.sourceHashes?.[targetPath];
const actualSha256 = sha256(targetBytes);
assertV4(
  preparation.status ===
      "prepared-ten-isolated-post-canary-batch-04-dispute-only-adjudication-contexts" &&
    preparation.batchNumber === 4 &&
    preparation.contexts.length === 10 &&
    preparation.totals.disputedMoves === 196 &&
    preparation.totals.candidateSelections === 582,
  "Batch 4 adjudication preparation changed"
);
assertV4(
  recordedSha256 ===
      "2412a9cc8ebc1f51d2d5851636ba10fc4dfb6980f1a8b514fdf3fa914528cde7" &&
    actualSha256 ===
      "c97d02f286e54a07d8730c3e18c38420f789a8f9875068f931f800a0948c4076",
  "preserved adjudication validator source-hash mismatch changed"
);
if (shouldWrite) {
  for (const file of [diagnosisPath, planPath, activationPath, executionPath]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}
const sourceHashes = {};
for (const file of toolFiles) sourceHashes[file] = sha256(await readFile(file));
const checkpointCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8"
}).trim();
const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-adjudication-source-hash-failure-diagnosis",
  status: "frozen-one-file-adjudication-validator-source-hash-mismatch-diagnosed",
  batchNumber: 4,
  checkpointCommit,
  failure: {
    category: "deterministic-validation-source-hash-mismatch",
    gate:
      "preregister-assessment-production-post-canary-batch-04-dispute-adjudication",
    message: `preparation source drifted: ${targetPath}`,
    targetPath,
    recordedSha256,
    actualSha256,
    semanticChange: false,
    exactDifference:
      "One trailing blank line was removed to satisfy git diff --check after the packet manifest captured the source hash."
  },
  protectedEvidence: {
    preparationPath,
    preparationSha256: sha256(preparationBytes),
    packets: 10,
    disputedMoves: 196,
    candidateSelections: 582,
    packetChanges: 0,
    schemaChanges: 0
  },
  boundaries: {
    modelContexts: 0,
    paidServiceCalls: 0,
    scoresDerived: 0,
    directIncrementalCostUsd: 0
  }
};
const diagnosisBytes = Buffer.from(`${JSON.stringify(diagnosis, null, 2)}\n`);
const plan = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-adjudication-source-hash-correction-plan",
  status: "frozen-one-field-adjudication-source-hash-correction-ready",
  batchNumber: 4,
  checkpointCommit,
  diagnosis: { path: diagnosisPath, sha256: sha256(diagnosisBytes) },
  authenticatedInput: {
    path: preparationPath,
    sha256: sha256(preparationBytes)
  },
  exactMutation: {
    targetPath,
    fromSha256: recordedSha256,
    toSha256: actualSha256,
    writableFields: 1
  },
  executionPolicy: {
    attemptsMaximum: 1,
    retriesMaximum: 0,
    rerunsMaximum: 0,
    automaticRepairsMaximum: 0,
    packetChangesMaximum: 0,
    schemaChangesMaximum: 0,
    modelContextsMaximum: 0,
    paidServiceCallsMaximum: 0,
    scoresDerivedMaximum: 0,
    directIncrementalCostUsdMaximum: 0
  },
  outputs: { activation: activationPath, execution: executionPath },
  sourceHashes
};
if (shouldWrite) {
  await mkdir(recoveryRoot, { recursive: true });
  await writeFile(diagnosisPath, diagnosisBytes);
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: plan.status,
      wroteArtifacts: shouldWrite,
      writableFields: 1,
      packetChanges: 0,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
