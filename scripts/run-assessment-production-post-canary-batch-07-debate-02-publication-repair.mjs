#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_ROOT,
  validateDebate02PublicationRepairOutput } from
  "./lib/assessment-production-post-canary-batch-07-debate-02-publication-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";
const ROOT = POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_ROOT;
const activation = JSON.parse(await readFile(path.resolve(`${ROOT}/execution-activation.json`), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(activation.status === "frozen-one-context-batch-07-debate-02-publication-repair-authorized" &&
  activation.context?.debateNumber === "02" &&
  activation.authorization?.repairModelExecution === true &&
  activation.authorization?.retry === false && activation.authorization?.timeoutExtension === false &&
  activation.authorization?.recursiveCorrection === false &&
  activation.model?.slug === "gpt-5.6-sol" && activation.model?.reasoningEffort === "low" &&
  activation.model?.authentication === "ChatGPT subscription" &&
  activation.executionPolicy?.attemptsPerContext === 1 &&
  activation.executionPolicy?.retriesMaximum === 0 &&
  activation.executionPolicy?.timeoutExtensionsMaximum === 0,
"the Debate 02 publication repair execution is not authorized");
for (const [file, digest] of Object.entries(activation.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `repair source mismatch: ${file}`);
for (const future of activation.futureOutputPathsExcludedFromSourceHashes)
  assertV4(!(await exists(future)), `future repair output exists: ${future}`);
const codex = activation.executionEnvironment.codexPath;
const authSource = path.join(os.homedir(), ".codex", "auth.json");
await access(codex); await access(authSource);
function invoke(args, options, timeoutMs) { return new Promise((resolve) => {
  const child = spawn(codex, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = ""; let stderr = ""; let timedOut = false; let forceTimer;
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM");
    forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
  child.on("error", (error) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer);
    resolve({ code: null, signal: null, stdout, stderr, timedOut, error }); });
  child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer);
    resolve({ code, signal, stdout, stderr, timedOut, error: null }); });
}); }
const context = activation.context;
const temporary = await mkdtemp(path.join(os.tmpdir(), "batch-07-debate-02-publication-repair-"));
const codexHome = await mkdtemp(path.join(os.tmpdir(), "batch-07-debate-02-publication-repair-home-"));
const startedAt = new Date().toISOString(); const started = Date.now(); let record;
try {
  const copies = [[activation.modelInputs.productionWorkflow, "production-workflow.md"],
    [activation.modelInputs.readinessWorkflow, "readiness-workflow.md"],
    [activation.modelInputs.outputContract, "output-contract.md"],
    [context.packet, "packet.json"], [context.schema, "schema.json"]];
  for (const [source, target] of copies) await copyFile(path.resolve(source), path.join(temporary, target));
  await copyFile(authSource, path.join(codexHome, "auth.json"));
  const env = { ...process.env, CODEX_HOME: codexHome };
  for (const key of activation.executionPolicy.removedEnvironmentVariables) delete env[key];
  const prompt = [
    "Read production-workflow.md, readiness-workflow.md, output-contract.md, packet.json, and schema.json completely and no other files.",
    "Act only as the isolated score-locked single-field publication repair editor for Debate 02.",
    "Rewrite only correctedNoveltyExplanation for the locked AI Extension item in packet.json.",
    "Preserve its substantive claim, classification, source-move mapping, and relationship to the locked item text.",
    "Use 12–20 words, remain within 8–35 words and at least 55 characters, and end with terminal punctuation.",
    "Every other field is immutable and unavailable. Do not calculate, emit, or change any score.",
    "Return exactly one schema-conforming JSON object and nothing else."
  ].join(" ");
  process.stdout.write(`[batch-07-debate-02-publication-repair] starting ${activation.model.label}/${activation.model.reasoningEffort}\n`);
  const invocation = await invoke(["exec", "--ephemeral", "--skip-git-repo-check",
    "--ignore-user-config", "--ignore-rules", "--model", activation.model.slug,
    "-c", `model_reasoning_effort=\"${activation.model.reasoningEffort}\"`,
    "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search",
    "--disable", "apps", "--disable", "memories", "--disable", "multi_agent",
    "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies",
    "--sandbox", "read-only", "--output-schema", "schema.json",
    "--output-last-message", "result.json", prompt], { cwd: temporary, env },
  activation.executionPolicy.timeoutMsPerContext);
  const resultPath = path.join(temporary, "result.json");
  const resultExists = await exists(resultPath);
  const base = { contextIndex: 0, packetIndex: 0, debateNumber: "02",
    debateId: context.debateId, model: activation.model.label,
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
  if (invocation.error || invocation.timedOut || invocation.code !== 0 ||
      invocation.signal !== null || !resultExists) {
    record = { ...base, status: invocation.timedOut ? "timed-out" :
      !resultExists ? "result-missing" : "transport-failed", gateAcceptancePassed: false,
      outputWritten: false,
      failureMessage: `${invocation.error?.stack ?? ""}\n${invocation.stdout}\n${invocation.stderr}`.trim().slice(-10000) };
  } else {
    const outputBytes = await readFile(resultPath);
    await mkdir(path.dirname(path.resolve(context.output)), { recursive: true });
    await writeFile(path.resolve(context.output), outputBytes);
    let validationSummary = null; let validationMessage = null;
    try { validationSummary = validateDebate02PublicationRepairOutput(JSON.parse(outputBytes),
      JSON.parse(await readFile(path.resolve(context.packet), "utf8"))); }
    catch (error) { validationMessage = (error.stack ?? error.message).slice(-10000); }
    const accepted = validationSummary?.status === "passed";
    const validation = { schemaVersion:
        "1.0-assessment-production-post-canary-batch-07-debate-02-publication-repair-validation",
      protocolId: activation.protocolId, status: accepted ? "passed" : "failed",
      contextIndex: 0, packetIndex: 0, debateNumber: "02",
      outputSha256: sha256(outputBytes), validationSummary, validationMessage,
      modelAuthoredScores: 0 };
    const provenance = { schemaVersion:
        "1.0-assessment-production-post-canary-batch-07-debate-02-publication-repair-provenance",
      protocolId: activation.protocolId, contextIndex: 0, packetIndex: 0,
      debateNumber: "02", model: activation.model,
      authentication: "ChatGPT subscription", attemptCount: 1, retryCount: 0,
      timeoutExtensionCount: 0, recursiveCorrectionCount: 0,
      apiKeysRemoved: true, isolatedTemporaryCodexHome: true,
      isolatedTemporaryWorkingDirectory: true, scoresImmutable: true,
      writableFields: context.writableFields,
      copiedInputs: Object.fromEntries(copies.map(([source, target]) =>
        [target, { source, sha256: activation.sourceHashes[source] }])),
      outputSha256: sha256(outputBytes), modelAuthoredScores: 0,
      meteredApiCostUsd: 0, paidServiceCallsThisStage: 0 };
    const validationBytes = Buffer.from(`${JSON.stringify(validation, null, 2)}\n`);
    const provenanceBytes = Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`);
    await mkdir(path.dirname(path.resolve(context.validation)), { recursive: true });
    await mkdir(path.dirname(path.resolve(context.provenance)), { recursive: true });
    await writeFile(path.resolve(context.validation), validationBytes);
    await writeFile(path.resolve(context.provenance), provenanceBytes);
    record = { ...base, status: accepted ? "completed-valid" : "output-validation-failed",
      gateAcceptancePassed: accepted, outputWritten: true, outputSha256: sha256(outputBytes),
      validationSha256: sha256(validationBytes), provenanceSha256: sha256(provenanceBytes),
      validationSummary, validationMessage };
  }
} catch (error) {
  record = { contextIndex: 0, packetIndex: 0, debateNumber: "02",
    attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, recursiveCorrectionCount: 0,
    startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started,
    authentication: "ChatGPT subscription", meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0, modelAuthoredScores: 0, status: "runner-error",
    gateAcceptancePassed: false, outputWritten: await exists(context.output),
    failureMessage: (error.stack ?? String(error)).slice(-10000) };
} finally {
  await rm(temporary, { recursive: true, force: true });
  await rm(codexHome, { recursive: true, force: true });
}
const execution = { schemaVersion:
    "1.0-assessment-production-post-canary-batch-07-debate-02-publication-repair-execution",
  protocolId: activation.protocolId, status: record.gateAcceptancePassed
    ? "batch-07-debate-02-single-context-publication-repair-gate-passed"
    : "batch-07-debate-02-publication-repair-gate-failed",
  gateStartedAt: startedAt, gateCompletedAt: new Date().toISOString(),
  contextsPlanned: 1, contextsAttempted: 1, contextsUnattempted: 0,
  validContexts: record.gateAcceptancePassed ? 1 : 0,
  invalidContexts: record.gateAcceptancePassed ? 0 : 1,
  attempts: 1, retries: 0, timeoutExtensions: 0, recursiveCorrections: 0,
  schedulerRamp: [1], wallElapsedMs: Date.now() - started, result: record,
  rejectedOutputPreserved: true, scoresImmutable: true,
  meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0 };
await writeFile(path.resolve(activation.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
process.stdout.write(`[batch-07-debate-02-publication-repair] ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
console.log(JSON.stringify({ status: execution.status, contextsAttempted: 1,
  validContexts: execution.validContexts, invalidContexts: execution.invalidContexts,
  elapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)), attempts: 1,
  retries: 0, timeoutExtensions: 0, meteredApiCostUsd: 0,
  paidServiceCalls: 0, modelAuthoredScores: 0 }, null, 2));
