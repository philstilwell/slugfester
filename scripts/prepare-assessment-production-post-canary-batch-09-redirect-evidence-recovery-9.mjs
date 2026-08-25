#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const shouldActivate = process.argv.includes("--activate");
assertV4(!(shouldWrite && shouldActivate), "choose either --write or --activate");

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-9`;
const diagnosisPath = `${root}/audio-source-transport-recovery-8/failure-diagnosis.json`;
const basePlanPath = `${root}/audio-source-transport-recovery-8/correction-plan.json`;
const priorExecutionPath = `${root}/audio-source-transport-recovery-8/execution.json`;
const workPath = `${root}/audio-work-items.json`;
const standingPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/standing-authorization.json";
const preparePath =
  "scripts/prepare-assessment-production-post-canary-batch-09-redirect-evidence-recovery-9.mjs";
const testPath =
  "scripts/test-assessment-production-post-canary-batch-09-redirect-evidence-recovery-9.mjs";
const runnerPath =
  "scripts/run-assessment-production-post-canary-batch-09-redirect-evidence-recovery-9.mjs";
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const analysisPath = `${recoveryRoot}/analysis.json`;
const preparationPath = `${root}/audio-source-preparation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const inputPaths = [diagnosisPath, basePlanPath, priorExecutionPath, workPath, standingPath];
const inputBytes = Object.fromEntries(
  await Promise.all(inputPaths.map(async (file) => [file, await readFile(file)]))
);
const diagnosis = JSON.parse(inputBytes[diagnosisPath]);
const basePlan = JSON.parse(inputBytes[basePlanPath]);
const priorExecution = JSON.parse(inputBytes[priorExecutionPath]);
assertV4(
  diagnosis.status ===
    "preserved-batch-09-debate-170-direct-media-fetch-transport-failure-diagnosed-stop-rule-active" &&
    diagnosis.causeBoundary.redirectRejectionProven === false &&
    diagnosis.stopRule.newApprovalRequired === true,
  "preserved Debate 170 transport diagnosis changed"
);
assertV4(
  priorExecution.status === "preserved-one-shot-batch-09-direct-audio-preparation-failure" &&
    priorExecution.state.configBootstrapGets === 1 &&
    priorExecution.state.playerMetadataPosts === 1 &&
    priorExecution.state.mediaDownloadGets === 1 &&
    priorExecution.state.sourcesInstalled === 0 &&
    priorExecution.state.clipsCreated === 0,
  "preserved failed execution changed"
);
assertV4(
  basePlan.exactCohort.sourceCount === 3 &&
    basePlan.exactCohort.clipCount === 4 &&
    JSON.stringify(basePlan.exactCohort.sourceOrder) === JSON.stringify(["170", "19", "183"]),
  "frozen source cohort changed"
);
assertV4(!(await exists(preparationPath)), "audio-source preparation already exists");
for (const source of basePlan.exactCohort.sources) {
  assertV4(!(await exists(source.finalSourcePath)), `${source.debateNumber}: source already exists`);
}

const sourceHashes = {};
for (const file of [preparePath, testPath, runnerPath]) {
  sourceHashes[file] = sha256(await readFile(file));
}
const authenticatedInputs = Object.fromEntries(
  inputPaths.map((file) => [file, sha256(inputBytes[file])])
);
const authorizationText =
  "I authorize one final Batch 9 Debate 170 direct-media transport recovery. Preserve the existing failure. Capture the underlying fetch cause during exactly one credential-omitting metadata-and-media attempt, and change only redirect handling if that evidence proves redirect rejection. If successful, resume the untouched Debate 19 and 183 sources, create and validate the four frozen clips, commit, push, and resume Batch 9. No retries, playback, semantic audio evaluation, models, paid services, source changes, or score changes. Direct incremental cost cap: $0.";

const plan = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-redirect-evidence-recovery-9-plan",
  status:
    "frozen-one-final-batch-09-debate-170-redirect-evidence-and-three-source-recovery-9-ready",
  batchNumber: 9,
  checkpointCommit: "8fe7c362",
  userAuthorization: {
    instruction: authorizationText,
    directIncrementalCostUsdMaximum: 0,
    finalDebate170RecoveryAttemptsAuthorized: 1,
    resumeUntouchedDebate19And183SourcesAfterDebate170Success: true,
    retriesMaximum: 0,
    audioPlaybackAuthorized: false,
    semanticAudioEvaluationAuthorized: false,
    modelExecutionAuthorized: false,
    paidServicesAuthorized: false,
    sourceChangesAuthorized: false,
    scoreChangesAuthorized: false
  },
  authenticatedInputs,
  sourceHashes,
  inheritedFrozenCohort: {
    path: basePlanPath,
    sha256: authenticatedInputs[basePlanPath],
    exactCohortSha256: sha256(JSON.stringify(basePlan.exactCohort)),
    deterministicFormatSelectionSha256: sha256(
      JSON.stringify(basePlan.deterministicFormatSelection)
    ),
    mediaEncodingSha256: sha256(JSON.stringify(basePlan.mediaEncoding)),
    sourceOrder: basePlan.exactCohort.sourceOrder,
    clipOrder: basePlan.exactCohort.clipOrder
  },
  redirectEvidenceCorrection: {
    priorMediaRedirectMode: "error",
    correctedInitialMediaRedirectMode: "manual",
    initialDebate170ResponseMustBeRedirect: true,
    redirectStatusMinimum: 300,
    redirectStatusMaximum: 399,
    locationHeaderRequired: true,
    followPermittedOnlyAfterRedirectResponseObserved: true,
    redirectHopsMaximumPerSourceAttempt: 3,
    redirectHopsArePartOfOriginalAttemptNotRetries: true,
    credentialsModeForEveryHop: "omit",
    persistedEvidenceFields: [
      "status",
      "sourceUrlSha256",
      "locationUrlSha256",
      "locationOriginSha256",
      "hopIndex"
    ],
    rawSignedUrlsPersisted: false,
    publicApiKeyPersisted: false,
    errorCauseFieldsPersistedOnFailure: ["name", "message", "code", "cause"]
  },
  exactExecution: {
    attempts: 1,
    sourceOrder: ["170", "19", "183"],
    configBootstrapGets: 1,
    playerMetadataPostsMaximum: 3,
    mediaAttemptsMaximum: 3,
    redirectsMaximumPerMediaAttempt: 3,
    retries: 0,
    reruns: 0,
    timeoutExtensions: 0,
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0,
    modelContexts: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsdMaximum: 0,
    stopOnAnyFailure: true
  },
  outputs: { activationPath, executionPath, analysisPath, preparationPath },
  nextActionAfterPassingCohort:
    "prepare-validate-freeze-and-report-batch-09-four-clip-audio-verification-manifest-and-cost-estimate"
};

if (shouldActivate) {
  assertV4(await exists(planPath), "frozen redirect-evidence plan is missing");
  const planBytes = await readFile(planPath);
  const frozenPlan = JSON.parse(planBytes);
  assertV4(
    frozenPlan.status === plan.status &&
      frozenPlan.userAuthorization.instruction === authorizationText &&
      JSON.stringify(frozenPlan.sourceHashes) === JSON.stringify(sourceHashes) &&
      frozenPlan.inheritedFrozenCohort.exactCohortSha256 ===
        sha256(JSON.stringify(basePlan.exactCohort)),
    "frozen redirect-evidence plan changed"
  );
  assertV4(!(await exists(activationPath)), "redirect-evidence recovery already activated");
  await mkdir(recoveryRoot, { recursive: true });
  const activation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-09-redirect-evidence-recovery-9-activation",
    status:
      "active-for-exactly-one-final-batch-09-debate-170-redirect-evidence-and-three-source-recovery-9-pass",
    batchNumber: 9,
    plan: { path: planPath, sha256: sha256(planBytes) },
    authenticatedInputs,
    sourceHashes,
    inheritedFrozenCohort: plan.inheritedFrozenCohort,
    initialDebate170ResponseMustBeRedirect: true,
    redirectHopsMaximumPerSourceAttempt: 3,
    sourceOrder: plan.exactExecution.sourceOrder,
    retriesMaximum: 0,
    audioPlaybackMaximumSeconds: 0,
    directIncrementalCostUsdMaximum: 0
  };
  await writeFile(activationPath, `${JSON.stringify(activation, null, 2)}\n`);
  console.log(JSON.stringify({ status: activation.status, plan: activation.plan }, null, 2));
  process.exit(0);
}

if (shouldWrite) {
  assertV4(!(await exists(planPath)), "redirect-evidence recovery plan already exists");
  await mkdir(recoveryRoot, { recursive: true });
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: plan.status,
      wroteArtifact: shouldWrite,
      sources: 3,
      clips: 4,
      attempts: 1,
      retries: 0,
      initialMediaRedirectMode: "manual",
      audioPlaybackMaximumSeconds: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
