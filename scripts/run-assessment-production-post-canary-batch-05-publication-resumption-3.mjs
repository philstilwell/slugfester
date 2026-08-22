#!/usr/bin/env node
import { createHash } from "node:crypto"; import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os"; import path from "node:path";
import { POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_3_ROOT } from
  "./lib/assessment-production-post-canary-batch-05-publication-resumption-3.mjs";
import { validatePostCanaryBatch05PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-05-publication-validation.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";
const ROOT = POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_3_ROOT;
const a = JSON.parse(await readFile(path.resolve(`${ROOT}/execution-activation.json`), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(a.status === "frozen-one-unattempted-batch-05-debate-59-publication-context-authorized" &&
  a.contexts?.length === 1 && a.authorization?.publicationModelExecution === true &&
  a.authorization?.retry === false && a.model?.slug === "gpt-5.6-sol" &&
  a.model?.reasoningEffort === "low" && a.executionPolicy?.attemptsPerContext === 1 &&
  a.executionPolicy?.retriesMaximum === 0 && a.executionPolicy?.timeoutExtensionsMaximum === 0,
"Debate 59 execution is not authorized");
for (const [file, digest] of Object.entries(a.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `Debate 59 source mismatch: ${file}`);
for (const future of a.futureOutputPathsExcludedFromSourceHashes)
  assertV4(!(await exists(future)), `future Debate 59 output exists: ${future}`);
const context = a.contexts[0]; const codex = a.executionEnvironment.codexPath;
const authSource = path.join(os.homedir(), ".codex", "auth.json"); await access(codex); await access(authSource);
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
const temporary = await mkdtemp(path.join(os.tmpdir(), "batch-05-publication-resumption-3-59-"));
const codexHome = await mkdtemp(path.join(os.tmpdir(), "batch-05-publication-resumption-3-home-59-"));
const startedAt = new Date().toISOString(); const started = Date.now(); let record;
try { const copies = [[a.modelInputs.productionWorkflow, "production-workflow.md"],
  [a.modelInputs.readinessWorkflow, "readiness-workflow.md"], [a.modelInputs.outputContract, "output-contract.md"],
  [a.modelInputs.manual, "manual.md"], [a.modelInputs.referenceCatalog, "reference-catalog.json"],
  [context.packet, "packet.json"], [context.schema, "schema.json"]];
  for (const [source, target] of copies) await copyFile(path.resolve(source), path.join(temporary, target));
  await copyFile(authSource, path.join(codexHome, "auth.json")); const env = { ...process.env, CODEX_HOME: codexHome };
  for (const key of a.executionPolicy.removedEnvironmentVariables) delete env[key];
  const prompt = ["Read production-workflow.md, readiness-workflow.md, output-contract.md, manual.md, reference-catalog.json, packet.json, and schema.json completely and no other files.",
    "Act only as the isolated publication editor for Debate 59.",
    "Participant judgment, adjudication, move selection, and every score are closed and repository-owned; participant judgment was score-blind.",
    "Author exactly the schema fields: an 18–28 word summary; source-exact representative quotes targeting 6–14 words; prose for every locked move; Overall Commentary; optional material-only local reference tags; and a balanced, separately disclosed AI Extension with globally unique item IDs and complete novelty mappings.",
    "Before returning, count every critique and revise it until it is 112–118 words; do not aim at the 130-word ceiling. Each critique must remain within 105–130 words, contain at least 880 characters, use exactly four ordered labeled sentences, and end every sentence with terminal punctuation.",
    "Never infer, emit, recalculate, or suggest changing a score; never change identity, structure, move selection, or source evidence; never consult legacy assessment material or other debates.",
    "Return exactly one schema-conforming JSON object and nothing else."].join(" ");
  process.stdout.write(`[batch-05-publication-resumption-3] starting Debate 59 ${a.model.label}/${a.model.reasoningEffort}\n`);
  const invocation = await invoke(["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config",
    "--ignore-rules", "--model", a.model.slug, "-c", `model_reasoning_effort=\"${a.model.reasoningEffort}\"`,
    "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search",
    "--disable", "apps", "--disable", "memories", "--disable", "multi_agent",
    "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies",
    "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt],
  { cwd: temporary, env }, a.executionPolicy.timeoutMsPerContext);
  const resultPath = path.join(temporary, "result.json"); const resultExists = await exists(resultPath);
  const base = { contextIndex: 0, originalContextIndex: 9, debateNumber: "59",
    debateId: context.debateId, model: a.model.label, reasoningEffort: a.model.reasoningEffort,
    attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, correctionContextCount: 0,
    startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started,
    timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal,
    authentication: "ChatGPT subscription", apiKeysRemoved: true,
    isolatedTemporaryCodexHome: true, isolatedTemporaryWorkingDirectory: true,
    participantJudgmentWasScoreBlind: true, ownDebateScoresImmutable: true,
    meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0,
    stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
  if (invocation.error || invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
    record = { ...base, status: invocation.timedOut ? "timed-out" :
      !resultExists ? "result-missing" : "transport-failed", gateAcceptancePassed: false,
      outputWritten: false, failureMessage: `${invocation.error?.stack ?? ""}\n${invocation.stdout}\n${invocation.stderr}`.trim().slice(-10000) };
  } else { const outputBytes = await readFile(resultPath); await mkdir(path.dirname(path.resolve(context.output)), { recursive: true });
    await writeFile(path.resolve(context.output), outputBytes); let validationSummary = null; let validationMessage = null;
    try { validationSummary = validatePostCanaryBatch05PublicationOutput(JSON.parse(outputBytes),
      JSON.parse(await readFile(path.resolve(context.packet), "utf8"))); }
    catch (error) { validationMessage = (error.stack ?? error.message).slice(-10000); }
    const accepted = validationSummary?.status === "passed";
    const validation = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-59-publication-validation",
      protocolId: a.protocolId, status: accepted ? "passed" : "failed", debateNumber: "59",
      outputSha256: sha256(outputBytes), validationSummary, validationMessage,
      modelAuthoredScores: 0, lockedScoresUnchanged: accepted ? true : null };
    const provenance = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-59-publication-provenance",
      protocolId: a.protocolId, debateNumber: "59", model: a.model,
      authentication: "ChatGPT subscription", attemptCount: 1, retryCount: 0,
      timeoutExtensionCount: 0, correctionContextCount: 0, apiKeysRemoved: true,
      isolatedTemporaryCodexHome: true, isolatedTemporaryWorkingDirectory: true,
      participantJudgmentWasScoreBlind: true, ownDebateScoresImmutable: true,
      copiedInputs: Object.fromEntries(copies.map(([source, target]) => [target,
        { source, sha256: a.sourceHashes[source] }])), outputSha256: sha256(outputBytes),
      modelAuthoredScores: 0, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0 };
    const validationBytes = Buffer.from(`${JSON.stringify(validation, null, 2)}\n`);
    const provenanceBytes = Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`);
    await mkdir(path.dirname(path.resolve(context.validation)), { recursive: true });
    await mkdir(path.dirname(path.resolve(context.provenance)), { recursive: true });
    await writeFile(path.resolve(context.validation), validationBytes); await writeFile(path.resolve(context.provenance), provenanceBytes);
    record = { ...base, status: accepted ? "completed-valid" : "output-validation-failed",
      gateAcceptancePassed: accepted, outputWritten: true, outputSha256: sha256(outputBytes),
      validationSha256: sha256(validationBytes), provenanceSha256: sha256(provenanceBytes),
      validationSummary, validationMessage }; }
} catch (error) { record = { contextIndex: 0, originalContextIndex: 9, debateNumber: "59",
  attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, correctionContextCount: 0,
  startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started,
  authentication: "ChatGPT subscription", meteredApiCostUsd: 0,
  paidServiceCallsThisStage: 0, modelAuthoredScores: 0, status: "runner-error",
  gateAcceptancePassed: false, outputWritten: await exists(context.output),
  failureMessage: (error.stack ?? String(error)).slice(-10000) }; }
finally { await rm(temporary, { recursive: true, force: true }); await rm(codexHome, { recursive: true, force: true }); }
process.stdout.write(`[batch-05-publication-resumption-3] Debate 59 ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
const execution = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-resumption-3-execution",
  protocolId: a.protocolId, status: record.gateAcceptancePassed
    ? "batch-05-debate-59-publication-context-passed"
    : "batch-05-debate-59-publication-context-failed",
  gateStartedAt: startedAt, gateCompletedAt: new Date().toISOString(), contextsPlanned: 1,
  contextsAttempted: 1, contextsUnattempted: 0, validContexts: record.gateAcceptancePassed ? 1 : 0,
  invalidContexts: record.gateAcceptancePassed ? 0 : 1, attempts: 1, retries: 0,
  timeoutExtensions: 0, correctionContexts: 0, wallElapsedMs: Date.now() - started,
  results: [record], scoresImmutable: true, meteredApiCostUsd: 0,
  paidServiceCallsThisStage: 0, modelAuthoredScores: 0 };
await writeFile(path.resolve(a.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: execution.status, contextsAttempted: 1,
  validContexts: execution.validContexts, invalidContexts: execution.invalidContexts,
  elapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)), attempts: 1,
  retries: 0, timeoutExtensions: 0, meteredApiCostUsd: 0,
  paidServiceCalls: 0, modelAuthoredScores: 0 }, null, 2));
