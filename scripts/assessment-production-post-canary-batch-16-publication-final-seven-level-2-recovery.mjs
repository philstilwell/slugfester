#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { validatePostCanaryBatch16PublicationOutput } from "./lib/assessment-production-post-canary-batch-16-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";

const publicationRoot = "docs/assessment-production/post-canary-continuation-v1/batch-16/publication-reconstruction";
const levelOneRoot = `${publicationRoot}/final-seven-failure-recovery/level-1`;
const root = `${publicationRoot}/final-seven-failure-recovery/level-2`;
const protocolId = "assessment-production-post-canary-batch-16-publication-final-seven-level-2-one-field-recovery";
const model = { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription" };
const mode = process.argv.find((arg) => ["--prepare", "--activate", "--run", "--analyze"].includes(arg));
const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--at");
const at = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assert(mode, "one mode is required");
if (["--prepare", "--activate"].includes(mode)) assert(at && !Number.isNaN(Date.parse(at)), "--at requires an ISO timestamp");

const files = {
  diagnosis: `${publicationRoot}/failure-recovery/diagnosis.json`,
  packet: `${publicationRoot}/packets/debate-92.json`,
  failedOutput: `${publicationRoot}/outputs/debate-92.json`,
  failedValidation: `${publicationRoot}/validations/debate-92.json`,
  failedProvenance: `${publicationRoot}/provenance/debate-92.json`,
  levelOneActivation: `${levelOneRoot}/execution-activation.json`,
  levelOneExecution: `${levelOneRoot}/model-execution.json`,
  levelOneAnalysis: `${levelOneRoot}/analysis.json`,
  workflow: "docs/assessment-production-workflow.md",
  outputContract: "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
  manual: `${root}/manual.md`,
  preparation: `${root}/execution-preparation-manifest.json`,
  activation: `${root}/execution-activation.json`,
  execution: `${root}/model-execution.json`,
  analysis: `${root}/analysis.json`
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const readJson = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const validateCritique = (value, moveId) => {
  const critique = String(value).trim();
  const words = wordCount(critique);
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  assert(words >= 105 && words <= 130, `${moveId}: critique word count ${words}`);
  assert(critique.length >= 880, `${moveId}: critique shorter than 880 characters`);
  assert.equal(sentences.length, 4, `${moveId}: critique sentence count`);
  labels.forEach((label, index) => {
    assert(sentences[index].toLowerCase().startsWith(label), `${moveId}: label ${index + 1}`);
    assert(/[.!?]["')\]]?$/.test(sentences[index].trim()), `${moveId}: punctuation ${index + 1}`);
  });
  return { words, characters: critique.length, sentences: 4 };
};
const spawnRun = (command, args, options, timeoutMs) => new Promise((resolve) => {
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
  const [diagnosis, packet, failedOutput, levelOneActivation, levelOneExecution, levelOneAnalysis] = await Promise.all([
    files.diagnosis, files.packet, files.failedOutput, files.levelOneActivation, files.levelOneExecution, files.levelOneAnalysis
  ].map(readJson));
  assert.equal(levelOneAnalysis.status, "batch-16-publication-final-seven-recovery-level-1-gate-failed");
  assert.equal(levelOneExecution.validContexts, 8);
  assert.equal(levelOneExecution.invalidContexts, 1);
  const failedMoveIds = levelOneAnalysis.failedFields.map((field) => field.split(".")[1]);
  assert.deepEqual(failedMoveIds, ["pro-eternal-countdown-earlier-completion"]);
  const contexts = failedMoveIds.map((moveId, contextIndex) => {
    const move = packet.moves.find((item) => item.moveId === moveId);
    const immutable = failedOutput.moveProse[moveId];
    assert(move && immutable, `${moveId}: recovery source missing`);
    const shardId = `debate-92-${moveId}-critique-recovery-2`;
    const repairPacket = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-one-field-repair-packet",
      protocolId,
      contextIndex,
      shardId,
      debateNumber: "92",
      debateId: packet.debateId,
      assessmentModel: model.label,
      recoveryLevel: 2,
      writableField: `moveProse.${moveId}.critique`,
      target: {
        moveId,
        lockedMove: move,
        immutableCompanionFields: { role: immutable.role, words: immutable.words, tags: immutable.tags },
        rejectedPriorStringsAvailable: false
      },
      allOtherFieldsUnavailableAndImmutable: true,
      participantJudgmentClosed: true,
      publicationScoreLocked: true
    };
    const properties = {
      schemaVersion: { type: "string", const: "1.0-assessment-production-post-canary-batch-16-publication-one-field-repair-output" },
      protocolId: { type: "string", const: protocolId },
      contextIndex: { type: "integer", const: contextIndex },
      shardId: { type: "string", const: shardId },
      debateNumber: { type: "string", const: "92" },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: model.label },
      completedAt: { type: "string", minLength: 1 },
      correction: {
        type: "object",
        additionalProperties: false,
        required: ["moveId", "critique"],
        properties: { moveId: { type: "string", const: moveId }, critique: { type: "string", minLength: 880, maxLength: 1800 } }
      }
    };
    const schema = { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `slugfester-batch-16-${shardId}`, type: "object", additionalProperties: false, required: Object.keys(properties), properties };
    const packetPath = `${root}/packets/context-${contextIndex}.json`;
    const schemaPath = `${root}/schemas/context-${contextIndex}.schema.json`;
    const outputPath = `${root}/outputs/context-${contextIndex}.json`;
    return { contextIndex, shardId, debateNumber: "92", debateId: packet.debateId, moveId, writableField: `moveProse.${moveId}.critique`, packet: packetPath, packetSha256: sha256(pretty(repairPacket)), schema: schemaPath, schemaSha256: sha256(pretty(schema)), output: outputPath, repairPacket, schemaDocument: schema };
  });
  assert.equal(new Set(contexts.map((item) => item.writableField)).size, 1);
  const successfulLevelOneOutputs = levelOneExecution.results
    .filter((item) => item.gateAcceptancePassed)
    .map((item) => levelOneActivation.contexts[item.contextIndex].output);
  assert.equal(successfulLevelOneOutputs.length, 8);
  const sourceFiles = [
    files.diagnosis, files.packet, files.failedOutput, files.failedValidation, files.failedProvenance,
    files.levelOneActivation, files.levelOneExecution, files.levelOneAnalysis, ...successfulLevelOneOutputs,
    files.workflow, files.outputContract, files.manual,
    "scripts/assessment-production-post-canary-batch-16-publication-final-seven-level-2-recovery.mjs",
    "scripts/lib/assessment-production-post-canary-batch-16-publication-validation.mjs"
  ];
  const sourceHashes = {};
  for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
  for (const context of contexts) {
    sourceHashes[context.packet] = context.packetSha256;
    sourceHashes[context.schema] = context.schemaSha256;
  }
  const futureOutputs = [files.activation, files.execution, files.analysis, ...contexts.map((item) => item.output)];
  for (const file of [files.preparation, ...futureOutputs]) assert(!(await exists(file)), `future output exists: ${file}`);
  if (shouldWrite) {
    for (const context of contexts) {
      await mkdir(path.dirname(path.resolve(context.packet)), { recursive: true });
      await mkdir(path.dirname(path.resolve(context.schema)), { recursive: true });
      await mkdir(path.dirname(path.resolve(context.output)), { recursive: true });
      await writeFile(path.resolve(context.packet), pretty(context.repairPacket));
      await writeFile(path.resolve(context.schema), pretty(context.schemaDocument));
    }
  }
  const manifestContexts = contexts.map(({ repairPacket, schemaDocument, ...context }) => context);
  const manifest = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-level-2-recovery-preparation",
    protocolId,
    status: "frozen-one-field-batch-16-publication-final-seven-recovery-level-2-prepared-not-activated",
    frozenAt: at,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    productionCanary: false,
    batchNumber: 16,
    stagingOnly: true,
    recoveryLevel: 2,
    recoveryLevelsMaximum: 2,
    model,
    contexts: manifestContexts,
    levelOneAcceptedContexts: 7,
    executionPolicy: { contexts: 1, maximumParallelContexts: 2, attemptsPerContext: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0, timeoutMsPerContext: 600000, writableFieldsPerPacket: 1, preserveRawResultBeforeValidation: true, directIncrementalCostUsdMaximum: 0, paidServices: false, separateActivationRequired: true, APIKeysRemoved: true, removedEnvironmentVariables: ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"] },
    sourceHashes,
    futureOutputs,
    authorization: { preparation: true, activation: true, modelExecution: false, deterministicMergeAndValidation: false, retries: false, furtherOrdinaryRecoveryLevel: false, exceptionalThirdLevelForAtomicCompanionLossOnly: false, scorePass: false, productionMutation: false, nextBatchSelection: false },
    nextAuthorizedAction: "activate-one-fresh-one-field-batch-16-publication-final-seven-recovery-level-2-context"
  };
  if (shouldWrite) await writeFile(path.resolve(files.preparation), pretty(manifest));
  console.log(pretty({ status: shouldWrite ? manifest.status : "preview", contexts: 1, writableFields: 1, attemptsMaximum: 1, retriesMaximum: 0, recoveryLevel: 2, directIncrementalCostUsdMaximum: 0, modelExecutionAuthorized: false }));
  process.exit(0);
}

if (mode === "--activate") {
  const preparationBytes = await readFile(path.resolve(files.preparation));
  const preparation = JSON.parse(preparationBytes);
  assert.equal(preparation.status, "frozen-one-field-batch-16-publication-final-seven-recovery-level-2-prepared-not-activated");
  assert(!(await exists(files.activation)), "activation exists");
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source changed: ${file}`);
  const activation = { ...preparation, schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-final-seven-level-2-recovery-activation", status: "frozen-one-field-batch-16-publication-final-seven-recovery-level-2-authorized", activatedAt: at, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), preparation: { path: files.preparation, sha256: sha256(preparationBytes) }, authorization: { ...preparation.authorization, modelExecution: true, deterministicMergeAndValidation: true }, nextAuthorizedAction: "execute-one-fresh-one-field-batch-16-publication-final-seven-recovery-level-2-context-once" };
  if (shouldWrite) await writeFile(path.resolve(files.activation), pretty(activation));
  console.log(pretty({ status: shouldWrite ? activation.status : "preview", contexts: 1, attemptsMaximum: 1, retriesMaximum: 0, recoveryLevel: 2, directIncrementalCostUsdMaximum: 0, modelExecutionAuthorized: shouldWrite }));
  process.exit(0);
}

if (mode === "--run") {
  const activation = await readJson(files.activation);
  assert.equal(activation.status, "frozen-one-field-batch-16-publication-final-seven-recovery-level-2-authorized");
  for (const [file, digest] of Object.entries(activation.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source changed: ${file}`);
  for (const context of activation.contexts) assert(!(await exists(context.output)), `output exists: ${context.output}`);
  const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  const execute = async (context) => {
    const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-b16-pub-r2-${context.contextIndex}-`));
    const temporaryHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-b16-pub-r2-home-${context.contextIndex}-`));
    const startedAt = new Date().toISOString();
    const started = Date.now();
    try {
      await Promise.all([
        copyFile(path.resolve(files.workflow), path.join(temporary, "workflow.md")),
        copyFile(path.resolve(files.outputContract), path.join(temporary, "output-contract.md")),
        copyFile(path.resolve(files.manual), path.join(temporary, "manual.md")),
        copyFile(path.resolve(context.packet), path.join(temporary, "packet.json")),
        copyFile(path.resolve(context.schema), path.join(temporary, "schema.json")),
        copyFile(authSource, path.join(temporaryHome, "auth.json"))
      ]);
      const environment = { ...process.env, CODEX_HOME: temporaryHome };
      for (const key of activation.executionPolicy.removedEnvironmentVariables) delete environment[key];
      const prompt = "Read workflow.md, output-contract.md, manual.md, packet.json, and schema.json completely and no other files. Act only as the fresh isolated 5.6 Sol/low Batch 16 level-2 one-field publication recovery editor. Author exactly the single writable critique. All rejected prior strings are unavailable. Count words and retain a safety margin below 130. Return exactly one schema-conforming JSON object and no commentary.";
      const invocation = await spawnRun(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", model.slug, "-c", `model_reasoning_effort=\"${model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, activation.executionPolicy.timeoutMsPerContext);
      const events = extractTransportEvents(invocation.stderr);
      const transportClassification = classifyTransportEventCount(events.length, 2, 8);
      const base = { contextIndex: context.contextIndex, shardId: context.shardId, debateNumber: "92", moveId: context.moveId, writableField: context.writableField, attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, model: model.label, reasoningEffort: model.reasoningEffort, authentication: model.authentication, apiKeysRemoved: true, transportClassification, recoverableStreamEvents: events.length, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr), directIncrementalCostUsd: 0 };
      if (invocation.error || invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) return { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, gateAcceptancePassed: false, failureMessage: String(invocation.error ?? invocation.stderr).slice(-6000) };
      const resultBytes = await readFile(path.join(temporary, "result.json"));
      await writeFile(path.resolve(context.output), resultBytes);
      const output = JSON.parse(resultBytes);
      assert.equal(output.contextIndex, context.contextIndex);
      assert.equal(output.shardId, context.shardId);
      assert.equal(output.correction.moveId, context.moveId);
      const validation = validateCritique(output.correction.critique, context.moveId);
      return { ...base, status: transportClassification === "invalid" ? "transport-event-limit-exceeded" : "completed-valid", outputWritten: true, outputSha256: sha256(resultBytes), validation, gateAcceptancePassed: transportClassification !== "invalid" };
    } catch (error) {
      return { contextIndex: context.contextIndex, shardId: context.shardId, debateNumber: "92", moveId: context.moveId, writableField: context.writableField, attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, model: model.label, reasoningEffort: model.reasoningEffort, authentication: model.authentication, directIncrementalCostUsd: 0, status: "output-validation-failed", outputWritten: await exists(context.output), outputSha256: await exists(context.output) ? sha256(await readFile(path.resolve(context.output))) : null, gateAcceptancePassed: false, validationMessage: String(error?.stack ?? error).slice(-6000) };
    } finally {
      await rm(temporary, { recursive: true, force: true });
      await rm(temporaryHome, { recursive: true, force: true });
    }
  };
  const startedAt = new Date().toISOString();
  const started = Date.now();
  console.error(`[batch-16-publication-final-seven-recovery-2] starting ${activation.contexts.map((item) => item.moveId).join(", ")}`);
  const results = await Promise.all(activation.contexts.map(execute));
  for (const result of results) console.error(`[batch-16-publication-final-seven-recovery-2] ${result.moveId} ${result.status} ${(result.elapsedMs / 60000).toFixed(2)}m`);
  const passed = results.every((item) => item.gateAcceptancePassed);
  const execution = { schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-final-seven-level-2-recovery-execution", protocolId, status: passed ? "one-field-batch-16-publication-final-seven-recovery-level-2-execution-passed" : "batch-16-publication-final-seven-recovery-level-2-execution-failed", startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, contextsAttempted: 1, validContexts: results.filter((item) => item.gateAcceptancePassed).length, invalidContexts: results.filter((item) => !item.gateAcceptancePassed).length, attempts: 1, retries: 0, timeoutExtensions: 0, directIncrementalCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0, results, authorization: { analysis: true, retries: false, furtherOrdinaryRecoveryLevel: false, exceptionalThirdLevelForAtomicCompanionLossOnly: false, paidServices: false, scorePass: false, productionMutation: false, nextBatchSelection: false } };
  await writeFile(path.resolve(files.execution), pretty(execution));
  console.log(pretty({ status: execution.status, contextsAttempted: 1, validContexts: execution.validContexts, invalidContexts: execution.invalidContexts, elapsedMinutes: Number((execution.elapsedMs / 60000).toFixed(2)), attempts: 1, retries: 0, recoveryLevel: 2, directIncrementalCostUsd: 0 }));
  process.exit(0);
}

if (mode === "--analyze") {
  const [activation, execution, packet, failedOutput, failedOutputBytes, failedValidationBytes, failedProvenanceBytes, levelOneActivation, levelOneExecution] = await Promise.all([
    readJson(files.activation), readJson(files.execution), readJson(files.packet), readJson(files.failedOutput), readFile(path.resolve(files.failedOutput)), readFile(path.resolve(files.failedValidation)), readFile(path.resolve(files.failedProvenance)), readJson(files.levelOneActivation), readJson(files.levelOneExecution)
  ]);
  if (execution.status !== "one-field-batch-16-publication-final-seven-recovery-level-2-execution-passed") {
    const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-final-seven-level-2-recovery-analysis", protocolId, status: "batch-16-publication-final-seven-recovery-exhausted", recoveryLevel: 2, recoveryLevelsMaximum: 2, originalFailurePreserved: true, contexts: 1, attempts: 1, retries: 0, validContexts: execution.validContexts, invalidContexts: execution.invalidContexts, failedFields: execution.results.filter((item) => !item.gateAcceptancePassed).map((item) => item.writableField), rejectedRawOutputsPreserved: execution.results.filter((item) => !item.gateAcceptancePassed).every((item) => item.outputWritten), directIncrementalCostUsd: 0, authorization: { furtherRecovery: false, scorePass: false, productionMutation: false, nextBatchSelection: false }, nextAuthorizedAction: "stop-for-substantive-publication-recovery-blocker" };
    if (shouldWrite) await writeFile(path.resolve(files.analysis), pretty(analysis));
    console.log(pretty(analysis));
    process.exit(0);
  }
  const merged = structuredClone(failedOutput);
  for (const result of levelOneExecution.results.filter((item) => item.gateAcceptancePassed)) {
    const context = levelOneActivation.contexts[result.contextIndex];
    const output = await readJson(context.output);
    if (context.kind === "critique") {
      validateCritique(output.correction.text, context.failure.moveId);
      merged.moveProse[context.failure.moveId].critique = output.correction.text;
    } else {
      const words = wordCount(output.correction.text);
      assert(words >= 12 && words <= 55, `${context.field}: quote context word count ${words}`);
      merged.representativeQuotes[context.failure.side].context = output.correction.text;
    }
  }
  for (const context of activation.contexts) {
    const output = await readJson(context.output);
    validateCritique(output.correction.critique, context.moveId);
    merged.moveProse[context.moveId].critique = output.correction.critique;
  }
  const replay = structuredClone(merged);
  for (const context of levelOneActivation.contexts) {
    if (context.kind === "critique") {
      replay.moveProse[context.failure.moveId].critique = failedOutput.moveProse[context.failure.moveId].critique;
    } else {
      replay.representativeQuotes[context.failure.side].context = failedOutput.representativeQuotes[context.failure.side].context;
    }
  }
  assert.deepEqual(replay, failedOutput, "a non-target companion field changed during two-level recovery merge");
  const validation = validatePostCanaryBatch16PublicationOutput(merged, packet);
  assert.equal(validation.status, "passed");
  const mergedBytes = Buffer.from(pretty(merged));
  const validationRecord = { schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-validation", protocolId: merged.protocolId, status: "passed", debateNumber: "92", debateId: packet.debateId, outputSha256: sha256(mergedBytes), validationSummary: validation, validationMessage: null, modelAuthoredScores: 0, lockedScoresUnchanged: true };
  const provenance = { schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-final-seven-two-level-recovery-provenance", protocolId, debateNumber: "92", originalFailure: { status: "output-validation-failed", outputSha256: sha256(failedOutputBytes), preserved: true }, levelOne: { contexts: 9, validFields: 8, invalidFields: 1, attempts: 9, retries: 0 }, levelTwo: { contexts: 1, validFields: 1, invalidFields: 0, attempts: 1, retries: 0, rejectedPriorStringsUnavailable: true }, merge: { targetFieldsChanged: 9, acceptedCompanionFieldsChanged: false, scoresChanged: false, scorePassRerun: false, modelAuthoredScores: 0, completeValidationPassed: true }, outputSha256: sha256(mergedBytes) };
  const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-final-seven-level-2-recovery-analysis", protocolId, status: "batch-16-publication-final-seven-two-level-one-field-recovery-passed", recoveryLevel: 2, recoveryLevelsMaximum: 2, originalFailurePreserved: true, levelOneContexts: 9, levelTwoContexts: 1, totalAttempts: 10, retries: 0, repairedValidationFields: 9, recoveredDebate: "92", completeValidation: validation, directIncrementalCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0, authorization: { completeCohortFinalization: true, furtherRecoveryLevel: false, scorePass: false, productionMutation: false, nextBatchSelection: false }, nextAuthorizedAction: "finalize-and-validate-the-complete-ten-debate-batch-16-publication-cohort" };
  if (shouldWrite) {
    const preservedRoot = `${root}/preserved`;
    await mkdir(path.resolve(preservedRoot), { recursive: true });
    await writeFile(path.resolve(`${preservedRoot}/debate-92-original-output.json`), failedOutputBytes);
    await writeFile(path.resolve(`${preservedRoot}/debate-92-original-validation.json`), failedValidationBytes);
    await writeFile(path.resolve(`${preservedRoot}/debate-92-original-provenance.json`), failedProvenanceBytes);
    await writeFile(path.resolve(files.failedOutput), mergedBytes);
    await writeFile(path.resolve(files.failedValidation), pretty(validationRecord));
    await writeFile(path.resolve(files.failedProvenance), pretty(provenance));
    await writeFile(path.resolve(files.analysis), pretty(analysis));
  }
  console.log(pretty({ status: analysis.status, recoveredDebate: "92", levelOneContexts: 9, levelTwoContexts: 1, totalAttempts: 10, retries: 0, repairedValidationFields: 9, acceptedCompanionFieldsChanged: false, directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }));
}
