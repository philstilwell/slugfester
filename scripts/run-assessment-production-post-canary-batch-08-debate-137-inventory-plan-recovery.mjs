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
  POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch08StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-08-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-08/inventory-candidate-sharded";
const RECOVERY = `${ROOT}/plan-recovery-1/debate-137`;
const PREPARATION = `${RECOVERY}/execution-preparation-manifest.json`;
const ACTIVATION = `${RECOVERY}/execution-activation.json`;
const EXECUTION = `${RECOVERY}/model-execution.json`;
const RECOVERY_ANALYSIS = `${RECOVERY}/analysis.json`;
const COHORT_ANALYSIS = `${ROOT}/plan-analysis.json`;
const MERGED_PLAN = `${ROOT}/plans/debate-137.json`;
const ORIGINAL_PREPARATION = `${ROOT}/plan-execution-preparation-manifest.json`;
const SOURCE_PREPARATION = `${ROOT}/preparation-manifest.json`;
const ORIGINAL_ACTIVATION = `${ROOT}/plan-execution-activation.json`;
const ORIGINAL_EXECUTION = `${ROOT}/plan-model-execution.json`;
const ORIGINAL_SCHEMA = `${ROOT}/schemas/plans/debate-137.schema.json`;
const PREPARER =
  "scripts/prepare-assessment-production-post-canary-batch-08-debate-137-inventory-plan-recovery.mjs";
const RUNNER =
  "scripts/run-assessment-production-post-canary-batch-08-debate-137-inventory-plan-recovery.mjs";
const PROTOCOL_ID =
  "assessment-production-post-canary-batch-08-candidate-sharded-inventory";
const DEBATES = ["88", "194", "137", "08", "65", "140", "156", "120", "118", "145"];
const SHARDS = ["routes", "sections"];
const PREPARATION_STATUS =
  "two-frozen-debate-137-inventory-plan-recovery-shards-prepared-not-activated";
const ACTIVATION_STATUS =
  "two-frozen-debate-137-inventory-plan-recovery-shards-authorized";
const EXECUTION_STATUS =
  "two-debate-137-inventory-plan-recovery-shards-passed-and-merged";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

function allBooleanLeavesTrue(value) {
  if (typeof value === "boolean") return value;
  if (!value || typeof value !== "object") return true;
  return Object.values(value).every(allBooleanLeavesTrue);
}

function exactKeys(value, keys, label) {
  assertV4(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()),
    `${label}: keys drifted`
  );
}

function boundedString(value, minimum, maximum, label) {
  assertV4(
    typeof value === "string" &&
      value.trim().length >= minimum &&
      value.length <= maximum,
    `${label}: string boundary failed`
  );
}

function validateBridge(bridge, tier, label) {
  exactKeys(bridge, ["bridgeId", "tier", "description"], label);
  boundedString(bridge.bridgeId, 1, 100, `${label}/bridgeId`);
  assertV4(bridge.tier === tier, `${label}/tier drifted`);
  boundedString(bridge.description, 25, 400, `${label}/description`);
}

function validateShard(field, value) {
  exactKeys(value, [field], `shard/${field}`);
  if (field === "routes") {
    assertV4(Array.isArray(value.routes) && value.routes.length === 2, "routes count");
    const sides = [];
    const allIds = [];
    for (const [index, route] of value.routes.entries()) {
      const label = `routes/${index}`;
      exactKeys(
        route,
        [
          "routeId",
          "side",
          "description",
          "successCriteria",
          "motionBridge",
          "centralBridges",
          "subsidiaryBridges",
        ],
        label
      );
      boundedString(route.routeId, 1, 100, `${label}/routeId`);
      assertV4(["pro", "con"].includes(route.side), `${label}/side`);
      boundedString(route.description, 40, 700, `${label}/description`);
      boundedString(route.successCriteria, 40, 700, `${label}/successCriteria`);
      validateBridge(route.motionBridge, "motion", `${label}/motionBridge`);
      assertV4(
        Array.isArray(route.centralBridges) &&
          route.centralBridges.length >= 1 &&
          route.centralBridges.length <= 4,
        `${label}/centralBridges count`
      );
      route.centralBridges.forEach((bridge, bridgeIndex) =>
        validateBridge(bridge, "central", `${label}/centralBridges/${bridgeIndex}`)
      );
      assertV4(
        Array.isArray(route.subsidiaryBridges) &&
          route.subsidiaryBridges.length >= 1 &&
          route.subsidiaryBridges.length <= 2,
        `${label}/subsidiaryBridges count`
      );
      route.subsidiaryBridges.forEach((bridge, bridgeIndex) =>
        validateBridge(
          bridge,
          "subsidiary",
          `${label}/subsidiaryBridges/${bridgeIndex}`
        )
      );
      sides.push(route.side);
      allIds.push(
        route.routeId,
        route.motionBridge.bridgeId,
        ...route.centralBridges.map((bridge) => bridge.bridgeId),
        ...route.subsidiaryBridges.map((bridge) => bridge.bridgeId)
      );
    }
    assertV4(
      JSON.stringify(sides.sort()) === JSON.stringify(["con", "pro"]) &&
        new Set(allIds).size === allIds.length,
      "route sides or IDs are not unique"
    );
  } else {
    assertV4(
      Array.isArray(value.sections) &&
        value.sections.length >= 4 &&
        value.sections.length <= 6,
      "sections count"
    );
    for (const [index, section] of value.sections.entries()) {
      const label = `sections/${index}`;
      exactKeys(section, ["sectionId", "title", "weightPercent", "rationale"], label);
      boundedString(section.sectionId, 1, 100, `${label}/sectionId`);
      boundedString(section.title, 3, 120, `${label}/title`);
      assertV4(
        Number.isInteger(section.weightPercent) &&
          section.weightPercent >= 1 &&
          section.weightPercent <= 97,
        `${label}/weightPercent`
      );
      boundedString(section.rationale, 40, 500, `${label}/rationale`);
    }
    assertV4(
      new Set(value.sections.map((section) => section.sectionId)).size ===
          value.sections.length &&
        value.sections.reduce((sum, section) => sum + section.weightPercent, 0) ===
          100,
      "section IDs or weights failed"
    );
  }
  return { status: "passed", field, items: value[field].length };
}

function constObject(schema) {
  return Object.fromEntries(
    Object.entries(schema.properties).map(([key, definition]) => [
      key,
      definition.const,
    ])
  );
}

function mergePlan(originalSchema, routesShard, sectionsShard) {
  return {
    schemaVersion: originalSchema.properties.schemaVersion.const,
    protocolId: originalSchema.properties.protocolId.const,
    debateNumber: originalSchema.properties.debateNumber.const,
    debateId: originalSchema.properties.debateId.const,
    reviewerRole: originalSchema.properties.reviewerRole.const,
    assessmentModel: originalSchema.properties.assessmentModel.const,
    calibrationOnly: originalSchema.properties.calibrationOnly.const,
    candidateCensusCanonicalSha256:
      originalSchema.properties.candidateCensusCanonicalSha256.const,
    fullCandidateTransportCanonicalSha256:
      originalSchema.properties.fullCandidateTransportCanonicalSha256.const,
    isolation: constObject(originalSchema.properties.isolation),
    routes: structuredClone(routesShard.routes),
    sections: structuredClone(sectionsShard.sections),
    audit: constObject(originalSchema.properties.audit),
  };
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

async function loadPreparation({ requireFutureAbsent = false } = {}) {
  const preparationBytes = await readFile(PREPARATION);
  const preparation = JSON.parse(preparationBytes);
  const standingAuthorization =
    await loadAndValidatePostCanaryBatch08StandingAuthorization();
  assertV4(
    preparation.status === PREPARATION_STATUS &&
      preparation.protocolId === PROTOCOL_ID &&
      preparation.branch === "main" &&
      preparation.debateNumber === "137" &&
      preparation.contexts.length === 2 &&
      preparation.contexts.map((context) => context.shardId).join(",") ===
        "routes,sections" &&
      preparation.contexts.every(
        (context) =>
          context.writableFields.length === 1 &&
          context.writableFields[0] === context.shardId
      ) &&
      preparation.standingAuthorization ===
        POST_CANARY_BATCH_08_STANDING_AUTHORIZATION &&
      preparation.standingAuthorizationSha256 === standingAuthorization.sha256 &&
      preparation.model.label === "5.6 Sol" &&
      preparation.model.slug === "gpt-5.6-sol" &&
      preparation.model.reasoningEffort === "low" &&
      preparation.model.authentication === "ChatGPT subscription" &&
      preparation.model.scoreBlind === true &&
      preparation.executionPolicy.attemptsPerContext === 1 &&
      preparation.executionPolicy.retriesMaximum === 0 &&
      preparation.executionPolicy.timeoutMsPerContext === 600000 &&
      preparation.executionPolicy.timeoutExtensionsMaximum === 0 &&
      preparation.executionPolicy.effectiveMaximumParallelContexts === 1 &&
      preparation.executionPolicy.separateActivationRequired === true &&
      preparation.authorization.modelExecution === false &&
      preparation.authorization.retries === false &&
      preparation.authorization.timeoutExtensions === false &&
      preparation.authorization.recursiveCorrection === false &&
      preparation.authorization.paidServices === false &&
      preparation.directIncrementalCostUsdMaximum === 0 &&
      preparation.meteredApiCostUsdMaximum === 0 &&
      allBooleanLeavesTrue(preparation.acceptancePolicy),
    "Debate 137 recovery preparation controls drifted"
  );
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: recovery source drifted`);
  }
  for (const [file, digest] of Object.entries(preparation.protectedPlanHashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: accepted plan drifted`);
  }
  for (const context of preparation.contexts) {
    const packetBytes = await readFile(context.packet);
    const packet = JSON.parse(packetBytes);
    assertV4(
      sha256(packetBytes) === context.packetSha256 &&
        packetBytes.length === context.packetBytes &&
        packet.writableDomains.length === 1 &&
        packet.writableDomains[0] === context.shardId &&
        packet.output === context.output &&
        packet.attemptsMaximum === 1 &&
        packet.retries === 0 &&
        packet.timeoutMs === 600000 &&
        packet.timeoutExtensions === 0 &&
        packet.modelExecutionAuthorized === false &&
        packet.mergeRuleCanonicalSha256 === preparation.mergeRuleCanonicalSha256,
      `${context.shardId}: shard packet drifted`
    );
    let copiedInputBytes = 0;
    for (const input of packet.copiedInputs) {
      const bytes = await readFile(input.path);
      assertV4(
        sha256(bytes) === input.sha256 && bytes.length === input.bytes,
        `${context.shardId}/${input.role}: copied input drifted`
      );
      copiedInputBytes += bytes.length;
    }
    assertV4(
      copiedInputBytes === context.copiedInputBytes &&
        copiedInputBytes === packet.copiedInputBytes &&
        sha256(await readFile(context.schema)) === context.schemaSha256,
      `${context.shardId}: copied-input boundary drifted`
    );
  }
  if (requireFutureAbsent) {
    for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
      assertV4(!(await exists(future)), `future output already exists: ${future}`);
    }
  }
  return { preparation, preparationBytes, standingAuthorization };
}

async function preflight() {
  const { preparation } = await loadPreparation({ requireFutureAbsent: true });
  const validation = JSON.parse(
    execFileSync(process.execPath, [PREPARER, "validate"], { encoding: "utf8" })
  );
  assertV4(
    validation.status ===
      "passed-frozen-debate-137-inventory-plan-recovery-preparation" &&
      validation.contexts === 2 &&
      validation.modelContextsExecuted === 0 &&
      validation.directIncrementalCostUsd === 0,
    "Debate 137 recovery preparation validator failed"
  );
  const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
  await access(codex);
  await access(path.join(os.homedir(), ".codex", "auth.json"));
  console.log(
    JSON.stringify(
      {
        status: "passed-debate-137-recovery-model-free-preflight",
        contexts: 2,
        shards: SHARDS,
        model: preparation.model,
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

async function activate() {
  const shouldWrite = process.argv.includes("--write");
  const activatedIndex = process.argv.indexOf("--activated-at");
  const activatedAt =
    activatedIndex >= 0 ? process.argv[activatedIndex + 1] : null;
  assertV4(
    activatedAt && !Number.isNaN(Date.parse(activatedAt)),
    "--activated-at requires an ISO timestamp"
  );
  const { preparation, preparationBytes, standingAuthorization } =
    await loadPreparation({ requireFutureAbsent: true });
  const sourceHashes = {
    ...structuredClone(preparation.sourceHashes),
    [PREPARATION]: sha256(preparationBytes),
    [RUNNER]: sha256(await readFile(RUNNER)),
  };
  const futureOutputs = preparation.futureOutputPathsExcludedFromSourceHashes.filter(
    (file) => file !== ACTIVATION
  );
  const activation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-08-debate-137-inventory-plan-recovery-execution-activation",
    protocolId: PROTOCOL_ID,
    status: ACTIVATION_STATUS,
    activatedAt,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    branch: "main",
    debateNumber: "137",
    standingAuthorization: POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
    preparation: PREPARATION,
    preparationSha256: sha256(preparationBytes),
    model: structuredClone(preparation.model),
    executionPolicy: structuredClone(preparation.executionPolicy),
    contexts: structuredClone(preparation.contexts),
    mergeRule: structuredClone(preparation.mergeRule),
    mergeRuleCanonicalSha256: preparation.mergeRuleCanonicalSha256,
    protectedPlanHashes: structuredClone(preparation.protectedPlanHashes),
    sourceHashes,
    futureOutputPathsExcludedFromSourceHashes: futureOutputs,
    authorization: {
      modelExecution: true,
      deterministicMerge: true,
      cohortReplay: true,
      sidePacketPreparation: false,
      retries: false,
      timeoutExtensions: false,
      recursiveCorrection: false,
      paidServices: false,
      scoreDerivation: false,
      productionMutation: false,
    },
    stopRules: {
      thirdFailureOfSameUnderlyingProblemBlocks: true,
      failedSecondBoundedCorrectionBlocks: true,
      moreThanTwoRecoveryLevelsBlocks: true,
      retryBlocks: true,
      timeoutExtensionBlocks: true,
      failedPartialOutputReuseBlocks: true,
      protectedAcceptedPlanHashDriftBlocks: true,
      unexpectedValidationCategoryBlocks: true,
      paidServiceBlocks: true,
    },
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    nextRequiredAction:
      "execute-routes-shard-once-then-sections-shard-once-if-first-passes",
  };
  if (shouldWrite) {
    assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
    await writeFile(ACTIVATION, jsonBytes(activation));
  }
  console.log(
    JSON.stringify(
      {
        status: shouldWrite ? activation.status : "preview",
        contexts: 2,
        shards: SHARDS,
        model: activation.model,
        schedulerRamp: [1, 2],
        attemptsPerContext: 1,
        directIncrementalCostUsdMaximum: 0,
        modelExecutionAuthorized: true,
      },
      null,
      2
    )
  );
}

async function loadActivation({ requireFutureAbsent = false } = {}) {
  const activationBytes = await readFile(ACTIVATION);
  const activation = JSON.parse(activationBytes);
  const { preparation, preparationBytes, standingAuthorization } =
    await loadPreparation();
  assertV4(
    activation.status === ACTIVATION_STATUS &&
      activation.protocolId === PROTOCOL_ID &&
      activation.branch === "main" &&
      activation.debateNumber === "137" &&
      activation.standingAuthorization ===
        POST_CANARY_BATCH_08_STANDING_AUTHORIZATION &&
      activation.standingAuthorizationSha256 === standingAuthorization.sha256 &&
      activation.preparation === PREPARATION &&
      activation.preparationSha256 === sha256(preparationBytes) &&
      activation.model.label === "5.6 Sol" &&
      activation.model.slug === "gpt-5.6-sol" &&
      activation.model.reasoningEffort === "low" &&
      activation.model.authentication === "ChatGPT subscription" &&
      activation.model.scoreBlind === true &&
      activation.contexts.length === 2 &&
      activation.contexts.map((context) => context.shardId).join(",") ===
        "routes,sections" &&
      activation.authorization.modelExecution === true &&
      activation.authorization.deterministicMerge === true &&
      activation.authorization.cohortReplay === true &&
      activation.authorization.retries === false &&
      activation.authorization.timeoutExtensions === false &&
      activation.authorization.recursiveCorrection === false &&
      activation.authorization.paidServices === false &&
      activation.directIncrementalCostUsdMaximum === 0 &&
      activation.meteredApiCostUsdMaximum === 0 &&
      allBooleanLeavesTrue(activation.stopRules),
    "Debate 137 recovery activation controls drifted"
  );
  for (const [file, digest] of Object.entries(activation.sourceHashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: activation source drifted`);
  }
  for (const [file, digest] of Object.entries(activation.protectedPlanHashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: accepted plan drifted`);
  }
  if (requireFutureAbsent) {
    for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
      assertV4(!(await exists(future)), `future output already exists: ${future}`);
    }
  }
  return { activation, activationBytes, preparation };
}

async function execute() {
  const { activation, activationBytes } = await loadActivation({
    requireFutureAbsent: true,
  });
  const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
  assertV4(
    execFileSync(codex, ["--version"], { encoding: "utf8" }).trim() ===
      "codex-cli 0.148.0-alpha.15",
    "Codex CLI version drifted"
  );
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  const gateStartedAt = new Date().toISOString();
  const gateStarted = Date.now();
  const gateDeadline =
    gateStarted + activation.executionPolicy.absoluteStageTimeoutMs;
  const results = [];

  async function executeContext(context) {
    const packet = JSON.parse(await readFile(context.packet, "utf8"));
    const remainingStageMs = gateDeadline - Date.now();
    assertV4(remainingStageMs > 0, "recovery stage deadline reached before launch");
    const timeoutMs = Math.min(
      activation.executionPolicy.timeoutMsPerContext,
      remainingStageMs
    );
    const sourceDirectory = await mkdtemp(
      path.join(os.tmpdir(), `slugfester-batch-08-debate-137-${context.shardId}-`)
    );
    const isolatedCodexHome = await mkdtemp(
      path.join(os.tmpdir(), `slugfester-batch-08-debate-137-home-${context.shardId}-`)
    );
    const startedAt = new Date().toISOString();
    const started = Date.now();
    let record;
    try {
      const targetByRole = {
        "inventory-source-packet": "inventory-source-packet.json",
        "complete-candidate-census": "candidate-census.json",
        "candidate-sharded-inventory-guide": "candidate-sharded-inventory-guide.md",
        "inventory-manual": "inventory-manual.md",
        "strict-output-schema": "shard-schema.json",
      };
      for (const input of packet.copiedInputs) {
        await copyFile(input.path, path.join(sourceDirectory, targetByRole[input.role]));
      }
      await copyFile(authSource, path.join(isolatedCodexHome, "auth.json"));
      const env = { ...process.env, CODEX_HOME: isolatedCodexHome };
      for (const key of activation.executionPolicy.removedEnvironmentVariables) {
        delete env[key];
      }
      const task =
        context.shardId === "routes"
          ? "Author only the routes field: exactly one burden route for pro and one for con, with the required motion, central, and subsidiary bridges. Do not author sections."
          : "Author only the sections field: four to six issue sections with integer weights totaling exactly 100. Do not author routes.";
      const prompt = `Read inventory-source-packet.json, candidate-census.json, candidate-sharded-inventory-guide.md, inventory-manual.md, and shard-schema.json completely; read nothing else. Act only as the isolated score-blind bounded recovery planner for post-canary production Batch 8 Debate 137. Review every candidate in the complete census. ${task} The other field is assigned to a separate isolated context and is unavailable. The original timed-out context produced no accepted output and is unavailable. Candidate selection and evidence excerpts remain deferred. Ratings, response topology, scores, winners, legacy assessments, other debates, prior or other judgments, execution metadata, tags, Overall Commentary, AI Extension, and publication prose are prohibited. Return exactly one shard-schema-conforming JSON object with no explanatory text.`;
      process.stdout.write(
        `[batch-08-debate-137-plan-recovery] starting ${activation.model.label}/${activation.model.reasoningEffort} ${context.shardId}\n`
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
          "shard-schema.json",
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
        contextIndex: context.contextIndex,
        shardId: context.shardId,
        writableFields: context.writableFields,
        model: activation.model.label,
        modelSlug: activation.model.slug,
        reasoningEffort: activation.model.reasoningEffort,
        authentication: "ChatGPT subscription",
        attemptCount: 1,
        retryCount: 0,
        startedAt,
        completedAt: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        timeoutMsApplied: timeoutMs,
        timedOut: invocation.timedOut,
        commandExitCode: invocation.code,
        terminationSignal: invocation.signal,
        apiKeysRemoved: true,
        scoreBlind: true,
        isolatedTemporaryCodexHome: true,
        otherShardOutputUnavailable: true,
        originalFailedPartialOutputUnavailable: true,
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
          outputWritten: false,
          stdoutTail: invocation.stdout.slice(-12000),
          stderrTail: invocation.stderr.slice(-12000),
        };
      } else {
        const resultBytes = await readFile(resultPath);
        await mkdir(path.dirname(context.output), { recursive: true });
        await copyFile(resultPath, context.output);
        let validation = null;
        let validationMessage = null;
        try {
          validation = validateShard(context.shardId, JSON.parse(resultBytes));
        } catch (error) {
          validationMessage = error.message;
        }
        const accepted = validation?.status === "passed";
        record = {
          ...base,
          status: accepted ? "completed-valid" : "output-validation-failed",
          accepted,
          outputWritten: true,
          output: context.output,
          outputSha256: sha256(resultBytes),
          validation,
          validationMessage,
          stdoutTail: accepted ? null : invocation.stdout.slice(-12000),
          stderrTail: accepted ? null : invocation.stderr.slice(-12000),
        };
      }
    } catch (error) {
      record = {
        contextIndex: context.contextIndex,
        shardId: context.shardId,
        writableFields: context.writableFields,
        model: activation.model.label,
        modelSlug: activation.model.slug,
        reasoningEffort: activation.model.reasoningEffort,
        authentication: "ChatGPT subscription",
        attemptCount: 1,
        retryCount: 0,
        startedAt,
        completedAt: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        timeoutMsApplied: timeoutMs,
        timedOut: false,
        commandExitCode: null,
        terminationSignal: null,
        apiKeysRemoved: true,
        scoreBlind: true,
        isolatedTemporaryCodexHome: true,
        otherShardOutputUnavailable: true,
        originalFailedPartialOutputUnavailable: true,
        exactCopiedInputFiles: 5,
        copiedInputBytes: context.copiedInputBytes,
        meteredApiCostUsd: 0,
        transcriptionCostUsd: 0,
        status: "runner-failed",
        accepted: false,
        outputWritten: false,
        failureMessage: error.message,
      };
    } finally {
      await rm(sourceDirectory, { recursive: true, force: true });
      await rm(isolatedCodexHome, { recursive: true, force: true });
    }
    process.stdout.write(
      `[batch-08-debate-137-plan-recovery] ${context.shardId} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`
    );
    return record;
  }

  const phases = [];
  const firstStartedAt = new Date().toISOString();
  const first = await executeContext(activation.contexts[0]);
  results.push(first);
  phases.push({
    phase: "operational-canary-one",
    schedulerMaximum: 1,
    shardIdsPlanned: ["routes"],
    shardIdsAttempted: ["routes"],
    startedAt: firstStartedAt,
    completedAt: new Date().toISOString(),
    passed: first.accepted,
  });
  if (first.accepted) {
    const secondStartedAt = new Date().toISOString();
    const second = await executeContext(activation.contexts[1]);
    results.push(second);
    phases.push({
      phase: "steady-two",
      schedulerMaximum: 2,
      effectiveParallelism: 1,
      shardIdsPlanned: ["sections"],
      shardIdsAttempted: ["sections"],
      startedAt: secondStartedAt,
      completedAt: new Date().toISOString(),
      passed: second.accepted,
    });
  }
  let merged = null;
  let mergedValidation = null;
  let mergedValidationMessage = null;
  if (results.length === 2 && results.every((result) => result.accepted)) {
    try {
      const [originalSchema, sourcePreparation] = await Promise.all([
        readFile(ORIGINAL_SCHEMA, "utf8").then(JSON.parse),
        readFile(SOURCE_PREPARATION, "utf8").then(JSON.parse),
      ]);
      const sourceContext = sourcePreparation.contexts.find(
        (context) => context.debateNumber === "137"
      );
      const [routesShard, sectionsShard, legacySchema, candidateTransport, candidateCensus] =
        await Promise.all([
          readFile(activation.contexts[0].output, "utf8").then(JSON.parse),
          readFile(activation.contexts[1].output, "utf8").then(JSON.parse),
          readFile(sourceContext.compilerSchema, "utf8").then(JSON.parse),
          readFile(sourceContext.fullCandidateTransport, "utf8").then(JSON.parse),
          readFile(sourceContext.candidateCensus, "utf8").then(JSON.parse),
        ]);
      merged = mergePlan(originalSchema, routesShard, sectionsShard);
      mergedValidation = validateCandidateShardedInventoryPlan({
        plan: merged,
        legacySchema,
        candidateTransport,
        candidateCensus,
      });
      assertV4(mergedValidation.status === "passed", "merged plan did not pass");
      await writeFile(MERGED_PLAN, jsonBytes(merged));
    } catch (error) {
      mergedValidationMessage = error.message;
      merged = null;
      mergedValidation = null;
    }
  }
  const passed =
    results.length === 2 &&
    results.every((result) => result.accepted) &&
    mergedValidation?.status === "passed" &&
    merged !== null;
  const execution = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-08-debate-137-inventory-plan-recovery-model-execution",
    protocolId: PROTOCOL_ID,
    status: passed
      ? EXECUTION_STATUS
      : "debate-137-inventory-plan-recovery-complete-with-failure",
    activation: ACTIVATION,
    activationSha256: sha256(activationBytes),
    gateStartedAt,
    gateCompletedAt: new Date().toISOString(),
    contextsPlanned: 2,
    contextsAttempted: results.length,
    contextsUnattempted: 2 - results.length,
    validContexts: results.filter((result) => result.accepted).length,
    invalidContexts: results.filter((result) => !result.accepted).length,
    attempts: results.length,
    retries: 0,
    timeoutExtensions: 0,
    recursiveCorrections: 0,
    schedulerRamp: [1, 2],
    maximumParallelContextsAllowed: 2,
    maximumParallelContextsObserved: 1,
    phases,
    results,
    merge: {
      attempted: results.length === 2 && results.every((result) => result.accepted),
      passed: mergedValidation?.status === "passed",
      mergeRuleCanonicalSha256: activation.mergeRuleCanonicalSha256,
      output: passed ? MERGED_PLAN : null,
      outputSha256: passed ? sha256(await readFile(MERGED_PLAN)) : null,
      canonicalSha256: passed
        ? candidateShardedInventoryPlanSha256(merged)
        : null,
      validation: mergedValidation,
      validationMessage: mergedValidationMessage,
    },
    wallElapsedMs: Date.now() - gateStarted,
    modelWorkElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0),
    authentication: "ChatGPT subscription",
    scoreBlind: true,
    directIncrementalCostUsd: 0,
    meteredApiCostUsd: 0,
    paidServiceCalls: 0,
    audioCalls: 0,
    scoresDerived: 0,
    productionMutations: 0,
    nextRequiredAction: passed
      ? "replay-complete-ten-plan-cohort-and-analyze"
      : "preserve-first-recovery-failure-for-separately-frozen-recursive-correction-diagnosis",
  };
  await writeFile(EXECUTION, jsonBytes(execution));
  console.log(
    JSON.stringify(
      {
        status: execution.status,
        contextsAttempted: execution.contextsAttempted,
        contextsUnattempted: execution.contextsUnattempted,
        validContexts: execution.validContexts,
        invalidContexts: execution.invalidContexts,
        mergedPlanPassed: execution.merge.passed,
        wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
        aggregateModelMinutes: Number(
          (execution.modelWorkElapsedMs / 60000).toFixed(2)
        ),
        retries: 0,
        timeoutExtensions: 0,
        directIncrementalCostUsd: 0,
        nextRequiredAction: execution.nextRequiredAction,
      },
      null,
      2
    )
  );
}

async function analyze() {
  const shouldWrite = process.argv.includes("--write");
  const { activation, activationBytes, preparation } = await loadActivation();
  const [executionBytes, originalExecutionBytes, originalPreparationBytes, sourcePreparationBytes] =
    await Promise.all([
      readFile(EXECUTION),
      readFile(ORIGINAL_EXECUTION),
      readFile(ORIGINAL_PREPARATION),
      readFile(SOURCE_PREPARATION),
    ]);
  const execution = JSON.parse(executionBytes);
  const originalExecution = JSON.parse(originalExecutionBytes);
  const originalPreparation = JSON.parse(originalPreparationBytes);
  const sourcePreparation = JSON.parse(sourcePreparationBytes);
  assertV4(
    execution.status === EXECUTION_STATUS &&
      execution.activationSha256 === sha256(activationBytes) &&
      execution.contextsAttempted === 2 &&
      execution.validContexts === 2 &&
      execution.invalidContexts === 0 &&
      execution.attempts === 2 &&
      execution.retries === 0 &&
      execution.timeoutExtensions === 0 &&
      execution.recursiveCorrections === 0 &&
      execution.results.every(
        (result) =>
          result.accepted === true &&
          result.attemptCount === 1 &&
          result.retryCount === 0 &&
          result.timedOut === false &&
          result.status === "completed-valid" &&
          result.outputWritten === true
      ) &&
      execution.merge.passed === true &&
      execution.directIncrementalCostUsd === 0 &&
      execution.meteredApiCostUsd === 0,
    "Debate 137 bounded recovery did not pass"
  );
  assertV4(
    originalExecution.status ===
      "post-canary-batch-08-candidate-census-plan-gate-complete-with-failure" &&
      originalExecution.validContexts === 9 &&
      originalExecution.invalidContexts === 1,
    "original planner execution evidence drifted"
  );
  const plans = [];
  for (const [contextIndex, context] of originalPreparation.contexts.entries()) {
    const sourceContext = sourcePreparation.contexts.find(
      (item) => item.debateNumber === context.debateNumber
    );
    const [planBytes, legacySchema, candidateTransport, candidateCensus] =
      await Promise.all([
        readFile(context.output),
        readFile(sourceContext.compilerSchema, "utf8").then(JSON.parse),
        readFile(sourceContext.fullCandidateTransport, "utf8").then(JSON.parse),
        readFile(sourceContext.candidateCensus, "utf8").then(JSON.parse),
      ]);
    if (context.debateNumber !== "137") {
      assertV4(
        sha256(planBytes) === preparation.protectedPlanHashes[context.output],
        `${context.debateNumber}: accepted plan changed during recovery`
      );
      const result = originalExecution.results.find(
        (item) => item.contextIndex === contextIndex
      );
      assertV4(
        result?.accepted === true && result.planSha256 === sha256(planBytes),
        `${context.debateNumber}: original accepted execution drifted`
      );
    } else {
      assertV4(
        sha256(planBytes) === execution.merge.outputSha256,
        "Debate 137 merged plan drifted"
      );
    }
    const plan = JSON.parse(planBytes);
    const validation = validateCandidateShardedInventoryPlan({
      plan,
      legacySchema,
      candidateTransport,
      candidateCensus,
    });
    const canonicalSha256 = candidateShardedInventoryPlanSha256(plan);
    assertV4(validation.status === "passed", `${context.debateNumber}: replay failed`);
    plans.push({
      contextIndex,
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
      provenance:
        context.debateNumber === "137"
          ? "bounded-first-recovery-two-field-disjoint-shards"
          : "original-accepted-planner-context",
      validated: true,
    });
  }
  assertV4(
    JSON.stringify(plans.map((plan) => plan.debateNumber)) ===
      JSON.stringify(DEBATES) &&
      plans.every(
        (plan) =>
          plan.routes === 2 &&
          JSON.stringify(plan.routeSides) === JSON.stringify(["con", "pro"]) &&
          plan.sections >= 4 &&
          plan.sections <= 6 &&
          plan.weightPercentTotal === 100
      ),
    "complete ten-plan cohort replay failed"
  );
  const recoveryAnalysis = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-08-debate-137-inventory-plan-recovery-analysis",
    protocolId: PROTOCOL_ID,
    status:
      "debate-137-bounded-first-recovery-passed-complete-ten-plan-cohort-replay-passed",
    activation: ACTIVATION,
    activationSha256: sha256(activationBytes),
    execution: EXECUTION,
    executionSha256: sha256(executionBytes),
    originalExecution: ORIGINAL_EXECUTION,
    originalExecutionSha256: sha256(originalExecutionBytes),
    shards: execution.results.map((result) => ({
      shardId: result.shardId,
      writableFields: result.writableFields,
      output: result.output,
      outputSha256: result.outputSha256,
      attemptCount: result.attemptCount,
      accepted: result.accepted,
    })),
    merge: structuredClone(execution.merge),
    cohortReplay: {
      debates: DEBATES,
      acceptedOriginalPlans: 9,
      recoveredPlans: 1,
      totalAcceptedPlans: 10,
      everyPlanPassedRepositoryValidator: true,
      everyCanonicalHashReplayed: true,
      nineOriginalAcceptedPlansByteIdentical: true,
    },
    recoveryControls: {
      boundedFirstRecoveryUsed: true,
      minimumFieldDisjointShardCount: 2,
      eachOriginalModelWritableFieldAcceptedExactlyOnce: true,
      originalFailedPartialOutputReused: false,
      retries: 0,
      timeoutExtensions: 0,
      recursiveCorrections: 0,
    },
    directIncrementalCostUsd: 0,
    meteredApiCostUsd: 0,
    paidServiceCalls: 0,
    nextAuthorizedAction:
      "prepare-freeze-and-activate-twenty-exact-batch-08-side-selector-packets-under-standing-authorization",
  };
  const recoveryAnalysisBytes = jsonBytes(recoveryAnalysis);
  const sourceHashes = {
    [SOURCE_PREPARATION]: sha256(sourcePreparationBytes),
    [ORIGINAL_PREPARATION]: sha256(originalPreparationBytes),
    [ORIGINAL_ACTIVATION]: sha256(await readFile(ORIGINAL_ACTIVATION)),
    [ORIGINAL_EXECUTION]: sha256(originalExecutionBytes),
    [PREPARATION]: sha256(await readFile(PREPARATION)),
    [ACTIVATION]: sha256(activationBytes),
    [EXECUTION]: sha256(executionBytes),
    [RECOVERY_ANALYSIS]: sha256(recoveryAnalysisBytes),
  };
  for (const plan of plans) sourceHashes[plan.output] = plan.outputSha256;
  for (const result of execution.results) sourceHashes[result.output] = result.outputSha256;
  const analysis = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-08-candidate-census-plan-analysis",
    protocolId: PROTOCOL_ID,
    status:
      "post-canary-batch-08-candidate-census-plan-gate-passed-standing-authorization-active-for-side-packet-preparation",
    productionContinuation: true,
    developmentValidationOnly: false,
    productionCanary: false,
    stagingOnly: true,
    AIOnly: true,
    activePolicy: structuredClone(activation.model.roundedIntegerScoreTiesPermitted
      ? JSON.parse(await readFile(ORIGINAL_ACTIVATION, "utf8")).activePolicy
      : null),
    sourceCompatibility: structuredClone(
      JSON.parse(await readFile(ORIGINAL_ACTIVATION, "utf8")).sourceCompatibility
    ),
    validatedInventoryContract: structuredClone(
      JSON.parse(await readFile(ORIGINAL_ACTIVATION, "utf8"))
        .validatedInventoryContract
    ),
    model: structuredClone(activation.model),
    originalActivation: ORIGINAL_ACTIVATION,
    originalExecution: ORIGINAL_EXECUTION,
    recoveryActivation: ACTIVATION,
    recoveryExecution: EXECUTION,
    recoveryAnalysis: RECOVERY_ANALYSIS,
    plans,
    audit: {
      exactPlanCount: plans.length,
      everyAcceptedContextOrShardSingleAttempt: true,
      everyPlanSchemaAndSemanticValidationPassed: true,
      everyPlanCanonicalHashReplayed: true,
      everyPlanHasOneRoutePerSide: true,
      everyPlanHasFourToSixSections: true,
      everyPlanWeightsTotalOneHundred: true,
      boundedFirstRecoveryUsed: true,
      recoveredDebate: "137",
      minimumFieldDisjointShardCount: 2,
      originalFailedPartialOutputReused: false,
      nineOriginalAcceptedPlansByteIdentical: true,
      sourceRowsInjectedOmittedOrRewritten: false,
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
      debates: 10,
      originalPlanContextsAttempted: 10,
      recoveryShardContextsAttempted: 2,
      acceptedPlans: 10,
      modelContextsExecuted: 12,
      retries: 0,
      timeoutExtensions: 0,
      recursiveCorrections: 0,
      paidServiceCalls: 0,
      audioCalls: 0,
      scoresDerived: 0,
      productionMutations: 0,
      directIncrementalCostUsd: 0,
      meteredApiCostUsd: 0,
    },
    authorization: {
      exactSidePacketPreparation: false,
      sideSelectorExecutionManifestPreparation: false,
      sideSelectorModelExecution: false,
      inventoryCompilation: false,
      retry: false,
      timeoutExtension: false,
      recursiveCorrection: false,
      independentJudgmentModelExecution: false,
      paidTranscription: false,
      audioVerification: false,
      adjudicationModelExecution: false,
      scoreDerivation: false,
      publicationModelExecution: false,
      productionMutation: false,
      nextBatchSelection: false,
    },
    nextAuthorizedAction:
      "prepare-freeze-and-activate-twenty-exact-batch-08-side-selector-packets-under-standing-authorization",
  };
  if (shouldWrite) {
    assertV4(!(await exists(RECOVERY_ANALYSIS)), `${RECOVERY_ANALYSIS} already exists`);
    assertV4(!(await exists(COHORT_ANALYSIS)), `${COHORT_ANALYSIS} already exists`);
    await writeFile(RECOVERY_ANALYSIS, recoveryAnalysisBytes);
    await writeFile(COHORT_ANALYSIS, jsonBytes(analysis));
  }
  console.log(
    JSON.stringify(
      {
        status: shouldWrite ? analysis.status : "preview",
        acceptedOriginalPlans: 9,
        recoveredPlans: 1,
        acceptedPlans: 10,
        completeCohortReplayPassed: true,
        originalFailedPartialOutputReused: false,
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
  if (!(await exists(ACTIVATION))) {
    await preflight();
    return;
  }
  const { activation, activationBytes } = await loadActivation();
  if (!(await exists(EXECUTION))) {
    for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
      assertV4(!(await exists(future)), `unexpected future output exists: ${future}`);
    }
    console.log(
      JSON.stringify(
        {
          status: "passed-debate-137-recovery-activation-awaiting-model-execution",
          contexts: 2,
          shards: SHARDS,
          model: activation.model,
          attemptsPerContext: 1,
          directIncrementalCostUsdMaximum: 0,
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
      execution.contextsPlanned === 2 &&
      execution.contextsAttempted >= 1 &&
      execution.contextsAttempted <= 2 &&
      execution.contextsUnattempted === 2 - execution.contextsAttempted &&
      execution.attempts === execution.contextsAttempted &&
      execution.retries === 0 &&
      execution.timeoutExtensions === 0 &&
      execution.recursiveCorrections === 0 &&
      execution.maximumParallelContextsObserved === 1 &&
      execution.authentication === "ChatGPT subscription" &&
      execution.scoreBlind === true &&
      execution.directIncrementalCostUsd === 0 &&
      execution.meteredApiCostUsd === 0 &&
      execution.paidServiceCalls === 0 &&
      execution.audioCalls === 0 &&
      execution.scoresDerived === 0 &&
      execution.productionMutations === 0,
    "recovery execution controls drifted"
  );
  for (const result of execution.results) {
    assertV4(
      result.model === "5.6 Sol" &&
        result.modelSlug === "gpt-5.6-sol" &&
        result.reasoningEffort === "low" &&
        result.authentication === "ChatGPT subscription" &&
        result.attemptCount === 1 &&
        result.retryCount === 0 &&
        result.apiKeysRemoved === true &&
        result.scoreBlind === true &&
        result.isolatedTemporaryCodexHome === true &&
        result.otherShardOutputUnavailable === true &&
        result.originalFailedPartialOutputUnavailable === true &&
        result.exactCopiedInputFiles === 5 &&
        result.meteredApiCostUsd === 0 &&
        result.transcriptionCostUsd === 0,
      `${result.shardId}: recovery result controls drifted`
    );
    if (result.outputWritten) {
      assertV4(
        sha256(await readFile(result.output)) === result.outputSha256,
        `${result.shardId}: output drifted`
      );
    }
  }
  if (execution.status !== EXECUTION_STATUS) {
    assertV4(
      execution.invalidContexts >= 1 &&
        !(await exists(RECOVERY_ANALYSIS)) &&
        !(await exists(COHORT_ANALYSIS)),
      "failed bounded recovery must stop without analysis"
    );
    console.log(
      JSON.stringify(
        {
          status: "passed-recorded-failed-debate-137-bounded-recovery",
          contextsAttempted: execution.contextsAttempted,
          invalidContexts: execution.invalidContexts,
          recursiveCorrectionEligibleUnderStandingAuthorization: true,
          retries: 0,
          timeoutExtensions: 0,
          directIncrementalCostUsd: 0,
        },
        null,
        2
      )
    );
    return;
  }
  assertV4(
    execution.contextsAttempted === 2 &&
      execution.validContexts === 2 &&
      execution.invalidContexts === 0 &&
      execution.results.every((result) => result.accepted) &&
      execution.merge.passed === true &&
      sha256(await readFile(MERGED_PLAN)) === execution.merge.outputSha256,
    "passing Debate 137 recovery record drifted"
  );
  if (!(await exists(COHORT_ANALYSIS))) {
    assertV4(!(await exists(RECOVERY_ANALYSIS)), "partial analysis state exists");
    console.log(
      JSON.stringify(
        {
          status: "passed-debate-137-recovery-awaiting-cohort-analysis",
          contexts: 2,
          mergedPlanPassed: true,
          retries: 0,
          timeoutExtensions: 0,
          directIncrementalCostUsd: 0,
        },
        null,
        2
      )
    );
    return;
  }
  const analysis = JSON.parse(await readFile(COHORT_ANALYSIS, "utf8"));
  const recoveryAnalysis = JSON.parse(await readFile(RECOVERY_ANALYSIS, "utf8"));
  assertV4(
    analysis.status ===
      "post-canary-batch-08-candidate-census-plan-gate-passed-standing-authorization-active-for-side-packet-preparation" &&
      analysis.plans.length === 10 &&
      analysis.audit.everyPlanSchemaAndSemanticValidationPassed === true &&
      analysis.audit.everyPlanCanonicalHashReplayed === true &&
      analysis.audit.nineOriginalAcceptedPlansByteIdentical === true &&
      analysis.audit.originalFailedPartialOutputReused === false &&
      analysis.totals.acceptedPlans === 10 &&
      analysis.totals.recoveryShardContextsAttempted === 2 &&
      analysis.totals.retries === 0 &&
      analysis.totals.timeoutExtensions === 0 &&
      analysis.totals.directIncrementalCostUsd === 0 &&
      recoveryAnalysis.status ===
        "debate-137-bounded-first-recovery-passed-complete-ten-plan-cohort-replay-passed",
    "complete recovered cohort analysis drifted"
  );
  for (const [file, digest] of Object.entries(analysis.sourceHashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: analysis source drifted`);
  }
  console.log(
    JSON.stringify(
      {
        status: "passed-debate-137-recovery-and-complete-ten-plan-cohort-replay",
        acceptedPlans: 10,
        recoveredDebate: "137",
        recoveryShards: 2,
        originalFailedPartialOutputReused: false,
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

const command = process.argv[2];
if (command === "preflight") await preflight();
else if (command === "activate") await activate();
else if (command === "run") await execute();
else if (command === "analyze") await analyze();
else if (command === "validate") await validate();
else throw new Error("usage: ... preflight|activate|run|analyze|validate");
