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
  V212_DISCOVERY_PROTOCOL_ID,
  buildV212TokenCountedChunkLedger,
} from "./lib/assessment-production-score-stability-v2.1.2-discovery.mjs";
import { validateV42219ChunkLedger } from "./lib/v42219-generalized-partition.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/score-stability-v2.1.2-validation-cohort/discovery";
const ACTIVATION = `${ROOT}/execution-activation.json`;
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

const activation = JSON.parse(await readFile(ACTIVATION, "utf8"));
assertV4(
  activation.status ===
      "frozen-thirty-three-v2.1.2-validation-discovery-contexts-authorized" &&
    activation.discoveryProtocolId === V212_DISCOVERY_PROTOCOL_ID &&
    activation.developmentValidationOnly === true &&
    activation.productionCanary === false &&
    activation.stagingOnly === true &&
    activation.model.label === "5.6 Sol" &&
    activation.model.slug === "gpt-5.6-sol" &&
    activation.model.reasoningEffort === "low" &&
    activation.model.authentication === "ChatGPT subscription" &&
    activation.model.scoreBlind === true &&
    activation.authorization.modelContexts === true &&
    activation.authorization.retry === false &&
    activation.authorization.timeoutExtension === false &&
    activation.authorization.semanticCorrection === false &&
    activation.authorization.independentJudgmentModelExecution === false &&
    activation.authorization.paidTranscription === false &&
    activation.authorization.scoreDerivation === false &&
    activation.authorization.productionMutation === false &&
    activation.executionPolicy.attemptsPerContext === 1 &&
    activation.executionPolicy.retriesMaximum === 0 &&
    activation.executionPolicy.timeoutExtensionsMaximum === 0 &&
    activation.executionPolicy.maximumParallelContexts === 4 &&
    JSON.stringify(activation.executionPolicy.schedulerRamp) ===
      JSON.stringify([1, 2, 4]),
  "v2.1.2 discovery execution is unauthorized"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}
const preparationManifestBytes = await readFile(
  activation.preparationManifest
);
assertV4(
  sha256(preparationManifestBytes) === activation.preparationManifestSha256,
  "preparation manifest hash drifted"
);
const preparationManifest = JSON.parse(preparationManifestBytes);
const sourcePreparation = JSON.parse(
  await readFile(preparationManifest.preparation, "utf8")
);
assertV4(
  preparationManifest.contexts.length === 33 &&
    sourcePreparation.contexts.length === 10,
  "frozen discovery context count drifted"
);
for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output already exists: ${future}`);
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
const gateDeadline =
  gateStarted + activation.executionPolicy.absoluteGateTimeoutMs;

async function executeContext(context, contextIndex) {
  const debate = sourcePreparation.contexts.find(
    (item) => item.debateNumber === context.debateNumber
  );
  const chunk = debate.chunks.find((item) => item.chunkId === context.chunkId);
  const [validationChunkBytes, fullLedgerBytes, modelLedgerBytes] =
    await Promise.all([
      readFile(context.validationChunkLedgerPath),
      readFile(context.fullLedger),
      readFile(context.modelTokenCountedLedgerPath),
    ]);
  validateV42219ChunkLedger(validationChunkBytes, fullLedgerBytes, chunk);
  assertV4(
    buildV212TokenCountedChunkLedger(validationChunkBytes).equals(
      modelLedgerBytes
    ) &&
      sha256(modelLedgerBytes) === context.modelTokenCountedLedgerSha256,
    `${context.debateNumber}/${context.chunkId}: token-counted model ledger drifted`
  );
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
      `slugfester-v212-discovery-${context.debateNumber}-${context.chunkId}-`
    )
  );
  const isolatedCodexHome = await mkdtemp(
    path.join(
      os.tmpdir(),
      `slugfester-v212-discovery-home-${context.debateNumber}-${context.chunkId}-`
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
      [preparationManifest.modelInputs.manual, "manual.md"],
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
    const prompt = `Read manual.md, packet.json, schema.json, and every line of token-counted-ledger.jsonl; read nothing else. Act only as the isolated bounded-end score-blind source-discovery reviewer for development-validation Debate ${context.debateNumber}, ${context.chunkId}. The owned core is events ${context.coreStartEvent} through ${context.coreEndEvent}; boundary context is events ${context.contextStartEvent} through ${context.contextEndEvent}. Review the entire context. Follow the predecessor-chunk ownership rule. Emit zero to ten chronological load-bearing candidates whose start event lies inside the core. For each candidate emit sourceWindow.startEvent and the actual final source row as sourceWindow.endEvent, bounded by the delivered context. Use the per-row lexical-token counts to ensure the inclusive window has at least twelve tokens. Never emit a requested lexical-token count, target ID, moveKind, evidence text, rating, score, section, winner, tag, Overall Commentary, AI Extension, policy analysis, or assessment/publication prose. Return exactly one schema-conforming JSON object.`;
    process.stdout.write(
      `[v2.1.2-discovery] starting ${activation.model.label}/${activation.model.reasoningEffort} Debate ${context.debateNumber} ${context.chunkId}\n`
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
          "scripts/validate-v212-discovery.mjs",
          context.rawOutput,
          preparationManifest.preparation,
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
          `${context.debateNumber}/${context.chunkId}: successor validation contract drifted`
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
    `[v2.1.2-discovery] Debate ${context.debateNumber} ${context.chunkId} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`
  );
  return record;
}

const resultsByIndex = new Array(preparationManifest.contexts.length);
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
        preparationManifest.contexts[contextIndex],
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
      { length: preparationManifest.contexts.length - 3 },
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
    "1.0-score-stability-v2.1.2-fresh-validation-discovery-model-execution",
  protocolId: activation.protocolId,
  discoveryProtocolId: V212_DISCOVERY_PROTOCOL_ID,
  status:
    validContexts === preparationManifest.contexts.length
      ? "thirty-three-v2.1.2-validation-discovery-contexts-passed"
      : "v2.1.2-validation-discovery-complete-with-failure",
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  gateStartedAt,
  gateCompletedAt: new Date().toISOString(),
  contextsPlanned: preparationManifest.contexts.length,
  contextsAttempted: results.length,
  contextsUnattempted: preparationManifest.contexts.length - results.length,
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
  repositoryDerivedLexicalTokenCounts: results.every(
    (result) =>
      !result.accepted ||
      result.validationSummary?.repositoryDerivedLexicalTokenCounts === true
  ),
  modelAuthoredLexicalTokenCounts: false,
  modelAuthoredBoundedEndEvents: true,
  startDependentLockedLookaheadCapacityStructurallyBounded: true,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
  v1CanaryReclassified: false,
  v2ValidationReclassified: false,
  v21DiscoveryReclassified: false,
  v211DiscoveryReclassified: false,
  proposedPolicyPromoted: false,
  scoresDerived: 0,
  authorization: {
    deterministicAnalysis: validContexts === preparationManifest.contexts.length,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    inventoryPreparation: false,
    inventoryModelExecution: false,
    independentJudgmentModelExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
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
      repositoryDerivedLexicalTokenCounts:
        execution.repositoryDerivedLexicalTokenCounts,
      modelAuthoredLexicalTokenCounts: false,
      modelAuthoredBoundedEndEvents: true,
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
