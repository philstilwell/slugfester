#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { validatePostCanaryBatch16PublicationOutput } from "./lib/assessment-production-post-canary-batch-16-publication-validation.mjs";

const root = "docs/assessment-production/post-canary-continuation-v1/batch-16/publication-reconstruction";
const recoveryRoot = `${root}/failure-recovery/level-2`;
const protocolId = "assessment-production-post-canary-batch-16-publication-initial-context-continuation";
const mode = process.argv.find((arg) => ["--prepare", "--activate", "--run", "--analyze"].includes(arg));
const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--at");
const at = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assert(mode, "one mode is required");
if (["--prepare", "--activate"].includes(mode)) assert(at && !Number.isNaN(Date.parse(at)), "--at requires an ISO timestamp");

const files = {
  originalActivation: `${root}/execution-activation.json`,
  originalExecution: `${root}/model-execution.json`,
  originalAnalysis: `${root}/analysis.json`,
  recoveredOutput: `${root}/outputs/debate-16.json`,
  recoveredValidation: `${root}/validations/debate-16.json`,
  recoveredProvenance: `${root}/provenance/debate-16.json`,
  recoveryAnalysis: `${recoveryRoot}/analysis.json`,
  preparation: `${root}/continuation-execution-preparation-manifest.json`,
  activation: `${root}/continuation-execution-activation.json`,
  execution: `${root}/model-execution-continuation.json`,
  analysis: `${root}/continuation-analysis.json`
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const readJson = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const invoke = (command, args, options, timeoutMs) => new Promise((resolve) => {
  const child = spawn(command, args, { ...options, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  let timedOut = false;
  let forceTimer = null;
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const terminate = (signal) => {
    try { process.kill(-child.pid, signal); } catch { child.kill(signal); }
  };
  const timer = setTimeout(() => {
    timedOut = true;
    terminate("SIGTERM");
    forceTimer = setTimeout(() => terminate("SIGKILL"), 5000);
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

if (mode === "--prepare") {
  const [originalActivation, originalExecution, recoveryAnalysis, recoveredValidation] = await Promise.all([
    files.originalActivation, files.originalExecution, files.recoveryAnalysis, files.recoveredValidation
  ].map(readJson));
  assert.equal(originalExecution.status, "post-canary-batch-16-publication-gate-complete-with-failure");
  assert.deepEqual(originalExecution.unattemptedContextIndexes, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(recoveryAnalysis.status, "batch-16-publication-two-level-one-field-recovery-passed");
  assert.equal(recoveredValidation.status, "passed");
  const contexts = originalActivation.contexts.slice(1);
  assert.deepEqual(contexts.map((item) => item.contextIndex), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const context of contexts) {
    assert(!(await exists(context.rawOutput)), `${context.rawOutput}: unattempted output unexpectedly exists`);
    assert(!(await exists(context.validation)), `${context.validation}: unattempted validation unexpectedly exists`);
    assert(!(await exists(context.provenance)), `${context.provenance}: unattempted provenance unexpectedly exists`);
  }
  const sourceFiles = [
    files.originalActivation, files.originalExecution, files.originalAnalysis,
    files.recoveredOutput, files.recoveredValidation, files.recoveredProvenance,
    files.recoveryAnalysis,
    ...Object.keys(originalActivation.sourceHashes),
    "scripts/assessment-production-post-canary-batch-16-publication-continuation.mjs"
  ];
  const sourceHashes = {};
  for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
  const futureOutputs = [files.activation, files.execution, files.analysis, ...contexts.flatMap((context) => [context.rawOutput, context.validation, context.provenance])];
  for (const file of [files.preparation, ...futureOutputs]) assert(!(await exists(file)), `${file}: future output exists`);
  const manifest = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-continuation-preparation",
    protocolId,
    status: "frozen-nine-unattempted-batch-16-publication-contexts-prepared-not-activated",
    frozenAt: at,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    productionCanary: false,
    batchNumber: 16,
    stagingOnly: true,
    recoveredCanary: { debateNumber: "16", completeValidationPassed: true, twoRecoveryLevelsUsed: true },
    model: structuredClone(originalActivation.model),
    modelInputs: structuredClone(originalActivation.modelInputs),
    contexts: structuredClone(contexts),
    executionPolicy: {
      contexts: 9,
      attemptsPerContext: 1,
      retriesMaximum: 0,
      timeoutExtensionsMaximum: 0,
      correctionContextsMaximum: 0,
      timeoutMsPerContext: originalActivation.executionPolicy.timeoutMsPerContext,
      maximumParallelContexts: 2,
      schedulerRamp: [2],
      rampPhases: [
        { phase: "resumed-ramp-two", maximumParallelContexts: 2, contextIndexes: [1, 2], expansionRequiresAllValid: true },
        { phase: "resumed-steady-two", maximumParallelContexts: 2, contextIndexes: [3, 4, 5, 6, 7, 8, 9], expansionRequiresAllValid: false }
      ],
      authentication: "ChatGPT subscription",
      APIKeysRemoved: true,
      removedEnvironmentVariables: structuredClone(originalActivation.executionPolicy.removedEnvironmentVariables),
      directIncrementalCostUsdMaximum: 0,
      paidServices: false,
      separateActivationRequired: true
    },
    sourceHashes,
    futureOutputs,
    authorization: { activation: true, modelExecution: false, deterministicAnalysis: false, recoveryPreparation: false, retries: false, scorePass: false, productionMutation: false, nextBatchSelection: false },
    nextAuthorizedAction: "activate-nine-previously-unattempted-batch-16-publication-contexts"
  };
  if (shouldWrite) await writeFile(path.resolve(files.preparation), pretty(manifest));
  console.log(pretty({ status: shouldWrite ? manifest.status : "preview", debates: contexts.map((item) => item.debateNumber), contexts: 9, attemptsMaximum: 9, retriesMaximum: 0, maximumParallelContexts: 2, directIncrementalCostUsdMaximum: 0, modelExecutionAuthorized: false }));
  process.exit(0);
}

if (mode === "--activate") {
  const preparationBytes = await readFile(path.resolve(files.preparation));
  const preparation = JSON.parse(preparationBytes);
  assert.equal(preparation.status, "frozen-nine-unattempted-batch-16-publication-contexts-prepared-not-activated");
  assert(!(await exists(files.activation)), "activation exists");
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source changed: ${file}`);
  const activation = { ...preparation, schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-continuation-activation", status: "frozen-nine-unattempted-batch-16-publication-contexts-authorized", activatedAt: at, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), preparation: { path: files.preparation, sha256: sha256(preparationBytes) }, authorization: { ...preparation.authorization, modelExecution: true, deterministicAnalysis: true }, nextAuthorizedAction: "execute-nine-previously-unattempted-batch-16-publication-contexts-once" };
  if (shouldWrite) await writeFile(path.resolve(files.activation), pretty(activation));
  console.log(pretty({ status: shouldWrite ? activation.status : "preview", debates: activation.contexts.map((item) => item.debateNumber), contexts: 9, attemptsMaximum: 9, retriesMaximum: 0, directIncrementalCostUsdMaximum: 0, modelExecutionAuthorized: shouldWrite }));
  process.exit(0);
}

if (mode === "--run") {
  const activation = await readJson(files.activation);
  assert.equal(activation.status, "frozen-nine-unattempted-batch-16-publication-contexts-authorized");
  for (const [file, digest] of Object.entries(activation.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source changed: ${file}`);
  for (const future of activation.futureOutputs) {
    if (future !== files.activation) {
      assert(!(await exists(future)), `future output exists: ${future}`);
    }
  }
  const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  let activeContexts = 0;
  let maximumObservedConcurrency = 0;
  const execute = async (context) => {
    const temporary = await mkdtemp(path.join(os.tmpdir(), `batch-16-publication-continuation-${context.debateNumber}-`));
    const temporaryHome = await mkdtemp(path.join(os.tmpdir(), `batch-16-publication-continuation-home-${context.debateNumber}-`));
    const startedAt = new Date().toISOString();
    const started = Date.now();
    activeContexts += 1;
    maximumObservedConcurrency = Math.max(maximumObservedConcurrency, activeContexts);
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
      for (const [source, target] of copies) await copyFile(path.resolve(source), path.join(temporary, target));
      await copyFile(authSource, path.join(temporaryHome, "auth.json"));
      const environment = { ...process.env, CODEX_HOME: temporaryHome };
      for (const key of activation.executionPolicy.removedEnvironmentVariables) delete environment[key];
      const prompt = [
        "Read production-workflow.md, readiness-workflow.md, output-contract.md, manual.md, reference-catalog.json, packet.json, and schema.json completely and no other files.",
        `Act only as the fresh isolated publication editor for Debate ${context.debateNumber}.`,
        "Participant judgment, adjudication, move selection, and every score are closed and immutable; participant judgment was score-blind.",
        "Author every required schema field once. For each critique, use exactly four ordered labeled sentences, target 108–115 words, remain within 105–125 words for a safety margin below the 130-word ceiling, and use at least 880 characters.",
        "Count every critique before returning. Verify representative quotes are exact contiguous source substrings.",
        "Never infer, emit, recalculate, or suggest changing a score; never consult legacy assessments or other debates; never attribute AI material to a participant.",
        "Return exactly one schema-conforming JSON object and nothing else."
      ].join(" ");
      console.error(`[batch-16-publication-continuation] starting index ${context.contextIndex} Debate ${context.debateNumber}`);
      const invocation = await invoke(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", activation.model.slug, "-c", `model_reasoning_effort=\"${activation.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, activation.executionPolicy.timeoutMsPerContext);
      const base = { contextIndex: context.contextIndex, debateNumber: context.debateNumber, debateId: context.debateId, model: activation.model.label, reasoningEffort: activation.model.reasoningEffort, attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, correctionContextCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, authentication: "ChatGPT subscription", apiKeysRemoved: true, isolatedTemporaryCodexHome: true, isolatedTemporaryWorkingDirectory: true, participantJudgmentWasScoreBlind: true, ownDebateScoresImmutable: true, copiedInputBytes: context.copiedInputBytes, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0, scorePassesExecutedThisStage: 0, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
      if (invocation.error || invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !(await exists(path.join(temporary, "result.json")))) return { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", gateAcceptancePassed: false, outputWritten: false, validationWritten: false, provenanceWritten: false, failureMessage: String(invocation.error ?? invocation.stderr).slice(-10000) };
      const resultBytes = await readFile(path.join(temporary, "result.json"));
      await writeFile(path.resolve(context.rawOutput), resultBytes);
      let validationSummary = null;
      let validationMessage = null;
      try { validationSummary = validatePostCanaryBatch16PublicationOutput(JSON.parse(resultBytes), JSON.parse(await readFile(path.resolve(context.packet), "utf8"))); } catch (error) { validationMessage = String(error?.stack ?? error).slice(-10000); }
      const accepted = validationSummary?.status === "passed";
      const validationRecord = { schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-validation", protocolId: "assessment-production-post-canary-batch-16-publication-reconstruction", status: accepted ? "passed" : "failed", debateNumber: context.debateNumber, debateId: context.debateId, outputSha256: sha256(resultBytes), validationSummary, validationMessage, modelAuthoredScores: 0, lockedScoresUnchanged: accepted ? true : null };
      const provenance = { schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-continuation-provenance", protocolId, debateNumber: context.debateNumber, debateId: context.debateId, model: activation.model, authentication: "ChatGPT subscription", reasoningEffort: activation.model.reasoningEffort, attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, correctionContextCount: 0, apiKeysRemoved: true, isolatedTemporaryCodexHome: true, isolatedTemporaryWorkingDirectory: true, participantJudgmentWasScoreBlind: true, ownDebateScoresImmutable: true, outputSha256: sha256(resultBytes), modelAuthoredScores: 0, scorePassesExecutedThisStage: 0, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0 };
      const validationBytes = Buffer.from(pretty(validationRecord));
      const provenanceBytes = Buffer.from(pretty(provenance));
      await writeFile(path.resolve(context.validation), validationBytes);
      await writeFile(path.resolve(context.provenance), provenanceBytes);
      return { ...base, status: accepted ? "completed-valid" : "output-validation-failed", gateAcceptancePassed: accepted, outputWritten: true, outputSha256: sha256(resultBytes), validationWritten: true, validationSha256: sha256(validationBytes), provenanceWritten: true, provenanceSha256: sha256(provenanceBytes), validationSummary, validationMessage };
    } catch (error) {
      return { contextIndex: context.contextIndex, debateNumber: context.debateNumber, debateId: context.debateId, model: activation.model.label, reasoningEffort: activation.model.reasoningEffort, attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, correctionContextCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, authentication: "ChatGPT subscription", apiKeysRemoved: true, participantJudgmentWasScoreBlind: true, ownDebateScoresImmutable: true, copiedInputBytes: context.copiedInputBytes, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0, scorePassesExecutedThisStage: 0, status: "runner-error", gateAcceptancePassed: false, outputWritten: await exists(context.rawOutput), validationWritten: await exists(context.validation), provenanceWritten: await exists(context.provenance), failureMessage: String(error?.stack ?? error).slice(-10000) };
    } finally {
      activeContexts -= 1;
      await rm(temporary, { recursive: true, force: true });
      await rm(temporaryHome, { recursive: true, force: true });
    }
  };
  const runPool = async (indexes) => {
    const queue = [...indexes];
    const completed = [];
    const worker = async () => {
      while (queue.length) {
        const index = queue.shift();
        const context = activation.contexts.find((item) => item.contextIndex === index);
        assert(context, `context ${index}: continuation context missing`);
        completed.push(await execute(context));
      }
    };
    await Promise.all(Array.from({ length: Math.min(2, indexes.length) }, worker));
    return completed.sort((left, right) => left.contextIndex - right.contextIndex);
  };
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const results = [];
  const rampPhases = [];
  let expansionAuthorized = true;
  for (const phase of activation.executionPolicy.rampPhases) {
    if (!expansionAuthorized) {
      rampPhases.push({ ...phase, attemptedContextIndexes: [], validContextIndexes: [], passed: false, skippedBecausePriorRampFailed: true });
      continue;
    }
    const phaseResults = await runPool(phase.contextIndexes);
    results.push(...phaseResults);
    const validContextIndexes = phaseResults.filter((item) => item.gateAcceptancePassed).map((item) => item.contextIndex);
    const passed = validContextIndexes.length === phase.contextIndexes.length;
    rampPhases.push({ ...phase, attemptedContextIndexes: phaseResults.map((item) => item.contextIndex), validContextIndexes, passed, skippedBecausePriorRampFailed: false });
    if (phase.expansionRequiresAllValid && !passed) expansionAuthorized = false;
  }
  results.sort((left, right) => left.contextIndex - right.contextIndex);
  const unattemptedContextIndexes = activation.contexts.map((item) => item.contextIndex).filter((index) => !results.some((item) => item.contextIndex === index));
  const validContexts = results.filter((item) => item.gateAcceptancePassed).length;
  const passed = results.length === 9 && validContexts === 9;
  const execution = { schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-continuation-execution", protocolId, status: passed ? "nine-unattempted-batch-16-publication-contexts-passed" : "batch-16-publication-continuation-complete-with-failure", startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, contextsPlanned: 9, contextsAttempted: results.length, contextsUnattempted: unattemptedContextIndexes.length, unattemptedContextIndexes, validContexts, invalidContexts: results.length - validContexts, attempts: results.length, retries: 0, timeoutExtensions: 0, correctionContexts: 0, maximumObservedConcurrency, schedulerRamp: [2], rampPhases, results, participantJudgmentWasScoreBlind: true, ownDebateScoresImmutable: true, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0, scorePassesExecutedThisStage: 0, authorization: { deterministicAnalysis: true, recoveryPreparation: !passed, retry: false, timeoutExtension: false, scorePass: false, publicationFinalization: false, productionMutation: false, nextBatchSelection: false } };
  await writeFile(path.resolve(files.execution), pretty(execution));
  console.log(pretty({ status: execution.status, contextsAttempted: execution.contextsAttempted, unattemptedContextIndexes, validContexts, invalidContexts: execution.invalidContexts, wallElapsedMinutes: Number((execution.elapsedMs / 60000).toFixed(2)), retries: 0, timeoutExtensions: 0, directIncrementalCostUsd: 0 }));
  process.exit(0);
}

if (mode === "--analyze") {
  const [activation, execution] = await Promise.all([files.activation, files.execution].map(readJson));
  const validationReplay = [];
  for (const result of execution.results) {
    const context = activation.contexts.find((item) => item.contextIndex === result.contextIndex);
    if (!result.gateAcceptancePassed) {
      validationReplay.push({ contextIndex: result.contextIndex, debateNumber: result.debateNumber, status: result.status, gateAcceptancePassed: false, validationReplayed: false });
      continue;
    }
    const validation = validatePostCanaryBatch16PublicationOutput(await readJson(context.rawOutput), await readJson(context.packet));
    validationReplay.push({ contextIndex: result.contextIndex, debateNumber: result.debateNumber, status: result.status, gateAcceptancePassed: true, validationReplayed: true, validation });
  }
  const valid = validationReplay.filter((item) => item.gateAcceptancePassed);
  const passed = execution.status === "nine-unattempted-batch-16-publication-contexts-passed" && valid.length === 9;
  const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-continuation-analysis", protocolId, status: passed ? "batch-16-publication-continuation-gate-passed" : "batch-16-publication-continuation-gate-failed", batchNumber: 16, productionCanary: false, stagingOnly: true, execution: { contextsPlanned: 9, contextsAttempted: execution.contextsAttempted, contextsUnattempted: execution.contextsUnattempted, validContexts: execution.validContexts, invalidContexts: execution.invalidContexts, attempts: execution.attempts, retries: 0, timeoutExtensions: 0, maximumObservedConcurrency: execution.maximumObservedConcurrency }, validationReplay, totals: { debates: 9, critiques: valid.reduce((sum, item) => sum + item.validation.critiques, 0), exactSourceQuotes: valid.reduce((sum, item) => sum + item.validation.quoteExactSourceMatches, 0), overallCommentarySides: valid.reduce((sum, item) => sum + item.validation.overallCommentarySides, 0), aiExtensionSides: valid.reduce((sum, item) => sum + item.validation.aiExtensionSides, 0), modelContexts: execution.contextsAttempted, modelAuthoredScores: 0, scorePassesExecutedThisStage: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 }, integrity: { recoveredCanaryRetained: true, scoresRemainedImmutable: true, everyAcceptedOutputReplayedDeterministically: valid.every((item) => item.validationReplayed), retriesPerformed: false, timeoutExtensionsPerformed: false, productionMutated: false }, authorization: { failureDiagnosis: !passed, recoveryPacketPreparation: !passed, deterministicCohortFinalization: passed, scorePass: false, publicationFinalization: false, productionMutation: false, nextBatchSelection: false }, nextAuthorizedAction: passed ? "finalize-and-validate-the-complete-ten-debate-batch-16-publication-cohort" : "diagnose-and-recover-only-the-failed-or-unattempted-publication-fields" };
  if (shouldWrite) await writeFile(path.resolve(files.analysis), pretty(analysis));
  console.log(pretty({ status: analysis.status, contextsAttempted: analysis.execution.contextsAttempted, contextsUnattempted: analysis.execution.contextsUnattempted, validContexts: analysis.execution.validContexts, invalidContexts: analysis.execution.invalidContexts, critiques: analysis.totals.critiques, directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }));
}
