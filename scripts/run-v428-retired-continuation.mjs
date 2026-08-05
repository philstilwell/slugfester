#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { compileV426PrimaryOutput, validateV426SourceLedger } from "./lib/v426-retired-completion.mjs";
import { V428_ROOT } from "./lib/v428-retired-continuation.mjs";

const root = process.cwd();
const manifest = JSON.parse(await readFile(`${V428_ROOT}/execution-manifest.json`, "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assertV4(manifest.status === "frozen-four-independent-retired-primaries-authorized" && manifest.authorization.fourPrimaryModelContexts, "v4.2.8 execution unauthorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
for (const context of manifest.contexts) {
  const [packet, eventsBytes, ledgerBytes] = await Promise.all([
    readFile(context.packet, "utf8").then(JSON.parse),
    readFile(context.originalEvents),
    readFile(context.sourceLedger)
  ]);
  validateV426SourceLedger(ledgerBytes, JSON.parse(eventsBytes), packet.transportChain.sourceLedgerSha256);
}
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
  await access(future).then(() => { throw new Error(`future output exists: ${future}`); }, () => true);
}
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
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeoutMs);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      resolve({ code, signal, stdout, stderr, timedOut });
    });
  });
}

const results = [];
for (const context of manifest.contexts) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v428-${context.debateNumber}-`));
  const home = await mkdtemp(path.join(os.tmpdir(), `slugfester-v428-home-${context.debateNumber}-`));
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let record;
  try {
    const copies = [
      [manifest.modelInputs.rubricBase, "rubric-base.md"],
      [manifest.modelInputs.rubricDerivedScores, "rubric-derived.md"],
      [manifest.modelInputs.rubricBounded, "rubric-bounded.md"],
      [manifest.modelInputs.manual, "manual.md"],
      [manifest.modelInputs.schema, "schema.json"],
      [context.packet, "packet.json"],
      [context.sourceLedger, "source-ledger.jsonl"]
    ];
    for (const [source, target] of copies) {
      await copyFile(source, path.join(temporary, target));
    }
    await copyFile(authSource, path.join(home, "auth.json"));
    const env = { ...process.env, CODEX_HOME: home };
    delete env.OPENAI_API_KEY;
    delete env.OPENAI_ORG_ID;
    delete env.CODEX_API_KEY;
    const prompt = `Read rubric-base.md, rubric-derived.md, rubric-bounded.md, manual.md, packet.json, schema.json, and every line of source-ledger.jsonl; read nothing else. Act only as the isolated v4.2.8 primary judge for Debate ${context.debateNumber}. Emit one source-chronological move inventory. Every excerpt must be 12 to 100 lexical tokens and no more than 450 characters; prefer at most 90 tokens and 425 characters. Before returning, sort the complete moves array by startEvent, endEvent, and moveId, then verify every reply targets an earlier emitted selected move. Silently verify every mechanical and rubric cross-field rule. Never return milliseconds, scores, a winner, or publication prose. Return exactly one v4.2.6 schema-conforming JSON object.`;
    process.stdout.write(`[v4.2.8-continuation] starting ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber}\n`);
    const invocation = await run(codex, [
      "exec",
      "--ephemeral",
      "--skip-git-repo-check",
      "--ignore-user-config",
      "--ignore-rules",
      "--model",
      manifest.model.slug,
      "-c",
      `model_reasoning_effort="${manifest.model.reasoningEffort}"`,
      "--disable", "plugins",
      "--disable", "remote_plugin",
      "--disable", "skill_search",
      "--disable", "apps",
      "--disable", "memories",
      "--disable", "multi_agent",
      "--disable", "browser_use",
      "--disable", "computer_use",
      "--disable", "workspace_dependencies",
      "--sandbox", "read-only",
      "--output-schema", "schema.json",
      "--output-last-message", "result.json",
      prompt
    ], { cwd: temporary, env }, manifest.executionPolicy.timeoutMs);
    const events = extractTransportEvents(invocation.stderr);
    const transportClassification = classifyTransportEventCount(events.length, 2, 8);
    const base = {
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      model: manifest.model.label,
      modelSlug: manifest.model.slug,
      reasoningEffort: manifest.model.reasoningEffort,
      attemptCount: 1,
      retryCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      recoverableStreamEvents: events.length,
      transportClassification,
      timedOut: invocation.timedOut,
      commandExitCode: invocation.code,
      terminationSignal: invocation.signal,
      authentication: "ChatGPT subscription",
      apiKeysRemoved: true,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      stdoutSha256: sha256(invocation.stdout),
      stderrSha256: sha256(invocation.stderr)
    };
    const resultExists = await access(path.join(temporary, "result.json")).then(() => true, () => false);
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
      record = {
        ...base,
        status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed",
        gateAcceptancePassed: false,
        rawOutputWritten: false,
        compiledOutputWritten: false,
        deterministicValidationPassed: false,
        repositoryTimeCompilationPassed: false
      };
    } else {
      await mkdir(path.dirname(context.rawOutput), { recursive: true });
      await copyFile(path.join(temporary, "result.json"), context.rawOutput);
      const validation = await run(process.execPath, ["scripts/validate-v426-primary-output.mjs", context.rawOutput, context.packet], { cwd: root, env: process.env }, 120000);
      const deterministicValidationPassed = validation.code === 0;
      const valid = deterministicValidationPassed && transportClassification !== "invalid";
      if (valid) {
        const [raw, packet, eventBytes] = await Promise.all([
          readFile(context.rawOutput, "utf8").then(JSON.parse),
          readFile(context.packet, "utf8").then(JSON.parse),
          readFile(context.originalEvents)
        ]);
        await mkdir(path.dirname(context.compiledOutput), { recursive: true });
        await writeFile(context.compiledOutput, `${JSON.stringify(compileV426PrimaryOutput(raw, packet, JSON.parse(eventBytes)), null, 2)}\n`);
      }
      record = {
        ...base,
        status: valid ? `completed-valid-${transportClassification}` : !deterministicValidationPassed ? "output-validation-failed" : "transport-event-limit-exceeded",
        gateAcceptancePassed: valid,
        rawOutputWritten: true,
        rawOutputSha256: sha256(await readFile(context.rawOutput)),
        compiledOutputWritten: valid,
        compiledOutputSha256: valid ? sha256(await readFile(context.compiledOutput)) : null,
        deterministicValidationPassed,
        repositoryTimeCompilationPassed: valid,
        validationExitCode: validation.code,
        validationSummary: deterministicValidationPassed ? JSON.parse(validation.stdout) : null,
        validationMessage: deterministicValidationPassed ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-6000)
      };
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  }
  results.push(record);
  process.stdout.write(`[v4.2.8-continuation] Debate ${context.debateNumber} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
}

assertV4(results.length === manifest.executionPolicy.contexts, "v4.2.8 did not attempt every frozen context");
const validContexts = results.filter((result) => result.gateAcceptancePassed).length;
const invalidContexts = results.length - validContexts;
const execution = {
  schemaVersion: "4.2.8-retired-continuation-model-execution",
  protocolId: manifest.protocolId,
  status: invalidContexts === 0 ? "four-first-pass-execution-all-valid" : "four-first-pass-execution-complete-with-invalid-results",
  contextsPlanned: manifest.executionPolicy.contexts,
  contextsAttempted: results.length,
  contextsSkipped: 0,
  validContexts,
  invalidContexts,
  attempts: results.length,
  retries: 0,
  totalElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0),
  results,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
  authorization: {
    deterministicPrimaryAnalysis: true,
    retry: false,
    correctionExecution: false,
    scoreDerivation: false,
    freshGatePreparation: false
  }
};
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);

console.log(JSON.stringify({
  status: execution.status,
  contextsAttempted: execution.contextsAttempted,
  contextsSkipped: 0,
  validContexts,
  invalidContexts,
  attempts: execution.attempts,
  retries: 0,
  totalElapsedMinutes: Number((execution.totalElapsedMs / 60000).toFixed(2)),
  meanElapsedMinutes: Number((execution.totalElapsedMs / 60000 / execution.contextsAttempted).toFixed(2)),
  deterministicPrimaryAnalysisAuthorized: true,
  meteredApiCostUsd: 0
}, null, 2));
