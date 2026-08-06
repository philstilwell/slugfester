import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./v385-transport.mjs";
import { assertV4 } from "./v41-lean-production.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function invoke(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", timedOut = false, forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
    child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut }); });
  });
}

export async function runIsolatedPrimaryGate({ root, manifestStatus, executionSchemaVersion, passedStatus, failedStatus, logTag, validateScript, validateSourceLedger, compilePrimaryOutput, promptForContext }) {
  const workspace = process.cwd();
  const manifest = JSON.parse(await readFile(`${root}/execution-manifest.json`, "utf8"));
  const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  assertV4(manifest.status === manifestStatus && manifest.authorization.primaryModelContexts && !manifest.authorization.scoreDerivation, `${logTag} execution unauthorized`);
  for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
  for (const context of manifest.contexts) {
    const [packet, events, ledger] = await Promise.all([readFile(context.packet, "utf8").then(JSON.parse), readFile(context.originalEvents), readFile(context.sourceLedger)]);
    validateSourceLedger(ledger, JSON.parse(events), packet.transportChain.sourceLedgerSha256);
  }
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) await access(future).then(() => { throw new Error(`future output exists: ${future}`); }, () => true);
  await access(codex); await access(authSource);
  const results = [];
  for (const context of manifest.contexts) {
    const temporary = await mkdtemp(path.join(os.tmpdir(), `${logTag}-${context.debateNumber}-`));
    const codexHome = await mkdtemp(path.join(os.tmpdir(), `${logTag}-home-${context.debateNumber}-`));
    const startedAt = new Date().toISOString(), started = Date.now();
    let record;
    try {
      const copies = [[manifest.modelInputs.rubricBase, "rubric-base.md"], [manifest.modelInputs.rubricDerivedScores, "rubric-derived.md"], [manifest.modelInputs.rubricBounded, "rubric-bounded.md"], [manifest.modelInputs.manual, "manual.md"], [manifest.modelInputs.schema, "schema.json"], [context.packet, "packet.json"], [context.sourceLedger, "source-ledger.jsonl"]];
      for (const [source, target] of copies) await copyFile(source, path.join(temporary, target));
      await copyFile(authSource, path.join(codexHome, "auth.json"));
      const env = { ...process.env, CODEX_HOME: codexHome }; delete env.OPENAI_API_KEY; delete env.OPENAI_ORG_ID; delete env.CODEX_API_KEY;
      process.stdout.write(`[${logTag}] starting ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber}\n`);
      const invocation = await invoke(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort="${manifest.model.reasoningEffort}"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", promptForContext(context)], { cwd: temporary, env }, manifest.executionPolicy.timeoutMs);
      const events = extractTransportEvents(invocation.stderr), transportClassification = classifyTransportEventCount(events.length, manifest.executionPolicy.recoverableStreamEventsNormalMaximum, manifest.executionPolicy.recoverableStreamEventsHardMaximum), exists = await access(path.join(temporary, "result.json")).then(() => true, () => false);
      const base = { debateNumber: context.debateNumber, debateId: context.debateId, model: manifest.model.label, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, recoverableStreamEvents: events.length, transportClassification, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, authentication: "ChatGPT subscription", apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
      if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !exists) record = { ...base, status: invocation.timedOut ? "timed-out" : !exists ? "result-missing" : "transport-failed", gateAcceptancePassed: false, rawOutputWritten: false, compiledOutputWritten: false };
      else {
        await mkdir(path.dirname(context.rawOutput), { recursive: true }); await copyFile(path.join(temporary, "result.json"), context.rawOutput);
        const validation = await invoke(process.execPath, [validateScript, context.rawOutput, context.packet], { cwd: workspace, env: process.env }, 120000), valid = validation.code === 0 && transportClassification !== "invalid";
        if (valid) { const [raw, packet, eventBytes] = await Promise.all([readFile(context.rawOutput, "utf8").then(JSON.parse), readFile(context.packet, "utf8").then(JSON.parse), readFile(context.originalEvents)]); await mkdir(path.dirname(context.compiledOutput), { recursive: true }); await writeFile(context.compiledOutput, `${JSON.stringify(compilePrimaryOutput(raw, packet, JSON.parse(eventBytes)), null, 2)}\n`); }
        record = { ...base, status: valid ? `completed-valid-${transportClassification}` : validation.code === 0 ? "transport-event-limit-exceeded" : "output-validation-failed", gateAcceptancePassed: valid, rawOutputWritten: true, rawOutputSha256: sha256(await readFile(context.rawOutput)), compiledOutputWritten: valid, compiledOutputSha256: valid ? sha256(await readFile(context.compiledOutput)) : null, deterministicValidationPassed: validation.code === 0, deterministicCompilationPassed: valid, validationSummary: validation.code === 0 ? JSON.parse(validation.stdout) : null, validationMessage: validation.code === 0 ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-8000) };
      }
    } finally { await rm(temporary, { recursive: true, force: true }); await rm(codexHome, { recursive: true, force: true }); }
    results.push(record); process.stdout.write(`[${logTag}] Debate ${context.debateNumber} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
  }
  const passed = results.length === manifest.contexts.length && results.every((result) => result.gateAcceptancePassed);
  const execution = { schemaVersion: executionSchemaVersion, protocolId: manifest.protocolId, status: passed ? passedStatus : failedStatus, contextsPlanned: manifest.contexts.length, contextsAttempted: results.length, contextsSkipped: manifest.contexts.length - results.length, validContexts: results.filter((result) => result.gateAcceptancePassed).length, attempts: results.length, retries: 0, correctionContexts: 0, totalElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0), meanElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0) / results.length, results, meteredApiCostUsd: 0, transcriptionCostUsd: 0, authorization: { analysis: true, retry: false, correctionModelExecution: false, scoreDerivation: false, audioVerification: false, riskExtraction: false } };
  await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
  console.log(JSON.stringify({ status: execution.status, validContexts: execution.validContexts, attempts: execution.attempts, retries: 0, elapsedMinutesByDebate: Object.fromEntries(results.map((result) => [result.debateNumber, Number((result.elapsedMs / 60000).toFixed(2))])), meanElapsedMinutes: Number((execution.meanElapsedMs / 60000).toFixed(2)), meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoresDerived: 0 }, null, 2));
}
