#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-03/publication-reconstruction/resumption-1/repair-1";
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const FAILED_ACTIVATION = `${ROOT}/execution-activation.json`;
const PRESERVED_ACTIVATION = `${ROOT}/execution-activation-failed-harness.json`;
const CORRECTION = `${ROOT}/execution-harness-correction-1.json`;
const RUNNER =
  "scripts/run-assessment-production-post-canary-batch-03-publication-resumption-repair.mjs";
const CORRECTION_SCRIPT =
  "scripts/correct-assessment-production-post-canary-batch-03-publication-resumption-repair-harness.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

assertV4(await exists(FAILED_ACTIVATION), "the rejected activation record is missing");
assertV4(!(await exists(PRESERVED_ACTIVATION)), "the rejected activation was already preserved");
assertV4(!(await exists(CORRECTION)), "the correction record already exists");
assertV4(!(await exists(`${ROOT}/model-execution.json`)), "a model execution record already exists");

const preparationBytes = await readFile(path.resolve(PREPARATION));
const preparation = JSON.parse(preparationBytes);
const failedActivationBytes = await readFile(path.resolve(FAILED_ACTIVATION));
const failedActivation = JSON.parse(failedActivationBytes);
const correctedRunnerBytes = await readFile(path.resolve(RUNNER));
const correctionScriptBytes = await readFile(path.resolve(CORRECTION_SCRIPT));
const originalRunnerBytes = Buffer.from(
  execFileSync("git", ["show", `HEAD:${RUNNER}`], { encoding: "utf8" })
);

assertV4(
  failedActivation.status ===
      "frozen-three-isolated-five-field-batch-03-publication-resumption-repair-contexts-authorized-under-failure-recovery-standing-authorization" &&
    failedActivation.batchNumber === 3 &&
    failedActivation.contexts?.length === 3,
  "the rejected activation record changed"
);
assertV4(
  String(originalRunnerBytes).includes("activation.batchNumber === 1") &&
    String(correctedRunnerBytes).includes("activation.batchNumber === 3") &&
    !String(correctedRunnerBytes).includes("activation.batchNumber === 1"),
  "the bounded harness correction is not the expected one-line Batch 3 fix"
);
assertV4(
  preparation.sourceHashes[RUNNER] === sha256(originalRunnerBytes),
  "the frozen manifest does not authenticate the rejected runner"
);

const correction = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-03-publication-resumption-repair-execution-harness-correction",
  protocolId: preparation.protocolId,
  status: "frozen-batch-03-publication-resumption-repair-execution-harness-correction-1",
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  failure: {
    category: "deterministic-execution-harness-validation",
    message: "the runner expected Batch 1 although the frozen activation correctly identifies Batch 3",
    rejectedActivationPath: PRESERVED_ACTIVATION,
    rejectedActivationSha256: sha256(failedActivationBytes),
    contextsAttempted: 0,
    modelContextsExecuted: 0
  },
  correction: {
    path: RUNNER,
    exactChange: "activation.batchNumber === 1 -> activation.batchNumber === 3",
    originalSha256: sha256(originalRunnerBytes),
    correctedSha256: sha256(correctedRunnerBytes),
    validatorMeaningChanged: false,
    packetsChanged: false,
    schemasChanged: false,
    contextsChanged: false,
    modelSettingsChanged: false,
    executionControlsChanged: false
  },
  authorization: {
    source: "Batch 3 failure-recovery standing authorization",
    deterministicExecutionHarnessCorrection: true,
    activationCredentialRegeneration: true,
    attemptsMaximumAfterCorrectedGate: 1,
    retriesMaximum: 0,
    paidServices: false,
    directIncrementalCostUsdMaximum: 0
  },
  correctionScript: {
    path: CORRECTION_SCRIPT,
    sha256: sha256(correctionScriptBytes)
  },
  nextRequiredAction:
    "regenerate-activation-and-execute-three-hash-locked-repair-contexts-once"
};
const correctionBytes = Buffer.from(`${JSON.stringify(correction, null, 2)}\n`);
await writeFile(path.resolve(CORRECTION), correctionBytes);

preparation.executionHarnessCorrection = {
  path: CORRECTION,
  sha256: sha256(correctionBytes),
  correctedRunner: RUNNER,
  correctedRunnerSha256: sha256(correctedRunnerBytes)
};
preparation.sourceHashes[RUNNER] = sha256(correctedRunnerBytes);
preparation.sourceHashes[CORRECTION] = sha256(correctionBytes);
preparation.sourceHashes[CORRECTION_SCRIPT] = sha256(correctionScriptBytes);
preparation.totals.deterministicHarnessCorrections = 1;
await writeFile(
  path.resolve(PREPARATION),
  `${JSON.stringify(preparation, null, 2)}\n`
);
await rename(path.resolve(FAILED_ACTIVATION), path.resolve(PRESERVED_ACTIVATION));

console.log(
  JSON.stringify(
    {
      status: correction.status,
      correctedField: "activation.batchNumber",
      originalExpectedValue: 1,
      correctedExpectedValue: 3,
      contextsAttempted: 0,
      modelContextsExecuted: 0,
      directIncrementalCostUsd: 0,
      nextRequiredAction: correction.nextRequiredAction
    },
    null,
    2
  )
);
