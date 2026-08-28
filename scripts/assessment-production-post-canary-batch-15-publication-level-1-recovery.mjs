#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { validatePostCanaryBatch15PublicationOutput } from "./lib/assessment-production-post-canary-batch-15-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";

const publicationRoot = "docs/assessment-production/post-canary-continuation-v1/batch-15/publication-reconstruction";
const root = `${publicationRoot}/failure-recovery/level-1`;
const protocolId = "assessment-production-post-canary-batch-15-publication-level-1-field-disjoint-recovery";
const model = { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription" };
const mode = process.argv.find((arg) => ["--prepare", "--activate", "--run", "--analyze"].includes(arg));
const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--at");
const at = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assert(mode, "one mode is required");
if (["--prepare", "--activate"].includes(mode)) assert(at && !Number.isNaN(Date.parse(at)), "--at requires an ISO timestamp");

const files = {
  diagnosis: `${publicationRoot}/failure-recovery/diagnosis.json`,
  originalExecution: `${publicationRoot}/model-execution.json`,
  originalAnalysis: `${publicationRoot}/analysis.json`,
  workflow: "docs/assessment-production-workflow.md",
  outputContract: "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
  originalManual: `${publicationRoot}/manual.md`,
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
const noveltyItems = (output) => ["pro", "con"].flatMap((side) => {
  const extension = output.aiExtension[side];
  return [extension.thesis, ...extension.premises, extension.conclusion, ...extension.newArguments];
});
const spawnRun = (command, args, options, timeoutMs) => new Promise((resolve) => {
  const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
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

if (mode === "--prepare") {
  const diagnosis = await readJson(files.diagnosis);
  const originalExecution = await readJson(files.originalExecution);
  assert.equal(diagnosis.status, "batch-15-publication-three-bounded-field-failures-and-one-timeout-diagnosed");
  assert.equal(diagnosis.totals.invalidFields, 28);
  assert.equal(originalExecution.status, "post-canary-batch-15-publication-gate-complete-with-failure");
  const sourceFiles = [
    files.diagnosis, files.originalExecution, files.originalAnalysis, files.workflow,
    files.outputContract, files.originalManual, files.manual,
    "scripts/assessment-production-post-canary-batch-15-publication-level-1-recovery.mjs",
    "scripts/lib/assessment-production-post-canary-batch-15-publication-validation.mjs"
  ];
  const repairDebates = {};
  for (const item of diagnosis.validationFailures) {
    const debateNumber = item.debateNumber;
    const packetPath = `${publicationRoot}/packets/debate-${debateNumber}.json`;
    const schemaPath = `${publicationRoot}/schemas/debate-${debateNumber}.schema.json`;
    const outputPath = `${publicationRoot}/outputs/debate-${debateNumber}.json`;
    const validationPath = `${publicationRoot}/validations/debate-${debateNumber}.json`;
    const provenancePath = `${publicationRoot}/provenance/debate-${debateNumber}.json`;
    sourceFiles.push(packetPath, schemaPath, outputPath, validationPath, provenancePath);
    repairDebates[debateNumber] = {
      packet: await readJson(packetPath),
      output: await readJson(outputPath),
      diagnosis: item,
      paths: { packetPath, schemaPath, outputPath, validationPath, provenancePath }
    };
  }
  const timeoutPacketPath = `${publicationRoot}/packets/debate-128.json`;
  const timeoutSchemaPath = `${publicationRoot}/schemas/debate-128.schema.json`;
  sourceFiles.push(timeoutPacketPath, timeoutSchemaPath);
  const timeoutPacket = await readJson(timeoutPacketPath);
  const timeoutSchema = await readJson(timeoutSchemaPath);

  const contexts = [];
  for (const debateNumber of ["98", "155", "178"]) {
    const debate = repairDebates[debateNumber];
    const targets = [
      ...debate.diagnosis.invalidCritiques.map((item) => ({ kind: "critique", debateNumber, moveId: item.moveId })),
      ...debate.diagnosis.invalidNoveltyExplanations.map((item) => ({ kind: "noveltyExplanation", debateNumber, itemId: item.itemId }))
    ];
    for (let offset = 0; offset < targets.length; offset += 2) {
      const shardTargets = targets.slice(offset, offset + 2).map((target) => {
        if (target.kind === "critique") {
          const lockedMove = debate.packet.moves.find((move) => move.moveId === target.moveId);
          const immutable = debate.output.moveProse[target.moveId];
          return { ...target, lockedMove, immutablePublicationFields: { role: immutable.role, words: immutable.words, tags: immutable.tags }, rejectedPriorStringAvailable: false };
        }
        const originalItem = noveltyItems(debate.output).find((item) => item.id === target.itemId);
        return { ...target, immutableExtensionItem: { id: originalItem.id, text: originalItem.text, novelty: { classification: originalItem.novelty.classification, sourceMoveIds: originalItem.novelty.sourceMoveIds } }, rejectedPriorStringAvailable: false };
      });
      const contextIndex = contexts.length;
      const shardId = `debate-${debateNumber}-field-repair-${Math.floor(offset / 2) + 1}`;
      const packet = {
        schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-level-1-field-repair-packet",
        protocolId, contextIndex, shardId, debateNumber, debateId: debate.packet.debateId,
        assessmentModel: model.label, writableFieldCount: shardTargets.length, targets: shardTargets,
        allOtherFieldsUnavailableAndImmutable: true, participantJudgmentClosed: true, publicationScoreLocked: true
      };
      const itemSchemas = shardTargets.map((target) => target.kind === "critique" ? {
        type: "object", additionalProperties: false,
        required: ["kind", "debateNumber", "moveId", "critique"],
        properties: {
          kind: { type: "string", const: "critique" }, debateNumber: { type: "string", const: debateNumber },
          moveId: { type: "string", const: target.moveId }, critique: { type: "string", minLength: 880, maxLength: 1800 }
        }
      } : {
        type: "object", additionalProperties: false,
        required: ["kind", "debateNumber", "itemId", "explanation"],
        properties: {
          kind: { type: "string", const: "noveltyExplanation" }, debateNumber: { type: "string", const: debateNumber },
          itemId: { type: "string", const: target.itemId }, explanation: { type: "string", minLength: 45, maxLength: 500 }
        }
      });
      const properties = {
        schemaVersion: { type: "string", const: "1.0-assessment-production-post-canary-batch-15-publication-level-1-field-repair-output" },
        protocolId: { type: "string", const: protocolId }, contextIndex: { type: "integer", const: contextIndex },
        shardId: { type: "string", const: shardId }, debateNumber: { type: "string", const: debateNumber },
        debateId: { type: "string", const: debate.packet.debateId }, assessmentModel: { type: "string", const: model.label },
        completedAt: { type: "string", minLength: 1 }, corrections: { type: "array", minItems: shardTargets.length, maxItems: shardTargets.length, items: { anyOf: itemSchemas } }
      };
      const schema = { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `slugfester-b15-${shardId}`, type: "object", additionalProperties: false, required: Object.keys(properties), properties };
      const packetPath = `${root}/packets/context-${contextIndex}.json`;
      const schemaPath = `${root}/schemas/context-${contextIndex}.schema.json`;
      const outputPath = `${root}/outputs/context-${contextIndex}.json`;
      const packetText = pretty(packet);
      const schemaText = pretty(schema);
      contexts.push({ contextIndex, type: "field-repair", shardId, debateNumber, targets: shardTargets.map(({ kind, debateNumber: number, moveId, itemId }) => ({ kind, debateNumber: number, ...(moveId ? { moveId } : { itemId }) })), writableFieldCount: shardTargets.length, packet: packetPath, packetSha256: sha256(packetText), schema: schemaPath, schemaSha256: sha256(schemaText), output: outputPath });
      if (shouldWrite) {
        await mkdir(path.dirname(path.resolve(packetPath)), { recursive: true });
        await mkdir(path.dirname(path.resolve(schemaPath)), { recursive: true });
        await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
        await writeFile(path.resolve(packetPath), packetText);
        await writeFile(path.resolve(schemaPath), schemaText);
      }
    }
  }
  const timeoutFieldGroups = [["moveProse"], ["summary", "representativeQuotes"], ["overallCommentary", "aiExtension"]];
  for (const writableFields of timeoutFieldGroups) {
    const contextIndex = contexts.length;
    const shardId = `debate-128-timeout-recovery-${contexts.length - 13}`;
    const packet = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-timeout-recovery-packet",
      protocolId, contextIndex, shardId, debateNumber: "128", debateId: timeoutPacket.debateId,
      assessmentModel: model.label, writableFields, writableFieldCount: writableFields.length,
      originalTimedOutOutputAvailable: false, rejectedPriorStringsAvailable: false,
      allOtherPublicationFieldsUnavailableAndImmutable: true, participantJudgmentClosed: true,
      publicationScoreLocked: true, originalPublicationPacket: timeoutPacket
    };
    const meta = {
      schemaVersion: { type: "string", const: "1.0-assessment-production-post-canary-batch-15-publication-timeout-recovery-output" },
      protocolId: { type: "string", const: protocolId }, contextIndex: { type: "integer", const: contextIndex },
      shardId: { type: "string", const: shardId }, debateNumber: { type: "string", const: "128" },
      debateId: { type: "string", const: timeoutPacket.debateId }, assessmentModel: { type: "string", const: model.label },
      completedAt: { type: "string", minLength: 1 }
    };
    const properties = { ...meta, ...Object.fromEntries(writableFields.map((field) => [field, timeoutSchema.properties[field]])) };
    const schema = { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `slugfester-b15-${shardId}`, type: "object", additionalProperties: false, required: Object.keys(properties), properties };
    const packetPath = `${root}/packets/context-${contextIndex}.json`;
    const schemaPath = `${root}/schemas/context-${contextIndex}.schema.json`;
    const outputPath = `${root}/outputs/context-${contextIndex}.json`;
    const packetText = pretty(packet);
    const schemaText = pretty(schema);
    contexts.push({ contextIndex, type: "timeout-recovery", shardId, debateNumber: "128", writableFields, writableFieldCount: writableFields.length, packet: packetPath, packetSha256: sha256(packetText), schema: schemaPath, schemaSha256: sha256(schemaText), output: outputPath });
    if (shouldWrite) {
      await mkdir(path.dirname(path.resolve(packetPath)), { recursive: true });
      await mkdir(path.dirname(path.resolve(schemaPath)), { recursive: true });
      await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
      await writeFile(path.resolve(packetPath), packetText);
      await writeFile(path.resolve(schemaPath), schemaText);
    }
  }
  assert.equal(contexts.length, 17);
  assert.equal(contexts.filter((item) => item.type === "field-repair").reduce((sum, item) => sum + item.writableFieldCount, 0), 28);
  assert.equal(contexts.filter((item) => item.type === "timeout-recovery").length, 3);
  assert(contexts.every((item) => item.writableFieldCount <= 2));
  const sourceHashes = {};
  for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
  for (const context of contexts) {
    sourceHashes[context.packet] = context.packetSha256;
    sourceHashes[context.schema] = context.schemaSha256;
  }
  const futureOutputs = [files.activation, files.execution, files.analysis, ...contexts.map((item) => item.output), `${publicationRoot}/outputs/debate-128.json`, `${publicationRoot}/validations/debate-128.json`, `${publicationRoot}/provenance/debate-128.json`];
  for (const file of futureOutputs) assert(!(await exists(file)), `future output exists: ${file}`);
  const manifest = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-level-1-recovery-preparation",
    protocolId, status: "frozen-seventeen-context-batch-15-publication-recovery-level-1-prepared-not-activated",
    frozenAt: at, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    productionCanary: false, batchNumber: 15, stagingOnly: true, recoveryLevel: 1, recoveryLevelsMaximum: 2,
    model, contexts,
    executionPolicy: { contexts: 17, maximumParallelContexts: 2, attemptsPerContext: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0, timeoutMsPerContext: 600000, writableFieldsMaximumPerPacket: 2, directIncrementalCostUsdMaximum: 0, paidServices: false, separateActivationRequired: true, APIKeysRemoved: true, removedEnvironmentVariables: ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"] },
    sourceHashes, futureOutputs,
    authorization: { preparation: true, activation: true, modelExecution: false, deterministicMergeAndValidation: false, retries: false, furtherRecoveryLevel: false, scorePass: false, productionMutation: false, nextBatchSelection: false },
    nextAuthorizedAction: "activate-seventeen-minimum-field-disjoint-batch-15-publication-recovery-contexts"
  };
  if (shouldWrite) await writeFile(path.resolve(files.preparation), pretty(manifest));
  console.log(pretty({ status: shouldWrite ? manifest.status : "preview", contexts: 17, fieldRepairShards: 14, repairedFields: 28, timeoutRecoveryShards: 3, attemptsMaximum: 17, retriesMaximum: 0, recoveryLevel: 1, directIncrementalCostUsdMaximum: 0, modelExecutionAuthorized: false }));
  process.exit(0);
}

if (mode === "--activate") {
  const bytes = await readFile(path.resolve(files.preparation));
  const preparation = JSON.parse(bytes);
  assert.equal(preparation.status, "frozen-seventeen-context-batch-15-publication-recovery-level-1-prepared-not-activated");
  assert(!(await exists(files.activation)), "activation exists");
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source changed: ${file}`);
  const activation = {
    ...preparation,
    schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-level-1-recovery-activation",
    status: "frozen-seventeen-context-batch-15-publication-recovery-level-1-authorized",
    activatedAt: at, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    preparation: { path: files.preparation, sha256: sha256(bytes) },
    authorization: { ...preparation.authorization, modelExecution: true, deterministicMergeAndValidation: true },
    nextAuthorizedAction: "execute-seventeen-minimum-field-disjoint-batch-15-publication-recovery-contexts-once"
  };
  if (shouldWrite) await writeFile(path.resolve(files.activation), pretty(activation));
  console.log(pretty({ status: shouldWrite ? activation.status : "preview", contexts: 17, attemptsMaximum: 17, retriesMaximum: 0, recoveryLevel: 1, directIncrementalCostUsdMaximum: 0, modelExecutionAuthorized: shouldWrite }));
  process.exit(0);
}

if (mode === "--run") {
  const activation = await readJson(files.activation);
  assert.equal(activation.status, "frozen-seventeen-context-batch-15-publication-recovery-level-1-authorized");
  for (const [file, digest] of Object.entries(activation.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source changed: ${file}`);
  for (const context of activation.contexts) assert(!(await exists(context.output)), `output exists: ${context.output}`);
  const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  const execute = async (context) => {
    const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-b15-pub-r1-${context.contextIndex}-`));
    const temporaryHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-b15-pub-r1-home-${context.contextIndex}-`));
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
      const task = context.type === "field-repair"
        ? `Author exactly ${context.writableFieldCount} correction object${context.writableFieldCount === 1 ? "" : "s"} in packet order and no unlisted field.`
        : `Author exactly these top-level fields and no others: ${context.writableFields.join(", ")}.`;
      const prompt = `Read workflow.md, output-contract.md, manual.md, packet.json, and schema.json completely and no other files. Act only as the fresh isolated 5.6 Sol/low Batch 15 publication recovery editor for ${context.shardId}. ${task} Return exactly one schema-conforming JSON object and no commentary.`;
      const invocation = await spawnRun(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", model.slug, "-c", `model_reasoning_effort=\"${model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, activation.executionPolicy.timeoutMsPerContext);
      const events = extractTransportEvents(invocation.stderr);
      const transportClassification = classifyTransportEventCount(events.length, 2, 8);
      const base = { contextIndex: context.contextIndex, type: context.type, shardId: context.shardId, debateNumber: context.debateNumber, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, model: model.label, reasoningEffort: model.reasoningEffort, authentication: model.authentication, apiKeysRemoved: true, transportClassification, recoverableStreamEvents: events.length, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr), stderrTail: invocation.stderr.trim().slice(-6000) || null, directIncrementalCostUsd: 0 };
      if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) return { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, gateAcceptancePassed: false };
      const resultBytes = await readFile(path.join(temporary, "result.json"));
      const output = JSON.parse(resultBytes);
      assert.equal(output.contextIndex, context.contextIndex);
      assert.equal(output.shardId, context.shardId);
      if (context.type === "field-repair") {
        assert.equal(output.corrections.length, context.targets.length);
        assert.deepEqual(output.corrections.map((item) => item.kind), context.targets.map((item) => item.kind));
        output.corrections.forEach((correction, index) => {
          const target = context.targets[index];
          assert.equal(correction.debateNumber, target.debateNumber);
          if (target.kind === "critique") {
            assert.equal(correction.moveId, target.moveId);
            validateCritique(correction.critique, correction.moveId);
          } else {
            assert.equal(correction.itemId, target.itemId);
            assert(wordCount(correction.explanation) >= 8, `${correction.itemId}: novelty explanation too short`);
          }
        });
      } else {
        assert.deepEqual(Object.keys(output).sort(), ["schemaVersion", "protocolId", "contextIndex", "shardId", "debateNumber", "debateId", "assessmentModel", "completedAt", ...context.writableFields].sort());
      }
      await writeFile(path.resolve(context.output), resultBytes);
      return { ...base, status: transportClassification === "invalid" ? "transport-event-limit-exceeded" : "completed-valid", outputWritten: true, outputSha256: sha256(resultBytes), gateAcceptancePassed: transportClassification !== "invalid" };
    } catch (error) {
      return { contextIndex: context.contextIndex, type: context.type, shardId: context.shardId, debateNumber: context.debateNumber, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, model: model.label, reasoningEffort: model.reasoningEffort, authentication: model.authentication, directIncrementalCostUsd: 0, status: "output-validation-failed", outputWritten: await exists(context.output), gateAcceptancePassed: false, validationMessage: String(error?.stack ?? error).slice(-6000) };
    } finally {
      await rm(temporary, { recursive: true, force: true });
      await rm(temporaryHome, { recursive: true, force: true });
    }
  };
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const results = [];
  for (let offset = 0; offset < activation.contexts.length; offset += 2) {
    const pair = activation.contexts.slice(offset, offset + 2);
    console.error(`[batch-15-publication-recovery-1] starting ${pair.map((item) => item.shardId).join(", ")}`);
    results.push(...await Promise.all(pair.map(execute)));
    for (const result of results.slice(-pair.length)) console.error(`[batch-15-publication-recovery-1] ${result.shardId} ${result.status} ${(result.elapsedMs / 60000).toFixed(2)}m`);
  }
  const passed = results.every((item) => item.gateAcceptancePassed);
  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-level-1-recovery-execution",
    protocolId, status: passed ? "seventeen-context-batch-15-publication-recovery-level-1-execution-passed" : "batch-15-publication-recovery-level-1-execution-failed",
    startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started,
    contextsAttempted: results.length, validContexts: results.filter((item) => item.gateAcceptancePassed).length,
    invalidContexts: results.filter((item) => !item.gateAcceptancePassed).length, attempts: results.length,
    retries: 0, timeoutExtensions: 0, directIncrementalCostUsd: 0, paidServiceCalls: 0,
    modelAuthoredScores: 0, results,
    authorization: { analysis: passed, retries: false, furtherRecoveryLevel: !passed, paidServices: false, scorePass: false, productionMutation: false, nextBatchSelection: false }
  };
  await writeFile(path.resolve(files.execution), pretty(execution));
  console.log(pretty({ status: execution.status, contextsAttempted: results.length, validContexts: execution.validContexts, invalidContexts: execution.invalidContexts, elapsedMinutes: Number((execution.elapsedMs / 60000).toFixed(2)), attempts: results.length, retries: 0, recoveryLevel: 1, directIncrementalCostUsd: 0 }));
  process.exit(0);
}

if (mode === "--analyze") {
  const [activation, execution, diagnosis] = await Promise.all([files.activation, files.execution, files.diagnosis].map(readJson));
  assert.equal(execution.status, "seventeen-context-batch-15-publication-recovery-level-1-execution-passed");
  const contextOutputs = new Map(await Promise.all(activation.contexts.map(async (context) => [context.contextIndex, await readJson(context.output)])));
  const validationResults = [];
  for (const debateNumber of ["98", "155", "178"]) {
    const packetPath = `${publicationRoot}/packets/debate-${debateNumber}.json`;
    const failedOutputPath = `${publicationRoot}/outputs/debate-${debateNumber}.json`;
    const failedValidationPath = `${publicationRoot}/validations/debate-${debateNumber}.json`;
    const failedProvenancePath = `${publicationRoot}/provenance/debate-${debateNumber}.json`;
    const [packet, failedOutput, failedValidation, failedProvenance, failedOutputBytes, failedValidationBytes, failedProvenanceBytes] = await Promise.all([
      readJson(packetPath), readJson(failedOutputPath), readJson(failedValidationPath), readJson(failedProvenancePath),
      readFile(path.resolve(failedOutputPath)), readFile(path.resolve(failedValidationPath)), readFile(path.resolve(failedProvenancePath))
    ]);
    const contexts = activation.contexts.filter((item) => item.type === "field-repair" && item.debateNumber === debateNumber);
    const corrections = contexts.flatMap((context) => contextOutputs.get(context.contextIndex).corrections);
    const expected = diagnosis.validationFailures.find((item) => item.debateNumber === debateNumber);
    assert.equal(corrections.length, expected.invalidFieldCount);
    const merged = structuredClone(failedOutput);
    for (const correction of corrections) {
      if (correction.kind === "critique") {
        validateCritique(correction.critique, correction.moveId);
        merged.moveProse[correction.moveId].critique = correction.critique;
      } else {
        assert(wordCount(correction.explanation) >= 8, `${correction.itemId}: novelty explanation too short`);
        noveltyItems(merged).find((item) => item.id === correction.itemId).novelty.explanation = correction.explanation;
      }
    }
    const replay = structuredClone(merged);
    for (const correction of corrections) {
      if (correction.kind === "critique") replay.moveProse[correction.moveId].critique = failedOutput.moveProse[correction.moveId].critique;
      else noveltyItems(replay).find((item) => item.id === correction.itemId).novelty.explanation = noveltyItems(failedOutput).find((item) => item.id === correction.itemId).novelty.explanation;
    }
    assert.deepEqual(replay, failedOutput, `Debate ${debateNumber}: accepted companion field changed`);
    const validation = validatePostCanaryBatch15PublicationOutput(merged, packet);
    assert.equal(validation.status, "passed");
    const mergedBytes = Buffer.from(pretty(merged));
    const validationRecord = { schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-validation", protocolId: merged.protocolId, status: "passed", debateNumber, debateId: packet.debateId, outputSha256: sha256(mergedBytes), validationSummary: validation, validationMessage: null, modelAuthoredScores: 0, lockedScoresUnchanged: true };
    const provenance = { schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-level-1-recovery-provenance", protocolId, debateNumber, originalFailure: { status: "output-validation-failed", originalOutputPreserved: true }, recoveryLevel1: { contexts: contexts.length, acceptedFields: corrections.length, acceptedCompanionFieldsReused: true, eachTargetFieldAcceptedExactlyOnce: true }, merge: { acceptedFieldsChanged: false, scoresChanged: false, scorePassRerun: false, modelAuthoredScores: 0, completeValidationPassed: true } };
    if (shouldWrite) {
      const preservedRoot = `${root}/preserved`;
      await mkdir(path.resolve(preservedRoot), { recursive: true });
      await writeFile(path.resolve(`${preservedRoot}/debate-${debateNumber}-original-output.json`), failedOutputBytes);
      await writeFile(path.resolve(`${preservedRoot}/debate-${debateNumber}-original-validation.json`), failedValidationBytes);
      await writeFile(path.resolve(`${preservedRoot}/debate-${debateNumber}-original-provenance.json`), failedProvenanceBytes);
      await writeFile(path.resolve(failedOutputPath), mergedBytes);
      await writeFile(path.resolve(failedValidationPath), pretty(validationRecord));
      await writeFile(path.resolve(failedProvenancePath), pretty(provenance));
    }
    validationResults.push({ debateNumber, sourceFailure: "output-validation-failed", contexts: contexts.length, repairedFields: corrections.length, validation });
  }

  const timeoutContexts = activation.contexts.filter((item) => item.type === "timeout-recovery");
  const timeoutOutputs = timeoutContexts.map((context) => contextOutputs.get(context.contextIndex));
  const timeoutPacket = await readJson(`${publicationRoot}/packets/debate-128.json`);
  const fullSchema = await readJson(`${publicationRoot}/schemas/debate-128.schema.json`);
  const constObject = (property) => Object.fromEntries(Object.entries(property.properties).map(([key, value]) => [key, value.const]));
  const merged128 = {
    schemaVersion: fullSchema.properties.schemaVersion.const,
    protocolId: fullSchema.properties.protocolId.const,
    debateNumber: "128", debateId: timeoutPacket.debateId, assessmentModel: model.label,
    productionCanary: false, stagingOnly: true,
    completedAt: timeoutOutputs.map((output) => output.completedAt).sort().at(-1),
    moveProse: timeoutOutputs[0].moveProse,
    summary: timeoutOutputs[1].summary,
    representativeQuotes: timeoutOutputs[1].representativeQuotes,
    overallCommentary: timeoutOutputs[2].overallCommentary,
    aiExtension: timeoutOutputs[2].aiExtension,
    displayContract: constObject(fullSchema.properties.displayContract),
    audit: constObject(fullSchema.properties.audit)
  };
  const validation128 = validatePostCanaryBatch15PublicationOutput(merged128, timeoutPacket);
  assert.equal(validation128.status, "passed");
  const merged128Bytes = Buffer.from(pretty(merged128));
  const validation128Record = { schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-validation", protocolId: merged128.protocolId, status: "passed", debateNumber: "128", debateId: timeoutPacket.debateId, outputSha256: sha256(merged128Bytes), validationSummary: validation128, validationMessage: null, modelAuthoredScores: 0, lockedScoresUnchanged: true };
  const provenance128 = { schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-timeout-recovery-provenance", protocolId, debateNumber: "128", outputSha256: sha256(merged128Bytes), sourceFailure: { status: "timed-out", partialOutputReused: false }, shards: timeoutContexts.map((context) => ({ shardId: context.shardId, writableFields: context.writableFields, output: context.output, outputSha256: sha256(pretty(contextOutputs.get(context.contextIndex))) })), merge: { eachTopLevelWritableFieldAcceptedExactlyOnce: true, nonModelIdentityAndAuditFieldsFilledFromFrozenSchemaConstants: true, fullMergedValidationPassed: true, scoresChanged: false, scorePassRerun: false } };
  if (shouldWrite) {
    await mkdir(path.resolve(`${publicationRoot}/outputs`), { recursive: true });
    await mkdir(path.resolve(`${publicationRoot}/validations`), { recursive: true });
    await mkdir(path.resolve(`${publicationRoot}/provenance`), { recursive: true });
    await writeFile(path.resolve(`${publicationRoot}/outputs/debate-128.json`), merged128Bytes);
    await writeFile(path.resolve(`${publicationRoot}/validations/debate-128.json`), pretty(validation128Record));
    await writeFile(path.resolve(`${publicationRoot}/provenance/debate-128.json`), pretty(provenance128));
  }
  validationResults.push({ debateNumber: "128", sourceFailure: "timed-out", contexts: 3, repairedFields: 5, validation: validation128 });
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-level-1-recovery-analysis",
    protocolId, status: "batch-15-publication-level-1-field-disjoint-recovery-passed",
    recoveryLevel: 1, recoveryLevelsMaximum: 2, originalFailuresPreserved: true,
    contexts: 17, attempts: 17, retries: 0, timeoutExtensions: 0,
    repairedValidationFields: 28, recoveredTimeoutTopLevelFields: 5,
    directIncrementalCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0,
    validationResults,
    authorization: { publicationFinalization: true, furtherRecoveryLevel: false, scorePass: false, productionMutation: false, nextBatchSelection: false },
    nextAuthorizedAction: "rebuild-and-validate-complete-batch-15-publication-cohort"
  };
  if (shouldWrite) await writeFile(path.resolve(files.analysis), pretty(analysis));
  console.log(pretty({ status: analysis.status, recoveredDebates: validationResults.map((item) => item.debateNumber), contexts: 17, attempts: 17, retries: 0, repairedValidationFields: 28, recoveredTimeoutTopLevelFields: 5, directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }));
}
