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
import { composeV222CandidateCensusPlan } from "./lib/assessment-production-score-stability-v2.2.2-route-section-plan.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const preflightOnly = process.argv.includes("--preflight-only");
const ROOT =
  "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor";
const ACTIVATION = `${ROOT}/section-execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

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

const activationBytes = await readFile(ACTIVATION);
const activation = JSON.parse(activationBytes);
assertV4(
  activation.status ===
      "frozen-ten-v2.2.2-section-contexts-authorized" &&
    activation.developmentValidationOnly === true &&
    activation.productionCanary === false &&
    activation.stagingOnly === true &&
    activation.model?.label === "5.6 Sol" &&
    activation.model?.slug === "gpt-5.6-sol" &&
    activation.model?.reasoningEffort === "low" &&
    activation.model?.authentication === "ChatGPT subscription" &&
    activation.model?.scoreBlind === true &&
    activation.authorization?.sectionModelContexts === true &&
    activation.authorization?.deterministicSectionValidation === true &&
    activation.authorization?.planComposition === true &&
    activation.authorization?.retry === false &&
    activation.authorization?.timeoutExtension === false &&
    activation.authorization?.semanticCorrection === false &&
    activation.authorization?.independentJudgmentModelExecution === false &&
    activation.authorization?.scoreDerivation === false &&
    activation.authorization?.productionMutation === false &&
    activation.failedGateDisposition?.v221PlanningGatePreservedFailed ===
      true &&
    activation.failedGateDisposition
      ?.v221ValidPartialPlansReusableForSuccessorAcceptance === false &&
    activation.failedGateDisposition?.v221Debate75Retried === false &&
    activation.failedGateDisposition?.v221TimeoutExtended === false &&
    activation.failedGateDisposition?.v221ExecutionReclassified === false &&
    activation.executionPolicy?.contexts === 10 &&
    activation.executionPolicy?.attemptsPerContext === 1 &&
    activation.executionPolicy?.retriesMaximum === 0 &&
    activation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    activation.executionPolicy?.maximumParallelContexts === 2 &&
    JSON.stringify(activation.executionPolicy?.schedulerRamp) ===
      JSON.stringify([1, 2]) &&
    activation.executionPolicy
      ?.abortBeforeStartingAdditionalContextOnAnyFailure === true &&
    activation.executionPolicy?.immutableRouteHashRequired === true &&
    activation.executionPolicy?.allTenSectionsMustPassBeforePlanComposition ===
      true,
  "v2.2.2 section execution is unauthorized"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}
const [preparationBytes, sourcePreparationBytes] = await Promise.all([
  readFile(activation.preparationManifest),
  readFile(activation.sourcePreparation),
]);
assertV4(
  sha256(preparationBytes) === activation.preparationManifestSha256 &&
    sha256(sourcePreparationBytes) === activation.sourcePreparationSha256,
  "frozen section preparation hash drifted"
);
const preparation = JSON.parse(preparationBytes);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
assertV4(
  preparation.contexts?.length === 10 &&
    sourcePreparation.contexts?.length === 10,
  "frozen section context count drifted"
);
for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output already exists: ${future}`);
}

const codex = activation.executionEnvironment.codexPath;
assertV4(
  execFileSync(codex, ["--version"], { encoding: "utf8" }).trim() ===
    activation.executionEnvironment.codexCliVersion,
  "frozen Codex CLI version changed"
);
await access(codex);

if (preflightOnly) {
  console.log(
    JSON.stringify(
      {
        status: "passed-model-free-preflight",
        contexts: preparation.contexts.length,
        model: activation.model,
        maximumParallelContexts:
          activation.executionPolicy.maximumParallelContexts,
        schedulerRamp: activation.executionPolicy.schedulerRamp,
        attemptsPerContext: 1,
        retriesMaximum: 0,
        timeoutExtensionsMaximum: 0,
        modelContextsExecuted: 0,
        scoresDerived: 0,
      },
      null,
      2
    )
  );
  process.exit(0);
}

const authSource = path.join(os.homedir(), ".codex", "auth.json");
await access(authSource);

let activeContexts = 0;
let maximumParallelContextsObserved = 0;
const gateStartedAt = new Date().toISOString();
const gateStarted = Date.now();
const gateDeadline =
  gateStarted + activation.executionPolicy.absoluteStageTimeoutMs;

async function executeContext(context, contextIndex) {
  const prepared = sourcePreparation.contexts.find(
    (item) => item.debateNumber === context.debateNumber
  );
  assertV4(
    prepared &&
      prepared.debateId === context.debateId &&
      prepared.sectionPacket === context.packet &&
      prepared.sectionOutput === context.output &&
      prepared.routeOutput === context.immutableRouteOutput,
    `${context.debateNumber}: prepared context identity drifted`
  );
  const packetBytes = await readFile(context.packet);
  assertV4(
    sha256(packetBytes) === context.packetSha256,
    `${context.debateNumber}: section packet drifted`
  );
  const packet = JSON.parse(packetBytes);
  let copiedInputBytes = 0;
  for (const input of packet.copiedInputs) {
    const bytes = await readFile(input.path);
    assertV4(
      sha256(bytes) === input.sha256 && bytes.length === input.bytes,
      `${context.debateNumber}/${input.role}: model input drifted`
    );
    copiedInputBytes += bytes.length;
  }
  assertV4(
    copiedInputBytes === context.copiedInputBytes &&
      copiedInputBytes <= activation.executionPolicy.copiedInputBytesMaximum &&
      packet.inventoryRoutesSha256 === context.inventoryRoutesSha256,
    `${context.debateNumber}: copied input or route boundary drifted`
  );

  const remainingStageMs = gateDeadline - Date.now();
  assertV4(
    remainingStageMs > 0,
    "absolute section stage timeout reached before launch"
  );
  const contextTimeoutMs = Math.min(
    activation.executionPolicy.timeoutMsPerContext,
    remainingStageMs
  );
  const sourceDirectory = await mkdtemp(
    path.join(os.tmpdir(), `slugfester-v222-section-${context.debateNumber}-`)
  );
  const isolatedCodexHome = await mkdtemp(
    path.join(
      os.tmpdir(),
      `slugfester-v222-section-home-${context.debateNumber}-`
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
      "chronology-fallback-inventory-guide": "chronology-fallback-inventory-guide.md",
      "inventory-manual": "inventory-manual.md",
      "route-section-plan-guide": "route-section-plan-guide.md",
      "immutable-inventory-routes": "immutable-routes.json",
      "strict-section-output-schema": "section-schema.json",
    };
    assertV4(
      packet.copiedInputs.every((input) => targetByRole[input.role]),
      `${context.debateNumber}: unexpected copied-input role`
    );
    for (const input of packet.copiedInputs) {
      await copyFile(input.path, path.join(sourceDirectory, targetByRole[input.role]));
    }
    await copyFile(authSource, path.join(isolatedCodexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: isolatedCodexHome };
    for (const key of activation.executionPolicy.removedEnvironmentVariables) {
      delete env[key];
    }
    const prompt = `Read inventory-source-packet.json, candidate-census.json, chronology-fallback-inventory-guide.md, inventory-manual.md, route-section-plan-guide.md, immutable-routes.json, and section-schema.json completely; read nothing else. Act only as the isolated score-blind inventory section planner for fresh v2.2.2 staging-validation Debate ${context.debateNumber}. Treat immutable-routes.json as fixed and preserve its canonical hash. Review every candidate in the complete census. Author only four to six weighted inventory sections and their candidate-ID scopes. Routes, candidate selection, evidence excerpts, ratings, response topology, scores, winners, legacy assessments, other debates, prior outputs, execution metadata, tags, Overall Commentary, AI Extension, and publication prose are prohibited. Return exactly one section-schema-conforming JSON object.`;
    process.stdout.write(
      `[v2.2.2-section] starting ${activation.model.label}/${activation.model.reasoningEffort} Debate ${context.debateNumber}\n`
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
        "section-schema.json",
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
      stage: "inventory-sections",
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
      copiedInputBytes,
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
        sectionOutputWritten: false,
        stdoutTail: invocation.stdout.slice(-12000),
        stderrTail: invocation.stderr.slice(-12000),
      };
    } else {
      const resultBytes = await readFile(resultPath);
      await mkdir(path.dirname(context.output), { recursive: true });
      await copyFile(resultPath, context.output);
      let validationSummary = null;
      let canonicalSha256 = null;
      let validationMessage = null;
      let sectionCount = null;
      try {
        const [sectionOutput, routeOutput, legacySchema, candidateTransport, candidateCensus] =
          await Promise.all([
            Promise.resolve(JSON.parse(resultBytes)),
            readFile(context.immutableRouteOutput, "utf8").then(JSON.parse),
            readFile(prepared.sourceContext.compilerSchema, "utf8").then(JSON.parse),
            readFile(prepared.sourceContext.fullCandidateTransport, "utf8").then(JSON.parse),
            readFile(prepared.sourceContext.candidateCensus, "utf8").then(JSON.parse),
          ]);
        const composedPlan = composeV222CandidateCensusPlan(
          routeOutput,
          sectionOutput
        );
        validationSummary = validateCandidateShardedInventoryPlan({
          plan: composedPlan,
          legacySchema,
          candidateTransport,
          candidateCensus,
        });
        canonicalSha256 = candidateShardedInventoryPlanSha256(composedPlan);
        sectionCount = sectionOutput.sections.length;
      } catch (error) {
        validationMessage = error.message;
      }
      const valid = validationSummary?.status === "passed";
      record = {
        ...base,
        status: valid ? "completed-valid" : "output-validation-failed",
        accepted: valid,
        sectionOutputWritten: true,
        sectionSha256: sha256(resultBytes),
        inventoryRoutesSha256: context.inventoryRoutesSha256,
        composedPlanCanonicalSha256: valid ? canonicalSha256 : null,
        sectionCount,
        validationSummary,
        validationMessage,
        stdoutTail: valid ? null : invocation.stdout.slice(-12000),
        stderrTail: valid ? null : invocation.stderr.slice(-12000),
      };
    }
  } catch (error) {
    record = {
      stage: "inventory-sections",
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
      copiedInputBytes,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      status: "runner-failed",
      accepted: false,
      sectionOutputWritten: false,
      failureMessage: error.message,
    };
  } finally {
    activeContexts -= 1;
    await rm(sourceDirectory, { recursive: true, force: true });
    await rm(isolatedCodexHome, { recursive: true, force: true });
  }
  process.stdout.write(
    `[v2.2.2-section] Debate ${context.debateNumber} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`
  );
  return record;
}

const resultsByIndex = new Array(preparation.contexts.length);
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
    Array.from(
      { length: preparation.contexts.length - 1 },
      (_, index) => index + 1
    ),
    2,
    "steady-two"
  );
}

const results = resultsByIndex.filter(Boolean);
const validContexts = results.filter((result) => result.accepted).length;
const execution = {
  schemaVersion: "1.0-score-stability-v2.2.2-section-model-execution",
  protocolId: activation.protocolId,
  status:
    validContexts === preparation.contexts.length
      ? "ten-v2.2.2-section-contexts-passed"
      : "v2.2.2-section-gate-complete-with-failure",
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  activation: ACTIVATION,
  activationSha256: sha256(activationBytes),
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
  parallelismMaximumAllowed:
    activation.executionPolicy.maximumParallelContexts,
  maximumParallelContextsObserved,
  schedulerRamp: activation.executionPolicy.schedulerRamp,
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
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
  predecessorV212InventoryGateReclassified: false,
  predecessorV22DiscoveryGateReclassified: false,
  predecessorV213ScoreGateReclassified: false,
  predecessorV221PlanningGateReclassified: false,
  proposedPolicyPromoted: false,
  scoresDerived: 0,
  authorization: {
    deterministicPlanAnalysis:
      validContexts === preparation.contexts.length,
    persistentPlanComposition:
      validContexts === preparation.contexts.length,
    exactSidePacketPreparation: false,
    sideSelectorModelExecution: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    independentJudgmentModelExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    productionMutation: false,
  },
  nextRequiredAction:
    validContexts === preparation.contexts.length
      ? "analyze-replay-and-compose-ten-v2.2.2-plans-model-free-only"
      : "stop-preserve-failed-v2.2.2-section-gate",
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
      nextRequiredAction: execution.nextRequiredAction,
    },
    null,
    2
  )
);
