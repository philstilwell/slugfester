#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { validatePostCanaryBatch17PublicationOutput } from "./lib/assessment-production-post-canary-batch-17-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";

const publicationRoot = "docs/assessment-production/post-canary-continuation-v1/batch-17/publication-reconstruction";
const recoveryRoot = `${publicationRoot}/failure-recovery`;
const root = `${recoveryRoot}/level-1`;
const protocolId = "assessment-production-post-canary-batch-17-publication-continuation-level-1-one-field-recovery";
const model = { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription" };
const mode = process.argv.find((arg) => ["--prepare", "--activate", "--run", "--analyze"].includes(arg));
const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--at");
const at = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assert(mode, "one mode is required");
if (["--prepare", "--activate"].includes(mode)) assert(at && !Number.isNaN(Date.parse(at)), "--at requires an ISO timestamp");

const files = {
  diagnosis: `${recoveryRoot}/diagnosis.json`,
  continuationActivation: `${publicationRoot}/continuation-execution-activation.json`,
  continuationExecution: `${publicationRoot}/model-execution-continuation.json`,
  continuationAnalysis: `${publicationRoot}/continuation-analysis.json`,
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
const validateCorrection = (text, failure, packet) => {
  const value = String(text).trim();
  if (failure.kind === "critique") {
    const words = wordCount(value);
    const sentences = value.split(/(?<=[.!?])\s+/).filter(Boolean);
    assert(words >= 105 && words <= 130, `${failure.moveId}: critique word count ${words}`);
    assert(value.length >= 880, `${failure.moveId}: critique shorter than 880 characters`);
    assert.equal(sentences.length, 4, `${failure.moveId}: critique sentence count`);
    labels.forEach((label, index) => {
      assert(sentences[index].toLowerCase().startsWith(label), `${failure.moveId}: label ${index + 1}`);
      assert(/[.!?]["')\]]?$/.test(sentences[index].trim()), `${failure.moveId}: punctuation ${index + 1}`);
    });
    return { kind: failure.kind, words, characters: value.length, sentences: 4 };
  }
  const sourceMove = packet.moves.find((move) => move.moveId === failure.sourceMoveId);
  const words = wordCount(value);
  assert(sourceMove && sourceMove.side === failure.side, `${failure.field}: quote source unavailable`);
  assert(sourceMove.sourceExcerpt.includes(value), `${failure.field}: quote is not exact`);
  assert(words >= 3 && words <= 18, `${failure.field}: quote word count ${words}`);
  return { kind: failure.kind, words, exactSourceSubstring: true };
};
const spawnRun = (command, args, options, timeoutMs) => new Promise((resolve) => {
  const child = spawn(command, args, { ...options, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  let timedOut = false;
  let forceTimer = null;
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const terminate = (signal) => { try { process.kill(-child.pid, signal); } catch { child.kill(signal); } };
  const timer = setTimeout(() => { timedOut = true; terminate("SIGTERM"); forceTimer = setTimeout(() => terminate("SIGKILL"), 5000); }, timeoutMs);
  child.on("error", (error) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code: null, signal: null, stdout, stderr, timedOut, error }); });
  child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut, error: null }); });
});

if (mode === "--prepare") {
  const [diagnosis, continuationExecution] = await Promise.all([files.diagnosis, files.continuationExecution].map(readJson));
  assert.equal(diagnosis.status, "batch-17-publication-one-field-failure-diagnosed");
  assert.equal(diagnosis.totals.invalidFields, 1);
  assert.equal(continuationExecution.contextsAttempted, 1);
  assert.deepEqual(continuationExecution.unattemptedContextIndexes, []);
  const debateInputs = new Map();
  for (const debateNumber of diagnosis.failedDebates) {
    const packetPath = `${publicationRoot}/packets/debate-${debateNumber}.json`;
    const outputPath = `${publicationRoot}/outputs/debate-${debateNumber}.json`;
    debateInputs.set(debateNumber, { packetPath, outputPath, packet: await readJson(packetPath), output: await readJson(outputPath) });
  }
  const contexts = diagnosis.failures.map((failure, contextIndex) => {
    const source = debateInputs.get(failure.debateNumber);
    const shardId = `debate-${failure.debateNumber}-${failure.kind}-${contextIndex}-recovery-1`;
    const target = failure.kind === "critique"
      ? { ...failure, lockedMove: source.packet.moves.find((move) => move.moveId === failure.moveId), immutableCompanionFields: { role: source.output.moveProse[failure.moveId].role, words: source.output.moveProse[failure.moveId].words, tags: source.output.moveProse[failure.moveId].tags }, rejectedPriorStringAvailable: false }
      : { ...failure, lockedMove: source.packet.moves.find((move) => move.moveId === failure.sourceMoveId), immutableCompanionFields: { sourceMoveId: source.output.representativeQuotes[failure.side].sourceMoveId, context: source.output.representativeQuotes[failure.side].context }, rejectedPriorStringAvailable: false };
    const repairPacket = { schemaVersion: "1.0-assessment-production-post-canary-batch-17-publication-continuation-one-field-repair-packet", protocolId, contextIndex, shardId, debateNumber: failure.debateNumber, debateId: source.packet.debateId, assessmentModel: model.label, recoveryLevel: 1, writableField: failure.field, target, allOtherFieldsUnavailableAndImmutable: true, participantJudgmentClosed: true, publicationScoreLocked: true };
    const properties = {
      schemaVersion: { type: "string", const: "1.0-assessment-production-post-canary-batch-17-publication-continuation-one-field-repair-output" },
      protocolId: { type: "string", const: protocolId },
      contextIndex: { type: "integer", const: contextIndex },
      shardId: { type: "string", const: shardId },
      debateNumber: { type: "string", const: failure.debateNumber },
      debateId: { type: "string", const: source.packet.debateId },
      assessmentModel: { type: "string", const: model.label },
      completedAt: { type: "string", minLength: 1 },
      correction: { type: "object", additionalProperties: false, required: ["field", "text"], properties: { field: { type: "string", const: failure.field }, text: { type: "string", minLength: failure.kind === "critique" ? 880 : 1, maxLength: failure.kind === "critique" ? 1800 : 500 } } }
    };
    const schema = { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `slugfester-batch-17-${shardId}`, type: "object", additionalProperties: false, required: Object.keys(properties), properties };
    const packetPath = `${root}/packets/context-${contextIndex}.json`;
    const schemaPath = `${root}/schemas/context-${contextIndex}.schema.json`;
    const outputPath = `${root}/outputs/context-${contextIndex}.json`;
    return { contextIndex, shardId, debateNumber: failure.debateNumber, debateId: source.packet.debateId, kind: failure.kind, field: failure.field, failure, sourcePacket: source.packetPath, packet: packetPath, packetSha256: sha256(pretty(repairPacket)), schema: schemaPath, schemaSha256: sha256(pretty(schema)), output: outputPath, repairPacket, schemaDocument: schema };
  });
  assert.equal(new Set(contexts.map((item) => `${item.debateNumber}:${item.field}`)).size, 1);
  const sourceFiles = [files.diagnosis, files.continuationActivation, files.continuationExecution, files.continuationAnalysis, files.workflow, files.outputContract, files.manual, "scripts/assessment-production-post-canary-batch-17-publication-level-1-recovery.mjs", "scripts/lib/assessment-production-post-canary-batch-17-publication-validation.mjs"];
  for (const debateNumber of diagnosis.failedDebates) sourceFiles.push(`${publicationRoot}/packets/debate-${debateNumber}.json`, `${publicationRoot}/outputs/debate-${debateNumber}.json`, `${publicationRoot}/validations/debate-${debateNumber}.json`, `${publicationRoot}/provenance/debate-${debateNumber}.json`);
  const sourceHashes = {};
  for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
  for (const context of contexts) { sourceHashes[context.packet] = context.packetSha256; sourceHashes[context.schema] = context.schemaSha256; }
  const futureOutputs = [files.activation, files.execution, files.analysis, ...contexts.map((item) => item.output)];
  for (const file of [files.preparation, ...futureOutputs]) assert(!(await exists(file)), `${file}: future output exists`);
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
  const manifest = { schemaVersion: "1.0-assessment-production-post-canary-batch-17-publication-continuation-level-1-recovery-preparation", protocolId, status: "frozen-one-field-batch-17-publication-recovery-level-1-prepared-not-activated", frozenAt: at, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), productionCanary: false, batchNumber: 17, stagingOnly: true, recoveryLevel: 1, recoveryLevelsMaximum: 2, model, contexts: manifestContexts, executionPolicy: { contexts: 1, maximumParallelContexts: 1, attemptsPerContext: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0, timeoutMsPerContext: 600000, writableFieldsPerPacket: 1, preserveRawResultBeforeValidation: true, directIncrementalCostUsdMaximum: 0, paidServices: false, separateActivationRequired: true, APIKeysRemoved: true, removedEnvironmentVariables: ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"] }, sourceHashes, futureOutputs, authorization: { activation: true, modelExecution: false, deterministicMergeAndValidation: false, retries: false, furtherRecoveryLevel: false, scorePass: false, productionMutation: false, nextBatchSelection: false }, nextAuthorizedAction: "activate-one-fresh-one-field-batch-17-publication-recovery-level-1-context" };
  if (shouldWrite) await writeFile(path.resolve(files.preparation), pretty(manifest));
  console.log(pretty({ status: shouldWrite ? manifest.status : "preview", contexts: 1, fields: manifestContexts.map((item) => `${item.debateNumber}:${item.field}`), attemptsMaximum: 1, retriesMaximum: 0, recoveryLevel: 1, directIncrementalCostUsdMaximum: 0, modelExecutionAuthorized: false }));
  process.exit(0);
}

if (mode === "--activate") {
  const preparationBytes = await readFile(path.resolve(files.preparation));
  const preparation = JSON.parse(preparationBytes);
  assert.equal(preparation.status, "frozen-one-field-batch-17-publication-recovery-level-1-prepared-not-activated");
  assert(!(await exists(files.activation)), "activation exists");
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source changed: ${file}`);
  const activation = { ...preparation, schemaVersion: "1.0-assessment-production-post-canary-batch-17-publication-continuation-level-1-recovery-activation", status: "frozen-one-field-batch-17-publication-recovery-level-1-authorized", activatedAt: at, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), preparation: { path: files.preparation, sha256: sha256(preparationBytes) }, authorization: { ...preparation.authorization, modelExecution: true, deterministicMergeAndValidation: true }, nextAuthorizedAction: "execute-one-fresh-one-field-batch-17-publication-recovery-level-1-context-once" };
  if (shouldWrite) await writeFile(path.resolve(files.activation), pretty(activation));
  console.log(pretty({ status: shouldWrite ? activation.status : "preview", contexts: 1, attemptsMaximum: 1, retriesMaximum: 0, recoveryLevel: 1, directIncrementalCostUsdMaximum: 0, modelExecutionAuthorized: shouldWrite }));
  process.exit(0);
}

if (mode === "--run") {
  const activation = await readJson(files.activation);
  assert.equal(activation.status, "frozen-one-field-batch-17-publication-recovery-level-1-authorized");
  for (const [file, digest] of Object.entries(activation.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source changed: ${file}`);
  for (const context of activation.contexts) assert(!(await exists(context.output)), `${context.output}: output exists`);
  const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  const execute = async (context) => {
    const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-b17-pub-cont-r1-${context.contextIndex}-`));
    const temporaryHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-b17-pub-cont-r1-home-${context.contextIndex}-`));
    const startedAt = new Date().toISOString(); const started = Date.now();
    try {
      await Promise.all([copyFile(path.resolve(files.workflow), path.join(temporary, "workflow.md")), copyFile(path.resolve(files.outputContract), path.join(temporary, "output-contract.md")), copyFile(path.resolve(files.manual), path.join(temporary, "manual.md")), copyFile(path.resolve(context.packet), path.join(temporary, "packet.json")), copyFile(path.resolve(context.schema), path.join(temporary, "schema.json")), copyFile(authSource, path.join(temporaryHome, "auth.json"))]);
      const environment = { ...process.env, CODEX_HOME: temporaryHome };
      for (const key of activation.executionPolicy.removedEnvironmentVariables) delete environment[key];
      const prompt = "Read workflow.md, output-contract.md, manual.md, packet.json, and schema.json completely and no other files. Act only as the fresh isolated 5.6 Sol/low Batch 17 one-field publication recovery editor. Author exactly the single writable field. The rejected prior string is unavailable. Return exactly one schema-conforming JSON object and no commentary.";
      const invocation = await spawnRun(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", model.slug, "-c", `model_reasoning_effort=\"${model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, activation.executionPolicy.timeoutMsPerContext);
      const base = { contextIndex: context.contextIndex, shardId: context.shardId, debateNumber: context.debateNumber, kind: context.kind, field: context.field, attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, model: model.label, reasoningEffort: model.reasoningEffort, authentication: model.authentication, apiKeysRemoved: true, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr), directIncrementalCostUsd: 0 };
      if (invocation.error || invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) return { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, gateAcceptancePassed: false, failureMessage: String(invocation.error ?? invocation.stderr).slice(-6000) };
      const resultBytes = await readFile(path.join(temporary, "result.json"));
      await writeFile(path.resolve(context.output), resultBytes);
      const output = JSON.parse(resultBytes);
      assert.equal(output.contextIndex, context.contextIndex); assert.equal(output.shardId, context.shardId); assert.equal(output.correction.field, context.field);
      const validation = validateCorrection(output.correction.text, context.failure, await readJson(context.sourcePacket));
      return { ...base, status: "completed-valid", outputWritten: true, outputSha256: sha256(resultBytes), validation, gateAcceptancePassed: true };
    } catch (error) {
      return { contextIndex: context.contextIndex, shardId: context.shardId, debateNumber: context.debateNumber, kind: context.kind, field: context.field, attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, model: model.label, reasoningEffort: model.reasoningEffort, authentication: model.authentication, directIncrementalCostUsd: 0, status: "output-validation-failed", outputWritten: await exists(context.output), outputSha256: await exists(context.output) ? sha256(await readFile(path.resolve(context.output))) : null, gateAcceptancePassed: false, validationMessage: String(error?.stack ?? error).slice(-6000) };
    } finally { await rm(temporary, { recursive: true, force: true }); await rm(temporaryHome, { recursive: true, force: true }); }
  };
  const startedAt = new Date().toISOString(); const started = Date.now(); const results = [];
  for (let offset = 0; offset < activation.contexts.length; offset += 2) {
    const pair = activation.contexts.slice(offset, offset + 2); console.error(`[batch-17-publication-continuation-recovery-1] starting ${pair.map((item) => `${item.debateNumber}:${item.field}`).join(", ")}`);
    const pairResults = await Promise.all(pair.map(execute)); results.push(...pairResults); for (const result of pairResults) console.error(`[batch-17-publication-continuation-recovery-1] ${result.debateNumber}:${result.field} ${result.status} ${(result.elapsedMs / 60000).toFixed(2)}m`);
  }
  const passed = results.every((item) => item.gateAcceptancePassed);
  const execution = { schemaVersion: "1.0-assessment-production-post-canary-batch-17-publication-continuation-level-1-recovery-execution", protocolId, status: passed ? "one-field-batch-17-publication-recovery-level-1-execution-passed" : "batch-17-publication-recovery-level-1-execution-failed", startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, contextsAttempted: 1, validContexts: results.filter((item) => item.gateAcceptancePassed).length, invalidContexts: results.filter((item) => !item.gateAcceptancePassed).length, attempts: 1, retries: 0, timeoutExtensions: 0, directIncrementalCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0, results, authorization: { analysis: true, retries: false, furtherRecoveryLevel: !passed, paidServices: false, scorePass: false, productionMutation: false, nextBatchSelection: false } };
  await writeFile(path.resolve(files.execution), pretty(execution));
  console.log(pretty({ status: execution.status, contextsAttempted: 1, validContexts: execution.validContexts, invalidContexts: execution.invalidContexts, elapsedMinutes: Number((execution.elapsedMs / 60000).toFixed(2)), attempts: 1, retries: 0, recoveryLevel: 1, directIncrementalCostUsd: 0 })); process.exit(0);
}

if (mode === "--analyze") {
  const [activation, execution, diagnosis] = await Promise.all([files.activation, files.execution, files.diagnosis].map(readJson));
  const invalid = execution.results.filter((item) => !item.gateAcceptancePassed);
  if (invalid.length) {
    const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-17-publication-continuation-level-1-recovery-analysis", protocolId, status: "batch-17-publication-recovery-level-1-gate-failed", recoveryLevel: 1, recoveryLevelsMaximum: 2, originalFailuresPreserved: true, contexts: 1, attempts: 1, retries: 0, validContexts: execution.validContexts, invalidContexts: invalid.length, failedFields: invalid.map((item) => `${item.debateNumber}:${item.field}`), rejectedRawOutputsPreserved: invalid.every((item) => item.outputWritten), directIncrementalCostUsd: 0, authorization: { recoveryLevel2Preparation: true, scorePass: false, productionMutation: false, nextBatchSelection: false }, nextAuthorizedAction: "prepare-minimum-fresh-field-disjoint-batch-17-publication-recovery-level-2-shard" };
    if (shouldWrite) await writeFile(path.resolve(files.analysis), pretty(analysis)); console.log(pretty(analysis)); process.exit(0);
  }
  assert.equal(execution.status, "one-field-batch-17-publication-recovery-level-1-execution-passed");
  const validationResults = [];
  for (const debateNumber of diagnosis.failedDebates) {
    const packetPath = `${publicationRoot}/packets/debate-${debateNumber}.json`; const outputPath = `${publicationRoot}/outputs/debate-${debateNumber}.json`; const validationPath = `${publicationRoot}/validations/debate-${debateNumber}.json`; const provenancePath = `${publicationRoot}/provenance/debate-${debateNumber}.json`;
    const [packet, failedOutput, failedOutputBytes, failedValidationBytes, failedProvenanceBytes] = await Promise.all([readJson(packetPath), readJson(outputPath), readFile(path.resolve(outputPath)), readFile(path.resolve(validationPath)), readFile(path.resolve(provenancePath))]);
    const merged = structuredClone(failedOutput); const contexts = activation.contexts.filter((item) => item.debateNumber === debateNumber);
    for (const context of contexts) {
      const correction = (await readJson(context.output)).correction; validateCorrection(correction.text, context.failure, packet);
      if (context.kind === "critique") merged.moveProse[context.failure.moveId].critique = correction.text; else merged.representativeQuotes[context.failure.side].text = correction.text;
    }
    const replay = structuredClone(merged);
    for (const context of contexts) { if (context.kind === "critique") replay.moveProse[context.failure.moveId].critique = failedOutput.moveProse[context.failure.moveId].critique; else replay.representativeQuotes[context.failure.side].text = failedOutput.representativeQuotes[context.failure.side].text; }
    assert.deepEqual(replay, failedOutput, `${debateNumber}: non-target companion field changed`);
    const validation = validatePostCanaryBatch17PublicationOutput(merged, packet); const mergedBytes = Buffer.from(pretty(merged));
    const validationRecord = { schemaVersion: "1.0-assessment-production-post-canary-batch-17-publication-validation", protocolId: merged.protocolId, status: "passed", debateNumber, debateId: packet.debateId, outputSha256: sha256(mergedBytes), validationSummary: validation, validationMessage: null, modelAuthoredScores: 0, lockedScoresUnchanged: true };
    const provenance = { schemaVersion: "1.0-assessment-production-post-canary-batch-17-publication-continuation-level-1-recovery-provenance", protocolId, debateNumber, originalFailure: { status: "output-validation-failed", outputSha256: sha256(failedOutputBytes), preserved: true }, recoveryLevel1: { contexts: contexts.length, acceptedFields: contexts.map((item) => item.field), oneWritableFieldPerFreshContext: true, oneAttemptPerContext: true, retries: 0, rejectedPriorStringsUnavailable: true }, merge: { acceptedCompanionFieldsChanged: false, scoresChanged: false, scorePassRerun: false, modelAuthoredScores: 0, completeValidationPassed: true }, outputSha256: sha256(mergedBytes) };
    if (shouldWrite) { const preservedRoot = `${root}/preserved`; await mkdir(path.resolve(preservedRoot), { recursive: true }); await writeFile(path.resolve(`${preservedRoot}/debate-${debateNumber}-original-output.json`), failedOutputBytes); await writeFile(path.resolve(`${preservedRoot}/debate-${debateNumber}-original-validation.json`), failedValidationBytes); await writeFile(path.resolve(`${preservedRoot}/debate-${debateNumber}-original-provenance.json`), failedProvenanceBytes); await writeFile(path.resolve(outputPath), mergedBytes); await writeFile(path.resolve(validationPath), pretty(validationRecord)); await writeFile(path.resolve(provenancePath), pretty(provenance)); }
    validationResults.push({ debateNumber, contexts: contexts.length, repairedFields: contexts.map((item) => item.field), validation });
  }
  const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-17-publication-continuation-level-1-recovery-analysis", protocolId, status: "batch-17-publication-level-1-one-field-recovery-passed", recoveryLevel: 1, recoveryLevelsMaximum: 2, originalFailuresPreserved: true, contexts: 1, attempts: 1, retries: 0, repairedValidationFields: 1, recoveredDebates: diagnosis.failedDebates, validationResults, directIncrementalCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0, authorization: { continueUnattemptedInitialPublicationContexts: false, deterministicCohortFinalization: true, furtherRecoveryLevel: false, scorePass: false, productionMutation: false, nextBatchSelection: false }, nextAuthorizedAction: "finalize-and-validate-the-complete-four-debate-batch-17-publication-cohort" };
  if (shouldWrite) await writeFile(path.resolve(files.analysis), pretty(analysis)); console.log(pretty({ status: analysis.status, recoveredDebates: analysis.recoveredDebates, contexts: 1, attempts: 1, retries: 0, repairedValidationFields: 1, acceptedCompanionFieldsChanged: false, directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }));
}
