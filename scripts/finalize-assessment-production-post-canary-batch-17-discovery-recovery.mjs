#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
  V212_DISCOVERY_PROTOCOL_ID,
  compileV212CandidateBundle,
  validateV212Discovery,
} from "./lib/assessment-production-score-stability-v2.1.2-discovery.mjs";
import { buildBatch17TokenCountedChunkLedger } from "./lib/assessment-production-post-canary-batch-17-source-preparation.mjs";
import {
  POST_CANARY_BATCH_17_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch17StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-17-standing-authorization.mjs";
import {
  parseV42219Ledger,
  serializeV42219Rows,
  validateV42219ChunkLedger,
} from "./lib/v42219-generalized-partition.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-17/discovery";
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const PREPARATION_VALIDATION = `${ROOT}/execution-preparation-validation.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const ORIGINAL_EXECUTION = `${ROOT}/model-execution.json`;
const RECOVERY_ROOT = `${ROOT}/recovery-1/debate-77-chunk-002`;
const RECOVERY_DIAGNOSIS = `${RECOVERY_ROOT}/diagnosis.json`;
const RECOVERY_PLAN = `${RECOVERY_ROOT}/correction-plan.json`;
const RECOVERY_PREPARATION = `${RECOVERY_ROOT}/execution-preparation-manifest.json`;
const RECOVERY_ACTIVATION = `${RECOVERY_ROOT}/execution-activation.json`;
const RECOVERY_EXECUTION = `${RECOVERY_ROOT}/model-execution.json`;
const RECOVERY_ANALYSIS = `${RECOVERY_ROOT}/analysis.json`;
const COHORT_EXECUTION_OVERLAY = `${RECOVERY_ROOT}/cohort-execution-overlay.json`;
const RECOVERED_OUTPUT = `${RECOVERY_ROOT}/output.json`;
const SCRIPT =
  "scripts/recover-and-resume-assessment-production-post-canary-batch-17-discovery.mjs";
const VALIDATOR = "scripts/validate-v212-discovery.mjs";
const CONTEXTS = 17;
const DEBATES = ["77", "44", "171", "62"];
const EXPECTED_PREPARATION_STATUS =
  "frozen-seventeen-post-canary-batch-17-discovery-contexts-prepared-not-authorized";
const EXPECTED_ACTIVATION_STATUS =
  "frozen-seventeen-post-canary-batch-17-discovery-contexts-authorized";
const EXPECTED_EXECUTION_STATUS =
  "seventeen-post-canary-batch-17-discovery-contexts-passed";
const RECOVERY_PREPARATION_STATUS =
  "batch-17-debate-77-chunk-002-level-1-discovery-recovery-and-unattempted-resumption-prepared-not-authorized";
const RECOVERY_ACTIVATION_STATUS =
  "batch-17-debate-77-chunk-002-level-1-discovery-recovery-and-unattempted-resumption-authorized";
const RECOVERY_EXECUTION_STATUS =
  "batch-17-discovery-level-1-recovery-and-unattempted-resumption-passed";
const FAILED_CONTEXT_INDEX = 1;
const UNATTEMPTED_CONTEXT_INDEXES = Object.freeze(
  Array.from({ length: 14 }, (_, index) => index + 3)
);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);
async function hashFiles(files) {
  const hashes = {};
  for (const file of [...new Set(files)].sort()) {
    hashes[file] = sha256(await readFile(file));
  }
  return hashes;
}
async function assertHashes(hashes, label) {
  for (const [file, digest] of Object.entries(hashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${label}/${file}: hash drifted`);
  }
}

function allBooleanLeavesTrue(value) {
  if (typeof value === "boolean") return value;
  if (!value || typeof value !== "object") return true;
  return Object.values(value).every(allBooleanLeavesTrue);
}
function runChild(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let forceTimer = null;
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeoutMs);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      resolve({ code, signal, stdout, stderr, timedOut });
    });
  });
}

async function loadAndValidatePreparation({ requireFutureAbsent = false } = {}) {
  const bytes = await readFile(PREPARATION);
  const preparation = JSON.parse(bytes);
  const standingAuthorization =
    await loadAndValidatePostCanaryBatch17StandingAuthorization();
  assertV4(
    preparation.status === EXPECTED_PREPARATION_STATUS &&
      preparation.protocolId ===
        "assessment-production-post-canary-batch-17-discovery" &&
      preparation.discoveryProtocolId === V212_DISCOVERY_PROTOCOL_ID &&
      preparation.productionContinuation === true &&
      preparation.developmentValidationOnly === false &&
      preparation.productionCanary === false &&
      preparation.stagingOnly === true &&
      preparation.AIOnly === true &&
      preparation.contexts.length === CONTEXTS &&
      preparation.tokenLedgerCompatibility.status ===
        "all-source-rows-have-positive-repository-lexical-token-count" &&
      preparation.tokenLedgerCompatibility.sourceRowsInjected === 0 &&
      preparation.tokenLedgerCompatibility.sourceRowsOmitted === 0 &&
      preparation.tokenLedgerCompatibility.sourceRowsRewritten === 0 &&
      preparation.tokenLedgerCompatibility.minimumCandidateLexicalTokensChanged ===
        false &&
      preparation.tokenLedgerCompatibility.occurrences.length === 0 &&
      preparation.userAuthorization.standingAuthorization ===
        POST_CANARY_BATCH_17_STANDING_AUTHORIZATION &&
      preparation.userAuthorization.standingAuthorizationSha256 ===
        standingAuthorization.sha256 &&
      standingAuthorization.record.authorization.discoveryModelExecution ===
        true &&
      JSON.stringify([...new Set(preparation.contexts.map((item) => item.debateNumber))]) ===
        JSON.stringify(DEBATES) &&
      preparation.activePolicy.version === "v2.2" &&
      preparation.activePolicy.scorePassesMaximum === 1 &&
      preparation.activePolicy.modelAuthoredScoresAllowed === false &&
      preparation.activePolicy.automaticRerunAllowed === false &&
      preparation.activePolicy.roundedIntegerScoreTiesPermitted === true &&
      preparation.model.label === "5.6 Sol" &&
      preparation.model.slug === "gpt-5.6-sol" &&
      preparation.model.reasoningEffort === "low" &&
      preparation.model.authentication === "ChatGPT subscription" &&
      preparation.model.scoreBlind === true &&
      preparation.model.roundedIntegerScoreTiesPermitted === true &&
      preparation.executionPolicy.contexts === CONTEXTS &&
      preparation.executionPolicy.attemptsPerContext === 1 &&
      preparation.executionPolicy.retriesMaximum === 0 &&
      preparation.executionPolicy.timeoutMsPerContext === 300000 &&
      preparation.executionPolicy.timeoutExtensionsMaximum === 0 &&
      preparation.executionPolicy.absoluteGateTimeoutMs === 7200000 &&
      preparation.executionPolicy.copiedInputBytesMaximum === 66203 &&
      preparation.executionPolicy.maximumParallelContexts === 4 &&
      JSON.stringify(preparation.executionPolicy.schedulerRamp) ===
        JSON.stringify([1, 2, 4]) &&
      preparation.executionPolicy.APIKeysRemoved === true &&
      preparation.executionPolicy.directIncrementalCostUsdMaximum === 0 &&
      preparation.executionPolicy.meteredApiCostUsdMaximum === 0 &&
      preparation.executionPolicy.transcriptionCostUsdMaximum === 0 &&
      preparation.executionPolicy.separateActivationRequired === true &&
      preparation.copiedInputBoundary.frozenObservedCopiedInputBytesMaximum ===
        66203 &&
      preparation.copiedInputBoundary.sourceOrPacketTruncationAllowed === false &&
      preparation.copiedInputBoundary.semanticRepartitionAllowed === false &&
      preparation.isolation.exactCopiedFilesPerContext === 4 &&
      preparation.isolation.oneChunkPerContext === true &&
      preparation.isolation.otherChunksUnavailable === true &&
      preparation.isolation.otherOutputsUnavailable === true &&
      preparation.isolation.otherDebatesUnavailable === true &&
      preparation.isolation.ratingsScoresWinnersUnavailable === true &&
      preparation.isolation.scorePolicyAnalysisUnavailable === true &&
      preparation.authorization.executionActivationPreparation === false &&
      preparation.authorization.modelContexts === false &&
      preparation.authorization.inventoryPreparation === false &&
      preparation.authorization.inventoryModelExecution === false &&
      preparation.authorization.independentJudgmentModelExecution === false &&
      preparation.authorization.paidTranscription === false &&
      preparation.authorization.unexpectedPaidService === false &&
      preparation.authorization.audioVerification === false &&
      preparation.authorization.adjudicationModelExecution === false &&
      preparation.authorization.scoreDerivation === false &&
      preparation.authorization.publicationModelExecution === false &&
      preparation.authorization.productionMutation === false &&
      allBooleanLeavesTrue(preparation.stopRules),
    "Batch 17 frozen discovery preparation is invalid"
  );
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
    const sourceBytes = await readFile(file);
    assertV4(sha256(sourceBytes) === digest, `${file}: source drifted`);
  }
  if (requireFutureAbsent) {
    for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
      assertV4(!(await exists(future)), `future output already exists: ${future}`);
    }
  }
  return { preparation, bytes, standingAuthorization };
}

async function validateContextInputs(preparation, context) {
  const sourcePreparation = JSON.parse(
    await readFile(preparation.preparation, "utf8")
  );
  const debate = sourcePreparation.contexts.find(
    (item) => item.debateNumber === context.debateNumber
  );
  const chunk = debate?.chunks.find((item) => item.chunkId === context.chunkId);
  assertV4(debate && chunk, `${context.debateNumber}/${context.chunkId}: context missing`);
  const [validationChunkBytes, fullLedgerBytes, modelLedgerBytes] =
    await Promise.all([
      readFile(context.validationChunkLedgerPath),
      readFile(context.fullLedger),
      readFile(context.modelTokenCountedLedgerPath),
    ]);
  validateV42219ChunkLedger(validationChunkBytes, fullLedgerBytes, chunk);
  assertV4(
    buildBatch17TokenCountedChunkLedger(validationChunkBytes).equals(
      modelLedgerBytes
    ) && sha256(modelLedgerBytes) === context.modelTokenCountedLedgerSha256,
    `${context.debateNumber}/${context.chunkId}: token ledger drifted`
  );
  assertV4(
    context.copiedInputBytes <= preparation.executionPolicy.copiedInputBytesMaximum,
    `${context.debateNumber}/${context.chunkId}: copied-input ceiling exceeded`
  );
  return { sourcePreparation, debate, chunk };
}

async function preflight() {
  const { preparation } = await loadAndValidatePreparation({
    requireFutureAbsent: true,
  });
  const preparationValidation = JSON.parse(
    await readFile(PREPARATION_VALIDATION, "utf8")
  );
  assertV4(
    preparationValidation.status ===
      "batch-17-discovery-execution-manifest-validation-passed-frozen-standing-authorization-active" &&
      preparationValidation.totals.contextsPrepared === CONTEXTS &&
      preparationValidation.authorization.modelExecution === false &&
      preparationValidation.authorization.paidService === false &&
      preparationValidation.totals.directIncrementalCostUsd === 0,
    "Batch 17 preparation validation is invalid"
  );
  const codex = preparation.executionEnvironment.codexPath;
  assertV4(
    execFileSync(codex, ["--version"], { encoding: "utf8" }).trim() ===
      preparation.executionEnvironment.codexCliVersion,
    "frozen Codex CLI version changed"
  );
  await access(path.join(os.homedir(), ".codex", "auth.json"));
  for (const context of preparation.contexts) {
    await validateContextInputs(preparation, context);
  }
  console.log(
    JSON.stringify(
      {
        status: "passed-model-free-preflight",
        contexts: CONTEXTS,
        debates: DEBATES,
        model: preparation.model,
        maximumParallelContexts: 4,
        schedulerRamp: [1, 2, 4],
        directIncrementalCostUsdMaximum: 0,
        modelContextsExecuted: 0,
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
  const { preparation, bytes: preparationBytes, standingAuthorization } =
    await loadAndValidatePreparation({ requireFutureAbsent: true });
  await preflight();
  const sourceFiles = [
    ...Object.keys(preparation.sourceHashes),
    PREPARATION,
    PREPARATION_VALIDATION,
    SCRIPT,
    VALIDATOR,
  ];
  const sourceHashes = {};
  for (const file of [...new Set(sourceFiles)].sort()) {
    sourceHashes[file] = sha256(await readFile(file));
  }
  const activation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-discovery-execution-activation",
    protocolId: preparation.protocolId,
    discoveryProtocolId: V212_DISCOVERY_PROTOCOL_ID,
    status: EXPECTED_ACTIVATION_STATUS,
    activatedAt,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    branch: "main",
    productionContinuation: true,
    developmentValidationOnly: false,
    productionCanary: false,
    stagingOnly: true,
    AIOnly: true,
    selectedDebates: DEBATES,
    userAuthorization: {
      scope:
        "activate and execute exactly the 17 frozen Batch 17 score-blind discovery contexts under the frozen standing authorization",
      standingAuthorization: POST_CANARY_BATCH_17_STANDING_AUTHORIZATION,
      standingAuthorizationSha256: standingAuthorization.sha256,
      directIncrementalCostCapUsd: 0,
      discoveryModelsAuthorized: true,
      inventoryModelsAuthorized: false,
      judgmentModelsAuthorized: false,
      paidServicesAuthorized: false,
    },
    preparationManifest: PREPARATION,
    preparationManifestSha256: sha256(preparationBytes),
    preparationValidation: PREPARATION_VALIDATION,
    preparationValidationSha256: sha256(
      await readFile(PREPARATION_VALIDATION)
    ),
    activePolicy: structuredClone(preparation.activePolicy),
    discoverySuccessorContract: structuredClone(
      preparation.discoverySuccessorContract
    ),
    model: structuredClone(preparation.model),
    costBoundary: structuredClone(preparation.costEstimate),
    executionEnvironment: structuredClone(preparation.executionEnvironment),
    executionPolicy: structuredClone(preparation.executionPolicy),
    copiedInputBoundary: structuredClone(preparation.copiedInputBoundary),
    isolation: structuredClone(preparation.isolation),
    compilationPolicy: structuredClone(preparation.compilationPolicy),
    tokenLedgerCompatibility: structuredClone(
      preparation.tokenLedgerCompatibility
    ),
    schemaHardening: structuredClone(preparation.schemaHardening),
    stopRules: structuredClone(preparation.stopRules),
    artifacts: structuredClone(preparation.artifacts),
    futureOutputPathsExcludedFromSourceHashes: structuredClone(
      preparation.futureOutputPathsExcludedFromSourceHashes
    ),
    sourceHashes,
    authorization: {
      modelContexts: true,
      deterministicValidation: true,
      deterministicCandidateCompilation: true,
      analysis: true,
      retry: false,
      timeoutExtension: false,
      semanticCorrection: false,
      inventoryPreparation: false,
      inventoryModelExecution: false,
      independentJudgmentPacketPreparation: false,
      independentJudgmentModelExecution: false,
      paidTranscription: false,
      unexpectedPaidService: false,
      audioVerification: false,
      adjudicationModelExecution: false,
      scoreDerivation: false,
      publicationPreparation: false,
      publicationModelExecution: false,
      productionMutation: false,
      nextBatchSelection: false,
    },
    nextRequiredAction:
      "execute-exactly-seventeen-frozen-batch-17-discovery-contexts-once",
  };
  if (shouldWrite) {
    await writeFile(ACTIVATION, jsonBytes(activation));
  }
  console.log(
    JSON.stringify(
      {
        status: shouldWrite ? activation.status : "preview",
        contexts: CONTEXTS,
        debates: DEBATES,
        model: activation.model,
        expectedParallelWallMinutes:
          activation.costBoundary.expectedParallelWallMinutes,
        directIncrementalCostUsdMaximum: 0,
        retriesMaximum: 0,
        timeoutExtensionsMaximum: 0,
        discoveryModelContextsAuthorized: true,
        inventoryModelContextsAuthorized: false,
        judgmentModelContextsAuthorized: false,
      },
      null,
      2
    )
  );
}

async function loadAndValidateActivation() {
  const activationBytes = await readFile(ACTIVATION);
  const activation = JSON.parse(activationBytes);
  const standingAuthorization =
    await loadAndValidatePostCanaryBatch17StandingAuthorization();
  assertV4(
    activation.status === EXPECTED_ACTIVATION_STATUS &&
      activation.productionContinuation === true &&
      activation.productionCanary === false &&
      activation.stagingOnly === true &&
      activation.discoveryProtocolId === V212_DISCOVERY_PROTOCOL_ID &&
      JSON.stringify(activation.selectedDebates) === JSON.stringify(DEBATES) &&
      activation.activePolicy.version === "v2.2" &&
      activation.activePolicy.roundedIntegerScoreTiesPermitted === true &&
      activation.model.label === "5.6 Sol" &&
      activation.model.slug === "gpt-5.6-sol" &&
      activation.model.reasoningEffort === "low" &&
      activation.model.authentication === "ChatGPT subscription" &&
      activation.model.scoreBlind === true &&
      activation.model.roundedIntegerScoreTiesPermitted === true &&
      activation.userAuthorization.standingAuthorization ===
        POST_CANARY_BATCH_17_STANDING_AUTHORIZATION &&
      activation.userAuthorization.standingAuthorizationSha256 ===
        standingAuthorization.sha256 &&
      activation.userAuthorization.directIncrementalCostCapUsd === 0 &&
      activation.userAuthorization.discoveryModelsAuthorized === true &&
      activation.userAuthorization.inventoryModelsAuthorized === false &&
      activation.userAuthorization.judgmentModelsAuthorized === false &&
      activation.userAuthorization.paidServicesAuthorized === false &&
      activation.tokenLedgerCompatibility.status ===
        "all-source-rows-have-positive-repository-lexical-token-count" &&
      activation.tokenLedgerCompatibility.sourceRowsInjected === 0 &&
      activation.tokenLedgerCompatibility.sourceRowsOmitted === 0 &&
      activation.tokenLedgerCompatibility.sourceRowsRewritten === 0 &&
      activation.tokenLedgerCompatibility.minimumCandidateLexicalTokensChanged ===
        false &&
      activation.tokenLedgerCompatibility.occurrences.length === 0 &&
      activation.executionPolicy.contexts === CONTEXTS &&
      activation.executionPolicy.attemptsPerContext === 1 &&
      activation.executionPolicy.retriesMaximum === 0 &&
      activation.executionPolicy.timeoutExtensionsMaximum === 0 &&
      activation.executionPolicy.copiedInputBytesMaximum === 66203 &&
      activation.executionPolicy.maximumParallelContexts === 4 &&
      JSON.stringify(activation.executionPolicy.schedulerRamp) ===
        JSON.stringify([1, 2, 4]) &&
      activation.authorization.modelContexts === true &&
      activation.authorization.deterministicValidation === true &&
      activation.authorization.deterministicCandidateCompilation === true &&
      activation.authorization.analysis === true &&
      activation.authorization.retry === false &&
      activation.authorization.timeoutExtension === false &&
      activation.authorization.semanticCorrection === false &&
      activation.authorization.inventoryPreparation === false &&
      activation.authorization.inventoryModelExecution === false &&
      activation.authorization.independentJudgmentModelExecution === false &&
      activation.authorization.paidTranscription === false &&
      activation.authorization.unexpectedPaidService === false &&
      activation.authorization.audioVerification === false &&
      activation.authorization.adjudicationModelExecution === false &&
      activation.authorization.scoreDerivation === false &&
      activation.authorization.publicationModelExecution === false &&
      activation.authorization.productionMutation === false &&
      allBooleanLeavesTrue(activation.stopRules),
    "Batch 17 discovery execution is unauthorized"
  );
  for (const [file, digest] of Object.entries(activation.sourceHashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
  }
  const preparationBytes = await readFile(activation.preparationManifest);
  assertV4(
    sha256(preparationBytes) === activation.preparationManifestSha256,
    "preparation manifest hash drifted"
  );
  assertV4(
    sha256(await readFile(activation.preparationValidation)) ===
      activation.preparationValidationSha256,
    "preparation validation hash drifted"
  );
  const preparation = JSON.parse(preparationBytes);
  const sourcePreparation = JSON.parse(
    await readFile(preparation.preparation, "utf8")
  );
  assertV4(
    preparation.contexts.length === CONTEXTS &&
      sourcePreparation.contexts.length === DEBATES.length,
    "frozen Batch 17 context count drifted"
  );
  return { activation, preparation, sourcePreparation };
}

async function loadOriginalFailureBoundary({ allowRecoveryArtifacts = false } = {}) {
  const frozen = await loadAndValidateActivation();
  const executionBytes = await readFile(ORIGINAL_EXECUTION);
  const execution = JSON.parse(executionBytes);
  const failed = execution.results.find(
    (result) => result.contextIndex === FAILED_CONTEXT_INDEX
  );
  assertV4(
    execution.status === "post-canary-batch-17-discovery-complete-with-failure" &&
      execution.contextsPlanned === CONTEXTS &&
      execution.contextsAttempted === 3 &&
      execution.contextsUnattempted === 14 &&
      execution.validContexts === 2 &&
      execution.invalidContexts === 1 &&
      execution.attempts === 3 &&
      execution.retries === 0 &&
      execution.timeoutExtensions === 0 &&
      execution.semanticCorrections === 0 &&
      execution.results.map((result) => result.contextIndex).join(",") === "0,1,2" &&
      failed?.debateNumber === "77" &&
      failed?.chunkId === "chunk-002" &&
      failed?.status === "output-validation-failed" &&
      failed?.attemptCount === 1 &&
      failed?.retryCount === 0 &&
      failed?.accepted === false &&
      failed?.rawOutputWritten === true &&
      failed?.validationMessage?.includes("candidates are not chronological") &&
      sha256(await readFile(frozen.preparation.contexts[FAILED_CONTEXT_INDEX].rawOutput)) ===
        failed.rawOutputSha256,
    "preserved Batch 17 discovery failure boundary drifted"
  );
  const standing =
    await loadAndValidatePostCanaryBatch17StandingAuthorization();
  assertV4(
    standing.record.recoveryControls.boundedFirstRecoveryAuthorized === true &&
      standing.record.recoveryControls.unattemptedContextResumptionPermitted === true &&
      standing.record.recoveryControls.failedPartialOutputReusable === false &&
      standing.record.recoveryControls.recoveryLevelsMaximum === 2 &&
      standing.record.authorization.boundedCorrections === true &&
      standing.record.costBoundary.subscriptionAndLocalDirectIncrementalCostUsdMaximum === 0,
    "Batch 17 standing authorization does not cover diagnosed discovery recovery"
  );
  if (!allowRecoveryArtifacts) {
    for (const file of [
      RECOVERY_DIAGNOSIS,
      RECOVERY_PLAN,
      RECOVERY_PREPARATION,
      RECOVERY_ACTIVATION,
      RECOVERY_EXECUTION,
      RECOVERY_ANALYSIS,
      COHORT_EXECUTION_OVERLAY,
      RECOVERED_OUTPUT,
    ]) {
      assertV4(!(await exists(file)), `${file}: recovery artifact already exists`);
    }
    for (const index of UNATTEMPTED_CONTEXT_INDEXES) {
      assertV4(
        !(await exists(frozen.preparation.contexts[index].rawOutput)),
        `${frozen.preparation.contexts[index].rawOutput}: unattempted output already exists`
      );
    }
  }
  return { ...frozen, execution, executionBytes, failed, standing };
}

async function prepareRecovery() {
  const shouldWrite = process.argv.includes("--write");
  const frozenIndex = process.argv.indexOf("--frozen-at");
  const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
  assertV4(
    frozenAt && !Number.isNaN(Date.parse(frozenAt)),
    "--frozen-at requires an ISO timestamp"
  );
  const frozen = await loadOriginalFailureBoundary();
  const protectedPaths = frozen.execution.results
    .filter((result) => result.accepted)
    .map((result) => frozen.preparation.contexts[result.contextIndex].rawOutput);
  protectedPaths.push(
    frozen.preparation.contexts[FAILED_CONTEXT_INDEX].rawOutput
  );
  const protectedOutputHashes = await hashFiles(protectedPaths);
  const contextIndexes = [FAILED_CONTEXT_INDEX, ...UNATTEMPTED_CONTEXT_INDEXES];
  const contexts = contextIndexes.map((contextIndex) => {
    const original = frozen.preparation.contexts[contextIndex];
    return {
      ...structuredClone(original),
      originalContextIndex: contextIndex,
      attemptClass:
        contextIndex === FAILED_CONTEXT_INDEX
          ? "fresh-level-1-recovery-for-atomically-rejected-output"
          : "original-primary-attempt-resumed-after-upstream-stop",
      effectiveRawOutput:
        contextIndex === FAILED_CONTEXT_INDEX ? RECOVERED_OUTPUT : original.rawOutput,
      chronologyCorrectionRequired: contextIndex === FAILED_CONTEXT_INDEX,
      attemptsMaximum: 1,
      retriesMaximum: 0,
      timeoutExtensionsMaximum: 0,
    };
  });
  const sourceHashes = await hashFiles([
    PREPARATION,
    PREPARATION_VALIDATION,
    ACTIVATION,
    ORIGINAL_EXECUTION,
    frozen.preparation.modelInputs.manual,
    VALIDATOR,
    POST_CANARY_BATCH_17_STANDING_AUTHORIZATION,
    SCRIPT,
    ...contexts.flatMap((context) => [
      context.packet,
      context.schemaPath,
      context.modelTokenCountedLedgerPath,
      context.validationChunkLedgerPath,
    ]),
    ...protectedPaths,
  ]);
  const diagnosis = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-17-discovery-recovery-diagnosis",
    protocolId:
      "assessment-production-post-canary-batch-17-debate-77-chunk-002-discovery-recovery-1",
    status:
      "single-atomic-chronology-validation-failure-diagnosed-one-fresh-context-required",
    diagnosedAt: frozenAt,
    originalExecution: ORIGINAL_EXECUTION,
    originalExecutionSha256: sha256(frozen.executionBytes),
    failure: {
      contextIndex: FAILED_CONTEXT_INDEX,
      debateNumber: "77",
      chunkId: "chunk-002",
      classification:
        "complete-schema-conforming-output-rejected-because-final-candidate-start-event-was-not-chronological",
      attemptCount: 1,
      retryCount: 0,
      failedOutputPreserved: true,
      failedOutputSha256: frozen.failed.rawOutputSha256,
      failedPartialOutputReusable: false,
    },
    schedulerStop: {
      contextsPlanned: 17,
      contextsAttempted: 3,
      contextsAccepted: 2,
      contextsUnattempted: 14,
      unattemptedContextIndexes: UNATTEMPTED_CONTEXT_INDEXES,
    },
    finding:
      "The source, transport, schema, speaker allowlist, and complete-core review passed. The atomic output failed only because its tenth candidate began earlier than its ninth. One fresh full-context pass with an explicit ascending-start-event instruction is the minimum diagnosed recovery; the fourteen never-attempted contexts retain their original primary attempts.",
    nextAuthorizedAction:
      "freeze-one-fresh-recovery-context-and-fourteen-original-primary-resumptions",
  };
  const correction = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-17-discovery-recovery-plan",
    protocolId: diagnosis.protocolId,
    status:
      "frozen-batch-17-debate-77-chunk-002-level-1-discovery-recovery-and-resumption-plan",
    recoveryLevel: 1,
    failedContextIndex: FAILED_CONTEXT_INDEX,
    minimumFreshRecoveryContexts: 1,
    originalPrimaryResumptionContexts: 14,
    recoveryInputBoundaryUnchanged: true,
    recoveryPromptCorrection:
      "Candidates must be emitted in strictly nondecreasing sourceWindow.startEvent order; ties must use nondecreasing endEvent and candidateId.",
    failedOutputReusable: false,
    acceptedOriginalOutputsImmutable: true,
    unattemptedContextsReceiveOriginalPrimaryAttempt: true,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    furtherOrdinaryRecoveryLevelsMaximum: 1,
    directIncrementalCostUsdMaximum: 0,
  };
  const preparation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-17-discovery-recovery-and-resumption-preparation",
    protocolId: diagnosis.protocolId,
    status: RECOVERY_PREPARATION_STATUS,
    preparedAt: frozenAt,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    branch: "main",
    productionContinuation: true,
    stagingOnly: true,
    recoveryLevel: 1,
    model: structuredClone(frozen.activation.model),
    original: {
      preparation: PREPARATION,
      activation: ACTIVATION,
      execution: ORIGINAL_EXECUTION,
      failedContextIndex: FAILED_CONTEXT_INDEX,
    },
    diagnosis: RECOVERY_DIAGNOSIS,
    correctionPlan: RECOVERY_PLAN,
    contexts,
    executionPolicy: {
      contexts: contexts.length,
      freshRecoveryContexts: 1,
      originalPrimaryResumptionContexts: 14,
      attemptsPerContext: 1,
      retriesMaximum: 0,
      timeoutMsPerContext:
        frozen.activation.executionPolicy.timeoutMsPerContext,
      timeoutExtensionsMaximum: 0,
      maximumParallelContexts: 4,
      schedulerRampAfterFreshRecovery: [2, 4],
      APIKeysRemoved: true,
      removedEnvironmentVariables:
        frozen.activation.executionPolicy.removedEnvironmentVariables,
      directIncrementalCostUsdMaximum: 0,
      separateActivationRequired: true,
    },
    isolation: {
      freshTemporaryCodexHomePerContext: true,
      freshTemporaryWorkingDirectoryPerContext: true,
      failedOutputUnavailableToRecovery: true,
      acceptedOutputsUnavailableToAllNewContexts: true,
      otherNewOutputsUnavailable: true,
      otherDebatesUnavailable: true,
      legacyAssessmentsScoresWinnersTagsAndPublicationProseUnavailable: true,
    },
    protectedOutputHashes,
    sourceHashes,
    futureArtifacts: [
      RECOVERY_ACTIVATION,
      RECOVERY_EXECUTION,
      RECOVERY_ANALYSIS,
      COHORT_EXECUTION_OVERLAY,
      RECOVERED_OUTPUT,
      frozen.activation.artifacts.analysis,
      ...UNATTEMPTED_CONTEXT_INDEXES.map(
        (index) => frozen.preparation.contexts[index].rawOutput
      ),
    ],
    authorization: {
      modelContexts: false,
      deterministicCohortOverlay: false,
      analysis: false,
      retry: false,
      timeoutExtension: false,
      semanticCorrection: false,
      scoreDerivation: false,
      productionMutation: false,
      nextBatchSelection: false,
    },
    nextAuthorizedAction:
      "freeze-and-commit-recovery-preparation-then-activate",
  };
  if (shouldWrite) {
    await mkdir(RECOVERY_ROOT, { recursive: true });
    await writeFile(RECOVERY_DIAGNOSIS, jsonBytes(diagnosis));
    await writeFile(RECOVERY_PLAN, jsonBytes(correction));
    await writeFile(RECOVERY_PREPARATION, jsonBytes(preparation));
  }
  console.log(
    JSON.stringify(
      {
        status: shouldWrite ? RECOVERY_PREPARATION_STATUS : "preview",
        failure: diagnosis.failure,
        recoveryLevel: 1,
        freshRecoveryContexts: 1,
        originalPrimaryResumptionContexts: 14,
        protectedOutputs: Object.keys(protectedOutputHashes).length,
        modelContextsAuthorized: false,
        directIncrementalCostUsdMaximum: 0,
        nextAuthorizedAction: preparation.nextAuthorizedAction,
      },
      null,
      2
    )
  );
}

async function loadRecoveryPreparation() {
  const bytes = await readFile(RECOVERY_PREPARATION);
  const preparation = JSON.parse(bytes);
  assertV4(
    preparation.status === RECOVERY_PREPARATION_STATUS &&
      preparation.recoveryLevel === 1 &&
      preparation.contexts.length === 15 &&
      preparation.contexts[0].originalContextIndex === FAILED_CONTEXT_INDEX &&
      preparation.contexts[0].chronologyCorrectionRequired === true &&
      preparation.executionPolicy.freshRecoveryContexts === 1 &&
      preparation.executionPolicy.originalPrimaryResumptionContexts === 14 &&
      preparation.executionPolicy.attemptsPerContext === 1 &&
      preparation.executionPolicy.retriesMaximum === 0 &&
      preparation.authorization.modelContexts === false,
    "recovery preparation drifted"
  );
  await assertHashes(preparation.sourceHashes, "recovery preparation source");
  await assertHashes(
    preparation.protectedOutputHashes,
    "protected original output"
  );
  return { preparation, bytes };
}

async function activateRecovery() {
  const shouldWrite = process.argv.includes("--write");
  const activatedIndex = process.argv.indexOf("--activated-at");
  const activatedAt =
    activatedIndex >= 0 ? process.argv[activatedIndex + 1] : null;
  assertV4(
    activatedAt && !Number.isNaN(Date.parse(activatedAt)),
    "--activated-at requires an ISO timestamp"
  );
  if (shouldWrite) {
    assertV4(
      !(await exists(RECOVERY_ACTIVATION)),
      "recovery activation already exists"
    );
  }
  const { preparation, bytes } = await loadRecoveryPreparation();
  const standing =
    await loadAndValidatePostCanaryBatch17StandingAuthorization();
  const sourceHashes = await hashFiles([
    ...Object.keys(preparation.sourceHashes),
    ...Object.keys(preparation.protectedOutputHashes),
    RECOVERY_DIAGNOSIS,
    RECOVERY_PLAN,
    RECOVERY_PREPARATION,
    SCRIPT,
  ]);
  const activation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-17-discovery-recovery-and-resumption-activation",
    protocolId: preparation.protocolId,
    status: RECOVERY_ACTIVATION_STATUS,
    activatedAt,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    recoveryLevel: 1,
    preparation: RECOVERY_PREPARATION,
    preparationSha256: sha256(bytes),
    standingAuthorization: POST_CANARY_BATCH_17_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standing.sha256,
    model: preparation.model,
    contexts: preparation.contexts,
    executionPolicy: preparation.executionPolicy,
    isolation: preparation.isolation,
    protectedOutputHashes: preparation.protectedOutputHashes,
    sourceHashes,
    authorization: {
      modelContexts: true,
      deterministicCohortOverlay: true,
      analysis: true,
      retry: false,
      timeoutExtension: false,
      semanticCorrection: false,
      scoreDerivation: false,
      productionMutation: false,
      nextBatchSelection: false,
    },
    nextRequiredAction:
      "execute-one-fresh-recovery-context-then-fourteen-unattempted-primary-contexts",
  };
  if (shouldWrite) {
    await writeFile(RECOVERY_ACTIVATION, jsonBytes(activation));
  }
  console.log(
    JSON.stringify(
      {
        status: shouldWrite ? RECOVERY_ACTIVATION_STATUS : "preview",
        recoveryLevel: 1,
        contexts: activation.contexts.length,
        freshRecoveryContexts: 1,
        originalPrimaryResumptionContexts: 14,
        model: activation.model,
        attemptsPerContext: 1,
        retriesMaximum: 0,
        directIncrementalCostUsdMaximum: 0,
      },
      null,
      2
    )
  );
}

async function loadRecoveryActivation() {
  const { preparation } = await loadRecoveryPreparation();
  const bytes = await readFile(RECOVERY_ACTIVATION);
  const activation = JSON.parse(bytes);
  assertV4(
    activation.status === RECOVERY_ACTIVATION_STATUS &&
      activation.recoveryLevel === 1 &&
      activation.contexts.length === 15 &&
      activation.model.label === "5.6 Sol" &&
      activation.model.slug === "gpt-5.6-sol" &&
      activation.model.reasoningEffort === "low" &&
      activation.model.authentication === "ChatGPT subscription" &&
      activation.executionPolicy.attemptsPerContext === 1 &&
      activation.executionPolicy.retriesMaximum === 0 &&
      activation.executionPolicy.timeoutExtensionsMaximum === 0 &&
      activation.authorization.modelContexts === true &&
      activation.authorization.retry === false,
    "recovery activation drifted"
  );
  await assertHashes(activation.sourceHashes, "recovery activation source");
  await assertHashes(
    activation.protectedOutputHashes,
    "protected original output"
  );
  return { preparation, activation, bytes };
}

async function executeRecoveryBounded() {
  assertV4(
    !(await exists(RECOVERY_EXECUTION)) &&
      !(await exists(COHORT_EXECUTION_OVERLAY)),
    "recovery execution already exists"
  );
  const { preparation: recoveryPreparation, activation: recoveryActivation } =
    await loadRecoveryActivation();
  const frozen = await loadOriginalFailureBoundary({
    allowRecoveryArtifacts: true,
  });
  const codex = frozen.activation.executionEnvironment.codexPath;
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  await access(codex);
  await access(authSource);
  let activeContexts = 0;
  let maximumParallelContextsObserved = 0;
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const deadline =
    started + frozen.activation.executionPolicy.absoluteGateTimeoutMs;

  async function executeContext(context) {
    const originalIndex = context.originalContextIndex;
    const outputPath = context.effectiveRawOutput;
    assertV4(
      !(await exists(outputPath)),
      `${outputPath}: fresh output target already exists`
    );
    await validateContextInputs(frozen.preparation, context);
    const remainingGateMs = deadline - Date.now();
    assertV4(
      remainingGateMs > 0,
      "absolute recovery/resumption gate timeout reached before context launch"
    );
    const timeoutMs = Math.min(
      recoveryActivation.executionPolicy.timeoutMsPerContext,
      remainingGateMs
    );
    const sourceDirectory = await mkdtemp(
      path.join(
        os.tmpdir(),
        `slugfester-b17-discovery-r1-${context.debateNumber}-${context.chunkId}-`
      )
    );
    const isolatedCodexHome = await mkdtemp(
      path.join(
        os.tmpdir(),
        `slugfester-b17-discovery-r1-home-${context.debateNumber}-${context.chunkId}-`
      )
    );
    const contextStartedAt = new Date().toISOString();
    const contextStarted = Date.now();
    activeContexts += 1;
    maximumParallelContextsObserved = Math.max(
      maximumParallelContextsObserved,
      activeContexts
    );
    let record;
    try {
      for (const [source, target] of [
        [frozen.preparation.modelInputs.manual, "manual.md"],
        [context.packet, "packet.json"],
        [context.schemaPath, "schema.json"],
        [context.modelTokenCountedLedgerPath, "token-counted-ledger.jsonl"],
      ]) {
        await copyFile(source, path.join(sourceDirectory, target));
      }
      await copyFile(authSource, path.join(isolatedCodexHome, "auth.json"));
      const env = { ...process.env, CODEX_HOME: isolatedCodexHome };
      for (const key of recoveryActivation.executionPolicy
        .removedEnvironmentVariables) {
        delete env[key];
      }
      const prompt = `Read manual.md, packet.json, schema.json, and every line of token-counted-ledger.jsonl; read nothing else. Act only as the isolated bounded-end score-blind source-discovery reviewer for post-canary Batch 17 Debate ${context.debateNumber}, ${context.chunkId}. The owned core is events ${context.coreStartEvent} through ${context.coreEndEvent}; boundary context is events ${context.contextStartEvent} through ${context.contextEndEvent}. Review the entire context. Follow the predecessor-chunk ownership rule. Emit zero to ten load-bearing candidates whose start event lies inside the core. Emit candidates in strictly nondecreasing sourceWindow.startEvent order; when start events tie, use nondecreasing sourceWindow.endEvent and then candidateId. For each candidate emit sourceWindow.startEvent and the actual final source row as sourceWindow.endEvent, bounded by the delivered context. Use the per-row lexical-token counts to ensure the inclusive window has at least twelve tokens. Never emit a requested lexical-token count, target ID, moveKind, evidence text, rating, score, section, winner, tag, Overall Commentary, AI Extension, policy analysis, or assessment/publication prose. Return exactly one schema-conforming JSON object.`;
      process.stdout.write(
        `[batch-17-discovery-recovery] starting ${context.attemptClass} Debate ${context.debateNumber} ${context.chunkId}\n`
      );
      const invocation = await runChild(
        codex,
        [
          "exec",
          "--ephemeral",
          "--skip-git-repo-check",
          "--ignore-user-config",
          "--ignore-rules",
          "--model",
          recoveryActivation.model.slug,
          "-c",
          `model_reasoning_effort="${recoveryActivation.model.reasoningEffort}"`,
          "--disable",
          "plugins",
          "--disable",
          "remote_plugin",
          "--disable",
          "skill_search",
          "--disable",
          "apps",
          "--disable",
          "memories",
          "--disable",
          "multi_agent",
          "--disable",
          "browser_use",
          "--disable",
          "computer_use",
          "--disable",
          "workspace_dependencies",
          "--sandbox",
          "read-only",
          "--color",
          "never",
          "--output-schema",
          "schema.json",
          "--output-last-message",
          "result.json",
          prompt,
        ],
        { cwd: sourceDirectory, env },
        timeoutMs
      );
      const resultPath = path.join(sourceDirectory, "result.json");
      const resultExists = await exists(resultPath);
      const base = {
        contextIndex: originalIndex,
        debateNumber: context.debateNumber,
        chunkId: context.chunkId,
        attemptClass: context.attemptClass,
        recoveryLevel:
          originalIndex === FAILED_CONTEXT_INDEX ? 1 : 0,
        model: recoveryActivation.model.label,
        modelSlug: recoveryActivation.model.slug,
        reasoningEffort: recoveryActivation.model.reasoningEffort,
        attemptCount: 1,
        retryCount: 0,
        startedAt: contextStartedAt,
        completedAt: new Date().toISOString(),
        elapsedMs: Date.now() - contextStarted,
        timeoutMsApplied: timeoutMs,
        timedOut: invocation.timedOut,
        commandExitCode: invocation.code,
        terminationSignal: invocation.signal,
        authentication: "ChatGPT subscription",
        apiKeysRemoved: true,
        scoreBlind: true,
        isolatedTemporaryCodexHome: true,
        exactCopiedInputFiles: 4,
        rawOutputPath: outputPath,
        meteredApiCostUsd: 0,
        transcriptionCostUsd: 0,
        stdoutSha256: sha256(invocation.stdout),
        stderrSha256: sha256(invocation.stderr),
      };
      if (
        invocation.timedOut ||
        invocation.code !== 0 ||
        invocation.signal !== null ||
        !resultExists
      ) {
        record = {
          ...base,
          status: invocation.timedOut
            ? "timed-out"
            : !resultExists
              ? "result-missing"
              : "transport-failed",
          accepted: false,
          rawOutputWritten: false,
          stdoutTail: invocation.stdout.slice(-12000),
          stderrTail: invocation.stderr.slice(-12000),
        };
      } else {
        await mkdir(path.dirname(outputPath), { recursive: true });
        await copyFile(resultPath, outputPath);
        const validation = await runChild(
          process.execPath,
          [
            VALIDATOR,
            outputPath,
            frozen.preparation.preparation,
            context.debateNumber,
            context.chunkId,
          ],
          { cwd: process.cwd(), env: process.env },
          120000
        );
        const valid =
          validation.code === 0 &&
          validation.signal === null &&
          !validation.timedOut;
        const validationSummary = valid
          ? JSON.parse(validation.stdout)
          : null;
        record = {
          ...base,
          status: valid ? "completed-valid" : "output-validation-failed",
          accepted: valid,
          rawOutputWritten: true,
          rawOutputSha256: sha256(await readFile(outputPath)),
          validationSummary,
          validationMessage: valid
            ? null
            : `${validation.stdout}\n${validation.stderr}`.trim().slice(-6000),
          stdoutTail: valid ? null : invocation.stdout.slice(-12000),
          stderrTail: valid ? null : invocation.stderr.slice(-12000),
        };
      }
    } catch (error) {
      record = {
        contextIndex: originalIndex,
        debateNumber: context.debateNumber,
        chunkId: context.chunkId,
        attemptClass: context.attemptClass,
        recoveryLevel:
          originalIndex === FAILED_CONTEXT_INDEX ? 1 : 0,
        model: recoveryActivation.model.label,
        modelSlug: recoveryActivation.model.slug,
        reasoningEffort: recoveryActivation.model.reasoningEffort,
        attemptCount: 1,
        retryCount: 0,
        startedAt: contextStartedAt,
        completedAt: new Date().toISOString(),
        elapsedMs: Date.now() - contextStarted,
        timeoutMsApplied: timeoutMs,
        timedOut: false,
        authentication: "ChatGPT subscription",
        apiKeysRemoved: true,
        scoreBlind: true,
        meteredApiCostUsd: 0,
        transcriptionCostUsd: 0,
        status: "runner-failed",
        accepted: false,
        rawOutputWritten: false,
        failureMessage: error.message,
      };
    } finally {
      activeContexts -= 1;
      await rm(sourceDirectory, { recursive: true, force: true });
      await rm(isolatedCodexHome, { recursive: true, force: true });
    }
    process.stdout.write(
      `[batch-17-discovery-recovery] Debate ${context.debateNumber} ${context.chunkId} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`
    );
    return record;
  }

  const newResults = [];
  const phases = [];
  async function runPhase(contexts, maximumParallelContexts, phase) {
    const phaseStartedAt = new Date().toISOString();
    let cursor = 0;
    const phaseResults = new Array(contexts.length);
    async function worker() {
      while (cursor < contexts.length) {
        const position = cursor;
        cursor += 1;
        phaseResults[position] = await executeContext(contexts[position]);
      }
    }
    await Promise.all(
      Array.from(
        { length: Math.min(maximumParallelContexts, contexts.length) },
        () => worker()
      )
    );
    newResults.push(...phaseResults);
    const passed = phaseResults.every((result) => result.accepted);
    phases.push({
      phase,
      maximumParallelContexts,
      contextIndexes: contexts.map((context) => context.originalContextIndex),
      startedAt: phaseStartedAt,
      completedAt: new Date().toISOString(),
      passed,
    });
    return passed;
  }

  let passed = await runPhase(
    [recoveryPreparation.contexts[0]],
    1,
    "fresh-level-1-recovery"
  );
  if (passed) {
    passed = await runPhase(
      recoveryPreparation.contexts.slice(1, 3),
      2,
      "resumed-ramp-two"
    );
  }
  if (passed) {
    passed = await runPhase(
      recoveryPreparation.contexts.slice(3),
      4,
      "resumed-steady-four"
    );
  }

  const validNewContexts = newResults.filter((result) => result.accepted).length;
  const execution = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-17-discovery-recovery-and-resumption-execution",
    protocolId: recoveryActivation.protocolId,
    status:
      passed && validNewContexts === 15
        ? RECOVERY_EXECUTION_STATUS
        : "batch-17-discovery-recovery-and-resumption-complete-with-failure",
    startedAt,
    completedAt: new Date().toISOString(),
    wallElapsedMs: Date.now() - started,
    contextsPlanned: 15,
    contextsAttempted: newResults.length,
    contextsUnattempted: 15 - newResults.length,
    validContexts: validNewContexts,
    invalidContexts: newResults.length - validNewContexts,
    freshRecoveryContextsAttempted: newResults.filter(
      (result) => result.recoveryLevel === 1
    ).length,
    originalPrimaryResumptionContextsAttempted: newResults.filter(
      (result) => result.recoveryLevel === 0
    ).length,
    attempts: newResults.length,
    retries: 0,
    timeoutExtensions: 0,
    recoveryLevel: 1,
    maximumParallelContextsObserved,
    phases,
    model: recoveryActivation.model,
    results: newResults,
    totals: {
      modelContextsExecuted: newResults.length,
      retries: 0,
      timeoutExtensions: 0,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      scoresDerived: 0,
      productionMutations: 0,
    },
    authorization: {
      deterministicCohortOverlay: passed && validNewContexts === 15,
      analysis: passed && validNewContexts === 15,
      furtherRecovery: !(passed && validNewContexts === 15),
      retry: false,
      timeoutExtension: false,
      scoreDerivation: false,
      productionMutation: false,
    },
  };
  await writeFile(RECOVERY_EXECUTION, jsonBytes(execution));

  if (execution.authorization.deterministicCohortOverlay) {
    const originalByIndex = new Map(
      frozen.execution.results.map((result) => [result.contextIndex, result])
    );
    const newByIndex = new Map(
      newResults.map((result) => [result.contextIndex, result])
    );
    const results = frozen.preparation.contexts.map((context, index) => {
      if (index === FAILED_CONTEXT_INDEX) {
        return {
          ...newByIndex.get(index),
          status: "completed-valid-after-level-1-fresh-recovery",
          originalFailedAttemptPreserved: {
            execution: ORIGINAL_EXECUTION,
            rawOutput: context.rawOutput,
            rawOutputSha256: frozen.failed.rawOutputSha256,
            failedOutputUsed: false,
          },
        };
      }
      return originalByIndex.get(index) ?? newByIndex.get(index);
    });
    assertV4(
      results.length === CONTEXTS &&
        results.every((result) => result?.accepted),
      "complete recovered discovery cohort is invalid"
    );
    const overlay = {
      ...structuredClone(frozen.execution),
      status: EXPECTED_EXECUTION_STATUS,
      contextsAttempted: CONTEXTS,
      contextsUnattempted: 0,
      validContexts: CONTEXTS,
      invalidContexts: 0,
      attempts: frozen.execution.attempts + newResults.length,
      rampPassed: true,
      rampPhases: [
        ...frozen.execution.rampPhases,
        ...phases,
      ],
      wallElapsedMs: frozen.execution.wallElapsedMs + execution.wallElapsedMs,
      modelWorkElapsedMs:
        frozen.execution.modelWorkElapsedMs +
        newResults.reduce((sum, result) => sum + result.elapsedMs, 0),
      results,
      recovery: {
        recoveryLevel: 1,
        failedContextIndex: FAILED_CONTEXT_INDEX,
        freshRecoveryContextsAttempted: 1,
        freshRecoveryContextsPassed: 1,
        originalPrimaryResumptionContextsAttempted: 14,
        originalPrimaryResumptionContextsPassed: 14,
        originalAcceptedOutputsPreservedByteIdentical: 2,
        originalFailedOutputPreservedByteIdentical: true,
        failedOutputUsed: false,
        retries: 0,
        timeoutExtensions: 0,
      },
      authorization: {
        ...frozen.execution.authorization,
        deterministicAnalysis: true,
        inventoryPreparation: false,
      },
    };
    await writeFile(COHORT_EXECUTION_OVERLAY, jsonBytes(overlay));
  }
  console.log(
    JSON.stringify(
      {
        status: execution.status,
        contextsAttempted: execution.contextsAttempted,
        contextsUnattempted: execution.contextsUnattempted,
        validContexts: execution.validContexts,
        invalidContexts: execution.invalidContexts,
        freshRecoveryContextsAttempted:
          execution.freshRecoveryContextsAttempted,
        originalPrimaryResumptionContextsAttempted:
          execution.originalPrimaryResumptionContextsAttempted,
        wallElapsedMinutes: Number(
          (execution.wallElapsedMs / 60000).toFixed(2)
        ),
        maximumParallelContextsObserved,
        retries: 0,
        timeoutExtensions: 0,
        directIncrementalCostUsd: 0,
      },
      null,
      2
    )
  );
}

async function executeRecovery() {
  return await executeRecoveryBounded();
  const { activation, preparation, sourcePreparation } =
    await loadAndValidateActivation();
  for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
    if (future !== ACTIVATION) {
      assertV4(!(await exists(future)), `future output already exists: ${future}`);
    }
  }
  const codex = activation.executionEnvironment.codexPath;
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  assertV4(
    execFileSync(codex, ["--version"], { encoding: "utf8" }).trim() ===
      activation.executionEnvironment.codexCliVersion,
    "frozen Codex CLI version changed"
  );
  await access(codex);
  await access(authSource);

  let activeContexts = 0;
  let maximumParallelContextsObserved = 0;
  const gateStartedAt = new Date().toISOString();
  const gateStarted = Date.now();
  const gateDeadline = gateStarted + activation.executionPolicy.absoluteGateTimeoutMs;

  async function executeContext(context, contextIndex) {
    const debate = sourcePreparation.contexts.find(
      (item) => item.debateNumber === context.debateNumber
    );
    const chunk = debate.chunks.find((item) => item.chunkId === context.chunkId);
    await validateContextInputs(preparation, context);
    const remainingGateMs = gateDeadline - Date.now();
    assertV4(
      remainingGateMs > 0,
      "absolute discovery gate timeout reached before context launch"
    );
    const contextTimeoutMs = Math.min(
      activation.executionPolicy.timeoutMsPerContext,
      remainingGateMs
    );
    const sourceDirectory = await mkdtemp(
      path.join(
        os.tmpdir(),
        `slugfester-post-canary-batch-17-discovery-${context.debateNumber}-${context.chunkId}-`
      )
    );
    const isolatedCodexHome = await mkdtemp(
      path.join(
        os.tmpdir(),
        `slugfester-post-canary-batch-17-discovery-home-${context.debateNumber}-${context.chunkId}-`
      )
    );
    const startedAt = new Date().toISOString();
    const started = Date.now();
    activeContexts += 1;
    maximumParallelContextsObserved = Math.max(
      maximumParallelContextsObserved,
      activeContexts
    );
    let record;
    try {
      for (const [source, target] of [
        [preparation.modelInputs.manual, "manual.md"],
        [context.packet, "packet.json"],
        [context.schemaPath, "schema.json"],
        [context.modelTokenCountedLedgerPath, "token-counted-ledger.jsonl"],
      ]) {
        await copyFile(source, path.join(sourceDirectory, target));
      }
      await copyFile(authSource, path.join(isolatedCodexHome, "auth.json"));
      const env = { ...process.env, CODEX_HOME: isolatedCodexHome };
      for (const key of activation.executionPolicy.removedEnvironmentVariables) {
        delete env[key];
      }
      const prompt = `Read manual.md, packet.json, schema.json, and every line of token-counted-ledger.jsonl; read nothing else. Act only as the isolated bounded-end score-blind source-discovery reviewer for post-canary Batch 17 Debate ${context.debateNumber}, ${context.chunkId}. The owned core is events ${context.coreStartEvent} through ${context.coreEndEvent}; boundary context is events ${context.contextStartEvent} through ${context.contextEndEvent}. Review the entire context. Follow the predecessor-chunk ownership rule. Emit zero to ten chronological load-bearing candidates whose start event lies inside the core. For each candidate emit sourceWindow.startEvent and the actual final source row as sourceWindow.endEvent, bounded by the delivered context. Use the per-row lexical-token counts to ensure the inclusive window has at least twelve tokens. Never emit a requested lexical-token count, target ID, moveKind, evidence text, rating, score, section, winner, tag, Overall Commentary, AI Extension, policy analysis, or assessment/publication prose. Return exactly one schema-conforming JSON object.`;
      process.stdout.write(
        `[post-canary-batch-17-discovery] starting ${activation.model.label}/${activation.model.reasoningEffort} Debate ${context.debateNumber} ${context.chunkId}\n`
      );
      const invocation = await runChild(
        codex,
        [
          "exec",
          "--ephemeral",
          "--skip-git-repo-check",
          "--ignore-user-config",
          "--ignore-rules",
          "--model",
          activation.model.slug,
          "-c",
          `model_reasoning_effort="${activation.model.reasoningEffort}"`,
          "--disable",
          "plugins",
          "--disable",
          "remote_plugin",
          "--disable",
          "skill_search",
          "--disable",
          "apps",
          "--disable",
          "memories",
          "--disable",
          "multi_agent",
          "--disable",
          "browser_use",
          "--disable",
          "computer_use",
          "--disable",
          "workspace_dependencies",
          "--sandbox",
          "read-only",
          "--color",
          "never",
          "--output-schema",
          "schema.json",
          "--output-last-message",
          "result.json",
          prompt,
        ],
        { cwd: sourceDirectory, env },
        contextTimeoutMs
      );
      const resultPath = path.join(sourceDirectory, "result.json");
      const resultExists = await exists(resultPath);
      const base = {
        contextIndex,
        debateNumber: context.debateNumber,
        chunkId: context.chunkId,
        model: activation.model.label,
        modelSlug: activation.model.slug,
        reasoningEffort: activation.model.reasoningEffort,
        attemptCount: 1,
        retryCount: 0,
        startedAt,
        completedAt: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        timeoutMsApplied: contextTimeoutMs,
        timedOut: invocation.timedOut,
        commandExitCode: invocation.code,
        terminationSignal: invocation.signal,
        authentication: "ChatGPT subscription",
        apiKeysRemoved: true,
        scoreBlind: true,
        isolatedTemporaryCodexHome: true,
        exactCopiedInputFiles: 4,
        meteredApiCostUsd: 0,
        transcriptionCostUsd: 0,
        stdoutSha256: sha256(invocation.stdout),
        stderrSha256: sha256(invocation.stderr),
      };
      if (
        invocation.timedOut ||
        invocation.code !== 0 ||
        invocation.signal !== null ||
        !resultExists
      ) {
        record = {
          ...base,
          status: invocation.timedOut
            ? "timed-out"
            : !resultExists
              ? "result-missing"
              : "transport-failed",
          accepted: false,
          rawOutputWritten: false,
          stdoutTail: invocation.stdout.slice(-12000),
          stderrTail: invocation.stderr.slice(-12000),
        };
      } else {
        await mkdir(path.dirname(context.rawOutput), { recursive: true });
        await copyFile(resultPath, context.rawOutput);
        const validation = await runChild(
          process.execPath,
          [
            VALIDATOR,
            context.rawOutput,
            preparation.preparation,
            context.debateNumber,
            context.chunkId,
          ],
          { cwd: process.cwd(), env: process.env },
          120000
        );
        const valid =
          validation.code === 0 &&
          validation.signal === null &&
          !validation.timedOut;
        const validationSummary = valid ? JSON.parse(validation.stdout) : null;
        if (valid) {
          assertV4(
            validationSummary.repositoryDerivedLexicalTokenCounts === true &&
              validationSummary.modelAuthoredLexicalTokenCounts === false &&
              validationSummary.modelAuthoredBoundedEndEvents === true &&
              validationSummary
                .startDependentLockedLookaheadCapacityStructurallyBounded ===
                true,
            `${context.debateNumber}/${context.chunkId}: validation drifted`
          );
        }
        record = {
          ...base,
          status: valid ? "completed-valid" : "output-validation-failed",
          accepted: valid,
          rawOutputWritten: true,
          rawOutputSha256: sha256(await readFile(context.rawOutput)),
          validationSummary,
          validationMessage: valid
            ? null
            : `${validation.stdout}\n${validation.stderr}`.trim().slice(-6000),
          stdoutTail: valid ? null : invocation.stdout.slice(-12000),
          stderrTail: valid ? null : invocation.stderr.slice(-12000),
        };
      }
    } catch (error) {
      record = {
        contextIndex,
        debateNumber: context.debateNumber,
        chunkId: context.chunkId,
        model: activation.model.label,
        modelSlug: activation.model.slug,
        reasoningEffort: activation.model.reasoningEffort,
        attemptCount: 1,
        retryCount: 0,
        startedAt,
        completedAt: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        timeoutMsApplied: contextTimeoutMs,
        timedOut: false,
        commandExitCode: null,
        terminationSignal: null,
        authentication: "ChatGPT subscription",
        apiKeysRemoved: true,
        scoreBlind: true,
        isolatedTemporaryCodexHome: true,
        exactCopiedInputFiles: 4,
        meteredApiCostUsd: 0,
        transcriptionCostUsd: 0,
        status: "runner-failed",
        accepted: false,
        rawOutputWritten: false,
        failureMessage: error.message,
      };
    } finally {
      activeContexts -= 1;
      await rm(sourceDirectory, { recursive: true, force: true });
      await rm(isolatedCodexHome, { recursive: true, force: true });
    }
    process.stdout.write(
      `[post-canary-batch-17-discovery] Debate ${context.debateNumber} ${context.chunkId} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`
    );
    return record;
  }

  const resultsByIndex = new Array(preparation.contexts.length);
  const rampPhases = [];
  async function runFixedIndexes(indexes, maximumParallelContexts, phase) {
    const startedAt = new Date().toISOString();
    let cursor = 0;
    async function worker() {
      while (cursor < indexes.length) {
        const position = cursor;
        cursor += 1;
        const contextIndex = indexes[position];
        resultsByIndex[contextIndex] = await executeContext(
          preparation.contexts[contextIndex],
          contextIndex
        );
      }
    }
    await Promise.all(
      Array.from(
        { length: Math.min(maximumParallelContexts, indexes.length) },
        () => worker()
      )
    );
    const phaseResults = indexes.map((index) => resultsByIndex[index]);
    const passed = phaseResults.every((result) => result.accepted);
    rampPhases.push({
      phase,
      maximumParallelContexts,
      contextIndexes: indexes,
      startedAt,
      completedAt: new Date().toISOString(),
      passed,
    });
    return passed;
  }

  let rampPassed = await runFixedIndexes([0], 1, "operational-canary-one");
  if (rampPassed) rampPassed = await runFixedIndexes([1, 2], 2, "ramp-two");
  if (rampPassed) {
    rampPassed = await runFixedIndexes(
      Array.from(
        { length: preparation.contexts.length - 3 },
        (_, index) => index + 3
      ),
      4,
      "steady-four"
    );
  }

  const results = resultsByIndex.filter(Boolean);
  const validContexts = results.filter((result) => result.accepted).length;
  const execution = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-discovery-model-execution",
    protocolId: activation.protocolId,
    discoveryProtocolId: V212_DISCOVERY_PROTOCOL_ID,
    status:
      validContexts === preparation.contexts.length
        ? EXPECTED_EXECUTION_STATUS
        : "post-canary-batch-17-discovery-complete-with-failure",
    productionContinuation: true,
    developmentValidationOnly: false,
    productionCanary: false,
    stagingOnly: true,
    gateStartedAt,
    gateCompletedAt: new Date().toISOString(),
    contextsPlanned: preparation.contexts.length,
    contextsAttempted: results.length,
    contextsUnattempted: preparation.contexts.length - results.length,
    validContexts,
    invalidContexts: results.length - validContexts,
    attempts: results.length,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    parallelismMaximumAllowed: activation.executionPolicy.maximumParallelContexts,
    maximumParallelContextsObserved,
    schedulerRamp: activation.executionPolicy.schedulerRamp,
    rampPhases,
    rampPassed,
    wallElapsedMs: Date.now() - gateStarted,
    modelWorkElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0),
    results,
    authentication: "ChatGPT subscription",
    scoreBlind: true,
    repositoryDerivedLexicalTokenCounts: results.every(
      (result) =>
        !result.accepted ||
        result.validationSummary?.repositoryDerivedLexicalTokenCounts === true
    ),
    modelAuthoredLexicalTokenCounts: false,
    modelAuthoredBoundedEndEvents: true,
    startDependentLockedLookaheadCapacityStructurallyBounded: true,
    zeroLexicalTokenRowsPreservedWithCountZero: true,
    exactSourceRowsInjectedOmittedOrRewritten: false,
    activePolicyVersion: activation.activePolicy.version,
    integerRoundedTiesPermitted: true,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    scoresDerived: 0,
    productionMutations: 0,
    authorization: {
      deterministicAnalysis: validContexts === preparation.contexts.length,
      retry: false,
      timeoutExtension: false,
      semanticCorrection: false,
      inventoryPreparation: false,
      inventoryModelExecution: false,
      independentJudgmentModelExecution: false,
      paidTranscription: false,
      scoreDerivation: false,
      publicationModelExecution: false,
      productionMutation: false,
    },
  };
  await writeFile(activation.artifacts.execution, jsonBytes(execution));
  console.log(
    JSON.stringify(
      {
        status: execution.status,
        contextsAttempted: execution.contextsAttempted,
        contextsUnattempted: execution.contextsUnattempted,
        validContexts,
        invalidContexts: execution.invalidContexts,
        wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
        aggregateModelMinutes: Number(
          (execution.modelWorkElapsedMs / 60000).toFixed(2)
        ),
        maximumParallelContextsObserved,
        retries: 0,
        timeoutExtensions: 0,
        authentication: execution.authentication,
        meteredApiCostUsd: 0,
        scoresDerived: 0,
      },
      null,
      2
    )
  );
}

async function analyzeRecovery() {
  const shouldWrite = process.argv.includes("--write");
  const { activation, preparation, sourcePreparation } =
    await loadAndValidateActivation();
  const execution = JSON.parse(
    await readFile(COHORT_EXECUTION_OVERLAY, "utf8")
  );
  const recoveryExecutionBytes = await readFile(RECOVERY_EXECUTION);
  const recoveryExecution = JSON.parse(recoveryExecutionBytes);
  assertV4(
    activation.authorization.analysis === true &&
      execution.status === EXPECTED_EXECUTION_STATUS &&
      execution.contextsAttempted === CONTEXTS &&
      execution.validContexts === CONTEXTS &&
      execution.invalidContexts === 0 &&
      execution.retries === 0 &&
      execution.timeoutExtensions === 0 &&
      execution.semanticCorrections === 0 &&
      execution.rampPassed === true &&
      execution.rampPhases.length === 5 &&
      execution.rampPhases[0].passed === true &&
      execution.rampPhases[1].passed === false &&
      execution.rampPhases.slice(2).every((phase) => phase.passed) &&
      Math.max(
        execution.maximumParallelContextsObserved,
        recoveryExecution.maximumParallelContextsObserved
      ) <= 4 &&
      execution.repositoryDerivedLexicalTokenCounts === true &&
      execution.modelAuthoredLexicalTokenCounts === false &&
      execution.modelAuthoredBoundedEndEvents === true &&
      execution.startDependentLockedLookaheadCapacityStructurallyBounded === true &&
      execution.zeroLexicalTokenRowsPreservedWithCountZero === true &&
      execution.exactSourceRowsInjectedOmittedOrRewritten === false &&
      execution.activePolicyVersion === "v2.2" &&
      execution.integerRoundedTiesPermitted === true &&
      execution.meteredApiCostUsd === 0 &&
      execution.transcriptionCostUsd === 0 &&
      execution.scoresDerived === 0 &&
      execution.productionMutations === 0 &&
      execution.recovery?.recoveryLevel === 1 &&
      execution.recovery?.freshRecoveryContextsPassed === 1 &&
      execution.recovery?.originalPrimaryResumptionContextsPassed === 14 &&
      execution.recovery?.originalAcceptedOutputsPreservedByteIdentical === 2 &&
      execution.recovery?.originalFailedOutputPreservedByteIdentical === true &&
      execution.recovery?.failedOutputUsed === false &&
      recoveryExecution.status === RECOVERY_EXECUTION_STATUS &&
      recoveryExecution.contextsAttempted === 15 &&
      recoveryExecution.validContexts === 15 &&
      recoveryExecution.invalidContexts === 0 &&
      recoveryExecution.maximumParallelContextsObserved === 4,
    "all Batch 17 discovery contexts must pass without retry before analysis"
  );
  if (shouldWrite) {
    assertV4(
      !(await exists(activation.artifacts.analysis)),
      `${activation.artifacts.analysis} already exists`
    );
    for (const file of [
      ...activation.artifacts.candidateBundles,
      ...activation.artifacts.sparseContexts,
    ]) {
      assertV4(!(await exists(file)), `${file} already exists`);
    }
  }

  const debates = [];
  for (const debate of sourcePreparation.contexts) {
    const [packetBytes, planBytes, eventsBytes, fullLedgerBytes] =
      await Promise.all([
        readFile(debate.packet),
        readFile(debate.plan),
        readFile(debate.originalEvents),
        readFile(debate.fullLedger),
      ]);
    const packet = JSON.parse(packetBytes);
    const plan = JSON.parse(planBytes);
    const eventsDocument = JSON.parse(eventsBytes);
    const outputs = [];
    let derivedWindows = 0;
    for (const chunk of debate.chunks) {
      const effectiveOutputPath =
        debate.debateNumber === "77" && chunk.chunkId === "chunk-002"
          ? RECOVERED_OUTPUT
          : chunk.futureRawOutput;
      const [outputBytes, chunkBytes] = await Promise.all([
        readFile(effectiveOutputPath),
        readFile(chunk.chunkLedgerPath),
      ]);
      const output = JSON.parse(outputBytes);
      const validation = validateV212Discovery(output, {
        packet,
        chunk,
        plan,
        eventsDocument,
        eventsBytes,
        chunkBytes,
        fullLedgerBytes,
      });
      assertV4(
        validation.repositoryDerivedLexicalTokenCounts === true &&
          validation.modelAuthoredLexicalTokenCounts === false &&
          validation.modelAuthoredBoundedEndEvents === true &&
          validation.startDependentLockedLookaheadCapacityStructurallyBounded ===
            true &&
          validation.minimumLexicalTokens ===
            V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
        `${debate.debateNumber}/${chunk.chunkId}: validation drifted`
      );
      derivedWindows += validation.derivedWindows.length;
      outputs.push(output);
    }
    const bundle = compileV212CandidateBundle({
      packet,
      plan,
      outputs,
      eventsDocument,
    });
    assertV4(
      bundle.protocolId === V212_DISCOVERY_PROTOCOL_ID &&
        bundle.completeSourceDiscovery.repositoryDerivedLexicalTokenCounts ===
          true &&
        bundle.completeSourceDiscovery.modelAuthoredLexicalTokenCounts === false &&
        bundle.completeSourceDiscovery.modelAuthoredBoundedEndEvents === true &&
        bundle.completeSourceDiscovery
          .startDependentLockedLookaheadCapacityStructurallyBounded === true &&
        bundle.candidateCount === derivedWindows,
      `${debate.debateNumber}: bundle derivation drifted`
    );
    const pro = bundle.candidates.filter((candidate) => candidate.side === "pro")
      .length;
    const con = bundle.candidates.filter((candidate) => candidate.side === "con")
      .length;
    const candidateMinimumPassed =
      bundle.candidateCount >=
        activation.compilationPolicy.candidateMinimumPerDebate &&
      pro >= activation.compilationPolicy.candidateMinimumPerSide &&
      con >= activation.compilationPolicy.candidateMinimumPerSide;
    const rows = parseV42219Ledger(fullLedgerBytes);
    const included = new Set();
    for (const candidate of bundle.candidates) {
      for (
        let event = Math.max(
          0,
          candidate.sourceSpan.startEvent -
            activation.compilationPolicy.sparseContextFlankEvents
        );
        event <=
        Math.min(
          rows.length - 1,
          candidate.sourceSpan.endEvent +
            activation.compilationPolicy.sparseContextFlankEvents
        );
        event += 1
      ) {
        included.add(event);
      }
    }
    const sparseRows = [...included]
      .sort((left, right) => left - right)
      .map((event) => rows[event]);
    const sparseBytes = serializeV42219Rows(sparseRows);
    const bundlePath = `${ROOT}/candidate-bundles/debate-${debate.debateNumber}.json`;
    const sparsePath = `${ROOT}/candidate-context/debate-${debate.debateNumber}.jsonl`;
    const bundleBytes = jsonBytes(bundle);
    if (shouldWrite) {
      await mkdir(path.dirname(bundlePath), { recursive: true });
      await mkdir(path.dirname(sparsePath), { recursive: true });
      await writeFile(bundlePath, bundleBytes);
      await writeFile(sparsePath, sparseBytes);
    }
    const executionRows = execution.results.filter(
      (result) => result.debateNumber === debate.debateNumber
    );
    const mediumAttributionCandidates = bundle.candidates.filter(
      (candidate) => candidate.attributionConfidence === "medium"
    ).length;
    const lowAttributionCandidates = bundle.candidates.filter(
      (candidate) => candidate.attributionConfidence === "low"
    ).length;
    debates.push({
      debateNumber: debate.debateNumber,
      debateId: debate.debateId,
      family: debate.family,
      sourceComplexityBand: debate.sourceComplexityBand,
      sourceChainOverlayApplied: debate.sourceChainOverlayApplied,
      chunks: debate.chunks.length,
      candidates: bundle.candidateCount,
      pro,
      con,
      candidateMinimumPassed,
      constructive: bundle.candidates.filter(
        (candidate) => candidate.moveKind === "constructive"
      ).length,
      reply: bundle.candidates.filter((candidate) => candidate.moveKind === "reply")
        .length,
      mediumAttributionCandidates,
      lowAttributionCandidates,
      belowHighAttributionCandidates:
        mediumAttributionCandidates + lowAttributionCandidates,
      selectedBelowHighCandidatesRequireLaterAudioVerification: true,
      repositoryDerivedLexicalTokenCountWindows: derivedWindows,
      modelAuthoredLexicalTokenCounts: false,
      modelAuthoredBoundedEndEvents: derivedWindows,
      bundlePath,
      bundleSha256: sha256(bundleBytes),
      sparsePath,
      sparseEvents: sparseRows.length,
      sparseBytes: sparseBytes.length,
      sparseSha256: sha256(sparseBytes),
      candidateSpansIncluded: bundle.candidates.every((candidate) => {
        for (
          let event = candidate.sourceSpan.startEvent;
          event <= candidate.sourceSpan.endEvent;
          event += 1
        ) {
          if (!included.has(event)) return false;
        }
        return true;
      }),
      allDiscoveredCandidatesTransported: true,
      localTargetIdsModelAuthored: false,
      semanticDeduplicationPerformed: false,
      semanticCorrectionPerformed: false,
      modelWorkElapsedMs: executionRows.reduce(
        (sum, result) => sum + result.elapsedMs,
        0
      ),
    });
  }

  const candidateMinimumPassed = debates.every(
    (debate) => debate.candidateMinimumPassed
  );
  const analysis = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-discovery-analysis",
    protocolId: activation.protocolId,
    discoveryProtocolId: V212_DISCOVERY_PROTOCOL_ID,
    status: candidateMinimumPassed
      ? "post-canary-batch-17-discovery-passed-standing-authorization-active-for-inventory-preparation"
      : "post-canary-batch-17-discovery-failed-candidate-minimum-stop-no-retry",
    productionContinuation: true,
    developmentValidationOnly: false,
    productionCanary: false,
    stagingOnly: true,
    AIOnly: true,
    activePolicy: structuredClone(activation.activePolicy),
    recovery: structuredClone(execution.recovery),
    debates,
    audit: {
      frozenContexts: CONTEXTS,
      validContexts: execution.validContexts,
      invalidContexts: execution.invalidContexts,
      modelContextsExecuted: execution.attempts,
      effectiveDiscoveryContexts: CONTEXTS,
      freshRecoveryContexts: 1,
      originalPrimaryResumptionContexts: 14,
      retries: 0,
      timeoutExtensions: 0,
      semanticCorrections: 0,
      rampOneServedAsOperationalCanary: true,
      schedulerRamp: execution.schedulerRamp,
      rampPhases: execution.rampPhases,
      rampPassed: execution.rampPassed,
      maximumParallelContextsAllowed: 4,
      maximumParallelContextsObserved: Math.max(
        execution.maximumParallelContextsObserved,
        recoveryExecution.maximumParallelContextsObserved
      ),
      candidateStartOwnedCoreBounds:
        activation.schemaHardening.candidateStartOwnedCoreBounds,
      modelAuthoredEndEventRequired:
        activation.schemaHardening.modelAuthoredEndEventRequired,
      repositoryDerivedLexicalTokenCount:
        activation.schemaHardening.repositoryDerivedLexicalTokenCount,
      minimumLexicalTokens: activation.schemaHardening.minimumLexicalTokens,
      requestedLexicalTokensProhibited:
        activation.schemaHardening.requestedLexicalTokensProhibited,
      predecessorChunkOwnershipRuleExplicit:
        activation.schemaHardening.predecessorChunkOwnershipRuleExplicit,
      frozenDyadicSpeakerAllowlist:
        activation.schemaHardening.frozenDyadicSpeakerAllowlist,
      everySourceEventOwnedExactlyOnce: true,
      exactChunkReplay: true,
      exactTokenLedgerReplay: true,
      zeroLexicalTokenRowsPreservedWithCountZero: true,
      exactSourceRowsInjectedOmittedOrRewritten: false,
      localTargetIdsModelAuthored: false,
      targetTopologyDeferredToCandidateShardedInventory: true,
      repositoryDerivedMoveKind: true,
      allDiscoveredCandidatesTransported: true,
      silentSemanticDeduplication: false,
      automaticSemanticCorrection: false,
      candidateMinimumPassed,
      activePolicyVersion: "v2.2",
      integerRoundedTiesPermitted: true,
      scoresDerived: 0,
      productionMutations: 0,
    },
    totals: {
      debates: debates.length,
      candidates: debates.reduce((sum, debate) => sum + debate.candidates, 0),
      pro: debates.reduce((sum, debate) => sum + debate.pro, 0),
      con: debates.reduce((sum, debate) => sum + debate.con, 0),
      repositoryDerivedLexicalTokenCountWindows: debates.reduce(
        (sum, debate) => sum + debate.repositoryDerivedLexicalTokenCountWindows,
        0
      ),
      modelAuthoredLexicalTokenCounts: 0,
      modelAuthoredBoundedEndEvents: debates.reduce(
        (sum, debate) => sum + debate.modelAuthoredBoundedEndEvents,
        0
      ),
      belowHighAttributionCandidates: debates.reduce(
        (sum, debate) => sum + debate.belowHighAttributionCandidates,
        0
      ),
      sparseEvents: debates.reduce((sum, debate) => sum + debate.sparseEvents, 0),
      wallElapsedMs: execution.wallElapsedMs,
      modelWorkElapsedMs: execution.modelWorkElapsedMs,
      modelContextsExecuted: execution.attempts,
      totalModelAttemptsIncludingRejectedOriginal:
        execution.attempts,
      freshRecoveryContexts: 1,
      originalPrimaryResumptionContexts: 14,
      retries: 0,
      timeoutExtensions: 0,
      semanticCorrections: 0,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      scoresDerived: 0,
      productionMutations: 0,
    },
    authorization: {
      inventoryPreparation: false,
      inventoryExecutionActivation: false,
      inventoryModelExecution: false,
      independentJudgmentPacketPreparation: false,
      independentJudgmentModelExecution: false,
      paidTranscription: false,
      unexpectedPaidService: false,
      audioVerification: false,
      adjudicationModelExecution: false,
      scoreDerivation: false,
      publicationPreparation: false,
      publicationModelExecution: false,
      productionMutation: false,
      nextBatchSelection: false,
    },
    nextAuthorizedAction: candidateMinimumPassed
      ? "prepare-freeze-and-activate-batch-17-candidate-census-planner-contexts-under-standing-authorization"
      : "stop-candidate-minimum-failed-no-retry-or-semantic-correction-authorized",
  };
  if (shouldWrite) {
    await writeFile(activation.artifacts.analysis, jsonBytes(analysis));
    const recoveryAnalysis = {
      schemaVersion:
        "1.0-assessment-production-post-canary-batch-17-discovery-recovery-analysis",
      protocolId: recoveryExecution.protocolId,
      status:
        "batch-17-debate-77-chunk-002-recovered-and-complete-cohort-replay-passed",
      originalExecution: ORIGINAL_EXECUTION,
      originalExecutionSha256: sha256(await readFile(ORIGINAL_EXECUTION)),
      recoveryExecution: RECOVERY_EXECUTION,
      recoveryExecutionSha256: sha256(recoveryExecutionBytes),
      cohortExecutionOverlay: COHORT_EXECUTION_OVERLAY,
      cohortExecutionOverlaySha256: sha256(
        await readFile(COHORT_EXECUTION_OVERLAY)
      ),
      recoveredOutput: RECOVERED_OUTPUT,
      recoveredOutputSha256: sha256(await readFile(RECOVERED_OUTPUT)),
      failedOutput:
        sourcePreparation.contexts.find(
          (debate) => debate.debateNumber === "77"
        ).chunks.find((chunk) => chunk.chunkId === "chunk-002").futureRawOutput,
      failedOutputPreserved: true,
      failedOutputUsed: false,
      recoveryLevel: 1,
      freshRecoveryContextsAttempted: 1,
      freshRecoveryContextsPassed: 1,
      originalPrimaryResumptionContextsAttempted: 14,
      originalPrimaryResumptionContextsPassed: 14,
      completeCohortReplayed: true,
      candidateMinimumPassed,
      retries: 0,
      timeoutExtensions: 0,
      directIncrementalCostUsd: 0,
      discoveryAnalysis: activation.artifacts.analysis,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    };
    await writeFile(RECOVERY_ANALYSIS, jsonBytes(recoveryAnalysis));
  }
  console.log(
    JSON.stringify(
      {
        status: shouldWrite ? analysis.status : "preview",
        debates,
        totals: analysis.totals,
        candidateMinimumPassed,
        inventoryPreparationAuthorized: false,
        inventoryModelExecutionAuthorized: false,
        judgmentModelExecutionAuthorized: false,
        nextAuthorizedAction: analysis.nextAuthorizedAction,
      },
      null,
      2
    )
  );
}

async function validateRecovery() {
  const frozen = await loadOriginalFailureBoundary({
    allowRecoveryArtifacts: true,
  });
  const { preparation } = await loadRecoveryActivation();
  const [
    executionBytes,
    overlayBytes,
    analysisBytes,
    recoveryAnalysisBytes,
  ] = await Promise.all([
    readFile(RECOVERY_EXECUTION),
    readFile(COHORT_EXECUTION_OVERLAY),
    readFile(frozen.activation.artifacts.analysis),
    readFile(RECOVERY_ANALYSIS),
  ]);
  const execution = JSON.parse(executionBytes);
  const overlay = JSON.parse(overlayBytes);
  const analysis = JSON.parse(analysisBytes);
  const recoveryAnalysis = JSON.parse(recoveryAnalysisBytes);
  assertV4(
    execution.status === RECOVERY_EXECUTION_STATUS &&
      execution.contextsPlanned === 15 &&
      execution.contextsAttempted === 15 &&
      execution.validContexts === 15 &&
      execution.invalidContexts === 0 &&
      execution.freshRecoveryContextsAttempted === 1 &&
      execution.originalPrimaryResumptionContextsAttempted === 14 &&
      execution.retries === 0 &&
      execution.timeoutExtensions === 0 &&
      overlay.status === EXPECTED_EXECUTION_STATUS &&
      overlay.contextsAttempted === CONTEXTS &&
      overlay.contextsUnattempted === 0 &&
      overlay.validContexts === CONTEXTS &&
      overlay.invalidContexts === 0 &&
      overlay.attempts === 18 &&
      overlay.recovery.recoveryLevel === 1 &&
      overlay.recovery.freshRecoveryContextsPassed === 1 &&
      overlay.recovery.originalPrimaryResumptionContextsPassed === 14 &&
      overlay.recovery.originalAcceptedOutputsPreservedByteIdentical === 2 &&
      overlay.recovery.originalFailedOutputPreservedByteIdentical === true &&
      overlay.recovery.failedOutputUsed === false &&
      analysis.status ===
        "post-canary-batch-17-discovery-passed-standing-authorization-active-for-inventory-preparation" &&
      analysis.audit.validContexts === CONTEXTS &&
      analysis.audit.modelContextsExecuted === 18 &&
      analysis.audit.effectiveDiscoveryContexts === CONTEXTS &&
      analysis.audit.candidateMinimumPassed === true &&
      analysis.totals.modelContextsExecuted === 18 &&
      analysis.totals.freshRecoveryContexts === 1 &&
      analysis.totals.originalPrimaryResumptionContexts === 14 &&
      analysis.totals.meteredApiCostUsd === 0 &&
      recoveryAnalysis.status ===
        "batch-17-debate-77-chunk-002-recovered-and-complete-cohort-replay-passed" &&
      recoveryAnalysis.failedOutputPreserved === true &&
      recoveryAnalysis.failedOutputUsed === false &&
      recoveryAnalysis.retries === 0 &&
      recoveryAnalysis.timeoutExtensions === 0 &&
      recoveryAnalysis.directIncrementalCostUsd === 0,
    "recovered Batch 17 discovery gate validation failed"
  );
  await assertHashes(
    preparation.protectedOutputHashes,
    "protected original discovery output"
  );
  assertV4(
    sha256(await readFile(RECOVERED_OUTPUT)) ===
      recoveryAnalysis.recoveredOutputSha256,
    "recovered discovery output drifted"
  );
  for (const debate of analysis.debates) {
    assertV4(
      sha256(await readFile(debate.bundlePath)) === debate.bundleSha256 &&
        sha256(await readFile(debate.sparsePath)) === debate.sparseSha256 &&
        debate.candidateSpansIncluded === true &&
        debate.allDiscoveredCandidatesTransported === true &&
        debate.semanticCorrectionPerformed === false,
      `${debate.debateNumber}: recovered discovery artifact invalid`
    );
  }
  console.log(
    JSON.stringify(
      {
        status: "passed-batch-17-discovery-after-bounded-recovery",
        effectiveDiscoveryContexts: CONTEXTS,
        modelContextsExecuted: 18,
        freshRecoveryContexts: 1,
        originalPrimaryResumptionContexts: 14,
        protectedOriginalOutputs: 3,
        candidates: analysis.totals.candidates,
        retries: 0,
        timeoutExtensions: 0,
        directIncrementalCostUsd: 0,
        nextAuthorizedAction: analysis.nextAuthorizedAction,
      },
      null,
      2
    )
  );
}

async function validate() {
  const { activation, preparation } = await loadAndValidateActivation();
  if (!(await exists(activation.artifacts.execution))) {
    for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
      if (future !== ACTIVATION) {
        assertV4(!(await exists(future)), `${future}: future output exists`);
      }
    }
    console.log(
      JSON.stringify(
        {
          status: "passed-activation",
          contexts: CONTEXTS,
          modelContextsAuthorized: true,
          inventoryModelContextsAuthorized: false,
          judgmentModelContextsAuthorized: false,
          retriesMaximum: 0,
          timeoutExtensionsMaximum: 0,
          directIncrementalCostUsdMaximum: 0,
          scoresDerived: 0,
        },
        null,
        2
      )
    );
    return;
  }
  const execution = JSON.parse(
    await readFile(activation.artifacts.execution, "utf8")
  );
  assertV4(execution.contextsPlanned === CONTEXTS, "execution context count invalid");
  assertV4(
    execution.contextsAttempted >= 1 && execution.contextsAttempted <= CONTEXTS,
    "attempted context count invalid"
  );
  assertV4(
    execution.contextsUnattempted === CONTEXTS - execution.contextsAttempted &&
      execution.attempts === execution.contextsAttempted &&
      execution.retries === 0 &&
      execution.timeoutExtensions === 0 &&
      execution.semanticCorrections === 0 &&
      execution.maximumParallelContextsObserved <= 4 &&
      JSON.stringify(execution.schedulerRamp) === JSON.stringify([1, 2, 4]) &&
      execution.rampPhases.length >= 1 &&
      execution.rampPhases.length <= 3 &&
      execution.rampPhases[0].phase === "operational-canary-one" &&
      execution.repositoryDerivedLexicalTokenCounts === true &&
      execution.modelAuthoredLexicalTokenCounts === false &&
      execution.modelAuthoredBoundedEndEvents === true &&
      execution.zeroLexicalTokenRowsPreservedWithCountZero === true &&
      execution.exactSourceRowsInjectedOmittedOrRewritten === false &&
      execution.activePolicyVersion === "v2.2" &&
      execution.integerRoundedTiesPermitted === true &&
      execution.meteredApiCostUsd === 0 &&
      execution.transcriptionCostUsd === 0 &&
      execution.scoresDerived === 0 &&
      execution.productionMutations === 0,
    "execution controls invalid"
  );
  for (const result of execution.results) {
    assertV4(
      result.attemptCount === 1 &&
        result.retryCount === 0 &&
        result.model === "5.6 Sol" &&
        result.modelSlug === "gpt-5.6-sol" &&
        result.reasoningEffort === "low" &&
        result.authentication === "ChatGPT subscription" &&
        result.apiKeysRemoved === true &&
        result.scoreBlind === true &&
        result.isolatedTemporaryCodexHome === true &&
        result.exactCopiedInputFiles === 4 &&
        result.meteredApiCostUsd === 0 &&
        result.transcriptionCostUsd === 0,
      `${result.debateNumber}/${result.chunkId}: result controls invalid`
    );
    if (result.rawOutputWritten) {
      const context = preparation.contexts[result.contextIndex];
      assertV4(
        result.rawOutputSha256 === sha256(await readFile(context.rawOutput)),
        `${result.debateNumber}/${result.chunkId}: raw output drifted`
      );
    }
  }
  if (execution.status !== EXPECTED_EXECUTION_STATUS) {
    assertV4(execution.invalidContexts >= 1, "failed execution lacks invalid context");
    assertV4(
      !(await exists(activation.artifacts.analysis)),
      "analysis must not exist after failed discovery execution"
    );
    console.log(
      JSON.stringify(
        {
          status: "passed-recorded-failure",
          contextsAttempted: execution.contextsAttempted,
          contextsUnattempted: execution.contextsUnattempted,
          validContexts: execution.validContexts,
          invalidContexts: execution.invalidContexts,
          retries: 0,
          timeoutExtensions: 0,
          scoresDerived: 0,
        },
        null,
        2
      )
    );
    return;
  }
  assertV4(
    execution.contextsAttempted === CONTEXTS &&
      execution.contextsUnattempted === 0 &&
      execution.validContexts === CONTEXTS &&
      execution.invalidContexts === 0 &&
      execution.rampPassed === true &&
      execution.rampPhases.length === 3 &&
      execution.rampPhases.every((phase) => phase.passed) &&
      execution.maximumParallelContextsObserved === 4,
    "successful execution invariants invalid"
  );
  if (!(await exists(activation.artifacts.analysis))) {
    console.log(
      JSON.stringify(
        {
          status: "passed-execution",
          validContexts: CONTEXTS,
          wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
          aggregateModelMinutes: Number(
            (execution.modelWorkElapsedMs / 60000).toFixed(2)
          ),
          retries: 0,
          timeoutExtensions: 0,
          scoresDerived: 0,
        },
        null,
        2
      )
    );
    return;
  }
  const analysis = JSON.parse(await readFile(activation.artifacts.analysis, "utf8"));
  assertV4(
    analysis.debates.length === DEBATES.length &&
      analysis.audit.validContexts === CONTEXTS &&
      analysis.audit.invalidContexts === 0 &&
      analysis.audit.retries === 0 &&
      analysis.audit.timeoutExtensions === 0 &&
      analysis.audit.semanticCorrections === 0 &&
      analysis.audit.rampPassed === true &&
      analysis.audit.repositoryDerivedLexicalTokenCount === true &&
      analysis.audit.minimumLexicalTokens === 12 &&
      analysis.audit.requestedLexicalTokensProhibited === true &&
      analysis.audit.zeroLexicalTokenRowsPreservedWithCountZero === true &&
      analysis.audit.exactSourceRowsInjectedOmittedOrRewritten === false &&
      analysis.audit.allDiscoveredCandidatesTransported === true &&
      analysis.audit.silentSemanticDeduplication === false &&
      analysis.audit.automaticSemanticCorrection === false &&
      analysis.audit.activePolicyVersion === "v2.2" &&
      analysis.audit.integerRoundedTiesPermitted === true &&
      analysis.audit.scoresDerived === 0 &&
      analysis.audit.productionMutations === 0 &&
      analysis.totals.modelContextsExecuted === CONTEXTS &&
      analysis.totals.retries === 0 &&
      analysis.totals.timeoutExtensions === 0 &&
      analysis.totals.semanticCorrections === 0 &&
      analysis.totals.meteredApiCostUsd === 0 &&
      analysis.totals.transcriptionCostUsd === 0 &&
      analysis.totals.scoresDerived === 0 &&
      analysis.totals.productionMutations === 0 &&
      analysis.authorization.inventoryPreparation === false &&
      analysis.authorization.inventoryModelExecution === false &&
      analysis.authorization.independentJudgmentModelExecution === false &&
      analysis.authorization.paidTranscription === false &&
      analysis.authorization.productionMutation === false,
    "analysis controls invalid"
  );
  for (const debate of analysis.debates) {
    assertV4(
      debate.candidateSpansIncluded === true &&
        debate.allDiscoveredCandidatesTransported === true &&
        debate.semanticDeduplicationPerformed === false &&
        debate.semanticCorrectionPerformed === false &&
        sha256(await readFile(debate.bundlePath)) === debate.bundleSha256 &&
        sha256(await readFile(debate.sparsePath)) === debate.sparseSha256,
      `${debate.debateNumber}: compiled discovery artifact invalid`
    );
  }
  assertV4(
    analysis.audit.candidateMinimumPassed ===
      analysis.debates.every((debate) => debate.candidateMinimumPassed),
    "candidate minimum summary drifted"
  );
  console.log(
    JSON.stringify(
      {
        status: "passed-analysis",
        analysisStatus: analysis.status,
        debates: DEBATES.length,
        candidates: analysis.totals.candidates,
        validContexts: CONTEXTS,
        candidateMinimumPassed: analysis.audit.candidateMinimumPassed,
        retries: 0,
        timeoutExtensions: 0,
        scoresDerived: 0,
        productionMutations: 0,
        nextAuthorizedAction: analysis.nextAuthorizedAction,
      },
      null,
      2
    )
  );
}

const command = process.argv[2];
if (command === "analyze") await analyzeRecovery();
else if (command === "validate") await validateRecovery();
else {
  throw new Error(
    "usage: finalize-assessment-production-post-canary-batch-17-discovery-recovery.mjs <analyze|validate>"
  );
}
