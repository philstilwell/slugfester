#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V422_ROOT, compileV422PrimaryOutput, validateV422SourceLedger } from "./lib/v422-chronology-first.mjs";

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.resolve(root, `${V422_ROOT}/execution-manifest.json`), "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(manifest.status === "frozen-one-context-retired-chronology-diagnostic-authorized" && manifest.authorization.primaryModelExecution, "v4.2.2 chronology execution unauthorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(path.resolve(root, file))) === digest, `source hash mismatch: ${file}`);
const [packet, eventsBytes, ledgerBytes] = await Promise.all([readFile(manifest.context.packet, "utf8").then(JSON.parse), readFile(manifest.context.originalEvents), readFile(manifest.context.sourceLedger)]);
validateV422SourceLedger(ledgerBytes, JSON.parse(eventsBytes), packet.transportChain.sourceLedgerSha256);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) await access(path.resolve(root, future)).then(() => { throw new Error(`future output already exists: ${future}`); }, () => true);
await access(codex);
await access(authSource);

function run(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
    child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut }); });
  });
}

const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-v422-chronology-"));
const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), "slugfester-v422-home-"));
const startedAt = new Date().toISOString();
const started = Date.now();
let record;
try {
  const copies = [[manifest.modelInputs.rubricBase, "rubric-base.md"], [manifest.modelInputs.rubricDerivedScores, "rubric-derived.md"], [manifest.modelInputs.rubricBounded, "rubric-bounded.md"], [manifest.modelInputs.manual, "manual.md"], [manifest.modelInputs.schema, "schema.json"], [manifest.context.packet, "packet.json"], [manifest.context.sourceLedger, "source-ledger.jsonl"]];
  for (const [source, target] of copies) await copyFile(path.resolve(root, source), path.join(temporary, target));
  await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
  const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
  delete environment.OPENAI_API_KEY;
  delete environment.OPENAI_ORG_ID;
  delete environment.CODEX_API_KEY;
  const prompt = "Read rubric-base.md, rubric-derived.md, rubric-bounded.md, manual.md, packet.json, schema.json, and every line of source-ledger.jsonl completely; read no other files. Act only as the isolated v4.2.2 chronology-first primary judge for retired diagnostic Debate 07. Emit section metadata without nested moves, then one top-level moves array strictly ordered by startEvent, endEvent, and moveId. A reply may target only a selected move already emitted above it; select the earlier material that actually prompted the reply and never target a later restatement. Apply the 12-to-100-token and 600-character excerpt limits. Never return milliseconds. Silently check chronology, every target edge, section-side counts, source spans, response classes, burden tiers, rating bands, charity, and adjustment exclusions. Do not calculate scores, identify a winner, or write publication prose. The failed v4.2.1 output is unavailable. Return exactly one schema-conforming JSON object and no commentary.";
  process.stdout.write("[v4.2.2-chronology] starting 5.6 Sol/low Debate 07\n");
  const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.timeoutMs);
  const transportEvents = extractTransportEvents(invocation.stderr);
  const transportClassification = classifyTransportEventCount(transportEvents.length, manifest.executionPolicy.recoverableStreamEventsNormalMaximum, manifest.executionPolicy.recoverableStreamEventsHardMaximum);
  const base = { debateNumber: "07", model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, terminationSignal: invocation.signal, commandExitCode: invocation.code, authentication: "ChatGPT subscription", apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0, recoverableStreamEvents: transportEvents.length, transportClassification, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
  const resultExists = await access(path.join(temporary, "result.json")).then(() => true, () => false);
  if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
    record = { ...base, status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed", rawOutputWritten: false, compiledOutputWritten: false, deterministicValidationPassed: false, smokePassed: false };
  } else {
    await copyFile(path.join(temporary, "result.json"), path.resolve(root, manifest.context.rawOutput));
    const validation = await run(process.execPath, ["scripts/validate-v422-primary-output.mjs", manifest.context.rawOutput, manifest.context.packet], { cwd: root, env: process.env }, 120000);
    const deterministicValidationPassed = validation.code === 0;
    const valid = deterministicValidationPassed && transportClassification !== "invalid";
    let compiledOutputSha256 = null;
    if (valid) {
      const rawOutput = JSON.parse(await readFile(manifest.context.rawOutput, "utf8"));
      const compiled = compileV422PrimaryOutput(rawOutput, packet, JSON.parse(eventsBytes));
      await writeFile(path.resolve(root, manifest.context.compiledOutput), `${JSON.stringify(compiled, null, 2)}\n`);
      compiledOutputSha256 = sha256(await readFile(manifest.context.compiledOutput));
    }
    record = { ...base, status: valid ? `completed-valid-${transportClassification}` : deterministicValidationPassed ? "transport-event-limit-exceeded" : "output-validation-failed", rawOutputWritten: true, rawOutputSha256: sha256(await readFile(manifest.context.rawOutput)), compiledOutputWritten: valid, compiledOutputSha256, deterministicValidationPassed, chronologyFirstValidationPassed: deterministicValidationPassed, repositoryTimeCompilationPassed: valid, smokePassed: valid, validationExitCode: validation.code, validationSummary: deterministicValidationPassed ? JSON.parse(validation.stdout) : null, validationMessage: deterministicValidationPassed ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-6000) };
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
  await rm(temporaryCodexHome, { recursive: true, force: true });
}
const execution = { schemaVersion: "4.2.2-chronology-first-model-execution", protocolId: manifest.protocolId, status: record.smokePassed ? "chronology-smoke-execution-passed" : "chronology-smoke-execution-failed", contextsPlanned: 1, contextsAttempted: 1, validContexts: record.smokePassed ? 1 : 0, attempts: 1, retries: 0, totalElapsedMs: record.elapsedMs, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0, result: record, authorization: { analysis: record.smokePassed, retry: false, scoreDerivation: false, legacyComparison: false, freshGateSelection: false } };
await writeFile(path.resolve(root, manifest.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
assertV4(record.smokePassed, "v4.2.2 chronology-first smoke failed; analysis and fresh-gate preparation are blocked");
console.log(JSON.stringify({ status: execution.status, elapsedMinutes: Number((record.elapsedMs / 60000).toFixed(2)), attempts: 1, retries: 0, totalCopiedInputBytes: manifest.transport.totalCopiedInputBytes, chronologyFirstValidationPassed: record.chronologyFirstValidationPassed, meteredApiCostUsd: 0 }, null, 2));
