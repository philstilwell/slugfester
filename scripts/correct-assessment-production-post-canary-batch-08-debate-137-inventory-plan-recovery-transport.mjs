#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch08StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-08-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-08/inventory-candidate-sharded/plan-recovery-1/debate-137";
const CORRECTION_ROOT = `${ROOT}/transport-correction-1`;
const DIAGNOSIS = `${CORRECTION_ROOT}/diagnosis.json`;
const PLAN = `${CORRECTION_ROOT}/correction-plan.json`;
const PREPARATION = `${CORRECTION_ROOT}/execution-preparation-manifest.json`;
const EXECUTION = `${CORRECTION_ROOT}/execution-record.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const RUNNER =
  "scripts/run-assessment-production-post-canary-batch-08-debate-137-inventory-plan-recovery.mjs";
const CORRECTOR =
  "scripts/correct-assessment-production-post-canary-batch-08-debate-137-inventory-plan-recovery-transport.mjs";
const OLD_VERSION = "codex-cli 0.148.0-alpha.15";
const NEW_VERSION = "codex-cli 0.149.0-alpha.4.1";
const OLD_RUNNER_SHA256 =
  "d366faca1eff97699b6b7703330533ae9d3fc5a5ca357e7728533c0f4c4e2333";
const OLD_ACTIVATION_SHA256 =
  "3fc7ce7c3bca3d6375dd7d000a3aedf4aef14235898a8eaec07ce45876ffbad8";
const PROTOCOL_ID =
  "assessment-production-post-canary-batch-08-debate-137-inventory-plan-recovery-transport-correction-1";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

function replaceExactlyOnce(text, before, after, label) {
  assertV4(text.split(before).length - 1 === 1, `${label}: expected one preimage`);
  return text.replace(before, after);
}

async function proposedOutputs() {
  const runnerBytes = await readFile(RUNNER);
  const activationBytes = await readFile(ACTIVATION);
  assertV4(sha256(runnerBytes) === OLD_RUNNER_SHA256, "runner preimage drifted");
  assertV4(
    sha256(activationBytes) === OLD_ACTIVATION_SHA256,
    "activation preimage drifted"
  );
  const proposedRunnerBytes = Buffer.from(
    replaceExactlyOnce(
      runnerBytes.toString("utf8"),
      `\"${OLD_VERSION}\"`,
      `\"${NEW_VERSION}\"`,
      "runner version assertion"
    )
  );
  const activation = JSON.parse(activationBytes);
  assertV4(
    activation.sourceHashes?.[RUNNER] === OLD_RUNNER_SHA256,
    "activation runner credential drifted"
  );
  activation.sourceHashes[RUNNER] = sha256(proposedRunnerBytes);
  const proposedActivationBytes = jsonBytes(activation);
  return {
    runnerBytes,
    activationBytes,
    proposedRunnerBytes,
    proposedActivationBytes,
  };
}

async function build({ frozenAt, checkpointCommit }) {
  const standing = await loadAndValidatePostCanaryBatch08StandingAuthorization();
  const proposed = await proposedOutputs();
  assertV4(
    execFileSync("/Applications/ChatGPT.app/Contents/Resources/codex", ["--version"], {
      encoding: "utf8",
    }).trim() === NEW_VERSION,
    "observed Codex CLI version changed"
  );
  assertV4(
    !(await exists(`${ROOT}/model-execution.json`)) &&
      !(await exists(`${ROOT}/outputs/debate-137-routes.json`)) &&
      !(await exists(`${ROOT}/outputs/debate-137-sections.json`)),
    "a model output exists; transport-only diagnosis is no longer valid"
  );
  const diagnosis = {
    schemaVersion: "1.0-batch-08-debate-137-inventory-plan-recovery-transport-diagnosis",
    protocolId: PROTOCOL_ID,
    status: "pre-model-codex-cli-version-assertion-mismatch-diagnosed",
    frozenAt,
    checkpointCommit,
    branch: "main",
    debateNumber: "137",
    observedFailure: {
      command: `node ${RUNNER} run`,
      exitCode: 1,
      error: "Codex CLI version drifted",
      expectedVersion: OLD_VERSION,
      observedVersion: NEW_VERSION,
      modelContextsStarted: 0,
      outputFilesWritten: 0,
      retries: 0,
      timeoutExtensions: 0,
    },
    deterministicDiagnosis: {
      category: "pre-model-execution-transport-version-assertion-mismatch",
      cause:
        "The recovery runner retained the audited Batch 4 Codex CLI version literal while Batch 8 already uses the current bundled Codex CLI.",
      correctedField: "runner Codex CLI version equality literal",
      activationCredentialField: `sourceHashes[${JSON.stringify(RUNNER)}]`,
      validatorMeaningChanged: false,
      packetSchemaSourceCandidateOrScoreChanged: false,
    },
    evidence: {
      runner: RUNNER,
      runnerSha256: sha256(proposed.runnerBytes),
      activation: ACTIVATION,
      activationSha256: sha256(proposed.activationBytes),
      standingAuthorization: POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
      standingAuthorizationSha256: standing.sha256,
    },
    costs: {
      directIncrementalCostUsd: 0,
      modelContextsExecuted: 0,
      paidServiceCalls: 0,
    },
    nextAuthorizedAction:
      "freeze-one-transport-version-assertion-and-activation-credential-correction",
  };
  const diagnosisBytes = jsonBytes(diagnosis);
  const plan = {
    schemaVersion: "1.0-batch-08-debate-137-inventory-plan-recovery-transport-correction-plan",
    protocolId: PROTOCOL_ID,
    status: "one-transport-version-and-authenticated-runner-hash-correction-frozen-not-executed",
    frozenAt,
    checkpointCommit,
    branch: "main",
    diagnosis: DIAGNOSIS,
    diagnosisSha256: sha256(diagnosisBytes),
    correctionLevel: 1,
    exactChanges: [
      {
        file: RUNNER,
        field: "Codex CLI version equality literal",
        before: OLD_VERSION,
        after: NEW_VERSION,
      },
      {
        file: ACTIVATION,
        field: `sourceHashes[${JSON.stringify(RUNNER)}]`,
        before: OLD_RUNNER_SHA256,
        after: sha256(proposed.proposedRunnerBytes),
      },
    ],
    lockedPreimages: {
      [RUNNER]: OLD_RUNNER_SHA256,
      [ACTIVATION]: OLD_ACTIVATION_SHA256,
    },
    lockedProposedOutputs: {
      [RUNNER]: sha256(proposed.proposedRunnerBytes),
      [ACTIVATION]: sha256(proposed.proposedActivationBytes),
    },
    executionPolicy: {
      attemptsMaximum: 1,
      retriesMaximum: 0,
      rerunsMaximum: 0,
      timeoutExtensionsMaximum: 0,
      preimageReconstructionRequiredAfterExecution: true,
      resumeModelExecutionOnlyAfterCorrectedValidationPasses: true,
    },
    protectedBoundaries: {
      packetsSchemasSourcesInventoriesCandidatesScoresUnchanged: true,
      modelSettingsSchedulerAndMergeRuleUnchanged: true,
      noModelExecutionInCorrection: true,
      noPaidServices: true,
      directIncrementalCostUsdMaximum: 0,
    },
  };
  const planBytes = jsonBytes(plan);
  const correctorBytes = await readFile(CORRECTOR);
  const preparation = {
    schemaVersion:
      "1.0-batch-08-debate-137-inventory-plan-recovery-transport-correction-execution-preparation",
    protocolId: PROTOCOL_ID,
    status: "frozen-transport-correction-prepared-not-executed",
    frozenAt,
    checkpointCommit,
    branch: "main",
    diagnosis: DIAGNOSIS,
    diagnosisSha256: sha256(diagnosisBytes),
    correctionPlan: PLAN,
    correctionPlanSha256: sha256(planBytes),
    corrector: CORRECTOR,
    correctorSha256: sha256(correctorBytes),
    exactOutputPath: EXECUTION,
    attemptsMaximum: 1,
    directIncrementalCostUsdMaximum: 0,
    modelExecutionAuthorized: false,
    paidServiceCallsAuthorized: false,
    nextRequiredAction: "execute-exact-frozen-transport-correction-once",
  };
  return {
    diagnosisBytes,
    planBytes,
    preparationBytes: jsonBytes(preparation),
    preparation,
    plan,
    proposed,
  };
}

async function prepare() {
  const write = process.argv.includes("--write");
  const index = process.argv.indexOf("--frozen-at");
  const frozenAt = index >= 0 ? process.argv[index + 1] : null;
  assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at required");
  const checkpointCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const built = await build({ frozenAt, checkpointCommit });
  if (write) {
    for (const file of [DIAGNOSIS, PLAN, PREPARATION, EXECUTION]) {
      assertV4(!(await exists(file)), `${file} already exists`);
    }
    await mkdir(path.dirname(DIAGNOSIS), { recursive: true });
    await writeFile(DIAGNOSIS, built.diagnosisBytes);
    await writeFile(PLAN, built.planBytes);
    await writeFile(PREPARATION, built.preparationBytes);
  }
  console.log(
    JSON.stringify(
      {
        status: write ? built.preparation.status : "preview",
        modelContextsExecuted: 0,
        exactChanges: built.plan.exactChanges,
        directIncrementalCostUsd: 0,
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
  assertV4(
    sha256(await readFile(DIAGNOSIS)) === sha256(built.diagnosisBytes) &&
      sha256(await readFile(PLAN)) === sha256(built.planBytes) &&
      sha256(await readFile(PREPARATION)) === sha256(built.preparationBytes) &&
      !(await exists(EXECUTION)),
    "frozen transport correction preparation drifted"
  );
  console.log(
    JSON.stringify(
      {
        status: "passed-frozen-transport-correction-preparation",
        attempts: 0,
        modelContextsExecuted: 0,
        directIncrementalCostUsd: 0,
      },
      null,
      2
    )
  );
}

async function executeCorrection() {
  const write = process.argv.includes("--write");
  const index = process.argv.indexOf("--executed-at");
  const executedAt = index >= 0 ? process.argv[index + 1] : null;
  assertV4(executedAt && !Number.isNaN(Date.parse(executedAt)), "--executed-at required");
  await validatePreparation();
  const preparationBytes = await readFile(PREPARATION);
  const planBytes = await readFile(PLAN);
  const plan = JSON.parse(planBytes);
  const proposed = await proposedOutputs();
  assertV4(
    sha256(proposed.proposedRunnerBytes) === plan.lockedProposedOutputs[RUNNER] &&
      sha256(proposed.proposedActivationBytes) === plan.lockedProposedOutputs[ACTIVATION],
    "proposed correction output drifted"
  );
  const execution = {
    schemaVersion:
      "1.0-batch-08-debate-137-inventory-plan-recovery-transport-correction-execution",
    protocolId: PROTOCOL_ID,
    status: "frozen-transport-correction-passed",
    executedAt,
    branch: "main",
    preparation: PREPARATION,
    preparationSha256: sha256(preparationBytes),
    correctionPlan: PLAN,
    correctionPlanSha256: sha256(planBytes),
    attemptCount: 1,
    retries: 0,
    reruns: 0,
    timeoutExtensions: 0,
    preimages: plan.lockedPreimages,
    outputs: plan.lockedProposedOutputs,
    preimageReconstructionPassed: true,
    correctedCodexCliVersionObserved: NEW_VERSION,
    modelContextsExecuted: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0,
    nextAuthorizedAction:
      "resume-two-frozen-debate-137-inventory-plan-recovery-contexts",
  };
  if (write) {
    assertV4(!(await exists(EXECUTION)), `${EXECUTION} already exists`);
    await writeFile(RUNNER, proposed.proposedRunnerBytes);
    await writeFile(ACTIVATION, proposed.proposedActivationBytes);
    await writeFile(EXECUTION, jsonBytes(execution));
  }
  console.log(JSON.stringify(write ? execution : { ...execution, status: "preview" }, null, 2));
}

async function validateExecution() {
  const [runnerBytes, activationBytes, planBytes, executionBytes] = await Promise.all([
    readFile(RUNNER),
    readFile(ACTIVATION),
    readFile(PLAN),
    readFile(EXECUTION),
  ]);
  const plan = JSON.parse(planBytes);
  const execution = JSON.parse(executionBytes);
  assertV4(
    sha256(runnerBytes) === plan.lockedProposedOutputs[RUNNER] &&
      sha256(activationBytes) === plan.lockedProposedOutputs[ACTIVATION] &&
      execution.status === "frozen-transport-correction-passed" &&
      execution.attemptCount === 1 &&
      execution.retries === 0 &&
      execution.reruns === 0 &&
      execution.timeoutExtensions === 0 &&
      execution.modelContextsExecuted === 0 &&
      execution.directIncrementalCostUsd === 0,
    "corrected transport outputs drifted"
  );
  const reconstructedRunner = Buffer.from(
    replaceExactlyOnce(
      runnerBytes.toString("utf8"),
      `\"${NEW_VERSION}\"`,
      `\"${OLD_VERSION}\"`,
      "runner preimage reconstruction"
    )
  );
  const activation = JSON.parse(activationBytes);
  assertV4(
    activation.sourceHashes?.[RUNNER] === sha256(runnerBytes),
    "corrected activation runner credential drifted"
  );
  activation.sourceHashes[RUNNER] = OLD_RUNNER_SHA256;
  assertV4(
    sha256(reconstructedRunner) === OLD_RUNNER_SHA256 &&
      sha256(jsonBytes(activation)) === OLD_ACTIVATION_SHA256 &&
      execFileSync("/Applications/ChatGPT.app/Contents/Resources/codex", ["--version"], {
        encoding: "utf8",
      }).trim() === NEW_VERSION,
    "transport preimage reconstruction or current version validation failed"
  );
  console.log(
    JSON.stringify(
      {
        status: "passed-corrected-transport-and-reconstructed-preimages",
        attemptCount: 1,
        modelContextsExecuted: 0,
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
else if (command === "execute") await executeCorrection();
else if (command === "validate-execution") await validateExecution();
else throw new Error("usage: ... prepare|validate-preparation|execute|validate-execution");
