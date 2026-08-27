#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { validatePostCanaryBatch14PublicationOutput } from "./lib/assessment-production-post-canary-batch-14-publication-validation.mjs";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";

const root = process.cwd();
const publicationRoot = "docs/assessment-production/post-canary-continuation-v1/batch-14/publication-reconstruction";
const resumptionRoot =
  `${publicationRoot}/failure-recovery/original-unattempted-context-resumption-3`;
const recoveryRoot = `${resumptionRoot}/debate-55-timeout-recovery`;
const protocolId = "assessment-production-post-canary-batch-14-publication-timeout-field-disjoint-recovery";
const model = { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription" };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const readJson = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;
const mode = process.argv.find((arg) => ["--prepare", "--activate", "--run", "--analyze"].includes(arg));
assert(mode, "one mode is required");
const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.findIndex((arg) => arg === "--at");
const at = atIndex >= 0 ? process.argv[atIndex + 1] : null;
if (["--prepare", "--activate"].includes(mode)) assert(at && !Number.isNaN(Date.parse(at)), "--at requires an ISO timestamp");

const files = {
  originalPreparation: `${resumptionRoot}/execution-preparation-manifest.json`,
  originalActivation: `${resumptionRoot}/execution-activation.json`,
  originalExecution: `${resumptionRoot}/model-execution.json`,
  originalAnalysis: `${resumptionRoot}/analysis.json`,
  diagnosis: `${resumptionRoot}/debate-55-timeout-diagnosis.json`,
  packet: `${publicationRoot}/packets/debate-55.json`,
  fullSchema: `${publicationRoot}/schemas/debate-55.schema.json`,
  workflow: "docs/assessment-production-workflow.md",
  outputContract: "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
  manual: `${recoveryRoot}/manual.md`,
  preparation: `${recoveryRoot}/execution-preparation-manifest.json`,
  activation: `${recoveryRoot}/execution-activation.json`,
  execution: `${recoveryRoot}/model-execution.json`,
  analysis: `${recoveryRoot}/analysis.json`,
  mergedOutput: `${publicationRoot}/outputs/debate-55.json`,
  mergedValidation: `${publicationRoot}/validations/debate-55.json`,
  mergedProvenance: `${publicationRoot}/provenance/debate-55.json`,
};

function spawnRun(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
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
}

if (mode === "--prepare") {
  const [originalPreparationBytes, originalActivationBytes, originalExecutionBytes, originalAnalysisBytes, diagnosisBytes, packetBytes, fullSchemaBytes, workflowBytes, outputContractBytes, manualBytes] = await Promise.all([
    files.originalPreparation, files.originalActivation, files.originalExecution, files.originalAnalysis, files.diagnosis, files.packet, files.fullSchema, files.workflow, files.outputContract, files.manual,
  ].map((file) => readFile(path.resolve(file))));
  const [originalPreparation, originalExecution, originalAnalysis, diagnosis, packet, fullSchema] = [originalPreparationBytes, originalExecutionBytes, originalAnalysisBytes, diagnosisBytes, packetBytes, fullSchemaBytes].map((bytes) => JSON.parse(bytes));
  assert.equal(originalExecution.status, "five-context-publication-resumption-stopped-with-failure");
  assert.deepEqual(originalExecution.results.map((item) => [item.originalContextIndex, item.debateNumber, item.status]), [[5, "187", "completed-valid"], [6, "160", "completed-valid"], [7, "55", "timed-out"]]);
  assert.deepEqual(originalExecution.unattemptedOriginalContextIndexes, [8, 9]);
  assert.equal(originalAnalysis.status, "five-context-publication-resumption-failed");
  assert.equal(diagnosis.status, "debate-55-original-publication-first-attempt-timed-out-without-output");
  assert(!(await exists(files.mergedOutput)), "Debate 55 output unexpectedly exists");
  const originalContext = originalPreparation.contexts[2];
  assert.equal(originalContext.debateNumber, "55");
  const shardTargets = [["moveProse"], ["summary", "representativeQuotes"], ["overallCommentary", "aiExtension"]];
  const contexts = [];
  for (let index = 0; index < shardTargets.length; index += 1) {
    const targets = shardTargets[index];
    const shardId = `debate-55-shard-${index + 1}`;
    const shardPacket = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-timeout-recovery-packet",
      protocolId,
      shardId,
      debateNumber: "55",
      debateId: packet.debateId,
      assessmentModel: model.label,
      writableFields: targets,
      writableFieldCount: targets.length,
      originalTimedOutOutputAvailable: false,
      rejectedPriorStringsAvailable: false,
      allOtherPublicationFieldsUnavailableAndImmutable: true,
      participantJudgmentClosed: true,
      publicationScoreLocked: true,
      originalPublicationPacket: packet,
    };
    const meta = {
      schemaVersion: { type: "string", const: "1.0-assessment-production-post-canary-batch-14-publication-timeout-recovery-output" },
      protocolId: { type: "string", const: protocolId },
      shardId: { type: "string", const: shardId },
      debateNumber: { type: "string", const: "55" },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: model.label },
      completedAt: { type: "string", minLength: 1 },
    };
    const properties = { ...meta, ...Object.fromEntries(targets.map((field) => [field, fullSchema.properties[field]])) };
    const shardSchema = { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `slugfester-b14-debate55-publication-timeout-recovery-${index + 1}`, type: "object", additionalProperties: false, required: Object.keys(properties), properties };
    const packetPath = `${recoveryRoot}/packets/context-${index}.json`;
    const schemaPath = `${recoveryRoot}/schemas/context-${index}.schema.json`;
    const outputPath = `${recoveryRoot}/outputs/context-${index}.json`;
    const packetOut = pretty(shardPacket);
    const schemaOut = pretty(shardSchema);
    contexts.push({ contextIndex: index, shardId, debateNumber: "55", debateId: packet.debateId, writableFields: targets, writableFieldCount: targets.length, packet: packetPath, packetSha256: sha256(packetOut), schema: schemaPath, schemaSha256: sha256(schemaOut), output: outputPath, packetBytes: Buffer.byteLength(packetOut), schemaBytes: Buffer.byteLength(schemaOut) });
    if (shouldWrite) {
      await mkdir(path.resolve(path.dirname(packetPath)), { recursive: true });
      await mkdir(path.resolve(path.dirname(schemaPath)), { recursive: true });
      await mkdir(path.resolve(path.dirname(outputPath)), { recursive: true });
      await writeFile(path.resolve(packetPath), packetOut);
      await writeFile(path.resolve(schemaPath), schemaOut);
    }
  }
  assert.deepEqual(contexts.flatMap((context) => context.writableFields), ["moveProse", "summary", "representativeQuotes", "overallCommentary", "aiExtension"]);
  assert(contexts.every((context) => context.writableFieldCount <= 2));
  const sourceHashes = {
    [files.originalPreparation]: sha256(originalPreparationBytes), [files.originalActivation]: sha256(originalActivationBytes), [files.originalExecution]: sha256(originalExecutionBytes), [files.originalAnalysis]: sha256(originalAnalysisBytes), [files.diagnosis]: sha256(diagnosisBytes), [files.packet]: sha256(packetBytes), [files.fullSchema]: sha256(fullSchemaBytes), [files.workflow]: sha256(workflowBytes), [files.outputContract]: sha256(outputContractBytes), [files.manual]: sha256(manualBytes),
    "scripts/assessment-production-post-canary-batch-14-publication-resumption-3-debate-55-timeout-recovery.mjs": sha256(await readFile(new URL(import.meta.url))),
    "scripts/lib/assessment-production-post-canary-batch-14-publication-validation.mjs": sha256(await readFile("scripts/lib/assessment-production-post-canary-batch-14-publication-validation.mjs")),
  };
  for (const context of contexts) {
    sourceHashes[context.packet] = context.packetSha256;
    sourceHashes[context.schema] = context.schemaSha256;
  }
  const manifest = { schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-timeout-recovery-preparation", protocolId, status: "frozen-three-context-debate-55-field-disjoint-timeout-recovery-prepared-not-activated", frozenAt: at, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), productionCanary: false, batchNumber: 14, stagingOnly: true, recoveryLevel: 1, recoveryLevelsMaximum: 2, model, originalFailure: { debateNumber: "55", originalContextIndex: 7, status: "timed-out", attemptCount: 1, retryCount: 0, outputWritten: false, partialOutputReusable: false }, contexts, executionPolicy: { contexts: 3, maximumParallelContexts: 2, attemptsPerContext: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0, timeoutMsPerContext: 600000, writableFieldsMaximumPerPacket: 2, directIncrementalCostUsdMaximum: 0, paidServices: false, separateActivationRequired: true, APIKeysRemoved: true, removedEnvironmentVariables: ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"] }, sourceHashes, futureOutputs: [files.activation, files.execution, files.analysis, files.mergedOutput, files.mergedValidation, files.mergedProvenance, ...contexts.map((context) => context.output)], authorization: { preparation: true, activation: true, modelExecution: false, deterministicMergeAndValidation: false, retries: false, paidServices: false, scorePass: false, productionMutation: false, nextBatchSelection: false }, nextAuthorizedAction: "activate-three-field-disjoint-debate-55-publication-timeout-recovery-contexts" };
  for (const future of manifest.futureOutputs) if (future !== files.activation) assert(!(await exists(future)), `future output exists: ${future}`);
  if (shouldWrite) await writeFile(path.resolve(files.preparation), pretty(manifest));
  console.log(pretty({ status: shouldWrite ? manifest.status : "preview", contexts: 3, writableFields: 5, maximumWritableFieldsPerContext: 2, attemptsMaximum: 3, retriesMaximum: 0, directIncrementalCostUsdMaximum: 0, modelExecutionAuthorized: false }));
  process.exit(0);
}

if (mode === "--activate") {
  const preparationBytes = await readFile(path.resolve(files.preparation));
  const preparation = JSON.parse(preparationBytes);
  assert.equal(preparation.status, "frozen-three-context-debate-55-field-disjoint-timeout-recovery-prepared-not-activated");
  assert(!(await exists(files.activation)), "activation exists");
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source changed: ${file}`);
  const activation = { ...preparation, schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-timeout-recovery-activation", status: "frozen-three-context-debate-55-field-disjoint-timeout-recovery-authorized", activatedAt: at, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), preparation: { path: files.preparation, sha256: sha256(preparationBytes) }, authorization: { ...preparation.authorization, modelExecution: true, deterministicMergeAndValidation: true }, nextAuthorizedAction: "execute-three-field-disjoint-debate-55-publication-recovery-contexts-once" };
  if (shouldWrite) await writeFile(path.resolve(files.activation), pretty(activation));
  console.log(pretty({ status: shouldWrite ? activation.status : "preview", contexts: 3, attemptsMaximum: 3, retriesMaximum: 0, directIncrementalCostUsdMaximum: 0, modelExecutionAuthorized: shouldWrite }));
  process.exit(0);
}

if (mode === "--run") {
  const activation = await readJson(files.activation);
  assert.equal(activation.status, "frozen-three-context-debate-55-field-disjoint-timeout-recovery-authorized");
  for (const [file, digest] of Object.entries(activation.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source changed: ${file}`);
  for (const context of activation.contexts) assert(!(await exists(context.output)), `output exists: ${context.output}`);
  const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  async function execute(context) {
    const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-b14-pub55-${context.contextIndex}-`));
    const temporaryHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-b14-pub55-home-${context.contextIndex}-`));
    const startedAt = new Date().toISOString();
    const started = Date.now();
    try {
      await copyFile(path.resolve(files.workflow), path.join(temporary, "workflow.md"));
      await copyFile(path.resolve(files.outputContract), path.join(temporary, "output-contract.md"));
      await copyFile(path.resolve(files.manual), path.join(temporary, "manual.md"));
      await copyFile(path.resolve(context.packet), path.join(temporary, "packet.json"));
      await copyFile(path.resolve(context.schema), path.join(temporary, "schema.json"));
      await copyFile(authSource, path.join(temporaryHome, "auth.json"));
      const environment = { ...process.env, CODEX_HOME: temporaryHome };
      for (const key of activation.executionPolicy.removedEnvironmentVariables) delete environment[key];
      const prompt = `Read workflow.md, output-contract.md, manual.md, packet.json, and schema.json completely and no other files. Act only as the isolated 5.6 Sol/low Debate 55 publication recovery editor for shard ${context.shardId}. Author exactly these top-level fields: ${context.writableFields.join(", ")}. Return exactly one schema-conforming JSON object and no commentary.`;
      const invocation = await spawnRun(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", model.slug, "-c", `model_reasoning_effort=\"${model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, activation.executionPolicy.timeoutMsPerContext);
      const events = extractTransportEvents(invocation.stderr);
      const transportClassification = classifyTransportEventCount(events.length, 2, 8);
      const base = { contextIndex: context.contextIndex, shardId: context.shardId, debateNumber: "55", writableFields: context.writableFields, model: model.label, reasoningEffort: model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, authentication: model.authentication, apiKeysRemoved: true, transportClassification, recoverableStreamEvents: events.length, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr), stderrTail: invocation.stderr.trim().slice(-6000) || null, directIncrementalCostUsd: 0 };
      if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) return { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, gateAcceptancePassed: false };
      const resultBytes = await readFile(path.join(temporary, "result.json"));
      const output = JSON.parse(resultBytes);
      assert.equal(output.shardId, context.shardId);
      assert.deepEqual(Object.keys(output).sort(), ["schemaVersion", "protocolId", "shardId", "debateNumber", "debateId", "assessmentModel", "completedAt", ...context.writableFields].sort());
      await writeFile(path.resolve(context.output), resultBytes);
      return { ...base, status: transportClassification === "invalid" ? "transport-event-limit-exceeded" : "completed-valid", outputWritten: true, outputSha256: sha256(resultBytes), gateAcceptancePassed: transportClassification !== "invalid" };
    } finally {
      await rm(temporary, { recursive: true, force: true });
      await rm(temporaryHome, { recursive: true, force: true });
    }
  }
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const results = [];
  for (let offset = 0; offset < activation.contexts.length; offset += 2) results.push(...await Promise.all(activation.contexts.slice(offset, offset + 2).map(execute)));
  const passed = results.every((result) => result.gateAcceptancePassed);
  const execution = { schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-timeout-recovery-execution", protocolId, status: passed ? "three-context-debate-55-publication-timeout-recovery-execution-passed" : "debate-55-publication-timeout-recovery-execution-failed", startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, contextsAttempted: results.length, validContexts: results.filter((item) => item.gateAcceptancePassed).length, invalidContexts: results.filter((item) => !item.gateAcceptancePassed).length, attempts: results.length, retries: 0, timeoutExtensions: 0, directIncrementalCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0, results, authorization: { analysis: passed, retries: false, paidServices: false, productionMutation: false, nextBatchSelection: false } };
  await writeFile(path.resolve(files.execution), pretty(execution));
  console.log(pretty({ status: execution.status, contextsAttempted: results.length, validContexts: execution.validContexts, invalidContexts: execution.invalidContexts, elapsedMinutes: Number((execution.elapsedMs / 60000).toFixed(2)), retries: 0, directIncrementalCostUsd: 0 }));
  assert(passed, "Debate 55 publication recovery execution failed");
  process.exit(0);
}

if (mode === "--analyze") {
  const [activation, execution, packet, fullSchema] = await Promise.all([files.activation, files.execution, files.packet, files.fullSchema].map(readJson));
  assert.equal(execution.status, "three-context-debate-55-publication-timeout-recovery-execution-passed");
  const shardOutputs = await Promise.all(activation.contexts.map((context) => readJson(context.output)));
  const constObject = (property) => Object.fromEntries(Object.entries(property.properties).map(([key, value]) => [key, value.const]));
  const completedAt = shardOutputs.map((output) => output.completedAt).sort().at(-1);
  const merged = { schemaVersion: fullSchema.properties.schemaVersion.const, protocolId: fullSchema.properties.protocolId.const, debateNumber: "55", debateId: packet.debateId, assessmentModel: model.label, productionCanary: false, stagingOnly: true, completedAt, moveProse: shardOutputs[0].moveProse, summary: shardOutputs[1].summary, representativeQuotes: shardOutputs[1].representativeQuotes, overallCommentary: shardOutputs[2].overallCommentary, aiExtension: shardOutputs[2].aiExtension, displayContract: constObject(fullSchema.properties.displayContract), audit: constObject(fullSchema.properties.audit) };
  const validation = validatePostCanaryBatch14PublicationOutput(merged, packet);
  assert.equal(validation.status, "passed");
  const mergedBytes = pretty(merged);
  const validationRecord = { schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-validation", protocolId: merged.protocolId, status: "passed", debateNumber: "55", debateId: packet.debateId, outputSha256: sha256(mergedBytes), validationSummary: validation, validationMessage: null, modelAuthoredScores: 0, lockedScoresUnchanged: true };
  const provenance = { schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-timeout-recovery-provenance", protocolId, debateNumber: "55", outputSha256: sha256(mergedBytes), sourceFailure: { originalContextIndex: 7, status: "timed-out", partialOutputReused: false }, shards: activation.contexts.map((context, index) => ({ shardId: context.shardId, writableFields: context.writableFields, output: context.output, outputSha256: sha256(pretty(shardOutputs[index])) })), merge: { eachTopLevelWritableFieldAcceptedExactlyOnce: true, nonModelIdentityAndAuditFieldsFilledFromFrozenSchemaConstants: true, fullMergedValidationPassed: true, scoresChanged: false, scorePassRerun: false } };
  const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-timeout-recovery-analysis", protocolId, status: "debate-55-field-disjoint-publication-timeout-recovery-passed-awaiting-two-context-resumption", debateNumber: "55", originalFailurePreserved: true, recoveryLevel: 1, recoveryLevelsMaximum: 2, contexts: 3, writableFields: 5, attempts: 3, retries: 0, timeoutExtensions: 0, directIncrementalCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0, validation, output: { path: files.mergedOutput, sha256: sha256(mergedBytes) }, authorization: { twoOriginalUnattemptedContextResumption: true, furtherDebate55Recovery: false, deterministicCompilation: false, productionMutation: false, nextBatchSelection: false } };
  if (shouldWrite) {
    await mkdir(path.resolve(path.dirname(files.mergedOutput)), { recursive: true });
    await mkdir(path.resolve(path.dirname(files.mergedValidation)), { recursive: true });
    await mkdir(path.resolve(path.dirname(files.mergedProvenance)), { recursive: true });
    await writeFile(path.resolve(files.mergedOutput), mergedBytes);
    await writeFile(path.resolve(files.mergedValidation), pretty(validationRecord));
    await writeFile(path.resolve(files.mergedProvenance), pretty(provenance));
    await writeFile(path.resolve(files.analysis), pretty(analysis));
  }
  console.log(pretty({ status: analysis.status, debateNumber: "55", moves: validation.moves, critiques: validation.critiques, exactSourceQuotes: validation.quoteExactSourceMatches, contexts: 3, attempts: 3, retries: 0, directIncrementalCostUsd: 0, nextAuthorizedAction: "resume-two-original-unattempted-publication-contexts" }));
}
