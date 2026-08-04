#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { canonicalJson, validateClosedSchema, validateSchemaValue } from "./lib/v36-decision-cards.mjs";
import { eventExcerpt, normalizeWords } from "./lib/v381-source-preparation.mjs";
import { assert } from "./lib/v384-coverage-preparation.mjs";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";

const root = process.cwd();
const manifestPath = "docs/calibration/v3.8.6/coverage-span-correction/execution-manifest.json";
const dryRun = process.argv.includes("--dry-run");
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifest = await readJson(manifestPath);
assert(manifest.status === "frozen-single-context-coordinate-correction-authorized" && manifest.authorization.coordinateCorrectionModelExecution && manifest.authorization.freshCoordinateCorrectionContexts === 1, "correction is not authorized");
assert(!manifest.authorization.coverageReviewModelExecution && !manifest.authorization.scoringModelExecution && !manifest.authorization.assessmentProse && !manifest.stopRules.furtherAutomaticRetryAuthorized, "downstream or retry boundary invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
for (const output of manifest.futureOutputPathsExcludedFromSourceHashes) {
  try { await access(path.resolve(root, output)); throw new Error(`future output already exists: ${output}`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
await access(codex); await access(authSource);
if (dryRun) {
  console.log(JSON.stringify({ status: "passed-dry-run", modelContextsExecuted: 0, targetLocalRef: "addition-01", priorFullProposalFilesInModelContext: 0, localTimestampedWindowOnly: true, semanticFieldsMutable: 0, coordinateFieldsMutable: 2, sourceHashesValidated: Object.keys(manifest.sourceHashes).length, subscriptionAuthenticationAvailable: true, APIKeysWillBeRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
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
const packet = await readJson(manifest.modelContext.packet);
const schema = await readJson(manifest.modelContext.schema);
const events = await readJson(manifest.mergeContext.sourceEvents);
const sourceRaw = await readJson(manifest.mergeContext.sourceRawOutput);
const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-v386-span-161-"));
const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), "slugfester-v386-home-span-161-"));
const startedAt = new Date().toISOString();
const start = Date.now();
let result;
try {
  await copyFile(path.resolve(root, manifest.modelContext.packet), path.join(temporary, "packet.json"));
  await copyFile(path.resolve(root, manifest.modelContext.schema), path.join(temporary, "schema.json"));
  await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
  const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
  delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
  const prompt = "Read packet.json completely and no other source file. Act only as a fresh coordinate corrector. The proposition and every semantic field are immutable. Choose startEvent and endEvent within the original span so the smallest coherent continuous excerpt still supports the proposition, contains 20-220 normalized words, and lasts no more than 150 seconds. Return exactly one schema-conforming JSON object. Do not score, assess, rewrite, add arguments, or emit prose outside the rationale field.";
  process.stdout.write(`\n[v3.8.6-span-correction] starting ${manifest.model.label} addition-01\n`);
  const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
  const transportEventLines = extractTransportEvents(invocation.stderr);
  const transportClassification = classifyTransportEventCount(transportEventLines.length, manifest.executionPolicy.recoverableStreamEventsNormalMaximum, manifest.executionPolicy.recoverableStreamEventsHardMaximum);
  const base = { debateNumber: "161", targetLocalRef: "addition-01", model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - start, timeoutMs: manifest.executionPolicy.perInvocationTimeoutMs, timedOut: invocation.timedOut, terminationSignal: invocation.signal, commandExitCode: invocation.code, subscriptionAuthenticated: true, apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, recoverableStreamEvents: transportEventLines.length, transportClassification, transportEventLines, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr), spawnError: invocation.spawnError };
  if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) result = { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", gateAcceptancePassed: false, correctionOutputWritten: false };
  else {
    await mkdir(path.dirname(path.resolve(root, manifest.outputs.correctionOutput)), { recursive: true });
    await copyFile(path.join(temporary, "result.json"), path.resolve(root, manifest.outputs.correctionOutput));
    const correction = await readJson(manifest.outputs.correctionOutput);
    validateSchemaValue(validateClosedSchema(schema), correction, "v386.spanCorrection");
    assert(correction.schemaVersion === "3.8.6-coverage-span-correction-output" && correction.debateNumber === "161" && correction.targetLocalRef === "addition-01", "correction identity invalid");
    assert(correction.startEvent >= packet.target.originalStartEvent && correction.endEvent <= packet.target.originalEndEvent && correction.startEvent <= correction.endEvent, "corrected span is outside original span");
    const correctedWords = normalizeWords(eventExcerpt(events, correction.startEvent, correction.endEvent)).length;
    const startMs = events[correction.startEvent].startMs;
    const endMs = events[correction.endEvent].startMs + events[correction.endEvent].durationMs;
    assert(correctedWords >= 20 && correctedWords <= 220, `corrected span word count invalid: ${correctedWords}`);
    assert(endMs > startMs && endMs - startMs <= 150000, `corrected span duration invalid: ${endMs - startMs}`);
    const correctedRaw = structuredClone(sourceRaw);
    const target = correctedRaw.additions.find((item) => item.localRef === "addition-01");
    target.startEvent = correction.startEvent; target.endEvent = correction.endEvent;
    const sourceIdentity = structuredClone(sourceRaw); const correctedIdentity = structuredClone(correctedRaw);
    for (const item of [sourceIdentity, correctedIdentity]) { const move = item.additions.find((entry) => entry.localRef === "addition-01"); move.startEvent = null; move.endEvent = null; }
    assert(canonicalJson(sourceIdentity) === canonicalJson(correctedIdentity), "noncoordinate mutation detected");
    await writeFile(path.resolve(root, manifest.outputs.correctedRawOutput), `${JSON.stringify(correctedRaw, null, 2)}\n`);
    const validation = await run(process.execPath, ["scripts/validate-v384-coverage-proposal.mjs", manifest.outputs.correctedRawOutput, manifest.mergeContext.sourcePacket, manifest.mergeContext.sourceSchema, manifest.mergeContext.sourceEvents, manifest.outputs.enrichedOutput], { cwd: root, env: process.env });
    const valid = validation.code === 0 && transportClassification !== "invalid";
    result = { ...base, status: valid ? `completed-valid-${transportClassification}` : transportClassification === "invalid" ? "recoverable-stream-event-limit-exceeded" : "complete-coverage-validation-failed", gateAcceptancePassed: valid, correctionOutputWritten: true, correctionOutputSha256: sha256(await read(manifest.outputs.correctionOutput)), correctedStartEvent: correction.startEvent, correctedEndEvent: correction.endEvent, correctedWordCount: correctedWords, correctedDurationMs: endMs - startMs, noncoordinateMutationCount: 0, correctedRawOutputWritten: true, correctedRawOutputSha256: sha256(await read(manifest.outputs.correctedRawOutput)), enrichedOutputWritten: validation.code === 0, enrichedOutputSha256: validation.code === 0 ? sha256(await read(manifest.outputs.enrichedOutput)) : null, completeCoverageValidationPassed: validation.code === 0, validationExitCode: validation.code, validationMessage: valid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-3000) };
  }
} catch (error) {
  result = { debateNumber: "161", targetLocalRef: "addition-01", model: manifest.model.label, status: "execution-error", attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - start, timedOut: false, subscriptionAuthenticated: true, apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, correctionOutputWritten: false, gateAcceptancePassed: false, error: error.message };
} finally {
  await rm(temporary, { recursive: true, force: true }); await rm(temporaryCodexHome, { recursive: true, force: true });
}
const execution = { schemaVersion: "3.8.6-coverage-span-correction-model-execution", protocolId: manifest.protocolId, stage: manifest.stage, startedAt, completedAt: new Date().toISOString(), contextsPlanned: 1, validOutputContexts: result.gateAcceptancePassed ? 1 : 0, totalAttempts: 1, totalRetries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, result };
await writeFile(path.resolve(root, manifest.outputs.modelExecution), `${JSON.stringify(execution, null, 2)}\n`);
assert(execution.validOutputContexts === 1, "v3.8.6 coordinate correction failed; coverage review remains blocked");
console.log(JSON.stringify({ status: "v3.8.6-coverage-span-correction-passed", targetLocalRef: "addition-01", correctedStartEvent: result.correctedStartEvent, correctedEndEvent: result.correctedEndEvent, correctedWordCount: result.correctedWordCount, noncoordinateMutationCount: 0, completeCoverageValidationPassed: true, transportClassification: result.transportClassification, meteredApiCostUsd: 0, transcriptionCostUsd: 0, coverageReviewPacketConstructionAuthorized: true, coverageReviewModelExecutionAuthorized: false, scoringAuthorized: false, assessmentProseAuthorized: false }, null, 2));
