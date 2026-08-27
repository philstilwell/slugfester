#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { validatePostCanaryBatch14PublicationOutput } from "./lib/assessment-production-post-canary-batch-14-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";

const publicationRoot = "docs/assessment-production/post-canary-continuation-v1/batch-14/publication-reconstruction";
const recoveryRoot = `${publicationRoot}/failure-recovery`;
const root = `${recoveryRoot}/critique-repair-level-2`;
const levelOneRoot = `${recoveryRoot}/critique-repair`;
const protocolId = "assessment-production-post-canary-batch-14-publication-critique-field-disjoint-recovery-level-2";
const model = { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription" };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const readJson = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;
const mode = process.argv.find((arg) => ["--prepare", "--activate", "--run", "--analyze"].includes(arg));
assert(mode, "one mode is required");
const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--at");
const at = atIndex >= 0 ? process.argv[atIndex + 1] : null;
if (["--prepare", "--activate"].includes(mode)) assert(at && !Number.isNaN(Date.parse(at)), "--at requires an ISO timestamp");
const files = {
  diagnosis: `${recoveryRoot}/debate-53-diagnosis.json`, originalExecution: `${publicationRoot}/model-execution.json`, levelOneExecution: `${levelOneRoot}/model-execution.json`, levelOneOutputs: [2, 3, 4, 5].map((index) => `${levelOneRoot}/outputs/context-${index}.json`), packet: `${publicationRoot}/packets/debate-53.json`, fullSchema: `${publicationRoot}/schemas/debate-53.schema.json`, failedOutput: `${publicationRoot}/outputs/debate-53.json`, originalValidation: `${publicationRoot}/validations/debate-53.json`, originalProvenance: `${publicationRoot}/provenance/debate-53.json`, workflow: "docs/assessment-production-workflow.md", outputContract: "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md", manual: `${root}/manual.md`, preparation: `${root}/execution-preparation-manifest.json`, activation: `${root}/execution-activation.json`, execution: `${root}/model-execution.json`, analysis: `${root}/analysis.json`, mergedOutput: `${publicationRoot}/outputs/debate-53.json`, mergedValidation: `${publicationRoot}/validations/debate-53.json`, mergedProvenance: `${publicationRoot}/provenance/debate-53.json`, preservedOutput: `${root}/preserved-original-output.json`, preservedValidation: `${root}/preserved-original-validation.json`, preservedProvenance: `${root}/preserved-original-provenance.json`,
};
function runProcess(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = ""; let timedOut = false; let forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
    child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut }); });
  });
}
function validateCritique(critique, moveId) {
  const words = wordCount(critique);
  assert(words >= 105 && words <= 130, `${moveId}: critique word count ${words}`);
  assert(String(critique).length >= 880, `${moveId}: critique shorter than 880 characters`);
  const sentences = String(critique).trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  assert.equal(sentences.length, 4, `${moveId}: critique sentence count`);
  const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
  labels.forEach((label, index) => { assert(sentences[index].toLowerCase().startsWith(label), `${moveId}: label ${index}`); assert(/[.!?]["')\]]?$/.test(sentences[index].trim()), `${moveId}: punctuation ${index}`); });
  return { words, characters: String(critique).length, sentences: 4 };
}

if (mode === "--prepare") {
  const sourcePaths = [files.diagnosis, files.originalExecution, files.levelOneExecution, ...files.levelOneOutputs, files.packet, files.fullSchema, files.failedOutput, files.originalValidation, files.originalProvenance, files.workflow, files.outputContract, files.manual, "scripts/assessment-production-post-canary-batch-14-publication-critique-recovery-level-2.mjs", "scripts/lib/assessment-production-post-canary-batch-14-publication-validation.mjs"];
  const sourceBytes = Object.fromEntries(await Promise.all(sourcePaths.map(async (file) => [file, await readFile(path.resolve(file))])));
  const [diagnosis, originalExecution, levelOneExecution, packet, failedOutput] = [files.diagnosis, files.originalExecution, files.levelOneExecution, files.packet, files.failedOutput].map((file) => JSON.parse(sourceBytes[file]));
  assert.equal(diagnosis.status, "debate-53-eleven-critique-fields-failed-all-other-publication-fields-valid");
  assert.equal(diagnosis.diagnosis.invalidCritiqueCount, 11);
  assert.equal(diagnosis.diagnosis.allOtherFieldsStructurallyValid, true);
  assert.equal(originalExecution.status, "post-canary-batch-14-publication-gate-complete-with-failure");
  assert.equal(levelOneExecution.status, "batch-14-publication-critique-recovery-level-1-execution-failed");
  assert.equal(levelOneExecution.validContexts, 4);
  assert.equal(levelOneExecution.invalidContexts, 2);
  assert.equal(sha256(sourceBytes[files.failedOutput]), diagnosis.preservedEvidence.outputSha256);
  const invalidIds = levelOneExecution.results.filter((item) => !item.gateAcceptancePassed).flatMap((item) => item.moveIds);
  assert.deepEqual(invalidIds, ["con-conquest-genocide-moral-truth", "con-gospel-concrete-contradictions", "con-gospel-editing-transmission", "pro-ancient-historical-reporting-standard"]);
  const contexts = [];
  for (let offset = 0; offset < invalidIds.length; offset += 1) {
    const moveIds = invalidIds.slice(offset, offset + 1);
    const contextIndex = contexts.length;
    const targets = moveIds.map((moveId) => {
      const move = packet.moves.find((item) => item.moveId === moveId);
      const immutable = failedOutput.moveProse[moveId];
      return { moveId, lockedMove: move, immutablePublicationFields: { role: immutable.role, words: immutable.words, tags: immutable.tags }, rejectedPriorCritiqueAvailable: false };
    });
    const repairPacket = { schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-critique-recovery-packet", protocolId, contextIndex, debateNumber: "53", debateId: packet.debateId, assessmentModel: model.label, writableFields: moveIds.map((moveId) => `moveProse.${moveId}.critique`), writableFieldCount: moveIds.length, targets, allOtherFieldsUnavailableAndImmutable: true, participantJudgmentClosed: true, publicationScoreLocked: true };
    const itemSchemas = moveIds.map((moveId) => ({ type: "object", additionalProperties: false, required: ["moveId", "critique"], properties: { moveId: { type: "string", const: moveId }, critique: { type: "string", minLength: 880, maxLength: 1800 } } }));
    const properties = { schemaVersion: { type: "string", const: "1.0-assessment-production-post-canary-batch-14-publication-critique-recovery-output" }, protocolId: { type: "string", const: protocolId }, contextIndex: { type: "integer", const: contextIndex }, debateNumber: { type: "string", const: "53" }, debateId: { type: "string", const: packet.debateId }, assessmentModel: { type: "string", const: model.label }, completedAt: { type: "string", minLength: 1 }, corrections: { type: "array", minItems: moveIds.length, maxItems: moveIds.length, items: { anyOf: itemSchemas } } };
    const schema = { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `slugfester-b14-debate53-critique-repair-level-2-${contextIndex}`, type: "object", additionalProperties: false, required: Object.keys(properties), properties };
    const packetPath = `${root}/packets/context-${contextIndex}.json`; const schemaPath = `${root}/schemas/context-${contextIndex}.schema.json`; const outputPath = `${root}/outputs/context-${contextIndex}.json`;
    const packetText = pretty(repairPacket); const schemaText = pretty(schema);
    contexts.push({ contextIndex, debateNumber: "53", moveIds, writableFields: repairPacket.writableFields, writableFieldCount: moveIds.length, packet: packetPath, packetSha256: sha256(packetText), schema: schemaPath, schemaSha256: sha256(schemaText), output: outputPath });
    if (shouldWrite) { await mkdir(path.dirname(packetPath), { recursive: true }); await mkdir(path.dirname(schemaPath), { recursive: true }); await mkdir(path.dirname(outputPath), { recursive: true }); await writeFile(packetPath, packetText); await writeFile(schemaPath, schemaText); }
  }
  assert.equal(contexts.length, 4); assert.equal(contexts.reduce((sum, item) => sum + item.writableFieldCount, 0), 4); assert(contexts.every((item) => item.writableFieldCount === 1));
  const sourceHashes = Object.fromEntries(Object.entries(sourceBytes).map(([file, bytes]) => [file, sha256(bytes)]));
  for (const context of contexts) { sourceHashes[context.packet] = context.packetSha256; sourceHashes[context.schema] = context.schemaSha256; }
  const futureOutputs = [files.activation, files.execution, files.analysis, files.preservedOutput, files.preservedValidation, files.preservedProvenance, ...contexts.map((item) => item.output)];
  for (const future of futureOutputs) assert(!(await exists(future)), `future output exists: ${future}`);
  const manifest = { schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-critique-recovery-level-2-preparation", protocolId, status: "frozen-four-atomic-critique-batch-14-publication-recovery-level-2-prepared-not-activated", frozenAt: at, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), productionCanary: false, batchNumber: 14, stagingOnly: true, recoveryLevel: 2, recoveryLevelsMaximum: 2, model, contexts, executionPolicy: { contexts: 4, maximumParallelContexts: 2, attemptsPerContext: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0, timeoutMsPerContext: 600000, writableFieldsMaximumPerPacket: 1, directIncrementalCostUsdMaximum: 0, paidServices: false, separateActivationRequired: true, APIKeysRemoved: true, removedEnvironmentVariables: ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"] }, diagnosis: { path: files.levelOneExecution, sha256: sourceHashes[files.levelOneExecution], failedAtomicShards: 2, unavailableCritiques: 4, acceptedLevelOneCritiques: 7, allOtherFieldsStructurallyValid: true }, sourceHashes, futureOutputs, authorization: { preparation: true, activation: true, modelExecution: false, deterministicMergeAndValidation: false, retries: false, furtherRecoveryLevel: false, scorePass: false, productionMutation: false, nextBatchSelection: false }, nextAuthorizedAction: "activate-four-atomic-debate-53-critique-recovery-level-2-contexts" };
  if (shouldWrite) await writeFile(files.preparation, pretty(manifest));
  console.log(pretty({ status: shouldWrite ? manifest.status : "preview", contexts: 4, writableCritiques: 4, maximumWritableFieldsPerContext: 1, attemptsMaximum: 4, retriesMaximum: 0, recoveryLevel: 2, recoveryLevelsMaximum: 2, directIncrementalCostUsdMaximum: 0, modelExecutionAuthorized: false })); process.exit(0);
}

if (mode === "--activate") {
  const bytes = await readFile(files.preparation); const preparation = JSON.parse(bytes);
  assert.equal(preparation.status, "frozen-four-atomic-critique-batch-14-publication-recovery-level-2-prepared-not-activated"); assert(!(await exists(files.activation)), "activation exists");
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source changed: ${file}`);
  const activation = { ...preparation, schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-critique-recovery-level-2-activation", status: "frozen-four-atomic-critique-batch-14-publication-recovery-level-2-authorized", activatedAt: at, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), preparation: { path: files.preparation, sha256: sha256(bytes) }, authorization: { ...preparation.authorization, modelExecution: true, deterministicMergeAndValidation: true }, nextAuthorizedAction: "execute-four-atomic-debate-53-critique-recovery-level-2-contexts-once" };
  if (shouldWrite) await writeFile(files.activation, pretty(activation));
  console.log(pretty({ status: shouldWrite ? activation.status : "preview", contexts: 4, writableCritiques: 4, recoveryLevel: 2, attemptsMaximum: 4, retriesMaximum: 0, directIncrementalCostUsdMaximum: 0, modelExecutionAuthorized: shouldWrite })); process.exit(0);
}

if (mode === "--run") {
  const activation = await readJson(files.activation); assert.equal(activation.status, "frozen-four-atomic-critique-batch-14-publication-recovery-level-2-authorized");
  for (const [file, digest] of Object.entries(activation.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source changed: ${file}`);
  const codex = "/Applications/ChatGPT.app/Contents/Resources/codex"; const authSource = path.join(os.homedir(), ".codex", "auth.json");
  async function execute(context) {
    const temp = await mkdtemp(path.join(os.tmpdir(), `slugfester-b14-pub53-c-${context.contextIndex}-`)); const home = await mkdtemp(path.join(os.tmpdir(), `slugfester-b14-pub53-ch-${context.contextIndex}-`)); const startedAt = new Date().toISOString(); const started = Date.now();
    try {
      await copyFile(files.workflow, path.join(temp, "workflow.md")); await copyFile(files.outputContract, path.join(temp, "output-contract.md")); await copyFile(files.manual, path.join(temp, "manual.md")); await copyFile(context.packet, path.join(temp, "packet.json")); await copyFile(context.schema, path.join(temp, "schema.json")); await copyFile(authSource, path.join(home, "auth.json"));
      const environment = { ...process.env, CODEX_HOME: home }; for (const key of activation.executionPolicy.removedEnvironmentVariables) delete environment[key];
      const prompt = `Read workflow.md, output-contract.md, manual.md, packet.json, and schema.json completely and no other files. Act only as the isolated 5.6 Sol/low Debate 53 atomic critique-recovery editor for level-2 context ${context.contextIndex}. Author exactly the one required critique string. Count it before returning and keep it within 112–118 words while satisfying the 880-character minimum and four ordered labeled sentences. Return exactly one schema-conforming JSON object and no commentary.`;
      const invocation = await runProcess(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", model.slug, "-c", `model_reasoning_effort=\"${model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temp, env: environment }, activation.executionPolicy.timeoutMsPerContext);
      const events = extractTransportEvents(invocation.stderr); const transportClassification = classifyTransportEventCount(events.length, 2, 8); const base = { contextIndex: context.contextIndex, moveIds: context.moveIds, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, model: model.label, reasoningEffort: model.reasoningEffort, authentication: model.authentication, apiKeysRemoved: true, transportClassification, recoverableStreamEvents: events.length, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr), stderrTail: invocation.stderr.trim().slice(-6000) || null, directIncrementalCostUsd: 0 };
      if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) return { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, gateAcceptancePassed: false };
      const resultBytes = await readFile(path.join(temp, "result.json")); const output = JSON.parse(resultBytes); assert.equal(output.contextIndex, context.contextIndex); assert.deepEqual(output.corrections.map((item) => item.moveId), context.moveIds); const critiqueValidations = output.corrections.map((item) => ({ moveId: item.moveId, ...validateCritique(item.critique, item.moveId) })); await writeFile(context.output, resultBytes);
      return { ...base, status: transportClassification === "invalid" ? "transport-event-limit-exceeded" : "completed-valid", outputWritten: true, outputSha256: sha256(resultBytes), critiqueValidations, gateAcceptancePassed: transportClassification !== "invalid" };
    } catch (error) { return { contextIndex: context.contextIndex, moveIds: context.moveIds, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, model: model.label, reasoningEffort: model.reasoningEffort, authentication: model.authentication, directIncrementalCostUsd: 0, status: "output-validation-failed", outputWritten: await exists(context.output), gateAcceptancePassed: false, validationMessage: String(error?.stack ?? error).slice(-6000) }; }
    finally { await rm(temp, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
  }
  const startedAt = new Date().toISOString(); const started = Date.now(); const results = [];
  for (let offset = 0; offset < activation.contexts.length; offset += 2) results.push(...await Promise.all(activation.contexts.slice(offset, offset + 2).map(execute)));
  const passed = results.every((item) => item.gateAcceptancePassed); const execution = { schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-critique-recovery-level-2-execution", protocolId, status: passed ? "four-atomic-critique-batch-14-publication-recovery-level-2-execution-passed" : "batch-14-publication-critique-recovery-level-2-execution-failed", startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, contextsAttempted: 4, validContexts: results.filter((item) => item.gateAcceptancePassed).length, invalidContexts: results.filter((item) => !item.gateAcceptancePassed).length, attempts: 4, retries: 0, timeoutExtensions: 0, directIncrementalCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0, results, authorization: { analysis: passed, retries: false, furtherRecoveryLevel: false, paidServices: false, productionMutation: false, nextBatchSelection: false } };
  await writeFile(files.execution, pretty(execution)); console.log(pretty({ status: execution.status, contextsAttempted: 4, validContexts: execution.validContexts, invalidContexts: execution.invalidContexts, elapsedMinutes: Number((execution.elapsedMs / 60000).toFixed(2)), attempts: 4, retries: 0, recoveryLevel: 2, directIncrementalCostUsd: 0 })); process.exit(0);
}

if (mode === "--analyze") {
  const [activation, execution, packet, failedOutput, originalValidation, originalProvenance] = await Promise.all([files.activation, files.execution, files.packet, files.failedOutput, files.originalValidation, files.originalProvenance].map(readJson));
  assert.equal(execution.status, "four-atomic-critique-batch-14-publication-recovery-level-2-execution-passed");
  const [levelOneOutputs, levelTwoOutputs] = await Promise.all([
    Promise.all(files.levelOneOutputs.map(readJson)),
    Promise.all(activation.contexts.map((item) => readJson(item.output)))
  ]);
  const corrections = [...levelOneOutputs, ...levelTwoOutputs].flatMap((output) => output.corrections); assert.equal(corrections.length, 11); assert.equal(new Set(corrections.map((item) => item.moveId)).size, 11);
  const merged = structuredClone(failedOutput); for (const correction of corrections) { validateCritique(correction.critique, correction.moveId); merged.moveProse[correction.moveId].critique = correction.critique; }
  const replay = structuredClone(merged); for (const correction of corrections) replay.moveProse[correction.moveId].critique = failedOutput.moveProse[correction.moveId].critique; assert.deepEqual(replay, failedOutput, "accepted companion fields changed");
  const validation = validatePostCanaryBatch14PublicationOutput(merged, packet); assert.equal(validation.status, "passed"); const mergedText = pretty(merged);
  const validationRecord = { schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-validation", protocolId: merged.protocolId, status: "passed", debateNumber: "53", debateId: packet.debateId, outputSha256: sha256(mergedText), validationSummary: validation, validationMessage: null, modelAuthoredScores: 0, lockedScoresUnchanged: true };
  const provenance = { schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-debate-53-recovery-provenance", protocolId, debateNumber: "53", originalFailure: { status: "output-validation-failed", originalOutputPreserved: true }, recoveryLevel1: { contexts: 6, acceptedContexts: [2, 3, 4, 5], acceptedCritiques: 7, failedAtomicContextIndexes: [0, 1] }, recoveryLevel2: { contexts: 4, acceptedCritiques: 4, eachUnavailableFieldAcceptedExactlyOnce: true }, merge: { acceptedCompanionFieldsChanged: false, scoresChanged: false, scorePassRerun: false, modelAuthoredScores: 0, completeValidationPassed: true } };
  const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-critique-recovery-analysis", protocolId, status: "debate-53-two-level-field-disjoint-publication-recovery-passed-awaiting-nine-context-resumption", recoveryLevel: 2, recoveryLevelsMaximum: 2, debateNumber: "53", moves: 20, critiques: 20, contextsThisLevel: 4, attemptsThisLevel: 4, attemptsAcrossRecoveryLevels: 10, retries: 0, timeoutExtensions: 0, directIncrementalCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0, validation, output: { path: files.mergedOutput, sha256: sha256(mergedText) }, authorization: { nineOriginalUnattemptedContextResumption: true, furtherRecoveryLevel: false, deterministicCompilation: false, productionMutation: false, nextBatchSelection: false }, nextAuthorizedAction: "resume-nine-original-unattempted-publication-contexts" };
  if (shouldWrite) { await writeFile(files.preservedOutput, pretty(failedOutput)); await writeFile(files.preservedValidation, pretty(originalValidation)); await writeFile(files.preservedProvenance, pretty(originalProvenance)); await writeFile(files.mergedOutput, mergedText); await writeFile(files.mergedValidation, pretty(validationRecord)); await writeFile(files.mergedProvenance, pretty(provenance)); await writeFile(files.analysis, pretty(analysis)); }
  console.log(pretty({ status: analysis.status, debateNumber: "53", moves: validation.moves, critiques: validation.critiques, minimumCritiqueCharacters: validation.minimumCritiqueCharacters, exactSourceQuotes: validation.quoteExactSourceMatches, contextsThisLevel: 4, attemptsThisLevel: 4, attemptsAcrossRecoveryLevels: 10, retries: 0, directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }));
}
