#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { V384_COVERAGE_ROOT, assert } from "./lib/v384-coverage-preparation.mjs";

const root = process.cwd();
const manifestPath = `${V384_COVERAGE_ROOT}/proposal-correction-02/execution-manifest.json`;
const dryRun = process.argv.includes("--dry-run");
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifest = await readJson(manifestPath);
assert(manifest.status === "frozen-final-single-context-transport-correction-authorized" && manifest.authorization.coverageProposalCorrectionModelExecution && manifest.authorization.freshCoverageProposalContexts === 1, "coverage correction 02 is not authorized");
assert(!manifest.authorization.coverageReviewModelExecution && !manifest.authorization.numericalParticipantScoring && !manifest.authorization.assessmentProse && !manifest.stopRules.furtherAutomaticCorrectionAuthorized, "downstream or further correction boundary invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
for (const output of manifest.futureOutputPathsExcludedFromSourceHashes) {
  try { await access(path.resolve(root, output)); throw new Error(`correction 02 future output already exists: ${output}`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
await access(codex);
await access(authSource);
if (dryRun) {
  console.log(JSON.stringify({ status: "passed-dry-run", modelContextsExecuted: 0, debateNumber: "161", sourceHashesValidated: Object.keys(manifest.sourceHashes).length, semanticPacketChanged: false, priorProposalFilesInContext: 0, boundedReadLinesMaximum: 400, provisionalJsonMessagesMaximum: 0, subscriptionAuthenticationAvailable: true, APIKeysWillBeRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
  process.exit(0);
}

function run(command, args, options = {}, timeoutMs = null) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", timedOut = false, forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); });
    child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
    const timer = timeoutMs === null ? null : setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
    child.on("error", (error) => resolve({ code: null, signal: null, stdout, stderr, timedOut, spawnError: error.message }));
    child.on("close", (code, signal) => { if (timer) clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut, spawnError: null }); });
  });
}

const schemaPattern = /(invalid[^\n]{0,80}(json )?schema|response[_ -]?format[^\n]{0,80}(invalid|unsupported|reject)|json schema[^\n]{0,80}(invalid|unsupported|reject))/i;
const streamPattern = /(reconnect|resum(?:e|ing)|stream[^\n]{0,50}recover|retrying[^\n]{0,50}stream)/ig;
const prompt = "Read workflow.md, rubric.md, manual.md, packet.json, transcript.txt, and events.json completely and no other files. Act only as a fresh isolated coverage-proposer for Debate 161; no prior proposal output is available. Do not emit progress commentary, provisional JSON, or placeholder schema objects. Read source files sequentially in chunks no larger than 400 lines and keep every tool response bounded; use timestamped events in bounded coordinate queries. Treat the eight seed moves as incomplete source anchors, not a truth key. Decide every seed in order, add every missing assessment-relevant move in chronological order, account for all ten accepted bridges, and audit concessions for both sides. Return exactly one final schema-conforming JSON object. Do not classify burden contact, assign sections or weights or importance, score participants, infer a winner, reconstruct legacy prose, write Overall Commentary, or write an AI Extension.";
const context = manifest.proposalContext;
const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-v384-coverage-correction-02-161-"));
const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), "slugfester-v384-home-coverage-correction-02-161-"));
const startedAt = new Date().toISOString();
const start = Date.now();
let result;
try {
  const sources = [[manifest.modelInputs.workflow, "workflow.md"], [manifest.modelInputs.rubric, "rubric.md"], [manifest.modelInputs.manual, "manual.md"], [context.packet, "packet.json"], [context.schema, "schema.json"], [context.transcript, "transcript.txt"], [context.events, "events.json"]];
  for (const [source, target] of sources) await copyFile(path.resolve(root, source), path.join(temporary, target));
  await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
  const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
  delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
  process.stdout.write(`\n[v3.8.4-coverage-correction-02] starting ${manifest.model.label} Debate 161\n`);
  const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
  const log = `${invocation.stdout}\n${invocation.stderr}`;
  const recoveryMatches = [...log.matchAll(streamPattern)].map((match) => match[0].replace(/\s+/g, " ").trim());
  const base = { debateNumber: "161", stage: manifest.stage, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - start, timeoutMs: manifest.executionPolicy.perInvocationTimeoutMs, timedOut: invocation.timedOut, terminationSignal: invocation.signal, subscriptionAuthenticated: true, apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, commandExitCode: invocation.code, preInferenceSchemaRejected: invocation.code !== 0 && schemaPattern.test(log), sameRequestStreamRecoveries: recoveryMatches.length, streamRecoveryLimit: manifest.executionPolicy.sameRequestStreamRecoveriesMaximum, streamRecoveryMatches: recoveryMatches, spawnError: invocation.spawnError };
  if (invocation.timedOut || invocation.code !== 0) result = { ...base, status: invocation.timedOut ? "timed-out" : base.preInferenceSchemaRejected ? "pre-inference-schema-rejected" : "transport-failed", outputWritten: false, deterministicValidationPassed: false };
  else {
    await mkdir(path.dirname(path.resolve(root, context.rawOutput)), { recursive: true });
    await copyFile(path.join(temporary, "result.json"), path.resolve(root, context.rawOutput));
    const validation = await run(process.execPath, ["scripts/validate-v384-coverage-proposal.mjs", context.rawOutput, context.packet, context.schema, context.events, context.enrichedOutput], { cwd: root, env: process.env });
    const schemaValid = validation.code === 0;
    const streamValid = recoveryMatches.length <= manifest.executionPolicy.sameRequestStreamRecoveriesMaximum;
    const valid = schemaValid && streamValid;
    const rawText = await read(context.rawOutput), enrichedText = schemaValid ? await read(context.enrichedOutput) : null;
    result = { ...base, status: valid ? "completed-valid" : !streamValid ? "stream-recovery-limit-exceeded" : "output-validation-failed", outputWritten: true, outputSha256: sha256(rawText), enrichedOutputWritten: schemaValid, enrichedOutputSha256: enrichedText === null ? null : sha256(enrichedText), deterministicValidationPassed: valid, validationExitCode: validation.code, validationMessage: valid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-3000) };
  }
} catch (error) {
  result = { debateNumber: "161", stage: manifest.stage, model: manifest.model.label, status: "execution-error", attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - start, timedOut: false, subscriptionAuthenticated: true, apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, outputWritten: false, deterministicValidationPassed: false, error: error.message };
} finally {
  await rm(temporary, { recursive: true, force: true });
  await rm(temporaryCodexHome, { recursive: true, force: true });
}

const execution = { schemaVersion: "3.8.4-full-coverage-proposal-correction-02-model-execution", protocolId: manifest.protocolId, stage: manifest.stage, startedAt, completedAt: new Date().toISOString(), contextsPlanned: 1, validOutputContexts: result.status === "completed-valid" ? 1 : 0, totalAttempts: 1, totalRetries: 0, sameRequestStreamRecoveries: result.sameRequestStreamRecoveries ?? 0, streamRecoveryMatches: result.streamRecoveryMatches ?? [], meteredApiCostUsd: 0, transcriptionCostUsd: 0, result };
await mkdir(path.dirname(path.resolve(root, manifest.artifacts.correctionExecution)), { recursive: true });
await writeFile(path.resolve(root, manifest.artifacts.correctionExecution), `${JSON.stringify(execution, null, 2)}\n`);
assert(execution.validOutputContexts === 1, "coverage correction 02 failed; automatic correction is exhausted and review remains blocked");
console.log(JSON.stringify({ status: "v3.8.4-full-coverage-proposal-correction-02-recorded", debateNumber: "161", validOutputContexts: 1, totalAttempts: 1, totalRetries: 0, sameRequestStreamRecoveries: execution.sameRequestStreamRecoveries, meteredApiCostUsd: 0, transcriptionCostUsd: 0, coverageReviewAuthorized: false, scoringAuthorized: false, assessmentProseAuthorized: false }, null, 2));
