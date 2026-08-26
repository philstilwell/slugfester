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

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  POST_CANARY_BATCH_12_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch12StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-12-standing-authorization.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-12/independent-judgments";
const activation = JSON.parse(
  await readFile(`${ROOT}/execution-activation.json`, "utf8")
);
const standingAuthorization =
  await loadAndValidatePostCanaryBatch12StandingAuthorization();
const codex = activation.executionEnvironment.codexPath;
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const tail = (value, maximum = 12000) =>
  value.length <= maximum ? value : value.slice(-maximum);

assertV4(
  activation.status ===
      "frozen-twenty-post-canary-batch-12-independent-judgment-contexts-authorized" &&
    activation.developmentValidationOnly === false &&
    activation.productionCanary === false &&
    activation.batchNumber === 12 &&
    activation.stagingOnly === true &&
    activation.model.label === "5.6 Sol" &&
    activation.model.slug === "gpt-5.6-sol" &&
    activation.model.reasoningEffort === "low" &&
    activation.model.authentication === "ChatGPT subscription" &&
    activation.model.scoreBlind === true &&
    activation.model.roundedIntegerScoreTiesPermitted === true &&
    activation.sourceCompatibility?.status ===
      "all-source-rows-have-positive-repository-lexical-token-count" &&
    activation.sourceCompatibility?.sourceRowsInjected === 0 &&
    activation.sourceCompatibility?.sourceRowsOmitted === 0 &&
    activation.sourceCompatibility?.sourceRowsRewritten === 0 &&
    activation.sourceCompatibility?.minimumCandidateLexicalTokensChanged ===
      false &&
    activation.sourceCompatibility?.occurrences?.length === 0 &&
    activation.userAuthorization?.standingAuthorization ===
      POST_CANARY_BATCH_12_STANDING_AUTHORIZATION &&
    activation.userAuthorization?.standingAuthorizationSha256 ===
      standingAuthorization.sha256 &&
    activation.authorization.modelContexts === true &&
    activation.authorization.independentJudgmentModelExecution === true &&
    activation.authorization.deterministicValidation === true &&
    activation.authorization.deterministicCompilation === true &&
    activation.authorization.deterministicAnalysis === true &&
    activation.authorization.retry === false &&
    activation.authorization.timeoutExtension === false &&
    activation.authorization.semanticCorrection === false &&
    activation.authorization.disagreementExtraction === false &&
    activation.authorization.unexpectedPaidService === false &&
    activation.authorization.audioVerification === false &&
    activation.authorization.adjudicationExecution === false &&
    activation.authorization.scoreDerivation === false &&
    activation.authorization.publicationModelExecution === false &&
    activation.authorization.productionMutation === false &&
    activation.contexts.length === 20 &&
    activation.executionPolicy.attemptsPerContext === 1 &&
    activation.executionPolicy.retriesMaximum === 0 &&
    activation.executionPolicy.timeoutExtensionsMaximum === 0 &&
    activation.executionPolicy.maximumParallelContexts === 2 &&
    JSON.stringify(activation.executionPolicy.schedulerRamp) ===
      JSON.stringify([1, 2]) &&
    activation.executionPolicy.firstRealContextOperationalCanary === true,
  "Batch 12 independent-judgment execution is unauthorized"
);
assertV4(
  execFileSync(codex, ["--version"], { encoding: "utf8" }).trim() ===
    activation.executionEnvironment.codexCliVersion,
  "the frozen Codex CLI version changed"
);
assertV4(
  sha256(await readFile(activation.preparationManifest)) ===
      activation.preparationManifestSha256 &&
    sha256(await readFile(activation.packetPreparation)) ===
      activation.packetPreparationSha256,
  "activation preparation hash drifted"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output already exists: ${future}`);
}
await access(codex);
await access(authSource);

function run(command, args, options, timeoutMs) {
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

let activeContexts = 0;
let maximumParallelContextsObserved = 0;
const gateStartedAt = new Date().toISOString();
const gateStarted = Date.now();
const gateDeadline =
  gateStarted + activation.executionPolicy.absoluteGateTimeoutMs;

async function executeContext(context, contextIndex) {
  const remainingGateMs = gateDeadline - Date.now();
  assertV4(
    remainingGateMs > 0,
    "absolute Batch 12 independent-judgment gate timeout reached before launch"
  );
  const contextTimeoutMs = Math.min(
    activation.executionPolicy.timeoutMsPerContext,
    remainingGateMs
  );
  const temporary = await mkdtemp(
    path.join(
      os.tmpdir(),
      `slugfester-batch-12-judgment-${context.debateNumber}-${context.reviewerPass.toLowerCase()}-`
    )
  );
  const isolatedCodexHome = await mkdtemp(
    path.join(
      os.tmpdir(),
      `slugfester-batch-12-judgment-home-${context.debateNumber}-${context.reviewerPass.toLowerCase()}-`
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
      [activation.modelInputs.manual, "manual.md"],
      [context.sourcePacket, "source-packet.json"],
      [context.judgmentPacket, "judgment-packet.json"],
      [context.schema, "schema.json"],
    ]) {
      await copyFile(source, path.join(temporary, target));
    }
    await copyFile(authSource, path.join(isolatedCodexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: isolatedCodexHome };
    for (const key of activation.executionPolicy.removedEnvironmentVariables) {
      delete env[key];
    }
    const prompt = `Read manual.md, source-packet.json, judgment-packet.json, and schema.json completely; read nothing else. Act only as isolated independent performance Judge ${context.reviewerPass} for production Batch 12 Debate ${context.debateNumber}. Judge every locked move exactly once. The score-blind inventory, chronology, source evidence, routes, sections, weights, propositions, and attribution are immutable. Use only legal earlier-opposing targets exposed by the schema. Apply the response-component, partial-answer, burden-relevance, logical-coherence, evidence-warrant, precision, calibration, charity, confidence, and strict burden-residual anchors literally. Do not calculate scores, name a winner, claim audio review, alter candidate selection, or write Overall Commentary, AI Extension, or publication prose. The other independent judgment, all other debates, validation-cohort outputs, failed production-canary outputs, and all legacy assessment material are unavailable. Return exactly one schema-conforming JSON object and no commentary.`;
    process.stdout.write(
      `[batch-12-judgment] starting index ${contextIndex} ${activation.model.label}/${activation.model.reasoningEffort} Debate ${context.debateNumber} Pass ${context.reviewerPass}\n`
    );
    const invocation = await run(
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
      { cwd: temporary, env },
      contextTimeoutMs
    );
    const resultPath = path.join(temporary, "result.json");
    const resultExists = await exists(resultPath);
    const base = {
      contextIndex,
      debateNumber: context.debateNumber,
      reviewerPass: context.reviewerPass,
      reviewerRole: context.reviewerRole,
      model: activation.model.label,
      modelSlug: activation.model.slug,
      reasoningEffort: activation.model.reasoningEffort,
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensionCount: 0,
      semanticCorrectionCount: 0,
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
      roundedIntegerScoreTiesPermitted: true,
      copiedInputBytes: context.copiedInputBytes,
      lockedInventorySha256: context.lockedInventoryCanonicalSha256,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      stdoutSha256: sha256(invocation.stdout),
      stderrSha256: sha256(invocation.stderr),
    };
    let preservedJudgmentSha256 = null;
    if (resultExists) {
      await mkdir(path.dirname(context.judgmentOutput), { recursive: true });
      await copyFile(resultPath, context.judgmentOutput);
      preservedJudgmentSha256 = sha256(await readFile(context.judgmentOutput));
    }
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
        judgmentWritten: resultExists,
        judgmentSha256: preservedJudgmentSha256,
        stdoutTail: tail(invocation.stdout),
        stderrTail: tail(invocation.stderr),
      };
    } else {
      const validation = await run(
        process.execPath,
        [
          "scripts/validate-assessment-production-post-canary-batch-12-independent-judgment.mjs",
          context.judgmentOutput,
          activation.packetPreparation,
          context.debateNumber,
          context.reviewerPass,
          "--write",
        ],
        { cwd: process.cwd(), env: process.env },
        180000
      );
      const valid =
        validation.code === 0 &&
        validation.signal === null &&
        !validation.timedOut;
      record = {
        ...base,
        status: valid ? "completed-valid" : "output-validation-failed",
        accepted: valid,
        judgmentWritten: true,
        judgmentSha256: preservedJudgmentSha256,
        validationSummary: valid ? JSON.parse(validation.stdout) : null,
        validationMessage: valid
          ? null
          : `${validation.stdout}\n${validation.stderr}`.trim().slice(-12000),
        rawOutputSha256: valid
          ? sha256(await readFile(context.rawOutput))
          : null,
        validationSha256: valid
          ? sha256(await readFile(context.validationOutput))
          : null,
        provenanceSha256: valid
          ? sha256(await readFile(context.provenanceOutput))
          : null,
        stdoutTail: valid ? null : tail(invocation.stdout),
        stderrTail: valid ? null : tail(invocation.stderr),
      };
    }
  } catch (error) {
    const judgmentWritten = await exists(context.judgmentOutput);
    record = {
      contextIndex,
      debateNumber: context.debateNumber,
      reviewerPass: context.reviewerPass,
      reviewerRole: context.reviewerRole,
      model: activation.model.label,
      modelSlug: activation.model.slug,
      reasoningEffort: activation.model.reasoningEffort,
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensionCount: 0,
      semanticCorrectionCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      authentication: "ChatGPT subscription",
      apiKeysRemoved: true,
      scoreBlind: true,
      roundedIntegerScoreTiesPermitted: true,
      copiedInputBytes: context.copiedInputBytes,
      lockedInventorySha256: context.lockedInventoryCanonicalSha256,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      status: "runner-error",
      accepted: false,
      judgmentWritten,
      judgmentSha256: judgmentWritten
        ? sha256(await readFile(context.judgmentOutput))
        : null,
      error: tail(error?.stack ?? String(error)),
    };
  } finally {
    activeContexts -= 1;
    await rm(temporary, { recursive: true, force: true });
    await rm(isolatedCodexHome, { recursive: true, force: true });
  }
  process.stdout.write(
    `[batch-12-judgment] Debate ${context.debateNumber} Pass ${context.reviewerPass} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`
  );
  return record;
}

const resultsByIndex = new Array(activation.contexts.length);
const rampPhases = [];
async function runPhase(phase) {
  const startedAt = new Date().toISOString();
  let cursor = 0;
  async function worker() {
    while (cursor < phase.contextIndexes.length) {
      const position = cursor;
      cursor += 1;
      const contextIndex = phase.contextIndexes[position];
      resultsByIndex[contextIndex] = await executeContext(
        activation.contexts[contextIndex],
        contextIndex
      );
    }
  }
  await Promise.all(
    Array.from(
      {
        length: Math.min(
          phase.maximumParallelContexts,
          phase.contextIndexes.length
        ),
      },
      () => worker()
    )
  );
  const passed = phase.contextIndexes.every(
    (index) => resultsByIndex[index].accepted
  );
  rampPhases.push({
    ...phase,
    startedAt,
    completedAt: new Date().toISOString(),
    attemptedContextIndexes: [...phase.contextIndexes],
    validContextIndexes: phase.contextIndexes.filter(
      (index) => resultsByIndex[index].accepted
    ),
    passed,
    skippedBecausePriorRampFailed: false,
  });
  return passed;
}

let expansionAuthorized = true;
for (const phase of activation.executionPolicy.rampPhases) {
  if (!expansionAuthorized) {
    rampPhases.push({
      ...phase,
      startedAt: null,
      completedAt: null,
      attemptedContextIndexes: [],
      validContextIndexes: [],
      passed: false,
      skippedBecausePriorRampFailed: true,
    });
    continue;
  }
  const passed = await runPhase(phase);
  if (phase.expansionRequiresAllValid && !passed) {
    expansionAuthorized = false;
  }
}

const results = resultsByIndex.filter(Boolean);
const validContexts = results.filter((result) => result.accepted).length;
const unattemptedContextIndexes = activation.contexts
  .map((_, index) => index)
  .filter((index) => !resultsByIndex[index]);
const passed =
  results.length === activation.contexts.length &&
  validContexts === activation.contexts.length;
const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-12-independent-judgment-model-execution",
  protocolId: activation.protocolId,
  status: passed
    ? "twenty-post-canary-batch-12-independent-judgment-contexts-passed"
    : "post-canary-batch-12-independent-judgment-gate-complete-with-failure",
  developmentValidationOnly: false,
  productionCanary: false,
  batchNumber: 12,
  stagingOnly: true,
  gateStartedAt,
  gateCompletedAt: new Date().toISOString(),
  contextsPlanned: activation.contexts.length,
  contextsAttempted: results.length,
  contextsUnattempted: activation.contexts.length - results.length,
  unattemptedContextIndexes,
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
  rampPassed: rampPhases.slice(0, 2).every((phase) => phase.passed),
  wallElapsedMs: Date.now() - gateStarted,
  modelWorkElapsedMs: results.reduce(
    (sum, result) => sum + result.elapsedMs,
    0
  ),
  results,
  authentication: "ChatGPT subscription",
  scoreBlind: true,
  roundedIntegerScoreTiesPermitted: true,
  sourceCompatibility: structuredClone(activation.sourceCompatibility),
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
  modelAuthoredScores: 0,
  scoresDerived: 0,
  authorization: {
    deterministicAnalysis: true,
    independentJudgmentModelExecution: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    disagreementExtraction: false,
    paidTranscription: false,
    unexpectedPaidService: false,
    audioVerification: false,
    adjudicationExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationFinalization: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false,
  },
};
await writeFile(
  activation.artifacts.execution,
  `${JSON.stringify(execution, null, 2)}\n`
);
console.log(
  JSON.stringify(
    {
      status: execution.status,
      contextsAttempted: execution.contextsAttempted,
      contextsUnattempted: execution.contextsUnattempted,
      validContexts,
      invalidContexts: execution.invalidContexts,
      wallElapsedMinutes: Number(
        (execution.wallElapsedMs / 60000).toFixed(2)
      ),
      aggregateModelMinutes: Number(
        (execution.modelWorkElapsedMs / 60000).toFixed(2)
      ),
      maximumParallelContextsObserved,
      retries: 0,
      timeoutExtensions: 0,
      semanticCorrections: 0,
      authentication: execution.authentication,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      modelAuthoredScores: 0,
      scoresDerived: 0,
    },
    null,
    2
  )
);
