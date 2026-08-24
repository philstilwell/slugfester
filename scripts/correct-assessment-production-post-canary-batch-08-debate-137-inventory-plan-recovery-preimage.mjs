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
const CORRECTION_ROOT = `${ROOT}/transport-correction-2`;
const DIAGNOSIS = `${CORRECTION_ROOT}/diagnosis.json`;
const PLAN = `${CORRECTION_ROOT}/correction-plan.json`;
const PREPARATION = `${CORRECTION_ROOT}/execution-preparation-manifest.json`;
const EXECUTION = `${CORRECTION_ROOT}/execution-record.json`;
const FAILURE = `${ROOT}/transport-correction-1/post-correction-validation-failure.json`;
const ORIGINAL_PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const RUNNER =
  "scripts/run-assessment-production-post-canary-batch-08-debate-137-inventory-plan-recovery.mjs";
const CORRECTOR =
  "scripts/correct-assessment-production-post-canary-batch-08-debate-137-inventory-plan-recovery-preimage.mjs";
const CORRECTION_1_RUNNER_SHA256 =
  "957aaa24c0d61d78b8956044a4b00a81dc93dee6734f07181fe6d7f956f9ef77";
const CORRECTION_1_ACTIVATION_SHA256 =
  "3b3ef9cfb11bd64b7d95c24e2a62874c3d65ba9dcd83c3901a9c8ba662de1e55";
const ORIGINAL_RUNNER_SHA256 =
  "d366faca1eff97699b6b7703330533ae9d3fc5a5ca357e7728533c0f4c4e2333";
const ORIGINAL_PREPARATION_SHA256 =
  "b194bde2f8a756f789d178f0bbe346cb802e1e616f04ac21bee26830404a7c8e";
const FAILURE_SHA256 =
  "4ec5e9e5669a55020064ef92551e8eaa602239dff016bb28e2a29b0ec83efbe4";
const BEFORE = `  for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
    assertV4(sha256(await readFile(file)) === digest, \`\${file}: recovery source drifted\`);
  }`;
const AFTER = `  for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
    const bytes = await readFile(file);
    if (file === RUNNER) {
      const currentSource = bytes.toString("utf8");
      const currentVersionLiteral = '"codex-cli 0.149.0-alpha.4.1"';
      const originalVersionLiteral = '"codex-cli 0.148.0-alpha.15"';
      assertV4(
        currentSource.split(currentVersionLiteral).length - 1 === 1,
        "recovery runner preimage reconstruction boundary drifted"
      );
      const reconstructedPreimage = Buffer.from(
        currentSource.replace(currentVersionLiteral, originalVersionLiteral)
      );
      assertV4(
        sha256(reconstructedPreimage) === digest,
        \`\${file}: reconstructed recovery source preimage drifted\`
      );
    } else {
      assertV4(sha256(bytes) === digest, \`\${file}: recovery source drifted\`);
    }
  }`;
const PROTOCOL_ID =
  "assessment-production-post-canary-batch-08-debate-137-inventory-plan-recovery-transport-correction-2";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

function replaceExactlyOnce(text, before, after, label) {
  assertV4(text.split(before).length - 1 === 1, `${label}: expected one preimage`);
  return text.replace(before, after);
}

async function proposedOutputs() {
  const [runnerBytes, activationBytes, preparationBytes, failureBytes] =
    await Promise.all([
      readFile(RUNNER),
      readFile(ACTIVATION),
      readFile(ORIGINAL_PREPARATION),
      readFile(FAILURE),
    ]);
  assertV4(
    sha256(runnerBytes) === CORRECTION_1_RUNNER_SHA256 &&
      sha256(activationBytes) === CORRECTION_1_ACTIVATION_SHA256 &&
      sha256(preparationBytes) === ORIGINAL_PREPARATION_SHA256 &&
      sha256(failureBytes) === FAILURE_SHA256,
    "recursive transport correction preimage drifted"
  );
  const proposedRunnerBytes = Buffer.from(
    replaceExactlyOnce(
      runnerBytes.toString("utf8"),
      BEFORE,
      AFTER,
      "loadPreparation authentication loop"
    )
  );
  const activation = JSON.parse(activationBytes);
  assertV4(
    activation.sourceHashes?.[RUNNER] === CORRECTION_1_RUNNER_SHA256,
    "correction-1 activation credential drifted"
  );
  activation.sourceHashes[RUNNER] = sha256(proposedRunnerBytes);
  return {
    runnerBytes,
    activationBytes,
    proposedRunnerBytes,
    proposedActivationBytes: jsonBytes(activation),
  };
}

async function build({ frozenAt, checkpointCommit }) {
  const standing = await loadAndValidatePostCanaryBatch08StandingAuthorization();
  const proposed = await proposedOutputs();
  assertV4(
    standing.record.recoveryControls.recursiveCorrectionsMaximum === 1 &&
      standing.record.stopRules.failedSecondBoundedCorrectionBlocks === true,
    "recursive transport recovery authority drifted"
  );
  const diagnosis = {
    schemaVersion:
      "1.0-batch-08-debate-137-inventory-plan-recovery-transport-correction-2-diagnosis",
    protocolId: PROTOCOL_ID,
    status: "correction-1-post-validation-preimage-authentication-mismatch-diagnosed",
    frozenAt,
    checkpointCommit,
    branch: "main",
    debateNumber: "137",
    failure: FAILURE,
    failureSha256: FAILURE_SHA256,
    deterministicDiagnosis: {
      category: "post-correction-preimage-authentication-mismatch",
      exactFailureSource: "loadPreparation direct authentication of the runner",
      correction:
        "Reconstruct the exact pre-correction runner only for the unchanged preparation-manifest check, and retain direct authentication of the current runner in loadActivation.",
      recursiveRecoveryLevel: 2,
      preparationManifestChanged: false,
      validatorMeaningChanged: false,
      modelContextsExecuted: 0,
    },
    standingAuthorization: POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standing.sha256,
    directIncrementalCostUsd: 0,
    nextAuthorizedAction:
      "freeze-one-final-runner-preimage-overlay-and-activation-credential-update",
  };
  const diagnosisBytes = jsonBytes(diagnosis);
  const plan = {
    schemaVersion:
      "1.0-batch-08-debate-137-inventory-plan-recovery-transport-correction-2-plan",
    protocolId: PROTOCOL_ID,
    status: "one-final-preimage-reconstruction-overlay-frozen-not-executed",
    frozenAt,
    checkpointCommit,
    branch: "main",
    diagnosis: DIAGNOSIS,
    diagnosisSha256: sha256(diagnosisBytes),
    correctionLevel: 2,
    noFurtherRecoveryForUnderlyingProblem: true,
    exactChanges: [
      {
        file: RUNNER,
        field: "loadPreparation runner-source authentication branch",
        beforeSha256: CORRECTION_1_RUNNER_SHA256,
        afterSha256: sha256(proposed.proposedRunnerBytes),
      },
      {
        file: ACTIVATION,
        field: `sourceHashes[${JSON.stringify(RUNNER)}]`,
        before: CORRECTION_1_RUNNER_SHA256,
        after: sha256(proposed.proposedRunnerBytes),
      },
    ],
    lockedPreimages: {
      [RUNNER]: CORRECTION_1_RUNNER_SHA256,
      [ACTIVATION]: CORRECTION_1_ACTIVATION_SHA256,
      [ORIGINAL_PREPARATION]: ORIGINAL_PREPARATION_SHA256,
      [FAILURE]: FAILURE_SHA256,
    },
    lockedProposedOutputs: {
      [RUNNER]: sha256(proposed.proposedRunnerBytes),
      [ACTIVATION]: sha256(proposed.proposedActivationBytes),
    },
    overlayRule: {
      preparationCredentialAuthenticatesReconstructedOriginalRunner: true,
      activationCredentialAuthenticatesAcceptedCurrentRunner: true,
      originalRunnerSha256: ORIGINAL_RUNNER_SHA256,
      preparationManifestByteIdentical: true,
    },
    executionPolicy: {
      attemptsMaximum: 1,
      retriesMaximum: 0,
      rerunsMaximum: 0,
      timeoutExtensionsMaximum: 0,
      completeOriginalRecoveryValidationRequired: true,
      resumeModelsOnlyAfterValidationPasses: true,
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
      "1.0-batch-08-debate-137-inventory-plan-recovery-transport-correction-2-execution-preparation",
    protocolId: PROTOCOL_ID,
    status: "frozen-final-transport-preimage-correction-prepared-not-executed",
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
    nextRequiredAction: "execute-final-frozen-transport-preimage-correction-once",
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
        correctionLevel: 2,
        modelContextsExecuted: 0,
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
    "frozen final transport correction preparation drifted"
  );
  console.log(
    JSON.stringify(
      {
        status: "passed-frozen-final-transport-preimage-correction-preparation",
        correctionLevel: 2,
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
    "final proposed transport outputs drifted"
  );
  const execution = {
    schemaVersion:
      "1.0-batch-08-debate-137-inventory-plan-recovery-transport-correction-2-execution",
    protocolId: PROTOCOL_ID,
    status: "frozen-final-transport-preimage-correction-passed",
    executedAt,
    branch: "main",
    preparation: PREPARATION,
    preparationSha256: sha256(preparationBytes),
    correctionPlan: PLAN,
    correctionPlanSha256: sha256(planBytes),
    correctionLevel: 2,
    attemptCount: 1,
    retries: 0,
    reruns: 0,
    timeoutExtensions: 0,
    preimages: plan.lockedPreimages,
    outputs: plan.lockedProposedOutputs,
    modelContextsExecuted: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0,
    nextAuthorizedAction: "validate-original-recovery-and-resume-two-frozen-contexts",
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
      execution.status === "frozen-final-transport-preimage-correction-passed" &&
      execution.correctionLevel === 2 &&
      execution.attemptCount === 1 &&
      execution.retries === 0 &&
      execution.reruns === 0 &&
      execution.timeoutExtensions === 0 &&
      execution.modelContextsExecuted === 0 &&
      execution.directIncrementalCostUsd === 0,
    "final corrected transport outputs drifted"
  );
  const reconstructedCorrection1Runner = Buffer.from(
    replaceExactlyOnce(
      runnerBytes.toString("utf8"),
      AFTER,
      BEFORE,
      "correction-1 runner reconstruction"
    )
  );
  const activation = JSON.parse(activationBytes);
  assertV4(
    activation.sourceHashes?.[RUNNER] === sha256(runnerBytes),
    "final activation credential drifted"
  );
  activation.sourceHashes[RUNNER] = CORRECTION_1_RUNNER_SHA256;
  assertV4(
    sha256(reconstructedCorrection1Runner) === CORRECTION_1_RUNNER_SHA256 &&
      sha256(jsonBytes(activation)) === CORRECTION_1_ACTIVATION_SHA256 &&
      sha256(await readFile(ORIGINAL_PREPARATION)) === ORIGINAL_PREPARATION_SHA256,
    "recursive transport preimage reconstruction failed"
  );
  console.log(
    JSON.stringify(
      {
        status: "passed-final-transport-preimage-correction-and-reconstruction",
        correctionLevel: 2,
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
