#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { V38_DEBATE_NUMBERS, V38_ROOT, assert } from "./lib/v38-source-preparation.mjs";
import { V38_SOURCE_EXECUTION_MANIFEST } from "./lib/v38-source-execution.mjs";

const root = process.cwd();
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const manifestText = await read(V38_SOURCE_EXECUTION_MANIFEST);
const manifest = JSON.parse(manifestText);
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const concurrency = Number(process.env.SLUGFESTER_MODEL_CONCURRENCY ?? 2);
assert(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 3, "SLUGFESTER_MODEL_CONCURRENCY must be 1-3");
assert(manifest.status === "frozen-source-execution-authorized" && manifest.authorization.sourcePreparationModelExecution, "source execution is not authorized");
assert(manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.modelOutputRetriesMaximum === 0, "attempt policy invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
await access(codex); await access(authSource);

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); });
    child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
    child.on("error", (error) => resolve({ code: null, stdout, stderr, spawnError: error.message }));
    child.on("close", (code) => resolve({ code, stdout, stderr, spawnError: null }));
  });
}
async function pool(tasks) {
  let next = 0;
  const results = new Array(tasks.length);
  const workers = Array.from({ length: Math.min(concurrency, tasks.length || 1) }, async () => {
    while (next < tasks.length) { const index = next; next += 1; results[index] = await tasks[index](); }
  });
  await Promise.all(workers);
  return results;
}
const schemaPattern = /(invalid[^\n]{0,80}(json )?schema|response[_ -]?format[^\n]{0,80}(invalid|unsupported|reject)|json schema[^\n]{0,80}(invalid|unsupported|reject))/i;
const streamPattern = /(reconnect|resum(?:e|ing)|stream[^\n]{0,50}recover|retrying[^\n]{0,50}stream)/ig;

function stagePrompt(stage) {
  if (stage === "proposal") return "Read workflow.md, rubric.md, manual.md, packet.json, transcript.txt, and events.json completely and no other files. Act only as the source-proposal role. Return exactly one schema-conforming JSON object. Define both routes and all eight candidates in order, with four candidates per side, 25-180 normalized words per event span, coverage of at least three time quartiles, at least two provisional no-contact cases, two supports, two attacks, and motion, central, and subsidiary contact. Do not score or write assessment prose.";
  if (stage === "review") return "Read workflow.md, rubric.md, manual.md, packet.json, transcript.txt, and events.json completely and no other files. Act only as the isolated source-review role. Independently review every route, bridge, candidate, speaker attribution, and provisional contact in order. The proposal's labels and rationales are not available. Return exactly one schema-conforming JSON object and no scores or assessment prose.";
  return "Read workflow.md, rubric.md, manual.md, packet.json, transcript.txt, and events.json completely and no other files. Act only as the isolated source-adjudication role. Decide every disputed preparation field in order and select only one anonymous option supplied for that field. Do not infer pass identity, add a third value, score participants, or write assessment prose. Return exactly one schema-conforming JSON object.";
}

async function modelTask(stage, context) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v38-${stage}-${context.debateNumber}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v38-home-${stage}-${context.debateNumber}-`));
  const startedAt = new Date().toISOString();
  try {
    const sources = [
      [manifest.modelInputs.workflow, "workflow.md"], [manifest.modelInputs.rubric, "rubric.md"], [manifest.modelInputs.manual, "manual.md"],
      [context.packet, "packet.json"], [context.schema, "schema.json"], [context.transcript, "transcript.txt"], [context.events, "events.json"]
    ];
    for (const [source, target] of sources) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
    delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
    process.stdout.write(`\n[v3.8-source] starting ${manifest.model.label} Debate ${context.debateNumber} ${stage}\n`);
    const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", stagePrompt(stage)], { cwd: temporary, env: environment });
    const log = `${invocation.stdout}\n${invocation.stderr}`;
    const base = { stage, debateNumber: context.debateNumber, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, itemCount: context.itemCount, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), subscriptionAuthenticated: true, apiKeysRemoved: true, meteredApiCostUsd: 0, commandExitCode: invocation.code, preInferenceSchemaRejected: invocation.code !== 0 && schemaPattern.test(log), sameRequestStreamRecoveries: [...log.matchAll(streamPattern)].length, spawnError: invocation.spawnError };
    if (invocation.code !== 0) return { ...base, status: base.preInferenceSchemaRejected ? "pre-inference-schema-rejected" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, invalidItemCount: context.itemCount, scoringFieldCount: 0 };
    const outputPath = path.resolve(root, context.output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    try {
      await copyFile(path.join(temporary, "result.json"), outputPath);
      const outputText = await readFile(outputPath, "utf8"), parsed = JSON.parse(outputText);
      let validatorArgs;
      if (stage === "proposal") validatorArgs = ["scripts/validate-v38-source-proposal.mjs", context.output, context.packet, context.schema, context.events];
      else if (stage === "review") validatorArgs = ["scripts/validate-v38-source-review.mjs", context.output, context.proposalPacket, context.proposal, context.packet, context.schema];
      else validatorArgs = ["scripts/validate-v38-source-adjudication.mjs", context.output, context.packet, context.schema];
      const validation = await run(process.execPath, validatorArgs, { cwd: root, env: process.env });
      const valid = validation.code === 0;
      process.stdout.write(`[v3.8-source] Debate ${context.debateNumber} ${stage} ${valid ? "completed-valid" : "output-validation-failed"}\n`);
      return { ...base, status: valid ? "completed-valid" : "output-validation-failed", outputWritten: true, outputSha256: sha256(outputText), deterministicValidationPassed: valid, invalidItemCount: valid ? 0 : context.itemCount, scoringFieldCount: containsScoreField(parsed) ? 1 : 0, validationExitCode: validation.code, validationMessage: valid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-1600) };
    } catch (error) {
      return { ...base, status: "output-validation-failed", outputWritten: false, deterministicValidationPassed: false, invalidItemCount: context.itemCount, scoringFieldCount: 0, outputError: error.message };
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
}

function executionRecord(schemaVersion, stage, startedAt, contexts, results) {
  return { schemaVersion, gateId: manifest.gateId, stage, startedAt, completedAt: new Date().toISOString(), authentication: "ChatGPT subscription auth copied into isolated temporary CODEX_HOME; API keys removed", contextsPlanned: contexts.length, contextsCompleted: results.filter((item) => item.commandExitCode === 0).length, validOutputContexts: results.filter((item) => item.status === "completed-valid").length, preInferenceSchemaRejections: results.filter((item) => item.preInferenceSchemaRejected).length, totalAttempts: results.reduce((sum, item) => sum + item.attemptCount, 0), totalRetries: results.reduce((sum, item) => sum + item.retryCount, 0), sameRequestStreamRecoveries: results.reduce((sum, item) => sum + item.sameRequestStreamRecoveries, 0), invalidItemCount: results.reduce((sum, item) => sum + item.invalidItemCount, 0), scoringFieldCount: results.reduce((sum, item) => sum + item.scoringFieldCount, 0), meteredApiCostUsd: 0, transcriptionCostUsd: 0, results };
}

async function freezePhaseLock(file, stage, contexts, extraPaths = []) {
  const paths = [...new Set(contexts.flatMap((item) => [item.packet, item.schema, item.output].filter(Boolean)).concat(extraPaths))];
  const hashes = {};
  for (const item of paths) hashes[item] = sha256(await read(item));
  const artifact = { schemaVersion: `3.8-${stage}-phase-lock`, stage, frozenAt: new Date().toISOString(), frozenBeforeStageModelExecution: true, contextCount: contexts.length, hashes };
  await writeFile(path.resolve(root, file), `${JSON.stringify(artifact, null, 2)}\n`);
  return artifact;
}

const proposalContexts = V38_DEBATE_NUMBERS.map((debateNumber) => ({ ...manifest.proposalContexts[debateNumber], stage: "proposal", itemCount: 8 }));
const proposalStartedAt = new Date().toISOString();
const proposalResults = await pool(proposalContexts.map((context) => () => modelTask("proposal", context)));
const proposalExecution = executionRecord("3.8-source-proposal-model-execution", "proposal", proposalStartedAt, proposalContexts, proposalResults);
await writeFile(path.resolve(root, manifest.artifacts.proposalExecution), `${JSON.stringify(proposalExecution, null, 2)}\n`);
assert(proposalExecution.validOutputContexts === proposalContexts.length, "not all proposal contexts produced valid outputs; review execution blocked");

const reviewBuild = await run(process.execPath, ["scripts/build-v38-source-review-packets.mjs", "--write"], { cwd: root, env: process.env });
assert(reviewBuild.code === 0, `review packet build failed: ${reviewBuild.stderr}`);
const reviewContexts = V38_DEBATE_NUMBERS.map((debateNumber) => {
  const source = manifest.proposalContexts[debateNumber];
  return { stage: "review", debateNumber, packet: `${V38_ROOT}/source-preparation/review/packets/debate-${debateNumber}.json`, schema: `${V38_ROOT}/source-preparation/review/schemas/debate-${debateNumber}.schema.json`, output: `${V38_ROOT}/source-preparation/review/outputs/debate-${debateNumber}.json`, proposalPacket: source.packet, proposal: source.output, transcript: source.transcript, events: source.events, itemCount: 8 };
});
await freezePhaseLock(manifest.artifacts.reviewLock, "source-review", reviewContexts, proposalContexts.map((item) => item.output));
const reviewStartedAt = new Date().toISOString();
const reviewResults = await pool(reviewContexts.map((context) => () => modelTask("review", context)));
const reviewExecution = executionRecord("3.8-source-review-model-execution", "review", reviewStartedAt, reviewContexts, reviewResults);
await writeFile(path.resolve(root, manifest.artifacts.reviewExecution), `${JSON.stringify(reviewExecution, null, 2)}\n`);
assert(reviewExecution.validOutputContexts === reviewContexts.length, "not all review contexts produced valid outputs; adjudication blocked");

const extraction = await run(process.execPath, ["scripts/extract-v38-source-disagreements.mjs", "--write"], { cwd: root, env: process.env });
assert(extraction.code === 0, `source disagreement extraction failed: ${extraction.stderr}`);
const disagreement = await readJson(manifest.artifacts.initialDisagreements);
const adjudicationContexts = disagreement.adjudicationContexts.map((context) => {
  const source = manifest.proposalContexts[context.debateNumber];
  return { ...context, stage: "source-adjudication", transcript: source.transcript, events: source.events, itemCount: context.fieldCount };
});
await freezePhaseLock(manifest.artifacts.adjudicationLock, "source-adjudication", adjudicationContexts, [manifest.artifacts.initialDisagreements, manifest.artifacts.adjudicationOptionMap]);
const adjudicationStartedAt = new Date().toISOString();
const adjudicationResults = await pool(adjudicationContexts.map((context) => () => modelTask("source-adjudication", context)));
const adjudicationExecution = executionRecord("3.8-source-adjudication-model-execution", "source-adjudication", adjudicationStartedAt, adjudicationContexts, adjudicationResults);
await writeFile(path.resolve(root, manifest.artifacts.adjudicationExecution), `${JSON.stringify(adjudicationExecution, null, 2)}\n`);
assert(adjudicationExecution.validOutputContexts === adjudicationContexts.length, "not all source adjudication contexts produced valid outputs; analysis blocked");

const analysis = await run(process.execPath, ["scripts/analyze-v38-source-preparation.mjs", "--write"], { cwd: root, env: process.env });
assert(analysis.code === 0, `source preparation analysis failed: ${analysis.stderr}`);
const analysisArtifact = await readJson(manifest.artifacts.analysis);
console.log(JSON.stringify({ status: "source-preparation-execution-recorded", proposalValidContexts: proposalExecution.validOutputContexts, reviewValidContexts: reviewExecution.validOutputContexts, disputedFields: disagreement.counts.disagreements, adjudicationContexts: adjudicationContexts.length, adjudicationValidContexts: adjudicationExecution.validOutputContexts, sourcePreparationStatus: analysisArtifact.status, pendingAudioVerifications: analysisArtifact.totals.pendingAudioVerifications, selectedMoves: analysisArtifact.totals.selectedMoves, totalRetries: proposalExecution.totalRetries + reviewExecution.totalRetries + adjudicationExecution.totalRetries, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
