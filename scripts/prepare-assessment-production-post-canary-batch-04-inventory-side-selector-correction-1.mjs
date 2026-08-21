#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_04_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch04StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-04-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/inventory-candidate-sharded";
const CORRECTION_ROOT = `${ROOT}/side-selector-correction-1`;
const ORIGINAL_ACTIVATION = `${ROOT}/side-execution-activation.json`;
const ORIGINAL_RUNNER =
  "scripts/run-assessment-production-post-canary-batch-04-inventory-side-selectors.mjs";
const ORIGINAL_ANALYZER =
  "scripts/analyze-assessment-production-post-canary-batch-04-inventory-side-selectors.mjs";
const CORRECTED_RUNNER =
  "scripts/run-assessment-production-post-canary-batch-04-inventory-side-selectors-correction-1.mjs";
const CORRECTED_ANALYZER =
  "scripts/analyze-assessment-production-post-canary-batch-04-inventory-side-selectors-correction-1.mjs";
const PREPARER =
  "scripts/prepare-assessment-production-post-canary-batch-04-inventory-side-selector-correction-1.mjs";
const DIAGNOSIS = `${CORRECTION_ROOT}/diagnosis.json`;
const PLAN = `${CORRECTION_ROOT}/correction-plan.json`;
const PREPARATION = `${CORRECTION_ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${CORRECTION_ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/side-model-execution.json`;
const ANALYSIS = `${ROOT}/inventory-analysis.json`;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

async function loadBoundary() {
  const [activationBytes, originalRunnerBytes, originalAnalyzerBytes, correctedRunnerBytes, correctedAnalyzerBytes] =
    await Promise.all([
      readFile(ORIGINAL_ACTIVATION),
      readFile(ORIGINAL_RUNNER),
      readFile(ORIGINAL_ANALYZER),
      readFile(CORRECTED_RUNNER),
      readFile(CORRECTED_ANALYZER),
    ]);
  const activation = JSON.parse(activationBytes);
  const standingAuthorization =
    await loadAndValidatePostCanaryBatch04StandingAuthorization();
  assertV4(
    activation.status ===
      "frozen-twenty-post-canary-batch-04-side-selector-contexts-authorized" &&
      activation.batchNumber === 4 &&
      activation.userAuthorization.standingAuthorization ===
        POST_CANARY_BATCH_04_STANDING_AUTHORIZATION &&
      activation.userAuthorization.standingAuthorizationSha256 ===
        standingAuthorization.sha256 &&
      activation.authorization.sideSelectorModelContexts === true &&
      activation.authorization.retry === false &&
      activation.authorization.timeoutExtension === false &&
      activation.executionPolicy.contexts === 20 &&
      activation.executionPolicy.attemptsPerContext === 1 &&
      activation.executionPolicy.retriesMaximum === 0 &&
      activation.executionPolicy.timeoutExtensionsMaximum === 0 &&
      activation.executionPolicy.maximumParallelContexts === 2 &&
      JSON.stringify(activation.executionPolicy.schedulerRamp) ===
        JSON.stringify([1, 2]) &&
      activation.model.label === "5.6 Sol" &&
      activation.model.slug === "gpt-5.6-sol" &&
      activation.model.reasoningEffort === "low" &&
      activation.model.authentication === "ChatGPT subscription" &&
      activation.model.scoreBlind === true &&
      !(await exists(EXECUTION)) &&
      !(await exists(ANALYSIS)),
    "preserved side-selector pre-execution boundary drifted"
  );
  for (const [file, digest] of Object.entries(activation.sourceHashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: frozen source drifted`);
  }
  const expectedRunner = originalRunnerBytes
    .toString()
    .replace(
      "const ACTIVATION = `${ROOT}/side-execution-activation.json`;",
      "const ACTIVATION = `${ROOT}/side-selector-correction-1/execution-activation.json`;"
    )
    .replace("activation.batchNumber === 3 &&", "activation.batchNumber === 4 &&");
  const expectedAnalyzer = originalAnalyzerBytes
    .toString()
    .replace(
      "const ACTIVATION = `${ROOT}/side-execution-activation.json`;",
      "const ACTIVATION = `${ROOT}/side-selector-correction-1/execution-activation.json`;"
    );
  assertV4(
    correctedRunnerBytes.toString() === expectedRunner &&
      correctedAnalyzerBytes.toString() === expectedAnalyzer,
    "corrected harness delta exceeds the diagnosed activation binding and batch-number literal"
  );
  return {
    activation,
    activationBytes,
    originalRunnerBytes,
    originalAnalyzerBytes,
    correctedRunnerBytes,
    correctedAnalyzerBytes,
    standingAuthorization,
  };
}

async function build({ frozenAt, checkpointCommit }) {
  const boundary = await loadBoundary();
  const diagnosis = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-04-side-selector-activation-harness-diagnosis",
    status:
      "pre-execution-side-selector-activation-rejected-by-stale-batch-number-literal",
    frozenAt,
    checkpointCommit,
    branch: "main",
    originalActivation: ORIGINAL_ACTIVATION,
    originalActivationSha256: sha256(boundary.activationBytes),
    originalRunner: ORIGINAL_RUNNER,
    originalRunnerSha256: sha256(boundary.originalRunnerBytes),
    observedFailure: {
      category: "deterministic-execution-harness-credential-validation",
      message: "post-canary Batch 4 side-selector execution is unauthorized",
      failingAssertion: "activation.batchNumber === 3",
      frozenCredentialValue: boundary.activation.batchNumber,
      expectedCorrectValue: 4,
      modelTransportStarted: false,
      modelContextsAttempted: 0,
      modelOutputsWritten: 0,
      executionRecordWritten: false,
    },
    diagnosis: {
      activationCredentialValidForBatchFour: true,
      runnerRetainedBatchThreeLiteralAfterMechanicalSuccessorCreation: true,
      packetSchemaSourceCandidateOrModelSettingChanged: false,
      correctionCategory:
        "bounded-first-deterministic-execution-harness-correction",
    },
    directIncrementalCostUsd: 0,
    paidServiceCalls: 0,
  };
  const diagnosisBytes = jsonBytes(diagnosis);
  const plan = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-04-side-selector-harness-correction-plan",
    status:
      "single-bounded-side-selector-harness-correction-frozen-not-activated",
    frozenAt,
    checkpointCommit,
    diagnosis: DIAGNOSIS,
    diagnosisSha256: sha256(diagnosisBytes),
    standingAuthorization: POST_CANARY_BATCH_04_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: boundary.standingAuthorization.sha256,
    recoveryAttempt: 1,
    recoveryAttemptsMaximum: 1,
    exactCorrection: {
      runnerSource: ORIGINAL_RUNNER,
      runnerSourceSha256: sha256(boundary.originalRunnerBytes),
      correctedRunner: CORRECTED_RUNNER,
      correctedRunnerSha256: sha256(boundary.correctedRunnerBytes),
      changedAssertion: {
        from: "activation.batchNumber === 3",
        to: "activation.batchNumber === 4",
      },
      correctedActivationBinding: ACTIVATION,
      analyzerSource: ORIGINAL_ANALYZER,
      analyzerSourceSha256: sha256(boundary.originalAnalyzerBytes),
      correctedAnalyzer: CORRECTED_ANALYZER,
      correctedAnalyzerSha256: sha256(boundary.correctedAnalyzerBytes),
      validatorMeaningChanged: false,
    },
    preserved: {
      contexts: 20,
      packets: 20,
      schemas: 20,
      sourceHashes: Object.keys(boundary.activation.sourceHashes).length,
      model: structuredClone(boundary.activation.model),
      schedulerRamp: [1, 2],
      attemptsPerContext: 1,
      retries: 0,
      timeoutExtensions: 0,
      sourceCandidateAndPlanHashesUnchanged: true,
    },
    stopRules: {
      secondFailureBlocks: true,
      retryBlocks: true,
      timeoutExtensionBlocks: true,
      recursiveCorrectionBlocks: true,
      sourcePacketSchemaCandidatePlanOrModelChangeBlocks: true,
      paidServiceBlocks: true,
    },
    directIncrementalCostUsdMaximum: 0,
  };
  const planBytes = jsonBytes(plan);
  const sourceHashes = {
    [ORIGINAL_ACTIVATION]: sha256(boundary.activationBytes),
    [ORIGINAL_RUNNER]: sha256(boundary.originalRunnerBytes),
    [ORIGINAL_ANALYZER]: sha256(boundary.originalAnalyzerBytes),
    [CORRECTED_RUNNER]: sha256(boundary.correctedRunnerBytes),
    [CORRECTED_ANALYZER]: sha256(boundary.correctedAnalyzerBytes),
    [PREPARER]: sha256(await readFile(PREPARER)),
    [POST_CANARY_BATCH_04_STANDING_AUTHORIZATION]:
      boundary.standingAuthorization.sha256,
    [DIAGNOSIS]: sha256(diagnosisBytes),
    [PLAN]: sha256(planBytes),
  };
  const preparation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-04-side-selector-harness-correction-execution-preparation",
    status:
      "single-bounded-side-selector-harness-correction-prepared-not-activated",
    frozenAt,
    checkpointCommit,
    branch: "main",
    diagnosis: DIAGNOSIS,
    diagnosisSha256: sha256(diagnosisBytes),
    correctionPlan: PLAN,
    correctionPlanSha256: sha256(planBytes),
    originalActivation: ORIGINAL_ACTIVATION,
    originalActivationSha256: sha256(boundary.activationBytes),
    correctedActivation: ACTIVATION,
    correctedRunner: CORRECTED_RUNNER,
    correctedRunnerSha256: sha256(boundary.correctedRunnerBytes),
    correctedAnalyzer: CORRECTED_ANALYZER,
    correctedAnalyzerSha256: sha256(boundary.correctedAnalyzerBytes),
    protectedSourceHashes: structuredClone(boundary.activation.sourceHashes),
    sourceHashes,
    futureOutputPathsExcludedFromSourceHashes: [ACTIVATION, EXECUTION, ANALYSIS],
    executionControls: {
      contexts: 20,
      schedulerRamp: [1, 2],
      maximumParallelContexts: 2,
      attemptsPerContext: 1,
      retriesMaximum: 0,
      timeoutExtensionsMaximum: 0,
      modelExecutionAuthorized: false,
      separateActivationRequired: true,
    },
    costBoundary: {
      authentication: "ChatGPT subscription",
      directIncrementalCostUsdMaximum: 0,
      meteredApiCostUsdMaximum: 0,
      paidServiceCallsMaximum: 0,
    },
    nextRequiredAction:
      "create-and-validate-one-corrected-side-selector-activation-credential",
  };
  return {
    boundary,
    files: new Map([
      [DIAGNOSIS, diagnosisBytes],
      [PLAN, planBytes],
      [PREPARATION, jsonBytes(preparation)],
    ]),
    preparation,
  };
}

async function prepare() {
  const shouldWrite = process.argv.includes("--write");
  const frozenIndex = process.argv.indexOf("--frozen-at");
  const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
  assertV4(
    frozenAt && !Number.isNaN(Date.parse(frozenAt)),
    "--frozen-at requires an ISO timestamp"
  );
  const checkpointCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const built = await build({ frozenAt, checkpointCommit });
  for (const file of built.files.keys()) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
  if (shouldWrite) {
    for (const [file, bytes] of built.files) {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes);
    }
  }
  console.log(
    JSON.stringify(
      {
        status: shouldWrite ? built.preparation.status : "preview",
        failureCategory: "deterministic-execution-harness-credential-validation",
        modelContextsAttempted: 0,
        correctedAssertion: "activation.batchNumber === 4",
        contextsPreserved: 20,
        packetsPreserved: 20,
        retriesMaximum: 0,
        timeoutExtensionsMaximum: 0,
        directIncrementalCostUsdMaximum: 0,
      },
      null,
      2
    )
  );
}

async function validatePreparation() {
  const preparation = JSON.parse(await readFile(PREPARATION, "utf8"));
  const built = await build({
    frozenAt: preparation.frozenAt,
    checkpointCommit: preparation.checkpointCommit,
  });
  for (const [file, bytes] of built.files) {
    assertV4(sha256(await readFile(file)) === sha256(bytes), `${file}: drifted`);
  }
  for (const [file, digest] of Object.entries(preparation.protectedSourceHashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: protected source drifted`);
  }
  for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
    assertV4(!(await exists(future)), `future output already exists: ${future}`);
  }
  console.log(
    JSON.stringify(
      {
        status: "passed-frozen-side-selector-harness-correction-preparation",
        modelContextsAttempted: 0,
        contextsPreserved: 20,
        correctedFiles: 2,
        directIncrementalCostUsd: 0,
      },
      null,
      2
    )
  );
}

async function activate() {
  const shouldWrite = process.argv.includes("--write");
  const activatedIndex = process.argv.indexOf("--activated-at");
  const activatedAt =
    activatedIndex >= 0 ? process.argv[activatedIndex + 1] : null;
  assertV4(
    activatedAt && !Number.isNaN(Date.parse(activatedAt)),
    "--activated-at requires an ISO timestamp"
  );
  const preparationBytes = await readFile(PREPARATION);
  const preparation = JSON.parse(preparationBytes);
  const boundary = await loadBoundary();
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: correction source drifted`);
  }
  for (const [file, digest] of Object.entries(preparation.protectedSourceHashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: protected source drifted`);
  }
  assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
  const activation = structuredClone(boundary.activation);
  activation.schemaVersion =
    "1.0-assessment-production-post-canary-batch-04-side-selector-execution-correction-1-activation";
  activation.activatedAt = activatedAt;
  activation.checkpointCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  activation.userAuthorization = {
    ...activation.userAuthorization,
    scope:
      "activate exactly one bounded Batch 4 side-selector execution-harness correction and execute the unchanged twenty frozen contexts",
    boundedFirstRecoveryAuthorized: true,
    recoveryAttempt: 1,
    recoveryAttemptsMaximum: 1,
  };
  activation.correction = {
    diagnosis: DIAGNOSIS,
    diagnosisSha256: preparation.diagnosisSha256,
    correctionPlan: PLAN,
    correctionPlanSha256: preparation.correctionPlanSha256,
    preparation: PREPARATION,
    preparationSha256: sha256(preparationBytes),
    originalActivation: ORIGINAL_ACTIVATION,
    originalActivationSha256: sha256(boundary.activationBytes),
    correctedRunner: CORRECTED_RUNNER,
    correctedRunnerSha256: preparation.correctedRunnerSha256,
    correctedAnalyzer: CORRECTED_ANALYZER,
    correctedAnalyzerSha256: preparation.correctedAnalyzerSha256,
    modelContextsAttemptedBeforeCorrection: 0,
  };
  activation.sourceHashes = structuredClone(boundary.activation.sourceHashes);
  delete activation.sourceHashes[ORIGINAL_RUNNER];
  delete activation.sourceHashes[ORIGINAL_ANALYZER];
  Object.assign(activation.sourceHashes, preparation.sourceHashes, {
    [PREPARATION]: sha256(preparationBytes),
    [ORIGINAL_ACTIVATION]: sha256(boundary.activationBytes),
  });
  activation.futureOutputPathsExcludedFromSourceHashes =
    boundary.activation.futureOutputPathsExcludedFromSourceHashes;
  activation.nextRequiredAction =
    "execute-the-unchanged-twenty-frozen-side-selector-contexts-once-with-corrected-harness";
  if (shouldWrite) await writeFile(ACTIVATION, jsonBytes(activation));
  console.log(
    JSON.stringify(
      {
        status: shouldWrite ? activation.status : "preview",
        correction: "activation.batchNumber 3 -> 4",
        contexts: 20,
        model: activation.model,
        modelContextsPreviouslyAttempted: 0,
        attemptsPerContext: 1,
        retriesMaximum: 0,
        timeoutExtensionsMaximum: 0,
        directIncrementalCostUsdMaximum: 0,
      },
      null,
      2
    )
  );
}

async function validateActivation() {
  const activation = JSON.parse(await readFile(ACTIVATION, "utf8"));
  assertV4(
    activation.batchNumber === 4 &&
      activation.correction.recoveryAttempt === undefined &&
      activation.userAuthorization.recoveryAttempt === 1 &&
      activation.userAuthorization.recoveryAttemptsMaximum === 1 &&
      activation.correction.modelContextsAttemptedBeforeCorrection === 0 &&
      activation.executionPolicy.contexts === 20 &&
      activation.model.label === "5.6 Sol" &&
      activation.model.reasoningEffort === "low",
    "corrected activation controls drifted"
  );
  for (const [file, digest] of Object.entries(activation.sourceHashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: corrected activation source drifted`);
  }
  const preflight = JSON.parse(
    execFileSync(process.execPath, [CORRECTED_RUNNER, "--preflight-only"], {
      encoding: "utf8",
    })
  );
  assertV4(
    preflight.status === "passed-model-free-preflight" &&
      preflight.contexts === 20 &&
      preflight.modelContextsExecuted === 0 &&
      preflight.retriesMaximum === 0 &&
      preflight.timeoutExtensionsMaximum === 0,
    "corrected runner preflight failed"
  );
  console.log(
    JSON.stringify(
      {
        status: "passed-corrected-side-selector-execution-activation",
        contexts: 20,
        model: activation.model,
        modelContextsAttempted: 0,
        retriesMaximum: 0,
        timeoutExtensionsMaximum: 0,
        directIncrementalCostUsd: 0,
      },
      null,
      2
    )
  );
}

const command = process.argv[2];
if (command === "prepare") await prepare();
else if (command === "validate-preparation") await validatePreparation();
else if (command === "activate") await activate();
else if (command === "validate-activation") await validateActivation();
else throw new Error("usage: ... prepare|validate-preparation|activate|validate-activation");
