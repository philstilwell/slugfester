#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { wordCount } from "./lib/v388-reconstruction.mjs";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";

const publicationRoot = "docs/assessment-production/post-canary-continuation-v1/batch-15/publication-reconstruction";
const levelOneRoot = `${publicationRoot}/failure-recovery/level-1`;
const root = `${publicationRoot}/failure-recovery/level-2`;
const protocolId = "assessment-production-post-canary-batch-15-publication-level-2-atomic-field-recovery";
const model = { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription" };
const mode = process.argv.find((arg) => ["--prepare", "--activate", "--run", "--analyze"].includes(arg));
const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--at");
const at = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assert(mode, "one mode is required");
if (["--prepare", "--activate"].includes(mode)) assert(at && !Number.isNaN(Date.parse(at)), "--at requires an ISO timestamp");

const files = {
  diagnosis: `${publicationRoot}/failure-recovery/diagnosis.json`,
  levelOneActivation: `${levelOneRoot}/execution-activation.json`,
  levelOneExecution: `${levelOneRoot}/model-execution.json`,
  packet: `${publicationRoot}/packets/debate-178.json`,
  failedOutput: `${publicationRoot}/outputs/debate-178.json`,
  originalValidation: `${publicationRoot}/validations/debate-178.json`,
  originalProvenance: `${publicationRoot}/provenance/debate-178.json`,
  workflow: "docs/assessment-production-workflow.md",
  outputContract: "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
  manual: `${levelOneRoot}/manual.md`,
  preservationDefect: `${root}/level-1-preservation-defect.json`,
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
const validateCritique = (critique, moveId) => {
  const text = String(critique).trim();
  const words = wordCount(text);
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  assert(words >= 105 && words <= 130, `${moveId}: critique word count ${words}`);
  assert(text.length >= 880, `${moveId}: critique shorter than 880 characters`);
  assert.equal(sentences.length, 4, `${moveId}: critique sentence count`);
  labels.forEach((label, index) => {
    assert(sentences[index].toLowerCase().startsWith(label), `${moveId}: label ${index + 1}`);
    assert(/[.!?]["')\]]?$/.test(sentences[index].trim()), `${moveId}: punctuation ${index + 1}`);
  });
  return { words, characters: text.length, sentences: 4 };
};
const spawnRun = (command, args, options, timeoutMs) => new Promise((resolve) => {
  const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  let timedOut = false;
  let forceTimer = null;
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
  child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut }); });
});

if (mode === "--prepare") {
  const [diagnosis, levelOneActivation, levelOneExecution, packet, failedOutput] = await Promise.all([files.diagnosis, files.levelOneActivation, files.levelOneExecution, files.packet, files.failedOutput].map(readJson));
  assert.equal(diagnosis.status, "batch-15-publication-three-bounded-field-failures-and-one-timeout-diagnosed");
  assert.equal(levelOneExecution.status, "batch-15-publication-recovery-level-1-execution-failed");
  assert.equal(levelOneExecution.validContexts, 15);
  assert.equal(levelOneExecution.invalidContexts, 2);
  const failedResults = levelOneExecution.results.filter((item) => !item.gateAcceptancePassed);
  assert.deepEqual(failedResults.map((item) => [item.contextIndex, item.shardId, item.outputWritten]), [
    [9, "debate-178-field-repair-1", false],
    [10, "debate-178-field-repair-2", false]
  ]);
  const targets = failedResults.flatMap((result) => levelOneActivation.contexts[result.contextIndex].targets);
  assert.deepEqual(targets.map((target) => target.moveId), [
    "pro-internal-luke-acts-we-passages",
    "con-naming-authority-mechanism",
    "con-internal-matthew-luke-underdetermination",
    "con-mark-luke-natural-authority-names"
  ]);
  const defect = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-15-recovery-preservation-defect",
    status: "level-1-two-rejected-raw-shard-payloads-unavailable-metadata-and-validation-preserved",
    recordedAt: at,
    affectedContextIndexes: [9, 10],
    cause: "The level-one controller deleted each temporary result after runtime validation failed and before copying the rejected raw JSON into the repository.",
    preserved: { executionPath: files.levelOneExecution, executionSha256: sha256(await readFile(path.resolve(files.levelOneExecution))), fieldAssignments: true, outputHashes: false, timings: true, completeValidationErrors: true, stdoutAndStderrHashes: true },
    unrecoverable: { exactRejectedRawJson: true },
    correction: { levelTwoWritesRawOutputBeforeRuntimeValidation: true, freshAtomicSingleFieldShards: 4, rejectedProseReused: false }
  };
  const defectBytes = Buffer.from(pretty(defect));
  const contexts = [];
  for (const target of targets) {
    const contextIndex = contexts.length;
    const moveId = target.moveId;
    const lockedMove = packet.moves.find((move) => move.moveId === moveId);
    const immutable = failedOutput.moveProse[moveId];
    const repairPacket = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-level-2-atomic-repair-packet",
      protocolId, contextIndex, debateNumber: "178", debateId: packet.debateId,
      assessmentModel: model.label, writableFieldCount: 1,
      target: { kind: "critique", debateNumber: "178", moveId, lockedMove, immutablePublicationFields: { role: immutable.role, words: immutable.words, tags: immutable.tags }, rejectedPriorStringAvailable: false },
      allOtherFieldsUnavailableAndImmutable: true, participantJudgmentClosed: true, publicationScoreLocked: true
    };
    const properties = {
      schemaVersion: { type: "string", const: "1.0-assessment-production-post-canary-batch-15-publication-level-2-atomic-repair-output" },
      protocolId: { type: "string", const: protocolId }, contextIndex: { type: "integer", const: contextIndex },
      debateNumber: { type: "string", const: "178" }, debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: model.label }, completedAt: { type: "string", minLength: 1 },
      correction: { type: "object", additionalProperties: false, required: ["kind", "moveId", "critique"], properties: { kind: { type: "string", const: "critique" }, moveId: { type: "string", const: moveId }, critique: { type: "string", minLength: 880, maxLength: 1800 } } }
    };
    const schema = { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `slugfester-b15-debate178-level2-${contextIndex}`, type: "object", additionalProperties: false, required: Object.keys(properties), properties };
    const packetPath = `${root}/packets/context-${contextIndex}.json`;
    const schemaPath = `${root}/schemas/context-${contextIndex}.schema.json`;
    const rawOutputPath = `${root}/raw-outputs/context-${contextIndex}.json`;
    const outputPath = `${root}/outputs/context-${contextIndex}.json`;
    const packetText = pretty(repairPacket);
    const schemaText = pretty(schema);
    contexts.push({ contextIndex, debateNumber: "178", moveId, writableFieldCount: 1, packet: packetPath, packetSha256: sha256(packetText), schema: schemaPath, schemaSha256: sha256(schemaText), rawOutput: rawOutputPath, output: outputPath });
    if (shouldWrite) {
      for (const directory of [path.dirname(packetPath), path.dirname(schemaPath), path.dirname(rawOutputPath), path.dirname(outputPath)]) await mkdir(path.resolve(directory), { recursive: true });
      await writeFile(path.resolve(packetPath), packetText);
      await writeFile(path.resolve(schemaPath), schemaText);
    }
  }
  const sourceFiles = [files.diagnosis, files.levelOneActivation, files.levelOneExecution, files.packet, files.failedOutput, files.originalValidation, files.originalProvenance, files.workflow, files.outputContract, files.manual, "scripts/assessment-production-post-canary-batch-15-publication-level-2-recovery.mjs"];
  const sourceHashes = {};
  for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
  sourceHashes[files.preservationDefect] = sha256(defectBytes);
  for (const context of contexts) { sourceHashes[context.packet] = context.packetSha256; sourceHashes[context.schema] = context.schemaSha256; }
  const futureOutputs = [files.activation, files.execution, files.analysis, ...contexts.flatMap((context) => [context.rawOutput, context.output])];
  for (const file of futureOutputs) assert(!(await exists(file)), `future output exists: ${file}`);
  const manifest = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-level-2-recovery-preparation",
    protocolId, status: "frozen-four-atomic-field-batch-15-publication-recovery-level-2-prepared-not-activated",
    frozenAt: at, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    productionCanary: false, batchNumber: 15, stagingOnly: true, recoveryLevel: 2, recoveryLevelsMaximum: 2,
    model, contexts,
    executionPolicy: { contexts: 4, maximumParallelContexts: 2, attemptsPerContext: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0, timeoutMsPerContext: 600000, writableFieldsMaximumPerPacket: 1, rawOutputPreservedBeforeRuntimeValidation: true, directIncrementalCostUsdMaximum: 0, paidServices: false, separateActivationRequired: true, APIKeysRemoved: true, removedEnvironmentVariables: ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"] },
    preservationDefect: { path: files.preservationDefect, sha256: sha256(defectBytes) }, sourceHashes, futureOutputs,
    authorization: { preparation: true, activation: true, modelExecution: false, deterministicValidation: false, retries: false, furtherOrdinaryRecoveryLevel: false, exceptionalThirdLevelOnlyForAtomicCompanionLoss: true, scorePass: false, productionMutation: false, nextBatchSelection: false },
    nextAuthorizedAction: "activate-four-fresh-atomic-batch-15-publication-recovery-level-2-contexts"
  };
  if (shouldWrite) {
    await writeFile(path.resolve(files.preservationDefect), defectBytes);
    await writeFile(path.resolve(files.preparation), pretty(manifest));
  }
  console.log(pretty({ status: shouldWrite ? manifest.status : "preview", contexts: 4, writableFields: 4, maximumWritableFieldsPerContext: 1, attemptsMaximum: 4, retriesMaximum: 0, recoveryLevel: 2, rawOutputPreservedBeforeValidation: true, directIncrementalCostUsdMaximum: 0, modelExecutionAuthorized: false }));
  process.exit(0);
}

if (mode === "--activate") {
  const bytes = await readFile(path.resolve(files.preparation));
  const preparation = JSON.parse(bytes);
  assert.equal(preparation.status, "frozen-four-atomic-field-batch-15-publication-recovery-level-2-prepared-not-activated");
  assert(!(await exists(files.activation)), "activation exists");
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source changed: ${file}`);
  const activation = { ...preparation, schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-level-2-recovery-activation", status: "frozen-four-atomic-field-batch-15-publication-recovery-level-2-authorized", activatedAt: at, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), preparation: { path: files.preparation, sha256: sha256(bytes) }, authorization: { ...preparation.authorization, modelExecution: true, deterministicValidation: true }, nextAuthorizedAction: "execute-four-fresh-atomic-batch-15-publication-recovery-level-2-contexts-once" };
  if (shouldWrite) await writeFile(path.resolve(files.activation), pretty(activation));
  console.log(pretty({ status: shouldWrite ? activation.status : "preview", contexts: 4, attemptsMaximum: 4, retriesMaximum: 0, recoveryLevel: 2, directIncrementalCostUsdMaximum: 0, modelExecutionAuthorized: shouldWrite }));
  process.exit(0);
}

if (mode === "--run") {
  const activation = await readJson(files.activation);
  assert.equal(activation.status, "frozen-four-atomic-field-batch-15-publication-recovery-level-2-authorized");
  for (const [file, digest] of Object.entries(activation.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source changed: ${file}`);
  const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  const execute = async (context) => {
    const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-b15-pub-r2-${context.contextIndex}-`));
    const temporaryHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-b15-pub-r2-home-${context.contextIndex}-`));
    const startedAt = new Date().toISOString();
    const started = Date.now();
    let rawOutputWritten = false;
    try {
      await Promise.all([copyFile(path.resolve(files.workflow), path.join(temporary, "workflow.md")), copyFile(path.resolve(files.outputContract), path.join(temporary, "output-contract.md")), copyFile(path.resolve(files.manual), path.join(temporary, "manual.md")), copyFile(path.resolve(context.packet), path.join(temporary, "packet.json")), copyFile(path.resolve(context.schema), path.join(temporary, "schema.json")), copyFile(authSource, path.join(temporaryHome, "auth.json"))]);
      const environment = { ...process.env, CODEX_HOME: temporaryHome };
      for (const key of activation.executionPolicy.removedEnvironmentVariables) delete environment[key];
      const prompt = `Read workflow.md, output-contract.md, manual.md, packet.json, and schema.json completely and no other files. Act only as the fresh isolated 5.6 Sol/low Debate 178 atomic level-two recovery editor for context ${context.contextIndex}. Author exactly one critique. Count it before returning and keep it within 112–118 words while satisfying the 880-character minimum and four ordered labeled sentences. Return exactly one schema-conforming JSON object and no commentary.`;
      const invocation = await spawnRun(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", model.slug, "-c", `model_reasoning_effort=\"${model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, activation.executionPolicy.timeoutMsPerContext);
      const events = extractTransportEvents(invocation.stderr);
      const transportClassification = classifyTransportEventCount(events.length, 2, 8);
      const base = { contextIndex: context.contextIndex, debateNumber: "178", moveId: context.moveId, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, model: model.label, reasoningEffort: model.reasoningEffort, authentication: model.authentication, apiKeysRemoved: true, transportClassification, recoverableStreamEvents: events.length, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr), stderrTail: invocation.stderr.trim().slice(-6000) || null, directIncrementalCostUsd: 0 };
      if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) return { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", rawOutputWritten: false, outputWritten: false, gateAcceptancePassed: false };
      const resultBytes = await readFile(path.join(temporary, "result.json"));
      await writeFile(path.resolve(context.rawOutput), resultBytes);
      rawOutputWritten = true;
      const output = JSON.parse(resultBytes);
      assert.equal(output.contextIndex, context.contextIndex);
      assert.equal(output.correction.moveId, context.moveId);
      const critiqueValidation = validateCritique(output.correction.critique, context.moveId);
      await writeFile(path.resolve(context.output), resultBytes);
      return { ...base, status: transportClassification === "invalid" ? "transport-event-limit-exceeded" : "completed-valid", rawOutputWritten: true, rawOutputSha256: sha256(resultBytes), outputWritten: true, outputSha256: sha256(resultBytes), critiqueValidation, gateAcceptancePassed: transportClassification !== "invalid" };
    } catch (error) {
      return { contextIndex: context.contextIndex, debateNumber: "178", moveId: context.moveId, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, model: model.label, reasoningEffort: model.reasoningEffort, authentication: model.authentication, directIncrementalCostUsd: 0, status: "output-validation-failed", rawOutputWritten, rawOutputSha256: rawOutputWritten ? sha256(await readFile(path.resolve(context.rawOutput))) : null, outputWritten: false, gateAcceptancePassed: false, validationMessage: String(error?.stack ?? error).slice(-6000) };
    } finally {
      await rm(temporary, { recursive: true, force: true });
      await rm(temporaryHome, { recursive: true, force: true });
    }
  };
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const results = [];
  for (let offset = 0; offset < activation.contexts.length; offset += 2) results.push(...await Promise.all(activation.contexts.slice(offset, offset + 2).map(execute)));
  const passed = results.every((item) => item.gateAcceptancePassed);
  const execution = { schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-level-2-recovery-execution", protocolId, status: passed ? "four-atomic-field-batch-15-publication-recovery-level-2-execution-passed" : "batch-15-publication-recovery-level-2-execution-failed", startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, contextsAttempted: 4, validContexts: results.filter((item) => item.gateAcceptancePassed).length, invalidContexts: results.filter((item) => !item.gateAcceptancePassed).length, attempts: 4, retries: 0, timeoutExtensions: 0, directIncrementalCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0, results, authorization: { analysis: passed, retries: false, exceptionalThirdLevelOnlyForAtomicCompanionLoss: !passed, paidServices: false, scorePass: false, productionMutation: false, nextBatchSelection: false } };
  await writeFile(path.resolve(files.execution), pretty(execution));
  console.log(pretty({ status: execution.status, contextsAttempted: 4, validContexts: execution.validContexts, invalidContexts: execution.invalidContexts, elapsedMinutes: Number((execution.elapsedMs / 60000).toFixed(2)), attempts: 4, retries: 0, recoveryLevel: 2, rawFailuresPreserved: results.filter((item) => !item.gateAcceptancePassed).every((item) => item.rawOutputWritten || ["timed-out", "transport-failed"].includes(item.status)), directIncrementalCostUsd: 0 }));
  process.exit(0);
}

if (mode === "--analyze") {
  const [activation, execution] = await Promise.all([files.activation, files.execution].map(readJson));
  assert.equal(execution.status, "four-atomic-field-batch-15-publication-recovery-level-2-execution-passed");
  const outputs = await Promise.all(activation.contexts.map((context) => readJson(context.output)));
  const corrections = outputs.map((output) => output.correction);
  assert.equal(corrections.length, 4);
  assert.equal(new Set(corrections.map((item) => item.moveId)).size, 4);
  for (const correction of corrections) validateCritique(correction.critique, correction.moveId);
  const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-level-2-recovery-analysis", protocolId, status: "four-atomic-field-batch-15-publication-recovery-level-2-passed", recoveryLevel: 2, recoveryLevelsMaximum: 2, debateNumber: "178", contexts: 4, recoveredFields: corrections.map((item) => `moveProse.${item.moveId}.critique`), attempts: 4, retries: 0, timeoutExtensions: 0, rawOutputsPreservedBeforeValidation: true, directIncrementalCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0, authorization: { deterministicRecoveryMerge: true, furtherOrdinaryRecoveryLevel: false, exceptionalThirdLevelRequired: false, scorePass: false, productionMutation: false, nextBatchSelection: false }, nextAuthorizedAction: "merge-all-accepted-batch-15-publication-recovery-fields" };
  if (shouldWrite) await writeFile(path.resolve(files.analysis), pretty(analysis));
  console.log(pretty({ status: analysis.status, debateNumber: "178", contexts: 4, recoveredFields: 4, attempts: 4, retries: 0, rawOutputsPreservedBeforeValidation: true, directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }));
}
