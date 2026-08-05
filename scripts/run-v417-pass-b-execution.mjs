#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V417_PASS_B_ROOT } from "./lib/v417-triggered-consensus.mjs";

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.resolve(root, `${V417_PASS_B_ROOT}/execution-manifest.json`), "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(manifest.status === "frozen-five-context-pass-b-authorized" && manifest.authorization.passBModelExecution && !manifest.authorization.disagreementExtraction && manifest.legacyBoundary.legacyScoresAccessed === false, "v4.1.7 Pass B execution unauthorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(path.resolve(root, file))) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) await access(path.resolve(root, future)).then(() => { throw new Error(`future output already exists: ${future}`); }, () => true);
await access(codex); await access(authSource);

function run(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = ""; let timedOut = false; let forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
    child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut }); });
  });
}

const results = [];
for (const context of manifest.contexts) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v417-pass-b-${context.debateNumber}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v417-home-pass-b-${context.debateNumber}-`));
  const startedAt = new Date().toISOString(); const started = Date.now(); let record;
  try {
    const governingCopies = Object.entries(manifest.modelInputs).map(([key, source], index) => [source, `${String(index + 1).padStart(2, "0")}-${key}${path.extname(source)}`]);
    const schemaTarget = governingCopies.find(([, target]) => target.includes("-schema."))?.[1];
    assertV4(schemaTarget, "Pass B schema target unavailable");
    const copies = [...governingCopies, [context.passBPacket, "packet.json"], [context.transcript, "transcript.txt"], [context.lockedEvents, "locked-events.json"]];
    for (const [source, target] of copies) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
    delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
    const inputNames = copies.map(([, target]) => target).join(", ");
    const prompt = `Read ${inputNames} completely and no other files. The v4.1.7 workflow and Pass B manual govern conflicts. Act only as the isolated high-effort triggered Pass B judge for Debate ${context.debateNumber}. The complete transcript is the mandatory debate-wide source; locked-events.json is the repository-validated exact event subset for all locked spans plus context. Judge every locked move independently and exactly in lockedMoveOrder. Routes, sections, weights, inventory, speakers, propositions, source spans, and importance are locked. Primary judgments, ratings, totals, trigger reasons, control selection, comparator, legacy data, prior winners, other debates, and publication prose are unavailable. Run every response-tuple, partial-answer, burden-reference, rating-band, charity, and burden-adjustment duplicate-exclusion check before submission. Resolve each non-null bridgeId against locked routes, copy its exact tier, and keep relevance and burden inside that tier's band. Use medium or low attribution confidence whenever identity is not secure and do not claim audio verification. Emit no calculated move, section, overall, range, band, winner, or agreement totals. Return exactly one schema-conforming JSON object and no commentary.`;
    process.stdout.write(`[v4.1.7-pass-b] starting ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber}\n`);
    const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", schemaTarget, "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
    const transportEvents = extractTransportEvents(invocation.stderr);
    const transportClassification = classifyTransportEventCount(transportEvents.length, manifest.executionPolicy.recoverableStreamEventsNormalMaximum, manifest.executionPolicy.recoverableStreamEventsHardMaximum);
    const base = { debateNumber: context.debateNumber, debateId: context.debateId, family: context.family, lockedMoves: context.lockedMoves, lockedSections: context.lockedSections, deliveredEventRows: context.deliveredEventRows, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, terminationSignal: invocation.signal, commandExitCode: invocation.code, authentication: "ChatGPT subscription", apiKeysRemoved: true, completeTranscriptProvided: true, completeOriginalEventsHashValidated: true, lockedEventsProvided: true, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0, recoverableStreamEvents: transportEvents.length, transportClassification, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) record = { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, gateAcceptancePassed: false };
    else {
      await mkdir(path.dirname(path.resolve(root, context.output)), { recursive: true });
      await copyFile(path.join(temporary, "result.json"), path.resolve(root, context.output));
      const validation = await run(process.execPath, ["scripts/validate-v417-pass-b-output.mjs", context.output, context.passBPacket, context.sourcePacket], { cwd: root, env: process.env }, 120000);
      const valid = validation.code === 0 && transportClassification !== "invalid";
      record = { ...base, status: valid ? `completed-valid-${transportClassification}` : validation.code !== 0 ? "output-validation-failed" : "transport-event-limit-exceeded", outputWritten: true, outputSha256: sha256(await readFile(path.resolve(root, context.output))), deterministicValidationPassed: validation.code === 0, gateAcceptancePassed: valid, validationExitCode: validation.code, validationSummary: validation.code === 0 ? JSON.parse(validation.stdout) : null, validationMessage: validation.code === 0 ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-6000) };
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
  results.push(record);
  process.stdout.write(`[v4.1.7-pass-b] Debate ${context.debateNumber} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
  if (!record.gateAcceptancePassed) break;
}
const passed = results.length === manifest.contexts.length && results.every((item) => item.gateAcceptancePassed);
const pendingAudioMoves = results.flatMap((result) => (result.validationSummary?.mediumOrLowAttributionMoves ?? []).map((moveId) => ({ debateNumber: result.debateNumber, moveId })));
const execution = { schemaVersion: "4.1.7-fresh-six-pass-b-model-execution", protocolId: manifest.protocolId, status: passed ? pendingAudioMoves.length === 0 ? "pass-b-execution-passed-no-audio-pending" : "pass-b-execution-passed-audio-required" : "pass-b-execution-failed-fast", contextsPlanned: manifest.contexts.length, contextsAttempted: results.length, contextsSkipped: manifest.contexts.length - results.length, validContexts: results.filter((item) => item.gateAcceptancePassed).length, attempts: results.length, retries: 0, totalElapsedMs: results.reduce((sum, item) => sum + item.elapsedMs, 0), meanElapsedMs: results.length ? Math.round(results.reduce((sum, item) => sum + item.elapsedMs, 0) / results.length) : null, pendingAudioMoves, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0, results, authorization: { passBAnalysis: passed, audioVerification: passed && pendingAudioMoves.length > 0, disagreementExtraction: false, adjudicationModelExecution: false, compressionAuditModelExecution: false, scoreDerivation: false, legacyComparison: false, furtherAutomaticRetry: false, productionMutation: false } };
await writeFile(path.resolve(root, manifest.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
assertV4(passed, "one or more v4.1.7 Pass B contexts failed; runner stopped and downstream work is blocked");
console.log(JSON.stringify({ status: execution.status, validContexts: execution.validContexts, attempts: execution.attempts, retries: 0, totalElapsedMinutes: Number((execution.totalElapsedMs / 60000).toFixed(2)), meanElapsedMinutes: Number((execution.meanElapsedMs / 60000).toFixed(2)), pendingAudioMoves: pendingAudioMoves.length, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
