#!/usr/bin/env node
import { createHash } from "node:crypto"; import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os"; import path from "node:path";
import { POST_CANARY_BATCH_08_DEBATE_08_REPAIR_ROOT, validateDebate08RepairOutput } from
  "./lib/assessment-production-post-canary-batch-08-publication-resumption-repair.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
const ROOT = POST_CANARY_BATCH_08_DEBATE_08_REPAIR_ROOT;
const activation = JSON.parse(await readFile(path.resolve(`${ROOT}/execution-activation.json`), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(activation.status === "frozen-one-context-batch-08-debate-08-publication-repair-authorized" &&
  activation.contexts?.length === 1 && activation.authorization?.repairModelExecution === true &&
  activation.authorization?.retry === false && activation.authorization?.timeoutExtension === false &&
  activation.authorization?.recursiveCorrection === false && activation.model?.slug === "gpt-5.6-sol" &&
  activation.model?.reasoningEffort === "low" && activation.model?.authentication === "ChatGPT subscription" &&
  activation.executionPolicy?.attemptsPerContext === 1 && activation.executionPolicy?.retriesMaximum === 0 &&
  activation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
  canonicalJson(activation.executionPolicy?.schedulerRamp) === canonicalJson([1]),
"the Debate 08 repair execution is not authorized");
for (const [file, digest] of Object.entries(activation.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `repair source hash mismatch: ${file}`);
for (const future of activation.futureOutputPathsExcludedFromSourceHashes)
  assertV4(!(await exists(future)), `future repair output exists: ${future}`);
const codex = activation.executionEnvironment.codexPath; const authSource = path.join(os.homedir(), ".codex", "auth.json");
await access(codex); await access(authSource);
function invoke(args, options, timeoutMs) { return new Promise((resolve) => {
  const child = spawn(codex, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = ""; let stderr = ""; let timedOut = false; let forceTimer;
  child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
  const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM");
    forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
  child.on("error", (error) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer);
    resolve({ code: null, signal: null, stdout, stderr, timedOut, error }); });
  child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer);
    resolve({ code, signal, stdout, stderr, timedOut, error: null }); });
}); }
async function runContext(context) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `batch-08-debate-08-repair-${context.contextIndex}-`));
  const codexHome = await mkdtemp(path.join(os.tmpdir(), `batch-08-debate-08-repair-home-${context.contextIndex}-`));
  const startedAt = new Date().toISOString(); const started = Date.now(); let record;
  try { const copies = [[activation.modelInputs.productionWorkflow, "production-workflow.md"],
    [activation.modelInputs.readinessWorkflow, "readiness-workflow.md"],
    [activation.modelInputs.outputContract, "output-contract.md"], [activation.modelInputs.manual, "manual.md"],
    [context.packet, "packet.json"], [context.schema, "schema.json"]];
    for (const [source, target] of copies) await copyFile(path.resolve(source), path.join(temporary, target));
    await copyFile(authSource, path.join(codexHome, "auth.json")); const env = { ...process.env, CODEX_HOME: codexHome };
    for (const key of activation.executionPolicy.removedEnvironmentVariables) delete env[key];
    const prompt = ["Read production-workflow.md, readiness-workflow.md, output-contract.md, manual.md, packet.json, and schema.json completely and no other files.",
      `Act only as isolated Debate 08 bounded repair editor ${context.packetIndex}.`,
      "Rewrite exactly the correctedCritiques named by the packet and schema, preserving adjudicated substance and the locked score band.",
      "Write exactly four ordered labeled sentences per critique, target 112–118 words, remain within 105–130 words and at least 880 characters, and end every sentence with terminal punctuation. Count words before returning.",
      "Every other field is immutable and unavailable. Do not calculate, emit, or change a score. Return exactly one schema-conforming JSON object and nothing else."].join(" ");
    process.stdout.write(`[batch-08-debate-08-repair] starting index ${context.contextIndex} ${activation.model.label}/${activation.model.reasoningEffort}\n`);
    const invocation = await invoke(["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config",
      "--ignore-rules", "--model", activation.model.slug,
      "-c", `model_reasoning_effort=\"${activation.model.reasoningEffort}\"`,
      "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search",
      "--disable", "apps", "--disable", "memories", "--disable", "multi_agent",
      "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies",
      "--sandbox", "read-only", "--output-schema", "schema.json",
      "--output-last-message", "result.json", prompt], { cwd: temporary, env },
    activation.executionPolicy.timeoutMsPerContext);
    const resultPath = path.join(temporary, "result.json"); const resultExists = await exists(resultPath);
    const base = { contextIndex: context.contextIndex, packetIndex: context.packetIndex,
      debateNumber: "08", debateId: context.debateId, model: activation.model.label,
      reasoningEffort: activation.model.reasoningEffort, attemptCount: 1, retryCount: 0,
      timeoutExtensionCount: 0, recursiveCorrectionCount: 0, startedAt,
      completedAt: new Date().toISOString(), elapsedMs: Date.now() - started,
      timedOut: invocation.timedOut, commandExitCode: invocation.code,
      terminationSignal: invocation.signal, authentication: "ChatGPT subscription",
      apiKeysRemoved: true, isolatedTemporaryCodexHome: true,
      isolatedTemporaryWorkingDirectory: true, publicationWasScoreLocked: true,
      scoresImmutable: true, writableFields: context.writableFields,
      meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0,
      stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
    if (invocation.error || invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
      record = { ...base, status: invocation.timedOut ? "timed-out" :
        !resultExists ? "result-missing" : "transport-failed", gateAcceptancePassed: false,
        outputWritten: false, failureMessage: `${invocation.error?.stack ?? ""}\n${invocation.stdout}\n${invocation.stderr}`.trim().slice(-10000) };
    } else { const outputBytes = await readFile(resultPath); await mkdir(path.dirname(path.resolve(context.output)), { recursive: true });
      await writeFile(path.resolve(context.output), outputBytes); let validationSummary = null; let validationMessage = null;
      try { validationSummary = validateDebate08RepairOutput(JSON.parse(outputBytes),
        JSON.parse(await readFile(path.resolve(context.packet), "utf8"))); }
      catch (error) { validationMessage = (error.stack ?? error.message).slice(-10000); }
      const accepted = validationSummary?.status === "passed";
      const validation = { schemaVersion: "1.0-assessment-production-post-canary-batch-08-debate-08-repair-validation",
        protocolId: activation.protocolId, status: accepted ? "passed" : "failed",
        contextIndex: context.contextIndex, packetIndex: context.packetIndex,
        debateNumber: "08", outputSha256: sha256(outputBytes), validationSummary,
        validationMessage, modelAuthoredScores: 0 };
      const provenance = { schemaVersion: "1.0-assessment-production-post-canary-batch-08-debate-08-repair-provenance",
        protocolId: activation.protocolId, contextIndex: context.contextIndex,
        packetIndex: context.packetIndex, debateNumber: "08", model: activation.model,
        authentication: "ChatGPT subscription", attemptCount: 1, retryCount: 0,
        timeoutExtensionCount: 0, recursiveCorrectionCount: 0, apiKeysRemoved: true,
        isolatedTemporaryCodexHome: true, isolatedTemporaryWorkingDirectory: true,
        scoresImmutable: true, writableFields: context.writableFields,
        copiedInputs: Object.fromEntries(copies.map(([source, target]) => [target,
          { source, sha256: activation.sourceHashes[source] }])),
        outputSha256: sha256(outputBytes), modelAuthoredScores: 0,
        meteredApiCostUsd: 0, paidServiceCallsThisStage: 0 };
      const validationBytes = Buffer.from(`${JSON.stringify(validation, null, 2)}\n`);
      const provenanceBytes = Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`);
      await mkdir(path.dirname(path.resolve(context.validation)), { recursive: true });
      await mkdir(path.dirname(path.resolve(context.provenance)), { recursive: true });
      await writeFile(path.resolve(context.validation), validationBytes); await writeFile(path.resolve(context.provenance), provenanceBytes);
      record = { ...base, status: accepted ? "completed-valid" : "output-validation-failed",
        gateAcceptancePassed: accepted, outputWritten: true, outputSha256: sha256(outputBytes),
        validationSha256: sha256(validationBytes), provenanceSha256: sha256(provenanceBytes),
        validationSummary, validationMessage }; }
  } catch (error) { record = { contextIndex: context.contextIndex, packetIndex: context.packetIndex,
    debateNumber: "08", attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0,
    recursiveCorrectionCount: 0, startedAt, completedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started, authentication: "ChatGPT subscription",
    meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0,
    status: "runner-error", gateAcceptancePassed: false, outputWritten: await exists(context.output),
    failureMessage: (error.stack ?? String(error)).slice(-10000) }; }
  finally { await rm(temporary, { recursive: true, force: true }); await rm(codexHome, { recursive: true, force: true }); }
  process.stdout.write(`[batch-08-debate-08-repair] index ${context.contextIndex} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`); return record;
}
const gateStartedAt = new Date().toISOString(); const started = Date.now(); const results = []; const phases = [];
let proceed = true;
for (const phase of activation.executionPolicy.rampPhases) { if (!proceed) { phases.push({ ...phase,
  attemptedContextIndexes: [], validContextIndexes: [], passed: false, skippedBecausePriorRampFailed: true }); continue; }
  const phaseResults = await Promise.all(phase.contextIndexes.map((index) => runContext(activation.contexts[index])));
  results.push(...phaseResults);
  const passed = phaseResults.every((result) => result.gateAcceptancePassed);
  phases.push({ ...phase, attemptedContextIndexes: phaseResults.map((result) => result.contextIndex),
    validContextIndexes: phaseResults.filter((result) => result.gateAcceptancePassed).map((result) => result.contextIndex),
    passed, skippedBecausePriorRampFailed: false });
  if (!passed) proceed = false; }
const validContexts = results.filter((row) => row.gateAcceptancePassed).length;
const execution = { schemaVersion: "1.0-assessment-production-post-canary-batch-08-debate-08-repair-execution",
  protocolId: activation.protocolId, status: validContexts === 1
    ? "batch-08-debate-08-one-context-repair-gate-passed"
    : "batch-08-debate-08-repair-gate-complete-with-failure",
  gateStartedAt, gateCompletedAt: new Date().toISOString(), contextsPlanned: 1,
  contextsAttempted: results.length, contextsUnattempted: 1 - results.length,
  validContexts, invalidContexts: results.length - validContexts, attempts: results.length,
  retries: 0, timeoutExtensions: 0, recursiveCorrections: 0, schedulerRamp: [1],
  wallElapsedMs: Date.now() - started, rampPhases: phases, results,
  rejectedOutputPreserved: true, scoresImmutable: true, meteredApiCostUsd: 0,
  paidServiceCallsThisStage: 0, modelAuthoredScores: 0 };
await writeFile(path.resolve(activation.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: execution.status, contextsAttempted: execution.contextsAttempted,
  contextsUnattempted: execution.contextsUnattempted, validContexts,
  invalidContexts: execution.invalidContexts, elapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
  attempts: execution.attempts, retries: 0, timeoutExtensions: 0,
  meteredApiCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0 }, null, 2));
