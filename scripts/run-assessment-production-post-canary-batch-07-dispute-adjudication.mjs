#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
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
  POST_CANARY_BATCH_07_DISPUTE_ADJ_ROOT,
  validatePostCanaryBatch07DisputeAdjudicationOutput
} from "./lib/assessment-production-post-canary-batch-07-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const activationPath =
  `${POST_CANARY_BATCH_07_DISPUTE_ADJ_ROOT}/execution-activation.json`;
const manifest = JSON.parse(await readFile(activationPath, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assertV4(
  manifest.status ===
      "frozen-ten-post-canary-batch-07-dispute-only-adjudication-contexts-authorized" &&
    manifest.productionCanary === false &&
    manifest.batchNumber === 7 &&
    manifest.stagingOnly === true &&
    manifest.model.label === "5.6 Sol" &&
    manifest.model.slug === "gpt-5.6-sol" &&
    manifest.model.reasoningEffort === "low" &&
    manifest.model.authentication === "ChatGPT subscription" &&
    manifest.model.scoreBlind === true &&
    manifest.model.roundedIntegerScoreTiesPermitted === true &&
    manifest.authorization.adjudicationModelContexts === true &&
    manifest.authorization.judgmentModelContexts === false &&
    manifest.authorization.paidServices === false &&
    manifest.authorization.finalLedgerAssembly === false &&
    manifest.authorization.scoreDerivation === false &&
    manifest.authorization.productionMutation === false &&
    manifest.executionPolicy.attemptsPerContext === 1 &&
    manifest.executionPolicy.retriesMaximum === 0 &&
    manifest.executionPolicy.timeoutExtensionsMaximum === 0 &&
    JSON.stringify(manifest.executionPolicy.schedulerRamp) ===
      JSON.stringify([1, 2]) &&
    manifest.executionPolicy.maximumParallelContexts === 2,
  "Batch 7 dispute-only adjudication execution is unauthorized"
);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output exists: ${future}`);
}

const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
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
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      resolve({ code, signal, stdout, stderr, timedOut });
    });
  });
}

let activeContexts = 0;
let maximumObservedConcurrency = 0;
async function runContext(context) {
  const temporary = await mkdtemp(
    path.join(
      os.tmpdir(),
      `slugfester-post-canary-batch-07-adjudication-${context.debateNumber}-`
    )
  );
  const codexHome = await mkdtemp(
    path.join(
      os.tmpdir(),
      `slugfester-post-canary-batch-07-adjudication-home-${context.debateNumber}-`
    )
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
      [manifest.modelInputs.rubric, "rubric.md"],
      [manifest.modelInputs.decomposedRubric, "rubric-base.md"],
      [manifest.modelInputs.derivedFindingsRubric, "rubric-derived.md"],
      [manifest.modelInputs.boundedInventoryRubric, "rubric-bounded.md"],
      [manifest.modelInputs.productionWorkflow, "production-workflow.md"],
      [manifest.modelInputs.adjudicationWorkflow, "adjudication-workflow.md"],
      [manifest.modelInputs.manual, "manual.md"],
      [manifest.modelInputs.schema, "schema.json"],
      [context.packet, "packet.json"],
      ...context.audioTranscriptInputs.map((item) => [
        item.sourcePath,
        item.modelInputFile
      ])
    ];
    let copiedInputBytes = 0;
    for (const [source, target] of copies) {
      const bytes = await readFile(source);
      copiedInputBytes += bytes.length;
      await copyFile(source, path.join(temporary, target));
    }
    assertV4(
      copiedInputBytes === context.copiedInputBytes,
      `Debate ${context.debateNumber}: copied-input accounting changed`
    );
    await copyFile(authSource, path.join(codexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: codexHome };
    for (const key of manifest.executionPolicy.removedEnvironmentVariables) {
      delete environment[key];
    }
    const audioFiles = context.audioTranscriptInputs.map(
      (item) => item.modelInputFile
    );
    const prompt = `Read rubric.md, rubric-base.md, rubric-derived.md, rubric-bounded.md, production-workflow.md, adjudication-workflow.md, manual.md, packet.json, schema.json${
      audioFiles.length ? `, and ${audioFiles.join(", ")}` : ""
    }; read nothing else. Act only as the isolated, score-blind, disputed-fields-only adjudicator for post-canary Batch 7 Debate ${
      context.debateNumber
    }. Decide every required anonymous candidate pair and scoring field exactly once from the locked evidence. Candidate ordering may reverse independently for every field. Select only candidate 1 or candidate 2. Never mix, average, interpolate, repair, rewrite, or invent a candidate. Use any supplied diarized transcript only for its associated move. Never infer either initial pass identity or rationale. Never calculate a move, section, side, or debate score. Never produce a winner, legacy assessment, Overall Commentary, AI Extension, or publication prose. Return exactly one schema-conforming JSON object.`;
    process.stdout.write(
      `[batch-07-adjudication] starting index ${context.contextIndex} ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber}\n`
    );
    const invocation = await invoke(
      [
        "exec",
        "--ephemeral",
        "--skip-git-repo-check",
        "--ignore-user-config",
        "--ignore-rules",
        "--model",
        manifest.model.slug,
        "-c",
        `model_reasoning_effort="${manifest.model.reasoningEffort}"`,
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
      { cwd: temporary, env: environment },
      manifest.executionPolicy.timeoutMsPerContext
    );
    const resultPath = path.join(temporary, "result.json");
    const resultExists = await exists(resultPath);
    const base = {
      contextIndex: context.contextIndex,
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      model: manifest.model.label,
      modelSlug: manifest.model.slug,
      reasoningEffort: manifest.model.reasoningEffort,
      scoreBlind: true,
      roundedIntegerScoreTiesPermitted: true,
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensionCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      timedOut: invocation.timedOut,
      commandExitCode: invocation.code,
      terminationSignal: invocation.signal,
      authentication: "ChatGPT subscription",
      apiKeysRemoved: true,
      copiedInputBytes,
      audioTranscriptInputs: audioFiles,
      meteredApiCostUsd: 0,
      paidServiceCalls: 0,
      transcriptionCostUsdThisStage: 0,
      stdoutSha256: sha256(invocation.stdout),
      stderrSha256: sha256(invocation.stderr)
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
        gateAcceptancePassed: false,
        outputWritten: false,
        failureMessage: `${invocation.stdout}\n${invocation.stderr}`
          .trim()
          .slice(-10000)
      };
    } else {
      await mkdir(path.dirname(context.output), { recursive: true });
      await copyFile(resultPath, context.output);
      let validation = null;
      let validationMessage = null;
      try {
        validation = validatePostCanaryBatch07DisputeAdjudicationOutput(
          JSON.parse(await readFile(context.output, "utf8")),
          JSON.parse(await readFile(context.packet, "utf8"))
        );
      } catch (error) {
        validationMessage = error.stack ?? error.message;
      }
      record = {
        ...base,
        status:
          validation?.status === "passed"
            ? "completed-valid"
            : "output-validation-failed",
        gateAcceptancePassed: validation?.status === "passed",
        outputWritten: true,
        outputSha256: sha256(await readFile(context.output)),
        validationSummary: validation,
        validationMessage: validationMessage?.slice(-10000) ?? null
      };
    }
  } catch (error) {
    record = {
      contextIndex: context.contextIndex,
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      model: manifest.model.label,
      modelSlug: manifest.model.slug,
      reasoningEffort: manifest.model.reasoningEffort,
      scoreBlind: true,
      roundedIntegerScoreTiesPermitted: true,
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensionCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      authentication: "ChatGPT subscription",
      apiKeysRemoved: true,
      copiedInputBytes: context.copiedInputBytes,
      audioTranscriptInputs: context.audioTranscriptInputs.map(
        (item) => item.modelInputFile
      ),
      meteredApiCostUsd: 0,
      paidServiceCalls: 0,
      transcriptionCostUsdThisStage: 0,
      status: "runner-error",
      gateAcceptancePassed: false,
      outputWritten: await exists(context.output),
      failureMessage: (error.stack ?? String(error)).slice(-10000)
    };
  } finally {
    activeContexts -= 1;
    await rm(temporary, { recursive: true, force: true });
    await rm(codexHome, { recursive: true, force: true });
  }
  process.stdout.write(
    `[batch-07-adjudication] Debate ${context.debateNumber} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`
  );
  return record;
}

async function runPool(indexes) {
  const queue = [...indexes];
  const completed = [];
  async function worker() {
    while (queue.length) {
      const index = queue.shift();
      completed.push(await runContext(manifest.contexts[index]));
    }
  }
  await Promise.all(
    Array.from(
      {
        length: Math.min(
          manifest.executionPolicy.maximumParallelContexts,
          indexes.length
        )
      },
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
for (const phase of manifest.executionPolicy.rampPhases) {
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
  const phaseResults = await runPool(phase.contextIndexes);
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
const unattemptedContextIndexes = manifest.contexts
  .map((_, index) => index)
  .filter((index) => !results.some((result) => result.contextIndex === index));
const passed =
  results.length === 10 &&
  validContexts === 10 &&
  unattemptedContextIndexes.length === 0;
const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-07-dispute-only-adjudication-model-execution",
  protocolId: manifest.protocolId,
  status: passed
    ? "ten-post-canary-batch-07-dispute-only-adjudication-contexts-passed"
    : "post-canary-batch-07-dispute-only-adjudication-gate-complete-with-failure",
  productionCanary: false,
  batchNumber: 7,
  stagingOnly: true,
  developmentValidationOnly: false,
  gateStartedAt,
  gateCompletedAt: new Date().toISOString(),
  contextsPlanned: 10,
  contextsAttempted: results.length,
  unattemptedContextIndexes,
  validContexts,
  invalidContexts: results.length - validContexts,
  attempts: results.length,
  retries: 0,
  timeoutExtensions: 0,
  corrections: 0,
  maximumObservedConcurrency,
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
  adjudicationModelContexts: results.length,
  judgmentModelContexts: 0,
  paidServiceCalls: 0,
  meteredApiCostUsd: 0,
  transcriptionCostUsdThisStage: 0,
  directIncrementalCostUsd: 0,
  scoresDerived: 0,
  publicationReconstructions: 0,
  productionMutations: 0,
  nextBatchSelections: 0,
  authorization: {
    deterministicAnalysis: true,
    retry: false,
    timeoutExtension: false,
    correctionModelExecution: false,
    judgmentModelExecution: false,
    paidServices: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    nextBatchSelection: false
  }
};
await writeFile(
  manifest.artifacts.execution,
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
      maximumObservedConcurrency,
      retries: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      scoresDerived: 0
    },
    null,
    2
  )
);
