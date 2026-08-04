#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { V381_DEBATE_NUMBERS, V381_EXECUTION_MANIFEST, V381_ROOT, assert, phaseLockPaths } from "./lib/v381-source-preparation.mjs";

const root = process.cwd();
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const manifest = await readJson(V381_EXECUTION_MANIFEST);
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const concurrency = Number(process.env.SLUGFESTER_MODEL_CONCURRENCY ?? 2);
assert(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 3, "SLUGFESTER_MODEL_CONCURRENCY must be 1-3");
assert(manifest.status === "frozen-correction-execution-authorized" && manifest.authorization.sourcePreparationModelExecution, "v3.8.1 execution is not authorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
await access(codex);
await access(authSource);

function run(command, args, options = {}, timeoutMs = null) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", timedOut = false, forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); });
    child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
    const timer = timeoutMs === null ? null : setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeoutMs);
    child.on("error", (error) => resolve({ code: null, signal: null, stdout, stderr, timedOut, spawnError: error.message }));
    child.on("close", (code, signal) => {
      if (timer) clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      resolve({ code, signal, stdout, stderr, timedOut, spawnError: null });
    });
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
  if (stage === "proposal") return "Read workflow.md, rubric.md, manual.md, packet.json, transcript.txt, and events.json completely and no other files. Act only as the source-proposal role. Return exactly one schema-conforming JSON object. Define both routes and all eight moves in array order, with four moves per side, 25-180 normalized words per span, at least three time quartiles, at least two null contacts, two supports, two attacks, and motion, central, and subsidiary contact. Do not emit candidate IDs. For every non-null contact copy one exact bridgeId from packet.json and emit only polarity plus bridgeId. Do not score or write assessment prose.";
  if (stage === "review") return "Read workflow.md, rubric.md, manual.md, packet.json, transcript.txt, and events.json completely and no other files. Act only as the isolated source-review role. Independently review every route, bridge, candidate, speaker attribution, and provisional contact in order. Proposal labels and rationales are unavailable. For every non-null contact copy one exact bridgeId from packet.json and emit only polarity plus bridgeId. Return exactly one schema-conforming JSON object and no scores or assessment prose.";
  return "Read workflow.md, rubric.md, manual.md, packet.json, transcript.txt, and events.json completely and no other files. Act only as the isolated source-adjudication role. Decide every disputed field in order and select exactly one anonymous option supplied for that field. Do not infer pass identity, add a third value, score participants, or write assessment prose. Return exactly one schema-conforming JSON object.";
}

async function modelTask(stage, context) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v381-${stage}-${context.debateNumber}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v381-home-${stage}-${context.debateNumber}-`));
  const startedAt = new Date().toISOString();
  const start = Date.now();
  try {
    const sources = [
      [manifest.modelInputs.workflow, "workflow.md"], [manifest.modelInputs.rubric, "rubric.md"], [manifest.modelInputs.manual, "manual.md"],
      [context.packet, "packet.json"], [context.schema, "schema.json"], [context.transcript, "transcript.txt"], [context.events, "events.json"]
    ];
    for (const [source, target] of sources) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
    delete environment.OPENAI_API_KEY;
    delete environment.OPENAI_ORG_ID;
    delete environment.CODEX_API_KEY;
    process.stdout.write(`\n[v3.8.1-source] starting ${manifest.model.label} Debate ${context.debateNumber} ${stage}\n`);
    const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", stagePrompt(stage)], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
    const log = `${invocation.stdout}\n${invocation.stderr}`;
    const recoveries = [...log.matchAll(streamPattern)].length;
    const base = { stage, debateNumber: context.debateNumber, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, itemCount: context.itemCount, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - start, timeoutMs: manifest.executionPolicy.perInvocationTimeoutMs, timedOut: invocation.timedOut, terminationSignal: invocation.signal, subscriptionAuthenticated: true, apiKeysRemoved: true, meteredApiCostUsd: 0, commandExitCode: invocation.code, preInferenceSchemaRejected: invocation.code !== 0 && schemaPattern.test(log), sameRequestStreamRecoveries: recoveries, streamRecoveryLimit: manifest.executionPolicy.sameRequestStreamRecoveriesMaximumPerContext, spawnError: invocation.spawnError };
    if (invocation.timedOut || invocation.code !== 0) return { ...base, status: invocation.timedOut ? "timed-out" : base.preInferenceSchemaRejected ? "pre-inference-schema-rejected" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, invalidItemCount: context.itemCount, scoringFieldCount: 0 };
    const target = stage === "proposal" ? context.rawOutput : context.output;
    const outputPath = path.resolve(root, target);
    await mkdir(path.dirname(outputPath), { recursive: true });
    try {
      await copyFile(path.join(temporary, "result.json"), outputPath);
      const outputText = await readFile(outputPath, "utf8"), parsed = JSON.parse(outputText);
      let args;
      if (stage === "proposal") args = ["scripts/validate-v381-source-proposal.mjs", context.rawOutput, context.packet, context.schema, context.events, context.enrichedOutput];
      else if (stage === "review") args = ["scripts/validate-v381-source-review.mjs", context.output, context.proposalPacket, context.proposal, context.packet, context.schema];
      else args = ["scripts/validate-v381-source-adjudication.mjs", context.output, context.packet, context.schema];
      const validation = await run(process.execPath, args, { cwd: root, env: process.env });
      const schemaValid = validation.code === 0;
      const streamValid = recoveries <= manifest.executionPolicy.sameRequestStreamRecoveriesMaximumPerContext;
      const valid = schemaValid && streamValid;
      const enrichedText = stage === "proposal" && schemaValid ? await read(context.enrichedOutput) : null;
      process.stdout.write(`[v3.8.1-source] Debate ${context.debateNumber} ${stage} ${valid ? "completed-valid" : streamValid ? "output-validation-failed" : "stream-recovery-limit-exceeded"}\n`);
      return { ...base, status: valid ? "completed-valid" : !streamValid ? "stream-recovery-limit-exceeded" : "output-validation-failed", outputWritten: true, outputSha256: sha256(outputText), enrichedOutputWritten: stage === "proposal" ? schemaValid : undefined, enrichedOutputSha256: enrichedText === null ? undefined : sha256(enrichedText), deterministicValidationPassed: valid, invalidItemCount: valid ? 0 : context.itemCount, scoringFieldCount: containsScoreField(parsed) ? 1 : 0, validationExitCode: validation.code, validationMessage: valid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-2000) };
    } catch (error) {
      return { ...base, status: "output-validation-failed", outputWritten: false, deterministicValidationPassed: false, invalidItemCount: context.itemCount, scoringFieldCount: 0, outputError: error.message };
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
}

function executionRecord(schemaVersion, stage, startedAt, contexts, results) {
  return { schemaVersion, protocolId: manifest.protocolId, stage, startedAt, completedAt: new Date().toISOString(), authentication: "ChatGPT subscription auth copied into isolated temporary CODEX_HOME; API keys removed", contextsPlanned: contexts.length, contextsCompleted: results.filter((item) => item.commandExitCode === 0).length, validOutputContexts: results.filter((item) => item.status === "completed-valid").length, timedOutContexts: results.filter((item) => item.timedOut).length, preInferenceSchemaRejections: results.filter((item) => item.preInferenceSchemaRejected).length, totalAttempts: results.reduce((sum, item) => sum + item.attemptCount, 0), totalRetries: results.reduce((sum, item) => sum + item.retryCount, 0), sameRequestStreamRecoveries: results.reduce((sum, item) => sum + item.sameRequestStreamRecoveries, 0), invalidItemCount: results.reduce((sum, item) => sum + item.invalidItemCount, 0), scoringFieldCount: results.reduce((sum, item) => sum + item.scoringFieldCount, 0), elapsedMs: results.reduce((sum, item) => sum + item.elapsedMs, 0), meteredApiCostUsd: 0, transcriptionCostUsd: 0, results };
}

async function freezePhaseLock(file, stage, contexts, completedUpstream = []) {
  const paths = phaseLockPaths(contexts, completedUpstream);
  const hashes = {};
  for (const item of paths) hashes[item] = sha256(await read(item));
  const futureOutputs = contexts.flatMap((item) => [item.rawOutput, item.enrichedOutput, item.output]).filter(Boolean);
  assert(futureOutputs.every((item) => !paths.includes(item)), `${stage}: future output leaked into phase lock`);
  const artifact = { schemaVersion: `3.8.1-${stage}-phase-lock`, stage, frozenAt: new Date().toISOString(), frozenBeforeStageModelExecution: true, contextCount: contexts.length, futureOutputPathsExcluded: true, hashes };
  await mkdir(path.dirname(path.resolve(root, file)), { recursive: true });
  await writeFile(path.resolve(root, file), `${JSON.stringify(artifact, null, 2)}\n`);
}

const proposalContexts = V381_DEBATE_NUMBERS.map((number) => ({ ...manifest.proposalContexts[number], stage: "proposal", itemCount: 8 }));
const proposalStartedAt = new Date().toISOString();
const proposalResults = await pool(proposalContexts.map((context) => () => modelTask("proposal", context)));
const proposalExecution = executionRecord("3.8.1-source-proposal-model-execution", "proposal", proposalStartedAt, proposalContexts, proposalResults);
await writeFile(path.resolve(root, manifest.artifacts.proposalExecution), `${JSON.stringify(proposalExecution, null, 2)}\n`);
assert(proposalExecution.validOutputContexts === proposalContexts.length, "not all corrected proposal contexts produced valid outputs; review execution blocked");

const reviewBuild = await run(process.execPath, ["scripts/build-v381-source-review-packets.mjs", "--write"], { cwd: root, env: process.env });
assert(reviewBuild.code === 0, `review packet build failed: ${reviewBuild.stderr}`);
const reviewContexts = V381_DEBATE_NUMBERS.map((number) => {
  const source = manifest.proposalContexts[number];
  return { stage: "review", debateNumber: number, packet: `${V381_ROOT}/review/packets/debate-${number}.json`, schema: `${V381_ROOT}/review/schemas/debate-${number}.schema.json`, output: `${V381_ROOT}/review/outputs/debate-${number}.json`, proposalPacket: source.packet, proposal: source.enrichedOutput, transcript: source.transcript, events: source.events, itemCount: 8 };
});
await freezePhaseLock(manifest.artifacts.reviewLock, "source-review", reviewContexts, proposalContexts.flatMap((item) => [item.rawOutput, item.enrichedOutput]));
const reviewStartedAt = new Date().toISOString();
const reviewResults = await pool(reviewContexts.map((context) => () => modelTask("review", context)));
const reviewExecution = executionRecord("3.8.1-source-review-model-execution", "review", reviewStartedAt, reviewContexts, reviewResults);
await writeFile(path.resolve(root, manifest.artifacts.reviewExecution), `${JSON.stringify(reviewExecution, null, 2)}\n`);
assert(reviewExecution.validOutputContexts === reviewContexts.length, "not all corrected review contexts produced valid outputs; adjudication blocked");

const extraction = await run(process.execPath, ["scripts/extract-v381-source-disagreements.mjs", "--write"], { cwd: root, env: process.env });
assert(extraction.code === 0, `source disagreement extraction failed: ${extraction.stderr}`);
const disagreements = await readJson(manifest.artifacts.initialDisagreements);
const adjudicationContexts = disagreements.adjudicationContexts.map((context) => {
  const source = manifest.proposalContexts[context.debateNumber];
  return { ...context, stage: "source-adjudication", transcript: source.transcript, events: source.events, itemCount: context.fieldCount };
});
await freezePhaseLock(manifest.artifacts.adjudicationLock, "source-adjudication", adjudicationContexts, [manifest.artifacts.initialDisagreements, manifest.artifacts.adjudicationOptionMap, ...proposalContexts.flatMap((item) => [item.rawOutput, item.enrichedOutput]), ...reviewContexts.map((item) => item.output)]);
const adjudicationStartedAt = new Date().toISOString();
const adjudicationResults = await pool(adjudicationContexts.map((context) => () => modelTask("source-adjudication", context)));
const adjudicationExecution = executionRecord("3.8.1-source-adjudication-model-execution", "source-adjudication", adjudicationStartedAt, adjudicationContexts, adjudicationResults);
await writeFile(path.resolve(root, manifest.artifacts.adjudicationExecution), `${JSON.stringify(adjudicationExecution, null, 2)}\n`);
assert(adjudicationExecution.validOutputContexts === adjudicationContexts.length, "not all corrected adjudication contexts produced valid outputs; analysis blocked");

const analysisRun = await run(process.execPath, ["scripts/analyze-v381-source-preparation.mjs", "--write"], { cwd: root, env: process.env });
assert(analysisRun.code === 0, `source preparation analysis failed: ${analysisRun.stderr}`);
const analysis = await readJson(manifest.artifacts.analysis);
console.log(JSON.stringify({ status: "v3.8.1-source-preparation-execution-recorded", proposalValidContexts: proposalExecution.validOutputContexts, reviewValidContexts: reviewExecution.validOutputContexts, disputedFields: disagreements.counts.disagreements, adjudicationContexts: adjudicationContexts.length, adjudicationValidContexts: adjudicationExecution.validOutputContexts, sourcePreparationStatus: analysis.status, pendingAudioVerifications: analysis.totals.pendingAudioVerifications, selectedMoves: analysis.totals.selectedMoves, totalRetries: 0, sameRequestStreamRecoveries: proposalExecution.sameRequestStreamRecoveries + reviewExecution.sameRequestStreamRecoveries + adjudicationExecution.sameRequestStreamRecoveries, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
