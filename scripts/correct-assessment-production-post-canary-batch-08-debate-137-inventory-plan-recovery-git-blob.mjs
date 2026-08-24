#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-08/inventory-candidate-sharded/plan-recovery-1/debate-137";
const CORRECTION_ROOT = `${ROOT}/transport-correction-3-exception`;
const DIAGNOSIS = `${CORRECTION_ROOT}/diagnosis.json`;
const PLAN = `${CORRECTION_ROOT}/correction-plan.json`;
const PREPARATION = `${CORRECTION_ROOT}/execution-preparation-manifest.json`;
const EXECUTION = `${CORRECTION_ROOT}/execution-record.json`;
const PREVIOUS_FAILURE =
  `${ROOT}/transport-correction-2/post-correction-validation-failure.json`;
const ORIGINAL_PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const RUNNER =
  "scripts/run-assessment-production-post-canary-batch-08-debate-137-inventory-plan-recovery.mjs";
const CORRECTOR =
  "scripts/correct-assessment-production-post-canary-batch-08-debate-137-inventory-plan-recovery-git-blob.mjs";
const ORIGINAL_RUNNER_COMMIT =
  "b803526a0ac4784aa1d3c351bc23d9fc7e0aad1d";
const ORIGINAL_RUNNER_SHA256 =
  "d366faca1eff97699b6b7703330533ae9d3fc5a5ca357e7728533c0f4c4e2333";
const CURRENT_RUNNER_SHA256 =
  "302e2d05a6b7e98b60c0f216f331c3d7470766c9f13bc034d2237c6c60057b71";
const CURRENT_ACTIVATION_SHA256 =
  "cbbaf9f309226ec0d70f88bdb4c4b97eb1349f7b3df5437160098bc2d4bc72ff";
const PREVIOUS_FAILURE_SHA256 =
  "fa66ccbc30624656de4902c0e4e17cb9c464127c7b8df921cea120eb35fa4c57";
const ORIGINAL_PREPARATION_SHA256 =
  "b194bde2f8a756f789d178f0bbe346cb802e1e616f04ac21bee26830404a7c8e";
const BEFORE = `    const bytes = await readFile(file);
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
    }`;
const AFTER = `    if (file === RUNNER) {
      const originalRunnerBlob = execFileSync(
        "git",
        ["show", "${ORIGINAL_RUNNER_COMMIT}:" + RUNNER]
      );
      assertV4(
        sha256(originalRunnerBlob) === digest,
        \`\${file}: preserved Git runner blob does not authenticate the preparation preimage\`
      );
    } else {
      const bytes = await readFile(file);
      assertV4(sha256(bytes) === digest, \`\${file}: recovery source drifted\`);
    }`;
const PROTOCOL_ID =
  "assessment-production-post-canary-batch-08-debate-137-inventory-plan-transport-final-exception";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

function replaceExactlyOnce(text, before, after, label) {
  assertV4(text.split(before).length - 1 === 1, `${label}: expected one preimage`);
  return text.replace(before, after);
}

function originalRunnerBlob() {
  const commit = execFileSync("git", ["rev-parse", "b803526a"], {
    encoding: "utf8",
  }).trim();
  assertV4(commit === ORIGINAL_RUNNER_COMMIT, "original runner commit moved");
  const bytes = execFileSync("git", ["show", `${ORIGINAL_RUNNER_COMMIT}:${RUNNER}`]);
  assertV4(sha256(bytes) === ORIGINAL_RUNNER_SHA256, "original runner blob drifted");
  return bytes;
}

async function proposedOutputs() {
  const [runnerBytes, activationBytes, preparationBytes, previousFailureBytes] =
    await Promise.all([
      readFile(RUNNER),
      readFile(ACTIVATION),
      readFile(ORIGINAL_PREPARATION),
      readFile(PREVIOUS_FAILURE),
    ]);
  assertV4(
    sha256(runnerBytes) === CURRENT_RUNNER_SHA256 &&
      sha256(activationBytes) === CURRENT_ACTIVATION_SHA256 &&
      sha256(preparationBytes) === ORIGINAL_PREPARATION_SHA256 &&
      sha256(previousFailureBytes) === PREVIOUS_FAILURE_SHA256,
    "final-exception preimage drifted"
  );
  const preparation = JSON.parse(preparationBytes);
  assertV4(
    preparation.sourceHashes?.[RUNNER] === ORIGINAL_RUNNER_SHA256 &&
      sha256(originalRunnerBlob()) === preparation.sourceHashes[RUNNER],
    "preserved Git blob does not match the unchanged preparation credential"
  );
  const proposedRunnerBytes = Buffer.from(
    replaceExactlyOnce(
      runnerBytes.toString("utf8"),
      BEFORE,
      AFTER,
      "runner preparation-authentication overlay"
    )
  );
  const activation = JSON.parse(activationBytes);
  assertV4(
    activation.sourceHashes?.[RUNNER] === CURRENT_RUNNER_SHA256,
    "current activation runner credential drifted"
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
  const proposed = await proposedOutputs();
  const diagnosis = {
    schemaVersion:
      "1.0-batch-08-debate-137-inventory-plan-transport-final-exception-diagnosis",
    protocolId: PROTOCOL_ID,
    status: "third-transport-authentication-failure-diagnosed-under-explicit-final-exception",
    frozenAt,
    checkpointCommit,
    branch: "main",
    debateNumber: "137",
    userAuthorization: {
      instruction:
        "I authorize one final Batch 8 Debate 137 inventory-plan transport-recovery exception. Authenticate the unchanged preparation-manifest runner hash against the original runner blob preserved in commit `b803526a`, while separately authenticating the current runner through the activation credential. Update only the necessary runner logic and authenticated activation hash, then perform exactly one corrected validation pass. If it passes, execute the two already-frozen Debate 137 routes and sections contexts once and resume the Batch 8 standing authorization. Direct incremental cost cap: $0. Preserve all packets, schemas, sources, candidates, model settings, accepted plans, and execution controls. Stop on any further failure involving this problem.",
      finalExceptionForUnderlyingProblem: true,
      directIncrementalCostUsdMaximum: 0,
    },
    preservedFailure: PREVIOUS_FAILURE,
    preservedFailureSha256: PREVIOUS_FAILURE_SHA256,
    deterministicDiagnosis: {
      category: "self-referential-runner-preimage-reconstruction-cardinality-failure",
      correction:
        "Authenticate the unchanged preparation credential against the exact original runner Git blob, then authenticate the accepted current runner separately through activation.sourceHashes.",
      originalRunnerCommit: ORIGINAL_RUNNER_COMMIT,
      originalRunnerSha256: ORIGINAL_RUNNER_SHA256,
      correctedValidationPassesAuthorized: 1,
      furtherRecoveryAuthorized: false,
    },
    costs: {
      modelContextsExecutedDuringDiagnosis: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
    },
    nextAuthorizedAction: "freeze-and-execute-one-final-git-blob-authentication-correction",
  };
  const diagnosisBytes = jsonBytes(diagnosis);
  const plan = {
    schemaVersion:
      "1.0-batch-08-debate-137-inventory-plan-transport-final-exception-correction-plan",
    protocolId: PROTOCOL_ID,
    status: "one-final-git-blob-authentication-correction-frozen-not-executed",
    frozenAt,
    checkpointCommit,
    branch: "main",
    diagnosis: DIAGNOSIS,
    diagnosisSha256: sha256(diagnosisBytes),
    exceptionLevel: 3,
    exactChanges: [
      {
        file: RUNNER,
        field: "loadPreparation runner-source authentication branch",
        beforeSha256: CURRENT_RUNNER_SHA256,
        afterSha256: sha256(proposed.proposedRunnerBytes),
        rule:
          `Authenticate preparation.sourceHashes[RUNNER] with git show ${ORIGINAL_RUNNER_COMMIT}:` +
          RUNNER,
      },
      {
        file: ACTIVATION,
        field: `sourceHashes[${JSON.stringify(RUNNER)}]`,
        before: CURRENT_RUNNER_SHA256,
        after: sha256(proposed.proposedRunnerBytes),
      },
    ],
    lockedPreimages: {
      [RUNNER]: CURRENT_RUNNER_SHA256,
      [ACTIVATION]: CURRENT_ACTIVATION_SHA256,
      [ORIGINAL_PREPARATION]: ORIGINAL_PREPARATION_SHA256,
      [PREVIOUS_FAILURE]: PREVIOUS_FAILURE_SHA256,
      [`git:${ORIGINAL_RUNNER_COMMIT}:${RUNNER}`]: ORIGINAL_RUNNER_SHA256,
    },
    lockedProposedOutputs: {
      [RUNNER]: sha256(proposed.proposedRunnerBytes),
      [ACTIVATION]: sha256(proposed.proposedActivationBytes),
    },
    authenticationRule: {
      unchangedPreparationManifestAuthenticatesOriginalGitBlob: true,
      currentActivationAuthenticatesCurrentRunner: true,
      preparationManifestByteIdentical: true,
      activationFieldsChanged: [`sourceHashes[${JSON.stringify(RUNNER)}]`],
    },
    executionPolicy: {
      correctionAttemptsMaximum: 1,
      correctedRecoveryValidationPassesMaximum: 1,
      retriesMaximum: 0,
      rerunsMaximum: 0,
      timeoutExtensionsMaximum: 0,
      modelExecutionOnlyAfterCorrectedValidationPasses: true,
      furtherRecoveryForUnderlyingProblem: false,
    },
    protectedBoundaries: {
      packetsSchemasSourcesInventoriesCandidatesScoresUnchanged: true,
      acceptedPlansUnchanged: true,
      modelSettingsSchedulerMergeRuleAndTimeoutsUnchanged: true,
      noModelExecutionInCorrection: true,
      noPaidServices: true,
      directIncrementalCostUsdMaximum: 0,
    },
  };
  const planBytes = jsonBytes(plan);
  const correctorBytes = await readFile(CORRECTOR);
  const preparation = {
    schemaVersion:
      "1.0-batch-08-debate-137-inventory-plan-transport-final-exception-execution-preparation",
    protocolId: PROTOCOL_ID,
    status: "frozen-final-exception-correction-prepared-not-executed",
    frozenAt,
    checkpointCommit,
    branch: "main",
    diagnosis: DIAGNOSIS,
    diagnosisSha256: sha256(diagnosisBytes),
    correctionPlan: PLAN,
    correctionPlanSha256: sha256(planBytes),
    corrector: CORRECTOR,
    correctorSha256: sha256(correctorBytes),
    output: EXECUTION,
    correctionAttemptsMaximum: 1,
    correctedRecoveryValidationPassesMaximum: 1,
    modelExecutionAuthorized: false,
    paidServicesAuthorized: false,
    directIncrementalCostUsdMaximum: 0,
    nextRequiredAction: "execute-exact-final-exception-correction-once",
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
        originalRunnerCommit: ORIGINAL_RUNNER_COMMIT,
        originalRunnerSha256: ORIGINAL_RUNNER_SHA256,
        correctionAttempts: 0,
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
    "frozen final-exception preparation drifted"
  );
  console.log(
    JSON.stringify(
      {
        status: "passed-frozen-final-exception-preparation",
        correctionAttempts: 0,
        correctedValidationPasses: 0,
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
    "proposed final-exception outputs drifted"
  );
  const execution = {
    schemaVersion:
      "1.0-batch-08-debate-137-inventory-plan-transport-final-exception-execution",
    protocolId: PROTOCOL_ID,
    status: "frozen-final-exception-correction-executed-awaiting-one-recovery-validation-pass",
    executedAt,
    branch: "main",
    preparation: PREPARATION,
    preparationSha256: sha256(preparationBytes),
    correctionPlan: PLAN,
    correctionPlanSha256: sha256(planBytes),
    correctionAttemptCount: 1,
    correctedRecoveryValidationPasses: 0,
    retries: 0,
    reruns: 0,
    timeoutExtensions: 0,
    preimages: plan.lockedPreimages,
    outputs: plan.lockedProposedOutputs,
    originalGitBlobAuthenticationPassed: true,
    currentActivationAuthenticationPrepared: true,
    modelContextsExecuted: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0,
    nextAuthorizedAction: "perform-exactly-one-corrected-original-recovery-validation-pass",
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
      execution.status ===
        "frozen-final-exception-correction-executed-awaiting-one-recovery-validation-pass" &&
      execution.correctionAttemptCount === 1 &&
      execution.correctedRecoveryValidationPasses === 0 &&
      execution.retries === 0 &&
      execution.reruns === 0 &&
      execution.timeoutExtensions === 0 &&
      execution.modelContextsExecuted === 0 &&
      execution.directIncrementalCostUsd === 0,
    "final-exception execution outputs drifted"
  );
  const reconstructedRunner = Buffer.from(
    replaceExactlyOnce(
      runnerBytes.toString("utf8"),
      AFTER,
      BEFORE,
      "final-exception runner reconstruction"
    )
  );
  const activation = JSON.parse(activationBytes);
  assertV4(
    activation.sourceHashes?.[RUNNER] === sha256(runnerBytes),
    "current activation does not authenticate current runner"
  );
  activation.sourceHashes[RUNNER] = CURRENT_RUNNER_SHA256;
  assertV4(
    sha256(reconstructedRunner) === CURRENT_RUNNER_SHA256 &&
      sha256(jsonBytes(activation)) === CURRENT_ACTIVATION_SHA256 &&
      sha256(originalRunnerBlob()) === ORIGINAL_RUNNER_SHA256,
    "final-exception preimage reconstruction failed"
  );
  console.log(
    JSON.stringify(
      {
        status: "passed-final-exception-output-and-preimage-validation",
        correctionAttemptCount: 1,
        correctedRecoveryValidationPasses: 0,
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
