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

import { validateCheckpointV22DisputeAdjudicationOutput } from "./lib/assessment-production-checkpoint-v2.2-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const root =
  "docs/assessment-production/production-checkpoint-v2.2-1/dispute-only-adjudication";
const manifest = JSON.parse(
  await readFile(`${root}/execution-manifest.json`, "utf8")
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
assertV4(
  manifest.status ===
      "frozen-ten-isolated-production-checkpoint-v2.2-dispute-only-adjudication-contexts-authorized" &&
    manifest.productionCanary === true &&
    manifest.stagingOnly === true &&
    manifest.developmentValidationOnly === false &&
    manifest.model.label === "5.6 Sol" &&
    manifest.model.slug === "gpt-5.6-sol" &&
    manifest.model.reasoningEffort === "low" &&
    manifest.model.authentication === "ChatGPT subscription" &&
    manifest.model.scoreBlind === true &&
    manifest.authorization.adjudicationModelContexts &&
    !manifest.authorization.scoreDerivation &&
    !manifest.authorization.productionMutation,
  "production checkpoint v2.2 dispute adjudication execution unauthorized"
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
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
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
async function runContext(context, contextIndex) {
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), `slugfester-checkpoint-v22-adjudication-${context.debateNumber}-`)
  );
  const codexHome = await mkdtemp(
    path.join(os.tmpdir(), `slugfester-checkpoint-v22-adjudication-home-${context.debateNumber}-`)
  );
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let record;
  activeContexts += 1;
  maximumObservedConcurrency = Math.max(maximumObservedConcurrency, activeContexts);
  try {
    const copies = [
      [manifest.modelInputs.rubric, "rubric.md"],
      [manifest.modelInputs.decomposedRubric, "rubric-base.md"],
      [manifest.modelInputs.derivedFindingsRubric, "rubric-derived.md"],
      [manifest.modelInputs.boundedInventoryRubric, "rubric-bounded.md"],
      [manifest.modelInputs.workflow, "workflow.md"],
      [manifest.modelInputs.manual, "manual.md"],
      [manifest.modelInputs.schema, "schema.json"],
      [context.packet, "packet.json"],
      ...context.audioTranscriptInputs.map((item) => [
        item.sourcePath,
        item.modelInputFile
      ])
    ];
    for (const [source, target] of copies) {
      await copyFile(source, path.join(temporary, target));
    }
    await copyFile(authSource, path.join(codexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: codexHome };
    for (const key of manifest.executionPolicy.removedEnvironmentVariables) {
      delete environment[key];
    }
    const audioFiles = context.audioTranscriptInputs.map(
      (item) => item.modelInputFile
    );
    const prompt = `Read rubric.md, rubric-base.md, rubric-derived.md, rubric-bounded.md, workflow.md, manual.md, packet.json, schema.json${
      audioFiles.length ? `, and ${audioFiles.join(", ")}` : ""
    }; read nothing else. Act only as the isolated disputed-fields-only production checkpoint v2.2 adjudicator for Debate ${
      context.debateNumber
    }. Decide every required candidate pair and scoring field exactly once from locked evidence. Candidate ordering is anonymous and may reverse independently. Never mix, average, interpolate, repair, rewrite, or invent a candidate. Never calculate a score or infer a pass identity, winner, Overall Commentary, AI Extension, or publication prose. Return exactly one schema-conforming JSON object.`;
    process.stdout.write(
      `[checkpoint-v2.2-adjudication] starting index ${contextIndex} ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber}\n`
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
      { cwd: temporary, env: environment },
      manifest.executionPolicy.timeoutMsPerContext
    );
    const resultExists = await exists(path.join(temporary, "result.json"));
    const base = {
      contextIndex,
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      model: manifest.model.label,
      modelSlug: manifest.model.slug,
      reasoningEffort: manifest.model.reasoningEffort,
      attemptCount: 1,
      retryCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      timedOut: invocation.timedOut,
      commandExitCode: invocation.code,
      terminationSignal: invocation.signal,
      authentication: "ChatGPT subscription",
      apiKeysRemoved: true,
      copiedInputBytes: context.copiedInputBytes,
      audioTranscriptInputs: audioFiles,
      meteredApiCostUsd: 0,
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
        failureMessage: `${invocation.stdout}\n${invocation.stderr}`.trim().slice(-10000)
      };
    } else {
      await mkdir(path.dirname(context.output), { recursive: true });
      await copyFile(path.join(temporary, "result.json"), context.output);
      let validation = null;
      let validationMessage = null;
      try {
        validation = validateCheckpointV22DisputeAdjudicationOutput(
          JSON.parse(await readFile(context.output, "utf8")),
          JSON.parse(await readFile(context.packet, "utf8"))
        );
      } catch (error) {
        validationMessage = error.stack ?? error.message;
      }
      record = {
        ...base,
        status: validation?.status === "passed"
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
      contextIndex,
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      model: manifest.model.label,
      modelSlug: manifest.model.slug,
      reasoningEffort: manifest.model.reasoningEffort,
      attemptCount: 1,
      retryCount: 0,
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
    `[checkpoint-v2.2-adjudication] Debate ${context.debateNumber} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`
  );
  return record;
}

async function runPool(indexes, maximumConcurrency) {
  const queue = [...indexes];
  const completed = [];
  async function worker() {
    while (queue.length) {
      const index = queue.shift();
      completed.push(await runContext(manifest.contexts[index], index));
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(maximumConcurrency, indexes.length) }, worker)
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
  const phaseResults = await runPool(
    phase.contextIndexes,
    manifest.executionPolicy.maximumConcurrency
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
const validContexts = results.filter((result) => result.gateAcceptancePassed).length;
const unattemptedContextIndexes = manifest.contexts
  .map((_, index) => index)
  .filter((index) => !results.some((result) => result.contextIndex === index));
const passed =
  results.length === manifest.contexts.length &&
  validContexts === manifest.contexts.length;
const execution = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-dispute-only-adjudication-model-execution",
  protocolId: manifest.protocolId,
  status: passed
    ? "ten-isolated-production-checkpoint-v2.2-dispute-only-adjudication-contexts-passed"
    : "production-checkpoint-v2.2-dispute-only-adjudication-gate-complete-with-failure",
  productionCanary: true,
  stagingOnly: true,
  developmentValidationOnly: false,
  gateStartedAt,
  gateCompletedAt: new Date().toISOString(),
  contextsPlanned: manifest.contexts.length,
  contextsAttempted: results.length,
  unattemptedContextIndexes,
  validContexts,
  invalidContexts: results.length - validContexts,
  attempts: results.length,
  retries: 0,
  corrections: 0,
  maximumObservedConcurrency,
  wallElapsedMs: Date.now() - gateStarted,
  aggregateModelElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0),
  meanElapsedMs: results.length
    ? results.reduce((sum, result) => sum + result.elapsedMs, 0) / results.length
    : null,
  rampPhases,
  results,
  meteredApiCostUsd: 0,
  transcriptionCostUsdThisStage: 0,
  scoresDerived: 0,
  authorization: {
    deterministicAnalysis: true,
    retry: false,
    correctionModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    policyPromotion: false,
    productionMutation: false
  }
};
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
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
      meteredApiCostUsd: 0,
      transcriptionCostUsdThisStage: 0,
      scoresDerived: 0
    },
    null,
    2
  )
);
