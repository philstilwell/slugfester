#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import {
  POST_CANARY_BATCH_04_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch04StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-04-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const stageRoot =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/audio-verification";
const diagnosisPath = `${stageRoot}/cost-decimal-failure-diagnosis.json`;
const planPath = `${stageRoot}/cost-decimal-correction-plan.json`;
const activationPath = `${stageRoot}/cost-decimal-correction-activation.json`;
const outputPath = `${stageRoot}/cost-decimal-correction-validation.json`;
const toolFiles = [
  "scripts/prepare-assessment-production-post-canary-batch-04-audio-cost-decimal-correction.mjs",
  "scripts/activate-assessment-production-post-canary-batch-04-audio-cost-decimal-correction.mjs",
  "scripts/run-assessment-production-post-canary-batch-04-audio-cost-decimal-correction.mjs",
  "scripts/test-assessment-production-post-canary-batch-04-audio-cost-decimal-correction.mjs",
  "scripts/lib/assessment-production-post-canary-batch-04-standing-authorization.mjs",
  "scripts/lib/v4-lean-production.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const standingAuthorization =
  await loadAndValidatePostCanaryBatch04StandingAuthorization();
const diagnosisBytes = await readFile(diagnosisPath);
const diagnosis = JSON.parse(diagnosisBytes);
assertV4(
  diagnosis.status ===
      "frozen-batch-04-audio-cost-binary-decimal-mismatch-diagnosed" &&
    diagnosis.failure.strictEqualityEqual === false &&
    diagnosis.failure.sevenDecimalNormalizationEqual === true &&
    diagnosis.exactCostRepresentation.exactIntegerUnits === 1144125 &&
    diagnosis.exactCostRepresentation.exactCostUsd === 0.1144125 &&
    diagnosis.preservedResults.approvedCapExceeded === false,
  "Batch 4 cost-decimal diagnosis changed"
);
for (const [file, digest] of Object.entries(diagnosis.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
if (shouldWrite) {
  for (const file of [planPath, activationPath, outputPath]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

const sourceHashes = {
  [diagnosisPath]: sha256(diagnosisBytes),
  [POST_CANARY_BATCH_04_STANDING_AUTHORIZATION]: standingAuthorization.sha256
};
for (const file of toolFiles) sourceHashes[file] = sha256(await readFile(file));
const plan = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-audio-cost-decimal-correction-plan",
  status: "frozen-one-pass-exact-cost-normalization-overlay-ready-for-activation",
  batchNumber: 4,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  standingAuthorization: {
    path: POST_CANARY_BATCH_04_STANDING_AUTHORIZATION,
    sha256: standingAuthorization.sha256,
    boundedFirstRecovery: true
  },
  diagnosis: { path: diagnosisPath, sha256: sha256(diagnosisBytes) },
  exactOverlay: {
    operation:
      "validate-preserved-cost-using-exact-ten-millionth-dollar-integer-units-and-seven-decimal-normalization-overlay",
    inputTokens: 6441,
    outputTokens: 9831,
    inputUnitsPerToken: 25,
    outputUnitsPerToken: 100,
    exactIntegerUnits: 1144125,
    exactCostUsd: 0.1144125,
    preservedSerializedCostUsd: 0.11441250000000001,
    approvedMaximumCostUsd: 1,
    mathematicalCostChanged: false,
    capDispositionChanged: false
  },
  executionPolicy: {
    attemptsMaximum: 1,
    retriesMaximum: 0,
    rerunsMaximum: 0,
    recursiveCorrectionsMaximum: 0,
    persistentProtectedWritesMaximum: 0,
    outputWritesMaximum: 1,
    audioAccessAllowed: false,
    modelExecutionAllowed: false,
    paidServiceAllowed: false,
    scoreDerivationAllowed: false,
    directIncrementalCostUsdMaximum: 0
  },
  outputs: { activation: activationPath, validation: outputPath },
  sourceHashes,
  nextAuthorizedAction:
    "activate-and-execute-one-batch-04-exact-cost-normalization-overlay"
};

if (shouldWrite) {
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: plan.status,
      wroteArtifact: shouldWrite,
      exactCostUsd: 0.1144125,
      attemptsMaximum: 1,
      persistentProtectedWritesMaximum: 0,
      audioAccessAllowed: false,
      paidServiceAllowed: false,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
