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
  candidateShardedInventoryPlanSha256,
  validateCandidateShardedInventoryPlan,
} from "./lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";
import {
  POST_CANARY_BATCH_04_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch04StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-04-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/inventory-candidate-sharded";
const PREPARATION = `${ROOT}/plan-execution-preparation-manifest.json`;
const SOURCE_PREPARATION = `${ROOT}/preparation-manifest.json`;
const ACTIVATION = `${ROOT}/plan-execution-activation.json`;
const EXECUTION = `${ROOT}/plan-model-execution.json`;
const ANALYSIS = `${ROOT}/plan-analysis.json`;
const SCRIPT =
  "scripts/run-assessment-production-post-canary-batch-04-inventory-plans.mjs";
const PREPARER =
  "scripts/prepare-assessment-production-post-canary-batch-04-inventory.mjs";
const CONTEXTS = 10;
const DEBATES = ["127", "67", "85", "49", "186", "81", "148", "47", "03", "185"];
const PREPARATION_STATUS =
  "frozen-ten-post-canary-batch-04-candidate-census-plan-contexts-prepared-not-authorized";
const ACTIVATION_STATUS =
  "frozen-ten-post-canary-batch-04-candidate-census-plan-contexts-authorized";
const EXECUTION_STATUS =
  "ten-post-canary-batch-04-candidate-census-plan-contexts-passed";
const PROTOCOL_ID =
  "assessment-production-post-canary-batch-04-candidate-sharded-inventory";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

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

async function validatePreparedContext(preparation, sourcePreparation, context) {
  const prepared = sourcePreparation.contexts.find(
    (item) => item.debateNumber === context.debateNumber
  );
  assertV4(
    prepared &&
      prepared.debateId === context.debateId &&
      prepared.planPacket === context.packet &&
      prepared.planOutput === context.output &&
      prepared.candidateCensus ===
        context.copiedInputs.find(
          (input) => input.role === "complete-candidate-census"
        )?.path &&
      prepared.planSchema === context.strictOutputSchema,
    `${context.debateNumber}: prepared planner identity drifted`
  );
  const packetBytes = await readFile(context.packet);
  const packet = JSON.parse(packetBytes);
  assertV4(
    sha256(packetBytes) === context.packetSha256 &&
      packetBytes.length === context.packetBytes &&
      packet.debateNumber === context.debateNumber &&
      packet.debateId === context.debateId &&
      packet.output === context.output &&
      packet.attemptsMaximum === 1 &&
      packet.retries === 0 &&
      packet.timeoutExtensions === 0 &&
      packet.modelExecutionAuthorized === false &&
      JSON.stringify(packet.copiedInputs) === JSON.stringify(context.copiedInputs),
    `${context.debateNumber}: frozen planner packet drifted`
  );
  const expectedRoles = [
    "inventory-source-packet",
    "complete-candidate-census",
    "candidate-sharded-inventory-guide",
    "inventory-manual",
    "strict-output-schema",
  ];
  assertV4(
    JSON.stringify(packet.copiedInputs.map((input) => input.role)) ===
      JSON.stringify(expectedRoles),
    `${context.debateNumber}: copied-input roles drifted`
  );
  let copiedInputBytes = 0;
  for (const input of packet.copiedInputs) {
    const bytes = await readFile(input.path);
    assertV4(
      sha256(bytes) === input.sha256 && bytes.length === input.bytes,
      `${context.debateNumber}/${input.role}: copied input drifted`
    );
    copiedInputBytes += bytes.length;
  }
  assertV4(
    copiedInputBytes === context.copiedInputBytes &&
      copiedInputBytes === packet.copiedInputBytes &&
      copiedInputBytes <= preparation.executionPolicy.copiedInputBytesMaximum,
    `${context.debateNumber}: copied-input byte boundary drifted`
  );
  for (const [file, digest] of [
    [prepared.fullCandidateTransport, prepared.fullCandidateTransportSha256],
    [prepared.candidateCensus, prepared.candidateCensusSha256],
    [prepared.compilerSchema, prepared.compilerSchemaSha256],
    [prepared.planSchema, prepared.planSchemaSha256],
  ]) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: validator input drifted`);
  }
  return prepared;
}

async function loadAndValidatePreparation({ requireFutureAbsent = false } = {}) {
  const [preparationBytes, sourcePreparationBytes] = await Promise.all([
    readFile(PREPARATION),
    readFile(SOURCE_PREPARATION),
  ]);
  const preparation = JSON.parse(preparationBytes);
  const sourcePreparation = JSON.parse(sourcePreparationBytes);
  const standingAuthorization =
    await loadAndValidatePostCanaryBatch04StandingAuthorization();
  assertV4(
    preparation.schemaVersion ===
      "1.0-assessment-production-post-canary-batch-04-candidate-census-plan-execution-preparation-manifest" &&
      preparation.protocolId === PROTOCOL_ID &&
      preparation.status === PREPARATION_STATUS &&
      preparation.productionContinuation === true &&
      preparation.developmentValidationOnly === false &&
      preparation.productionCanary === false &&
      preparation.stagingOnly === true &&
      preparation.AIOnly === true &&
      preparation.branch === "main" &&
      preparation.contexts.length === CONTEXTS &&
      JSON.stringify(preparation.selectedDebates) === JSON.stringify(DEBATES) &&
      preparation.userAuthorization.standingAuthorization ===
        POST_CANARY_BATCH_04_STANDING_AUTHORIZATION &&
      preparation.userAuthorization.standingAuthorizationSha256 ===
        standingAuthorization.sha256 &&
      standingAuthorization.record.authorization
        .inventoryPreparationAndModelExecution === true &&
      JSON.stringify(preparation.contexts.map((item) => item.debateNumber)) ===
        JSON.stringify(DEBATES) &&
      preparation.model.label === "5.6 Sol" &&
      preparation.model.slug === "gpt-5.6-sol" &&
      preparation.model.reasoningEffort === "low" &&
      preparation.model.authentication === "ChatGPT subscription" &&
      preparation.model.scoreBlind === true &&
      preparation.model.roundedIntegerScoreTiesPermitted === true &&
      preparation.activePolicy.version === "v2.2" &&
      preparation.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie ===
        true &&
      preparation.activePolicy.agreedInitialTieImposesNoDirectionConstraint ===
        true &&
      preparation.activePolicy.numericalThresholdsChanged === false &&
      preparation.activePolicy.scorePassesMaximum === 1 &&
      preparation.sourceCompatibility.status ===
        "all-source-rows-have-positive-repository-lexical-token-count" &&
      preparation.sourceCompatibility.sourceRowsInjected === 0 &&
      preparation.sourceCompatibility.sourceRowsOmitted === 0 &&
      preparation.sourceCompatibility.sourceRowsRewritten === 0 &&
      preparation.sourceCompatibility.minimumCandidateLexicalTokensChanged ===
        false &&
      preparation.sourceCompatibility.occurrences.length === 0 &&
      preparation.costEstimate.directIncrementalCostUsdMaximum === 0 &&
      preparation.costEstimate.meteredApiCostUsdMaximum === 0 &&
      preparation.costEstimate.transcriptionCostUsdMaximum === 0 &&
      preparation.executionPolicy.contexts === CONTEXTS &&
      preparation.executionPolicy.attemptsPerContext === 1 &&
      preparation.executionPolicy.retriesMaximum === 0 &&
      preparation.executionPolicy.timeoutExtensionsMaximum === 0 &&
      preparation.executionPolicy.timeoutMsPerContext === 600000 &&
      preparation.executionPolicy.absoluteStageTimeoutMs === 3600000 &&
      preparation.executionPolicy.maximumParallelContexts === 2 &&
      JSON.stringify(preparation.executionPolicy.schedulerRamp) ===
        JSON.stringify([1, 2]) &&
      preparation.executionPolicy.APIKeysRemoved === true &&
      preparation.executionPolicy.directIncrementalCostUsdMaximum === 0 &&
      preparation.executionPolicy.meteredApiCostUsdMaximum === 0 &&
      preparation.executionPolicy.transcriptionCostUsdMaximum === 0 &&
      preparation.executionPolicy.separateActivationRequired === true &&
      preparation.executionPolicy.abortBeforeStartingAdditionalContextOnAnyFailure ===
        true &&
      preparation.executionPolicy.allowAlreadyRunningIndependentContextToFinish ===
        true &&
      preparation.executionPolicy.allTenPlansMustPassBeforeSidePacketPreparation ===
        true &&
      preparation.acceptancePolicy.exactContextCountRequired === CONTEXTS &&
      preparation.acceptancePolicy.everyContextMustCompleteOnItsSingleAttempt ===
        true &&
      preparation.acceptancePolicy.everyOutputMustPassDeterministicSemanticValidation ===
        true &&
      preparation.acceptancePolicy.partialPlanGateAcceptance === false &&
      preparation.acceptancePolicy.automaticSemanticCorrection === false &&
      preparation.authorization.executionActivationPreparation === false &&
      preparation.authorization.planModelContexts === false &&
      preparation.authorization.deterministicPlanValidation === false &&
      preparation.authorization.planAnalysis === false &&
      preparation.authorization.exactSidePacketPreparation === false &&
      preparation.authorization.sideSelectorModelExecution === false &&
      preparation.authorization.inventoryModelExecution === false &&
      preparation.authorization.retry === false &&
      preparation.authorization.timeoutExtension === false &&
      preparation.authorization.semanticCorrection === false &&
      preparation.authorization.independentJudgmentModelExecution === false &&
      preparation.authorization.paidTranscription === false &&
      preparation.authorization.unexpectedPaidService === false &&
      preparation.authorization.audioVerification === false &&
      preparation.authorization.scoreDerivation === false &&
      preparation.authorization.publicationModelExecution === false &&
      preparation.authorization.productionMutation === false &&
      allBooleanLeavesTrue(preparation.stopRules),
    "Batch 4 candidate-census planner preparation is invalid"
  );
  assertV4(
    sourcePreparation.protocolId === PROTOCOL_ID &&
      sourcePreparation.status ===
        "post-canary-batch-04-candidate-sharded-source-assets-and-ten-planner-packets-frozen" &&
      sourcePreparation.contexts.length === CONTEXTS &&
      sourcePreparation.sourceCompatibility.status ===
        "all-source-rows-have-positive-repository-lexical-token-count" &&
      sourcePreparation.sourceCompatibility.sourceRowsInjected === 0 &&
      sourcePreparation.sourceCompatibility.sourceRowsOmitted === 0 &&
      sourcePreparation.sourceCompatibility.sourceRowsRewritten === 0 &&
      sourcePreparation.sourceCompatibility.minimumCandidateLexicalTokensChanged ===
        false &&
      sourcePreparation.sourceCompatibility.occurrences.length === 0 &&
      sha256(sourcePreparationBytes) === preparation.preparationSha256,
    "Batch 4 source preparation drifted"
  );
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
  }
  for (const context of preparation.contexts) {
    await validatePreparedContext(preparation, sourcePreparation, context);
  }
  if (requireFutureAbsent) {
    for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
      assertV4(!(await exists(future)), `future output already exists: ${future}`);
    }
  }
  const codex = preparation.executionEnvironment.codexPath;
  assertV4(
    execFileSync(codex, ["--version"], { encoding: "utf8" }).trim() ===
      preparation.executionEnvironment.codexCliVersion,
    "frozen Codex CLI version changed"
  );
  await access(codex);
  await access(path.join(os.homedir(), ".codex", "auth.json"));
  return {
    preparation,
    preparationBytes,
    sourcePreparation,
    sourcePreparationBytes,
    standingAuthorization,
  };
}

async function preflight() {
  const { preparation } = await loadAndValidatePreparation({
    requireFutureAbsent: true,
  });
  const validation = JSON.parse(
    execFileSync(process.execPath, [PREPARER, "validate"], {
      encoding: "utf8",
    })
  );
  assertV4(
    validation.status === "passed-frozen-inventory-preparation" &&
      validation.planContextsPrepared === CONTEXTS &&
      validation.modelContextsExecuted === 0 &&
      validation.paidServiceCalls === 0 &&
      validation.audioCalls === 0 &&
      validation.scoresDerived === 0 &&
      validation.productionMutations === 0 &&
      validation.directIncrementalCostUsd === 0,
    "frozen Batch 4 preparation validator failed"
  );
  console.log(
    JSON.stringify(
      {
        status: "passed-model-free-preflight",
        contexts: CONTEXTS,
        debates: DEBATES,
        model: preparation.model,
        maximumParallelContexts: 2,
        schedulerRamp: [1, 2],
        attemptsPerContext: 1,
        retriesMaximum: 0,
        timeoutExtensionsMaximum: 0,
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
  const {
    preparation,
    preparationBytes,
    sourcePreparation,
    sourcePreparationBytes,
    standingAuthorization,
  } = await loadAndValidatePreparation({ requireFutureAbsent: true });
  assertV4(!shouldWrite || !(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
  const sourceFiles = [
    ...Object.keys(preparation.sourceHashes),
    PREPARATION,
    SOURCE_PREPARATION,
    PREPARER,
    SCRIPT,
    ...sourcePreparation.contexts.flatMap((context) => [
      context.planPacket,
      context.inventorySourcePacket,
      context.candidateCensus,
      context.planSchema,
      context.fullCandidateTransport,
      context.compilerSchema,
    ]),
  ];
  const sourceHashes = {};
  for (const file of [...new Set(sourceFiles)].sort()) {
    sourceHashes[file] = sha256(await readFile(file));
  }
  const futureOutputs = preparation.futureOutputPathsExcludedFromSourceHashes.filter(
    (file) => file !== ACTIVATION
  );
  assertV4(
    futureOutputs.length + 1 ===
      preparation.futureOutputPathsExcludedFromSourceHashes.length &&
      preparation.artifacts.activation === ACTIVATION,
    "activation path is not uniquely reserved"
  );
  const activation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-04-candidate-census-plan-execution-activation",
    protocolId: PROTOCOL_ID,
    status: ACTIVATION_STATUS,
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
        "activate and execute exactly the ten frozen Batch 4 candidate-census planner contexts under the frozen standing authorization",
      standingAuthorization: POST_CANARY_BATCH_04_STANDING_AUTHORIZATION,
      standingAuthorizationSha256: standingAuthorization.sha256,
      directIncrementalCostCapUsd: 0,
      candidateCensusPlannerModelsAuthorized: true,
      sideSelectorPacketPreparationAuthorized: false,
      sideSelectorModelsAuthorized: false,
      judgmentModelsAuthorized: false,
      paidServicesAuthorized: false,
    },
    preparationManifest: PREPARATION,
    preparationManifestSha256: sha256(preparationBytes),
    sourcePreparation: SOURCE_PREPARATION,
    sourcePreparationSha256: sha256(sourcePreparationBytes),
    activePolicy: structuredClone(preparation.activePolicy),
    sourceCompatibility: structuredClone(preparation.sourceCompatibility),
    validatedInventoryContract: structuredClone(
      preparation.validatedInventoryContract
    ),
    model: structuredClone(preparation.model),
    costBoundary: structuredClone(preparation.costEstimate),
    executionEnvironment: structuredClone(preparation.executionEnvironment),
    executionPolicy: structuredClone(preparation.executionPolicy),
    isolation: structuredClone(preparation.isolation),
    acceptancePolicy: structuredClone(preparation.acceptancePolicy),
    stopRules: structuredClone(preparation.stopRules),
    artifacts: structuredClone(preparation.artifacts),
    futureOutputPathsExcludedFromSourceHashes: futureOutputs,
    sourceHashes,
    authorization: {
      planModelContexts: true,
      deterministicPlanValidation: true,
      planAnalysis: true,
      exactSidePacketPreparation: false,
      sideSelectorModelExecution: false,
      inventoryCompilation: false,
      retry: false,
      timeoutExtension: false,
      semanticCorrection: false,
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
      "execute-exactly-ten-frozen-batch-04-candidate-census-plan-contexts-once",
  };
  if (shouldWrite) await writeFile(ACTIVATION, jsonBytes(activation));
  console.log(
    JSON.stringify(
      {
        status: shouldWrite ? activation.status : "preview",
        contexts: CONTEXTS,
        debates: DEBATES,
        model: activation.model,
        schedulerRamp: activation.executionPolicy.schedulerRamp,
        attemptsPerContext: 1,
        directIncrementalCostUsdMaximum: 0,
        candidateCensusPlannerModelsAuthorized: true,
        sideSelectorModelsAuthorized: false,
        judgmentModelsAuthorized: false,
      },
      null,
      2
    )
  );
}

async function loadAndValidateActivation({ requireFutureAbsent = false } = {}) {
  const activationBytes = await readFile(ACTIVATION);
  const activation = JSON.parse(activationBytes);
  const standingAuthorization =
    await loadAndValidatePostCanaryBatch04StandingAuthorization();
  assertV4(
    activation.schemaVersion ===
      "1.0-assessment-production-post-canary-batch-04-candidate-census-plan-execution-activation" &&
      activation.protocolId === PROTOCOL_ID &&
      activation.status === ACTIVATION_STATUS &&
      activation.productionContinuation === true &&
      activation.developmentValidationOnly === false &&
      activation.productionCanary === false &&
      activation.stagingOnly === true &&
      activation.AIOnly === true &&
      activation.branch === "main" &&
      JSON.stringify(activation.selectedDebates) === JSON.stringify(DEBATES) &&
      activation.model.label === "5.6 Sol" &&
      activation.model.slug === "gpt-5.6-sol" &&
      activation.model.reasoningEffort === "low" &&
      activation.model.authentication === "ChatGPT subscription" &&
      activation.model.scoreBlind === true &&
      activation.model.roundedIntegerScoreTiesPermitted === true &&
      activation.userAuthorization.standingAuthorization ===
        POST_CANARY_BATCH_04_STANDING_AUTHORIZATION &&
      activation.userAuthorization.standingAuthorizationSha256 ===
        standingAuthorization.sha256 &&
      activation.userAuthorization.directIncrementalCostCapUsd === 0 &&
      activation.userAuthorization.candidateCensusPlannerModelsAuthorized ===
        true &&
      activation.userAuthorization.sideSelectorPacketPreparationAuthorized ===
        false &&
      activation.userAuthorization.sideSelectorModelsAuthorized === false &&
      activation.userAuthorization.judgmentModelsAuthorized === false &&
      activation.userAuthorization.paidServicesAuthorized === false &&
      activation.activePolicy.version === "v2.2" &&
      activation.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie ===
        true &&
      activation.sourceCompatibility.status ===
        "all-source-rows-have-positive-repository-lexical-token-count" &&
      activation.sourceCompatibility.sourceRowsInjected === 0 &&
      activation.sourceCompatibility.sourceRowsOmitted === 0 &&
      activation.sourceCompatibility.sourceRowsRewritten === 0 &&
      activation.sourceCompatibility.minimumCandidateLexicalTokensChanged ===
        false &&
      activation.sourceCompatibility.occurrences.length === 0 &&
      activation.executionPolicy.contexts === CONTEXTS &&
      activation.executionPolicy.attemptsPerContext === 1 &&
      activation.executionPolicy.retriesMaximum === 0 &&
      activation.executionPolicy.timeoutExtensionsMaximum === 0 &&
      activation.executionPolicy.maximumParallelContexts === 2 &&
      JSON.stringify(activation.executionPolicy.schedulerRamp) ===
        JSON.stringify([1, 2]) &&
      activation.executionPolicy.APIKeysRemoved === true &&
      activation.authorization.planModelContexts === true &&
      activation.authorization.deterministicPlanValidation === true &&
      activation.authorization.planAnalysis === true &&
      activation.authorization.exactSidePacketPreparation === false &&
      activation.authorization.sideSelectorModelExecution === false &&
      activation.authorization.inventoryCompilation === false &&
      activation.authorization.retry === false &&
      activation.authorization.timeoutExtension === false &&
      activation.authorization.semanticCorrection === false &&
      activation.authorization.independentJudgmentModelExecution === false &&
      activation.authorization.paidTranscription === false &&
      activation.authorization.unexpectedPaidService === false &&
      activation.authorization.audioVerification === false &&
      activation.authorization.scoreDerivation === false &&
      activation.authorization.publicationModelExecution === false &&
      activation.authorization.productionMutation === false &&
      allBooleanLeavesTrue(activation.stopRules),
    "Batch 4 candidate-census planner execution is unauthorized"
  );
  for (const [file, digest] of Object.entries(activation.sourceHashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: activation source drifted`);
  }
  const [preparationBytes, sourcePreparationBytes] = await Promise.all([
    readFile(activation.preparationManifest),
    readFile(activation.sourcePreparation),
  ]);
  assertV4(
    sha256(preparationBytes) === activation.preparationManifestSha256 &&
      sha256(sourcePreparationBytes) === activation.sourcePreparationSha256,
    "frozen preparation hash drifted"
  );
  const preparation = JSON.parse(preparationBytes);
  const sourcePreparation = JSON.parse(sourcePreparationBytes);
  assertV4(
    preparation.status === PREPARATION_STATUS &&
      preparation.contexts.length === CONTEXTS &&
      sourcePreparation.contexts.length === CONTEXTS,
    "frozen context count drifted"
  );
  for (const context of preparation.contexts) {
    await validatePreparedContext(preparation, sourcePreparation, context);
  }
  if (requireFutureAbsent) {
    for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
      assertV4(!(await exists(future)), `future output already exists: ${future}`);
    }
  }
  const codex = activation.executionEnvironment.codexPath;
  assertV4(
    execFileSync(codex, ["--version"], { encoding: "utf8" }).trim() ===
      activation.executionEnvironment.codexCliVersion,
    "frozen Codex CLI version changed"
  );
  await access(codex);
  await access(path.join(os.homedir(), ".codex", "auth.json"));
  return {
    activation,
    activationBytes,
    preparation,
    sourcePreparation,
  };
}

async function execute() {
  const { activation, activationBytes, preparation, sourcePreparation } =
    await loadAndValidateActivation({ requireFutureAbsent: true });
  const codex = activation.executionEnvironment.codexPath;
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  let activeContexts = 0;
  let maximumParallelContextsObserved = 0;
  const gateStartedAt = new Date().toISOString();
  const gateStarted = Date.now();
  const gateDeadline =
    gateStarted + activation.executionPolicy.absoluteStageTimeoutMs;

  async function executeContext(context, contextIndex) {
    const prepared = await validatePreparedContext(
      preparation,
      sourcePreparation,
      context
    );
    const packet = JSON.parse(await readFile(context.packet, "utf8"));
    const remainingStageMs = gateDeadline - Date.now();
    assertV4(
      remainingStageMs > 0,
      "absolute candidate-census planner stage timeout reached before launch"
    );
    const contextTimeoutMs = Math.min(
      activation.executionPolicy.timeoutMsPerContext,
      remainingStageMs
    );
    const sourceDirectory = await mkdtemp(
      path.join(
        os.tmpdir(),
        `slugfester-post-canary-batch-04-candidate-plan-${context.debateNumber}-`
      )
    );
    const isolatedCodexHome = await mkdtemp(
      path.join(
        os.tmpdir(),
        `slugfester-post-canary-batch-04-candidate-plan-home-${context.debateNumber}-`
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
      const targetByRole = {
        "inventory-source-packet": "inventory-source-packet.json",
        "complete-candidate-census": "candidate-census.json",
        "candidate-sharded-inventory-guide": "candidate-sharded-inventory-guide.md",
        "inventory-manual": "inventory-manual.md",
        "strict-output-schema": "plan-schema.json",
      };
      for (const input of packet.copiedInputs) {
        await copyFile(input.path, path.join(sourceDirectory, targetByRole[input.role]));
      }
      await copyFile(authSource, path.join(isolatedCodexHome, "auth.json"));
      const env = { ...process.env, CODEX_HOME: isolatedCodexHome };
      for (const key of activation.executionPolicy.removedEnvironmentVariables) {
        delete env[key];
      }
      const prompt = `Read inventory-source-packet.json, candidate-census.json, candidate-sharded-inventory-guide.md, inventory-manual.md, and plan-schema.json completely; read nothing else. Act only as the isolated score-blind candidate-census inventory planner for post-canary production Batch 4 Debate ${context.debateNumber}. Review every candidate in the complete census. Author only one burden route per side and four to six weighted issue sections totaling exactly 100 percent. Candidate selection and candidate evidence excerpts are deferred to separate fresh side contexts. Ratings, response topology, scores, winners, legacy assessments, other debates, prior or other judgments, execution metadata, tags, Overall Commentary, AI Extension, and publication prose are prohibited. Return exactly one plan-schema-conforming JSON object.`;
      process.stdout.write(
        `[post-canary-batch-04-candidate-plan] starting ${activation.model.label}/${activation.model.reasoningEffort} Debate ${context.debateNumber}\n`
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
          "plan-schema.json",
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
        stage: "candidate-census-plan",
        contextIndex,
        debateNumber: context.debateNumber,
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
        exactCopiedInputFiles: 5,
        copiedInputBytes: context.copiedInputBytes,
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
          planOutputWritten: false,
          stdoutTail: invocation.stdout.slice(-12000),
          stderrTail: invocation.stderr.slice(-12000),
        };
      } else {
        const resultBytes = await readFile(resultPath);
        await mkdir(path.dirname(context.output), { recursive: true });
        await copyFile(resultPath, context.output);
        let plan = null;
        let validationSummary = null;
        let validationMessage = null;
        try {
          plan = JSON.parse(resultBytes);
          const [legacySchema, candidateTransport, candidateCensus] =
            await Promise.all([
              readFile(prepared.compilerSchema, "utf8").then(JSON.parse),
              readFile(prepared.fullCandidateTransport, "utf8").then(JSON.parse),
              readFile(prepared.candidateCensus, "utf8").then(JSON.parse),
            ]);
          validationSummary = validateCandidateShardedInventoryPlan({
            plan,
            legacySchema,
            candidateTransport,
            candidateCensus,
          });
        } catch (error) {
          validationMessage = error.message;
        }
        const valid = validationSummary?.status === "passed";
        record = {
          ...base,
          status: valid ? "completed-valid" : "output-validation-failed",
          accepted: valid,
          planOutputWritten: true,
          planSha256: sha256(resultBytes),
          inventoryPlanCanonicalSha256: valid
            ? candidateShardedInventoryPlanSha256(plan)
            : null,
          validationSummary,
          validationMessage,
          stdoutTail: valid ? null : invocation.stdout.slice(-12000),
          stderrTail: valid ? null : invocation.stderr.slice(-12000),
        };
      }
    } catch (error) {
      record = {
        stage: "candidate-census-plan",
        contextIndex,
        debateNumber: context.debateNumber,
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
        exactCopiedInputFiles: 5,
        copiedInputBytes: context.copiedInputBytes,
        meteredApiCostUsd: 0,
        transcriptionCostUsd: 0,
        status: "runner-failed",
        accepted: false,
        planOutputWritten: false,
        failureMessage: error.message,
      };
    } finally {
      activeContexts -= 1;
      await rm(sourceDirectory, { recursive: true, force: true });
      await rm(isolatedCodexHome, { recursive: true, force: true });
    }
    process.stdout.write(
      `[post-canary-batch-04-candidate-plan] Debate ${context.debateNumber} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`
    );
    return record;
  }

  const resultsByIndex = new Array(CONTEXTS);
  const rampPhases = [];
  async function runFixedIndexes(indexes, maximumParallelContexts, phase) {
    const startedAt = new Date().toISOString();
    let cursor = 0;
    let phaseFailed = false;
    async function worker() {
      while (cursor < indexes.length && !phaseFailed) {
        const position = cursor;
        cursor += 1;
        const contextIndex = indexes[position];
        const result = await executeContext(
          preparation.contexts[contextIndex],
          contextIndex
        );
        resultsByIndex[contextIndex] = result;
        if (!result.accepted) phaseFailed = true;
      }
    }
    await Promise.all(
      Array.from(
        { length: Math.min(maximumParallelContexts, indexes.length) },
        () => worker()
      )
    );
    const attemptedIndexes = indexes.filter(
      (index) => resultsByIndex[index] !== undefined
    );
    const passed =
      attemptedIndexes.length === indexes.length &&
      attemptedIndexes.every((index) => resultsByIndex[index].accepted);
    rampPhases.push({
      phase,
      maximumParallelContexts,
      contextIndexesPlanned: indexes,
      contextIndexesAttempted: attemptedIndexes,
      startedAt,
      completedAt: new Date().toISOString(),
      passed,
    });
    return passed;
  }

  let rampPassed = await runFixedIndexes([0], 1, "operational-canary-one");
  if (rampPassed) {
    rampPassed = await runFixedIndexes(
      Array.from({ length: CONTEXTS - 1 }, (_, index) => index + 1),
      2,
      "steady-two"
    );
  }
  const results = resultsByIndex.filter(Boolean);
  const validContexts = results.filter((result) => result.accepted).length;
  const execution = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-04-candidate-census-plan-model-execution",
    protocolId: PROTOCOL_ID,
    status:
      validContexts === CONTEXTS
        ? EXECUTION_STATUS
        : "post-canary-batch-04-candidate-census-plan-gate-complete-with-failure",
    productionContinuation: true,
    developmentValidationOnly: false,
    productionCanary: false,
    stagingOnly: true,
    AIOnly: true,
    activation: ACTIVATION,
    activationSha256: sha256(activationBytes),
    gateStartedAt,
    gateCompletedAt: new Date().toISOString(),
    contextsPlanned: CONTEXTS,
    contextsAttempted: results.length,
    contextsUnattempted: CONTEXTS - results.length,
    validContexts,
    invalidContexts: results.length - validContexts,
    attempts: results.length,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    parallelismMaximumAllowed: 2,
    maximumParallelContextsObserved,
    schedulerRamp: [1, 2],
    rampPhases,
    rampPassed,
    wallElapsedMs: Date.now() - gateStarted,
    modelWorkElapsedMs: results.reduce(
      (sum, result) => sum + result.elapsedMs,
      0
    ),
    results,
    authentication: "ChatGPT subscription",
    scoreBlind: true,
    integerRoundedTiesPermitted: true,
    zeroLexicalTokenSourceRowPreserved: true,
    exactSourceRowsInjectedOmittedOrRewritten: false,
    directIncrementalCostUsd: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    audioCalls: 0,
    scoresDerived: 0,
    productionMutations: 0,
    authorization: {
      deterministicPlanAnalysis: validContexts === CONTEXTS,
      exactSidePacketPreparation: false,
      sideSelectorModelExecution: false,
      inventoryCompilation: false,
      retry: false,
      timeoutExtension: false,
      semanticCorrection: false,
      independentJudgmentModelExecution: false,
      paidServices: false,
      audioVerification: false,
      scoreDerivation: false,
      publicationReconstruction: false,
      productionMutation: false,
    },
    nextRequiredAction:
      validContexts === CONTEXTS
        ? "analyze-and-replay-ten-batch-04-candidate-census-plans-model-free-only"
        : "stop-preserve-failed-batch-04-candidate-census-plan-gate",
  };
  await writeFile(EXECUTION, jsonBytes(execution));
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
        directIncrementalCostUsd: 0,
        scoresDerived: 0,
        nextRequiredAction: execution.nextRequiredAction,
      },
      null,
      2
    )
  );
}

async function analyze() {
  const shouldWrite = process.argv.includes("--write");
  const { activation, activationBytes, preparation, sourcePreparation } =
    await loadAndValidateActivation();
  assertV4(!shouldWrite || !(await exists(ANALYSIS)), `${ANALYSIS} already exists`);
  const executionBytes = await readFile(EXECUTION);
  const execution = JSON.parse(executionBytes);
  assertV4(
    execution.status === EXECUTION_STATUS &&
      execution.activationSha256 === sha256(activationBytes) &&
      execution.contextsPlanned === CONTEXTS &&
      execution.contextsAttempted === CONTEXTS &&
      execution.contextsUnattempted === 0 &&
      execution.validContexts === CONTEXTS &&
      execution.invalidContexts === 0 &&
      execution.attempts === CONTEXTS &&
      execution.retries === 0 &&
      execution.timeoutExtensions === 0 &&
      execution.semanticCorrections === 0 &&
      execution.rampPassed === true &&
      execution.maximumParallelContextsObserved === 2 &&
      execution.authentication === "ChatGPT subscription" &&
      execution.scoreBlind === true &&
      execution.integerRoundedTiesPermitted === true &&
      execution.zeroLexicalTokenSourceRowPreserved === true &&
      execution.exactSourceRowsInjectedOmittedOrRewritten === false &&
      execution.directIncrementalCostUsd === 0 &&
      execution.meteredApiCostUsd === 0 &&
      execution.transcriptionCostUsd === 0 &&
      execution.audioCalls === 0 &&
      execution.scoresDerived === 0 &&
      execution.productionMutations === 0,
    "candidate-census plan execution did not pass as one complete gate"
  );
  const plans = [];
  for (const [index, context] of preparation.contexts.entries()) {
    const prepared = sourcePreparation.contexts.find(
      (item) => item.debateNumber === context.debateNumber
    );
    const result = execution.results.find((item) => item.contextIndex === index);
    assertV4(
      prepared &&
        result?.debateNumber === context.debateNumber &&
        result?.accepted === true &&
        result?.attemptCount === 1 &&
        result?.retryCount === 0 &&
        result?.timedOut === false &&
        result?.status === "completed-valid" &&
        result?.planOutputWritten === true,
      `${context.debateNumber}: accepted execution record drifted`
    );
    const [planBytes, legacySchema, candidateTransport, candidateCensus] =
      await Promise.all([
        readFile(context.output),
        readFile(prepared.compilerSchema, "utf8").then(JSON.parse),
        readFile(prepared.fullCandidateTransport, "utf8").then(JSON.parse),
        readFile(prepared.candidateCensus, "utf8").then(JSON.parse),
      ]);
    assertV4(
      sha256(planBytes) === result.planSha256,
      `${context.debateNumber}: accepted plan bytes drifted`
    );
    const plan = JSON.parse(planBytes);
    const validation = validateCandidateShardedInventoryPlan({
      plan,
      legacySchema,
      candidateTransport,
      candidateCensus,
    });
    const canonicalSha256 = candidateShardedInventoryPlanSha256(plan);
    assertV4(
      validation.status === "passed" &&
        canonicalSha256 === result.inventoryPlanCanonicalSha256,
      `${context.debateNumber}: deterministic plan replay failed`
    );
    plans.push({
      contextIndex: index,
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      output: context.output,
      outputSha256: sha256(planBytes),
      canonicalSha256,
      routes: plan.routes.length,
      routeSides: plan.routes.map((route) => route.side).sort(),
      sections: plan.sections.length,
      sectionIds: plan.sections.map((section) => section.sectionId),
      weightPercentTotal: plan.sections.reduce(
        (sum, section) => sum + section.weightPercent,
        0
      ),
      validated: true,
    });
  }
  const sourceHashes = {
    [ACTIVATION]: sha256(activationBytes),
    [PREPARATION]: sha256(await readFile(PREPARATION)),
    [SOURCE_PREPARATION]: sha256(await readFile(SOURCE_PREPARATION)),
    [EXECUTION]: sha256(executionBytes),
  };
  for (const plan of plans) sourceHashes[plan.output] = plan.outputSha256;
  const analysis = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-04-candidate-census-plan-analysis",
    protocolId: PROTOCOL_ID,
    status:
      "post-canary-batch-04-candidate-census-plan-gate-passed-standing-authorization-active-for-side-packet-preparation",
    productionContinuation: true,
    developmentValidationOnly: false,
    productionCanary: false,
    stagingOnly: true,
    AIOnly: true,
    activePolicy: structuredClone(activation.activePolicy),
    sourceCompatibility: structuredClone(activation.sourceCompatibility),
    validatedInventoryContract: structuredClone(
      activation.validatedInventoryContract
    ),
    model: structuredClone(activation.model),
    activation: ACTIVATION,
    activationSha256: sha256(activationBytes),
    execution: EXECUTION,
    executionSha256: sha256(executionBytes),
    plans,
    audit: {
      exactPlanCount: plans.length,
      everyPlanSingleAttempt: true,
      everyPlanSchemaAndSemanticValidationPassed: true,
      everyPlanCanonicalHashReplayed: true,
      everyPlanHasOneRoutePerSide: plans.every(
        (plan) => JSON.stringify(plan.routeSides) === JSON.stringify(["con", "pro"])
      ),
      everyPlanHasFourToSixSections: plans.every(
        (plan) => plan.sections >= 4 && plan.sections <= 6
      ),
      everyPlanWeightsTotalOneHundred: plans.every(
        (plan) => plan.weightPercentTotal === 100
      ),
      zeroLexicalTokenSourceRowPreserved: true,
      exactSourceRowsInjectedOmittedOrRewritten: false,
      candidateSelectionPerformed: false,
      exactSidePacketsFrozen: 0,
      sideSelectorModelsExecuted: 0,
      judgmentModelsExecuted: 0,
      audioCalls: 0,
      scoresDerived: 0,
      publicationReconstructionPerformed: false,
      productionMutations: 0,
    },
    sourceHashes,
    totals: {
      debates: plans.length,
      planContextsAttempted: execution.contextsAttempted,
      acceptedPlans: plans.length,
      exactSidePacketsFrozen: 0,
      modelContextsExecuted: CONTEXTS,
      sideSelectorModelContextsExecuted: 0,
      judgmentModelContextsExecuted: 0,
      retries: 0,
      timeoutExtensions: 0,
      semanticCorrections: 0,
      paidServiceCalls: 0,
      audioCalls: 0,
      transcriptionCalls: 0,
      scoresDerived: 0,
      productionMutations: 0,
      directIncrementalCostUsd: 0,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
    },
    authorization: {
      exactSidePacketPreparation: false,
      sideSelectorExecutionManifestPreparation: false,
      sideSelectorModelExecution: false,
      inventoryCompilation: false,
      retry: false,
      timeoutExtension: false,
      semanticCorrection: false,
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
    nextAuthorizedAction:
      "prepare-freeze-and-activate-twenty-exact-batch-04-side-selector-packets-under-standing-authorization",
  };
  if (shouldWrite) await writeFile(ANALYSIS, jsonBytes(analysis));
  console.log(
    JSON.stringify(
      {
        status: shouldWrite ? analysis.status : "preview",
        debates: plans.length,
        acceptedPlans: plans.length,
        exactSidePacketsFrozen: 0,
        modelContextsExecuted: CONTEXTS,
        sideSelectorModelContextsExecuted: 0,
        judgmentModelContextsExecuted: 0,
        retries: 0,
        timeoutExtensions: 0,
        directIncrementalCostUsd: 0,
        scoresDerived: 0,
        productionMutations: 0,
        nextAuthorizedAction: analysis.nextAuthorizedAction,
      },
      null,
      2
    )
  );
}

async function validate() {
  if (!(await exists(ACTIVATION))) {
    await preflight();
    return;
  }
  const { activation, activationBytes, preparation, sourcePreparation } =
    await loadAndValidateActivation();
  if (!(await exists(EXECUTION))) {
    for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
      assertV4(!(await exists(future)), `unexpected future output exists: ${future}`);
    }
    console.log(
      JSON.stringify(
        {
          status: "passed-activation-awaiting-model-execution",
          contexts: CONTEXTS,
          model: activation.model,
          schedulerRamp: [1, 2],
          attemptsPerContext: 1,
          directIncrementalCostUsdMaximum: 0,
          modelContextsExecuted: 0,
        },
        null,
        2
      )
    );
    return;
  }
  const execution = JSON.parse(await readFile(EXECUTION, "utf8"));
  assertV4(
    execution.activationSha256 === sha256(activationBytes) &&
      execution.contextsPlanned === CONTEXTS &&
      execution.contextsAttempted >= 1 &&
      execution.contextsAttempted <= CONTEXTS &&
      execution.contextsUnattempted === CONTEXTS - execution.contextsAttempted &&
      execution.attempts === execution.contextsAttempted &&
      execution.retries === 0 &&
      execution.timeoutExtensions === 0 &&
      execution.semanticCorrections === 0 &&
      execution.maximumParallelContextsObserved <= 2 &&
      JSON.stringify(execution.schedulerRamp) === JSON.stringify([1, 2]) &&
      execution.authentication === "ChatGPT subscription" &&
      execution.scoreBlind === true &&
      execution.zeroLexicalTokenSourceRowPreserved === true &&
      execution.exactSourceRowsInjectedOmittedOrRewritten === false &&
      execution.directIncrementalCostUsd === 0 &&
      execution.meteredApiCostUsd === 0 &&
      execution.transcriptionCostUsd === 0 &&
      execution.audioCalls === 0 &&
      execution.scoresDerived === 0 &&
      execution.productionMutations === 0,
    "execution record controls are invalid"
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
        result.exactCopiedInputFiles === 5 &&
        result.meteredApiCostUsd === 0 &&
        result.transcriptionCostUsd === 0,
      `${result.debateNumber}: execution controls invalid`
    );
    if (result.planOutputWritten) {
      const context = preparation.contexts[result.contextIndex];
      assertV4(
        sha256(await readFile(context.output)) === result.planSha256,
        `${result.debateNumber}: plan output drifted`
      );
    }
  }
  if (execution.status !== EXECUTION_STATUS) {
    assertV4(
      execution.invalidContexts >= 1 && !(await exists(ANALYSIS)),
      "failed gate must stop without an analysis artifact"
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
      execution.rampPhases.length === 2 &&
      execution.rampPhases.every((phase) => phase.passed) &&
      execution.maximumParallelContextsObserved === 2,
    "successful execution invariants are invalid"
  );
  if (!(await exists(ANALYSIS))) {
    console.log(
      JSON.stringify(
        {
          status: "passed-execution-awaiting-analysis",
          validContexts: CONTEXTS,
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
  const analysis = JSON.parse(await readFile(ANALYSIS, "utf8"));
  assertV4(
    analysis.status ===
      "post-canary-batch-04-candidate-census-plan-gate-passed-standing-authorization-active-for-side-packet-preparation" &&
      analysis.plans.length === CONTEXTS &&
      analysis.audit.exactPlanCount === CONTEXTS &&
      analysis.audit.everyPlanSingleAttempt === true &&
      analysis.audit.everyPlanSchemaAndSemanticValidationPassed === true &&
      analysis.audit.everyPlanCanonicalHashReplayed === true &&
      analysis.audit.everyPlanHasOneRoutePerSide === true &&
      analysis.audit.everyPlanHasFourToSixSections === true &&
      analysis.audit.everyPlanWeightsTotalOneHundred === true &&
      analysis.audit.zeroLexicalTokenSourceRowPreserved === true &&
      analysis.audit.exactSourceRowsInjectedOmittedOrRewritten === false &&
      analysis.audit.candidateSelectionPerformed === false &&
      analysis.audit.exactSidePacketsFrozen === 0 &&
      analysis.audit.sideSelectorModelsExecuted === 0 &&
      analysis.audit.judgmentModelsExecuted === 0 &&
      analysis.audit.audioCalls === 0 &&
      analysis.audit.scoresDerived === 0 &&
      analysis.audit.productionMutations === 0 &&
      analysis.totals.modelContextsExecuted === CONTEXTS &&
      analysis.totals.sideSelectorModelContextsExecuted === 0 &&
      analysis.totals.judgmentModelContextsExecuted === 0 &&
      analysis.totals.retries === 0 &&
      analysis.totals.timeoutExtensions === 0 &&
      analysis.totals.paidServiceCalls === 0 &&
      analysis.totals.directIncrementalCostUsd === 0 &&
      analysis.totals.scoresDerived === 0 &&
      analysis.totals.productionMutations === 0 &&
      analysis.authorization.exactSidePacketPreparation === false &&
      analysis.authorization.sideSelectorModelExecution === false &&
      analysis.authorization.independentJudgmentModelExecution === false &&
      analysis.authorization.paidTranscription === false &&
      analysis.authorization.audioVerification === false &&
      analysis.authorization.scoreDerivation === false &&
      analysis.authorization.publicationModelExecution === false &&
      analysis.authorization.productionMutation === false,
    "analysis controls are invalid"
  );
  for (const [index, context] of preparation.contexts.entries()) {
    const prepared = sourcePreparation.contexts.find(
      (item) => item.debateNumber === context.debateNumber
    );
    const planRecord = analysis.plans[index];
    const planBytes = await readFile(context.output);
    const plan = JSON.parse(planBytes);
    const [legacySchema, candidateTransport, candidateCensus] =
      await Promise.all([
        readFile(prepared.compilerSchema, "utf8").then(JSON.parse),
        readFile(prepared.fullCandidateTransport, "utf8").then(JSON.parse),
        readFile(prepared.candidateCensus, "utf8").then(JSON.parse),
      ]);
    assertV4(
      planRecord.debateNumber === context.debateNumber &&
        planRecord.outputSha256 === sha256(planBytes) &&
        planRecord.canonicalSha256 ===
          candidateShardedInventoryPlanSha256(plan) &&
        validateCandidateShardedInventoryPlan({
          plan,
          legacySchema,
          candidateTransport,
          candidateCensus,
        }).status === "passed",
      `${context.debateNumber}: analysis replay failed`
    );
  }
  console.log(
    JSON.stringify(
      {
        status: "passed-analysis",
        analysisStatus: analysis.status,
        debates: CONTEXTS,
        acceptedPlans: CONTEXTS,
        modelContextsExecuted: CONTEXTS,
        sideSelectorModelContextsExecuted: 0,
        judgmentModelContextsExecuted: 0,
        retries: 0,
        timeoutExtensions: 0,
        directIncrementalCostUsd: 0,
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
if (command === "preflight") await preflight();
else if (command === "activate") await activate();
else if (command === "run") await execute();
else if (command === "analyze") await analyze();
else if (command === "validate") await validate();
else {
  throw new Error(
    "usage: run-assessment-production-post-canary-batch-04-inventory-plans.mjs <preflight|activate|run|analyze|validate>"
  );
}
