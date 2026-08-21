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
const files = {
  preparation: `${stageRoot}/execution-preparation-manifest.json`,
  activation: `${stageRoot}/execution-manifest.json`,
  execution: `${stageRoot}/model-execution.json`,
  audit: `${stageRoot}/audio-verification.json`,
  analysis: `${stageRoot}/analysis.json`,
  cost: `${stageRoot}/cost-control-analysis.json`,
  failedTest:
    "scripts/test-assessment-production-post-canary-batch-04-audio-verification.mjs"
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  assertV4(!(await exists(diagnosisPath)), "Batch 4 cost diagnosis already exists");
}
const standingAuthorization =
  await loadAndValidatePostCanaryBatch04StandingAuthorization();
const entries = await Promise.all(
  Object.entries(files).map(async ([key, file]) => [key, file, await readFile(file)])
);
const bytes = Object.fromEntries(entries.map(([key, , value]) => [key, value]));
const documents = Object.fromEntries(
  entries
    .filter(([key]) => key !== "failedTest")
    .map(([key, , value]) => [key, JSON.parse(value)])
);

assertV4(
  documents.execution.status ===
      "four-post-canary-batch-04-paid-known-speaker-diarizations-completed" &&
    documents.execution.callsCompleted === 4 &&
    documents.execution.callsSkipped === 0 &&
    documents.execution.retries === 0 &&
    documents.execution.requestFailure === false &&
    documents.execution.costCapReachedOrExceeded === false,
  "Batch 4 preserved audio execution changed"
);
assertV4(
  documents.analysis.status ===
      "passed-all-four-post-canary-batch-04-confidence-moves-audio-verified" &&
    documents.analysis.gate.passed === true &&
    documents.analysis.gate.verified === 4 &&
    documents.analysis.gate.unresolved === 0,
  "Batch 4 preserved audio-attribution result changed"
);
assertV4(
  documents.cost.costControl.approvedMaximumCostUsd === 1 &&
    documents.cost.costControl.approvedCapExceeded === false &&
    documents.cost.costControl.directIncrementalCostCapControlPassed === true,
  "Batch 4 preserved cost-cap result changed"
);

const inputTokens = documents.cost.totals.inputTokens;
const outputTokens = documents.cost.totals.outputTokens;
const exactIntegerUnits = inputTokens * 25 + outputTokens * 100;
const exactCostUsd = exactIntegerUnits / 10_000_000;
const serializedAggregateCostUsd =
  documents.cost.costControl.usageDerivedEstimatedCostUsd;
assertV4(inputTokens === 6441 && outputTokens === 9831, "returned-token totals changed");
assertV4(exactIntegerUnits === 1144125, "exact cost units changed");
assertV4(exactCostUsd === 0.1144125, "exact cost changed");
assertV4(
  serializedAggregateCostUsd === 0.11441250000000001 &&
    serializedAggregateCostUsd !== documents.execution.usageDerivedEstimatedCostUsd &&
    Number(serializedAggregateCostUsd.toFixed(7)) ===
      documents.execution.usageDerivedEstimatedCostUsd,
  "preserved binary-decimal mismatch was not reproduced"
);

const sourceHashes = Object.fromEntries(
  entries.map(([, file, value]) => [file, sha256(value)])
);
sourceHashes[POST_CANARY_BATCH_04_STANDING_AUTHORIZATION] =
  standingAuthorization.sha256;
const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-audio-cost-decimal-failure-diagnosis",
  status: "frozen-batch-04-audio-cost-binary-decimal-mismatch-diagnosed",
  batchNumber: 4,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  standingAuthorization: {
    path: POST_CANARY_BATCH_04_STANDING_AUTHORIZATION,
    sha256: standingAuthorization.sha256,
    boundedFirstDeterministicRecoveryAuthorized: true
  },
  preservedResults: {
    callsCompleted: 4,
    retries: 0,
    requestFailures: 0,
    verifiedMoves: 4,
    unresolvedMoves: 0,
    usageDerivedExecutionCostUsd:
      documents.execution.usageDerivedEstimatedCostUsd,
    approvedMaximumCostUsd: 1,
    approvedCapExceeded: false
  },
  failure: {
    category: "binary-floating-point-strict-equality-validation-mismatch",
    testPath: files.failedTest,
    actualSerializedAggregateCostUsd: serializedAggregateCostUsd,
    expectedExactCostUsd: exactCostUsd,
    strictEqualityEqual: false,
    sevenDecimalNormalizationEqual: true,
    mathematicalCostChanged: false,
    capDispositionChanged: false
  },
  exactCostRepresentation: {
    unit: "one-ten-millionth-dollar",
    inputTokens,
    outputTokens,
    inputUnitsPerToken: 25,
    outputUnitsPerToken: 100,
    exactIntegerUnits,
    exactCostUsd
  },
  boundaries: {
    transcriptsChanged: 0,
    audioFilesAccessed: 0,
    paidCallsAdded: 0,
    modelsExecuted: 0,
    validatorsChanged: 0,
    scoresDerived: 0,
    directIncrementalCostUsd: 0
  },
  sourceHashes,
  nextAuthorizedAction:
    "prepare-and-freeze-one-batch-04-exact-cost-normalization-overlay-under-standing-recovery-authorization"
};

if (shouldWrite) {
  await writeFile(diagnosisPath, `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: diagnosis.status,
      wroteArtifact: shouldWrite,
      exactIntegerUnits,
      exactCostUsd,
      serializedAggregateCostUsd,
      sevenDecimalNormalizationEqual: true,
      audioFilesAccessed: 0,
      paidCallsAdded: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
