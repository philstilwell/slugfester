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
  POST_CANARY_BATCH_14_PUBLICATION_ROOT
} from "./lib/assessment-production-post-canary-batch-14-publication.mjs";
import {
  validatePostCanaryBatch14PublicationOutput
} from "./lib/assessment-production-post-canary-batch-14-publication-validation.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = POST_CANARY_BATCH_14_PUBLICATION_ROOT;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const activation = JSON.parse(await readFile(path.resolve(ACTIVATION), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(() => true, () => false);

assertV4(
  activation.status ===
      "frozen-ten-post-canary-batch-14-publication-contexts-authorized" &&
    activation.productionCanary === false &&
    activation.batchNumber === 14 &&
    activation.authorization?.modelContexts === true &&
    activation.authorization?.publicationModelExecution === true &&
    activation.authorization?.deterministicOutputValidation === true &&
    activation.authorization?.deterministicAnalysis === true &&
    activation.authorization?.retry === false &&
    activation.authorization?.timeoutExtension === false &&
    activation.authorization?.repairPacketPreparation === false &&
    activation.authorization?.correctionModelExecution === false &&
    activation.authorization?.publicationFinalization === false &&
    activation.authorization?.productionMutation === false &&
    activation.authorization?.nextBatchSelection === false,
  "Batch 14 publication execution is not authorized"
);
assertV4(
  activation.executionPolicy?.attemptsPerContext === 1 &&
    activation.executionPolicy?.retriesMaximum === 0 &&
    activation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    activation.executionPolicy?.correctionContextsMaximum === 0 &&
    activation.executionPolicy?.maximumParallelContexts === 2 &&
    JSON.stringify(activation.executionPolicy?.schedulerRamp) ===
      JSON.stringify([1, 2]) &&
    activation.executionPolicy?.authentication === "ChatGPT subscription" &&
    activation.executionPolicy?.APIKeysRemoved === true,
  "Batch 14 publication execution controls changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `source hash mismatch: ${file}`
  );
}
for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output exists: ${future}`);
}

const codex = activation.executionEnvironment.codexPath;
const authSource = path.join(os.homedir(), ".codex", "auth.json");
await access(codex);
await access(authSource);

function invoke(args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(codex, args, {
      ...options,
      detached: true,
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
    const terminateGroup = (signal) => {
      try {
        process.kill(-child.pid, signal);
      } catch {
        child.kill(signal);
      }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      terminateGroup("SIGTERM");
      forceTimer = setTimeout(() => terminateGroup("SIGKILL"), 5000);
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
    path.join(os.tmpdir(), `batch-14-publication-${context.debateNumber}-`)
  );
  const codexHome = await mkdtemp(
    path.join(os.tmpdir(), `batch-14-publication-home-${context.debateNumber}-`)
  );
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let record;
  activeContexts += 1;
  maximumObservedConcurrency = Math.max(
    maximumObservedConcurrency,
    activeContexts
  );
  try {
    const copies = [
      [activation.modelInputs.productionWorkflow, "production-workflow.md"],
      [activation.modelInputs.readinessWorkflow, "readiness-workflow.md"],
      [activation.modelInputs.outputContract, "output-contract.md"],
      [activation.modelInputs.manual, "manual.md"],
      [activation.modelInputs.referenceCatalog, "reference-catalog.json"],
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
      "Read production-workflow.md, readiness-workflow.md, output-contract.md, manual.md, reference-catalog.json, packet.json, and schema.json completely and no other files.",
      `Act only as the isolated publication editor for Debate ${context.debateNumber}.`,
      "Participant judgment, adjudication, move selection, and every score are closed and repository-owned; participant judgment was score-blind.",
      "Author exactly the schema fields: an 18–28 word summary; source-exact representative quotes targeting 6–14 words; prose for every locked move; Overall Commentary; optional material-only local reference tags; and a balanced, separately disclosed AI Extension with globally unique item IDs and complete novelty mappings.",
      "Write every critique in exactly four ordered labeled sentences, target 112–118 words, stay within 105–130 words, use at least 880 characters, and end every sentence with terminal punctuation.",
      "Before returning, count and verify every critique's four sentences, word range, minimum character count, ordered labels, and terminal punctuation; verify both representative quotes are exact contiguous source substrings.",
      "Never infer, emit, recalculate, or suggest changing a score; never change identity, structure, move selection, or source evidence; never consult legacy assessment material or other debates; never attribute AI material to a participant.",
      "Use no CJK, Hangul, Kana, or replacement characters and no prohibited rational-invulnerability language.",
      "Return exactly one schema-conforming JSON object and nothing else."
    ].join(" ");
    process.stdout.write(
      `[batch-14-publication] starting index ${context.contextIndex} ${activation.model.label}/${activation.model.reasoningEffort} Debate ${context.debateNumber}\n`
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
        "--output-schema",
        "schema.json",
        "--output-last-message",
        "result.json",
        prompt
      ],
      { cwd: temporary, env },
      activation.executionPolicy.timeoutMsPerContext
    );
    const resultPath = path.join(temporary, "result.json");
    const resultExists = await exists(resultPath);
    const base = {
      contextIndex: context.contextIndex,
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      model: activation.model.label,
      reasoningEffort: activation.model.reasoningEffort,
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensionCount: 0,
      correctionContextCount: 0,
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
      ownDebateScoresImmutable: true,
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
        validationWritten: false,
        provenanceWritten: false,
        failureMessage: `${invocation.error?.stack ?? ""}\n${invocation.stdout}\n${invocation.stderr}`
          .trim()
          .slice(-10000)
      };
    } else {
      const resultBytes = await readFile(resultPath);
      await mkdir(path.dirname(path.resolve(context.rawOutput)), {
        recursive: true
      });
      await writeFile(path.resolve(context.rawOutput), resultBytes);
      let validationSummary = null;
      let validationMessage = null;
      try {
        validationSummary = validatePostCanaryBatch14PublicationOutput(
          JSON.parse(resultBytes),
          JSON.parse(await readFile(path.resolve(context.packet), "utf8"))
        );
      } catch (error) {
        validationMessage = (error.stack ?? error.message).slice(-10000);
      }
      const accepted = validationSummary?.status === "passed";
      const validationRecord = {
        schemaVersion:
          "1.0-assessment-production-post-canary-batch-14-publication-validation",
        protocolId: activation.protocolId,
        status: accepted ? "passed" : "failed",
        debateNumber: context.debateNumber,
        debateId: context.debateId,
        outputSha256: sha256(resultBytes),
        validationSummary,
        validationMessage,
        modelAuthoredScores: 0,
        lockedScoresUnchanged: accepted ? true : null
      };
      const provenanceRecord = {
        schemaVersion:
          "1.0-assessment-production-post-canary-batch-14-publication-provenance",
        protocolId: activation.protocolId,
        debateNumber: context.debateNumber,
        debateId: context.debateId,
        model: activation.model,
        authentication: "ChatGPT subscription",
        reasoningEffort: activation.model.reasoningEffort,
        attemptCount: 1,
        retryCount: 0,
        timeoutExtensionCount: 0,
        correctionContextCount: 0,
        apiKeysRemoved: true,
        isolatedTemporaryCodexHome: true,
        isolatedTemporaryWorkingDirectory: true,
        participantJudgmentWasScoreBlind: true,
        ownDebateScoresImmutable: true,
        copiedInputs: Object.fromEntries(
          copies.map(([source, target]) => [
            target,
            { source, sha256: activation.sourceHashes[source] }
          ])
        ),
        outputSha256: sha256(resultBytes),
        modelAuthoredScores: 0,
        scorePassesExecutedThisStage: 0,
        meteredApiCostUsd: 0,
        paidServiceCallsThisStage: 0
      };
      const validationBytes = Buffer.from(
        `${JSON.stringify(validationRecord, null, 2)}\n`
      );
      const provenanceBytes = Buffer.from(
        `${JSON.stringify(provenanceRecord, null, 2)}\n`
      );
      await mkdir(path.dirname(path.resolve(context.validation)), {
        recursive: true
      });
      await mkdir(path.dirname(path.resolve(context.provenance)), {
        recursive: true
      });
      await writeFile(path.resolve(context.validation), validationBytes);
      await writeFile(path.resolve(context.provenance), provenanceBytes);
      record = {
        ...base,
        status: accepted ? "completed-valid" : "output-validation-failed",
        gateAcceptancePassed: accepted,
        outputWritten: true,
        outputSha256: sha256(resultBytes),
        validationWritten: true,
        validationSha256: sha256(validationBytes),
        provenanceWritten: true,
        provenanceSha256: sha256(provenanceBytes),
        validationSummary,
        validationMessage
      };
    }
  } catch (error) {
    record = {
      contextIndex: context.contextIndex,
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      model: activation.model.label,
      reasoningEffort: activation.model.reasoningEffort,
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensionCount: 0,
      correctionContextCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      authentication: "ChatGPT subscription",
      apiKeysRemoved: true,
      participantJudgmentWasScoreBlind: true,
      ownDebateScoresImmutable: true,
      copiedInputBytes: context.copiedInputBytes,
      meteredApiCostUsd: 0,
      paidServiceCallsThisStage: 0,
      modelAuthoredScores: 0,
      scorePassesExecutedThisStage: 0,
      status: "runner-error",
      gateAcceptancePassed: false,
      outputWritten: await exists(context.rawOutput),
      validationWritten: await exists(context.validation),
      provenanceWritten: await exists(context.provenance),
      failureMessage: (error.stack ?? String(error)).slice(-10000)
    };
  } finally {
    activeContexts -= 1;
    await rm(temporary, { recursive: true, force: true });
    await rm(codexHome, { recursive: true, force: true });
  }
  process.stdout.write(
    `[batch-14-publication] Debate ${context.debateNumber} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`
  );
  return record;
}

async function runPool(indexes, maximumConcurrency) {
  const queue = [...indexes];
  const completed = [];
  async function worker() {
    while (queue.length) {
      const index = queue.shift();
      completed.push(await runContext(activation.contexts[index]));
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(maximumConcurrency, indexes.length) },
      worker
    )
  );
  return completed.sort((left, right) => left.contextIndex - right.contextIndex);
}

const gateStartedAt = new Date().toISOString();
const gateStarted = Date.now();
const results = [];
const rampPhases = [];
let expansionAuthorized = true;
for (const phase of activation.executionPolicy.rampPhases) {
  if (!expansionAuthorized) {
    rampPhases.push({
      ...phase,
      attemptedContextIndexes: [],
      validContextIndexes: [],
      passed: false,
      skippedBecausePriorRampFailed: true
    });
    continue;
  }
  const phaseResults = await runPool(
    phase.contextIndexes,
    phase.maximumParallelContexts
  );
  results.push(...phaseResults);
  const validContextIndexes = phaseResults
    .filter((result) => result.gateAcceptancePassed)
    .map((result) => result.contextIndex);
  const passed = validContextIndexes.length === phase.contextIndexes.length;
  rampPhases.push({
    ...phase,
    attemptedContextIndexes: phaseResults.map((result) => result.contextIndex),
    validContextIndexes,
    passed,
    skippedBecausePriorRampFailed: false
  });
  if (phase.expansionRequiresAllValid && !passed) expansionAuthorized = false;
}
results.sort((left, right) => left.contextIndex - right.contextIndex);
const validContexts = results.filter(
  (result) => result.gateAcceptancePassed
).length;
const unattemptedContextIndexes = activation.contexts
  .map((_, index) => index)
  .filter(
    (index) => !results.some((result) => result.contextIndex === index)
  );
const passed = results.length === 10 && validContexts === 10;
const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-14-publication-model-execution",
  protocolId: activation.protocolId,
  status: passed
    ? "ten-post-canary-batch-14-publication-contexts-passed"
    : "post-canary-batch-14-publication-gate-complete-with-failure",
  gateStartedAt,
  gateCompletedAt: new Date().toISOString(),
  contextsPlanned: 10,
  contextsAttempted: results.length,
  contextsUnattempted: unattemptedContextIndexes.length,
  unattemptedContextIndexes,
  validContexts,
  invalidContexts: results.length - validContexts,
  attempts: results.length,
  retries: 0,
  timeoutExtensions: 0,
  correctionContexts: 0,
  maximumObservedConcurrency,
  schedulerRamp: structuredClone(activation.executionPolicy.schedulerRamp),
  wallElapsedMs: Date.now() - gateStarted,
  aggregateModelElapsedMs: results.reduce(
    (sum, result) => sum + result.elapsedMs,
    0
  ),
  meanElapsedMs: results.length
    ? results.reduce((sum, result) => sum + result.elapsedMs, 0) /
      results.length
    : null,
  rampPhases,
  results,
  participantJudgmentWasScoreBlind: true,
  ownDebateScoresImmutable: true,
  meteredApiCostUsd: 0,
  paidServiceCallsThisStage: 0,
  modelAuthoredScores: 0,
  scorePassesExecutedThisStage: 0,
  authorization: {
    deterministicAnalysis: true,
    retry: false,
    timeoutExtension: false,
    repairPacketPreparation: false,
    correctionModelExecution: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    nextBatchSelection: false
  }
};
await writeFile(
  path.resolve(activation.artifacts.execution),
  `${JSON.stringify(execution, null, 2)}\n`
);
console.log(
  JSON.stringify(
    {
      status: execution.status,
      contextsAttempted: execution.contextsAttempted,
      unattemptedContextIndexes,
      validContexts,
      invalidContexts: execution.invalidContexts,
      wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
      aggregateModelElapsedMinutes: Number(
        (execution.aggregateModelElapsedMs / 60000).toFixed(2)
      ),
      retries: 0,
      timeoutExtensions: 0,
      correctionContexts: 0,
      meteredApiCostUsd: 0,
      modelAuthoredScores: 0,
      productionMutationAuthorized: false
    },
    null,
    2
  )
);
