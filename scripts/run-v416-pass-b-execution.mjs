#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V416_PASS_B_ROOT } from "./lib/v416-triggered-consensus.mjs";

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.resolve(root, `${V416_PASS_B_ROOT}/execution-manifest.json`), "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(manifest.status === "frozen-three-v416-pass-b-contexts-authorized" && manifest.authorization.passBModelExecution && !manifest.authorization.disagreementExtraction && manifest.executionPolicy.failFastAfterFirstInvalidContext, "v4.1.6 Pass B execution unauthorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(path.resolve(root, file))) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
  try { await access(path.resolve(root, future)); throw new Error(`future output already exists: ${future}`); } catch (error) { if (error.code !== "ENOENT") throw error; }
}
await access(codex);
await access(authSource);

function run(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = ""; let timedOut = false; let forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); });
    child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
    child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut }); });
  });
}

const results = [];
for (const context of manifest.contexts) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v416-pass-b-${context.debateNumber}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v416-home-pass-b-${context.debateNumber}-`));
  const startedAt = new Date().toISOString(); const started = Date.now(); let record;
  try {
    const copies = [
      [manifest.modelInputs.workflowBase, "workflow-v40.md"], [manifest.modelInputs.workflowBounded, "workflow-v41.md"], [manifest.modelInputs.workflowConsistency, "workflow-v413.md"], [manifest.modelInputs.workflowBurdenTuple, "workflow-v414.md"], [manifest.modelInputs.workflowTiming, "workflow-v415.md"], [manifest.modelInputs.workflowSourceDelivery, "workflow-v416.md"],
      [manifest.modelInputs.rubricBase, "rubric-v40.md"], [manifest.modelInputs.rubricBounded, "rubric-v41.md"], [manifest.modelInputs.manual, "manual.md"], [manifest.modelInputs.schema, "schema.json"],
      [context.passBPacket, "packet.json"], [context.transcript, "transcript.txt"], [context.lockedEvents, "locked-events.json"]
    ];
    for (const [source, target] of copies) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
    delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
    const prompt = `Read workflow-v40.md, workflow-v41.md, workflow-v413.md, workflow-v414.md, workflow-v415.md, workflow-v416.md, rubric-v40.md, rubric-v41.md, manual.md, packet.json, schema.json, transcript.txt, and locked-events.json completely and no other files. Workflow v4.1.6 governs conflicts. Act only as the isolated high-effort triggered Pass B judge for Debate ${context.debateNumber}. The complete transcript is mandatory debate-wide source; locked-events.json is the repository-validated exact event subset for all locked spans plus context. Judge every locked move independently and exactly in lockedMoveOrder. Routes, sections, weights, inventory, speakers, propositions, source spans, and importance are locked. Primary judgments, ratings, totals, trigger reasons, control selection, comparator, legacy data, prior winners, other debates, and publication prose are unavailable. Run every response-tuple, burden-reference, rating-band, charity, and burden-adjustment duplicate-exclusion check before submission. Resolve each non-null bridgeId against locked routes, copy its exact tier, and keep relevance/burden inside that tier's band. Use medium or low attribution confidence whenever identity is not secure and do not claim audio verification. Emit no calculated move, section, overall, range, band, winner, or agreement totals. Return exactly one schema-conforming JSON object and no commentary.`;
    process.stdout.write(`\n[v4.1.6-pass-b] starting ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber}\n`);
    const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
    const transportEvents = extractTransportEvents(invocation.stderr);
    const transportClassification = classifyTransportEventCount(transportEvents.length, 2, 8);
    const base = { debateNumber: context.debateNumber, debateId: context.debateId, lockedMoves: context.lockedMoves, lockedSections: context.lockedSections, deliveredEventRows: context.deliveredEventRows, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, terminationSignal: invocation.signal, commandExitCode: invocation.code, subscriptionAuthenticated: true, apiKeysRemoved: true, completeTranscriptProvided: true, completeOriginalEventsHashValidated: true, lockedEventsProvided: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, recoverableStreamEvents: transportEvents.length, transportRecovered: transportEvents.length > 0, transportClassification, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) record = { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, gateAcceptancePassed: false };
    else {
      await mkdir(path.dirname(path.resolve(root, context.output)), { recursive: true });
      await copyFile(path.join(temporary, "result.json"), path.resolve(root, context.output));
      const validation = await run(process.execPath, ["scripts/validate-v416-pass-b-output.mjs", context.output, context.passBPacket, context.sourcePacket], { cwd: root, env: process.env }, 120000);
      const valid = validation.code === 0 && transportClassification !== "invalid";
      record = { ...base, status: valid ? transportEvents.length > 0 ? "completed-valid-recovered" : "completed-valid-transport-clean" : validation.code !== 0 ? "output-validation-failed" : "transport-event-limit-exceeded", outputWritten: true, outputSha256: sha256(await readFile(path.resolve(root, context.output))), deterministicValidationPassed: validation.code === 0, gateAcceptancePassed: valid, validationExitCode: validation.code, validationSummary: validation.code === 0 ? JSON.parse(validation.stdout) : null, validationMessage: validation.code === 0 ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-6000) };
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
  results.push(record);
  if (!record.gateAcceptancePassed) break;
}
const passed = results.length === manifest.contexts.length && results.every((item) => item.gateAcceptancePassed);
const pendingAudioMoves = results.flatMap((result) => (result.validationSummary?.mediumOrLowAttributionMoves ?? []).map((moveId) => ({ debateNumber: result.debateNumber, moveId })));
const execution = { schemaVersion: "4.1.6-triggered-pass-b-model-execution", protocolId: manifest.protocolId, status: passed ? pendingAudioMoves.length === 0 ? "pass-b-execution-passed-no-audio-pending" : "pass-b-execution-passed-audio-required" : "pass-b-execution-failed-fast", contextsPlanned: manifest.contexts.length, contextsAttempted: results.length, contextsSkipped: manifest.contexts.length - results.length, validContexts: results.filter((item) => item.gateAcceptancePassed).length, attempts: results.length, retries: 0, totalElapsedMs: results.reduce((sum, item) => sum + item.elapsedMs, 0), meanElapsedMs: results.length ? Math.round(results.reduce((sum, item) => sum + item.elapsedMs, 0) / results.length) : null, pendingAudioMoves, meteredApiCostUsd: 0, transcriptionCostUsd: 0, results, authorization: { passBAnalysis: passed, audioVerification: passed && pendingAudioMoves.length > 0, disagreementExtraction: false, adjudicationModelExecution: false, scoreDerivation: false, furtherAutomaticRetry: false, productionMutation: false } };
await writeFile(path.resolve(root, manifest.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
assertV4(passed, "one or more v4.1.6 Pass B contexts failed; runner stopped and downstream work is blocked");
console.log(JSON.stringify({ status: execution.status, validContexts: execution.validContexts, attempts: execution.attempts, retries: 0, totalElapsedMinutes: Number((execution.totalElapsedMs / 60000).toFixed(2)), meanElapsedMinutes: Number((execution.meanElapsedMs / 60000).toFixed(2)), pendingAudioMoves: pendingAudioMoves.length, passBAnalysisAuthorized: execution.authorization.passBAnalysis, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
