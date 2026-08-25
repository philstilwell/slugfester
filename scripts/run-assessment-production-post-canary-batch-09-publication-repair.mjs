#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  POST_CANARY_BATCH_09_DEBATE_170_REPAIR_ROOT,
  validateDebate170RepairOutput
} from "./lib/assessment-production-post-canary-batch-09-publication-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = POST_CANARY_BATCH_09_DEBATE_170_REPAIR_ROOT;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const activation = JSON.parse(await readFile(path.resolve(ACTIVATION), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(() => true, () => false);

assertV4(
  activation.status ===
      "frozen-seven-isolated-fourteen-field-batch-09-debate-170-publication-repair-contexts-authorized" &&
    activation.productionCanary === false &&
    activation.batchNumber === 9 &&
    activation.contexts?.length === 7 &&
    activation.authorization?.repairModelContexts === true &&
    activation.authorization?.repairModelExecution === true &&
    activation.authorization?.deterministicRepairOutputValidation === true &&
    activation.authorization?.deterministicMergeAndCompleteValidation === true &&
    activation.authorization?.deterministicAnalysis === true &&
    activation.authorization?.retry === false &&
    activation.authorization?.timeoutExtension === false &&
    activation.authorization?.recursiveCorrectionModelExecution === false &&
    activation.authorization?.remainingNineContextExecution === false &&
    activation.authorization?.paidServices === false &&
    activation.authorization?.publicationFinalization === false &&
    activation.authorization?.productionMutation === false &&
    activation.authorization?.nextBatchSelection === false,
  "the Debate 170 repair execution is not authorized"
);
assertV4(
  activation.model?.label === "5.6 Sol" &&
    activation.model?.slug === "gpt-5.6-sol" &&
    activation.model?.reasoningEffort === "low" &&
    activation.model?.authentication === "ChatGPT subscription" &&
    activation.executionPolicy?.attemptsPerContext === 1 &&
    activation.executionPolicy?.retriesMaximum === 0 &&
    activation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    activation.executionPolicy?.recursiveCorrectionContextsMaximum === 0 &&
    activation.executionPolicy?.maximumParallelContexts === 2 &&
    JSON.stringify(activation.executionPolicy?.schedulerRamp) ===
      JSON.stringify([1, 2]) &&
    activation.executionPolicy?.authentication === "ChatGPT subscription" &&
    activation.executionPolicy?.APIKeysRemoved === true,
  "the Debate 170 repair execution controls changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `repair source hash mismatch: ${file}`
  );
}
for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future repair output exists: ${future}`);
}

const codex = activation.executionEnvironment.codexPath;
const authSource = path.join(os.homedir(), ".codex", "auth.json");
await access(codex);
await access(authSource);

function invoke(args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(codex, args, {
      ...options,
      stdio: ["ignore", "pipe", "pipe"]
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
    child.on("error", (error) => {
      clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      resolve({ code: null, signal: null, stdout, stderr, timedOut, error });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      resolve({ code, signal, stdout, stderr, timedOut, error: null });
    });
  });
}

let activeContexts = 0;
let maximumObservedConcurrency = 0;

async function runContext(context) {
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), `batch-09-debate-170-repair-${context.contextIndex}-`)
  );
  const codexHome = await mkdtemp(
    path.join(os.tmpdir(), `batch-09-debate-170-repair-home-${context.contextIndex}-`)
  );
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let record;
  activeContexts += 1;
  maximumObservedConcurrency = Math.max(maximumObservedConcurrency, activeContexts);
  try {
    const copies = [
      [activation.modelInputs.productionWorkflow, "production-workflow.md"],
      [activation.modelInputs.readinessWorkflow, "readiness-workflow.md"],
      [activation.modelInputs.outputContract, "output-contract.md"],
      [activation.modelInputs.manual, "repair-manual.md"],
      [context.packet, "packet.json"],
      [context.schema, "schema.json"]
    ];
    for (const [source, target] of copies) {
      await copyFile(path.resolve(source), path.join(temporary, target));
    }
    await copyFile(authSource, path.join(codexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: codexHome };
    for (const key of activation.executionPolicy.removedEnvironmentVariables) {
      delete env[key];
    }
    const prompt = [
      "Read production-workflow.md, readiness-workflow.md, output-contract.md, repair-manual.md, packet.json, and schema.json completely and no other files.",
      `Act only as isolated Debate 170 two-field publication repair editor ${context.contextIndex}.`,
      "Rewrite exactly the two correctedCritiques entries named by the schema, preserving the supplied adjudicated substance and locked score band.",
      "For each critique, write exactly four complete ordered labeled sentences, target 112–118 words, remain within 105–130 words, preferably exceed 900 characters and never fall below 880 characters, and end every sentence with terminal punctuation.",
      "Participant judgment was score-blind and is closed. All scores remain repository-owned and immutable. Do not infer, emit, recalculate, or suggest changing a score.",
      "Do not emit any tag, quote, commentary, AI Extension, other move, other repair packet, other debate, or unlisted field. Use no CJK, Hangul, Kana, replacement characters, or prohibited rational-invulnerability language.",
      "Return exactly one schema-conforming JSON object and nothing else."
    ].join(" ");
    process.stdout.write(
      `[batch-09-debate-170-publication-repair] starting index ${context.contextIndex} ${activation.model.label}/${activation.model.reasoningEffort}\n`
    );
    const invocation = await invoke(
      [
        "exec",
        "--ephemeral",
        "--skip-git-repo-check",
        "--ignore-user-config",
        "--ignore-rules",
        "--model",
        activation.model.slug,
        "-c",
        `model_reasoning_effort=\"${activation.model.reasoningEffort}\"`,
        "--disable", "plugins",
        "--disable", "remote_plugin",
        "--disable", "skill_search",
        "--disable", "apps",
        "--disable", "memories",
        "--disable", "multi_agent",
        "--disable", "browser_use",
        "--disable", "computer_use",
        "--disable", "workspace_dependencies",
        "--sandbox", "read-only",
        "--output-schema", "schema.json",
        "--output-last-message", "result.json",
        prompt
      ],
      { cwd: temporary, env },
      activation.executionPolicy.timeoutMsPerContext
    );
    const resultPath = path.join(temporary, "result.json");
    const resultExists = await exists(resultPath);
    const base = {
      contextIndex: context.contextIndex,
      packetIndex: context.packetIndex,
      debateNumber: "170",
      debateId: context.debateId,
      model: activation.model.label,
      reasoningEffort: activation.model.reasoningEffort,
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensionCount: 0,
      recursiveCorrectionContextCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      timedOut: invocation.timedOut,
      commandExitCode: invocation.code,
      terminationSignal: invocation.signal,
      authentication: "ChatGPT subscription",
      apiKeysRemoved: true,
      isolatedTemporaryCodexHome: true,
      isolatedTemporaryWorkingDirectory: true,
      participantJudgmentWasScoreBlind: true,
      scoresImmutable: true,
      writableFields: context.writableFields,
      copiedInputBytes: context.copiedInputBytes,
      meteredApiCostUsd: 0,
      paidServiceCallsThisStage: 0,
      modelAuthoredScores: 0,
      scorePassesExecutedThisStage: 0,
      stdoutSha256: sha256(invocation.stdout),
      stderrSha256: sha256(invocation.stderr)
    };
    if (
      invocation.error ||
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
        gateAcceptancePassed: false,
        outputWritten: false,
        failureMessage: `${invocation.error?.stack ?? ""}\n${invocation.stdout}\n${invocation.stderr}`
          .trim()
          .slice(-10000)
      };
    } else {
      const resultBytes = await readFile(resultPath);
      await mkdir(path.dirname(path.resolve(context.repairOutput)), {
        recursive: true
      });
      await writeFile(path.resolve(context.repairOutput), resultBytes);
      let validationSummary = null;
      let validationMessage = null;
      try {
        validationSummary = validateDebate170RepairOutput(
          JSON.parse(resultBytes),
          JSON.parse(await readFile(path.resolve(context.packet), "utf8"))
        );
      } catch (error) {
        validationMessage = (error.stack ?? error.message).slice(-10000);
      }
      const accepted = validationSummary?.status === "passed";
      const validation = {
        schemaVersion:
          "1.0-assessment-production-post-canary-batch-09-debate-170-publication-repair-validation",
        protocolId: activation.protocolId,
        status: accepted ? "passed" : "failed",
        debateNumber: "170",
        packetIndex: context.packetIndex,
        repairOutputSha256: sha256(resultBytes),
        validationSummary,
        validationMessage,
        modelAuthoredScores: 0
      };
      const provenance = {
        schemaVersion:
          "1.0-assessment-production-post-canary-batch-09-debate-170-publication-repair-provenance",
        protocolId: activation.protocolId,
        debateNumber: "170",
        packetIndex: context.packetIndex,
        model: activation.model,
        authentication: "ChatGPT subscription",
        reasoningEffort: "low",
        attemptCount: 1,
        retryCount: 0,
        timeoutExtensionCount: 0,
        recursiveCorrectionContextCount: 0,
        apiKeysRemoved: true,
        participantJudgmentWasScoreBlind: true,
        scoresImmutable: true,
        writableFields: context.writableFields,
        copiedInputs: Object.fromEntries(
          copies.map(([source, target]) => [
            target,
            { source, sha256: activation.sourceHashes[source] }
          ])
        ),
        repairOutputSha256: sha256(resultBytes),
        modelAuthoredScores: 0,
        meteredApiCostUsd: 0,
        paidServiceCallsThisStage: 0
      };
      await mkdir(path.dirname(path.resolve(context.validation)), {
        recursive: true
      });
      await mkdir(path.dirname(path.resolve(context.provenance)), {
        recursive: true
      });
      await writeFile(
        path.resolve(context.validation),
        `${JSON.stringify(validation, null, 2)}\n`
      );
      await writeFile(
        path.resolve(context.provenance),
        `${JSON.stringify(provenance, null, 2)}\n`
      );
      record = {
        ...base,
        status: accepted ? "completed-valid" : "output-validation-failed",
        gateAcceptancePassed: accepted,
        outputWritten: true,
        repairOutputSha256: sha256(resultBytes),
        validationWritten: true,
        provenanceWritten: true,
        validationSummary,
        validationMessage
      };
    }
  } catch (error) {
    record = {
      contextIndex: context.contextIndex,
      packetIndex: context.packetIndex,
      debateNumber: "170",
      debateId: context.debateId,
      model: "5.6 Sol",
      reasoningEffort: "low",
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensionCount: 0,
      recursiveCorrectionContextCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      authentication: "ChatGPT subscription",
      apiKeysRemoved: true,
      participantJudgmentWasScoreBlind: true,
      scoresImmutable: true,
      writableFields: context.writableFields,
      meteredApiCostUsd: 0,
      paidServiceCallsThisStage: 0,
      modelAuthoredScores: 0,
      status: "runner-error",
      gateAcceptancePassed: false,
      outputWritten: await exists(context.repairOutput),
      failureMessage: (error.stack ?? String(error)).slice(-10000)
    };
  } finally {
    activeContexts -= 1;
    await rm(temporary, { recursive: true, force: true });
    await rm(codexHome, { recursive: true, force: true });
  }
  return record;
}

async function runPool(contexts, maximumConcurrency) {
  const results = [];
  let next = 0;
  async function worker() {
    while (next < contexts.length) {
      const index = next;
      next += 1;
      results[index] = await runContext(contexts[index]);
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(maximumConcurrency, contexts.length) },
      () => worker()
    )
  );
  return results;
}

const gateStartedAt = new Date().toISOString();
const gateStarted = Date.now();
const results = [];
const phaseRecords = [];
let priorRampPassed = true;
for (const phase of activation.executionPolicy.rampPhases) {
  if (!priorRampPassed) {
    phaseRecords.push({
      ...phase,
      attemptedContextIndexes: [],
      validContextIndexes: [],
      passed: false,
      skippedBecausePriorRampFailed: true
    });
    continue;
  }
  const phaseContexts = phase.contextIndexes.map(
    (contextIndex) => activation.contexts[contextIndex]
  );
  const phaseResults = await runPool(
    phaseContexts,
    phase.maximumParallelContexts
  );
  results.push(...phaseResults);
  const allValid = phaseResults.every((result) => result.gateAcceptancePassed);
  phaseRecords.push({
    ...phase,
    attemptedContextIndexes: phaseResults.map((result) => result.contextIndex),
    validContextIndexes: phaseResults
      .filter((result) => result.gateAcceptancePassed)
      .map((result) => result.contextIndex),
    passed: allValid,
    skippedBecausePriorRampFailed: false
  });
  if (phase.expansionRequiresAllValid && !allValid) {
    priorRampPassed = false;
  }
}
results.sort((left, right) => left.contextIndex - right.contextIndex);
const attempted = new Set(results.map((result) => result.contextIndex));
const unattemptedContextIndexes = activation.contexts
  .map((context) => context.contextIndex)
  .filter((contextIndex) => !attempted.has(contextIndex));
const validContexts = results.filter((result) => result.gateAcceptancePassed).length;
const wallElapsedMs = Date.now() - gateStarted;
const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-debate-170-publication-repair-model-execution",
  protocolId: activation.protocolId,
  status:
    validContexts === 7
      ? "batch-09-debate-170-seven-context-publication-repair-gate-passed"
      : "batch-09-debate-170-publication-repair-gate-complete-with-failure",
  gateStartedAt,
  gateCompletedAt: new Date().toISOString(),
  contextsPlanned: 7,
  contextsAttempted: results.length,
  contextsUnattempted: unattemptedContextIndexes.length,
  unattemptedContextIndexes,
  validContexts,
  invalidContexts: results.length - validContexts,
  attempts: results.length,
  retries: 0,
  timeoutExtensions: 0,
  recursiveCorrectionContexts: 0,
  maximumObservedConcurrency,
  schedulerRamp: [1, 2],
  wallElapsedMs,
  aggregateModelElapsedMs: results.reduce(
    (sum, result) => sum + result.elapsedMs,
    0
  ),
  rampPhases: phaseRecords,
  results,
  originalFailedOutputPreserved: true,
  participantJudgmentWasScoreBlind: true,
  scoresImmutable: true,
  meteredApiCostUsd: 0,
  paidServiceCallsThisStage: 0,
  modelAuthoredScores: 0,
  scorePassesExecutedThisStage: 0,
  authorization: {
    deterministicAnalysis: true,
    deterministicMergeAndCompleteValidation: validContexts === 7,
    retry: false,
    timeoutExtension: false,
    recursiveCorrectionModelExecution: false,
    remainingNineContextExecution: false,
    publicationFinalization: false,
    productionMutation: false,
    nextBatchSelection: false
  }
};
await writeFile(
  path.resolve(activation.artifacts.execution),
  `${JSON.stringify(execution, null, 2)}\n`
);
console.log(JSON.stringify({
  status: execution.status,
  contextsAttempted: execution.contextsAttempted,
  contextsUnattempted: execution.contextsUnattempted,
  validContexts,
  invalidContexts: execution.invalidContexts,
  elapsedMinutes: Number((wallElapsedMs / 60000).toFixed(2)),
  attempts: execution.attempts,
  retries: 0,
  timeoutExtensions: 0,
  recursiveCorrectionContexts: 0,
  meteredApiCostUsd: 0,
  paidServiceCalls: 0,
  modelAuthoredScores: 0
}, null, 2));
