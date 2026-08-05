#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V424_ROOT, compileV424PrimaryOutput, validateV424SourceLedger } from "./lib/v424-screened-chronology-fresh.mjs";

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.resolve(root, `${V424_ROOT}/primary-execution-manifest.json`), "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(manifest.status === "frozen-six-screened-chronology-context-primary-authorized" && manifest.authorization.primaryModelExecution && !manifest.authorization.passBModelExecution, "v4.2.4 primary execution unauthorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(path.resolve(root, file))) === digest, `source hash mismatch: ${file}`);
for (const context of manifest.contexts) {
  const [packet, eventsBytes, ledgerBytes] = await Promise.all([readFile(context.packet, "utf8").then(JSON.parse), readFile(context.originalEvents), readFile(context.sourceLedger)]);
  validateV424SourceLedger(ledgerBytes, JSON.parse(eventsBytes), packet.transportChain.sourceLedgerSha256);
}
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) await access(path.resolve(root, future)).then(() => { throw new Error(`future output already exists: ${future}`); }, () => true);
await access(codex); await access(authSource);
function run(command, args, options, timeoutMs) { return new Promise((resolve) => { const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] }); let stdout = ""; let stderr = ""; let timedOut = false; let forceTimer = null; child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; }); const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs); child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut }); }); }); }

const results = [];
for (const context of manifest.contexts) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v424-primary-${context.debateNumber}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-v424-home-${context.debateNumber}-`));
  const startedAt = new Date().toISOString(); const started = Date.now(); let record;
  try {
    const copies = [[manifest.modelInputs.rubricBase, "rubric-base.md"], [manifest.modelInputs.rubricDerivedScores, "rubric-derived.md"], [manifest.modelInputs.rubricBounded, "rubric-bounded.md"], [manifest.modelInputs.manual, "manual.md"], [manifest.modelInputs.schema, "schema.json"], [context.packet, "packet.json"], [context.sourceLedger, "source-ledger.jsonl"]];
    for (const [source, target] of copies) await copyFile(path.resolve(root, source), path.join(temporary, target));
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome }; delete environment.OPENAI_API_KEY; delete environment.OPENAI_ORG_ID; delete environment.CODEX_API_KEY;
    const prompt = `Read rubric-base.md, rubric-derived.md, rubric-bounded.md, manual.md, packet.json, schema.json, and every line of source-ledger.jsonl completely; read no other files. Act only as the fresh isolated v4.2.4 chronology-first primary judge for Debate ${context.debateNumber}. The ledger is the complete timestamped transcript. Emit four to six section metadata records, then the minimum eight-to-twenty-four load-bearing moves in one top-level array strictly ordered by startEvent, endEvent, and moveId, with one or two moves per side per section. A reply may target only selected IDs already emitted above it; select the earlier material that actually prompted it and never target a later restatement. Every excerpt must contain 12 to 100 lexical tokens and no more than 600 characters, copied from its inclusive event range in source order. Never return milliseconds. Silently verify move order, target edges, section-side counts, source spans, response classes, burden references, rating bands, charity, adjustment exclusions, and duplicates. Use medium or low attribution confidence when speaker identity is not secure and never claim audio verification. Do not calculate totals, identify a winner, write publication prose, or provide scalar precision/calibration values. Control status, other debates, earlier outputs, legacy assessments, scores, and winners are unavailable. Return exactly one schema-conforming JSON object and no commentary.`;
    process.stdout.write(`[v4.2.4-primary] starting ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber}\n`);
    const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
    const transportEvents = extractTransportEvents(invocation.stderr); const transportClassification = classifyTransportEventCount(transportEvents.length, manifest.executionPolicy.recoverableStreamEventsNormalMaximum, manifest.executionPolicy.recoverableStreamEventsHardMaximum);
    const base = { debateNumber: context.debateNumber, debateId: context.debateId, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, compactCopiedInputBytes: context.compactCopiedInputBytes, timedOut: invocation.timedOut, terminationSignal: invocation.signal, commandExitCode: invocation.code, authentication: "ChatGPT subscription", apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0, recoverableStreamEvents: transportEvents.length, transportClassification, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
    const resultExists = await access(path.join(temporary, "result.json")).then(() => true, () => false);
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) record = { ...base, status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed", rawOutputWritten: false, compiledOutputWritten: false, deterministicValidationPassed: false, gateAcceptancePassed: false };
    else {
      await mkdir(path.dirname(path.resolve(root, context.rawOutput)), { recursive: true }); await copyFile(path.join(temporary, "result.json"), path.resolve(root, context.rawOutput));
      const validation = await run(process.execPath, ["scripts/validate-v424-primary-output.mjs", context.rawOutput, context.packet], { cwd: root, env: process.env }, 120000);
      const deterministicValidationPassed = validation.code === 0; const valid = deterministicValidationPassed && transportClassification !== "invalid"; let compiledOutputSha256 = null;
      if (valid) { const [rawOutput, packet, eventsBytes] = await Promise.all([readFile(context.rawOutput, "utf8").then(JSON.parse), readFile(context.packet, "utf8").then(JSON.parse), readFile(context.originalEvents)]); const compiled = compileV424PrimaryOutput(rawOutput, packet, JSON.parse(eventsBytes)); await mkdir(path.dirname(path.resolve(root, context.compiledOutput)), { recursive: true }); await writeFile(context.compiledOutput, `${JSON.stringify(compiled, null, 2)}\n`); compiledOutputSha256 = sha256(await readFile(context.compiledOutput)); }
      record = { ...base, status: valid ? `completed-valid-${transportClassification}` : deterministicValidationPassed ? "transport-event-limit-exceeded" : "output-validation-failed", rawOutputWritten: true, rawOutputSha256: sha256(await readFile(context.rawOutput)), compiledOutputWritten: valid, compiledOutputSha256, deterministicValidationPassed, compactLedgerValidationPassed: deterministicValidationPassed, chronologyFirstValidationPassed: deterministicValidationPassed, eventAwareValidationPassed: deterministicValidationPassed, schemaBoundedExcerptValidationPassed: deterministicValidationPassed, repositoryTimeCompilationPassed: valid, gateAcceptancePassed: valid, validationExitCode: validation.code, validationSummary: deterministicValidationPassed ? JSON.parse(validation.stdout) : null, validationMessage: deterministicValidationPassed ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-6000) };
    }
  } finally { await rm(temporary, { recursive: true, force: true }); await rm(temporaryCodexHome, { recursive: true, force: true }); }
  results.push(record); process.stdout.write(`[v4.2.4-primary] Debate ${context.debateNumber} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`); if (!record.gateAcceptancePassed) break;
}
const passed = results.length === manifest.contexts.length && results.every((item) => item.gateAcceptancePassed);
const execution = { schemaVersion: "4.2.4-screened-chronology-primary-model-execution", protocolId: manifest.protocolId, status: passed ? "primary-execution-passed" : "primary-execution-failed-fast", contextsPlanned: manifest.contexts.length, contextsAttempted: results.length, contextsSkipped: manifest.contexts.length - results.length, validContexts: results.filter((item) => item.gateAcceptancePassed).length, compiledOutputs: results.filter((item) => item.compiledOutputWritten).length, attempts: results.length, retries: 0, totalElapsedMs: results.reduce((sum, item) => sum + item.elapsedMs, 0), meanElapsedMs: results.length ? Math.round(results.reduce((sum, item) => sum + item.elapsedMs, 0) / results.length) : null, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0, results, authorization: { primaryAnalysis: passed, furtherAutomaticRetry: false, audioVerification: false, passBModelExecution: false, compressionAuditModelExecution: false, legacyComparison: false, productionMutation: false } };
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
assertV4(passed, "one or more v4.2.4 primary contexts failed; runner stopped and analysis is blocked");
console.log(JSON.stringify({ status: execution.status, validContexts: execution.validContexts, compiledOutputs: execution.compiledOutputs, attempts: execution.attempts, retries: 0, totalElapsedMinutes: Number((execution.totalElapsedMs / 60000).toFixed(2)), meanElapsedMinutes: Number((execution.meanElapsedMs / 60000).toFixed(2)), meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
