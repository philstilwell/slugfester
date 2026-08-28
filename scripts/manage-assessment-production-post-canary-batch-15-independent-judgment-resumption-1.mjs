#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  POST_CANARY_BATCH_15_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch15StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-15-standing-authorization.mjs";

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-15/independent-judgments";
const RESUMPTION = `${ROOT}/resumption-1`;
const PREPARATION = `${RESUMPTION}/preparation-manifest.json`;
const ACTIVATION = `${RESUMPTION}/execution-activation.json`;
const EXECUTION = `${RESUMPTION}/model-execution.json`;
const ANALYSIS = `${RESUMPTION}/analysis.json`;
const COMPLETE_OVERLAY = `${RESUMPTION}/complete-cohort-execution-overlay.json`;
const ORIGINAL_ACTIVATION = `${ROOT}/execution-activation.json`;
const ORIGINAL_EXECUTION = `${ROOT}/model-execution.json`;
const ORIGINAL_ANALYSIS = `${ROOT}/analysis.json`;
const RECOVERY = `${ROOT}/recovery-1/debate-39-pass-b`;
const RECOVERY_PREPARATION = `${RECOVERY}/preparation-manifest.json`;
const RECOVERY_ACTIVATION = `${RECOVERY}/execution-activation.json`;
const RECOVERY_EXECUTION = `${RECOVERY}/model-execution.json`;
const RECOVERY_ANALYSIS = `${RECOVERY}/analysis.json`;
const RECOVERY_OVERLAY = `${RECOVERY}/cohort-execution-overlay.json`;
const MANAGER = "scripts/manage-assessment-production-post-canary-batch-15-independent-judgment-resumption-1.mjs";
const RUNNER = "scripts/run-assessment-production-post-canary-batch-15-independent-judgment-resumption-1.mjs";
const ANALYZER = "scripts/analyze-assessment-production-post-canary-batch-15-independent-judgments-recovered.mjs";
const VALIDATOR = "scripts/validate-assessment-production-post-canary-batch-15-independent-judgment.mjs";
const STANDING_LIBRARY = "scripts/lib/assessment-production-post-canary-batch-15-standing-authorization.mjs";
const PREPARATION_STATUS = "frozen-seventeen-original-unattempted-batch-15-independent-judgment-contexts-prepared-not-authorized";
const ACTIVATION_STATUS = "frozen-seventeen-original-unattempted-batch-15-independent-judgment-contexts-authorized";
const ORIGINAL_CONTEXT_INDEXES = Array.from({ length: 17 }, (_, index) => index + 3);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

async function hashFiles(files) {
  const hashes = {};
  for (const file of [...new Set(files)].sort()) hashes[file] = sha256(await readFile(file));
  return hashes;
}

async function assertHashes(hashes, label) {
  for (const [file, digest] of Object.entries(hashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${label}/${file}: hash drifted`);
  }
}

async function loadBoundary() {
  const standing = await loadAndValidatePostCanaryBatch15StandingAuthorization();
  const [originalActivationBytes, originalExecutionBytes, originalAnalysisBytes, recoveryPreparationBytes, recoveryActivationBytes, recoveryExecutionBytes, recoveryAnalysisBytes, recoveryOverlayBytes] = await Promise.all([
    readFile(ORIGINAL_ACTIVATION), readFile(ORIGINAL_EXECUTION), readFile(ORIGINAL_ANALYSIS),
    readFile(RECOVERY_PREPARATION), readFile(RECOVERY_ACTIVATION), readFile(RECOVERY_EXECUTION),
    readFile(RECOVERY_ANALYSIS), readFile(RECOVERY_OVERLAY),
  ]);
  const originalActivation = JSON.parse(originalActivationBytes);
  const originalExecution = JSON.parse(originalExecutionBytes);
  const originalAnalysis = JSON.parse(originalAnalysisBytes);
  const recoveryExecution = JSON.parse(recoveryExecutionBytes);
  const recoveryAnalysis = JSON.parse(recoveryAnalysisBytes);
  const recoveryOverlay = JSON.parse(recoveryOverlayBytes);
  assertV4(
    originalActivation.status === "frozen-twenty-post-canary-batch-15-independent-judgment-contexts-authorized" &&
      originalActivation.contexts.length === 20 &&
      originalExecution.status === "post-canary-batch-15-independent-judgment-gate-complete-with-failure" &&
      originalExecution.contextsAttempted === 3 && originalExecution.contextsUnattempted === 17 &&
      originalExecution.validContexts === 2 && originalExecution.invalidContexts === 1 &&
      originalExecution.results[1]?.contextIndex === 1 && originalExecution.results[1]?.status === "timed-out" &&
      originalAnalysis.status === "post-canary-batch-15-independent-judgment-gate-failed-analysis-only" &&
      recoveryExecution.status === "two-field-disjoint-debate-39-pass-b-judgment-recovery-shards-passed-merged-and-validated" &&
      recoveryExecution.validContexts === 2 && recoveryExecution.invalidContexts === 0 &&
      recoveryAnalysis.status === "debate-39-pass-b-bounded-field-disjoint-recovery-passed-seventeen-context-resumption-required" &&
      recoveryOverlay.status === "three-post-canary-batch-15-independent-judgment-contexts-valid-after-bounded-field-disjoint-recovery-seventeen-unattempted" &&
      recoveryOverlay.contextsAttempted === 3 && recoveryOverlay.contextsUnattempted === 17 &&
      recoveryOverlay.validContexts === 3 && recoveryOverlay.invalidContexts === 0 &&
      standing.record.recoveryControls.unattemptedContextResumptionPermitted === true &&
      standing.record.recoveryControls.resumeStandingAuthorizationAfterPassingRecovery === true,
    "Batch 15 judgment recovery/resumption boundary drifted"
  );
  return {
    standing, originalActivation, originalActivationBytes, originalExecutionBytes,
    originalAnalysisBytes, recoveryPreparationBytes, recoveryActivationBytes,
    recoveryExecutionBytes, recoveryAnalysisBytes, recoveryOverlayBytes, recoveryOverlay,
  };
}

async function prepare() {
  const shouldWrite = process.argv.includes("--write");
  const frozenIndex = process.argv.indexOf("--frozen-at");
  const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
  assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
  for (const file of [PREPARATION, ACTIVATION, EXECUTION, ANALYSIS, COMPLETE_OVERLAY]) {
    if (shouldWrite) assertV4(!(await exists(file)), `${file} already exists`);
  }
  const boundary = await loadBoundary();
  const contexts = ORIGINAL_CONTEXT_INDEXES.map((originalContextIndex) => ({
    ...structuredClone(boundary.originalActivation.contexts[originalContextIndex]),
    originalContextIndex,
  }));
  for (const context of contexts) {
    for (const output of [context.judgmentOutput, context.rawOutput, context.validationOutput, context.provenanceOutput]) {
      assertV4(!(await exists(output)), `original unattempted output now exists: ${output}`);
    }
  }
  const protectedContexts = [0, 1, 2].map((index) => boundary.originalActivation.contexts[index]);
  const protectedFiles = protectedContexts.flatMap((context) => [context.judgmentOutput, context.rawOutput, context.validationOutput, context.provenanceOutput]);
  const protectedOutputHashes = await hashFiles(protectedFiles);
  const sourceFiles = [
    ...Object.keys(boundary.originalActivation.sourceHashes),
    ORIGINAL_ACTIVATION, ORIGINAL_EXECUTION, ORIGINAL_ANALYSIS,
    RECOVERY_PREPARATION, RECOVERY_ACTIVATION, RECOVERY_EXECUTION, RECOVERY_ANALYSIS, RECOVERY_OVERLAY,
    POST_CANARY_BATCH_15_STANDING_AUTHORIZATION, STANDING_LIBRARY, MANAGER, RUNNER, ANALYZER, VALIDATOR,
  ];
  const sourceHashes = await hashFiles(sourceFiles);
  const futureOutputPathsExcludedFromSourceHashes = [
    EXECUTION, ANALYSIS, COMPLETE_OVERLAY,
    ...contexts.flatMap((context) => [context.judgmentOutput, context.rawOutput, context.validationOutput, context.provenanceOutput]),
  ];
  const preparation = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-15-independent-judgment-original-unattempted-resumption-preparation",
    status: PREPARATION_STATUS,
    frozenAt,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    branch: "main",
    batchNumber: 15,
    standingAuthorization: POST_CANARY_BATCH_15_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: boundary.standing.sha256,
    originalFrozenActivationBatchNumber: boundary.originalActivation.batchNumber,
    correctedControlLabelBatchNumber: 15,
    controlLabelCorrectionSubstantiveBoundaryChanged: false,
    controllerStartupCorrection: {
      occurredAt: "2026-08-28T00:05:00Z",
      phase: "preparation-manifest-write-before-model-activation",
      failure: "ENOENT: resumption-1 directory did not yet exist",
      modelContextsAttempted: 0,
      recoveryAttemptConsumed: false,
      deterministicCorrection: "create the exact frozen resumption-1 directory before writing the manifest",
    },
    originalActivation: ORIGINAL_ACTIVATION,
    originalExecution: ORIGINAL_EXECUTION,
    originalFailureAnalysis: ORIGINAL_ANALYSIS,
    passedRecoveryOverlay: RECOVERY_OVERLAY,
    originalUnattemptedContextIndexes: ORIGINAL_CONTEXT_INDEXES,
    contexts,
    model: structuredClone(boundary.originalActivation.model),
    modelInputs: structuredClone(boundary.originalActivation.modelInputs),
    packetPreparation: boundary.originalActivation.packetPreparation,
    sourceCompatibility: structuredClone(boundary.originalActivation.sourceCompatibility),
    executionEnvironment: structuredClone(boundary.originalActivation.executionEnvironment),
    sourceHashes,
    protectedOutputHashes,
    executionPolicy: {
      contexts: 17,
      attemptsPerContext: 1,
      retriesMaximum: 0,
      timeoutMsPerContext: boundary.originalActivation.executionPolicy.timeoutMsPerContext,
      timeoutExtensionsMaximum: 0,
      absoluteGateTimeoutMs: boundary.originalActivation.executionPolicy.absoluteGateTimeoutMs,
      maximumParallelContexts: 2,
      schedulerRamp: [1, 2],
      rampPhases: [
        { phase: "resumption-operational-canary-one", maximumParallelContexts: 1, contextIndexes: [0], expansionRequiresAllValid: true },
        { phase: "resumption-ramp-two", maximumParallelContexts: 2, contextIndexes: [1, 2], expansionRequiresAllValid: true },
        { phase: "resumption-steady-two", maximumParallelContexts: 2, contextIndexes: Array.from({ length: 14 }, (_, index) => index + 3), expansionRequiresAllValid: false },
      ],
      firstRealContextOperationalCanary: true,
      removedEnvironmentVariables: structuredClone(boundary.originalActivation.executionPolicy.removedEnvironmentVariables),
      directIncrementalCostUsdMaximum: 0,
    },
    authorization: {
      modelExecution: false,
      deterministicValidation: true,
      deterministicCompleteCohortAssembly: true,
      retries: false,
      timeoutExtensions: false,
      paidServices: false,
      scoreDerivation: false,
      productionMutation: false,
      nextBatchSelection: false,
    },
    artifacts: { activation: ACTIVATION, execution: EXECUTION, analysis: ANALYSIS, completeCohortExecutionOverlay: COMPLETE_OVERLAY },
    futureOutputPathsExcludedFromSourceHashes,
    directIncrementalCostUsdMaximum: 0,
    nextAuthorizedAction: "activate-only-seventeen-original-unattempted-batch-15-independent-judgment-contexts",
  };
  if (shouldWrite) {
    await mkdir(RESUMPTION, { recursive: true });
    await writeFile(PREPARATION, jsonBytes(preparation));
  }
  console.log(JSON.stringify({ status: shouldWrite ? PREPARATION_STATUS : "preview", contexts: 17, originalContextIndexes: ORIGINAL_CONTEXT_INDEXES, protectedAcceptedJudgments: 3, attemptsPerContext: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0, directIncrementalCostUsdMaximum: 0, modelExecutionAuthorized: false }, null, 2));
}

async function activate() {
  const shouldWrite = process.argv.includes("--write");
  const activatedIndex = process.argv.indexOf("--activated-at");
  const activatedAt = activatedIndex >= 0 ? process.argv[activatedIndex + 1] : null;
  assertV4(activatedAt && !Number.isNaN(Date.parse(activatedAt)), "--activated-at requires an ISO timestamp");
  if (shouldWrite) assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
  const preparationBytes = await readFile(PREPARATION);
  const preparation = JSON.parse(preparationBytes);
  assertV4(preparation.status === PREPARATION_STATUS && preparation.contexts.length === 17 && preparation.authorization.modelExecution === false, "resumption preparation drifted");
  await assertHashes(preparation.sourceHashes, "resumption source");
  await assertHashes(preparation.protectedOutputHashes, "protected accepted output");
  for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) assertV4(!(await exists(future)), `future output exists: ${future}`);
  const activation = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-15-independent-judgment-original-unattempted-resumption-activation",
    status: ACTIVATION_STATUS,
    activatedAt,
    developmentValidationOnly: false,
    productionCanary: false,
    batchNumber: 15,
    stagingOnly: true,
    protocolId: preparation.sourceCompatibility.protocolId ?? "v4.2.21.16-decomposed-consensus-contract",
    preparationManifest: PREPARATION,
    preparationManifestSha256: sha256(preparationBytes),
    packetPreparation: preparation.packetPreparation,
    packetPreparationSha256: sha256(await readFile(preparation.packetPreparation)),
    standingAuthorization: preparation.standingAuthorization,
    standingAuthorizationSha256: preparation.standingAuthorizationSha256,
    userAuthorization: { standingAuthorization: preparation.standingAuthorization, standingAuthorizationSha256: preparation.standingAuthorizationSha256 },
    model: structuredClone(preparation.model),
    modelInputs: structuredClone(preparation.modelInputs),
    contexts: structuredClone(preparation.contexts),
    sourceCompatibility: structuredClone(preparation.sourceCompatibility),
    executionEnvironment: structuredClone(preparation.executionEnvironment),
    sourceHashes: { ...preparation.sourceHashes, [PREPARATION]: sha256(preparationBytes) },
    protectedOutputHashes: structuredClone(preparation.protectedOutputHashes),
    executionPolicy: structuredClone(preparation.executionPolicy),
    authorization: {
      modelContexts: true, independentJudgmentModelExecution: true, deterministicValidation: true,
      deterministicCompilation: true, deterministicAnalysis: true, retry: false, timeoutExtension: false,
      semanticCorrection: false, disagreementExtraction: false, unexpectedPaidService: false,
      audioVerification: false, adjudicationExecution: false, scoreDerivation: false,
      publicationModelExecution: false, productionMutation: false,
    },
    artifacts: structuredClone(preparation.artifacts),
    futureOutputPathsExcludedFromSourceHashes: structuredClone(preparation.futureOutputPathsExcludedFromSourceHashes),
    directIncrementalCostUsdMaximum: 0,
    nextAuthorizedAction: "execute-only-seventeen-original-unattempted-batch-15-independent-judgment-contexts",
  };
  if (shouldWrite) await writeFile(ACTIVATION, jsonBytes(activation));
  console.log(JSON.stringify({ status: shouldWrite ? ACTIVATION_STATUS : "preview", contexts: 17, originalContextIndexes: ORIGINAL_CONTEXT_INDEXES, model: activation.model, maximumParallelContexts: 2, attemptsPerContext: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0, directIncrementalCostUsdMaximum: 0, modelExecutionAuthorized: true }, null, 2));
}

const command = process.argv[2];
if (command === "prepare") await prepare();
else if (command === "activate") await activate();
else throw new Error("usage: manage-assessment-production-post-canary-batch-15-independent-judgment-resumption-1.mjs <prepare|activate>");
