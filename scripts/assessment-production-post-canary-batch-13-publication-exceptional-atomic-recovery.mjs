#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { validatePostCanaryBatch13PublicationOutput } from "./lib/assessment-production-post-canary-batch-13-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";

const publicationRoot = "docs/assessment-production/post-canary-continuation-v1/batch-13/publication-reconstruction";
const recoveryRoot = `${publicationRoot}/timeout-recovery`;
const level2Root = `${recoveryRoot}/critique-repair`;
const root = `${level2Root}/exceptional-atomic-recovery`;
const protocolId = "assessment-production-post-canary-batch-13-publication-exceptional-atomic-shard-recovery";
const model = { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription" };
const acceptedLevel2Indexes = [0, 2, 3, 4, 5, 7, 8, 9];
const targetContexts = [
  { contextIndex: 0, sourceFailedContextIndex: 1, moveIds: ["pro-comparative-likelihood-ratio", "pro-natural-regularity-miracle-context"] },
  { contextIndex: 1, sourceFailedContextIndex: 6, moveIds: ["con-sincerity-transmission-limits", "con-empty-tomb-unconfirmed"] }
];
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
  standingAuthorization: "docs/assessment-production/post-canary-continuation-v1/batch-13/recovery-standing-authorization-amendment.json",
  failureAnalysis: `${level2Root}/failure-analysis.json`,
  level2Activation: `${level2Root}/execution-activation.json`,
  level2Execution: `${level2Root}/model-execution.json`,
  packet: `${publicationRoot}/packets/debate-87.json`,
  fullSchema: `${publicationRoot}/schemas/debate-87.schema.json`,
  moveShard: `${recoveryRoot}/outputs/context-0.json`,
  quoteShard: `${recoveryRoot}/outputs/context-1.json`,
  extensionShard: `${recoveryRoot}/outputs/context-2.json`,
  scoreOutput: "docs/assessment-production/post-canary-continuation-v1/batch-13/score-pass/calculated-scores.json",
  workflow: "docs/assessment-production-workflow.md",
  outputContract: "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
  manual: `${root}/manual.md`,
  preparation: `${root}/execution-preparation-manifest.json`,
  activation: `${root}/execution-activation.json`,
  execution: `${root}/model-execution.json`,
  analysis: `${root}/analysis.json`,
  mergedOutput: `${publicationRoot}/outputs/debate-87.json`,
  mergedValidation: `${publicationRoot}/validations/debate-87.json`,
  mergedProvenance: `${publicationRoot}/provenance/debate-87.json`
};

function runProcess(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = ""; let timedOut = false; let forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
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
  labels.forEach((label, index) => {
    assert(sentences[index].toLowerCase().startsWith(label), `${moveId}: label ${index}`);
    assert(/[.!?]["')\]]?$/.test(sentences[index].trim()), `${moveId}: punctuation ${index}`);
  });
  return { words, characters: String(critique).length, sentences: 4 };
}

if (mode === "--prepare") {
  const failedPacketPaths = targetContexts.map((context) => `${level2Root}/packets/context-${context.sourceFailedContextIndex}.json`);
  const acceptedOutputPaths = acceptedLevel2Indexes.map((index) => `${level2Root}/outputs/context-${index}.json`);
  const sourcePaths = [files.standingAuthorization, files.failureAnalysis, files.level2Activation, files.level2Execution, files.packet, files.fullSchema, files.moveShard, files.quoteShard, files.extensionShard, files.scoreOutput, files.workflow, files.outputContract, files.manual, ...failedPacketPaths, ...acceptedOutputPaths, "scripts/assessment-production-post-canary-batch-13-publication-exceptional-atomic-recovery.mjs", "scripts/lib/assessment-production-post-canary-batch-13-publication-validation.mjs"];
  const sourceBytes = Object.fromEntries(await Promise.all(sourcePaths.map(async (file) => [file, await readFile(path.resolve(file))])));
  const standing = JSON.parse(sourceBytes[files.standingAuthorization]);
  const failure = JSON.parse(sourceBytes[files.failureAnalysis]);
  const level2Activation = JSON.parse(sourceBytes[files.level2Activation]);
  const level2Execution = JSON.parse(sourceBytes[files.level2Execution]);
  const packet = JSON.parse(sourceBytes[files.packet]);
  const scores = JSON.parse(sourceBytes[files.scoreOutput]);
  assert.equal(standing.status, "frozen-active-standing-authorization-for-current-and-future-similar-blocks");
  assert.equal(failure.status, "batch-13-halted-at-substantive-publication-recovery-blocker");
  assert.equal(level2Activation.status, "frozen-ten-context-nineteen-critique-batch-13-publication-recovery-level-2-authorized");
  assert.equal(level2Execution.status, "batch-13-publication-critique-recovery-level-2-execution-failed");
  assert.equal(level2Execution.validContexts, 8); assert.equal(level2Execution.invalidContexts, 2); assert.equal(level2Execution.retries, 0);
  assert.deepEqual(level2Execution.results.filter((item) => !item.gateAcceptancePassed).map((item) => item.contextIndex), [1, 6]);
  assert.equal(scores.status, "post-canary-batch-13-single-score-pass-stability-gate-passed");
  assert.equal(scores.totals.scoringPasses, 1); assert.equal(scores.totals.acceptancePassed, true);
  assert(!(await exists(files.mergedOutput)), "merged Debate 87 output already exists");
  const contexts = [];
  for (const targetContext of targetContexts) {
    const oldPacket = JSON.parse(sourceBytes[`${level2Root}/packets/context-${targetContext.sourceFailedContextIndex}.json`]);
    assert.deepEqual(oldPacket.targets.map((item) => item.moveId), targetContext.moveIds);
    const repairPacket = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-13-publication-exceptional-atomic-recovery-packet",
      protocolId,
      contextIndex: targetContext.contextIndex,
      sourceFailedContextIndex: targetContext.sourceFailedContextIndex,
      debateNumber: "87",
      debateId: packet.debateId,
      assessmentModel: model.label,
      writableFields: targetContext.moveIds.map((moveId) => `moveProse.${moveId}.critique`),
      writableFieldCount: 2,
      targets: oldPacket.targets,
      rejectedAtomicShardUnavailable: true,
      allOtherFieldsUnavailableAndImmutable: true,
      participantJudgmentClosed: true,
      publicationScoreLocked: true
    };
    const itemSchemas = targetContext.moveIds.map((moveId) => ({ type: "object", additionalProperties: false, required: ["moveId", "critique"], properties: { moveId: { type: "string", const: moveId }, critique: { type: "string", minLength: 880, maxLength: 1800 } } }));
    const properties = {
      schemaVersion: { type: "string", const: "1.0-assessment-production-post-canary-batch-13-publication-exceptional-atomic-recovery-output" },
      protocolId: { type: "string", const: protocolId },
      contextIndex: { type: "integer", const: targetContext.contextIndex },
      debateNumber: { type: "string", const: "87" },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: model.label },
      completedAt: { type: "string", minLength: 1 },
      corrections: { type: "array", minItems: 2, maxItems: 2, items: { anyOf: itemSchemas } }
    };
    const schema = { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `slugfester-b13-debate87-exceptional-atomic-recovery-${targetContext.contextIndex}`, type: "object", additionalProperties: false, required: Object.keys(properties), properties };
    const packetPath = `${root}/packets/context-${targetContext.contextIndex}.json`;
    const schemaPath = `${root}/schemas/context-${targetContext.contextIndex}.schema.json`;
    const outputPath = `${root}/outputs/context-${targetContext.contextIndex}.json`;
    const rawOutputPath = `${root}/raw-outputs/context-${targetContext.contextIndex}.json`;
    const packetText = pretty(repairPacket); const schemaText = pretty(schema);
    contexts.push({ ...targetContext, writableFields: repairPacket.writableFields, writableFieldCount: 2, packet: packetPath, packetSha256: sha256(packetText), schema: schemaPath, schemaSha256: sha256(schemaText), output: outputPath, rawOutput: rawOutputPath });
    if (shouldWrite) { await mkdir(path.dirname(packetPath), { recursive: true }); await mkdir(path.dirname(schemaPath), { recursive: true }); await mkdir(path.dirname(outputPath), { recursive: true }); await mkdir(path.dirname(rawOutputPath), { recursive: true }); await writeFile(packetPath, packetText); await writeFile(schemaPath, schemaText); }
  }
  assert.equal(contexts.length, 2); assert.equal(contexts.reduce((sum, item) => sum + item.writableFieldCount, 0), 4);
  const sourceHashes = Object.fromEntries(Object.entries(sourceBytes).map(([file, bytes]) => [file, sha256(bytes)]));
  for (const context of contexts) { sourceHashes[context.packet] = context.packetSha256; sourceHashes[context.schema] = context.schemaSha256; }
  const futureOutputs = [files.activation, files.execution, files.analysis, files.mergedOutput, files.mergedValidation, files.mergedProvenance, ...contexts.flatMap((item) => [item.output, item.rawOutput])];
  for (const future of futureOutputs) assert(!(await exists(future)), `future output exists: ${future}`);
  const manifest = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-13-publication-exceptional-atomic-recovery-preparation",
    protocolId,
    status: "frozen-two-context-four-critique-exceptional-atomic-recovery-level-3-prepared-not-activated",
    frozenAt: at,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    productionCanary: false,
    batchNumber: 13,
    stagingOnly: true,
    recoveryLevel: 3,
    ordinaryRecoveryLevelsMaximum: 2,
    exceptionalAtomicPreservationRecoveryLevelsMaximum: 3,
    model,
    contexts,
    executionPolicy: { contexts: 2, maximumParallelContexts: 2, attemptsPerContext: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0, timeoutMsPerContext: 600000, writableFieldsMaximumPerPacket: 2, directIncrementalCostUsdMaximum: 0, paidServices: false, separateActivationRequired: true, preserveRawOutputBeforeValidation: true, APIKeysRemoved: true, removedEnvironmentVariables: ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"] },
    preservationGap: { failedLevel2ContextIndexes: [1, 6], namedInvalidCritiques: failure.failures.map((item) => item.moveId), discardedCompanionCritiques: ["pro-comparative-likelihood-ratio", "con-empty-tomb-unconfirmed"], unavailableCritiquesRecovered: targetContexts.flatMap((item) => item.moveIds) },
    sourceHashes,
    futureOutputs,
    authorization: { preparation: true, activation: true, modelExecution: false, deterministicMergeAndValidation: false, retries: false, furtherRecoveryLevel: false, scorePass: false, productionMutation: false, nextBatchSelection: false },
    nextAuthorizedAction: "activate-two-exceptional-field-disjoint-atomic-shard-recovery-contexts"
  };
  if (shouldWrite) await writeFile(files.preparation, pretty(manifest));
  console.log(pretty({ status: shouldWrite ? manifest.status : "preview", contexts: 2, writableCritiques: 4, attemptsMaximum: 2, retriesMaximum: 0, recoveryLevel: 3, directIncrementalCostUsdMaximum: 0, modelExecutionAuthorized: false }));
  process.exit(0);
}

if (mode === "--activate") {
  const bytes = await readFile(files.preparation); const preparation = JSON.parse(bytes);
  assert.equal(preparation.status, "frozen-two-context-four-critique-exceptional-atomic-recovery-level-3-prepared-not-activated");
  assert(!(await exists(files.activation)), "activation exists");
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source changed: ${file}`);
  const activation = { ...preparation, schemaVersion: "1.0-assessment-production-post-canary-batch-13-publication-exceptional-atomic-recovery-activation", status: "frozen-two-context-four-critique-exceptional-atomic-recovery-level-3-authorized", activatedAt: at, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), preparation: { path: files.preparation, sha256: sha256(bytes) }, authorization: { ...preparation.authorization, modelExecution: true, deterministicMergeAndValidation: true }, nextAuthorizedAction: "execute-two-exceptional-field-disjoint-atomic-shard-recovery-contexts-once" };
  if (shouldWrite) await writeFile(files.activation, pretty(activation));
  console.log(pretty({ status: shouldWrite ? activation.status : "preview", contexts: 2, writableCritiques: 4, recoveryLevel: 3, attemptsMaximum: 2, retriesMaximum: 0, directIncrementalCostUsdMaximum: 0, modelExecutionAuthorized: shouldWrite }));
  process.exit(0);
}

if (mode === "--run") {
  const activation = await readJson(files.activation);
  assert.equal(activation.status, "frozen-two-context-four-critique-exceptional-atomic-recovery-level-3-authorized");
  for (const [file, digest] of Object.entries(activation.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source changed: ${file}`);
  const codex = "/Applications/ChatGPT.app/Contents/Resources/codex"; const authSource = path.join(os.homedir(), ".codex", "auth.json");
  async function execute(context) {
    const temp = await mkdtemp(path.join(os.tmpdir(), `slugfester-b13-pub87-exception-${context.contextIndex}-`));
    const home = await mkdtemp(path.join(os.tmpdir(), `slugfester-b13-pub87-exception-home-${context.contextIndex}-`));
    const startedAt = new Date().toISOString(); const started = Date.now(); let invocation = null;
    try {
      await copyFile(files.workflow, path.join(temp, "workflow.md")); await copyFile(files.outputContract, path.join(temp, "output-contract.md")); await copyFile(files.manual, path.join(temp, "manual.md")); await copyFile(context.packet, path.join(temp, "packet.json")); await copyFile(context.schema, path.join(temp, "schema.json")); await copyFile(authSource, path.join(home, "auth.json"));
      const environment = { ...process.env, CODEX_HOME: home }; for (const key of activation.executionPolicy.removedEnvironmentVariables) delete environment[key];
      const prompt = `Read workflow.md, output-contract.md, manual.md, packet.json, and schema.json completely and no other files. Act only as the fresh isolated 5.6 Sol/low Debate 87 exceptional atomic-shard recovery editor for context ${context.contextIndex}. Author exactly the two required critique strings in packet order. Return exactly one schema-conforming JSON object and no commentary.`;
      invocation = await runProcess(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", model.slug, "-c", `model_reasoning_effort=\"${model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temp, env: environment }, activation.executionPolicy.timeoutMsPerContext);
      const events = extractTransportEvents(invocation.stderr); const transportClassification = classifyTransportEventCount(events.length, 2, 8);
      const base = { contextIndex: context.contextIndex, sourceFailedContextIndex: context.sourceFailedContextIndex, moveIds: context.moveIds, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, model: model.label, reasoningEffort: model.reasoningEffort, authentication: model.authentication, apiKeysRemoved: true, transportClassification, recoverableStreamEvents: events.length, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr), stderrTail: invocation.stderr.trim().slice(-6000) || null, directIncrementalCostUsd: 0 };
      if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !(await exists(path.join(temp, "result.json")))) return { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", rawOutputWritten: false, outputWritten: false, gateAcceptancePassed: false };
      const resultBytes = await readFile(path.join(temp, "result.json")); await writeFile(context.rawOutput, resultBytes);
      const output = JSON.parse(resultBytes); assert.equal(output.contextIndex, context.contextIndex); assert.deepEqual(output.corrections.map((item) => item.moveId), context.moveIds);
      const critiqueValidations = output.corrections.map((item) => ({ moveId: item.moveId, ...validateCritique(item.critique, item.moveId) }));
      await writeFile(context.output, resultBytes);
      return { ...base, status: transportClassification === "invalid" ? "transport-event-limit-exceeded" : "completed-valid", rawOutputWritten: true, rawOutputSha256: sha256(resultBytes), outputWritten: true, outputSha256: sha256(resultBytes), critiqueValidations, gateAcceptancePassed: transportClassification !== "invalid" };
    } catch (error) {
      const rawOutputWritten = await exists(context.rawOutput);
      return { contextIndex: context.contextIndex, sourceFailedContextIndex: context.sourceFailedContextIndex, moveIds: context.moveIds, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, model: model.label, reasoningEffort: model.reasoningEffort, authentication: model.authentication, directIncrementalCostUsd: 0, status: "output-validation-failed", rawOutputWritten, rawOutputSha256: rawOutputWritten ? sha256(await readFile(context.rawOutput)) : null, outputWritten: false, gateAcceptancePassed: false, validationMessage: String(error?.stack ?? error).slice(-6000) };
    } finally { await rm(temp, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
  }
  const startedAt = new Date().toISOString(); const started = Date.now(); const results = await Promise.all(activation.contexts.map(execute));
  const passed = results.every((item) => item.gateAcceptancePassed);
  const execution = { schemaVersion: "1.0-assessment-production-post-canary-batch-13-publication-exceptional-atomic-recovery-execution", protocolId, status: passed ? "two-context-four-critique-exceptional-atomic-recovery-level-3-execution-passed" : "batch-13-exceptional-atomic-recovery-level-3-execution-failed", startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, contextsAttempted: 2, validContexts: results.filter((item) => item.gateAcceptancePassed).length, invalidContexts: results.filter((item) => !item.gateAcceptancePassed).length, attempts: 2, retries: 0, timeoutExtensions: 0, directIncrementalCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0, results, authorization: { analysis: passed, retries: false, furtherRecoveryLevel: false, paidServices: false, productionMutation: false, nextBatchSelection: false } };
  await writeFile(files.execution, pretty(execution));
  console.log(pretty({ status: execution.status, contextsAttempted: 2, validContexts: execution.validContexts, invalidContexts: execution.invalidContexts, elapsedMinutes: Number((execution.elapsedMs / 60000).toFixed(2)), attempts: 2, retries: 0, recoveryLevel: 3, directIncrementalCostUsd: 0 }));
  assert(passed, "exceptional Debate 87 atomic-shard recovery failed"); process.exit(0);
}

if (mode === "--analyze") {
  const [activation, execution, level2Activation, level2Execution, packet, fullSchema, moveShard, quoteShard, extensionShard, scores] = await Promise.all([files.activation, files.execution, files.level2Activation, files.level2Execution, files.packet, files.fullSchema, files.moveShard, files.quoteShard, files.extensionShard, files.scoreOutput].map(readJson));
  assert.equal(execution.status, "two-context-four-critique-exceptional-atomic-recovery-level-3-execution-passed");
  assert.equal(level2Execution.status, "batch-13-publication-critique-recovery-level-2-execution-failed");
  assert.equal(scores.status, "post-canary-batch-13-single-score-pass-stability-gate-passed"); assert.equal(scores.totals.scoringPasses, 1);
  const level2Contexts = level2Activation.contexts.filter((item) => acceptedLevel2Indexes.includes(item.contextIndex));
  const acceptedLevel2Outputs = await Promise.all(level2Contexts.map((item) => readJson(item.output)));
  const exceptionalOutputs = await Promise.all(activation.contexts.map((item) => readJson(item.output)));
  const corrections = [...acceptedLevel2Outputs, ...exceptionalOutputs].flatMap((output) => output.corrections);
  assert.equal(corrections.length, 19); assert.equal(new Set(corrections.map((item) => item.moveId)).size, 19); assert.deepEqual(new Set(corrections.map((item) => item.moveId)), new Set(packet.moves.map((item) => item.moveId)));
  const moveProse = structuredClone(moveShard.moveProse); for (const correction of corrections) { validateCritique(correction.critique, correction.moveId); moveProse[correction.moveId].critique = correction.critique; }
  const constObject = (property) => Object.fromEntries(Object.entries(property.properties).map(([key, value]) => [key, value.const]));
  const completedAt = [...acceptedLevel2Outputs, ...exceptionalOutputs, quoteShard, extensionShard].map((output) => output.completedAt).sort().at(-1);
  const merged = { schemaVersion: fullSchema.properties.schemaVersion.const, protocolId: fullSchema.properties.protocolId.const, debateNumber: "87", debateId: packet.debateId, assessmentModel: model.label, productionCanary: false, stagingOnly: true, completedAt, moveProse, summary: quoteShard.summary, representativeQuotes: quoteShard.representativeQuotes, overallCommentary: extensionShard.overallCommentary, aiExtension: extensionShard.aiExtension, displayContract: constObject(fullSchema.properties.displayContract), audit: constObject(fullSchema.properties.audit) };
  const validation = validatePostCanaryBatch13PublicationOutput(merged, packet); assert.equal(validation.status, "passed"); const mergedText = pretty(merged);
  const scoreDebate = scores.debates.find((item) => item.debateNumber === "87"); assert(scoreDebate); assert.equal(scoreDebate.final.overall.pro.score, 79); assert.equal(scoreDebate.final.overall.con.score, 88);
  const provenance = { schemaVersion: "1.0-assessment-production-post-canary-batch-13-publication-debate-87-exceptional-recovery-provenance", protocolId, debateNumber: "87", originalFailure: { status: "timed-out", partialOutputReused: false }, recoveryLevel1: { contexts: 3, acceptedNonCritiqueFields: true }, recoveryLevel2: { contexts: 10, acceptedContexts: acceptedLevel2Indexes, acceptedCritiques: 15, failedAtomicContextIndexes: [1, 6] }, exceptionalRecoveryLevel3: { contexts: 2, acceptedCritiques: 4, recoveredDiscardedCompanionFields: true, eachUnavailableFieldAcceptedExactlyOnce: true }, merge: { scoresChanged: false, scorePassRerun: false, lockedScores: { pro: 79, con: 88 }, modelAuthoredScores: 0, completeValidationPassed: true } };
  const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-13-publication-exceptional-atomic-recovery-analysis", protocolId, status: "debate-87-exceptional-third-level-atomic-shard-recovery-passed-awaiting-seven-context-resumption", recoveryLevel: 3, exceptionalRecoveryLevelsMaximum: 3, debateNumber: "87", moves: 19, critiques: 19, contextsThisLevel: 2, attemptsThisLevel: 2, retries: 0, timeoutExtensions: 0, directIncrementalCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0, scorePassRerun: false, validation, output: { path: files.mergedOutput, sha256: sha256(mergedText) }, authorization: { sevenOriginalUnattemptedContextResumption: true, furtherRecoveryLevel: false, deterministicCompilation: false, productionMutation: false, nextBatchSelection: false }, nextAuthorizedAction: "resume-seven-original-unattempted-publication-contexts" };
  if (shouldWrite) { await mkdir(path.dirname(files.mergedOutput), { recursive: true }); await mkdir(path.dirname(files.mergedValidation), { recursive: true }); await mkdir(path.dirname(files.mergedProvenance), { recursive: true }); await writeFile(files.mergedOutput, mergedText); await writeFile(files.mergedValidation, pretty(validation)); await writeFile(files.mergedProvenance, pretty(provenance)); await writeFile(files.analysis, pretty(analysis)); }
  console.log(pretty({ status: analysis.status, debateNumber: "87", moves: validation.moves, critiques: validation.critiques, minimumCritiqueCharacters: validation.minimumCritiqueCharacters, exactSourceQuotes: validation.quoteExactSourceMatches, contextsThisLevel: 2, attemptsThisLevel: 2, retries: 0, scorePassRerun: false, directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }));
}
